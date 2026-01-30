import { DOM, SKINS, state, resetState, setCurrentSkin, currentSkinKey, loadUnlockedSkins, isSkinUnlocked, unlockSkin, saveMaxLevel, getMaxLevel, getLeaderboard, saveScore, keyBindings, loadKeyBindings, setKeyBinding } from './data.js';
import { updatePlayerPos, movePlayer, updateHPUI, shoot, showFloatingMessage, useVortexLaser, usePhoenixFeathers, useJokerChaos } from './systems.js';
import { handleSpawning } from './systems.js';
import { updateBullets, updateEnemyBullets, updateBurgers, updateIngredients, updateAsteroids, updateEnemies } from './updates.js';
import { initFirebase, submitGlobalScore, getGlobalLeaderboard, subscribeToLeaderboard, isFirebaseEnabled } from './firebase-config.js';

// ===== INITIALIZATION =====

console.log('🚀 [INIT] Game loading...');
loadUnlockedSkins();
loadKeyBindings();

// Initialize Firebase
console.log('🔥 [INIT] Initializing Firebase...');
const firebaseReady = initFirebase();
if (firebaseReady) {
    console.log('✅ [INIT] Firebase ready - Global leaderboard enabled!');
} else {
    console.log('⚠️ [INIT] Firebase not configured - Using local leaderboard only');
}

updateSkinOptions();
console.log('✅ [INIT] Game loaded successfully');

// ===== LEADERBOARD =====

function showLeaderboard() {
    console.log('🏆 [LEADERBOARD] Opening leaderboard...');
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('leaderboard-container').style.display = 'block';
    displayLeaderboard('overall');
    
    // Setup tab listeners
    const tabs = document.querySelectorAll('.lb-tab');
    tabs.forEach(tab => {
        tab.onclick = function() {
            document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            displayLeaderboard(this.dataset.tab);
        };
    });
}

function closeLeaderboard() {
    console.log('❌ [LEADERBOARD] Closing leaderboard...');
    document.getElementById('leaderboard-container').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
}

async function displayLeaderboard(category) {
    console.log(`📊 [DISPLAY] Displaying leaderboard for category: ${category}`);
    const content = document.getElementById('leaderboard-content');
    
    if (!content) {
        console.error('❌ [DISPLAY] ERROR: leaderboard-content element not found!');
        return;
    }
    
    // Show loading message
    content.innerHTML = '<div class="lb-empty">⏳ טוען...</div>';
    
    let leaderboard = [];
    let isGlobal = false;
    
    // Get leaderboard based on category
    if (category === 'global') {
        isGlobal = true;
        if (isFirebaseEnabled()) {
            leaderboard = await getGlobalLeaderboard('all');
        } else {
            content.innerHTML = '<div class="lb-empty">🌐 לוח שיאים עולמי לא זמין<br>יש להגדיר Firebase</div>';
            return;
        }
    } else {
        // Get local leaderboard
        leaderboard = getLeaderboard(category);
    }
    
    if (leaderboard.length === 0) {
        content.innerHTML = '<div class="lb-empty">אין עדיין שיאים 🎯<br>שחק כדי להגיע ללוח!</div>';
        return;
    }
    
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    
    const html = leaderboard.slice(0, 10).map((entry, index) => `
        <div class="lb-entry rank-${index + 1}">
            <div class="lb-rank">${medals[index] || (index + 1)}</div>
            <div class="lb-info">
                ${isGlobal && entry.playerName ? `<div class="lb-player">${entry.playerName}</div>` : ''}
                <div class="lb-score">${entry.score.toLocaleString()} נקודות</div>
                <div class="lb-details">
                    שלב ${entry.level} ${entry.skin ? `• ${SKINS[entry.skin]?.name || entry.skin}` : ''} • ${entry.date}
                </div>
            </div>
        </div>
    `).join('');
    
    content.innerHTML = html;
    console.log(`✅ [DISPLAY] Displayed ${Math.min(10, leaderboard.length)} entries`);
}

// ===== SKIN SELECTION =====

