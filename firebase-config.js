// Firebase Configuration and Global Leaderboard
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, get, push, query, orderByChild, limitToLast, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// ===== FIREBASE CONFIGURATION =====
// TODO: Replace with your Firebase project configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
let app, database;
let firebaseEnabled = false;

export function initFirebase() {
    try {
        // Check if config is filled
        if (firebaseConfig.apiKey === "YOUR_API_KEY") {
            console.log('⚠️ [FIREBASE] Firebase not configured. Using local leaderboard only.');
            return false;
        }
        
        app = initializeApp(firebaseConfig);
        database = getDatabase(app);
        firebaseEnabled = true;
        console.log('✅ [FIREBASE] Connected successfully');
        return true;
    } catch (error) {
        console.error('❌ [FIREBASE] Connection error:', error);
        return false;
    }
}

// ===== GLOBAL LEADERBOARD FUNCTIONS =====

/**
 * Submit score to global leaderboard
 * @param {string} playerName - Player's display name
 * @param {string} skinKey - Skin used
 * @param {number} score - Final score
 * @param {number} level - Level reached
 */
export async function submitGlobalScore(playerName, skinKey, score, level) {
    if (!firebaseEnabled) {
        console.log('ℹ️ [FIREBASE] Not enabled, skipping global submit');
        return false;
    }
    
    try {
        const timestamp = Date.now();
        const scoreData = {
            playerName: playerName || 'Anonymous',
            skin: skinKey,
            score: score,
            level: level,
            timestamp: timestamp,
            date: new Date().toLocaleDateString('he-IL')
        };
        
        // Add to global leaderboard
        const globalRef = ref(database, 'leaderboard/global');
        await push(globalRef, scoreData);
        
        // Add to skin-specific leaderboard
        const skinRef = ref(database, `leaderboard/skins/${skinKey}`);
        await push(skinRef, scoreData);
        
        console.log('✅ [FIREBASE] Score submitted:', scoreData);
        return true;
    } catch (error) {
        console.error('❌ [FIREBASE] Submit error:', error);
        return false;
    }
}

/**
 * Get global leaderboard (top 100)
 * @param {string} skinFilter - Optional: filter by skin ('all' for global)
 * @returns {Promise<Array>} Top scores
 */
export async function getGlobalLeaderboard(skinFilter = 'all') {
    if (!firebaseEnabled) {
        console.log('ℹ️ [FIREBASE] Not enabled, returning empty');
        return [];
    }
    
    try {
        let leaderboardRef;
        
        if (skinFilter === 'all') {
            leaderboardRef = query(
                ref(database, 'leaderboard/global'),
                orderByChild('score'),
                limitToLast(100)
            );
        } else {
            leaderboardRef = query(
                ref(database, `leaderboard/skins/${skinFilter}`),
                orderByChild('score'),
                limitToLast(100)
            );
        }
        
        const snapshot = await get(leaderboardRef);
        
        if (!snapshot.exists()) {
            return [];
        }
        
        const scores = [];
        snapshot.forEach((child) => {
            scores.push({
                id: child.key,
                ...child.val()
            });
        });
        
        // Sort descending by score
        scores.sort((a, b) => b.score - a.score);
        
        console.log(`✅ [FIREBASE] Retrieved ${scores.length} scores for ${skinFilter}`);
        return scores;
    } catch (error) {
        console.error('❌ [FIREBASE] Get leaderboard error:', error);
        return [];
    }
}

/**
 * Subscribe to real-time leaderboard updates
 * @param {Function} callback - Called when leaderboard updates
 * @param {string} skinFilter - Optional: filter by skin
 */
export function subscribeToLeaderboard(callback, skinFilter = 'all') {
    if (!firebaseEnabled) {
        console.log('ℹ️ [FIREBASE] Not enabled, skipping subscription');
        return () => {}; // Return empty unsubscribe function
    }
    
    try {
        let leaderboardRef;
        
        if (skinFilter === 'all') {
            leaderboardRef = query(
                ref(database, 'leaderboard/global'),
                orderByChild('score'),
                limitToLast(100)
            );
        } else {
            leaderboardRef = query(
                ref(database, `leaderboard/skins/${skinFilter}`),
                orderByChild('score'),
                limitToLast(100)
            );
        }
        
        const unsubscribe = onValue(leaderboardRef, (snapshot) => {
            if (!snapshot.exists()) {
                callback([]);
                return;
            }
            
            const scores = [];
            snapshot.forEach((child) => {
                scores.push({
                    id: child.key,
                    ...child.val()
                });
            });
            
            scores.sort((a, b) => b.score - a.score);
            callback(scores);
        });
        
        console.log('✅ [FIREBASE] Subscribed to leaderboard updates');
        return unsubscribe;
    } catch (error) {
        console.error('❌ [FIREBASE] Subscribe error:', error);
        return () => {};
    }
}

/**
 * Get player's rank in global leaderboard
 * @param {number} score - Player's score
 * @param {string} skinFilter - Optional: filter by skin
 * @returns {Promise<number>} Player's rank (1-based)
 */
export async function getPlayerRank(score, skinFilter = 'all') {
    if (!firebaseEnabled) return 0;
    
    try {
        const leaderboard = await getGlobalLeaderboard(skinFilter);
        const rank = leaderboard.findIndex(entry => entry.score <= score) + 1;
        return rank || leaderboard.length + 1;
    } catch (error) {
        console.error('❌ [FIREBASE] Get rank error:', error);
        return 0;
    }
}

// Check if Firebase is enabled
export function isFirebaseEnabled() {
    return firebaseEnabled;
}
