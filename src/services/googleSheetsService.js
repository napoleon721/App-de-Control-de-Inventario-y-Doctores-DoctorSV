/**
 * Servicio de conexión bidireccional con Google Sheets
 * Permite leer, editar, actualizar celdas y registrar movimientos en tiempo real.
 */

// URL del Webhook de Google Apps Script (cuando el usuario la configure en .env o localStorage)
const DEFAULT_APPS_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SHEETS_API_URL || "";

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
      return { success: true, data: data.spaces, count: data.spaces.length };
    }
    return { success: false, data: [] };
  } catch (error) {
    console.warn("No se pudo obtener datos de Google Sheets (usando local):", error);
    return { success: false, data: [] };
  }
}

/**
 * Actualiza el estado de un puesto en Google Sheets (editar celda / asignar doctor)
 */
export async function updateSpaceInGoogleSheets(space) {
  const url = getSheetsApiUrl();
  if (!url) return false;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "updateSpace",
        spaceId: space.id,
        estado: space.estado,
        doctor: space.doctor || "",
        horario: space.horario || "",
        marca: space.marca || "",
        observaciones: space.observaciones || "",
        timestamp: new Date().toISOString(),
      }),
    });
    return true;
  } catch (error) {
    console.warn("Error al actualizar puesto en Google Sheets:", error);
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
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "addStaff",
        staff: staffMember,
      }),
    });
    return true;
  } catch (error) {
    return false;
  }
}
