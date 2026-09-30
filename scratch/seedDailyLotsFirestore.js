import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from "fs";
import { DEFAULT_DAILY_LOTS } from "../src/utils/dailyLotsParser.js";

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

async function seed() {
  const docRef = doc(db, "sedes", "san-miguel", "estado", "dailyLots");
  await setDoc(docRef, {
    dailyLots: DEFAULT_DAILY_LOTS,
    updatedBy: "seed-script-october",
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  console.log("Successfully seeded DEFAULT_DAILY_LOTS to Firestore!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Error seeding daily lots:", err);
  process.exit(1);
});
