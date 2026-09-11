import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAF6B50R9QMRV5HJrAP-dLD8XAroShgIrg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "db-doctorsv-c3a80.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "db-doctorsv-c3a80",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "db-doctorsv-c3a80.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "253355215710",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:253355215710:web:62477bb8f95bd404121dcf",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-3KQMDRJ9NQ",
};

// Inicialización de la aplicación Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
