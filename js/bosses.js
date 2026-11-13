// ===== BOSS ENGINE =====
// Runs every boss fight. The bosses themselves (art, attack decks, signature mechanic) are
// data in boss-roster.js; this file owns everything they share: the schedule, the arena,
// the attack / telegraph toolkit (`K`), hit detection, phases, the HUD, death and rewards.
//
// Conventions
//   • Coordinates are arena pixels (relative to #game-wrapper). The player only moves along X.
//   • Time is the boss clock `b.t` (ms). It advances one fixed step per game tick, so pausing
//     the game pauses every telegraph and cooldown with it.
//   • Boss shots go through state.enemyBullets, so the normal bullet movement, player-damage
//     and dragon-ricochet code handles them unchanged.
//   • Fairness: every attack is either a slow visible projectile or has a warn phase.
import { DOM, state, addScore, addCoins } from './data.js';
import { createExplosion, showFloatingMessage, damagePlayer, updateHPUI, updateAmmoUI, pushPlayer } from './systems.js';
import { t, tf } from './i18n.js';
import { showBanner, confettiBurst, shockwave, lightBeams, xpOrbs, trophy } from './fx.js';
import { ROSTER, MILESTONES, MUTATIONS } from './boss-roster.js';

const TICK = 1000 / 60;
const ARENA_HP = 600;        // boss hits are heavy: max HP is raised to at least this for the fight
const MAX_HIT = 9;           // one projectile never takes more than this (no one-shots)
const EXPOSED_MULT = 2;      // damage multiplier while the boss is exposed
const HP_PER_POWER = 230;    // boss HP = this × ship power → roughly a one-minute fight for every ship
const REST_Y = 112;          // resting height, below the HUD
const HITBOX = 14;           // half-width of the player's hit zone for beams / strikes (smaller than the sprite)
const MILESTONE_LEVELS = [100, 250, 500, 750, 1000];

// ---------- schedule ----------
// Encounter n: level 10, then every 25 levels. Milestone bosses take the slots at
// 100 / 250 / 500 / 750 / 1000, then every 250 levels forever.
export const bossLevel = (n) => (n <= 0 ? 10 : n * 25);
const isMilestone = (level) => MILESTONE_LEVELS.includes(level) || (level > 1000 && level % 250 === 0);

function pickMutations(seed, count, def) {
    const pool = Object.keys(MUTATIONS).filter(k => !(def.noMut || []).includes(k));
    const out = [];
    for (let i = 0; out.length < count && i < 20; i++) {
        const k = pool[(seed * 7 + i * 3 + count) % pool.length];
        if (!out.includes(k)) out.push(k);
    }
    return out;
}

export function encounter(n) {
    const level = bossLevel(n);
    if (isMilestone(level)) {
        const mi = level <= 1000 ? MILESTONE_LEVELS.indexOf(level) : 4 + (level - 1000) / 250;
        const def = MILESTONES[mi % MILESTONES.length], tier = 1 + Math.floor(mi / MILESTONES.length);
        return { n, level, def, tier, milestone: true, d: 1, muts: tier > 1 ? pickMutations(mi, Math.min(3, tier - 1), def) : [] };
    }
    let r = n;
    for (let i = 0; i < n; i++) if (isMilestone(bossLevel(i))) r--;
    const def = ROSTER[r % ROSTER.length], tier = 1 + Math.floor(r / ROSTER.length);
    return { n, level, def, tier, milestone: false, d: Math.min(1, r / (ROSTER.length - 1)), muts: tier > 1 ? pickMutations(r, Math.min(3, tier - 1), def) : [] };
}

// First encounter that is still ahead of `level` (used when a run starts above level 1).
export const firstEncounterFrom = (level) => { let n = 0; while (bossLevel(n) < level) n++; return n; };

// ---------- small helpers ----------
let WR = { left: 0, top: 0 };   // wrapper rect, cached once per tick
const overlap = (a, b) => !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
const rectOf = (o) => ({ left: WR.left + o.x, top: WR.top + o.y, right: WR.left + o.x + o.w, bottom: WR.top + o.y + o.h });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);

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

