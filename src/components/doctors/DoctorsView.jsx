import React, { useState, useMemo } from "react";
import { Stethoscope, ChevronRight, Search, Clock, Users, Shield, UserCheck, Briefcase } from "lucide-react";
import SectionCard from "../common/SectionCard";
import Pill from "../common/Pill";
import DoctorAssignModal from "./DoctorAssignModal";
import { HORARIOS, DOCTORES_EXCEL, STAFF_EXCEL } from "../../constants/tokens";

export default function DoctorsView({ spaces, onAssignDoctor, onUnassignDoctor }) {
  const [filterCategory, setFilterCategory] = useState("TODOS");
  const [filterShift, setFilterShift] = useState("TODOS");
  const [searchDoctor, setSearchDoctor] = useState("");
  const [assigningDoctor, setAssigningDoctor] = useState(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  const availableSpaces = spaces.filter((s) => s.estado === "DISPONIBLE");

  // Combine master doctor list with staff categories
  const fullDoctorsList = useMemo(() => {
    return DOCTORES_EXCEL.map((doc) => {
      const matchStaff = STAFF_EXCEL.find((s) => s.nombre.toLowerCase() === doc.nombre.toLowerCase());
      return {
        id: doc.id,
        nombre: doc.nombre,
        categoria: matchStaff?.categoria || doc.tipo || "Planilla",
        rol: matchStaff?.rol || (doc.tipo === "Planilla" ? "Médico Planilla" : "Servicios Profesionales"),
        horarioDefault: doc.horario || "Turno Rotativo",
      };
    });
  }, []);

  const filteredDoctors = useMemo(() => {
    return fullDoctorsList.filter((d) => {
      const assignedSpace = spaces.find((s) => s.doctor && s.doctor.toLowerCase() === d.nombre.toLowerCase());
      const matchesSearch =
        d.nombre.toLowerCase().includes(searchDoctor.toLowerCase()) ||
        String(d.id).includes(searchDoctor) ||
        (assignedSpace && String(assignedSpace.id).includes(searchDoctor));

      const matchesCategory = filterCategory === "TODOS" || d.categoria === filterCategory;
      const matchesShift =
        filterShift === "TODOS" ||
        (assignedSpace && assignedSpace.horario === filterShift) ||
        d.horarioDefault.includes(filterShift);

      return matchesSearch && matchesCategory && matchesShift;
    });
  }, [fullDoctorsList, searchDoctor, filterCategory, filterShift, spaces]);

  const totalPages = Math.ceil(filteredDoctors.length / itemsPerPage);
  const paginatedDoctors = filteredDoctors.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const categories = [
    { key: "TODOS", label: "Todo el Personal", icon: Users, count: fullDoctorsList.length },
    { key: "Planilla", label: "Planilla", icon: Briefcase, count: fullDoctorsList.filter((d) => d.categoria === "Planilla").length },
    { key: "Servicios Profesionales", label: "Servicios Prof.", icon: Stethoscope, count: fullDoctorsList.filter((d) => d.categoria === "Servicios Profesionales").length },
    { key: "Supervisores", label: "Supervisores", icon: Shield, count: fullDoctorsList.filter((d) => d.categoria === "Supervisores").length },
  ];

  return (
    <SectionCard
      icon={Stethoscope}
      title="Buscador & Asignación de Médicos"
      subtitle="Padrón oficial de personal médico y turnos · Sede San Miguel"
      right={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-xs focus-within:ring-2 focus-within:ring-[#0095FF]/40">
            <Search size={14} className="text-slate-400" />
            <input
              value={searchDoctor}
              onChange={(e) => {
                setSearchDoctor(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por nombre, ID o puesto..."
              className="w-44 sm:w-56 bg-transparent text-[12px] font-medium outline-none placeholder:text-slate-400"
            />
            {searchDoctor && (
              <button onClick={() => setSearchDoctor("")} className="text-[11px] font-bold text-slate-400 hover:text-slate-600">
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-xs">
            <Clock size={13} className="text-slate-400" />
            <select
              value={filterShift}
              onChange={(e) => {
                setFilterShift(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-[12px] outline-none font-semibold text-slate-700 cursor-pointer"
            >
              <option value="TODOS">Todos los turnos</option>
              {HORARIOS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        </div>
      }
    >
      {/* Category Filter Pills */}
      <div className="mb-4 flex flex-wrap gap-2">
        {categories.map((c) => {
          const isActive = filterCategory === c.key;
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              onClick={() => {
                setFilterCategory(c.key);
                setPage(1);
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
                isActive
                  ? "bg-[#0048B5] text-white shadow-xs"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              <Icon size={13} className={isActive ? "text-cyan-300" : "text-slate-400"} />
              <span>{c.label}</span>
              <span className={`ml-1 text-[10.5px] font-mono-data px-1.5 py-0.2 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                {c.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tabla de Médicos */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
        <table className="w-full text-left text-[12.5px]">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-[10.5px] font-bold uppercase tracking-wider text-slate-600">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Médico / Especialista</th>
              <th className="px-4 py-3">Modalidad</th>
              <th className="px-4 py-3">Horario / Turno</th>
              <th className="px-4 py-3">Puesto Asignado</th>
              <th className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedDoctors.map((d, i) => {
              const asignado = spaces.find((s) => s.doctor && s.doctor.toLowerCase() === d.nombre.toLowerCase());
              const initials = d.nombre
                .replace("Dr. ", "")
                .replace("Dra. ", "")
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("");

              return (
                <tr key={`${d.id}-${i}`} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3 font-mono-data text-slate-400 text-[11.5px]">
                    #{String(d.id).padStart(3, "0")}
                  </td>
                  <td className="flex items-center gap-3 px-4 py-3 font-semibold text-slate-800">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-[11px] font-bold text-white shadow-xs shrink-0"
                      style={{
                        background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)",
                      }}
                    >
                      {initials}
                    </span>
                    <div>
                      <p className="leading-tight text-slate-800">{d.nombre}</p>
                      <p className="text-[10.5px] text-slate-400 font-normal">{d.rol}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                        d.categoria === "Planilla"
                          ? "bg-blue-50 text-[#0048B5] border-blue-200"
                          : d.categoria === "Supervisores"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {d.categoria}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-medium font-mono-data text-[11.5px]">
                    {asignado?.horario || d.horarioDefault}
                  </td>
                  <td className="px-4 py-3">
                    {asignado ? (
                      <div className="flex items-center gap-2">
                        <Pill estado="OCUPADO" />
                        <span className="font-mono-data text-[12px] font-bold text-[#0048B5]">
                          Puesto #{asignado.id}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[12px] text-slate-400 italic">Sin puesto asignado</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setAssigningDoctor(d.nombre)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[11.5px] font-semibold transition-all shadow-2xs ${
                        asignado
                          ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          : "text-white bg-[#0048B5] hover:bg-[#003487]"
                      }`}
                    >
                      {asignado ? "Reasignar" : "Asignar Puesto"} <ChevronRight size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {paginatedDoctors.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-400 italic">
                  No se encontraron médicos o personal que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-[12px] text-slate-500">
          <span>
            Mostrando {((page - 1) * itemsPerPage) + 1} a {Math.min(page * itemsPerPage, filteredDoctors.length)} de {filteredDoctors.length} profesionales
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 font-medium"
            >
              Anterior
            </button>
            <span className="px-2 font-mono-data font-bold text-slate-700">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 font-medium"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Modal de Asignación */}
      {assigningDoctor && (
        <DoctorAssignModal
          doctor={assigningDoctor}
          currentSpace={spaces.find((s) => s.doctor && s.doctor.toLowerCase() === assigningDoctor.toLowerCase())}
          availableSpaces={availableSpaces}
          onClose={() => setAssigningDoctor(null)}
          onAssign={onAssignDoctor}
          onUnassign={onUnassignDoctor}
        />
      )}
    </SectionCard>
  );
}
