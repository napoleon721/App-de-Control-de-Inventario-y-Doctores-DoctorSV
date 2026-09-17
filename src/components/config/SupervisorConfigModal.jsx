import React, { useState } from "react";
import {
  Shield, MapPin, Check, X, RotateCcw,
  Sparkles, AlertCircle, Save, Clock, Lock
} from "lucide-react";
import { SUPERVISORES_OFICIALES, HORARIOS as DEFAULT_HORARIOS } from "../../constants/tokens";

export default function SupervisorConfigModal({
  supervisores,
  onSaveSupervisores,
  onClose,
  horarios = DEFAULT_HORARIOS,
}) {
  const [list, setList] = useState(
    supervisores.map((s) => ({ ...s }))
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  function handleChange(idx, field, val) {
    setErrorMsg("");
    setSavedMsg("");
    setList((prev) => {
      const copy = prev.map((s) => ({ ...s }));
      copy[idx][field] = val;
      if (field === "bloqueInicio" || field === "bloqueFin") {
        const bIni = Number(field === "bloqueInicio" ? val : copy[idx].bloqueInicio);
        const bFin = Number(field === "bloqueFin" ? val : copy[idx].bloqueFin);
        if (bFin >= bIni && bIni > 0) {
          copy[idx].totalPuestos = bFin - bIni + 1;
        }
      }
      return copy;
    });
  }

  function handleSave() {
    // Validaciones
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const bIni = Number(s.bloqueInicio);
      const bFin = Number(s.bloqueFin);
      const pFis = Number(s.puesto);

      if (!bIni || !bFin || bIni < 1 || bFin > 140) {
        setErrorMsg(`Error en ${s.nombre}: El rango del bloque debe estar entre los puestos #1 y #140.`);
        return;
      }
      if (bIni > bFin) {
        setErrorMsg(`Error en ${s.nombre}: El puesto de inicio (#${bIni}) no puede ser mayor que el de fin (#${bFin}).`);
        return;
      }
      if (!pFis || pFis < 1 || pFis > 140) {
        setErrorMsg(`Error en ${s.nombre}: El puesto de estación física debe ser un número entre 1 y 140.`);
        return;
      }
    }

    onSaveSupervisores(list);
    setSavedMsg("¡Configuración guardada y sincronizada correctamente!");
    setTimeout(() => {
      onClose();
    }, 450);
  }

  function handleResetDefaults() {
    if (window.confirm("¿Deseas restaurar los rangos y puestos oficiales originales de los 5 supervisores?")) {
      setList(SUPERVISORES_OFICIALES.map((s) => ({ ...s })));
      onSaveSupervisores(SUPERVISORES_OFICIALES);
      setSavedMsg("Rangos restablecidos a los valores por defecto del Excel.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "popIn .2s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]"
      >
        {/* Header con gradiente institucional */}
        <div
          className="px-6 py-4.5 text-white flex items-center justify-between shrink-0"
          style={{ background: "linear-gradient(135deg, #002868 0%, #0048B5 60%, #0095FF 100%)" }}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-md shadow-inner">
              <Shield size={20} />
            </span>
            <div>
              <h3 className="font-heading text-lg font-bold">
                Configuración de Supervisores & Lotes Asignados
              </h3>
              <p className="text-[11.5px] text-cyan-100">
                Ajusta el rango de puestos (bloque de inicio y fin), estación física y turnos de cada supervisor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Contenido con lista editable */}
        <div className="p-6 space-y-5 overflow-y-auto">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Supervisores Oficiales & Lotes de Asistencia ({list.length})
            </label>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-[11px] font-bold text-slate-500 hover:text-[#0048B5] flex items-center gap-1 transition-colors"
              title="Restablecer los valores originales del Excel"
            >
              <RotateCcw size={12} />
              <span>Restablecer oficiales</span>
            </button>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12px] font-medium text-rose-700 flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {savedMsg && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[12px] font-medium text-emerald-700 flex items-center gap-2">
              <Check size={16} className="text-emerald-500 shrink-0" />
              <span>{savedMsg}</span>
            </div>
          )}

          <div className="space-y-3">
            {list.map((sup, idx) => (
              <div
                key={sup.id || idx}
                className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition-all hover:bg-slate-50 hover:border-slate-300 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-sky-800 bg-sky-100 border border-sky-200 font-mono-data">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-800 text-[13.5px] leading-tight">
                        {sup.nombre}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {sup.correo}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    {sup.rol || "Supervisor Médico"}
                  </span>
                </div>

                {/* Campos de Configuración del Supervisor */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                  {/* Puesto Estación Física */}
                  <div>
                    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                      <Lock size={11} className="text-sky-600" />
                      <span>Estación Física</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-[12px] font-mono font-bold text-slate-400">#</span>
                      <input
                        type="number"
                        min="1"
                        max="140"
                        value={sup.puesto}
                        onChange={(e) => handleChange(idx, "puesto", Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 bg-white pl-6 pr-3 py-1.5 text-[12.5px] font-mono-data font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#0095FF]/40"
                      />
                    </div>
                  </div>

                  {/* Rango: Bloque Inicio */}
                  <div>
                    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                      <MapPin size={11} className="text-[#0048B5]" />
                      <span>Bloque Inicio</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-[12px] font-mono font-bold text-slate-400">#</span>
                      <input
                        type="number"
                        min="1"
                        max="140"
                        value={sup.bloqueInicio}
                        onChange={(e) => handleChange(idx, "bloqueInicio", Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 bg-white pl-6 pr-3 py-1.5 text-[12.5px] font-mono-data font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#0095FF]/40"
                      />
                    </div>
                  </div>

                  {/* Rango: Bloque Fin */}
                  <div>
                    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                      <MapPin size={11} className="text-[#0048B5]" />
                      <span>Bloque Fin</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-[12px] font-mono font-bold text-slate-400">#</span>
                      <input
                        type="number"
                        min="1"
                        max="140"
                        value={sup.bloqueFin}
                        onChange={(e) => handleChange(idx, "bloqueFin", Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 bg-white pl-6 pr-3 py-1.5 text-[12.5px] font-mono-data font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#0095FF]/40"
                      />
                    </div>
                  </div>

                  {/* Turno Asignado */}
                  <div>
                    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                      <Clock size={11} className="text-amber-600" />
                      <span>Turno</span>
                    </label>
                    <select
                      value={sup.horario}
                      onChange={(e) => handleChange(idx, "horario", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#0095FF]/40 cursor-pointer"
                    >
                      {horarios.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>
                    Capacidad calculada: <strong className="text-slate-800">{sup.totalPuestos || (sup.bloqueFin - sup.bloqueInicio + 1)} puestos</strong>
                  </span>
                  <span className="font-mono text-[10.5px] text-[#0048B5]">
                    Puestos #{sup.bloqueInicio} al #{sup.bloqueFin}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3.5 text-[11.5px] text-slate-600 flex items-start gap-2.5">
            <Sparkles size={16} className="text-[#0095FF] shrink-0 mt-0.5" />
            <span>
              Al guardar, los nuevos rangos de ubicación y la estación física se actualizarán automáticamente en la vista de Control de Asistencia, en el mapa de cubículos y se sincronizarán en tiempo real en la nube.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-[12.5px] font-bold text-white transition hover:brightness-110 shadow-xs active:scale-95"
              style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
            >
              <Save size={14} />
              <span>Guardar Configuración de Lotes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