// ---------- the toolkit bosses are written with ----------
export const K = {
    W: 500, H: 800, rnd, clamp,
    px: () => state.playerX + 25,
    py: () => K.H - 55,
    mouth: (b) => ({ x: b.x + b.w / 2, y: b.y + b.h * 0.82 }),
    mid: (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 }),
    aim: (x, y) => Math.atan2(K.py() - y, K.px() - x) * 180 / Math.PI,
    // difficulty-scaled count: base at the first boss, +extra at the hardest, +1 per extra tier/phase where asked
    n: (b, base, extra = 0) => Math.round(base + extra * b.enc.d + (b.enc.tier - 1)),
    after(b, ms, fn) { b.q.push({ at: b.t + ms, fn }); },
    every(b, n, gap, fn) { for (let i = 0; i < n; i++) K.after(b, i * gap, () => fn(i)); return n * gap; },
    say(b, key, color = '#ffe600') { showFloatingMessage(t(key), b.x + b.w / 2 - 50, Math.max(70, b.y - 14), color); },
    hurt: (amount, src = 'boss') => damagePlayer(amount, src),
    // sideways force on the ship; for pointer control the displacement is capped at `bound` px
    push: (dx, bound = 170) => pushPlayer(dx, bound),
    // hit points for something the player must shoot, scaled so every ship needs about the same time
    hp: (b, n) => Math.max(1, Math.round(n * b.power)),
    // direct damage from a shot that hit a vulnerable part (heads, cores)
    strike(b, dmg) { if (b.enter || b.dying) return; b.hp -= Math.min(dmg, MAX_HIT) * (b.t < b.weakUntil ? EXPOSED_MULT : 1); b.hitUntil = b.t + 80; },
    boom: (x, y, color = '#fff') => createExplosion(WR.left + x, WR.top + y, color),
    shock: (x, y, color = '#ffd166', size = 300) => shockwave(WR.left + x, WR.top + y, color, size),
    shake, flash,

    fire(b, x, y, deg, speed, o = {}) {
        const a = deg * Math.PI / 180;
        const el = document.createElement('div');
        el.className = 'enemy-bullet boss-bullet';
        el.dataset.p = b.phase;
        if (o.k) el.dataset.k = o.k;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.transform = `rotate(${deg - 90}deg)`;
        DOM.wrapper.appendChild(el);
        const eb = { el, x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, friendly: false, chaotic: false, shooterId: null, dmg: o.dmg ?? (30 + 10 * b.phase), boss: true };
        state.enemyBullets.push(eb);
        return eb;
    },
    fan(b, n, spread, speed, o = {}) {
        const m = o.from || K.mouth(b), a = o.deg ?? K.aim(m.x, m.y);
        for (let i = 0; i < n; i++) K.fire(b, m.x, m.y, a + (n === 1 ? 0 : -spread / 2 + spread * i / (n - 1)), speed, o);
    },
    ring(b, n, speed, o = {}) {
        const m = o.from || K.mouth(b), off = o.deg ?? Math.random() * 360;
        for (let i = 0; i < n; i++) K.fire(b, m.x, m.y, off + 360 / n * i, speed, o);
    },
    // a rotating stream with natural gaps to slip through
    spiral(b, n, step, gap, speed, o = {}) {
        const a0 = o.deg ?? Math.random() * 360;
        return K.every(b, n, gap, (i) => { const m = o.from ? o.from() : K.mouth(b); K.fire(b, m.x, m.y, a0 + step * i, speed, o); });
    },
    // a curtain of shots with a gap near (not exactly on) the player
    wall(b, o = {}) {
        const step = 38, n = Math.floor((K.W - 20) / step), gapW = o.gapW ?? 5;
        const at = o.gapAt ?? (K.px() + rnd(-80, 80));
        const g = clamp(Math.round(at / step), Math.ceil(gapW / 2), n - Math.ceil(gapW / 2) - 1);
        for (let i = 0; i < n; i++) {
            if (Math.abs(i - g) <= Math.floor(gapW / 2)) continue;
            K.fire(b, 14 + i * step, o.y ?? (b.y + b.h * 0.8), 90, o.speed ?? 3.1, o);
        }
    },
    // shots falling from the top edge at random columns
    rain(b, n, gap, speed, o = {}) {
        return K.every(b, n, gap, () => K.fire(b, rnd(16, K.W - 16), -8, 90 + rnd(-6, 6), speed, o));
    },
    clearBullets() {
        for (const eb of state.enemyBullets) {
            if (eb.ricochet) continue;
            K.boom(eb.x, eb.y, '#ffd21a');
            eb.el.remove();
        }
        state.enemyBullets = state.enemyBullets.filter(eb => eb.ricochet);
    },

    // ----- generic arena object: hazards, minions, parts, shields -----
    // { cls, html, x, y, w, h, hp?, block?, haz?, part?, touch?, update(o), onHit(o, bul), onDeath(o) }
    //   hp     → can be shot and destroyed          block → stops player shots (even with no hp)
    //   haz    → removed on phase change            part  → follows the boss (ox / oy offsets)
    //   touch  → damage dealt once on contact with the player
    obj(b, o) {
        const el = document.createElement('div');
        el.className = 'bo ' + (o.cls || '');
        if (o.html) el.innerHTML = o.html;
        el.style.width = o.w + 'px';
        el.style.height = o.h + 'px';
        DOM.wrapper.appendChild(el);
        o.el = el;
        o.maxHP = o.hp;
        o.born = b.t;
        b.objs.push(o);
        if (o.part) { o.x = b.x + o.ox; o.y = b.y + o.oy; }
        el.style.transform = `translate3d(${o.x}px,${o.y}px,0)`;
        return o;
    },
    // telegraphed vertical beam. Follows the player during the first part of the warning.
    beam(b, o = {}) {
        const w = o.w ?? 80, warn = o.warn ?? 1100, dur = o.dur ?? 520, dmg = o.dmg ?? 260, track = o.track ?? 0.15;
        const fromBoss = o.top == null;
        K.obj(b, {
            cls: 'boss-beam warn ' + (o.cls || ''), haz: true, x: (o.x ?? K.px()) - w / 2, y: fromBoss ? b.y + b.h * 0.7 : o.top, w, h: K.H,
            update(s) {
                const age = b.t - s.born;
                if (track && age < warn - 320) s.x += (K.px() - w / 2 - s.x) * track;
                if (fromBoss) s.y = b.y + b.h * 0.7;
                if (!s.fired && age >= warn) { s.fired = true; s.el.className = 'bo boss-beam fire ' + (o.cls || ''); if (!o.quiet) shake(300); }
                if (s.fired && !s.hit && Math.abs(K.px() - (s.x + w / 2)) < w / 2 + HITBOX) { s.hit = true; K.hurt(dmg, 'boss_beam'); }
                return age < warn + dur;
            }
        });
        return warn + dur;
    },
    // the arena is cut into columns; every column except the safe ones is struck
    lanes(b, o = {}) {
        const n = o.n ?? 5, lw = K.W / n, safe = o.safe ?? [Math.floor(Math.random() * n)];
        for (let i = 0; i < n; i++) {
            if (safe.includes(i)) continue;
            K.beam(b, { x: i * lw + lw / 2, w: lw - 6, top: 0, track: 0, warn: o.warn ?? 1300, dur: o.dur ?? 420, dmg: o.dmg ?? 150, cls: 'lane ' + (o.cls || ''), quiet: i > 0 });
        }
        return (o.warn ?? 1300) + (o.dur ?? 420);
    },
    // marked circle on the player's line, then a strike
    zap(b, x, o = {}) {
        const r = o.r ?? 52, warn = o.warn ?? 900, dmg = o.dmg ?? 70;
        K.obj(b, {
            cls: 'boss-zap warn ' + (o.cls || ''), haz: true, x: x - r, y: 0, w: r * 2, h: K.H,
            update(s) {
                const age = b.t - s.born;
                if (!s.fired && age >= warn) { s.fired = true; s.el.className = 'bo boss-zap strike ' + (o.cls || ''); if (Math.abs(K.px() - x) < r + HITBOX - 6) K.hurt(dmg, 'boss_zap'); }
                return age < warn + 260;
            }
        });
        return warn + 260;
    },
    // slow homing rocket; can be shot down
    missile(b, x, y, o = {}) {
        return K.obj(b, {
            cls: 'boss-missile', haz: true, x: x - 13, y: y - 13, w: 26, h: 26, hp: o.hp ?? 2, a: o.deg ?? 90, sp: o.speed ?? 2.5,
            update(s) {
                const cx = s.x + 13, cy = s.y + 13;
                let diff = K.aim(cx, cy) - s.a;
                while (diff > 180) diff -= 360;
                while (diff < -180) diff += 360;
                s.a += clamp(diff, -1.7, 1.7);
                s.sp = Math.min(4.4, s.sp + 0.012);
                s.x += Math.cos(s.a * Math.PI / 180) * s.sp;
                s.y += Math.sin(s.a * Math.PI / 180) * s.sp;
                s.rot = s.a - 90;
                if (Math.hypot(cx - K.px(), cy - K.py()) < 30) { K.hurt(o.dmg ?? 45, 'boss_missile'); K.boom(cx, cy, '#ff7a2e'); return false; }
                return s.y < K.H + 30 && b.t - s.born < 9000;
            },
            onDeath(s) { K.boom(s.x + 13, s.y + 13, '#ffd21a'); addScore(40); }
        });
    },
    // drifting mine: explodes when shot or when the player gets close (after a short fuse)
    mine(b, x, y, o = {}) {
        const R = o.r ?? 95;
        return K.obj(b, {
            cls: 'boss-mine ' + (o.cls || ''), haz: true, x: x - 17, y: y - 17, w: 34, h: 34, hp: o.hp ?? 2, ty: o.ty ?? rnd(K.H * 0.45, K.H - 150), vy: o.vy ?? 2.2,
            update(s) {
                if (s.y < s.ty) s.y += s.vy;
                const cx = s.x + 17, cy = s.y + 17;
                if (!s.fuse && Math.hypot(cx - K.px(), cy - K.py()) < R * 0.8) { s.fuse = b.t + 650; s.el.classList.add('armed'); }
                if (s.fuse && b.t > s.fuse) { s.blow = true; return false; }
                return b.t - s.born < (o.life ?? 11000);
            },
            onDeath(s) { s.blow = true; },
            onGone(s) {
                if (!s.blow) return;
                const cx = s.x + 17, cy = s.y + 17;
                K.boom(cx, cy, '#ff7a2e'); K.boom(cx, cy, '#ffd21a'); K.shock(cx, cy, '#ff7a2e', R * 2);
                if (Math.hypot(cx - K.px(), cy - K.py()) < R) K.hurt(o.dmg ?? 45, 'boss_mine');
                o.onBlow?.(cx, cy, s);
            }
        });
    },
    // small escort that hovers near the boss, blocks shots and fires back
    drone(b, o = {}) {
        const ph = Math.random() * 6.28;
        return K.obj(b, {
            cls: 'boss-drone ' + (o.cls || ''), x: b.x + b.w / 2 - 20, y: b.y + b.h / 2, w: 40, h: 40, hp: o.hp ?? 5, block: true, last: b.t + rnd(300, 1400), drone: true,
            update(s) {
                const R = o.orbit ?? 130, sp = o.spin ?? 760;
                const tx = b.x + b.w / 2 + Math.sin(b.t / sp + ph) * R - 20, ty = b.y + b.h + 26 + Math.cos(b.t / (sp * 0.7) + ph) * 24;
                s.x += (tx - s.x) * 0.06; s.y += (ty - s.y) * 0.06;
                if (!o.mute && !b.calm && b.t - s.last > (o.rate ?? 1900)) { s.last = b.t; K.fire(b, s.x + 20, s.y + 34, K.aim(s.x + 20, s.y + 34), 4.0, { k: 'drone', dmg: 30 }); }
                return true;
            },
            onDeath(s) { K.boom(s.x + 20, s.y + 20, '#ffd21a'); K.boom(s.x + 20, s.y + 20, '#fff'); addScore(100); o.onDeath?.(s); }
        });
    },
    // marked column, then a rock comes down it
    meteor(b, x, o = {}) {
        const warn = o.warn ?? 850;
        K.obj(b, { cls: 'boss-mark', haz: true, x: x - 30, y: K.H - 78, w: 60, h: 24, update: (s) => b.t - s.born < warn + 500 });
        K.after(b, warn, () => K.obj(b, {
            cls: 'boss-meteor', haz: true, x: x - 22, y: -50, w: 44, h: 44, hp: o.hp ?? 4,
            update(s) {
                s.y += o.speed ?? 9; s.rot = (s.rot || 0) + 7;
                if (!s.hit && Math.abs(s.x + 22 - K.px()) < 22 + HITBOX && s.y + 44 > K.H - 80 && s.y < K.H - 30) { s.hit = true; K.hurt(o.dmg ?? 60, 'boss_meteor'); K.boom(s.x + 22, s.y + 22, '#ff9d3c'); return false; }
                return s.y < K.H;
            },
            onDeath(s) { K.boom(s.x + 22, s.y + 22, '#ff9d3c'); }
        }));
        return warn + 500;
    },
    count: (b, flag) => b.objs.filter(o => o[flag]).length,

    // ----- boss state helpers -----
    expose(b, ms) { b.weakUntil = Math.max(b.weakUntil, b.t + ms); K.say(b, 'bossWeak'); },
    calm(b, ms) { b.calmUntil = Math.max(b.calmUntil, b.t + ms); },
    shield(b, on) { b.shieldOn = on; b.el.classList.toggle('boss-shielded', on); if (on) K.say(b, 'bossShield', '#7fe9ff'); },
    busy(b, ms) { b.busyUntil = Math.max(b.busyUntil, b.t + ms); },
    // heal the boss (leeching mechanics). Never crosses back over a phase boundary.
    heal(b, amount) { const cap = b.maxHP * (b.phase === 1 ? 1 : b.phase === 2 ? 0.66 : 0.33); b.hp = Math.min(cap, b.hp + amount); },
    // boss-side damage that is not a player shot (its own mines, returned orbs…)
    wound(b, fraction, color = '#ffe600') { if (b.enter || b.dying) return; b.hp -= b.maxHP * fraction; b.hitUntil = b.t + 160; const m = K.mid(b); K.boom(m.x, m.y, color); K.shock(m.x, m.y, color, 240); },
};

