import React, { useState, useMemo, useEffect } from "react";
import {
  UserCheck, Users, CheckCircle2, XCircle, AlertCircle, Sparkles, Search,
  Filter, MapPin, Laptop, Clock, ArrowRight, Share2, FileSpreadsheet, ShieldAlert, Check, RefreshCw, Settings2, UserX
} from "lucide-react";
import SectionCard from "../common/SectionCard";
import Pill from "../common/Pill";
import { DOCTORES_EXCEL, HORARIOS, ESTADOS, BRAND, SUPERVISORES_OFICIALES } from "../../constants/tokens";
import SupervisorRosterModal from "./SupervisorRosterModal";

export default function AttendanceView({
  spaces,
  onAssignDoctor,
  onUnassignDoctor,
  onOpenCheckIn,
  onOpenLiveReport,
  initialSupId = null,
  onReleaseByHorario,
}) {
  const [selectedSupId, setSelectedSupId] = useState(
    initialSupId && SUPERVISORES_OFICIALES.find((s) => s.id === initialSupId)
      ? initialSupId
      : SUPERVISORES_OFICIALES[0].id
  );

  useEffect(() => {
    if (initialSupId && SUPERVISORES_OFICIALES.some((s) => s.id === initialSupId)) {
      setSelectedSupId(initialSupId);
    }
  }, [initialSupId]);

  const [autoSelected] = useState(!!initialSupId && SUPERVISORES_OFICIALES.some((s) => s.id === initialSupId));
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("TODOS");
  const [filterHorario, setFilterHorario] = useState("TODOS");
  const [rosterModalOpen, setRosterModalOpen] = useState(false);

  // Nóminas configuradas por supervisor: { [supId]: ["Nombre 1", "Nombre 2", ...] }
  const [rosterBySupervisor, setRosterBySupervisor] = useState(() => {
    try {
      const saved = localStorage.getItem("DOCTORSV_SUPERVISOR_ROSTERS_V2");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const currentSupervisor = useMemo(() => {
    return SUPERVISORES_OFICIALES.find((s) => s.id === selectedSupId) || SUPERVISORES_OFICIALES[0];
  }, [selectedSupId]);

  // Lista de nombres de médicos asignados al supervisor actual
  const currentRosterNames = useMemo(() => {
    if (rosterBySupervisor[currentSupervisor.id] && Array.isArray(rosterBySupervisor[currentSupervisor.id]) && rosterBySupervisor[currentSupervisor.id].length > 0) {
      return rosterBySupervisor[currentSupervisor.id];
    }
    // Si no se ha personalizado, pre-cargar según afinidad de grupo oficial de la hoja
    let defaultList = [];
    if (currentSupervisor.id === "sup-1" || currentSupervisor.id === "sup-3") {
      defaultList = DOCTORES_EXCEL.filter((d) => d.grupo === "Grupo 1").map((d) => d.nombre);
    } else if (currentSupervisor.id === "sup-2" || currentSupervisor.id === "sup-4") {
      defaultList = DOCTORES_EXCEL.filter((d) => d.grupo === "Grupo 2").map((d) => d.nombre);
    }
    // Completar hasta la capacidad del lote (ej. 40)
    const needed = currentSupervisor.totalPuestos || 40;
    if (defaultList.length < needed) {
      const remainder = DOCTORES_EXCEL.filter((d) => !defaultList.includes(d.nombre))
        .slice(0, needed - defaultList.length)
        .map((d) => d.nombre);
      defaultList = [...defaultList, ...remainder];
    }
    return defaultList.slice(0, needed);
  }, [rosterBySupervisor, currentSupervisor]);

  function handleSaveSupervisorRoster(newNames) {
    setRosterBySupervisor((prev) => {
      const next = { ...prev, [currentSupervisor.id]: newNames };
      try {
        localStorage.setItem("DOCTORSV_SUPERVISOR_ROSTERS_V2", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  // Attendance state by doctor name: { [doctorName]: "PRESENTE" | "AUSENTE" | "JUSTIFICADO" }
  const [attendanceRecords, setAttendanceRecords] = useState(() => {
    const map = {};
    spaces.forEach((s) => {
      if (s.doctor) {
        map[s.doctor] = "PRESENTE";
      }
    });
    return map;
  });

  // Espacios del lote del supervisor en el mapa
  const supervisorSpaces = useMemo(() => {
    return spaces.filter(
      (s) => s.id >= currentSupervisor.bloqueInicio && s.id <= currentSupervisor.bloqueFin
    );
  }, [spaces, currentSupervisor]);

  // Lista consolidada de médicos para el lote del supervisor
  const batchDoctors = useMemo(() => {
    const list = [];
    const addedNames = new Set();

    // 1. Médicos configurados en la nómina del turno
    currentRosterNames.forEach((name) => {
      const docObj = DOCTORES_EXCEL.find((d) => d.nombre.toLowerCase() === name.toLowerCase()) || {
        id: "EXT",
        nombre: name,
        tipo: "Planilla",
        correo: "",
        jvpm: "",
      };

      const spaceAssigned = spaces.find((s) => s.doctor && s.doctor.toLowerCase().trim() === name.toLowerCase().trim());
      const status = spaceAssigned
        ? "PRESENTE"
        : (attendanceRecords[name] || "PENDIENTE");

      list.push({
        id: docObj.id,
        nombre: docObj.nombre,
        correo: docObj.correo || "",
        jvpm: docObj.jvpm || "",
        tipo: docObj.tipo || "Planilla",
        horario: currentSupervisor.horario,
        status,
        espacio: spaceAssigned ? spaceAssigned.id : null,
      });
      addedNames.add(name.toLowerCase().trim());
    });

    // 2. Incluir también cualquier médico que se haya sentado físicamente en este lote (aunque no estuviera pre-agendado)
    supervisorSpaces.forEach((s) => {
      if (s.doctor && !addedNames.has(s.doctor.toLowerCase().trim())) {
        const docObj = DOCTORES_EXCEL.find((d) => d.nombre.toLowerCase().trim() === s.doctor.toLowerCase().trim());
        list.push({
          id: docObj?.id || "EXT",
          nombre: s.doctor,
          correo: docObj?.correo || "",
          jvpm: docObj?.jvpm || "",
          tipo: docObj?.tipo || "Planilla",
          horario: s.horario || currentSupervisor.horario,
          status: "PRESENTE",
          espacio: s.id,
          externoAlLote: true,
        });
        addedNames.add(s.doctor.toLowerCase().trim());
      }
    });

    return list;
  }, [currentRosterNames, spaces, attendanceRecords, currentSupervisor, supervisorSpaces]);

  // Médicos filtrados
  const filteredBatch = useMemo(() => {
    return batchDoctors.filter((d) => {
      const matchesSearch =
        d.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(d.id).includes(searchQuery) ||
        (d.correo && d.correo.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (d.espacio && String(d.espacio).includes(searchQuery));

      let matchesStatus = true;
      if (filterStatus === "TODOS") matchesStatus = true;
      else if (filterStatus === "SIN_PUESTO") matchesStatus = d.espacio === null;
      else matchesStatus = d.status === filterStatus;

      const matchesHorario = filterHorario === "TODOS" || d.horario === filterHorario;
      return matchesSearch && matchesStatus && matchesHorario;
    });
  }, [batchDoctors, searchQuery, filterStatus, filterHorario]);

  // Metrics
  const totalProgramados = batchDoctors.length;
  const totalPresentes = batchDoctors.filter((d) => d.status === "PRESENTE").length;
  const totalConPuesto = batchDoctors.filter((d) => d.espacio !== null).length;
  const totalSinPuesto = batchDoctors.filter((d) => d.espacio === null).length;
  const totalAusentes = batchDoctors.filter((d) => d.status === "AUSENTE").length;
  const totalJustificados = batchDoctors.filter((d) => d.status === "JUSTIFICADO").length;

  const asistenciaPct = totalProgramados > 0 ? Math.round((totalPresentes / totalProgramados) * 100) : 0;
  const inasistenciaPct = totalProgramados > 0 ? Math.round((totalAusentes / totalProgramados) * 100) : 0;
  const puestosLibresLote = supervisorSpaces.filter((s) => s.estado === "DISPONIBLE" && !s.doctor).length;

  function handleSetAttendance(docName, status) {
    setAttendanceRecords((prev) => ({
      ...prev,
      [docName]: status,
    }));
  }

  // Marcar con 1 clic a todos los médicos que no se sentaron como Ausentes
  function handleMarkUnseatedAsAbsent() {
    const unseated = batchDoctors.filter((d) => !d.espacio && d.status !== "JUSTIFICADO");
    if (unseated.length === 0) {
      alert("¡Excelente! Todos los médicos programados ya tienen puesto asignado o justificante.");
      return;
    }
    if (window.confirm(`¿Deseas marcar a los ${unseated.length} médicos que NO tienen puesto como AUSENTES en este turno?`)) {
      setAttendanceRecords((prev) => {
        const next = { ...prev };
        unseated.forEach((d) => {
          next[d.nombre] = "AUSENTE";
        });
        return next;
      });
    }
  }

  function handleQuickAssign(docName) {
    const firstFreeSpace = supervisorSpaces.find((s) => s.estado === "DISPONIBLE" && !s.doctor) ||
      spaces.find((s) => s.estado === "DISPONIBLE" && !s.doctor);

    if (!firstFreeSpace) {
      alert("No hay puestos disponibles en este bloque. Por favor revisa el mapa.");
      return;
    }

    onAssignDoctor(docName, firstFreeSpace.id, currentSupervisor.horario);
    handleSetAttendance(docName, "PRESENTE");
  }

  function handleCopyReport() {
    const horarioLabel = filterHorario !== "TODOS" ? filterHorario : currentSupervisor.horario;
    const reportText = `📊 REPORTE DE ASISTENCIA Y OCUPACIÓN · DOCTORSV\n` +
      `Supervisor: ${currentSupervisor.nombre}\n` +
      `Turno / Franja Horaria: ${horarioLabel}\n` +
      `Bloque de Puestos Asignados: Puestos #${currentSupervisor.bloqueInicio} al #${currentSupervisor.bloqueFin} (${currentSupervisor.totalPuestos} puestos)\n` +
      `------------------------------------\n` +
      `Total Programados: ${totalProgramados}${filterHorario !== "TODOS" ? ` (filtrado por ${filterHorario})` : ""}\n` +
      `Total Presentes: ${totalPresentes} (${asistenciaPct}%)\n` +
      `Total Ausentes / Inasistencia: ${totalAusentes} (${inasistenciaPct}%)\n` +
      `Puestos Ocupados con Médico: ${totalConPuesto}\n` +
      `Puestos Libres en Bloque: ${puestosLibresLote}\n` +
      `Fecha y Hora: ${new Date().toLocaleString("es-SV")}`;

    navigator.clipboard.writeText(reportText);
    alert("✅ Reporte copiado al portapapeles. Listo para pegar en Google Sheets, correo o WhatsApp.");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Banner de Auto Check-In de Médicos */}
      <div className="relative overflow-hidden rounded-3xl p-6 text-white shadow-md flex flex-wrap items-center justify-between gap-4"
        style={{ background: "linear-gradient(135deg, #003487 0%, #0048B5 60%, #0095FF 100%)" }}
      >
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md shadow-inner text-white shrink-0">
            <Sparkles size={24} />
          </span>
          <div>
            <h2 className="font-heading text-lg sm:text-xl font-extrabold tracking-tight">
              Auto Check-In & Mapeo Ágil de Puestos
            </h2>
            <p className="text-[12.5px] text-white/80 max-w-xl">
              Los médicos pueden auto-registrarse al sentarse en su cubículo. La asistencia y el puesto se sincronizan automáticamente en tiempo real.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenLiveReport && (
            <button
              onClick={onOpenLiveReport}
              className="flex items-center gap-2 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/30 text-white px-4 py-2.5 text-[13px] font-extrabold shadow-sm transition-all active:scale-95 backdrop-blur-md"
            >
              <FileSpreadsheet size={16} />
              <span>Ver Reporte en Vivo</span>
            </button>
          )}

          <button
            onClick={onOpenCheckIn}
            className="flex items-center gap-2 rounded-2xl bg-white text-[#0048B5] px-5 py-2.5 text-[13px] font-extrabold shadow-md hover:bg-slate-50 transition-all hover:scale-105 active:scale-95"
          >
            <CheckCircle2 size={16} />
            <span>Abrir Auto Check-In</span>
          </button>
        </div>
      </div>

      {/* Banner informativo cuando el supervisor fue auto-seleccionado desde el login del doctor */}
      {autoSelected && (
        <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-[12.5px] text-blue-800 shadow-2xs">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#0048B5] text-white">
            <UserCheck size={15} />
          </span>
          <div>
            <span className="font-bold">Vista auto-ajustada al último doctor logueado.</span>
            <span className="ml-1 text-blue-600">
              El lote mostrado corresponde al supervisor que el médico seleccionó al ingresar.
            </span>
          </div>
        </div>
      )}

      {/* Selector de Supervisor & Lote + Filtro de Franja Horaria */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-start gap-3">
          {/* Supervisor */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Supervisor a Cargo
            </label>
            <select
              value={selectedSupId}
              onChange={(e) => setSelectedSupId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#0095FF]/40 cursor-pointer shadow-2xs"
            >
              {SUPERVISORES_OFICIALES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} · Puesto #{s.puesto} ({s.totalPuestos} médicos)
                </option>
              ))}
            </select>
          </div>

          {/* Franja Horaria */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Franja Horaria
            </label>
            <select
              value={filterHorario}
              onChange={(e) => setFilterHorario(e.target.value)}
              className={`rounded-xl border px-3.5 py-2 text-[13px] font-bold outline-none focus:ring-2 focus:ring-[#0095FF]/40 cursor-pointer shadow-2xs transition-all ${
                filterHorario !== "TODOS"
                  ? "border-[#0048B5] bg-blue-50 text-[#0048B5]"
                  : "border-slate-200 bg-slate-50 text-slate-800"
              }`}
            >
              <option value="TODOS">Todas las franjas</option>
              {HORARIOS.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          <div className="border-l border-slate-200 pl-3">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Estación Física del Supervisor
            </span>
            <div className="flex items-center gap-1.5 font-mono-data text-[13px] font-bold text-sky-700 bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-200">
              <span>🔒 Puesto #{currentSupervisor.puesto}</span>
            </div>
          </div>

          <div className="border-l border-slate-200 pl-3">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Lote Asignado por Central
            </span>
            <div className="flex items-center gap-1.5 font-mono-data text-[13px] font-bold text-[#0048B5] bg-blue-50/80 px-3 py-1.5 rounded-xl border border-blue-200">
              <MapPin size={14} /> Puestos #{currentSupervisor.bloqueInicio} al #{currentSupervisor.bloqueFin}
            </div>
          </div>

          <div className="border-l border-slate-200 pl-3">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Turno Oficial
            </span>
            <div className="flex items-center gap-1.5 font-mono-data text-[12px] font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl">
              <Clock size={14} /> {currentSupervisor.horario}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {/* Badge de filtros activos */}
          {filterHorario !== "TODOS" && (
            <div className="flex items-center gap-1.5 rounded-xl bg-blue-50 border border-blue-200 px-3 py-1.5 text-[11.5px] font-bold text-[#0048B5]">
              <Filter size={12} />
              <span>Franja: {filterHorario}</span>
              <button
                onClick={() => setFilterHorario("TODOS")}
                className="ml-1 text-slate-400 hover:text-rose-500 font-black text-[13px] leading-none"
                title="Limpiar filtro de franja"
              >
                ×
              </button>
            </div>
          )}

          {/* Botón Liberar Franja */}
          {onReleaseByHorario && (() => {
            const franjaTarget = filterHorario !== "TODOS" ? filterHorario : currentSupervisor.horario;
            const ocupadosEnFranja = spaces.filter((s) => s.doctor && s.horario === franjaTarget).length;
            return ocupadosEnFranja > 0 ? (
              <button
                onClick={() => {
                  if (window.confirm(
                    `¿Liberar los ${ocupadosEnFranja} puesto(s) asignados en la franja "${franjaTarget}"?\n\nEsto es útil si un médico olvidó cerrar sesión o al hacer relevo de turno.`
                  )) {
                    onReleaseByHorario(franjaTarget);
                  }
                }}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-2xs transition-all active:scale-95"
                title={`Liberar todos los puestos de la franja ${franjaTarget}`}
              >
                <RefreshCw size={13} />
                <span>Liberar Franja ({ocupadosEnFranja})</span>
              </button>
            ) : null;
          })()}

          <button
            onClick={() => setRosterModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold text-[#0048B5] border border-blue-200 bg-blue-50/80 hover:bg-blue-100 shadow-2xs transition-all active:scale-95"
            title="Personaliza qué médicos están asignados a este supervisor"
          >
            <Settings2 size={15} className="text-[#0095FF]" />
            <span>Configurar Nómina ({currentRosterNames.length})</span>
          </button>

          <button
            onClick={handleCopyReport}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 shadow-2xs transition-all"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            <span>Copiar Reporte</span>
          </button>
        </div>
      </div>

      {/* Tarjetas KPIs de Asistencia en Tiempo Real */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Programados</span>
          <p className="font-heading text-2xl font-black text-slate-900 mt-1">{totalProgramados}</p>
          <span className="text-[10.5px] text-slate-400">Total en nómina del lote</span>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Presentes</span>
          <p className="font-heading text-2xl font-black text-emerald-700 mt-1">{totalPresentes}</p>
          <span className="text-[10.5px] text-emerald-600 font-semibold">{asistenciaPct}% Asistencia</span>
        </div>

        <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/50 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0048B5]">Con Puesto Mapeado</span>
          <p className="font-heading text-2xl font-black text-[#0048B5] mt-1">{totalConPuesto}</p>
          <span className="text-[10.5px] text-blue-600 font-semibold">{totalPresentes - totalConPuesto} sin puesto</span>
        </div>

        <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/50 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">Inasistencias</span>
          <p className="font-heading text-2xl font-black text-rose-700 mt-1">{totalAusentes}</p>
          <span className="text-[10.5px] text-rose-600 font-semibold">{inasistenciaPct}% Ausentismo</span>
        </div>

        <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Puestos Libres en Lote</span>
          <p className="font-heading text-2xl font-black text-amber-700 mt-1">{puestosLibresLote}</p>
          <span className="text-[10.5px] text-amber-600 font-semibold">Listos para asignar</span>
        </div>
      </div>

      {/* Grid Principal: Lista de Médicos y Visualizador del Lote */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
        {/* Tabla de Pase de Asistencia */}
        <SectionCard
          icon={UserCheck}
          title={`Pase de Asistencia · ${currentSupervisor.nombre}`}
          subtitle="Verifica la asistencia y vincula el puesto donde se sentó cada médico"
          right={
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {totalSinPuesto > 0 && (
                <button
                  type="button"
                  onClick={handleMarkUnseatedAsAbsent}
                  className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-rose-700 border border-rose-200 bg-rose-50 hover:bg-rose-100 transition shadow-2xs"
                  title="Marca a todos los médicos que aún no tienen puesto como ausentes"
                >
                  <UserX size={13} />
                  <span className="hidden sm:inline">Marcar Faltantes como Ausentes ({totalSinPuesto})</span>
                  <span className="sm:hidden">Faltantes Ausentes ({totalSinPuesto})</span>
                </button>
              )}

              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs">
                <Search size={13} className="text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar médico..."
                  className="w-32 sm:w-40 bg-transparent text-[12px] font-medium outline-none placeholder:text-slate-400"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 outline-none"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="PRESENTE">Presentes ({totalPresentes})</option>
                <option value="SIN_PUESTO">⚠️ Faltantes / Sin Puesto ({totalSinPuesto})</option>
                <option value="PENDIENTE">Pendientes</option>
                <option value="AUSENTE">Ausentes ({totalAusentes})</option>
                <option value="JUSTIFICADO">Justificados ({totalJustificados})</option>
              </select>
            </div>
          }
        >
          {/* Pestañas de Filtro Rápido (Todos vs Presentes vs Faltantes) */}
          <div className="flex items-center gap-1.5 mb-3.5 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterStatus("TODOS")}
              className={`px-3 py-1 rounded-xl text-[11.5px] font-bold transition-all ${
                filterStatus === "TODOS"
                  ? "bg-[#0048B5] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Todos ({totalProgramados})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("PRESENTE")}
              className={`px-3 py-1 rounded-xl text-[11.5px] font-bold transition-all ${
                filterStatus === "PRESENTE"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              Presentes ({totalPresentes})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("SIN_PUESTO")}
              className={`px-3 py-1 rounded-xl text-[11.5px] font-bold transition-all flex items-center gap-1 ${
                filterStatus === "SIN_PUESTO"
                  ? "bg-amber-600 text-white shadow-xs ring-2 ring-amber-400/40"
                  : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
              }`}
            >
              <AlertCircle size={12} />
              <span>Faltantes / Sin Puesto ({totalSinPuesto})</span>
            </button>
            {totalAusentes > 0 && (
              <button
                type="button"
                onClick={() => setFilterStatus("AUSENTE")}
                className={`px-3 py-1 rounded-xl text-[11.5px] font-bold transition-all ${
                  filterStatus === "AUSENTE"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100"
                }`}
              >
                Ausentes ({totalAusentes})
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[10.5px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="px-3.5 py-3">#</th>
                  <th className="px-3.5 py-3">Médico Programado</th>
                  <th className="px-3.5 py-3">Puesto Asignado</th>
                  <th className="px-3.5 py-3 text-center">Estado de Asistencia</th>
                  <th className="px-3.5 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBatch.map((doc, idx) => {
                  const isPresent = doc.status === "PRESENTE";
                  const isAbsent = doc.status === "AUSENTE";
                  const isJustified = doc.status === "JUSTIFICADO";

                  return (
                    <tr key={`${doc.id}-${doc.nombre}`} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-3.5 py-3 font-mono-data text-slate-400 text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="px-3.5 py-3 font-semibold text-slate-800">
                        <p className="leading-tight">{doc.nombre}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] font-normal text-slate-400">{doc.tipo}</span>
                          {doc.correo && (
                            <span className="text-[10px] font-mono text-[#0048B5] font-normal">
                              {doc.correo}
                            </span>
                          )}
                          {doc.jvpm && (
                            <span className="text-[9.5px] font-mono bg-slate-100 text-slate-500 px-1 py-0.2 rounded">
                              {doc.jvpm}
                            </span>
                          )}
                          {doc.externoAlLote && (
                            <span className="text-[9.5px] bg-sky-100 text-sky-800 px-1.5 rounded font-bold">
                              Se sentó en tu lote
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3.5 py-3">
                        {doc.espacio ? (
                          <span className="inline-flex items-center gap-1 font-mono-data text-[12px] font-extrabold text-[#0048B5] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                            <Laptop size={12} /> Puesto #{doc.espacio}
                          </span>
                        ) : (
                          <span className="text-[11.5px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold border border-amber-200">
                            Sin puesto asignado
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <div className="inline-flex items-center rounded-xl p-0.5 bg-slate-100 border border-slate-200">
                          <button
                            onClick={() => handleSetAttendance(doc.nombre, "PRESENTE")}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                              isPresent
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-emerald-700"
                            }`}
                          >
                            Presente
                          </button>
                          <button
                            onClick={() => {
                              handleSetAttendance(doc.nombre, "AUSENTE");
                              if (doc.espacio) onUnassignDoctor(doc.nombre, doc.espacio);
                            }}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                              isAbsent
                                ? "bg-rose-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-rose-700"
                            }`}
                          >
                            Ausente
                          </button>
                          <button
                            onClick={() => handleSetAttendance(doc.nombre, "JUSTIFICADO")}
                            className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all ${
                              isJustified
                                ? "bg-amber-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-amber-700"
                            }`}
                          >
                            Justif.
                          </button>
                        </div>
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        {doc.espacio ? (
                          <button
                            onClick={() => onUnassignDoctor(doc.nombre, doc.espacio)}
                            className="text-[11px] font-semibold text-rose-600 hover:underline"
                          >
                            Liberar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleQuickAssign(doc.nombre)}
                            className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11.5px] font-bold text-white bg-[#0048B5] hover:bg-[#003487] transition-all shadow-2xs"
                          >
                            <span>Asignar Puesto</span>
                            <ArrowRight size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Mini Mapa en Vivo del Bloque del Supervisor */}
        <SectionCard
          icon={MapPin}
          title="Puestos del Lote en Vivo"
          subtitle={`Puestos #${currentSupervisor.bloqueInicio} al #${currentSupervisor.bloqueFin}`}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-[11.5px] font-medium text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span>Capacidad: <b>{currentSupervisor.totalPuestos} puestos</b></span>
              <span className="text-emerald-700 font-bold">{puestosLibresLote} libres</span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[460px] overflow-y-auto pr-1">
              {supervisorSpaces.map((s) => {
                const isOccupied = s.estado === "OCUPADO" || !!s.doctor;
                return (
                  <div
                    key={s.id}
                    className={`p-2 rounded-xl border text-center transition-all flex flex-col justify-between h-20 ${
                      isOccupied
                        ? "bg-blue-50 border-blue-300 text-[#0048B5]"
                        : s.estado === "INHABILITADO"
                        ? "bg-slate-100 border-slate-300 text-slate-400"
                        : "bg-emerald-50 border-emerald-300 text-emerald-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-extrabold text-[12px]">#{s.id}</span>
                      <span className="text-[9px] font-bold font-mono-data opacity-75">{s.marca || "PC"}</span>
                    </div>

                    <div className="truncate text-[9.5px] font-semibold">
                      {s.doctor ? s.doctor.replace("Dr. ", "").replace("Dra. ", "") : s.estado}
                    </div>

                    <div className="text-[8px] font-bold uppercase tracking-wider">
                      {isOccupied ? "● Ocupado" : s.estado === "INHABILITADO" ? "⛔ No disp." : "○ Libre"}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>● Azul: Con Médico</span>
              <span>○ Verde: Libre</span>
              <span>⛔ Gris: Inhabilitado</span>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Modal Configurador de Nómina de Médicos Asignados al Supervisor */}
      {rosterModalOpen && (
        <SupervisorRosterModal
          supervisor={currentSupervisor}
          currentDoctorNames={currentRosterNames}
          onSaveRoster={handleSaveSupervisorRoster}
          onClose={() => setRosterModalOpen(false)}
        />
      )}
    </div>
  );
}
