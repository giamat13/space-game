// ===== CLOUD SYNC (Firebase Realtime Database over REST) =====
// All cloud data lives in the Realtime Database. Firestore was dropped because its free
// tier counts every read and write (50K/20K a day) and the game ran out within minutes.
// The Realtime Database free tier has no per-operation limit (only storage and download
// size), and plain REST calls keep no socket open, so they never use up its connection limit.
//
// Saving cuts:
//  - every write goes into a local OUTBOX first (localStorage) and is sent from there, so
//    nothing is lost when the server is unreachable or refuses (quota, offline): it is
//    uploaded as soon as it can be. Changes made close together are merged into ONE write.
//  - the profile is read once per sign-in, leaderboards are cached for a minute.
//
// Layout:
//   users/{uid}              profile: skins{}, coins, ownedUpgrades[], disabledUpgrades[],
//                            hpLevels{}, achievements{}, keyBindings{}, gameRules{},
//                            deviceMode{}, customSpeedrunGoals[], maxLevel, email, stats{}
//   lb/{table}/{uid}         each player's best run per table ('overall' or a skin key)
//   runs/{table}/{runId}     every run (filtered views pick the best MATCHING run); 'all' = every skin
//   top/{table}              the world record of each table (for the record animation)
//   money/{uid}              coin balance table
//   speedrun/{goal}/{uid}    best time per player, speedrunRuns/{goal}/{runId} every time
//   transfers/{emailKey}/{id} coins sent to an e-mail address, deleted when claimed
//   analytics/{uid}/{sid}    one summary per game
//   edu/{sessionId}          classroom lock sessions (see education.js)

import { getApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { claimLocalProgress } from './account-data.js';
import { readLocalTable, localTableNames } from './local-tables.js';
import { clampScoreLevel, legacyScoreLevel, stripLegacyScore } from './score-upgrade.js';
import { clampCooldownLevel, legacyCooldownLevel, stripLegacyCooldown } from './cooldown-upgrade.js';
import { mergeDurationLevels, legacyDurationLevels, stripLegacyDuration } from './duration-upgrade.js';

export const DB_URL = 'https://space-game-ii-default-rtdb.europe-west1.firebasedatabase.app';

let auth = null;
// Kept for older callers: truthy once the cloud layer is ready.
export let db = null;

function initCloud() {
    if (auth) return true;
    try {
        auth = getAuth(getApp());
        db = { url: DB_URL };
        return true;
    } catch (error) {
        console.error('❌ [CLOUD] Firebase app not ready:', error);
        return false;
    }
}

// ===== COOKIES =====
function setCookie(name, value, days = 365) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = name + "=" + value + ";expires=" + date.toUTCString() + ";path=/";
}
function getCookie(name) {
    const nameEQ = name + "=";
    for (let c of document.cookie.split(';')) {
        while (c.charAt(0) == ' ') c = c.substring(1);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length);
    }
    return null;
}
const readJSONCookie = (name, fallback) => {
    try { const v = JSON.parse(getCookie(name) || 'null'); return v ?? fallback; } catch { return fallback; }
};

// ===== KEYS AND VALUES =====
// Realtime Database keys may not contain . # $ [ ] /
export const safeKey = (k) => String(k).replace(/[.#$\[\]\/]/g, '_') || '_';
// The database stores no `undefined` and no NaN/Infinity.
function sanitize(v) {
    if (v === undefined) return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (Array.isArray(v)) return v.map(sanitize);
    if (v && typeof v === 'object') {
        if (v['.sv'] !== undefined) return v;          // server value (timestamp / increment)
        const o = {};
        for (const [k, x] of Object.entries(v)) if (x !== undefined) o[safeKey(k)] = sanitize(x);
        return o;
    }
    return v;
}
const NOW = { '.sv': 'timestamp' };
const emailKey = (email) => String(email || '').trim().toLowerCase().replace(/\./g, ',');
const asList = (v) => Array.isArray(v) ? v.filter(x => x != null) : (v && typeof v === 'object' ? Object.values(v) : []);
const asKeys = (v) => Array.isArray(v) ? v.filter(Boolean) : (v && typeof v === 'object' ? Object.keys(v).filter(k => v[k]) : []);

// ===== REST =====
const TIMEOUT_MS = 15000;
// query values are passed exactly as the REST API wants them, e.g. { orderBy: '"level"', limitToLast: 500 }
export async function cloudRest(path, { method = 'GET', body, query = {}, authed = true } = {}) {
    initCloud();
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) qs.set(k, String(v));
    if (authed && auth?.currentUser) qs.set('auth', await auth.currentUser.getIdToken());
    const url = `${DB_URL}/${path.split('/').filter(Boolean).map(encodeURIComponent).join('/')}.json${qs.toString() ? '?' + qs : ''}`;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    let res;
    try {
        res = await fetch(url, { method, body: body === undefined ? undefined : JSON.stringify(body), signal: ctl.signal });
    } catch (e) {
        throw Object.assign(new Error('network: ' + (e.message || e)), { code: 'unavailable' });
    } finally { clearTimeout(timer); }
    if (!res.ok) {
        const code = (res.status === 401 || res.status === 403) ? 'permission-denied'
            : (res.status === 402 || res.status === 429 || res.status === 503) ? 'resource-exhausted' : 'unavailable';
        let detail = '';
        try { detail = (await res.json()).error || ''; } catch { /* no body */ }
        throw Object.assign(new Error(`${res.status} ${path} ${detail}`), { code, status: res.status });
    }
    return res.json();
}

// Short cache for public tables, so opening the leaderboard again is free.
const _cache = new Map();
async function cachedGet(path, query = {}, ttl = 60000) {
    const key = path + JSON.stringify(query);
    const hit = _cache.get(key);
    if (hit && Date.now() - hit.t < ttl) return hit.v;
    const v = await cloudRest(path, { query, authed: false });
    _cache.set(key, { t: Date.now(), v });
    return v;
}
const dropCache = () => _cache.clear();

// ===== SKINS =====
const DEFAULT_SKINS = ['classic', 'interceptor', 'tanker'];
// Old skin keys that were renamed. 'dragon' is now 'baby_dragon' (a real 'dragon' ship is planned).
const LEGACY_SKIN_KEYS = { dragon: 'baby_dragon' };
export function normalizeSkins(list) {
    return [...new Set((Array.isArray(list) ? list : []).map(k => LEGACY_SKIN_KEYS[k] || k))];
}
function readLocalSkins() {
    return normalizeSkins(readJSONCookie('unlockedSkins', DEFAULT_SKINS));
}

// ===== RECORDS: one source of truth for "which run is better" =====
// The tables are ranked by level first, then score.
export function isBetterRun(candidate, existing) {
    if (!existing) return true;
    const cl = Number(candidate.level) || 0, el = Number(existing.level) || 0;
    if (cl !== el) return cl > el;
    return (Number(candidate.score) || 0) > (Number(existing.score) || 0);
}
export const isValidRun = (d) => !!d && Number.isFinite(Number(d.score)) && Number.isFinite(Number(d.level)) && d.level !== null && d.score !== null;
const isFasterTime = (candidate, existing) => !existing || candidate.time < existing.time;
const isValidTime = (d) => !!d && typeof d.time === 'number' && Number.isFinite(d.time);

// ===== OUTBOX =====
// Every write waits here until the server takes it. Items carry the account id, so they
// survive a sign-out and are sent the next time that account signs in.
const OUTBOX_KEY = 'cloudOutbox_v2';
const LEGACY_PENDING_KEY = 'pendingCloudSaves_v1';   // queue of the Firestore version
const newId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function readOutbox() {
    try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]'); } catch { return []; }
}
function writeOutbox(list) {
    try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(list.slice(-300))); }
    catch { console.warn('⚠️ [CLOUD] Device storage full; outbox not saved'); }
}
function updateOutbox(fn) { writeOutbox(fn(readOutbox())); }

