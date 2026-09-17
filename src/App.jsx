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
  BRAND, ESTADOS, BODEGA_TIPOS, HISTORIAL_MOCK, HORARIOS, buildInitialSpaces,
  SUPERVISORES_OFICIALES, DOCTORES_EXCEL
} from "./constants/tokens";

import {
  subscribeToCloudSpaces,
  saveCloudSpaces,
  subscribeToCloudBodega,
  saveCloudBodega,
  subscribeToCloudHistorial,
  saveCloudHistorial,
  subscribeToCloudRosters,
  saveCloudRosters,
} from "./services/firestoreSync";
import { logoutFromFirebase, subscribeToAuthChanges } from "./services/firebaseAuth";
import {
  fetchSpacesFromGoogleSheets,
  updateSpaceInGoogleSheets,
  logMovementToGoogleSheets,
  isGoogleSheetsConfigured,
} from "./services/googleSheetsService";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { safeLower, safeStr, isSameDoctor, normalizeDocName } from "./utils/safeHelpers";

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

  // Identificador único de este cliente/pestaña para evitar bucles de eco
  const myClientId = React.useRef(
    "cli_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
  );
  const isRemoteSpacesRef = React.useRef(false);
  const isRemoteBodegaRef = React.useRef(false);
  const isRemoteHistorialRef = React.useRef(false);
  const isRemoteRostersRef = React.useRef(false);

  // 4. Nóminas de médicos asignadas a cada supervisor (sincronizadas en tiempo real con Firestore)
  const [rosters, setRosters] = useState(() => {
    try {
      const saved = localStorage.getItem("DOCTORSV_SUPERVISOR_ROSTERS_V2");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Reconexión automática de sesión de Firebase Auth tras recargar página
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((firebaseUser) => {
      if (firebaseUser && !currentUser) {
        const email = safeLower(firebaseUser.email);
        const envMaster = safeLower(import.meta.env.VITE_MASTER_EMAIL || "");
        const allowedMasters = [
          "elmer.andrade@doctorsv.gob.sv",
          "cccalixo1998@gmail.com",
          ...(envMaster ? envMaster.split(",").map((e) => e.trim()) : []),
        ];
        const isMaster = allowedMasters.includes(email) || email.startsWith("elmer.andrade@");

        if (isMaster) {
          let name = "Dr. Elmer Andrade (Master Admin)";
          if (email.includes("cccalixo")) {
            name = firebaseUser.displayName ? `${firebaseUser.displayName} (Master Temp)` : "Master Tester (cccalixo)";
          } else if (firebaseUser.displayName && !email.startsWith("elmer.andrade")) {
            name = `${firebaseUser.displayName} (Master Admin)`;
          }
          setCurrentUser({
            role: "MASTER",
            name,
            email,
            photoURL: firebaseUser.photoURL || null,
            shift: "Turno Completo",
            authProvider: "google",
            loginTime: new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" }),
          });
          return;
        }

        // Supervisor
        const sup = SUPERVISORES_OFICIALES.find((s) => safeLower(s.correo) === email);
        if (sup) {
          setCurrentUser({
            name: sup.nombre,
            role: "SUPERVISOR",
            supervisorId: sup.id,
            puesto: sup.puesto,
            spaceId: sup.puesto,
            shift: sup.horario,
            bloqueInicio: sup.bloqueInicio,
            bloqueFin: sup.bloqueFin,
            totalPuestos: sup.totalPuestos,
            email: email,
            photoURL: firebaseUser.photoURL || null,
            authProvider: "google",
            loginTime: new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" }),
          });
          return;
        }

        // Doctor
        const doc = DOCTORES_EXCEL.find((d) => safeLower(d.correo) === email);
        setCurrentUser({
          name: doc?.nombre || firebaseUser.displayName || email.split("@")[0],
          role: "DOCTOR",
          email: email,
          photoURL: firebaseUser.photoURL || null,
          shift: doc?.horario || "07:00 AM – 12:00 PM",
          jvpm: doc?.jvpm || "Institucional",
          grupo: doc?.grupo || "Grupo General",
          tipo: doc?.tipo || "Planilla",
          spaceId: null,
          authProvider: "google",
          loginTime: new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" }),
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser]);

  // Sincronizador en Segundo Plano con Google Sheets (moderado para no saturar cuota)
  useEffect(() => {
    let timer = null;
    let isFetching = false;

    async function syncFromCloud() {
      if (isFetching) return;
      if (!isGoogleSheetsConfigured()) return;

      isFetching = true;
      try {
        const res = await fetchSpacesFromGoogleSheets();
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          isRemoteSpacesRef.current = true;
          setSpaces((prevSpaces) => {
            let hasChanges = false;
            const updated = prevSpaces.map((s) => {
              const cloudMatch = res.data.find((item) => Number(item.id) === Number(s.id));
              if (!cloudMatch) return s;

              // Si Google Sheets trae un médico no vacío y difiere del actual, actualizar.
              // NUNCA borrar a un médico ya asignado localmente si Sheets retorna vacío o null (evita desfases y pérdida de datos).
              const cloudDoc = cloudMatch.doctor ? String(cloudMatch.doctor).trim() : null;
              const localDoc = s.doctor ? String(s.doctor).trim() : null;

              let finalDoctor = localDoc;
              if (cloudDoc && cloudDoc !== localDoc) {
                finalDoctor = cloudDoc;
              }

              // Si el puesto tiene un médico asignado, su estado DEBE ser OCUPADO
              let finalEstado = s.estado;
              if (finalDoctor) {
                finalEstado = "OCUPADO";
              } else if (cloudMatch.estado && !localDoc) {
                finalEstado = cloudMatch.estado;
              }

              const doctorChanged = finalDoctor !== (s.doctor || null);
              const estadoChanged = finalEstado !== s.estado;
              const horarioChanged = cloudMatch.horario && (cloudMatch.horario !== s.horario);
              const obsChanged = cloudMatch.observaciones !== undefined && (cloudMatch.observaciones !== (s.observaciones || ""));
              const hardwareChanged =
                (cloudMatch.marca && cloudMatch.marca !== s.marca) ||
                (cloudMatch.modelo && cloudMatch.modelo !== s.modelo) ||
                (cloudMatch.activoPc && cloudMatch.activoPc !== s.activoPc);

              if (doctorChanged || estadoChanged || horarioChanged || obsChanged || hardwareChanged) {
                hasChanges = true;
                return {
                  ...s,
                  estado: finalEstado,
                  doctor: finalDoctor,
                  horario: cloudMatch.horario || s.horario || null,
                  observaciones: cloudMatch.observaciones !== undefined ? cloudMatch.observaciones : s.observaciones,
                  marca: cloudMatch.marca || s.marca,
                  modelo: cloudMatch.modelo || s.modelo,
                  activoPc: cloudMatch.activoPc || s.activoPc,
                  ultimoMovimiento: cloudMatch.ultimoMovimiento || s.ultimoMovimiento,
                };
              }
              return s;
            });

            if (hasChanges) {
              setLastSyncTime(new Date());
              return updated;
            }
            return prevSpaces;
          });
        }
      } catch (err) {
        // Silencioso en fondo
      } finally {
        isFetching = false;
      }
    }

    // Carga inicial
    syncFromCloud();

    // Sondeo moderado cada 60s (el tiempo real lo cubre Firestore de forma instantánea)
    const getIntervalTime = () => (document.visibilityState === "hidden" ? 120000 : 60000);

    const scheduleNext = () => {
      timer = setTimeout(async () => {
        await syncFromCloud();
        scheduleNext();
      }, getIntervalTime());
    };

    scheduleNext();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncFromCloud();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("DOCTORSV_CONFIG_HORARIOS_V1", JSON.stringify(horarios));
    } catch (e) {
      console.error("Error saving horarios config:", e);
    }
  }, [horarios]);

  // Sincronizar en LocalStorage, notificar a otras pestañas y persistir en Cloud Firestore (sin bucle)
  useEffect(() => {
    try {
      localStorage.setItem("DOCTORSV_EXCEL_REAL_SPACES_V1", JSON.stringify(spaces));
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("doctorsv_sync_channel");
        bc.postMessage({ type: "SPACES_UPDATED", payload: spaces, sender: myClientId.current });
        bc.close();
      }
      if (isRemoteSpacesRef.current) {
        isRemoteSpacesRef.current = false;
        return; // Romper bucle: no re-enviar a Firestore lo que vino de Firestore
      }
      saveCloudSpaces(spaces, myClientId.current);
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
        bc.postMessage({ type: "BODEGA_UPDATED", payload: bodegaStock, sender: myClientId.current });
        bc.close();
      }
      if (isRemoteBodegaRef.current) {
        isRemoteBodegaRef.current = false;
        return;
      }
      saveCloudBodega(simplified, myClientId.current);
    } catch (e) {
      console.error("Error saving bodega:", e);
    }
  }, [bodegaStock]);

  useEffect(() => {
    try {
      localStorage.setItem("DOCTORSV_EXCEL_REAL_HISTORIAL_V1", JSON.stringify(historial));
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("doctorsv_sync_channel");
        bc.postMessage({ type: "HISTORIAL_UPDATED", payload: historial, sender: myClientId.current });
        bc.close();
      }
      if (isRemoteHistorialRef.current) {
        isRemoteHistorialRef.current = false;
        return;
      }
      saveCloudHistorial(historial, myClientId.current);
    } catch (e) {
      console.error("Error saving historial:", e);
    }
  }, [historial]);

  useEffect(() => {
    try {
      localStorage.setItem("DOCTORSV_SUPERVISOR_ROSTERS_V2", JSON.stringify(rosters));
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("doctorsv_sync_channel");
        bc.postMessage({ type: "ROSTERS_UPDATED", payload: rosters, sender: myClientId.current });
        bc.close();
      }
      if (isRemoteRostersRef.current) {
        isRemoteRostersRef.current = false;
        return;
      }
      saveCloudRosters(rosters, myClientId.current);
    } catch (e) {
      console.error("Error saving rosters:", e);
    }
  }, [rosters]);

  // Suscripción en tiempo real a Cloud Firestore para sincronización multi-dispositivo sin bucles
  useEffect(() => {
    const unsubSpaces = subscribeToCloudSpaces((cloudSpaces) => {
      if (cloudSpaces && Array.isArray(cloudSpaces) && cloudSpaces.length > 0) {
        isRemoteSpacesRef.current = true;
        setSpaces(cloudSpaces);
        setLastSyncTime(new Date());
      }
    }, null, myClientId.current);

    const unsubBodega = subscribeToCloudBodega((cloudBodega) => {
      if (cloudBodega && Array.isArray(cloudBodega) && cloudBodega.length > 0) {
        isRemoteBodegaRef.current = true;
        setBodegaStock((prev) =>
          prev.map((b) => {
            const match = cloudBodega.find((p) => p.key === b.key);
            return match ? { ...b, actual: match.actual } : b;
          })
        );
      }
    }, null, myClientId.current);

    const unsubHistorial = subscribeToCloudHistorial((cloudHistorial) => {
      if (cloudHistorial && Array.isArray(cloudHistorial) && cloudHistorial.length > 0) {
        isRemoteHistorialRef.current = true;
        setHistorial(cloudHistorial);
      }
    }, null, myClientId.current);

    const unsubRosters = subscribeToCloudRosters((cloudRosters) => {
      if (cloudRosters && typeof cloudRosters === "object") {
        isRemoteRostersRef.current = true;
        setRosters(cloudRosters);
      }
    }, null, myClientId.current);

    return () => {
      if (unsubSpaces) unsubSpaces();
      if (unsubBodega) unsubBodega();
      if (unsubHistorial) unsubHistorial();
      if (unsubRosters) unsubRosters();
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
          const { type, payload, sender } = event.data || {};
          if (sender === myClientId.current) return;

          if (type === "SPACES_UPDATED" && payload) {
            isRemoteSpacesRef.current = true;
            setSpaces(payload);
            setLastSyncTime(new Date());
          } else if (type === "HISTORIAL_UPDATED" && payload) {
            isRemoteHistorialRef.current = true;
            setHistorial(payload);
          } else if (type === "BODEGA_UPDATED" && payload) {
            isRemoteBodegaRef.current = true;
            setBodegaStock(payload);
          } else if (type === "ROSTERS_UPDATED" && payload) {
            isRemoteRostersRef.current = true;
            setRosters(payload);
          } else if (type === "FORCE_SYNC") {
            try {
              const saved = localStorage.getItem("DOCTORSV_EXCEL_REAL_SPACES_V1");
              if (saved) {
                isRemoteSpacesRef.current = true;
                setSpaces(JSON.parse(saved));
              }
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
          isRemoteSpacesRef.current = true;
          setSpaces(updated);
          setLastSyncTime(new Date());
        } catch {}
      }
      if (e.key === "DOCTORSV_EXCEL_REAL_HISTORIAL_V1" && e.newValue) {
        try {
          isRemoteHistorialRef.current = true;
          setHistorial(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === "DOCTORSV_EXCEL_REAL_BODEGA_V1" && e.newValue) {
        try {
          const updatedBodega = JSON.parse(e.newValue);
          isRemoteBodegaRef.current = true;
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
          if (savedSpaces) {
            isRemoteSpacesRef.current = true;
            setSpaces(JSON.parse(savedSpaces));
          }
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

  // Sincronización continua y reactiva del puesto del médico con el estado real de los cubículos
  useEffect(() => {
    if (currentUser?.role === "DOCTOR" && currentUser?.name) {
      // Buscar si algún puesto tiene a este médico asignado (coincidencia inteligente sin importar Dr./Dra. o mayúsculas)
      const myActiveSpace = (spaces || []).find(
        (s) => s.doctor && isSameDoctor(s.doctor, currentUser.name)
      );

      if (myActiveSpace) {
        if (Number(currentUser.spaceId) !== Number(myActiveSpace.id)) {
          setCurrentUser((prev) => (prev ? { ...prev, spaceId: Number(myActiveSpace.id) } : null));
        }
      } else if (currentUser.spaceId) {
        // Solo desvincular si el puesto actual fue explícitamente liberado o reasignado a otro médico
        const currentSpaceObj = (spaces || []).find((s) => Number(s.id) === Number(currentUser.spaceId));
        if (currentSpaceObj && (!currentSpaceObj.doctor || !isSameDoctor(currentSpaceObj.doctor, currentUser.name))) {
          setCurrentUser((prev) => (prev ? { ...prev, spaceId: null } : null));
        }
      }
    }
  }, [spaces, currentUser?.name, currentUser?.role]);

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
    if (!doctorName) return;
    const cleanDoc = String(doctorName).trim();
    const cleanSpaceId = Number(spaceId);
    const assignedHorario = horario || "07:00 AM – 12:00 PM";
    const nowTime = new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" });

    setSpaces((prev) =>
      prev.map((s) => {
        // Liberar puesto anterior si el médico estaba asignado en otro cubículo
        if (s.doctor && safeLower(s.doctor) === safeLower(cleanDoc) && Number(s.id) !== cleanSpaceId) {
          return { ...s, doctor: null, horario: null, estado: s.marca ? "DISPONIBLE" : "VACIO", ultimoMovimiento: nowTime };
        }
        // Asignar al nuevo puesto
        if (Number(s.id) === cleanSpaceId) {
          return {
            ...s,
            doctor: cleanDoc,
            horario: assignedHorario,
            estado: "OCUPADO",
            ultimoMovimiento: nowTime,
          };
        }
        return s;
      })
    );

    if (isGoogleSheetsConfigured()) {
      updateSpaceInGoogleSheets({
        id: cleanSpaceId,
        doctor: cleanDoc,
        horario: assignedHorario,
        estado: "OCUPADO",
      });
    }
  }

  function handleUnassignDoctor(doctorName, spaceId) {
    const cleanDoc = doctorName ? safeLower(doctorName).trim() : null;
    const cleanSpaceId = spaceId !== undefined && spaceId !== null ? Number(spaceId) : null;
    const nowTime = new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" });

    setSpaces((prev) =>
      prev.map((s) => {
        const matchesSpace = cleanSpaceId !== null && Number(s.id) === cleanSpaceId;
        const matchesDoc = cleanDoc && s.doctor && safeLower(s.doctor) === cleanDoc;

        if (matchesSpace || matchesDoc) {
          return {
            ...s,
            doctor: null,
            horario: null,
            estado: s.marca ? "DISPONIBLE" : "VACIO",
            ultimoMovimiento: nowTime,
          };
        }
        return s;
      })
    );

    if (isGoogleSheetsConfigured() && cleanSpaceId !== null) {
      updateSpaceInGoogleSheets({
        id: cleanSpaceId,
        doctor: "",
        horario: "",
        estado: "DISPONIBLE",
      });
    }
  }

  // Guardar nómina personalizada de un supervisor y sincronizarla en la nube
  function handleSaveSupervisorRoster(supId, newNames) {
    if (!supId) return;
    setRosters((prev) => ({
      ...prev,
      [supId]: newNames,
    }));
  }

  // Flujo exclusivo de Doctor: Asignación interactiva al hacer clic en un puesto del mapa
  function handleClaimSpace(space) {
    if (!currentUser) return;
    const docName = currentUser.name;
    const shift = currentUser.shift;
    const cleanSpaceId = Number(space.id);
    const timeNow = new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" });

    setSpaces((prev) =>
      prev.map((s) => {
        // Liberar puesto anterior si tenía uno asignado
        if (s.doctor && isSameDoctor(s.doctor, docName) && Number(s.id) !== cleanSpaceId) {
          return { ...s, doctor: null, horario: null, estado: s.marca ? "DISPONIBLE" : "VACIO", ultimoMovimiento: timeNow };
        }
        if (Number(s.id) === cleanSpaceId) {
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

    setCurrentUser((prev) => (prev ? { ...prev, spaceId: cleanSpaceId } : null));

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
    const cleanSpaceId = Number(spaceId);
    setSpaces((prev) =>
      prev.map((s) => {
        if (s.doctor && isSameDoctor(s.doctor, doctor) && Number(s.id) !== cleanSpaceId) {
          return { ...s, doctor: null, horario: null, estado: s.marca ? "DISPONIBLE" : "VACIO" };
        }
        if (Number(s.id) === cleanSpaceId) {
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
    const spacesToRelease = spaces.filter((s) => s.doctor);

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
      obs: `Relevo general de turno ejecutado: ${spacesToRelease.length} puestos con médico han sido liberados`,
    };

    setHistorial((prev) => [newEntry, ...prev]);

    if (isGoogleSheetsConfigured()) {
      logMovementToGoogleSheets(newEntry);
      spacesToRelease.forEach((s) => {
        updateSpaceInGoogleSheets({
          id: s.id,
          doctor: "",
          horario: "",
          estado: s.marca ? "DISPONIBLE" : "VACIO",
          observaciones: s.observaciones || "",
        });
      });
    }
  }

  function handleReleaseByHorario(horario) {
    const spacesToRelease = spaces.filter((s) => s.doctor && s.horario === horario);

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
      obs: `Relevo de franja ejecutado: ${spacesToRelease.length} puestos de la franja "${horario}" liberados para el turno entrante`,
    };

    setHistorial((prev) => [newEntry, ...prev]);

    if (isGoogleSheetsConfigured()) {
      logMovementToGoogleSheets(newEntry);
      spacesToRelease.forEach((s) => {
        updateSpaceInGoogleSheets({
          id: s.id,
          doctor: "",
          horario: "",
          estado: s.marca ? "DISPONIBLE" : "VACIO",
          observaciones: s.observaciones || "",
        });
      });
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
    <ErrorBoundary>
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
            rosterBySupervisor={rosters}
            onSaveRoster={handleSaveSupervisorRoster}
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
    </ErrorBoundary>
  );
}
