// ===== FIREBASE AUTH SYSTEM =====
// Google & Email/Password login + Account Linking
// ⚠️ NO STORAGE USED - 100% FREE! ⚠️
// Profile images come directly from Google (photoURL) - not from Firebase Storage

import { t } from './i18n.js';
import { releaseLocalProgress } from './account-data.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    linkWithCredential,
    EmailAuthProvider,
    updateProfile,
    fetchSignInMethodsForEmail,
    deleteUser,
    reauthenticateWithPopup,
    reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDiV4TU6uwOHBX3T4DECM51OZWwPNSZIdw",
    authDomain: "space-game-ii.firebaseapp.com",
    projectId: "space-game-ii",
    storageBucket: "space-game-ii.firebasestorage.app",
    messagingSenderId: "972181615049",
    appId: "1:972181615049:web:1e7790e50c1507c76cb818",
    measurementId: "G-KDX7TXWLFL"
};

// ===== KEEP THE SIGN-IN AWAY FROM THE WARP STORAGE PROXY =====
// firebase-ls-proxy.js (loaded after this file) replaces window.localStorage with an in-memory
// copy. Its copy starts empty (it reads window._realLS before setting it) and is synced to another
// project, so Firebase could read its own sign-in keys as missing and sign the player out.
// Here window._realLS returns the real storage from the start (so the proxy's copy starts full),
// and once the proxy is in place, keys starting with "firebase:" always go to the real storage.
(function guardAuthStorage() {
    let real;
    try { real = window.localStorage; } catch { return; }
    if (!real || Object.getOwnPropertyDescriptor(window, '_realLS')) return;
    let stored = real;
    const own = (k) => typeof k === 'string' && k.startsWith('firebase:');
    function wrapProxy() {
        let proxy;
        try { proxy = window.localStorage; } catch { return; }
        if (!proxy || proxy === real || proxy.__authGuard) return;
        const wrapped = {
            __authGuard: true,
            getItem: (k) => own(k) ? real.getItem(k) : proxy.getItem(k),
            setItem: (k, v) => own(k) ? real.setItem(k, v) : proxy.setItem(k, v),
            removeItem: (k) => own(k) ? real.removeItem(k) : proxy.removeItem(k),
            clear: () => proxy.clear(),
            key: (i) => proxy.key(i),
            get length() { return proxy.length; }
        };
        Object.defineProperty(window, 'localStorage', { configurable: true, get: () => wrapped });
    }
    Object.defineProperty(window, '_realLS', {
        configurable: true,
        get: () => stored,
        // The proxy sets _realLS and then, in the same task, replaces localStorage.
        set(v) { stored = v || real; queueMicrotask(wrapProxy); }
    });
})();

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// ===== STATE =====
export let currentUser = null;
export let isAuthenticated = false;

// ===== AUTH STATE LISTENER =====
export function initAuth() {
    console.log('🔐 [AUTH] Initializing authentication...');
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('✅ [AUTH] User logged in:', user.email);
            currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                photoURL: user.photoURL,
                providers: user.providerData.map(p => p.providerId)
            };
            isAuthenticated = true;
            
            // Update UI to show logged in status, but don't force profile screen
            updateLoginButton();
        } else {
            console.log('❌ [AUTH] No user logged in');
            currentUser = null;
            isAuthenticated = false;
            updateLoginButton();
        }
    });
}

// ===== GOOGLE SIGN IN =====
export async function signInWithGoogle() {
    console.log('🔵 [GOOGLE] Attempting Google sign-in...');
    
    try {
        const result = await signInWithPopup(auth, googleProvider);
        console.log('✅ [GOOGLE] Successfully signed in with Google:', result.user.email);
        showMessage(t('authLoginOk'), 'success');
        
        // Return to main menu after a short delay
        setTimeout(() => {
            showMainMenu();
        }, 800);
        
        return result.user;
    } catch (error) {
        console.error('❌ [GOOGLE] Error during Google sign-in:', error);
        handleAuthError(error);
        return null;
    }
}

