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
import ShiftConfigModal from "./components/config/ShiftConfigModal";
import LiveAttendanceReportModal from "./components/attendance/LiveAttendanceReportModal";
import GoogleSheetsConfigModal from "./components/config/GoogleSheetsConfigModal";

import {
  BRAND, ESTADOS, BODEGA_TIPOS, HISTORIAL_MOCK, HORARIOS, buildInitialSpaces
} from "./constants/tokens";

import {
  subscribeToCloudSpaces,
  saveCloudSpaces,
  subscribeToCloudBodega,
  saveCloudBodega,
  subscribeToCloudHistorial,
  saveCloudHistorial,
} from "./services/firestoreSync";
import { logoutFromFirebase } from "./services/firebaseAuth";
import {
  fetchSpacesFromGoogleSheets,
  updateSpaceInGoogleSheets,
  logMovementToGoogleSheets,
  isGoogleSheetsConfigured,
} from "./services/googleSheetsService";

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

  // Personal adicional agregado manualmente al padrón
  const [customStaff, setCustomStaff] = useState(() => {
    try {
      const saved = localStorage.getItem("DOCTORSV_CUSTOM_STAFF_V1");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 2. Sesión multi-usuario (Doctor Master vs Doctor Operativo) con soporte para pestañas independientes
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const sessionUser = sessionStorage.getItem("DOCTORSV_ACTIVE_USER_SESSION");
      if (sessionUser) return JSON.parse(sessionUser);
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
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [authPortalOpen, setAuthPortalOpen] = useState(false);

  // 3. Horarios y Turnos configurables dinámicamente por el Doctor Master
  const [horarios, setHorarios] = useState(() => {
    try {
      const saved = localStorage.getItem("DOCTORSV_CONFIG_HORARIOS_V1");
      return saved ? JSON.parse(saved) : HORARIOS;
    } catch {
      return HORARIOS;
    }
  });
  const [shiftConfigOpen, setShiftConfigOpen] = useState(false);
  const [liveReportOpen, setLiveReportOpen] = useState(false);
  const [googleSheetsModalOpen, setGoogleSheetsModalOpen] = useState(false);

  // Carga inicial y sincronización desde Google Sheets si está configurado
  useEffect(() => {
    async function loadFromSheets() {
      if (isGoogleSheetsConfigured()) {
        try {
          const res = await fetchSpacesFromGoogleSheets();
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            setSpaces((prev) =>
              prev.map((s) => {
                const match = res.data.find((item) => Number(item.id) === Number(s.id));
                return match ? { ...s, ...match } : s;
              })
            );
            setLastSyncTime(new Date());
          }
        } catch (e) {
          console.warn("Google Sheets initial sync skipped:", e);
        }
      }
    }
    loadFromSheets();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("DOCTORSV_CONFIG_HORARIOS_V1", JSON.stringify(horarios));
    } catch (e) {
      console.error("Error saving horarios config:", e);
    }
  }, [horarios]);

  // Sincronizar en LocalStorage, notificar a otras pestañas y persistir en Cloud Firestore
  useEffect(() => {
    try {
      localStorage.setItem("DOCTORSV_EXCEL_REAL_SPACES_V1", JSON.stringify(spaces));
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("doctorsv_sync_channel");
        bc.postMessage({ type: "SPACES_UPDATED", payload: spaces });
        bc.close();
      }
      saveCloudSpaces(spaces);
    } catch (e) {
      console.error("Error saving spaces:", e);
    }
  }, [spaces]);

  useEffect(() => {
    try {
      const simplified = bodegaStock.map(({ key, original, actual }) => ({ key, original, actual }));
      localStorage.setItem("DOCTORSV_EXCEL_REAL_BODEGA_V1", JSON.stringify(simplified));
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("doctorsv_sync_channel");
        bc.postMessage({ type: "BODEGA_UPDATED", payload: bodegaStock });
        bc.close();
      }
      saveCloudBodega(simplified);
    } catch (e) {
      console.error("Error saving bodega:", e);
    }
  }, [bodegaStock]);

  useEffect(() => {
    try {
      localStorage.setItem("DOCTORSV_EXCEL_REAL_HISTORIAL_V1", JSON.stringify(historial));
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("doctorsv_sync_channel");
        bc.postMessage({ type: "HISTORIAL_UPDATED", payload: historial });
        bc.close();
      }
      saveCloudHistorial(historial);
    } catch (e) {
      console.error("Error saving historial:", e);
    }
  }, [historial]);

  // Suscripción en tiempo real a Cloud Firestore para sincronización multi-dispositivo
  useEffect(() => {
    const unsubSpaces = subscribeToCloudSpaces((cloudSpaces) => {
      if (cloudSpaces && Array.isArray(cloudSpaces) && cloudSpaces.length > 0) {
        setSpaces(cloudSpaces);
        setLastSyncTime(new Date());
      }
    });

    const unsubBodega = subscribeToCloudBodega((cloudBodega) => {
      if (cloudBodega && Array.isArray(cloudBodega) && cloudBodega.length > 0) {
        setBodegaStock((prev) =>
          prev.map((b) => {
            const match = cloudBodega.find((p) => p.key === b.key);
            return match ? { ...b, actual: match.actual } : b;
          })
        );
      }
    });

    const unsubHistorial = subscribeToCloudHistorial((cloudHistorial) => {
      if (cloudHistorial && Array.isArray(cloudHistorial) && cloudHistorial.length > 0) {
        setHistorial(cloudHistorial);
      }
    });

    return () => {
      if (unsubSpaces) unsubSpaces();
      if (unsubBodega) unsubBodega();
      if (unsubHistorial) unsubHistorial();
    };
  }, []);

  useEffect(() => {
    try {
      if (currentUser) {
        sessionStorage.setItem("DOCTORSV_ACTIVE_USER_SESSION", JSON.stringify(currentUser));
        localStorage.setItem("DOCTORSV_ACTIVE_USER_V2", JSON.stringify(currentUser));
      } else {
        sessionStorage.removeItem("DOCTORSV_ACTIVE_USER_SESSION");
      }
    } catch (e) {
      console.error("Error saving user session:", e);
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem("DOCTORSV_CUSTOM_STAFF_V1", JSON.stringify(customStaff));
    } catch (e) {
      console.error("Error saving custom staff:", e);
    }
  }, [customStaff]);

  // Sincronización cruzada bidireccional en tiempo real entre pestañas (Doctor en pestaña A, Master en pestaña B)
  useEffect(() => {
    let bc = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel("doctorsv_sync_channel");
        bc.onmessage = (event) => {
          const { type, payload } = event.data || {};
          if (type === "SPACES_UPDATED" && payload) {
            setSpaces(payload);
            setLastSyncTime(new Date());
          } else if (type === "HISTORIAL_UPDATED" && payload) {
            setHistorial(payload);
          } else if (type === "BODEGA_UPDATED" && payload) {
            setBodegaStock(payload);
          } else if (type === "FORCE_SYNC") {
            try {
              const saved = localStorage.getItem("DOCTORSV_EXCEL_REAL_SPACES_V1");
              if (saved) setSpaces(JSON.parse(saved));
              setLastSyncTime(new Date());
            } catch {}
          }
        };
      }
    } catch {}

    function handleStorageSync(e) {
      if (e.key === "DOCTORSV_EXCEL_REAL_SPACES_V1" && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue);
          setSpaces(updated);
          setLastSyncTime(new Date());
        } catch {}
      }
      if (e.key === "DOCTORSV_EXCEL_REAL_HISTORIAL_V1" && e.newValue) {
        try {
          setHistorial(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === "DOCTORSV_EXCEL_REAL_BODEGA_V1" && e.newValue) {
        try {
          const updatedBodega = JSON.parse(e.newValue);
          setBodegaStock((prev) =>
            prev.map((b) => {
              const match = updatedBodega.find((p) => p.key === b.key);
              return match ? { ...b, actual: match.actual } : b;
            })
          );
        } catch {}
      }
      if (e.key === "DOCTORSV_SYNC_PING") {
        try {
          const savedSpaces = localStorage.getItem("DOCTORSV_EXCEL_REAL_SPACES_V1");
          if (savedSpaces) setSpaces(JSON.parse(savedSpaces));
          setLastSyncTime(new Date());
        } catch {}
      }
    }

    window.addEventListener("storage", handleStorageSync);
    return () => {
      window.removeEventListener("storage", handleStorageSync);
      if (bc) bc.close();
    };
  }, []);

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
    if (isGoogleSheetsConfigured()) {
      updateSpaceInGoogleSheets(updatedSpace);
    }
  }

  function handleAssignDoctor(doctorName, spaceId, horario) {
    const assignedHorario = horario || "07:00 AM – 12:00 PM";
    setSpaces((prev) =>
      prev.map((s) => {
        if (s.doctor === doctorName && s.id !== spaceId) {
          return { ...s, doctor: null, horario: null, estado: s.marca ? "DISPONIBLE" : "VACIO" };
        }
        if (s.id === spaceId) {
          return {
            ...s,
            doctor: doctorName,
            horario: assignedHorario,
            estado: "OCUPADO",
            ultimoMovimiento: new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" }),
          };
        }
        return s;
      })
    );
    if (isGoogleSheetsConfigured()) {
      updateSpaceInGoogleSheets({
        id: spaceId,
        doctor: doctorName,
        horario: assignedHorario,
        estado: "OCUPADO",
      });
    }
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
    if (isGoogleSheetsConfigured()) {
      updateSpaceInGoogleSheets({
        id: spaceId,
        doctor: "",
        horario: "",
        estado: "DISPONIBLE",
      });
    }
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
      obs: `Dr(a). ${docName} inició su turno y tomó posesión del Puesto #${space.id} (${shift})${currentUser.supervisorNombre ? ` · Supervisor: ${currentUser.supervisorNombre}` : ""}`,
    };
    setHistorial((prev) => [newLog, ...prev]);

    if (isGoogleSheetsConfigured()) {
      updateSpaceInGoogleSheets({
        id: space.id,
        doctor: docName,
        horario: shift,
        estado: "OCUPADO",
      });
      logMovementToGoogleSheets(newLog);
    }
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

      if (isGoogleSheetsConfigured()) {
        updateSpaceInGoogleSheets({
          id: currentSpaceId,
          doctor: "",
          horario: "",
          estado: "DISPONIBLE",
        });
        logMovementToGoogleSheets(newLog);
      }
    }

    setCurrentUser((prev) => (prev ? { ...prev, spaceId: null } : null));
  }

  // Deslogueo completo: libera el puesto si estaba ocupado y abre el portal
  function handleLogout() {
    if (currentUser?.role === "DOCTOR" && currentUser?.spaceId) {
      handleReleaseMySpace();
    }
    sessionStorage.removeItem("DOCTORSV_ACTIVE_USER_SESSION");
    localStorage.removeItem("DOCTORSV_ACTIVE_USER_V2");
    logoutFromFirebase();
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
      equipo: "PC",
      espacio: spaceId,
      accion: "Check-In Rápido",
      origen: "Padrón Médico",
      destino: `Puesto #${spaceId}`,
      falla: "N/A",
      obs: `Médico ${doctor} registrado en puesto #${spaceId} (${horario})`,
    };

    setHistorial((prev) => [newEntry, ...prev]);

    if (isGoogleSheetsConfigured()) {
      updateSpaceInGoogleSheets({
        id: spaceId,
        doctor,
        horario,
        estado: "OCUPADO",
      });
      logMovementToGoogleSheets(newEntry);
    }
  }

  function handleReleaseShift() {
    setSpaces((prev) =>
      prev.map((s) => {
        if (s.doctor) {
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

    const newEntry = {
      id: `relevo-${Date.now()}`,
      fecha: new Date().toLocaleDateString("es-SV"),
      equipo: "TODOS",
      espacio: null,
      accion: "Relevo de Turno",
      origen: "Turno Saliente",
      destino: "DISPONIBLE",
      falla: "N/A",
      obs: "Relevo general de turno ejecutado: todos los puestos con médico han sido liberados",
    };

    setHistorial((prev) => [newEntry, ...prev]);

    if (isGoogleSheetsConfigured()) {
      logMovementToGoogleSheets(newEntry);
    }
  }

  function handleReleaseByHorario(horario) {
    setSpaces((prev) =>
      prev.map((s) => {
        if (s.doctor && s.horario === horario) {
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

    const newEntry = {
      id: `relevo-h-${Date.now()}`,
      fecha: new Date().toLocaleDateString("es-SV"),
      equipo: "FRANJA",
      espacio: null,
      accion: "Relevo por Franja",
      origen: `Franja ${horario}`,
      destino: "DISPONIBLE",
      falla: "N/A",
      obs: `Relevo de franja ejecutado: puestos de la franja "${horario}" liberados para el turno entrante`,
    };

    setHistorial((prev) => [newEntry, ...prev]);

    if (isGoogleSheetsConfigured()) {
      logMovementToGoogleSheets(newEntry);
    }
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

    if (isGoogleSheetsConfigured()) {
      logMovementToGoogleSheets(newLog);
    }
  }

  async function handleSync() {
    setIsSyncing(true);
    try {
      if (isGoogleSheetsConfigured()) {
        try {
          const res = await fetchSpacesFromGoogleSheets();
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            setSpaces((prev) =>
              prev.map((s) => {
                const match = res.data.find((item) => Number(item.id) === Number(s.id));
                return match ? { ...s, ...match } : s;
              })
            );
          }
        } catch (err) {
          console.warn("Sync from Google Sheets:", err);
        }
      }

      const savedSpaces = localStorage.getItem("DOCTORSV_EXCEL_REAL_SPACES_V1");
      if (savedSpaces) setSpaces(JSON.parse(savedSpaces));

      const savedHistorial = localStorage.getItem("DOCTORSV_EXCEL_REAL_HISTORIAL_V1");
      if (savedHistorial) setHistorial(JSON.parse(savedHistorial));

      const savedStaff = localStorage.getItem("DOCTORSV_CUSTOM_STAFF_V1");
      if (savedStaff) setCustomStaff(JSON.parse(savedStaff));

      const savedBodega = localStorage.getItem("DOCTORSV_EXCEL_REAL_BODEGA_V1");
      if (savedBodega) {
        const parsedBodega = JSON.parse(savedBodega);
        setBodegaStock((prev) =>
          prev.map((b) => {
            const match = parsedBodega.find((p) => p.key === b.key);
            return match ? { ...b, actual: match.actual } : b;
          })
        );
      }

      setLastSyncTime(new Date());
      localStorage.setItem("DOCTORSV_SYNC_PING", Date.now().toString());

      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("doctorsv_sync_channel");
        bc.postMessage({ type: "FORCE_SYNC" });
        bc.close();
      }
    } catch (e) {
      console.error("Error during sync:", e);
    }
    setTimeout(() => setIsSyncing(false), 700);
  }

  const isDoctorRole = currentUser?.role === "DOCTOR";
  const isSupervisorRole = currentUser?.role === "SUPERVISOR";

  // Restricción de permisos para Supervisores (solo mapa y control de asistencia)
  useEffect(() => {
    if (isSupervisorRole && ["bodega", "medicos", "historial"].includes(tab)) {
      setTab("asistencia");
    }
  }, [isSupervisorRole, tab]);

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-slate-800 font-sans antialiased selection:bg-[#0095FF] selection:text-white">
      {/* Header institucional */}
      <Header
        tab={tab}
        setTab={setTab}
        alerts={alerts}
        onSync={handleSync}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        onOpenCheckIn={() => setCheckInModalOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAuthPortal={() => setAuthPortalOpen(true)}
        onOpenShiftConfig={() => setShiftConfigOpen(true)}
        onOpenLiveReport={() => setLiveReportOpen(true)}
        onOpenGoogleSheetsConfig={() => setGoogleSheetsModalOpen(true)}
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
            onReleaseByHorario={handleReleaseByHorario}
            currentUser={currentUser}
            onReleaseMySpace={handleReleaseMySpace}
            horarios={horarios}
          />
        )}

        {!isDoctorRole && tab === "asistencia" && (
          <AttendanceView
            spaces={spaces}
            onAssignDoctor={handleAssignDoctor}
            onUnassignDoctor={handleUnassignDoctor}
            onOpenCheckIn={() => setCheckInModalOpen(true)}
            onOpenLiveReport={() => setLiveReportOpen(true)}
            initialSupId={currentUser?.supervisorId || null}
            onReleaseByHorario={handleReleaseByHorario}
          />
        )}

        {!isDoctorRole && !isSupervisorRole && tab === "bodega" && (
          <WarehouseView
            bodegaStock={bodegaStock}
            spaces={spaces}
            onRegisterMovement={handleRegisterMovement}
            historial={historial}
          />
        )}

        {!isDoctorRole && !isSupervisorRole && tab === "medicos" && (
          <DoctorsView
            spaces={spaces}
            onAssignDoctor={handleAssignDoctor}
            onUnassignDoctor={handleUnassignDoctor}
            customStaff={customStaff}
            onAddStaff={(member) => setCustomStaff((prev) => [...prev, member])}
            onRemoveStaff={(id) => setCustomStaff((prev) => prev.filter((m) => m.id !== id))}
          />
        )}

        {!isDoctorRole && !isSupervisorRole && tab === "historial" && (
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
                  : isSupervisorRole
                  ? `Estación de Supervisión: ${currentUser.name} (Puesto #${currentUser.puesto}) · Sede San Miguel`
                  : "Doctor Master · Sistema de Gestión y Control Integral · Sede San Miguel"}
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
          horarios={horarios}
        />
      )}

      {/* Portal de Acceso Multi-Usuario (Doctor Master vs Supervisor vs Doctor Operativo) */}
      {(authPortalOpen || !currentUser) && (
        <AuthPortal
          onLoginMaster={(masterData) => {
            setCurrentUser(masterData || {
              role: "MASTER",
              name: "Dr. Elmer Andrade (Master Admin)",
              email: "elmer.andrade@doctorsv.gob.sv",
              shift: "Turno Completo"
            });
            setAuthPortalOpen(false);
            setTab("mapa");
          }}
          onLoginDoctor={(doctorData) => {
            setCurrentUser(doctorData);
            setAuthPortalOpen(false);
            setTab("mapa");
          }}
          onLoginSupervisor={(supervisorData) => {
            setCurrentUser(supervisorData);
            setAuthPortalOpen(false);
            setTab("asistencia");
          }}
          onClose={currentUser ? () => setAuthPortalOpen(false) : null}
          isModal={!!currentUser}
          horarios={horarios}
        />
      )}

      {/* Modal de Configuración de Horarios & Turnos (Master) */}
      {shiftConfigOpen && (
        <ShiftConfigModal
          horarios={horarios}
          onSaveHorarios={(newHorarios) => setHorarios(newHorarios)}
          onClose={() => setShiftConfigOpen(false)}
        />
      )}

      {/* Modal de Reporte de Asistencia & Alimentación en Tiempo Real (Master) */}
      {liveReportOpen && (
        <LiveAttendanceReportModal
          spaces={spaces}
          historial={historial}
          onClose={() => setLiveReportOpen(false)}
        />
      )}

      {/* Modal de Configuración y Enlace con Google Sheets (Master / Admin) */}
      {googleSheetsModalOpen && (
        <GoogleSheetsConfigModal
          onClose={() => setGoogleSheetsModalOpen(false)}
          onConnected={() => {
            handleSync();
          }}
        />
      )}
    </div>
  );
}
