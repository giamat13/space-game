import { DOM, SKINS, state, resetState, setCurrentSkin, currentSkinKey, loadUnlockedSkins, isSkinUnlocked, unlockSkin, saveMaxLevel, getMaxLevel, getLeaderboard, saveScore, keyBindings, loadKeyBindings, setKeyBinding, gameRules, loadGameRules, setGameRule, deviceMode, loadDeviceMode, setDeviceMode } from './data.js';
import { updatePlayerPos, movePlayer, updateHPUI, updateAmmoUI, shoot, showFloatingMessage, useVortexLaser, usePhoenixFeathers, useJokerChaos, useDragonFire, rechargeAmmo } from './systems.js';
import { handleSpawning } from './systems.js';
import { updateBullets, updateEnemyBullets, updateBurgers, updateIngredients, updateAsteroids, updateEnemies, updateLightnings } from './updates.js';
import { initAuth, currentUser, isAuthenticated } from './auth.js';
import { initFirestoreSync } from './firestore-sync.js';
import { loadEduConfig, loadQuestionBank, eduConfig, isEduActive, triggerQuiz, resetQuizCooldown, getSubjects, getGradesForSubject, setEduEnabled, setEduSubject, setEduGrade, lockEdu, unlockEdu, buildEduLink, gradeLabel, forceUnlockLocal, applyExpiryIfNeeded, lockMsRemaining, listenForUnlock, startManaging, becomeManager, listenParticipants, unlockAllParticipants, unlockOneParticipant, joinSession } from './education.js';
import { t, applyLang, toggleLang, currentLang, LANGUAGES } from './i18n.js';

// ===== INITIALIZATION =====

console.log('🚀 [INIT] Game loading...');
initAuth(); // Initialize Firebase Auth
initFirestoreSync(); // Initialize Firestore sync
loadUnlockedSkins();
loadKeyBindings();
loadGameRules();
loadDeviceMode();
loadEduConfig();        // Education mode config (may come from a teacher link)
loadQuestionBank();     // Load questions.json (async; fallback bundled)
updateSkinOptions();
initEduSession();        // Connect to shared session (remote unlock / dashboard)
applyLang();             // Apply saved language preference to all [data-i18n] elements

// Re-translate and re-render dynamic JS text whenever the language changes.
window.addEventListener('langchange', () => {
    updateEduSettingsDisplay(); // re-render grade labels
    updateSettingsDisplay();    // re-render buttons
    renderLangList();           // update the active tick in the language tab
});

// Expose toggleLang for the HTML onclick button.
window.toggleLang = toggleLang;
window.pickLang = (code) => { applyLang(code); };

// Heartbeat: re-check the 45-minute auto-unlock, refresh our display name and
// presence (lastSeen) in the shared session, every 15s.
setInterval(() => {
    window.__eduCurrentUser = currentUser; // keep the name fresh once logged in
    const justOpened = applyExpiryIfNeeded();
    if (eduConfig.locked && eduConfig.sessionId) joinSession(true);
    const settingsOpen = document.getElementById('settings-container')?.style.display !== 'none';
    if ((justOpened || eduConfig.managed) && settingsOpen) {
        updateEduSettingsDisplay();
    }
}, 15000);

// ===== EDUCATION SHARED SESSION =====
let eduUnsubUnlock = null;
let eduUnsubParticipants = null;

function initEduSession() {
    // Expose the logged-in user's name for the participant dashboard.
    window.__eduCurrentUser = currentUser;

    if (eduConfig.locked && eduConfig.sessionId) {
        // We're a locked device: announce ourselves and wait for an unlock.
        joinSession(true);
        listenForUnlock(() => {
            updateEduSettingsDisplay();
            showFloatingMessage(t('lockOpened'), 20, 20, 'var(--primary)');
        }).then(unsub => { eduUnsubUnlock = unsub; });
    }
    if (eduConfig.managed && eduConfig.sessionId) {
        // We created the password: keep the session doc alive and watch the roster.
        startManaging();
    }
}

// Allow the quiz modal to resume the paused game loop.
window.__resumeGameLoop = () => requestAnimationFrame(update);

// Enemy-kill quiz hook (called from updates.js). The 10s cooldown inside the
// education module keeps this from firing too often.
window.__onEnemyKilled = () => {
    if (!isEduActive()) return;
    triggerQuiz('kill', {
        onCorrect: () => {
            const heal = Math.round(state.playerMaxHP * 0.10);
            state.playerHP = Math.min(state.playerMaxHP, state.playerHP + heal);
            updateHPUI();
            showFloatingMessage(`+${heal} HP`, DOM.wrapper.clientWidth/2 - 30, DOM.wrapper.clientHeight/2 + 40, "var(--health)");
        }
    });
};

// Initialize floating settings button
document.getElementById('floating-settings-btn').style.display = 'flex';
document.getElementById('floating-settings-btn').onclick = showSettings;

console.log('✅ [INIT] Game loaded successfully');

// ===== LEADERBOARD =====

function showLeaderboard() {
    console.log('🏆 [LEADERBOARD] Opening leaderboard...');
    console.log('🏆 [LEADERBOARD] Hiding main menu');
    document.getElementById('main-menu').style.display = 'none';
    console.log('🏆 [LEADERBOARD] Showing leaderboard container');
    document.getElementById('leaderboard-container').style.display = 'block';
    console.log('🏆 [LEADERBOARD] Displaying overall category');
    displayLeaderboard('overall');
    
    // Setup tab listeners
    console.log('🏆 [LEADERBOARD] Setting up tab listeners');
    const tabs = document.querySelectorAll('.lb-tab');
    console.log(`🏆 [LEADERBOARD] Found ${tabs.length} tabs`);
    tabs.forEach((tab, index) => {
        console.log(`🏆 [LEADERBOARD] Setting up tab ${index}: ${tab.dataset.tab}`);
        tab.onclick = function() {
            console.log(`👆 [TAB CLICK] User clicked tab: ${this.dataset.tab}`);
            document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            console.log(`👆 [TAB CLICK] Displaying leaderboard for: ${this.dataset.tab}`);
            displayLeaderboard(this.dataset.tab);
        };
    });
    console.log('✅ [LEADERBOARD] Leaderboard opened successfully');
}

