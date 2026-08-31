import React, { useState } from "react";
import { X, UserCheck, Stethoscope } from "lucide-react";
import { HORARIOS } from "../../constants/tokens";

export default function DoctorAssignModal({ doctor, currentSpace, availableSpaces, onClose, onAssign, onUnassign }) {
  const [selectedSpaceId, setSelectedSpaceId] = useState(
    currentSpace ? currentSpace.id : availableSpaces[0]?.id || ""
  );
  const [selectedHorario, setSelectedHorario] = useState(
    currentSpace?.horario || HORARIOS[0]
  );

  function handleSubmit(e) {
    e.preventDefault();
    if (!selectedSpaceId) {
      alert("Por favor selecciona un puesto disponible.");
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
              <p className="font-heading text-[16px] font-bold">Asignación de Consultorio</p>
              <p className="text-[11.5px] text-white/80">{doctor}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Puesto / Cubículo
            </label>
            <select
              value={selectedSpaceId}
              onChange={(e) => setSelectedSpaceId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] font-medium shadow-2xs"
            >
              {currentSpace && (
                <option value={currentSpace.id}>
                  Puesto #{currentSpace.id} (Puesto actual)
                </option>
              )}
              {availableSpaces.map((s) => (
                <option key={s.id} value={s.id}>
                  Puesto #{s.id} — {s.marca ? `${s.marca} ` : ""} (Disponible)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Turno / Horario de Telemedicina
            </label>
            <select
              value={selectedHorario}
              onChange={(e) => setSelectedHorario(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] font-medium shadow-2xs"
            >
              {HORARIOS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {currentSpace ? (
              <button
                type="button"
                onClick={() => {
                  onUnassign(doctor, currentSpace.id);
                  onClose();
                }}
                className="text-[12px] font-bold text-rose-600 hover:underline"
              >
                Liberar puesto actual
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-xl px-4 py-2 text-[12.5px] font-semibold text-white transition hover:brightness-110 shadow-sm"
                style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
              >
                Confirmar Asignación
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
