/**
 * =========================================================================
 * DoctorSV — Backend Centralizado para Múltiples Hojas de Google Sheets
 * =========================================================================
 * Conecta automáticamente:
 * 1. Sistema TM-SM V2 (Inventario de 140 Cubículos y Movimientos)
 * 2. Buscador de Médicos / Padrón Oficial
 * 3. Personal SSM
 * =========================================================================
 */

// IDs de las hojas proporcionadas por el usuario
var SHEET_ID_1 = "1_VQKDLOcWM4JNoo5veD2Bn7ASWhgHmhE70iTcBCSmPQ";
var SHEET_ID_2 = "1VNZQLl_JKzEaJzoV2Yi_QbhZxsykrBtgE-y9KnzcAPM";

/**
 * Obtiene el libro que contiene el inventario de puestos/cubículos
 */
function getSpacesSpreadsheet() {
  var ids = [SHEET_ID_2, SHEET_ID_1];
  for (var i = 0; i < ids.length; i++) {
    try {
      var ss = SpreadsheetApp.openById(ids[i]);
      if (ss.getSheetByName("INVENTARIO ACTUALIZADO") || ss.getSheetByName("TM-SM") || ss.getSheetByName("_BASE_DATOS")) {
        return ss;
      }
    } catch (e) {}
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Obtiene el libro que contiene el padrón de médicos / personal
 */
function getDoctorsSpreadsheet() {
  var ids = [SHEET_ID_1, SHEET_ID_2];
  for (var i = 0; i < ids.length; i++) {
    try {
      var ss = SpreadsheetApp.openById(ids[i]);
      if (ss.getSheetByName("Buscador de Médicos") || ss.getSheetByName("SEDE SAN MIGUEL") || ss.getSheetByName("Medicos")) {
        return ss;
      }
    } catch (e) {}
  }
  return SpreadsheetApp.getActiveSpreadsheet();
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
  var lastCol = Math.max(15, sheet.getLastColumn());
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {
    idCol: 1,
    estadoCol: 2,
    marcaCol: 3,
    modeloCol: 4,
    activoCol: 5,
    doctorCol: -1,
    horarioCol: -1,
    obsCol: 12,
    ultimoMovCol: 13
  };

  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i] || "").trim().toUpperCase();
    if (h === "ESPACIO" || h === "ID" || h === "PUESTO") map.idCol = i + 1;
    else if (h === "ESTADO") map.estadoCol = i + 1;
    else if (h.indexOf("MARCA") !== -1 && h.indexOf("MONITOR") === -1) map.marcaCol = i + 1;
    else if (h === "MODELO") map.modeloCol = i + 1;
    else if (h === "ACTIVO") map.activoCol = i + 1;
    else if (h === "DOCTOR" || h === "MEDICO") map.doctorCol = i + 1;
    else if (h === "HORARIO" || h === "TURNO") map.horarioCol = i + 1;
    else if (h.indexOf("OBSERV") !== -1) map.obsCol = i + 1;
    else if (h.indexOf("ULTIMO") !== -1 || h.indexOf("FECHA") !== -1) map.ultimoMovCol = i + 1;
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
    // 0. Diagnóstico y verificación de ambas hojas
    if (action === "ping" || action === "getMeta") {
      var ssSpaces = getSpacesSpreadsheet();
      var ssDocs = getDoctorsSpreadsheet();
      return createJsonResponse({
        success: true,
        message: "DoctorSV Sheets API conectada con éxito",
        spacesBook: {
          name: ssSpaces.getName(),
          sheets: ssSpaces.getSheets().map(function(s) { return s.getName(); })
        },
        doctorsBook: {
          name: ssDocs.getName(),
          sheets: ssDocs.getSheets().map(function(s) { return s.getName(); })
        }
      });
    }

    // 1. Obtener puestos / cubículos del inventario
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

        spaces.push({
          id: idNum,
          estado: row[map.estadoCol - 1] || "DISPONIBLE",
          marca: row[map.marcaCol - 1] || "DELL",
          modelo: row[map.modeloCol - 1] || "OptiPlex 3080",
          activoPc: row[map.activoCol - 1] || "",
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

    // 2. Obtener lista de médicos
    if (action === "getDoctors") {
      var ss = getDoctorsSpreadsheet();
      var docSheet = ss.getSheetByName("Buscador de Médicos") || ss.getSheetByName("SEDE SAN MIGUEL") || ss.getSheetByName("Medicos") || ss.getSheets()[0];
      var data = docSheet.getDataRange().getValues();
      var doctors = [];

      // Si es "Buscador de Médicos" o "SEDE SAN MIGUEL", buscar fila de encabezado
      var startRow = 1;
      var idIdx = 0;
      var nameIdx = 1;
      var shiftIdx = 3;

      for (var r = 0; r < Math.min(15, data.length); r++) {
        for (var c = 0; c < data[r].length; c++) {
          var val = String(data[r][c] || "").toUpperCase();
          if (val.indexOf("NOMBRE DE MÉDICO") !== -1 || val.indexOf("NOMBRE") !== -1 && val.indexOf("BUSCAR") === -1) {
            startRow = r + 1;
            nameIdx = c;
            break;
          }
        }
      }

      for (var i = startRow; i < data.length; i++) {
        var row = data[i];
        var name = String(row[nameIdx] || "").trim();
        if (!name || name.indexOf("---") !== -1 || name.indexOf("SEPTIEMBRE") !== -1) continue;

        doctors.push({
          id: row[0] || (i - startRow + 1),
          nombre: name.toUpperCase(),
          tipo: "Planilla",
          horario: row[shiftIdx] || "Turno Rotativo"
        });
      }

      return createJsonResponse({
        success: true,
        count: doctors.length,
        bookUsed: ss.getName(),
        sheetUsed: docSheet.getName(),
        doctors: doctors
      });
    }

    return createJsonResponse({ success: true, message: "DoctorSV Centralized Sheets API en línea" });
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    var action = body.action || "updateSpace";

    // 1. Actualizar estado de puesto / asignación de doctor
    if (action === "updateSpace") {
      var ss = getSpacesSpreadsheet();
      var sheet = getInventorySheet(ss);
      var map = getColumnMapping(sheet);
      var data = sheet.getDataRange().getValues();
      var targetId = Number(body.spaceId);
      var rowIndex = -1;

      for (var i = 1; i < data.length; i++) {
        if (Number(data[i][map.idCol - 1]) === targetId) {
          rowIndex = i + 1; // 1-indexed
          break;
        }
      }

      if (rowIndex > 0) {
        if (body.estado !== undefined && map.estadoCol > 0) {
          sheet.getRange(rowIndex, map.estadoCol).setValue(body.estado);
        }
        if (body.doctor !== undefined && map.doctorCol > 0) {
          sheet.getRange(rowIndex, map.doctorCol).setValue(body.doctor);
        }
        if (body.horario !== undefined && map.horarioCol > 0) {
          sheet.getRange(rowIndex, map.horarioCol).setValue(body.horario);
        }
        if (body.observaciones !== undefined && map.obsCol > 0) {
          sheet.getRange(rowIndex, map.obsCol).setValue(body.observaciones);
        }
        if (map.ultimoMovCol > 0) {
          sheet.getRange(rowIndex, map.ultimoMovCol).setValue(new Date());
        }
        return createJsonResponse({
          success: true,
          updatedSpaceId: targetId,
          book: ss.getName(),
          sheet: sheet.getName(),
          row: rowIndex
        });
      } else {
        return createJsonResponse({ success: false, message: "Puesto #" + targetId + " no encontrado" });
      }
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
      var staffSheet = ss.getSheetByName("Medicos") || ss.getSheetByName("Personal") || ss.getSheetByName("personal SSM") || ss.getSheets()[0];
      var s = body.staff || {};
      staffSheet.appendRow([
        s.id || new Date().getTime(),
        s.nombre || "",
        s.categoria || s.tipo || "Planilla",
        s.rol || "Médico General",
        s.horario || ""
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