// Merges `data` (a multi-path update: { "users/u/coins": 5 }) into the account's waiting
// profile write, so many small changes become one request.
function enqueuePatch(uid, data, delay = 8000) {
    updateOutbox((list) => {
        let item = list.find(i => i.kind === 'patch' && i.uid === uid);
        if (!item) { item = { id: newId(), kind: 'patch', uid, data: {}, since: Date.now() }; list.push(item); }
        for (const [path, value] of Object.entries(sanitize(data))) mergePath(item.data, path, value);
        return list;
    });
    scheduleFlush(delay);
}
// A multi-path update may not hold a path and one of its ancestors at once.
function mergePath(map, path, value) {
    for (const k of Object.keys(map)) {
        if (k === path) continue;
        if (k.startsWith(path + '/')) delete map[k];                 // the new value replaces a child
        else if (path.startsWith(k + '/')) {                          // the new value goes inside an earlier one
            let node = map[k];
            if (node === null || typeof node !== 'object') node = map[k] = {};
            const parts = path.slice(k.length + 1).split('/');
            for (let i = 0; i < parts.length - 1; i++) {
                if (node[parts[i]] === null || typeof node[parts[i]] !== 'object') node[parts[i]] = {};
                node = node[parts[i]];
            }
            node[parts[parts.length - 1]] = value;
            return;
        }
    }
    map[path] = value;
}
function enqueueItem(item) {
    item.id = item.id || newId();
    updateOutbox((list) => { list.push(item); return list; });
    return item.id;
}

// Results that failed in the old Firestore version are moved into this outbox.
function importLegacyPending() {
    let old;
    try { old = JSON.parse(localStorage.getItem(LEGACY_PENDING_KEY) || '[]'); } catch { old = []; }
    if (!old.length) return;
    updateOutbox((list) => {
        for (const p of old) {
            if (p.kind === 'skins') list.push({ id: p.id || newId(), kind: 'patch', uid: p.uid,
                data: Object.fromEntries(normalizeSkins(p.skins).map(s => [`users/${p.uid}/skins/${safeKey(s)}`, true])) });
            else if (p.kind === 'speedrun') list.push({ id: p.id || newId(), kind: 'speedrun', uid: p.uid, goalKey: p.goalKey, entry: p.entry, tries: 1 });
            else if (p.entry) list.push({ id: p.id || newId(), kind: 'score', uid: p.uid, entry: p.entry, tries: 1 });
        }
        return list;
    });
    try { localStorage.removeItem(LEGACY_PENDING_KEY); } catch { /* ignore */ }
}

export function getPendingSaveCount() {
    const uid = auth?.currentUser?.uid;
    return readOutbox().filter(p => (p.kind === 'score' || p.kind === 'speedrun') && (!uid || p.uid === uid)).length;
}

let _flushTimer = null;
function scheduleFlush(ms) {
    if (_flushTimer) {
        // Never hold a waiting change longer than a minute, even while changes keep coming.
        const oldest = readOutbox().find(i => i.kind === 'patch')?.since || Date.now();
        if (Date.now() - oldest > 60000) ms = 0;
        clearTimeout(_flushTimer);
    }
    _flushTimer = setTimeout(() => { _flushTimer = null; flushPendingSaves().catch(() => {}); }, ms);
}

let _lastNotice = 0;
function noticeDelayed(error) {
    if (Date.now() - _lastNotice < 5 * 60000) return;   // once in 5 minutes is enough
    _lastNotice = Date.now();
    window.__onCloudSaveDelayed?.(error?.code === 'resource-exhausted' ? 'quota' : 'error');
}

const _results = new Map();       // item id -> what writing it did (read by the caller that queued it)
let _flushChain = Promise.resolve(0);
// Sends the outbox, oldest first. Flushes run one after another, never two at once.
export function flushPendingSaves() {
    _flushChain = _flushChain.then(doFlush, doFlush);
    return _flushChain;
}
async function doFlush() {
    const user = auth?.currentUser;
    if (!user) return 0;
    importLegacyPending();
    const mine = readOutbox().filter(i => i.uid === user.uid);
    if (!mine.length) return 0;
    let late = 0, records = [];
    for (const item of mine) {
        try {
            const result = await runItem(user, item);
            if (result) _results.set(item.id, result);
            if (item.kind === 'patch') {
                // Changes merged into this patch while it was being sent (e.g. a ship unlocked
                // right after a boss reward) are not in what was sent: keep them for the next flush.
                updateOutbox(list => list.flatMap(i => {
                    if (i.id !== item.id) return [i];
                    const rest = {};
                    for (const [k, v] of Object.entries(i.data || {})) {
                        if (JSON.stringify(v) !== JSON.stringify(item.data[k])) rest[k] = v;
                    }
                    return Object.keys(rest).length ? [{ ...i, data: rest }] : [];
                }));
                if (readOutbox().some(i => i.id === item.id)) scheduleFlush(1500);
            } else {
                updateOutbox(list => list.filter(i => i.id !== item.id));
            }
            if (item.tries && (item.kind === 'score' || item.kind === 'speedrun')) {
                late++;
                if (result?.world) records.push(result);
            }
        } catch (e) {
            // A write the server refuses for good (rules, a bad request, too large) is dropped.
            // Before, a 400 counted as "try later" and stayed first in the queue forever,
            // so every save queued after it was never sent.
            const s = Number(e.status) || 0;
            const permanent = e.code === 'permission-denied'
                || (s >= 400 && s < 500 && s !== 408 && s !== 429)
                || (item.tries || 0) >= 50;
            if (permanent) {
                console.warn('⚠️ [CLOUD] Write refused for good, dropped:', item.kind, e.message);
                updateOutbox(list => list.filter(i => i.id !== item.id));
                continue;
            }
            console.warn('⚠️ [CLOUD] Upload failed, kept for later:', e.code, e.message);
            updateOutbox(list => list.map(i => i.id === item.id ? { ...i, tries: (i.tries || 0) + 1 } : i));
            if (item.tries) noticeDelayed(e);   // first failures are reported by the caller
            break;
        }
    }
    if (late) {
        console.log(`✅ [CLOUD] Uploaded ${late} waiting result(s)`);
        dropCache();
        window.__onPendingSavesFlushed?.(late);
        records.forEach(r => window.__onWorldRecord?.(r));
    }
    return late;
}

async function runItem(user, item) {
    switch (item.kind) {
        case 'patch': await cloudRest('', { method: 'PATCH', body: item.data }); return null;
        case 'score': return item.localBest ? writeLocalBest(user, item.entry) : writeScore(user, item.entry);
        case 'speedrun': return writeSpeedrun(user, item.goalKey, item.entry);
        case 'analytics': await cloudRest(`analytics/${user.uid}/${safeKey(item.sid)}`, { method: 'PUT', body: item.data }); return null;
        default: return null;
    }
}

// Queues an item and tries to send it now. Returns its result, or null when it is waiting.
async function sendNow(item) {
    const id = enqueueItem(item);
    try { await flushPendingSaves(); } catch { /* stays queued */ }
    return _results.get(id) || null;
}

