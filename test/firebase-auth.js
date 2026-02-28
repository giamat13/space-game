// ===== FIREBASE AUTH MODULE =====
// Handles: Google login, Email/Password login, Account Linking

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics, logEvent } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    linkWithPopup,
    linkWithCredential,
    EmailAuthProvider,
    signOut,
    fetchSignInMethodsForEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ===== FIREBASE CONFIG =====
const firebaseConfig = {
    apiKey: "AIzaSyDiV4TU6uwOHBX3T4DECM51OZWwPNSZIdw",
    authDomain: "space-game-ii.firebaseapp.com",
    projectId: "space-game-ii",
    storageBucket: "space-game-ii.firebasestorage.app",
    messagingSenderId: "972181615049",
    appId: "1:972181615049:web:1e7790e50c1507c76cb818",
    measurementId: "G-KDX7TXWLFL"
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();

// ===== STATE =====
export let currentUser = null;

// ===== AUTH STATE OBSERVER =====
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        console.log('👤 [AUTH] Logged in:', user.email || user.displayName);
        await syncUserData(user);
        updateAuthUI(user);
        logEvent(analytics, 'login', { method: user.providerData[0]?.providerId });
    } else {
        console.log('👤 [AUTH] Not logged in');
        updateAuthUI(null);
    }
});

// ===== SYNC USER DATA WITH FIRESTORE =====
async function syncUserData(user) {
    try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // New user — create record
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email || null,
                displayName: user.displayName || null,
                providers: user.providerData.map(p => p.providerId),
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            });
            console.log('✅ [FIRESTORE] New user created');
        } else {
            // Existing user — update last login & providers
            await updateDoc(userRef, {
                providers: user.providerData.map(p => p.providerId),
                lastLogin: serverTimestamp(),
                email: user.email || null,
                displayName: user.displayName || null
            });
            console.log('✅ [FIRESTORE] User updated');
        }
    } catch (e) {
        console.error('❌ [FIRESTORE] Error:', e);
    }
}

// ===== GOOGLE SIGN IN =====
export async function signInWithGoogle() {
    try {
        showAuthLoading('מתחבר עם Google...');
        const result = await signInWithPopup(auth, googleProvider);
        closeAuthModal();
        showAuthNotification(`שלום, ${result.user.displayName || result.user.email}! 👋`, 'success');
        logEvent(analytics, 'sign_up', { method: 'google' });
    } catch (error) {
        handleAuthError(error);
    }
}

// ===== EMAIL/PASSWORD SIGN UP =====
export async function signUpWithEmail(email, password, displayName) {
    try {
        showAuthLoading('יוצר חשבון...');
        const result = await createUserWithEmailAndPassword(auth, email, password);

        // Save display name to Firestore immediately
        if (displayName) {
            const userRef = doc(db, 'users', result.user.uid);
            await updateDoc(userRef, { displayName });
        }

        closeAuthModal();
        showAuthNotification('חשבון נוצר בהצלחה! 🎉', 'success');
        logEvent(analytics, 'sign_up', { method: 'email' });
    } catch (error) {
        handleAuthError(error);
    }
}

// ===== EMAIL/PASSWORD SIGN IN =====
export async function signInWithEmail(email, password) {
    try {
        showAuthLoading('מתחבר...');
        const result = await signInWithEmailAndPassword(auth, email, password);
        closeAuthModal();
        showAuthNotification(`ברוך הבא! 👋`, 'success');
        logEvent(analytics, 'login', { method: 'email' });
    } catch (error) {
        handleAuthError(error);
    }
}

// ===== LINK GOOGLE TO EXISTING ACCOUNT =====
export async function linkGoogle() {
    if (!currentUser) return;
    try {
        showAuthLoading('מקשר עם Google...');
        await linkWithPopup(currentUser, googleProvider);
        await syncUserData(auth.currentUser);
        closeAuthModal();
        showAuthNotification('חשבון Google קושר בהצלחה! 🔗', 'success');
        updateAuthUI(auth.currentUser);
        logEvent(analytics, 'link_account', { method: 'google' });
    } catch (error) {
        handleAuthError(error);
    }
}

