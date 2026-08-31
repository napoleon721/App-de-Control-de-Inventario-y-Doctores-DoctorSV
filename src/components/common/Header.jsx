import React, { useState } from "react";
import {
  LayoutGrid, Warehouse, Stethoscope, FileClock, Bell,
  RefreshCw, Sheet as SheetIcon, LogIn, Sparkles
} from "lucide-react";
import DoctorSVLogo from "./DoctorSVLogo";
import { BRAND } from "../../constants/tokens";

export default function Header({ tab, setTab, alerts, onSync, isSyncing }) {
  const [alertOpen, setAlertOpen] = useState(false);

  const tabs = [
    { id: "mapa", label: "Mapa de Espacios", icon: LayoutGrid },
    { id: "bodega", label: "Inventario Bodega", icon: Warehouse },
    { id: "medicos", label: "Médicos & Horarios", icon: Stethoscope },
    { id: "historial", label: "Auditoría & Historial", icon: FileClock },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs transition-all">
      {/* Top Accent Gradient Bar in DoctorSV Blue & Cyan */}
      <div
        className="h-1 w-full"
        style={{
          background: "linear-gradient(90deg, #0048B5 0%, #0095FF 50%, #0284C7 100%)",
        }}
      />

      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 py-2.5">
        {/* DoctorSV Logo */}
        <div className="flex items-center">
          <DoctorSVLogo className="h-9 sm:h-10" />
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1.5 rounded-full bg-slate-100/90 p-1 border border-slate-200/60 shadow-inner">
          {tabs.map((t) => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-white text-[#0048B5] shadow-sm ring-1 ring-slate-200 font-bold"
                    : "text-slate-600 hover:text-[#0048B5] hover:bg-white/50"
                }`}
              >
                <t.icon size={15} className={isActive ? "text-[#0095FF]" : "text-slate-400"} />
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <a
            href="#google-sheets"
            onClick={(e) => {
              e.preventDefault();
              alert("Integración de Google Sheets: Listo para conectar vía webhook de telemedicina DoctorSV.");
            }}
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition hover:border-emerald-500 hover:text-emerald-700 shadow-xs"
          >
            <SheetIcon size={14} className="text-emerald-600" />
            <span>Google Sheet</span>
            <LogIn size={11} className="opacity-50" />
          </a>

          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12px] font-semibold text-white transition duration-200 shadow-sm hover:shadow active:scale-95 disabled:opacity-75"
            style={{
              background: "linear-gradient(135deg, #0048B5 0%, #0077E6 100%)",
            }}
          >
            <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
            <span>{isSyncing ? "Sincronizando..." : "Sincronizar"}</span>
          </button>

          {/* System Notifications Badge */}
          <div className="relative">
            <button
              onClick={() => setAlertOpen((v) => !v)}
              className={`relative flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
                alertOpen
                  ? "border-blue-300 bg-blue-50 text-[#0048B5]"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
              title="Notificaciones y Alertas"
            >
              <Bell size={16} />
              {alerts.length > 0 && (
                <span
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-sm ring-2 ring-white"
                  style={{ background: "#E11D48" }}
                >
                  {alerts.length}
                </span>
              )}
            </button>

            {/* Dropdown Panel */}
            {alertOpen && (
              <div
                style={{ animation: "slideDown .2s cubic-bezier(0.16, 1, 0.3, 1) both" }}
                className="absolute right-0 top-11 z-50 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 px-2">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-[#0095FF]" />
                    <p className="text-[12px] font-bold uppercase tracking-wider text-slate-700">
                      Alertas del Centro
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 text-[#0048B5] px-2 py-0.5 text-[11px] font-bold border border-blue-100">
                    {alerts.length} activas
                  </span>
                </div>

                <div className="mt-2 max-h-72 divide-y divide-slate-100 overflow-y-auto pr-1">
                  {alerts.length === 0 ? (
                    <p className="py-6 text-center text-[12px] text-slate-400">
                      Todo en orden. No hay alertas activas en la sede.
                    </p>
                  ) : (
                    alerts.map((a, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-xl p-2.5 text-[12px] text-slate-700 transition hover:bg-slate-50"
                      >
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-2xs mt-0.5"
                          style={{ background: `${a.tone}15`, color: a.tone }}
                        >
                          <a.Icon size={14} />
                        </span>
                        <span className="leading-snug font-medium">{a.text}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Tabs */}
      <div className="flex gap-1.5 overflow-x-auto px-4 py-2 border-t border-slate-100 lg:hidden bg-slate-50/70">
        {tabs.map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all ${
                isActive
                  ? "bg-[#0048B5] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200/70"
              }`}
            >
              <t.icon size={13} />
              {t.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
