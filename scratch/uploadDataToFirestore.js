import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from "fs";

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

// Cargar datos base de Excel
const excelData = JSON.parse(fs.readFileSync("src/constants/excelData.json", "utf8"));
const allDoctors = excelData.doctors || [];
const doctorsGrupo1 = allDoctors.filter((d) => d.grupo === "Grupo 1").map((d) => d.nombre);
const doctorsGrupo2 = allDoctors.filter((d) => d.grupo === "Grupo 2").map((d) => d.nombre);

// 1. Espacios
function buildInitialSpaces() {
  let list = [];
  if (excelData.inventory && excelData.inventory.length >= 140) {
    list = excelData.inventory.slice(0, 140).map((inv) => {
      let doctor = inv.doctor || null;
      let categoria = inv.categoria || null;
      let observaciones = inv.observaciones || "";
      let estado = inv.estado || (inv.marca ? "DISPONIBLE" : "VACIO");
      let horario = inv.horario || null;

      // Puestos de supervisión física
      if (inv.id === 135) {
        doctor = "EMERSON JOSUE VIGIL HERNANDEZ (Supervisor)";
        categoria = "Supervisores";
        observaciones = "PUESTO DE SUPERVISIÓN MÉDICA (Ajuste administrativo - Traslado desde Puesto 42)";
        estado = "RESERVADO";
      } else if (inv.id === 136) {
        doctor = "SALVADOR RENDEROS BONILLA (Supervisor)";
        categoria = "Supervisores";
        observaciones = "PUESTO DE SUPERVISIÓN MÉDICA (Ajuste administrativo - Traslado desde Puesto 43)";
        estado = "RESERVADO";
      } else if (inv.id === 137) {
        doctor = "ALFREDO ISAAC MARTINEZ AMAYA (Supervisor)";
        categoria = "Supervisores";
        observaciones = "PUESTO DE SUPERVISIÓN MÉDICA (Ajuste administrativo - Traslado desde Puesto 45)";
        estado = "RESERVADO";
      } else if (inv.id === 138) {
        doctor = "ROXANA GUADALUPE CANALES RODRIGUEZ (Supervisora)";
        categoria = "Supervisores";
        observaciones = "PUESTO DE SUPERVISIÓN MÉDICA (Ajuste administrativo - Traslado desde Puesto 44)";
        estado = "RESERVADO";
      } else if (inv.id === 139) {
        doctor = "EDWARD JOSUE ZELAYA PRUDENCIO (Supervisor de Control)";
        categoria = "Supervisores";
        observaciones = "ESTACIÓN DE CONTROL DE ACCESO Y SUPERVISIÓN (Puesto Reservado)";
        estado = "RESERVADO";
      }

      return {
        ...inv,
        doctor,
        horario,
        estado,
        categoria,
        observaciones,
        modelo: inv.modelo || (inv.marca ? `${inv.marca === "DELL" ? "OptiPlex 3080" : inv.marca === "LENOVO" ? "ThinkCentre M70q" : "EliteDesk 800"}` : null),
        activoPc: inv.activoPc || (inv.marca ? `PC-${1000 + inv.id}` : null),
        monitor: inv.monitor || (inv.marca ? { activo: `MON-${2000 + inv.id}`, marca: inv.marca } : null),
      };
    });

    // Puestos 141 al 170 (Anexos)
    for (let i = 141; i <= 170; i++) {
      const isAnexo1 = i <= 154;
      list.push({
        id: i,
        modulo: isAnexo1 ? "Módulo Anexo 1 (7×2)" : "Módulo Anexo 2 (8×2)",
        puesto: String(i),
        estado: "DISPONIBLE",
        marca: "DELL",
        modelo: "OptiPlex 3080",
        activoPc: `PC-${1000 + i}`,
        monitor: { marca: "DELL", activo: `MON-${2000 + i}` },
        mouse: true,
        headset: true,
        hub: true,
        observaciones: isAnexo1 ? "Módulo Anexo 1 · Puestos 141 - 154 (7×2)" : "Módulo Anexo 2 · Puestos 155 - 170 (8×2)",
        ultimoMovimiento: new Date().toLocaleDateString("es-SV"),
        doctor: null,
        horario: null,
      });
    }
  }

  // Pre-asignar lote de Emerson (Puestos 37 a 76 con médicos reales de Grupo 1)
  const defaultFranja = "07:00 AM – 12:00 PM";
  let docIdx = 0;
  list = list.map((sp) => {
    if (sp.id >= 37 && sp.id <= 76 && sp.marca && !sp.doctor && docIdx < doctorsGrupo1.length) {
      const docName = doctorsGrupo1[docIdx++];
      return {
        ...sp,
        doctor: docName,
        horario: defaultFranja,
        estado: "OCUPADO",
      };
    }
    if (sp.id === 140) {
      return {
        ...sp,
        doctor: "DR. TEST OPERATIVO",
        horario: defaultFranja,
        estado: "OCUPADO",
      };
    }
    return sp;
  });

  return list;
}

