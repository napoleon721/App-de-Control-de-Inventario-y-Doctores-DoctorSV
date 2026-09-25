import React from "react";
import ReactDOMServer from "react-dom/server";
import { SUPERVISORES_OFICIALES, HORARIOS } from "../src/constants/tokens.js";
import excelData from "../src/constants/excelData.json" with { type: "json" };
import AttendanceView from "../src/components/attendance/AttendanceView.jsx";
import SpaceMap from "../src/components/map/SpaceMap.jsx";
import SpaceDetailModal from "../src/components/map/SpaceDetailModal.jsx";
import ClaimSpaceModal from "../src/components/map/ClaimSpaceModal.jsx";
import Header from "../src/components/common/Header.jsx";

const spaces = (excelData.inventory || []).slice(0, 170).map((inv, idx) => ({
  id: idx + 1,
  doctor: inv.doctor || null,
  estado: inv.estado || "DISPONIBLE",
  horario: inv.horario || null,
  marca: inv.marca || "DELL",
}));

console.log("Testing Supervisor View...");
const supervisorUser = {
  name: "Dr. Emerson Josué Vigil Hernández",
  role: "SUPERVISOR",
  supervisorId: "sup-1",
  puesto: 135,
  spaceId: 135,
  shift: "07:00 AM – 12:00 PM",
  bloqueInicio: 1,
  bloqueFin: 40,
  totalPuestos: 40,
  email: "emerson.vigil@doctorsv.gob.sv",
};

try {
  const htmlSup = ReactDOMServer.renderToString(
    React.createElement(AttendanceView, {
      spaces: spaces,
      initialSupId: supervisorUser.supervisorId,
      currentUser: supervisorUser,
      supervisores: SUPERVISORES_OFICIALES,
      horarios: HORARIOS,
      rosterBySupervisor: {},
      attendanceRecords: {},
    })
  );
  console.log("✅ AttendanceView rendered successfully for Supervisor! Length:", htmlSup.length);
} catch (e) {
  console.error("❌ AttendanceView FAILED for Supervisor:", e);
}

console.log("Testing Master View on AttendanceView...");
const masterUser = {
  role: "MASTER",
  name: "Dr. Elmer Andrade (Master Admin)",
  email: "elmer.andrade@doctorsv.gob.sv",
  shift: "Turno Completo",
};

try {
  const htmlMaster = ReactDOMServer.renderToString(
    React.createElement(AttendanceView, {
      spaces: spaces,
      initialSupId: null,
      currentUser: masterUser,
      supervisores: SUPERVISORES_OFICIALES,
      horarios: HORARIOS,
      rosterBySupervisor: {},
      attendanceRecords: {},
    })
  );
  console.log("✅ AttendanceView rendered successfully for Master! Length:", htmlMaster.length);
} catch (e) {
  console.error("❌ AttendanceView FAILED for Master:", e);
}

console.log("Testing SpaceMap for Master...");
try {
  const htmlMap = ReactDOMServer.renderToString(
    React.createElement(SpaceMap, {
      spaces: spaces,
      counts: { DISPONIBLE: 100, OCUPADO: 20 },
      currentUser: masterUser,
      horarios: HORARIOS,
    })
  );
  console.log("✅ SpaceMap rendered successfully for Master! Length:", htmlMap.length);
} catch (e) {
  console.error("❌ SpaceMap FAILED for Master:", e);
}

console.log("Testing SpaceMap for Supervisor...");
try {
  const htmlMapSup = ReactDOMServer.renderToString(
    React.createElement(SpaceMap, {
      spaces: spaces,
      counts: { DISPONIBLE: 100, OCUPADO: 20 },
      currentUser: supervisorUser,
      horarios: HORARIOS,
    })
  );
  console.log("✅ SpaceMap rendered successfully for Supervisor! Length:", htmlMapSup.length);
} catch (e) {
  console.error("❌ SpaceMap FAILED for Supervisor:", e);
}

console.log("Testing SpaceDetailModal for space 68...");
try {
  const space68 = spaces.find(s => s.id === 68) || spaces[67];
  const htmlModal = ReactDOMServer.renderToString(
    React.createElement(SpaceDetailModal, {
      space: space68,
      supervisores: SUPERVISORES_OFICIALES,
      horarios: HORARIOS,
      isMaster: true,
    })
  );
  console.log("✅ SpaceDetailModal rendered successfully for space 68! Length:", htmlModal.length);
} catch (e) {
  console.error("❌ SpaceDetailModal FAILED for space 68:", e);
}
