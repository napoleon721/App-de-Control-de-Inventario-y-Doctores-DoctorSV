import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import fs from "fs";

const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8")
    .split("\n")
    .filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => {
      const [k, ...rest] = l.split("=");
      return [k.trim(), rest.join("=").trim()];
    })
);

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
});

const db = getFirestore(app);
const snap = await getDoc(doc(db, "sedes", "san-miguel", "estado", "spaces"));
const list = snap.data().list;
console.log("Total spaces in Firestore:", list.length);
const occupied = list.filter(s => s.doctor || s.estado === "OCUPADO");
console.log("Occupied or has doctor count:", occupied.length);
occupied.forEach(s => {
  console.log(`Space #${s.id}: estado="${s.estado}", doctor="${s.doctor}", horario="${s.horario}", categoria="${s.categoria}"`);
});
process.exit(0);
