import { DOM, state, addScore, INGREDIENT_TYPES, deviceMode, isUpgradeActive, getHPLevel, currentSkinKey, addCoins, keyBindings, dangerForLevel, enemyHpScale } from './data.js';
import { ART, enemyArt } from './art.js';
import { burst } from './scene.js';
import { t, tf, currentLang } from './i18n.js';
import {
    trackShot, trackDamageTaken, trackHeal,
    trackDeath, saveAnalyticsToCloud
} from './analytics.js';

// ===== ENEMY TYPE HELPERS =====

export function getEnemyPoints(type) {
    return { red: 50, orange: 150, green: 100, blue: 250 }[type] ?? 50;
}

// Joker perk: every 10 kills (any kill, by any method) award 100 coins.
// Called from every enemy-death site so it counts ALL kills, not just bullets.
export function registerJokerKill(x = 0, y = 0) {
    if (currentSkinKey !== 'joker' || !isUpgradeActive('joker_kill_coins')) return;
    state.jokerKills = (state.jokerKills || 0) + 1;
    if (state.jokerKills % 10 === 0) {
        addCoins(100);
        showFloatingMessage(t('jokerKillCoins'), x - 40, y - 20, '#ffd700');
    }
}
export function getEnemyAmmoGrant(type) {
    return { red: 1, orange: 2, green: 2, blue: 3 }[type] ?? 1;
}
export function getEnemyColor(type) {
    return { red: 'var(--danger)', orange: 'var(--elite)', green: '#00cc44', blue: '#0088ff' }[type] ?? 'var(--danger)';
}
export function getEnemyFlatHeal(type) {
    return { red: 0, orange: 50, green: 35, blue: 75 }[type] ?? 0;
}

// ===== PLAYER SYSTEMS =====

export function updatePlayerPos() {
    DOM.player.style.left = state.playerX + 'px';
}

export function updateHPUI() {
    const percent = (Math.max(0, state.playerHP) / state.playerMaxHP) * 100;
    DOM.playerHpFill.style.width = percent + '%';
    DOM.playerHpFill.style.background = percent < 30 ? 'var(--danger)' : 'var(--health)';
    
    // Update top HP bar
    if (DOM.topHpBar) {
        DOM.topHpBar.style.width = percent + '%';
        DOM.topHpBar.style.background = percent < 30 ? 'var(--danger)' : 'var(--health)';
    }
    
    // Update HP text
    if (DOM.hpText) {
        DOM.hpText.innerText = `${Math.max(0, Math.round(state.playerHP))}/${state.playerMaxHP}`;
    }
}

export function updateAmmoUI() {
    if (!DOM.ammoBar || !DOM.ammoText) return;
    const pct = (state.ammo / state.maxAmmo) * 100;
    DOM.ammoBar.style.width = pct + '%';
    DOM.ammoBar.style.background = state.ammo === 0 ? 'var(--danger)' : 'var(--ammo-color)';
    DOM.ammoText.innerText = state.ammo + '/' + state.maxAmmo;
}

export function rechargeAmmo(now) {
    if (!state.active) return;
    // During the boss fight ammo comes back twice as fast so the player isn't starved.
    const interval = Math.round(400 / state.currentSkinStats.fireRate / (state.boss ? 2 : 1) / (state.ammoRate || 1));
    if (now - state.lastAmmoRecharge >= interval && state.ammo < state.maxAmmo) {
        state.ammo++;
        state.lastAmmoRecharge = now;
        updateAmmoUI();
    }
}

// ----- ship control -----
// state.ctrl lets a boss bend the controls without touching the input code:
//   offset  displacement between the pointer and the ship (wind, gravity)
//   min/max walls that narrow the arena
//   lag     0 = direct control, close to 1 = the ship slides (ice)
function clampX(x) {
    const c = state.ctrl;
    return Math.max(c.min ?? 0, Math.min(x, c.max ?? (DOM.wrapper.clientWidth - 50)));
}

export function movePlayer(clientX) {
    const rect = DOM.wrapper.getBoundingClientRect();
    const c = state.ctrl;
    c.pointer = clientX - rect.left - 25;
    const x = clampX(c.pointer + c.offset);
    if (c.lag > 0) { c.target = x; return; }
    state.playerX = x;
    updatePlayerPos();
}

