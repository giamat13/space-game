// ===== BOSS ROSTER =====
// 25 bosses + 5 milestone bosses. Each one is data for the engine in bosses.js:
//   id, color, size        identity (name / title / hint texts live in i18n as bn_ / bt_ / bh_<id>)
//   phases[]               the attack deck for each of the 3 phases (names of `cards`)
//   cards{}                attacks. Each returns how long it keeps the boss busy (ms)
//   setup / tick / move / onHit / onPhase / cleanup   hooks for the signature mechanic
// Every boss is built around ONE mechanic that changes how the fight is played; the shared
// attacks are only the backdrop. `K` is the engine toolkit (projectiles, telegraphs, objects).
import { state } from './data.js';
import { ART } from './boss-art.js';

const REST = 112;
const mineArt = '<i></i>';

// ---------- signature building blocks (shared by bosses, milestone bosses and mutations) ----------

// Escort drones up to `max`.
function brood(b, K, max, o = {}) {
    for (let i = K.count(b, 'drone'); i < max; i++) K.drone(b, { hp: K.hp(b, o.hp ?? 2.2), ...o });
}

// Pull (dir toward the boss) or push the player sideways for `ms`.
function pull(b, K, ms, strength = 2.2, away = false) {
    b.s.pullUntil = b.t + ms;
    b.s.pullStr = strength * (away ? -1 : 1);
    document.getElementById('game-wrapper').classList.add('pulling');
    K.after(b, ms, () => document.getElementById('game-wrapper').classList.remove('pulling'));
}
function tickPull(b, K) {
    if (b.t < (b.s.pullUntil || 0)) K.push(Math.sign(b.x + b.w / 2 - K.px()) * b.s.pullStr, 170);
}

// Arena goes dark except for a pool of light around the ship.
function darkness(b, K, ms) {
    let el = document.getElementById('boss-dark');
    if (!el) { el = document.createElement('div'); el.id = 'boss-dark'; document.getElementById('game-wrapper').appendChild(el); }
    el.classList.remove('off');
    b.s.darkUntil = b.t + ms;
    K.after(b, ms, () => el.classList.add('off'));
}
function tickDark(b, K) {
    if (b.t < (b.s.darkUntil || 0)) document.getElementById('boss-dark')?.style.setProperty('--lx', K.px() + 'px');
}
const endDark = () => document.getElementById('boss-dark')?.remove();

// Nova: the whole arena burns except the shadows cast by drifting rocks.
function nova(b, K, o = {}) {
    const warn = o.warn ?? 3200, n = o.rocks ?? 2, rw = 92;
    const rocks = [];
    for (let i = 0; i < n; i++) {
        const x0 = K.rnd(20, K.W - rw - 20);
        rocks.push(K.obj(b, {
            cls: 'boss-rock', html: '<i></i><u></u>', haz: true, block: true, x: x0, y: K.H * 0.5, w: rw, h: 46, v: (Math.random() < 0.5 ? -1 : 1) * K.rnd(0.5, 1.1),
            update(s) { s.x += s.v; if (s.x < 8 || s.x > K.W - rw - 8) s.v *= -1; return b.t - s.born < warn + 500; }
        }));
    }
    const glow = K.obj(b, { cls: 'boss-nova', haz: true, x: 0, y: 0, w: K.W, h: K.H, update: (s) => { s.el.style.setProperty('--k', String(Math.min(1, (b.t - s.born) / warn))); return b.t - s.born < warn + 420; } });
    K.say(b, 'bossNova', '#ffb347');
    K.after(b, warn, () => {
        if (glow.gone) return;
        glow.el.classList.add('fire');
        K.shake(600); K.flash('#ffd27a', 500);
        const safe = rocks.some(r => !r.gone && Math.abs(K.px() - (r.x + rw / 2)) < rw / 2 + 4);
        if (!safe) K.hurt(o.dmg ?? 220, 'boss_nova');
        if (o.expose !== 0) K.expose(b, o.expose ?? 1600);
    });
    return warn + 600;
}

// Decoy copies of the boss. Shooting one is punished; hitting the real one dispels them.
function clones(b, K, n, ms = 5200) {
    b.hidden = true; b.el.classList.add('boss-hidden');
    K.after(b, 650, () => {
        const slots = [];
        const span = K.W - b.w - 16;
        for (let i = 0; i <= n; i++) slots.push(8 + span * (n === 0 ? 0.5 : i / n));
        slots.sort(() => Math.random() - 0.5);
        b.x = b.tx = slots[0];
        b.hidden = false; b.el.classList.remove('boss-hidden');
        b.frozen = true; b.s.clonesUntil = b.t + ms;
        for (let i = 1; i <= n; i++) K.obj(b, {
            cls: 'boss boss-clone', html: `<div class="boss-body">${b.def.art()}</div>`, haz: true, clone: true, block: true, x: slots[i], y: b.y, w: b.w, h: b.h, last: b.t + K.rnd(400, 1200),
            update(s) {
                if (b.t - s.last > 1700) { s.last = b.t; K.fire(b, s.x + b.w / 2, s.y + b.h * 0.8, K.aim(s.x + b.w / 2, s.y + b.h * 0.8), 3.3, { k: 'ghost', dmg: 30 }); }
                return b.t < b.s.clonesUntil;
            },
            onHit(s) { s.gone = true; K.ring(b, 7, 3.4, { from: { x: s.x + b.w / 2, y: s.y + b.h / 2 }, k: 'ghost' }); K.say(b, 'bossDecoy', '#9af7ff'); return 0; }
        });
    });
    K.after(b, 650 + ms, () => { b.frozen = false; });
    return ms + 650;
}
function dispelClones(b, K) {
    if (!K.count(b, 'clone')) return;
    for (const o of b.objs) if (o.clone) { o.gone = true; K.boom(o.x + o.w / 2, o.y + o.h / 2, '#9af7ff'); }
    b.s.clonesUntil = 0; b.frozen = false;
    K.expose(b, 1700);
}

// Heavy orb that drifts at the player. Shoot it enough and it flies back into the boss.
function orb(b, K, o = {}) {
    const m = K.mouth(b);
    return K.obj(b, {
        cls: 'boss-orb' + (o.volatile ? ' volatile' : ''), haz: true, block: true, x: m.x - 27 + (o.dx || 0), y: m.y - 20, w: 54, h: 54, life: K.hp(b, o.hp ?? 3), sp: o.speed ?? 1.7,
        update(s) {
            const cx = s.x + 27, cy = s.y + 27;
            if (s.ret) {
                const t = K.mid(b), d = Math.hypot(t.x - cx, t.y - cy) || 1;
                s.x += (t.x - cx) / d * 7; s.y += (t.y - cy) / d * 7;
                if (d < 40) { K.wound(b, o.wound ?? 0.085, '#7dffb0'); if (o.expose !== 0) K.expose(b, 900); return false; }
                return true;
            }
            const d = Math.hypot(K.px() - cx, K.py() - cy) || 1;
            s.x += (K.px() - cx) / d * s.sp * 0.55; s.y += s.sp;
            if (cy > K.H - 78) {
                K.boom(cx, cy, '#ff7a2e'); K.shock(cx, cy, '#ff7a2e', 200);
                if (Math.abs(K.px() - cx) < 92) K.hurt(o.dmg ?? 80, 'boss_orb');
                return false;
            }
            return true;
        },
        onHit(s, bul) {
            if (s.ret) return 'pass';
            if (o.volatile) { s.gone = true; K.ring(b, 10, 3.4, { from: { x: s.x + 27, y: s.y + 27 }, k: 'ember' }); K.say(b, 'bossVolatile', '#ff6b6b'); return 0; }
            s.life -= Math.min(bul.damage || 1, 9);
            if (s.life <= 0) { s.ret = true; s.block = false; s.el.classList.add('returned'); }
            return 0;
        }
    });
}

