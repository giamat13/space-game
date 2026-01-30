// ===== FIREBASE LEADERBOARD SYSTEM =====

export async function saveScoreToFirebase(skinKey, score, level, playerName = 'Anonymous') {
    if (!window.firebaseDB) {
        console.warn('⚠️ Firebase not initialized, saving locally only');
        return false;
    }

    try {
        const { collection, addDoc } = window.firebaseModules;
        
        // Save to global leaderboard
        const leaderboardRef = collection(window.firebaseDB, 'leaderboard');
        await addDoc(leaderboardRef, {
            skin: skinKey,
            score: score,
            level: level,
            playerName: playerName,
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString('he-IL')
        });
        
        console.log('✅ [FIREBASE] Score saved to cloud!');
        return true;
    } catch (error) {
        console.error('❌ [FIREBASE] Error saving score:', error);
        return false;
    }
}

export async function getLeaderboardFromFirebase(skinKey = 'overall', limitCount = 10) {
    if (!window.firebaseDB) {
        console.warn('⚠️ Firebase not initialized');
        return [];
    }

    try {
        const { collection, query, orderBy, limit, getDocs, where } = window.firebaseModules;
        
        const leaderboardRef = collection(window.firebaseDB, 'leaderboard');
        let q;
        
        if (skinKey === 'overall') {
            // Get top scores from all skins
            q = query(
                leaderboardRef,
                orderBy('score', 'desc'),
                limit(limitCount)
            );
        } else {
            // Get top scores for specific skin using where clause
            q = query(
                leaderboardRef,
                where('skin', '==', skinKey),
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
                skin: data.skin,
                playerName: data.playerName || 'Anonymous',
                date: data.date
            });
        });
        
        console.log(`✅ [FIREBASE] Loaded ${leaderboard.length} scores for ${skinKey}`);
        return leaderboard;
    } catch (error) {
        console.error('❌ [FIREBASE] Error loading leaderboard:', error);
        return [];
    }
}

export async function getGlobalStats() {
    if (!window.firebaseDB) {
        return null;
    }

    try {
        const { collection, getDocs } = window.firebaseModules;
        
        const leaderboardRef = collection(window.firebaseDB, 'leaderboard');
        const querySnapshot = await getDocs(leaderboardRef);
        
        let totalGames = 0;
        let totalScore = 0;
        let highestScore = 0;
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            totalGames++;
            totalScore += data.score;
            if (data.score > highestScore) {
                highestScore = data.score;
            }
        });
        
        return {
            totalGames,
            averageScore: Math.round(totalScore / totalGames),
            highestScore
        };
    } catch (error) {
        console.error('❌ [FIREBASE] Error loading stats:', error);
        return null;
    }
}
