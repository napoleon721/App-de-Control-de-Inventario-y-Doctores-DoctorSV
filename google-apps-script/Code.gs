/**
 * =========================================================================
 * DoctorSV — Backend Centralizado para las 3 Hojas Oficiales de Google Sheets
 * =========================================================================
 * 1. Sistema TM-SM V2 (140 Cubículos, Estados en Vivo, Bodega y Auditoría)
 * 2. Buscador de Médicos con Tipo (Padrón Oficial de Médicos y Turnos)
 * 3. Personal SSM (Personal Adicional de Sede San Miguel)
 * =========================================================================
 */

// IDs de las cuatro hojas oficiales de Google Sheets
var SHEET_SPACES_ID            = "1VNZQLl_JKzEaJzoV2Yi_QbhZxsykrBtgE-y9KnzcAPM"; // Sistema TM-SM V2
var SHEET_DOCTORS_DIRECTORY_ID = "1zHV2KYuuazYqX6N893-0XpEl7T96cKTs88FRWmhTy9I"; // Directorio Oficial de Médicos con Correos
var SHEET_DOCTORS_ID           = "1VqHT9fJfPd60ro3NFBAi1NzhOHHcuXbdApKv6cNFKXs"; // Buscador_Medicos_Con_Tipo
var SHEET_STAFF_ID             = "1_VQKDLOcWM4JNoo5veD2Bn7ASWhgHmhE70iTcBCSmPQ"; // personal SSM

/**
 * Abre el libro del inventario de cubículos (Sistema TM-SM V2)
 */