// Side walls close on a marked corridor, hold, then open.
function crush(b, K, o = {}) {
    const gapW = o.gap ?? 150, closeMs = 2600, hold = o.hold ?? 3600;
    const cx = K.clamp(o.at ?? K.rnd(110, K.W - 110), gapW / 2 + 8, K.W - gapW / 2 - 8);
    const L = cx - gapW / 2, R = cx + gapW / 2;
    K.obj(b, { cls: 'boss-mark wide', haz: true, x: L, y: K.H - 78, w: gapW, h: 24, update: (s) => b.t - s.born < closeMs });
    const mk = (side) => K.obj(b, {
        cls: 'boss-wall ' + side, haz: true, x: side === 'l' ? -K.W : K.W, y: 0, w: K.W, h: K.H,
        update(s) {
            const age = b.t - s.born;
            const k = age < closeMs ? age / closeMs : age < closeMs + hold ? 1 : Math.max(0, 1 - (age - closeMs - hold) / 700);
            s.x = side === 'l' ? -K.W + L * k : K.W - (K.W - R) * k;
            if (side === 'l') state.ctrl.min = Math.max(0, L * k - 8); else state.ctrl.max = Math.min(K.W - 50, K.W - (K.W - R) * k - 42);
            if (age >= closeMs + hold + 700) { state.ctrl.min = state.ctrl.max = null; return false; }
            return true;
        },
        onGone() { state.ctrl.min = state.ctrl.max = null; }
    });
    mk('l'); mk('r');
    b.s.corridor = { x: cx, from: b.t + closeMs, until: b.t + closeMs + hold };
    return closeMs + hold + 700;
}

// Ring of shards circling the boss; shots only pass through the gaps.
function shardRing(b, K, n, o = {}) {
    for (const s of b.objs) if (s.shard) s.gone = true;
    for (let i = 0; i < n; i++) K.obj(b, {
        cls: 'boss-shard', shard: true, block: true, hp: K.hp(b, o.hp ?? 3), x: b.x, y: b.y, w: 34, h: 34, a: 6.283 / n * i,
        update(s) {
            const R = o.r ?? b.w * 0.72, sp = (o.speed ?? 0.021) * (1 + 0.25 * (b.phase - 1)) * (o.dir ?? 1);
            s.a += sp;
            const m = K.mid(b);
            s.x = m.x + Math.cos(s.a) * R - 17; s.y = m.y + Math.sin(s.a) * R * 0.62 - 17; s.rot = s.a * 57.3 + 90;
            return true;
        },
        onDeath(s) { K.boom(s.x + 17, s.y + 17, '#b9f3ff'); }
    });
}

// Healing pylon at the arena edge: feeds the boss until it is destroyed.
function pylons(b, K, o = {}) {
    for (const side of [0, 1]) {
        if (b.objs.some(p => p.pylon && p.side === side)) continue;
        K.obj(b, {
            cls: 'boss-pylon', html: '<i></i>', pylon: true, side, block: true, hp: K.hp(b, o.hp ?? 5), x: side ? K.W - 50 : 6, y: K.rnd(170, 250), w: 44, h: 64, last: b.t,
            update(s) {
                if (b.t - s.last > 700) {
                    s.last = b.t;
                    K.obj(b, { cls: 'boss-leech', haz: true, x: s.x + 14, y: s.y + 10, w: 16, h: 16, update(q) { const m = K.mid(b), d = Math.hypot(m.x - q.x, m.y - q.y) || 1; q.x += (m.x - q.x) / d * 5; q.y += (m.y - q.y) / d * 5; if (d < 26) { K.heal(b, b.maxHP * (o.heal ?? 0.003)); return false; } return true; } });
                }
                return true;
            },
            onDeath(s) { K.boom(s.x + 22, s.y + 32, '#7dffb0'); K.boom(s.x + 22, s.y + 32, '#fff'); if (!K.count(b, 'pylon') || K.count(b, 'pylon') === 1) K.expose(b, 1500); }
        });
    }
}

// A row of destructible blocks that sinks toward the player.
function brickRow(b, K, o = {}) {
    const n = Math.max(6, Math.round(K.W / 62)), bw = K.W / n;
    for (let i = 0; i < n; i++) {
        const tough = o.tough && Math.random() < o.tough;
        K.obj(b, {
            cls: 'boss-brick' + (tough ? ' tough' : ''), haz: true, block: true, hp: K.hp(b, tough ? 3 : 1), x: i * bw + 1, y: b.y + b.h + 4, w: bw - 2, h: 26,
            update(s) {
                s.y += o.speed ?? 0.95;
                if (s.y + 26 > K.H - 80) { if (Math.abs(K.px() - (s.x + bw / 2)) < bw / 2 + 12) { K.hurt(o.dmg ?? 55, 'boss_brick'); K.boom(s.x + bw / 2, s.y + 13, '#ffb347'); } return false; }
                return true;
            },
            onDeath(s) { K.boom(s.x + bw / 2, s.y + 13, '#ffb347'); }
        });
    }
}

// Sideways wind: drags the ship (bounded) and bends boss shots.
function setWind(b, K, dir) {
    b.s.wind = dir;
    const w = document.getElementById('game-wrapper');
    w.classList.toggle('wind-l', dir < 0); w.classList.toggle('wind-r', dir > 0);
}
function tickWind(b, K) {
    const w = b.s.wind || 0;
    if (!w) return;
    K.push(w * 1.5, 110);
    for (const eb of state.enemyBullets) if (eb.boss) eb.x += w * 0.55;
}
const endWind = () => document.getElementById('game-wrapper').classList.remove('wind-l', 'wind-r', 'pulling', 'icy');

// Time bomb: destroy it before the countdown ends.
function bomb(b, K, o = {}) {
    const ms = o.ms ?? 6000;
    K.say(b, 'bossBomb', '#ff6b6b');
    return K.obj(b, {
        cls: 'boss-bomb', html: '<b></b><span></span>', haz: true, block: true, hp: K.hp(b, o.hp ?? 9), x: K.rnd(40, K.W - 104), y: K.H * 0.42, w: 64, h: 64,
        update(s) {
            const left = ms - (b.t - s.born);
            s.el.lastChild.textContent = Math.max(0, left / 1000).toFixed(1);
            s.el.style.setProperty('--k', String(1 - left / ms));
            if (left <= 0) { K.flash('#ff4d2f', 600); K.shake(700); K.hurt(o.dmg ?? 240, 'boss_bomb'); K.boom(s.x + 32, s.y + 32, '#ff4d2f'); K.shock(s.x + 32, s.y + 32, '#ff4d2f', 700); return false; }
            return true;
        },
        onDeath(s) { K.boom(s.x + 32, s.y + 32, '#7dffb0'); K.say(b, 'bossDefused', '#7dffb0'); K.expose(b, o.expose ?? 2200); }
    });
}

// Dive at the player's column, slam, climb back.
function slam(b, K, o = {}) {
    const warn = o.warn ?? 900;
    b.frozen = true;
    b.el.classList.add('boss-warn');
    b.tx = K.clamp(K.px() - b.w / 2, 4, K.W - b.w - 4);
    K.obj(b, { cls: 'boss-mark', haz: true, x: K.px() - b.w / 2, y: K.H - 78, w: b.w, h: 24, update: (s) => b.t - s.born < warn + 400 });
    K.after(b, warn, () => { b.el.classList.remove('boss-warn'); b.ty = K.H - b.h - 66; b.ease = 0.2; });
    K.after(b, warn + 430, () => {
        K.shake(320);
        K.shock(b.x + b.w / 2, b.y + b.h, '#ff4d6a', 320);
        if (Math.abs(K.px() - (b.x + b.w / 2)) < b.w / 2 + 6) K.hurt(o.dmg ?? 90, 'boss_slam');
        b.ty = REST; b.ease = 0.06;
    });
    K.after(b, warn + 1500, () => { b.frozen = false; b.ease = 0.08; if (o.expose) K.expose(b, o.expose); });
    return warn + 1600;
}

// ---------- borrowed tricks for returning bosses ----------
export const MUTATIONS = {
    escort: (b, K) => { brood(b, K, 2 + (b.enc.tier > 2 ? 1 : 0)); return 600; },
    storm: (b, K) => K.lanes(b, { n: 5, safe: [Math.floor(Math.random() * 5), Math.floor(Math.random() * 5)] }),
    mines: (b, K) => K.every(b, 3, 260, () => K.mine(b, K.rnd(40, K.W - 40), b.y + b.h * 0.8, { hp: K.hp(b, 1.2) })),
    missiles: (b, K) => K.every(b, 2, 420, (i) => K.missile(b, b.x + b.w * (i ? 0.8 : 0.2), b.y + b.h * 0.8, { hp: K.hp(b, 1) })),
    meteors: (b, K) => K.every(b, 4, 330, () => K.meteor(b, K.clamp(K.px() + K.rnd(-150, 150), 30, K.W - 30), { hp: K.hp(b, 2) })),
    gravity: (b, K) => { pull(b, K, 2600, 2.0); return 2600; },
    dusk: (b, K) => { darkness(b, K, 4200); return 4200; },
    orbs: (b, K) => { orb(b, K, { wound: 0.04, expose: 0 }); return 900; },
    bricks: (b, K) => { brickRow(b, K); return 900; },
    shards: (b, K) => { if (K.count(b, 'shard') < 2) shardRing(b, K, 4); return 300; },
};

