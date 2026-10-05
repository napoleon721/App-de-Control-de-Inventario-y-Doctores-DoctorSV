import React, { useState, useMemo } from "react";
import {
  Calendar, X, UploadCloud, Clipboard, CheckCircle2, AlertTriangle,
  Users, Sparkles, Filter, Search, ArrowRight, RefreshCw, FileSpreadsheet,
  Clock, ShieldCheck, Check, Layers, ChevronRight, HelpCircle
} from "lucide-react";
import { parseQuincenaSpreadsheet, parseDoctorLine, buildLookupMaps } from "../../utils/quincenaParser";
import { DOCTORES_EXCEL, STAFF_EXCEL, SUPERVISORES_OFICIALES } from "../../constants/tokens";
import { generateDefaultQuincena } from "../../constants/quincenaDefault";

export default function QuincenaManagerModal({
  activeQuincena = null,
  selectedDate = null,
  onSelectDate = null,
  onSaveQuincena,
  onClose,
  supervisores = SUPERVISORES_OFICIALES,
}) {
  const [activeTab, setActiveTab] = useState("CALENDARIO"); // "CALENDARIO", "IMPORTAR_TABLA", "PEGAR_CELDA"
  const [selectedDayKey, setSelectedDayKey] = useState(() => {
    if (selectedDate && activeQuincena?.dias?.some((d) => d.dateKey === selectedDate)) {
      return selectedDate;
    }
    return activeQuincena?.dias?.[0]?.dateKey || "2026-09-29";
  });

  // Estado para la pestaña de importar tabla completa
  const [pastedTableText, setPastedTableText] = useState("");
  const [parsedPreview, setParsedPreview] = useState(null);
  const [parseError, setParseError] = useState("");

  // Estado para la pestaña de pegar celda individual
  const [singleDate, setSingleDate] = useState(() => selectedDate || "2026-09-29");
  const [singleSupId, setSingleSupId] = useState(supervisores[0]?.id || "sup-1");
  const [singleCellText, setSingleCellText] = useState("");
  const [singlePreview, setSinglePreview] = useState(null);

  // Filtro de búsqueda en la vista de calendario
  const [daySearch, setDaySearch] = useState("");
  const [filterShift, setFilterShift] = useState("TODOS");

  // Lookup maps para el analizador
  const lookupMaps = useMemo(() => buildLookupMaps(DOCTORES_EXCEL, STAFF_EXCEL, supervisores), [supervisores]);

  // Fechas de la quincena activa para asignar a filas sin encabezado
  const fallbackDates = useMemo(() => {
    if (activeQuincena?.dias && activeQuincena.dias.length > 0) {
      return activeQuincena.dias.map((d) => d.dateKey);
    }
    return [];
  }, [activeQuincena]);

  // Manejar análisis de la tabla o fila pegada
  function handleAnalyzeTable(text) {
    setPastedTableText(text);
    setParseError("");
    if (!text.trim()) {
      setParsedPreview(null);
      return;
    }

    try {
      const res = parseQuincenaSpreadsheet(text, DOCTORES_EXCEL, STAFF_EXCEL, supervisores, fallbackDates);
      if (res.success && res.type === "TABLE") {
        setParsedPreview(res);
        setParseError("");
      } else if (res.success && res.type === "SINGLE_LIST") {
        setParseError("El texto pegado corresponde a una sola celda o lista de médicos. Para subir una quincena, copia la fila completa de tu supervisor con las fechas.");
        setParsedPreview(null);
      } else {
        setParseError(res.error || "No se pudo interpretar el formato de la fila o tabla.");
        setParsedPreview(null);
      }
    } catch (err) {
      setParseError("Error al procesar el texto: " + err.message);
      setParsedPreview(null);
    }
  }

  // Pegar directo desde el portapapeles
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

  // Guardar la quincena importada (con FUSIÓN INTELIGENTE si es una sola fila de supervisor)
  function handleConfirmSaveQuincena() {
    if (!parsedPreview) return;

    const isSingleSup = parsedPreview.isSingleSupervisorRow || (parsedPreview.supervisoresDetectados && parsedPreview.supervisoresDetectados.length === 1);

    // Si es una sola fila de supervisor y ya hay una quincena activa con otros supervisores, FUSIONAR sin borrar a los demás
    if (isSingleSup && activeQuincena && Array.isArray(activeQuincena.dias) && activeQuincena.dias.length > 0) {
      const supObj = parsedPreview.supervisoresDetectados[0];
      const supId = supObj.id;

      // Clonar días base de la quincena activa
      const baseDiasMap = {};
      activeQuincena.dias.forEach((d) => {
        baseDiasMap[d.dateKey] = {
          ...d,
          porSupervisor: { ...(d.porSupervisor || {}) },
        };
      });

      // Fusionar los días de la fila pegada de este supervisor
      (parsedPreview.dias || []).forEach((importDia) => {
        const dKey = importDia.dateKey;
        if (!baseDiasMap[dKey]) {
          baseDiasMap[dKey] = {
            dateKey: dKey,
            label: importDia.label,
            dayNum: importDia.dayNum,
            monthNum: importDia.monthNum,
            year: importDia.year,
            diaSemana: importDia.diaSemana || "",
            porSupervisor: {},
          };
        }

        if (importDia.porSupervisor && importDia.porSupervisor[supId]) {
          baseDiasMap[dKey].porSupervisor[supId] = importDia.porSupervisor[supId];
        }
      });

      const mergedDias = Object.values(baseDiasMap).sort((a, b) => a.dateKey.localeCompare(b.dateKey));

      const updatedQuincena = {
        ...activeQuincena,
        id: activeQuincena.id || `quincena_${Date.now()}`,
        dias: mergedDias,
        diasDetectados: mergedDias.map((d) => d.dateKey),
        updatedAt: new Date().toISOString(),
      };

      onSaveQuincena(updatedQuincena);
      setActiveTab("CALENDARIO");
      setSelectedDayKey(parsedPreview.dias[0]?.dateKey || selectedDayKey);
      return;
    }

    // Si es tabla general con todos los supervisores
    const finalQuincena = {
      ...parsedPreview,
      id: `quincena_${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };
    onSaveQuincena(finalQuincena);
    setActiveTab("CALENDARIO");
    setSelectedDayKey(finalQuincena.dias[0]?.dateKey || "2026-10-01");
  }

  // Restaurar semilla por defecto
  function handleRestoreDefault() {
    if (window.confirm("¿Deseas restaurar la Quincena Oficial de Septiembre 2026 oficial de Google Sheets?")) {
      const def = generateDefaultQuincena();
      onSaveQuincena(def);
      setSelectedDayKey(def.dias[0]?.dateKey || "2026-09-29");
    }
  }

  // Manejo de pegado de celda individual
  function handleAnalyzeSingleCell(text) {
    setSingleCellText(text);
    if (!text.trim()) {
      setSinglePreview(null);
      return;
    }
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    const parsed = lines.map((l) => parseDoctorLine(l, lookupMaps.doctors)).filter(Boolean);
    setSinglePreview({
      total: parsed.length,
      doctores: parsed,
      reconocidos: parsed.filter((d) => d.isMatched).length,
    });
  }

  function handleSaveSingleCell() {
    if (!singlePreview || !activeQuincena) return;
    const nextDias = (activeQuincena.dias || []).map((dia) => {
      if (dia.dateKey !== singleDate) return dia;
      const targetSup = supervisores.find((s) => s.id === singleSupId);
      return {
        ...dia,
        porSupervisor: {
          ...dia.porSupervisor,
          [singleSupId]: {
            supervisorId: singleSupId,
            supervisorNombre: targetSup?.nombre || singleSupId,
            doctorNames: singlePreview.doctores.map((d) => d.nombre),
            doctores: singlePreview.doctores,
            totalDoctores: singlePreview.doctores.length,
          },
        },
      };
    });

    const updatedQuincena = {
      ...activeQuincena,
      dias: nextDias,
      updatedAt: new Date().toISOString(),
    };

    onSaveQuincena(updatedQuincena);
    setSingleCellText("");
    setSinglePreview(null);
    setActiveTab("CALENDARIO");
    setSelectedDayKey(singleDate);
  }

  // Día seleccionado actual en el calendario
  const currentDia = useMemo(() => {
    return activeQuincena?.dias?.find((d) => d.dateKey === selectedDayKey) || activeQuincena?.dias?.[0] || null;
  }, [activeQuincena, selectedDayKey]);

  return (
    <div
      id="quincena-manager-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0048B5] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Calendar size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[17px] font-black text-slate-900 tracking-tight">
                  Nómina Quincenal · Servicios Profesionales
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  {activeQuincena?.titulo || "Septiembre 2026 (Quincena 2)"}
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 font-medium mt-0.5">
                Distribución rotativa cada 15 días desde Google Sheets con cambio automático diario
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Pestañas de Navegación */}
        <div className="px-6 pt-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("CALENDARIO")}
              className={`px-4 py-2 text-[12.5px] font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
                activeTab === "CALENDARIO"
                  ? "bg-white text-[#0048B5] border-[#0048B5] shadow-xs"
                  : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              <Calendar size={15} />
              Calendario de la Quincena
              {activeQuincena?.dias?.length ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 font-mono">
                  {activeQuincena.dias.length} días
                </span>
              ) : null}
            </button>

            <button
              onClick={() => setActiveTab("IMPORTAR_TABLA")}
              className={`px-4 py-2 text-[12.5px] font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
                activeTab === "IMPORTAR_TABLA"
                  ? "bg-white text-[#0048B5] border-[#0048B5] shadow-xs"
                  : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              <FileSpreadsheet size={15} />
              📥 Subir Fila de Supervisor (o Tabla)
            </button>

            <button
              onClick={() => setActiveTab("PEGAR_CELDA")}
              className={`px-4 py-2 text-[12.5px] font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
                activeTab === "PEGAR_CELDA"
                  ? "bg-white text-[#0048B5] border-[#0048B5] shadow-xs"
                  : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              <Clipboard size={15} />
              📋 Pegar Celda Individual
            </button>
          </div>

          <button
            onClick={handleRestoreDefault}
            className="text-[11px] font-bold text-slate-500 hover:text-blue-700 py-1.5 px-2.5 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1.5"
            title="Restaurar datos oficiales del Google Sheet"
          >
            <RefreshCw size={12} />
            Restaurar Semilla Oficial
          </button>
        </div>

        {/* Contenido según pestaña */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/30">
          {/* ============================================================== */}
          {/* PESTAÑA 1: CALENDARIO DE LA QUINCENA                            */}
          {/* ============================================================== */}
          {activeTab === "CALENDARIO" && (
            <div className="space-y-5">
              {/* Tira horizontal de selección de día */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={13} className="text-blue-600" />
                    Selecciona un día de la quincena:
                  </span>
                  {selectedDayKey && onSelectDate && (
                    <button
                      onClick={() => onSelectDate(selectedDayKey)}
                      className="text-[11px] font-bold text-[#0048B5] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all"
                    >
                      <Check size={12} />
                      Fijar en Asistencias
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {(activeQuincena?.dias || []).map((dia) => {
                    const isSelected = dia.dateKey === selectedDayKey;
                    const isToday = dia.dateKey === new Date().toLocaleDateString("en-CA");
                    const totalDoctorsOnDay = Object.values(dia.porSupervisor || {}).reduce(
                      (acc, s) => acc + (s.totalDoctores || 0),
                      0
                    );

                    return (
                      <button
                        key={dia.dateKey}
                        onClick={() => setSelectedDayKey(dia.dateKey)}
                        className={`shrink-0 px-4 py-2.5 rounded-xl border text-left transition-all relative ${
                          isSelected
                            ? "bg-gradient-to-b from-[#0048B5] to-blue-700 text-white border-[#0048B5] shadow-md shadow-blue-500/20"
                            : "bg-slate-50 hover:bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {isToday && (
                          <span className={`absolute -top-1.5 -right-1 text-[8.5px] font-black uppercase px-1.5 py-0.2 rounded-full border ${
                            isSelected ? "bg-amber-400 text-amber-950 border-amber-300" : "bg-blue-600 text-white border-blue-400"
                          }`}>
                            Hoy
                          </span>
                        )}
                        <p className={`text-[13px] font-black tracking-tight ${isSelected ? "text-white" : "text-slate-900"}`}>
                          {dia.label || dia.dateKey}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-medium ${isSelected ? "text-blue-100" : "text-slate-500"}`}>
                            {dia.diaSemana || "Día"}
                          </span>
                          <span className={`text-[9.5px] font-mono px-1 py-0.2 rounded font-bold ${
                            isSelected ? "bg-blue-800/60 text-blue-100" : "bg-slate-200/80 text-slate-600"
                          }`}>
                            {totalDoctorsOnDay} médicos
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detalle del Día Seleccionado por Supervisor */}
              {currentDia ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-[14px] font-black text-slate-800 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      Distribución oficial para el {currentDia.label} ({currentDia.diaSemana})
                    </h3>

                    {/* Filtro de búsqueda */}
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={daySearch}
                          onChange={(e) => setDaySearch(e.target.value)}
                          placeholder="Buscar médico o token..."
                          className="pl-8 pr-3 py-1.5 text-[11.5px] rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-48"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tarjetas de cada supervisor para este día */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(currentDia.porSupervisor || {}).map(([supId, supData]) => {
                      const supObj = supervisores.find((s) => s.id === supId);
                      const docsList = (supData.doctores || []).filter((d) => {
                        if (!daySearch) return true;
                        const q = daySearch.toLowerCase();
                        return d.nombre.toLowerCase().includes(q) || (d.token && d.token.toLowerCase().includes(q));
                      });

                      return (
                        <div
                          key={supId}
                          className="bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col overflow-hidden"
                        >
                          {/* Header de la tarjeta del supervisor */}
                          <div className="p-3.5 border-b border-slate-100 bg-slate-50/70">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                {supId === "sup-1" ? "Emerson Vigil" : supId === "sup-2" ? "Salvador Renderos" : supId === "sup-3" ? "Alfredo Martínez" : supData.supervisorNombre?.split(" ")[0]}
                              </span>
                              <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-[#0048B5] font-mono">
                                {supData.totalDoctores} médicos
                              </span>
                            </div>
                            <p className="text-[12.5px] font-bold text-slate-900 truncate mt-0.5">
                              {supObj?.nombre || supData.supervisorNombre}
                            </p>
                            <p className="text-[10.5px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock size={11} className="text-slate-400" />
                              {supObj?.horario || "Horario asignado"}
                            </p>
                          </div>

                          {/* Lista con scroll de médicos */}
                          <div className="p-2 space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin flex-1 bg-slate-50/20">
                            {docsList.length > 0 ? (
                              docsList.map((doc, idx) => (
                                <div
                                  key={idx}
                                  className="p-2 rounded-xl bg-white border border-slate-100 hover:border-slate-200 transition-colors flex items-center justify-between gap-2"
                                >
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-slate-800 truncate">
                                      {doc.nombre}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      {doc.token && (
                                        <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 px-1 py-0.2 rounded">
                                          {doc.token}
                                        </span>
                                      )}
                                      {doc.horario && (
                                        <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded flex items-center gap-0.5">
                                          <Clock size={9} />
                                          {doc.horario}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-[9px] font-mono font-bold text-slate-400">
                                    #{idx + 1}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="p-4 text-center text-slate-400 text-[11px]">
                                No se encontraron médicos con ese criterio
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center text-slate-500">
                  <Calendar size={32} className="mx-auto text-slate-400 mb-2" />
                  <p className="font-bold text-[13px]">No hay quincena cargada</p>
                  <p className="text-[11.5px] mt-1 text-slate-400">
                    Pega la tabla completa de Google Sheets en la siguiente pestaña o restaura la semilla oficial.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* PESTAÑA 2: PEGAR TABLA COMPLETA DE GOOGLE SHEETS                */}
          {/* ============================================================== */}
          {activeTab === "IMPORTAR_TABLA" && (
            <div className="space-y-4">
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <FileSpreadsheet size={18} />
                </div>
                <div className="text-[12px] text-blue-900 leading-relaxed">
                  <p className="font-black text-[13px] text-blue-950">
                    ¿Cómo subir la nómina de cada supervisor?
                  </p>
                  <ol className="list-decimal pl-4 mt-1 space-y-0.5 font-medium text-blue-800">
                    <li>En Google Sheets (<strong>Hoja 77 / Nómina Quincenal</strong>), cada supervisor solo debe copiar <strong>su propia fila</strong> (ej: Fila 7 para Alfredo, Fila 8 para Emerson, Fila 9 para Salvador) con todas sus fechas.</li>
                    <li>Presiona <kbd className="px-1.5 py-0.5 bg-white border border-blue-300 rounded font-mono font-bold">Ctrl+C</kbd> (o Cmd+C en Mac).</li>
                    <li>Pégala en el área de abajo y haz clic en <strong>"Actualizar Fila de Supervisor"</strong>. El sistema fusionará sus médicos de forma inteligente <strong>sin borrar a los demás supervisores</strong>.</li>
                  </ol>
                </div>
              </div>

              {/* Botón rápido portapapeles y área de texto */}
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Clipboard size={14} className="text-[#0048B5]" />
                  Fila del Supervisor o Tabla copiada de Google Sheets:
                </label>
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="text-[11.5px] font-bold text-[#0048B5] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Clipboard size={13} />
                  Pegar desde Portapapeles
                </button>
              </div>

              <textarea
                value={pastedTableText}
                onChange={(e) => handleAnalyzeTable(e.target.value)}
                rows={7}
                placeholder="Pega aquí la fila de tu supervisor copiada de Google Sheets (ej: 000EV3 - EMERSON JOSUE VIGIL HERNANDEZ...)..."
                className="w-full p-3.5 text-[11.5px] font-mono rounded-2xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0095FF] focus:border-transparent transition-all"
              />

              {parseError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11.5px] flex items-center gap-2 font-medium">
                  <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                  {parseError}
                </div>
              )}

              {/* Vista previa en vivo del análisis de la tabla */}
              {parsedPreview && (
                <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-4 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-600" />
                      <h4 className="text-[13.5px] font-black text-slate-900">
                        {parsedPreview.titulo}
                      </h4>
                    </div>
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Tasa de Reconocimiento: {parsedPreview.estadisticas.tasaReconocimiento}
                    </span>
                  </div>

                  {/* Banner descriptivo si es fila individual */}
                  {(parsedPreview.isSingleSupervisorRow || parsedPreview.supervisoresDetectados?.length === 1) && (
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11.5px] flex items-center gap-2 font-medium">
                      <CheckCircle2 size={16} className="text-blue-600 shrink-0" />
                      <span>
                        <strong>Modo Fila Individual:</strong> Se actualizará únicamente la nómina de <strong>{parsedPreview.supervisoresDetectados[0]?.nombre}</strong> para los {parsedPreview.estadisticas.totalDias} días. Las asignaciones de los demás supervisores se conservarán intactas.
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Días Encontrados</p>
                      <p className="text-[16px] font-black text-slate-800 mt-0.5">
                        {parsedPreview.estadisticas.totalDias}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Supervisores</p>
                      <p className="text-[16px] font-black text-slate-800 mt-0.5">
                        {parsedPreview.estadisticas.totalSupervisores}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Total Asignaciones</p>
                      <p className="text-[16px] font-black text-slate-800 mt-0.5">
                        {parsedPreview.estadisticas.totalLineasParseadas}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                      <p className="text-[10px] font-bold text-emerald-700 uppercase">Reconocidos</p>
                      <p className="text-[16px] font-black text-emerald-800 mt-0.5">
                        {parsedPreview.estadisticas.totalReconocidos}
                      </p>
                    </div>
                  </div>

                  {/* Resumen por supervisor detectado */}
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-bold text-slate-600">Supervisor(es) a sincronizar:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {parsedPreview.supervisoresDetectados.map((s) => (
                        <div key={s.id} className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] flex items-center justify-between">
                          <span className="font-bold text-slate-800 truncate mr-1">{s.nombre}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold shrink-0">
                            {s.totalAsignaciones} médicos
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleConfirmSaveQuincena}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[13px] flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                    >
                      <ShieldCheck size={16} />
                      {(parsedPreview.isSingleSupervisorRow || parsedPreview.supervisoresDetectados?.length === 1)
                        ? `Actualizar Fila de ${parsedPreview.supervisoresDetectados[0]?.nombre.split(" ")[0]} (Sin tocar a los demás)`
                        : "Guardar y Activar Quincena Oficial"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* PESTAÑA 3: PEGAR CELDA INDIVIDUAL (ACTUALIZAR UN SOLO DÍA)      */}
          {/* ============================================================== */}
          {activeTab === "PEGAR_CELDA" && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <h4 className="text-[13px] font-black text-slate-900 mb-1">
                  Actualizar nómina de un supervisor para una fecha específica
                </h4>
                <p className="text-[11.5px] text-slate-500">
                  Ideal para cuando el supervisor o tú solo quieren copiar la celda de hoy desde la hoja sin reimportar la quincena entera.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Fecha del calendario:
                    </label>
                    <select
                      value={singleDate}
                      onChange={(e) => setSingleDate(e.target.value)}
                      className="w-full px-3 py-2 text-[12px] font-medium rounded-xl border border-slate-300 bg-white"
                    >
                      {(activeQuincena?.dias || []).map((d) => (
                        <option key={d.dateKey} value={d.dateKey}>
                          {d.label} ({d.diaSemana})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Supervisor:
                    </label>
                    <select
                      value={singleSupId}
                      onChange={(e) => setSingleSupId(e.target.value)}
                      className="w-full px-3 py-2 text-[12px] font-medium rounded-xl border border-slate-300 bg-white"
                    >
                      {supervisores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre} ({s.id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[12px] font-bold text-slate-700 block mb-1">
                  Pega el texto de la celda de Google Sheets (lista de médicos con horario):
                </label>
                <textarea
                  value={singleCellText}
                  onChange={(e) => handleAnalyzeSingleCell(e.target.value)}
                  rows={6}
                  placeholder={`Ejemplo:\n000FFF - FABRICIO JOSUE FUNES CANALES (2:00 PM - 10:00 PM)\n000RAF - RODRIGO EDUARDO ANGEL RAMOS (2:00 PM - 10:00 PM)`}
                  className="w-full p-3.5 text-[11.5px] font-mono rounded-2xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0095FF]"
                />
              </div>

              {singlePreview && (
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-slate-800">
                      Médicos reconocidos en la celda: {singlePreview.reconocidos} de {singlePreview.total}
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveSingleCell}
                      className="px-4 py-1.5 rounded-xl bg-[#0048B5] hover:bg-blue-700 text-white font-bold text-[12px] flex items-center gap-1.5 shadow-xs"
                    >
                      <Check size={14} />
                      Asignar a esta Fecha y Supervisor
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1 p-1 bg-slate-50 rounded-xl">
                    {singlePreview.doctores.map((d, i) => (
                      <div key={i} className="text-[11px] p-1.5 bg-white rounded border border-slate-200 flex items-center justify-between">
                        <span className="font-bold text-slate-800">{d.nombre}</span>
                        <div className="flex items-center gap-1.5">
                          {d.token && <span className="font-mono text-[9px] bg-slate-100 px-1 rounded">{d.token}</span>}
                          {d.horario && <span className="text-[9px] font-semibold text-emerald-700">{d.horario}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            DoctorSV · Control de Inventario y Nóminas de Servicios Profesionales
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-[12px] font-bold text-slate-700 hover:bg-slate-200/70 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
