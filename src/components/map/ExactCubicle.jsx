import React from "react";
import { Monitor, AlertTriangle, Droplets, Wrench, Lock, XCircle, User, Shield } from "lucide-react";

export default function ExactCubicle({ space, onClick }) {
  if (!space) return <div className="h-[46px] w-[50px]" />;

  const isVacio = space.estado === "VACIO";
  const isInhabilitado = space.estado === "INHABILITADO";
  const isRevisado = space.estado === "REPARACION";
  const isReservado = space.estado === "RESERVADO";
  const isIncompleto = space.estado === "INCOMPLETO";
  const isSupervisor = [135, 136, 137, 138, 1].includes(space.id) || space.categoria === "Supervisores";
  const isOcupado = (space.estado === "OCUPADO" || !!space.doctor) && !isSupervisor;

  // Estilos visuales exactos alineados al plano arquitectónico y tokens oficiales
  let bgGradient = "linear-gradient(180deg, #2D8A4E 0%, #1E6B39 100%)"; // Verde Disponible
  let textColor = "#FFFFFF";
  let borderColor = "#16592E";
  let shadowGlow = "rgba(34, 197, 94, 0.25)";
  let tagText = space.marca || "DELL";
  let TagIcon = Monitor;

  if (isOcupado) {
    // Puesto ocupado por un médico en tiempo real (Azul institucional DoctorSV)
    bgGradient = "linear-gradient(180deg, #0048B5 0%, #002D7A 100%)";
    textColor = "#FFFFFF";
    borderColor = "#0095FF";
    shadowGlow = "rgba(0, 149, 255, 0.4)";
    // Extraer primer nombre o apellido significativo del médico
    const cleanDoc = space.doctor ? space.doctor.replace(/^DR(A)?\.\s*/i, "").trim() : "";
    const firstWord = cleanDoc.split(" ")[0] || "DOC";
    tagText = firstWord.length > 7 ? firstWord.slice(0, 6) + "." : firstWord;
    TagIcon = User;
  } else if (isIncompleto) {
    bgGradient = "linear-gradient(180deg, #F59E0B 0%, #D97706 100%)"; // Amarillo
    textColor = "#FFFFFF";
    borderColor = "#B45309";
    shadowGlow = "rgba(245, 158, 11, 0.3)";
    tagText = space.marca || "DELL";
    TagIcon = AlertTriangle;
  } else if (isInhabilitado) {
    bgGradient = "linear-gradient(180deg, #3B82F6 0%, #1D4ED8 100%)"; // Azul
    textColor = "#FFFFFF";
    borderColor = "#1E40AF";
    shadowGlow = "rgba(59, 130, 246, 0.3)";
    tagText = "NO PC";
    TagIcon = Droplets;
  } else if (isVacio) {
    bgGradient = "linear-gradient(180deg, #F43F5E 0%, #E11D48 100%)"; // Salmón / Rojo
    textColor = "#FFFFFF";
    borderColor = "#BE123C";
    shadowGlow = "rgba(244, 63, 94, 0.25)";
    tagText = "SIN PC";
    TagIcon = XCircle;
  } else if (isRevisado) {
    bgGradient = "linear-gradient(180deg, #A855F7 0%, #7E22CE 100%)"; // Morado
    textColor = "#FFFFFF";
    borderColor = "#6B21A8";
    shadowGlow = "rgba(168, 85, 247, 0.3)";
    tagText = "NO PC";
    TagIcon = Wrench;
  } else if (isReservado || isSupervisor) {
    bgGradient = "linear-gradient(180deg, #38BDF8 0%, #0284C7 100%)"; // Celeste
    textColor = "#0F172A";
    borderColor = "#0369A1";
    shadowGlow = "rgba(56, 189, 248, 0.3)";
    tagText = isSupervisor ? `SUP · ${space.marca || "PC"}` : (space.marca || "RESERVADO");
    TagIcon = isSupervisor ? Shield : Lock;
  }

  const tooltipText = isOcupado
    ? `Puesto #${space.id} · Ocupado por Dr(a). ${space.doctor} (${space.horario || 'Turno activo'}) · PC: ${space.marca || 'DELL'}`
    : isSupervisor
    ? `Puesto de Supervisión #${space.id} (${space.marca || 'PC'})`
    : `Puesto #${space.id} · ${space.estado} · ${space.marca || 'Sin PC'}`;

  return (
    <button
      type="button"
      onClick={() => onClick(space)}
      title={tooltipText}
      style={{
        background: bgGradient,
        borderColor: borderColor,
        color: textColor,
      }}
      className="group relative flex flex-col justify-between items-center h-[46px] w-[50px] sm:w-[54px] rounded-[5px] border border-black/25 p-1 shadow-2xs hover:scale-110 hover:z-30 hover:shadow-lg transition-all duration-150 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-white"
    >
      {/* Top row: Number & Status Pulse */}
      <div className="w-full flex items-center justify-between px-0.5 leading-none">
        <span className="text-[11.5px] font-extrabold font-heading tracking-tight drop-shadow-xs">
          {space.id}
        </span>
        {isSupervisor ? (
          <span className="h-2 w-2 rounded-full bg-cyan-200 ring-1 ring-slate-900/40" title={`Puesto de Supervisión: ${space.doctor || 'Supervisor'}`} />
        ) : isOcupado ? (
          <span className="flex items-center gap-0.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-white animate-pulse" />
          </span>
        ) : null}
      </div>

      {/* Bottom row: Hardware Tag & Micro Icon */}
      <div className="w-full flex items-center justify-center gap-0.5 text-[8px] sm:text-[8.5px] font-bold tracking-tight uppercase leading-none opacity-95">
        <TagIcon size={9} className="shrink-0 opacity-85" />
        <span className="truncate">{tagText}</span>
      </div>

      {/* Subtle glass reflection highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[35%] bg-gradient-to-b from-white/20 to-transparent rounded-t-[4px]" />
    </button>
  );
}
