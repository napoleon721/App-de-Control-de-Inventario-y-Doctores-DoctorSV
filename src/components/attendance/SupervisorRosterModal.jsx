import React, { useState, useMemo } from "react";
import {
  X, Search, Check, Users, Settings2, Sparkles, Filter, Mail,
  CheckSquare, Square, AlertCircle, RefreshCw, UserCheck
} from "lucide-react";
import { DOCTORES_EXCEL } from "../../constants/tokens";

export default function SupervisorRosterModal({
  supervisor,
  currentDoctorNames = [],
  onSaveRoster,
  onClose,
}) {
  // Set of selected doctor names
  const [selectedNames, setSelectedNames] = useState(() => {
    if (currentDoctorNames && currentDoctorNames.length > 0) {
      return new Set(currentDoctorNames);
    }
    // Default: first N doctors matching capacity
    const count = supervisor?.totalPuestos || 40;
    return new Set(DOCTORES_EXCEL.slice(0, count).map((d) => d.nombre));
  });

  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("TODOS");
  const [onlySelected, setOnlySelected] = useState(false);

  const capacity = supervisor?.totalPuestos || 40;
  const countSelected = selectedNames.size;

  // Groups extracted from official list
  const availableGroups = useMemo(() => {
    const set = new Set();
    DOCTORES_EXCEL.forEach((d) => {
      if (d.grupo) set.add(d.grupo);
    });
    return ["TODOS", ...Array.from(set)];
  }, []);

  // Filtered doctors list
  const filteredDoctors = useMemo(() => {
    const q = search.toLowerCase().trim();
    return DOCTORES_EXCEL.filter((d) => {
      if (selectedGroup !== "TODOS" && d.grupo !== selectedGroup) return false;
      if (onlySelected && !selectedNames.has(d.nombre)) return false;
      if (!q) return true;

      return (
        d.nombre.toLowerCase().includes(q) ||
        (d.correo && d.correo.toLowerCase().includes(q)) ||
        (d.jvpm && d.jvpm.toLowerCase().includes(q)) ||
        String(d.id).includes(q)
      );
    });
  }, [search, selectedGroup, onlySelected, selectedNames]);

  // Toggle single doctor
  function handleToggleDoctor(docName) {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      if (next.has(docName)) {
        next.delete(docName);
      } else {
        next.add(docName);
      }
      return next;
    });
  }

  // Quick action: Select group
  function handleSelectGroup(groupName) {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      DOCTORES_EXCEL.forEach((d) => {
        if (d.grupo === groupName) {
          next.add(d.nombre);
        }
      });
      return next;
    });
  }

  // Quick action: Select first N doctors
  function handleSelectFirstN(n) {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      DOCTORES_EXCEL.slice(0, n).forEach((d) => next.add(d.nombre));
      return next;
    });
  }

  // Quick action: Clear all
  function handleClearAll() {
    if (window.confirm("¿Deseas deseleccionar todos los médicos de la lista?")) {
      setSelectedNames(new Set());
    }
  }

  function handleSave() {
    onSaveRoster(Array.from(selectedNames));
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-5 backdrop-blur-md overflow-y-auto">
      <div
        style={{ animation: "popIn .25s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 my-auto flex flex-col max-h-[92vh]"
      >
        {/* ================= HEADER ================= */}
        <div className="relative bg-gradient-to-r from-[#00246B] via-[#0048B5] to-[#0095FF] px-6 py-5 text-white shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md text-white shadow-inner">
                <Settings2 size={22} />
              </div>
              <div>
                <h2 className="font-heading text-lg sm:text-xl font-extrabold tracking-tight text-white leading-tight">
                  Configurador de Nómina de Médicos
                </h2>
                <p className="text-[12px] text-cyan-100 font-medium mt-0.5">
                  {supervisor?.nombre} · Estación #{supervisor?.puesto} (Lote: Puestos #{supervisor?.bloqueInicio} al #{supervisor?.bloqueFin})
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-all text-sm font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ================= BARRA DE ESTADO & CAPACIDAD ================= */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500">
                Capacidad del Lote:
              </span>
              <span className="font-heading font-black text-slate-800 text-[15px]">
                {capacity} puestos
              </span>
            </div>

            <div className="h-4 w-[1px] bg-slate-300" />

            <div className="flex items-center gap-2">
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500">
                Seleccionados:
              </span>
              <span
                className={`font-heading font-black text-[15px] px-2.5 py-0.5 rounded-lg border ${
                  countSelected === capacity
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : countSelected > capacity
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-blue-100 text-[#0048B5] border-blue-300"
                }`}
              >
                {countSelected} de {capacity}
              </span>
            </div>

            {countSelected === capacity && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                <Check size={12} /> ¡Lote completo!
              </span>
            )}
            {countSelected < capacity && (
              <span className="hidden sm:inline-flex text-[11px] font-semibold text-slate-400">
                (Faltan {capacity - countSelected} para completar)
              </span>
            )}
            {countSelected > capacity && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                <AlertCircle size={12} /> Excede capacidad por {countSelected - capacity}
              </span>
            )}
          </div>

          {/* Botones de Carga Rápida */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleSelectGroup("Grupo 1")}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-[#0048B5] transition shadow-2xs"
            >
              + Cargar Grupo 1
            </button>
            <button
              type="button"
              onClick={() => handleSelectGroup("Grupo 2")}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-[#0048B5] transition shadow-2xs"
            >
              + Cargar Grupo 2
            </button>
            <button
              type="button"
              onClick={() => handleSelectFirstN(capacity)}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-[#0048B5] transition shadow-2xs"
            >
              Primeros {capacity}
            </button>
            {countSelected > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2 py-1 text-[11px] font-bold rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition shadow-2xs"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* ================= CONTROLES DE BÚSQUEDA Y FILTRADO ================= */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="relative w-full sm:w-80">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, correo o JVPM..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-8 py-2 text-[12.5px] font-medium outline-none focus:bg-white focus:ring-2 focus:ring-[#0095FF] transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200">
              {availableGroups.map((grp) => (
                <button
                  key={grp}
                  type="button"
                  onClick={() => setSelectedGroup(grp)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                    selectedGroup === grp
                      ? "bg-white text-[#0048B5] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {grp}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setOnlySelected(!onlySelected)}
              className={`px-3 py-1.5 text-[11.5px] font-bold rounded-xl border transition-all shrink-0 flex items-center gap-1.5 ${
                onlySelected
                  ? "bg-[#0048B5] text-white border-[#0048B5] shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <UserCheck size={13} />
              <span>Ver elegidos ({countSelected})</span>
            </button>
          </div>
        </div>

        {/* ================= LISTA DE MÉDICOS SELECCIONABLES ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 divide-y divide-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredDoctors.map((doc) => {
              const isChecked = selectedNames.has(doc.nombre);

              return (
                <div
                  key={doc.id}
                  onClick={() => handleToggleDoctor(doc.nombre)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                    isChecked
                      ? "bg-blue-50/80 border-[#0095FF] ring-1 ring-[#0095FF]/30 shadow-xs"
                      : "bg-white border-slate-200 hover:bg-slate-50/90 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      className="shrink-0 text-[#0048B5]"
                      tabIndex={-1}
                    >
                      {isChecked ? (
                        <CheckSquare size={20} className="text-[#0048B5]" />
                      ) : (
                        <Square size={20} className="text-slate-300" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <p className={`text-[12.5px] font-bold leading-snug truncate ${
                        isChecked ? "text-[#0048B5]" : "text-slate-800"
                      }`}>
                        {doc.nombre}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {doc.correo && (
                          <span className="text-[10px] font-mono text-slate-500 truncate flex items-center gap-0.5">
                            <Mail size={10} className="text-cyan-600 shrink-0" />
                            {doc.correo}
                          </span>
                        )}
                        {doc.jvpm && (
                          <span className="text-[9.5px] font-mono bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-bold">
                            {doc.jvpm}
                          </span>
                        )}
                        {doc.grupo && (
                          <span className="text-[9.5px] bg-blue-50 text-[#0048B5] px-1 py-0.2 rounded font-semibold">
                            {doc.grupo}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
                    #{doc.id}
                  </span>
                </div>
              );
            })}
          </div>

          {filteredDoctors.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <Users size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-[13px] font-medium">No se encontraron médicos con ese criterio.</p>
              {onlySelected && (
                <button
                  type="button"
                  onClick={() => setOnlySelected(false)}
                  className="mt-2 text-[12px] font-bold text-[#0048B5] hover:underline"
                >
                  Ver todos los médicos disponibles
                </button>
              )}
            </div>
          )}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[12.5px] font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold text-white shadow-md hover:brightness-110 active:scale-[0.99] transition-all"
            style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
          >
            <Check size={16} />
            <span>Guardar Nómina del Turno ({countSelected} Médicos)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
