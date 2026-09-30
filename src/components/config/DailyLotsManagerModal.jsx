import React, { useState, useMemo } from "react";
import {
  Calendar, X, UploadCloud, Clipboard, CheckCircle2, AlertTriangle,
  Users, Sparkles, Filter, Search, ArrowRight, RefreshCw, FileSpreadsheet,
  Clock, ShieldCheck, Check, Layers, ChevronRight, HelpCircle, MapPin,
  Plus, Trash2, Edit3, Save, Shield
} from "lucide-react";
import { parseDailyLotsSpreadsheet, DEFAULT_DAILY_LOTS, normalizeDateToKey, matchSupervisor } from "../../utils/dailyLotsParser";
import { SUPERVISORES_OFICIALES, HORARIOS as DEFAULT_HORARIOS } from "../../constants/tokens";

export default function DailyLotsManagerModal({
  activeDailyLots = null,
  selectedDate = null,
  onSaveDailyLots,
  onClose,
  supervisores = SUPERVISORES_OFICIALES,
  horarios = DEFAULT_HORARIOS,
}) {
  const [activeTab, setActiveTab] = useState("CALENDARIO"); // "CALENDARIO", "IMPORTAR_SHEETS"
  const [dailyLots, setDailyLots] = useState(() => {
    return activeDailyLots && Object.keys(activeDailyLots).length > 0
      ? { ...activeDailyLots }
      : { ...DEFAULT_DAILY_LOTS };
  });

  const availableDates = useMemo(() => {
    return Object.keys(dailyLots).sort();
  }, [dailyLots]);

  const [currentDateKey, setCurrentDateKey] = useState(() => {
    if (selectedDate && dailyLots[selectedDate]) return selectedDate;
    return availableDates[0] || "2026-10-01";
  });

  // Estado para importar desde Google Sheets
  const [pastedText, setPastedText] = useState("");
  const [parsedPreview, setParsedPreview] = useState(null);
  const [parseError, setParseError] = useState("");

  // Estado para formulario de agregar asignación manual
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({
    tipo: "SERVICIOS_PROFESIONALES",
    grupo: "SP",
    numMedicos: 20,
    bloqueInicio: 1,
    bloqueFin: 40,
    horario: "02:00 PM – 10:00 PM",
    supervisorId: supervisores[0]?.id || "sup-1",
  });

  // Analizar texto pegado
  function handleAnalyzeText(text) {
    setPastedText(text);
    setParseError("");
    if (!text.trim()) {
      setParsedPreview(null);
      return;
    }

    try {
      const res = parseDailyLotsSpreadsheet(text, supervisores);
      if (res.success) {
        setParsedPreview(res);
        setParseError("");
      } else {
        setParseError(res.error || "No se pudo interpretar el formato.");
        setParsedPreview(null);
      }
    } catch (err) {
      setParseError("Error al procesar: " + err.message);
      setParsedPreview(null);
    }
  }

  // Pegar directo desde el portapapeles
  async function handlePasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleAnalyzeText(text);
      }
    } catch {
      alert("Por favor usa Ctrl+V o Cmd+V dentro del área de texto.");
    }
  }

  // Confirmar y guardar la importación
  function handleConfirmImport() {
    if (!parsedPreview?.dailyLots) return;
    const merged = { ...dailyLots, ...parsedPreview.dailyLots };
    setDailyLots(merged);
    onSaveDailyLots(merged);
    setActiveTab("CALENDARIO");
    if (parsedPreview.dates && parsedPreview.dates.length > 0) {
      setCurrentDateKey(parsedPreview.dates[0]);
    }
    setPastedText("");
    setParsedPreview(null);
  }

  // Restaurar valores oficiales de Octubre 2026
  function handleRestoreDefaults() {
    if (window.confirm("¿Deseas restaurar la programación oficial de Octubre 2026 desde la hoja RESUMEN SAN MIGUEL?")) {
      setDailyLots(DEFAULT_DAILY_LOTS);
      onSaveDailyLots(DEFAULT_DAILY_LOTS);
      setCurrentDateKey("2026-10-01");
    }
  }

  // Eliminar una asignación de un día
  function handleDeleteEntry(dateKey, entryId) {
    if (!window.confirm("¿Eliminar este lote asignado de la distribución de este día?")) return;
    const currentList = dailyLots[dateKey] || [];
    const updatedList = currentList.filter((e) => e.id !== entryId);
    const nextDailyLots = { ...dailyLots, [dateKey]: updatedList };
    setDailyLots(nextDailyLots);
    onSaveDailyLots(nextDailyLots);
  }

  // Guardar nueva asignación manual
  function handleSaveNewEntry(e) {
    e.preventDefault();
    const bIni = Number(newEntry.bloqueInicio);
    const bFin = Number(newEntry.bloqueFin);
    if (!bIni || !bFin || bIni < 1 || bFin > 170 || bIni > bFin) {
      alert("Por favor ingresa un rango de puestos válido entre 1 y 170.");
      return;
    }

    const supObj = supervisores.find((s) => s.id === newEntry.supervisorId);
    const entryObj = {
      id: `dl-${currentDateKey}-${bIni}-${bFin}-${Date.now()}`,
      fecha: currentDateKey.split("-").reverse().join("/"),
      dateKey: currentDateKey,
      tipo: newEntry.tipo,
      grupo: newEntry.grupo || (newEntry.tipo === "PLANILLA_FIJA" ? "PLANILLA" : "SP"),
      numMedicos: Number(newEntry.numMedicos) || (bFin - bIni + 1),
      bloqueInicio: bIni,
      bloqueFin: bFin,
      totalPuestos: bFin - bIni + 1,
      horario: newEntry.horario,
      supervisorNombre: supObj ? supObj.nombre : null,
      supervisorId: supObj ? supObj.id : null,
    };

    const currentList = dailyLots[currentDateKey] || [];
    const nextList = [...currentList, entryObj];
    const nextDailyLots = { ...dailyLots, [currentDateKey]: nextList };
    setDailyLots(nextDailyLots);
    onSaveDailyLots(nextDailyLots);
    setShowAddForm(false);
  }

  // Asignaciones del día seleccionado
  const currentDayEntries = useMemo(() => {
    return dailyLots[currentDateKey] || [];
  }, [dailyLots, currentDateKey]);

  const planillaFijaEntries = useMemo(() => {
    return currentDayEntries.filter((e) => e.tipo === "PLANILLA_FIJA");
  }, [currentDayEntries]);

  const spEntries = useMemo(() => {
    return currentDayEntries.filter((e) => e.tipo === "SERVICIOS_PROFESIONALES");
  }, [currentDayEntries]);

  const totalPuestosDia = useMemo(() => {
    return currentDayEntries.reduce((acc, e) => acc + (e.totalPuestos || 0), 0);
  }, [currentDayEntries]);

  const totalMedicosDia = useMemo(() => {
    return currentDayEntries.reduce((acc, e) => acc + (e.numMedicos || 0), 0);
  }, [currentDayEntries]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "popIn .2s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]"
      >
        {/* Header con gradiente institucional */}
        <div
          className="px-6 py-4.5 text-white flex items-center justify-between shrink-0"
          style={{ background: "linear-gradient(135deg, #002868 0%, #0048B5 60%, #0095FF 100%)" }}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-md shadow-inner">
              <FileSpreadsheet size={22} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-lg font-bold">
                  Distribución Diaria de Lotes · RESUMEN SAN MIGUEL
                </h3>
                <span className="bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Oficial Google Sheets
                </span>
              </div>
              <p className="text-[11.5px] text-cyan-100">
                Configura los rangos de cubículos asignados a cada supervisor y grupo por fecha y franja horaria
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("CALENDARIO")}
              className={`flex items-center gap-2 py-3 px-3.5 text-[12.5px] font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === "CALENDARIO"
                  ? "border-[#0048B5] text-[#0048B5]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Calendar size={15} />
              <span>Programación Diaria ({availableDates.length} fechas)</span>
            </button>
            <button
              onClick={() => setActiveTab("IMPORTAR_SHEETS")}
              className={`flex items-center gap-2 py-3 px-3.5 text-[12.5px] font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === "IMPORTAR_SHEETS"
                  ? "border-[#0048B5] text-[#0048B5]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <UploadCloud size={15} />
              <span>Copiar y Pegar desde Google Sheets</span>
            </button>
          </div>

          <button
            onClick={handleRestoreDefaults}
            className="text-[11px] font-bold text-slate-500 hover:text-[#0048B5] transition flex items-center gap-1 cursor-pointer"
            title="Restaurar programación oficial de Octubre 2026 (01/10 y 02/10)"
          >
            <RefreshCw size={11} />
            <span>Restaurar Oficial</span>
          </button>
        </div>

        {/* Contenido según pestaña */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "CALENDARIO" ? (
            <div className="space-y-6">
              {/* Barra de Fechas Disponibles */}
              <div className="flex items-center justify-between gap-3 flex-wrap bg-blue-50/50 p-3 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1">
                    <Calendar size={13} className="text-[#0048B5]" /> Fecha:
                  </span>
                  {availableDates.map((dateKey) => {
                    const isSelected = dateKey === currentDateKey;
                    const count = (dailyLots[dateKey] || []).length;
                    const dateDisplay = dateKey.split("-").reverse().slice(0, 2).join("/");
                    return (
                      <button
                        key={dateKey}
                        onClick={() => setCurrentDateKey(dateKey)}
                        className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-[#0048B5] text-white shadow-xs"
                            : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                        }`}
                      >
                        <span>{dateDisplay}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            isSelected ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-1 px-3 py-1.5 text-[11.5px] font-bold text-[#0048B5] bg-white border border-blue-200 rounded-xl hover:bg-blue-50 transition shadow-2xs cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Agregar Lote</span>
                  </button>
                </div>
              </div>

              {/* Formulario Inline para Agregar Asignación */}
              {showAddForm && (
                <form
                  onSubmit={handleSaveNewEntry}
                  className="p-4 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-[12.5px] font-bold text-[#0048B5] flex items-center gap-1.5">
                      <Plus size={14} /> Nueva Asignación para {currentDateKey}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="text-slate-400 hover:text-rose-500 font-bold text-sm"
                    >
                      ×
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Tipo de Bloque</label>
                      <select
                        value={newEntry.tipo}
                        onChange={(e) => setNewEntry({ ...newEntry, tipo: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 outline-none"
                      >
                        <option value="SERVICIOS_PROFESIONALES">Servicios Profesionales (SP)</option>
                        <option value="PLANILLA_FIJA">Planilla Fija</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Supervisor a Cargo</label>
                      <select
                        value={newEntry.supervisorId || ""}
                        onChange={(e) => setNewEntry({ ...newEntry, supervisorId: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 outline-none"
                      >
                        {supervisores.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nombre} (#{s.puesto})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Horario / Franja</label>
                      <select
                        value={newEntry.horario}
                        onChange={(e) => setNewEntry({ ...newEntry, horario: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 outline-none"
                      >
                        {DEFAULT_HORARIOS.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Puesto Inicio</label>
                      <input
                        type="number"
                        min="1"
                        max="170"
                        value={newEntry.bloqueInicio}
                        onChange={(e) => setNewEntry({ ...newEntry, bloqueInicio: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Puesto Fin</label>
                      <input
                        type="number"
                        min="1"
                        max="170"
                        value={newEntry.bloqueFin}
                        onChange={(e) => setNewEntry({ ...newEntry, bloqueFin: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Médicos Programados</label>
                      <input
                        type="number"
                        min="1"
                        max="170"
                        value={newEntry.numMedicos}
                        onChange={(e) => setNewEntry({ ...newEntry, numMedicos: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1.5 text-[11.5px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-[11.5px] font-bold text-white bg-[#0048B5] hover:bg-[#003487] rounded-xl shadow-xs cursor-pointer"
                    >
                      Guardar Asignación
                    </button>
                  </div>
                </form>
              )}

              {/* Tarjetas KPIs del Día */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Total Puestos</span>
                  <p className="font-heading text-xl font-black text-slate-900 mt-0.5">{totalPuestosDia}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Médicos Programados</span>
                  <p className="font-heading text-xl font-black text-[#0048B5] mt-0.5">{totalMedicosDia}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Planilla Fija</span>
                  <p className="font-heading text-xl font-black text-blue-700 mt-0.5">{planillaFijaEntries.length} bloques</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Servicios Prof.</span>
                  <p className="font-heading text-xl font-black text-emerald-700 mt-0.5">{spEntries.length} supervisores</p>
                </div>
              </div>

              {/* Sección 1: Planilla Fija */}
              {planillaFijaEntries.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-[#0048B5]">
                      <ShieldCheck size={14} />
                    </span>
                    <h4 className="font-heading text-sm font-bold text-slate-800">
                      Planilla Fija (Turno Mañana)
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {planillaFijaEntries.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl border border-blue-200 bg-blue-50/30 flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-black text-[#0048B5] bg-blue-100/80 px-2 py-0.5 rounded-lg font-mono">
                              {item.grupo}
                            </span>
                            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                              <Clock size={11} className="text-slate-400" />
                              {item.horario}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="font-mono-data text-[13px] font-extrabold text-slate-800 flex items-center gap-1">
                              <MapPin size={13} className="text-[#0048B5]" /> Puestos #{item.bloqueInicio} al #{item.bloqueFin}
                            </span>
                            <span className="text-[11px] text-slate-500 font-semibold">
                              ({item.totalPuestos} cubículos · {item.numMedicos} médicos)
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteEntry(currentDateKey, item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Eliminar asignación"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sección 2: Servicios Profesionales */}
              {spEntries.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                      <Users size={14} />
                    </span>
                    <h4 className="font-heading text-sm font-bold text-slate-800">
                      Servicios Profesionales (Turnos Tarde / Noche)
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {spEntries.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 flex items-center justify-between gap-3 hover:border-emerald-300 transition-all shadow-2xs"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[12px] font-bold text-slate-900">
                              {item.supervisorNombre || "Supervisor Asignado"}
                            </span>
                            <span className="text-[10px] font-black text-emerald-800 bg-emerald-100/90 px-1.5 py-0.2 rounded font-mono">
                              {item.grupo}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                            <span className="flex items-center gap-1 text-slate-500">
                              <Clock size={11} className="text-slate-400" />
                              {item.horario}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="font-mono-data text-[13px] font-black text-emerald-900 flex items-center gap-1">
                              <MapPin size={13} className="text-emerald-600" /> Puestos #{item.bloqueInicio} al #{item.bloqueFin}
                            </span>
                            <span className="text-[11px] text-slate-500 font-semibold">
                              ({item.totalPuestos} cubículos · {item.numMedicos} médicos)
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteEntry(currentDateKey, item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Eliminar asignación"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentDayEntries.length === 0 && (
                <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
                  <Calendar size={36} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-[13px] font-bold text-slate-600">
                    No hay distribución configurada para {currentDateKey}.
                  </p>
                  <p className="text-[11.5px] text-slate-400 mt-1 max-w-md mx-auto">
                    Usa la pestaña "Copiar y Pegar desde Google Sheets" para importar las tablas completas de la hoja RESUMEN SAN MIGUEL.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Pestaña: Importar desde Google Sheets */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[#0048B5]" />
                  <h4 className="text-[12.5px] font-bold text-slate-900">
                    Importación Rápida desde Google Sheets (Hoja RESUMEN SAN MIGUEL)
                  </h4>
                </div>
                <p className="text-[11.5px] text-slate-600 leading-relaxed">
                  1. En tu archivo de Google Sheets (<strong>OCTUBRE OFICIAL 2026</strong>), entra a la pestaña <strong>RESUMEN SAN MIGUEL</strong>.<br />
                  2. Selecciona las filas completas de la tabla (incluyendo encabezados o directamente las filas de datos) y copia con <strong>Ctrl+C</strong>.<br />
                  3. Pégalas en el área inferior. El sistema extraerá automáticamente las fechas, supervisores, franjas y rangos de puestos (ej. <i>84 - 103 (20)</i>).
                </p>
              </div>

              <div className="relative">
                <textarea
                  value={pastedText}
                  onChange={(e) => handleAnalyzeText(e.target.value)}
                  placeholder={`Pega aquí el contenido copiado de la hoja RESUMEN SAN MIGUEL...\n\nEjemplo:\n01/10/2026\tSP\t19\t84 - 103 (20)\t02:00pm-10:00pm\tALFREDO ISAAC MARTINEZ AMAYA\n01/10/2026\tSP\t20\t63 - 83 (21)\t02:00pm-10:00pm\tEMERSON JOSUE VIGIL HERNANDEZ\n01/10/2026\tSP\t18\t38 - 56 (19)\t04:00pm-10:00pm\tEMERSON JOSUE VIGIL HERNANDEZ`}
                  rows={8}
                  className="w-full rounded-2xl border border-slate-300 p-4 font-mono text-[11.5px] text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0048B5] focus:ring-2 focus:ring-[#0048B5]/20"
                />
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="absolute top-3 right-3 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 backdrop-blur px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
                >
                  <Clipboard size={12} className="text-[#0048B5]" />
                  <span>Pegar Portapapeles</span>
                </button>
              </div>

              {parseError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11.5px] font-semibold">
                  <AlertTriangle size={15} />
                  <span>{parseError}</span>
                </div>
              )}

              {parsedPreview && (
                <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span className="text-[12.5px] font-bold text-emerald-950">
                        ¡{parsedPreview.totalEntries} asignaciones detectadas en {parsedPreview.dates.length} fecha(s)!
                      </span>
                    </div>
                    <button
                      onClick={handleConfirmImport}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition cursor-pointer"
                    >
                      <Save size={13} />
                      <span>Guardar y Aplicar a la Distribución</span>
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto rounded-xl border border-emerald-200 bg-white">
                    <table className="w-full text-left text-[11.5px]">
                      <thead className="bg-emerald-50/80 border-b border-emerald-100 text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                        <tr>
                          <th className="px-3 py-2">Fecha</th>
                          <th className="px-3 py-2">Tipo / Grupo</th>
                          <th className="px-3 py-2">Supervisor</th>
                          <th className="px-3 py-2">Horario</th>
                          <th className="px-3 py-2">Ubicación (Lote)</th>
                          <th className="px-3 py-2 text-right">Médicos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-50">
                        {parsedPreview.dates.flatMap((dKey) =>
                          (parsedPreview.dailyLots[dKey] || []).map((row) => (
                            <tr key={row.id}>
                              <td className="px-3 py-2 font-mono">{row.dateKey}</td>
                              <td className="px-3 py-2 font-bold text-slate-700">{row.grupo}</td>
                              <td className="px-3 py-2 font-semibold text-slate-900">{row.supervisorNombre || "Planilla Fija"}</td>
                              <td className="px-3 py-2 text-slate-600">{row.horario}</td>
                              <td className="px-3 py-2 font-mono font-bold text-[#0048B5]">
                                #{row.bloqueInicio} - #{row.bloqueFin} ({row.totalPuestos})
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-emerald-700">{row.numMedicos}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50/90 px-6 py-3.5 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400 font-medium">
            Los cambios se sincronizan en tiempo real con Firestore y se aplican a los mapas y reportes de todos los supervisores.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-[12px] font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition shadow-2xs cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