// ===== EMAIL/PASSWORD SIGN UP =====
export async function signUpWithEmail(email, password, displayName) {
    console.log('📧 [SIGNUP] Attempting email signup for:', email);
    
    try {
        // Check if email already exists
        const signInMethods = await fetchSignInMethodsForEmail(auth, email);

        if (signInMethods.length > 0) {
            console.log('⚠️ [SIGNUP] Email already exists with providers:', signInMethods);

            // If Google account exists, offer to link
            if (signInMethods.includes('google.com')) {
                showMessage(t('authExistsGoogle'), 'info');

                // Try to sign in with Google then link
                const googleResult = await signInWithPopup(auth, googleProvider);

                if (googleResult.user.email === email) {
                    // Now link the email/password
                    const credential = EmailAuthProvider.credential(email, password);
                    await linkWithCredential(googleResult.user, credential);

                    showMessage(t('authLinked'), 'success');

                    // Return to main menu
                    setTimeout(() => {
                        showMainMenu();
                    }, 800);

                    return googleResult.user;
                }
            }

            // If password method exists, suggest signing in instead
            if (signInMethods.includes('password')) {
                showMessage(t('authEmailRegistered'), 'warning');
                return null;
            }
        }

        // Names are unique: check before the account is created
        const cloud = await import('./cloud-sync.js');
        if (displayName) {
            let status;
            try { status = await cloud.checkName(displayName); } catch { status = 'error'; }
            if (status === 'taken') { showMessage(t('nameTaken'), 'error'); return null; }
            if (status === 'error') { showMessage(t('nameCheckErr'), 'error'); return null; }
        }

        // Create new account
        const result = await createUserWithEmailAndPassword(auth, email, password);
        console.log('✅ [SIGNUP] Successfully created account:', email);

        // Update display name
        if (displayName) {
            await cloud.claimName(displayName);
            await updateProfile(result.user, { displayName });
            console.log('✅ [SIGNUP] Updated display name to:', displayName);
        }

        showMessage(t('authSignupOk'), 'success');
        
        // Return to main menu
        setTimeout(() => {
            showMainMenu();
        }, 800);
        
        return result.user;
    } catch (error) {
        console.error('❌ [SIGNUP] Error during email signup:', error);
        handleAuthError(error);
        return null;
    }
}

// ===== EMAIL/PASSWORD SIGN IN =====
export async function signInWithEmail(email, password) {
    console.log('📧 [LOGIN] Attempting email sign-in for:', email);
    
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        console.log('✅ [LOGIN] Successfully signed in:', email);
        showMessage(t('authLoginOk'), 'success');
        
        // Return to main menu
        setTimeout(() => {
            showMainMenu();
        }, 800);
        
        return result.user;
    } catch (error) {
        console.error('❌ [LOGIN] Error during email sign-in:', error);
        handleAuthError(error);
        return null;
    }
}

// ===== LINK GOOGLE TO EMAIL ACCOUNT =====
export async function linkGoogleAccount() {
    console.log('🔗 [LINK] Attempting to link Google account...');
    
    if (!currentUser) {
        showMessage(t('authNeedLogin'), 'warning');
        return;
    }
    
    try {
        const result = await signInWithPopup(auth, googleProvider);
        console.log('✅ [LINK] Successfully linked Google account');
        showMessage(t('authGoogleLinked'), 'success');
        return result.user;
    } catch (error) {
        console.error('❌ [LINK] Error linking Google account:', error);
        handleAuthError(error);
        return null;
    }
}

// ===== SIGN OUT =====
export async function logout() {
    console.log('🚪 [LOGOUT] Signing out...');

    try {
        await signOut(auth);
        // Progress kept on this device belongs to the account just signed out
        releaseLocalProgress();
        console.log('✅ [LOGOUT] Successfully signed out');
        showMessage(t('authLogoutOk'), 'info');

        // Reload so no in-memory state from the previous account survives
        setTimeout(() => {
            window.location.reload();
        }, 800);
    } catch (error) {
        console.error('❌ [LOGOUT] Error during sign out:', error);
        showMessage(t('authLogoutErr'), 'error');
    }
}

