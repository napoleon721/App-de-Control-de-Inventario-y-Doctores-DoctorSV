import { doc, onSnapshot, setDoc, runTransaction } from "firebase/firestore";
import { db } from "./firebase";
import { isSameDoctor } from "../utils/safeHelpers";

const SEDE_ID = "san-miguel";

let isFirestoreAvailable = true;
let spacesTimer = null;
// Última versión conocida de cada puesto en la nube (id -> JSON); permite enviar solo los puestos modificados
const spacesBaseline = new Map();
let onSpacesMerged = null;

const isStationSpace = (s) =>
  s?.categoria === "Supervisores" || s?.categoria === "Administrativos" || [135, 136, 137, 138, 139].includes(Number(s?.id));

function updateSpacesBaseline(list) {
  spacesBaseline.clear();
  list.forEach((s) => spacesBaseline.set(Number(s.id), JSON.stringify(s)));
}

/**
 * Registra un callback que recibe la lista fusionada cuando la nube tenía cambios de otros clientes al guardar
 */
export function setCloudSpacesMergeListener(fn) {
  onSpacesMerged = typeof fn === "function" ? fn : null;
}

/**
 * Aplica solo los puestos modificados por este cliente sobre la lista actual de la nube.
 * Si un médico se asigna a un puesto, se libera cualquier otro puesto en el que la nube aún lo tuviera.
 */
function mergeSpacesChanges(remoteList, changed) {
  const changedIds = new Set(changed.map((s) => Number(s.id)));
  const byId = new Map(remoteList.map((s) => [Number(s.id), s]));
  changed.forEach((s) => byId.set(Number(s.id), s));
  changed.forEach((s) => {
    if (!s.doctor || isStationSpace(s)) return;
    byId.forEach((r, id) => {
      if (changedIds.has(id) || isStationSpace(r) || !r.doctor || !isSameDoctor(r.doctor, s.doctor)) return;
      byId.set(id, { ...r, doctor: null, horario: null, estado: "DISPONIBLE" });
    });
  });
  const merged = [];
  const seen = new Set();
  remoteList.forEach((r) => {
    const id = Number(r.id);
    merged.push(byId.get(id));
    seen.add(id);
  });
  byId.forEach((s, id) => {
    if (!seen.has(id)) merged.push(s);
  });
  return merged;
}
let bodegaTimer = null;
let historialTimer = null;

/**
 * Escucha cambios en tiempo real del plano de espacios desde Firestore
 */
