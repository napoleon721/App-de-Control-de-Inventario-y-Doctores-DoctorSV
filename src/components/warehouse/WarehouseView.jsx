import React, { useState } from "react";
import {
  Warehouse, LayoutGrid, Plus, TrendingUp, TrendingDown, Minus, ShieldCheck,
  Clock, FileText, ArrowRightLeft, Filter
} from "lucide-react";
import SectionCard from "../common/SectionCard";
import MovementModal from "./MovementModal";

export default function WarehouseView({ bodegaStock, spaces, onRegisterMovement, historial = [] }) {
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [filterTipo, setFilterTipo] = useState("TODOS");

  // Filtrar del historial solo los movimientos relacionados a bodega / hardware
  const BODEGA_ACTIONS = ["Movimiento", "Cambio", "Retiro", "Ingreso", "Reemplazo por falla",
    "Reemplazo preventivo", "Préstamo", "Devolución", "Baja de equipo"];
  const warehouseMovements = historial
    .filter((h) => {
      const isWarehouse = h.origen === "BODEGA" || h.destino === "BODEGA" ||
        BODEGA_ACTIONS.some((a) => h.accion && h.accion.toLowerCase().includes(a.toLowerCase())) ||
        ["PC", "MAUSE", "HUB", "MONITOR", "CABLES", "HEADSET"].includes(h.equipo);
      const matchesTipo = filterTipo === "TODOS" || h.equipo === filterTipo;
      return isWarehouse && matchesTipo;
    })
    .slice(0, 30);

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

      {/* Sección: Reporte de Movimientos Recientes de Bodega */}
      <SectionCard
        icon={FileText}
        title="Reporte de Movimientos · Inventario Bodega"
        subtitle="Log en tiempo real de todos los cambios de hardware registrados en la sede"
        right={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs">
              <Filter size={13} className="text-slate-400" />
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="bg-transparent text-[12px] font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="TODOS">Todo el hardware</option>
                {["PC", "MAUSE", "HUB", "MONITOR", "CABLES", "HEADSET"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setMovementModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[12px] font-semibold text-white transition hover:brightness-110 shadow-xs"
              style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
            >
              <Plus size={14} /> Registrar Movimiento
            </button>
          </div>
        }
      >
        {warehouseMovements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <ArrowRightLeft size={28} className="mb-2 opacity-40" />
            <p className="text-[13px] font-medium">No hay movimientos de bodega registrados aún.</p>
            <p className="text-[11.5px] mt-1">Registra un movimiento para que aparezca aquí.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-3.5 py-2.5">Fecha</th>
                  <th className="px-3.5 py-2.5">Hardware</th>
                  <th className="px-3.5 py-2.5">Acción</th>
                  <th className="px-3.5 py-2.5">Origen</th>
                  <th className="px-3.5 py-2.5">Destino</th>
                  <th className="px-3.5 py-2.5">Puesto</th>
                  <th className="px-3.5 py-2.5">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {warehouseMovements.map((mov, idx) => {
                  const isFromBodega = mov.origen === "BODEGA";
                  const isToBodega = mov.destino === "BODEGA";
                  return (
                    <tr key={mov.id || idx} className="hover:bg-blue-50/20 transition-colors">
                      <td className="px-3.5 py-2.5 text-slate-500 font-mono-data text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock size={11} className="text-slate-400" />
                          {mov.fecha}
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className="inline-flex items-center rounded-lg bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-bold text-[#0048B5]">
                          {mov.equipo || "—"}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-bold border ${
                          isFromBodega
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : isToBodega
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}>
                          {isFromBodega ? "↑ Salida" : isToBodega ? "↓ Entrada" : mov.accion || "—"}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-600 font-medium">{mov.origen || "—"}</td>
                      <td className="px-3.5 py-2.5 text-slate-600 font-medium">{mov.destino || "—"}</td>
                      <td className="px-3.5 py-2.5">
                        {mov.espacio ? (
                          <span className="font-mono-data text-[11.5px] font-bold text-[#0048B5]">
                            #{mov.espacio}
                          </span>
                        ) : <span className="text-slate-400 text-[11px]">—</span>}
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-500 max-w-[220px]">
                        <p className="truncate text-[11px]" title={mov.obs}>{mov.obs || mov.falla || "—"}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
