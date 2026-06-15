import { DOM, state, gameRules, deviceMode, hasUpgrade, isUpgradeActive, currentSkinKey, addCoins } from './data.js';
import { t } from './i18n.js';
import { damagePlayer, updateHPUI, enemyShoot, createExplosion, spawnParticle, showFloatingMessage, healPlayer, spawnIngredients, updateAmmoUI, getEnemyPoints, getEnemyAmmoGrant, getEnemyColor, getEnemyFlatHeal, registerJokerKill } from './systems.js';
import {
    trackShotHit, trackEnemyKilled, trackFriendlyFire,
    trackChaoticKill, trackAsteroidDestroyed, trackIngredientCollected,
    trackBurgerEaten, trackScoreUpdate
} from './analytics.js';

// ===== UPDATE BULLETS =====

export function updateBullets() {
    const bulletSpeed = 15 * state.currentSkinStats.bulletSpeed;
    for (let i = state.bullets.length - 1; i >= 0; i--) {
        let b = state.bullets[i];
        
        if (b.isFeather || b.directional) {
            // Homing feathers steer toward nearest enemy
            if (b.isHomingFeather && state.enemies.length > 0) {
                let nearest = null, nearestDist = Infinity;
                const cx = parseFloat(b.el.style.left) || 0;
                const cy = parseFloat(b.el.style.top) || 0;
                for (const en of state.enemies) {
                    const ex = (parseFloat(en.el.style.left) || 0) + 25;
                    const ey = (en.y || 0) + 25;
                    const dist = Math.hypot(cx - ex, cy - ey);
                    if (dist < nearestDist) { nearestDist = dist; nearest = { ex, ey }; }
                }
                if (nearest) {
                    const desired = Math.atan2(nearest.ey - cy, nearest.ex - cx);
                    const current = Math.atan2(b.vy, b.vx);
                    let diff = desired - current;
                    while (diff > Math.PI) diff -= 2 * Math.PI;
                    while (diff < -Math.PI) diff += 2 * Math.PI;
                    const newAngle = current + Math.max(-0.2, Math.min(0.2, diff));
                    const speed = Math.hypot(b.vx, b.vy) || 8;
                    b.vx = Math.cos(newAngle) * speed;
                    b.vy = Math.sin(newAngle) * speed;
                }
            }

            // Phoenix feathers / dragon flames move in a direction
            const currentLeft = parseFloat(b.el.style.left) || state.playerX + 23;
            const currentTop = parseFloat(b.el.style.top) || (DOM.wrapper.clientHeight - b.y);

            const newLeft = currentLeft + b.vx;
            const newTop = currentTop + b.vy;
            
            b.el.style.left = newLeft + 'px';
            b.el.style.top = newTop + 'px';

            // Remove if out of bounds
            if (newTop < -50 || newTop > DOM.wrapper.clientHeight + 50 ||
                newLeft < -50 || newLeft > DOM.wrapper.clientWidth + 50) {
                b.el.remove();
                state.bullets.splice(i, 1);
                continue;
            }
        } else {
            // Regular bullets
            b.y += bulletSpeed;
            b.el.style.bottom = b.y + 'px';
            if(b.y > DOM.wrapper.clientHeight) {
                b.el.remove();
                state.bullets.splice(i, 1);
                continue;
            }
        }

        // Cache the bullet's screen rect once per frame so the collision
        // loops (enemies/asteroids/burgers) reuse it instead of forcing a
        // layout reflow on every bullet×target pair (the main mobile lag).
        b.rect = b.el.getBoundingClientRect();
    }
}

