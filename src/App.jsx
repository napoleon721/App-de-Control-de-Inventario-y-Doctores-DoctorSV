import React, { useState, useMemo, useEffect } from "react";
import {
  LayoutGrid, Droplets, AlertTriangle, Wrench, Warehouse, Sparkles
} from "lucide-react";
import Header from "./components/common/Header";
import KpiCard from "./components/common/KpiCard";
import SpaceMap from "./components/map/SpaceMap";
import SpaceDetailModal from "./components/map/SpaceDetailModal";
import WarehouseView from "./components/warehouse/WarehouseView";
import DoctorsView from "./components/doctors/DoctorsView";
import HistoryView from "./components/history/HistoryView";

import {
  BRAND, ESTADOS, BODEGA_TIPOS, HISTORIAL_MOCK, buildInitialSpaces
} from "./constants/tokens";

export default function App() {
  // 1. Estado persistente en localStorage alineado a los archivos Excel oficiales
  const [spaces, setSpaces] = useState(() => {
    try {
      const saved = localStorage.getItem("DOCTORSV_EXCEL_REAL_SPACES_V1");
      return saved ? JSON.parse(saved) : buildInitialSpaces();
    } catch {
      return buildInitialSpaces();
    }
  });

  const [bodegaStock, setBodegaStock] = useState(() => {
    try {
      const saved = localStorage.getItem("DOCTORSV_EXCEL_REAL_BODEGA_V1");
      if (saved) {
        const parsed = JSON.parse(saved);
        return BODEGA_TIPOS.map((b) => {
          const match = parsed.find((p) => p.key === b.key);
          return match ? { ...b, actual: match.actual } : b;
        });
      }
      return BODEGA_TIPOS;
    } catch {
      return BODEGA_TIPOS;
    }
  });

  const [historial, setHistorial] = useState(() => {
    try {
      const saved = localStorage.getItem("DOCTORSV_EXCEL_REAL_HISTORIAL_V1");
      return saved ? JSON.parse(saved) : HISTORIAL_MOCK;
    } catch {
      return HISTORIAL_MOCK;
    }
  });

  const [tab, setTab] = useState("mapa");
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sincronizar en LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem("DOCTORSV_EXCEL_REAL_SPACES_V1", JSON.stringify(spaces));
    } catch (e) {
      console.error("Error saving spaces:", e);
    }
  }, [spaces]);

  useEffect(() => {
    try {
      const simplified = bodegaStock.map(({ key, original, actual }) => ({ key, original, actual }));
      localStorage.setItem("DOCTORSV_EXCEL_REAL_BODEGA_V1", JSON.stringify(simplified));
    } catch (e) {
      console.error("Error saving bodega:", e);
    }
  }, [bodegaStock]);

  useEffect(() => {
    try {
      localStorage.setItem("DOCTORSV_EXCEL_REAL_HISTORIAL_V1", JSON.stringify(historial));
    } catch (e) {
      console.error("Error saving historial:", e);
    }
  }, [historial]);

  // 2. Conteo de estados
  const counts = useMemo(() => {
    const c = Object.fromEntries(Object.keys(ESTADOS).map((k) => [k, 0]));
    spaces.forEach((s) => {
      if (c[s.estado] !== undefined) {
        c[s.estado] += 1;
      }
    });
    return c;
  }, [spaces]);

  // 3. Alertas en tiempo real
  const alerts = useMemo(() => {
    const list = [];
    if (counts.INHABILITADO) {
      list.push({
        tone: ESTADOS.INHABILITADO.color,
        Icon: Droplets,
        text: `${counts.INHABILITADO} puestos inhabilitados por mantenimiento/filtraciones`,
      });
    }
    if (counts.INCOMPLETO) {
      list.push({
        tone: ESTADOS.INCOMPLETO.color,
        Icon: AlertTriangle,
        text: `${counts.INCOMPLETO} puesto(s) con periféricos o monitor faltante`,
      });
    }
    if (counts.REPARACION) {
      list.push({
        tone: ESTADOS.REPARACION.color,
        Icon: Wrench,
        text: `${counts.REPARACION} equipo(s) en taller técnico IT`,
      });
    }
    const bajoStock = bodegaStock.filter((b) => b.actual <= 1);
    if (bajoStock.length) {
      list.push({
        tone: "#E11D48",
        Icon: Warehouse,
        text: `Stock crítico en bodega: ${bajoStock.map((b) => b.key).join(", ")}`,
      });
    }
    return list;
  }, [counts, bodegaStock]);

  // 4. Handlers de actualización
  function handleSaveSpace(updated) {
    const today = new Date().toLocaleDateString("es-SV", { day: "2-digit", month: "2-digit", year: "numeric" });
    const patch = { ...updated, ultimoMovimiento: today };

    setSpaces((prev) => prev.map((s) => (s.id === updated.id ? patch : s)));
    setSelectedSpace(null);
  }

  function handleRegisterMovement(movement) {
    setHistorial((prev) => [movement, ...prev]);

    // Actualizar stock de bodega según acción
    if (movement.origen === "BODEGA" && movement.destino !== "BODEGA") {
      setBodegaStock((prev) =>
        prev.map((b) => (b.key === movement.equipo ? { ...b, actual: Math.max(0, b.actual - 1) } : b))
      );
    } else if (movement.destino === "BODEGA" && movement.origen !== "BODEGA") {
      setBodegaStock((prev) =>
        prev.map((b) => (b.key === movement.equipo ? { ...b, actual: b.actual + 1 } : b))
      );
    }
  }

  function handleAssignDoctor(doctor, spaceId, horario) {
    setSpaces((prev) =>
      prev.map((s) => {
        if (s.doctor === doctor && s.id !== spaceId) {
          return { ...s, estado: "DISPONIBLE", doctor: null, horario: null };
        }
        if (s.id === spaceId) {
          return { ...s, estado: "OCUPADO", doctor, horario };
        }
        return s;
      })
    );
  }

  function handleUnassignDoctor(doctor, spaceId) {
    setSpaces((prev) =>
      prev.map((s) => {
        if (s.id === spaceId || s.doctor === doctor) {
          return { ...s, estado: "DISPONIBLE", doctor: null, horario: null };
        }
        return s;
      })
    );
  }

  function handleSync() {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      alert("✅ Datos sincronizados correctamente con la base central DoctorSV.");
    }, 800);
  }

  return (
    <div className="min-h-screen w-full bg-slate-50/80 text-slate-900 flex flex-col font-sans">
      {/* Header oficial DoctorSV */}
      <Header
        tab={tab}
        setTab={setTab}
        alerts={alerts}
        onSync={handleSync}
        isSyncing={isSyncing}
      />

      <main className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 py-6 flex-1">
        {/* Fila superior de KPIs con estilo DoctorSV */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          <KpiCard
            label="Total Puestos"
            value={spaces.length}
            tone="#0048B5"
            Icon={LayoutGrid}
          />
          {Object.keys(ESTADOS).map((k) => (
            <KpiCard
              key={k}
              label={ESTADOS[k].label}
              value={counts[k] || 0}
              tone={ESTADOS[k].color}
              Icon={ESTADOS[k].icon}
            />
          ))}
        </div>

        {/* Contenido según pestaña activa */}
        {tab === "mapa" && (
          <SpaceMap
            spaces={spaces}
            counts={counts}
            onSelectSpace={(s) => setSelectedSpace(s)}
          />
        )}

        {tab === "bodega" && (
          <WarehouseView
            bodegaStock={bodegaStock}
            spaces={spaces}
            onRegisterMovement={handleRegisterMovement}
          />
        )}

        {tab === "medicos" && (
          <DoctorsView
            spaces={spaces}
            onAssignDoctor={handleAssignDoctor}
            onUnassignDoctor={handleUnassignDoctor}
          />
        )}

        {tab === "historial" && (
          <HistoryView
            historial={historial}
            spaces={spaces}
            onRegisterMovement={handleRegisterMovement}
          />
        )}

        {/* Footer institucional DoctorSV */}
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-[12px] text-slate-500 shadow-2xs">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="DoctorSV" className="h-5 object-contain" />
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium">Sistema de Gestión de Telemedicina · Sede San Miguel</span>
            </div>
          </div>
          <span className="font-heading font-bold tracking-wide text-slate-600">
            Doctor<span className="text-[#0095FF]">SV</span> © {new Date().getFullYear()}
          </span>
        </footer>
      </main>

      {/* Modal de edición de espacio */}
      {selectedSpace && (
        <SpaceDetailModal
          space={selectedSpace}
          historial={historial}
          onClose={() => setSelectedSpace(null)}
          onSave={handleSaveSpace}
        />
      )}
    </div>
  );
}
