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
    updateDoc,
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

// ===== SAVE SCORE TO FIRESTORE =====
export async function saveScoreToCloud(skinKey, score, level, userName, settings = null) {
    if (!auth || !db) {
        console.error('❌ [CLOUD] Firebase not initialized');
        return false;
    }

    const user = auth.currentUser;
    if (!user) {
        console.log('⚠️ [CLOUD] Not logged in, saving locally only');
        return false;
    }

    try {
        console.log(`☁️ [CLOUD] Saving score: ${score} pts, Level ${level}, Skin: ${skinKey}`);

        // Save to skin-specific collection
        const currentCoins = parseInt(getCookie('playerCoins') || '0');
        const scoreData = {
            userId: user.uid,
            userName: userName || user.displayName || user.email?.split('@')[0] || 'Anonymous',
            email: user.email,
            score: score,
            level: level,
            skin: skinKey,
            coins: currentCoins,
            timestamp: serverTimestamp(),
            date: new Date().toLocaleDateString('he-IL'),
            settings: settings || null
        };
        
        // Save every game session (for cross-device filter search)
        await addDoc(collection(db, 'game_sessions'), {
            ...scoreData,
            clientTimestamp: Date.now()
        });

        // Save to general leaderboard - only one record per user
        const overallRef = doc(db, 'leaderboard', user.uid);
        const existingOverall = await getDoc(overallRef);
        if (!existingOverall.exists() || level > (existingOverall.data().level || 0) || (level === (existingOverall.data().level || 0) && score > existingOverall.data().score)) {
            await setDoc(overallRef, scoreData);
        }

        // Save to skin leaderboard - only one record per user
        const skinRef = doc(db, `scores/${skinKey}/entries`, user.uid);
        const existingSkin = await getDoc(skinRef);
        if (!existingSkin.exists() || level > (existingSkin.data().level || 0) || (level === (existingSkin.data().level || 0) && score > existingSkin.data().score)) {
            await setDoc(skinRef, scoreData);
        }
        
        // Update user statistics
        const userStatsRef = doc(db, 'userStats', user.uid);
        const userStats = await getDoc(userStatsRef);
        
        if (userStats.exists()) {
            const currentBest = userStats.data().bestScore || 0;
            if (score > currentBest) {
                await updateDoc(userStatsRef, {
                    bestScore: score,
                    bestLevel: level,
                    bestSkin: skinKey,
                    totalGames: (userStats.data().totalGames || 0) + 1,
                    lastPlayed: serverTimestamp()
                });
            } else {
                await updateDoc(userStatsRef, {
                    totalGames: (userStats.data().totalGames || 0) + 1,
                    lastPlayed: serverTimestamp()
                });
            }
        } else {
            await setDoc(userStatsRef, {
                bestScore: score,
                bestLevel: level,
                bestSkin: skinKey,
                totalGames: 1,
                lastPlayed: serverTimestamp()
            });
        }
        
        console.log('✅ [CLOUD] Score saved successfully');
        return true;
    } catch (error) {
        console.error('❌ [CLOUD] Error saving score:', error);
        return false;
    }
}

