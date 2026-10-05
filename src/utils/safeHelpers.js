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
    .trim()
    .replace(/^((DR(A)?\.|DOCTOR(A)?|DR\(A\)\.?))\s*/i, "") // Remueve prefijos Dr. / Dra. / Dr(a).
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
    .replace(/\b0([1-9]):/g, "$1:") // Normaliza 07:00 a 7:00 para comparación uniforme
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

import { DOCTORES_EXCEL, SUPERVISORES_OFICIALES, getSPBlocks } from "../constants/tokens.js";

/**
 * Determina con máxima precisión a qué supervisor pertenece un médico según:
 * 1. Puesto físico con supervisorId explícito
 * 2. Nómina personalizada guardada por franja o general (rosters en Firestore/localStorage)
 * 3. Puesto físico asignado dentro del lote del supervisor
 * 4. Bloques oficiales de Servicios Profesionales (SP Emerson, SP Salvador, SP Alfredo, SP Reserva)
 * 5. Grupos de nómina oficial (Grupo 1 -> Emerson, Grupo 2 -> Salvador, Grupo 3 -> Alfredo, General -> Roxana)
 */
export function getDoctorSupervisorInfo({
  docName,
  rosters = {},
  supervisores = [],
  spaces = [],
  filterHorario = null,
}) {
  if (!docName) return null;
  const supsList = (supervisores && supervisores.length > 0) ? supervisores : SUPERVISORES_OFICIALES;

  // 1. Revisar si el médico tiene un puesto físico asignado
  const seatedSpace = (spaces || []).find((s) => s.doctor && isSameDoctor(s.doctor, docName));
  if (seatedSpace && seatedSpace.supervisorId) {
    const sup = supsList.find((s) => s.id === seatedSpace.supervisorId);
    return {
      supervisor: sup || null,
      supervisorId: seatedSpace.supervisorId,
      supervisorNombre: sup?.nombre || seatedSpace.supervisorNombre || "Supervisor de Turno",
      spaceId: Number(seatedSpace.id),
      horario: seatedSpace.horario || null,
      isSeated: true,
    };
  }

  // 2. Revisar nóminas personalizadas guardadas (rosters en Firestore / memoria)
  if (rosters && typeof rosters === "object") {
    // 2a. Por franja horaria específica si se especificó
    if (filterHorario && filterHorario !== "TODOS") {
      for (const sup of supsList) {
        const franjaKey = `${sup.id}__${filterHorario}`;
        const list = rosters[franjaKey];
        if (Array.isArray(list) && list.some((n) => isSameDoctor(n, docName))) {
          return {
            supervisor: sup,
            supervisorId: sup.id,
            supervisorNombre: sup.nombre,
            spaceId: seatedSpace ? Number(seatedSpace.id) : null,
            horario: filterHorario,
            isSeated: Boolean(seatedSpace),
          };
        }
      }
    }

    // 2b. Nómina general directa por ID de supervisor
    for (const sup of supsList) {
      const list = rosters[sup.id];
      if (Array.isArray(list) && list.some((n) => isSameDoctor(n, docName))) {
        return {
          supervisor: sup,
          supervisorId: sup.id,
          supervisorNombre: sup.nombre,
          spaceId: seatedSpace ? Number(seatedSpace.id) : null,
          horario: sup.activeFranja || sup.horario,
          isSeated: Boolean(seatedSpace),
        };
      }
    }

    // 2c. Búsqueda en cualquier franja guardada de los supervisores
    for (const [key, list] of Object.entries(rosters)) {
      if (Array.isArray(list) && list.some((n) => isSameDoctor(n, docName))) {
        const supId = key.split("__")[0];
        const sup = supsList.find((s) => s.id === supId);
        if (sup) {
          return {
            supervisor: sup,
            supervisorId: sup.id,
            supervisorNombre: sup.nombre,
            spaceId: seatedSpace ? Number(seatedSpace.id) : null,
            horario: key.includes("__") ? key.split("__")[1] : (sup.activeFranja || sup.horario),
            isSeated: Boolean(seatedSpace),
          };
        }
      }
    }
  }

  // 3. Si está sentado físicamente en un puesto del lote de un supervisor
  if (seatedSpace) {
    const sid = Number(seatedSpace.id);
    const supByLote = supsList.find(
      (s) => Number(s.bloqueInicio) > 0 && sid >= Number(s.bloqueInicio) && sid <= Number(s.bloqueFin)
    );
    if (supByLote) {
      return {
        supervisor: supByLote,
        supervisorId: supByLote.id,
        supervisorNombre: supByLote.nombre,
        spaceId: sid,
        horario: seatedSpace.horario || supByLote.horario,
        isSeated: true,
      };
    }
  }

  // 4. Fallback oficial: Bloques de Servicios Profesionales (SP)
  try {
    const spBlocks = getSPBlocks(DOCTORES_EXCEL);
    if (spBlocks["sup-1"]?.doctorNamesSet.has(docName)) {
      const sup = supsList.find((s) => s.id === "sup-1");
      return {
        supervisor: sup || null,
        supervisorId: "sup-1",
        supervisorNombre: sup?.nombre || "EMERSON JOSUE VIGIL HERNANDEZ",
        spaceId: seatedSpace ? Number(seatedSpace.id) : null,
        horario: "02:00 PM – 10:00 PM",
        isSeated: Boolean(seatedSpace),
      };
    }
    if (spBlocks["sup-2"]?.doctorNamesSet.has(docName)) {
      const sup = supsList.find((s) => s.id === "sup-2");
      return {
        supervisor: sup || null,
        supervisorId: "sup-2",
        supervisorNombre: sup?.nombre || "SALVADOR RENDEROS BONILLA",
        spaceId: seatedSpace ? Number(seatedSpace.id) : null,
        horario: "04:00 PM – 10:00 PM",
        isSeated: Boolean(seatedSpace),
      };
    }
    if (spBlocks["sup-3"]?.doctorNamesSet.has(docName)) {
      const sup = supsList.find((s) => s.id === "sup-3");
      return {
        supervisor: sup || null,
        supervisorId: "sup-3",
        supervisorNombre: sup?.nombre || "ALFREDO ISAAC MARTINEZ AMAYA",
        spaceId: seatedSpace ? Number(seatedSpace.id) : null,
        horario: "06:00 PM – 10:00 PM",
        isSeated: Boolean(seatedSpace),
      };
    }
    if (spBlocks["reserva"]?.doctorNamesSet.has(docName)) {
      const sup = supsList.find((s) => s.id === "sup-5");
      return {
        supervisor: sup || null,
        supervisorId: "sup-5",
        supervisorNombre: sup?.nombre || "EDWARD JOSUE ZELAYA PRUDENCIO",
        spaceId: seatedSpace ? Number(seatedSpace.id) : null,
        horario: "02:00 PM – 10:00 PM",
        isSeated: Boolean(seatedSpace),
      };
    }
  } catch {}

  // 5. Fallback oficial: Grupos clínicos de DOCTORES_EXCEL
  const docObj = (DOCTORES_EXCEL || []).find((d) => isSameDoctor(d.nombre, docName));
  if (docObj?.grupo) {
    if (docObj.grupo === "Grupo 1") {
      const sup = supsList.find((s) => s.id === "sup-1");
      return {
        supervisor: sup || null,
        supervisorId: "sup-1",
        supervisorNombre: sup?.nombre || "EMERSON JOSUE VIGIL HERNANDEZ",
        spaceId: seatedSpace ? Number(seatedSpace.id) : null,
        horario: "06:00 AM – 02:00 PM",
        isSeated: Boolean(seatedSpace),
      };
    }
    if (docObj.grupo === "Grupo 2") {
      const sup = supsList.find((s) => s.id === "sup-2");
      return {
        supervisor: sup || null,
        supervisorId: "sup-2",
        supervisorNombre: sup?.nombre || "SALVADOR RENDEROS BONILLA",
        spaceId: seatedSpace ? Number(seatedSpace.id) : null,
        horario: "02:00 PM – 10:00 PM",
        isSeated: Boolean(seatedSpace),
      };
    }
    if (docObj.grupo === "Grupo 3") {
      const sup = supsList.find((s) => s.id === "sup-3");
      return {
        supervisor: sup || null,
        supervisorId: "sup-3",
        supervisorNombre: sup?.nombre || "ALFREDO ISAAC MARTINEZ AMAYA",
        spaceId: seatedSpace ? Number(seatedSpace.id) : null,
        horario: "08:00 AM – 12:00 MD",
        isSeated: Boolean(seatedSpace),
      };
    }
    if (docObj.grupo === "Grupo General") {
      const sup = supsList.find((s) => s.id === "sup-4");
      return {
        supervisor: sup || null,
        supervisorId: "sup-4",
        supervisorNombre: sup?.nombre || "ROXANA GUADALUPE CANALES RODRIGUEZ",
        spaceId: seatedSpace ? Number(seatedSpace.id) : null,
        horario: "07:00 AM – 12:00 PM",
        isSeated: Boolean(seatedSpace),
      };
    }
  }

  return null;
}