export function updateEnemyBullets() {
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
        let eb = state.enemyBullets[i];
        // Homing ricochet: steer toward nearest enemy.
        // Uses wrapper-relative coords (same as eb.x/eb.y) so we must read the
        // enemy's CSS position, NOT getBoundingClientRect (viewport coords).
        if (eb.homing && state.enemies.length > 0) {
            let nearest = null;
            let nearestDist = Infinity;
            for (const en of state.enemies) {
                const ex = (parseFloat(en.el.style.left) || 0) + 25;
                const ey = en.y + 25;
                const dist = Math.hypot(eb.x - ex, eb.y - ey);
                if (dist < nearestDist) { nearestDist = dist; nearest = { ex, ey }; }
            }
            if (nearest) {
                const dx = nearest.ex - eb.x;
                const dy = nearest.ey - eb.y;
                const desired = Math.atan2(dy, dx);
                const current = Math.atan2(eb.vy, eb.vx);
                // Smallest signed angle difference, normalized to [-PI, PI]
                let diff = desired - current;
                while (diff > Math.PI) diff -= 2 * Math.PI;
                while (diff < -Math.PI) diff += 2 * Math.PI;
                const maxTurn = 0.25; // ~14° per frame for a snappy but smooth lock-on
                const clamped = Math.max(-maxTurn, Math.min(maxTurn, diff));
                const newAngle = current + clamped;
                const speed = eb.speed || Math.hypot(eb.vx, eb.vy) || 8;
                eb.vx = Math.cos(newAngle) * speed;
                eb.vy = Math.sin(newAngle) * speed;
            }
        }

        eb.x += eb.vx;
        eb.y += eb.vy;
        eb.el.style.left = eb.x + 'px';
        eb.el.style.top = eb.y + 'px';
        const ebRect = eb.rect = eb.el.getBoundingClientRect();
        const pRect = state.playerRect || DOM.player.getBoundingClientRect();

        // Check collision with player (only non-friendly and non-chaotic and non-ricocheted bullets)
        if (!eb.friendly && !eb.chaotic && !eb.ricochet) {
            if(!(ebRect.right < pRect.left || ebRect.left > pRect.right || ebRect.bottom < pRect.top || ebRect.top > pRect.bottom)) {
                // Dragon shield ricochet - bounce bullet back toward enemies
                if (state.dragonAbility && Date.now() < state.dragonAbility.invincibleUntil) {
                    eb.vx = -eb.vx;
                    eb.vy = -(Math.abs(eb.vy) + 5);
                    eb.ricochet = true;
                    eb.homing = isUpgradeActive('dragon_homing_ricochet');
                    // Lock in a constant flight speed for the homing steering
                    eb.speed = Math.max(8, Math.hypot(eb.vx, eb.vy));
                    eb.damage = 40;
                    eb.el.style.background = 'radial-gradient(circle, #ffffff, #ffff00, #ffaa33, #ff6600)';
                    eb.el.style.boxShadow = '0 0 30px #ffaa33, 0 0 18px #ff6600, 0 0 8px #fff';
                    eb.el.style.width = '14px';
                    eb.el.style.height = '14px';
                    eb.el.style.borderRadius = '50%';
                    createExplosion(eb.x, eb.y, '#ffaa33');
                    showFloatingMessage('🛡️ RICOCHET!', eb.x - 50, eb.y, '#ffaa33');
                    continue;
                }
                damagePlayer(15, 'enemy_bullet');
                createExplosion(eb.x, eb.y, 'var(--primary)');
                eb.el.remove();
                state.enemyBullets.splice(i, 1);
                continue;
            }
        }

        // Ricocheted bullets (from dragon shield) damage enemies
        if (eb.ricochet) {
            let hitEnemy = false;
            for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
                let targetEn = state.enemies[ei];
                const teRect = targetEn.rect || targetEn.el.getBoundingClientRect();
                if(!(ebRect.right < teRect.left || ebRect.left > teRect.right || ebRect.bottom < teRect.top || ebRect.top > teRect.bottom)) {
                    const damage = eb.damage || 40;
                    targetEn.hp -= damage;
                    targetEn.hpFill.style.width = (Math.max(0, targetEn.hp) / targetEn.maxHP * 100) + '%';
                    createExplosion(eb.x, eb.y, '#ffaa33');
                    createExplosion(eb.x, eb.y, '#ffff00');
                    if (targetEn.hp <= 0) {
                        const points = getEnemyPoints(targetEn.type);
                        state.score += points;
                        DOM.scoreEl.innerText = state.score;
                        trackScoreUpdate(state.score);
                        createExplosion(teRect.left + 25, teRect.top + 25, getEnemyColor(targetEn.type));
                        trackEnemyKilled(targetEn.type, points, state.level, 'ricochet');
                        targetEn.el.remove();
                        state.enemies.splice(ei, 1);
                        registerJokerKill(teRect.left, teRect.top);
                    }
                    eb.el.remove();
                    state.enemyBullets.splice(i, 1);
                    hitEnemy = true;
                    break;
                }
            }
            if (hitEnemy) continue;
        }
        
        // Check collision with asteroids (if enemies can't shoot through them)
        if (!gameRules.enemiesShootThroughAsteroids) {
            let hitAsteroid = false;
            for (let ai = state.asteroids.length - 1; ai >= 0; ai--) {
                let ast = state.asteroids[ai];
                const aRect = ast.rect || ast.el.getBoundingClientRect();
                if(!(ebRect.right < aRect.left || ebRect.left > aRect.right || ebRect.bottom < aRect.top || ebRect.top > aRect.bottom)) {
                    createExplosion(eb.x, eb.y, '#666');
                    eb.el.remove();
                    state.enemyBullets.splice(i, 1);
                    hitAsteroid = true;
                    break;
                }
            }
            if (hitAsteroid) continue;
        }
        
        // Chaotic bullets hit normal enemies
        if (eb.chaotic) {
            let hitEnemy = false;
            for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
                let targetEn = state.enemies[ei];
                // Only hit non-chaotic enemies, and don't hit the shooter itself
                if (targetEn.isChaotic || targetEn.el === eb.shooterId) continue;

                const teRect = targetEn.rect || targetEn.el.getBoundingClientRect();
                if(!(ebRect.right < teRect.left || ebRect.left > teRect.right || ebRect.bottom < teRect.top || ebRect.top > teRect.bottom)) {
                    // Damage the target enemy
                    targetEn.hp -= 1;
                    targetEn.hpFill.style.width = (targetEn.hp / targetEn.maxHP * 100) + '%';

                    createExplosion(eb.x, eb.y, '#00f2ff');
                    
                    // Kill enemy if HP reaches 0
                    if (targetEn.hp <= 0) {
                        const points = Math.floor(getEnemyPoints(targetEn.type) * 0.5);
                        state.score += points;
                        DOM.scoreEl.innerText = state.score;
                        trackScoreUpdate(state.score);
                        createExplosion(teRect.left + 25, teRect.top + 25, getEnemyColor(targetEn.type));
                        showFloatingMessage(`+${points}`, teRect.left, teRect.top, '#00f2ff');
                        trackChaoticKill(targetEn.type);
                        targetEn.el.remove();
                        state.enemies.splice(ei, 1);
                        registerJokerKill(teRect.left, teRect.top);
                    }

                    eb.el.remove();
                    state.enemyBullets.splice(i, 1);
                    hitEnemy = true;
                    break;
                }
            }
            if (hitEnemy) continue;
        }
        
        // Friendly fire bullets hit other enemies
        if (eb.friendly) {
            let hitEnemy = false;
            for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
                let targetEn = state.enemies[ei];
                const teRect = targetEn.rect || targetEn.el.getBoundingClientRect();
                if(!(ebRect.right < teRect.left || ebRect.left > teRect.right || ebRect.bottom < teRect.top || ebRect.top > teRect.bottom)) {
                    targetEn.hp -= 1;
                    targetEn.hpFill.style.width = (targetEn.hp / targetEn.maxHP * 100) + '%';

                    if (targetEn.hp <= 0) {
                        const points = Math.floor(getEnemyPoints(targetEn.type) * 0.5);
                        state.score += points;
                        DOM.scoreEl.innerText = state.score;
                        trackScoreUpdate(state.score);
                        createExplosion(teRect.left + 25, teRect.top + 25, getEnemyColor(targetEn.type));
                        trackFriendlyFire('unknown', targetEn.type, 1);
                        targetEn.el.remove();
                        state.enemies.splice(ei, 1);
                        registerJokerKill(teRect.left, teRect.top);
                    }
                    
                    createExplosion(eb.x, eb.y, 'white');
                    eb.el.remove();
                    state.enemyBullets.splice(i, 1);
                    hitEnemy = true;
                    break;
                }
            }
            if (hitEnemy) continue;
        }
        
        // Remove if out of bounds
        if(eb.y > DOM.wrapper.clientHeight || eb.y < -100 || eb.x < -50 || eb.x > DOM.wrapper.clientWidth + 50) {
            eb.el.remove();
            state.enemyBullets.splice(i, 1);
        }
    }
}

