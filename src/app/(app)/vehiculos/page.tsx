"use client";

import { useState } from "react";
import { Plus, Truck, Paperclip } from "lucide-react";
import { PageHeader, StatCard, Badge } from "@/components/ui";
import { DataTable, type Column, type Filter } from "@/components/DataTable";
import { FormModal, type Field, type FormValues } from "@/components/FormModal";
import { DocumentosModal } from "@/components/DocumentosModal";
import { useData } from "@/lib/store";
import { km } from "@/lib/format";
import type { Vehiculo } from "@/lib/types";

const fields: Field[] = [
  { name: "placa", label: "Placa", type: "text", required: true, placeholder: "AAT-843" },
  { name: "tipo", label: "Tipo", type: "select", options: ["Tracto", "Carreta"] },
  { name: "marca", label: "Marca", type: "text", required: true, placeholder: "Volvo" },
  { name: "modelo", label: "Modelo", type: "text", placeholder: "FH 460" },
  { name: "anio", label: "Año", type: "number", default: 2022 },
  { name: "kilometraje", label: "Kilometraje", type: "number", default: 0 },
  { name: "estado", label: "Estado", type: "select", options: ["Operativo", "En taller", "Inactivo"], full: true },
];

const columns: Column<Vehiculo>[] = [
  { key: "placa", header: "Placa", sortable: true, render: (v) => <span className="font-semibold text-slate-900">{v.placa}</span> },
  { key: "tipo", header: "Tipo", sortable: true, render: (v) => <Badge tone={v.tipo === "Tracto" ? "blue" : "gray"}>{v.tipo}</Badge> },
  { key: "marca", header: "Marca", sortable: true },
  { key: "modelo", header: "Modelo" },
  { key: "anio", header: "Año", align: "right", sortable: true },
  { key: "kilometraje", header: "Kilometraje", align: "right", sortable: true, value: (v) => v.kilometraje, render: (v) => <span className="tabular">{v.tipo === "Carreta" ? "—" : km(v.kilometraje)}</span> },
  { key: "estado", header: "Estado", sortable: true, render: (v) => <Badge tone={v.estado === "Operativo" ? "green" : v.estado === "En taller" ? "amber" : "gray"}>{v.estado}</Badge> },
];

function docsColumn(onOpen: (v: Vehiculo) => void): Column<Vehiculo> {
  return {
    key: "docs", header: "Documentos",
    render: (v) => (
      <button onClick={() => onOpen(v)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600">
        <Paperclip size={13} /> {((v as any).documentos?.length ?? 0)} doc.
      </button>
    ),
  };
}

const filters: Filter<Vehiculo>[] = [
  { key: "tipo", label: "Tipo", value: (v) => v.tipo },
  { key: "estado", label: "Estado", value: (v) => v.estado },
];

export default function VehiculosPage() {
  const { vehiculos, addVehiculo, reload } = useData();
  const [open, setOpen] = useState(false);
  const [docVeh, setDocVeh] = useState<Vehiculo | null>(null);

  const tractos = vehiculos.filter((v) => v.tipo === "Tracto").length;
  const carretas = vehiculos.filter((v) => v.tipo === "Carreta").length;
  const enTaller = vehiculos.filter((v) => v.estado === "En taller").length;

  function guardar(v: FormValues) {
    addVehiculo({
      placa: String(v.placa).toUpperCase(), tipo: v.tipo as Vehiculo["tipo"], marca: String(v.marca),
      modelo: String(v.modelo), anio: Number(v.anio), kilometraje: Number(v.kilometraje), estado: v.estado as Vehiculo["estado"],
    });
  }

  return (
    <div>
      <PageHeader modulo="01" title="Flota — Vehículos" subtitle="Tractos y carretas con placa, marca, modelo, año y kilometraje." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tractos" value={tractos} icon={Truck} tone="blue" />
        <StatCard label="Carretas" value={carretas} icon={Truck} tone="orange" />
        <StatCard label="En taller" value={enTaller} icon={Truck} tone="amber" />
        <StatCard label="Total unidades" value={vehiculos.length} icon={Truck} tone="gray" />
      </div>

      <DataTable
        title="Flota de vehículos"
        exportName="flota-vehiculos"
        columns={[...columns, docsColumn((v) => setDocVeh(v))]}
        rows={vehiculos}
        filters={filters}
        searchPlaceholder="Buscar por placa, marca, modelo…"
        toolbar={
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            <Plus size={16} /> Nuevo vehículo
          </button>
        }
      />

      <FormModal open={open} title="Nuevo vehículo" subtitle="Registra un tracto o carreta en la flota." fields={fields} onSubmit={guardar} onClose={() => setOpen(false)} />

      {docVeh ? (
        <DocumentosModal
          open
          base="vehiculos"
          entityId={docVeh.id}
          title={`Documentos — ${docVeh.placa}`}
          subtitle={`${docVeh.marca} ${docVeh.modelo}`}
          documentos={(docVeh as any).documentos ?? []}
          onChanged={(u) => setDocVeh(u)}
          onClose={() => { setDocVeh(null); reload(); }}
        />
      ) : null}
    </div>
  );
}
