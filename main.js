import { DOM, SKINS, state, resetState, setCurrentSkin, currentSkinKey, loadUnlockedSkins, isSkinUnlocked, unlockSkin, saveMaxLevel, getMaxLevel, getLeaderboard, saveScore } from './data.js';
import { updatePlayerPos, movePlayer, updateHPUI, shoot, showFloatingMessage, useVortexLaser } from './systems.js';
import { handleSpawning } from './systems.js';
import { updateBullets, updateEnemyBullets, updateBurgers, updateIngredients, updateAsteroids, updateEnemies } from './updates.js';
import { initLootLocker, submitScore, getTopScores } from './lootlocker-manager.js';

// Initialize LootLocker when page loads
console.log('🚀 [INIT] Initializing LootLocker...');
initLootLocker().then(success => {
    if (success) {
        console.log('✅ [INIT] LootLocker ready!');
    } else {
        console.warn('⚠️ [INIT] LootLocker init failed, continuing without online features');
    }
});

// ===== INITIALIZATION =====

console.log('🚀 [INIT] Game loading...');
loadUnlockedSkins();
updateSkinOptions();
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
    console.log('✅ [LEADERBOARD] Leaderboard closed');
}

function displayLeaderboard(category) {
    console.log(`📊 [DISPLAY] Displaying leaderboard for category: ${category}`);
    const leaderboard = getLeaderboard(category);
    console.log(`📊 [DISPLAY] Retrieved ${leaderboard.length} entries`);
    const content = document.getElementById('leaderboard-content');
    
    if (!content) {
        console.error('❌ [DISPLAY] ERROR: leaderboard-content element not found!');
        return;
    }
    
    if (leaderboard.length === 0) {
        console.log('⚠️ [DISPLAY] No entries found, showing empty message');
        content.innerHTML = '<div class="lb-empty">אין עדיין שיאים 🎯<br>שחק כדי להגיע ללוח!</div>';
        return;
    }
    
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    console.log('📊 [DISPLAY] Generating HTML for entries...');
    const html = leaderboard.map((entry, index) => {
        console.log(`📊 [DISPLAY] Entry ${index + 1}:`, entry);
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
    console.log('🎮 [GAME] ==================== GAME STARTING ====================');
    resetState();
    
    // Apply skin stats
    const skin = SKINS[currentSkinKey];
    console.log(`🎨 [GAME] Using skin: ${skin.name}`);
    state.currentSkinStats = {
        fireRate: skin.fireRate,
        bulletSpeed: skin.bulletSpeed,
        bulletDamage: skin.bulletDamage
    };
    console.log(`📊 [GAME] Skin stats:`, state.currentSkinStats);
    console.log(`❤️ [GAME] HP: ${state.playerHP}/${state.playerMaxHP}`);
    
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
    } else {
        abilityBtn.style.display = 'none';
    }
    
    console.log('🧹 [GAME] Cleaning up old game elements...');
    const elementsToRemove = document.querySelectorAll('.enemy-ship, .asteroid, .bullet, .enemy-bullet, .particle, .floating-msg, .burger, .ingredient, .laser-beam');
    console.log(`🧹 [GAME] Removing ${elementsToRemove.length} old elements`);
    elementsToRemove.forEach(e => e.remove());
    
    updateSkinOptions();
    updatePlayerPos();
    console.log('✅ [GAME] Game initialized successfully, starting update loop');
    requestAnimationFrame(update);
}

// Export to window for HTML onclick
window.initGame = initGame;
console.log('✅ [EXPORT] initGame exported:', typeof window.initGame);

// ===== LEVEL UP SYSTEM =====

function handleLevelUp() {
    if (state.score >= state.lastLevelScore + 1000) {
        console.log(`⬆️ [LEVEL UP] Player leveled up! Score: ${state.score}`);
        state.lastLevelScore = Math.floor(state.score / 1000) * 1000;
        state.level++;
        console.log(`⬆️ [LEVEL UP] New level: ${state.level}`);
        DOM.levelEl.innerText = state.level;
        state.speedMult += 0.2;
        state.spawnRate = Math.max(250, state.spawnRate - 200);
        state.playerHP = state.playerMaxHP;
        updateHPUI();
        
        // Save max level
        saveMaxLevel(state.level);
        
        // Check for skin unlocks
        console.log(`🔍 [LEVEL UP] Checking for skin unlocks at level ${state.level}...`);
        let unlocked = false;
        Object.keys(SKINS).forEach(skinKey => {
            const skin = SKINS[skinKey];
            if (skin.unlockLevel === state.level && !isSkinUnlocked(skinKey)) {
                console.log(`🎉 [LEVEL UP] Unlocking skin: ${skinKey}`);
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

function update() {
    if(!state.active) return;
    const now = Date.now();
    
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
    if (currentSkinKey !== 'vortex') return;
    
    const abilityBtn = document.getElementById('special-ability-btn');
    if (!abilityBtn) return;
    
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
}

function activateSpecialAbility() {
    if (!state.active) return;
    if (currentSkinKey !== 'vortex') return;
    if (!state.specialAbility.ready) {
        console.log('⏳ [ABILITY] Ability on cooldown');
        return;
    }
    
    console.log('💫 [ABILITY] Activating special ability!');
    useVortexLaser();
    
    state.specialAbility.ready = false;
    state.specialAbility.lastUsed = Date.now();
    
    const abilityBtn = document.getElementById('special-ability-btn');
    abilityBtn.classList.add('cooldown');
}

// ===== EVENT LISTENERS =====

window.addEventListener('mousemove', (e) => {
    if(!state.active) return;
    movePlayer(e.clientX);
});

window.addEventListener('touchmove', (e) => {
    if(!state.active) return;
    e.preventDefault();
    movePlayer(e.touches[0].clientX);
    shoot();
}, { passive: false });

window.addEventListener('touchstart', (e) => {
    if(!state.active) return;
    movePlayer(e.touches[0].clientX);
    shoot();
}, { passive: false });

window.addEventListener('mousedown', shoot);
window.addEventListener('keydown', (e) => {
    if(e.code === 'Space') shoot();
    if(e.code === 'KeyB') activateSpecialAbility();
});

// Special ability button click
document.getElementById('special-ability-btn').addEventListener('click', activateSpecialAbility);

// Prevent context menu on right click, use it for special ability instead
window.addEventListener('contextmenu', (e) => {
    if (state.active) {
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

// ===== GLOBAL LEADERBOARD FUNCTIONS =====

async function showGlobalLeaderboard() {
    console.log('🌍 [GLOBAL LB] Opening global leaderboard...');
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('global-leaderboard-container').style.display = 'block';
    
    // Show loading
    const content = document.getElementById('global-leaderboard-content');
    content.innerHTML = '<div class="lb-loading">טוען נתונים...</div>';
    
    // Fetch top scores
    const scores = await getTopScores(10);
    displayGlobalLeaderboard(scores);
}

function closeGlobalLeaderboard() {
    console.log('❌ [GLOBAL LB] Closing global leaderboard...');
    document.getElementById('global-leaderboard-container').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
}

function displayGlobalLeaderboard(scores) {
    const content = document.getElementById('global-leaderboard-content');
    
    if (!scores || scores.length === 0) {
        content.innerHTML = '<div class="lb-empty">אין עדיין שיאים עולמיים 🌍<br>היה הראשון!</div>';
        return;
    }
    
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    
    const html = scores.map((entry, index) => {
        const metadata = entry.metadata ? JSON.parse(entry.metadata) : {};
        const playerName = entry.player?.name || `Player ${entry.player?.id || '?'}`;
        const skinName = metadata.skin || 'Unknown';
        const level = metadata.level || '?';
        
        return `
        <div class="lb-entry rank-${index + 1}">
            <div class="lb-rank">${medals[index] || (index + 1)}</div>
            <div class="lb-info">
                <div class="lb-player-name">${playerName}</div>
                <div class="lb-score">${entry.score.toLocaleString()} נקודות</div>
                <div class="lb-details">
                    שלב ${level} • ${skinName}
                </div>
            </div>
        </div>
        `;
    }).join('');
    
    content.innerHTML = html;
}

// Export functions to window
window.showGlobalLeaderboard = showGlobalLeaderboard;
window.closeGlobalLeaderboard = closeGlobalLeaderboard;