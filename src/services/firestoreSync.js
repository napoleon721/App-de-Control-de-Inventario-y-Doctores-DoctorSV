import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";

const SEDE_ID = "san-miguel";

let isFirestoreAvailable = true;
let spacesTimer = null;
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
 * Guarda los espacios en Firestore con control de fallos y debounce
 */
export function saveCloudSpaces(spaces, clientId = "") {
  if (!isFirestoreAvailable) return;
  if (!Array.isArray(spaces) || spaces.length === 0) return;

  if (spacesTimer) clearTimeout(spacesTimer);

  spacesTimer = setTimeout(async () => {
    try {
      const docRef = doc(db, "sedes", SEDE_ID, "estado", "spaces");
      await setDoc(docRef, {
        list: spaces,
        updatedBy: clientId || "anon",
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {
      // Ignorar fallos transitorios de red para no interrumpir la experiencia local
    }
  }, 400);
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
 * Guarda el inventario de bodega en Firestore con debounce
 */
export function saveCloudBodega(bodegaStock, clientId = "") {
  if (!isFirestoreAvailable) return;
  if (!Array.isArray(bodegaStock) || bodegaStock.length === 0) return;

  if (bodegaTimer) clearTimeout(bodegaTimer);

  bodegaTimer = setTimeout(async () => {
    try {
      const docRef = doc(db, "sedes", SEDE_ID, "estado", "bodega");
      await setDoc(docRef, {
        list: bodegaStock,
        updatedBy: clientId || "anon",
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {}
  }, 500);
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
 * Guarda el historial en Firestore con debounce
 */
export function saveCloudHistorial(historial, clientId = "") {
  if (!isFirestoreAvailable) return;
  if (!Array.isArray(historial) || historial.length === 0) return;

  if (historialTimer) clearTimeout(historialTimer);

  historialTimer = setTimeout(async () => {
    try {
      const docRef = doc(db, "sedes", SEDE_ID, "estado", "historial");
      await setDoc(docRef, {
        list: historial.slice(0, 100),
        updatedBy: clientId || "anon",
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {}
  }, 600);
}

let rostersTimer = null;

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
  if (!rosters || typeof rosters !== "object") return;

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

