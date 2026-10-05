/**
 * Servicio de conexión bidireccional con Google Sheets
 * Permite leer, editar, actualizar celdas y registrar movimientos en tiempo real.
 */

// URL del Webhook de Google Apps Script (cuando el usuario la configure en .env o localStorage)
const DEFAULT_APPS_SCRIPT_URL =
  import.meta.env.VITE_GOOGLE_SHEETS_API_URL ||
  "https://script.google.com/macros/s/AKfycbxUpY1ZWCJTN8ahWDTE7WvwFr-D4x_v8wAIwCBr5rFob4_ls8CjnPpt042U1Q-_vc0oeA/exec";

// Claves de persistencia para configuración dinámica
const STORAGE_KEY_SHEETS_URL = "DOCTORSV_GOOGLE_SHEETS_URL";
const STORAGE_KEY_SHEET_IDS = "DOCTORSV_GOOGLE_SHEET_IDS";

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
