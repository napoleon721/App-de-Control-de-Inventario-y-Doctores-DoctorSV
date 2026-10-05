import React, { useState, useMemo } from "react";
import {
  Search, Filter, DoorOpen, LayoutGrid, Monitor, ShieldCheck, Sparkles,
  Layers, CheckCircle2, AlertTriangle, Droplets, XCircle, Wrench, Lock, ArrowDown, ArrowUp,
  Clock, RefreshCw, UserCheck, LogOut, Laptop, User, Shield
} from "lucide-react";
import ExactCubicle from "./ExactCubicle";
import { ESTADOS, MARCAS, HORARIOS, SUPERVISORES_OFICIALES, BODEGA_TIPOS } from "../../constants/tokens";
import { isSameDoctor, isSameHorario, getDoctorSupervisorInfo } from "../../utils/safeHelpers";

export default function SpaceMap({
  spaces,
  counts,
  onSelectSpace,
  onReleaseShift,
  onReleaseByHorario,
  onReleaseLote,
  currentUser,
  onReleaseMySpace,
  horarios = HORARIOS,
  supervisores = SUPERVISORES_OFICIALES,
  rosterBySupervisor = {},
  bodegaStock = BODEGA_TIPOS,
}) {
  const isDoctorRole = currentUser?.role === "DOCTOR";
  const isMasterRole = currentUser?.role === "MASTER";
  const isSupervisorRole = currentUser?.role === "SUPERVISOR";
  const [query, setQuery] = useState("");
  const [filterEstado, setFilterEstado] = useState("TODOS");
  const [filterTurno, setFilterTurno] = useState("TODOS");
  const [filterSupervisor, setFilterSupervisor] = useState("TODOS");
  const [releaseHorarioTarget, setReleaseHorarioTarget] = useState("");

  const currentDoctorSup = useMemo(() => {
    if (!currentUser?.supervisorId) return null;
    return (supervisores || SUPERVISORES_OFICIALES).find((s) => s.id === currentUser.supervisorId) || null;
  }, [currentUser?.supervisorId, supervisores]);

  // Fast map lookup
  const spaceMap = useMemo(() => {
    const map = {};
    spaces.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [spaces]);

  function renderCubicle(id) {
    const space = spaceMap[id];
    if (!space) return <div className="h-[43px] w-full" />;

    const matchesQuery =
      query.trim() === "" ||
      String(space.id).includes(query) ||
      (space.doctor && String(space.doctor).toLowerCase().includes(query.toLowerCase())) ||
      (space.marca && String(space.marca).toLowerCase().includes(query.toLowerCase()));
    const matchesEstado = filterEstado === "TODOS" || space.estado === filterEstado;
    const matchesTurno =
      filterTurno === "TODOS" ||
      (space.horario && isSameHorario(space.horario, filterTurno));

    const matchesSupervisor = (() => {
      if (filterSupervisor === "TODOS") return true;
      const targetSup = (supervisores || SUPERVISORES_OFICIALES).find((s) => s.id === filterSupervisor);
      if (!targetSup) return true;

      // 1. Si el cubículo está ocupado por un médico, verificar si el médico pertenece a la base de este supervisor
      if (space.doctor) {
        if (space.supervisorId) {
          return space.supervisorId === targetSup.id;
        }
        // Revisar nómina directa en rosters
        if (rosterBySupervisor) {
          if (Array.isArray(rosterBySupervisor[targetSup.id]) && rosterBySupervisor[targetSup.id].some((n) => isSameDoctor(n, space.doctor))) {
            return true;
          }
          const hasInFranja = Object.entries(rosterBySupervisor).some(([k, list]) =>
            k.startsWith(targetSup.id) && Array.isArray(list) && list.some((n) => isSameDoctor(n, space.doctor))
          );
          if (hasInFranja) return true;
        }
        // Resolución canónica de pertenencia de supervisor
        const docSup = getDoctorSupervisorInfo({
          docName: space.doctor,
          rosters: rosterBySupervisor,
          supervisores,
          spaces,
        });
        if (docSup?.supervisorId) {
          return docSup.supervisorId === targetSup.id;
        }
        // Si el médico pertenece comprobadamente a otro supervisor, no incluirlo
        return false;
      }

      // 2. Si el espacio tiene supervisorId explícito asignado
      if (space.supervisorId) return space.supervisorId === targetSup.id;

      // 3. Si el cubículo está disponible / sin médico, verificar si pertenece al lote físico del supervisor
      if (Number(targetSup.bloqueInicio) === 0 && Number(targetSup.bloqueFin) === 0) return false;
      const sid = Number(space.id);
      return sid >= Number(targetSup.bloqueInicio) && sid <= Number(targetSup.bloqueFin);
    })();

    const isMatch = matchesQuery && matchesEstado && matchesTurno && matchesSupervisor;

    // Para el rol Doctor: determinar si este puesto le pertenece actualmente con médico sentado
    const isOwnSpace = Boolean(
      currentUser?.name &&
      space.doctor &&
      isSameDoctor(space.doctor, currentUser.name)
    );
    const isMyAssignedSpace = isDoctorRole && isOwnSpace;
    const isMySupervisorStation = currentUser?.role === "SUPERVISOR" && Number(currentUser?.puesto) > 0 && Number(currentUser?.puesto) === Number(space.id);

    // Determinar si este cubículo pertenece al lote del supervisor del médico actual
    const isInMyDoctorSupLote = currentDoctorSup &&
      Number(currentDoctorSup.bloqueInicio) > 0 &&
      Number(space.id) >= Number(currentDoctorSup.bloqueInicio) &&
      Number(space.id) <= Number(currentDoctorSup.bloqueFin);

    const isSupervisorStation = [135, 136, 137, 138, 139].includes(Number(space.id));
    const isSelectableForDoctor = !space.doctor && space.estado === "DISPONIBLE";
    const isBlockedForDoctor = isDoctorRole && !isOwnSpace && !isSelectableForDoctor;

    // Para el rol Master y Supervisor: destacar visualmente los espacios ocupados por médicos
    const isOccupiedByDoctor = !isDoctorRole && (space.estado === "OCUPADO" || !!space.doctor);

    return (
      <div
        className={`transition-all duration-200 relative w-full flex justify-center ${
          isMatch ? "opacity-100 scale-100" : "opacity-15 scale-95 grayscale"
        } ${isMyAssignedSpace ? "ring-4 ring-amber-400 ring-offset-2 z-20 rounded-[7px] scale-105 shadow-md" : ""} ${
          isInMyDoctorSupLote && isDoctorRole && !isMyAssignedSpace && !space.doctor
            ? "ring-2 ring-blue-500/80 ring-offset-1 rounded-[7px]"
            : ""
        } ${
          isMySupervisorStation ? "ring-4 ring-[#0095FF] ring-offset-2 z-20 rounded-[7px] scale-105 shadow-md" : ""
        } ${
          isOccupiedByDoctor && !isMySupervisorStation ? "ring-2 ring-[#0095FF] ring-offset-1 z-10 rounded-[6px] shadow-sm" : ""
        } ${
          isBlockedForDoctor ? "opacity-40 grayscale-[60%] cursor-not-allowed" : ""
        }`}
        title={isBlockedForDoctor ? `Puesto ${space.estado} — No disponible para asignación` : undefined}
      >
        <ExactCubicle space={space} onClick={onSelectSpace} />
        {/* Indicador visual de bloqueo en modo Doctor */}
        {isBlockedForDoctor && isMatch && (
          <div className="pointer-events-none absolute inset-0 rounded-[6px] bg-slate-900/10 flex items-end justify-center pb-0.5">
            <span className="text-[7px] font-bold text-slate-500 bg-white/80 rounded px-0.5 leading-tight">
              ✕
            </span>
          </div>
        )}
      </div>
    );
  }

  // Métricas para la tabla de marcas
  const dellDisp = spaces.filter((s) => s.marca === "DELL" && s.estado === "DISPONIBLE").length;
  const dellRes = spaces.filter((s) => s.marca === "DELL" && s.estado === "RESERVADO").length;
  const dellTotal = spaces.filter((s) => s.marca === "DELL").length;

  const lenovoDisp = spaces.filter((s) => s.marca === "LENOVO" && s.estado === "DISPONIBLE").length;
  const lenovoRes = spaces.filter((s) => s.marca === "LENOVO" && s.estado === "RESERVADO").length;
  const lenovoTotal = spaces.filter((s) => s.marca === "LENOVO").length;

  const hpDisp = spaces.filter((s) => s.marca === "HP" && s.estado === "DISPONIBLE").length;
  const hpRes = spaces.filter((s) => s.marca === "HP" && s.estado === "RESERVADO").length;
  const hpTotal = spaces.filter((s) => s.marca === "HP").length;

  const totalDisp = dellDisp + lenovoDisp + hpDisp;
  const totalRes = dellRes + lenovoRes + hpRes;
  const grandTotalPc = dellTotal + lenovoTotal + hpTotal;

  // Conteo de puestos ocupados clínicos (excluyendo puestos físicos de supervisión)
  const occupiedSpaces = spaces.filter((s) => {
    const isSup = ([135, 136, 137, 138, 139].includes(Number(s.id)) || s.categoria === "Supervisores") && s.estado !== "DISPONIBLE";
    return (s.estado === "OCUPADO" || Boolean(s.doctor)) && !isSup;
  });

  // Conteo de puestos ocupados en el lote a cargo del supervisor actual (excluye estaciones reservadas de supervisores)
  const occupiedInSupervisorLote = useMemo(() => {
    if (currentUser?.role !== "SUPERVISOR" || !currentUser?.bloqueInicio || !currentUser?.bloqueFin) return 0;
    const bIni = Number(currentUser.bloqueInicio);
    const bFin = Number(currentUser.bloqueFin);
    const isSupStation = (sid) => [135, 136, 137, 138, 139].includes(Number(sid));
    return spaces.filter((s) => {
      const sid = Number(s.id);
      return sid >= bIni && sid <= bFin && (s.estado === "OCUPADO" || Boolean(s.doctor)) && !isSupStation(sid);
    }).length;
  }, [spaces, currentUser]);

  // Lista unificada y dinámica de franjas horarias:
  // Combina las franjas configuradas con cualquier franja presente en espacios ocupados (ej. rotativos o personalizados)
  const availableShifts = useMemo(() => {
    const list = [...(horarios || HORARIOS)];
    occupiedSpaces.forEach((s) => {
      if (s.horario && !list.some((h) => isSameHorario(h, s.horario))) {
        list.push(s.horario);
      }
    });
    return list;
  }, [horarios, occupiedSpaces]);

  // Mapa de conteo de puestos ocupados por franja normalizada
  const shiftCounts = useMemo(() => {
    const countsMap = {};
    availableShifts.forEach((shift) => {
      countsMap[shift] = occupiedSpaces.filter((s) => isSameHorario(s.horario, shift)).length;
    });
    return countsMap;
  }, [availableShifts, occupiedSpaces]);

  return (
    <div className="flex flex-col gap-6 select-none">
      {/* Banner de Puesto Asignado al Médico con botón directo para Quitar Puesto y Ver Lote */}
      {isDoctorRole && currentUser?.spaceId && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-3xl bg-gradient-to-r from-blue-50 via-indigo-50/60 to-emerald-50 border-2 border-blue-200/90 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0048B5] text-white shadow-xs">
              <Laptop size={20} />
            </span>
            <div>
              <p className="font-heading text-[14px] sm:text-[15px] font-bold text-slate-800">
                Puesto Actual: <span className="text-[#0048B5] font-extrabold">#{currentUser.spaceId}</span> · Turno {currentUser.shift}
              </p>
              <p className="text-[12px] text-slate-600">
                {currentUser.name} {currentUser.supervisorNombre ? `· Supervisor a cargo: ${currentUser.supervisorNombre}` : ""}
                {currentDoctorSup ? ` (Lote Oficial #${currentDoctorSup.bloqueInicio}-#${currentDoctorSup.bloqueFin})` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {currentDoctorSup && (
              <button
                type="button"
                onClick={() => setFilterSupervisor((prev) => (prev === currentDoctorSup.id ? "TODOS" : currentDoctorSup.id))}
                className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-[12px] font-bold transition shadow-2xs ${
                  filterSupervisor === currentDoctorSup.id
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50"
                }`}
              >
                <Shield size={14} />
                <span>{filterSupervisor === currentDoctorSup.id ? "Ver todo el mapa" : `Filtrar mi lote (#${currentDoctorSup.bloqueInicio}-#${currentDoctorSup.bloqueFin})`}</span>
              </button>
            )}
            {onReleaseMySpace && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`¿Deseas quitarte del Puesto #${currentUser.spaceId}? El cubículo quedará DISPONIBLE de inmediato para que te asignes a otro.`)) {
                    onReleaseMySpace();
                  }
                }}
                className="flex items-center gap-2 rounded-2xl px-4 py-2 text-[12px] font-bold text-rose-700 bg-white hover:bg-rose-50 border border-rose-300 shadow-2xs hover:shadow-xs transition active:scale-95"
              >
                <LogOut size={14} />
                <span>Quitar mi Puesto (Liberar #{currentUser.spaceId})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Banner de Guía para Médico Sin Puesto: Orientación de su Lote y Supervisor */}
      {isDoctorRole && !currentUser?.spaceId && currentDoctorSup && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-3xl bg-gradient-to-r from-blue-50 via-indigo-50/70 to-emerald-50 border-2 border-indigo-300/80 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xs">
              <UserCheck size={20} />
            </span>
            <div>
              <p className="font-heading text-[14px] sm:text-[15px] font-bold text-slate-800">
                Hola, Dr(a). <span className="text-[#0048B5]">{currentUser.name}</span> · Turno {currentUser.shift}
              </p>
              <p className="text-[12px] text-slate-600">
                Supervisor a cargo: <strong className="text-indigo-700">{currentDoctorSup.nombre}</strong> · Tu lote asignado comprende los <strong className="text-slate-900">Puestos #{currentDoctorSup.bloqueInicio} al #{currentDoctorSup.bloqueFin}</strong> (borde azul en el mapa). Haz clic en un cubículo disponible para sentarte.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterSupervisor((prev) => (prev === currentDoctorSup.id ? "TODOS" : currentDoctorSup.id))}
              className={`flex items-center gap-1.5 rounded-2xl px-4 py-2 text-[12px] font-bold transition shadow-xs ${
                filterSupervisor === currentDoctorSup.id
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-white text-indigo-700 border border-indigo-300 hover:bg-indigo-50"
              }`}
            >
              <Shield size={14} />
              <span>{filterSupervisor === currentDoctorSup.id ? "Ver todo el mapa" : `Filtrar solo mi lote (#${currentDoctorSup.bloqueInicio}-#${currentDoctorSup.bloqueFin})`}</span>
            </button>
          </div>
        </div>
      )}

      {/* Barra Superior de Control, Filtros y Transición de Turnos */}
      <div className="flex flex-wrap items-center justify-between gap-3.5 bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-2xl text-white shadow-xs"
            style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
          >
            <LayoutGrid size={18} />
          </span>
          <div>
            <h2 className="font-heading text-[16px] font-bold text-slate-800 leading-tight">
              Plano de Telemedicina · Sede San Miguel
            </h2>
            <p className="text-[11.5px] text-slate-500 font-medium">
              {spaces.length} puestos · {occupiedSpaces.length} ocupados en tiempo real
            </p>
          </div>
        </div>

        {/* Buscador, Filtro por Franja de Horario, Estado y Supervisor */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Buscador */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 shadow-2xs focus-within:ring-2 focus-within:ring-[#0095FF]/40 focus-within:bg-white transition-all">
            <Search size={14} className="text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar puesto (#, médico, PC)..."
              className="w-36 sm:w-48 bg-transparent text-[12px] font-medium outline-none placeholder:text-slate-400"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-[11px] font-bold text-slate-400 hover:text-slate-600">
                ✕
              </button>
            )}
          </div>

          {/* Filtro por Franja Horaria / Turno */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs">
            <Clock size={13} className="text-[#0048B5]" />
            <select
              value={filterTurno}
              onChange={(e) => setFilterTurno(e.target.value)}
              className="bg-transparent text-[12px] outline-none font-bold text-slate-700 cursor-pointer"
            >
              <option value="TODOS">Todos los turnos ({occupiedSpaces.length})</option>
              {availableShifts.map((h) => {
                const count = shiftCounts[h] || 0;
                return (
                  <option key={h} value={h}>
                    {h} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Selector de Estado */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs">
            <Filter size={13} className="text-slate-400" />
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="bg-transparent text-[12px] outline-none font-semibold text-slate-700 cursor-pointer"
            >
              <option value="TODOS">Todos los estados ({spaces.length})</option>
              {Object.keys(ESTADOS).map((k) => (
                <option key={k} value={k}>
                  {ESTADOS[k].label} ({counts[k] || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Supervisor / Lote */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs">
            <Shield size={13} className="text-indigo-600" />
            <select
              value={filterSupervisor}
              onChange={(e) => setFilterSupervisor(e.target.value)}
              className="bg-transparent text-[12px] outline-none font-semibold text-slate-700 cursor-pointer"
            >
              <option value="TODOS">Todos los supervisores / lotes</option>
              {(supervisores || SUPERVISORES_OFICIALES).map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.nombre} (#{sup.bloqueInicio}-#{sup.bloqueFin})
                </option>
              ))}
            </select>
            {filterSupervisor !== "TODOS" && (
              <button
                type="button"
                onClick={() => setFilterSupervisor("TODOS")}
                className="ml-0.5 text-slate-400 hover:text-rose-500 font-bold text-[13px] leading-none"
                title="Limpiar filtro de supervisor"
              >
                ×
              </button>
            )}
          </div>

          {/* Botón para Limpiar Todos los Filtros si hay alguno activo */}
          {(query || filterEstado !== "TODOS" || filterTurno !== "TODOS" || filterSupervisor !== "TODOS") && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFilterEstado("TODOS");
                setFilterTurno("TODOS");
                setFilterSupervisor("TODOS");
              }}
              className="text-[11.5px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-200 transition shadow-2xs"
            >
              Limpiar filtros
            </button>
          )}

          {/* Botón de Relevo / Liberación de Turno (Solo para Master/Admin) */}
          {currentUser?.role !== "DOCTOR" && onReleaseShift && occupiedSpaces.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Relevo por Franja */}
              {onReleaseByHorario && (
                <div className="flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-2 py-1 shadow-2xs">
                  <RefreshCw size={12} className="text-amber-600 shrink-0" />
                  <select
                    value={releaseHorarioTarget}
                    onChange={(e) => setReleaseHorarioTarget(e.target.value)}
                    className="bg-transparent text-[11.5px] font-bold text-amber-800 outline-none cursor-pointer max-w-[150px]"
                  >
                    <option value="">Liberar por franja...</option>
                    {availableShifts.map((h) => {
                      const cnt = shiftCounts[h] || 0;
                      return cnt > 0 ? (
                        <option key={h} value={h}>{h} ({cnt})</option>
                      ) : null;
                    })}
                  </select>
                  {releaseHorarioTarget && (
                    <button
                      type="button"
                      onClick={() => {
                        const cnt = shiftCounts[releaseHorarioTarget] || occupiedSpaces.filter((s) => isSameHorario(s.horario, releaseHorarioTarget)).length;
                        if (window.confirm(`¿Liberar los ${cnt} puesto(s) de la franja "${releaseHorarioTarget}"?\nUsa esto para hacer relevo parcial de esta guardia.`)) {
                          onReleaseByHorario(releaseHorarioTarget);
                          setReleaseHorarioTarget("");
                        }
                      }}
                      className="ml-1 flex items-center gap-1 rounded-lg bg-amber-600 hover:bg-amber-700 px-2.5 py-1 text-[11px] font-bold text-white transition-all active:scale-95 shadow-xs"
                    >
                      Liberar Franja
                    </button>
                  )}
                </div>
              )}
              {/* Botón de Liberación de Lote para Supervisor */}
              {isSupervisorRole && onReleaseLote && occupiedInSupervisorLote > 0 && (
                <button
                  type="button"
                  onClick={() => onReleaseLote(currentUser.bloqueInicio, currentUser.bloqueFin, currentUser.name, currentUser.supervisorId || currentUser.id)}
                  className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[11.5px] font-bold text-white bg-rose-600 hover:bg-rose-700 transition shadow-2xs active:scale-95"
                  title={`Liberar los ${occupiedInSupervisorLote} puestos ocupados de tu lote (#${currentUser.bloqueInicio} al #${currentUser.bloqueFin})`}
                >
                  <RefreshCw size={12} />
                  <span>Liberar Mi Lote ({occupiedInSupervisorLote})</span>
                </button>
              )}

              {/* Relevo General Total (Solo Master) */}
              {isMasterRole && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`¿Deseas liberar TOTALMENTE los ${occupiedSpaces.length} puestos ocupados para el cambio de turno general?\n\nEsta acción desocupará todos los cubículos clínicos y los dejará disponibles para los nuevos médicos.`)) {
                      onReleaseShift();
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[11.5px] font-bold text-white bg-slate-800 hover:bg-slate-900 border border-slate-700 transition shadow-2xs active:scale-95"
                  title="Libera totalmente todos los puestos ocupados por médicos para el relevo de turno"
                >
                  <RefreshCw size={12} className="text-amber-400" />
                  <span>Relevo General ({occupiedSpaces.length})</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Banner Exclusivo de Doctor Operativo: Puesto Asignado & Guía de Liberación */}
      {currentUser?.role === "DOCTOR" && (
        <div
          style={{ animation: "fadeIn .2s ease-out both" }}
          className={`p-4 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm transition-all ${
            currentUser.spaceId
              ? "bg-emerald-50/90 border-emerald-300 text-emerald-950"
              : "bg-blue-50/90 border-blue-300 text-blue-950"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-xs ${
                currentUser.spaceId ? "bg-emerald-600" : "bg-[#0048B5]"
              }`}
            >
              {currentUser.spaceId ? <Laptop size={22} /> : <CheckCircle2 size={22} />}
            </span>
            <div>
              <p className="font-heading text-[15px] font-bold">
                {currentUser.spaceId
                  ? `Estación de Trabajo Activa: Puesto #${currentUser.spaceId} (${spaceMap[currentUser.spaceId]?.marca || "PC"})`
                  : `¡Bienvenido Dr(a). ${currentUser.name}!`}
              </p>
              <p className="text-[12px] opacity-90 mt-0.5">
                {currentUser.spaceId
                  ? `Puesto asignado para tu turno (${currentUser.shift}). Al terminar tu turno, presiona el botón para dejar el puesto disponible.`
                  : "Por favor haz clic sobre cualquier cubículo marcado en VERDE (Disponible) para seleccionarlo e iniciar tu jornada."}
              </p>
            </div>
          </div>

          {currentUser.spaceId && onReleaseMySpace && (
            <button
              type="button"
              onClick={onReleaseMySpace}
              className="shrink-0 flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-[12.5px] font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md transition-all active:scale-95"
            >
              <LogOut size={15} />
              <span>Finalizar Jornada (Liberar Puesto #{currentUser.spaceId})</span>
            </button>
          )}
        </div>
      )}

      {/* Banner Exclusivo de Supervisor: Estación Física y Lote Asignado */}
      {currentUser?.role === "SUPERVISOR" && (
        <div
          style={{ animation: "fadeIn .2s ease-out both" }}
          className="p-4 rounded-3xl border border-cyan-200 bg-gradient-to-r from-cyan-50/90 via-blue-50/80 to-white text-cyan-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0048B5] text-white shadow-xs">
              <UserCheck size={22} />
            </span>
            <div>
              <p className="font-heading text-[15px] font-bold text-slate-900">
                Supervisor: {currentUser.name} · Estación Física Puesto #{currentUser.puesto}
              </p>
              <p className="text-[12px] text-slate-600 mt-0.5">
                Turno Oficial: <strong className="text-slate-800">{currentUser.shift}</strong> · Lote Supervisado: <strong className="text-[#0048B5]">Puestos #{currentUser.bloqueInicio} al #{currentUser.bloqueFin}</strong> ({currentUser.totalPuestos} puestos)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onSelectSpace && spaceMap[currentUser.puesto] && onSelectSpace(spaceMap[currentUser.puesto])}
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-bold text-[#0048B5] bg-white border border-blue-200 hover:bg-blue-50 transition shadow-2xs active:scale-95"
            >
              <Shield size={13} />
              <span>Ver Mi Puesto #{currentUser.puesto}</span>
            </button>
            {onReleaseLote && occupiedInSupervisorLote > 0 && (
              <button
                type="button"
                onClick={() => onReleaseLote(currentUser.bloqueInicio, currentUser.bloqueFin, currentUser.name, currentUser.supervisorId || currentUser.id)}
                className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-bold text-white bg-rose-600 hover:bg-rose-700 transition shadow-2xs active:scale-95 cursor-pointer"
                title={`Liberar los ${occupiedInSupervisorLote} cubículos ocupados en tu lote (#${currentUser.bloqueInicio} al #${currentUser.bloqueFin})`}
              >
                <RefreshCw size={13} />
                <span>Liberar Mi Lote ({occupiedInSupervisorLote})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* CONTENEDOR PRINCIPAL DEL PLANO ARQUITECTÓNICO SIMÉTRICO */}
      <div className="relative bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-8 shadow-sm overflow-x-auto">
        <div className="min-w-[1540px] max-w-[1680px] mx-auto flex flex-col gap-7">

          {/* ================= SECCIÓN SUPERIOR: ACCESO ANEXO + ENTRADA (Centro) vs MÓDULOS 55-70 & 71-86 (Der) ================= */}
          <div className="flex gap-7 items-center justify-between">
            {/* Espacio Aéreo Anexo */}
            <div className="w-[420px] flex items-center justify-center p-3 h-44 rounded-2xl border-2 border-dashed border-indigo-200/80 bg-indigo-50/20 text-indigo-800">
              <div className="text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 block">
                  Acceso Lateral Anexo
                </span>
                <span className="text-[9.5px] text-slate-500 block mt-0.5">
                  Conexión Externa & Ventilación
                </span>
              </div>
            </div>

            {/* ENTRADA ARQUITECTÓNICA (Alineada con Ala Izquierda) */}
            <div className="w-[530px] flex justify-center">
              <div className="relative flex flex-col items-center justify-center w-72 h-44 bg-gradient-to-b from-[#EBF3FF] to-[#D8E8FC] border-2 border-slate-700/80 rounded-2xl shadow-xs overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-2 bg-[#0048B5]" />
                <div className="flex items-center gap-2 mb-1">
                  <DoorOpen size={24} className="text-[#0048B5]" />
                  <span className="font-heading font-black text-[18px] tracking-widest text-slate-900">
                    ENTRADA
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                  Acceso Principal de Personal
                </span>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-[#0048B5] bg-white/80 px-3 py-1 rounded-full border border-blue-200 shadow-2xs">
                  <ArrowDown size={12} /> Control Biométrico & Recepción
                </div>
              </div>
            </div>

            {/* SECTOR SUPERIOR DERECHO (Cubículos 55 al 70 Y Cubículos 71 al 86) */}
            <div className="w-[530px] flex flex-col gap-3 justify-start">
              {/* Módulo Superior 1: 55 al 70 */}
              <div className="flex flex-col gap-1.5 border-2 border-slate-700/80 p-2.5 bg-slate-50/80 rounded-xl shadow-xs">
                <div className="flex items-center justify-between px-1 pb-0.5">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Módulo Superior 1 · Puestos 55 - 70</span>
                  <span className="text-[9px] font-mono-data text-slate-400 font-semibold">8×2</span>
                </div>
                {/* Fila 55 al 62 */}
                <div className="grid grid-cols-8 gap-1 sm:gap-1.5 items-center">
                  {[55, 56, 57, 58, 59, 60, 61, 62].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
                {/* Fila 70 al 63 */}
                <div className="grid grid-cols-8 gap-1 sm:gap-1.5 items-center">
                  {[70, 69, 68, 67, 66, 65, 64, 63].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
              </div>

              {/* Módulo Superior 2 (Módulo B1): 71 al 86 */}
              <div className="flex flex-col gap-1.5 border-2 border-slate-700/80 p-2.5 bg-slate-50/80 rounded-xl shadow-xs">
                <div className="flex items-center justify-between px-1 pb-0.5">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Módulo Superior 2 (B1) · Puestos 71 - 86</span>
                  <span className="text-[9px] font-mono-data text-slate-400 font-semibold">8×2</span>
                </div>
                {/* Fila 71 al 78 */}
                <div className="grid grid-cols-8 gap-1 sm:gap-1.5 items-center">
                  {[71, 72, 73, 74, 75, 76, 77, 78].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
                {/* Fila 86 al 79 */}
                <div className="grid grid-cols-8 gap-1 sm:gap-1.5 items-center">
                  {[86, 85, 84, 83, 82, 81, 80, 79].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ================= PASILLO CENTRAL HORIZONTAL ================= */}
          <div className="relative flex items-center justify-center my-2">
            <div className="h-[1.5px] w-full bg-slate-200" />
            <div className="absolute bg-white px-4 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 border border-slate-200 rounded-full shadow-2xs">
              Pasillo de Distribución Central
            </div>
          </div>

          {/* ================= CUERPO PRINCIPAL SIMÉTRICO: SECTOR ANEXO + ALA IZQUIERDA + ALA DERECHA ================= */}
          <div className="flex gap-7 items-start justify-between">

            {/* ================= SECTOR ANEXO (141 al 170) - 2 MÓDULOS (7×2 y 8×2) ================= */}
            <div className="w-[420px] flex flex-col gap-5">
              {/* Encabezado Sector Anexo */}
              <div className="flex items-center justify-between px-2 pb-1 border-b border-indigo-200">
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-indigo-900 font-heading flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse" />
                  Sector Anexo · Puestos 141 al 170
                </span>
                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 font-mono-data">
                  2 Módulos (30 Puestos)
                </span>
              </div>

              {/* Conector / Pasillo de Interconexión (Alineado con Módulo A1) */}
              <div className="flex flex-col items-center justify-center p-3 h-[112px] rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/20 text-indigo-800">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <DoorOpen size={16} className="text-indigo-600" />
                  <span className="font-heading font-bold text-[11px] uppercase tracking-wider text-indigo-950">
                    Pasillo Conector
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">Interconexión Anexo ↔ Ala Izquierda</span>
                <span className="mt-1 text-[9px] font-mono-data text-indigo-600 font-semibold bg-white/80 px-2 py-0.5 rounded-full border border-indigo-100">
                  Acceso Técnico
                </span>
              </div>

              {/* Módulo Anexo 1 (7×2 = 14 Puestos): 141 al 154 (Alineado con Módulo A2) */}
              <div className="flex flex-col gap-1.5 border-2 border-slate-700/80 p-2.5 bg-indigo-50/30 rounded-xl shadow-xs">
                <div className="flex items-center justify-between px-1 pb-0.5">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Módulo Anexo 1 · Puestos 141 - 154
                  </span>
                  <span className="text-[9px] font-mono-data text-blue-700 font-bold bg-blue-100/70 px-1.5 py-0.5 rounded">
                    7×2 (14 Puestos)
                  </span>
                </div>
                {/* Fila Superior 141 al 147 */}
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5 items-center">
                  {[141, 142, 143, 144, 145, 146, 147].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
                {/* Fila Inferior 148 al 154 */}
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5 items-center">
                  {[148, 149, 150, 151, 152, 153, 154].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
              </div>

              {/* Módulo Anexo 2 (8×2 = 16 Puestos): 155 al 170 (Alineado con Módulo A3) */}
              <div className="flex flex-col gap-1.5 border-2 border-slate-700/80 p-2.5 bg-purple-50/30 rounded-xl shadow-xs">
                <div className="flex items-center justify-between px-1 pb-0.5">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-purple-500" />
                    Módulo Anexo 2 · Puestos 155 - 170
                  </span>
                  <span className="text-[9px] font-mono-data text-purple-700 font-bold bg-purple-100/70 px-1.5 py-0.5 rounded">
                    8×2 (16 Puestos)
                  </span>
                </div>
                {/* Fila Superior 155 al 162 */}
                <div className="grid grid-cols-8 gap-1 sm:gap-1.5 items-center">
                  {[155, 156, 157, 158, 159, 160, 161, 162].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
                {/* Fila Inferior 163 al 170 */}
                <div className="grid grid-cols-8 gap-1 sm:gap-1.5 items-center">
                  {[163, 164, 165, 166, 167, 168, 169, 170].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
              </div>

              {/* SALIDA ANEXO */}
              <div className="flex justify-center pt-3">
                <div className="flex items-center gap-2 px-5 py-2 bg-emerald-50 border-2 border-emerald-700 text-emerald-800 rounded-xl font-heading font-extrabold text-[12px] tracking-wider shadow-2xs">
                  <DoorOpen size={14} className="text-emerald-700" />
                  <span>SALIDA ANEXO</span>
                </div>
              </div>
            </div>

            {/* ================= ALA IZQUIERDA (1 al 54) - 3 MÓDULOS DE 9×2 ================= */}
            <div className="w-[530px] flex flex-col gap-5">
              {/* Encabezado Ala Izquierda */}
              <div className="flex items-center justify-between px-2 pb-1 border-b border-slate-200">
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-slate-700 font-heading">
                  Ala Izquierda · Puestos 1 al 54
                </span>
                <span className="text-[11px] font-bold text-slate-400">3 Módulos (54 Puestos)</span>
              </div>

              {/* Módulo A1: 46-54 / 37-45 */}
              <div className="flex flex-col gap-1.5 border-2 border-slate-700/80 p-2.5 bg-slate-50/80 rounded-xl shadow-xs">
                <div className="flex items-center justify-between px-1 pb-0.5">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Módulo A1 · Puestos 37 - 54</span>
                  <span className="text-[9px] font-mono-data text-slate-400 font-semibold">9×2</span>
                </div>
                <div className="grid grid-cols-9 gap-1 sm:gap-1.5 items-center">
                  {[46, 47, 48, 49, 50, 51, 52, 53, 54].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
                <div className="grid grid-cols-9 gap-1 sm:gap-1.5 items-center">
                  {[37, 38, 39, 40, 41, 42, 43, 44, 45].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
              </div>

              {/* Módulo A2: 36-28 / 19-27 */}
              <div className="flex flex-col gap-1.5 border-2 border-slate-700/80 p-2.5 bg-slate-50/80 rounded-xl shadow-xs">
                <div className="flex items-center justify-between px-1 pb-0.5">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Módulo A2 · Puestos 19 - 36</span>
                  <span className="text-[9px] font-mono-data text-slate-400 font-semibold">9×2</span>
                </div>
                <div className="grid grid-cols-9 gap-1 sm:gap-1.5 items-center">
                  {[36, 35, 34, 33, 32, 31, 30, 29, 28].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
                <div className="grid grid-cols-9 gap-1 sm:gap-1.5 items-center">
                  {[19, 20, 21, 22, 23, 24, 25, 26, 27].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
              </div>

              {/* Módulo A3: 18-10 / 1-9 */}
              <div className="flex flex-col gap-1.5 border-2 border-slate-700/80 p-2.5 bg-slate-50/80 rounded-xl shadow-xs">
                <div className="flex items-center justify-between px-1 pb-0.5">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Módulo A3 · Puestos 1 - 18</span>
                  <span className="text-[9px] font-mono-data text-slate-400 font-semibold">9×2</span>
                </div>
                <div className="grid grid-cols-9 gap-1 sm:gap-1.5 items-center">
                  {[18, 17, 16, 15, 14, 13, 12, 11, 10].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
                <div className="grid grid-cols-9 gap-1 sm:gap-1.5 items-center">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
              </div>

              {/* SALIDAS ALA IZQUIERDA */}
              <div className="flex justify-around pt-3">
                <div className="flex items-center gap-2 px-6 py-2 bg-emerald-50 border-2 border-emerald-700 text-emerald-800 rounded-xl font-heading font-extrabold text-[12px] tracking-wider shadow-2xs">
                  <DoorOpen size={14} className="text-emerald-700" />
                  <span>SALIDA 1</span>
                </div>
                <div className="flex items-center gap-2 px-6 py-2 bg-emerald-50 border-2 border-emerald-700 text-emerald-800 rounded-xl font-heading font-extrabold text-[12px] tracking-wider shadow-2xs">
                  <DoorOpen size={14} className="text-emerald-700" />
                  <span>SALIDA 2</span>
                </div>
              </div>
            </div>

            {/* ================= ALA DERECHA (87 al 140) - 3 MÓDULOS DE 9×2 ================= */}
            <div className="w-[530px] flex flex-col gap-5">
              {/* Encabezado Ala Derecha */}
              <div className="flex items-center justify-between px-2 pb-1 border-b border-slate-200">
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-slate-700 font-heading">
                  Ala Derecha · Puestos 87 al 140
                </span>
                <span className="text-[11px] font-bold text-slate-400">3 Módulos (54 Puestos)</span>
              </div>

              {/* Módulo B2: 87-95 / 104-96 */}
              <div className="flex flex-col gap-1.5 border-2 border-slate-700/80 p-2.5 bg-slate-50/80 rounded-xl shadow-xs">
                <div className="flex items-center justify-between px-1 pb-0.5">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Módulo B2 · Puestos 87 - 104</span>
                  <span className="text-[9px] font-mono-data text-slate-400 font-semibold">9×2</span>
                </div>
                <div className="grid grid-cols-9 gap-1 sm:gap-1.5 items-center">
                  {[87, 88, 89, 90, 91, 92, 93, 94, 95].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
                <div className="grid grid-cols-9 gap-1 sm:gap-1.5 items-center">
                  {[104, 103, 102, 101, 100, 99, 98, 97, 96].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
              </div>

              {/* Módulo B3: 105-113 / 122-114 */}
              <div className="flex flex-col gap-1.5 border-2 border-slate-700/80 p-2.5 bg-slate-50/80 rounded-xl shadow-xs">
                <div className="flex items-center justify-between px-1 pb-0.5">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Módulo B3 · Puestos 105 - 122</span>
                  <span className="text-[9px] font-mono-data text-slate-400 font-semibold">9×2</span>
                </div>
                <div className="grid grid-cols-9 gap-1 sm:gap-1.5 items-center">
                  {[105, 106, 107, 108, 109, 110, 111, 112, 113].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
                <div className="grid grid-cols-9 gap-1 sm:gap-1.5 items-center">
                  {[122, 121, 120, 119, 118, 117, 116, 115, 114].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
              </div>

              {/* Módulo B4: 123-131 / 140-132 */}
              <div className="flex flex-col gap-1.5 border-2 border-slate-700/80 p-2.5 bg-slate-50/80 rounded-xl shadow-xs">
                <div className="flex items-center justify-between px-1 pb-0.5">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Módulo B4 · Puestos 123 - 140</span>
                  <span className="text-[9px] font-mono-data text-slate-400 font-semibold">9×2</span>
                </div>
                <div className="grid grid-cols-9 gap-1 sm:gap-1.5 items-center">
                  {[123, 124, 125, 126, 127, 128, 129, 130, 131].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
                <div className="grid grid-cols-9 gap-1 sm:gap-1.5 items-center">
                  {[140, 139, 138, 137, 136, 135, 134, 133, 132].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
              </div>

              {/* SALIDA ALA DERECHA */}
              <div className="flex justify-start pl-4 pt-3">
                <div className="flex items-center gap-2 px-6 py-2 bg-emerald-50 border-2 border-emerald-700 text-emerald-800 rounded-xl font-heading font-extrabold text-[12px] tracking-wider shadow-2xs">
                  <DoorOpen size={14} className="text-emerald-700" />
                  <span>SALIDA 3</span>
                </div>
              </div>
            </div>

          </div>

          {/* ================= TABLAS INFERIORES RESUMEN CON DISEÑO PREMIUM ================= */}
          <div className={`mt-8 pt-6 border-t-2 border-slate-200/80 ${isMasterRole ? "grid grid-cols-1 md:grid-cols-3 gap-6" : "max-w-md"} text-[12px]`}>

            {/* TABLA 1: CÓDIGO DE COLOR & RESUMEN DE DISPONIBILIDAD (Visible para Médicos, Supervisores y Master) */}
            <div className="flex flex-col gap-2.5 bg-slate-50/70 p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-heading font-bold text-[13px] tracking-wider text-slate-800 uppercase">
                  {isDoctorRole ? "Resumen de Puestos y Disponibilidad" : "Código de Color & Totales"}
                </span>
                <span className="text-[11px] font-mono-data text-slate-400 font-bold">140 Espacios</span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-2xs">
                <div className="flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3.5 w-5 rounded-[3px] bg-[#237A40] shadow-2xs" />
                    <span className="font-semibold text-slate-700">DISPONIBLE</span>
                  </div>
                  <span className="font-mono-data font-bold text-slate-900">{counts.DISPONIBLE || 0}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3.5 w-5 rounded-[3px] bg-[#0048B5] shadow-2xs" />
                    <span className="font-semibold text-slate-700">OCUPADO CON MÉDICO</span>
                  </div>
                  <span className="font-mono-data font-bold text-slate-900">{counts.OCUPADO || 0}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3.5 w-5 rounded-[3px] bg-[#F59E0B] shadow-2xs" />
                    <span className="font-semibold text-slate-700">INCOMPLETOS</span>
                  </div>
                  <span className="font-mono-data font-bold text-slate-900">{counts.INCOMPLETO || 0}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3.5 w-5 rounded-[3px] bg-[#2563EB] shadow-2xs" />
                    <span className="font-semibold text-slate-700">INHABILITADOS (FILTRACIÓN)</span>
                  </div>
                  <span className="font-mono-data font-bold text-slate-900">{counts.INHABILITADO || 0}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3.5 w-5 rounded-[3px] bg-[#F43F5E] shadow-2xs" />
                    <span className="font-semibold text-slate-700">VACÍOS SIN EQUIPO</span>
                  </div>
                  <span className="font-mono-data font-bold text-slate-900">{counts.VACIO || 0}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3.5 w-5 rounded-[3px] bg-[#A855F7] shadow-2xs" />
                    <span className="font-semibold text-slate-700">REPARACIÓN</span>
                  </div>
                  <span className="font-mono-data font-bold text-slate-900">{counts.REPARACION || 0}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3.5 w-5 rounded-[3px] bg-[#38BDF8] shadow-2xs" />
                    <span className="font-semibold text-slate-700">RESERVADO / SUPERVISIÓN</span>
                  </div>
                  <span className="font-mono-data font-bold text-slate-900">{counts.RESERVADO || 0}</span>
                </div>
              </div>
            </div>

            {/* TABLA 2 Y TABLA 3: EXCLUSIVAS PARA ADMINISTRADOR / MASTER (Ocultas para Supervisor y Doctor) */}
            {isMasterRole && (
              <>
                {/* TABLA 2: INVENTARIO BODEGA */}
                <div className="flex flex-col gap-2.5 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-bold text-[13px] tracking-wider text-slate-800 uppercase">
                      Inventario en Bodega
                    </span>
                    <span className="text-[11px] font-mono-data text-slate-400 font-bold">Stock de Reserva</span>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-2xs">
                    {(bodegaStock && bodegaStock.length > 0 ? bodegaStock : BODEGA_TIPOS).map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-2.5 bg-blue-50/50">
                        <span className="font-bold text-slate-700 text-[12px]">{item.label?.toUpperCase() || item.key}</span>
                        <span className={`font-mono-data font-bold text-[13px] ${(item.actual || 0) > 0 ? "text-[#0048B5]" : "text-slate-400"}`}>
                          {item.actual ?? 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* TABLA 3: TOTALES POR MARCAS / ESTADO */}
                <div className="flex flex-col gap-2.5 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-bold text-[13px] tracking-wider text-slate-800 uppercase">
                      Totales por Marca
                    </span>
                    <span className="text-[11px] font-mono-data text-slate-400 font-bold">{grandTotalPc} PCs en Sede</span>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <table className="w-full text-center text-[12px]">
                      <thead>
                        <tr className="bg-slate-100/80 border-b border-slate-200 font-bold text-slate-700 uppercase text-[10px] tracking-wider">
                          <th className="p-2.5 text-left">Marca</th>
                          <th className="p-2.5">Disponible</th>
                          <th className="p-2.5">Reservado</th>
                          <th className="p-2.5">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr className="hover:bg-slate-50">
                          <td className="p-2.5 text-left font-bold text-slate-800">DELL</td>
                          <td className="p-2.5 font-mono-data bg-emerald-50 text-emerald-800 font-bold">{dellDisp}</td>
                          <td className="p-2.5 font-mono-data text-slate-600">{dellRes}</td>
                          <td className="p-2.5 font-mono-data font-extrabold text-slate-900 bg-slate-50">{dellTotal}</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="p-2.5 text-left font-bold text-slate-800">LENOVO</td>
                          <td className="p-2.5 font-mono-data bg-emerald-50 text-emerald-800 font-bold">{lenovoDisp}</td>
                          <td className="p-2.5 font-mono-data text-slate-600">{lenovoRes}</td>
                          <td className="p-2.5 font-mono-data font-extrabold text-slate-900 bg-slate-50">{lenovoTotal}</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="p-2.5 text-left font-bold text-slate-800">HP</td>
                          <td className="p-2.5 font-mono-data bg-emerald-50 text-emerald-800 font-bold">{hpDisp}</td>
                          <td className="p-2.5 font-mono-data text-slate-600">{hpRes}</td>
                          <td className="p-2.5 font-mono-data font-extrabold text-slate-900 bg-slate-50">{hpTotal}</td>
                        </tr>
                        <tr className="bg-slate-100/90 font-bold">
                          <td className="p-2.5 text-left uppercase text-[11px] text-slate-700">Totales</td>
                          <td className="p-2.5 font-mono-data text-emerald-800 font-extrabold">{totalDisp}</td>
                          <td className="p-2.5 font-mono-data text-slate-700 font-extrabold">{totalRes}</td>
                          <td className="p-2.5 font-mono-data font-extrabold text-[#0048B5] bg-blue-50">{grandTotalPc}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
