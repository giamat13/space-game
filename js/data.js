// DOM Elements
export const DOM = {
    wrapper: document.getElementById('game-wrapper'),
    player: document.getElementById('player'),
    playerSpriteContainer: document.getElementById('player-sprite-container'),
    playerHpFill: document.getElementById('player-hp'),
    topHpBar: document.getElementById('top-hp-bar'),
    hpText: document.getElementById('hp-text'),
    scoreEl: document.getElementById('score'),
    levelEl: document.getElementById('level'),
    coinsEl: document.getElementById('coins'),
    coinsEarnedEl: document.getElementById('coins-earned'),
    overlay: document.getElementById('overlay'),
    ammoBar: document.getElementById('top-ammo-bar'),
    ammoText: document.getElementById('ammo-text')
};

import { t, tf } from './i18n.js';

// Import Firestore sync functions
import {
    syncUnlockedSkins,
    normalizeSkins,
    syncMaxLevel,
    saveScoreToCloud,
    isBetterRun,
    unlockSkinInCloud,
    syncCoins,
    syncUpgrades,
    pushShopState,
    forceSetCoins,
    saveSpeedrunToCloud,
    getSpeedrunLeaderboardFromCloud,
    syncAchievements,
    syncKeyBindings,
    syncGameRules,
    syncDeviceMode,
    syncCustomSpeedrunGoals,
    sendCoinsToFriend,
    claimPendingTransfers
} from './firestore-sync.js';

export { sendCoinsToFriend, claimPendingTransfers };

import { SHIPS } from './art.js';

// Skin Configuration
export const SKINS = {
    classic: {
        get svg() { return SHIPS.classic; },
        color: '#00f2ff',
        unlockLevel: 0,
        get name() { return t('skinClassic'); },
        fireRate: 1.0,
        bulletSpeed: 1.0,
        bulletDamage: 1.0,
        get description() { return t('skinDescClassic'); }
    },
    interceptor: {
        get svg() { return SHIPS.interceptor; },
        color: '#ff00ea',
        unlockLevel: 0,
        get name() { return t('skinInterceptor'); },
        fireRate: 1.0,
        bulletSpeed: 1.0,
        bulletDamage: 1.0,
        get description() { return t('skinDescInterceptor'); }
    },
    tanker: {
        get svg() { return SHIPS.tanker; },
        color: '#2ecc71',
        unlockLevel: 0,
        get name() { return t('skinTanker'); },
        fireRate: 1.0,
        bulletSpeed: 1.0,
        bulletDamage: 1.0,
        get description() { return t('skinDescTanker'); }
    },
    phoenix: {
        get svg() { return SHIPS.phoenix; },
        color: '#ff6b35',
        unlockLevel: 3,
        get name() { return t('skinPhoenix'); },
        fireRate: 1.3,
        bulletSpeed: 1.2,
        bulletDamage: 1.5,
        get description() { return t('skinDescPhoenix'); }
    },
    vortex: {
        get svg() { return SHIPS.vortex; },
        color: '#9b59b6',
        unlockLevel: 5,
        get name() { return t('skinVortex'); },
        fireRate: 1.6,
        bulletSpeed: 1.4,
        bulletDamage: 2.0,
        maxHP: 400,
        get description() { return t('skinDescVortex'); }
    },
    joker: {
        get svg() { return SHIPS.joker; },
        color: '#ff4500',
        unlockLevel: 10,
        get name() { return t('skinJoker'); },
        fireRate: 2.0,
        bulletSpeed: 1.6,
        bulletDamage: 3.0,
        maxHP: 600,
        isFire: true,
        get description() { return t('skinDescJoker'); }
    },
    baby_dragon: {
        svg: `<img src="assets/dragon.png" style="width:100%; height:100%; object-fit:contain; filter: drop-shadow(0 0 15px #ffaa33);" />`,
        color: '#ffaa33',
        unlockLevel: 25,        // still used for the starting level of a run
        unlockBoss: 'twins',    // but the ship itself is won by defeating this boss (js/bosses.js)
        get name() { return t('skinDragon'); },
        fireRate: 2.2,
        bulletSpeed: 1.8,
        bulletDamage: 5.0,
        maxHP: 800,
        isFire: true,
        get description() { return t('skinDescDragon'); }
    }
};

