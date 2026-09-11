/**
 * =========================================================================
 * DoctorSV — Google Apps Script Backend para Google Sheets
 * =========================================================================
 * Conexión bidireccional en tiempo real con DoctorSV Web App
 * Soporta las hojas oficiales: "INVENTARIO ACTUALIZADO", "MOVIMIENTOS DE INVENTARIO", etc.
 * =========================================================================
 */

function getInventorySheet(ss) {
  var candidateNames = ["INVENTARIO ACTUALIZADO", "Inventario", "_BASE_DATOS", "INVENTARIO"];
  for (var i = 0; i < candidateNames.length; i++) {
    var s = ss.getSheetByName(candidateNames[i]);
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

  // Agregar columnas DOCTOR y HORARIO si no existen
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
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    if (action === "ping" || action === "getMeta") {
      var sheet = getInventorySheet(ss);
      return createJsonResponse({
        success: true,
        message: "DoctorSV Sheets API conectada",
        spreadsheetName: ss.getName(),
        sheets: ss.getSheets().map(function(s) { return s.getName(); }),
        activeSheet: sheet.getName(),
        totalRows: sheet.getLastRow()
      });
    }

    if (action === "getSpaces") {
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
        sheetUsed: sheet.getName(),
        spaces: spaces
      });
    }

    if (action === "getDoctors") {
      var docSheet = ss.getSheetByName("Medicos") || ss.getSheetByName("Doctores") || ss.getSheetByName("Buscador_Medicos") || ss.getSheets()[0];
      var data = docSheet.getDataRange().getValues();
      var doctors = [];

      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        if (!row[1] && !row[0]) continue;
        doctors.push({
          id: row[0] || i,
          nombre: String(row[1] || "").trim().toUpperCase(),
          tipo: row[2] || "Planilla",
          horario: row[3] || "Turno Rotativo"
        });
      }

      return createJsonResponse({ success: true, count: doctors.length, doctors: doctors });
    }

    return createJsonResponse({ success: true, message: "DoctorSV Sheets API en línea" });
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    var action = body.action || "updateSpace";

    // 1. Actualizar estado de puesto / asignación de doctor
    if (action === "updateSpace") {
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
        return createJsonResponse({ success: true, updatedSpaceId: targetId, sheet: sheet.getName(), row: rowIndex });
      } else {
        return createJsonResponse({ success: false, message: "Puesto #" + targetId + " no encontrado" });
      }
    }

    // 2. Registrar movimiento en la hoja de Historial / Auditoría
    if (action === "logMovement") {
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
      return createJsonResponse({ success: true, logged: true, sheet: histSheet.getName() });
    }

    // 3. Agregar personal al Padrón
    if (action === "addStaff") {
      var staffSheet = ss.getSheetByName("Medicos") || ss.getSheetByName("Personal") || ss.getSheetByName("personal SSM") || ss.getSheets()[0];
      var s = body.staff || {};
      staffSheet.appendRow([
        s.id || new Date().getTime(),
        s.nombre || "",
        s.categoria || s.tipo || "Planilla",
        s.rol || "Médico General",
        s.horario || ""
      ]);
      return createJsonResponse({ success: true, added: true });
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