export function subscribeToCloudSpaces(onUpdate, onError, myClientId = "") {
  try {
    const docRef = doc(db, "sedes", SEDE_ID, "estado", "spaces");
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        // Ignorar eventos generados localmente aún no confirmados para romper bucles
        if (snapshot.metadata && snapshot.metadata.hasPendingWrites) return;

        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && Array.isArray(data.list) && data.list.length > 0) updateSpacesBaseline(data.list);
          // Si el cambio fue originado por este mismo cliente, ignorar
          if (myClientId && data?.updatedBy === myClientId) return;

          if (data && Array.isArray(data.list) && data.list.length > 0) {
            onUpdate(data.list);
          }
        }
      },
      (error) => {
        console.warn("Firestore Spaces sync aviso:", error?.message);
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Guarda los espacios en Firestore con control de fallos y opción inmediata para relevos
 */
export function saveCloudSpaces(spaces, clientId = "", immediate = false) {
  if (!isFirestoreAvailable) return;
  if (!Array.isArray(spaces) || spaces.length === 0) return;

  if (spacesTimer) {
    clearTimeout(spacesTimer);
    spacesTimer = null;
  }

  const persist = async () => {
    const docRef = doc(db, "sedes", SEDE_ID, "estado", "spaces");
    const changed = spacesBaseline.size > 0
      ? spaces.filter((s) => spacesBaseline.get(Number(s.id)) !== JSON.stringify(s))
      : spaces;
    if (changed.length === 0) return;
    try {
      const merged = await runTransaction(db, async (tx) => {
        const snap = await tx.get(docRef);
        const remoteList = snap.exists() && Array.isArray(snap.data()?.list) && snap.data().list.length > 0 ? snap.data().list : null;
        // Sin línea base (aún no se recibió el estado de la nube) no se sobrescribe: se adopta el estado remoto
        if (remoteList && spacesBaseline.size === 0) return remoteList;
        const next = remoteList ? mergeSpacesChanges(remoteList, changed) : spaces;
        tx.set(docRef, {
          list: next,
          updatedBy: clientId || "anon",
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        return next;
      });
      updateSpacesBaseline(merged);
      if (onSpacesMerged && JSON.stringify(merged) !== JSON.stringify(spaces)) onSpacesMerged(merged);
    } catch (error) {
      try {
        await setDoc(docRef, {
          list: spaces,
          updatedBy: clientId || "anon",
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        updateSpacesBaseline(spaces);
      } catch {
        // Ignorar fallos transitorios de red para no interrumpir la experiencia local
      }
    }
  };

  if (immediate) {
    persist();
  } else {
    spacesTimer = setTimeout(persist, 400);
  }
}

/**
 * Escucha cambios en tiempo real del stock de bodega
 */
export function subscribeToCloudBodega(onUpdate, onError, myClientId = "") {
  try {
    const docRef = doc(db, "sedes", SEDE_ID, "estado", "bodega");
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.metadata && snapshot.metadata.hasPendingWrites) return;
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (myClientId && data?.updatedBy === myClientId) return;
          if (data && Array.isArray(data.list) && data.list.length > 0) {
            onUpdate(data.list);
          }
        }
      },
      (error) => {
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Guarda el inventario de bodega en Firestore con opción inmediata y debounce
 */
export function saveCloudBodega(bodegaStock, clientId = "", immediate = false) {
  if (!isFirestoreAvailable) return;
  if (!Array.isArray(bodegaStock) || bodegaStock.length === 0) return;

  if (bodegaTimer) {
    clearTimeout(bodegaTimer);
    bodegaTimer = null;
  }

  const persist = async () => {
    try {
      const docRef = doc(db, "sedes", SEDE_ID, "estado", "bodega");
      await setDoc(docRef, {
        list: bodegaStock,
        updatedBy: clientId || "anon",
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {}
  };

  if (immediate) {
    persist();
  } else {
    bodegaTimer = setTimeout(persist, 500);
  }
}

/**
 * Escucha cambios en tiempo real del historial de auditoría
 */
export function subscribeToCloudHistorial(onUpdate, onError, myClientId = "") {
  try {
    const docRef = doc(db, "sedes", SEDE_ID, "estado", "historial");
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.metadata && snapshot.metadata.hasPendingWrites) return;
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (myClientId && data?.updatedBy === myClientId) return;
          if (data && Array.isArray(data.list) && data.list.length > 0) {
            onUpdate(data.list);
          }
        }
      },
      (error) => {
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Guarda el historial en Firestore con opción inmediata y debounce
 */
export function saveCloudHistorial(historial, clientId = "", immediate = false) {
  if (!isFirestoreAvailable) return;
  if (!Array.isArray(historial) || historial.length === 0) return;

  if (historialTimer) {
    clearTimeout(historialTimer);
    historialTimer = null;
  }

  const persist = async () => {
    try {
      const docRef = doc(db, "sedes", SEDE_ID, "estado", "historial");
      await setDoc(docRef, {
        list: historial.slice(0, 100),
        updatedBy: clientId || "anon",
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {}
  };

  if (immediate) {
    persist();
  } else {
    historialTimer = setTimeout(persist, 600);
  }
}

let rostersTimer = null;
let horariosTimer = null;

/**
 * Escucha cambios en tiempo real de los horarios configurados desde Firestore
 */
export function subscribeToCloudHorarios(onUpdate, onError, myClientId = "") {
  try {
    const docRef = doc(db, "sedes", SEDE_ID, "estado", "config");
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.metadata && snapshot.metadata.hasPendingWrites) return;
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (myClientId && data?.updatedBy === myClientId) return;
          if (data && Array.isArray(data.horarios) && data.horarios.length > 0) {
            onUpdate(data.horarios);
          }
        }
      },
      (error) => {
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Guarda los horarios configurados en Firestore con debounce
 */
export function saveCloudHorarios(horarios, clientId = "") {
  if (!isFirestoreAvailable) return;
  if (!Array.isArray(horarios) || horarios.length === 0) return;

  if (horariosTimer) clearTimeout(horariosTimer);

  horariosTimer = setTimeout(async () => {
    try {
      const docRef = doc(db, "sedes", SEDE_ID, "estado", "config");
      await setDoc(docRef, {
        horarios: horarios,
        updatedBy: clientId || "anon",
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {}
  }, 500);
}

/**
 * Escucha cambios en tiempo real de las nóminas de médicos por supervisor desde Firestore
 */
export function subscribeToCloudRosters(onUpdate, onError, myClientId = "") {
  try {
    const docRef = doc(db, "sedes", SEDE_ID, "estado", "rosters");
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.metadata && snapshot.metadata.hasPendingWrites) return;
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (myClientId && data?.updatedBy === myClientId) return;
          if (data && data.rosters && typeof data.rosters === "object") {
            onUpdate(data.rosters);
          }
        }
      },
      (error) => {
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Guarda las nóminas de supervisores en Firestore con debounce
 */
export function saveCloudRosters(rosters, clientId = "") {
  if (!isFirestoreAvailable) return;
  if (!rosters || typeof rosters !== "object" || Object.keys(rosters).length === 0) return;

  if (rostersTimer) clearTimeout(rostersTimer);

  rostersTimer = setTimeout(async () => {
    try {
      const docRef = doc(db, "sedes", SEDE_ID, "estado", "rosters");
      await setDoc(docRef, {
        rosters: rosters,
        updatedBy: clientId || "anon",
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {}
  }, 500);
}

let quincenaTimer = null;

/**
 * Escucha cambios en tiempo real de la Quincena Oficial desde Firestore
 */
export function subscribeToCloudQuincena(onUpdate, onError, myClientId = "") {
  if (!isFirestoreAvailable) return () => {};
  try {
    const docRef = doc(db, "sedes", SEDE_ID, "estado", "quincena");
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.updatedBy && data.updatedBy === myClientId) {
            return;
          }
          if (data && data.quincena && typeof data.quincena === "object") {
            onUpdate(data.quincena);
          }
        }
      },
      (error) => {
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Guarda la Quincena Oficial en Firestore con debounce
 */
export function saveCloudQuincena(quincena, clientId = "") {
  if (!isFirestoreAvailable) return;
  if (!quincena || typeof quincena !== "object") return;

  if (quincenaTimer) clearTimeout(quincenaTimer);

  quincenaTimer = setTimeout(async () => {
    try {
      const docRef = doc(db, "sedes", SEDE_ID, "estado", "quincena");
      await setDoc(docRef, {
        quincena: quincena,
        updatedBy: clientId || "anon",
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {
      console.warn("Error guardando quincena en la nube:", error);
    }
  }, 500);
}

let supervisoresTimer = null;

/**
 * Escucha cambios en tiempo real de los supervisores y sus lotes desde Firestore
 */
export function subscribeToCloudSupervisores(onUpdate, onError, myClientId = "") {
  try {
    const docRef = doc(db, "sedes", SEDE_ID, "estado", "supervisores");
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.metadata && snapshot.metadata.hasPendingWrites) return;
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (myClientId && data?.updatedBy === myClientId) return;
          if (data && Array.isArray(data.list) && data.list.length > 0) {
            onUpdate(data.list);
          }
        }
      },
      (error) => {
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Guarda la configuración de supervisores en Firestore con debounce
 */
export function saveCloudSupervisores(supervisores, clientId = "") {
  if (!isFirestoreAvailable) return;
  if (!Array.isArray(supervisores) || supervisores.length === 0) return;

  if (supervisoresTimer) clearTimeout(supervisoresTimer);

  supervisoresTimer = setTimeout(async () => {
    try {
      const docRef = doc(db, "sedes", SEDE_ID, "estado", "supervisores");
      await setDoc(docRef, {
        list: supervisores,
        updatedBy: clientId || "anon",
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {}
  }, 500);
}

let attendanceTimer = null;

/**
 * Escucha cambios en tiempo real de los estados de asistencia desde Firestore
 */
export function subscribeToCloudAttendance(onUpdate, onError, myClientId = "") {
  try {
    const docRef = doc(db, "sedes", SEDE_ID, "estado", "attendance");
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.metadata && snapshot.metadata.hasPendingWrites) return;
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && data.records && typeof data.records === "object") attendanceBaseline = { ...data.records };
          if (myClientId && data?.updatedBy === myClientId) return;
          if (data && data.records && typeof data.records === "object") {
            onUpdate(data.records);
          }
        }
      },
      (error) => {
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Guarda los estados de asistencia en Firestore con debounce
 */
// Última versión conocida de la asistencia en la nube (para enviar solo diferencias y propagar eliminaciones)
let attendanceBaseline = null;

export function saveCloudAttendance(attendanceRecords, clientId = "") {
  if (!isFirestoreAvailable) return;
  if (!attendanceRecords || typeof attendanceRecords !== "object") return;

  if (attendanceTimer) clearTimeout(attendanceTimer);

  attendanceTimer = setTimeout(async () => {
    const docRef = doc(db, "sedes", SEDE_ID, "estado", "attendance");
    try {
      const merged = await runTransaction(db, async (tx) => {
        const snap = await tx.get(docRef);
        const remote = snap.exists() && snap.data()?.records && typeof snap.data().records === "object" ? { ...snap.data().records } : null;
        // Sin línea base no se pisa lo que ya hay en la nube: se adopta
        if (remote && attendanceBaseline === null) return { adopt: remote };
        const base = attendanceBaseline || {};
        const next = remote ? { ...remote } : {};
        Object.keys(attendanceRecords).forEach((k) => {
          if (base[k] !== attendanceRecords[k]) next[k] = attendanceRecords[k];
        });
        Object.keys(base).forEach((k) => {
          if (!(k in attendanceRecords)) delete next[k];
        });
        // Sin merge: las claves eliminadas deben desaparecer realmente de la nube
        tx.set(docRef, { records: next, updatedBy: clientId || "anon", updatedAt: new Date().toISOString() });
        return { saved: next };
      });
      if (merged.adopt) {
        attendanceBaseline = merged.adopt;
        if (onAttendanceMerged) onAttendanceMerged(merged.adopt);
      } else {
        attendanceBaseline = merged.saved;
        if (onAttendanceMerged && JSON.stringify(merged.saved) !== JSON.stringify(attendanceRecords)) onAttendanceMerged(merged.saved);
      }
    } catch (error) {
      try {
        await setDoc(docRef, { records: attendanceRecords, updatedBy: clientId || "anon", updatedAt: new Date().toISOString() });
        attendanceBaseline = { ...attendanceRecords };
      } catch {}
    }
  }, 400);
}

let onAttendanceMerged = null;
export function setCloudAttendanceMergeListener(fn) {
  onAttendanceMerged = typeof fn === "function" ? fn : null;
}

let dailyLotsTimer = null;

/**
 * Escucha cambios en tiempo real de la distribución diaria de lotes (RESUMEN SAN MIGUEL)
 */
export function subscribeToCloudDailyLots(onUpdate, onError, myClientId = "") {
  try {
    const docRef = doc(db, "sedes", SEDE_ID, "estado", "dailyLots");
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.metadata && snapshot.metadata.hasPendingWrites) return;
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (myClientId && data?.updatedBy === myClientId) return;
          if (data && data.dailyLots && typeof data.dailyLots === "object") {
            onUpdate(data.dailyLots);
          }
        }
      },
      (error) => {
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Guarda la distribución diaria de lotes en Firestore
 */
export function saveCloudDailyLots(dailyLots, clientId = "") {
  if (!isFirestoreAvailable) return;
  if (!dailyLots || typeof dailyLots !== "object") return;

  if (dailyLotsTimer) clearTimeout(dailyLotsTimer);

  dailyLotsTimer = setTimeout(async () => {
    try {
      const docRef = doc(db, "sedes", SEDE_ID, "estado", "dailyLots");
      await setDoc(docRef, {
        dailyLots,
        updatedBy: clientId || "anon",
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {}
  }, 400);
}