// ---------- HUD / DOM ----------
function ensureHud(b) {
    let hud = document.getElementById('boss-hud');
    if (!hud) {
        hud = document.createElement('div');
        hud.id = 'boss-hud';
        hud.innerHTML = '<div class="boss-hud-top"><span class="boss-hud-name"></span><span class="boss-hud-tag"></span></div>' +
            '<div class="boss-hud-bar"><div class="boss-hud-fill"></div><i style="left:33.3%"></i><i style="left:66.6%"></i></div>';
        DOM.wrapper.appendChild(hud);
    }
    hud.style.setProperty('--bc', b.def.color);
    hud.querySelector('.boss-hud-name').textContent = bossName(b.enc);
    hud.querySelector('.boss-hud-tag').textContent = `${t('levelWord')} ${b.enc.level}`;
    hud.classList.toggle('milestone', !!b.enc.milestone);
    return hud;
}

export function bossName(enc) {
    const base = t('bn_' + enc.def.id);
    return enc.tier > 1 ? tf('bossAscended', { name: base, n: enc.tier }) : base;
}

function removeBossDom(b) {
    if (!b) return;
    b.objs.forEach(o => o.el.remove());
    b.objs = [];
    b.pickups.forEach(p => p.el.remove());
    b.beams?.end(0);
    b.def.cleanup?.(b, K);
    b.el.remove();
    document.getElementById('boss-hud')?.remove();
    document.getElementById('boss-intro')?.remove();
    DOM.wrapper.classList.remove('boss-fight');
    DOM.wrapper.style.removeProperty('--bc');
    state.ctrl.min = state.ctrl.max = null;
    state.ctrl.lag = 0;
    state.ctrl.release = true;       // let the ship glide back under the pointer
    state.ammoRate = 1;
}

