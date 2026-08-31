import {
  User, CheckCircle2, AlertTriangle, Droplets, Wrench, Lock, XCircle,
  Laptop, Monitor, Mouse, Headphones, Cable, Wifi
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
    label: "Reservado",
    color: "#0EA5E9",        // Celeste / Sky Cyan
    soft: "#E0F2FE",
    badgeBg: "#0284C7",
    textDark: "#0369A1",
    border: "#38BDF8",
    icon: Lock
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
];

export const HISTORIAL_MOCK = excelData.movements && excelData.movements.length > 0
  ? excelData.movements
  : [
      { id: "mov-1", fecha: "25/07/2026", equipo: "MAUSE", espacio: 84, accion: "Cambio", origen: "84", destino: "140", falla: "Falla en scroll", obs: "Funciona posterior a periodo de inactividad" }
    ];

// Generador de espacios a partir del inventario real de Excel
export function buildInitialSpaces() {
  if (excelData.inventory && excelData.inventory.length === 140) {
    return excelData.inventory.map((inv) => ({
      ...inv,
      modelo: inv.modelo || (inv.marca ? `${inv.marca === "DELL" ? "OptiPlex 3080" : inv.marca === "LENOVO" ? "ThinkCentre M70q" : "EliteDesk 800"}` : null),
      activoPc: inv.activoPc || (inv.marca ? `PC-${1000 + inv.id}` : null),
      monitor: inv.monitor || (inv.marca ? { activo: `MON-${2000 + inv.id}`, marca: inv.marca } : null),
    }));
  }

  // Fallback si no está el archivo
  const list = [];
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
  return list;
}
