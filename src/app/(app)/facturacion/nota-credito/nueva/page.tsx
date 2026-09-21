"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X, Send } from "lucide-react";
import { Card, Badge } from "@/components/ui";
import { useData } from "@/lib/store";
import { api, apiFacturasE } from "@/lib/api";
import { dinero, hoyPeru, fecha } from "@/lib/format";
import type { Factura } from "@/lib/types";

const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const lbl = "mb-1 block text-sm font-medium text-slate-700";
const num = (v: string) => Number(String(v).replace(",", ".") || 0);

type Linea = { descripcion: string; cantidad: number; valorUnitario: number };

// Catálogo 09 SUNAT — motivos de nota de crédito.
const MOTIVOS_NC: { code: string; label: string }[] = [
  { code: "01", label: "01 — Anulación de la operación" },
  { code: "02", label: "02 — Anulación por error en el RUC" },
  { code: "03", label: "03 — Corrección por error en la descripción" },
  { code: "04", label: "04 — Descuento global" },
  { code: "05", label: "05 — Descuento por ítem" },
  { code: "06", label: "06 — Devolución total" },
  { code: "07", label: "07 — Devolución por ítem" },
  { code: "08", label: "08 — Bonificación" },
  { code: "09", label: "09 — Disminución en el valor" },
  { code: "10", label: "10 — Otros conceptos" },
];

