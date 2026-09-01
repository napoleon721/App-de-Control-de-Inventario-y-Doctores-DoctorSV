import React, { useState, useMemo } from "react";
import {
  X, CheckCircle2, User, Search, MapPin, Laptop, Clock, Sparkles, Check
} from "lucide-react";
import { DOCTORES_EXCEL, HORARIOS, BRAND } from "../../constants/tokens";

export default function QuickCheckInModal({ spaces, onClose, onConfirmCheckIn }) {
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [searchDoctor, setSearchDoctor] = useState("");
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [selectedHorario, setSelectedHorario] = useState(HORARIOS[1] || "07:00 AM – 12:00 PM");
  const [successData, setSuccessData] = useState(null);

  // Doctors list filtered
  const filteredDoctors = useMemo(() => {
    if (!searchDoctor.trim()) return DOCTORES_EXCEL.slice(0, 10);
    return DOCTORES_EXCEL.filter((d) =>
      d.nombre.toLowerCase().includes(searchDoctor.toLowerCase()) ||
      String(d.id).includes(searchDoctor)
    ).slice(0, 15);
  }, [searchDoctor]);

  // Selected space details
  const targetSpace = useMemo(() => {
    if (!selectedSpaceId) return null;
    return spaces.find((s) => s.id === Number(selectedSpaceId));
  }, [spaces, selectedSpaceId]);

  function handleDoctorSelect(doc) {
    setSelectedDoctor(doc.nombre);
    setSearchDoctor(doc.nombre);
    if (doc.horario && doc.horario !== "Turno Rotativo") {
      setSelectedHorario(doc.horario);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!selectedDoctor.trim()) {
      alert("Por favor selecciona tu nombre de la lista de médicos.");
      return;
    }
    if (!selectedSpaceId) {
      alert("Por favor ingresa o selecciona el número de puesto donde te sentaste.");
      return;
    }

    const spaceNum = Number(selectedSpaceId);
    if (spaceNum < 1 || spaceNum > 140) {
      alert("El número de puesto debe estar entre 1 y 140.");
      return;
    }

    onConfirmCheckIn({
      doctor: selectedDoctor.trim(),
      spaceId: spaceNum,
      horario: selectedHorario,
      timestamp: new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" }),
    });

    setSuccessData({
      doctor: selectedDoctor.trim(),
      spaceId: spaceNum,
      horario: selectedHorario,
      time: new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" }),
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "popIn .2s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200"
      >
        {/* Header DoctorSV */}
        <div
          className="flex items-center justify-between px-6 py-4 text-white"
          style={{ background: "linear-gradient(135deg, #003487 0%, #0048B5 60%, #0095FF 100%)" }}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-md shadow-inner">
              <CheckCircle2 size={20} />
            </span>
            <div>
              <p className="font-heading text-[16px] font-bold">Auto Check-In de Médico</p>
              <p className="text-[11.5px] text-white/80">
                Registra tu asistencia y mapea tu puesto en tiempo real
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25"
          >
            <X size={16} />
          </button>
        </div>

        {/* Success View */}
        {successData ? (
          <div className="p-8 text-center flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm animate-bounce">
              <Check size={32} />
            </div>
            <div>
              <h3 className="font-heading text-xl font-bold text-slate-800">
                ¡Check-In Confirmado con Éxito!
              </h3>
              <p className="text-[13px] text-slate-500 mt-1">
                Tu asistencia ha sido registrada y tu puesto está activo en el mapa general.
              </p>
            </div>

            <div className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Médico</span>
                <span className="text-[13px] font-bold text-slate-800">{successData.doctor}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Puesto Asignado</span>
                <span className="font-mono-data text-[14px] font-extrabold text-[#0048B5]">
                  Puesto #{successData.spaceId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Turno & Hora</span>
                <span className="text-[12px] font-medium text-slate-600">
                  {successData.horario} ({successData.time})
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="mt-2 w-full rounded-xl py-2.5 text-[13px] font-bold text-white shadow-md hover:brightness-110 transition-all"
              style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
            >
              Cerrar y Ver Mapa
            </button>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Step 1: Doctor Name */}
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                <span>1. Escribe tu Nombre o Selecciona</span>
                {selectedDoctor && (
                  <span className="text-emerald-600 text-[10.5px] font-bold flex items-center gap-0.5">
                    <Check size={11} /> Seleccionado
                  </span>
                )}
              </label>
              <div className="relative">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-2xs focus-within:ring-2 focus-within:ring-[#0095FF]/40">
                  <Search size={14} className="text-slate-400" />
                  <input
                    value={searchDoctor}
                    onChange={(e) => {
                      setSearchDoctor(e.target.value);
                      setSelectedDoctor(e.target.value);
                    }}
                    placeholder="Escribe tus nombres o apellidos..."
                    className="w-full bg-transparent text-[13px] font-medium outline-none placeholder:text-slate-400"
                    required
                  />
                </div>

                {/* Suggestions List */}
                {searchDoctor && searchDoctor !== selectedDoctor && (
                  <div className="absolute top-11 inset-x-0 z-20 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl divide-y divide-slate-100">
                    {filteredDoctors.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => handleDoctorSelect(doc)}
                        className="w-full text-left px-3 py-2 text-[12px] hover:bg-blue-50 transition-colors flex items-center justify-between"
                      >
                        <span className="font-semibold text-slate-800">{doc.nombre}</span>
                        <span className="text-[10px] text-slate-400 font-mono-data">#{doc.id}</span>
                      </button>
                    ))}
                    {filteredDoctors.length === 0 && (
                      <div className="p-3 text-[12px] text-slate-400 text-center italic">
                        No se encontró en el padrón. Puedes escribirlo manualmente.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Cubicle Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  2. Número de Puesto
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-2xs focus-within:ring-2 focus-within:ring-[#0095FF]/40">
                  <MapPin size={15} className="text-[#0048B5]" />
                  <input
                    type="number"
                    min="1"
                    max="140"
                    value={selectedSpaceId}
                    onChange={(e) => setSelectedSpaceId(e.target.value)}
                    placeholder="Ej. 42"
                    required
                    className="w-full bg-transparent text-[14px] font-extrabold font-mono-data text-slate-800 outline-none placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  3. Turno de Atención
                </label>
                <select
                  value={selectedHorario}
                  onChange={(e) => setSelectedHorario(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-medium shadow-2xs"
                >
                  {HORARIOS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target Space Live Preview */}
            {targetSpace && (
              <div className={`p-3 rounded-2xl border text-[12px] flex items-center justify-between ${
                targetSpace.estado === "OCUPADO"
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-emerald-50 border-emerald-200 text-emerald-900"
              }`}>
                <div className="flex items-center gap-2">
                  <Laptop size={15} />
                  <div>
                    <p className="font-bold">
                      Puesto #{targetSpace.id} · {targetSpace.marca || "Sin PC"} ({targetSpace.estado})
                    </p>
                    {targetSpace.doctor && (
                      <p className="text-[11px] opacity-80">
                        Actualmente ocupado por: {targetSpace.doctor}
                      </p>
                    )}
                  </div>
                </div>
                <span className="font-bold text-[11px] uppercase tracking-wider">
                  {targetSpace.estado === "DISPONIBLE" ? "✅ Libre" : "⚠️ Reemplazará"}
                </span>
              </div>
            )}

            {/* Submit Action */}
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
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold text-white transition hover:brightness-110 shadow-md active:scale-95"
                style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
              >
                <CheckCircle2 size={16} />
                <span>Confirmar Mi Asistencia & Puesto</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
