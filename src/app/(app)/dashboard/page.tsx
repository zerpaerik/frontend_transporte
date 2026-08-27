"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Truck, Container, CalendarClock, ReceiptText, AlertTriangle, ArrowRight, Wrench, WifiOff } from "lucide-react";
import { Card, StatCard, Badge, PageHeader } from "@/components/ui";
import { BarChart, Donut, ChartCard, type Slice } from "@/components/charts";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { soles, fecha, diasRestantes, estadoDocumento } from "@/lib/format";

const COL = { steel: "#2C5C8A", brand: "#E5641C", green: "#1E9B67", amber: "#C98A00", rose: "#CF4646", slate: "#94A3B8" };

interface Resumen {
  kpis: {
    vehiculos: number; operativos: number; conductores: number; empleados: number;
    viajesTotal: number; viajesEnCurso: number; documentosAlerta: number;
    ventasFacturadas: number; porCobrar: number; gastoMantenimiento: number; planillaNeta: number;
  };
  mantenimientoPorTipo: { label: string; value: number }[];
  facturasPorEstado: { label: string; value: number }[];
  viajesPorEstado: { label: string; value: number }[];
  ventasPorCliente: { label: string; value: number }[];
  documentosAlerta: { conductor: string; tipo: string; vencimiento: string; estado: string; dias: number }[];
  devoluciones: { contenedor: string; cliente: string; placaTracto: string; devolucion: string; fechaLimite: string; dias: number }[];
}

