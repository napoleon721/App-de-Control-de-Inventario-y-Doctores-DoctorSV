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
      env[key.trim()] = rest.join("=").trim();
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

async function inspect() {
  const base = ["sedes", "san-miguel", "estado"];
  const docs = ["spaces", "supervisores", "config", "rosters", "attendance", "bodega", "historial"];
  for (const d of docs) {
    const snap = await getDoc(doc(db, ...base, d));
    if (!snap.exists()) {
      console.log(`❌ ${d}: DOES NOT EXIST`);
    } else {
      const data = snap.data();
      const keys = Object.keys(data);
      console.log(`✅ ${d}: exists, keys: [${keys.join(", ")}]`);
      if (d === "spaces") console.log(`   spaces count: ${data.list?.length}`);
      if (d === "supervisores") console.log(`   supervisores:`, JSON.stringify(data.list, null, 2));
      if (d === "rosters") console.log(`   rosters keys: ${Object.keys(data.rosters || {}).join(", ")}`);
      if (d === "attendance") console.log(`   attendance records count: ${Object.keys(data.records || {}).length}`);
      if (d === "config") console.log(`   config horarios: ${data.horarios?.length}`);
    }
  }
  process.exit(0);
}

inspect().catch(err => {
  console.error("Error inspecting:", err);
  process.exit(1);
});
