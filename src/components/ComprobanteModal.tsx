"use client";

import { useState } from "react";
import { Plus, Send, FileDown, RefreshCw, Ban, Mail, X, Pencil, Eye } from "lucide-react";
import { Badge } from "./ui";
import { apiFacturasE, downloadBase64, type EmisorConfig, type CuentaBancaria } from "@/lib/api";
import { soles, dinero, fecha } from "@/lib/format";
import type { Factura, FacturaItem } from "@/lib/types";
import { FacturaPreview, type PreviewData } from "./FacturaPreview";

type Tone = "gray" | "amber" | "green" | "blue" | "red";
export const ESTADO_DOC: Record<string, { label: string; tone: Tone }> = {
  "": { label: "Sin emitir", tone: "gray" },
  "101": { label: "En proceso", tone: "amber" },
  "102": { label: "Aceptado", tone: "green" },
  "103": { label: "Aceptado c/obs", tone: "blue" },
  "104": { label: "Rechazado", tone: "red" },
  "105": { label: "Anulado", tone: "red" },
  "108": { label: "Baja", tone: "red" },
};
export const estDoc = (f: Factura) => ESTADO_DOC[f.estadoDocumento || ""] || ESTADO_DOC[""];

function Dato({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm"><span className="text-slate-500">{k}</span><span className="break-words text-right font-medium text-slate-800">{v}</span></div>;
}

const num = (v: string) => Number(String(v).replace(",", ".") || 0);

// Forma de pago legible (Contado, o Crédito N días con su vencimiento).
function condPago(f: Factura): string {
  if ((f.formaPago || "Contado") !== "Credito" || !f.fechaVencimiento) return "Contado";
  const dias = Math.max(0, Math.round((new Date(f.fechaVencimiento).getTime() - new Date(String(f.fecha)).getTime()) / 86_400_000));
  return `Crédito ${dias} días · vence ${fecha(f.fechaVencimiento)}`;
}

export function ComprobanteModal({ f, listo, emisor = null, cuentas = [], onClose, onChanged, onEdit }: { f: Factura; listo: boolean; emisor?: EmisorConfig | null; cuentas?: CuentaBancaria[]; onClose: () => void; onChanged: () => void; onEdit?: () => void }) {
  const [busy, setBusy] = useState("");
  const [verPrevia, setVerPrevia] = useState(false);
  const est = estDoc(f);
  const emitido = !!f.estadoDocumento;
  const aceptado = f.estadoDocumento === "102" || f.estadoDocumento === "103";
  const mon = f.moneda === "USD" ? "USD" : "PEN";
  const tc = f.tipoCambio || 0;
  // Editable mientras no esté aceptado ni anulado (sin emitir o rechazado).
  const editable = !emitido || f.estadoDocumento === "104";

  // Líneas editables mientras el comprobante no esté emitido. Si no hay guardadas,
  // se arranca con una línea a partir del monto/tarifa del viaje.
  const [lineas, setLineas] = useState<FacturaItem[]>(() =>
    f.items?.length ? f.items.map((i) => ({ ...i })) : [{ descripcion: `SERVICIO DE TRANSPORTE${f.viaje && f.viaje !== "-" ? " " + f.viaje : ""}`.trim(), cantidad: 1, valorUnitario: f.monto || 0 }],
  );
  const setLinea = (i: number, patch: Partial<FacturaItem>) => setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const agregar = () => setLineas((ls) => [...ls, { descripcion: "", cantidad: 1, valorUnitario: 0 }]);
  const quitar = (i: number) => setLineas((ls) => ls.filter((_, j) => j !== i));
  const lineasPayload = () => lineas.filter((l) => l.descripcion.trim() || l.valorUnitario).map((l) => ({ descripcion: l.descripcion, cantidad: l.cantidad || 1, valorUnitario: l.valorUnitario || 0 }));
  const gravadoL = Math.round(lineas.reduce((s, l) => s + (l.valorUnitario || 0) * (l.cantidad || 1), 0) * 100) / 100;
  const igvL = Math.round(gravadoL * 0.18 * 100) / 100;
  const totalL = Math.round((gravadoL + igvL) * 100) / 100;

  // Total y neto a pagar (total − detracción). La detracción ya viene calculada por el
  // backend en la MONEDA del comprobante, así que se resta directo.
  const totalMonto = emitido ? f.total || f.monto + f.igv : totalL;
  const detr = f.montoDetraccion || 0;
  const neto = Math.round((totalMonto - detr) * 100) / 100;

  const previewData: PreviewData = {
    tipo: f.tipo, serie: f.serie, correlativo: f.correlativo, fecha: String(f.fecha).slice(0, 10),
    moneda: mon, tipoCambio: f.tipoCambio,
    cliente: f.cliente, ruc: f.ruc, direccion: f.direccion,
    lineas: (emitido ? f.items || [] : lineas).map((l) => ({ descripcion: l.descripcion, cantidad: l.cantidad || 1, valorUnitario: l.valorUnitario || 0 })),
    formaPago: f.formaPago, fechaVencimiento: f.fechaVencimiento,
    guia: f.guia, guiaTransportista: f.guiaTransportista, referencia: f.referenciaVR, detalleViaje: f.detalleViaje,
    valorReferencial: f.valorReferencial, ubigeoOrigen: f.ubigeoOrigen, ubigeoDestino: f.ubigeoDestino,
    docRef: f.docRefSerie ? `${f.docRefSerie}-${f.docRefCorrelativo}` : undefined,
    montoDetraccion: f.montoDetraccion, sujetoDetraccion: f.sujetoDetraccion, ctaDetraccion: f.ctaDetraccion,
  };

  async function correr(nombre: string, fn: () => Promise<unknown>, refrescar = true) {
    setBusy(nombre);
    try { await fn(); if (refrescar) onChanged(); }
    catch (e) { alert((e as Error).message || "No se pudo completar la operación."); }
    finally { setBusy(""); }
  }
  const guardarLineas = () => correr("lineas", () => apiFacturasE.actualizar(f.id, { items: lineasPayload(), monto: gravadoL }));
  const emitir = () => correr("emitir", async () => {
    // SUNAT no acepta precios unitarios en 0: se avisa antes de enviar.
    const pay = lineasPayload();
    if (!pay.length || pay.some((l) => (l.valorUnitario || 0) <= 0)) {
      throw new Error("Hay líneas con valor unitario en 0. Ponles la tarifa/valor (edita la línea) antes de emitir.");
    }
    // Se persisten las líneas actuales antes de emitir, para que el comprobante use lo editado.
    if (!emitido) await apiFacturasE.actualizar(f.id, { items: lineasPayload(), monto: gravadoL });
    const r = await apiFacturasE.emitir(f.id);
    const e = r.respuesta;
    alert(e.estado_documento === "102" ? `✅ Aceptado por SUNAT: ${e.sunat_description}` : `Estado ${e.estado_documento || "?"}: ${e.errors || e.sunat_description || "sin detalle"}`);
  });
  const estado = () => correr("estado", () => apiFacturasE.estado(f.id));
  const anular = () => { const m = prompt("Motivo de la anulación:"); if (m) correr("anular", () => apiFacturasE.anular(f.id, m)); };
  const correo = () => { const c = prompt("Correo del cliente:"); if (c) correr("correo", async () => { const r = await apiFacturasE.correo(f.id, c); alert(r.mensaje); }, false); };
  const pdf = () => correr("pdf", async () => { const p = await apiFacturasE.pdf(f.id); downloadBase64(p.nombre, p.mime, p.base64); }, false);
  const xml = () => correr("xml", async () => { const x = await apiFacturasE.xml(f.id); downloadBase64(x.nombre, x.mime, x.base64); }, false);

  const btn = "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50";
  return (
    <>
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-6" onClick={onClose}>
      <div className="mt-8 w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{f.serie}{f.correlativo ? `-${f.correlativo}` : ""}</h2>
              <Badge tone={f.tipo === "N. Crédito" ? "red" : f.tipo === "N. Débito" ? "amber" : "gray"}>{f.tipo}</Badge>
              <Badge tone={est.tone}>{est.label}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">{f.cliente} · {fecha(f.fecha)}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="px-6 py-3">
          <Dato k="RUC / DNI" v={f.ruc} />
          {mon === "USD" ? <Dato k="Moneda" v={`Dólares (US$)${tc > 0 ? ` · T.C. ${tc.toFixed(3)}` : ""}`} /> : null}
          {f.docRefSerie ? <Dato k="Afecta a" v={`${f.docRefSerie}-${f.docRefCorrelativo}`} /> : null}

          {!emitido ? (
            <div className="my-3">
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Líneas del comprobante</div>
              <div className="space-y-2">
                {lineas.map((l, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={l.descripcion} onChange={(e) => setLinea(i, { descripcion: e.target.value })} placeholder="Descripción del servicio" className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand-500" />
                    <input type="number" step="any" min="0" value={l.cantidad ?? 1} onChange={(e) => setLinea(i, { cantidad: num(e.target.value) })} title="Cantidad" className="w-14 rounded-md border border-slate-200 px-2 py-1 text-right text-sm tabular outline-none focus:border-brand-500" />
                    <input type="number" step="any" min="0" value={l.valorUnitario || ""} onChange={(e) => setLinea(i, { valorUnitario: num(e.target.value) })} placeholder="0.00" title="Valor unitario (sin IGV)" className="w-24 rounded-md border border-slate-200 px-2 py-1 text-right text-sm tabular outline-none focus:border-brand-500" />
                    {lineas.length > 1 ? <button onClick={() => quitar(i)} title="Quitar" className="rounded p-1 text-slate-400 hover:text-rose-600"><X size={15} /></button> : <span className="w-6" />}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <button onClick={agregar} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600"><Plus size={13} /> Agregar línea</button>
                <button disabled={!!busy} onClick={guardarLineas} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50">{busy === "lineas" ? "Guardando…" : "Guardar líneas"}</button>
              </div>
            </div>
          ) : null}

          <Dato k="Monto gravado" v={dinero(emitido ? (f.gravado || f.monto) : gravadoL, mon)} />
          <Dato k="IGV (18%)" v={dinero(emitido ? f.igv : igvL, mon)} />
          <Dato k="Total" v={<b>{dinero(totalMonto, mon)}</b>} />
          {f.sujetoDetraccion ? <Dato k="Detracción (4%)" v={<span className="text-rose-500">−{dinero(detr, mon)} · cta {f.ctaDetraccion || "—"}</span>} /> : null}
          {f.sujetoDetraccion ? <Dato k="Neto a pagar" v={<b className="text-emerald-700">{dinero(neto, mon)}</b>} /> : null}
          {f.valorReferencial ? <Dato k="Valor referencial" v={soles(f.valorReferencial)} /> : null}
          {/* Desglose: de qué servicio (viaje) sale cada parte del valor referencial. */}
          {(f.serviciosVR?.length ?? 0) > 1 ? (
            <Dato k="Por servicio" v={
              <>
                {f.serviciosVR!.map((s, i) => (
                  <span key={s.id || i} className="flex justify-between gap-3 font-normal">
                    <span className="min-w-0 truncate text-slate-500">{s.detalle || `Servicio ${i + 1}`}</span>
                    <span className="tabular shrink-0">{soles(s.valor)}</span>
                  </span>
                ))}
              </>
            } />
          ) : null}

          {/* Toda la información del comprobante */}
          {f.moneda === "USD" ? <Dato k="Moneda" v={`Dólares (US$)${tc ? ` · T.C. ${tc.toFixed(3)}` : ""}`} /> : null}
          <Dato k="Forma de pago" v={condPago(f)} />
          {f.guia ? <Dato k="Guía remitente" v={f.guia} /> : null}
          {f.guiaTransportista ? <Dato k="Guía transportista" v={f.guiaTransportista} /> : null}
          {f.referenciaVR ? <Dato k="Orden / referencia" v={f.referenciaVR} /> : null}
          {f.detalleViaje ? <Dato k="Detalle del viaje" v={f.detalleViaje} /> : null}
          {f.ubigeoOrigen || f.ubigeoDestino ? <Dato k="Ubigeo origen → destino" v={`${f.ubigeoOrigen || "—"} → ${f.ubigeoDestino || "—"}`} /> : null}

          {f.hash ? <Dato k="Hash" v={<span className="tabular text-xs">{f.hash}</span>} /> : null}
          {f.qr ? <Dato k="Cadena QR" v={<span className="tabular break-all text-xs text-slate-500">{f.qr}</span>} /> : null}
          {f.sunatDescripcion ? <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{f.sunatDescripcion}</div> : null}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-200 px-6 py-4">
          <button disabled={!!busy} onClick={() => setVerPrevia(true)} className={`${btn} border border-slate-300 bg-white text-slate-600 hover:border-brand-300`}><Eye size={15} /> Previa</button>
          {editable && onEdit ? (
            <button disabled={!!busy} onClick={onEdit} title="Editar todos los datos (cliente, RUC, ubigeos de detracción, valor referencial, etc.)" className={`${btn} border border-slate-300 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-600`}>
              <Pencil size={15} /> Editar
            </button>
          ) : null}
          {editable ? (
            <button disabled={!!busy || !listo} onClick={emitir} title={listo ? "" : "Configura y activa el emisor primero"} className={`${btn} flex-1 justify-center bg-brand-500 text-white hover:bg-brand-600`}>
              <Send size={15} /> {busy === "emitir" ? "Emitiendo…" : "Emitir a SUNAT"}
            </button>
          ) : (
            <button disabled={!!busy} onClick={pdf} className={`${btn} flex-1 justify-center bg-brand-500 text-white hover:bg-brand-600`}><FileDown size={15} /> {busy === "pdf" ? "…" : "Descargar PDF"}</button>
          )}
          {emitido ? <button disabled={!!busy} onClick={estado} className={`${btn} border border-slate-300 bg-white text-slate-600 hover:border-brand-300`}><RefreshCw size={15} /> Estado</button> : null}
          {aceptado ? <button disabled={!!busy} onClick={xml} className={`${btn} border border-slate-300 bg-white text-slate-600 hover:border-brand-300`}><FileDown size={15} /> {busy === "xml" ? "…" : "XML"}</button> : null}
          {aceptado ? <button disabled={!!busy} onClick={correo} className={`${btn} border border-slate-300 bg-white text-slate-600 hover:border-brand-300`}><Mail size={15} /> Correo</button> : null}
          {aceptado ? <button disabled={!!busy} onClick={anular} className={`${btn} border border-slate-300 bg-white text-rose-600 hover:bg-rose-50`}><Ban size={15} /> Anular</button> : null}
        </div>
      </div>
    </div>
    {verPrevia ? <FacturaPreview emisor={emisor} cuentas={cuentas.map((c) => ({ banco: c.banco, moneda: c.moneda, numero: c.numero, cci: c.cci }))} data={previewData} onClose={() => setVerPrevia(false)} /> : null}
    </>
  );
}
