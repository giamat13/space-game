// ===== GAME HISTORY & PERSONAL LEADERBOARD =====
// Chronological history: separate localStorage
// Personal bests: reads directly from existing leaderboard_* cookies

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

// ===== REPLAYS =====
// Each replay is kept under its own key (gameReplay_v1_<timestamp>), not inside the history list.
// localStorage is wrapped by the external WARP proxy, which copies every key into ONE cloud
// document (max 1 MB) and swallows storage errors. A history list holding many replays grew past
// that limit, stopped saving, and new replays vanished after a reload. Now every replay is thinned
// to fit MAX_REPLAY_CHARS, and the newest replays are kept within REPLAY_BUDGET_CHARS in total.
const REPLAY_PREFIX = 'gameReplay_v1_';
const MAX_REPLAY_CHARS = 900000;
const REPLAY_BUDGET_CHARS = 3500000;

// Drop every other snapshot frame (event frames stay) until the replay fits.
function fitReplay(log) {
    let json = JSON.stringify(log);
    let frames = log.slice(1);
    while (json.length > MAX_REPLAY_CHARS && frames.filter(f => !f.ev).length > 2) {
        let keep = true;
        frames = frames.filter(f => { if (f.ev) return true; keep = !keep; return !keep; });
        json = JSON.stringify([log[0], ...frames]);
    }
    return json.length > MAX_REPLAY_CHARS ? null : json;
}

function readReplay(key) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
}

// replayLog is read only when a replay is opened, so listing the history stays cheap.
function attachReplay(entry) {
    if (!entry || !entry.replayKey || entry.replayLog) return entry;
    let cached;
    Object.defineProperty(entry, 'replayLog', {
        enumerable: false, configurable: true,
        get() { if (cached === undefined) cached = readReplay(entry.replayKey); return cached; }
    });
    return entry;
}

export function hasReplay(entry) {
    return !!(entry && (entry.replayKey || entry.replayLog));
}

export function loadGameHistory() {
    try {
        const item = localStorage.getItem(HISTORY_KEY);
        if (item) return JSON.parse(item).map(attachReplay);
    } catch(e) {}
    return [];
}

function saveGameHistory(history) {
    const list = history.slice(0, MAX_HISTORY).map(e => {
        if (!e) return e;
        const own = Object.getOwnPropertyDescriptor(e, 'replayLog');
        const inline = own && 'value' in own ? own.value : undefined;   // not the lazy getter
        const { replayLog, ...rest } = { ...e, replayLog: undefined };
        if (inline && !rest.replayKey) {
            const json = fitReplay(inline);
            if (json) {
                const key = REPLAY_PREFIX + (rest.timestamp || Date.now());
                try { localStorage.setItem(key, json); rest.replayKey = key; } catch { rest.replayDropped = true; }
            } else rest.replayDropped = true;
        }
        return rest;
    });

    // Newest replays first, until the budget is used up; older ones are removed.
    let used = 0;
    const keep = new Set();
    for (const e of list) {
        if (!e?.replayKey) continue;
        const v = (() => { try { return localStorage.getItem(e.replayKey); } catch { return null; } })();
        if (v && used + v.length <= REPLAY_BUDGET_CHARS) { used += v.length; keep.add(e.replayKey); }
        else { delete e.replayKey; e.replayDropped = true; }
    }
    try {
        const stale = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(REPLAY_PREFIX) && !keep.has(k)) stale.push(k);
        }
        stale.forEach(k => localStorage.removeItem(k));
    } catch { /* storage unavailable */ }

    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); }
    catch (e) { console.warn('⚠️ [HISTORY] Could not save game history:', e); }
}

export function addGameToHistory(entry) {
    const history = loadGameHistory();
    history.unshift(entry);
    saveGameHistory(history);
    // The account keeps a copy in the cloud (without the replay, which stays on this device).
    import('./cloud-sync.js').then(m => m.saveHistoryEntryToCloud?.(entry)).catch(() => {});
    return history;
}

// ===== CLOUD COPY =====
// A history row as the cloud keeps it: everything except the replay fields.
export function historyRowForCloud(entry) {
    return Object.fromEntries(Object.entries(entry || {}).filter(([k]) => !k.startsWith('replay')));
}

// Adds the cloud's games that this device does not have yet (matched by timestamp) and
// returns the merged list, newest first, limited to MAX_HISTORY.
export function mergeCloudHistory(cloudEntries = []) {
    const local = loadGameHistory();
    const byTs = new Map();
    const noTs = [];
    for (const e of local) {
        if (e && e.timestamp) byTs.set(String(e.timestamp), e); else if (e) noTs.push(e);
    }
    let added = 0;
    for (const e of cloudEntries) {
        if (e && e.timestamp && !byTs.has(String(e.timestamp))) { byTs.set(String(e.timestamp), e); added++; }
    }
    const list = [...byTs.values(), ...noTs]
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, MAX_HISTORY);
    if (added) saveGameHistory(list);
    return list;
}

// ===== PERSONAL BESTS — read from existing leaderboard cookies =====
const ALL_SKINS = ['classic','interceptor','tanker','phoenix','vortex','joker','baby_dragon'];

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
