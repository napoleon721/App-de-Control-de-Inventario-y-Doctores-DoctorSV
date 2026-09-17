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

/**
 * Normaliza nombres de doctores removiendo acentos, títulos y caracteres especiales
 */
export function normalizeDocName(name) {
  if (!name) return "";
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remueve tildes y diacríticos: é -> e, etc.
    .replace(/^(DR(A)?\.|DOCTOR(A)?)\s*/i, "") // Remueve prefijos Dr. / Dra.
    .replace(/\s*\([^)]*\)/g, "") // Remueve anotaciones entre paréntesis ej. (Supervisor)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " "); // Colapsa espacios múltiples
}

/**
 * Compara inteligentemente si dos representaciones de nombre corresponden al mismo médico
 * Resuelve discrepancias como Google Auth ("Adilia Chavez") vs Excel ("DRA. ADILIA ELIZABETH CHÁVEZ RAMOS")
 */
export function isSameDoctor(nameA, nameB) {
  const normA = normalizeDocName(nameA);
  const normB = normalizeDocName(nameB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;

  // Si uno contiene al otro completo
  if (normA.length >= 5 && normB.length >= 5) {
    if (normA.includes(normB) || normB.includes(normA)) return true;

    // Coincidencia por palabras significativas (nombre + apellido)
    const wordsA = normA.split(" ").filter((w) => w.length > 2);
    const wordsB = normB.split(" ").filter((w) => w.length > 2);
    const common = wordsA.filter((w) => wordsB.includes(w));
    if (common.length >= 2) return true;
  }

  return false;
}

/**
 * Normaliza una franja horaria para comparación tolerante a diferencias de guiones (– vs -),
 * espacios múltiples y mayúsculas/minúsculas.
 */
export function normalizeHorario(val) {
  if (!val) return "";
  return String(val)
    .replace(/[\u2013\u2014\u2212]/g, "-") // Normaliza en-dash, em-dash a guion normal "-"
    .replace(/\s+/g, " ")
    .toUpperCase()
    .trim();
}

/**
 * Compara dos cadenas de horario de forma tolerante
 */
export function isSameHorario(h1, h2) {
  const norm1 = normalizeHorario(h1);
  const norm2 = normalizeHorario(h2);
  if (!norm1 || !norm2) return false;
  return norm1 === norm2;
}
