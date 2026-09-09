"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, CalendarClock, Truck, Users, Pencil, Trash2, ChevronLeft, ChevronRight, CalendarDays, List, ArrowRight } from "lucide-react";
import { PageHeader, StatCard, Badge, Card } from "@/components/ui";
import { DataTable, type Column, type Filter } from "@/components/DataTable";
import { FormModal, type Field, type FormValues } from "@/components/FormModal";
import { apiAgenda, apiClientes, apiPuertos, apiComisiones, type Agenda } from "@/lib/api";
import { fecha } from "@/lib/format";

const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const estadoTone = (e: string): "gray" | "blue" | "green" | "red" =>
  e === "Confirmado" ? "blue" : e === "Realizado" ? "green" : e === "Cancelado" ? "red" : "gray";
const chipCls = (e: string) =>
  e === "Confirmado" ? "bg-steel-50 text-steel-700 ring-steel-200"
  : e === "Realizado" ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
  : e === "Cancelado" ? "bg-rose-50 text-rose-500 ring-rose-200 line-through"
  : "bg-brand-50 text-brand-700 ring-brand-200";
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const capMes = (d: Date) => { const s = d.toLocaleDateString("es-PE", { month: "long", year: "numeric" }); return s.charAt(0).toUpperCase() + s.slice(1); };

