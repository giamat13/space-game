// ===== LOCAL PROGRESS OWNERSHIP =====
// Progress kept in this browser (cookies + localStorage) belongs to the account that
// earned it. It is wiped on sign-out and whenever a different account signs in, so one
// player's progress never syncs into the next account.

const OWNER_KEY = 'localDataOwner_v1';

// Cookies that hold per-player progress. Language and other preferences are not listed.
const PROGRESS_COOKIES = [
    'playerCoins', 'ownedUpgrades', 'disabledUpgrades', 'hpLevels', 'unlockedSkins',
    'maxLevel', 'keyBindings', 'gameRules', 'deviceMode', 'customSpeedrunGoals'
];
const PROGRESS_COOKIE_PREFIXES = ['leaderboard_'];

// localStorage keys that hold per-player progress.
const PROGRESS_KEYS = ['achievements_v1', 'gameHistory', 'gameHistory_v2', 'bossTrophies_v1', 'pendingCloudSaves_v1'];
const PROGRESS_KEY_PREFIXES = ['sr_lb_'];

function cookieNames() {
    return document.cookie.split(';').map(c => c.split('=')[0].trim()).filter(Boolean);
}

export function clearLocalProgress() {
    try {
        const names = new Set([
            ...PROGRESS_COOKIES,
            ...cookieNames().filter(n => PROGRESS_COOKIE_PREFIXES.some(p => n.startsWith(p)))
        ]);
        for (const name of names) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        }
    } catch (e) { console.warn('⚠️ [LOCAL] Could not clear cookies:', e); }

    try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (PROGRESS_KEYS.includes(k) || PROGRESS_KEY_PREFIXES.some(p => k.startsWith(p))) keys.push(k);
        }
        keys.forEach(k => localStorage.removeItem(k));
    } catch (e) { console.warn('⚠️ [LOCAL] Could not clear storage:', e); }
}

function getOwner() {
    try { return localStorage.getItem(OWNER_KEY); } catch { return null; }
}

function setOwner(uid) {
    try {
        if (uid) localStorage.setItem(OWNER_KEY, uid);
        else localStorage.removeItem(OWNER_KEY);
    } catch { /* storage unavailable */ }
}

// Called when an account signs in. Returns true when the page must reload, because
// in-memory game state may still hold the previous account's values.
export function claimLocalProgress(uid) {
    const owner = getOwner();
    setOwner(uid);
    if (owner && owner !== uid) {
        clearLocalProgress();
        return true;
    }
    return false;
}

// Called on sign-out and after an account is deleted.
export function releaseLocalProgress() {
    clearLocalProgress();
    setOwner(null);
}
