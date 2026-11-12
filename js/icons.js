// ===== ICONS =====
// Every emoji shown to the player is swapped for an SVG from this set, so the game looks the
// same on every device (emoji are drawn by the OS and differ per platform, flags are missing
// on Windows). Source strings may keep using emoji characters as keys: the observer below
// replaces them in text as it is rendered (i18n texts, templates, floating messages…).
// Add an icon: draw it in G (24x24, gradients from the palette), then list its emoji in MAP.
const PAL = { gold: ['#fff3b0', '#ffb703'], red: ['#ff9aa8', '#d61f45'], green: ['#9dffcb', '#12a15f'], blue: ['#9fd4ff', '#2766d6'], cyan: ['#c2f9ff', '#17b6d8'], purple: ['#e2c2ff', '#8a35d8'], orange: ['#ffd29a', '#e8641a'], steel: ['#e4ebf8', '#6f7d9c'], pink: ['#ffc2ee', '#d63db8'], brown: ['#e0b48a', '#8a5224'], white: ['#ffffff', '#c9d6ee'], dark: ['#59647f', '#1a2036'] };
const D = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${Object.entries(PAL).map(([k, [a, b]]) => `<linearGradient id="ig-${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`).join('')}</defs></svg>`;
const f = (c) => `fill="url(#ig-${c})" stroke="#0a0d1c" stroke-width="1.1" stroke-linejoin="round"`;
const w = (d, c = '#fff', sw = 2.4) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
const disc = (c, inner) => `<circle cx="12" cy="12" r="10" ${f(c)}/><path d="M5 9 A8 8 0 0 1 19 9 Q12 6 5 9Z" fill="#fff" opacity=".28"/>${inner}`;
const star = (c, r = 10) => `<path d="M12 2.2 L14.8 8.4 L21.5 9.1 L16.5 13.6 L18 20.3 L12 16.8 L6 20.3 L7.5 13.6 L2.5 9.1 L9.2 8.4Z" ${f(c)}/>`;
const circ = (c, r = 9) => `<circle cx="12" cy="12" r="${r}" ${f(c)}/>`;
const medal = (c, n) => `<path d="M7 2 L11 11 L13 11 L17 2Z" ${f('blue')}/><circle cx="12" cy="15.5" r="6.5" ${f(c)}/><text x="12" y="18.6" font-size="8.5" font-weight="900" text-anchor="middle" fill="#0a0d1c" font-family="sans-serif">${n}</text>`;
const arrow = (rot) => `<g transform="rotate(${rot} 12 12)"><path d="M3 9.5 H13 V4.5 L21.5 12 L13 19.5 V14.5 H3Z" ${f('cyan')}/></g>`;
const tri = (rot) => `<g transform="rotate(${rot} 12 12)"><path d="M6 3.5 L20.5 12 L6 20.5Z" ${f('cyan')}/></g>`;
const flag = (bands, extra = '') => `<clipPath id="fc"><rect x="1.5" y="4.5" width="21" height="15" rx="2.5"/></clipPath><g clip-path="url(#fc)">${bands}${extra}</g><rect x="1.5" y="4.5" width="21" height="15" rx="2.5" fill="none" stroke="#0a0d1c" stroke-width="1.1"/>`;
const stripes = (cols, dir = 'h') => cols.map((c, i) => dir === 'h' ? `<rect x="1.5" y="${4.5 + i * 15 / cols.length}" width="21" height="${15 / cols.length + 0.1}" fill="${c}"/>` : `<rect x="${1.5 + i * 21 / cols.length}" y="4.5" width="${21 / cols.length + 0.1}" height="15" fill="${c}"/>`).join('');

const G = {
    check: disc('green', w('M7 12.5 L10.5 16 L17 8.5')), cross: disc('red', w('M8 8 L16 16 M16 8 L8 16')), warn: `<path d="M12 2.5 L22.5 20.5 H1.5Z" ${f('gold')}/>${w('M12 9 V14.5', '#0a0d1c', 2.4)}<circle cx="12" cy="17.3" r="1.3" fill="#0a0d1c"/>`,
    bolt: `<path d="M13.5 1.5 L4.5 13.5 H10.5 L9 22.5 L19.5 9.5 H13 Z" ${f('gold')}/>`, coin: `<circle cx="12" cy="12" r="10" ${f('gold')}/><circle cx="12" cy="12" r="6.6" fill="none" stroke="#a86a00" stroke-width="1.4"/><path d="M12 7.5 V16.5 M14.4 9.6 Q12 8 9.8 9.6 Q9.4 11.4 12 12 Q14.6 12.6 14.2 14.4 Q12 16 9.6 14.4" fill="none" stroke="#a86a00" stroke-width="1.5" stroke-linecap="round"/>`,
    pad: `<path d="M5 7.5 H19 Q23 7.5 22.5 13.5 L21.5 18 Q20.5 20 18.5 18.5 L16.5 16 H7.5 L5.5 18.5 Q3.5 20 2.5 18 L1.5 13.5 Q1 7.5 5 7.5Z" ${f('steel')}/>${w('M7 10.5 V14 M5.3 12.2 H8.7', '#0a0d1c', 1.6)}<circle cx="16" cy="11" r="1.3" fill="#d61f45"/><circle cx="18.3" cy="13" r="1.3" fill="#2766d6"/>`,
    lock: `<path d="M7.5 10.5 V7.5 A4.5 4.5 0 0 1 16.5 7.5 V10.5" fill="none" stroke="#a9b6d6" stroke-width="2.6"/><rect x="4.5" y="10.5" width="15" height="11" rx="2.5" ${f('gold')}/><circle cx="12" cy="15.2" r="1.6" fill="#0a0d1c"/><path d="M12 16 V18.5" stroke="#0a0d1c" stroke-width="1.6" stroke-linecap="round"/>`,
    unlock: `<path d="M7.5 10.5 V7 A4.5 4.5 0 0 1 16 5.5" fill="none" stroke="#a9b6d6" stroke-width="2.6" stroke-linecap="round"/><rect x="4.5" y="10.5" width="15" height="11" rx="2.5" ${f('green')}/><circle cx="12" cy="15.2" r="1.6" fill="#0a0d1c"/>`,
    key: `<circle cx="8" cy="12" r="5" ${f('gold')}/><circle cx="8" cy="12" r="1.8" fill="#0a0d1c"/><path d="M12.5 12 H22 M18.5 12 V16 M21.5 12 V15" fill="none" stroke="#ffb703" stroke-width="2.4" stroke-linecap="round"/>`,
    star: star('gold'), sparkle: `<path d="M12 1.5 Q13 10 22.5 12 Q13 14 12 22.5 Q11 14 1.5 12 Q11 10 12 1.5Z" ${f('gold')}/><path d="M19 2.5 Q19.4 5 22 5.5 Q19.4 6 19 8.5 Q18.6 6 16 5.5 Q18.6 5 19 2.5Z" fill="#fff" opacity=".9"/>`,
    ban: `<circle cx="12" cy="12" r="9.5" fill="none" stroke="#d61f45" stroke-width="3"/>${w('M5.5 18.5 L18.5 5.5', '#d61f45', 3)}`, party: `<path d="M3 21 L8 7 L17 16Z" ${f('orange')}/><path d="M12 3 V6 M20 8 L17.5 9.5 M17 2.5 L16 5 M21 14 H18.5" fill="none" stroke="#ffb703" stroke-width="2" stroke-linecap="round"/><circle cx="19" cy="4" r="1.4" fill="#ff4d6a"/><circle cx="13" cy="9" r="1.2" fill="#2fe6ff"/>`,
    gift: `<rect x="3" y="9" width="18" height="12" rx="2" ${f('red')}/><rect x="2" y="6" width="20" height="5" rx="1.5" ${f('pink')}/><path d="M12 6 V21" stroke="#ffd166" stroke-width="3"/><path d="M12 6 Q7 0 6 4 Q6 6 12 6 Q18 6 18 4 Q17 0 12 6Z" ${f('gold')}/>`,
    trophy: `<path d="M7 3 H17 V10 A5 5 0 0 1 7 10Z" ${f('gold')}/><path d="M7 5 H3.5 Q3.5 10 7.5 11 M17 5 H20.5 Q20.5 10 16.5 11" fill="none" stroke="#ffb703" stroke-width="1.8"/><rect x="10.5" y="14.5" width="3" height="4" ${f('gold')}/><rect x="7" y="18.5" width="10" height="3.5" rx="1" ${f('brown')}/>`,
    phone: `<rect x="6.5" y="1.5" width="11" height="21" rx="3" ${f('dark')}/><rect x="8" y="4.5" width="8" height="12.5" rx="1" fill="#2fe6ff" opacity=".85"/><circle cx="12" cy="19.7" r="1.1" fill="#c9d6ee"/>`,
    gear: `<path d="M10.2 1.8 H13.8 L14.4 4.6 L16.6 5.6 L19 4 L21.5 6.5 L19.9 8.9 L20.9 11.1 L23.5 11.7 V15.3 L20.9 15.9 L19.9 18.1 L21.5 20.5 L19 23 L16.6 21.4 L14.4 22.4 L13.8 25 H10.2 L9.6 22.4 L7.4 21.4 L5 23 L2.5 20.5 L4.1 18.1 L3.1 15.9 L.5 15.3 V11.7 L3.1 11.1 L4.1 8.9 L2.5 6.5 L5 4 L7.4 5.6 L9.6 4.6Z" transform="translate(0 -1.2) scale(.98 .98) translate(.25 .2)" ${f('steel')}/><circle cx="12" cy="12" r="3.6" fill="#0a0d1c"/>`,
    burst: `<path d="M12 1 L14.3 7.5 L20.5 4 L17.5 10.3 L23.5 12 L17.5 13.7 L20.5 20 L14.3 16.5 L12 23 L9.7 16.5 L3.5 20 L6.5 13.7 L.5 12 L6.5 10.3 L3.5 4 L9.7 7.5Z" ${f('orange')}/><circle cx="12" cy="12" r="4.2" fill="#ffe45c"/>`,
    bag: `<path d="M8.5 8 V6.5 A3.5 3.5 0 0 1 15.5 6.5 V8" fill="none" stroke="#e8641a" stroke-width="2.2"/><path d="M4.5 8 H19.5 L21 21.5 H3Z" ${f('pink')}/><path d="M9 12 Q12 15 15 12" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`,
    flame: `<path d="M12 1.5 Q14 6 17.5 9 Q21 12.5 19 17 Q17 22.5 12 22.5 Q7 22.5 5 17.5 Q3.5 13.5 7 9.5 Q8 12 10 12 Q9 6 12 1.5Z" ${f('orange')}/><path d="M12 22 Q8.5 21 9 17.5 Q10 14.5 12 13 Q15 16 15 18.5 Q15 21.5 12 22Z" fill="#ffe45c"/>`,
    sq: `<rect x="3.5" y="3.5" width="17" height="17" rx="3.5" ${f('white')}/>`, heart: `<path d="M12 21.5 L3.5 12.5 Q.5 8 4 4.5 Q8 1.5 12 6.5 Q16 1.5 20 4.5 Q23.5 8 20.5 12.5Z" ${f('red')}/><path d="M6 6.5 Q8 5 10 7" fill="none" stroke="#fff" stroke-width="1.6" opacity=".7" stroke-linecap="round"/>`,
    blackheart: `<path d="M12 21.5 L3.5 12.5 Q.5 8 4 4.5 Q8 1.5 12 6.5 Q16 1.5 20 4.5 Q23.5 8 20.5 12.5Z" ${f('dark')}/>`,
    dragon: `<path d="M3 15 Q2 6 9 4 L11 1.5 L12.5 5 Q17 4 20 8 L23 8.5 L20.5 11 Q21 17 14 20.5 Q7 22.5 3 15Z" ${f('green')}/><circle cx="14.5" cy="9.5" r="1.7" fill="#ffe45c"/><path d="M5 12 Q6 9 8 8" fill="none" stroke="#fff" opacity=".5" stroke-width="1.4"/>`,
    joker: `<rect x="4.5" y="2" width="15" height="20" rx="2.5" fill="#fff" stroke="#0a0d1c" stroke-width="1.1"/><path d="M8 18 L8.5 8 L12 12 L15.5 8 L16 18Z" ${f('red')}/><circle cx="8.5" cy="7" r="1.5" fill="#ffb703"/><circle cx="12" cy="6" r="1.5" fill="#ffb703"/><circle cx="15.5" cy="7" r="1.5" fill="#ffb703"/>`,
    shield: `<path d="M12 1.5 L21 5 V12 Q21 19 12 22.5 Q3 19 3 12 V5Z" ${f('blue')}/><path d="M12 1.5 V22.5 Q3 19 3 12 V5Z" fill="#fff" opacity=".22"/>${w('M8 11.5 L11 14.5 L16.5 8.5', '#fff', 2)}`,
    monitor: `<rect x="2" y="3.5" width="20" height="13" rx="2" ${f('dark')}/><rect x="4" y="5.5" width="16" height="9" rx="1" fill="#2fe6ff" opacity=".8"/><path d="M8.5 20.5 H15.5 M12 16.5 V20.5" stroke="#a9b6d6" stroke-width="2.4" stroke-linecap="round"/>`,
    burger: `<path d="M3 11 Q3 3.5 12 3.5 Q21 3.5 21 11Z" ${f('orange')}/><path d="M2.5 12.5 Q6 10.5 8.5 12.5 Q11 10.5 14 12.5 Q17 10.5 21.5 12.5 L21 14 H3Z" ${f('green')}/><rect x="3" y="14" width="18" height="3.2" rx="1.6" ${f('brown')}/><path d="M3 18 H21 Q21 21.5 12 21.5 Q3 21.5 3 18Z" ${f('orange')}/>`,
    target: `<circle cx="12" cy="12" r="10" ${f('white')}/><circle cx="12" cy="12" r="7" fill="#d61f45"/><circle cx="12" cy="12" r="4" fill="#fff"/><circle cx="12" cy="12" r="1.8" fill="#d61f45"/>`,
    pause: `<rect x="4.5" y="3" width="5.5" height="18" rx="1.6" ${f('cyan')}/><rect x="14" y="3" width="5.5" height="18" rx="1.6" ${f('cyan')}/>`, close: w('M5 5 L19 19 M19 5 L5 19', '#e4ebf8', 3), plus: w('M12 4 V20 M4 12 H20', '#7dffb0', 3.4), tick: w('M4.5 12.5 L10 18 L19.5 6', '#7dffb0', 3),
    chart: `<rect x="2.5" y="12" width="5" height="9.5" rx="1" ${f('cyan')}/><rect x="9.5" y="6" width="5" height="15.5" rx="1" ${f('purple')}/><rect x="16.5" y="2.5" width="5" height="19" rx="1" ${f('pink')}/>`,
    trend: `<path d="M2.5 19 L9 12 L13 15.5 L21 5" fill="none" stroke="#7dffb0" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 4.5 H21.5 V11" fill="none" stroke="#7dffb0" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`,
    medal1: medal('gold', 1), medal2: medal('steel', 2), medal3: medal('brown', 3), medal: `<path d="M7 2 L11 11 L13 11 L17 2Z" ${f('red')}/><circle cx="12" cy="15.5" r="6.5" ${f('gold')}/>${star('white').replace('<path', '<path transform="translate(6.5 10) scale(.46)"')}`,
    mouse: `<rect x="5.5" y="1.5" width="13" height="21" rx="6.5" ${f('steel')}/><path d="M12 1.8 V10 M5.6 10 H18.4" stroke="#0a0d1c" stroke-width="1.2"/><rect x="5.6" y="2" width="6.2" height="8" rx="3" fill="#2fe6ff" opacity=".7"/>`,
    clip: `<rect x="4.5" y="3.5" width="15" height="19" rx="2.5" ${f('white')}/><rect x="8.5" y="1.5" width="7" height="4" rx="1.5" ${f('steel')}/><path d="M8 10.5 H16 M8 14 H16 M8 17.5 H13" stroke="#6f7d9c" stroke-width="1.6" stroke-linecap="round"/>`,
    glass: `<path d="M5.5 2 H18.5 M5.5 22 H18.5" stroke="#a9b6d6" stroke-width="2.4" stroke-linecap="round"/><path d="M7 2.5 H17 Q17 9 12 12 Q7 9 7 2.5Z M7 21.5 H17 Q17 15 12 12 Q7 15 7 21.5Z" ${f('gold')}/>`,
    clock: `<circle cx="12" cy="12" r="10" ${f('white')}/>${w('M12 6 V12 L16 14.5', '#0a0d1c', 2)}`, timer: `<circle cx="12" cy="13.5" r="8.5" ${f('white')}/><rect x="9.5" y="1.5" width="5" height="3" rx="1" ${f('steel')}/>${w('M12 8 V13.5 L15.5 15.5', '#0a0d1c', 2)}`,
    cloud: `<path d="M6.5 19.5 Q1.5 19.5 2 14.5 Q2.5 11 6 10.5 Q7 5.5 12.5 5.5 Q17.5 5.5 18.5 10 Q23 10.5 22.5 15 Q22.2 19.5 17.5 19.5Z" ${f('cyan')}/>`,
    books: `<rect x="3" y="4" width="5" height="17" rx="1" ${f('blue')}/><rect x="9" y="2.5" width="5.5" height="18.5" rx="1" ${f('red')}/><path d="M15.5 6 L20.5 4.8 L23 20.2 L18 21.5Z" ${f('green')}/>`,
    crown: `<path d="M2.5 8 L7.5 12.5 L12 4 L16.5 12.5 L21.5 8 L19.5 19.5 H4.5Z" ${f('gold')}/><circle cx="2.5" cy="7.5" r="1.8" fill="#ffd166"/><circle cx="12" cy="3.8" r="1.8" fill="#ffd166"/><circle cx="21.5" cy="7.5" r="1.8" fill="#ffd166"/><rect x="4.5" y="19.5" width="15" height="2.2" rx="1" ${f('brown')}/>`,
    globe: `<circle cx="12" cy="12" r="10" ${f('blue')}/><path d="M5 8 Q9 6 11 9 Q9 13 6 12 Z M14 14 Q18 13 19.5 16 Q17 20 14 18Z M13 4 Q17 4 19 7 Q15 8 13 6Z" fill="#7dffb0" opacity=".9"/>`,
    dot: `<circle cx="12" cy="12" r="9" ${f('blue')}/><path d="M6 9 Q12 4.5 18 9 Q12 7.5 6 9Z" fill="#fff" opacity=".4"/>`,
    kbd: `<rect x="1.5" y="5.5" width="21" height="13" rx="2.5" ${f('steel')}/><path d="M5 9.5 H7 M9.5 9.5 H11.5 M14 9.5 H16 M18.5 9.5 H19.5 M5 12.5 H7 M9.5 12.5 H11.5 M14 12.5 H16 M18.5 12.5 H19.5 M7.5 15.5 H16.5" stroke="#0a0d1c" stroke-width="1.8" stroke-linecap="round"/>`,
    rocket: `<path d="M12 1.5 Q18 5 17.5 13 L15 16 H9 L6.5 13 Q6 5 12 1.5Z" ${f('white')}/><circle cx="12" cy="9" r="2.4" fill="#2fe6ff" stroke="#0a0d1c" stroke-width="1"/><path d="M6.8 12 L2.5 18 L8 16.5Z M17.2 12 L21.5 18 L16 16.5Z" ${f('red')}/><path d="M9.5 17 Q12 24 14.5 17Z" ${f('orange')}/>`,
    plane: `<path d="M12 1.5 L14 9 L22.5 14 V16.5 L14 14 L13.5 19 L16 21 V22.5 L12 21.5 L8 22.5 V21 L10.5 19 L10 14 L1.5 16.5 V14 L10 9Z" ${f('steel')}/>`,
    pencil: `<path d="M3 21 L4.5 15 L16 3.5 L20.5 8 L9 19.5Z" ${f('gold')}/><path d="M16 3.5 L20.5 8 L22 6.5 Q23 4.5 21 2.5 Q19 1 17.5 2Z" ${f('pink')}/><path d="M3 21 L4.5 15 L9 19.5Z" fill="#e0b48a" stroke="#0a0d1c" stroke-width="1"/>`,
    door: `<path d="M5.5 2 H17 V22 H5.5Z" ${f('brown')}/><circle cx="14" cy="12.5" r="1.2" fill="#ffd166"/><path d="M17 4 L21 6.5 V19.5 L17 22" fill="none" stroke="#a9b6d6" stroke-width="1.4"/>`,
    link: `<path d="M10 14 Q6.5 14 6.5 10.5 T10 7 H12.5 M14 10 Q17.5 10 17.5 13.5 T14 17 H11.5 M9 12 H15" fill="none" stroke="#2fe6ff" stroke-width="2.6" stroke-linecap="round" transform="rotate(-35 12 12)"/>`,
    trash: `<path d="M4.5 6.5 H19.5 L18 22 H6Z" ${f('steel')}/><rect x="3" y="4" width="18" height="2.6" rx="1.2" ${f('dark')}/><rect x="9.5" y="1.8" width="5" height="2.6" rx="1" ${f('dark')}/><path d="M9.5 9.5 V18.5 M14.5 9.5 V18.5" stroke="#0a0d1c" stroke-width="1.5" stroke-linecap="round" opacity=".6"/>`,
    mail: `<rect x="2" y="4.5" width="20" height="15" rx="2.5" ${f('white')}/><path d="M2.8 6 L12 13 L21.2 6" fill="none" stroke="#6f7d9c" stroke-width="1.6" stroke-linejoin="round"/>`,
    user: `<circle cx="12" cy="7.5" r="4.6" ${f('cyan')}/><path d="M3.5 22 Q3.5 13 12 13 Q20.5 13 20.5 22Z" ${f('cyan')}/>`,
    save: `<path d="M3 3 H17.5 L21 6.5 V21 H3Z" ${f('blue')}/><rect x="6.5" y="3" width="9" height="6" ${f('white')}/><rect x="6.5" y="13.5" width="11" height="7.5" rx="1" fill="#0a0d1c"/>`,
    search: `<circle cx="10" cy="10" r="6.8" fill="#cfe9ff" fill-opacity=".35" stroke="#e4ebf8" stroke-width="2.6"/><path d="M15 15 L21.5 21.5" stroke="#ffb703" stroke-width="3.4" stroke-linecap="round"/>`,
    ten: `<rect x="2" y="2" width="20" height="20" rx="5" ${f('purple')}/><text x="12" y="16.6" font-size="11.5" font-weight="900" text-anchor="middle" fill="#fff" font-family="sans-serif">10</text>`,
    palette: `<path d="M12 2 Q22 3 22 12 Q22 16 18 16 H16 Q14 16 15 18.5 Q16 21.5 12 22 Q2 21 2 12 Q2 3 12 2Z" ${f('brown')}/><circle cx="7.5" cy="11" r="1.8" fill="#ff4d6a"/><circle cx="11" cy="7" r="1.8" fill="#ffd166"/><circle cx="16" cy="8" r="1.8" fill="#2fe6ff"/>`,
    rainbow: `<path d="M2 20 A10 10 0 0 1 22 20" fill="none" stroke="#ff4d6a" stroke-width="2.6"/><path d="M5 20 A7 7 0 0 1 19 20" fill="none" stroke="#ffd166" stroke-width="2.6"/><path d="M8 20 A4 4 0 0 1 16 20" fill="none" stroke="#2fe6ff" stroke-width="2.6"/>`,
    gem: `<path d="M6 3 H18 L23 9 L12 22 L1 9Z" ${f('cyan')}/><path d="M1 9 H23 M9 3 L7 9 L12 22 L17 9 L15 3" fill="none" stroke="#0a0d1c" stroke-width="1" opacity=".6"/>`,
    swords: `<path d="M4 3 L14 13 M20 3 L10 13" stroke="#e4ebf8" stroke-width="3" stroke-linecap="round"/><path d="M2.5 15 L9 21.5 M21.5 15 L15 21.5" stroke="#ffb703" stroke-width="3" stroke-linecap="round"/>`,
    ship: `<path d="M2 14 H22 L19 20.5 H5Z" ${f('red')}/><rect x="6" y="8" width="12" height="6" ${f('white')}/><rect x="9" y="3.5" width="6" height="4.5" ${f('steel')}/><path d="M1 22 Q4 20.5 7 22 T13 22 T19 22 T23 22" fill="none" stroke="#2fe6ff" stroke-width="1.6"/>`,
    bulb: `<path d="M12 1.8 Q19 2 19 9 Q19 12.5 16 14.5 V17.5 H8 V14.5 Q5 12.5 5 9 Q5 2 12 1.8Z" ${f('gold')}/><rect x="8.5" y="18" width="7" height="3.8" rx="1.3" ${f('steel')}/>`,
    arrR: arrow(0), arrL: arrow(180), arrU: arrow(270), arrD: arrow(90), undo: `<path d="M8 6 L3 11 L8 16 V12.5 Q15 11.5 19 18 Q19.5 8 8 8.5Z" ${f('cyan')}/>`,
    playR: tri(0), playL: tri(180),
    fIL: flag(stripes(['#fff', '#fff', '#fff']), `<rect x="1.5" y="6.6" width="21" height="2.2" fill="#2766d6"/><rect x="1.5" y="15.2" width="21" height="2.2" fill="#2766d6"/><path d="M12 8.8 L14.9 13.8 H9.1Z M12 15.2 L9.1 10.2 H14.9Z" fill="none" stroke="#2766d6" stroke-width=".9"/>`),
    fSA: flag('<rect x="1.5" y="4.5" width="21" height="15" fill="#12a15f"/>', '<path d="M7 11 H17 M8 14.4 H16" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>'),
    fRU: flag(stripes(['#fff', '#2766d6', '#d61f45'])), fFR: flag(stripes(['#2766d6', '#fff', '#d61f45'], 'v')), fES: flag('<rect x="1.5" y="4.5" width="21" height="15" fill="#d61f45"/>', '<rect x="1.5" y="8.5" width="21" height="7" fill="#ffd166"/>'),
    fUS: flag(Array.from({ length: 5 }, (_, i) => `<rect x="1.5" y="${4.5 + i * 3}" width="21" height="1.5" fill="#d61f45"/>`).join('') + '<rect x="1.5" y="4.5" width="21" height="15" fill="#fff" opacity=".0"/>', '<rect x="1.5" y="4.5" width="9" height="8" fill="#2766d6"/>'),
    fGB: flag('<rect x="1.5" y="4.5" width="21" height="15" fill="#2766d6"/>', '<path d="M1.5 4.5 L22.5 19.5 M22.5 4.5 L1.5 19.5" stroke="#fff" stroke-width="3"/><path d="M12 4.5 V19.5 M1.5 12 H22.5" stroke="#fff" stroke-width="5"/><path d="M12 4.5 V19.5 M1.5 12 H22.5" stroke="#d61f45" stroke-width="2.6"/>'),
};

