import React from "react";
import ReactDOMServer from "react-dom/server";
import {
  SUPERVISORES_OFICIALES,
  HORARIOS,
  ESTADOS,
  DOCTORES_EXCEL,
  ensureAllSpaces,
  buildInitialSpaces
} from "../src/constants/tokens.js";
import {
  isSameDoctor,
  normalizeDocName,
  isSameHorario,
  getDoctorSupervisorInfo
} from "../src/utils/safeHelpers.js";
import {
  DEFAULT_DAILY_LOTS,
  findDailyLotForSupervisor,
  findDailyLotsForSupervisor
} from "../src/utils/dailyLotsParser.js";

// Modals and views
import AttendanceView from "../src/components/attendance/AttendanceView.jsx";
import AuthPortal from "../src/components/auth/AuthPortal.jsx";
import DailyLotsManagerModal from "../src/components/config/DailyLotsManagerModal.jsx";
import SpaceMap from "../src/components/map/SpaceMap.jsx";
import WarehouseView from "../src/components/warehouse/WarehouseView.jsx";
import DoctorsView from "../src/components/doctors/DoctorsView.jsx";
import HistoryView from "../src/components/history/HistoryView.jsx";

console.log("=================================================");
console.log("🧪 INICIANDO TEST COMPLETO DE AUDITORÍA Y FUNCIONALIDAD");
console.log("=================================================\n");

let passed = 0;
let errors = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    errors++;
  }
}

// -------------------------------------------------------------------
// 1. VERIFICACIÓN DE INTEGRIDAD DE DATOS BASE
// -------------------------------------------------------------------
console.log("1️⃣  Verificación de Integridad de Datos Base:");
assert(SUPERVISORES_OFICIALES.length === 5, "Existen 5 supervisores oficiales");
const supIds = SUPERVISORES_OFICIALES.map(s => s.id);
assert(new Set(supIds).size === 5, "Los IDs de supervisores son únicos");
const supStations = SUPERVISORES_OFICIALES.map(s => s.puesto);
assert(supStations.every(p => p >= 135 && p <= 139), "Estaciones de supervisores están entre 135 y 139");

const initialSpaces = buildInitialSpaces();
assert(initialSpaces.length === 170, "buildInitialSpaces genera los 170 puestos totales (140 principales + 30 anexo)");

const allSpaces = ensureAllSpaces(initialSpaces);
assert(allSpaces.length === 170, "ensureAllSpaces asegura los 170 puestos totales");

assert(DOCTORES_EXCEL.length > 50, `Padrón de médicos cargado con ${DOCTORES_EXCEL.length} registros`);

// -------------------------------------------------------------------
// 2. PRUEBA DE HELPERS Y NORMALIZACIÓN DE NOMBRES
// -------------------------------------------------------------------
console.log("\n2️⃣  Prueba de Helpers y Normalización de Nombres:");
assert(isSameDoctor("Dr. Elmer Andrade", "ELMER ANDRADE"), "isSameDoctor reconoce con/sin Dr.");
assert(isSameDoctor("Dra. Roxana Canales", "ROXANA GUADALUPE CANALES RODRIGUEZ"), "isSameDoctor reconoce prefijo femenino y apellidos");
assert(isSameHorario("07:00 AM – 12:00 PM", "7:00 am - 12:00 pm"), "isSameHorario tolera formatos de guiones, horas con/sin cero inicial y mayúsculas");
assert(normalizeDocName("  DR(A). MARÍA JOSÉ PÉREZ  ") === "maria jose perez", "normalizeDocName limpia tildes, prefijo DR(A). y espacios");

// -------------------------------------------------------------------
// 3. PRUEBA DE PARSER DE LOTES DIARIOS
// -------------------------------------------------------------------
console.log("\n3️⃣  Prueba de Parser de Lotes Diarios:");

const foundLot = findDailyLotForSupervisor(DEFAULT_DAILY_LOTS, "2026-10-01", "sup-1", "EMERSON JOSUE VIGIL HERNANDEZ");
assert(foundLot && foundLot.bloqueInicio === 63 && foundLot.bloqueFin === 83, "findDailyLotForSupervisor encuentra lote exacto para Emerson Vigil");

const multipleLots = findDailyLotsForSupervisor(DEFAULT_DAILY_LOTS, "2026-10-02", "sup-2", "SALVADOR RENDEROS BONILLA");
assert(multipleLots.length >= 1 && multipleLots[0].bloqueInicio === 91, "findDailyLotsForSupervisor devuelve lista de lotes asociados");

// -------------------------------------------------------------------
// 4. PRUEBA DE RESOLUCIÓN DE ROL EN EL LOGIN UNIFICADO (AuthPortal)
// -------------------------------------------------------------------
console.log("\n4️⃣  Prueba de Portal de Acceso Unificado (AuthPortal):");

try {
  const authHtml = ReactDOMServer.renderToString(
    React.createElement(AuthPortal, {
      onLoginMaster: () => {},
      onLoginSupervisor: () => {},
      onLoginDoctor: () => {},
      supervisores: SUPERVISORES_OFICIALES,
      horarios: HORARIOS
    })
  );
  assert(authHtml.includes("Portal de Acceso"), "AuthPortal renderiza título institucional");
  assert(!authHtml.includes('role="tab"'), "AuthPortal NO contiene pestañas divididas");
  assert(authHtml.includes("Continuar con Google Institucional"), "AuthPortal tiene botón de Google Institucional");
  assert(authHtml.includes("Correo Electrónico Institucional"), "AuthPortal tiene campo unificado de correo");
  assert(authHtml.includes("2026"), "AuthPortal muestra el PIN predeterminado 2026");
} catch (e) {
  assert(false, `AuthPortal render failed: ${e.message}`);
}