// Ingredient types
export const INGREDIENT_TYPES = [
    { color: '#f1c40f', name: 'Cheese' },
    { color: '#e74c3c', name: 'Tomato' },
    { color: '#27ae60', name: 'Lettuce' },
    { color: '#6d4c41', name: 'Patty' }
];

// Current skin
export let currentSkinKey = 'classic';
export function setCurrentSkin(key) {
    console.log(`🎨 [SKIN] Setting current skin to: ${key}`);
    currentSkinKey = key;
}

// Cookie Management
export function setCookie(name, value, days = 365) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
    console.log(`🍪 [COOKIE] Saved ${name}`);
}

export function getCookie(name) {
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

// Key Bindings
export let keyBindings = {
    shoot: 'Space',
    ability: 'KeyB',
    rightClickAbility: true,
    controlType: 'mouse' // 'mouse' or 'arrows'
};

// ===== SPEEDRUN GOALS =====
export const SPEEDRUN_GOALS = [
    { key: 'score_10k', get label() { return tf('goalPts', { n: (10_000).toLocaleString() }); }, icon: '🎯', type: 'score', target: 10_000 },
    { key: 'score_100k', get label() { return tf('goalPts', { n: (100_000).toLocaleString() }); }, icon: '🎯', type: 'score', target: 100_000 },
    { key: 'score_1m', get label() { return tf('goalPts', { n: (1_000_000).toLocaleString() }); }, icon: '🎯', type: 'score', target: 1_000_000 },
    { key: 'level_10', get label() { return tf('goalLevel', { n: 10 }); }, icon: '📈', type: 'level', target: 10 },
    { key: 'level_50', get label() { return tf('goalLevel', { n: 50 }); }, icon: '📈', type: 'level', target: 50 },
    { key: 'bosses_1', get label() { return tf('goalBosses', { n: 1 }); }, icon: '👑', type: 'boss', target: 1 },
    { key: 'bosses_5', get label() { return tf('goalBosses', { n: 5 }); }, icon: '👑', type: 'boss', target: 5 },
    { key: 'bosses_10', get label() { return tf('goalBosses', { n: 10 }); }, icon: '👑', type: 'boss', target: 10 },
    { key: 'level_100', get label() { return tf('goalLevel', { n: 100 }); }, icon: '📈', type: 'level', target: 100 },
];

export function getCustomSpeedrunGoals() {
    const saved = getCookie('customSpeedrunGoals');
    const goals = saved ? JSON.parse(saved) : [];
    // Labels are derived at read time so they follow the current UI language.
    return goals.map(g => ({ ...g, label: g.type === 'score'
        ? tf('goalPts', { n: Number(g.target).toLocaleString() })
        : tf('goalLevel', { n: g.target }) }));
}

export function addCustomSpeedrunGoal(type, target) {
    const goals = getCustomSpeedrunGoals();
    const key = `custom_${type}_${target}`;
    if (goals.find(g => g.key === key)) return null;
    const label = type === 'score' ? tf('goalPts', { n: Number(target).toLocaleString() }) : tf('goalLevel', { n: target });
    const goal = { key, label, icon: '⭐', type, target: Number(target) };
    goals.push(goal);
    setCookie('customSpeedrunGoals', JSON.stringify(goals));
    // Sync to cloud (fire and forget)
    syncCustomSpeedrunGoals(goals).catch(e => console.warn('⚠️ [SPEEDRUN] Cloud sync failed:', e));
    return goal;
}

export function removeCustomSpeedrunGoal(key) {
    const goals = getCustomSpeedrunGoals().filter(g => g.key !== key);
    setCookie('customSpeedrunGoals', JSON.stringify(goals));
    // Sync to cloud (fire and forget)
    syncCustomSpeedrunGoals(goals).catch(e => console.warn('⚠️ [SPEEDRUN] Cloud sync failed:', e));
}

export function getSpeedrunLeaderboard(goalKey) {
    try { return JSON.parse(localStorage.getItem(`sr_lb_${goalKey}`) || '[]'); } catch { return []; }
}

export function saveSpeedrunResult(goalKey, entry) {
    // Local table: one entry per player, replaced only by a faster time.
    let lb = getSpeedrunLeaderboard(goalKey);
    const mine = lb.find(e => e.userName === entry.userName);
    if (!mine || entry.time < mine.time) {
        lb = lb.filter(e => e.userName !== entry.userName);
        lb.push(entry);
    }
    lb.sort((a, b) => a.time - b.time);
    lb = lb.slice(0, 10);
    localStorage.setItem(`sr_lb_${goalKey}`, JSON.stringify(lb));
    return saveSpeedrunToCloud(goalKey, entry)
        .catch(() => ({ ok: false, reason: 'error', queued: false }));
}

// Game Rules
export let gameRules = {
    enemiesShootThroughAsteroids: true,
    playerShootThroughAsteroids: false
};

// Device Mode
export let deviceMode = {
    isMobile: false,
    isAutoDetected: true
};

// Auto-detect mobile on load
export function detectMobileDevice() {
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const isSmallScreen = window.innerWidth <= 768;
    deviceMode.isMobile = isTouchDevice && isSmallScreen;
    deviceMode.isAutoDetected = true;
    console.log(`📱 [DEVICE] Auto-detected: ${deviceMode.isMobile ? 'Mobile' : 'Desktop'}`);
}

// Mobile Mode Detection
export let isMobileMode = false;

export function detectMobileMode() {
    // Check for touch support
    const hasTouchScreen = ('ontouchstart' in window) || 
                          (navigator.maxTouchPoints > 0) || 
                          (navigator.msMaxTouchPoints > 0);
    
    // Check for small screen
    const isSmallScreen = window.innerWidth <= 768;
    
    // Check user agent (additional check)
    const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    isMobileMode = hasTouchScreen && (isSmallScreen || isMobileUserAgent);
    
    console.log(`📱 [MOBILE] Detection complete:`, {
        hasTouchScreen,
        isSmallScreen,
        isMobileUserAgent,
        result: isMobileMode ? 'MOBILE MODE' : 'DESKTOP MODE'
    });
    
    return isMobileMode;
}

export function loadKeyBindings() {
    console.log('🎮 [KEYS] Loading key bindings...');
    const saved = getCookie('keyBindings');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            keyBindings = { ...keyBindings, ...parsed };
            // If shoot key is missing, derive default from controlType
            if (!keyBindings.shoot) {
                keyBindings.shoot = keyBindings.controlType === 'arrows' ? 'ArrowUp' : 'Space';
            }
            console.log('✅ [KEYS] Loaded:', keyBindings);
        } catch (e) {
            console.error('❌ [KEYS] Error:', e);
        }
    }
}

