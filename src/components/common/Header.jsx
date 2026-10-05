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

      {/* Contenedor principal con distribución armónica */}
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-2">
        
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
        {/* 2. PESTAÑAS CENTRADAS                                          */}
        {/* ============================================================== */}
        {!isDoctorRole ? (
          <nav className="hidden lg:flex items-center gap-1 rounded-2xl bg-slate-100/90 p-1 border border-slate-200/70 shadow-inner">
            {tabs.map((t) => {
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-bold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "bg-white text-[#0048B5] shadow-xs font-black ring-1 ring-slate-200/90 scale-[1.01]"
                      : "text-slate-600 hover:text-[#0048B5] hover:bg-white/60"
                  }`}
                >
                  <t.icon
                    size={13.5}
                    className={`shrink-0 ${isActive ? "text-[#0095FF]" : "text-slate-400"}`}
                  />
                  <span className="whitespace-nowrap hidden xl:inline">{t.label}</span>
                  <span className="whitespace-nowrap xl:hidden">{t.shortLabel}</span>
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
        {/* 3. SOLO LOS BOTONES IMPORTANTES + BOTÓN CAJA A LA DERECHA      */}
        {/* ============================================================== */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Botón Importante: Auto Check-In */}
          {!isDoctorRole && onOpenCheckIn && (
            <button
              type="button"
              onClick={onOpenCheckIn}
              className="flex items-center gap-1.5 rounded-xl px-3 sm:px-3.5 py-1.5 text-[12px] font-black text-white transition-all hover:brightness-110 active:scale-95 shadow-xs cursor-pointer"
              style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
              title="Abrir Auto Check-In de Médicos"
            >
              <CheckCircle2 size={13.5} className="shrink-0" />
              <span className="hidden sm:inline">Auto Check-In</span>
              <span className="sm:hidden">Check-In</span>
            </button>
          )}

          {/* Botón Importante: Sync en Vivo */}
          {!isDoctorRole && onSync && (
            <button
              type="button"
              onClick={onSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-2.5 sm:px-3 py-1.5 text-[12px] font-bold text-slate-700 transition hover:bg-slate-50 shadow-2xs disabled:opacity-75 cursor-pointer"
              title={
                lastSyncTime
                  ? `Sincronización en vivo activa · Última: ${lastSyncTime.toLocaleTimeString("es-SV")}`
                  : "Sincronizar puestos y nómina en tiempo real"
              }
            >
              <RefreshCw
                size={12.5}
                className={isSyncing ? "animate-spin text-[#0095FF]" : "text-emerald-500"}
              />
              <span className="hidden md:inline">{isSyncing ? "Sync..." : "Sync"}</span>
              <span
                className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"
                title="Conexión en vivo activa"
              />
            </button>
          )}

          {/* EL BOTÓN CAJA (Guarda todas las herramientas secundarias en un cajón limpio) */}
          {!isDoctorRole && (
            <button
              type="button"
              onClick={() => setBoxDrawerOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-slate-300 px-2.5 sm:px-3 py-1.5 text-[12px] font-extrabold text-slate-700 transition-all shadow-2xs active:scale-95 cursor-pointer"
              title="Abrir Caja de Herramientas y Opciones"
            >
              <Package size={14} className="text-[#0048B5]" />
              <span className="hidden sm:inline">Caja</span>
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
                <span className="font-extrabold text-slate-900 max-w-[80px] sm:max-w-[120px] truncate">
                  {currentUser.name}
                </span>
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

      {/* ============================================================== */}
      {/* EL "BOTÓN CAJA": CAJÓN LATERAL DE HERRAMIENTAS Y AJUSTES      */}
      {/* ============================================================== */}
      {boxDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setBoxDrawerOpen(false)}
        >
          <div
            className="w-full max-w-sm sm:max-w-md bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-250 border-l border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header de la Caja */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0048B5] text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="text-[15px] font-black text-slate-900 tracking-tight">
                    Caja de Herramientas
                  </h3>
                  <p className="text-[11.5px] text-slate-500 font-medium">
                    Panel de administración, ajustes y módulos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBoxDrawerOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cuerpo del Cajón */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50/30">
              
              {/* Sección 1: Herramientas de Configuración */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    Ajustes de Administración
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#0048B5] font-mono">
                    DoctorSV Admin
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
                      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200/90 hover:border-emerald-300 hover:bg-emerald-50/50 text-left transition-all shadow-xs group cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                        <FileSpreadsheet size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[13px] font-extrabold text-slate-900 group-hover:text-emerald-900 truncate">
                            Google Sheets en Vivo
                          </span>
                          <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 shrink-0">
                            Base de Datos
                          </span>
                        </div>
                        <p className="text-[11.5px] text-slate-500 truncate mt-0.5">
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
                      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200/90 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-all shadow-xs group cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                        <LayoutGrid size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[13px] font-extrabold text-slate-900 group-hover:text-indigo-900 truncate">
                            Resumen San Miguel
                          </span>
                          <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 shrink-0">
                            Lotes Diarios
                          </span>
                        </div>
                        <p className="text-[11.5px] text-slate-500 truncate mt-0.5">
                          Distribución de cubículos por turno y supervisor
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
                      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200/90 hover:border-sky-300 hover:bg-sky-50/50 text-left transition-all shadow-xs group cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                        <Shield size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[13px] font-extrabold text-slate-900 group-hover:text-sky-900 truncate">
                            Lotes de Supervisores
                          </span>
                          <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 shrink-0">
                            Cubículos
                          </span>
                        </div>
                        <p className="text-[11.5px] text-slate-500 truncate mt-0.5">
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
                      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-300 hover:bg-blue-50/50 text-left transition-all shadow-xs group cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#0048B5] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                        <Clock size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[13px] font-extrabold text-slate-900 group-hover:text-blue-900 truncate">
                            Turnos y Horarios
                          </span>
                          <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-[#0048B5] shrink-0">
                            Horarios
                          </span>
                        </div>
                        <p className="text-[11.5px] text-slate-500 truncate mt-0.5">
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
                      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200/90 hover:border-amber-300 hover:bg-amber-50/50 text-left transition-all shadow-xs group cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                        <Sparkles size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[13px] font-extrabold text-slate-900 group-hover:text-amber-900 truncate">
                            Reporte de Asistencia
                          </span>
                          <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 shrink-0">
                            En Vivo
                          </span>
                        </div>
                        <p className="text-[11.5px] text-slate-500 truncate mt-0.5">
                          Estadísticas y ocupación en tiempo real
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* Sección 2: Navegación Completa de Módulos */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-1">
                  Módulos del Sistema
                </span>
                <div className="space-y-1">
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
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer ${
                          isActive
                            ? "bg-blue-50 text-[#0048B5] font-extrabold border border-blue-200 shadow-2xs"
                            : "hover:bg-slate-100/80 text-slate-700 font-semibold"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <t.icon size={16} className={isActive ? "text-[#0095FF]" : "text-slate-400"} />
                          <span className="text-[12.5px]">{t.label}</span>
                        </div>
                        {isActive && <Check size={14} className="text-[#0048B5]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sección 3: Alertas del Sistema */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    Incidencias & Alertas
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {alerts?.length || 0} activas
                  </span>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 p-3 space-y-2">
                  {alerts && alerts.length > 0 ? (
                    alerts.map((a, i) => (
                      <div key={i} className="flex gap-2.5 p-2 rounded-xl hover:bg-slate-50 text-xs">
                        <span className="text-base shrink-0">
                          {a.type === "danger" ? "🚨" : a.type === "warn" ? "⚠️" : "ℹ️"}
                        </span>
                        <div>
                          <p className="font-bold text-slate-800">{a.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{a.desc}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-3 text-center text-slate-400 italic text-[12px]">
                      ✅ Sin incidencias activas en la sede.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer del Cajón */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-[11.5px] text-slate-500">
              <span>DoctorSV © {new Date().getFullYear()}</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sincronización Activa
              </span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
