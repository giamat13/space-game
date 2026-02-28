// ===== FIREBASE AUTH MODULE v3 =====

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
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
export let currentUser = null;

// ===== AUTH STATE OBSERVER =====
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        console.log("👤 [AUTH] מחובר:", user.displayName || user.email);
        await syncUserData(user);
        updateAuthUI(user);
        logEvent(analytics, "login", { method: user.providerData[0]?.providerId });
    } else {
        console.log("👤 [AUTH] לא מחובר");
        updateAuthUI(null);
    }
});

// ===== FIRESTORE SYNC =====
async function syncUserData(user) {
    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const data = {
            uid: user.uid,
            email: user.email || null,
            displayName: user.displayName || null,
            providers: user.providerData.map(p => p.providerId),
            lastLogin: serverTimestamp()
        };
        if (!userSnap.exists()) data.createdAt = serverTimestamp();
        await setDoc(userRef, data, { merge: true });
        console.log("✅ [FIRESTORE] נשמר");
    } catch (e) {
        console.error("❌ [FIRESTORE]", e.message);
    }
}

// ===== AUTH ACTIONS =====

export async function signInWithGoogle() {
    try {
        showAuthLoading("מתחבר עם Google...");
        const result = await signInWithPopup(auth, googleProvider);
        closeModal();
        showToast("שלום, " + (result.user.displayName || result.user.email) + "! 👋", "success");
    } catch (error) {
        handleAuthError(error);
    }
}

export async function signUpWithEmail(email, password, displayName) {
    if (!displayName || !displayName.trim()) { showAuthError("שם משתמש הוא שדה חובה"); return; }
    if (!email || !email.trim()) { showAuthError("נא מלא אימייל"); return; }
    if (!password) { showAuthError("נא מלא סיסמה"); return; }
    try {
        showAuthLoading("יוצר חשבון...");
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: displayName.trim() });
        closeModal();
        showToast("ברוך הבא, " + displayName.trim() + "! 🎉", "success");
        logEvent(analytics, "sign_up", { method: "email" });
    } catch (error) {
        handleAuthError(error);
    }
}

export async function signInWithEmail(email, password) {
    if (!email || !email.trim() || !password) { showAuthError("נא מלא אימייל וסיסמה"); return; }
    try {
        showAuthLoading("מתחבר...");
        await signInWithEmailAndPassword(auth, email, password);
        closeModal();
        showToast("ברוך הבא! 👋", "success");
        logEvent(analytics, "login", { method: "email" });
    } catch (error) {
        handleAuthError(error);
    }
}

export async function linkGoogle() {
    if (!currentUser) return;
    try {
        showAuthLoading("מקשר עם Google...");
        await linkWithPopup(currentUser, googleProvider);
        await syncUserData(auth.currentUser);
        closeModal();
        showToast("חשבון Google קושר! 🔗", "success");
        updateAuthUI(auth.currentUser);
        logEvent(analytics, "link_account", { method: "google" });
    } catch (error) {
        handleAuthError(error);
    }
}

export async function linkEmailPassword(email, password) {
    if (!currentUser) return;
    if (!email || !email.trim() || !password) { showAuthError("נא מלא אימייל וסיסמה"); return; }
    try {
        showAuthLoading("מקשר אימייל...");
        const credential = EmailAuthProvider.credential(email, password);
        await linkWithCredential(currentUser, credential);
        await syncUserData(auth.currentUser);
        closeModal();
        showToast("אימייל קושר! 🔗", "success");
        updateAuthUI(auth.currentUser);
        logEvent(analytics, "link_account", { method: "email" });
    } catch (error) {
        handleAuthError(error);
    }
}

export async function logOut() {
    try {
        closeModal();
        await signOut(auth);
        showToast("התנתקת בהצלחה 👋", "info");
        logEvent(analytics, "logout");
    } catch (error) {
        console.error("❌ [AUTH] שגיאת התנתקות:", error);
    }
}

