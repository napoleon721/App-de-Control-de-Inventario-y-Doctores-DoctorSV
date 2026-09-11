import React, { useState } from "react";
import { X, UserPlus, Check, AlertCircle } from "lucide-react";
import { HORARIOS } from "../../constants/tokens";

const CATEGORIAS = [
  { key: "Planilla", label: "Planilla", color: "#0048B5", soft: "#EFF6FF" },
  { key: "Servicios Profesionales", label: "Servicios Prof.", color: "#15803D", soft: "#DCFCE7" },
  { key: "Administrativos", label: "Administrativos", color: "#7C3AED", soft: "#F3E8FF" },
  { key: "Supervisores", label: "Supervisores", color: "#0284C7", soft: "#E0F2FE" },
];

const ROLES_POR_CATEGORIA = {
  Planilla: ["Médico Planilla", "Médico General", "Especialista"],
  "Servicios Profesionales": ["Servicios Profesionales", "Médico Consultor", "Especialista Externo"],
  Administrativos: ["Administrativo", "Coordinador", "Jefe de Área", "Asistente Administrativo"],
  Supervisores: ["Supervisor Médico", "Supervisor de Control & Acceso", "Coordinador General de Sede"],
};

export default function AddStaffModal({ onClose, onAdd, initialCategory = "Planilla" }) {
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState(initialCategory);
  const [rol, setRol] = useState(ROLES_POR_CATEGORIA[initialCategory][0]);
  const [horario, setHorario] = useState(HORARIOS[1]);
  const [error, setError] = useState("");

  function handleCategoriaChange(cat) {
    setCategoria(cat);
    setRol(ROLES_POR_CATEGORIA[cat][0]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const clean = nombre.trim().toUpperCase();
    if (!clean || clean.length < 3) {
      setError("El nombre debe tener al menos 3 caracteres.");
      return;
    }
    setError("");
    onAdd({
      id: `CUST-${Date.now()}`,
      nombre: clean,
      categoria,
      rol,
      horarioDefault: horario,
      puestoOficial: null,
      isCustom: true,
    });
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
        <div
          className="flex items-center justify-between px-6 py-4 text-white"
          style={{ background: "linear-gradient(135deg, #003487 0%, #0048B5 60%, #0095FF 100%)" }}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-md">
              <UserPlus size={17} />
            </span>
            <div>
              <p className="font-heading text-[16px] font-bold">Agregar Personal al Padrón</p>
              <p className="text-[11.5px] text-white/80">Sede San Miguel · DoctorSV</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-[12px] font-semibold text-rose-700">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Nombre Completo
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. JUAN CARLOS PÉREZ MARTÍNEZ"
              autoFocus
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#0095FF]/40 focus:bg-white transition-all placeholder:font-normal placeholder:text-slate-400"
            />
            <p className="mt-1 text-[10.5px] text-slate-400">Se guardará en mayúsculas para coincidir con el padrón.</p>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Categoría / Padrón
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIAS.map((cat) => {
                const isSelected = categoria === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => handleCategoriaChange(cat.key)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-[12px] font-bold transition-all ${
                      isSelected ? "ring-2" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                    style={isSelected ? { borderColor: cat.color, background: cat.soft, color: cat.color } : {}}
                  >
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-extrabold text-white"
                      style={{ background: isSelected ? cat.color : "#CBD5E1" }}
                    >
                      {isSelected ? <Check size={11} /> : cat.label[0]}
                    </span>
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Rol / Cargo
            </label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[12.5px] font-medium outline-none focus:ring-2 focus:ring-[#0095FF]/40"
            >
              {ROLES_POR_CATEGORIA[categoria].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Horario por Defecto
            </label>
            <select
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[12.5px] font-medium outline-none focus:ring-2 focus:ring-[#0095FF]/40"
            >
              {HORARIOS.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl px-5 py-2 text-[12.5px] font-bold text-white transition hover:brightness-110 shadow-sm"
              style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
            >
              <UserPlus size={14} />
              Agregar al Padrón
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
