import { isSameDoctor, isSameHorario, normalizeDocName } from "./safeHelpers.js";

/**
 * Semilla Oficial de Octubre 2026 extraída directamente de la hoja oficial "RESUMEN SAN MIGUEL"
 */
export const DEFAULT_DAILY_LOTS = {
  "2026-10-01": [
    {
      id: "dl-2026-10-01-1",
      fecha: "01/10/2026",
      dateKey: "2026-10-01",
      tipo: "PLANILLA_FIJA",
      grupo: "GRUPO 1",
      numMedicos: 27,
      bloqueInicio: 104,
      bloqueFin: 131,
      totalPuestos: 28,
      horario: "06:00 AM – 02:00 PM",
      supervisorNombre: null,
      supervisorId: null,
    },
    {
      id: "dl-2026-10-01-2",
      fecha: "01/10/2026",
      dateKey: "2026-10-01",
      tipo: "SERVICIOS_PROFESIONALES",
      grupo: "SP",
      numMedicos: 19,
      bloqueInicio: 84,
      bloqueFin: 103,
      totalPuestos: 20,
      horario: "02:00 PM – 10:00 PM",
      supervisorNombre: "ALFREDO ISAAC MARTINEZ AMAYA",
      supervisorId: "sup-3",
    },
    {
      id: "dl-2026-10-01-3",
      fecha: "01/10/2026",
      dateKey: "2026-10-01",
      tipo: "SERVICIOS_PROFESIONALES",
      grupo: "SP",
      numMedicos: 20,
      bloqueInicio: 63,
      bloqueFin: 83,
      totalPuestos: 21,
      horario: "02:00 PM – 10:00 PM",
      supervisorNombre: "EMERSON JOSUE VIGIL HERNANDEZ",
      supervisorId: "sup-1",
    },
    {
      id: "dl-2026-10-01-4",
      fecha: "01/10/2026",
      dateKey: "2026-10-01",
      tipo: "SERVICIOS_PROFESIONALES",
      grupo: "SP",
      numMedicos: 18,
      bloqueInicio: 38,
      bloqueFin: 56,
      totalPuestos: 19,
      horario: "04:00 PM – 10:00 PM",
      supervisorNombre: "EMERSON JOSUE VIGIL HERNANDEZ",
      supervisorId: "sup-1",
    },
  ],
  "2026-10-02": [
    {
      id: "dl-2026-10-02-1",
      fecha: "02/10/2026",
      dateKey: "2026-10-02",
      tipo: "PLANILLA_FIJA",
      grupo: "GRUPO 1",
      numMedicos: 27,
      bloqueInicio: 104,
      bloqueFin: 131,
      totalPuestos: 28,
      horario: "06:00 AM – 02:00 PM",
      supervisorNombre: null,
      supervisorId: null,
    },
    {
      id: "dl-2026-10-02-2",
      fecha: "02/10/2026",
      dateKey: "2026-10-02",
      tipo: "PLANILLA_FIJA",
      grupo: "GRUPO 2",
      numMedicos: 28,
      bloqueInicio: 74,
      bloqueFin: 103,
      totalPuestos: 29,
      horario: "06:00 AM – 02:00 PM",
      supervisorNombre: null,
      supervisorId: null,
    },
    {
      id: "dl-2026-10-02-3",
      fecha: "02/10/2026",
      dateKey: "2026-10-02",
      tipo: "SERVICIOS_PROFESIONALES",
      grupo: "SP",
      numMedicos: 40,
      bloqueInicio: 91,
      bloqueFin: 131,
      totalPuestos: 41,
      horario: "02:00 PM – 10:00 PM",
      supervisorNombre: "SALVADOR RENDEROS BONILLA",
      supervisorId: "sup-2",
    },
    {
      id: "dl-2026-10-02-4",
      fecha: "02/10/2026",
      dateKey: "2026-10-02",
      tipo: "SERVICIOS_PROFESIONALES",
      grupo: "SP",
      numMedicos: 22,
      bloqueInicio: 68,
      bloqueFin: 90,
      totalPuestos: 23,
      horario: "04:00 PM – 10:00 PM",
      supervisorNombre: "ALFREDO ISAAC MARTINEZ AMAYA",
      supervisorId: "sup-3",
    },
    {
      id: "dl-2026-10-02-5",
      fecha: "02/10/2026",
      dateKey: "2026-10-02",
      tipo: "SERVICIOS_PROFESIONALES",
      grupo: "SP",
      numMedicos: 37,
      bloqueInicio: 30,
      bloqueFin: 67,
      totalPuestos: 38,
      horario: "06:00 PM – 10:00 PM",
      supervisorNombre: "EMERSON JOSUE VIGIL HERNANDEZ",
      supervisorId: "sup-1",
    },
  ],
};

