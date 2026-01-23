import { DOM, state, INGREDIENT_TYPES } from './data.js';

// ===== PLAYER SYSTEMS =====

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
        document.getElementById('sub-title').innerHTML = `הספינה שלך הושמדה!<br>ניקוד סופי: ${state.score}<br>שלב: ${state.level}`;
    }
}

export function healPlayer(percent) {
    const amount = state.playerMaxHP * (percent / 100);
    state.playerHP = Math.min(state.playerMaxHP, state.playerHP + amount);
    updateHPUI();
    showFloatingMessage(`REPAIR +${percent}%`, state.playerX, DOM.wrapper.clientHeight - 100, "var(--health)");
}

// ===== SHOOTING SYSTEMS =====

export function shoot() {
    if(!state.active) return;
    const now = Date.now();
    if (now - state.lastShot < state.shotCooldown) return;
    state.lastShot = now;

    const b = document.createElement('div');
    b.className = 'bullet';
    b.style.left = (state.playerX + 23) + 'px';
    b.style.bottom = '80px';
    DOM.wrapper.appendChild(b);
    state.bullets.push({ el: b, y: 80 });
}

export function enemyShoot(en) {
    if (!state.active) return;
    const eb = document.createElement('div');
    eb.className = 'enemy-bullet';
    if (en.type === 'orange') eb.style.background = 'var(--elite)';
    
    const enLeft = parseFloat(en.el.style.left) + 20;
    const enTop = en.y + 40;
    
    let targetX, targetY;
    if (Math.random() < 0.05 && state.enemies.length > 1) {
        const otherEnemies = state.enemies.filter(e => e.el !== en.el);
        const targetEnemy = otherEnemies[Math.floor(Math.random() * otherEnemies.length)];
        targetX = parseFloat(targetEnemy.el.style.left) + 25;
        targetY = targetEnemy.y + 25;
        eb.dataset.friendlyFire = "true";
    } else {
        targetX = state.playerX + 25;
        targetY = DOM.wrapper.clientHeight - 55;
    }
    
    const dx = targetX - enLeft;
    const dy = targetY - enTop;
    const distance = Math.sqrt(dx*dx + dy*dy);
    
    const speed = (en.type === 'orange' ? 7 : 5.5) * state.speedMult;
    const vx = (dx / distance) * speed;
    const vy = (dy / distance) * speed;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    eb.style.left = enLeft + 'px';
    eb.style.top = enTop + 'px';
    eb.style.transform = `rotate(${angle - 90}deg)`;
    
    DOM.wrapper.appendChild(eb);
    state.enemyBullets.push({ el: eb, x: enLeft, y: enTop, vx: vx, vy: vy, friendly: !!eb.dataset.friendlyFire });
}

// ===== VISUAL EFFECTS =====

export function createExplosion(x, y, color) {
    for(let i=0; i<15; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.background = color;
        p.style.left = x + 'px';
        p.style.top = y + 'px';
        DOM.wrapper.appendChild(p);
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 60 + 10;
        p.animate([
            { opacity: 1 }, 
            { transform: `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px)`, opacity: 0 }
        ], 500).onfinish = () => p.remove();
    }
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

// ===== SPAWNING SYSTEMS =====

export function spawnIngredients(x, y) {
    INGREDIENT_TYPES.forEach(type => {
        const ing = document.createElement('div');
        ing.className = 'ingredient';
        ing.style.left = x + 'px';
        ing.style.top = y + 'px';
        ing.innerHTML = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="${type.color}"/></svg>`;
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
        
        if (spawnRoll < 0.1) {
            // Spawn Burger
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
        } else if (spawnRoll < 0.5) {
            // Spawn Asteroid
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
        } else {
            // Spawn Enemy
            const orangeChance = Math.min(0.8, 0.25 + (state.level * 0.05));
            const isOrange = Math.random() < orangeChance; 
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
                lastShot: now + Math.random() * 500,
                fireRate: (isOrange ? 600 : 1000) / state.speedMult
            });
        }
        state.lastSpawn = now;
    }
}