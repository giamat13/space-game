// ===== ACHIEVEMENT SYSTEM =====
// Achievements are stored in localStorage as a set of unlocked keys.

const ACHIEVEMENTS_KEY = 'achievements_v1';

export const ACHIEVEMENTS = [
    // Score milestones
    { key: 'score_1k',   icon: '🌟', name: 'כוכב עולה',      desc: 'הגע ל-1,000 נקודות',       check: e => e.score >= 1000 },
    { key: 'score_5k',   icon: '💫', name: 'נווט מיומן',      desc: 'הגע ל-5,000 נקודות',       check: e => e.score >= 5000 },
    { key: 'score_10k',  icon: '🏆', name: 'אלוף החלל',       desc: 'הגע ל-10,000 נקודות',      check: e => e.score >= 10000 },
    { key: 'score_25k',  icon: '👑', name: 'מלך החלל',        desc: 'הגע ל-25,000 נקודות',      check: e => e.score >= 25000 },
    { key: 'score_50k',  icon: '⚡', name: 'אגדת החלל',       desc: 'הגע ל-50,000 נקודות',      check: e => e.score >= 50000 },
    { key: 'score_100k', icon: '🔥', name: 'פרו של space-game',     desc: 'הגע ל-100,000 נקודות',     check: e => e.score >= 100000 },

    // Skin milestones
    { key: 'first_unlock', icon: '🎨', name: 'אוסף ספינות',   desc: 'פתח סקין חדש בפעם הראשונה', check: (e, stats) => stats.skinsUnlocked >= 2 },
    { key: 'all_skins',    icon: '🌈', name: 'אוסף שלם',       desc: 'פתח את כל הסקינים',         check: (e, stats) => stats.skinsUnlocked >= 7 },

    // Play count
    { key: 'games_10',   icon: '🎮', name: 'שחקן מסור',       desc: 'שחק 10 משחקים',            check: (e, stats) => stats.totalGames >= 10 },
    { key: 'games_50',   icon: '🎯', name: 'שחקן ותיק',       desc: 'שחק 50 משחקים',            check: (e, stats) => stats.totalGames >= 50 },
    { key: 'games_100',  icon: '💎', name: 'מכור למשחק',      desc: 'שחק 100 משחקים',           check: (e, stats) => stats.totalGames >= 100 },

    // Survival
    { key: 'survive_5min',  icon: '⏱️', name: 'סבלן',         desc: 'שרוד 5 דקות במשחק אחד',    check: e => (e.duration || 0) >= 300000 },
    { key: 'survive_10min', icon: '🕐', name: 'מתמיד',        desc: 'שרוד 10 דקות במשחק אחד',   check: e => (e.duration || 0) >= 600000 },

    // Coins
    { key: 'coins_1k',   icon: '💰', name: 'עשיר',            desc: 'צבור 1,000 מטבעות',        check: (e, stats) => stats.totalCoins >= 1000 },
    { key: 'coins_10k',  icon: '🤑', name: 'מיליונר חלל',     desc: 'צבור 10,000 מטבעות',       check: (e, stats) => stats.totalCoins >= 10000 },

    // Speedrun-flavored
    { key: 'fast_5k',    icon: '⚡', name: 'בזק',             desc: 'הגע ל-5,000 נקודות תוך דקה', check: e => e.score >= 5000 && (e.duration || Infinity) <= 60000 },
];

export function loadUnlockedAchievements() {
    try {
        const item = localStorage.getItem(ACHIEVEMENTS_KEY);
        if (item) return new Set(JSON.parse(item));
    } catch(e) {}
    return new Set();
}

function saveUnlockedAchievements(set) {
    try {
        localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify([...set]));
    } catch(e) {}
}

// Returns array of newly unlocked achievements
export function checkAchievements(gameEntry, extraStats) {
    const unlocked = loadUnlockedAchievements();
    const newlyUnlocked = [];

    for (const ach of ACHIEVEMENTS) {
        if (unlocked.has(ach.key)) continue;
        try {
            if (ach.check(gameEntry, extraStats || {})) {
                unlocked.add(ach.key);
                newlyUnlocked.push(ach);
            }
        } catch(e) {}
    }

    if (newlyUnlocked.length) saveUnlockedAchievements(unlocked);
    return newlyUnlocked;
}

export function getAchievementProgress() {
    const unlocked = loadUnlockedAchievements();
    return ACHIEVEMENTS.map(a => ({ ...a, unlocked: unlocked.has(a.key) }));
}

// Show toast notification for newly unlocked achievement
export function showAchievementToast(ach) {
    const existing = document.getElementById('achievement-toast-container');
    const container = existing || (() => {
        const el = document.createElement('div');
        el.id = 'achievement-toast-container';
        el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;';
        document.body.appendChild(el);
        return el;
    })();

    const toast = document.createElement('div');
    toast.style.cssText = `
        background:linear-gradient(135deg,rgba(0,0,0,0.95),rgba(0,30,40,0.95));
        border:2px solid #ffd700;
        border-radius:12px;
        padding:10px 20px;
        color:#fff;
        font-family:'Orbitron',sans-serif;
        font-size:0.8rem;
        text-align:center;
        box-shadow:0 0 20px rgba(255,215,0,0.4);
        animation:achievementSlideIn 0.4s ease;
        min-width:220px;
        max-width:320px;
    `;
    toast.innerHTML = `
        <div style="font-size:0.65rem;color:#ffd700;letter-spacing:1px;margin-bottom:4px;">🏅 הישג חדש!</div>
        <div style="font-size:1.3rem;margin-bottom:2px;">${ach.icon}</div>
        <div style="font-weight:bold;color:#ffd700;">${ach.name}</div>
        <div style="font-size:0.7rem;opacity:0.75;margin-top:2px;">${ach.desc}</div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease';
        setTimeout(() => toast.remove(), 500);
    }, 3500);
}
