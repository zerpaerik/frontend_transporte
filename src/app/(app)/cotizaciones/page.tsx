"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Copy, FileSignature, Hash, Pencil, Plus, Printer, Send, Trash2, Truck, X, XCircle } from "lucide-react";
import { PageHeader, StatCard, Badge } from "@/components/ui";
import { DataTable, type Column, type Filter } from "@/components/DataTable";
import { CotizacionDoc } from "@/components/CotizacionDoc";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { apiCotizaciones, type Cotizacion, type EstadoCotizacion } from "@/lib/api";
import { dinero, fecha, fechaISO, diasRestantes, hoyPeru, soles } from "@/lib/format";
import { marcaSede } from "@/lib/sedes";

type EstadoVista = EstadoCotizacion | "Vencida";

// "Vencida": borrador o enviada cuya fecha de validez ya pasó (no se guarda, se calcula).
function estadoDe(c: Cotizacion): EstadoVista {
  if ((c.estado === "Borrador" || c.estado === "Enviada") && diasRestantes(c.validaHasta) < 0) return "Vencida";
  return c.estado;
}
const TONO: Record<EstadoVista, "gray" | "blue" | "green" | "red" | "amber" | "orange"> = {
  Borrador: "gray", Enviada: "blue", Aceptada: "green", Rechazada: "red", Vencida: "amber", Convertida: "orange",
};
const ETIQUETA: Partial<Record<EstadoVista, string>> = { Convertida: "En operaciones" };

const filters: Filter<Cotizacion>[] = [
  { key: "estado", label: "Estado", value: (c) => ETIQUETA[estadoDe(c)] || estadoDe(c) },
  { key: "cliente", label: "Cliente", value: (c) => c.cliente },
];

// Unidades (viajes) que salen de la cotización: un viaje por cada unidad de cada ítem.
const unidades = (c: Cotizacion) => c.items.reduce((s, i) => s + Math.max(1, Math.round(i.cantidad)), 0);

