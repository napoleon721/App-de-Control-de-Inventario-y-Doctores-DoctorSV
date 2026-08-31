import React, { useState, useEffect } from "react";
import {
  X, Laptop, Monitor, Mouse, Headphones, Cable, History, Save, Sparkles
} from "lucide-react";
import { ESTADOS, MARCAS, HORARIOS, DOCTORES_MOCK, pick } from "../../constants/tokens";

export default function SpaceDetailModal({ space, onClose, onSave, historial = [] }) {
  const [form, setForm] = useState({ ...space });

  useEffect(() => {
    setForm({ ...space });
  }, [space]);

  if (!space) return null;

  function updateField(patch) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function handleSave() {
    onSave(form);
    onClose();
  }

  const spaceHistory = historial
    .filter((h) => String(h.espacio) === String(space.id) || String(h.destino) === String(space.id) || String(h.origen) === String(space.id))
    .slice(0, 4);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "popIn .2s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl border border-slate-200"
      >
        {/* Header Modal in DoctorSV Gradient */}
        <div
          className="flex items-center justify-between px-6 py-4 text-white"
          style={{ background: "linear-gradient(135deg, #003487 0%, #0048B5 60%, #0095FF 100%)" }}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md font-heading text-lg font-bold text-white shadow-inner">
              #{form.id}
            </span>
            <div>
              <p className="font-heading text-[16px] font-bold">Puesto de Consulta #{form.id}</p>
              <p className="text-[11.5px] text-white/75">Último movimiento registrado: {form.ultimoMovimiento || "N/A"}</p>
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
        <div className="space-y-5 p-6">
          {/* Quick State Selector */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Estado Actual del Puesto
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(ESTADOS).map((k) => {
                const isCurrent = form.estado === k;
                const e = ESTADOS[k];
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      const newDoctor = k === "OCUPADO" ? (form.doctor || pick(DOCTORES_MOCK)) : null;
                      const newHorario = k === "OCUPADO" ? (form.horario || pick(HORARIOS)) : null;
                      updateField({ estado: k, doctor: newDoctor, horario: newHorario });
                    }}
                    className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition-all duration-150 active:scale-95 shadow-2xs"
                    style={{
                      borderColor: isCurrent ? e.color : (e.border || "#E2E8F0"),
                      background: isCurrent ? e.color : e.soft,
                      color: isCurrent ? "#FFFFFF" : (e.textDark || e.color),
                    }}
                  >
                    <e.icon size={13} /> {e.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Doctor and Schedule assignment if Occupied */}
          {form.estado === "OCUPADO" && (
            <div className="rounded-2xl p-4 border border-rose-200 bg-rose-50/60">
              <p className="mb-2 text-[11.5px] font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                <Sparkles size={13} className="text-rose-600" /> Médico Asignado & Turno
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-700">Médico en turno</label>
                  <select
                    value={form.doctor || ""}
                    onChange={(e) => updateField({ doctor: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-medium shadow-2xs"
                  >
                    <option value="">— Seleccionar médico —</option>
                    {DOCTORES_MOCK.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-700">Horario de atención</label>
                  <select
                    value={form.horario || ""}
                    onChange={(e) => updateField({ horario: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-medium shadow-2xs"
                  >
                    <option value="">— Seleccionar horario —</option>
                    {HORARIOS.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Equipment Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* PC */}
            <div className="rounded-2xl border border-slate-200 p-3.5 bg-slate-50/70">
              <p className="mb-2.5 flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wider text-[#0048B5]">
                <Laptop size={14} /> Computadora (PC)
              </p>
              <label className="mb-1 block text-[10.5px] font-semibold text-slate-500">Marca</label>
              <select
                value={form.marca || ""}
                onChange={(e) => updateField({ marca: e.target.value || null })}
                className="mb-2 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-medium"
              >
                <option value="">— Sin PC —</option>
                {MARCAS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <label className="mb-1 block text-[10.5px] font-semibold text-slate-500">Modelo</label>
              <input
                type="text"
                value={form.modelo || ""}
                onChange={(e) => updateField({ modelo: e.target.value })}
                placeholder="Ej. OptiPlex 3080"
                className="mb-2 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono-data text-[12px]"
              />

              <label className="mb-1 block text-[10.5px] font-semibold text-slate-500">Código de Activo</label>
              <input
                type="text"
                value={form.activoPc || ""}
                onChange={(e) => updateField({ activoPc: e.target.value })}
                placeholder="Ej. PC-1045"
                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono-data text-[12px]"
              />
            </div>

            {/* Monitor & Peripherals */}
            <div className="rounded-2xl border border-slate-200 p-3.5 bg-slate-50/70">
              <p className="mb-2.5 flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wider text-[#0095FF]">
                <Monitor size={14} /> Monitor & Periféricos
              </p>
              <label className="mb-1 block text-[10.5px] font-semibold text-slate-500">Marca Monitor</label>
              <select
                value={form.monitor?.marca || ""}
                onChange={(e) =>
                  updateField({
                    monitor: e.target.value
                      ? { ...(form.monitor || {}), marca: e.target.value }
                      : null,
                  })
                }
                className="mb-2 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-medium"
              >
                <option value="">— Sin monitor —</option>
                {MARCAS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <label className="mb-1 block text-[10.5px] font-semibold text-slate-500">Activo Monitor</label>
              <input
                type="text"
                value={form.monitor?.activo || ""}
                onChange={(e) =>
                  updateField({
                    monitor: form.monitor
                      ? { ...form.monitor, activo: e.target.value }
                      : { marca: "DELL", activo: e.target.value },
                  })
                }
                placeholder="Ej. MON-2045"
                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono-data text-[12px]"
              />

              <p className="mb-1.5 mt-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Accesorios
              </p>
              <div className="flex flex-wrap gap-2.5">
                {[
                  ["mouse", Mouse, "Mouse"],
                  ["headset", Headphones, "Headset"],
                  ["hub", Cable, "Hub USB"],
                ].map(([key, Icon, label]) => (
                  <label key={key} className="flex cursor-pointer items-center gap-1 text-[11.5px] font-medium text-slate-700 select-none">
                    <input
                      type="checkbox"
                      checked={!!form[key]}
                      onChange={(e) => updateField({ [key]: e.target.checked })}
                      className="accent-[#0048B5] rounded"
                    />
                    <Icon size={12} className="text-slate-500" /> {label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Observations & Ubicación Anterior */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Observaciones / Registro de Incidencia
              </p>
              {form.ubicacionAnterior && (
                <span className="text-[10.5px] font-semibold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                  Ubicación Anterior: Puesto #{form.ubicacionAnterior}
                </span>
              )}
            </div>
            <textarea
              value={form.observaciones || ""}
              onChange={(e) => updateField({ observaciones: e.target.value })}
              rows={2}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12.5px] outline-none focus:ring-2 focus:ring-[#0095FF]/50"
              placeholder="Detalles sobre el cubículo, necesidad de repuestos, etc..."
            />
          </div>

          {/* Space History */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
            <p className="mb-2 flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wider text-slate-600">
              <History size={13} className="text-[#0048B5]" /> Bitácora Reciente de este Puesto
            </p>
            <ul className="space-y-1.5">
              {spaceHistory.map((h, i) => (
                <li key={i} className="flex items-center gap-2 text-[11.5px] text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0095FF]" />
                  <span className="font-mono-data text-slate-400">{h.fecha}</span> — {h.accion} de {h.equipo} ({h.obs || h.falla})
                </li>
              ))}
              {spaceHistory.length === 0 && (
                <li className="text-[11.5px] italic text-slate-400">Sin movimientos registrados recientemente.</li>
              )}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-xl px-5 py-2 text-[12.5px] font-semibold text-white transition hover:brightness-110 shadow-sm"
              style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
            >
              <Save size={14} /> Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