function getSpacesSpreadsheet() {
  try {
    return SpreadsheetApp.openById(SHEET_SPACES_ID);
  } catch (e) {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

/**
 * Abre el libro del directorio oficial de médicos con correos institucionales
 */
function getDoctorsDirectorySpreadsheet() {
  try {
    return SpreadsheetApp.openById(SHEET_DOCTORS_DIRECTORY_ID);
  } catch (e) {
    return null;
  }
}

/**
 * Abre el libro del padrón oficial de médicos (Buscador_Medicos_Con_Tipo)
 */
function getDoctorsSpreadsheet() {
  try {
    return SpreadsheetApp.openById(SHEET_DOCTORS_ID);
  } catch (e) {
    try {
      return SpreadsheetApp.openById(SHEET_STAFF_ID);
    } catch (e2) {
      return SpreadsheetApp.getActiveSpreadsheet();
    }
  }
}

/**
 * Abre el libro de personal de sede (personal SSM)
 */
function getStaffSpreadsheet() {
  try {
    return SpreadsheetApp.openById(SHEET_STAFF_ID);
  } catch (e) {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

function getInventorySheet(ss) {
  var names = ["INVENTARIO ACTUALIZADO", "Inventario", "_BASE_DATOS", "INVENTARIO"];
  for (var i = 0; i < names.length; i++) {
    var s = ss.getSheetByName(names[i]);
    if (s) return s;
  }
  var all = ss.getSheets();
  for (var j = 0; j < all.length; j++) {
    var s = all[j];
    var val = s.getRange(1, 1).getValue();
    if (val && String(val).toUpperCase().indexOf("ESPACIO") !== -1) {
      return s;
    }
  }
  return all[0];
}

function getColumnMapping(sheet) {
  var lastCol = Math.max(16, sheet.getLastColumn());
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {
    idCol: 1,
    estadoCol: 2,
    marcaCol: 3,
    modeloCol: 4,
    activoCol: 5,
    mouseCol: 6,
    headsetCol: 7,
    monitorCol: 8,
    activoMonitorCol: 9,
    marcaMonitorCol: 10,
    hubCol: 11,
    obsCol: 12,
    ultimoMovCol: 13,
    ubicacionAnteriorCol: 14,
    categoriaCol: 15,
    doctorCol: -1,
    horarioCol: -1
  };

  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i] || "").trim().toUpperCase();
    if (h === "ESPACIO" || h === "ID" || h === "PUESTO") map.idCol = i + 1;
    else if (h === "ESTADO") map.estadoCol = i + 1;
    else if (h.indexOf("MARCA") !== -1 && h.indexOf("MONITOR") === -1) map.marcaCol = i + 1;
    else if (h === "MODELO") map.modeloCol = i + 1;
    else if (h === "ACTIVO" || h === "ACTIVO PC") map.activoCol = i + 1;
    else if (h === "MOUSE" || h === "MAUSE") map.mouseCol = i + 1;
    else if (h === "HEADSET" || h === "AURICULAR") map.headsetCol = i + 1;
    else if (h === "MONITOR") map.monitorCol = i + 1;
    else if (h.indexOf("ACTIVO") !== -1 && h.indexOf("MONITOR") !== -1) map.activoMonitorCol = i + 1;
    else if (h.indexOf("MARCA") !== -1 && h.indexOf("MONITOR") !== -1) map.marcaMonitorCol = i + 1;
    else if (h === "HUB" || h.indexOf("HUB") !== -1) map.hubCol = i + 1;
    else if (h === "DOCTOR" || h === "MEDICO") map.doctorCol = i + 1;
    else if (h === "HORARIO" || h === "TURNO") map.horarioCol = i + 1;
    else if (h.indexOf("OBSERV") !== -1) map.obsCol = i + 1;
    else if (h.indexOf("ULTIMO") !== -1 || h.indexOf("FECHA") !== -1) map.ultimoMovCol = i + 1;
    else if (h.indexOf("UBICACION") !== -1) map.ubicacionAnteriorCol = i + 1;
    else if (h.indexOf("CATEGORIA") !== -1) map.categoriaCol = i + 1;
  }

  // Si no existen las columnas DOCTOR o HORARIO, se crean al final de la tabla
  if (map.doctorCol === -1) {
    map.doctorCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, map.doctorCol).setValue("DOCTOR");
  }
  if (map.horarioCol === -1) {
    map.horarioCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, map.horarioCol).setValue("HORARIO");
  }
  return map;
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "getSpaces";

  try {
    // 0. Diagnóstico general de las 3 bases
    if (action === "ping" || action === "getMeta") {
      var ssSpaces = getSpacesSpreadsheet();
      var ssDocs = getDoctorsSpreadsheet();
      var ssStaff = getStaffSpreadsheet();

      return createJsonResponse({
        success: true,
        message: "DoctorSV: Las 3 bases de Google Sheets están conectadas",
        spacesBook: {
          id: SHEET_SPACES_ID,
          name: ssSpaces.getName(),
          sheets: ssSpaces.getSheets().map(function(s) { return s.getName(); })
        },
        doctorsBook: {
          id: SHEET_DOCTORS_ID,
          name: ssDocs.getName(),
          sheets: ssDocs.getSheets().map(function(s) { return s.getName(); })
        },
        staffBook: {
          id: SHEET_STAFF_ID,
          name: ssStaff.getName(),
          sheets: ssStaff.getSheets().map(function(s) { return s.getName(); })
        }
      });
    }

    // 0.1 Actualizar estado y periféricos de un puesto vía GET (Garantiza ejecución instantánea desde navegadores)
    if (action === "updateSpace") {
      var updateRes = executeUpdateSpace(e.parameter);
      return createJsonResponse(updateRes);
    }

    // 1. Obtener puestos / cubículos del inventario (Sistema TM-SM V2)
    if (action === "getSpaces") {
      var ss = getSpacesSpreadsheet();
      var sheet = getInventorySheet(ss);
      var map = getColumnMapping(sheet);
      var data = sheet.getDataRange().getValues();
      var spaces = [];

      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var rawId = row[map.idCol - 1];
        if (rawId === "" || rawId === null || isNaN(Number(rawId))) continue;

        var idNum = Number(rawId);
        if (idNum < 1 || idNum > 200) continue;

        var rawMouse = map.mouseCol > 0 ? row[map.mouseCol - 1] : 0;
        var hasMouse = (rawMouse == 1 || rawMouse === 1.0 || rawMouse === "1" || rawMouse === true);

        var rawHeadset = map.headsetCol > 0 ? row[map.headsetCol - 1] : 0;
        var hasHeadset = (rawHeadset == 1 || rawHeadset === 1.0 || rawHeadset === "1" || rawHeadset === true);

        var rawHub = map.hubCol > 0 ? row[map.hubCol - 1] : 0;
        var hasHub = (rawHub == 1 || rawHub === 1.0 || rawHub === "1" || rawHub === true);

        var rawMonitor = map.monitorCol > 0 ? row[map.monitorCol - 1] : 0;
        var hasMonitor = (rawMonitor == 1 || rawMonitor === 1.0 || rawMonitor === "1" || rawMonitor === true);

        var monitorObj = null;
        if (hasMonitor || (map.marcaMonitorCol > 0 && row[map.marcaMonitorCol - 1]) || (map.activoMonitorCol > 0 && row[map.activoMonitorCol - 1])) {
          monitorObj = {
            marca: map.marcaMonitorCol > 0 && row[map.marcaMonitorCol - 1] ? String(row[map.marcaMonitorCol - 1]) : "DELL",
            activo: map.activoMonitorCol > 0 && row[map.activoMonitorCol - 1] ? String(row[map.activoMonitorCol - 1]) : ""
          };
        }

        spaces.push({
          id: idNum,
          estado: row[map.estadoCol - 1] || "DISPONIBLE",
          marca: row[map.marcaCol - 1] || "DELL",
          modelo: row[map.modeloCol - 1] || "OptiPlex 3080",
          activoPc: row[map.activoCol - 1] || "",
          mouse: hasMouse,
          headset: hasHeadset,
          hub: hasHub,
          monitor: monitorObj,
          doctor: (map.doctorCol > 0 && row[map.doctorCol - 1]) ? String(row[map.doctorCol - 1]) : null,
          horario: (map.horarioCol > 0 && row[map.horarioCol - 1]) ? String(row[map.horarioCol - 1]) : null,
          observaciones: (map.obsCol > 0 && row[map.obsCol - 1]) ? String(row[map.obsCol - 1]) : "",
          ultimoMovimiento: (map.ultimoMovCol > 0 && row[map.ultimoMovCol - 1])
            ? Utilities.formatDate(new Date(row[map.ultimoMovCol - 1]), "GMT-6", "dd/MM/yyyy HH:mm")
            : null
        });
      }

      return createJsonResponse({
        success: true,
        count: spaces.length,
        bookUsed: ss.getName(),
        sheetUsed: sheet.getName(),
        spaces: spaces
      });
    }

    // 2. Obtener lista completa de médicos (Directorio Oficial con Correos + Buscador de Médicos)
    if (action === "getDoctors") {
      var doctors = [];
      var seenEmails = {};
      var seenNames = {};

      // A. Leer del Directorio Oficial de Médicos con Correos
      try {
        var ssDir = getDoctorsDirectorySpreadsheet();
        if (ssDir) {
          var dirSheet = ssDir.getSheetByName("Respuestas de formulario 1") || ssDir.getSheets()[0];
          var dirData = dirSheet.getDataRange().getValues();
          // Col 1: Nombre, Col 2: Grupo, Col 3: Tipo contrato, Col 5: Junta, Col 6: Teléfono, Col 9: TCA, Col 11: Correo electrónico
          for (var dr = 1; dr < dirData.length; dr++) {
            var dRow = dirData[dr];
            var rawName = dRow[1] ? String(dRow[1]).trim() : "";
            if (!rawName) continue;

            var upperName = rawName.toUpperCase();
            var email = dRow[11] ? String(dRow[11]).trim().toLowerCase() : "";
            var jvpmRaw = dRow[5] ? String(dRow[5]).replace(/^["\s]+|["\s]+$/g, "").trim() : "";
            var jvpm = jvpmRaw ? (jvpmRaw.indexOf("JVPM") !== -1 ? jvpmRaw : "JVPM-" + jvpmRaw) : "Institucional";
            var grupo = dRow[2] ? String(dRow[2]).trim() : "Grupo General";
            var tipo = dRow[3] ? String(dRow[3]).trim() : "Planilla";
            var telefono = dRow[6] ? String(dRow[6]).trim() : "";
            var tca = dRow[9] ? String(dRow[9]).trim() : "";
            var placa = dRow[12] ? String(dRow[12]).trim() : "";

            var normKey = upperName.replace(/[^A-Z0-9]/g, "");
            if (email && seenEmails[email]) continue;
            if (email) seenEmails[email] = true;
            seenNames[normKey] = doctors.length;

            doctors.push({
              id: doctors.length + 1,
              nombre: upperName,
              correo: email,
              jvpm: jvpm,
              grupo: grupo,
              tipo: tipo,
              horario: "Turno Rotativo",
              telefono: telefono,
              tcaUsuario: tca,
              placa: placa,
              cubiculo: null
            });
          }
        }
      } catch (errDir) {
        Logger.log("Error leyendo directorio de médicos: " + errDir);
      }

      // B. Complementar con datos de Buscador de Médicos (turnos y cubículos asignados)
      try {
        var ssDocs = getDoctorsSpreadsheet();
        if (ssDocs) {
          var docSheet = ssDocs.getSheetByName("Buscador de Médicos") || ssDocs.getSheets()[0];
          var data = docSheet.getDataRange().getValues();

          if (docSheet.getName() === "Buscador de Médicos") {
            for (var r = 8; r < data.length; r++) {
              var row = data[r];
              var masterName = row[8] ? String(row[8]).trim() : "";
              if (masterName && masterName !== "Nombre de Médico" && masterName.indexOf("---") === -1) {
                var upperMaster = masterName.toUpperCase();
                var normM = upperMaster.replace(/[^A-Z0-9]/g, "");
                var shift = row[9] ? String(row[9]).trim() : "";
                var cubiculo = row[10] ? Number(row[10]) : null;

                if (seenNames[normM] !== undefined) {
                  var existingDoc = doctors[seenNames[normM]];
                  if (shift && shift !== "Turno Rotativo") existingDoc.horario = shift;
                  if (cubiculo) existingDoc.cubiculo = cubiculo;
                } else {
                  seenNames[normM] = doctors.length;
                  doctors.push({
                    id: Number(row[7]) || (doctors.length + 1),
                    nombre: upperMaster,
                    correo: "",
                    jvpm: "Institucional",
                    grupo: "Grupo General",
                    horario: shift || "Turno Rotativo",
                    cubiculo: cubiculo,
                    tipo: row[11] ? String(row[11]).trim() : "Planilla"
                  });
                }
              }
            }
          }
        }
      } catch (errDocs) {
        Logger.log("Error leyendo buscador de médicos: " + errDocs);
      }

      // Complementar con médicos de Personal SSM si existen adicionales
      try {
        var ssStaff = getStaffSpreadsheet();
        if (ssStaff && ssStaff.getId() !== ssDocs.getId()) {
          var staffSheet = ssStaff.getSheetByName("SEDE SAN MIGUEL") || ssStaff.getSheets()[0];
          var sData = staffSheet.getDataRange().getValues();
          for (var si = 5; si < sData.length; si++) {
            var sRow = sData[si];
            var sName = sRow[1] ? String(sRow[1]).trim() : "";
            if (sName && sName.length > 5 && sName.indexOf("---") === -1 && sName.indexOf("SEPTIEMBRE") === -1) {
              var sUpper = sName.toUpperCase();
              if (!seenNames[sUpper]) {
                seenNames[sUpper] = true;
                doctors.push({
                  id: doctors.length + 1,
                  nombre: sUpper,
                  tipo: "Planilla",
                  horario: "Turno Rotativo",
                  cubiculo: null
                });
              }
            }
          }
        }
      } catch (eStaff) {}

      return createJsonResponse({
        success: true,
        count: doctors.length,
        bookUsed: ssDocs.getName(),
        sheetUsed: docSheet.getName(),
        doctors: doctors
      });
    }

    return createJsonResponse({ success: true, message: "DoctorSV 3-Sheets API en línea" });
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