export default function CotizacionesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { reload } = useData();
  const marca = marcaSede(user?.sede?.codigo);
  const esAdmin = user?.rol === "Administrador";

  const [rows, setRows] = useState<Cotizacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [numeracion, setNumeracion] = useState(false);
  const sel = rows.find((c) => c.id === selId) || null;

  async function cargar() {
    try { setRows(await apiCotizaciones.list()); setError(""); }
    catch (e) { setError((e as Error).message || "No se pudieron cargar las cotizaciones."); }
    finally { setCargando(false); }
  }
  useEffect(() => {
    cargar().then(() => {
      const abrir = new URLSearchParams(window.location.search).get("abrir");
      if (abrir) { setSelId(abrir); window.history.replaceState(null, "", "/cotizaciones"); }
    });
  }, []);

  function reemplazar(c: Cotizacion) { setRows((xs) => xs.map((x) => (x.id === c.id ? c : x))); }

  const mes = hoyPeru().slice(0, 7);
  const delMes = rows.filter((c) => fechaISO(c.fecha).startsWith(mes));
  const enSoles = (c: Cotizacion) => (c.moneda === "USD" ? c.total * (c.tipoCambio || 0) : c.total);
  const cerradas = rows.filter((c) => ["Aceptada", "Convertida", "Rechazada"].includes(c.estado));
  const ganadas = cerradas.filter((c) => c.estado !== "Rechazada").length;
  const porVencer = rows.filter((c) => (c.estado === "Borrador" || c.estado === "Enviada") && diasRestantes(c.validaHasta) >= 0 && diasRestantes(c.validaHasta) <= 3);

  const columns: Column<Cotizacion>[] = [
    { key: "codigo", header: "N°", sortable: true, value: (c) => c.numero, render: (c) => <span className="font-semibold text-slate-900">{c.codigo}</span> },
    { key: "fecha", header: "Fecha", sortable: true, value: (c) => c.fecha, render: (c) => <span className="tabular whitespace-nowrap">{fecha(c.fecha)}</span> },
    { key: "cliente", header: "Cliente", sortable: true, render: (c) => <span className="block max-w-[240px] truncate font-medium text-slate-700" title={c.cliente}>{c.cliente}</span> },
    { key: "servicio", header: "Servicio", render: (c) => <span className="block max-w-[260px] truncate text-slate-500" title={c.items.map((i) => i.descripcion).join(" · ")}>{c.items[0]?.descripcion || "—"}{c.items.length > 1 ? ` (+${c.items.length - 1})` : ""}</span> },
    { key: "total", header: "Total", align: "right", sortable: true, value: (c) => enSoles(c), render: (c) => <span className="tabular whitespace-nowrap font-semibold">{dinero(c.total, c.moneda)}</span> },
    { key: "valida", header: "Válida hasta", sortable: true, value: (c) => c.validaHasta, render: (c) => <span className="tabular whitespace-nowrap">{fecha(c.validaHasta)}</span> },
    { key: "estado", header: "Estado", sortable: true, value: (c) => estadoDe(c), render: (c) => <Badge tone={TONO[estadoDe(c)]}>{ETIQUETA[estadoDe(c)] || estadoDe(c)}</Badge> },
    { key: "viajes", header: "Viajes", render: (c) => (c.viajes.length ? <span className="tabular whitespace-nowrap text-xs font-semibold text-brand-700">{c.viajes.length === 1 ? c.viajes[0] : `${c.viajes[0]} … ${c.viajes[c.viajes.length - 1]}`}</span> : <span className="text-slate-300">—</span>) },
  ];

  return (
    <div>
      <PageHeader modulo="09" title="Cotizaciones" subtitle="Cotiza servicios de transporte, imprime el PDF y, cuando el cliente acepta, crea los viajes en Operaciones sin volver a digitar." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Cotizaciones del mes" value={delMes.length} icon={FileSignature} tone="blue" />
        <StatCard label="Cotizado del mes" value={soles(delMes.reduce((s, c) => s + enSoles(c), 0))} icon={FileSignature} tone="gray" hint="Con IGV · dólares al T.C. de cada cotización" />
        <StatCard label="Aceptación" value={cerradas.length ? `${Math.round((ganadas / cerradas.length) * 100)}%` : "—"} icon={CheckCircle2} tone="green" hint={cerradas.length ? `${ganadas} de ${cerradas.length} respondidas` : "Aún sin respuestas"} />
        <StatCard label="Por vencer (3 días)" value={porVencer.length} icon={FileSignature} tone="amber" />
      </div>

      {error ? <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <DataTable
        title={cargando ? "Cotizaciones (cargando…)" : "Cotizaciones"}
        exportName="cotizaciones"
        columns={columns}
        rows={rows}
        filters={filters}
        minWidth="min-w-[1040px]"
        searchPlaceholder="Buscar por N°, cliente, servicio…"
        dateField={(c) => c.fecha}
        onRowClick={(c) => setSelId(c.id)}
        toolbar={
          <>
            {esAdmin ? (
              <button onClick={() => setNumeracion(true)} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600">
                <Hash size={16} /> Numeración
              </button>
            ) : null}
            <button onClick={() => router.push("/cotizaciones/nueva")} className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
              <Plus size={16} /> Nueva cotización
            </button>
          </>
        }
      />

      {sel ? (
        <DetalleCotizacion
          c={sel} logo={marca.logo} color={marca.color}
          onClose={() => setSelId(null)}
          onChanged={reemplazar}
          onDeleted={() => { setRows((xs) => xs.filter((x) => x.id !== sel.id)); setSelId(null); }}
          onConvertida={(c) => { reemplazar(c); reload(); }}
        />
      ) : null}
      {numeracion ? <NumeracionModal onClose={() => setNumeracion(false)} /> : null}
    </div>
  );
}

