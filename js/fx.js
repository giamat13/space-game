// ===== CELEBRATION EFFECTS =====
// Pure-DOM effects (no deps): confetti, shockwaves, new-ship reveal, level-up banner.
import { t, tf } from './i18n.js';

const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const COLORS = ['#ffd166', '#22e6ff', '#c04dff', '#ff4d6a', '#34e89e', '#ffe600', '#ff7a2e'];

function layer() {
    let el = document.getElementById('fx-layer');
    if (!el) {
        el = document.createElement('div');
        el.id = 'fx-layer';
        document.body.appendChild(el);
    }
    return el;
}

// Confetti / spark burst from a point (viewport px).
export function confettiBurst(x, y, { count = 36, colors = COLORS, spread = 260, gravity = 380 } = {}) {
    if (reduced()) return;
    const host = layer();
    for (let i = 0; i < count; i++) {
        const p = document.createElement('i');
        p.className = 'fx-confetti';
        const size = 5 + Math.random() * 7;
        p.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size * (Math.random() < 0.5 ? 1 : 2.2)}px;background:${colors[i % colors.length]};`;
        host.appendChild(p);
        const ang = Math.random() * Math.PI * 2;
        const v = 80 + Math.random() * spread;
        const dx = Math.cos(ang) * v;
        const dy = Math.sin(ang) * v - 120;
        const dur = 900 + Math.random() * 900;
        const a = p.animate([
            { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
            { transform: `translate(${dx}px, ${dy + gravity * 0.5}px) rotate(${Math.random() * 720 - 360}deg)`, opacity: 1, offset: 0.6 },
            { transform: `translate(${dx * 1.2}px, ${dy + gravity}px) rotate(${Math.random() * 900 - 450}deg)`, opacity: 0 },
        ], { duration: dur, easing: 'cubic-bezier(.2,.7,.4,1)' });
        a.onfinish = () => p.remove();
    }
}

// Expanding ring.
export function shockwave(x, y, color = '#ffd166', size = 320) {
    if (reduced()) return;
    const r = document.createElement('div');
    r.className = 'fx-ring';
    r.style.cssText = `left:${x}px;top:${y}px;border-color:${color};box-shadow:0 0 30px ${color};`;
    layer().appendChild(r);
    r.animate([
        { transform: 'translate(-50%,-50%) scale(0.1)', opacity: 0.9 },
        { transform: `translate(-50%,-50%) scale(${size / 40})`, opacity: 0 },
    ], { duration: 900, easing: 'ease-out' }).onfinish = () => r.remove();
}

// Full-screen "new ship unlocked" reveal.
export function celebrateSkinUnlock({ svg, name, color = '#ffd166' }) {
    const host = layer();
    const box = document.createElement('div');
    box.className = 'fx-reveal';
    box.style.setProperty('--fx-color', color);
    box.innerHTML = `
        <div class="fx-rays"></div>
        <div class="fx-reveal-card">
            <div class="fx-reveal-title">${t('newShipTitle')}</div>
            <div class="fx-reveal-ship">${svg}</div>
            <div class="fx-reveal-name">${name}</div>
        </div>`;
    host.appendChild(box);
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    setTimeout(() => { confettiBurst(cx, cy, { count: 70, spread: 420 }); shockwave(cx, cy, color, 520); }, 350);
    setTimeout(() => { confettiBurst(cx - 120, cy + 40, { count: 30 }); confettiBurst(cx + 120, cy + 40, { count: 30 }); shockwave(cx, cy, '#fff', 380); }, 900);
    setTimeout(() => box.classList.add('out'), 3300);
    setTimeout(() => box.remove(), 3900);
    box.addEventListener('click', () => box.remove());
}

// Level-up banner + flash over the playfield.
export function levelUpFx(level) {
    const host = layer();
    const b = document.createElement('div');
    b.className = 'fx-levelup';
    b.textContent = tf('levelUpTitle', { n: level });
    host.appendChild(b);
    const cx = window.innerWidth / 2, cy = window.innerHeight * 0.4;
    shockwave(cx, cy, '#22e6ff', 420);
    confettiBurst(cx, cy, { count: 24, colors: ['#22e6ff', '#c04dff', '#ffffff'], spread: 300 });
    setTimeout(() => b.remove(), 1500);
}

// Little sparkle pop on an element (used by achievement toast / menu cards).
export function sparkleAt(el, opts = {}) {
    const r = el.getBoundingClientRect();
    confettiBurst(r.left + r.width / 2, r.top + r.height / 2, { count: 26, spread: 200, gravity: 260, ...opts });
}

// Big centered banner (boss warning / victory).
export function showBanner(text, { color = '#fff', ms = 2000, shake = false } = {}) {
    const b = document.createElement('div');
    b.className = 'fx-banner' + (shake ? ' fx-banner-shake' : '');
    b.textContent = text;
    b.style.setProperty('--fx-color', color);
    layer().appendChild(b);
    setTimeout(() => b.classList.add('out'), ms - 400);
    setTimeout(() => b.remove(), ms);
}

// Ender-dragon-style death: pillars of light bursting out of a point, growing and spinning.
export function lightBeams(x, y, { color = '#d9b8ff', rays = 14 } = {}) {
    const el = document.createElement('div');
    el.className = 'fx-beams';
    el.style.setProperty('--fx-color', color);
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    let html = '';
    for (let i = 0; i < rays; i++) html += `<i style="--a:${(360 / rays) * i}deg;--d:${(i % 4) * 0.18}s"></i>`;
    el.innerHTML = html + '<b></b>';
    layer().appendChild(el);
    return {
        move(nx, ny) { el.style.left = nx + 'px'; el.style.top = ny + 'px'; },
        end(ms = 400) { el.style.transition = `opacity ${ms}ms`; el.style.opacity = '0'; setTimeout(() => el.remove(), ms); },
    };
}

// Glowing orbs that burst out and then stream into a target point (like XP orbs).
export function xpOrbs(x, y, getTarget, { count = 30, colors = ['#7dff6a', '#d6ff5a', '#ffffff'], onArrive } = {}) {
    if (reduced()) { onArrive && onArrive(count); return; }
    const host = layer();
    let arrived = 0;
    for (let i = 0; i < count; i++) {
        const o = document.createElement('i');
        o.className = 'fx-orb';
        o.style.cssText = `left:${x}px;top:${y}px;background:radial-gradient(circle,#fff,${colors[i % colors.length]} 60%,transparent);`;
        host.appendChild(o);
        const ang = Math.random() * Math.PI * 2, burst = 60 + Math.random() * 160;
        const bx = Math.cos(ang) * burst, by = Math.sin(ang) * burst - 40;
        const delay = Math.random() * 500;
        // phase 1: burst outward, phase 2: home in on the target (read at arrival time)
        o.animate([{ transform: 'translate(0,0) scale(0.4)', opacity: 0 }, { transform: `translate(${bx}px,${by}px) scale(1)`, opacity: 1 }],
            { duration: 450, delay, easing: 'ease-out', fill: 'forwards' }).onfinish = () => {
            const t = getTarget();
            const a2 = o.animate([{ transform: `translate(${bx}px,${by}px) scale(1)` }, { transform: `translate(${t.x - x}px,${t.y - y}px) scale(0.5)` }],
                { duration: 700 + Math.random() * 500, easing: 'cubic-bezier(.5,0,.9,.6)', fill: 'forwards' });
            a2.onfinish = () => { o.remove(); arrived++; onArrive && onArrive(arrived); };
        };
    }
}

