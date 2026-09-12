import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";
import { auth } from "./firebase";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account"
});

/**
 * Autentica al usuario con Google Institucional (Gmail / Google Workspace @doctorsv...)
 */
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      },
    };
  } catch (error) {
    console.warn("Google Auth error:", error);
    return {
      success: false,
      code: error.code || "auth/unknown",
      error: error.code || error.message,
    };
  }
}

/**
 * Autentica un usuario con email y contraseña
 */
export async function authenticateWithFirebase(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.code || error.message };
  }
}

/**
 * Cierra la sesión activa en Firebase Auth
 */
export async function logoutFromFirebase() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Escucha cambios en el estado de autenticación de Firebase
 */
export function subscribeToAuthChanges(callback) {
  return onAuthStateChanged(auth, callback);
}