function closeLeaderboard() {
    console.log('❌ [LEADERBOARD] Closing leaderboard...');
    document.getElementById('leaderboard-container').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
    document.getElementById('floating-settings-btn').style.display = 'flex';
    console.log('✅ [LEADERBOARD] Leaderboard closed');
}

async function displayLeaderboard(category) {
    console.log(`📊 [DISPLAY] Displaying leaderboard for category: ${category}`);
    const content = document.getElementById('leaderboard-content');
    
    if (!content) {
        console.error('❌ [DISPLAY] ERROR: leaderboard-content element not found!');
        return;
    }
    
    // Show loading message
    content.innerHTML = `<div class="lb-empty">${t('loading')}</div>`;
    
    // Try to get from cloud first
    let leaderboard = [];
    try {
        const { getLeaderboardFromCloud } = await import('./firestore-sync.js');
        const cloudLeaderboard = await getLeaderboardFromCloud(category);
        if (cloudLeaderboard && cloudLeaderboard.length > 0) {
            console.log(`✅ [DISPLAY] Got ${cloudLeaderboard.length} entries from cloud`);
            leaderboard = cloudLeaderboard;
        } else {
            // Fallback to local
            leaderboard = getLeaderboard(category);
            console.log(`📊 [DISPLAY] Using local data: ${leaderboard.length} entries`);
        }
    } catch (error) {
        console.log('⚠️ [DISPLAY] Cloud fetch failed, using local data');
        leaderboard = getLeaderboard(category);
    }
    
    console.log(`📊 [DISPLAY] Retrieved ${leaderboard.length} entries`);
    
    if (leaderboard.length === 0) {
        console.log('⚠️ [DISPLAY] No entries found, showing empty message');
        content.innerHTML = `<div class="lb-empty">${t('lbEmpty')}</div>`;
        return;
    }
    
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    console.log('📊 [DISPLAY] Generating HTML for entries...');
    const html = leaderboard.map((entry, index) => {
        console.log(`📊 [DISPLAY] Entry ${index + 1}:`, entry);
        
        // Get skin name, or use the skin key if skin doesn't exist in SKINS
        let skinName = '';
        if (entry.skin) {
            if (SKINS[entry.skin]) {
                skinName = `• ${SKINS[entry.skin].name}`;
            } else {
                skinName = `• ${entry.skin}`; // Fallback to skin key if skin doesn't exist
                console.warn(`⚠️ [DISPLAY] Unknown skin: ${entry.skin}`);
            }
        }
        
        // Get user name
        const userName = entry.userName || 'Anonymous';
        
        return `
        <div class="lb-entry rank-${index + 1}">
            <div class="lb-rank">${medals[index] || (index + 1)}</div>
            <div class="lb-info">
                <div class="lb-player-name" style="font-size: 0.9rem; font-weight: bold; color: var(--primary); margin-bottom: 3px;">
                    👤 ${userName}
                </div>
                <div class="lb-score">${entry.score.toLocaleString()}</div>
                <div class="lb-details">
                    ${t('levelWord')} ${entry.level} ${skinName} • ${entry.date}
                </div>
            </div>
        </div>
    `;
    }).join('');
    
    content.innerHTML = html;
    console.log('✅ [DISPLAY] Leaderboard displayed successfully');
}

// Export to window for HTML onclick
console.log('🔗 [EXPORT] Exporting functions to window object...');
window.showLeaderboard = showLeaderboard;
window.closeLeaderboard = closeLeaderboard;
console.log('✅ [EXPORT] Functions exported:', {
    showLeaderboard: typeof window.showLeaderboard,
    closeLeaderboard: typeof window.closeLeaderboard
});

// ===== SKIN SELECTION =====

function updateSkinOptions() {
    console.log('🎨 [SKINS] Updating skin options...');
    const options = document.querySelectorAll('.skin-option');
    console.log(`🎨 [SKINS] Found ${options.length} skin options`);
    
    options.forEach((option, index) => {
        const skinKey = option.dataset.skin;
        const unlockLevel = parseInt(option.dataset.unlockLevel) || 0;
        const maxLevel = getMaxLevel();
        
        console.log(`🎨 [SKINS] Processing skin ${index}: ${skinKey} (unlock level: ${unlockLevel}, max level: ${maxLevel})`);
        
        if (unlockLevel > 0 && maxLevel >= unlockLevel && !isSkinUnlocked(skinKey)) {
            console.log(`🔓 [SKINS] Auto-unlocking ${skinKey}`);
            unlockSkin(skinKey);
            option.classList.add('newly-unlocked');
            setTimeout(() => option.classList.remove('newly-unlocked'), 1000);
        }
        
        if (isSkinUnlocked(skinKey)) {
            console.log(`✅ [SKINS] ${skinKey} is unlocked, making clickable`);
            option.classList.remove('locked');
            option.onclick = () => {
                console.log(`👆 [SKIN CLICK] User clicked skin: ${skinKey}`);
                selectSkin(skinKey, option);
            };
        } else {
            console.log(`🔒 [SKINS] ${skinKey} is locked`);
            option.classList.add('locked');
            option.onclick = null;
        }
    });
    console.log('✅ [SKINS] Skin options updated');
}

function selectSkin(key, element) {
    console.log(`🎨 [SELECT] Selecting skin: ${key}`);
    if (!isSkinUnlocked(key)) {
        console.log(`🔒 [SELECT] Skin ${key} is locked! Selection blocked.`);
        return;
    }
    setCurrentSkin(key);
    document.querySelectorAll('.skin-option').forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
    console.log(`✅ [SELECT] Skin ${key} selected successfully`);
}

// Export to window for HTML onclick
window.selectSkin = selectSkin;

// ===== GAME INITIALIZATION =====

