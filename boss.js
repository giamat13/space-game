// ===== BOSS: "Cube King" — appears once, at level 30 =====
// Self-contained: lives outside state.enemies, uses state.enemyBullets so the existing
// bullet movement / player-damage / dragon-ricochet code works unchanged.
import { DOM, state, addScore, addCoins } from './data.js';
import { createExplosion, showFloatingMessage, damagePlayer, updateHPUI, updateAmmoUI } from './systems.js';
import { t, tf } from './i18n.js';
import { showBanner, confettiBurst, shockwave } from './fx.js';

export const BOSS_LEVEL = 30;
const W = 170;
const Y = 125;           // resting height (below the player HUD)           // boss sprite size (px)
const HARDNESS = 100;     // boss HP multiplier (tune here)
const MAX_HIT = 9;        // a single hit never takes more than this (keeps 999-dmg feathers from one-shotting)

const BOSS_SVG = `<svg viewBox="0 0 200 200" style="width:100%;height:100%;" stroke-linejoin="round" stroke-linecap="round">
  <g fill="#a23cf0" stroke="#3b0f7a" stroke-width="5">
    <path d="M24 70 L8 22 L52 46 Z"/><path d="M176 70 L192 22 L148 46 Z"/>
    <path d="M34 150 L10 190 L56 172 Z"/><path d="M166 150 L190 190 L144 172 Z"/>
    <path d="M30 56 L100 30 L172 56 L186 120 L166 176 L100 190 L34 176 L14 120 Z"/>
  </g>
  <path d="M60 44 L100 14 L140 44 Z" fill="#ffd21a" stroke="#3b0f7a" stroke-width="4"/>
  <path d="M42 84 L92 98 L50 118 Z" fill="#111"/><path d="M158 84 L108 98 L150 118 Z" fill="#111"/>
  <path d="M60 96 L82 100" stroke="#fff" stroke-width="4"/><path d="M140 96 L118 100" stroke="#fff" stroke-width="4"/>
  <path d="M48 140 L66 160 L82 140 L100 162 L118 140 L134 160 L152 140" fill="#fff" stroke="#111" stroke-width="5"/>
  <g fill="#ffe600"><circle cx="46" cy="64" r="6"/><circle cx="154" cy="66" r="6"/><circle cx="100" cy="70" r="6"/><circle cx="30" cy="124" r="6"/><circle cx="170" cy="122" r="6"/><circle cx="76" cy="176" r="6"/><circle cx="126" cy="178" r="6"/><circle cx="100" cy="118" r="5"/></g>
</svg>`;

function wrapperW() { return DOM.wrapper.clientWidth; }
function wrapperH() { return DOM.wrapper.clientHeight; }

function ensureHud() {
    let hud = document.getElementById('boss-hud');
    if (!hud) {
        hud = document.createElement('div');
        hud.id = 'boss-hud';
        hud.innerHTML = '<div class="boss-hud-name"></div><div class="boss-hud-bar"><div class="boss-hud-fill"></div></div>';
        DOM.wrapper.appendChild(hud);
    }
    hud.querySelector('.boss-hud-name').textContent = t('bossName');
    return hud;
}

export function resetBoss() {
    if (state.boss) { state.boss.el.remove(); }
    state.boss = null;
    state.bossDone = false;
    document.getElementById('boss-hud')?.remove();
}

// Game over: remove the boss from the screen but keep state.bossDone for the result being saved.
export function hideBoss() {
    if (state.boss) state.boss.el.remove();
    state.boss = null;
    document.getElementById('boss-hud')?.remove();
}