// Keyboard / gamepad movement by `dx` pixels.
export function stepPlayer(dx) {
    const c = state.ctrl;
    if (c.lag > 0) { c.target = clampX((c.target ?? state.playerX) + dx); return; }
    state.playerX = clampX(state.playerX + dx);
    updatePlayerPos();
}

// An outside force on the ship. With pointer control the ship ends up displaced from the
// pointer by at most `bound` px, so the player never has to chase it off the screen.
export function pushPlayer(dx, bound = 170) {
    const c = state.ctrl;
    if (keyBindings.controlType !== 'arrows' && c.pointer != null) {
        c.offset = Math.max(-bound, Math.min(bound, c.offset + dx));
        c.release = false;
        const x = clampX(c.pointer + c.offset);
        if (c.lag > 0) c.target = x; else state.playerX = x;
    } else if (c.lag > 0) c.target = clampX((c.target ?? state.playerX) + dx);
    else state.playerX = clampX(state.playerX + dx);
    updatePlayerPos();
}

// Once per game tick.
export function tickPlayerControl() {
    const c = state.ctrl;
    if (c.lag > 0) {
        if (c.target == null) c.target = state.playerX;
        state.playerX = clampX(state.playerX + (c.target - state.playerX) * (1 - c.lag));
        updatePlayerPos();
    } else c.target = null;
    if (c.release) {                       // the force is gone: glide back under the pointer
        c.offset *= 0.88;
        if (Math.abs(c.offset) < 0.6) { c.offset = 0; c.release = false; }
        if (keyBindings.controlType !== 'arrows' && c.pointer != null && !(c.lag > 0)) { state.playerX = clampX(c.pointer + c.offset); updatePlayerPos(); }
    }
    const x = clampX(state.playerX);
    if (x !== state.playerX) { state.playerX = x; updatePlayerPos(); }
}

