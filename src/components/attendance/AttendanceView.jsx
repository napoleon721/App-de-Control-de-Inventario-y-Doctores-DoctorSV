import React, { useState, useMemo, useEffect } from "react";
import {
  UserCheck, Users, CheckCircle2, XCircle, AlertCircle, Sparkles, Search,
  Filter, MapPin, Laptop, Clock, ArrowRight, Share2, FileSpreadsheet, ShieldAlert, Check, RefreshCw, Settings2, UserX, X, AlertTriangle, Calendar, LogOut
} from "lucide-react";
import SectionCard from "../common/SectionCard";
import Pill from "../common/Pill";
import { DOCTORES_EXCEL, STAFF_EXCEL, HORARIOS, ESTADOS, BRAND, SUPERVISORES_OFICIALES, getDefaultSupervisorRosters } from "../../constants/tokens";
import SupervisorRosterModal from "./SupervisorRosterModal";
import QuincenaManagerModal from "./QuincenaManagerModal";
import { isSameDoctor, isSameHorario, normalizeDocName, getDoctorSupervisorInfo } from "../../utils/safeHelpers";
import { findDailyLotForSupervisor, findDailyLotsForSupervisor } from "../../utils/dailyLotsParser";
import { syncSupervisorSheets } from "../../services/googleSheetsService";

