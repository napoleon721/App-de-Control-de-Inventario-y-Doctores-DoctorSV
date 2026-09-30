import {
  User, CheckCircle2, AlertTriangle, Droplets, Wrench, Lock, XCircle,
  Laptop, Monitor, Mouse, Headphones, Cable, Wifi, Shield
} from "lucide-react";
import excelData from "./excelData.json";

/* ============================================================
   TOKENS — Paleta Oficial DoctorSV + Estados Exactos del Mapa
   ============================================================ */
export const BRAND = {
  blue: "#0048B5",
  blueDark: "#003487",
  blueLight: "#EBF3FF",
  cyan: "#0095FF",
  cyanLight: "#E0F2FE",
  cyanDark: "#0284C7",
  navy: "#0F172A",
  slate: "#334155",
  muted: "#64748B",
  surface: "#F8FAFC",
  border: "#CBD5E1",
  card: "#FFFFFF",
};

export const ESTADOS = {
  DISPONIBLE: {
    label: "Disponible",
    color: "#15803D",        // Verde bosque oscuro oficial
    soft: "#DCFCE7",
    badgeBg: "#166534",
    textDark: "#14532D",
    border: "#22C55E",
    icon: CheckCircle2
  },
  INCOMPLETO: {
    label: "Incompleto",
    color: "#CA8A04",        // Amarillo mostaza
    soft: "#FEF9C3",
    badgeBg: "#CA8A04",
    textDark: "#854D0E",
    border: "#EAB308",
    icon: AlertTriangle
  },
  INHABILITADO: {
    label: "Inhabilitado por filtración",
    color: "#2563EB",        // Azul real
    soft: "#DBEAFE",
    badgeBg: "#1D4ED8",
    textDark: "#1E40AF",
    border: "#3B82F6",
    icon: Droplets
  },
  VACIO: {
    label: "Vacío sin equipo",
    color: "#E11D48",        // Rojo salmón / Coral
    soft: "#FFE4E6",
    badgeBg: "#BE123C",
    textDark: "#9F1239",
    border: "#FB7185",
    icon: XCircle
  },
  REPARACION: {
    label: "Reparación",
    color: "#9333EA",        // Morado / Púrpura
    soft: "#F3E8FF",
    badgeBg: "#7E22CE",
    textDark: "#6B21A8",
    border: "#C084FC",
    icon: Wrench
  },
  RESERVADO: {
    label: "Reservado / Supervisión",
    color: "#0EA5E9",        // Celeste / Sky Cyan
    soft: "#E0F2FE",
    badgeBg: "#0284C7",
    textDark: "#0369A1",
    border: "#38BDF8",
    icon: Shield
  },
  OCUPADO: {
    label: "Ocupado con Médico",
    color: "#0048B5",        // Doctor Blue
    soft: "#EFF6FF",
    badgeBg: "#0048B5",
    textDark: "#1E3A8A",
    border: "#60A5FA",
    icon: User
  },
};

export const MARCAS = ["DELL", "LENOVO", "HP"];

export const HORARIOS = [
  "06:00 AM – 02:00 PM",
  "07:00 AM – 12:00 PM",
  "08:00 AM – 12:00 MD",
  "12:00 MD – 06:00 PM",
  "02:00 PM – 06:00 PM",
  "02:00 PM – 10:00 PM",
  "04:00 PM – 10:00 PM",
  "06:00 PM – 10:00 PM",
];

// Supervisores Oficiales extraídos de las tablas del Excel
export const SUPERVISORES_OFICIALES = [
  { id: "sup-1", nombre: "EMERSON JOSUE VIGIL HERNANDEZ", correo: "emerson.vigil@doctorsv.gob.sv", puesto: 135, rol: "Supervisor Médico (Turno Mañana)", bloqueInicio: 37, bloqueFin: 76, totalPuestos: 40, horario: "06:00 AM – 02:00 PM" },
  { id: "sup-2", nombre: "SALVADOR RENDEROS BONILLA", correo: "salvador.renderos@doctorsv.gob.sv", puesto: 136, rol: "Supervisor Médico (Turno Tarde)", bloqueInicio: 71, bloqueFin: 104, totalPuestos: 34, horario: "02:00 PM – 10:00 PM" },
  { id: "sup-3", nombre: "ALFREDO ISAAC MARTINEZ AMAYA", correo: "alfredo.martinez@doctorsv.gob.sv", puesto: 137, rol: "Supervisor Médico (Turno Intermedio)", bloqueInicio: 1, bloqueFin: 36, totalPuestos: 36, horario: "08:00 AM – 12:00 MD" },
  { id: "sup-4", nombre: "ROXANA GUADALUPE CANALES RODRIGUEZ", correo: "roxana.canales@doctorsv.gob.sv", puesto: 138, rol: "Supervisora Médica", bloqueInicio: 105, bloqueFin: 140, totalPuestos: 36, horario: "07:00 AM – 12:00 PM" },
  { id: "sup-5", nombre: "EDWARD JOSUE ZELAYA PRUDENCIO", correo: "edward.zelaya@doctorsv.gob.sv", puesto: 139, rol: "Supervisor de Control & Acceso", bloqueInicio: 1, bloqueFin: 40, totalPuestos: 40, horario: "02:00 PM – 10:00 PM" },
];

