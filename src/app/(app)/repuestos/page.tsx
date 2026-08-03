"use client";

import { useState } from "react";
import { Plus, Package } from "lucide-react";
import { PageHeader, StatCard, Badge } from "@/components/ui";
import { DataTable, type Column, type Filter } from "@/components/DataTable";
import { FormModal, type Field, type FormValues } from "@/components/FormModal";
import { useData } from "@/lib/store";
import { soles, fecha } from "@/lib/format";
import type { CalidadRepuesto, Repuesto } from "@/lib/types";

const calidadTone: Record<CalidadRepuesto, "green" | "blue" | "amber"> = {
  Original: "green", Alternativo: "blue", Remanufacturado: "amber",
};

const fields: Field[] = [
  { name: "nombre", label: "Repuesto", type: "text", required: true, placeholder: "Pastillas de freno", full: true },
  { name: "categoria", label: "Categoría", type: "select", options: ["Frenos", "Filtros", "Transmisión", "Eléctrico", "Motor", "Suspensión", "Refrigeración", "Otros"] },
  { name: "calidad", label: "Calidad", type: "select", options: ["Original", "Alternativo", "Remanufacturado"] },
  { name: "cantidad", label: "Cantidad", type: "number", default: 1 },
  { name: "garantia", label: "Garantía", type: "text", placeholder: "12 meses" },
  { name: "proveedor", label: "Proveedor / tienda", type: "text", placeholder: "Repuestos DP" },
  { name: "costo", label: "Costo (S/)", type: "number", default: 0 },
  { name: "fecha", label: "Fecha de compra", type: "date", required: true },
];

const columns: Column<Repuesto>[] = [
  { key: "nombre", header: "Repuesto", sortable: true, render: (r) => <span className="font-semibold text-slate-900">{r.nombre}</span> },
  { key: "categoria", header: "Categoría", sortable: true },
  { key: "calidad", header: "Calidad", sortable: true, render: (r) => <Badge tone={calidadTone[r.calidad]}>{r.calidad}</Badge> },
  { key: "cantidad", header: "Cant.", align: "center", sortable: true },
  { key: "garantia", header: "Garantía" },
  { key: "proveedor", header: "Proveedor", sortable: true },
  { key: "fecha", header: "Fecha", value: (r) => r.fecha, render: (r) => <span className="tabular whitespace-nowrap">{fecha(r.fecha)}</span> },
  { key: "costo", header: "Costo", align: "right", sortable: true, value: (r) => r.costo, render: (r) => <span className="tabular font-medium">{soles(r.costo)}</span> },
];

const filters: Filter<Repuesto>[] = [
  { key: "categoria", label: "Categoría", value: (r) => r.categoria },
  { key: "calidad", label: "Calidad", value: (r) => r.calidad },
];

export default function RepuestosPage() {
  const { repuestos, addRepuesto } = useData();
  const [open, setOpen] = useState(false);

  const gasto = repuestos.reduce((s, r) => s + r.costo, 0);
  const unidades = repuestos.reduce((s, r) => s + r.cantidad, 0);

  function guardar(v: FormValues) {
    addRepuesto({
      nombre: String(v.nombre), categoria: String(v.categoria), calidad: v.calidad as Repuesto["calidad"],
      cantidad: Number(v.cantidad), garantia: String(v.garantia), proveedor: String(v.proveedor), costo: Number(v.costo), fecha: String(v.fecha),
    });
  }

  return (
    <div>
      <PageHeader modulo="04" title="Repuestos y accesorios" subtitle="Control de calidad (original, alternativo, remanufacturado), garantía y proveedor." />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="Ítems registrados" value={repuestos.length} icon={Package} tone="blue" />
        <StatCard label="Unidades" value={unidades} icon={Package} tone="gray" />
        <StatCard label="Inversión en repuestos" value={soles(gasto)} icon={Package} tone="orange" />
      </div>

      <DataTable
        title="Repuestos y accesorios"
        exportName="repuestos"
        columns={columns}
        rows={repuestos}
        filters={filters}
        minWidth="min-w-[860px]"
        searchPlaceholder="Buscar por repuesto, proveedor…"
        toolbar={
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            <Plus size={16} /> Nuevo repuesto
          </button>
        }
      />

      <FormModal open={open} title="Nuevo repuesto" subtitle="Registra un repuesto o accesorio con su calidad, garantía y costo." fields={fields} onSubmit={guardar} onClose={() => setOpen(false)} />
    </div>
  );
}