// ===== SCORES =====
const runIdOf = (uid, entry) => `${uid}_${entry.clientTimestamp || entry.timestamp || Date.now()}`;

async function writeScore(user, entry) {
    const uid = user.uid;
    const skin = safeKey(entry.skin || 'classic');
    const data = sanitize({ ...entry, userId: uid, timestamp: entry.clientTimestamp || Date.now() });
    const runId = runIdOf(uid, entry);

    const [bestAll, bestSkin, topAll, topSkin] = await Promise.all([
        cloudRest(`lb/overall/${uid}`), cloudRest(`lb/${skin}/${uid}`),
        cloudRest('top/overall', { authed: false }), cloudRest(`top/${skin}`, { authed: false })
    ]);
    const overall = isBetterRun(data, isValidRun(bestAll) ? bestAll : null) ? 'saved' : 'kept';
    const skinRes = isBetterRun(data, isValidRun(bestSkin) ? bestSkin : null) ? 'saved' : 'kept';

    const upd = {
        [`runs/all/${runId}`]: data,
        [`runs/${skin}/${runId}`]: data,
        [`users/${uid}/stats/totalGames`]: { '.sv': { increment: 1 } },
        [`users/${uid}/stats/lastPlayed`]: NOW
    };
    if (overall === 'saved') upd[`lb/overall/${uid}`] = data;
    if (skinRes === 'saved') upd[`lb/${skin}/${uid}`] = data;

    // World record: better than the best run of everyone on that table.
    const holder = { uid, userName: data.userName, level: data.level, score: data.score, skin, at: data.timestamp };
    const worldAll = isBetterRun(data, isValidRun(topAll) ? topAll : null);
    const worldSkin = isBetterRun(data, isValidRun(topSkin) ? topSkin : null);
    const beatenAll = isValidRun(topAll) && topAll.uid !== uid ? topAll : null;
    const beatenSkin = isValidRun(topSkin) && topSkin.uid !== uid ? topSkin : null;
    if (worldAll) upd['top/overall'] = holder;
    if (worldSkin) upd[`top/${skin}`] = holder;

    let world = worldAll ? 'overall' : (worldSkin ? 'skin' : null);
    try {
        await cloudRest('', { method: 'PATCH', body: upd });
    } catch (e) {
        // Someone set a higher record a moment ago: save the run without claiming it.
        if (e.code !== 'permission-denied' || !world) throw e;
        delete upd['top/overall']; delete upd[`top/${skin}`];
        world = null;
        await cloudRest('', { method: 'PATCH', body: upd });
    }
    dropCache();
    if (overall === 'saved') _myBest = data;
    return {
        overall, skin: skinRes, world,
        record: world ? { scope: world, skin, level: data.level, score: data.score,
            beaten: world === 'overall' ? beatenAll : beatenSkin, previous: world === 'overall' ? topAll : topSkin } : null
    };
}

// ===== PERSONAL BESTS CHECK =====
// Every time the account enters the game, this device's personal bests (the local best tables,
// and the game history, which the sign-in sync already merged with the cloud's) are compared
// with the account's entries on the leaderboards. Where a personal best is better, it is added.
// This repairs a leaderboard that missed a run (a guest game, a lost save, an old bug).
// Only lb/ and top/ are written: runs/ and totalGames are not counted twice.

// All personal runs this device knows: top row of each local table + every history game.
async function personalRuns() {
    const runs = [];
    for (const table of localTableNames()) {
        const list = readLocalTable(table);
        if (Array.isArray(list) && list[0]) runs.push({ ...list[0], skin: list[0].skin || (table === 'overall' ? null : table) });
    }
    try {
        const { loadGameHistory } = await import('./game-history.js');
        for (const e of loadGameHistory()) if (e && !e.isDebug) runs.push(e);
    } catch { /* history not readable */ }
    return runs.filter(r => r && r.skin && isValidRun(r));
}

async function checkPersonalBests(user) {
    const uid = user.uid;
    const runs = await personalRuns();
    if (!runs.length) return;
    // Best personal run of each table.
    const best = new Map();
    const take = (table, run) => { if (isBetterRun(run, best.get(table) || null)) best.set(table, run); };
    for (const r of runs) { take('overall', r); take(safeKey(r.skin), r); }

    const tables = [...best.keys()];
    let cloud;
    try { cloud = await Promise.all(tables.map(t => cloudRest(`lb/${t}/${uid}`))); }
    catch (e) { console.warn('⚠️ [BESTS] Leaderboards not reachable, will check next time:', e.code); return; }

    // Runs that beat the account's entry on at least one table (one upload per run).
    const toSend = new Set();
    tables.forEach((t, i) => {
        const mine = isValidRun(cloud[i]) ? cloud[i] : null;
        if (isBetterRun(best.get(t), mine)) toSend.add(best.get(t));
    });
    if (!toSend.size) return;

    const waiting = readOutbox().filter(i => i.kind === 'score' && i.localBest && i.uid === uid)
        .map(i => `${i.entry.skin}|${i.entry.level}|${i.entry.score}`);
    for (const run of toSend) {
        const skin = run.skin || 'classic';
        if (waiting.includes(`${skin}|${run.level}|${run.score}`)) continue;   // already queued, offline
        const named = run.userName && run.userName !== 'Anonymous' ? run.userName : null;
        enqueueItem({ kind: 'score', uid, localBest: true, entry: sanitize({
            userName: named || user.displayName || user.email?.split('@')[0] || 'Anonymous',
            score: run.score, level: run.level, skin,
            date: run.date || null, settings: run.settings || null
        }) });
    }
    console.log(`🏆 [BESTS] ${toSend.size} personal best(s) better than the leaderboard, adding`);
    flushPendingSaves().catch(() => {});
}

// The same check for speedrun times (boss kills, levels, points): the fastest local time of
// each goal is compared with the account's time in the cloud and sent when it is faster.
async function checkSpeedrunBests(user) {
    const uid = user.uid;
    const best = new Map();
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k || !k.startsWith('sr_lb_')) continue;
            let rows = [];
            try { rows = JSON.parse(localStorage.getItem(k) || '[]'); } catch { continue; }
            for (const r of Array.isArray(rows) ? rows : []) {
                if (isValidTime(r) && (!best.has(k.slice(6)) || r.time < best.get(k.slice(6)).time)) best.set(k.slice(6), r);
            }
        }
    } catch { return; }
    if (!best.size) return;
    const goals = [...best.keys()];
    let cloud;
    try { cloud = await Promise.all(goals.map(g => cloudRest(`speedrun/${safeKey(g)}/${uid}`))); }
    catch (e) { console.warn('⚠️ [BESTS] Speedrun times not reachable, will check next time:', e.code); return; }
    const waiting = readOutbox().filter(i => i.kind === 'speedrun' && i.uid === uid).map(i => `${i.goalKey}|${i.entry?.time}`);
    let sent = 0;
    goals.forEach((g, i) => {
        const run = best.get(g);
        if (!isFasterTime(run, isValidTime(cloud[i]) ? cloud[i] : null)) return;
        if (waiting.includes(`${g}|${run.time}`)) return;
        const entry = sanitize({ ...run, clientTimestamp: run.timestamp || Date.now() });
        if (!entry.userName || entry.userName === 'Anonymous') entry.userName = user.displayName || user.email?.split('@')[0] || 'Anonymous';
        enqueueItem({ kind: 'speedrun', uid, goalKey: g, entry });
        sent++;
    });
    if (!sent) return;
    console.log(`⏱️ [BESTS] ${sent} speedrun time(s) faster than the cloud, adding`);
    flushPendingSaves().catch(() => {});
}
// The old "sent once" list is no longer used.
try { localStorage.removeItem('localBestsSent_v1'); } catch { /* storage unavailable */ }

