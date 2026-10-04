import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X, Laptop, Monitor, Mouse, Headphones, Cable, History, Save, Sparkles, UserX, Droplets, Wrench, Shield, Search, UserCheck
} from "lucide-react";
import { ESTADOS, MARCAS, HORARIOS, DOCTORES_EXCEL, STAFF_EXCEL, SUPERVISORES_OFICIALES } from "../../constants/tokens";

export default function SpaceDetailModal({
  space,
  onClose,
  onSave,
  historial = [],
  supervisores = [],
  horarios = HORARIOS,
  onOpenSupervisorConfig = null,
  onUpdateSupervisorOfficialShift = null,
  isMaster = false,
  spaces = [],
  customStaff = [],
}) {
  const mountTimeRef = useRef(Date.now());
  const backdropMouseDownRef = useRef(false);
  const [form, setForm] = useState({ ...space });
  const [doctorSearch, setDoctorSearch] = useState("");

  useEffect(() => {
    setForm({ ...space });
  }, [space]);

  if (!space) return null;

  function updateField(patch) {
    setForm((prev) => {
      const next = { ...prev, ...patch };

      // Si tiene médico asignado o estados administrativos bloqueados, mantenerlos
      if (next.doctor) {
        next.estado = "OCUPADO";
        return next;
      }
      if (
        next.estado === "INHABILITADO" ||
        next.estado === "REPARACION" ||
        next.estado === "RESERVADO"
      ) {
        return next;
      }

      // Evaluar completitud según equipamiento actual
      const hasPc = Boolean(next.marca && next.marca !== "NO PC");
      const hasMonitor = Boolean(next.monitor && (next.monitor.marca || next.monitor.activo || next.monitor === true));
      const hasMouse = Boolean(next.mouse);
      const hasHeadset = Boolean(next.headset);

      if (!hasPc) {
        next.estado = "VACIO";
      } else if (!hasMouse || !hasHeadset || !hasMonitor) {
        next.estado = "INCOMPLETO";
      } else {
        next.estado = "DISPONIBLE";
      }

      return next;
    });
  }

  function handleSave() {
    onSave(form);
    onClose();
  }

  const spaceHistory = historial
    .filter((h) => String(h.espacio) === String(space.id) || String(h.destino) === String(space.id) || String(h.origen) === String(space.id))
    .slice(0, 4);

  const matchedSupervisor = supervisores?.find(
    (s) => Number(s.puesto) === Number(space.id)
  );

  // Lista unificada de médicos de toda la nómina oficial (Supervisores, Planilla, Servicios Profesionales, SSM)
  const allDoctors = useMemo(() => {
    const map = new Map();

    // 1. Supervisores oficiales
    (supervisores && supervisores.length > 0 ? supervisores : SUPERVISORES_OFICIALES).forEach((sup) => {
      if (sup?.nombre) {
        const key = sup.nombre.trim().toUpperCase();
        if (!map.has(key)) {
          map.set(key, {
            nombre: key,
            categoria: "Supervisores",
            rol: sup.rol || "Supervisor",
            horarioDefault: sup.horario || "02:00 PM – 10:00 PM",
            puestoOficial: sup.puesto || null,
          });
        }
      }
    });

    // 2. Personal SSM / Administrativo (STAFF_EXCEL)
    (STAFF_EXCEL || []).forEach((st) => {
      if (st?.nombre) {
        const key = st.nombre.trim().toUpperCase();
        if (!map.has(key)) {
          map.set(key, {
            nombre: key,
            categoria: st.categoria || "Personal SSM",
            rol: st.rol || "Personal",
            horarioDefault: "07:00 AM – 12:00 PM",
            puestoOficial: null,
          });
        }
      }
    });

    // 3. Nómina oficial de médicos (DOCTORES_EXCEL)
    (DOCTORES_EXCEL || []).forEach((doc) => {
      if (doc?.nombre) {
        const key = doc.nombre.trim().toUpperCase();
        if (!map.has(key)) {
          const cat = doc.tipo || (doc.grupo === "Servicios Profesionales" ? "Servicios Profesionales" : "Planilla");
          map.set(key, {
            nombre: key,
            categoria: cat,
            rol: doc.tipo === "Planilla" ? "Médico Planilla" : (doc.tipo || "Médico"),
            horarioDefault: doc.horario && doc.horario !== "Turno Rotativo" ? doc.horario : "07:00 AM – 12:00 PM",
            puestoOficial: null,
          });
        }
      }
    });

    // 4. Custom staff agregado manualmente
    (customStaff || []).forEach((cs) => {
      if (cs?.nombre) {
        const key = cs.nombre.trim().toUpperCase();
        if (!map.has(key)) {
          map.set(key, {
            nombre: key,
            categoria: cs.categoria || "Personal Agregado",
            rol: cs.rol || "Personal",
            horarioDefault: cs.horario || "07:00 AM – 12:00 PM",
            puestoOficial: null,
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [supervisores, customStaff]);

  // Mapa de cubículos actualmente ocupados por otros médicos
  const occupiedDoctorsMap = useMemo(() => {
    const map = new Map();
    (spaces || []).forEach((s) => {
      if (s?.doctor && Number(s.id) !== Number(space?.id)) {
        map.set(s.doctor.trim().toUpperCase(), Number(s.id));
      }
    });
    return map;
  }, [spaces, space?.id]);

  // Médicos filtrados por búsqueda
  const filteredDoctors = useMemo(() => {
    if (!doctorSearch.trim()) return allDoctors;
    const q = doctorSearch.trim().toUpperCase();
    return allDoctors.filter(
      (d) =>
        d.nombre.includes(q) ||
        (d.categoria && d.categoria.toUpperCase().includes(q))
    );
  }, [allDoctors, doctorSearch]);

  const hasPc = Boolean(form.marca && form.marca !== "NO PC");
  const hasMonitor = Boolean(form.monitor && (form.monitor.marca || form.monitor.activo || form.monitor === true));
  const hasMouse = Boolean(form.mouse);
  const hasHeadset = Boolean(form.headset);

  const missingPeripherals = [];
  if (!hasMouse) missingPeripherals.push("Mouse óptico");
  if (!hasHeadset) missingPeripherals.push("Headset");
  if (!hasMonitor) missingPeripherals.push("Monitor");

  const handleBackdropMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      backdropMouseDownRef.current = true;
    }
  };

  const handleBackdropClick = (e) => {
    if (Date.now() - mountTimeRef.current < 450) return;
    if (e.target === e.currentTarget && backdropMouseDownRef.current) {
      onClose();
    }
    backdropMouseDownRef.current = false;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "popIn .2s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl border border-slate-200"
      >
        {/* Header Modal in DoctorSV Gradient */}
        <div
          className="flex items-center justify-between px-6 py-4 text-white"
          style={{ background: "linear-gradient(135deg, #003487 0%, #0048B5 60%, #0095FF 100%)" }}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md font-heading text-lg font-bold text-white shadow-inner">
              #{form.id}
            </span>
            <div>
              <p className="font-heading text-[16px] font-bold">Puesto de Consulta #{form.id}</p>
              <p className="text-[11.5px] text-white/75">Último movimiento registrado: {form.ultimoMovimiento || "N/A"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-5 p-6">
          {/* Tarjeta de Estación Oficial de Supervisión (si este puesto es de un supervisor) */}
          {matchedSupervisor && (
            <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/90 p-3.5 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[#0048B5] font-heading font-bold text-[13px]">
                  <Shield size={16} className="text-[#0048B5]" />
                  <span>Estación Física de Supervisión</span>
                </div>
                <span className="text-[10px] font-mono-data font-bold bg-[#0048B5] text-white px-2 py-0.5 rounded-full shadow-xs">
                  Puesto #{matchedSupervisor.puesto}
                </span>
              </div>
              <div className="text-[12px] text-slate-700 bg-white/70 p-2.5 rounded-xl border border-blue-100">
                <p className="font-bold text-slate-900 text-[13px]">{matchedSupervisor.nombre}</p>
                <p className="text-[11.5px] text-slate-500 font-medium">{matchedSupervisor.rol}</p>
                <p className="text-[11px] text-[#0048B5] mt-1 font-semibold">
                  Lote a cargo: Puestos #{matchedSupervisor.bloqueInicio} al #{matchedSupervisor.bloqueFin} ({matchedSupervisor.totalPuestos || 40} médicos)
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-blue-200/60">
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="text-slate-600 font-bold text-[11px] uppercase tracking-wider">Turno Oficial:</span>
                  {isMaster ? (
                    <select
                      value={matchedSupervisor.horario || ""}
                      onChange={(e) => {
                        if (onUpdateSupervisorOfficialShift) {
                          onUpdateSupervisorOfficialShift(matchedSupervisor.id, e.target.value);
                        }
                      }}
                      className="rounded-lg border border-blue-300 bg-white px-2.5 py-1 text-[11.5px] font-bold text-[#0048B5] shadow-xs cursor-pointer focus:ring-2 focus:ring-[#0048B5] outline-none"
                      title="Cambiar turno oficial del supervisor (Doctor Master)"
                    >
                      {horarios.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200 font-mono-data">
                      {matchedSupervisor.horario}
                    </span>
                  )}
                </div>
                {isMaster && onOpenSupervisorConfig && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSupervisorConfig();
                    }}
                    className="text-[11px] font-bold text-[#0048B5] hover:text-blue-900 hover:underline flex items-center gap-1 bg-blue-100/60 px-2 py-1 rounded-lg border border-blue-200 transition"
                  >
                    <span>Configurar Lotes & Turnos</span> →
                  </button>
                )}
              </div>
            </div>
          )}
          {/* Quick Action Bar for instant incidents & shift change */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
            <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
              ⚡ Acciones Inmediatas (1 Clic)
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  updateField({
                    estado: "INHABILITADO",
                    doctor: null,
                    observaciones: form.observaciones ? `${form.observaciones} | INHABILITADO POR FILTRACIÓN (${new Date().toLocaleDateString("es-SV")})` : `INHABILITADO POR FILTRACIÓN (${new Date().toLocaleDateString("es-SV")})`,
                  });
                }}
                className="flex items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 px-3 py-1.5 text-[11.5px] font-bold text-blue-800 hover:bg-blue-100 transition shadow-2xs active:scale-95"
              >
                <Droplets size={13} className="text-blue-600" />
                <span>💧 Inhabilitar por Filtración</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  updateField({
                    estado: "REPARACION",
                    doctor: null,
                    observaciones: form.observaciones ? `${form.observaciones} | DAÑO / REPARACIÓN IT (${new Date().toLocaleDateString("es-SV")})` : `EQUIPO EN REPARACIÓN IT (${new Date().toLocaleDateString("es-SV")})`,
                  });
                }}
                className="flex items-center gap-1.5 rounded-xl border border-purple-300 bg-purple-50 px-3 py-1.5 text-[11.5px] font-bold text-purple-800 hover:bg-purple-100 transition shadow-2xs active:scale-95"
              >
                <Wrench size={13} className="text-purple-600" />
                <span>🔧 Enviar a Reparación</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  updateField({
                    estado: "DISPONIBLE",
                    doctor: null,
                    horario: null,
                    categoria: Number(form.id) === 1 ? null : form.categoria,
                    marca: form.marca && form.marca !== "NO PC" ? form.marca : "DELL",
                    modelo: form.modelo || "OptiPlex 3080",
                    observaciones: form.observaciones ? `${form.observaciones} | Turno liberado` : "",
                  });
                }}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[11.5px] font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs active:scale-95"
              >
                <span>🔄 Liberar Turno (Desocupar)</span>
              </button>
            </div>
          </div>

          {/* Quick State Selector */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Estado Detallado del Puesto
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(ESTADOS).map((k) => {
                const isCurrent = form.estado === k;
                const e = ESTADOS[k];
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      const newDoctor = k === "OCUPADO" ? (form.doctor || "") : null;
                      const newHorario = k === "OCUPADO" ? (form.horario || (horarios && horarios[0]) || "07:00 AM – 12:00 PM") : null;
                      const newMarca = (k === "DISPONIBLE" && (!form.marca || form.marca === "NO PC")) ? "DELL" : form.marca;
                      const newModelo = (k === "DISPONIBLE" && !form.modelo) ? "OptiPlex 3080" : form.modelo;
                      updateField({
                        estado: k,
                        doctor: newDoctor,
                        horario: newHorario,
                        marca: newMarca,
                        modelo: newModelo,
                        categoria: Number(form.id) === 1 ? null : form.categoria,
                      });
                    }}
                    className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition-all duration-150 active:scale-95 shadow-2xs"
                    style={{
                      borderColor: isCurrent ? e.color : (e.border || "#E2E8F0"),
                      background: isCurrent ? e.color : e.soft,
                      color: isCurrent ? "#FFFFFF" : (e.textDark || e.color),
                    }}
                  >
                    <e.icon size={13} /> {e.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tarjeta de Asignación de Médico de Nómina & Turno (Visible para TODOS los cubículos) */}
          <div
            className={`rounded-2xl p-4 border transition-all duration-200 ${
              form.doctor
                ? "border-rose-200 bg-rose-50/70 shadow-2xs"
                : "border-blue-200/90 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 shadow-2xs"
            }`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <p
                className={`text-[11.5px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  form.doctor ? "text-rose-900" : "text-[#0048B5]"
                }`}
              >
                <Sparkles size={14} className={form.doctor ? "text-rose-600" : "text-[#0095FF]"} />
                <span>{form.doctor ? "Médico Asignado & Turno" : "Asignar Médico de la Nómina & Turno"}</span>
              </p>

              {form.doctor ? (
                <span className="text-[10.5px] font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
                  <span>Puesto Ocupado</span>
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-slate-500 bg-white/90 px-2 py-0.5 rounded-full border border-slate-200">
                  {allDoctors.length} en nómina
                </span>
              )}
            </div>

            {/* Buscador rápido de médico para no scrollear 150 nombres */}
            <div className="mb-2.5">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  placeholder="Filtrar médico por nombre o categoría (ej. Cristian, Planilla)..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 bg-white text-[11.5px] placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#0095FF]/40 shadow-2xs font-medium"
                />
                {doctorSearch && (
                  <button
                    type="button"
                    onClick={() => setDoctorSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                  Médico en turno
                </label>
                <select
                  value={form.doctor || ""}
                  onChange={(e) => {
                    const docName = e.target.value;
                    if (docName) {
                      const foundDoc = allDoctors.find(
                        (d) => d.nombre.toUpperCase() === docName.toUpperCase()
                      );
                      const shiftToSet =
                        form.horario ||
                        foundDoc?.horarioDefault ||
                        (horarios && horarios[0]) ||
                        "07:00 AM – 12:00 PM";
                      updateField({
                        doctor: foundDoc ? foundDoc.nombre : docName,
                        horario: shiftToSet,
                        estado: "OCUPADO",
                      });
                    } else {
                      updateField({
                        doctor: null,
                        horario: null,
                      });
                    }
                  }}
                  className={`w-full rounded-xl border bg-white px-3 py-2 text-[12px] font-medium shadow-2xs transition-all ${
                    form.doctor
                      ? "border-rose-300 text-rose-950 font-bold focus:ring-2 focus:ring-rose-400"
                      : "border-slate-200 text-slate-800 focus:ring-2 focus:ring-[#0095FF]/40"
                  }`}
                >
                  <option value="">— Seleccionar médico de la nómina —</option>
                  {form.doctor &&
                    !filteredDoctors.some(
                      (d) => d.nombre.toUpperCase() === form.doctor.toUpperCase()
                    ) && (
                      <option value={form.doctor}>
                        {form.doctor} (Médico Asignado Actual)
                      </option>
                    )}
                  {filteredDoctors.map((doc) => {
                    const otherSpace = occupiedDoctorsMap.get(doc.nombre.toUpperCase());
                    const isHere = form.doctor && form.doctor.toUpperCase() === doc.nombre.toUpperCase();
                    return (
                      <option key={doc.nombre} value={doc.nombre}>
                        {doc.nombre} — {doc.categoria}
                        {isHere
                          ? " (En este puesto)"
                          : otherSpace
                          ? ` [Ocupando Puesto #${otherSpace}]`
                          : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                  Horario de atención
                </label>
                <select
                  value={form.horario || ""}
                  onChange={(e) => updateField({ horario: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium shadow-2xs focus:ring-2 focus:ring-[#0095FF]/40"
                >
                  <option value="">— Seleccionar horario —</option>
                  {(horarios || HORARIOS).map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Botón directo para quitar al médico de este puesto */}
            {form.doctor && (
              <div className="mt-3 pt-2.5 border-t border-rose-200/80 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-rose-800 font-medium truncate max-w-full">
                  Asignado a este puesto: <strong className="font-bold">{form.doctor}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    updateField({
                      doctor: null,
                      horario: null,
                      estado: "DISPONIBLE",
                      marca: (form.marca && form.marca !== "NO PC") ? form.marca : "DELL",
                      modelo: form.modelo || "OptiPlex 3080",
                      categoria: Number(form.id) === 1 ? null : form.categoria,
                      observaciones: form.observaciones ? `${form.observaciones} | Puesto desocupado por Master/Supervisor` : "Turno liberado",
                    });
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[11.5px] font-bold text-rose-700 bg-white hover:bg-rose-100 border border-rose-300 shadow-2xs active:scale-95 transition-all cursor-pointer ml-auto"
                >
                  <UserX size={14} className="text-rose-600" />
                  <span>Quitar Médico (Dejar Puesto Disponible)</span>
                </button>
              </div>
            )}
          </div>

          {/* Equipment Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* PC */}
            <div className="rounded-2xl border border-slate-200 p-3.5 bg-slate-50/70">
              <p className="mb-2.5 flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wider text-[#0048B5]">
                <Laptop size={14} /> Computadora (PC)
              </p>
              <label className="mb-1 block text-[10.5px] font-semibold text-slate-500">Marca</label>
              <select
                value={form.marca || ""}
                onChange={(e) => updateField({ marca: e.target.value || null })}
                className="mb-2 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-medium"
              >
                <option value="">— Sin PC —</option>
                {MARCAS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <label className="mb-1 block text-[10.5px] font-semibold text-slate-500">Modelo</label>
              <input
                type="text"
                value={form.modelo || ""}
                onChange={(e) => updateField({ modelo: e.target.value })}
                placeholder="Ej. OptiPlex 3080"
                className="mb-2 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono-data text-[12px]"
              />

              <label className="mb-1 block text-[10.5px] font-semibold text-slate-500">Código de Activo</label>
              <input
                type="text"
                value={form.activoPc || ""}
                onChange={(e) => updateField({ activoPc: e.target.value })}
                placeholder="Ej. PC-1045"
                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono-data text-[12px]"
              />
            </div>

            {/* Monitor & Peripherals */}
            <div className="rounded-2xl border border-slate-200 p-3.5 bg-slate-50/70">
              <p className="mb-2.5 flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wider text-[#0095FF]">
                <Monitor size={14} /> Monitor & Periféricos
              </p>
              <label className="mb-1 block text-[10.5px] font-semibold text-slate-500">Marca Monitor</label>
              <select
                value={form.monitor?.marca || ""}
                onChange={(e) =>
                  updateField({
                    monitor: e.target.value
                      ? { ...(form.monitor || {}), marca: e.target.value }
                      : null,
                  })
                }
                className="mb-2 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-medium"
              >
                <option value="">— Sin monitor —</option>
                {MARCAS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <label className="mb-1 block text-[10.5px] font-semibold text-slate-500">Activo Monitor</label>
              <input
                type="text"
                value={form.monitor?.activo || ""}
                onChange={(e) =>
                  updateField({
                    monitor: form.monitor
                      ? { ...form.monitor, activo: e.target.value }
                      : { marca: "DELL", activo: e.target.value },
                  })
                }
                placeholder="Ej. MON-2045"
                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono-data text-[12px]"
              />

              <div className="mt-3 pt-2.5 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <span>Periféricos & Accesorios</span>
                    <span className="text-[9.5px] font-bold font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded" title="Sincroniza en Google Sheets como 1 (tiene) y 0 (no tiene)">
                      Sheets 1/0
                    </span>
                  </p>
                  <span className="text-[10px] text-slate-400 font-medium">1 Clic para alternar</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["mouse", Mouse, "Mouse"],
                    ["headset", Headphones, "Headset"],
                    ["hub", Cable, "Hub USB"],
                  ].map(([key, Icon, label]) => {
                    const isChecked = !!form[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => updateField({ [key]: !isChecked })}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all duration-150 cursor-pointer shadow-2xs active:scale-95 ${
                          isChecked
                            ? "bg-emerald-50 border-emerald-300 text-emerald-800 ring-1 ring-emerald-400/30"
                            : "bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200/70"
                        }`}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <Icon size={14} className={isChecked ? "text-emerald-600" : "text-slate-400"} />
                          <span className="text-[11.5px] font-bold">{label}</span>
                        </div>
                        <span
                          className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full ${
                            isChecked ? "bg-emerald-200/80 text-emerald-900" : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {isChecked ? "✓ En puesto" : "✗ Falta"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Banner de Estado de Equipamiento */}
                <div className="mt-2.5">
                  {missingPeripherals.length > 0 && hasPc ? (
                    <div className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium">
                      <span className="font-bold text-amber-700">⚠️ Incompleto:</span>
                      <span>Falta {missingPeripherals.join(", ")}</span>
                    </div>
                  ) : !hasPc ? (
                    <div className="flex items-center gap-1.5 p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-[11px] font-medium">
                      <span className="font-bold text-rose-700">❌ Vacío:</span>
                      <span>Sin computadora asignada en este puesto</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-medium">
                      <span className="font-bold text-emerald-700">✅ Completo:</span>
                      <span>Puesto 100% equipado y operativo</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Observations & Ubicación Anterior */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Observaciones / Registro de Incidencia
              </p>
              {form.ubicacionAnterior && (
                <span className="text-[10.5px] font-semibold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                  Ubicación Anterior: Puesto #{form.ubicacionAnterior}
                </span>
              )}
            </div>
            <textarea
              value={form.observaciones || ""}
              onChange={(e) => updateField({ observaciones: e.target.value })}
              rows={2}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12.5px] outline-none focus:ring-2 focus:ring-[#0095FF]/50"
              placeholder="Detalles sobre el cubículo, necesidad de repuestos, etc..."
            />
          </div>

          {/* Space History */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
            <p className="mb-2 flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wider text-slate-600">
              <History size={13} className="text-[#0048B5]" /> Bitácora Reciente de este Puesto
            </p>
            <ul className="space-y-1.5">
              {spaceHistory.map((h, i) => (
                <li key={i} className="flex items-center gap-2 text-[11.5px] text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0095FF]" />
                  <span className="font-mono-data text-slate-400">{h.fecha}</span> — {h.accion} de {h.equipo} ({h.obs || h.falla})
                </li>
              ))}
              {spaceHistory.length === 0 && (
                <li className="text-[11.5px] italic text-slate-400">Sin movimientos registrados recientemente.</li>
              )}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sincroniza Firestore y Google Sheets</span>
            </span>
            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 rounded-xl px-5 py-2 text-[12.5px] font-semibold text-white transition hover:brightness-110 shadow-sm active:scale-95 cursor-pointer"
                style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
              >
                <Save size={14} /> Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