export default function NotaCreditoPage() {
  const router = useRouter();
  const { facturas, reload } = useData();

  // Solo se puede acreditar un comprobante ACEPTADO por SUNAT (factura o boleta), no una NC.
  const acreditables = useMemo(
    () => facturas.filter((f) => (f.estadoDocumento === "102" || f.estadoDocumento === "103") && f.tipo !== "N. Crédito"),
    [facturas],
  );

  const [facturaId, setFacturaId] = useState("");
  const base = facturas.find((f) => f.id === facturaId) || null;
  const [codTipNc, setCodTipNc] = useState("01");
  const [motivo, setMotivo] = useState("");
  const [fechaEmision, setFechaEmision] = useState(hoyPeru());
  const [moneda, setMoneda] = useState("PEN"); // PEN | USD (por defecto la de la factura de origen)
  const [tipoCambio, setTipoCambio] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // Al elegir la factura, precarga sus líneas (por defecto NC de devolución/anulación total).
  useEffect(() => {
    if (!base) { setLineas([]); return; }
    const items = base.items?.length
      ? base.items.map((i) => ({ descripcion: i.descripcion, cantidad: i.cantidad ?? 1, valorUnitario: i.valorUnitario ?? 0 }))
      : [{ descripcion: `ANULACIÓN ${base.serie}-${base.correlativo}`, cantidad: 1, valorUnitario: base.monto || 0 }];
    setLineas(items);
    setMotivo((m) => m || "ANULACION DE LA OPERACION");
    // La NC hereda la moneda y el tipo de cambio de la factura de origen (editable).
    setMoneda(base.moneda === "USD" ? "USD" : "PEN");
    setTipoCambio(base.tipoCambio ? String(base.tipoCambio) : "");
  }, [facturaId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setLinea = (i: number, patch: Partial<Linea>) => setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const agregar = () => setLineas((ls) => [...ls, { descripcion: "", cantidad: 1, valorUnitario: 0 }]);
  const quitar = (i: number) => setLineas((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : ls));
  const gravado = Math.round(lineas.reduce((s, l) => s + (l.valorUnitario || 0) * (l.cantidad || 1), 0) * 100) / 100;
  const igv = Math.round(gravado * 0.18 * 100) / 100;
  const total = Math.round((gravado + igv) * 100) / 100;

  async function crearYEmitir() {
    if (!base) { setMsg("Elige la factura a la que se le hará la nota de crédito."); return; }
    if (!base.correlativo) { setMsg("La factura seleccionada no tiene número; no se puede referenciar."); return; }
    const items = lineas.filter((l) => l.descripcion.trim() || l.valorUnitario).map((l) => ({ descripcion: l.descripcion, cantidad: l.cantidad || 1, valorUnitario: l.valorUnitario || 0 }));
    if (!items.length || items.some((l) => l.valorUnitario <= 0)) { setMsg("Cada línea debe tener descripción y un valor mayor a 0."); return; }
    setBusy(true); setMsg("");
    try {
      const body = {
        tipo: "N. Crédito",
        cliente: base.cliente, ruc: base.ruc || "-", direccion: base.direccion || "",
        fecha: fechaEmision, viaje: base.viaje || "-",
        monto: gravado, igv, estadoSunat: "Emitida",
        moneda, tipoCambio: moneda === "USD" && tipoCambio ? Number(tipoCambio) : 0,
        items,
        // Referencia al comprobante que se acredita
        docRefTipo: base.tipo === "Boleta" ? "03" : "01",
        docRefSerie: base.serie,
        docRefCorrelativo: base.correlativo,
        codTipNc,
        motivo: motivo.trim() || "ANULACION DE LA OPERACION",
      };
      const creada = await api.post<Factura>("/facturas", body);
      const r = await apiFacturasE.emitir(creada.id);
      const e = r.respuesta;
      await reload();
      alert(e.estado_documento === "102" ? `✅ Nota de crédito aceptada por SUNAT: ${e.sunat_description}` : `Estado ${e.estado_documento || "?"}: ${e.errors || e.sunat_description || "sin detalle"}`);
      router.push("/facturacion/nota-credito");
    } catch (e) {
      setMsg((e as Error).message || "No se pudo emitir la nota de crédito.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={() => router.push("/facturacion")} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600"><ArrowLeft size={16} /> Volver a notas de crédito</button>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Nueva nota de crédito</h1>
      <p className="mt-1 text-sm text-slate-500">Se emite sobre una factura (o boleta) ya aceptada por SUNAT. Elige el comprobante, el motivo y confirma.</p>

      <Card className="mt-5 p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Comprobante a acreditar</h2>
        <label className="block"><span className={lbl}>Factura / boleta (aceptada)</span>
          <select className={inp} value={facturaId} onChange={(e) => setFacturaId(e.target.value)}>
            <option value="">Elige el comprobante…</option>
            {acreditables.map((f) => (
              <option key={f.id} value={f.id}>{f.serie}-{f.correlativo} · {f.cliente} · {dinero(f.total || f.monto + f.igv, f.moneda)}</option>
            ))}
          </select>
        </label>
        {acreditables.length === 0 ? <p className="mt-2 text-xs text-amber-600">No hay comprobantes aceptados por SUNAT para acreditar.</p> : null}
        {base ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <Badge tone="gray">{base.tipo}</Badge>
            <span className="font-semibold text-slate-800">{base.serie}-{base.correlativo}</span>
            <span className="text-slate-500">{base.cliente} · {base.ruc}</span>
            <span className="ml-auto tabular font-semibold">{dinero(base.total || base.monto + base.igv, base.moneda)}</span>
          </div>
        ) : null}
      </Card>

      {base ? (
        <>
          <Card className="mt-4 p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Motivo</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label><span className={lbl}>Tipo (catálogo SUNAT)</span>
                <select className={inp} value={codTipNc} onChange={(e) => setCodTipNc(e.target.value)}>
                  {MOTIVOS_NC.map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}
                </select>
              </label>
              <label><span className={lbl}>Fecha de emisión</span><input type="date" className={inp} value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} /></label>
              <label><span className={lbl}>Moneda</span>
                <select className={inp} value={moneda} onChange={(e) => setMoneda(e.target.value)}>
                  <option value="PEN">Soles (S/)</option>
                  <option value="USD">Dólares (US$)</option>
                </select>
              </label>
              {moneda === "USD" ? (
                <label><span className={lbl}>Tipo de cambio (S/ por US$)</span><input type="number" step="any" min="0" className={inp} value={tipoCambio} onChange={(e) => setTipoCambio(e.target.value)} placeholder="3.750" /></label>
              ) : null}
              <label className="sm:col-span-2"><span className={lbl}>Descripción / sustento</span><input className={inp} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="ANULACION DE LA OPERACION" /></label>
            </div>
          </Card>

          <Card className="mt-4 p-5">
            <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-500">Líneas de la nota de crédito</h2>
            <p className="mb-3 text-xs text-slate-400">Vienen de la factura (devolución/anulación total). Edítalas para una nota parcial.</p>
            <div className="space-y-2">
              {lineas.map((l, i) => (
                <div key={i} className="flex items-start gap-2">
                  <input value={l.descripcion} onChange={(e) => setLinea(i, { descripcion: e.target.value })} placeholder="Descripción" className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-brand-500" />
                  <input type="number" step="any" min="0" value={l.cantidad} onChange={(e) => setLinea(i, { cantidad: num(e.target.value) })} title="Cantidad" className="w-16 rounded-md border border-slate-200 px-2 py-1.5 text-right text-sm tabular outline-none focus:border-brand-500" />
                  <input type="number" step="any" min="0" value={l.valorUnitario || ""} onChange={(e) => setLinea(i, { valorUnitario: num(e.target.value) })} placeholder="0.00" title="Valor unitario (sin IGV)" className="w-28 rounded-md border border-slate-200 px-2 py-1.5 text-right text-sm tabular outline-none focus:border-brand-500" />
                  <button onClick={() => quitar(i)} title="Quitar" className="mt-1 rounded p-1 text-slate-400 hover:text-rose-600"><X size={16} /></button>
                </div>
              ))}
            </div>
            <button onClick={agregar} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600"><Plus size={14} /> Agregar línea</button>
            <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Monto gravado</span><span className="tabular font-medium">{dinero(gravado, moneda)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">IGV (18%)</span><span className="tabular font-medium">{dinero(igv, moneda)}</span></div>
              <div className="flex justify-between border-t border-slate-100 pt-1.5"><span className="font-semibold text-slate-700">Total NC</span><span className="tabular font-bold">{dinero(total, moneda)}</span></div>
            </div>
          </Card>

          <div className="mt-5 flex items-center gap-3">
            <button disabled={busy} onClick={crearYEmitir} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
              <Send size={16} /> {busy ? "Emitiendo…" : "Crear y emitir nota de crédito"}
            </button>
            <button onClick={() => router.push("/facturacion")} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
          </div>
        </>
      ) : null}

      {msg ? <p className="mt-3 text-sm text-rose-600">{msg}</p> : null}
    </div>
  );
}
