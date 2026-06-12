import { DOM, SKINS, state, resetState, setCurrentSkin, currentSkinKey, loadUnlockedSkins, isSkinUnlocked, unlockSkin, saveMaxLevel, getMaxLevel, getLeaderboard, saveScore, keyBindings, loadKeyBindings, setKeyBinding, gameRules, loadGameRules, setGameRule, deviceMode, loadDeviceMode, setDeviceMode, addCoins, initCoinsUI, UPGRADES, getOwnedUpgrades, hasUpgrade, buyUpgrade, removeUpgrade, resetCoins, getCoins, getDisabledUpgrades, disableUpgrade, enableUpgrade, isUpgradeDisabled, isUpgradeActive, SPEEDRUN_GOALS, getCustomSpeedrunGoals, addCustomSpeedrunGoal, removeCustomSpeedrunGoal, getSpeedrunLeaderboard } from './data.js';
import { updatePlayerPos, movePlayer, updateHPUI, updateAmmoUI, shoot, showFloatingMessage, useVortexLaser, usePhoenixFeathers, useJokerChaos, useDragonFire, rechargeAmmo } from './systems.js';
import { handleSpawning } from './systems.js';
import { updateBullets, updateEnemyBullets, updateBurgers, updateIngredients, updateAsteroids, updateEnemies, updateLightnings } from './updates.js';
import { initAuth, currentUser, isAuthenticated } from './auth.js';
import { initFirestoreSync, getMoneyLeaderboard } from './firestore-sync.js';
import { loadEduConfig, loadQuestionBank, eduConfig, isEduActive, triggerQuiz, resetQuizCooldown, getSubjects, getGradesForSubject, setEduEnabled, setEduSubject, setEduGrade, lockEdu, unlockEdu, buildEduLink, gradeLabel, forceUnlockLocal, applyExpiryIfNeeded, lockMsRemaining, listenForUnlock, startManaging, becomeManager, listenParticipants, unlockAllParticipants, unlockOneParticipant, joinSession } from './education.js';
import { t, applyLang, toggleLang, currentLang, LANGUAGES } from './i18n.js';
import {
    startAnalyticsSession, trackLevelUp, trackPauseStart,
    trackPauseEnd, trackScoreUpdate, trackAbilityUsed
} from './analytics.js';
// ===== INITIALIZATION =====

console.log('🚀 [INIT] Game loading...');
initAuth(); // Initialize Firebase Auth
initFirestoreSync(); // Initialize Firestore sync
loadUnlockedSkins();
loadKeyBindings();
// After cloud sync, reload keyBindings into memory so they take effect immediately
window.__onKeyBindingsSynced = (merged) => {
    Object.assign(keyBindings, merged);
    console.log('🎮 [KEYS] Reloaded from cloud sync:', keyBindings);
};
loadGameRules();
loadDeviceMode();
initCoinsUI();
loadEduConfig();        // Education mode config (may come from a teacher link)
loadQuestionBank();     // Load questions.json (async; fallback bundled)
updateSkinOptions();
initEduSession();        // Connect to shared session (remote unlock / dashboard)
applyLang();             // Apply saved language preference to all [data-i18n] elements

// Re-translate and re-render dynamic JS text whenever the language changes.
window.addEventListener('langchange', () => {
    updateEduSettingsDisplay(); // re-render grade labels
    updateSettingsDisplay();    // re-render buttons
    renderLangList();           // update the active tick in the language tab
});

// Expose toggleLang for the HTML onclick button.
window.toggleLang = toggleLang;
window.pickLang = (code) => { applyLang(code); };

// Heartbeat: re-check the 45-minute auto-unlock, refresh our display name and
// presence (lastSeen) in the shared session, every 15s.
setInterval(() => {
    window.__eduCurrentUser = currentUser; // keep the name fresh once logged in
    const justOpened = applyExpiryIfNeeded();
    if (eduConfig.locked && eduConfig.sessionId) joinSession(true);
    const settingsOpen = document.getElementById('settings-container')?.style.display !== 'none';
    if ((justOpened || eduConfig.managed) && settingsOpen) {
        updateEduSettingsDisplay();
    }
}, 15000);

// ===== EDUCATION SHARED SESSION =====
let eduUnsubUnlock = null;
let eduUnsubParticipants = null;

function initEduSession() {
    // Expose the logged-in user's name for the participant dashboard.
    window.__eduCurrentUser = currentUser;

    if (eduConfig.locked && eduConfig.sessionId) {
        // We're a locked device: announce ourselves and wait for an unlock.
        joinSession(true);
        listenForUnlock(() => {
            updateEduSettingsDisplay();
            showFloatingMessage(t('lockOpened'), 20, 20, 'var(--primary)');
        }).then(unsub => { eduUnsubUnlock = unsub; });
    }
    if (eduConfig.managed && eduConfig.sessionId) {
        // We created the password: keep the session doc alive and watch the roster.
        startManaging();
    }
}

// Allow the quiz modal to resume the paused game loop.
window.__resumeGameLoop = () => requestAnimationFrame(update);

// Enemy-kill quiz hook (called from updates.js). The 10s cooldown inside the
// education module keeps this from firing too often.
window.__onEnemyKilled = () => {
    if (!isEduActive()) return;
    triggerQuiz('kill', {
        onCorrect: () => {
            const heal = Math.round(state.playerMaxHP * 0.10);
            state.playerHP = Math.min(state.playerMaxHP, state.playerHP + heal);
            updateHPUI();
            showFloatingMessage(`+${heal} HP`, DOM.wrapper.clientWidth/2 - 30, DOM.wrapper.clientHeight/2 + 40, "var(--health)");
        }
    });
};

// Initialize floating settings button
document.getElementById('floating-settings-btn').style.display = 'flex';
document.getElementById('floating-settings-btn').onclick = showSettings;

console.log('✅ [INIT] Game loaded successfully');

// ===== LEADERBOARD =====

let _currentLeaderboardEntries = [];
let _currentBestsEntries = [];
let _esActiveFilter = 'all';

// ===== FILTER SYSTEM =====

// lang is now a multi-select array: [] = all, ['he','en'] = those only
// Entries without settings are shown ONLY when filter = "all" state,
// EXCEPT for filters with meaningful defaults (edu=off, upgrades=none, rules=defaults, rightClick=true).

const FILTER_CATS = [
    { key: 'device',   icon: '📱', label: 'Device'   },
    { key: 'rules',    icon: '📜', label: 'Rules'   },
    { key: 'controls', icon: '🎮', label: 'Controls'   },
    { key: 'edu',      icon: '📚', label: 'Education'  },
    { key: 'lang',     icon: '🌐', label: 'Language'     },
    { key: 'upgrades', icon: '🛍️', label: 'Upgrades' },
];

function defaultFilters() {
    return { activeCategories: [], device: 'all', edu: 'all', lang: [], upgrades: {}, rules: {}, controls: {} };
}
let _lbFilters    = defaultFilters();
let _histFilters  = defaultFilters();
let _bestsFilters = defaultFilters();

const _filterMap = () => ({ 'lb-filter-bar': _lbFilters, 'hist-filter-bar': _histFilters, 'bests-filter-bar': _bestsFilters });

// Tri-state icons/cycles
const _upgStateIcon = { any: '⬜', required: '✅', forbidden: '🚫' };
const _upgStateNext = { any: 'required', required: 'forbidden', forbidden: 'any' };
const _boolIcon     = { any: '⬜', 'true': '✅', 'false': '🚫' };
const _boolNext     = { any: 'true', 'true': 'false', 'false': 'any' };

const LANGS = [
    { code:'he',  label:'עברית',   flag:'🇮🇱' },
    { code:'en',  label:'English',  flag:'🇺🇸' },
    { code:'ar',  label:'عربي',    flag:'🇸🇦' },
    { code:'ru',  label:'Русский',  flag:'🇷🇺' },
    { code:'fr',  label:'Français', flag:'🇫🇷' },
    { code:'es',  label:'Español',  flag:'🇪🇸' },
];

function catHasFilter(catKey, f) {
    if (catKey === 'device')   return f.device !== 'all';
    if (catKey === 'edu')      return f.edu !== 'all';
    if (catKey === 'lang')     return Array.isArray(f.lang) ? f.lang.length > 0 : f.lang !== 'all';
    if (catKey === 'upgrades') return f.upgrades && Object.values(f.upgrades).some(v => v !== 'any');
    if (catKey === 'rules')    return f.rules && Object.values(f.rules).some(v => v !== 'any');
    if (catKey === 'controls') return f.controls && Object.values(f.controls).some(v => v && v !== 'any');
    return false;
}

function resetCatFilters(catKey, f) {
    if (catKey === 'device')   { f.device = 'all'; return; }
    if (catKey === 'edu')      { f.edu = 'all'; return; }
    if (catKey === 'lang')     { f.lang = []; return; }
    if (catKey === 'upgrades') { f.upgrades = {}; return; }
    if (catKey === 'rules')    { f.rules = {}; return; }
    if (catKey === 'controls') { f.controls = {}; return; }
}

function renderCatPanel(catKey, filters, cid) {
    const f = filters;
    switch (catKey) {
        case 'device': {
            const note = `<div style="font-size:0.63rem;opacity:0.45;margin-bottom:5px;">No settings → shown only in "All"</div>`;
            return note + `<div style="display:flex;gap:4px;flex-wrap:wrap;">
                ${[['all','All'],['mobile','📱 Mobile'],['desktop','🖥️ Desktop']].map(([v,lbl]) =>
                    `<button class="es-filter${f.device===v?' active':''}" onclick="window.__filterSet('${cid}','device','${v}')">${lbl}</button>`
                ).join('')}</div>`;
        }

        case 'rules': {
            const RULES = {
                enemiesShootThroughAsteroids: 'Enemies shoot through asteroids',
                playerShootThroughAsteroids:  'Player shoots through asteroids',
            };
            return `<div style="font-size:0.64rem;opacity:0.5;margin-bottom:5px;">⬜=Any &nbsp;✅=Yes &nbsp;🚫=No &nbsp;· No settings → defaults</div>` +
                Object.entries(RULES).map(([key, label]) => {
                    const cur = (f.rules||{})[key] || 'any';
                    const aS  = cur !== 'any' ? ';border-color:var(--primary);color:var(--primary)' : '';
                    return `<div style="display:flex;align-items:center;gap:8px;padding:3px 0;">
                        <button class="es-filter" onclick="window.__filterBoolState('${cid}','rules','${key}')"
                            style="font-size:1rem;padding:2px 8px;min-width:36px${aS}">${_boolIcon[cur]}</button>
                        <span style="font-size:0.75rem;">${label}</span></div>`;
                }).join('');
        }

        case 'controls': {
            const ctrlType   = (f.controls||{}).controlType       || 'any';
            const rightClick = (f.controls||{}).rightClickAbility || 'any';
            const rcS = rightClick !== 'any' ? ';border-color:var(--primary);color:var(--primary)' : '';
            return `<div style="display:flex;flex-direction:column;gap:7px;">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span style="font-size:0.72rem;opacity:0.7;white-space:nowrap;min-width:78px;">Control type:</span>
                    <div style="display:flex;gap:3px;">
                        ${[['any','All'],['mouse','🖱️ Mouse'],['arrows','⬆️ Arrows']].map(([v,lbl]) =>
                            `<button class="es-filter${ctrlType===v?' active':''}" onclick="window.__filterSetCtrl('${cid}','controlType','${v}')">${lbl}</button>`
                        ).join('')}
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:0.72rem;opacity:0.7;white-space:nowrap;min-width:78px;">Right-click:</span>
                    <button class="es-filter" onclick="window.__filterBoolState('${cid}','controls','rightClickAbility')"
                        style="font-size:1rem;padding:2px 8px;min-width:36px${rcS}">${_boolIcon[rightClick]}</button>
                    <span style="font-size:0.63rem;opacity:0.45;">⬜=Any ✅=Yes 🚫=No &nbsp;· No settings → Yes</span>
                </div>
            </div>`;
        }

        case 'edu':
            return `<div style="font-size:0.63rem;opacity:0.45;margin-bottom:5px;">No settings → Off</div>
                <div style="display:flex;gap:4px;flex-wrap:wrap;">
                ${[['all','All'],['on','✅ On'],['off','❌ Off']].map(([v,lbl]) =>
                    `<button class="es-filter${f.edu===v?' active':''}" onclick="window.__filterSet('${cid}','edu','${v}')">${lbl}</button>`
                ).join('')}</div>`;

        case 'lang': {
            const sel = Array.isArray(f.lang) ? f.lang : [];
            const isAll = sel.length === 0;
            return `<div style="font-size:0.63rem;opacity:0.45;margin-bottom:5px;">Multi-select · No settings → shown only in "All"</div>
                <div style="display:flex;gap:4px;flex-wrap:wrap;">
                    <button class="es-filter${isAll?' active':''}" onclick="window.__filterToggleLang('${cid}',null)">All</button>
                    ${LANGS.map(l =>
                        `<button class="es-filter${sel.includes(l.code)?' active':''}" onclick="window.__filterToggleLang('${cid}','${l.code}')">${l.flag} ${l.label}</button>`
                    ).join('')}
                </div>`;
        }

        case 'upgrades':
            if (!Object.keys(UPGRADES).length) return `<span style="opacity:0.5;font-size:0.8rem;">No upgrades</span>`;
            return `<div style="font-size:0.64rem;opacity:0.5;margin-bottom:5px;">⬜=Any &nbsp;✅=Required &nbsp;🚫=Forbidden &nbsp;· No settings → No upgrades</div>` +
                Object.values(UPGRADES).map(u => {
                    const cur = (f.upgrades||{})[u.key] || 'any';
                    const aS  = cur !== 'any' ? ';border-color:var(--primary);color:var(--primary)' : '';
                    return `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;">
                        <button class="es-filter" onclick="window.__filterCycleUpgrade('${cid}','${u.key}')"
                            style="font-size:1rem;padding:2px 6px;min-width:34px${aS}">${_upgStateIcon[cur]}</button>
                        <span style="font-size:0.75rem;">${u.name}</span></div>`;
                }).join('');

        default: return '';
    }
}

function applyEntryFilters(entries, filters) {
    return entries.filter(e => {
        const s = e.settings || null;

        // Device: no settings → only show when filter = 'all'
        if (filters.device !== 'all') {
            if (!s) return false;
            if (filters.device === 'mobile'  && !s.isMobile) return false;
            if (filters.device === 'desktop' &&  s.isMobile) return false;
        }

        // Edu: no settings → default = off
        const eduEnabled = s ? !!s.eduEnabled : false;
        if (filters.edu === 'on'  && !eduEnabled) return false;
        if (filters.edu === 'off' &&  eduEnabled) return false;

        // Lang: multi-select array; no settings → only show when selection is empty (all)
        const langSel = Array.isArray(filters.lang) ? filters.lang : (filters.lang !== 'all' ? [filters.lang] : []);
        if (langSel.length > 0) {
            if (!s || !s.lang) return false;
            if (!langSel.includes(s.lang)) return false;
        }

        // Upgrades: no settings → default = no upgrades
        const ups = s ? (s.upgrades || []) : [];
        for (const [key, state] of Object.entries(filters.upgrades || {})) {
            if (state === 'required' && !ups.includes(key)) return false;
            if (state === 'forbidden' &&  ups.includes(key)) return false;
        }

        // Rules: no settings → use game defaults (enemies=true, player=false)
        const ruleDef = { enemiesShootThroughAsteroids: true, playerShootThroughAsteroids: false };
        for (const [key, state] of Object.entries(filters.rules || {})) {
            if (state === 'any') continue;
            const val = s ? !!s[key] : !!ruleDef[key];
            if (state === 'true'  && !val) return false;
            if (state === 'false' &&  val) return false;
        }

        // Controls:
        // - controlType: no settings → only show when filter = 'any'
        // - rightClickAbility: no settings → default = true
        for (const [key, value] of Object.entries(filters.controls || {})) {
            if (!value || value === 'any') continue;
            if (key === 'rightClickAbility') {
                const val = s ? !!s.rightClickAbility : true;
                if (value === 'true'  && !val) return false;
                if (value === 'false' &&  val) return false;
            } else {
                // controlType etc: no settings → exclude
                if (!s) return false;
                if (s[key] !== value) return false;
            }
        }

        return true;
    });
}

function countActiveFilters(filters) {
    let n = 0;
    if (filters.device !== 'all') n++;
    if (filters.edu    !== 'all') n++;
    const langSel = Array.isArray(filters.lang) ? filters.lang : [];
    n += langSel.length;
    if (filters.upgrades) n += Object.values(filters.upgrades).filter(v => v !== 'any').length;
    if (filters.rules)    n += Object.values(filters.rules).filter(v => v !== 'any').length;
    if (filters.controls) n += Object.values(filters.controls).filter(v => v && v !== 'any').length;
    return n;
}

