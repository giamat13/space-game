// ===== SOUND EFFECTS =====
// A hybrid sound engine (Web Audio API):
//   • Recorded sounds — CC0 samples by Kenney (kenney.nl) in assets/sfx/*.ogg, listed in BANK.
//     Each event picks one of its variants at random, at a slightly random pitch, and
//     several can be layered (BANK[name].also) or mixed with a synth layer (BANK[name].fx).
//   • Self-made sounds — synthesized live in S. They play the events that have no
//     recording (fire shots, burgers, boss alarm…) and stand in for any recording
//     that is not loaded yet or that the browser cannot decode.
//   play('<name>', x?)  — x is the screen X (px) of the source; it places the sound left/right.
//   window.__sfx is the same function, for inline onclick handlers.
// Signal chain: voice → its own stereo bus → master → compressor → speakers,
// with a send from every bus into a shared synthetic reverb (space-hall feel).
// Settings live in localStorage 'sfxSettings_v1' = { on, vol } (vol 0..1).

const KEY = 'sfxSettings_v1';
let settings = { on: true, vol: 0.6 };
try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && typeof raw === 'object') settings = { on: raw.on !== false, vol: clamp01(raw.vol ?? 0.6) };
} catch (_) {}

function clamp01(v) { v = Number(v); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.6; }
function save() { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (_) {} }

let ctx = null, master = null, revIn = null, noiseBuf = null, curve = null;

// Stereo impulse response: decaying noise, slightly different per ear.
function makeImpulse(sec, decay) {
    const len = Math.floor(ctx.sampleRate * sec), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
}

function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
        ctx = new AC();
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16; comp.knee.value = 14; comp.ratio.value = 5;
        comp.attack.value = 0.003; comp.release.value = 0.18;
        master = ctx.createGain();
        master.gain.value = settings.on ? settings.vol : 0;
        master.connect(comp); comp.connect(ctx.destination);

        const conv = ctx.createConvolver();
        conv.buffer = makeImpulse(2.4, 3.2);
        const revTone = ctx.createBiquadFilter(); revTone.type = 'lowpass'; revTone.frequency.value = 5200;
        const revOut = ctx.createGain(); revOut.gain.value = 0.5;
        revIn = ctx.createGain();
        revIn.connect(conv); conv.connect(revTone); revTone.connect(revOut); revOut.connect(master);

        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

        curve = new Float32Array(1024);
        for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; curve[i] = Math.tanh(3 * x); }
        loadSamples();
    } catch (_) { ctx = null; }
    return ctx;
}

// Browsers only allow audio after a user gesture: unlock on the first one.
function unlock() {
    const c = ensureCtx();
    if (c && c.state === 'suspended' && !document.hidden) c.resume().catch(() => {});
}
['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, unlock, { capture: true, passive: true }));
document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {});
});

// ---- building blocks ----
const M = (n) => 440 * Math.pow(2, (n - 69) / 12);          // MIDI note → Hz
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// One bus per sound: stereo position + how much of it goes into the reverb.
function bus(pan, wet) {
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
    if (p.pan) p.pan.value = pan;
    p.connect(master);
    if (wet > 0) { const s = ctx.createGain(); s.gain.value = wet; p.connect(s); s.connect(revIn); }
    return p;
}
// Attack → optional hold → exponential release.
function env(g, t, vol, a, dur, hold = 0) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    if (hold) g.gain.setValueAtTime(vol, t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + hold + 0.01, dur));
}
// Warm saturation (tanh), driven a little harder than unity.
function drive(node) {
    const pre = ctx.createGain(); pre.gain.value = 2.2;
    const w = ctx.createWaveShaper(); w.curve = curve; w.oversample = '2x';
    node.connect(pre); pre.connect(w);
    return w;
}
function filt(node, t, dur, type, f, f2, q) {
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t);
    if (f2 != null) fl.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    node.connect(fl);
    return fl;
}
// Oscillator voice: pitch glide, vibrato, saturation, filter sweep.
function osc(o, { type = 'sine', f, f2 = null, glide = 'exp', dur = 0.2, vol = 0.2, a = 0.004, hold = 0, delay = 0,
                  detune = 0, lp = 0, lp2 = null, q = 0.7, vib = 0, vibRate = 6, shape = false }) {
    const t = ctx.currentTime + delay;
    const s = ctx.createOscillator(); s.type = type; s.detune.value = detune;
    s.frequency.setValueAtTime(f, t);
    if (f2 != null) {
        if (glide === 'exp') s.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
        else s.frequency.linearRampToValueAtTime(f2, t + dur);
    }
    if (vib) {
        const l = ctx.createOscillator(), lg = ctx.createGain();
        l.frequency.value = vibRate; lg.gain.value = vib;
        l.connect(lg); lg.connect(s.frequency); l.start(t); l.stop(t + dur + 0.05);
    }
    let node = s;
    if (shape) node = drive(node);
    if (lp) node = filt(node, t, dur, 'lowpass', lp, lp2, q);
    const g = ctx.createGain(); env(g, t, vol, a, dur, hold);
    node.connect(g); g.connect(o);
    s.start(t); s.stop(t + dur + 0.05);
}
// Three detuned saws: a wide, bright "supersaw" for fanfares and chords.
function saws(o, p) {
    for (const d of [-11, 0, 11]) osc(o, { ...p, type: 'sawtooth', detune: d, vol: p.vol / 2, lp: p.lp || 3000 });
}
// FM bell: a sine modulated by another sine whose depth decays — chimes, coins, crystal.
function bell(o, { f, dur = 0.6, vol = 0.12, ratio = 3.5, index = 2.5, delay = 0, a = 0.002 }) {
    const t = ctx.currentTime + delay;
    const c = ctx.createOscillator(); c.frequency.value = f;
    const m = ctx.createOscillator(); m.frequency.value = f * ratio;
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(f * index, t);
    mg.gain.exponentialRampToValueAtTime(Math.max(1, f * 0.03), t + dur);
    m.connect(mg); mg.connect(c.frequency);
    const g = ctx.createGain(); env(g, t, vol, a, dur);
    c.connect(g); g.connect(o);
    c.start(t); m.start(t); c.stop(t + dur + 0.05); m.stop(t + dur + 0.05);
}
// Filtered noise: explosions, impacts, whooshes, fire.
function nz(o, { dur = 0.2, vol = 0.2, type = 'lowpass', f = 2000, f2 = null, q = 0.7, a = 0.003, hold = 0, delay = 0, shape = false }) {
    const t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    let node = s;
    if (shape) node = drive(node);
    node = filt(node, t, dur, type, f, f2, q);
    const g = ctx.createGain(); env(g, t, vol, a, dur, hold);
    node.connect(g); g.connect(o);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
}
// Layered explosion: sub thump + saturated body + crackle tail.
function boom(o, { delay = 0, size = 1, v = 1 } = {}) {
    const k = Math.min(1.3, size);
    osc(o, { type: 'sine', f: 140 * v, f2: 32, dur: 0.3 * size + 0.12, vol: 0.42 * k, a: 0.002, delay });
    nz(o, { type: 'lowpass', f: 3800 * v, f2: 110, q: 0.9, dur: 0.38 * size + 0.12, vol: 0.34 * k, shape: true, delay });
    nz(o, { type: 'highpass', f: 2600, dur: 0.1 * size + 0.04, vol: 0.1, delay: delay + 0.015 });
    for (let i = 0; i < Math.round(2 + size * 2); i++)
        nz(o, { type: 'bandpass', f: rnd(1500, 5000), q: 4, dur: 0.03, vol: 0.05, delay: delay + rnd(0.05, 0.25 * size + 0.1) });
}

