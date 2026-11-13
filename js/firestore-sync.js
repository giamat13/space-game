// ===== FIRESTORE SYNC SYSTEM =====
// Syncs scores and max level across devices
// Uses Firestore for cloud storage + Cookies for local cache

import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc,
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    addDoc,
    deleteDoc,
    updateDoc,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// ===== USE EXISTING FIREBASE APP =====
// We use the existing Firebase app initialized in auth.js
let db, auth;

function initializeFirestoreSync() {
    try {
        const app = getApp(); // Get the default app initialized in auth.js
        db = getFirestore(app);
        auth = getAuth(app);
        console.log('✅ [FIRESTORE] Connected to existing Firebase app');
        return true;
    } catch (error) {
        console.error('❌ [FIRESTORE] Error connecting to Firebase:', error);
        return false;
    }
}

// ===== HELPER FUNCTIONS =====
function setCookie(name, value, days = 365) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) {
            return c.substring(nameEQ.length, c.length);
        }
    }
    return null;
}

// ===== SYNC UNLOCKED SKINS =====
export async function syncUnlockedSkins() {
    if (!auth) {
        console.error('❌ [SYNC] Auth not initialized');
        return JSON.parse(getCookie('unlockedSkins') || '["classic", "interceptor", "tanker"]');
    }

    const user = auth.currentUser;
    if (!user) {
        console.log('⚠️ [SYNC] Not logged in, using local skins only');
        return JSON.parse(getCookie('unlockedSkins') || '["classic", "interceptor", "tanker"]');
    }

    try {
        console.log('🔄 [SYNC] Syncing unlocked skins...');
        
        // Read from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
            const cloudSkins = userDoc.data().unlockedSkins || ['classic', 'interceptor', 'tanker'];
            const localSkins = JSON.parse(getCookie('unlockedSkins') || '["classic", "interceptor", "tanker"]');
            
            // Merge - any skin in either source
            const mergedSkins = [...new Set([...cloudSkins, ...localSkins])];
            
            // Update in cloud and cookies
            await setDoc(doc(db, 'users', user.uid), {
                unlockedSkins: mergedSkins,
                lastUpdated: serverTimestamp()
            }, { merge: true });
            
            setCookie('unlockedSkins', JSON.stringify(mergedSkins));
            console.log('✅ [SYNC] Skins synced:', mergedSkins);
            return mergedSkins;
        } else {
            // No document - create new
            const localSkins = JSON.parse(getCookie('unlockedSkins') || '["classic", "interceptor", "tanker"]');
            await setDoc(doc(db, 'users', user.uid), {
                unlockedSkins: localSkins,
                lastUpdated: serverTimestamp()
            });
            console.log('✅ [SYNC] Created new user document');
            return localSkins;
        }
    } catch (error) {
        console.error('❌ [SYNC] Error syncing skins:', error);
        return JSON.parse(getCookie('unlockedSkins') || '["classic", "interceptor", "tanker"]');
    }
}

// ===== SYNC MAX LEVEL =====
export async function syncMaxLevel() {
    if (!auth) {
        console.error('❌ [SYNC] Auth not initialized');
        return parseInt(getCookie('maxLevel') || '1');
    }

    const user = auth.currentUser;
    if (!user) {
        console.log('⚠️ [SYNC] Not logged in, using local max level only');
        return parseInt(getCookie('maxLevel') || '1');
    }

    try {
        console.log('🔄 [SYNC] Syncing max level...');
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
            const cloudMaxLevel = userDoc.data().maxLevel || 1;
            const localMaxLevel = parseInt(getCookie('maxLevel') || '1');
            
            // Use the higher of the two
            const maxLevel = Math.max(cloudMaxLevel, localMaxLevel);
            
            // Update in cloud and cookies
            await setDoc(doc(db, 'users', user.uid), {
                maxLevel: maxLevel,
                lastUpdated: serverTimestamp()
            }, { merge: true });
            
            setCookie('maxLevel', maxLevel.toString());
            console.log('✅ [SYNC] Max level synced:', maxLevel);
            return maxLevel;
        } else {
            const localMaxLevel = parseInt(getCookie('maxLevel') || '1');
            await setDoc(doc(db, 'users', user.uid), {
                maxLevel: localMaxLevel,
                lastUpdated: serverTimestamp()
            });
            return localMaxLevel;
        }
    } catch (error) {
        console.error('❌ [SYNC] Error syncing max level:', error);
        return parseInt(getCookie('maxLevel') || '1');
    }
}

// ===== RECORDS: one source of truth for "which run is better" =====
// The tables are ranked by level first, then score, so a record is replaced by
// exactly the runs that would rank above it.
export function isBetterRun(candidate, existing) {
    if (!existing) return true;
    const cl = Number(candidate.level) || 0, el = Number(existing.level) || 0;
    if (cl !== el) return cl > el;
    return (Number(candidate.score) || 0) > (Number(existing.score) || 0);
}
export const isValidRun = (d) => !!d && Number.isFinite(Number(d.score)) && Number.isFinite(Number(d.level)) && d.level !== null && d.score !== null;
const isFasterTime = (candidate, existing) => !existing || candidate.time < existing.time;
const isValidTime = (d) => !!d && typeof d.time === 'number' && Number.isFinite(d.time);