function renderFilterBar(containerId, filters, onChange) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const active    = countActiveFilters(filters);
    const badge     = active > 0 ? ` <span style="background:#00f2ff;color:#000;border-radius:9px;padding:0 5px;font-size:0.65rem;font-weight:bold;">${active}</span>` : '';
    const activeCats = filters.activeCategories || [];

    const catBtns = FILTER_CATS.map(cat => {
        const isOpen    = activeCats.includes(cat.key);
        const hasFilter = catHasFilter(cat.key, filters);
        let style = '';
        if (isOpen)         style = 'border-color:var(--primary);color:var(--primary);background:rgba(0,242,255,0.12);';
        else if (hasFilter) style = 'border-color:rgba(255,215,0,0.55);color:#ffd700;';
        return `<button class="es-filter" onclick="window.__filterToggleCat('${containerId}','${cat.key}')" style="${style}">${cat.icon} ${cat.label}${hasFilter ? ' ·' : ''}</button>`;
    }).join('');

    const panels = activeCats.map(catKey => {
        const catDef = FILTER_CATS.find(c => c.key === catKey);
        if (!catDef) return '';
        return `<div style="border:1px solid rgba(0,242,255,0.2);border-radius:8px;padding:8px 12px;margin-top:8px;text-align:right;">
            <div style="font-size:0.7rem;font-weight:bold;color:var(--primary);margin-bottom:7px;">${catDef.icon} ${catDef.label}</div>
            ${renderCatPanel(catKey, filters, containerId)}
        </div>`;
    }).join('');

    el.innerHTML = `
        <details class="filter-bar">
            <summary style="cursor:pointer;font-size:0.78rem;opacity:0.8;user-select:none;list-style:none;display:flex;align-items:center;gap:5px;justify-content:center;padding:4px 0;">
                🔍 Filters${badge}
            </summary>
            <div style="padding:8px 2px;">
                <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:center;margin-bottom:2px;">${catBtns}</div>
                ${panels}
                ${active > 0 ? `<div style="text-align:center;margin-top:8px;"><button class="es-filter" onclick="window.__filterReset('${containerId}')" style="color:#ff4d4d;border-color:#ff4d4d;">✕ Clear All</button></div>` : ''}
            </div>
        </details>
    `;

    const wasOpen = el._wasOpen || el.querySelector('details')?.open;
    if (wasOpen) el.querySelector('details').open = true;
    el._wasOpen = false;
    el._onChange = onChange;
}

// ── filter event handlers ──────────────────────────────────────────────────

window.__filterToggleCat = function(cid, catKey) {
    const el = document.getElementById(cid);
    if (!el || !el._onChange) return;
    const f = _filterMap()[cid];
    if (!f) return;
    if (!f.activeCategories) f.activeCategories = [];
    const idx = f.activeCategories.indexOf(catKey);
    if (idx >= 0) { f.activeCategories.splice(idx, 1); resetCatFilters(catKey, f); }
    else          { f.activeCategories.push(catKey); }
    el._wasOpen = true;
    el._onChange(f);
};

// Single-select: 'all' button stays 'all' (never toggles off)
window.__filterSet = function(cid, key, value) {
    const el = document.getElementById(cid);
    if (!el || !el._onChange) return;
    const f = _filterMap()[cid];
    if (!f) return;
    // Clicking active non-all option resets to all; clicking all always stays all
    f[key] = (f[key] === value && value !== 'all') ? 'all' : value;
    el._wasOpen = true;
    el._onChange(f);
};

// Multi-select language toggle
window.__filterToggleLang = function(cid, code) {
    const el = document.getElementById(cid);
    if (!el || !el._onChange) return;
    const f = _filterMap()[cid];
    if (!f) return;
    if (!Array.isArray(f.lang)) f.lang = [];
    if (!code) { f.lang = []; }  // "All" clicked → clear
    else {
        const idx = f.lang.indexOf(code);
        if (idx >= 0) f.lang.splice(idx, 1);
        else f.lang.push(code);
    }
    el._wasOpen = true;
    el._onChange(f);
};

window.__filterBoolState = function(cid, group, key) {
    const el = document.getElementById(cid);
    if (!el || !el._onChange) return;
    const f = _filterMap()[cid];
    if (!f || !f[group]) return;
    const cur = f[group][key] || 'any';
    f[group][key] = _boolNext[cur];
    el._wasOpen = true;
    el._onChange(f);
};

// controlType: 'any' button always stays 'any' (never toggles off)
window.__filterSetCtrl = function(cid, key, value) {
    const el = document.getElementById(cid);
    if (!el || !el._onChange) return;
    const f = _filterMap()[cid];
    if (!f) return;
    if (!f.controls) f.controls = {};
    f.controls[key] = (f.controls[key] === value && value !== 'any') ? 'any' : value;
    el._wasOpen = true;
    el._onChange(f);
};

window.__filterCycleUpgrade = function(cid, upgradeKey) {
    const el = document.getElementById(cid);
    if (!el || !el._onChange) return;
    const f = _filterMap()[cid];
    if (!f) return;
    if (!f.upgrades) f.upgrades = {};
    f.upgrades[upgradeKey] = _upgStateNext[f.upgrades[upgradeKey] || 'any'];
    el._wasOpen = true;
    el._onChange(f);
};

window.__filterReset = function(cid) {
    const el = document.getElementById(cid);
    if (!el || !el._onChange) return;
    const f = _filterMap()[cid];
    if (!f) return;
    const openCats = [...(f.activeCategories || [])];
    Object.assign(f, defaultFilters());
    f.activeCategories = openCats;
    el._wasOpen = true;
    el._onChange(f);
};

// ===== LEADERBOARD TAB STATE =====
let _lbMode      = 'score';   // 'score' | 'speedrun' | 'money'
let _lbSkinSel   = [];        // [] = all/overall; ['classic','phoenix'] = multi-select
let _lbSrGoal    = SPEEDRUN_GOALS[0]?.key || 'score_10k';
let _lbSrSkinSel = [];        // skin filter for speedrun

// All named skins (no 'overall' entry — 'overall' is the empty-selection state)
const LB_SKINS = [
    { key: 'classic',     label: 'Classic'     },
    { key: 'interceptor', label: 'Interceptor' },
    { key: 'tanker',      label: 'Tanker'      },
    { key: 'phoenix',     label: 'Phoenix'     },
    { key: 'vortex',      label: 'Vortex'      },
    { key: 'joker',       label: 'Joker'       },
    { key: 'dragon',      label: '🐉 Dragon'   },
];

function _skinSubHtml(sel, onClickFn) {
    const isAll = sel.length === 0;
    return `<button class="lb-tab${isAll?' active':''}" onclick="${onClickFn}(null)">🏆 כללי</button>` +
        LB_SKINS.map(s =>
            `<button class="lb-tab${sel.includes(s.key)?' active':''}" onclick="${onClickFn}('${s.key}')">${s.label}</button>`
        ).join('');
}

function renderLbTabs() {
    const modeEl = document.getElementById('lb-mode-tabs');
    if (modeEl) {
        modeEl.innerHTML = [
            { key: 'score',    label: '🏆 ניקוד'   },
            { key: 'speedrun', label: '⚡ ספידראן' },
            { key: 'money',    label: '💰 כסף'     },
        ].map(m =>
            `<button class="lb-tab${_lbMode===m.key?' active':''}" onclick="window.__lbSetMode('${m.key}')">${m.label}</button>`
        ).join('');
    }

    const subEl = document.getElementById('lb-sub-tabs');
    if (!subEl) return;

    if (_lbMode === 'score') {
        subEl.style.display = '';
        subEl.innerHTML = _skinSubHtml(_lbSkinSel, 'window.__lbToggleSkin');
    } else if (_lbMode === 'speedrun') {
        const allGoals = [...SPEEDRUN_GOALS, ...getCustomSpeedrunGoals()];
        const goalBtns = allGoals.map(g =>
            `<button class="lb-tab${_lbSrGoal===g.key?' active':''}${g.key.startsWith('custom_')?' style="border-style:dashed;"':''}" onclick="window.__lbSetGoal('${g.key}')">${g.icon} ${g.label}${g.key.startsWith('custom_')?` <span onclick="event.stopPropagation();window.__lbRemoveGoal('${g.key}')" style="opacity:0.5;margin-right:4px;" title="מחק">✕</span>`:''}</button>`
        ).join('') + `<button class="lb-tab" onclick="window.__lbAddCustomGoal()" style="border-style:dashed;opacity:0.65;">＋ מותאם</button>`;

        const skinBtns = `<div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:5px;padding-top:5px;display:flex;gap:4px;flex-wrap:wrap;justify-content:center;font-size:0.75rem;">
            ${_skinSubHtml(_lbSrSkinSel, 'window.__lbSrToggleSkin')}
        </div>`;

        subEl.style.display = '';
        subEl.innerHTML = goalBtns + skinBtns;
    } else {
        subEl.style.display = 'none';
    }
}

function _lbTriggerDisplay() {
    if (_lbMode === 'score')         displayLeaderboard(_lbSkinSel);
    else if (_lbMode === 'speedrun') displaySpeedrunLeaderboard(_lbSrGoal);
    else                             displayLeaderboard('money');
}

// Multi-select skin toggle (regular LB)
window.__lbToggleSkin = function(key) {
    if (!key) { _lbSkinSel = []; }
    else {
        const idx = _lbSkinSel.indexOf(key);
        if (idx >= 0) _lbSkinSel.splice(idx, 1); else _lbSkinSel.push(key);
    }
    renderLbTabs();
    displayLeaderboard(_lbSkinSel);
};

// Multi-select skin toggle (speedrun)
window.__lbSrToggleSkin = function(key) {
    if (!key) { _lbSrSkinSel = []; }
    else {
        const idx = _lbSrSkinSel.indexOf(key);
        if (idx >= 0) _lbSrSkinSel.splice(idx, 1); else _lbSrSkinSel.push(key);
    }
    renderLbTabs();
    _renderSrContent(_lbSrGoal);
};

window.__lbSetMode = function(mode) { _lbMode = mode; renderLbTabs(); _lbTriggerDisplay(); };
window.__lbSetGoal = function(key)  { _lbSrGoal = key; renderLbTabs(); displaySpeedrunLeaderboard(key); };
window.__lbRemoveGoal = function(key) {
    removeCustomSpeedrunGoal(key);
    if (_lbSrGoal === key) _lbSrGoal = SPEEDRUN_GOALS[0]?.key || '';
    renderLbTabs();
    displaySpeedrunLeaderboard(_lbSrGoal);
};
window.__lbAddCustomGoal = function() {
    const container = document.getElementById('lb-sub-tabs');
    if (!container) return;
    const formId = 'sr-custom-goal-form';
    const existing = document.getElementById(formId);
    if (existing) { existing.remove(); return; }
    const form = document.createElement('div');
    form.id = formId;
    form.style.cssText = 'margin-top:8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:center;';
    form.innerHTML = `
        <select id="sr-goal-type" style="padding:4px 8px;background:#111;color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:6px;">
            <option value="score">ניקוד</option>
            <option value="level">שלב</option>
        </select>
        <input id="sr-goal-target" type="number" min="1" placeholder="ערך יעד"
            style="width:110px;background:#111;color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:6px;padding:4px 8px;font-size:0.85rem;" />
        <button class="es-filter" onclick="window.__lbSaveCustomGoal()" style="color:#00f2ff;border-color:#00f2ff;">✅ הוסף</button>
        <button class="es-filter" onclick="document.getElementById('sr-custom-goal-form')?.remove()">✕</button>`;
    container.parentNode.insertBefore(form, container.nextSibling);
};
window.__lbSaveCustomGoal = function() {
    const type   = document.getElementById('sr-goal-type')?.value;
    const target = parseInt(document.getElementById('sr-goal-target')?.value);
    if (!type || !target || target < 1) return;
    const goal = addCustomSpeedrunGoal(type, target);
    document.getElementById('sr-custom-goal-form')?.remove();
    if (goal) { _lbSrGoal = goal.key; _lbMode = 'speedrun'; }
    renderLbTabs();
    displaySpeedrunLeaderboard(_lbSrGoal);
};

function showLeaderboard() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('leaderboard-container').style.display = 'block';
    renderLbTabs();
    _lbTriggerDisplay();
}

function closeLeaderboard() {
    console.log('❌ [LEADERBOARD] Closing leaderboard...');
    document.getElementById('leaderboard-container').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
    document.getElementById('floating-settings-btn').style.display = 'flex';
    console.log('✅ [LEADERBOARD] Leaderboard closed');
}

// ===== SHOP =====

function showShop() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('floating-settings-btn').style.display = 'none';
    const shopEl = document.getElementById('shop-container');
    shopEl.style.display = 'block';
    document.getElementById('shop-coins-display').innerText = getCoins();
    renderShopItems();
}

function closeShop() {
    document.getElementById('shop-container').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
    document.getElementById('floating-settings-btn').style.display = 'flex';
}

function renderShopItems() {
    const container = document.getElementById('shop-items');
    const coins = getCoins();
    container.innerHTML = '';
    Object.values(UPGRADES).forEach(upg => {
        const owned = hasUpgrade(upg.key);
        const disabled = owned && isUpgradeDisabled(upg.key);
        const active = owned && !disabled;
        const canAfford = coins >= upg.cost;
        const refund = Math.floor(upg.cost * 0.75);

        const borderColor = active ? 'rgba(0,255,100,0.4)' : disabled ? 'rgba(255,150,0,0.4)' : canAfford ? 'rgba(255,215,0,0.35)' : 'rgba(255,255,255,0.15)';
        const bgColor = active ? 'rgba(0,255,100,0.08)' : disabled ? 'rgba(255,150,0,0.06)' : 'rgba(255,255,255,0.05)';

        const item = document.createElement('div');
        item.style.cssText = `padding:14px 16px; background:${bgColor}; border:1px solid ${borderColor}; border-radius:10px; text-align:right; display:flex; justify-content:space-between; align-items:flex-start; gap:12px;`;

        const nameColor = active ? '#00ff64' : disabled ? '#ffa040' : '#fff';
        const statusBadge = active
            ? '<span style="font-size:0.7rem;background:rgba(0,255,100,0.15);border:1px solid #00ff64;border-radius:4px;padding:1px 6px;color:#00ff64;">✅ פעיל</span>'
            : disabled
                ? '<span style="font-size:0.7rem;background:rgba(255,150,0,0.15);border:1px solid #ffa040;border-radius:4px;padding:1px 6px;color:#ffa040;">🚫 מושבת</span>'
                : '';

        const info = document.createElement('div');
        info.style.cssText = 'flex:1; min-width:0;';
        info.innerHTML = `
            <div style="font-size:0.95rem;font-weight:bold;color:${nameColor};margin-bottom:4px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                ${upg.name} ${statusBadge}
            </div>
            <div style="font-size:0.78rem;opacity:0.75;">${upg.desc}</div>
            ${upg.skin ? `<div style="font-size:0.72rem;opacity:0.5;margin-top:3px;">⚠️ רק לסקין ${upg.skin}</div>` : ''}
        `;

        const actionsDiv = document.createElement('div');
        actionsDiv.style.cssText = 'display:flex;flex-direction:column;gap:5px;min-width:90px;align-items:stretch;';

        if (owned) {
            if (disabled) {
                // State: owned & disabled — Enable or Return
                const enableBtn = document.createElement('button');
                enableBtn.textContent = '▶ הפעל';
                enableBtn.style.cssText = 'background:rgba(0,255,100,0.15);border-color:#00ff64;color:#00ff64;padding:7px 10px;font-size:0.78rem;cursor:pointer;';
                enableBtn.onclick = () => { enableUpgrade(upg.key); renderShopItems(); };

                const removeBtn = document.createElement('button');
                removeBtn.textContent = `↩ החזר (💰${refund})`;
                removeBtn.style.cssText = 'background:rgba(255,77,77,0.12);border-color:#ff4d4d;color:#ff4d4d;padding:6px 8px;font-size:0.7rem;cursor:pointer;';
                removeBtn.onclick = () => {
                    const r = removeUpgrade(upg.key);
                    if (r !== false) { document.getElementById('shop-coins-display').innerText = getCoins(); if (DOM.coinsEl) DOM.coinsEl.innerText = getCoins(); renderShopItems(); }
                };

                actionsDiv.appendChild(enableBtn);
                actionsDiv.appendChild(removeBtn);
            } else {
                // State: owned & active — Disable or Return
                const ownedBtn = document.createElement('button');
                ownedBtn.textContent = '✅ נרכש';
                ownedBtn.disabled = true;
                ownedBtn.style.cssText = 'background:rgba(0,255,100,0.15);border-color:#00ff64;color:#00ff64;padding:7px 10px;font-size:0.78rem;cursor:default;';

                const disableBtn = document.createElement('button');
                disableBtn.textContent = '🚫 השבת';
                disableBtn.style.cssText = 'background:rgba(255,150,0,0.12);border-color:#ffa040;color:#ffa040;padding:6px 8px;font-size:0.72rem;cursor:pointer;';
                disableBtn.onclick = () => { disableUpgrade(upg.key); renderShopItems(); };

                const removeBtn = document.createElement('button');
                removeBtn.textContent = `↩ החזר (💰${refund})`;
                removeBtn.style.cssText = 'background:rgba(255,77,77,0.12);border-color:#ff4d4d;color:#ff4d4d;padding:6px 8px;font-size:0.7rem;cursor:pointer;';
                removeBtn.onclick = () => {
                    const r = removeUpgrade(upg.key);
                    if (r !== false) { document.getElementById('shop-coins-display').innerText = getCoins(); if (DOM.coinsEl) DOM.coinsEl.innerText = getCoins(); renderShopItems(); }
                };

                actionsDiv.appendChild(ownedBtn);
                actionsDiv.appendChild(disableBtn);
                actionsDiv.appendChild(removeBtn);
            }
        } else {
            // State: not owned — Buy
            const buyBtn = document.createElement('button');
            buyBtn.textContent = `💰 ${upg.cost}`;
            buyBtn.disabled = !canAfford;
            buyBtn.style.cssText = `background:${canAfford ? 'rgba(255,215,0,0.2)' : 'rgba(100,100,100,0.1)'};border-color:${canAfford ? '#ffd700' : '#555'};color:${canAfford ? '#ffd700' : '#555'};padding:8px 14px;font-size:0.85rem;min-width:80px;cursor:${canAfford ? 'pointer' : 'default'};`;
            buyBtn.onclick = () => {
                if (buyUpgrade(upg.key)) { document.getElementById('shop-coins-display').innerText = getCoins(); if (DOM.coinsEl) DOM.coinsEl.innerText = getCoins(); renderShopItems(); }
            };
            actionsDiv.appendChild(buyBtn);
        }

        item.appendChild(info);
        item.appendChild(actionsDiv);
        container.appendChild(item);
    });
}