// Writes a stored run to the account's best tables (lb/ and top/), only where it beats them.
async function writeLocalBest(user, entry) {
    const uid = user.uid;
    const skin = safeKey(entry.skin || 'classic');
    const data = sanitize({ ...entry, userId: uid, timestamp: Date.now() });

    const [bestAll, bestSkin, topAll, topSkin] = await Promise.all([
        cloudRest(`lb/overall/${uid}`), cloudRest(`lb/${skin}/${uid}`),
        cloudRest('top/overall', { authed: false }), cloudRest(`top/${skin}`, { authed: false })
    ]);
    const overall = isBetterRun(data, isValidRun(bestAll) ? bestAll : null);
    const skinBest = isBetterRun(data, isValidRun(bestSkin) ? bestSkin : null);
    const worldAll = isBetterRun(data, isValidRun(topAll) ? topAll : null);
    const worldSkin = isBetterRun(data, isValidRun(topSkin) ? topSkin : null);

    const upd = {};
    if (overall) upd[`lb/overall/${uid}`] = data;
    if (skinBest) upd[`lb/${skin}/${uid}`] = data;
    const holder = { uid, userName: data.userName, level: data.level, score: data.score, skin, at: data.timestamp };
    if (worldAll) upd['top/overall'] = holder;
    if (worldSkin) upd[`top/${skin}`] = holder;
    let world = worldAll ? 'overall' : (worldSkin ? 'skin' : null);

    if (Object.keys(upd).length) {
        try {
            await cloudRest('', { method: 'PATCH', body: upd });
        } catch (e) {
            // Someone set a higher record a moment ago: keep the best-table entries, drop the record.
            if (e.code !== 'permission-denied' || !world) throw e;
            delete upd['top/overall']; delete upd[`top/${skin}`];
            world = null;
            if (Object.keys(upd).length) await cloudRest('', { method: 'PATCH', body: upd });
        }
        dropCache();
    }
    if (overall) _myBest = data;
    const beatenAll = isValidRun(topAll) && topAll.uid !== uid ? topAll : null;
    const beatenSkin = isValidRun(topSkin) && topSkin.uid !== uid ? topSkin : null;
    return {
        overall: overall ? 'saved' : 'kept', skin: skinBest ? 'saved' : 'kept', world,
        record: world ? { scope: world, skin, level: data.level, score: data.score,
            beaten: world === 'overall' ? beatenAll : beatenSkin, previous: world === 'overall' ? topAll : topSkin } : null
    };
}

// Returns { ok, reason?, overall?, skin?, world?, queued? }
//   ok:true            → the cloud tables are up to date ('saved' = new record, 'kept' = old record is better)
//   world              → 'overall' / 'skin' when the run is a world record
//   reason:'guest'     → not signed in; the result only exists on this device
//   reason:'error'     → could not be sent now; it waits on this device and is uploaded automatically
export async function saveScoreToCloud(skinKey, score, level, userName, settings = null) {
    if (!initCloud()) return { ok: false, reason: 'error', queued: false };
    const user = auth.currentUser;
    if (!user) return { ok: false, reason: 'guest' };

    const named = userName && userName !== 'Anonymous' ? userName : null;
    const entry = sanitize({
        userName: named || user.displayName || user.email?.split('@')[0] || 'Anonymous',
        score, level,
        skin: skinKey,
        coins: parseInt(getCookie('playerCoins') || '0'),
        date: new Date().toLocaleDateString('he-IL'),
        clientTimestamp: Date.now(),
        settings: settings || null
    });
    const result = await sendNow({ kind: 'score', uid: user.uid, entry });
    if (result) return { ok: true, ...result };
    noticeDelayed({ code: _lastErrorCode() });
    return { ok: false, reason: 'error', queued: true };
}
const _lastErrorCode = () => navigator.onLine === false ? 'unavailable' : 'unavailable';

// A player who changes their display name stays ONE player on every table.
export async function renameInLeaderboards(newName) {
    const user = auth?.currentUser;
    if (!initCloud() || !user || !newName) return;
    const uid = user.uid;
    try {
        const [lbTables, goals, money, runTables, spRunGoals] = await Promise.all([
            cloudRest('lb', { query: { shallow: true }, authed: false }),
            cloudRest('speedrun', { query: { shallow: true }, authed: false }),
            cloudRest(`money/${uid}`, { query: { shallow: true }, authed: false }),
            cloudRest('runs', { query: { shallow: true }, authed: false }),
            cloudRest('speedrunRuns', { query: { shallow: true }, authed: false })
        ]);
        const paths = [...Object.keys(lbTables || {}).map(t => `lb/${t}/${uid}`), ...Object.keys(goals || {}).map(g => `speedrun/${g}/${uid}`)];
        const exists = await Promise.all(paths.map(p => cloudRest(p, { query: { shallow: true }, authed: false }).catch(() => null)));
        const upd = {};
        paths.forEach((p, i) => { if (exists[i]) upd[`${p}/userName`] = newName; });
        // Every past run (runs/ and speedrunRuns/) also carries the name; the leaderboard merges
        // them with lb/, so a stale name there would still show the old name.
        const mine = (p) => cloudRest(p, { query: { orderBy: '"userId"', equalTo: JSON.stringify(uid) }, authed: false }).catch(() => null);
        const groups = [...Object.keys(runTables || {}).map(t => `runs/${t}`), ...Object.keys(spRunGoals || {}).map(g => `speedrunRuns/${g}`)];
        const found = await Promise.all(groups.map(mine));
        groups.forEach((g, i) => Object.keys(found[i] || {}).forEach(id => { upd[`${g}/${id}/userName`] = newName; }));
        if (money) upd[`money/${uid}/userName`] = newName;
        if (Object.keys(upd).length) enqueuePatch(uid, upd, 0);
    } catch (e) { console.warn('⚠️ [CLOUD] Rename failed:', e.code || e); }
}

// ===== LEADERBOARDS =====
// Old 'dragon' rows were renamed to 'baby_dragon' when the data moved here, so 'dragon'
// is free for the real Dragon ship.
const tablesFor = (skinKey) => [skinKey];
const rowsOf = (obj) => Object.entries(obj || {}).map(([id, v]) => ({ id, ...v }));

export async function getLeaderboardFromCloud(skinKey = 'overall') {
    try {
        const best = skinKey === 'overall' ? ['overall'] : tablesFor(skinKey);
        const runs = skinKey === 'overall' ? ['all'] : tablesFor(skinKey);
        const parts = await Promise.all([
            ...best.map(t => cachedGet(`lb/${safeKey(t)}`)),
            // Every run carries the settings used by the filters (device, language, upgrades…),
            // so a filtered view can show each player's best MATCHING run.
            ...runs.map(t => cachedGet(`runs/${safeKey(t)}`, { orderBy: '"level"', limitToLast: 1500 }).catch(() => null))
        ]);
        return parts.flatMap(rowsOf)
            .filter(isValidRun)
            .sort((a, b) => ((b.level || 0) - (a.level || 0)) || ((b.score || 0) - (a.score || 0)))
            .slice(0, 2000);
    } catch (error) {
        console.error('❌ [CLOUD] Error fetching leaderboard:', error);
        return [];
    }
}

