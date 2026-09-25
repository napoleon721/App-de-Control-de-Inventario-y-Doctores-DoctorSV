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

const normDocNameCache = new Map();

/**
 * Normaliza nombres de doctores removiendo acentos, títulos y caracteres especiales (Memoizado)
 */
export function normalizeDocName(name) {
  if (!name) return "";
  const cached = normDocNameCache.get(name);
  if (cached !== undefined) return cached;

  const result = String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remueve tildes y diacríticos
    .replace(/^(DR(A)?\.|DOCTOR(A)?)\s*/i, "") // Remueve prefijos Dr. / Dra.
    .replace(/\s*\([^)]*\)/g, "") // Remueve anotaciones entre paréntesis
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " "); // Colapsa espacios múltiples

  if (normDocNameCache.size > 2000) normDocNameCache.clear();
  normDocNameCache.set(name, result);
  return result;
}

/**
 * Compara inteligentemente si dos representaciones de nombre corresponden al mismo médico
 */
export function isSameDoctor(nameA, nameB) {
  if (nameA === nameB) return true;
  if (!nameA || !nameB) return false;
  const normA = normalizeDocName(nameA);
  const normB = normalizeDocName(nameB);
  if (normA === normB) return true;

  const wordsA = normA.split(" ").filter((w) => w.length > 1);
  const wordsB = normB.split(" ").filter((w) => w.length > 1);
  if (wordsA.length === 0 || wordsB.length === 0) return false;

  const [shorter, longer] = wordsA.length <= wordsB.length ? [wordsA, wordsB] : [wordsB, wordsA];

  // Si el nombre más corto tiene al menos 3 palabras y TODAS están en el más largo (ej. "Rodrigo Angel Ramos" en "Rodrigo Eduardo Angel Ramos")
  if (shorter.length >= 3) {
    const allInLonger = shorter.every((w) => longer.includes(w));
    if (allInLonger) return true;
  }

  // Si el más corto tiene 2 palabras (Nombre + Apellido)
  if (shorter.length === 2 && longer.length <= 4) {
    if (shorter.every((w) => longer.includes(w))) {
      const lastWord = shorter[1];
      if (longer[longer.length - 1] === lastWord || longer[longer.length - 2] === lastWord) {
        return true;
      }
    }
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

/**
 * Determina a qué supervisor pertenece un médico según:
 * 1. Puesto físico donde está sentado (espacios)
 * 2. Nómina guardada por franja (`${supId}__${franja}`)
 * 3. Nómina general del supervisor (`${supId}`)
 */
export function getDoctorSupervisorInfo({
  docName,
  rosters = {},
  supervisores = [],
  spaces = [],
  filterHorario = null,
}) {
  if (!docName) return null;

  // 1. Revisar si el médico tiene un puesto físico asignado
  const seatedSpace = (spaces || []).find((s) => s.doctor && isSameDoctor(s.doctor, docName));
  if (seatedSpace) {
    let sup = null;
    if (seatedSpace.supervisorId) {
      sup = (supervisores || []).find((s) => s.id === seatedSpace.supervisorId);
    }
    if (!sup) {
      sup = (supervisores || []).find(
        (s) => Number(seatedSpace.id) >= Number(s.bloqueInicio) && Number(seatedSpace.id) <= Number(s.bloqueFin)
      );
    }
    return {
      supervisor: sup || null,
      supervisorId: sup?.id || seatedSpace.supervisorId || null,
      supervisorNombre: sup?.nombre || seatedSpace.supervisorNombre || "Supervisor de Turno",
      spaceId: Number(seatedSpace.id),
      horario: seatedSpace.horario || null,
      isSeated: true,
    };
  }

  // 2. Revisar nómina por franja horaria específica si aplica
  if (filterHorario && filterHorario !== "TODOS" && rosters) {
    for (const sup of (supervisores || [])) {
      const franjaKey = `${sup.id}__${filterHorario}`;
      const list = rosters[franjaKey];
      if (Array.isArray(list) && list.some((n) => isSameDoctor(n, docName))) {
        return {
          supervisor: sup,
          supervisorId: sup.id,
          supervisorNombre: sup.nombre,
          spaceId: null,
          horario: filterHorario,
          isSeated: false,
        };
      }
    }
  }

  // 3. Revisar nómina general por ID de supervisor
  if (rosters) {
    for (const sup of (supervisores || [])) {
      const list = rosters[sup.id];
      if (Array.isArray(list) && list.some((n) => isSameDoctor(n, docName))) {
        return {
          supervisor: sup,
          supervisorId: sup.id,
          supervisorNombre: sup.nombre,
          spaceId: null,
          horario: sup.activeFranja || sup.horario,
          isSeated: false,
        };
      }
    }
  }

  return null;
}