// ===== DELETE ACCOUNT AND ALL DATA =====
export async function deleteAccountAndData() {
    const user = auth.currentUser;
    if (!user) {
        showMessage(t('authNeedLogin'), 'warning');
        return false;
    }
    if (!confirm(t('deleteAccountConfirm'))) return false;

    // Deleting an account needs a fresh sign-in
    try {
        if (user.providerData.some(p => p.providerId === 'google.com')) {
            await reauthenticateWithPopup(user, googleProvider);
        } else {
            const password = prompt(t('deleteAccountPassword'));
            if (!password) return false;
            await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
        }
    } catch (error) {
        console.error('❌ [DELETE] Re-authentication failed:', error);
        handleAuthError(error);
        return false;
    }

    try {
        const { deleteCloudDataForUser } = await import('./cloud-sync.js');
        const { failed } = await deleteCloudDataForUser(user.uid);
        await deleteUser(user);
        releaseLocalProgress();
        console.log(`✅ [DELETE] Account deleted (${failed} cloud deletes failed)`);
        showMessage(t(failed ? 'deleteAccountPartial' : 'deleteAccountOk'), failed ? 'warning' : 'success');
        setTimeout(() => {
            window.location.reload();
        }, 1500);
        return true;
    } catch (error) {
        console.error('❌ [DELETE] Error deleting account:', error);
        showMessage(t('deleteAccountErr'), 'error');
        return false;
    }
}

// ===== UPDATE DISPLAY NAME =====
export async function updateDisplayName(newName) {
    console.log('✏️ [PROFILE] Updating display name to:', newName);

    if (!auth.currentUser) {
        showMessage(t('authNeedLogin'), 'warning');
        return false;
    }

    try {
        // Names are unique: the new one must be free (or already this account's).
        const cloud = await import('./cloud-sync.js');
        const claim = await cloud.claimName(newName, auth.currentUser.displayName);
        if (claim === 'taken') { showMessage(t('nameTaken'), 'error'); return false; }
        if (claim === 'error') { showMessage(t('nameCheckErr'), 'error'); return false; }
        await updateProfile(auth.currentUser, { displayName: newName });
        currentUser.displayName = newName;
        cloud.renameInLeaderboards(newName).catch(() => {});
        console.log('✅ [PROFILE] Display name updated successfully');
        showMessage(t('authNameUpdated'), 'success');
        return true;
    } catch (error) {
        console.error('❌ [PROFILE] Error updating display name:', error);
        showMessage(t('authNameErr'), 'error');
        return false;
    }
}

// ===== UI FUNCTIONS =====
function updateLoginButton() {
    const loginBtn = document.getElementById('login-button');
    if (!loginBtn) return;
    
    if (isAuthenticated && currentUser) {
        // User is logged in - show profile button
        loginBtn.innerHTML = `<span style="font-size: 1.2rem;">👤</span> ${currentUser.displayName}`;
        loginBtn.style.background = 'rgba(0, 242, 255, 0.2)';
        loginBtn.style.borderColor = 'var(--primary)';
        loginBtn.style.color = 'var(--primary)';
    } else {
        // User is not logged in - show login button
        loginBtn.innerHTML = t('loginBtn');
        loginBtn.style.background = 'rgba(255, 215, 0, 0.2)';
        loginBtn.style.borderColor = '#ffd700';
        loginBtn.style.color = '#ffd700';
    }
}

function showLoginScreen() {
    console.log('🔐 [UI] Showing login screen');
    document.getElementById('overlay').style.display = 'flex';
    document.getElementById('auth-container').style.display = 'block';
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('user-profile').style.display = 'none';
}

function showAuthenticatedUI() {
    console.log('✅ [UI] Showing authenticated UI');
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('user-profile').style.display = 'block';
    updateUserProfile();
}

function updateUserProfile() {
    if (!currentUser) return;
    
    console.log('👤 [UI] Updating user profile display');
    document.getElementById('user-name').textContent = currentUser.displayName;
    document.getElementById('user-email').textContent = currentUser.email;
    
    // Update profile icon
    const userIcon = document.getElementById('user-icon');
    if (currentUser.photoURL) {
        userIcon.innerHTML = `<img src="${currentUser.photoURL}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%;">`;
    } else {
        userIcon.innerHTML = '👤';
    }

    // Show login providers
    const providersDiv = document.getElementById('user-providers');
    providersDiv.innerHTML = currentUser.providers.map(p => {
        if (p === 'google.com') return '🔵 Google';
        if (p === 'password') return '📧 Email/Password';
        return p;
    }).join(' • ');
}

