/**
 * Parser inteligente de Nóminas Quincenales y Diarias de Google Sheets / Excel
 * Soporta copiar y pegar directamente desde Google Sheets (TSV con celdas multilínea entrecomilladas)
 * y texto plano de celdas individuales.
 */

import { normalizeDocName, isSameDoctor } from "./safeHelpers.js";

/**
 * Parsea texto en formato CSV / TSV respetando comillas y saltos de línea internos (RFC 4180)
 */
export function parseCSVorTSV(text) {
  if (!text || typeof text !== "string") return [];
  const clean = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  
  // Detectar si el delimitador principal es Tab (\t) o Coma (,)
  const tabCount = (clean.match(/\t/g) || []).length;
  const commaCount = (clean.match(/,/g) || []).length;
  const delimiter = tabCount >= commaCount ? "\t" : ",";

  const rows = [];
  let currentRow = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // saltar comilla de escape
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if (char === "\n" && !insideQuotes) {
      currentRow.push(currentCell.trim());
      // Solo agregar filas no completamente vacías
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }

  // Última celda y fila
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Normaliza cadenas de fecha comunes en las hojas (e.g. "sep 25, 2026", "25/09/2026", "2026-09-25", "sep 25")
 */
export function normalizeDateHeader(rawHeader, defaultYear = 2026) {
  if (!rawHeader) return null;
  // Limpiar marcas de tiempo añadidas por Excel o Google Sheets (ej: "2026-10-01 00:00:00")
  const clean = rawHeader.trim().toLowerCase().replace(/\s+\d{1,2}:\d{2}(:\d{2})?.*$/, "");

  // Caso 1: ISO "2026-09-25"
  const isoMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, "0");
    const d = isoMatch[3].padStart(2, "0");
    return {
      dateKey: `${y}-${m}-${d}`,
      label: `${d} ${getMonthName(parseInt(m, 10))} ${y}`,
      dayNum: parseInt(d, 10),
      monthNum: parseInt(m, 10),
      year: parseInt(y, 10),
    };
  }

  // Caso 2: "25/09/2026" o "25-09-2026"
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, "0");
    const m = dmyMatch[2].padStart(2, "0");
    const y = dmyMatch[3].length === 2 ? `20${dmyMatch[3]}` : dmyMatch[3];
    return {
      dateKey: `${y}-${m}-${d}`,
      label: `${d} ${getMonthName(parseInt(m, 10))} ${y}`,
      dayNum: parseInt(d, 10),
      monthNum: parseInt(m, 10),
      year: parseInt(y, 10),
    };
  }

  // Caso 2b: "01/10" o "1/10" (día/mes sin año explícito)
  const dmMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (dmMatch) {
    const d = dmMatch[1].padStart(2, "0");
    const m = dmMatch[2].padStart(2, "0");
    const y = String(defaultYear);
    return {
      dateKey: `${y}-${m}-${d}`,
      label: `${d} ${getMonthName(parseInt(m, 10))} ${y}`,
      dayNum: parseInt(d, 10),
      monthNum: parseInt(m, 10),
      year: parseInt(y, 10),
    };
  }

  // Caso 3: Formato estilo Google Sheets: "sep 25, 2026", "sep 25", "25 sep 2026", "septiembre 25"
  const monthsMap = {
    ene: 1, jan: 1, enero: 1, january: 1,
    feb: 2, febrero: 2, february: 2,
    mar: 3, marzo: 3, march: 3,
    abr: 4, apr: 4, abril: 4, april: 4,
    may: 5, mayo: 5,
    jun: 6, junio: 6, june: 6,
    jul: 7, julio: 7, july: 7,
    ago: 8, aug: 8, agosto: 8, august: 8,
    sep: 9, sept: 9, septiembre: 9, september: 9,
    oct: 10, octubre: 10, october: 10,
    nov: 11, noviembre: 11, november: 11,
    dic: 12, dec: 12, diciembre: 12, december: 12,
  };

  // Buscar nombre de mes y número de día
  for (const [monthKey, monthNum] of Object.entries(monthsMap)) {
    if (clean.includes(monthKey)) {
      // Buscar dígitos de día (1 o 2 dígitos) y año opcional (4 dígitos)
      const dayMatch = clean.match(/(?:^|\D)(\d{1,2})(?:\D|$)/);
      const yearMatch = clean.match(/(?:^|\D)(20\d\d)(?:\D|$)/);
      if (dayMatch) {
        const d = dayMatch[1].padStart(2, "0");
        const y = yearMatch ? yearMatch[1] : String(defaultYear);
        const m = String(monthNum).padStart(2, "0");
        return {
          dateKey: `${y}-${m}-${d}`,
          label: `${d} ${getMonthName(monthNum)} ${y}`,
          dayNum: parseInt(d, 10),
          monthNum,
          year: parseInt(y, 10),
        };
      }
    }
  }

  return null;
}

