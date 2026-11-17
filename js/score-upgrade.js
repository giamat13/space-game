// ===== SCORE MULTIPLIER: one shop upgrade with levels (like the HP upgrade) =====
// Pure helpers with no imports, so data.js and cloud-sync.js can both use them.

// Level n multiplies every score gain by SCORE_MULTS[n - 1].
export const SCORE_MULTS = [2, 4, 6, 8, 10];
// Coins for buying level n (index n - 1). Selling the top level refunds 75%.
export const SCORE_LEVEL_COSTS = [50000, 150000, 400000, 800000, 1500000];

// Old shop keys (before the leveled upgrade) and the level each one meant.
const LEGACY_SCORE_LEVELS = { double_score: 1, score_x4: 2, score_x6: 3, score_x8: 4, score_x10: 5 };

export function isLegacyScoreKey(key) {
    return Object.prototype.hasOwnProperty.call(LEGACY_SCORE_LEVELS, key);
}

export function clampScoreLevel(value) {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(n, SCORE_MULTS.length);
}

// Highest level implied by the old score upgrades in a list of owned keys.
export function legacyScoreLevel(keys) {
    return keys.reduce((best, k) => (isLegacyScoreKey(k) ? Math.max(best, LEGACY_SCORE_LEVELS[k]) : best), 0);
}

export function stripLegacyScore(keys) {
    return keys.filter(k => !isLegacyScoreKey(k));
}
