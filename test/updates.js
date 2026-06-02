import { DOM, state, gameRules, deviceMode } from './data.js';
import { damagePlayer, updateHPUI, enemyShoot, createExplosion, spawnParticle, showFloatingMessage, healPlayer, spawnIngredients, updateAmmoUI } from './systems.js';

// ===== UPDATE BULLETS =====

export function updateBullets() {
    const bulletSpeed = 15 * state.currentSkinStats.bulletSpeed;
    for (let i = state.bullets.length - 1; i >= 0; i--) {
        let b = state.bullets[i];
        
        if (b.isFeather || b.directional) {
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
        eb.x += eb.vx;
        eb.y += eb.vy;
        eb.el.style.left = eb.x + 'px';
        eb.el.style.top = eb.y + 'px';
        const ebRect = eb.el.getBoundingClientRect();
        const pRect = state.playerRect || DOM.player.getBoundingClientRect();

        // Check collision with player (only non-friendly and non-chaotic bullets)
        if (!eb.friendly && !eb.chaotic) {
            if(!(ebRect.right < pRect.left || ebRect.left > pRect.right || ebRect.bottom < pRect.top || ebRect.top > pRect.bottom)) {
                damagePlayer(15);
                createExplosion(eb.x, eb.y, 'var(--primary)');
                eb.el.remove();
                state.enemyBullets.splice(i, 1);
                continue;
            }
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
                        const isElite = targetEn.type === 'orange';
                        const points = isElite ? 75 : 25;
                        state.score += points;
                        DOM.scoreEl.innerText = state.score;
                        createExplosion(teRect.left + 25, teRect.top + 25, isElite ? 'var(--elite)' : 'var(--danger)');
                        showFloatingMessage(`+${points}`, teRect.left, teRect.top, '#00f2ff');
                        targetEn.el.remove();
                        state.enemies.splice(ei, 1);
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
                        const isElite = targetEn.type === 'orange';
                        const points = isElite ? 75 : 25;
                        state.score += points;
                        DOM.scoreEl.innerText = state.score;
                        createExplosion(teRect.left + 25, teRect.top + 25, isElite ? 'var(--elite)' : 'var(--danger)');
                        targetEn.el.remove();
                        state.enemies.splice(ei, 1);
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
            
            healPlayer(15);
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
            state.playerHP = Math.min(state.playerMaxHP, state.playerHP + 5);
            updateHPUI();
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
            damagePlayer(40);
            createExplosion(aRect.left + 25, aRect.top + 25, 'var(--stone)');
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
                damagePlayer(30);
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
                                const isElite = targetEn.type === 'orange';
                                const points = isElite ? 150 : 50;
                                const ammoGrant = isElite ? 2 : 1;
                                state.ammo = Math.min(state.maxAmmo, state.ammo + ammoGrant);
                                updateAmmoUI();
                                state.score += points;
                                DOM.scoreEl.innerText = state.score;
                                createExplosion(teRect.left + 25, teRect.top + 25, isElite ? 'var(--elite)' : 'var(--danger)');
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
                    const isElite = en.type === 'orange';
                    const points = isElite ? 150 : 50;
                    const ammoGrant = isElite ? 2 : 1;
                    state.ammo = Math.min(state.maxAmmo, state.ammo + ammoGrant);
                    updateAmmoUI();
                    const oldScore = state.score;
                    state.score += points;
                    DOM.scoreEl.innerText = state.score;
                    const crossedHealThreshold = Math.floor(state.score / 300) > Math.floor(oldScore / 300);
                    
                    if (isElite) {
                        createExplosion(eRect.left + 25, eRect.top + 25, 'var(--elite)');
                        if (crossedHealThreshold) {
                            const healAmount = state.playerMaxHP * 0.75;
                            state.playerHP = Math.min(state.playerMaxHP, state.playerHP + healAmount);
                            state.lastHealScore = Math.floor(state.score / 300) * 300;
                            showFloatingMessage("CRITICAL REPAIR +75%", eRect.left, eRect.top, "var(--elite)");
                        } else {
                            state.playerHP = Math.min(state.playerMaxHP, state.playerHP + 50);
                            showFloatingMessage("REPAIR +25% & 150 PTS", eRect.left, eRect.top, "var(--elite)");
                        }
                        updateHPUI();
                    } else {
                        createExplosion(eRect.left + 25, eRect.top + 25, 'var(--danger)');
                        if (crossedHealThreshold) {
                            state.playerHP = Math.min(state.playerMaxHP, state.playerHP + 20);
                            state.lastHealScore = Math.floor(state.score / 300) * 300;
                            showFloatingMessage("REPAIR +20", eRect.left, eRect.top, "var(--health)");
                            updateHPUI();
                        }
                    }
                    en.el.remove();
                    state.enemies.splice(i, 1);
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
