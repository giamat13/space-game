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
        color: '#00f2ff'
    },
    interceptor: {
        svg: `<svg viewBox="0 0 100 100" style="width:100%; height:100%; filter: drop-shadow(0 0 8px #ff00ea);">
                <path d="M50 5 L30 30 L10 90 L50 70 L90 90 L70 30 Z" fill="#ff00ea" />
                <circle cx="50" cy="40" r="10" fill="#00f2ff" />
              </svg>`,
        color: '#ff00ea'
    },
    tanker: {
        svg: `<svg viewBox="0 0 100 100" style="width:100%; height:100%; filter: drop-shadow(0 0 8px #2ecc71);">
                <path d="M20 20 H80 V80 H20 Z" fill="#2ecc71" />
                <path d="M30 20 L50 5 L70 20" fill="none" stroke="#2ecc71" stroke-width="5" />
                <rect x="35" y="40" width="30" height="10" fill="#fff" />
              </svg>`,
        color: '#2ecc71'
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
    lastLevelScore: 0
};

export function resetState() {
    state.active = true;
    state.score = 0;
    state.level = 1;
    state.playerX = DOM.wrapper.clientWidth / 2 - 25;
    state.playerHP = 200;
    state.playerMaxHP = 200;
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