// ===== ERROR HANDLER =====
function handleAuthError(error) {
    hideAuthLoading();
    const messages = {
        "auth/email-already-in-use": "האימייל הזה כבר בשימוש",
        "auth/weak-password": "הסיסמה חלשה מדי (מינימום 6 תווים)",
        "auth/invalid-email": "כתובת אימייל לא תקינה",
        "auth/user-not-found": "משתמש לא נמצא",
        "auth/wrong-password": "סיסמה שגויה",
        "auth/invalid-credential": "אימייל או סיסמה שגויים",
        "auth/popup-closed-by-user": null,
        "auth/provider-already-linked": "ספק זה כבר מקושר לחשבון",
        "auth/credential-already-in-use": "פרטים אלו כבר בשימוש בחשבון אחר",
        "auth/too-many-requests": "יותר מדי ניסיונות, נסה שוב מאוחר יותר",
        "auth/network-request-failed": "שגיאת רשת",
    };
    const msg = messages[error.code];
    if (msg === null) return;
    showAuthError(msg || "שגיאה: " + error.code);
    console.error("❌ [AUTH]", error.code);
}

// ===== AUTH BAR UI =====
function updateAuthUI(user) {
    const authBtn = document.getElementById("auth-btn");
    const authUserInfo = document.getElementById("auth-user-info");
    if (!authBtn) return;

    if (user) {
        const providers = user.providerData.map(p => p.providerId);
        const hasGoogle = providers.includes("google.com");
        const hasEmail = providers.includes("password");
        const name = user.displayName || user.email || "שחקן";
        const icons = [hasGoogle ? "🔵" : "", hasEmail ? "📧" : ""].filter(Boolean).join(" ");
        if (authUserInfo) authUserInfo.innerHTML =
            "<span class=\"auth-name\">" + name + "</span><span class=\"auth-providers\">" + icons + "</span>";
        authBtn.textContent = "⚙️ חשבון";
        authBtn.onclick = () => openModal("account");
    } else {
        if (authUserInfo) authUserInfo.innerHTML = "";
        authBtn.textContent = "🔐 כניסה";
        authBtn.onclick = () => openModal("login");
    }
}

// ===== MODAL =====
function getModal() { return document.getElementById("auth-modal"); }

function ensureModal() {
    let modal = getModal();
    if (!modal) { modal = buildModal(); document.body.appendChild(modal); }
    return modal;
}

export function openModal(mode) {
    if (!mode) mode = "login";
    const modal = ensureModal();
    modal.style.display = "flex";
    switchView(mode);
}

export function closeModal() {
    const modal = getModal();
    if (modal) modal.style.display = "none";
}

export const showAuthModal = openModal;
export const closeAuthModal = closeModal;

function switchView(mode) {
    const errEl = document.getElementById("auth-error");
    const loadEl = document.getElementById("auth-loading");
    if (errEl) { errEl.style.display = "none"; errEl.textContent = ""; }
    if (loadEl) loadEl.style.display = "none";

    ["login", "register", "account", "link-email"].forEach(v => {
        const el = document.getElementById("auth-view-" + v);
        if (el) el.style.display = "none";
    });

    const target = document.getElementById("auth-view-" + mode);
    if (target) target.style.display = "block";
    if (mode === "account") refreshAccountView();
}

function refreshAccountView() {
    const user = auth.currentUser;
    if (!user) return;
    const providers = user.providerData.map(p => p.providerId);
    const hasGoogle = providers.includes("google.com");
    const hasEmail = providers.includes("password");

    const nameEl = document.getElementById("account-name");
    const emailEl = document.getElementById("account-email");
    const providersEl = document.getElementById("account-providers");
    const linkGoogleBtn = document.getElementById("link-google-btn");
    const linkEmailBtn = document.getElementById("link-email-btn");

    if (nameEl) nameEl.textContent = user.displayName || "—";
    if (emailEl) emailEl.textContent = user.email || "—";
    if (providersEl) {
        const badges = [];
        if (hasGoogle) badges.push("<span class=\"provider-badge google\">🔵 Google</span>");
        if (hasEmail) badges.push("<span class=\"provider-badge email\">📧 אימייל</span>");
        providersEl.innerHTML = badges.join("");
    }
    if (linkGoogleBtn) linkGoogleBtn.style.display = hasGoogle ? "none" : "flex";
    if (linkEmailBtn) linkEmailBtn.style.display = hasEmail ? "none" : "block";
}