// ---- the sound bank: (out, pitchVariation) => schedule voices ----
const S = {
    // Player shots, one flavour per kind of ship
    shoot: (o, v) => {
        osc(o, { type: 'square', f: 1450 * v, f2: 360 * v, dur: 0.1, vol: 0.055, lp: 7000, lp2: 1600, q: 2 });
        osc(o, { type: 'sine', f: 720 * v, f2: 240, dur: 0.08, vol: 0.05 });
    },
    shootHeavy: (o, v) => {
        osc(o, { type: 'sawtooth', f: 860 * v, f2: 150, dur: 0.15, vol: 0.07, lp: 4200, lp2: 500, q: 4 });
        osc(o, { type: 'sine', f: 190 * v, f2: 55, dur: 0.12, vol: 0.12, a: 0.002 });
        nz(o, { type: 'highpass', f: 4200, dur: 0.03, vol: 0.035 });
    },
    shootFire: (o, v) => {
        nz(o, { type: 'bandpass', f: 2300 * v, f2: 480, q: 1.4, dur: 0.18, vol: 0.15, shape: true });
        osc(o, { type: 'sawtooth', f: 270 * v, f2: 90, dur: 0.14, vol: 0.045, lp: 1500 });
        osc(o, { type: 'sine', f: 150, f2: 50, dur: 0.1, vol: 0.1 });
    },
    shootJoker: (o) => {
        const f = M(pick([72, 74, 76, 79, 81, 84]));
        osc(o, { type: 'triangle', f, f2: f * 1.5, glide: 'lin', dur: 0.12, vol: 0.085, vib: 30, vibRate: 18 });
        osc(o, { type: 'square', f: f * 2, dur: 0.05, vol: 0.02, lp: 3000 });
    },
    shootIvory: (o, v) => {
        bell(o, { f: 1760 * v, ratio: 2.76, index: 1.2, dur: 0.22, vol: 0.065 });
        osc(o, { type: 'triangle', f: 2640 * v, f2: 1800, dur: 0.06, vol: 0.035 });
    },
    noAmmo: (o) => {
        osc(o, { type: 'square', f: 180, dur: 0.035, vol: 0.045, lp: 1200 });
        osc(o, { type: 'square', f: 130, dur: 0.04, vol: 0.045, lp: 1000, delay: 0.06 });
    },
    enemyShoot: (o, v) => osc(o, { type: 'sawtooth', f: 540 * v, f2: 200, dur: 0.13, vol: 0.03, lp: 2400, lp2: 700, q: 5 }),

    // Impacts
    hit: (o, v) => {
        nz(o, { type: 'highpass', f: 3600, dur: 0.04, vol: 0.07 });
        osc(o, { type: 'square', f: 430 * v, f2: 180, dur: 0.05, vol: 0.035, lp: 3000 });
        osc(o, { type: 'triangle', f: 1250 * v, dur: 0.02, vol: 0.03 });
    },
    explode: (o, v) => boom(o, { v }),
    explodeBig: (o, v) => {
        boom(o, { v, size: 2 });
        boom(o, { v: v * 0.8, size: 1.2, delay: 0.18 });
        nz(o, { type: 'lowpass', f: 650, f2: 55, dur: 1.4, vol: 0.22, a: 0.05, delay: 0.1 });
    },
    asteroidHit: (o, v) => {
        nz(o, { type: 'bandpass', f: 950 * v, q: 3, dur: 0.09, vol: 0.13 });
        osc(o, { type: 'triangle', f: 230 * v, f2: 140, dur: 0.08, vol: 0.08 });
    },
    asteroidCrash: (o, v) => {
        boom(o, { v: v * 0.7, size: 1.3 });
        for (let i = 0; i < 6; i++) nz(o, { type: 'bandpass', f: rnd(400, 1300), q: 2, dur: 0.07, vol: 0.11, delay: 0.07 + i * rnd(0.035, 0.065) });
    },
    playerHit: (o, v) => {
        osc(o, { type: 'sawtooth', f: 250 * v, f2: 60, dur: 0.3, vol: 0.1, shape: true, lp: 2600, lp2: 300 });
        nz(o, { type: 'lowpass', f: 2600, f2: 200, dur: 0.25, vol: 0.22, shape: true });
        osc(o, { type: 'sine', f: 115, f2: 40, dur: 0.25, vol: 0.3 });
    },
    friendlyHit: (o, v) => {
        osc(o, { type: 'square', f: 640 * v, f2: 240, dur: 0.1, vol: 0.035, lp: 2500 });
        nz(o, { type: 'highpass', f: 3000, dur: 0.03, vol: 0.035 });
    },
    blocked: (o, v) => {
        bell(o, { f: 1320 * v, ratio: 1.41, index: 2, dur: 0.45, vol: 0.085 });
        osc(o, { type: 'sine', f: 2400 * v, f2: 1400, dur: 0.18, vol: 0.045 });
        nz(o, { type: 'highpass', f: 6000, dur: 0.06, vol: 0.045 });
    },
    toothHit: (o, v) => {
        bell(o, { f: 2093 * v, ratio: 2.4, index: 3, dur: 0.3, vol: 0.085 });
        nz(o, { type: 'highpass', f: 5000, dur: 0.05, vol: 0.09 });
        osc(o, { type: 'triangle', f: 900, f2: 500, dur: 0.06, vol: 0.05 });
    },
    toothBreak: (o) => {
        nz(o, { type: 'highpass', f: 4200, f2: 1500, dur: 0.5, vol: 0.22 });
        for (let i = 0; i < 10; i++) bell(o, { f: rnd(1800, 4400), ratio: rnd(1.5, 3), index: 1.5, dur: rnd(0.15, 0.45), vol: 0.045, delay: i * rnd(0.015, 0.04) });
        osc(o, { type: 'sine', f: 170, f2: 50, dur: 0.2, vol: 0.2 });
    },
    gameOver: (o) => {
        boom(o, { size: 2.2 });
        [69, 65, 62, 57].forEach((n, i) => saws(o, { f: M(n), dur: 0.6, vol: 0.065, lp: 1900, lp2: 380, a: 0.02, delay: 0.5 + i * 0.34 }));
        osc(o, { type: 'sine', f: M(45), dur: 2.4, vol: 0.16, a: 0.3, delay: 0.5 });
    },

    // Pickups and rewards
    heal: (o, v) => {
        [76, 79, 84, 88].forEach((n, i) => bell(o, { f: M(n) * v, ratio: 2, index: 0.8, dur: 0.4, vol: 0.055, delay: i * 0.055 }));
        osc(o, { type: 'sine', f: M(72), f2: M(84), dur: 0.3, vol: 0.035, a: 0.02 });
    },
    pickup: (o, v) => {
        bell(o, { f: M(91) * v, ratio: 2, index: 1, dur: 0.18, vol: 0.055 });
        bell(o, { f: M(96) * v, ratio: 2, index: 1, dur: 0.25, vol: 0.045, delay: 0.05 });
    },
    burger: (o, v) => {
        for (let i = 0; i < 2; i++) {
            nz(o, { type: 'bandpass', f: 720 * v, q: 1.5, dur: 0.07, vol: 0.16, delay: i * 0.13 });
            osc(o, { type: 'triangle', f: 210 * v, f2: 110, dur: 0.08, vol: 0.11, delay: i * 0.13 });
        }
    },
    fat: (o) => {
        osc(o, { type: 'sawtooth', f: 260, f2: 80, glide: 'lin', dur: 0.6, vol: 0.075, lp: 900, vib: 12, vibRate: 7 });
        osc(o, { type: 'sine', f: 130, f2: 45, dur: 0.6, vol: 0.12 });
    },
    slim: (o) => {
        osc(o, { type: 'sine', f: 400, f2: 1500, glide: 'lin', dur: 0.35, vol: 0.075, vib: 25, vibRate: 9 });
        bell(o, { f: M(96), ratio: 2, index: 0.6, dur: 0.3, vol: 0.035, delay: 0.33 });
    },
    ammoFull: (o) => {
        osc(o, { type: 'sawtooth', f: 180, f2: 1400, dur: 0.32, vol: 0.055, lp: 600, lp2: 6000, q: 6 });
        nz(o, { type: 'bandpass', f: 800, f2: 8000, q: 2, dur: 0.3, vol: 0.06 });
        bell(o, { f: M(100), ratio: 2, index: 1, dur: 0.45, vol: 0.045, delay: 0.3 });
    },
    coin: (o) => {
        osc(o, { type: 'square', f: M(83), dur: 0.08, vol: 0.045, lp: 5000 });
        osc(o, { type: 'square', f: M(88), dur: 0.32, vol: 0.045, lp: 5000, delay: 0.075 });
        bell(o, { f: M(100), ratio: 2, index: 0.6, dur: 0.3, vol: 0.022, delay: 0.075 });
    },
    levelUp: (o) => {
        [72, 76, 79, 84].forEach((n, i) => saws(o, { f: M(n), dur: 0.16, vol: 0.05, lp: 3600, delay: i * 0.075 }));
        [84, 88, 91].forEach(n => saws(o, { f: M(n), dur: 0.75, vol: 0.034, a: 0.02, hold: 0.15, lp: 4200, lp2: 1100, delay: 0.3 }));
        bell(o, { f: M(96), ratio: 2, index: 1, dur: 0.7, vol: 0.04, delay: 0.3 });
        osc(o, { type: 'sine', f: M(48), dur: 0.9, vol: 0.1, a: 0.02, delay: 0.3 });
    },
    unlock: (o) => {
        [67, 72, 76, 79, 84].forEach((n, i) => saws(o, { f: M(n), dur: 0.2, vol: 0.045, lp: 3000, delay: i * 0.09 }));
        [72, 76, 79, 84].forEach(n => saws(o, { f: M(n), dur: 1.5, vol: 0.03, a: 0.15, hold: 0.3, lp: 2600, lp2: 900, delay: 0.45 }));
        for (let i = 0; i < 10; i++) bell(o, { f: M(pick([96, 100, 103, 108])), ratio: 2, index: 0.8, dur: 0.5, vol: 0.028, delay: 0.5 + i * 0.08 });
        osc(o, { type: 'sine', f: M(48), dur: 1.7, vol: 0.12, a: 0.2, delay: 0.45 });
    },
    achievement: (o) => {
        [79, 83, 86].forEach((n, i) => bell(o, { f: M(n), ratio: 2, index: 1.2, dur: 0.6, vol: 0.065, delay: i * 0.09 }));
        [79, 83, 86, 91].forEach(n => saws(o, { f: M(n), dur: 1, vol: 0.02, a: 0.1, lp: 2500, delay: 0.27 }));
    },
    record: (o) => {
        [[67, 0], [72, 0.12], [76, 0.24], [79, 0.36], [76, 0.56], [79, 0.68]].forEach(([n, d]) => saws(o, { f: M(n), dur: 0.18, vol: 0.05, lp: 3600, delay: d }));
        [84, 88, 91, 96].forEach(n => saws(o, { f: M(n), dur: 1.7, vol: 0.028, a: 0.05, hold: 0.4, lp: 4600, lp2: 1000, delay: 0.85 }));
        osc(o, { type: 'sine', f: M(48), dur: 1.9, vol: 0.14, a: 0.05, delay: 0.85 });
        for (let i = 0; i < 12; i++) bell(o, { f: M(pick([96, 100, 103, 108])), ratio: 2, index: 0.8, dur: 0.5, vol: 0.024, delay: 0.9 + i * 0.09 });
    },

    // Ship abilities
    phoenix: (o) => {
        nz(o, { type: 'bandpass', f: 400, f2: 6000, q: 1.2, dur: 0.9, vol: 0.17, a: 0.05 });
        [69, 73, 76, 81, 85].forEach((n, i) => saws(o, { f: M(n), dur: 0.36, vol: 0.034, lp: 1200, lp2: 5000, delay: i * 0.07 }));
        for (let i = 0; i < 7; i++) nz(o, { type: 'highpass', f: 3000, dur: 0.03, vol: 0.055, delay: rnd(0.1, 0.85) });
    },
    vortex: (o) => {
        osc(o, { type: 'sine', f: 120, f2: 1400, dur: 0.3, vol: 0.09 });
        saws(o, { f: 110, f2: 220, dur: 0.8, vol: 0.06, lp: 800, lp2: 4200, q: 5, a: 0.02, delay: 0.25, vib: 6, vibRate: 14 });
        nz(o, { type: 'bandpass', f: 2500, q: 3, dur: 0.7, vol: 0.075, a: 0.03, delay: 0.25 });
        osc(o, { type: 'sine', f: 95, f2: 45, dur: 0.4, vol: 0.28, delay: 0.25 });
    },
    joker: (o) => {
        const sc = [72, 74, 76, 79, 81, 84, 86, 88];
        for (let i = 0; i < 7; i++) bell(o, { f: M(pick(sc)), ratio: pick([1.5, 2, 3.5]), index: 2, dur: 0.25, vol: 0.048, delay: i * 0.07 });
        [0, 1, 2].forEach(i => osc(o, { type: 'triangle', f: M(76 - i * 3), f2: M(72 - i * 3), dur: 0.14, vol: 0.075, vib: 40, vibRate: 22, lp: 2500, delay: 0.55 + i * 0.16 }));
    },
    dragon: (o) => {
        nz(o, { type: 'lowpass', f: 300, f2: 1800, q: 3, dur: 0.5, vol: 0.28, a: 0.05, shape: true });
        nz(o, { type: 'lowpass', f: 1800, f2: 200, q: 2, dur: 0.9, vol: 0.24, shape: true, delay: 0.45 });
        osc(o, { type: 'sawtooth', f: 95, f2: 55, dur: 1.3, vol: 0.11, vib: 8, vibRate: 11, lp: 900, shape: true });
        osc(o, { type: 'sine', f: 70, f2: 35, dur: 1.0, vol: 0.28, a: 0.05 });
    },
    tooth: (o) => {
        [84, 88, 91, 96].forEach((n, i) => bell(o, { f: M(n), ratio: 2.4, index: 1.5, dur: 0.5, vol: 0.048, delay: i * 0.06 }));
        nz(o, { type: 'highpass', f: 6000, dur: 0.4, vol: 0.035, a: 0.05 });
        osc(o, { type: 'triangle', f: 600, f2: 1800, dur: 0.25, vol: 0.055 });
    },
    servants: (o) => {
        [69, 72, 76, 81].forEach((n, i) => osc(o, { type: 'triangle', f: M(n), dur: 0.18, vol: 0.065, lp: 3000, delay: i * 0.06 }));
        nz(o, { type: 'bandpass', f: 300, f2: 3000, q: 1.5, dur: 0.35, vol: 0.075 });
    },
    abilityReady: (o) => {
        bell(o, { f: M(88), ratio: 2, index: 1, dur: 0.35, vol: 0.055 });
        bell(o, { f: M(95), ratio: 2, index: 1, dur: 0.55, vol: 0.055, delay: 0.08 });
    },
    abilityWait: (o) => osc(o, { type: 'triangle', f: 180, dur: 0.08, vol: 0.065, lp: 800 }),

    // Bosses
    bossAlarm: (o) => {
        osc(o, { type: 'sine', f: 150, f2: 35, dur: 0.6, vol: 0.42, a: 0.002 });
        nz(o, { type: 'lowpass', f: 1500, f2: 80, dur: 0.6, vol: 0.22, shape: true });
        for (let i = 0; i < 3; i++) {
            const d = 0.3 + i * 0.5;
            osc(o, { type: 'square', f: 660, dur: 0.22, vol: 0.045, lp: 1800, delay: d });
            osc(o, { type: 'square', f: 494, dur: 0.24, vol: 0.045, lp: 1800, delay: d + 0.24 });
        }
        osc(o, { type: 'sawtooth', f: 55, dur: 2.0, vol: 0.075, a: 0.4, lp: 300, delay: 0.2 });
    },
    bossPhase: (o) => {
        boom(o, { size: 1.4 });
        osc(o, { type: 'sawtooth', f: 60, f2: 140, dur: 0.8, vol: 0.09, lp: 400, lp2: 2500, shape: true, a: 0.05 });
        nz(o, { type: 'bandpass', f: 200, f2: 3000, q: 1.2, dur: 0.8, vol: 0.14, a: 0.1 });
    },
    bossHit: (o, v) => {
        bell(o, { f: 320 * v, ratio: 1.73, index: 4, dur: 0.12, vol: 0.045 });
        nz(o, { type: 'bandpass', f: 2800, q: 2, dur: 0.04, vol: 0.045 });
    },
    bossDeath: (o) => {
        [0, 0.3, 0.55, 0.9, 1.2, 1.5, 1.85, 2.2, 2.6].forEach((d, i) => boom(o, { delay: d, size: 0.8 + i * 0.12, v: rnd(0.7, 1.2) }));
        osc(o, { type: 'sawtooth', f: 400, f2: 40, dur: 3.0, vol: 0.055, lp: 1500, lp2: 150 });
        nz(o, { type: 'lowpass', f: 800, f2: 60, dur: 3.2, vol: 0.18, a: 0.5 });
    },
    bossWin: (o) => {
        [[72, 0], [72, 0.14], [79, 0.28], [76, 0.5], [79, 0.64], [84, 0.78]].forEach(([n, d]) => saws(o, { f: M(n), dur: 0.2, vol: 0.05, lp: 3800, delay: d }));
        [84, 88, 91].forEach(n => saws(o, { f: M(n), dur: 1.8, vol: 0.03, a: 0.05, hold: 0.5, lp: 4600, lp2: 900, delay: 1.0 }));
        osc(o, { type: 'sine', f: M(48), dur: 2, vol: 0.14, a: 0.05, delay: 1.0 });
        for (let i = 0; i < 14; i++) bell(o, { f: M(pick([96, 100, 103, 108])), ratio: 2, index: 0.8, dur: 0.5, vol: 0.022, delay: 1.0 + i * 0.08 });
    },
    telegraph: (o) => {
        osc(o, { type: 'square', f: 1320, dur: 0.06, vol: 0.032, lp: 4000 });
        osc(o, { type: 'square', f: 1320, dur: 0.06, vol: 0.032, lp: 4000, delay: 0.1 });
    },
    bossAttack: (o) => {
        nz(o, { type: 'bandpass', f: 600, f2: 2500, q: 2, dur: 0.4, vol: 0.15, shape: true });
        saws(o, { f: 70, dur: 0.45, vol: 0.055, lp: 1200, vib: 10, vibRate: 30 });
        osc(o, { type: 'sine', f: 100, f2: 40, dur: 0.3, vol: 0.24 });
    },
    shake: (o) => {
        osc(o, { type: 'sine', f: 62, f2: 30, dur: 0.4, vol: 0.24, a: 0.01 });
        nz(o, { type: 'lowpass', f: 220, dur: 0.35, vol: 0.14 });
    },

    // Game flow and menus
    start: (o) => {
        nz(o, { type: 'bandpass', f: 200, f2: 3500, q: 1, dur: 0.7, vol: 0.11, a: 0.1 });
        saws(o, { f: M(45), f2: M(57), dur: 0.6, vol: 0.05, lp: 400, lp2: 3000, a: 0.05 });
        [72, 79, 84].forEach((n, i) => bell(o, { f: M(n), ratio: 2, index: 1, dur: 0.5, vol: 0.048, delay: 0.5 + i * 0.08 }));
    },
    pause: (o) => {
        osc(o, { type: 'triangle', f: M(79), dur: 0.12, vol: 0.075, lp: 2500 });
        osc(o, { type: 'triangle', f: M(72), dur: 0.22, vol: 0.075, lp: 2500, delay: 0.09 });
    },
    resume: (o) => {
        osc(o, { type: 'triangle', f: M(72), dur: 0.12, vol: 0.075, lp: 2500 });
        osc(o, { type: 'triangle', f: M(79), dur: 0.22, vol: 0.075, lp: 2500, delay: 0.09 });
    },
    click: (o) => {
        osc(o, { type: 'sine', f: 2000, f2: 1200, dur: 0.03, vol: 0.055 });
        osc(o, { type: 'triangle', f: 800, dur: 0.02, vol: 0.028 });
    },
    toggle: (o) => {
        osc(o, { type: 'sine', f: 1200, dur: 0.03, vol: 0.045 });
        osc(o, { type: 'sine', f: 1800, dur: 0.04, vol: 0.045, delay: 0.04 });
    },
    open: (o) => {
        osc(o, { type: 'sine', f: 500, f2: 1100, dur: 0.12, vol: 0.055 });
        nz(o, { type: 'bandpass', f: 800, f2: 3000, q: 1, dur: 0.12, vol: 0.028 });
    },
    close: (o) => {
        osc(o, { type: 'sine', f: 1100, f2: 500, dur: 0.12, vol: 0.055 });
        nz(o, { type: 'bandpass', f: 3000, f2: 800, q: 1, dur: 0.12, vol: 0.028 });
    },
    type: (o) => osc(o, { type: 'triangle', f: rnd(1600, 2000), dur: 0.015, vol: 0.02 }),
    buy: (o, v) => {
        S.coin(o, v);
        nz(o, { type: 'bandpass', f: 3000, q: 3, dur: 0.05, vol: 0.05, delay: 0.02 });
        bell(o, { f: M(96), ratio: 2, index: 0.8, dur: 0.5, vol: 0.035, delay: 0.17 });
    },
    sell: (o) => {
        osc(o, { type: 'square', f: M(88), dur: 0.07, vol: 0.04, lp: 4000 });
        osc(o, { type: 'square', f: M(83), dur: 0.22, vol: 0.04, lp: 4000, delay: 0.07 });
    },
    error: (o) => {
        osc(o, { type: 'square', f: 155, dur: 0.12, vol: 0.055, lp: 1200 });
        osc(o, { type: 'square', f: 110, dur: 0.2, vol: 0.055, lp: 1000, delay: 0.14 });
    },
    success: (o) => [79, 86].forEach((n, i) => bell(o, { f: M(n), ratio: 2, index: 1, dur: 0.45, vol: 0.06, delay: i * 0.09 })),
    correct: (o) => {
        [76, 79, 84].forEach((n, i) => bell(o, { f: M(n), ratio: 2, index: 1, dur: 0.5, vol: 0.06, delay: i * 0.08 }));
        [76, 79, 84].forEach(n => saws(o, { f: M(n), dur: 0.6, vol: 0.018, a: 0.06, lp: 2400, delay: 0.2 }));
    },
    wrong: (o) => {
        osc(o, { type: 'sawtooth', f: 330, f2: 150, dur: 0.4, vol: 0.055, lp: 1200, vib: 10, vibRate: 8 });
        osc(o, { type: 'square', f: 110, dur: 0.35, vol: 0.035, lp: 600 });
    },
    notify: (o) => [84, 91].forEach((n, i) => bell(o, { f: M(n), ratio: 2, index: 1, dur: 0.4, vol: 0.05, delay: i * 0.1 })),
    whoosh: (o) => nz(o, { type: 'bandpass', f: 300, f2: 4000, q: 1.5, dur: 0.35, vol: 0.09, a: 0.08 }),
};

