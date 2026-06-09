// ===== GAME ANALYTICS & FULL EVENT LOGGING =====
// שומר נתונים מסיביים על כל משחק + לוג מלא של כל אירוע
// מבנה Firebase:
//   gameSessions/{sessionId}          – סיכום המשחק
//   gameSessions/{sessionId}/logs     – כל האירועים הכרונולוגיים

import {
    getFirestore,
    doc,
    setDoc,
    addDoc,
    collection,
    serverTimestamp,
    writeBatch
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// ===== INIT =====
let db, auth;

function ensureDb() {
    if (db) return true;
    try {
        const app = getApp();
        db = getFirestore(app);
        auth = getAuth(app);
        return true;
    } catch (e) {
        console.error('❌ [ANALYTICS] Firebase not available:', e);
        return false;
    }
}

// ===== SESSION STATE =====
// כל המשתנים האלה מאופסים ב-startAnalyticsSession()

let sessionId = null;           // מזהה ייחודי למשחק הנוכחי
let sessionStartTime = null;    // Date.now() בתחילת משחק
let currentLevel = 1;
let shotsFired = 0;
let shotsHit = 0;               // ניתן לעדכן מ-updates.js
let totalDamageDealt = 0;
let totalDamageTaken = 0;
let enemiesKilled = { red: 0, orange: 0, green: 0, blue: 0 };
let abilitiesUsed = {};         // { skinAbilityName: count }
let burstersEaten = 0;
let ingredientsCollected = 0;
let healEvents = 0;
let levelTimestamps = [];       // [{ level, enteredAt, duration }]
let levelEnterTime = Date.now();
let pauseEvents = [];           // [{ pausedAt, resumedAt, duration }]
let pauseStart = null;
let totalPauseTime = 0;
let peakScore = 0;
let deathCause = null;          // 'enemy_bullet' | 'enemy_collision' | 'asteroid'
let asteroidsDestroyed = 0;
let powerupsCollected = 0;
let friendlyFireEvents = 0;     // אויב שיורה על אויב
let chaoticKills = 0;           // אויב כאוטי שהורג אויב
let comboMultiplier = 1;
let maxComboReached = 1;
let skinKey = 'classic';
let userName = 'Anonymous';
let deviceInfo = {};

// לוג האירועים – נאסף בזיכרון ונשלח בבאץ' בסוף המשחק
// כל רשומה: { t (ms מתחילת משחק), type, ...data }
let eventLog = [];

// פונקציית עזר: הוסף אירוע ללוג
function logEvent(type, data = {}) {
    if (!sessionId) return;
    const t = sessionStartTime ? Date.now() - sessionStartTime : 0;
    eventLog.push({ t, type, ...data });
}

// ===== PUBLIC API =====

/**
 * קרא בתחילת כל משחק (מ-initGame ב-main.js)
 * @param {string} skin  - מפתח הסקין
 * @param {string} user  - שם המשתמש
 * @param {object} device - { isMobile, controlType, ... }
 */
export function startAnalyticsSession(skin, user, device = {}) {
    sessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStartTime = Date.now();
    currentLevel = 1;
    shotsFired = 0;
    shotsHit = 0;
    totalDamageDealt = 0;
    totalDamageTaken = 0;
    enemiesKilled = { red: 0, orange: 0, green: 0, blue: 0 };
    abilitiesUsed = {};
    burstersEaten = 0;
    ingredientsCollected = 0;
    healEvents = 0;
    levelTimestamps = [];
    levelEnterTime = Date.now();
    pauseEvents = [];
    pauseStart = null;
    totalPauseTime = 0;
    peakScore = 0;
    deathCause = null;
    asteroidsDestroyed = 0;
    powerupsCollected = 0;
    friendlyFireEvents = 0;
    chaoticKills = 0;
    maxComboReached = 1;
    comboMultiplier = 1;
    skinKey = skin || 'classic';
    userName = user || 'Anonymous';
    deviceInfo = device;
    eventLog = [];

    logEvent('game_start', {
        skin,
        userName: user,
        device,
        timestamp: new Date().toISOString()
    });

    console.log(`📊 [ANALYTICS] Session started: ${sessionId}`);
}

// ===== מעקב ירי =====

export function trackShot(x, y, damage) {
    if (!sessionId) return;
    shotsFired++;
    logEvent('shot_fired', { x: Math.round(x), y: Math.round(y), damage });
}

export function trackShotHit(enemyType, damage, enemyHP, enemyMaxHP) {
    if (!sessionId) return;
    shotsHit++;
    totalDamageDealt += damage;
    logEvent('shot_hit', { enemyType, damage, enemyHP: Math.round(enemyHP), enemyMaxHP });
}

// ===== מעקב נזק לשחקן =====

export function trackDamageTaken(amount, source, playerHPBefore, playerHPAfter) {
    if (!sessionId) return;
    totalDamageTaken += amount;
    logEvent('player_damaged', {
        amount,
        source,           // 'enemy_bullet' | 'enemy_collision' | 'asteroid_collision'
        hpBefore: Math.round(playerHPBefore),
        hpAfter: Math.round(playerHPAfter),
        level: currentLevel
    });
}

// ===== מעקב ריפוי =====

export function trackHeal(amount, source, playerHPBefore, playerHPAfter) {
    if (!sessionId) return;
    healEvents++;
    logEvent('player_healed', {
        amount: Math.round(amount),
        source,           // 'level_up' | 'burger' | 'ingredient' | 'ability'
        hpBefore: Math.round(playerHPBefore),
        hpAfter: Math.round(playerHPAfter)
    });
}

// ===== מעקב הריגת אויב =====

export function trackEnemyKilled(type, score, level, method = 'bullet') {
    if (!sessionId) return;
    enemiesKilled[type] = (enemiesKilled[type] || 0) + 1;
    logEvent('enemy_killed', { type, score, level, method });
}

// ===== מעקב ירי ידידותי / כאוטי =====

export function trackFriendlyFire(shooterType, victimType, damage) {
    if (!sessionId) return;
    friendlyFireEvents++;
    logEvent('friendly_fire', { shooterType, victimType, damage });
}

export function trackChaoticKill(victimType) {
    if (!sessionId) return;
    chaoticKills++;
    logEvent('chaotic_kill', { victimType });
}

// ===== מעקב אסטרואידים =====

export function trackAsteroidDestroyed(method = 'bullet') {
    if (!sessionId) return;
    asteroidsDestroyed++;
    logEvent('asteroid_destroyed', { method });
}

// ===== מעקב כוח =====

export function trackAbilityUsed(abilityName, level, playerHP) {
    if (!sessionId) return;
    abilitiesUsed[abilityName] = (abilitiesUsed[abilityName] || 0) + 1;
    logEvent('ability_used', {
        ability: abilityName,   // 'vortex_laser' | 'phoenix_feathers' | 'joker_chaos' | 'dragon_fire'
        level,
        playerHP: Math.round(playerHP),
        useCount: abilitiesUsed[abilityName]
    });
}

// ===== מעקב פריטים =====

export function trackBurgerEaten(hpGain, playerHPBefore, playerHPAfter, becameFat) {
    if (!sessionId) return;
    burstersEaten++;
    logEvent('burger_eaten', {
        hpGain: Math.round(hpGain),
        hpBefore: Math.round(playerHPBefore),
        hpAfter: Math.round(playerHPAfter),
        becameFat
    });
}

export function trackIngredientCollected(type, effect, value) {
    if (!sessionId) return;
    ingredientsCollected++;
    logEvent('ingredient_collected', { type, effect, value });
}

export function trackPowerupCollected(type) {
    if (!sessionId) return;
    powerupsCollected++;
    logEvent('powerup_collected', { type });
}

// ===== מעקב שלבים =====

export function trackLevelUp(newLevel, score, playerHP, playerMaxHP) {
    if (!sessionId) return;
    const now = Date.now();
    const duration = now - levelEnterTime;

    // רשום את השלב שהסתיים
    levelTimestamps.push({
        level: newLevel - 1,
        enteredAt: levelEnterTime - sessionStartTime,
        durationMs: duration
    });

    levelEnterTime = now;
    currentLevel = newLevel;

    logEvent('level_up', {
        level: newLevel,
        score,
        playerHP: Math.round(playerHP),
        playerMaxHP,
        prevLevelDurationMs: duration,
        shotsFiredSoFar: shotsFired,
        totalDamageTakenSoFar: Math.round(totalDamageTaken)
    });
}

// ===== מעקב הפסקה =====

export function trackPauseStart() {
    if (!sessionId) return;
    pauseStart = Date.now();
    logEvent('game_paused');
}

export function trackPauseEnd() {
    if (!sessionId) return;
    if (!pauseStart) return;
    const pauseDuration = Date.now() - pauseStart;
    totalPauseTime += pauseDuration;
    pauseEvents.push({ pausedAt: pauseStart - sessionStartTime, durationMs: pauseDuration });
    pauseStart = null;
    logEvent('game_resumed', { pauseDurationMs: pauseDuration });
}

// ===== מעקב ציון =====

export function trackScoreUpdate(score) {
    if (!sessionId) return;
    if (score > peakScore) peakScore = score;
}

// ===== מעקב מוות =====

export function trackDeath(cause, finalHP, finalScore, finalLevel) {
    if (!sessionId) return;
    deathCause = cause;
    logEvent('player_died', {
        cause,           // 'enemy_bullet' | 'enemy_collision' | 'asteroid'
        finalHP: Math.round(finalHP),
        finalScore,
        finalLevel
    });
}

// ===== שמירה ל-FIREBASE בסוף משחק =====

/**
 * קרא בסוף כל משחק (מ-damagePlayer / systems.js לאחר state.active = false)
 * @param {object} finalState  - מצב המשחק הסופי (score, level, ...)
 * @param {object} settings    - הגדרות המשחק שנשמרות גם ב-leaderboard
 */
export async function saveAnalyticsToCloud(finalState, settings = {}) {
    if (!sessionId) {
        console.warn('⚠️ [ANALYTICS] No active session to save');
        return false;
    }
    if (!ensureDb()) return false;

    const userId = auth?.currentUser?.uid || 'anonymous';
    const now = Date.now();
    const gameDurationMs = now - sessionStartTime - totalPauseTime; // זמן משחק אמיתי ללא הפסקות

    // סיים את השלב האחרון
    const lastLevelDuration = now - levelEnterTime;
    levelTimestamps.push({
        level: finalState.level,
        enteredAt: levelEnterTime - sessionStartTime,
        durationMs: lastLevelDuration
    });

    // --- חישוב נתונים נגזרים ---
    const totalEnemiesKilled = Object.values(enemiesKilled).reduce((a, b) => a + b, 0);
    const accuracy = shotsFired > 0 ? Math.round((shotsHit / shotsFired) * 100) : 0;
    const avgLevelDuration = levelTimestamps.length > 0
        ? Math.round(levelTimestamps.reduce((s, l) => s + l.durationMs, 0) / levelTimestamps.length)
        : gameDurationMs;
    const fastestLevel = levelTimestamps.length > 0
        ? levelTimestamps.reduce((min, l) => l.durationMs < min.durationMs ? l : min)
        : null;
    const slowestLevel = levelTimestamps.length > 0
        ? levelTimestamps.reduce((max, l) => l.durationMs > max.durationMs ? l : max)
        : null;
    const totalAbilitiesUsed = Object.values(abilitiesUsed).reduce((a, b) => a + b, 0);
    const scorePerMinute = gameDurationMs > 0
        ? Math.round((finalState.score / gameDurationMs) * 60000)
        : 0;
    const damageEfficiency = totalDamageTaken > 0
        ? Math.round((totalDamageDealt / totalDamageTaken) * 100) / 100
        : totalDamageDealt;

    // --- סיכום המשחק ---
    const sessionSummary = {
        // מזהים
        sessionId,
        userId,
        userName,
        skin: skinKey,

        // תוצאות סופיות
        finalScore: finalState.score,
        finalLevel: finalState.level,
        peakScore,
        deathCause: deathCause || 'unknown',

        // זמנים
        startedAt: new Date(sessionStartTime).toISOString(),
        endedAt: new Date(now).toISOString(),
        gameDurationMs,
        totalPauseTimeMs: totalPauseTime,
        realPlaytimeMs: gameDurationMs,
        pauseCount: pauseEvents.length,

        // שלבים
        levelTimestamps,
        avgLevelDurationMs: avgLevelDuration,
        fastestLevel: fastestLevel ? { level: fastestLevel.level, ms: fastestLevel.durationMs } : null,
        slowestLevel: slowestLevel ? { level: slowestLevel.level, ms: slowestLevel.durationMs } : null,

        // ירי ודיוק
        shotsFired,
        shotsHit,
        accuracy,         // אחוז
        totalDamageDealt: Math.round(totalDamageDealt),
        totalDamageTaken: Math.round(totalDamageTaken),
        damageEfficiency, // יחס damage dealt / taken

        // אויבים
        enemiesKilled,
        totalEnemiesKilled,
        asteroidsDestroyed,
        friendlyFireEvents,
        chaoticKills,

        // כוחות
        abilitiesUsed,
        totalAbilitiesUsed,

        // פריטים
        burstersEaten,
        ingredientsCollected,
        powerupsCollected,
        healEvents,

        // סטטיסטיקות נוספות
        scorePerMinute,
        maxComboReached,

        // הגדרות המשחק
        settings,
        device: deviceInfo,

        // Firebase
        savedAt: serverTimestamp(),
        logCount: eventLog.length
    };

    try {
        // 1. שמור את סיכום המשחק
        const sessionRef = doc(db, 'gameSessions', sessionId);
        await setDoc(sessionRef, sessionSummary);
        console.log(`✅ [ANALYTICS] Session summary saved: ${sessionId}`);

        // 2. שמור את הלוג המלא בבאץ'ים (Firestore מגביל 500 פעולות לבאץ')
        const logsRef = collection(db, 'gameSessions', sessionId, 'logs');
        const BATCH_SIZE = 400;
        for (let i = 0; i < eventLog.length; i += BATCH_SIZE) {
            const batch = writeBatch(db);
            const chunk = eventLog.slice(i, i + BATCH_SIZE);
            chunk.forEach((event, idx) => {
                const logDocRef = doc(logsRef, `log_${String(i + idx).padStart(6, '0')}`);
                batch.set(logDocRef, event);
            });
            await batch.commit();
        }
        console.log(`✅ [ANALYTICS] ${eventLog.length} log events saved`);

        // 3. עדכן אינדקס מהיר לפי משתמש (לשאילתות עתידיות)
        if (userId !== 'anonymous') {
            const userAnalyticsRef = doc(db, 'userAnalytics', userId, 'sessions', sessionId);
            await setDoc(userAnalyticsRef, {
                sessionId,
                finalScore: finalState.score,
                finalLevel: finalState.level,
                skin: skinKey,
                gameDurationMs,
                accuracy,
                totalEnemiesKilled,
                deathCause: deathCause || 'unknown',
                savedAt: serverTimestamp()
            });
        }

        console.log(`📊 [ANALYTICS] Full save complete for session: ${sessionId}`);
        sessionId = null; // נקה כדי שלא ישמר שוב
        return true;
    } catch (err) {
        console.error('❌ [ANALYTICS] Save failed:', err);
        return false;
    }
}

// ===== עזר: עדכן combo =====
export function trackCombo(multiplier) {
    if (!sessionId) return;
    comboMultiplier = multiplier;
    if (multiplier > maxComboReached) {
        maxComboReached = multiplier;
        logEvent('combo_peak', { multiplier });
    }
}

// ===== חשיפה גלובלית לשימוש מכל מקום =====
window.__analytics = {
    startSession: startAnalyticsSession,
    trackShot,
    trackShotHit,
    trackDamageTaken,
    trackHeal,
    trackEnemyKilled,
    trackFriendlyFire,
    trackChaoticKill,
    trackAsteroidDestroyed,
    trackAbilityUsed,
    trackBurgerEaten,
    trackIngredientCollected,
    trackPowerupCollected,
    trackLevelUp,
    trackPauseStart,
    trackPauseEnd,
    trackScoreUpdate,
    trackDeath,
    trackCombo,
    save: saveAnalyticsToCloud
};