export function damagePlayer(amount, source = 'unknown') {
    // Dragon invincibility - ignore all damage while active
    if (state.dragonAbility && Date.now() < state.dragonAbility.invincibleUntil) {
        console.log('🛡️ [DRAGON] Damage blocked by invincibility');
        return;
    }

    amount = Math.round(amount * dangerForLevel(state.level));
    const hpBefore = state.playerHP;
    state.playerHP -= amount;
    trackDamageTaken(amount, source, hpBefore, state.playerHP);

    // Check if player should lose weight
    if (state.isPlayerFat && state.playerHP < state.playerMaxHP - 1) {
        state.isPlayerFat = false;
        state.burgersEatenAtFullHP = 0;
        DOM.player.style.transform = 'scale(1)';
        console.log('🏃 [FAT] Weight lost! Back to normal');
        showFloatingMessage(t('msgWeightLost'), state.playerX, DOM.wrapper.clientHeight - 120, "#00ff00");
    }
    
    updateHPUI();
    
    if(state.playerHP <= 0) {
        console.log('💀 [GAME OVER] Final Score:', state.score, 'Level:', state.level);
        state.active = false;

        // Strong death rumble on any connected gamepad
        try {
            const pads = navigator.getGamepads ? navigator.getGamepads() : [];
            for (const pad of pads) {
                if (pad && pad.vibrationActuator) {
                    pad.vibrationActuator.playEffect('dual-rumble', {
                        startDelay: 0, duration: 800,
                        weakMagnitude: 0.6, strongMagnitude: 1.0
                    });
                }
            }
        } catch(_) {}

        // Hide game-only buttons when returning to main menu
        const abilityBtn = document.getElementById('special-ability-btn');
        if (abilityBtn) abilityBtn.style.display = 'none';
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) pauseBtn.style.display = 'none';
        const pauseOverlay = document.getElementById('pause-overlay');
        if (pauseOverlay) pauseOverlay.style.display = 'none';

        if (!state.isDebugGame) {
            const gameDuration = Date.now() - (state.startTime || Date.now());
            Promise.all([
                import('./data.js'),
                import('./auth.js'),
                import('./education.js'),
                import('./i18n.js'),
                import('./game-history.js')
            ]).then(([dataModule, authModule, eduModule, i18nModule, histModule]) => {
                const userName = authModule.currentUser?.displayName || 'Anonymous';
                const skinKey = dataModule.currentSkinKey;
                const skinName = dataModule.SKINS[skinKey]?.name || skinKey;
                const settings = {
                    isMobile: dataModule.deviceMode.isMobile,
                    controlType: dataModule.keyBindings.controlType,
                    shoot: dataModule.keyBindings.shoot,
                    ability: dataModule.keyBindings.ability,
                    rightClickAbility: dataModule.keyBindings.rightClickAbility,
                    enemiesShootThroughAsteroids: dataModule.gameRules.enemiesShootThroughAsteroids,
                    playerShootThroughAsteroids: dataModule.gameRules.playerShootThroughAsteroids,
                    eduEnabled: eduModule.eduConfig.enabled,
                    eduSubject: eduModule.eduConfig.subject,
                    eduGrade: eduModule.eduConfig.grade,
                    lang: i18nModule.currentLang,
                    gameDuration,
                    startTime: state.startTime || null,
                    upgrades: dataModule.getOwnedUpgrades(),
                    hpLevel: dataModule.getHPLevel(skinKey),
                    bossKilled: !!state.bossDone,
                    bossesKilled: state.bossesBeaten || 0,
                    bossLog: (state.bossLog || []).map(r => r.id),
                    // Input devices actually used this game (keyboard / gamepad)
                    inputMethods: [
                        ...(state.inputUsed?.keyboard ? ['keyboard'] : []),
                        ...(state.inputUsed?.gamepad ? ['gamepad'] : [])
                    ]
                };

                // Save to global leaderboard (cloud + local)
                window.__showScoreSaveStatus?.({ pending: true });
                dataModule.saveScore(skinKey, state.score, state.level, userName, settings)
                    .then((result) => {
                        window.__showScoreSaveStatus?.(result);
                        window.__refreshLeaderboard?.();
                    })
                    .catch(err => {
                        console.error('❌ [GAME OVER] Leaderboard save failed:', err);
                        window.__showScoreSaveStatus?.({ ok: false, reason: 'error', queued: false });
                    });
                console.log(`💾 [GAME OVER] Score save started for user: ${userName}`);

                // Save speedrun results
                const allGoals = [...(dataModule.SPEEDRUN_GOALS || []), ...(dataModule.getCustomSpeedrunGoals?.() || [])];
                for (const goal of allGoals) {
                    const t = (state.speedrunHits || {})[goal.key];
                    if (t != null) {
                        dataModule.saveSpeedrunResult(goal.key, {
                            userName,
                            time: t,
                            score: state.score,
                            level: state.level,
                            skin: skinKey,
                            date: new Date().toLocaleDateString('he-IL'),
                            timestamp: Date.now(),
                            settings
                        });
                    }
                }

                // Attach replay log (compact events recorded during gameplay)
                const replayLog = window.__flushReplayLog ? window.__flushReplayLog() : null;

                const histEntry = {
                    score: state.score,
                    level: state.level,
                    skin: skinKey,
                    skinName,
                    duration: gameDuration,
                    date: new Date().toLocaleDateString('he-IL'),
                    timestamp: Date.now(),
                    userName,
                    isDebug: false,
                    settings,
                    replayLog: replayLog || undefined
                };

                // Save to personal game history
                histModule.addGameToHistory(histEntry);
                console.log(`✅ [GAME OVER] Game added to personal history`);

                // Check achievements
                import('./achievements.js').then(({ checkAchievements, showAchievementToast }) => {
                    const extraStats = {
                        totalGames: (histModule.loadGameHistory().length),
                        skinsUnlocked: dataModule.loadUnlockedSkins ? Object.keys(dataModule.SKINS).filter(k => dataModule.isSkinUnlocked(k)).length : 1,
                        totalCoins: dataModule.getCoins ? dataModule.getCoins() : 0,
                    };
                    const newAchs = checkAchievements(histEntry, extraStats);
                    newAchs.forEach((ach, i) => {
                        setTimeout(() => showAchievementToast(ach), i * 1200);
                    });
                }).catch(() => {});

                // ===== ANALYTICS: log death + save full session to Firebase =====
                trackDeath(source, 0, state.score, state.level);
                saveAnalyticsToCloud(
                    { score: state.score, level: state.level },
                    settings
                ).catch(e => console.error('❌ [ANALYTICS] Save failed:', e));

                // Notify main menu to refresh personal best display
                if (typeof window.__refreshPersonalBest === 'function') {
                    window.__refreshPersonalBest();
                }
            }).catch(err => {
                console.error('❌ [GAME OVER] Save error:', err);
            });
        } else {
            console.log('🛠️ [GAME OVER] Debug game — score not saved to leaderboard');
        }

        DOM.overlay.style.display = 'flex';
        document.getElementById('title').innerText = t('gameOverTitle');
        window.__hideBoss?.();
        document.getElementById('sub-title').innerHTML = `${t('shipDestroyed')}<br>${t('finalScore')} ${state.score}<br>${t('levelWord')} ${state.level}`;
        document.getElementById('leaderboard-container').style.display = 'none';
        document.getElementById('main-menu').style.display = 'block';
    }
}

