// ===== OLD FIRESTORE DATA (read-only archive) =====
// The game used to keep everything in Firestore. All of it was copied to the Realtime
// Database (see cloud-sync.js), and Firestore no longer accepts new writes. This file is
// only loaded in two rare cases:
//   - a player with no Realtime Database profile yet signs in: their old Firestore profile
//     (if any) is read ONCE and merged, so nothing written by an old version is lost;
//   - an account is deleted: its old Firestore documents are deleted too.
import {
    getFirestore, doc, getDoc, getDocs, deleteDoc, collection, query, where
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";

const fsdb = () => getFirestore(getApp());

// Returns the old users/{uid} document as plain data, {} when there is none.
// Throws when Firestore cannot be reached (the caller then tries again next time).
export async function readLegacyProfile(uid) {
    const snap = await getDoc(doc(fsdb(), 'users', uid));
    return snap.exists() ? snap.data() : {};
}

// Deletes every old Firestore document this account owns. Refused deletes are counted.
export async function deleteLegacyData(uid, skinKeys, goalKeys) {
    const db = fsdb();
    let failed = 0;
    const removeDoc = async (ref) => {
        try { await deleteDoc(ref); }
        catch (e) { failed++; console.warn('⚠️ [DELETE] Could not delete', ref.path, e.code || e); }
    };
    const removeMatching = async (colRef) => {
        try {
            const snap = await getDocs(query(colRef, where('userId', '==', uid)));
            for (const d of snap.docs) await removeDoc(d.ref);
        } catch (e) { failed++; console.warn('⚠️ [DELETE] Could not list', colRef.path, e.code || e); }
    };

    await removeDoc(doc(db, 'users', uid));
    await removeDoc(doc(db, 'userStats', uid));
    await removeDoc(doc(db, 'moneyLeaderboard', uid));
    await removeDoc(doc(db, 'leaderboard', uid));
    await removeDoc(doc(db, 'leaderboard', uid + '_alt'));
    for (const skin of skinKeys) {
        await removeDoc(doc(db, `scores/${skin}/entries/${uid}`));
        await removeMatching(collection(db, 'scores', skin, 'entries'));
        await removeMatching(collection(db, 'runs', skin, 'entries'));
    }
    await removeMatching(collection(db, 'runs', 'all', 'entries'));
    for (const key of goalKeys) {
        await removeDoc(doc(db, `speedrun/${key}/entries/${uid}`));
        await removeMatching(collection(db, 'speedrunRuns', key, 'entries'));
    }
    await removeMatching(collection(db, 'game_sessions'));
    try {
        const sessions = await getDocs(query(collection(db, 'gameSessions'), where('userId', '==', uid)));
        for (const s of sessions.docs) {
            try {
                const logs = await getDocs(collection(db, 'gameSessions', s.id, 'logs'));
                for (const l of logs.docs) await removeDoc(l.ref);
            } catch (e) { failed++; }
            await removeDoc(s.ref);
        }
    } catch (e) { failed++; }
    try {
        const analytics = await getDocs(collection(db, 'userAnalytics', uid, 'sessions'));
        for (const a of analytics.docs) await removeDoc(a.ref);
    } catch (e) { failed++; }
    return { failed };
}
