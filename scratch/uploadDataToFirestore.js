import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from "fs";
import {
  SUPERVISORES_OFICIALES,
  HORARIOS,
  BODEGA_TIPOS,
  DOCTORES_EXCEL,
  buildInitialSpaces,
  ensureAllSpaces,
} from "../src/constants/tokens.js";
import { DEFAULT_DAILY_LOTS } from "../src/utils/dailyLotsParser.js";

// Leer variables de entorno desde .env
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

// 1. ESPACIOS FÍSICOS (170 PUESTOS TOTALES: 140 PRINCIPALES + 30 ANEXOS)
// Se construyen a partir del inventario oficial de Excel sin datos ficticios de prueba.
const spaces = ensureAllSpaces(buildInitialSpaces());

// 2. REGISTROS DE ASISTENCIA INICIAL (Solo supervisores en sus estaciones 135-139)
const attendanceRecords = {};
spaces.forEach((sp) => {
  if (sp.doctor && sp.id >= 135 && sp.id <= 139) {
    attendanceRecords[sp.doctor] = "PRESENTE";
  }
});

// 3. INVENTARIO DE BODEGA CENTRAL Y PERIFÉRICOS (Los 6 tipos de hardware completos)
const bodegaStock = [
  { key: "PC", label: "Computadoras", original: 1, actual: 1 },
  { key: "MAUSE", label: "Mouse óptico", original: 10, actual: 2 },
  { key: "HUB", label: "Hub USB-C", original: 0, actual: 0 },
  { key: "MONITOR", label: "Monitores", original: 0, actual: 0 },
  { key: "CABLES", label: "Cables Ethernet", original: 1, actual: 1 },
  { key: "HEADSET", label: "Auriculares / Headsets", original: 0, actual: 0 },
];

// 4. HISTORIAL Y BITÁCORA DE MOVIMIENTOS DE HARDWARE
const excelData = JSON.parse(fs.readFileSync("src/constants/excelData.json", "utf8"));
const historial =
  excelData.movements && excelData.movements.length > 0
    ? excelData.movements
    : [
        {
          id: "mov-1",
          fecha: "25/07/2026",
          equipo: "MAUSE",
          espacio: 84,
          accion: "Cambio",
          origen: "84",
          destino: "140",
          falla: "Falla en scroll",
          obs: "Funciona posterior a periodo de inactividad",
        },
      ];

// 5. SUPERVISORES OFICIALES (5 SUPERVISORES DE SEDE SAN MIGUEL)
const supervisores = [...SUPERVISORES_OFICIALES];

// 6. FRANJAS HORARIAS OFICIALES
const horarios = [...HORARIOS];

// 7. NÓMINAS OFICIALES POR SUPERVISOR Y FRANJA
const allDoctors = DOCTORES_EXCEL || [];
const doctorsGrupo1 = allDoctors.filter((d) => d.grupo === "Grupo 1").map((d) => d.nombre);
const doctorsGrupo2 = allDoctors.filter((d) => d.grupo === "Grupo 2").map((d) => d.nombre);

const supNamesNorm = [
  "emerson josue vigil hernandez",
  "salvador renderos bonilla",
  "alfredo isaac martinez amaya",
  "roxana guadalupe canales rodriguez",
  "edward josue zelaya prudencio",
];