function computeLocal(c: ReturnType<typeof useData>): Resumen {
  const operativos = c.vehiculos.filter((v) => v.estado === "Operativo").length;
  const documentosAlerta = c.conductores
    .flatMap((k) => k.documentos.map((d) => ({ conductor: k.nombre, tipo: d.tipo, vencimiento: d.vencimiento, estado: estadoDocumento(d.vencimiento), dias: diasRestantes(d.vencimiento) })))
    .filter((d) => d.estado !== "Vigente").sort((a, b) => a.dias - b.dias);
  const devoluciones = c.viajes
    .filter((v) => v.estado !== "Culminado" && v.estado !== "Devuelto")
    .map((v) => ({ contenedor: v.contenedor, cliente: v.cliente, placaTracto: v.placaTracto, devolucion: v.devolucion, fechaLimite: v.fechaLimite, dias: diasRestantes(v.fechaLimite) }))
    .sort((a, b) => a.dias - b.dias);
  const ventasMap = c.facturas.filter((f) => f.estadoSunat !== "Anulada").reduce<Record<string, number>>((a, f) => ((a[f.cliente] = (a[f.cliente] ?? 0) + f.monto + f.igv), a), {});
  return {
    kpis: {
      vehiculos: c.vehiculos.length, operativos, conductores: c.conductores.length, empleados: c.empleados.length,
      viajesTotal: c.viajes.length, viajesEnCurso: c.viajes.filter((v) => v.estado === "En curso").length,
      documentosAlerta: documentosAlerta.length,
      ventasFacturadas: c.facturas.filter((f) => f.estadoSunat !== "Anulada").reduce((s, f) => s + f.monto + f.igv, 0),
      porCobrar: c.facturas.filter((f) => f.estadoSunat === "Emitida" || f.estadoSunat === "Aceptada").reduce((s, f) => s + f.monto + f.igv, 0),
      gastoMantenimiento: c.ordenes.reduce((s, o) => s + o.costo, 0),
      planillaNeta: c.empleados.reduce((s, e) => s + e.sueldoBase + e.bonos - e.descuentos, 0),
    },
    mantenimientoPorTipo: ["Preventivo", "Correctivo", "Predictivo"].map((label) => ({ label, value: c.ordenes.filter((o) => o.tipo === label).reduce((s, o) => s + o.costo, 0) })),
    facturasPorEstado: ["Emitida", "Aceptada", "Pagada", "Anulada"].map((label) => ({ label, value: c.facturas.filter((f) => f.estadoSunat === label).length })),
    viajesPorEstado: ["Programado", "En curso", "Culminado", "Devuelto", "Cancelado"].map((label) => ({ label, value: c.viajes.filter((v) => v.estado === label).length })),
    ventasPorCliente: Object.entries(ventasMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value })),
    documentosAlerta, devoluciones,
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const data = useData();
  const [resumen, setResumen] = useState<Resumen | null>(null);

  useEffect(() => {
    let alive = true;
    api.get<Resumen>("/dashboard/resumen").then((r) => alive && setResumen(r)).catch(() => alive && setResumen(null));
    return () => { alive = false; };
  }, [data.vehiculos.length, data.viajes.length, data.facturas.length]);

  const d = resumen ?? computeLocal(data);
  const k = d.kpis;

  const mantSlices: Slice[] = d.mantenimientoPorTipo.map((s, i) => ({ ...s, color: [COL.steel, COL.rose, COL.brand][i] }));
  const factSlices: Slice[] = d.facturasPorEstado.map((s, i) => ({ ...s, color: [COL.amber, COL.steel, COL.green, COL.rose][i] }));
  const viajeSlices: Slice[] = d.viajesPorEstado.map((s, i) => ({ ...s, color: [COL.slate, COL.brand, COL.steel, COL.green, COL.rose][i] }));
  const clienteSlices: Slice[] = d.ventasPorCliente.map((s) => ({ ...s, color: COL.steel }));

  return (
    <div>
      <PageHeader
        title={`Hola, ${user?.nombre?.split(" ")[0] ?? ""}`}
        subtitle="Resumen de tu operación, con las alertas e indicadores que requieren atención hoy."
        action={data.offline ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
            <WifiOff size={13} /> Modo demo (sin backend)
          </span>
        ) : null}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Flota operativa" value={`${k.operativos}/${k.vehiculos}`} icon={Truck} tone="blue" hint="unidades disponibles" />
        <StatCard label="Viajes en curso" value={k.viajesEnCurso} icon={Container} tone="orange" hint={`${k.viajesTotal} viajes en total`} />
        <StatCard label="Documentos en alerta" value={k.documentosAlerta} icon={CalendarClock} tone="amber" hint="por vencer o vencidos" />
        <StatCard label="Ventas facturadas" value={soles(k.ventasFacturadas)} icon={ReceiptText} tone="green" hint={`${soles(k.porCobrar)} por cobrar`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Gasto de mantenimiento por tipo" subtitle={`Total ${soles(k.gastoMantenimiento)}`}>
          <BarChart data={mantSlices} format={soles} />
        </ChartCard>
        <ChartCard title="Comprobantes por estado SUNAT" subtitle="Distribución de facturas">
          <Donut data={factSlices} centerLabel="facturas" />
        </ChartCard>
        <ChartCard title="Viajes por estado" subtitle={`${k.viajesTotal} viajes registrados`}>
          <BarChart data={viajeSlices} />
        </ChartCard>
        <ChartCard title="Top clientes por facturación" subtitle="Ventas facturadas (con IGV)">
          {clienteSlices.length ? <BarChart data={clienteSlices} format={soles} /> : <p className="text-sm text-slate-400">Sin datos</p>}
        </ChartCard>
      </div>

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
            {d.documentosAlerta.slice(0, 6).map((doc, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-800">{doc.conductor}</div>
                  <div className="truncate text-xs text-slate-500">{doc.tipo} · vence {fecha(doc.vencimiento)}</div>
                </div>
                {doc.estado === "Vencido" ? <Badge tone="red">Vencido hace {Math.abs(doc.dias)} d</Badge> : <Badge tone="amber">En {doc.dias} d</Badge>}
              </li>
            ))}
            {d.documentosAlerta.length === 0 ? <li className="py-6 text-center text-sm text-slate-400">Sin documentos en alerta 🎉</li> : null}
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
            {d.devoluciones.slice(0, 6).map((v, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5">
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
            {d.devoluciones.length === 0 ? <li className="py-6 text-center text-sm text-slate-400">Sin devoluciones pendientes</li> : null}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Gasto de mantenimiento" value={soles(k.gastoMantenimiento)} icon={Wrench} tone="orange" />
        <StatCard label="Planilla neta" value={soles(k.planillaNeta)} icon={ReceiptText} tone="blue" hint={`${k.empleados} trabajadores`} />
        <StatCard label="Conductores" value={k.conductores} icon={Truck} tone="gray" hint="registrados" />
      </div>
    </div>
  );
}