// ===== ERROR HANDLING =====
function handleAuthError(error) {
    console.error('❌ [ERROR]', error.code, error.message);
    
    const errorMessages = {
        'auth/email-already-in-use': t('authErrInUse'),
        'auth/weak-password': t('authErrWeak'),
        'auth/invalid-email': t('authErrEmail'),
        'auth/user-not-found': t('authErrNoUser'),
        'auth/wrong-password': t('authErrWrongPw'),
        'auth/popup-closed-by-user': t('authErrPopup'),
        'auth/account-exists-with-different-credential': t('authErrDiffCred'),
        'auth/credential-already-in-use': t('authErrCredUsed')
    };

    const message = errorMessages[error.code] || t('authErrUnknown');
    showMessage(message, 'error');
}

// ===== MESSAGE DISPLAY =====
function showMessage(text, type = 'info') {
    const colors = {
        success: '#2ecc71',
        error: '#ff4d4d',
        warning: '#ff9900',
        info: '#00f2ff'
    };
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'auth-message';
    messageDiv.textContent = text;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${colors[type]};
        color: ${type === 'success' || type === 'error' ? 'white' : 'black'};
        padding: 15px 30px;
        border-radius: 10px;
        font-weight: bold;
        z-index: 10000;
        animation: slideDown 0.3s ease-out;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.animation = 'slideUp 0.3s ease-in';
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}

// ===== GLOBAL FUNCTIONS =====
window.signInWithGoogle = signInWithGoogle;
window.signUpWithEmail = () => {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const displayName = document.getElementById('signup-name').value;
    
    if (!email || !password || !displayName) {
        showMessage(t('authFillAll'), 'warning');
        return;
    }
    
    signUpWithEmail(email, password, displayName);
};

window.signInWithEmail = () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showMessage(t('authFillEmailPw'), 'warning');
        return;
    }
    
    signInWithEmail(email, password);
};

window.logout = logout;
window.deleteAccountAndData = deleteAccountAndData;
window.linkGoogleAccount = linkGoogleAccount;
window.toggleLoginMenu = () => {
    console.log('🔐 [UI] Toggle login menu, authenticated:', isAuthenticated);
    document.getElementById('overlay').style.display = 'flex';
    
    if (isAuthenticated) {
        // Show profile screen
        document.getElementById('user-profile').style.display = 'block';
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('leaderboard-container').style.display = 'none';
        document.getElementById('settings-container').style.display = 'none';
        updateUserProfile();
    } else {
        // Show login screen
        document.getElementById('auth-container').style.display = 'block';
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('user-profile').style.display = 'none';
        document.getElementById('leaderboard-container').style.display = 'none';
        document.getElementById('settings-container').style.display = 'none';
    }
};
window.editDisplayName = () => {
    const newName = prompt(t('authNewName'), currentUser.displayName);
    if (newName && newName.trim()) {
        updateDisplayName(newName.trim());
    }
};

window.toggleAuthMode = (mode) => {
    document.getElementById('login-form').style.display = mode === 'login' ? 'block' : 'none';
    document.getElementById('signup-form').style.display = mode === 'signup' ? 'block' : 'none';
};

window.showMainMenu = () => {
    console.log('🏠 [UI] Showing main menu');
    document.getElementById('overlay').style.display = 'flex';
    document.getElementById('user-profile').style.display = 'none';
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('leaderboard-container').style.display = 'none';
    document.getElementById('settings-container').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
};

// ===== ANIMATIONS =====
const style = document.createElement('style');
style.textContent = `
@keyframes slideDown {
    from { transform: translate(-50%, -100%); opacity: 0; }
    to { transform: translate(-50%, 0); opacity: 1; }
}
@keyframes slideUp {
    from { transform: translate(-50%, 0); opacity: 1; }
    to { transform: translate(-50%, -100%); opacity: 0; }
}
`;
document.head.appendChild(style);

// ===== EXPORT =====
export { auth };
