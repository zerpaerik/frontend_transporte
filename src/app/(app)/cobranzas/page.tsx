"use client";

import { useMemo, useState } from "react";
import { Wallet, AlertTriangle, Clock, CheckCircle2, X, Upload, FileDown, Trash2, Paperclip, FileText, Image as ImageIcon } from "lucide-react";
import { PageHeader, StatCard, Badge } from "@/components/ui";
import { DataTable, type Column, type Filter } from "@/components/DataTable";
import { useData } from "@/lib/store";
import { apiCobranzas, fileToBase64, downloadBase64 } from "@/lib/api";
import { dinero, fecha, diasRestantes, hoyPeru } from "@/lib/format";
import type { Factura } from "@/lib/types";

type EstadoCobro = "Pagada" | "Vencida" | "Por vencer" | "Vigente";

const r2 = (n: number) => Math.round(n * 100) / 100;
const totalDe = (f: Factura) => f.total || f.monto + f.igv;
// Lo que el cliente paga a la empresa: total menos la detracción (que va al Banco de la Nación).
const netoDe = (f: Factura) => r2(totalDe(f) - (f.sujetoDetraccion ? f.montoDetraccion || 0 : 0));
// Vence en la fecha de vencimiento (crédito) o, si es al contado, en la fecha de emisión.
const venceDe = (f: Factura) => String(f.fechaVencimiento || f.fecha).slice(0, 10);

function estadoCobro(f: Factura): EstadoCobro {
  if (f.pagada) return "Pagada";
  const d = diasRestantes(venceDe(f));
  if (d < 0) return "Vencida";
  if (d <= 7) return "Por vencer";
  return "Vigente";
}

function BadgeCobro({ f }: { f: Factura }) {
  const e = estadoCobro(f);
  const d = diasRestantes(venceDe(f));
  if (e === "Pagada") return <Badge tone="green">Pagada</Badge>;
  if (e === "Vencida") return <Badge tone="red">Vencida hace {Math.abs(d)} d</Badge>;
  if (e === "Por vencer") return <Badge tone="amber">{d === 0 ? "Vence hoy" : `Vence en ${d} d`}</Badge>;
  return <Badge tone="blue">Vence en {d} d</Badge>;
}