// Firestore rejects `undefined` anywhere inside a document; one stray field would
// otherwise make the whole write fail.
const clean = (obj) => JSON.parse(JSON.stringify(obj ?? null));

const ALT_SUFFIX = '_alt';

// Keeps exactly one document per player in `colPath`, holding that player's best entry.
//  - A better entry always replaces the stored one; a worse one never does.
//  - Every other document the player owns in the table (old duplicates) is deleted.
//  - If the player's own document cannot be written (a legacy document without an
//    owner field is rejected by the security rules), the record goes to a sibling
//    document instead of being dropped, and moves back once the main one is writable.
// Returns 'saved' (the new entry is now the record) or 'kept' (the stored record is better).
async function upsertBestEntry(colPath, uid, entry, isBetter, isValid) {
    const col = collection(db, colPath);
    const mainRef = doc(col, uid);
    const altRef = doc(col, uid + ALT_SUFFIX);

    const [mainSnap, altSnap] = await Promise.all([getDoc(mainRef), getDoc(altRef)]);
    let legacy = [];
    try {
        const own = await getDocs(query(col, where('userId', '==', uid)));
        legacy = own.docs.filter(d => d.id !== mainRef.id && d.id !== altRef.id);
    } catch (e) {
        console.warn('⚠️ [CLOUD] Could not list old entries:', e.code || e);
    }

    let best = null;
    for (const d of [mainSnap, altSnap, ...legacy]) {
        if (d.exists() && isValid(d.data()) && isBetter(d.data(), best)) best = d.data();
    }
    const newIsRecord = isBetter(entry, best);
    const target = { ...(newIsRecord ? entry : best), userId: uid };

    const writeIfBetter = (ref) => runTransaction(db, async (tx) => {
        const cur = await tx.get(ref);
        if (cur.exists() && isValid(cur.data()) && !isBetter(target, cur.data())) return;
        tx.set(ref, target);
    });

    let mainWritable = true;
    try {
        await writeIfBetter(mainRef);
    } catch (e) {
        if (e.code !== 'permission-denied') throw e;
        mainWritable = false;
        console.warn(`⚠️ [CLOUD] ${colPath}/${uid} is not writable (legacy document) — using fallback document`);
        await writeIfBetter(altRef);
    }

    const stale = legacy.map(d => d.ref);
    if (mainWritable && altSnap.exists()) stale.push(altRef);
    await Promise.all(stale.map(ref => deleteDoc(ref).catch(e =>
        console.warn('⚠️ [CLOUD] Could not delete old entry:', e.code || e))));

    return newIsRecord ? 'saved' : 'kept';
}

// One row per player: the best valid entry, whatever document it came from.
function bestPerPlayer(rows, isBetter, isValid) {
    const byPlayer = new Map();
    for (const row of rows) {
        if (!isValid(row)) continue;
        const key = row.userId || `name:${(row.userName || 'Anonymous').toLowerCase()}`;
        const cur = byPlayer.get(key);
        if (!cur || isBetter(row, cur)) byPlayer.set(key, row);
    }
    return [...byPlayer.values()];
}

// ===== PENDING SAVES =====
// A save that failed (offline, server error) is kept on the device and retried
// automatically, so a result is never lost silently.
const PENDING_KEY = 'pendingCloudSaves_v1';
function readPending() {
    try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); } catch { return []; }
}
function writePending(list) {
    try { localStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(-30))); } catch { /* storage full */ }
}
function queuePending(item) {
    const list = readPending();
    list.push(item);
    writePending(list);
}
export function getPendingSaveCount() {
    const uid = auth?.currentUser?.uid;
    return readPending().filter(p => !uid || p.uid === uid).length;
}

let _flushing = false;
export async function flushPendingSaves() {
    const user = auth?.currentUser;
    if (!db || !user || _flushing) return 0;
    const all = readPending();
    const mine = all.filter(p => p.uid === user.uid);
    if (!mine.length) return 0;
    _flushing = true;
    let done = 0;
    try {
        for (const item of mine) {
            try {
                if (item.kind === 'speedrun') await writeSpeedrun(user, item.goalKey, item.entry);
                else await writeScore(user, item.entry);
                done++;
                writePending(readPending().filter(p => p.id !== item.id));
            } catch (e) {
                console.warn('⚠️ [CLOUD] Pending save still failing:', e.code || e);
                break;
            }
        }
    } finally {
        _flushing = false;
    }
    if (done) {
        console.log(`✅ [CLOUD] Uploaded ${done} pending result(s)`);
        window.__onPendingSavesFlushed?.(done);
    }
    return done;
}

// A hanging connection counts as a failed save (it is queued and retried), not as a silent wait.
const withTimeout = (promise, ms) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'timeout' })), ms))
]);

