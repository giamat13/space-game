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
        hpMultiplier: 1.0,
        description: 'Balanced fighter'
    },
    interceptor: {
        svg: `<svg viewBox="0 0 100 100" style="width:100%; height:100%; filter: drop-shadow(0 0 8px #ff00ea);">
                <path d="M50 5 L20 90 L50 70 L80 90 Z" fill="#ff00ea" />
                <path d="M40 40 L50 20 L60 40" fill="#00f2ff" />
              </svg>`,
        color: '#ff00ea',
        unlockLevel: 1,
        name: 'Interceptor',
        fireRate: 1.4,
        bulletSpeed: 1.2,
        bulletDamage: 0.8,
        hpMultiplier: 1.0,
        description: '⚡ High fire rate | 💨 Faster bullets'
    },
    phoenix: {
        svg: `<svg viewBox="0 0 100 100" style="width:100%; height:100%; filter: drop-shadow(0 0 8px #ff6b35);">
                <path d="M50 5 L30 25 L10 70 L25 85 L50 75 L75 85 L90 70 L70 25 Z" fill="#ff6b35" />
                <path d="M35 30 L50 15 L65 30" fill="#ffd700" />
              </svg>`,
        color: '#ff6b35',
        unlockLevel: 3,
        name: 'Phoenix',
        fireRate: 1.2,
        bulletSpeed: 1.0,
        bulletDamage: 1.5,
        hpMultiplier: 1.0,
        description: '🔥 Heavy damage | ⚡ Fast fire'
    },
    vortex: {
        svg: `<svg viewBox="0 0 100 100" style="width:100%; height:100%; filter: drop-shadow(0 0 8px #9b59b6);">
                <path d="M50 10 L35 30 L25 50 L35 70 L50 90 L65 70 L75 50 L65 30 Z" fill="#9b59b6" />
                <circle cx="50" cy="50" r="15" fill="#3498db" />
              </svg>`,
        color: '#9b59b6',
        unlockLevel: 5,
        name: 'Vortex',
        fireRate: 1.6,
        bulletSpeed: 1.4,
        bulletDamage: 2.0,
        hpMultiplier: 2.0,
        description: '🛡️ DOUBLE HP | 🌀 Side Shots | 💥 ULTRA DMG'
    }
};

export const INGREDIENT_TYPES = [
    { name: 'Bun', color: '#f39c12', score: 50 },
    { name: 'Patty', color: '#7e4b2e', score: 50 },
    { name: 'Lettuce', color: '#2ecc71', score: 50 },
    { name: 'Tomato', color: '#e74c3c', score: 50 },
    { name: 'Cheese', color: '#f1c40f', score: 50 }
];

// Cookie Helpers
function setCookie(name, value) {
    document.cookie = `${name}=${value};path=/;max-age=31536000`;
}

function getCookie(name) {
    const parts = `; ${document.cookie}`.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

// Skin Persistence
let unlockedSkins = ['classic'];
export let currentSkinKey = 'classic';

export function loadUnlockedSkins() {
    const saved = getCookie('unlockedSkins');
    if (saved) unlockedSkins = JSON.parse(saved);
}

export function unlockSkin(skinKey) {
    if (!unlockedSkins.includes(skinKey)) {
        unlockedSkins.push(skinKey);
        setCookie('unlockedSkins', JSON.stringify(unlockedSkins));
    }
}

export function setCurrentSkin(skinKey) {
    currentSkinKey = skinKey;
}

export function isSkinUnlocked(skinKey) {
    return unlockedSkins.includes(skinKey);
}

export function getMaxLevel() {
    const saved = getCookie('maxLevel');
    return saved ? parseInt(saved) : 1;
}

export function saveMaxLevel(level) {
    const currentMax = getMaxLevel();
    if (level > currentMax) {
        setCookie('maxLevel', level.toString());
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
    shotCount: 0,
    currentSkinStats: {
        fireRate: 1.0,
        bulletSpeed: 1.0,
        bulletDamage: 1.0,
        hpMultiplier: 1.0
    }
};

export function resetState() {
    state.active = true;
    state.score = 0;
    state.level = 1;
    state.playerX = DOM.wrapper.clientWidth / 2 - 25;
    state.bullets = [];
    state.enemyBullets = [];
    state.enemies = [];
    state.asteroids = [];
    state.burgers = [];
    state.ingredients = [];
    state.speedMult = 1;
    state.lastSpawn = 0;
    state.spawnRate = 1400;
    state.lastShot = 0;
    state.lastHealScore = 0;
    state.lastLevelScore = 0;
    state.shotCount = 0;
}