// Reverb send per sound (0 = dry). Fast, frequent sounds stay dry so the mix stays clear.
const WET = {
    shoot: 0.03, shootHeavy: 0.04, shootFire: 0.04, shootJoker: 0.06, shootIvory: 0.1, noAmmo: 0, enemyShoot: 0.05,
    hit: 0.04, explode: 0.16, explodeBig: 0.3, asteroidHit: 0.06, asteroidCrash: 0.2, playerHit: 0.12, friendlyHit: 0.04,
    blocked: 0.3, toothHit: 0.25, toothBreak: 0.35, gameOver: 0.4,
    heal: 0.3, pickup: 0.25, burger: 0.08, fat: 0.15, slim: 0.2, ammoFull: 0.3, coin: 0.2,
    levelUp: 0.35, unlock: 0.45, achievement: 0.4, record: 0.45,
    phoenix: 0.35, vortex: 0.3, joker: 0.3, dragon: 0.3, tooth: 0.4, servants: 0.25, abilityReady: 0.3, abilityWait: 0,
    bossAlarm: 0.35, bossPhase: 0.4, bossHit: 0.08, bossDeath: 0.35, bossWin: 0.45, telegraph: 0.1, bossAttack: 0.2, shake: 0.1,
    start: 0.35, pause: 0.15, resume: 0.15, click: 0.02, toggle: 0.03, open: 0.08, close: 0.08, type: 0,
    buy: 0.25, sell: 0.15, error: 0.05, success: 0.3, correct: 0.3, wrong: 0.12, notify: 0.3, whoosh: 0.2,
};