// ===== ENTRY SETTINGS VIEW =====

function showEntrySettings(idx) {
    const entry = _currentLeaderboardEntries[idx];
    if (!entry) return;

    const isFallback = !entry.settings;
    const s = entry.settings || {
        isMobile: deviceMode.isMobile,
        controlType: keyBindings.controlType,
        shoot: keyBindings.shoot,
        ability: keyBindings.ability,
        rightClickAbility: keyBindings.rightClickAbility,
        enemiesShootThroughAsteroids: gameRules.enemiesShootThroughAsteroids,
        playerShootThroughAsteroids: gameRules.playerShootThroughAsteroids,
        eduEnabled: eduConfig.enabled,
        eduSubject: eduConfig.subject,
        eduGrade: eduConfig.grade,
        lang: currentLang,
        gameDuration: null,
        startTime: null
    };

    // Hide whichever panel is currently visible and remember it
    const container = document.getElementById('entry-settings-container');
    let returnTo = 'leaderboard-container';
    ['leaderboard-container','history-container'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.style.display !== 'none') { el.style.display = 'none'; returnTo = id; }
    });
    container.dataset.returnTo = returnTo;
    container.style.display = 'block';

    // Meta info
    const skinName = SKINS[entry.skin]?.name || entry.skin || '';
    document.getElementById('es-meta').textContent =
        `👤 ${entry.userName || 'Anonymous'} | ${(entry.score || 0).toLocaleString()} pts | ${t('levelWord')} ${entry.level}${skinName ? ' • ' + skinName : ''} | ${entry.date || ''}`;

    // Duration
    const durationEl = document.getElementById('es-duration');
    if (s.gameDuration) {
        const mins = Math.floor(s.gameDuration / 60000);
        const secs = Math.floor((s.gameDuration % 60000) / 1000);
        durationEl.textContent = `${t('esDuration')}: ${mins}:${String(secs).padStart(2, '0')}`;
        durationEl.style.display = 'block';
    } else {
        durationEl.style.display = 'none';
    }

    // Fallback note
    document.getElementById('es-fallback-note').style.display = isFallback ? 'block' : 'none';

    // Hide controls tab on mobile (no keyboard)
    const controlsBtn = document.querySelector('.es-filter[data-cat="controls"]');
    if (controlsBtn) controlsBtn.style.display = s.isMobile ? 'none' : '';

    // Store settings on container for filter updates
    container._esSettings = s;

    // Reset filter to "all"
    _esActiveFilter = 'all';
    document.querySelectorAll('.es-filter').forEach(b => b.classList.toggle('active', b.dataset.cat === 'all'));
    renderEntrySettingsBody(s, 'all');
}

function closeEntrySettings() {
    const c = document.getElementById('entry-settings-container');
    c.style.display = 'none';
    const returnTo = c.dataset.returnTo || 'leaderboard-container';
    c.dataset.returnTo = '';
    c.dataset.backTo = '';
    document.getElementById(returnTo).style.display = 'block';
}

function setEntrySettingsFilter(cat) {
    _esActiveFilter = cat;
    document.querySelectorAll('.es-filter').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
    const container = document.getElementById('entry-settings-container');
    renderEntrySettingsBody(container._esSettings || {}, cat);
}

function renderEntrySettingsBody(s, cat) {
    const langInfo = LANGUAGES.find(l => l.code === s.lang) || LANGUAGES[0];
    const subjects = getSubjects();
    const subjName = subjects.find(sub => sub.key === s.eduSubject)?.name || s.eduSubject || '-';

    const fmtKey = (code) => {
        if (!code) return '?';
        if (code === 'Space') return 'Space';
        if (code.startsWith('Key')) return code.replace('Key', '');
        if (code.startsWith('Digit')) return code.replace('Digit', '');
        return code;
    };

    const bool = (v) => v
        ? `<span class="es-val-yes">✅ ${currentLang === 'en' ? 'Yes' : 'כן'}</span>`
        : `<span class="es-val-no">❌ ${currentLang === 'en' ? 'No' : 'לא'}</span>`;

    const row = (label, value) =>
        `<div class="es-row"><span class="es-label">${label}</span><span class="es-value">${value}</span></div>`;

    const ownedUpgrades = s.upgrades || [];
    const upgradesHtml = ownedUpgrades.length > 0
        ? ownedUpgrades.map(key => {
            const upg = UPGRADES[key];
            return upg
                ? `<div class="es-row" style="flex-direction:column; align-items:flex-start; gap:2px;">
                    <span style="font-weight:bold;">${upg.name}</span>
                    <span style="font-size:0.78rem; opacity:0.75;">${upg.desc}</span>
                  </div>`
                : `<div class="es-row"><span class="es-value">${key}</span></div>`;
          }).join('')
        : `<div class="es-row"><span style="opacity:0.6;">No upgrades</span></div>`;

    const groups = {
        device: `<div class="es-group" data-cat="device">
            <div class="es-group-title">${t('tabDevice')}</div>
            ${row(t('deviceLabel'), s.isMobile
                ? `📱 ${t('deviceMobile').replace(/^📱\s*/, '')}`
                : `🖥️ ${t('deviceDesktop').replace(/^🖥️\s*/, '')}`)}
        </div>`,

        controls: s.isMobile ? '' : `<div class="es-group" data-cat="controls">
            <div class="es-group-title">${t('tabControls')}</div>
            ${row(t('controlLabel'), s.controlType === 'mouse' ? t('controlMouse') : t('controlArrows'))}
            ${row(t('shootKeyLabel'), `<kbd>${fmtKey(s.shoot)}</kbd>`)}
            ${row(t('abilityKeyLabel'), `<kbd>${fmtKey(s.ability)}</kbd>`)}
            ${row(t('rightClickLabel'), bool(s.rightClickAbility))}
        </div>`,

        rules: `<div class="es-group" data-cat="rules">
            <div class="es-group-title">${t('tabRules')}</div>
            ${row(t('enemiesAsteLabel'), bool(s.enemiesShootThroughAsteroids))}
            ${row(t('playerAsteLabel'), bool(s.playerShootThroughAsteroids))}
        </div>`,

        edu: `<div class="es-group" data-cat="edu">
            <div class="es-group-title">${t('tabEdu')}</div>
            ${row(t('eduOnOffLabel'), s.eduEnabled
                ? `✅ ${t('eduOn').replace(/^✅\s*/, '')}`
                : `❌ ${t('eduOff').replace(/^❌\s*/, '')}`)}
            ${s.eduEnabled ? row(t('subjectLabel'), subjName) : ''}
            ${s.eduEnabled ? row(t('gradeLabel_'), gradeLabel(s.eduGrade || '1')) : ''}
        </div>`,

        lang: `<div class="es-group" data-cat="lang">
            <div class="es-group-title">${t('tabLang')}</div>
            ${row(t('langLabel'), `${langInfo.flag} ${langInfo.name}`)}
        </div>`,

        upgrades: `<div class="es-group" data-cat="upgrades">
            <div class="es-group-title">🛍️ Upgrades</div>
            ${upgradesHtml}
        </div>`
    };

    document.getElementById('es-body').innerHTML =
        cat === 'all' ? Object.values(groups).join('') : (groups[cat] || '');
}

// Export to window for HTML onclick
window.showEntrySettings = showEntrySettings;
window.closeEntrySettings = closeEntrySettings;
window.setEntrySettingsFilter = setEntrySettingsFilter;

let _rawLeaderboard = [];

function _renderLbContent() {
    const content = document.getElementById('leaderboard-content');
    if (!content) return;

    renderFilterBar('lb-filter-bar', _lbFilters, () => _renderLbContent());

    const sortedRaw = [..._rawLeaderboard].sort((a, b) => (b.level - a.level) || (b.score - a.score));
    const filtered = applyEntryFilters(sortedRaw, _lbFilters);
    _currentLeaderboardEntries = filtered;

    if (filtered.length === 0) {
        const hasAny = _rawLeaderboard.length > 0;
        content.innerHTML = `<div class="lb-empty">${hasAny ? 'No results for these filters' : t('lbEmpty')}</div>`;
        return;
    }

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    const countNote = countActiveFilters(_lbFilters) > 0
        ? `<div style="font-size:0.72rem;opacity:0.5;margin-bottom:6px;">${filtered.length} / ${_rawLeaderboard.length} results</div>` : '';

    content.innerHTML = countNote + filtered.map((entry, index) => {
        let skinName = '';
        if (entry.skin) skinName = SKINS[entry.skin] ? `• ${SKINS[entry.skin].name}` : `• ${entry.skin}`;
        const userName = entry.userName || 'Anonymous';
        const coinsDisplay = entry.coins != null ? ` <span style="color:#ffd700; font-size:0.8rem;">💰 ${entry.coins.toLocaleString()}</span>` : '';
        const entryUpgrades = entry.settings?.upgrades || [];
        const upgradesDisplay = entryUpgrades.length > 0
            ? ` <span style="color:#c084fc; font-size:0.78rem;" title="${entryUpgrades.map(k => UPGRADES[k]?.name || k).join(', ')}">🛍️ ×${entryUpgrades.length}</span>`
            : '';
        const showDevice = _lbFilters.device === 'all';
        const deviceDisplay = (showDevice && entry.settings?.isMobile != null)
            ? ` <span style="font-size:0.72rem;opacity:0.55;">${entry.settings.isMobile ? '📱' : '🖥️'}</span>` : '';
        const eduDisplay = entry.settings?.eduEnabled
            ? ` <span style="font-size:0.72rem;opacity:0.55;">📚</span>` : '';
        const settingsBtn = entry.settings
            ? `<button class="lb-settings-btn" onclick="showEntrySettings(${index})" title="${t('esTitle')}">⚙️</button>`
            : '';
        return `
        <div class="lb-entry rank-${index + 1}">
            <div class="lb-rank">${medals[index] || (index + 1)}</div>
            <div class="lb-info">
                <div class="lb-player-name" style="font-size:0.9rem;font-weight:bold;color:var(--primary);margin-bottom:3px;">
                    👤 ${userName}${isDevUser(entry.userId)?devBadge():''}${coinsDisplay}${upgradesDisplay}${deviceDisplay}${eduDisplay}
                </div>
                <div class="lb-score">${entry.score.toLocaleString()}</div>
                <div class="lb-details">${t('levelWord')} ${entry.level} ${skinName} • ${entry.date}</div>
            </div>
            ${settingsBtn}
        </div>`;
    }).join('');
    console.log('✅ [DISPLAY] Leaderboard displayed successfully');
}

// ===== DEVELOPER BADGE =====
const DEV_UIDS = new Set(['DKtEN7zq6MchwPdYU8FMahf32wu2', 'uIAbJtHx5vasN0vczBe0aooYv2B3']);

function isDevUser(userId) {
    return !!userId && DEV_UIDS.has(userId);
}

function devBadge() {
    return `<span class="dev-badge" title="מפתח המשחק">👑 DEV</span>`;
}

// ===== SPEEDRUN HELPERS =====

function formatTime(ms) {
    if (ms == null) return '—';
    const totalSec = Math.floor(ms / 1000);
    const m  = Math.floor(totalSec / 60);
    const s  = totalSec % 60;
    const cs = Math.floor((ms % 1000) / 10);
    return m > 0
        ? `${m}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`
        : `${s}.${String(cs).padStart(2,'0')}`;
}

function checkSpeedrunMilestones() {
    if (!state.active || !state.startTime || state.isDebugGame) return;
    const allGoals = [...SPEEDRUN_GOALS, ...getCustomSpeedrunGoals()];
    let hitAny = false;
    for (const goal of allGoals) {
        if (state.speedrunHits[goal.key] != null) continue;
        const val = goal.type === 'score' ? state.score : state.level;
        if (val >= goal.target) {
            const elapsed = Date.now() - state.startTime;
            state.speedrunHits[goal.key] = elapsed;
            hitAny = true;
            // Use playerRect cached this frame (set just before update calls)
            const rect = state.playerRect || DOM.player.getBoundingClientRect();
            showFloatingMessage(`⚡ ${goal.label} — ${formatTime(elapsed)}`, rect.left, rect.top - 24, '#00f2ff');
        }
    }
}

let _rawSpeedrunEntries = [];

function _renderSrContent(goalKey) {
    const content = document.getElementById('leaderboard-content');
    if (!content) return;

    const allGoals = [...SPEEDRUN_GOALS, ...getCustomSpeedrunGoals()];
    const goal = allGoals.find(g => g.key === goalKey);

    // Apply skin filter first, then entry filters
    let base = _rawSpeedrunEntries;
    if (_lbSrSkinSel.length > 0) {
        base = base.filter(e => _lbSrSkinSel.includes(e.skin));
    }
    const filtered = applyEntryFilters(base, _lbFilters);

    if (!filtered.length) {
        const empty = _rawSpeedrunEntries.length === 0
            ? `No records yet — complete "${goal?.label || goalKey}" as fast as possible!`
            : `No results for these filters`;
        content.innerHTML = `<div class="lb-empty">${empty}</div>`;
        return;
    }

    const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
    window.__srEntries = filtered;
    content.innerHTML = filtered.map((e, i) => {
        const skinLabel = SKINS[e.skin]?.name || e.skin || '';
        const settingsBtn = e.settings
            ? `<button onclick="window.__srShowSettings(${i})" style="background:none;border:1px solid rgba(255,255,255,0.2);border-radius:4px;padding:2px 5px;font-size:0.7rem;cursor:pointer;color:rgba(255,255,255,0.5);" title="הגדרות">⚙️</button>` : '';
        const dev = isDevUser(e.userId) ? devBadge() : '';
        return `<div class="lb-entry rank-${i+1}">
            <div class="lb-rank">${medals[i] || (i+1)}</div>
            <div class="lb-info" style="flex:1;">
                <div class="lb-player-name">👤 ${e.userName || 'Anonymous'} ${dev}</div>
                <div class="lb-score" style="color:#00f2ff;font-size:1.2rem;">⏱️ ${formatTime(e.time)}</div>
                <div class="lb-details">${skinLabel} • ${e.date || ''}</div>
            </div>
            ${settingsBtn}
        </div>`;
    }).join('');

    window.__srShowSettings = function(idx) {
        const orig = _currentLeaderboardEntries;
        _currentLeaderboardEntries = window.__srEntries;
        showEntrySettings(idx);
        _currentLeaderboardEntries = orig;
    };
}

async function displaySpeedrunLeaderboard(goalKey) {
    const content = document.getElementById('leaderboard-content');
    if (!content) return;

    const allGoals = [...SPEEDRUN_GOALS, ...getCustomSpeedrunGoals()];
    const goal = allGoals.find(g => g.key === goalKey);
    if (!goal) { content.innerHTML = '<div class="lb-empty">קטגוריה לא נמצאה</div>'; return; }

    renderFilterBar('lb-filter-bar', _lbFilters, () => _renderSrContent(goalKey));

    content.innerHTML = `<div class="lb-empty">${t('loading')}</div>`;

    try {
        const { getSpeedrunLeaderboardFromCloud } = await import('./firestore-sync.js');
        const cloud = await getSpeedrunLeaderboardFromCloud(goalKey);
        _rawSpeedrunEntries = (cloud && cloud.length > 0) ? cloud : getSpeedrunLeaderboard(goalKey);
    } catch (e) {
        _rawSpeedrunEntries = getSpeedrunLeaderboard(goalKey);
    }

    _renderSrContent(goalKey);
}

// Merge entries from multiple skins: deduplicate by user, keep best score
function _mergeSkinEntries(arrays) {
    const byUser = new Map();
    const isBetter = (a, b) =>
        (a.level || 0) > (b.level || 0) ||
        ((a.level || 0) === (b.level || 0) && (a.score || 0) > (b.score || 0));
    for (const e of arrays.flat()) {
        const uid = e.userId || e.userName || '';
        const cur = byUser.get(uid);
        if (!cur || isBetter(e, cur)) byUser.set(uid, e);
    }
    return [...byUser.values()]
        .sort((a, b) => ((b.level || 0) - (a.level || 0)) || ((b.score || 0) - (a.score || 0)))
        .slice(0, 50);
}

