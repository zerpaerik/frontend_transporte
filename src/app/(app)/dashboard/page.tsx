import Link from "next/link";
import { Truck, Container, CalendarClock, ReceiptText, AlertTriangle, ArrowRight } from "lucide-react";
import { Card, StatCard, Badge, PageHeader } from "@/components/ui";
import { VEHICULOS, CONDUCTORES, VIAJES, FACTURAS } from "@/lib/mock-data";
import { soles, fecha, diasRestantes, estadoDocumento } from "@/lib/format";

export default function DashboardPage() {
  const operativos = VEHICULOS.filter((v) => v.estado === "Operativo").length;
  const enCurso = VIAJES.filter((v) => v.estado === "En curso").length;

  const docsAlerta = CONDUCTORES.flatMap((c) =>
    c.documentos.map((d) => ({ conductor: c.nombre, ...d, estado: estadoDocumento(d.vencimiento), dias: diasRestantes(d.vencimiento) })),
  )
    .filter((d) => d.estado !== "Vigente")
    .sort((a, b) => a.dias - b.dias);

  const devoluciones = VIAJES
    .filter((v) => v.estado !== "Culminado" && v.estado !== "Devuelto")
    .map((v) => ({ ...v, dias: diasRestantes(v.fechaLimite) }))
    .sort((a, b) => a.dias - b.dias);

  const porCobrar = FACTURAS
    .filter((f) => f.estadoSunat === "Emitida" || f.estadoSunat === "Aceptada")
    .reduce((s, f) => s + f.monto + f.igv, 0);

  const ventasMes = FACTURAS
    .filter((f) => f.estadoSunat !== "Anulada")
    .reduce((s, f) => s + f.monto + f.igv, 0);

  return (
    <div>
      <PageHeader title="Panel general" subtitle="Resumen de tu operación, con las alertas que requieren atención hoy." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Flota operativa" value={`${operativos}/${VEHICULOS.length}`} icon={Truck} tone="blue" hint="unidades disponibles" />
        <StatCard label="Viajes en curso" value={enCurso} icon={Container} tone="orange" hint={`${VIAJES.length} viajes registrados`} />
        <StatCard label="Documentos en alerta" value={docsAlerta.length} icon={CalendarClock} tone="amber" hint="por vencer o vencidos" />
        <StatCard label="Ventas facturadas" value={soles(ventasMes)} icon={ReceiptText} tone="green" hint={`${soles(porCobrar)} por cobrar`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Documentos por vencer */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600"><AlertTriangle size={16} /></span>
              <h2 className="font-bold text-slate-800">Documentos por vencer</h2>
            </div>
            <Link href="/conductores" className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
              Ver todos <ArrowRight size={13} />
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {docsAlerta.map((d, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-800">{d.conductor}</div>
                  <div className="truncate text-xs text-slate-500">{d.tipo} · vence {fecha(d.vencimiento)}</div>
                </div>
                {d.estado === "Vencido" ? (
                  <Badge tone="red">Vencido hace {Math.abs(d.dias)} d</Badge>
                ) : (
                  <Badge tone="amber">En {d.dias} d</Badge>
                )}
              </li>
            ))}
          </ul>
        </Card>

        {/* Devoluciones de contenedores */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600"><Container size={16} /></span>
              <h2 className="font-bold text-slate-800">Devolución de contenedores</h2>
            </div>
            <Link href="/operaciones" className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
              Ver operaciones <ArrowRight size={13} />
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {devoluciones.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-800">{v.contenedor} · {v.cliente}</div>
                  <div className="truncate text-xs text-slate-500">{v.placaTracto} · devolver en {v.devolucion} · {fecha(v.fechaLimite)}</div>
                </div>
                {v.dias < 0 ? (
                  <Badge tone="red">Vencido</Badge>
                ) : v.dias <= 1 ? (
                  <Badge tone="red">Urgente · {v.dias} d</Badge>
                ) : v.dias <= 3 ? (
                  <Badge tone="amber">{v.dias} días</Badge>
                ) : (
                  <Badge tone="green">{v.dias} días</Badge>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
