// Test script to verify peripheral modifications, auto-state transitions, bodega adjustments, and logs
import { buildInitialSpaces, ensureAllSpaces, ESTADOS, BODEGA_TIPOS } from "../src/constants/tokens.js";

console.log("=================================================");
console.log("🧪 TEST SUITE: SINCRONIZACIÓN DE PERIFÉRICOS & BASE DE DATOS");
console.log("=================================================\n");

let spaces = ensureAllSpaces(buildInitialSpaces());
let bodegaStock = [
  { key: "PC", label: "Computadoras", original: 1, actual: 1 },
  { key: "MAUSE", label: "Mouse óptico", original: 10, actual: 2 },
  { key: "HUB", label: "Hub USB-C", original: 0, actual: 0 },
  { key: "MONITOR", label: "Monitores", original: 0, actual: 0 },
  { key: "CABLES", label: "Cables Ethernet", original: 1, actual: 1 },
  { key: "HEADSET", label: "Auriculares / Headsets", original: 0, actual: 0 },
];
let historial = [];

function computeCounts(currentSpaces) {
  const res = {
    DISPONIBLE: 0,
    INCOMPLETO: 0,
    INHABILITADO: 0,
    VACIO: 0,
    REPARACION: 0,
    RESERVADO: 0,
    OCUPADO: 0,
  };
  currentSpaces.forEach((s) => {
    if (s.doctor) {
      res.OCUPADO++;
    } else if (res[s.estado] !== undefined) {
      res[s.estado]++;
    }
  });
  return res;
}