async function displayLeaderboard(categoryOrSkinSel) {
    const content = document.getElementById('leaderboard-content');
    if (!content) return;

    content.innerHTML = `<div class="lb-empty">${t('loading')}</div>`;

    // Money leaderboard
    if (categoryOrSkinSel === 'money') {
        document.getElementById('lb-filter-bar').innerHTML = '';
        let entries = [];
        try { entries = await getMoneyLeaderboard(); } catch (e) {}
        if (!entries.length) { content.innerHTML = `<div class="lb-empty">${t('lbEmpty')}</div>`; return; }
        const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
        content.innerHTML = entries.map((entry, i) => `
            <div class="lb-entry rank-${i+1}">
                <div class="lb-rank">${medals[i] || (i+1)}</div>
                <div class="lb-info">
                    <div class="lb-player-name" style="font-size:0.9rem;font-weight:bold;color:#ffd700;margin-bottom:3px;">👤 ${entry.userName || 'Anonymous'}${isDevUser(entry.userId)?devBadge():''}</div>
                    <div class="lb-score" style="color:#ffd700;">💰 ${(entry.coins || 0).toLocaleString()}</div>
                </div>
            </div>`).join('');
        return;
    }

    // Skin selection: array (multi-select) or legacy string
    const skinSel = Array.isArray(categoryOrSkinSel) ? categoryOrSkinSel
        : (categoryOrSkinSel && categoryOrSkinSel !== 'overall' ? [categoryOrSkinSel] : []);

    try {
        const { getLeaderboardFromCloud } = await import('./firestore-sync.js');
        if (skinSel.length === 0) {
            // Overall
            const cloud = await getLeaderboardFromCloud('overall');
            _rawLeaderboard = cloud?.length ? cloud : getLeaderboard('overall');
        } else if (skinSel.length === 1) {
            // Single skin
            const cloud = await getLeaderboardFromCloud(skinSel[0]);
            _rawLeaderboard = cloud?.length ? cloud : getLeaderboard(skinSel[0]);
        } else {
            // Multiple skins — fetch each, merge client-side
            const clouds = await Promise.all(skinSel.map(k => getLeaderboardFromCloud(k).catch(() => [])));
            const anyCloud = clouds.some(c => c?.length > 0);
            if (anyCloud) {
                _rawLeaderboard = _mergeSkinEntries(clouds);
            } else {
                _rawLeaderboard = _mergeSkinEntries(skinSel.map(k => getLeaderboard(k)));
            }
        }
    } catch (e) {
        if (skinSel.length <= 1) {
            _rawLeaderboard = getLeaderboard(skinSel[0] || 'overall');
        } else {
            _rawLeaderboard = _mergeSkinEntries(skinSel.map(k => getLeaderboard(k)));
        }
    }

    // Merge personal game history so filters can find all games (including
    // non-leaderboard ones with custom settings). Avoid duplicates by timestamp.
    try {
        const { loadGameHistory } = await import('./game-history.js');
        const history = loadGameHistory();
        const lbTimestamps = new Set(_rawLeaderboard.map(e => e.timestamp).filter(Boolean));
        const histEntries = history
            .filter(e => !e.isDebug)
            .filter(e => skinSel.length === 0 || skinSel.includes(e.skin))
            .filter(e => !e.timestamp || !lbTimestamps.has(e.timestamp));
        _rawLeaderboard = [..._rawLeaderboard, ...histEntries];
    } catch (e) { /* local history unavailable */ }

    _renderLbContent();
}

// Export to window for HTML onclick
console.log('🔗 [EXPORT] Exporting functions to window object...');
window.showLeaderboard = showLeaderboard;
window.closeLeaderboard = closeLeaderboard;
window.showShop = showShop;
window.closeShop = closeShop;
console.log('✅ [EXPORT] Functions exported:', {
    showLeaderboard: typeof window.showLeaderboard,
    closeLeaderboard: typeof window.closeLeaderboard
});

// ===== SKIN SELECTION =====

function updateSkinOptions() {
    console.log('🎨 [SKINS] Updating skin options...');
    const options = document.querySelectorAll('.skin-option');
    console.log(`🎨 [SKINS] Found ${options.length} skin options`);
    
    options.forEach((option, index) => {
        const skinKey = option.dataset.skin;
        const unlockLevel = parseInt(option.dataset.unlockLevel) || 0;
        const maxLevel = getMaxLevel();
        
        console.log(`🎨 [SKINS] Processing skin ${index}: ${skinKey} (unlock level: ${unlockLevel}, max level: ${maxLevel})`);
        
        if (unlockLevel > 0 && maxLevel >= unlockLevel && !isSkinUnlocked(skinKey)) {
            console.log(`🔓 [SKINS] Auto-unlocking ${skinKey}`);
            unlockSkin(skinKey);
            option.classList.add('newly-unlocked');
            setTimeout(() => option.classList.remove('newly-unlocked'), 1000);
        }
        
        if (isSkinUnlocked(skinKey)) {
            console.log(`✅ [SKINS] ${skinKey} is unlocked, making clickable`);
            option.classList.remove('locked');
            option.onclick = () => {
                console.log(`👆 [SKIN CLICK] User clicked skin: ${skinKey}`);
                selectSkin(skinKey, option);
            };
        } else {
            console.log(`🔒 [SKINS] ${skinKey} is locked`);
            option.classList.add('locked');
            option.onclick = null;
        }
    });
    console.log('✅ [SKINS] Skin options updated');
}

function selectSkin(key, element) {
    console.log(`🎨 [SELECT] Selecting skin: ${key}`);
    if (!isSkinUnlocked(key)) {
        console.log(`🔒 [SELECT] Skin ${key} is locked! Selection blocked.`);
        return;
    }
    setCurrentSkin(key);
    document.querySelectorAll('.skin-option').forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
    console.log(`✅ [SELECT] Skin ${key} selected successfully`);
}

// Export to window for HTML onclick
window.selectSkin = selectSkin;

// ===== GAME INITIALIZATION =====

function initGame() {
    resetState();
    
    // ===== ANALYTICS: start session =====
    startAnalyticsSession(currentSkinKey, currentUser?.displayName || 'Anonymous', {
        isMobile: deviceMode.isMobile,
        controlType: keyBindings.controlType,
        shoot: keyBindings.shoot,
        ability: keyBindings.ability,
        rightClickAbility: keyBindings.rightClickAbility,
        enemiesShootThroughAsteroids: gameRules.enemiesShootThroughAsteroids,
        playerShootThroughAsteroids: gameRules.playerShootThroughAsteroids,
        lang: currentLang,
        screenW: window.innerWidth,
        screenH: window.innerHeight
    });
    
    // Reset player size to normal
    DOM.player.style.transform = 'scale(1)';
    
    const skin = SKINS[currentSkinKey];
    state.currentSkinStats = {
        fireRate: skin.fireRate,
        bulletSpeed: skin.bulletSpeed,
        bulletDamage: skin.bulletDamage
    };
    
    DOM.playerSpriteContainer.innerHTML = skin.svg;
    document.documentElement.style.setProperty('--primary', skin.color);

    DOM.scoreEl.innerText = '0';
    DOM.levelEl.innerText = state.level;
    updateHPUI();
    updateAmmoUI();
    DOM.overlay.style.display = 'none';
    document.getElementById('floating-settings-btn').style.display = 'none';
    document.getElementById('pause-btn').style.display = 'flex';
    document.getElementById('pause-overlay').style.display = 'none';

    // Show/hide special ability button based on skin and reset cooldown display
    const abilityBtn = document.getElementById('special-ability-btn');
    if (currentSkinKey === 'vortex') {
        abilityBtn.style.display = 'flex';
        abilityBtn.classList.remove('cooldown');
        abilityBtn.querySelector('.ability-icon').innerText = '⚡';
        abilityBtn.querySelector('.ability-cooldown').style.setProperty('--cooldown-percent', '0%');
    } else if (currentSkinKey === 'phoenix') {
        abilityBtn.style.display = 'flex';
        abilityBtn.classList.remove('cooldown');
        abilityBtn.querySelector('.ability-icon').innerText = '🔥';
        abilityBtn.querySelector('.ability-cooldown').style.setProperty('--cooldown-percent', '0%');
    } else if (currentSkinKey === 'joker') {
        abilityBtn.style.display = 'flex';
        abilityBtn.classList.remove('cooldown');
        abilityBtn.querySelector('.ability-icon').innerText = '🃏';
        abilityBtn.querySelector('.ability-cooldown').style.setProperty('--cooldown-percent', '0%');
    } else if (currentSkinKey === 'dragon') {
        abilityBtn.style.display = 'flex';
        abilityBtn.classList.remove('cooldown');
        abilityBtn.querySelector('.ability-icon').innerText = '🐉';
        abilityBtn.querySelector('.ability-cooldown').style.setProperty('--cooldown-percent', '0%');
    } else {
        abilityBtn.style.display = 'none';
    }

    // Make sure invincibility visual is cleared on a fresh game
    DOM.player.classList.remove('dragon-invincible');
    
    const elementsToRemove = document.querySelectorAll('.enemy-ship, .asteroid, .bullet, .enemy-bullet, .particle, .floating-msg, .burger, .ingredient, .laser-beam, .lightning-bolt');
    elementsToRemove.forEach(e => e.remove());
    
    updateSkinOptions();
    updatePlayerPos();
    resetQuizCooldown();
    replayReset();
    requestAnimationFrame(update);

    // Education mode: opening question before the action ramps up.
    if (isEduActive()) {
        triggerQuiz('start', {
            onWrong: () => { /* opening question is informational only */ }
        });
    }
}

// Export to window for HTML onclick
window.initGame = initGame;
console.log('✅ [EXPORT] initGame exported:', typeof window.initGame);

// ===== LEVEL UP SYSTEM =====

function handleLevelUp() {
    const isEarlyLevel = state.level < state.startingLevel;
    const threshold = isEarlyLevel ? 100 : 1000;
    if (state.score >= state.lastLevelScore + threshold) {
        state.lastLevelScore += threshold;
        state.level++;
        DOM.levelEl.innerText = state.level;
        state.speedMult += 0.2;
        state.spawnRate = Math.max(250, state.spawnRate - 200);
        state.playerHP = state.playerMaxHP;
        updateHPUI();
        
        trackLevelUp(state.level, state.score, state.playerHP, state.playerMaxHP);
        saveMaxLevel(state.level);
        replayRecordEvent('levelup', { level: state.level });
        
        let unlocked = false;
        Object.keys(SKINS).forEach(skinKey => {
            const skin = SKINS[skinKey];
            if (skin.unlockLevel === state.level && !isSkinUnlocked(skinKey)) {
                if (unlockSkin(skinKey)) {
                    unlocked = true;
                    showFloatingMessage(
                        `🎉 NEW SKIN UNLOCKED: ${skin.name.toUpperCase()}!`, 
                        DOM.wrapper.clientWidth/2 - 100, 
                        DOM.wrapper.clientHeight/2 + 50, 
                        "#ffd700"
                    );
                }
            }
        });
        
        if (unlocked) {
            updateSkinOptions();
        }
        
        showFloatingMessage("LEVEL UP! HP REFILL", DOM.wrapper.clientWidth/2 - 70, DOM.wrapper.clientHeight/2, "var(--primary)");

        {
            const coinGain = isEarlyLevel ? state.level : state.level * 10;
            addCoins(coinGain);
            state.coinsEarned += coinGain;
            if (DOM.coinsEarnedEl) DOM.coinsEarnedEl.innerText = `+${state.coinsEarned}`;
            showFloatingMessage(`💰 +${coinGain} מטבעות!`, DOM.wrapper.clientWidth/2 - 70, DOM.wrapper.clientHeight/2 + 30, "#ffd700");
        }

        // Education mode: a question on every level up. A wrong answer costs HP.
        if (isEduActive()) {
            triggerQuiz('levelup', {
                onWrong: () => {
                    const penalty = Math.round(state.playerMaxHP * 0.15);
                    state.playerHP = Math.max(1, state.playerHP - penalty);
                    updateHPUI();
                    showFloatingMessage(`-${penalty} HP`, DOM.wrapper.clientWidth/2 - 30, DOM.wrapper.clientHeight/2 + 40, "var(--danger)");
                }
            });
        }
    }
}

// ===== MAIN UPDATE LOOP =====

function update() {
    if(!state.active) return;
    if(state.paused) return; // loop restarts from togglePause
    const now = Date.now();

    handleLevelUp();
    handleSpawning(now);
    rechargeAmmo(now);
    updateAbilityCooldown(now);
    updateArrowMovement();
    checkSpeedrunMilestones();
    trackScoreUpdate(state.score);
    replayRecordPos(now);

    // Read the player's rect once per frame; every collision pass reuses it
    // instead of triggering its own layout reflow.
    state.playerRect = DOM.player.getBoundingClientRect();

    // Move bullets first so their cached rects are fresh for the collision
    // passes (burgers/asteroids/enemies) that follow.
    updateBullets();
    updateEnemyBullets();
    updateBurgers();
    updateLightnings();
    updateIngredients();
    updateAsteroids();
    updateEnemies(now);

    requestAnimationFrame(update);
}

function togglePause() {
    if (!state.active) return;
    state.paused = !state.paused;
    const pauseBtn = document.getElementById('pause-btn');
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseBtn) pauseBtn.innerText = state.paused ? '▶' : '⏸';
    if (pauseOverlay) pauseOverlay.style.display = state.paused ? 'flex' : 'none';
    if (state.paused) {
        trackPauseStart();
    } else {
        trackPauseEnd();
        requestAnimationFrame(update);
    }
}
window.togglePause = togglePause;

// ===== SPECIAL ABILITY SYSTEM =====

function updateAbilityCooldown(now) {
    const abilityBtn = document.getElementById('special-ability-btn');
    if (!abilityBtn) return;
    
    // Check if chaos mode duration ended (but don't revert enemies)
    if (state.jokerAbility.active && now >= state.jokerAbility.endTime) {
        console.log('🃏 [JOKER] Chaos mode duration ended (enemies stay chaotic)');
        state.jokerAbility.active = false;
        // Don't remove chaos effect - enemies stay chaotic forever!
    }
    
    if (currentSkinKey === 'vortex') {
        if (!state.specialAbility.ready) {
            const elapsed = now - state.specialAbility.lastUsed;
            const remaining = state.specialAbility.cooldown - elapsed;
            
            if (remaining <= 0) {
                state.specialAbility.ready = true;
                abilityBtn.classList.remove('cooldown');
                abilityBtn.querySelector('.ability-cooldown').style.setProperty('--cooldown-percent', '0%');
            } else {
                const percent = (remaining / state.specialAbility.cooldown) * 100;
                abilityBtn.querySelector('.ability-cooldown').style.setProperty('--cooldown-percent', `${percent}%`);
            }
        }
    } else if (currentSkinKey === 'phoenix') {
        if (!state.phoenixAbility.ready) {
            const elapsed = now - state.phoenixAbility.lastUsed;
            const remaining = state.phoenixAbility.cooldown - elapsed;
            
            if (remaining <= 0) {
                state.phoenixAbility.ready = true;
                abilityBtn.classList.remove('cooldown');
                abilityBtn.querySelector('.ability-cooldown').style.setProperty('--cooldown-percent', '0%');
            } else {
                const percent = (remaining / state.phoenixAbility.cooldown) * 100;
                abilityBtn.querySelector('.ability-cooldown').style.setProperty('--cooldown-percent', `${percent}%`);
            }
        }
    } else if (currentSkinKey === 'joker') {
        if (!state.jokerAbility.ready) {
            const elapsed = now - state.jokerAbility.lastUsed;
            const remaining = state.jokerAbility.cooldown - elapsed;

            if (remaining <= 0) {
                state.jokerAbility.ready = true;
                abilityBtn.classList.remove('cooldown');
                abilityBtn.querySelector('.ability-cooldown').style.setProperty('--cooldown-percent', '0%');
            } else {
                const percent = (remaining / state.jokerAbility.cooldown) * 100;
                abilityBtn.querySelector('.ability-cooldown').style.setProperty('--cooldown-percent', `${percent}%`);
            }
        }
    } else if (currentSkinKey === 'dragon') {
        // Clear invincibility visual when it expires
        if (state.dragonAbility.invincibleUntil > 0 && now >= state.dragonAbility.invincibleUntil) {
            DOM.player.classList.remove('dragon-invincible');
        }

        if (!state.dragonAbility.ready) {
            const elapsed = now - state.dragonAbility.lastUsed;
            const remaining = state.dragonAbility.cooldown - elapsed;

            if (remaining <= 0) {
                state.dragonAbility.ready = true;
                abilityBtn.classList.remove('cooldown');
                abilityBtn.querySelector('.ability-cooldown').style.setProperty('--cooldown-percent', '0%');
            } else {
                const percent = (remaining / state.dragonAbility.cooldown) * 100;
                abilityBtn.querySelector('.ability-cooldown').style.setProperty('--cooldown-percent', `${percent}%`);
            }
        }
    }
}