const newPendingId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// ===== SAVE SCORE TO FIRESTORE =====
async function writeScore(user, entry) {
    const { skin: skinKey, score, level } = entry;
    const data = { ...entry, userId: user.uid, timestamp: serverTimestamp() };

    // Each table is written on its own, so a problem with one never discards the others.
    const [overall, skin] = await Promise.allSettled([
        upsertBestEntry('leaderboard', user.uid, data, isBetterRun, isValidRun),
        upsertBestEntry(`scores/${skinKey}/entries`, user.uid, data, isBetterRun, isValidRun)
    ]);
    if (overall.status === 'rejected') throw overall.reason;
    if (skin.status === 'rejected') throw skin.reason;

    // Personal stats and run history are supplementary: never let them fail a record save.
    (async () => {
        try {
            const statsRef = doc(db, 'userStats', user.uid);
            const statsDoc = await getDoc(statsRef);
            const stats = statsDoc.exists() ? statsDoc.data() : {};
            const update = { totalGames: (stats.totalGames || 0) + 1, lastPlayed: serverTimestamp() };
            if (isBetterRun({ level, score }, { level: stats.bestLevel, score: stats.bestScore })) {
                Object.assign(update, { bestScore: score, bestLevel: level, bestSkin: skinKey });
            }
            await setDoc(statsRef, update, { merge: true });
        } catch (e) { console.warn('⚠️ [CLOUD] Stats update failed:', e.code || e); }
    })();
    addDoc(collection(db, 'game_sessions'), { ...data, clientTimestamp: entry.clientTimestamp || Date.now() })
        .catch((e) => console.warn('⚠️ [CLOUD] Score history save failed:', e.code || e));

    return { overall: overall.value, skin: skin.value };
}

// Returns { ok, reason?, overall?, skin?, queued? }
//   ok:true            → the cloud tables are up to date ('saved' = new record, 'kept' = old record is better)
//   reason:'guest'     → not signed in; the result only exists on this device
//   reason:'error'     → the save failed; it is queued and retried automatically
export async function saveScoreToCloud(skinKey, score, level, userName, settings = null) {
    if (!auth || !db) {
        console.error('❌ [CLOUD] Firebase not initialized');
        return { ok: false, reason: 'error', queued: false };
    }
    const user = auth.currentUser;
    if (!user) {
        console.log('⚠️ [CLOUD] Not logged in, saving locally only');
        return { ok: false, reason: 'guest' };
    }

    const named = userName && userName !== 'Anonymous' ? userName : null;
    const entry = clean({
        userName: named || user.displayName || user.email?.split('@')[0] || 'Anonymous',
        email: user.email || null,
        score, level,
        skin: skinKey,
        coins: parseInt(getCookie('playerCoins') || '0'),
        date: new Date().toLocaleDateString('he-IL'),
        clientTimestamp: Date.now(),
        settings: settings || null
    });

    try {
        console.log(`☁️ [CLOUD] Saving score: ${score} pts, Level ${level}, Skin: ${skinKey}`);
        await flushPendingSaves().catch(() => {});
        const result = await withTimeout(writeScore(user, entry), 20000);
        console.log('✅ [CLOUD] Score save result:', result);
        return { ok: true, ...result };
    } catch (error) {
        console.error('❌ [CLOUD] Error saving score:', error);
        queuePending({ id: newPendingId(), kind: 'score', uid: user.uid, entry });
        return { ok: false, reason: 'error', queued: true, code: error.code || null };
    }
}

// A player who changes their display name stays ONE player on every table: their entries
// are renamed in place (the tables also show the newest name when they read, see main.js).
export async function renameInLeaderboards(newName) {
    const user = auth?.currentUser;
    if (!db || !user || !newName) return;
    const skins = ['classic', 'interceptor', 'tanker', 'phoenix', 'vortex', 'joker', 'dragon'];
    const paths = ['leaderboard', 'moneyLeaderboard', ...skins.map(s => `scores/${s}/entries`)];
    await Promise.all(paths.flatMap((p) => [user.uid, user.uid + ALT_SUFFIX].map(async (id) => {
        try { await updateDoc(doc(db, p, id), { userName: newName }); }
        catch (e) { if (e.code !== 'not-found' && e.code !== 'permission-denied') console.warn('⚠️ [CLOUD] Rename failed for', p, e.code); }
    })));
    try {
        const goals = await getDocs(collection(db, 'speedrun'));    // documents may not exist; ignore
        goals.forEach(() => {});
    } catch (_) { /* speedrun goals are not enumerable; they are renamed on the next result */ }
}

