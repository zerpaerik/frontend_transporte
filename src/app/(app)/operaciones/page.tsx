"use client";

import { useState } from "react";
import { Plus, Container, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { PageHeader, StatCard, Badge } from "@/components/ui";
import { DataTable, type Column, type Filter } from "@/components/DataTable";
import { FormModal, type Field, type FormValues } from "@/components/FormModal";
import { useData } from "@/lib/store";
import { fecha, diasRestantes } from "@/lib/format";
import type { EstadoViaje, Viaje } from "@/lib/types";

const estadoTone: Record<EstadoViaje, "gray" | "blue" | "green" | "orange"> = {
  Programado: "gray", "En curso": "orange", Culminado: "blue", Devuelto: "green",
};

function Semaforo({ iso, estado }: { iso: string; estado: EstadoViaje }) {
  if (estado === "Culminado" || estado === "Devuelto") return <Badge tone="green">OK</Badge>;
  const d = diasRestantes(iso);
  if (d < 0) return <Badge tone="red">Vencido</Badge>;
  if (d <= 1) return <Badge tone="red">Urgente · {d}d</Badge>;
  if (d <= 3) return <Badge tone="amber">{d} días</Badge>;
  return <Badge tone="green">{d} días</Badge>;
}

const columns: Column<Viaje>[] = [
  { key: "placaTracto", header: "Tracto", sortable: true, render: (v) => <span className="font-semibold text-slate-900">{v.placaTracto}</span> },
  { key: "carreta", header: "Carreta" },
  { key: "conductor", header: "Conductor", sortable: true, render: (v) => <span className="whitespace-nowrap">{v.conductor}</span> },
  { key: "cliente", header: "Cliente", sortable: true, render: (v) => <Badge tone="blue">{v.cliente}</Badge> },
  { key: "operacion", header: "Op.", render: (v) => <span className="text-xs font-semibold text-slate-500">{v.operacion}</span> },
  { key: "contenedor", header: "Contenedor", sortable: true, render: (v) => <span className="tabular">{v.contenedor}</span> },
  { key: "tamanio", header: "Tam." },
  { key: "destino", header: "Destino" },
  { key: "devolucion", header: "Devolución" },
  { key: "fechaLimite", header: "F. límite", sortable: true, value: (v) => v.fechaLimite, render: (v) => <span className="tabular whitespace-nowrap">{fecha(v.fechaLimite)}</span> },
  { key: "semaforo", header: "Devolver", value: (v) => diasRestantes(v.fechaLimite), render: (v) => <Semaforo iso={v.fechaLimite} estado={v.estado} /> },
  { key: "estado", header: "Estado", sortable: true, render: (v) => <Badge tone={estadoTone[v.estado]}>{v.estado}</Badge> },
  { key: "factura", header: "Factura", render: (v) => v.factura ? <span className="font-medium text-emerald-600">{v.factura}</span> : <span className="text-rose-500">Pendiente</span> },
];

const filters: Filter<Viaje>[] = [
  { key: "operacion", label: "Operación", value: (v) => v.operacion },
  { key: "estado", label: "Estado", value: (v) => v.estado },
  { key: "cliente", label: "Cliente", value: (v) => v.cliente },
];

export default function OperacionesPage() {
  const { viajes, vehiculos, conductores, addViaje } = useData();
  const [open, setOpen] = useState(false);

  const enCurso = viajes.filter((v) => v.estado === "En curso").length;
  const impo = viajes.filter((v) => v.operacion === "IMPO").length;
  const expo = viajes.filter((v) => v.operacion === "EXPO").length;

  const fields: Field[] = [
    { name: "placaTracto", label: "Placa tracto", type: "select", options: vehiculos.filter((v) => v.tipo === "Tracto").map((v) => v.placa) },
    { name: "carreta", label: "Carreta", type: "select", options: vehiculos.filter((v) => v.tipo === "Carreta").map((v) => v.placa) },
    { name: "conductor", label: "Conductor", type: "select", options: conductores.map((c) => c.nombre) },
    { name: "cliente", label: "Cliente", type: "text", required: true, placeholder: "ULOG" },
    { name: "operacion", label: "Operación", type: "select", options: ["IMPO", "EXPO"] },
    { name: "contenedor", label: "Contenedor", type: "text", required: true, placeholder: "PCIU6111486" },
    { name: "tamanio", label: "Tamaño", type: "select", options: ["20'", "40'", "40' HC"] },
    { name: "tipoCarga", label: "Tipo de carga", type: "text", default: "GRAL" },
    { name: "horaCita", label: "Hora de cita", type: "text", placeholder: "08:00" },
    { name: "origen", label: "Origen", type: "text", placeholder: "DPWC" },
    { name: "destino", label: "Destino", type: "text", placeholder: "Cercado de Lima" },
    { name: "devolucion", label: "Punto de devolución", type: "text", placeholder: "MEDLOG" },
    { name: "fechaLimite", label: "Fecha límite devolución", type: "date", required: true },
    { name: "estado", label: "Estado", type: "select", options: ["Programado", "En curso", "Culminado", "Devuelto"] },
  ];

  function guardar(v: FormValues) {
    addViaje({
      placaTracto: String(v.placaTracto), carreta: String(v.carreta), conductor: String(v.conductor), cliente: String(v.cliente),
      operacion: v.operacion as Viaje["operacion"], contenedor: String(v.contenedor).toUpperCase(), tamanio: String(v.tamanio),
      tipoCarga: String(v.tipoCarga), horaCita: String(v.horaCita), origen: String(v.origen), destino: String(v.destino),
      devolucion: String(v.devolucion), fechaLimite: String(v.fechaLimite), estado: v.estado as Viaje["estado"],
      nOrden: "", greRemitente: "", greTransporte: "", factura: "",
    });
  }

  return (
    <div>
      <PageHeader modulo="06" title="Operaciones — Despachos" subtitle="Viajes de contenedores impo/expo con documentos (GRE, factura) y control de devolución." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Viajes en curso" value={enCurso} icon={Container} tone="orange" />
        <StatCard label="Importación" value={impo} icon={ArrowDownToLine} tone="blue" />
        <StatCard label="Exportación" value={expo} icon={ArrowUpFromLine} tone="green" />
        <StatCard label="Total viajes" value={viajes.length} icon={Container} tone="gray" />
      </div>

      <DataTable
        title="Operaciones y despachos"
        exportName="operaciones-despachos"
        columns={columns}
        rows={viajes}
        filters={filters}
        minWidth="min-w-[1200px]"
        pageSize={9}
        searchPlaceholder="Buscar por contenedor, cliente, conductor…"
        toolbar={
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            <Plus size={16} /> Nuevo viaje
          </button>
        }
      />

      <FormModal open={open} title="Nuevo viaje / despacho" subtitle="Registra el viaje del contenedor. Los documentos (GRE, factura) se completan luego." fields={fields} onSubmit={guardar} onClose={() => setOpen(false)} />
    </div>
  );
}
