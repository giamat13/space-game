// ===== ACHIEVEMENT SYSTEM =====
// Achievements are stored in localStorage as a set of unlocked keys.
// All strings are multilingual (he, en, ar, ru, fr, es)

import { currentLang } from './i18n.js';

const ACHIEVEMENTS_KEY = 'achievements_v1';

const ACHIEVEMENT_STRINGS = {
    score_1k: {
        he: { name: 'כוכב עולה', desc: 'הגע ל-1,000 נקודות' },
        en: { name: 'Rising Star', desc: 'Reach 1,000 points' },
        ar: { name: 'نجم صاعد', desc: 'احصل على 1,000 نقطة' },
        ru: { name: 'Восходящая звезда', desc: 'Получить 1,000 очков' },
        fr: { name: 'Étoile montante', desc: 'Atteindre 1 000 points' },
        es: { name: 'Estrella naciente', desc: 'Alcanza 1,000 puntos' }
    },
    score_5k: {
        he: { name: 'נווט מיומן', desc: 'הגע ל-5,000 נקודות' },
        en: { name: 'Skilled Navigator', desc: 'Reach 5,000 points' },
        ar: { name: 'ملاح ماهر', desc: 'احصل على 5,000 نقطة' },
        ru: { name: 'Опытный навигатор', desc: 'Получить 5,000 очков' },
        fr: { name: 'Navigateur compétent', desc: 'Atteindre 5 000 points' },
        es: { name: 'Navegante experto', desc: 'Alcanza 5,000 puntos' }
    },
    score_10k: {
        he: { name: 'אלוף החלל', desc: 'הגע ל-10,000 נקודות' },
        en: { name: 'Space Champion', desc: 'Reach 10,000 points' },
        ar: { name: 'بطل الفضاء', desc: 'احصل على 10,000 نقطة' },
        ru: { name: 'Чемпион космоса', desc: 'Получить 10,000 очков' },
        fr: { name: 'Champion de l\'espace', desc: 'Atteindre 10 000 points' },
        es: { name: 'Campeón del espacio', desc: 'Alcanza 10,000 puntos' }
    },
    score_25k: {
        he: { name: 'מלך החלל', desc: 'הגע ל-25,000 נקודות' },
        en: { name: 'Space King', desc: 'Reach 25,000 points' },
        ar: { name: 'ملك الفضاء', desc: 'احصل على 25,000 نقطة' },
        ru: { name: 'Король космоса', desc: 'Получить 25,000 очков' },
        fr: { name: 'Roi de l\'espace', desc: 'Atteindre 25 000 points' },
        es: { name: 'Rey del espacio', desc: 'Alcanza 25,000 puntos' }
    },
    score_50k: {
        he: { name: 'אגדת החלל', desc: 'הגע ל-50,000 נקודות' },
        en: { name: 'Space Legend', desc: 'Reach 50,000 points' },
        ar: { name: 'أسطورة الفضاء', desc: 'احصل على 50,000 نقطة' },
        ru: { name: 'Легенда космоса', desc: 'Получить 50,000 очков' },
        fr: { name: 'Légende de l\'espace', desc: 'Atteindre 50 000 points' },
        es: { name: 'Leyenda del espacio', desc: 'Alcanza 50,000 puntos' }
    },
    score_100k: {
        he: { name: 'פרו של space-game', desc: 'הגע ל-100,000 נקודות' },
        en: { name: 'Space-Game Pro', desc: 'Reach 100,000 points' },
        ar: { name: 'محترف لعبة الفضاء', desc: 'احصل على 100,000 نقطة' },
        ru: { name: 'Профессионал Space-Game', desc: 'Получить 100,000 очков' },
        fr: { name: 'Pro de Space-Game', desc: 'Atteindre 100 000 points' },
        es: { name: 'Profesional de Space-Game', desc: 'Alcanza 100,000 puntos' }
    },
    first_unlock: {
        he: { name: 'אוסף ספינות', desc: 'פתח סקין חדש בפעם הראשונה' },
        en: { name: 'Ship Collector', desc: 'Unlock a new skin for the first time' },
        ar: { name: 'جامع السفن', desc: 'فتح تصميم جديد للمرة الأولى' },
        ru: { name: 'Коллекционер кораблей', desc: 'Разблокировать новый скин впервые' },
        fr: { name: 'Collectionneur de vaisseaux', desc: 'Débloquer un nouveau skin pour la première fois' },
        es: { name: 'Coleccionista de naves', desc: 'Desbloquea un nuevo skin por primera vez' }
    },
    all_skins: {
        he: { name: 'אוסף שלם', desc: 'פתח את כל הסקינים' },
        en: { name: 'Complete Collection', desc: 'Unlock all skins' },
        ar: { name: 'مجموعة كاملة', desc: 'فتح جميع التصاميم' },
        ru: { name: 'Полная коллекция', desc: 'Разблокировать все скины' },
        fr: { name: 'Collection complète', desc: 'Débloquer tous les skins' },
        es: { name: 'Colección completa', desc: 'Desbloquea todos los skins' }
    },
    games_10: {
        he: { name: 'שחקן מסור', desc: 'שחק 10 משחקים' },
        en: { name: 'Dedicated Player', desc: 'Play 10 games' },
        ar: { name: 'لاعب مكرس', desc: 'العب 10 ألعاب' },
        ru: { name: 'Преданный игрок', desc: 'Сыграть 10 игр' },
        fr: { name: 'Joueur dévoué', desc: 'Jouer 10 jeux' },
        es: { name: 'Jugador dedicado', desc: 'Juega 10 juegos' }
    },
    games_50: {
        he: { name: 'שחקן ותיק', desc: 'שחק 50 משחקים' },
        en: { name: 'Veteran Player', desc: 'Play 50 games' },
        ar: { name: 'لاعب قديم', desc: 'العب 50 لعبة' },
        ru: { name: 'Ветеран-игрок', desc: 'Сыграть 50 игр' },
        fr: { name: 'Joueur vétéran', desc: 'Jouer 50 jeux' },
        es: { name: 'Jugador veterano', desc: 'Juega 50 juegos' }
    },
    games_100: {
        he: { name: 'מכור למשחק', desc: 'שחק 100 משחקים' },
        en: { name: 'Game Addict', desc: 'Play 100 games' },
        ar: { name: 'مدمن اللعبة', desc: 'العب 100 لعبة' },
        ru: { name: 'Зависимый от игр', desc: 'Сыграть 100 игр' },
        fr: { name: 'Accro aux jeux', desc: 'Jouer 100 jeux' },
        es: { name: 'Adicto a los juegos', desc: 'Juega 100 juegos' }
    },
    survive_5min: {
        he: { name: 'סבלן', desc: 'שרוד 5 דקות במשחק אחד' },
        en: { name: 'Patient', desc: 'Survive 5 minutes in one game' },
        ar: { name: 'صبور', desc: 'البقاء على قيد الحياة 5 دقائق في لعبة واحدة' },
        ru: { name: 'Терпеливый', desc: 'Выжить 5 минут в одной игре' },
        fr: { name: 'Patient', desc: 'Survivre 5 minutes en un seul jeu' },
        es: { name: 'Paciente', desc: 'Sobrevive 5 minutos en un juego' }
    },
    survive_10min: {
        he: { name: 'מתמיד', desc: 'שרוד 10 דקות במשחק אחד' },
        en: { name: 'Persistent', desc: 'Survive 10 minutes in one game' },
        ar: { name: 'مثابر', desc: 'البقاء على قيد الحياة 10 دقائق في لعبة واحدة' },
        ru: { name: 'Настойчивый', desc: 'Выжить 10 минут в одной игре' },
        fr: { name: 'Persévérant', desc: 'Survivre 10 minutes en un seul jeu' },
        es: { name: 'Persistente', desc: 'Sobrevive 10 minutos en un juego' }
    },
    coins_1k: {
        he: { name: 'עשיר', desc: 'צבור 1,000 מטבעות' },
        en: { name: 'Wealthy', desc: 'Collect 1,000 coins' },
        ar: { name: 'ثري', desc: 'اجمع 1,000 عملة' },
        ru: { name: 'Богатый', desc: 'Собрать 1,000 монет' },
        fr: { name: 'Riche', desc: 'Collecter 1 000 pièces' },
        es: { name: 'Adinerado', desc: 'Colecciona 1,000 monedas' }
    },
    coins_10k: {
        he: { name: 'מיליונר חלל', desc: 'צבור 10,000 מטבעות' },
        en: { name: 'Space Millionaire', desc: 'Collect 10,000 coins' },
        ar: { name: 'مليونير الفضاء', desc: 'اجمع 10,000 عملة' },
        ru: { name: 'Космический миллионер', desc: 'Собрать 10,000 монет' },
        fr: { name: 'Millionnaire de l\'espace', desc: 'Collecter 10 000 pièces' },
        es: { name: 'Millonario espacial', desc: 'Colecciona 10,000 monedas' }
    },
    fast_5k: {
        he: { name: 'בזק', desc: 'הגע ל-5,000 נקודות תוך דקה אחת' },
        en: { name: 'Lightning Fast', desc: 'Reach 5,000 points in under 1 minute' },
        ar: { name: 'سريع البرق', desc: 'احصل على 5,000 نقطة في أقل من دقيقة واحدة' },
        ru: { name: 'Молниеносно быстро', desc: 'Получить 5,000 очков менее чем за 1 минуту' },
        fr: { name: 'Rapide comme l\'éclair', desc: 'Atteindre 5 000 points en moins d\'1 minute' },
        es: { name: 'Rápido como un rayo', desc: 'Alcanza 5,000 puntos en menos de 1 minuto' }
    }
};

