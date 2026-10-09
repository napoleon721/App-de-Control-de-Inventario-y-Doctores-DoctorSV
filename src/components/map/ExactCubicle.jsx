import React, { useMemo } from "react";
import { Monitor, AlertTriangle, Droplets, Wrench, Lock, XCircle, User, Shield, UserX, Briefcase } from "lucide-react";
import { isSameDoctor } from "../../utils/safeHelpers";

export default function ExactCubicle({ space, onClick, attendanceRecords = null, density = "normal" }) {
  const fallbackH = density === "compact" ? "h-[37px]" : density === "wide" ? "h-[48px]" : "h-[44px]";
  if (!space) return <div className={`${fallbackH} w-full`} />;

  const isVacio = space.estado === "VACIO";
  const isInhabilitado = space.estado === "INHABILITADO";
  const isRevisado = space.estado === "REPARACION";
  const isReservado = space.estado === "RESERVADO";
  const isIncompleto = space.estado === "INCOMPLETO";
  const isSupervisorStation = space.categoria === "Supervisores" || [135, 136, 137, 138, 139].includes(Number(space.id));
  const isSupervisor = (isSupervisorStation || space.categoria === "Supervisores") && space.estado !== "DISPONIBLE" && space.estado !== "VACIO";
  const isAdministrativo = space.categoria === "Administrativos" && (space.estado === "OCUPADO" || Boolean(space.doctor));

  // Dimensiones y tipografía responsivas según la densidad seleccionada
  const dimClasses = density === "compact"
    ? "h-[37px] w-full max-w-[58px] min-w-[32px] p-0.5 rounded-[5px]"
    : density === "wide"
    ? "h-[48px] w-full max-w-[84px] min-w-[42px] p-1 sm:p-1.5 rounded-[7px]"
    : "h-[44px] w-full max-w-[72px] min-w-[36px] p-1 rounded-[6px]";

  const numTextClass = density === "compact" ? "text-[10px]" : density === "wide" ? "text-[12px]" : "text-[11px]";
  const tagTextClass = density === "compact" ? "text-[6.5px]" : density === "wide" ? "text-[8.5px]" : "text-[7.5px]";
  const iconSize = density === "compact" ? 7 : density === "wide" ? 9 : 8;
  const dotClass = density === "compact" ? "h-1 w-1" : density === "wide" ? "h-2 w-2" : "h-1.5 w-1.5";

  // Verificar si el médico asignado a este cubículo está marcado como ausente o finalizado en Asistencias
  const doctorAttStatus = useMemo(() => {
    if (!space?.doctor || !attendanceRecords) return null;
    const cleanDoc = String(space.doctor).trim();
    if (attendanceRecords[cleanDoc]) return attendanceRecords[cleanDoc];
    const match = Object.keys(attendanceRecords).find((k) => isSameDoctor(k, cleanDoc));
    return match ? attendanceRecords[match] : null;
  }, [space?.doctor, attendanceRecords]);

  const isDoctorAbsent = doctorAttStatus === "AUSENTE";
  const isDoctorFinished = doctorAttStatus === "FINALIZADO";
  const isDoctorJustified = doctorAttStatus === "JUSTIFICADO";
  const isNotWorking = isDoctorAbsent || isDoctorFinished || isDoctorJustified;

  const isOcupado = (space.estado === "OCUPADO" || Boolean(space.doctor)) && !isSupervisor && !isNotWorking;

  // Paleta armónica moderna médica DoctorSV
  let bgGradient = "linear-gradient(180deg, #10B981 0%, #059669 100%)"; // Verde Disponible
  let textColor = "#FFFFFF";
  let borderColor = "#047857";
  let tagText = space.marca || "DELL";
  let TagIcon = Monitor;

  if (isAdministrativo && !isNotWorking) {
    // Puesto asignado a personal administrativo (Índigo elegante corporativo)
    bgGradient = "linear-gradient(180deg, #4F46E5 0%, #312E81 100%)";
    textColor = "#FFFFFF";
    borderColor = "#818CF8";
    const cleanDoc = space.doctor ? String(space.doctor).replace(/^DR(A)?\.\s*/i, "").trim() : "";
    const firstWord = cleanDoc.split(" ")[0] || "ADMIN";
    tagText = firstWord.length > 7 ? firstWord.slice(0, 6) + "." : firstWord;
    TagIcon = Briefcase;
  } else if (isOcupado) {
    // Puesto ocupado por un médico en tiempo real (Azul institucional DoctorSV)
    bgGradient = "linear-gradient(180deg, #0048B5 0%, #002D7A 100%)";
    textColor = "#FFFFFF";
    borderColor = "#38BDF8";
    const cleanDoc = space.doctor ? String(space.doctor).replace(/^DR(A)?\.\s*/i, "").trim() : "";
    const firstWord = cleanDoc.split(" ")[0] || "DOC";
    tagText = firstWord.length > 7 ? firstWord.slice(0, 6) + "." : firstWord;
    TagIcon = User;
  } else if (isDoctorAbsent && space.doctor) {
    // Médico registrado como AUSENTE: Puesto no ocupado / disponible para relevo
    bgGradient = "linear-gradient(180deg, #E11D48 0%, #BE123C 100%)";
    textColor = "#FFFFFF";
    borderColor = "#FDA4AF";
    tagText = "AUSENTE";
    TagIcon = UserX;
  } else if (isIncompleto) {
    bgGradient = "linear-gradient(180deg, #F59E0B 0%, #D97706 100%)"; // Ámbar / Alerta
    textColor = "#FFFFFF";
    borderColor = "#B45309";
    tagText = space.marca || "DELL";
    TagIcon = AlertTriangle;
  } else if (isInhabilitado) {
    bgGradient = "linear-gradient(180deg, #3B82F6 0%, #1D4ED8 100%)"; // Azul Técnico
    textColor = "#FFFFFF";
    borderColor = "#1E40AF";
    tagText = "NO PC";
    TagIcon = Droplets;
  } else if (isVacio) {
    bgGradient = "linear-gradient(180deg, #F43F5E 0%, #E11D48 100%)"; // Rosa / Vacío
    textColor = "#FFFFFF";
    borderColor = "#BE123C";
    tagText = "SIN PC";
    TagIcon = XCircle;
  } else if (isRevisado) {
    bgGradient = "linear-gradient(180deg, #A855F7 0%, #7E22CE 100%)"; // Morado IT
    textColor = "#FFFFFF";
    borderColor = "#6B21A8";
    tagText = "NO PC";
    TagIcon = Wrench;
  } else if (isReservado || isSupervisor) {
    bgGradient = "linear-gradient(180deg, #38BDF8 0%, #0284C7 100%)"; // Celeste Supervisión
    textColor = "#0F172A";
    borderColor = "#0369A1";
    tagText = isSupervisor ? `SUP · ${space.marca || "PC"}` : (space.marca || "RESERVADO");
    TagIcon = isSupervisor ? Shield : Lock;
  }

  const tooltipText = isDoctorAbsent && space.doctor
    ? `Puesto #${space.id} · ${space.doctor} [AUSENTE / Inasistencia] · Puesto disponible para reasignar`
    : isAdministrativo
    ? `Puesto #${space.id} · Personal Administrativo: ${space.doctor} (${space.horario || 'Turno activo'}) · PC: ${space.marca || 'DELL'}`
    : isOcupado
    ? `Puesto #${space.id} · Ocupado por Dr(a). ${space.doctor} (${space.horario || 'Turno activo'})${space.supervisorNombre ? ` · Sup: ${space.supervisorNombre}` : ''} · PC: ${space.marca || 'DELL'}`
    : isSupervisor
    ? `Puesto de Supervisión #${space.id} (${space.marca || 'PC'})`
    : `Puesto #${space.id} · ${space.estado} · ${space.marca || 'DELL'}`;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(space);
      }}
      title={tooltipText}
      style={{
        background: bgGradient,
        borderColor: borderColor,
        color: textColor,
      }}
      className={`group relative flex flex-col justify-between items-center ${dimClasses} border border-black/20 shadow-2xs hover:scale-105 hover:z-30 hover:shadow-md transition-all duration-150 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-white`}
    >
      {/* Fila Superior: Número & Indicador */}
      <div className="w-full flex items-center justify-between px-0.5 leading-none">
        <span className={`${numTextClass} font-extrabold font-heading tracking-tight drop-shadow-xs`}>
          {space.id}
        </span>
        {isSupervisor ? (
          <span className={`${dotClass} rounded-full bg-cyan-200 ring-1 ring-slate-900/40`} title={`Puesto de Supervisión: ${space.doctor || 'Supervisor'}`} />
        ) : isOcupado ? (
          <span className={`${dotClass} rounded-full bg-emerald-400 ring-1 ring-white animate-pulse`} />
        ) : isDoctorAbsent && space.doctor ? (
          <span className={`${dotClass} rounded-full bg-rose-300 ring-1 ring-white`} title="Médico Ausente en Asistencia" />
        ) : null}
      </div>

      {/* Fila Inferior: Hardware Tag & Ícono */}
      <div className={`w-full flex items-center justify-center gap-0.5 ${tagTextClass} font-bold tracking-tight uppercase leading-none opacity-95`}>
        <TagIcon size={iconSize} className="shrink-0 opacity-85" />
        <span className="truncate">{tagText}</span>
      </div>

      {/* Sutil reflejo arquitectónico */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[35%] bg-gradient-to-b from-white/20 to-transparent rounded-t-[5px]" />
    </button>
  );
}
