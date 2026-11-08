// ===== BOSS: "Cube King" — appears once, at level 30 =====
// Self-contained: lives outside state.enemies, uses state.enemyBullets so the existing
// bullet movement / player-damage / dragon-ricochet code works unchanged.
//
// Fight design (beatable, but you have to play it):
//   • Dodges lined-up shots, shields itself, blinks across the arena, fires a telegraphed laser.
//   • Every power has a cost: after the shield drops / the beam fires / a phase change roar,
//     the boss is EXPOSED for a moment and takes double damage.
//   • Each phase change clears the bullets and gives the player a second wind (+25% HP).
import { DOM, state, addScore, addCoins } from './data.js';
import { createExplosion, showFloatingMessage, damagePlayer, updateHPUI, updateAmmoUI } from './systems.js';
import { t, tf } from './i18n.js';
import { showBanner, confettiBurst, shockwave, lightBeams, xpOrbs, trophy } from './fx.js';

export const BOSS_LEVEL = 30;
const W = 170;            // boss sprite size (px)
const Y = 125;            // resting height (below the player HUD)
const BOSS_HP_PER_POWER = 230; // boss HP = this x ship power (damage x fire rate). Sustained player dps is ~2.5 x power (ammo-limited), so ~140 => a fight of roughly a minute
const MAX_HIT = 9;        // a single hit never takes more than this (keeps 999-dmg feathers from one-shotting)
const EXPOSED_MULT = 2;   // damage multiplier while exposed

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

// Screen shake on the playfield.
function shake(ms = 350) {
    const w = DOM.wrapper;
    w.classList.remove('shake');
    void w.offsetWidth;
    w.classList.add('shake');
    setTimeout(() => w.classList.remove('shake'), ms);
}

function flash(color = '#fff', ms = 500) {
    const f = document.createElement('div');
    f.className = 'boss-flash';
    f.style.background = color;
    f.style.animationDuration = ms + 'ms';
    DOM.wrapper.appendChild(f);
    setTimeout(() => f.remove(), ms);
}

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

function clearMinions(b) {
    (b.missiles || []).forEach(m => m.el.remove()); b.missiles = [];
    (b.drones || []).forEach(d => d.el.remove()); b.drones = [];
    (b.meteors || []).forEach(m => m.el.remove()); b.meteors = [];
    (b.mines || []).forEach(m => m.el.remove()); b.mines = [];
    (b.zaps || []).forEach(z => z.el.remove()); b.zaps = [];
    if (b.burst) b.burst.left = 0;
}

function removeBossDom(b) {
    if (!b) return;
    clearMinions(b);
    b.beam.el?.remove();
    (b.pickups || []).forEach(p => p.el.remove());
    b.el.remove();
    document.getElementById('boss-hud')?.remove();
}

export function resetBoss() {
    removeBossDom(state.boss);
    state.boss = null;
    state.bossDone = false;
}

// Game over: remove the boss from the screen but keep state.bossDone for the result being saved.
export function hideBoss() {
    removeBossDom(state.boss);
    state.boss = null;
}

function spawnBoss(now) {
    const stats = state.currentSkinStats || { fireRate: 1, bulletDamage: 1 };
    const power = Math.max(1, (stats.bulletDamage || 1) * (stats.fireRate || 1));
    const maxHP = Math.round(BOSS_HP_PER_POWER * power);

    const el = document.createElement('div');
    el.className = 'boss entering';
    el.dataset.phase = '1';
    el.style.width = el.style.height = W + 'px';
    el.innerHTML = '<div class="boss-aura"></div><div class="boss-orbit"><i></i><i></i><i></i></div><div class="boss-body">' + BOSS_SVG + '</div><div class="boss-shield"></div>';
    DOM.wrapper.appendChild(el);

    const hud = ensureHud();
    state.boss = {
        el, body: el.querySelector('.boss-body'), hudFill: hud.querySelector('.boss-hud-fill'),
        x: wrapperW() / 2 - W / 2, y: -W - 10, prevX: 0, tilt: 0,
        hp: maxHP, maxHP, phase: 1,
        t0: now, enter: true, lastShot: now + 800, lastRing: now + 2000,
        dash: { state: 'idle', next: now + 7000, hit: false, targetX: 0, until: 0 },
        hitUntil: 0, rect: null, roarUntil: 0, weakUntil: 0, dying: false, dyingUntil: 0,
        dodgeOff: 0, dodgeTarget: 0, dodgeReset: 0, dodgeCd: 0,
        shield: { on: false, until: 0, next: now + 10000 },
        blinkNext: now + 9000, blinkUntil: 0,
        beam: { state: 'idle', until: 0, next: now + 8000, x: 0, hit: false, el: null },
        spiral: { left: 0, angle: 0, next: 0, nextStart: now + 6000 },
        pickups: [], nextPickup: now + 5000,
        specialNext: now + 4500, missiles: [], drones: [], meteors: [], mines: [], zaps: [], burst: { left: 0, next: 0 }
    };
    el.style.left = state.boss.x + 'px';
    el.style.top = state.boss.y + 'px';
    showBanner(t('bossWarning'), { color: '#ff4d6a', ms: 2600, shake: true });
    flash('#ff4d6a', 700);
    shake(900);
}