export function healPlayer(percent) {
    const amount = state.playerMaxHP * (percent / 100);
    const hpBefore = state.playerHP;
    state.playerHP = Math.min(state.playerMaxHP, state.playerHP + amount);
    trackHeal(amount, 'level_up', hpBefore, state.playerHP);
    updateHPUI();
    showFloatingMessage(tf('msgRepair', { p: percent }), state.playerX, DOM.wrapper.clientHeight - 100, "var(--health)");
}

// ===== SHOOTING SYSTEMS =====

export function shoot(rateMultiplier = 1) {
    if(!state.active) return;
    const now = Date.now();
    // rateMultiplier < 1 slows the fire rate (longer cooldown), used by the
    // gamepad's analog Right Trigger: light press = slow, hard press = fast.
    const adjustedCooldown = state.shotCooldown / (state.currentSkinStats.fireRate * rateMultiplier);
    if (now - state.lastShot < adjustedCooldown) return;
    if (state.ammo <= 0) return;
    state.lastShot = now;
    state.ammo--;
    updateAmmoUI();

    const b = document.createElement('div');
    b.className = 'bullet';
    b.style.left = (state.playerX + 23) + 'px';
    b.style.bottom = '80px';
    
    if (state.currentSkinStats.bulletDamage >= 3.0) {
        b.style.width = '8px';
        b.style.height = '25px';
        b.style.background = 'linear-gradient(to top, #ff4500, #ffa500, #ffff00)';
        b.style.boxShadow = '0 0 25px #ff4500, 0 0 15px #ffa500, 0 0 8px #ffff00';
        b.style.borderRadius = '50% 50% 40% 40%';
        b.dataset.isFire = 'true';
    } else if (state.currentSkinStats.bulletDamage > 1.5) {
        b.style.width = '6px';
        b.style.height = '20px';
        b.style.boxShadow = '0 0 20px var(--primary), 0 0 10px #fff';
    } else if (state.currentSkinStats.bulletDamage > 1.0) {
        b.style.width = '5px';
        b.style.height = '18px';
        b.style.boxShadow = '0 0 15px var(--primary)';
    }
    
    DOM.wrapper.appendChild(b);
    state.bullets.push({ 
        el: b, 
        y: 80,
        damage: state.currentSkinStats.bulletDamage
    });
    trackShot(state.playerX + 23, DOM.wrapper.clientHeight - 80, state.currentSkinStats.bulletDamage);
}

export function enemyShoot(en) {
    if (!state.active) return;

    // Cap live enemy bullets so a screen full of fast-firing enemies in
    // advanced stages can't snowball into hundreds of moving elements.
    const ebCap = deviceMode.isMobile ? 70 : 160;
    if (state.enemyBullets.length >= ebCap) return;

    const eb = document.createElement('div');
    eb.className = 'enemy-bullet';
    if (en.type === 'orange') eb.style.background = 'var(--elite)';
    else if (en.type === 'green') { eb.style.background = '#00cc44'; eb.style.boxShadow = '0 0 12px #00cc44'; }
    else if (en.type === 'blue')  { eb.style.background = '#0088ff'; eb.style.boxShadow = '0 0 14px #0088ff'; }
    
    const enLeft = parseFloat(en.el.style.left) + 20;
    const enTop = en.y + 40;
    
    let targetX, targetY;
    
    // Chaotic enemies always target normal enemies
    if (en.isChaotic) {
        // Target any normal enemy regardless of position
        const normalEnemies = state.enemies.filter(e => !e.isChaotic && e.el !== en.el);
        if (normalEnemies.length > 0) {
            const targetEnemy = normalEnemies[Math.floor(Math.random() * normalEnemies.length)];
            targetX = parseFloat(targetEnemy.el.style.left) + 25;
            targetY = targetEnemy.y + 25;
            eb.dataset.chaoticShot = "true";
            eb.style.background = '#00f2ff';
            eb.style.boxShadow = '0 0 10px #00f2ff';
        } else {
            // No normal enemies, don't shoot
            return;
        }
    } else if (Math.random() < 0.05 && state.enemies.length > 1) {
        // 5% chance to friendly fire (only for normal enemies)
        const otherEnemies = state.enemies.filter(e => e.el !== en.el);
        const targetEnemy = otherEnemies[Math.floor(Math.random() * otherEnemies.length)];
        targetX = parseFloat(targetEnemy.el.style.left) + 25;
        targetY = targetEnemy.y + 25;
        eb.dataset.friendlyFire = "true";
    } else {
        // Normal shot at player
        targetX = state.playerX + 25;
        targetY = DOM.wrapper.clientHeight - 55;
    }
    
    const dx = targetX - enLeft;
    const dy = targetY - enTop;
    const distance = Math.sqrt(dx*dx + dy*dy);
    
    const speed = ({ red: 5.5, orange: 7, green: 6.5, blue: 9 }[en.type] ?? 5.5) * state.speedMult;
    const vx = (dx / distance) * speed;
    const vy = (dy / distance) * speed;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    eb.style.left = enLeft + 'px';
    eb.style.top = enTop + 'px';
    eb.style.transform = `rotate(${angle - 90}deg)`;
    
    DOM.wrapper.appendChild(eb);
    state.enemyBullets.push({ 
        el: eb, 
        x: enLeft, 
        y: enTop, 
        vx: vx, 
        vy: vy, 
        friendly: !!eb.dataset.friendlyFire,
        chaotic: !!eb.dataset.chaoticShot,
        shooterId: en.el,
        dmg: state.level <= 20 ? 9 : 15
    });
}

