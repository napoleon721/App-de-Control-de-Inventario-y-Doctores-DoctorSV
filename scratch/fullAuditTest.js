import React from "react";
import ReactDOMServer from "react-dom/server";
import { SUPERVISORES_OFICIALES, HORARIOS, ESTADOS, MARCAS, DOCTORES_EXCEL } from "../src/constants/tokens.js";
import excelData from "../src/constants/excelData.json" with { type: "json" };
import { ensureAllSpaces } from "../src/constants/tokens.js";

// Components
import AttendanceView from "../src/components/attendance/AttendanceView.jsx";
import SupervisorRosterModal from "../src/components/attendance/SupervisorRosterModal.jsx";
import LiveAttendanceReportModal from "../src/components/attendance/LiveAttendanceReportModal.jsx";
import SpaceMap from "../src/components/map/SpaceMap.jsx";
import SpaceDetailModal from "../src/components/map/SpaceDetailModal.jsx";
import ClaimSpaceModal from "../src/components/map/ClaimSpaceModal.jsx";
import ExactCubicle from "../src/components/map/ExactCubicle.jsx";
import Header from "../src/components/common/Header.jsx";
import AuthPortal from "../src/components/auth/AuthPortal.jsx";
import WarehouseView from "../src/components/warehouse/WarehouseView.jsx";
import DoctorsView from "../src/components/doctors/DoctorsView.jsx";
import HistoryView from "../src/components/history/HistoryView.jsx";
import ShiftConfigModal from "../src/components/config/ShiftConfigModal.jsx";
import SupervisorConfigModal from "../src/components/config/SupervisorConfigModal.jsx";
import GoogleSheetsConfigModal from "../src/components/config/GoogleSheetsConfigModal.jsx";
import QuickCheckInModal from "../src/components/attendance/QuickCheckInModal.jsx";

const spaces = ensureAllSpaces(excelData.inventory || []);

const mockUsers = [
  null,
  {
    role: "DOCTOR",
    name: "RODRIGO EDUARDO ANGEL RAMOS",
    shift: "07:00 AM – 12:00 PM",
    spaceId: 14,
    email: "rodrigo.angel@doctorsv.gob.sv",
    supervisorId: "sup-1",
    supervisorNombre: "EMERSON JOSUE VIGIL HERNANDEZ"
  },
  {
    role: "SUPERVISOR",
    name: "EMERSON JOSUE VIGIL HERNANDEZ",
    supervisorId: "sup-1",
    puesto: 135,
    spaceId: 135,
    shift: "06:00 AM – 02:00 PM",
    bloqueInicio: 37,
    bloqueFin: 76,
    totalPuestos: 40,
    email: "emerson.vigil@doctorsv.gob.sv"
  },
  {
    role: "MASTER",
    name: "Dr. Elmer Andrade (Master Admin)",
    email: "elmer.andrade@doctorsv.gob.sv",
    shift: "Turno Completo"
  }
];

let failed = 0;
function testComponent(name, element) {
  try {
    const html = ReactDOMServer.renderToString(element);
    console.log(`✅ ${name}: OK (${html.length} chars)`);
  } catch (err) {
    console.error(`❌ ${name} ERROR:`, err.message, err.stack);
    failed++;
  }
}

console.log("--- 1. TESTING VIEWS WITH DIFFERENT ROLES ---");
for (const user of mockUsers) {
  const roleName = user ? user.role : "ANON";
  testComponent(`Header (${roleName})`, React.createElement(Header, {
    tab: "mapa",
    setTab: () => {},
    alerts: [{ type: "warn", title: "Test", desc: "Alerta test" }],
    isSyncing: false,
    currentUser: user,
    onLogout: () => {},
  }));

  testComponent(`SpaceMap (${roleName})`, React.createElement(SpaceMap, {
    spaces,
    counts: { DISPONIBLE: 100, OCUPADO: 40 },
    currentUser: user,
    horarios: HORARIOS,
  }));

  testComponent(`AttendanceView (${roleName})`, React.createElement(AttendanceView, {
    spaces,
    initialSupId: user?.supervisorId || null,
    currentUser: user,
    supervisores: SUPERVISORES_OFICIALES,
    horarios: HORARIOS,
    rosterBySupervisor: { "sup-1": DOCTORES_EXCEL.slice(0, 40).map(d => d.nombre) },
    attendanceRecords: { [DOCTORES_EXCEL[0]?.nombre]: "PRESENTE" },
  }));
}