function fire(x, y, angleDeg, speed, phase = 1) {
    const a = angleDeg * Math.PI / 180;
    const el = document.createElement('div');
    el.className = 'enemy-bullet boss-bullet';
    el.dataset.p = phase;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.transform = `rotate(${angleDeg - 90}deg)`;
    DOM.wrapper.appendChild(el);
    state.enemyBullets.push({ el, x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, friendly: false, chaotic: false, shooterId: null, dmg: 30 + 10 * phase });
}

function aimedAngle(bx, by) {
    const tx = state.playerX + 25, ty = wrapperH() - 55;
    return Math.atan2(ty - by, tx - bx) * 180 / Math.PI;
}

function ring(bx, by, n, speed, offset = 0, phase = 1) {
    for (let i = 0; i < n; i++) fire(bx, by, offset + (360 / n) * i, speed, phase);
}

function clearBossBullets() {
    for (const eb of state.enemyBullets) {
        if (eb.ricochet) continue;
        createExplosion(eb.x, eb.y, '#ffd21a');
        eb.el.remove();
    }
    state.enemyBullets = state.enemyBullets.filter(eb => eb.ricochet);
}

function expose(b, now, ms) {
    b.weakUntil = Math.max(b.weakUntil, now + ms);
    showFloatingMessage(t('bossWeak'), b.x + W / 2 - 50, b.y - 14, '#ffe600');
}

// Damage from abilities (vortex laser, dragon fire, joker chaos): fraction of max HP.
function damageBoss(fraction) {
    const b = state.boss;
    if (!b || b.enter || b.dying || b.shield.on) return;
    const mult = Date.now() < b.weakUntil ? EXPOSED_MULT : 1;
    b.hp -= b.maxHP * fraction * mult;
    b.hitUntil = Date.now() + 90;
}
window.__damageBoss = (fraction) => damageBoss(fraction);

// ---- phase change: roar, clear bullets, second wind ----
function phaseChange(b, now, phase) {
    b.phase = phase;
    b.el.dataset.phase = String(phase);
    b.roarUntil = now + 1500;
    b.weakUntil = Math.max(b.weakUntil, now + 1500);
    b.dash.state = 'idle'; b.dash.next = now + 7000; b.el.classList.remove('boss-warn');
    if (b.beam.el) { b.beam.el.remove(); b.beam.el = null; }
    b.beam.state = 'idle'; b.beam.next = now + 5000;
    b.shield.on = false; b.el.classList.remove('boss-shielded'); b.shield.next = now + 8000;
    b.spiral.left = 0; b.spiral.nextStart = now + 3000;
    clearBossBullets();
    clearMinions(b);
    b.specialNext = now + 4500;
    const r = b.el.getBoundingClientRect();
    shockwave(r.left + r.width / 2, r.top + r.height / 2, phase === 3 ? '#ff4d2f' : '#ffd21a', 600);
    shake(700);
    flash(phase === 3 ? '#ff4d2f' : '#ffd21a', 450);
    showBanner(t(phase === 3 ? 'bossPhase3' : 'bossPhase2'), { color: phase === 3 ? '#ff4d2f' : '#ffd21a', ms: 1800, shake: true });
    // second wind for the player
    const heal = Math.round(state.playerMaxHP * 0.25);
    state.playerHP = Math.min(state.playerMaxHP, state.playerHP + heal);
    updateHPUI();
    showFloatingMessage(`+${heal} HP`, wrapperW() / 2 - 30, wrapperH() - 160, 'var(--health)');
}

// ---- death sequence ----
function startDeath(b, now) {
    b.dying = true;
    b.dyingStart = now;
    b.dyingUntil = now + 3300;
    const r0 = b.el.getBoundingClientRect();
    b.beams = lightBeams(r0.left + r0.width / 2, r0.top + r0.height / 2);
    shake(3300);
    b.hp = 0;
    b.el.classList.remove('boss-warn', 'boss-shielded', 'boss-blink');
    b.el.classList.add('boss-dying');
    if (b.beam.el) { b.beam.el.remove(); b.beam.el = null; }
    clearBossBullets();
    clearMinions(b);
    state.enemyBullets.forEach(eb => eb.el.remove()); state.enemyBullets = [];
    showFloatingMessage('…', b.x + W / 2, b.y, '#fff');
}