let _myBest;    // undefined = not read yet
export async function getUserPersonalBest() {
    const user = auth?.currentUser;
    if (!initCloud() || !user) return null;
    if (_myBest !== undefined) return _myBest;
    try { _myBest = await cloudRest(`lb/overall/${user.uid}`); return _myBest; }
    catch { return null; }
}

export async function getMoneyLeaderboard() {
    try {
        return rowsOf(await cachedGet('money'))
            .filter(r => Number.isFinite(Number(r.coins)))
            .sort((a, b) => b.coins - a.coins)
            .slice(0, 10);
    } catch (e) {
        console.error('❌ [CLOUD] Error fetching money leaderboard:', e);
        return [];
    }
}

// ===== SPEEDRUN =====
async function writeSpeedrun(user, goalKey, entry) {
    const uid = user.uid, goal = safeKey(goalKey);
    const data = sanitize({ ...entry, userId: uid, updatedAt: Date.now() });
    const best = await cloudRest(`speedrun/${goal}/${uid}`);
    const result = isFasterTime(data, isValidTime(best) ? best : null) ? 'saved' : 'kept';
    const upd = { [`speedrunRuns/${goal}/${runIdOf(uid, entry)}`]: data };
    if (result === 'saved') upd[`speedrun/${goal}/${uid}`] = data;
    await cloudRest('', { method: 'PATCH', body: upd });
    dropCache();
    return { result };
}

export async function saveSpeedrunToCloud(goalKey, entry) {
    if (!initCloud()) return { ok: false, reason: 'error', queued: false };
    const user = auth.currentUser;
    if (!user) return { ok: false, reason: 'guest' };
    const cleanEntry = sanitize(entry);
    if (!cleanEntry.userName || cleanEntry.userName === 'Anonymous') {
        cleanEntry.userName = user.displayName || user.email?.split('@')[0] || 'Anonymous';
    }
    cleanEntry.clientTimestamp = cleanEntry.clientTimestamp || cleanEntry.timestamp || Date.now();
    const r = await sendNow({ kind: 'speedrun', uid: user.uid, goalKey, entry: cleanEntry });
    return r ? { ok: true, result: r.result } : { ok: false, reason: 'error', queued: true };
}

export async function getSpeedrunLeaderboardFromCloud(goalKey) {
    try {
        const goal = safeKey(goalKey);
        const [best, runs] = await Promise.all([
            cachedGet(`speedrun/${goal}`),
            cachedGet(`speedrunRuns/${goal}`, { orderBy: '"time"', limitToFirst: 1500 }).catch(() => null)
        ]);
        // All valid runs; the screen keeps each player's best one AFTER filtering.
        return [...rowsOf(best), ...rowsOf(runs)].filter(isValidTime).sort((a, b) => a.time - b.time);
    } catch (e) {
        console.error('❌ [CLOUD] Error fetching speedrun leaderboard:', e);
        return [];
    }
}

// ===== PROFILE WRITES (queued, merged, sent a few seconds later) =====
function profileWrite(fields, delay) {
    const user = auth?.currentUser;
    if (!initCloud() || !user) return false;
    const upd = {};
    for (const [k, v] of Object.entries(fields)) upd[`users/${user.uid}/${k}`] = v;
    enqueuePatch(user.uid, upd, delay);
    return true;
}
function moneyRow(user, coins) {
    return {
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        coins,
        lastUpdated: NOW
    };
}
function writeCoins(amount) {
    const user = auth?.currentUser;
    if (!initCloud() || !user) return;
    enqueuePatch(user.uid, { [`users/${user.uid}/coins`]: amount, [`money/${user.uid}`]: moneyRow(user, amount) });
}

// Unlocks never wait long: they are added key by key, so two devices can never undo each other.
export async function unlockSkinInCloud(skinKey) {
    const user = auth?.currentUser;
    if (!initCloud() || !user) return false;
    const upd = {};
    for (const s of [...DEFAULT_SKINS, skinKey]) upd[`users/${user.uid}/skins/${safeKey(s)}`] = true;
    enqueuePatch(user.uid, upd, 1500);
    return true;
}
export async function syncUnlockedSkins() { return readLocalSkins(); }   // the sign-in sync merges with the cloud
export async function syncMaxLevel() {
    const level = parseInt(getCookie('maxLevel') || '1');
    profileWrite({ maxLevel: level });
    return level;
}
export async function forceSetCoins(amount) { writeCoins(amount); }
export async function syncCoins(localCoins) { writeCoins(localCoins); return localCoins; }
export async function pushShopState(hpLevels, disabledUpgrades) { profileWrite({ hpLevels, disabledUpgrades }); }
export async function pushScoreLevel(scoreLevel) { profileWrite({ scoreLevel }); }
export async function pushCooldownLevel(cooldownLevel) { profileWrite({ cooldownLevel }); }
export async function pushDurationLevels(durationLevels) { profileWrite({ durationLevels }); }
export async function syncUpgrades(localUpgrades) { profileWrite({ ownedUpgrades: localUpgrades }); setCookie('ownedUpgrades', JSON.stringify(localUpgrades)); return localUpgrades; }
export async function syncAchievements(list = []) {
    profileWrite(Object.fromEntries(list.map(a => [`achievements/${safeKey(a)}`, true])));
    return list;
}
// Game history: one row per game under users/{uid}/history/{timestamp}. Replays stay on the device.
export async function saveHistoryEntryToCloud(entry) {
    if (!entry || !entry.timestamp || entry.isDebug) return false;
    const { historyRowForCloud } = await import('./game-history.js');
    return profileWrite({ [`history/${entry.timestamp}`]: historyRowForCloud(entry) });
}
export async function syncKeyBindings(b = {}) { profileWrite({ keyBindings: b }); return b; }
export async function syncGameRules(r = {}) { profileWrite({ gameRules: r }); return r; }
export async function syncDeviceMode(d = {}) { profileWrite({ deviceMode: d }); return d; }
export async function syncCustomSpeedrunGoals(g = []) { profileWrite({ customSpeedrunGoals: g }); return g; }

// The shop reads its state from cookies, which the sign-in sync already filled.
// Waits for that sync once (the game start uses this), costs nothing afterwards.
export async function pullShopState() {
    if (_signInSync) await _signInSync.catch(() => {});
    return {
        owned: readJSONCookie('ownedUpgrades', []),
        disabled: readJSONCookie('disabledUpgrades', []),
        hp: readJSONCookie('hpLevels', {})
    };
}

