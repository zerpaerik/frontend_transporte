"use client";

import { useState } from "react";
import { Plus, CircleDot, Pencil, Trash2 } from "lucide-react";
import { PageHeader, StatCard, Badge } from "@/components/ui";
import { DataTable, type Column, type Filter } from "@/components/DataTable";
import { FormModal, type Field, type FormValues } from "@/components/FormModal";
import { useData } from "@/lib/store";
import { soles, km, fecha, fechaISO } from "@/lib/format";
import type { Neumatico } from "@/lib/types";

const estadoTone: Record<Neumatico["estado"], "green" | "blue" | "amber" | "orange" | "gray"> = {
  Nuevo: "green", "En uso": "blue", "Para rotar": "amber", Reencauche: "orange", Descartado: "gray",
};

const columns: Column<Neumatico>[] = [
  { key: "placa", header: "Placa", sortable: true, render: (n) => <span className="font-semibold text-slate-900">{n.placa}</span> },
  { key: "posicion", header: "Posición", sortable: true, render: (n) => <span className="font-medium text-steel-700">{n.posicion}</span> },
  { key: "marca", header: "Marca", sortable: true },
  { key: "recorrido", header: "Km recorridos", align: "right", sortable: true, value: (n) => Math.max(0, n.kmActual - n.kmInstalacion), render: (n) => <span className="tabular">{km(Math.max(0, n.kmActual - n.kmInstalacion))}</span> },
  { key: "tienda", header: "Tienda", sortable: true },
  { key: "costo", header: "Costo", align: "right", sortable: true, value: (n) => n.costo, render: (n) => <span className="tabular font-medium">{soles(n.costo)}</span> },
  { key: "registrado", header: "Registrado", value: (n) => fechaISO(n.createdAt || ""), render: (n) => <span className="tabular whitespace-nowrap">{n.createdAt ? fecha(n.createdAt) : "—"}</span> },
  { key: "estado", header: "Estado", sortable: true, render: (n) => <Badge tone={estadoTone[n.estado]}>{n.estado}</Badge> },
];

const filters: Filter<Neumatico>[] = [
  { key: "marca", label: "Marca", value: (n) => n.marca },
  { key: "estado", label: "Estado", value: (n) => n.estado },
];

export default function NeumaticosPage() {
  const { neumaticos, vehiculos, addNeumatico, updateNeumatico, removeNeumatico } = useData();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Neumatico | null>(null);

  const inversion = neumaticos.reduce((s, n) => s + n.costo, 0);
  const porRotar = neumaticos.filter((n) => n.estado === "Para rotar" || n.estado === "Reencauche").length;

  const fieldsFor = (n?: Neumatico): Field[] => [
    { name: "placa", label: "Vehículo", type: "select", options: vehiculos.filter((v) => v.tipo === "Tracto").map((v) => v.placa), default: n?.placa },
    { name: "posicion", label: "Posición en la unidad", type: "select", options: [
      "Delantero izq. (P1)", "Delantero der. (P1)", "Tracción int. izq. (P2)", "Tracción int. der. (P2)", "Tracción ext. izq. (P3)", "Tracción ext. der. (P3)",
    ], default: n?.posicion },
    { name: "marca", label: "Marca", type: "text", required: true, placeholder: "Michelin", default: n?.marca },
    { name: "kmInstalacion", label: "Km al instalar", type: "number", default: n?.kmInstalacion ?? 0 },
    { name: "kmActual", label: "Km actual", type: "number", default: n?.kmActual ?? 0 },
    { name: "costo", label: "Costo (S/)", type: "number", default: n?.costo ?? 0 },
    { name: "tienda", label: "Tienda", type: "text", placeholder: "Neumáticos Perú", default: n?.tienda },
    { name: "estado", label: "Estado", type: "select", options: ["Nuevo", "En uso", "Para rotar", "Reencauche", "Descartado"], default: n?.estado },
  ];

  function toBody(v: FormValues) {
    return {
      placa: String(v.placa), posicion: String(v.posicion), marca: String(v.marca), kmInstalacion: Number(v.kmInstalacion),
      kmActual: Number(v.kmActual), costo: Number(v.costo), tienda: String(v.tienda), estado: v.estado as Neumatico["estado"],
    };
  }
  function guardar(v: FormValues) { addNeumatico(toBody(v)); }
  function guardarEdit(v: FormValues) { if (edit) updateNeumatico(edit.id, toBody(v)); }

  return (
    <div>
      <PageHeader modulo="05" title="Neumáticos" subtitle="Cada llanta registrada por su posición exacta en la unidad, con kilometraje y costo." />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="Neumáticos" value={neumaticos.length} icon={CircleDot} tone="blue" />
        <StatCard label="Requieren atención" value={porRotar} icon={CircleDot} tone="amber" />
        <StatCard label="Inversión acumulada" value={soles(inversion)} icon={CircleDot} tone="orange" />
      </div>

      <DataTable
        title="Neumáticos por posición"
        exportName="neumaticos"
        columns={columns}
        rows={neumaticos}
        filters={filters}
        dateField={(n) => n.createdAt}
        dateLabel="Registrado"
        minWidth="min-w-[920px]"
        searchPlaceholder="Buscar por placa, marca, posición…"
        rowActions={(n) => (
          <div className="flex items-center justify-end gap-1">
            <button onClick={() => setEdit(n)} title="Editar" className="rounded-md p-1.5 text-slate-400 hover:bg-steel-50 hover:text-steel-600"><Pencil size={15} /></button>
            <button onClick={() => { if (confirm(`¿Eliminar el neumático ${n.marca} (${n.placa} · ${n.posicion})?`)) removeNeumatico(n.id); }} title="Eliminar" className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
          </div>
        )}
        toolbar={
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            <Plus size={16} /> Registrar neumático
          </button>
        }
      />

      <FormModal open={open} title="Registrar neumático" subtitle="Asocia la llanta a su posición exacta en la unidad." fields={fieldsFor()} onSubmit={guardar} onClose={() => setOpen(false)} />
      {edit ? <FormModal open title={`Editar neumático — ${edit.placa}`} subtitle="Corrige los datos del neumático." fields={fieldsFor(edit)} submitLabel="Guardar cambios" onSubmit={guardarEdit} onClose={() => setEdit(null)} /> : null}
    </div>
  );
}