// ===== LINK EMAIL/PASSWORD TO EXISTING ACCOUNT =====
export async function linkEmail(email, password) {
    if (!currentUser) return;
    try {
        showAuthLoading('מקשר אימייל...');
        const credential = EmailAuthProvider.credential(email, password);
        await linkWithCredential(currentUser, credential);
        await syncUserData(auth.currentUser);
        closeAuthModal();
        showAuthNotification('אימייל קושר בהצלחה! 🔗', 'success');
        updateAuthUI(auth.currentUser);
        logEvent(analytics, 'link_account', { method: 'email' });
    } catch (error) {
        handleAuthError(error);
    }
}

// ===== SIGN OUT =====
export async function logOut() {
    try {
        await signOut(auth);
        showAuthNotification('התנתקת בהצלחה', 'info');
        logEvent(analytics, 'logout');
    } catch (error) {
        console.error('Sign out error:', error);
    }
}

// ===== ERROR HANDLER =====
function handleAuthError(error) {
    hideAuthLoading();
    const messages = {
        'auth/email-already-in-use': 'האימייל הזה כבר בשימוש',
        'auth/weak-password': 'הסיסמה חלשה מדי (מינימום 6 תווים)',
        'auth/invalid-email': 'כתובת אימייל לא תקינה',
        'auth/user-not-found': 'משתמש לא נמצא',
        'auth/wrong-password': 'סיסמה שגויה',
        'auth/popup-closed-by-user': 'החלון נסגר',
        'auth/provider-already-linked': 'ספק זה כבר מקושר לחשבון',
        'auth/credential-already-in-use': 'פרטים אלו כבר בשימוש בחשבון אחר',
        'auth/too-many-requests': 'יותר מדי ניסיונות, נסה שוב מאוחר יותר',
        'auth/invalid-credential': 'פרטי התחברות שגויים',
        'auth/network-request-failed': 'שגיאת רשת, בדוק חיבור לאינטרנט',
    };
    const msg = messages[error.code] || `שגיאה: ${error.message}`;
    showAuthError(msg);
    console.error('❌ [AUTH] Error:', error.code, error.message);
}

// ===== UI HELPERS =====

function updateAuthUI(user) {
    const authBtn = document.getElementById('auth-btn');
    const authUserInfo = document.getElementById('auth-user-info');
    if (!authBtn || !authUserInfo) return;

    if (user) {
        const providers = user.providerData.map(p => p.providerId);
        const hasGoogle = providers.includes('google.com');
        const hasEmail = providers.includes('password');

        const name = user.displayName || user.email || 'שחקן';
        const providerIcons = [
            hasGoogle ? '🔵 Google' : '',
            hasEmail ? '📧 אימייל' : ''
        ].filter(Boolean).join(' + ');

        authUserInfo.innerHTML = `
            <span class="auth-name">${name}</span>
            <span class="auth-providers">${providerIcons}</span>
        `;
        authBtn.innerHTML = '⚙️ חשבון';
        authBtn.onclick = () => showAccountModal();
    } else {
        authUserInfo.innerHTML = '';
        authBtn.innerHTML = '🔐 כניסה';
        authBtn.onclick = () => showAuthModal('login');
    }
}

function showAuthLoading(text) {
    const errEl = document.getElementById('auth-error');
    if (errEl) errEl.style.display = 'none';
    const loadEl = document.getElementById('auth-loading');
    if (loadEl) {
        loadEl.textContent = text;
        loadEl.style.display = 'block';
    }
    // Disable buttons
    document.querySelectorAll('#auth-modal button, #auth-modal input').forEach(el => el.disabled = true);
}

function hideAuthLoading() {
    const loadEl = document.getElementById('auth-loading');
    if (loadEl) loadEl.style.display = 'none';
    document.querySelectorAll('#auth-modal button, #auth-modal input').forEach(el => el.disabled = false);
}

function showAuthError(msg) {
    hideAuthLoading();
    const errEl = document.getElementById('auth-error');
    if (errEl) {
        errEl.textContent = msg;
        errEl.style.display = 'block';
    }
}

