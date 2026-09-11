import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";

const SEDE_ID = "san-miguel";

let isFirestoreAvailable = true;

/**
 * Escucha cambios en tiempo real del plano de espacios desde Firestore
 */
export function subscribeToCloudSpaces(onUpdate, onError) {
  try {
    const docRef = doc(db, "sedes", SEDE_ID, "estado", "spaces");
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && Array.isArray(data.list)) {
            onUpdate(data.list);
          }
        }
      },
      (error) => {
        isFirestoreAvailable = false;
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    isFirestoreAvailable = false;
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Guarda los espacios en Firestore con control de fallos
 */
export async function saveCloudSpaces(spaces) {
  if (!isFirestoreAvailable) return;
  try {
    const docRef = doc(db, "sedes", SEDE_ID, "estado", "spaces");
    await setDoc(docRef, {
      list: spaces,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    // Si la base de datos aún no está creada en la consola, se omite silenciosamente para no interrumpir el flujo local
  }
}

/**
 * Escucha cambios en tiempo real del stock de bodega
 */
export function subscribeToCloudBodega(onUpdate, onError) {
  try {
    const docRef = doc(db, "sedes", SEDE_ID, "estado", "bodega");
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && Array.isArray(data.list)) {
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
 * Guarda el inventario de bodega en Firestore
 */
export async function saveCloudBodega(bodegaStock) {
  if (!isFirestoreAvailable) return;
  try {
    const docRef = doc(db, "sedes", SEDE_ID, "estado", "bodega");
    await setDoc(docRef, {
      list: bodegaStock,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {}
}

/**
 * Escucha cambios en tiempo real del historial de auditoría
 */
export function subscribeToCloudHistorial(onUpdate, onError) {
  try {
    const docRef = doc(db, "sedes", SEDE_ID, "estado", "historial");
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && Array.isArray(data.list)) {
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
 * Guarda el historial en Firestore
 */
export async function saveCloudHistorial(historial) {
  if (!isFirestoreAvailable) return;
  try {
    const docRef = doc(db, "sedes", SEDE_ID, "estado", "historial");
    await setDoc(docRef, {
      list: historial.slice(0, 100), // Guardar los 100 movimientos más recientes
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {}
}
