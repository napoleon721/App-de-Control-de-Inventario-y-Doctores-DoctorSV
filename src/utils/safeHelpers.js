/**
 * Utilidades defensivas para evitar errores en tiempo de ejecución (TypeError)
 * ante datos nulos, números o cadenas no formateadas provenientes de Google Sheets o Firestore.
 */

export function safeStr(val, defaultVal = "") {
  if (val === null || val === undefined) return defaultVal;
  return String(val);
}

export function safeLower(val) {
  if (val === null || val === undefined) return "";
  return String(val).toLowerCase().trim();
}

export function safeTrim(val) {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

/**
 * Limpia el prefijo Dr. o Dra. de forma segura
 */
export function cleanDoctorName(name) {
  if (!name) return "";
  return String(name).replace(/^(DR(A)?\.|DOCTOR(A)?)\s*/i, "").trim();
}