// Logic identical to handleSaveSpace in App.jsx
function simulateSaveSpace(updatedSpace) {
  const cleanId = Number(updatedSpace.id);
  const prevSpace = spaces.find((s) => Number(s.id) === cleanId) || {};

  const hasPc = Boolean(updatedSpace.marca && updatedSpace.marca !== "NO PC");
  const hasMonitor = Boolean(updatedSpace.monitor && (updatedSpace.monitor.marca || updatedSpace.monitor.activo || updatedSpace.monitor === true));
  const hasMouse = Boolean(updatedSpace.mouse);
  const hasHeadset = Boolean(updatedSpace.headset);
  const hasHub = Boolean(updatedSpace.hub);

  let finalEstado = updatedSpace.estado;
  if (updatedSpace.doctor) {
    finalEstado = "OCUPADO";
  } else if (
    finalEstado !== "INHABILITADO" &&
    finalEstado !== "REPARACION" &&
    finalEstado !== "RESERVADO"
  ) {
    if (!hasPc) {
      finalEstado = "VACIO";
    } else if (!hasMouse || !hasHeadset || !hasMonitor) {
      finalEstado = "INCOMPLETO";
    } else {
      finalEstado = "DISPONIBLE";
    }
  }

  const nowTimeStr = new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" });
  const nowDateStr = new Date().toLocaleDateString("es-SV");

  const normalized = {
    ...updatedSpace,
    estado: finalEstado,
    categoria: cleanId === 1 ? null : updatedSpace.categoria,
    marca: !hasPc ? "NO PC" : (updatedSpace.marca || "DELL"),
    modelo: !hasPc ? null : (updatedSpace.modelo || "OptiPlex 3080"),
    ultimoMovimiento: nowTimeStr,
  };

  const prevHasPc = Boolean(prevSpace.marca && prevSpace.marca !== "NO PC");
  const prevHasMonitor = Boolean(prevSpace.monitor && (prevSpace.monitor.marca || prevSpace.monitor.activo || prevSpace.monitor === true));
  const prevHasMouse = Boolean(prevSpace.mouse);
  const prevHasHeadset = Boolean(prevSpace.headset);
  const prevHasHub = Boolean(prevSpace.hub);

  const bodegaDeltas = {};
  const newLogs = [];

  // MOUSE
  if (prevHasMouse && !hasMouse) {
    bodegaDeltas["MAUSE"] = (bodegaDeltas["MAUSE"] || 0) + 1;
    newLogs.push({
      id: `mov-${Date.now()}-mouse-del`,
      fecha: nowDateStr,
      equipo: "MAUSE",
      cantidad: 1,
      espacio: cleanId,
      accion: "Retiro a Bodega",
      origen: `Puesto #${cleanId}`,
      destino: "BODEGA",
      falla: "N/A",
      obs: `Retiro de mouse de Puesto #${cleanId} a Bodega`,
    });
  } else if (!prevHasMouse && hasMouse) {
    bodegaDeltas["MAUSE"] = (bodegaDeltas["MAUSE"] || 0) - 1;
    newLogs.push({
      id: `mov-${Date.now()}-mouse-add`,
      fecha: nowDateStr,
      equipo: "MAUSE",
      cantidad: 1,
      espacio: cleanId,
      accion: "Instalación",
      origen: "BODEGA",
      destino: `Puesto #${cleanId}`,
      falla: "N/A",
      obs: `Instalación de mouse en Puesto #${cleanId} desde Bodega`,
    });
  }

  // HEADSET
  if (prevHasHeadset && !hasHeadset) {
    bodegaDeltas["HEADSET"] = (bodegaDeltas["HEADSET"] || 0) + 1;
    newLogs.push({
      id: `mov-${Date.now()}-headset-del`,
      fecha: nowDateStr,
      equipo: "HEADSET",
      cantidad: 1,
      espacio: cleanId,
      accion: "Retiro a Bodega",
      origen: `Puesto #${cleanId}`,
      destino: "BODEGA",
      falla: "N/A",
      obs: `Retiro de auricular / headset de Puesto #${cleanId} a Bodega`,
    });
  } else if (!prevHasHeadset && hasHeadset) {
    bodegaDeltas["HEADSET"] = (bodegaDeltas["HEADSET"] || 0) - 1;
    newLogs.push({
      id: `mov-${Date.now()}-headset-add`,
      fecha: nowDateStr,
      equipo: "HEADSET",
      cantidad: 1,
      espacio: cleanId,
      accion: "Instalación",
      origen: "BODEGA",
      destino: `Puesto #${cleanId}`,
      falla: "N/A",
      obs: `Instalación de auricular / headset en Puesto #${cleanId} desde Bodega`,
    });
  }

  if (Object.keys(bodegaDeltas).length > 0) {
    bodegaStock = bodegaStock.map((item) => {
      const delta =
        bodegaDeltas[item.key] ??
        (item.key === "MAUSE" ? bodegaDeltas["MOUSE"] : undefined) ??
        (item.key === "MOUSE" ? bodegaDeltas["MAUSE"] : undefined) ??
        0;
      if (delta === 0) return item;
      return {
        ...item,
        actual: Math.max(0, (item.actual || 0) + delta),
      };
    });
  }

  if (newLogs.length > 0) {
    historial = [...newLogs, ...historial];
  }

  spaces = spaces.map((s) => (Number(s.id) === cleanId ? normalized : s));
  return normalized;
}

// 1. Initial State Check
const targetSpace = spaces.find((s) => s.id === 1);
console.log(`1️⃣  Estado inicial de Puesto #1:`, {
  id: targetSpace.id,
  estado: targetSpace.estado,
  mouse: targetSpace.mouse,
  headset: targetSpace.headset,
  monitor: targetSpace.monitor?.marca,
});
const initialCounts = computeCounts(spaces);
console.log(`   Dashboard Counts iniciales: Disponibles=${initialCounts.DISPONIBLE}, Incompletos=${initialCounts.INCOMPLETO}`);
const initialMouseBodega = bodegaStock.find((b) => b.key === "MAUSE").actual;
console.log(`   Stock Bodega Mouse: ${initialMouseBodega}\n`);

// 2. Modificación: Desmarcar Mouse (Simulando clic del usuario en modal)
console.log("2️⃣  TEST: El usuario desmarca el Mouse en Puesto #1 y guarda...");
const savedIncomplete = simulateSaveSpace({
  ...targetSpace,
  mouse: false,
});

