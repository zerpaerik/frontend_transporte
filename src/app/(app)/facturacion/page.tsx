"use client";

import { useEffect, useState } from "react";
import { Plus, ReceiptText, Search, Send, FileDown, RefreshCw, Ban, Mail, X, ShieldCheck, TriangleAlert } from "lucide-react";
import { PageHeader, StatCard, Badge } from "@/components/ui";
import { DataTable, type Column, type Filter } from "@/components/DataTable";
import { FormModal, type Field, type FormValues } from "@/components/FormModal";
import { useData } from "@/lib/store";
import { apiViajePorCodigo, apiEmisor, apiFacturasE, downloadBase64, type EmisorRespuesta } from "@/lib/api";
import { soles, fecha } from "@/lib/format";
import type { Factura, FacturaItem } from "@/lib/types";

type Tone = "gray" | "amber" | "green" | "blue" | "red";
const ESTADO_DOC: Record<string, { label: string; tone: Tone }> = {
  "": { label: "Sin emitir", tone: "gray" },
  "101": { label: "En proceso", tone: "amber" },
  "102": { label: "Aceptado", tone: "green" },
  "103": { label: "Aceptado c/obs", tone: "blue" },
  "104": { label: "Rechazado", tone: "red" },
  "105": { label: "Anulado", tone: "red" },
  "108": { label: "Baja", tone: "red" },
};
const estDoc = (f: Factura) => ESTADO_DOC[f.estadoDocumento || ""] || ESTADO_DOC[""];

const filters: Filter<Factura>[] = [
  { key: "tipo", label: "Tipo", value: (f) => f.tipo },
  { key: "cliente", label: "Cliente", value: (f) => f.cliente },
];

interface Prefill { cliente?: string; ruc?: string; viaje?: string; direccion?: string; monto?: number; }

