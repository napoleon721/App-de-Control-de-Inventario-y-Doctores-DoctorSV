import React, { useState } from "react";
import {
  Stethoscope, AlertCircle, RefreshCw, UserCheck
} from "lucide-react";
import logoPng from "../../assets/doctorsv_logo.png";
import { DOCTORES_EXCEL, HORARIOS, SUPERVISORES_OFICIALES } from "../../constants/tokens";
import { loginWithGoogle } from "../../services/firebaseAuth";
import { isMasterUser, getMasterUserInfo, JEFATURA_ADMINISTRATIVOS, isSameDoctor } from "../../utils/safeHelpers";

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
  const [authError, setAuthError] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Helper para verificar si un correo tiene privilegios de Doctor Master o Jefatura
  function isMasterEmail(email = "", user = null) {
    return isMasterUser({ email, user });
  }

  // Resolver automáticamente rol y permisos a partir del correo o identificador
  function resolveUserPermissions(rawInput = "", user = null) {
    let clean = (rawInput || "").toLowerCase().trim();
    const displayName = user?.displayName || "";

    if (!clean && user?.email) {
      clean = user.email.toLowerCase().trim();
    }

    if (clean === "elmer" || clean === "elmer.andrade") {
      clean = "usuario@ejemplo.com";
    }

    // 1. DOCTOR MASTER Y JEFATURAS ADMINISTRATIVAS
    if (isMasterUser({ email: clean, name: displayName, user })) {
      return getMasterUserInfo({ email: clean, name: displayName, user });
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
        (displayName.toLowerCase().includes(sName) || sName.includes(displayName.toLowerCase()) || isSameDoctor(sName, displayName))
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
    // Respaldo por tokens del correo (ej. "isaac.flores@..." -> ISAAC FLORES HERNANDEZ) cuando el correo del padrón no coincide con el nombre
    const emailTokens = clean.includes("@")
      ? clean.split("@")[0].split(/[._\-\s]+/).map((t) => t.replace(/\d+/g, "")).filter((t) => t.length > 1)
      : [];
    const tokenMatches = emailTokens.length >= 2
      ? docList.filter((d) => {
          const words = String(d.nombre || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/\s+/);
          return emailTokens.every((t) => words.includes(t.normalize("NFD").replace(/[̀-ͯ]/g, "")));
        })
      : [];
    const tokenMatchedDoc = tokenMatches.length === 1 ? tokenMatches[0] : null;

    const matchedDoc = docList.find((d) => {
      const dEmail = (d.correo || "").toLowerCase().trim();
      const dName = (d.nombre || "").toLowerCase().trim();
      const prefix = dEmail.split("@")[0];
      if (dEmail && clean === dEmail) return true;
      if (prefix && (clean === prefix || clean.startsWith(prefix))) return true;
      if (clean && dName.includes(clean)) return true;
      if (
        displayName &&
        (displayName.toLowerCase().includes(dName) || dName.includes(displayName.toLowerCase()) || isSameDoctor(dName, displayName))
      ) {
        return true;
      }
      return false;
    }) || tokenMatchedDoc;

    if (matchedDoc) {
      // Si el registro pertenece a Personal Administrativo o Jefatura, garantizar rol MASTER
      if (
        matchedDoc.categoria === "Administrativos" ||
        matchedDoc.rol === "Personal Administrativo" ||
        isMasterUser({ email: clean, name: matchedDoc.nombre, user })
      ) {
        return getMasterUserInfo({ email: clean, name: matchedDoc.nombre, user });
      }

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
      if (isMasterUser({ email: clean, name: displayName || userPart, user })) {
        return getMasterUserInfo({ email: clean, name: displayName || userPart, user });
      }
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
          setAuthError(`No se pudo conectar con Google (${errStr}). Intenta nuevamente.`);
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
      setAuthError("Error de autenticación con Google. Intenta nuevamente.");
    } finally {
      setIsGoogleLoading(false);
    }
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

          <p className="text-center text-[11.5px] text-slate-500">
            Tu perfil (Master, Supervisor o Médico) se detecta automáticamente con tu correo de Google.
          </p>
        </div>
      </div>
    </div>
  );
}
