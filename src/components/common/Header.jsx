import React, { useState } from "react";
import {
  LayoutGrid, Warehouse, Stethoscope, FileClock, Bell,
  RefreshCw, Sheet as SheetIcon, LogIn, Sparkles, UserCheck, CheckCircle2,
  Shield, LogOut, Laptop, User
} from "lucide-react";
import DoctorSVLogo from "./DoctorSVLogo";
import { BRAND } from "../../constants/tokens";

export default function Header({
  tab,
  setTab,
  alerts,
  onSync,
  isSyncing,
  onOpenCheckIn,
  currentUser,
  onLogout,
  onOpenAuthPortal,
}) {
  const [alertOpen, setAlertOpen] = useState(false);

  const tabs = [
    { id: "mapa", label: "Mapa de Espacios", icon: LayoutGrid },
    { id: "asistencia", label: "Control de Asistencia", icon: UserCheck },
    { id: "medicos", label: "Padrón de Médicos", icon: Stethoscope },
    { id: "bodega", label: "Inventario Bodega", icon: Warehouse },
    { id: "historial", label: "Auditoría & Historial", icon: FileClock },
  ];

  const isDoctorRole = currentUser?.role === "DOCTOR";
  const isMasterRole = currentUser?.role === "MASTER";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs transition-all">
      {/* Top Accent Gradient Bar in DoctorSV Blue & Cyan */}
      <div
        className="h-1 w-full"
        style={{
          background: isDoctorRole
            ? "linear-gradient(90deg, #15803D 0%, #22C55E 50%, #0095FF 100%)"
            : "linear-gradient(90deg, #0048B5 0%, #0095FF 50%, #0284C7 100%)",
        }}
      />

      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 py-2.5">
        {/* DoctorSV Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setTab("mapa")}>
          <DoctorSVLogo className="h-9 sm:h-10" />
          {isDoctorRole && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Estación de Trabajo
            </span>
          )}
          {isMasterRole && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200">
              <Shield size={11} className="text-indigo-600" />
              Doctor Master
            </span>
          )}
        </div>

        {/* Desktop Navigation Tabs (Visible only for Doctor Master or unauthenticated) */}
        {!isDoctorRole && (
          <nav className="hidden lg:flex items-center gap-1 rounded-full bg-slate-100/90 p-1 border border-slate-200/60 shadow-inner">
            {tabs.map((t) => {
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-white text-[#0048B5] shadow-sm ring-1 ring-slate-200 font-bold"
                      : "text-slate-600 hover:text-[#0048B5] hover:bg-white/50"
                  }`}
                >
                  <t.icon size={14} className={isActive ? "text-[#0095FF]" : "text-slate-400"} />
                  {t.label}
                </button>
              );
            })}
          </nav>
        )}

        {/* Doctor Role Focus Title */}
        {isDoctorRole && (
          <div className="hidden md:flex items-center gap-2 text-[13px] font-semibold text-slate-700">
            <span className="font-heading font-bold text-slate-800">
              Plano de Ubicación de Equipos
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 text-[12px]">
              Turno: <strong className="text-slate-700">{currentUser.shift}</strong>
            </span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Check-In Button (Master only) */}
          {!isDoctorRole && (
            <button
              onClick={onOpenCheckIn}
              className="flex items-center gap-1.5 rounded-xl px-3 sm:px-3.5 py-1.5 text-[12px] font-bold text-white transition hover:brightness-110 shadow-xs active:scale-95"
              style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
            >
              <CheckCircle2 size={14} />
              <span className="hidden sm:inline">⚡ Auto Check-In</span>
              <span className="sm:hidden">Check-In</span>
            </button>
          )}

          {/* Sync (Master only) */}
          {!isDoctorRole && (
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50 shadow-xs disabled:opacity-75"
            >
              <RefreshCw size={13} className={isSyncing ? "animate-spin text-[#0095FF]" : "text-slate-500"} />
              <span>{isSyncing ? "Sincronizando..." : "Sync"}</span>
            </button>
          )}

          {/* DOCTOR SESSION ACTIVE CONTROLS */}
          {isDoctorRole ? (
            <div className="flex items-center gap-2">
              {/* Doctor Status Pill */}
              <div className="flex items-center gap-2 rounded-2xl bg-slate-100/90 border border-slate-200/80 px-3 py-1 text-[12px]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0048B5] text-white">
                  <User size={13} />
                </span>
                <div className="flex flex-col text-left leading-tight">
                  <span className="font-bold text-slate-800 max-w-[130px] sm:max-w-[200px] truncate">
                    {currentUser.name}
                  </span>
                  {currentUser.spaceId ? (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                      <Laptop size={10} /> Puesto #{currentUser.spaceId} (Asignado)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-600 animate-pulse">
                      ⚠️ Selecciona puesto en el mapa
                    </span>
                  )}
                </div>
              </div>

              {/* Botón Destacado: Finalizar Jornada / Desloguear */}
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
                className="flex items-center gap-1.5 rounded-xl px-3 sm:px-3.5 py-1.5 text-[12px] font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-xs transition-all"
                title="Finaliza tu jornada y libera el puesto para el siguiente turno"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Finalizar Jornada (Liberar Puesto)</span>
                <span className="sm:hidden">Finalizar</span>
              </button>
            </div>
          ) : isMasterRole ? (
            /* MASTER SESSION CONTROLS */
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-[11.5px] font-bold text-indigo-900">
                <Shield size={13} className="text-indigo-600" />
                <span>Master Admin</span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-slate-600 hover:text-rose-600 hover:border-rose-300 transition-colors shadow-2xs"
                title="Cerrar sesión de Doctor Master"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            </div>
          ) : (
            /* NO SESSION: BOTÓN PARA ABRIR PORTAL */
            <button
              type="button"
              onClick={onOpenAuthPortal}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-bold text-white shadow-xs transition hover:brightness-110"
              style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
            >
              <LogIn size={13} />
              <span>Acceso / Registro</span>
            </button>
          )}

          {/* System Notifications Badge */}
          <div className="relative">
            <button
              onClick={() => setAlertOpen((v) => !v)}
              className={`relative flex h-8 w-8 items-center justify-center rounded-xl border transition-all ${
                alertOpen
                  ? "border-blue-300 bg-blue-50 text-[#0048B5]"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
              title="Notificaciones y Alertas"
            >
              <Bell size={16} />
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
                style={{ animation: "popIn .15s ease-out both" }}
                className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5 z-50"
              >
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
                  <p className="font-heading text-xs font-bold uppercase tracking-wider text-slate-700">
                    Alertas del Sistema ({alerts?.length || 0})
                  </p>
                  <button
                    onClick={() => setAlertOpen(false)}
                    className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
                  >
                    Cerrar
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {alerts && alerts.map((a, i) => (
                    <div key={i} className="flex gap-2.5 p-3 hover:bg-slate-50/80 transition-colors">
                      <span className="mt-0.5 text-base">
                        {a.type === "danger" ? "🚨" : a.type === "warn" ? "⚠️" : "ℹ️"}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-800">{a.title}</p>
                        <p className="text-[11px] text-slate-500">{a.desc}</p>
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
        </div>
      </div>

      {/* Mobile Navigation Tabs (Solo Master o sin sesion) */}
      {!isDoctorRole && (
        <div className="flex lg:hidden overflow-x-auto px-4 py-2 border-t border-slate-100 bg-slate-50/80 gap-1.5 scrollbar-none">
          {tabs.map((t) => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-[#0048B5] text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200"
                }`}
              >
                <t.icon size={12} className={isActive ? "text-cyan-300" : "text-slate-400"} />
                {t.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