export function resetBoss() {
    removeBossDom(state.boss);
    state.boss = null;
    state.bossIndex = null;      // worked out from the level on the first tick of the run
    state.bossesBeaten = 0;
    state.bossLog = [];
    state.bossDone = false;
}

// Game over: remove the boss from the screen but keep the run's boss results for saving.
export function hideBoss() {
    const b = state.boss;
    if (b) window.__onBossEvent?.('lost', { id: b.def.id, level: b.enc.level, tier: b.enc.tier, hpLeft: Math.round(b.hp / b.maxHP * 100), ms: Math.round(b.t) });
    removeBossDom(b);
    state.boss = null;
}

// Clears the field before the duel: the regular swarm scatters.
function clearField() {
    for (const list of ['enemies', 'asteroids', 'burgers', 'lightnings', 'ingredients']) {
        for (const e of state[list]) {
            const r = e.el.getBoundingClientRect();
            createExplosion(r.left + r.width / 2, r.top + r.height / 2, '#9fb4ff');
            e.el.remove();
        }
        state[list] = [];
    }
    for (const eb of state.enemyBullets) eb.el.remove();
    state.enemyBullets = [];
}

function showIntro(b) {
    const el = document.createElement('div');
    el.id = 'boss-intro';
    el.style.setProperty('--bc', b.def.color);
    el.innerHTML = `<div class="bi-warn">${t('bossWarning')}</div><div class="bi-art">${b.def.art()}</div>` +
        `<div class="bi-name">${bossName(b.enc)}</div><div class="bi-title">${t('bt_' + b.def.id)}</div>`;
    DOM.wrapper.appendChild(el);
    setTimeout(() => el.classList.add('out'), 2300);
    setTimeout(() => el.remove(), 2900);
}

