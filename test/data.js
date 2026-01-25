// DOM Elements
export const DOM = {
    wrapper: document.getElementById('game-wrapper'),
    player: document.getElementById('player'),
    playerSpriteContainer: document.getElementById('player-sprite-container'),
    playerHpFill: document.getElementById('player-hp'),
    scoreEl: document.getElementById('score'),
    levelEl: document.getElementById('level'),
    overlay: document.getElementById('overlay')
};

// Skin Configuration
export const SKINS = {
    classic: {
        svg: `<svg viewBox="0 0 100 100" style="width:100%; height:100%; filter: drop-shadow(0 0 8px #00f2ff);">
                <path d="M50 5 L10 80 L50 65 L90 80 Z" fill="#00f2ff" />
                <rect x="45" y="60" width="10" height="20" fill="#ff00ea" />
              </svg>`,
        color: '#00f2ff',
        unlockLevel: 0,
        name: 'Classic',
        fireRate: 1.0,
        bulletSpeed: 1.0,
        bulletDamage: 1.0,
        description: 'Balanced fighter'
    },
    interceptor: {
        svg: `<svg viewBox="0 0 100 100" style="width:100%; height:100%; filter: drop-shadow(0 0 8px #ff00ea);">
                <path d="M50 5 L30 30 L10 90 L50 70 L90 90 L70 30 Z" fill="#ff00ea" />
                <circle cx="50" cy="40" r="10" fill="#00f2ff" />
              </svg>`,
        color: '#ff00ea',
        unlockLevel: 0,
        name: 'Interceptor',
        fireRate: 1.0,
        bulletSpeed: 1.0,
        bulletDamage: 1.0,
        description: 'Speed variant'
    },
    tanker: {
        svg: `<svg viewBox="0 0 100 100" style="width:100%; height:100%; filter: drop-shadow(0 0 8px #2ecc71);">
                <path d="M20 20 H80 V80 H20 Z" fill="#2ecc71" />
                <path d="M30 20 L50 5 L70 20" fill="none" stroke="#2ecc71" stroke-width="5" />
                <rect x="35" y="40" width="30" height="10" fill="#fff" />
              </svg>`,
        color: '#2ecc71',
        unlockLevel: 0,
        name: 'Tanker',
        fireRate: 1.0,
        bulletSpeed: 1.0,
        bulletDamage: 1.0,
        description: 'Heavy armor'
    },
    phoenix: {
        svg: `<svg viewBox="0 0 100 100" style="width:100%; height:100%; filter: drop-shadow(0 0 15px #ff6b35);">
                <defs>
                  <linearGradient id="phoenixGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#ffd700;stop-opacity:1" />
                    <stop offset="50%" style="stop-color:#ff6b35;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#ff0000;stop-opacity:1" />
                  </linearGradient>
                </defs>
                <path d="M50 5 L30 25 L10 70 L25 85 L50 75 L75 85 L90 70 L70 25 Z" fill="url(#phoenixGrad)" />
                <path d="M35 30 L50 10 L65 30" fill="#ffd700" />
                <circle cx="40" cy="45" r="5" fill="#ffd700" />
                <circle cx="60" cy="45" r="5" fill="#ffd700" />
                <path d="M30 75 L15 95 M70 75 L85 95" stroke="#ff6b35" stroke-width="4" fill="none" />
                <path d="M50 75 L50 90" stroke="#ffd700" stroke-width="3" />
                <circle cx="50" cy="35" r="8" fill="#ff0000" opacity="0.7" />
              </svg>`,
        color: '#ff6b35',
        unlockLevel: 3,
        name: 'Phoenix',
        fireRate: 1.3,
        bulletSpeed: 1.2,
        bulletDamage: 1.5,
        description: '⚡ Faster fire rate | 🔥 More damage'
    },
    vortex: {
        svg: `<svg viewBox="0 0 100 100" style="width:100%; height:100%; filter: drop-shadow(0 0 20px #9b59b6);">
                <defs>
                  <radialGradient id="vortexGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:#e74c3c;stop-opacity:1" />
                    <stop offset="40%" style="stop-color:#9b59b6;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#3498db;stop-opacity:1" />
                  </radialGradient>
                </defs>
                <path d="M50 10 L35 30 L25 50 L35 70 L50 90 L65 70 L75 50 L65 30 Z" fill="url(#vortexGrad)" stroke="#fff" stroke-width="2" />
                <circle cx="50" cy="50" r="20" fill="none" stroke="#3498db" stroke-width="3" opacity="0.7" />
                <circle cx="50" cy="50" r="15" fill="#e74c3c" opacity="0.8" />
                <circle cx="50" cy="50" r="8" fill="#fff" />
                <path d="M20 50 L28 50 M72 50 L80 50 M50 20 L50 28 M50 72 L50 80" stroke="#fff" stroke-width="3" />
                <path d="M33 33 L38 38 M62 33 L57 38 M33 67 L38 62 M62 67 L57 62" stroke="#3498db" stroke-width="2" />
              </svg>`,
        color: '#9b59b6',
        unlockLevel: 5,
        name: 'Vortex',
        fireRate: 1.6,
        bulletSpeed: 1.4,
        bulletDamage: 2.0,
        maxHP: 400,
        description: '⚡⚡ Ultra-fast fire | 💥 2X dmg | ❤️ 2X HP'
    },
    joker: {
        svg: `<svg viewBox="0 0 100 100" style="width:100%; height:100%; filter: drop-shadow(0 0 25px #ff4500);">
                <defs>
                  <linearGradient id="jokerBody" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#ff6b00;stop-opacity:1" />
                    <stop offset="50%" style="stop-color:#ff0000;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#8b0000;stop-opacity:1" />
                  </linearGradient>
                  <radialGradient id="jokerFire" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:#ffff00;stop-opacity:1" />
                    <stop offset="50%" style="stop-color:#ff6600;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#ff0000;stop-opacity:1" />
                  </radialGradient>
                </defs>
                <path d="M50 5 L20 25 L15 40 L10 60 L25 85 L50 75 L75 85 L90 60 L85 40 L80 25 Z" fill="url(#jokerBody)" stroke="#ffa500" stroke-width="2" />
                <path d="M15 30 L5 20 L10 35 M85 30 L95 20 L90 35" fill="#ff4500" stroke="#ffa500" stroke-width="2" />
                <path d="M35 20 L50 5 L65 20" fill="#ffff00" />
                <circle cx="35" cy="35" r="6" fill="#ffff00" stroke="#ff0000" stroke-width="2" />
                <circle cx="65" cy="35" r="6" fill="#ffff00" stroke="#ff0000" stroke-width="2" />
                <circle cx="38" cy="35" r="3" fill="#000" />
                <circle cx="68" cy="35" r="3" fill="#000" />
                <path d="M40 48 Q50 55 60 48" fill="none" stroke="#ff0000" stroke-width="3" />
                <path d="M25 75 L15 95 M75 75 L85 95" stroke="#ff6b00" stroke-width="5" fill="none" />
                <circle cx="50" cy="25" r="10" fill="url(#jokerFire)" opacity="0.8" />
                <path d="M30 65 L50 75 L70 65" fill="#8b0000" />
              </svg>`,
        color: '#ff4500',
        unlockLevel: 10,
        name: 'joker',
        fireRate: 2.0,
        bulletSpeed: 1.6,
        bulletDamage: 3.0,
        maxHP: 600,
        isFire: true,
        description: '🔥🔥🔥 Fire bullets | ⚡⚡⚡ 2X fire rate | 💥 3X dmg | ❤️❤️❤️ 3 lives!'
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

// Unlocked Skins Management
export let unlockedSkins = ['classic', 'interceptor', 'tanker'];

export function loadUnlockedSkins() {
    console.log('📂 [SKINS] Loading unlocked skins...');
    const saved = getCookie('unlockedSkins');
    if (saved) {
        try {
            unlockedSkins = JSON.parse(saved);
            console.log(`✅ [SKINS] Loaded:`, unlockedSkins);
        } catch (e) {
            console.error('❌ [SKINS] Error:', e);
        }
    }
}

export function unlockSkin(skinKey) {
    if (!unlockedSkins.includes(skinKey)) {
        unlockedSkins.push(skinKey);
        setCookie('unlockedSkins', JSON.stringify(unlockedSkins));
        console.log(`🎉 [SKINS] Unlocked: ${skinKey}`);
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

export function saveMaxLevel(level) {
    const currentMax = getMaxLevel();
    if (level > currentMax) {
        setCookie('maxLevel', level.toString());
        console.log(`📈 [LEVEL] New max: ${level}`);
    }
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

export function saveScore(skinKey, score, level) {
    console.log(`💾 [SCORE] Saving: ${score} pts, Level ${level}`);
    
    let skinLeaderboard = getLeaderboard(skinKey);
    const newEntry = { score, level, date: new Date().toLocaleDateString('he-IL') };
    skinLeaderboard.push(newEntry);
    skinLeaderboard.sort((a, b) => b.score - a.score);
    skinLeaderboard = skinLeaderboard.slice(0, 5);
    setCookie(`leaderboard_${skinKey}`, JSON.stringify(skinLeaderboard));
    
    let overallLeaderboard = getLeaderboard('overall');
    const overallEntry = { score, level, skin: skinKey, date: new Date().toLocaleDateString('he-IL') };
    overallLeaderboard.push(overallEntry);
    overallLeaderboard.sort((a, b) => b.score - a.score);
    overallLeaderboard = overallLeaderboard.slice(0, 5);
    setCookie(`leaderboard_overall`, JSON.stringify(overallLeaderboard));
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
        cooldown: 45000,
        lastUsed: 0
    },
    phoenixAbility: {
        ready: true,
        cooldown: 30000,
        lastUsed: 0
    },
    jokerAbility: {
        ready: true,
        cooldown: 45000,
        lastUsed: 0,
        chaosMode: false,
        chaosModeEnd: 0,
        infectionActive: false
    }
};

export function resetState() {
    console.log('🔄 [STATE] Resetting game state...');
    state.active = true;
    state.score = 0;
    state.level = 1;
    state.playerX = DOM.wrapper.clientWidth / 2 - 25;
    
    const skin = SKINS[currentSkinKey];
    const maxHP = skin.maxHP || 200;
    state.playerHP = maxHP;
    state.playerMaxHP = maxHP;
    
    state.bullets = [];
    state.enemyBullets = [];
    state.enemies = [];
    state.asteroids = [];
    state.burgers = [];
    state.ingredients = [];
    state.speedMult = 1;
    state.lastSpawn = Date.now();
    state.spawnRate = 1400;
    state.lastShot = 0;
    state.shotCooldown = 180;
    state.lastHealScore = 0;
    state.lastLevelScore = 0;
    state.burgersEatenAtFullHP = 0;
    state.isPlayerFat = false;
    state.specialAbility.ready = true;
    state.specialAbility.lastUsed = 0;
    state.phoenixAbility.ready = true;
    state.phoenixAbility.lastUsed = 0;
    state.jokerAbility.ready = true;
    state.jokerAbility.lastUsed = 0;
    state.jokerAbility.chaosMode = false;
    state.jokerAbility.chaosModeEnd = 0;
    state.jokerAbility.infectionActive = false;
    console.log('✅ [STATE] Reset complete');
}