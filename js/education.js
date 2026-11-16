// ===== EDUCATION / QUIZ MODE =====
// Education mode: shows questions on level-up / enemy kill / game start
// Can be normal mode (change subject/grade) or locked mode via teacher link
// (password, subject, and grade are encoded in the link itself)

import { state } from './data.js';
import { t, currentLang } from './i18n.js';

// ---------- Persistent config ----------
// eduConfig describes the *current* education setup.
//   enabled  - quizzes are active
//   locked   - subject/grade are pinned (came from a teacher link) and need
//              the password to be turned off
//   subject  - subject key (e.g. "science")
//   grade    - grade as string ("1".."12")
//   password - the lock password (only meaningful when locked)
//   createdAt - ms timestamp the lock was created (used for the 45-minute
//               auto-unlock; the timer counts from lock creation)
//   sessionId - shared session id derived from the password (Firestore)
//   managed   - this device CREATED the lock/link and can manage everyone
//               (unlock all / see who is locked / unlock individuals)
export let eduConfig = {
    enabled: false,
    locked: false,
    subject: 'science',
    grade: '1',
    password: '',
    createdAt: 0,
    sessionId: '',
    managed: false
};

const STORAGE_KEY = 'eduConfig';

// A lock opens automatically 45 minutes after it was created.
export const LOCK_DURATION_MS = 45 * 60 * 1000;

// ---------- Grade display names (Hebrew letters instead of numbers) ----------
const GRADE_LETTERS = {
    '1': 'א', '2': 'ב', '3': 'ג', '4': 'ד', '5': 'ה', '6': 'ו',
    '7': 'ז', '8': 'ח', '9': 'ט', '10': 'י', '11': 'י״א', '12': 'י״ב'
};

// "1" -> "Grade A", "10" -> "Grade 10", "11" -> "Grade 11"
export function gradeLabel(grade) {
    const g = String(grade);
    const letter = GRADE_LETTERS[g];
    if (!letter) return 'Grade ' + g;
    // Return with "Grade" prefix in English
    return `Grade ${g}`;
}

// Stable, obfuscation-grade session id derived from the password so every
// device that shares the password lands in the same Firestore session.
function hashPassword(pw) {
    let h = 5381;
    const s = String(pw);
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    }
    return 'edu_' + h.toString(36);
}

// ---------- Question bank ----------
// Loaded from questions.json at startup. Shape:
//   { subjects: { <key>: { name, grades: { "<g>": [ {question, options[], correctIndex} ] } } } }
let questionBank = { subjects: {} };      // Hebrew
let questionBankEn = null;                // English (questions.en.json)
let bankLoaded = false;

// Hebrew UI -> Hebrew questions; every other language -> English questions.
function activeBank() {
    return (currentLang !== 'he' && questionBankEn) ? questionBankEn : questionBank;
}

