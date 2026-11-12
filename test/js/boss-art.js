// ===== BOSS ART =====
// Every boss is drawn in code as layered vector art with one shared lighting model:
// a top-lit hull gradient in the boss' colour, dark gun-metal for armor, and emissive
// parts (eyes, cores, vents) with a soft bloom. Left-right symmetric shapes are drawn
// once and mirrored. Parts that react during the fight carry classes (b-core, b-eye,
// b-vent, b-l / b-r …) that css/bosses.css animates.

const OUT = 'stroke="#05070f" stroke-width="2.4" stroke-linejoin="round"';

function svg(id, vb, [l, c, d, e], draw) {
    const a = { H: `url(#h${id})`, M: `url(#m${id})`, E: `url(#e${id})`, F: `filter="url(#g${id})"`, l, c, d, e, w: vb[0], h: vb[1] };
    return `<svg class="boss-svg" viewBox="0 0 ${vb[0]} ${vb[1]}"><defs>` +
        `<linearGradient id="h${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${l}"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${d}"/></linearGradient>` +
        `<linearGradient id="m${id}" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#7c88a8"/><stop offset=".45" stop-color="#343c56"/><stop offset="1" stop-color="#11141f"/></linearGradient>` +
        `<radialGradient id="e${id}"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="${e}"/><stop offset="1" stop-color="${e}" stop-opacity="0"/></radialGradient>` +
        `<filter id="g${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
        `</defs>${draw(a)}</svg>`;
}

const mir = (w, s) => s + `<g transform="matrix(-1 0 0 1 ${w} 0)">${s}</g>`;
const p = (d, fill, extra) => `<path d="${d}" fill="${fill}" ${extra ?? OUT}/>`;
const shine = (d, o = 0.26) => `<path d="${d}" fill="#fff" opacity="${o}"/>`;
const shade = (d, o = 0.3) => `<path d="${d}" fill="#05070f" opacity="${o}"/>`;
const seam = (d, o = 0.5) => `<path d="${d}" fill="none" stroke="#05070f" stroke-width="1.5" opacity="${o}" stroke-linecap="round"/>`;
const glow = (d, col, w = 2.4, cls = '') => `<path class="${cls}" d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity=".95"/>`;
const lamp = (a, x, y, r, cls = 'b-core') => `<circle cx="${x}" cy="${y}" r="${r * 2.3}" fill="${a.E}" opacity=".8"/><circle class="${cls}" cx="${x}" cy="${y}" r="${r}" fill="${a.e}" ${a.F}/><circle cx="${x - r * 0.28}" cy="${y - r * 0.32}" r="${r * 0.36}" fill="#fff" opacity=".9"/>`;
const eye = (a, d, cls = 'b-eye') => `<path d="${d}" fill="#05070f" stroke="#05070f" stroke-width="5" stroke-linejoin="round"/><path class="${cls}" d="${d}" fill="${a.e}" ${a.F}/>`;
const bolt = (x, y, r = 2.6) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#0a0d18"/><circle cx="${x - 0.7}" cy="${y - 0.7}" r="${r * 0.4}" fill="#fff" opacity=".5"/>`;

export const ART = {
    warden: () => svg('wd', [200, 200], ['#ffd08a', '#e07a22', '#6e2c06', '#ffb347'], (a) =>
        mir(200, p('M18 74 L42 64 L46 134 L30 152 L16 138 Z', a.M) + p('M22 146 L38 146 L35 182 L25 182 Z', a.M) + `<rect class="b-vent" x="24" y="168" width="12" height="10" rx="2" fill="${a.e}" ${a.F}/>`) +
        p('M62 26 L138 26 L172 60 L172 130 L138 168 L62 168 L28 130 L28 60 Z', a.H) +
        shine('M64 30 L136 30 L164 58 L36 58 Z') + shade('M30 122 L170 122 L138 166 L62 166 Z', 0.32) +
        mir(200, `<rect class="b-vent" x="66" y="34" width="26" height="9" rx="3" fill="#200a02" ${OUT}/>` + seam('M40 66 L62 44') + bolt(46, 118) + bolt(60, 150)) +
        p('M44 82 L156 82 L146 116 L54 116 Z', '#0a0d18') + lamp(a, 100, 99, 12) + mir(200, glow('M58 92 L78 92', a.e, 3, 'b-eye')) +
        p('M70 130 L130 130 L120 154 L80 154 Z', a.M) + seam('M82 138 L118 138 M86 146 L114 146')),

    twins: () => svg('tw', [250, 112], ['#ffb3d6', '#e02a7c', '#5a0a30', '#ff7ab8'], (a) => {
        const fang = (cls) => `<g class="${cls}">` + p('M10 22 L34 8 L62 8 L86 22 L76 66 L58 104 L48 86 L38 104 L20 66 Z', a.H) + shine('M30 12 L66 12 L80 24 L16 24 Z') +
            p('M22 30 L4 58 L22 62 Z', a.M) + p('M74 30 L92 58 L74 62 Z', a.M) + shade('M24 62 L72 62 L58 100 L48 82 L38 100 Z', 0.3) +
            eye(a, 'M26 34 L44 40 L30 48 Z') + eye(a, 'M70 34 L52 40 L66 48 Z') + lamp(a, 48, 64, 7) + seam('M34 20 L48 28 L62 20') + `</g>`;
        return `<path class="b-tether" d="M90 50 Q125 30 160 50" fill="none" stroke="${a.e}" stroke-width="4" stroke-dasharray="3 7" stroke-linecap="round" ${a.F}/>` +
            `<g transform="translate(4 2)">${fang('b-l')}</g><g transform="translate(150 2)">${fang('b-r')}</g>`;
    }),

    cubeking: () => svg('ck', [200, 200], ['#d9a4ff', '#8a2be2', '#2e0a66', '#ffd21a'], (a) =>
        mir(200, p('M26 72 L8 24 L54 46 Z', a.H) + p('M36 150 L12 190 L58 172 Z', a.H) + shine('M24 60 L14 32 L44 46 Z', 0.3)) +
        p('M32 56 L100 30 L168 56 L184 120 L164 176 L100 190 L36 176 L16 120 Z', a.H) + shine('M38 60 L100 36 L162 60 L150 74 L50 74 Z') +
        shade('M22 124 L178 124 L162 174 L100 188 L38 174 Z', 0.34) + seam('M100 32 L100 74 M36 176 L64 132 M164 176 L136 132') +
        p('M62 46 L74 16 L88 34 L100 8 L112 34 L126 16 L138 46 Z', '#ffd21a') + shine('M68 42 L76 24 L86 38 L100 16 L100 42 Z', 0.4) + lamp(a, 100, 34, 5) +
        mir(200, eye(a, 'M44 86 L92 100 L52 120 Z') + bolt(32, 116, 3) + bolt(58, 168, 3)) +
        p('M50 140 L66 160 L82 142 L100 162 L118 142 L134 160 L150 140 L142 172 L58 172 Z', '#05070f', '') + p('M54 142 L66 156 L80 144 L100 158 L120 144 L134 156 L146 142', 'none', 'stroke="#fff" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"')),

    hive: () => svg('hv', [200, 200], ['#ffe9a3', '#f0a020', '#6b3a00', '#ffe45c'], (a) =>
        mir(200, p('M40 60 L4 30 L16 82 L38 92 Z', a.M) + glow('M12 40 L30 78', a.e, 2) + p('M44 128 L10 150 L40 160 Z', a.M) + p('M58 30 L44 6 L66 24 Z', a.M)) +
        p('M100 22 L150 46 L166 96 L146 150 L100 186 L54 150 L34 96 L50 46 Z', a.H) + shine('M100 26 L144 48 L152 70 L48 70 L56 48 Z') +
        shade('M40 108 L160 108 L144 148 L100 182 L56 148 Z', 0.34) +
        // honeycomb abdomen
        [[100, 122], [78, 134], [122, 134], [100, 148], [78, 110], [122, 110]].map(([x, y], i) => `<path class="${i === 0 ? 'b-core' : ''}" d="M${x} ${y - 12} l10 6 v11 l-10 6 l-10 -6 v-11 Z" fill="${i === 0 ? a.e : '#2a1600'}" stroke="#05070f" stroke-width="1.8" ${i === 0 ? a.F : ''}/>`).join('') +
        mir(200, eye(a, 'M58 62 L92 74 L64 88 Z')) + p('M88 88 L100 100 L112 88 L108 80 L92 80 Z', '#05070f', '') + `<circle cx="100" cy="42" r="6" fill="${a.e}" ${a.F}/>`),

    bulwark: () => svg('bw', [220, 124], ['#bfe0ff', '#2f7fe0', '#0b2a66', '#7fd0ff'], (a) =>
        mir(220, p('M6 30 L34 18 L34 96 L18 110 L6 92 Z', a.M) + p('M12 96 L28 96 L26 122 L14 122 Z', a.M) + `<rect x="14" y="110" width="12" height="9" rx="2" fill="${a.e}" ${a.F}/>`) +
        p('M34 14 L186 14 L206 40 L196 96 L150 116 L70 116 L24 96 L14 40 Z', a.H) + shine('M38 18 L182 18 L198 40 L22 40 Z') + shade('M22 84 L198 84 L150 114 L70 114 Z', 0.34) +
        seam('M110 16 L110 56 M60 18 L50 56 M160 18 L170 56') + mir(220, bolt(40, 30) + bolt(40, 70) + bolt(76, 104)) +
        p('M62 44 L158 44 L150 70 L70 70 Z', '#0a0d18') + mir(220, eye(a, 'M72 50 L104 56 L78 64 Z')) + lamp(a, 110, 92, 8)),

    magnetar: () => svg('mg', [200, 200], ['#c9f6ff', '#1aa8d8', '#07304e', '#ff5cf0'], (a) =>
        `<ellipse class="b-spin" cx="100" cy="100" rx="94" ry="30" fill="none" stroke="${a.e}" stroke-width="4" opacity=".85" ${a.F}/>` +
        `<ellipse class="b-spin2" cx="100" cy="100" rx="94" ry="30" fill="none" stroke="${a.l}" stroke-width="3" opacity=".8" transform="rotate(60 100 100)"/>` +
        mir(200, p('M30 60 L6 44 L10 100 L6 156 L30 140 L42 100 Z', a.M) + glow('M14 62 L14 138', a.e, 3)) +
        `<circle cx="100" cy="100" r="60" fill="${a.H}" ${OUT}/>` + shine('M100 44 A56 56 0 0 1 152 84 L48 84 A56 56 0 0 1 100 44 Z') + shade('M44 112 A58 58 0 0 0 156 112 L100 160 Z', 0.3) +
        seam('M42 100 L158 100 M100 42 L100 76 M100 126 L100 158') + `<circle cx="100" cy="100" r="26" fill="#05070f"/>` + lamp(a, 100, 100, 14) +
        mir(200, eye(a, 'M54 78 L80 86 L60 94 Z')) + mir(200, bolt(58, 132, 3) + bolt(72, 56, 3))),

    serpent: () => svg('sp', [200, 200], ['#b6ffc4', '#1fb04e', '#064a1c', '#d6ff5a'], (a) =>
        mir(200, p('M40 50 L10 18 L26 74 Z', a.M) + p('M34 110 L6 130 L40 140 Z', a.M)) +
        p('M100 12 L158 44 L176 104 L150 156 L118 176 L100 196 L82 176 L50 156 L24 104 L42 44 Z', a.H) + shine('M100 16 L152 46 L160 72 L40 72 L48 46 Z') +
        shade('M32 118 L168 118 L148 154 L100 192 L52 154 Z', 0.34) + seam('M100 14 L100 70 M60 60 L80 86 M140 60 L120 86') +
        mir(200, eye(a, 'M46 84 L90 98 L56 116 Z')) + p('M74 138 L84 164 L92 142 L100 170 L108 142 L116 164 L126 138 Z', '#fff', 'stroke="#05070f" stroke-width="2"') +
        mir(200, `<circle cx="84" cy="124" r="3" fill="#05070f"/>`)),

    bombardier: () => svg('bb', [200, 200], ['#eef4b0', '#8e9a3a', '#2f3a0c', '#ff6b3c'], (a) =>
        mir(200, p('M40 92 L4 78 L4 122 L40 122 Z', a.M) + `<circle cx="18" cy="100" r="9" fill="#0a0d18" ${OUT}/><circle class="b-spin" cx="18" cy="100" r="5" fill="${a.e}" ${a.F}/>` + p('M52 150 L40 184 L66 170 Z', a.M)) +
        p('M100 34 C160 34 184 70 184 104 C184 140 150 164 100 164 C50 164 16 140 16 104 C16 70 40 34 100 34 Z', a.H) + shine('M100 38 C150 38 172 62 176 84 L24 84 C28 62 50 38 100 38 Z') +
        shade('M20 118 L180 118 C170 148 140 162 100 162 C60 162 30 148 20 118 Z', 0.36) + seam('M30 104 L170 104 M100 36 L100 84') +
        p('M62 20 L138 20 L128 40 L72 40 Z', a.M) + mir(200, eye(a, 'M50 66 L90 74 L58 88 Z') + bolt(34, 96) + bolt(60, 44)) +
        [58, 86, 114, 142].map(x => `<rect x="${x - 10}" y="128" width="20" height="24" rx="5" fill="#0a0d18" ${OUT}/><circle class="b-core" cx="${x}" cy="141" r="5" fill="${a.e}" ${a.F}/>`).join('')),

    storm: () => svg('st', [200, 200], ['#fff7c2', '#d6a81a', '#5a3e02', '#9fe8ff'], (a) =>
        `<path class="b-rod" d="M100 40 L100 4" stroke="${a.e}" stroke-width="5" stroke-linecap="round" ${a.F}/><circle class="b-core" cx="100" cy="8" r="8" fill="${a.e}" ${a.F}/>` +
        mir(200, p('M52 56 L8 70 L22 96 L4 112 L46 122 Z', a.H) + shine('M48 60 L16 72 L26 84 Z', 0.3) + p('M56 150 L34 186 L74 166 Z', a.M)) +
        p('M100 30 L152 50 L176 100 L150 150 L100 176 L50 150 L24 100 L48 50 Z', a.H) + shine('M100 34 L148 52 L160 76 L40 76 L52 52 Z') +
        shade('M30 112 L170 112 L148 148 L100 172 L52 148 Z', 0.34) +
        glow('M108 62 L88 100 L106 100 L90 138', a.e, 6, 'b-eye') + glow('M108 62 L88 100 L106 100 L90 138', '#fff', 2) +
        mir(200, eye(a, 'M44 84 L76 92 L50 104 Z') + bolt(40, 124, 3)) + seam('M56 140 L100 160 L144 140')),

    phantom: () => svg('ph', [200, 200], ['#eaffff', '#3ac6d8', '#0a4a5c', '#b9ffff'], (a) =>
        p('M100 14 C150 14 176 54 172 100 C170 130 178 150 186 178 L160 160 L146 188 L124 164 L100 192 L76 164 L54 188 L40 160 L14 178 C22 150 30 130 28 100 C24 54 50 14 100 14 Z', a.H, 'stroke="#05070f" stroke-width="2.4" stroke-linejoin="round" opacity=".92"') +
        shine('M100 18 C140 18 160 44 166 76 L34 76 C40 44 60 18 100 18 Z', 0.34) + shade('M30 110 L170 110 L186 176 L160 158 L146 186 L124 162 L100 190 L76 162 L54 186 L40 158 L14 176 Z', 0.28) +
        mir(200, eye(a, 'M48 70 L88 84 L58 104 Z')) + p('M84 122 Q100 142 116 122 Q100 132 84 122 Z', '#05070f', '') + lamp(a, 100, 46, 7) +
        mir(200, glow('M40 120 Q34 140 44 156', a.e, 2))),

    frost: () => svg('fr', [200, 200], ['#ffffff', '#7fd8f5', '#1c5c86', '#e6fbff'], (a) =>
        mir(200, p('M52 58 L20 6 L70 44 Z', a.H) + p('M30 96 L2 84 L8 124 L34 122 Z', a.H) + p('M56 150 L30 192 L78 168 Z', a.H) + shine('M48 50 L26 16 L62 42 Z', 0.4)) +
        p('M100 8 L122 46 L160 58 L176 104 L148 152 L100 184 L52 152 L24 104 L40 58 L78 46 Z', a.H) + shine('M100 14 L118 48 L154 60 L160 76 L40 76 L46 60 L82 48 Z', 0.4) +
        shade('M30 112 L170 112 L148 150 L100 180 L52 150 Z', 0.3) + seam('M100 12 L100 60 M78 46 L100 80 L122 46 M40 58 L100 80 L160 58', 0.35) +
        mir(200, eye(a, 'M50 86 L88 96 L58 110 Z')) + lamp(a, 100, 132, 9) + p('M86 150 L92 166 L100 152 L108 166 L114 150 Z', '#fff', 'stroke="#05070f" stroke-width="1.6"')),

    suneater: () => svg('se', [200, 200], ['#fff3b0', '#ff8a1a', '#7a1e00', '#ffe45c'], (a) =>
        `<g class="b-spin">` + Array.from({ length: 12 }, (_, i) => `<path d="M100 2 L112 34 L88 34 Z" fill="${a.H}" stroke="#05070f" stroke-width="2" transform="rotate(${i * 30} 100 100)"/>`).join('') + `</g>` +
        `<circle cx="100" cy="100" r="68" fill="${a.H}" ${OUT}/>` + shine('M100 36 A64 64 0 0 1 160 82 L40 82 A64 64 0 0 1 100 36 Z', 0.34) + shade('M38 116 A64 64 0 0 0 162 116 L100 166 Z', 0.3) +
        `<circle cx="100" cy="100" r="68" fill="${a.E}" opacity=".35"/>` + mir(200, eye(a, 'M48 74 L90 86 L58 104 Z')) +
        p('M66 122 L80 114 L90 126 L100 114 L110 126 L120 114 L134 122 L124 152 L100 160 L76 152 Z', '#1a0500') + lamp(a, 100, 140, 9)),

    prism: () => svg('pr', [200, 200], ['#ffe0fb', '#d94cd0', '#4a0f66', '#ffffff'], (a) =>
        p('M100 6 L186 150 L100 194 L14 150 Z', a.H) +
        `<path class="b-facet" d="M100 6 L100 194 L14 150 Z" fill="#7df9ff" opacity=".28"/><path class="b-facet" d="M100 6 L186 150 L100 110 Z" fill="#ffe45c" opacity=".25"/><path class="b-facet" d="M100 110 L186 150 L100 194 Z" fill="#8a5cff" opacity=".35"/>` +
        shine('M100 12 L132 66 L100 80 L68 66 Z', 0.42) + seam('M100 8 L100 192 M14 150 L100 110 L186 150', 0.4) +
        mir(200, eye(a, 'M58 110 L92 116 L66 132 Z')) + lamp(a, 100, 150, 9) + mir(200, glow('M40 150 L72 166', a.e, 2))),

    mitosis: () => svg('mt', [200, 200], ['#e4ffb8', '#5fd03a', '#14520c', '#f4ff8a'], (a) =>
        p('M100 16 C140 10 178 40 182 84 C190 120 170 168 126 182 C100 192 66 190 44 170 C14 146 8 100 26 62 C40 34 70 20 100 16 Z', a.H) +
        shine('M100 22 C134 18 164 40 170 70 C120 60 70 62 34 74 C44 44 70 26 100 22 Z', 0.34) + shade('M24 116 C60 134 140 134 178 112 C174 150 150 176 110 184 C70 190 34 164 24 116 Z', 0.28) +
        [[62, 66, 13], [140, 76, 10], [58, 134, 9], [146, 132, 14], [104, 160, 8]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#0c3a08" opacity=".55"/><circle cx="${x - r * 0.25}" cy="${y - r * 0.3}" r="${r * 0.55}" fill="${a.e}" opacity=".55"/>`).join('') +
        `<circle cx="100" cy="100" r="30" fill="#0a2a06" ${OUT}/>` + lamp(a, 100, 100, 15) + mir(200, eye(a, 'M60 92 L84 98 L66 108 Z'))),

    bastion: () => svg('bs', [200, 200], ['#c9fff0', '#2aa888', '#063f33', '#7dffd8'], (a) =>
        mir(200, p('M34 120 L4 132 L10 164 L44 156 Z', a.M) + p('M40 60 L14 40 L22 84 Z', a.M)) +
        p('M100 18 C150 18 184 54 184 100 L184 132 L150 170 L50 170 L16 132 L16 100 C16 54 50 18 100 18 Z', a.H) +
        shine('M100 22 C144 22 174 50 178 84 L22 84 C26 50 56 22 100 22 Z') + shade('M18 124 L182 124 L150 168 L50 168 Z', 0.36) +
        seam('M100 20 L100 80 M56 34 L72 84 M144 34 L128 84 M22 84 L178 84', 0.45) + mir(200, bolt(40, 70, 3) + bolt(70, 44, 3) + bolt(34, 110, 3)) +
        mir(200, eye(a, 'M48 94 L80 100 L54 110 Z')) +
        `<g class="b-maw"><path d="M66 122 L134 122 L124 160 L76 160 Z" fill="#05070f" ${OUT}/><circle class="b-core" cx="100" cy="141" r="13" fill="${a.e}" ${a.F}/></g>` +
        `<path class="b-lid" d="M62 118 L138 118 L128 164 L72 164 Z" fill="${a.M}" ${OUT}/>`),

    leech: () => svg('lc', [200, 200], ['#d8ffe6', '#22b868', '#06472a', '#b4ff6a'], (a) =>
        mir(200, glow('M50 120 Q20 140 28 176', a.d, 9) + glow('M50 120 Q20 140 28 176', a.c, 5) + glow('M64 150 Q52 176 66 194', a.d, 8) + glow('M64 150 Q52 176 66 194', a.c, 4) + p('M40 64 L8 40 L20 86 Z', a.M)) +
        p('M100 20 C146 20 172 54 168 96 C166 136 140 166 100 170 C60 166 34 136 32 96 C28 54 54 20 100 20 Z', a.H) +
        shine('M100 24 C138 24 160 48 162 76 L38 76 C40 48 62 24 100 24 Z') + shade('M34 108 C60 124 140 124 166 108 C160 140 136 164 100 168 C64 164 40 140 34 108 Z', 0.3) +
        mir(200, eye(a, 'M50 70 L90 82 L58 98 Z')) +
        `<circle cx="100" cy="128" r="24" fill="#05070f" ${OUT}/>` + Array.from({ length: 8 }, (_, i) => `<path d="M100 108 L105 120 L95 120 Z" fill="#fff" transform="rotate(${i * 45} 100 128)"/>`).join('') + lamp(a, 100, 128, 7)),

    null_: () => svg('nl', [200, 200], ['#d9ccff', '#5b3fd0', '#150a4a', '#c49bff'], (a) =>
        mir(200, p('M70 70 L4 110 L30 116 L10 150 L64 124 Z', a.M) + glow('M22 110 L58 96', a.e, 2) + p('M84 30 L72 2 L92 22 Z', a.M)) +
        p('M100 14 L136 56 L150 116 L124 168 L100 190 L76 168 L50 116 L64 56 Z', a.H) + shine('M100 20 L130 58 L134 76 L66 76 L70 58 Z') +
        shade('M54 120 L146 120 L124 166 L100 186 L76 166 Z', 0.38) + seam('M100 16 L100 66 M66 76 L134 76 M76 168 L100 130 L124 168', 0.45) +
        p('M68 86 L132 86 L124 110 L76 110 Z', '#05070f') + glow('M76 98 L124 98', a.e, 5, 'b-eye') + lamp(a, 100, 140, 9) +
        `<circle class="b-ring" cx="100" cy="100" r="92" fill="none" stroke="${a.e}" stroke-width="2" stroke-dasharray="4 10" opacity=".6"/>`),

    rampart: () => svg('rp', [200, 200], ['#ffe2b0', '#d8842a', '#5e2c06', '#ffd76a'], (a) =>
        mir(200, p('M30 90 L4 90 L4 150 L30 150 Z', a.M) + `<rect x="8" y="150" width="18" height="30" fill="${a.M}" ${OUT}/>` + `<rect x="10" y="170" width="14" height="8" rx="2" fill="${a.e}" ${a.F}/>`) +
        p('M30 50 L50 50 L50 34 L78 34 L78 50 L122 50 L122 34 L150 34 L150 50 L170 50 L170 170 L30 170 Z', a.H) + shine('M34 54 L166 54 L166 74 L34 74 Z') + shade('M30 126 L170 126 L170 168 L30 168 Z', 0.34) +
        seam('M30 90 L170 90 M30 130 L170 130 M66 50 L66 90 M134 50 L134 90 M100 90 L100 130 M48 130 L48 170 M152 130 L152 170 M100 130 L100 170', 0.4) +
        p('M56 96 L144 96 L138 122 L62 122 Z', '#0a0d18') + mir(200, eye(a, 'M66 102 L94 108 L72 116 Z')) + lamp(a, 100, 150, 9) + mir(200, bolt(40, 60, 3) + bolt(40, 160, 3))),

    nightshade: () => svg('ns', [200, 200], ['#ecc8ff', '#8a2bd6', '#2a0a52', '#ff7df2'], (a) =>
        mir(200, p('M70 70 C40 20 16 22 4 40 C28 44 30 70 20 92 C40 82 50 96 46 122 C60 108 76 104 86 110 Z', a.H) + shine('M62 62 C42 30 22 30 12 40 C30 44 36 62 30 80 Z', 0.26) +
            p('M66 130 C40 140 30 164 36 190 C50 170 66 164 86 160 Z', a.M)) +
        p('M100 30 L138 62 L148 112 L124 160 L100 186 L76 160 L52 112 L62 62 Z', a.H) + shine('M100 36 L132 64 L136 82 L64 82 L68 64 Z') + shade('M56 118 L144 118 L124 158 L100 182 L76 158 Z', 0.36) +
        mir(200, eye(a, 'M62 86 L92 96 L68 110 Z')) + lamp(a, 100, 136, 10) + mir(200, `<path d="M88 30 Q70 8 60 14" fill="none" stroke="${a.c}" stroke-width="3" stroke-linecap="round"/><circle cx="60" cy="14" r="4" fill="${a.e}" ${a.F}/>`)),

    crusher: () => svg('cr', [200, 200], ['#ffd0bf', '#d8482a', '#5a1206', '#ffb347'], (a) =>
        mir(200, p('M2 40 L40 40 L40 170 L2 170 Z', a.M) + shine('M6 44 L36 44 L36 60 L6 60 Z', 0.18) + seam('M2 80 L40 80 M2 120 L40 120', 0.5) + `<rect x="40" y="88" width="22" height="26" fill="#0a0d18" ${OUT}/>` + bolt(21, 60, 4) + bolt(21, 150, 4) +
            p('M2 170 L40 170 L32 196 L10 196 Z', a.H)) +
        p('M60 46 L140 46 L158 78 L158 132 L140 164 L60 164 L42 132 L42 78 Z', a.H) + shine('M62 50 L138 50 L152 78 L48 78 Z') + shade('M44 124 L156 124 L140 162 L60 162 Z', 0.36) +
        p('M60 86 L140 86 L132 112 L68 112 Z', '#0a0d18') + mir(200, eye(a, 'M68 92 L94 98 L74 106 Z')) + lamp(a, 100, 138, 9) + seam('M100 48 L100 84') +
        p('M84 26 L116 26 L122 46 L78 46 Z', a.M)),

    echo: () => svg('ec', [200, 200], ['#ffffff', '#aebfe6', '#2c3a66', '#9fe8ff'], (a) =>
        mir(200, p('M52 40 L20 8 L34 70 Z', a.M) + p('M36 96 L8 110 L34 140 Z', a.M)) +
        p('M100 12 L152 40 L168 100 L150 150 L100 190 L50 150 L32 100 L48 40 Z', a.H) +
        `<path d="M100 12 L152 40 L168 100 L150 150 L100 190 Z" fill="#05070f" opacity=".16"/>` + shine('M100 18 L146 42 L154 70 L46 70 L54 42 Z', 0.5) + shine('M60 84 L72 150 L100 180 L100 84 Z', 0.16) +
        seam('M100 14 L100 188', 0.45) + p('M46 82 L154 82 L146 106 L112 112 L100 136 L88 112 L54 106 Z', '#05070f') +
        mir(200, glow('M56 92 L92 98', a.e, 5, 'b-eye')) + lamp(a, 100, 160, 7) + p('M92 8 L100 -4 L108 8 L104 30 L96 30 Z', a.c)),

    shardkeeper: () => svg('sk', [200, 200], ['#ffffff', '#6fc8f0', '#144a78', '#e6fbff'], (a) =>
        `<circle cx="100" cy="100" r="86" fill="${a.E}" opacity=".35"/>` +
        mir(200, p('M44 100 L10 82 L10 118 Z', a.H)) + p('M100 10 L118 44 L100 56 L82 44 Z', a.H) + p('M100 190 L118 156 L100 144 L82 156 Z', a.H) +
        p('M100 34 L150 64 L166 100 L150 136 L100 166 L50 136 L34 100 L50 64 Z', a.H) + shine('M100 38 L146 66 L152 82 L48 82 L54 66 Z', 0.4) + shade('M38 110 L162 110 L150 134 L100 162 L50 134 Z', 0.3) +
        seam('M100 36 L100 70 M50 64 L80 88 M150 64 L120 88', 0.4) + `<circle cx="100" cy="104" r="28" fill="#05070f" ${OUT}/>` + lamp(a, 100, 104, 15) + mir(200, eye(a, 'M54 86 L72 90 L58 98 Z'))),

    rebound: () => svg('rb', [200, 200], ['#ffd7bf', '#e0602a', '#5a1c06', '#ffe45c'], (a) =>
        mir(200, p('M36 70 L6 86 L6 140 L36 150 Z', a.M) + bolt(20, 100, 4) + bolt(20, 128, 4) + p('M44 40 L24 22 L34 62 Z', a.M)) +
        p('M56 22 L144 22 L172 56 L172 126 L150 150 L50 150 L28 126 L28 56 Z', a.H) + shine('M58 26 L142 26 L164 56 L36 56 Z') + shade('M30 112 L170 112 L150 148 L50 148 Z', 0.36) +
        mir(200, eye(a, 'M48 66 L88 74 L56 88 Z')) + seam('M100 24 L100 60') +
        p('M62 126 L138 126 L146 190 L54 190 Z', a.M) + `<ellipse cx="100" cy="188" rx="44" ry="9" fill="#05070f" ${OUT}/><ellipse class="b-core" cx="100" cy="188" rx="30" ry="5" fill="${a.e}" ${a.F}/>` + seam('M60 150 L140 150 M58 168 L142 168', 0.5)),

    gale: () => svg('gl', [200, 200], ['#eafff8', '#2ed0a8', '#06523f', '#c9fff0'], (a) =>
        `<g class="b-spin">` + [0, 72, 144, 216, 288].map(r => `<path d="M100 100 C116 60 150 30 188 34 C170 58 150 84 126 106 Z" fill="${a.M}" stroke="#05070f" stroke-width="2.2" transform="rotate(${r} 100 100)"/><path d="M110 92 C124 66 148 46 172 42" fill="none" stroke="${a.e}" stroke-width="2" opacity=".8" transform="rotate(${r} 100 100)"/>`).join('') + `</g>` +
        `<circle cx="100" cy="100" r="50" fill="${a.H}" ${OUT}/>` + shine('M100 54 A46 46 0 0 1 142 84 L58 84 A46 46 0 0 1 100 54 Z', 0.36) + shade('M56 112 A46 46 0 0 0 144 112 L100 146 Z', 0.3) +
        mir(200, eye(a, 'M62 86 L92 94 L68 106 Z')) + p('M88 118 Q100 134 112 118 Q100 126 88 118 Z', '#05070f', '') + lamp(a, 100, 68, 6)),

    chrono: () => svg('ch', [200, 200], ['#fff2c2', '#d8a020', '#5a3a02', '#ffffff'], (a) =>
        mir(200, p('M44 40 L14 20 L26 66 Z', a.M) + p('M40 160 L14 186 L58 172 Z', a.M)) +
        `<circle cx="100" cy="100" r="82" fill="${a.M}" ${OUT}/><circle cx="100" cy="100" r="70" fill="${a.H}" ${OUT}/>` + shine('M100 34 A66 66 0 0 1 162 80 L38 80 A66 66 0 0 1 100 34 Z', 0.34) +
        Array.from({ length: 12 }, (_, i) => `<rect x="98" y="34" width="4" height="${i % 3 === 0 ? 14 : 8}" fill="#05070f" transform="rotate(${i * 30} 100 100)"/>`).join('') +
        `<path class="b-hand1" d="M100 100 L100 46" stroke="#05070f" stroke-width="6" stroke-linecap="round"/><path class="b-hand2" d="M100 100 L136 100" stroke="${a.e}" stroke-width="4" stroke-linecap="round" ${a.F}/>` +
        mir(200, eye(a, 'M60 116 L88 122 L66 132 Z')) + lamp(a, 100, 100, 8) + p('M88 6 L112 6 L108 22 L92 22 Z', a.M)),

    // ---- milestone bosses ----
    dreadnought: () => svg('dn', [290, 170], ['#ffc2c2', '#c0282e', '#3e060a', '#ffd76a'], (a) =>
        mir(290, p('M30 40 L2 62 L10 122 L44 132 Z', a.M) + shine('M28 46 L8 62 L12 76 Z', 0.2) + p('M60 20 L46 2 L84 16 Z', a.M) + glow('M14 70 L18 116', a.e, 3)) +
        p('M44 22 L246 22 L276 56 L266 122 L226 148 L64 148 L24 122 L14 56 Z', a.H) + shine('M48 26 L242 26 L268 56 L22 56 Z') + shade('M24 104 L266 104 L226 146 L64 146 Z', 0.36) +
        seam('M145 24 L145 62 M84 26 L70 62 M206 26 L220 62 M22 62 L268 62 M64 146 L84 108 L206 108 L226 146', 0.45) +
        mir(290, bolt(40, 40, 3.4) + bolt(40, 92, 3.4) + bolt(96, 132, 3.4) + bolt(120, 40, 3.4)) +
        p('M86 68 L204 68 L194 98 L96 98 Z', '#0a0d18') + mir(290, eye(a, 'M98 74 L136 82 L106 92 Z')) +
        p('M118 4 L172 4 L164 24 L126 24 Z', a.M) + `<g class="b-reactor"><circle cx="145" cy="122" r="20" fill="#05070f" ${OUT}/>` + lamp(a, 145, 122, 11) + `</g>`),

    hydra: () => svg('hy', [280, 180], ['#c2ffe6', '#17a877', '#054a33', '#b4ff6a'], (a) =>
        mir(280, p('M60 60 L8 20 L28 88 L6 104 L52 112 Z', a.M) + glow('M22 40 L44 94', a.e, 2) + p('M70 26 L60 2 L92 20 Z', a.M)) +
        p('M70 12 L210 12 L250 44 L260 88 L230 112 L50 112 L20 88 L30 44 Z', a.H) + shine('M74 16 L206 16 L242 44 L38 44 Z') + shade('M24 80 L256 80 L230 110 L50 110 Z', 0.38) +
        seam('M140 14 L140 50 M96 16 L84 50 M184 16 L196 50', 0.4) + mir(280, bolt(60, 34, 3.4) + bolt(96, 96, 3.4)) +
        [[62, 0], [140, 1], [218, 2]].map(([x]) => `<path d="M${x - 18} 100 L${x + 18} 100 L${x + 12} 128 L${x - 12} 128 Z" fill="${a.M}" ${OUT}/>`).join('') + lamp(a, 140, 66, 12)),

    hydraHead: (i) => svg('hh' + i, [100, 100], [['#ffd9b0', '#e8601a', '#5a1a02', '#ffd24a'], ['#eafcff', '#5cc8f0', '#124a78', '#e6fbff'], ['#dcffb0', '#4fc02a', '#12500a', '#e4ff6a']][i], (a) =>
        mir(100, p('M26 20 L8 2 L16 36 Z', a.M)) + p('M50 6 L82 22 L92 56 L74 84 L50 98 L26 84 L8 56 L18 22 Z', a.H) + shine('M50 10 L78 24 L84 38 L16 38 L22 24 Z', 0.34) + shade('M12 60 L88 60 L74 82 L50 94 L26 82 Z', 0.34) +
        mir(100, eye(a, 'M20 40 L44 46 L26 56 Z')) + p('M32 68 L38 82 L44 70 L50 84 L56 70 L62 82 L68 68 Z', '#fff', 'stroke="#05070f" stroke-width="1.6"')),

    architect: () => svg('ar', [230, 170], ['#d9f4ff', '#2fa8e0', '#083a66', '#ffffff'], (a) =>
        `<g class="b-spin"><rect x="75" y="45" width="80" height="80" fill="none" stroke="${a.e}" stroke-width="2.5" opacity=".7" transform="rotate(45 115 85)"/></g>` +
        mir(230, p('M40 30 L6 30 L6 76 L40 62 Z', a.M) + p('M40 108 L6 96 L6 140 L40 140 Z', a.M) + glow('M12 36 L12 68', a.e, 3) + glow('M12 104 L12 134', a.e, 3)) +
        p('M56 10 L174 10 L198 40 L198 126 L174 158 L56 158 L32 126 L32 40 Z', a.H) + shine('M58 14 L172 14 L192 40 L38 40 Z') + shade('M34 112 L196 112 L174 156 L56 156 Z', 0.36) +
        seam('M115 12 L115 50 M32 84 L198 84 M70 14 L70 50 M160 14 L160 50', 0.4) + mir(230, bolt(46, 46, 3.4) + bolt(46, 122, 3.4)) +
        p('M115 44 L152 84 L115 124 L78 84 Z', '#05070f') + lamp(a, 115, 84, 15) + mir(230, eye(a, 'M48 70 L70 76 L54 84 Z'))),

    eclipse: () => svg('ecl', [290, 140], ['#fff3b0', '#ff9a1a', '#7a2a00', '#ffe45c'], (a) =>
        `<path d="M120 70 L170 70" stroke="#b9c6ff" stroke-width="4" stroke-dasharray="3 8" stroke-linecap="round" opacity=".8"/>` +
        `<g class="b-l"><g class="b-spin" style="transform-origin:70px 70px">` + Array.from({ length: 10 }, (_, i) => `<path d="M70 2 L80 24 L60 24 Z" fill="${a.H}" stroke="#05070f" stroke-width="2" transform="rotate(${i * 36} 70 70)"/>`).join('') + `</g>` +
        `<circle cx="70" cy="70" r="48" fill="${a.H}" ${OUT}/>` + shine('M70 26 A44 44 0 0 1 110 56 L30 56 A44 44 0 0 1 70 26 Z', 0.34) +
        eye(a, 'M36 60 L62 68 L42 80 Z') + eye(a, 'M104 60 L78 68 L98 80 Z') + p('M52 90 L62 84 L70 92 L78 84 L88 90 L82 106 L58 106 Z', '#1a0500') + `</g>` +
        `<g class="b-r"><circle cx="220" cy="70" r="52" fill="#dfe6ff" ${OUT}/><circle cx="238" cy="62" r="44" fill="#0b1030"/>` +
        `<path d="M220 18 A52 52 0 1 0 220 122 A40 44 0 1 1 220 18 Z" fill="#b9c6ff" ${OUT}/>` + shine('M186 40 A50 50 0 0 1 212 22 L204 44 Z', 0.5) +
        `<path class="b-eye" d="M184 62 L204 70 L188 82 Z" fill="#7df9ff" filter="url(#gecl)"/><circle cx="246" cy="52" r="3" fill="#fff"/><circle cx="256" cy="84" r="2" fill="#fff"/><circle cx="232" cy="96" r="2.4" fill="#fff"/></g>`),

    emperor: () => svg('em', [260, 200], ['#ffc2f8', '#b012c8', '#2a0440', '#ffe45c'], (a) =>
        `<ellipse class="b-spin" cx="130" cy="108" rx="124" ry="34" fill="none" stroke="${a.e}" stroke-width="3" opacity=".75" filter="url(#gem)"/>` +
        mir(260, p('M52 78 L4 40 L20 104 L2 132 L50 132 Z', a.M) + glow('M16 60 L40 122', a.e, 2.4) + p('M60 160 L34 198 L86 178 Z', a.M) + p('M70 54 L48 8 L92 40 Z', a.H) + shine('M68 46 L54 18 L84 40 Z', 0.34)) +
        p('M130 28 L190 50 L220 100 L198 156 L130 192 L62 156 L40 100 L70 50 Z', a.H) + shine('M130 34 L186 54 L204 82 L56 82 L74 54 Z') + shade('M46 112 L214 112 L198 154 L130 188 L62 154 Z', 0.38) +
        seam('M130 30 L130 78 M74 54 L106 90 M186 54 L154 90', 0.4) +
        p('M92 44 L104 6 L118 30 L130 0 L142 30 L156 6 L168 44 Z', '#ffd21a') + shine('M98 40 L106 16 L116 34 L130 8 L130 40 Z', 0.4) + lamp(a, 130, 30, 6) +
        mir(260, eye(a, 'M68 92 L118 106 L78 126 Z') + bolt(58, 116, 3.4) + bolt(86, 160, 3.4)) +
        `<circle cx="130" cy="146" r="22" fill="#05070f" ${OUT}/>` + lamp(a, 130, 146, 12))
};