// Datos reales extraídos directamente de los archivos Excel oficiales
export const DOCTORES_EXCEL = excelData.doctors || [];
export const STAFF_EXCEL = excelData.staff || [];
export const DOCTORES_MOCK = DOCTORES_EXCEL.map((d) => d.nombre);

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const BODEGA_TIPOS = [
  { key: "PC", label: "Computadoras", icon: Laptop, original: 1, actual: 1 },
  { key: "MAUSE", label: "Mouse óptico", icon: Mouse, original: 10, actual: 2 },
  { key: "HUB", label: "Hub USB-C", icon: Cable, original: 0, actual: 0 },
  { key: "MONITOR", label: "Monitores", icon: Monitor, original: 0, actual: 0 },
  { key: "CABLES", label: "Cables Ethernet", icon: Wifi, original: 1, actual: 1 },
  { key: "HEADSET", label: "Auriculares / Headsets", icon: Headphones, original: 0, actual: 0 },
];

export const HISTORIAL_MOCK = excelData.movements && excelData.movements.length > 0
  ? excelData.movements
  : [
      { id: "mov-1", fecha: "25/07/2026", equipo: "MAUSE", espacio: 84, accion: "Cambio", origen: "84", destino: "140", falla: "Falla en scroll", obs: "Funciona posterior a periodo de inactividad" }
    ];

// Generador de espacios a partir del inventario real de Excel con los puestos exactos de supervisión
export function buildInitialSpaces() {
  let list = [];
  if (excelData.inventory && excelData.inventory.length >= 140) {
    list = excelData.inventory.slice(0, 140).map((inv) => {
      let doctor = inv.doctor || null;
      let categoria = inv.categoria || null;
      let observaciones = inv.observaciones || "";

      // Mapeo exacto de los puestos de supervisión y administrativos identificados en las tablas
      if (inv.id === 135) {
        doctor = "EMERSON JOSUE VIGIL HERNANDEZ (Supervisor)";
        categoria = "Supervisores";
        observaciones = "PUESTO DE SUPERVISIÓN MÉDICA (Ajuste administrativo - Traslado desde Puesto 42)";
      } else if (inv.id === 136) {
        doctor = "SALVADOR RENDEROS BONILLA (Supervisor)";
        categoria = "Supervisores";
        observaciones = "PUESTO DE SUPERVISIÓN MÉDICA (Ajuste administrativo - Traslado desde Puesto 43)";
      } else if (inv.id === 137) {
        doctor = "ALFREDO ISAAC MARTINEZ AMAYA (Supervisor)";
        categoria = "Supervisores";
        observaciones = "PUESTO DE SUPERVISIÓN MÉDICA (Ajuste administrativo - Traslado desde Puesto 45)";
      } else if (inv.id === 138) {
        doctor = "ROXANA GUADALUPE CANALES RODRIGUEZ (Supervisora)";
        categoria = "Supervisores";
        observaciones = "PUESTO DE SUPERVISIÓN MÉDICA (Ajuste administrativo - Traslado desde Puesto 44)";
      } else if (inv.id === 139) {
        doctor = "EDWARD JOSUE ZELAYA PRUDENCIO (Supervisor de Control)";
        categoria = "Supervisores";
        observaciones = "ESTACIÓN DE CONTROL DE ACCESO Y SUPERVISIÓN (Puesto Reservado)";
      }

      return {
        ...inv,
        doctor,
        categoria,
        observaciones,
        modelo: inv.modelo || (inv.marca ? `${inv.marca === "DELL" ? "OptiPlex 3080" : inv.marca === "LENOVO" ? "ThinkCentre M70q" : "EliteDesk 800"}` : null),
        activoPc: inv.activoPc || (inv.marca ? `PC-${1000 + inv.id}` : null),
        monitor: inv.monitor || (inv.marca ? { activo: `MON-${2000 + inv.id}`, marca: inv.marca } : null),
      };
    });
  } else {
    for (let i = 1; i <= 140; i++) {
      list.push({
        id: i,
        estado: "DISPONIBLE",
        marca: "DELL",
        modelo: "OptiPlex 3080",
        activoPc: `PC-${1000 + i}`,
        monitor: { marca: "DELL", activo: `MON-${2000 + i}` },
        mouse: true,
        headset: true,
        hub: true,
        observaciones: "",
        ultimoMovimiento: "29/08/2026",
        doctor: null,
        horario: null,
      });
    }
  }

  // 30 nuevos puestos (141 al 170):
  // Módulo Anexo 1: 141 al 154 (7x2 = 14 puestos)
  // Módulo Anexo 2: 155 al 170 (8x2 = 16 puestos)
  for (let i = 141; i <= 170; i++) {
    const isAnexo1 = i <= 154;
    list.push({
      id: i,
      modulo: isAnexo1 ? "Módulo Anexo 1 (7×2)" : "Módulo Anexo 2 (8×2)",
      puesto: String(i),
      estado: "DISPONIBLE",
      marca: "DELL",
      modelo: "OptiPlex 3080",
      activoPc: `PC-${1000 + i}`,
      monitor: { marca: "DELL", activo: `MON-${2000 + i}` },
      mouse: true,
      headset: true,
      hub: true,
      observaciones: isAnexo1 ? "Módulo Anexo 1 · Puestos 141 - 154 (7×2)" : "Módulo Anexo 2 · Puestos 155 - 170 (8×2)",
      ultimoMovimiento: "17/09/2026",
      doctor: null,
      horario: null,
    });
  }

  return list;
}