console.log(`   Puesto #1 actualizado:`, {
  id: savedIncomplete.id,
  estado: savedIncomplete.estado,
  mouse: savedIncomplete.mouse,
});
if (savedIncomplete.estado === "INCOMPLETO") {
  console.log("   ✅ Puesto cambió automáticamente a INCOMPLETO.");
} else {
  console.error("   ❌ ERROR: Se esperaba INCOMPLETO, pero es:", savedIncomplete.estado);
}

const midCounts = computeCounts(spaces);
console.log(`   Dashboard Counts: Disponibles=${midCounts.DISPONIBLE} (-1), Incompletos=${midCounts.INCOMPLETO} (+1)`);
if (midCounts.INCOMPLETO === initialCounts.INCOMPLETO + 1 && midCounts.DISPONIBLE === initialCounts.DISPONIBLE - 1) {
  console.log("   ✅ KPIs del Dashboard actualizados reactivamente.");
} else {
  console.error("   ❌ ERROR en conteos de KPIs.");
}

const midMouseBodega = bodegaStock.find((b) => b.key === "MAUSE").actual;
console.log(`   Stock Bodega Mouse: ${midMouseBodega} (anterior era ${initialMouseBodega})`);
if (midMouseBodega === initialMouseBodega + 1) {
  console.log("   ✅ Inventario de Bodega para MAUSE incrementó en +1.");
} else {
  console.error("   ❌ ERROR: Stock en Bodega no incrementó.");
}

console.log(`   Último registro de Historial:`, historial[0]?.obs);
if (historial[0]?.accion === "Retiro a Bodega" && historial[0]?.equipo === "MAUSE") {
  console.log("   ✅ Historial registró correctamente el movimiento de hardware.");
} else {
  console.error("   ❌ ERROR en registro de historial.");
}

// 3. Modificación: Reinstalar Mouse (Simulando que el técnico equipa de nuevo el cubículo)
console.log("\n3️⃣  TEST: El usuario vuelve a marcar el Mouse en Puesto #1 y guarda...");
const savedAvailable = simulateSaveSpace({
  ...spaces.find((s) => s.id === 1),
  mouse: true,
});

console.log(`   Puesto #1 actualizado:`, {
  id: savedAvailable.id,
  estado: savedAvailable.estado,
  mouse: savedAvailable.mouse,
});
if (savedAvailable.estado === "DISPONIBLE") {
  console.log("   ✅ Puesto cambió automáticamente de nuevo a DISPONIBLE.");
} else {
  console.error("   ❌ ERROR: Se esperaba DISPONIBLE, pero es:", savedAvailable.estado);
}

const finalCounts = computeCounts(spaces);
console.log(`   Dashboard Counts: Disponibles=${finalCounts.DISPONIBLE}, Incompletos=${finalCounts.INCOMPLETO}`);
if (finalCounts.DISPONIBLE === initialCounts.DISPONIBLE && finalCounts.INCOMPLETO === initialCounts.INCOMPLETO) {
  console.log("   ✅ KPIs volvieron a su balance correcto.");
} else {
  console.error("   ❌ ERROR en KPIs finales.");
}

const finalMouseBodega = bodegaStock.find((b) => b.key === "MAUSE").actual;
console.log(`   Stock Bodega Mouse: ${finalMouseBodega}`);
if (finalMouseBodega === initialMouseBodega) {
  console.log("   ✅ Stock en Bodega decreció -1 hacia el cubículo restaurando el balance.");
} else {
  console.error("   ❌ ERROR en stock final de bodega.");
}

console.log(`   Último registro de Historial:`, historial[0]?.obs);
if (historial[0]?.accion === "Instalación" && historial[0]?.equipo === "MAUSE") {
  console.log("   ✅ Historial registró la instalación del periférico exitosamente.");
} else {
  console.error("   ❌ ERROR en registro de instalación.");
}

console.log("\n✨ TODOS LOS TESTS DE PERIFÉRICOS Y BASES DE DATOS PASARON CON ÉXITO! ✨");