function spawn(enc) {
    const def = enc.def;
    const fit = Math.min(1, (K.W - 50) / (def.size || 150));          // wide bosses shrink to fit narrow phones
    const w = Math.round((def.size || 150) * fit), h = Math.round((def.h || def.size || 150) * fit);
    const stats = state.currentSkinStats || { fireRate: 1, bulletDamage: 1 };
    const power = Math.max(1, (stats.bulletDamage || 1) * (stats.fireRate || 1));
    const maxHP = Math.round(HP_PER_POWER * power * (def.hp || 1) * (1 + 0.1 * (enc.tier - 1)));

    const el = document.createElement('div');
    el.className = 'boss entering' + (enc.tier > 1 ? ' ascended' : '') + (enc.milestone ? ' milestone' : '');
    el.dataset.id = def.id;
    el.dataset.phase = '1';
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    el.style.setProperty('--bc', def.color);
    if (enc.tier > 1) el.style.setProperty('--hue', ((enc.tier - 1) * 70) + 'deg');
    el.innerHTML = `<div class="boss-aura"></div><div class="boss-body">${def.art()}</div><div class="boss-shield"></div>`;
    DOM.wrapper.appendChild(el);
    DOM.wrapper.classList.add('boss-fight');
    DOM.wrapper.style.setProperty('--bc', def.color);

    const b = state.boss = {
        def, enc, el, body: el.querySelector('.boss-body'), w, h, power, baseEase: 0.08,
        x: K.W / 2 - w / 2, y: -h - 30, tx: K.W / 2 - w / 2, ty: REST_Y, prevX: 0, tilt: 0, ease: 0.08,
        hp: maxHP, maxHP, phase: 1, t: 0, t0: 0,
        enter: true, dying: false, hitUntil: 0, weakUntil: 0, calmUntil: 0, busyUntil: 0, calm: false,
        inv: false, shieldOn: false, frozen: false, hidden: false,
        q: [], objs: [], pickups: [], nextPickup: 5000, nextCard: 1500, cardI: 0, nextMut: 7000, mutI: 0,
        origMaxHP: state.playerMaxHP, s: {}
    };
    b.hudFill = ensureHud(b).querySelector('.boss-hud-fill');
    render(b);

    clearField();
    if (state.playerMaxHP < ARENA_HP) {
        state.playerMaxHP = ARENA_HP;
        state.playerHP = ARENA_HP;
        updateHPUI();
        setTimeout(() => showFloatingMessage(tf('bossArenaHP', { n: ARENA_HP }), K.W / 2 - 80, K.H - 170, 'var(--health)'), 900);
    }
    showIntro(b);
    flash(def.color, 700);
    shake(900);
    window.__onBossEvent?.('start', { id: def.id, level: enc.level, tier: enc.tier });
}

function render(b) {
    b.el.style.transform = `translate3d(${b.x}px,${b.y}px,0)`;
}

// ---------- phases ----------
function phaseChange(b, phase) {
    b.phase = phase;
    b.el.dataset.phase = String(phase);
    b.calmUntil = b.t + 1500;
    b.weakUntil = Math.max(b.weakUntil, b.t + 1500);
    b.busyUntil = 0;
    // Attacks in progress are cancelled, so everything they may have left half-done is reset here.
    b.q = [];
    b.nextCard = b.t + 1800;
    b.cardI = 0;
    for (const o of b.objs) if (o.haz) { o.gone = true; }
    K.clearBullets();
    K.shield(b, false);
    b.frozen = b.hidden = false;
    b.ease = b.baseEase;
    b.el.classList.remove('boss-warn', 'boss-blink', 'boss-hidden', 'venting', 'swapping', 'charging', 'glint', 'reflecting', 'maw-open');
    Object.assign(b.s, { mirror: false, open: false, charging: false, dive: false, clonesUntil: 0, pullUntil: 0, darkUntil: 0, corridor: null, chargeUntil: 0 });
    state.ctrl.lag = 0;
    state.ctrl.min = state.ctrl.max = null;
    DOM.wrapper.classList.remove('icy', 'pulling');
    document.getElementById('boss-dark')?.classList.add('off');
    b.def.onPhase?.(b, K, phase);
    const m = K.mid(b), color = phase === 3 ? '#ff4d2f' : '#ffd21a';
    K.shock(m.x, m.y, color, 600);
    shake(700);
    flash(color, 450);
    showBanner(t(phase === 3 ? 'bossPhase3' : 'bossPhase2'), { color, ms: 1800, shake: true });
    // second wind for the player
    const heal = Math.round(state.playerMaxHP * 0.25);
    state.playerHP = Math.min(state.playerMaxHP, state.playerHP + heal);
    updateHPUI();
    showFloatingMessage(`+${heal} HP`, K.W / 2 - 30, K.H - 160, 'var(--health)');
}

// ---------- damage ----------
// `hit` = { dmg, x (arena X of the shot), ability, ricochet }. A boss's onHit may return:
//   a number (damage multiplier, 0 = blocked) or 'reflect' (the shot is sent back).
function hitBoss(b, hit) {
    if (b.enter || b.dying) return 0;
    let m = b.inv || b.shieldOn ? 0 : 1;
    const custom = b.def.onHit?.(b, K, hit);
    if (custom !== undefined && m !== 0) m = custom;
    if (m === 'reflect') return 'reflect';
    if (!m) return 0;
    if (b.t < b.weakUntil) m *= EXPOSED_MULT;
    const dmg = hit.ability ? b.maxHP * hit.dmg : Math.min(hit.dmg, hit.ricochet ? MAX_HIT * 2 : MAX_HIT);
    b.hp -= dmg * m;
    b.hitUntil = b.t + 80;
    return m;
}
// Ship abilities (vortex laser, dragon fire, joker chaos) deal a fraction of the boss' max HP.
window.__damageBoss = (fraction) => { if (state.boss) hitBoss(state.boss, { dmg: fraction, ability: true }); };

