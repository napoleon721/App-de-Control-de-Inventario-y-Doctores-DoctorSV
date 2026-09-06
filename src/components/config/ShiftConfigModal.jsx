import React, { useState } from "react";
import {
  Clock, Plus, Trash2, Edit2, Check, X, RotateCcw,
  Sun, Sunset, Moon, Sparkles, AlertCircle, Save
} from "lucide-react";
import { HORARIOS as DEFAULT_HORARIOS } from "../../constants/tokens";

export default function ShiftConfigModal({
  horarios,
  onSaveHorarios,
  onClose
}) {
  const [list, setList] = useState([...horarios]);
  const [newShift, setNewShift] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  function handleAddShift(e) {
    e.preventDefault();
    const clean = newShift.trim();
    if (!clean) {
      setErrorMsg("Por favor escribe el formato del horario (ej. 07:00 AM – 03:00 PM)");
      return;
    }
    if (list.includes(clean)) {
      setErrorMsg("Este horario ya existe en la lista.");
      return;
    }
    const updated = [...list, clean];
    setList(updated);
    setNewShift("");
    setErrorMsg("");
    onSaveHorarios(updated);
  }

  function handleDeleteShift(index) {
    if (list.length <= 1) {
      alert("Debe haber al menos un horario activo en el sistema.");
      return;
    }
    const updated = list.filter((_, i) => i !== index);
    setList(updated);
    onSaveHorarios(updated);
  }

  function handleStartEdit(index, val) {
    setEditingIndex(index);
    setEditingValue(val);
  }

  function handleSaveEdit(index) {
    const clean = editingValue.trim();
    if (!clean) return;
    const updated = [...list];
    updated[index] = clean;
    setList(updated);
    setEditingIndex(null);
    setEditingValue("");
    onSaveHorarios(updated);
  }

  function handleResetDefaults() {
    if (window.confirm("¿Deseas restaurar la lista oficial de horarios por defecto?")) {
      setList(DEFAULT_HORARIOS);
      onSaveHorarios(DEFAULT_HORARIOS);
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
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]"
      >
        {/* Header con gradiente institucional DoctorSV */}
        <div
          className="px-6 py-4.5 text-white flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, #002868 0%, #0048B5 60%, #0095FF 100%)" }}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-md shadow-inner">
              <Clock size={20} />
            </span>
            <div>
              <h3 className="font-heading text-lg font-bold">
                Configurador de Horarios & Turnos
              </h3>
              <p className="text-[11.5px] text-cyan-100">
                Define los turnos disponibles que podrán seleccionar los médicos en el registro
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

        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Formulario para agregar nuevo horario */}
          <form onSubmit={handleAddShift} className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Agregar Nuevo Horario de Atención
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  value={newShift}
                  onChange={(e) => {
                    setNewShift(e.target.value);
                    setErrorMsg("");
                  }}
                  placeholder="Ej. 07:00 AM – 03:00 PM"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] font-medium outline-none focus:ring-2 focus:ring-[#0095FF]/40 focus:bg-white transition-all shadow-2xs"
                />
              </div>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[12.5px] font-bold text-white shadow-xs hover:brightness-110 active:scale-95 transition-all"
                style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
              >
                <Plus size={16} />
                <span>Agregar</span>
              </button>
            </div>
            {errorMsg && (
              <p className="text-[11.5px] text-rose-600 flex items-center gap-1 mt-1">
                <AlertCircle size={13} /> {errorMsg}
              </p>
            )}

            {/* Plantillas rápidas para agregar en un clic */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Sugerencias:</span>
              {[
                "07:00 AM – 03:00 PM",
                "01:00 PM – 09:00 PM",
                "03:00 PM – 11:00 PM",
                "10:00 PM – 06:00 AM"
              ].map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setNewShift(sug)}
                  className="text-[10.5px] font-semibold text-[#0048B5] bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg transition-colors border border-blue-100"
                >
                  + {sug}
                </button>
              ))}
            </div>
          </form>

          {/* Lista de horarios activos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Horarios Activos en el Sistema ({list.length})
              </label>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="text-[11px] font-bold text-slate-500 hover:text-[#0048B5] flex items-center gap-1"
                title="Restablecer los 8 horarios originales del sistema"
              >
                <RotateCcw size={12} />
                <span>Restablecer oficiales</span>
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {list.map((h, idx) => {
                const isEditing = editingIndex === idx;
                const isMorning = h.includes("AM") && !h.includes("MD");
                const isAfternoon = h.includes("MD") || (h.includes("PM") && !h.includes("10:00"));
                const ShiftIcon = isMorning ? Sun : isAfternoon ? Sunset : Moon;

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 hover:bg-slate-50/80 transition-colors group"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="flex-1 rounded-lg border border-blue-300 px-2.5 py-1 text-[12.5px] font-semibold outline-none focus:ring-2 focus:ring-blue-400"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(idx)}
                          className="p-1 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        >
                          <Check size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingIndex(null)}
                          className="p-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5">
                          <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs ${
                            isMorning
                              ? "bg-amber-100 text-amber-800"
                              : isAfternoon
                              ? "bg-orange-100 text-orange-800"
                              : "bg-indigo-100 text-indigo-800"
                          }`}>
                            <ShiftIcon size={14} />
                          </span>
                          <div>
                            <span className="font-semibold text-slate-800 text-[13px]">
                              {h}
                            </span>
                            <span className="ml-2 text-[10px] font-mono-data text-slate-400">
                              Turno #{idx + 1}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(idx, h)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#0048B5] hover:bg-blue-50 transition-colors"
                            title="Editar horario"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteShift(idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Eliminar horario"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3 text-[11.5px] text-slate-600 flex items-start gap-2">
            <Sparkles size={15} className="text-[#0095FF] shrink-0 mt-0.5" />
            <span>
              Cualquier cambio guardado aquí se actualizará de inmediato en la ventana de registro de los médicos, en el Auto Check-In y en los filtros del mapa.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-5 py-2.5 text-[12.5px] font-bold text-white transition hover:brightness-110 shadow-xs"
              style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
            >
              Listo / Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
