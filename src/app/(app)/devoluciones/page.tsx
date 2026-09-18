"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PackageCheck, Search, Paperclip, Download, Save, Settings2, X, Plus, Trash2, Container, Clock, TriangleAlert, Check, RotateCcw, ArrowLeftRight, Scale, HandCoins } from "lucide-react";
import { PageHeader, StatCard, Card } from "@/components/ui";
import { useData } from "@/lib/store";
import { apiDevoluciones, apiLugares, fileToBase64, downloadBase64, type Devolucion, type LugarGuardado, type CompensacionesResp } from "@/lib/api";
import { fecha, diasRestantes, soles } from "@/lib/format";

const ESTADOS = ["Pendiente", "En proceso", "Devuelto"] as const;
type Estado = (typeof ESTADOS)[number];

// Alerta de cita por vencer: solo si tiene fecha y aún no está devuelto.
function citaAlerta(d: Devolucion): { nivel: "vencida" | "hoy" | "manana"; texto: string } | null {
  if (!d.citaFecha || d.estadoDevolucion === "Devuelto") return null;
  const dias = diasRestantes(d.citaFecha);
  if (dias < 0) return { nivel: "vencida", texto: `CITA VENCIDA · ${fecha(d.citaFecha)}` };
  if (dias === 0) return { nivel: "hoy", texto: "CITA VENCE HOY" };
  if (dias === 1) return { nivel: "manana", texto: "CITA VENCE MAÑANA" };
  return null;
}

const btnEstadoCls: Record<string, string> = {
  Pendiente: "bg-amber-500 text-white border-amber-500",
  "En proceso": "bg-steel-600 text-white border-steel-600",
  Devuelto: "bg-emerald-600 text-white border-emerald-600",
};

