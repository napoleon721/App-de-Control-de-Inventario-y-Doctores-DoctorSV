import React, { useState } from "react";
import { X, Save, PlusCircle, PackagePlus, ArrowDownRight } from "lucide-react";
import { BODEGA_TIPOS } from "../../constants/tokens";

export default function MovementModal({ onClose, onRegister, spaces = [], bodegaStock = [], initialData = {} }) {
  const [equipo, setEquipo] = useState(initialData.equipo || "PC");
  const [accion, setAccion] = useState(initialData.accion || "Reemplazo");
  const [cantidad, setCantidad] = useState(initialData.cantidad || 1);
  const defaultSpace = initialData.espacio !== undefined ? initialData.espacio : (spaces[0]?.id || "");
  const [espacio, setEspacio] = useState(defaultSpace);
  const [origen, setOrigen] = useState(
    initialData.origen || (initialData.accion === "Ingreso" ? "PROVEEDOR" : "BODEGA")
  );
  const [destino, setDestino] = useState(
    initialData.destino ||
      (initialData.accion === "Ingreso"
        ? "BODEGA"
        : defaultSpace
        ? `Puesto #${defaultSpace}`
        : "Puesto")
  );
  const [falla, setFalla] = useState(initialData.falla || "");
  const [obs, setObs] = useState(initialData.obs || "");

  const isIngreso = accion === "Ingreso";

  const curStock = React.useMemo(() => {
    if (!bodegaStock || !Array.isArray(bodegaStock)) return 0;
    const match = bodegaStock.find(
      (b) => b.key === equipo || (equipo === "MAUSE" && b.key === "MOUSE") || (equipo === "MOUSE" && b.key === "MAUSE")
    );
    return match?.actual ?? 0;
  }, [bodegaStock, equipo]);

  function handleAccionChange(newAccion) {
    setAccion(newAccion);
    if (newAccion === "Ingreso") {
      setOrigen("PROVEEDOR");
      setDestino("BODEGA");
      setEspacio("");
    } else if (newAccion === "Retiro") {
      const sp = espacio || spaces[0]?.id || 1;
      setOrigen(sp ? `Puesto #${sp}` : "Puesto");
      setDestino("BODEGA");
      if (!espacio && spaces.length > 0) setEspacio(spaces[0].id);
    } else if (newAccion === "Reemplazo" || newAccion === "Reintegro" || newAccion === "Cambio") {
      setOrigen("BODEGA");
      const sp = espacio || spaces[0]?.id || 1;
      setDestino(sp ? `Puesto #${sp}` : "Puesto");
      if (!espacio && spaces.length > 0) setEspacio(spaces[0].id);
    } else if (newAccion === "Traslado") {
      const sp = espacio || spaces[0]?.id || 1;
      setOrigen(sp ? `Puesto #${sp}` : "Puesto");
      setDestino("");
      if (!espacio && spaces.length > 0) setEspacio(spaces[0].id);
    } else if (newAccion === "Mantenimiento") {
      const sp = espacio || spaces[0]?.id || 1;
      setOrigen(sp ? `Puesto #${sp}` : "Puesto");
      setDestino("TALLER");
      if (!espacio && spaces.length > 0) setEspacio(spaces[0].id);
    }
  }

  function handleEspacioChange(newSp) {
    setEspacio(newSp);
    if (!newSp) return;
    if (accion === "Reemplazo" || accion === "Reintegro" || accion === "Cambio") {
      setDestino(`Puesto #${newSp}`);
    } else if (accion === "Retiro" || accion === "Traslado" || accion === "Mantenimiento") {
      setOrigen(`Puesto #${newSp}`);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const qty = Math.max(1, parseInt(cantidad, 10) || 1);

    if (!isIngreso && String(origen || "").toUpperCase().includes("BODEGA") && curStock < qty) {
      if (
        !window.confirm(
          `⚠️ Existencias Bajas en Bodega:\n\nActualmente hay ${curStock} unidad(es) de ${equipo} en Bodega, y estás registrando una salida de ${qty} unidad(es).\n\n¿Deseas registrar este movimiento de todas formas?`
        )
      ) {
        return;
      }
    }

    const newMovement = {
      id: `mov-${Date.now()}`,
      fecha: new Date().toLocaleDateString("es-SV", { day: "2-digit", month: "2-digit", year: "numeric" }),
      equipo,
      tipo: equipo,
      cantidad: qty,
      accion,
      espacio: isIngreso || !espacio ? null : (Number(espacio) || espacio),
      spaceId: isIngreso || !espacio ? null : (Number(espacio) || espacio),
      origen: isIngreso ? (origen.trim() || "PROVEEDOR") : origen.trim(),
      destino: isIngreso ? "BODEGA" : destino.trim(),
      falla: falla.trim() || (isIngreso ? "Ingreso de stock nuevo" : "N/A"),
      obs: obs.trim() || (isIngreso ? `Ingreso de ${qty} unidad(es) de ${equipo} a Bodega` : "Sin observaciones adicionales"),
    };

    onRegister(newMovement);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "popIn .2s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200"
      >
        {/* Header in DoctorSV Gradient */}
        <div
          className="flex items-center justify-between px-6 py-4 text-white"
          style={{
            background: isIngreso
              ? "linear-gradient(135deg, #065F46 0%, #059669 60%, #10B981 100%)"
              : "linear-gradient(135deg, #003487 0%, #0048B5 60%, #0095FF 100%)",
          }}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-md">
              {isIngreso ? <PackagePlus size={18} /> : <PlusCircle size={18} />}
            </span>
            <div>
              <p className="font-heading text-[16px] font-bold">
                {isIngreso ? "Ingreso de Stock a Bodega" : "Registrar Movimiento de Hardware"}
              </p>
              <p className="text-[11.5px] text-white/80">
                {isIngreso
                  ? "Suma inventario directamente a las existencias centrales"
                  : "Actualizará el stock de bodega y la bitácora médica"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Hardware
                </label>
                <span className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded ${curStock > 0 ? "text-[#0048B5] bg-blue-50" : "text-rose-700 bg-rose-50"}`}>
                  Bodega: {curStock}
                </span>
              </div>
              <select
                value={equipo}
                onChange={(e) => setEquipo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-medium shadow-2xs"
              >
                {BODEGA_TIPOS.map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.key} — {b.label}
                  </option>
                ))}
                <option value="EQUIPO COMPLETO">EQUIPO COMPLETO</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Tipo de Operación
              </label>
              <select
                value={accion}
                onChange={(e) => handleAccionChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-medium shadow-2xs"
              >
                <option value="Ingreso">Ingreso de stock nuevo</option>
                <option value="Reemplazo">Reemplazo por falla</option>
                <option value="Retiro">Retiro a bodega</option>
                <option value="Traslado">Traslado entre puestos</option>
                <option value="Mantenimiento">Mantenimiento preventivo/correctivo</option>
                <option value="Reintegro">Reintegro a operación</option>
                <option value="Cambio">Cambio de componente</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {isIngreso ? "Cantidad a Ingresar" : "Cantidad"}
              </label>
              <input
                type="number"
                min="1"
                max="999"
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-mono-data font-bold text-slate-800 shadow-2xs focus:border-[#0095FF] focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Banner visual para Ingreso */}
          {isIngreso && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/75 p-3 text-[12px] text-emerald-800 flex items-center gap-2.5 shadow-2xs">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-600 text-white shrink-0 font-mono-data font-bold text-xs shadow-xs">
                +{cantidad}
              </span>
              <div>
                <p className="font-bold text-emerald-950">Entrada a Bodega Central</p>
                <p className="text-[11px] text-emerald-800">
                  Se sumarán <b>{cantidad} unidad{cantidad > 1 ? "es" : ""}</b> de <b>{equipo}</b> al stock de bodega. <b>No requiere asignar puesto.</b>
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Puesto Afectado
                </label>
                {isIngreso && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-md">
                    No aplica
                  </span>
                )}
              </div>
              {isIngreso ? (
                <input
                  type="text"
                  disabled
                  value="N/A (Directo a Bodega)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-100/75 px-3 py-2 text-[12px] font-medium text-slate-400 italic cursor-not-allowed"
                />
              ) : (
                <select
                  value={espacio}
                  onChange={(e) => handleEspacioChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-mono-data font-semibold text-[#0048B5]"
                >
                  <option value="">(Sin puesto específico)</option>
                  {spaces.map((s) => (
                    <option key={s.id} value={s.id}>
                      Puesto #{s.id} ({s.estado})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Origen
              </label>
              <input
                type="text"
                value={origen}
                onChange={(e) => setOrigen(e.target.value)}
                placeholder={isIngreso ? "Ej. PROVEEDOR, COMPRA, DONACIÓN" : "Ej. BODEGA o #44"}
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12.5px] shadow-2xs focus:border-[#0095FF] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Destino
              </label>
              <input
                type="text"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                placeholder="Ej. BODEGA o #132"
                required
                className={`w-full rounded-xl border border-slate-200 px-3 py-2 text-[12.5px] shadow-2xs focus:border-[#0095FF] focus:outline-none ${
                  isIngreso ? "bg-slate-50 font-bold text-emerald-700" : ""
                }`}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isIngreso ? "Motivo o Detalle de Ingreso" : "Motivo o Falla Detectada"}
            </label>
            <input
              type="text"
              value={falla}
              onChange={(e) => setFalla(e.target.value)}
              placeholder={
                isIngreso
                  ? "Ej. Lote nuevo recibido, reposición preventiva, compra autorizada..."
                  : "Ej. Falla en scroll, problemas de red, mantenimiento programado..."
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12.5px] shadow-2xs focus:border-[#0095FF] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Observaciones Adicionales
            </label>
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              rows={2}
              placeholder={
                isIngreso
                  ? "Número de factura, proveedor, orden de compra o estado del paquete..."
                  : "Detalles sobre el técnico responsable, ticket de soporte o reemplazo..."
              }
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-[12.5px] shadow-2xs focus:border-[#0095FF] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl px-5 py-2 text-[12.5px] font-semibold text-white transition hover:brightness-110 shadow-sm"
              style={{
                background: isIngreso
                  ? "linear-gradient(135deg, #059669 0%, #10B981 100%)"
                  : "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)",
              }}
            >
              {isIngreso ? (
                <>
                  <ArrowDownRight size={15} /> Ingresar +{cantidad} a Bodega
                </>
              ) : (
                <>
                  <Save size={14} /> Registrar en Sistema
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
