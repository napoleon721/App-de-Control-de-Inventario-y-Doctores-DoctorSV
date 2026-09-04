import React, { useState, useMemo } from "react";
import {
  Search, Filter, DoorOpen, LayoutGrid, Monitor, ShieldCheck, Sparkles,
  Layers, CheckCircle2, AlertTriangle, Droplets, XCircle, Wrench, Lock, ArrowDown, ArrowUp,
  Clock, RefreshCw, UserCheck, LogOut, Laptop, User
} from "lucide-react";
import ExactCubicle from "./ExactCubicle";
import { ESTADOS, MARCAS, HORARIOS } from "../../constants/tokens";

export default function SpaceMap({
  spaces,
  counts,
  onSelectSpace,
  onReleaseShift,
  currentUser,
  onReleaseMySpace,
}) {
  const [query, setQuery] = useState("");
  const [filterEstado, setFilterEstado] = useState("TODOS");
  const [filterTurno, setFilterTurno] = useState("TODOS");

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
    if (!space) return <div className="h-[46px] w-[50px] sm:w-[54px]" />;

    const matchesQuery =
      query.trim() === "" ||
      String(space.id).includes(query) ||
      (space.doctor && space.doctor.toLowerCase().includes(query.toLowerCase())) ||
      (space.marca && space.marca.toLowerCase().includes(query.toLowerCase()));
    const matchesEstado = filterEstado === "TODOS" || space.estado === filterEstado;
    const matchesTurno = filterTurno === "TODOS" || space.horario === filterTurno;

    const isMatch = matchesQuery && matchesEstado && matchesTurno;
    const isMyAssignedSpace = currentUser?.spaceId === space.id;

    return (
      <div
        className={`transition-all duration-200 ${
          isMatch ? "opacity-100 scale-100" : "opacity-15 scale-95 grayscale"
        } ${isMyAssignedSpace ? "ring-4 ring-amber-400 ring-offset-2 z-20 rounded-[7px] scale-105 shadow-md" : ""}`}
      >
        <ExactCubicle space={space} onClick={onSelectSpace} />
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

  // Conteo de puestos ocupados por turno
  const occupiedSpaces = spaces.filter((s) => s.doctor);

  return (
    <div className="flex flex-col gap-6 select-none">
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
              140 puestos · {occupiedSpaces.length} ocupados en tiempo real
            </p>
          </div>
        </div>

        {/* Buscador, Filtro por Franja de Horario y Estado */}
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
              {HORARIOS.map((h) => {
                const count = spaces.filter((s) => s.horario === h).length;
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
              <option value="TODOS">Todos los estados (140)</option>
              {Object.keys(ESTADOS).map((k) => (
                <option key={k} value={k}>
                  {ESTADOS[k].label} ({counts[k] || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Botón de Relevo / Liberación de Turno (Solo para Master/Admin) */}
          {currentUser?.role !== "DOCTOR" && onReleaseShift && occupiedSpaces.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm(`¿Deseas liberar los ${occupiedSpaces.length} puestos ocupados para el cambio de turno?`)) {
                  onReleaseShift();
                }
              }}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11.5px] font-bold text-white bg-slate-700 hover:bg-slate-800 transition shadow-2xs active:scale-95"
              title="Libera los puestos del turno anterior para dar paso al siguiente turno"
            >
              <RefreshCw size={12} />
              <span>Relevo de Turno</span>
            </button>
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

      {/* CONTENEDOR PRINCIPAL DEL PLANO ARQUITECTÓNICO SIMÉTRICO */}
      <div className="relative bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-8 shadow-sm overflow-x-auto">
        <div className="min-w-[1040px] max-w-[1240px] mx-auto flex flex-col gap-7">

          {/* ================= SECCIÓN SUPERIOR: ENTRADA (Izq) vs MÓDULOS 55-70 & 71-86 (Der) ================= */}
          <div className="grid grid-cols-2 gap-10 items-center">
            {/* ENTRADA ARQUITECTÓNICA */}
            <div className="flex justify-end pr-4 sm:pr-8">
              <div className="relative flex flex-col items-center justify-center w-64 h-44 bg-gradient-to-b from-[#EBF3FF] to-[#D8E8FC] border-2 border-slate-700/80 rounded-2xl shadow-xs overflow-hidden">
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
            <div className="flex flex-col gap-3 justify-start pl-2">
              {/* Módulo Superior 1: 55 al 70 */}
              <div className="flex flex-col gap-1.5 border-2 border-slate-700/80 p-2 bg-slate-50/80 rounded-xl shadow-xs">
                <div className="flex items-center justify-between px-1 pb-0.5">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Módulo Superior 1 · Puestos 55 - 70</span>
                  <span className="text-[9px] font-mono-data text-slate-400 font-semibold">8×2</span>
                </div>
                {/* Fila 55 al 62 */}
                <div className="flex gap-1.5 justify-center">
                  {[55, 56, 57, 58, 59, 60, 61, 62].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
                {/* Fila 70 al 63 */}
                <div className="flex gap-1.5 justify-center">
                  {[70, 69, 68, 67, 66, 65, 64, 63].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
              </div>

              {/* Módulo Superior 2 (Módulo B1): 71 al 86 */}
              <div className="flex flex-col gap-1.5 border-2 border-slate-700/80 p-2 bg-slate-50/80 rounded-xl shadow-xs">
                <div className="flex items-center justify-between px-1 pb-0.5">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Módulo Superior 2 (B1) · Puestos 71 - 86</span>
                  <span className="text-[9px] font-mono-data text-slate-400 font-semibold">8×2</span>
                </div>
                {/* Fila 71 al 78 */}
                <div className="flex gap-1.5 justify-center">
                  {[71, 72, 73, 74, 75, 76, 77, 78].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
                {/* Fila 86 al 79 */}
                <div className="flex gap-1.5 justify-center">
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

          {/* ================= CUERPO PRINCIPAL SIMÉTRICO: 3 MÓDULOS ALA IZQ vs 3 MÓDULOS ALA DER ================= */}
          <div className="grid grid-cols-2 gap-10 items-start">

            {/* ================= ALA IZQUIERDA (1 al 54) - 3 MÓDULOS DE 9×2 ================= */}
            <div className="flex flex-col gap-5">
              {/* Encabezado Ala Izquierda */}
              <div className="flex items-center justify-between px-2 pb-1 border-b border-slate-200">
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-slate-700 font-heading">
                  Ala Izquierda · Puestos 1 al 54
                </span>
                <span className="text-[11px] font-bold text-slate-400">3 Módulos (54 Puestos)</span>
              </div>

              {/* Módulo A1: 46-54 / 37-45 */}
              <div className="flex flex-col gap-1.5 border-2 border-slate-700/80 p-2 bg-slate-50/80 rounded-xl shadow-xs">
                <div className="flex items-center justify-between px-1 pb-0.5">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Módulo A1 · Puestos 37 - 54</span>
                  <span className="text-[9px] font-mono-data text-slate-400 font-semibold">9×2</span>
                </div>
                <div className="flex gap-1.5 justify-center">
                  {[46, 47, 48, 49, 50, 51, 52, 53, 54].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
                <div className="flex gap-1.5 justify-center">
                  {[37, 38, 39, 40, 41, 42, 43, 44, 45].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
              </div>

              {/* Módulo A2: 36-28 / 19-27 */}
              <div className="flex flex-col gap-1.5 border-2 border-slate-700/80 p-2 bg-slate-50/80 rounded-xl shadow-xs">
                <div className="flex items-center justify-between px-1 pb-0.5">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Módulo A2 · Puestos 19 - 36</span>
                  <span className="text-[9px] font-mono-data text-slate-400 font-semibold">9×2</span>
                </div>
                <div className="flex gap-1.5 justify-center">
                  {[36, 35, 34, 33, 32, 31, 30, 29, 28].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
                <div className="flex gap-1.5 justify-center">
                  {[19, 20, 21, 22, 23, 24, 25, 26, 27].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
              </div>

              {/* Módulo A3: 18-10 / 1-9 */}
              <div className="flex flex-col gap-1.5 border-2 border-slate-700/80 p-2 bg-slate-50/80 rounded-xl shadow-xs">
                <div className="flex items-center justify-between px-1 pb-0.5">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Módulo A3 · Puestos 1 - 18</span>
                  <span className="text-[9px] font-mono-data text-slate-400 font-semibold">9×2</span>
                </div>
                <div className="flex gap-1.5 justify-center">
                  {[18, 17, 16, 15, 14, 13, 12, 11, 10].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
                <div className="flex gap-1.5 justify-center">
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
            <div className="flex flex-col gap-5">
              {/* Encabezado Ala Derecha */}
              <div className="flex items-center justify-between px-2 pb-1 border-b border-slate-200">
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-slate-700 font-heading">
                  Ala Derecha · Puestos 87 al 140
                </span>
                <span className="text-[11px] font-bold text-slate-400">3 Módulos (54 Puestos)</span>
              </div>

              {/* Módulo B2: 87-95 / 104-96 */}
              <div className="flex flex-col gap-1.5 border-2 border-slate-700/80 p-2 bg-slate-50/80 rounded-xl shadow-xs">
                <div className="flex items-center justify-between px-1 pb-0.5">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Módulo B2 · Puestos 87 - 104</span>
                  <span className="text-[9px] font-mono-data text-slate-400 font-semibold">9×2</span>
                </div>
                <div className="flex gap-1.5 justify-center">
                  {[87, 88, 89, 90, 91, 92, 93, 94, 95].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
                <div className="flex gap-1.5 justify-center">
                  {[104, 103, 102, 101, 100, 99, 98, 97, 96].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
              </div>

              {/* Módulo B3: 105-113 / 122-114 */}
              <div className="flex flex-col gap-1.5 border-2 border-slate-700/80 p-2 bg-slate-50/80 rounded-xl shadow-xs">
                <div className="flex items-center justify-between px-1 pb-0.5">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Módulo B3 · Puestos 105 - 122</span>
                  <span className="text-[9px] font-mono-data text-slate-400 font-semibold">9×2</span>
                </div>
                <div className="flex gap-1.5 justify-center">
                  {[105, 106, 107, 108, 109, 110, 111, 112, 113].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
                <div className="flex gap-1.5 justify-center">
                  {[122, 121, 120, 119, 118, 117, 116, 115, 114].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
              </div>

              {/* Módulo B4: 123-131 / 140-132 */}
              <div className="flex flex-col gap-1.5 border-2 border-slate-700/80 p-2 bg-slate-50/80 rounded-xl shadow-xs">
                <div className="flex items-center justify-between px-1 pb-0.5">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Módulo B4 · Puestos 123 - 140</span>
                  <span className="text-[9px] font-mono-data text-slate-400 font-semibold">9×2</span>
                </div>
                <div className="flex gap-1.5 justify-center">
                  {[123, 124, 125, 126, 127, 128, 129, 130, 131].map((id) => (
                    <React.Fragment key={id}>{renderCubicle(id)}</React.Fragment>
                  ))}
                </div>
                <div className="flex gap-1.5 justify-center">
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
          <div className="mt-8 pt-6 border-t-2 border-slate-200/80 grid grid-cols-1 md:grid-cols-3 gap-6 text-[12px]">

            {/* TABLA 1: CÓDIGO DE COLOR */}
            <div className="flex flex-col gap-2.5 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-heading font-bold text-[13px] tracking-wider text-slate-800 uppercase">
                  Código de Color & Totales
                </span>
                <span className="text-[11px] font-mono-data text-slate-400 font-bold">140 Espacios</span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-2xs">
                <div className="flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3.5 w-5 rounded-[3px] bg-[#237A40] shadow-2xs" />
                    <span className="font-semibold text-slate-700">DISPONIBLE</span>
                  </div>
                  <span className="font-mono-data font-bold text-slate-900">{counts.DISPONIBLE || 95}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3.5 w-5 rounded-[3px] bg-[#F59E0B] shadow-2xs" />
                    <span className="font-semibold text-slate-700">INCOMPLETOS</span>
                  </div>
                  <span className="font-mono-data font-bold text-slate-900">{counts.INCOMPLETO || 1}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3.5 w-5 rounded-[3px] bg-[#2563EB] shadow-2xs" />
                    <span className="font-semibold text-slate-700">INHABILITADOS (FILTRACIÓN)</span>
                  </div>
                  <span className="font-mono-data font-bold text-slate-900">{counts.INHABILITADO || 8}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3.5 w-5 rounded-[3px] bg-[#F43F5E] shadow-2xs" />
                    <span className="font-semibold text-slate-700">VACÍOS SIN EQUIPO</span>
                  </div>
                  <span className="font-mono-data font-bold text-slate-900">{counts.VACIO || 29}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3.5 w-5 rounded-[3px] bg-[#A855F7] shadow-2xs" />
                    <span className="font-semibold text-slate-700">REPARACIÓN</span>
                  </div>
                  <span className="font-mono-data font-bold text-slate-900">{counts.REPARACION || 1}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3.5 w-5 rounded-[3px] bg-[#38BDF8] shadow-2xs" />
                    <span className="font-semibold text-slate-700">RESERVADO</span>
                  </div>
                  <span className="font-mono-data font-bold text-slate-900">{counts.RESERVADO || 5}</span>
                </div>
              </div>
            </div>

            {/* TABLA 2: INVENTARIO BODEGA */}
            <div className="flex flex-col gap-2.5 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-heading font-bold text-[13px] tracking-wider text-slate-800 uppercase">
                  Inventario en Bodega
                </span>
                <span className="text-[11px] font-mono-data text-slate-400 font-bold">Stock de Reserva</span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-2xs">
                <div className="flex items-center justify-between p-2.5 bg-blue-50/50">
                  <span className="font-bold text-slate-700">PC (COMPUTADORAS)</span>
                  <span className="font-mono-data font-bold text-[#0048B5] text-[13px]">1</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-blue-50/50">
                  <span className="font-bold text-slate-700">MAUSE</span>
                  <span className="font-mono-data font-bold text-[#0048B5] text-[13px]">2</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-blue-50/50">
                  <span className="font-bold text-slate-700">HUB USB-C</span>
                  <span className="font-mono-data font-bold text-slate-400 text-[13px]">0</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-blue-50/50">
                  <span className="font-bold text-slate-700">MONITOR</span>
                  <span className="font-mono-data font-bold text-slate-400 text-[13px]">0</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-blue-50/50">
                  <span className="font-bold text-slate-700">CABLES ETHERNET</span>
                  <span className="font-mono-data font-bold text-[#0048B5] text-[13px]">1</span>
                </div>
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

          </div>

        </div>
      </div>
    </div>
  );
}