// Minimum gap between two plays of the same sound, so a wave of explosions
// or a dozen enemies firing at once do not pile up into noise.
const GAP = {
    shoot: 45, shootHeavy: 45, shootFire: 45, shootJoker: 45, shootIvory: 45, noAmmo: 250,
    enemyShoot: 90, hit: 35, explode: 70, asteroidHit: 50, friendlyHit: 80, bossHit: 70,
    pickup: 50, telegraph: 120, bossAttack: 150, shake: 200, click: 30, type: 25, playerHit: 90,
    toothHit: 60, heal: 120, coin: 60, whoosh: 120, blocked: 90, abilityWait: 150,
};
// ---- recorded sounds ----
// v: variants (one is picked per play) · db: loudness it is brought to (RMS dBFS)
// rate: base playback speed (1 = as recorded; lower = deeper) · jit: random pitch spread (default 4%)
// also: [file, delay s, dB relative to db] layers played with it · fx: synth layer (out, v) => …
// off/dur: play only a slice of the file (with fades) · delay: start later
const BANK = {
    // Player shots
    shoot:       { v: ['laserSmall_000', 'laserSmall_001', 'laserSmall_003'], db: -27 },
    shootHeavy:  { v: ['laserLarge_000', 'laserLarge_002'], db: -25, rate: 0.9 },
    shootJoker:  { v: ['pepSound1', 'pepSound3'], db: -27, jit: 0.12 },
    shootIvory:  { v: ['impactGlass_light_000', 'impactGlass_light_001', 'impactGlass_light_002'], db: -24, rate: 1.15 },
    noAmmo:      { v: ['switch_003'], db: -24, rate: 0.8 },
    enemyShoot:  { v: ['laserRetro_002', 'laserRetro_004'], db: -31, rate: 0.8 },
    // Impacts
    hit:         { v: ['impactMetal_light_000', 'impactMetal_light_001', 'impactMetal_light_002'], db: -27, jit: 0.08 },
    explode:     { v: ['explosionCrunch_000', 'explosionCrunch_002'], db: -19, jit: 0.08 },
    explodeBig:  { v: ['explosionCrunch_001'], db: -15, rate: 0.85, also: [['lowFrequency_explosion_000', 0, 0]] },
    asteroidHit: { v: ['impactMining_000', 'impactMining_002'], db: -23, jit: 0.1 },
    asteroidCrash: { v: ['impactPunch_heavy_000', 'impactPunch_heavy_001'], db: -17, also: [['explosionCrunch_004', 0.02, -4]] },
    playerHit:   { v: ['impactPlate_heavy_000', 'impactPlate_heavy_002'], db: -16, also: [['lowFrequency_explosion_001', 0, -6]] },
    blocked:     { v: ['forceField_000', 'forceField_002'], db: -22, rate: 1.2, jit: 0.06 },
    toothHit:    { v: ['impactGlass_medium_000', 'impactGlass_medium_002'], db: -20 },
    toothBreak:  { v: ['impactGlass_heavy_000', 'impactGlass_heavy_002'], db: -15, also: [['impactGlass_light_001', 0.07, -4], ['impactGlass_light_002', 0.15, -7]] },
    gameOver:    { v: ['jingles_STEEL07'], db: -17, jit: 0, delay: 0.45, also: [['explosionCrunch_001', -0.45, 2], ['lowFrequency_explosion_000', -0.45, 0]] },
    // Pickups and rewards
    heal:        { v: ['powerUp6'], db: -22, jit: 0.03 },
    pickup:      { v: ['powerUp2'], db: -24, jit: 0.05 },
    ammoFull:    { v: ['twoTone2'], db: -24, rate: 1.1 },
    coin:        { v: ['chips-collide-1', 'chips-collide-2', 'chips-collide-3'], db: -20, rate: 1.1 },
    levelUp:     { v: ['jingles_NES09'], db: -19, jit: 0, fx: (o) => sparkle(o, 0.25, 5) },
    achievement: { v: ['jingles_NES12'], db: -19, jit: 0 },
    unlock:      { v: ['jingles_STEEL10'], db: -17, jit: 0, fx: (o) => sparkle(o, 0.3, 10) },
    record:      { v: ['jingles_PIZZI10'], db: -17, jit: 0, also: [['jingles_STEEL02', 0.7, 0]], fx: (o) => sparkle(o, 0.7, 12) },
    // Ship abilities
    phoenix:     { v: ['thrusterFire_001'], off: 1.2, dur: 1.1, db: -17, rate: 1.25, jit: 0, fx: (o) => {
                       [69, 73, 76, 81, 85].forEach((n, i) => saws(o, { f: M(n), dur: 0.36, vol: 0.03, lp: 1200, lp2: 5000, delay: 0.1 + i * 0.07 }));
                   } },
    vortex:      { v: ['zap1'], db: -18, rate: 0.9, also: [['lowFrequency_explosion_001', 0.2, -5]] },
    joker:       { v: ['jingles_PIZZI00'], db: -18, jit: 0, also: [['pepSound3', 0.05, -6]] },
    dragon:      { v: ['lowFrequency_explosion_001'], db: -14, rate: 0.75, also: [['thrusterFire_001', 0.1, -2]], fx: (o) => {
                       osc(o, { type: 'sawtooth', f: 95, f2: 55, dur: 1.2, vol: 0.09, vib: 8, vibRate: 11, lp: 900, shape: true, a: 0.05 });
                   } },
    tooth:       { v: ['impactBell_heavy_002'], db: -19, rate: 1.4, jit: 0, fx: (o) => sparkle(o, 0.05, 4) },
    servants:    { v: ['zapTwoTone2'], db: -22, rate: 1.2 },
    abilityReady:{ v: ['confirmation_001'], db: -21, jit: 0 },
    abilityWait: { v: ['error_008'], db: -24 },
    // Bosses
    bossPhase:   { v: ['zapThreeToneDown'], db: -17, rate: 0.8, jit: 0, also: [['lowFrequency_explosion_000', 0, -2]] },
    bossHit:     { v: ['impactMetal_heavy_000', 'impactMetal_heavy_001', 'impactMetal_heavy_003'], db: -26, jit: 0.07 },
    bossDeath:   { v: ['lowFrequency_explosion_000'], db: -13, jit: 0, also: [
                       ['explosionCrunch_004', 0, -2], ['explosionCrunch_001', 0.6, -3], ['explosionCrunch_000', 1.1, -4],
                       ['explosionCrunch_002', 1.6, -4], ['lowFrequency_explosion_000', 1.9, -2]] },
    bossWin:     { v: ['jingles_STEEL02'], db: -16, jit: 0, fx: (o) => { sparkle(o, 0.4, 14); osc(o, { type: 'sine', f: M(48), dur: 1.6, vol: 0.1, a: 0.05 }); } },
    bossAttack:  { v: ['laserLarge_003', 'laserLarge_004'], db: -20, rate: 0.65 },
    shake:       { v: ['lowFrequency_explosion_001'], db: -21, rate: 0.9 },
    // Game flow and menus
    start:       { v: ['zapThreeToneUp'], db: -20, jit: 0 },
    pause:       { v: ['minimize_001'], db: -22, jit: 0 },
    resume:      { v: ['maximize_001'], db: -22, jit: 0 },
    click:       { v: ['click_002', 'click_003'], db: -24, jit: 0.06 },
    toggle:      { v: ['toggle_002'], db: -24 },
    open:        { v: ['open_001'], db: -26 },
    close:       { v: ['close_001'], db: -26 },
    type:        { v: ['tick_001'], db: -30, jit: 0.1 },
    buy:         { v: ['chips-stack-1', 'chips-stack-3'], db: -19, also: [['chips-collide-2', 0.12, -3]] },
    sell:        { v: ['chips-handle-3'], db: -20 },
    error:       { v: ['error_002'], db: -21, jit: 0 },
    success:     { v: ['confirmation_002'], db: -21, jit: 0 },
    correct:     { v: ['confirmation_003'], db: -19, jit: 0 },
    wrong:       { v: ['error_006'], db: -19, jit: 0 },
    notify:      { v: ['question_003'], db: -22, jit: 0 },
};