export function saveKeyBindings() {
    setCookie('keyBindings', JSON.stringify(keyBindings));
    console.log('💾 [KEYS] Saved:', keyBindings);
    // Sync to cloud (fire and forget)
    syncKeyBindings(keyBindings).catch(e => console.warn('⚠️ [KEYS] Cloud sync failed:', e));
}

export function setKeyBinding(action, value) {
    keyBindings[action] = value;
    saveKeyBindings();
}

export function loadGameRules() {
    console.log('📜 [RULES] Loading game rules...');
    const saved = getCookie('gameRules');
    if (saved) {
        try {
            gameRules = JSON.parse(saved);
            console.log('✅ [RULES] Loaded:', gameRules);
        } catch (e) {
            console.error('❌ [RULES] Error:', e);
        }
    }
}

export function saveGameRules() {
    setCookie('gameRules', JSON.stringify(gameRules));
    console.log('💾 [RULES] Saved:', gameRules);
    // Sync to cloud (fire and forget)
    syncGameRules(gameRules).catch(e => console.warn('⚠️ [RULES] Cloud sync failed:', e));
}

export function setGameRule(rule, value) {
    gameRules[rule] = value;
    saveGameRules();
}

export function loadDeviceMode() {
    console.log('📱 [DEVICE] Loading device mode...');
    const saved = getCookie('deviceMode');
    if (saved) {
        try {
            const savedMode = JSON.parse(saved);
            deviceMode.isMobile = savedMode.isMobile;
            deviceMode.isAutoDetected = savedMode.isAutoDetected || false;
            console.log('✅ [DEVICE] Loaded:', deviceMode);
        } catch (e) {
            console.error('❌ [DEVICE] Error:', e);
            detectMobileDevice();
        }
    } else {
        detectMobileDevice();
    }
}

