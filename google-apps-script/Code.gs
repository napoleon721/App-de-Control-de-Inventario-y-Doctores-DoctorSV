/**
 * =========================================================================
 * DoctorSV — Google Apps Script Backend para Google Sheets
 * =========================================================================
 * Instrucciones:
 * 1. Abre tu hoja de cálculo en Google Sheets (ej. "Sistema TM-SM V2").
 * 2. En el menú superior ve a: Extensiones -> Apps Script.
 * 3. Borra cualquier código existente y pega todo este contenido.
 * 4. Guarda con Ctrl+S (o Cmd+S).
 * 5. Haz clic en "Implementar" (botón azul arriba a la derecha) -> "Nueva implementación".
 * 6. Tipo: "Aplicación web".
 * 7. Ejecutar como: "Yo" (tu cuenta de Google).
 * 8. Quién tiene acceso: "Cualquier persona" (Anyone).
 * 9. Haz clic en "Implementar" y copia la URL proporcionada.
 * 10. Pega esa URL en DoctorSV.
 * =========================================================================
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "getSpaces";
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    if (action === "getSpaces") {
      var sheet = ss.getSheetByName("Inventario") || ss.getSheets()[0];
      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var spaces = [];

      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        if (!row[0]) continue;
        spaces.push({
          id: Number(row[0]),
          estado: row[1] || "DISPONIBLE",
          marca: row[2] || "DELL",
          modelo: row[3] || "OptiPlex 3080",
          activoPc: row[4] || "",
          doctor: row[5] || null,
          horario: row[6] || null,
          observaciones: row[7] || "",
          ultimoMovimiento: row[8] ? Utilities.formatDate(new Date(row[8]), "GMT-6", "dd/MM/yyyy HH:mm") : null
        });
      }

      return createJsonResponse({ success: true, count: spaces.length, spaces: spaces });
    }

    if (action === "getDoctors") {
      var sheet = ss.getSheetByName("Medicos") || ss.getSheetByName("Doctores") || ss.getSheets()[0];
      var data = sheet.getDataRange().getValues();
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
      var sheet = ss.getSheetByName("Inventario") || ss.getSheets()[0];
      var data = sheet.getDataRange().getValues();
      var targetId = Number(body.spaceId);
      var rowIndex = -1;

      for (var i = 1; i < data.length; i++) {
        if (Number(data[i][0]) === targetId) {
          rowIndex = i + 1; // 1-indexed
          break;
        }
      }

      if (rowIndex > 0) {
        if (body.estado !== undefined) sheet.getRange(rowIndex, 2).setValue(body.estado);
        if (body.doctor !== undefined) sheet.getRange(rowIndex, 6).setValue(body.doctor);
        if (body.horario !== undefined) sheet.getRange(rowIndex, 7).setValue(body.horario);
        if (body.observaciones !== undefined) sheet.getRange(rowIndex, 8).setValue(body.observaciones);
        sheet.getRange(rowIndex, 9).setValue(new Date());
        return createJsonResponse({ success: true, updatedSpaceId: targetId });
      } else {
        return createJsonResponse({ success: false, message: "Puesto no encontrado" });
      }
    }

    // 2. Registrar movimiento en la hoja de Historial / Auditoría
    if (action === "logMovement") {
      var histSheet = ss.getSheetByName("Historial") || ss.getSheetByName("Movimientos");
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
      return createJsonResponse({ success: true, logged: true });
    }

    // 3. Agregar personal al Padrón
    if (action === "addStaff") {
      var staffSheet = ss.getSheetByName("Medicos") || ss.getSheetByName("Personal") || ss.getSheets()[0];
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