// ===== SIGN-IN SYNC: one read of the profile, one merged write =====
let _signInSync = null;
export function syncAllData() {
    _signInSync = doSignInSync();
    return _signInSync;
}
async function doSignInSync() {
    const user = auth?.currentUser;
    if (!user) return;
    const uid = user.uid;
    // Local changes that are still waiting go up first, so the merge below sees them.
    await flushPendingSaves().catch(() => {});

    let cloud;
    try { cloud = (await cloudRest(`users/${uid}`)) || {}; }
    catch (e) { console.warn('⚠️ [SYNC] Profile not reachable, playing with local data:', e.code); return; }

    // A profile the Realtime Database has never seen may still exist in the old Firestore
    // (an old version of the game wrote it). Read it once and merge it in.
    let legacyChecked = !!cloud.fsChecked;
    if (!legacyChecked) {
        try {
            const { readLegacyProfile } = await import('./legacy-firestore.js');
            const old = await readLegacyProfile(uid);
            cloud = mergeLegacy(cloud, old);
            legacyChecked = true;
        } catch (e) { console.warn('⚠️ [SYNC] Old profile not readable now, will retry next sign-in:', e.code || e); }
    }

    const local = {
        skins: readLocalSkins(),
        maxLevel: parseInt(getCookie('maxLevel') || '1'),
        coins: parseInt(getCookie('playerCoins') || '0'),
        ownedUpgrades: readJSONCookie('ownedUpgrades', []),
        disabledUpgrades: getCookie('disabledUpgrades') ? readJSONCookie('disabledUpgrades', []) : undefined,
        hpLevels: getCookie('hpLevels') ? readJSONCookie('hpLevels', {}) : undefined,
        achievements: (() => { try { return JSON.parse(localStorage.getItem('achievements_v1') || '[]'); } catch { return []; } })(),
        keyBindings: readJSONCookie('keyBindings', {}),
        gameRules: readJSONCookie('gameRules', {}),
        deviceMode: readJSONCookie('deviceMode', {}),
        customSpeedrunGoals: readJSONCookie('customSpeedrunGoals', [])
    };

    // Old score upgrades (double_score ... score_x10) are folded into scoreLevel and removed from the list.
    // Old cooldown upgrades (vortex_cooldown_half, cooldown_x3, cooldown_x4) are folded into cooldownLevel the same way.
    const ownedRaw = [...new Set([...asList(cloud.ownedUpgrades), ...local.ownedUpgrades])];
    const goalMap = new Map();
    [...asList(cloud.customSpeedrunGoals), ...local.customSpeedrunGoals].forEach(g => g?.key && goalMap.set(g.key, g));
    const merged = {
        skins: normalizeSkins([...DEFAULT_SKINS, ...asKeys(cloud.skins), ...asList(cloud.unlockedSkins), ...local.skins]),
        maxLevel: Math.max(Number(cloud.maxLevel) || 1, local.maxLevel),
        coins: Math.max(Number(cloud.coins) || 0, local.coins),
        ownedUpgrades: stripLegacyDuration(stripLegacyCooldown(stripLegacyScore(ownedRaw))),
        disabledUpgrades: stripLegacyDuration(stripLegacyCooldown(stripLegacyScore(cloud.disabledUpgrades !== undefined ? asList(cloud.disabledUpgrades) : (local.disabledUpgrades || [])))),
        scoreLevel: Math.max(clampScoreLevel(cloud.scoreLevel), clampScoreLevel(getCookie('scoreLevel')), legacyScoreLevel(ownedRaw)),
        cooldownLevel: Math.max(clampCooldownLevel(cloud.cooldownLevel), clampCooldownLevel(getCookie('cooldownLevel')), legacyCooldownLevel(ownedRaw)),
        durationLevels: mergeDurationLevels(cloud.durationLevels, getCookie('durationLevels'), legacyDurationLevels(ownedRaw)),
        hpLevels: renameDragonKey((cloud.hpLevels && typeof cloud.hpLevels === 'object') ? cloud.hpLevels : (local.hpLevels || {})),
        achievements: [...new Set([...asKeys(cloud.achievements), ...asList(cloud.achievementsList), ...local.achievements])],
        keyBindings: { ...(cloud.keyBindings || {}), ...local.keyBindings },
        gameRules: { ...local.gameRules, ...(cloud.gameRules || {}) },
        deviceMode: { ...local.deviceMode, ...(cloud.deviceMode || {}) },
        customSpeedrunGoals: [...goalMap.values()]
    };

    // Local copies
    setCookie('unlockedSkins', JSON.stringify(merged.skins));
    setCookie('maxLevel', String(merged.maxLevel));
    setCookie('playerCoins', String(merged.coins));
    setCookie('ownedUpgrades', JSON.stringify(merged.ownedUpgrades));
    setCookie('disabledUpgrades', JSON.stringify(merged.disabledUpgrades));
    setCookie('hpLevels', JSON.stringify(merged.hpLevels));
    setCookie('scoreLevel', String(merged.scoreLevel));
    setCookie('cooldownLevel', String(merged.cooldownLevel));
    setCookie('durationLevels', JSON.stringify(merged.durationLevels));
    setCookie('keyBindings', JSON.stringify(merged.keyBindings));
    setCookie('gameRules', JSON.stringify(merged.gameRules));
    setCookie('deviceMode', JSON.stringify(merged.deviceMode));
    setCookie('customSpeedrunGoals', JSON.stringify(merged.customSpeedrunGoals));
    try { localStorage.setItem('achievements_v1', JSON.stringify(merged.achievements)); } catch { /* full */ }
    const coinsEl = document.getElementById('coins');
    if (coinsEl) coinsEl.innerText = merged.coins;
    window.__onUnlockedSkinsSynced?.(merged.skins);
    window.__onKeyBindingsSynced?.(merged.keyBindings);

    // One write, only for what actually differs from the cloud.
    const want = {
        skins: Object.fromEntries(merged.skins.map(s => [safeKey(s), true])),
        maxLevel: merged.maxLevel,
        coins: merged.coins,
        ownedUpgrades: merged.ownedUpgrades,
        disabledUpgrades: merged.disabledUpgrades,
        hpLevels: merged.hpLevels,
        scoreLevel: merged.scoreLevel || null,
        cooldownLevel: merged.cooldownLevel || null,
        durationLevels: Object.values(merged.durationLevels).some(v => v > 0) ? merged.durationLevels : null,
        achievements: Object.fromEntries(merged.achievements.map(a => [safeKey(a), true])),
        keyBindings: merged.keyBindings,
        gameRules: merged.gameRules,
        deviceMode: merged.deviceMode,
        customSpeedrunGoals: merged.customSpeedrunGoals,
        email: (user.email || '').toLowerCase() || null
    };
    const upd = {};
    const same = (a, b) => JSON.stringify(sanitize(a ?? null)) === JSON.stringify(sanitize(b ?? null));
    for (const [k, v] of Object.entries(want)) {
        const cur = k === 'ownedUpgrades' || k === 'disabledUpgrades' || k === 'customSpeedrunGoals' ? asList(cloud[k]) : cloud[k];
        const empty = v == null || (typeof v === 'object' && !Object.keys(v).length);
        if (!same(cur, v) && !(empty && cur == null)) upd[`users/${uid}/${k}`] = v;
    }
    // Game history: the cloud's games join this device's list, the device's games go up,
    // and the cloud keeps the same newest games as the device.
    try {
        const { mergeCloudHistory, historyRowForCloud } = await import('./game-history.js');
        const cloudHist = (cloud.history && typeof cloud.history === 'object') ? cloud.history : {};
        const list = mergeCloudHistory(Object.values(cloudHist)).filter(e => e && e.timestamp && !e.isDebug);
        const keep = new Set(list.map(e => String(e.timestamp)));
        for (const e of list) {
            if (!cloudHist[String(e.timestamp)]) upd[`users/${uid}/history/${e.timestamp}`] = historyRowForCloud(e);
        }
        for (const k of Object.keys(cloudHist)) if (!keep.has(k)) upd[`users/${uid}/history/${k}`] = null;
        window.__onHistorySynced?.();
    } catch (e) { console.warn('⚠️ [SYNC] History not merged:', e); }

    if (legacyChecked && !cloud.fsChecked) upd[`users/${uid}/fsChecked`] = true;
    // Friends can send coins to this account by e-mail.
    if (user.email && cloud.email !== user.email.toLowerCase()) upd[`emails/${emailKey(user.email)}`] = uid;
    // The account's name must be its own; if another player took it first, ask for a new one.
    if (user.displayName && cloud.name !== user.displayName) {
        claimName(user.displayName).then(r => { if (r === 'taken') window.__onNameTaken?.(); }).catch(() => {});
    }
    if (cloud.coins !== merged.coins) upd[`money/${uid}`] = moneyRow(user, merged.coins);
    if (Object.keys(upd).length) enqueuePatch(uid, upd, 0);
    console.log(`✅ [SYNC] Profile synced (${Object.keys(upd).length} field(s) uploaded)`);

    claimPendingTransfers().then(result => {
        if (result.total > 0) {
            if (coinsEl) coinsEl.innerText = parseInt(getCookie('playerCoins') || '0');
            window.__onCoinTransfersClaimed?.(result);
        }
    }).catch(() => {});
}