// ---------- death ----------
function startDeath(b) {
    b.dying = true;
    b.dyingStart = b.t;
    b.dyingUntil = b.t + 3300;
    const m = K.mid(b);
    b.beams = lightBeams(WR.left + m.x, WR.top + m.y);
    shake(3300);
    b.hp = 0;
    b.el.classList.remove('boss-warn', 'boss-shielded', 'boss-weak', 'boss-hidden');
    b.el.classList.add('boss-dying');
    b.el.style.opacity = '1';
    b.q = [];
    b.objs.forEach(o => { if (!o.el.classList.contains('boss-beam')) K.boom(o.x + o.w / 2, o.y + o.h / 2, '#ffd21a'); o.el.remove(); });
    b.objs = [];
    state.enemyBullets.forEach(eb => eb.el.remove());
    state.enemyBullets = [];
    state.ctrl.min = state.ctrl.max = null;
    state.ctrl.lag = 0;
    state.ammoRate = 1;
    b.def.cleanup?.(b, K);
}

const TROPHY_KEY = 'bossTrophies_v1';
export function getBossTrophies() {
    try { return JSON.parse(localStorage.getItem(TROPHY_KEY) || '{}'); } catch { return {}; }
}

function finishDeath(b) {
    const { enc, def } = b;
    const m = K.mid(b), cx = WR.left + m.x, cy = WR.top + m.y;
    b.beams?.end(500);
    flash('#fff', 1100);
    shake(900);
    confettiBurst(cx, cy, { count: enc.milestone ? 160 : 110, spread: 480 });
    const playerPt = () => { const p = DOM.player.getBoundingClientRect(); return { x: p.left + p.width / 2, y: p.top + p.height / 2 }; };
    xpOrbs(cx, cy, playerPt, { count: 34, onArrive: () => { if (DOM.coinsEarnedEl) { DOM.coinsEarnedEl.classList.remove('coin-pop'); void DOM.coinsEarnedEl.offsetWidth; DOM.coinsEarnedEl.classList.add('coin-pop'); } } });
    setTimeout(() => trophy(cx, Math.max(cy, 260), playerPt, enc.milestone ? '🏆' : '👑'), 600);
    setTimeout(() => confettiBurst(cx - 80, cy + 20, { count: 40 }), 250);
    setTimeout(() => confettiBurst(cx + 80, cy + 20, { count: 40 }), 450);
    shockwave(cx, cy, '#ffd166', 640);
    shockwave(cx, cy, '#ffffff', 420);
    shockwave(cx, cy, def.color, 760);

    // ---- rewards: score, coins, a first-kill bounty, and armor plating for the rest of the run ----
    const mult = enc.milestone ? 3 : 1;
    const bonusScore = 5000 * mult;
    let bonusCoins = (2000 + 400 * Math.min(enc.n, 60)) * mult;
    const trophies = getBossTrophies();
    const first = !trophies[def.id];
    if (first) bonusCoins += 2500 * mult;
    const scoreBefore = state.score;
    addScore(bonusScore);
    // the bonus must not skip levels: it does not count toward the next level-up
    state.lastLevelScore += state.score - scoreBefore;
    DOM.scoreEl.innerText = state.score;
    if (!state.isDebugGame) {
        addCoins(bonusCoins);
        state.coinsEarned += bonusCoins;
        trophies[def.id] = { kills: (trophies[def.id]?.kills || 0) + 1, tier: Math.max(enc.tier, trophies[def.id]?.tier || 0), level: Math.max(enc.level, trophies[def.id]?.level || 0) };
        try { localStorage.setItem(TROPHY_KEY, JSON.stringify(trophies)); } catch { /* storage full */ }
    }
    if (DOM.coinsEarnedEl) DOM.coinsEarnedEl.innerText = `+${state.coinsEarned}`;

    const plating = enc.milestone ? 60 : 25;
    state.runHpBonus = Math.min(1500, (state.runHpBonus || 0) + plating);
    state.playerMaxHP = b.origMaxHP + plating;      // arena bonus ends with the boss; plating stays
    state.playerHP = state.playerMaxHP;
    updateHPUI();
    state.ammo = state.maxAmmo;
    updateAmmoUI();

    showBanner(t(enc.milestone ? 'bossDefeatedBig' : 'bossDefeated'), { color: '#ffd166', ms: 3000 });
    showFloatingMessage(tf('bossReward', { score: bonusScore, coins: bonusCoins }), K.W / 2 - 90, K.H / 2, '#ffd700');
    setTimeout(() => showFloatingMessage(tf('bossPlating', { n: plating }), K.W / 2 - 80, K.H / 2 + 34, 'var(--health)'), 500);
    if (first) setTimeout(() => showFloatingMessage(t('bossFirstKill'), K.W / 2 - 80, K.H / 2 - 34, '#ffe27a'), 250);

    const result = { id: def.id, level: enc.level, tier: enc.tier, milestone: !!enc.milestone, ms: Math.round(b.t), first };
    removeBossDom(b);
    state.boss = null;
    state.bossDone = true;
    state.bossesBeaten = (state.bossesBeaten || 0) + 1;
    (state.bossLog = state.bossLog || []).push(result);
    state.bossIndex = enc.n + 1;
    window.__onBossEvent?.('kill', result);
}

