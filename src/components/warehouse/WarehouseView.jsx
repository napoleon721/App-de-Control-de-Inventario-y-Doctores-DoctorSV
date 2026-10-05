import React, { useState, useMemo } from "react";
import {
  Warehouse, LayoutGrid, Plus, TrendingUp, TrendingDown, Minus, ShieldCheck,
  Clock, FileText, ArrowRightLeft, Filter, Laptop, Mouse, Cable, Monitor, Wifi,
  Headphones, Package, AlertTriangle, CheckCircle2, Search, Download, Copy,
  ArrowUpRight, ArrowDownLeft, Wrench, RefreshCw, Zap, ExternalLink
} from "lucide-react";
import SectionCard from "../common/SectionCard";
import MovementModal from "./MovementModal";

const HARDWARE_ICONS = {
  PC: Laptop,
  MAUSE: Mouse,
  MOUSE: Mouse,
  HUB: Cable,
  MONITOR: Monitor,
  CABLES: Wifi,
  HEADSET: Headphones,
};

function getHardwareIcon(key) {
  return HARDWARE_ICONS[key] || Package;
}

export default function WarehouseView({ bodegaStock = [], spaces = [], onRegisterMovement, historial = [] }) {
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState({});
  const [filterTipo, setFilterTipo] = useState("TODOS");
  const [filterAccion, setFilterAccion] = useState("TODAS");
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [visibleCount, setVisibleCount] = useState(25);

  // Filtrar del historial solo los movimientos relacionados a bodega / hardware
  const BODEGA_ACTIONS = [
    "Movimiento", "Cambio", "Retiro", "Ingreso", "Reemplazo", "Reemplazo por falla",
    "Reemplazo preventivo", "Préstamo", "Devolución", "Baja de equipo", "Mantenimiento", "Reintegro", "Traslado"
  ];

  const filteredMovements = useMemo(() => {
    return (historial || []).filter((h) => {
      const isWarehouse =
        h.origen === "BODEGA" ||
        h.destino === "BODEGA" ||
        BODEGA_ACTIONS.some((a) => h.accion && h.accion.toLowerCase().includes(a.toLowerCase())) ||
        ["PC", "MAUSE", "MOUSE", "HUB", "MONITOR", "CABLES", "HEADSET"].includes(h.equipo);

      if (!isWarehouse) return false;

      // Filtro por tipo de hardware
      if (filterTipo !== "TODOS") {
        const matchHw =
          h.equipo === filterTipo ||
          (filterTipo === "MOUSE" && (h.equipo === "MAUSE" || h.equipo === "MOUSE")) ||
          (filterTipo === "MAUSE" && (h.equipo === "MOUSE" || h.equipo === "MAUSE"));
        if (!matchHw) return false;
      }

      // Filtro por acción
      if (filterAccion !== "TODAS") {
        const accLower = String(h.accion || "").toLowerCase();
        if (filterAccion === "Ingreso" && !accLower.includes("ingreso")) return false;
        if (filterAccion === "Salida" && !(h.origen === "BODEGA" && h.destino !== "BODEGA")) return false;
        if (filterAccion === "Reemplazo" && !accLower.includes("reemplazo") && !accLower.includes("cambio")) return false;
        if (filterAccion === "Mantenimiento" && !accLower.includes("mantenimiento")) return false;
      }

      // Filtro por búsqueda de texto libre
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const strPuesto = String(h.espacio || h.spaceId || "");
        const strEquipo = String(h.equipo || "").toLowerCase();
        const strAccion = String(h.accion || "").toLowerCase();
        const strObs = String(h.obs || h.falla || "").toLowerCase();
        const strOrigen = String(h.origen || "").toLowerCase();
        const strDestino = String(h.destino || "").toLowerCase();

        const matches =
          strPuesto.includes(query) ||
          strEquipo.includes(query) ||
          strAccion.includes(query) ||
          strObs.includes(query) ||
          strOrigen.includes(query) ||
          strDestino.includes(query);

        if (!matches) return false;
      }

      return true;
    });
  }, [historial, filterTipo, filterAccion, searchTerm]);

  // Cálculos consolidados de hardware
  const totalesEquipo = useMemo(() => {
    return bodegaStock.map((t) => {
      const enUso =
        t.key === "PC"
          ? spaces.filter(
              (s) =>
                ["OCUPADO", "DISPONIBLE", "INCOMPLETO", "RESERVADO"].includes(s.estado) &&
                s.marca && s.marca !== "NO PC"
            ).length
          : t.key === "MONITOR"
          ? spaces.filter((s) => s.monitor && (s.monitor.marca || s.monitor.activo || s.monitor === true)).length
          : (t.key === "MOUSE" || t.key === "MAUSE")
          ? spaces.filter((s) => s.mouse).length
          : t.key === "HEADSET"
          ? spaces.filter((s) => s.headset).length
          : t.key === "HUB"
          ? spaces.filter((s) => s.hub).length
          : spaces.filter((s) => s.marca && s.marca !== "NO PC").length;

      const reparacion = spaces.filter((s) => s.estado === "REPARACION").length;
      const actualBodega = Number(t.actual) || 0;
      const totalSede = enUso + reparacion + actualBodega;

      return {
        ...t,
        actual: actualBodega,
        enUso,
        reparacion,
        total: totalSede,
        porcentajeUso: totalSede > 0 ? Math.round((enUso / totalSede) * 100) : 0,
      };
    });
  }, [bodegaStock, spaces]);

  // Métricas KPI globales
  const totalEnBodega = useMemo(() => {
    return bodegaStock.reduce((acc, curr) => acc + (Number(curr.actual) || 0), 0);
  }, [bodegaStock]);

  const itemsBajoStock = useMemo(() => {
    return bodegaStock.filter((b) => (Number(b.actual) || 0) <= 1);
  }, [bodegaStock]);

  const puestosConNovedad = useMemo(() => {
    return spaces.filter(
      (s) =>
        s.estado === "INCOMPLETO" ||
        s.estado === "REPARACION" ||
        s.marca === "NO PC" ||
        s.modelo === "NO PC"
    );
  }, [spaces]);

  // Manejo de apertura del modal con datos iniciales
  function handleOpenModalWithData(initialData = {}) {
    setModalInitialData(initialData);
    setMovementModalOpen(true);
  }

  // Ajuste rápido directo (+1 stock a bodega)
  function handleQuickStockAdd(itemKey) {
    if (!onRegisterMovement) return;
    onRegisterMovement({
      equipo: itemKey,
      tipo: itemKey,
      cantidad: 1,
      accion: "Ingreso",
      origen: "PROVEEDOR",
      destino: "BODEGA",
      falla: "Ingreso rápido de stock",
      obs: `Ingreso express (+1 ud) a existencias de Bodega`,
    });
  }

  // Ajuste rápido directo (-1 stock de bodega)
  function handleQuickStockSubtract(itemKey, currentStock) {
    if (!onRegisterMovement) return;
    if (currentStock <= 0) {
      alert(`No hay existencias disponibles de ${itemKey} en Bodega para restar.`);
      return;
    }
    if (confirm(`¿Confirmas descontar 1 unidad de ${itemKey} de la Bodega Central?`)) {
      onRegisterMovement({
        equipo: itemKey,
        tipo: itemKey,
        cantidad: 1,
        accion: "Ajuste de inventario",
        origen: "BODEGA",
        destino: "MERMA / AJUSTE",
        falla: "Ajuste manual de conteo",
        obs: `Descuento express (-1 ud) por ajuste de existencias`,
      });
    }
  }

  // Exportar bitácora a CSV
  function handleExportCSV() {
    if (!filteredMovements || filteredMovements.length === 0) {
      alert("No hay registros que coincidan con los filtros actuales para exportar.");
      return;
    }

    const headers = ["Fecha", "Equipo", "Cantidad", "Accion", "Origen", "Destino", "Puesto", "Observaciones"];
    const rows = filteredMovements.map((m) => [
      `"${m.fecha || ""}"`,
      `"${m.equipo || ""}"`,
      m.cantidad || 1,
      `"${m.accion || ""}"`,
      `"${m.origen || ""}"`,
      `"${m.destino || ""}"`,
      `"${m.espacio || m.spaceId || ""}"`,
      `"${(m.obs || m.falla || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `DoctorSV_Inventario_Bodega_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Copiar resumen de texto
  function handleCopySummary() {
    const text = filteredMovements
      .slice(0, 50)
      .map(
        (m) =>
          `[${m.fecha || "N/A"}] ${m.accion?.toUpperCase()}: ${m.cantidad || 1}x ${m.equipo} | Origen: ${m.origen} -> Destino: ${m.destino}${m.espacio ? ` (#${m.espacio})` : ""} | Obs: ${m.obs || m.falla || "—"}`
      )
      .join("\n");

    navigator.clipboard.writeText(text).then(() => {
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 2000);
    });
  }

  return (
    <div className="space-y-6">
      {/* 1. Barra Superior de Métricas Rápidas (KPIs) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total en Bodega</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-50 text-[#0048B5]">
              <Warehouse size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono-data text-2xl font-black text-slate-900">{totalEnBodega}</span>
            <span className="text-[11px] font-medium text-slate-500">unidades</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Existencias físicas disponibles</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">En Puestos</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Laptop size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono-data text-2xl font-black text-emerald-700">
              {totalesEquipo.find((t) => t.key === "PC")?.enUso || 0}
            </span>
            <span className="text-[11px] font-medium text-slate-500">PCs activas</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Operando en los 138 cubículos</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">En Taller / Rep.</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Wrench size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono-data text-2xl font-black text-purple-700">
              {spaces.filter((s) => s.estado === "REPARACION").length}
            </span>
            <span className="text-[11px] font-medium text-slate-500">puestos</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">En diagnóstico de hardware</p>
        </div>

        <div className={`rounded-2xl border p-4 shadow-2xs transition ${
          itemsBajoStock.length > 0 ? "border-amber-200 bg-amber-50/40" : "border-slate-200/80 bg-white"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Stock Crítico</span>
            <div className={`flex h-7 w-7 items-center justify-center rounded-xl ${
              itemsBajoStock.length > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
            }`}>
              <AlertTriangle size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`font-mono-data text-2xl font-black ${
              itemsBajoStock.length > 0 ? "text-amber-700" : "text-slate-800"
            }`}>
              {itemsBajoStock.length}
            </span>
            <span className="text-[11px] font-medium text-slate-500">periféricos</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 truncate">
            {itemsBajoStock.length > 0 ? itemsBajoStock.map((b) => b.key).join(", ") : "Existencias equilibradas"}
          </p>
        </div>

        <div className="col-span-2 sm:col-span-4 lg:col-span-1 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Puestos Novedad</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <ArrowRightLeft size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono-data text-2xl font-black text-rose-700">{puestosConNovedad.length}</span>
            <span className="text-[11px] font-medium text-slate-500">requieren HW</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Incompletos o sin PC</p>
        </div>
      </div>

      {/* 2. Grid Principal: Tarjeta 1 (Bodega) + Tarjeta 2 (Balance Consolidado) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Tarjeta 1: Inventario Bodega Central con Acciones Rápidas */}
        <SectionCard
          icon={Warehouse}
          title="Stock de Bodega Central"
          subtitle="Existencias físicas en reserva y acciones rápidas de entrada/ajuste"
          right={
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenModalWithData({ accion: "Ingreso", origen: "PROVEEDOR", destino: "BODEGA" })}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-bold text-emerald-800 transition hover:bg-emerald-100 shadow-2xs"
                title="Registrar entrada de lote nuevo de hardware"
              >
                <Plus size={14} /> Entrada Stock
              </button>
              <button
                onClick={() => handleOpenModalWithData()}
                className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[12px] font-semibold text-white transition hover:brightness-110 shadow-xs"
                style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
              >
                <ArrowRightLeft size={14} /> Mover / Asignar
              </button>
            </div>
          }
        >
          <div className="flex flex-col divide-y divide-slate-100">
            {bodegaStock.map((b) => {
              const delta = b.actual - b.original;
              const Icon = b.icon || getHardwareIcon(b.key);
              const isZero = b.actual === 0;
              const isLowStock = b.actual <= 1 && !isZero;

              return (
                <div key={b.key} className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-2.5">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-2xs transition ${
                        isZero
                          ? "bg-rose-50 text-rose-600 border border-rose-200"
                          : isLowStock
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-blue-50 text-[#0048B5] border border-blue-100"
                      }`}
                    >
                      <Icon size={19} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading text-[14px] font-bold text-slate-800">
                          {b.key}
                        </span>
                        {isZero ? (
                          <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800 uppercase">
                            Agotado
                          </span>
                        ) : isLowStock ? (
                          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 uppercase">
                            Bajo
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium">{b.label}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3.5">
                    {/* Conteo de Bodega */}
                    <div className="text-right">
                      <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">En Bodega</p>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-mono-data text-[16px] font-black ${
                            isZero ? "text-rose-600" : isLowStock ? "text-amber-600" : "text-slate-900"
                          }`}
                        >
                          {b.actual}
                        </span>
                        <span
                          className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${
                            delta < 0
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : delta > 0
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                          title={`Original: ${b.original}`}
                        >
                          {delta < 0 ? (
                            <TrendingDown size={10} />
                          ) : delta > 0 ? (
                            <TrendingUp size={10} />
                          ) : (
                            <Minus size={10} />
                          )}{" "}
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      </div>
                    </div>

                    {/* Botones de acción rápida por fila */}
                    <div className="flex items-center gap-1 border-l border-slate-100 pl-3">
                      <button
                        onClick={() => handleQuickStockAdd(b.key)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 font-bold transition shadow-2xs"
                        title={`Sumar +1 unidad de ${b.key} express`}
                      >
                        +1
                      </button>
                      <button
                        onClick={() => handleQuickStockSubtract(b.key, b.actual)}
                        disabled={b.actual <= 0}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 font-bold transition disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs"
                        title={`Restar -1 unidad de ${b.key}`}
                      >
                        -1
                      </button>
                      <button
                        onClick={() => handleOpenModalWithData({ equipo: b.key, accion: "Reemplazo" })}
                        className="flex h-7 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/60 px-2 text-[11px] font-bold text-[#0048B5] hover:bg-blue-100 transition shadow-2xs"
                        title={`Asignar o reemplazar ${b.key} en un cubículo`}
                      >
                        Asignar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => handleOpenModalWithData({ accion: "Ingreso", origen: "PROVEEDOR", destino: "BODEGA" })}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50/70 py-2.5 text-[12px] font-bold text-emerald-800 transition hover:bg-emerald-100"
            >
              <Plus size={14} /> Registrar Ingreso de Nuevos Equipos
            </button>
            <button
              onClick={() => handleOpenModalWithData()}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-2.5 text-[12px] font-semibold text-slate-600 transition hover:border-[#0095FF] hover:text-[#0048B5] hover:bg-blue-50/40"
            >
              <ArrowRightLeft size={14} /> Movimiento / Asignación a Puesto
            </button>
          </div>
        </SectionCard>

        {/* Tarjeta 2: Balance Consolidado de Hardware y Puestos que Requieren HW */}
        <div className="space-y-5">
          <SectionCard
            icon={LayoutGrid}
            title="Balance Consolidado de Hardware"
            subtitle="Inventario total activo en la sede de San Miguel (138 puestos)"
          >
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-[12.5px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-3.5 py-2.5">Hardware</th>
                    <th className="px-3.5 py-2.5 text-right">En Puestos</th>
                    <th className="px-3.5 py-2.5 text-right">Taller</th>
                    <th className="px-3.5 py-2.5 text-right">Bodega</th>
                    <th className="px-3.5 py-2.5 text-right">Total Sede</th>
                    <th className="px-3.5 py-2.5 text-center">Tasa Uso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {totalesEquipo.map((t) => {
                    const Icon = t.icon || getHardwareIcon(t.key);
                    return (
                      <tr key={t.key} className="hover:bg-slate-50/70 transition-colors">
                        <td className="flex items-center gap-2.5 px-3.5 py-2.5 font-semibold text-slate-800">
                          <Icon size={14} className="text-[#0048B5]" /> {t.key}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono-data text-slate-700">{t.enUso}</td>
                        <td className="px-3.5 py-2.5 text-right font-mono-data text-purple-600 font-semibold">{t.reparacion}</td>
                        <td className="px-3.5 py-2.5 text-right font-mono-data text-slate-600">{t.actual}</td>
                        <td className="px-3.5 py-2.5 text-right font-mono-data font-bold text-[#0048B5]">
                          {t.total}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-mono-data font-bold text-[#0048B5]">
                            {t.porcentajeUso}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-2xl p-3 border border-blue-100 bg-blue-50/50 flex items-start gap-2.5 text-[11.5px] text-slate-700">
              <ShieldCheck size={16} className="text-[#0095FF] shrink-0 mt-0.5" />
              <span>
                <b>Auditoría DoctorSV en Vivo:</b> Los valores se recalculan en tiempo real según el estado de cada cubículo y las bitácoras de inventario.
              </span>
            </div>
          </SectionCard>

          {/* Tarjeta de Diagnóstico: Puestos que requieren Hardware */}
          {puestosConNovedad.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-600" />
                  <h4 className="text-[13px] font-heading font-bold text-amber-950">
                    Puestos con Novedad de Hardware ({puestosConNovedad.length})
                  </h4>
                </div>
                <span className="text-[11px] font-medium text-amber-800">Acción sugerida</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {puestosConNovedad.slice(0, 8).map((sp) => {
                  const isNoPC = sp.marca === "NO PC" || sp.modelo === "NO PC";
                  const isReparacion = sp.estado === "REPARACION";
                  return (
                    <div
                      key={sp.id}
                      className="flex items-center justify-between rounded-xl bg-white p-2.5 border border-amber-200/80 shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono-data text-[12px] font-bold text-[#0048B5] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                          #{sp.id}
                        </span>
                        <div>
                          <p className="text-[12px] font-bold text-slate-800">
                            {sp.doctor || "Sin doctor asignado"}
                          </p>
                          <p className="text-[10.5px] text-slate-500">
                            {isNoPC ? "Sin computadora asignada" : isReparacion ? "Puesto en reparación técnica" : `Estado: ${sp.estado}`}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          handleOpenModalWithData({
                            espacio: sp.id,
                            equipo: isNoPC ? "PC" : "PC",
                            accion: isReparacion ? "Reintegro" : "Reemplazo",
                            destino: `Puesto #${sp.id}`,
                            obs: `Asignación de hardware para puesto #${sp.id}`,
                          })
                        }
                        className="flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-100/70 px-2 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-200 transition"
                      >
                        <Zap size={11} /> Surtir Equipo
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Modal de Movimiento */}
      {movementModalOpen && (
        <MovementModal
          onClose={() => {
            setMovementModalOpen(false);
            setModalInitialData({});
          }}
          onRegister={onRegisterMovement}
          spaces={spaces}
          bodegaStock={bodegaStock}
          initialData={modalInitialData}
        />
      )}

      {/* 4. Sección: Reporte y Auditoría de Movimientos */}
      <SectionCard
        icon={FileText}
        title="Bitácora de Movimientos · Inventario Bodega"
        subtitle={`Registro auditable de operaciones de hardware en la sede (${filteredMovements.length} movimientos encontrados)`}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50 shadow-2xs"
              title="Copiar texto resumen al portapapeles"
            >
              <Copy size={13} />
              <span>{copiedFeedback ? "¡Copiado!" : "Copiar"}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50 shadow-2xs"
              title="Descargar archivo Excel / CSV de los movimientos filtrados"
            >
              <Download size={13} />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={() => handleOpenModalWithData()}
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[12px] font-semibold text-white transition hover:brightness-110 shadow-xs"
              style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
            >
              <Plus size={14} /> Registrar Movimiento
            </button>
          </div>
        }
      >
        {/* Barra de Filtros Avanzada */}
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Input de Búsqueda */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por puesto #, doctor, equipo u obs..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-[12px] font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#0095FF] focus:outline-none transition shadow-2xs"
            />
          </div>

          {/* Filtro por Hardware */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs">
            <Filter size={13} className="text-slate-400 shrink-0" />
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="w-full bg-transparent text-[12px] font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="TODOS">Todo el hardware</option>
              {["PC", "MOUSE", "HUB", "MONITOR", "CABLES", "HEADSET"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Acción */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs">
            <ArrowRightLeft size={13} className="text-slate-400 shrink-0" />
            <select
              value={filterAccion}
              onChange={(e) => setFilterAccion(e.target.value)}
              className="w-full bg-transparent text-[12px] font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="TODAS">Todas las operaciones</option>
              <option value="Ingreso">↓ Ingresos a Bodega</option>
              <option value="Salida">↑ Salidas a Puestos</option>
              <option value="Reemplazo">🛠️ Reemplazos por falla</option>
              <option value="Mantenimiento">⚙️ Mantenimiento / Taller</option>
            </select>
          </div>
        </div>

        {/* Tabla de Resultados */}
        {filteredMovements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <ArrowRightLeft size={32} className="mb-2 opacity-30 text-slate-500" />
            <p className="text-[13px] font-semibold text-slate-600">No se encontraron movimientos con los filtros actuales</p>
            <p className="text-[11.5px] mt-1 text-slate-400">Prueba cambiando el criterio de búsqueda o registra un nuevo movimiento.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-3.5 py-2.5">Fecha</th>
                    <th className="px-3.5 py-2.5">Hardware</th>
                    <th className="px-3.5 py-2.5">Operación</th>
                    <th className="px-3.5 py-2.5">Origen</th>
                    <th className="px-3.5 py-2.5">Destino</th>
                    <th className="px-3.5 py-2.5">Puesto</th>
                    <th className="px-3.5 py-2.5">Observaciones / Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMovements.slice(0, visibleCount).map((mov, idx) => {
                    const isIngreso =
                      mov.accion === "Ingreso" ||
                      String(mov.accion || "").toLowerCase().includes("ingreso") ||
                      mov.destino === "BODEGA" && mov.origen === "PROVEEDOR";
                    const isFromBodega = !isIngreso && String(mov.origen || "").trim().toUpperCase() === "BODEGA";
                    const isToBodega = !isIngreso && String(mov.destino || "").trim().toUpperCase() === "BODEGA";
                    const isReemplazo = String(mov.accion || "").toLowerCase().includes("reemplazo") || String(mov.accion || "").toLowerCase().includes("cambio");
                    const qty = Number(mov.cantidad) || 1;

                    return (
                      <tr key={mov.id || idx} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-3.5 py-2.5 text-slate-500 font-mono-data text-[11px] whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-slate-400" />
                            {mov.fecha || "—"}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-bold text-[#0048B5]">
                            {mov.equipo || "—"}
                            {qty > 1 && (
                              <span className="text-[10px] text-blue-700 font-extrabold font-mono-data">({qty} uds)</span>
                            )}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold border ${
                              isIngreso
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : isReemplazo
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : isFromBodega
                                ? "bg-blue-50 text-blue-800 border-blue-200"
                                : isToBodega
                                ? "bg-purple-50 text-purple-800 border-purple-200"
                                : "bg-slate-50 text-slate-700 border-slate-200"
                            }`}
                          >
                            {isIngreso ? (
                              <>
                                <ArrowDownLeft size={11} /> Ingreso
                              </>
                            ) : isFromBodega ? (
                              <>
                                <ArrowUpRight size={11} /> Salida
                              </>
                            ) : isReemplazo ? (
                              <>
                                <Wrench size={11} /> Reemplazo
                              </>
                            ) : (
                              mov.accion || "—"
                            )}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600 font-medium">
                          <span className="font-mono-data text-[11.5px]">{mov.origen || "—"}</span>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600 font-medium">
                          <span className="font-mono-data text-[11.5px]">{mov.destino || "—"}</span>
                        </td>
                        <td className="px-3.5 py-2.5">
                          {mov.espacio || mov.spaceId ? (
                            <span className="inline-flex items-center font-mono-data text-[11.5px] font-bold text-[#0048B5] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md">
                              #{mov.espacio || mov.spaceId}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600 max-w-[280px]">
                          <p className="truncate text-[11px]" title={mov.obs || mov.falla}>
                            {mov.obs || mov.falla || "—"}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación / Ver más */}
            {filteredMovements.length > visibleCount && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 25)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                >
                  <RefreshCw size={13} />
                  <span>Mostrar más registros ({filteredMovements.length - visibleCount} restantes)</span>
                </button>
              </div>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