function activateSpecialAbility() {
    if (!state.active) return;

    if (currentSkinKey === 'vortex') {
        if (!state.specialAbility.ready) return;

        useVortexLaser();
        state.specialAbility.ready = false;
        state.specialAbility.lastUsed = Date.now();
        document.getElementById('special-ability-btn').classList.add('cooldown');
        trackAbilityUsed('vortex_laser', state.level, state.playerHP);
        replayRecordEvent('ability', { ability: 'vortex' });
    } else if (currentSkinKey === 'phoenix') {
        if (!state.phoenixAbility.ready) return;

        usePhoenixFeathers();
        state.phoenixAbility.ready = false;
        state.phoenixAbility.lastUsed = Date.now();
        document.getElementById('special-ability-btn').classList.add('cooldown');
        trackAbilityUsed('phoenix_feathers', state.level, state.playerHP);
        replayRecordEvent('ability', { ability: 'phoenix' });
    } else if (currentSkinKey === 'joker') {
        if (!state.jokerAbility.ready) return;

        useJokerChaos();
        state.jokerAbility.ready = false;
        state.jokerAbility.lastUsed = Date.now();
        document.getElementById('special-ability-btn').classList.add('cooldown');
        trackAbilityUsed('joker_chaos', state.level, state.playerHP);
        replayRecordEvent('ability', { ability: 'joker' });
    } else if (currentSkinKey === 'dragon') {
        if (!state.dragonAbility.ready) return;

        useDragonFire();
        state.dragonAbility.ready = false;
        state.dragonAbility.lastUsed = Date.now();
        document.getElementById('special-ability-btn').classList.add('cooldown');
        trackAbilityUsed('dragon_fire', state.level, state.playerHP);
        replayRecordEvent('ability', { ability: 'dragon' });
    }
}

// ===== EVENT LISTENERS =====

// Mouse/Arrow control
window.addEventListener('mousemove', (e) => {
    if(!state.active || keyBindings.controlType !== 'mouse') return;
    movePlayer(e.clientX);
    
    // Track mouse position for Phoenix feathers
    const rect = DOM.wrapper.getBoundingClientRect();
    state.lastMouseX = e.clientX - rect.left;
    state.lastMouseY = e.clientY - rect.top;
});

window.addEventListener('touchmove', (e) => {
    if(!state.active || state.paused) return;
    e.preventDefault();
    movePlayer(e.touches[0].clientX);
    shoot();
    
    // Track touch position for Phoenix feathers
    const rect = DOM.wrapper.getBoundingClientRect();
    state.lastMouseX = e.touches[0].clientX - rect.left;
    state.lastMouseY = e.touches[0].clientY - rect.top;
}, { passive: false });

window.addEventListener('touchstart', (e) => {
    if(!state.active || state.paused) return;
    movePlayer(e.touches[0].clientX);
    shoot();
    
    // Track touch position for Phoenix feathers
    const rect = DOM.wrapper.getBoundingClientRect();
    state.lastMouseX = e.touches[0].clientX - rect.left;
    state.lastMouseY = e.touches[0].clientY - rect.top;
}, { passive: false });

// Arrow key controls
let arrowKeysPressed = { left: false, right: false, up: false, down: false, shoot: false };
let mousePressed = false;

window.addEventListener('keydown', (e) => {
    // ESC: exit leaderboard/settings, or pause/resume game
    if (e.code === 'Escape') {
        const lbContainer = document.getElementById('leaderboard-container');
        const settingsContainer = document.getElementById('settings-container');
        if (lbContainer && lbContainer.style.display !== 'none') {
            closeLeaderboard();
        } else if (settingsContainer && settingsContainer.style.display !== 'none') {
            closeSettings();
        } else if (state.active) {
            togglePause();
        }
        return;
    }

    // Block game input while paused
    if (state.paused) return;

    // Handle shooting key - track if it's pressed
    if (state.active && e.code === keyBindings.shoot) {
        arrowKeysPressed.shoot = true;
        shoot(); // Shoot immediately on press
        e.preventDefault();
    }

    // Handle special ability for all control types
    if (state.active && e.code === keyBindings.ability) {
        activateSpecialAbility();
    }

    // Handle movement keys only for arrows control type
    if (!state.active || keyBindings.controlType !== 'arrows') return;

    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        arrowKeysPressed.left = true;
        e.preventDefault();
    }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        arrowKeysPressed.right = true;
        e.preventDefault();
    }
    if (e.code === 'ArrowUp') {
        // ArrowUp might be used for shooting, so don't override it as movement
        // The shoot handler above will have already handled it
    }
});

window.addEventListener('keyup', (e) => {
    // Track shoot key release
    if (e.code === keyBindings.shoot) {
        arrowKeysPressed.shoot = false;
    }
    
    if (keyBindings.controlType !== 'arrows') return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') arrowKeysPressed.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') arrowKeysPressed.right = false;
});

// Arrow movement update
function updateArrowMovement() {
    if (!state.active) return;
    
    // Handle arrow key movement
    if (keyBindings.controlType === 'arrows') {
        const speed = 8;
        if (arrowKeysPressed.left) {
            state.playerX = Math.max(0, state.playerX - speed);
            updatePlayerPos();
        }
        if (arrowKeysPressed.right) {
            state.playerX = Math.min(DOM.wrapper.clientWidth - 50, state.playerX + speed);
            updatePlayerPos();
        }
    }
    
    // Continuous shooting when shoot key is held (works in both modes)
    if (arrowKeysPressed.shoot) {
        shoot();
    }
    
    // Continuous shooting when mouse button is held (mouse mode only)
    if (keyBindings.controlType === 'mouse' && mousePressed) {
        shoot();
    }
}

window.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    if (keyBindings.controlType === 'mouse' && !state.paused) {
        mousePressed = true;
        shoot();
    }
});

window.addEventListener('mouseup', (e) => {
    mousePressed = false;
});

// Special ability button click
document.getElementById('special-ability-btn').addEventListener('click', activateSpecialAbility);

// Prevent context menu on right click, use it for special ability instead
window.addEventListener('contextmenu', (e) => {
    if (state.active && keyBindings.rightClickAbility) {
        e.preventDefault();
        activateSpecialAbility();
    }
});

// ===== INITIALIZATION =====

// Generate stars
console.log('⭐ [INIT] Generating stars...');
for(let i=0; i<40; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.width = '2px';
    s.style.height = '2px';
    s.style.left = Math.random()*100+'%';
    s.style.top = Math.random()*100+'%';
    s.style.animationDuration = (Math.random()*4+2)+'s';
    DOM.wrapper.appendChild(s);
}
console.log('✅ [INIT] 40 stars generated');

DOM.playerSpriteContainer.innerHTML = SKINS.classic.svg;
console.log('✅ [INIT] Player sprite set to classic skin');
console.log('🎮 [INIT] All systems ready!');

// ===== DEBUG COMMANDS =====

window.debugUnlockSkin = function(skinKey) {
    if (!SKINS[skinKey]) {
        console.error(`❌ [DEBUG] Skin "${skinKey}" does not exist!`);
        console.log('📋 [DEBUG] Available skins:', Object.keys(SKINS).join(', '));
        return false;
    }
    
    const result = unlockSkin(skinKey);
    if (result) {
        console.log(`🎉 [DEBUG] Successfully unlocked skin: ${skinKey}`);
        updateSkinOptions();
        return true;
    } else {
        console.log(`ℹ️ [DEBUG] Skin ${skinKey} was already unlocked`);
        return false;
    }
};

window.debugUnlockAllSkins = function() {
    console.log('🔓 [DEBUG] Unlocking all skins...');
    let count = 0;
    Object.keys(SKINS).forEach(skinKey => {
        const result = unlockSkin(skinKey);
        if (result) {
            count++;
        }
    });
    updateSkinOptions();
    console.log(`✅ [DEBUG] Unlocked ${count} new skins!`);
    console.log('📋 [DEBUG] All unlocked skins:', Object.keys(SKINS).join(', '));
};

window.debugListSkins = function() {
    console.log('📋 [DEBUG] === AVAILABLE SKINS ===');
    Object.keys(SKINS).forEach(key => {
        const skin = SKINS[key];
        const unlocked = isSkinUnlocked(key);
        console.log(`${unlocked ? '✅' : '🔒'} ${key} (${skin.name}) - Unlock Level: ${skin.unlockLevel}`);
    });
};

window.setLvl = function(lvlNum) {
    const level = parseInt(lvlNum);
    if (isNaN(level) || level < 1) {
        console.error('❌ [DEBUG] Invalid level! Please provide a number >= 1');
        return false;
    }
    
    if (!state.active) {
        console.error('❌ [DEBUG] Game must be active! Start a game first.');
        return false;
    }
    
    state.level = level;
    state.lastLevelScore = (level - 1) * 1000;
    state.score = state.lastLevelScore;
    DOM.levelEl.innerText = level;
    DOM.scoreEl.innerText = state.score;
    
    // Update game difficulty based on level
    state.speedMult = 1 + ((level - 1) * 0.2);
    state.spawnRate = Math.max(250, 1400 - ((level - 1) * 200));

    // Mark as debug game so score won't be saved to the leaderboard
    state.isDebugGame = true;

    console.log(`✅ [DEBUG] Level set to ${level}`);
    console.log(`📊 [DEBUG] Score set to: ${state.score}`);
    console.log(`📊 [DEBUG] Speed multiplier: ${state.speedMult.toFixed(2)}`);
    console.log(`📊 [DEBUG] Spawn rate: ${state.spawnRate}ms`);
    
    // Save max level if higher
    saveMaxLevel(level);
    
    return true;
};


window.spawn = function(type) {
    if (!state.active) {
        console.error('❌ [DEBUG] Game must be active! Start a game first.');
        return false;
    }

    if (type === undefined || type === null) {
        console.error('❌ [DEBUG] Missing type! Valid types: burger, asteroid, enemy, red, orange/elite, green, blue');
        return false;
    }

    const validTypes = ['burger', 'asteroid', 'enemy', 'elite', 'orange', 'red', 'green', 'blue'];
    const lowerType = String(type).toLowerCase();

    if (!validTypes.includes(lowerType)) {
        console.error(`❌ [DEBUG] Invalid type "${lowerType}"! Valid types: ${validTypes.join(', ')}`);
        return false;
    }

    const posX = Math.random() * (DOM.wrapper.clientWidth - 50);
    const el = document.createElement('div');

    if (lowerType === 'burger') {
        el.className = 'burger';
        el.style.left = posX + 'px';
        el.style.top = '-60px';
        el.innerHTML = `
            <div class="hp-bar-container"><div class="hp-bar-fill enemy-hp-fill"></div></div>
            <svg viewBox="0 0 100 100">
                <path d="M10 50 Q50 10 90 50 Z" fill="#e67e22"/>
                <rect x="10" y="50" width="80" height="10" fill="#6d4c41"/>
                <rect x="10" y="60" width="80" height="5" fill="#f1c40f"/>
                <path d="M10 65 L90 65 L80 85 L20 85 Z" fill="#e67e22"/>
            </svg>`;
        DOM.wrapper.appendChild(el);
        state.burgers.push({
            el: el,
            hpFill: el.querySelector('.enemy-hp-fill'),
            y: -60,
            hp: 4,
            maxHP: 4,
            speed: 1.2 * state.speedMult
        });
        console.log('🍔 [DEBUG] Spawned burger');
    } else if (lowerType === 'asteroid') {
        el.className = 'asteroid';
        el.style.left = posX + 'px';
        el.style.top = '-60px';
        el.innerHTML = `<svg viewBox="0 0 100 100" style="width:100%; height:100%;"><path d="M20 30 L40 10 L70 20 L90 50 L75 85 L30 90 L10 60 Z" fill="#333" stroke="#555" stroke-width="3"/><circle cx="40" cy="40" r="5" fill="#222"/><circle cx="60" cy="70" r="8" fill="#222"/></svg>`;
        DOM.wrapper.appendChild(el);
        state.asteroids.push({
            el: el,
            y: -60,
            speed: (Math.random() * 2.0 + 1.2) * state.speedMult,
            rot: 0,
            rotSpeed: Math.random() * 8 - 4
        });
        console.log('🪨 [DEBUG] Spawned asteroid');
    } else {
        const scaleEnemyHP = (hp) => Math.ceil(hp * 1.5);
        const enemyTypeMap = {
            enemy: { type: 'red', hp: () => scaleEnemyHP(Math.floor(Math.random() * 3) + 1), colorCode: '#ff0000', fireRate: 1000, speedMod: 1.0 },
            red:   { type: 'red', hp: () => scaleEnemyHP(Math.floor(Math.random() * 3) + 1), colorCode: '#ff0000', fireRate: 1000, speedMod: 1.0 },
            orange: { type: 'orange', hp: () => scaleEnemyHP(Math.floor(Math.random() * 3) + 3), colorCode: '#ff9900', fireRate: 600,  speedMod: 1.0 },
            elite:  { type: 'orange', hp: () => scaleEnemyHP(Math.floor(Math.random() * 3) + 3), colorCode: '#ff9900', fireRate: 600,  speedMod: 1.0 },
            green:  { type: 'green',  hp: () => scaleEnemyHP(Math.floor(Math.random() * 3) + 3), colorCode: '#00cc44', fireRate: 800,  speedMod: 1.0 },
            blue:   { type: 'blue',   hp: () => scaleEnemyHP(Math.floor(Math.random() * 4) + 5), colorCode: '#0088ff', fireRate: 450,  speedMod: 1.3 },
        };
        const stats = enemyTypeMap[lowerType];
        const enemyType = stats.type;
        const maxHP = stats.hp();
        el.className = `enemy-ship ${enemyType}`;
        el.style.left = posX + 'px';
        el.style.top = '-60px';
        el.innerHTML = `<div class="hp-bar-container"><div class="hp-bar-fill enemy-hp-fill"></div></div><svg viewBox="0 0 100 100" style="width:100%; height:100%;"><path d="M10 20 L50 90 L90 20 L50 40 Z" fill="${stats.colorCode}" stroke="#fff" stroke-width="2"/></svg>`;
        DOM.wrapper.appendChild(el);
        state.enemies.push({
            el: el,
            hpFill: el.querySelector('.enemy-hp-fill'),
            type: enemyType,
            y: -60,
            hp: maxHP,
            maxHP: maxHP,
            speed: (Math.random() * 0.8 + 0.6) * stats.speedMod * state.speedMult,
            lastShot: Date.now() + Math.random() * 500,
            fireRate: stats.fireRate / state.speedMult,
            isChaotic: false,
            hitsByChaos: {}
        });
        console.log(`👾 [DEBUG] Spawned ${enemyType} enemy`);
    }

    return true;
};

window.DebugAddMoney = function(amount) {
    const n = parseInt(amount);
    if (isNaN(n)) { console.warn('❌ [DEBUG] DebugAddMoney: provide a number'); return; }
    const total = addCoins(n);
    console.log(`💰 [DEBUG] Added ${n} coins. New total: ${total}`);
};

window.debugResetMoney = function() {
    resetCoins();
    console.log('💰 [DEBUG] Coins reset to 0');
};

window.debugRemoveUpgrade = function(key) {
    if (!key) { console.warn('❌ [DEBUG] debugRemoveUpgrade: provide upgrade key'); console.log('  Keys:', Object.keys(UPGRADES).join(', ')); return; }
    const refund = removeUpgrade(key);
    if (refund) {
        console.log(`✅ [DEBUG] Removed upgrade: ${key} (refunded 💰${refund})`);
    } else {
        console.warn(`⚠️ [DEBUG] Upgrade not found or not owned: ${key}`);
    }
};

console.log('🛠️ [DEBUG] Debug commands available:');
console.log('  - debugUnlockSkin("skinName") - Unlock a specific skin');
console.log('  - debugUnlockAllSkins() - Unlock all skins');
console.log('  - debugListSkins() - Show all available skins');
console.log('  - setLvl(number) - Set current level (game must be active)');
console.log('  - spawn(type) - Spawn entity: "burger", "asteroid", "enemy", "red", "orange"/"elite", "green", "blue"');
console.log('  - DebugUnlockEdu() - Remove the education lock on this device');
console.log('  - DebugAddMoney(number) - Add coins to your balance');
console.log('  - debugResetMoney() - Reset coins to 0');
console.log('  - debugRemoveUpgrade("key") - Remove an owned upgrade (refunds coins)');

// ===== SETTINGS MENU =====

function showSettings() {
    console.log('⚙️ [SETTINGS] Opening settings...');
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('settings-container').style.display = 'block';
    document.getElementById('floating-settings-btn').style.display = 'none';
    updateSettingsDisplay();
    showSettingsTab(currentSettingsTab);
}

// ===== SETTINGS TABS =====
let currentSettingsTab = 'device';

function showSettingsTab(name) {
    currentSettingsTab = name;
    document.querySelectorAll('.settings-tab-pane').forEach(p => {
        p.style.display = (p.dataset.tab === name) ? 'block' : 'none';
    });
    document.querySelectorAll('.settings-tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === name);
    });
    if (name === 'lang') renderLangList();
}

function renderLangList() {
    const box = document.getElementById('lang-list');
    if (!box) return;
    box.innerHTML = LANGUAGES.map(lang => {
        const active = lang.code === currentLang;
        return `<button
            class="lang-card${active ? ' active' : ''}"
            onclick="pickLang('${lang.code}')"
            dir="${lang.dir}">
            <span class="lang-flag">${lang.flag}</span>
            <span class="lang-name">${lang.name}</span>
            ${active ? '<span class="lang-check">✓</span>' : ''}
        </button>`;
    }).join('');
}

function closeSettings() {
    console.log('⚙️ [SETTINGS] Closing settings...');
    document.getElementById('settings-container').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
    document.getElementById('floating-settings-btn').style.display = 'flex';
}