// ===== UPDATE BURGERS =====

export function updateBurgers() {
    for (let i = state.burgers.length - 1; i >= 0; i--) {
        let bgr = state.burgers[i];
        bgr.y += bgr.speed;
        bgr.el.style.top = bgr.y + 'px';
        const bRect = bgr.el.getBoundingClientRect();
        const pRect = state.playerRect || DOM.player.getBoundingClientRect();
        
        if(!(bRect.right < pRect.left || bRect.left > pRect.right || bRect.bottom < pRect.top || bRect.top > pRect.bottom)) {
            const wasFullHP = (state.playerHP >= state.playerMaxHP);
            const hpBefore = state.playerHP;
            
            healPlayer(15);
            const becameFat = !state.isPlayerFat && wasFullHP && state.burgersEatenAtFullHP + 1 >= 3;
            trackBurgerEaten(state.playerMaxHP * 0.15, hpBefore, state.playerHP, becameFat);
            createExplosion(bRect.left + 25, bRect.top + 25, 'var(--burger)');
            bgr.el.remove();
            state.burgers.splice(i, 1);
            
            // Check if player ate burger at full HP
            if (wasFullHP) {
                state.burgersEatenAtFullHP++;
                
                if (state.burgersEatenAtFullHP >= 3 && !state.isPlayerFat) {
                    state.isPlayerFat = true;
                    DOM.player.style.transform = 'scale(1.5)';
                    showFloatingMessage("FAT! 🍔🍔🍔", state.playerX - 20, DOM.wrapper.clientHeight - 120, "#ff6b35");
                }
            }
            
            continue;
        }

        for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
            let bul = state.bullets[bi];
            const bulRect = bul.rect || bul.el.getBoundingClientRect();
            if(!(bulRect.right < bRect.left || bulRect.left > bRect.right || bulRect.bottom < bRect.top || bulRect.top > bRect.bottom)) {
                const damage = bul.damage || 1.0;
                bgr.hp -= damage;
                bgr.hpFill.style.width = (bgr.hp / bgr.maxHP * 100) + '%';
                
                if (bul.el.dataset.isFire === 'true') {
                    createExplosion(bulRect.left, bulRect.top, '#ff4500');
                }
                
                bul.el.remove();
                state.bullets.splice(bi, 1);
                if(bgr.hp <= 0) {
                    healPlayer(15);
                    state.score += 75;
                    DOM.scoreEl.innerText = state.score;
                    spawnIngredients(bRect.left, bRect.top);
                    createExplosion(bRect.left + 25, bRect.top + 25, 'var(--burger)');
                    bgr.el.remove();
                    state.burgers.splice(i, 1);
                }
                break;
            }
        }
        
        if(bgr.y > DOM.wrapper.clientHeight) {
            bgr.el.remove();
            state.burgers.splice(i, 1);
        }
    }
}

