// ===== COOLDOWN MULTIPLIER: one shop upgrade with levels (like the score boost) =====
// Pure helpers with no imports, so data.js and cloud-sync.js can both use them.

// Level n divides every ship's special-ability cooldown by COOLDOWN_MULTS[n - 1].
export const COOLDOWN_MULTS = [2, 3, 4];
// Coins for buying level n (index n - 1). Selling the top level refunds 75%.
export const COOLDOWN_LEVEL_COSTS = [150000, 400000, 900000];

// Old shop keys (before the leveled upgrade) and the level each one meant.
const LEGACY_COOLDOWN_LEVELS = { vortex_cooldown_half: 1, cooldown_x3: 2, cooldown_x4: 3 };

export function isLegacyCooldownKey(key) {
    return Object.prototype.hasOwnProperty.call(LEGACY_COOLDOWN_LEVELS, key);
}

export function clampCooldownLevel(value) {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(n, COOLDOWN_MULTS.length);
}

// Highest level implied by the old cooldown upgrades in a list of owned keys.
export function legacyCooldownLevel(keys) {
    return keys.reduce((best, k) => (isLegacyCooldownKey(k) ? Math.max(best, LEGACY_COOLDOWN_LEVELS[k]) : best), 0);
}

export function stripLegacyCooldown(keys) {
    return keys.filter(k => !isLegacyCooldownKey(k));
}