const spaces = buildInitialSpaces();

// 2. Asistencia
const attendanceRecords = {};
spaces.forEach((sp) => {
  if (sp.doctor && !sp.doctor.includes("(Supervisor)")) {
    attendanceRecords[sp.doctor] = "PRESENTE";
  }
});

// 3. Bodega
const bodegaStock = [
  { key: "PC", label: "Computadoras", original: 1, actual: 1 },
  { key: "MAUSE", label: "Mouse óptico", original: 10, actual: 2 },
  { key: "HUB", label: "Hub USB-C", original: 0, actual: 0 },
  { key: "MONITOR", label: "Monitores", original: 0, actual: 0 },
  { key: "CABLES", label: "Cables Ethernet", original: 1, actual: 1 },
];

// 4. Historial
const historial = excelData.movements && excelData.movements.length > 0
  ? excelData.movements
  : [
      { id: "mov-1", fecha: "25/07/2026", equipo: "MAUSE", espacio: 84, accion: "Cambio", origen: "84", destino: "140", falla: "Falla en scroll", obs: "Funciona posterior a periodo de inactividad" }
    ];

// 5. Supervisores
const supervisores = [
  { id: "sup-1", nombre: "EMERSON JOSUE VIGIL HERNANDEZ", correo: "emerson.vigil@doctorsv.gob.sv", puesto: 135, rol: "Supervisor Médico (Turno Mañana)", bloqueInicio: 37, bloqueFin: 76, totalPuestos: 40, horario: "06:00 AM – 02:00 PM" },
  { id: "sup-2", nombre: "SALVADOR RENDEROS BONILLA", correo: "salvador.renderos@doctorsv.gob.sv", puesto: 136, rol: "Supervisor Médico (Turno Tarde)", bloqueInicio: 71, bloqueFin: 104, totalPuestos: 34, horario: "02:00 PM – 10:00 PM" },
  { id: "sup-3", nombre: "ALFREDO ISAAC MARTINEZ AMAYA", correo: "alfredo.martinez@doctorsv.gob.sv", puesto: 137, rol: "Supervisor Médico (Turno Intermedio)", bloqueInicio: 1, bloqueFin: 36, totalPuestos: 36, horario: "08:00 AM – 12:00 MD" },
  { id: "sup-4", nombre: "ROXANA GUADALUPE CANALES RODRIGUEZ", correo: "roxana.canales@doctorsv.gob.sv", puesto: 138, rol: "Supervisora Médica", bloqueInicio: 105, bloqueFin: 140, totalPuestos: 36, horario: "07:00 AM – 12:00 PM" },
  { id: "sup-5", nombre: "EDWARD JOSUE ZELAYA PRUDENCIO", correo: "edward.zelaya@doctorsv.gob.sv", puesto: 139, rol: "Supervisor de Control & Acceso", bloqueInicio: 1, bloqueFin: 40, totalPuestos: 40, horario: "02:00 PM – 10:00 PM" },
];

