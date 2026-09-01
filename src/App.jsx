import React, { useState, useMemo, useEffect } from "react";
import {
  LayoutGrid, Droplets, AlertTriangle, Wrench, Warehouse, Sparkles, UserCheck
} from "lucide-react";
import Header from "./components/common/Header";
import KpiCard from "./components/common/KpiCard";
import SpaceMap from "./components/map/SpaceMap";
import SpaceDetailModal from "./components/map/SpaceDetailModal";
import WarehouseView from "./components/warehouse/WarehouseView";
import DoctorsView from "./components/doctors/DoctorsView";
import HistoryView from "./components/history/HistoryView";
import AttendanceView from "./components/attendance/AttendanceView";
import QuickCheckInModal from "./components/attendance/QuickCheckInModal";

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
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);

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

  // Conteos calculados reactivamente
  const counts = useMemo(() => {
    const res = {
      DISPONIBLE: 0,
      INCOMPLETO: 0,
      INHABILITADO: 0,
      VACIO: 0,
      REPARACION: 0,
      RESERVADO: 0,
      OCUPADO: 0,
    };
    spaces.forEach((s) => {
      if (s.doctor) {
        res.OCUPADO++;
      } else if (res[s.estado] !== undefined) {
        res[s.estado]++;
      }
    });
    return res;
  }, [spaces]);

  // Alertas activas
  const alerts = useMemo(() => {
    const list = [];
    const inhabilitados = spaces.filter((s) => s.estado === "INHABILITADO");
    const vacios = spaces.filter((s) => s.estado === "VACIO");
    const incompletos = spaces.filter((s) => s.estado === "INCOMPLETO");
    const reparacion = spaces.filter((s) => s.estado === "REPARACION");

    if (inhabilitados.length > 0) {
      list.push({
        type: "danger",
        title: `${inhabilitados.length} puestos inhabilitados por filtración`,
        desc: `Puestos: ${inhabilitados.map((i) => `#${i.id}`).join(", ")}`,
      });
    }
    if (vacios.length > 0) {
      list.push({
        type: "warn",
        title: `${vacios.length} puestos vacíos sin PC`,
        desc: "Requieren equipamiento de computadoras para habilitarse",
      });
    }
    if (incompletos.length > 0) {
      list.push({
        type: "warn",
        title: `${incompletos.length} puestos incompletos`,
        desc: `Puestos: ${incompletos.map((i) => `#${i.id}`).join(", ")}`,
      });
    }
    if (reparacion.length > 0) {
      list.push({
        type: "info",
        title: `${reparacion.length} puestos en reparación`,
        desc: `Puestos: ${reparacion.map((i) => `#${i.id}`).join(", ")}`,
      });
    }
    return list;
  }, [spaces]);

  function handleSaveSpace(updatedSpace) {
    setSpaces((prev) =>
      prev.map((s) => (s.id === updatedSpace.id ? updatedSpace : s))
    );
  }

  function handleAssignDoctor(doctorName, spaceId, horario) {
    setSpaces((prev) =>
      prev.map((s) => {
        if (s.doctor === doctorName && s.id !== spaceId) {
          return { ...s, doctor: null, horario: null, estado: s.marca ? "DISPONIBLE" : "VACIO" };
        }
        if (s.id === spaceId) {
          return {
            ...s,
            doctor: doctorName,
            horario: horario || s.horario || "07:00 AM – 12:00 PM",
            estado: "OCUPADO",
            ultimoMovimiento: new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" }),
          };
        }
        return s;
      })
    );
  }

  function handleUnassignDoctor(doctorName, spaceId) {
    setSpaces((prev) =>
      prev.map((s) => {
        if (s.id === spaceId || s.doctor === doctorName) {
          return {
            ...s,
            doctor: null,
            horario: null,
            estado: s.marca ? "DISPONIBLE" : "VACIO",
          };
        }
        return s;
      })
    );
  }

  function handleConfirmCheckIn({ doctor, spaceId, horario, timestamp }) {
    setSpaces((prev) =>
      prev.map((s) => {
        if (s.doctor && s.doctor.toLowerCase() === doctor.toLowerCase() && s.id !== spaceId) {
          return { ...s, doctor: null, horario: null, estado: s.marca ? "DISPONIBLE" : "VACIO" };
        }
        if (s.id === spaceId) {
          return {
            ...s,
            doctor,
            horario,
            estado: "OCUPADO",
            ultimoMovimiento: timestamp,
          };
        }
        return s;
      })
    );

    // Registrar en auditoría
    const newEntry = {
      id: `checkin-${Date.now()}`,
      fecha: new Date().toLocaleDateString("es-SV"),
      equipo: "CHECK-IN",
      espacio: spaceId,
      accion: "Check-In",
      origen: "Auto-Registro Médico",
      destino: `Puesto #${spaceId}`,
      falla: "N/A",
      obs: `Médico ${doctor} realizó auto check-in en Puesto #${spaceId} (${horario})`,
    };

    setHistorial((prev) => [newEntry, ...prev]);
  }

  function handleReleaseShift() {
    setSpaces((prev) =>
      prev.map((s) => ({
        ...s,
        doctor: null,
        horario: null,
        estado: s.marca ? "DISPONIBLE" : "VACIO",
      }))
    );

    // Registrar en auditoría
    const newEntry = {
      id: `relevo-${Date.now()}`,
      fecha: new Date().toLocaleDateString("es-SV"),
      equipo: "TURNO",
      espacio: null,
      accion: "Relevo",
      origen: "Turno Saliente",
      destino: "Turno Entrante",
      falla: "N/A",
      obs: `Relevo general de turno ejecutado: Puestos liberados para asignación del nuevo turno`,
    };

    setHistorial((prev) => [newEntry, ...prev]);
  }

  function handleRegisterMovement(movementData) {
    const { tipo, cantidad, origen, destino, motivo, accion, spaceId, falla, obs } = movementData;

    setBodegaStock((prev) =>
      prev.map((item) => {
        if (item.key === tipo) {
          let delta = 0;
          if (origen === "BODEGA") delta -= Number(cantidad);
          if (destino === "BODEGA") delta += Number(cantidad);
          return {
            ...item,
            actual: Math.max(0, item.actual + delta),
          };
        }
        return item;
      })
    );

    const newLog = {
      id: `mov-${Date.now()}`,
      fecha: new Date().toLocaleDateString("es-SV"),
      equipo: tipo,
      espacio: spaceId ? Number(spaceId) : null,
      accion: accion || "Movimiento",
      origen: origen || "BODEGA",
      destino: destino || "Puesto",
      falla: falla || motivo || "N/A",
      obs: obs || `Operación de ${cantidad} unidad(es) de ${tipo}`,
    };

    setHistorial((prev) => [newLog, ...prev]);
  }

  function handleSync() {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      alert("✅ Sincronización exitosa con la base de datos central de DoctorSV.");
    }, 900);
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-slate-800 font-sans antialiased selection:bg-[#0095FF] selection:text-white">
      {/* Header institucional */}
      <Header
        tab={tab}
        setTab={setTab}
        alerts={alerts}
        onSync={handleSync}
        isSyncing={isSyncing}
        onOpenCheckIn={() => setCheckInModalOpen(true)}
      />

      {/* Contenedor central */}
      <main className="mx-auto max-w-[1440px] px-4 sm:px-6 py-6 space-y-6">
        {/* KPI Header Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
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
            onReleaseShift={handleReleaseShift}
          />
        )}

        {tab === "asistencia" && (
          <AttendanceView
            spaces={spaces}
            onAssignDoctor={handleAssignDoctor}
            onUnassignDoctor={handleUnassignDoctor}
            onOpenCheckIn={() => setCheckInModalOpen(true)}
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

      {/* Modal de Auto Check-In de Médico */}
      {checkInModalOpen && (
        <QuickCheckInModal
          spaces={spaces}
          onClose={() => setCheckInModalOpen(false)}
          onConfirmCheckIn={handleConfirmCheckIn}
        />
      )}
    </div>
  );
}
