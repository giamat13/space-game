import { DOM, SKINS, state, resetState, setCurrentSkin, currentSkinKey, loadUnlockedSkins, isSkinUnlocked, unlockSkin, saveMaxLevel, getMaxLevel, getLeaderboard, saveScore } from './data.js';
import { updatePlayerPos, movePlayer, updateHPUI, shoot, showFloatingMessage, useVortexLaser, usePhoenixFeathers, useJokerChaos, infectEnemy } from './systems.js';
import { handleSpawning } from './systems.js';
import { updateBullets, updateEnemyBullets, updateBurgers, updateIngredients, updateAsteroids, updateEnemies } from './updates.js';

// ===== INITIALIZATION =====

loadUnlockedSkins();
updateSkinOptions();

// ===== LEADERBOARD =====

function showLeaderboard() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('leaderboard-container').style.display = 'block';
    displayLeaderboard('overall');
    
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
    document.getElementById('leaderboard-container').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
}

function displayLeaderboard(category) {
    const leaderboard = getLeaderboard(category);
    const content = document.getElementById('leaderboard-content');
    
    if (!content) return;
    
    if (leaderboard.length === 0) {
        content.innerHTML = '<div class="lb-empty">אין עדיין שיאים 🎯<br>שחק כדי להגיע ללוח!</div>';
        return;
    }
    
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    const html = leaderboard.map((entry, index) => {
        return `
        <div class="lb-entry rank-${index + 1}">
            <div class="lb-rank">${medals[index]}</div>
            <div class="lb-info">
                <div class="lb-score">${entry.score.toLocaleString()} נקודות</div>
                <div class="lb-details">
                    שלב ${entry.level} ${entry.skin ? `• ${SKINS[entry.skin].name}` : ''} • ${entry.date}
                </div>
            </div>
        </div>
    `;
    }).join('');
    
    content.innerHTML = html;
}

window.showLeaderboard = showLeaderboard;
window.closeLeaderboard = closeLeaderboard;

// ===== SKIN SELECTION =====

function updateSkinOptions() {
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
    if (!isSkinUnlocked(key)) return;
    setCurrentSkin(key);
    document.querySelectorAll('.skin-option').forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
}

window.selectSkin = selectSkin;

// ===== GAME INITIALIZATION =====

function initGame() {
    resetState();
    
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

window.initGame = initGame;

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
    }
}

// ===== MAIN UPDATE LOOP =====

let lastUpdate = Date.now();

function update() {
    if(!state.active) return;
    const now = Date.now();
    const deltaTime = now - lastUpdate;
    lastUpdate = now;
    
    // Limit updates to 60 FPS max
    if (deltaTime < 16) {
        requestAnimationFrame(update);
        return;
    }
    
    handleLevelUp();
    handleSpawning(now);
    updateAbilityCooldown(now);
    
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
    
    if (state.jokerAbility.chaosMode && now >= state.jokerAbility.chaosModeEnd) {
        state.jokerAbility.chaosMode = false;
        state.jokerAbility.infectionActive = false;
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

window.addEventListener('mousemove', (e) => {
    if(!state.active) return;
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

window.addEventListener('mousedown', shoot);
window.addEventListener('keydown', (e) => {
    if(e.code === 'Space') shoot();
    if(e.code === 'KeyB') activateSpecialAbility();
});

document.getElementById('special-ability-btn').addEventListener('click', activateSpecialAbility);

window.addEventListener('contextmenu', (e) => {
    if (state.active) {
        e.preventDefault();
        activateSpecialAbility();
    }
});

// ===== INITIALIZATION =====

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

// ===== DEBUG COMMANDS =====

window.setlvl = function(lvl) {
    const level = parseInt(lvl);
    if (isNaN(level) || level < 1) {
        console.error('Invalid level! Use: setlvl(5)');
        return;
    }
    
    if (!state.active) {
        console.error('Start a game first!');
        return;
    }
    
    state.level = level;
    state.lastLevelScore = (level - 1) * 1000;
    state.score = state.lastLevelScore;
    DOM.levelEl.innerText = level;
    DOM.scoreEl.innerText = state.score;
    saveMaxLevel(level);
    
    console.log(`✅ Level set to ${level}!`);
    
    // Check for unlocks
    Object.keys(SKINS).forEach(skinKey => {
        const skin = SKINS[skinKey];
        if (skin.unlockLevel <= level && !isSkinUnlocked(skinKey)) {
            unlockSkin(skinKey);
            console.log(`🎉 Unlocked: ${skin.name}`);
        }
    });
    
    updateSkinOptions();
};

window.debugUnlockSkin = function(skinKey) {
    if (!SKINS[skinKey]) {
        console.error(`Skin "${skinKey}" does not exist!`);
        console.log('Available skins:', Object.keys(SKINS).join(', '));
        return false;
    }
    
    const result = unlockSkin(skinKey);
    if (result) {
        console.log(`🎉 Successfully unlocked skin: ${skinKey}`);
        updateSkinOptions();
        return true;
    } else {
        console.log(`Skin ${skinKey} was already unlocked`);
        return false;
    }
};

window.debugUnlockAllSkins = function() {
    let count = 0;
    Object.keys(SKINS).forEach(skinKey => {
        const result = unlockSkin(skinKey);
        if (result) count++;
    });
    updateSkinOptions();
    console.log(`✅ Unlocked ${count} new skins!`);
    console.log('All unlocked skins:', Object.keys(SKINS).join(', '));
};

window.debugListSkins = function() {
    console.log('=== AVAILABLE SKINS ===');
    Object.keys(SKINS).forEach(key => {
        const skin = SKINS[key];
        const unlocked = isSkinUnlocked(key);
        console.log(`${unlocked ? '✅' : '🔒'} ${key} (${skin.name}) - Unlock Level: ${skin.unlockLevel}`);
    });
};

console.log('🛠️ Debug commands:');
console.log('  - setlvl(5) - Set level to 5');
console.log('  - debugUnlockSkin("skinName") - Unlock a specific skin');
console.log('  - debugUnlockAllSkins() - Unlock all skins');
console.log('  - debugListSkins() - Show all available skins');