// -------------------------------------------------------------------
// 5. PRUEBA DE ASISTENCIA Y ASIGNACIÓN (AttendanceView)
// -------------------------------------------------------------------
console.log("\n5️⃣  Prueba de Vista de Asistencia (AttendanceView):");

const sampleSupervisor = SUPERVISORES_OFICIALES[0]; // Emerson Vigil: 37-76
const sampleDoctors = DOCTORES_EXCEL.slice(0, 35).map((d, i) => ({
  nombre: d.nombre,
  horario: sampleSupervisor.horario,
  espacio: i < 20 ? 37 + i : null, // 20 con puesto, 15 sin puesto
  status: i < 20 ? "PRESENTE" : "PENDIENTE"
}));

try {
  const attHtml = ReactDOMServer.renderToString(
    React.createElement(AttendanceView, {
      spaces: allSpaces,
      currentUser: {
        role: "SUPERVISOR",
        name: sampleSupervisor.nombre,
        supervisorId: sampleSupervisor.id,
        puesto: sampleSupervisor.puesto,
        shift: sampleSupervisor.horario,
        bloqueInicio: sampleSupervisor.bloqueInicio,
        bloqueFin: sampleSupervisor.bloqueFin,
        totalPuestos: sampleSupervisor.totalPuestos,
        email: sampleSupervisor.correo
      },
      supervisores: SUPERVISORES_OFICIALES,
      horarios: HORARIOS,
      rosterBySupervisor: { [sampleSupervisor.id]: sampleDoctors.map(d => d.nombre) },
      attendanceRecords: { [sampleDoctors[0].nombre]: "PRESENTE" }
    })
  );
  assert(attHtml.includes("EMERSON JOSUE VIGIL HERNANDEZ"), "AttendanceView renderiza el nombre del supervisor");
  assert(attHtml.includes("Puestos #37 al #76"), "AttendanceView identifica el bloque correcto de puestos");
  assert(attHtml.includes("Marcar Faltantes como Ausentes"), "AttendanceView incluye botón seguro de marcar faltantes ausentes sin fallar");
} catch (e) {
  assert(false, `AttendanceView render failed: ${e.message}`);
}

// -------------------------------------------------------------------
// 6. PRUEBA DE MODALES DE CONFIGURACIÓN Y MAPA
// -------------------------------------------------------------------
console.log("\n6️⃣  Prueba de Modales de Configuración, Mapa y Vistas:");

try {
  const dailyLotsHtml = ReactDOMServer.renderToString(
    React.createElement(DailyLotsManagerModal, {
      activeDailyLots: DEFAULT_DAILY_LOTS,
      onSaveDailyLots: () => {},
      onClose: () => {},
      supervisores: SUPERVISORES_OFICIALES,
      horarios: HORARIOS
    })
  );
  assert(dailyLotsHtml.includes("Distribución Diaria de Lotes"), "DailyLotsManagerModal renderiza correctamente con DEFAULT_DAILY_LOTS");
} catch (e) {
  console.error("DailyLotsManagerModal ERROR DETAIL:", e);
  assert(false, `DailyLotsManagerModal render failed: ${e.message}`);
}

try {
  const mapHtml = ReactDOMServer.renderToString(
    React.createElement(SpaceMap, {
      spaces: allSpaces,
      counts: { DISPONIBLE: 120, OCUPADO: 50 },
      currentUser: { role: "MASTER", name: "Dr. Elmer Andrade", email: "elmer.andrade@doctorsv.gob.sv" },
      horarios: HORARIOS,
    })
  );
  assert(mapHtml.includes("170"), "SpaceMap renderiza correctamente con los 170 puestos");
} catch (e) {
  assert(false, `SpaceMap render failed: ${e.message}`);
}

try {
  const warehouseHtml = ReactDOMServer.renderToString(
    React.createElement(WarehouseView, {
      bodegaStock: [{ key: "PC", label: "PC", actual: 1, original: 1 }],
      spaces: allSpaces,
      historial: [],
    })
  );
  assert(warehouseHtml.length > 1000, "WarehouseView renderiza correctamente");
} catch (e) {
  assert(false, `WarehouseView render failed: ${e.message}`);
}

try {
  const docHtml = ReactDOMServer.renderToString(
    React.createElement(DoctorsView, {
      spaces: allSpaces,
      customStaff: [],
      supervisores: SUPERVISORES_OFICIALES,
    })
  );
  assert(docHtml.length > 1000, "DoctorsView renderiza correctamente");
} catch (e) {
  assert(false, `DoctorsView render failed: ${e.message}`);
}

try {
  const histHtml = ReactDOMServer.renderToString(
    React.createElement(HistoryView, {
      historial: [{ id: "1", fecha: "01/10/2026", accion: "Check-in", equipo: "PC", espacio: 14, obs: "Test" }],
      spaces: allSpaces,
    })
  );
  assert(histHtml.length > 1000, "HistoryView renderiza correctamente");
} catch (e) {
  assert(false, `HistoryView render failed: ${e.message}`);
}

// -------------------------------------------------------------------
// RESUMEN FINAL
// -------------------------------------------------------------------
console.log("\n=================================================");
console.log(`🏁 RESULTADO DEL TEST:`);
console.log(`   Pruebas pasadas: ${passed}`);
console.log(`   Errores encontrados: ${errors}`);
console.log("=================================================");

if (errors > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
