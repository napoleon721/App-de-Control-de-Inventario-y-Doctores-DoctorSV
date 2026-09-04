import React, { useState, useMemo } from "react";
import {
  Shield, UserCheck, Stethoscope, Lock, KeyRound, Search, Check,
  ChevronRight, ArrowRight, Laptop, Clock, AlertCircle, Eye, EyeOff, Sparkles
} from "lucide-react";
import DoctorSVLogo from "../common/DoctorSVLogo";
import { DOCTORES_EXCEL, HORARIOS } from "../../constants/tokens";

export default function AuthPortal({ onLoginMaster, onLoginDoctor, onClose, isModal = false }) {
  const [activeTab, setActiveTab] = useState("doctor"); // 'doctor' | 'master'

  // Master State
  const [masterPin, setMasterPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [masterError, setMasterError] = useState("");

  // Doctor State
  const [searchDoctor, setSearchDoctor] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [doctorJvpm, setDoctorJvpm] = useState("");
  const [selectedHorario, setSelectedHorario] = useState(HORARIOS[1] || "07:00 AM – 12:00 PM");
  const [doctorError, setDoctorError] = useState("");

  // Padrón filtration
  const filteredDoctors = useMemo(() => {
    if (!searchDoctor.trim()) return DOCTORES_EXCEL.slice(0, 8);
    const q = searchDoctor.toLowerCase();
    return DOCTORES_EXCEL.filter((d) =>
      d.nombre.toLowerCase().includes(q) ||
      String(d.id).includes(q)
    ).slice(0, 12);
  }, [searchDoctor]);

  function handleSelectDoctorFromList(doc) {
    setSelectedDoctor(doc.nombre);
    setSearchDoctor(doc.nombre);
    if (doc.horario && doc.horario !== "Turno Rotativo") {
      setSelectedHorario(doc.horario);
    }
    setDoctorJvpm(`JVPM-${doc.id}`);
    setDoctorError("");
  }

  function handleMasterSubmit(e) {
    e.preventDefault();
    const cleanPin = masterPin.trim();
    // Default PINs: 2026, master2026, admin, 1234
    if (["2026", "master2026", "admin", "1234", "doctorsv"].includes(cleanPin.toLowerCase())) {
      setMasterError("");
      onLoginMaster();
    } else {
      setMasterError("PIN o Contraseña incorrecta. (Prueba con: 2026 o master2026)");
    }
  }

  function handleDoctorSubmit(e) {
    e.preventDefault();
    const docName = (selectedDoctor || searchDoctor).trim();
    if (!docName) {
      setDoctorError("Por favor selecciona o escribe tu nombre para ingresar.");
      return;
    }
    setDoctorError("");
    onLoginDoctor({
      name: docName,
      shift: selectedHorario,
      jvpm: doctorJvpm || "General",
      role: "DOCTOR",
      spaceId: null,
      loginTime: new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" }),
    });
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-3 sm:p-5 backdrop-blur-md overflow-y-auto ${isModal ? "animate-fadeIn" : ""}`}>
      <div
        style={{ animation: "popIn .25s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200/90 my-auto"
      >
        {/* Banner Superior Institucional */}
        <div
          className="px-6 py-5 text-white relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #002868 0%, #0048B5 55%, #0095FF 100%)" }}
        >
          {/* Subtle decorative circles */}
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
          <div className="pointer-events-none absolute left-1/3 -bottom-10 h-28 w-28 rounded-full bg-cyan-400/15 blur-lg" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 p-2 backdrop-blur-md ring-1 ring-white/30 shadow-inner">
                <DoctorSVLogo className="h-6 w-auto" />
              </div>
              <div>
                <h1 className="font-heading text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                  Portal de Acceso <span className="text-cyan-300">DoctorSV</span>
                </h1>
                <p className="text-[11.5px] text-blue-100 font-medium">
                  Sede San Miguel · Control de Puestos & Telemedicina
                </p>
              </div>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Selector de Rol / Modo */}
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-black/20 p-1 backdrop-blur-md border border-white/10">
            <button
              type="button"
              onClick={() => {
                setActiveTab("doctor");
                setMasterError("");
              }}
              className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-[12.5px] font-bold transition-all ${
                activeTab === "doctor"
                  ? "bg-white text-[#0048B5] shadow-md"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Stethoscope size={15} />
              <span>Doctor Operativo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("master");
                setDoctorError("");
              }}
              className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-[12.5px] font-bold transition-all ${
                activeTab === "master"
                  ? "bg-white text-[#0048B5] shadow-md"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Shield size={15} />
              <span>Doctor Master</span>
            </button>
          </div>
        </div>

        {/* CONTENIDO SEGÚN ROL */}
        <div className="p-6">
          {/* TAB 1: DOCTOR OPERATIVO */}
          {activeTab === "doctor" && (
            <form onSubmit={handleDoctorSubmit} className="space-y-4">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 text-[12px] text-slate-600 flex items-start gap-2.5">
                <Sparkles size={16} className="text-[#0095FF] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[#0048B5]">Ingreso a Estación de Trabajo</p>
                  <p className="text-[11.5px] text-slate-500 mt-0.5 leading-snug">
                    Ingresa tus datos para ver el <strong>Mapa de Ubicaciones</strong>, reclamar tu cubículo/PC disponible y liberarlo automáticamente al finalizar tu jornada.
                  </p>
                </div>
              </div>

              {doctorError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-[12px] font-semibold text-rose-700">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{doctorError}</span>
                </div>
              )}

              {/* Doctor Name Picker */}
              <div>
                <label className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <span>1. Nombre del Médico</span>
                  {selectedDoctor && (
                    <span className="text-emerald-600 text-[10.5px] font-bold flex items-center gap-0.5">
                      <Check size={12} /> Confirmado
                    </span>
                  )}
                </label>
                <div className="relative">
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 shadow-2xs focus-within:ring-2 focus-within:ring-[#0095FF]/40 focus-within:bg-white transition-all">
                    <Search size={15} className="text-slate-400" />
                    <input
                      value={searchDoctor}
                      onChange={(e) => {
                        setSearchDoctor(e.target.value);
                        setSelectedDoctor(e.target.value);
                      }}
                      placeholder="Busca tus nombres o apellidos en el padrón..."
                      className="w-full bg-transparent text-[13px] font-medium text-slate-800 outline-none placeholder:text-slate-400"
                      required
                    />
                  </div>

                  {/* Dropdown Suggestions */}
                  {searchDoctor && searchDoctor !== selectedDoctor && (
                    <div className="absolute top-12 inset-x-0 z-30 max-h-48 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl divide-y divide-slate-100">
                      {filteredDoctors.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => handleSelectDoctorFromList(doc)}
                          className="w-full text-left px-3.5 py-2.5 text-[12px] hover:bg-blue-50/90 transition-colors flex items-center justify-between group"
                        >
                          <div>
                            <span className="font-semibold text-slate-800 group-hover:text-[#0048B5]">
                              {doc.nombre}
                            </span>
                            {doc.horario && (
                              <p className="text-[10.5px] text-slate-400">{doc.horario}</p>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono-data">#{doc.id}</span>
                        </button>
                      ))}
                      {filteredDoctors.length === 0 && (
                        <div className="p-3 text-[11.5px] text-slate-400 text-center italic">
                          No encontrado en padrón oficial. Puedes presionar ingresar con el nombre escrito.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Turno / Franja Horaria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    2. Turno / Horario
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-[12.5px] shadow-2xs">
                    <Clock size={15} className="text-[#0048B5]" />
                    <select
                      value={selectedHorario}
                      onChange={(e) => setSelectedHorario(e.target.value)}
                      className="w-full bg-transparent font-medium text-slate-800 outline-none cursor-pointer"
                    >
                      {HORARIOS.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    3. JVPM / Código (Opcional)
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-[12.5px] shadow-2xs">
                    <Laptop size={15} className="text-slate-400" />
                    <input
                      value={doctorJvpm}
                      onChange={(e) => setDoctorJvpm(e.target.value)}
                      placeholder="Ej. JVPM-14520"
                      className="w-full bg-transparent font-medium text-slate-800 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-[13.5px] font-bold text-white shadow-md hover:brightness-110 active:scale-[0.99] transition-all"
                  style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
                >
                  <Laptop size={16} />
                  <span>Ingresar al Mapa & Elegir Puesto de Trabajo</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: DOCTOR MASTER */}
          {activeTab === "master" && (
            <form onSubmit={handleMasterSubmit} className="space-y-4">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3.5 text-[12px] text-slate-600 flex items-start gap-2.5">
                <Shield size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-indigo-950">Acceso Master · Control Total de la Sede</p>
                  <p className="text-[11.5px] text-slate-500 mt-0.5 leading-snug">
                    Ingresa con tu clave de supervisor para supervisar los 140 puestos, auditoría de relevos, inventario de bodega y padrón completo de médicos.
                  </p>
                </div>
              </div>

              {masterError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-[12px] font-semibold text-rose-700">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{masterError}</span>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  PIN o Clave de Acceso Master
                </label>
                <div className="relative flex items-center rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 shadow-2xs focus-within:ring-2 focus-within:ring-indigo-500/40 focus-within:bg-white transition-all">
                  <KeyRound size={16} className="text-indigo-600 mr-2 shrink-0" />
                  <input
                    type={showPin ? "text" : "password"}
                    value={masterPin}
                    onChange={(e) => setMasterPin(e.target.value)}
                    placeholder="Ingresa PIN maestro (ej: 2026)"
                    required
                    className="w-full bg-transparent text-[14px] font-bold text-slate-800 outline-none placeholder:text-slate-400 placeholder:font-normal"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="text-slate-400 hover:text-slate-600 ml-2"
                  >
                    {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 pl-1">
                  💡 Clave predeterminada para el sistema: <strong className="text-indigo-600">2026</strong> o <strong className="text-indigo-600">master2026</strong>
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-[13.5px] font-bold text-white shadow-md hover:brightness-110 active:scale-[0.99] transition-all"
                  style={{ background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)" }}
                >
                  <Lock size={16} />
                  <span>Entrar como Doctor Master (Control Total)</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-3 flex items-center justify-between text-[11px] text-slate-400">
          <span>DoctorSV v2.5 · Telemedicina</span>
          <span className="font-semibold text-slate-500">Sede San Miguel</span>
        </div>
      </div>
    </div>
  );
}
