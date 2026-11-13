// ===== ENEMY ROSTER (levels 30 → 1000) =====
// The four classic enemies (red / orange / green / blue) stay as they are. From level 30
// new kinds join the waves one after another, each with its own behaviour, so the game
// keeps changing all the way to level 1000. From level 500 any new-kind enemy can also
// spawn as an ELITE (golden aura, much tougher, extra shots).
//
// A kind is data:  lvl (first level it can appear), hp, speed, fire (ms between shots),
//   pts / ammo / heal / color (rewards, used by systems.js getEnemy*), size, art(),
//   move(en) (replaces the straight fall), shoot(en) (replaces the normal aimed shot),
//   hit(en, bullet) → damage multiplier, ghost(en) → true while bullets pass through,
//   die(en) (extra effect when killed by the player).
import { DOM, state, deviceMode, enemyHpScale } from './data.js';
import { createExplosion, showFloatingMessage, damagePlayer } from './systems.js';
import { t } from './i18n.js';

const OUT = 'stroke="#05070f" stroke-width="2.6" stroke-linejoin="round"';
const mir = (s) => s + `<g transform="matrix(-1 0 0 1 100 0)">${s}</g>`;
let uid = 0;
function art([l, c, d, e], body) {
    const id = 'k' + (uid++);
    const a = { H: `url(#h${id})`, M: `url(#m${id})`, F: `filter="url(#g${id})"`, e, c };
    return `<svg viewBox="0 0 100 100" style="width:100%;height:100%;overflow:visible;filter:drop-shadow(0 0 7px ${c})"><defs>` +
        `<linearGradient id="h${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${l}"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${d}"/></linearGradient>` +
        `<linearGradient id="m${id}" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#8793b3"/><stop offset=".5" stop-color="#343c56"/><stop offset="1" stop-color="#11141f"/></linearGradient>` +
        `<filter id="g${id}" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
        `</defs>${body(a)}</svg>`;
}
const p = (d, f, x) => `<path d="${d}" fill="${f}" ${x ?? OUT}/>`;
const hi = (d, o = 0.3) => `<path d="${d}" fill="#fff" opacity="${o}"/>`;
const eye = (a, d) => `<path d="${d}" fill="${a.e}" stroke="#05070f" stroke-width="2.2" ${a.F}/>`;
const lamp = (a, x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${a.e}" ${a.F}/><circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.35}" fill="#fff"/>`;

// ---------- helpers ----------
const W = () => DOM.wrapper.clientWidth, H = () => DOM.wrapper.clientHeight;
const px = () => state.playerX + 25, py = () => H() - 55;
const ex = (en) => (en.x ?? parseFloat(en.el.style.left)) + en.size / 2;
const ey = (en) => en.y + en.size / 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function setX(en, x) { en.x = clamp(x, 0, W() - en.size); en.el.style.left = en.x + 'px'; }

export function fireAt(en, deg, speed, o = {}) {
    const cap = deviceMode.isMobile ? 70 : 160;
    if (state.enemyBullets.length >= cap) return null;
    const a = deg * Math.PI / 180, x = o.x ?? ex(en), y = o.y ?? (en.y + en.size * 0.8);
    const el = document.createElement('div');
    el.className = 'enemy-bullet kb ' + (o.cls || en.kind);
    el.style.left = x + 'px'; el.style.top = y + 'px';
    if (o.rot !== false) el.style.transform = `rotate(${deg - 90}deg)`;
    DOM.wrapper.appendChild(el);
    const eb = { el, x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, friendly: false, chaotic: false, shooterId: en.el, dmg: (o.dmg ?? 18) * (en.elite ? 1.4 : 1), drain: o.drain };
    state.enemyBullets.push(eb);
    return eb;
}
const aim = (x, y) => Math.atan2(py() - y, px() - x) * 180 / Math.PI;
const aimed = (en, speed, o) => fireAt(en, aim(ex(en), en.y + en.size * 0.8) + (o?.off || 0), speed, o);

function heal(en, x, y, color) { createExplosion(DOM.wrapper.getBoundingClientRect().left + x, DOM.wrapper.getBoundingClientRect().top + y, color); }

// ---------- the kinds ----------
export const KINDS = {
    // Lv 30 — zig-zags across the screen and fires quick 3-shot bursts.
    wasp: { lvl: 30, hp: 4, speed: 1.1, fire: 1600, pts: 180, ammo: 2, heal: 20, color: '#ffe45c', size: 48,
        art: () => art(['#fff6b8', '#ffc61a', '#6a4a00', '#ff4d6a'], (a) => mir(p('M44 30 L8 10 L14 34 L40 46 Z', '#bfe8ff', 'stroke="#05070f" stroke-width="2" opacity=".85"') + p('M44 52 L14 60 L22 72 L44 62 Z', '#bfe8ff', 'stroke="#05070f" stroke-width="2" opacity=".75"')) +
            p('M50 14 L62 30 L60 58 L50 92 L40 58 L38 30 Z', a.H) + `<path d="M40 60 H60 M41 70 H59 M43 80 H57" stroke="#05070f" stroke-width="4"/>` + hi('M50 18 L58 30 L42 30 Z') + mir(eye(a, 'M41 30 L49 35 L42 40 Z'))),
        move(en) { en.y += en.speed; setX(en, en.x0 + Math.sin(en.t / 26) * 90); },
        shoot(en) { for (let i = 0; i < 3; i++) setTimeout(() => en.el.isConnected && aimed(en, 6.2, { dmg: 12 }), i * 110); } },

    // Lv 60 — breaks into two small fast shards when destroyed.
    splitter: { lvl: 60, hp: 7, speed: 0.9, fire: 1500, pts: 220, ammo: 2, heal: 25, color: '#ff7ad9', size: 56,
        art: () => art(['#ffd0f4', '#e83fb8', '#5a0a48', '#fff'], (a) => p('M50 6 L88 34 L80 78 L50 96 L20 78 L12 34 Z', a.H) + `<path d="M50 6 L50 96" stroke="#05070f" stroke-width="3" stroke-dasharray="6 5"/>` + hi('M50 10 L84 34 L16 34 Z', 0.28) + mir(eye(a, 'M24 40 L44 46 L28 56 Z')) + lamp(a, 50, 72, 5)),
        die(en) { for (const s of [-1, 1]) spawnKind('shard', ex(en) - 17 + s * 14, en.y, { vx: s * 2.4 }); } },
    shard: { lvl: 9999, hp: 2, speed: 2.4, fire: 1300, pts: 60, ammo: 1, heal: 0, color: '#ff7ad9', size: 34,
        art: () => art(['#ffd0f4', '#e83fb8', '#5a0a48', '#fff'], (a) => p('M50 4 L92 50 L50 96 L8 50 Z', a.H) + hi('M50 10 L84 50 L16 50 Z', 0.3) + lamp(a, 50, 50, 9)),
        move(en) { en.y += en.speed; setX(en, en.x + (en.vx || 0)); if (en.x <= 0 || en.x >= W() - en.size) en.vx = -(en.vx || 0); en.vx = (en.vx || 0) * 0.99; },
        shoot(en) { aimed(en, 5.4, { dmg: 10 }); } },

    // Lv 90 — a shield ring absorbs the first hits; break it, then the hull.
    warden: { lvl: 90, hp: 6, speed: 0.75, fire: 1800, pts: 260, ammo: 3, heal: 40, color: '#7fe9ff', size: 58,
        art: () => art(['#d6faff', '#1fb6d8', '#06405a', '#7fe9ff'], (a) => mir(p('M30 30 L6 40 L10 70 L32 66 Z', a.M)) + p('M30 18 L70 18 L82 44 L72 84 L50 94 L28 84 L18 44 Z', a.H) + hi('M32 22 L68 22 L76 40 L24 40 Z') + p('M36 46 L64 46 L58 60 L42 60 Z', '#0a0d18') + mir(eye(a, 'M38 49 L48 52 L40 56 Z')) + lamp(a, 50, 76, 5)),
        init(en) { en.shield = Math.ceil(5 * en.hpMult); en.el.classList.add('k-shielded'); },
        hit(en, bul) { if (en.shield > 0) { en.shield -= 1; if (en.shield <= 0) { en.el.classList.remove('k-shielded'); showFloatingMessage(t('kShieldDown'), ex(en) - 30, en.y - 10, '#7fe9ff'); } return 0; } return 1; },
        shoot(en) { for (const o of [-14, 0, 14]) aimed(en, 4.6, { off: o, dmg: 14 }); } },

    // Lv 120 — stops near the top, paints a red line on you, then fires one fast round.
    sniper: { lvl: 120, hp: 5, speed: 1.6, fire: 3200, pts: 300, ammo: 3, heal: 30, color: '#ff4d6a', size: 52,
        art: () => art(['#ffc2cc', '#d61f45', '#4a0612', '#ffe45c'], (a) => p('M46 50 L46 98 L54 98 L54 50 Z', a.M) + mir(p('M34 20 L8 14 L18 42 L38 48 Z', a.M)) + p('M50 6 L68 24 L64 56 L50 66 L36 56 L32 24 Z', a.H) + hi('M50 10 L64 24 L36 24 Z') + lamp(a, 50, 36, 7)),
        move(en) { if (en.y < en.stopY) en.y += en.speed; else { en.y += 0.12; } },
        shoot(en) {
            if (en.y < en.stopY - 4) return;
            const line = document.createElement('div');
            line.className = 'k-aim';
            DOM.wrapper.appendChild(line);
            const t0 = performance.now(), sx = ex(en), sy = en.y + en.size * 0.9;
            const step = () => {
                if (!en.el.isConnected || !state.active) { line.remove(); return; }
                const k = (performance.now() - t0) / 900;
                const dx = px() - sx, dy = py() - sy, len = Math.hypot(dx, dy);
                line.style.cssText = `left:${sx}px;top:${sy}px;width:${len}px;transform:rotate(${Math.atan2(dy, dx)}rad);opacity:${0.25 + k * 0.7}`;
                if (k < 1) requestAnimationFrame(step);
                else { line.remove(); fireAt(en, Math.atan2(dy, dx) * 180 / Math.PI, 13, { x: sx, y: sy, dmg: 34, cls: 'sniper-round' }); }
            };
            requestAnimationFrame(step);
        } },

    // Lv 150 — hovers, locks onto your column with a warning beep, then dives.
    diver: { lvl: 150, hp: 4, speed: 1.2, fire: 99999, pts: 240, ammo: 2, heal: 25, color: '#ff8a3c', size: 50,
        art: () => art(['#ffe0b0', '#ff7a1a', '#5a2202', '#fff'], (a) => mir(p('M40 20 L12 4 L20 40 L42 54 Z', a.M)) + p('M50 98 L32 62 L30 20 L50 8 L70 20 L68 62 Z', a.H) + hi('M50 12 L66 22 L34 22 Z') + mir(eye(a, 'M34 30 L47 36 L37 44 Z')) + p('M44 66 L56 66 L50 90 Z', '#fff3b0', 'stroke="#05070f" stroke-width="1.6"')),
        move(en) {
            if (en.mode === 'dive') { en.y += en.speed * 7; return; }
            if (en.mode === 'lock') { setX(en, en.x + (px() - en.size / 2 - en.x) * 0.12); if (en.t - en.lockT > 50) { en.mode = 'dive'; en.el.classList.remove('k-warn'); } return; }
            en.y += en.speed;
            if (en.y > H() * 0.22) { en.mode = 'lock'; en.lockT = en.t; en.el.classList.add('k-warn'); }
        } },

    // Lv 190 — repairs every enemy near it. Take it out first.
    medic: { lvl: 190, hp: 6, speed: 0.7, fire: 2200, pts: 320, ammo: 2, heal: 60, color: '#34e89e', size: 54,
        art: () => art(['#d6ffe9', '#18c07a', '#044a2a', '#fff'], (a) => mir(p('M24 34 L4 30 L8 60 L26 58 Z', a.M)) + `<circle cx="50" cy="50" r="40" fill="${a.H}" ${OUT}/>` + hi('M14 40 A38 38 0 0 1 86 40 Z', 0.25) + p('M42 26 H58 V42 H74 V58 H58 V74 H42 V58 H26 V42 H42 Z', '#fff', 'stroke="#05070f" stroke-width="2"') + lamp(a, 50, 50, 5)),
        tick(en) {
            if (en.t % 120 !== 0) return;
            en.el.classList.remove('k-pulse'); void en.el.offsetWidth; en.el.classList.add('k-pulse');
            for (const o of state.enemies) if (o !== en && Math.hypot(ex(o) - ex(en), ey(o) - ey(en)) < 150 && o.hp < o.maxHP) { o.hp = Math.min(o.maxHP, o.hp + o.maxHP * 0.25); o.hpFill.style.width = (o.hp / o.maxHP * 100) + '%'; heal(o, ex(o), ey(o), '#34e89e'); }
        } },

    // Lv 230 — drops slow, heavy mines across your path.
    layer: { lvl: 230, hp: 7, speed: 0.6, fire: 1700, pts: 300, ammo: 3, heal: 35, color: '#c7d36a', size: 60,
        art: () => art(['#eef4b0', '#8e9a3a', '#2a3008', '#ff4d2f'], (a) => mir(p('M22 40 L2 34 L4 66 L24 64 Z', a.M)) + p('M18 22 L82 22 L92 52 L76 82 L24 82 L8 52 Z', a.H) + hi('M22 26 L78 26 L86 46 L14 46 Z') + [32, 50, 68].map(x => `<circle cx="${x}" cy="68" r="7" fill="#0a0d18" ${OUT}/>` + lamp(a, x, 68, 3)).join('') + mir(eye(a, 'M30 36 L46 42 L34 48 Z'))),
        move(en) { en.y += en.speed; setX(en, en.x0 + Math.sin(en.t / 90) * 110); },
        shoot(en) { fireAt(en, 90, 1.25, { cls: 'mine', dmg: 42, rot: false }); } },

    // Lv 280 — phases out of reality; bullets pass through it while it shimmers.
    phase: { lvl: 280, hp: 5, speed: 1.1, fire: 1500, pts: 320, ammo: 3, heal: 30, color: '#9af7ff', size: 52,
        art: () => art(['#eaffff', '#3ac6d8', '#0a4a5c', '#fff'], (a) => p('M50 6 C78 6 88 30 86 56 C86 70 92 80 96 94 L80 84 L70 98 L58 84 L50 98 L42 84 L30 98 L20 84 L4 94 C8 80 14 70 14 56 C12 30 22 6 50 6 Z', a.H, 'stroke="#05070f" stroke-width="2.4" opacity=".9"') + hi('M50 10 C72 10 80 26 82 40 L18 40 C20 26 28 10 50 10 Z', 0.3) + mir(eye(a, 'M26 38 L44 46 L30 56 Z'))),
        ghost(en) { const g = (en.t % 220) > 140; en.el.classList.toggle('k-ghost', g); return g; },
        shoot(en) { if (en.t % 220 <= 140) aimed(en, 5, { dmg: 16 }); } },

    // Lv 340 — a slow carrier that launches small fighters until it is shot down.
    carrier: { lvl: 340, hp: 18, speed: 0.38, fire: 2600, pts: 600, ammo: 5, heal: 90, color: '#5aa7ff', size: 84,
        art: () => art(['#c2e0ff', '#2f7fe0', '#0b2a66', '#7fd0ff'], (a) => mir(p('M14 30 L2 30 L2 74 L14 74 Z', a.M)) + p('M14 16 L86 16 L98 40 L90 80 L66 92 L34 92 L10 80 L2 40 Z', a.H) + hi('M18 20 L82 20 L92 38 L8 38 Z') + p('M30 60 L70 60 L66 88 L34 88 Z', '#05070f') + `<rect x="36" y="64" width="28" height="4" fill="${a.e}" ${a.F}/>` + mir(eye(a, 'M24 42 L44 48 L30 54 Z'))),
        shoot(en) { if (state.enemies.length < (deviceMode.isMobile ? 35 : 70)) for (const s of [-1, 1]) spawnKind('fighter', ex(en) - 17 + s * 22, en.y + en.size * 0.7, { vx: s * 1.4 }); } },
    fighter: { lvl: 9999, hp: 1.5, speed: 2.2, fire: 1400, pts: 50, ammo: 1, heal: 0, color: '#7fd0ff', size: 32,
        art: () => art(['#c2e0ff', '#3d9bff', '#0e3a80', '#fff'], (a) => mir(p('M40 30 L6 64 L42 58 Z', a.M)) + p('M50 96 L36 54 L50 6 L64 54 Z', a.H) + lamp(a, 50, 40, 8)),
        move(en) { en.y += en.speed; setX(en, en.x + (en.vx || 0)); en.vx = (en.vx || 0) * 0.97 + (px() - ex(en)) * 0.0016; },
        shoot(en) { aimed(en, 5.6, { dmg: 9 }); } },

    // Lv 400 — orbits a point, spraying rings of shots.
    orbiter: { lvl: 400, hp: 8, speed: 0.55, fire: 2100, pts: 380, ammo: 3, heal: 40, color: '#c85cff', size: 54,
        art: () => art(['#ecd0ff', '#9b3ff0', '#2a0866', '#ffe45c'], (a) => `<ellipse cx="50" cy="50" rx="48" ry="16" fill="none" stroke="${a.e}" stroke-width="3" ${a.F} transform="rotate(-18 50 50)"/>` + `<circle cx="50" cy="50" r="30" fill="${a.H}" ${OUT}/>` + hi('M24 42 A28 28 0 0 1 76 42 Z', 0.28) + mir(eye(a, 'M30 46 L44 50 L32 56 Z')) + lamp(a, 50, 64, 4)),
        move(en) { en.cy = (en.cy ?? en.y) + en.speed; en.y = en.cy + Math.sin(en.t / 40) * 40; setX(en, en.x0 + Math.cos(en.t / 40) * 80); },
        shoot(en) { const n = en.elite ? 12 : 8, off = (en.t * 7) % 360; for (let i = 0; i < n; i++) fireAt(en, off + i * 360 / n, 3.2, { dmg: 13, y: ey(en) }); } },

    // Lv 480 — its shots drain your ammo instead of only hurting you.
    leech: { lvl: 480, hp: 7, speed: 0.9, fire: 1500, pts: 360, ammo: 4, heal: 40, color: '#b4ff6a', size: 52,
        art: () => art(['#e8ffcc', '#5fc81a', '#1a4a04', '#ffe45c'], (a) => mir(`<path d="M30 70 Q14 86 22 98" fill="none" stroke="#2a6a0a" stroke-width="7" stroke-linecap="round"/>` + p('M30 26 L4 12 L14 44 Z', a.M)) + `<ellipse cx="50" cy="48" rx="34" ry="38" fill="${a.H}" ${OUT}/>` + hi('M22 36 A32 34 0 0 1 78 36 Z', 0.26) + `<circle cx="50" cy="64" r="13" fill="#05070f"/>` + Array.from({ length: 6 }, (_, i) => `<path d="M50 52 L53 59 L47 59 Z" fill="#fff" transform="rotate(${i * 60} 50 64)"/>`).join('') + mir(eye(a, 'M28 34 L44 40 L32 46 Z'))),
        shoot(en) { aimed(en, 4.8, { dmg: 10, drain: 3, cls: 'leech' }); } },

    // Lv 600 — heavy armor: no single hit can take more than a sliver off it.
    juggernaut: { lvl: 600, hp: 26, speed: 0.32, fire: 1900, pts: 800, ammo: 6, heal: 120, color: '#ff6b4a', size: 78,
        art: () => art(['#ffd0bf', '#d8482a', '#4a0e04', '#ffb347'], (a) => mir(p('M2 30 L22 26 L22 84 L4 80 Z', a.M) + `<circle cx="12" cy="44" r="3" fill="#0a0d18"/><circle cx="12" cy="66" r="3" fill="#0a0d18"/>`) + p('M22 10 L78 10 L94 36 L88 80 L66 96 L34 96 L12 80 L6 36 Z', a.H) + hi('M26 14 L74 14 L88 34 L12 34 Z') + p('M28 42 L72 42 L66 60 L34 60 Z', '#0a0d18') + mir(eye(a, 'M34 46 L48 50 L38 56 Z')) + lamp(a, 50, 78, 7)),
        hit(en, bul) { return Math.min(1, 1.6 / Math.max(1, bul.damage || 1)); },
        shoot(en) { for (const o of [-30, -15, 0, 15, 30]) aimed(en, 3.8, { off: o, dmg: 16 }); } },

    // Lv 720 — arrives as a swarm of five tiny, quick interceptors.
    swarm: { lvl: 720, hp: 1.5, speed: 1.9, fire: 1700, pts: 70, ammo: 1, heal: 0, color: '#ff4dc4', size: 30, group: 5,
        art: () => art(['#ffc2ee', '#e02aa8', '#4a0638', '#fff'], (a) => p('M50 98 L10 30 L50 4 L90 30 Z', a.H) + hi('M50 10 L82 30 L18 30 Z', 0.3) + lamp(a, 50, 40, 9)),
        move(en) { en.y += en.speed; setX(en, en.x0 + Math.sin(en.t / 18 + en.seed) * 40 + (px() - en.x0) * Math.min(1, en.t / 400) * 0.6); },
        shoot(en) { aimed(en, 5.2, { dmg: 8 }); } },

    // Lv 850 — tears through space next to your column and bursts a ring of shots.
    wraith: { lvl: 850, hp: 10, speed: 0.7, fire: 2400, pts: 600, ammo: 4, heal: 60, color: '#9d7dff', size: 58,
        art: () => art(['#e0d4ff', '#5b3fd0', '#12063a', '#c49bff'], (a) => mir(p('M30 30 L2 44 L22 52 L6 80 L36 60 Z', a.M)) + p('M50 4 L72 30 L80 66 L62 96 L50 84 L38 96 L20 66 L28 30 Z', a.H) + hi('M50 8 L68 30 L32 30 Z') + p('M34 44 L66 44 L60 58 L40 58 Z', '#05070f') + `<path d="M38 51 H62" stroke="${a.e}" stroke-width="4" ${a.F}/>` + lamp(a, 50, 74, 5)),
        shoot(en) {
            en.el.classList.add('k-blink');
            setTimeout(() => {
                if (!en.el.isConnected) return;
                setX(en, px() - en.size / 2 + (Math.random() < 0.5 ? -1 : 1) * (90 + Math.random() * 60));
                en.y = Math.min(en.y, H() * 0.45);
                en.el.style.top = en.y + 'px';
                en.el.classList.remove('k-blink');
                for (let i = 0; i < 10; i++) fireAt(en, i * 36 + (en.t % 36), 3.4, { dmg: 15, y: ey(en) });
            }, 380);
        } },
};

// ---------- spawning ----------
// Share of the spawns that are new kinds, by level: 15% at level 30 up to 75% at 1000.
const shareAt = (lvl) => Math.min(0.75, 0.15 + (lvl - 30) / 1600);
export function maybeSpawnKind(posX, now) {
    const lvl = state.level;
    if (lvl < 30 || Math.random() > shareAt(lvl)) return false;
    const pool = Object.entries(KINDS).filter(([, k]) => k.lvl <= lvl);
    if (!pool.length) return false;
    // newer kinds are a little more likely, so each one gets its moment
    const weights = pool.map(([, k]) => 1 + Math.max(0, 1 - (lvl - k.lvl) / 200) * 2);
    let r = Math.random() * weights.reduce((a, b) => a + b, 0), key = pool[0][0];
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) { key = pool[i][0]; break; } }
    const k = KINDS[key];
    if (k.group) { for (let i = 0; i < k.group; i++) spawnKind(key, clamp(posX + (i - 2) * 34, 0, W() - k.size), -60 - Math.abs(i - 2) * 26, { seed: i }); }
    else spawnKind(key, posX, -70);
    return true;
}

