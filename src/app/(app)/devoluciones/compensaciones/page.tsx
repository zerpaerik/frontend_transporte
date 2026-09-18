"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Scale, ArrowLeftRight, HandCoins, Clock } from "lucide-react";
import { PageHeader, StatCard, Card, Badge } from "@/components/ui";
import { DataTable, type Column, type Filter } from "@/components/DataTable";
import { AccionesCompensacion, saldada } from "@/components/CompensacionAcciones";
import { apiDevoluciones, type CruceCompensacion, type CompensacionesResp } from "@/lib/api";
import { fecha, fechaISO, soles } from "@/lib/format";

const tonoEstado = (e: string) => (e === "Pagada" ? "blue" : e === "Compensada" ? "green" : "amber");

export default function CompensacionesPage() {
  const [comp, setComp] = useState<CompensacionesResp | null>(null);

  function cargar() { apiDevoluciones.compensaciones().then(setComp).catch(() => setComp(null)); }
  useEffect(() => { cargar(); }, []);

  const cruces = useMemo(() => comp?.cruces ?? [], [comp]);
  const totales = useMemo(() => ({
    pendientes: cruces.filter((c) => !saldada(c.compensacionEstado)).length,
    compensadas: cruces.filter((c) => c.compensacionEstado === "Compensada").length,
    pagadas: cruces.filter((c) => c.compensacionEstado === "Pagada").length,
    montoPagado: cruces.reduce((s, c) => s + (c.compensacionEstado === "Pagada" ? c.compensacionMonto || 0 : 0), 0),
  }), [cruces]);

  const columns: Column<CruceCompensacion>[] = [
    {
      key: "devueltoPorEn", header: "Registro", sortable: true,
      value: (c) => fechaISO(c.devueltoPorEn || ""),
      render: (c) => (
        <span className="block whitespace-nowrap">
          <span className="tabular font-medium">{c.devueltoPorEn ? fecha(c.devueltoPorEn) : <span className="text-slate-300">—</span>}</span>
          {/* La cita del puerto es el día en que el contenedor entró de vuelta. */}
          {c.citaFecha ? <span className="tabular block text-[11px] text-slate-400">cita {fecha(c.citaFecha)}</span> : null}
        </span>
      ),
    },
    {
      key: "codigo", header: "Operación", sortable: true, value: (c) => `${c.codigo} ${c.contenedor}`.trim(),
      render: (c) => <span className="whitespace-nowrap"><span className="font-bold text-brand-600">{c.codigo || "—"}</span> <span className="text-xs text-slate-500">{c.contenedor}</span></span>,
    },
    { key: "devueltoPor", header: "Devolvió", sortable: true, value: (c) => c.devueltoPor, render: (c) => <span className="font-medium text-slate-800">{c.devueltoPor}</span> },
    { key: "conductor", header: "Le debe", sortable: true, value: (c) => c.conductor, render: (c) => <span className="font-medium text-slate-800">{c.conductor || "—"}</span> },
    { key: "cliente", header: "Cliente", render: (c) => <span className="block max-w-[200px] truncate text-slate-500" title={c.cliente}>{c.cliente || "—"}</span> },
    { key: "estado", header: "Estado", sortable: true, value: (c) => c.compensacionEstado || "Pendiente", render: (c) => <Badge tone={tonoEstado(c.compensacionEstado)}>{c.compensacionEstado || "Pendiente"}</Badge> },
    {
      key: "monto", header: "Pagado", align: "right", sortable: true, value: (c) => c.compensacionMonto || 0,
      render: (c) => (c.compensacionEstado === "Pagada" && c.compensacionMonto ? <span className="tabular font-semibold">{soles(c.compensacionMonto)}</span> : <span className="text-slate-300">—</span>),
    },
    {
      key: "compensacionEn", header: "Saldada", sortable: true, value: (c) => fechaISO(c.compensacionEn || ""),
      render: (c) => <span className="tabular whitespace-nowrap text-slate-500">{c.compensacionEn ? fecha(c.compensacionEn) : <span className="text-slate-300">—</span>}</span>,
    },
    { key: "nota", header: "Detalle", value: (c) => c.compensacionNota, render: (c) => <span className="block max-w-[220px] truncate text-xs text-slate-500" title={c.compensacionNota}>{c.compensacionNota || "—"}</span> },
  ];

  const filters: Filter<CruceCompensacion>[] = [
    { key: "estado", label: "Estado", value: (c) => c.compensacionEstado || "Pendiente" },
    { key: "devueltoPor", label: "Devolvió", value: (c) => c.devueltoPor },
    { key: "conductor", label: "Le debe", value: (c) => c.conductor || "—" },
  ];

  return (
    <div>
      <Link href="/devoluciones" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600">
        <ArrowLeft size={16} /> Volver a devoluciones
      </Link>

      <PageHeader
        modulo="07"
        title="Compensaciones entre conductores"
        subtitle="Historial de los contenedores que devolvió un conductor distinto al del viaje. Cada cruce se salda devolviendo el favor o pagándole a quien lo hizo."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Pendientes" value={totales.pendientes} icon={Clock} tone="amber" />
        <StatCard label="Compensadas" value={totales.compensadas} icon={ArrowLeftRight} tone="green" hint="devolvieron el favor" />
        <StatCard label="Pagadas" value={totales.pagadas} icon={HandCoins} tone="blue" />
        <StatCard label="Total pagado" value={soles(totales.montoPagado)} icon={Scale} tone="gray" hint="en lo que se ve abajo" />
      </div>

      {comp?.saldos.length ? (
        <Card className="mb-6 p-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Saldo por conductor (solo lo pendiente)</div>
          <div className="flex flex-wrap gap-2">
            {comp.saldos.map((s) => (
              <span key={s.conductor} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${s.saldo > 0 ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : s.saldo < 0 ? "bg-rose-50 text-rose-600 ring-rose-200" : "bg-slate-50 text-slate-500 ring-slate-200"}`}>
                {s.conductor}: {s.saldo > 0 ? `le deben ${s.saldo}` : s.saldo < 0 ? `debe ${-s.saldo}` : "a mano"}
              </span>
            ))}
          </div>
        </Card>
      ) : null}

      <DataTable
        title="Historial de compensaciones"
        exportName="compensaciones-conductores"
        columns={columns}
        rows={cruces}
        filters={filters}
        searchPlaceholder="Buscar por conductor, contenedor, código…"
        dateField={(c) => c.devueltoPorEn}
        dateLabel="Registro"
        minWidth="min-w-[1200px]"
        pageSize={12}
        rowActions={(c) => <AccionesCompensacion c={c} onChanged={cargar} />}
      />
    </div>
  );
}