// 6. Horarios
const horarios = [
  "06:00 AM – 02:00 PM",
  "07:00 AM – 12:00 PM",
  "08:00 AM – 12:00 MD",
  "12:00 MD – 06:00 PM",
  "02:00 PM – 10:00 PM",
  "04:00 PM – 10:00 PM",
  "06:00 PM – 10:00 PM",
];

// 7. Nóminas (Rosters)
const rosters = {
  "sup-1": doctorsGrupo1.slice(0, 40),
  "sup-2": doctorsGrupo2.slice(0, 34),
  "sup-3": doctorsGrupo1.slice(0, 36),
  "sup-4": doctorsGrupo2.slice(0, 36),
  "sup-5": allDoctors.slice(0, 40).map((d) => d.nombre),
};

async function seed() {
  console.log("🚀 Sincronizando datos oficiales completos en Cloud Firestore...");
  const SEDE_ID = "san-miguel";

  // 1. Spaces
  console.log(`Subiendo ${spaces.length} puestos de inventario (con asignaciones activas)...`);
  await setDoc(doc(db, "sedes", SEDE_ID, "estado", "spaces"), {
    list: spaces,
    updatedBy: "cloud_sync",
    updatedAt: new Date().toISOString(),
  });
  console.log("✅ Espacios actualizados en Firestore.");

  // 2. Asistencia
  console.log(`Subiendo ${Object.keys(attendanceRecords).length} registros de asistencia en tiempo real...`);
  await setDoc(doc(db, "sedes", SEDE_ID, "estado", "attendance"), {
    records: attendanceRecords,
    updatedBy: "cloud_sync",
    updatedAt: new Date().toISOString(),
  });
  console.log("✅ Asistencia actualizada en Firestore.");

  // 3. Bodega
  console.log("Subiendo inventario de bodega...");
  await setDoc(doc(db, "sedes", SEDE_ID, "estado", "bodega"), {
    list: bodegaStock,
    updatedBy: "cloud_sync",
    updatedAt: new Date().toISOString(),
  });
  console.log("✅ Bodega actualizada en Firestore.");

  // 4. Historial
  console.log("Subiendo historial y movimientos...");
  await setDoc(doc(db, "sedes", SEDE_ID, "estado", "historial"), {
    list: historial,
    updatedBy: "cloud_sync",
    updatedAt: new Date().toISOString(),
  });
  console.log("✅ Historial actualizado en Firestore.");

  // 5. Supervisores
  console.log("Subiendo configuración de supervisores, lotes y turnos...");
  await setDoc(doc(db, "sedes", SEDE_ID, "estado", "supervisores"), {
    list: supervisores,
    updatedBy: "cloud_sync",
    updatedAt: new Date().toISOString(),
  });
  console.log("✅ Supervisores actualizados en Firestore.");

  // 6. Horarios
  console.log("Subiendo franjas y turnos configurables...");
  await setDoc(doc(db, "sedes", SEDE_ID, "estado", "config"), {
    horarios: horarios,
    updatedBy: "cloud_sync",
    updatedAt: new Date().toISOString(),
  });
  console.log("✅ Horarios actualizados en Firestore.");

  // 7. Nóminas (Rosters)
  console.log("Subiendo nóminas de médicos por supervisor...");
  await setDoc(doc(db, "sedes", SEDE_ID, "estado", "rosters"), {
    rosters: rosters,
    updatedBy: "cloud_sync",
    updatedAt: new Date().toISOString(),
  });
  console.log("✅ Nóminas actualizadas en Firestore.");

  console.log("\n🎉 ¡TODOS LOS DATOS Y NÓMINAS SE HAN SUBIDO CORRECTAMENTE A FIRESTORE!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Error cargando datos en Firestore:", err);
  process.exit(1);
});
