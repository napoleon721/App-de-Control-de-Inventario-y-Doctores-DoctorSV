/**
 * Servicio de conexión bidireccional con Google Sheets
 * Permite leer, editar, actualizar celdas y registrar movimientos en tiempo real.
 */

import { parseQuincenaSpreadsheet } from "../utils/quincenaParser.js";
import { DOCTORES_EXCEL, STAFF_EXCEL, SUPERVISORES_OFICIALES } from "../constants/tokens.js";

// Hojas oficiales individuales de cada supervisor para Servicios Profesionales
export const DEFAULT_SUPERVISOR_SHEETS = {
  "sup-1": {
    id: "sup-1",
    nombre: "EMERSON JOSUE VIGIL HERNANDEZ",
    token: "000EV3",
    sheetId: "1WuN2xtSLvb3Fof7OSvvTVDFP9FMpJuvcII8A25cgZBQ",
    url: "https://docs.google.com/spreadsheets/d/1WuN2xtSLvb3Fof7OSvvTVDFP9FMpJuvcII8A25cgZBQ/edit?usp=sharing",
  },
  "sup-3": {
    id: "sup-3",
    nombre: "ALFREDO ISAAC MARTINEZ AMAYA",
    token: "000AMB",
    sheetId: "1EiJYr1Byvlz1gXJdLhhqHHqkJTjcWi-_27kGNSsI_kA",
    url: "https://docs.google.com/spreadsheets/d/1EiJYr1Byvlz1gXJdLhhqHHqkJTjcWi-_27kGNSsI_kA/edit?usp=sharing",
  },
  "sup-2": {
    id: "sup-2",
    nombre: "SALVADOR RENDEROS BONILLA",
    token: "000SR0",
    sheetId: "1epJWEXl0sGWhdyx3IvDAqzOgrZZoxkUxCWkU9Srx4Ok",
    url: "https://docs.google.com/spreadsheets/d/1epJWEXl0sGWhdyx3IvDAqzOgrZZoxkUxCWkU9Srx4Ok/edit?usp=sharing",
  },
};

// URL del Webhook de Google Apps Script (cuando el usuario la configure en .env o localStorage)
const DEFAULT_APPS_SCRIPT_URL =
  (typeof import.meta !== "undefined" && import.meta?.env?.VITE_GOOGLE_SHEETS_API_URL) ||
  "https://script.google.com/macros/s/AKfycbxUpY1ZWCJTN8ahWDTE7WvwFr-D4x_v8wAIwCBr5rFob4_ls8CjnPpt042U1Q-_vc0oeA/exec";

// Claves de persistencia para configuración dinámica
const STORAGE_KEY_SHEETS_URL = "DOCTORSV_GOOGLE_SHEETS_URL";
const STORAGE_KEY_SHEET_IDS = "DOCTORSV_GOOGLE_SHEET_IDS";
const STORAGE_KEY_SUPERVISOR_SHEETS = "DOCTORSV_SUPERVISOR_SHEETS_CONFIG";

/**
 * Obtiene la URL activa del Webhook de Google Apps Script
 */
export function getSheetsApiUrl() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SHEETS_URL);
    if (saved && saved.trim()) return saved.trim();
  } catch {}
  return DEFAULT_APPS_SCRIPT_URL;
}

/**
 * Guarda o actualiza la URL del Webhook de Google Sheets dinámicamente
 */
export function setSheetsApiUrl(url) {
  try {
    if (url) {
      localStorage.setItem(STORAGE_KEY_SHEETS_URL, url.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_SHEETS_URL);
    }
  } catch {}
}

/**
 * Verifica si la conexión con Google Sheets está configurada
 */
export function isSheetsConfigured() {
  return !!getSheetsApiUrl();
}

export const isGoogleSheetsConfigured = isSheetsConfigured;

/**
 * Guarda los IDs de las hojas individuales de Google Sheets
 */
