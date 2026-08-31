import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  LayoutGrid, Warehouse, Stethoscope, FileClock, Bell, Search,
  RefreshCw, X, Laptop, Monitor, Mouse, Headphones, Cable, Wifi,
  CheckCircle2, XCircle, AlertTriangle, Droplets, Wrench, Lock,
  User, ChevronRight, Sheet as SheetIcon, LogIn, DoorOpen, Plus,
  Save, History, TrendingUp, TrendingDown, Minus, Filter,
} from "lucide-react";

/* ============================================================
   TOKENS — paleta Coca-Cola: rojo/negro/crema/dorado + estados
   ============================================================ */
const CC = {
  red: "#E30513",
  redDark: "#970310",
  black: "#121010",
  charcoal: "#1E1B1B",
  cream: "#F4EDE0",
  paper: "#FBF7EF",
  gold: "#C9A15A",
};

const ESTADOS = {
  OCUPADO:     { label: "Ocupado",          color: "#E30513", soft: "#FCE4E4", icon: User },
  DISPONIBLE:  { label: "Disponible",       color: "#1E8E5A", soft: "#E1F3EA", icon: CheckCircle2 },
  INCOMPLETO:  { label: "Incompleto",       color: "#D9971C", soft: "#FBF0DC", icon: AlertTriangle },
  INHABILITADO:{ label: "Inhabilitado",     color: "#2563A8", soft: "#E1EBF7", icon: Droplets },
  VACIO:       { label: "Vacío sin equipo", color: "#6B6560", soft: "#EDEBE8", icon: XCircle },
  REPARACION:  { label: "Reparación",       color: "#7C4DAA", soft: "#EEE6F6", icon: Wrench },
  RESERVADO:   { label: "Reservado",        color: "#C9A15A", soft: "#F6EEDC", icon: Lock },
};

const MARCAS = ["DELL", "LENOVO", "HP"];
const HORARIOS = [
  "6:00 AM – 2:00 PM", "8:00 AM – 12:00 MD", "2:00 PM – 6:00 PM",
  "2:00 PM – 10:00 PM", "4:00 PM – 10:00 PM", "6:00 PM – 10:00 PM",
];
const DOCTORES_MOCK = [
  "Dr. Ana Beatriz Molina", "Dr. Carlos Ernesto Pineda", "Dra. Daniela Reyes Cortez",
  "Dr. Emerson Iván Salazar", "Dra. Fátima Nohemy Rauda", "Dr. Gerardo Alas Cuéllar",
  "Dra. Heidy Lisseth Gómez", "Dr. Iván Mauricio Chávez", "Dra. Jocelyn Paola Turcios",
  "Dr. Kevin Orlando Mejía", "Dra. Lourdes Marisol Peña", "Dr. Mario Nelson Amaya",
];

// generador determinista simple (mulberry32) — mock reproducible
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(42);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

function pickEstado() {
  const r = rnd();
  if (r < 0.32) return "OCUPADO";
  if (r < 0.72) return "DISPONIBLE";
  if (r < 0.83) return "VACIO";
  if (r < 0.90) return "INHABILITADO";
  if (r < 0.95) return "RESERVADO";
  if (r < 0.98) return "REPARACION";
  return "INCOMPLETO";
}

function buildSpaces(n = 140) {
  const list = [];
  let docIdx = 0;
  for (let i = 1; i <= n; i++) {
    const estado = pickEstado();
    const conPc = estado !== "VACIO";
    const marca = conPc ? pick(MARCAS) : null;
    list.push({
      id: i,
      estado,
      marca,
      modelo: conPc ? `${marca === "DELL" ? "OptiPlex 3080" : marca === "LENOVO" ? "ThinkCentre M70q" : "EliteDesk 800"}` : null,
      activoPc: conPc ? `PC-${String(1000 + i)}` : null,
      monitor: conPc && rnd() > 0.08 ? { marca: pick(MARCAS), activo: `MON-${String(2000 + i)}` } : null,
      mouse: conPc ? rnd() > 0.06 : false,
      headset: conPc ? rnd() > 0.5 : false,
      hub: conPc ? rnd() > 0.6 : false,
      observaciones: estado === "INHABILITADO" ? "Se traslada por filtraciones de techo."
        : estado === "INCOMPLETO" ? "Falta monitor asignado."
        : estado === "REPARACION" ? "IT realizando mantenimiento de hub." : "",
      ultimoMovimiento: `${(1 + Math.floor(rnd() * 28))}/08/2026`,
      doctor: estado === "OCUPADO" ? DOCTORES_MOCK[docIdx++ % DOCTORES_MOCK.length] : null,
      horario: estado === "OCUPADO" ? pick(HORARIOS) : null,
    });
  }
  return list;
}

