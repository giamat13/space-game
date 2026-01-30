// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs,
    query,
    orderBy,
    limit,
    where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBwIgrmexMA14opCYdDyEWcZ11tQyCp8kY",
    authDomain: "space-game-kf.firebaseapp.com",
    projectId: "space-game-kf",
    storageBucket: "space-game-kf.firebasestorage.app",
    messagingSenderId: "501931958870",
    appId: "1:501931958870:web:96b1b7216b5a33430c51f7",
    measurementId: "G-XBPPJV0FBE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

console.log('🔥 [FIREBASE] Initialized successfully');

// Generate unique user ID if not exists
function getUserId() {
    let userId = localStorage.getItem('spaceDefenderUserId');
    if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('spaceDefenderUserId', userId);
        console.log('🆔 [FIREBASE] New user ID created:', userId);
    }
    return userId;
}

export const firebaseService = {
    db,
    analytics,
    userId: getUserId(),
    
    async saveUserProgress(data) {
        try {
            const userRef = doc(db, 'users', this.userId);
            await setDoc(userRef, {
                ...data,
                lastUpdated: new Date().toISOString()
            }, { merge: true });
            console.log('✅ [FIREBASE] User progress saved');
            return true;
        } catch (error) {
            console.error('❌ [FIREBASE] Error saving progress:', error);
            return false;
        }
    },
    
    async loadUserProgress() {
        try {
            const userRef = doc(db, 'users', this.userId);
            const docSnap = await getDoc(userRef);
            
            if (docSnap.exists()) {
                console.log('✅ [FIREBASE] User progress loaded');
                return docSnap.data();
            } else {
                console.log('ℹ️ [FIREBASE] No saved progress found');
                return null;
            }
        } catch (error) {
            console.error('❌ [FIREBASE] Error loading progress:', error);
            return null;
        }
    },
    
    async saveScore(skinKey, score, level) {
        try {
            const scoreRef = doc(collection(db, 'leaderboards'));
            await setDoc(scoreRef, {
                userId: this.userId,
                skinKey,
                score,
                level,
                timestamp: new Date().toISOString(),
                date: new Date().toLocaleDateString('he-IL')
            });
            console.log('✅ [FIREBASE] Score saved to leaderboard');
            return true;
        } catch (error) {
            console.error('❌ [FIREBASE] Error saving score:', error);
            return false;
        }
    },
    
    async getGlobalLeaderboard(skinKey = 'overall', limitCount = 10) {
        try {
            const leaderboardRef = collection(db, 'leaderboards');
            let q;
            
            if (skinKey === 'overall') {
                q = query(leaderboardRef, orderBy('score', 'desc'), limit(limitCount));
            } else {
                q = query(
                    leaderboardRef, 
                    where('skinKey', '==', skinKey),
                    orderBy('score', 'desc'), 
                    limit(limitCount)
                );
            }
            
            const querySnapshot = await getDocs(q);
            let scores = [];
            
            querySnapshot.forEach((doc) => {
                scores.push(doc.data());
            });
            
            console.log(`✅ [FIREBASE] Loaded ${scores.length} scores for ${skinKey}`);
            return scores;
        } catch (error) {
            console.error('❌ [FIREBASE] Error loading leaderboard:', error);
            return [];
        }
    }
};

export default firebaseService;
