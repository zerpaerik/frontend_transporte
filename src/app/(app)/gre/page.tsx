"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScrollText, Search, RefreshCw, FileDown, Ban, Pencil, X, ShieldCheck, TriangleAlert } from "lucide-react";
import { PageHeader, StatCard, Badge } from "@/components/ui";
import { DataTable, type Column, type Filter } from "@/components/DataTable";
import { apiGre, apiEmisor, downloadBase64, type GuiaTransportista, type EmisorRespuesta } from "@/lib/api";
import { fecha } from "@/lib/format";

type Tone = "gray" | "amber" | "green" | "blue" | "red";
const ESTADO: Record<string, { label: string; tone: Tone }> = {
  "": { label: "Sin emitir", tone: "gray" },
  "101": { label: "En proceso", tone: "amber" },
  "102": { label: "Aceptado", tone: "green" },
  "103": { label: "Aceptado c/obs", tone: "blue" },
  "104": { label: "Rechazado", tone: "red" },
  "105": { label: "Anulado", tone: "red" },
  "108": { label: "Baja", tone: "red" },
};
const est = (g: GuiaTransportista) => ESTADO[g.estadoDocumento || ""] || ESTADO[""];

const filters: Filter<GuiaTransportista>[] = [
  { key: "estado", label: "Estado", value: (g) => est(g).label },
];

