import { DOM, SKINS, state, resetState, setCurrentSkin, currentSkinKey, loadUnlockedSkins, isSkinUnlocked, unlockSkin, saveMaxLevel, getMaxLevel, getLeaderboard, saveScore } from './data.js';
import { updatePlayerPos, movePlayer, updateHPUI, shoot, showFloatingMessage } from './systems.js';
import { handleSpawning } from './systems.js';
import { updateBullets, updateEnemyBullets, updateBurgers, updateIngredients, updateAsteroids, updateEnemies } from './updates.js';

// ===== INITIALIZATION =====

loadUnlockedSkins();
updateSkinOptions();

// ===== LEADERBOARD =====

function showLeaderboard() {
    console.log('🏆 Opening leaderboard...');
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('leaderboard-container').style.display = 'block';
    displayLeaderboard('overall');
    
    // Setup tab listeners
    document.querySelectorAll('.lb-tab').forEach(tab => {
        tab.onclick = function() {
            document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            displayLeaderboard(this.dataset.tab);
        };
    });
}

function closeLeaderboard() {
    console.log('❌ Closing leaderboard...');
    document.getElementById('leaderboard-container').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
}

function displayLeaderboard(category) {
    console.log(`📊 Displaying leaderboard for: ${category}`);
    const leaderboard = getLeaderboard(category);
    console.log(`Found ${leaderboard.length} entries:`, leaderboard);
    const content = document.getElementById('leaderboard-content');
    
    if (leaderboard.length === 0) {
        content.innerHTML = '<div class="lb-empty">אין עדיין שיאים 🎯<br>שחק כדי להגיע ללוח!</div>';
        return;
    }
    
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    content.innerHTML = leaderboard.map((entry, index) => `
        <div class="lb-entry rank-${index + 1}">
            <div class="lb-rank">${medals[index]}</div>
            <div class="lb-info">
                <div class="lb-score">${entry.score.toLocaleString()} נקודות</div>
                <div class="lb-details">
                    שלב ${entry.level} ${entry.skin ? `• ${SKINS[entry.skin].name}` : ''} • ${entry.date}
                </div>
            </div>
        </div>
    `).join('');
}

// Export to window for HTML onclick
window.showLeaderboard = showLeaderboard;
window.closeLeaderboard = closeLeaderboard;

// ===== SKIN SELECTION =====

function updateSkinOptions() {
    document.querySelectorAll('.skin-option').forEach(option => {
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
    if (!isSkinUnlocked(key)) {
        console.log(`🔒 Skin ${key} is locked!`);
        return;
    }
    setCurrentSkin(key);
    document.querySelectorAll('.skin-option').forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
    console.log(`✨ Skin changed to: ${key}`);
}

// Export to window for HTML onclick
window.selectSkin = selectSkin;

// ===== GAME INITIALIZATION =====

function initGame() {
    console.log('🎮 GAME STARTING...');
    resetState();
    
    // Apply skin stats
    const skin = SKINS[currentSkinKey];
    state.currentSkinStats = {
        fireRate: skin.fireRate,
        bulletSpeed: skin.bulletSpeed,
        bulletDamage: skin.bulletDamage
    };
    console.log(`🎨 Skin: ${skin.name} | Stats:`, state.currentSkinStats);
    console.log(`✅ Game initialized | HP: ${state.playerHP}/${state.playerMaxHP}`);
    
    DOM.playerSpriteContainer.innerHTML = skin.svg;
    document.documentElement.style.setProperty('--primary', skin.color);

    DOM.scoreEl.innerText = '0';
    DOM.levelEl.innerText = '1';
    updateHPUI();
    DOM.overlay.style.display = 'none';
    
    document.querySelectorAll('.enemy-ship, .asteroid, .bullet, .enemy-bullet, .particle, .floating-msg, .burger, .ingredient')
        .forEach(e => e.remove());
    
    updateSkinOptions();
    updatePlayerPos();
    requestAnimationFrame(update);
}

// Export to window for HTML onclick
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
        
        // Save max level
        saveMaxLevel(state.level);
        
        // Check for skin unlocks
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

function update() {
    if(!state.active) return;
    const now = Date.now();
    
    handleLevelUp();
    handleSpawning(now);
    
    updateBurgers();
    updateIngredients();
    updateBullets();
    updateEnemyBullets();
    updateAsteroids();
    updateEnemies(now);
    
    requestAnimationFrame(update);
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
});

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