// ===== VISUAL EFFECTS =====

// Particle budget — caps the number of live particle elements so heavy
// moments (mass kills, abilities) in advanced stages don't flood the DOM
// with animated elements and cause lag spikes, especially on mobile.
let activeParticles = 0;
function particleCap() { return deviceMode.isMobile ? 70 : 180; }

export function spawnParticle(x, y, color, opts = {}) {
    burst(x, y, color, 1, { speed: (opts.dist || 60) * 2.2, life: (opts.duration || 500) / 1000, size: (opts.size || 4) * 0.6 });
}

export function createExplosion(x, y, color) {
    burst(x, y, color, deviceMode.isMobile ? 9 : 16);
}

export function showFloatingMessage(text, x, y, color) {
    const msg = document.createElement('div');
    msg.className = 'floating-msg';
    msg.innerText = text;
    msg.style.left = x + 'px';
    msg.style.top = y + 'px';
    msg.style.color = color || 'white';
    DOM.wrapper.appendChild(msg);
    setTimeout(() => msg.remove(), 1000);
}

// ===== SPECIAL ABILITIES =====

export function usePhoenixFeathers() {
    console.log('🔥 [PHOENIX] Activating feathers!');

    const playerCenterX = state.playerX + 25;
    const playerY = DOM.wrapper.clientHeight - 90;

    const targetX = state.lastMouseX || playerCenterX;
    const targetY = state.lastMouseY || playerY - 100;

    const count  = isUpgradeActive('phoenix_super_feathers') ? 5 : 3;
    const damage = isUpgradeActive('phoenix_power_feathers') ? 999 : 5.0;
    const homing = isUpgradeActive('phoenix_homing_feathers');

    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const feather = document.createElement('div');
            feather.className = 'phoenix-feather';
            feather.style.left = playerCenterX + 'px';
            feather.style.bottom = '90px';
            feather.innerHTML = `<svg viewBox="0 0 20 40" style="width:100%; height:100%;">
                <path d="M10 0 L15 15 L10 40 L5 15 Z" fill="${homing ? '#00f2ff' : '#ff6b35'}" />
                <path d="M10 5 L12 12 L10 20 L8 12 Z" fill="#ffd700" />
            </svg>`;
            DOM.wrapper.appendChild(feather);

            const spread = (i - Math.floor(count / 2)) * 15;
            const angle = Math.atan2(targetY - playerY, targetX - playerCenterX) + (spread * Math.PI / 180);

            state.bullets.push({
                el: feather,
                y: 90,
                isFeather: true,
                isHomingFeather: homing,
                vx: Math.cos(angle) * 8,
                vy: Math.sin(angle) * 8,
                damage
            });
        }, i * 100);
    }

    showFloatingMessage(`${t('phoenixFeathers')} x${count}`, playerCenterX - 70, playerY - 50, '#ff6b35');
    console.log(`✅ [PHOENIX] ${count} Feathers launched (homing:${homing}, dmg:${damage})`);
}

