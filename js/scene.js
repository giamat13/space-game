// ===== SCENE: living space backdrop + particle effects =====
// Two canvases inside the arena: one behind everything (nebula clouds and three layers of
// parallax stars whose colours shift every 25 levels) and one above the action for
// particles, sparks and shock rings drawn with additive light. Effects used to be DOM
// elements; on canvas there can be far more of them for less work.
import { state, deviceMode } from './data.js';

let bg, fx, bctx, fctx, W = 0, H = 0, dpr = 1, stars = [], clouds = [], parts = [], rings = [], last = 0, hue = 0, hueTo = 0;
const wrap = () => document.getElementById('game-wrapper');
const SECTOR_HUES = [0, 60, 150, 220, 300, 30, 180, 260, 100, 330];

function resize() {
    const w = wrap(); if (!w) return;
    W = w.clientWidth; H = w.clientHeight; dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const c of [bg, fx]) { c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px'; }
    stars = Array.from({ length: Math.round(W * H / 5200) }, () => { const z = Math.random(); return { x: Math.random() * W, y: Math.random() * H, z, r: 0.5 + z * 1.4, tw: Math.random() * 6.28 }; });
    clouds = Array.from({ length: 5 }, (_, i) => ({ x: Math.random() * W, y: Math.random() * H, r: 160 + Math.random() * 200, h: [200, 280, 320, 190, 250][i], v: 4 + Math.random() * 6 }));
}

export function initScene() {
    const w = wrap(); if (!w || bg) return;
    bg = document.createElement('canvas'); bg.id = 'scene-bg';
    fx = document.createElement('canvas'); fx.id = 'scene-fx';
    w.insertBefore(bg, w.firstChild); w.appendChild(fx);
    bctx = bg.getContext('2d'); fctx = fx.getContext('2d');
    resize(); window.addEventListener('resize', resize);
    requestAnimationFrame(frame);
}

const cssColor = {};
function resolve(color) {
    if (!color || color[0] !== 'v') return color || '#fff';
    return cssColor[color] ??= (getComputedStyle(document.documentElement).getPropertyValue(color.slice(4, -1)).trim() || '#fff');
}

// x, y are viewport coordinates (as the game code already uses for explosions).
export function burst(x, y, color, n = 12, o = {}) {
    if (!fx) return;
    const r = fx.getBoundingClientRect(); x -= r.left; y -= r.top;
    const col = resolve(color), cap = deviceMode.isMobile ? 260 : 700;
    for (let i = 0; i < n && parts.length < cap; i++) {
        const a = Math.random() * 6.283, sp = (0.4 + Math.random()) * (o.speed || 150);
        parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: (o.life || 0.5) * (0.6 + Math.random() * 0.8), r: (o.size || 2.6) * (0.6 + Math.random()), col });
    }
    if (n >= 6 && rings.length < 40) rings.push({ x, y, life: 0, max: 0.35, r: o.ring || 34, col });
}

function frame(t) {
    requestAnimationFrame(frame);
    if (document.hidden || !W) return;
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
    const playing = state.active && !state.paused, speed = playing ? 1 + Math.min(3, state.level / 40) : 0.35;
    hueTo = SECTOR_HUES[Math.floor((state.active ? state.level : 1) / 25) % SECTOR_HUES.length];
    hue += (hueTo - hue) * 0.02;

    // ---- backdrop ----
    const c = bctx; c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `hsl(${232 + hue * 0.2},60%,5%)`); g.addColorStop(0.6, `hsl(${250 + hue * 0.2},55%,8%)`); g.addColorStop(1, `hsl(${275 + hue * 0.2},60%,11%)`);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'lighter';
    for (const n of clouds) {
        n.y += n.v * speed * dt; if (n.y - n.r > H) { n.y = -n.r; n.x = Math.random() * W; }
        const rg = c.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
        rg.addColorStop(0, `hsla(${n.h + hue},80%,55%,0.16)`); rg.addColorStop(1, 'hsla(0,0%,0%,0)');
        c.fillStyle = rg; c.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }
    for (const s of stars) {
        s.y += (12 + s.z * 70) * speed * dt; if (s.y > H) { s.y = -2; s.x = Math.random() * W; }
        s.tw += dt * 3;
        c.globalAlpha = 0.35 + s.z * 0.5 + Math.sin(s.tw) * 0.15;
        c.fillStyle = s.z > 0.85 ? '#ffe9c4' : '#dff6ff';
        const len = s.z > 0.6 && speed > 1.5 ? s.r * speed * 1.6 : s.r;
        c.fillRect(s.x, s.y, s.r, len);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';

    // ---- effects ----
    const f = fctx; f.setTransform(dpr, 0, 0, dpr, 0, 0); f.clearRect(0, 0, W, H);
    if (!parts.length && !rings.length) return;
    f.globalCompositeOperation = 'lighter';
    for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.life += dt;
        if (p.life >= p.max) { parts.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy = p.vy * 0.94 + 60 * dt;
        const k = 1 - p.life / p.max;
        f.globalAlpha = k; f.fillStyle = p.col;
        f.beginPath(); f.arc(p.x, p.y, p.r * (0.5 + k), 0, 6.283); f.fill();
        f.globalAlpha = k * 0.25; f.beginPath(); f.arc(p.x, p.y, p.r * 3.2 * k, 0, 6.283); f.fill();
    }
    for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i]; r.life += dt;
        if (r.life >= r.max) { rings.splice(i, 1); continue; }
        const k = r.life / r.max;
        f.globalAlpha = (1 - k) * 0.8; f.strokeStyle = r.col; f.lineWidth = 3 * (1 - k) + 0.5;
        f.beginPath(); f.arc(r.x, r.y, 6 + r.r * k, 0, 6.283); f.stroke();
    }
    f.globalAlpha = 1; f.globalCompositeOperation = 'source-over';
}
