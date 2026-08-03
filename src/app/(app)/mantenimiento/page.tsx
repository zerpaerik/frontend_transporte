import { Plus, Wrench } from "lucide-react";
import { PageHeader, StatCard, TableWrap, Th, Td, Badge } from "@/components/ui";
import { ORDENES } from "@/lib/mock-data";
import { soles, fecha } from "@/lib/format";
import type { TipoMantenimiento } from "@/lib/types";

const tipoTone: Record<TipoMantenimiento, "blue" | "red" | "orange"> = {
  Preventivo: "blue",
  Correctivo: "red",
  Predictivo: "orange",
};

export default function MantenimientoPage() {
  const abiertas = ORDENES.filter((o) => o.estado !== "Cerrada").length;
  const gasto = ORDENES.reduce((s, o) => s + o.costo, 0);

  return (
    <div>
      <PageHeader
        modulo="03"
        title="Mantenimiento — Órdenes de trabajo"
        subtitle="Preventivo, correctivo y predictivo, con detalle técnico, responsable y costo."
        action={
          <button className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            <Plus size={16} /> Nueva orden
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="Órdenes activas" value={abiertas} icon={Wrench} tone="amber" />
        <StatCard label="Total órdenes" value={ORDENES.length} icon={Wrench} tone="gray" />
        <StatCard label="Gasto registrado" value={soles(gasto)} icon={Wrench} tone="orange" />
      </div>

      <TableWrap>
        <thead>
          <tr>
            <Th>Fecha</Th><Th>Placa</Th><Th>Tipo</Th><Th>Descripción</Th><Th>Responsable</Th><Th>Conductor</Th><Th className="text-right">Costo</Th><Th>Estado</Th>
          </tr>
        </thead>
        <tbody>
          {ORDENES.map((o) => (
            <tr key={o.id} className="hover:bg-slate-50/60">
              <Td className="tabular whitespace-nowrap">{fecha(o.fecha)}</Td>
              <Td className="font-semibold text-slate-900">{o.placa}</Td>
              <Td><Badge tone={tipoTone[o.tipo]}>{o.tipo}</Badge></Td>
              <Td className="max-w-xs"><span className="line-clamp-2 text-slate-600">{o.descripcion}</span></Td>
              <Td>{o.responsable}</Td>
              <Td>{o.conductor}</Td>
              <Td className="tabular text-right font-medium">{soles(o.costo)}</Td>
              <Td>
                <Badge tone={o.estado === "Cerrada" ? "green" : o.estado === "En proceso" ? "amber" : "gray"}>{o.estado}</Badge>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </div>
  );
}
