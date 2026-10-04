import { updateSpaceInGoogleSheets, getSheetsApiUrl } from "../src/services/googleSheetsService.js";

console.log("=================================================");
console.log("🧪 TEST: ENVÍO DE PERIFÉRICOS (1 Y 0) A GOOGLE SHEETS");
console.log("=================================================\n");

const url = getSheetsApiUrl();
console.log("1️⃣ URL de Google Apps Script configurada:", url ? url.slice(0, 55) + "..." : "No configurada");

// Simular interceptor de fetch para verificar el payload exacto
const originalFetch = globalThis.fetch;
let lastPayload = null;
let lastMethod = null;

globalThis.fetch = async (input, init) => {
  lastMethod = init?.method || "GET";
  if (init?.body) {
    try {
      lastPayload = JSON.parse(init.body);
    } catch {
      lastPayload = init.body;
    }
  } else if (typeof input === "string" && input.includes("?")) {
    const urlObj = new URL(input);
    lastPayload = Object.fromEntries(urlObj.searchParams.entries());
  }
  return { ok: true, status: 200, json: async () => ({ success: true }) };
};

// Caso A: Cubículo con todos los periféricos activos
const spaceCompleto = {
  id: 28,
  estado: "DISPONIBLE",
  marca: "DELL",
  modelo: "OptiPlex 3080",
  activoPc: "PC-1028",
  mouse: true,
  headset: true,
  hub: true,
  monitor: { marca: "DELL", activo: "MON-2028" },
  observaciones: "Puesto de prueba completo",
};

await updateSpaceInGoogleSheets(spaceCompleto);

console.log("2️⃣ Payload generado para puesto completo (#28):");
console.log("   - mouse:", lastPayload.mouse, "(esperado: 1)");
console.log("   - headset:", lastPayload.headset, "(esperado: 1)");
console.log("   - hub:", lastPayload.hub, "(esperado: 1)");
console.log("   - monitor:", lastPayload.monitor, "(esperado: 1)");

if (lastPayload.mouse === 1 && lastPayload.headset === 1 && lastPayload.hub === 1 && lastPayload.monitor === 1) {
  console.log("   ✅ PASS: Periféricos activos enviados con valor numérico 1 a Google Sheets.\n");
} else {
  console.error("   ❌ ERROR: Formato incorrecto para periféricos activos.\n");
}

// Caso B: Cubículo donde se desmarcó el Mouse y el Headset
const spaceIncompleto = {
  id: 28,
  estado: "INCOMPLETO",
  marca: "DELL",
  modelo: "OptiPlex 3080",
  activoPc: "PC-1028",
  mouse: false,
  headset: false,
  hub: true,
  monitor: { marca: "DELL", activo: "MON-2028" },
  observaciones: "Falta mouse y headset",
};

await updateSpaceInGoogleSheets(spaceIncompleto);

console.log("3️⃣ Payload generado tras desmarcar Mouse y Headset (#28):");
console.log("   - mouse:", lastPayload.mouse, "(esperado: 0)");
console.log("   - headset:", lastPayload.headset, "(esperado: 0)");
console.log("   - hub:", lastPayload.hub, "(esperado: 1)");
console.log("   - monitor:", lastPayload.monitor, "(esperado: 1)");

if (lastPayload.mouse === 0 && lastPayload.headset === 0 && lastPayload.hub === 1 && lastPayload.monitor === 1) {
  console.log("   ✅ PASS: Periféricos desmarcados enviados con valor numérico 0 a Google Sheets.\n");
} else {
  console.error("   ❌ ERROR: Formato incorrecto para periféricos desmarcados.\n");
}

// Restaurar fetch original
globalThis.fetch = originalFetch;

console.log("✨ TEST DE GOOGLE SHEETS 1 Y 0 COMPLETADO CON ÉXITO! ✨");