export async function loadQuestionBank() {
    try {
        const res = await fetch('./data/questions.json', { cache: 'no-cache' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        questionBank = await res.json();
        bankLoaded = true;
        try {
            const resEn = await fetch('./data/questions.en.json', { cache: 'no-cache' });
            if (resEn.ok) questionBankEn = await resEn.json();
        } catch (e2) { /* English bank optional */ }
        console.log('📚 [EDU] Question bank loaded:', Object.keys(questionBank.subjects || {}));
    } catch (e) {
        console.warn('⚠️ [EDU] Could not load questions.json, using built-in fallback.', e);
        questionBank = FALLBACK_BANK;
        bankLoaded = true;
    }
    return questionBank;
}

export function getSubjects() {
    return Object.entries(activeBank().subjects || {}).map(([key, s]) => ({
        key,
        name: s.name || key
    }));
}

export function getGradesForSubject(subjectKey) {
    const subj = (activeBank().subjects || {})[subjectKey];
    if (!subj || !subj.grades) return [];
    return Object.keys(subj.grades).sort((a, b) => parseInt(a) - parseInt(b));
}

function getQuestionPool(subjectKey, grade) {
    const subj = (activeBank().subjects || {})[subjectKey];
    if (!subj || !subj.grades) return [];
    return subj.grades[String(grade)] || [];
}

// ---------- Config persistence ----------
function readCookie(name) {
    const m = document.cookie.match('(?:^|; )' + name + '=([^;]*)');
    return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name, value, days = 365) {
    const d = new Date();
    d.setTime(d.getTime() + days * 864e5);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/`;
}

export function loadEduConfig() {
    // A teacher link in the URL always wins over saved local config.
    const fromLink = parseEduLink();
    if (fromLink) {
        eduConfig = { ...eduConfig, ...fromLink };
        applyExpiryIfNeeded();
        saveEduConfig();
        console.log('🔗 [EDU] Config loaded from link:', { subject: eduConfig.subject, grade: eduConfig.grade, locked: eduConfig.locked });
        return eduConfig;
    }
    const saved = readCookie(STORAGE_KEY);
    if (saved) {
        try {
            eduConfig = { ...eduConfig, ...JSON.parse(saved) };
        } catch (e) {
            console.warn('⚠️ [EDU] Bad saved config', e);
        }
    }
    applyExpiryIfNeeded();
    return eduConfig;
}

// ---------- 45-minute auto-unlock ----------
// Returns ms left until the lock opens automatically (0 = already open).
export function lockMsRemaining() {
    if (!eduConfig.locked || !eduConfig.createdAt) return 0;
    return Math.max(0, eduConfig.createdAt + LOCK_DURATION_MS - Date.now());
}

export function isLockExpired() {
    return eduConfig.locked && eduConfig.createdAt > 0 && lockMsRemaining() === 0;
}

// If the lock has aged past 45 minutes, open it. Returns true if it just opened.
export function applyExpiryIfNeeded() {
    if (isLockExpired()) {
        console.log('⏰ [EDU] Lock expired (45 min) — auto-unlocking.');
        forceUnlockLocal();
        return true;
    }
    return false;
}

export function saveEduConfig() {
    writeCookie(STORAGE_KEY, JSON.stringify(eduConfig));
}

export function setEduEnabled(on) {
    eduConfig.enabled = !!on;
    saveEduConfig();
}

export function setEduSubject(subjectKey) {
    if (eduConfig.locked) return false; // pinned by link
    eduConfig.subject = subjectKey;
    // make sure the grade still exists for this subject
    const grades = getGradesForSubject(subjectKey);
    if (grades.length && !grades.includes(eduConfig.grade)) {
        eduConfig.grade = grades[0];
    }
    saveEduConfig();
    return true;
}

export function setEduGrade(grade) {
    if (eduConfig.locked) return false; // pinned by link
    eduConfig.grade = String(grade);
    saveEduConfig();
    return true;
}

// Lock the current config behind a password (local "education mode" lock,
// without generating a link). Once locked, subject/grade can't change and
// turning education mode off requires the password (or the 45-minute timer,
// or a remote unlock from whoever created the password).
export function lockEdu(password) {
    if (!password) return false;
    eduConfig.locked = true;
    eduConfig.password = String(password);
    eduConfig.createdAt = Date.now();
    eduConfig.sessionId = hashPassword(password);
    eduConfig.managed = false; // this device is being locked, not managing
    eduConfig.enabled = true;
    saveEduConfig();
    joinSession(true); // report ourselves as a locked participant
    return true;
}

export function unlockEdu(password) {
    if (!eduConfig.locked) return true;
    if (String(password) === eduConfig.password) {
        forceUnlockLocal();
        return true;
    }
    return false;
}

// Open the lock on THIS device unconditionally. Used by the 45-minute timer,
// a correct password, a remote unlock, and the DebugUnlockEdu command.
export function forceUnlockLocal() {
    const hadSession = eduConfig.sessionId;
    eduConfig.locked = false;
    eduConfig.password = '';
    eduConfig.createdAt = 0;
    saveEduConfig();
    if (hadSession) markParticipantUnlocked(); // tell the manager we're open now
    return true;
}

// ---------- Teacher link (password encoded INSIDE the link) ----------
// We pack {subject, grade, password} into a base64 payload placed in the URL
// hash:  ...index.html#edu=<base64>
// This is obfuscation, not real security — by design the password travels in
// the link so no server is required.
function encodePayload(obj) {
    const json = JSON.stringify(obj);
    // handle unicode safely
    return btoa(unescape(encodeURIComponent(json)));
}

function decodePayload(b64) {
    const json = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json);
}

// A link with a password is LOCKED; a link with no password just preselects
// the subject/grade and is NOT locked. createdAt travels in the link so the
// 45-minute auto-unlock counts from the moment the teacher created it.
export function buildEduLink(subjectKey, grade, password) {
    const pw = String(password || '');
    const locked = pw.length > 0;
    const payload = {
        v: 2,
        subject: subjectKey,
        grade: String(grade),
        password: pw,
        locked,
        createdAt: locked ? Date.now() : 0
    };
    const code = encodePayload(payload);
    const base = location.origin + location.pathname;
    return `${base}#edu=${code}`;
}

function parseEduLink() {
    const hash = location.hash || '';
    const m = hash.match(/edu=([^&]+)/);
    if (!m) return null;
    try {
        const payload = decodePayload(m[1]);
        if (!payload || !payload.subject) return null;
        const pw = String(payload.password || '');
        // No password -> the link only preselects subject/grade, never locks.
        const locked = (payload.locked !== false) && pw.length > 0;
        return {
            enabled: true,
            locked,
            subject: payload.subject,
            grade: String(payload.grade || '1'),
            password: locked ? pw : '',
            createdAt: locked ? (payload.createdAt || Date.now()) : 0,
            sessionId: locked ? hashPassword(pw) : '',
            managed: false
        };
    } catch (e) {
        console.warn('⚠️ [EDU] Could not parse edu link', e);
        return null;
    }
}

// ---------- Quiz triggering with global cooldown ----------
const QUIZ_COOLDOWN_MS = 10000; // 10s between any two quizzes
let lastQuizAt = 0;
let quizOpen = false;

export function isEduActive() {
    applyExpiryIfNeeded();
    return eduConfig.enabled && bankLoaded;
}

// Called from gameplay events. Returns true if a quiz was shown.
// onCorrect / onWrong are optional callbacks (e.g. heal / penalty).
export function triggerQuiz(eventType, { onCorrect, onWrong } = {}) {
    if (!isEduActive()) return false;
    if (quizOpen) return false;
    const now = Date.now();
    if (now - lastQuizAt < QUIZ_COOLDOWN_MS) return false;

    const pool = getQuestionPool(eduConfig.subject, eduConfig.grade);
    if (!pool.length) return false;

    const q = pool[Math.floor(Math.random() * pool.length)];
    lastQuizAt = now;
    showQuizModal(q, eventType, onCorrect, onWrong);
    return true;
}

export function resetQuizCooldown() {
    lastQuizAt = 0;
    quizOpen = false;
}

// ---------- Quiz modal UI ----------
function ensureModal() {
    let modal = document.getElementById('edu-quiz-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'edu-quiz-modal';
    modal.innerHTML = `
        <div class="edu-quiz-card">
            <div class="edu-quiz-tag" id="edu-quiz-tag"></div>
            <h2 id="edu-quiz-question"></h2>
            <div id="edu-quiz-options" class="edu-quiz-options"></div>
            <div id="edu-quiz-feedback" class="edu-quiz-feedback"></div>
        </div>`;
    document.getElementById('game-wrapper').appendChild(modal);
    return modal;
}

const EVENT_LABELS = () => ({
    levelup: t('quizLevelup'),
    kill: t('quizKill'),
    start: t('quizStart')
});

function showQuizModal(q, eventType, onCorrect, onWrong) {
    quizOpen = true;
    const wasActive = state.active;
    state.active = false; // pause the game loop

    const modal = ensureModal();
    modal.style.display = 'flex';

    modal.querySelector('#edu-quiz-tag').innerText = EVENT_LABELS()[eventType] || t('questionTag');
    modal.querySelector('#edu-quiz-question').innerText = q.question;
    const feedback = modal.querySelector('#edu-quiz-feedback');
    feedback.innerText = '';
    feedback.className = 'edu-quiz-feedback';

    const optionsEl = modal.querySelector('#edu-quiz-options');
    optionsEl.innerHTML = '';

    const finish = (correct) => {
        setTimeout(() => {
            modal.style.display = 'none';
            quizOpen = false;
            state.active = wasActive;
            if (correct && onCorrect) onCorrect();
            if (!correct && onWrong) onWrong();
            // Hand control back to the main loop (it stopped itself when paused).
            if (wasActive && window.__resumeGameLoop) {
                window.__resumeGameLoop();
            }
        }, correct ? 700 : 1400);
    };

    q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'edu-quiz-opt';
        btn.innerText = opt;
        btn.onclick = () => {
            // lock all buttons
            Array.from(optionsEl.children).forEach(b => { b.disabled = true; });
            if (idx === q.correctIndex) {
                btn.classList.add('correct');
                feedback.innerText = t('quizCorrect');
                feedback.classList.add('ok');
                finish(true);
            } else {
                btn.classList.add('wrong');
                const correctBtn = optionsEl.children[q.correctIndex];
                if (correctBtn) correctBtn.classList.add('correct');
                feedback.innerText = t('quizWrong');
                feedback.classList.add('bad');
                finish(false);
            }
        };
        optionsEl.appendChild(btn);
    });
}

// ---------- Minimal fallback bank (used only if questions.json is missing) ----------
const FALLBACK_BANK = {
    subjects: {
        science: {
            name: 'מדע',
            grades: {
                '1': [
                    { question: 'כמה רגליים יש לכלב?', options: ['2', '4', '6', '8'], correctIndex: 1 },
                    { question: 'מה צבע השמיים ביום בהיר?', options: ['ירוק', 'כחול', 'אדום', 'צהוב'], correctIndex: 1 }
                ]
            }
        }
    }
};

// ============================================================================
//  SHARED SESSION (Realtime Database) — remote unlock & "who is locked" dashboard
// ----------------------------------------------------------------------------
//  There are no teacher/student roles: anyone who knows the password (i.e.
//  whoever created it and is therefore NOT locked) can manage the session —
//  open it for everyone, see who is connected and locked, and open it for
//  individuals. Locked devices simply report their status and check for an
//  unlock signal. All of this is best-effort: if the database is unavailable the
//  local lock and the 45-minute auto-unlock still work.
//
//  Layout: edu/{sessionId} = { subject, grade, createdAt, managerName, unlockAll,
//                              participants: { {clientId}: { name, locked, lastSeen, forceUnlock } } }
//  Plain REST calls with light polling: no open connection per student, so a whole
//  class never runs into the database's connection limit.
// ============================================================================

const SESSIONS = 'edu';
const STUDENT_POLL_MS = 15000;   // a locked device checks for "unlock" every 15 s
const MANAGER_POLL_MS = 5000;    // the manager's list refreshes every 5 s

// Stable per-device id + a human-readable name for the dashboard.
function getClientId() {
    let id = readCookie('eduClientId');
    if (!id) {
        id = 'c_' + Math.random().toString(36).slice(2, 10);
        writeCookie('eduClientId', id);
    }
    return id;
}

function getClientName() {
    try {
        // currentUser is a live binding from auth.js (no circular dependency).
        const auth = window.__eduCurrentUser;
        if (auth && auth.displayName) return auth.displayName;
    } catch (e) { /* ignore */ }
    const saved = readCookie('eduClientName');
    if (saved) return saved;
    return t('guestName') + ' ' + getClientId().slice(2, 6);
}

// Database call; returns null when anything goes wrong (sessions are best-effort).
async function eduRest(path, opts = {}) {
    try {
        const { cloudRest } = await import('./cloud-sync.js');
        return await cloudRest(`${SESSIONS}/${path}`, { authed: false, ...opts });
    } catch (e) {
        console.warn('⚠️ [EDU] Session call failed', path, e.code || e);
        return null;
    }
}
const NOW = { '.sv': 'timestamp' };

// Register/refresh this device as a participant of the current session.
export async function joinSession(locked) {
    if (!eduConfig.sessionId) return;
    await eduRest(`${eduConfig.sessionId}/participants/${getClientId()}`, {
        method: 'PATCH', body: { name: getClientName(), locked: !!locked, lastSeen: NOW }
    });
}

// Mark this device as no longer locked (after a local/remote/timer unlock).
async function markParticipantUnlocked() {
    const sessionId = eduConfig.sessionId || hashPassword(eduConfig.password || '');
    if (!sessionId) return;
    await eduRest(`${sessionId}/participants/${getClientId()}`, {
        method: 'PATCH', body: { locked: false, lastSeen: NOW }
    });
}

// Watch for a remote unlock signal (whole session OR just this device).
// Calls onUnlock() once when an unlock arrives. Returns a stop fn.
export async function listenForUnlock(onUnlock) {
    if (!eduConfig.sessionId) return () => {};
    const sid = eduConfig.sessionId, me = getClientId();
    let done = false, timer = null;
    const trip = () => {
        if (done) return;
        done = true;
        clearInterval(timer);
        forceUnlockLocal();
        if (onUnlock) onUnlock();
    };
    const check = async () => {
        if (done || document.visibilityState === 'hidden') return;
        const [all, mine] = await Promise.all([
            eduRest(`${sid}/unlockAll`),
            eduRest(`${sid}/participants/${me}/forceUnlock`)
        ]);
        if (all === true || mine === true) trip();
    };
    check();
    timer = setInterval(check, STUDENT_POLL_MS);
    return () => { done = true; clearInterval(timer); };
}

// ----- Manager side (whoever created the password) -----

// Set up THIS device as the manager of the session for `password` (called
// right after creating a locked link). Derives the shared session id, then
// publishes the session document.
export function becomeManager(password) {
    const pw = String(password || '');
    if (!pw) return false;
    eduConfig.sessionId = hashPassword(pw);
    eduConfig.password = pw;
    eduConfig.managed = true;
    if (!eduConfig.createdAt) eduConfig.createdAt = Date.now();
    eduConfig.enabled = true;
    saveEduConfig();
    startManaging();
    return true;
}

// Make sure the session exists and mark THIS device as the manager.
export async function startManaging() {
    if (!eduConfig.sessionId) return;
    eduConfig.managed = true;
    saveEduConfig();
    await eduRest(eduConfig.sessionId, { method: 'PATCH', body: {
        subject: eduConfig.subject,
        grade: eduConfig.grade,
        createdAt: eduConfig.createdAt || Date.now(),
        managerName: getClientName(),
        unlockAll: false,
        lastUpdated: NOW
    } });
}

// Live list of participants for the dashboard. cb receives an array of
// { id, name, locked, lastSeen }. Returns a stop fn.
export async function listenParticipants(cb) {
    if (!eduConfig.sessionId) return () => {};
    const sid = eduConfig.sessionId;
    let stopped = false, last = '';
    const load = async () => {
        if (stopped || document.visibilityState === 'hidden') return;
        const data = await eduRest(`${sid}/participants`);
        const list = Object.entries(data || {}).map(([id, v]) => ({ id, ...v }));
        const sig = JSON.stringify(list);
        if (sig !== last) { last = sig; cb(list); }
    };
    load();
    const timer = setInterval(load, MANAGER_POLL_MS);
    return () => { stopped = true; clearInterval(timer); };
}

// Open the session for EVERYONE.
export async function unlockAllParticipants() {
    if (!eduConfig.sessionId) return false;
    return (await eduRest(eduConfig.sessionId, { method: 'PATCH', body: { unlockAll: true, lastUpdated: NOW } })) !== null;
}

// Open the session for a single participant.
export async function unlockOneParticipant(clientId) {
    if (!eduConfig.sessionId || !clientId) return false;
    return (await eduRest(`${eduConfig.sessionId}/participants/${clientId}`, {
        method: 'PATCH', body: { forceUnlock: true, lastUpdated: NOW }
    })) !== null;
}
