// ===== ABILITY DURATION: one shop upgrade with levels per ship (like the score boost) =====
// Pure helpers with no imports, so data.js and cloud-sync.js can both use them.

// Each level adds this many ms to the ability's base duration.
export const DURATION_STEP_MS = 5000;
// Ships whose special ability has a duration (Joker Chaos, Baby Dragon invincibility).
export const DURATION_SHIPS = ['joker', 'dragon'];
export const DURATION_MAX_LEVEL = 3;
// Coins for buying level n (index n - 1). Selling the top level refunds 75%.
export const DURATION_LEVEL_COSTS = [15000, 30000, 50000];

// Old shop keys (before the leveled upgrade): joker_duration_1 ... dragon_duration_3.
const LEGACY_DURATION_KEY = /^(joker|dragon)_duration_([1-3])$/;

export function isLegacyDurationKey(key) {
    return LEGACY_DURATION_KEY.test(key);
}

export function clampDurationLevel(value) {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(n, DURATION_MAX_LEVEL);
}

// Returns { joker, dragon } with the highest level implied by the old duration keys.
export function legacyDurationLevels(keys) {
    const out = { joker: 0, dragon: 0 };
    for (const k of keys) {
        const m = LEGACY_DURATION_KEY.exec(k);
        if (m) out[m[1]] = Math.max(out[m[1]], Number(m[2]));
    }
    return out;
}

export function stripLegacyDuration(keys) {
    return keys.filter(k => !isLegacyDurationKey(k));
}

// Turns any stored value (object, JSON string or undefined) into { joker, dragon } with clamped levels.
export function normalizeDurationLevels(value) {
    let obj = value;
    if (typeof obj === 'string') {
        try { obj = JSON.parse(obj); } catch { obj = null; }
    }
    const src = obj && typeof obj === 'object' ? obj : {};
    return {
        joker: clampDurationLevel(src.joker),
        dragon: clampDurationLevel(src.dragon)
    };
}

// Per ship, the highest level found in any of the sources (cloud, cookie, old keys).
export function mergeDurationLevels(...sources) {
    const out = { joker: 0, dragon: 0 };
    for (const s of sources) {
        const n = normalizeDurationLevels(s);
        out.joker = Math.max(out.joker, n.joker);
        out.dragon = Math.max(out.dragon, n.dragon);
    }
    return out;
}
