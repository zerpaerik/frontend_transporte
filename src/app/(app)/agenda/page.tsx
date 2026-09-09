"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, CalendarClock, Truck, Users, Pencil, Trash2 } from "lucide-react";
import { PageHeader, StatCard, Badge } from "@/components/ui";
import { DataTable, type Column, type Filter } from "@/components/DataTable";
import { FormModal, type Field, type FormValues } from "@/components/FormModal";
import { apiAgenda, apiClientes, apiPuertos, type Agenda } from "@/lib/api";
import { fecha } from "@/lib/format";

const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const estadoTone = (e: string): "gray" | "blue" | "green" | "red" =>
  e === "Confirmado" ? "blue" : e === "Realizado" ? "green" : e === "Cancelado" ? "red" : "gray";

export default function AgendaPage() {
  const [items, setItems] = useState<Agenda[]>([]);
  const [clientes, setClientes] = useState<string[]>([]);
  const [puertos, setPuertos] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Agenda | null>(null);

  function cargar() { apiAgenda.list().then(setItems).catch(() => setItems([])); }
  useEffect(() => {
    cargar();
    apiClientes.list().then((cs) => setClientes(cs.map((c) => c.nombre))).catch(() => setClientes([]));
    apiPuertos.list().then((ps) => setPuertos(ps.map((p) => p.nombre))).catch(() => setPuertos([]));
  }, []);

  const activos = items.filter((a) => a.estado !== "Realizado" && a.estado !== "Cancelado");
  const unidades = activos.reduce((s, a) => s + (a.unidades || 0), 0);
  const clientesDistintos = new Set(activos.map((a) => a.cliente)).size;

  const fieldsFor = (a?: Agenda): Field[] => [
    { name: "fecha", label: "Fecha del servicio", type: "date", required: true, default: a?.fecha ?? hoyISO() },
    { name: "cliente", label: "Cliente", type: "select", options: ["", ...clientes], required: true, default: a?.cliente },
    { name: "origen", label: "Origen — desde dónde sale la carga", type: "select", options: ["", ...puertos], default: a?.origen },
    { name: "devolucion", label: "Punto de devolución", type: "select", options: ["", ...puertos], default: a?.devolucion },
    { name: "tipoCarga", label: "Tipo de carga", type: "select", options: ["GENERAL", "IMO", "REEFER"], default: a?.tipoCarga },
    { name: "unidades", label: "Unidades comprometidas", type: "number", default: a?.unidades ?? 1 },
    { name: "estado", label: "Estado", type: "select", options: ["Programado", "Confirmado", "Realizado", "Cancelado"], default: a?.estado },
    { name: "observacion", label: "Observación", type: "text", full: true, placeholder: "Notas del servicio (opcional)", default: a?.observacion },
  ];

  function toBody(v: FormValues) {
    return {
      fecha: String(v.fecha), cliente: String(v.cliente), origen: String(v.origen || ""), devolucion: String(v.devolucion || ""),
      tipoCarga: String(v.tipoCarga || "GENERAL"), unidades: Number(v.unidades), estado: String(v.estado || "Programado"), observacion: String(v.observacion || ""),
    };
  }
  async function guardar(v: FormValues) { await apiAgenda.create(toBody(v)); cargar(); }
  async function guardarEdit(v: FormValues) { if (edit) { await apiAgenda.update(edit.id, toBody(v)); cargar(); } }
  async function eliminar(a: Agenda) { if (confirm(`¿Eliminar el servicio de ${a.cliente} del ${fecha(a.fecha)}?`)) { await apiAgenda.remove(a.id); cargar(); } }

  const columns: Column<Agenda>[] = useMemo(() => [
    { key: "fecha", header: "Fecha", sortable: true, value: (a) => a.fecha, render: (a) => <span className="tabular whitespace-nowrap font-medium">{fecha(a.fecha)}</span> },
    { key: "cliente", header: "Cliente", sortable: true, render: (a) => <span className="block max-w-[220px] truncate font-medium text-slate-800" title={a.cliente}>{a.cliente}</span> },
    { key: "origen", header: "Origen", render: (a) => a.origen || <span className="text-slate-300">—</span> },
    { key: "devolucion", header: "Devolución", render: (a) => a.devolucion || <span className="text-slate-300">—</span> },
    { key: "tipoCarga", header: "Carga", render: (a) => <span className="text-xs font-semibold text-slate-500">{a.tipoCarga}</span> },
    { key: "unidades", header: "Unidades", align: "right", sortable: true, value: (a) => a.unidades, render: (a) => <span className="tabular font-semibold">{a.unidades}</span> },
    { key: "estado", header: "Estado", sortable: true, render: (a) => <Badge tone={estadoTone(a.estado)}>{a.estado}</Badge> },
  ], []);

  const filters: Filter<Agenda>[] = [
    { key: "cliente", label: "Cliente", value: (a) => a.cliente },
    { key: "estado", label: "Estado", value: (a) => a.estado },
    { key: "tipoCarga", label: "Carga", value: (a) => a.tipoCarga },
  ];

  return (
    <div>
      <PageHeader modulo="14" title="Agenda de servicios" subtitle="Programa los servicios de los próximos días para no comprometer más unidades de las que tienes disponibles." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Servicios activos" value={activos.length} icon={CalendarClock} tone="blue" />
        <StatCard label="Unidades comprometidas" value={unidades} icon={Truck} tone="orange" hint="programados + confirmados" />
        <StatCard label="Clientes" value={clientesDistintos} icon={Users} tone="gray" />
      </div>

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
        toolbar={
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            <Plus size={16} /> Agendar servicio
          </button>
        }
      />

      <FormModal open={open} title="Agendar servicio" subtitle="Reserva unidades para un cliente en una fecha futura." fields={fieldsFor()} onSubmit={guardar} onClose={() => setOpen(false)} />
      {edit ? <FormModal open title={`Editar servicio — ${edit.cliente}`} subtitle="Corrige los datos del servicio agendado." fields={fieldsFor(edit)} submitLabel="Guardar cambios" onSubmit={guardarEdit} onClose={() => setEdit(null)} /> : null}
    </div>
  );
}