export default function CobranzasPage() {
  const { facturas, reload } = useData();
  const [vista, setVista] = useState<"pendientes" | "pagadas">("pendientes");
  const [selId, setSelId] = useState<string | null>(null);

  // Facturas y boletas aceptadas por SUNAT (las notas de crédito/débito y lo anulado no se cobran).
  const cobrables = useMemo(
    () => facturas.filter((f) => f.tipo !== "N. Crédito" && f.tipo !== "N. Débito" && (f.estadoDocumento === "102" || f.estadoDocumento === "103")),
    [facturas],
  );
  const pendientes = cobrables.filter((f) => !f.pagada);
  const pagadas = cobrables.filter((f) => f.pagada);
  const vencidas = pendientes.filter((f) => estadoCobro(f) === "Vencida");
  const porVencer = pendientes.filter((f) => estadoCobro(f) === "Por vencer");
  const suma = (xs: Factura[], mon: "PEN" | "USD") => r2(xs.filter((f) => (f.moneda === "USD" ? "USD" : "PEN") === mon).reduce((s, f) => s + netoDe(f), 0));
  const montoHint = (xs: Factura[]) => { const usd = suma(xs, "USD"); return usd > 0 ? `+ ${dinero(usd, "USD")}` : undefined; };

  const sel = facturas.find((f) => f.id === selId) || null;
  const filas = vista === "pendientes" ? pendientes : pagadas;

  const columns: Column<Factura>[] = [
    { key: "doc", header: "Comprobante", sortable: true, value: (f) => `${f.serie}-${f.correlativo}`, render: (f) => <span className="font-semibold text-slate-900">{f.serie}-{f.correlativo}</span> },
    { key: "cliente", header: "Cliente", sortable: true, render: (f) => <span className="block max-w-[240px] truncate" title={f.cliente}>{f.cliente}</span> },
    { key: "fecha", header: "Emisión", sortable: true, value: (f) => String(f.fecha), render: (f) => <span className="tabular whitespace-nowrap">{fecha(f.fecha)}</span> },
    { key: "vence", header: "Vence", sortable: true, value: (f) => venceDe(f), render: (f) => <span className="tabular whitespace-nowrap">{fecha(venceDe(f))}</span> },
    { key: "estado", header: "Estado", sortable: true, value: (f) => estadoCobro(f), render: (f) => <BadgeCobro f={f} /> },
    { key: "total", header: "Total", align: "right", sortable: true, value: (f) => totalDe(f), render: (f) => <span className="tabular">{dinero(totalDe(f), f.moneda)}</span> },
    { key: "neto", header: "Neto a cobrar", align: "right", sortable: true, value: (f) => netoDe(f), render: (f) => <span className="tabular font-semibold">{dinero(netoDe(f), f.moneda)}</span> },
    ...(vista === "pagadas"
      ? [{ key: "pago", header: "Pagada el", sortable: true, value: (f: Factura) => String(f.fechaPago || ""), render: (f: Factura) => <span className="tabular whitespace-nowrap">{f.fechaPago ? fecha(f.fechaPago) : "—"}</span> } as Column<Factura>]
      : []),
    { key: "comp", header: "Comprob.", align: "center", render: (f) => (f.comprobantesPago?.length ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600"><Paperclip size={13} /> {f.comprobantesPago.length}</span> : <span className="text-slate-300">—</span>) },
  ];
  const filters: Filter<Factura>[] = [
    { key: "cliente", label: "Cliente", value: (f) => f.cliente },
    { key: "estado", label: "Estado", value: (f) => estadoCobro(f) },
  ];

  const tab = (v: "pendientes" | "pagadas", txt: string, n: number) => (
    <button onClick={() => setVista(v)} className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${vista === v ? "bg-brand-500 text-white" : "border border-slate-300 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-600"}`}>
      {txt} <span className={`ml-1 rounded-full px-1.5 text-xs ${vista === v ? "bg-white/25" : "bg-slate-100"}`}>{n}</span>
    </button>
  );

  return (
    <div>
      <PageHeader modulo="09" title="Cobranzas" subtitle="Control de las facturas emitidas: qué falta cobrar, qué está vencido y los comprobantes de pago recibidos." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Por cobrar (neto)" value={dinero(suma(pendientes, "PEN"), "PEN")} icon={Wallet} tone="blue" hint={montoHint(pendientes) || `${pendientes.length} factura(s)`} />
        <StatCard label="Vencidas" value={vencidas.length} icon={AlertTriangle} tone="red" hint={vencidas.length ? `${dinero(suma(vencidas, "PEN"), "PEN")}${montoHint(vencidas) ? " " + montoHint(vencidas) : ""}` : "al día"} />
        <StatCard label="Vencen en 7 días" value={porVencer.length} icon={Clock} tone="amber" hint={porVencer.length ? dinero(suma(porVencer, "PEN"), "PEN") : undefined} />
        <StatCard label="Pagadas" value={pagadas.length} icon={CheckCircle2} tone="green" hint={pagadas.length ? dinero(suma(pagadas, "PEN"), "PEN") : undefined} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tab("pendientes", "Por cobrar", pendientes.length)}
        {tab("pagadas", "Pagadas", pagadas.length)}
        <span className="ml-auto text-xs text-slate-400">Neto a cobrar = total − detracción (la detracción la deposita el cliente en el Banco de la Nación).</span>
      </div>

      <DataTable
        title={vista === "pendientes" ? "Facturas por cobrar" : "Facturas pagadas"}
        exportName={vista === "pendientes" ? "facturas-por-cobrar" : "facturas-pagadas"}
        columns={columns}
        rows={filas}
        filters={filters}
        dateField={(f) => String(f.fecha)}
        dateLabel="Emisión"
        minWidth="min-w-[1000px]"
        searchPlaceholder="Buscar por comprobante o cliente…"
        onRowClick={(f) => setSelId(f.id)}
        rowActions={(f) => <button onClick={() => setSelId(f.id)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600">Gestionar</button>}
      />

      {sel ? <CobroModal f={sel} onClose={() => setSelId(null)} onChanged={reload} /> : null}
    </div>
  );
}

function Dato({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm"><span className="text-slate-500">{k}</span><span className="text-right font-medium text-slate-800">{v}</span></div>;
}

const ACEPTA = "image/jpeg,image/png,image/webp,application/pdf";

function CobroModal({ f, onClose, onChanged }: { f: Factura; onClose: () => void; onChanged: () => Promise<void> | void }) {
  const [fechaPago, setFechaPago] = useState(hoyPeru());
  const [nota, setNota] = useState("");
  const [busy, setBusy] = useState("");

  async function correr(nombre: string, fn: () => Promise<unknown>) {
    setBusy(nombre);
    try { await fn(); await onChanged(); }
    catch (e) { alert((e as Error).message || "No se pudo completar la operación."); }
    finally { setBusy(""); }
  }
  const marcarPagada = () => correr("pago", () => apiCobranzas.pago(f.id, { pagada: true, fechaPago, notaPago: nota.trim() }));
  const marcarPendiente = () => { if (confirm("¿Volver a marcar esta factura como pendiente de pago?")) correr("pago", () => apiCobranzas.pago(f.id, { pagada: false })); };

  async function subir(files: FileList | null) {
    if (!files?.length) return;
    await correr("subir", async () => {
      for (const file of Array.from(files)) {
        if (!ACEPTA.split(",").includes(file.type)) throw new Error(`"${file.name}" no es JPG, PNG o PDF.`);
        if (file.size > 10 * 1024 * 1024) throw new Error(`"${file.name}" supera 10 MB.`);
        await apiCobranzas.subir(f.id, { base64: await fileToBase64(file), nombre: file.name, mime: file.type });
      }
    });
  }
  const bajar = (cid: string) => correr("bajar" + cid, async () => { const r = await apiCobranzas.descargar(f.id, cid); downloadBase64(r.nombre, r.mime, r.base64); });
  const quitar = (cid: string, nombre: string) => { if (confirm(`¿Quitar el comprobante "${nombre}"?`)) correr("quitar" + cid, () => apiCobranzas.quitar(f.id, cid)); };

  const btn = "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50";
  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-6" onClick={onClose}>
      <div className="mt-8 w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{f.serie}-{f.correlativo}</h2>
              <BadgeCobro f={f} />
            </div>
            <p className="mt-0.5 text-sm text-slate-500">{f.cliente} · RUC {f.ruc}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="px-6 py-3">
          <Dato k="Emisión" v={fecha(f.fecha)} />
          <Dato k="Vence" v={fecha(venceDe(f))} />
          <Dato k="Total" v={dinero(totalDe(f), f.moneda)} />
          {f.sujetoDetraccion ? <Dato k="Detracción (Banco de la Nación)" v={<span className="text-rose-500">− {dinero(f.montoDetraccion || 0, f.moneda)}</span>} /> : null}
          <Dato k="Neto a cobrar" v={<b>{dinero(netoDe(f), f.moneda)}</b>} />

          {/* Pago */}
          <div className="mt-4 rounded-xl border border-slate-200 p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Pago</div>
            {f.pagada ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 size={16} /> Pagada el <b>{f.fechaPago ? fecha(f.fechaPago) : "—"}</b></div>
                {f.notaPago ? <div className="text-slate-500">{f.notaPago}</div> : null}
                <button disabled={!!busy} onClick={marcarPendiente} className={`${btn} border border-slate-300 bg-white text-slate-600 hover:border-rose-300 hover:text-rose-600`}>Marcar como pendiente</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Fecha de pago</span><input type="date" className={inp} value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} /></label>
                <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Nota (banco / N° operación)</span><input className={inp} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="BCP op. 123456" /></label>
                <button disabled={!!busy} onClick={marcarPagada} className={`${btn} justify-center bg-emerald-600 text-white hover:bg-emerald-700 sm:col-span-2`}><CheckCircle2 size={15} /> {busy === "pago" ? "Guardando…" : "Marcar como pagada"}</button>
              </div>
            )}
          </div>

          {/* Comprobantes de pago */}
          <div className="mt-4 mb-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Comprobantes de pago</span>
              <label className={`${btn} cursor-pointer border border-slate-300 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-600 ${busy ? "pointer-events-none opacity-50" : ""}`}>
                <Upload size={14} /> {busy === "subir" ? "Subiendo…" : "Subir JPG / PDF"}
                <input type="file" accept={ACEPTA} multiple className="hidden" onChange={(e) => { subir(e.target.files); e.target.value = ""; }} />
              </label>
            </div>
            {f.comprobantesPago?.length ? (
              <div className="space-y-1.5">
                {f.comprobantesPago.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    {c.mime === "application/pdf" ? <FileText size={15} className="shrink-0 text-rose-500" /> : <ImageIcon size={15} className="shrink-0 text-steel-600" />}
                    <span className="min-w-0 flex-1 truncate text-slate-700" title={c.nombre}>{c.nombre}</span>
                    <span className="shrink-0 text-xs text-slate-400">{fecha(c.createdAt)}</span>
                    <button disabled={!!busy} onClick={() => bajar(c.id)} title="Descargar" className="rounded p-1 text-slate-400 hover:text-brand-600"><FileDown size={15} /></button>
                    <button disabled={!!busy} onClick={() => quitar(c.id, c.nombre)} title="Quitar" className="rounded p-1 text-slate-400 hover:text-rose-600"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-slate-50 px-3 py-3 text-center text-xs text-slate-400">Aún no hay comprobantes. Sube la captura del depósito/transferencia (JPG, PNG) o el PDF.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
