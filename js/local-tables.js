// ===== LOCAL BEST TABLES =====
// The device's best runs, one table per ship plus 'overall' (top 5 rows each).
// They live in localStorage under `leaderboard_<table>`. They used to be cookies, but a cookie
// holds at most 4 KB and every row carries the game's settings, so once a table grew past
// that the browser silently dropped it and new bests were not kept. Old cookies are moved
// here the first time a table is read.

const PREFIX = 'leaderboard_';

function cookieNames() {
    try { return document.cookie.split(';').map(c => c.split('=')[0].trim()).filter(Boolean); }
    catch { return []; }
}
function readCookie(name) {
    try {
        for (const part of document.cookie.split(';')) {
            const c = part.trim();
            if (c.startsWith(name + '=')) return c.slice(name.length + 1);
        }
    } catch { /* no cookies */ }
    return null;
}
function dropCookie(name) {
    try { document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`; } catch { /* ignore */ }
}

export function writeLocalTable(table, rows) {
    try { localStorage.setItem(PREFIX + table, JSON.stringify(rows || [])); return true; }
    catch (e) { console.warn(`⚠️ [LOCAL] Could not save table ${table}:`, e); return false; }
}

export function readLocalTable(table) {
    const key = PREFIX + table;
    let stored = null;
    try { stored = localStorage.getItem(key); } catch { /* storage unavailable */ }
    if (stored) {
        try { const list = JSON.parse(stored); if (Array.isArray(list)) return list; } catch { /* damaged */ }
    }
    const raw = readCookie(key);
    if (raw !== null) {
        let list = [];
        try { const v = JSON.parse(raw); if (Array.isArray(v)) list = v; } catch { /* damaged cookie */ }
        if (writeLocalTable(table, list)) dropCookie(key);
        return list;
    }
    return [];
}

// Names of every table this device has (localStorage and not yet moved cookies).
export function localTableNames() {
    const names = new Set();
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(PREFIX)) names.add(k.slice(PREFIX.length));
        }
    } catch { /* storage unavailable */ }
    for (const n of cookieNames()) if (n.startsWith(PREFIX)) names.add(n.slice(PREFIX.length));
    return [...names];
}