export function saveDeviceMode() {
    setCookie('deviceMode', JSON.stringify(deviceMode));
    console.log('💾 [DEVICE] Saved:', deviceMode);
    // Sync to cloud (fire and forget)
    syncDeviceMode(deviceMode).catch(e => console.warn('⚠️ [DEVICE] Cloud sync failed:', e));
}

export function setDeviceMode(isMobile, isManual = true) {
    deviceMode.isMobile = isMobile;
    deviceMode.isAutoDetected = !isManual;
    saveDeviceMode();
    console.log(`📱 [DEVICE] Set to: ${isMobile ? 'Mobile' : 'Desktop'} (${isManual ? 'Manual' : 'Auto'})`);
}


// Unlocked Skins Management
export let unlockedSkins = ['classic', 'interceptor', 'tanker'];

export async function loadUnlockedSkins() {
    console.log('📂 [SKINS] Loading unlocked skins...');
    
    // Try to sync with cloud first
    try {
        const cloudSkins = await syncUnlockedSkins();
        if (cloudSkins) {
            // Never drop a ship unlocked while the load was in flight
            unlockedSkins = [...new Set([...cloudSkins, ...unlockedSkins])];
            console.log(`✅ [SKINS] Loaded from cloud:`, unlockedSkins);
            // The skin cards were drawn before this finished; redraw them
            window.__updateSkinOptions?.();
            return;
        }
    } catch (error) {
        console.log('⚠️ [SKINS] Cloud sync failed, using local data');
    }
    
    // Fallback to cookies
    const saved = getCookie('unlockedSkins');
    if (saved) {
        try {
            unlockedSkins = normalizeSkins(JSON.parse(saved));
            console.log(`✅ [SKINS] Loaded from cookies:`, unlockedSkins);
            window.__updateSkinOptions?.();
        } catch (e) {
            console.error('❌ [SKINS] Error:', e);
        }
    }
}

export function refreshUnlockedSkins(skins) {
    // Merge, never replace: a sync that started before an unlock must not remove it
    unlockedSkins = [...new Set([...normalizeSkins(skins), ...unlockedSkins])];
}

export async function unlockSkin(skinKey) {
    if (!unlockedSkins.includes(skinKey)) {
        unlockedSkins.push(skinKey);
        setCookie('unlockedSkins', JSON.stringify(unlockedSkins));
        console.log(`🎉 [SKINS] Unlocked locally: ${skinKey}`);
        
        // Also save to cloud
        try {
            await unlockSkinInCloud(skinKey);
        } catch (error) {
            console.log('⚠️ [SKINS] Cloud unlock failed, local unlock saved');
        }
        
        return true;
    }
    return false;
}

export function isSkinUnlocked(skinKey) {
    return unlockedSkins.includes(skinKey);
}

// Max Level Reached
export function getMaxLevel() {
    const saved = getCookie('maxLevel');
    return saved ? parseInt(saved) : 1;
}

export async function saveMaxLevel(level) {
    const currentMax = getMaxLevel();
    if (level > currentMax) {
        setCookie('maxLevel', level.toString());
        console.log(`📈 [LEVEL] New max saved locally: ${level}`);
        
        // Also save to cloud
        try {
            await syncMaxLevel();
        } catch (error) {
            console.log('⚠️ [LEVEL] Cloud sync failed, local max level saved');
        }
    }
}

// Coins (Money) System
export function getCoins() {
    const saved = getCookie('playerCoins');
    return saved ? parseInt(saved) : 0;
}

export function addCoins(amount) {
    const current = getCoins();
    const newTotal = current + amount;
    setCookie('playerCoins', newTotal.toString());
    if (DOM.coinsEl) DOM.coinsEl.innerText = newTotal;
    if (amount < 0) {
        // Deductions must overwrite cloud, not merge with Math.max
        forceSetCoins(newTotal).catch(() => {});
    } else {
        syncCoins(newTotal).catch(() => {});
    }
    return newTotal;
}