// ===== GET LEADERBOARD FROM FIRESTORE =====
export async function getLeaderboardFromCloud(skinKey = 'overall') {
    if (!db) {
        console.error('❌ [CLOUD] Firestore not initialized');
        return [];
    }

    try {
        console.log(`🏆 [CLOUD] Fetching ${skinKey} leaderboard...`);
        const collected = [];

        if (skinKey === 'overall') {
            const snap = await getDocs(collection(db, 'leaderboard'));
            snap.forEach((d) => collected.push({ id: d.id, ...d.data() }));
        } else {
            const snap = await getDocs(collection(db, `scores/${skinKey}/entries`));
            snap.forEach((d) => collected.push({ id: d.id, ...d.data() }));

            // Runs that only ever landed in the overall table (the per-skin tables
            // were added later) still belong in their ship's category.
            try {
                const overallSnap = await getDocs(collection(db, 'leaderboard'));
                overallSnap.forEach((d) => {
                    const data = d.data();
                    if (data.skin === skinKey) collected.push({ id: d.id, ...data });
                });
            } catch (e) {
                console.warn('⚠️ [CLOUD] Skin backfill from overall failed:', e);
            }
        }

        // Recent runs carry the settings used by the filters (device, language, upgrades…),
        // so a filtered view can still show a player's best matching run.
        try {
            const sessSnap = await getDocs(query(
                collection(db, 'game_sessions'),
                orderBy('timestamp', 'desc'),
                limit(500)
            ));
            sessSnap.forEach((d) => {
                const data = d.data();
                if (skinKey === 'overall' || !data.skin || data.skin === skinKey) {
                    collected.push({ id: d.id, ...data });
                }
            });
        } catch (e) {
            console.warn('⚠️ [CLOUD] game_sessions fetch failed:', e);
        }

        // Empty / damaged documents are dropped here so they can never break the table.
        const scores = collected
            .filter(isValidRun)
            .sort((a, b) => ((b.level || 0) - (a.level || 0)) || ((b.score || 0) - (a.score || 0)))
            .slice(0, 500);

        console.log(`✅ [CLOUD] Fetched ${scores.length} scores`);
        return scores;
    } catch (error) {
        console.error('❌ [CLOUD] Error fetching leaderboard:', error);
        return [];
    }
}

// ===== GET USER'S PERSONAL BEST =====
export async function getUserPersonalBest() {
    if (!auth || !db) {
        console.error('❌ [CLOUD] Firebase not initialized');
        return null;
    }

    const user = auth.currentUser;
    if (!user) return null;

    try {
        const userStatsRef = doc(db, 'userStats', user.uid);
        const userStats = await getDoc(userStatsRef);
        
        if (userStats.exists()) {
            return userStats.data();
        }
        return null;
    } catch (error) {
        console.error('❌ [CLOUD] Error fetching personal best:', error);
        return null;
    }
}

// ===== UNLOCK SKIN IN CLOUD =====
export async function unlockSkinInCloud(skinKey) {
    if (!auth || !db) {
        console.error('❌ [CLOUD] Firebase not initialized');
        return false;
    }

    const user = auth.currentUser;
    if (!user) {
        console.log('⚠️ [CLOUD] Not logged in, unlocking locally only');
        return false;
    }

    try {
        console.log(`🔓 [CLOUD] Unlocking skin: ${skinKey}`);
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        let currentSkins = ['classic', 'interceptor', 'tanker'];
        
        if (userDoc.exists()) {
            currentSkins = userDoc.data().unlockedSkins || currentSkins;
        }
        
        if (!currentSkins.includes(skinKey)) {
            currentSkins.push(skinKey);
            
            await setDoc(doc(db, 'users', user.uid), {
                unlockedSkins: currentSkins,
                lastUpdated: serverTimestamp()
            }, { merge: true });
            
            console.log('✅ [CLOUD] Skin unlocked in cloud');
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('❌ [CLOUD] Error unlocking skin:', error);
        return false;
    }
}

// ===== FORCE SET COINS (bypasses max-merge, used for resets) =====
export async function forceSetCoins(amount) {
    if (!auth || !db) return;
    const user = auth.currentUser;
    if (!user) return;
    try {
        await setDoc(doc(db, 'users', user.uid), { coins: amount, lastUpdated: serverTimestamp() }, { merge: true });
        await writeMoneyLeaderboard(user, amount);
    } catch (e) {
        console.error('❌ [SYNC] forceSetCoins failed:', e);
    }
}

// ===== SYNC COINS =====
export async function syncCoins(localCoins) {
    if (!auth || !db) return localCoins;
    const user = auth.currentUser;
    if (!user) return localCoins;

    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const cloudCoins = userDoc.exists() ? (userDoc.data().coins || 0) : 0;
        const merged = Math.max(cloudCoins, localCoins);
        await setDoc(doc(db, 'users', user.uid), { coins: merged, lastUpdated: serverTimestamp() }, { merge: true });
        setCookie('playerCoins', merged.toString());

        // Separate from the balance save above, so a failure here never rolls it back.
        await writeMoneyLeaderboard(user, merged);

        return merged;
    } catch (e) {
        console.error('❌ [SYNC] Error syncing coins:', e);
        return localCoins;
    }
}

// ===== SHOP STATE (HP levels + disabled upgrades) =====
// Pushes the local shop state to the user doc (cloud copy is overwritten).
export async function pushShopState(hpLevels, disabledUpgrades) {
    if (!auth || !db) return;
    const user = auth.currentUser;
    if (!user) return;
    try {
        await setDoc(doc(db, 'users', user.uid), { hpLevels, disabledUpgrades, lastUpdated: serverTimestamp() }, { merge: true });
    } catch (e) { console.error('❌ [SYNC] Error pushing shop state:', e); }
}