export const ACHIEVEMENTS = [
    // Score milestones
    { key: 'score_1k',   icon: '🌟', check: e => e.score >= 1000 },
    { key: 'score_5k',   icon: '💫', check: e => e.score >= 5000 },
    { key: 'score_10k',  icon: '🏆', check: e => e.score >= 10000 },
    { key: 'score_25k',  icon: '👑', check: e => e.score >= 25000 },
    { key: 'score_50k',  icon: '⚡', check: e => e.score >= 50000 },
    { key: 'score_100k', icon: '🔥', check: e => e.score >= 100000 },

    // Skin milestones
    { key: 'first_unlock', icon: '🎨', check: (e, stats) => stats.skinsUnlocked >= 2 },
    { key: 'all_skins',    icon: '🌈', check: (e, stats) => stats.skinsUnlocked >= 7 },

    // Play count
    { key: 'games_10',   icon: '🎮', check: (e, stats) => stats.totalGames >= 10 },
    { key: 'games_50',   icon: '🎯', check: (e, stats) => stats.totalGames >= 50 },
    { key: 'games_100',  icon: '💎', check: (e, stats) => stats.totalGames >= 100 },

    // Survival
    { key: 'survive_5min',  icon: '⏱️', check: e => (e.duration || 0) >= 300000 },
    { key: 'survive_10min', icon: '🕐', check: e => (e.duration || 0) >= 600000 },

    // Coins
    { key: 'coins_1k',   icon: '💰', check: (e, stats) => stats.totalCoins >= 1000 },
    { key: 'coins_10k',  icon: '🤑', check: (e, stats) => stats.totalCoins >= 10000 },

    // Speedrun-flavored
    { key: 'fast_5k',    icon: '⚡', check: e => e.score >= 5000 && (e.duration || Infinity) <= 60000 },
].map(a => ({
    ...a,
    name: ACHIEVEMENT_STRINGS[a.key][currentLang]?.name || ACHIEVEMENT_STRINGS[a.key].en.name,
    desc: ACHIEVEMENT_STRINGS[a.key][currentLang]?.desc || ACHIEVEMENT_STRINGS[a.key].en.desc
}));

export function getLocalizedAchievement(key) {
    return ACHIEVEMENT_STRINGS[key]?.[currentLang] || ACHIEVEMENT_STRINGS[key]?.en;
}

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

    const newAchievementLabel = {
        he: '🏅 הישג חדש!',
        en: '🏅 New Achievement!',
        ar: '🏅 إنجاز جديد!',
        ru: '🏅 Новое достижение!',
        fr: '🏅 Nouvel exploit!',
        es: '🏅 ¡Nuevo logro!'
    };

    toast.innerHTML = `
        <div style="font-size:0.65rem;color:#ffd700;letter-spacing:1px;margin-bottom:4px;">${newAchievementLabel[currentLang] || newAchievementLabel.en}</div>
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