/**
 * Asegura que una lista de puestos contenga siempre los 170 espacios
 */
export function ensureAllSpaces(existingList) {
  const fullDefaults = buildInitialSpaces();
  if (!Array.isArray(existingList) || existingList.length === 0) return fullDefaults;
  const map = new Map(existingList.map((s) => [Number(s.id), s]));
  return fullDefaults.map((def) => map.get(Number(def.id)) || def);
}

// Nombres normalizados de los 5 supervisores para excluir de nóminas clínicas operativas
const SUPERVISORES_NOMBRES_NORM = SUPERVISORES_OFICIALES.map((s) =>
  s.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
);

/**
 * Obtiene la lista depurada de médicos operativos de Servicios Profesionales (excluyendo puestos de supervisión)
 */
export function getOperativeSPDoctors(doctorsList = DOCTORES_EXCEL) {
  return (doctorsList || []).filter((d) => {
    if (d.grupo !== "Servicios Profesionales") return false;
    const norm = (d.nombre || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    return !SUPERVISORES_NOMBRES_NORM.some((s) => norm.includes(s) || s.includes(norm));
  });
}

/**
 * Bloques Oficiales de Servicios Profesionales (SP) distribuidos por supervisor y franja vespertina/nocturna:
 * - Bloque 1 (Emerson · sup-1 · 02:00 PM – 10:00 PM): 40 médicos (Lote Puestos #37 al #76)
 * - Bloque 2 (Salvador · sup-2 · 04:00 PM – 10:00 PM): 34 médicos (Lote Puestos #71 al #104)
 * - Bloque 3 (Alfredo · sup-3 · 06:00 PM – 10:00 PM): 36 médicos (Lote Puestos #1 al #36)
 * - Bloque 4 (Reserva / Rotativo): 26 médicos restantes
 */
export function getSPBlocks(doctorsList = DOCTORES_EXCEL) {
  const operativeSP = getOperativeSPDoctors(doctorsList);
  const b1 = operativeSP.slice(0, 40);
  const b2 = operativeSP.slice(40, 74);
  const b3 = operativeSP.slice(74, 110);
  const bReserva = operativeSP.slice(110);

  return {
    "sup-1": {
      id: "sup-1",
      key: "SP_EMERSON",
      label: "SP Bloque 1 (Emerson)",
      shortLabel: "SP Emerson",
      supervisorNombre: "EMERSON JOSUE VIGIL HERNANDEZ",
      horario: "02:00 PM – 10:00 PM",
      puestos: "Puestos #37 al #76",
      total: b1.length,
      doctors: b1,
      doctorNames: b1.map((d) => d.nombre),
      doctorNamesSet: new Set(b1.map((d) => d.nombre)),
    },
    "sup-2": {
      id: "sup-2",
      key: "SP_SALVADOR",
      label: "SP Bloque 2 (Salvador)",
      shortLabel: "SP Salvador",
      supervisorNombre: "SALVADOR RENDEROS BONILLA",
      horario: "04:00 PM – 10:00 PM",
      puestos: "Puestos #71 al #104",
      total: b2.length,
      doctors: b2,
      doctorNames: b2.map((d) => d.nombre),
      doctorNamesSet: new Set(b2.map((d) => d.nombre)),
    },
    "sup-3": {
      id: "sup-3",
      key: "SP_ALFREDO",
      label: "SP Bloque 3 (Alfredo)",
      shortLabel: "SP Alfredo",
      supervisorNombre: "ALFREDO ISAAC MARTINEZ AMAYA",
      horario: "06:00 PM – 10:00 PM",
      puestos: "Puestos #1 al #36",
      total: b3.length,
      doctors: b3,
      doctorNames: b3.map((d) => d.nombre),
      doctorNamesSet: new Set(b3.map((d) => d.nombre)),
    },
    "reserva": {
      id: "reserva",
      key: "SP_RESERVA",
      label: "SP Bloque 4 (Reserva)",
      shortLabel: "SP Reserva",
      supervisorNombre: "Médicos de Reserva / Rotación",
      horario: "Turno Rotativo",
      puestos: "Pool de Reserva",
      total: bReserva.length,
      doctors: bReserva,
      doctorNames: bReserva.map((d) => d.nombre),
      doctorNamesSet: new Set(bReserva.map((d) => d.nombre)),
    },
  };
}