// High FM-bell glitter over a reward jingle (self-made layer).
function sparkle(o, start, count) {
    for (let i = 0; i < count; i++)
        bell(o, { f: M(pick([96, 100, 103, 108])), ratio: 2, index: 0.8, dur: 0.45, vol: 0.02, delay: start + i * 0.08 });
}

const SFX_URL = new URL('../assets/sfx/', import.meta.url);
const buffers = {};   // file → { buf, gain } once decoded; false if it failed
let samplesStarted = false;
// Loudness of the loud part of a buffer, in dB (RMS of the blocks within 20 dB of the loudest one).
function loudness(buf) {
    const d = buf.getChannelData(0), B = 512, rms = [];
    let peak = 0;
    for (let i = 0; i + B <= d.length; i += B) {
        let s = 0;
        for (let j = i; j < i + B; j++) { s += d[j] * d[j]; const a = Math.abs(d[j]); if (a > peak) peak = a; }
        rms.push(s / B);
    }
    if (!rms.length) return { db: -60, peak: 1 };
    const top = Math.max(...rms), loud = rms.filter(r => r >= top / 100);
    return { db: 10 * Math.log10(loud.reduce((a, b) => a + b, 0) / loud.length + 1e-12), peak: peak || 1 };
}
function loadSamples() {
    if (samplesStarted) return;
    samplesStarted = true;
    const files = new Set();
    for (const e of Object.values(BANK)) { e.v.forEach(f => files.add(f)); (e.also || []).forEach(a => files.add(a[0])); }
    for (const f of files) {
        fetch(new URL(f + '.ogg', SFX_URL))
            .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
            .then(ab => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
            .then(buf => { buffers[f] = { buf, ...loudness(buf) }; })
            .catch(() => { buffers[f] = false; });
    }
}
const ready = (f) => !!buffers[f];

// Plays one recording into bus o, brought to `db` loudness (never clipping), at speed `rate`.
function sample(o, f, db, rate, delay = 0, off = 0, dur = 0) {
    const s = buffers[f];
    if (!s) return;
    const t = ctx.currentTime + Math.max(0, delay);
    const src = ctx.createBufferSource(); src.buffer = s.buf; src.playbackRate.value = rate;
    const g = ctx.createGain();
    const vol = Math.min(Math.pow(10, (db - s.db) / 20), 0.95 / s.peak);
    if (dur) {   // a slice of a long file: fade in and out so it does not click
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.06);
        g.gain.setValueAtTime(vol, t + dur * 0.6);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    } else g.gain.value = vol;
    src.connect(g); g.connect(o);
    if (dur) src.start(t, off, dur * rate + 0.05); else src.start(t);
}