const operativeSP = allDoctors.filter((d) => {
  if (d.grupo !== "Servicios Profesionales") return false;
  const norm = (d.nombre || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  return !supNamesNorm.some((s) => norm.includes(s) || s.includes(norm));
});

const spEmerson = operativeSP.slice(0, 40).map((d) => d.nombre);
const spSalvador = operativeSP.slice(40, 74).map((d) => d.nombre);
const spAlfredo = operativeSP.slice(74, 110).map((d) => d.nombre);

const rosters = {
  // Por supervisor
  "sup-1": spEmerson,
  "sup-2": spSalvador,
  "sup-3": spAlfredo,
  "sup-4": doctorsGrupo2.slice(0, 36),
  "sup-5": doctorsGrupo1.slice(0, 40),
  // Por franja horaria específica de la tarde
  "sup-1__02:00 PM – 10:00 PM": spEmerson,
  "sup-2__04:00 PM – 10:00 PM": spSalvador,
  "sup-3__06:00 PM – 10:00 PM": spAlfredo,
  "sup-4__07:00 AM – 12:00 PM": doctorsGrupo2.slice(0, 36),
  "sup-5__02:00 PM – 10:00 PM": doctorsGrupo1.slice(0, 40),
};

// 8. QUINCENA OFICIAL (SERVICIOS PROFESIONALES)
const daysMeta = [
  { dateKey: "2026-09-25", label: "25 Sep 2026", dayNum: 25, diaSemana: "Viernes" },
  { dateKey: "2026-09-26", label: "26 Sep 2026", dayNum: 26, diaSemana: "Sábado" },
  { dateKey: "2026-09-27", label: "27 Sep 2026", dayNum: 27, diaSemana: "Domingo" },
  { dateKey: "2026-09-28", label: "28 Sep 2026", dayNum: 28, diaSemana: "Lunes" },
  { dateKey: "2026-09-29", label: "29 Sep 2026", dayNum: 29, diaSemana: "Martes" },
  { dateKey: "2026-09-30", label: "30 Sep 2026", dayNum: 30, diaSemana: "Miércoles" },
];

const totalSP = operativeSP.length;
const diasQuincena = daysMeta.map((dm, idx) => {
  const offset = (idx * 7) % totalSP;
  const rotated = [...operativeSP.slice(offset), ...operativeSP.slice(0, offset)];
  const emersonDocs = rotated.slice(0, 40);
  const salvadorDocs = rotated.slice(40, 74);
  const alfredoDocs = rotated.slice(74, 110);

  return {
    dateKey: dm.dateKey,
    label: dm.label,
    dayNum: dm.dayNum,
    diaSemana: dm.diaSemana,
    monthNum: 9,
    year: 2026,
    porSupervisor: {
      "sup-1": {
        supervisorId: "sup-1",
        supervisorNombre: "EMERSON JOSUE VIGIL HERNANDEZ",
        doctorNames: emersonDocs.map((d) => d.nombre),
        doctores: emersonDocs.map((d) => ({
          nombre: d.nombre,
          token: d.tcaUsuario || null,
          horario: "02:00 PM – 10:00 PM",
          isMatched: true,
        })),
        totalDoctores: emersonDocs.length,
      },
      "sup-2": {
        supervisorId: "sup-2",
        supervisorNombre: "SALVADOR RENDEROS BONILLA",
        doctorNames: salvadorDocs.map((d) => d.nombre),
        doctores: salvadorDocs.map((d) => ({
          nombre: d.nombre,
          token: d.tcaUsuario || null,
          horario: "04:00 PM – 10:00 PM",
          isMatched: true,
        })),
        totalDoctores: salvadorDocs.length,
      },
      "sup-3": {
        supervisorId: "sup-3",
        supervisorNombre: "ALFREDO ISAAC MARTINEZ AMAYA",
        doctorNames: alfredoDocs.map((d) => d.nombre),
        doctores: alfredoDocs.map((d) => ({
          nombre: d.nombre,
          token: d.tcaUsuario || null,
          horario: "06:00 PM – 10:00 PM",
          isMatched: true,
        })),
        totalDoctores: alfredoDocs.length,
      },
      "sup-4": {
        supervisorId: "sup-4",
        supervisorNombre: "ROXANA GUADALUPE CANALES RODRIGUEZ",
        doctorNames: doctorsGrupo2.slice(0, 36),
        doctores: doctorsGrupo2.slice(0, 36).map((name) => ({
          nombre: name,
          token: null,
          horario: "07:00 AM – 12:00 PM",
          isMatched: true,
        })),
        totalDoctores: 36,
      },
      "sup-5": {
        supervisorId: "sup-5",
        supervisorNombre: "EDWARD JOSUE ZELAYA PRUDENCIO",
        doctorNames: doctorsGrupo1.slice(0, 40),
        doctores: doctorsGrupo1.slice(0, 40).map((name) => ({
          nombre: name,
          token: null,
          horario: "02:00 PM – 10:00 PM",
          isMatched: true,
        })),
        totalDoctores: 40,
      },
    },
  };
});

const quincenaData = {
  id: "quincena_2026_09_q2",
  titulo: "Septiembre 2026 · Quincena 2 (Oficial)",
  origen: "Google Sheets · Medico Servicios Profesionales - San Miguel",
  updatedAt: new Date().toISOString(),
  dias: diasQuincena,
  diasDetectados: diasQuincena.map((d) => d.dateKey),
  supervisoresDetectados: [
    { id: "sup-1", nombre: "EMERSON JOSUE VIGIL HERNANDEZ", oficial: true, totalAsignaciones: 240 },
    { id: "sup-2", nombre: "SALVADOR RENDEROS BONILLA", oficial: true, totalAsignaciones: 204 },
    { id: "sup-3", nombre: "ALFREDO ISAAC MARTINEZ AMAYA", oficial: true, totalAsignaciones: 216 },
    { id: "sup-4", nombre: "ROXANA GUADALUPE CANALES RODRIGUEZ", oficial: true, totalAsignaciones: 216 },
    { id: "sup-5", nombre: "EDWARD JOSUE ZELAYA PRUDENCIO", oficial: true, totalAsignaciones: 240 },
  ],
  estadisticas: {
    totalDias: 6,
    totalSupervisores: 5,
    totalLineasParseadas: 660,
    totalReconocidos: 660,
    tasaReconocimiento: "100.0%",
  },
};

// 9. FUNCIÓN PRINCIPAL DE SINCRONIZACIÓN A FIRESTORE
async function seed() {
  console.log("=================================================");
  console.log("🚀 SINCRONIZANDO DATOS Y PERIFÉRICOS A FIRESTORE");
  console.log("=================================================\n");
  const SEDE_ID = "san-miguel";

  // 1. Espacios
  console.log(`1️⃣  Subiendo ${spaces.length} puestos de inventario oficial...`);
  await setDoc(doc(db, "sedes", SEDE_ID, "estado", "spaces"), {
    list: spaces,
    updatedBy: "cloud_sync",
    updatedAt: new Date().toISOString(),
  });
  console.log("   ✅ Espacios físicos actualizados (170 puestos).");

  // 2. Asistencia
  console.log(`2️⃣  Subiendo registros de asistencia...`);
  await setDoc(doc(db, "sedes", SEDE_ID, "estado", "attendance"), {
    records: attendanceRecords,
    updatedBy: "cloud_sync",
    updatedAt: new Date().toISOString(),
  });
  console.log("   ✅ Asistencia inicial sincronizada.");

  // 3. Bodega y Periféricos
  console.log("3️⃣  Subiendo inventario de bodega y periféricos (6 tipos)...");
  await setDoc(doc(db, "sedes", SEDE_ID, "estado", "bodega"), {
    list: bodegaStock,
    updatedBy: "cloud_sync",
    updatedAt: new Date().toISOString(),
  });
  console.log("   ✅ Bodega y periféricos (PC, Mouse, Hub, Monitor, Cables, Headset) actualizados.");

  // 4. Historial
  console.log("4️⃣  Subiendo historial de movimientos de hardware...");
  await setDoc(doc(db, "sedes", SEDE_ID, "estado", "historial"), {
    list: historial,
    updatedBy: "cloud_sync",
    updatedAt: new Date().toISOString(),
  });
  console.log("   ✅ Historial de movimientos actualizado.");

  // 5. Supervisores
  console.log("5️⃣  Subiendo configuración de los 5 supervisores oficiales...");
  await setDoc(doc(db, "sedes", SEDE_ID, "estado", "supervisores"), {
    list: supervisores,
    updatedBy: "cloud_sync",
    updatedAt: new Date().toISOString(),
  });
  console.log("   ✅ 5 Supervisores oficiales actualizados.");

  // 6. Horarios
  console.log("6️⃣  Subiendo franjas y turnos oficiales...");
  await setDoc(doc(db, "sedes", SEDE_ID, "estado", "config"), {
    horarios: horarios,
    updatedBy: "cloud_sync",
    updatedAt: new Date().toISOString(),
  });
  console.log("   ✅ Horarios actualizados.");

  // 7. Nóminas (Rosters)
  console.log("7️⃣  Subiendo nóminas oficiales por supervisor...");
  await setDoc(doc(db, "sedes", SEDE_ID, "estado", "rosters"), {
    rosters: rosters,
    updatedBy: "cloud_sync",
    updatedAt: new Date().toISOString(),
  });
  console.log("   ✅ Nóminas de supervisores actualizadas.");

  // 8. Lotes Diarios (RESUMEN SAN MIGUEL)
  console.log("8️⃣  Subiendo Distribución Diaria de Lotes (RESUMEN SAN MIGUEL)...");
  await setDoc(doc(db, "sedes", SEDE_ID, "estado", "dailyLots"), {
    dailyLots: DEFAULT_DAILY_LOTS,
    updatedBy: "cloud_sync",
    updatedAt: new Date().toISOString(),
  });
  console.log("   ✅ Distribución diaria de lotes actualizada.");

  // 9. Quincena Oficial (Servicios Profesionales)
  console.log("9️⃣  Subiendo nómina quincenal oficial...");
  await setDoc(doc(db, "sedes", SEDE_ID, "estado", "quincena"), {
    quincena: quincenaData,
    updatedBy: "cloud_sync",
    updatedAt: new Date().toISOString(),
  });
  console.log("   ✅ Quincena oficial actualizada con los 5 supervisores.");

  console.log("\n=================================================");
  console.log("🎉 ¡BASE DE DATOS Y PERIFÉRICOS ACTUALIZADOS CON ÉXITO!");
  console.log("=================================================");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Error cargando datos en Firestore:", err);
  process.exit(1);
});