export default function AgendaPage() {
  const [items, setItems] = useState<Agenda[]>([]);
  const [clientes, setClientes] = useState<string[]>([]);
  const [puertos, setPuertos] = useState<string[]>([]);
  const [distritos, setDistritos] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Agenda | null>(null);
  const [nuevaFecha, setNuevaFecha] = useState<string | undefined>(undefined);
  const [vista, setVista] = useState<"calendario" | "lista">("calendario");
  const [mesRef, setMesRef] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [hover, setHover] = useState<{ s: Agenda; top: number; left: number; below: boolean } | null>(null);

  function onChipEnter(e: React.MouseEvent, s: Agenda) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const W = 248, H = 150;
    const below = r.top < H + 16;
    const left = Math.max(8, Math.min(r.left + r.width / 2 - W / 2, window.innerWidth - W - 8));
    setHover({ s, top: below ? r.bottom + 8 : r.top - 8, left, below });
  }

  function cargar() { apiAgenda.list().then(setItems).catch(() => setItems([])); }
  useEffect(() => {
    cargar();
    apiClientes.list().then((cs) => setClientes(cs.map((c) => c.nombre))).catch(() => setClientes([]));
    apiPuertos.list().then((ps) => setPuertos(ps.map((p) => p.nombre))).catch(() => setPuertos([]));
    apiComisiones.tarifario().then((ts) => setDistritos(ts.map((t) => t.destino))).catch(() => setDistritos([]));
  }, []);

  const activos = items.filter((a) => a.estado !== "Realizado" && a.estado !== "Cancelado");
  const unidades = activos.reduce((s, a) => s + (a.unidades || 0), 0);
  const clientesDistintos = new Set(activos.map((a) => a.cliente)).size;

  const porDia = useMemo(() => {
    const m: Record<string, Agenda[]> = {};
    for (const a of items) (m[(a.fecha || "").slice(0, 10)] ||= []).push(a);
    return m;
  }, [items]);

  const dias = useMemo(() => {
    const first = new Date(mesRef.getFullYear(), mesRef.getMonth(), 1);
    const dow = (first.getDay() + 6) % 7; // 0 = lunes
    const diasMes = new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 0).getDate();
    const semanas = Math.ceil((dow + diasMes) / 7);
    const start = new Date(first); start.setDate(first.getDate() - dow);
    return Array.from({ length: semanas * 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [mesRef]);

  const fieldsFor = (a?: Agenda): Field[] => [
    { name: "fecha", label: "Fecha del servicio", type: "date", required: true, default: a?.fecha ?? nuevaFecha ?? hoyISO() },
    { name: "cliente", label: "Cliente", type: "combo", options: clientes, required: true, placeholder: "Buscar cliente…", default: a?.cliente },
    { name: "origen", label: "Origen — desde dónde sale la carga", type: "select", options: ["", ...puertos], default: a?.origen },
    { name: "destino", label: "Destino (distrito)", type: "select", options: ["", ...distritos], default: a?.destino },
    { name: "devolucion", label: "Punto de devolución", type: "select", options: ["", ...puertos], default: a?.devolucion },
    { name: "tipoCarga", label: "Tipo de carga", type: "select", options: ["GENERAL", "IMO", "REEFER"], default: a?.tipoCarga },
    { name: "unidades", label: "Unidades comprometidas", type: "number", default: a?.unidades ?? 1 },
    { name: "estado", label: "Estado", type: "select", options: ["Programado", "Confirmado", "Realizado", "Cancelado"], default: a?.estado },
    { name: "observacion", label: "Observación", type: "text", full: true, placeholder: "Notas del servicio (opcional)", default: a?.observacion },
  ];

  function toBody(v: FormValues) {
    return {
      fecha: String(v.fecha), cliente: String(v.cliente), origen: String(v.origen || ""), destino: String(v.destino || ""), devolucion: String(v.devolucion || ""),
      tipoCarga: String(v.tipoCarga || "GENERAL"), unidades: Number(v.unidades), estado: String(v.estado || "Programado"), observacion: String(v.observacion || ""),
    };
  }
  async function guardar(v: FormValues) { await apiAgenda.create(toBody(v)); cargar(); }
  async function guardarEdit(v: FormValues) { if (edit) { await apiAgenda.update(edit.id, toBody(v)); cargar(); } }
  async function eliminar(a: Agenda) { if (confirm(`¿Eliminar el servicio de ${a.cliente} del ${fecha(a.fecha)}?`)) { await apiAgenda.remove(a.id); cargar(); } }

  function nuevoEnDia(iso: string) { setNuevaFecha(iso); setEdit(null); setOpen(true); }
  function nuevoLibre() { setNuevaFecha(undefined); setEdit(null); setOpen(true); }

  const columns: Column<Agenda>[] = [
    { key: "fecha", header: "Fecha", sortable: true, value: (a) => a.fecha, render: (a) => <span className="tabular whitespace-nowrap font-medium">{fecha(a.fecha)}</span> },
    { key: "cliente", header: "Cliente", sortable: true, render: (a) => <span className="block max-w-[220px] truncate font-medium text-slate-800" title={a.cliente}>{a.cliente}</span> },
    { key: "origen", header: "Origen", render: (a) => a.origen || <span className="text-slate-300">—</span> },
    { key: "destino", header: "Destino", render: (a) => a.destino || <span className="text-slate-300">—</span> },
    { key: "devolucion", header: "Devolución", render: (a) => a.devolucion || <span className="text-slate-300">—</span> },
    { key: "tipoCarga", header: "Carga", render: (a) => <span className="text-xs font-semibold text-slate-500">{a.tipoCarga}</span> },
    { key: "unidades", header: "Unidades", align: "right", sortable: true, value: (a) => a.unidades, render: (a) => <span className="tabular font-semibold">{a.unidades}</span> },
    { key: "estado", header: "Estado", sortable: true, render: (a) => <Badge tone={estadoTone(a.estado)}>{a.estado}</Badge> },
  ];
  const filters: Filter<Agenda>[] = [
    { key: "cliente", label: "Cliente", value: (a) => a.cliente },
    { key: "estado", label: "Estado", value: (a) => a.estado },
    { key: "tipoCarga", label: "Carga", value: (a) => a.tipoCarga },
  ];

  const toggleBtn = (v: "calendario" | "lista", Icon: typeof List, txt: string) => (
    <button onClick={() => setVista(v)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${vista === v ? "bg-brand-500 text-white" : "border border-slate-300 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-600"}`}>
      <Icon size={15} /> {txt}
    </button>
  );

  return (
    <div>
      <PageHeader modulo="14" title="Agenda de servicios" subtitle="Programa los servicios de los próximos días para no comprometer más unidades de las que tienes disponibles." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Servicios activos" value={activos.length} icon={CalendarClock} tone="blue" />
        <StatCard label="Unidades comprometidas" value={unidades} icon={Truck} tone="orange" hint="programados + confirmados" />
        <StatCard label="Clientes" value={clientesDistintos} icon={Users} tone="gray" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {toggleBtn("calendario", CalendarDays, "Calendario")}
        {toggleBtn("lista", List, "Lista")}
        <button onClick={nuevoLibre} className="ml-auto inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
          <Plus size={16} /> Agendar servicio
        </button>
      </div>

      {vista === "calendario" ? (
        <Card className="overflow-hidden p-0">
          {/* Barra de navegación del mes */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-1">
              <button onClick={() => setMesRef(new Date(mesRef.getFullYear(), mesRef.getMonth() - 1, 1))} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><ChevronLeft size={18} /></button>
              <button onClick={() => setMesRef(new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 1))} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><ChevronRight size={18} /></button>
              <h2 className="ml-1 text-base font-bold text-slate-800">{capMes(mesRef)}</h2>
            </div>
            <button onClick={() => { const d = new Date(); setMesRef(new Date(d.getFullYear(), d.getMonth(), 1)); }} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600">Hoy</button>
          </div>

          {/* Cabecera de días */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70">
            {DIAS.map((d) => <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">{d}</div>)}
          </div>

          {/* Celdas */}
          <div className="grid grid-cols-7">
            {dias.map((d, i) => {
              const iso = isoOf(d);
              const inMonth = d.getMonth() === mesRef.getMonth();
              const isToday = iso === hoyISO();
              const servicios = porDia[iso] ?? [];
              const undDia = servicios.filter((s) => s.estado !== "Cancelado").reduce((s, a) => s + (a.unidades || 0), 0);
              return (
                <div key={i} onClick={() => nuevoEnDia(iso)}
                  className={`group relative min-h-[104px] cursor-pointer border-b border-r border-slate-100 p-1.5 transition hover:bg-brand-50/30 ${inMonth ? "bg-white" : "bg-slate-50/50"} ${i % 7 === 6 ? "border-r-0" : ""}`}>
                  <div className="mb-1 flex items-center justify-between px-0.5">
                    <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${isToday ? "bg-brand-500 text-white" : inMonth ? "text-slate-600" : "text-slate-300"}`}>{d.getDate()}</span>
                    {undDia > 0 ? <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500" title="Unidades comprometidas ese día">{undDia} und</span> : null}
                  </div>
                  <div className="space-y-1">
                    {servicios.slice(0, 3).map((s) => (
                      <button key={s.id} onClick={(e) => { e.stopPropagation(); setEdit(s); }}
                        onMouseEnter={(e) => onChipEnter(e, s)} onMouseLeave={() => setHover(null)}
                        className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium ring-1 ring-inset ${chipCls(s.estado)}`}>
                        <span className="tabular font-bold">{s.unidades}</span> · {s.cliente}
                      </button>
                    ))}
                    {servicios.length > 3 ? <div className="px-1 text-[10px] font-medium text-slate-400">+{servicios.length - 3} más</div> : null}
                  </div>
                  <span className="pointer-events-none absolute right-1.5 top-1.5 opacity-0 transition group-hover:opacity-100"><Plus size={13} className="text-brand-400" /></span>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <DataTable
          title="Agenda de servicios"
          exportName="agenda-servicios"
          columns={columns}
          rows={items}
          filters={filters}
          dateField={(a) => a.fecha}
          dateLabel="Fecha"
          minWidth="min-w-[920px]"
          searchPlaceholder="Buscar por cliente, origen, devolución…"
          rowActions={(a) => (
            <div className="flex items-center justify-end gap-1">
              <button onClick={() => setEdit(a)} title="Editar" className="rounded-md p-1.5 text-slate-400 hover:bg-steel-50 hover:text-steel-600"><Pencil size={15} /></button>
              <button onClick={() => eliminar(a)} title="Eliminar" className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
            </div>
          )}
        />
      )}

      {vista === "calendario" ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand-300" /> Programado</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-steel-300" /> Confirmado</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /> Realizado</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-300" /> Cancelado</span>
          <span className="ml-auto">Clic en un día para agendar · clic en un servicio para editarlo</span>
        </div>
      ) : null}

      {hover ? (
        <div className="pointer-events-none fixed z-50 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl"
          style={{ top: hover.top, left: hover.left, width: 248, transform: hover.below ? undefined : "translateY(-100%)" }}>
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="truncate font-bold text-slate-800">{hover.s.cliente}</span>
            <Badge tone={estadoTone(hover.s.estado)}>{hover.s.estado}</Badge>
          </div>
          <div className="text-slate-500">{fecha(hover.s.fecha)}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-slate-700">
            <span className="truncate">{hover.s.origen || "—"}</span>
            <ArrowRight size={12} className="shrink-0 text-slate-400" />
            <span className="truncate font-medium">{hover.s.destino || "—"}</span>
            <ArrowRight size={12} className="shrink-0 text-slate-400" />
            <span className="truncate">{hover.s.devolucion || "—"}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{hover.s.tipoCarga}</span>
            <span className="font-semibold text-slate-700">{hover.s.unidades} unidad{hover.s.unidades === 1 ? "" : "es"}</span>
          </div>
          {hover.s.observacion ? <div className="mt-1.5 border-t border-slate-100 pt-1.5 text-slate-500">{hover.s.observacion}</div> : null}
        </div>
      ) : null}

      <FormModal open={open} title="Agendar servicio" subtitle="Reserva unidades para un cliente en una fecha." fields={fieldsFor()} onSubmit={guardar} onClose={() => setOpen(false)} />
      {edit ? (
        <FormModal open title={`Editar servicio — ${edit.cliente}`} subtitle="Corrige los datos o cambia el estado del servicio." fields={fieldsFor(edit)} submitLabel="Guardar cambios" onSubmit={guardarEdit} onClose={() => setEdit(null)} />
      ) : null}
    </div>
  );
}