function initGame() {
    resetState();
    
    // Reset player size to normal
    DOM.player.style.transform = 'scale(1)';
    
    const skin = SKINS[currentSkinKey];
    state.currentSkinStats = {
        fireRate: skin.fireRate,
        bulletSpeed: skin.bulletSpeed,
        bulletDamage: skin.bulletDamage
    };
    
    DOM.playerSpriteContainer.innerHTML = skin.svg;
    document.documentElement.style.setProperty('--primary', skin.color);

    DOM.scoreEl.innerText = '0';
    DOM.levelEl.innerText = '1';
    updateHPUI();
    updateAmmoUI();
    DOM.overlay.style.display = 'none';
    document.getElementById('floating-settings-btn').style.display = 'none';

    // Show/hide special ability button based on skin and reset cooldown display
    const abilityBtn = document.getElementById('special-ability-btn');
    if (currentSkinKey === 'vortex') {
        abilityBtn.style.display = 'flex';
        abilityBtn.classList.remove('cooldown');
        abilityBtn.querySelector('.ability-icon').innerText = '⚡';
        abilityBtn.querySelector('.ability-cooldown').style.setProperty('--cooldown-percent', '0%');
    } else if (currentSkinKey === 'phoenix') {
        abilityBtn.style.display = 'flex';
        abilityBtn.classList.remove('cooldown');
        abilityBtn.querySelector('.ability-icon').innerText = '🔥';
        abilityBtn.querySelector('.ability-cooldown').style.setProperty('--cooldown-percent', '0%');
    } else if (currentSkinKey === 'joker') {
        abilityBtn.style.display = 'flex';
        abilityBtn.classList.remove('cooldown');
        abilityBtn.querySelector('.ability-icon').innerText = '🃏';
        abilityBtn.querySelector('.ability-cooldown').style.setProperty('--cooldown-percent', '0%');
    } else if (currentSkinKey === 'dragon') {
        abilityBtn.style.display = 'flex';
        abilityBtn.classList.remove('cooldown');
        abilityBtn.querySelector('.ability-icon').innerText = '🐉';
        abilityBtn.querySelector('.ability-cooldown').style.setProperty('--cooldown-percent', '0%');
    } else {
        abilityBtn.style.display = 'none';
    }

    // Make sure invincibility visual is cleared on a fresh game
    DOM.player.classList.remove('dragon-invincible');
    
    const elementsToRemove = document.querySelectorAll('.enemy-ship, .asteroid, .bullet, .enemy-bullet, .particle, .floating-msg, .burger, .ingredient, .laser-beam, .lightning-bolt');
    elementsToRemove.forEach(e => e.remove());
    
    updateSkinOptions();
    updatePlayerPos();
    resetQuizCooldown();
    requestAnimationFrame(update);

    // Education mode: opening question before the action ramps up.
    if (isEduActive()) {
        triggerQuiz('start', {
            onWrong: () => { /* opening question is informational only */ }
        });
    }
}

// Export to window for HTML onclick
window.initGame = initGame;
console.log('✅ [EXPORT] initGame exported:', typeof window.initGame);

// ===== LEVEL UP SYSTEM =====

function handleLevelUp() {
    if (state.score >= state.lastLevelScore + 1000) {
        state.lastLevelScore = Math.floor(state.score / 1000) * 1000;
        state.level++;
        DOM.levelEl.innerText = state.level;
        state.speedMult += 0.2;
        state.spawnRate = Math.max(250, state.spawnRate - 200);
        state.playerHP = state.playerMaxHP;
        updateHPUI();
        
        saveMaxLevel(state.level);
        
        let unlocked = false;
        Object.keys(SKINS).forEach(skinKey => {
            const skin = SKINS[skinKey];
            if (skin.unlockLevel === state.level && !isSkinUnlocked(skinKey)) {
                if (unlockSkin(skinKey)) {
                    unlocked = true;
                    showFloatingMessage(
                        `🎉 NEW SKIN UNLOCKED: ${skin.name.toUpperCase()}!`, 
                        DOM.wrapper.clientWidth/2 - 100, 
                        DOM.wrapper.clientHeight/2 + 50, 
                        "#ffd700"
                    );
                }
            }
        });
        
        if (unlocked) {
            updateSkinOptions();
        }
        
        showFloatingMessage("LEVEL UP! HP REFILL", DOM.wrapper.clientWidth/2 - 70, DOM.wrapper.clientHeight/2, "var(--primary)");

        // Education mode: a question on every level up. A wrong answer costs HP.
        if (isEduActive()) {
            triggerQuiz('levelup', {
                onWrong: () => {
                    const penalty = Math.round(state.playerMaxHP * 0.15);
                    state.playerHP = Math.max(1, state.playerHP - penalty);
                    updateHPUI();
                    showFloatingMessage(`-${penalty} HP`, DOM.wrapper.clientWidth/2 - 30, DOM.wrapper.clientHeight/2 + 40, "var(--danger)");
                }
            });
        }
    }
}

// ===== MAIN UPDATE LOOP =====

function update() {
    if(!state.active) return;
    const now = Date.now();
    
    handleLevelUp();
    handleSpawning(now);
    rechargeAmmo(now);
    updateAbilityCooldown(now);
    updateArrowMovement();

    // Read the player's rect once per frame; every collision pass reuses it
    // instead of triggering its own layout reflow.
    state.playerRect = DOM.player.getBoundingClientRect();

    // Move bullets first so their cached rects are fresh for the collision
    // passes (burgers/asteroids/enemies) that follow.
    updateBullets();
    updateEnemyBullets();
    updateBurgers();
    updateLightnings();
    updateIngredients();
    updateAsteroids();
    updateEnemies(now);

    requestAnimationFrame(update);
}

// ===== SPECIAL ABILITY SYSTEM =====

