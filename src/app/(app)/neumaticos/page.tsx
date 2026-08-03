import { Plus, CircleDot } from "lucide-react";
import { PageHeader, StatCard, TableWrap, Th, Td, Badge } from "@/components/ui";
import { NEUMATICOS } from "@/lib/mock-data";
import { soles, km } from "@/lib/format";
import type { Neumatico } from "@/lib/types";

const estadoTone: Record<Neumatico["estado"], "green" | "blue" | "amber" | "orange" | "gray"> = {
  Nuevo: "green",
  "En uso": "blue",
  "Para rotar": "amber",
  Reencauche: "orange",
  Descartado: "gray",
};

export default function NeumaticosPage() {
  const inversion = NEUMATICOS.reduce((s, n) => s + n.costo, 0);
  const porRotar = NEUMATICOS.filter((n) => n.estado === "Para rotar" || n.estado === "Reencauche").length;

  return (
    <div>
      <PageHeader
        modulo="05"
        title="Neumáticos"
        subtitle="Cada llanta registrada por su posición exacta en la unidad, con kilometraje y costo."
        action={
          <button className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            <Plus size={16} /> Registrar neumático
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="Neumáticos" value={NEUMATICOS.length} icon={CircleDot} tone="blue" />
        <StatCard label="Requieren atención" value={porRotar} icon={CircleDot} tone="amber" />
        <StatCard label="Inversión acumulada" value={soles(inversion)} icon={CircleDot} tone="orange" />
      </div>

      <TableWrap>
        <thead>
          <tr>
            <Th>Placa</Th><Th>Posición</Th><Th>Marca</Th><Th className="text-right">Km recorridos</Th><Th>Tienda</Th><Th className="text-right">Costo</Th><Th>Estado</Th>
          </tr>
        </thead>
        <tbody>
          {NEUMATICOS.map((n) => (
            <tr key={n.id} className="hover:bg-slate-50/60">
              <Td className="font-semibold text-slate-900">{n.placa}</Td>
              <Td className="font-medium text-steel-700">{n.posicion}</Td>
              <Td>{n.marca}</Td>
              <Td className="tabular text-right">{km(n.kmActual - n.kmInstalacion)}</Td>
              <Td>{n.tienda}</Td>
              <Td className="tabular text-right font-medium">{soles(n.costo)}</Td>
              <Td><Badge tone={estadoTone[n.estado]}>{n.estado}</Badge></Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </div>
  );
}
