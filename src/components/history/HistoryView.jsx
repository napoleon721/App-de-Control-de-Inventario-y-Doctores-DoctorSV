import React, { useState, useMemo } from "react";
import { FileClock, Plus, Search, Filter, ArrowRightLeft, Wrench, RefreshCw, Layers } from "lucide-react";
import SectionCard from "../common/SectionCard";
import MovementModal from "../warehouse/MovementModal";

export default function HistoryView({ historial, spaces, onRegisterMovement }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState("");
  const [filterAccion, setFilterAccion] = useState("TODOS");
  const [filterEquipo, setFilterEquipo] = useState("TODOS");

  const filteredHistory = useMemo(() => {
    return historial.filter((m) => {
      const matchesSearch =
        m.equipo.toLowerCase().includes(searchHistory.toLowerCase()) ||
        String(m.espacio || "").includes(searchHistory) ||
        (m.obs && m.obs.toLowerCase().includes(searchHistory.toLowerCase())) ||
        (m.falla && m.falla.toLowerCase().includes(searchHistory.toLowerCase())) ||
        (m.origen && m.origen.toLowerCase().includes(searchHistory.toLowerCase())) ||
        (m.destino && m.destino.toLowerCase().includes(searchHistory.toLowerCase()));

      const matchesAccion = filterAccion === "TODOS" || m.accion === filterAccion;
      const matchesEquipo = filterEquipo === "TODOS" || m.equipo === filterEquipo;
      return matchesSearch && matchesAccion && matchesEquipo;
    });
  }, [historial, searchHistory, filterAccion, filterEquipo]);

  // Quick stats
  const totalReemplazos = historial.filter((m) => m.accion === "Reemplazo").length;
  const totalTraslados = historial.filter((m) => m.accion === "Traslado").length;
  const totalCambios = historial.filter((m) => m.accion === "Cambio").length;

  return (
    <SectionCard
      icon={FileClock}
      title="Bitácora de Auditoría y Movimientos de Inventario"
      subtitle="Registro histórico de rotación de hardware, reemplazos, traslados y fallas"
      right={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-xs focus-within:ring-2 focus-within:ring-[#0095FF]/40">
            <Search size={14} className="text-slate-400" />
            <input
              value={searchHistory}
              onChange={(e) => setSearchHistory(e.target.value)}
              placeholder="Buscar en bitácora..."
              className="w-36 sm:w-48 bg-transparent text-[12px] font-medium outline-none placeholder:text-slate-400"
            />
            {searchHistory && (
              <button onClick={() => setSearchHistory("")} className="text-[11px] font-bold text-slate-400 hover:text-slate-600">
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-xs">
            <Filter size={13} className="text-slate-400" />
            <select
              value={filterAccion}
              onChange={(e) => setFilterAccion(e.target.value)}
              className="bg-transparent text-[12px] outline-none font-semibold text-slate-700 cursor-pointer"
            >
              <option value="TODOS">Todas las acciones ({historial.length})</option>
              <option value="Reemplazo">Reemplazo ({totalReemplazos})</option>
              <option value="Traslado">Traslado ({totalTraslados})</option>
              <option value="Cambio">Cambio ({totalCambios})</option>
              <option value="Reintegro">Reintegro</option>
              <option value="Mantenimiento">Mantenimiento</option>
              <option value="Retiro">Retiro</option>
            </select>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[12px] font-semibold text-white transition hover:brightness-110 shadow-xs"
            style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
          >
            <Plus size={14} /> Registrar Movimiento
          </button>
        </div>
      }
    >
      {/* Mini KPI indicators */}
      <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/70">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Total Operaciones</span>
          <span className="font-mono-data font-bold text-slate-900 text-sm">{historial.length}</span>
        </div>
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-rose-200 bg-rose-50/50">
          <span className="text-[11px] font-bold text-rose-700 uppercase">Reemplazos</span>
          <span className="font-mono-data font-bold text-rose-700 text-sm">{totalReemplazos}</span>
        </div>
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-blue-200 bg-blue-50/50">
          <span className="text-[11px] font-bold text-[#0048B5] uppercase">Traslados</span>
          <span className="font-mono-data font-bold text-[#0048B5] text-sm">{totalTraslados}</span>
        </div>
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-amber-200 bg-amber-50/50">
          <span className="text-[11px] font-bold text-amber-700 uppercase">Cambios / Ajustes</span>
          <span className="font-mono-data font-bold text-amber-700 text-sm">{totalCambios}</span>
        </div>
      </div>

      {/* Tabla de Historial */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
        <table className="w-full min-w-[860px] text-left text-[12.5px]">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-[10.5px] font-bold uppercase tracking-wider text-slate-600">
              <th className="px-3.5 py-3">Fecha</th>
              <th className="px-3.5 py-3">Equipo / Componente</th>
              <th className="px-3.5 py-3">Puesto</th>
              <th className="px-3.5 py-3">Operación</th>
              <th className="px-3.5 py-3">Origen</th>
              <th className="px-3.5 py-3">Destino</th>
              <th className="px-3.5 py-3">Falla / Motivo</th>
              <th className="px-3.5 py-3">Observación Registrada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredHistory.map((m, i) => (
              <tr key={m.id || i} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-3.5 py-3 font-mono-data text-slate-500 font-medium whitespace-nowrap">
                  {m.fecha}
                </td>
                <td className="px-3.5 py-3 font-bold text-slate-800 whitespace-nowrap">
                  {m.equipo}
                </td>
                <td className="px-3.5 py-3 font-mono-data font-bold text-[#0048B5]">
                  {m.espacio ? `#${m.espacio}` : "—"}
                </td>
                <td className="px-3.5 py-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                      m.accion === "Reemplazo"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : m.accion === "Traslado"
                        ? "bg-blue-50 text-[#0048B5] border-blue-200"
                        : m.accion === "Reintegro"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    {m.accion}
                  </span>
                </td>
                <td className="px-3.5 py-3 text-slate-700 font-medium whitespace-nowrap">
                  {m.origen}
                </td>
                <td className="px-3.5 py-3 text-slate-700 font-medium whitespace-nowrap">
                  {m.destino}
                </td>
                <td className="px-3.5 py-3 text-slate-600 font-medium">
                  {m.falla}
                </td>
                <td className="px-3.5 py-3 text-slate-500 italic max-w-sm" title={m.obs}>
                  {m.obs || "—"}
                </td>
              </tr>
            ))}

            {filteredHistory.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-400 italic">
                  No se encontraron registros en la bitácora para los criterios seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <MovementModal
          onClose={() => setModalOpen(false)}
          onRegister={onRegisterMovement}
          spaces={spaces}
        />
      )}
    </SectionCard>
  );
}