function updateAbilityCooldown(now) {
    const abilityBtn = document.getElementById('special-ability-btn');
    if (!abilityBtn) return;
    
    // Check if chaos mode duration ended (but don't revert enemies)
    if (state.jokerAbility.active && now >= state.jokerAbility.endTime) {
        console.log('🃏 [JOKER] Chaos mode duration ended (enemies stay chaotic)');
        state.jokerAbility.active = false;
        // Don't remove chaos effect - enemies stay chaotic forever!
    }
    
    if (currentSkinKey === 'vortex') {
        if (!state.specialAbility.ready) {
            const elapsed = now - state.specialAbility.lastUsed;
            const remaining = state.specialAbility.cooldown - elapsed;
            
            if (remaining <= 0) {
                state.specialAbility.ready = true;
                abilityBtn.classList.remove('cooldown');
                abilityBtn.querySelector('.ability-cooldown').style.setProperty('--cooldown-percent', '0%');
            } else {
                const percent = (remaining / state.specialAbility.cooldown) * 100;
                abilityBtn.querySelector('.ability-cooldown').style.setProperty('--cooldown-percent', `${percent}%`);
            }
        }
    } else if (currentSkinKey === 'phoenix') {
        if (!state.phoenixAbility.ready) {
            const elapsed = now - state.phoenixAbility.lastUsed;
            const remaining = state.phoenixAbility.cooldown - elapsed;
            
            if (remaining <= 0) {
                state.phoenixAbility.ready = true;
                abilityBtn.classList.remove('cooldown');
                abilityBtn.querySelector('.ability-cooldown').style.setProperty('--cooldown-percent', '0%');
            } else {
                const percent = (remaining / state.phoenixAbility.cooldown) * 100;
                abilityBtn.querySelector('.ability-cooldown').style.setProperty('--cooldown-percent', `${percent}%`);
            }
        }
    } else if (currentSkinKey === 'joker') {
        if (!state.jokerAbility.ready) {
            const elapsed = now - state.jokerAbility.lastUsed;
            const remaining = state.jokerAbility.cooldown - elapsed;

            if (remaining <= 0) {
                state.jokerAbility.ready = true;
                abilityBtn.classList.remove('cooldown');
                abilityBtn.querySelector('.ability-cooldown').style.setProperty('--cooldown-percent', '0%');
            } else {
                const percent = (remaining / state.jokerAbility.cooldown) * 100;
                abilityBtn.querySelector('.ability-cooldown').style.setProperty('--cooldown-percent', `${percent}%`);
            }
        }
    } else if (currentSkinKey === 'dragon') {
        // Clear invincibility visual when it expires
        if (state.dragonAbility.invincibleUntil > 0 && now >= state.dragonAbility.invincibleUntil) {
            DOM.player.classList.remove('dragon-invincible');
        }

        if (!state.dragonAbility.ready) {
            const elapsed = now - state.dragonAbility.lastUsed;
            const remaining = state.dragonAbility.cooldown - elapsed;

            if (remaining <= 0) {
                state.dragonAbility.ready = true;
                abilityBtn.classList.remove('cooldown');
                abilityBtn.querySelector('.ability-cooldown').style.setProperty('--cooldown-percent', '0%');
            } else {
                const percent = (remaining / state.dragonAbility.cooldown) * 100;
                abilityBtn.querySelector('.ability-cooldown').style.setProperty('--cooldown-percent', `${percent}%`);
            }
        }
    }
}

function activateSpecialAbility() {
    if (!state.active) return;
    
    if (currentSkinKey === 'vortex') {
        if (!state.specialAbility.ready) return;
        
        useVortexLaser();
        state.specialAbility.ready = false;
        state.specialAbility.lastUsed = Date.now();
        document.getElementById('special-ability-btn').classList.add('cooldown');
    } else if (currentSkinKey === 'phoenix') {
        if (!state.phoenixAbility.ready) return;
        
        usePhoenixFeathers();
        state.phoenixAbility.ready = false;
        state.phoenixAbility.lastUsed = Date.now();
        document.getElementById('special-ability-btn').classList.add('cooldown');
    } else if (currentSkinKey === 'joker') {
        if (!state.jokerAbility.ready) return;

        useJokerChaos();
        state.jokerAbility.ready = false;
        state.jokerAbility.lastUsed = Date.now();
        document.getElementById('special-ability-btn').classList.add('cooldown');
    } else if (currentSkinKey === 'dragon') {
        if (!state.dragonAbility.ready) return;

        useDragonFire();
        state.dragonAbility.ready = false;
        state.dragonAbility.lastUsed = Date.now();
        document.getElementById('special-ability-btn').classList.add('cooldown');
    }
}

// ===== EVENT LISTENERS =====

// Mouse/Arrow control
window.addEventListener('mousemove', (e) => {
    if(!state.active || keyBindings.controlType !== 'mouse') return;
    movePlayer(e.clientX);
    
    // Track mouse position for Phoenix feathers
    const rect = DOM.wrapper.getBoundingClientRect();
    state.lastMouseX = e.clientX - rect.left;
    state.lastMouseY = e.clientY - rect.top;
});

window.addEventListener('touchmove', (e) => {
    if(!state.active) return;
    e.preventDefault();
    movePlayer(e.touches[0].clientX);
    shoot();
    
    // Track touch position for Phoenix feathers
    const rect = DOM.wrapper.getBoundingClientRect();
    state.lastMouseX = e.touches[0].clientX - rect.left;
    state.lastMouseY = e.touches[0].clientY - rect.top;
}, { passive: false });

window.addEventListener('touchstart', (e) => {
    if(!state.active) return;
    movePlayer(e.touches[0].clientX);
    shoot();
    
    // Track touch position for Phoenix feathers
    const rect = DOM.wrapper.getBoundingClientRect();
    state.lastMouseX = e.touches[0].clientX - rect.left;
    state.lastMouseY = e.touches[0].clientY - rect.top;
}, { passive: false });

// Arrow key controls
let arrowKeysPressed = { left: false, right: false, up: false, down: false, shoot: false };
let mousePressed = false;

window.addEventListener('keydown', (e) => {
    // Handle shooting key - track if it's pressed
    if (state.active && e.code === keyBindings.shoot) {
        arrowKeysPressed.shoot = true;
        shoot(); // Shoot immediately on press
    }
    
    // Handle special ability for all control types
    if (state.active && e.code === keyBindings.ability) {
        activateSpecialAbility();
    }
    
    // Handle movement keys only for arrows control type
    if (!state.active || keyBindings.controlType !== 'arrows') return;
    
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        arrowKeysPressed.left = true;
        e.preventDefault();
    }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        arrowKeysPressed.right = true;
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    // Track shoot key release
    if (e.code === keyBindings.shoot) {
        arrowKeysPressed.shoot = false;
    }
    
    if (keyBindings.controlType !== 'arrows') return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') arrowKeysPressed.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') arrowKeysPressed.right = false;
});

