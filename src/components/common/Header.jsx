import React, { useState, useEffect } from "react";
import {
  LayoutGrid, Warehouse, Stethoscope, FileClock,
  RefreshCw, LogIn, Sparkles, UserCheck, CheckCircle2,
  Shield, LogOut, Laptop, User, FileSpreadsheet, Clock,
  Package, X, Check
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
  const [boxDrawerOpen, setBoxDrawerOpen] = useState(false);

  // Cerrar el cajón de herramientas con la tecla Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setBoxDrawerOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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

  // Supervisores solo tienen acceso a "Mapa" y "Asistencia"
  const tabs = isSupervisorRole
    ? allTabs.filter((t) => ["mapa", "asistencia"].includes(t.id))
    : allTabs;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs transition-all">
      {/* Barra superior con gradiente de identidad DoctorSV */}
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

      {/* Contenedor principal con distribución armónica adaptable */}
      <div className={`relative mx-auto flex ${tab === "mapa" ? "w-full max-w-[1920px] 2xl:max-w-[99vw] px-2 sm:px-4 lg:px-6" : "max-w-[1540px] px-4 sm:px-6"} items-center justify-between gap-3 sm:gap-4 py-2 transition-all duration-200`}>
        
        {/* ============================================================== */}
        {/* 1. LOGOTIPO A UN LADO, PEQUEÑO COMO ANTES                      */}
        {/* ============================================================== */}
        <div
          className="flex items-center gap-2.5 cursor-pointer select-none shrink-0"
          onClick={() => setTab("mapa")}
          title="Ir al Mapa Principal"
        >
          <DoctorSVLogo className="h-7 sm:h-8" showSubtext={true} />
          {isDoctorRole && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Estación
            </span>
          )}
          {isSupervisorRole && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-0.5 text-[10.5px] font-bold text-cyan-800 border border-cyan-200">
              <UserCheck size={11} className="text-cyan-700" />
              Supervisor
            </span>
          )}
          {isMasterRole && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10.5px] font-bold text-indigo-700 border border-indigo-200">
              <Shield size={11} className="text-indigo-600" />
              Master
            </span>
          )}
        </div>

        {/* ============================================================== */}
        {/* 2. PESTAÑAS FLUIDAS TIPO GOTA DE AGUA (ANIMACIÓN EXPANSIVA)    */}
        {/* ============================================================== */}
        {!isDoctorRole ? (
          <nav className="hidden lg:flex items-center gap-1.5 rounded-full bg-slate-100/90 p-1.5 border border-slate-200/80 shadow-inner backdrop-blur-md">
            {tabs.map((t) => {
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  title={t.label}
                  className={`group relative flex items-center justify-center h-9 rounded-full px-2.5 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden cursor-pointer select-none ${
                    isActive
                      ? "bg-gradient-to-r from-[#0048B5] via-[#0066E0] to-[#0095FF] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-300/40"
                      : "text-slate-600 hover:text-[#0048B5] hover:bg-white hover:shadow-md hover:shadow-blue-500/10 hover:ring-1 hover:ring-blue-100"
                  }`}
                >
                  {/* Ícono de la gota de agua con micro-animación de rebote elástico */}
                  <t.icon
                    size={16}
                    className={`shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-115 ${
                      isActive ? "text-white" : "text-slate-500 group-hover:text-[#0048B5]"
                    }`}
                  />

                  {/* Nombre que se despliega fluidamente como gota de agua al pasar el mouse */}
                  <span
                    className={`whitespace-nowrap font-extrabold text-[12px] overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] max-w-0 opacity-0 group-hover:max-w-[200px] group-hover:opacity-100 group-hover:ml-2 ${
                      isActive ? "text-white" : "text-[#0048B5]"
                    }`}
                  >
                    {t.label}
                  </span>

                  {/* Reflejo acuático de superficie (brillo de gota de agua) */}
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/30 via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Punto luminoso de la gota activa en reposo */}
                  {isActive && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-300 shadow-[0_0_6px_#00E5FF]" />
                  )}
                </button>
              );
            })}
          </nav>
        ) : (
          <div className="hidden md:flex items-center gap-2 text-[12.5px] font-semibold text-slate-700">
            <span className="font-heading font-extrabold text-slate-900">
              Plano de Cubículos
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 text-[12px]">
              Turno: <strong className="text-slate-800">{currentUser.shift || "General"}</strong>
            </span>
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. BOTÓN CAJA + SESIÓN A LA DERECHA                            */}
        {/* ============================================================== */}
        <div className="flex items-center gap-2 shrink-0">
          {/* EL BOTÓN CAJA (Abre la ventana desplegable superpuesta con todas las herramientas) */}
          {!isDoctorRole && (
            <button
              type="button"
              onClick={() => setBoxDrawerOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] font-extrabold transition-all shadow-2xs active:scale-95 cursor-pointer ${
                boxDrawerOpen
                  ? "bg-blue-50 border-[#0048B5] text-[#0048B5] shadow-xs ring-2 ring-blue-100"
                  : "border-slate-200/90 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700"
              }`}
              title="Abrir Caja de Herramientas y Opciones"
            >
              <Package size={14} className="text-[#0048B5]" />
              <span className="hidden sm:inline">Caja de Herramientas</span>
              <span className="sm:hidden">Caja</span>
              {isSyncing ? (
                <RefreshCw size={11} className="animate-spin text-[#0095FF]" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" title="Sincronización en vivo activa" />
              )}
              {alerts?.length > 0 && (
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>
          )}

          {/* Sesión de Usuario / Salida */}
          {isDoctorRole ? (
            /* SESIÓN DEL DOCTOR */
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 border border-slate-200 px-2 py-1 text-[11px]">
                <span className="flex h-5.5 w-5.5 items-center justify-center rounded-lg bg-[#0048B5] text-white shrink-0">
                  <User size={12} />
                </span>
                <span className="font-extrabold text-slate-900 max-w-[90px] sm:max-w-[130px] truncate">
                  {currentUser.name}
                </span>
              </div>

              {currentUser.spaceId && onReleaseMySpace && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`¿Deseas quitarte del Puesto #${currentUser.spaceId}?`)) {
                      onReleaseMySpace();
                    }
                  }}
                  className="p-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer"
                  title={`Quitar puesto #${currentUser.spaceId}`}
                >
                  <X size={12} />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (window.confirm("¿Deseas finalizar tu jornada y salir?")) {
                    onLogout();
                  }
                }}
                className="flex items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-extrabold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-xs transition-all cursor-pointer"
                title="Salir"
              >
                <LogOut size={12} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          ) : isSupervisorRole ? (
            /* SESIÓN DE SUPERVISOR */
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 rounded-xl bg-cyan-50 border border-cyan-200 px-2 py-1 text-[11px]">
                <span className="flex h-5.5 w-5.5 items-center justify-center rounded-lg bg-[#0048B5] text-white shrink-0">
                  <UserCheck size={12} />
                </span>
                <span className="font-extrabold text-slate-900 max-w-[80px] sm:max-w-[120px] truncate" title={currentUser.name}>
                  {currentUser.name}
                </span>
                {Number(currentUser.puesto) > 0 ? (
                  <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-sky-200/70 text-sky-900 text-[10px] font-mono-data font-black">
                    #{currentUser.puesto}
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[9.5px] font-bold">
                    Sin puesto
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-rose-600 hover:border-rose-300 transition-colors shadow-2xs cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : isMasterRole ? (
            /* SESIÓN DE MASTER */
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 px-2 py-1.5 text-[11px] font-bold text-slate-700 transition-colors shadow-2xs cursor-pointer"
                title="Cerrar sesión de Doctor Master"
              >
                <LogOut size={12} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          ) : (
            /* BOTÓN DE ACCESO */
            <button
              type="button"
              onClick={onOpenAuthPortal}
              className="flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1.5 text-[12px] font-black text-white shadow-xs transition hover:brightness-110 active:scale-95 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
            >
              <LogIn size={13} />
              <span>Acceso</span>
            </button>
          )}
        </div>

        {/* ============================================================== */}
        {/* VENTANA DESPLEGABLE SUPERPUESTA (POPOVER CAJA DE HERRAMIENTAS)  */}
        {/* ============================================================== */}
        {boxDrawerOpen && (
          <>
            {/* Telón transparente para cerrar al hacer clic afuera */}
            <div
              className="fixed inset-0 z-40 bg-slate-900/15 backdrop-blur-[1px] transition-opacity animate-in fade-in duration-150"
              onClick={() => setBoxDrawerOpen(false)}
            />

            {/* Ventana Superpuesta Flotante */}
            <div
              className="absolute right-3 sm:right-6 top-[calc(100%+8px)] z-50 w-[350px] sm:w-[410px] max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl border border-slate-200/95 overflow-hidden animate-in fade-in zoom-in-95 duration-150 ring-1 ring-slate-900/10 flex flex-col"
              style={{ maxHeight: "calc(100vh - 90px)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Encabezado del Popover */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#0048B5] text-white flex items-center justify-center shadow-xs shrink-0">
                    <Package size={16} />
                  </div>
                  <div>
                    <h3 className="text-[13.5px] font-black text-slate-900 tracking-tight leading-tight">
                      Caja de Herramientas
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
                      Acciones rápidas, módulos y configuración
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBoxDrawerOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Cerrar ventana"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Contenido con scroll independiente */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/20 text-left">
                
                {/* 1. ACCIONES RÁPIDAS PRINCIPALES: AUTO CHECK-IN & SYNC */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400">
                      Acciones Principales
                    </span>
                    <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800">
                      En Vivo
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {/* Botón Auto Check-In */}
                    {onOpenCheckIn && (
                      <button
                        type="button"
                        onClick={() => {
                          setBoxDrawerOpen(false);
                          onOpenCheckIn();
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-[#0048B5] to-[#0095FF] hover:brightness-110 text-white text-left transition-all shadow-xs group cursor-pointer active:scale-98"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <CheckCircle2 size={17} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[13px] font-black tracking-tight truncate">
                              Auto Check-In de Médicos
                            </span>
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-white/25 text-white shrink-0">
                              Directo
                            </span>
                          </div>
                          <p className="text-[11px] text-white/80 truncate mt-0.5">
                            Portal para asignar cubículos y firmar jornada
                          </p>
                        </div>
                      </button>
                    )}

                    {/* Botón Sync en Vivo */}
                    {onSync && (
                      <button
                        type="button"
                        onClick={() => {
                          onSync();
                        }}
                        disabled={isSyncing}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200/90 hover:border-emerald-300 hover:bg-emerald-50/50 text-left transition-all shadow-2xs group cursor-pointer disabled:opacity-75"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                          <RefreshCw size={15} className={isSyncing ? "animate-spin text-[#0095FF]" : "text-emerald-600"} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[12.5px] font-extrabold text-slate-900 group-hover:text-emerald-900 truncate">
                              {isSyncing ? "Sincronizando datos..." : "Sincronizar en Vivo"}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 shrink-0 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Sync
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {lastSyncTime
                              ? `Última sincronización: ${lastSyncTime.toLocaleTimeString("es-SV")}`
                              : "Actualizar mapa y nóminas con la nube"}
                          </p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Herramientas de Sede */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400">
                      Herramientas de Sede
                    </span>
                    <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-md bg-blue-100 text-[#0048B5] font-mono">
                      DoctorSV
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {/* Google Sheets en Vivo */}
                    {onOpenGoogleSheetsConfig && (
                      <button
                        type="button"
                        onClick={() => {
                          setBoxDrawerOpen(false);
                          onOpenGoogleSheetsConfig();
                        }}
                        className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200/90 hover:border-emerald-300 hover:bg-emerald-50/50 text-left transition-all shadow-2xs group cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                          <FileSpreadsheet size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[12.5px] font-extrabold text-slate-900 group-hover:text-emerald-900 truncate">
                              Google Sheets en Vivo
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 shrink-0">
                              Base de Datos
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            Hoja maestra con pestañas por supervisor
                          </p>
                        </div>
                      </button>
                    )}

                    {/* Resumen San Miguel */}
                    {onOpenDailyLots && (
                      <button
                        type="button"
                        onClick={() => {
                          setBoxDrawerOpen(false);
                          onOpenDailyLots();
                        }}
                        className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200/90 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-all shadow-2xs group cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                          <LayoutGrid size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[12.5px] font-extrabold text-slate-900 group-hover:text-indigo-900 truncate">
                              Resumen San Miguel
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 shrink-0">
                              Lotes Diarios
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            Distribución de cubículos por turno
                          </p>
                        </div>
                      </button>
                    )}

                    {/* Lotes Supervisores */}
                    {onOpenSupervisorConfig && (
                      <button
                        type="button"
                        onClick={() => {
                          setBoxDrawerOpen(false);
                          onOpenSupervisorConfig();
                        }}
                        className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200/90 hover:border-sky-300 hover:bg-sky-50/50 text-left transition-all shadow-2xs group cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                          <Shield size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[12.5px] font-extrabold text-slate-900 group-hover:text-sky-900 truncate">
                              Lotes de Supervisores
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 shrink-0">
                              Cubículos
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            Rangos fijos asignados por supervisor
                          </p>
                        </div>
                      </button>
                    )}

                    {/* Configuración de Turnos */}
                    {onOpenShiftConfig && (
                      <button
                        type="button"
                        onClick={() => {
                          setBoxDrawerOpen(false);
                          onOpenShiftConfig();
                        }}
                        className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200/90 hover:border-blue-300 hover:bg-blue-50/50 text-left transition-all shadow-2xs group cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0048B5] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                          <Clock size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[12.5px] font-extrabold text-slate-900 group-hover:text-blue-900 truncate">
                              Turnos y Horarios
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-[#0048B5] shrink-0">
                              Horarios
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            Configurar franjas oficiales de atención
                          </p>
                        </div>
                      </button>
                    )}

                    {/* Reporte en Vivo */}
                    {onOpenLiveReport && (
                      <button
                        type="button"
                        onClick={() => {
                          setBoxDrawerOpen(false);
                          onOpenLiveReport();
                        }}
                        className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200/90 hover:border-amber-300 hover:bg-amber-50/50 text-left transition-all shadow-2xs group cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                          <Sparkles size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[12.5px] font-extrabold text-slate-900 group-hover:text-amber-900 truncate">
                              Reporte de Asistencia
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 shrink-0">
                              En Vivo
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            Estadísticas y ocupación en tiempo real
                          </p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                {/* Módulos del Sistema */}
                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 px-0.5">
                    Módulos del Sistema
                  </span>
                  <div className="grid grid-cols-1 gap-1">
                    {allTabs.map((t) => {
                      const isActive = tab === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setTab(t.id);
                            setBoxDrawerOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                            isActive
                              ? "bg-blue-50 text-[#0048B5] font-extrabold border border-blue-200/80 shadow-2xs"
                              : "hover:bg-slate-100/80 text-slate-700 font-semibold"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <t.icon size={14} className={isActive ? "text-[#0095FF]" : "text-slate-400"} />
                            <span className="text-[12px]">{t.label}</span>
                          </div>
                          {isActive && <Check size={13} className="text-[#0048B5]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Incidencias del Sistema */}
                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400">
                      Incidencias
                    </span>
                    <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700">
                      {alerts?.length || 0} activas
                    </span>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200/90 p-2.5 space-y-1.5">
                    {alerts && alerts.length > 0 ? (
                      alerts.map((a, i) => (
                        <div key={i} className="flex gap-2 p-1.5 rounded-lg hover:bg-slate-50 text-xs">
                          <span className="text-sm shrink-0">
                            {a.type === "danger" ? "🚨" : a.type === "warn" ? "⚠️" : "ℹ️"}
                          </span>
                          <div>
                            <p className="font-bold text-slate-800 text-[11.5px]">{a.title}</p>
                            <p className="text-[10.5px] text-slate-500 mt-0.5">{a.desc}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-1 text-center text-slate-400 italic text-[11.5px]">
                        ✅ Sin incidencias activas en la sede.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Pie de la Ventana */}
              <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>DoctorSV © {new Date().getFullYear()}</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Sincronizado
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Barra móvil para pantallas pequeñas (< lg) */}
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