export function useVortexLaser() {
    window.__damageBoss?.(0.06);
    console.log('⚡ [VORTEX] Activating laser!');
    const playerCenterX = state.playerX + 25;
    const playerY = DOM.wrapper.clientHeight - 90;
    
    const numBeams = 12;
    for (let i = 0; i < numBeams; i++) {
        const angle = (i / numBeams) * 360;
        const laser = document.createElement('div');
        laser.className = 'laser-beam';
        laser.style.left = playerCenterX + 'px';
        laser.style.bottom = '90px';
        laser.style.transform = `rotate(${angle}deg)`;
        DOM.wrapper.appendChild(laser);
        setTimeout(() => laser.remove(), 300);
    }
    
    let killCount = 0;
    
    // Kill enemies and GIVE POINTS
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        const en = state.enemies[i];
        const points = getEnemyPoints(en.type);
        addScore(points);
        const eRect = en.el.getBoundingClientRect();
        createExplosion(eRect.left + 25, eRect.top + 25, getEnemyColor(en.type));
        en.el.remove();
        state.enemies.splice(i, 1);
        killCount++;
    }
    
    // Kill asteroids (no points for asteroids)
    for (let i = state.asteroids.length - 1; i >= 0; i--) {
        const ast = state.asteroids[i];
        const aRect = ast.el.getBoundingClientRect();
        createExplosion(aRect.left + 25, aRect.top + 25, 'var(--stone)');
        ast.el.remove();
        state.asteroids.splice(i, 1);
        killCount++;
    }
    
    // Destroy enemy bullets
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
        const eb = state.enemyBullets[i];
        createExplosion(eb.x, eb.y, '#ff0000');
        eb.el.remove();
        state.enemyBullets.splice(i, 1);
    }
    
    DOM.scoreEl.innerText = state.score; // Update score display
    
    if (killCount > 0) {
        showFloatingMessage(tf('msgVortex', { n: killCount }), playerCenterX - 80, playerY - 50, 'var(--primary)');
    }
    
    console.log(`✅ [VORTEX] Killed: ${killCount}, Score: ${state.score}`);
}

export function useJokerChaos() {
    window.__damageBoss?.(0.04);
    console.log('🃏 [JOKER] Activating CHAOS MODE!');
    const playerCenterX = state.playerX + 25;
    const playerY = DOM.wrapper.clientHeight - 90;
    
    // Set chaos mode active for 10 seconds
    state.jokerAbility.active = true;
    state.jokerAbility.endTime = Date.now() + 10000;
    
    // Convert all existing enemies to chaos and GIVE 75% POINTS
    let convertedCount = 0;
    let pointsGained = 0;
    for (let i = 0; i < state.enemies.length; i++) {
        const en = state.enemies[i];
        if (!en.isChaotic) {
            en.isChaotic = true;
            en.hitsByChaos = {}; // Track hits by other chaotic enemies
            en.el.style.filter = 'hue-rotate(180deg) brightness(1.3)';
            en.el.style.border = '2px solid #00f2ff';
            // Add delay before chaotic can shoot to avoid immediate collision
            en.lastShot = Date.now() + 1000; // 1 second delay before first shot
            
            const fullPoints = getEnemyPoints(en.type);
            const partialPoints = Math.floor(fullPoints * 0.75); // 75%
            addScore(partialPoints);
            pointsGained += partialPoints;
            
            convertedCount++;
        }
    }
    
    // Update score display
    DOM.scoreEl.innerText = state.score;
    
    // Visual effect - chaos wave
    const chaosWave = document.createElement('div');
    chaosWave.style.position = 'absolute';
    chaosWave.style.left = playerCenterX + 'px';
    chaosWave.style.bottom = '90px';
    chaosWave.style.width = '40px';
    chaosWave.style.height = '40px';
    chaosWave.style.borderRadius = '50%';
    chaosWave.style.background = 'radial-gradient(circle, rgba(0,242,255,0.8), transparent)';
    chaosWave.style.boxShadow = '0 0 30px #00f2ff';
    chaosWave.style.pointerEvents = 'none';
    chaosWave.style.zIndex = '100';
    DOM.wrapper.appendChild(chaosWave);
    
    chaosWave.animate([
        { transform: 'translate(-50%, 50%) scale(1)', opacity: 1 },
        { transform: 'translate(-50%, 50%) scale(20)', opacity: 0 }
    ], {
        duration: 1000,
        easing: 'ease-out'
    }).onfinish = () => chaosWave.remove();
    
    showFloatingMessage(tf('msgChaos', { n: pointsGained }), playerCenterX - 90, playerY - 50, '#00f2ff');
    console.log(`✅ [JOKER] ${convertedCount} enemies turned chaotic, +${pointsGained} points, Total: ${state.score}`);
}