// ---------- the 25 ----------
export const ROSTER = [
    // 1 — tutorial boss: its armor only opens when it overheats.
    {
        id: 'warden', color: '#ff9d3c', size: 140, gap: 1700, art: ART.warden, noMut: [],
        phases: [['volley', 'volley', 'vent'], ['volley', 'fan', 'volley', 'vent'], ['fan', 'ring', 'volley', 'vent']],
        onHit: () => 0.65,
        cards: {
            volley(b, K) { K.fan(b, 3, 26, 3.4); return 300; },
            fan(b, K) { K.fan(b, 5, 56, 3.5); return 300; },
            ring(b, K) { K.ring(b, K.n(b, 9, 2), 3.2); return 300; },
            vent(b, K) { b.el.classList.add('venting'); K.expose(b, 2300); K.calm(b, 2300); K.after(b, 2300, () => b.el.classList.remove('venting')); return 2300; }
        }
    },
    // 2 — two hulls, one light: only the glowing twin can be hurt, and the light keeps moving.
    {
        id: 'twins', unlocksSkin: 'dragon', color: '#ff4d9a', size: 250, h: 112, gap: 1500, hitbox: 0.02, art: ART.twins,
        phases: [['cross', 'swap', 'cross', 'snipe'], ['cross', 'swap', 'pincer', 'swap', 'snipe'], ['pincer', 'swap', 'cross', 'swap', 'storm']],
        setup(b) { b.s.lit = 0; b.el.dataset.lit = '0'; },
        move(b, K) { b.tx = K.W / 2 - b.w / 2 + Math.sin(b.t / 1900) * (K.W / 2 - b.w / 2 - 6); b.ty = REST; },
        onHit(b, K, hit) { if (hit.ability) return 0.5; return ((hit.x > b.x + b.w / 2 ? 1 : 0) === b.s.lit) ? 1.25 : 0; },
        side: (b, i) => ({ x: b.x + b.w * (i ? 0.8 : 0.2), y: b.y + b.h * 0.8 }),
        cards: {
            swap(b, K) { b.el.classList.add('swapping'); K.after(b, 650, () => { b.s.lit ^= 1; b.el.dataset.lit = String(b.s.lit); b.el.classList.remove('swapping'); }); return 700; },
            cross(b, K) { const d = b.def.side(b, b.s.lit ^ 1); K.fan(b, K.n(b, 3, 1), 30, 3.5, { from: d }); return 300; },
            snipe(b, K) { return K.every(b, 3, 240, () => { const d = b.def.side(b, b.s.lit ^ 1); K.fire(b, d.x, d.y, K.aim(d.x, d.y), 4.4, { k: 'lance' }); }); },
            pincer(b, K) { for (const i of [0, 1]) K.fan(b, 3, 44, 3.3, { from: b.def.side(b, i) }); return 300; },
            storm(b, K) { return K.spiral(b, 16, 26, 70, 3.5, { from: () => K.mid(b) }); }
        }
    },
    // 3 — the original: shield, blink, and a tracking beam — each leaves it exposed afterwards.
    {
        id: 'cubeking', color: '#a23cf0', size: 160, gap: 1400, art: ART.cubeking,
        phases: [['fan', 'shield', 'fan', 'wall'], ['fan', 'beam', 'ring', 'shield', 'blink', 'spiral'], ['fan', 'beam', 'blink', 'ring', 'shield', 'spiral', 'slam']],
        cards: {
            fan(b, K) { K.fan(b, 1 + 2 * b.phase, 14 + 10 * b.phase, 3.9 + b.phase * 0.3); return 300; },
            ring(b, K) { K.ring(b, K.n(b, 7, 2) + b.phase, 3.8); return 300; },
            wall(b, K) { K.wall(b); K.say(b, 'bossWall', '#ffd21a'); return 500; },
            spiral(b, K) { return K.spiral(b, 8 + 4 * b.phase, 30, 55, 3.7); },
            shield(b, K) { K.shield(b, true); K.after(b, 2300, () => { K.shield(b, false); K.expose(b, 1500); }); return 2300; },
            blink(b, K) {
                b.el.classList.add('boss-blink');
                K.after(b, 280, () => { const m = K.mid(b); K.shock(m.x, m.y, '#c04dff', 260); b.x = K.px() < K.W / 2 ? K.W - b.w - 26 : 26; b.el.classList.remove('boss-blink'); K.ring(b, 6, 3.8); });
                return 900;
            },
            beam(b, K) { const d = K.beam(b, {}); K.after(b, d, () => K.expose(b, 1200)); return d; },
            slam: (b, K) => slam(b, K, { expose: 1000 })
        }
    },
    // 4 — her drones are her shield: she cannot be hurt while two or more are alive.
    {
        id: 'hive', color: '#ffc13b', size: 150, gap: 1500, art: ART.hive, noMut: ['escort'],
        phases: [['sting', 'brood', 'sting', 'ring'], ['sting', 'brood', 'swarm', 'sting', 'ring'], ['swarm', 'brood', 'sting', 'ring', 'swarm']],
        setup(b, K) { brood(b, K, 3); },
        tick(b, K) { b.inv = K.count(b, 'drone') >= 2; b.el.classList.toggle('boss-shielded', b.inv); },
        cards: {
            brood(b, K) { brood(b, K, 2 + b.phase); return 800; },
            sting(b, K) { return K.every(b, 3, 200, () => K.fan(b, 1, 0, 4.3, { k: 'lance' })); },
            ring(b, K) { K.ring(b, K.n(b, 8, 3), 3.3, { k: 'amber' }); return 300; },
            swarm(b, K) { return K.rain(b, K.n(b, 8, 4), 150, 3.6, { k: 'amber' }); }
        }
    },
    // 5 — a plate of armor slides across its front: stand under the open side.
    {
        id: 'bulwark', color: '#5aa7ff', size: 220, h: 124, gap: 1500, hitbox: 0.03, art: ART.bulwark,
        phases: [['burst', 'shift', 'burst', 'wall'], ['burst', 'shift', 'mortar', 'burst', 'shift'], ['burst', 'shift', 'mortar', 'shift', 'wall', 'burst']],
        setup(b, K) {
            b.s.side = 0; b.s.px = 0;
            K.obj(b, { cls: 'boss-plate', html: '<i></i>', part: true, block: true, ox: 0, oy: b.h * 0.42, x: 0, y: 0, w: b.w * 0.56, h: b.h * 0.62,
                update(s) { b.s.px += ((b.s.side ? b.w * 0.44 : 0) - b.s.px) * 0.1; s.ox = b.s.px; return true; } });
        },
        move(b, K) { b.tx = K.W / 2 - b.w / 2 + Math.sin(b.t / 2300) * (K.W / 2 - b.w / 2 - 6); b.ty = REST; },
        open: (b) => ({ x: b.x + b.w * (b.s.side ? 0.22 : 0.78), y: b.y + b.h * 0.9 }),
        cards: {
            shift(b) { b.s.side ^= 1; return 700; },
            burst(b, K) { return K.every(b, 3, 230, () => K.fan(b, 2, 12, 3.9, { from: b.def.open(b) })); },
            wall(b, K) { K.wall(b, { gapW: 5 }); return 500; },
            mortar(b, K) { return K.every(b, K.n(b, 3, 1), 320, () => K.meteor(b, K.clamp(K.px() + K.rnd(-120, 120), 30, K.W - 30), { hp: K.hp(b, 2) })); }
        }
    },
    // 6 — drags the ship toward itself, straight into its own beam.
    {
        id: 'magnetar', color: '#4de1ff', size: 150, gap: 1500, art: ART.magnetar, noMut: ['gravity'],
        phases: [['fan', 'pull', 'ring', 'fan'], ['pull', 'spiral', 'repel', 'ring'], ['pull', 'spiral', 'repel', 'ring', 'pull']],
        tick: tickPull, cleanup: endWind,
        cards: {
            fan(b, K) { K.fan(b, K.n(b, 3, 2), 40, 3.6); return 300; },
            ring(b, K) { K.ring(b, K.n(b, 9, 3), 3.3); return 300; },
            spiral(b, K) { return K.spiral(b, 14 + 3 * b.phase, 24, 60, 3.5); },
            pull(b, K) { pull(b, K, 2600, 2.1 + 0.3 * b.phase); K.say(b, 'bossPull', '#4de1ff'); K.beam(b, { x: b.x + b.w / 2, track: 0, warn: 1700, dur: 900, w: 96 }); K.after(b, 2600, () => K.expose(b, 1300)); return 2700; },
            repel(b, K) { pull(b, K, 2200, 2.4, true); K.lanes(b, { n: 5, safe: [1, 2, 3], warn: 1500 }); return 2300; }
        }
    },
    // 7 — only the head can be hurt; the coils of its body soak up everything else.
    {
        id: 'serpent', color: '#3bd96b', size: 96, hp: 0.7, gap: 1400, hitbox: 0.02, art: ART.serpent,
        phases: [['spit', 'scales', 'spit'], ['spit', 'scales', 'dive', 'spit'], ['dive', 'scales', 'spit', 'dive', 'ring']],
        setup(b, K) {
            b.s.trail = []; b.ease = b.baseEase = 0.16;
            for (let i = 0; i < 7; i++) K.obj(b, { cls: 'boss-seg', html: '<i></i>', seg: i, block: true, hp: K.hp(b, 4), x: b.x + 22, y: b.y, w: 52, h: 52,
                onDeath(s) { K.boom(s.x + 26, s.y + 26, '#d6ff5a'); K.wound(b, 0.025, '#d6ff5a'); },
                update(s) { const p = b.s.trail[(i + 1) * 6]; if (p) { s.x = p.x + (b.w - 52) / 2; s.y = p.y + (b.h - 52) / 2; } return true; } });
        },
        move(b, K) {
            if (b.s.dive) return;
            b.tx = K.W / 2 - b.w / 2 + Math.sin(b.t / 1150) * (K.W / 2 - b.w / 2 - 8);
            b.ty = 150 + Math.sin(b.t / 760) * 80;
        },
        tick(b) { b.s.trail.unshift({ x: b.x, y: b.y }); if (b.s.trail.length > 62) b.s.trail.pop(); },
        cards: {
            spit(b, K) { K.fan(b, K.n(b, 3, 2), 34, 3.7, { k: 'venom' }); return 300; },
            ring(b, K) { K.ring(b, 11, 3.4, { k: 'venom' }); return 300; },
            scales(b, K) { const segs = b.objs.filter(o => o.seg != null); return K.every(b, Math.min(segs.length, 4 + b.phase), 170, (i) => { const s = segs[(i * 2) % segs.length]; if (s && !s.gone) K.fire(b, s.x + 26, s.y + 40, 90, 3.3, { k: 'venom' }); }); },
            dive(b, K) {
                b.s.dive = true; b.el.classList.add('boss-warn');
                b.tx = K.clamp(K.px() - b.w / 2, 4, K.W - b.w - 4); b.ty = 190;
                K.obj(b, { cls: 'boss-mark', haz: true, x: K.px() - 48, y: K.H - 78, w: 96, h: 24, update: (s) => b.t - s.born < 1300 });
                K.after(b, 900, () => { b.el.classList.remove('boss-warn'); b.ty = K.H - 150; b.ease = 0.22; });
                K.after(b, 1320, () => { K.shake(260); if (Math.abs(K.px() - (b.x + b.w / 2)) < 54) K.hurt(85, 'boss_dive'); b.ty = 150; b.ease = 0.07; });
                K.after(b, 2500, () => { b.s.dive = false; b.ease = 0.16; K.expose(b, 1000); });
                return 2600;
            }
        }
    },
    // 8 — too armored to shoot down: detonate its own mines next to it.
    {
        id: 'bombardier', color: '#c7d36a', size: 170, gap: 1500, art: ART.bombardier, noMut: ['mines'],
        phases: [['mines', 'fan', 'mines'], ['mines', 'carpet', 'fan', 'mines'], ['mines', 'carpet', 'mines', 'ring', 'fan']],
        onHit: () => 0.22,
        cards: {
            mines(b, K) {
                return K.every(b, 2 + b.phase, 240, () => {
                    const m = K.mine(b, b.x + b.w / 2 + K.rnd(-90, 90), b.y + b.h * 0.85, { hp: K.hp(b, 1.4), ty: b.y + b.h + K.rnd(20, 90), vy: 1.6, life: 12000,
                        onBlow(cx, cy) { const c = K.mid(b); if (Math.hypot(cx - c.x, cy - c.y) < 190) { K.wound(b, 0.062, '#ff7a2e'); K.say(b, 'bossDirectHit', '#ffd21a'); } } });
                    const u = m.update; m.sink = b.t + 4200;
                    m.update = (s) => { if (b.t > s.sink) { s.ty = K.H - 140; s.vy = 1.3; } return u(s); };
                });
            },
            fan(b, K) { K.fan(b, K.n(b, 3, 2), 44, 3.5); return 300; },
            ring(b, K) { K.ring(b, 10, 3.2); return 300; },
            carpet(b, K) { const x0 = K.rnd(40, 120); return K.every(b, 4, 260, (i) => K.meteor(b, K.clamp(x0 + i * (K.W - 160) / 3, 30, K.W - 30), { hp: K.hp(b, 2) })); }
        }
    },
    // 9 — strikes whole lanes at once and is only soft while it gathers the charge.
    {
        id: 'storm', color: '#ffe45c', size: 160, hp: 0.85, gap: 1300, art: ART.storm, noMut: ['storm'],
        phases: [['lanes', 'rain', 'lanes'], ['lanes', 'zaps', 'lanes', 'rain'], ['lanes', 'zaps', 'lanes', 'rain', 'zaps']],
        onHit: (b) => (b.t < (b.s.chargeUntil || 0) ? 1.7 : 0.4),
        cards: {
            lanes(b, K) {
                const n = 5, safe = [Math.floor(Math.random() * n)];
                if (b.phase === 1) safe.push((safe[0] + 2) % n);
                const warn = 1500 - 120 * b.phase;
                b.s.chargeUntil = b.t + warn; b.el.classList.add('charging');
                K.after(b, warn, () => b.el.classList.remove('charging'));
                return K.lanes(b, { n, safe, warn });
            },
            zaps(b, K) { return K.every(b, 3 + b.phase, 380, () => K.zap(b, K.px(), { r: 46 })); },
            rain(b, K) { return K.rain(b, K.n(b, 9, 4), 130, 3.7, { k: 'spark' }); }
        }
    },
    // 10 — hides among copies of itself. Hit a copy and it bites back.
    {
        id: 'phantom', color: '#7df9ff', size: 140, gap: 1500, art: ART.phantom,
        phases: [['fan', 'vanish', 'fan'], ['fan', 'vanish', 'ring', 'fan'], ['vanish', 'ring', 'fan', 'vanish', 'spiral']],
        onHit(b, K, hit) { if (!hit.ability) dispelClones(b, K); return 1; },
        cards: {
            fan(b, K) { K.fan(b, K.n(b, 3, 2), 36, 3.6, { k: 'ghost' }); return 300; },
            ring(b, K) { K.ring(b, K.n(b, 9, 2), 3.3, { k: 'ghost' }); return 300; },
            spiral(b, K) { return K.spiral(b, 18, 22, 60, 3.5, { k: 'ghost' }); },
            vanish: (b, K) => clones(b, K, Math.max(1, Math.min(1 + b.phase, 3, Math.floor((K.W - 16) / (b.w * 0.85)) - 1)))
        }
    },
    // 11 — freezes the deck: the ship keeps sliding after you let go.
    {
        id: 'frost', color: '#a8ecff', size: 150, gap: 1500, art: ART.frost,
        phases: [['shards', 'blizzard', 'shards'], ['icicles', 'blizzard', 'shards', 'ring'], ['blizzard', 'icicles', 'ring', 'blizzard', 'shards']],
        cleanup() { state.ctrl.lag = 0; endWind(); },
        cards: {
            shards(b, K) { K.fan(b, K.n(b, 3, 2), 40, 3.6, { k: 'ice' }); return 300; },
            ring(b, K) { K.ring(b, K.n(b, 9, 3), 3.2, { k: 'ice' }); return 300; },
            icicles(b, K) { return K.every(b, 3 + b.phase, 300, () => K.meteor(b, K.clamp(K.px() + K.rnd(-130, 130), 30, K.W - 30), { hp: K.hp(b, 2), speed: 8 })); },
            blizzard(b, K) {
                const ms = 4600, w = document.getElementById('game-wrapper');
                K.say(b, 'bossIce', '#a8ecff');
                K.after(b, 700, () => { state.ctrl.lag = 0.93; w.classList.add('icy'); });
                K.after(b, 1500, () => K.wall(b, { gapW: 7, speed: 2.8, k: 'ice' }));
                K.after(b, 3200, () => K.wall(b, { gapW: 7, speed: 2.8, k: 'ice' }));
                K.after(b, ms, () => { state.ctrl.lag = 0; w.classList.remove('icy'); K.expose(b, 1400); });
                return ms;
            }
        }
    },
    // 12 — its nova scorches the whole arena. The only safe place is a rock's shadow.
    {
        id: 'suneater', color: '#ffb347', size: 170, gap: 1500, art: ART.suneater,
        phases: [['flare', 'nova', 'flare'], ['flare', 'corona', 'nova', 'spit'], ['nova', 'corona', 'flare', 'nova', 'spit']],
        cards: {
            flare(b, K) { K.fan(b, K.n(b, 3, 2), 46, 3.6, { k: 'ember' }); return 300; },
            corona(b, K) { K.ring(b, 10, 3.2, { k: 'ember' }); K.after(b, 500, () => K.ring(b, 10, 3.2, { k: 'ember', deg: 18 })); return 800; },
            spit(b, K) { return K.rain(b, K.n(b, 8, 4), 150, 3.5, { k: 'ember' }); },
            nova: (b, K) => nova(b, K, { rocks: b.phase === 3 ? 1 : 2, warn: 3400 - 250 * b.phase })
        }
    },
    // 13 — when its facets shine, every shot comes straight back. Hold your fire.
    {
        id: 'prism', color: '#ff7df2', size: 150, gap: 1500, art: ART.prism,
        phases: [['spectrum', 'mirror', 'spectrum'], ['refract', 'mirror', 'spectrum', 'ring'], ['mirror', 'refract', 'ring', 'mirror', 'spectrum']],
        onHit: (b, K, hit) => (b.s.mirror ? (hit.ability ? 0 : 'reflect') : 1),
        cards: {
            spectrum(b, K) { K.fan(b, K.n(b, 4, 2), 52, 3.6, { k: 'prism' }); return 300; },
            ring(b, K) { K.ring(b, K.n(b, 9, 3), 3.3, { k: 'prism' }); return 300; },
            refract(b, K) { const xs = [K.px(), K.px() - 150, K.px() + 150]; let d = 0; xs.forEach((x, i) => K.after(b, i * 350, () => { d = K.beam(b, { x: K.clamp(x, 40, K.W - 40), track: 0, w: 64, warn: 1000, dmg: 200 }); })); return 2300; },
            mirror(b, K) {
                const ms = 2600 + 300 * b.phase;
                b.el.classList.add('glint'); K.say(b, 'bossReflect', '#ff7df2');
                K.after(b, 650, () => { b.s.mirror = true; b.el.classList.remove('glint'); b.el.classList.add('reflecting'); });
                K.after(b, 650 + ms, () => { b.s.mirror = false; b.el.classList.remove('reflecting'); K.expose(b, 1300); });
                return ms + 700;
            }
        }
    },
    // 14 — buds off spores and hides behind them: nothing hurts it while one is alive.
    {
        id: 'mitosis', color: '#8dff6a', size: 160, hp: 0.65, gap: 1500, art: ART.mitosis,
        phases: [['spit', 'bud', 'spit', 'ooze', 'spit'], ['spit', 'bud', 'ooze', 'spit', 'ring'], ['bud', 'spit', 'ooze', 'ring', 'spit', 'ooze']],
        setup(b, K) { b.def.spore(b, K); },
        spore(b, K) {
            const s0 = 58;
            K.obj(b, {
                cls: 'boss-spore', html: `<div class="boss-body">${b.def.art()}</div>`, spore: true, block: true, hp: K.hp(b, 3), x: b.x + b.w / 2 - s0 / 2, y: b.y + b.h * 0.6, w: s0, h: s0,
                vx: (Math.random() < 0.5 ? -1 : 1) * K.rnd(1.6, 2.4), vy: K.rnd(0.8, 1.4), last: b.t + K.rnd(500, 1500),
                update(s) {
                    s.x += s.vx; s.y += s.vy;
                    if (s.x < 6 || s.x > K.W - s0 - 6) s.vx *= -1;
                    if (s.y < 150 || s.y > K.H * 0.55) s.vy *= -1;
                    if (b.t - s.last > 1900) { s.last = b.t; K.fire(b, s.x + s0 / 2, s.y + s0, K.aim(s.x + s0 / 2, s.y + s0), 3.4, { k: 'venom', dmg: 30 }); }
                    return true;
                },
                onDeath(s) { K.boom(s.x + s0 / 2, s.y + s0 / 2, '#8dff6a'); K.boom(s.x + s0 / 2, s.y + s0 / 2, '#fff'); if (K.count(b, 'spore') <= 1) K.expose(b, 1600); }
            });
        },
        tick(b, K) { const n = K.count(b, 'spore'); b.inv = n > 0; b.el.classList.toggle('boss-shielded', b.inv); b.body.style.scale = String(1 - Math.min(0.3, n * 0.1)); },
        cards: {
            spit(b, K) { K.fan(b, K.n(b, 3, 2), 40, 3.5, { k: 'venom' }); return 300; },
            ring(b, K) { K.ring(b, 11, 3.2, { k: 'venom' }); return 300; },
            ooze(b, K) { return K.rain(b, K.n(b, 7, 4), 170, 3.2, { k: 'venom' }); },
            bud(b, K) { const max = b.phase; for (let i = K.count(b, 'spore'); i < max; i++) b.def.spore(b, K); K.say(b, 'bossSplit', '#8dff6a'); return 900; }
        }
    },
    // 15 — a sealed shell. It opens only to charge its cannon: hit it hard enough and the shot never comes.
    {
        id: 'bastion', color: '#59d6b0', size: 170, gap: 1500, art: ART.bastion,
        phases: [['spikes', 'charge', 'spikes'], ['spikes', 'charge', 'roll', 'charge'], ['charge', 'roll', 'spikes', 'charge', 'ring']],
        onHit: (b) => (b.s.open ? 1.6 : 0),
        tick(b, K) {
            if (!b.s.charging || b.s.hp0 - b.hp < b.maxHP * 0.07) return;
            // enough damage while the maw was open: the shot is cancelled and the shell stays open
            b.s.charging = false;
            if (b.s.blast) b.s.blast.gone = true;
            K.say(b, 'bossInterrupt', '#7dffb0'); K.shake(400);
            K.expose(b, 2600); K.calm(b, 2600);
            K.after(b, 2600, () => { b.s.open = false; b.frozen = false; b.el.classList.remove('maw-open'); });
        },
        cards: {
            spikes(b, K) { K.fan(b, K.n(b, 4, 2), 60, 3.5); return 300; },
            ring(b, K) { K.ring(b, 12, 3.2); return 300; },
            roll: (b, K) => slam(b, K, {}),
            charge(b, K) {
                const warn = 3000 - 200 * b.phase;
                b.s.open = b.s.charging = true; b.s.hp0 = b.hp; b.frozen = true;
                b.el.classList.add('maw-open'); K.say(b, 'bossCharge', '#59d6b0');
                K.beam(b, { w: 170, warn, dur: 620, dmg: 280, track: 0.045, cls: 'mega' });
                b.s.blast = b.objs[b.objs.length - 1];
                K.after(b, warn + 640, () => { if (!b.s.charging) return; b.s.charging = b.s.open = false; b.frozen = false; b.el.classList.remove('maw-open'); });
                return warn + 700;
            }
        }
    },
    // 16 — two pylons at the edges keep feeding it. Break them or it never dies.
    {
        id: 'leech', color: '#7dffb0', size: 150, hp: 0.85, gap: 1500, art: ART.leech,
        phases: [['fan', 'tendril', 'pylons', 'fan'], ['tendril', 'pylons', 'ring', 'fan'], ['pylons', 'tendril', 'ring', 'fan', 'tendril']],
        setup(b, K) { pylons(b, K); },
        cards: {
            fan(b, K) { K.fan(b, K.n(b, 3, 2), 40, 3.6, { k: 'venom' }); return 300; },
            ring(b, K) { K.ring(b, K.n(b, 9, 3), 3.3, { k: 'venom' }); return 300; },
            tendril(b, K) { return K.every(b, 3 + b.phase, 360, () => K.zap(b, K.px(), { r: 44, cls: 'vine' })); },
            pylons(b, K) { if (K.count(b, 'pylon') < 2) { pylons(b, K); K.say(b, 'bossPylons', '#7dffb0'); } return 500; }
        }
    },
    // 17 — jams the guns: ammo crawls back, and it is only soft in short windows. Save your shots.
    {
        id: 'null', color: '#9d7dff', size: 150, hp: 0.8, gap: 1500, art: ART.null_,
        phases: [['fan', 'window', 'emp', 'fan'], ['spiral', 'window', 'emp', 'fan'], ['emp', 'window', 'spiral', 'emp', 'fan']],
        setup() { state.ammoRate = 0.5; },
        onHit: (b) => (b.t < b.weakUntil ? 2 : 0.18),
        cards: {
            fan(b, K) { K.fan(b, K.n(b, 3, 2), 44, 3.6, { k: 'void' }); return 300; },
            spiral(b, K) { return K.spiral(b, 14, 26, 70, 3.5, { k: 'void' }); },
            window(b, K) { K.expose(b, 3600); K.calm(b, 2000); return 3600; },
            emp(b, K) {
                const x = K.px(), r = 120;
                K.say(b, 'bossEmp', '#9d7dff');
                K.zap(b, x, { r, warn: 1150, dmg: 25, cls: 'emp' });
                K.after(b, 1150, () => { if (Math.abs(K.px() - x) < r + 8) { state.ammo = 0; K.say(b, 'bossDrained', '#ff6b6b'); } });
                return 1500;
            }
        }
    },
    // 18 — lowers walls of blocks. Cut a hole and stand in it, or be crushed.
    {
        id: 'rampart', color: '#ffb347', size: 170, hp: 0.7, gap: 1700, art: ART.rampart, noMut: ['bricks'],
        phases: [['wall', 'snipe', 'fan'], ['wall', 'snipe', 'fan', 'snipe'], ['wall', 'fan', 'snipe', 'wall', 'snipe', 'fan']],
        cards: {
            wall(b, K) { brickRow(b, K, { tough: b.phase === 1 ? 0 : 0.14 * b.phase, speed: 0.9 + 0.1 * b.phase }); return 1700; },
            snipe(b, K) { return K.every(b, 2 + b.phase, 320, () => K.fan(b, 1, 0, 4.2, { k: 'lance' })); },
            fan(b, K) { K.fan(b, 5, 60, 3.4); return 300; }
        }
    },
    // 19 — puts out the lights. You only see what is close to the ship.
    {
        id: 'nightshade', color: '#c26bff', size: 160, gap: 1500, art: ART.nightshade, noMut: ['dusk'],
        phases: [['spores', 'dusk', 'spores'], ['bloom', 'dusk', 'spores', 'bloom'], ['dusk', 'bloom', 'spores', 'dusk', 'rain']],
        tick: tickDark, cleanup: endDark,
        cards: {
            spores(b, K) { K.fan(b, K.n(b, 3, 2), 42, 3.2, { k: 'void' }); return 300; },
            bloom(b, K) { K.ring(b, K.n(b, 9, 3), 3.0, { k: 'void' }); return 300; },
            rain(b, K) { return K.rain(b, 9, 170, 3.0, { k: 'void' }); },
            dusk(b, K) {
                const ms = 5200;
                darkness(b, K, ms); K.say(b, 'bossDark', '#c26bff');
                K.after(b, 1400, () => K.fan(b, 3, 40, 2.9, { k: 'void' }));
                K.after(b, 3000, () => K.ring(b, 8, 2.8, { k: 'void' }));
                K.after(b, ms, () => K.expose(b, 1600));
                return ms;
            }
        }
    },
    // 20 — closes the arena into a narrow corridor and fires down it.
    {
        id: 'crusher', color: '#ff6b4a', size: 170, gap: 1500, art: ART.crusher,
        phases: [['fan', 'crush', 'fan'], ['slam', 'crush', 'fan', 'ring'], ['crush', 'slam', 'ring', 'crush', 'fan']],
        move(b, K) { const c = b.s.corridor; if (c && b.t < c.until) { b.tx = c.x - b.w / 2; b.ty = REST; } else { b.tx = K.W / 2 - b.w / 2 + Math.sin(b.t / 1500) * (K.W / 2 - b.w / 2 - 10); b.ty = REST; } },
        tick(b, K) {
            const c = b.s.corridor;
            if (!c || b.t < c.from || b.t > c.until - 500) return;
            if (b.t - (c.last || 0) > 1050 - 120 * b.phase) { c.last = b.t; K.zap(b, c.x + K.rnd(-52, 52), { r: 24, warn: 800, dmg: 60 }); }
        },
        cleanup() { state.ctrl.min = state.ctrl.max = null; },
        cards: {
            fan(b, K) { K.fan(b, K.n(b, 3, 2), 44, 3.6); return 300; },
            ring(b, K) { K.ring(b, K.n(b, 9, 3), 3.3); return 300; },
            slam: (b, K) => slam(b, K, { expose: 1000 }),
            crush: (b, K) => crush(b, K, { gap: 160 - 10 * b.phase })
        }
    },
    // 21 — always stands opposite you. To line up a shot you have to wrong-foot it.
    {
        id: 'echo', color: '#d7e3ff', size: 140, gap: 1500, art: ART.echo,
        phases: [['shards', 'lance', 'shards'], ['shards', 'lance', 'ring', 'shards'], ['lance', 'ring', 'shards', 'lance', 'spiral']],
        setup(b) { b.s.center = 0; b.s.shots = state.bullets.length; },
        move(b, K) { b.ease = 0.034 + 0.012 * b.phase; b.tx = K.W - K.px() - b.w / 2; b.ty = REST; },
        tick(b, K) {
            // camping the middle (where the mirror meets you) draws a beam
            if (Math.abs(K.px() - K.W / 2) < 46) { b.s.center += 16.7; if (b.s.center > 1700) { b.s.center = -2500; K.beam(b, { x: K.W / 2, track: 0, w: 110, warn: 900 }); } } else b.s.center = Math.max(0, b.s.center - 30);
            // phase 3: every volley you fire is answered
            if (b.phase === 3 && state.bullets.length > b.s.shots && b.t - (b.s.lastEcho || 0) > 420) { b.s.lastEcho = b.t; const m = K.mouth(b); K.fire(b, m.x, m.y, 90, 4.2, { k: 'lance', dmg: 30 }); }
            b.s.shots = state.bullets.length;
        },
        cards: {
            shards(b, K) { K.fan(b, K.n(b, 3, 2), 50, 3.6, { k: 'prism' }); return 300; },
            ring(b, K) { K.ring(b, K.n(b, 9, 3), 3.3, { k: 'prism' }); return 300; },
            spiral(b, K) { return K.spiral(b, 16, 24, 65, 3.5, { k: 'prism' }); },
            lance(b, K) { return K.beam(b, { w: 70, warn: 1000 }); }
        }
    },
    // 22 — a ring of shards circles it. Time your shots through the gaps, or break the ring.
    {
        id: 'shardkeeper', color: '#b9f3ff', size: 130, gap: 1500, art: ART.shardkeeper, noMut: ['shards'],
        phases: [['fan', 'throw', 'fan', 'regrow'], ['ring', 'throw', 'fan', 'regrow'], ['throw', 'ring', 'regrow', 'throw', 'spiral']],
        setup(b, K) { shardRing(b, K, 6); },
        move(b, K) { b.tx = K.W / 2 - b.w / 2 + Math.sin(b.t / 2000) * (K.W / 2 - b.w / 2 - 60); b.ty = REST + 20; },
        cards: {
            fan(b, K) { K.fan(b, K.n(b, 3, 2), 44, 3.6, { k: 'ice' }); return 300; },
            ring(b, K) { K.ring(b, K.n(b, 9, 3), 3.3, { k: 'ice' }); return 300; },
            spiral(b, K) { return K.spiral(b, 16, 24, 65, 3.5, { k: 'ice' }); },
            regrow(b, K) { if (K.count(b, 'shard') < 4 + b.phase) shardRing(b, K, 5 + b.phase); return 600; },
            throw(b, K) {
                const sh = b.objs.filter(o => o.shard && !o.gone).slice(0, 1 + b.phase);
                sh.forEach((s, i) => K.after(b, i * 260, () => { if (s.gone) return; s.gone = true; K.fire(b, s.x + 17, s.y + 17, K.aim(s.x + 17, s.y + 17), 4.6, { k: 'shard', dmg: 55 }); }));
                return 900;
            }
        }
    },
    // 23 — armor too thick to dent. Shoot its orbs until they turn, and it is hit by its own fire.
    {
        id: 'rebound', color: '#ff8a5c', size: 170, gap: 1900, art: ART.rebound, noMut: ['orbs'],
        phases: [['orb', 'fan', 'orb'], ['orb', 'orb', 'fan', 'orb'], ['orb', 'bait', 'orb', 'fan', 'orb']],
        onHit: () => 0.2,
        cards: {
            orb(b, K) { orb(b, K, { speed: 1.5 + 0.25 * b.phase }); if (b.phase >= 2) K.after(b, 900, () => orb(b, K, { speed: 1.6, dx: K.rnd(-60, 60) })); return 1500; },
            bait(b, K) { orb(b, K, { volatile: true, speed: 2 }); return 900; },
            fan(b, K) { K.fan(b, K.n(b, 3, 2), 50, 3.5, { k: 'ember' }); return 300; }
        }
    },
    // 24 — a steady wind drags the ship and bends every shot. Then it turns.
    {
        id: 'gale', color: '#8fffe0', size: 150, gap: 1500, art: ART.gale,
        phases: [['fan', 'turn', 'gust', 'fan'], ['twister', 'turn', 'gust', 'fan'], ['turn', 'gust', 'twister', 'turn', 'ring']],
        setup(b, K) { setWind(b, K, Math.random() < 0.5 ? -1 : 1); },
        onPhase(b, K) { if (!b.s.wind) setWind(b, K, 1); },
        tick: tickWind, cleanup: endWind,
        cards: {
            fan(b, K) { K.fan(b, K.n(b, 3, 2), 46, 3.5, { k: 'gust' }); return 300; },
            ring(b, K) { K.ring(b, K.n(b, 9, 3), 3.2, { k: 'gust' }); return 300; },
            twister(b, K) { return K.spiral(b, 18, 21, 60, 3.4, { k: 'gust' }); },
            gust(b, K) { K.wall(b, { gapW: 6, speed: 2.9, k: 'gust' }); return 600; },
            turn(b, K) { const d = -(b.s.wind || 1); setWind(b, K, 0); K.say(b, 'bossWind', '#8fffe0'); K.calm(b, 900); K.after(b, 900, () => { setWind(b, K, d); K.expose(b, 1000); }); return 1000; }
        }
    },
    // 25 — plants a time bomb. Destroy it before the count ends, while it keeps shooting.
    {
        id: 'chrono', color: '#ffd76a', size: 160, gap: 1500, art: ART.chrono,
        phases: [['fan', 'bomb', 'fan'], ['hands', 'bomb', 'fan', 'ring'], ['bomb', 'hands', 'ring', 'bomb', 'fan']],
        cards: {
            fan(b, K) { K.fan(b, K.n(b, 3, 2), 46, 3.5); return 300; },
            ring(b, K) { K.ring(b, K.n(b, 9, 3), 3.2); return 300; },
            hands(b, K) { K.beam(b, { x: K.W * 0.25, track: 0, w: 90, warn: 1100 }); K.after(b, 800, () => K.beam(b, { x: K.W * 0.75, track: 0, w: 90, warn: 1100 })); K.after(b, 1600, () => K.beam(b, { x: K.W * 0.5, track: 0, w: 90, warn: 1100 })); return 3300; },
            bomb(b, K) { if (K.count(b, 'bombFlag')) return 300; const o = bomb(b, K, { ms: 6400 - 400 * b.phase }); o.bombFlag = true; K.after(b, 1500, () => K.fan(b, 3, 40, 3.2)); K.after(b, 3400, () => K.fan(b, 3, 40, 3.2)); return 2500; }
        }
    }
];

