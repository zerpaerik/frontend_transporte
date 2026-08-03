import { Plus, Package } from "lucide-react";
import { PageHeader, StatCard, TableWrap, Th, Td, Badge } from "@/components/ui";
import { REPUESTOS } from "@/lib/mock-data";
import { soles, fecha } from "@/lib/format";
import type { CalidadRepuesto } from "@/lib/types";

const calidadTone: Record<CalidadRepuesto, "green" | "blue" | "amber"> = {
  Original: "green",
  Alternativo: "blue",
  Remanufacturado: "amber",
};

export default function RepuestosPage() {
  const gasto = REPUESTOS.reduce((s, r) => s + r.costo, 0);
  const unidades = REPUESTOS.reduce((s, r) => s + r.cantidad, 0);

  return (
    <div>
      <PageHeader
        modulo="04"
        title="Repuestos y accesorios"
        subtitle="Control de calidad (original, alternativo, remanufacturado), garantía y proveedor."
        action={
          <button className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            <Plus size={16} /> Nuevo repuesto
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="Ítems registrados" value={REPUESTOS.length} icon={Package} tone="blue" />
        <StatCard label="Unidades" value={unidades} icon={Package} tone="gray" />
        <StatCard label="Inversión en repuestos" value={soles(gasto)} icon={Package} tone="orange" />
      </div>

      <TableWrap>
        <thead>
          <tr>
            <Th>Repuesto</Th><Th>Categoría</Th><Th>Calidad</Th><Th className="text-center">Cant.</Th><Th>Garantía</Th><Th>Proveedor</Th><Th>Fecha</Th><Th className="text-right">Costo</Th>
          </tr>
        </thead>
        <tbody>
          {REPUESTOS.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50/60">
              <Td className="font-semibold text-slate-900">{r.nombre}</Td>
              <Td>{r.categoria}</Td>
              <Td><Badge tone={calidadTone[r.calidad]}>{r.calidad}</Badge></Td>
              <Td className="tabular text-center">{r.cantidad}</Td>
              <Td>{r.garantia}</Td>
              <Td>{r.proveedor}</Td>
              <Td className="tabular whitespace-nowrap">{fecha(r.fecha)}</Td>
              <Td className="tabular text-right font-medium">{soles(r.costo)}</Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </div>
  );
}