// ===== UPDATE INGREDIENTS =====

export function updateIngredients() {
    for (let i = state.ingredients.length - 1; i >= 0; i--) {
        let ing = state.ingredients[i];
        ing.x += ing.vx;
        ing.y += ing.vy;
        ing.el.style.left = ing.x + 'px';
        ing.el.style.top = ing.y + 'px';
        
        const iRect = ing.el.getBoundingClientRect();
        const pRect = state.playerRect || DOM.player.getBoundingClientRect();
        if(!(iRect.right < pRect.left || iRect.left > pRect.right || iRect.bottom < pRect.top || iRect.top > pRect.bottom)) {
            state.score += 25;
            DOM.scoreEl.innerText = state.score;
            trackScoreUpdate(state.score);
            state.playerHP = Math.min(state.playerMaxHP, state.playerHP + 5);
            updateHPUI();
            trackIngredientCollected('generic', 'heal', 5);
            ing.el.remove();
            state.ingredients.splice(i, 1);
            continue;
        }
        
        if(ing.y > DOM.wrapper.clientHeight) {
            ing.el.remove();
            state.ingredients.splice(i, 1);
        }
    }
}

// ===== UPDATE ASTEROIDS =====

export function updateAsteroids() {
    for (let i = state.asteroids.length - 1; i >= 0; i--) {
        let ast = state.asteroids[i];
        ast.y += ast.speed;
        ast.rot += ast.rotSpeed;
        ast.el.style.top = ast.y + 'px';
        ast.el.style.transform = `rotate(${ast.rot}deg)`;
        const aRect = ast.rect = ast.el.getBoundingClientRect();
        const pRect = state.playerRect || DOM.player.getBoundingClientRect();
        
        if(!(aRect.right < pRect.left || aRect.left > pRect.right || aRect.bottom < pRect.top || aRect.top > pRect.bottom)) {
            damagePlayer(40, 'asteroid_collision');
            createExplosion(aRect.left + 25, aRect.top + 25, 'var(--stone)');
            trackAsteroidDestroyed('collision');
            ast.el.remove();
            state.asteroids.splice(i, 1);
            continue;
        }
        
        // Player bullets collide with asteroids (unless playerShootThroughAsteroids is true)
        if (!gameRules.playerShootThroughAsteroids) {
            for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
                let bul = state.bullets[bi];
                const bRect = bul.rect || bul.el.getBoundingClientRect();
                if(!(bRect.right < aRect.left || bRect.left > aRect.right || bRect.bottom < aRect.top || bRect.top > aRect.bottom)) {
                    createExplosion(bRect.left, bRect.top, '#666');
                    bul.el.remove();
                    state.bullets.splice(bi, 1);
                    trackAsteroidDestroyed('bullet');
                    break;
                }
            }
        }
        
        if(ast.y > DOM.wrapper.clientHeight) {
            ast.el.remove();
            state.asteroids.splice(i, 1);
        }
    }
}

