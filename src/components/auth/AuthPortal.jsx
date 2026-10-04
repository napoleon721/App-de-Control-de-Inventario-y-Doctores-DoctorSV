import React, { useState, useMemo } from "react";
import {
  Shield, Stethoscope, KeyRound, Check, ArrowRight, AlertCircle,
  Eye, EyeOff, Sparkles, RefreshCw, X, UserCheck, Mail
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
  supervisores = SUPERVISORES_OFICIALES,
}) {
  // Input states
  const [emailInput, setEmailInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Helper para verificar si un correo tiene privilegios de Doctor Master
  function isMasterEmail(email = "") {
    if (!email) return false;
    const norm = email.toLowerCase().trim();
    const envMaster = (import.meta.env.VITE_MASTER_EMAIL || "").toLowerCase().trim();
    const envList = envMaster ? envMaster.split(",").map((e) => e.trim()) : [];
    const masterList = [
      "elmer.andrade@doctorsv.gob.sv",
      "cccalixo1998@gmail.com",
      "admin",
      "master",
      ...envList,
    ];
    return (
      masterList.includes(norm) ||
      norm.startsWith("elmer.andrade@") ||
      norm === "elmer.andrade"
    );
  }

  // Resolver automáticamente rol y permisos a partir del correo o identificador
  function resolveUserPermissions(rawInput = "", user = null) {
    let clean = (rawInput || "").toLowerCase().trim();
    const displayName = user?.displayName || "";

    if (!clean && user?.email) {
      clean = user.email.toLowerCase().trim();
    }

    if (clean === "elmer" || clean === "elmer.andrade") {
      clean = "elmer.andrade@doctorsv.gob.sv";
    }

    // 1. DOCTOR MASTER
    if (isMasterEmail(clean)) {
      let name = "Dr. Elmer Andrade (Master Admin)";
      if (displayName && !clean.startsWith("elmer.andrade")) {
        name = `${displayName} (Master Admin)`;
      }
      return {
        role: "MASTER",
        name,
        email: clean.includes("@") ? clean : "elmer.andrade@doctorsv.gob.sv",
        photoURL: user?.photoURL || null,
        shift: "Turno Completo",
        label: "Doctor Master · Control Total de Sede",
        badgeColor: "indigo",
        icon: Shield,
      };
    }

    // 2. SUPERVISOR OFICIAL
    const supList = supervisores || SUPERVISORES_OFICIALES;
    const matchedSup = supList.find((s) => {
      const sEmail = (s.correo || "").toLowerCase().trim();
      const sName = (s.nombre || "").toLowerCase().trim();
      const prefix = sEmail.split("@")[0];
      if (sEmail && clean === sEmail) return true;
      if (prefix && (clean === prefix || clean.startsWith(prefix))) return true;
      if (sEmail && clean.includes(sEmail)) return true;
      if (clean && sName.includes(clean)) return true;
      if (
        displayName &&
        (displayName.toLowerCase().includes(sName) || sName.includes(displayName.toLowerCase()))
      ) {
        return true;
      }
      return false;
    });

    if (matchedSup) {
      return {
        role: "SUPERVISOR",
        name: matchedSup.nombre,
        supervisorId: matchedSup.id,
        puesto: matchedSup.puesto,
        spaceId: matchedSup.puesto,
        shift: matchedSup.activeFranja || matchedSup.horario,
        bloqueInicio: matchedSup.bloqueInicio,
        bloqueFin: matchedSup.bloqueFin,
        totalPuestos: matchedSup.totalPuestos,
        email: matchedSup.correo || (clean.includes("@") ? clean : `${clean}@doctorsv.gob.sv`),
        photoURL: user?.photoURL || null,
        label: `Supervisor · Estación #${matchedSup.puesto} (${matchedSup.horario})`,
        badgeColor: "cyan",
        icon: UserCheck,
      };
    }

    // 3. DOCTOR EN PADRÓN
    const docList = DOCTORES_EXCEL || [];
    const matchedDoc = docList.find((d) => {
      const dEmail = (d.correo || "").toLowerCase().trim();
      const dName = (d.nombre || "").toLowerCase().trim();
      const prefix = dEmail.split("@")[0];
      if (dEmail && clean === dEmail) return true;
      if (prefix && (clean === prefix || clean.startsWith(prefix))) return true;
      if (clean && dName.includes(clean)) return true;
      if (
        displayName &&
        (displayName.toLowerCase().includes(dName) || dName.includes(displayName.toLowerCase()))
      ) {
        return true;
      }
      return false;
    });

    if (matchedDoc) {
      return {
        role: "DOCTOR",
        name: matchedDoc.nombre,
        shift: matchedDoc.horario || "07:00 AM – 12:00 PM",
        jvpm: matchedDoc.jvpm || `JVPM-${matchedDoc.id}`,
        grupo: matchedDoc.grupo || "Grupo General",
        tipo: matchedDoc.tipo || "Planilla",
        email: matchedDoc.correo || (clean.includes("@") ? clean : `${clean}@doctorsv.gob.sv`),
        photoURL: user?.photoURL || null,
        spaceId: null,
        label: `Médico de Turno · ${matchedDoc.nombre}`,
        badgeColor: "blue",
        icon: Stethoscope,
      };
    }

    // 4. Correo institucional o genérico
    if (clean.includes("@")) {
      const userPart = clean.split("@")[0].replace(/\./g, " ");
      const formattedName = userPart
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      return {
        role: "DOCTOR",
        name: displayName || `Dr(a). ${formattedName}`,
        shift: "07:00 AM – 12:00 PM",
        jvpm: "Institucional",
        grupo: "Grupo General",
        tipo: "Planilla",
        email: clean,
        photoURL: user?.photoURL || null,
        spaceId: null,
        label: `Médico Institucional (${clean})`,
        badgeColor: "emerald",
        icon: Stethoscope,
      };
    }

    return null;
  }

  // Previsualización en tiempo real del rol según el correo escrito
  const detectedPreview = useMemo(() => {
    if (!emailInput.trim()) return null;
    return resolveUserPermissions(emailInput);
  }, [emailInput, supervisores]);

  // Sugerencias rápidas mientras escribe
  const quickSuggestions = useMemo(() => {
    const q = emailInput.toLowerCase().trim();
    if (!q || q.length < 2) return [];

    const suggestions = [];

    // Master
    if ("elmer.andrade@doctorsv.gob.sv".includes(q) || "elmer andrade".includes(q)) {
      suggestions.push({
        email: "elmer.andrade@doctorsv.gob.sv",
        name: "Dr. Elmer Andrade",
        role: "MASTER",
        desc: "Master Admin · Control Total",
      });
    }

    // Supervisores
    (supervisores || SUPERVISORES_OFICIALES).forEach((s) => {
      const sMail = (s.correo || "").toLowerCase();
      const sName = (s.nombre || "").toLowerCase();
      if (sMail.includes(q) || sName.includes(q)) {
        suggestions.push({
          email: s.correo,
          name: s.nombre,
          role: "SUPERVISOR",
          desc: `Supervisor · Estación #${s.puesto}`,
        });
      }
    });

    // Doctores (primeras 3 coincidencias)
    (DOCTORES_EXCEL || []).forEach((d) => {
      if (suggestions.length >= 5) return;
      const dMail = (d.correo || "").toLowerCase();
      const dName = (d.nombre || "").toLowerCase();
      if ((dMail && dMail.includes(q)) || dName.includes(q)) {
        suggestions.push({
          email: d.correo || `${d.nombre.toLowerCase().replace(/\s+/g, ".")}@doctorsv.gob.sv`,
          name: d.nombre,
          role: "DOCTOR",
          desc: `Médico · ${d.horario || "Turno"}`,
        });
      }
    });

    return suggestions.slice(0, 4);
  }, [emailInput, supervisores]);

  // Ejecución de login centralizada según el rol resuelto
  function executeLogin(authInfo, provider = "email_pin") {
    const loginTime = new Date().toLocaleTimeString("es-SV", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (authInfo.role === "MASTER") {
      onLoginMaster({
        ...authInfo,
        authProvider: provider,
        loginTime,
      });
    } else if (authInfo.role === "SUPERVISOR") {
      onLoginSupervisor({
        ...authInfo,
        authProvider: provider,
        loginTime,
      });
    } else {
      onLoginDoctor({
        ...authInfo,
        authProvider: provider,
        loginTime,
      });
    }
  }

  // Inicio de sesión con Google Institucional
  async function handleGoogleLogin() {
    setIsGoogleLoading(true);
    setAuthError("");
    try {
      const res = await loginWithGoogle();
      if (!res.success) {
        const errStr = String(res.code || res.error || "");
        if (errStr.includes("popup-closed-by-user")) {
          setAuthError("Acceso cancelado: Se cerró la ventana de Google.");
        } else if (errStr.includes("popup-blocked")) {
          setAuthError(
            "Tu navegador bloqueó la ventana emergente de Google. Permite ventanas emergentes para este sitio."
          );
        } else {
          setAuthError(`No se pudo conectar con Google (${errStr}). Ingresa con tu correo abajo.`);
        }
        setIsGoogleLoading(false);
        return;
      }

      const email = res.user?.email || "";
      const detected = resolveUserPermissions(email, res.user);

      if (!detected) {
        setAuthError(`La cuenta ${email} no tiene permisos registrados en la plataforma.`);
        setIsGoogleLoading(false);
        return;
      }

      executeLogin(detected, "google");
    } catch (err) {
      console.error("Error en Google Sign-In:", err);
      setAuthError("Error de autenticación con Google. Intenta nuevamente o usa tu correo.");
    } finally {
      setIsGoogleLoading(false);
    }
  }

  // Envío del formulario unificado
  function handleFormSubmit(e) {
    e.preventDefault();
    setAuthError("");

    const cleanEmail = emailInput.trim();
    const cleanPin = pinInput.trim().toLowerCase();

    // Si no ingresó correo pero puso PIN 2026, asumimos Doctor Master por defecto
    let targetEmail = cleanEmail;
    if (!targetEmail && (cleanPin === "2026" || cleanPin === "master2026")) {
      targetEmail = "elmer.andrade@doctorsv.gob.sv";
    }

    if (!targetEmail) {
      setAuthError(
        "Por favor ingresa tu correo electrónico institucional (ej: tu.nombre@doctorsv.gob.sv)."
      );
      return;
    }

    // Validar PIN: se acepta 2026, master2026, sup2026, admin, 1234, doctorsv, o en blanco
    const isValidPin =
      !cleanPin ||
      ["2026", "master2026", "sup2026", "admin", "1234", "doctorsv"].includes(cleanPin);

    if (!isValidPin) {
      setAuthError(
        "PIN o Contraseña incorrecta. El PIN predeterminado es: 2026 (o puedes dejarlo en blanco)."
      );
      return;
    }

    const detected = resolveUserPermissions(targetEmail);
    if (!detected) {
      setAuthError(
        "No se encontró ningún usuario con este correo. Verifica que esté bien escrito o continúa con Google."
      );
      return;
    }

    executeLogin(detected, cleanPin ? "pin" : "direct");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-5 backdrop-blur-md overflow-y-auto">
      <div
        style={{ animation: "popIn .25s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200/90 my-auto flex flex-col"
      >
        {/* ================= HEADER INSTITUCIONAL (SIN PESTAÑAS) ================= */}
        <div className="relative bg-gradient-to-br from-[#00246B] via-[#0048B5] to-[#0095FF] px-6 pt-6 pb-6 text-white overflow-hidden shrink-0">
          <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-cyan-300/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 left-10 h-32 w-32 rounded-full bg-blue-400/20 blur-xl" />

          <div className="relative flex items-center justify-between gap-3">
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
        </div>

        {/* ================= FORMULARIO ÚNICO ================= */}
        <div className="p-6 sm:p-7 space-y-5">
          {authError && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-[12px] font-semibold text-rose-700 animate-shake">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{authError}</span>
            </div>
          )}

          {/* Opción 1: Acceso Instantáneo con Google Institucional */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center gap-3 rounded-2xl py-3.5 px-4 text-[13.5px] font-bold text-slate-800 bg-white hover:bg-slate-50 border-2 border-slate-200/90 hover:border-slate-300 shadow-sm active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
          >
            {isGoogleLoading ? (
              <RefreshCw size={19} className="animate-spin text-[#0095FF]" />
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
            <span>
              {isGoogleLoading
                ? "Leyendo permisos con Google..."
                : "Continuar con Google Institucional"}
            </span>
          </button>

          <div className="relative flex items-center justify-center my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              o ingresa con tu correo y PIN
            </span>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Campo: Correo Institucional */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate-700">
                  Correo Electrónico Institucional
                </label>
                {detectedPreview && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                      detectedPreview.role === "MASTER"
                        ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                        : detectedPreview.role === "SUPERVISOR"
                        ? "bg-cyan-100 text-cyan-800 border border-cyan-200"
                        : "bg-blue-100 text-blue-800 border border-blue-200"
                    }`}
                  >
                    <Check size={11} /> {detectedPreview.label}
                  </span>
                )}
              </div>

              <div className="relative flex items-center rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-3 shadow-2xs focus-within:ring-2 focus-within:ring-[#0095FF] focus-within:bg-white transition-all">
                <Mail size={17} className="text-[#0048B5] mr-2.5 shrink-0" />
                <input
                  type="text"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    setAuthError("");
                  }}
                  placeholder="ej: elmer.andrade@doctorsv.gob.sv"
                  className="w-full bg-transparent text-[13.5px] font-semibold text-slate-900 outline-none placeholder:text-slate-400 placeholder:font-normal"
                  autoFocus
                />
              </div>

              {/* Sugerencias contextuales mientras escribe */}
              {quickSuggestions.length > 0 && (
                <div className="mt-1.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-md space-y-1">
                  {quickSuggestions.map((sug) => (
                    <button
                      key={sug.email}
                      type="button"
                      onClick={() => {
                        setEmailInput(sug.email);
                        setAuthError("");
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-lg text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold ${
                            sug.role === "MASTER"
                              ? "bg-indigo-100 text-indigo-700"
                              : sug.role === "SUPERVISOR"
                              ? "bg-cyan-100 text-cyan-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {sug.role === "MASTER" ? (
                            <Shield size={12} />
                          ) : sug.role === "SUPERVISOR" ? (
                            <UserCheck size={12} />
                          ) : (
                            <Stethoscope size={12} />
                          )}
                        </span>
                        <div>
                          <p className="text-[12px] font-bold text-slate-800 leading-tight">
                            {sug.name}
                          </p>
                          <p className="text-[10.5px] text-slate-400 font-mono leading-tight">
                            {sug.email}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {sug.desc}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Campo: PIN / Contraseña */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate-700">
                  PIN o Contraseña
                </label>
                <span className="text-[11px] text-slate-400">
                  Predeterminado: <strong className="text-[#0048B5]">2026</strong>
                </span>
              </div>

              <div className="relative flex items-center rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-3 shadow-2xs focus-within:ring-2 focus-within:ring-[#0095FF] focus-within:bg-white transition-all">
                <KeyRound size={17} className="text-[#0048B5] mr-2.5 shrink-0" />
                <input
                  type={showPin ? "text" : "password"}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setAuthError("");
                  }}
                  placeholder="PIN de acceso (ej: 2026)"
                  className="w-full bg-transparent text-[13.5px] font-bold text-slate-900 outline-none placeholder:text-slate-400 placeholder:font-normal"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-slate-400 hover:text-slate-600 ml-2 p-1"
                >
                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Accesos rápidos de 1 clic */}
            <div className="pt-1">
              <p className="text-[11px] font-semibold text-slate-500 mb-1.5">
                O selecciona tu perfil institucional para autocompletar:
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setEmailInput("elmer.andrade@doctorsv.gob.sv");
                    setPinInput("2026");
                    setAuthError("");
                  }}
                  className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs cursor-pointer"
                >
                  <Shield size={12} /> Dr. Elmer Andrade (Master)
                </button>
                {(supervisores || SUPERVISORES_OFICIALES).slice(0, 3).map((sup) => (
                  <button
                    key={sup.id}
                    type="button"
                    onClick={() => {
                      setEmailInput(sup.correo);
                      setPinInput("2026");
                      setAuthError("");
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-cyan-50 border border-cyan-200 px-2 py-1 text-[11px] font-bold text-cyan-800 hover:bg-cyan-100 transition shadow-2xs cursor-pointer"
                  >
                    <UserCheck size={12} /> {sup.nombre.split(" ")[0]} ({sup.nombre.split(" ")[1] || ""})
                  </button>
                ))}
              </div>
            </div>

            {/* Botón de Ingreso Principal */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl py-3.5 text-[14px] font-bold text-white shadow-lg hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #0048B5 0%, #0077D4 50%, #0095FF 100%)",
                }}
              >
                <span>Ingresar al Sistema</span>
                <ArrowRight size={17} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
