"use client";

import Link from "next/link";
import { Truck, Container, CalendarClock, ReceiptText, AlertTriangle, ArrowRight, Wrench } from "lucide-react";
import { Card, StatCard, Badge, PageHeader } from "@/components/ui";
import { BarChart, Donut, ChartCard, type Slice } from "@/components/charts";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { soles, fecha, diasRestantes, estadoDocumento } from "@/lib/format";

const COL = {
  steel: "#2C5C8A", brand: "#E5641C", green: "#1E9B67", amber: "#C98A00",
  rose: "#CF4646", slate: "#94A3B8",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { vehiculos, conductores, viajes, facturas, ordenes, empleados } = useData();

  const operativos = vehiculos.filter((v) => v.estado === "Operativo").length;
  const enCurso = viajes.filter((v) => v.estado === "En curso").length;

  const docsAlerta = conductores.flatMap((c) =>
    c.documentos.map((d) => ({ conductor: c.nombre, ...d, estado: estadoDocumento(d.vencimiento), dias: diasRestantes(d.vencimiento) })),
  ).filter((d) => d.estado !== "Vigente").sort((a, b) => a.dias - b.dias);

  const devoluciones = viajes
    .filter((v) => v.estado !== "Culminado" && v.estado !== "Devuelto")
    .map((v) => ({ ...v, dias: diasRestantes(v.fechaLimite) }))
    .sort((a, b) => a.dias - b.dias);

  const porCobrar = facturas.filter((f) => f.estadoSunat === "Emitida" || f.estadoSunat === "Aceptada").reduce((s, f) => s + f.monto + f.igv, 0);
  const ventasMes = facturas.filter((f) => f.estadoSunat !== "Anulada").reduce((s, f) => s + f.monto + f.igv, 0);
  const gastoMant = ordenes.reduce((s, o) => s + o.costo, 0);
  const planillaNeta = empleados.reduce((s, e) => s + e.sueldoBase + e.bonos - e.descuentos, 0);

  // Gráficos
  const mantPorTipo: Slice[] = [
    { label: "Preventivo", value: ordenes.filter((o) => o.tipo === "Preventivo").reduce((s, o) => s + o.costo, 0), color: COL.steel },
    { label: "Correctivo", value: ordenes.filter((o) => o.tipo === "Correctivo").reduce((s, o) => s + o.costo, 0), color: COL.rose },
    { label: "Predictivo", value: ordenes.filter((o) => o.tipo === "Predictivo").reduce((s, o) => s + o.costo, 0), color: COL.brand },
  ];

  const facturaEstados: Slice[] = [
    { label: "Emitida", value: facturas.filter((f) => f.estadoSunat === "Emitida").length, color: COL.amber },
    { label: "Aceptada", value: facturas.filter((f) => f.estadoSunat === "Aceptada").length, color: COL.steel },
    { label: "Pagada", value: facturas.filter((f) => f.estadoSunat === "Pagada").length, color: COL.green },
    { label: "Anulada", value: facturas.filter((f) => f.estadoSunat === "Anulada").length, color: COL.rose },
  ];

  const viajesEstado: Slice[] = [
    { label: "Programado", value: viajes.filter((v) => v.estado === "Programado").length, color: COL.slate },
    { label: "En curso", value: viajes.filter((v) => v.estado === "En curso").length, color: COL.brand },
    { label: "Culminado", value: viajes.filter((v) => v.estado === "Culminado").length, color: COL.steel },
    { label: "Devuelto", value: viajes.filter((v) => v.estado === "Devuelto").length, color: COL.green },
  ];

  const ventasPorCliente: Slice[] = Object.entries(
    facturas.filter((f) => f.estadoSunat !== "Anulada").reduce<Record<string, number>>((acc, f) => {
      acc[f.cliente] = (acc[f.cliente] ?? 0) + f.monto + f.igv;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value, color: COL.steel }));

  return (
    <div>
      <PageHeader title={`Hola, ${user?.nombre?.split(" ")[0] ?? ""}`} subtitle="Resumen de tu operación, con las alertas e indicadores que requieren atención hoy." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Flota operativa" value={`${operativos}/${vehiculos.length}`} icon={Truck} tone="blue" hint="unidades disponibles" />
        <StatCard label="Viajes en curso" value={enCurso} icon={Container} tone="orange" hint={`${viajes.length} viajes en total`} />
        <StatCard label="Documentos en alerta" value={docsAlerta.length} icon={CalendarClock} tone="amber" hint="por vencer o vencidos" />
        <StatCard label="Ventas facturadas" value={soles(ventasMes)} icon={ReceiptText} tone="green" hint={`${soles(porCobrar)} por cobrar`} />
      </div>

      {/* Gráficos */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Gasto de mantenimiento por tipo" subtitle={`Total ${soles(gastoMant)}`}>
          <BarChart data={mantPorTipo} format={soles} />
        </ChartCard>
        <ChartCard title="Comprobantes por estado SUNAT" subtitle={`${facturas.length} comprobantes`}>
          <Donut data={facturaEstados} centerLabel="facturas" />
        </ChartCard>
        <ChartCard title="Viajes por estado" subtitle={`${viajes.length} viajes registrados`}>
          <BarChart data={viajesEstado} />
        </ChartCard>
        <ChartCard title="Top clientes por facturación" subtitle="Ventas facturadas (con IGV)">
          {ventasPorCliente.length ? <BarChart data={ventasPorCliente} format={soles} /> : <p className="text-sm text-slate-400">Sin datos</p>}
        </ChartCard>
      </div>

      {/* Alertas */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600"><AlertTriangle size={16} /></span>
              <h2 className="font-bold text-slate-800">Documentos por vencer</h2>
            </div>
            <Link href="/conductores" className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">Ver todos <ArrowRight size={13} /></Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {docsAlerta.slice(0, 6).map((d, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-800">{d.conductor}</div>
                  <div className="truncate text-xs text-slate-500">{d.tipo} · vence {fecha(d.vencimiento)}</div>
                </div>
                {d.estado === "Vencido" ? <Badge tone="red">Vencido hace {Math.abs(d.dias)} d</Badge> : <Badge tone="amber">En {d.dias} d</Badge>}
              </li>
            ))}
            {docsAlerta.length === 0 ? <li className="py-6 text-center text-sm text-slate-400">Sin documentos en alerta 🎉</li> : null}
          </ul>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600"><Container size={16} /></span>
              <h2 className="font-bold text-slate-800">Devolución de contenedores</h2>
            </div>
            <Link href="/operaciones" className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">Ver operaciones <ArrowRight size={13} /></Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {devoluciones.slice(0, 6).map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-800">{v.contenedor} · {v.cliente}</div>
                  <div className="truncate text-xs text-slate-500">{v.placaTracto} · devolver en {v.devolucion} · {fecha(v.fechaLimite)}</div>
                </div>
                {v.dias < 0 ? <Badge tone="red">Vencido</Badge>
                  : v.dias <= 1 ? <Badge tone="red">Urgente · {v.dias} d</Badge>
                  : v.dias <= 3 ? <Badge tone="amber">{v.dias} días</Badge>
                  : <Badge tone="green">{v.dias} días</Badge>}
              </li>
            ))}
            {devoluciones.length === 0 ? <li className="py-6 text-center text-sm text-slate-400">Sin devoluciones pendientes</li> : null}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Gasto de mantenimiento" value={soles(gastoMant)} icon={Wrench} tone="orange" hint={`${ordenes.length} órdenes`} />
        <StatCard label="Planilla neta" value={soles(planillaNeta)} icon={ReceiptText} tone="blue" hint={`${empleados.length} trabajadores`} />
        <StatCard label="Conductores" value={conductores.length} icon={Truck} tone="gray" hint="registrados" />
      </div>
    </div>
  );
}
