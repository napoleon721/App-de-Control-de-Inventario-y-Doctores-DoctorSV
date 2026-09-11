/**
 * =========================================================================
 * DoctorSV — Backend Centralizado para las 3 Hojas Oficiales de Google Sheets
 * =========================================================================
 * 1. Sistema TM-SM V2 (140 Cubículos, Estados en Vivo, Bodega y Auditoría)
 * 2. Buscador de Médicos con Tipo (Padrón Oficial de Médicos y Turnos)
 * 3. Personal SSM (Personal Adicional de Sede San Miguel)
 * =========================================================================
 */

// IDs de las tres hojas oficiales de Google Sheets
var SHEET_SPACES_ID  = "1VNZQLl_JKzEaJzoV2Yi_QbhZxsykrBtgE-y9KnzcAPM"; // Sistema TM-SM V2
var SHEET_DOCTORS_ID = "1VqHT9fJfPd60ro3NFBAi1NzhOHHcuXbdApKv6cNFKXs"; // Buscador_Medicos_Con_Tipo
var SHEET_STAFF_ID   = "1_VQKDLOcWM4JNoo5veD2Bn7ASWhgHmhE70iTcBCSmPQ"; // personal SSM

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

    // 2. Obtener lista completa de médicos (Buscador_Medicos_Con_Tipo + Personal SSM)
    if (action === "getDoctors") {
      var ssDocs = getDoctorsSpreadsheet();
      var docSheet = ssDocs.getSheetByName("Buscador de Médicos") || ssDocs.getSheets()[0];
      var data = docSheet.getDataRange().getValues();
      var doctors = [];
      var seenNames = {};

      // Si es "Buscador de Médicos", leer directamente la tabla maestra en columnas H a L (Col 8 a 12)
      if (docSheet.getName() === "Buscador de Médicos") {
        for (var r = 8; r < data.length; r++) {
          var row = data[r];
          // Col 9 (index 8): Nombre del Médico en tabla maestra
          var masterName = row[8] ? String(row[8]).trim() : "";
          if (masterName && masterName !== "Nombre de Médico" && masterName.indexOf("---") === -1) {
            var upperName = masterName.toUpperCase();
            if (!seenNames[upperName]) {
              seenNames[upperName] = true;
              doctors.push({
                id: Number(row[7]) || (doctors.length + 1), // Col 8 (index 7): ID
                nombre: upperName,
                horario: row[9] ? String(row[9]).trim() : "Turno Rotativo", // Col 10 (index 9): Turno
                cubiculo: row[10] ? Number(row[10]) : null, // Col 11 (index 10): Cubículo
                tipo: row[11] ? String(row[11]).trim() : "Planilla" // Col 12 (index 11): Tipo
              });
            }
          }
        }
      }

      // Si no se encontraron en la tabla maestra (o para otra hoja), buscar por encabezados dinámicos
      if (doctors.length === 0) {
        var startRow = 1;
        var idCol = 1;
        var nameCol = 2;
        var shiftCol = 3;
        var cubiculoCol = 4;
        var tipoCol = 5;

        for (var r = 0; r < Math.min(15, data.length); r++) {
          for (var c = 0; c < data[r].length; c++) {
            var val = String(data[r][c] || "").toUpperCase();
            if (val.indexOf("NOMBRE DE MÉDICO") !== -1 || (val.indexOf("NOMBRE") !== -1 && val.indexOf("BUSCAR") === -1)) {
              startRow = r + 1;
              nameCol = c;
              idCol = Math.max(0, c - 1);
              shiftCol = c + 1;
              cubiculoCol = c + 2;
              tipoCol = c + 3;
              break;
            }
          }
        }

        for (var i = startRow; i < data.length; i++) {
          var row = data[i];
          var name = String(row[nameCol] || "").trim();
          if (!name || name.indexOf("---") !== -1 || name.indexOf("SEPTIEMBRE") !== -1 || name.indexOf("BUSCADOR") !== -1) continue;

          var cleanName = name.toUpperCase();
          if (!seenNames[cleanName]) {
            seenNames[cleanName] = true;
            doctors.push({
              id: row[idCol] || (doctors.length + 1),
              nombre: cleanName,
              tipo: row[tipoCol] || "Planilla",
              horario: row[shiftCol] || "Turno Rotativo",
              cubiculo: row[cubiculoCol] || null
            });
          }
        }
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

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    var action = body.action || "updateSpace";

    // 1. Actualizar estado de puesto / asignación de doctor (En Sistema TM-SM V2)
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