export default function AttendanceView({
  spaces,
  onAssignDoctor,
  onAssignBatch = null,
  onUnassignDoctor,
  onOpenCheckIn,
  onOpenLiveReport,
  initialSupId = null,
  onReleaseByHorario,
  onReleaseLote = null,
  onSyncLote = null,
  onSync = null,
  isSyncing = false,
  rosterBySupervisor: propRosters = null,
  onSaveRoster = null,
  horarios = HORARIOS,
  supervisores = SUPERVISORES_OFICIALES,
  onOpenSupervisorConfig = null,
  currentUser = null,
  attendanceRecords: propAttendanceRecords = null,
  onSetAttendance: propOnSetAttendance = null,
  onUpdateSupervisorFranja = null,
  onUpdateSupervisorOfficialShift = null,
  onSaveQuincena = null,
  onSyncQuincenaDate = null,
  dailyLots = null,
  onSaveDailyLots = null,
  onOpenDailyLots = null,
}) {
  const isMaster = currentUser?.role === "MASTER";

  const [syncFeedback, setSyncFeedback] = useState(null);
  const [isSyncingLoteLocal, setIsSyncingLoteLocal] = useState(false);

  const [selectedSupId, setSelectedSupId] = useState(
    initialSupId && supervisores.find((s) => s.id === initialSupId)
      ? initialSupId
      : (supervisores[0]?.id || "sup-1")
  );

  useEffect(() => {
    if (initialSupId && supervisores.some((s) => s.id === initialSupId)) {
      setSelectedSupId(initialSupId);
    }
  }, [initialSupId, supervisores]);

  const currentSupervisor = useMemo(() => {
    return supervisores.find((s) => s.id === selectedSupId) || supervisores[0] || SUPERVISORES_OFICIALES[0];
  }, [selectedSupId, supervisores]);

  const [autoSelected] = useState(currentUser?.role === "DOCTOR" && !!initialSupId && supervisores.some((s) => s.id === initialSupId));
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("TODOS");
  const [filterHorario, setFilterHorario] = useState(
    () => currentSupervisor?.activeFranja || "TODOS"
  );
  const [rosterModalOpen, setRosterModalOpen] = useState(false);

  // Fecha seleccionada para la asistencia y la nómina oficial (formato YYYY-MM-DD local)
  const todayISO = useMemo(() => new Date().toLocaleDateString("en-CA"), []);
  const [selectedDate, setSelectedDate] = useState(() => {
    if (quincena?.dias?.some((d) => d.dateKey === todayISO)) {
      return todayISO;
    }
    return quincena?.dias?.[0]?.dateKey || todayISO;
  });

  const [quincenaModalOpen, setQuincenaModalOpen] = useState(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);

  async function handleQuickSyncGoogleSheets() {
    setIsSyncingSheets(true);
    try {
      const res = await syncSupervisorSheets({
        doctorsList: DOCTORES_EXCEL,
        staffList: STAFF_EXCEL,
        supervisoresList: supervisores,
      });

      if (res.success && res.quincena) {
        const targetDate = res.quincena.dias?.some((d) => d.dateKey === todayISO)
          ? todayISO
          : res.quincena.dias?.[0]?.dateKey || todayISO;

        setSelectedDate(targetDate);

        if (onSaveQuincena) {
          onSaveQuincena(res.quincena, targetDate);
        }
        if (onSyncQuincenaDate) {
          onSyncQuincenaDate(targetDate);
        }

        setSyncFeedback(
          `✅ Sincronización exitosa desde Google Sheets: ${res.quincena.dias.length} días actualizados y puestos vinculados (${res.quincena.estadisticas.totalLineasParseadas} turnos para Emerson, Alfredo y Salvador).`
        );
        setTimeout(() => setSyncFeedback(null), 8000);
      } else {
        alert(res.error || "No se pudo sincronizar la información desde Google Sheets.");
      }
    } catch (err) {
      alert("Error al sincronizar con Google Sheets: " + err.message);
    } finally {
      setIsSyncingSheets(false);
    }
  }

  // Asegurar que selectedDate siempre apunte a un día válido de la quincena activa
  useEffect(() => {
    if (quincena?.dias && quincena.dias.length > 0) {
      const exists = quincena.dias.some((d) => d.dateKey === selectedDate);
      if (!exists) {
        const hasToday = quincena.dias.find((d) => d.dateKey === todayISO);
        setSelectedDate(hasToday ? todayISO : quincena.dias[0].dateKey);
      }
    }
  }, [quincena, todayISO, selectedDate]);

  // Sincronizar filterHorario con los horarios reales de la quincena en la fecha seleccionada
  useEffect(() => {
    if (quincena && quincena.dias && selectedDate && currentSupervisor) {
      const diaObj = quincena.dias.find((d) => d.dateKey === selectedDate);
      const supQuincena = diaObj?.porSupervisor?.[currentSupervisor.id];
      if (supQuincena && Array.isArray(supQuincena.doctores) && supQuincena.doctores.length > 0) {
        if (filterHorario !== "TODOS") {
          const hasMatchingDoc = supQuincena.doctores.some(
            (d) => d.horario && isSameHorario(d.horario, filterHorario)
          );
          if (!hasMatchingDoc) {
            setFilterHorario("TODOS");
          }
        }
        return;
      }
    }

    if (currentSupervisor?.activeFranja) {
      setFilterHorario(currentSupervisor.activeFranja);
    } else {
      setFilterHorario("TODOS");
    }
  }, [currentSupervisor?.id, currentSupervisor?.activeFranja, quincena, selectedDate]);

  function handleFilterHorarioChange(newFranja) {
    setFilterHorario(newFranja);
    if (onUpdateSupervisorFranja && currentSupervisor) {
      onUpdateSupervisorFranja(currentSupervisor.id, newFranja !== "TODOS" ? newFranja : null);
    }
  }

  // Nóminas configuradas por supervisor (usar prop si viene de App, o fallback a localStorage)
  const [localRosters, setLocalRosters] = useState(() => {
    try {
      const saved = localStorage.getItem("DOCTORSV_SUPERVISOR_ROSTERS_V2");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const activeRosters = propRosters && typeof propRosters === "object" && Object.keys(propRosters).length > 0
    ? propRosters
    : localRosters;

  // Lista de todas las franjas horarias asignadas al supervisor actual
  const currentSupervisorFranjas = useMemo(() => {
    const list = [];
    const addFranja = (f) => {
      if (!f) return;
      const clean = String(f).trim();
      if (clean && clean !== "TODOS" && !list.some((existing) => isSameHorario(existing, clean))) {
        list.push(clean);
      }
    };

    // 1. Configuración oficial del supervisor (horarios array o horario string separado por '·' o ',')
    if (Array.isArray(currentSupervisor?.horarios) && currentSupervisor.horarios.length > 0) {
      currentSupervisor.horarios.forEach(addFranja);
    } else if (currentSupervisor?.horario) {
      String(currentSupervisor.horario).split(/[·,]/).forEach(addFranja);
    }

    // 2. Lotes diarios en dailyLots para la fecha seleccionada
    if (dailyLots && selectedDate && Array.isArray(dailyLots[selectedDate])) {
      dailyLots[selectedDate].forEach((entry) => {
        const matchesSup = (entry.supervisorId && entry.supervisorId === currentSupervisor?.id) ||
          (entry.supervisorNombre && currentSupervisor?.nombre && isSameDoctor(entry.supervisorNombre, currentSupervisor.nombre));
        if (matchesSup && entry.horario) {
          addFranja(entry.horario);
        }
      });
    }

    // 3. Quincena oficial para la fecha seleccionada
    if (quincena && quincena.dias && selectedDate) {
      const diaObj = quincena.dias.find((d) => d.dateKey === selectedDate);
      const supQuincena = diaObj?.porSupervisor?.[currentSupervisor?.id];
      if (supQuincena && Array.isArray(supQuincena.doctores)) {
        supQuincena.doctores.forEach((d) => {
          if (d.horario) addFranja(d.horario);
        });
      }
    }

    // 4. activeRosters guardados para este supervisor
    if (activeRosters && typeof activeRosters === "object") {
      Object.keys(activeRosters).forEach((key) => {
        if (key.startsWith(`${currentSupervisor?.id}__`)) {
          const parts = key.split("__");
          const franjaPart = parts.length === 3 ? parts[2] : parts[1];
          if (franjaPart && franjaPart !== "undefined" && franjaPart !== "null") {
            addFranja(franjaPart);
          }
        }
      });
    }

    return list;
  }, [currentSupervisor, dailyLots, selectedDate, quincena, activeRosters]);

  // Lotes dinámicos oficiales según fecha seleccionada y franja (hoja RESUMEN SAN MIGUEL)
  const dynamicLots = useMemo(() => {
    return findDailyLotsForSupervisor(
      dailyLots,
      selectedDate,
      currentSupervisor?.id,
      currentSupervisor?.nombre,
      filterHorario
    );
  }, [dailyLots, selectedDate, currentSupervisor, filterHorario]);

  const dynamicLot = dynamicLots.length > 0 ? dynamicLots[0] : null;
  const isMultiLot = dynamicLots.length > 1;

  const activeBloqueInicio = dynamicLot ? Number(dynamicLot.bloqueInicio) : Number(currentSupervisor?.bloqueInicio || 0);
  const activeBloqueFin = dynamicLot ? Number(dynamicLot.bloqueFin) : Number(currentSupervisor?.bloqueFin || 0);

  const activeTotalPuestos = isMultiLot
    ? dynamicLots.reduce((sum, dl) => sum + (Number(dl.totalPuestos) || 0), 0)
    : (activeBloqueInicio === 0 && activeBloqueFin === 0)
      ? 0
      : dynamicLot
        ? Number(dynamicLot.totalPuestos)
        : (currentSupervisor?.totalPuestos ?? (activeBloqueFin - activeBloqueInicio + 1));

  // Espacios del lote del supervisor en el mapa (soporta múltiples bloques si filterHorario es TODOS)
  const supervisorSpaces = useMemo(() => {
    if (isMultiLot) {
      return (spaces || []).filter((s) =>
        dynamicLots.some((dl) => Number(s.id) >= Number(dl.bloqueInicio) && Number(s.id) <= Number(dl.bloqueFin))
      );
    }
    if (!activeBloqueInicio || activeBloqueInicio <= 0 || !activeBloqueFin || activeBloqueFin <= 0) return [];
    return (spaces || []).filter(
      (s) => Number(s.id) >= activeBloqueInicio && Number(s.id) <= activeBloqueFin
    );
  }, [spaces, isMultiLot, dynamicLots, activeBloqueInicio, activeBloqueFin]);

  // Lista de nombres de médicos asignados al supervisor actual (con soporte multi-franja)
  const currentRosterNames = useMemo(() => {
    // 1. PRIORIDAD ABSOLUTA: Quincena Oficial de Google Sheets para esta fecha y supervisor
    if (quincena && quincena.dias && selectedDate) {
      const diaObj = quincena.dias.find((d) => d.dateKey === selectedDate);
      if (diaObj && diaObj.porSupervisor && diaObj.porSupervisor[currentSupervisor?.id]) {
        const supQuincena = diaObj.porSupervisor[currentSupervisor.id];
        const allDocs = Array.isArray(supQuincena.doctores) ? supQuincena.doctores : [];

        // Si se filtró por una franja específica
        if (filterHorario && filterHorario !== "TODOS") {
          return allDocs
            .filter((d) => !d.horario || isSameHorario(d.horario, filterHorario))
            .map((d) => d.nombre);
        }

        // Si es TODOS, devolver exactamente todos los médicos de este supervisor hoy
        return allDocs.map((d) => d.nombre);
      }
    }

    // 2. Si no hay quincena para este día, buscar en overrides o fallbacks
    const dateFranjaKey = filterHorario && filterHorario !== "TODOS" && selectedDate ? `${currentSupervisor?.id}__${selectedDate}__${filterHorario}` : null;
    if (dateFranjaKey && activeRosters[dateFranjaKey] && Array.isArray(activeRosters[dateFranjaKey]) && activeRosters[dateFranjaKey].length > 0) {
      return activeRosters[dateFranjaKey];
    }

    const dateOnlyKey = selectedDate ? `${currentSupervisor?.id}__${selectedDate}` : null;
    if (dateOnlyKey && activeRosters[dateOnlyKey] && Array.isArray(activeRosters[dateOnlyKey]) && activeRosters[dateOnlyKey].length > 0) {
      return activeRosters[dateOnlyKey];
    }

    if (activeRosters[currentSupervisor?.id] && Array.isArray(activeRosters[currentSupervisor.id]) && activeRosters[currentSupervisor.id].length > 0) {
      return activeRosters[currentSupervisor.id];
    }

    const docsInMyLote = (supervisorSpaces || []).filter((s) => s.doctor).map((s) => s.doctor);
    if (docsInMyLote.length > 0) {
      return docsInMyLote;
    }

    const defaultRosters = getDefaultSupervisorRosters(DOCTORES_EXCEL);
    if (filterHorario && filterHorario !== "TODOS") {
      const franjaDefault = defaultRosters[`${currentSupervisor?.id}__${filterHorario}`];
      if (Array.isArray(franjaDefault) && franjaDefault.length > 0) return franjaDefault;
    }
    const supDefault = defaultRosters[currentSupervisor?.id];
    if (Array.isArray(supDefault) && supDefault.length > 0) return supDefault;

    return [];
  }, [quincena, selectedDate, currentSupervisor, filterHorario, activeRosters, supervisorSpaces]);

  function handleSaveSupervisorRoster(newNames, franja = null, transferredDocs = []) {
    const franjaTarget = franja || (filterHorario !== "TODOS" ? filterHorario : null);
    setLocalRosters((prev) => {
      const next = { ...prev, [currentSupervisor.id]: newNames };
      if (franjaTarget) {
        next[`${currentSupervisor.id}__${franjaTarget}`] = newNames;
      }
      try {
        localStorage.setItem("DOCTORSV_SUPERVISOR_ROSTERS_V2", JSON.stringify(next));
      } catch {}
      return next;
    });
    if (onSaveRoster) {
      onSaveRoster(currentSupervisor.id, newNames, franjaTarget, transferredDocs);
    }
  }

  // Estados de Asistencia (conectados en tiempo real con Firestore y localStorage)
  const [localAttendance, setLocalAttendance] = useState(() => {
    try {
      const saved = localStorage.getItem("DOCTORSV_ATTENDANCE_V1");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const effectiveAttendance = propAttendanceRecords || localAttendance;
  function handleSetAttendance(docName, status) {
    if (propOnSetAttendance) {
      propOnSetAttendance(docName, status);
    } else {
      setLocalAttendance((prev) => {
        const next = { ...prev, [docName]: status };
        try {
          localStorage.setItem("DOCTORSV_ATTENDANCE_V1", JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  }

  // Conteo de puestos ocupados en el lote (excluye estaciones reservadas de supervisores 135-139)
  const ocupadosEnMiLote = useMemo(() => {
    const isSupStation = (sid) => [135, 136, 137, 138, 139].includes(Number(sid));
    return supervisorSpaces.filter((s) => (s.estado === "OCUPADO" || Boolean(s.doctor)) && !isSupStation(s.id)).length;
  }, [supervisorSpaces]);

  // Mapas de búsqueda O(1) de alta velocidad (sin bucles anidados lentos)
  const doctorsMap = useMemo(() => {
    const map = new Map();
    DOCTORES_EXCEL.forEach((d) => {
      if (d.nombre) {
        map.set(d.nombre.toLowerCase().trim(), d);
        const norm = normalizeDocName(d.nombre);
        if (norm) map.set(norm, d);
      }
    });
    return map;
  }, []);

  const spacesByDoctor = useMemo(() => {
    const map = new Map();
    (spaces || []).forEach((s) => {
      if (s.doctor) {
        map.set(String(s.doctor).toLowerCase().trim(), s);
        const norm = normalizeDocName(s.doctor);
        if (norm) map.set(norm, s);
      }
    });
    return map;
  }, [spaces]);

  const attendanceMap = useMemo(() => {
    const map = new Map();
    if (!effectiveAttendance) return map;
    for (const [key, status] of Object.entries(effectiveAttendance)) {
      if (!key) continue;
      map.set(key, status);
      map.set(String(key).toLowerCase().trim(), status);
      const norm = normalizeDocName(key);
      if (norm) map.set(norm, status);
    }
    return map;
  }, [effectiveAttendance]);

  // Lista consolidada de médicos para el lote del supervisor (Cálculo instantáneo en <1ms)
  const batchDoctors = useMemo(() => {
    const list = [];
    const addedNames = new Set();

    function getStatusForDoctor(docName) {
      if (!docName) return null;
      const clean = String(docName).toLowerCase().trim();
      const direct = attendanceMap.get(clean) || attendanceMap.get(docName);
      if (direct) return direct;
      const norm = normalizeDocName(docName);
      return attendanceMap.get(norm) || null;
    }

    function getSpaceForDoctor(docName) {
      if (!docName) return null;
      const clean = String(docName).toLowerCase().trim();
      const direct = spacesByDoctor.get(clean) || spacesByDoctor.get(docName);
      if (direct) return direct;
      const norm = normalizeDocName(docName);
      return spacesByDoctor.get(norm) || null;
    }

    function getDocObj(docName) {
      if (!docName) return null;
      const clean = String(docName).toLowerCase().trim();
      const direct = doctorsMap.get(clean) || doctorsMap.get(docName);
      if (direct) return direct;
      const norm = normalizeDocName(docName);
      return doctorsMap.get(norm) || null;
    }

    // 1. Médicos configurados en la nómina del turno
    currentRosterNames.forEach((name) => {
      const cleanName = String(name || "").toLowerCase().trim();
      const normName = normalizeDocName(name);
      if (!cleanName) return;

      const docObj = getDocObj(name) || {
        id: "EXT",
        nombre: name,
        tipo: "Planilla",
        correo: "",
        jvpm: "",
      };

      // Buscar si algún puesto tiene a este médico asignado O(1)
      const spaceAssigned = getSpaceForDoctor(name) || (docObj.nombre ? getSpaceForDoctor(docObj.nombre) : null);

      // Estado explícito marcado por el supervisor O(1)
      const explicitStatus = getStatusForDoctor(name) || (docObj.nombre ? getStatusForDoctor(docObj.nombre) : null);

      let status = "PENDIENTE";
      let assignedSpaceId = spaceAssigned ? Number(spaceAssigned.id) : null;
      const isSpaceInThisLote = assignedSpaceId &&
        (isMultiLot
          ? dynamicLots.some((dl) => assignedSpaceId >= Number(dl.bloqueInicio) && assignedSpaceId <= Number(dl.bloqueFin))
          : (activeBloqueInicio > 0 && assignedSpaceId >= activeBloqueInicio && assignedSpaceId <= activeBloqueFin));

      if (explicitStatus === "AUSENTE") {
        status = "AUSENTE";
        assignedSpaceId = null;
      } else if (explicitStatus === "FINALIZADO") {
        status = "FINALIZADO";
        assignedSpaceId = null;
      } else if (explicitStatus === "JUSTIFICADO") {
        status = "JUSTIFICADO";
        assignedSpaceId = null;
      } else if (explicitStatus === "PRESENTE") {
        status = "PRESENTE";
      } else if (spaceAssigned) {
        status = "PRESENTE";
      }

      // Determinar la franja horaria real del médico de forma inteligente
      let doctorShift = spaceAssigned?.horario || null;
      if (!doctorShift && filterHorario && filterHorario !== "TODOS") {
        doctorShift = filterHorario;
      }
      if (!doctorShift && quincena && quincena.dias && selectedDate) {
        const diaObj = quincena.dias.find((d) => d.dateKey === selectedDate);
        const supQuincena = diaObj?.porSupervisor?.[currentSupervisor.id];
        const matchInQ = supQuincena?.doctores?.find((qd) => isSameDoctor(qd.nombre, name));
        if (matchInQ?.horario) {
          doctorShift = matchInQ.horario;
        }
      }
      if (!doctorShift) {
        for (const shift of currentSupervisorFranjas) {
          const dateShiftKey = selectedDate ? `${currentSupervisor.id}__${selectedDate}__${shift}` : null;
          const shiftKey = `${currentSupervisor.id}__${shift}`;
          if ((dateShiftKey && activeRosters[dateShiftKey]?.includes(name)) ||
              (activeRosters[shiftKey]?.includes(name))) {
            doctorShift = shift;
            break;
          }
        }
      }
      if (!doctorShift) {
        doctorShift = (docObj.horario && docObj.horario !== "Turno Rotativo")
          ? docObj.horario
          : (currentSupervisor.activeFranja || currentSupervisor.horarios?.[0] || currentSupervisor.horario);
      }

      list.push({
        id: docObj.id,
        nombre: docObj.nombre,
        correo: docObj.correo || "",
        jvpm: docObj.jvpm || "",
        tipo: docObj.tipo || "Planilla",
        horario: doctorShift,
        status,
        espacio: assignedSpaceId,
        enMiLote: isSpaceInThisLote,
      });
      addedNames.add(cleanName);
      if (normName) addedNames.add(normName);
      if (docObj.nombre) {
        addedNames.add(String(docObj.nombre).toLowerCase().trim());
        const normObj = normalizeDocName(docObj.nombre);
        if (normObj) addedNames.add(normObj);
      }
    });

    // 2. Solo si NO hay quincena activa para este supervisor hoy, incluir médicos físicos o de asistencia
    const hasQuincenaData = Boolean(
      quincena?.dias?.some(
        (d) => d.dateKey === selectedDate && d.porSupervisor && d.porSupervisor[currentSupervisor?.id]
      )
    );

    if (!hasQuincenaData) {
      // 2. Incluir cualquier médico sentado físicamente en este lote O(1)
      (supervisorSpaces || []).forEach((s) => {
      if (s.doctor) {
        const cleanDocName = String(s.doctor).toLowerCase().trim();
        const normDocName = normalizeDocName(s.doctor);
        if (!addedNames.has(cleanDocName) && !addedNames.has(normDocName)) {
          const docObj = getDocObj(s.doctor);
          const explicitStatus = getStatusForDoctor(s.doctor);

          let status = "PRESENTE";
          let assignedSpaceId = Number(s.id);
          if (explicitStatus === "AUSENTE") {
            status = "AUSENTE";
            assignedSpaceId = null;
          } else if (explicitStatus === "FINALIZADO") {
            status = "FINALIZADO";
            assignedSpaceId = null;
          } else if (explicitStatus === "JUSTIFICADO") {
            status = "JUSTIFICADO";
            assignedSpaceId = null;
          }

          list.push({
            id: docObj?.id || "EXT",
            nombre: s.doctor,
            correo: docObj?.correo || "",
            jvpm: docObj?.jvpm || "",
            tipo: docObj?.tipo || "Planilla",
            horario: s.horario || (filterHorario !== "TODOS" ? filterHorario : currentSupervisor.horario),
            status,
            espacio: assignedSpaceId,
            enMiLote: true,
            externoAlLote: false,
          });
          addedNames.add(cleanDocName);
          if (normDocName) addedNames.add(normDocName);
          if (docObj?.nombre) {
            addedNames.add(String(docObj.nombre).toLowerCase().trim());
            const normObj = normalizeDocName(docObj.nombre);
            if (normObj) addedNames.add(normObj);
          }
        }
      }
    });

    // 3. Incluir médicos con registro de asistencia que están FÍSICAMENTE en este lote del supervisor
    Object.keys(effectiveAttendance || {}).forEach((name) => {
      const cleanName = String(name || "").toLowerCase().trim();
      const normName = normalizeDocName(name);
      if (!cleanName || addedNames.has(cleanName) || addedNames.has(normName)) return;

      const recordStatus = effectiveAttendance[name];
      if (!recordStatus) return;

      const spaceAssigned = getSpaceForDoctor(name);

      // Solo incluir si el médico tiene un cubículo asignado EN ESTE lote
      if (!spaceAssigned || activeBloqueInicio <= 0) return;
      const isSpaceInThisLote = Number(spaceAssigned.id) >= activeBloqueInicio &&
                                Number(spaceAssigned.id) <= activeBloqueFin;
      if (!isSpaceInThisLote) return;

      const docObj = getDocObj(name);

      let status = recordStatus;
      let assignedSpaceId = Number(spaceAssigned.id);
      if (recordStatus === "AUSENTE" || recordStatus === "FINALIZADO" || recordStatus === "JUSTIFICADO") {
        assignedSpaceId = null;
      } else if (spaceAssigned) {
        status = "PRESENTE";
      }

      list.push({
        id: docObj?.id || "EXT",
        nombre: docObj?.nombre || name,
        correo: docObj?.correo || "",
        jvpm: docObj?.jvpm || "",
        tipo: docObj?.tipo || "Planilla",
        horario: spaceAssigned.horario || (filterHorario !== "TODOS" ? filterHorario : currentSupervisor.horario),
        status,
        espacio: assignedSpaceId,
        enMiLote: true,
        externoAlLote: false,
      });
      addedNames.add(cleanName);
      if (normName) addedNames.add(normName);
      if (docObj?.nombre) {
        addedNames.add(String(docObj.nombre).toLowerCase().trim());
        const normObj = normalizeDocName(docObj.nombre);
        if (normObj) addedNames.add(normObj);
      }
    });
    }

    return list;
  }, [currentRosterNames, doctorsMap, spacesByDoctor, attendanceMap, currentSupervisor, supervisorSpaces, filterHorario, quincena, selectedDate]);

  // Médicos filtrados
  const filteredBatch = useMemo(() => {
    return batchDoctors.filter((d) => {
      const matchesSearch =
        d.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(d.id).includes(searchQuery) ||
        (d.correo && d.correo.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (d.espacio && String(d.espacio).includes(searchQuery));

      let matchesStatus = true;
      if (filterStatus === "TODOS") {
        matchesStatus = true;
      } else if (filterStatus === "SIN_PUESTO") {
        // Médicos pendientes o presentes que todavía no tienen cubículo asignado en este lote (NUNCA ausentes)
        matchesStatus = (d.status === "PENDIENTE" && (!d.espacio || !d.enMiLote)) || (d.status === "PRESENTE" && (!d.espacio || !d.enMiLote));
      } else {
        matchesStatus = d.status === filterStatus;
      }

      const matchesHorario =
        filterHorario === "TODOS" ||
        (d.horario && isSameHorario(d.horario, filterHorario));
      return matchesSearch && matchesStatus && matchesHorario;
    });
  }, [batchDoctors, searchQuery, filterStatus, filterHorario]);

  // Búsqueda inteligente de médicos en otras nóminas o en el padrón para alertar al supervisor
  const externalSearchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return [];
    const q = searchQuery.toLowerCase().trim();
    const batchNames = new Set(batchDoctors.map((d) => d.nombre.toLowerCase().trim()));

    return DOCTORES_EXCEL.filter((d) => {
      if (batchNames.has(d.nombre.toLowerCase().trim())) return false;
      return (
        d.nombre.toLowerCase().includes(q) ||
        (d.correo && d.correo.toLowerCase().includes(q)) ||
        (d.jvpm && d.jvpm.toLowerCase().includes(q)) ||
        String(d.id).includes(q)
      );
    })
      .slice(0, 4)
      .map((d) => {
        const supInfo = getDoctorSupervisorInfo({
          docName: d.nombre,
          rosters: activeRosters,
          supervisores,
          spaces,
          filterHorario: filterHorario !== "TODOS" ? filterHorario : null,
        });
        return { ...d, supInfo };
      });
  }, [searchQuery, batchDoctors, activeRosters, supervisores, spaces, filterHorario]);

  // Metrics reales y consistentes
  const totalProgramados = batchDoctors.length;
  const totalPresentes = batchDoctors.filter((d) => d.status === "PRESENTE").length;
  const totalFinalizados = batchDoctors.filter((d) => d.status === "FINALIZADO").length;
  const totalConPuesto = batchDoctors.filter((d) => d.espacio !== null && d.status === "PRESENTE" && d.enMiLote).length;
  const totalSinPuesto = batchDoctors.filter(
    (d) => (d.status === "PENDIENTE" && (!d.espacio || !d.enMiLote)) || (d.status === "PRESENTE" && (!d.espacio || !d.enMiLote))
  ).length;
  const totalAusentes = batchDoctors.filter((d) => d.status === "AUSENTE").length;
  const totalJustificados = batchDoctors.filter((d) => d.status === "JUSTIFICADO").length;

  const totalAsistieron = totalPresentes + totalFinalizados;
  const asistenciaPct = totalProgramados > 0 ? Math.round((totalAsistieron / totalProgramados) * 100) : 0;
  const inasistenciaPct = totalProgramados > 0 ? Math.round((totalAusentes / totalProgramados) * 100) : 0;
  const puestosLibresLote = supervisorSpaces.filter((s) => !s.doctor && s.estado !== "INHABILITADO").length;

  // Médicos que figuran como PRESENTE pero no tienen cubículo asignado (remanentes sin puesto)
  const unseatedPresent = batchDoctors.filter(
    (d) => d.status === "PRESENTE" && (!d.espacio || !d.enMiLote)
  );

  // Finalizar con 1 clic a todos los médicos presentes que no tienen puesto asignado
  function handleFinalizeUnseatedPresent() {
    if (unseatedPresent.length === 0) {
      alert("No hay médicos presentes pendientes de puesto o remanentes.");
      return;
    }
    if (
      window.confirm(
        `¿Deseas marcar la Salida (FINALIZADO) de los ${unseatedPresent.length} médico(s) remanentes sin puesto?\n\nEsto limpiará la lista de presentes para el siguiente turno.`
      )
    ) {
      unseatedPresent.forEach((d) => {
        handleSetAttendance(d.nombre, "FINALIZADO");
        const seatedSpace = (spaces || []).find((s) => s.doctor && isSameDoctor(s.doctor, d.nombre));
        if (seatedSpace && onUnassignDoctor) {
          onUnassignDoctor(d.nombre, Number(seatedSpace.id));
        }
      });
    }
  }

  // Marcar como AUSENTE a todos los médicos que figuran como faltantes / sin puesto
  function handleMarkUnseatedAsAbsent() {
    const unseatedDocs = batchDoctors.filter(
      (d) =>
        (d.status === "PENDIENTE" && (!d.espacio || !d.enMiLote)) ||
        (d.status === "PRESENTE" && (!d.espacio || !d.enMiLote))
    );
    if (unseatedDocs.length === 0) {
      alert("No hay médicos faltantes sin puesto para marcar como ausentes.");
      return;
    }
    if (
      !window.confirm(
        `¿Deseas marcar como AUSENTES a los ${unseatedDocs.length} médico(s) faltantes que no tienen cubículo asignado?`
      )
    ) {
      return;
    }
    unseatedDocs.forEach((d) => {
      handleSetAttendance(d.nombre, "AUSENTE");
      if (onUnassignDoctor && d.espacio) {
        onUnassignDoctor(d.nombre, d.espacio);
      }
    });
  }

  // Estado para el modal de asignación manual de puesto
  const [manualAssignDoc, setManualAssignDoc] = useState(null);
  const [targetSpaceId, setTargetSpaceId] = useState("");
  const [targetHorario, setTargetHorario] = useState("");

  function openManualAssign(doc) {
    setManualAssignDoc(doc);
    const freeSpaces = supervisorSpaces.filter((s) => !s.doctor && s.estado !== "INHABILITADO");
    setTargetSpaceId(freeSpaces.length > 0 ? String(freeSpaces[0].id) : "");
    setTargetHorario(
      filterHorario !== "TODOS" ? filterHorario : (currentSupervisor.activeFranja || currentSupervisor.horario)
    );
  }

  function handleConfirmManualAssign(e) {
    if (e) e.preventDefault();
    if (!manualAssignDoc || !targetSpaceId) {
      alert("Por favor selecciona o escribe el número de puesto.");
      return;
    }
    const spaceNum = Number(targetSpaceId);
    if (isNaN(spaceNum) || spaceNum < 1 || spaceNum > 170) {
      alert("El número de puesto debe estar entre 1 y 170.");
      return;
    }

    const existingSpace = (spaces || []).find((s) => Number(s.id) === spaceNum);
    if (existingSpace && existingSpace.doctor && !isSameDoctor(existingSpace.doctor, manualAssignDoc.nombre)) {
      if (!window.confirm(`El puesto #${spaceNum} ya está ocupado por ${existingSpace.doctor}. ¿Deseas reasignarlo a ${manualAssignDoc.nombre}?`)) {
        return;
      }
    }

    const shiftToAssign = targetHorario || (currentSupervisor.activeFranja || currentSupervisor.horario);
    onAssignDoctor(manualAssignDoc.nombre, spaceNum, shiftToAssign);
    handleSetAttendance(manualAssignDoc.nombre, "PRESENTE");
    setManualAssignDoc(null);
    setTargetSpaceId("");
  }

  function handleQuickAssign(docName) {
    const firstFreeSpace = supervisorSpaces.find((s) => (!s.doctor || s.estado === "DISPONIBLE") && s.estado !== "INHABILITADO") ||
      (spaces || []).find((s) => (!s.doctor || s.estado === "DISPONIBLE") && s.estado !== "INHABILITADO");

    if (!firstFreeSpace) {
      alert("No hay puestos disponibles en este bloque. Por favor revisa el mapa.");
      return;
    }

    const docObj = batchDoctors.find((d) => isSameDoctor(d.nombre, docName));
    const shiftToAssign = docObj?.horario || currentSupervisor.horario;
    onAssignDoctor(docName, Number(firstFreeSpace.id), shiftToAssign);
    handleSetAttendance(docName, "PRESENTE");
  }

  // Asignar en lote automáticamente a todos los médicos programados que no tienen puesto
  function handleBatchAssignRoster() {
    const unseated = batchDoctors.filter((d) => !d.espacio && d.status !== "AUSENTE");
    if (unseated.length === 0) {
      alert("Todos los médicos de tu nómina ya tienen cubículo asignado.");
      return;
    }

    const availableInBatch = supervisorSpaces.filter((s) => !s.doctor && s.estado !== "INHABILITADO");
    if (availableInBatch.length === 0) {
      alert(`No hay cubículos disponibles en tu lote.`);
      return;
    }

    const countToAssign = Math.min(unseated.length, availableInBatch.length);
    if (!window.confirm(`¿Deseas auto-asignar ${countToAssign} médico(s) a los puestos libres de tu lote?`)) {
      return;
    }

    const assignments = [];
    for (let i = 0; i < countToAssign; i++) {
      assignments.push({
        doctor: unseated[i].nombre,
        spaceId: Number(availableInBatch[i].id),
        horario: unseated[i].horario || currentSupervisor.horario,
      });
    }

    if (onAssignBatch) {
      onAssignBatch(assignments, currentSupervisor.horario);
    } else {
      for (let i = 0; i < assignments.length; i++) {
        onAssignDoctor(assignments[i].doctor, assignments[i].spaceId, assignments[i].horario || currentSupervisor.horario);
        handleSetAttendance(assignments[i].doctor, "PRESENTE");
      }
    }

    setSyncFeedback(`⚡ Auto-asignación exitosa: ${countToAssign} médico(s) ubicados y sincronizados con Google Sheets`);
    setTimeout(() => setSyncFeedback(null), 6000);
    alert(`✅ ¡Auto-asignación completada y sincronizada!\n\nSe ubicaron ${countToAssign} médicos en sus cubículos asignados, se marcaron como PRESENTES y se sincronizaron con Google Sheets y la nube.`);
  }

  // Sincronización manual en 1 clic del lote completo con Google Sheets
  async function handleTriggerSyncLote() {
    setIsSyncingLoteLocal(true);
    setSyncFeedback(null);
    try {
      if (onSyncLote) {
        const res = await onSyncLote(currentSupervisor?.id, activeBloqueInicio, activeBloqueFin);
        if (res?.success) {
          setSyncFeedback(`✅ Sincronizados ${res.count || supervisorSpaces.length} puestos del lote (#${activeBloqueInicio}-#${activeBloqueFin}) con Google Sheets`);
        } else {
          setSyncFeedback("✅ Lote sincronizado con Google Sheets");
        }
      } else if (onSync) {
        await onSync();
        setSyncFeedback("✅ Puestos sincronizados con Google Sheets");
      }
    } catch (err) {
      setSyncFeedback("⚠️ Aviso al sincronizar lote: " + (err.message || "reintenta"));
    } finally {
      setIsSyncingLoteLocal(false);
      setTimeout(() => setSyncFeedback(null), 6000);
    }
  }

  function handleCopyReport() {
    const horarioLabel = filterHorario !== "TODOS" ? filterHorario : currentSupervisor.horario;
    const reportText = `📊 REPORTE DE ASISTENCIA Y OCUPACIÓN · DOCTORSV\n` +
      `Supervisor: ${currentSupervisor.nombre}\n` +
      `Turno / Franja Horaria: ${horarioLabel}\n` +
      `Bloque de Puestos Asignados: ${activeBloqueInicio === 0 ? "Sin lote asignado (No asiste hoy)" : `Puestos #${activeBloqueInicio} al #${activeBloqueFin} (${activeTotalPuestos} puestos)`}${dynamicLot ? ` [Resumen SM - ${dynamicLot.grupo}]` : ""}\n` +
      `------------------------------------\n` +
      `Total Programados: ${totalProgramados}${filterHorario !== "TODOS" ? ` (filtrado por ${filterHorario})` : ""}\n` +
      `Total Presentes: ${totalPresentes} (${asistenciaPct}%)\n` +
      `Total Ausentes / Inasistencia: ${totalAusentes} (${inasistenciaPct}%)\n` +
      `Puestos Ocupados con Médico: ${totalConPuesto}\n` +
      `Puestos Libres en Bloque: ${puestosLibresLote}\n` +
      `Fecha y Hora: ${new Date().toLocaleString("es-SV")}`;

    navigator.clipboard.writeText(reportText);
    alert("✅ Reporte copiado al portapapeles. Listo para pegar en Google Sheets, correo o WhatsApp.");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Banner de Auto Check-In de Médicos */}
      <div className="relative overflow-hidden rounded-3xl p-6 text-white shadow-md flex flex-wrap items-center justify-between gap-4"
        style={{ background: "linear-gradient(135deg, #003487 0%, #0048B5 60%, #0095FF 100%)" }}
      >
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md shadow-inner text-white shrink-0">
            <Sparkles size={24} />
          </span>
          <div>
            <h2 className="font-heading text-lg sm:text-xl font-extrabold tracking-tight">
              Auto Check-In & Mapeo Ágil de Puestos
            </h2>
            <p className="text-[12.5px] text-white/80 max-w-xl">
              Los médicos pueden auto-registrarse al sentarse en su cubículo. La asistencia y el puesto se sincronizan automáticamente en tiempo real.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenLiveReport && (
            <button
              onClick={onOpenLiveReport}
              className="flex items-center gap-2 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/30 text-white px-4 py-2.5 text-[13px] font-extrabold shadow-sm transition-all active:scale-95 backdrop-blur-md"
            >
              <FileSpreadsheet size={16} />
              <span>Ver Reporte en Vivo</span>
            </button>
          )}

          <button
            onClick={() => {
              const activeTarget = filterHorario !== "TODOS"
                ? filterHorario
                : (currentSupervisor?.activeFranja || currentSupervisor?.horario);
              if (onOpenCheckIn) onOpenCheckIn(activeTarget);
            }}
            className="flex items-center gap-2 rounded-2xl bg-white text-[#0048B5] px-5 py-2.5 text-[13px] font-extrabold shadow-md hover:bg-slate-50 transition-all hover:scale-105 active:scale-95"
          >
            <CheckCircle2 size={16} />
            <span>Abrir Auto Check-In</span>
          </button>
        </div>
      </div>

      {/* Banner informativo cuando el supervisor fue auto-seleccionado desde el login del doctor */}
      {autoSelected && (
        <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-[12.5px] text-blue-800 shadow-2xs">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#0048B5] text-white">
            <UserCheck size={15} />
          </span>
          <div>
            <span className="font-bold">Vista auto-ajustada al último doctor logueado.</span>
            <span className="ml-1 text-blue-600">
              El lote mostrado corresponde al supervisor que el médico seleccionó al ingresar.
            </span>
          </div>
        </div>
      )}

      {/* Barra de Nómina Quincenal Oficial (Servicios Profesionales) */}
      <div className="bg-white p-4.5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-[#0048B5] border border-blue-200 shrink-0">
              <Calendar size={18} />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[13.5px] font-black text-slate-900 tracking-tight">
                  Nómina Quincenal Oficial (Servicios Profesionales)
                </h3>
                <span className="text-[10.5px] font-bold px-2 py-0.2 rounded-full bg-blue-100 text-[#0048B5] font-mono">
                  {quincena?.titulo || "Septiembre 2026"}
                </span>
                {selectedDate && (
                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Fecha activa: {quincena?.dias?.find((d) => d.dateKey === selectedDate)?.label || selectedDate}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                La nómina del supervisor cambia automáticamente según el día seleccionado. Puedes ver o importar los 15 días completos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleQuickSyncGoogleSheets}
              disabled={isSyncingSheets}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-800 border border-emerald-300 text-[11.5px] font-extrabold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
              title="Sincronizar las 3 hojas de Google Sheets de Emerson, Alfredo y Salvador"
            >
              <RefreshCw size={13} className={isSyncingSheets ? "animate-spin text-emerald-600" : "text-emerald-600"} />
              <span>{isSyncingSheets ? "Sincronizando Sheets..." : "Sincronizar Sheets"}</span>
            </button>

            <button
              type="button"
              onClick={() => setQuincenaModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-[#0048B5] border border-blue-200 text-[11.5px] font-extrabold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet size={14} className="text-blue-600" />
              <span>Gestor Quincenal / Hojas</span>
            </button>
          </div>
        </div>

        {/* Tira interactiva de días de la quincena */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin pt-1">
          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Días:
          </span>
          {(quincena?.dias || []).map((dia) => {
            const isSelected = dia.dateKey === selectedDate;
            const isToday = dia.dateKey === todayISO;
            const supAssigned = dia.porSupervisor?.[currentSupervisor.id];
            const countForCurrentSup = supAssigned?.totalDoctores || 0;

            return (
              <button
                key={dia.dateKey}
                type="button"
                onClick={() => {
                  setSelectedDate(dia.dateKey);
                  if (onSyncQuincenaDate) {
                    onSyncQuincenaDate(dia.dateKey);
                  }
                }}
                className={`shrink-0 px-3 py-1.5 rounded-xl border text-left transition-all relative flex items-center gap-2 ${
                  isSelected
                    ? "bg-[#0048B5] text-white border-[#0048B5] shadow-xs ring-2 ring-blue-500/20"
                    : "bg-slate-50 hover:bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex flex-col">
                  <span className={`text-[11.5px] font-extrabold leading-tight ${isSelected ? "text-white" : "text-slate-800"}`}>
                    {dia.label?.split(" ")[0]} {dia.label?.split(" ")[1]}
                    {isToday && <span className="ml-1 text-[8.5px] px-1 py-0.2 rounded bg-amber-400 text-amber-950 font-black">HOY</span>}
                  </span>
                  <span className={`text-[9.5px] font-medium ${isSelected ? "text-blue-200" : "text-slate-400"}`}>
                    {dia.diaSemana?.slice(0, 3)}
                  </span>
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                  isSelected ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-700"
                }`}>
                  {countForCurrentSup}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Banner de Sincronización de Lote en Vivo */}
      {syncFeedback && (
        <div className="w-full rounded-2xl bg-emerald-50 border border-emerald-300 p-3.5 text-[12.5px] font-bold text-emerald-950 flex items-center justify-between shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
          <button
            onClick={() => setSyncFeedback(null)}
            className="text-slate-400 hover:text-slate-700 text-sm font-black cursor-pointer px-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Selector de Supervisor & Lote + Filtro de Franja Horaria */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-start gap-3">
          {/* Supervisor */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Supervisor a Cargo
            </label>
            <select
              value={selectedSupId}
              onChange={(e) => setSelectedSupId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#0095FF]/40 cursor-pointer shadow-2xs"
            >
              {supervisores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} · Puesto #{s.puesto} ({s.totalPuestos || (s.bloqueFin - s.bloqueInicio + 1)} médicos)
                </option>
              ))}
            </select>
          </div>

          {/* Franja Horaria */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Franja Horaria
            </label>
            <select
              value={filterHorario}
              onChange={(e) => handleFilterHorarioChange(e.target.value)}
              className={`rounded-xl border px-3.5 py-2 text-[13px] font-bold outline-none focus:ring-2 focus:ring-[#0095FF]/40 cursor-pointer shadow-2xs transition-all ${
                filterHorario !== "TODOS"
                  ? "border-[#0048B5] bg-blue-50 text-[#0048B5]"
                  : "border-slate-200 bg-slate-50 text-slate-800"
              }`}
            >
              <option value="TODOS">Todas las franjas</option>
              {(() => {
                const shiftList = [...(horarios || HORARIOS)];
                (spaces || []).forEach((s) => {
                  if (s.doctor && s.horario && !shiftList.some((h) => isSameHorario(h, s.horario))) {
                    shiftList.push(s.horario);
                  }
                });
                return shiftList.map((h) => {
                  const occupiedCount = (spaces || []).filter((s) => s.doctor && isSameHorario(s.horario, h)).length;
                  return (
                    <option key={h} value={h}>
                      {h} {occupiedCount > 0 ? `(${occupiedCount} en turno)` : ""}
                    </option>
                  );
                });
              })()}
            </select>
          </div>

          <div className="border-l border-slate-200 pl-3">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Estación Física del Supervisor
            </span>
            <div className="flex items-center gap-1.5 font-mono-data text-[13px] font-bold text-sky-700 bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-200">
              {Number(currentSupervisor.puesto) > 0 ? (
                <span>🔒 Puesto #{currentSupervisor.puesto}</span>
              ) : (
                <span className="text-slate-500 font-semibold text-[12px]">⚪ Sin Estación Física</span>
              )}
            </div>
          </div>

          <div className="border-l border-slate-200 pl-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Lote Asignado {dynamicLot ? "del Día" : "por Central"}
                </span>
                {dynamicLot && (
                  <span className="bg-emerald-100 text-emerald-800 text-[9.5px] font-bold px-1.5 py-0.2 rounded-md font-mono" title={`Resumen San Miguel: ${dynamicLot.grupo} · ${dynamicLot.horario}`}>
                    Resumen SM
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {onOpenDailyLots && (
                  <button
                    type="button"
                    onClick={onOpenDailyLots}
                    className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg border border-indigo-200 transition-colors flex items-center gap-1"
                    title="Ver y editar la distribución diaria de puestos (Resumen San Miguel)"
                  >
                    <FileSpreadsheet size={10} />
                    <span>Resumen SM</span>
                  </button>
                )}
                {isMaster && onOpenSupervisorConfig && (
                  <button
                    type="button"
                    onClick={onOpenSupervisorConfig}
                    className="text-[10px] font-bold text-[#0048B5] hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg border border-blue-200 transition-colors flex items-center gap-1"
                    title="Configurar puestos, ubicación y turno oficial base de este supervisor"
                  >
                    <Settings2 size={10} />
                    <span>Lote Base</span>
                  </button>
                )}
              </div>
            </div>
            {isMultiLot ? (
              <div className="flex items-center gap-1.5 font-mono-data text-[12.5px] font-bold text-[#0048B5] bg-blue-50/80 px-3 py-1.5 rounded-xl border border-blue-200">
                <MapPin size={14} className="text-emerald-600" />
                <span>
                  {dynamicLots.map((dl) => `#${dl.bloqueInicio}-#${dl.bloqueFin}`).join(" y ")}
                </span>
                <span className="text-[10.5px] font-normal text-slate-500">
                  ({activeTotalPuestos} puestos en {dynamicLots.length} lotes)
                </span>
              </div>
            ) : activeBloqueInicio === 0 ? (
              <div className="flex items-center gap-1.5 font-mono-data text-[13px] font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                <MapPin size={14} className="text-amber-600" />
                <span>Sin Lote Asignado Hoy</span>
                <span className="text-[10.5px] font-normal text-amber-700">
                  (0 puestos)
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 font-mono-data text-[13px] font-bold text-[#0048B5] bg-blue-50/80 px-3 py-1.5 rounded-xl border border-blue-200">
                <MapPin size={14} className={dynamicLot ? "text-emerald-600" : "text-[#0048B5]"} />
                <span>Puestos #{activeBloqueInicio} al #{activeBloqueFin}</span>
                <span className="text-[10.5px] font-normal text-slate-500">
                  ({activeTotalPuestos} puestos)
                </span>
              </div>
            )}
          </div>

          <div className="border-l border-slate-200 pl-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Turno Oficial
              </span>
              {isMaster && (
                <span className="text-[9.5px] font-bold text-[#0048B5] bg-blue-50 border border-blue-200 rounded px-1.5 py-0.2">
                  Editable Master
                </span>
              )}
            </div>
            {isMaster ? (
              <div className="relative">
                <select
                  value={currentSupervisor.horario || ""}
                  onChange={(e) => {
                    if (onUpdateSupervisorOfficialShift) {
                      onUpdateSupervisorOfficialShift(currentSupervisor.id, e.target.value);
                    }
                  }}
                  className="appearance-none font-mono-data text-[12px] font-bold text-[#0048B5] bg-blue-50/90 hover:bg-blue-100/90 border border-blue-300 rounded-xl pl-8 pr-7 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0048B5] transition-all shadow-sm"
                  title="Cambiar turno oficial asignado a este supervisor (Doctor Master)"
                >
                  {horarios.map((h) => (
                    <option key={h} value={h} className="text-slate-800 font-sans">
                      {h}
                    </option>
                  ))}
                </select>
                <Clock size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0048B5] pointer-events-none" />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#0048B5] text-[10px]">
                  ▼
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 font-mono-data text-[12px] font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl">
                <Clock size={14} className="text-amber-600" />
                <span>
                  {currentSupervisorFranjas.length > 1
                    ? currentSupervisorFranjas.join(" · ")
                    : (currentSupervisor.horario || "Sin turno asignado")}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {/* Badge de filtros activos */}
          {filterHorario !== "TODOS" && (
            <div className="flex items-center gap-1.5 rounded-xl bg-blue-50 border border-blue-200 px-3 py-1.5 text-[11.5px] font-bold text-[#0048B5]">
              <Filter size={12} />
              <span>Franja: {filterHorario}</span>
              <button
                onClick={() => handleFilterHorarioChange("TODOS")}
                className="ml-1 text-slate-400 hover:text-rose-500 font-black text-[13px] leading-none"
                title="Limpiar filtro de franja"
              >
                ×
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Botón Maestro/Supervisor: Liberar Mi Lote y Remanentes */}
            {onReleaseLote && activeBloqueInicio > 0 && (ocupadosEnMiLote > 0 || totalPresentes > 0) && (
              <button
                type="button"
                onClick={() =>
                  onReleaseLote(
                    activeBloqueInicio,
                    activeBloqueFin,
                    currentSupervisor.nombre,
                    currentSupervisor.id,
                    batchDoctors.map((d) => d.nombre)
                  )
                }
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
                title={
                  ocupadosEnMiLote > 0
                    ? `Liberar todos los ${ocupadosEnMiLote} cubículos ocupados en el lote (#${activeBloqueInicio} al #${activeBloqueFin}) y finalizar asistencia`
                    : `Finalizar jornada de los ${totalPresentes} médicos presentes remanentes en este turno`
                }
              >
                <RefreshCw size={13} />
                <span>
                  {ocupadosEnMiLote > 0
                    ? `Liberar Mi Lote (${ocupadosEnMiLote})`
                    : `Liberar Remanentes (${totalPresentes})`}
                </span>
              </button>
            )}

            {/* Botón Liberar Franja */}
            {onReleaseByHorario && (() => {
              const franjaTarget = filterHorario !== "TODOS" ? filterHorario : currentSupervisor.horario;
              const isSup = (s) => [135, 136, 137, 138, 139].includes(Number(s.id)) || s.categoria === "Supervisores";
              const ocupadosEnFranja = spaces.filter((s) => (s.estado === "OCUPADO" || Boolean(s.doctor)) && !isSup(s) && isSameHorario(s.horario, franjaTarget)).length;
              return ocupadosEnFranja > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(
                      `¿Liberar totalmente los ${ocupadosEnFranja} puesto(s) asignados en la franja "${franjaTarget}"?\n\nEsto dejará los cubículos libres y disponibles para los médicos entrantes.`
                    )) {
                      onReleaseByHorario(franjaTarget);
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title={`Liberar totalmente todos los puestos de la franja ${franjaTarget}`}
                >
                  <RefreshCw size={13} />
                  <span>Liberar Franja ({ocupadosEnFranja})</span>
                </button>
              ) : null;
            })()}

            {/* Botón Sincronizar Lote con Google Sheets */}
            {activeBloqueInicio > 0 && (
              <button
                type="button"
                onClick={handleTriggerSyncLote}
                disabled={isSyncing || isSyncingLoteLocal}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                title={`Sincronizar puestos y estados del lote (#${activeBloqueInicio} al #${activeBloqueFin}) con Google Sheets`}
              >
                <RefreshCw size={13} className={(isSyncing || isSyncingLoteLocal) ? "animate-spin text-emerald-600" : "text-emerald-600"} />
                <span>{(isSyncing || isSyncingLoteLocal) ? "Sincronizando..." : `Sync Lote (${supervisorSpaces.length})`}</span>
              </button>
            )}
          </div>

          {activeBloqueInicio === 0 ? (
            <div
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-bold text-amber-800 bg-amber-50 border border-amber-300 shadow-2xs"
              title="Supervisor sin lote asignado hoy (no asiste o en descanso)"
            >
              <AlertCircle size={14} className="text-amber-600" />
              <span>⚪ Sin Lote Asignado Hoy</span>
            </div>
          ) : totalSinPuesto > 0 && puestosLibresLote > 0 ? (
            <button
              type="button"
              onClick={handleBatchAssignRoster}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold text-white shadow-xs transition-all active:scale-95 hover:brightness-110"
              style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
              title="Asigna automáticamente a los médicos faltantes a cubículos libres en tu bloque"
            >
              <Sparkles size={14} />
              <span>⚡ Auto-asignar Lote ({Math.min(totalSinPuesto, puestosLibresLote)})</span>
            </button>
          ) : totalSinPuesto === 0 && totalConPuesto > 0 ? (
            <div
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 shadow-2xs"
              title="Todos los médicos de este lote ya tienen su cubículo asignado"
            >
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>✓ Lote Asignado ({totalConPuesto})</span>
            </div>
          ) : totalSinPuesto > 0 && puestosLibresLote === 0 ? (
            <div
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-bold text-amber-800 bg-amber-50 border border-amber-300 shadow-2xs"
              title={`No hay puestos libres en el lote (#${activeBloqueInicio} al #${activeBloqueFin})`}
            >
              <AlertCircle size={14} className="text-amber-600" />
              <span>Lote Lleno ({totalSinPuesto} sin puesto)</span>
            </div>
          ) : null}

          {onOpenDailyLots && (
            <button
              onClick={onOpenDailyLots}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold text-indigo-700 border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 shadow-2xs transition-all active:scale-95 cursor-pointer"
              title="Abre la distribución de puestos diaria de la hoja RESUMEN SAN MIGUEL"
            >
              <FileSpreadsheet size={15} className="text-indigo-600" />
              <span>Resumen San Miguel</span>
            </button>
          )}

          <button
            onClick={() => setRosterModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold text-[#0048B5] border border-blue-200 bg-blue-50/80 hover:bg-blue-100 shadow-2xs transition-all active:scale-95"
            title="Personaliza qué médicos están asignados a este supervisor"
          >
            <Settings2 size={15} className="text-[#0095FF]" />
            <span>Configurar Nómina ({currentRosterNames.length})</span>
          </button>

          <button
            onClick={handleCopyReport}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 shadow-2xs transition-all"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            <span>Copiar Reporte</span>
          </button>
        </div>
      </div>

      {/* Tarjetas KPIs de Asistencia en Tiempo Real */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Programados</span>
          <p className="font-heading text-2xl font-black text-slate-900 mt-1">{totalProgramados}</p>
          <span className="text-[10.5px] text-slate-400">Total en nómina del lote</span>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Presentes</span>
          <p className="font-heading text-2xl font-black text-emerald-700 mt-1">{totalPresentes}</p>
          <span className="text-[10.5px] text-emerald-600 font-semibold">{asistenciaPct}% Asistencia</span>
        </div>

        <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/50 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0048B5]">Con Puesto Mapeado</span>
          <p className="font-heading text-2xl font-black text-[#0048B5] mt-1">{totalConPuesto}</p>
          <span className="text-[10.5px] text-blue-600 font-semibold">{totalPresentes - totalConPuesto} sin puesto</span>
        </div>

        <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/50 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">Inasistencias</span>
          <p className="font-heading text-2xl font-black text-rose-700 mt-1">{totalAusentes}</p>
          <span className="text-[10.5px] text-rose-600 font-semibold">{inasistenciaPct}% Ausentismo</span>
        </div>

        <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Puestos Libres en Lote</span>
          <p className="font-heading text-2xl font-black text-amber-700 mt-1">{puestosLibresLote}</p>
          <span className="text-[10.5px] text-amber-600 font-semibold">Listos para asignar</span>
        </div>
      </div>

      {/* Grid Principal: Lista de Médicos y Visualizador del Lote */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
        {/* Tabla de Pase de Asistencia */}
        <SectionCard
          icon={UserCheck}
          title={`Pase de Asistencia · ${currentSupervisor.nombre}`}
          subtitle="Verifica la asistencia y vincula el puesto donde se sentó cada médico"
          right={
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Botón rápido para finalizar remanentes en PRESENTE sin puesto */}
              {unseatedPresent.length > 0 && (
                <button
                  type="button"
                  onClick={() => typeof handleFinalizeUnseatedPresent === "function" && handleFinalizeUnseatedPresent()}
                  className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition shadow-2xs cursor-pointer"
                  title="Marca salida (FINALIZADO) a todos los médicos que figuran en PRESENTE pero no tienen cubículo asignado"
                >
                  <LogOut size={13} />
                  <span className="hidden sm:inline">Finalizar Remanentes ({unseatedPresent.length})</span>
                  <span className="sm:hidden">Finalizar ({unseatedPresent.length})</span>
                </button>
              )}

              {totalSinPuesto > 0 && (
                <button
                  type="button"
                  onClick={() => typeof handleMarkUnseatedAsAbsent === "function" && handleMarkUnseatedAsAbsent()}
                  className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-rose-700 border border-rose-200 bg-rose-50 hover:bg-rose-100 transition shadow-2xs cursor-pointer"
                  title="Marca a todos los médicos que aún no tienen puesto como ausentes"
                >
                  <UserX size={13} />
                  <span className="hidden sm:inline">Marcar Faltantes como Ausentes ({totalSinPuesto})</span>
                  <span className="sm:hidden">Faltantes Ausentes ({totalSinPuesto})</span>
                </button>
              )}

              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs">
                <Search size={13} className="text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar médico..."
                  className="w-32 sm:w-40 bg-transparent text-[12px] font-medium outline-none placeholder:text-slate-400"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 outline-none"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="PRESENTE">Presentes ({totalPresentes})</option>
                <option value="FINALIZADO">Jornada Finalizada ({totalFinalizados})</option>
                <option value="SIN_PUESTO">⚠️ Faltantes / Sin Puesto ({totalSinPuesto})</option>
                <option value="PENDIENTE">Pendientes</option>
                <option value="AUSENTE">Ausentes ({totalAusentes})</option>
                <option value="JUSTIFICADO">Justificados ({totalJustificados})</option>
              </select>
            </div>
          }
        >
          {/* Selector de Franjas cuando el supervisor tiene múltiples turnos asignados */}
          {currentSupervisorFranjas.length > 1 && (
            <div className="flex items-center gap-1.5 mb-3 p-2 rounded-2xl bg-blue-50/70 border border-blue-200/90 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
                <Clock size={12} className="text-[#0048B5]" /> Franja Asignada:
              </span>
              <button
                type="button"
                onClick={() => handleFilterHorarioChange("TODOS")}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
                  filterHorario === "TODOS"
                    ? "bg-[#0048B5] text-white shadow-xs"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-blue-50"
                }`}
              >
                Todas mis franjas ({batchDoctors.length})
              </button>
              {currentSupervisorFranjas.map((shift) => {
                const countInShift = batchDoctors.filter((d) => isSameHorario(d.horario, shift)).length;
                const isSelected = isSameHorario(filterHorario, shift);
                return (
                  <button
                    key={shift}
                    type="button"
                    onClick={() => handleFilterHorarioChange(shift)}
                    className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-[#0048B5] text-white shadow-xs"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-blue-50"
                    }`}
                  >
                    <span>{shift}</span>
                    <span className={`text-[10.5px] font-mono px-1.5 py-0.2 rounded-full ${
                      isSelected ? "bg-white/20 text-white font-bold" : "bg-blue-100 text-[#0048B5]"
                    }`}>
                      {countInShift}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Pestañas de Filtro Rápido */}
          <div className="flex items-center gap-1.5 mb-3.5 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterStatus("TODOS")}
              className={`px-3 py-1 rounded-xl text-[11.5px] font-bold transition-all ${
                filterStatus === "TODOS"
                  ? "bg-[#0048B5] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Todos ({totalProgramados})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("PRESENTE")}
              className={`px-3 py-1 rounded-xl text-[11.5px] font-bold transition-all ${
                filterStatus === "PRESENTE"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              Presentes ({totalPresentes})
            </button>
            {totalFinalizados > 0 && (
              <button
                type="button"
                onClick={() => setFilterStatus("FINALIZADO")}
                className={`px-3 py-1 rounded-xl text-[11.5px] font-bold transition-all ${
                  filterStatus === "FINALIZADO"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100"
                }`}
              >
                Finalizados ({totalFinalizados})
              </button>
            )}
            <button
              type="button"
              onClick={() => setFilterStatus("SIN_PUESTO")}
              className={`px-3 py-1 rounded-xl text-[11.5px] font-bold transition-all flex items-center gap-1 ${
                filterStatus === "SIN_PUESTO"
                  ? "bg-amber-600 text-white shadow-xs ring-2 ring-amber-400/40"
                  : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
              }`}
            >
              <AlertCircle size={12} />
              <span>Faltantes / Sin Puesto ({totalSinPuesto})</span>
            </button>
            {totalAusentes > 0 && (
              <button
                type="button"
                onClick={() => setFilterStatus("AUSENTE")}
                className={`px-3 py-1 rounded-xl text-[11.5px] font-bold transition-all ${
                  filterStatus === "AUSENTE"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100"
                }`}
              >
                Ausentes ({totalAusentes})
              </button>
            )}
          </div>

          {/* Tarjeta de Búsqueda inteligente: Si el supervisor busca un médico que está con otro supervisor o en el padrón */}
          {externalSearchResults.length > 0 && (
            <div className="mb-3.5 p-3 rounded-2xl bg-amber-50/90 border border-amber-200/90 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                  Médicos encontrados fuera de tu lote ({externalSearchResults.length}):
                </span>
                <span className="text-[10.5px] text-amber-700 font-medium">
                  Resultados del padrón oficial
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {externalSearchResults.map((extDoc) => {
                  const otherSupName = extDoc.supInfo?.supervisorNombre;
                  const isOther = extDoc.supInfo?.supervisorId && extDoc.supInfo.supervisorId !== currentSupervisor.id;
                  return (
                    <div
                      key={extDoc.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-amber-200 shadow-2xs text-[12px]"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-slate-800 truncate">{extDoc.nombre}</p>
                        <p className="text-[10.5px] text-slate-500 truncate">
                          {isOther ? (
                            <span className="text-amber-800 font-semibold">
                              ⚠️ Con: {otherSupName} {extDoc.supInfo.horario ? `(${extDoc.supInfo.horario})` : ""}
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-semibold">✓ Disponible en padrón</span>
                          )}
                          {extDoc.supInfo?.spaceId && ` · Puesto #${extDoc.supInfo.spaceId}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const conf = isOther
                            ? window.confirm(
                                `${extDoc.nombre} está con ${otherSupName}.\n\n¿Deseas transferirlo(a) a tu nómina de este turno?`
                              )
                            : true;
                          if (conf) {
                            handleSaveSupervisorRoster(
                              [...currentRosterNames, extDoc.nombre],
                              filterHorario !== "TODOS" ? filterHorario : null,
                              isOther ? [extDoc.nombre] : []
                            );
                            setSearchQuery("");
                          }
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-50 text-[#0048B5] hover:bg-blue-100 border border-blue-200 transition shrink-0 cursor-pointer"
                      >
                        + Agregar a mi lote
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[10.5px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="px-3.5 py-3">#</th>
                  <th className="px-3.5 py-3">Médico Programado</th>
                  <th className="px-3.5 py-3">Puesto Asignado</th>
                  <th className="px-3.5 py-3 text-center">Estado de Asistencia</th>
                  <th className="px-3.5 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBatch.map((doc, idx) => {
                  const isPresent = doc.status === "PRESENTE";
                  const isAbsent = doc.status === "AUSENTE";
                  const isJustified = doc.status === "JUSTIFICADO";

                  return (
                    <tr key={`${doc.id}-${doc.nombre}`} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-3.5 py-3 font-mono-data text-slate-400 text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="px-3.5 py-3 font-semibold text-slate-800">
                        <p className="leading-tight">{doc.nombre}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] font-normal text-slate-400">{doc.tipo}</span>
                          {doc.horario && (
                            <span className="text-[10px] font-mono bg-blue-50 text-[#0048B5] px-1.5 py-0.2 rounded font-bold border border-blue-200 flex items-center gap-1">
                              <Clock size={10} className="text-[#0048B5]" />
                              <span>{doc.horario}</span>
                            </span>
                          )}
                          {doc.correo && (
                            <span className="text-[10px] font-mono text-[#0048B5] font-normal">
                              {doc.correo}
                            </span>
                          )}
                          {doc.jvpm && (
                            <span className="text-[9.5px] font-mono bg-slate-100 text-slate-500 px-1 py-0.2 rounded">
                              {doc.jvpm}
                            </span>
                          )}
                          {doc.externoAlLote && (
                            <span className="text-[9.5px] bg-sky-100 text-sky-800 px-1.5 rounded font-bold">
                              Se sentó en tu lote
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3.5 py-3">
                        {doc.espacio ? (
                          <span
                            className={`inline-flex items-center gap-1 font-mono-data text-[12px] font-extrabold px-2.5 py-1 rounded-lg border ${
                              doc.enMiLote
                                ? "text-[#0048B5] bg-blue-50 border-blue-200"
                                : "text-amber-800 bg-amber-50 border-amber-300"
                            }`}
                          >
                            <Laptop size={12} /> Puesto #{doc.espacio}
                            {!doc.enMiLote && (
                              <span className="text-[9.5px] font-medium text-amber-700 ml-1">
                                (Lote externo)
                              </span>
                            )}
                          </span>
                        ) : doc.status === "FINALIZADO" ? (
                          <span className="inline-flex items-center gap-1 text-[11.5px] text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg font-bold border border-indigo-200">
                            <CheckCircle2 size={12} className="text-indigo-600" /> Jornada Finalizada
                          </span>
                        ) : isAbsent ? (
                          <span className="text-[11.5px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md font-semibold border border-rose-200">
                            Inasistencia
                          </span>
                        ) : (
                          <span className="text-[11.5px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold border border-amber-200">
                            Sin puesto asignado
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <div className="inline-flex items-center rounded-xl p-0.5 bg-slate-100 border border-slate-200">
                          <button
                            onClick={() => handleSetAttendance(doc.nombre, "PRESENTE")}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                              isPresent
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-emerald-700"
                            }`}
                          >
                            Presente
                          </button>
                          <button
                            onClick={() => {
                              handleSetAttendance(doc.nombre, "AUSENTE");
                              if (onUnassignDoctor) {
                                onUnassignDoctor(doc.nombre, doc.espacio);
                              }
                            }}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                              isAbsent
                                ? "bg-rose-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-rose-700"
                            }`}
                          >
                            Ausente
                          </button>
                          <button
                            onClick={() => {
                              handleSetAttendance(doc.nombre, "JUSTIFICADO");
                              if (onUnassignDoctor) {
                                onUnassignDoctor(doc.nombre, doc.espacio);
                              }
                            }}
                            className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all ${
                              isJustified
                                ? "bg-amber-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-amber-700"
                            }`}
                          >
                            Justif.
                          </button>
                          <button
                            onClick={() => {
                              handleSetAttendance(doc.nombre, "FINALIZADO");
                              if (onUnassignDoctor) {
                                onUnassignDoctor(doc.nombre, doc.espacio);
                              }
                            }}
                            className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all ${
                              doc.status === "FINALIZADO"
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-indigo-700"
                            }`}
                            title="Marcar salida / jornada completada"
                          >
                            Salida
                          </button>
                        </div>
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        {doc.espacio ? (
                          <button
                            onClick={() => onUnassignDoctor(doc.nombre, doc.espacio)}
                            className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                          >
                            Liberar
                          </button>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {doc.status === "PRESENTE" && (
                              <button
                                onClick={() => handleSetAttendance(doc.nombre, "FINALIZADO")}
                                className="inline-flex items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all shadow-2xs cursor-pointer"
                                title="Marcar salida a este médico para limpiar remanente"
                              >
                                <LogOut size={11} />
                                <span>Salida</span>
                              </button>
                            )}
                            <button
                              onClick={() => openManualAssign(doc)}
                              className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11.5px] font-bold text-white bg-[#0048B5] hover:bg-[#003487] transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                              title="Elegir y asignar puesto manualmente"
                            >
                              <span>Asignar Puesto</span>
                              <ArrowRight size={12} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredBatch.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <Users size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-[13px] font-bold text-slate-600">
                        No hay médicos en tu lista con los filtros aplicados.
                      </p>
                      <p className="text-[11.5px] text-slate-400 mt-1">
                        {filterHorario !== "TODOS"
                          ? `Puedes configurar la nómina de médicos para la franja ${filterHorario}.`
                          : "Haz clic en 'Configurar Nómina' para asignar médicos a este lote."}
                      </p>
                      <button
                        type="button"
                        onClick={() => setRosterModalOpen(true)}
                        className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 text-[#0048B5] border border-blue-200 font-bold text-[12px] hover:bg-blue-100 transition shadow-2xs cursor-pointer"
                      >
                        <Settings2 size={13} />
                        <span>Configurar Nómina de Médicos</span>
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Mini Mapa en Vivo del Bloque del Supervisor */}
        <SectionCard
          icon={MapPin}
          title="Puestos del Lote en Vivo"
          subtitle={
            isMultiLot
              ? `${dynamicLots.map((dl) => `#${dl.bloqueInicio}-#${dl.bloqueFin} (${dl.horario})`).join(" · ")}`
              : activeBloqueInicio === 0
                ? "Supervisor sin lote asignado hoy"
                : `Puestos #${activeBloqueInicio} al #${activeBloqueFin}${dynamicLot ? ` · ${dynamicLot.horario}` : ""}`
          }
          right={
            activeBloqueInicio > 0 ? (
              <button
                type="button"
                onClick={handleTriggerSyncLote}
                disabled={isSyncing || isSyncingLoteLocal}
                className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-xl border border-emerald-200 transition-all cursor-pointer shadow-2xs disabled:opacity-60"
                title="Sincronizar puestos del lote con Google Sheets"
              >
                <RefreshCw size={11} className={(isSyncing || isSyncingLoteLocal) ? "animate-spin text-emerald-600" : "text-emerald-600"} />
                <span>Sync Sheets</span>
              </button>
            ) : null
          }
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-[11.5px] font-medium text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span>Capacidad: <b>{activeTotalPuestos} puestos</b></span>
              <span className="text-emerald-700 font-bold">{puestosLibresLote} libres</span>
            </div>

            {activeBloqueInicio === 0 ? (
              <div className="py-10 px-4 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                <AlertCircle size={32} className="mx-auto text-amber-500 mb-2" />
                <p className="text-[13px] font-bold text-slate-700">
                  Supervisor sin lote de puestos hoy
                </p>
                <p className="text-[11.5px] text-slate-500 mt-1 max-w-xs mx-auto">
                  Este supervisor está configurado con 0 puestos (descanso o inasistencia). Puedes asignarle un bloque en <b>Lote Base</b> o <b>Resumen SM</b> cuando asista.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[460px] overflow-y-auto pr-1">
                  {supervisorSpaces.map((s) => {
                    const isOccupied = s.estado === "OCUPADO" || !!s.doctor;
                    const isFree = !isOccupied && s.estado !== "INHABILITADO";
                    const isTargetSelected = String(targetSpaceId) === String(s.id);

                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          if (isFree) {
                            if (manualAssignDoc) {
                              setTargetSpaceId(String(s.id));
                            } else {
                              const firstUnseated = batchDoctors.find(
                                (d) => !d.espacio && d.status !== "AUSENTE" && d.status !== "FINALIZADO"
                              );
                              if (firstUnseated) {
                                setManualAssignDoc(firstUnseated);
                                setTargetSpaceId(String(s.id));
                                setTargetHorario(
                                  filterHorario !== "TODOS" ? filterHorario : (currentSupervisor.activeFranja || currentSupervisor.horario)
                                );
                              }
                            }
                          }
                        }}
                        className={`p-2 rounded-xl border text-center transition-all flex flex-col justify-between h-20 ${
                          isTargetSelected
                            ? "bg-blue-100 border-[#0048B5] text-[#0048B5] ring-2 ring-[#0048B5] scale-105 shadow-sm"
                            : isOccupied
                            ? "bg-blue-50 border-blue-300 text-[#0048B5]"
                            : s.estado === "INHABILITADO"
                            ? "bg-slate-100 border-slate-300 text-slate-400"
                            : "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 hover:scale-105 cursor-pointer shadow-2xs"
                        }`}
                        title={isFree ? `Puesto #${s.id} libre - Clic para asignar` : `Puesto #${s.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-heading font-extrabold text-[12px]">#{s.id}</span>
                          <span className="text-[9px] font-bold font-mono-data opacity-75">{s.marca || "PC"}</span>
                        </div>

                        <div className="truncate text-[9.5px] font-semibold">
                          {s.doctor ? String(s.doctor).replace("Dr. ", "").replace("Dra. ", "") : s.estado}
                        </div>

                        <div className="text-[8px] font-bold uppercase tracking-wider">
                          {isOccupied ? "● Ocupado" : s.estado === "INHABILITADO" ? "⛔ No disp." : "○ Libre"}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-2 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>● Azul: Con Médico</span>
                  <span>○ Verde: Libre</span>
                  <span>⛔ Gris: Inhabilitado</span>
                </div>
              </>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Modal para Asignar Puesto Manualmente con Selección Específica */}
      {manualAssignDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          onClick={() => setManualAssignDoc(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "popIn .2s cubic-bezier(0.16, 1, 0.3, 1) both" }}
            className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200"
          >
            {/* Header del Modal */}
            <div
              className="flex items-center justify-between px-6 py-4 text-white"
              style={{ background: "linear-gradient(135deg, #002868 0%, #0048B5 60%, #0095FF 100%)" }}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-md shadow-inner">
                  <MapPin size={20} />
                </span>
                <div>
                  <h3 className="font-heading text-base font-bold">Asignar Puesto a Médico</h3>
                  <p className="text-[12px] text-cyan-100 font-semibold truncate max-w-xs">
                    {manualAssignDoc.nombre}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManualAssignDoc(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleConfirmManualAssign} className="p-6 space-y-4">
              {/* Sección 1: Puestos Libres en el Lote */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    1. Elige un cubículo libre de tu lote (#{currentSupervisor.bloqueInicio} - #{currentSupervisor.bloqueFin})
                  </label>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {supervisorSpaces.filter((s) => !s.doctor && s.estado !== "INHABILITADO").length} libres
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-44 overflow-y-auto p-1 bg-slate-50/70 rounded-2xl border border-slate-200">
                  {supervisorSpaces
                    .filter((s) => !s.doctor && s.estado !== "INHABILITADO")
                    .map((s) => {
                      const isSelected = String(s.id) === String(targetSpaceId);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setTargetSpaceId(String(s.id))}
                          className={`p-2 rounded-xl border text-center transition-all flex flex-col justify-between items-center cursor-pointer ${
                            isSelected
                              ? "border-[#0048B5] bg-blue-50 text-[#0048B5] font-extrabold ring-2 ring-[#0048B5] shadow-xs scale-105"
                              : "border-slate-200 bg-white text-slate-700 hover:border-emerald-400 hover:bg-emerald-50/50"
                          }`}
                        >
                          <span className="font-heading text-[13px] font-bold">#{s.id}</span>
                          <span className="text-[9px] font-mono-data opacity-70 font-semibold">{s.marca || "PC"}</span>
                        </button>
                      );
                    })}
                  {supervisorSpaces.filter((s) => !s.doctor && s.estado !== "INHABILITADO").length === 0 && (
                    <div className="col-span-full py-4 text-center text-[12px] text-amber-700">
                      No hay cubículos libres en tu lote oficial. Puedes escribir un número de puesto abajo.
                    </div>
                  )}
                </div>
              </div>

              {/* Sección 2: O ingresar número manual */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    2. O escribe el número de puesto
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-2xs focus-within:ring-2 focus-within:ring-[#0095FF]/40">
                    <MapPin size={15} className="text-[#0048B5]" />
                    <input
                      type="number"
                      min="1"
                      max="170"
                      value={targetSpaceId}
                      onChange={(e) => setTargetSpaceId(e.target.value)}
                      placeholder="Ej. 40"
                      required
                      className="w-full bg-transparent text-[14px] font-extrabold font-mono-data text-slate-800 outline-none placeholder:text-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    3. Franja / Turno
                  </label>
                  <select
                    value={targetHorario}
                    onChange={(e) => setTargetHorario(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 shadow-2xs cursor-pointer focus:ring-2 focus:ring-[#0095FF]/40"
                  >
                    {(horarios || HORARIOS).map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview del Puesto Seleccionado */}
              {targetSpaceId && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-[12px] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Laptop size={16} className="text-[#0048B5]" />
                    <div>
                      <span className="font-bold text-slate-800">
                        Puesto #{targetSpaceId}
                      </span>
                      {(() => {
                        const sp = (spaces || []).find((s) => Number(s.id) === Number(targetSpaceId));
                        if (!sp) return <span className="ml-1 text-slate-500">(Fuera de rango)</span>;
                        if (sp.doctor) return <span className="ml-1 text-amber-700 font-bold">(Ocupado por {sp.doctor})</span>;
                        return <span className="ml-1 text-emerald-700 font-bold">({sp.marca || "Disponible"})</span>;
                      })()}
                    </div>
                  </div>
                  <span className="font-mono-data text-[11px] text-[#0048B5] font-bold bg-white px-2 py-0.5 rounded-lg border border-blue-200">
                    Seleccionado
                  </span>
                </div>
              )}

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setManualAssignDoc(null)}
                  className="rounded-xl px-4 py-2 text-[12.5px] font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!targetSpaceId}
                  className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-[12.5px] font-extrabold text-white shadow-md transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  style={{ background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)" }}
                >
                  <Check size={15} />
                  <span>Confirmar Puesto #{targetSpaceId || "..."}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Configurador de Nómina de Médicos Asignados al Supervisor */}
      {rosterModalOpen && (
        <SupervisorRosterModal
          supervisor={currentSupervisor}
          activeFranja={filterHorario !== "TODOS" ? filterHorario : (currentSupervisor.activeFranja || currentSupervisor.horario)}
          currentDoctorNames={currentRosterNames}
          allRosters={activeRosters}
          supervisores={supervisores}
          spaces={spaces}
          horarios={horarios}
          selectedDate={selectedDate}
          activeQuincena={quincena}
          onSaveRoster={handleSaveSupervisorRoster}
          onClose={() => setRosterModalOpen(false)}
        />
      )}

      {/* Modal Gestor de Nóminas Quincenales de Servicios Profesionales */}
      {quincenaModalOpen && (
        <QuincenaManagerModal
          activeQuincena={quincena}
          selectedDate={selectedDate}
          onSelectDate={(newDate) => {
            setSelectedDate(newDate);
            setQuincenaModalOpen(false);
          }}
          onSaveQuincena={(newQ) => {
            if (onSaveQuincena) onSaveQuincena(newQ);
          }}
          onClose={() => setQuincenaModalOpen(false)}
          supervisores={supervisores}
        />
      )}
    </div>
  );
}
