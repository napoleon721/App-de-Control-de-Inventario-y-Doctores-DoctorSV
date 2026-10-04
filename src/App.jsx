import React, { useState, useMemo, useEffect, lazy, Suspense } from "react";
import {
  LayoutGrid, Droplets, AlertTriangle, Wrench, Warehouse, Sparkles, UserCheck
} from "lucide-react";
import Header from "./components/common/Header";
import KpiCard from "./components/common/KpiCard";
import SpaceMap from "./components/map/SpaceMap";
import SpaceDetailModal from "./components/map/SpaceDetailModal";
import ClaimSpaceModal from "./components/map/ClaimSpaceModal";
import AuthPortal from "./components/auth/AuthPortal";

// Carga diferida (Code-Splitting) para vistas y modales secundarios
const WarehouseView = lazy(() => import("./components/warehouse/WarehouseView"));
const DoctorsView = lazy(() => import("./components/doctors/DoctorsView"));
const HistoryView = lazy(() => import("./components/history/HistoryView"));
const AttendanceView = lazy(() => import("./components/attendance/AttendanceView"));
const QuickCheckInModal = lazy(() => import("./components/attendance/QuickCheckInModal"));
const ShiftConfigModal = lazy(() => import("./components/config/ShiftConfigModal"));
const SupervisorConfigModal = lazy(() => import("./components/config/SupervisorConfigModal"));
const DailyLotsManagerModal = lazy(() => import("./components/config/DailyLotsManagerModal"));
const LiveAttendanceReportModal = lazy(() => import("./components/attendance/LiveAttendanceReportModal"));
const GoogleSheetsConfigModal = lazy(() => import("./components/config/GoogleSheetsConfigModal"));

import {
  BRAND, ESTADOS, BODEGA_TIPOS, HISTORIAL_MOCK, HORARIOS, buildInitialSpaces,
  SUPERVISORES_OFICIALES, DOCTORES_EXCEL, ensureAllSpaces
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
  subscribeToCloudHorarios,
  saveCloudHorarios,
  subscribeToCloudSupervisores,
  saveCloudSupervisores,
  subscribeToCloudAttendance,
  saveCloudAttendance,
  subscribeToCloudQuincena,
  saveCloudQuincena,
  subscribeToCloudDailyLots,
  saveCloudDailyLots,
} from "./services/firestoreSync";
import { generateDefaultQuincena } from "./constants/quincenaDefault";
import { DEFAULT_DAILY_LOTS } from "./utils/dailyLotsParser";
import { logoutFromFirebase, subscribeToAuthChanges } from "./services/firebaseAuth";
import {
  fetchSpacesFromGoogleSheets,
  updateSpaceInGoogleSheets,
  updateSpacesBatchInGoogleSheets,
  logMovementToGoogleSheets,
  isGoogleSheetsConfigured,
} from "./services/googleSheetsService";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { safeLower, safeStr, isSameDoctor, normalizeDocName, isSameHorario } from "./utils/safeHelpers";

