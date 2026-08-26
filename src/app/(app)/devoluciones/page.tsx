"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PackageCheck, Search, Paperclip, Download, Save, Settings2, X, Plus, Trash2, Container, Clock } from "lucide-react";
import { PageHeader, StatCard, Card } from "@/components/ui";
import { apiDevoluciones, apiLugares, fileToBase64, downloadBase64, type Devolucion, type LugarGuardado } from "@/lib/api";

const ESTADOS = ["Pendiente", "En proceso", "Devuelto"] as const;
type Estado = (typeof ESTADOS)[number];

const btnEstadoCls: Record<string, string> = {
  Pendiente: "bg-amber-500 text-white border-amber-500",
  "En proceso": "bg-steel-600 text-white border-steel-600",
  Devuelto: "bg-emerald-600 text-white border-emerald-600",
};

function DevolucionCard({ d, lugares, onSaved }: { d: Devolucion; lugares: LugarGuardado[]; onSaved: (u: Devolucion) => void }) {
  const [citaFecha, setCitaFecha] = useState(d.citaFecha ?? "");
  const [citaHora, setCitaHora] = useState(d.citaHora ?? "");
  const [lugar, setLugar] = useState(d.lugarGuardado ?? "");
  const [estado, setEstado] = useState<string>(d.estadoDevolucion || "Pendiente");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const punto = d.devolucion || d.destino || "—";

  async function guardar() {
    setBusy(true); setMsg("");
    try {
      const body: any = { citaFecha: citaFecha || null, citaHora, lugarGuardado: lugar, estadoDevolucion: estado };
      const f = fileRef.current?.files?.[0];
      if (f) {
        const ok = f.type === "application/pdf" || f.type.startsWith("image/");
        if (!ok) throw new Error("El adjunto debe ser PDF o imagen (JPG/PNG).");
        body.archivoBase64 = await fileToBase64(f);
        body.archivoNombre = f.name;
        body.archivoMime = f.type || "application/pdf";
      }
      const upd = await apiDevoluciones.update(d.id, body);
      onSaved(upd);
      if (fileRef.current) fileRef.current.value = "";
      setMsg("Guardado");
      setTimeout(() => setMsg(""), 1500);
    } catch (e) { setMsg((e as Error).message || "No se pudo guardar."); }
    finally { setBusy(false); }
  }

  async function descargar() {
    try { const a = await apiDevoluciones.archivo(d.id); downloadBase64(a.nombre, a.mime, a.base64); }
    catch (e) { setMsg((e as Error).message || "No se pudo descargar."); }
  }

  return (
    <Card className="overflow-hidden">
      {/* Cabecera: datos del viaje (solo lectura) */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
        <span className="inline-flex items-center gap-1.5 font-bold text-brand-600"><Container size={15} /> {d.codigo || "—"}</span>
        <span className="text-sm text-slate-500">{d.contenedor || "—"}{d.tamanio ? ` · ${d.tamanio}` : ""}</span>
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
        {ESTADOS.map((e) => (
          <button key={e} onClick={() => setEstado(e)}
            className={`rounded-lg border px-3.5 py-2 text-sm font-bold transition ${estado === e ? btnEstadoCls[e] : "border-slate-300 bg-white text-slate-500 hover:border-slate-400"}`}>
            {e}
          </button>
        ))}
      </div>

      {/* Campos editables */}
      <div className="grid grid-cols-1 gap-3 px-4 pb-2 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Día de la cita</label>
          <input type="date" value={citaFecha} onChange={(e) => setCitaFecha(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500"><Clock size={12} /> Hora de devolución</label>
          <input type="time" value={citaHora} onChange={(e) => setCitaHora(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Lugar de guardado</label>
          <input list={`dl-${d.id}`} value={lugar} onChange={(e) => setLugar(e.target.value)} placeholder="COLAN, MAQHER, con tracto…" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
          <datalist id={`dl-${d.id}`}>{lugares.map((l) => <option key={l.id} value={l.nombre} />)}</datalist>
        </div>
      </div>

      {/* Adjunto + guardar */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500"><Paperclip size={13} /> Cita del puerto (PDF/JPG)</label>
        <input ref={fileRef} type="file" accept="application/pdf,image/*" className="block max-w-[220px] text-xs text-slate-500 file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs" />
        {d.citaArchivoNombre ? (
          <button onClick={descargar} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600"><Download size={13} /> {d.citaArchivoNombre}</button>
        ) : null}
        <div className="ml-auto flex items-center gap-3">
          {msg ? <span className="text-xs text-slate-400">{msg}</span> : null}
          <button disabled={busy} onClick={guardar} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
            <Save size={15} /> {busy ? "Guardando…" : "Guardar"}
          </button>
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

export default function DevolucionesPage() {
  const [items, setItems] = useState<Devolucion[]>([]);
  const [lugares, setLugares] = useState<LugarGuardado[]>([]);
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState<"todos" | Estado>("todos");
  const [openLugares, setOpenLugares] = useState(false);

  function cargarItems() { apiDevoluciones.list().then(setItems).catch(() => setItems([])); }
  function cargarLugares() { apiLugares.list().then(setLugares).catch(() => setLugares([])); }
  useEffect(() => { cargarItems(); cargarLugares(); }, []);

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
      return `${d.codigo} ${d.contenedor} ${d.cliente} ${d.conductor} ${d.placaTracto}`.toLowerCase().includes(q);
    });
  }, [items, query, filtro]);

  function onSaved(u: Devolucion) { setItems((s) => s.map((x) => (x.id === u.id ? u : x))); }

  const filtros: Array<"todos" | Estado> = ["todos", "Pendiente", "En proceso", "Devuelto"];

  return (
    <div>
      <PageHeader modulo="07" title="Devolución de contenedores" subtitle="Se alimenta de los viajes de importación. Registra la cita, el lugar de guardado, el estado y adjunta la cita del puerto." />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="Pendientes" value={counts.pendiente} icon={PackageCheck} tone="amber" />
        <StatCard label="En proceso" value={counts.proceso} icon={PackageCheck} tone="blue" />
        <StatCard label="Devueltos" value={counts.devuelto} icon={PackageCheck} tone="green" />
      </div>

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
        {visibles.map((d) => <DevolucionCard key={d.id} d={d} lugares={lugares} onSaved={onSaved} />)}
      </div>

      {openLugares ? <LugaresModal lugares={lugares} onClose={() => setOpenLugares(false)} onChanged={cargarLugares} /> : null}
    </div>
  );
}