export function initCoinsUI() {
    if (DOM.coinsEl) DOM.coinsEl.innerText = getCoins();
}

// Shop Upgrades
// name/desc are i18n keys (looked up via t() at render time)
export const UPGRADES = {
    dragon_homing_ricochet: {
        key: 'dragon_homing_ricochet',
        nameKey: 'upgDragonHomingName',
        descKey: 'upgDragonHomingDesc',
        cost: 25000,
        skin: 'baby_dragon'
    },
    phoenix_super_feathers: {
        key: 'phoenix_super_feathers',
        nameKey: 'upgPhoenixSuperName',
        descKey: 'upgPhoenixSuperDesc',
        cost: 12000,
        skin: 'phoenix'
    },
    phoenix_homing_feathers: {
        key: 'phoenix_homing_feathers',
        nameKey: 'upgPhoenixHomingName',
        descKey: 'upgPhoenixHomingDesc',
        cost: 20000,
        skin: 'phoenix',
        requires: 'phoenix_super_feathers'
    },
    phoenix_power_feathers: {
        key: 'phoenix_power_feathers',
        nameKey: 'upgPhoenixPowerName',
        descKey: 'upgPhoenixPowerDesc',
        cost: 25000,
        skin: 'phoenix',
        requires: 'phoenix_homing_feathers'
    },
    vortex_cooldown_half: {
        key: 'vortex_cooldown_half',
        nameKey: 'upgVortexCooldownName',
        descKey: 'upgVortexCooldownDesc',
        cost: 20000,
        skin: 'vortex'
    },
    double_score: {
        key: 'double_score',
        nameKey: 'upgDoubleScoreName',
        descKey: 'upgDoubleScoreDesc',
        cost: 300000,
        skin: 'global',
        scoreMultiplier: 2
    },
    score_x4: {
        key: 'score_x4',
        nameKey: 'upgScoreX4Name',
        descKey: 'upgScoreX4Desc',
        cost: 2000000,
        skin: 'global',
        requires: 'double_score',
        scoreMultiplier: 4
    },
    score_x6: {
        key: 'score_x6',
        nameKey: 'upgScoreX6Name',
        descKey: 'upgScoreX6Desc',
        cost: 6000000,
        skin: 'global',
        requires: 'score_x4',
        scoreMultiplier: 6
    },
    score_x8: {
        key: 'score_x8',
        nameKey: 'upgScoreX8Name',
        descKey: 'upgScoreX8Desc',
        cost: 8000000,
        skin: 'global',
        requires: 'score_x6',
        scoreMultiplier: 8
    },
    score_x10: {
        key: 'score_x10',
        nameKey: 'upgScoreX10Name',
        descKey: 'upgScoreX10Desc',
        cost: 10000000,
        skin: 'global',
        requires: 'score_x8',
        scoreMultiplier: 10
    },
    joker_kill_coins: {
        key: 'joker_kill_coins',
        nameKey: 'upgJokerCoinsName',
        descKey: 'upgJokerCoinsDesc',
        cost: 50000,
        skin: 'joker'
    }
};

// ===== HP UPGRADE SYSTEM =====
const HP_PER_LEVEL = 50;
const HP_LEVEL_COSTS = [3000, 6000, 10000, 15000, 21000, 28000, 36000, 45000, 55000, 66000];

export function getHPLevels() {
    const saved = getCookie('hpLevels');
    return saved ? JSON.parse(saved) : {};
}

export function getHPLevel(skinKey) {
    return getHPLevels()[skinKey] || 0;
}

export function getHPUpgradeCost(currentLevel) {
    if (currentLevel >= HP_LEVEL_COSTS.length) return null;
    return HP_LEVEL_COSTS[currentLevel];
}

export function buyHPLevel(skinKey) {
    const levels = getHPLevels();
    const current = levels[skinKey] || 0;
    const cost = getHPUpgradeCost(current);
    if (cost === null) return false;
    const coins = getCoins();
    if (coins < cost) return false;
    addCoins(-cost);
    levels[skinKey] = current + 1;
    setCookie('hpLevels', JSON.stringify(levels));
    pushShopState(levels, getDisabledUpgrades()).catch(() => {});
    return true;
}

