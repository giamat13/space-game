import { DOM, SKINS, state, resetState, setCurrentSkin, currentSkinKey } from './data.js';
import { updatePlayerPos, movePlayer, updateHPUI, shoot, showFloatingMessage } from './systems.js';
import { handleSpawning } from './systems.js';
import { updateBullets, updateEnemyBullets, updateBurgers, updateIngredients, updateAsteroids, updateEnemies } from './updates.js';

// ===== SKIN SELECTION =====

window.selectSkin = function(key, element) {
    setCurrentSkin(key);
    document.querySelectorAll('.skin-option').forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
};

// ===== GAME INITIALIZATION =====

window.initGame = function() {
    console.log('🎮 GAME STARTING...');
    resetState();
    console.log(`✅ Game initialized | HP: ${state.playerHP}/${state.playerMaxHP}`);
    
    DOM.playerSpriteContainer.innerHTML = SKINS[currentSkinKey].svg;
    document.documentElement.style.setProperty('--primary', SKINS[currentSkinKey].color);

    DOM.scoreEl.innerText = '0';
    DOM.levelEl.innerText = '1';
    updateHPUI();
    DOM.overlay.style.display = 'none';
    
    document.querySelectorAll('.enemy-ship, .asteroid, .bullet, .enemy-bullet, .particle, .floating-msg, .burger, .ingredient')
        .forEach(e => e.remove());
    
    updatePlayerPos();
    requestAnimationFrame(update);
};



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