const MAP = {
    '✅': 'check', '✓': 'tick', '❌': 'cross', '✕': 'close', '✚': 'plus', '⚠': 'warn', '⚡': 'bolt', '💰': 'coin', '💸': 'coin', '🤑': 'coin', '🎮': 'pad', '🔒': 'lock', '🔓': 'unlock', '🔐': 'key', '⭐': 'star', '🌟': 'star', '💫': 'sparkle', '✨': 'sparkle',
    '🚫': 'ban', '🎉': 'party', '🎁': 'gift', '🏆': 'trophy', '📱': 'phone', '⚙': 'gear', '💥': 'burst', '🛍': 'bag', '🔥': 'flame', '⬜': 'sq', '❤': 'heart', '🖤': 'blackheart', '🐉': 'dragon', '🃏': 'joker', '🛡': 'shield', '🖥': 'monitor', '💻': 'monitor',
    '🍔': 'burger', '🎯': 'target', '⏸': 'pause', '📊': 'chart', '📈': 'trend', '🏅': 'medal', '🥇': 'medal1', '🥈': 'medal2', '🥉': 'medal3', '🖱': 'mouse', '📋': 'clip', '📜': 'clip', '⏳': 'glass', '⏱': 'timer', '🕒': 'clock', '☁': 'cloud', '📚': 'books', '👑': 'crown',
    '🌐': 'globe', '🌌': 'globe', '🔵': 'dot', '⌨': 'kbd', '🚀': 'rocket', '✈': 'plane', '✏': 'pencil', '🚪': 'door', '🔗': 'link', '🗑': 'trash', '💌': 'mail', '📧': 'mail', '👤': 'user', '💾': 'save', '🔍': 'search', '🔟': 'ten', '🎨': 'palette', '🌈': 'rainbow', '💎': 'gem',
    '⚔': 'swords', '🗡': 'swords', '🚢': 'ship', '💡': 'bulb', '→': 'arrR', '➡': 'arrR', '←': 'arrL', '⬅': 'arrL', '⬆': 'arrU', '⬇': 'arrD', '↩': 'undo', '▶': 'playR', '►': 'playR', '◀': 'playL', '◄': 'playL',
    '🇮🇱': 'fIL', '🇸🇦': 'fSA', '🇷🇺': 'fRU', '🇫🇷': 'fFR', '🇪🇸': 'fES', '🇺🇸': 'fUS', '🇬🇧': 'fGB',
};
const RE = /(\p{RI}\p{RI})|(\p{Extended_Pictographic}️?(?:‍\p{Extended_Pictographic}️?)*)|([←-⇿✓✕✚◄►])/gu;
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'OPTION', 'SELECT', 'TITLE', 'INPUT', 'NOSCRIPT', 'CODE']);