function getMonthName(m) {
  const names = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return names[m] || `Mes ${m}`;
}

/**
 * Normaliza horarios comunes a los formatos canónicos del sistema
 */
export function normalizeHorarioString(raw) {
  if (!raw) return null;
  const s = raw.toLowerCase().trim();
  if (s.includes("2:00") && s.includes("10:00")) return "02:00 PM – 10:00 PM";
  if (s.includes("4:00") && s.includes("10:00")) return "04:00 PM – 10:00 PM";
  if (s.includes("6:00") && s.includes("10:00") && (s.includes("pm") || s.includes("18:00") || s.includes("22:00"))) {
    return "06:00 PM – 10:00 PM";
  }
  if (s.includes("6:00") && s.includes("2:00")) return "06:00 AM – 02:00 PM";
  if (s.includes("8:00") && s.includes("12:00")) return "08:00 AM – 12:00 MD";
  if (s.includes("7:00") && s.includes("12:00")) return "07:00 AM – 12:00 PM";
  return raw.trim();
}

/**
 * Extrae médico individual a partir de una línea de texto de celda
 * Ejemplos:
 * "000FFF - FABRICIO JOSUE FUNES CANALES (2:00 PM - 10:00 PM)"
 * "000RAF - RODRIGO EDUARDO ANGEL RAMOS (2:00 PM - 10:00 PM)"
 * "IVAN FLORES RAMIREZ (4:00 PM - 10:00 PM)"
 * "FABRICIO JOSUE FUNES CANALES"
 */
export function parseDoctorLine(line, doctorLookupMaps) {
  if (!line || typeof line !== "string") return null;
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3) return null;

  // Regex: [Token opcional] - [Nombre] ([Horario opcional])
  const match = trimmed.match(/^(?:([A-Za-z0-9_-]{2,10})\s*[-–:]\s*)?([^(]+?)(?:\s*\(([^)]+)\))?$/);
  
  let token = null;
  let rawName = trimmed;
  let horarioRaw = null;

  if (match) {
    token = match[1] ? match[1].trim().toUpperCase() : null;
    rawName = match[2] ? match[2].trim() : trimmed;
    horarioRaw = match[3] ? match[3].trim() : null;
  }

  // Quitar prefijos numéricos o viñetas tipo "1. ", "• "
  rawName = rawName.replace(/^[\d+•\-\*]+\.?\s*/, "").trim();

  // Buscar en el padrón de doctores y personal
  let canonicalDoctor = null;
  let matchMethod = "NONE";

  if (doctorLookupMaps) {
    const { byToken, byNormName, list } = doctorLookupMaps;

    // 1. Por token TCA
    if (token && byToken.has(token)) {
      canonicalDoctor = byToken.get(token);
      matchMethod = "TOKEN";
    }

    // 2. Por nombre normalizado
    if (!canonicalDoctor && rawName) {
      const norm = normalizeDocName(rawName);
      if (byNormName.has(norm)) {
        canonicalDoctor = byNormName.get(norm);
        matchMethod = "EXACT_NAME";
      } else {
        // 3. Búsqueda por subcadena / similitud
        for (const [keyNorm, docObj] of byNormName.entries()) {
          if (norm.length >= 10 && (keyNorm.includes(norm) || norm.includes(keyNorm))) {
            canonicalDoctor = docObj;
            matchMethod = "PARTIAL_NAME";
            break;
          }
        }

        // 4. Búsqueda por palabras clave (apellidos y nombres clave de más de 3 letras)
        if (!canonicalDoctor) {
          const rawWords = norm.split(" ").filter((w) => w.length > 3 && !["de", "del", "los", "las", "san"].includes(w));
          if (rawWords.length >= 2) {
            let bestMatch = null;
            let maxMatchedWords = 0;
            for (const [keyNorm, docObj] of byNormName.entries()) {
              const matchedCount = rawWords.filter((w) => keyNorm.includes(w)).length;
              if (matchedCount >= 2 && matchedCount > maxMatchedWords) {
                maxMatchedWords = matchedCount;
                bestMatch = docObj;
              }
            }
            if (bestMatch && maxMatchedWords >= 2) {
              canonicalDoctor = bestMatch;
              matchMethod = "KEYWORD_WORDS";
            }
          }
        }
      }
    }
  }

  const finalName = canonicalDoctor ? canonicalDoctor.nombre : rawName.toUpperCase();
  const finalHorario = normalizeHorarioString(horarioRaw);

  const finalDoctorObj = canonicalDoctor || {
    id: `doc_sp_${token || finalName.slice(0, 8)}`,
    nombre: finalName,
    tcaUsuario: token || "",
    rol: "Médico Servicios Profesionales",
    categoria: "Servicios Profesionales",
    tipo: "Servicios Profesionales",
    horario: finalHorario,
  };

  return {
    rawLine: trimmed,
    token: token || canonicalDoctor?.tcaUsuario || null,
    nombre: finalName,
    horario: finalHorario,
    doctorObj: finalDoctorObj,
    isMatched: !!canonicalDoctor || Boolean(token && finalName.length >= 6),
    matchMethod: canonicalDoctor ? matchMethod : (token ? "AUTO_TOKEN_DISCOVERY" : "RAW_NAME"),
  };
}