// ---------- attack scheduling ----------
function runCards(b) {
    const def = b.def;
    if (b.calm || b.t < b.busyUntil) return;
    if (b.t >= b.nextCard) {
        const deck = def.phases[Math.min(b.phase, def.phases.length) - 1];
        const name = deck[b.cardI++ % deck.length];
        const dur = def.cards[name](b, K) || 0;
        const pace = (def.gap || 1500) * (b.phase === 1 ? 1 : b.phase === 2 ? 0.86 : 0.74) * (1 - 0.22 * b.enc.d) / (1 + 0.12 * (b.enc.tier - 1));
        b.nextCard = b.t + dur + pace;
    }
    // returning bosses bring borrowed tricks
    if (b.enc.muts.length && b.t >= b.nextMut) {
        const key = b.enc.muts[b.mutI++ % b.enc.muts.length];
        const dur = MUTATIONS[key](b, K) || 0;
        b.nextMut = b.t + dur + 6500 / (1 + 0.15 * (b.enc.tier - 2));
    }
}

function updateObjects(b, pRect) {
    for (let i = b.objs.length - 1; i >= 0; i--) {
        const o = b.objs[i];
        if (!o || state.boss !== b) return;      // the fight ended while objects were updating (the player died)
        let alive = !o.gone;
        if (alive && o.part) { o.x = b.x + o.ox; o.y = b.y + o.oy; }
        if (alive && o.update) alive = o.update(o, b, K) !== false;
        if (alive && (o.hp != null || o.block)) {
            const r = rectOf(o);
            for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
                const bul = state.bullets[bi], br = bul.rect || bul.el.getBoundingClientRect();
                if (!overlap(br, r)) continue;
                const res = o.onHit ? o.onHit(o, bul, b, K) : undefined;
                if (res === 'pass') continue;
                const dealt = o.hp != null ? res !== 0 : res === 1;
                if (o.hp != null && dealt) o.hp -= Math.min(bul.damage || 1, MAX_HIT);
                if (dealt) { o.el.classList.add('hit'); o.hitT = b.t + 80; }
                createExplosion(br.left, br.top, dealt ? '#ffe600' : '#7fe9ff');
                bul.el.remove();
                state.bullets.splice(bi, 1);
            }
            if (o.hitT && b.t > o.hitT) { o.el.classList.remove('hit'); o.hitT = 0; }
            if (o.hp != null && o.hp <= 0) { o.onDeath?.(o, b, K); alive = false; }
        }
        if (alive && o.touch && !o.touched && overlap(rectOf(o), pRect)) { o.touched = true; K.hurt(o.touch, 'boss_touch'); }
        if (!alive) {
            o.onGone?.(o, b, K);
            o.el.remove();
            b.objs.splice(b.objs.indexOf(o), 1);
            continue;
        }
        o.el.style.transform = `translate3d(${o.x}px,${o.y}px,0)` + (o.rot ? ` rotate(${o.rot}deg)` : '') + (o.sc ? ` scale(${o.sc})` : '');
    }
}

function updatePickups(b, pRect) {
    if (b.t > b.nextPickup && b.pickups.length < 2) {
        const el = document.createElement('div');
        el.className = 'boss-heal';
        el.textContent = '✚';
        const px = rnd(40, K.W - 60);
        DOM.wrapper.appendChild(el);
        b.pickups.push({ el, x: px, y: Math.max(60, b.y + b.h * 0.8) });
        b.nextPickup = b.t + (state.playerHP < state.playerMaxHP * 0.6 ? 3000 : 4800);
    }
    for (let i = b.pickups.length - 1; i >= 0; i--) {
        const pk = b.pickups[i];
        pk.y += 2.4;
        pk.el.style.transform = `translate3d(${pk.x}px,${pk.y}px,0)`;
        const hit = overlap({ left: WR.left + pk.x, top: WR.top + pk.y, right: WR.left + pk.x + 30, bottom: WR.top + pk.y + 30 }, pRect);
        if (hit) {
            const heal = Math.round(state.playerMaxHP * 0.5);
            state.playerHP = Math.min(state.playerMaxHP, state.playerHP + heal);
            updateHPUI();
            showFloatingMessage(`+${heal} HP`, pk.x - 10, pk.y - 20, 'var(--health)');
            K.boom(pk.x + 15, pk.y + 15, '#34e89e');
            K.boom(pk.x + 15, pk.y + 15, '#ffffff');
        }
        if (hit || pk.y > K.H + 20) { pk.el.remove(); b.pickups.splice(i, 1); }
    }
}

