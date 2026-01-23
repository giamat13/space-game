import { DOM, SKINS, state, resetState, setCurrentSkin, currentSkinKey, loadUnlockedSkins, isSkinUnlocked, unlockSkin, saveMaxLevel, getMaxLevel } from './data.js';
import { updatePlayerPos, movePlayer, updateHPUI, shoot, showFloatingMessage } from './systems.js';
import { handleSpawning } from './systems.js';
import { updateBullets, updateEnemyBullets, updateBurgers, updateIngredients, updateAsteroids, updateEnemies } from './updates.js';

loadUnlockedSkins();
updateSkinOptions();

function updateSkinOptions() {
    document.querySelectorAll('.skin-option').forEach(option => {
        const skinKey = option.dataset.skin;
        const unlockLevel = parseInt(option.dataset.unlockLevel) || 0;
        const maxLevel = getMaxLevel();
        
        if (unlockLevel > 0 && maxLevel >= unlockLevel && !isSkinUnlocked(skinKey)) {
            unlockSkin(skinKey);
        }
        
        if (isSkinUnlocked(skinKey)) {
            option.classList.remove('locked');
            option.onclick = () => selectSkin(skinKey, option);
        } else {
            option.classList.add('locked');
        }
    });
}

window.selectSkin = function(key, element) {
    setCurrentSkin(key);
    document.querySelectorAll('.skin-option').forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
    DOM.playerSpriteContainer.innerHTML = SKINS[key].svg;
};

window.initGame = function() {
    resetState();
    const skin = SKINS[currentSkinKey];
    state.currentSkinStats = {
        fireRate: skin.fireRate,
        bulletSpeed: skin.bulletSpeed,
        bulletDamage: skin.bulletDamage,
        hpMultiplier: skin.hpMultiplier || 1.0
    };
    state.playerMaxHP = 200 * state.currentSkinStats.hpMultiplier;
    state.playerHP = state.playerMaxHP;

    updateHPUI();
    DOM.scoreEl.innerText = '0';
    DOM.levelEl.innerText = '1';
    DOM.overlay.style.display = 'none';
    DOM.playerSpriteContainer.innerHTML = SKINS[currentSkinKey].svg;
    
    document.querySelectorAll('.enemy-ship, .bullet, .enemy-bullet, .asteroid, .ingredient, .floating-msg')
            .forEach(el => el.remove());
            
    requestAnimationFrame(update);
};

function handleLevelUp() {
    const nextLevelScore = state.level * 1000;
    if (state.score >= nextLevelScore) {
        state.level++;
        state.speedMult += 0.15;
        state.spawnRate = Math.max(600, 1400 - (state.level * 100));
        DOM.levelEl.innerText = state.level;
        saveMaxLevel(state.level);
        updateSkinOptions();
        state.playerHP = Math.min(state.playerMaxHP, state.playerHP + (state.playerMaxHP * 0.3));
        updateHPUI();
        showFloatingMessage("LEVEL UP! REPAIR", DOM.wrapper.clientWidth/2 - 70, 200, "var(--primary)");
    }
}

function update() {
    if(!state.active) return;
    const now = Date.now();
    handleLevelUp();
    handleSpawning(now);
    updateBullets();
    updateEnemyBullets();
    updateAsteroids();
    updateEnemies(now);
    updateIngredients();
    requestAnimationFrame(update);
}

window.addEventListener('mousemove', (e) => {
    if(!state.active) return;
    movePlayer(e.clientX);
});

window.addEventListener('mousedown', shoot);
window.addEventListener('keydown', (e) => {
    if(e.code === 'Space') shoot();
});

// יצירת כוכבים ברקע
for(let i=0; i<40; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 100 + '%';
    s.style.animationDelay = Math.random() * 2 + 's';
    DOM.wrapper.appendChild(s);
}