import { DOM, state, INGREDIENT_TYPES, SKINS, currentSkinKey } from './data.js';

export function updatePlayerPos() {
    DOM.player.style.left = state.playerX + 'px';
}

export function updateHPUI() {
    const percent = (Math.max(0, state.playerHP) / state.playerMaxHP) * 100;
    DOM.playerHpFill.style.width = percent + '%';
    DOM.playerHpFill.style.background = percent < 30 ? 'var(--danger)' : 'var(--health)';
}

export function movePlayer(clientX) {
    const rect = DOM.wrapper.getBoundingClientRect();
    let x = clientX - rect.left - 25;
    state.playerX = Math.max(0, Math.min(x, DOM.wrapper.clientWidth - 50));
    updatePlayerPos();
}

export function damagePlayer(amount) {
    state.playerHP -= amount;
    updateHPUI();
    const flash = document.createElement('div');
    flash.className = 'damage-flash';
    DOM.wrapper.appendChild(flash);
    setTimeout(() => flash.remove(), 300);
    if(state.playerHP <= 0) {
        state.active = false;
        DOM.overlay.style.display = 'flex';
        document.getElementById('title').innerText = "Game Over";
        document.getElementById('sub-title').innerText = `Scored ${state.score} points`;
    }
}

export function shoot() {
    if(!state.active) return;
    const now = Date.now();
    const adjustedCooldown = state.shotCooldown / state.currentSkinStats.fireRate;
    if (now - state.lastShot < adjustedCooldown) return;
    state.lastShot = now;

    const createBullet = (angle = 0) => {
        const b = document.createElement('div');
        b.className = 'bullet';
        b.style.left = (state.playerX + 23) + 'px';
        b.style.bottom = '80px';
        
        if (state.currentSkinStats.bulletDamage > 1.5) {
            b.style.width = '6px';
            b.style.height = '20px';
            b.style.boxShadow = '0 0 15px ' + SKINS[currentSkinKey].color;
        }

        DOM.wrapper.appendChild(b);
        const baseSpeed = 15 * state.currentSkinStats.bulletSpeed;
        const vx = Math.sin(angle * Math.PI / 180) * baseSpeed;
        const vy = Math.cos(angle * Math.PI / 180) * baseSpeed;

        state.bullets.push({ 
            el: b, y: 80, x: state.playerX + 23,
            vx: vx, vy: vy, damage: state.currentSkinStats.bulletDamage 
        });
    };

    createBullet(0); // ירייה קדימה

    if (currentSkinKey === 'vortex') {
        state.shotCount++;
        if (state.shotCount % 5 === 0) {
            createBullet(-25); // ימין
            createBullet(25);  // שמאל
            showFloatingMessage("VORTEX BURST!", state.playerX, 500, "#9b59b6");
        }
    }
}

export function enemyShoot(en) {
    const eRect = en.el.getBoundingClientRect();
    const wRect = DOM.wrapper.getBoundingClientRect();
    const eb = document.createElement('div');
    eb.className = 'enemy-bullet';
    const startX = eRect.left - wRect.left + 25;
    const startY = eRect.top - wRect.top + 50;
    eb.style.left = startX + 'px';
    eb.style.top = startY + 'px';
    DOM.wrapper.appendChild(eb);

    const pX = state.playerX + 25;
    const pY = DOM.wrapper.clientHeight - 50;
    const angle = Math.atan2(pY - startY, pX - startX);
    const speed = 4 + (state.level * 0.5);
    
    state.enemyBullets.push({
        el: eb, x: startX, y: startY,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed
    });
}

export function showFloatingMessage(text, x, y, color) {
    const msg = document.createElement('div');
    msg.className = 'floating-msg';
    msg.innerText = text;
    msg.style.left = x + 'px';
    msg.style.top = y + 'px';
    msg.style.color = color;
    DOM.wrapper.appendChild(msg);
    setTimeout(() => msg.remove(), 1000);
}

export function createExplosion(x, y, color) {
    for(let i=0; i<8; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.backgroundColor = color;
        p.style.left = x + 'px';
        p.style.top = y + 'px';
        DOM.wrapper.appendChild(p);
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 50 + 20;
        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist;
        p.animate([
            { transform: 'translate(0,0) scale(1)', opacity: 1 },
            { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 }
        ], { duration: 600, easing: 'ease-out' }).onfinish = () => p.remove();
    }
}

export function handleSpawning(now) {
    if (now - state.lastSpawn > state.spawnRate) {
        state.lastSpawn = now;
        const typeRand = Math.random();
        const posX = Math.random() * (DOM.wrapper.clientWidth - 60);
        const el = document.createElement('div');

        if (typeRand < 0.2) {
            el.className = 'asteroid';
            el.style.left = posX + 'px';
            el.style.top = '-80px';
            el.innerHTML = `<svg viewBox="0 0 100 100"><path d="M30 10 L70 15 L90 50 L70 85 L20 80 L10 40 Z" fill="#555"/></svg>`;
            DOM.wrapper.appendChild(el);
            state.asteroids.push({ el: el, y: -80, x: posX, hp: 5, speed: (Math.random() * 2 + 1.2) * state.speedMult, rot: 0, rotSpeed: Math.random() * 8 - 4 });
        } else {
            const orangeChance = Math.min(0.8, 0.25 + (state.level * 0.05));
            const isOrange = Math.random() < orangeChance;
            const type = isOrange ? 'orange' : 'red';
            const maxHP = isOrange ? (Math.floor(Math.random() * 3) + 3) : (Math.floor(Math.random() * 3) + 1);
            const colorCode = isOrange ? '#ff9900' : '#ff0000';
            el.className = `enemy-ship ${type}`;
            el.style.left = posX + 'px';
            el.style.top = '-60px';
            el.innerHTML = `<div class="hp-bar-container"><div class="hp-bar-fill enemy-hp-fill"></div></div><svg viewBox="0 0 100 100"><path d="M10 20 L50 90 L90 20 L50 40 Z" fill="${colorCode}" stroke="#fff" stroke-width="2"/></svg>`;
            DOM.wrapper.appendChild(el);
            state.enemies.push({ el: el, hpFill: el.querySelector('.enemy-hp-fill'), x: posX, y: -60, hp: maxHP, maxHP: maxHP, lastShot: 0, type: type });
        }
    }
}

export function spawnIngredients(x, y) {
    INGREDIENT_TYPES.forEach((type, i) => {
        setTimeout(() => {
            const el = document.createElement('div');
            el.className = 'ingredient';
            el.style.backgroundColor = type.color;
            el.style.left = (x + (Math.random() * 40 - 20)) + 'px';
            el.style.top = y + 'px';
            el.innerText = type.name[0];
            DOM.wrapper.appendChild(el);
            state.ingredients.push({ el, x: parseFloat(el.style.left), y, type });
        }, i * 150);
    });
}