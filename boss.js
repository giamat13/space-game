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
import { showBanner, confettiBurst, shockwave } from './fx.js';

export const BOSS_LEVEL = 30;
const W = 170;            // boss sprite size (px)
const Y = 125;            // resting height (below the player HUD)
const BOSS_HP_PER_POWER = 100; // boss HP = this x ship power (damage x fire rate). Sustained player dps is ~2.5 x power (ammo-limited), so ~140 => a fight of roughly a minute
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

function removeBossDom(b) {
    if (!b) return;
    b.beam.el?.remove();
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
        spiral: { left: 0, angle: 0, next: 0, nextStart: now + 6000 }
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
    state.enemyBullets.push({ el, x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, friendly: false, chaotic: false, shooterId: null, dmg: 7 + phase });
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
    b.dyingUntil = now + 1700;
    b.hp = 0;
    b.el.classList.remove('boss-warn', 'boss-shielded', 'boss-blink');
    b.el.classList.add('boss-dying');
    if (b.beam.el) { b.beam.el.remove(); b.beam.el = null; }
    clearBossBullets();
    state.enemyBullets.forEach(eb => eb.el.remove()); state.enemyBullets = [];
    showFloatingMessage('…', b.x + W / 2, b.y, '#fff');
}

function finishDeath(b) {
    const r = b.el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    flash('#fff', 900);
    shake(900);
    confettiBurst(cx, cy, { count: 110, spread: 480 });
    setTimeout(() => confettiBurst(cx - 80, cy + 20, { count: 40 }), 250);
    setTimeout(() => confettiBurst(cx + 80, cy + 20, { count: 40 }), 450);
    shockwave(cx, cy, '#ffd166', 640);
    shockwave(cx, cy, '#ffffff', 420);
    shockwave(cx, cy, '#c04dff', 760);

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
        b.el.style.left = (b.x + (Math.random() - 0.5) * 10) + 'px';
        if (Math.random() < 0.55) {
            createExplosion(b.x + Math.random() * W, b.y + Math.random() * W, Math.random() < 0.5 ? '#ffd21a' : '#ff4d6a');
        }
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
                let dir = bx < bcx ? 1 : -1;
                const room = dir > 0 ? (WW - W - 10 - b.x) : (b.x - 10);
                if (room < 90) dir = -dir;
                b.dodgeTarget = dir * 150;
                b.dodgeReset = now + 550;
                b.dodgeCd = now + (ph === 1 ? 1100 : ph === 2 ? 800 : 600);
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
            if (!bm.hit && Math.abs(px - bm.x) < 42) { bm.hit = true; damagePlayer(45, 'boss_beam'); }
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
        damagePlayer(45, 'boss_dash');
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
