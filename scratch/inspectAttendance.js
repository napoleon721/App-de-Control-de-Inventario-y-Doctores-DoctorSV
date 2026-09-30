import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import fs from "fs";

const envText = fs.readFileSync(".env", "utf8");
const env = {};
envText.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const [key, ...rest] = trimmed.split("=");
    if (key && rest.length > 0) {
      env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }
});

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const attSnap = await getDoc(doc(db, "sedes", "san-miguel", "estado", "attendance"));
  if (attSnap.exists()) {
    const data = attSnap.data();
    console.log("Firestore Attendance data count:", Object.keys(data.records || {}).length);
    const present = Object.entries(data.records || {}).filter(([k, v]) => v === "PRESENTE");
    console.log("Present doctors in Firestore:", present);
  } else {
    console.log("Attendance doc does not exist");
  }

  const spacesSnap = await getDoc(doc(db, "sedes", "san-miguel", "estado", "spaces"));
  if (spacesSnap.exists()) {
    const spaces = spacesSnap.data().list || [];
    const occupied = spaces.filter((s) => s.estado === "OCUPADO" || s.doctor);
    console.log("Occupied spaces in Firestore count:", occupied.length);
    const lotEmerson = spaces.filter((s) => s.id >= 37 && s.id <= 76);
    console.log("Emerson lot 37-76 occupied count:", lotEmerson.filter(s => s.doctor || s.estado === "OCUPADO").length);
  }
}

check().catch(console.error);
