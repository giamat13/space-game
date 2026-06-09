// ===== GAME HISTORY & PERSONAL LEADERBOARD =====
// היסטוריה כרונולוגית: localStorage נפרד
// שיאים אישיים: קורא ישירות מקוקי leaderboard_* הקיים

const HISTORY_KEY = 'gameHistory_v2';
const MAX_HISTORY = 50;

// ===== COOKIE HELPERS (same as data.js) =====
function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1);
        if (c.indexOf(nameEQ) === 0) {
            try { return JSON.parse(c.substring(nameEQ.length)); } catch(e) { return null; }
        }
    }
    return null;
}

// ===== HISTORY (chronological, localStorage) =====

export function loadGameHistory() {
    try {
        const item = localStorage.getItem(HISTORY_KEY);
        if (item) return JSON.parse(item);
    } catch(e) {}
    return [];
}

function saveGameHistory(history) {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
    } catch(e) {}
}

export function addGameToHistory(entry) {
    const history = loadGameHistory();
    history.unshift(entry);
    saveGameHistory(history);
    return history;
}

// ===== PERSONAL BESTS — read from existing leaderboard cookies =====
const ALL_SKINS = ['classic','interceptor','tanker','phoenix','vortex','joker','dragon'];

export function getPersonalBests(skinKey = 'overall', limit = 10) {
    if (skinKey === 'overall') {
        // Collect best entry per skin from each skin leaderboard
        const allEntries = [];
        for (const sk of ALL_SKINS) {
            const entries = getCookie(`leaderboard_${sk}`) || [];
            entries.forEach(e => {
                if (!e.skin) e.skin = sk;
                allEntries.push(e);
            });
        }
        // Also try the overall cookie directly
        const overall = getCookie('leaderboard_overall') || [];
        overall.forEach(e => allEntries.push(e));

        // Deduplicate by userName+skin, keep highest score
        const seen = {};
        for (const e of allEntries) {
            const key = `${e.userName || 'Anonymous'}_${e.skin || '?'}`;
            if (!seen[key] || e.score > seen[key].score) seen[key] = e;
        }
        return Object.values(seen).sort((a,b) => b.score - a.score).slice(0, limit);
    } else {
        const entries = getCookie(`leaderboard_${skinKey}`) || [];
        return [...entries].sort((a,b) => b.score - a.score).slice(0, limit);
    }
}

export function getPersonalBest() {
    // Scan all skin leaderboards and overall
    let best = null;
    const keys = ['overall', ...ALL_SKINS];
    for (const sk of keys) {
        const entries = getCookie(`leaderboard_${sk}`) || [];
        for (const e of entries) {
            if (!best || e.score > best.score) {
                best = { ...e, skin: e.skin || sk };
            }
        }
    }
    return best;
}

// ===== STATS (derived from history + leaderboard cookies) =====
export function getPersonalStats() {
    const history = loadGameHistory();
    // Also pull from leaderboard cookies for stats even before history existed
    const allLeaderboard = [];
    for (const sk of ['overall', ...ALL_SKINS]) {
        const entries = getCookie(`leaderboard_${sk}`) || [];
        allLeaderboard.push(...entries.map(e => ({ ...e, skin: e.skin || sk })));
    }

    // Merge: leaderboard entries + history entries (deduplicate by timestamp if available)
    const combined = [...history];

    if (!combined.length && !allLeaderboard.length) return null;

    // Use history for stats if available, fallback to leaderboard
    const src = combined.length ? combined : allLeaderboard;
    const real = src.filter(e => !e.isDebug);
    if (!real.length) return null;

    const totalGames = real.length;
    const bestScore = Math.max(...real.map(e => e.score));
    const bestLevel = Math.max(...real.map(e => e.level));
    const avgScore = Math.round(real.reduce((s,e) => s + e.score, 0) / totalGames);
    const avgLevel = (real.reduce((s,e) => s + e.level, 0) / totalGames).toFixed(1);
    const totalTime = real.reduce((s,e) => s + (e.duration || 0), 0);

    const skinCounts = {};
    real.forEach(e => { if(e.skin) skinCounts[e.skin] = (skinCounts[e.skin]||0)+1; });
    const favSkin = Object.entries(skinCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || null;

    return { totalGames, bestScore, bestLevel, avgScore, avgLevel, totalTime, favSkin };
}

// ===== FORMAT =====
export function formatDuration(ms) {
    if (!ms) return '–';
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${String(secs).padStart(2,'0')}`;
}