export default function FacturacionPage() {
  const { facturas, viajes, addFactura, reload } = useData();
  const [open, setOpen] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [lookMsg, setLookMsg] = useState("");
  const [prefill, setPrefill] = useState<Prefill>({});
  const [emisor, setEmisor] = useState<EmisorRespuesta | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const sel = facturas.find((f) => f.id === selId) || null;

  useEffect(() => { apiEmisor.get().then(setEmisor).catch(() => setEmisor(null)); }, []);

  const total = facturas.filter((f) => f.estadoSunat !== "Anulada").reduce((s, f) => s + f.monto + f.igv, 0);
  const aceptadas = facturas.filter((f) => f.estadoDocumento === "102" || f.estadoDocumento === "103").length;
  const sinEmitir = facturas.filter((f) => !f.estadoDocumento).length;

  const columns: Column<Factura>[] = [
    { key: "doc", header: "Comprobante", sortable: true, value: (f) => `${f.serie}${f.correlativo ? "-" + f.correlativo : ""}`, render: (f) => <span className="font-semibold text-slate-900">{f.serie}{f.correlativo ? `-${f.correlativo}` : ""}</span> },
    { key: "tipo", header: "Tipo", render: (f) => <Badge tone={f.tipo === "N. Crédito" ? "red" : "gray"}>{f.tipo}</Badge> },
    { key: "cliente", header: "Cliente", sortable: true },
    { key: "ruc", header: "RUC", render: (f) => <span className="tabular text-slate-500">{f.ruc}</span> },
    { key: "fecha", header: "Fecha", sortable: true, value: (f) => f.fecha, render: (f) => <span className="tabular whitespace-nowrap">{fecha(f.fecha)}</span> },
    { key: "total", header: "Total", align: "right", sortable: true, value: (f) => f.monto + f.igv, render: (f) => <span className="tabular font-semibold">{soles(f.total || f.monto + f.igv)}</span> },
    { key: "detr", header: "Detracción", align: "right", render: (f) => (f.sujetoDetraccion && f.montoDetraccion ? <span className="tabular text-rose-500">−{soles(f.montoDetraccion)}</span> : <span className="text-slate-300">—</span>) },
    { key: "sunat", header: "Estado SUNAT", sortable: true, value: (f) => estDoc(f).label, render: (f) => <Badge tone={estDoc(f).tone}>{estDoc(f).label}</Badge> },
    { key: "acc", header: "", align: "right", render: (f) => <button onClick={() => setSelId(f.id)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600">Abrir</button> },
  ];

  const fields: Field[] = [
    { name: "tipo", label: "Tipo de comprobante", type: "select", options: ["Factura", "Boleta", "N. Crédito"] },
    { name: "serie", label: "Serie", type: "text", placeholder: "Se asigna al emitir (según config del emisor)" },
    { name: "cliente", label: "Cliente (razón social)", type: "text", required: true, placeholder: "LOGISTC WORLD INTERNATIONAL S.A.C.", default: prefill.cliente },
    { name: "ruc", label: "RUC / DNI", type: "text", placeholder: "20613059548", default: prefill.ruc },
    { name: "direccion", label: "Dirección del cliente", type: "text", full: true, default: prefill.direccion },
    { name: "fecha", label: "Fecha de emisión", type: "date", required: true },
    { name: "viaje", label: "Contenedor / viaje", type: "select", options: ["-", ...viajes.map((v) => v.contenedor)], default: prefill.viaje },
    { name: "monto", label: "Monto neto (S/)", type: "number", default: prefill.monto ?? 0 },
    { name: "detalleViaje", label: "Detalle del viaje (detracción)", type: "text", full: true, placeholder: "TRANSPORTE DE CONTENEDORES CALLAO → COMAS" },
    { name: "valorReferencial", label: "Valor referencial (S/)", type: "number", placeholder: "Para la detracción del transporte" },
    { name: "referenciaVR", label: "Referencia del valor ref.", type: "text", placeholder: "26/10000922" },
    { name: "ubigeoOrigen", label: "Ubigeo origen", type: "text", placeholder: "070101" },
    { name: "ubigeoDestino", label: "Ubigeo destino", type: "text", placeholder: "150112" },
    { name: "formaPago", label: "Forma de pago", type: "select", options: ["Contado", "Credito"] },
    { name: "fechaVencimiento", label: "Vencimiento (si crédito)", type: "date" },
  ];

  function guardar(v: FormValues) {
    const monto = Number(v.monto || 0);
    const body: Omit<Factura, "id"> = {
      serie: String(v.serie || ""), tipo: v.tipo as Factura["tipo"], cliente: String(v.cliente), ruc: String(v.ruc) || "-",
      direccion: String(v.direccion || ""), fecha: String(v.fecha), viaje: String(v.viaje || "-"),
      monto, igv: Math.round(monto * 0.18 * 100) / 100, estadoSunat: "Emitida",
      valorReferencial: Number(v.valorReferencial || 0), referenciaVR: String(v.referenciaVR || ""),
      ubigeoOrigen: String(v.ubigeoOrigen || ""), ubigeoDestino: String(v.ubigeoDestino || ""),
      detalleViaje: String(v.detalleViaje || ""), formaPago: (String(v.formaPago || "Contado") as string),
      fechaVencimiento: v.fechaVencimiento ? String(v.fechaVencimiento) : null,
    };
    addFactura(body);
  }

  async function traerPorCodigo() {
    if (!codigo.trim()) return;
    setLookMsg("");
    try {
      const v = await apiViajePorCodigo(codigo.trim());
      setPrefill({ cliente: v.cliente, ruc: v.clienteRuc || "", viaje: v.contenedor, direccion: v.clienteDireccion || "", monto: v.tarifa || 0 });
      setOpen(true);
      setCodigo("");
    } catch {
      setLookMsg("No se encontró un viaje con ese código.");
    }
  }

  const prod = emisor?.esProd;

  return (
    <div>
      <PageHeader modulo="09" title="Facturación electrónica — SUNAT" subtitle="Comprobantes emitidos ante SUNAT vía MiFact, con detracción de transporte, estado, PDF/XML/CDR y anulación." />

      {emisor ? (
        <div className={`mb-5 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm ${prod ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}>
          {prod ? <TriangleAlert className="text-rose-600" size={18} /> : <ShieldCheck className="text-emerald-600" size={18} />}
          <span className={`font-semibold ${prod ? "text-rose-700" : "text-emerald-700"}`}>{prod ? "PRODUCCIÓN — se envía real a SUNAT" : "DEMO — nada se envía a SUNAT"}</span>
          <span className="text-slate-500">
            {!emisor.integracionConfigurada ? "Falta URL/token en el servidor." : !emisor.config.activo ? "Emisión electrónica deshabilitada (actívala en Datos del emisor)." : "Listo para emitir."}
          </span>
          <Badge tone={prod ? "red" : "green"}>{prod ? "PROD" : "DEMO"}</Badge>
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Comprobantes" value={facturas.length} icon={ReceiptText} tone="blue" />
        <StatCard label="Aceptados SUNAT" value={aceptadas} icon={ReceiptText} tone="green" />
        <StatCard label="Sin emitir" value={sinEmitir} icon={ReceiptText} tone="amber" />
        <StatCard label="Ventas facturadas" value={soles(total)} icon={ReceiptText} tone="green" />
      </div>

      {lookMsg ? <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">{lookMsg}</div> : null}

      <DataTable
        title="Comprobantes SUNAT"
        exportName="facturacion-sunat"
        columns={columns}
        rows={facturas}
        filters={filters}
        minWidth="min-w-[1040px]"
        searchPlaceholder="Buscar por serie, cliente, RUC…"
        toolbar={
          <>
            <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-1.5 py-1">
              <Search size={14} className="text-slate-400" />
              <input value={codigo} onChange={(e) => setCodigo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") traerPorCodigo(); }}
                placeholder="Código de viaje (OP-0001)" className="w-40 text-sm outline-none" />
              <button onClick={traerPorCodigo} className="rounded-md bg-steel-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-steel-700">Traer</button>
            </div>
            <button onClick={() => { setPrefill({}); setOpen(true); }} className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
              <Plus size={16} /> Nuevo comprobante
            </button>
          </>
        }
      />

      <FormModal
        open={open}
        title="Nuevo comprobante"
        subtitle="El IGV (18%) y la detracción (4%) se calculan al emitir. Usa 'Traer' con el código del viaje para autocompletar."
        fields={fields}
        onSubmit={guardar}
        onClose={() => setOpen(false)}
      />

      {sel ? <ComprobanteModal f={sel} listo={!!emisor?.integracionConfigurada && !!emisor?.config.activo} onClose={() => setSelId(null)} onChanged={reload} /> : null}
    </div>
  );
}

function Dato({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm"><span className="text-slate-500">{k}</span><span className="break-words text-right font-medium text-slate-800">{v}</span></div>;
}

const num = (v: string) => Number(String(v).replace(",", ".") || 0);

function ComprobanteModal({ f, listo, onClose, onChanged }: { f: Factura; listo: boolean; onClose: () => void; onChanged: () => void }) {
  const [busy, setBusy] = useState("");
  const est = estDoc(f);
  const emitido = !!f.estadoDocumento;
  const aceptado = f.estadoDocumento === "102" || f.estadoDocumento === "103";

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

  async function correr(nombre: string, fn: () => Promise<unknown>, refrescar = true) {
    setBusy(nombre);
    try { await fn(); if (refrescar) onChanged(); }
    catch (e) { alert((e as Error).message || "No se pudo completar la operación."); }
    finally { setBusy(""); }
  }
  const guardarLineas = () => correr("lineas", () => apiFacturasE.actualizar(f.id, { items: lineasPayload(), monto: gravadoL }));
  const emitir = () => correr("emitir", async () => {
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

  const btn = "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-6" onClick={onClose}>
      <div className="mt-8 w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{f.serie}{f.correlativo ? `-${f.correlativo}` : ""}</h2>
              <Badge tone={f.tipo === "N. Crédito" ? "red" : "gray"}>{f.tipo}</Badge>
              <Badge tone={est.tone}>{est.label}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">{f.cliente} · {fecha(f.fecha)}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="px-6 py-3">
          <Dato k="RUC / DNI" v={f.ruc} />

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

          <Dato k="Monto gravado" v={soles(emitido ? (f.gravado || f.monto) : gravadoL)} />
          <Dato k="IGV (18%)" v={soles(emitido ? f.igv : igvL)} />
          <Dato k="Total" v={<b>{soles(emitido ? (f.total || f.monto + f.igv) : totalL)}</b>} />
          {f.sujetoDetraccion ? <Dato k="Detracción (4%)" v={<span className="text-rose-500">−{soles(f.montoDetraccion || 0)} · cta {f.ctaDetraccion || "—"}</span>} /> : null}
          {f.valorReferencial ? <Dato k="Valor referencial" v={soles(f.valorReferencial)} /> : null}
          {f.hash ? <Dato k="Hash" v={<span className="tabular text-xs">{f.hash}</span>} /> : null}
          {f.qr ? <Dato k="Cadena QR" v={<span className="tabular break-all text-xs text-slate-500">{f.qr}</span>} /> : null}
          {f.sunatDescripcion ? <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{f.sunatDescripcion}</div> : null}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-200 px-6 py-4">
          {!aceptado ? (
            <button disabled={!!busy || !listo} onClick={emitir} title={listo ? "" : "Configura y activa el emisor primero"} className={`${btn} flex-1 justify-center bg-brand-500 text-white hover:bg-brand-600`}>
              <Send size={15} /> {busy === "emitir" ? "Emitiendo…" : "Emitir a SUNAT"}
            </button>
          ) : (
            <button disabled={!!busy} onClick={pdf} className={`${btn} flex-1 justify-center bg-brand-500 text-white hover:bg-brand-600`}><FileDown size={15} /> {busy === "pdf" ? "…" : "Descargar PDF"}</button>
          )}
          {emitido ? <button disabled={!!busy} onClick={estado} className={`${btn} border border-slate-300 bg-white text-slate-600 hover:border-brand-300`}><RefreshCw size={15} /> Estado</button> : null}
          {aceptado ? <button disabled={!!busy} onClick={correo} className={`${btn} border border-slate-300 bg-white text-slate-600 hover:border-brand-300`}><Mail size={15} /> Correo</button> : null}
          {aceptado ? <button disabled={!!busy} onClick={anular} className={`${btn} border border-slate-300 bg-white text-rose-600 hover:bg-rose-50`}><Ban size={15} /> Anular</button> : null}
        </div>
      </div>
    </div>
  );
}