function DetalleCotizacion({ c, logo, color, onClose, onChanged, onDeleted, onConvertida }: {
  c: Cotizacion; logo: string; color: string;
  onClose: () => void; onChanged: (c: Cotizacion) => void; onDeleted: () => void; onConvertida: (c: Cotizacion) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [convertir, setConvertir] = useState(false);
  const est = estadoDe(c);
  const editable = c.estado !== "Convertida";

  async function accion(fn: () => Promise<void>) {
    setBusy(true); setError("");
    try { await fn(); } catch (e) { setError((e as Error).message || "No se pudo completar la acción."); }
    finally { setBusy(false); }
  }
  const cambiar = (estado: Exclude<EstadoCotizacion, "Convertida">) => accion(async () => onChanged(await apiCotizaciones.estado(c.id, estado)));
  const eliminar = () => { if (confirm(`¿Eliminar la ${c.codigo}? Esta acción no se puede deshacer.`)) accion(async () => { await apiCotizaciones.remove(c.id); onDeleted(); }); };

  const btn = "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600 disabled:opacity-50";

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 sm:p-6" onClick={onClose}>
      <div className="my-6 w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="no-print space-y-3 border-b border-slate-200 px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900">{c.codigo}</span>
              <Badge tone={TONO[est]}>{ETIQUETA[est] || est}</Badge>
            </div>
            <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600"><Printer size={15} /> Imprimir / PDF</button>
            {editable ? <button onClick={() => router.push(`/cotizaciones/nueva?id=${c.id}`)} className={btn} disabled={busy}><Pencil size={15} /> Editar</button> : null}
            <button onClick={() => router.push(`/cotizaciones/nueva?copia=${c.id}`)} className={btn} disabled={busy}><Copy size={15} /> Duplicar</button>
            {c.estado === "Borrador" ? <button onClick={() => cambiar("Enviada")} className={btn} disabled={busy}><Send size={15} /> Marcar enviada</button> : null}
            {editable && c.estado !== "Aceptada" ? <button onClick={() => cambiar("Aceptada")} className={btn} disabled={busy}><CheckCircle2 size={15} className="text-emerald-600" /> Aceptada</button> : null}
            {editable && c.estado !== "Rechazada" ? <button onClick={() => cambiar("Rechazada")} className={btn} disabled={busy}><XCircle size={15} className="text-rose-500" /> Rechazada</button> : null}
            {editable ? <button onClick={eliminar} title="Eliminar" className="rounded-lg border border-slate-300 p-2 text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50" disabled={busy}><Trash2 size={15} /></button> : null}
          </div>
          {c.estado === "Aceptada" ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <span className="text-sm text-emerald-800">Cotización aceptada. Crea {unidades(c) === 1 ? "el viaje" : `los ${unidades(c)} viajes`} en Operaciones con los datos ya cargados.</span>
              <button onClick={() => setConvertir(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"><Truck size={15} /> Pasar a operaciones</button>
            </div>
          ) : null}
          {c.estado === "Convertida" ? (
            <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
              Viajes creados: <span className="font-semibold tabular">{c.viajes.join(", ")}</span>. Asigna placa, conductor y contenedor en <Link href="/operaciones" className="font-semibold underline">Operaciones</Link>.
            </div>
          ) : null}
          {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
        </div>
        <CotizacionDoc c={c} logo={logo} color={color} />
      </div>
      {convertir ? <ConvertirModal c={c} onClose={() => setConvertir(false)} onDone={(x) => { setConvertir(false); onConvertida(x); }} /> : null}
    </div>
  );
}

// Confirma qué viajes se crean (uno por unidad de cada ítem) y con qué tarifa.
function ConvertirModal({ c, onClose, onDone }: { c: Cotizacion; onClose: () => void; onDone: (c: Cotizacion) => void }) {
  const [fechaViaje, setFechaViaje] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const tc = c.moneda === "USD" ? c.tipoCambio : 1;
  const tarifa = (precio: number, desc: number) => Math.round(precio * (1 - desc / 100) * (1 - c.descuentoGlobal / 100) * tc * 100) / 100;

  async function crear() {
    setBusy(true); setError("");
    try { onDone(await apiCotizaciones.convertir(c.id, fechaViaje || undefined)); }
    catch (e) { setError((e as Error).message || "No se pudieron crear los viajes."); setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="font-bold text-slate-900">Pasar {c.codigo} a operaciones</h3>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <p className="text-sm text-slate-600">Se crearán <span className="font-semibold">{unidades(c)} viaje{unidades(c) === 1 ? "" : "s"}</span> en estado <span className="font-semibold">Programado</span> para <span className="font-semibold">{c.cliente}</span>. Quedan por asignar la placa, el conductor y el contenedor.</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr><th className="px-3 py-2 text-left font-semibold">Viajes</th><th className="px-3 py-2 text-left font-semibold">Operación</th><th className="px-3 py-2 text-left font-semibold">Ruta</th><th className="px-3 py-2 text-right font-semibold">Tarifa c/u</th></tr>
              </thead>
              <tbody>
                {c.items.map((i, k) => (
                  <tr key={k} className="border-t border-slate-100">
                    <td className="px-3 py-2 tabular">{Math.max(1, Math.round(i.cantidad))}</td>
                    <td className="px-3 py-2">{[i.operacion, i.tamanio, i.tipoCarga].filter(Boolean).join(" · ") || <span className="text-amber-600">Sin operación</span>}</td>
                    <td className="px-3 py-2 text-slate-600">{[i.origen, i.destino, i.devolucion].filter(Boolean).join(" → ") || <span className="text-amber-600">Sin ruta</span>}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular">{soles(tarifa(i.precio, i.descuento))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {c.moneda === "USD" ? <p className="text-xs text-slate-500">La tarifa del viaje se registra en soles: precio en dólares × T.C. {c.tipoCambio.toFixed(3)}.</p> : null}
          <label className="block max-w-xs">
            <span className="mb-1 block text-sm font-medium text-slate-700">Fecha del viaje <span className="font-normal text-slate-400">(opcional)</span></span>
            <input type="date" value={fechaViaje} onChange={(e) => setFechaViaje(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
          </label>
          {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={crear} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"><Truck size={15} /> {busy ? "Creando…" : `Crear ${unidades(c)} viaje${unidades(c) === 1 ? "" : "s"}`}</button>
        </div>
      </div>
    </div>
  );
}

// Fija desde qué número sigue la numeración (para continuar la que ya usaba la empresa).
function NumeracionModal({ onClose }: { onClose: () => void }) {
  const [actual, setActual] = useState("");
  const [desde, setDesde] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  useEffect(() => { apiCotizaciones.siguiente().then((s) => { setActual(s.codigo); setDesde(String(s.siguiente)); }).catch(() => {}); }, []);

  async function guardar() {
    setBusy(true); setMsg(null);
    try { const s = await apiCotizaciones.fijarSiguiente(Number(desde)); setActual(s.codigo); setMsg({ ok: true, texto: `La próxima cotización será la ${s.codigo}.` }); }
    catch (e) { setMsg({ ok: false, texto: (e as Error).message || "No se pudo guardar." }); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="font-bold text-slate-900">Numeración de cotizaciones</h3>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <p className="text-sm text-slate-600">Próxima: <span className="font-semibold tabular text-slate-900">{actual || "…"}</span>. Si la empresa ya venía numerando, indica el número con el que debe seguir.</p>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Siguiente número</span>
            <input type="number" min={1} value={desde} onChange={(e) => setDesde(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular outline-none focus:border-brand-500" />
          </label>
          {msg ? <div className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-rose-200 bg-rose-50 text-rose-700"}`}>{msg.texto}</div> : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cerrar</button>
          <button onClick={guardar} disabled={busy || !(Number(desde) > 0)} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">Guardar</button>
        </div>
      </div>
    </div>
  );
}