function finishDeath(b) {
    const r = b.el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    b.beams?.end(500);
    flash('#fff', 1100);
    shake(900);
    confettiBurst(cx, cy, { count: 110, spread: 480 });
    const playerPt = () => { const p = DOM.player.getBoundingClientRect(); return { x: p.left + p.width / 2, y: p.top + p.height / 2 }; };
    xpOrbs(cx, cy, playerPt, { count: 34, onArrive: (n) => { if (DOM.coinsEarnedEl) { DOM.coinsEarnedEl.classList.remove('coin-pop'); void DOM.coinsEarnedEl.offsetWidth; DOM.coinsEarnedEl.classList.add('coin-pop'); } } });
    setTimeout(() => trophy(cx, Math.max(cy, 260), playerPt), 600);
    setTimeout(() => confettiBurst(cx - 80, cy + 20, { count: 40 }), 250);
    setTimeout(() => confettiBurst(cx + 80, cy + 20, { count: 40 }), 450);
    shockwave(cx, cy, '#ffd166', 640);
    shockwave(cx, cy, '#ffffff', 420);
    shockwave(cx, cy, '#c04dff', 760);

    const bonusScore = 5000, bonusCoins = 3000;
    const scoreBefore = state.score;
    addScore(bonusScore);
    // the bonus shouldn't instantly skip levels: don't count it toward the next level-up
    state.lastLevelScore += state.score - scoreBefore;
    DOM.scoreEl.innerText = state.score;
    addCoins(bonusCoins);
    state.coinsEarned += bonusCoins;
    if (DOM.coinsEarnedEl) DOM.coinsEarnedEl.innerText = `+${state.coinsEarned}`;
    state.playerHP = state.playerMaxHP;
    updateHPUI();
    state.ammo = state.maxAmmo;
    updateAmmoUI();

    showBanner(t('bossDefeated'), { color: '#ffd166', ms: 3000 });
    showFloatingMessage(tf('bossReward', { score: bonusScore, coins: bonusCoins }), wrapperW() / 2 - 90, wrapperH() / 2, '#ffd700');

    removeBossDom(b);
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

    // ===== death sequence =====
    if (b.dying) {
        // the boss hovers upward, shaking harder and harder while pillars of light pour out of it
        const k = Math.min(1, (now - b.dyingStart) / (b.dyingUntil - b.dyingStart));
        b.y -= 0.45;
        b.el.style.left = (b.x + (Math.random() - 0.5) * (6 + 22 * k)) + 'px';
        b.el.style.top = b.y + 'px';
        b.el.style.opacity = String(1 - 0.35 * k);
        if (Math.random() < 0.35 + 0.5 * k) {
            createExplosion(b.x + Math.random() * W, b.y + Math.random() * W, Math.random() < 0.5 ? '#ffd21a' : '#c9a4ff');
        }
        const rr = b.el.getBoundingClientRect();
        b.beams?.move(rr.left + rr.width / 2, rr.top + rr.height / 2);
        if (now > b.dyingUntil) finishDeath(b);
        return;
    }

    // ===== entrance =====
    if (b.enter) {
        b.y += 3;
        if (b.y >= Y) { b.y = Y; b.enter = false; b.t0 = now; b.el.classList.remove('entering'); shake(500); shockwave(b.x + W / 2 + (DOM.wrapper.getBoundingClientRect().left), b.y + W / 2, '#c04dff', 420); }
    } else {
        const ratio = b.hp / b.maxHP;
        const newPhase = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
        if (newPhase > b.phase) phaseChange(b, now, newPhase);

        const roaring = now < b.roarUntil;
        const exposed = now < b.weakUntil;
        const period = b.phase === 1 ? 1700 : b.phase === 2 ? 1300 : 1000;
        const amp = WW / 2 - W / 2 - 10;
        const d = b.dash;

        // ---- base movement ----
        if (d.state === 'idle') {
            if (!roaring) b.x = WW / 2 - W / 2 + Math.sin((now - b.t0) / period) * amp;
            else b.t0 += 16; // freeze the sway during the roar
            if (b.phase === 3 && now > d.next && !roaring && !exposed && b.beam.state === 'idle' && !b.blinkUntil) {
                d.state = 'warn'; d.until = now + 900; d.hit = false; b.el.classList.add('boss-warn');
            }
        } else if (d.state === 'warn') {
            d.targetX = Math.max(0, Math.min(WW - W, state.playerX + 25 - W / 2));
            b.x += (d.targetX - b.x) * 0.12;
            if (now > d.until) { d.state = 'rush'; b.el.classList.remove('boss-warn'); }
        } else if (d.state === 'rush') {
            b.y += 15;
            if (b.y >= H - W - 70) { d.state = 'return'; shake(300); }
        } else if (d.state === 'return') {
            b.y -= 6;
            if (b.y <= Y) {
                b.y = Y; d.state = 'idle'; d.next = now + 6000;
                b.t0 = now - Math.asin(Math.max(-1, Math.min(1, (b.x - (WW / 2 - W / 2)) / amp))) * period;
                expose(b, now, 1000);   // overheated after the slam
            }
        }

        const cx = b.x + W / 2, cy = b.y + W * 0.75;
        const calm = roaring || exposed;          // no attacks while roaring / exposed
        const ph = b.phase;

        // ---- attacks ----
        if (d.state === 'idle' && !calm && !b.blinkUntil) {
            const shotEvery = ph === 1 ? 900 : ph === 2 ? 750 : 600;
            if (now - b.lastShot > shotEvery) {
                const a = aimedAngle(cx, cy), sp = 4.4 + ph * 0.5;
                const spreads = ph === 3 ? [-30, -20, -10, 0, 10, 20, 30] : [-20, -10, 0, 10, 20];
                for (const s of spreads) fire(cx, cy, a + s, sp, ph);
                b.lastShot = now;
            }
            if (ph >= 2 && now - b.lastRing > (ph === 2 ? 2400 : 1800)) {
                ring(cx, cy, ph === 2 ? 12 : 16, 4.2, Math.random() * 30, ph);
                b.lastRing = now;
            }
            // spiral: a rotating stream with natural gaps to slip through
            const sp = b.spiral;
            if (ph >= 2 && sp.left === 0 && now > sp.nextStart) { sp.left = ph === 2 ? 16 : 26; sp.angle = Math.random() * 360; sp.next = now; }
            if (sp.left > 0 && now > sp.next) {
                fire(cx, cy, sp.angle, 4.0, ph);
                sp.angle += 24; sp.left--; sp.next = now + 55;
                if (sp.left === 0) sp.nextStart = now + (ph === 2 ? 5000 : 3500);
            }
        }

        // ===== DODGE: sidestep shots lined up with the boss =====
        if (d.state === 'idle' && b.rect && now > b.dodgeCd && !b.shield.on && !calm) {
            const bcx = b.rect.left + b.rect.width / 2;
            for (const bul of state.bullets) {
                const r = bul.rect;
                if (!r || r.top < b.rect.bottom) continue;
                if (r.top - b.rect.bottom > 280) continue;
                const bx = r.left + r.width / 2;
                if (bx < b.rect.left - 12 || bx > b.rect.right + 12) continue;
                if (Math.random() > 0.5) { b.dodgeCd = now + 700; break; }   // only dodges about half the time
                let dir = bx < bcx ? 1 : -1;
                const room = dir > 0 ? (WW - W - 10 - b.x) : (b.x - 10);
                if (room < 90) dir = -dir;
                b.dodgeTarget = dir * 110;
                b.dodgeReset = now + 550;
                b.dodgeCd = now + (ph === 1 ? 3200 : ph === 2 ? 2600 : 2000);
                break;
            }
        }
        if (now > b.dodgeReset || calm) b.dodgeTarget = 0;
        b.dodgeOff += (b.dodgeTarget - b.dodgeOff) * 0.3;
        if (d.state === 'idle') b.x = Math.max(8, Math.min(WW - W - 8, b.x + b.dodgeOff));

        // ===== SPECIAL POWER 1: energy shield (absorbs everything) =====
        const sh = b.shield;
        if (!sh.on && now > sh.next && !roaring && d.state === 'idle') {
            sh.on = true; sh.until = now + (ph === 3 ? 2800 : 2200);
            b.el.classList.add('boss-shielded');
            showFloatingMessage(t('bossShield'), b.x + W / 2 - 40, b.y - 10, '#7fe9ff');
        } else if (sh.on && now > sh.until) {
            sh.on = false; sh.next = now + (ph === 3 ? 8000 : 10000);
            b.el.classList.remove('boss-shielded');
            expose(b, now, 1500);      // shield down → exposed: your window to hit hard
        }

        // ===== SPECIAL POWER 2: blink (teleport) =====
        if (ph >= 2 && d.state === 'idle' && b.beam.state === 'idle' && !calm && !sh.on && now > b.blinkNext && !b.blinkUntil) {
            b.blinkUntil = now + 260;
            b.el.classList.add('boss-blink');
        }
        if (b.blinkUntil && now > b.blinkUntil) {
            const from = b.rect;
            if (from) shockwave(from.left + from.width / 2, from.top + from.height / 2, '#c04dff', 260);
            const px = state.playerX + 25;
            const targetX = px < WW / 2 ? WW - W - 20 - Math.random() * 60 : 20 + Math.random() * 60;
            b.t0 = now - Math.asin(Math.max(-1, Math.min(1, (targetX - (WW / 2 - W / 2)) / amp))) * period;
            b.x = targetX; b.dodgeOff = 0; b.dodgeTarget = 0;
            b.el.classList.remove('boss-blink');
            b.blinkUntil = 0;
            b.blinkNext = now + (ph === 3 ? 6500 : 9000);
            ring(b.x + W / 2, b.y + W * 0.75, 8, 4.2, Math.random() * 45, ph);
        }

        // ===== SPECIAL ATTACK: telegraphed laser column =====
        const bm = b.beam;
        if (bm.state === 'idle') {
            if (ph >= 2 && d.state === 'idle' && !b.blinkUntil && !calm && !sh.on && now > bm.next) {
                bm.state = 'warn'; bm.until = now + 1100; bm.hit = false;
                bm.el = document.createElement('div');
                bm.el.className = 'boss-beam warn';
                DOM.wrapper.appendChild(bm.el);
                bm.x = state.playerX + 25;
            }
        } else if (bm.state === 'warn') {
            if (bm.until - now > 300) bm.x += (state.playerX + 25 - bm.x) * 0.15;
            if (now > bm.until) { bm.state = 'fire'; bm.until = now + 550; bm.el.className = 'boss-beam fire'; shake(450); }
        } else if (bm.state === 'fire') {
            const px = state.playerX + 25;
            if (!bm.hit && Math.abs(px - bm.x) < 42) { bm.hit = true; damagePlayer(500, 'boss_beam'); }
            if (now > bm.until) {
                bm.el.remove(); bm.el = null; bm.state = 'idle';
                bm.next = now + (ph === 3 ? 5500 : 8000);
                expose(b, now, 1200);   // overheated after the beam
            }
        }
        if (bm.el) {
            const top = b.y + W * 0.7;
            bm.el.style.left = (bm.x - 40) + 'px';
            bm.el.style.top = top + 'px';
            bm.el.style.height = (H - top) + 'px';
        }
    }


    // ===== MORE POWERS: bullet wall, drones, homing missiles, meteor rain =====
    if (!b.enter && !b.dying) {
        const ph = b.phase;
        const calmNow = now < b.roarUntil || now < b.weakUntil;
        const busy = b.shield.on || b.beam.state !== 'idle' || b.dash.state !== 'idle' || b.blinkUntil;
        const cxs = b.x + W / 2, cys = b.y + W * 0.8;

        if (now > b.specialNext && !calmNow && !busy) {
            const pool = ['wall'];
            if (ph >= 2) pool.push('missiles', 'meteors', 'mines', 'lightning');
            if (ph >= 2 && b.drones.length === 0) pool.push('drones');
            if (ph === 3) pool.push('meteors', 'wall', 'burst', 'lightning');
            const pick = pool[Math.floor(Math.random() * pool.length)];
            b.specialNext = now + (ph === 1 ? 6500 : ph === 2 ? 5200 : 4200);

            if (pick === 'wall') {
                // a curtain of bullets with a gap near (but not exactly on) the player
                const step = 38, n = Math.floor((WW - 20) / step);
                const gap = Math.max(1, Math.min(n - 3, Math.round((state.playerX + 25 + (Math.random() - 0.5) * 160) / step)));
                const gapW = ph === 3 ? 2 : 3;
                for (let i = 0; i < n; i++) {
                    if (i >= gap - Math.floor(gapW / 2) && i <= gap + Math.floor(gapW / 2)) continue;
                    fire(14 + i * step, cys, 90, 3.4, ph);
                }
                showFloatingMessage(t('bossWall'), cxs - 30, b.y - 14, '#ffd21a');
            } else if (pick === 'missiles' && b.missiles.length === 0) {
                const count = ph === 3 ? 3 : 2;
                for (let i = 0; i < count; i++) {
                    const el = document.createElement('div');
                    el.className = 'boss-missile';
                    el.innerHTML = '<svg viewBox="0 0 24 40" style="width:100%;height:100%"><path d="M12 2 L21 20 L17 38 L7 38 L3 20 Z" fill="#ff7a2e" stroke="#7a2a00" stroke-width="2.5" stroke-linejoin="round"/><path d="M12 8 L16 20 L8 20 Z" fill="#ffe600"/></svg>';
                    DOM.wrapper.appendChild(el);
                    const ang = (i / count - 0.5) * 2 + Math.PI / 2;
                    b.missiles.push({ el, x: cxs, y: cys, vx: Math.cos(ang) * 2.4, vy: Math.sin(ang) * 2.4, born: now });
                }
                showFloatingMessage(t('bossMissiles'), cxs - 40, b.y - 14, '#ff7a2e');
            } else if (pick === 'meteors') {
                const cols = ph === 3 ? 5 : 4;
                for (let i = 0; i < cols; i++) {
                    const mx = i === 0 ? state.playerX + 25 : 30 + Math.random() * (WW - 60);
                    const warn = document.createElement('div');
                    warn.className = 'boss-meteor-warn';
                    warn.style.left = (mx - 22) + 'px';
                    DOM.wrapper.appendChild(warn);
                    b.meteors.push({ el: warn, x: mx, y: -40, state: 'warn', until: now + 1000 + i * 120 });
                }
                showFloatingMessage(t('bossMeteors'), cxs - 40, b.y - 14, '#ff4d2f');
            } else if (pick === 'drones' && b.drones.length === 0) {
                const count = ph === 3 ? 3 : 2;
                for (let i = 0; i < count; i++) {
                    const el = document.createElement('div');
                    el.className = 'boss-drone';
                    el.innerHTML = '<svg viewBox="0 0 60 60" style="width:100%;height:100%" stroke-linejoin="round"><g fill="#d9d24a" stroke="#4a4600" stroke-width="3"><path d="M30 6 L54 24 L46 52 L14 52 L6 24 Z"/></g><path d="M16 26 L30 31 L18 38 Z" fill="#111"/><path d="M44 26 L30 31 L42 38 Z" fill="#111"/><circle cx="30" cy="46" r="3" fill="#ffe600"/></svg>';
                    DOM.wrapper.appendChild(el);
                    b.drones.push({ el, x: cxs - 20, y: cys, hp: 4, phaseOff: i * 2.1, lastShot: now + 600 + i * 400, rect: null });
                }
                showFloatingMessage(t('bossDrones'), cxs - 50, b.y - 14, '#d9d24a');
            } else if (pick === 'mines' && b.mines.length === 0) {
                const count = ph === 3 ? 4 : 3;
                for (let i = 0; i < count; i++) {
                    const el = document.createElement('div');
                    el.className = 'boss-mine';
                    el.innerHTML = '<svg viewBox="0 0 40 40" style="width:100%;height:100%" stroke-linejoin="round"><g fill="#555a66" stroke="#1d2027" stroke-width="3"><circle cx="20" cy="20" r="11"/><path d="M20 2 L20 9 M20 31 L20 38 M2 20 L9 20 M31 20 L38 20 M7 7 L12 12 M28 28 L33 33 M33 7 L28 12 M7 33 L12 28"/></g><circle cx="20" cy="20" r="4" fill="#ff4d2f"/></svg>';
                    DOM.wrapper.appendChild(el);
                    const mx = cxs + (i - (count - 1) / 2) * 90;
                    b.mines.push({ el, x: Math.max(30, Math.min(WW - 30, mx)), y: cys, vy: 1.5 + Math.random() * 0.4, rot: 0 });
                }
                showFloatingMessage(t('bossMines'), cxs - 40, b.y - 14, '#ff4d2f');
            } else if (pick === 'lightning') {
                const n = ph === 3 ? 4 : 3;
                for (let i = 0; i < n; i++) {
                    const zx = i === 0 ? state.playerX + 25 : Math.max(40, Math.min(WW - 40, state.playerX + 25 + (i % 2 ? 1 : -1) * (80 + Math.random() * 120)));
                    const el = document.createElement('div');
                    el.className = 'boss-zap warn';
                    el.style.left = (zx - 55) + 'px';
                    el.style.top = (H - 135) + 'px';
                    DOM.wrapper.appendChild(el);
                    b.zaps.push({ el, x: zx, state: 'warn', until: now + 900 + i * 220, hit: false });
                }
                showFloatingMessage(t('bossLightning'), cxs - 50, b.y - 14, '#9fd8ff');
            } else if (pick === 'burst') {
                b.burst.left = 3; b.burst.next = now;
                showFloatingMessage(t('bossBurst'), cxs - 40, b.y - 14, '#ff4d6a');
            }
        }

        const pr2 = state.playerRect || DOM.player.getBoundingClientRect();
        const px2 = state.playerX + 25, py2 = H - 55;
        const hitPlayer = (r) => !(r.right < pr2.left || r.left > pr2.right || r.bottom < pr2.top || r.top > pr2.bottom);

        // --- homing missiles: steer toward the player, can be shot down ---
        for (let i = b.missiles.length - 1; i >= 0; i--) {
            const m = b.missiles[i];
            const desired = Math.atan2(py2 - m.y, px2 - m.x);
            const cur = Math.atan2(m.vy, m.vx);
            let diff = desired - cur;
            while (diff > Math.PI) diff -= 2 * Math.PI;
            while (diff < -Math.PI) diff += 2 * Math.PI;
            const na = cur + Math.max(-0.045, Math.min(0.045, diff));
            const sp = Math.min(4.6, Math.hypot(m.vx, m.vy) + 0.03);
            m.vx = Math.cos(na) * sp; m.vy = Math.sin(na) * sp;
            m.x += m.vx; m.y += m.vy;
            m.el.style.left = (m.x - 10) + 'px'; m.el.style.top = (m.y - 18) + 'px';
            m.el.style.transform = `rotate(${na * 180 / Math.PI - 90 + 180}deg)`;
            const r = m.el.getBoundingClientRect();
            let dead = now - m.born > 7000 || m.y > H + 30;
            if (hitPlayer(r)) { damagePlayer(25, 'boss_missile'); dead = true; createExplosion(r.left, r.top, '#ff7a2e'); }
            if (!dead) {
                for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
                    const bu = state.bullets[bi], br = bu.rect || bu.el.getBoundingClientRect();
                    if (!(br.right < r.left || br.left > r.right || br.bottom < r.top || br.top > r.bottom)) {
                        bu.el.remove(); state.bullets.splice(bi, 1); dead = true; createExplosion(r.left, r.top, '#ffd21a'); break;
                    }
                }
            }
            if (dead) { m.el.remove(); b.missiles.splice(i, 1); }
        }

        // --- meteor rain: telegraphed columns, then a fireball drops down each ---
        for (let i = b.meteors.length - 1; i >= 0; i--) {
            const m = b.meteors[i];
            if (m.state === 'warn') {
                if (now > m.until) {
                    m.state = 'fall'; m.el.className = 'boss-meteor'; m.el.style.left = (m.x - 20) + 'px';
                    m.el.style.height = '40px'; m.y = -40; m.el.style.top = m.y + 'px';
                }
            } else {
                m.y += 13;
                m.el.style.top = m.y + 'px';
                const r = m.el.getBoundingClientRect();
                if (!m.hit && hitPlayer(r)) { m.hit = true; damagePlayer(35, 'boss_meteor'); createExplosion(r.left + 20, r.top + 20, '#ff4d2f'); }
                if (m.y > H + 20) { createExplosion(m.x, H - 20, '#ff7a2e'); m.el.remove(); b.meteors.splice(i, 1); }
            }
        }


        // --- storm burst: three quick rings ---
        if (b.burst.left > 0 && now > b.burst.next) {
            ring(cxs, cys, 18, 4.4, Math.random() * 20, ph);
            b.burst.left--; b.burst.next = now + 380;
        }

        // --- mines: drift down, explode near the player (or when shot) ---
        for (let i = b.mines.length - 1; i >= 0; i--) {
            const m = b.mines[i];
            m.y += m.vy; m.rot += 3;
            m.el.style.left = (m.x - 20) + 'px'; m.el.style.top = (m.y - 20) + 'px';
            m.el.style.transform = `rotate(${m.rot}deg)`;
            const r = m.el.getBoundingClientRect();
            let blow = m.y > H - 120 || hitPlayer(r);
            let shot = false;
            if (!blow) {
                for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
                    const bu = state.bullets[bi], br = bu.rect || bu.el.getBoundingClientRect();
                    if (!(br.right < r.left || br.left > r.right || br.bottom < r.top || br.top > r.bottom)) { bu.el.remove(); state.bullets.splice(bi, 1); blow = true; shot = true; break; }
                }
            }
            if (blow) {
                const cx0 = r.left + r.width / 2, cy0 = r.top + r.height / 2;
                createExplosion(cx0, cy0, '#ff7a2e'); createExplosion(cx0, cy0, '#ffd21a'); createExplosion(cx0, cy0, '#fff');
                shockwave(cx0, cy0, '#ff7a2e', 200);
                if (Math.hypot(px2 - m.x, py2 - m.y) < 100) damagePlayer(45, 'boss_mine');
                m.el.remove(); b.mines.splice(i, 1);
            }
        }

        // --- lightning: marked ground circles, then a bolt strikes ---
        for (let i = b.zaps.length - 1; i >= 0; i--) {
            const z = b.zaps[i];
            if (z.state === 'warn') {
                if (now > z.until) { z.state = 'strike'; z.until = now + 260; z.el.className = 'boss-zap strike'; shake(180); if (!z.hit && Math.abs(px2 - z.x) < 55) { z.hit = true; damagePlayer(40, 'boss_lightning'); } }
            } else if (now > z.until) { z.el.remove(); b.zaps.splice(i, 1); }
        }

        // --- drones: hover near the boss, take shots, shoot back ---
        for (let i = b.drones.length - 1; i >= 0; i--) {
            const d = b.drones[i];
            const tx = cxs + Math.sin(now / 700 + d.phaseOff) * 150, ty = b.y + W + 40 + Math.sin(now / 500 + d.phaseOff) * 25;
            d.x += (tx - d.x) * 0.05; d.y += (ty - d.y) * 0.05;
            d.el.style.left = (d.x - 20) + 'px'; d.el.style.top = (d.y - 20) + 'px';
            const r = d.rect = d.el.getBoundingClientRect();
            if (!calmNow && now - d.lastShot > 1600) { fire(d.x, d.y + 12, aimedAngle(d.x, d.y), 4.2, ph); d.lastShot = now; }
            for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
                const bu = state.bullets[bi], br = bu.rect || bu.el.getBoundingClientRect();
                if (br.right < r.left || br.left > r.right || br.bottom < r.top || br.top > r.bottom) continue;
                d.hp -= bu.damage || 1; bu.el.remove(); state.bullets.splice(bi, 1);
                createExplosion(br.left, br.top, '#ffe600');
            }
            if (d.hp <= 0) {
                createExplosion(r.left + 20, r.top + 20, '#ffd21a'); createExplosion(r.left + 20, r.top + 20, '#fff');
                addScore(100); DOM.scoreEl.innerText = state.score;
                d.el.remove(); b.drones.splice(i, 1);
            }
        }
    }

    // ---- healing pickups: drift down from the boss; fly into one to repair ----
    if (!b.enter) {
        if (now > b.nextPickup && b.pickups.length < 2) {
            const el = document.createElement('div');
            el.className = 'boss-heal';
            el.textContent = '✚';
            const px = 40 + Math.random() * (WW - 100);
            el.style.left = px + 'px';
            el.style.top = (b.y + W * 0.8) + 'px';
            DOM.wrapper.appendChild(el);
            b.pickups.push({ el, x: px, y: b.y + W * 0.8 });
            b.nextPickup = now + (state.playerHP < state.playerMaxHP * 0.5 ? 3500 : 5500);
        }
        const pr = state.playerRect || DOM.player.getBoundingClientRect();
        for (let i = b.pickups.length - 1; i >= 0; i--) {
            const pk = b.pickups[i];
            pk.y += 2.4;
            pk.el.style.top = pk.y + 'px';
            const r = pk.el.getBoundingClientRect();
            const hit = !(r.right < pr.left || r.left > pr.right || r.bottom < pr.top || r.top > pr.bottom);
            if (hit) {
                const heal = Math.round(state.playerMaxHP * 0.4);
                state.playerHP = Math.min(state.playerMaxHP, state.playerHP + heal);
                updateHPUI();
                showFloatingMessage(`+${heal} HP`, pk.x - 10, pk.y - 20, 'var(--health)');
                createExplosion(r.left + 15, r.top + 15, '#34e89e');
                createExplosion(r.left + 15, r.top + 15, '#ffffff');
            }
            if (hit || pk.y > H + 20) { pk.el.remove(); b.pickups.splice(i, 1); }
        }
    }

    // ---- render ----
    b.el.style.left = b.x + 'px';
    b.el.style.top = b.y + 'px';
    // lean into the movement
    const vx = b.x - b.prevX; b.prevX = b.x;
    b.tilt += (Math.max(-14, Math.min(14, vx * 1.4)) - b.tilt) * 0.2;
    b.body.style.transform = `rotate(${b.tilt}deg)`;
    const rect = b.rect = b.el.getBoundingClientRect();
    const exposedNow = now < b.weakUntil;
    b.el.classList.toggle('boss-weak', exposedNow);

    // ---- player contact (rush) ----
    const pRect = state.playerRect || DOM.player.getBoundingClientRect();
    if (b.dash.state === 'rush' && !b.dash.hit &&
        !(rect.right < pRect.left || rect.left > pRect.right || rect.bottom < pRect.top || rect.top > pRect.bottom)) {
        b.dash.hit = true;
        damagePlayer(90, 'boss_dash');
        createExplosion(pRect.left + 25, pRect.top + 25, '#ff4d6a');
    }

    // ---- player bullets ----
    if (!b.enter) {
        const mult = exposedNow ? EXPOSED_MULT : 1;
        for (let i = state.bullets.length - 1; i >= 0; i--) {
            const bul = state.bullets[i];
            const r = bul.rect || bul.el.getBoundingClientRect();
            if (r.right < rect.left || r.left > rect.right || r.bottom < rect.top || r.top > rect.bottom) continue;
            if (!b.shield.on) { b.hp -= Math.min(bul.damage || 1, MAX_HIT) * mult; b.hitUntil = now + 80; }
            createExplosion(r.left, r.top, b.shield.on ? '#7fe9ff' : (exposedNow ? '#ffe600' : (bul.isFeather ? '#ff6b35' : 'white')));
            bul.el.remove();
            state.bullets.splice(i, 1);
        }
        for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
            const eb = state.enemyBullets[i];
            if (!eb.ricochet) continue;
            const r = eb.rect || eb.el.getBoundingClientRect();
            if (r.right < rect.left || r.left > rect.right || r.bottom < rect.top || r.top > rect.bottom) continue;
            if (!b.shield.on) { b.hp -= Math.min(eb.damage || 40, MAX_HIT * 2) * mult; b.hitUntil = now + 80; }
            createExplosion(eb.x, eb.y, '#ffaa33');
            eb.el.remove();
            state.enemyBullets.splice(i, 1);
        }
    }

    b.el.classList.toggle('boss-hit', now < b.hitUntil);
    b.hp = Math.max(0, b.hp);
    b.hudFill.style.width = (b.hp / b.maxHP * 100) + '%';
    b.hudFill.dataset.phase = b.phase;
    b.hudFill.classList.toggle('exposed', exposedNow);
    if (b.hp <= 0 && !b.enter) startDeath(b, now);
}