export function sellHPLevel(skinKey) {
    const levels = getHPLevels();
    const current = levels[skinKey] || 0;
    if (current <= 0) return false;
    const refund = Math.floor(HP_LEVEL_COSTS[current - 1] * 0.75);
    addCoins(refund);
    levels[skinKey] = current - 1;
    setCookie('hpLevels', JSON.stringify(levels));
    pushShopState(levels, getDisabledUpgrades()).catch(() => {});
    return refund;
}

export function getHPBonus(skinKey) {
    return getHPLevel(skinKey) * HP_PER_LEVEL;
}

export function getOwnedUpgrades() {
    const saved = getCookie('ownedUpgrades');
    return saved ? JSON.parse(saved) : [];
}

export function hasUpgrade(key) {
    return getOwnedUpgrades().includes(key);
}

export function buyUpgrade(key) {
    const upgrade = UPGRADES[key];
    if (!upgrade) return false;
    if (hasUpgrade(key)) return false;
    if (upgrade.requires && !hasUpgrade(upgrade.requires)) return false;
    const coins = getCoins();
    if (coins < upgrade.cost) return false;
    addCoins(-upgrade.cost);
    const owned = getOwnedUpgrades();
    owned.push(key);
    setCookie('ownedUpgrades', JSON.stringify(owned));
    syncUpgrades(owned).catch(() => {});
    return true;
}

export function removeUpgrade(key) {
    const upgrade = UPGRADES[key];
    if (!upgrade) return false;
    const owned = getOwnedUpgrades();
    const idx = owned.indexOf(key);
    if (idx === -1) return false;
    owned.splice(idx, 1);
    setCookie('ownedUpgrades', JSON.stringify(owned));
    // Remove from disabled list too
    const disabled = getDisabledUpgrades();
    const di = disabled.indexOf(key);
    if (di !== -1) { disabled.splice(di, 1); setCookie('disabledUpgrades', JSON.stringify(disabled)); pushShopState(getHPLevels(), disabled).catch(() => {}); }
    const refund = Math.floor(upgrade.cost * 0.75);
    addCoins(refund);
    syncUpgrades(owned, true).catch(() => {});
    return refund;
}

export function getDisabledUpgrades() {
    const saved = getCookie('disabledUpgrades');
    return saved ? JSON.parse(saved) : [];
}

export function disableUpgrade(key) {
    if (!getOwnedUpgrades().includes(key)) return false;
    const disabled = getDisabledUpgrades();
    if (!disabled.includes(key)) { disabled.push(key); setCookie('disabledUpgrades', JSON.stringify(disabled)); pushShopState(getHPLevels(), disabled).catch(() => {}); }
    return true;
}

export function enableUpgrade(key) {
    const disabled = getDisabledUpgrades();
    const idx = disabled.indexOf(key);
    if (idx === -1) return false;
    disabled.splice(idx, 1);
    setCookie('disabledUpgrades', JSON.stringify(disabled));
    pushShopState(getHPLevels(), disabled).catch(() => {});
    return true;
}

export function isUpgradeDisabled(key) {
    return getDisabledUpgrades().includes(key);
}

export function isUpgradeActive(key) {
    return getOwnedUpgrades().includes(key) && !getDisabledUpgrades().includes(key);
}

// Score helper: every score gain goes through here so the score upgrade applies everywhere.
export function addScore(points) {
    const mult = Object.values(UPGRADES)
        .filter(upgrade => upgrade.scoreMultiplier && isUpgradeActive(upgrade.key))
        .reduce((highest, upgrade) => Math.max(highest, upgrade.scoreMultiplier), 1);
    state.score += points * mult;
}

export function resetCoins() {
    setCookie('playerCoins', '0');
    if (DOM.coinsEl) DOM.coinsEl.innerText = 0;
    forceSetCoins(0).catch(() => {});
}

// Leaderboard Management
export function getLeaderboard(skinKey = 'overall') {
    const cookieName = `leaderboard_${skinKey}`;
    const saved = getCookie(cookieName);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            return [];
        }
    }
    return [];
}