export function showAuthNotification(msg, type = 'success') {
    const existing = document.getElementById('auth-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'auth-toast';
    toast.className = `auth-toast auth-toast-${type}`;
    toast.textContent = msg;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('auth-toast-fade');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// ===== MODAL MANAGEMENT =====

export function showAuthModal(mode = 'login') {
    let modal = document.getElementById('auth-modal');
    if (!modal) {
        modal = createAuthModal();
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    setAuthMode(mode);
}

export function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.style.display = 'none';
}

export function showAccountModal() {
    let modal = document.getElementById('auth-modal');
    if (!modal) {
        modal = createAuthModal();
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    setAuthMode('account');
}

function setAuthMode(mode) {
    const user = auth.currentUser;

    document.getElementById('auth-error').style.display = 'none';
    document.getElementById('auth-loading').style.display = 'none';

    const loginView = document.getElementById('auth-view-login');
    const registerView = document.getElementById('auth-view-register');
    const accountView = document.getElementById('auth-view-account');
    const linkEmailView = document.getElementById('auth-view-link-email');

    [loginView, registerView, accountView, linkEmailView].forEach(v => {
        if (v) v.style.display = 'none';
    });

    if (mode === 'login') loginView.style.display = 'block';
    else if (mode === 'register') registerView.style.display = 'block';
    else if (mode === 'account') {
        accountView.style.display = 'block';
        refreshAccountView();
    }
    else if (mode === 'link-email') linkEmailView.style.display = 'block';
}

function refreshAccountView() {
    const user = auth.currentUser;
    if (!user) return;

    const providers = user.providerData.map(p => p.providerId);
    const hasGoogle = providers.includes('google.com');
    const hasEmail = providers.includes('password');

    const nameEl = document.getElementById('account-name');
    const emailEl = document.getElementById('account-email');
    const providersEl = document.getElementById('account-providers');
    const linkGoogleBtn = document.getElementById('link-google-btn');
    const linkEmailBtn = document.getElementById('link-email-btn');

    if (nameEl) nameEl.textContent = user.displayName || '—';
    if (emailEl) emailEl.textContent = user.email || '—';
    if (providersEl) {
        providersEl.innerHTML = [
            hasGoogle ? '<span class="provider-badge google">🔵 Google</span>' : '',
            hasEmail ? '<span class="provider-badge email">📧 אימייל</span>' : ''
        ].filter(Boolean).join('');
    }

    if (linkGoogleBtn) {
        linkGoogleBtn.style.display = hasGoogle ? 'none' : 'block';
    }
    if (linkEmailBtn) {
        linkEmailBtn.style.display = hasEmail ? 'none' : 'block';
    }
}

// ===== CREATE AUTH MODAL DOM =====
function createAuthModal() {
    const modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.className = 'auth-modal-overlay';
    modal.innerHTML = `
        <div class="auth-modal-box">
            <button class="auth-modal-close" onclick="window.authCloseModal()">✕</button>

            <div id="auth-error" class="auth-error" style="display:none;"></div>
            <div id="auth-loading" class="auth-loading" style="display:none;">טוען...</div>

            <!-- LOGIN VIEW -->
            <div id="auth-view-login">
                <h2 class="auth-title">🔐 כניסה</h2>
                <button class="auth-btn-google" onclick="window.authGoogle()">
                    <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/></svg>
                    כניסה עם Google
                </button>
                <div class="auth-divider"><span>או</span></div>
                <input id="login-email" type="email" placeholder="אימייל" class="auth-input" dir="ltr" />
                <input id="login-password" type="password" placeholder="סיסמה" class="auth-input" dir="ltr" />
                <button class="auth-btn-primary" onclick="window.authEmailLogin()">כניסה</button>
                <div class="auth-switch">אין לך חשבון? <a onclick="window.authSetMode('register')">הרשמה</a></div>
            </div>

            <!-- REGISTER VIEW -->
            <div id="auth-view-register" style="display:none;">
                <h2 class="auth-title">📝 הרשמה</h2>
                <button class="auth-btn-google" onclick="window.authGoogle()">
                    <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/></svg>
                    הרשמה עם Google
                </button>
                <div class="auth-divider"><span>או</span></div>
                <input id="register-name" type="text" placeholder="שם (אופציונלי)" class="auth-input" />
                <input id="register-email" type="email" placeholder="אימייל" class="auth-input" dir="ltr" />
                <input id="register-password" type="password" placeholder="סיסמה (מינימום 6 תווים)" class="auth-input" dir="ltr" />
                <button class="auth-btn-primary" onclick="window.authEmailRegister()">הרשמה</button>
                <div class="auth-switch">יש לך כבר חשבון? <a onclick="window.authSetMode('login')">כניסה</a></div>
            </div>

            <!-- ACCOUNT VIEW -->
            <div id="auth-view-account" style="display:none;">
                <h2 class="auth-title">👤 החשבון שלי</h2>
                <div class="account-info">
                    <div class="account-row"><span>שם:</span> <strong id="account-name"></strong></div>
                    <div class="account-row"><span>אימייל:</span> <strong id="account-email"></strong></div>
                    <div class="account-row"><span>מחוברים:</span> <span id="account-providers"></span></div>
                </div>

                <div class="auth-section-title">🔗 קישור חשבונות</div>
                <button id="link-google-btn" class="auth-btn-google" onclick="window.authLinkGoogle()" style="display:none;">
                    <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/></svg>
                    קשר Google לחשבון
                </button>
                <button id="link-email-btn" class="auth-btn-secondary" onclick="window.authSetMode('link-email')" style="display:none;">
                    📧 קשר אימייל וסיסמה
                </button>

                <button class="auth-btn-logout" onclick="window.authLogout()">🚪 התנתק</button>
            </div>

            <!-- LINK EMAIL VIEW -->
            <div id="auth-view-link-email" style="display:none;">
                <h2 class="auth-title">📧 קישור אימייל</h2>
                <p class="auth-subtitle">הוסף כניסה עם אימייל וסיסמה לחשבון שלך</p>
                <input id="link-email-input" type="email" placeholder="אימייל" class="auth-input" dir="ltr" />
                <input id="link-password-input" type="password" placeholder="סיסמה (מינימום 6 תווים)" class="auth-input" dir="ltr" />
                <button class="auth-btn-primary" onclick="window.authLinkEmail()">קשר חשבון</button>
                <div class="auth-switch"><a onclick="window.authSetMode('account')">← חזרה</a></div>
            </div>
        </div>
    `;

    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeAuthModal();
    });

    // Enter key support
    modal.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const loginView = document.getElementById('auth-view-login');
            const registerView = document.getElementById('auth-view-register');
            if (loginView && loginView.style.display !== 'none') window.authEmailLogin();
            else if (registerView && registerView.style.display !== 'none') window.authEmailRegister();
        }
    });

    return modal;
}