// Arrow movement update
function updateArrowMovement() {
    if (!state.active) return;
    
    // Handle arrow key movement
    if (keyBindings.controlType === 'arrows') {
        const speed = 8;
        if (arrowKeysPressed.left) {
            state.playerX = Math.max(0, state.playerX - speed);
            updatePlayerPos();
        }
        if (arrowKeysPressed.right) {
            state.playerX = Math.min(DOM.wrapper.clientWidth - 50, state.playerX + speed);
            updatePlayerPos();
        }
    }
    
    // Continuous shooting when shoot key is held (works in both modes)
    if (arrowKeysPressed.shoot) {
        shoot();
    }
    
    // Continuous shooting when mouse button is held (mouse mode only)
    if (keyBindings.controlType === 'mouse' && mousePressed) {
        shoot();
    }
}

window.addEventListener('mousedown', (e) => {
    if (keyBindings.controlType === 'mouse') {
        mousePressed = true;
        shoot();
    }
});

window.addEventListener('mouseup', (e) => {
    mousePressed = false;
});

// Special ability button click
document.getElementById('special-ability-btn').addEventListener('click', activateSpecialAbility);

// Prevent context menu on right click, use it for special ability instead
window.addEventListener('contextmenu', (e) => {
    if (state.active && keyBindings.rightClickAbility) {
        e.preventDefault();
        activateSpecialAbility();
    }
});

// ===== INITIALIZATION =====

// Generate stars
console.log('⭐ [INIT] Generating stars...');
for(let i=0; i<40; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.width = '2px';
    s.style.height = '2px';
    s.style.left = Math.random()*100+'%';
    s.style.top = Math.random()*100+'%';
    s.style.animationDuration = (Math.random()*4+2)+'s';
    DOM.wrapper.appendChild(s);
}
console.log('✅ [INIT] 40 stars generated');

DOM.playerSpriteContainer.innerHTML = SKINS.classic.svg;
console.log('✅ [INIT] Player sprite set to classic skin');
console.log('🎮 [INIT] All systems ready!');

// ===== DEBUG COMMANDS =====

window.debugUnlockSkin = function(skinKey) {
    if (!SKINS[skinKey]) {
        console.error(`❌ [DEBUG] Skin "${skinKey}" does not exist!`);
        console.log('📋 [DEBUG] Available skins:', Object.keys(SKINS).join(', '));
        return false;
    }
    
    const result = unlockSkin(skinKey);
    if (result) {
        console.log(`🎉 [DEBUG] Successfully unlocked skin: ${skinKey}`);
        updateSkinOptions();
        return true;
    } else {
        console.log(`ℹ️ [DEBUG] Skin ${skinKey} was already unlocked`);
        return false;
    }
};

window.debugUnlockAllSkins = function() {
    console.log('🔓 [DEBUG] Unlocking all skins...');
    let count = 0;
    Object.keys(SKINS).forEach(skinKey => {
        const result = unlockSkin(skinKey);
        if (result) {
            count++;
        }
    });
    updateSkinOptions();
    console.log(`✅ [DEBUG] Unlocked ${count} new skins!`);
    console.log('📋 [DEBUG] All unlocked skins:', Object.keys(SKINS).join(', '));
};

window.debugListSkins = function() {
    console.log('📋 [DEBUG] === AVAILABLE SKINS ===');
    Object.keys(SKINS).forEach(key => {
        const skin = SKINS[key];
        const unlocked = isSkinUnlocked(key);
        console.log(`${unlocked ? '✅' : '🔒'} ${key} (${skin.name}) - Unlock Level: ${skin.unlockLevel}`);
    });
};

window.setLvl = function(lvlNum) {
    const level = parseInt(lvlNum);
    if (isNaN(level) || level < 1) {
        console.error('❌ [DEBUG] Invalid level! Please provide a number >= 1');
        return false;
    }
    
    if (!state.active) {
        console.error('❌ [DEBUG] Game must be active! Start a game first.');
        return false;
    }
    
    state.level = level;
    state.lastLevelScore = (level - 1) * 1000;
    state.score = state.lastLevelScore;
    DOM.levelEl.innerText = level;
    DOM.scoreEl.innerText = state.score;
    
    // Update game difficulty based on level
    state.speedMult = 1 + ((level - 1) * 0.2);
    state.spawnRate = Math.max(250, 1400 - ((level - 1) * 200));
    
    console.log(`✅ [DEBUG] Level set to ${level}`);
    console.log(`📊 [DEBUG] Score set to: ${state.score}`);
    console.log(`📊 [DEBUG] Speed multiplier: ${state.speedMult.toFixed(2)}`);
    console.log(`📊 [DEBUG] Spawn rate: ${state.spawnRate}ms`);
    
    // Save max level if higher
    saveMaxLevel(level);
    
    return true;
};


