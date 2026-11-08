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