export default function GrePage() {
  const router = useRouter();
  const [guias, setGuias] = useState<GuiaTransportista[]>([]);
  const [emisor, setEmisor] = useState<EmisorRespuesta | null>(null);
  const [codigo, setCodigo] = useState("");
  const [sel, setSel] = useState<GuiaTransportista | null>(null); // guía para ver/gestionar

  function cargar() { apiGre.todas().then(setGuias).catch(() => setGuias([])); }
  useEffect(() => { cargar(); apiEmisor.get().then(setEmisor).catch(() => setEmisor(null)); }, []);

  const emitidas = guias.filter((g) => g.estadoDocumento === "102" || g.estadoDocumento === "103").length;
  const sinEmitir = guias.filter((g) => !g.estadoDocumento).length;

  function nueva() {
    const c = codigo.trim();
    router.push(c ? `/gre/nueva?codigo=${encodeURIComponent(c)}` : "/gre/nueva");
  }

  const columns: Column<GuiaTransportista>[] = [
    { key: "doc", header: "Guía", sortable: true, value: (g) => `${g.serie}-${g.correlativo}`, render: (g) => <span className="font-semibold text-slate-900">{g.serie}-{g.correlativo}</span> },
    { key: "cliente", header: "Remitente", sortable: true, value: (g) => g.remitenteRazon, render: (g) => <span className="text-slate-700">{g.remitenteRazon || "—"}</span> },
    { key: "ruta", header: "Ruta", render: (g) => <span className="text-slate-500">{[g.partidaDir, g.llegadaDir].filter(Boolean).join(" → ") || "—"}</span> },
    { key: "placa", header: "Placa", render: (g) => <span className="tabular text-slate-500">{g.placaTracto || "—"}</span> },
    { key: "grr", header: "Guía remitente", render: (g) => <span className="tabular text-slate-500">{g.docRefNumero || "—"}</span> },
    { key: "fecha", header: "Emisión", sortable: true, value: (g) => g.fechaEmision || "", render: (g) => <span className="tabular whitespace-nowrap">{g.fechaEmision ? fecha(g.fechaEmision) : "—"}</span> },
    { key: "estado", header: "Estado SUNAT", sortable: true, value: (g) => est(g).label, render: (g) => <Badge tone={est(g).tone}>{est(g).label}</Badge> },
    { key: "acc", header: "", align: "right", render: (g) => <button onClick={() => setSel(g)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600">Abrir</button> },
  ];

  const prod = emisor?.esProd;

  return (
    <div>
      <PageHeader modulo="09" title="GRE — Guía de Remisión del transportista" subtitle="Guías de remisión electrónicas emitidas a SUNAT vía MiFact, con estado, PDF y baja. Se generan a partir de un viaje de Operaciones." />

      {emisor ? (
        <div className={`mb-5 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm ${prod ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}>
          {prod ? <TriangleAlert className="text-rose-600" size={18} /> : <ShieldCheck className="text-emerald-600" size={18} />}
          <span className={`font-semibold ${prod ? "text-rose-700" : "text-emerald-700"}`}>{prod ? "PRODUCCIÓN — se envía real a SUNAT" : "DEMO — nada se envía a SUNAT"}</span>
          <span className="text-slate-500">La GRE usa el mismo emisor de la facturación. SUNAT no tiene ambiente demo de GRE.</span>
          <Badge tone={prod ? "red" : "green"}>{prod ? "PROD" : "DEMO"}</Badge>
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Guías" value={guias.length} icon={ScrollText} tone="blue" />
        <StatCard label="Aceptadas SUNAT" value={emitidas} icon={ScrollText} tone="green" />
        <StatCard label="Sin emitir" value={sinEmitir} icon={ScrollText} tone="amber" />
      </div>

      <DataTable
        title="Guías de remisión"
        exportName="gre-transportista"
        columns={columns}
        rows={guias}
        filters={filters}
        minWidth="min-w-[980px]"
        searchPlaceholder="Buscar por serie, remitente, placa…"
        toolbar={
          <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-1.5 py-1">
            <Search size={14} className="text-slate-400" />
            <input value={codigo} onChange={(e) => setCodigo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") nueva(); }}
              placeholder="Código de viaje (OP-0001)" className="w-44 text-sm outline-none" />
            <button onClick={nueva} className="rounded-md bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-600">Nueva GRE</button>
          </div>
        }
      />

      {sel ? <GreDetalleModal g={sel} onClose={() => setSel(null)} onChanged={cargar} onEditar={() => router.push(`/gre/nueva?viajeId=${sel.viajeId}`)} /> : null}
    </div>
  );
}

function Dato({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm"><span className="text-slate-500">{k}</span><span className="break-words text-right font-medium text-slate-800">{v}</span></div>;
}

function GreDetalleModal({ g, onClose, onChanged, onEditar }: { g: GuiaTransportista; onClose: () => void; onChanged: () => void; onEditar: () => void }) {
  const [busy, setBusy] = useState("");
  const e = est(g);
  const emitido = !!g.estadoDocumento;
  const aceptado = g.estadoDocumento === "102" || g.estadoDocumento === "103";
  const editable = !emitido || g.estadoDocumento === "104"; // sin emitir o rechazado

  async function correr(nombre: string, fn: () => Promise<unknown>, refrescar = true) {
    setBusy(nombre);
    try { await fn(); if (refrescar) onChanged(); }
    catch (err) { alert((err as Error).message || "No se pudo completar la operación."); }
    finally { setBusy(""); }
  }
  const estado = () => correr("estado", () => apiGre.estado(g.id));
  const pdf = () => correr("pdf", async () => { const p = await apiGre.pdf(g.id); downloadBase64(p.nombre, p.mime, p.base64); }, false);
  const anular = () => { const m = prompt("Motivo de la baja:"); if (m) correr("anular", () => apiGre.anular(g.id, m)); };

  const btn = "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-6" onClick={onClose}>
      <div className="mt-8 w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{g.serie}-{g.correlativo}</h2>
              <Badge tone={e.tone}>{e.label}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">{g.remitenteRazon || "—"} · {g.fechaEmision ? fecha(g.fechaEmision) : "sin emitir"}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="px-6 py-3">
          <Dato k="Remitente" v={g.remitenteRazon || "—"} />
          <Dato k="Destinatario" v={g.destinatarioRazon || "—"} />
          <Dato k="Ruta" v={[g.partidaDir, g.llegadaDir].filter(Boolean).join(" → ") || "—"} />
          <Dato k="Placa" v={g.placaTracto || "—"} />
          <Dato k="Conductor" v={g.conductorNombre || "—"} />
          <Dato k="Guía del remitente (GRR)" v={g.docRefNumero || "—"} />
          <Dato k="Peso bruto (KGM)" v={g.pesoBruto || "—"} />
          <Dato k="Traslado" v={g.fechaTraslado ? fecha(g.fechaTraslado) : "—"} />
          {g.hash ? <Dato k="Hash" v={<span className="tabular text-xs">{g.hash}</span>} /> : null}
          {g.sunatDescripcion ? <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{g.sunatDescripcion}</div> : null}
          {editable ? <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{emitido ? "Guía rechazada por SUNAT: corrige los datos y vuelve a emitir." : "Esta guía aún no se emite. Ábrela para completar los datos y emitirla."}</div> : null}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-200 px-6 py-4">
          {editable ? (
            <button disabled={!!busy} onClick={onEditar} className={`${btn} flex-1 justify-center bg-brand-500 text-white hover:bg-brand-600`}><Pencil size={15} /> Editar / emitir</button>
          ) : (
            <button disabled={!!busy || !emitido} onClick={pdf} className={`${btn} flex-1 justify-center bg-brand-500 text-white hover:bg-brand-600`}><FileDown size={15} /> {busy === "pdf" ? "…" : "Descargar PDF"}</button>
          )}
          {emitido ? <button disabled={!!busy} onClick={estado} className={`${btn} border border-slate-300 bg-white text-slate-600 hover:border-brand-300`}><RefreshCw size={15} /> Estado</button> : null}
          {emitido && editable ? <button disabled={!!busy} onClick={pdf} className={`${btn} border border-slate-300 bg-white text-slate-600 hover:border-brand-300`}><FileDown size={15} /> PDF</button> : null}
          {aceptado ? <button disabled={!!busy} onClick={anular} className={`${btn} border border-slate-300 bg-white text-rose-600 hover:bg-rose-50`}><Ban size={15} /> Dar de baja</button> : null}
        </div>
      </div>
    </div>
  );
}