export function setGoogleSheetIds(ids) {
  try {
    localStorage.setItem(STORAGE_KEY_SHEET_IDS, JSON.stringify(ids));
  } catch {}
}

export function getGoogleSheetIds() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SHEET_IDS);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

/**
 * Lee el inventario de 140 puestos en vivo desde Google Sheets
 */
export async function fetchSpacesFromGoogleSheets() {
  const url = getSheetsApiUrl();
  if (!url) return { success: false, data: [] };

  try {
    const res = await fetch(`${url}?action=getSpaces&_t=${Date.now()}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    if (data && data.success && Array.isArray(data.spaces)) {
      const sanitized = data.spaces.map((s) => {
        const sid = Number(s.id);
        const isDisponible = s.estado === "DISPONIBLE";
        const hasPc = Boolean(s.marca && s.marca !== "NO PC");
        return {
          ...s,
          mouse: s.mouse === true || s.mouse === 1 || s.mouse === "1",
          headset: s.headset === true || s.headset === 1 || s.headset === "1",
          hub: s.hub === true || s.hub === 1 || s.hub === "1",
          marca: (isDisponible && (!s.marca || s.marca === "NO PC")) ? "DELL" : (s.marca || (!hasPc ? "NO PC" : "DELL")),
          modelo: (isDisponible && !s.modelo) ? "OptiPlex 3080" : s.modelo,
          categoria: sid === 1 ? null : s.categoria,
        };
      });
      return { success: true, data: sanitized, count: sanitized.length };
    }
    return { success: false, data: [] };
  } catch (error) {
    console.warn("No se pudo obtener datos de Google Sheets (usando local):", error);
    return { success: false, data: [] };
  }
}

/**
 * Actualiza el estado de un puesto y sus periféricos (1/0) en Google Sheets
 */
export async function updateSpaceInGoogleSheets(space) {
  const url = getSheetsApiUrl();
  if (!url || !space) return false;

  const hasMonitor = Boolean(space.monitor && (space.monitor.marca || space.monitor.activo || space.monitor === true));
  const monitorActivo = (space.monitor && typeof space.monitor === "object") ? (space.monitor.activo || "") : "";
  const monitorMarca = (space.monitor && typeof space.monitor === "object") ? (space.monitor.marca || "") : "";

  // 1 = Sí tiene, 0 = No tiene (Formato oficial del Google Sheet en columnas F, G, H, K)
  const mouseVal = space.mouse !== undefined ? ((space.mouse === true || space.mouse === 1 || space.mouse === "1") ? 1 : 0) : undefined;
  const headsetVal = space.headset !== undefined ? ((space.headset === true || space.headset === 1 || space.headset === "1") ? 1 : 0) : undefined;
  const hubVal = space.hub !== undefined ? ((space.hub === true || space.hub === 1 || space.hub === "1") ? 1 : 0) : undefined;
  const monitorVal = space.monitor !== undefined ? (hasMonitor ? 1 : 0) : undefined;

  const payload = {
    action: "updateSpace",
    spaceId: Number(space.id || space.spaceId),
    estado: space.estado || "DISPONIBLE",
    doctor: space.doctor !== undefined ? space.doctor : undefined,
    horario: space.horario !== undefined ? space.horario : undefined,
    marca: space.marca !== undefined ? space.marca : undefined,
    modelo: space.modelo !== undefined ? space.modelo : undefined,
    activoPc: space.activoPc !== undefined ? space.activoPc : undefined,
    mouse: mouseVal,
    headset: headsetVal,
    hub: hubVal,
    monitor: monitorVal,
    activoMonitor: monitorActivo || undefined,
    marcaMonitor: monitorMarca || undefined,
    observaciones: space.observaciones !== undefined ? space.observaciones : undefined,
    timestamp: new Date().toISOString(),
  };

  Object.keys(payload).forEach((k) => {
    if (payload[k] === undefined) delete payload[k];
  });

  // 1. Envío POST con mode: no-cors para evitar bloqueos por redirección de Google Apps Script
  try {
    const postRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      mode: "no-cors",
    });
    if (postRes) return true;
  } catch (err) {}

  // 2. Fallback GET con URLSearchParams (Garantiza que Google Apps Script reciba los parámetros aún en redirecciones 302)
  try {
    const params = new URLSearchParams();
    Object.entries(payload).forEach(([k, v]) => {
      params.append(k, String(v));
    });
    await fetch(`${url}?${params.toString()}`, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
    });
    return true;
  } catch (err) {
    console.warn("Aviso al sincronizar puesto con Google Sheets:", err);
    return false;
  }
}

/**
 * Actualiza una lista de puestos en Google Sheets de forma agrupada (batch)
 * preservando periféricos y datos de hardware que no se hayan modificado.
 */
export async function updateSpacesBatchInGoogleSheets(spacesList) {
  const url = getSheetsApiUrl();
  if (!url || !Array.isArray(spacesList) || spacesList.length === 0) return false;

  const payload = spacesList.map((space) => {
    const sid = space.spaceId !== undefined ? Number(space.spaceId) : Number(space.id);
    const hasMonitor = space.monitor !== undefined
      ? Boolean(space.monitor && (space.monitor.marca || space.monitor.activo || space.monitor === true || space.monitor === 1 || space.monitor === "1"))
      : undefined;

    const item = {
      spaceId: sid,
      id: sid,
      timestamp: new Date().toISOString(),
    };

    if (space.estado !== undefined) item.estado = space.estado;
    if (space.doctor !== undefined) item.doctor = space.doctor;
    if (space.horario !== undefined) item.horario = space.horario;
    if (space.marca !== undefined) item.marca = space.marca;
    if (space.modelo !== undefined) item.modelo = space.modelo;
    if (space.activoPc !== undefined) item.activoPc = space.activoPc;

    if (space.mouse !== undefined) {
      item.mouse = (space.mouse === true || space.mouse === 1 || space.mouse === "1") ? 1 : 0;
    }
    if (space.headset !== undefined) {
      item.headset = (space.headset === true || space.headset === 1 || space.headset === "1") ? 1 : 0;
    }
    if (space.hub !== undefined) {
      item.hub = (space.hub === true || space.hub === 1 || space.hub === "1") ? 1 : 0;
    }
    if (hasMonitor !== undefined) {
      item.monitor = hasMonitor ? 1 : 0;
    }
    if (space.monitor && typeof space.monitor === "object") {
      if (space.monitor.activo !== undefined) item.activoMonitor = space.monitor.activo;
      if (space.monitor.marca !== undefined) item.marcaMonitor = space.monitor.marca;
    }
    if (space.observaciones !== undefined) item.observaciones = space.observaciones;

    return item;
  });

  // 1. Envío de lote atómico con acción updateSpacesBatch vía POST
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "updateSpacesBatch",
        spaces: payload,
      }),
      mode: "no-cors",
    });
    if (res) return true;
  } catch (err) {
    console.warn("Aviso en updateSpacesBatch POST:", err);
  }

  // 2. Fallback GET con payload serializado
  try {
    const encoded = encodeURIComponent(JSON.stringify(payload));
    await fetch(`${url}?action=updateSpacesBatch&spaces=${encoded}&_t=${Date.now()}`, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
    });
    return true;
  } catch (err2) {
    console.warn("Aviso en updateSpacesBatch GET fallback:", err2);
    return false;
  }
}

/**
 * Registra un movimiento o relevo en la hoja de historial de Google Sheets
 */
export async function logMovementToGoogleSheets(movement) {
  const url = getSheetsApiUrl();
  if (!url) return false;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "logMovement",
        movement: {
          fecha: movement.fecha || new Date().toLocaleDateString("es-SV"),
          equipo: movement.equipo || "PC",
          espacio: movement.espacio || "",
          accion: movement.accion || "Movimiento",
          origen: movement.origen || "N/A",
          destino: movement.destino || "N/A",
          falla: movement.falla || "N/A",
          obs: movement.obs || "",
        },
      }),
    });
    return true;
  } catch (error) {
    console.warn("Error al registrar movimiento en Google Sheets:", error);
    return false;
  }
}

/**
 * Lee el padrón de médicos desde Google Sheets
 */
export async function fetchDoctorsFromGoogleSheets() {
  const url = getSheetsApiUrl();
  if (!url) return null;

  try {
    const res = await fetch(`${url}?action=getDoctors`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.success && Array.isArray(data.doctors) ? data.doctors : null;
  } catch (error) {
    return null;
  }
}

/**
 * Agrega un nuevo miembro del personal al padrón en Google Sheets
 */
export async function addStaffToGoogleSheets(staffMember) {
  const url = getSheetsApiUrl();
  if (!url) return false;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "addStaff",
        staff: staffMember,
      }),
    });
    return true;
  } catch (error) {
    console.warn("Error al agregar personal en Google Sheets:", error);
    return false;
  }
}

/**
 * =========================================================================
 * INTEGRACIÓN EN VIVO CON HOJAS DE GOOGLE SHEETS DE SUPERVISORES (SP)
 * =========================================================================
 */

/**
 * Extrae el ID de una Google Sheet a partir de una URL o cadena limpia
 */
export function extractGoogleSheetId(input) {
  if (!input || typeof input !== "string") return "";
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9-_]{20,60}$/.test(trimmed)) return trimmed;
  return trimmed;
}

/**
 * Obtiene la configuración actual de hojas de Google Sheets por supervisor
 */
export function getSupervisorSheetConfigs() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SUPERVISOR_SHEETS);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SUPERVISOR_SHEETS, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_SUPERVISOR_SHEETS };
}

/**
 * Guarda la configuración de hojas de supervisores
 */
export function saveSupervisorSheetConfigs(configs) {
  try {
    localStorage.setItem(STORAGE_KEY_SUPERVISOR_SHEETS, JSON.stringify(configs));
  } catch {}
}

/**
 * Actualiza la URL o ID de Google Sheets para un supervisor
 */
export function updateSupervisorSheetUrl(supId, newUrlOrId) {
  const current = getSupervisorSheetConfigs();
  const cleanId = extractGoogleSheetId(newUrlOrId);
  if (current[supId]) {
    current[supId] = {
      ...current[supId],
      sheetId: cleanId,
      url: newUrlOrId && newUrlOrId.includes("http")
        ? newUrlOrId.trim()
        : `https://docs.google.com/spreadsheets/d/${cleanId}/edit?usp=sharing`,
    };
    saveSupervisorSheetConfigs(current);
  }
  return current;
}