// ===== GET LEADERBOARD FROM FIRESTORE =====
export async function getLeaderboardFromCloud(skinKey = 'overall') {
    if (!db) {
        console.error('❌ [CLOUD] Firestore not initialized');
        return [];
    }

    try {
        console.log(`🏆 [CLOUD] Fetching ${skinKey} leaderboard...`);

        // Rank by level first (then score) to match how records are kept and
        // displayed. Ordering by score would cut off high-level / modest-score
        // runs before the client-side sort ever sees them.
        const collected = [];

        if (skinKey === 'overall') {
            const snap = await getDocs(query(
                collection(db, 'leaderboard'),
                orderBy('level', 'desc'),
                limit(100)
            ));
            snap.forEach((d) => collected.push({ id: d.id, ...d.data() }));
        } else {
            // Per-skin runs written at game-over.
            const snap = await getDocs(query(
                collection(db, `scores/${skinKey}/entries`),
                orderBy('level', 'desc'),
                limit(100)
            ));
            snap.forEach((d) => collected.push({ id: d.id, ...d.data() }));

            // Historical runs that only ever landed in the overall leaderboard
            // (the per-skin collections were populated later). Pull the matching
            // skin from there so old records show up in their category too.
            try {
                const overallSnap = await getDocs(query(
                    collection(db, 'leaderboard'),
                    orderBy('level', 'desc'),
                    limit(100)
                ));
                overallSnap.forEach((d) => {
                    const data = d.data();
                    if (data.skin === skinKey) collected.push({ id: d.id, ...data });
                });
            } catch (e) {
                console.warn('⚠️ [CLOUD] Skin backfill from overall failed:', e);
            }
        }

        // Also fetch all game sessions for complete filter coverage
        try {
            const sessSnap = await getDocs(query(
                collection(db, 'game_sessions'),
                orderBy('level', 'desc'),
                limit(500)
            ));
            sessSnap.forEach((d) => collected.push({ id: d.id, ...d.data() }));
        } catch (e) {
            console.warn('⚠️ [CLOUD] game_sessions fetch failed:', e);
        }

        // All collected entries — deduplication happens client-side after filtering
        const scores = collected
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
        try {
            await setDoc(doc(db, 'moneyLeaderboard', user.uid), {
                userId: user.uid,
                userName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
                email: user.email,
                coins: amount,
                lastUpdated: serverTimestamp()
            });
        } catch (e) {
            console.warn('⚠️ [SYNC] Money leaderboard write failed (deploy Firebase rules):', e.code);
        }
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

        // Update money leaderboard — separate try so a permissions error here
        // doesn't roll back the coins save above.
        try {
            const moneyRef = doc(db, 'moneyLeaderboard', user.uid);
            const existing = await getDoc(moneyRef);
            if (!existing.exists() || merged > (existing.data().coins || 0)) {
                await setDoc(moneyRef, {
                    userId: user.uid,
                    userName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
                    email: user.email,
                    coins: merged,
                    lastUpdated: serverTimestamp()
                });
            }
        } catch (leaderboardErr) {
            console.warn('⚠️ [SYNC] Money leaderboard write failed (deploy Firebase rules):', leaderboardErr.code);
        }

        return merged;
    } catch (e) {
        console.error('❌ [SYNC] Error syncing coins:', e);
        return localCoins;
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

// ===== SPEEDRUN LEADERBOARD =====
export async function saveSpeedrunToCloud(goalKey, entry) {
    if (!db || !auth?.currentUser) return;
    const user = auth.currentUser;
    try {
        const colRef = collection(db, `speedrun/${goalKey}/entries`);
        // Check existing personal best for this user
        const existing = query(colRef, where('userId', '==', user.uid), limit(1));
        const snap = await getDocs(existing);
        if (!snap.empty) {
            const doc0 = snap.docs[0];
            if ((doc0.data().time || Infinity) <= entry.time) return; // not faster
            await setDoc(doc(db, `speedrun/${goalKey}/entries`, doc0.id), {
                ...entry, userId: user.uid, updatedAt: serverTimestamp()
            });
        } else {
            await addDoc(colRef, { ...entry, userId: user.uid, createdAt: serverTimestamp() });
        }
    } catch (e) {
        console.warn('⚠️ [SPEEDRUN] Cloud save failed:', e.code);
    }
}

export async function getSpeedrunLeaderboardFromCloud(goalKey) {
    if (!db) return [];
    try {
        const q = query(collection(db, `speedrun/${goalKey}/entries`), orderBy('time', 'asc'), limit(50));
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

        const [, , mergedCoins, mergedUpgrades, mergedAchievements, mergedKeyBindings, mergedGameRules, mergedDeviceMode, mergedCustomGoals] = await Promise.all([
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

        console.log('✅ [SYNC] Full sync complete - all data synchronized');
    } catch (error) {
        console.error('❌ [SYNC] Error during full sync:', error);
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
        } else {
            console.log('❌ [FIRESTORE] User logged out');
        }
    });
}

// ===== EXPORTS =====
export { db, auth };