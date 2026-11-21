// ===== GAME HISTORY & PERSONAL LEADERBOARD =====
// History: localStorage (gameHistory_v2), newest first, MAX_HISTORY games.
// Replays: IndexedDB (database spaceGameReplays), one record per game.
// Personal bests: the local best tables (js/local-tables.js).
import { readLocalTable } from './local-tables.js';

const HISTORY_KEY = 'gameHistory_v2';
const MAX_HISTORY = 50;

// ===== REPLAYS =====
// Replays used to be kept in localStorage. Together they filled the browser's ~5 MB limit
// (shared by every game on the same site), and from then on the history list, the boss
// times and the replays themselves failed to save. IndexedDB has room for them.
const REPLAY_PREFIX = 'gameReplay_v1_';
const REPLAY_DB = 'spaceGameReplays';
const REPLAY_STORE = 'replays';
const MAX_REPLAY_CHARS = 3000000;       // one replay; longer ones are thinned to fit
const REPLAY_BUDGET_CHARS = 60000000;   // all replays together; the newest are kept
const LS_FALLBACK_CHARS = 400000;       // without IndexedDB, only a small replay goes to localStorage

let _db = null;
function openDb() {
    if (_db) return _db;
    _db = new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return; }
        const req = indexedDB.open(REPLAY_DB, 1);
        req.onupgradeneeded = () => { req.result.createObjectStore(REPLAY_STORE); };
        req.onsuccess = () => {
            const db = req.result;
            // Account data cleared (sign-out): close so the database can be deleted.
            db.onversionchange = () => { db.close(); _db = null; };
            resolve(db);
        };
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error('IndexedDB blocked'));
    });
    _db.catch(() => { _db = null; });
    return _db;
}
function idb(mode, fn) {
    return openDb().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(REPLAY_STORE, mode);
        const req = fn(tx.objectStore(REPLAY_STORE));
        let out;
        if (req) req.onsuccess = () => { out = req.result; };
        tx.oncomplete = () => resolve(out);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    }));
}
const idbPut = (key, json) => idb('readwrite', s => s.put(json, key));
const idbGet = (key) => idb('readonly', s => s.get(key));
const idbKeys = () => idb('readonly', s => s.getAllKeys());
const idbDelete = (keys) => idb('readwrite', s => { keys.forEach(k => s.delete(k)); return null; });

// The last replays of this session stay in memory, so a replay can be watched right after
// the game, before (or even if) it is written.
const _recent = new Map();
function remember(key, log) {
    _recent.set(key, log);
    while (_recent.size > 3) _recent.delete(_recent.keys().next().value);
}

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

function storeReplay(key, json) {
    idbPut(key, json).catch(err => {
        console.warn('⚠️ [REPLAY] IndexedDB not available, trying localStorage:', err);
        if (json.length > LS_FALLBACK_CHARS) return;
        try { localStorage.setItem(key, json); } catch { /* no room */ }
    });
}

export function hasReplay(entry) {
    return !!(entry && (entry.replayKey || Array.isArray(entry.replayLog)));
}

// Reads a game's replay: from memory, from IndexedDB, or from an old localStorage copy.
export async function loadReplay(entry) {
    if (!entry) return null;
    if (Array.isArray(entry.replayLog)) return entry.replayLog;
    const key = entry.replayKey;
    if (!key) return null;
    if (_recent.has(key)) return _recent.get(key);
    let json = null;
    try { json = await idbGet(key); } catch { /* IndexedDB unavailable */ }
    if (!json) { try { json = localStorage.getItem(key); } catch { /* storage unavailable */ } }
    if (!json) return null;
    try { return typeof json === 'string' ? JSON.parse(json) : json; } catch { return null; }
}

// Old replays in localStorage move to IndexedDB once, which frees the room the history needs.
async function moveOldReplays() {
    const keys = [];
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(REPLAY_PREFIX)) keys.push(k);
        }
    } catch { return; }
    for (const k of keys) {
        try {
            const v = localStorage.getItem(k);
            if (v) await idbPut(k, v);
            localStorage.removeItem(k);
        } catch { return; }   // IndexedDB unavailable: they stay where they are
    }
}
if (typeof window !== 'undefined') moveOldReplays();

// ===== HISTORY =====
export function loadGameHistory() {
    try {
        const item = localStorage.getItem(HISTORY_KEY);
        if (item) {
            const list = JSON.parse(item);
            if (Array.isArray(list)) return list.filter(Boolean);
        }
    } catch (e) { console.warn('⚠️ [HISTORY] Could not read game history:', e); }
    return [];
}

function writeHistory(list) {
    // If storage is full, keep fewer games rather than none.
    for (let n = list.length; n > 0; n = Math.floor(n / 2)) {
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, n))); return true; }
        catch (e) { console.warn(`⚠️ [HISTORY] Could not save ${n} games:`, e); }
    }
    return false;
}

function saveGameHistory(history) {
    const list = history.filter(Boolean).slice(0, MAX_HISTORY).map(e => {
        const { replayLog, ...rest } = e;
        if (Array.isArray(replayLog) && replayLog.length && !rest.replayKey) {
            const json = fitReplay(replayLog);
            if (json) {
                const key = REPLAY_PREFIX + (rest.timestamp || Date.now());
                rest.replayKey = key;
                rest.replaySize = json.length;
                delete rest.replayDropped;
                remember(key, JSON.parse(json));
                storeReplay(key, json);
            } else rest.replayDropped = true;
        }
        return rest;
    });

    // Newest replays first, until the budget is used up; older ones are removed.
    let used = 0;
    const keep = new Set();
    for (const e of list) {
        if (!e.replayKey) continue;
        const size = e.replaySize || 0;
        if (used + size <= REPLAY_BUDGET_CHARS) { used += size; keep.add(e.replayKey); }
        else { delete e.replayKey; delete e.replaySize; e.replayDropped = true; }
    }
    idbKeys().then(keys => {
        const stale = (keys || []).filter(k => !keep.has(k));
        if (stale.length) return idbDelete(stale);
    }).catch(() => { /* IndexedDB unavailable */ });

    return writeHistory(list);
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

// ===== PERSONAL BESTS — read from the local best tables =====
const ALL_SKINS = ['classic','interceptor','tanker','phoenix','vortex','joker','ivory','baby_dragon','cube_king'];

export function getPersonalBests(skinKey = 'overall', limit = 10) {
    if (skinKey === 'overall') {
        // Collect best entry per skin from each skin leaderboard
        const allEntries = [];
        for (const sk of ALL_SKINS) {
            const entries = readLocalTable(sk) || [];
            entries.forEach(e => {
                if (!e.skin) e.skin = sk;
                allEntries.push(e);
            });
        }
        // Also try the overall cookie directly
        const overall = readLocalTable('overall') || [];
        overall.forEach(e => allEntries.push(e));

        // Deduplicate by userName+skin, keep highest score
        const seen = {};
        for (const e of allEntries) {
            const key = `${e.userName || 'Anonymous'}_${e.skin || '?'}`;
            if (!seen[key] || e.score > seen[key].score) seen[key] = e;
        }
        return Object.values(seen).sort((a,b) => b.score - a.score).slice(0, limit);
    } else {
        const entries = readLocalTable(skinKey) || [];
        return [...entries].sort((a,b) => b.score - a.score).slice(0, limit);
    }
}

export function getPersonalBest() {
    // Scan all skin leaderboards and overall
    let best = null;
    const keys = ['overall', ...ALL_SKINS];
    for (const sk of keys) {
        const entries = readLocalTable(sk) || [];
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
        const entries = readLocalTable(sk) || [];
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