/**
 * Prepara diccionarios optimizados de búsqueda para doctores y supervisores
 */
export function buildLookupMaps(doctorsList = [], staffList = [], supervisoresList = []) {
  const byToken = new Map();
  const byNormName = new Map();
  const allPersonnel = [...(doctorsList || []), ...(staffList || [])];

  allPersonnel.forEach((d) => {
    if (d.tcaUsuario) byToken.set(d.tcaUsuario.toUpperCase().trim(), d);
    if (d.nombre) {
      const norm = normalizeDocName(d.nombre);
      if (norm) byNormName.set(norm, d);
    }
  });

  const bySupToken = new Map();
  const bySupNorm = new Map();

  (supervisoresList || []).forEach((s) => {
    if (s.id) bySupNorm.set(s.id.toLowerCase(), s);
    if (s.nombre) {
      const norm = normalizeDocName(s.nombre);
      if (norm) bySupNorm.set(norm, s);
      // Mapeos comunes de tokens de supervisores
      const words = norm.split(" ");
      if (words.length >= 2) {
        bySupNorm.set(`${words[0]} ${words[1]}`, s);
      }
    }
  });

  // Mapeos conocidos de supervisores por código de la hoja
  const sup3 = (supervisoresList || []).find((s) => s.id === "sup-3" || s.nombre?.includes("ALFREDO"));
  if (sup3) {
    bySupToken.set("000AMB", sup3);
    bySupNorm.set("alfredo", sup3);
    bySupNorm.set("alfredo isaac martinez amaya", sup3);
  }

  const sup2 = (supervisoresList || []).find((s) => s.id === "sup-2" || s.nombre?.includes("SALVADOR"));
  if (sup2) {
    bySupToken.set("000SRB", sup2);
    bySupToken.set("000SR0", sup2);
    bySupNorm.set("salvador", sup2);
    bySupNorm.set("salvador renderos bonilla", sup2);
  }

  const sup1 = (supervisoresList || []).find((s) => s.id === "sup-1" || s.nombre?.includes("EMERSON"));
  if (sup1) {
    bySupToken.set("000ECP", sup1);
    bySupToken.set("000EVH", sup1);
    bySupToken.set("000EV3", sup1);
    bySupNorm.set("emerson", sup1);
    bySupNorm.set("emerson josue vigil hernandez", sup1);
  }

  return {
    doctors: { byToken, byNormName, list: allPersonnel },
    supervisores: { bySupToken, bySupNorm, list: supervisoresList },
  };
}