function updateSettingsDisplay() {
    // Update device mode buttons
    const isMobile = deviceMode.isMobile;

    document.getElementById('device-mobile').classList.toggle('active', isMobile);
    document.getElementById('device-desktop').classList.toggle('active', !isMobile);
    
    // Hide the entire controls tab on mobile (irrelevant on touch devices)
    const controlsTabBtn = document.querySelector('.settings-tab-btn[data-tab="controls"]');
    if (controlsTabBtn) {
        controlsTabBtn.style.display = isMobile ? 'none' : '';
        // If the controls tab is currently active while switching to mobile,
        // redirect to the device tab instead.
        if (isMobile && currentSettingsTab === 'controls') {
            showSettingsTab('device');
        }
    }
    
    // Update control type buttons
    document.getElementById('control-mouse').classList.toggle('active', keyBindings.controlType === 'mouse');
    document.getElementById('control-arrows').classList.toggle('active', keyBindings.controlType === 'arrows');
    
    // Update right-click buttons
    document.getElementById('rightclick-on').classList.toggle('active', keyBindings.rightClickAbility === true);
    document.getElementById('rightclick-off').classList.toggle('active', keyBindings.rightClickAbility === false);
    
    // Update game rules buttons
    document.getElementById('enemies-shoot-asteroids-yes').classList.toggle('active', gameRules.enemiesShootThroughAsteroids === true);
    document.getElementById('enemies-shoot-asteroids-no').classList.toggle('active', gameRules.enemiesShootThroughAsteroids === false);
    
    document.getElementById('player-shoot-asteroids-yes').classList.toggle('active', gameRules.playerShootThroughAsteroids === true);
    document.getElementById('player-shoot-asteroids-no').classList.toggle('active', gameRules.playerShootThroughAsteroids === false);
    
    // Update key displays
    document.getElementById('shoot-key-display').innerText = formatKeyName(keyBindings.shoot);
    document.getElementById('ability-key-display').innerText = formatKeyName(keyBindings.ability);

    updateEduSettingsDisplay();
}

// ===== EDUCATION MODE SETTINGS =====

function updateEduSettingsDisplay() {
    const locked = eduConfig.locked;

    // Enabled buttons
    document.getElementById('edu-on').classList.toggle('active', eduConfig.enabled);
    document.getElementById('edu-off').classList.toggle('active', !eduConfig.enabled);

    // Locked banner + remaining time until the 45-minute auto-unlock
    document.getElementById('edu-locked-banner').style.display = locked ? 'block' : 'none';
    const remainEl = document.getElementById('edu-lock-remaining');
    if (remainEl) {
        if (locked) {
            const ms = lockMsRemaining();
            const mins = Math.floor(ms / 60000);
            const secs = Math.floor((ms % 60000) / 1000);
            remainEl.textContent = currentLang === 'en'
                ? `⏳ Auto-opens in ${mins}:${String(secs).padStart(2, '0')} min`
                : `⏳ פתיחה אוטומטית בעוד ${mins}:${String(secs).padStart(2, '0')} דקות`;
        } else {
            remainEl.textContent = '';
        }
    }

    // Subject dropdown
    const subjectSel = document.getElementById('edu-subject-select');
    const subjects = getSubjects();
    subjectSel.innerHTML = '';
    subjects.forEach(s => {
        const o = document.createElement('option');
        o.value = s.key;
        o.textContent = s.name;
        if (s.key === eduConfig.subject) o.selected = true;
        subjectSel.appendChild(o);
    });
    subjectSel.disabled = locked;

    // Grade dropdown
    const gradeSel = document.getElementById('edu-grade-select');
    const grades = getGradesForSubject(eduConfig.subject);
    gradeSel.innerHTML = '';
    grades.forEach(g => {
        const o = document.createElement('option');
        o.value = g;
        o.textContent = gradeLabel(g);
        if (g === eduConfig.grade) o.selected = true;
        gradeSel.appendChild(o);
    });
    gradeSel.disabled = locked;

    // When locked, hide the lock/link creation controls (already pinned).
    document.getElementById('edu-lock-group').style.display = locked ? 'none' : 'block';
    document.getElementById('edu-link-group').style.display = locked ? 'none' : 'block';
    // Disabling the on/off toggle while locked (must unlock first to turn off)
    document.getElementById('edu-off').style.opacity = locked ? '0.4' : '1';
    document.getElementById('edu-off').style.pointerEvents = locked ? 'none' : 'auto';

    // Manager dashboard (only for the device that created the password).
    const mgr = document.getElementById('edu-manage-group');
    if (mgr) {
        const showMgr = eduConfig.managed && !!eduConfig.sessionId;
        mgr.style.display = showMgr ? 'block' : 'none';
        if (showMgr) startEduParticipantWatch();
        else stopEduParticipantWatch();
    }
}

// ===== EDUCATION MANAGER DASHBOARD =====
function startEduParticipantWatch() {
    if (eduParticipantWatchOn) return;
    eduParticipantWatchOn = true;
    listenParticipants(renderEduParticipants).then(unsub => { eduUnsubParticipants = unsub; });
}

function stopEduParticipantWatch() {
    if (eduUnsubParticipants) { eduUnsubParticipants(); eduUnsubParticipants = null; }
    eduParticipantWatchOn = false;
}
let eduParticipantWatchOn = false;

function renderEduParticipants(list) {
    const box = document.getElementById('edu-participants');
    if (!box) return;
    const me = list.filter(p => p.name); // any registered participant
    if (!me.length) {
        box.innerHTML = `<small style="opacity:0.7;">${t('noParticipants')}</small>`;
        return;
    }
    box.innerHTML = me.map(p => {
        const status = p.locked
            ? '<span style="color:#ffd700;">🔒 ' + (currentLang === 'en' ? 'Locked' : 'נעול') + '</span>'
            : '<span style="color:#39ff88;">🔓 ' + (currentLang === 'en' ? 'Open' : 'פתוח') + '</span>';
        const btn = p.locked
            ? `<button class="change-key-btn" onclick="eduUnlockOne('${p.id}')">${t('unlockOne')}</button>`
            : '';
        return `<div class="edu-participant-row">
            <span class="edu-participant-name">${escapeHtml(p.name || p.id)}</span>
            ${status}${btn}
        </div>`;
    }).join('');
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

function eduUnlockAll() {
    if (!confirm(t('unlockAllConfirm'))) return;
    unlockAllParticipants().then(ok => {
        alert(ok ? t('unlockAllOk') : t('unlockAllFail'));
    });
}

function eduUnlockOne(clientId) {
    unlockOneParticipant(clientId).then(ok => {
        if (!ok) alert(t('unlockOneFail'));
    });
}

function eduSetEnabled(on) {
    if (eduConfig.locked && !on) {
        showFloatingMessage(currentLang === 'en' ? '🔒 Unlock with password first' : '🔒 יש לבטל את הנעילה עם סיסמה תחילה', 20, 20, 'var(--danger)');
        return;
    }
    setEduEnabled(on);
    updateEduSettingsDisplay();
}

function eduSetSubject(value) {
    if (!setEduSubject(value)) return;
    updateEduSettingsDisplay();
}

function eduSetGrade(value) {
    if (!setEduGrade(value)) return;
    updateEduSettingsDisplay();
}

function eduLock() {
    const pw = document.getElementById('edu-lock-password').value.trim();
    if (!pw) { alert(t('enterPassword')); return; }
    lockEdu(pw);
    document.getElementById('edu-lock-password').value = '';
    // Start listening for a remote/timer unlock on this newly-locked device.
    if (eduUnsubUnlock) { eduUnsubUnlock(); eduUnsubUnlock = null; }
    listenForUnlock(() => {
        updateEduSettingsDisplay();
        showFloatingMessage(t('lockOpened'), 20, 20, 'var(--primary)');
    }).then(unsub => { eduUnsubUnlock = unsub; });
    updateEduSettingsDisplay();
    alert(t('lockSuccess'));
}

function eduUnlock() {
    const pw = document.getElementById('edu-unlock-password').value.trim();
    if (unlockEdu(pw)) {
        document.getElementById('edu-unlock-password').value = '';
        updateEduSettingsDisplay();
        alert(t('unlockSuccess'));
    } else {
        alert(t('unlockFail'));
    }
}

function eduCreateLink() {
    const pw = document.getElementById('edu-link-password').value.trim();
    const link = buildEduLink(eduConfig.subject, eduConfig.grade, pw);
    document.getElementById('edu-link-output').value = link;
    if (pw) {
        // Become the manager of this session so we can unlock everyone / watch
        // who is connected. The students who open the link are locked.
        becomeManager(pw);
    } else {
        alert(t('noLinkPassword'));
    }
    updateEduSettingsDisplay();
}

function eduCopyLink() {
    const out = document.getElementById('edu-link-output');
    if (!out.value) { alert(t('createLinkFirst')); return; }
    out.select();
    navigator.clipboard?.writeText(out.value).then(
        () => alert(t('linkCopied')),
        () => { document.execCommand('copy'); alert(t('linkCopied')); }
    );
}

function formatKeyName(code) {
    if (!code) return '?';
    if (code === 'Space') return 'Space';
    if (code.startsWith('Key')) return code.replace('Key', '');
    if (code.startsWith('Digit')) return code.replace('Digit', '');
    if (code.startsWith('Arrow')) return code.replace('Arrow', '') + ' Arrow';
    return code;
}

function setControl(type) {
    console.log(`⚙️ [SETTINGS] Control type set to: ${type}`);
    setKeyBinding('controlType', type);
    // Automatically set the default shoot key for the control type
    if (type === 'arrows') {
        setKeyBinding('shoot', 'ArrowUp');
    } else if (type === 'mouse') {
        setKeyBinding('shoot', 'Space');
    }
    updateSettingsDisplay();
}

function setRightClick(enabled) {
    console.log(`⚙️ [SETTINGS] Right-click ability: ${enabled}`);
    setKeyBinding('rightClickAbility', enabled);
    updateSettingsDisplay();
}

function setGameRuleFunc(rule, value) {
    console.log(`📜 [SETTINGS] Game rule ${rule} set to: ${value}`);
    setGameRule(rule, value);
    updateSettingsDisplay();
}

function setDevice(mode) {
    console.log(`📱 [SETTINGS] Device mode set to: ${mode}`);
    if (mode === 'mobile') {
        setDeviceMode(true, true);
    } else if (mode === 'desktop') {
        setDeviceMode(false, true);
    }
    updateSettingsDisplay();
}

let listeningForKey = null;

function changeKey(action) {
    if (listeningForKey) return;
    
    listeningForKey = action;
    const btn = event.target;
    btn.classList.add('listening');
    btn.innerText = t('listenKey');
    
    console.log(`⚙️ [SETTINGS] Listening for key for: ${action}`);
    
    const keyListener = (e) => {
        e.preventDefault();
        
        // Don't allow certain keys
        if (['Escape', 'F5', 'F11', 'F12'].includes(e.code)) {
            console.log('⚠️ [SETTINGS] Invalid key');
            return;
        }
        
        console.log(`⚙️ [SETTINGS] Key captured: ${e.code}`);
        setKeyBinding(action, e.code);
        updateSettingsDisplay();
        
        btn.classList.remove('listening');
        btn.innerText = t('changeKey');
        
        window.removeEventListener('keydown', keyListener);
        listeningForKey = null;
    };
    
    window.addEventListener('keydown', keyListener);
}

// ===== DEVELOPER CONSOLE =====

function appendDevLine(output, text, className) {
    const line = document.createElement('div');
    if (className) line.className = className;
    line.textContent = text;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
    return line;
}

function formatDevValue(value) {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'object') {
        try { return JSON.stringify(value); } catch (e) { return String(value); }
    }
    return String(value);
}

async function runDevConsole() {
    const input = document.getElementById('dev-console-input');
    const output = document.getElementById('dev-console-output');
    if (!input || !output) return;

    const code = input.value.trim();
    if (!code) {
        appendDevLine(output, currentLang === 'en' ? '⚠️ No code to run' : '⚠️ אין קוד להרצה', 'dev-err');
        return;
    }

    // Echo the command (just like the browser console)
    appendDevLine(output, `> ${code}`, null).style.opacity = '0.6';

    // Capture console.log/warn/error output so commands that only log
    // (like the debug commands) actually show their feedback here.
    const original = {
        log: console.log,
        warn: console.warn,
        error: console.error
    };
    const capture = (cls) => (...args) => {
        const text = args.map(a => (typeof a === 'object' ? formatDevValue(a) : String(a))).join(' ');
        appendDevLine(output, text, cls);
    };
    console.log = (...args) => { original.log(...args); capture('dev-log')(...args); };
    console.warn = (...args) => { original.warn(...args); capture('dev-warn')(...args); };
    console.error = (...args) => { original.error(...args); capture('dev-err')(...args); };

    try {
        // Run in global scope so window.* debug commands are available
        let result = (0, eval)(code);

        // Await promises (several debug commands are async)
        if (result && typeof result.then === 'function') {
            result = await result;
        }

        appendDevLine(output, formatDevValue(result), 'dev-ok');
    } catch (err) {
        const name = (err && err.name) || 'Error';
        const message = (err && err.message) || String(err);
        appendDevLine(output, `❌ ${name}: ${message}`, 'dev-err');
        original.error('💻 [DEV CONSOLE] Error:', err);
    } finally {
        // Always restore the real console
        console.log = original.log;
        console.warn = original.warn;
        console.error = original.error;
    }

    output.scrollTop = output.scrollHeight;
}

function clearDevConsole() {
    const output = document.getElementById('dev-console-output');
    if (output) output.innerHTML = '';
}

// ===== PERSONAL HISTORY & PERSONAL LEADERBOARD =====

import { loadGameHistory, getPersonalBests, getPersonalStats, getPersonalBest, formatDuration } from './game-history.js';
import { getAchievementProgress } from './achievements.js';

// ===== REPLAY LOGGING — Snapshot-based =====
// Every 200ms: snapshot player stats + all visible objects, read from state arrays (no layout queries).
// Each object is a compact array whose LAST element is a stable id, so frames can be
// interpolated by matching the SAME object across frames (not by array index, which shifts on splice).
//   enemy:           ['e', x, y, color, hp, id]
//   burger:          ['B', x, y, id]
//   asteroid:        ['a', x, y, id]
//   player bullet:   ['p', x, y, id]
//   ability flame:   ['f', x, y, id]   (phoenix feathers / dragon flames)
//   enemy bullet:    ['q', x, y, angle, id]
// x/y are permille (0-1000) of the wrapper dimensions.

let _replayFrames = [];
let _replayLastFrameTime = 0;
let _ridCounter = 1;
const REPLAY_INTERVAL  = 200;   // ms between snapshots
const REPLAY_MAX_FRAMES = 1800; // 6 min @ 200ms

// Stamp a stable id on a live game object (object references persist across frames).
function _rid(obj) { return obj._rid || (obj._rid = _ridCounter++); }

function replayRecordPos(now) {
    if (!state.active || state.isDebugGame) return;
    if (now - _replayLastFrameTime < REPLAY_INTERVAL) return;
    _replayLastFrameTime = now;
    if (_replayFrames.length >= REPLAY_MAX_FRAMES) return;

    const W = DOM.wrapper.clientWidth  || 500;
    const H = DOM.wrapper.clientHeight || 700;
    const px = v => Math.round((v / W) * 1000);
    const py = v => Math.round((v / H) * 1000);

    const objs = [];

    for (const e of state.enemies) {
        const ex = parseFloat(e.el.style.left) || 0;
        const c = { red:'r', orange:'o', green:'g', blue:'b' }[e.type] || 'r';
        const ehp = Math.round((e.hp / e.maxHP) * 100);
        objs.push(['e', px(ex), py(e.y), c, ehp, _rid(e)]);
    }
    for (const b of state.burgers) {
        objs.push(['B', px(parseFloat(b.el.style.left) || 0), py(b.y), _rid(b)]);
    }
    for (const a of state.asteroids) {
        objs.push(['a', px(parseFloat(a.el.style.left) || 0), py(a.y), _rid(a)]);
    }
    for (const b of state.bullets) {
        const bx = parseFloat(b.el.style.left) || 0;
        if (b.isFeather || b.directional) {
            // Ability projectiles (feathers / dragon flames) use style.top
            const by = parseFloat(b.el.style.top) || 0;
            objs.push(['f', px(bx), py(by), _rid(b)]);
        } else {
            // Regular bullets use style.bottom — convert to top-based coords
            const bottomPx = parseFloat(b.el.style.bottom) || 0;
            objs.push(['p', px(bx), py(H - bottomPx - 15), _rid(b)]);
        }
    }
    for (const b of state.enemyBullets) {
        const angle = Math.round(Math.atan2(b.vy || 0, b.vx || 0) * 180 / Math.PI);
        // Derive a color char from the bullet's inline background (set per enemy type)
        const bg = b.el.style.background || '';
        let c = 'r';
        if (b.chaotic) c = 'c';
        else if (bg.includes('elite')) c = 'o';
        else if (bg.includes('00cc44')) c = 'g';
        else if (bg.includes('0088ff')) c = 'b';
        objs.push(['q', px(b.x), py(b.y), angle, c, _rid(b)]);
    }

    // Dragon shield active?
    const shielded = state.dragonAbility && now < state.dragonAbility.invincibleUntil ? 1 : 0;

    _replayFrames.push({
        t:     now - (state.startTime || now),
        px:    Math.round(state.playerX),
        hp:    Math.round((state.playerHP / state.playerMaxHP) * 100),
        ammo:  Math.round((state.ammo / state.maxAmmo) * 100),
        score: state.score,
        level: state.level,
        sh:    shielded,
        W, H, objs
    });
}