// Fields of an old Firestore profile, merged as if the cloud had them.
function mergeLegacy(cloud, old) {
    if (!old || !Object.keys(old).length) return cloud;
    const out = { ...cloud };
    out.skins = { ...(cloud.skins || {}), ...Object.fromEntries(normalizeSkins(old.unlockedSkins || []).map(s => [safeKey(s), true])) };
    out.maxLevel = Math.max(Number(cloud.maxLevel) || 1, Number(old.maxLevel) || 1);
    out.coins = Math.max(Number(cloud.coins) || 0, Number(old.coins) || 0);
    out.ownedUpgrades = [...new Set([...asList(cloud.ownedUpgrades), ...(old.ownedUpgrades || [])])];
    if (out.disabledUpgrades === undefined && Array.isArray(old.disabledUpgrades)) out.disabledUpgrades = old.disabledUpgrades;
    if (out.hpLevels === undefined && old.hpLevels) out.hpLevels = old.hpLevels;
    out.achievements = { ...(cloud.achievements || {}), ...Object.fromEntries((old.achievements || []).map(a => [safeKey(a), true])) };
    out.keyBindings = { ...(old.keyBindings || {}), ...(cloud.keyBindings || {}) };
    out.gameRules = { ...(old.gameRules || {}), ...(cloud.gameRules || {}) };
    out.deviceMode = { ...(old.deviceMode || {}), ...(cloud.deviceMode || {}) };
    out.customSpeedrunGoals = [...asList(cloud.customSpeedrunGoals), ...(old.customSpeedrunGoals || [])];
    return out;
}

// ===== UNIQUE USERNAMES =====
// names/{nameKey} = uid. The first account to take a name owns it; the rules refuse
// anyone else, so two players can never share a name (case and spaces do not matter).
export const nameKey = (name) => safeKey(String(name || '').trim().toLowerCase().replace(/\s+/g, ' '));

// 'free' | 'mine' | 'taken'  (throws when the server cannot be reached)
export async function checkName(name) {
    const owner = await cloudRest(`names/${nameKey(name)}`, { authed: false });
    if (!owner) return 'free';
    return owner === auth?.currentUser?.uid ? 'mine' : 'taken';
}

// Takes `newName` for the signed-in account and frees `oldName`.
// Returns 'ok' | 'taken' | 'error'. Needs a connection (it is never queued).
export async function claimName(newName, oldName = null) {
    const user = auth?.currentUser;
    if (!initCloud() || !user || !String(newName || '').trim()) return 'error';
    const key = nameKey(newName);
    try {
        const owner = await cloudRest(`names/${key}`, { authed: false });
        if (owner && owner !== user.uid) return 'taken';
        if (!owner) await cloudRest(`names/${key}`, { method: 'PUT', body: user.uid });
    } catch (e) {
        return e.code === 'permission-denied' ? 'taken' : 'error';
    }
    if (oldName && nameKey(oldName) !== key) {
        cloudRest(`names/${nameKey(oldName)}`).then(o => o === user.uid
            ? cloudRest(`names/${nameKey(oldName)}`, { method: 'DELETE' }) : null).catch(() => {});
    }
    enqueuePatch(user.uid, { [`users/${user.uid}/name`]: String(newName).trim() }, 2000);
    return 'ok';
}

// ===== COIN TRANSFERS BETWEEN FRIENDS =====
// The friend is found by username or by e-mail. Coins wait under the friend's account
// (transfers/{uid}); an e-mail nobody has signed in with yet waits under the address
// (transfersByEmail/{emailKey}) until that player signs in.
async function resolveRecipient(target) {
    const t = String(target || '').trim();
    if (t.includes('@')) {
        const ek = emailKey(t);
        const uid = await cloudRest(`emails/${ek}`);
        return uid ? { path: `transfers/${uid}`, uid } : { path: `transfersByEmail/${ek}`, email: t.toLowerCase() };
    }
    const uid = await cloudRest(`names/${nameKey(t)}`, { authed: false });
    return uid ? { path: `transfers/${uid}`, uid } : null;
}

export async function sendCoinsToFriend(target, amount) {
    const user = auth?.currentUser;
    if (!initCloud()) return { success: false, error: 'not_connected' };
    if (!user) return { success: false, error: 'not_logged_in' };
    const normalized = String(target || '').trim().toLowerCase();
    if (normalized === (user.email || '').toLowerCase()) return { success: false, error: 'self_transfer' };
    const localCoins = parseInt(getCookie('playerCoins') || '0');
    if (amount <= 0 || amount > localCoins) return { success: false, error: 'insufficient_coins' };

    try {
        const to = await resolveRecipient(normalized);
        if (!to) return { success: false, error: 'no_user' };
        if (to.uid === user.uid) return { success: false, error: 'self_transfer' };
        // Sent right away (not queued): the coins only leave this player once the server has them.
        await cloudRest(`${to.path}/${newId()}`, { method: 'PUT', body: {
            fromUid: user.uid,
            fromEmail: (user.email || '').toLowerCase(),
            fromName: user.displayName || (user.email || '').split('@')[0],
            amount,
            timestamp: NOW
        } });
        const newTotal = localCoins - amount;
        setCookie('playerCoins', newTotal.toString());
        writeCoins(newTotal);
        return { success: true, newTotal };
    } catch (e) {
        console.error('❌ [TRANSFER] Send failed:', e);
        return { success: false, error: 'server_error' };
    }
}

export async function claimPendingTransfers() {
    const user = auth?.currentUser;
    if (!initCloud() || !user) return { total: 0, transfers: [] };
    try {
        const places = [`transfers/${user.uid}`, ...(user.email ? [`transfersByEmail/${emailKey(user.email)}`] : [])];
        const found = await Promise.all(places.map(p => cloudRest(p).catch(() => null)));
        let total = 0;
        const transfers = [];
        for (let i = 0; i < places.length; i++) {
            for (const [id, tr] of Object.entries(found[i] || {})) {
                if (!(Number(tr?.amount) > 0)) continue;
                // Removed before the coins are added, so a second device can never claim it again.
                await cloudRest(`${places[i]}/${id}`, { method: 'DELETE' });
                total += Number(tr.amount);
                transfers.push({ amount: Number(tr.amount), fromName: tr.fromName || tr.fromEmail });
            }
        }
        if (total > 0) {
            const newTotal = parseInt(getCookie('playerCoins') || '0') + total;
            setCookie('playerCoins', newTotal.toString());
            writeCoins(newTotal);
        }
        return { total, transfers };
    } catch (e) {
        console.error('❌ [TRANSFER] Claim failed:', e);
        return { total: 0, transfers: [] };
    }
}

