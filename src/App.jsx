import React, { useState, useMemo, useEffect } from "react";
import {
  LayoutGrid, Droplets, AlertTriangle, Wrench, Warehouse, Sparkles, UserCheck
} from "lucide-react";
import Header from "./components/common/Header";
import KpiCard from "./components/common/KpiCard";
import SpaceMap from "./components/map/SpaceMap";
import SpaceDetailModal from "./components/map/SpaceDetailModal";
import ClaimSpaceModal from "./components/map/ClaimSpaceModal";
import WarehouseView from "./components/warehouse/WarehouseView";
import DoctorsView from "./components/doctors/DoctorsView";
import HistoryView from "./components/history/HistoryView";
import AttendanceView from "./components/attendance/AttendanceView";
import QuickCheckInModal from "./components/attendance/QuickCheckInModal";
import AuthPortal from "./components/auth/AuthPortal";

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

  // 2. Sesión multi-usuario (Doctor Master vs Doctor Operativo)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("DOCTORSV_ACTIVE_USER_V2");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [tab, setTab] = useState("mapa");
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [claimModalSpace, setClaimModalSpace] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [authPortalOpen, setAuthPortalOpen] = useState(false);

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

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem("DOCTORSV_ACTIVE_USER_V2", JSON.stringify(currentUser));
      } else {
        localStorage.removeItem("DOCTORSV_ACTIVE_USER_V2");
      }
    } catch (e) {
      console.error("Error saving user session:", e);
    }
  }, [currentUser]);

  // Si el médico entra y ya tenía un cubículo asignado en el mapa, auto-vincular
  useEffect(() => {
    if (currentUser?.role === "DOCTOR" && !currentUser.spaceId) {
      const existing = spaces.find(
        (s) => s.doctor && s.doctor.toLowerCase() === currentUser.name.toLowerCase()
      );
      if (existing) {
        setCurrentUser((prev) => (prev ? { ...prev, spaceId: existing.id } : null));
      }
    }
  }, [spaces, currentUser]);

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

  // Flujo exclusivo de Doctor: Asignación interactiva al hacer clic en un puesto del mapa
  function handleClaimSpace(space) {
    if (!currentUser) return;
    const docName = currentUser.name;
    const shift = currentUser.shift;
    const timeNow = new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" });

    setSpaces((prev) =>
      prev.map((s) => {
        // Liberar puesto anterior si tenía uno asignado
        if (s.doctor && s.doctor.toLowerCase() === docName.toLowerCase() && s.id !== space.id) {
          return { ...s, doctor: null, horario: null, estado: s.marca ? "DISPONIBLE" : "VACIO" };
        }
        if (s.id === space.id) {
          return {
            ...s,
            doctor: docName,
            horario: shift,
            estado: "OCUPADO",
            ultimoMovimiento: timeNow,
          };
        }
        return s;
      })
    );

    setCurrentUser((prev) => (prev ? { ...prev, spaceId: space.id } : null));

    // Auditoría
    const newLog = {
      id: `claim-${Date.now()}`,
      fecha: new Date().toLocaleDateString("es-SV"),
      equipo: space.marca || "PC",
      espacio: space.id,
      accion: "Ocupación de Puesto",
      origen: "Plano de Ubicaciones",
      destino: `Puesto #${space.id}`,
      falla: "N/A",
      obs: `Dr(a). ${docName} inició su turno y tomó posesión del Puesto #${space.id} (${shift})`,
    };
    setHistorial((prev) => [newLog, ...prev]);
  }

  // Liberar el puesto de trabajo del doctor (dejándolo DISPONIBLE para el siguiente turno)
  function handleReleaseMySpace() {
    if (!currentUser) return;
    const currentSpaceId = currentUser.spaceId;
    const docName = currentUser.name;

    setSpaces((prev) =>
      prev.map((s) => {
        if (s.id === currentSpaceId || (s.doctor && s.doctor.toLowerCase() === docName.toLowerCase())) {
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

    if (currentSpaceId) {
      const newLog = {
        id: `release-${Date.now()}`,
        fecha: new Date().toLocaleDateString("es-SV"),
        equipo: "PC",
        espacio: currentSpaceId,
        accion: "Fin de Jornada",
        origen: `Puesto #${currentSpaceId}`,
        destino: "DISPONIBLE",
        falla: "N/A",
        obs: `Dr(a). ${docName} finalizó su jornada de trabajo. El Puesto #${currentSpaceId} quedó DISPONIBLE.`,
      };
      setHistorial((prev) => [newLog, ...prev]);
    }

    setCurrentUser((prev) => (prev ? { ...prev, spaceId: null } : null));
  }

  // Deslogueo completo: libera el puesto si estaba ocupado y abre el portal
  function handleLogout() {
    if (currentUser?.role === "DOCTOR" && currentUser?.spaceId) {
      handleReleaseMySpace();
    }
    setCurrentUser(null);
    setAuthPortalOpen(true);
  }

  function handleSpaceClick(space) {
    if (currentUser?.role === "DOCTOR") {
      setClaimModalSpace(space);
    } else {
      setSelectedSpace(space);
    }
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

  const isDoctorRole = currentUser?.role === "DOCTOR";

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
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAuthPortal={() => setAuthPortalOpen(true)}
      />

      {/* Contenedor central */}
      <main className="mx-auto max-w-[1440px] px-4 sm:px-6 py-6 space-y-6">
        {/* KPI Header Bar (Solo visible para Doctor Master o sin sesión, para dar vista limpia al doctor) */}
        {!isDoctorRole && (
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
        )}

        {/* Contenido según pestaña activa */}
        {(tab === "mapa" || isDoctorRole) && (
          <SpaceMap
            spaces={spaces}
            counts={counts}
            onSelectSpace={handleSpaceClick}
            onReleaseShift={handleReleaseShift}
            currentUser={currentUser}
            onReleaseMySpace={handleReleaseMySpace}
          />
        )}

        {!isDoctorRole && tab === "asistencia" && (
          <AttendanceView
            spaces={spaces}
            onAssignDoctor={handleAssignDoctor}
            onUnassignDoctor={handleUnassignDoctor}
            onOpenCheckIn={() => setCheckInModalOpen(true)}
          />
        )}

        {!isDoctorRole && tab === "bodega" && (
          <WarehouseView
            bodegaStock={bodegaStock}
            spaces={spaces}
            onRegisterMovement={handleRegisterMovement}
          />
        )}

        {!isDoctorRole && tab === "medicos" && (
          <DoctorsView
            spaces={spaces}
            onAssignDoctor={handleAssignDoctor}
            onUnassignDoctor={handleUnassignDoctor}
          />
        )}

        {!isDoctorRole && tab === "historial" && (
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
              <span className="font-medium">
                {isDoctorRole
                  ? `Estación de Dr(a). ${currentUser.name} · Sede San Miguel`
                  : "Sistema de Gestión de Telemedicina · Sede San Miguel"}
              </span>
            </div>
          </div>
          <span className="font-heading font-bold tracking-wide text-slate-600">
            Doctor<span className="text-[#0095FF]">SV</span> © {new Date().getFullYear()}
          </span>
        </footer>
      </main>

      {/* Modal de edición de espacio (Master) */}
      {selectedSpace && (
        <SpaceDetailModal
          space={selectedSpace}
          historial={historial}
          onClose={() => setSelectedSpace(null)}
          onSave={handleSaveSpace}
        />
      )}

      {/* Modal interactivo para que el doctor ocupe o libere su puesto */}
      {claimModalSpace && (
        <ClaimSpaceModal
          space={claimModalSpace}
          currentUser={currentUser}
          onClose={() => setClaimModalSpace(null)}
          onConfirmClaim={handleClaimSpace}
          onReleaseMySpace={() => {
            handleReleaseMySpace();
            setClaimModalSpace(null);
          }}
        />
      )}

      {/* Modal de Auto Check-In de Médico (Master) */}
      {checkInModalOpen && (
        <QuickCheckInModal
          spaces={spaces}
          onClose={() => setCheckInModalOpen(false)}
          onConfirmCheckIn={handleConfirmCheckIn}
        />
      )}

      {/* Portal de Acceso Multi-Usuario (Doctor Master vs Doctor Operativo) */}
      {(authPortalOpen || !currentUser) && (
        <AuthPortal
          onLoginMaster={() => {
            setCurrentUser({ role: "MASTER", name: "Doctor Master (Admin)", shift: "Turno Completo" });
            setAuthPortalOpen(false);
          }}
          onLoginDoctor={(doctorData) => {
            setCurrentUser(doctorData);
            setAuthPortalOpen(false);
            setTab("mapa");
          }}
          onClose={currentUser ? () => setAuthPortalOpen(false) : null}
          isModal={!!currentUser}
        />
      )}
    </div>
  );
}
