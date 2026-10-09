import React, { useState } from "react";
import { X, UserCheck, Stethoscope, UserX } from "lucide-react";
import { HORARIOS } from "../../constants/tokens";

export default function DoctorAssignModal({
  doctor,
  currentSpace,
  availableSpaces = [],
  onClose,
  onAssign,
  onUnassign,
  horarios = HORARIOS,
  doctorCategory = "Personal",
}) {
  const [selectedSpaceId, setSelectedSpaceId] = useState(
    currentSpace ? String(currentSpace.id) : ""
  );
  const [selectedHorario, setSelectedHorario] = useState(
    currentSpace?.horario || (horarios && horarios[0]) || "07:00 AM – 12:00 PM"
  );

  function handleSubmit(e) {
    e.preventDefault();
    if (!selectedSpaceId || selectedSpaceId === "") {
      onUnassign(doctor, currentSpace ? currentSpace.id : null);
      onClose();
      return;
    }
    onAssign(doctor, Number(selectedSpaceId), selectedHorario);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "popIn .2s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200"
      >
        {/* Header DoctorSV Gradient */}
        <div
          className="flex items-center justify-between px-6 py-4 text-white"
          style={{ background: "linear-gradient(135deg, #003487 0%, #0048B5 60%, #0095FF 100%)" }}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-md">
              <Stethoscope size={17} />
            </span>
            <div>
              <p className="font-heading text-[16px] font-bold">Asignación de Puesto & Turno</p>
              <p className="text-[11.5px] text-white/80 truncate max-w-[280px]">
                {doctor} {doctorCategory ? `· ${doctorCategory}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Puesto / Cubículo
              </label>
              {currentSpace && (
                <span className="text-[10.5px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                  Asignado en #{currentSpace.id}
                </span>
              )}
            </div>
            <select
              value={selectedSpaceId}
              onChange={(e) => setSelectedSpaceId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] font-medium shadow-2xs outline-none focus:ring-2 focus:ring-[#0095FF] cursor-pointer"
            >
              <option value="">⚪ Sin puesto asignado (Liberar / Desasignar espacio)</option>
              {currentSpace && (
                <option value={String(currentSpace.id)}>
                  📍 Puesto #{currentSpace.id} (Puesto actual)
                </option>
              )}
              {availableSpaces
                .filter((s) => !currentSpace || Number(s.id) !== Number(currentSpace.id))
                .map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    Puesto #{s.id} — {s.marca ? `${s.marca} ` : ""} (Disponible)
                  </option>
                ))}
            </select>
            <p className="mt-1.5 text-[11px] text-slate-500 leading-tight">
              💡 Para dejar al personal sin cubículo asignado, selecciona <strong>"Sin puesto asignado"</strong> o pulsa el botón rojo de abajo.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Turno / Horario de Telemedicina
            </label>
            <select
              value={selectedHorario}
              onChange={(e) => setSelectedHorario(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] font-medium shadow-2xs outline-none focus:ring-2 focus:ring-[#0095FF] cursor-pointer"
            >
              {(horarios || HORARIOS).map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
            {currentSpace ? (
              <button
                type="button"
                onClick={() => {
                  onUnassign(doctor, currentSpace.id);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11.5px] font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer active:scale-95 shadow-2xs"
                title="Quitar asignación y dejar este colaborador sin ningún puesto"
              >
                <UserX size={14} className="text-rose-600" />
                <span>Liberar Puesto (Dejar Sin Espacio)</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`rounded-xl px-4 py-2 text-[12.5px] font-semibold text-white transition hover:brightness-110 shadow-sm cursor-pointer active:scale-95 ${
                  !selectedSpaceId
                    ? "bg-slate-700 hover:bg-slate-800"
                    : "bg-[#0048B5] hover:bg-[#003487]"
                }`}
                style={
                  selectedSpaceId
                    ? { background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }
                    : {}
                }
              >
                {!selectedSpaceId ? "Guardar (Sin Puesto)" : "Confirmar Asignación"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