// ===== UPDATE ENEMIES =====

export function updateEnemies(now) {
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        let en = state.enemies[i];
        en.y += en.speed;
        en.el.style.top = en.y + 'px';
        // Cache this enemy's rect once per frame instead of recomputing it
        // for every player bullet (was an O(enemies×bullets) layout thrash).
        en.rect = en.el.getBoundingClientRect();

        if (now - en.lastShot > en.fireRate) {
            enemyShoot(en);
            en.lastShot = now;
        }
        
        if(en.y > DOM.wrapper.clientHeight - 30) {
            // Only damage player if not chaotic
            if (!en.isChaotic) {
                damagePlayer(30, 'enemy_collision');
            }
            en.el.remove();
            state.enemies.splice(i, 1);
            continue;
        }

        const eRect = en.rect;
        for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
            let bul = state.bullets[bi];
            const bRect = bul.rect || bul.el.getBoundingClientRect();

            if(!(bRect.right < eRect.left || bRect.left > eRect.right || bRect.bottom < eRect.top || bRect.top > eRect.bottom)) {
                const damage = bul.damage || 1.0;
                
                // Phoenix Feather explosion - damages nearby enemies
                if (bul.isFeather) {
                    // Create big explosion (capped particle budget)
                    const fCount = deviceMode.isMobile ? 12 : 24;
                    for(let e=0; e<fCount; e++) {
                        spawnParticle(bRect.left, bRect.top, e % 3 === 0 ? '#ffd700' : '#ff6b35', { size: 6, dist: 120, duration: 700 });
                    }

                    // Damage all enemies in radius (150px)
                    const explosionRadius = 150;
                    for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
                        let targetEn = state.enemies[ei];
                        const teRect = targetEn.rect || targetEn.el.getBoundingClientRect();
                        const dx = (teRect.left + 25) - (bRect.left + 10);
                        const dy = (teRect.top + 25) - (bRect.top + 20);
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        
                        if (dist < explosionRadius) {
                            targetEn.hp -= damage;
                            targetEn.hpFill.style.width = (Math.max(0, targetEn.hp) / targetEn.maxHP * 100) + '%';
                            
                            if (targetEn.hp <= 0) {
                                const points = getEnemyPoints(targetEn.type);
                                const ammoGrant = getEnemyAmmoGrant(targetEn.type);
                                state.ammo = Math.min(state.maxAmmo, state.ammo + ammoGrant);
                                updateAmmoUI();
                                state.score += points;
                                DOM.scoreEl.innerText = state.score;
                                createExplosion(teRect.left + 25, teRect.top + 25, getEnemyColor(targetEn.type));
                                targetEn.el.remove();
                                state.enemies.splice(ei, 1);
                            }
                        }
                    }
                    
                    bul.el.remove();
                    state.bullets.splice(bi, 1);
                    break;
                }
                
                en.hp -= damage;
                en.hpFill.style.width = (en.hp / en.maxHP * 100) + '%';
                trackShotHit(en.type, damage, en.hp, en.maxHP);
                
                // Fire explosion for joker bullets
                if (bul.el.dataset.isFire === 'true') {
                    createExplosion(bRect.left, bRect.top, '#ff4500');
                    createExplosion(bRect.left, bRect.top, '#ffa500');
                } else {
                    createExplosion(bRect.left, bRect.top, 'white');
                }
                
                bul.el.remove();
                state.bullets.splice(bi, 1);
                
                if(en.hp <= 0) {
                    const points = getEnemyPoints(en.type);
                    const ammoGrant = getEnemyAmmoGrant(en.type);
                    const explodeColor = getEnemyColor(en.type);
                    const flatHeal = getEnemyFlatHeal(en.type);
                    state.ammo = Math.min(state.maxAmmo, state.ammo + ammoGrant);
                    updateAmmoUI();
                    const oldScore = state.score;
                    state.score += points;
                    DOM.scoreEl.innerText = state.score;
                    trackScoreUpdate(state.score);
                    trackEnemyKilled(en.type, points, state.level, 'bullet');
                    const crossedHealThreshold = Math.floor(state.score / 300) > Math.floor(oldScore / 300);

                    createExplosion(eRect.left + 25, eRect.top + 25, explodeColor);
                    if (flatHeal > 0) {
                        if (crossedHealThreshold) {
                            const healAmount = state.playerMaxHP * 0.75;
                            state.playerHP = Math.min(state.playerMaxHP, state.playerHP + healAmount);
                            state.lastHealScore = Math.floor(state.score / 300) * 300;
                            showFloatingMessage("CRITICAL REPAIR +75%", eRect.left, eRect.top, explodeColor);
                        } else {
                            state.playerHP = Math.min(state.playerMaxHP, state.playerHP + flatHeal);
                            showFloatingMessage(`REPAIR +${flatHeal} & ${points} PTS`, eRect.left, eRect.top, explodeColor);
                        }
                        updateHPUI();
                    } else {
                        if (crossedHealThreshold) {
                            state.playerHP = Math.min(state.playerMaxHP, state.playerHP + 20);
                            state.lastHealScore = Math.floor(state.score / 300) * 300;
                            showFloatingMessage("REPAIR +20", eRect.left, eRect.top, "var(--health)");
                            updateHPUI();
                        }
                    }
                    en.el.remove();
                    state.enemies.splice(i, 1);
                    registerJokerKill(eRect.left, eRect.top);

                    // Education mode: chance for a bonus question on a kill.
                    // The quiz module enforces a 10s global cooldown, so this
                    // won't fire on every single kill.
                    if (window.__onEnemyKilled) window.__onEnemyKilled();
                }
                break;
            }
        }
    }
}

// ===== UPDATE LIGHTNINGS =====

export function updateLightnings() {
    for (let i = state.lightnings.length - 1; i >= 0; i--) {
        const lt = state.lightnings[i];
        lt.y += lt.speed;
        lt.el.style.top = lt.y + 'px';

        const lRect = lt.el.getBoundingClientRect();
        const pRect = state.playerRect || DOM.player.getBoundingClientRect();

        if (!(lRect.right < pRect.left || lRect.left > pRect.right ||
              lRect.bottom < pRect.top || lRect.top > pRect.bottom)) {
            state.ammo = state.maxAmmo;
            updateAmmoUI();
            showFloatingMessage('⚡ AMMO FULL!', state.playerX - 30, DOM.wrapper.clientHeight - 140, '#ffe000');
            createExplosion(lRect.left + 20, lRect.top + 30, '#ffe000');
            lt.el.remove();
            state.lightnings.splice(i, 1);
            continue;
        }

        if (lt.y > DOM.wrapper.clientHeight) {
            lt.el.remove();
            state.lightnings.splice(i, 1);
        }
    }
}