// Record a discrete event (levelup marker, ability activation) for the viewer to flash.
function replayRecordEvent(type, extra) {
    if (!state.active || state.isDebugGame) return;
    if (_replayFrames.length >= REPLAY_MAX_FRAMES) return;
    _replayFrames.push({ t: Date.now() - (state.startTime || Date.now()), ev: type, ...extra });
}
window.__replayRecordEvent = replayRecordEvent;

function replayReset() {
    _replayFrames = [];
    _replayLastFrameTime = 0;
    _ridCounter = 1;
}

window.__flushReplayLog = function() {
    const frames = _replayFrames.slice();
    replayReset();
    return frames.length > 1 ? frames : null;
};

// ===== REPLAY VIEWER =====

let _replayData    = null;
let _replaySkin    = 'classic';
let _replayPlaying = false;
let _replayRAF     = null;
let _replayStartWall = 0;
let _replayOffsetMs  = 0;
let _replayDuration  = 0;

// Object dimensions [w, h] per type — used for centering. 'p' is overridden per-skin at openReplay.
const OBJ_DIM = { e: [40, 48], B: [40, 40], a: [36, 36], p: [4, 15], f: [20, 20], q: [8, 20] };

// Pre-built DOM elements — innerHTML set once at creation, only position updated each frame.
// Enemy ('e') and enemy-bullet ('q') are pooled per color.
const _replayPool = { e: {}, B: [], a: [], p: [], f: [], q: {} };

const ENEMY_COLORS_HEX = { r: '#ff4d4d', o: '#ff9900', g: '#00cc44', b: '#0088ff' };
const EBULLET_COLORS   = { r: ['#ff4444','#ff0000'], o: ['#ff9900','#ff9900'], g: ['#00cc44','#00cc44'], b: ['#0088ff','#0088ff'], c: ['#00f2ff','#00f2ff'] };

// Player-bullet style derived from the recorded run's skin (constant per run).
let _replayPBulletStyle = '';

function _computePlayerBulletStyle(skinKey) {
    const skin = SKINS[skinKey] || SKINS.classic;
    const col  = skin.color || '#00f2ff';
    const dmg  = skin.bulletDamage || 1.0;
    if (dmg >= 3.0) {
        // Fire bullet (joker / dragon)
        OBJ_DIM.p = [8, 25];
        _replayPBulletStyle = `background:linear-gradient(to top,#ff4500,#ffa500,#ffff00);border-radius:50% 50% 40% 40%;box-shadow:0 0 16px #ff4500,0 0 8px #ffff00;`;
    } else if (dmg > 1.5) {
        OBJ_DIM.p = [6, 20];
        _replayPBulletStyle = `background:linear-gradient(to top,${col},#fff);border-radius:2px;box-shadow:0 0 14px ${col},0 0 6px #fff;`;
    } else if (dmg > 1.0) {
        OBJ_DIM.p = [5, 18];
        _replayPBulletStyle = `background:linear-gradient(to top,${col},#fff);border-radius:2px;box-shadow:0 0 12px ${col};`;
    } else {
        OBJ_DIM.p = [4, 15];
        _replayPBulletStyle = `background:linear-gradient(to top,${col},#fff);border-radius:2px;box-shadow:0 0 8px ${col};`;
    }
}

function _buildEl(type, color) {
    const el = document.createElement('div');
    el.className = 'replay-obj';
    el.dataset.rtype = type;
    el.dataset.rcolor = color || '';
    const [w, h] = OBJ_DIM[type] || [20, 20];
    el.style.cssText = `position:absolute;pointer-events:none;width:${w}px;height:${h}px;`;
    if (type === 'e') {
        const c = ENEMY_COLORS_HEX[color] || '#ff4d4d';
        el.innerHTML = `
            <div style="height:4px;background:rgba(0,0,0,0.5);border-radius:2px;margin-bottom:2px;overflow:hidden;">
                <div class="replay-enemy-hp" style="height:100%;width:100%;background:${c};border-radius:2px;"></div>
            </div>
            <svg viewBox="0 0 100 100" style="width:40px;height:40px;display:block;"><path d="M10 20 L50 90 L90 20 L50 40 Z" fill="${c}" stroke="#fff" stroke-width="2"/></svg>`;
    } else if (type === 'B') {
        el.innerHTML = `<svg viewBox="0 0 100 100" style="width:100%;height:100%"><path d="M10 50 Q50 10 90 50 Z" fill="#e67e22"/><rect x="10" y="50" width="80" height="15" fill="#6d4c41"/><path d="M10 65 L90 65 L80 85 L20 85 Z" fill="#e67e22"/></svg>`;
    } else if (type === 'a') {
        el.innerHTML = `<svg viewBox="0 0 100 100" style="width:100%;height:100%"><path d="M20 30 L40 10 L70 20 L90 50 L75 85 L30 90 L10 60 Z" fill="#444" stroke="#777" stroke-width="3"/></svg>`;
    } else if (type === 'p') {
        // Player bullet — styled to match the recorded run's skin
        el.style.cssText += _replayPBulletStyle;
    } else if (type === 'f') {
        // Ability projectile (phoenix feather / dragon flame) — glowing orb
        el.style.cssText += `background:radial-gradient(circle,#ffd700,#ff6b35);border-radius:50%;box-shadow:0 0 12px #ff6b35;`;
    } else if (type === 'q') {
        // Enemy bullet — color per shooter type; rotate applied per-frame
        const [bg, glow] = EBULLET_COLORS[color] || EBULLET_COLORS.r;
        el.style.cssText += `background:${bg};border-radius:4px;box-shadow:0 0 10px ${glow};transform-origin:center center;`;
    }
    return el;
}

function _getEl(type, color) {
    let pool;
    if (type === 'e' || type === 'q') pool = _replayPool[type][color] || (_replayPool[type][color] = []);
    else pool = _replayPool[type] || (_replayPool[type] = []);
    return pool.length ? pool.pop() : _buildEl(type, color);
}

function _recycleEl(el) {
    const type  = el.dataset.rtype;
    const color = el.dataset.rcolor;
    el.style.display = 'none';
    if (type === 'e' || type === 'q') (_replayPool[type][color] || (_replayPool[type][color] = [])).push(el);
    else (_replayPool[type] || (_replayPool[type] = [])).push(el);
}

// All active replay objects currently in the stage
let _replayActiveEls = [];

function openReplay(histEntry) {
    const log = histEntry.replayLog;
    if (!log || !log.length) {
        alert('אין נתוני Replay לריצה זו');
        return;
    }

    _replayData     = log.filter(f => f.objs || f.ev);
    _replaySkin     = histEntry.skin || 'classic';
    _replayDuration = log[log.length - 1]?.t || 1;
    _replayOffsetMs = 0;

    // Compute player-bullet appearance for this run's skin, then reset the element
    // pool so previously-styled 'p' elements don't carry over from another run.
    _computePlayerBulletStyle(_replaySkin);
    _replayPool.e = {}; _replayPool.q = {};
    _replayPool.B = []; _replayPool.a = []; _replayPool.p = []; _replayPool.f = [];

    const container = document.getElementById('replay-container');
    const stage     = document.getElementById('replay-stage');
    container.style.display = 'flex';
    // Remove stale pooled object elements from a previous replay
    stage.querySelectorAll('.replay-obj').forEach(el => el.remove());
    _replayActiveEls = [];

    // Set player skin SVG
    const playerEl = document.getElementById('replay-player-dot');
    if (playerEl) playerEl.innerHTML = SKINS[_replaySkin]?.svg || SKINS.classic.svg;

    // Stars — create once, pause animation when viewer is paused
    const starsEl = document.getElementById('replay-stage-stars');
    if (starsEl && !starsEl.children.length) {
        for (let i = 0; i < 20; i++) {
            const s = document.createElement('div');
            s.className = 'star';
            s.style.cssText = `width:2px;height:2px;left:${Math.random()*100}%;top:${Math.random()*100}%;animation-duration:${Math.random()*4+2}s`;
            starsEl.appendChild(s);
        }
    }
    _replaySetStarsPaused(false); // start playing

    const info = document.getElementById('replay-info');
    const skinName = SKINS[_replaySkin]?.name || _replaySkin;
    info.textContent = `${histEntry.score?.toLocaleString()} נקודות • שלב ${histEntry.level} • ${skinName} • ${histEntry.date || ''}`;

    document.getElementById('replay-timeline').value = 0;

    // Auto-play immediately
    _replayOffsetMs  = 0;
    _replayStartWall = Date.now();
    _replayPlaying   = true;
    document.getElementById('replay-playpause-btn').textContent = '⏸ עצור';
    _replayRender(0);
    _replayLoop();
}

function _replaySetStarsPaused(paused) {
    const starsEl = document.getElementById('replay-stage-stars');
    if (!starsEl) return;
    starsEl.querySelectorAll('.star').forEach(s => {
        s.style.animationPlayState = paused ? 'paused' : 'running';
    });
}

// Binary search: returns { frameA, frameB, alpha } for interpolation between frames.
// alpha=0 → pure frameA, alpha=1 → pure frameB.
function _findFramePair(offsetMs) {
    let lo = 0, hi = _replayData.length - 1;
    let idxA = -1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (_replayData[mid].t <= offsetMs) { idxA = mid; lo = mid + 1; }
        else hi = mid - 1;
    }
    if (idxA < 0) return { frameA: null, frameB: null, alpha: 0 };
    // Walk back to the latest SNAPSHOT frame (skip event-only frames)
    let frameA = null;
    for (let i = idxA; i >= 0; i--) {
        if (_replayData[i].objs) { frameA = _replayData[i]; break; }
    }
    if (!frameA) return { frameA: null, frameB: null, alpha: 0 };
    // Next snapshot frame after frameA for interpolation
    let frameB = null;
    for (let i = _replayData.indexOf(frameA) + 1; i < _replayData.length; i++) {
        if (_replayData[i].objs) { frameB = _replayData[i]; break; }
    }
    const alpha = (frameB && frameB.t > frameA.t)
        ? Math.min(1, (offsetMs - frameA.t) / (frameB.t - frameA.t))
        : 0;
    return { frameA, frameB, alpha };
}

function _lerp(a, b, t) { return a + (b - a) * t; }

// The stable id is always the LAST element of an object array.
function _objId(o) { return o[o.length - 1]; }

function _replayRender(offsetMs) {
    const stage = document.getElementById('replay-stage');
    if (!stage || !_replayData) return;

    const { frameA, frameB, alpha } = _findFramePair(offsetMs);

    // Recycle previous active elements
    for (const el of _replayActiveEls) _recycleEl(el);
    _replayActiveEls = [];

    const stageW = stage.clientWidth  || 420;
    const stageH = stage.clientHeight || 700;

    if (frameA) {
        // Player — interpolate X between frames
        const playerEl = document.getElementById('replay-player-dot');
        if (playerEl) {
            const gameW = frameA.W || 500;
            let px = frameA.px;
            if (frameB && alpha > 0) px = _lerp(frameA.px, frameB.px, alpha);
            playerEl.style.left = ((px / gameW) * stageW) + 'px';
            // Dragon shield ring
            playerEl.classList.toggle('replay-shielded', frameA.sh === 1);
        }

        // Stats UI
        const hpBar = document.getElementById('replay-hp-bar');
        if (hpBar) {
            const hp = frameA.hp ?? 100;
            hpBar.style.width = hp + '%';
            hpBar.style.background = hp > 50 ? 'var(--health)' : hp > 25 ? '#ffa500' : 'var(--danger)';
        }
        const ammoBar = document.getElementById('replay-ammo-bar');
        if (ammoBar) ammoBar.style.width = (frameA.ammo ?? 100) + '%';
        const scoreEl = document.getElementById('replay-score');
        if (scoreEl) scoreEl.textContent = (frameA.score ?? 0).toLocaleString();
        const levelEl = document.getElementById('replay-level');
        if (levelEl) levelEl.textContent = frameA.level ?? 1;

        // Build frameB lookup by stable id so the SAME object is interpolated across frames
        const bById = {};
        if (frameB && alpha > 0) {
            for (const o of frameB.objs) bById[_objId(o)] = o;
        }

        for (const obj of frameA.objs) {
            const type = obj[0], xp = obj[1], yp = obj[2];
            const eColor = type === 'e' ? obj[3] : undefined;
            const qColor = type === 'q' ? obj[4] : undefined;
            const angle  = type === 'q' ? obj[3] : undefined;
            const ehp    = type === 'e' ? obj[4] : undefined;

            const el = _getEl(type, type === 'e' ? eColor : (type === 'q' ? qColor : ''));

            let rx = xp, ry = yp;
            if (alpha > 0) {
                const bObj = bById[_objId(obj)];
                // Only interpolate if matched obj is the same type (id is unique, so type always matches)
                if (bObj) { rx = _lerp(xp, bObj[1], alpha); ry = _lerp(yp, bObj[2], alpha); }
            }

            const [w, h] = OBJ_DIM[type] || [20, 20];
            el.style.left = ((rx / 1000) * stageW - w / 2) + 'px';
            el.style.top  = ((ry / 1000) * stageH - h / 2) + 'px';

            if (type === 'q' && angle != null) {
                el.style.transform = `rotate(${angle - 90}deg)`;
            }

            if (type === 'e' && ehp != null) {
                const hpFill = el.querySelector('.replay-enemy-hp');
                if (hpFill) hpFill.style.width = ehp + '%';
            }

            el.style.display = '';
            if (!el.parentElement) stage.appendChild(el);
            _replayActiveEls.push(el);
        }
    }

    // Ability flash — show a pulse when playback is near an ability-use event
    _replayRenderAbilityFlash(offsetMs);

    // Update timeline slider (skip if user is dragging it)
    const tl = document.getElementById('replay-timeline');
    if (tl && !tl.matches(':active')) {
        tl.value = (_replayDuration > 0) ? (offsetMs / _replayDuration) * 100 : 0;
    }
}

const ABILITY_INFO = {
    vortex:  { icon: '⚡', color: '#9b59b6', label: 'Vortex Laser' },
    phoenix: { icon: '🔥', color: '#ff6b35', label: 'Phoenix' },
    joker:   { icon: '🃏', color: '#ff4500', label: 'Joker Chaos' },
    dragon:  { icon: '🐉', color: '#ff2d2d', label: 'Dragon Fire' },
};

function _replayRenderAbilityFlash(offsetMs) {
    const stage = document.getElementById('replay-stage');
    if (!stage) return;
    let flash = document.getElementById('replay-ability-flash');

    // Find an ability event within the last 700ms of playback
    let active = null;
    for (const f of _replayData) {
        if (f.ev === 'ability' && offsetMs >= f.t && offsetMs - f.t < 700) { active = f; break; }
    }

    if (!active) { if (flash) flash.style.display = 'none'; return; }

    const info = ABILITY_INFO[active.ability] || { icon: '✨', color: '#fff', label: '' };
    const age = offsetMs - active.t;
    const opacity = Math.max(0, 1 - age / 700);

    if (!flash) {
        flash = document.createElement('div');
        flash.id = 'replay-ability-flash';
        flash.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;z-index:15;';
        stage.appendChild(flash);
    }
    flash.style.display = 'flex';
    flash.style.background = `radial-gradient(circle, ${info.color}33 0%, transparent 70%)`;
    flash.style.opacity = opacity;
    flash.innerHTML = `<div style="font-size:2.4rem;">${info.icon}</div>
        <div style="font-size:0.8rem;color:${info.color};font-family:Orbitron,sans-serif;text-shadow:0 0 8px ${info.color};">${info.label}</div>`;
}

function _replayLoop() {
    if (!_replayPlaying) return;
    _replayOffsetMs = Date.now() - _replayStartWall;

    if (_replayOffsetMs >= _replayDuration) {
        _replayOffsetMs = _replayDuration;
        _replayPlaying  = false;
        _replaySetStarsPaused(true);
        document.getElementById('replay-playpause-btn').textContent = '▶ הפעל מחדש';
        _replayRender(_replayOffsetMs);
        return;
    }

    _replayRender(_replayOffsetMs);
    _replayRAF = requestAnimationFrame(_replayLoop);
}

window.__replayPlayPause = function() {
    if (!_replayData) return;
    if (_replayPlaying) {
        _replayPlaying = false;
        cancelAnimationFrame(_replayRAF);
        _replaySetStarsPaused(true);
        document.getElementById('replay-playpause-btn').textContent = '▶ המשך';
    } else {
        if (_replayOffsetMs >= _replayDuration) _replayOffsetMs = 0;
        _replayStartWall = Date.now() - _replayOffsetMs;
        _replayPlaying   = true;
        _replaySetStarsPaused(false);
        document.getElementById('replay-playpause-btn').textContent = '⏸ עצור';
        _replayLoop();
    }
};

window.__replaySeek = function(pct) {
    _replayOffsetMs  = (_replayDuration * Number(pct)) / 100;
    _replayStartWall = Date.now() - _replayOffsetMs;
    _replayRender(_replayOffsetMs);
};