// ===== LOADING/ERROR =====
function showAuthLoading(text) {
    const errEl = document.getElementById("auth-error");
    const loadEl = document.getElementById("auth-loading");
    if (errEl) errEl.style.display = "none";
    if (loadEl) { loadEl.textContent = text; loadEl.style.display = "block"; }
    document.querySelectorAll("#auth-modal button, #auth-modal input").forEach(el => el.disabled = true);
}
function hideAuthLoading() {
    const loadEl = document.getElementById("auth-loading");
    if (loadEl) loadEl.style.display = "none";
    document.querySelectorAll("#auth-modal button, #auth-modal input").forEach(el => el.disabled = false);
}
function showAuthError(msg) {
    hideAuthLoading();
    const errEl = document.getElementById("auth-error");
    if (errEl) { errEl.textContent = msg; errEl.style.display = "block"; }
}

// ===== TOAST =====
export function showToast(msg, type) {
    if (!type) type = "success";
    const existing = document.getElementById("auth-toast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.id = "auth-toast";
    toast.className = "auth-toast auth-toast-" + type;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function() {
        toast.classList.add("auth-toast-fade");
        setTimeout(function() { toast.remove(); }, 500);
    }, 3000);
}
export const showAuthNotification = showToast;

// ===== BUILD MODAL =====
const GOOGLE_SVG = "<svg width=\"18\" height=\"18\" viewBox=\"0 0 18 18\"><path fill=\"#4285F4\" d=\"M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z\"/><path fill=\"#34A853\" d=\"M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z\"/><path fill=\"#FBBC05\" d=\"M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z\"/><path fill=\"#EA4335\" d=\"M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z\"/></svg>";

