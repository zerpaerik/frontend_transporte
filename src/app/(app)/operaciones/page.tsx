import { Plus, Container, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { PageHeader, StatCard, Card, Badge, Th, Td } from "@/components/ui";
import { VIAJES } from "@/lib/mock-data";
import { fecha, diasRestantes } from "@/lib/format";
import type { EstadoViaje } from "@/lib/types";

const estadoTone: Record<EstadoViaje, "gray" | "blue" | "green" | "orange"> = {
  Programado: "gray",
  "En curso": "orange",
  Culminado: "blue",
  Devuelto: "green",
};

function Semaforo({ iso, estado }: { iso: string; estado: EstadoViaje }) {
  if (estado === "Culminado" || estado === "Devuelto") return <Badge tone="green">OK</Badge>;
  const d = diasRestantes(iso);
  if (d < 0) return <Badge tone="red">Vencido</Badge>;
  if (d <= 1) return <Badge tone="red">Urgente · {d}d</Badge>;
  if (d <= 3) return <Badge tone="amber">{d} días</Badge>;
  return <Badge tone="green">{d} días</Badge>;
}

export default function OperacionesPage() {
  const enCurso = VIAJES.filter((v) => v.estado === "En curso").length;
  const impo = VIAJES.filter((v) => v.operacion === "IMPO").length;
  const expo = VIAJES.filter((v) => v.operacion === "EXPO").length;

  return (
    <div>
      <PageHeader
        modulo="06"
        title="Operaciones — Despachos"
        subtitle="Viajes de contenedores impo/expo con documentos (GRE, factura) y control de devolución."
        action={
          <button className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            <Plus size={16} /> Nuevo viaje
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Viajes en curso" value={enCurso} icon={Container} tone="orange" />
        <StatCard label="Importación" value={impo} icon={ArrowDownToLine} tone="blue" />
        <StatCard label="Exportación" value={expo} icon={ArrowUpFromLine} tone="green" />
        <StatCard label="Total viajes" value={VIAJES.length} icon={Container} tone="gray" />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px] text-left text-sm">
            <thead>
              <tr>
                <Th>Tracto</Th><Th>Carreta</Th><Th>Conductor</Th><Th>Cliente</Th><Th>Op.</Th>
                <Th>Contenedor</Th><Th>Tam.</Th><Th>Cita</Th><Th>Origen</Th><Th>Destino</Th>
                <Th>Devolución</Th><Th>F. límite</Th><Th>Devolver</Th><Th>Estado</Th>
                <Th>N° Orden</Th><Th>GRE Rem.</Th><Th>GRE Trans.</Th><Th>Factura</Th>
              </tr>
            </thead>
            <tbody>
              {VIAJES.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/60">
                  <Td className="font-semibold text-slate-900">{v.placaTracto}</Td>
                  <Td>{v.carreta}</Td>
                  <Td className="whitespace-nowrap">{v.conductor}</Td>
                  <Td><Badge tone="blue">{v.cliente}</Badge></Td>
                  <Td className="text-xs font-semibold text-slate-500">{v.operacion}</Td>
                  <Td className="tabular">{v.contenedor}</Td>
                  <Td>{v.tamanio}</Td>
                  <Td className="tabular">{v.horaCita}</Td>
                  <Td>{v.origen}</Td>
                  <Td>{v.destino}</Td>
                  <Td>{v.devolucion}</Td>
                  <Td className="tabular whitespace-nowrap">{fecha(v.fechaLimite)}</Td>
                  <Td><Semaforo iso={v.fechaLimite} estado={v.estado} /></Td>
                  <Td><Badge tone={estadoTone[v.estado]}>{v.estado}</Badge></Td>
                  <Td className="tabular whitespace-nowrap text-slate-500">{v.nOrden || "—"}</Td>
                  <Td className="tabular whitespace-nowrap text-slate-500">{v.greRemitente || "—"}</Td>
                  <Td className="tabular whitespace-nowrap text-slate-500">{v.greTransporte || "—"}</Td>
                  <Td className="tabular whitespace-nowrap">
                    {v.factura ? <span className="font-medium text-emerald-600">{v.factura}</span> : <span className="text-rose-500">Pendiente</span>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
