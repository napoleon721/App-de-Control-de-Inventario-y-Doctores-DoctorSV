import React, { useState } from "react";
import { X, Save, PlusCircle } from "lucide-react";
import { BODEGA_TIPOS } from "../../constants/tokens";

export default function MovementModal({ onClose, onRegister, spaces = [] }) {
  const [equipo, setEquipo] = useState("PC");
  const [accion, setAccion] = useState("Reemplazo");
  const [espacio, setEspacio] = useState(spaces[0]?.id || 1);
  const [origen, setOrigen] = useState("BODEGA");
  const [destino, setDestino] = useState(String(spaces[0]?.id || 1));
  const [falla, setFalla] = useState("");
  const [obs, setObs] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const newMovement = {
      id: `mov-${Date.now()}`,
      fecha: new Date().toLocaleDateString("es-SV", { day: "2-digit", month: "2-digit", year: "numeric" }),
      equipo,
      accion,
      espacio: Number(espacio) || espacio,
      origen,
      destino,
      falla: falla.trim() || "N/A",
      obs: obs.trim() || "Sin observaciones adicionales",
    };

    onRegister(newMovement);
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
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200"
      >
        {/* Header in DoctorSV Gradient */}
        <div
          className="flex items-center justify-between px-6 py-4 text-white"
          style={{ background: "linear-gradient(135deg, #003487 0%, #0048B5 60%, #0095FF 100%)" }}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-md">
              <PlusCircle size={18} />
            </span>
            <div>
              <p className="font-heading text-[16px] font-bold">Registrar Movimiento de Hardware</p>
              <p className="text-[11.5px] text-white/75">Actualizará el stock de bodega y la bitácora médica</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Tipo de Hardware
              </label>
              <select
                value={equipo}
                onChange={(e) => setEquipo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-medium shadow-2xs"
              >
                {BODEGA_TIPOS.map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.key} — {b.label}
                  </option>
                ))}
                <option value="EQUIPO COMPLETO">EQUIPO COMPLETO</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Tipo de Operación
              </label>
              <select
                value={accion}
                onChange={(e) => setAccion(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-medium shadow-2xs"
              >
                <option value="Reemplazo">Reemplazo por falla</option>
                <option value="Traslado">Traslado entre puestos</option>
                <option value="Mantenimiento">Mantenimiento preventivo/correctivo</option>
                <option value="Reintegro">Reintegro a operación</option>
                <option value="Retiro">Retiro a bodega</option>
                <option value="Cambio">Cambio de componente</option>
                <option value="Ingreso">Ingreso de stock nuevo</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Puesto Afectado
              </label>
              <select
                value={espacio}
                onChange={(e) => {
                  setEspacio(e.target.value);
                  setDestino(e.target.value);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-mono-data font-semibold text-[#0048B5]"
              >
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    Puesto #{s.id} ({s.estado})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Origen
              </label>
              <input
                type="text"
                value={origen}
                onChange={(e) => setOrigen(e.target.value)}
                placeholder="Ej. BODEGA o #44"
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12.5px] shadow-2xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Destino
              </label>
              <input
                type="text"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                placeholder="Ej. #132 o BODEGA"
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12.5px] shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Motivo o Falla Detectada
            </label>
            <input
              type="text"
              value={falla}
              onChange={(e) => setFalla(e.target.value)}
              placeholder="Ej. Falla en scroll, problemas de red, mantenimiento programado..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12.5px] shadow-2xs"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Observaciones Adicionales
            </label>
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              rows={2}
              placeholder="Detalles sobre el técnico responsable, ticket de soporte o reemplazo..."
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-[12.5px] shadow-2xs"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl px-5 py-2 text-[12.5px] font-semibold text-white transition hover:brightness-110 shadow-sm"
              style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
            >
              <Save size={14} /> Registrar en Sistema
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