function updateSkinOptions() {
    console.log('🎨 [SKINS] Updating skin options...');
    const options = document.querySelectorAll('.skin-option');
    
    options.forEach(option => {
        const skinKey = option.dataset.skin;
        const unlockLevel = parseInt(option.dataset.unlockLevel) || 0;
        const maxLevel = getMaxLevel();
        
        if (unlockLevel > 0 && maxLevel >= unlockLevel && !isSkinUnlocked(skinKey)) {
            unlockSkin(skinKey);
            option.classList.add('newly-unlocked');
            setTimeout(() => option.classList.remove('newly-unlocked'), 1000);
        }
        
        if (isSkinUnlocked(skinKey)) {
            option.classList.remove('locked');
            option.onclick = () => selectSkin(skinKey, option);
        } else {
            option.classList.add('locked');
            option.onclick = null;
        }
    });
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
}

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
    DOM.overlay.style.display = 'none';
    
    // Show/hide special ability button based on skin
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
    } else {
        abilityBtn.style.display = 'none';
    }
    
    const elementsToRemove = document.querySelectorAll('.enemy-ship, .asteroid, .bullet, .enemy-bullet, .particle, .floating-msg, .burger, .ingredient, .laser-beam');
    elementsToRemove.forEach(e => e.remove());
    
    updateSkinOptions();
    updatePlayerPos();
    requestAnimationFrame(update);
}

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
        
        if (unlocked) updateSkinOptions();
        
        showFloatingMessage("LEVEL UP! HP REFILL", DOM.wrapper.clientWidth/2 - 70, DOM.wrapper.clientHeight/2, "var(--primary)");
    }
}

// ===== MAIN UPDATE LOOP =====

function update() {
    if(!state.active) return;
    const now = Date.now();
    
    handleLevelUp();
    handleSpawning(now);
    updateAbilityCooldown(now);
    updateArrowMovement();
    
    updateBurgers();
    updateIngredients();
    updateBullets();
    updateEnemyBullets();
    updateAsteroids();
    updateEnemies(now);
    
    requestAnimationFrame(update);
}

// ===== SPECIAL ABILITY SYSTEM =====

function updateAbilityCooldown(now) {
    const abilityBtn = document.getElementById('special-ability-btn');
    if (!abilityBtn) return;
    
    if (state.jokerAbility.active && now >= state.jokerAbility.endTime) {
        state.jokerAbility.active = false;
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
    }
}

// ===== EVENT LISTENERS =====

// Mouse/Arrow control
window.addEventListener('mousemove', (e) => {
    if(!state.active || keyBindings.controlType !== 'mouse') return;
    movePlayer(e.clientX);
    
    const rect = DOM.wrapper.getBoundingClientRect();
    state.lastMouseX = e.clientX - rect.left;
    state.lastMouseY = e.clientY - rect.top;
});

window.addEventListener('touchmove', (e) => {
    if(!state.active) return;
    e.preventDefault();
    movePlayer(e.touches[0].clientX);
    shoot();
    
    const rect = DOM.wrapper.getBoundingClientRect();
    state.lastMouseX = e.touches[0].clientX - rect.left;
    state.lastMouseY = e.touches[0].clientY - rect.top;
}, { passive: false });

window.addEventListener('touchstart', (e) => {
    if(!state.active) return;
    movePlayer(e.touches[0].clientX);
    shoot();
    
    const rect = DOM.wrapper.getBoundingClientRect();
    state.lastMouseX = e.touches[0].clientX - rect.left;
    state.lastMouseY = e.touches[0].clientY - rect.top;
}, { passive: false });

// Arrow key controls
let arrowKeysPressed = { left: false, right: false, up: false, down: false, shoot: false };
let mousePressed = false;

window.addEventListener('keydown', (e) => {
    if (state.active && e.code === keyBindings.shoot) {
        arrowKeysPressed.shoot = true;
        shoot();
    }
    
    if (state.active && e.code === keyBindings.ability) {
        activateSpecialAbility();
    }
    
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
    if (e.code === keyBindings.shoot) {
        arrowKeysPressed.shoot = false;
    }
    
    if (keyBindings.controlType !== 'arrows') return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') arrowKeysPressed.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') arrowKeysPressed.right = false;
});