// ===== GAME ANALYTICS (one small summary per game) =====
export function saveAnalyticsSummary(sid, summary) {
    if (!initCloud()) return;
    const user = auth.currentUser;
    const data = sanitize({ ...summary, savedAt: Date.now() });
    if (user) { enqueueItem({ kind: 'analytics', uid: user.uid, sid, data }); scheduleFlush(3000); }
    else cloudRest(`analytics/anonymous/${safeKey(sid)}`, { method: 'PUT', body: data, authed: false }).catch(() => {});
}

// ===== DELETE ALL CLOUD DATA OF ONE ACCOUNT =====
export async function deleteCloudDataForUser(uid) {
    initCloud();
    const { SKINS, SPEEDRUN_GOALS, getCustomSpeedrunGoals } = await import('./data.js');
    let failed = 0;
    updateOutbox(list => list.filter(i => i.uid !== uid));   // nothing of this account may be uploaded later
    try {
        const shallow = (p) => cloudRest(p, { query: { shallow: true }, authed: false }).catch(() => null);
        const [lb, runs, sp, spRuns, top] = await Promise.all([shallow('lb'), shallow('runs'), shallow('speedrun'), shallow('speedrunRuns'), cloudRest('top', { authed: false }).catch(() => null)]);
        const upd = { [`users/${uid}`]: null, [`money/${uid}`]: null, [`analytics/${uid}`]: null, [`transfers/${uid}`]: null };
        const me = auth.currentUser;
        if (me?.email) upd[`emails/${emailKey(me.email)}`] = null;
        if (me?.displayName && (await cloudRest(`names/${nameKey(me.displayName)}`, { authed: false }).catch(() => null)) === uid) {
            upd[`names/${nameKey(me.displayName)}`] = null;   // the name is free again
        }
        Object.keys(lb || {}).forEach(t => { upd[`lb/${t}/${uid}`] = null; });
        Object.keys(sp || {}).forEach(g => { upd[`speedrun/${g}/${uid}`] = null; });
        const mine = (p) => cloudRest(p, { query: { orderBy: '"userId"', equalTo: JSON.stringify(uid) }, authed: false }).catch(() => { failed++; return null; });
        for (const t of Object.keys(runs || {})) Object.keys((await mine(`runs/${t}`)) || {}).forEach(id => { upd[`runs/${t}/${id}`] = null; });
        for (const g of Object.keys(spRuns || {})) Object.keys((await mine(`speedrunRuns/${g}`)) || {}).forEach(id => { upd[`speedrunRuns/${g}/${id}`] = null; });
        const heldTops = Object.entries(top || {}).filter(([, v]) => v?.uid === uid).map(([t]) => t);
        heldTops.forEach(t => { upd[`top/${t}`] = null; });
        await cloudRest('', { method: 'PATCH', body: upd });
        // The next best player of each table becomes the record holder again.
        for (const t of heldTops) {
            const rows = rowsOf(await cloudRest(`lb/${t}`, { authed: false }).catch(() => null)).filter(isValidRun);
            const best = rows.reduce((b, r) => (isBetterRun(r, b) ? r : b), null);
            if (best) await cloudRest(`top/${t}`, { method: 'PUT', body: { uid: best.userId || best.id, userName: best.userName || null, level: best.level, score: best.score, skin: best.skin || t, at: best.timestamp || Date.now() } }).catch(() => {});
        }
    } catch (e) { failed++; console.warn('⚠️ [DELETE] Cloud delete failed:', e.code || e); }

    // The old Firestore archive
    try {
        const { deleteLegacyData } = await import('./legacy-firestore.js');
        const goalKeys = [...SPEEDRUN_GOALS, ...getCustomSpeedrunGoals()].map(g => g.key);
        failed += (await deleteLegacyData(uid, [...Object.keys(SKINS), 'dragon'], goalKeys)).failed;
    } catch (e) { failed++; }
    return { failed };
}

// ===== ONE-TIME LOCAL RENAME: 'dragon' → 'baby_dragon' =====
// Runs saved on this device before the rename still say 'dragon'; the cloud copy was
// renamed when the data moved, this renames the local copies (history, local tables).
// Per-ship maps (HP upgrade levels) keyed 'dragon' move to 'baby_dragon', keeping the higher value.
function renameDragonKey(map) {
    if (!map || typeof map !== 'object' || map.dragon === undefined) return map;
    const out = { ...map };
    out.baby_dragon = Math.max(Number(out.baby_dragon) || 0, Number(out.dragon) || 0);
    delete out.dragon;
    return out;
}

function renameLocalDragon() {
    const FLAG = 'dragonRenamed_v1';
    try { if (localStorage.getItem(FLAG)) return; } catch { return; }
    const fixRow = (r) => { if (r && r.skin === 'dragon') { r.skin = 'baby_dragon'; if (r.skinName) r.skinName = 'Baby Dragon'; } return r; };
    const fixKey = (key) => {
        try {
            const list = JSON.parse(localStorage.getItem(key) || 'null');
            if (Array.isArray(list)) localStorage.setItem(key, JSON.stringify(list.map(fixRow)));
        } catch { /* leave as is */ }
    };
    try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
        keys.filter(k => k === 'gameHistory' || k === 'gameHistory_v2' || k?.startsWith('sr_lb_')).forEach(fixKey);
        const fixCookie = (name, target = name) => {
            const v = readJSONCookie(name, null);
            if (!Array.isArray(v)) return;
            const merged = [...(target !== name ? readJSONCookie(target, []) : []), ...v.map(fixRow)];
            setCookie(target, JSON.stringify(merged));
            if (target !== name) document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        };
        fixCookie('leaderboard_overall');
        fixCookie('leaderboard_dragon', 'leaderboard_baby_dragon');
        const hp = readJSONCookie('hpLevels', null);
        if (hp && hp.dragon !== undefined) setCookie('hpLevels', JSON.stringify(renameDragonKey(hp)));
        localStorage.setItem(FLAG, '1');
    } catch (e) { console.warn('⚠️ [LOCAL] Dragon rename failed:', e); }
}
if (typeof window !== 'undefined') renameLocalDragon();

// ===== START =====
export function initFirestoreSync() { return initCloudSync(); }   // old name
export function initCloudSync() {
    if (!initCloud()) return;
    auth.onAuthStateChanged(async (user) => {
        _myBest = undefined;
        if (!user) return;
        // Progress from another account on this device must not reach this one
        if (claimLocalProgress(user.uid)) { window.location.reload(); return; }
        await syncAllData();
        checkPersonalBests(user).catch(e => console.warn('⚠️ [BESTS] Check failed:', e));
        checkSpeedrunBests(user).catch(e => console.warn('⚠️ [BESTS] Speedrun check failed:', e));
    });
}

if (typeof window !== 'undefined') {
    window.addEventListener('online', () => { flushPendingSaves().catch(() => {}); });
    // Waiting uploads are retried every 2 minutes. Nothing is sent when nothing waits.
    setInterval(() => { if (readOutbox().length) flushPendingSaves().catch(() => {}); }, 120000);
    // Leaving the page: send what is waiting (best effort).
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && readOutbox().length) flushPendingSaves().catch(() => {});
    });
}

export { auth };