// Pulls owned upgrades / disabled upgrades / HP levels from the cloud into the local cookies,
// so every device applies the same shop purchases. Local-only data is pushed up if the cloud has none.
export async function pullShopState() {
    if (!auth || !db) return null;
    const user = auth.currentUser;
    if (!user) return null;
    try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const d = snap.exists() ? snap.data() : {};
        const localOwned = JSON.parse(getCookie('ownedUpgrades') || '[]');
        const owned = [...new Set([...(d.ownedUpgrades || []), ...localOwned])];
        const disabled = Array.isArray(d.disabledUpgrades) ? d.disabledUpgrades : JSON.parse(getCookie('disabledUpgrades') || '[]');
        const hp = (d.hpLevels && typeof d.hpLevels === 'object') ? d.hpLevels : JSON.parse(getCookie('hpLevels') || '{}');
        setCookie('ownedUpgrades', JSON.stringify(owned));
        setCookie('disabledUpgrades', JSON.stringify(disabled));
        setCookie('hpLevels', JSON.stringify(hp));
        if (d.disabledUpgrades === undefined || d.hpLevels === undefined || owned.length !== (d.ownedUpgrades || []).length) {
            await setDoc(doc(db, 'users', user.uid), { ownedUpgrades: owned, disabledUpgrades: disabled, hpLevels: hp, lastUpdated: serverTimestamp() }, { merge: true });
        }
        return { owned, disabled, hp };
    } catch (e) {
        console.error('❌ [SYNC] Error pulling shop state:', e);
        return null;
    }
}

// ===== SYNC UPGRADES =====
// overwriteCloud=true: local list is authoritative (used after removal).
// overwriteCloud=false (default): merge cloud + local (used on login).
export async function syncUpgrades(localUpgrades, overwriteCloud = false) {
    if (!auth || !db) return localUpgrades;
    const user = auth.currentUser;
    if (!user) return localUpgrades;

    try {
        let final;
        if (overwriteCloud) {
            final = localUpgrades;
        } else {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const cloudUpgrades = userDoc.exists() ? (userDoc.data().ownedUpgrades || []) : [];
            final = [...new Set([...cloudUpgrades, ...localUpgrades])];
        }
        await setDoc(doc(db, 'users', user.uid), { ownedUpgrades: final, lastUpdated: serverTimestamp() }, { merge: true });
        setCookie('ownedUpgrades', JSON.stringify(final));
        return final;
    } catch (e) {
        console.error('❌ [SYNC] Error syncing upgrades:', e);
        return localUpgrades;
    }
}

// ===== GET MONEY LEADERBOARD =====
export async function getMoneyLeaderboard() {
    if (!db) return [];
    try {
        const q = query(collection(db, 'moneyLeaderboard'), orderBy('coins', 'desc'), limit(50));
        const snap = await getDocs(q);
        const seen = new Set();
        const results = [];
        snap.forEach(d => {
            const data = d.data();
            const uid = data.userId || d.id;
            if (!seen.has(uid)) {
                seen.add(uid);
                results.push({ id: d.id, ...data });
                if (results.length === 10) return;
            }
        });
        return results;
    } catch (e) {
        console.error('❌ [CLOUD] Error fetching money leaderboard:', e);
        return [];
    }
}

// ===== MONEY LEADERBOARD =====
// The table shows each player's current balance, so every balance change lands here.
async function writeMoneyLeaderboard(user, coins) {
    try {
        await setDoc(doc(db, 'moneyLeaderboard', user.uid), {
            userId: user.uid,
            userName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
            email: user.email || null,
            coins,
            lastUpdated: serverTimestamp()
        });
        return true;
    } catch (e) {
        console.warn('⚠️ [SYNC] Money leaderboard write failed:', e.code || e);
        return false;
    }
}

// ===== SPEEDRUN LEADERBOARD =====
async function writeSpeedrun(user, goalKey, entry) {
    const data = { ...entry, userId: user.uid, updatedAt: serverTimestamp() };
    return upsertBestEntry(`speedrun/${goalKey}/entries`, user.uid, data, isFasterTime, isValidTime);
}

// Returns { ok, reason?, result? } — same contract as saveScoreToCloud.
export async function saveSpeedrunToCloud(goalKey, entry) {
    if (!db || !auth) return { ok: false, reason: 'error', queued: false };
    const user = auth.currentUser;
    if (!user) return { ok: false, reason: 'guest' };
    const cleanEntry = clean(entry);
    if (!cleanEntry.userName || cleanEntry.userName === 'Anonymous') {
        cleanEntry.userName = user.displayName || user.email?.split('@')[0] || 'Anonymous';
    }
    try {
        const result = await withTimeout(writeSpeedrun(user, goalKey, cleanEntry), 20000);
        return { ok: true, result };
    } catch (e) {
        console.warn('⚠️ [SPEEDRUN] Cloud save failed:', e.code || e);
        queuePending({ id: newPendingId(), kind: 'speedrun', uid: user.uid, goalKey, entry: cleanEntry });
        return { ok: false, reason: 'error', queued: true };
    }
}

