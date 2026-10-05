import React, { useState } from "react";
import {
  X, AlertTriangle, ShieldCheck, Clock, Laptop, User, Check,
  FileText, Calendar, Trash2, HeartPulse, FileSpreadsheet, Palmtree,
  ArrowRightLeft, Baby, Car, AlertCircle, Edit3, RotateCcw
} from "lucide-react";

export const MOTIVOS_INASISTENCIA = [
  { id: "incapacidad", label: "Incapacidad Médica (ISSS)", icon: HeartPulse, color: "text-rose-600 bg-rose-50 border-rose-200" },
  { id: "permiso", label: "Permiso Personal / Trámite", icon: FileText, color: "text-purple-600 bg-purple-50 border-purple-200" },
  { id: "vacacion", label: "Vacación Programada", icon: Palmtree, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { id: "permuta", label: "Permuta / Cambio de Turno", icon: ArrowRightLeft, color: "text-sky-600 bg-sky-50 border-sky-200" },
  { id: "maternidad", label: "Maternidad / Paternidad", icon: Baby, color: "text-pink-600 bg-pink-50 border-pink-200" },
  { id: "transporte", label: "Falla de Transporte / Clima", icon: Car, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { id: "sin_aviso", label: "Sin Aviso / No se presentó", icon: AlertCircle, color: "text-slate-600 bg-slate-100 border-slate-300" },
  { id: "otro", label: "Otro Motivo Específico", icon: Edit3, color: "text-blue-600 bg-blue-50 border-blue-200" },
];

export default function JustifyAbsenceModal({
  isOpen,
  doctor,
  existingJustification = null,
  selectedDate = "",
  onConfirmJustify,
  onConfirmUnjustified,
  onRevertToPresent = null,
  onClose,
}) {
  if (!isOpen || !doctor) return null;

  const defaultMotivo = existingJustification?.motivo || "Incapacidad Médica (ISSS)";
  const isCustomMotivo = !MOTIVOS_INASISTENCIA.some((m) => m.label === defaultMotivo);

  const [selectedMotivoId, setSelectedMotivoId] = useState(() => {
    if (isCustomMotivo && defaultMotivo) return "otro";
    const found = MOTIVOS_INASISTENCIA.find((m) => m.label === defaultMotivo);
    return found ? found.id : "incapacidad";
  });

  const [customMotivoText, setCustomMotivoText] = useState(() => {
    return isCustomMotivo ? defaultMotivo : "";
  });

  const [observacion, setObservacion] = useState(() => {
    return existingJustification?.observacion || "";
  });

  function handleSubmitJustified(e) {
    if (e) e.preventDefault();
    let finalMotivo = "";
    if (selectedMotivoId === "otro") {
      finalMotivo = customMotivoText.trim() || "Otro motivo no especificado";
    } else {
      const match = MOTIVOS_INASISTENCIA.find((m) => m.id === selectedMotivoId);
      finalMotivo = match ? match.label : "Inasistencia Justificada";
    }

    onConfirmJustify({
      status: "JUSTIFICADO",
      motivo: finalMotivo,
      observacion: observacion.trim(),
      fecha: selectedDate,
      timestamp: Date.now(),
    });
    onClose();
  }

  function handleMarkUnjustified() {
    onConfirmUnjustified({
      status: "AUSENTE",
      motivo: "Inasistencia Injustificada",
      observacion: observacion.trim(),
      fecha: selectedDate,
      timestamp: Date.now(),
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
      >
        {/* Header con gradiente médico */}
        <div
          className="px-6 py-4.5 text-white flex items-center justify-between"
          style={{
            background: "linear-gradient(135deg, #B45309 0%, #D97706 50%, #F59E0B 100%)",
          }}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-md shadow-inner">
              <AlertTriangle size={22} />
            </span>
            <div>
              <h3 className="font-heading text-[16px] font-extrabold leading-tight">
                Control de Inasistencia y Justificación
              </h3>
              <p className="text-[11.5px] text-amber-100 font-medium">
                Especifica la razón de ausencia del médico en la sede
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 bg-slate-50/40">
          {/* Tarjeta del Médico Afectado */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Médico Programado
              </span>
              {doctor.espacio ? (
                <span className="inline-flex items-center gap-1 font-mono-data text-[11px] font-bold text-[#0048B5] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                  <Laptop size={11} /> Puesto #{doctor.espacio} (Se liberará)
                </span>
              ) : (
                <span className="text-[10.5px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  Sin puesto asignado
                </span>
              )}
            </div>

            <p className="text-[14px] font-bold text-slate-900 leading-snug">
              {doctor.nombre}
            </p>

            <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px] text-slate-500">
              {doctor.horario && (
                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono font-medium">
                  <Clock size={11} className="text-slate-400" />
                  {doctor.horario}
                </span>
              )}
              {doctor.tipo && (
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                  {doctor.tipo}
                </span>
              )}
              {selectedDate && (
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-mono font-bold">
                  <Calendar size={11} />
                  {selectedDate}
                </span>
              )}
            </div>
          </div>

          {/* Selector de Motivo */}
          <div className="space-y-2.5">
            <label className="block text-[11.5px] font-black uppercase tracking-wider text-slate-700">
              ¿Por qué se ausentó el médico? (Motivo)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MOTIVOS_INASISTENCIA.map((motivo) => {
                const isSelected = selectedMotivoId === motivo.id;
                const Icon = motivo.icon;

                return (
                  <button
                    key={motivo.id}
                    type="button"
                    onClick={() => setSelectedMotivoId(motivo.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-amber-50 border-amber-400 text-amber-950 font-bold ring-2 ring-amber-400/30 shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${motivo.color}`}>
                      <Icon size={14} />
                    </span>
                    <span className="text-[12px] leading-tight flex-1">
                      {motivo.label}
                    </span>
                    {isSelected && (
                      <span className="h-4 w-4 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0">
                        <Check size={10} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Input personalizado si selecciona "Otro" */}
            {selectedMotivoId === "otro" && (
              <div className="pt-2 animate-in fade-in duration-150">
                <input
                  type="text"
                  value={customMotivoText}
                  onChange={(e) => setCustomMotivoText(e.target.value)}
                  placeholder="Describe el motivo específico de la inasistencia..."
                  className="w-full rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-[12.5px] font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Observaciones o Notas del Supervisor */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Observaciones Adicionales / Soporte (Opcional)
            </label>
            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Ej: Presentó constancia médica digital por WhatsApp, notificó a supervisión con 2 horas de anticipación..."
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-[12px] font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20 resize-none shadow-2xs"
            />
          </div>

          {/* Nota informativa */}
          <div className="rounded-xl p-3 border border-amber-200 bg-amber-50/60 text-[11.5px] text-amber-900 flex items-start gap-2">
            <ShieldCheck size={16} className="text-amber-700 shrink-0 mt-0.5" />
            <span>
              Al guardar, si el médico tenía un puesto asignado hoy, este quedará disponible automáticamente en el mapa para reasignación o contingencia.
            </span>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="p-4 bg-white border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 w-full sm:w-auto order-2 sm:order-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-[12px] font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>

            {(doctor.status === "AUSENTE" || doctor.status === "JUSTIFICADO" || existingJustification) && onRevertToPresent && (
              <button
                type="button"
                onClick={() => {
                  onRevertToPresent(doctor);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-[11.5px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition cursor-pointer active:scale-95"
                title="Revertir y marcar como PRESENTE en sede"
              >
                <RotateCcw size={13} />
                <span>Revertir a Presente</span>
              </button>
            )}
          </div>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2 order-1 sm:order-2">
            {/* Opción 1: Dejar como Injustificado */}
            <button
              type="button"
              onClick={handleMarkUnjustified}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-[12px] transition cursor-pointer active:scale-95"
              title="Registrar como inasistencia sin justificación válida"
            >
              <AlertTriangle size={14} className="text-rose-600" />
              <span>Marcar Ausente (Sin Justificar)</span>
            </button>

            {/* Opción 2: Guardar como Justificado */}
            <button
              type="button"
              onClick={handleSubmitJustified}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-extrabold text-[12px] shadow-sm hover:shadow transition cursor-pointer active:scale-95"
              title="Guardar inasistencia debidamente justificada"
            >
              <Check size={15} />
              <span>Guardar Justificación</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
