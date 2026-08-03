"use client";

import { useState } from "react";
import { Plus, Wrench } from "lucide-react";
import { PageHeader, StatCard, Badge } from "@/components/ui";
import { DataTable, type Column, type Filter } from "@/components/DataTable";
import { FormModal, type Field, type FormValues } from "@/components/FormModal";
import { useData } from "@/lib/store";
import { soles, fecha } from "@/lib/format";
import type { TipoMantenimiento, OrdenTrabajo } from "@/lib/types";

const tipoTone: Record<TipoMantenimiento, "blue" | "red" | "orange"> = {
  Preventivo: "blue", Correctivo: "red", Predictivo: "orange",
};

const columns: Column<OrdenTrabajo>[] = [
  { key: "fecha", header: "Fecha", sortable: true, value: (o) => o.fecha, render: (o) => <span className="tabular whitespace-nowrap">{fecha(o.fecha)}</span> },
  { key: "placa", header: "Placa", sortable: true, render: (o) => <span className="font-semibold text-slate-900">{o.placa}</span> },
  { key: "tipo", header: "Tipo", sortable: true, render: (o) => <Badge tone={tipoTone[o.tipo]}>{o.tipo}</Badge> },
  { key: "descripcion", header: "Descripción", render: (o) => <span className="line-clamp-2 max-w-xs text-slate-600">{o.descripcion}</span> },
  { key: "responsable", header: "Responsable" },
  { key: "conductor", header: "Conductor" },
  { key: "costo", header: "Costo", align: "right", sortable: true, value: (o) => o.costo, render: (o) => <span className="tabular font-medium">{soles(o.costo)}</span> },
  { key: "estado", header: "Estado", sortable: true, render: (o) => <Badge tone={o.estado === "Cerrada" ? "green" : o.estado === "En proceso" ? "amber" : "gray"}>{o.estado}</Badge> },
];

const filters: Filter<OrdenTrabajo>[] = [
  { key: "tipo", label: "Tipo", value: (o) => o.tipo },
  { key: "estado", label: "Estado", value: (o) => o.estado },
];

export default function MantenimientoPage() {
  const { ordenes, vehiculos, conductores, addOrden } = useData();
  const [open, setOpen] = useState(false);

  const abiertas = ordenes.filter((o) => o.estado !== "Cerrada").length;
  const gasto = ordenes.reduce((s, o) => s + o.costo, 0);

  const fields: Field[] = [
    { name: "fecha", label: "Fecha", type: "date", required: true },
    { name: "placa", label: "Vehículo", type: "select", options: vehiculos.filter((v) => v.tipo === "Tracto").map((v) => v.placa) },
    { name: "tipo", label: "Tipo de mantenimiento", type: "select", options: ["Preventivo", "Correctivo", "Predictivo"] },
    { name: "descripcion", label: "Detalle técnico (falla / diagnóstico / solución)", type: "text", required: true, full: true, placeholder: "Cambio de pastillas y discos de freno" },
    { name: "responsable", label: "Responsable (mecánico o taller)", type: "text", placeholder: "Taller Diesel Pro" },
    { name: "conductor", label: "Conductor asignado", type: "select", options: conductores.map((c) => c.nombre) },
    { name: "costo", label: "Costo (S/)", type: "number", default: 0 },
    { name: "estado", label: "Estado", type: "select", options: ["Abierta", "En proceso", "Cerrada"] },
  ];

  function guardar(v: FormValues) {
    addOrden({
      fecha: String(v.fecha), placa: String(v.placa), tipo: v.tipo as OrdenTrabajo["tipo"], descripcion: String(v.descripcion),
      responsable: String(v.responsable), conductor: String(v.conductor), costo: Number(v.costo), estado: v.estado as OrdenTrabajo["estado"],
    });
  }

  return (
    <div>
      <PageHeader modulo="03" title="Mantenimiento — Órdenes de trabajo" subtitle="Preventivo, correctivo y predictivo, con detalle técnico, responsable y costo." />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="Órdenes activas" value={abiertas} icon={Wrench} tone="amber" />
        <StatCard label="Total órdenes" value={ordenes.length} icon={Wrench} tone="gray" />
        <StatCard label="Gasto registrado" value={soles(gasto)} icon={Wrench} tone="orange" />
      </div>

      <DataTable
        title="Órdenes de mantenimiento"
        exportName="mantenimiento-ordenes"
        columns={columns}
        rows={ordenes}
        filters={filters}
        minWidth="min-w-[900px]"
        searchPlaceholder="Buscar por placa, descripción, responsable…"
        toolbar={
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            <Plus size={16} /> Nueva orden
          </button>
        }
      />

      <FormModal open={open} title="Nueva orden de trabajo" subtitle="Registra una reparación o mantenimiento con su costo y responsable." fields={fields} onSubmit={guardar} onClose={() => setOpen(false)} />
    </div>
  );
}
