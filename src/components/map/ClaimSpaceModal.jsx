import React from "react";
import {
  Laptop, CheckCircle2, User, Clock, Shield, AlertTriangle, Droplets,
  Wrench, XCircle, LogOut, Check, X, ArrowRight
} from "lucide-react";
import { ESTADOS } from "../../constants/tokens";

export default function ClaimSpaceModal({
  space,
  currentUser,
  onClose,
  onConfirmClaim,
  onReleaseMySpace,
}) {
  if (!space) return null;

  const isMySpace = currentUser && space.doctor && space.doctor.toLowerCase() === currentUser.name.toLowerCase();
  const isAvailable = space.estado === "DISPONIBLE" && !space.doctor;
  const isOccupiedByOther = space.doctor && !isMySpace;
  const isSupervisorSpace = [135, 136, 137, 138, 1].includes(space.id) || space.categoria === "Supervisores";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "popIn .2s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200"
      >
        {/* Header con gradiente según estado */}
        <div
          className="px-6 py-4 text-white flex items-center justify-between"
          style={{
            background: isMySpace
              ? "linear-gradient(135deg, #003487 0%, #0048B5 60%, #0095FF 100%)"
              : isAvailable
              ? "linear-gradient(135deg, #14532D 0%, #15803D 60%, #22C55E 100%)"
              : isSupervisorSpace
              ? "linear-gradient(135deg, #0369A1 0%, #0284C7 60%, #38BDF8 100%)"
              : "linear-gradient(135deg, #334155 0%, #475569 100%)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-md">
              <Laptop size={20} />
            </span>
            <div>
              <p className="font-heading text-lg font-bold">
                Puesto de Trabajo #{space.id}
              </p>
              <p className="text-[11.5px] text-white/85">
                {space.marca || "PC"} · {space.modelo || "Estación de Telemedicina"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* CASO 1: Es el puesto actual del doctor logueado */}
          {isMySpace ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-center">
                <span className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-[#0048B5] mb-2 ring-4 ring-blue-50">
                  <CheckCircle2 size={26} />
                </span>
                <h4 className="font-heading text-base font-bold text-slate-800">
                  ¡Este es tu puesto de trabajo actual!
                </h4>
                <p className="text-[12px] text-slate-600 mt-1">
                  Estás registrado en este cubículo durante tu turno de <strong>{space.horario || currentUser.shift}</strong>.
                </p>
              </div>

              {/* Botón para liberar puesto / terminar jornada */}
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`¿Estás seguro de finalizar tu jornada en el Puesto #${space.id}? El equipo volverá a estar DISPONIBLE para el siguiente turno.`)) {
                    onReleaseMySpace();
                    onClose();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-[13px] font-bold text-white shadow-md bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all"
              >
                <LogOut size={16} />
                <span>Finalizar Jornada (Liberar Puesto #{space.id})</span>
              </button>
            </div>
          ) : isAvailable ? (
            /* CASO 2: Puesto Disponible para reclamar */
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 flex items-start gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                  <Check size={18} />
                </span>
                <div>
                  <p className="font-heading text-[14px] font-bold text-emerald-900">
                    Puesto Disponible para Asignación
                  </p>
                  <p className="text-[12px] text-emerald-800 mt-0.5">
                    Este equipo está listo y equipado con todos sus periféricos para iniciar tu guardia.
                  </p>
                </div>
              </div>

              {/* Detalle de equipamiento */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 text-[12px] space-y-2">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-slate-400 font-bold uppercase text-[10.5px]">Médico Asignado</span>
                  <span className="font-bold text-slate-800">{currentUser?.name || "Dr(a). Médico"}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-slate-400 font-bold uppercase text-[10.5px]">Turno</span>
                  <span className="font-semibold text-slate-700">{currentUser?.shift || "Turno Actual"}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-slate-400 font-bold uppercase text-[10.5px]">Equipo</span>
                  <span className="font-semibold text-slate-700">{space.marca} · Activo: {space.activoPc || `PC-${space.id}`}</span>
                </div>
              </div>

              {currentUser?.spaceId && currentUser.spaceId !== space.id && (
                <p className="text-[11.5px] text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                  ⚠️ <em>Nota:</em> Ya tienes asignado el <strong>Puesto #{currentUser.spaceId}</strong>. Al confirmar, tu puesto anterior quedará liberado automáticamente.
                </p>
              )}

              {/* Confirm Claim Button */}
              <button
                type="button"
                onClick={() => {
                  onConfirmClaim(space);
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-[13.5px] font-bold text-white shadow-md hover:brightness-110 active:scale-95 transition-all"
                style={{ background: "linear-gradient(135deg, #15803D 0%, #16A34A 50%, #22C55E 100%)" }}
              >
                <CheckCircle2 size={16} />
                <span>Confirmar y Ocupar Puesto #{space.id}</span>
              </button>
            </div>
          ) : isOccupiedByOther ? (
            /* CASO 3: Ocupado por otro doctor */
            <div className="space-y-4 text-center">
              <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4">
                <span className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-[#0048B5] mb-2">
                  <User size={24} />
                </span>
                <h4 className="font-heading text-base font-bold text-slate-800">
                  Puesto en Uso por Otro Médico
                </h4>
                <p className="text-[13px] font-bold text-[#0048B5] mt-1">
                  {space.doctor}
                </p>
                <p className="text-[11.5px] text-slate-500 mt-1">
                  Horario: {space.horario || "Turno Activo"}
                </p>
              </div>
              <p className="text-[12px] text-slate-500">
                Por favor selecciona otro de los puestos marcados en <strong>verde (Disponible)</strong> en el mapa.
              </p>
            </div>
          ) : (
            /* CASO 4: Incompleto, Inhabilitado, Vacío o Supervisor */
            <div className="space-y-4 text-center">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="font-heading text-base font-bold text-slate-800">
                  Puesto {space.estado}
                </h4>
                <p className="text-[12px] text-slate-500 mt-1">
                  {isSupervisorSpace
                    ? "Este es un puesto exclusivo para supervisores médicos."
                    : space.observaciones || "Este puesto no se encuentra disponible para asignación en este momento."}
                </p>
              </div>
              <p className="text-[12px] text-slate-500">
                Por favor selecciona un puesto con color <strong>verde (Disponible)</strong>.
              </p>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