function executeUpdateSpace(params) {
  try {
    var ss = getSpacesSpreadsheet();
    var sheet = getInventorySheet(ss);
    var map = getColumnMapping(sheet);
    var data = sheet.getDataRange().getValues();
    var targetId = Number(params.spaceId || params.id);
    var rowIndex = -1;

    for (var i = 1; i < data.length; i++) {
      if (Number(data[i][map.idCol - 1]) === targetId) {
        rowIndex = i + 1; // 1-indexed
        break;
      }
    }

    if (rowIndex <= 0) {
      return { success: false, message: "Puesto #" + targetId + " no encontrado" };
    }

    if (params.estado !== undefined && map.estadoCol > 0) {
      sheet.getRange(rowIndex, map.estadoCol).setValue(params.estado);
    }
    if (params.doctor !== undefined && map.doctorCol > 0) {
      sheet.getRange(rowIndex, map.doctorCol).setValue(params.doctor);
    }
    if (params.horario !== undefined && map.horarioCol > 0) {
      sheet.getRange(rowIndex, map.horarioCol).setValue(params.horario);
    }
    if (params.marca !== undefined && map.marcaCol > 0) {
      sheet.getRange(rowIndex, map.marcaCol).setValue(params.marca);
    }
    if (params.modelo !== undefined && map.modeloCol > 0) {
      sheet.getRange(rowIndex, map.modeloCol).setValue(params.modelo);
    }
    if (params.activoPc !== undefined && map.activoCol > 0) {
      sheet.getRange(rowIndex, map.activoCol).setValue(params.activoPc);
    }

    // === PERIFÉRICOS CON FORMATO 1 / 0 (1 = TIENE, 0 = NO TIENE) ===
    if (params.mouse !== undefined && map.mouseCol > 0) {
      var m = (params.mouse == 1 || params.mouse === 1 || params.mouse === "1" || params.mouse === true || params.mouse === "true") ? 1 : 0;
      sheet.getRange(rowIndex, map.mouseCol).setValue(m);
    }
    if (params.headset !== undefined && map.headsetCol > 0) {
      var h = (params.headset == 1 || params.headset === 1 || params.headset === "1" || params.headset === true || params.headset === "true") ? 1 : 0;
      sheet.getRange(rowIndex, map.headsetCol).setValue(h);
    }
    if (params.hub !== undefined && map.hubCol > 0) {
      var hb = (params.hub == 1 || params.hub === 1 || params.hub === "1" || params.hub === true || params.hub === "true") ? 1 : 0;
      sheet.getRange(rowIndex, map.hubCol).setValue(hb);
    }
    if (params.monitor !== undefined && map.monitorCol > 0) {
      var mon = (params.monitor == 1 || params.monitor === 1 || params.monitor === "1" || params.monitor === true || params.monitor === "true") ? 1 : 0;
      sheet.getRange(rowIndex, map.monitorCol).setValue(mon);
    }
    if (params.activoMonitor !== undefined && map.activoMonitorCol > 0) {
      sheet.getRange(rowIndex, map.activoMonitorCol).setValue(params.activoMonitor);
    }
    if (params.marcaMonitor !== undefined && map.marcaMonitorCol > 0) {
      sheet.getRange(rowIndex, map.marcaMonitorCol).setValue(params.marcaMonitor);
    }

    if (params.observaciones !== undefined && map.obsCol > 0) {
      sheet.getRange(rowIndex, map.obsCol).setValue(params.observaciones);
    }
    if (map.ultimoMovCol > 0) {
      sheet.getRange(rowIndex, map.ultimoMovCol).setValue(new Date());
    }

    return {
      success: true,
      updatedSpaceId: targetId,
      mouse: params.mouse !== undefined ? ((params.mouse == 1 || params.mouse === true || params.mouse === "1") ? 1 : 0) : undefined,
      headset: params.headset !== undefined ? ((params.headset == 1 || params.headset === true || params.headset === "1") ? 1 : 0) : undefined,
      hub: params.hub !== undefined ? ((params.hub == 1 || params.hub === true || params.hub === "1") ? 1 : 0) : undefined,
      monitor: params.monitor !== undefined ? ((params.monitor == 1 || params.monitor === true || params.monitor === "1") ? 1 : 0) : undefined,
      book: ss.getName(),
      sheet: sheet.getName(),
      row: rowIndex
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function doPost(e) {
  try {
    var body = {};
    if (e && e.parameter) {
      for (var k in e.parameter) {
        body[k] = e.parameter[k];
      }
    }
    if (e && e.postData && e.postData.contents) {
      try {
        var parsed = JSON.parse(e.postData.contents);
        for (var p in parsed) {
          body[p] = parsed[p];
        }
      } catch (errParse) {
        // Podría ser texto plano o urlencoded
      }
    }

    var action = body.action || (e && e.parameter && e.parameter.action) || "updateSpace";

    // 1. Actualizar estado de puesto / periféricos 1 y 0 (En Sistema TM-SM V2)
    if (action === "updateSpace") {
      var resObj = executeUpdateSpace(body);
      return createJsonResponse(resObj);
    }

    // 1.1 Actualización por lote (Batch) de múltiples puestos en una sola transacción
    if (action === "updateSpacesBatch") {
      var ss = getSpacesSpreadsheet();
      var sheet = getInventorySheet(ss);
      var map = getColumnMapping(sheet);
      var data = sheet.getDataRange().getValues();
      var batchList = Array.isArray(body.spaces) ? body.spaces : [];
      var updatedCount = 0;

      // Crear índice de fila para búsqueda O(1)
      var rowIndexMap = {};
      for (var r = 1; r < data.length; r++) {
        var spId = Number(data[r][map.idCol - 1]);
        if (spId > 0) {
          rowIndexMap[spId] = r + 1; // 1-indexed
        }
      }

      for (var b = 0; b < batchList.length; b++) {
        var item = batchList[b];
        var sId = Number(item.spaceId || item.id);
        var rIdx = rowIndexMap[sId];
        if (rIdx) {
          if (item.estado !== undefined && map.estadoCol > 0) {
            sheet.getRange(rIdx, map.estadoCol).setValue(item.estado);
          }
          if (item.doctor !== undefined && map.doctorCol > 0) {
            sheet.getRange(rIdx, map.doctorCol).setValue(item.doctor);
          }
          if (item.horario !== undefined && map.horarioCol > 0) {
            sheet.getRange(rIdx, map.horarioCol).setValue(item.horario);
          }
          if (item.marca !== undefined && map.marcaCol > 0) {
            sheet.getRange(rIdx, map.marcaCol).setValue(item.marca);
          }
          if (item.modelo !== undefined && map.modeloCol > 0) {
            sheet.getRange(rIdx, map.modeloCol).setValue(item.modelo);
          }
          if (item.activoPc !== undefined && map.activoCol > 0) {
            sheet.getRange(rIdx, map.activoCol).setValue(item.activoPc);
          }

          // Periféricos 1 y 0 en batch
          if (item.mouse !== undefined && map.mouseCol > 0) {
            sheet.getRange(rIdx, map.mouseCol).setValue((item.mouse == 1 || item.mouse === true || item.mouse === "1") ? 1 : 0);
          }
          if (item.headset !== undefined && map.headsetCol > 0) {
            sheet.getRange(rIdx, map.headsetCol).setValue((item.headset == 1 || item.headset === true || item.headset === "1") ? 1 : 0);
          }
          if (item.hub !== undefined && map.hubCol > 0) {
            sheet.getRange(rIdx, map.hubCol).setValue((item.hub == 1 || item.hub === true || item.hub === "1") ? 1 : 0);
          }
          if (item.monitor !== undefined && map.monitorCol > 0) {
            sheet.getRange(rIdx, map.monitorCol).setValue((item.monitor == 1 || item.monitor === true || item.monitor === "1") ? 1 : 0);
          }

          if (item.observaciones !== undefined && map.obsCol > 0) {
            sheet.getRange(rIdx, map.obsCol).setValue(item.observaciones);
          }
          if (map.ultimoMovCol > 0) {
            sheet.getRange(rIdx, map.ultimoMovCol).setValue(new Date());
          }
          updatedCount++;
        }
      }

      return createJsonResponse({
        success: true,
        updatedCount: updatedCount,
        book: ss.getName(),
        sheet: sheet.getName()
      });
    }

    // 2. Registrar movimiento en la hoja de Historial / Auditoría
    if (action === "logMovement") {
      var ss = getSpacesSpreadsheet();
      var histSheet = ss.getSheetByName("MOVIMIENTOS DE INVENTARIO") || ss.getSheetByName("Historial") || ss.getSheetByName("Movimientos");
      if (!histSheet) {
        histSheet = ss.insertSheet("Historial");
        histSheet.appendRow(["Fecha", "Equipo", "Espacio", "Acción", "Origen", "Destino", "Falla", "Observaciones"]);
      }
      var m = body.movement || {};
      histSheet.appendRow([
        m.fecha || new Date(),
        m.equipo || "PC",
        m.espacio || "",
        m.accion || "Movimiento",
        m.origen || "",
        m.destino || "",
        m.falla || "",
        m.obs || ""
      ]);
      return createJsonResponse({ success: true, logged: true, book: ss.getName(), sheet: histSheet.getName() });
    }

    // 3. Agregar personal al Padrón
    if (action === "addStaff") {
      var ss = getDoctorsSpreadsheet();
      var staffSheet = ss.getSheetByName("Buscador de Médicos") || ss.getSheetByName("Medicos") || ss.getSheetByName("Personal") || ss.getSheets()[0];
      var s = body.staff || {};
      staffSheet.appendRow([
        "",
        s.id || new Date().getTime(),
        s.nombre || "",
        s.horario || "",
        "",
        s.categoria || s.tipo || "Planilla"
      ]);
      return createJsonResponse({ success: true, added: true, book: ss.getName(), sheet: staffSheet.getName() });
    }

    return createJsonResponse({ success: false, message: "Acción no reconocida" });
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
