"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Send, FileJson, RefreshCw, FileDown, Ban, ShieldCheck, TriangleAlert } from "lucide-react";
import { Card, Badge } from "@/components/ui";
import { apiGre, apiViajePorCodigo, apiClientes, downloadBase64, type GuiaInput, type GuiaTransportista, type Cliente } from "@/lib/api";
import { fecha } from "@/lib/format";

const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const lbl = "mb-1 block text-sm font-medium text-slate-700";

const ESTADO: Record<string, { label: string; tone: "gray" | "amber" | "green" | "blue" | "red" }> = {
  "": { label: "Sin emitir", tone: "gray" }, "101": { label: "En proceso", tone: "amber" },
  "102": { label: "Aceptado", tone: "green" }, "103": { label: "Aceptado c/obs", tone: "blue" },
  "104": { label: "Rechazado", tone: "red" }, "105": { label: "Anulado", tone: "red" }, "108": { label: "Baja", tone: "red" },
};
const est = (g: GuiaTransportista) => ESTADO[g.estadoDocumento || ""] || ESTADO[""];

type Form = {
  fechaTraslado: string; partidaUbigeo: string; partidaDir: string; llegadaUbigeo: string; llegadaDir: string;
  remitenteRuc: string; remitenteRazon: string; destinatarioRuc: string; destinatarioRazon: string;
  conductorNombre: string; conductorDni: string; conductorLicencia: string;
  placaTracto: string; tucTracto: string; placaCarreta: string; tucCarreta: string;
  pesoBruto: string; docRefTipo: string; docRefNumero: string;
  pagadorFlete: "remitente" | "tercero" | "subcontratado"; terceroRuc: string; terceroRazon: string;
  observaciones: string;
};
const VACIO: Form = {
  fechaTraslado: "", partidaUbigeo: "", partidaDir: "", llegadaUbigeo: "", llegadaDir: "",
  remitenteRuc: "", remitenteRazon: "", destinatarioRuc: "", destinatarioRazon: "",
  conductorNombre: "", conductorDni: "", conductorLicencia: "",
  placaTracto: "", tucTracto: "", placaCarreta: "", tucCarreta: "",
  pesoBruto: "", docRefTipo: "09", docRefNumero: "",
  pagadorFlete: "remitente", terceroRuc: "", terceroRazon: "",
  observaciones: "",
};

