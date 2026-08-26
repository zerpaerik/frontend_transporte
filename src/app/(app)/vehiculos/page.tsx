"use client";

import { useState } from "react";
import { Plus, Truck, Paperclip, Pencil } from "lucide-react";
import { PageHeader, StatCard, Badge } from "@/components/ui";
import { DataTable, type Column, type Filter } from "@/components/DataTable";
import { FormModal, type Field, type FormValues } from "@/components/FormModal";
import { DocumentosModal } from "@/components/DocumentosModal";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { km } from "@/lib/format";
import type { Vehiculo } from "@/lib/types";

function buildFields(v?: Vehiculo): Field[] {
  return [
    { name: "placa", label: "Placa", type: "text", required: true, placeholder: "AAT-843", default: v?.placa },
    { name: "tipo", label: "Tipo", type: "select", options: ["Tracto", "Carreta"], default: v?.tipo },
    { name: "marca", label: "Marca", type: "text", required: true, placeholder: "Volvo", default: v?.marca },
    { name: "modelo", label: "Modelo", type: "text", placeholder: "FH 460", default: v?.modelo },
    { name: "anio", label: "Año", type: "number", default: v?.anio ?? 2022 },
    { name: "kilometraje", label: "Kilometraje", type: "number", default: v?.kilometraje ?? 0 },
    { name: "estado", label: "Estado", type: "select", options: ["Operativo", "En taller", "Inactivo"], full: true, default: v?.estado },
  ];
}

const columns: Column<Vehiculo>[] = [
  { key: "placa", header: "Placa", sortable: true, render: (v) => <span className="font-semibold text-slate-900">{v.placa}</span> },
  { key: "tipo", header: "Tipo", sortable: true, render: (v) => <Badge tone={v.tipo === "Tracto" ? "blue" : "gray"}>{v.tipo}</Badge> },
  { key: "marca", header: "Marca", sortable: true },
  { key: "modelo", header: "Modelo" },
  { key: "anio", header: "Año", align: "right", sortable: true },
  { key: "kilometraje", header: "Kilometraje", align: "right", sortable: true, value: (v) => v.kilometraje, render: (v) => <span className="tabular">{v.tipo === "Carreta" ? "—" : km(v.kilometraje)}</span> },
  { key: "estado", header: "Estado", sortable: true, render: (v) => <Badge tone={v.estado === "Operativo" ? "green" : v.estado === "En taller" ? "amber" : "gray"}>{v.estado}</Badge> },
];

const filters: Filter<Vehiculo>[] = [
  { key: "tipo", label: "Tipo", value: (v) => v.tipo },
  { key: "estado", label: "Estado", value: (v) => v.estado },
];

function accionesColumn(onEdit: (v: Vehiculo) => void, onDocs: (v: Vehiculo) => void, readOnly: boolean): Column<Vehiculo> {
  return {
    key: "acciones", header: "Acciones",
    render: (v) => (
      <div className="flex items-center gap-1.5">
        {!readOnly ? (
          <button onClick={() => onEdit(v)} title="Editar vehículo" className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600">
            <Pencil size={13} /> Editar
          </button>
        ) : null}
        <button onClick={() => onDocs(v)} title="Documentos" className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600">
          <Paperclip size={13} /> {((v as any).documentos?.length ?? 0)}
        </button>
      </div>
    ),
  };
}

export default function VehiculosPage() {
  const { vehiculos, addVehiculo, updateVehiculo, reload } = useData();
  const { user } = useAuth();
  const readOnly = user?.rol === "Conductor";
  const [open, setOpen] = useState(false);
  const [editVeh, setEditVeh] = useState<Vehiculo | null>(null);
  const [docVeh, setDocVeh] = useState<Vehiculo | null>(null);

  const tractos = vehiculos.filter((v) => v.tipo === "Tracto").length;
  const carretas = vehiculos.filter((v) => v.tipo === "Carreta").length;
  const enTaller = vehiculos.filter((v) => v.estado === "En taller").length;

  function toDto(v: FormValues) {
    return {
      placa: String(v.placa).toUpperCase(), tipo: v.tipo as Vehiculo["tipo"], marca: String(v.marca),
      modelo: String(v.modelo), anio: Number(v.anio), kilometraje: Number(v.kilometraje), estado: v.estado as Vehiculo["estado"],
    };
  }
  function guardar(v: FormValues) { addVehiculo(toDto(v)); }
  function guardarEdit(v: FormValues) { if (editVeh) updateVehiculo(editVeh.id, toDto(v)); }

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
        columns={[...columns, accionesColumn((v) => setEditVeh(v), (v) => setDocVeh(v), readOnly)]}
        rows={vehiculos}
        filters={filters}
        searchPlaceholder="Buscar por placa, marca, modelo…"
        toolbar={
          !readOnly ? (
            <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
              <Plus size={16} /> Nuevo vehículo
            </button>
          ) : null
        }
      />

      <FormModal open={open} title="Nuevo vehículo" subtitle="Registra un tracto o carreta en la flota." fields={buildFields()} onSubmit={guardar} onClose={() => setOpen(false)} />

      {editVeh ? (
        <FormModal
          open
          title={`Editar vehículo — ${editVeh.placa}`}
          subtitle="Modifica los datos de la unidad."
          fields={buildFields(editVeh)}
          submitLabel="Guardar cambios"
          onSubmit={guardarEdit}
          onClose={() => setEditVeh(null)}
        />
      ) : null}

      {docVeh ? (
        <DocumentosModal
          open
          base="vehiculos"
          entityId={docVeh.id}
          title={`Documentos — ${docVeh.placa}`}
          subtitle={`${docVeh.marca} ${docVeh.modelo}`}
          documentos={(docVeh as any).documentos ?? []}
          readOnly={readOnly}
          onChanged={(u) => setDocVeh(u)}
          onClose={() => { setDocVeh(null); reload(); }}
        />
      ) : null}
    </div>
  );
}
