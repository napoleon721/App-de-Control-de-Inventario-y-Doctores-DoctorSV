import React from "react";
import { Monitor, AlertTriangle, Droplets, Wrench, Lock, XCircle, User, Shield } from "lucide-react";

export default function ExactCubicle({ space, onClick }) {
  if (!space) return <div className="h-[43px] w-full" />;

  const isVacio = space.estado === "VACIO";
  const isInhabilitado = space.estado === "INHABILITADO";
  const isRevisado = space.estado === "REPARACION";
  const isReservado = space.estado === "RESERVADO";
  const isIncompleto = space.estado === "INCOMPLETO";
  const isSupervisorStation = [135, 136, 137, 138, 139].includes(Number(space.id));
  const isSupervisor = (isSupervisorStation || space.categoria === "Supervisores") && space.estado !== "DISPONIBLE" && space.estado !== "VACIO";
  const isOcupado = (space.estado === "OCUPADO" || Boolean(space.doctor)) && !isSupervisor;

  // Paleta armónica moderna médica DoctorSV
  let bgGradient = "linear-gradient(180deg, #10B981 0%, #059669 100%)"; // Verde Disponible
  let textColor = "#FFFFFF";
  let borderColor = "#047857";
  let tagText = space.marca || "DELL";
  let TagIcon = Monitor;

  if (isOcupado) {
    // Puesto ocupado por un médico en tiempo real (Azul institucional DoctorSV)
    bgGradient = "linear-gradient(180deg, #0048B5 0%, #002D7A 100%)";
    textColor = "#FFFFFF";
    borderColor = "#38BDF8";
    const cleanDoc = space.doctor ? String(space.doctor).replace(/^DR(A)?\.\s*/i, "").trim() : "";
    const firstWord = cleanDoc.split(" ")[0] || "DOC";
    tagText = firstWord.length > 7 ? firstWord.slice(0, 6) + "." : firstWord;
    TagIcon = User;
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

  const tooltipText = isOcupado
    ? `Puesto #${space.id} · Ocupado por Dr(a). ${space.doctor} (${space.horario || 'Turno activo'}) · PC: ${space.marca || 'DELL'}`
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
      className="group relative flex flex-col justify-between items-center h-[43px] w-full max-w-[48px] rounded-[6px] border border-black/20 p-1 shadow-2xs hover:scale-105 hover:z-30 hover:shadow-md transition-all duration-150 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-white"
    >
      {/* Fila Superior: Número & Indicador */}
      <div className="w-full flex items-center justify-between px-0.5 leading-none">
        <span className="text-[11px] font-extrabold font-heading tracking-tight drop-shadow-xs">
          {space.id}
        </span>
        {isSupervisor ? (
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-200 ring-1 ring-slate-900/40" title={`Puesto de Supervisión: ${space.doctor || 'Supervisor'}`} />
        ) : isOcupado ? (
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 ring-1 ring-white animate-pulse" />
        ) : null}
      </div>

      {/* Fila Inferior: Hardware Tag & Ícono */}
      <div className="w-full flex items-center justify-center gap-0.5 text-[7.5px] font-bold tracking-tight uppercase leading-none opacity-95">
        <TagIcon size={8} className="shrink-0 opacity-85" />
        <span className="truncate">{tagText}</span>
      </div>

      {/* Sutil reflejo arquitectónico */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[35%] bg-gradient-to-b from-white/20 to-transparent rounded-t-[5px]" />
    </button>
  );
}
