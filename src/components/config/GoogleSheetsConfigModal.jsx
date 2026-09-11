import React, { useState } from "react";
import {
  FileSpreadsheet, Check, AlertCircle, RefreshCw, X, ExternalLink,
  Copy, CheckCircle2, Shield, Laptop, Database, Globe
} from "lucide-react";
import {
  getSheetsApiUrl,
  setSheetsApiUrl,
  fetchSpacesFromGoogleSheets,
  isSheetsConfigured
} from "../../services/googleSheetsService";

export default function GoogleSheetsConfigModal({ onClose, onSyncComplete }) {
  const [url, setUrl] = useState(getSheetsApiUrl());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  async function handleTestConnection() {
    if (!url.trim()) {
      setTestResult({ success: false, message: "Por favor ingresa una URL válida de Google Apps Script." });
      return;
    }
    setTesting(true);
    setTestResult(null);

    // Guardar temporalmente para probar
    setSheetsApiUrl(url);

    const spaces = await fetchSpacesFromGoogleSheets();
    setTesting(false);
    if (spaces && spaces.length > 0) {
      setTestResult({
        success: true,
        message: `¡Conexión exitosa! Se leyeron ${spaces.length} puestos en tiempo real desde tu Google Sheet.`,
      });
      if (onSyncComplete) onSyncComplete(spaces);
    } else {
      setTestResult({
        success: false,
        message: "No se pudo comunicar con Google Sheets. Verifica que hayas implementado la aplicación web con acceso a 'Cualquier persona' (Anyone).",
      });
    }
  }

  function handleSave(e) {
    e.preventDefault();
    setSheetsApiUrl(url);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  }

  function handleCopyScriptInstructions() {
    const scriptCode = `// Pega este código en Extensiones -> Apps Script de tu Google Sheet
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "getSpaces";
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Inventario") || ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var spaces = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    spaces.push({
      id: Number(row[0]),
      estado: row[1] || "DISPONIBLE",
      marca: row[2] || "DELL",
      doctor: row[5] || null,
      horario: row[6] || null
    });
  }
  return ContentService.createTextOutput(JSON.stringify({ success: true, count: spaces.length, spaces: spaces }))
    .setMimeType(ContentService.MimeType.JSON);
}`;
    navigator.clipboard.writeText(scriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  }

  const isConfigured = isSheetsConfigured();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-5 backdrop-blur-md overflow-y-auto">
      <div
        style={{ animation: "popIn .25s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200/90 my-auto flex flex-col max-h-[92vh]"
      >
        {/* Header en Verde Institucional Google Sheets */}
        <div className="relative bg-gradient-to-br from-[#0F9D58] via-[#107C41] to-[#0D6535] px-6 pt-6 pb-5 text-white overflow-hidden shrink-0">
          <div className="relative flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-inner">
                <FileSpreadsheet size={22} />
              </span>
              <div>
                <h3 className="font-heading text-lg font-bold text-white leading-tight">
                  Vincular Google Sheets
                </h3>
                <p className="text-[11.5px] text-emerald-100 font-medium leading-none mt-0.5">
                  Base de Datos en Vivo · Hojas de Cálculo en la Nube
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-all text-sm font-bold"
            >
              ✕
            </button>
          </div>

          {/* Status badge */}
          <div className="mt-3 flex items-center gap-2 text-[11.5px] font-semibold">
            <span
              className={`h-2 w-2 rounded-full ${
                isConfigured ? "bg-emerald-300 animate-pulse" : "bg-amber-300"
              }`}
            />
            <span>
              {isConfigured
                ? "Google Sheets Conectado y Listo"
                : "Modo Local Activo (Pendiente pegar enlace de Webhook)"}
            </span>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3.5 text-[12px] flex items-start gap-2.5 text-slate-700">
            <Database size={16} className="text-emerald-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-emerald-950">
                Todo el ambiente está preparado para Google Sheets
              </p>
              <p className="text-[11.5px] text-slate-600 leading-snug">
                Cuando tengas creados tus Google Sheets en Google Drive, solo pega la URL de la aplicación web de Apps Script aquí. La aplicación leerá y actualizará celdas en tiempo real.
              </p>
            </div>
          </div>

          {/* Input de URL */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-700">
              URL del Webhook de Google Apps Script
            </label>
            <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:bg-white transition-all">
              <Globe size={16} className="text-emerald-600 mr-2 shrink-0" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full bg-transparent text-[12.5px] font-medium text-slate-900 outline-none placeholder:text-slate-400 font-mono-data"
              />
              {url && (
                <button
                  type="button"
                  onClick={() => setUrl("")}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold ml-2"
                >
                  ✕
                </button>
              )}
            </div>
            <p className="mt-1 text-[10.5px] text-slate-400">
              También puedes definirla en el archivo <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">.env</code> con <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">VITE_GOOGLE_SHEETS_API_URL</code>.
            </p>
          </div>

          {/* Botón de Test de Conexión */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !url.trim()}
              className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 px-3.5 py-2 text-[12px] font-bold transition-all disabled:opacity-50"
            >
              <RefreshCw size={13} className={testing ? "animate-spin text-emerald-700" : "text-emerald-700"} />
              <span>{testing ? "Probando conexión..." : "Probar Conexión con Sheets"}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyScriptInstructions}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 text-[12px] font-semibold transition-all"
              title="Copiar código Apps Script para pegar en Google Sheets"
            >
              {copiedScript ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} className="text-slate-400" />}
              <span>{copiedScript ? "¡Código Copiado!" : "Copiar Apps Script"}</span>
            </button>
          </div>

          {/* Resultado de la prueba */}
          {testResult && (
            <div
              className={`p-3 rounded-2xl border text-[12px] font-medium flex items-start gap-2 ${
                testResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Guía rápida de 3 pasos */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              ¿Cómo obtener la URL de tu Google Sheet en 3 pasos?
            </p>
            <ol className="text-[11.5px] text-slate-600 space-y-1.5 list-decimal pl-4">
              <li>Abre tu hoja en Google Sheets → <strong>Extensiones</strong> → <strong>Apps Script</strong>.</li>
              <li>Pega el código que está en <code className="font-mono bg-white px-1 py-0.5 rounded border">google-apps-script/Code.gs</code>.</li>
              <li>Haz clic en <strong>Implementar</strong> → <strong>Nueva implementación</strong> → Tipo: <strong>Aplicación web</strong> (Acceso: <em>Cualquier persona</em>) y copia la URL.</li>
            </ol>
          </div>

          {/* Guardar */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-[12.5px] font-bold text-slate-600 hover:bg-slate-100 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12.5px] font-bold text-white shadow-md transition-all hover:brightness-110 active:scale-95"
              style={{ background: "linear-gradient(135deg, #0F9D58 0%, #107C41 100%)" }}
            >
              {savedSuccess ? <Check size={15} /> : <CheckCircle2 size={15} />}
              <span>{savedSuccess ? "¡Guardado!" : "Guardar Configuración"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
