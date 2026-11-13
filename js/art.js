// ===== SPRITE ART =====
// Ships, enemies and space objects, drawn in code with the same lighting model as the
// bosses (top-lit hull gradient, gun-metal armor, glowing emissive parts). Each ship keeps
// its original colour and outline idea, so players still recognise the ship they own.
// The Dragon keeps its original image (assets/dragon.png) and is not defined here.
const OUT = 'stroke="#05070f" stroke-width="2.6" stroke-linejoin="round"';
const mir = (s) => s + `<g transform="matrix(-1 0 0 1 100 0)">${s}</g>`;
function svg(id, [l, c, d, e], body, glowCol) {
    const H = `url(#sh${id})`, M = `url(#sm${id})`, F = `filter="url(#sg${id})"`;
    return `<svg viewBox="0 0 100 100" style="width:100%;height:100%;overflow:visible;filter:drop-shadow(0 0 7px ${glowCol || c})"><defs>` +
        `<linearGradient id="sh${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${l}"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${d}"/></linearGradient>` +
        `<linearGradient id="sm${id}" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#8793b3"/><stop offset=".5" stop-color="#343c56"/><stop offset="1" stop-color="#11141f"/></linearGradient>` +
        `<filter id="sg${id}" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
        `</defs>${body({ H, M, F, e, c, l, d })}</svg>`;
}
const p = (d, f, x) => `<path d="${d}" fill="${f}" ${x ?? OUT}/>`;
const hi = (d, o = 0.3) => `<path d="${d}" fill="#fff" opacity="${o}"/>`;
const sh = (d, o = 0.3) => `<path d="${d}" fill="#05070f" opacity="${o}"/>`;
const glass = (d) => `<path d="${d}" fill="#0b1830" ${OUT}/><path d="${d}" fill="#7fe9ff" opacity=".55"/>`;
const jet = (a, x, y, w = 5) => `<ellipse class="jet" cx="${x}" cy="${y}" rx="${w}" ry="${w * 2.2}" fill="${a.e}" ${a.F}/><ellipse cx="${x}" cy="${y - 2}" rx="${w * 0.45}" ry="${w * 1.2}" fill="#fff"/>`;
const dot = (a, x, y, r = 2.4) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${a.e}" ${a.F}/>`;

export const SHIPS = {
    classic: svg('cl', ['#bff6ff', '#19c3e6', '#06586e', '#7ff3ff'], (a) =>
        jet(a, 50, 92) + mir(p('M38 40 L8 62 L6 76 L32 64 Z', a.M) + dot(a, 9, 68) + p('M40 66 L30 90 L44 80 Z', a.M)) +
        p('M50 4 L64 34 L66 70 L50 86 L34 70 L36 34 Z', a.H) + hi('M50 8 L60 34 L50 40 L40 34 Z') + sh('M36 60 L64 60 L50 84 Z', 0.3) + glass('M50 22 L57 40 L50 50 L43 40 Z')),
    interceptor: svg('in', ['#ffc4fb', '#d63de0', '#5e1268', '#ff9af8'], (a) =>
        mir(jet(a, 36, 90, 4) + p('M36 30 L4 78 L14 90 L40 66 Z', a.M) + hi('M34 36 L12 74 L18 76 Z', 0.2) + dot(a, 12, 82)) +
        p('M50 2 L62 30 L60 78 L50 90 L40 78 L38 30 Z', a.H) + hi('M50 6 L58 30 L50 36 L42 30 Z') + sh('M40 62 L60 62 L50 88 Z', 0.3) + glass('M50 18 L56 36 L50 46 L44 36 Z')),
    tanker: svg('tk', ['#c8ffd9', '#2fd16a', '#0c5a2a', '#9dffbd'], (a) =>
        mir(jet(a, 30, 92, 5) + p('M28 22 L32 4 L42 6 L40 24 Z', a.M) + p('M18 36 L4 46 L4 78 L18 86 Z', a.M) + dot(a, 9, 62)) +
        p('M22 20 L78 20 L88 40 L84 80 L66 92 L34 92 L16 80 L12 40 Z', a.H) + hi('M24 24 L76 24 L84 40 L16 40 Z') + sh('M14 66 L86 66 L66 90 L34 90 Z', 0.32) +
        `<path d="M22 54 L78 54" stroke="#05070f" stroke-width="1.6" opacity=".5"/>` + glass('M38 32 L62 32 L58 48 L42 48 Z') + dot(a, 50, 72, 4)),
    phoenix: svg('px', ['#ffe0b0', '#ff7a2e', '#7a2606', '#ffd24a'], (a) =>
        jet(a, 50, 92, 6) + mir(p('M34 30 L2 40 L10 52 L2 62 L20 66 L8 80 L36 70 Z', a.H) + hi('M32 34 L10 42 L16 50 Z', 0.3) + dot(a, 8, 58)) +
        p('M50 4 L62 30 L64 66 L50 88 L36 66 L38 30 Z', a.H) + hi('M50 8 L58 30 L50 38 L42 30 Z') + sh('M38 58 L62 58 L50 86 Z', 0.3) + glass('M50 20 L56 36 L50 46 L44 36 Z') + dot(a, 50, 62, 3.4)),
    vortex: svg('vx', ['#e2ccff', '#9b59f0', '#3a1580', '#d7b3ff'], (a) =>
        jet(a, 50, 94, 5) + mir(p('M36 26 L20 14 L26 36 L4 46 L26 56 L14 78 L38 70 Z', a.H) + dot(a, 12, 46)) +
        p('M50 2 L62 22 L70 50 L62 76 L50 90 L38 76 L30 50 L38 22 Z', a.H) + hi('M50 6 L60 24 L50 32 L40 24 Z') + sh('M34 58 L66 58 L50 88 Z', 0.3) +
        `<circle cx="50" cy="48" r="13" fill="#05070f" ${OUT}/><circle cx="50" cy="48" r="8" fill="${a.e}" ${a.F}/><circle cx="48" cy="46" r="3" fill="#fff"/>`),
    joker: svg('jk', ['#ffc9c2', '#ff3b2e', '#7a0c06', '#ffe45c'], (a) =>
        mir(jet(a, 38, 92, 4) + p('M26 34 L2 12 L10 44 Z', a.H) + dot(a, 4, 14, 3) + p('M24 50 L4 70 L28 72 Z', a.M)) +
        p('M50 6 L72 26 L80 56 L66 82 L50 92 L34 82 L20 56 L28 26 Z', a.H) + hi('M50 10 L68 28 L72 40 L28 40 L32 28 Z') + sh('M24 62 L76 62 L66 80 L50 90 L34 80 Z', 0.32) +
        mir(`<path d="M30 44 L46 50 L34 58 Z" fill="${a.e}" stroke="#05070f" stroke-width="2" ${a.F}/>`) +
        p('M36 66 L42 74 L50 66 L58 74 L64 66 L60 78 L40 78 Z', '#fff', 'stroke="#05070f" stroke-width="1.6"')),
};

const EN = { red: ['#ffc2c2', '#ff3b3b', '#6e0808', '#ffe45c'], orange: ['#ffe0b0', '#ffa31a', '#7a4200', '#fff07a'], green: ['#c8ffd9', '#25d96b', '#0b5a28', '#e4ff6a'], blue: ['#c2e0ff', '#3d9bff', '#0e3a80', '#7ff3ff'] };
export const enemyArt = (type) => svg('e' + type, EN[type] || EN.red, (a) =>
    mir(p('M40 12 L12 6 L20 44 L42 60 Z', a.M) + dot(a, 18, 14) + `<path d="M22 20 L36 44" stroke="${a.e}" stroke-width="1.6" opacity=".8"/>`) +
    p('M50 96 L34 66 L30 30 L50 18 L70 30 L66 66 Z', a.H) + hi('M50 22 L66 32 L64 44 L36 44 L34 32 Z', 0.28) + sh('M36 60 L64 60 L50 92 Z', 0.3) +
    mir(`<path d="M34 36 L47 42 L37 50 Z" fill="${a.e}" stroke="#05070f" stroke-width="2.2" ${a.F}/>`) + dot(a, 50, 66, 3));

export const ART = {
    asteroid: `<svg viewBox="0 0 100 100" style="width:100%;height:100%;overflow:visible"><defs><radialGradient id="ast" cx=".35" cy=".28"><stop offset="0" stop-color="#c3cad9"/><stop offset=".55" stop-color="#5c647a"/><stop offset="1" stop-color="#1c2030"/></radialGradient></defs>` +
        `<path d="M18 32 L38 8 L72 16 L94 46 L78 88 L32 94 L6 62 Z" fill="url(#ast)" ${OUT}/><path d="M22 34 L40 14 L66 20 L44 30 Z" fill="#fff" opacity=".22"/>` +
        `<ellipse cx="62" cy="52" rx="11" ry="8" fill="#05070f" opacity=".4"/><ellipse cx="34" cy="64" rx="7" ry="5" fill="#05070f" opacity=".4"/><ellipse cx="54" cy="78" rx="5" ry="3.4" fill="#05070f" opacity=".35"/><path d="M70 30 L80 46" stroke="#ff9d3c" stroke-width="2.4" stroke-linecap="round" opacity=".8"/></svg>`,
    burger: `<svg viewBox="0 0 100 100" style="width:100%;height:100%;overflow:visible;filter:drop-shadow(0 0 7px #ffb347)"><defs><linearGradient id="bun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd58a"/><stop offset="1" stop-color="#c8741a"/></linearGradient></defs>` +
        `<path d="M10 50 Q12 12 50 10 Q88 12 90 50 Z" fill="url(#bun)" ${OUT}/><path d="M20 40 Q24 18 50 16 Q60 16 68 20 Q44 20 30 42 Z" fill="#fff" opacity=".35"/>` +
        `<ellipse cx="38" cy="26" rx="3" ry="1.8" fill="#fff6d8"/><ellipse cx="58" cy="22" rx="3" ry="1.8" fill="#fff6d8"/><ellipse cx="70" cy="34" rx="3" ry="1.8" fill="#fff6d8"/>` +
        `<path d="M6 52 Q20 46 34 54 Q50 46 66 54 Q80 46 94 52 L92 60 L8 60 Z" fill="#4ed06a" ${OUT}/><rect x="10" y="58" width="80" height="12" rx="5" fill="#6b3a1c" ${OUT}/>` +
        `<path d="M8 68 L92 68 L84 78 L70 72 L56 80 L42 72 L28 80 L16 72 Z" fill="#ffd21a" ${OUT}/><path d="M12 76 L88 76 Q86 92 50 92 Q14 92 12 76 Z" fill="url(#bun)" ${OUT}/></svg>`,
};