export async function saveScore(skinKey, score, level, userName = null, settings = null) {
    console.log(`💾 [SCORE] Saving: ${score} pts, Level ${level}, User: ${userName || 'Anonymous'}`);

    // Save to cookies (local)
    const effectiveName = userName || 'Anonymous';
    let skinLeaderboard = getLeaderboard(skinKey);
    const newEntry = {
        score,
        level,
        userName: effectiveName,
        date: new Date().toLocaleDateString('he-IL'),
        settings: settings || null
    };
    const isBetter = isBetterRun;
    const existingSkinBest = skinLeaderboard.find(e => e.userName === effectiveName);
    if (!existingSkinBest || isBetter(newEntry, existingSkinBest)) {
        skinLeaderboard = skinLeaderboard.filter(e => e.userName !== effectiveName);
        skinLeaderboard.push(newEntry);
    }
    skinLeaderboard.sort((a, b) => ((b.level || 0) - (a.level || 0)) || (b.score - a.score));
    skinLeaderboard = skinLeaderboard.slice(0, 5);
    setCookie(`leaderboard_${skinKey}`, JSON.stringify(skinLeaderboard));

    let overallLeaderboard = getLeaderboard('overall');
    const overallEntry = {
        score,
        level,
        skin: skinKey,
        userName: effectiveName,
        date: new Date().toLocaleDateString('he-IL'),
        settings: settings || null
    };
    const existingOverallBest = overallLeaderboard.find(e => e.userName === effectiveName);
    if (!existingOverallBest || isBetter(overallEntry, existingOverallBest)) {
        overallLeaderboard = overallLeaderboard.filter(e => e.userName !== effectiveName);
        overallLeaderboard.push(overallEntry);
    }
    overallLeaderboard.sort((a, b) => ((b.level || 0) - (a.level || 0)) || (b.score - a.score));
    overallLeaderboard = overallLeaderboard.slice(0, 5);
    setCookie(`leaderboard_overall`, JSON.stringify(overallLeaderboard));

    // Save to cloud. The result tells the caller what actually happened, so the player
    // can be told (new record / record kept / not saved / playing as a guest).
    try {
        const result = await saveScoreToCloud(skinKey, score, level, userName, settings);
        console.log(result.ok ? '✅ [SCORE] Saved to cloud' : `⚠️ [SCORE] Saved locally only (${result.reason})`);
        return result;
    } catch (error) {
        console.error('⚠️ [SCORE] Cloud save failed; score is saved locally:', error);
        return { ok: false, reason: 'error', queued: false };
    }
}

// Game State
export const state = {
    active: false,
    // ship-control modifiers bosses can apply (see systems.js)
    ctrl: { offset: 0, min: null, max: null, lag: 0, target: null, pointer: null, release: false },
    ammoRate: 1,
    boss: null, bossIndex: null, bossesBeaten: 0, bossLog: [], runHpBonus: 0,
    score: 0,
    level: 1,
    playerX: 0,
    playerHP: 200,
    playerMaxHP: 200,
    lastMouseX: 0,
    lastMouseY: 0,
    bullets: [],
    enemyBullets: [],
    enemies: [],
    asteroids: [],
    burgers: [],
    ingredients: [],
    lightnings: [],
    ammo: 10,
    maxAmmo: 10,
    lastAmmoRecharge: 0,
    speedMult: 1,
    lastSpawn: 0,
    spawnRate: 1400,
    lastShot: 0,
    shotCooldown: 180,
    lastHealScore: 0,
    lastLevelScore: 0,
    burgersEatenAtFullHP: 0,
    isPlayerFat: false,
    currentSkinStats: {
        fireRate: 1.0,
        bulletSpeed: 1.0,
        bulletDamage: 1.0
    },
    specialAbility: {
        ready: true,
        cooldown: 30000,
        lastUsed: 0
    },
    phoenixAbility: {
        ready: true,
        cooldown: 15000,
        lastUsed: 0
    },
    jokerAbility: {
        ready: true,
        cooldown: 30000,
        lastUsed: 0,
        active: false,
        endTime: 0
    },
    dragonAbility: {
        ready: true,
        cooldown: 25000,
        lastUsed: 0,
        invincibleUntil: 0
    },
    isDebugGame: false,
    paused: false,
    startTime: 0,
    coinsEarned: 0,
    speedrunHits: {},
    jokerKills: 0,
    // Which input devices the player actually used this game (for leaderboard)
    inputUsed: { keyboard: false, gamepad: false },
};