function DevolucionCard({ d, lugares, conductores, onSaved }: { d: Devolucion; lugares: LugarGuardado[]; conductores: string[]; onSaved: (u: Devolucion) => void }) {
  const [citaFecha, setCitaFecha] = useState(d.citaFecha ?? "");
  const [citaHora, setCitaHora] = useState(d.citaHora ?? "");
  const [lugar, setLugar] = useState(d.lugarGuardado ?? "");
  const [estado, setEstado] = useState<string>(d.estadoDevolucion || "Pendiente");
  const [devueltoPor, setDevueltoPor] = useState(d.devueltoPor || d.conductor || "");
  const cruce = devueltoPor.trim() !== "" && devueltoPor.trim() !== (d.conductor || "").trim();
  // Ya saldada (se devolvió el favor o se pagó): se avisa, pero no como deuda abierta.
  const saldada = d.compensacionEstado === "Compensada" || d.compensacionEstado === "Pagada";
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const punto = d.devolucion || d.destino || "—";
  const alerta = citaAlerta(d);
  // La tarjeta queda en solo lectura una vez devuelto (se reabre con "Reabrir").
  const locked = d.estadoDevolucion === "Devuelto";

  async function guardar() {
    setBusy(true); setMsg("");
    try {
      const upd = await apiDevoluciones.update(d.id, { citaFecha: citaFecha || null, citaHora, lugarGuardado: lugar, estadoDevolucion: estado, devueltoPor: devueltoPor.trim() });
      onSaved(upd);
      setMsg("Guardado");
      setTimeout(() => setMsg(""), 1500);
    } catch (e) { setMsg((e as Error).message || "No se pudo guardar."); }
    finally { setBusy(false); }
  }

  async function reabrir() {
    setBusy(true); setMsg("");
    try {
      const upd = await apiDevoluciones.update(d.id, { citaFecha: citaFecha || null, citaHora, lugarGuardado: lugar, estadoDevolucion: "En proceso", devueltoPor: devueltoPor.trim() });
      onSaved(upd);
      setEstado("En proceso");
    } catch (e) { setMsg((e as Error).message || "No se pudo reabrir."); }
    finally { setBusy(false); }
  }

  async function subirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!f) return;
    if (!(f.type === "application/pdf" || f.type.startsWith("image/"))) { setMsg("El adjunto debe ser PDF o imagen (JPG/PNG)."); return; }
    setBusy(true); setMsg("");
    try {
      const base64 = await fileToBase64(f);
      onSaved(await apiDevoluciones.agregarArchivo(d.id, base64, f.name, f.type || "application/pdf"));
    } catch (err) { setMsg((err as Error).message || "No se pudo subir el archivo."); }
    finally { setBusy(false); }
  }

  async function quitar(archivoId: string) {
    setBusy(true); setMsg("");
    try { onSaved(await apiDevoluciones.quitarArchivo(d.id, archivoId)); }
    catch (err) { setMsg((err as Error).message || "No se pudo quitar el archivo."); }
    finally { setBusy(false); }
  }

  async function descargar(a: { id: string; nombre: string; mime: string }) {
    try { const r = await apiDevoluciones.archivo(d.id, a.id); downloadBase64(r.nombre, r.mime, r.base64); }
    catch (e) { setMsg((e as Error).message || "No se pudo descargar."); }
  }

  return (
    <Card className={`overflow-hidden ${alerta ? "ring-2 ring-rose-400 cita-ring" : locked ? "ring-1 ring-emerald-200" : ""}`}>
      {/* Cabecera: datos del viaje (solo lectura) */}
      <div className={`flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 ${locked ? "bg-emerald-50/70" : alerta ? "bg-rose-50" : "bg-slate-50/70"}`}>
        <span className="inline-flex items-center gap-1.5 font-bold text-brand-600"><Container size={15} /> {d.codigo || "—"}</span>
        <span className="text-sm text-slate-500">{d.contenedor || "—"}{d.tamanio ? ` · ${d.tamanio}` : ""}</span>
        {locked ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white shadow-sm">
            <Check size={14} /> Devuelto
          </span>
        ) : alerta ? (
          <span className="cita-blink inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white shadow-sm">
            <TriangleAlert size={14} /> {alerta.texto}
          </span>
        ) : null}
        <span className="ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ring-steel-200 bg-steel-50 text-steel-700">{d.operacion}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-4">
        <div><div className="text-[11px] uppercase tracking-wide text-slate-400">Tracto / Carreta</div><div className="text-sm font-medium text-slate-800">{d.placaTracto || "—"}{d.carreta ? ` · ${d.carreta}` : ""}</div></div>
        <div><div className="text-[11px] uppercase tracking-wide text-slate-400">Conductor</div><div className="text-sm font-medium text-slate-800">{d.conductor || "—"}</div></div>
        <div><div className="text-[11px] uppercase tracking-wide text-slate-400">Cliente</div><div className="truncate text-sm font-medium text-slate-800" title={d.cliente}>{d.cliente || "—"}</div></div>
        <div><div className="text-[11px] uppercase tracking-wide text-slate-400">Punto de devolución</div><div className="text-sm font-medium text-slate-800">{punto}</div></div>
      </div>

      {/* Estado en grande */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Estado</span>
        {locked ? (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-bold text-white"><Check size={16} /> Devuelto</span>
            <button disabled={busy} onClick={reabrir} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600 disabled:opacity-50">
              <RotateCcw size={15} /> Reabrir
            </button>
          </>
        ) : (
          ESTADOS.map((e) => (
            <button key={e} onClick={() => setEstado(e)}
              className={`rounded-lg border px-3.5 py-2 text-sm font-bold transition ${estado === e ? btnEstadoCls[e] : "border-slate-300 bg-white text-slate-500 hover:border-slate-400"}`}>
              {e}
            </button>
          ))
        )}
      </div>

      {/* Campos editables */}
      <div className="grid grid-cols-1 gap-3 px-4 pb-2 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Día de la cita</label>
          <input type="date" disabled={locked} value={citaFecha} onChange={(e) => setCitaFecha(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed" />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500"><Clock size={12} /> Hora de devolución</label>
          <input type="time" disabled={locked} value={citaHora} onChange={(e) => setCitaHora(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Lugar de guardado</label>
          <input list={`dl-${d.id}`} disabled={locked} value={lugar} onChange={(e) => setLugar(e.target.value)} placeholder="COLAN, MAQHER, con tracto…" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed" />
          <datalist id={`dl-${d.id}`}>{lugares.map((l) => <option key={l.id} value={l.nombre} />)}</datalist>
        </div>
      </div>

      {/* Quién devolvió el contenedor (compensación entre conductores) */}
      <div className="px-4 pb-2">
        <label className="mb-1 block text-xs font-medium text-slate-500">Devuelto por (conductor)</label>
        <input list={`cd-${d.id}`} disabled={locked} value={devueltoPor} onChange={(e) => setDevueltoPor(e.target.value)} placeholder="Conductor que devolvió el contenedor" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed" />
        <datalist id={`cd-${d.id}`}>{conductores.map((c) => <option key={c} value={c} />)}</datalist>
        {cruce ? (
          saldada ? (
            <p className="mt-1.5 inline-flex items-start gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-700 ring-1 ring-inset ring-emerald-200">
              <Check size={13} className="mt-0.5 shrink-0" />
              <span>Devolución cruzada por <b>{devueltoPor.trim()}</b> · {d.compensacionEstado}{d.compensacionEstado === "Pagada" && d.compensacionMonto ? ` ${soles(d.compensacionMonto)}` : ""}.</span>
            </p>
          ) : (
            <p className="mt-1.5 inline-flex items-start gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700 ring-1 ring-inset ring-amber-200">
              <ArrowLeftRight size={13} className="mt-0.5 shrink-0" /> <span>Devolución cruzada: <b>{d.conductor || "—"}</b> le debe una devolución a <b>{devueltoPor.trim()}</b>.</span>
            </p>
          )
        ) : null}
      </div>

      {/* Adjuntos (varios) + guardar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500"><Paperclip size={13} /> Cita del puerto (PDF/JPG)</label>
        {d.citaArchivos.map((a) => (
          <span key={a.id} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white py-1 pl-2 pr-1 text-xs text-slate-600">
            <button onClick={() => descargar(a)} title="Descargar" className="inline-flex items-center gap-1 hover:text-brand-600"><Download size={13} /> <span className="max-w-[160px] truncate">{a.nombre}</span></button>
            {!locked ? <button disabled={busy} onClick={() => quitar(a.id)} title="Quitar" className="rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"><X size={12} /></button> : null}
          </span>
        ))}
        {!locked ? (
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-dashed border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600">
            <Plus size={13} /> Adjuntar
            <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={subirArchivo} />
          </label>
        ) : null}
        <div className="ml-auto flex items-center gap-3">
          {msg ? <span className="text-xs text-slate-400">{msg}</span> : null}
          {locked ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600"><Check size={14} /> Devolución cerrada · solo lectura</span>
          ) : (
            <button disabled={busy} onClick={guardar} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
              <Save size={15} /> {busy ? "Guardando…" : "Guardar"}
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

function LugaresModal({ lugares, onClose, onChanged }: { lugares: LugarGuardado[]; onClose: () => void; onChanged: () => void }) {
  const [nombre, setNombre] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setBusy(true); setError("");
    try { await apiLugares.create(nombre.trim()); setNombre(""); onChanged(); }
    catch (err) { setError((err as Error).message || "No se pudo agregar."); }
    finally { setBusy(false); }
  }
  async function borrar(id: string) {
    setBusy(true); setError("");
    try { await apiLugares.remove(id); onChanged(); }
    catch (err) { setError((err as Error).message || "No se pudo eliminar."); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-6">
      <div className="mt-10 w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-base font-bold text-slate-900">Lugares de guardado</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="Cerrar"><X size={18} /></button>
        </div>
        <div className="px-5 py-4">
          {error ? <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">{error}</div> : null}
          <div className="space-y-2">
            {lugares.length === 0 ? <p className="rounded-lg bg-slate-50 px-3 py-5 text-center text-sm text-slate-400">Aún no hay lugares. Agrega el primero.</p> : null}
            {lugares.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-sm font-medium text-slate-700">{l.nombre}</span>
                <button disabled={busy} onClick={() => borrar(l.id)} title="Eliminar" className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          <form onSubmit={agregar} className="mt-4 flex items-center gap-2">
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. COLAN, MAQHER" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"><Plus size={15} /> Agregar</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function CompensacionesPanel({ comp, onChanged }: { comp: CompensacionesResp; onChanged: () => void }) {
  const [busy, setBusy] = useState("");
  async function marcar(id: string, estado: string, monto?: number, nota?: string) {
    setBusy(id + estado);
    try { await apiDevoluciones.compensar(id, { estado, monto, nota }); onChanged(); }
    catch (e) { alert((e as Error).message || "No se pudo actualizar la compensación."); }
    finally { setBusy(""); }
  }
  // Se devolvió el favor con otra devolución. Si cancela el diálogo, no se guarda nada.
  function compensada(id: string) {
    const nota = prompt("¿Con qué devolución se compensó? (opcional)");
    if (nota === null) return;
    marcar(id, "Compensada", undefined, nota.trim());
  }
  // Se le pagó al que hizo la devolución. Exige un monto válido mayor a 0.
  function pagada(id: string) {
    const m = prompt("Monto pagado (S/):");
    if (m === null) return;
    const monto = Number(String(m).replace(",", ".").trim());
    if (!(monto > 0)) { alert("Ingresa un monto válido mayor a 0."); return; }
    marcar(id, "Pagada", Math.round(monto * 100) / 100, "");
  }
  const resuelta = (e: string) => e === "Compensada" || e === "Pagada";
  const pendientes = comp.cruces.filter((c) => !resuelta(c.compensacionEstado));
  const resueltas = comp.cruces.filter((c) => resuelta(c.compensacionEstado));

  return (
    <Card className="mb-6 p-4">
      <div className="mb-3 flex items-center gap-2"><Scale size={16} className="text-brand-600" /><h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Compensaciones entre conductores</h2></div>

      {comp.saldos.length ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {comp.saldos.map((s) => (
            <span key={s.conductor} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${s.saldo > 0 ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : s.saldo < 0 ? "bg-rose-50 text-rose-600 ring-rose-200" : "bg-slate-50 text-slate-500 ring-slate-200"}`}>
              {s.conductor}: {s.saldo > 0 ? `le deben ${s.saldo}` : s.saldo < 0 ? `debe ${-s.saldo}` : "a mano"}
            </span>
          ))}
        </div>
      ) : null}

      <div className="space-y-2">
        {pendientes.length === 0 ? <p className="text-sm text-slate-400">No hay compensaciones pendientes.</p> : null}
        {pendientes.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <span className="font-semibold text-slate-800">{c.devueltoPor}</span>
            <span className="text-slate-500">devolvió</span>
            <span className="tabular text-slate-600">{c.contenedor || c.codigo}</span>
            <span className="text-slate-500">de</span>
            <span className="font-semibold text-slate-800">{c.conductor}</span>
            <span className="ml-auto flex items-center gap-1.5">
              <button disabled={!!busy} onClick={() => compensada(c.id)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-50"><ArrowLeftRight size={13} /> Compensada</button>
              <button disabled={!!busy} onClick={() => pagada(c.id)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600 disabled:opacity-50"><HandCoins size={13} /> Pagada</button>
            </span>
          </div>
        ))}
      </div>

      {resueltas.length ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-slate-400">Resueltas ({resueltas.length})</summary>
          <div className="mt-2 space-y-1">
            {resueltas.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{c.devueltoPor} ↔ {c.conductor} ({c.contenedor || c.codigo})</span>
                <span className={`rounded px-1.5 py-0.5 font-semibold ${c.compensacionEstado === "Pagada" ? "bg-brand-50 text-brand-700" : "bg-emerald-50 text-emerald-700"}`}>{c.compensacionEstado}{c.compensacionEstado === "Pagada" && c.compensacionMonto ? ` · ${soles(c.compensacionMonto)}` : ""}</span>
                {c.compensacionNota ? <span className="text-slate-400">· {c.compensacionNota}</span> : null}
                <button disabled={!!busy} onClick={() => marcar(c.id, "Pendiente")} className="ml-auto text-slate-400 hover:text-brand-600 disabled:opacity-50">Reabrir</button>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </Card>
  );
}

export default function DevolucionesPage() {
  const { conductores } = useData();
  const conductorNames = useMemo(() => conductores.map((c) => c.nombre).filter(Boolean), [conductores]);
  const [items, setItems] = useState<Devolucion[]>([]);
  const [lugares, setLugares] = useState<LugarGuardado[]>([]);
  const [comp, setComp] = useState<CompensacionesResp | null>(null);
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState<"todos" | Estado>("todos");
  const [openLugares, setOpenLugares] = useState(false);

  function cargarItems() { apiDevoluciones.list().then(setItems).catch(() => setItems([])); }
  function cargarLugares() { apiLugares.list().then(setLugares).catch(() => setLugares([])); }
  function cargarComp() { apiDevoluciones.compensaciones().then(setComp).catch(() => setComp(null)); }
  useEffect(() => { cargarItems(); cargarLugares(); cargarComp(); }, []);

  const counts = useMemo(() => ({
    pendiente: items.filter((d) => d.estadoDevolucion === "Pendiente").length,
    proceso: items.filter((d) => d.estadoDevolucion === "En proceso").length,
    devuelto: items.filter((d) => d.estadoDevolucion === "Devuelto").length,
  }), [items]);

  const visibles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((d) => {
      if (filtro !== "todos" && d.estadoDevolucion !== filtro) return false;
      if (!q) return true;
      return `${d.codigo} ${d.contenedor} ${d.cliente} ${d.conductor} ${d.devueltoPor} ${d.placaTracto}`.toLowerCase().includes(q);
    });
  }, [items, query, filtro]);

  function onSaved(u: Devolucion) { setItems((s) => s.map((x) => (x.id === u.id ? u : x))); cargarComp(); }

  const filtros: Array<"todos" | Estado> = ["todos", "Pendiente", "En proceso", "Devuelto"];

  const alertas = useMemo(() => items.map((d) => ({ d, a: citaAlerta(d) })).filter((x) => x.a), [items]);

  return (
    <div>
      <PageHeader modulo="07" title="Devolución de contenedores" subtitle="Se alimenta de los viajes de importación. Registra la cita, el lugar de guardado, el estado y adjunta la cita del puerto." />

      {alertas.length > 0 ? (
        <button
          onClick={() => setFiltro("todos")}
          className="cita-ring mb-5 flex w-full items-center gap-3 rounded-xl border-2 border-rose-400 bg-rose-50 px-4 py-3 text-left"
        >
          <span className="cita-blink grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-600 text-white"><TriangleAlert size={22} /></span>
          <span className="min-w-0">
            <span className="block text-sm font-extrabold uppercase tracking-wide text-rose-700">
              ¡{alertas.length} cita{alertas.length === 1 ? "" : "s"} por vencer! Devuelve el contenedor a tiempo
            </span>
            <span className="block truncate text-xs font-medium text-rose-600">
              {alertas.map((x) => `${x.d.codigo || x.d.contenedor} (${x.a!.texto.replace("CITA ", "")})`).join(" · ")}
            </span>
          </span>
        </button>
      ) : null}

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="Pendientes" value={counts.pendiente} icon={PackageCheck} tone="amber" />
        <StatCard label="En proceso" value={counts.proceso} icon={PackageCheck} tone="blue" />
        <StatCard label="Devueltos" value={counts.devuelto} icon={PackageCheck} tone="green" />
      </div>

      {comp && comp.cruces.length ? <CompensacionesPanel comp={comp} onChanged={() => { cargarComp(); cargarItems(); }} /> : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por código, contenedor, cliente…"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30" />
        </div>
        {filtros.map((f) => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${filtro === f ? "bg-brand-500 text-white" : "border border-slate-300 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-600"}`}>
            {f === "todos" ? "Todos" : f}
          </button>
        ))}
        <button onClick={() => setOpenLugares(true)} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600">
          <Settings2 size={15} /> Lugares
        </button>
      </div>

      <div className="space-y-4">
        {visibles.length === 0 ? (
          <Card className="p-10 text-center text-sm text-slate-400">
            {items.length === 0 ? "No hay viajes de importación registrados." : "Sin resultados para el filtro actual."}
          </Card>
        ) : null}
        {visibles.map((d) => <DevolucionCard key={d.id} d={d} lugares={lugares} conductores={conductorNames} onSaved={onSaved} />)}
      </div>

      {openLugares ? <LugaresModal lugares={lugares} onClose={() => setOpenLugares(false)} onChanged={cargarLugares} /> : null}
    </div>
  );
}
