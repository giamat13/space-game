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
    syncMaxLevel,
    saveScoreToCloud,
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

// Skin Configuration
export const SKINS = {
    classic: {
        svg: `<svg viewBox="0 0 100 100" style="width:100%; height:100%; filter: drop-shadow(0 0 8px #1fd1ee);" stroke-linejoin="round" stroke-linecap="round"><g fill="#1fd1ee" stroke="#07788a" stroke-width="3.6"><path d="M37 38 L10 58 L8 70 L30 58 Z"/><path d="M63 38 L90 58 L92 70 L70 58 Z"/><path d="M50 5 L64 26 L61 52 L71 80 L57 75 L50 95 L43 75 L29 80 L39 52 L36 26 Z"/></g><path d="M34.8 29.3 L49.2 32.9 L37.5 38.3 Z" fill="#111" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/><path d="M40.2 32.9 L44.7 33.4" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><path d="M65.2 29.3 L50.8 32.9 L62.5 38.3 Z" fill="#111" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/><path d="M59.8 32.9 L55.3 33.4" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><circle cx="48" cy="50" r="2.4" fill="#ffe600"/><circle cx="55" cy="60" r="2.4" fill="#ffe600"/><circle cx="44" cy="64" r="2.4" fill="#ffe600"/><circle cx="52" cy="76" r="2.4" fill="#ffe600"/><circle cx="20" cy="60" r="2.4" fill="#ffe600"/><circle cx="80" cy="62" r="2.4" fill="#ffe600"/><path d="M45 46 Q50 49 55 46" fill="none" stroke="#07788a" stroke-width="2"/></svg>`,
        color: '#00f2ff',
        unlockLevel: 0,
        get name() { return t('skinClassic'); },
        fireRate: 1.0,
        bulletSpeed: 1.0,
        bulletDamage: 1.0,
        get description() { return t('skinDescClassic'); }
    },
    interceptor: {
        svg: `<svg viewBox="0 0 100 100" style="width:100%; height:100%; filter: drop-shadow(0 0 8px #d63de0);" stroke-linejoin="round" stroke-linecap="round"><g fill="#d63de0" stroke="#7a1a85" stroke-width="3.6"><path d="M34 44 L16 90 L40 72 Z"/><path d="M66 44 L84 90 L60 72 Z"/><path d="M50 4 L58 22 L74 14 L68 42 L60 72 L50 92 L40 72 L32 42 L26 14 L42 22 Z"/></g><path d="M34.8 35.3 L49.2 38.9 L37.5 44.3 Z" fill="#111" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/><path d="M40.2 38.9 L44.7 39.4" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><path d="M65.2 35.3 L50.8 38.9 L62.5 44.3 Z" fill="#111" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/><path d="M59.8 38.9 L55.3 39.4" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><circle cx="50" cy="22" r="2.4" fill="#ffe600"/><circle cx="47" cy="56" r="2.4" fill="#ffe600"/><circle cx="54" cy="64" r="2.4" fill="#ffe600"/><circle cx="50" cy="78" r="2.4" fill="#ffe600"/><circle cx="30" cy="56" r="2.4" fill="#ffe600"/><circle cx="70" cy="56" r="2.4" fill="#ffe600"/><path d="M44 50 L50 54 L56 50" fill="none" stroke="#7a1a85" stroke-width="2"/></svg>`,
        color: '#ff00ea',
        unlockLevel: 0,
        get name() { return t('skinInterceptor'); },
        fireRate: 1.0,
        bulletSpeed: 1.0,
        bulletDamage: 1.0,
        get description() { return t('skinDescInterceptor'); }
    },
    tanker: {
        svg: `<svg viewBox="0 0 100 100" style="width:100%; height:100%; filter: drop-shadow(0 0 8px #2fd16a);" stroke-linejoin="round" stroke-linecap="round"><g fill="#2fd16a" stroke="#137a35" stroke-width="3.6"><path d="M30 20 L33 4 L41 6 L40 22 Z"/><path d="M60 22 L59 6 L67 4 L70 20 Z"/><path d="M16 22 L50 17 L86 21 L84 58 L88 86 L52 92 L14 85 L19 56 Z"/></g><path d="M27.2 36.7 L44.8 41.1 L30.5 47.7 Z" fill="#111" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/><path d="M33.8 41.1 L39.3 41.6" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><path d="M72.8 36.7 L55.2 41.1 L69.5 47.7 Z" fill="#111" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/><path d="M66.2 41.1 L60.7 41.6" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><circle cx="26" cy="30" r="2.6" fill="#ffe600"/><circle cx="74" cy="32" r="2.6" fill="#ffe600"/><circle cx="50" cy="30" r="2.6" fill="#ffe600"/><circle cx="28" cy="70" r="2.6" fill="#ffe600"/><circle cx="70" cy="72" r="2.6" fill="#ffe600"/><circle cx="50" cy="80" r="2.6" fill="#ffe600"/><circle cx="40" cy="60" r="2.6" fill="#ffe600"/><circle cx="60" cy="62" r="2.6" fill="#ffe600"/><path d="M38 56 L44 62 L50 56 L56 62 L62 56" fill="none" stroke="#137a35" stroke-width="2.6"/></svg>`,
        color: '#2ecc71',
        unlockLevel: 0,
        get name() { return t('skinTanker'); },
        fireRate: 1.0,
        bulletSpeed: 1.0,
        bulletDamage: 1.0,
        get description() { return t('skinDescTanker'); }
    },
    phoenix: {
        svg: `<svg viewBox="0 0 100 100" style="width:100%; height:100%; filter: drop-shadow(0 0 8px #ff7a2e);" stroke-linejoin="round" stroke-linecap="round"><g fill="#ff7a2e" stroke="#a33a08" stroke-width="3.6"><path d="M30 28 L4 44 L10 54 L2 66 L22 70 L34 56 Z"/><path d="M70 28 L96 44 L90 54 L98 66 L78 70 L66 56 Z"/><path d="M38 70 L28 96 L44 84 L50 98 L56 84 L72 96 L62 70 Z"/><path d="M50 4 L62 22 L68 52 L58 74 L50 70 L42 74 L32 52 L38 22 Z"/></g><path d="M42 16 L50 2 L58 16 Z" fill="#ffd21a" stroke="#a33a08" stroke-width="2.4"/><path d="M36.2 31.4 L49.8 34.9 L38.8 40.0 Z" fill="#111" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/><path d="M41.3 34.9 L45.5 35.3" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><path d="M63.8 31.4 L50.2 34.9 L61.2 40.0 Z" fill="#111" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/><path d="M58.7 34.9 L54.5 35.3" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><circle cx="50" cy="48" r="2.4" fill="#ffe600"/><circle cx="46" cy="58" r="2.4" fill="#ffe600"/><circle cx="54" cy="60" r="2.4" fill="#ffe600"/><circle cx="16" cy="52" r="2.4" fill="#ffe600"/><circle cx="84" cy="52" r="2.4" fill="#ffe600"/><circle cx="50" cy="86" r="2.4" fill="#ffe600"/><circle cx="30" cy="60" r="2.4" fill="#ffe600"/><circle cx="70" cy="60" r="2.4" fill="#ffe600"/></svg>`,
        color: '#ff6b35',
        unlockLevel: 3,
        get name() { return t('skinPhoenix'); },
        fireRate: 1.3,
        bulletSpeed: 1.2,
        bulletDamage: 1.5,
        get description() { return t('skinDescPhoenix'); }
    },
    vortex: {
        svg: `<svg viewBox="0 0 100 100" style="width:100%; height:100%; filter: drop-shadow(0 0 8px #9b59f0);" stroke-linejoin="round" stroke-linecap="round"><g fill="#9b59f0" stroke="#4a1f9a" stroke-width="3.6"><path d="M50 3 L60 20 L80 14 L74 34 L96 46 L76 56 L84 78 L62 72 L50 96 L38 72 L16 78 L24 56 L4 46 L26 34 L20 14 L40 20 Z"/></g><circle cx="50" cy="52" r="15" fill="#c9a4ff" stroke="#4a1f9a" stroke-width="3"/><path d="M38.4 45.9 L49.6 48.7 L40.5 52.9 Z" fill="#111" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/><path d="M42.6 48.7 L46.1 49.0" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><path d="M61.6 45.9 L50.4 48.7 L59.5 52.9 Z" fill="#111" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/><path d="M57.4 48.7 L53.9 49.0" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><circle cx="50" cy="16" r="2.6" fill="#ffe600"/><circle cx="24" cy="30" r="2.6" fill="#ffe600"/><circle cx="76" cy="30" r="2.6" fill="#ffe600"/><circle cx="16" cy="52" r="2.6" fill="#ffe600"/><circle cx="84" cy="52" r="2.6" fill="#ffe600"/><circle cx="50" cy="80" r="2.6" fill="#ffe600"/><circle cx="30" cy="68" r="2.6" fill="#ffe600"/><circle cx="70" cy="68" r="2.6" fill="#ffe600"/><circle cx="50" cy="62" r="2.6" fill="#ffe600"/></svg>`,
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
        svg: `<svg viewBox="0 0 100 100" style="width:100%; height:100%; filter: drop-shadow(0 0 8px #ff3b2e);" stroke-linejoin="round" stroke-linecap="round"><g fill="#ff3b2e" stroke="#8a0f08" stroke-width="3.6"><path d="M24 34 L2 14 L8 40 Z"/><path d="M76 34 L98 14 L92 40 Z"/><path d="M30 80 L14 98 L40 90 Z"/><path d="M70 80 L86 98 L60 90 Z"/><path d="M50 4 L66 18 L88 38 L84 66 L68 88 L50 80 L32 88 L16 66 L12 38 L34 18 Z"/></g><path d="M38 14 L50 2 L62 14 Z" fill="#ffe600" stroke="#8a0f08" stroke-width="2.4"/><path d="M26.8 34.5 L45.2 39.1 L30.2 46.0 Z" fill="#111" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/><path d="M33.7 39.1 L39.5 39.7" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><path d="M73.2 34.5 L54.8 39.1 L69.8 46.0 Z" fill="#111" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/><path d="M66.3 39.1 L60.5 39.7" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><circle cx="50" cy="24" r="2.6" fill="#ffe600"/><circle cx="24" cy="52" r="2.6" fill="#ffe600"/><circle cx="76" cy="52" r="2.6" fill="#ffe600"/><circle cx="30" cy="72" r="2.6" fill="#ffe600"/><circle cx="70" cy="72" r="2.6" fill="#ffe600"/><circle cx="50" cy="64" r="2.6" fill="#ffe600"/><path d="M34 56 L40 66 L46 57 L50 67 L54 57 L60 66 L66 56" fill="#fff" stroke="#111" stroke-width="2.6"/></svg>`,
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
    dragon: {
        svg: `<img src="dragon.png" style="width:100%; height:100%; object-fit:contain; filter: drop-shadow(0 0 15px #ffaa33);" />`,
        color: '#ffaa33',
        unlockLevel: 25,
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
    { key: 'boss_cube_king', get label() { return t('goalBoss'); }, icon: '👑', type: 'boss', target: 1 },
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
    let lb = getSpeedrunLeaderboard(goalKey);
    lb = lb.filter(e => e.userName !== entry.userName || e.time > entry.time);
    lb.push(entry);
    lb.sort((a, b) => a.time - b.time);
    lb = lb.slice(0, 10);
    localStorage.setItem(`sr_lb_${goalKey}`, JSON.stringify(lb));
    // Cloud save (fire and forget)
    saveSpeedrunToCloud(goalKey, entry).catch(() => {});
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
            unlockedSkins = cloudSkins;
            console.log(`✅ [SKINS] Loaded from cloud:`, unlockedSkins);
            return;
        }
    } catch (error) {
        console.log('⚠️ [SKINS] Cloud sync failed, using local data');
    }
    
    // Fallback to cookies
    const saved = getCookie('unlockedSkins');
    if (saved) {
        try {
            unlockedSkins = JSON.parse(saved);
            console.log(`✅ [SKINS] Loaded from cookies:`, unlockedSkins);
        } catch (e) {
            console.error('❌ [SKINS] Error:', e);
        }
    }
}