// Difficulty curve. Levels 1-20 are deliberately gentle; levels 21-30 ramp smoothly up to the
// original (hard) values, which are unchanged from level 30 onward.
// Past level 30 speed levels off (the old straight line reached speeds where shots skipped
// over the ship), and the pressure moves to damage instead: see dangerForLevel.
export function difficultyForLevel(level) {
    const orig = (l) => ({ mult: l <= 30 ? 1 + (l - 1) * 0.2 : 6.8 + 2.4 * (1 - Math.exp(-(l - 30) / 260)), spawn: Math.max(250, 1400 - (l - 1) * 200) });
    const easy = (l) => ({ mult: 1 + (l - 1) * 0.05, spawn: 1500 - (l - 1) * 40 });
    if (level <= 20) return easy(level);
    if (level >= 30) return orig(level);
    const k = (level - 20) / 10, a = easy(20), b = orig(30);
    return { mult: a.mult + (b.mult - a.mult) * k, spawn: a.spawn + (b.spawn - a.spawn) * k };
}

// How hard everything hits. 1 up to level 30, then it climbs without limit: about 2x at
// level 150, 4.6x at 500 and 8.5x at 1000. With today's ships level 1000 is meant to be
// possible only in theory.
export function dangerForLevel(level) {
    return level <= 30 ? 1 : 1 + (level - 30) / 130;
}
// Regular enemies also get tougher, which slows the climb.
export function enemyHpScale(level) {
    return level <= 30 ? 1 : 1 + (level - 30) / 220;
}

export function resetState() {
    console.log('🔄 [STATE] Resetting game state...');
    state.active = true;
    state.score = 0;
    state.playerX = DOM.wrapper.clientWidth / 2 - 25;

    const skin = SKINS[currentSkinKey];
    const ul = skin.unlockLevel || 0;
    state.startingLevel = Math.max(1, ul - Math.ceil(ul / 3));
    state.level = 1;
    const maxHP = (skin.maxHP || 200) + getHPBonus(currentSkinKey);
    state.playerHP = maxHP;
    state.playerMaxHP = maxHP;
    
    state.bullets = [];
    state.enemyBullets = [];
    state.enemies = [];
    state.asteroids = [];
    state.burgers = [];
    state.ingredients = [];
    const fr = skin.fireRate || 1.0;
    state.maxAmmo = Math.round(10 * fr);
    state.ammo = state.maxAmmo;
    state.lastAmmoRecharge = 0;
    state.lightnings = [];
    state.lastSpawn = Date.now();
    const levelsAboveOne = state.level - 1;
    { const df = difficultyForLevel(state.level); state.spawnRate = df.spawn; state.speedMult = df.mult; }
    state.lastShot = 0;
    state.shotCooldown = 180;
    state.lastHealScore = 0;
    state.lastLevelScore = 0;
    state.burgersEatenAtFullHP = 0;
    state.isPlayerFat = false;
    Object.assign(state.ctrl, { offset: 0, min: null, max: null, lag: 0, target: null, release: false });
    state.ammoRate = 1;
    state.runHpBonus = 0;
    state.specialAbility.ready = true;
    state.specialAbility.lastUsed = 0;
    state.specialAbility.cooldown = (currentSkinKey === 'vortex' && isUpgradeActive('vortex_cooldown_half')) ? 15000 : 30000;
    state.phoenixAbility.ready = true;
    state.phoenixAbility.lastUsed = 0;
    state.jokerAbility.ready = true;
    state.jokerAbility.lastUsed = 0;
    state.jokerAbility.active = false;
    state.jokerKills = 0;
    state.jokerAbility.endTime = 0;
    state.dragonAbility.ready = true;
    state.dragonAbility.lastUsed = 0;
    state.dragonAbility.invincibleUntil = 0;
    state.isDebugGame = false;
    state.paused = false;
    state.startTime = Date.now();
    state.coinsEarned = 0;
    state.speedrunHits = {};
    state.inputUsed = { keyboard: false, gamepad: false };
    if (DOM.coinsEarnedEl) DOM.coinsEarnedEl.innerText = '+0';
    console.log('✅ [STATE] Reset complete');
}