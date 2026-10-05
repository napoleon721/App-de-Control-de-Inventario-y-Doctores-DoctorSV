import React, { useState, useRef, useEffect } from "react";
import {
  LayoutGrid, Warehouse, Stethoscope, FileClock, Bell,
  RefreshCw, LogIn, Sparkles, UserCheck, CheckCircle2,
  Shield, LogOut, Laptop, User, FileSpreadsheet, Clock,
  SlidersHorizontal, ChevronDown, X
} from "lucide-react";
import DoctorSVLogo from "./DoctorSVLogo";

export default function Header({
  tab,
  setTab,
  alerts = [],
  onSync,
  isSyncing = false,
  lastSyncTime = null,
  onOpenCheckIn,
  currentUser = null,
  onLogout,
  onReleaseMySpace,
  onOpenAuthPortal,
  onOpenShiftConfig,
  onOpenSupervisorConfig,
  onOpenLiveReport,
  onOpenGoogleSheetsConfig,
  onOpenDailyLots,
}) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const toolsRef = useRef(null);
  const alertRef = useRef(null);

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (toolsRef.current && !toolsRef.current.contains(e.target)) {
        setToolsOpen(false);
      }
      if (alertRef.current && !alertRef.current.contains(e.target)) {
        setAlertOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allTabs = [
    { id: "mapa", label: "Mapa de Espacios", shortLabel: "Mapa", icon: LayoutGrid },
    { id: "asistencia", label: "Control de Asistencia", shortLabel: "Asistencia", icon: UserCheck },
    { id: "medicos", label: "Padrón de Médicos", shortLabel: "Médicos", icon: Stethoscope },
    { id: "bodega", label: "Inventario Bodega", shortLabel: "Bodega", icon: Warehouse },
    { id: "historial", label: "Auditoría & Historial", shortLabel: "Historial", icon: FileClock },
  ];

  const isDoctorRole = currentUser?.role === "DOCTOR";
  const isMasterRole = currentUser?.role === "MASTER";
  const isSupervisorRole = currentUser?.role === "SUPERVISOR";

  // Supervisores solo tienen acceso a "Mapa de Espacios" y "Control de Asistencia"
  const tabs = isSupervisorRole
    ? allTabs.filter((t) => ["mapa", "asistencia"].includes(t.id))
    : allTabs;

  const hasToolsAvailable = !isDoctorRole && (
    onOpenGoogleSheetsConfig || onOpenDailyLots || onOpenSupervisorConfig || onOpenShiftConfig || onOpenLiveReport
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs transition-all">
      {/* Barra superior con gradiente institucional DoctorSV */}
      <div
        className="h-1 w-full"
        style={{
          background: isDoctorRole
            ? "linear-gradient(90deg, #15803D 0%, #22C55E 50%, #0095FF 100%)"
            : isSupervisorRole
            ? "linear-gradient(90deg, #0284C7 0%, #0048B5 50%, #0095FF 100%)"
            : "linear-gradient(90deg, #0048B5 0%, #0095FF 50%, #0284C7 100%)",
        }}
      />

      {/* Contenedor principal con distribución armónica en 3 zonas */}
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-2.5">
        
        {/* ============================================================== */}
        {/* ZONA 1: LOGO INSTITUCIONAL + BADGE DE ROL                      */}
        {/* ============================================================== */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            className="flex items-center cursor-pointer select-none"
            onClick={() => setTab("mapa")}
            title="Ir al Mapa de Espacios"
          >
            <DoctorSVLogo className="h-8 sm:h-9" showSubtext={false} />
          </div>

          {/* Badges de Estado / Sede */}
          <div className="flex items-center">
            {isDoctorRole ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Estación Médica</span>
              </span>
            ) : isSupervisorRole ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-0.5 text-[11px] font-bold text-cyan-900 border border-cyan-200 shadow-2xs">
                <UserCheck size={12} className="text-cyan-700" />
                <span>Supervisor · San Miguel</span>
              </span>
            ) : isMasterRole ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-900 border border-indigo-200 shadow-2xs">
                <Shield size={12} className="text-indigo-600" />
                <span>Doctor Master</span>
              </span>
            ) : (
              <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Sede San Miguel</span>
              </span>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* ZONA 2: NAVEGACIÓN CENTRAL SEGMENTADA (Pestañas principales)  */}
        {/* ============================================================== */}
        {!isDoctorRole ? (
          <nav className="hidden lg:flex items-center justify-center gap-1 rounded-2xl bg-slate-100/90 p-1 border border-slate-200/70 shadow-inner">
            {tabs.map((t) => {
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[12px] transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-white text-[#0048B5] shadow-xs font-black ring-1 ring-slate-200/90 scale-[1.01]"
                      : "text-slate-600 font-bold hover:text-[#0048B5] hover:bg-white/60"
                  }`}
                >
                  <t.icon
                    size={14}
                    className={`transition-colors shrink-0 ${isActive ? "text-[#0095FF]" : "text-slate-400"}`}
                  />
                  <span className="whitespace-nowrap hidden xl:inline">{t.label}</span>
                  <span className="whitespace-nowrap xl:hidden">{t.shortLabel}</span>
                </button>
              );
            })}
          </nav>
        ) : (
          /* Doctor Role: Título limpio centrado */
          <div className="hidden md:flex items-center gap-2 text-[12.5px] font-semibold text-slate-700">
            <span className="font-heading font-extrabold text-slate-900">
              Plano de Ubicación de Cubículos
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-600 text-[12px]">
              Turno activo: <strong className="text-[#0048B5]">{currentUser.shift || "General"}</strong>
            </span>
          </div>
        )}

        {/* ============================================================== */}
        {/* ZONA 3: ACCIONES RÁPIDAS + HERRAMIENTAS + SESIÓN              */}
        {/* ============================================================== */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Botón Primario: Auto Check-In */}
          {!isDoctorRole && onOpenCheckIn && (
            <button
              type="button"
              onClick={onOpenCheckIn}
              className="flex items-center gap-1.5 rounded-xl px-3 sm:px-3.5 py-1.5 text-[12px] font-black text-white transition-all hover:brightness-110 active:scale-95 shadow-xs cursor-pointer"
              style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
              title="Abrir modal de Auto Check-In de Médicos"
            >
              <CheckCircle2 size={14} className="shrink-0" />
              <span className="hidden sm:inline">Auto Check-In</span>
              <span className="sm:hidden">Check-In</span>
            </button>
          )}

          {/* Botón de Sincronización en Vivo */}
          {!isDoctorRole && onSync && (
            <button
              type="button"
              onClick={onSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-2.5 sm:px-3 py-1.5 text-[12px] font-bold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 shadow-2xs disabled:opacity-75 cursor-pointer"
              title={
                lastSyncTime
                  ? `Sincronización en vivo activa · Última: ${lastSyncTime.toLocaleTimeString("es-SV")}`
                  : "Sincronizar puestos y nómina en tiempo real"
              }
            >
              <RefreshCw
                size={13}
                className={isSyncing ? "animate-spin text-[#0095FF]" : "text-emerald-500"}
              />
              <span className="hidden md:inline">{isSyncing ? "Sync..." : "Sync"}</span>
              <span
                className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"
                title="Conexión en vivo activa"
              />
            </button>
          )}

          {/* MENÚ DESPLEGABLE: HERRAMIENTAS & AJUSTES (Agrupa las configuraciones en un solo menú limpio) */}
          {hasToolsAvailable && (
            <div className="relative" ref={toolsRef}>
              <button
                type="button"
                onClick={() => {
                  setToolsOpen((prev) => !prev);
                  setAlertOpen(false);
                }}
                className={`flex items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 py-1.5 text-[12px] font-bold transition-all shadow-2xs cursor-pointer ${
                  toolsOpen
                    ? "border-blue-400 bg-blue-50/90 text-[#0048B5] ring-2 ring-blue-500/20"
                    : "border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                }`}
                title="Herramientas y Configuración del Sistema"
              >
                <SlidersHorizontal size={14} className={toolsOpen ? "text-[#0095FF]" : "text-slate-500"} />
                <span className="hidden sm:inline">Herramientas</span>
                <ChevronDown
                  size={13}
                  className={`text-slate-400 transition-transform duration-200 ${toolsOpen ? "rotate-180 text-blue-600" : ""}`}
                />
              </button>

              {/* Popover con las 5 opciones organizadas */}
              {toolsOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                      Herramientas de Gestión
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#0048B5] font-mono">
                      DoctorSV Admin
                    </span>
                  </div>

                  <div className="p-2 space-y-1">
                    {/* 1. Google Sheets en Vivo */}
                    {onOpenGoogleSheetsConfig && (
                      <button
                        type="button"
                        onClick={() => {
                          setToolsOpen(false);
                          onOpenGoogleSheetsConfig();
                        }}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-emerald-50/80 text-left transition-colors group cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                          <FileSpreadsheet size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[12.5px] font-bold text-slate-800 group-hover:text-emerald-900 truncate">
                              Google Sheets en Vivo
                            </span>
                            <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 shrink-0">
                              Base de Datos
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">
                            Vincular y sincronizar la hoja maestra
                          </p>
                        </div>
                      </button>
                    )}

                    {/* 2. Resumen San Miguel */}
                    {onOpenDailyLots && (
                      <button
                        type="button"
                        onClick={() => {
                          setToolsOpen(false);
                          onOpenDailyLots();
                        }}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-indigo-50/80 text-left transition-colors group cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                          <LayoutGrid size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[12.5px] font-bold text-slate-800 group-hover:text-indigo-900 truncate">
                              Resumen San Miguel
                            </span>
                            <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 shrink-0">
                              Lotes Diarios
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">
                            Distribución de cubículos por turno
                          </p>
                        </div>
                      </button>
                    )}

                    {/* 3. Lotes Supervisores */}
                    {onOpenSupervisorConfig && (
                      <button
                        type="button"
                        onClick={() => {
                          setToolsOpen(false);
                          onOpenSupervisorConfig();
                        }}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-sky-50/80 text-left transition-colors group cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                          <Shield size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[12.5px] font-bold text-slate-800 group-hover:text-sky-900 truncate">
                              Lotes Supervisores
                            </span>
                            <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 shrink-0">
                              Cubículos
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">
                            Rangos fijos asignados por supervisor
                          </p>
                        </div>
                      </button>
                    )}

                    {/* 4. Configuración de Turnos */}
                    {onOpenShiftConfig && (
                      <button
                        type="button"
                        onClick={() => {
                          setToolsOpen(false);
                          onOpenShiftConfig();
                        }}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-50/80 text-left transition-colors group cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0048B5] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                          <Clock size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[12.5px] font-bold text-slate-800 group-hover:text-blue-900 truncate">
                              Turnos y Horarios
                            </span>
                            <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-[#0048B5] shrink-0">
                              Horarios
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">
                            Configurar franjas oficiales de atención
                          </p>
                        </div>
                      </button>
                    )}

                    {/* 5. Reporte de Asistencia en Vivo */}
                    {onOpenLiveReport && (
                      <button
                        type="button"
                        onClick={() => {
                          setToolsOpen(false);
                          onOpenLiveReport();
                        }}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-amber-50/80 text-left transition-colors group cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                          <Sparkles size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[12.5px] font-bold text-slate-800 group-hover:text-amber-900 truncate">
                              Reporte de Asistencia
                            </span>
                            <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 shrink-0">
                              En Vivo
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">
                            Estadísticas y ocupación en tiempo real
                          </p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Campanita de Notificaciones y Alertas */}
          <div className="relative" ref={alertRef}>
            <button
              onClick={() => {
                setAlertOpen((v) => !v);
                setToolsOpen(false);
              }}
              className={`relative flex h-8.5 w-8.5 items-center justify-center rounded-xl border transition-all cursor-pointer ${
                alertOpen
                  ? "border-blue-400 bg-blue-50 text-[#0048B5] ring-2 ring-blue-500/20"
                  : "border-slate-200/90 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
              title="Notificaciones y Alertas del Sistema"
            >
              <Bell size={15} />
              {alerts && alerts.length > 0 && (
                <span
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-sm ring-2 ring-white"
                  style={{ background: "#E11D48" }}
                >
                  {alerts.length}
                </span>
              )}
            </button>

            {/* Dropdown de Alertas */}
            {alertOpen && (
              <div
                className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Alertas del Sistema ({alerts?.length || 0})
                  </p>
                  <button
                    onClick={() => setAlertOpen(false)}
                    className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {alerts && alerts.map((a, i) => (
                    <div key={i} className="flex gap-2.5 p-3 hover:bg-slate-50/80 transition-colors">
                      <span className="mt-0.5 text-base shrink-0">
                        {a.type === "danger" ? "🚨" : a.type === "warn" ? "⚠️" : "ℹ️"}
                      </span>
                      <div>
                        <p className="font-bold text-slate-800">{a.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{a.desc}</p>
                      </div>
                    </div>
                  ))}
                  {(!alerts || alerts.length === 0) && (
                    <div className="p-6 text-center text-slate-400 italic">
                      No hay incidencias activas en la sede.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SESIÓN DE USUARIO */}
          {isDoctorRole ? (
            /* CONTROL DE SESIÓN DEL DOCTOR */
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex items-center gap-2 rounded-xl bg-slate-100/90 border border-slate-200/90 px-2.5 py-1 text-[11.5px]">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0048B5] text-white shrink-0">
                  <User size={13} />
                </span>
                <div className="flex flex-col text-left leading-tight">
                  <span className="font-extrabold text-slate-900 max-w-[110px] sm:max-w-[160px] truncate">
                    {currentUser.name}
                  </span>
                  {currentUser.spaceId ? (
                    <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                      <Laptop size={10} /> Puesto #{currentUser.spaceId}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-600 animate-pulse">
                      Sin puesto
                    </span>
                  )}
                </div>
              </div>

              {/* Botón Quitar Puesto */}
              {currentUser.spaceId && onReleaseMySpace && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`¿Deseas quitarte del Puesto #${currentUser.spaceId}? El cubículo quedará DISPONIBLE para reasignarte a otro o para el siguiente turno.`)) {
                      onReleaseMySpace();
                    }
                  }}
                  className="flex items-center gap-1 rounded-xl px-2 sm:px-2.5 py-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 shadow-2xs active:scale-95 transition-all cursor-pointer"
                  title="Liberar tu puesto actual sin cerrar sesión"
                >
                  <X size={12} className="text-amber-700" />
                  <span className="hidden sm:inline">Quitar #{currentUser.spaceId}</span>
                </button>
              )}

              {/* Finalizar Jornada */}
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(
                    currentUser.spaceId
                      ? `¿Deseas finalizar tu jornada de trabajo? El Puesto #${currentUser.spaceId} volverá a estar DISPONIBLE y se cerrará tu sesión.`
                      : "¿Deseas cerrar tu sesión?"
                  )) {
                    onLogout();
                  }
                }}
                className="flex items-center gap-1 rounded-xl px-2.5 sm:px-3 py-1.5 text-[11.5px] font-extrabold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-xs transition-all cursor-pointer"
                title="Finalizar jornada"
              >
                <LogOut size={12} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          ) : isSupervisorRole ? (
            /* CONTROL DE SESIÓN DE SUPERVISOR */
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex items-center gap-2 rounded-xl bg-cyan-50 border border-cyan-200 px-2.5 py-1 text-[11.5px]">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0048B5] text-white shrink-0">
                  <UserCheck size={13} />
                </span>
                <div className="flex flex-col text-left leading-tight">
                  <span className="font-extrabold text-slate-900 max-w-[110px] sm:max-w-[160px] truncate">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] font-bold text-cyan-800">
                    Puesto #{currentUser.puesto}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-rose-600 hover:border-rose-300 transition-colors shadow-2xs cursor-pointer"
                title="Cerrar sesión de Supervisor"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : isMasterRole ? (
            /* CONTROL DE SESIÓN DE MASTER ADMIN */
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 px-2.5 sm:px-3 py-1.5 text-[11.5px] font-bold text-slate-700 transition-colors shadow-2xs cursor-pointer"
                title="Cerrar sesión de Doctor Master"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          ) : (
            /* SIN SESIÓN: ACCESO / REGISTRO */
            <button
              type="button"
              onClick={onOpenAuthPortal}
              className="flex items-center gap-1.5 rounded-xl px-3 sm:px-3.5 py-1.5 text-[12px] font-black text-white shadow-xs transition hover:brightness-110 active:scale-95 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
            >
              <LogIn size={13} />
              <span>Acceso</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* BARRA MÓVIL / TABLET DE PESTAÑAS (Visible en pantallas < lg)   */}
      {/* ============================================================== */}
      {!isDoctorRole && (
        <div className="flex lg:hidden overflow-x-auto px-4 py-2 border-t border-slate-100 bg-slate-50/90 gap-1.5 scrollbar-none">
          {tabs.map((t) => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[11.5px] font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#0048B5] text-white shadow-xs"
                    : "bg-white text-slate-700 border border-slate-200 shadow-2xs hover:bg-slate-100"
                }`}
              >
                <t.icon size={13} className={isActive ? "text-cyan-300" : "text-slate-400"} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
