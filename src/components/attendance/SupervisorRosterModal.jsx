import React, { useState, useMemo, useCallback } from "react";
import {
  X, Search, Check, Users, Settings2, Sparkles, Filter, Mail,
  CheckSquare, Square, AlertCircle, RefreshCw, UserCheck, Clock,
  MapPin, AlertTriangle, ArrowRightLeft, Stethoscope, Calendar, Clipboard, FileSpreadsheet
} from "lucide-react";
import { DOCTORES_EXCEL, STAFF_EXCEL, HORARIOS, getSPBlocks } from "../../constants/tokens";
import { isSameDoctor, isSameHorario, getDoctorSupervisorInfo } from "../../utils/safeHelpers";
import { parseDoctorLine, buildLookupMaps } from "../../utils/quincenaParser";

// Componente memoizado para cada tarjeta de médico: solo re-renderiza cuando su propio estado cambia
const DoctorCheckboxCard = React.memo(function DoctorCheckboxCard({
  doc,
  isChecked,
  onToggle,
  supInfo,
  currentSupervisorId,
  spBlocks,
}) {
  const isOtherSupervisor = supInfo?.supervisorId && supInfo.supervisorId !== currentSupervisorId;

  // Determinar a qué bloque de SP pertenece si aplica
  const spBlockTag = useMemo(() => {
    if (doc.grupo !== "Servicios Profesionales" || !spBlocks) return null;
    if (spBlocks["sup-1"]?.doctorNamesSet.has(doc.nombre)) return { label: "SP Emerson", color: "bg-emerald-50 text-emerald-800 border-emerald-200" };
    if (spBlocks["sup-2"]?.doctorNamesSet.has(doc.nombre)) return { label: "SP Salvador", color: "bg-teal-50 text-teal-800 border-teal-200" };
    if (spBlocks["sup-3"]?.doctorNamesSet.has(doc.nombre)) return { label: "SP Alfredo", color: "bg-blue-50 text-blue-800 border-blue-200" };
    if (spBlocks["reserva"]?.doctorNamesSet.has(doc.nombre)) return { label: "SP Reserva", color: "bg-slate-100 text-slate-700 border-slate-200" };
    return null;
  }, [doc.grupo, doc.nombre, spBlocks]);

  return (
    <div
      onClick={() => onToggle(doc.nombre, supInfo)}
      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
        isChecked
          ? "bg-blue-50/80 border-[#0095FF] ring-1 ring-[#0095FF]/30 shadow-xs"
          : isOtherSupervisor
          ? "bg-amber-50/40 border-amber-200/80 hover:bg-amber-50/70"
          : "bg-white border-slate-200 hover:bg-slate-50/90 hover:border-slate-300"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          className="shrink-0 text-[#0048B5]"
          tabIndex={-1}
        >
          {isChecked ? (
            <CheckSquare size={20} className="text-[#0048B5]" />
          ) : (
            <Square size={20} className="text-slate-300" />
          )}
        </button>

        <div className="min-w-0">
          <p className={`text-[12.5px] font-bold leading-snug truncate ${
            isChecked ? "text-[#0048B5]" : "text-slate-800"
          }`}>
            {doc.nombre}
          </p>

          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {doc.correo && (
              <span className="text-[10px] font-mono text-slate-500 truncate flex items-center gap-0.5">
                <Mail size={10} className="text-cyan-600 shrink-0" />
                {doc.correo}
              </span>
            )}
            {doc.jvpm && (
              <span className="text-[9.5px] font-mono bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-bold">
                {doc.jvpm}
              </span>
            )}
            {doc.grupo && (
              <span className="text-[9.5px] bg-blue-50 text-[#0048B5] px-1 py-0.2 rounded font-semibold">
                {doc.grupo}
              </span>
            )}

            {/* Badge de Bloque oficial de SP si aplica */}
            {spBlockTag && (
              <span className={`text-[9.5px] border px-1.5 py-0.2 rounded-md font-bold ${spBlockTag.color}`}>
                {spBlockTag.label}
              </span>
            )}

            {/* Badge de pertenencia de Supervisor */}
            {isOtherSupervisor ? (
              <span className="text-[9.5px] bg-amber-100/80 text-amber-900 border border-amber-300/60 px-1.5 py-0.2 rounded-md font-bold flex items-center gap-0.5">
                <AlertTriangle size={9} className="text-amber-600 shrink-0" />
                Con: {supInfo.supervisorNombre?.split(" ")[0]} {supInfo.supervisorNombre?.split(" ")[1] || ""}
              </span>
            ) : isChecked ? (
              <span className="text-[9.5px] bg-emerald-100/90 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded-md font-bold flex items-center gap-0.5">
                <Check size={9} className="text-emerald-700 shrink-0" />
                En tu nómina
              </span>
            ) : null}

            {/* Puesto físico si está sentado */}
            {supInfo?.spaceId && (
              <span className="text-[9.5px] bg-sky-50 text-sky-800 border border-sky-200 px-1 py-0.2 rounded font-semibold flex items-center gap-0.5">
                <MapPin size={9} className="text-sky-600 shrink-0" />
                Puesto #{supInfo.spaceId}
              </span>
            )}
          </div>
        </div>
      </div>

      <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
        #{doc.id}
      </span>
    </div>
  );
});