window.spawn = function(type) {
    if (!state.active) {
        console.error('❌ [DEBUG] Game must be active! Start a game first.');
        return false;
    }
    
    const validTypes = ['burger', 'asteroid', 'enemy', 'elite', 'orange', 'red'];
    const lowerType = type.toLowerCase();
    
    if (!validTypes.includes(lowerType)) {
        console.error(`❌ [DEBUG] Invalid type! Valid types: ${validTypes.join(', ')}`);
        return false;
    }
    
    const posX = Math.random() * (DOM.wrapper.clientWidth - 50);
    const el = document.createElement('div');
    
    if (lowerType === 'burger') {
        el.className = 'burger';
        el.style.left = posX + 'px'; 
        el.style.top = '-60px';
        el.innerHTML = `
            <div class="hp-bar-container"><div class="hp-bar-fill enemy-hp-fill"></div></div>
            <svg viewBox="0 0 100 100">
                <path d="M10 50 Q50 10 90 50 Z" fill="#e67e22"/>
                <rect x="10" y="50" width="80" height="10" fill="#6d4c41"/>
                <rect x="10" y="60" width="80" height="5" fill="#f1c40f"/>
                <path d="M10 65 L90 65 L80 85 L20 85 Z" fill="#e67e22"/>
            </svg>`;
        DOM.wrapper.appendChild(el);
        state.burgers.push({
            el: el, 
            hpFill: el.querySelector('.enemy-hp-fill'),
            y: -60, 
            hp: 4, 
            maxHP: 4, 
            speed: 1.2 * state.speedMult
        });
        console.log('🍔 [DEBUG] Spawned burger');
    } else if (lowerType === 'asteroid') {
        el.className = 'asteroid';
        el.style.left = posX + 'px'; 
        el.style.top = '-60px';
        el.innerHTML = `<svg viewBox="0 0 100 100" style="width:100%; height:100%;"><path d="M20 30 L40 10 L70 20 L90 50 L75 85 L30 90 L10 60 Z" fill="#333" stroke="#555" stroke-width="3"/><circle cx="40" cy="40" r="5" fill="#222"/><circle cx="60" cy="70" r="8" fill="#222"/></svg>`;
        DOM.wrapper.appendChild(el);
        state.asteroids.push({ 
            el: el, 
            y: -60, 
            speed: (Math.random() * 2.0 + 1.2) * state.speedMult, 
            rot: 0, 
            rotSpeed: Math.random() * 8 - 4 
        });
        console.log('🪨 [DEBUG] Spawned asteroid');
    } else {
        const isOrange = lowerType === 'elite' || lowerType === 'orange';
        const type = isOrange ? 'orange' : 'red';
        const maxHP = isOrange ? (Math.floor(Math.random() * 3) + 3) : (Math.floor(Math.random() * 3) + 1);
        const colorCode = isOrange ? '#ff9900' : '#ff0000';
        el.className = `enemy-ship ${type}`;
        el.style.left = posX + 'px'; 
        el.style.top = '-60px';
        el.innerHTML = `<div class="hp-bar-container"><div class="hp-bar-fill enemy-hp-fill"></div></div><svg viewBox="0 0 100 100" style="width:100%; height:100%;"><path d="M10 20 L50 90 L90 20 L50 40 Z" fill="${colorCode}" stroke="#fff" stroke-width="2"/></svg>`;
        DOM.wrapper.appendChild(el);
        state.enemies.push({ 
            el: el, 
            hpFill: el.querySelector('.enemy-hp-fill'),
            type: type, 
            y: -60, 
            hp: maxHP, 
            maxHP: maxHP,
            speed: (Math.random() * 0.8 + 0.6) * state.speedMult,
            lastShot: Date.now() + Math.random() * 500,
            fireRate: (isOrange ? 600 : 1000) / state.speedMult
        });
        console.log(`👾 [DEBUG] Spawned ${type} enemy`);
    }
    
    return true;
};

console.log('🛠️ [DEBUG] Debug commands available:');
console.log('  - debugUnlockSkin("skinName") - Unlock a specific skin');
console.log('  - debugUnlockAllSkins() - Unlock all skins');
console.log('  - debugListSkins() - Show all available skins');
console.log('  - setLvl(number) - Set current level (game must be active)');
console.log('  - spawn(type) - Spawn entity: "burger", "asteroid", "enemy", "elite"');
console.log('  - DebugUnlockEdu() - Remove the education lock on this device');

// ===== SETTINGS MENU =====

function showSettings() {
    console.log('⚙️ [SETTINGS] Opening settings...');
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('settings-container').style.display = 'block';
    document.getElementById('floating-settings-btn').style.display = 'none';
    updateSettingsDisplay();
    showSettingsTab(currentSettingsTab);
}

// ===== SETTINGS TABS =====
let currentSettingsTab = 'device';

function showSettingsTab(name) {
    currentSettingsTab = name;
    document.querySelectorAll('.settings-tab-pane').forEach(p => {
        p.style.display = (p.dataset.tab === name) ? 'block' : 'none';
    });
    document.querySelectorAll('.settings-tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === name);
    });
    if (name === 'lang') renderLangList();
}

function renderLangList() {
    const box = document.getElementById('lang-list');
    if (!box) return;
    box.innerHTML = LANGUAGES.map(lang => {
        const active = lang.code === currentLang;
        return `<button
            class="lang-card${active ? ' active' : ''}"
            onclick="pickLang('${lang.code}')"
            dir="${lang.dir}">
            <span class="lang-flag">${lang.flag}</span>
            <span class="lang-name">${lang.name}</span>
            ${active ? '<span class="lang-check">✓</span>' : ''}
        </button>`;
    }).join('');
}

function closeSettings() {
    console.log('⚙️ [SETTINGS] Closing settings...');
    document.getElementById('settings-container').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
    document.getElementById('floating-settings-btn').style.display = 'flex';
}

function updateSettingsDisplay() {
    // Update device mode buttons
    const isMobile = deviceMode.isMobile;

    document.getElementById('device-mobile').classList.toggle('active', isMobile);
    document.getElementById('device-desktop').classList.toggle('active', !isMobile);
    
    // Hide the entire controls tab on mobile (irrelevant on touch devices)
    const controlsTabBtn = document.querySelector('.settings-tab-btn[data-tab="controls"]');
    if (controlsTabBtn) {
        controlsTabBtn.style.display = isMobile ? 'none' : '';
        // If the controls tab is currently active while switching to mobile,
        // redirect to the device tab instead.
        if (isMobile && currentSettingsTab === 'controls') {
            showSettingsTab('device');
        }
    }
    
    // Update control type buttons
    document.getElementById('control-mouse').classList.toggle('active', keyBindings.controlType === 'mouse');
    document.getElementById('control-arrows').classList.toggle('active', keyBindings.controlType === 'arrows');
    
    // Update right-click buttons
    document.getElementById('rightclick-on').classList.toggle('active', keyBindings.rightClickAbility === true);
    document.getElementById('rightclick-off').classList.toggle('active', keyBindings.rightClickAbility === false);
    
    // Update game rules buttons
    document.getElementById('enemies-shoot-asteroids-yes').classList.toggle('active', gameRules.enemiesShootThroughAsteroids === true);
    document.getElementById('enemies-shoot-asteroids-no').classList.toggle('active', gameRules.enemiesShootThroughAsteroids === false);
    
    document.getElementById('player-shoot-asteroids-yes').classList.toggle('active', gameRules.playerShootThroughAsteroids === true);
    document.getElementById('player-shoot-asteroids-no').classList.toggle('active', gameRules.playerShootThroughAsteroids === false);
    
    // Update key displays
    document.getElementById('shoot-key-display').innerText = formatKeyName(keyBindings.shoot);
    document.getElementById('ability-key-display').innerText = formatKeyName(keyBindings.ability);

    updateEduSettingsDisplay();
}

// ===== EDUCATION MODE SETTINGS =====