export function useDragonFire() {
    window.__damageBoss?.(0.05);
    console.log('🐉 [DRAGON] Activating DRAGON INFERNO!');
    const playerCenterX = state.playerX + 25;
    const playerTop = DOM.wrapper.clientHeight - 90;
    const playerY = DOM.wrapper.clientHeight - 90;

    // Become invincible for 10 seconds
    state.dragonAbility.invincibleUntil = Date.now() + 10000;
    DOM.player.classList.add('dragon-invincible');

    // Breathe fire in all directions
    const numFlames = 32;
    const flameSpeed = 18;
    for (let i = 0; i < numFlames; i++) {
        const angle = (i / numFlames) * Math.PI * 2;
        const speedVariation = flameSpeed + (Math.random() * 6 - 3);
        const flame = document.createElement('div');
        flame.className = 'bullet';
        flame.style.width = '32px';
        flame.style.height = '32px';
        flame.style.borderRadius = '50%';
        flame.style.background = 'radial-gradient(circle, #ffffff 10%, #ffff00 30%, #ff6600 60%, #ff0000 85%, #880000)';
        flame.style.boxShadow = '0 0 55px #ff6600, 0 0 35px #ffff00, 0 0 20px #ff0000, 0 0 8px #fff';
        flame.style.filter = 'blur(0.5px)';
        flame.style.left = playerCenterX + 'px';
        flame.style.top = playerTop + 'px';
        flame.dataset.isFire = 'true';
        DOM.wrapper.appendChild(flame);

        state.bullets.push({
            el: flame,
            directional: true,
            x: playerCenterX,
            y: 90,
            vx: Math.cos(angle) * speedVariation,
            vy: Math.sin(angle) * speedVariation,
            damage: 15.0
        });
    }

    // Massive visual burst at the player
    for (let b = 0; b < 5; b++) {
        setTimeout(() => {
            createExplosion(playerCenterX + (Math.random()-0.5)*40, playerY + (Math.random()-0.5)*40, '#ff6600');
            createExplosion(playerCenterX + (Math.random()-0.5)*40, playerY + (Math.random()-0.5)*40, '#ffff00');
        }, b * 80);
    }
    createExplosion(playerCenterX, playerY, '#ffffff');

    showFloatingMessage(t('msgDragon'), playerCenterX - 80, playerY - 50, '#ff6600');
    console.log(`✅ [DRAGON] ${numFlames} flames launched + 10s invincibility`);
}

// ===== SPAWNING SYSTEMS =====

export function spawnIngredients(x, y) {
    INGREDIENT_TYPES.forEach(type => {
        const ing = document.createElement('div');
        ing.className = 'ingredient';
        ing.style.left = x + 'px';
        ing.style.top = y + 'px';
        ing.innerHTML = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" fill="${type.color}" stroke="#222" stroke-width="6"/><circle cx="38" cy="38" r="6" fill="#fff" opacity="0.6"/></svg>`;
        DOM.wrapper.appendChild(ing);
        state.ingredients.push({
            el: ing,
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: 2 + Math.random() * 2
        });
    });
}

