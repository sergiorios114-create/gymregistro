/**
 * Backend API — Registro de entrenamiento
 * Publicado como Web App (ejecutar como: yo / acceso: cualquiera con el enlace).
 *
 * Seguridad: todas las peticiones deben incluir un token compartido que se
 * compara con la Script Property API_TOKEN (configurar en:
 * Configuración del proyecto → Propiedades del secuencia de comandos).
 *
 * Los IDs de planilla no son secretos (no otorgan acceso por sí solos).
 * Ambas planillas viven en la MISMA cuenta que ejecuta el script (creadas por
 * setupNuevasPlanillas), así no hace falta compartir entre cuentas.
 */

var CARGAS_ID = '1vrFg1hnOWlc6qP0DHB3zcXVB2iZieVKuaC2jgUGwPE8';
var BITACORA_ID = '1CMnyW-DAg2IhMg4CTSa7yUBGqUkoIMS45nNs3T9SpIo';

// ---------------------------------------------------------------- utilidades

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function checkToken_(token) {
  var expected = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
  if (!expected) throw new Error('API_TOKEN no configurado en Script Properties');
  if (token !== expected) throw new Error('Token inválido');
}

function firstSheet_(id) {
  return SpreadsheetApp.openById(id).getSheets()[0];
}

// -------------------------------------------------------------------- lectura

function readCargas_() {
  var sheet = firstSheet_(CARGAS_ID);
  var values = sheet.getDataRange().getDisplayValues();
  if (values.length === 0) return { headers: [], rows: [] };
  return { headers: values[0], rows: values.slice(1) };
}

function readBitacora_() {
  var sheet = firstSheet_(BITACORA_ID);
  var values = sheet.getDataRange().getDisplayValues();
  if (values.length === 0) return { headers: [], rows: [] };
  return { headers: values[0], rows: values.slice(1) };
}

// ------------------------------------------------------------------ escritura

/**
 * Escribe el valor de una carga en la columna "Sem N" de la fila que coincide
 * con Día + Ejercicio. Crea la fila si no existe.
 */
function saveCarga_(payload) {
  var dia = String(payload.dia || '').trim();
  var ejercicio = String(payload.ejercicio || '').trim();
  var semana = Number(payload.semana);
  var valor = String(payload.valor || '').trim();
  if (!dia || !ejercicio) throw new Error('Faltan dia/ejercicio');
  if (!(semana >= 1 && semana <= 8)) throw new Error('Semana fuera de rango (1-8)');

  var sheet = firstSheet_(CARGAS_ID);
  var values = sheet.getDataRange().getDisplayValues();
  var headers = values[0];

  var colSem = headers.findIndex(function (h) {
    return h.replace(/\s+/g, ' ').trim().toLowerCase() === 'sem ' + semana;
  });
  if (colSem === -1) throw new Error('No existe la columna "Sem ' + semana + '"');

  var norm = function (s) {
    return String(s).replace(/\s+/g, ' ').trim().toLowerCase();
  };
  var rowIndex = -1;
  for (var i = 1; i < values.length; i++) {
    if (norm(values[i][0]) === norm(dia) && norm(values[i][1]) === norm(ejercicio)) {
      rowIndex = i;
      break;
    }
  }

  if (rowIndex === -1) {
    var newRow = new Array(headers.length).fill('');
    newRow[0] = dia;
    newRow[1] = ejercicio;
    if (payload.objetivo) newRow[2] = String(payload.objetivo);
    newRow[colSem] = valor;
    sheet.appendRow(newRow);
    return { created: true, semana: semana, valor: valor };
  }

  sheet.getRange(rowIndex + 1, colSem + 1).setValue(valor);
  return { created: false, semana: semana, valor: valor };
}

/**
 * Reescribe la hoja de cargas completa con la matriz reconciliada.
 * SIEMPRE respalda la hoja actual antes de tocarla: crea una copia con la fecha
 * en el nombre. Si algo sale mal, el respaldo queda en el mismo archivo.
 *
 * payload: { matriz: [[fila...], ...] } — la primera fila son los encabezados.
 */
function reconciliar_(payload) {
  var matriz = payload && payload.matriz;
  if (!matriz || !matriz.length) throw new Error('Matriz vacía');
  var ancho = matriz[0].length;
  for (var i = 0; i < matriz.length; i++) {
    if (matriz[i].length !== ancho) throw new Error('Fila ' + i + ' con ancho distinto');
  }

  var ss = SpreadsheetApp.openById(CARGAS_ID);
  var sheet = ss.getSheets()[0];

  // 1) respaldo con marca de tiempo
  var stamp = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd HHmm');
  var nombreBackup = 'Backup ' + stamp;
  if (ss.getSheetByName(nombreBackup)) ss.deleteSheet(ss.getSheetByName(nombreBackup));
  sheet.copyTo(ss).setName(nombreBackup);

  // 2) reescritura
  sheet.clearContents();
  sheet.getRange(1, 1, matriz.length, ancho).setValues(matriz);
  sheet.getRange(1, 1, 1, ancho).setFontWeight('bold');
  sheet.setFrozenRows(1);

  return { filas: matriz.length - 1, columnas: ancho, respaldo: nombreBackup };
}

/**
 * Agrega una fila a la bitácora:
 * Fecha | Día | Sesión | Energía (1-5) | Sueño (h) | Hombro | Peso corporal (kg) | Fase dieta | Notas
 */
function saveBitacora_(payload) {
  var sheet = firstSheet_(BITACORA_ID);
  sheet.appendRow([
    String(payload.fecha || ''),
    String(payload.dia || ''),
    String(payload.sesion || ''),
    payload.energia != null ? Number(payload.energia) : '',
    payload.sueno != null ? Number(payload.sueno) : '',
    String(payload.hombro || ''),
    payload.peso != null ? Number(payload.peso) : '',
    String(payload.fase || ''),
    String(payload.notas || ''),
  ]);
  return { appended: true };
}

// ----------------------------------------------------------------- endpoints

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    checkToken_(p.token);
    switch (p.action) {
      case 'ping':
        return jsonResponse_({ ok: true, data: 'pong' });
      case 'cargas':
        return jsonResponse_({ ok: true, data: readCargas_() });
      case 'bitacora':
        return jsonResponse_({ ok: true, data: readBitacora_() });
      default:
        return jsonResponse_({ ok: false, error: 'Acción desconocida: ' + p.action });
    }
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

/**
 * El frontend envía POST con Content-Type text/plain (evita el preflight CORS
 * que Apps Script no soporta). El cuerpo es JSON:
 *   { token, action: 'saveCarga'|'saveBitacora', payload: {...} }
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    checkToken_(body.token);
    switch (body.action) {
      case 'saveCarga':
        return jsonResponse_({ ok: true, data: saveCarga_(body.payload || {}) });
      case 'saveBitacora':
        return jsonResponse_({ ok: true, data: saveBitacora_(body.payload || {}) });
      case 'reconciliar':
        return jsonResponse_({ ok: true, data: reconciliar_(body.payload || {}) });
      default:
        return jsonResponse_({ ok: false, error: 'Acción desconocida: ' + body.action });
    }
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}