function updateArrowMovement() {
    if (!state.active) return;
    
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
    
    if (arrowKeysPressed.shoot) {
        shoot();
    }
    
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

// Prevent context menu on right click
window.addEventListener('contextmenu', (e) => {
    if (state.active && keyBindings.rightClickAbility) {
        e.preventDefault();
        activateSpecialAbility();
    }
});

// ===== SETTINGS MENU =====

function showSettings() {
    console.log('⚙️ [SETTINGS] Opening settings...');
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('settings-container').style.display = 'block';
    updateSettingsDisplay();
}

function closeSettings() {
    console.log('⚙️ [SETTINGS] Closing settings...');
    document.getElementById('settings-container').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
}

function updateSettingsDisplay() {
    document.getElementById('control-mouse').classList.toggle('active', keyBindings.controlType === 'mouse');
    document.getElementById('control-arrows').classList.toggle('active', keyBindings.controlType === 'arrows');
    document.getElementById('rightclick-on').classList.toggle('active', keyBindings.rightClickAbility === true);
    document.getElementById('rightclick-off').classList.toggle('active', keyBindings.rightClickAbility === false);
    document.getElementById('shoot-key-display').innerText = formatKeyName(keyBindings.shoot);
    document.getElementById('ability-key-display').innerText = formatKeyName(keyBindings.ability);
}

function formatKeyName(code) {
    if (code === 'Space') return 'Space';
    if (code.startsWith('Key')) return code.replace('Key', '');
    if (code.startsWith('Digit')) return code.replace('Digit', '');
    if (code.startsWith('Arrow')) return code.replace('Arrow', '') + ' Arrow';
    return code;
}

function setControl(type) {
    setKeyBinding('controlType', type);
    updateSettingsDisplay();
}

function setRightClick(enabled) {
    setKeyBinding('rightClickAbility', enabled);
    updateSettingsDisplay();
}

let listeningForKey = null;

function changeKey(action) {
    if (listeningForKey) return;
    
    listeningForKey = action;
    const btn = event.target;
    btn.classList.add('listening');
    btn.innerText = '...לחץ על מקש';
    
    const keyListener = (e) => {
        e.preventDefault();
        
        if (['Escape', 'F5', 'F11', 'F12'].includes(e.code)) {
            console.log('⚠️ [SETTINGS] Invalid key');
            return;
        }
        
        setKeyBinding(action, e.code);
        updateSettingsDisplay();
        
        btn.classList.remove('listening');
        btn.innerText = 'שנה מקש';
        
        window.removeEventListener('keydown', keyListener);
        listeningForKey = null;
    };
    
    window.addEventListener('keydown', keyListener);
}

// ===== INITIALIZATION =====

// Generate stars
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

DOM.playerSpriteContainer.innerHTML = SKINS.classic.svg;

// Setup button event listeners
document.getElementById('show-leaderboard-btn').addEventListener('click', showLeaderboard);
document.getElementById('close-leaderboard-btn').addEventListener('click', closeLeaderboard);
document.getElementById('start-game-btn').addEventListener('click', initGame);
document.getElementById('show-settings-btn').addEventListener('click', showSettings);
document.getElementById('close-settings-btn').addEventListener('click', closeSettings);
document.getElementById('control-mouse').addEventListener('click', () => setControl('mouse'));
document.getElementById('control-arrows').addEventListener('click', () => setControl('arrows'));
document.getElementById('rightclick-on').addEventListener('click', () => setRightClick(true));
document.getElementById('rightclick-off').addEventListener('click', () => setRightClick(false));
document.getElementById('change-shoot-key').addEventListener('click', () => changeKey('shoot'));
document.getElementById('change-ability-key').addEventListener('click', () => changeKey('ability'));

console.log('✅ [INIT] All systems ready!');

// ===== DEBUG COMMANDS =====

window.debugUnlockSkin = function(skinKey) {
    if (!SKINS[skinKey]) {
        console.error(`❌ [DEBUG] Skin "${skinKey}" does not exist!`);
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
        if (unlockSkin(skinKey)) count++;
    });
    updateSkinOptions();
    console.log(`✅ [DEBUG] Unlocked ${count} new skins!`);
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
        console.error('❌ [DEBUG] Invalid level!');
        return false;
    }
    
    if (!state.active) {
        console.error('❌ [DEBUG] Game must be active!');
        return false;
    }
    
    state.level = level;
    state.lastLevelScore = (level - 1) * 1000;
    state.score = state.lastLevelScore;
    DOM.levelEl.innerText = level;
    DOM.scoreEl.innerText = state.score;
    state.speedMult = 1 + ((level - 1) * 0.2);
    state.spawnRate = Math.max(250, 1400 - ((level - 1) * 200));
    
    saveMaxLevel(level);
    console.log(`✅ [DEBUG] Level set to ${level}`);
    return true;
};

window.spawn = function(type) {
    if (!state.active) {
        console.error('❌ [DEBUG] Game must be active!');
        return false;
    }
    
    const validTypes = ['burger', 'asteroid', 'enemy', 'elite', 'orange', 'red'];
    const lowerType = type.toLowerCase();
    
    if (!validTypes.includes(lowerType)) {
        console.error(`❌ [DEBUG] Invalid type! Valid: ${validTypes.join(', ')}`);
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