// ---------- milestone bosses: several mechanics at once ----------
export const MILESTONES = [
    // Level 100 — a warship. Its reactor is sealed until all four turrets are gone; they are rebuilt each phase.
    {
        id: 'dreadnought', color: '#ff5c5c', size: 290, h: 170, hp: 1.0, gap: 1500, hitbox: 0.04, art: ART.dreadnought, noMut: ['escort'],
        phases: [['salvo', 'ring', 'salvo'], ['salvo', 'spiral', 'wall', 'salvo'], ['spiral', 'wall', 'ring', 'salvo', 'beam']],
        turrets(b, K) {
            for (const o of b.objs) if (o.turret != null) o.gone = true;
            [0.1, 0.34, 0.58, 0.82].forEach((fx, i) => K.obj(b, {
                cls: 'boss-turret t' + i, html: '<i></i>', turret: i, part: true, block: true, hp: K.hp(b, 5 + b.phase), ox: b.w * fx - 4, oy: b.h * 0.78, x: 0, y: 0, w: 44, h: 44, last: b.t + 600 + i * 350,
                update(s) {
                    if (b.calm || b.t - s.last < 2300 - 250 * b.phase) return true;
                    s.last = b.t;
                    const x = s.x + 22, y = s.y + 40;
                    if (i === 0 || i === 3) K.fire(b, x, y, K.aim(x, y), 4.0, { k: 'lance' });
                    else if (i === 1) K.fan(b, 3, 30, 3.5, { from: { x, y } });
                    else K.missile(b, x, y, { hp: K.hp(b, 1) });
                    return true;
                },
                onDeath(s) { K.boom(s.x + 22, s.y + 22, '#ffd21a'); K.boom(s.x + 22, s.y + 22, '#fff'); if (K.count(b, 'part') <= 1) { K.say(b, 'bossCoreOpen', '#ffe600'); K.expose(b, 2500); } }
            }));
        },
        setup(b, K) { b.def.turrets(b, K); },
        onPhase(b, K) { b.def.turrets(b, K); },
        move(b, K) { b.tx = K.W / 2 - b.w / 2 + Math.sin(b.t / 2600) * Math.max(0, K.W / 2 - b.w / 2 - 6); b.ty = REST - 10; },
        tick(b, K) { b.inv = K.count(b, 'part') > 0; b.el.classList.toggle('core-open', !b.inv); },
        cards: {
            salvo(b, K) { if (b.inv) return 200; K.fan(b, 5, 60, 3.5); return 300; },
            ring(b, K) { if (b.inv) return 200; K.ring(b, 12, 3.3); return 300; },
            spiral(b, K) { return K.spiral(b, b.inv ? 8 : 18, 24, 65, 3.5); },
            wall(b, K) { K.wall(b, { gapW: 5 }); return 500; },
            beam(b, K) { return K.beam(b, { w: 90 }); }
        }
    },
    // Level 250 — three heads, three elements. Only a head that is awake can be hurt.
    {
        id: 'hydra', color: '#35e0a1', size: 280, h: 180, hp: 1.5, gap: 1300, art: ART.hydra,
        phases: [['wake', 'strike', 'strike'], ['wake', 'strike', 'strike', 'strike'], ['wake', 'strike', 'strike', 'strike', 'strike']],
        onHit: (b, K, hit) => (hit.ability ? 0.6 : 0),
        setup(b, K) {
            b.s.awake = [0];
            [0.04, 0.37, 0.7].forEach((fx, i) => K.obj(b, {
                cls: 'boss-head h' + i, html: `<div class="boss-body">${ART.hydraHead(i)}</div>`, head: i, part: true, block: true, ox: b.w * fx, oy: b.h * 0.5, x: 0, y: 0, w: b.w * 0.26, h: b.w * 0.26,
                update(s) { const on = b.s.awake.includes(i); s.el.classList.toggle('awake', on); s.oy = b.h * (on ? 0.62 : 0.5) + Math.sin(b.t / 400 + i * 2) * 6; return true; },
                onHit(s, bul) { if (!b.s.awake.includes(i)) return 0; K.strike(b, bul.damage || 1); return 1; }
            }));
        },
        move(b, K) { b.tx = K.W / 2 - b.w / 2 + Math.sin(b.t / 2400) * Math.max(0, K.W / 2 - b.w / 2 - 6); b.ty = REST - 20; },
        cleanup() { state.ctrl.lag = 0; endWind(); },
        cards: {
            wake(b, K) {
                const n = b.phase, first = ((b.s.awake[0] ?? 0) + 1) % 3;
                b.s.awake = []; for (let i = 0; i < n; i++) b.s.awake.push((first + i) % 3);
                K.say(b, 'bossHeadWake', '#35e0a1');
                return 900;
            },
            strike(b, K) {
                const i = b.s.awake[b.cardI % b.s.awake.length], h = b.objs.find(o => o.head === i);
                if (!h) return 200;
                const from = { x: h.x + h.w / 2, y: h.y + h.h * 0.85 };
                if (i === 0) { K.fan(b, 5, 54, 3.6, { from, k: 'ember' }); K.after(b, 450, () => K.fan(b, 4, 40, 3.6, { from, k: 'ember' })); return 800; }
                if (i === 1) {
                    const w = document.getElementById('game-wrapper');
                    state.ctrl.lag = 0.92; w.classList.add('icy'); K.say(b, 'bossIce', '#a8ecff');
                    K.wall(b, { gapW: 7, speed: 2.8, k: 'ice' });
                    K.after(b, 2600, () => { state.ctrl.lag = 0; w.classList.remove('icy'); });
                    return 2600;
                }
                return K.every(b, 4, 330, () => K.zap(b, K.px(), { r: 44, cls: 'vine' }));
            }
        }
    },
    // Level 500 — rebuilds itself mid-fight: a fortress, a storm, a hive.
    {
        id: 'architect', color: '#6ad7ff', size: 230, h: 170, hp: 1.0, gap: 1400, hitbox: 0.03, art: ART.architect, noMut: ['escort', 'storm'],
        phases: [['morph', 'act', 'act', 'act'], ['morph', 'act', 'act', 'act'], ['morph', 'act', 'act']],
        setup(b, K) { b.s.mode = -1; b.s.px = 0; b.s.side = 0; },
        tick(b, K) { if (b.s.mode === 2) { b.inv = K.count(b, 'drone') >= 2; b.el.classList.toggle('boss-shielded', b.inv); } else b.inv = false; },
        onHit: (b) => (b.s.mode === 1 ? (b.t < (b.s.chargeUntil || 0) ? 1.7 : 0.3) : 1),
        cards: {
            morph(b, K) {
                b.s.mode = (b.s.mode + 1) % 3;
                b.el.dataset.mode = String(b.s.mode);
                for (const o of b.objs) if (o.plate || o.drone) o.gone = true;
                K.say(b, ['bossFormFort', 'bossFormStorm', 'bossFormHive'][b.s.mode], '#6ad7ff');
                K.flash('#6ad7ff', 350);
                K.after(b, 500, () => {
                    if (b.s.mode === 0) K.obj(b, { cls: 'boss-plate', html: '<i></i>', plate: true, part: true, block: true, ox: 0, oy: b.h * 0.46, x: 0, y: 0, w: b.w * 0.56, h: b.h * 0.6,
                        update(s) { b.s.px += ((b.s.side ? b.w * 0.44 : 0) - b.s.px) * 0.1; s.ox = b.s.px; return true; } });
                    if (b.s.mode === 2) brood(b, K, 2 + b.phase);
                });
                return 1100;
            },
            act(b, K) {
                if (b.s.mode === 0) { b.s.side ^= 1; return 500 + K.every(b, 3, 230, () => K.fan(b, 2, 12, 3.9, { from: { x: b.x + b.w * (b.s.side ? 0.22 : 0.78), y: b.y + b.h * 0.9 } })); }
                if (b.s.mode === 1) {
                    const safe = [Math.floor(Math.random() * 5)], warn = 1400 - 100 * b.phase;
                    b.s.chargeUntil = b.t + warn; b.el.classList.add('charging'); K.after(b, warn, () => b.el.classList.remove('charging'));
                    return K.lanes(b, { n: 5, safe, warn });
                }
                brood(b, K, 2 + b.phase);
                return K.rain(b, 9, 150, 3.6, { k: 'amber' });
            }
        }
    },
    // Level 750 — Sun and Moon. By day the Sun attacks and only the Moon can be hurt; by night, the reverse.
    {
        id: 'eclipse', color: '#ffcf5c', size: 290, h: 140, hp: 1.7, gap: 1400, hitbox: 0.02, art: ART.eclipse, noMut: ['dusk'],
        phases: [['day', 'flare', 'night', 'veil'], ['day', 'flare', 'night', 'veil', 'flare'], ['day', 'night', 'flare', 'veil']],
        setup(b) { b.s.night = 0; b.el.dataset.lit = '1'; },
        move(b, K) { b.tx = K.W / 2 - b.w / 2 + Math.sin(b.t / 2200) * Math.max(0, K.W / 2 - b.w / 2 - 6); b.ty = REST; },
        tick: tickDark, cleanup: endDark,
        // sun = left half, moon = right half. `lit` is the half that can be hurt.
        onHit(b, K, hit) { if (hit.ability) return 0.5; if (b.phase === 3 && b.s.both) return 1; return ((hit.x > b.x + b.w / 2 ? 1 : 0) === (b.s.night ? 0 : 1)) ? 1.25 : 0; },
        sun: (b) => ({ x: b.x + b.w * 0.24, y: b.y + b.h * 0.8 }),
        moon: (b) => ({ x: b.x + b.w * 0.76, y: b.y + b.h * 0.8 }),
        cards: {
            day(b, K) { b.s.night = 0; b.el.dataset.lit = '1'; K.say(b, 'bossDay', '#ffcf5c'); return nova(b, K, { rocks: 2, warn: 3200, expose: 0 }); },
            night(b, K) { b.s.night = 1; b.el.dataset.lit = '0'; K.say(b, 'bossNight', '#b9c6ff'); darkness(b, K, 5000); K.after(b, 1400, () => K.fan(b, 3, 40, 2.9, { from: b.def.moon(b), k: 'void' })); K.after(b, 3100, () => K.ring(b, 8, 2.8, { from: b.def.moon(b), k: 'void' })); return 5000; },
            flare(b, K) { K.fan(b, 5, 56, 3.6, { from: b.def.sun(b), k: 'ember' }); return 400; },
            veil(b, K) { return K.spiral(b, 14, 26, 70, 3.2, { from: () => b.def.moon(b), k: 'void' }); }
        }
    },
    // Level 1000 — the final boss. Every phase is a different fight.
    {
        id: 'emperor', color: '#ff3df0', size: 260, h: 200, hp: 2.2, gap: 1300, art: ART.emperor, noMut: ['gravity', 'shards', 'orbs', 'dusk'],
        phases: [['fan', 'pull', 'ring', 'beam'], ['orb', 'clones', 'orb', 'crush'], ['dusk', 'lanes', 'nova', 'spiral', 'bomb']],
        setup(b, K) { shardRing(b, K, 5, { r: b.w * 0.62 }); },
        onPhase(b, K, phase) {
            for (const o of b.objs) if (o.shard) o.gone = true;
            endDark(); endWind(); state.ctrl.min = state.ctrl.max = null;
            if (phase === 3) K.after(b, 1600, () => shardRing(b, K, 4, { r: b.w * 0.62, dir: -1 }));
        },
        move(b, K) { b.tx = K.W / 2 - b.w / 2 + Math.sin(b.t / 2100) * Math.max(0, K.W / 2 - b.w / 2 - 6); b.ty = REST - 16; },
        tick(b, K) { tickPull(b, K); tickDark(b, K); },
        cleanup() { endDark(); endWind(); state.ctrl.min = state.ctrl.max = null; },
        onHit(b, K, hit) { if (!hit.ability) dispelClones(b, K); return b.phase === 2 ? 0.45 : 1; },
        cards: {
            fan(b, K) { K.fan(b, 5, 60, 3.7, { k: 'void' }); return 300; },
            ring(b, K) { K.ring(b, 13, 3.4, { k: 'void' }); return 300; },
            spiral(b, K) { return K.spiral(b, 22, 22, 55, 3.6, { k: 'void' }); },
            beam(b, K) { const d = K.beam(b, { w: 96 }); K.after(b, d, () => K.expose(b, 1200)); return d; },
            pull(b, K) { pull(b, K, 2600, 2.6); K.say(b, 'bossPull', '#ff3df0'); K.beam(b, { x: b.x + b.w / 2, track: 0, warn: 1700, dur: 900, w: 110 }); return 2700; },
            orb(b, K) { orb(b, K, { speed: 1.9, wound: 0.07 }); K.after(b, 800, () => orb(b, K, { speed: 1.7, dx: K.rnd(-70, 70), wound: 0.07 })); return 1500; },
            clones: (b, K) => clones(b, K, K.W > 440 ? 1 : 1, 4800),
            crush: (b, K) => crush(b, K, { gap: 150, hold: 3000 }),
            dusk(b, K) { darkness(b, K, 4200); K.say(b, 'bossDark', '#c26bff'); K.after(b, 1500, () => K.ring(b, 9, 2.9, { k: 'void' })); return 4200; },
            lanes(b, K) { return K.lanes(b, { n: 5, safe: [Math.floor(Math.random() * 5)], warn: 1250 }); },
            nova: (b, K) => nova(b, K, { rocks: 1, warn: 3000 }),
            bomb(b, K) { if (b.hp / b.maxHP > 0.18 || K.count(b, 'bombFlag')) { K.ring(b, 13, 3.4, { k: 'void' }); return 300; } const o = bomb(b, K, { ms: 6500, hp: 10, dmg: 320, expose: 3000 }); o.bombFlag = true; return 2500; }
        }
    }
];
