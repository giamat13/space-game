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
        // Base stats
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
        fireRate: 1.3,        // 30% faster shooting
        bulletSpeed: 1.2,     // 20% faster bullets
        bulletDamage: 1.5,    // 50% more damage
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
        fireRate: 1.6,        // 60% faster shooting
        bulletSpeed: 1.4,     // 40% faster bullets
        bulletDamage: 2.0,    // 100% more damage (DOUBLE!)
        maxHP: 400,           // DOUBLE HP!
        description: '⚡⚡ Ultra-fast fire | 💥 2X dmg | ❤️ 2X HP'
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
    currentSkinKey = key;
}

// Cookie Management
export function setCookie(name, value, days = 365) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
    console.log(`🍪 Cookie saved: ${name} = ${value}`);
}

export function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// Unlocked Skins Management
export let unlockedSkins = ['classic', 'interceptor', 'tanker']; // Default unlocked

export function loadUnlockedSkins() {
    const saved = getCookie('unlockedSkins');
    if (saved) {
        unlockedSkins = JSON.parse(saved);
        console.log('📂 Loaded unlocked skins:', unlockedSkins);
    }
}

export function unlockSkin(skinKey) {
    if (!unlockedSkins.includes(skinKey)) {
        unlockedSkins.push(skinKey);
        setCookie('unlockedSkins', JSON.stringify(unlockedSkins));
        console.log(`🎉 NEW SKIN UNLOCKED: ${skinKey}!`);
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
        console.log(`📈 New max level: ${level}`);
    }
}

// Leaderboard Management
export function getLeaderboard(skinKey = 'overall') {
    const saved = getCookie(`leaderboard_${skinKey}`);
    return saved ? JSON.parse(saved) : [];
}

export function saveScore(skinKey, score, level) {
    // Save for specific skin
    let skinLeaderboard = getLeaderboard(skinKey);
    skinLeaderboard.push({ score, level, date: new Date().toLocaleDateString('he-IL') });
    skinLeaderboard.sort((a, b) => b.score - a.score);
    skinLeaderboard = skinLeaderboard.slice(0, 5); // Keep top 5
    setCookie(`leaderboard_${skinKey}`, JSON.stringify(skinLeaderboard));
    
    // Save for overall
    let overallLeaderboard = getLeaderboard('overall');
    overallLeaderboard.push({ score, level, skin: skinKey, date: new Date().toLocaleDateString('he-IL') });
    overallLeaderboard.sort((a, b) => b.score - a.score);
    overallLeaderboard = overallLeaderboard.slice(0, 5); // Keep top 5
    setCookie(`leaderboard_overall`, JSON.stringify(overallLeaderboard));
    
    console.log(`🏆 Score saved: ${score} for ${skinKey}`);
}

// Game State
export const state = {
    active: false,
    score: 0,
    level: 1,
    playerX: 0,
    playerHP: 200,
    playerMaxHP: 200,
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
    // Skin bonuses
    currentSkinStats: {
        fireRate: 1.0,
        bulletSpeed: 1.0,
        bulletDamage: 1.0
    }
};

export function resetState() {
    state.active = true;
    state.score = 0;
    state.level = 1;
    state.playerX = DOM.wrapper.clientWidth / 2 - 25;
    
    // Set HP based on selected skin
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
}