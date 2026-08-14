import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, setPersistence, inMemoryPersistence } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

// Replace these placeholders with your credentials from the Firebase Console (Web App settings)
const firebaseConfig = {
  apiKey: "AIzaSyBYoCfxpCxOpJL5hTwHN-hNhV2VX6X_wG4",
  authDomain: "adyber-d615d.firebaseapp.com",
  projectId: "adyber-d615d",
  storageBucket: "adyber-d615d.firebasestorage.app",
  messagingSenderId: "141683115767",
  appId: "1:141683115767:web:cb52c06b591a06baef75f2",
  measurementId: "G-Q3RJGHL2GG"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Use in-memory persistence so Firebase does NOT cache the auth token across
// app restarts. Sign-out is permanent — restarting the app always requires
// a fresh sign-in, matching what the user expects from a desktop app.
setPersistence(auth, inMemoryPersistence).catch(err =>
  console.error("[Firebase] Failed to set auth persistence:", err)
);

export const saveUserToFirebase = async (userData) => {
  if (!userData || !userData.uid) return;
  try {
    await setDoc(doc(db, "users", userData.uid), {
      uid: userData.uid,
      name: userData.name || userData.displayName || '',
      email: userData.email || '',
      photoURL: userData.photoURL || '',
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log("[Firebase] User saved to Firestore 'users' table:", userData.email);
  } catch (error) {
    console.error("[Firebase] Error saving user to Firestore:", error);
  }
};

export const saveUserDataToFirebase = async (uid, data) => {
  if (!uid) return;
  try {
    await setDoc(doc(db, "users", uid), {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log("[Firebase] Cloud synced user profile & memory to Firestore for UID:", uid);
  } catch (error) {
    console.error("[Firebase] Error saving user cloud data:", error);
  }
};

export const getUserDataFromFirebase = async (uid) => {
  if (!uid) return null;
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error("[Firebase] Error fetching user cloud data:", error);
    return null;
  }
};

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const userPayload = {
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      photoURL: user.photoURL
    };
    await saveUserToFirebase(userPayload);
    return {
      success: true,
      user: userPayload
    };
  } catch (error) {
    console.error("Firebase Google Auth Error:", error);
    return { success: false, error: error.message };
  }
};

export const logoutFromFirebase = async () => {
  try {
    await signOut(auth);
    console.log("[Firebase] Successfully signed out user from Firebase Auth.");
  } catch (error) {
    console.error("[Firebase] Sign out error:", error);
  }
};
