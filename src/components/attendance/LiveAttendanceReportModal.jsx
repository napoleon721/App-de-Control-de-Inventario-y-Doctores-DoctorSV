import React, { useMemo, useState } from "react";
import {
  FileSpreadsheet, Download, Copy, Printer, CheckCircle2, User,
  Clock, Laptop, Search, Filter, X, Check, FileText, ArrowUpDown
} from "lucide-react";

export default function LiveAttendanceReportModal({
  spaces,
  historial,
  onClose,
}) {
  const [query, setQuery] = useState("");
  const [filterTurno, setFilterTurno] = useState("TODOS");
  const [copied, setCopied] = useState(false);

  // Active occupied stations with doctors
  const activeAssignments = useMemo(() => {
    return spaces
      .filter((s) => s.doctor)
      .map((s) => ({
        puesto: s.id,
        doctor: s.doctor,
        horario: s.horario || "Turno Activo",
        marca: s.marca || "PC",
        modelo: s.modelo || "OptiPlex 3080",
        activoPc: s.activoPc || `PC-${s.id}`,
        horaIngreso: s.ultimoMovimiento || "07:00 AM",
        categoria: s.categoria || "Médico",
      }));
  }, [spaces]);

  // Unique shift list from active assignments
  const turnosDisponibles = useMemo(() => {
    const set = new Set(activeAssignments.map((a) => a.horario));
    return Array.from(set);
  }, [activeAssignments]);

  const filteredAssignments = useMemo(() => {
    return activeAssignments.filter((a) => {
      const matchQuery =
        !query.trim() ||
        a.doctor.toLowerCase().includes(query.toLowerCase()) ||
        String(a.puesto).includes(query) ||
        a.activoPc.toLowerCase().includes(query.toLowerCase());
      const matchTurno = filterTurno === "TODOS" || a.horario === filterTurno;
      return matchQuery && matchTurno;
    });
  }, [activeAssignments, query, filterTurno]);

  // Export to CSV for Excel / Google Sheets
  function handleDownloadCSV() {
    const headers = ["Puesto", "Médico", "Turno", "Hora Check-In", "Marca", "Activo PC", "Categoría"];
    const rows = filteredAssignments.map((a) => [
      `#${a.puesto}`,
      `"${a.doctor}"`,
      `"${a.horario}"`,
      `"${a.horaIngreso}"`,
      `"${a.marca}"`,
      `"${a.activoPc}"`,
      `"${a.categoria}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Asistencia_DoctorSV_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Copy text report for WhatsApp or Telegram
  function handleCopyTextReport() {
    const dateStr = new Date().toLocaleDateString("es-SV", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let text = `🏥 *DOCTORSV — REPORTE DE ASISTENCIA & PUESTOS DE TELEMEDICINA*\n`;
    text += `📅 Fecha: ${dateStr}\n`;
    text += `⏰ Hora de emisión: ${new Date().toLocaleTimeString("es-SV")}\n`;
    text += `📍 Sede: San Miguel (140 Puestos)\n`;
    text += `--------------------------------------------------\n`;
    text += `👥 Total Médicos en Sesión: ${activeAssignments.length}\n`;
    text += `🖥️ Puestos Libres Disponibles: ${140 - activeAssignments.length}\n`;
    text += `--------------------------------------------------\n`;
    text += `*DETALLE DE MÉDICOS Y PUESTOS:*\n`;

    filteredAssignments.forEach((a, i) => {
      text += `${i + 1}. *Puesto #${a.puesto}* · ${a.doctor} (${a.horario}) [Check-in: ${a.horaIngreso}]\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handlePrint() {
    window.print();
  }

  const totalOcupados = activeAssignments.length;
  const totalPuestos = spaces.length;
  const pctOcupacion = totalPuestos > 0 ? Math.round((totalOcupados / totalPuestos) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-5 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "popIn .2s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]"
      >
        {/* Header con gradiente institucional DoctorSV */}
        <div
          className="px-6 py-4.5 text-white flex items-center justify-between shrink-0"
          style={{ background: "linear-gradient(135deg, #002868 0%, #0048B5 60%, #0095FF 100%)" }}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-md shadow-inner">
              <FileSpreadsheet size={22} />
            </span>
            <div>
              <h3 className="font-heading text-lg sm:text-xl font-bold">
                Reporte de Asistencia & Alimentación de Puestos
              </h3>
              <p className="text-[12px] text-cyan-100">
                Alimentación en tiempo real generada por el auto-registro y asignación de médicos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Resumen KPI Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Médicos Conectados
            </span>
            <span className="font-heading font-extrabold text-xl text-[#0048B5]">
              {totalOcupados}
            </span>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Puestos Disponibles
            </span>
            <span className="font-heading font-extrabold text-xl text-emerald-600">
              {totalPuestos - totalOcupados}
            </span>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Tasa de Ocupación
            </span>
            <span className="font-heading font-extrabold text-xl text-indigo-600">
              {pctOcupacion}%
            </span>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Puestos Sede
            </span>
            <span className="font-heading font-extrabold text-xl text-slate-700">
              {totalPuestos}
            </span>
          </div>
        </div>

        {/* Filtros y Botones de Acción */}
        <div className="p-4 sm:p-6 pb-2 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* Buscador */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 shadow-2xs">
              <Search size={14} className="text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar médico, puesto..."
                className="w-36 sm:w-48 bg-transparent text-[12px] font-medium outline-none"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-xs text-slate-400">
                  ✕
                </button>
              )}
            </div>

            {/* Filtro de Turno */}
            {turnosDisponibles.length > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs">
                <Filter size={13} className="text-slate-400" />
                <select
                  value={filterTurno}
                  onChange={(e) => setFilterTurno(e.target.value)}
                  className="bg-transparent text-[12px] font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="TODOS">Todos los turnos ({activeAssignments.length})</option>
                  {turnosDisponibles.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Botones de Exportación */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyTextReport}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-[12px] font-bold text-slate-700 transition shadow-2xs"
              title="Copiar texto formateado para compartir en WhatsApp o correo"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? "¡Copiado!" : "Copiar Resumen"}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadCSV}
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[12px] font-bold text-white shadow-xs transition hover:brightness-110 active:scale-95"
              style={{ background: "linear-gradient(135deg, #15803D 0%, #16A34A 100%)" }}
              title="Descargar archivo CSV compatible con Microsoft Excel y Google Sheets"
            >
              <Download size={14} />
              <span>Exportar Excel (CSV)</span>
            </button>
          </div>
        </div>

        {/* Tabla de Médicos Conectados en Tiempo Real */}
        <div className="p-4 sm:p-6 pt-2 overflow-y-auto flex-1">
          <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-[12.5px] border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-slate-500 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                  <th className="px-4 py-3">Puesto</th>
                  <th className="px-4 py-3">Médico en Turno</th>
                  <th className="px-4 py-3">Franja / Turno</th>
                  <th className="px-4 py-3">Hora Check-In</th>
                  <th className="px-4 py-3">Dispositivo PC</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredAssignments.map((a) => (
                  <tr key={a.puesto} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-3 font-mono-data font-extrabold text-[#0048B5]">
                      <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                        #{a.puesto}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[#0048B5] text-[10px] font-bold">
                          <User size={12} />
                        </span>
                        <span>{a.doctor}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      <span className="inline-flex items-center gap-1 text-[11.5px]">
                        <Clock size={12} className="text-slate-400" />
                        {a.horario}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono-data text-slate-500 text-[12px]">
                      {a.horaIngreso}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-[11.5px]">
                      <span className="font-semibold text-slate-700">{a.marca}</span> · {a.activoPc}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        En Turno
                      </span>
                    </td>
                  </tr>
                ))}

                {filteredAssignments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                      No hay médicos registrados en este momento con los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-3 flex items-center justify-between text-[11.5px] text-slate-500 shrink-0">
          <span>
            Mostrando <b>{filteredAssignments.length}</b> de <b>{activeAssignments.length}</b> puestos ocupados
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-1.5 bg-slate-200 hover:bg-slate-300 font-bold text-slate-700 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
