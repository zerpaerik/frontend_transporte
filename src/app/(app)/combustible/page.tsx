"use client";

import { useMemo, useState } from "react";
import { Plus, Fuel, Gauge, Droplet, Pencil, Trash2 } from "lucide-react";
import { PageHeader, StatCard, Badge } from "@/components/ui";
import { DataTable, type Column, type Filter } from "@/components/DataTable";
import { FormModal, type Field, type FormValues } from "@/components/FormModal";
import { useData } from "@/lib/store";
import { soles, fecha } from "@/lib/format";
import type { Combustible } from "@/lib/types";

const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const kmFmt = (n: number) => n.toLocaleString("es-PE");
const galFmt = (n: number) => n.toLocaleString("es-PE", { maximumFractionDigits: 2 });
const rendFmt = (n: number) => n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const tipoTone = (t: string): "orange" | "blue" | "green" | "gray" =>
  t === "Diésel" ? "orange" : t === "Gasolina" ? "blue" : t === "GNV" ? "green" : "gray";

// km recorridos y rendimiento (km/galón) por vehículo, comparando cada carga con la anterior (por odómetro).
type Calc = Record<string, { kmRec: number | null; rend: number | null }>;
function calcular(rows: Combustible[]): Calc {
  const byPlaca: Record<string, Combustible[]> = {};
  for (const c of rows) (byPlaca[c.placa] ||= []).push(c);
  const res: Calc = {};
  for (const placa in byPlaca) {
    const arr = byPlaca[placa].slice().sort((a, b) => a.kilometraje - b.kilometraje);
    for (let i = 0; i < arr.length; i++) {
      if (i === 0) { res[arr[i].id] = { kmRec: null, rend: null }; continue; }
      const kmRec = arr[i].kilometraje - arr[i - 1].kilometraje;
      const rend = kmRec > 0 && arr[i].galones > 0 ? kmRec / arr[i].galones : null;
      res[arr[i].id] = { kmRec: kmRec > 0 ? kmRec : null, rend };
    }
  }
  return res;
}

const fieldsFor = (placas: string[], c?: Combustible): Field[] => [
  { name: "fecha", label: "Fecha", type: "date", required: true, default: c?.fecha ?? hoyISO() },
  { name: "placa", label: "Vehículo (tracto o carreta)", type: "select", options: placas, default: c?.placa },
  { name: "tipoCombustible", label: "Tipo de combustible", type: "select", options: ["Diésel", "Gasolina", "GNV", "GLP"], default: c?.tipoCombustible },
  { name: "kilometraje", label: "Kilometraje (odómetro)", type: "number", default: c?.kilometraje ?? 0 },
  { name: "galones", label: "Galones", type: "number", step: 0.01, default: c?.galones ?? 0 },
  { name: "monto", label: "Monto (S/)", type: "number", step: 0.01, default: c?.monto ?? 0 },
  { name: "tipoPago", label: "Tipo de pago", type: "select", options: ["", "Transferencia", "Efectivo", "Crédito", "Vale"], default: c?.tipoPago },
  { name: "observacion", label: "Observación", type: "text", full: true, placeholder: "Grifo, notas… (opcional)", default: c?.observacion },
];