function spawnBoss(now) {
    const stats = state.currentSkinStats || { fireRate: 1, bulletDamage: 1 };
    const power = Math.max(1, (stats.bulletDamage || 1) * (stats.fireRate || 1));
    const maxHP = Math.round(300 * HARDNESS * Math.pow(power, 0.8));

    const el = document.createElement('div');
    el.className = 'boss';
    el.style.width = el.style.height = W + 'px';
    el.innerHTML = BOSS_SVG;
    DOM.wrapper.appendChild(el);

    const hud = ensureHud();
    state.boss = {
        el, hudFill: hud.querySelector('.boss-hud-fill'),
        x: wrapperW() / 2 - W / 2, y: -W - 10, hp: maxHP, maxHP, phase: 1,
        t0: now, enter: true, lastShot: now + 800, lastRing: now + 1800,
        dash: { state: 'idle', next: now + 3500, hit: false, targetX: 0 },
        hitUntil: 0, rect: null
    };
    el.style.left = state.boss.x + 'px';
    el.style.top = state.boss.y + 'px';
    showBanner(t('bossWarning'), { color: '#ff4d6a', ms: 2400, shake: true });
}

function fire(x, y, angleDeg, speed) {
    const a = angleDeg * Math.PI / 180;
    const el = document.createElement('div');
    el.className = 'enemy-bullet boss-bullet';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.transform = `rotate(${angleDeg - 90}deg)`;
    DOM.wrapper.appendChild(el);
    state.enemyBullets.push({ el, x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, friendly: false, chaotic: false, shooterId: null });
}

function aimedAngle(bx, by) {
    const tx = state.playerX + 25, ty = wrapperH() - 55;
    return Math.atan2(ty - by, tx - bx) * 180 / Math.PI;
}

function ring(bx, by, n, speed, offset = 0) {
    for (let i = 0; i < n; i++) fire(bx, by, offset + (360 / n) * i, speed);
}

// Damage from abilities (vortex laser, dragon fire, joker chaos): fraction of max HP.
function damageBoss(amount, absolute = false) {
    const b = state.boss;
    if (!b || b.enter) return;
    const dmg = absolute ? amount : b.maxHP * amount;
    b.hp -= dmg;
    b.hitUntil = Date.now() + 90;
}
window.__damageBoss = (fraction) => damageBoss(fraction / HARDNESS);

function defeat() {
    const b = state.boss;
    const cx = b.x + W / 2, cy = b.y + W / 2;
    for (let i = 0; i < 14; i++) {
        setTimeout(() => createExplosion(cx + (Math.random() - 0.5) * W, cy + (Math.random() - 0.5) * W, i % 2 ? '#ffd21a' : '#a23cf0'), i * 90);
    }
    const r = b.el.getBoundingClientRect();
    confettiBurst(r.left + r.width / 2, r.top + r.height / 2, { count: 80, spread: 420 });
    shockwave(r.left + r.width / 2, r.top + r.height / 2, '#ffd166', 560);

    const bonusScore = 5000, bonusCoins = 3000;
    addScore(bonusScore);
    DOM.scoreEl.innerText = state.score;
    addCoins(bonusCoins);
    state.coinsEarned += bonusCoins;
    if (DOM.coinsEarnedEl) DOM.coinsEarnedEl.innerText = `+${state.coinsEarned}`;
    state.playerHP = state.playerMaxHP;
    updateHPUI();
    state.ammo = state.maxAmmo;
    updateAmmoUI();

    // Clear the boss' remaining bullets
    for (const eb of state.enemyBullets) eb.el.remove();
    state.enemyBullets = [];

    showBanner(t('bossDefeated'), { color: '#ffd166', ms: 2600 });
    showFloatingMessage(tf('bossReward', { score: bonusScore, coins: bonusCoins }), wrapperW() / 2 - 90, wrapperH() / 2, '#ffd700');

    b.el.remove();
    document.getElementById('boss-hud')?.remove();
    state.boss = null;
    state.bossDone = true;
}