function updateEduSettingsDisplay() {
    const locked = eduConfig.locked;

    // Enabled buttons
    document.getElementById('edu-on').classList.toggle('active', eduConfig.enabled);
    document.getElementById('edu-off').classList.toggle('active', !eduConfig.enabled);

    // Locked banner + remaining time until the 45-minute auto-unlock
    document.getElementById('edu-locked-banner').style.display = locked ? 'block' : 'none';
    const remainEl = document.getElementById('edu-lock-remaining');
    if (remainEl) {
        if (locked) {
            const ms = lockMsRemaining();
            const mins = Math.floor(ms / 60000);
            const secs = Math.floor((ms % 60000) / 1000);
            remainEl.textContent = currentLang === 'en'
                ? `⏳ Auto-opens in ${mins}:${String(secs).padStart(2, '0')} min`
                : `⏳ פתיחה אוטומטית בעוד ${mins}:${String(secs).padStart(2, '0')} דקות`;
        } else {
            remainEl.textContent = '';
        }
    }

    // Subject dropdown
    const subjectSel = document.getElementById('edu-subject-select');
    const subjects = getSubjects();
    subjectSel.innerHTML = '';
    subjects.forEach(s => {
        const o = document.createElement('option');
        o.value = s.key;
        o.textContent = s.name;
        if (s.key === eduConfig.subject) o.selected = true;
        subjectSel.appendChild(o);
    });
    subjectSel.disabled = locked;

    // Grade dropdown
    const gradeSel = document.getElementById('edu-grade-select');
    const grades = getGradesForSubject(eduConfig.subject);
    gradeSel.innerHTML = '';
    grades.forEach(g => {
        const o = document.createElement('option');
        o.value = g;
        o.textContent = gradeLabel(g);
        if (g === eduConfig.grade) o.selected = true;
        gradeSel.appendChild(o);
    });
    gradeSel.disabled = locked;

    // When locked, hide the lock/link creation controls (already pinned).
    document.getElementById('edu-lock-group').style.display = locked ? 'none' : 'block';
    document.getElementById('edu-link-group').style.display = locked ? 'none' : 'block';
    // Disabling the on/off toggle while locked (must unlock first to turn off)
    document.getElementById('edu-off').style.opacity = locked ? '0.4' : '1';
    document.getElementById('edu-off').style.pointerEvents = locked ? 'none' : 'auto';

    // Manager dashboard (only for the device that created the password).
    const mgr = document.getElementById('edu-manage-group');
    if (mgr) {
        const showMgr = eduConfig.managed && !!eduConfig.sessionId;
        mgr.style.display = showMgr ? 'block' : 'none';
        if (showMgr) startEduParticipantWatch();
        else stopEduParticipantWatch();
    }
}

// ===== EDUCATION MANAGER DASHBOARD =====
function startEduParticipantWatch() {
    if (eduParticipantWatchOn) return;
    eduParticipantWatchOn = true;
    listenParticipants(renderEduParticipants).then(unsub => { eduUnsubParticipants = unsub; });
}

function stopEduParticipantWatch() {
    if (eduUnsubParticipants) { eduUnsubParticipants(); eduUnsubParticipants = null; }
    eduParticipantWatchOn = false;
}
let eduParticipantWatchOn = false;

function renderEduParticipants(list) {
    const box = document.getElementById('edu-participants');
    if (!box) return;
    const me = list.filter(p => p.name); // any registered participant
    if (!me.length) {
        box.innerHTML = `<small style="opacity:0.7;">${t('noParticipants')}</small>`;
        return;
    }
    box.innerHTML = me.map(p => {
        const status = p.locked
            ? '<span style="color:#ffd700;">🔒 ' + (currentLang === 'en' ? 'Locked' : 'נעול') + '</span>'
            : '<span style="color:#39ff88;">🔓 ' + (currentLang === 'en' ? 'Open' : 'פתוח') + '</span>';
        const btn = p.locked
            ? `<button class="change-key-btn" onclick="eduUnlockOne('${p.id}')">${t('unlockOne')}</button>`
            : '';
        return `<div class="edu-participant-row">
            <span class="edu-participant-name">${escapeHtml(p.name || p.id)}</span>
            ${status}${btn}
        </div>`;
    }).join('');
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

function eduUnlockAll() {
    if (!confirm(t('unlockAllConfirm'))) return;
    unlockAllParticipants().then(ok => {
        alert(ok ? t('unlockAllOk') : t('unlockAllFail'));
    });
}

function eduUnlockOne(clientId) {
    unlockOneParticipant(clientId).then(ok => {
        if (!ok) alert(t('unlockOneFail'));
    });
}

function eduSetEnabled(on) {
    if (eduConfig.locked && !on) {
        showFloatingMessage(currentLang === 'en' ? '🔒 Unlock with password first' : '🔒 יש לבטל את הנעילה עם סיסמה תחילה', 20, 20, 'var(--danger)');
        return;
    }
    setEduEnabled(on);
    updateEduSettingsDisplay();
}

function eduSetSubject(value) {
    if (!setEduSubject(value)) return;
    updateEduSettingsDisplay();
}

function eduSetGrade(value) {
    if (!setEduGrade(value)) return;
    updateEduSettingsDisplay();
}

function eduLock() {
    const pw = document.getElementById('edu-lock-password').value.trim();
    if (!pw) { alert(t('enterPassword')); return; }
    lockEdu(pw);
    document.getElementById('edu-lock-password').value = '';
    // Start listening for a remote/timer unlock on this newly-locked device.
    if (eduUnsubUnlock) { eduUnsubUnlock(); eduUnsubUnlock = null; }
    listenForUnlock(() => {
        updateEduSettingsDisplay();
        showFloatingMessage(t('lockOpened'), 20, 20, 'var(--primary)');
    }).then(unsub => { eduUnsubUnlock = unsub; });
    updateEduSettingsDisplay();
    alert(t('lockSuccess'));
}

function eduUnlock() {
    const pw = document.getElementById('edu-unlock-password').value.trim();
    if (unlockEdu(pw)) {
        document.getElementById('edu-unlock-password').value = '';
        updateEduSettingsDisplay();
        alert(t('unlockSuccess'));
    } else {
        alert(t('unlockFail'));
    }
}

function eduCreateLink() {
    const pw = document.getElementById('edu-link-password').value.trim();
    const link = buildEduLink(eduConfig.subject, eduConfig.grade, pw);
    document.getElementById('edu-link-output').value = link;
    if (pw) {
        // Become the manager of this session so we can unlock everyone / watch
        // who is connected. The students who open the link are locked.
        becomeManager(pw);
    } else {
        alert(t('noLinkPassword'));
    }
    updateEduSettingsDisplay();
}

function eduCopyLink() {
    const out = document.getElementById('edu-link-output');
    if (!out.value) { alert(t('createLinkFirst')); return; }
    out.select();
    navigator.clipboard?.writeText(out.value).then(
        () => alert(t('linkCopied')),
        () => { document.execCommand('copy'); alert(t('linkCopied')); }
    );
}

function formatKeyName(code) {
    if (code === 'Space') return 'Space';
    if (code.startsWith('Key')) return code.replace('Key', '');
    if (code.startsWith('Digit')) return code.replace('Digit', '');
    if (code.startsWith('Arrow')) return code.replace('Arrow', '') + ' Arrow';
    return code;
}

function setControl(type) {
    console.log(`⚙️ [SETTINGS] Control type set to: ${type}`);
    setKeyBinding('controlType', type);
    updateSettingsDisplay();
}

function setRightClick(enabled) {
    console.log(`⚙️ [SETTINGS] Right-click ability: ${enabled}`);
    setKeyBinding('rightClickAbility', enabled);
    updateSettingsDisplay();
}

function setGameRuleFunc(rule, value) {
    console.log(`📜 [SETTINGS] Game rule ${rule} set to: ${value}`);
    setGameRule(rule, value);
    updateSettingsDisplay();
}

function setDevice(mode) {
    console.log(`📱 [SETTINGS] Device mode set to: ${mode}`);
    if (mode === 'mobile') {
        setDeviceMode(true, true);
    } else if (mode === 'desktop') {
        setDeviceMode(false, true);
    }
    updateSettingsDisplay();
}

let listeningForKey = null;

function changeKey(action) {
    if (listeningForKey) return;
    
    listeningForKey = action;
    const btn = event.target;
    btn.classList.add('listening');
    btn.innerText = t('listenKey');
    
    console.log(`⚙️ [SETTINGS] Listening for key for: ${action}`);
    
    const keyListener = (e) => {
        e.preventDefault();
        
        // Don't allow certain keys
        if (['Escape', 'F5', 'F11', 'F12'].includes(e.code)) {
            console.log('⚠️ [SETTINGS] Invalid key');
            return;
        }
        
        console.log(`⚙️ [SETTINGS] Key captured: ${e.code}`);
        setKeyBinding(action, e.code);
        updateSettingsDisplay();
        
        btn.classList.remove('listening');
        btn.innerText = t('changeKey');
        
        window.removeEventListener('keydown', keyListener);
        listeningForKey = null;
    };
    
    window.addEventListener('keydown', keyListener);
}

// ===== DEVELOPER CONSOLE =====

function appendDevLine(output, text, className) {
    const line = document.createElement('div');
    if (className) line.className = className;
    line.textContent = text;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
    return line;
}

function formatDevValue(value) {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'object') {
        try { return JSON.stringify(value); } catch (e) { return String(value); }
    }
    return String(value);
}

