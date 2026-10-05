import React, { useState, useMemo } from "react";
import {
  Calendar, X, UploadCloud, Clipboard, CheckCircle2, AlertTriangle,
  Users, Sparkles, Filter, Search, ArrowRight, RefreshCw, FileSpreadsheet,
  Clock, ShieldCheck, Check, Layers, ChevronRight, HelpCircle,
  ExternalLink, Globe, Edit2, Link2, Loader2, Database, Download, FileText
} from "lucide-react";
import { parseQuincenaSpreadsheet, parseDoctorLine, buildLookupMaps } from "../../utils/quincenaParser";
import { DOCTORES_EXCEL, STAFF_EXCEL, SUPERVISORES_OFICIALES } from "../../constants/tokens";
import {
  getMasterPlanillaUrl,
  setMasterPlanillaUrl,
  DEFAULT_MASTER_PLANILLA_URL,
  DEFAULT_PLANILLA_SUPERVISOR_TABS,
  getPlanillaSupervisorSheetConfigs,
  updatePlanillaSupervisorSheetUrl,
  syncPlanillaSupervisorSheets,
  mergeQuincenas
} from "../../services/googleSheetsService";

export default function PlanillaManagerModal({
  activeQuincena = null,
  selectedDate = null,
  onSelectDate = null,
  onSaveQuincena,
  onClose,
  supervisores = SUPERVISORES_OFICIALES,
}) {
  const [activeTab, setActiveTab] = useState("GOOGLE_SHEETS"); // "GOOGLE_SHEETS", "CALENDARIO", "IMPORTAR_TABLA", "CONSEJOS"
  const [selectedDayKey, setSelectedDayKey] = useState(() => {
    if (selectedDate && activeQuincena?.dias?.some((d) => d.dateKey === selectedDate)) {
      return selectedDate;
    }
    return activeQuincena?.dias?.[0]?.dateKey || "2026-10-01";
  });

  // Estado para la pestaña de Google Sheets en vivo
  const [masterUrl, setMasterUrlState] = useState(() => getMasterPlanillaUrl());
  const [isEditingMasterUrl, setIsEditingMasterUrl] = useState(false);
  const [masterUrlInput, setMasterUrlInput] = useState(() => getMasterPlanillaUrl());
  const [sheetConfigs, setSheetConfigs] = useState(() => getPlanillaSupervisorSheetConfigs());
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [syncResults, setSyncResults] = useState(null);
  const [syncError, setSyncError] = useState("");
  const [editingSupId, setEditingSupId] = useState(null);
  const [editUrlInput, setEditUrlInput] = useState("");

  // Estado para importar tabla pegada
  const [pastedTableText, setPastedTableText] = useState("");
  const [parsedPreview, setParsedPreview] = useState(null);
  const [parseError, setParseError] = useState("");

  // Guardar cambio de URL Maestra
  function handleSaveMasterUrl() {
    const clean = masterUrlInput.trim();
    if (!clean) return;
    setMasterPlanillaUrl(clean);
    setMasterUrlState(clean);
    setIsEditingMasterUrl(false);
  }

  function handleResetMasterUrl() {
    setMasterPlanillaUrl(DEFAULT_MASTER_PLANILLA_URL);
    setMasterUrlState(DEFAULT_MASTER_PLANILLA_URL);
    setMasterUrlInput(DEFAULT_MASTER_PLANILLA_URL);
    setIsEditingMasterUrl(false);
  }

  // Manejar sincronización en vivo con el documento de Google Sheets de Planilla
  async function handleSyncAllFromSheets() {
    setIsSyncingSheets(true);
    setSyncError("");
    try {
      const res = await syncPlanillaSupervisorSheets({
        doctorsList: DOCTORES_EXCEL,
        staffList: STAFF_EXCEL,
        supervisoresList: supervisores,
        customConfigs: sheetConfigs,
        masterUrl: masterUrl,
      });

      if (res.success && res.quincena) {
        setSyncResults(res.results);
        const todayStr = new Date().toLocaleDateString("en-CA");
        const targetDate = res.quincena.dias?.some((d) => d.dateKey === todayStr)
          ? todayStr
          : res.quincena.dias?.[0]?.dateKey || "2026-10-01";

        // Fusión inteligente: preservar asignaciones existentes de Servicios Profesionales
        const merged = mergeQuincenas(activeQuincena, res.quincena);
        onSaveQuincena(merged, targetDate);
        setSelectedDayKey(targetDate);
        if (onSelectDate) onSelectDate(targetDate);
      } else {
        setSyncError(res.error || "No se pudo sincronizar la información de Planilla.");
      }
    } catch (err) {
      setSyncError("Error al sincronizar Planilla con Google Sheets: " + err.message);
    } finally {
      setIsSyncingSheets(false);
    }
  }

  function handleStartEditUrl(supId, currentUrl) {
    setEditingSupId(supId);
    setEditUrlInput(currentUrl || "");
  }

  function handleSaveEditUrl(supId) {
    if (!editUrlInput.trim()) return;
    const updated = updatePlanillaSupervisorSheetUrl(supId, editUrlInput.trim());
    setSheetConfigs(updated);
    setEditingSupId(null);
  }

  // Manejar análisis de la tabla o matriz pegada
  function handleAnalyzeTable(text) {
    setPastedTableText(text);
    setParseError("");
    if (!text.trim()) {
      setParsedPreview(null);
      return;
    }

    try {
      const res = parseQuincenaSpreadsheet(text, DOCTORES_EXCEL, STAFF_EXCEL, supervisores);
      if (res.success && (res.type === "TABLE" || res.type === "PLANILLA_MATRIX")) {
        setParsedPreview(res);
        setParseError("");
      } else if (res.success && res.type === "SINGLE_LIST") {
        setParseError("El texto pegado corresponde a una sola lista. Para cargar planilla, copia la tabla completa con encabezados de fechas.");
        setParsedPreview(null);
      } else {
        setParseError(res.error || "No se pudo interpretar el formato de la tabla de Planilla.");
        setParsedPreview(null);
      }
    } catch (err) {
      setParseError("Error al procesar el texto: " + err.message);
      setParsedPreview(null);
    }
  }

  async function handlePasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleAnalyzeTable(text);
      }
    } catch (err) {
      alert("Por favor presiona Ctrl+V o Cmd+V dentro del área de texto.");
    }
  }

  // Guardar la planilla importada
  function handleConfirmSavePlanilla() {
    if (!parsedPreview) return;

    const merged = mergeQuincenas(activeQuincena, {
      ...parsedPreview,
      source: "IMPORT_PLANILLA_TABLE",
      tipoNomina: "PLANILLA",
    });

    onSaveQuincena(merged);
    setActiveTab("CALENDARIO");
    setSelectedDayKey(parsedPreview.dias[0]?.dateKey || selectedDayKey);
  }

  // Día activo para la vista de calendario
  const currentDayData = useMemo(() => {
    return activeQuincena?.dias?.find((d) => d.dateKey === selectedDayKey) || activeQuincena?.dias?.[0] || null;
  }, [activeQuincena, selectedDayKey]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Encabezado del Modal */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0048B5] text-white shadow-md shadow-blue-500/20 shrink-0">
              <FileSpreadsheet size={22} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-lg font-black text-slate-900 tracking-tight">
                  Gestor de Nómina de Planilla · Google Sheets & Excel
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-[#0048B5] font-mono">
                  PLANILLA OFICIAL
                </span>
              </div>
              <p className="text-[12px] text-slate-500 font-medium">
                Carga, sincronización y mapeo en vivo de médicos institucionales en planilla (Edward Zelaya, Roxana Canales)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Pestañas de Navegación */}
        <div className="px-6 pt-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("GOOGLE_SHEETS")}
              className={`px-4 py-2 text-[12.5px] font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === "GOOGLE_SHEETS"
                  ? "bg-white text-[#0048B5] border-[#0048B5] shadow-xs"
                  : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              <Globe size={15} className="text-[#0048B5]" />
              <span>Google Sheets en Vivo</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-[#0048B5] font-mono font-bold">
                Planilla
              </span>
            </button>

            <button
              onClick={() => setActiveTab("CALENDARIO")}
              className={`px-4 py-2 text-[12.5px] font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === "CALENDARIO"
                  ? "bg-white text-[#0048B5] border-[#0048B5] shadow-xs"
                  : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              <Calendar size={15} />
              <span>Calendario de Planilla</span>
              {activeQuincena?.dias?.length ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 font-mono">
                  {activeQuincena.dias.length} días
                </span>
              ) : null}
            </button>

            <button
              onClick={() => setActiveTab("IMPORTAR_TABLA")}
              className={`px-4 py-2 text-[12.5px] font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === "IMPORTAR_TABLA"
                  ? "bg-white text-[#0048B5] border-[#0048B5] shadow-xs"
                  : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              <FileSpreadsheet size={15} />
              <span>📥 Subir Matriz / Tabla</span>
            </button>

            <button
              onClick={() => setActiveTab("CONSEJOS")}
              className={`px-4 py-2 text-[12.5px] font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === "CONSEJOS"
                  ? "bg-white text-emerald-700 border-emerald-600 shadow-xs"
                  : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              <HelpCircle size={15} className="text-emerald-600" />
              <span>Consejos & Plantilla (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Contenido según pestaña */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/30">
          
          {/* ============================================================== */}
          {/* PESTAÑA 1: GOOGLE SHEETS EN VIVO                                */}
          {/* ============================================================== */}
          {activeTab === "GOOGLE_SHEETS" && (
            <div className="space-y-6">
              
              {/* Banner Informativo y Botón Principal */}
              <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[11px] font-bold">
                      <Sparkles size={13} className="text-blue-300" />
                      <span>Planilla Oficial · Conexión Google Sheets</span>
                    </div>
                    <h3 className="text-xl font-black text-white tracking-tight">
                      Sincronización en Vivo para Supervisores de Planilla
                    </h3>
                    <p className="text-[12.5px] text-blue-100/80 leading-relaxed">
                      Permite a <strong>Edward Josué Zelaya Prudencio</strong> (Grupo 1 · 28 médicos) y <strong>Roxana Guadalupe Canales Rodríguez</strong> (Grupo 2 · 29 médicos) cargar o sincronizar su nómina directamente desde Google Sheets con mapeo automático de turnos y días libres.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center shrink-0">
                    <button
                      type="button"
                      onClick={handleSyncAllFromSheets}
                      disabled={isSyncingSheets}
                      className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-400 to-indigo-300 hover:from-blue-300 hover:to-indigo-200 text-slate-950 text-[13px] font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSyncingSheets ? (
                        <>
                          <Loader2 size={18} className="animate-spin text-slate-950" />
                          <span>Descargando y Mapeando Planilla...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw size={18} className="text-slate-950" />
                          <span>Sincronizar Planilla en Vivo</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Mensajes de Estado */}
              {syncError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-[12.5px] font-bold flex items-center gap-3 shadow-xs">
                  <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                  <div className="flex-1">{syncError}</div>
                  <button onClick={() => setSyncError("")} className="text-rose-400 hover:text-rose-700 cursor-pointer">✕</button>
                </div>
              )}

              {syncResults && (
                <div className="p-4.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-[12.5px] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-black text-emerald-900 text-[13.5px]">
                        ¡Nómina de Planilla sincronizada con éxito!
                      </p>
                      <p className="text-[11.5px] text-emerald-700 font-medium">
                        Se actualizaron los turnos quincenales para Edward Zelaya y Roxana Canales preservando a Servicios Profesionales.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Configuración del Enlace Maestro de Planilla */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Link2 size={16} className="text-[#0048B5]" />
                    <span className="text-[13px] font-black text-slate-800">
                      Enlace de Google Sheets para Planilla (Libro Completo o Pestaña)
                    </span>
                  </div>
                  {!isEditingMasterUrl ? (
                    <button
                      onClick={() => setIsEditingMasterUrl(true)}
                      className="text-[11.5px] font-bold text-[#0048B5] hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 size={12} />
                      <span>Modificar Enlace</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveMasterUrl}
                        className="text-[11px] font-bold text-white bg-[#0048B5] hover:bg-blue-700 px-3 py-1 rounded-lg cursor-pointer"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={handleResetMasterUrl}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-800 px-2 py-1 cursor-pointer"
                      >
                        Restaurar
                      </button>
                    </div>
                  )}
                </div>

                {isEditingMasterUrl ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={masterUrlInput}
                      onChange={(e) => setMasterUrlInput(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className="flex-1 rounded-xl border border-blue-300 bg-blue-50/30 px-3.5 py-2 text-[12.5px] font-mono outline-none focus:ring-2 focus:ring-[#0095FF]/40 text-slate-800"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="font-mono text-[12px] text-slate-600 truncate max-w-2xl">
                      {masterUrl}
                    </span>
                    <a
                      href={masterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11.5px] font-bold text-[#0048B5] hover:underline flex items-center gap-1 shrink-0 ml-3"
                    >
                      <span>Abrir en Google</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>

              {/* Tarjetas de Supervisores de Planilla */}
              <div className="space-y-3">
                <h4 className="text-[12.5px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Users size={14} className="text-[#0048B5]" />
                  Supervisores con Médicos en Planilla
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(DEFAULT_PLANILLA_SUPERVISOR_TABS).map(([supId, tabInfo]) => {
                    const conf = sheetConfigs[supId] || tabInfo;
                    const isEditing = editingSupId === supId;

                    return (
                      <div key={supId} className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-2xs space-y-3 hover:border-blue-300 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              {tabInfo.grupo || supId}
                            </span>
                            <h5 className="font-black text-slate-900 text-[13.5px] mt-1">
                              {tabInfo.nombre}
                            </h5>
                            <p className="text-[11.5px] text-slate-500 font-medium">
                              {tabInfo.rol} · Puestos {tabInfo.puestosRange}
                            </p>
                          </div>
                          <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#0048B5] border border-blue-200">
                            Pestaña: {conf.tabName || tabInfo.tabName}
                          </span>
                        </div>

                        {/* URL individual opcional */}
                        <div className="pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-slate-500 font-medium">Hoja Individual (Opcional):</span>
                            {!isEditing ? (
                              <button
                                onClick={() => handleStartEditUrl(supId, conf.url)}
                                className="text-[#0048B5] hover:underline font-bold cursor-pointer"
                              >
                                {conf.url && conf.url !== DEFAULT_MASTER_PLANILLA_URL ? "Editar URL propia" : "+ Usar hoja separada"}
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleSaveEditUrl(supId)}
                                  className="text-white bg-[#0048B5] px-2 py-0.5 rounded text-[10.5px] font-bold cursor-pointer"
                                >
                                  Guardar
                                </button>
                                <button
                                  onClick={() => setEditingSupId(null)}
                                  className="text-slate-400 hover:text-slate-700 px-1 text-[10.5px] cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </div>

                          {isEditing ? (
                            <input
                              type="text"
                              value={editUrlInput}
                              onChange={(e) => setEditUrlInput(e.target.value)}
                              placeholder="URL de la hoja de este supervisor..."
                              className="w-full rounded-lg border border-blue-300 bg-blue-50/30 px-2.5 py-1 text-[11.5px] font-mono outline-none"
                            />
                          ) : conf.url && conf.url !== DEFAULT_MASTER_PLANILLA_URL ? (
                            <span className="text-[11px] font-mono text-slate-600 truncate block">
                              {conf.url}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Hereda del enlace maestro ({conf.tabName || tabInfo.tabName})
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ============================================================== */}
          {/* PESTAÑA 2: CALENDARIO DE PLANILLA                               */}
          {/* ============================================================== */}
          {activeTab === "CALENDARIO" && (
            <div className="space-y-5">
              
              {/* Selector de Día */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Selecciona el Día a Inspeccionar:
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {(activeQuincena?.dias || []).map((dia) => {
                    const isSelected = dia.dateKey === selectedDayKey;
                    const g1Count = dia.porSupervisor?.["sup-5"]?.totalDoctores || 0;
                    const g2Count = dia.porSupervisor?.["sup-4"]?.totalDoctores || 0;
                    const totalPlanilla = g1Count + g2Count;

                    return (
                      <button
                        key={dia.dateKey}
                        type="button"
                        onClick={() => {
                          setSelectedDayKey(dia.dateKey);
                          if (onSelectDate) onSelectDate(dia.dateKey);
                        }}
                        className={`shrink-0 px-3 py-2 rounded-xl border text-left transition-all relative flex flex-col gap-1 cursor-pointer ${
                          isSelected
                            ? "bg-[#0048B5] text-white border-[#0048B5] shadow-xs ring-2 ring-blue-500/20"
                            : "bg-slate-50 hover:bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        <span className={`text-[12px] font-black ${isSelected ? "text-white" : "text-slate-800"}`}>
                          {dia.label?.split(" ")[0]} {dia.label?.split(" ")[1]}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                            isSelected ? "bg-white/20 text-white" : "bg-blue-100 text-[#0048B5]"
                          }`}>
                            {totalPlanilla} méd.
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detalle del Día Seleccionado */}
              {currentDayData && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-[14px] font-black text-slate-900">
                      Médicos de Planilla en Turno para el {currentDayData.label}
                    </h4>
                    <span className="text-[11.5px] font-bold text-slate-500">
                      Total trabajando: {(currentDayData.porSupervisor?.["sup-5"]?.totalDoctores || 0) + (currentDayData.porSupervisor?.["sup-4"]?.totalDoctores || 0)} médicos
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Grupo 1: Edward Zelaya */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div>
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            Grupo 1 · Edward Zelaya
                          </span>
                          <h5 className="font-black text-slate-900 text-[13px] mt-0.5">
                            {currentDayData.porSupervisor?.["sup-5"]?.totalDoctores || 0} médicos programados
                          </h5>
                        </div>
                      </div>

                      <div className="max-h-60 overflow-y-auto space-y-1.5 scrollbar-thin">
                        {(currentDayData.porSupervisor?.["sup-5"]?.doctores || []).length > 0 ? (
                          currentDayData.porSupervisor["sup-5"].doctores.map((doc, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11.5px]">
                              <span className="font-bold text-slate-800 truncate mr-2">{doc.nombre}</span>
                              <span className="text-[10.5px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 shrink-0 font-bold">
                                {doc.horario || "06:00 AM – 02:00 PM"}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-slate-400 text-[12px] italic">
                            Sin médicos programados hoy (descanso o rotación)
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Grupo 2: Roxana Canales */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                            Grupo 2 · Roxana Canales
                          </span>
                          <h5 className="font-black text-slate-900 text-[13px] mt-0.5">
                            {currentDayData.porSupervisor?.["sup-4"]?.totalDoctores || 0} médicos programados
                          </h5>
                        </div>
                      </div>

                      <div className="max-h-60 overflow-y-auto space-y-1.5 scrollbar-thin">
                        {(currentDayData.porSupervisor?.["sup-4"]?.doctores || []).length > 0 ? (
                          currentDayData.porSupervisor["sup-4"].doctores.map((doc, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11.5px]">
                              <span className="font-bold text-slate-800 truncate mr-2">{doc.nombre}</span>
                              <span className="text-[10.5px] font-mono px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 shrink-0 font-bold">
                                {doc.horario || "07:00 AM – 03:00 PM"}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-slate-400 text-[12px] italic">
                            Sin médicos programados hoy (descanso o rotación)
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}

          {/* ============================================================== */}
          {/* PESTAÑA 3: SUBIR MATRIZ / TABLA                                 */}
          {/* ============================================================== */}
          {activeTab === "IMPORTAR_TABLA" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950 text-[12.5px] flex items-start gap-3">
                <Sparkles size={18} className="text-[#0048B5] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">
                    Importación inteligente de Matriz de Planilla (Excel o Google Sheets)
                  </p>
                  <p className="text-[11.5px] text-blue-800 leading-relaxed">
                    Copia las celdas de tu hoja (incluyendo encabezados de fecha como <code>01/10/2026</code> y las filas de médicos con sus turnos o <code>LIBRE</code>) y pégalas aquí. DoctorSV detectará automáticamente a Edward Zelaya y Roxana Canales y organizará los 15 días.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-[12px] font-black uppercase tracking-wider text-slate-600">
                  Área de Pegado:
                </label>
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-[11.5px] font-bold text-slate-700 shadow-2xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Clipboard size={13} className="text-[#0048B5]" />
                  <span>Pegar del Portapapeles</span>
                </button>
              </div>

              <textarea
                rows={6}
                value={pastedTableText}
                onChange={(e) => handleAnalyzeTable(e.target.value)}
                placeholder="Pega aquí la tabla copiada de Google Sheets o Excel..."
                className="w-full rounded-2xl border border-slate-300 p-3.5 text-[11.5px] font-mono outline-none focus:ring-2 focus:ring-[#0048B5]/30 bg-white"
              />

              {parseError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[12px] font-bold flex items-center gap-2">
                  <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {parsedPreview && (
                <div className="bg-white rounded-2xl p-4 border border-emerald-300 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-600" />
                      <span className="text-[13px] font-black text-emerald-950">
                        ¡Tabla reconocida con éxito! ({parsedPreview.estadisticas?.totalDias} días, {parsedPreview.supervisoresDetectados?.length} supervisores)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmSavePlanilla}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[12px] font-black flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <Check size={14} />
                      <span>Confirmar y Aplicar a Planilla</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                    <div className="p-2 rounded-lg bg-slate-50">
                      <span className="text-slate-400 font-bold block">Días:</span>
                      <span className="font-black text-slate-800 text-[12.5px]">{parsedPreview.estadisticas?.totalDias}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50">
                      <span className="text-slate-400 font-bold block">Supervisores:</span>
                      <span className="font-black text-slate-800 text-[12.5px]">{parsedPreview.supervisoresDetectados?.length}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50">
                      <span className="text-slate-400 font-bold block">Turnos Asignados:</span>
                      <span className="font-black text-slate-800 text-[12.5px]">{parsedPreview.estadisticas?.totalLineasParseadas}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50">
                      <span className="text-slate-400 font-bold block">Tasa de Reconocimiento:</span>
                      <span className="font-black text-emerald-700 text-[12.5px]">{parsedPreview.estadisticas?.tasaReconocimiento || "100%"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* PESTAÑA 4: CONSEJOS Y PLANTILLA OFICIAL                          */}
          {/* ============================================================== */}
          {activeTab === "CONSEJOS" && (
            <div className="space-y-6">
              
              {/* Tarjeta de Descarga */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-bold">
                    <FileText size={12} />
                    <span>Plantilla Oficial de Planilla</span>
                  </div>
                  <h4 className="text-lg font-black text-slate-900 tracking-tight">
                    Plantilla_Planilla_DoctorSV.xlsx
                  </h4>
                  <p className="text-[12px] text-slate-600 max-w-xl">
                    Archivo Excel preconfigurado con las columnas oficiales (Grupo 1 Edward Zelaya y Grupo 2 Roxana Canales) y validación de turnos. Listo para subir a Google Drive o usar localmente.
                  </p>
                </div>

                <a
                  href="/Plantilla_Planilla_DoctorSV.xlsx"
                  download="Plantilla_Planilla_DoctorSV.xlsx"
                  className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-[12.5px] font-black flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  <Download size={16} />
                  <span>Descargar Plantilla (.xlsx)</span>
                </a>
              </div>

              {/* Guía Estructurada de Consejos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-2.5">
                  <h5 className="font-black text-slate-900 text-[13px] flex items-center gap-2 text-[#0048B5]">
                    <Layers size={15} />
                    1. Estructura de Columnas Recomendada
                  </h5>
                  <p className="text-[11.5px] text-slate-600 leading-relaxed">
                    Para que Google Sheets y DoctorSV reconozcan la nómina sin errores, la fila 2 debe tener:
                  </p>
                  <ul className="text-[11px] text-slate-700 space-y-1 pl-4 list-disc font-medium">
                    <li><strong>Col A / B:</strong> Grupo (ej: <code>GRUPO 1</code>, <code>GRUPO 2</code>).</li>
                    <li><strong>Col C:</strong> N° secuencial (1, 2, 3...).</li>
                    <li><strong>Col D:</strong> NOMBRE DEL MÉDICO (completo).</li>
                    <li><strong>Col E:</strong> FUNCIÓN (<code>SUPERVISOR</code> para el jefe, <code>CONSULTANTE</code> para médicos).</li>
                    <li><strong>Col G en adelante:</strong> Fechas (ej: <code>01/10/2026</code> a <code>15/10/2026</code>).</li>
                  </ul>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-2.5">
                  <h5 className="font-black text-slate-900 text-[13px] flex items-center gap-2 text-indigo-700">
                    <Clock size={15} />
                    2. Formatos de Turno en las Celdas
                  </h5>
                  <p className="text-[11.5px] text-slate-600 leading-relaxed">
                    En cada celda de fecha escribe el turno correspondiente o la condición de descanso:
                  </p>
                  <ul className="text-[11px] text-slate-700 space-y-1 pl-4 list-disc font-medium">
                    <li><code>06:00am-02:00pm</code> (Turno Mañana)</li>
                    <li><code>07:00am-03:00pm</code> o <code>07:00am-04:00pm</code></li>
                    <li><code>02:00pm-10:00pm</code> (Turno Tarde/Noche)</li>
                    <li><code>LIBRE</code> (Día de descanso · no asigna cubículo)</li>
                    <li><code>VACACION</code> / <code>INCAPACIDAD</code> / <code>PERMISO PERSONAL</code></li>
                  </ul>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-2.5">
                  <h5 className="font-black text-slate-900 text-[13px] flex items-center gap-2 text-emerald-700">
                    <Globe size={15} />
                    3. Permisos en Google Sheets
                  </h5>
                  <p className="text-[11.5px] text-slate-600 leading-relaxed">
                    Para que la sincronización en vivo funcione:
                  </p>
                  <ul className="text-[11px] text-slate-700 space-y-1 pl-4 list-disc font-medium">
                    <li>Abre tu Google Sheet y haz clic en <strong>Compartir</strong> (botón azul arriba a la derecha).</li>
                    <li>En <em>Acceso general</em> selecciona: <strong>Cualquier persona con el enlace</strong>.</li>
                    <li>Rol: <strong>Lector</strong> (Viewer).</li>
                    <li>Copia el enlace y pégalo en la pestaña <em>Google Sheets en Vivo</em>.</li>
                  </ul>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-2.5">
                  <h5 className="font-black text-slate-900 text-[13px] flex items-center gap-2 text-amber-700">
                    <ShieldCheck size={15} />
                    4. Compatibilidad Multigrupo
                  </h5>
                  <p className="text-[11.5px] text-slate-600 leading-relaxed">
                    Puedes tener:
                  </p>
                  <ul className="text-[11px] text-slate-700 space-y-1 pl-4 list-disc font-medium">
                    <li>Un <strong>solo libro de Google Sheets</strong> con una pestaña llamada <code>SEDE SAN MIGUEL</code> con ambos grupos.</li>
                    <li>O <strong>pestañas separadas</strong>: una pestaña para <code>Edward Zelaya</code> y otra para <code>Roxana Canales</code>.</li>
                    <li>O <strong>enlaces separados</strong> configurando la URL individual en cada tarjeta de supervisor.</li>
                  </ul>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Pie del Modal */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-medium">
            DoctorSV · Sistema de Control de Asistencias & Nómina de Planilla
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-[12px] font-bold transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
