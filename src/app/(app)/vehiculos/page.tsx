import { Plus, Truck } from "lucide-react";
import { PageHeader, StatCard, TableWrap, Th, Td, Badge } from "@/components/ui";
import { VEHICULOS } from "@/lib/mock-data";
import { km } from "@/lib/format";

export default function VehiculosPage() {
  const tractos = VEHICULOS.filter((v) => v.tipo === "Tracto").length;
  const carretas = VEHICULOS.filter((v) => v.tipo === "Carreta").length;
  const enTaller = VEHICULOS.filter((v) => v.estado === "En taller").length;

  return (
    <div>
      <PageHeader
        modulo="01"
        title="Flota — Vehículos"
        subtitle="Tractos y carretas con placa, marca, modelo, año y kilometraje."
        action={
          <button className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            <Plus size={16} /> Nuevo vehículo
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tractos" value={tractos} icon={Truck} tone="blue" />
        <StatCard label="Carretas" value={carretas} icon={Truck} tone="orange" />
        <StatCard label="En taller" value={enTaller} icon={Truck} tone="amber" />
        <StatCard label="Total unidades" value={VEHICULOS.length} icon={Truck} tone="gray" />
      </div>

      <TableWrap>
        <thead>
          <tr>
            <Th>Placa</Th><Th>Tipo</Th><Th>Marca</Th><Th>Modelo</Th><Th>Año</Th><Th>Kilometraje</Th><Th>Estado</Th>
          </tr>
        </thead>
        <tbody>
          {VEHICULOS.map((v) => (
            <tr key={v.id} className="hover:bg-slate-50/60">
              <Td className="font-semibold text-slate-900">{v.placa}</Td>
              <Td><Badge tone={v.tipo === "Tracto" ? "blue" : "gray"}>{v.tipo}</Badge></Td>
              <Td>{v.marca}</Td>
              <Td>{v.modelo}</Td>
              <Td className="tabular">{v.anio}</Td>
              <Td className="tabular">{v.tipo === "Carreta" ? "—" : km(v.kilometraje)}</Td>
              <Td>
                <Badge tone={v.estado === "Operativo" ? "green" : v.estado === "En taller" ? "amber" : "gray"}>
                  {v.estado}
                </Badge>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </div>
  );
}
