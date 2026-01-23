// lootlocker-manager.js
const LOOTLOCKER_CONFIG = {
    apiKey: 'dev_df9ce3b3713b4394a9a90924d38bd299',
    game_version: '1.0.0',
    leaderboardKey: 'main_leaderboard'
};

let sessionToken = null;
let playerId = null;

// Initialize LootLocker with Guest Session
export async function initLootLocker() {
    console.log('🎮 [LOOTLOCKER] Initializing session...');
    
    try {
        // Generate or retrieve player identifier
        let playerIdentifier = localStorage.getItem('lootlocker_player_id');
        if (!playerIdentifier) {
            playerIdentifier = 'player_' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('lootlocker_player_id', playerIdentifier);
        }
        
        const response = await fetch('https://api.lootlocker.io/game/v2/session/guest', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'LL-Version': '2021-03-01'
            },
            body: JSON.stringify({
                game_key: LOOTLOCKER_CONFIG.apiKey,
                game_version: LOOTLOCKER_CONFIG.game_version,
                player_identifier: playerIdentifier
            })
        });

        const data = await response.json();
        
        if (data.success) {
            sessionToken = data.session_token;
            playerId = data.player_id;
            console.log('✅ [LOOTLOCKER] Session started successfully!', playerId);
            return true;
        } else {
            console.error('❌ [LOOTLOCKER] Session failed:', data);
            return false;
        }
    } catch (error) {
        console.error('❌ [LOOTLOCKER] Init error:', error);
        return false;
    }
}

// Submit score to LootLocker leaderboard
export async function submitScore(score, metadata = {}) {
    if (!sessionToken) {
        console.error('❌ [LOOTLOCKER] No active session');
        return false;
    }

    console.log(`📤 [LOOTLOCKER] Submitting score: ${score}`);
    
    try {
        const response = await fetch(
            `https://api.lootlocker.io/game/leaderboards/${LOOTLOCKER_CONFIG.leaderboardKey}/submit`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-token': sessionToken
                },
                body: JSON.stringify({
                    score: score,
                    metadata: JSON.stringify(metadata)
                })
            }
        );

        const data = await response.json();
        
        if (data.success) {
            console.log('✅ [LOOTLOCKER] Score submitted!', data);
            return true;
        } else {
            console.error('❌ [LOOTLOCKER] Score submission failed:', data);
            return false;
        }
    } catch (error) {
        console.error('❌ [LOOTLOCKER] Submit error:', error);
        return false;
    }
}

// Get top scores from leaderboard
export async function getTopScores(count = 10) {
    if (!sessionToken) {
        console.error('❌ [LOOTLOCKER] No active session');
        return [];
    }

    console.log(`📥 [LOOTLOCKER] Fetching top ${count} scores...`);
    
    try {
        const response = await fetch(
            `https://api.lootlocker.io/game/leaderboards/${LOOTLOCKER_CONFIG.leaderboardKey}/list?count=${count}`,
            {
                method: 'GET',
                headers: {
                    'x-session-token': sessionToken
                }
            }
        );

        const data = await response.json();
        
        if (data.success && data.items) {
            console.log(`✅ [LOOTLOCKER] Received ${data.items.length} scores`);
            return data.items;
        } else {
            console.error('❌ [LOOTLOCKER] Failed to fetch scores:', data);
            return [];
        }
    } catch (error) {
        console.error('❌ [LOOTLOCKER] Fetch error:', error);
        return [];
    }
}

// Set player name (optional)
export async function setPlayerName(name) {
    if (!sessionToken) {
        console.error('❌ [LOOTLOCKER] No active session');
        return false;
    }

    try {
        const response = await fetch('https://api.lootlocker.io/game/player/name', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'x-session-token': sessionToken
            },
            body: JSON.stringify({ name: name })
        });

        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('❌ [LOOTLOCKER] Name update error:', error);
        return false;
    }
}