export async function getSpeedrunLeaderboardFromCloud(goalKey) {
    if (!db) return [];
    try {
        const q = query(collection(db, `speedrun/${goalKey}/entries`), orderBy('time', 'asc'), limit(100));
        const snap = await getDocs(q);
        const rows = [];
        snap.forEach(d => rows.push({ id: d.id, ...d.data() }));
        return bestPerPlayer(rows, isFasterTime, isValidTime)
            .sort((a, b) => a.time - b.time)
            .slice(0, 10);
    } catch (e) {
        console.error('❌ [CLOUD] Error fetching speedrun leaderboard:', e);
        return [];
    }
}

// ===== SYNC ACHIEVEMENTS =====
export async function syncAchievements(localAchievements = []) {
    if (!auth || !db) return localAchievements;
    const user = auth.currentUser;
    if (!user) return localAchievements;

    try {
        console.log('🔄 [SYNC] Syncing achievements...');
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const cloudAchievements = userDoc.exists() ? (userDoc.data().achievements || []) : [];
        
        // Merge - any achievement in either source (union)
        const merged = [...new Set([...cloudAchievements, ...localAchievements])];
        
        // Update in cloud
        await setDoc(doc(db, 'users', user.uid), {
            achievements: merged,
            lastUpdated: serverTimestamp()
        }, { merge: true });
        
        console.log('✅ [SYNC] Achievements synced:', merged);
        return merged;
    } catch (e) {
        console.error('❌ [SYNC] Error syncing achievements:', e);
        return localAchievements;
    }
}

// ===== SYNC KEY BINDINGS =====
export async function syncKeyBindings(localBindings = {}) {
    if (!auth || !db) return localBindings;
    const user = auth.currentUser;
    if (!user) return localBindings;

    try {
        console.log('🔄 [SYNC] Syncing key bindings...');
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const cloudBindings = userDoc.exists() ? (userDoc.data().keyBindings || {}) : {};
        
        // Merge - local takes precedence (user's current settings override cloud)
        const merged = { ...cloudBindings, ...localBindings };
        
        // Update in cloud and cookies
        await setDoc(doc(db, 'users', user.uid), {
            keyBindings: merged,
            lastUpdated: serverTimestamp()
        }, { merge: true });
        
        setCookie('keyBindings', JSON.stringify(merged));
        console.log('✅ [SYNC] Key bindings synced');
        return merged;
    } catch (e) {
        console.error('❌ [SYNC] Error syncing key bindings:', e);
        return localBindings;
    }
}

// ===== SYNC GAME RULES =====
export async function syncGameRules(localRules = {}) {
    if (!auth || !db) return localRules;
    const user = auth.currentUser;
    if (!user) return localRules;

    try {
        console.log('🔄 [SYNC] Syncing game rules...');
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const cloudRules = userDoc.exists() ? (userDoc.data().gameRules || {}) : {};
        
        // Merge - cloud takes precedence
        const merged = { ...localRules, ...cloudRules };
        
        // Update in cloud and cookies
        await setDoc(doc(db, 'users', user.uid), {
            gameRules: merged,
            lastUpdated: serverTimestamp()
        }, { merge: true });
        
        setCookie('gameRules', JSON.stringify(merged));
        console.log('✅ [SYNC] Game rules synced');
        return merged;
    } catch (e) {
        console.error('❌ [SYNC] Error syncing game rules:', e);
        return localRules;
    }
}

// ===== SYNC DEVICE MODE =====
export async function syncDeviceMode(localDeviceMode = {}) {
    if (!auth || !db) return localDeviceMode;
    const user = auth.currentUser;
    if (!user) return localDeviceMode;

    try {
        console.log('🔄 [SYNC] Syncing device mode...');
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const cloudDeviceMode = userDoc.exists() ? (userDoc.data().deviceMode || {}) : {};
        
        // Merge - cloud takes precedence
        const merged = { ...localDeviceMode, ...cloudDeviceMode };
        
        // Update in cloud and cookies
        await setDoc(doc(db, 'users', user.uid), {
            deviceMode: merged,
            lastUpdated: serverTimestamp()
        }, { merge: true });
        
        setCookie('deviceMode', JSON.stringify(merged));
        console.log('✅ [SYNC] Device mode synced');
        return merged;
    } catch (e) {
        console.error('❌ [SYNC] Error syncing device mode:', e);
        return localDeviceMode;
    }
}

// ===== SYNC CUSTOM SPEEDRUN GOALS =====
export async function syncCustomSpeedrunGoals(localGoals = []) {
    if (!auth || !db) return localGoals;
    const user = auth.currentUser;
    if (!user) return localGoals;

    try {
        console.log('🔄 [SYNC] Syncing custom speedrun goals...');
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const cloudGoals = userDoc.exists() ? (userDoc.data().customSpeedrunGoals || []) : [];
        
        // Merge - keep unique goals by key
        const goalMap = new Map();
        [...cloudGoals, ...localGoals].forEach(goal => {
            goalMap.set(goal.key, goal);
        });
        const merged = Array.from(goalMap.values());
        
        // Update in cloud and cookies
        await setDoc(doc(db, 'users', user.uid), {
            customSpeedrunGoals: merged,
            lastUpdated: serverTimestamp()
        }, { merge: true });
        
        setCookie('customSpeedrunGoals', JSON.stringify(merged));
        console.log('✅ [SYNC] Custom speedrun goals synced');
        return merged;
    } catch (e) {
        console.error('❌ [SYNC] Error syncing custom speedrun goals:', e);
        return localGoals;
    }
}