/**
 * Normaliza una cadena de fecha hacia formato YYYY-MM-DD
 */
export function normalizeDateToKey(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();

  // Caso YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Caso DD/MM/YYYY o D/M/YYYY
  const dmMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmMatch) {
    const day = dmMatch[1].padStart(2, "0");
    const month = dmMatch[2].padStart(2, "0");
    const year = dmMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Caso en texto en español: "viernes, 2 de octubre de 2026"
  const meses = {
    enero: "01", febrero: "02", marzo: "03", abril: "04",
    mayo: "05", junio: "06", julio: "07", agosto: "08",
    septiembre: "09", setiembre: "09", octubre: "10", noviembre: "11", diciembre: "12"
  };
  const textMatch = s.toLowerCase().match(/(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/);
  if (textMatch) {
    const day = textMatch[1].padStart(2, "0");
    const mStr = textMatch[2];
    const year = textMatch[3];
    const month = meses[mStr] || "10";
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * Normaliza una franja horaria hacia los formatos estándar de DoctorSV
 */
export function normalizeShiftString(rawShift) {
  if (!rawShift) return "06:00 AM – 02:00 PM";
  const s = String(rawShift).toLowerCase().replace(/\s+/g, "");

  if (s.includes("6:00am") || s.includes("06:00am") || s.includes("6am") || s.includes("mañana")) {
    return "06:00 AM – 02:00 PM";
  }
  if (s.includes("02:00pm-10:00pm") || s.includes("2:00pm-10:00pm") || s.includes("2pm-10pm")) {
    return "02:00 PM – 10:00 PM";
  }
  if (s.includes("04:00pm-10:00pm") || s.includes("4:00pm-10:00pm") || s.includes("4pm-10pm")) {
    return "04:00 PM – 10:00 PM";
  }
  if (s.includes("06:00pm-10:00pm") || s.includes("6:00pm-10:00pm") || s.includes("6pm-10pm")) {
    return "06:00 PM – 10:00 PM";
  }
  if (s.includes("08:00am-12:00") || s.includes("8am-12pm")) {
    return "08:00 AM – 12:00 MD";
  }
  if (s.includes("07:00am-12:00") || s.includes("7am-12pm")) {
    return "07:00 AM – 12:00 PM";
  }

  // Devolver con guion formal
  return rawShift.replace(/-/g, " – ").toUpperCase();
}

/**
 * Empareja un nombre de supervisor con la lista oficial
 */
export function matchSupervisor(rawName, supervisores = []) {
  if (!rawName) return null;
  const clean = normalizeDocName(rawName);

  for (const sup of supervisores) {
    const cleanSup = normalizeDocName(sup.nombre);
    if (clean.includes(cleanSup) || cleanSup.includes(clean)) {
      return sup;
    }
    // Coincidencia por apellidos principales
    if (clean.includes("EMERSON") || clean.includes("VIGIL")) {
      if (sup.id === "sup-1") return sup;
    }
    if (clean.includes("RENDEROS") || clean.includes("SALVADOR")) {
      if (sup.id === "sup-2") return sup;
    }
    if (clean.includes("ALFREDO") || clean.includes("MARTINEZ AMAYA")) {
      if (sup.id === "sup-3") return sup;
    }
    if (clean.includes("CANALES") || clean.includes("ROXANA")) {
      if (sup.id === "sup-4") return sup;
    }
    if (clean.includes("ZELAYA") || clean.includes("EDWARD")) {
      if (sup.id === "sup-5") return sup;
    }
  }
  return null;
}

/**
 * Analiza texto pegado desde la hoja de Google Sheets "RESUMEN SAN MIGUEL"
 */
export function parseDailyLotsSpreadsheet(rawText, supervisores = []) {
  if (!rawText || typeof rawText !== "string") {
    return { success: false, error: "El texto ingresado está vacío." };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { success: false, error: "No se encontraron líneas de texto válidas." };
  }

  const resultByDate = {};
  let currentDateKey = null;
  let currentDateDisplay = null;
  let currentSection = "SERVICIOS_PROFESIONALES"; // "PLANILLA_FIJA" o "SERVICIOS_PROFESIONALES"
  let parsedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // 1. Detección de encabezado de sección
    if (lower.includes("planilla fija")) {
      currentSection = "PLANILLA_FIJA";
      continue;
    }
    if (lower.includes("servicios profesionales") || lower === "sp") {
      currentSection = "SERVICIOS_PROFESIONALES";
      continue;
    }

    // 2. Detección de fila de encabezados de tabla
    if (lower.includes("fecha") && lower.includes("grupos") && lower.includes("ubicacion")) {
      continue;
    }
    if (lower === "horario" || lower.startsWith("horario\t")) {
      continue;
    }

    // 3. Detección de fecha en cabecera independiente (ej. "viernes, 2 de octubre de 2026" o "01/10/2026")
    const headerDateKey = normalizeDateToKey(line);
    if (headerDateKey && !line.includes("\t")) {
      currentDateKey = headerDateKey;
      currentDateDisplay = line;
      if (!resultByDate[currentDateKey]) {
        resultByDate[currentDateKey] = [];
      }
      continue;
    }

    // 4. Procesar fila con celdas (separadas por tabulación o múltiples espacios)
    const cells = line.split("\t").map((c) => c.trim());
    if (cells.length < 3) {
      // Intentar dividir por 2 o más espacios si vino copiado sin tabs
      const spaceCells = line.split(/\s{2,}/).map((c) => c.trim());
      if (spaceCells.length >= 4) {
        processRow(spaceCells);
      }
      continue;
    }

    processRow(cells);
  }

  function processRow(cells) {
    // Columnas típicas:
    // [0] FECHA (ej: 01/10/2026)
    // [1] GRUPOS (ej: GRUPO 1, GRUPO 2, SP)
    // [2] # DE MEDICOS (ej: 27, 19, 20)
    // [3] UBICACION (ej: 104 - 131 (28), 84 - 103 (20))
    // [4] HORARIO (ej: 06:00am-02:00pm, 02:00pm-10:00pm)
    // [5] SUPERVISOR (ej: ALFREDO ISAAC MARTINEZ AMAYA)

    let fechaStr = cells[0];
    let rowDateKey = normalizeDateToKey(fechaStr) || currentDateKey;
    if (rowDateKey) {
      currentDateKey = rowDateKey;
      currentDateDisplay = fechaStr;
    }

    if (!currentDateKey) {
      // Si la primera celda no es fecha pero tenemos fecha activa, continuar
      return;
    }

    let grupo = cells[1] || "";
    let numMedicos = parseInt(cells[2], 10) || null;
    let ubicacionStr = cells[3] || "";
    let horarioStr = cells[4] || "";
    let supervisorStr = cells[5] || "";

    // Si las celdas se desplazaron porque falta fecha en la fila
    if (!ubicacionStr.match(/\d+[\s\-–—aA]+\d+/) && cells[2]?.match(/\d+[\s\-–—aA]+\d+/)) {
      grupo = cells[0];
      numMedicos = parseInt(cells[1], 10) || null;
      ubicacionStr = cells[2];
      horarioStr = cells[3] || "";
      supervisorStr = cells[4] || "";
    }

    // Extraer bloque inicio, fin y total puestos
    // Ej: "104 - 131 (28)" o "91 -131 (41)" o "30 -67 (38)"
    const matchUbic = ubicacionStr.match(/(\d{1,3})\s*[-–—aA]\s*(\d{1,3})(?:\s*\((\d{1,3})\))?/);
    if (!matchUbic) {
      return;
    }

    const bloqueInicio = parseInt(matchUbic[1], 10);
    const bloqueFin = parseInt(matchUbic[2], 10);
    const totalPuestos = matchUbic[3]
      ? parseInt(matchUbic[3], 10)
      : (bloqueFin - bloqueInicio + 1);

    const horarioNorm = normalizeShiftString(horarioStr);
    const supObj = matchSupervisor(supervisorStr, supervisores);

    let tipo = currentSection;
    if (grupo.toUpperCase().includes("GRUPO")) {
      tipo = "PLANILLA_FIJA";
    } else if (grupo.toUpperCase() === "SP" || supervisorStr) {
      tipo = "SERVICIOS_PROFESIONALES";
    }

    const entry = {
      id: `dl-${currentDateKey}-${bloqueInicio}-${bloqueFin}`,
      fecha: currentDateDisplay || currentDateKey,
      dateKey: currentDateKey,
      tipo,
      grupo: grupo ? grupo.toUpperCase() : (tipo === "PLANILLA_FIJA" ? "PLANILLA" : "SP"),
      numMedicos: numMedicos || totalPuestos,
      bloqueInicio,
      bloqueFin,
      totalPuestos,
      horario: horarioNorm,
      supervisorNombre: supObj ? supObj.nombre : (supervisorStr || null),
      supervisorId: supObj ? supObj.id : null,
    };

    if (!resultByDate[currentDateKey]) {
      resultByDate[currentDateKey] = [];
    }

    // Evitar duplicados de rango y franja para el mismo día
    const exists = resultByDate[currentDateKey].some(
      (e) => e.bloqueInicio === bloqueInicio && e.bloqueFin === bloqueFin && isSameHorario(e.horario, horarioNorm)
    );
    if (!exists) {
      resultByDate[currentDateKey].push(entry);
      parsedCount++;
    }
  }

  if (parsedCount === 0) {
    return {
      success: false,
      error: "No se pudieron extraer distribuciones de puestos válidas. Asegúrate de incluir las columnas 'UBICACIÓN' (ej: 84 - 103) y 'HORARIO'.",
    };
  }

  return {
    success: true,
    totalEntries: parsedCount,
    dates: Object.keys(resultByDate).sort(),
    dailyLots: resultByDate,
  };
}

/**
 * Busca de manera inteligente el lote asignado a un supervisor para una fecha y franja horaria determinada
 */
export function findDailyLotForSupervisor(dailyLots, dateKey, supervisorId, supervisorName = null, filterHorario = null) {
  const lots = findDailyLotsForSupervisor(dailyLots, dateKey, supervisorId, supervisorName, filterHorario);
  return lots.length > 0 ? lots[0] : null;
}

/**
 * Retorna todos los lotes asignados a un supervisor para una fecha (permite múltiples franjas y bloques en el mismo día)
 */
export function findDailyLotsForSupervisor(dailyLots, dateKey, supervisorId, supervisorName = null, filterHorario = null) {
  if (!dailyLots || !dateKey || !dailyLots[dateKey]) {
    return [];
  }

  const dayEntries = dailyLots[dateKey];
  if (!Array.isArray(dayEntries) || dayEntries.length === 0) {
    return [];
  }

  // 1. Filtrar primero por el supervisor si se especificó
  const supMatches = dayEntries.filter((e) => {
    if (supervisorId && e.supervisorId && e.supervisorId === supervisorId) return true;
    if (supervisorName && e.supervisorNombre && isSameDoctor(e.supervisorNombre, supervisorName)) return true;
    return false;
  });

  if (supMatches.length === 0) return [];

  // Si hay franja horaria seleccionada distinta de TODOS, buscar coincidencias exactas de esa franja
  if (filterHorario && filterHorario !== "TODOS") {
    const shiftMatches = supMatches.filter((e) => isSameHorario(e.horario, filterHorario));
    if (shiftMatches.length > 0) return shiftMatches;
  }

  // Si el filtro es TODOS o no hubo match exacto de franja, retornar todos los lotes del supervisor
  return supMatches;
}