async function runDevConsole() {
    const input = document.getElementById('dev-console-input');
    const output = document.getElementById('dev-console-output');
    if (!input || !output) return;

    const code = input.value.trim();
    if (!code) {
        appendDevLine(output, currentLang === 'en' ? '⚠️ No code to run' : '⚠️ אין קוד להרצה', 'dev-err');
        return;
    }

    // Echo the command (just like the browser console)
    appendDevLine(output, `> ${code}`, null).style.opacity = '0.6';

    // Capture console.log/warn/error output so commands that only log
    // (like the debug commands) actually show their feedback here.
    const original = {
        log: console.log,
        warn: console.warn,
        error: console.error
    };
    const capture = (cls) => (...args) => {
        const text = args.map(a => (typeof a === 'object' ? formatDevValue(a) : String(a))).join(' ');
        appendDevLine(output, text, cls);
    };
    console.log = (...args) => { original.log(...args); capture('dev-log')(...args); };
    console.warn = (...args) => { original.warn(...args); capture('dev-warn')(...args); };
    console.error = (...args) => { original.error(...args); capture('dev-err')(...args); };

    try {
        // Run in global scope so window.* debug commands are available
        let result = (0, eval)(code);

        // Await promises (several debug commands are async)
        if (result && typeof result.then === 'function') {
            result = await result;
        }

        appendDevLine(output, formatDevValue(result), 'dev-ok');
    } catch (err) {
        const name = (err && err.name) || 'Error';
        const message = (err && err.message) || String(err);
        appendDevLine(output, `❌ ${name}: ${message}`, 'dev-err');
        original.error('💻 [DEV CONSOLE] Error:', err);
    } finally {
        // Always restore the real console
        console.log = original.log;
        console.warn = original.warn;
        console.error = original.error;
    }

    output.scrollTop = output.scrollHeight;
}

function clearDevConsole() {
    const output = document.getElementById('dev-console-output');
    if (output) output.innerHTML = '';
}

// Export to window
window.runDevConsole = runDevConsole;
window.clearDevConsole = clearDevConsole;
window.showSettings = showSettings;
window.closeSettings = closeSettings;
window.setControl = setControl;
window.setRightClick = setRightClick;
window.setGameRule = setGameRuleFunc;
window.setDevice = setDevice;
window.changeKey = changeKey;
window.eduSetEnabled = eduSetEnabled;
window.eduSetSubject = eduSetSubject;
window.eduSetGrade = eduSetGrade;
window.eduLock = eduLock;
window.eduUnlock = eduUnlock;
window.eduCreateLink = eduCreateLink;
window.eduCopyLink = eduCopyLink;
window.eduUnlockAll = eduUnlockAll;
window.eduUnlockOne = eduUnlockOne;
window.showSettingsTab = showSettingsTab;

// Debug: open the education lock on this device immediately (ignores password,
// timer and remote state). Also reports the new "open" status to the session.
window.DebugUnlockEdu = function () {
    forceUnlockLocal();
    if (document.getElementById('settings-container')?.style.display !== 'none') {
        updateEduSettingsDisplay();
    }
    console.log('🔓 [DEBUG] Education lock removed on this device.');
    return true;
};