// ===== SYNC ALL DATA =====
export async function syncAllData() {
    if (!auth) {
        console.error('❌ [SYNC] Auth not initialized');
        return;
    }

    const user = auth.currentUser;
    if (!user) {
        console.log('⚠️ [SYNC] Not logged in, skipping cloud sync');
        return;
    }

    console.log('🔄 [SYNC] Starting full sync...');

    try {
        const localCoins = parseInt(getCookie('playerCoins') || '0');
        const localUpgrades = JSON.parse(getCookie('ownedUpgrades') || '[]');
        const localAchievements = JSON.parse(localStorage.getItem('achievements_v1') || '[]');
        const localKeyBindings = JSON.parse(getCookie('keyBindings') || '{}');
        const localGameRules = JSON.parse(getCookie('gameRules') || '{}');
        const localDeviceMode = JSON.parse(getCookie('deviceMode') || '{}');
        const localCustomGoals = JSON.parse(getCookie('customSpeedrunGoals') || '[]');

        const [mergedSkins, , mergedCoins, mergedUpgrades, mergedAchievements, mergedKeyBindings, mergedGameRules, mergedDeviceMode, mergedCustomGoals] = await Promise.all([
            syncUnlockedSkins(),
            syncMaxLevel(),
            syncCoins(localCoins),
            syncUpgrades(localUpgrades),
            syncAchievements(localAchievements),
            syncKeyBindings(localKeyBindings),
            syncGameRules(localGameRules),
            syncDeviceMode(localDeviceMode),
            syncCustomSpeedrunGoals(localCustomGoals)
        ]);

        // Update cookies and UI with synced values
        if (mergedCoins !== undefined) {
            setCookie('playerCoins', mergedCoins.toString());
            const coinsEl = document.getElementById('coins');
            if (coinsEl) coinsEl.innerText = mergedCoins;
        }
        if (mergedUpgrades !== undefined) {
            setCookie('ownedUpgrades', JSON.stringify(mergedUpgrades));
        }
        if (mergedAchievements !== undefined) {
            localStorage.setItem('achievements_v1', JSON.stringify(mergedAchievements));
        }
        if (mergedSkins !== undefined && typeof window.__onUnlockedSkinsSynced === 'function') {
            window.__onUnlockedSkinsSynced(mergedSkins);
        }
        if (mergedKeyBindings !== undefined) {
            setCookie('keyBindings', JSON.stringify(mergedKeyBindings));
            // Notify main.js to reload keyBindings into memory
            if (typeof window.__onKeyBindingsSynced === 'function') {
                window.__onKeyBindingsSynced(mergedKeyBindings);
            }
        }
        if (mergedGameRules !== undefined) {
            setCookie('gameRules', JSON.stringify(mergedGameRules));
        }
        if (mergedDeviceMode !== undefined) {
            setCookie('deviceMode', JSON.stringify(mergedDeviceMode));
        }
        if (mergedCustomGoals !== undefined) {
            setCookie('customSpeedrunGoals', JSON.stringify(mergedCustomGoals));
        }

        await pullShopState();
        console.log('✅ [SYNC] Full sync complete - all data synchronized');

        // Store email for peer-to-peer coin transfers
        if (user.email) {
            setDoc(doc(db, 'users', user.uid), { email: user.email.toLowerCase() }, { merge: true }).catch(() => {});
        }

        // Claim any pending coin transfers from friends
        claimPendingTransfers().then(result => {
            if (result.total > 0) {
                const coinsEl = document.getElementById('coins');
                if (coinsEl) coinsEl.innerText = parseInt(getCookie('playerCoins') || '0');
                if (typeof window.__onCoinTransfersClaimed === 'function') {
                    window.__onCoinTransfersClaimed(result);
                }
            }
        }).catch(() => {});

        // One-time migration of local game history to cloud
        migrateLocalHistoryToCloud(user).catch(() => {});
    } catch (error) {
        console.error('❌ [SYNC] Error during full sync:', error);
    }
}

// ===== COIN TRANSFERS BETWEEN FRIENDS =====

