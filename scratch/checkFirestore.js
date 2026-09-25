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

async function check() {
  const SEDE_ID = "san-miguel";
  for (const docName of ["spaces", "bodega", "historial", "supervisores", "config", "attendance", "rosters"]) {
    const snap = await getDoc(doc(db, "sedes", SEDE_ID, "estado", docName));
    if (snap.exists()) {
      const data = snap.data();
      const keys = Object.keys(data);
      console.log(`Doc [${docName}]: exists, keys: ${keys.join(", ")}, updatedBy: ${data.updatedBy}, updatedAt: ${data.updatedAt}`);
      if (docName === "supervisores") {
        console.log("Supervisores count:", data.list?.length, "Sample:", data.list?.map(s => `${s.nombre}: ${s.horario}`));
      }
      if (docName === "spaces") {
        const occupied = data.list?.filter(s => s.doctor).length;
        console.log(`Spaces total: ${data.list?.length}, Occupied with doctor: ${occupied}`);
      }
      if (docName === "rosters") {
        console.log("Rosters:", JSON.stringify(data.rosters || {}, null, 2));
      }
    } else {
      console.log(`Doc [${docName}]: DOES NOT EXIST`);
    }
  }
  process.exit(0);
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