console.log("\n--- 2. TESTING MODALS ---");
testComponent("SpaceDetailModal (Space 1 - Supervisor)", React.createElement(SpaceDetailModal, {
  space: spaces[0],
  supervisores: SUPERVISORES_OFICIALES,
  horarios: HORARIOS,
  isMaster: true,
}));

testComponent("SpaceDetailModal (Space 68 - Normal)", React.createElement(SpaceDetailModal, {
  space: spaces.find(s => s.id === 68) || spaces[67],
  supervisores: SUPERVISORES_OFICIALES,
  horarios: HORARIOS,
  isMaster: false,
}));

testComponent("ClaimSpaceModal (Available)", React.createElement(ClaimSpaceModal, {
  space: spaces.find(s => s.id === 68),
  currentUser: mockUsers[1],
}));

testComponent("ClaimSpaceModal (Own space)", React.createElement(ClaimSpaceModal, {
  space: spaces.find(s => s.id === 14),
  currentUser: mockUsers[1],
}));

testComponent("SupervisorRosterModal", React.createElement(SupervisorRosterModal, {
  supervisor: SUPERVISORES_OFICIALES[0],
  currentDoctorNames: DOCTORES_EXCEL.slice(0, 40).map(d => d.nombre),
}));

testComponent("LiveAttendanceReportModal", React.createElement(LiveAttendanceReportModal, {
  spaces,
  supervisores: SUPERVISORES_OFICIALES,
  horarios: HORARIOS,
  rosterBySupervisor: {},
  attendanceRecords: {},
}));

testComponent("ShiftConfigModal", React.createElement(ShiftConfigModal, {
  horarios: HORARIOS,
  onSaveHorarios: () => {},
  onClose: () => {},
}));

testComponent("SupervisorConfigModal", React.createElement(SupervisorConfigModal, {
  supervisores: SUPERVISORES_OFICIALES,
  onSaveSupervisores: () => {},
  onClose: () => {},
  horarios: HORARIOS,
}));

testComponent("GoogleSheetsConfigModal", React.createElement(GoogleSheetsConfigModal, {
  onClose: () => {},
}));

testComponent("QuickCheckInModal", React.createElement(QuickCheckInModal, {
  spaces,
  horarios: HORARIOS,
  onClose: () => {},
}));

testComponent("AuthPortal (doctor tab)", React.createElement(AuthPortal, {
  horarios: HORARIOS,
  supervisores: SUPERVISORES_OFICIALES,
}));

console.log("\n--- 3. TESTING WAREHOUSE, DOCTORS, HISTORY ---");
testComponent("WarehouseView", React.createElement(WarehouseView, {
  bodegaStock: [
    { key: "PC", label: "PC", actual: 1, original: 1 },
    { key: "MAUSE", label: "Mouse", actual: 2, original: 10 }
  ],
  spaces,
  historial: [],
}));

testComponent("DoctorsView", React.createElement(DoctorsView, {
  spaces,
  customStaff: [],
  supervisores: SUPERVISORES_OFICIALES,
}));

testComponent("HistoryView", React.createElement(HistoryView, {
  historial: [{ id: "1", fecha: "21/09/2026", accion: "Check-in", equipo: "PC", espacio: 14, obs: "Test" }],
  spaces,
}));

console.log(`\n========================================`);
console.log(`TOTAL COMPONENT TESTS FAILED: ${failed}`);
console.log(`========================================`);
