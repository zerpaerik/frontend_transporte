"use client";

import { useState } from "react";
import { Plus, Wallet, Users } from "lucide-react";
import { PageHeader, StatCard, Badge } from "@/components/ui";
import { DataTable, type Column, type Filter } from "@/components/DataTable";
import { FormModal, type Field, type FormValues } from "@/components/FormModal";
import { useData } from "@/lib/store";
import { soles } from "@/lib/format";
import type { Empleado } from "@/lib/types";

const neto = (e: Empleado) => e.sueldoBase + e.bonos - e.descuentos;

const fields: Field[] = [
  { name: "nombre", label: "Trabajador", type: "text", required: true, placeholder: "Julio Grimaldo", full: true },
  { name: "cargo", label: "Cargo", type: "text", placeholder: "Chofer A-IIIC" },
  { name: "tipo", label: "Tipo", type: "select", options: ["Chofer", "Administrativo"] },
  { name: "periodo", label: "Período", type: "text", default: "Julio 2026" },
  { name: "sueldoBase", label: "Sueldo básico (S/)", type: "number", default: 0 },
  { name: "bonos", label: "Bonos (S/)", type: "number", default: 0 },
  { name: "descuentos", label: "Descuentos (S/)", type: "number", default: 0 },
  { name: "estadoPago", label: "Estado de pago", type: "select", options: ["Pendiente", "Pagado"] },
];

const columns: Column<Empleado>[] = [
  { key: "nombre", header: "Trabajador", sortable: true, render: (e) => <span className="font-semibold text-slate-900">{e.nombre}</span> },
  { key: "cargo", header: "Cargo", render: (e) => <span className="text-slate-600">{e.cargo}</span> },
  { key: "tipo", header: "Tipo", sortable: true, render: (e) => <Badge tone={e.tipo === "Chofer" ? "orange" : "blue"}>{e.tipo}</Badge> },
  { key: "periodo", header: "Período" },
  { key: "sueldoBase", header: "Básico", align: "right", sortable: true, value: (e) => e.sueldoBase, render: (e) => <span className="tabular">{soles(e.sueldoBase)}</span> },
  { key: "bonos", header: "Bonos", align: "right", value: (e) => e.bonos, render: (e) => <span className="tabular text-emerald-600">+{soles(e.bonos)}</span> },
  { key: "descuentos", header: "Descuentos", align: "right", value: (e) => e.descuentos, render: (e) => <span className="tabular text-rose-500">−{soles(e.descuentos)}</span> },
  { key: "neto", header: "Neto", align: "right", sortable: true, value: (e) => neto(e), render: (e) => <span className="tabular font-semibold text-slate-900">{soles(neto(e))}</span> },
  { key: "estadoPago", header: "Pago", sortable: true, render: (e) => <Badge tone={e.estadoPago === "Pagado" ? "green" : "amber"}>{e.estadoPago}</Badge> },
];

const filters: Filter<Empleado>[] = [
  { key: "tipo", label: "Tipo", value: (e) => e.tipo },
  { key: "estadoPago", label: "Pago", value: (e) => e.estadoPago },
];

export default function PlanillaPage() {
  const { empleados, addEmpleado } = useData();
  const [open, setOpen] = useState(false);

  const totalNeto = empleados.reduce((s, e) => s + neto(e), 0);
  const choferes = empleados.filter((e) => e.tipo === "Chofer").length;
  const pendientes = empleados.filter((e) => e.estadoPago === "Pendiente").length;

  function guardar(v: FormValues) {
    addEmpleado({
      nombre: String(v.nombre), cargo: String(v.cargo), tipo: v.tipo as Empleado["tipo"], sueldoBase: Number(v.sueldoBase),
      bonos: Number(v.bonos), descuentos: Number(v.descuentos), periodo: String(v.periodo), estadoPago: v.estadoPago as Empleado["estadoPago"],
    });
  }

  return (
    <div>
      <PageHeader modulo="10" title="Planilla y sueldos" subtitle="Sueldos de choferes y personal administrativo, con conceptos y estado de pago por período." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Personal" value={empleados.length} icon={Users} tone="blue" />
        <StatCard label="Choferes" value={choferes} icon={Users} tone="orange" />
        <StatCard label="Pagos pendientes" value={pendientes} icon={Wallet} tone="amber" />
        <StatCard label="Planilla neta" value={soles(totalNeto)} icon={Wallet} tone="green" hint="período actual" />
      </div>

      <DataTable
        title="Planilla de sueldos"
        exportName="planilla-sueldos"
        columns={columns}
        rows={empleados}
        filters={filters}
        minWidth="min-w-[980px]"
        searchPlaceholder="Buscar por trabajador, cargo…"
        toolbar={
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            <Plus size={16} /> Nuevo trabajador
          </button>
        }
      />

      <FormModal open={open} title="Nuevo trabajador" subtitle="El neto se calcula como básico + bonos − descuentos." fields={fields} onSubmit={guardar} onClose={() => setOpen(false)} />
    </div>
  );
}