export const icon = (name) => `<span class="ic ic-${name}"><svg viewBox="0 0 24 24" aria-hidden="true">${G[name]}</svg></span>`;
const keyOf = (s) => s.replace(/️/g, '');

function swap(node) {
    const text = node.nodeValue;
    if (!text || !RE.test(text)) { RE.lastIndex = 0; return; }
    RE.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0, hit = false, m;
    while ((m = RE.exec(text))) {
        const name = MAP[keyOf(m[0])] || MAP[keyOf(m[0]).replace(/‍.*/, '')];
        if (!name) continue;
        hit = true;
        if (m.index > last) frag.append(text.slice(last, m.index));
        const s = document.createElement('span');
        s.className = 'ic ic-' + name;
        s.setAttribute('role', 'img');
        s.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${G[name]}</svg>`;
        frag.append(s);
        last = m.index + m[0].length;
    }
    if (!hit) return;
    if (last < text.length) frag.append(text.slice(last));
    node.replaceWith(frag);
}

function scan(root) {
    if (root.nodeType === 3) { if (!SKIP.has(root.parentNode?.nodeName)) swap(root); return; }
    if (root.nodeType !== 1 || SKIP.has(root.nodeName) || root.classList?.contains('ic')) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (SKIP.has(n.parentNode.nodeName) || n.parentNode.closest?.('.ic, svg') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    const nodes = []; let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(swap);
}

let queued = new Set(), raf = 0;
function flush() { raf = 0; const q = queued; queued = new Set(); q.forEach((n) => n.isConnected && scan(n)); }
export function initIcons() {
    if (document.getElementById('ic-defs')) return;
    const d = document.createElement('div'); d.id = 'ic-defs'; d.innerHTML = D; document.body.prepend(d);
    scan(document.body);
    new MutationObserver((muts) => {
        for (const m of muts) {
            if (m.type === 'characterData') queued.add(m.target);
            else m.addedNodes.forEach((n) => queued.add(n));
        }
        if (!raf) raf = requestAnimationFrame(flush);
    }).observe(document.body, { childList: true, characterData: true, subtree: true });
}
