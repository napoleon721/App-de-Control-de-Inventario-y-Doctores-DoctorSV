import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
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

async function cleanAttendance() {
  const attRef = doc(db, "sedes", "san-miguel", "estado", "attendance");
  const attSnap = await getDoc(attRef);
  if (!attSnap.exists()) {
    console.log("Attendance doc not found");
    process.exit(0);
  }

  const data = attSnap.data();
  const records = { ...(data.records || {}) };

  const targetDoctors = [
    "AMALIA JEANETH REYES MARTÍNEZ",
    "YASMÍN ENEIDA LÓPEZ MORENO",
    "ZAIRA REBECA AGUILAR ZEPEDA",
    "ELIZABETH DANIELA REYES GÓMEZ"
  ];

  targetDoctors.forEach((name) => {
    Object.keys(records).forEach((k) => {
      if (k.toLowerCase().includes(name.slice(0, 10).toLowerCase())) {
        records[k] = "FINALIZADO";
      }
    });
    records[name] = "FINALIZADO";
  });

  await setDoc(attRef, {
    records,
    updatedBy: "remanent-cleaner-cli",
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  console.log("Successfully marked remanent doctors as FINALIZADO in Firestore!");
  process.exit(0);
}

cleanAttendance().catch((err) => {
  console.error("Error cleaning attendance:", err);
  process.exit(1);
});