export default function NuevaGrePage() {
  const router = useRouter();
  const [viajeId, setViajeId] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [codigoBuscar, setCodigoBuscar] = useState("");
  const [f, setF] = useState<Form>(VACIO);
  const [serieCorr, setSerieCorr] = useState("");
  const [meta, setMeta] = useState<{ ambiente: string; esProd: boolean; greConfigurada: boolean } | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [guias, setGuias] = useState<GuiaTransportista[]>([]);
  const [json, setJson] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => { apiClientes.list().then(setClientes).catch(() => {}); }, []);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const c = p.get("codigo");
    const vid = p.get("viajeId");
    if (c) cargarPorCodigo(c);
    else if (vid) cargarDatos(vid, "").catch(() => setMsg("No se pudo cargar el viaje de la guía."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cargarGuias(id: string) { apiGre.listar(id).then(setGuias).catch(() => setGuias([])); }

  async function cargarPorCodigo(cod: string) {
    const c = cod.trim();
    if (!c) return;
    setMsg("");
    try {
      const v = await apiViajePorCodigo(c);
      await cargarDatos(v.id, v.codigo || c);
    } catch { setMsg(`No se encontró un viaje con el código "${c}".`); }
  }

  async function cargarDatos(id: string, cod: string) {
    const d = await apiGre.datos(id);
    setViajeId(id);
    setCodigo(cod || d.codigo);
    setSerieCorr(`${d.serie}-${d.correlativo}`);
    setMeta({ ambiente: d.ambiente, esProd: d.esProd, greConfigurada: d.greConfigurada });
    setF((p) => ({
      ...p,
      fechaTraslado: d.fechaTraslado || "",
      partidaDir: d.partidaDir || "", llegadaDir: d.llegadaDir || "",
      remitenteRuc: d.remitenteRuc || "", remitenteRazon: d.remitenteRazon || "",
      conductorNombre: d.conductorNombre || "", conductorDni: d.conductorDni || "", conductorLicencia: d.conductorLicencia || "",
      placaTracto: d.placaTracto || "", tucTracto: d.tucTracto || "", placaCarreta: d.placaCarreta || "", tucCarreta: d.tucCarreta || "",
      docRefNumero: d.docRefNumero || "",
    }));
    cargarGuias(id);
  }

  function elegirDestinatario(nombre: string) {
    const c = clientes.find((x) => x.nombre === nombre);
    if (!c) return;
    setF((p) => ({ ...p, destinatarioRazon: c.nombre, destinatarioRuc: c.ruc || "" }));
  }

  function body(): GuiaInput {
    return {
      fechaTraslado: f.fechaTraslado || undefined,
      partidaUbigeo: f.partidaUbigeo || undefined, partidaDir: f.partidaDir || undefined,
      llegadaUbigeo: f.llegadaUbigeo || undefined, llegadaDir: f.llegadaDir || undefined,
      remitenteRuc: f.remitenteRuc || undefined, remitenteRazon: f.remitenteRazon || undefined,
      destinatarioRuc: f.destinatarioRuc || undefined, destinatarioRazon: f.destinatarioRazon || undefined,
      conductorNombre: f.conductorNombre || undefined, conductorDni: f.conductorDni || undefined, conductorLicencia: f.conductorLicencia || undefined,
      placaTracto: f.placaTracto || undefined, tucTracto: f.tucTracto || undefined,
      placaCarreta: f.placaCarreta || undefined, tucCarreta: f.tucCarreta || undefined,
      pesoBruto: f.pesoBruto ? Number(f.pesoBruto) : undefined,
      docRefTipo: f.docRefTipo || undefined, docRefNumero: f.docRefNumero || undefined,
      pagadorFlete: f.pagadorFlete,
      terceroRuc: f.terceroRuc || undefined, terceroRazon: f.terceroRazon || undefined,
      observaciones: f.observaciones || undefined,
    };
  }

  async function correr(nombre: string, fn: () => Promise<unknown>, refrescar = true) {
    setBusy(nombre);
    try { await fn(); if (refrescar && viajeId) cargarGuias(viajeId); }
    catch (e) { alert((e as Error).message || "No se pudo completar la operación."); }
    finally { setBusy(""); }
  }
  const verJson = () => { if (!viajeId) return; correr("json", async () => { const r = await apiGre.preview(viajeId, body()); setJson(JSON.stringify(r.payload, null, 2)); }, false); };
  const emitir = () => { if (!viajeId) return; correr("emitir", async () => {
    const r = await apiGre.emitir(viajeId, body());
    alert(r.respuesta.estado_documento === "102" ? `✅ Guía aceptada: ${r.respuesta.sunat_description}` : `Estado ${r.respuesta.estado_documento || "?"}: ${r.respuesta.errors || r.respuesta.sunat_description || "sin detalle"}`);
  }); };
  const estado = (id: string) => correr("estado" + id, () => apiGre.estado(id));
  const anular = (id: string) => { const m = prompt("Motivo de la baja:"); if (m) correr("anular" + id, () => apiGre.anular(id, m)); };
  const pdf = (id: string) => correr("pdf" + id, async () => { const p = await apiGre.pdf(id); downloadBase64(p.nombre, p.mime, p.base64); }, false);

  return (
    <div className="mx-auto max-w-4xl">
      <button onClick={() => router.push("/gre")} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600"><ArrowLeft size={16} /> Volver a GRE</button>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Nueva guía de remisión — transportista</h1>
      <p className="mt-1 text-sm text-slate-500">Trae los datos del viaje (conductor, placas, ruta, remitente) y déjalos listos para SUNAT. Todo es editable por si hay que corregir un DNI, TUC o ubigeo.</p>

      {/* Traer desde Operaciones */}
      <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
        <Search size={16} className="text-slate-400" />
        <input value={codigoBuscar} onChange={(e) => setCodigoBuscar(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") cargarPorCodigo(codigoBuscar); }}
          placeholder="Código de viaje (OP-0001)" className="w-52 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
        <button onClick={() => cargarPorCodigo(codigoBuscar)} className="rounded-lg bg-steel-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-steel-700">Traer del viaje</button>
        {codigo ? <span className="text-sm text-slate-500">Viaje <b className="text-slate-700">{codigo}</b>{serieCorr ? ` · Guía ${serieCorr}` : ""}</span> : null}
        {msg ? <span className="text-sm text-rose-600">{msg}</span> : null}
      </div>

      {meta ? (
        <div className={`mt-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${meta.greConfigurada ? (meta.esProd ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50") : "border-amber-200 bg-amber-50"}`}>
          {meta.greConfigurada ? <ShieldCheck size={16} className={meta.esProd ? "text-rose-600" : "text-emerald-600"} /> : <TriangleAlert size={16} className="text-amber-600" />}
          <span className="text-slate-600">Ambiente <b>{meta.ambiente.toUpperCase()}</b> · {meta.greConfigurada ? "GRE configurada" : "Falta la URL de GRE de MiFact — solo se puede previsualizar."}</span>
        </div>
      ) : null}

      {!viajeId ? (
        <Card className="mt-4 p-8 text-center text-sm text-slate-500">Ingresa el código de un viaje para empezar. La guía se genera a partir de un viaje de Operaciones.</Card>
      ) : (
        <>
          {/* Traslado */}
          <Card className="mt-4 p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Traslado</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label><span className={lbl}>Fecha de traslado</span><input type="date" className={inp} value={f.fechaTraslado} onChange={(e) => set("fechaTraslado", e.target.value)} /></label>
              <label><span className={lbl}>Pagador del flete</span>
                <select className={inp} value={f.pagadorFlete} onChange={(e) => set("pagadorFlete", e.target.value as Form["pagadorFlete"])}>
                  <option value="remitente">Remitente</option><option value="tercero">Tercero</option><option value="subcontratado">Subcontratado</option>
                </select>
              </label>
              <label><span className={lbl}>Ubigeo partida</span><input className={inp} value={f.partidaUbigeo} onChange={(e) => set("partidaUbigeo", e.target.value)} placeholder="070101" /></label>
              <label><span className={lbl}>Ubigeo llegada</span><input className={inp} value={f.llegadaUbigeo} onChange={(e) => set("llegadaUbigeo", e.target.value)} placeholder="150112" /></label>
              <label className="sm:col-span-2"><span className={lbl}>Dirección de partida</span><input className={inp} value={f.partidaDir} onChange={(e) => set("partidaDir", e.target.value)} /></label>
              <label className="sm:col-span-2"><span className={lbl}>Dirección de llegada</span><input className={inp} value={f.llegadaDir} onChange={(e) => set("llegadaDir", e.target.value)} /></label>
              {f.pagadorFlete !== "remitente" ? (
                <>
                  <label><span className={lbl}>Tercero / subcontratador — RUC</span><input className={inp} value={f.terceroRuc} onChange={(e) => set("terceroRuc", e.target.value)} /></label>
                  <label><span className={lbl}>Tercero — razón social</span><input className={inp} value={f.terceroRazon} onChange={(e) => set("terceroRazon", e.target.value)} /></label>
                </>
              ) : null}
            </div>
          </Card>

          {/* Remitente y destinatario */}
          <Card className="mt-4 p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Remitente y destinatario</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label><span className={lbl}>Remitente — RUC</span><input className={inp} value={f.remitenteRuc} onChange={(e) => set("remitenteRuc", e.target.value)} placeholder="20100118336" /></label>
              <label><span className={lbl}>Remitente — razón social</span><input className={inp} value={f.remitenteRazon} onChange={(e) => set("remitenteRazon", e.target.value)} /></label>
              <label className="sm:col-span-2"><span className={lbl}>Destinatario (del catálogo)</span>
                <select className={inp} value="" onChange={(e) => elegirDestinatario(e.target.value)}>
                  <option value="">— Elegir cliente del catálogo —</option>
                  {clientes.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}{c.ruc ? ` · ${c.ruc}` : ""}</option>)}
                </select>
              </label>
              <label><span className={lbl}>Destinatario — RUC</span><input className={inp} value={f.destinatarioRuc} onChange={(e) => set("destinatarioRuc", e.target.value)} placeholder="(vacío = igual al remitente)" /></label>
              <label><span className={lbl}>Destinatario — razón social</span><input className={inp} value={f.destinatarioRazon} onChange={(e) => set("destinatarioRazon", e.target.value)} /></label>
            </div>
          </Card>

          {/* Vehículo y conductor */}
          <Card className="mt-4 p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Vehículo y conductor</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label><span className={lbl}>Placa tracto</span><input className={inp} value={f.placaTracto} onChange={(e) => set("placaTracto", e.target.value)} /></label>
              <label><span className={lbl}>TUC tracto</span><input className={inp} value={f.tucTracto} onChange={(e) => set("tucTracto", e.target.value)} placeholder="Constancia de inscripción" /></label>
              <label><span className={lbl}>Placa carreta</span><input className={inp} value={f.placaCarreta} onChange={(e) => set("placaCarreta", e.target.value)} /></label>
              <label><span className={lbl}>TUC carreta</span><input className={inp} value={f.tucCarreta} onChange={(e) => set("tucCarreta", e.target.value)} /></label>
              <label><span className={lbl}>Conductor — nombre</span><input className={inp} value={f.conductorNombre} onChange={(e) => set("conductorNombre", e.target.value)} /></label>
              <label><span className={lbl}>Conductor — DNI</span><input className={inp} value={f.conductorDni} onChange={(e) => set("conductorDni", e.target.value)} placeholder="8 dígitos" maxLength={8} /></label>
              <label><span className={lbl}>Conductor — licencia</span><input className={inp} value={f.conductorLicencia} onChange={(e) => set("conductorLicencia", e.target.value)} placeholder="Q40123456" /></label>
            </div>
            <p className="mt-2 text-xs text-slate-400">Estos datos vienen del conductor y los vehículos registrados. Corrígelos aquí si están incompletos (p. ej. el DNI debe tener 8 dígitos).</p>
          </Card>

          {/* Carga y documento */}
          <Card className="mt-4 p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Carga y documento de referencia</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label><span className={lbl}>Peso bruto (KGM)</span><input type="number" step="any" min="0" className={inp} value={f.pesoBruto} onChange={(e) => set("pesoBruto", e.target.value)} placeholder="Si no, lo trae SUNAT desde la GRR" /></label>
              <label><span className={lbl}>Tipo de documento</span>
                <select className={inp} value={f.docRefTipo} onChange={(e) => set("docRefTipo", e.target.value)}>
                  <option value="09">Guía de remisión del remitente (GRR)</option>
                  <option value="01">Factura</option>
                </select>
              </label>
              <label className="sm:col-span-2"><span className={lbl}>N° del documento (GRR / factura)</span><input className={inp} value={f.docRefNumero} onChange={(e) => set("docRefNumero", e.target.value)} placeholder="EG07-4763" /></label>
              <label className="sm:col-span-2"><span className={lbl}>Observaciones</span><input className={inp} value={f.observaciones} onChange={(e) => set("observaciones", e.target.value)} /></label>
            </div>
          </Card>

          <div className="mt-5 flex flex-wrap gap-3">
            <button disabled={!!busy} onClick={verJson} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600 disabled:opacity-50"><FileJson size={16} /> {busy === "json" ? "Armando…" : "Ver JSON (preview)"}</button>
            <button disabled={!!busy} onClick={emitir} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"><Send size={16} /> {busy === "emitir" ? "Emitiendo…" : "Emitir GRE"}</button>
          </div>

          {json ? (
            <div className="mt-4">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">JSON que se enviaría a MiFact (no enviado)</div>
              <pre className="max-h-80 overflow-auto rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">{json}</pre>
            </div>
          ) : null}

          {guias.length ? (
            <Card className="mt-5 p-5">
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
                      <button disabled={!!busy} onClick={() => anular(g.id)} className="rounded-md border border-slate-300 p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600" title="Dar de baja (Clave SOL)"><Ban size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