/**
 * Descarga el contenido CSV en vivo de una Google Sheet usando la API pública de visualización
 */
export async function fetchSupervisorSheetCsv(sheetIdOrUrl) {
  const sheetId = extractGoogleSheetId(sheetIdOrUrl);
  if (!sheetId) throw new Error("ID o enlace de Google Sheet no válido.");
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&_t=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Error HTTP ${res.status} al descargar datos de Google Sheets.`);
  return await res.text();
}

/**
 * Sincroniza todas las hojas de Google Sheets de los supervisores y las fusiona en una Quincena unificada
 */
export async function syncSupervisorSheets({
  doctorsList = DOCTORES_EXCEL,
  staffList = STAFF_EXCEL,
  supervisoresList = SUPERVISORES_OFICIALES,
  customConfigs = null,
} = {}) {
  const configs = customConfigs || getSupervisorSheetConfigs();
  const results = [];
  const mergedDiasMap = {};

  for (const supKey of Object.keys(configs)) {
    const conf = configs[supKey];
    if (!conf?.sheetId && !conf?.url) continue;

    try {
      const csv = await fetchSupervisorSheetCsv(conf.sheetId || conf.url);
      const parsed = parseQuincenaSpreadsheet(csv, doctorsList, staffList, supervisoresList);

      if (parsed.success && parsed.dias && parsed.dias.length > 0) {
        const actualSupId = parsed.supervisorId || parsed.supervisoresDetectados?.[0]?.id || conf.id;
        const actualSupNombre = parsed.supervisorNombre || parsed.supervisoresDetectados?.[0]?.nombre || conf.nombre;

        parsed.dias.forEach((dia) => {
          if (!mergedDiasMap[dia.dateKey]) {
            mergedDiasMap[dia.dateKey] = {
              dateKey: dia.dateKey,
              label: dia.label,
              dayNum: dia.dayNum,
              monthNum: dia.monthNum,
              year: dia.year,
              diaSemana: dia.diaSemana || "",
              porSupervisor: {},
            };
          }

          if (dia.porSupervisor && dia.porSupervisor[actualSupId]) {
            mergedDiasMap[dia.dateKey].porSupervisor[actualSupId] = dia.porSupervisor[actualSupId];
          }
        });

        results.push({
          supId: actualSupId,
          nombre: actualSupNombre,
          success: true,
          dias: parsed.dias.length,
          estadisticas: parsed.estadisticas,
        });
      } else {
        results.push({
          supId: conf.id,
          nombre: conf.nombre,
          success: false,
          error: parsed.error || "No se detectaron días válidos en la hoja.",
        });
      }
    } catch (err) {
      results.push({
        supId: conf.id,
        nombre: conf.nombre,
        success: false,
        error: err.message,
      });
    }
  }

  const successfulSups = results.filter((r) => r.success);

  // Garantizar que cada supervisor tenga su entrada oficial en cada uno de los 15 días (incluso si tiene 0 médicos)
  Object.values(mergedDiasMap).forEach((dia) => {
    successfulSups.forEach((sup) => {
      if (!dia.porSupervisor[sup.supId]) {
        dia.porSupervisor[sup.supId] = {
          supervisorId: sup.supId,
          supervisorNombre: sup.nombre,
          doctorNames: [],
          doctores: [],
          totalDoctores: 0,
        };
      }
    });
  });

  const mergedDias = Object.values(mergedDiasMap).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  if (mergedDias.length === 0) {
    return {
      success: false,
      error: "No se pudieron obtener datos de las hojas de Google Sheets. Verifica los permisos de acceso o la conexión a internet.",
      results,
    };
  }

  const totalAsignaciones = results.reduce((acc, r) => acc + (r.estadisticas?.totalLineasParseadas || 0), 0);
  const totalReconocidos = results.reduce((acc, r) => acc + (r.estadisticas?.totalReconocidos || 0), 0);
  const rate = totalAsignaciones > 0 ? ((totalReconocidos / totalAsignaciones) * 100).toFixed(1) : "100.0";

  const quincena = {
    id: `quincena_gs_${Date.now()}`,
    titulo: `Nómina Oficial Google Sheets (${mergedDias[0]?.label || ""} – ${mergedDias[mergedDias.length - 1]?.label || ""})`,
    source: "GOOGLE_SHEETS_LIVE",
    dias: mergedDias,
    diasDetectados: mergedDias.map((d) => d.dateKey),
    supervisoresDetectados: results.filter((r) => r.success).map((r) => ({
      id: r.supId,
      nombre: r.nombre,
      totalAsignaciones: r.estadisticas?.totalLineasParseadas || 0,
    })),
    estadisticas: {
      totalDias: mergedDias.length,
      totalSupervisores: results.filter((r) => r.success).length,
      totalLineasParseadas: totalAsignaciones,
      totalReconocidos,
      tasaReconocimiento: `${rate}%`,
    },
    updatedAt: new Date().toISOString(),
  };

  return {
    success: true,
    quincena,
    results,
  };
}