const HISTORIAL_MOCK = [
  { fecha: "25/07/2026", equipo: "MOUSE", espacio: 84, accion: "Cambio", origen: 84, destino: 140, falla: "Falla en scroll", obs: "Funciona posterior a periodo de inactividad" },
  { fecha: "28/07/2026", equipo: "MOUSE", espacio: 70, accion: "Reemplazo", origen: "BODEGA", destino: 70, falla: "Falla en scroll", obs: "Se sustituye unidad por una nueva de respaldo" },
  { fecha: "29/07/2026", equipo: "PC", espacio: 132, accion: "Reintegro", origen: "Reparación", destino: 132, falla: "N/A", obs: "Reintegro de equipo en reparación" },
  { fecha: "30/07/2026", equipo: "PC", espacio: 44, accion: "Traslado", origen: 44, destino: 138, falla: "N/A", obs: "Ajuste de espacios administrativos" },
  { fecha: "30/07/2026", equipo: "EQUIPO PARCIAL", espacio: 140, accion: "Traslado", origen: 140, destino: 28, falla: "N/A", obs: "Optimización de espacios (se mueve PC, mouse, hub, headset)" },
  { fecha: "01/08/2026", equipo: "HUB", espacio: 46, accion: "Mantenimiento", origen: 46, destino: "—", falla: "Falla interna de pieza", obs: "IT realizando mantenimiento" },
  { fecha: "03/08/2026", equipo: "PC", espacio: 111, accion: "Retiro", origen: 111, destino: "BODEGA", falla: "Filtración de techo", obs: "Se traslada por filtraciones" },
];

const BODEGA_TIPOS = [
  { key: "PC", icon: Laptop, original: 5, actual: 1 },
  { key: "MOUSE", icon: Mouse, original: 10, actual: 2 },
  { key: "HEADSET", icon: Headphones, original: 5, actual: 0 },
  { key: "HUB", icon: Cable, original: 5, actual: 0 },
  { key: "MONITOR", icon: Monitor, original: 5, actual: 0 },
  { key: "ETHERNET", icon: Wifi, original: 3, actual: 1 },
];

/* ============================================================ */