export function spawnKind(key, x, y, o = {}) {
    const k = KINDS[key];
    if (!k) return null;
    const lvl = state.level;
    const elite = !o.noElite && k.lvl < 9999 && lvl >= 500 && Math.random() < Math.min(0.35, (lvl - 500) / 1400);
    const hpMult = (lvl <= 20 ? 0.9 : 1.5) * enemyHpScale(lvl) * (elite ? 2.5 : 1);
    const maxHP = Math.max(1, Math.ceil(k.hp * hpMult));
    const el = document.createElement('div');
    el.className = `enemy-ship kind-${key}` + (elite ? ' elite' : '');
    el.style.width = el.style.height = k.size + 'px';
    el.innerHTML = `<div class="hp-bar-container"><div class="hp-bar-fill enemy-hp-fill"></div></div>${k.art()}`;
    DOM.wrapper.appendChild(el);
    const isChaotic = !!(state.jokerAbility && state.jokerAbility.active);
    if (isChaotic) { el.style.filter = 'hue-rotate(180deg) brightness(1.3)'; }
    const en = {
        el, hpFill: el.querySelector('.enemy-hp-fill'), type: key, kind: key, def: k, elite, hpMult,
        y, x: clamp(x, 0, W() - k.size), x0: clamp(x, 40, W() - k.size - 40), size: k.size, t: 0, seed: o.seed || 0, vx: o.vx,
        hp: maxHP, maxHP, speed: k.speed * Math.min(2.2, 0.8 + state.speedMult * 0.2) * (0.85 + Math.random() * 0.3),
        lastShot: Date.now() + 400 + Math.random() * 700, fireRate: k.fire / (elite ? 1.5 : 1),
        stopY: 70 + Math.random() * 90, isChaotic, hitsByChaos: isChaotic ? {} : undefined,
    };
    el.style.left = en.x + 'px';
    el.style.top = y + 'px';
    k.init?.(en);
    state.enemies.push(en);
    return en;
}

// Called by updateEnemies once per tick for a new-kind enemy; returns true when it handled movement.
export function tickKind(en) {
    en.t++;
    en.def.tick?.(en);
    if (en.def.move) { en.def.move(en); en.el.style.top = en.y + 'px'; return true; }
    return false;
}

window.__kinds = KINDS;