// ===== WINDOW EXPORTS (called from modal HTML) =====
window.authGoogle = signInWithGoogle;
window.authLinkGoogle = linkGoogle;
window.authLogout = logOut;
window.authCloseModal = closeAuthModal;
window.authSetMode = setAuthMode;
window.showAuthModal = showAuthModal;

window.authEmailLogin = async () => {
    const email = document.getElementById('login-email')?.value?.trim();
    const password = document.getElementById('login-password')?.value;
    if (!email || !password) { showAuthError('נא מלא אימייל וסיסמה'); return; }
    await signInWithEmail(email, password);
};

window.authEmailRegister = async () => {
    const name = document.getElementById('register-name')?.value?.trim();
    const email = document.getElementById('register-email')?.value?.trim();
    const password = document.getElementById('register-password')?.value;
    if (!email || !password) { showAuthError('נא מלא אימייל וסיסמה'); return; }
    await signUpWithEmail(email, password, name);
};

window.authLinkEmail = async () => {
    const email = document.getElementById('link-email-input')?.value?.trim();
    const password = document.getElementById('link-password-input')?.value;
    if (!email || !password) { showAuthError('נא מלא אימייל וסיסמה'); return; }
    await linkEmail(email, password);
};

// (showAuthModal, closeAuthModal, showAccountModal already exported above as named exports)