export function updateBoss(now) {
    if (!state.boss) {
        if (state.level >= BOSS_LEVEL && !state.bossDone) spawnBoss(now);
        return;
    }
    const b = state.boss;
    const H = wrapperH(), WW = wrapperW();

    // ---- entrance ----
    if (b.enter) {
        b.y += 2;
        if (b.y >= Y) { b.y = Y; b.enter = false; b.t0 = now; }
    } else {
        const ratio = b.hp / b.maxHP;
        b.phase = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
        const period = b.phase === 1 ? 1500 : b.phase === 2 ? 1100 : 800;
        const amp = WW / 2 - W / 2 - 10;
        const d = b.dash;

        if (d.state === 'idle') {
            b.x = WW / 2 - W / 2 + Math.sin((now - b.t0) / period) * amp;
            if (b.phase === 3 && now > d.next) { d.state = 'warn'; d.until = now + 900; d.hit = false; b.el.classList.add('boss-warn'); }
        } else if (d.state === 'warn') {
            // telegraph: lock onto the player's column, shake in place
            d.targetX = Math.max(0, Math.min(WW - W, state.playerX + 25 - W / 2));
            b.x += (d.targetX - b.x) * 0.12;
            if (now > d.until) { d.state = 'rush'; b.el.classList.remove('boss-warn'); }
        } else if (d.state === 'rush') {
            b.y += 15;
            if (b.y >= H - W - 70) d.state = 'return';
        } else if (d.state === 'return') {
            b.y -= 6;
            if (b.y <= Y) { b.y = Y; d.state = 'idle'; d.next = now + 3500; b.t0 = now - Math.asin(Math.max(-1, Math.min(1, (b.x - (WW / 2 - W / 2)) / amp))) * period; }
        }

        // ---- attacks (not while rushing) ----
        const cx = b.x + W / 2, cy = b.y + W * 0.75;
        if (d.state === 'idle') {
            const shotEvery = b.phase === 1 ? 600 : b.phase === 2 ? 480 : 380;
            if (now - b.lastShot > shotEvery) {
                const a = aimedAngle(cx, cy), sp = 5 + b.phase * 0.6;
                const spreads = b.phase === 3 ? [-36, -24, -12, 0, 12, 24, 36] : [-21, -14, -7, 0, 7, 14, 21];
                for (const s of spreads) fire(cx, cy, a + s, sp);
                b.lastShot = now;
            }
            if (b.phase >= 2 && now - b.lastRing > (b.phase === 2 ? 1500 : 1100)) {
                ring(cx, cy, b.phase === 2 ? 16 : 24, 4.6, Math.random() * 30);
                b.lastRing = now;
            }
        }
    }

    b.el.style.left = b.x + 'px';
    b.el.style.top = b.y + 'px';
    const rect = b.rect = b.el.getBoundingClientRect();

    // ---- player contact (rush) ----
    const pRect = state.playerRect || DOM.player.getBoundingClientRect();
    if (b.dash.state === 'rush' && !b.dash.hit &&
        !(rect.right < pRect.left || rect.left > pRect.right || rect.bottom < pRect.top || rect.top > pRect.bottom)) {
        b.dash.hit = true;
        damagePlayer(45, 'boss_dash');
        createExplosion(pRect.left + 25, pRect.top + 25, '#ff4d6a');
    }

    // ---- player bullets ----
    if (!b.enter) {
        const cap = MAX_HIT;
        for (let i = state.bullets.length - 1; i >= 0; i--) {
            const bul = state.bullets[i];
            const r = bul.rect || bul.el.getBoundingClientRect();
            if (r.right < rect.left || r.left > rect.right || r.bottom < rect.top || r.top > rect.bottom) continue;
            b.hp -= Math.min(bul.damage || 1, cap);
            b.hitUntil = now + 80;
            createExplosion(r.left, r.top, bul.isFeather ? '#ff6b35' : 'white');
            bul.el.remove();
            state.bullets.splice(i, 1);
        }
        // dragon-shield ricochet bullets
        for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
            const eb = state.enemyBullets[i];
            if (!eb.ricochet) continue;
            const r = eb.rect || eb.el.getBoundingClientRect();
            if (r.right < rect.left || r.left > rect.right || r.bottom < rect.top || r.top > rect.bottom) continue;
            b.hp -= Math.min(eb.damage || 40, cap * 2);
            b.hitUntil = now + 80;
            createExplosion(eb.x, eb.y, '#ffaa33');
            eb.el.remove();
            state.enemyBullets.splice(i, 1);
        }
    }

    b.el.classList.toggle('boss-hit', now < b.hitUntil);
    b.hp = Math.max(0, b.hp);
    b.hudFill.style.width = (b.hp / b.maxHP * 100) + '%';
    b.hudFill.dataset.phase = b.phase;
    if (b.hp <= 0) defeat();
}