export default function App() {
  // 1. Estado persistente en localStorage alineado a los archivos Excel oficiales
  const [spaces, setSpaces] = useState(() => {
    try {
      const saved = localStorage.getItem("DOCTORSV_EXCEL_REAL_SPACES_V1");
      return saved ? ensureAllSpaces(JSON.parse(saved)) : buildInitialSpaces();
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
  const [checkInDefaultHorario, setCheckInDefaultHorario] = useState(null);
  const [authPortalOpen, setAuthPortalOpen] = useState(false);

  function handleOpenCheckIn(targetHorario) {
    if (typeof targetHorario === "string") {
      setCheckInDefaultHorario(targetHorario);
    } else if (currentUser?.role === "SUPERVISOR") {
      const currentSup = supervisores.find((s) => s.id === currentUser.supervisorId);
      setCheckInDefaultHorario(currentSup?.activeFranja || currentUser?.shift || null);
    } else {
      setCheckInDefaultHorario(null);
    }
    setCheckInModalOpen(true);
  }

  function handleUpdateSupervisorFranja(supId, activeFranja) {
    setSupervisores((prev) =>
      prev.map((s) => (s.id === supId ? { ...s, activeFranja } : s))
    );
  }

  function handleUpdateSupervisorOfficialShift(supId, horario) {
    setSupervisores((prev) =>
      prev.map((s) => (s.id === supId ? { ...s, horario } : s))
    );
  }

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

  // 3.1 Supervisores oficiales configurables dinámicamente por el Doctor Master
  const [supervisores, setSupervisores] = useState(() => {
    try {
      const saved = localStorage.getItem("DOCTORSV_SUPERVISORES_CONFIG_V1");
      return saved ? JSON.parse(saved) : SUPERVISORES_OFICIALES;
    } catch {
      return SUPERVISORES_OFICIALES;
    }
  });
  const [supervisorConfigOpen, setSupervisorConfigOpen] = useState(false);

  // Identificador único de este cliente/pestaña para evitar bucles de eco
  const myClientId = React.useRef(
    "cli_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
  );
  const isRemoteSpacesRef = React.useRef(false);
  const isRemoteBodegaRef = React.useRef(false);
  const isRemoteHistorialRef = React.useRef(false);
  const isRemoteRostersRef = React.useRef(false);
  const isRemoteHorariosRef = React.useRef(false);
  const isRemoteSupervisoresRef = React.useRef(false);
  const isRemoteAttendanceRef = React.useRef(false);
  const recentlyReleasedRef = React.useRef(new Map()); // Map de spaceId -> timestamp de liberación

  const isInitialMountHorarios = React.useRef(true);
  const isInitialMountSupervisores = React.useRef(true);
  const isInitialMountSpaces = React.useRef(true);
  const isInitialMountBodega = React.useRef(true);
  const isInitialMountHistorial = React.useRef(true);
  const isInitialMountRosters = React.useRef(true);
  const isInitialMountAttendance = React.useRef(true);

  // 4. Nóminas de médicos asignadas a cada supervisor (sincronizadas en tiempo real con Firestore)
  const [rosters, setRosters] = useState(() => {
    try {
      const saved = localStorage.getItem("DOCTORSV_SUPERVISOR_ROSTERS_V2");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // 5. Estados de Asistencia en Tiempo Real (sincronizados con Firestore y vinculados a Finalizar Jornada)
  const [attendanceRecords, setAttendanceRecords] = useState(() => {
    try {
      const saved = localStorage.getItem("DOCTORSV_ATTENDANCE_V1");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // 6. Quincena Oficial de Servicios Profesionales (sincronizada con Firestore y Google Sheets)
  const isRemoteQuincenaRef = React.useRef(false);
  const isInitialMountQuincena = React.useRef(true);
  const [quincena, setQuincena] = useState(() => {
    try {
      const saved = localStorage.getItem("DOCTORSV_QUINCENA_OFICIAL_V1");
      return saved ? JSON.parse(saved) : generateDefaultQuincena();
    } catch {
      return generateDefaultQuincena();
    }
  });

  // 7. Distribución Diaria de Lotes (Hoja RESUMEN SAN MIGUEL sincronizada con Firestore)
  const isRemoteDailyLotsRef = React.useRef(false);
  const isInitialMountDailyLots = React.useRef(true);
  const [dailyLots, setDailyLots] = useState(() => {
    try {
      const saved = localStorage.getItem("DOCTORSV_DAILY_LOTS_V1");
      return saved ? JSON.parse(saved) : DEFAULT_DAILY_LOTS;
    } catch {
      return DEFAULT_DAILY_LOTS;
    }
  });
  const [dailyLotsModalOpen, setDailyLotsModalOpen] = useState(false);

  // Reconexión automática de sesión de Firebase Auth tras recargar página (solo si había sesión activa guardada)
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((firebaseUser) => {
      const hasSavedSession = sessionStorage.getItem("DOCTORSV_ACTIVE_USER_SESSION") || localStorage.getItem("DOCTORSV_ACTIVE_USER_V2");
      if (!hasSavedSession) return;

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
          if (firebaseUser.displayName && !email.startsWith("elmer.andrade")) {
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
        const sup = supervisores.find((s) => safeLower(s.correo) === email);
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

              const cloudDoc = cloudMatch.doctor ? String(cloudMatch.doctor).trim() : null;
              const localDoc = s.doctor ? String(s.doctor).trim() : null;

              // Si el puesto fue liberado recientemente en esta sesión (3 minutos), ignorar ecos desactualizados de Sheets
              const releaseTimestamp = recentlyReleasedRef.current.get(Number(s.id));
              const isRecentlyReleased = releaseTimestamp && Date.now() - releaseTimestamp < 180000;

              let finalDoctor = localDoc;
              if (isRecentlyReleased) {
                finalDoctor = null;
              } else if (cloudDoc && localDoc && cloudDoc !== localDoc) {
                // Solo si el médico ya estaba asignado y Sheets trae una corrección explícita
                finalDoctor = cloudDoc;
              } else if (!cloudDoc && !localDoc) {
                finalDoctor = null;
              }

              // Si el puesto tiene un médico asignado, su estado DEBE ser OCUPADO
              let finalEstado = s.estado;
              if (finalDoctor) {
                finalEstado = "OCUPADO";
              } else if (isRecentlyReleased) {
                finalEstado = "DISPONIBLE";
              } else if (cloudMatch.estado && !localDoc) {
                finalEstado = cloudMatch.estado;
              }

              // Normalizar marca y modelo si el estado es DISPONIBLE
              let finalMarca = cloudMatch.marca || s.marca;
              if (finalEstado === "DISPONIBLE" && (!finalMarca || finalMarca === "NO PC")) {
                finalMarca = "DELL";
              }
              let finalModelo = cloudMatch.modelo || s.modelo;
              if (finalEstado === "DISPONIBLE" && !finalModelo) {
                finalModelo = "OptiPlex 3080";
              }

              const doctorChanged = finalDoctor !== (s.doctor || null);
              const estadoChanged = finalEstado !== s.estado;
              const horarioChanged = cloudMatch.horario && (cloudMatch.horario !== s.horario);
              const obsChanged = cloudMatch.observaciones !== undefined && (cloudMatch.observaciones !== (s.observaciones || ""));
              const hardwareChanged =
                (finalMarca !== s.marca) ||
                (finalModelo !== s.modelo) ||
                (cloudMatch.activoPc && cloudMatch.activoPc !== s.activoPc);

              if (doctorChanged || estadoChanged || horarioChanged || obsChanged || hardwareChanged) {
                hasChanges = true;
                return {
                  ...s,
                  estado: finalEstado,
                  doctor: finalDoctor,
                  horario: cloudMatch.horario || s.horario || null,
                  observaciones: cloudMatch.observaciones !== undefined ? cloudMatch.observaciones : s.observaciones,
                  marca: finalMarca,
                  modelo: finalModelo,
                  activoPc: cloudMatch.activoPc || s.activoPc,
                  categoria: Number(s.id) === 1 ? null : s.categoria,
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
    if (isInitialMountHorarios.current) {
      isInitialMountHorarios.current = false;
      return;
    }
    if (isRemoteHorariosRef.current) {
      isRemoteHorariosRef.current = false;
      return;
    }
    try {
      localStorage.setItem("DOCTORSV_CONFIG_HORARIOS_V1", JSON.stringify(horarios));
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("doctorsv_sync_channel");
        bc.postMessage({ type: "HORARIOS_UPDATED", payload: horarios, sender: myClientId.current });
        bc.close();
      }
      if (Array.isArray(horarios) && horarios.length > 0) {
        saveCloudHorarios(horarios, myClientId.current);
      }
    } catch (e) {
      console.error("Error saving horarios config:", e);
    }
  }, [horarios]);

  useEffect(() => {
    if (isInitialMountSupervisores.current) {
      isInitialMountSupervisores.current = false;
      return;
    }
    if (isRemoteSupervisoresRef.current) {
      isRemoteSupervisoresRef.current = false;
      return;
    }
    try {
      localStorage.setItem("DOCTORSV_SUPERVISORES_CONFIG_V1", JSON.stringify(supervisores));
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("doctorsv_sync_channel");
        bc.postMessage({ type: "SUPERVISORES_UPDATED", payload: supervisores, sender: myClientId.current });
        bc.close();
      }
      if (Array.isArray(supervisores) && supervisores.length > 0) {
        saveCloudSupervisores(supervisores, myClientId.current);
      }
    } catch (e) {
      console.error("Error saving supervisores config:", e);
    }
  }, [supervisores]);

  // Sincronizar en LocalStorage, notificar a otras pestañas y persistir en Cloud Firestore (sin bucle)
  useEffect(() => {
    if (isInitialMountSpaces.current) {
      isInitialMountSpaces.current = false;
      return;
    }
    if (isRemoteSpacesRef.current) {
      isRemoteSpacesRef.current = false;
      return; // Romper bucle: no re-enviar a Firestore ni a BroadcastChannel lo que vino de Firestore
    }
    try {
      localStorage.setItem("DOCTORSV_EXCEL_REAL_SPACES_V1", JSON.stringify(spaces));
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("doctorsv_sync_channel");
        bc.postMessage({ type: "SPACES_UPDATED", payload: spaces, sender: myClientId.current });
        bc.close();
      }
      if (Array.isArray(spaces) && spaces.length > 0) {
        saveCloudSpaces(spaces, myClientId.current);
      }
    } catch (e) {
      console.error("Error saving spaces:", e);
    }
  }, [spaces]);

  useEffect(() => {
    if (isInitialMountBodega.current) {
      isInitialMountBodega.current = false;
      return;
    }
    if (isRemoteBodegaRef.current) {
      isRemoteBodegaRef.current = false;
      return;
    }
    try {
      const simplified = bodegaStock.map(({ key, original, actual }) => ({ key, original, actual }));
      localStorage.setItem("DOCTORSV_EXCEL_REAL_BODEGA_V1", JSON.stringify(simplified));
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("doctorsv_sync_channel");
        bc.postMessage({ type: "BODEGA_UPDATED", payload: bodegaStock, sender: myClientId.current });
        bc.close();
      }
      if (Array.isArray(simplified) && simplified.length > 0) {
        saveCloudBodega(simplified, myClientId.current);
      }
    } catch (e) {
      console.error("Error saving bodega:", e);
    }
  }, [bodegaStock]);

  useEffect(() => {
    if (isInitialMountHistorial.current) {
      isInitialMountHistorial.current = false;
      return;
    }
    if (isRemoteHistorialRef.current) {
      isRemoteHistorialRef.current = false;
      return;
    }
    try {
      localStorage.setItem("DOCTORSV_EXCEL_REAL_HISTORIAL_V1", JSON.stringify(historial));
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("doctorsv_sync_channel");
        bc.postMessage({ type: "HISTORIAL_UPDATED", payload: historial, sender: myClientId.current });
        bc.close();
      }
      if (Array.isArray(historial) && historial.length > 0) {
        saveCloudHistorial(historial, myClientId.current);
      }
    } catch (e) {
      console.error("Error saving historial:", e);
    }
  }, [historial]);

  useEffect(() => {
    if (isInitialMountRosters.current) {
      isInitialMountRosters.current = false;
      return;
    }
    if (isRemoteRostersRef.current) {
      isRemoteRostersRef.current = false;
      return;
    }
    try {
      localStorage.setItem("DOCTORSV_SUPERVISOR_ROSTERS_V2", JSON.stringify(rosters));
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("doctorsv_sync_channel");
        bc.postMessage({ type: "ROSTERS_UPDATED", payload: rosters, sender: myClientId.current });
        bc.close();
      }
      if (rosters && typeof rosters === "object" && Object.keys(rosters).length > 0) {
        saveCloudRosters(rosters, myClientId.current);
      }
    } catch (e) {
      console.error("Error saving rosters:", e);
    }
  }, [rosters]);

  // Persistir quincena oficial localmente y en Firestore
  useEffect(() => {
    if (isInitialMountQuincena.current) {
      isInitialMountQuincena.current = false;
      return;
    }
    if (isRemoteQuincenaRef.current) {
      isRemoteQuincenaRef.current = false;
      return;
    }
    try {
      localStorage.setItem("DOCTORSV_QUINCENA_OFICIAL_V1", JSON.stringify(quincena));
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("doctorsv_sync_channel");
        bc.postMessage({ type: "QUINCENA_UPDATED", payload: quincena, sender: myClientId.current });
        bc.close();
      }
      if (quincena && typeof quincena === "object") {
        saveCloudQuincena(quincena, myClientId.current);
      }
    } catch (e) {
      console.error("Error saving quincena:", e);
    }
  }, [quincena]);

  // Suscripción en tiempo real a Cloud Firestore para sincronización multi-dispositivo sin bucles
  useEffect(() => {
    const unsubSpaces = subscribeToCloudSpaces((cloudSpaces) => {
      if (cloudSpaces && Array.isArray(cloudSpaces) && cloudSpaces.length > 0) {
        setSpaces((prev) => {
          const fullList = ensureAllSpaces(cloudSpaces);
          if (JSON.stringify(prev) === JSON.stringify(fullList)) return prev;
          isRemoteSpacesRef.current = true;
          return fullList;
        });
        setLastSyncTime(new Date());
      }
    }, null, myClientId.current);

    const unsubBodega = subscribeToCloudBodega((cloudBodega) => {
      if (cloudBodega && Array.isArray(cloudBodega) && cloudBodega.length > 0) {
        setBodegaStock((prev) => {
          const updated = prev.map((b) => {
            const match = cloudBodega.find((p) => p.key === b.key);
            return match ? { ...b, actual: match.actual } : b;
          });
          if (JSON.stringify(prev) === JSON.stringify(updated)) return prev;
          isRemoteBodegaRef.current = true;
          return updated;
        });
      }
    }, null, myClientId.current);

    const unsubHistorial = subscribeToCloudHistorial((cloudHistorial) => {
      if (cloudHistorial && Array.isArray(cloudHistorial) && cloudHistorial.length > 0) {
        setHistorial((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(cloudHistorial)) return prev;
          isRemoteHistorialRef.current = true;
          return cloudHistorial;
        });
      }
    }, null, myClientId.current);

    const unsubRosters = subscribeToCloudRosters((cloudRosters) => {
      if (cloudRosters && typeof cloudRosters === "object" && Object.keys(cloudRosters).length > 0) {
        setRosters((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(cloudRosters)) return prev;
          isRemoteRostersRef.current = true;
          return cloudRosters;
        });
      }
    }, null, myClientId.current);

    const unsubHorarios = subscribeToCloudHorarios((cloudHorarios) => {
      if (cloudHorarios && Array.isArray(cloudHorarios) && cloudHorarios.length > 0) {
        setHorarios((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(cloudHorarios)) return prev;
          isRemoteHorariosRef.current = true;
          return cloudHorarios;
        });
      }
    }, null, myClientId.current);

    const unsubSupervisores = subscribeToCloudSupervisores((cloudSupervisores) => {
      if (cloudSupervisores && Array.isArray(cloudSupervisores) && cloudSupervisores.length > 0) {
        setSupervisores((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(cloudSupervisores)) return prev;
          isRemoteSupervisoresRef.current = true;
          return cloudSupervisores;
        });
      }
    }, null, myClientId.current);

    const unsubAttendance = subscribeToCloudAttendance((cloudAttendance) => {
      if (cloudAttendance && typeof cloudAttendance === "object" && Object.keys(cloudAttendance).length > 0) {
        setAttendanceRecords((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(cloudAttendance)) return prev;
          isRemoteAttendanceRef.current = true;
          return cloudAttendance;
        });
      }
    }, null, myClientId.current);

    const unsubQuincena = subscribeToCloudQuincena((cloudQuincena) => {
      if (cloudQuincena && typeof cloudQuincena === "object" && cloudQuincena.dias) {
        setQuincena((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(cloudQuincena)) return prev;
          isRemoteQuincenaRef.current = true;
          return cloudQuincena;
        });
      }
    }, null, myClientId.current);

    const unsubDailyLots = subscribeToCloudDailyLots((cloudDailyLots) => {
      if (cloudDailyLots && typeof cloudDailyLots === "object") {
        setDailyLots((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(cloudDailyLots)) return prev;
          isRemoteDailyLotsRef.current = true;
          return cloudDailyLots;
        });
      }
    }, null, myClientId.current);

    return () => {
      if (unsubSpaces) unsubSpaces();
      if (unsubBodega) unsubBodega();
      if (unsubHistorial) unsubHistorial();
      if (unsubRosters) unsubRosters();
      if (unsubHorarios) unsubHorarios();
      if (unsubSupervisores) unsubSupervisores();
      if (unsubAttendance) unsubAttendance();
      if (unsubQuincena) unsubQuincena();
      if (unsubDailyLots) unsubDailyLots();
    };
  }, []);

  // Sincronizar attendanceRecords en localStorage y Firestore
  useEffect(() => {
    if (isInitialMountAttendance.current) {
      isInitialMountAttendance.current = false;
      return;
    }
    if (isRemoteAttendanceRef.current) {
      isRemoteAttendanceRef.current = false;
      return;
    }
    try {
      localStorage.setItem("DOCTORSV_ATTENDANCE_V1", JSON.stringify(attendanceRecords));
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("doctorsv_sync_channel");
        bc.postMessage({ type: "ATTENDANCE_UPDATED", payload: attendanceRecords, sender: myClientId.current });
        bc.close();
      }
      if (attendanceRecords && typeof attendanceRecords === "object") {
        saveCloudAttendance(attendanceRecords, myClientId.current);
      }
    } catch (e) {
      console.error("Error saving attendance:", e);
    }
  }, [attendanceRecords]);

  // Sincronizar dailyLots en localStorage y Firestore
  useEffect(() => {
    if (isInitialMountDailyLots.current) {
      isInitialMountDailyLots.current = false;
      return;
    }
    if (isRemoteDailyLotsRef.current) {
      isRemoteDailyLotsRef.current = false;
      return;
    }
    try {
      localStorage.setItem("DOCTORSV_DAILY_LOTS_V1", JSON.stringify(dailyLots));
      if (dailyLots && typeof dailyLots === "object") {
        saveCloudDailyLots(dailyLots, myClientId.current);
      }
    } catch (e) {
      console.error("Error saving daily lots:", e);
    }
  }, [dailyLots]);

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

  // Sincronización cruzada bidireccional en tiempo real entre pestañas sin bucles
  useEffect(() => {
    let bc = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel("doctorsv_sync_channel");
        bc.onmessage = (event) => {
          const { type, payload, sender } = event.data || {};
          if (sender === myClientId.current) return;

          if (type === "SPACES_UPDATED" && payload) {
            setSpaces((prev) => {
              if (JSON.stringify(prev) === JSON.stringify(payload)) return prev;
              isRemoteSpacesRef.current = true;
              return payload;
            });
            setLastSyncTime(new Date());
          } else if (type === "HISTORIAL_UPDATED" && payload) {
            setHistorial((prev) => {
              if (JSON.stringify(prev) === JSON.stringify(payload)) return prev;
              isRemoteHistorialRef.current = true;
              return payload;
            });
          } else if (type === "BODEGA_UPDATED" && payload) {
            setBodegaStock((prev) => {
              if (JSON.stringify(prev) === JSON.stringify(payload)) return prev;
              isRemoteBodegaRef.current = true;
              return payload;
            });
          } else if (type === "ROSTERS_UPDATED" && payload) {
            setRosters((prev) => {
              if (JSON.stringify(prev) === JSON.stringify(payload)) return prev;
              isRemoteRostersRef.current = true;
              return payload;
            });
          } else if (type === "HORARIOS_UPDATED" && payload) {
            setHorarios((prev) => {
              if (JSON.stringify(prev) === JSON.stringify(payload)) return prev;
              isRemoteHorariosRef.current = true;
              return payload;
            });
          } else if (type === "SUPERVISORES_UPDATED" && payload) {
            setSupervisores((prev) => {
              if (JSON.stringify(prev) === JSON.stringify(payload)) return prev;
              isRemoteSupervisoresRef.current = true;
              return payload;
            });
          } else if (type === "ATTENDANCE_UPDATED" && payload) {
            setAttendanceRecords((prev) => {
              if (JSON.stringify(prev) === JSON.stringify(payload)) return prev;
              isRemoteAttendanceRef.current = true;
              return payload;
            });
          } else if (type === "QUINCENA_UPDATED" && payload) {
            setQuincena((prev) => {
              if (JSON.stringify(prev) === JSON.stringify(payload)) return prev;
              isRemoteQuincenaRef.current = true;
              return payload;
            });
          }
        };
      }
    } catch {}

    return () => {
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
    const cleanId = Number(updatedSpace.id);
    recentlyReleasedRef.current.set(cleanId, Date.now());

    const normalized = {
      ...updatedSpace,
      categoria: cleanId === 1 ? null : updatedSpace.categoria,
      marca: (updatedSpace.estado === "DISPONIBLE" && (!updatedSpace.marca || updatedSpace.marca === "NO PC")) ? "DELL" : (updatedSpace.marca || "DELL"),
      modelo: (updatedSpace.estado === "DISPONIBLE" && !updatedSpace.modelo) ? "OptiPlex 3080" : (updatedSpace.modelo || "OptiPlex 3080"),
    };

    let previousSpaceId = null;
    const nextSpaces = spaces.map((s) => {
      if (normalized.doctor && Number(s.id) !== cleanId && s.doctor && isSameDoctor(s.doctor, normalized.doctor)) {
        previousSpaceId = Number(s.id);
        recentlyReleasedRef.current.set(previousSpaceId, Date.now());
        return {
          ...s,
          doctor: null,
          horario: null,
          estado: "DISPONIBLE",
          marca: (s.marca && s.marca !== "NO PC") ? s.marca : "DELL",
          modelo: s.modelo || "OptiPlex 3080",
          ultimoMovimiento: new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" }),
        };
      }
      if (Number(s.id) === cleanId) return normalized;
      return s;
    });

    setSpaces(nextSpaces);
    saveCloudSpaces(nextSpaces, myClientId.current, true);

    if (normalized.doctor) {
      setAttendanceRecords((prev) => ({
        ...prev,
        [String(normalized.doctor).trim()]: "PRESENTE",
      }));
    }

    if (isGoogleSheetsConfigured()) {
      updateSpaceInGoogleSheets(normalized);
      if (previousSpaceId !== null) {
        updateSpaceInGoogleSheets({
          id: previousSpaceId,
          doctor: "",
          horario: "",
          estado: "DISPONIBLE",
          marca: "DELL",
        });
      }
    }
  }

  function handleAssignDoctor(doctorName, spaceId, horario) {
    if (!doctorName) return;
    const cleanDoc = String(doctorName).trim();
    const cleanSpaceId = Number(spaceId);
    const assignedHorario = horario || "07:00 AM – 12:00 PM";
    const nowTime = new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" });

    let previousSpaceId = null;
    const nextSpaces = spaces.map((s) => {
      // Liberar puesto anterior si el médico estaba asignado en otro cubículo
      if (s.doctor && (safeLower(s.doctor) === safeLower(cleanDoc) || isSameDoctor(s.doctor, cleanDoc)) && Number(s.id) !== cleanSpaceId) {
        previousSpaceId = Number(s.id);
        recentlyReleasedRef.current.set(previousSpaceId, Date.now());
        return {
          ...s,
          doctor: null,
          horario: null,
          categoria: Number(s.id) === 1 ? null : s.categoria,
          estado: "DISPONIBLE",
          marca: (s.marca && s.marca !== "NO PC") ? s.marca : "DELL",
          modelo: s.modelo || "OptiPlex 3080",
          ultimoMovimiento: nowTime,
        };
      }
      // Asignar al nuevo puesto
      if (Number(s.id) === cleanSpaceId) {
        return {
          ...s,
          doctor: cleanDoc,
          horario: assignedHorario,
          estado: "OCUPADO",
          marca: (s.marca && s.marca !== "NO PC") ? s.marca : "DELL",
          modelo: s.modelo || "OptiPlex 3080",
          ultimoMovimiento: nowTime,
        };
      }
      return s;
    });

    setSpaces(nextSpaces);
    saveCloudSpaces(nextSpaces, myClientId.current, true);

    setAttendanceRecords((prev) => ({
      ...prev,
      [cleanDoc]: "PRESENTE",
    }));

    if (isGoogleSheetsConfigured()) {
      updateSpaceInGoogleSheets({
        id: cleanSpaceId,
        doctor: cleanDoc,
        horario: assignedHorario,
        estado: "OCUPADO",
        marca: "DELL",
      });
      if (previousSpaceId !== null) {
        updateSpaceInGoogleSheets({
          id: previousSpaceId,
          doctor: "",
          horario: "",
          estado: "DISPONIBLE",
          marca: "DELL",
        });
      }
    }
  }

  function handleUnassignDoctor(doctorName, spaceId) {
    const cleanDoc = doctorName ? safeLower(doctorName).trim() : null;
    const cleanSpaceId = spaceId !== undefined && spaceId !== null ? Number(spaceId) : null;
    const nowTime = new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" });

    let unassignedSpaceId = cleanSpaceId;
    let hasChanges = false;

    if (cleanSpaceId) {
      recentlyReleasedRef.current.set(cleanSpaceId, Date.now());
    }

    const nextSpaces = spaces.map((s) => {
      const matchesSpace = cleanSpaceId !== null && Number(s.id) === cleanSpaceId;
      const matchesDoc = cleanDoc && s.doctor && (safeLower(s.doctor) === cleanDoc || isSameDoctor(s.doctor, doctorName));

      if (matchesSpace || matchesDoc) {
        hasChanges = true;
        if (!unassignedSpaceId) unassignedSpaceId = Number(s.id);
        recentlyReleasedRef.current.set(Number(s.id), Date.now());
        const isSpecial = s.estado === "INHABILITADO" || s.estado === "REPARACION";
        return {
          ...s,
          doctor: null,
          horario: null,
          categoria: Number(s.id) === 1 ? null : s.categoria,
          estado: isSpecial ? s.estado : "DISPONIBLE",
          marca: (s.marca && s.marca !== "NO PC") ? s.marca : "DELL",
          modelo: s.modelo || "OptiPlex 3080",
          observaciones: s.observaciones ? s.observaciones.replace(/\|\s*Turno activo.*?$/i, "").trim() : "",
          ultimoMovimiento: nowTime,
        };
      }
      return s;
    });

    if (!hasChanges) return;

    setSpaces(nextSpaces);
    saveCloudSpaces(nextSpaces, myClientId.current, true);

    // Al liberar un médico del puesto, marcar su asistencia como FINALIZADO para evitar remanentes sin puesto
    setAttendanceRecords((prev) => {
      const next = { ...prev };
      if (doctorName) {
        Object.keys(next).forEach((k) => {
          if (isSameDoctor(k, doctorName)) {
            next[k] = "FINALIZADO";
          }
        });
        next[doctorName] = "FINALIZADO";
      }
      return next;
    });

    if (isGoogleSheetsConfigured() && unassignedSpaceId !== null) {
      updateSpaceInGoogleSheets({
        id: unassignedSpaceId,
        doctor: "",
        horario: "",
        estado: "DISPONIBLE",
        marca: "DELL",
      });
    }
  }

  // Asignación atómica en lote para supervisores
  function handleAssignBatch(assignments, horario) {
    if (!Array.isArray(assignments) || assignments.length === 0) return;
    const nowTime = new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" });
    const assignedHorario = horario || "07:00 AM – 12:00 PM";

    const assignBySpaceId = new Map();
    const docNamesAssigned = new Set();
    assignments.forEach((a) => {
      if (a.spaceId && a.doctor) {
        assignBySpaceId.set(Number(a.spaceId), String(a.doctor).trim());
        docNamesAssigned.add(safeLower(a.doctor).trim());
      }
    });

    const freedOldSpaces = [];
    const nextSpaces = spaces.map((s) => {
      const sid = Number(s.id);
      if (assignBySpaceId.has(sid)) {
        const docName = assignBySpaceId.get(sid);
        return {
          ...s,
          doctor: docName,
          horario: assignedHorario,
          estado: "OCUPADO",
          marca: (s.marca && s.marca !== "NO PC") ? s.marca : "DELL",
          modelo: s.modelo || "OptiPlex 3080",
          ultimoMovimiento: nowTime,
        };
      }
      if (s.doctor && docNamesAssigned.has(safeLower(s.doctor).trim()) && !assignBySpaceId.has(sid)) {
        freedOldSpaces.push(sid);
        recentlyReleasedRef.current.set(sid, Date.now());
        return {
          ...s,
          doctor: null,
          horario: null,
          categoria: sid === 1 ? null : s.categoria,
          estado: "DISPONIBLE",
          marca: (s.marca && s.marca !== "NO PC") ? s.marca : "DELL",
          modelo: s.modelo || "OptiPlex 3080",
          ultimoMovimiento: nowTime,
        };
      }
      return s;
    });

    setSpaces(nextSpaces);
    saveCloudSpaces(nextSpaces, myClientId.current, true);

    setAttendanceRecords((prev) => {
      const next = { ...prev };
      assignments.forEach((a) => {
        if (a.doctor) {
          next[a.doctor] = "PRESENTE";
        }
      });
      return next;
    });

    if (isGoogleSheetsConfigured() && updateSpacesBatchInGoogleSheets) {
      const updates = [
        ...assignments.map((a) => ({
          spaceId: Number(a.spaceId),
          doctor: a.doctor,
          horario: assignedHorario,
          estado: "OCUPADO",
        })),
        ...freedOldSpaces.map((sid) => ({
          spaceId: sid,
          doctor: "",
          horario: "",
          estado: "DISPONIBLE",
          marca: "DELL",
        })),
      ];
      updateSpacesBatchInGoogleSheets(updates).catch((err) => {
        console.warn("Error sync batch a Google Sheets:", err);
      });
    }
  }

  // Guardar nómina personalizada de un supervisor y sincronizarla en la nube
  function handleSaveSupervisorRoster(supId, newNames, franja = null, transferredDocs = []) {
    if (!supId) return;
    setRosters((prev) => {
      const next = {
        ...prev,
        [supId]: newNames,
      };
      if (franja && franja !== "TODOS") {
        next[`${supId}__${franja}`] = newNames;
      }
      // Si algún médico fue transferido desde otro supervisor en esta misma franja, removerlo del otro
      if (Array.isArray(transferredDocs) && transferredDocs.length > 0) {
        Object.keys(next).forEach((otherKey) => {
          if (otherKey !== supId && (!franja || otherKey.includes(franja))) {
            if (Array.isArray(next[otherKey])) {
              next[otherKey] = next[otherKey].filter(
                (name) => !transferredDocs.some((td) => isSameDoctor(td, name))
              );
            }
          }
        });
      }
      return next;
    });
  }

  // Flujo exclusivo de Doctor: Asignación interactiva al hacer clic en un puesto del mapa
  function handleClaimSpace(space) {
    if (!currentUser) return;
    const docName = currentUser.name;
    const shift = currentUser.shift;
    const cleanSpaceId = Number(space.id);
    const timeNow = new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" });

    let previousSpaceId = null;
    const nextSpaces = spaces.map((s) => {
      // Liberar puesto anterior si tenía uno asignado
      if (s.doctor && isSameDoctor(s.doctor, docName) && Number(s.id) !== cleanSpaceId) {
        previousSpaceId = Number(s.id);
        recentlyReleasedRef.current.set(previousSpaceId, Date.now());
        return {
          ...s,
          doctor: null,
          horario: null,
          categoria: Number(s.id) === 1 ? null : s.categoria,
          estado: "DISPONIBLE",
          marca: (s.marca && s.marca !== "NO PC") ? s.marca : "DELL",
          modelo: s.modelo || "OptiPlex 3080",
          ultimoMovimiento: timeNow,
        };
      }
      if (Number(s.id) === cleanSpaceId) {
        return {
          ...s,
          doctor: docName,
          horario: shift,
          supervisorId: currentUser.supervisorId || null,
          supervisorNombre: currentUser.supervisorNombre || null,
          estado: "OCUPADO",
          marca: (s.marca && s.marca !== "NO PC") ? s.marca : "DELL",
          modelo: s.modelo || "OptiPlex 3080",
          ultimoMovimiento: timeNow,
        };
      }
      return s;
    });

    setSpaces(nextSpaces);
    saveCloudSpaces(nextSpaces, myClientId.current, true);

    setCurrentUser((prev) => (prev ? { ...prev, spaceId: cleanSpaceId } : null));

    // Actualizar registro de asistencia a PRESENTE
    setAttendanceRecords((prev) => ({
      ...prev,
      [docName]: "PRESENTE",
    }));

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
        marca: "DELL",
      });
      if (previousSpaceId !== null) {
        updateSpaceInGoogleSheets({
          id: previousSpaceId,
          doctor: "",
          horario: "",
          estado: "DISPONIBLE",
          marca: "DELL",
        });
      }
      logMovementToGoogleSheets(newLog);
    }
  }

  // Liberar el puesto de trabajo del doctor (dejándolo DISPONIBLE para el siguiente turno)
  function handleReleaseMySpace() {
    if (!currentUser) return;
    const docName = currentUser.name;
    const activeSpace = (spaces || []).find((s) => s.doctor && isSameDoctor(s.doctor, docName));
    const currentSpaceId = currentUser.spaceId ? Number(currentUser.spaceId) : (activeSpace ? Number(activeSpace.id) : null);

    if (currentSpaceId) {
      recentlyReleasedRef.current.set(currentSpaceId, Date.now());
    }

    // Actualizar estado de asistencia a FINALIZADO (Jornada completada / Salida)
    setAttendanceRecords((prev) => ({
      ...prev,
      [docName]: "FINALIZADO",
    }));

    const nowTime = new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" });

    const nextSpaces = spaces.map((s) => {
      if ((currentSpaceId && Number(s.id) === currentSpaceId) || (s.doctor && isSameDoctor(s.doctor, docName))) {
        recentlyReleasedRef.current.set(Number(s.id), Date.now());
        return {
          ...s,
          doctor: null,
          horario: null,
          categoria: Number(s.id) === 1 ? null : s.categoria,
          estado: "DISPONIBLE",
          marca: (s.marca && s.marca !== "NO PC") ? s.marca : "DELL",
          modelo: s.modelo || "OptiPlex 3080",
          ultimoMovimiento: nowTime,
        };
      }
      return s;
    });

    setSpaces(nextSpaces);
    saveCloudSpaces(nextSpaces, myClientId.current, true);

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
          marca: "DELL",
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
    setTab("mapa");
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
    let previousSpaceId = null;

    const nextSpaces = spaces.map((s) => {
      if (s.doctor && isSameDoctor(s.doctor, doctor) && Number(s.id) !== cleanSpaceId) {
        previousSpaceId = Number(s.id);
        recentlyReleasedRef.current.set(previousSpaceId, Date.now());
        return {
          ...s,
          doctor: null,
          horario: null,
          categoria: Number(s.id) === 1 ? null : s.categoria,
          estado: "DISPONIBLE",
          marca: (s.marca && s.marca !== "NO PC") ? s.marca : "DELL",
          modelo: s.modelo || "OptiPlex 3080",
          ultimoMovimiento: timestamp,
        };
      }
      if (Number(s.id) === cleanSpaceId) {
        return {
          ...s,
          doctor,
          horario,
          estado: "OCUPADO",
          marca: (s.marca && s.marca !== "NO PC") ? s.marca : "DELL",
          modelo: s.modelo || "OptiPlex 3080",
          ultimoMovimiento: timestamp,
        };
      }
      return s;
    });

    setSpaces(nextSpaces);
    saveCloudSpaces(nextSpaces, myClientId.current, true);

    setAttendanceRecords((prev) => ({
      ...prev,
      [String(doctor).trim()]: "PRESENTE",
    }));

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
        marca: "DELL",
      });
      if (previousSpaceId !== null) {
        updateSpaceInGoogleSheets({
          id: previousSpaceId,
          doctor: "",
          horario: "",
          estado: "DISPONIBLE",
          marca: "DELL",
        });
      }
      logMovementToGoogleSheets(newEntry);
    }
  }

  function handleReleaseShift() {
    const isSup = (s) => ([135, 136, 137, 138, 139].includes(Number(s.id)) || s.categoria === "Supervisores") && s.estado !== "DISPONIBLE";
    const isOccupied = (s) => (s.estado === "OCUPADO" || Boolean(s.doctor)) && !isSup(s);
    const spacesToRelease = spaces.filter(isOccupied);

    // Registrar en caché de liberaciones recientes para blindar contra ecos de Google Sheets
    spacesToRelease.forEach((s) => {
      recentlyReleasedRef.current.set(Number(s.id), Date.now());
    });

    const nowTime = new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" });

    const nextSpaces = spaces.map((s) => {
      if (isOccupied(s)) {
        return {
          ...s,
          doctor: null,
          horario: null,
          categoria: Number(s.id) === 1 ? null : s.categoria,
          estado: "DISPONIBLE",
          marca: (s.marca && s.marca !== "NO PC") ? s.marca : "DELL",
          modelo: s.modelo || "OptiPlex 3080",
          observaciones: s.observaciones ? s.observaciones.replace(/\|\s*Turno activo.*?$/i, "").trim() : "",
          ultimoMovimiento: nowTime,
        };
      }
      return s;
    });

    setSpaces(nextSpaces);

    // Si el usuario actual tenía un cubículo asignado, desvincularlo
    setCurrentUser((prev) => (prev?.spaceId ? { ...prev, spaceId: null } : prev));

    // Marcar asistencia de los médicos liberados y TODOS los presentes como FINALIZADO
    setAttendanceRecords((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (next[k] === "PRESENTE") {
          next[k] = "FINALIZADO";
        }
      });
      spacesToRelease.forEach((s) => {
        if (s.doctor) {
          next[s.doctor] = "FINALIZADO";
        }
      });
      return next;
    });

    // Guardar inmediatamente en Firestore
    saveCloudSpaces(nextSpaces, myClientId.current, true);

    const newEntry = {
      id: `relevo-${Date.now()}`,
      fecha: new Date().toLocaleDateString("es-SV"),
      equipo: "TODOS",
      espacio: null,
      accion: "Relevo de Turno",
      origen: "Turno Saliente",
      destino: "DISPONIBLE",
      falla: "N/A",
      obs: `Relevo general de turno ejecutado: ${spacesToRelease.length} puestos liberados totalmente`,
    };

    setHistorial((prev) => [newEntry, ...prev]);

    if (isGoogleSheetsConfigured()) {
      logMovementToGoogleSheets(newEntry);
      const batchPayload = spacesToRelease.map((s) => ({
        id: s.id,
        spaceId: s.id,
        doctor: "",
        horario: "",
        estado: "DISPONIBLE",
        marca: (s.marca && s.marca !== "NO PC") ? s.marca : "DELL",
        observaciones: s.observaciones ? s.observaciones.replace(/\|\s*Turno activo.*?$/i, "").trim() : "",
      }));
      updateSpacesBatchInGoogleSheets(batchPayload);
    }
  }

  function handleReleaseByHorario(horario) {
    if (!horario) return;
    const isSup = (s) => ([135, 136, 137, 138, 139].includes(Number(s.id)) || s.categoria === "Supervisores") && s.estado !== "DISPONIBLE";
    const isOccupiedInShift = (s) => (s.estado === "OCUPADO" || Boolean(s.doctor)) && !isSup(s) && isSameHorario(s.horario, horario);
    const spacesToRelease = spaces.filter(isOccupiedInShift);

    spacesToRelease.forEach((s) => {
      recentlyReleasedRef.current.set(Number(s.id), Date.now());
    });

    const nowTime = new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" });

    const nextSpaces = spaces.map((s) => {
      if (isOccupiedInShift(s)) {
        return {
          ...s,
          doctor: null,
          horario: null,
          categoria: Number(s.id) === 1 ? null : s.categoria,
          estado: "DISPONIBLE",
          marca: (s.marca && s.marca !== "NO PC") ? s.marca : "DELL",
          modelo: s.modelo || "OptiPlex 3080",
          observaciones: s.observaciones ? s.observaciones.replace(/\|\s*Turno activo.*?$/i, "").trim() : "",
          ultimoMovimiento: nowTime,
        };
      }
      return s;
    });

    setSpaces(nextSpaces);

    setCurrentUser((prev) => {
      if (prev?.spaceId && spacesToRelease.some((r) => Number(r.id) === Number(prev.spaceId))) {
        return { ...prev, spaceId: null };
      }
      return prev;
    });

    // Finalizar asistencia para puestos del turno y para doctores con este horario
    setAttendanceRecords((prev) => {
      const next = { ...prev };
      spacesToRelease.forEach((s) => {
        if (s.doctor) {
          Object.keys(next).forEach((k) => {
            if (isSameDoctor(k, s.doctor)) next[k] = "FINALIZADO";
          });
          next[s.doctor] = "FINALIZADO";
        }
      });
      Object.keys(next).forEach((docName) => {
        if (next[docName] === "PRESENTE") {
          const docObj = DOCTORES_EXCEL.find((d) => isSameDoctor(d.nombre, docName));
          if (docObj && isSameHorario(docObj.horario, horario)) {
            next[docName] = "FINALIZADO";
          }
        }
      });
      return next;
    });

    saveCloudSpaces(nextSpaces, myClientId.current, true);

    const newEntry = {
      id: `relevo-h-${Date.now()}`,
      fecha: new Date().toLocaleDateString("es-SV"),
      equipo: "FRANJA",
      espacio: null,
      accion: "Relevo por Franja",
      origen: `Franja ${horario}`,
      destino: "DISPONIBLE",
      falla: "N/A",
      obs: `Relevo de franja ejecutado: ${spacesToRelease.length} puestos de la franja "${horario}" liberados totalmente`,
    };

    setHistorial((prev) => [newEntry, ...prev]);

    if (isGoogleSheetsConfigured()) {
      logMovementToGoogleSheets(newEntry);
      const batchPayload = spacesToRelease.map((s) => ({
        id: s.id,
        spaceId: s.id,
        doctor: "",
        horario: "",
        estado: "DISPONIBLE",
        marca: (s.marca && s.marca !== "NO PC") ? s.marca : "DELL",
        observaciones: s.observaciones ? s.observaciones.replace(/\|\s*Turno activo.*?$/i, "").trim() : "",
      }));
      updateSpacesBatchInGoogleSheets(batchPayload);
    }
  }

  // Liberación atómica de todos los puestos ocupados en el lote a cargo de un supervisor
  function handleReleaseLote(bloqueInicio, bloqueFin, supName, supId = null, targetDoctorNames = null) {
    const bIni = Number(bloqueInicio);
    const bFin = Number(bloqueFin);
    if (isNaN(bIni) || isNaN(bFin)) return;

    const isSupStation = (sid) => [135, 136, 137, 138, 139].includes(sid);
    const spacesToRelease = spaces.filter((s) => {
      const sid = Number(s.id);
      return sid >= bIni && sid <= bFin && (s.estado === "OCUPADO" || Boolean(s.doctor)) && !isSupStation(sid);
    });

    // Detectar médicos remanentes asignados a este supervisor o lote que están en PRESENTE
    const targetSupId = supId || (supervisores.find((s) => Number(s.bloqueInicio) === bIni)?.id);
    let supervisorRosterNames = [];
    if (Array.isArray(targetDoctorNames) && targetDoctorNames.length > 0) {
      supervisorRosterNames = [...targetDoctorNames];
    } else if (targetSupId) {
      const explicitRoster = (rosters[targetSupId] || []).concat(
        Object.keys(rosters).filter(k => k.startsWith(`${targetSupId}__`)).flatMap(k => rosters[k] || [])
      );
      if (explicitRoster.length > 0) {
        supervisorRosterNames = explicitRoster;
      } else {
        // Fallback oficial según grupo asignado al lote
        if (targetSupId === "sup-1" || bIni === 37) {
          supervisorRosterNames = DOCTORES_EXCEL.filter((d) => d.grupo === "Grupo 1").map((d) => d.nombre);
        } else if (targetSupId === "sup-2" || bIni === 71) {
          supervisorRosterNames = DOCTORES_EXCEL.filter((d) => d.grupo === "Grupo 2").map((d) => d.nombre);
        }
      }
    }

    const presentRemanents = Object.keys(attendanceRecords).filter((docName) => {
      if (attendanceRecords[docName] !== "PRESENTE") return false;
      const isInRoster = supervisorRosterNames.some((rn) => isSameDoctor(rn, docName));
      const isInLotSpaces = spacesToRelease.some((s) => s.doctor && isSameDoctor(s.doctor, docName));
      return isInRoster || isInLotSpaces;
    });

    if (spacesToRelease.length === 0 && presentRemanents.length === 0) {
      alert(`No hay cubículos ocupados ni médicos con asistencia activa pendientes en el lote #${bIni} al #${bFin}.`);
      return;
    }

    const totalToFree = spacesToRelease.length + presentRemanents.length;
    if (!window.confirm(
      `¿Liberar y finalizar jornada del lote #${bIni} al #${bFin}?\n\n` +
      `• ${spacesToRelease.length} cubículo(s) quedarán 100% DISPONIBLES.\n` +
      `• ${presentRemanents.length} médico(s) en asistencia pasarán a FINALIZADO (Salida).\n\n` +
      `Los remanentes sin puesto quedarán limpios para el siguiente turno.`
    )) {
      return;
    }

    spacesToRelease.forEach((s) => {
      recentlyReleasedRef.current.set(Number(s.id), Date.now());
    });

    const nowTime = new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" });

    const nextSpaces = spaces.map((s) => {
      const sid = Number(s.id);
      if (sid >= bIni && sid <= bFin && (s.estado === "OCUPADO" || Boolean(s.doctor)) && !isSupStation(sid)) {
        return {
          ...s,
          doctor: null,
          horario: null,
          categoria: sid === 1 ? null : s.categoria,
          estado: "DISPONIBLE",
          marca: (s.marca && s.marca !== "NO PC") ? s.marca : "DELL",
          modelo: s.modelo || "OptiPlex 3080",
          observaciones: s.observaciones ? s.observaciones.replace(/\|\s*Turno activo.*?$/i, "").trim() : "",
          ultimoMovimiento: nowTime,
        };
      }
      return s;
    });

    setSpaces(nextSpaces);

    setCurrentUser((prev) => {
      if (prev?.spaceId && spacesToRelease.some((r) => Number(r.id) === Number(prev.spaceId))) {
        return { ...prev, spaceId: null };
      }
      return prev;
    });

    // Finalizar asistencia de todos los médicos liberados y de los remanentes de este supervisor
    setAttendanceRecords((prev) => {
      const next = { ...prev };
      // 1. Médicos con puesto en el lote
      spacesToRelease.forEach((s) => {
        if (s.doctor) {
          Object.keys(next).forEach((k) => {
            if (isSameDoctor(k, s.doctor)) next[k] = "FINALIZADO";
          });
          next[s.doctor] = "FINALIZADO";
        }
      });
      // 2. Médicos remanentes en PRESENTE de este supervisor
      presentRemanents.forEach((name) => {
        Object.keys(next).forEach((k) => {
          if (isSameDoctor(k, name)) next[k] = "FINALIZADO";
        });
        next[name] = "FINALIZADO";
      });
      return next;
    });

    saveCloudSpaces(nextSpaces, myClientId.current, true);

    const newEntry = {
      id: `relevo-lote-${Date.now()}`,
      fecha: new Date().toLocaleDateString("es-SV"),
      equipo: "LOTE",
      espacio: `${bIni}-${bFin}`,
      accion: "Liberación de Lote",
      origen: `Lote #${bIni}-${bFin}`,
      destino: "DISPONIBLE",
      falla: "N/A",
      obs: `Supervisor ${supName || "Oficial"} liberó ${spacesToRelease.length} puestos y finalizó ${presentRemanents.length} remanentes del lote #${bIni} al #${bFin}`,
    };

    setHistorial((prev) => [newEntry, ...prev]);

    if (isGoogleSheetsConfigured()) {
      logMovementToGoogleSheets(newEntry);
      const batchPayload = spacesToRelease.map((s) => ({
        id: s.id,
        spaceId: s.id,
        doctor: "",
        horario: "",
        estado: "DISPONIBLE",
        marca: (s.marca && s.marca !== "NO PC") ? s.marca : "DELL",
        observaciones: s.observaciones ? s.observaciones.replace(/\|\s*Turno activo.*?$/i, "").trim() : "",
      }));
      updateSpacesBatchInGoogleSheets(batchPayload);
    }
  }

  function handleRegisterMovement(movementData) {
    const { tipo, equipo, cantidad, origen, destino, motivo, accion, spaceId, espacio, falla, obs } = movementData || {};
    const targetType = tipo || equipo || "PC";
    const qty = Number(cantidad) || 1;
    const isIngreso = accion === "Ingreso" || (accion && accion.toLowerCase().includes("ingreso"));
    const targetSpace = isIngreso ? null : (spaceId ? Number(spaceId) : (espacio ? Number(espacio) : null));

    setBodegaStock((prev) => {
      let found = false;
      const updated = prev.map((item) => {
        const match =
          item.key === targetType ||
          (item.key === "MAUSE" && (targetType === "MOUSE" || targetType === "MAUSE")) ||
          (item.key === "MOUSE" && (targetType === "MAUSE" || targetType === "MOUSE"));

        if (match) {
          found = true;
          const isOrigenBodega = String(origen || "").trim().toUpperCase().includes("BODEGA");
          const isDestinoBodega = String(destino || "").trim().toUpperCase().includes("BODEGA");

          let delta = 0;
          if (isIngreso) {
            delta = qty;
          } else if (accion === "Retiro" || (!isOrigenBodega && isDestinoBodega)) {
            delta = qty;
          } else if (isOrigenBodega && !isDestinoBodega) {
            delta = -qty;
          } else {
            if (isOrigenBodega) delta -= qty;
            if (isDestinoBodega) delta += qty;
          }

          return {
            ...item,
            actual: Math.max(0, (item.actual || 0) + delta),
          };
        }
        return item;
      });

      if (!found && isIngreso) {
        return [
          ...updated,
          {
            key: targetType,
            label: targetType,
            original: 0,
            actual: qty,
          },
        ];
      }
      return updated;
    });

    const newLog = {
      id: `mov-${Date.now()}`,
      fecha: new Date().toLocaleDateString("es-SV"),
      equipo: targetType,
      cantidad: qty,
      espacio: targetSpace,
      accion: isIngreso ? "Ingreso" : (accion || "Movimiento"),
      origen: isIngreso ? (origen || "PROVEEDOR") : (origen || "BODEGA"),
      destino: isIngreso ? "BODEGA" : (destino || "Puesto"),
      falla: falla || motivo || (isIngreso ? "Ingreso de stock nuevo" : "N/A"),
      obs: obs || (isIngreso ? `Ingreso de ${qty} unidad(es) de ${targetType} a Bodega` : `Operación de ${qty} unidad(es) de ${targetType}`),
    };

    setHistorial((prev) => [newLog, ...prev]);

    // Actualizar estado del cubículo físico cuando la operación afecta a un puesto específico
    if (targetSpace && !isIngreso) {
      let updatedSpaceObj = null;
      const nowTime = new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" });
      const nextSpaces = spaces.map((s) => {
        if (Number(s.id) === targetSpace) {
          if (accion === "Retiro") {
            const isPC = targetType === "PC" || targetType === "EQUIPO COMPLETO";
            updatedSpaceObj = {
              ...s,
              estado: isPC ? "VACIO" : "INCOMPLETO",
              marca: isPC ? "NO PC" : s.marca,
              modelo: isPC ? null : s.modelo,
              doctor: null,
              horario: null,
              ultimoMovimiento: nowTime,
            };
            return updatedSpaceObj;
          } else if (accion === "Mantenimiento") {
            updatedSpaceObj = {
              ...s,
              estado: "REPARACION",
              doctor: null,
              horario: null,
              ultimoMovimiento: nowTime,
            };
            return updatedSpaceObj;
          } else if (accion === "Reemplazo" || accion === "Reintegro" || accion === "Cambio") {
            updatedSpaceObj = {
              ...s,
              estado: s.doctor ? "OCUPADO" : "DISPONIBLE",
              marca: (s.marca && s.marca !== "NO PC") ? s.marca : "DELL",
              modelo: s.modelo || "OptiPlex 3080",
              ultimoMovimiento: nowTime,
            };
            return updatedSpaceObj;
          }
        }
        return s;
      });
      setSpaces(nextSpaces);
      saveCloudSpaces(nextSpaces, myClientId.current, true);

      if (isGoogleSheetsConfigured() && updatedSpaceObj) {
        updateSpaceInGoogleSheets(updatedSpaceObj);
      }
    }

    if (isGoogleSheetsConfigured()) {
      logMovementToGoogleSheets(newLog);
    }
  }

  async function handleSync() {
    setIsSyncing(true);
    let fetchedFromSheets = false;
    try {
      if (isGoogleSheetsConfigured()) {
        try {
          const res = await fetchSpacesFromGoogleSheets();
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            fetchedFromSheets = true;
            let updatedList = [];
            setSpaces((prev) => {
              updatedList = prev.map((s) => {
                const match = res.data.find((item) => Number(item.id) === Number(s.id));
                if (!match) return s;

                const releaseTimestamp = recentlyReleasedRef.current.get(Number(s.id));
                const isRecentlyReleased = releaseTimestamp && Date.now() - releaseTimestamp < 180000;

                if (isRecentlyReleased) {
                  return {
                    ...s,
                    ...match,
                    doctor: null,
                    horario: null,
                    categoria: Number(s.id) === 1 ? null : (match.categoria || s.categoria),
                    estado: "DISPONIBLE",
                    marca: (match.marca && match.marca !== "NO PC") ? match.marca : (s.marca && s.marca !== "NO PC" ? s.marca : "DELL"),
                    modelo: match.modelo || s.modelo || "OptiPlex 3080",
                  };
                }

                const finalDoctor = match.doctor ? String(match.doctor).trim() : null;
                let finalEstado = s.estado;
                if (finalDoctor) {
                  finalEstado = "OCUPADO";
                } else if (match.estado) {
                  finalEstado = match.estado;
                }

                let finalMarca = match.marca || s.marca;
                if (finalEstado === "DISPONIBLE" && (!finalMarca || finalMarca === "NO PC")) {
                  finalMarca = "DELL";
                }
                let finalModelo = match.modelo || s.modelo;
                if (finalEstado === "DISPONIBLE" && !finalModelo) {
                  finalModelo = "OptiPlex 3080";
                }

                return {
                  ...s,
                  ...match,
                  estado: finalEstado,
                  doctor: finalDoctor,
                  marca: finalMarca,
                  modelo: finalModelo,
                  categoria: Number(s.id) === 1 ? null : (match.categoria || s.categoria),
                };
              });
              return updatedList;
            });

            if (updatedList.length > 0) {
              saveCloudSpaces(updatedList, myClientId.current, true);
              try {
                localStorage.setItem("DOCTORSV_EXCEL_REAL_SPACES_V1", JSON.stringify(updatedList));
              } catch {}
            }
          }
        } catch (err) {
          console.warn("Sync from Google Sheets:", err);
        }
      }

      if (!fetchedFromSheets) {
        const savedSpaces = localStorage.getItem("DOCTORSV_EXCEL_REAL_SPACES_V1");
        if (savedSpaces) setSpaces(JSON.parse(savedSpaces));
      }

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
        onOpenCheckIn={handleOpenCheckIn}
        currentUser={currentUser}
        onLogout={handleLogout}
        onReleaseMySpace={handleReleaseMySpace}
        onOpenAuthPortal={() => setAuthPortalOpen(true)}
        onOpenShiftConfig={() => setShiftConfigOpen(true)}
        onOpenSupervisorConfig={() => setSupervisorConfigOpen(true)}
        onOpenDailyLots={() => setDailyLotsModalOpen(true)}
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
            onReleaseLote={handleReleaseLote}
            currentUser={currentUser}
            onReleaseMySpace={handleReleaseMySpace}
            horarios={horarios}
            supervisores={supervisores}
            rosterBySupervisor={rosters}
            bodegaStock={bodegaStock}
          />
        )}

        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 animate-pulse">
              <div className="h-9 w-9 rounded-full border-3 border-[#0095FF] border-t-transparent animate-spin" />
              <span className="text-[13px] font-bold text-slate-500">Cargando módulo...</span>
            </div>
          }
        >
          {!isDoctorRole && tab === "asistencia" && (
            <AttendanceView
              spaces={spaces}
              onAssignDoctor={handleAssignDoctor}
              onAssignBatch={handleAssignBatch}
              onUnassignDoctor={handleUnassignDoctor}
              onOpenCheckIn={handleOpenCheckIn}
              onOpenLiveReport={() => setLiveReportOpen(true)}
              initialSupId={currentUser?.supervisorId || null}
              onReleaseByHorario={handleReleaseByHorario}
              onReleaseLote={handleReleaseLote}
              rosterBySupervisor={rosters}
              onSaveRoster={handleSaveSupervisorRoster}
              horarios={horarios}
              supervisores={supervisores}
              onUpdateSupervisorFranja={handleUpdateSupervisorFranja}
              onUpdateSupervisorOfficialShift={handleUpdateSupervisorOfficialShift}
              onOpenSupervisorConfig={() => setSupervisorConfigOpen(true)}
              currentUser={currentUser}
              attendanceRecords={attendanceRecords}
              quincena={quincena}
              onSaveQuincena={(newQ) => setQuincena(newQ)}
              dailyLots={dailyLots}
              onSaveDailyLots={(newDL) => setDailyLots(newDL)}
              onOpenDailyLots={() => setDailyLotsModalOpen(true)}
              onSetAttendance={(docName, status) => {
                setAttendanceRecords((prev) => ({
                  ...prev,
                  [docName]: status,
                }));
              }}
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
              supervisores={supervisores}
              horarios={horarios}
            />
          )}

          {!isDoctorRole && !isSupervisorRole && tab === "historial" && (
            <HistoryView
              historial={historial}
              spaces={spaces}
              onRegisterMovement={handleRegisterMovement}
            />
          )}
        </Suspense>

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
          supervisores={supervisores}
          horarios={horarios}
          onOpenSupervisorConfig={() => setSupervisorConfigOpen(true)}
          onUpdateSupervisorOfficialShift={handleUpdateSupervisorOfficialShift}
          isMaster={currentUser?.role === "MASTER"}
        />
      )}

      {/* Modal interactivo para que el doctor ocupe o libere su puesto */}
      {claimModalSpace && (
        <ClaimSpaceModal
          space={claimModalSpace}
          currentUser={currentUser}
          supervisores={supervisores}
          onClose={() => setClaimModalSpace(null)}
          onConfirmClaim={handleClaimSpace}
          onReleaseMySpace={() => {
            handleReleaseMySpace();
            setClaimModalSpace(null);
          }}
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
            if (doctorData?.supervisorId && doctorData?.name) {
              setRosters((prev) => {
                const supId = doctorData.supervisorId;
                const shiftKey = doctorData.shift ? `${supId}__${doctorData.shift}` : null;
                const prevList = prev[supId] || [];
                const nextList = prevList.some((n) => isSameDoctor(n, doctorData.name))
                  ? prevList
                  : [...prevList, doctorData.name];

                const next = { ...prev, [supId]: nextList };
                if (shiftKey) {
                  const prevShiftList = prev[shiftKey] || [];
                  next[shiftKey] = prevShiftList.some((n) => isSameDoctor(n, doctorData.name))
                    ? prevShiftList
                    : [...prevShiftList, doctorData.name];
                }
                return next;
              });
            }
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
          supervisores={supervisores}
        />
      )}

      {/* Modales con Carga Diferida (Lazy) */}
      <Suspense fallback={null}>
        {checkInModalOpen && (
          <QuickCheckInModal
            spaces={spaces}
            onClose={() => {
              setCheckInModalOpen(false);
              setCheckInDefaultHorario(null);
            }}
            onConfirmCheckIn={handleConfirmCheckIn}
            horarios={horarios}
            defaultHorario={checkInDefaultHorario}
          />
        )}

        {shiftConfigOpen && (
          <ShiftConfigModal
            horarios={horarios}
            onSaveHorarios={(newHorarios) => setHorarios(newHorarios)}
            onClose={() => setShiftConfigOpen(false)}
          />
        )}

        {supervisorConfigOpen && (
          <SupervisorConfigModal
            supervisores={supervisores}
            onSaveSupervisores={(newSupervisores) => setSupervisores(newSupervisores)}
            onClose={() => setSupervisorConfigOpen(false)}
            horarios={horarios}
          />
        )}

        {dailyLotsModalOpen && (
          <DailyLotsManagerModal
            activeDailyLots={dailyLots}
            selectedDate={null}
            onSaveDailyLots={(newDL) => setDailyLots(newDL)}
            onClose={() => setDailyLotsModalOpen(false)}
            supervisores={supervisores}
            horarios={horarios}
          />
        )}

        {liveReportOpen && (
          <LiveAttendanceReportModal
            spaces={spaces}
            historial={historial}
            onClose={() => setLiveReportOpen(false)}
            horarios={horarios}
            supervisores={supervisores}
            rosterBySupervisor={rosters}
          />
        )}

        {googleSheetsModalOpen && (
          <GoogleSheetsConfigModal
            onClose={() => setGoogleSheetsModalOpen(false)}
            onConnected={() => {
              handleSync();
            }}
          />
        )}
      </Suspense>
      </div>
    </ErrorBoundary>
  );
}
