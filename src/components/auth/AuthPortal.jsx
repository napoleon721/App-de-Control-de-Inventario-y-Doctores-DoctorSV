import React, { useState, useMemo } from "react";
import {
  Shield, Stethoscope, Lock, KeyRound, Search, Check,
  ChevronRight, ArrowRight, Laptop, Clock, AlertCircle, Eye, EyeOff,
  Sparkles, User, Sun, Sunset, Moon, RefreshCw, X, UserCheck
} from "lucide-react";
import logoPng from "../../assets/doctorsv_logo.png";
import { DOCTORES_EXCEL, HORARIOS, SUPERVISORES_OFICIALES } from "../../constants/tokens";
import { loginWithGoogle } from "../../services/firebaseAuth";

export default function AuthPortal({
  onLoginMaster,
  onLoginDoctor,
  onLoginSupervisor,
  onClose,
  isModal = false,
  horarios = HORARIOS,
}) {
  const [activeTab, setActiveTab] = useState("doctor"); // 'doctor' | 'supervisor' | 'master'

  // Google Login State
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Master State
  const [masterPin, setMasterPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [masterError, setMasterError] = useState("");

  // Supervisor State
  const [selectedSupId, setSelectedSupId] = useState(SUPERVISORES_OFICIALES[0]?.id || "sup-1");
  const [supervisorPin, setSupervisorPin] = useState("");
  const [showSupPin, setShowSupPin] = useState(false);
  const [supervisorError, setSupervisorError] = useState("");

  // Doctor State
  const [searchDoctor, setSearchDoctor] = useState("");
  const [selectedDoctorObj, setSelectedDoctorObj] = useState(null);
  const [manualDoctorName, setManualDoctorName] = useState("");
  const [selectedHorario, setSelectedHorario] = useState(
    (horarios && horarios[0]) || "07:00 AM – 12:00 PM"
  );
  const [doctorError, setDoctorError] = useState("");
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);

  // Google Login Handler
  async function handleGoogleDoctorLogin() {
    setIsGoogleLoading(true);
    setDoctorError("");
    try {
      const res = await loginWithGoogle();
      if (!res.success) {
        if (res.error === "auth/popup-closed-by-user") {
          setDoctorError("Acceso cancelado: Se cerró la ventana de Google.");
        } else if (res.error === "auth/configuration-not-found" || String(res.error).includes("configuration-not-found")) {
          setDoctorError("Google Auth aún no está activado en Firebase Console. Puedes ingresar seleccionando tu nombre abajo.");
        } else {
          setDoctorError(`Error al conectar con Google: ${res.error}`);
        }
        setIsGoogleLoading(false);
        return;
      }

      const user = res.user;
      const email = user.email || "";
      const displayName = user.displayName || email.split("@")[0];

      // Verificación de dominio institucional si está configurado en .env
      const allowedDomain = import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN || "";
      if (allowedDomain && !email.toLowerCase().includes(allowedDomain.toLowerCase())) {
        setDoctorError(`La cuenta ${email} no coincide con el dominio institucional (${allowedDomain}).`);
        setIsGoogleLoading(false);
        return;
      }

      // Buscar si el doctor coincide con el padrón de Excel
      const match = DOCTORES_EXCEL.find(d =>
        displayName.toLowerCase().includes(d.nombre.toLowerCase()) ||
        d.nombre.toLowerCase().includes(displayName.toLowerCase()) ||
        (d.correo && d.correo.toLowerCase() === email.toLowerCase())
      );

      const doctorData = {
        name: match ? match.nombre : displayName,
        email,
        photoURL: user.photoURL || null,
        shift: match?.horario && match.horario !== "Turno Rotativo" ? match.horario : selectedHorario,
        jvpm: match ? `JVPM-${match.id}` : "Institucional",
        role: "DOCTOR",
        spaceId: null,
        supervisorId: selectedSupervisor?.id || null,
        supervisorNombre: selectedSupervisor?.nombre || null,
        loginTime: new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" }),
        authProvider: "google",
      };

      onLoginDoctor(doctorData);
    } catch (err) {
      console.error("Error en Google Sign-In:", err);
      setDoctorError("Error de autenticación con Google. Intenta nuevamente o usa el padrón rápido.");
    } finally {
      setIsGoogleLoading(false);
    }
  }

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

  function handleSupervisorSubmit(e) {
    e.preventDefault();
    const sup = SUPERVISORES_OFICIALES.find((s) => s.id === selectedSupId) || SUPERVISORES_OFICIALES[0];
    const cleanPin = supervisorPin.trim().toLowerCase();
    if (!cleanPin || ["2026", "sup2026", "supervisor", "admin", "1234", "doctorsv"].includes(cleanPin)) {
      setSupervisorError("");
      if (onLoginSupervisor) {
        onLoginSupervisor({
          name: sup.nombre,
          role: "SUPERVISOR",
          supervisorId: sup.id,
          puesto: sup.puesto,
          shift: sup.horario,
          bloqueInicio: sup.bloqueInicio,
          bloqueFin: sup.bloqueFin,
          totalPuestos: sup.totalPuestos,
          loginTime: new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" }),
        });
      }
    } else {
      setSupervisorError("PIN incorrecto. (Prueba con: 2026 o déjalo vacío para acceso directo)");
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
      supervisorId: selectedSupervisor?.id || null,
      supervisorNombre: selectedSupervisor?.nombre || null,
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
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-black/25 backdrop-blur-md border border-white/15">
            <button
              type="button"
              onClick={() => {
                setActiveTab("doctor");
                setMasterError("");
                setSupervisorError("");
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-[12px] font-bold transition-all ${
                activeTab === "doctor"
                  ? "bg-white text-[#0048B5] shadow-md ring-1 ring-white/60 scale-[1.01]"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Stethoscope size={15} className={activeTab === "doctor" ? "text-[#0095FF]" : ""} />
              <span className="truncate">Doctor</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("supervisor");
                setMasterError("");
                setDoctorError("");
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-[12px] font-bold transition-all ${
                activeTab === "supervisor"
                  ? "bg-white text-cyan-950 shadow-md ring-1 ring-white/60 scale-[1.01]"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <UserCheck size={15} className={activeTab === "supervisor" ? "text-cyan-600" : ""} />
              <span className="truncate">Supervisor</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("master");
                setDoctorError("");
                setSupervisorError("");
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-[12px] font-bold transition-all ${
                activeTab === "master"
                  ? "bg-white text-[#1E1B4B] shadow-md ring-1 ring-white/60 scale-[1.01]"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Shield size={15} className={activeTab === "master" ? "text-indigo-600" : ""} />
              <span className="truncate">Master</span>
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

              {/* Opción 1: Google Institucional */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleGoogleDoctorLogin}
                  disabled={isGoogleLoading}
                  className="w-full flex items-center justify-center gap-3 rounded-2xl py-3 px-4 text-[13px] font-bold text-slate-700 bg-white hover:bg-slate-50 border-2 border-slate-200/90 hover:border-slate-300 shadow-sm active:scale-[0.99] transition-all disabled:opacity-60"
                >
                  {isGoogleLoading ? (
                    <RefreshCw size={18} className="animate-spin text-[#0095FF]" />
                  ) : (
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.66-5.17 3.66-9.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.1C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.32c-.25-.72-.38-1.49-.38-2.32s.13-1.6.38-2.32V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.1z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.1c.95-2.83 3.6-4.93 6.72-4.93z"
                      />
                    </svg>
                  )}
                  <span>{isGoogleLoading ? "Conectando con Google..." : "Continuar con Google Institucional"}</span>
                </button>

                <div className="relative flex items-center justify-center my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <span className="relative bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    o selecciona del padrón oficial
                  </span>
                </div>
              </div>

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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-0.5">
                  {(horarios || HORARIOS).map((h) => {
                    const isSelected = selectedHorario === h;
                    const isMorning = h.includes("AM") && !h.includes("MD");
                    const isAfternoon = h.includes("MD") || (h.includes("PM") && !h.includes("10:00"));
                    const Icon = isMorning ? Sun : isAfternoon ? Sunset : Moon;

                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setSelectedHorario(h)}
                        className={`flex items-center gap-2.5 p-2 rounded-xl border text-[12px] font-medium transition-all text-left ${
                          isSelected
                            ? "border-[#0048B5] bg-blue-50/90 text-[#0048B5] font-bold ring-1 ring-[#0048B5]"
                            : "border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100/80"
                        }`}
                      >
                        <Icon size={14} className={isSelected ? "text-[#0095FF]" : "text-slate-400"} />
                        <span className="truncate">{h}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Paso 3: Supervisor a cargo del turno */}
              <div>
                <label className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <span>3. Supervisor a Cargo del Turno</span>
                  {selectedSupervisor ? (
                    <span className="text-emerald-600 text-[10.5px] font-bold flex items-center gap-1">
                      <Check size={12} /> Seleccionado
                    </span>
                  ) : (
                    <span className="text-amber-500 text-[10.5px] font-semibold">Recomendado</span>
                  )}
                </label>

                <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
                  {SUPERVISORES_OFICIALES.map((sup) => {
                    const isSelected = selectedSupervisor?.id === sup.id;
                    return (
                      <button
                        key={sup.id}
                        type="button"
                        onClick={() => setSelectedSupervisor(isSelected ? null : sup)}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "border-[#0048B5] bg-blue-50/90 ring-1 ring-[#0048B5]"
                            : "border-slate-200 bg-slate-50/60 hover:bg-slate-100/80"
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-extrabold ${
                            isSelected ? "bg-[#0048B5] text-white" : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {sup.nombre.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[11.5px] font-bold leading-tight truncate ${
                            isSelected ? "text-[#0048B5]" : "text-slate-800"
                          }`}>
                            {sup.nombre}
                          </p>
                          <p className="text-[10.5px] text-slate-400 font-medium truncate mt-0.5">
                            {sup.rol} · {sup.horario}
                          </p>
                        </div>
                        {isSelected && (
                          <Check size={15} className="text-[#0048B5] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {!selectedSupervisor && (
                  <p className="mt-1.5 text-[10.5px] text-amber-600 font-medium flex items-center gap-1">
                    <AlertCircle size={11} />
                    Si no hay supervisor presente, puedes continuar sin seleccionar.
                  </p>
                )}
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

          {/* ================= MODO SUPERVISOR DE SEDE ================= */}
          {activeTab === "supervisor" && (
            <form onSubmit={handleSupervisorSubmit} className="space-y-4">
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-3.5 text-[12px] flex items-start gap-2.5 text-slate-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#0048B5] text-white">
                  <UserCheck size={14} />
                </span>
                <div>
                  <p className="font-bold text-[#0048B5]">Acceso para Supervisores de Turno</p>
                  <p className="text-[11.5px] text-slate-600 mt-0.5 leading-snug">
                    Permisos habilitados: <strong>Visual de mapa</strong>, <strong>Control de asistencia</strong> (con pase de lista y asignación de puestos) y <strong>Reportes en vivo</strong>.
                  </p>
                </div>
              </div>

              {supervisorError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-[12px] font-semibold text-rose-700">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{supervisorError}</span>
                </div>
              )}

              {/* Selector de Perfil de Supervisor */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Selecciona tu Nombre de Supervisor
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {SUPERVISORES_OFICIALES.map((sup) => {
                    const isSelected = selectedSupId === sup.id;
                    return (
                      <div
                        key={sup.id}
                        onClick={() => {
                          setSelectedSupId(sup.id);
                          setSupervisorError("");
                        }}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-blue-50/90 border-[#0095FF] ring-2 ring-[#0095FF]/30 shadow-xs"
                            : "bg-slate-50/60 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[12px] font-bold ${
                              isSelected
                                ? "bg-[#0048B5] text-white"
                                : "bg-white text-slate-600 border border-slate-200"
                            }`}
                          >
                            #{sup.puesto}
                          </span>
                          <div>
                            <p className="font-heading text-[13px] font-bold text-slate-900 leading-tight">
                              {sup.nombre}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {sup.rol} · <strong className="text-slate-700">{sup.horario}</strong>
                            </p>
                            <p className="text-[10px] text-cyan-700 font-semibold mt-0.5">
                              Lote: Puestos #{sup.bloqueInicio} al #{sup.bloqueFin} ({sup.totalPuestos} médicos)
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isSelected ? (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0095FF] text-white shadow-xs">
                              <Check size={14} />
                            </span>
                          ) : (
                            <span className="h-5 w-5 rounded-full border-2 border-slate-300" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Clave / PIN de Supervisor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    PIN de Acceso (Opcional)
                  </label>
                  <span className="text-[10.5px] text-slate-400">Predeterminado: <strong className="text-[#0048B5]">2026</strong></span>
                </div>
                <div className="relative flex items-center rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 shadow-2xs focus-within:ring-2 focus-within:ring-[#0095FF] focus-within:bg-white transition-all">
                  <KeyRound size={17} className="text-[#0048B5] mr-2 shrink-0" />
                  <input
                    type={showSupPin ? "text" : "password"}
                    value={supervisorPin}
                    onChange={(e) => setSupervisorPin(e.target.value)}
                    placeholder="Ingresa PIN (ej: 2026 o deja en blanco)"
                    className="w-full bg-transparent text-[14px] font-bold text-slate-900 outline-none placeholder:text-slate-400 placeholder:font-normal"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSupPin(!showSupPin)}
                    className="text-slate-400 hover:text-slate-600 ml-2 p-1"
                  >
                    {showSupPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[14px] font-bold text-white shadow-lg hover:brightness-110 active:scale-[0.99] transition-all"
                  style={{ background: "linear-gradient(135deg, #0048B5 0%, #0077D4 50%, #0095FF 100%)" }}
                >
                  <UserCheck size={17} />
                  <span>Ingresar como Supervisor de Sede</span>
                  <ChevronRight size={16} />
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