// A trophy that rises from a point, floats, then flies into the target.
export function trophy(x, y, getTarget, emoji = '👑') {
    if (reduced()) return;
    const el = document.createElement('div');
    el.className = 'fx-trophy';
    el.textContent = emoji;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    layer().appendChild(el);
    el.animate([
        { transform: 'translate(-50%,-50%) scale(0) rotate(-30deg)', opacity: 0 },
        { transform: 'translate(-50%,-160%) scale(1.5) rotate(0deg)', opacity: 1, offset: 0.35 },
        { transform: 'translate(-50%,-190%) scale(1.35) rotate(8deg)', opacity: 1, offset: 0.8 },
        { transform: 'translate(-50%,-160%) scale(1.5) rotate(-6deg)', opacity: 1, offset: 1 },
    ], { duration: 2400, fill: 'forwards' }).onfinish = () => {
        const t = getTarget();
        el.animate([{ transform: 'translate(-50%,-160%) scale(1.5)', opacity: 1 }, { transform: `translate(${t.x - x - 0}px, ${t.y - y - 0}px) scale(0.3)`, opacity: 0.2 }],
            { duration: 700, easing: 'ease-in', fill: 'forwards' }).onfinish = () => { el.remove(); shockwave(t.x, t.y, '#ffd166', 220); confettiBurst(t.x, t.y, { count: 28, spread: 220 }); };
    };
}