export function handleSpawning(now) {
    if(now - state.lastSpawn > state.spawnRate) {
        const posX = Math.random() * (DOM.wrapper.clientWidth - 50);
        const el = document.createElement('div');
        const spawnRoll = Math.random();
        
        if (spawnRoll < 0.05) {
            el.className = 'lightning-bolt';
            el.style.left = posX + 'px';
            el.style.top = '-60px';
            el.innerHTML = `<svg viewBox="0 0 60 100" style="width:100%;height:100%"><polygon points="35,0 15,50 30,50 20,100 55,40 35,40 50,0" fill="#ffe000" stroke="#a85a00" stroke-width="5" stroke-linejoin="round"/></svg>`;
            DOM.wrapper.appendChild(el);
            state.lightnings.push({ el, y: -60, speed: 1.5 * state.speedMult });
        } else if (spawnRoll < 0.15) {
            el.className = 'burger';
            el.style.left = posX + 'px'; 
            el.style.top = '-60px';
            el.innerHTML = `
                <div class="hp-bar-container"><div class="hp-bar-fill enemy-hp-fill"></div></div>
                ${ART.burger}`;
            DOM.wrapper.appendChild(el);
            state.burgers.push({
                el: el, 
                hpFill: el.querySelector('.enemy-hp-fill'),
                y: -60, 
                hp: 4, 
                maxHP: 4, 
                speed: 1.2 * state.speedMult
            });
        } else if (spawnRoll < 0.55) {
            el.className = 'asteroid';
            el.style.left = posX + 'px'; 
            el.style.top = '-60px';
            el.innerHTML = `${ART.asteroid}`;
            DOM.wrapper.appendChild(el);
            state.asteroids.push({ 
                el: el, 
                y: -60, 
                speed: (Math.random() * 2.0 + 1.2) * state.speedMult, 
                rot: 0, 
                rotSpeed: Math.random() * 8 - 4 
            });
        } else {
            // Don't keep spawning enemies once the screen is already saturated —
            // this prevents the runaway lag spiral in advanced stages.
            const enemyCap = deviceMode.isMobile ? 35 : 70;
            if (state.enemies.length >= enemyCap) { state.lastSpawn = now; return; }

            // levels 1-20: enemy types unlock more slowly, and enemies have fewer HP
            const lvl = state.level <= 20 ? Math.max(1, Math.round(state.level * 0.6)) : state.level;
            const redWeight    = lvl < 10 ? Math.max(0, 1.0 - (lvl - 1) * 0.12) : 0;
            const orangeWeight = Math.min(1.0, 0.25 + lvl * 0.05);
            const greenWeight  = lvl >= 5  ? Math.min(1.0, (lvl - 4) * 0.18) : 0;
            const blueWeight   = lvl >= 10 ? Math.min(1.0, (lvl - 9) * 0.20) : 0;
            const totalWeight  = redWeight + orangeWeight + greenWeight + blueWeight;
            const roll = Math.random() * totalWeight;
            let type;
            if      (roll < redWeight)                                  type = 'red';
            else if (roll < redWeight + orangeWeight)                   type = 'orange';
            else if (roll < redWeight + orangeWeight + greenWeight)     type = 'green';
            else                                                         type = 'blue';

            const scaleEnemyHP = (hp) => Math.ceil(hp * (state.level <= 20 ? 0.9 : 1.5) * enemyHpScale(state.level));
            const enemyStats = {
                red:    { hp: scaleEnemyHP(Math.floor(Math.random() * 3) + 1), colorCode: '#ff0000', fireRate: 1000, speedMod: 1.0 },
                orange: { hp: scaleEnemyHP(Math.floor(Math.random() * 3) + 3), colorCode: '#ff9900', fireRate: 600,  speedMod: 1.0 },
                green:  { hp: scaleEnemyHP(Math.floor(Math.random() * 3) + 3), colorCode: '#00cc44', fireRate: 800,  speedMod: 1.0 },
                blue:   { hp: scaleEnemyHP(Math.floor(Math.random() * 4) + 5), colorCode: '#0088ff', fireRate: 450,  speedMod: 1.3 },
            };
            const stats = enemyStats[type];
            const maxHP = stats.hp;
            const colorCode = stats.colorCode;
            el.className = `enemy-ship ${type}`;
            el.style.left = posX + 'px';
            el.style.top = '-60px';
            el.innerHTML = `<div class="hp-bar-container"><div class="hp-bar-fill enemy-hp-fill"></div></div>${enemyArt(type)}`;
            DOM.wrapper.appendChild(el);

            // Check if chaos mode is active
            const isChaotic = state.jokerAbility && state.jokerAbility.active;
            if (isChaotic) {
                el.style.filter = 'hue-rotate(180deg) brightness(1.3)';
                el.style.border = '2px solid #00f2ff';
            }

            state.enemies.push({
                el: el,
                hpFill: el.querySelector('.enemy-hp-fill'),
                type: type,
                y: -60,
                hp: maxHP,
                maxHP: maxHP,
                speed: (Math.random() * 0.8 + 0.6) * stats.speedMod * state.speedMult,
                lastShot: now + Math.random() * 500,
                fireRate: stats.fireRate / state.speedMult,
                isChaotic: isChaotic,
                hitsByChaos: isChaotic ? {} : undefined
            });
        }
        state.lastSpawn = now;
    }
}