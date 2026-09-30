import React, { useState } from "react";
import {
  Shield, MapPin, Check, X, RotateCcw,
  Sparkles, AlertCircle, Save, Clock, Lock
} from "lucide-react";
import { SUPERVISORES_OFICIALES, HORARIOS as DEFAULT_HORARIOS } from "../../constants/tokens";
import { isSameHorario } from "../../utils/safeHelpers";

export default function SupervisorConfigModal({
  supervisores,
  onSaveSupervisores,
  onClose,
  horarios = DEFAULT_HORARIOS,
}) {
  const [list, setList] = useState(() =>
    supervisores.map((s) => {
      let turnos = [];
      if (Array.isArray(s.horarios) && s.horarios.length > 0) {
        turnos = [...s.horarios];
      } else if (s.horario) {
        turnos = String(s.horario)
          .split(/[·,]/)
          .map((h) => h.trim())
          .filter(Boolean);
      }
      if (turnos.length === 0 && s.horario) {
        turnos = [s.horario];
      }
      return {
        ...s,
        horarios: turnos,
        horario: turnos.join(" · ") || s.horario || "02:00 PM – 10:00 PM",
      };
    })
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  function toggleHorario(idx, shift) {
    setErrorMsg("");
    setSavedMsg("");
    setList((prev) => {
      const copy = prev.map((s) => ({ ...s }));
      const currentSup = copy[idx];
      let currentHorarios = Array.isArray(currentSup.horarios) ? [...currentSup.horarios] : [];
      if (currentHorarios.length === 0 && currentSup.horario) {
        currentHorarios = String(currentSup.horario)
          .split(/[·,]/)
          .map((h) => h.trim())
          .filter(Boolean);
      }

      const exists = currentHorarios.some((h) => isSameHorario(h, shift));
      let nextHorarios;
      if (exists) {
        nextHorarios = currentHorarios.filter((h) => !isSameHorario(h, shift));
      } else {
        nextHorarios = [...currentHorarios, shift];
      }

      copy[idx].horarios = nextHorarios;
      copy[idx].horario = nextHorarios.join(" · ");
      return copy;
    });
  }

  function handleChange(idx, field, val) {
    setErrorMsg("");
    setSavedMsg("");
    setList((prev) => {
      const copy = prev.map((s) => ({ ...s }));
      copy[idx][field] = val;
      if (field === "bloqueInicio" || field === "bloqueFin") {
        const bIni = Number(field === "bloqueInicio" ? val : copy[idx].bloqueInicio) || 0;
        const bFin = Number(field === "bloqueFin" ? val : copy[idx].bloqueFin) || 0;
        if (bIni === 0 && bFin === 0) {
          copy[idx].totalPuestos = 0;
        } else if (bFin >= bIni && bIni > 0) {
          copy[idx].totalPuestos = bFin - bIni + 1;
        } else {
          copy[idx].totalPuestos = 0;
        }
      }
      return copy;
    });
  }

  function handleSave() {
    // Validaciones flexibles (permitiendo 0 si no asiste hoy)
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const bIni = Number(s.bloqueInicio) || 0;
      const bFin = Number(s.bloqueFin) || 0;
      const pFis = Number(s.puesto) || 0;

      // Si el supervisor no asiste ese día (puestos en 0)
      if (bIni === 0 && bFin === 0) {
        list[i].totalPuestos = 0;
        list[i].bloqueInicio = 0;
        list[i].bloqueFin = 0;
        list[i].puesto = pFis;
        continue;
      }

      if (bIni < 1 || bFin > 170) {
        setErrorMsg(`Error en ${s.nombre}: El rango del bloque debe estar entre los puestos #1 y #170 (o ambos en 0 si no asiste hoy).`);
        return;
      }
      if (bIni > bFin) {
        setErrorMsg(`Error en ${s.nombre}: El puesto de inicio (#${bIni}) no puede ser mayor que el de fin (#${bFin}).`);
        return;
      }
      if (pFis < 0 || pFis > 170) {
        setErrorMsg(`Error en ${s.nombre}: El puesto de estación física debe ser un número entre 0 y 170.`);
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
      const defs = SUPERVISORES_OFICIALES.map((s) => ({ ...s, horarios: [s.horario] }));
      setList(defs);
      onSaveSupervisores(defs);
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
                Configuración de Supervisores, Lotes & Turnos Oficiales
              </h3>
              <p className="text-[11.5px] text-cyan-100">
                Ajusta el rango de puestos (bloque de inicio y fin), estación física y el turno oficial asignado a cada supervisor
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

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const isInactive = Number(sup.bloqueInicio) === 0 && Number(sup.bloqueFin) === 0;
                        if (isInactive) {
                          const official = SUPERVISORES_OFICIALES.find((o) => o.id === sup.id) || SUPERVISORES_OFICIALES[idx];
                          handleChange(idx, "bloqueInicio", official.bloqueInicio);
                          handleChange(idx, "bloqueFin", official.bloqueFin);
                          handleChange(idx, "puesto", official.puesto);
                        } else {
                          handleChange(idx, "bloqueInicio", 0);
                          handleChange(idx, "bloqueFin", 0);
                          handleChange(idx, "puesto", 0);
                        }
                      }}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
                        Number(sup.bloqueInicio) === 0 && Number(sup.bloqueFin) === 0
                          ? "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                      title="Haz clic para alternar entre activo o no asiste hoy (0 puestos)"
                    >
                      {Number(sup.bloqueInicio) === 0 && Number(sup.bloqueFin) === 0
                        ? "⚪ No Asiste Hoy (Sin Lote)"
                        : "✓ Activo Hoy"}
                    </button>
                    <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      {sup.rol || "Supervisor Médico"}
                    </span>
                  </div>
                </div>

                {/* Campos de Configuración del Supervisor: Puestos Físicos */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 mb-2.5">
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
                        min="0"
                        max="170"
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
                        min="0"
                        max="170"
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
                        min="0"
                        max="170"
                        value={sup.bloqueFin}
                        onChange={(e) => handleChange(idx, "bloqueFin", Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 bg-white pl-6 pr-3 py-1.5 text-[12.5px] font-mono-data font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#0095FF]/40"
                      />
                    </div>
                  </div>
                </div>

                {/* Sección Multiselección de Turnos Oficiales */}
                {(() => {
                  const currentHorarios = Array.isArray(sup.horarios) && sup.horarios.length > 0
                    ? sup.horarios
                    : (sup.horario ? String(sup.horario).split(/[·,]/).map((h) => h.trim()).filter(Boolean) : []);
                  return (
                    <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200 mb-2">
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                          <Clock size={12} className="text-amber-600" />
                          <span>Turno(s) / Franja(s) Oficial(es) Asignadas:</span>
                        </label>
                        <span className="text-[11px] font-bold text-[#0048B5]">
                          {currentHorarios.length > 0
                            ? `${currentHorarios.length} franja(s) activa(s)`
                            : "Ninguna franja seleccionada"}
                        </span>
                      </div>

                      {/* Botones / Chips interactivos para cada turno */}
                      <div className="flex flex-wrap gap-1.5">
                        {horarios.map((h) => {
                          const isSelected = currentHorarios.some((ch) => isSameHorario(ch, h));
                          return (
                            <button
                              type="button"
                              key={h}
                              onClick={() => toggleHorario(idx, h)}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                                isSelected
                                  ? "bg-[#0048B5] text-white border-[#0048B5] ring-2 ring-blue-300 scale-102"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
                              }`}
                              title={`Haz clic para ${isSelected ? "desmarcar" : "asignar"} este turno`}
                            >
                              <span className={`text-[10px] font-black ${isSelected ? "text-amber-300" : "text-slate-400"}`}>
                                {isSelected ? "✓" : "+"}
                              </span>
                              <span>{h}</span>
                            </button>
                          );
                        })}
                      </div>

                      {currentHorarios.length > 0 && (
                        <div className="mt-2 text-[11px] text-slate-600 font-medium flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-700">Franjas asignadas:</span>
                          <span className="font-mono text-[#0048B5] font-bold">
                            {currentHorarios.join("  ·  ")}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>
                    Capacidad calculada:{" "}
                    <strong className={Number(sup.bloqueInicio) === 0 && Number(sup.bloqueFin) === 0 ? "text-amber-700 font-bold" : "text-slate-800"}>
                      {Number(sup.bloqueInicio) === 0 && Number(sup.bloqueFin) === 0
                        ? "0 puestos (No asiste hoy)"
                        : `${sup.totalPuestos || (sup.bloqueFin - sup.bloqueInicio + 1)} puestos`}
                    </strong>
                  </span>
                  <span className={`font-mono text-[10.5px] ${Number(sup.bloqueInicio) === 0 && Number(sup.bloqueFin) === 0 ? "text-amber-700 font-bold" : "text-[#0048B5]"}`}>
                    {Number(sup.bloqueInicio) === 0 && Number(sup.bloqueFin) === 0
                      ? "Sin lote asignado hoy"
                      : `Puestos #${sup.bloqueInicio} al #${sup.bloqueFin}`}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3.5 text-[11.5px] text-slate-600 flex items-start gap-2.5">
            <Sparkles size={16} className="text-[#0095FF] shrink-0 mt-0.5" />
            <span>
              Al guardar, los nuevos turnos oficiales, rangos de lote y estación física de cada supervisor se actualizarán de inmediato en Control de Asistencia y se sincronizarán en la nube.
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
              className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-[12.5px] font-bold text-white transition hover:brightness-110 shadow-xs active:scale-95 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
            >
              <Save size={14} />
              <span>Guardar Lotes & Turnos Oficiales</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