window.__replayClose = function() {
    _replayPlaying = false;
    cancelAnimationFrame(_replayRAF);
    for (const el of _replayActiveEls) { el.style.display = 'none'; }
    _replayActiveEls = [];
    _replayData = null;
    _replaySetStarsPaused(true);
    const flash = document.getElementById('replay-ability-flash');
    if (flash) flash.style.display = 'none';
    document.getElementById('replay-container').style.display = 'none';
};

window.openReplay = openReplay;

// ===== ACHIEVEMENTS GALLERY =====

function renderAchievementsPanel() {
    const list = document.getElementById('achievements-list');
    const progress = document.getElementById('achievements-progress');
    if (!list) return;

    const all = getAchievementProgress();
    const unlocked = all.filter(a => a.unlocked).length;

    const progressLabels = {
        he: `${unlocked} / ${all.length} הישגים פוצחו`,
        en: `${unlocked} / ${all.length} Achievements Unlocked`,
        ar: `${unlocked} / ${all.length} إنجازات تم فتحها`,
        ru: `${unlocked} / ${all.length} Достижений разблокировано`,
        fr: `${unlocked} / ${all.length} Exploits débloqués`,
        es: `${unlocked} / ${all.length} Logros desbloqueados`
    };

    if (progress) progress.textContent = progressLabels[currentLang] || progressLabels.en;

    list.innerHTML = all.map(a => `
        <div class="achievement-card${a.unlocked ? '' : ' locked'}">
            <div class="ach-icon">${a.icon}</div>
            <div class="ach-info">
                <div class="ach-name">${a.unlocked ? a.name : '🔒 Locked'}</div>
                <div class="ach-desc">${a.desc}</div>
            </div>
            ${a.unlocked ? '<div style="font-size:0.8rem;color:#ffd700;">✓</div>' : ''}
        </div>
    `).join('');
}

// ===== PERSONAL HISTORY =====

let _currentHistoryTab = 'history';
let _currentBestsKey  = 'overall';
let _bestsMode        = 'score';   // 'score' | 'speedrun'
let _bestsSrGoal      = SPEEDRUN_GOALS[0]?.key || 'score_10k';

function renderBestsTabs() {
    const modeEl = document.getElementById('bests-mode-tabs');
    if (modeEl) {
        modeEl.innerHTML = [
            { key: 'score',    label: '🏆 ניקוד'   },
            { key: 'speedrun', label: '⚡ ספידראן' },
        ].map(m =>
            `<button class="lb-tab${_bestsMode===m.key?' active':''}" onclick="window.__bestsSetMode('${m.key}')">${m.label}</button>`
        ).join('');
    }

    const subEl = document.getElementById('bests-sub-tabs');
    if (!subEl) return;

    if (_bestsMode === 'score') {
        subEl.style.display = '';
        subEl.innerHTML = [{ key: 'overall', label: '🏆 כללי' }, ...LB_SKINS].map(s =>
            `<button class="lb-tab${_currentBestsKey===s.key?' active':''}" onclick="window.__bestsSetSkin('${s.key}')">${s.label}</button>`
        ).join('');
    } else {
        const allGoals = [...SPEEDRUN_GOALS, ...getCustomSpeedrunGoals()];
        subEl.style.display = '';
        subEl.innerHTML = allGoals.map(g =>
            `<button class="lb-tab${_bestsSrGoal===g.key?' active':''}" onclick="window.__bestsSetGoal('${g.key}')">${g.icon} ${g.label}</button>`
        ).join('');
    }
}

window.__bestsSetMode = function(mode) { _bestsMode = mode; renderBestsTabs(); _bestsTriggerDisplay(); };
window.__bestsSetSkin = function(key)  { _currentBestsKey = key; renderBestsTabs(); renderBestsList(key); };
window.__bestsSetGoal = function(key)  { _bestsSrGoal = key; renderBestsTabs(); renderBestsSpeedrun(key); };

function _bestsTriggerDisplay() {
    if (_bestsMode === 'score') renderBestsList(_currentBestsKey);
    else renderBestsSpeedrun(_bestsSrGoal);
}

function renderBestsSpeedrun(goalKey) {
    renderFilterBar('bests-filter-bar', _bestsFilters, () => renderBestsSpeedrun(goalKey));
    const allGoals = [...SPEEDRUN_GOALS, ...getCustomSpeedrunGoals()];
    const goal = allGoals.find(g => g.key === goalKey);
    const el   = document.getElementById('bests-list');
    if (!el) return;
    const entries = getSpeedrunLeaderboard(goalKey);
    if (!entries.length) {
        el.innerHTML = `<div style="opacity:0.5;font-size:0.85rem;text-align:center;padding:16px 0;">עדיין אין שיאים אישיים ב"${goal?.label || goalKey}"</div>`;
        return;
    }
    const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
    el.innerHTML = entries.map((e, i) =>
        `<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,0.07);">
            <span style="font-size:1.1rem;min-width:28px;">${medals[i] || (i+1)}</span>
            <span style="color:#00f2ff;font-size:1rem;font-weight:bold;">⏱️ ${formatTime(e.time)}</span>
            <span style="font-size:0.75rem;opacity:0.6;">${SKINS[e.skin]?.name || e.skin || ''} • ${e.date || ''}</span>
        </div>`
    ).join('');
}

function showPersonalHistory() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('history-container').style.display = 'block';
    _currentHistoryTab = 'history';
    document.getElementById('htab-history').classList.add('active');
    document.getElementById('htab-bests').classList.remove('active');
    document.getElementById('history-list-panel').style.display = 'block';
    document.getElementById('history-bests-panel').style.display = 'none';
    renderHistoryStats();
    renderHistoryList();
}

function closePersonalHistory() {
    document.getElementById('history-container').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
}

function switchHistoryTab(tab) {
    _currentHistoryTab = tab;
    document.getElementById('htab-history').classList.toggle('active', tab === 'history');
    document.getElementById('htab-bests').classList.toggle('active', tab === 'bests');
    document.getElementById('htab-achievements')?.classList.toggle('active', tab === 'achievements');
    document.getElementById('history-list-panel').style.display = tab === 'history' ? 'block' : 'none';
    document.getElementById('history-bests-panel').style.display = tab === 'bests' ? 'block' : 'none';
    document.getElementById('history-achievements-panel').style.display = tab === 'achievements' ? 'block' : 'none';
    if (tab === 'bests') { renderBestsTabs(); _bestsTriggerDisplay(); }
    if (tab === 'achievements') renderAchievementsPanel();
}

function switchBestsTab(btn, skinKey) {
    _currentBestsKey = skinKey;
    renderBestsTabs();
    renderBestsList(skinKey);
}

function renderHistoryStats() {
    const stats = getPersonalStats();
    const el = document.getElementById('history-stats');
    if (!stats) {
        el.innerHTML = '<div style="opacity:0.5; font-size:0.8rem;">עדיין אין משחקים שמורים</div>';
        return;
    }
    const card = (icon, label, value) =>
        `<div style="background:rgba(0,242,255,0.07);border:1px solid rgba(0,242,255,0.25);border-radius:8px;padding:8px 12px;min-width:90px;">
            <div style="font-size:1.1rem">${icon}</div>
            <div style="font-size:1rem;font-weight:bold;color:var(--primary)">${value}</div>
            <div style="font-size:0.65rem;opacity:0.6">${label}</div>
        </div>`;
    el.innerHTML =
        card('🎮', 'משחקים', stats.totalGames) +
        card('🏆', 'שיא', stats.bestScore.toLocaleString()) +
        card('⭐', 'שלב מקסימלי', stats.bestLevel) +
        card('📈', 'ממוצע', stats.avgScore.toLocaleString()) +
        card('⏱️', 'זמן ממוצע', formatDuration(stats.totalTime / stats.totalGames)) +
        (stats.favSkin ? card('🚀', 'ספינה מועדפת', SKINS[stats.favSkin]?.name || stats.favSkin) : '');
}

function renderHistoryList() {
    renderFilterBar('hist-filter-bar', _histFilters, () => renderHistoryList());

    const allHistory = loadGameHistory();
    const el = document.getElementById('history-list');
    if (!allHistory.length) {
        el.innerHTML = '<div style="opacity:0.5;padding:20px;font-size:0.85rem;">עדיין אין היסטוריה — שחק משחק!</div>';
        return;
    }

    const history = applyEntryFilters(allHistory, _histFilters);
    const medals = ['🥇','🥈','🥉'];
    const sorted = [...allHistory].sort((a,b) => b.score - a.score);
    const topScores = new Set(sorted.slice(0,3).map(e => e.timestamp));

    const countNote = countActiveFilters(_histFilters) > 0
        ? `<div style="font-size:0.72rem;opacity:0.5;padding:4px 8px;">${history.length} / ${allHistory.length} משחקים</div>` : '';

    if (!history.length) {
        el.innerHTML = `${countNote}<div style="opacity:0.5;padding:16px;font-size:0.85rem;">No results for these filters</div>`;
        return;
    }

    // store for settings button access
    _currentLeaderboardEntries = history;
    window.__histEntries = history;

    el.innerHTML = countNote + history.map((entry, i) => {
        const isBest = topScores.has(entry.timestamp);
        const medal = isBest ? medals[sorted.findIndex(e => e.timestamp === entry.timestamp)] || '' : '';
        const skinName = SKINS[entry.skin]?.name || entry.skinName || entry.skin || '–';
        const ups = entry.settings?.upgrades || [];
        const upgradesTag = ups.length > 0
            ? `<span style="color:#c084fc;font-size:0.68rem;">🛍️×${ups.length}</span>` : '';
        const coinsEarned = entry.coins ?? entry.settings?.coins;
        const coinsTag = coinsEarned != null
            ? `<span style="color:#ffd700;font-size:0.68rem;">💰${coinsEarned}</span>` : '';
        const showDevice = _histFilters.device === 'all';
        const deviceTag = (showDevice && entry.settings?.isMobile != null)
            ? `<span style="font-size:0.68rem;opacity:0.5;">${entry.settings.isMobile ? '📱' : '🖥️'}</span>` : '';
        const settingsBtn = entry.settings
            ? `<button onclick="showEntrySettings(${i})" style="background:none;border:1px solid rgba(255,255,255,0.2);border-radius:4px;padding:2px 5px;font-size:0.7rem;cursor:pointer;color:rgba(255,255,255,0.5);min-width:24px;" title="הגדרות">⚙️</button>` : '';
        const replayBtn = entry.replayLog
            ? `<button onclick="openReplay(window.__histEntries[${i}])" style="background:none;border:1px solid rgba(0,242,255,0.4);border-radius:4px;padding:2px 5px;font-size:0.7rem;cursor:pointer;color:rgba(0,242,255,0.7);min-width:24px;" title="צפה בReplays">▶</button>` : '';
        return `<div style="display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,0.07);text-align:right;${isBest ? 'background:rgba(0,242,255,0.07);' : ''}">
            <div style="font-size:1.1rem;min-width:24px">${medal || (i+1)}</div>
            <div style="flex:1;font-size:0.8rem;">
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                    <span style="color:var(--primary);font-weight:bold">${entry.score.toLocaleString()}</span>
                    <span style="opacity:0.6">שלב ${entry.level}</span>
                    <span style="opacity:0.5;font-size:0.7rem">${skinName}</span>
                    ${upgradesTag}${coinsTag}${deviceTag}
                </div>
                <div style="opacity:0.45;font-size:0.7rem;margin-top:2px">${entry.date || ''} ${entry.duration ? '• ' + formatDuration(entry.duration) : ''}</div>
            </div>
            ${replayBtn}${settingsBtn}
        </div>`;
    }).join('');
}

function renderBestsList(skinKey) {
    renderFilterBar('bests-filter-bar', _bestsFilters, () => renderBestsList(skinKey));

    const allBests = getPersonalBests(skinKey, 50);
    const el = document.getElementById('bests-list');
    if (!allBests.length) {
        el.innerHTML = '<div style="opacity:0.5;padding:20px;font-size:0.85rem;">אין שיאים לקטגוריה זו עדיין</div>';
        return;
    }

    const bests = applyEntryFilters(allBests, _bestsFilters);
    const medals = ['🥇','🥈','🥉'];

    const countNote = countActiveFilters(_bestsFilters) > 0
        ? `<div style="font-size:0.72rem;opacity:0.5;padding:4px 8px;">${bests.length} / ${allBests.length} שיאים</div>` : '';

    if (!bests.length) {
        el.innerHTML = `${countNote}<div style="opacity:0.5;padding:16px;font-size:0.85rem;">No results for these filters</div>`;
        return;
    }

    // store for settings button access
    _currentBestsEntries = bests;

    el.innerHTML = countNote + bests.map((entry, i) => {
        const skinName = SKINS[entry.skin]?.name || entry.skinName || entry.skin || '–';
        const ups = entry.settings?.upgrades || [];
        const upgradesTag = ups.length > 0
            ? ` <span style="color:#c084fc;font-size:0.72rem;" title="${ups.map(k => UPGRADES[k]?.name || k).join(', ')}">🛍️×${ups.length}</span>` : '';
        const showDevice = _bestsFilters.device === 'all';
        const deviceTag = (showDevice && entry.settings?.isMobile != null)
            ? ` <span style="font-size:0.7rem;opacity:0.5;">${entry.settings.isMobile ? '📱' : '🖥️'}</span>` : '';
        const eduTag = entry.settings?.eduEnabled ? ` <span style="font-size:0.7rem;opacity:0.55;">📚</span>` : '';
        const settingsBtn = entry.settings
            ? `<button onclick="showBestsEntrySettings(${i})" style="background:none;border:1px solid rgba(255,255,255,0.2);border-radius:4px;padding:3px 6px;font-size:0.72rem;cursor:pointer;color:rgba(255,255,255,0.5);" title="הגדרות">⚙️</button>` : '';
        return `<div style="display:flex;align-items:center;gap:10px;padding:9px 10px;border-bottom:1px solid rgba(255,255,255,0.07);text-align:right;${i===0?'background:rgba(255,215,0,0.06);':''}">
            <div style="font-size:1.2rem;min-width:28px">${medals[i] || (i+1)}</div>
            <div style="flex:1;font-size:0.82rem;">
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                    <span style="color:var(--primary);font-weight:bold;font-size:1rem">${entry.score.toLocaleString()}</span>
                    <span style="opacity:0.65">שלב ${entry.level}</span>
                    ${skinKey === 'overall' ? `<span style="opacity:0.5;font-size:0.72rem">${skinName}</span>` : ''}
                    ${upgradesTag}${deviceTag}${eduTag}
                </div>
                <div style="opacity:0.45;font-size:0.7rem;margin-top:2px">${entry.date || ''} ${entry.duration ? '• ' + formatDuration(entry.duration) : ''}</div>
            </div>
            ${settingsBtn}
        </div>`;
    }).join('');
}

function showBestsEntrySettings(idx) {
    const entry = _currentBestsEntries[idx];
    if (!entry) return;
    // Temporarily swap leaderboard entries so showEntrySettings works
    const saved = _currentLeaderboardEntries;
    _currentLeaderboardEntries = _currentBestsEntries;
    showEntrySettings(idx);
    _currentLeaderboardEntries = saved;
}
window.showBestsEntrySettings = showBestsEntrySettings;

// Update the personal-best mini-strip in the main menu
function refreshPersonalBest() {
    const best = getPersonalBest();
    const strip = document.getElementById('personal-best-strip');
    const text = document.getElementById('personal-best-text');
    if (!strip || !text) return;
    if (!best) { strip.style.display = 'none'; return; }
    strip.style.display = 'block';
    const skinName = SKINS[best.skin]?.name || best.skin || '';
    text.textContent = `השיא שלך: ${best.score.toLocaleString()} נקודות • שלב ${best.level}${skinName ? ' • ' + skinName : ''}`;
}

// Called from systems.js after a game ends
window.__refreshPersonalBest = refreshPersonalBest;

// Initialize on load
refreshPersonalBest();

window.showPersonalHistory = showPersonalHistory;
window.closePersonalHistory = closePersonalHistory;
window.switchHistoryTab = switchHistoryTab;
window.switchBestsTab = switchBestsTab;

// Export to window
window.runDevConsole = runDevConsole;
window.clearDevConsole = clearDevConsole;
window.showSettings = showSettings;
window.closeSettings = closeSettings;
window.setControl = setControl;
window.setRightClick = setRightClick;
window.setGameRule = setGameRuleFunc;
window.setDevice = setDevice;
window.changeKey = changeKey;
window.eduSetEnabled = eduSetEnabled;
window.eduSetSubject = eduSetSubject;
window.eduSetGrade = eduSetGrade;
window.eduLock = eduLock;
window.eduUnlock = eduUnlock;
window.eduCreateLink = eduCreateLink;
window.eduCopyLink = eduCopyLink;
window.eduUnlockAll = eduUnlockAll;
window.eduUnlockOne = eduUnlockOne;
window.showSettingsTab = showSettingsTab;

// Debug: open the education lock on this device immediately (ignores password,
// timer and remote state). Also reports the new "open" status to the session.
window.DebugUnlockEdu = function () {
    forceUnlockLocal();
    if (document.getElementById('settings-container')?.style.display !== 'none') {
        updateEduSettingsDisplay();
    }
    console.log('🔓 [DEBUG] Education lock removed on this device.');
    return true;
};