// Plays BANK[name]; returns false when its recordings are not ready (the synth plays instead).
function playRecorded(name, o) {
    const e = BANK[name];
    if (!e) return false;
    const f = pick(e.v);
    if (!ready(f)) return false;
    const jit = e.jit ?? 0.04;
    const rate = (e.rate || 1) * (1 + rnd(-jit, jit));
    const d0 = e.delay || 0;
    sample(o, f, e.db, rate, d0, e.off || 0, e.dur || 0);
    for (const [af, ad, adb] of e.also || []) if (ready(af)) {
        const slice = af === 'thrusterFire_001' ? [1.0, 1.1] : [0, 0];   // the thruster file is a 5 s loop: use a slice
        sample(o, af, e.db + adb, rate, d0 + ad, slice[0], slice[1]);
    }
    if (e.fx) e.fx(o, rate);
    return true;
}

const last = {};
let voices = 0;
const MAX_VOICES = 28;

export function play(name, x) {
    if (!settings.on || settings.vol <= 0) return;
    const fn = S[name];
    if (!fn && !BANK[name]) return;
    const c = ensureCtx();
    if (!c || c.state !== 'running') return;
    const now = performance.now();
    if (last[name] && now - last[name] < (GAP[name] ?? 40)) return;
    if (voices >= MAX_VOICES) return;
    last[name] = now;
    voices++;
    setTimeout(() => { voices--; }, 300);
    const w = window.innerWidth || 1;
    const pan = Number.isFinite(x) ? Math.max(-1, Math.min(1, (x / w) * 2 - 1)) * 0.6 : 0;
    try {
        const o = bus(pan, WET[name] ?? 0.12);
        if (!playRecorded(name, o) && fn) fn(o, rnd(0.96, 1.04));
    } catch (e) { console.warn('[SFX]', name, e); }
}