// ---------- main update (one call per game tick) ----------
export function updateBoss(now) {
    K.W = DOM.wrapper.clientWidth;
    K.H = DOM.wrapper.clientHeight;
    if (!state.boss) {
        if (state.bossIndex == null) state.bossIndex = firstEncounterFrom(state.level);
        if (Date.now() < (window.__celebrateUntil || 0)) return;     // let a new-ship reveal (e.g. the Joker at level 10) finish first
        if (state.level >= bossLevel(state.bossIndex)) { WR = DOM.wrapper.getBoundingClientRect(); spawn(encounter(state.bossIndex)); }
        return;
    }
    const b = state.boss, def = b.def;
    WR = DOM.wrapper.getBoundingClientRect();
    b.t += TICK;
    const pRect = state.playerRect || DOM.player.getBoundingClientRect();

    // ===== death sequence =====
    if (b.dying) {
        const k = Math.min(1, (b.t - b.dyingStart) / (b.dyingUntil - b.dyingStart));
        b.y -= 0.45;
        b.el.style.transform = `translate3d(${b.x + (Math.random() - 0.5) * (6 + 22 * k)}px,${b.y}px,0)`;
        b.el.style.opacity = String(1 - 0.35 * k);
        if (Math.random() < 0.35 + 0.5 * k) K.boom(b.x + Math.random() * b.w, b.y + Math.random() * b.h, Math.random() < 0.5 ? '#ffd21a' : def.color);
        const m = K.mid(b);
        b.beams?.move(WR.left + m.x, WR.top + m.y);
        if (b.t > b.dyingUntil) finishDeath(b);
        return;
    }

    // ===== entrance (the intro card is on screen) =====
    if (b.enter) {
        if (b.t > 1900) b.y += (REST_Y - b.y) * 0.07 + 1.2;
        if (b.y >= REST_Y - 1) {
            b.y = b.ty = REST_Y; b.enter = false; b.t0 = b.t; b.nextCard = b.t + 1400; b.nextPickup = b.t + 5000; b.nextMut = b.t + 6000;
            b.el.classList.remove('entering');
            shake(500);
            const m = K.mid(b);
            K.shock(m.x, m.y, def.color, 520);
            def.setup?.(b, K);
            for (const key of b.enc.muts) MUTATIONS[key + 'Setup']?.(b, K);
            setTimeout(() => { if (state.boss === b) showBanner('💡 ' + t('bh_' + def.id), { color: '#e8f4ff', ms: 3400 }); }, 250);
        }
        render(b);
        return;
    }

    // ===== fight =====
    const ratio = b.hp / b.maxHP;
    const newPhase = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
    if (newPhase > b.phase) phaseChange(b, newPhase);
    b.calm = b.t < b.calmUntil;

    // timed callbacks queued by attacks
    if (b.q.length) {
        const due = b.q.filter(e => e.at <= b.t);
        if (due.length) { b.q = b.q.filter(e => e.at > b.t); for (const e of due) e.fn(); }
        if (state.boss !== b || b.dying) return;
    }

    // movement: a boss sets b.tx / b.ty (or leaves the default sway), the engine eases toward it
    if (!b.frozen && b.t >= b.calmUntil) {
        if (def.move) def.move(b, K);
        else {
            const period = b.phase === 1 ? 1700 : b.phase === 2 ? 1350 : 1050;
            b.tx = K.W / 2 - b.w / 2 + Math.sin((b.t - b.t0) / period) * (K.W / 2 - b.w / 2 - 10);
            b.ty = REST_Y;
        }
    }
    b.x += (clamp(b.tx, 4, K.W - b.w - 4) - b.x) * b.ease;
    b.y += (b.ty - b.y) * b.ease;

    runCards(b);
    def.tick?.(b, K);
    if (state.boss !== b || b.dying) return;

    updateObjects(b, pRect);
    if (state.boss !== b) return;
    updatePickups(b, pRect);

    // ---- render: position + lean into the movement ----
    render(b);
    const vx = b.x - b.prevX; b.prevX = b.x;
    b.tilt += (clamp(vx * 1.4, -12, 12) - b.tilt) * 0.2;
    b.body.style.transform = `rotate(${b.tilt}deg)`;
    const exposed = b.t < b.weakUntil;
    b.el.classList.toggle('boss-weak', exposed);

    // ---- player shots vs the boss body ----
    if (!b.hidden) {
        const hb = def.hitbox || 0.08;
        const rect = { left: WR.left + b.x + b.w * hb, top: WR.top + b.y + b.h * hb, right: WR.left + b.x + b.w * (1 - hb), bottom: WR.top + b.y + b.h * (1 - hb) };
        for (let i = state.bullets.length - 1; i >= 0; i--) {
            const bul = state.bullets[i];
            const r = bul.rect || bul.el.getBoundingClientRect();
            if (!overlap(r, rect)) continue;
            const bx = (r.left + r.right) / 2 - WR.left;
            const res = hitBoss(b, { dmg: bul.damage || 1, x: bx });
            if (res === 'reflect') K.fire(b, bx, r.top - WR.top + 10, 90 + rnd(-14, 14), 4.6, { k: 'reflect', dmg: 28 });
            createExplosion(r.left, r.top, !res || res === 'reflect' ? '#7fe9ff' : (exposed ? '#ffe600' : (bul.isFeather ? '#ff6b35' : 'white')));
            bul.el.remove();
            state.bullets.splice(i, 1);
        }
        for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
            const eb = state.enemyBullets[i];
            if (!eb.ricochet && !eb.returned) continue;
            const r = eb.rect || eb.el.getBoundingClientRect();
            if (!overlap(r, rect)) continue;
            if (eb.returned) K.wound(b, eb.returned, '#7dffb0');
            else hitBoss(b, { dmg: eb.damage || 40, x: eb.x, ricochet: true });
            K.boom(eb.x, eb.y, '#ffaa33');
            eb.el.remove();
            state.enemyBullets.splice(i, 1);
        }
    }

    b.el.classList.toggle('boss-hit', b.t < b.hitUntil);
    b.hp = Math.max(0, b.hp);
    b.hudFill.style.width = (b.hp / b.maxHP * 100) + '%';
    b.hudFill.dataset.phase = b.phase;
    b.hudFill.classList.toggle('exposed', exposed);
    b.hudFill.classList.toggle('blocked', !!(b.inv || b.shieldOn));
    if (b.hp <= 0) startDeath(b);
}