function TiltCard({ children, className = "" }) {
  const ref = useRef(null);
  const onMove = useCallback((e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(700px) rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg) translateZ(6px)`;
  }, []);
  const onLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = "perspective(700px) rotateX(0) rotateY(0) translateZ(0)";
  }, []);
  return (
    <div
      ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      className={`transition-transform duration-150 ease-out will-change-transform ${className}`}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </div>
  );
}

function KpiCard({ label, value, tone, Icon, trend }) {
  return (
    <TiltCard className="rounded-2xl">
      <div
        className="relative overflow-hidden rounded-2xl border p-4 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)]"
        style={{ background: `linear-gradient(155deg, ${CC.paper}, #fff)`, borderColor: "#E7DFCF" }}
      >
        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-10" style={{ background: tone }} />
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">{label}</span>
          <Icon size={16} style={{ color: tone }} />
        </div>
        <div className="mt-1 flex items-end gap-2">
          <span className="font-[Oswald] text-3xl font-bold tracking-tight" style={{ color: CC.black }}>{value}</span>
          {trend != null && (
            <span className={`mb-1 flex items-center text-[11px] font-semibold ${trend >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>
    </TiltCard>
  );
}

function Pill({ estado }) {
  const e = ESTADOS[estado]; const Icon = e.icon;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: e.soft, color: e.color }}
    >
      <Icon size={11} /> {e.label}
    </span>
  );
}

function SpaceTile({ s, index, onClick }) {
  const e = ESTADOS[s.estado]; const Icon = e.icon;
  return (
    <button
      onClick={() => onClick(s)}
      style={{
        animation: `riseIn .5s ease both`,
        animationDelay: `${Math.min(index * 6, 500)}ms`,
        borderColor: e.color,
        background: `linear-gradient(160deg, ${e.soft}, #fff)`,
      }}
      className="group relative flex h-[74px] w-full flex-col justify-between rounded-lg border-2 p-1.5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:scale-[1.06] hover:shadow-[0_10px_18px_-8px_rgba(0,0,0,0.35)] hover:z-10"
    >
      <div className="flex items-center justify-between">
        <span className="font-[Oswald] text-sm font-bold leading-none" style={{ color: CC.black }}>{s.id}</span>
        <Icon size={13} style={{ color: e.color }} />
      </div>
      {s.marca ? (
        <div className="flex items-center gap-1 text-[9.5px] font-semibold text-stone-600">
          <Laptop size={10} /> {s.marca}
        </div>
      ) : (
        <div className="text-[9.5px] font-semibold text-stone-400">— — —</div>
      )}
      <div className="truncate text-[9px] font-medium text-stone-500">
        {s.doctor ? s.doctor.replace("Dr. ", "").replace("Dra. ", "") : e.label}
      </div>
      <span
        className="pointer-events-none absolute inset-0 rounded-lg opacity-0 ring-2 ring-offset-1 transition-opacity duration-200 group-hover:opacity-100"
        style={{ boxShadow: `0 0 0 2px ${e.color}55` }}
      />
    </button>
  );
}

function SectionCard({ icon: Icon, title, subtitle, children, right }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: CC.black }}>
            <Icon size={15} color={CC.cream} />
          </span>
          <div>
            <h3 className="font-[Oswald] text-[15px] font-semibold leading-tight text-stone-900">{title}</h3>
            {subtitle && <p className="text-[11.5px] text-stone-500">{subtitle}</p>}
          </div>
        </div>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ============================================================ */

export default function App() {
  const [spaces, setSpaces] = useState(buildSpaces());
  const [tab, setTab] = useState("mapa");
  const [selected, setSelected] = useState(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filterEstado, setFilterEstado] = useState("TODOS");

  const counts = useMemo(() => {
    const c = Object.fromEntries(Object.keys(ESTADOS).map((k) => [k, 0]));
    spaces.forEach((s) => (c[s.estado] += 1));
    return c;
  }, [spaces]);

  const pieData = Object.keys(ESTADOS).map((k) => ({ name: ESTADOS[k].label, value: counts[k], color: ESTADOS[k].color }));

  const brandData = MARCAS.map((m) => ({
    marca: m,
    "En uso": spaces.filter((s) => s.marca === m && s.estado === "OCUPADO").length,
    "Disponible": spaces.filter((s) => s.marca === m && s.estado === "DISPONIBLE").length,
    "Reparación": spaces.filter((s) => s.marca === m && s.estado === "REPARACION").length,
  }));

  const totalesEquipo = BODEGA_TIPOS.map((t) => {
    const enUso = t.key === "PC" ? spaces.filter((s) => ["OCUPADO", "DISPONIBLE", "INCOMPLETO", "RESERVADO"].includes(s.estado) && s.marca).length
      : t.key === "MONITOR" ? spaces.filter((s) => s.monitor).length
      : t.key === "MOUSE" ? spaces.filter((s) => s.mouse).length
      : t.key === "HEADSET" ? spaces.filter((s) => s.headset).length
      : t.key === "HUB" ? spaces.filter((s) => s.hub).length
      : Math.max(0, spaces.filter((s) => s.marca).length - 4);
    const reparacion = spaces.filter((s) => s.estado === "REPARACION").length;
    return { ...t, enUso, reparacion, total: enUso + reparacion + t.actual };
  });

  const alerts = useMemo(() => {
    const list = [];
    if (counts.INHABILITADO) list.push({ tone: ESTADOS.INHABILITADO.color, Icon: Droplets, text: `${counts.INHABILITADO} espacios inhabilitados por filtraciones` });
    if (counts.INCOMPLETO) list.push({ tone: ESTADOS.INCOMPLETO.color, Icon: AlertTriangle, text: `${counts.INCOMPLETO} espacio(s) con equipo incompleto` });
    if (counts.REPARACION) list.push({ tone: ESTADOS.REPARACION.color, Icon: Wrench, text: `${counts.REPARACION} equipo(s) en reparación / mantenimiento` });
    const bajoStock = BODEGA_TIPOS.filter((b) => b.actual <= 1);
    if (bajoStock.length) list.push({ tone: CC.red, Icon: Warehouse, text: `Stock bajo en bodega: ${bajoStock.map((b) => b.key).join(", ")}` });
    return list;
  }, [counts]);

  const filteredSpaces = spaces.filter((s) => {
    const matchesQuery = query.trim() === "" ||
      String(s.id).includes(query) ||
      (s.doctor && s.doctor.toLowerCase().includes(query.toLowerCase())) ||
      (s.marca && s.marca.toLowerCase().includes(query.toLowerCase()));
    const matchesEstado = filterEstado === "TODOS" || s.estado === filterEstado;
    return matchesQuery && matchesEstado;
  });

  const zonaA = filteredSpaces.filter((s) => s.id <= 70);
  const zonaB = filteredSpaces.filter((s) => s.id > 70);

  function updateSelected(patch) {
    setSpaces((prev) => prev.map((s) => (s.id === selected.id ? { ...s, ...patch } : s)));
    setSelected((prev) => ({ ...prev, ...patch }));
  }

  const availableForAssign = spaces.filter((s) => s.estado === "DISPONIBLE");

  return (
    <div className="min-h-screen w-full" style={{ background: CC.cream, fontFamily: "'Manrope', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap');
        .font-\\[Oswald\\] { font-family: 'Oswald', sans-serif; }
        .font-mono-data { font-family: 'JetBrains Mono', monospace; }
        @keyframes riseIn { from { opacity: 0; transform: translateY(8px) scale(.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn { from { opacity: 0; transform: scale(.94) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        ::-webkit-scrollbar { height: 8px; width: 8px; }
        ::-webkit-scrollbar-thumb { background: #D8CDB4; border-radius: 8px; }
      `}</style>

      {/* ===== TOP BAR ===== */}
      <header className="sticky top-0 z-40 border-b" style={{ background: CC.black, borderColor: CC.redDark }}>
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${CC.red}, ${CC.gold}, ${CC.red})` }} />
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2" style={{ borderColor: CC.red, background: CC.charcoal }}>
              <Stethoscope size={17} color={CC.red} />
            </div>
            <div>
              <h1 className="font-[Oswald] text-[17px] font-bold leading-none tracking-wide text-white">TM&nbsp;·&nbsp;SEDE&nbsp;SAN&nbsp;MIGUEL</h1>
              <p className="text-[11px] font-medium text-white/50">Control de espacios &amp; inventario · Maqueta</p>
            </div>
          </div>

          <nav className="hidden items-center gap-1 rounded-xl bg-white/5 p-1 md:flex">
            {[
              { id: "mapa", label: "Mapa de espacios", icon: LayoutGrid },
              { id: "bodega", label: "Inventario bodega", icon: Warehouse },
              { id: "medicos", label: "Médicos & horarios", icon: Stethoscope },
              { id: "historial", label: "Historial", icon: FileClock },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-all duration-150"
                style={{
                  color: tab === t.id ? CC.black : "rgba(255,255,255,.65)",
                  background: tab === t.id ? CC.cream : "transparent",
                }}
              >
                <t.icon size={13} /> {t.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button className="hidden items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-[12px] font-semibold text-white/80 transition hover:border-white/40 hover:text-white sm:flex">
              <SheetIcon size={13} style={{ color: "#3FA24C" }} /> Google Sheet <LogIn size={11} className="opacity-60" />
            </button>
            <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white transition hover:brightness-110" style={{ background: CC.red }}>
              <RefreshCw size={12} /> Sincronizar
            </button>
            <div className="relative">
              <button onClick={() => setAlertOpen((v) => !v)} className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/80 transition hover:bg-white/10">
                <Bell size={15} />
                {alerts.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ background: CC.red }}>
                    {alerts.length}
                  </span>
                )}
              </button>
              {alertOpen && (
                <div style={{ animation: "slideDown .18s ease both" }} className="absolute right-0 top-11 w-80 rounded-xl border border-stone-200 bg-white p-2 shadow-2xl">
                  <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-stone-400">Alertas activas</p>
                  {alerts.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg px-2 py-2 text-[12.5px] text-stone-700 hover:bg-stone-50">
                      <a.Icon size={14} style={{ color: a.tone, marginTop: 2 }} />
                      <span>{a.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* mobile tabs */}
        <div className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden">
          {[
            { id: "mapa", label: "Mapa", icon: LayoutGrid },
            { id: "bodega", label: "Bodega", icon: Warehouse },
            { id: "medicos", label: "Médicos", icon: Stethoscope },
            { id: "historial", label: "Historial", icon: FileClock },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-[11.5px] font-semibold"
              style={{ background: tab === t.id ? CC.cream : "transparent", color: tab === t.id ? CC.black : "rgba(255,255,255,.65)" }}>
              <t.icon size={12} /> {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 py-6">
        {/* ===== KPI ROW ===== */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          <KpiCard label="Total espacios" value={spaces.length} tone={CC.black} Icon={LayoutGrid} />
          {Object.keys(ESTADOS).map((k) => (
            <KpiCard key={k} label={ESTADOS[k].label} value={counts[k]} tone={ESTADOS[k].color} Icon={ESTADOS[k].icon} />
          ))}
        </div>

        {tab === "mapa" && (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
            <div className="flex flex-col gap-5">
              <SectionCard
                icon={LayoutGrid} title="Mapa de espacios — Sede San Miguel" subtitle="Clic en un espacio para ver detalle y editar estado"
                right={
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5">
                      <Search size={12} className="text-stone-400" />
                      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar # / médico / marca"
                        className="w-40 bg-transparent text-[12px] outline-none placeholder:text-stone-400" />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-2 py-1.5">
                      <Filter size={12} className="text-stone-400" />
                      <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="bg-transparent text-[12px] outline-none">
                        <option value="TODOS">Todos los estados</option>
                        {Object.keys(ESTADOS).map((k) => <option key={k} value={k}>{ESTADOS[k].label}</option>)}
                      </select>
                    </div>
                  </div>
                }
              >
                <div className="flex flex-col gap-6">
                  <div>
                    <div className="mb-2 flex justify-center">
                      <span className="flex items-center gap-1.5 rounded-md px-4 py-1 text-[11px] font-bold tracking-widest text-white" style={{ background: CC.gold }}>
                        <DoorOpen size={12} /> ENTRADA
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-7 md:grid-cols-10">
                      {zonaA.map((s, i) => <SpaceTile key={s.id} s={s} index={i} onClick={setSelected} />)}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-widest text-stone-400">Zona B</p>
                    <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-7 md:grid-cols-10">
                      {zonaB.map((s, i) => <SpaceTile key={s.id} s={s} index={i} onClick={setSelected} />)}
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {["SALIDA", "SALIDA", "SALIDA"].map((t, i) => (
                      <span key={i} className="flex items-center gap-1.5 rounded-md border-2 px-4 py-1 text-[11px] font-bold tracking-widest text-stone-600" style={{ borderColor: "#CFE3D3" }}>
                        <DoorOpen size={12} /> {t}
                      </span>
                    ))}
                  </div>
                </div>
              </SectionCard>
            </div>

            <div className="flex flex-col gap-5">
              <SectionCard icon={TrendingUp} title="Distribución por estado" subtitle="Actualizado en tiempo real">
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2}>
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} stroke="#fff" strokeWidth={1.5} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1.5">
                  {Object.keys(ESTADOS).map((k) => (
                    <div key={k} className="flex items-center gap-1.5 text-[11px] text-stone-600">
                      <span className="h-2 w-2 rounded-full" style={{ background: ESTADOS[k].color }} /> {ESTADOS[k].label} · {counts[k]}
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard icon={Laptop} title="Equipos por marca" subtitle="En uso / disponible / reparación">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={brandData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis dataKey="marca" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="En uso" fill={CC.red} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Disponible" fill="#1E8E5A" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Reparación" fill="#7C4DAA" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </SectionCard>
            </div>
          </div>
        )}

        {tab === "bodega" && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <SectionCard icon={Warehouse} title="Inventario de bodega" subtitle="Original vs. actual según movimientos">
              <div className="flex flex-col divide-y divide-stone-100">
                {BODEGA_TIPOS.map((b) => {
                  const delta = b.actual - b.original;
                  return (
                    <div key={b.key} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: CC.cream }}>
                          <b.icon size={15} style={{ color: CC.redDark }} />
                        </span>
                        <span className="font-[Oswald] text-[13.5px] font-semibold text-stone-800">{b.key}</span>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <p className="text-[10px] uppercase text-stone-400">Original</p>
                          <p className="font-mono-data text-[13px] font-semibold text-stone-500">{b.original}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-stone-400">Actual</p>
                          <p className="font-mono-data text-[13px] font-bold" style={{ color: CC.black }}>{b.actual}</p>
                        </div>
                        <span className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${delta < 0 ? "bg-rose-50 text-rose-600" : delta > 0 ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-500"}`}>
                          {delta < 0 ? <TrendingDown size={11} /> : delta > 0 ? <TrendingUp size={11} /> : <Minus size={11} />} {delta}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-stone-300 py-2 text-[12px] font-semibold text-stone-500 transition hover:border-stone-400 hover:text-stone-700">
                <Plus size={13} /> Registrar movimiento (Reemplazo / Cambio / Traslado / Reintegro / Retiro / Mantenimiento / Ingreso)
              </button>
            </SectionCard>

            <SectionCard icon={LayoutGrid} title="Totales de equipos" subtitle="Según estado: en uso, reparación, bodega">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12.5px]">
                  <thead>
                    <tr className="border-b border-stone-200 text-[10.5px] uppercase tracking-wide text-stone-400">
                      <th className="pb-2">Equipo</th>
                      <th className="pb-2 text-right">En uso</th>
                      <th className="pb-2 text-right">Reparación</th>
                      <th className="pb-2 text-right">Bodega</th>
                      <th className="pb-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {totalesEquipo.map((t) => (
                      <tr key={t.key} className="border-b border-stone-100">
                        <td className="flex items-center gap-2 py-2.5 font-semibold text-stone-700"><t.icon size={13} style={{ color: CC.redDark }} /> {t.key}</td>
                        <td className="py-2.5 text-right font-mono-data">{t.enUso}</td>
                        <td className="py-2.5 text-right font-mono-data text-violet-600">{t.reparacion}</td>
                        <td className="py-2.5 text-right font-mono-data text-stone-500">{t.actual}</td>
                        <td className="py-2.5 text-right font-mono-data font-bold" style={{ color: CC.black }}>{t.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 rounded-lg p-3 text-[11.5px]" style={{ background: CC.cream, color: CC.charcoal }}>
                Espacio reservado para conectar fórmulas en vivo desde la hoja <b>MOVIMIENTOS DE INVENTARIO</b> de Google Sheets.
              </div>
            </SectionCard>
          </div>
        )}

        {tab === "medicos" && (
          <SectionCard icon={Stethoscope} title="Médicos & horarios" subtitle="Asignación diaria de espacio de trabajo — se alimenta de la hoja de carga diaria">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {HORARIOS.map((h) => (
                <span key={h} className="rounded-full border border-stone-200 px-2.5 py-1 text-[10.5px] font-semibold text-stone-500">{h}</span>
              ))}
            </div>
            <div className="overflow-x-auto rounded-xl border border-stone-100">
              <table className="w-full text-left text-[12.5px]">
                <thead>
                  <tr style={{ background: CC.black }} className="text-[10.5px] uppercase tracking-wide text-white/70">
                    <th className="px-3 py-2.5">Médico</th>
                    <th className="px-3 py-2.5">Horario</th>
                    <th className="px-3 py-2.5">Espacio asignado</th>
                    <th className="px-3 py-2.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {DOCTORES_MOCK.map((d, i) => {
                    const asignado = spaces.find((s) => s.doctor === d);
                    return (
                      <tr key={d} className={i % 2 ? "bg-stone-50/60" : ""}>
                        <td className="flex items-center gap-2 px-3 py-2.5 font-semibold text-stone-700">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: CC.red }}>
                            {d.split(" ").slice(-2).map((p) => p[0]).join("")}
                          </span>
                          {d}
                        </td>
                        <td className="px-3 py-2.5 text-stone-500">{HORARIOS[i % HORARIOS.length]}</td>
                        <td className="px-3 py-2.5">
                          {asignado ? <Pill estado="OCUPADO" /> : <span className="text-[11.5px] text-stone-400">Sin asignar</span>}
                          {asignado && <span className="ml-1 font-mono-data text-[11.5px] font-bold text-stone-600">#{asignado.id}</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white transition hover:brightness-110" style={{ background: CC.charcoal }}>
                            {asignado ? "Reasignar" : "Asignar espacio"} <ChevronRight size={11} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {tab === "historial" && (
          <SectionCard icon={FileClock} title="Historial de movimientos" subtitle="Registro por espacio · activo · origen · destino · falla / observación">
            <div className="overflow-x-auto rounded-xl border border-stone-100">
              <table className="w-full min-w-[820px] text-left text-[12px]">
                <thead>
                  <tr style={{ background: CC.black }} className="text-[10px] uppercase tracking-wide text-white/70">
                    {["Fecha", "Equipo", "Espacio", "Acción", "Origen", "Destino", "Falla", "Observación"].map((h) => (
                      <th key={h} className="px-3 py-2.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HISTORIAL_MOCK.map((m, i) => (
                    <tr key={i} className={i % 2 ? "bg-stone-50/60" : ""}>
                      <td className="px-3 py-2.5 font-mono-data text-stone-500">{m.fecha}</td>
                      <td className="px-3 py-2.5 font-semibold text-stone-700">{m.equipo}</td>
                      <td className="px-3 py-2.5 font-mono-data font-bold" style={{ color: CC.redDark }}>{m.espacio}</td>
                      <td className="px-3 py-2.5"><span className="rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ background: CC.cream, color: CC.charcoal }}>{m.accion}</span></td>
                      <td className="px-3 py-2.5 text-stone-500">{m.origen}</td>
                      <td className="px-3 py-2.5 text-stone-500">{m.destino}</td>
                      <td className="px-3 py-2.5 text-stone-500">{m.falla}</td>
                      <td className="px-3 py-2.5 text-stone-500">{m.obs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="mt-4 flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold text-white transition hover:brightness-110" style={{ background: CC.red }}>
              <Plus size={13} /> Nuevo movimiento
            </button>
          </SectionCard>
        )}

        <footer className="mt-8 flex items-center justify-between rounded-xl border border-dashed border-stone-300 px-4 py-3 text-[11.5px] text-stone-500">
          <span>Maqueta de interfaz — datos de ejemplo. Lista para conectar a Google Sheets vía Firebase Cloud Functions.</span>
          <span className="font-[Oswald] font-semibold" style={{ color: CC.red }}>TM · SM</span>
        </footer>
      </main>

      {/* ===== MODAL DETALLE / EDICIÓN DE ESPACIO ===== */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "popIn .22s cubic-bezier(.2,.9,.3,1.2) both" }}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ background: CC.black }}>
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full font-[Oswald] text-sm font-bold text-white" style={{ background: CC.red }}>
                  {selected.id}
                </span>
                <div>
                  <p className="font-[Oswald] text-[14px] font-semibold text-white">Espacio {selected.id}</p>
                  <p className="text-[11px] text-white/50">Último movimiento: {selected.ultimoMovimiento}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
                <X size={14} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-stone-400">Cambio rápido de estado</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(ESTADOS).map((k) => (
                    <button
                      key={k}
                      onClick={() => updateSelected({ estado: k, doctor: k === "OCUPADO" ? (selected.doctor || pick(DOCTORES_MOCK)) : null })}
                      className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold transition-all duration-150 hover:scale-105"
                      style={{
                        borderColor: ESTADOS[k].color,
                        background: selected.estado === k ? ESTADOS[k].color : "#fff",
                        color: selected.estado === k ? "#fff" : ESTADOS[k].color,
                      }}
                    >
                      <ESTADOS[k].icon size={12} /> {ESTADOS[k].label}
                    </button>
                  ))}
                </div>
              </div>

              {selected.estado === "OCUPADO" && (
                <div className="rounded-xl p-3" style={{ background: ESTADOS.OCUPADO.soft }}>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: CC.redDark }}>Médico / horario</p>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={selected.doctor} onChange={(e) => updateSelected({ doctor: e.target.value })} className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-[12px]">
                      {DOCTORES_MOCK.map((d) => <option key={d}>{d}</option>)}
                    </select>
                    <select value={selected.horario} onChange={(e) => updateSelected({ horario: e.target.value })} className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-[12px]">
                      {HORARIOS.map((h) => <option key={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-stone-100 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-stone-400"><Laptop size={12} /> PC</p>
                  <label className="mb-1 block text-[10.5px] text-stone-400">Marca</label>
                  <select value={selected.marca || ""} onChange={(e) => updateSelected({ marca: e.target.value || null })} className="mb-2 w-full rounded-lg border border-stone-200 px-2 py-1 text-[12px]">
                    <option value="">— Sin PC —</option>
                    {MARCAS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                  <label className="mb-1 block text-[10.5px] text-stone-400">Modelo</label>
                  <input defaultValue={selected.modelo || ""} onBlur={(e) => updateSelected({ modelo: e.target.value })} className="mb-2 w-full rounded-lg border border-stone-200 px-2 py-1 font-mono-data text-[12px]" />
                  <label className="mb-1 block text-[10.5px] text-stone-400">Activo</label>
                  <input defaultValue={selected.activoPc || ""} onBlur={(e) => updateSelected({ activoPc: e.target.value })} className="w-full rounded-lg border border-stone-200 px-2 py-1 font-mono-data text-[12px]" />
                </div>

                <div className="rounded-xl border border-stone-100 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-stone-400"><Monitor size={12} /> Monitor</p>
                  <label className="mb-1 block text-[10.5px] text-stone-400">Marca</label>
                  <select value={selected.monitor?.marca || ""} onChange={(e) => updateSelected({ monitor: e.target.value ? { ...(selected.monitor || {}), marca: e.target.value } : null })} className="mb-2 w-full rounded-lg border border-stone-200 px-2 py-1 text-[12px]">
                    <option value="">— Sin monitor —</option>
                    {MARCAS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                  <label className="mb-1 block text-[10.5px] text-stone-400">Activo</label>
                  <input defaultValue={selected.monitor?.activo || ""} onBlur={(e) => updateSelected({ monitor: selected.monitor ? { ...selected.monitor, activo: e.target.value } : null })} className="w-full rounded-lg border border-stone-200 px-2 py-1 font-mono-data text-[12px]" />

                  <p className="mb-1.5 mt-3 text-[11px] font-bold uppercase tracking-wide text-stone-400">Periféricos</p>
                  <div className="flex flex-wrap gap-2">
                    {[["mouse", Mouse, "Mouse"], ["headset", Headphones, "Headset"], ["hub", Cable, "Hub"]].map(([key, Icon, label]) => (
                      <label key={key} className="flex items-center gap-1 text-[11.5px] text-stone-600">
                        <input type="checkbox" checked={!!selected[key]} onChange={(e) => updateSelected({ [key]: e.target.checked })} className="accent-[#E30513]" />
                        <Icon size={12} /> {label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-stone-400">Observaciones</p>
                <textarea defaultValue={selected.observaciones} onBlur={(e) => updateSelected({ observaciones: e.target.value })} rows={2}
                  className="w-full resize-none rounded-lg border border-stone-200 px-2.5 py-2 text-[12.5px]" placeholder="Sin observaciones" />
              </div>

              <div className="rounded-xl border border-stone-100 p-3">
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-stone-400"><History size={12} /> Historial reciente de este espacio</p>
                <ul className="space-y-1.5">
                  {HISTORIAL_MOCK.filter((h) => h.espacio === selected.id || h.destino === selected.id || h.origen === selected.id).slice(0, 3).map((h, i) => (
                    <li key={i} className="flex items-center gap-2 text-[11.5px] text-stone-500">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: CC.red }} /> {h.fecha} — {h.accion} de {h.equipo}
                    </li>
                  ))}
                  {HISTORIAL_MOCK.filter((h) => h.espacio === selected.id || h.destino === selected.id || h.origen === selected.id).length === 0 && (
                    <li className="text-[11.5px] italic text-stone-400">Sin movimientos registrados aún.</li>
                  )}
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setSelected(null)} className="rounded-lg border border-stone-200 px-4 py-2 text-[12.5px] font-semibold text-stone-500 hover:bg-stone-50">Cerrar</button>
                <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12.5px] font-semibold text-white transition hover:brightness-110" style={{ background: CC.red }}>
                  <Save size={13} /> Guardar cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