export default function CombustiblePage() {
  const { combustible, vehiculos, addCombustible, updateCombustible, removeCombustible } = useData();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Combustible | null>(null);

  const placas = vehiculos.map((v) => v.placa);
  const calc = useMemo(() => calcular(combustible), [combustible]);

  const totalGal = combustible.reduce((s, c) => s + c.galones, 0);
  const totalGasto = combustible.reduce((s, c) => s + c.monto, 0);
  const rends = combustible.map((c) => calc[c.id]?.rend).filter((r): r is number => r != null && r > 0);
  const rendProm = rends.length ? rends.reduce((s, r) => s + r, 0) / rends.length : 0;

  const columns: Column<Combustible>[] = [
    { key: "fecha", header: "Fecha", sortable: true, value: (c) => c.fecha, render: (c) => <span className="tabular whitespace-nowrap">{fecha(c.fecha)}</span> },
    { key: "placa", header: "Vehículo", sortable: true, render: (c) => <span className="font-semibold text-slate-900">{c.placa}</span> },
    { key: "tipoCombustible", header: "Combustible", sortable: true, render: (c) => <Badge tone={tipoTone(c.tipoCombustible)}>{c.tipoCombustible}</Badge> },
    { key: "kilometraje", header: "Kilometraje", align: "right", sortable: true, value: (c) => c.kilometraje, render: (c) => <span className="tabular">{kmFmt(c.kilometraje)}</span> },
    { key: "galones", header: "Galones", align: "right", sortable: true, value: (c) => c.galones, render: (c) => <span className="tabular">{galFmt(c.galones)}</span> },
    { key: "kmRec", header: "Km recorridos", align: "right", value: (c) => calc[c.id]?.kmRec ?? 0, render: (c) => { const k = calc[c.id]?.kmRec; return k != null ? <span className="tabular">{kmFmt(k)}</span> : <span className="text-slate-300">—</span>; } },
    { key: "rend", header: "Rendimiento", align: "right", value: (c) => calc[c.id]?.rend ?? 0, render: (c) => { const r = calc[c.id]?.rend; return r != null ? <span className="tabular font-semibold text-slate-800">{rendFmt(r)} <span className="text-xs font-normal text-slate-400">km/gal</span></span> : <span className="text-slate-300">—</span>; } },
    { key: "monto", header: "Monto", align: "right", sortable: true, value: (c) => c.monto, render: (c) => <span className="tabular font-medium">{soles(c.monto)}</span> },
    { key: "tipoPago", header: "Pago", render: (c) => c.tipoPago ? <span className="text-slate-600">{c.tipoPago}</span> : <span className="text-slate-300">—</span> },
  ];

  const filters: Filter<Combustible>[] = [
    { key: "placa", label: "Vehículo", value: (c) => c.placa },
    { key: "tipoCombustible", label: "Combustible", value: (c) => c.tipoCombustible },
  ];

  function toBody(v: FormValues) {
    return {
      fecha: String(v.fecha), placa: String(v.placa), tipoCombustible: String(v.tipoCombustible || "Diésel"),
      kilometraje: Number(v.kilometraje), galones: Number(v.galones), monto: Number(v.monto),
      tipoPago: String(v.tipoPago || ""), observacion: String(v.observacion || ""),
    };
  }
  function guardar(v: FormValues) { addCombustible(toBody(v)); }
  function guardarEdit(v: FormValues) { if (edit) updateCombustible(edit.id, toBody(v)); }

  return (
    <div>
      <PageHeader modulo="12" title="Combustible" subtitle="Abastecimiento por vehículo con kilometraje, galones y rendimiento (km/galón) calculado automáticamente." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Cargas registradas" value={combustible.length} icon={Fuel} tone="blue" />
        <StatCard label="Galones totales" value={galFmt(totalGal)} icon={Droplet} tone="orange" />
        <StatCard label="Rendimiento prom." value={rendProm ? `${rendFmt(rendProm)} km/gal` : "—"} icon={Gauge} tone="green" hint="cargas con dato previo" />
        <StatCard label="Gasto en combustible" value={soles(totalGasto)} icon={Fuel} tone="gray" />
      </div>

      <DataTable
        title="Abastecimiento de combustible"
        exportName="combustible"
        columns={columns}
        rows={combustible}
        filters={filters}
        dateField={(c) => c.fecha}
        dateLabel="Fecha"
        minWidth="min-w-[1040px]"
        searchPlaceholder="Buscar por vehículo, tipo, pago…"
        rowActions={(c) => (
          <div className="flex items-center justify-end gap-1">
            <button onClick={() => setEdit(c)} title="Editar" className="rounded-md p-1.5 text-slate-400 hover:bg-steel-50 hover:text-steel-600"><Pencil size={15} /></button>
            <button onClick={() => { if (confirm(`¿Eliminar la carga de ${c.placa} del ${fecha(c.fecha)}?`)) removeCombustible(c.id); }} title="Eliminar" className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
          </div>
        )}
        toolbar={
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            <Plus size={16} /> Nueva carga
          </button>
        }
      />

      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
        <Gauge size={12} /> El rendimiento se calcula como (km recorridos desde la carga anterior) ÷ galones. La primera carga de cada vehículo no tiene rendimiento porque no hay dato previo.
      </p>

      <FormModal open={open} title="Nueva carga de combustible" subtitle="Registra el abastecimiento con el kilometraje del odómetro y los galones." fields={fieldsFor(placas)} onSubmit={guardar} onClose={() => setOpen(false)} />
      {edit ? <FormModal open title={`Editar carga — ${edit.placa}`} subtitle="Corrige los datos del abastecimiento." fields={fieldsFor(placas, edit)} submitLabel="Guardar cambios" onSubmit={guardarEdit} onClose={() => setEdit(null)} /> : null}
    </div>
  );
}