export function refreshUnlockedSkins(skins) {
    unlockedSkins = [...skins];
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
        skin: 'dragon'
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
        skin: 'global'
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

// Score helper: every score gain goes through here so the x2 upgrade applies everywhere.
export function addScore(points) {
    const mult = isUpgradeActive('double_score') ? 2 : 1;
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
    skinLeaderboard = skinLeaderboard.filter(e => e.userName !== effectiveName);
    skinLeaderboard.push(newEntry);
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
    overallLeaderboard = overallLeaderboard.filter(e => e.userName !== effectiveName);
    overallLeaderboard.push(overallEntry);
    overallLeaderboard.sort((a, b) => ((b.level || 0) - (a.level || 0)) || (b.score - a.score));
    overallLeaderboard = overallLeaderboard.slice(0, 5);
    setCookie(`leaderboard_overall`, JSON.stringify(overallLeaderboard));

    // Save to cloud
    try {
        await saveScoreToCloud(skinKey, score, level, userName, settings);
        console.log('✅ [SCORE] Saved to cloud');
    } catch (error) {
        console.log('⚠️ [SCORE] Cloud save failed, local score saved');
    }
}

// Game State
export const state = {
    active: false,
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
export function difficultyForLevel(level) {
    const orig = (l) => ({ mult: 1 + (l - 1) * 0.2, spawn: Math.max(250, 1400 - (l - 1) * 200) });
    const easy = (l) => ({ mult: 1 + (l - 1) * 0.05, spawn: 1500 - (l - 1) * 40 });
    if (level <= 20) return easy(level);
    if (level >= 30) return orig(level);
    const k = (level - 20) / 10, a = easy(20), b = orig(30);
    return { mult: a.mult + (b.mult - a.mult) * k, spawn: a.spawn + (b.spawn - a.spawn) * k };
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