export async function sendCoinsToFriend(toEmail, amount) {
    if (!auth || !db) return { success: false, error: 'not_connected' };
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'not_logged_in' };

    const normalizedEmail = toEmail.trim().toLowerCase();
    if (normalizedEmail === (user.email || '').toLowerCase()) return { success: false, error: 'self_transfer' };

    const localCoins = parseInt(getCookie('playerCoins') || '0');
    if (amount <= 0 || amount > localCoins) return { success: false, error: 'insufficient_coins' };

    try {
        await addDoc(collection(db, 'coinTransfers'), {
            fromUid: user.uid,
            fromEmail: (user.email || '').toLowerCase(),
            fromName: user.displayName || (user.email || '').split('@')[0],
            toEmail: normalizedEmail,
            amount,
            timestamp: serverTimestamp(),
            claimed: false
        });

        const newTotal = localCoins - amount;
        setCookie('playerCoins', newTotal.toString());
        await setDoc(doc(db, 'users', user.uid), { coins: newTotal, lastUpdated: serverTimestamp() }, { merge: true });
        await writeMoneyLeaderboard(user, newTotal);

        return { success: true, newTotal };
    } catch (e) {
        console.error('❌ [TRANSFER] Send failed:', e);
        return { success: false, error: 'server_error' };
    }
}

export async function claimPendingTransfers() {
    if (!auth || !db) return { total: 0, transfers: [] };
    const user = auth.currentUser;
    if (!user || !user.email) return { total: 0, transfers: [] };

    try {
        const snap = await getDocs(query(
            collection(db, 'coinTransfers'),
            where('toEmail', '==', user.email.toLowerCase()),
            where('claimed', '==', false)
        ));

        if (snap.empty) return { total: 0, transfers: [] };

        let totalClaimed = 0;
        const transfers = [];

        for (const transferDoc of snap.docs) {
            const data = transferDoc.data();
            totalClaimed += data.amount;
            transfers.push({ amount: data.amount, fromName: data.fromName || data.fromEmail });
            await setDoc(doc(db, 'coinTransfers', transferDoc.id), { claimed: true, claimedAt: serverTimestamp() }, { merge: true });
        }

        if (totalClaimed > 0) {
            const localCoins = parseInt(getCookie('playerCoins') || '0');
            const newTotal = localCoins + totalClaimed;
            setCookie('playerCoins', newTotal.toString());
            await setDoc(doc(db, 'users', user.uid), { coins: newTotal, lastUpdated: serverTimestamp() }, { merge: true });
            await writeMoneyLeaderboard(user, newTotal);
        }

        return { total: totalClaimed, transfers };
    } catch (e) {
        console.error('❌ [TRANSFER] Claim failed:', e);
        return { total: 0, transfers: [] };
    }
}

// ===== MIGRATE LOCAL GAME HISTORY TO CLOUD =====
async function migrateLocalHistoryToCloud(user) {
    const MIGRATION_KEY = `history_migrated_${user.uid}`;
    if (localStorage.getItem(MIGRATION_KEY)) return; // already done

    try {
        const raw = localStorage.getItem('gameHistory');
        if (!raw) { localStorage.setItem(MIGRATION_KEY, '1'); return; }
        const history = JSON.parse(raw);
        if (!Array.isArray(history) || history.length === 0) {
            localStorage.setItem(MIGRATION_KEY, '1');
            return;
        }

        // Fetch existing game_sessions timestamps to avoid duplicates
        const existingSnap = await getDocs(query(
            collection(db, 'game_sessions'),
            where('userId', '==', user.uid),
            limit(500)
        ));
        const existingTs = new Set();
        existingSnap.forEach(d => {
            const ts = d.data().clientTimestamp;
            if (ts) existingTs.add(ts);
        });

        const toUpload = history.filter(e =>
            !e.isDebug &&
            e.score != null &&
            e.level != null &&
            (!e.timestamp || !existingTs.has(e.timestamp))
        );

        console.log(`🔄 [MIGRATE] Uploading ${toUpload.length} local games to cloud...`);
        await Promise.all(toUpload.map(e => addDoc(collection(db, 'game_sessions'), {
            userId: user.uid,
            userName: e.userName || user.displayName || 'Anonymous',
            email: user.email || null,
            score: e.score || 0,
            level: e.level || 1,
            skin: e.skin || 'classic',
            coins: null,
            timestamp: serverTimestamp(),
            clientTimestamp: e.timestamp || null,
            date: e.date || null,
            settings: e.settings || null
        })));

        localStorage.setItem(MIGRATION_KEY, '1');
        console.log(`✅ [MIGRATE] Done — ${toUpload.length} games uploaded`);
    } catch (e) {
        console.warn('⚠️ [MIGRATE] Local history migration failed:', e);
    }
}

// ===== AUTO-SYNC ON AUTH CHANGE =====
export function initFirestoreSync() {
    console.log('🔄 [FIRESTORE] Initializing sync system...');
    
    // Initialize Firestore connection first
    const initialized = initializeFirestoreSync();
    
    if (!initialized || !auth) {
        console.error('❌ [FIRESTORE] Failed to initialize - auth not available');
        return;
    }
    
    // Then set up auth listener
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log('✅ [FIRESTORE] User logged in, syncing data...');
            await syncAllData();
            flushPendingSaves().catch(() => {});
        } else {
            console.log('❌ [FIRESTORE] User logged out');
        }
    });
}

// Results that could not be uploaded are retried as soon as the connection is back.
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => { flushPendingSaves().catch(() => {}); });
}

// ===== EXPORTS =====
export { db, auth };