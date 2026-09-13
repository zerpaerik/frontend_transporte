"use client";

import { useEffect, useState } from "react";
import { X, FileJson, Send, RefreshCw, FileDown, Ban, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge } from "./ui";
import { apiGre, downloadBase64, type GuiaInput, type GuiaTransportista } from "@/lib/api";
import { fecha } from "@/lib/format";

const ESTADO: Record<string, { label: string; tone: "gray" | "amber" | "green" | "blue" | "red" }> = {
  "": { label: "Sin emitir", tone: "gray" },
  "101": { label: "En proceso", tone: "amber" },
  "102": { label: "Aceptado", tone: "green" },
  "103": { label: "Aceptado c/obs", tone: "blue" },
  "104": { label: "Rechazado", tone: "red" },
  "105": { label: "Anulado", tone: "red" },
  "108": { label: "Baja", tone: "red" },
};
const est = (g: GuiaTransportista) => ESTADO[g.estadoDocumento || ""] || ESTADO[""];

const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500";
const lbl = "mb-1 block text-xs font-medium text-slate-600";

export function GuiaModal({ viaje, onClose }: { viaje: any; onClose: () => void }) {
  const [f, setF] = useState<GuiaInput>({ pagadorFlete: "remitente", docRefTipo: "09" });
  const [guias, setGuias] = useState<GuiaTransportista[]>([]);
  const [json, setJson] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ ambiente: string; greConfigurada: boolean } | null>(null);
  const [busy, setBusy] = useState("");

  function cargar() { apiGre.listar(viaje.id).then(setGuias).catch(() => setGuias([])); }
  useEffect(() => { cargar(); }, [viaje.id]);

  const set = (k: keyof GuiaInput, v: any) => setF((p) => ({ ...p, [k]: v }));
  function body(): GuiaInput {
    return {
      fechaTraslado: f.fechaTraslado || undefined,
      partidaUbigeo: f.partidaUbigeo || undefined,
      llegadaUbigeo: f.llegadaUbigeo || undefined,
      destinatarioRuc: f.destinatarioRuc || undefined,
      destinatarioRazon: f.destinatarioRazon || undefined,
      pesoBruto: f.pesoBruto ? Number(f.pesoBruto) : undefined,
      docRefTipo: "09",
      docRefNumero: f.docRefNumero || undefined,
      pagadorFlete: f.pagadorFlete,
      observaciones: f.observaciones || undefined,
    };
  }

  async function correr(nombre: string, fn: () => Promise<unknown>, refrescar = true) {
    setBusy(nombre);
    try { await fn(); if (refrescar) cargar(); }
    catch (e) { alert((e as Error).message || "No se pudo completar la operación."); }
    finally { setBusy(""); }
  }
  const verJson = () => correr("json", async () => { const r = await apiGre.preview(viaje.id, body()); setJson(JSON.stringify(r.payload, null, 2)); setMeta({ ambiente: r.ambiente, greConfigurada: r.greConfigurada }); }, false);
  const emitir = () => correr("emitir", async () => {
    const r = await apiGre.emitir(viaje.id, body());
    alert(r.respuesta.estado_documento === "102" ? `✅ Guía aceptada: ${r.respuesta.sunat_description}` : `Estado ${r.respuesta.estado_documento || "?"}: ${r.respuesta.errors || r.respuesta.sunat_description || "sin detalle"}`);
  });
  const estado = (id: string) => correr("estado" + id, () => apiGre.estado(id));
  const anular = (id: string) => { const m = prompt("Motivo de la baja:"); if (m) correr("anular" + id, () => apiGre.anular(id, m)); };
  const pdf = (id: string) => correr("pdf" + id, async () => { const p = await apiGre.pdf(id); downloadBase64(p.nombre, p.mime, p.base64); }, false);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-6" onClick={onClose}>
      <div className="mt-6 w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Guía de Remisión — transportista</h2>
            <p className="mt-0.5 text-sm text-slate-500">{viaje.codigo || "Viaje"} · {viaje.origen || "—"} → {viaje.destino || "—"} · {viaje.placaTracto}{viaje.carreta ? ` / ${viaje.carreta}` : ""}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="px-6 py-4">
          {meta ? (
            <div className={`mb-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${meta.greConfigurada ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
              {meta.greConfigurada ? <ShieldCheck size={16} className="text-emerald-600" /> : <TriangleAlert size={16} className="text-amber-600" />}
              <span className="text-slate-600">Ambiente <b>{meta.ambiente.toUpperCase()}</b> · {meta.greConfigurada ? "GRE configurada" : "Falta la URL de GRE de MiFact — solo se puede previsualizar."}</span>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label className={lbl}>Guía del remitente (GRR)</label><input className={inp} value={f.docRefNumero || ""} onChange={(e) => set("docRefNumero", e.target.value)} placeholder="EG07-4763" /></div>
            <div><label className={lbl}>Fecha de traslado</label><input type="date" className={inp} value={f.fechaTraslado || ""} onChange={(e) => set("fechaTraslado", e.target.value)} /></div>
            <div><label className={lbl}>Pagador del flete</label>
              <select className={inp} value={f.pagadorFlete} onChange={(e) => set("pagadorFlete", e.target.value)}>
                <option value="remitente">Remitente</option><option value="tercero">Tercero</option><option value="subcontratado">Subcontratado</option>
              </select>
            </div>
            <div><label className={lbl}>Peso bruto (KGM)</label><input type="number" step="any" min="0" className={inp} value={f.pesoBruto ?? ""} onChange={(e) => set("pesoBruto", e.target.value)} placeholder="Lo trae SUNAT desde la GRR" /></div>
            <div><label className={lbl}>Ubigeo partida</label><input className={inp} value={f.partidaUbigeo || ""} onChange={(e) => set("partidaUbigeo", e.target.value)} placeholder="070101" /></div>
            <div><label className={lbl}>Ubigeo llegada</label><input className={inp} value={f.llegadaUbigeo || ""} onChange={(e) => set("llegadaUbigeo", e.target.value)} placeholder="150112" /></div>
            <div><label className={lbl}>Destinatario — RUC</label><input className={inp} value={f.destinatarioRuc || ""} onChange={(e) => set("destinatarioRuc", e.target.value)} placeholder="(si es distinto al cliente)" /></div>
            <div><label className={lbl}>Destinatario — razón social</label><input className={inp} value={f.destinatarioRazon || ""} onChange={(e) => set("destinatarioRazon", e.target.value)} /></div>
            <div className="sm:col-span-2"><label className={lbl}>Observaciones</label><input className={inp} value={f.observaciones || ""} onChange={(e) => set("observaciones", e.target.value)} /></div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button disabled={!!busy} onClick={verJson} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600 disabled:opacity-50"><FileJson size={15} /> {busy === "json" ? "Armando…" : "Ver JSON (preview)"}</button>
            <button disabled={!!busy} onClick={emitir} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"><Send size={15} /> {busy === "emitir" ? "Emitiendo…" : "Emitir GRE"}</button>
          </div>

          {json ? (
            <div className="mt-4">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">JSON que se enviaría a MiFact (no enviado)</div>
              <pre className="max-h-72 overflow-auto rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">{json}</pre>
            </div>
          ) : null}

          {guias.length ? (
            <div className="mt-5">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Guías de este viaje</div>
              <div className="space-y-2">
                {guias.map((g) => (
                  <div key={g.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm">
                    <span className="font-semibold text-slate-800">{g.serie}-{g.correlativo}</span>
                    <Badge tone={est(g).tone}>{est(g).label}</Badge>
                    <span className="text-slate-500">{g.fechaEmision ? fecha(g.fechaEmision) : ""}</span>
                    <div className="ml-auto flex gap-1.5">
                      <button disabled={!!busy} onClick={() => estado(g.id)} className="rounded-md border border-slate-300 p-1.5 text-slate-500 hover:text-brand-600" title="Consultar estado"><RefreshCw size={14} /></button>
                      <button disabled={!!busy} onClick={() => pdf(g.id)} className="rounded-md border border-slate-300 p-1.5 text-slate-500 hover:text-brand-600" title="Descargar PDF"><FileDown size={14} /></button>
                      <button disabled={!!busy} onClick={() => anular(g.id)} className="rounded-md border border-slate-300 p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600" title="Dar de baja"><Ban size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