export function getSfxSettings() { return { ...settings }; }
// Keeps the settings panel (index.html #sfx-settings) in step with the stored settings.
function syncUI() {
    document.getElementById('sfx-on')?.classList.toggle('active', settings.on);
    document.getElementById('sfx-off')?.classList.toggle('active', !settings.on);
    const vol = document.getElementById('sfx-volume');
    if (vol) vol.value = String(Math.round(settings.vol * 100));
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncUI); else syncUI();
export function setSfxEnabled(on) {
    settings.on = !!on; save(); syncUI();
    if (master) master.gain.value = settings.on ? settings.vol : 0;
    if (settings.on) { unlock(); play('toggle'); }
}
export function setSfxVolume(vol) {
    settings.vol = clamp01(vol); save();
    if (master) master.gain.value = settings.on ? settings.vol : 0;
}
export const SFX_NAMES = Object.keys(S);

window.__sfx = play;
window.__sfxSetEnabled = setSfxEnabled;
window.__sfxSetVolume = (v) => { setSfxVolume(v); play('click'); };

// ---- menu sounds for every button, toggle and field ----
// One listener covers all UI: buttons, links, checkboxes, selects, text fields.
// In-game controls with their own sound (the ability button) are skipped.
document.addEventListener('click', (e) => {
    const el = e.target.closest && e.target.closest('button, a, [onclick], .btn, [role="button"], input[type="checkbox"], input[type="radio"], label');
    if (!el || el.closest('#special-ability-btn')) return;
    if (el.matches('input[type="checkbox"], input[type="radio"]') || el.closest('label')) play('toggle', e.clientX);
    else play('click', e.clientX);
}, true);
document.addEventListener('change', (e) => {
    if (e.target.matches && e.target.matches('select')) play('toggle');
}, true);
document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.matches && el.matches('input[type="text"], input[type="email"], input[type="password"], input[type="number"], input:not([type]), textarea')) play('type');
}, true);