export default function SupervisorRosterModal({
  supervisor,
  activeFranja = null,
  currentDoctorNames = [],
  allRosters = {},
  supervisores = [],
  spaces = [],
  horarios = HORARIOS,
  selectedDate = null,
  activeQuincena = null,
  onSaveRoster,
  onClose,
}) {
  // Set of selected doctor names
  const [selectedNames, setSelectedNames] = useState(() => {
    if (currentDoctorNames && currentDoctorNames.length > 0) {
      return new Set(currentDoctorNames);
    }
    // Default: vacio si no hay doctores para evitar mezclar con otros supervisores
    return new Set();
  });

  const [transferredNames, setTransferredNames] = useState(new Set());
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("TODOS");
  const [selectedFranja, setSelectedFranja] = useState(() => activeFranja || "TODOS");
  const [filterAsignacion, setFilterAsignacion] = useState("TODOS"); // "TODOS", "MI_NOMINA", "DISPONIBLES", "OTROS_SUPERVISORES"

  // Detección de nómina oficial de la Quincena para este supervisor en la fecha seleccionada
  const quincenaDayObj = useMemo(() => {
    if (!activeQuincena?.dias || !selectedDate) return null;
    return activeQuincena.dias.find((d) => d.dateKey === selectedDate) || null;
  }, [activeQuincena, selectedDate]);

  const quincenaSupervisorRoster = useMemo(() => {
    if (!quincenaDayObj?.porSupervisor || !supervisor?.id) return null;
    return quincenaDayObj.porSupervisor[supervisor.id] || null;
  }, [quincenaDayObj, supervisor?.id]);

  const quincenaDoctorNames = quincenaSupervisorRoster?.doctorNames || [];

  function handleLoadQuincenaDoctors() {
    if (quincenaDoctorNames.length === 0) return;
    setSelectedNames(new Set(quincenaDoctorNames));
    setTransferredNames(new Set());
  }

  // Estado para el modal de pegar celda individual de Google Sheets
  const [pasteCellModalOpen, setPasteCellModalOpen] = useState(false);
  const [pastedCellText, setPastedCellText] = useState("");
  const [pastedCellPreview, setPastedCellPreview] = useState(null);

  const lookupMaps = useMemo(() => buildLookupMaps(DOCTORES_EXCEL, STAFF_EXCEL, supervisores), [supervisores]);

  function handlePastedCellChange(text) {
    setPastedCellText(text);
    if (!text.trim()) {
      setPastedCellPreview(null);
      return;
    }
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    const parsed = lines.map((l) => parseDoctorLine(l, lookupMaps.doctors)).filter(Boolean);
    setPastedCellPreview({
      total: parsed.length,
      doctores: parsed,
      reconocidos: parsed.filter((d) => d.isMatched).length,
    });
  }

  function handleApplyPastedCell() {
    if (!pastedCellPreview || pastedCellPreview.doctores.length === 0) return;
    const names = pastedCellPreview.doctores.map((d) => d.nombre);
    setSelectedNames(new Set(names));
    setPastedCellText("");
    setPastedCellPreview(null);
    setPasteCellModalOpen(false);
  }

  const capacity = supervisor?.totalPuestos ||
    (supervisor?.bloqueFin && supervisor?.bloqueInicio ? (Number(supervisor.bloqueFin) - Number(supervisor.bloqueInicio) + 1) : 40);
  const countSelected = selectedNames.size;

  // Bloques oficiales segmentados de Servicios Profesionales (SP)
  const spBlocks = useMemo(() => getSPBlocks(DOCTORES_EXCEL), []);
  const mySPBlock = spBlocks[supervisor?.id] || null;

  // Grupos disponibles con los Bloques Oficiales de SP destacados
  const availableGroups = useMemo(() => {
    return [
      { key: "TODOS", label: "TODOS" },
      { key: "Grupo 1", label: "Grupo 1" },
      { key: "Grupo 2", label: "Grupo 2" },
      { key: "SP_EMERSON", label: "SP Emerson (40)", isSP: true },
      { key: "SP_SALVADOR", label: "SP Salvador (34)", isSP: true },
      { key: "SP_ALFREDO", label: "SP Alfredo (36)", isSP: true },
      { key: "SP_RESERVA", label: "SP Reserva (26)", isSP: true },
      { key: "Servicios Profesionales", label: "Todos SP (136)" },
      { key: "Grupo 3", label: "Grupo 3" },
      { key: "Grupo General", label: "General" },
    ];
  }, []);

  const [isSaving, setIsSaving] = useState(false);

  // Mapa memoizado de información de supervisor para cada médico
  const doctorSupInfoMap = useMemo(() => {
    const map = new Map();
    DOCTORES_EXCEL.forEach((d) => {
      const info = getDoctorSupervisorInfo({
        docName: d.nombre,
        rosters: allRosters,
        supervisores,
        spaces,
        filterHorario: selectedFranja !== "TODOS" ? selectedFranja : activeFranja,
      });
      map.set(d.nombre.toLowerCase().trim(), info);
    });
    return map;
  }, [allRosters, supervisores, spaces, selectedFranja, activeFranja]);

  // Médicos filtrados por búsqueda, grupo, franja y asignación
  const filteredDoctors = useMemo(() => {
    const q = search.toLowerCase().trim();

    return DOCTORES_EXCEL.filter((d) => {
      const isChecked = selectedNames.has(d.nombre);
      const supInfo = doctorSupInfoMap.get(d.nombre.toLowerCase().trim());
      const isOtherSup = supInfo?.supervisorId && supInfo.supervisorId !== supervisor?.id;

      // Filtro por Grupo o Bloque SP
      if (selectedGroup !== "TODOS") {
        if (selectedGroup === "SP_EMERSON") {
          if (!spBlocks["sup-1"]?.doctorNamesSet.has(d.nombre)) return false;
        } else if (selectedGroup === "SP_SALVADOR") {
          if (!spBlocks["sup-2"]?.doctorNamesSet.has(d.nombre)) return false;
        } else if (selectedGroup === "SP_ALFREDO") {
          if (!spBlocks["sup-3"]?.doctorNamesSet.has(d.nombre)) return false;
        } else if (selectedGroup === "SP_RESERVA") {
          if (!spBlocks["reserva"]?.doctorNamesSet.has(d.nombre)) return false;
        } else if (d.grupo !== selectedGroup) {
          return false;
        }
      }

      // Filtro por Asignación
      if (filterAsignacion === "MI_NOMINA" && !isChecked) return false;
      if (filterAsignacion === "DISPONIBLES" && (isOtherSup || (supInfo && !isChecked))) return false;
      if (filterAsignacion === "OTROS_SUPERVISORES" && !isOtherSup) return false;

      // Filtro por Franja Horaria
      if (selectedFranja !== "TODOS") {
        const matchesShift =
          isChecked ||
          (supInfo?.horario && isSameHorario(supInfo.horario, selectedFranja)) ||
          (d.horario && (d.horario === "Turno Rotativo" || isSameHorario(d.horario, selectedFranja)));
        if (!matchesShift) return false;
      }

      // Filtro por búsqueda
      if (!q) return true;

      const matchesText =
        (d.nombre && d.nombre.toLowerCase().includes(q)) ||
        (d.correo && d.correo.toLowerCase().includes(q)) ||
        (d.jvpm && d.jvpm.toLowerCase().includes(q)) ||
        String(d.id).includes(q) ||
        (supInfo?.supervisorNombre && supInfo.supervisorNombre.toLowerCase().includes(q));

      return matchesText;
    });
  }, [search, selectedGroup, selectedFranja, filterAsignacion, selectedNames, doctorSupInfoMap, supervisor?.id, spBlocks]);

  // Carga rápida: Cargar bloque oficial de Servicios Profesionales con 1 clic
  const handleLoadSPBlock = useCallback((blockKey) => {
    const block = spBlocks[blockKey];
    if (!block) return;

    if (selectedNames.size > 0) {
      const confirmReplace = window.confirm(
        `¿Deseas cargar los ${block.total} médicos de "${block.label}"?\n\n` +
        `• Aceptar: Reemplazar tu nómina actual por los ${block.total} médicos de este bloque.\n` +
        `• Cancelar: Mantener tu selección actual.`
      );
      if (!confirmReplace) return;
    }

    setSelectedNames(new Set(block.doctorNames));
    setTransferredNames(new Set());
  }, [spBlocks, selectedNames.size]);

  // Toggle single doctor con confirmación amigable si pertenece a otro supervisor
  const handleToggleDoctor = useCallback((docName, supInfo) => {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      if (next.has(docName)) {
        next.delete(docName);
      } else {
        // Si el médico ya está asignado a otro supervisor en esta franja, pedir confirmación
        if (supInfo?.supervisorId && supInfo.supervisorId !== supervisor?.id) {
          const supName = supInfo.supervisorNombre || "otro supervisor";
          const confirmTransfer = window.confirm(
            `El/la Dr(a). ${docName} está actualmente registrado(a) con ${supName}.\n\n¿Deseas transferirlo(a) a tu nómina de este turno?`
          );
          if (!confirmTransfer) {
            return prev;
          }
          setTransferredNames((tPrev) => new Set(tPrev).add(docName));
        }
        next.add(docName);
      }
      return next;
    });
  }, [supervisor?.id]);

  // Carga rápida: Cargar médicos disponibles de mi franja activa
  function handleSelectFranjaDoctors() {
    const franjaTarget = activeFranja || selectedFranja;
    setSelectedNames((prev) => {
      const next = new Set(prev);
      DOCTORES_EXCEL.forEach((d) => {
        const supInfo = doctorSupInfoMap.get(d.nombre.toLowerCase().trim());
        const isOtherSup = supInfo?.supervisorId && supInfo.supervisorId !== supervisor?.id;
        // Solo agregar médicos no tomados por otro supervisor
        if (!isOtherSup) {
          if (
            franjaTarget === "TODOS" ||
            d.horario === "Turno Rotativo" ||
            (supInfo?.horario && isSameHorario(supInfo.horario, franjaTarget))
          ) {
            if (next.size < capacity) {
              next.add(d.nombre);
            }
          }
        }
      });
      return next;
    });
  }

  // Quick action: Select group
  function handleSelectGroup(groupName) {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      DOCTORES_EXCEL.forEach((d) => {
        if (d.grupo === groupName) {
          const supInfo = doctorSupInfoMap.get(d.nombre.toLowerCase().trim());
          const isOtherSup = supInfo?.supervisorId && supInfo.supervisorId !== supervisor?.id;
          if (!isOtherSup && next.size < capacity) {
            next.add(d.nombre);
          }
        }
      });
      return next;
    });
  }

  // Quick action: Clear all
  function handleClearAll() {
    if (window.confirm("¿Deseas deseleccionar todos los médicos de la lista?")) {
      setSelectedNames(new Set());
      setTransferredNames(new Set());
    }
  }

  function handleSave() {
    setIsSaving(true);
    try {
      const namesList = Array.from(selectedNames);
      const franjaTarget = activeFranja || selectedFranja;
      if (onSaveRoster) {
        onSaveRoster(namesList, franjaTarget, Array.from(transferredNames));
      }
      onClose();
    } catch (e) {
      console.error("Error al guardar nómina:", e);
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-5 backdrop-blur-md overflow-y-auto">
      <div
        style={{ animation: "popIn .25s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 my-auto flex flex-col max-h-[92vh]"
      >
        {/* ================= HEADER ================= */}
        <div className="relative bg-gradient-to-r from-[#00246B] via-[#0048B5] to-[#0095FF] px-6 py-5 text-white shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md text-white shadow-inner">
                <Settings2 size={22} />
              </div>
              <div>
                <h2 className="font-heading text-lg sm:text-xl font-extrabold tracking-tight text-white leading-tight">
                  Configurador de Nómina de Médicos
                </h2>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <p className="text-[12px] text-cyan-100 font-medium">
                    {supervisor?.nombre} · Estación #{supervisor?.puesto} (Lote: Puestos #{supervisor?.bloqueInicio} al #{supervisor?.bloqueFin})
                  </p>
                  {activeFranja && (
                    <span className="text-[10.5px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/30 flex items-center gap-1">
                      <Clock size={11} /> Franja: {activeFranja}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-all text-sm font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ================= BARRA DE ESTADO & CAPACIDAD ================= */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500">
                Capacidad del Lote:
              </span>
              <span className="font-heading font-black text-slate-800 text-[15px]">
                {capacity} puestos
              </span>
            </div>

            <div className="h-4 w-[1px] bg-slate-300" />

            <div className="flex items-center gap-2">
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500">
                Seleccionados:
              </span>
              <span
                className={`font-heading font-black text-[15px] px-2.5 py-0.5 rounded-lg border ${
                  countSelected === capacity
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : countSelected > capacity
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-blue-100 text-[#0048B5] border-blue-300"
                }`}
              >
                {countSelected} de {capacity}
              </span>
            </div>

            {countSelected === capacity && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                <Check size={12} /> ¡Lote completo!
              </span>
            )}
            {countSelected < capacity && (
              <span className="hidden sm:inline-flex text-[11px] font-semibold text-slate-400">
                (Faltan {capacity - countSelected} para completar)
              </span>
            )}
            {countSelected > capacity && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                <AlertCircle size={12} /> Excede capacidad por {countSelected - capacity}
              </span>
            )}
          </div>

          {/* Botones de Carga Rápida */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Botón directo de Quincena Oficial para este supervisor en esta fecha */}
            {quincenaDoctorNames.length > 0 && (
              <button
                type="button"
                onClick={handleLoadQuincenaDoctors}
                className="px-3 py-1 text-[11px] font-extrabold rounded-lg bg-[#0048B5] hover:bg-blue-700 text-white transition shadow-2xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
                title={`Cargar los ${quincenaDoctorNames.length} médicos asignados a ${supervisor?.nombre?.split(" ")[0]} en la Quincena Oficial para el ${quincenaDayObj?.label || selectedDate}`}
              >
                <Calendar size={12} className="text-cyan-300" />
                <span>📅 Quincena de Hoy ({quincenaDoctorNames.length})</span>
              </button>
            )}

            {/* Botón para pegar la celda directamente desde Google Sheets */}
            <button
              type="button"
              onClick={() => setPasteCellModalOpen(true)}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 hover:bg-indigo-100 transition shadow-2xs flex items-center gap-1 active:scale-95 cursor-pointer"
              title="Pegar celda de médicos copiada directamente desde Google Sheets"
            >
              <Clipboard size={12} className="text-indigo-600" />
              <span>📋 Pegar Celda de Sheets</span>
            </button>

            {/* Si el supervisor activo tiene un bloque oficial de SP (Emerson, Salvador o Alfredo), botón directo */}
            {mySPBlock && (
              <button
                type="button"
                onClick={() => handleLoadSPBlock(supervisor.id)}
                className="px-3 py-1 text-[11px] font-extrabold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs flex items-center gap-1.5 active:scale-95"
                title={`Cargar los ${mySPBlock.total} médicos del bloque oficial de ${mySPBlock.label}`}
              >
                <Sparkles size={12} className="text-amber-300" />
                <span>+ Cargar {mySPBlock.shortLabel} ({mySPBlock.total})</span>
              </button>
            )}

            {/* Menú desplegable para cargar cualquier Bloque de SP */}
            <div className="relative inline-flex items-center">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleLoadSPBlock(e.target.value);
                    e.target.value = "";
                  }
                }}
                defaultValue=""
                className="px-2 py-1 text-[11px] font-bold rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 hover:bg-indigo-100 transition shadow-2xs outline-none cursor-pointer"
                title="Cargar cualquiera de los bloques predefinidos de Servicios Profesionales"
              >
                <option value="" disabled>+ Bloque SP...</option>
                <option value="sup-1">Bloque 1 · Emerson (40 méd.)</option>
                <option value="sup-2">Bloque 2 · Salvador (34 méd.)</option>
                <option value="sup-3">Bloque 3 · Alfredo (36 méd.)</option>
                <option value="reserva">Bloque 4 · Reserva (26 méd.)</option>
              </select>
            </div>

            {activeFranja && (
              <button
                type="button"
                onClick={handleSelectFranjaDoctors}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-50 border border-blue-200 text-[#0048B5] hover:bg-blue-100 transition shadow-2xs flex items-center gap-1"
                title={`Cargar médicos disponibles para la franja ${activeFranja}`}
              >
                <Sparkles size={12} />
                <span>+ Mi franja</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSelectGroup("Grupo 1")}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-[#0048B5] transition shadow-2xs"
            >
              + Grupo 1
            </button>
            <button
              type="button"
              onClick={() => handleSelectGroup("Grupo 2")}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-[#0048B5] transition shadow-2xs"
            >
              + Grupo 2
            </button>
            {countSelected > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2 py-1 text-[11px] font-bold rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition shadow-2xs"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* ================= CONTROLES DE BÚSQUEDA Y FILTRADO AVANZADO ================= */}
        <div className="p-3.5 border-b border-slate-100 bg-white flex flex-col gap-2.5 shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
            {/* Campo de búsqueda */}
            <div className="relative w-full sm:w-72">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por médico, correo, supervisor..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-8 py-1.5 text-[12px] font-medium outline-none focus:bg-white focus:ring-2 focus:ring-[#0095FF] transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Selector de Franja Horaria */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Clock size={12} /> Franja:
              </span>
              <select
                value={selectedFranja}
                onChange={(e) => setSelectedFranja(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11.5px] font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="TODOS">Todas las franjas</option>
                {(horarios || HORARIOS).map((h) => (
                  <option key={h} value={h}>
                    {h} {activeFranja && isSameHorario(h, activeFranja) ? "(Mi turno activo)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filtros de Asignación y Grupo */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
                Ver:
              </span>
              <button
                type="button"
                onClick={() => setFilterAsignacion("TODOS")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  filterAsignacion === "TODOS"
                    ? "bg-[#0048B5] text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Todos ({DOCTORES_EXCEL.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterAsignacion("MI_NOMINA")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  filterAsignacion === "MI_NOMINA"
                    ? "bg-[#0048B5] text-white shadow-2xs"
                    : "bg-blue-50 text-[#0048B5] hover:bg-blue-100"
                }`}
              >
                En mi nómina ({countSelected})
              </button>
              <button
                type="button"
                onClick={() => setFilterAsignacion("DISPONIBLES")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  filterAsignacion === "DISPONIBLES"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                }`}
              >
                Disponibles
              </button>
              <button
                type="button"
                onClick={() => setFilterAsignacion("OTROS_SUPERVISORES")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  filterAsignacion === "OTROS_SUPERVISORES"
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                }`}
              >
                Con otros supervisores
              </button>
            </div>

            {/* Selector de Grupo */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                Grupo:
              </span>
              <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5 border border-slate-200 flex-wrap">
                {availableGroups.map((grp) => {
                  const key = typeof grp === "string" ? grp : grp.key;
                  const label = typeof grp === "string" ? grp : grp.label;
                  const isSelected = selectedGroup === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedGroup(key)}
                      className={`px-2 py-0.5 text-[10.5px] font-bold rounded-md transition-all whitespace-nowrap ${
                        isSelected
                          ? "bg-white text-[#0048B5] shadow-xs"
                          : grp.isSP
                          ? "text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ================= LISTA DE MÉDICOS SELECCIONABLES ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* Banner de acción rápida al filtrar un bloque de SP */}
          {selectedGroup.startsWith("SP_") && (
            <div className="mb-3 p-3 rounded-2xl bg-gradient-to-r from-indigo-50 via-blue-50 to-emerald-50 border border-indigo-200 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-2xs">
                  <Users size={14} />
                </span>
                <div>
                  <p className="text-[12px] font-bold text-slate-800">
                    Mostrando {filteredDoctors.length} médicos del bloque seleccionado
                  </p>
                  <p className="text-[10.5px] text-slate-500 font-medium">
                    Puedes cargar este bloque oficial completo a tu nómina con 1 solo clic
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const blockKey = selectedGroup === "SP_EMERSON" ? "sup-1" : selectedGroup === "SP_SALVADOR" ? "sup-2" : selectedGroup === "SP_ALFREDO" ? "sup-3" : "reserva";
                  handleLoadSPBlock(blockKey);
                }}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold transition shadow-xs flex items-center gap-1.5 active:scale-95"
              >
                <Check size={13} />
                <span>Cargar este bloque ({filteredDoctors.length})</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredDoctors.map((doc) => {
              const isChecked = selectedNames.has(doc.nombre);
              const supInfo = doctorSupInfoMap.get(doc.nombre.toLowerCase().trim());
              return (
                <DoctorCheckboxCard
                  key={doc.id}
                  doc={doc}
                  isChecked={isChecked}
                  onToggle={handleToggleDoctor}
                  supInfo={supInfo}
                  currentSupervisorId={supervisor?.id}
                  spBlocks={spBlocks}
                />
              );
            })}
          </div>

          {filteredDoctors.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <Users size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-[13px] font-medium">No se encontraron médicos con los filtros aplicados.</p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedGroup("TODOS");
                  setSelectedFranja("TODOS");
                  setFilterAsignacion("TODOS");
                }}
                className="mt-2 text-[12px] font-bold text-[#0048B5] hover:underline"
              >
                Restablecer todos los filtros
              </button>
            </div>
          )}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[12.5px] font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold text-white shadow-md hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
            style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
          >
            {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
            <span>{isSaving ? "Guardando Nómina..." : `Guardar Nómina del Turno (${countSelected} Médicos)`}</span>
          </button>
        </div>
      </div>

      {/* Mini Modal para Pegar Celda Individual de Google Sheets */}
      {pasteCellModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clipboard size={18} className="text-[#0048B5]" />
                <h3 className="text-[14px] font-black text-slate-900">
                  Pegar Celda de Google Sheets
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPasteCellModalOpen(false);
                  setPastedCellText("");
                  setPastedCellPreview(null);
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <p className="text-[11.5px] text-slate-500">
              Selecciona la celda de tu hoja que contiene la lista de médicos (ej: <span className="font-mono font-bold text-slate-700">000FFF - FABRICIO... (2:00 PM - 10:00 PM)</span>), cópiala (<kbd className="font-bold">Ctrl+C</kbd>) y pégala aquí:
            </p>

            <textarea
              value={pastedCellText}
              onChange={(e) => handlePastedCellChange(e.target.value)}
              rows={6}
              placeholder="Pega aquí el contenido de la celda..."
              className="w-full p-3 text-[11.5px] font-mono rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#0095FF]"
            />

            {pastedCellPreview && (
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] flex items-center justify-between">
                <span className="font-bold text-slate-700">
                  Médicos detectados: {pastedCellPreview.reconocidos} de {pastedCellPreview.total}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Listo para aplicar
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPasteCellModalOpen(false);
                  setPastedCellText("");
                  setPastedCellPreview(null);
                }}
                className="px-3.5 py-1.5 text-[12px] font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyPastedCell}
                disabled={!pastedCellPreview || pastedCellPreview.doctores.length === 0}
                className="px-4 py-2 text-[12px] font-bold bg-[#0048B5] hover:bg-blue-700 text-white rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>Cargar Médicos a mi Nómina</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
