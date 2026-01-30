// ===== FIREBASE CONFIGURATION =====
// This file handles all Firebase operations for the Space Defender game

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, limit, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ===== FIREBASE CONFIG =====
// ⚠️ IMPORTANT: Replace these values with your Firebase project configuration!
// Get these from Firebase Console → Project Settings → Your apps
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Check if Firebase is configured
const isConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY";

// ===== FIREBASE INITIALIZATION =====
let app = null;
let db = null;

if (isConfigured) {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        console.log('🔥 [FIREBASE] Initialized successfully');
    } catch (error) {
        console.error('❌ [FIREBASE] Initialization error:', error);
    }
} else {
    console.warn('⚠️ [FIREBASE] Not configured. Using local storage only.');
    console.warn('ℹ️ [FIREBASE] Replace YOUR_API_KEY in firebase-config.js with your Firebase credentials');
}

// ===== USER ID MANAGEMENT =====
function getUserId() {
    let userId = localStorage.getItem('space-defender-user-id');
    
    if (!userId) {
        // Create new unique user ID: user_timestamp_randomString
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 15);
        userId = `user_${timestamp}_${randomStr}`;
        localStorage.setItem('space-defender-user-id', userId);
        console.log('🆔 [FIREBASE] New user ID created:', userId);
    } else {
        console.log('🆔 [FIREBASE] Existing user ID:', userId);
    }
    
    return userId;
}

const currentUserId = getUserId();

// ===== FIREBASE SERVICE =====
export const firebaseService = {
    isAvailable: isConfigured && db !== null,
    userId: currentUserId,
    
    /**
     * Save user progress to Firestore
     * @param {Object} progressData - { unlockedSkins, maxLevel, keyBindings }
     * @returns {Promise<boolean>} Success status
     */
    async saveUserProgress(progressData) {
        if (!this.isAvailable) {
            console.log('⚠️ [FIREBASE] Not available, skipping save');
            return false;
        }
        
        try {
            const userRef = doc(db, 'users', this.userId);
            const data = {
                ...progressData,
                lastUpdated: Timestamp.now()
            };
            
            await setDoc(userRef, data, { merge: true });
            console.log('✅ [FIREBASE] User progress saved');
            return true;
        } catch (error) {
            console.error('❌ [FIREBASE] Error saving progress:', error);
            return false;
        }
    },
    
    /**
     * Load user progress from Firestore
     * @returns {Promise<Object|null>} User progress data or null
     */
    async loadUserProgress() {
        if (!this.isAvailable) {
            console.log('⚠️ [FIREBASE] Not available, cannot load');
            return null;
        }
        
        try {
            const userRef = doc(db, 'users', this.userId);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                console.log('✅ [FIREBASE] User progress loaded');
                return userSnap.data();
            } else {
                console.log('ℹ️ [FIREBASE] No user progress found (new user)');
                return null;
            }
        } catch (error) {
            console.error('❌ [FIREBASE] Error loading progress:', error);
            return null;
        }
    },
    
    /**
     * Save score to global leaderboard
     * @param {string} skinKey - Ship skin used
     * @param {number} score - Score achieved
     * @param {number} level - Level reached
     * @returns {Promise<boolean>} Success status
     */
    async saveScore(skinKey, score, level) {
        if (!this.isAvailable) {
            console.log('⚠️ [FIREBASE] Not available, skipping score save');
            return false;
        }
        
        try {
            const leaderboardRef = collection(db, 'leaderboards');
            const scoreData = {
                userId: this.userId,
                skinKey: skinKey,
                score: score,
                level: level,
                timestamp: Timestamp.now(),
                date: new Date().toLocaleDateString('he-IL')
            };
            
            await setDoc(doc(leaderboardRef), scoreData);
            console.log('✅ [FIREBASE] Score saved to global leaderboard');
            return true;
        } catch (error) {
            console.error('❌ [FIREBASE] Error saving score:', error);
            return false;
        }
    },
    
    /**
     * Get global leaderboard
     * @param {string} skinKey - Filter by skin ('overall' for all skins)
     * @param {number} limitCount - Number of entries to retrieve
     * @returns {Promise<Array>} Array of leaderboard entries
     */
    async getGlobalLeaderboard(skinKey = 'overall', limitCount = 10) {
        if (!this.isAvailable) {
            console.log('⚠️ [FIREBASE] Not available, cannot load leaderboard');
            return [];
        }
        
        try {
            const leaderboardRef = collection(db, 'leaderboards');
            let q;
            
            if (skinKey === 'overall') {
                // Get all entries, sorted by score
                q = query(
                    leaderboardRef,
                    orderBy('score', 'desc'),
                    limit(limitCount)
                );
            } else {
                // Get entries for specific skin
                q = query(
                    leaderboardRef,
                    where('skinKey', '==', skinKey),
                    orderBy('score', 'desc'),
                    limit(limitCount)
                );
            }
            
            const querySnapshot = await getDocs(q);
            const leaderboard = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                leaderboard.push({
                    score: data.score,
                    level: data.level,
                    skin: data.skinKey,
                    date: data.date,
                    userId: data.userId
                });
            });
            
            console.log(`✅ [FIREBASE] Loaded ${leaderboard.length} leaderboard entries for ${skinKey}`);
            return leaderboard;
        } catch (error) {
            console.error('❌ [FIREBASE] Error loading leaderboard:', error);
            
            // Check if error is about missing index
            if (error.message && error.message.includes('index')) {
                console.error('🔍 [FIREBASE] Missing index! Create index in Firebase Console:');
                console.error('   Collection: leaderboards');
                console.error('   Fields: skinKey (Ascending), score (Descending)');
            }
            
            return [];
        }
    }
};

// Export for debugging
window.firebaseService = firebaseService;
console.log('🔥 [FIREBASE] Service initialized. Available:', firebaseService.isAvailable);