/**
 * Parsea el texto copiado de Google Sheets que representa la distribución quincenal completa
 * o una sola fila correspondiente a un supervisor individual.
 */
export function parseQuincenaSpreadsheet(rawText, doctorsList = [], staffList = [], supervisoresList = [], fallbackDates = []) {
  if (!rawText || typeof rawText !== "string") {
    return { success: false, error: "El texto está vacío." };
  }

  const lookups = buildLookupMaps(doctorsList, staffList, supervisoresList);
  const rows = parseCSVorTSV(rawText);

  if (rows.length === 0) {
    return { success: false, error: "No se encontraron filas válidas en el texto ingresado." };
  }

  // 1. Detectar si es una sola celda / lista de doctores (un solo día para un supervisor)
  if (rows.length === 1 && rows[0].length === 1) {
    const singleCellLines = rows[0][0].split("\n").filter((l) => l.trim().length > 0);
    if (singleCellLines.length > 1) {
      const parsedDoctors = singleCellLines
        .map((line) => parseDoctorLine(line, lookups.doctors))
        .filter(Boolean);

      return {
        success: true,
        type: "SINGLE_LIST",
        totalDoctores: parsedDoctors.length,
        doctores: parsedDoctors,
        reconocidos: parsedDoctors.filter((d) => d.isMatched).length,
      };
    }
  }

  // 1b. DETECTAR FILA INDIVIDUAL DE SUPERVISOR (1 fila con múltiples columnas de días)
  // Ej: Col A = "000EV3 - EMERSON JOSUE VIGIL HERNANDEZ", Col B..P = celdas multilínea con doctores de cada día
  if (rows.length === 1 && rows[0].length >= 2) {
    const firstCell = (rows[0][0] || "").trim();
    let matchedSupervisor = null;
    const supNorm = normalizeDocName(firstCell);

    const supCodeMatch = firstCell.match(/^([A-Za-z0-9_-]{4,10})/);
    if (supCodeMatch) {
      const code = supCodeMatch[1].toUpperCase();
      if (lookups.supervisores.bySupToken.has(code)) {
        matchedSupervisor = lookups.supervisores.bySupToken.get(code);
      }
    }

    if (!matchedSupervisor) {
      for (const [key, sObj] of lookups.supervisores.bySupNorm.entries()) {
        if (supNorm.includes(key) || key.includes(supNorm)) {
          matchedSupervisor = sObj;
          break;
        }
      }
    }

    const hasSupervisorInCol0 = !!matchedSupervisor || firstCell.length > 5;
    const colStart = hasSupervisorInCol0 ? 1 : 0;
    const totalDayCols = rows[0].length - colStart;

    const supId = matchedSupervisor ? matchedSupervisor.id : "sup-1";
    const supNombre = matchedSupervisor ? matchedSupervisor.nombre : (firstCell || "SUPERVISOR OFICIAL");

    // Construir columnas de fecha a partir de fallbackDates o consecutivas de Octubre
    const generatedDateCols = [];
    for (let i = 0; i < totalDayCols; i++) {
      const colIdx = colStart + i;
      let dateObj = null;
      if (fallbackDates && fallbackDates[i]) {
        dateObj = normalizeDateHeader(fallbackDates[i]);
      }
      if (!dateObj) {
        const dNum = i + 1;
        const dStr = String(dNum).padStart(2, "0");
        dateObj = {
          dateKey: `2026-10-${dStr}`,
          label: `${dStr} Oct 2026`,
          dayNum: dNum,
          monthNum: 10,
          year: 2026,
        };
      }
      generatedDateCols.push({ colIndex: colIdx, ...dateObj });
    }

    const diasMapSingle = {};
    let totalLineas = 0;
    let totalRec = 0;

    generatedDateCols.forEach((col) => {
      const cellContent = rows[0][col.colIndex] || "";
      const lines = cellContent.split("\n").filter((l) => l.trim().length > 0);
      const parsedDocs = [];

      lines.forEach((line) => {
        totalLineas++;
        const parsed = parseDoctorLine(line, lookups.doctors);
        if (parsed) {
          parsedDocs.push(parsed);
          if (parsed.isMatched) totalRec++;
        }
      });

      diasMapSingle[col.dateKey] = {
        dateKey: col.dateKey,
        label: col.label,
        dayNum: col.dayNum,
        monthNum: col.monthNum,
        year: col.year,
        porSupervisor: {
          [supId]: {
            supervisorId: supId,
            supervisorNombre: supNombre,
            doctorNames: parsedDocs.map((d) => d.nombre),
            doctores: parsedDocs,
            totalDoctores: parsedDocs.length,
          },
        },
      };
    });

    const diasArr = Object.values(diasMapSingle).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    const rate = totalLineas > 0 ? ((totalRec / totalLineas) * 100).toFixed(1) : "100.0";

    return {
      success: true,
      type: "TABLE",
      isSingleSupervisorRow: true,
      supervisorId: supId,
      supervisorNombre: supNombre,
      supervisoresDetectados: [{ id: supId, nombre: supNombre, oficial: !!matchedSupervisor, totalAsignaciones: totalLineas }],
      titulo: `Fila de Nómina: ${supNombre} (${diasArr[0]?.label || ""} – ${diasArr[diasArr.length - 1]?.label || ""})`,
      dias: diasArr,
      diasDetectados: diasArr.map((d) => d.dateKey),
      estadisticas: {
        totalDias: diasArr.length,
        totalSupervisores: 1,
        totalLineasParseadas: totalLineas,
        totalReconocidos: totalRec,
        tasaReconocimiento: `${rate}%`,
      },
    };
  }

  // 2. Buscar la fila de encabezados con las fechas
  let headerRowIndex = -1;
  let dateColumns = []; // { colIndex, dateKey, label, dayNum, monthNum, year }

  for (let r = 0; r < Math.min(rows.length, 12); r++) {
    const row = rows[r];
    const detectedDates = [];

    for (let c = 0; c < row.length; c++) {
      const cellText = row[c];
      const parsedDate = normalizeDateHeader(cellText);
      if (parsedDate) {
        detectedDates.push({ colIndex: c, ...parsedDate });
      }
    }

    if (detectedDates.length >= 2) {
      headerRowIndex = r;
      dateColumns = detectedDates;
      break;
    }
  }

  if (headerRowIndex === -1 || dateColumns.length === 0) {
    // Si no encontró fechas en encabezados, intentar ver si es una lista pegada directamente línea por línea
    const allLines = rawText.split("\n").map((l) => l.trim()).filter((l) => l.length > 2);
    const parsedList = allLines.map((l) => parseDoctorLine(l, lookups.doctors)).filter(Boolean);
    if (parsedList.length >= 3) {
      return {
        success: true,
        type: "SINGLE_LIST",
        totalDoctores: parsedList.length,
        doctores: parsedList,
        reconocidos: parsedList.filter((d) => d.isMatched).length,
      };
    }

    return {
      success: false,
      error: "No se identificaron las columnas de fechas (ej: 'Oct 1, 2026', '01/10/2026'). Puedes copiar la fila de encabezados junto a la de tu supervisor o copiar la fila completa de tu supervisor con el código al inicio.",
    };
  }

  // 3. Procesar las filas de Supervisores debajo del encabezado
  const diasMap = {};
  dateColumns.forEach((col) => {
    diasMap[col.dateKey] = {
      dateKey: col.dateKey,
      label: col.label,
      dayNum: col.dayNum,
      monthNum: col.monthNum,
      year: col.year,
      porSupervisor: {},
    };
  });

  const supervisoresDetectados = new Map();
  let totalLineasParseadas = 0;
  let totalReconocidos = 0;

  // 3b. Detectar si el formato es una Matriz Médico x Día (cada fila es un médico y las columnas de fecha tienen turnos como "02:00pm-10:00pm", "LIBRE", etc.)
  let isMatrixDoctorFormat = false;
  let detectedGlobalSupervisor = null;

  // Buscar si en las primeras filas o encabezados se menciona al supervisor
  for (let r = 0; r < Math.min(rows.length, 6); r++) {
    const fullRowText = rows[r].join(" ");
    const fullNorm = normalizeDocName(fullRowText);
    for (const [key, sObj] of lookups.supervisores.bySupNorm.entries()) {
      if (fullNorm.includes(key)) {
        detectedGlobalSupervisor = sObj;
        break;
      }
    }
    if (detectedGlobalSupervisor) break;
  }

  // Comprobar si las celdas en dateColumns contienen turnos cortos (ej. "02:00pm-10:00pm", "LIBRE") y no listas multilínea
  let shiftSampleCount = 0;
  let multilineSampleCount = 0;

  for (let r = headerRowIndex + 1; r < Math.min(rows.length, headerRowIndex + 6); r++) {
    const row = rows[r];
    if (!row) continue;
    for (const col of dateColumns) {
      const cell = row[col.colIndex] || "";
      if (cell.includes("\n")) multilineSampleCount++;
      else if (cell.length > 0 && (cell.toLowerCase().includes("pm") || cell.toLowerCase().includes("am") || cell.toLowerCase().includes("libre"))) {
        shiftSampleCount++;
      }
    }
  }

  if (shiftSampleCount > multilineSampleCount && shiftSampleCount >= 2) {
    isMatrixDoctorFormat = true;
  }

  if (isMatrixDoctorFormat) {
    // MODO MATRIZ DE PLANILLA: Cada fila es un médico y las columnas de fechas contienen los turnos o "LIBRE"
    // Identificar índices de columnas clave de metadatos (NOMBRE, FUNCION, GRUPO)
    let nameColIdx = -1;
    let funcColIdx = -1;
    let groupColIdx = -1;
    let idColIdx = -1;

    const headerRow = rows[headerRowIndex] || [];
    const firstDateColIdx = dateColumns[0]?.colIndex || 4;

    for (let c = 0; c < firstDateColIdx; c++) {
      const hText = (headerRow[c] || "").toUpperCase().trim();
      if (hText.includes("NOMBRE") || hText.includes("MÉDICO") || hText.includes("MEDICO") || hText.includes("COLABORADOR")) nameColIdx = c;
      else if (hText.includes("FUNCION") || hText.includes("FUNCIÓN") || hText.includes("ROL")) funcColIdx = c;
      else if (hText.includes("GRUPO")) groupColIdx = c;
      else if (hText.includes("IDENTIFICADOR") || hText.includes("DUI") || hText.includes("ID") || hText.includes("CODIGO")) idColIdx = c;
    }
    if (nameColIdx === -1) nameColIdx = Math.min(1, Math.max(0, firstDateColIdx - 3));

    const NON_WORKING_STATUSES = [
      "LIBRE",
      "VACACION",
      "VACACIONES",
      "INCAPACIDAD",
      "PERMISO",
      "PERMISO PERSONAL",
      "DESCANSO",
      "BAJA",
      "SUSPENSION",
      "MATERNIDAD"
    ];
    let currentSup = detectedGlobalSupervisor || null;
    const supsList = lookups.supervisores?.list || [];

    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const rawName = (row[nameColIdx] || "").trim();
      const rawFunc = funcColIdx >= 0 ? (row[funcColIdx] || "").toUpperCase().trim() : "";
      const rawGroup = groupColIdx >= 0 ? (row[groupColIdx] || "").toUpperCase().trim() : "";
      const rawId = idColIdx >= 0 ? (row[idColIdx] || "").trim() : "";

      if (!rawName || rawName.length < 3) continue;

      // 1. Detectar si esta fila es de un Supervisor o Cabecera de Grupo
      const isSupRole = rawFunc.includes("SUPERVISOR") || rawFunc.includes("SUPERVISORA") || rawFunc.includes("JEFE");
      let matchedOfficialSup = null;
      const upperName = rawName.toUpperCase();

      for (const s of supsList) {
        const sUpper = (s.nombre || "").toUpperCase();
        if (upperName.includes(sUpper) || sUpper.includes(upperName) ||
            (upperName.includes("EDWARD") && s.id === "sup-5") ||
            (upperName.includes("ROXANA") && s.id === "sup-4") ||
            (upperName.includes("MARCELA") && s.id === "sup-6")) {
          matchedOfficialSup = s;
          break;
        }
      }

      if (isSupRole || matchedOfficialSup) {
        currentSup = matchedOfficialSup || {
          id: upperName.includes("EDWARD") ? "sup-5" : (upperName.includes("ROXANA") ? "sup-4" : `sup_${rawName.slice(0, 8)}`),
          nombre: rawName,
          rol: rawFunc || "Supervisor Planilla",
        };
        if (!supervisoresDetectados.has(currentSup.id)) {
          supervisoresDetectados.set(currentSup.id, {
            id: currentSup.id,
            nombre: currentSup.nombre,
            oficial: !!matchedOfficialSup,
            totalAsignaciones: 0,
          });
        }
        continue;
      }

      // Si aún no hay supervisor asignado en esta sección, inferir por grupo
      if (!currentSup) {
        if (rawGroup.includes("GRUPO 1") || rawGroup.includes("G1")) {
          currentSup = supsList.find((s) => s.id === "sup-5") || { id: "sup-5", nombre: "EDWARD JOSUE ZELAYA PRUDENCIO" };
        } else if (rawGroup.includes("GRUPO 2") || rawGroup.includes("G2")) {
          currentSup = supsList.find((s) => s.id === "sup-4") || { id: "sup-4", nombre: "ROXANA GUADALUPE CANALES RODRIGUEZ" };
        } else {
          currentSup = detectedGlobalSupervisor || supsList[4] || { id: "sup-5", nombre: "EDWARD JOSUE ZELAYA PRUDENCIO" };
        }
        if (!supervisoresDetectados.has(currentSup.id)) {
          supervisoresDetectados.set(currentSup.id, {
            id: currentSup.id,
            nombre: currentSup.nombre,
            oficial: true,
            totalAsignaciones: 0,
          });
        }
      }

      // 2. Procesar médico consultante de la fila
      const parsedDoc = parseDoctorLine(rawName, lookups.doctors);

      dateColumns.forEach((col) => {
        const rawShiftCell = (row[col.colIndex] || "").trim();
        if (!rawShiftCell) return;

        // Limpiar acentos para evaluar estado (ej: "VACACIÓN" -> "VACACION")
        const cleanShift = rawShiftCell
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toUpperCase()
          .trim();

        // Estados que indican que no labora ese día
        const isNonWorking =
          cleanShift === "LIBRE" ||
          cleanShift === "INCAPACIDAD" ||
          cleanShift.startsWith("INCAPACIDAD") ||
          cleanShift.includes("VACACION") ||
          cleanShift.includes("MATERNIDAD") ||
          cleanShift.includes("PERMISO PERSONAL") ||
          cleanShift.includes("SUSPENSION") ||
          cleanShift.includes("BAJA") ||
          cleanShift.includes("DESCANSO") ||
          (cleanShift === "PERMUTA"); // "PERMUTA" sin horario

        if (isNonWorking) {
          return; // El médico no labora este día
        }

        totalLineasParseadas++;
        if (parsedDoc.isMatched) totalReconocidos++;

        if (!diasMap[col.dateKey].porSupervisor[currentSup.id]) {
          diasMap[col.dateKey].porSupervisor[currentSup.id] = {
            supervisorId: currentSup.id,
            supervisorNombre: currentSup.nombre,
            doctorNames: [],
            doctores: [],
            totalDoctores: 0,
          };
        }

        const supEntry = diasMap[col.dateKey].porSupervisor[currentSup.id];
        supEntry.doctorNames.push(parsedDoc.nombre);

        // Si tiene prefijo P-06:00am-02:00pm, normalizar el horario
        let horarioClean = rawShiftCell;
        let isPermuta = false;
        if (cleanShift.startsWith("P-") || cleanShift.startsWith("P ")) {
          isPermuta = true;
          horarioClean = rawShiftCell.replace(/^[Pp][\-\s]/, "");
        }

        supEntry.doctores.push({
          ...parsedDoc,
          horario: normalizeHorarioString(horarioClean),
          identificador: rawId || parsedDoc.identificador || null,
          dui: rawId || null,
          isPermuta,
        });
        supEntry.totalDoctores = supEntry.doctores.length;

        const supInfo = supervisoresDetectados.get(currentSup.id);
        if (supInfo) supInfo.totalAsignaciones++;
      });
    }
  } else {
    // MODO ESTÁNDAR: Cada fila es un Supervisor y las celdas contienen la lista de médicos
    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const supCell = row[0] || "";
      if (!supCell || supCell.length < 3) continue;

      // Identificar supervisor
      let matchedSupervisor = null;
      const supNorm = normalizeDocName(supCell);

      // Búsqueda por token (e.g. "000AMB", "000SRB")
      const supCodeMatch = supCell.match(/^([A-Za-z0-9_-]{4,10})/);
      if (supCodeMatch) {
        const code = supCodeMatch[1].toUpperCase();
        if (lookups.supervisores.bySupToken.has(code)) {
          matchedSupervisor = lookups.supervisores.bySupToken.get(code);
        }
      }

      // Búsqueda por nombre de supervisor
      if (!matchedSupervisor) {
        for (const [key, sObj] of lookups.supervisores.bySupNorm.entries()) {
          if (supNorm.includes(key) || key.includes(supNorm)) {
            matchedSupervisor = sObj;
            break;
          }
        }
      }

      // Fallback si no coincide exactamente: asignar un ID descriptivo
      const supervisorId = matchedSupervisor ? matchedSupervisor.id : `sup-${supNorm.slice(0, 15)}`;
      const supervisorNombre = matchedSupervisor ? matchedSupervisor.nombre : supCell.trim();

      if (!supervisoresDetectados.has(supervisorId)) {
        supervisoresDetectados.set(supervisorId, {
          id: supervisorId,
          nombre: supervisorNombre,
          oficial: !!matchedSupervisor,
          totalAsignaciones: 0,
        });
      }

      // Procesar cada columna de fecha para este supervisor
      dateColumns.forEach((col) => {
        const cellContent = row[col.colIndex] || "";
        if (!cellContent || cellContent.trim().length === 0) return;

        const lines = cellContent.split("\n").filter((l) => l.trim().length > 0);
        const parsedDocs = [];

        lines.forEach((line) => {
          totalLineasParseadas++;
          const parsed = parseDoctorLine(line, lookups.doctors);
          if (parsed) {
            parsedDocs.push(parsed);
            if (parsed.isMatched) totalReconocidos++;
          }
        });

        if (parsedDocs.length > 0) {
          diasMap[col.dateKey].porSupervisor[supervisorId] = {
            supervisorId,
            supervisorNombre,
            doctorNames: parsedDocs.map((d) => d.nombre),
            doctores: parsedDocs,
            totalDoctores: parsedDocs.length,
          };

          const supInfo = supervisoresDetectados.get(supervisorId);
          if (supInfo) {
            supInfo.totalAsignaciones += parsedDocs.length;
          }
        }
      });
    }
  }

  const diasArray = Object.values(diasMap).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  const rate = totalLineasParseadas > 0 ? ((totalReconocidos / totalLineasParseadas) * 100).toFixed(1) : "100.0";

  const supsListDetected = Array.from(supervisoresDetectados.values());
  const mainSup = supsListDetected[0];

  return {
    success: true,
    type: "TABLE",
    supervisorId: mainSup?.id,
    supervisorNombre: mainSup?.nombre,
    titulo: `Quincena Oficial (${diasArray[0]?.label || ""} – ${diasArray[diasArray.length - 1]?.label || ""})`,
    dias: diasArray,
    diasDetectados: diasArray.map((d) => d.dateKey),
    supervisoresDetectados: supsListDetected,
    estadisticas: {
      totalDias: diasArray.length,
      totalSupervisores: supsListDetected.length,
      totalLineasParseadas,
      totalReconocidos,
      tasaReconocimiento: `${rate}%`,
    },
  };
}

/**
 * Obtiene el registro de doctores asignados a un supervisor en una fecha específica
 */
export function getRosterForDateAndSupervisor(quincenaData, dateKey, supervisorId) {
  if (!quincenaData || !quincenaData.dias || !dateKey || !supervisorId) return null;
  const dia = quincenaData.dias.find((d) => d.dateKey === dateKey);
  if (!dia || !dia.porSupervisor) return null;
  return dia.porSupervisor[supervisorId] || null;
}
