import React, { useState, useMemo } from "react";
import {
  Shield, Stethoscope, Lock, KeyRound, Search, Check,
  ChevronRight, ArrowRight, Laptop, Clock, AlertCircle, Eye, EyeOff,
  Sparkles, User, Sun, Sunset, Moon, RefreshCw, X
} from "lucide-react";
import logoPng from "../../assets/doctorsv_logo.png";
import { DOCTORES_EXCEL, HORARIOS } from "../../constants/tokens";

export default function AuthPortal({ onLoginMaster, onLoginDoctor, onClose, isModal = false }) {
  const [activeTab, setActiveTab] = useState("doctor"); // 'doctor' | 'master'

  // Master State
  const [masterPin, setMasterPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [masterError, setMasterError] = useState("");

  // Doctor State
  const [searchDoctor, setSearchDoctor] = useState("");
  const [selectedDoctorObj, setSelectedDoctorObj] = useState(null);
  const [manualDoctorName, setManualDoctorName] = useState("");
  const [selectedHorario, setSelectedHorario] = useState(HORARIOS[1] || "07:00 AM – 12:00 PM");
  const [doctorError, setDoctorError] = useState("");

  // Padrón filtration
  const filteredDoctors = useMemo(() => {
    if (!searchDoctor.trim()) return DOCTORES_EXCEL.slice(0, 10);
    const q = searchDoctor.toLowerCase().trim();
    return DOCTORES_EXCEL.filter((d) =>
      d.nombre.toLowerCase().includes(q) ||
      String(d.id).includes(q)
    ).slice(0, 15);
  }, [searchDoctor]);

  function handleSelectDoctor(doc) {
    setSelectedDoctorObj(doc);
    setManualDoctorName("");
    setSearchDoctor("");
    if (doc.horario && doc.horario !== "Turno Rotativo") {
      setSelectedHorario(doc.horario);
    }
    setDoctorError("");
  }

  function handleClearSelectedDoctor() {
    setSelectedDoctorObj(null);
    setManualDoctorName("");
    setSearchDoctor("");
  }

  function handleMasterSubmit(e) {
    e.preventDefault();
    const cleanPin = masterPin.trim();
    if (["2026", "master2026", "admin", "1234", "doctorsv"].includes(cleanPin.toLowerCase())) {
      setMasterError("");
      onLoginMaster();
    } else {
      setMasterError("PIN o Contraseña incorrecta. (Prueba con: 2026 o master2026)");
    }
  }

  function handleDoctorSubmit(e) {
    e.preventDefault();
    const docName = (selectedDoctorObj ? selectedDoctorObj.nombre : manualDoctorName).trim();
    if (!docName) {
      setDoctorError("Por favor selecciona tu nombre del padrón o escríbelo para ingresar.");
      return;
    }
    setDoctorError("");
    onLoginDoctor({
      name: docName,
      shift: selectedHorario,
      jvpm: selectedDoctorObj ? `JVPM-${selectedDoctorObj.id}` : "General",
      role: "DOCTOR",
      spaceId: null,
      loginTime: new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" }),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-5 backdrop-blur-md overflow-y-auto">
      <div
        style={{ animation: "popIn .25s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200/90 my-auto flex flex-col max-h-[92vh]"
      >
        {/* ================= HEADER INSTITUCIONAL PREMIUM ================= */}
        <div className="relative bg-gradient-to-br from-[#00246B] via-[#0048B5] to-[#0095FF] px-6 pt-6 pb-5 text-white overflow-hidden shrink-0">
          {/* Decorative ambient light blur */}
          <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-cyan-300/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 left-10 h-32 w-32 rounded-full bg-blue-400/20 blur-xl" />

          <div className="relative flex items-center justify-between gap-3 mb-4">
            {/* Logo Badge in clean white capsule */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center rounded-2xl bg-white px-3.5 py-1.5 shadow-md">
                <img src={logoPng} alt="DoctorSV" className="h-6 w-auto object-contain" />
              </div>
              <div>
                <h2 className="font-heading text-lg sm:text-xl font-extrabold tracking-tight text-white leading-tight">
                  Portal de Acceso
                </h2>
                <p className="text-[11.5px] text-cyan-100 font-medium leading-none mt-0.5">
                  Telemedicina · Sede San Miguel
                </p>
              </div>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-all text-sm font-bold"
                title="Cerrar ventana"
              >
                ✕
              </button>
            )}
          </div>

          {/* Role Segmented Cards */}
          <div className="grid grid-cols-2 gap-2.5 p-1 rounded-2xl bg-black/25 backdrop-blur-md border border-white/15">
            <button
              type="button"
              onClick={() => {
                setActiveTab("doctor");
                setMasterError("");
              }}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-[12.5px] font-bold transition-all ${
                activeTab === "doctor"
                  ? "bg-white text-[#0048B5] shadow-md ring-1 ring-white/60 scale-[1.01]"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Stethoscope size={16} className={activeTab === "doctor" ? "text-[#0095FF]" : ""} />
              <span className="truncate">Doctor de Guardia</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("master");
                setDoctorError("");
              }}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-[12.5px] font-bold transition-all ${
                activeTab === "master"
                  ? "bg-white text-[#1E1B4B] shadow-md ring-1 ring-white/60 scale-[1.01]"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Shield size={16} className={activeTab === "master" ? "text-indigo-600" : ""} />
              <span className="truncate">Doctor Master</span>
            </button>
          </div>
        </div>

        {/* ================= CONTENIDO FORMULARIO ================= */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* ================= MODO DOCTOR DE GUARDIA ================= */}
          {activeTab === "doctor" && (
            <form onSubmit={handleDoctorSubmit} className="space-y-4">
              {/* Guidance pill */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3.5 text-[12px] flex items-start gap-2.5 text-slate-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#0048B5] text-white">
                  <Sparkles size={14} />
                </span>
                <div>
                  <p className="font-bold text-[#0048B5]">Ingreso a Estación de Trabajo</p>
                  <p className="text-[11.5px] text-slate-500 mt-0.5 leading-snug">
                    Selecciona tus datos para ingresar al plano interactivo, ocupar tu cubículo con 1 clic y liberarlo al finalizar tu jornada.
                  </p>
                </div>
              </div>

              {doctorError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-[12px] font-semibold text-rose-700 animate-shake">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{doctorError}</span>
                </div>
              )}

              {/* Paso 1: Selección o ingreso de Médico */}
              <div>
                <label className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <span>1. Médico de Turno</span>
                  {selectedDoctorObj ? (
                    <span className="text-emerald-600 text-[10.5px] font-bold flex items-center gap-1">
                      <Check size={12} /> Verificado en Padrón
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[10.5px] font-medium">194 registrados</span>
                  )}
                </label>

                {/* Si ya seleccionó un doctor: Tarjeta elegante de confirmación */}
                {selectedDoctorObj ? (
                  <div className="flex items-center justify-between p-3 rounded-2xl border-2 border-emerald-500/80 bg-emerald-50/60 shadow-xs transition-all">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-heading font-extrabold text-[14px] shadow-2xs">
                        {selectedDoctorObj.nombre.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-heading font-bold text-[13.5px] text-slate-900 leading-tight">
                          {selectedDoctorObj.nombre}
                        </p>
                        <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                          Padrón Oficial #{selectedDoctorObj.id} · {selectedDoctorObj.horario || "Turno Activo"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearSelectedDoctor}
                      className="text-[11.5px] font-bold text-slate-500 hover:text-rose-600 bg-white hover:bg-rose-50 px-2.5 py-1 rounded-xl border border-slate-200 transition-colors shadow-2xs"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  /* Campo de búsqueda con autocompletado y opción manual */
                  <div className="space-y-2">
                    <div className="relative">
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 shadow-2xs focus-within:ring-2 focus-within:ring-[#0095FF] focus-within:bg-white transition-all">
                        <Search size={16} className="text-slate-400 shrink-0" />
                        <input
                          value={searchDoctor}
                          onChange={(e) => {
                            setSearchDoctor(e.target.value);
                            setManualDoctorName(e.target.value);
                          }}
                          placeholder="Escribe tus nombres o apellidos para buscar..."
                          className="w-full bg-transparent text-[13px] font-medium text-slate-800 outline-none placeholder:text-slate-400"
                          autoFocus
                        />
                        {searchDoctor && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchDoctor("");
                              setManualDoctorName("");
                            }}
                            className="text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Lista desplegable de doctores filtrados */}
                    <div className="max-h-44 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-md divide-y divide-slate-100">
                      {filteredDoctors.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => handleSelectDoctor(doc)}
                          className="w-full text-left px-3.5 py-2 text-[12px] hover:bg-blue-50/80 transition-colors flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-[#0048B5] text-[10px] font-bold">
                              {doc.nombre.slice(0, 1)}
                            </span>
                            <span className="font-semibold text-slate-800 group-hover:text-[#0048B5]">
                              {doc.nombre}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono-data text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded-md">
                            #{doc.id}
                          </span>
                        </button>
                      ))}

                      {filteredDoctors.length === 0 && (
                        <div className="p-3 text-center text-[12px] text-slate-500">
                          <p>No se encontró en el padrón.</p>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDoctorObj({ nombre: manualDoctorName, id: "EXT" });
                            }}
                            className="mt-1 text-[11.5px] font-bold text-[#0048B5] hover:underline"
                          >
                            Usar "{manualDoctorName}" como médico externo
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Paso 2: Turno / Horario */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  2. Horario / Franja de Atención
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {HORARIOS.slice(0, 4).map((h) => {
                    const isSelected = selectedHorario === h;
                    const isMorning = h.includes("AM") && !h.includes("MD");
                    const isAfternoon = h.includes("MD") || (h.includes("PM") && !h.includes("10:00"));
                    const Icon = isMorning ? Sun : isAfternoon ? Sunset : Moon;

                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setSelectedHorario(h)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-[12px] font-medium transition-all text-left ${
                          isSelected
                            ? "border-[#0048B5] bg-blue-50/90 text-[#0048B5] font-bold ring-1 ring-[#0048B5]"
                            : "border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100/80"
                        }`}
                      >
                        <Icon size={15} className={isSelected ? "text-[#0095FF]" : "text-slate-400"} />
                        <span className="truncate">{h}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botón Principal de Entrada al Mapa */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2.5 rounded-2xl py-3.5 text-[14px] font-bold text-white shadow-lg hover:brightness-110 active:scale-[0.99] transition-all"
                  style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
                >
                  <Laptop size={17} />
                  <span>Ingresar al Mapa & Elegir Mi Puesto</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {/* ================= MODO DOCTOR MASTER ================= */}
          {activeTab === "master" && (
            <form onSubmit={handleMasterSubmit} className="space-y-4">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3.5 text-[12px] flex items-start gap-2.5 text-slate-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-900 text-white">
                  <Shield size={14} />
                </span>
                <div>
                  <p className="font-bold text-indigo-950">Acceso Master · Control Total de la Sede</p>
                  <p className="text-[11.5px] text-slate-500 mt-0.5 leading-snug">
                    Permite supervisar los 140 puestos, auditoría de relevos, inventario de bodega y padrón de médicos.
                  </p>
                </div>
              </div>

              {masterError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-[12px] font-semibold text-rose-700">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{masterError}</span>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  PIN o Clave de Acceso Master
                </label>
                <div className="relative flex items-center rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-3 shadow-2xs focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                  <KeyRound size={17} className="text-indigo-600 mr-2 shrink-0" />
                  <input
                    type={showPin ? "text" : "password"}
                    value={masterPin}
                    onChange={(e) => setMasterPin(e.target.value)}
                    placeholder="Ingresa PIN maestro (ej: 2026)"
                    required
                    className="w-full bg-transparent text-[14.5px] font-bold text-slate-900 outline-none placeholder:text-slate-400 placeholder:font-normal"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="text-slate-400 hover:text-slate-600 ml-2 p-1"
                  >
                    {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Quick test PIN pill */}
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Clave predeterminada: <strong className="text-indigo-600">2026</strong></span>
                  <button
                    type="button"
                    onClick={() => setMasterPin("2026")}
                    className="font-bold text-indigo-600 hover:underline bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100"
                  >
                    Autocompletar "2026"
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[14px] font-bold text-white shadow-lg hover:brightness-110 active:scale-[0.99] transition-all"
                  style={{ background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)" }}
                >
                  <Lock size={16} />
                  <span>Entrar como Doctor Master</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-3 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span>DoctorSV Telemedicina · v2.5</span>
          <span className="font-semibold text-slate-500">Sede San Miguel</span>
        </div>
      </div>
    </div>
  );
}
