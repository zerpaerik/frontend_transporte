import { Plus, Wallet, Users } from "lucide-react";
import { PageHeader, StatCard, TableWrap, Th, Td, Badge } from "@/components/ui";
import { EMPLEADOS } from "@/lib/mock-data";
import { soles } from "@/lib/format";

export default function PlanillaPage() {
  const neto = (e: (typeof EMPLEADOS)[number]) => e.sueldoBase + e.bonos - e.descuentos;
  const totalNeto = EMPLEADOS.reduce((s, e) => s + neto(e), 0);
  const choferes = EMPLEADOS.filter((e) => e.tipo === "Chofer").length;
  const pendientes = EMPLEADOS.filter((e) => e.estadoPago === "Pendiente").length;

  return (
    <div>
      <PageHeader
        modulo="10"
        title="Planilla y sueldos"
        subtitle="Sueldos de choferes y personal administrativo, con conceptos y estado de pago por período."
        action={
          <button className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            <Plus size={16} /> Nuevo trabajador
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Personal" value={EMPLEADOS.length} icon={Users} tone="blue" />
        <StatCard label="Choferes" value={choferes} icon={Users} tone="orange" />
        <StatCard label="Pagos pendientes" value={pendientes} icon={Wallet} tone="amber" />
        <StatCard label="Planilla neta" value={soles(totalNeto)} icon={Wallet} tone="green" hint="período actual" />
      </div>

      <TableWrap>
        <thead>
          <tr>
            <Th>Trabajador</Th><Th>Cargo</Th><Th>Tipo</Th><Th>Período</Th>
            <Th className="text-right">Básico</Th><Th className="text-right">Bonos</Th><Th className="text-right">Descuentos</Th>
            <Th className="text-right">Neto</Th><Th>Pago</Th>
          </tr>
        </thead>
        <tbody>
          {EMPLEADOS.map((e) => (
            <tr key={e.id} className="hover:bg-slate-50/60">
              <Td className="font-semibold text-slate-900">{e.nombre}</Td>
              <Td className="text-slate-600">{e.cargo}</Td>
              <Td><Badge tone={e.tipo === "Chofer" ? "orange" : "blue"}>{e.tipo}</Badge></Td>
              <Td className="whitespace-nowrap text-slate-500">{e.periodo}</Td>
              <Td className="tabular text-right">{soles(e.sueldoBase)}</Td>
              <Td className="tabular text-right text-emerald-600">+{soles(e.bonos)}</Td>
              <Td className="tabular text-right text-rose-500">−{soles(e.descuentos)}</Td>
              <Td className="tabular text-right font-semibold text-slate-900">{soles(neto(e))}</Td>
              <Td><Badge tone={e.estadoPago === "Pagado" ? "green" : "amber"}>{e.estadoPago}</Badge></Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </div>
  );
}