function buildModal() {
    const modal = document.createElement("div");
    modal.id = "auth-modal";
    modal.className = "auth-modal-overlay";
    modal.innerHTML = `
        <div class="auth-modal-box">
            <button class="auth-modal-close" id="auth-modal-close-btn">✕</button>
            <div id="auth-error" class="auth-error" style="display:none;"></div>
            <div id="auth-loading" class="auth-loading" style="display:none;">טוען...</div>

            <div id="auth-view-login">
                <h2 class="auth-title">🔐 כניסה</h2>
                <button class="auth-btn-google" id="btn-google-login">${GOOGLE_SVG} כניסה עם Google</button>
                <div class="auth-divider"><span>או</span></div>
                <input id="login-email" type="email" placeholder="אימייל" class="auth-input" dir="ltr" />
                <input id="login-password" type="password" placeholder="סיסמה" class="auth-input" dir="ltr" />
                <button class="auth-btn-primary" id="btn-email-login">כניסה</button>
                <div class="auth-switch">אין לך חשבון? <a id="switch-to-register" style="cursor:pointer;">הרשמה</a></div>
            </div>

            <div id="auth-view-register" style="display:none;">
                <h2 class="auth-title">📝 הרשמה</h2>
                <button class="auth-btn-google" id="btn-google-register">${GOOGLE_SVG} הרשמה עם Google</button>
                <div class="auth-divider"><span>או</span></div>
                <input id="register-name" type="text" placeholder="שם משתמש *" class="auth-input" />
                <input id="register-email" type="email" placeholder="אימייל" class="auth-input" dir="ltr" />
                <input id="register-password" type="password" placeholder="סיסמה (מינימום 6 תווים)" class="auth-input" dir="ltr" />
                <button class="auth-btn-primary" id="btn-email-register">הרשמה</button>
                <div class="auth-switch">יש לך כבר חשבון? <a id="switch-to-login" style="cursor:pointer;">כניסה</a></div>
            </div>

            <div id="auth-view-account" style="display:none;">
                <h2 class="auth-title">👤 החשבון שלי</h2>
                <div class="account-info">
                    <div class="account-row"><span>שם:</span> <strong id="account-name"></strong></div>
                    <div class="account-row"><span>אימייל:</span> <strong id="account-email"></strong></div>
                    <div class="account-row"><span>מחוברים:</span> <span id="account-providers"></span></div>
                </div>
                <div class="auth-section-title">🔗 קישור חשבונות</div>
                <button id="link-google-btn" class="auth-btn-google" style="display:none;">${GOOGLE_SVG} קשר Google לחשבון</button>
                <button id="link-email-btn" class="auth-btn-secondary" style="display:none;">📧 קשר אימייל וסיסמה</button>
                <button id="btn-logout" class="auth-btn-logout">🚪 התנתק</button>
            </div>

            <div id="auth-view-link-email" style="display:none;">
                <h2 class="auth-title">📧 קישור אימייל</h2>
                <p class="auth-subtitle">הוסף כניסה עם אימייל וסיסמה לחשבון שלך</p>
                <input id="link-email-input" type="email" placeholder="אימייל" class="auth-input" dir="ltr" />
                <input id="link-password-input" type="password" placeholder="סיסמה (מינימום 6 תווים)" class="auth-input" dir="ltr" />
                <button class="auth-btn-primary" id="btn-link-email">קשר חשבון</button>
                <div class="auth-switch"><a id="back-to-account" style="cursor:pointer;">← חזרה</a></div>
            </div>
        </div>
    `;

    modal.querySelector("#auth-modal-close-btn").addEventListener("click", closeModal);
    modal.addEventListener("click", function(e) { if (e.target === modal) closeModal(); });

    modal.querySelector("#btn-google-login").addEventListener("click", signInWithGoogle);
    modal.querySelector("#btn-google-register").addEventListener("click", signInWithGoogle);

    modal.querySelector("#btn-email-login").addEventListener("click", function() {
        var email = modal.querySelector("#login-email").value.trim();
        var password = modal.querySelector("#login-password").value;
        signInWithEmail(email, password);
    });

    modal.querySelector("#btn-email-register").addEventListener("click", function() {
        var name = modal.querySelector("#register-name").value.trim();
        var email = modal.querySelector("#register-email").value.trim();
        var password = modal.querySelector("#register-password").value;
        signUpWithEmail(email, password, name);
    });

    modal.querySelector("#switch-to-register").addEventListener("click", function() { switchView("register"); });
    modal.querySelector("#switch-to-login").addEventListener("click", function() { switchView("login"); });

    modal.querySelector("#link-google-btn").addEventListener("click", linkGoogle);
    modal.querySelector("#link-email-btn").addEventListener("click", function() { switchView("link-email"); });

    modal.querySelector("#btn-logout").addEventListener("click", logOut);

    modal.querySelector("#btn-link-email").addEventListener("click", function() {
        var email = modal.querySelector("#link-email-input").value.trim();
        var password = modal.querySelector("#link-password-input").value;
        linkEmailPassword(email, password);
    });
    modal.querySelector("#back-to-account").addEventListener("click", function() { switchView("account"); });

    modal.addEventListener("keydown", function(e) {
        if (e.key !== "Enter") return;
        var loginView = modal.querySelector("#auth-view-login");
        var registerView = modal.querySelector("#auth-view-register");
        if (loginView && loginView.style.display !== "none") modal.querySelector("#btn-email-login").click();
        else if (registerView && registerView.style.display !== "none") modal.querySelector("#btn-email-register").click();
    });

    return modal;
}

window.showAuthModal = openModal;
window.closeAuthModal = closeModal;
