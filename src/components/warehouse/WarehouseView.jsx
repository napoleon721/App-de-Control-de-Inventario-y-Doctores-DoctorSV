import React, { useState } from "react";
import {
  Warehouse, LayoutGrid, Plus, TrendingUp, TrendingDown, Minus, ShieldCheck, AlertOctagon
} from "lucide-react";
import SectionCard from "../common/SectionCard";
import MovementModal from "./MovementModal";

export default function WarehouseView({ bodegaStock, spaces, onRegisterMovement }) {
  const [movementModalOpen, setMovementModalOpen] = useState(false);

  const totalesEquipo = bodegaStock.map((t) => {
    const enUso =
      t.key === "PC"
        ? spaces.filter(
            (s) =>
              ["OCUPADO", "DISPONIBLE", "INCOMPLETO", "RESERVADO"].includes(s.estado) &&
              s.marca
          ).length
        : t.key === "MONITOR"
        ? spaces.filter((s) => s.monitor).length
        : t.key === "MOUSE"
        ? spaces.filter((s) => s.mouse).length
        : t.key === "HEADSET"
        ? spaces.filter((s) => s.headset).length
        : t.key === "HUB"
        ? spaces.filter((s) => s.hub).length
        : Math.max(0, spaces.filter((s) => s.marca).length - 4);

    const reparacion = spaces.filter((s) => s.estado === "REPARACION").length;
    return { ...t, enUso, reparacion, total: enUso + reparacion + t.actual };
  });

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Tarjeta 1: Inventario Bodega */}
      <SectionCard
        icon={Warehouse}
        title="Stock de Bodega Central"
        subtitle="Existencias de reserva vs. asignación activa en cubículos"
        right={
          <button
            onClick={() => setMovementModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[12px] font-semibold text-white transition hover:brightness-110 shadow-xs"
            style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
          >
            <Plus size={14} /> Registrar Movimiento
          </button>
        }
      >
        <div className="flex flex-col divide-y divide-slate-100">
          {bodegaStock.map((b) => {
            const delta = b.actual - b.original;
            const Icon = b.icon;
            const isLowStock = b.actual <= 1;

            return (
              <div key={b.key} className="flex items-center justify-between py-3.5">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#0048B5] shadow-2xs"
                  >
                    <Icon size={17} />
                  </span>
                  <div>
                    <span className="font-heading text-[14px] font-bold text-slate-800">
                      {b.key}
                    </span>
                    <p className="text-[11px] text-slate-400 font-medium">{b.label}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Original</p>
                    <p className="font-mono-data text-[13px] font-semibold text-slate-500">
                      {b.original}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">En Bodega</p>
                    <p
                      className={`font-mono-data text-[14px] font-bold ${
                        isLowStock ? "text-rose-600 font-extrabold" : "text-slate-900"
                      }`}
                    >
                      {b.actual}
                    </p>
                  </div>
                  <span
                    className={`flex items-center gap-0.5 rounded-lg px-2 py-0.5 text-[11px] font-bold border ${
                      delta < 0
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : delta > 0
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    {delta < 0 ? (
                      <TrendingDown size={12} />
                    ) : delta > 0 ? (
                      <TrendingUp size={12} />
                    ) : (
                      <Minus size={12} />
                    )}{" "}
                    {delta}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setMovementModalOpen(true)}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-3 text-[12.5px] font-semibold text-slate-600 transition hover:border-[#0095FF] hover:text-[#0048B5] hover:bg-blue-50/40"
        >
          <Plus size={15} /> Registrar movimiento rápido de periféricos / PC
        </button>
      </SectionCard>

      {/* Tarjeta 2: Balance Global de Equipos */}
      <SectionCard
        icon={LayoutGrid}
        title="Balance Consolidado de Hardware"
        subtitle="Inventario total activo en la sede de San Miguel"
      >
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-3.5 py-2.5">Hardware</th>
                <th className="px-3.5 py-2.5 text-right">En Uso</th>
                <th className="px-3.5 py-2.5 text-right">Reparación</th>
                <th className="px-3.5 py-2.5 text-right">Bodega</th>
                <th className="px-3.5 py-2.5 text-right">Total Sede</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {totalesEquipo.map((t) => {
                const Icon = t.icon;
                return (
                  <tr key={t.key} className="hover:bg-slate-50/70 transition-colors">
                    <td className="flex items-center gap-2.5 px-3.5 py-3 font-semibold text-slate-800">
                      <Icon size={14} className="text-[#0048B5]" /> {t.key}
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono-data text-slate-700">{t.enUso}</td>
                    <td className="px-3.5 py-3 text-right font-mono-data text-purple-600 font-semibold">{t.reparacion}</td>
                    <td className="px-3.5 py-3 text-right font-mono-data text-slate-600">{t.actual}</td>
                    <td className="px-3.5 py-3 text-right font-mono-data font-bold text-[#0048B5]">
                      {t.total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-2xl p-3.5 border border-blue-100 bg-blue-50/50 flex items-start gap-2.5 text-[11.5px] text-slate-700">
          <ShieldCheck size={16} className="text-[#0095FF] shrink-0 mt-0.5" />
          <span>
            <b>Auditoría DoctorSV:</b> Los valores se recalculan en tiempo real según el estado de cada cubículo y las bitácoras de inventario.
          </span>
        </div>
      </SectionCard>

      {/* Modal de Movimiento */}
      {movementModalOpen && (
        <MovementModal
          onClose={() => setMovementModalOpen(false)}
          onRegister={onRegisterMovement}
          spaces={spaces}
        />
      )}
    </div>
  );
}
