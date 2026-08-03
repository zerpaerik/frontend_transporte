"use client";

import { useState } from "react";
import { Plus, ReceiptText } from "lucide-react";
import { PageHeader, StatCard, Badge } from "@/components/ui";
import { DataTable, type Column, type Filter } from "@/components/DataTable";
import { FormModal, type Field, type FormValues } from "@/components/FormModal";
import { useData } from "@/lib/store";
import { soles, fecha } from "@/lib/format";
import type { EstadoFactura, Factura } from "@/lib/types";

const estadoTone: Record<EstadoFactura, "amber" | "blue" | "green" | "red"> = {
  Emitida: "amber", Aceptada: "blue", Pagada: "green", Anulada: "red",
};

const columns: Column<Factura>[] = [
  { key: "serie", header: "Serie", sortable: true, render: (f) => <span className="font-semibold text-slate-900">{f.serie}</span> },
  { key: "tipo", header: "Tipo", sortable: true, render: (f) => <Badge tone={f.tipo === "N. Crédito" ? "red" : "gray"}>{f.tipo}</Badge> },
  { key: "cliente", header: "Cliente", sortable: true },
  { key: "ruc", header: "RUC", render: (f) => <span className="tabular text-slate-500">{f.ruc}</span> },
  { key: "fecha", header: "Fecha", sortable: true, value: (f) => f.fecha, render: (f) => <span className="tabular whitespace-nowrap">{fecha(f.fecha)}</span> },
  { key: "monto", header: "Monto", align: "right", sortable: true, value: (f) => f.monto, render: (f) => <span className="tabular">{soles(f.monto)}</span> },
  { key: "igv", header: "IGV", align: "right", value: (f) => f.igv, render: (f) => <span className="tabular text-slate-500">{soles(f.igv)}</span> },
  { key: "total", header: "Total", align: "right", sortable: true, value: (f) => f.monto + f.igv, render: (f) => <span className="tabular font-semibold">{soles(f.monto + f.igv)}</span> },
  { key: "estadoSunat", header: "Estado SUNAT", sortable: true, render: (f) => <Badge tone={estadoTone[f.estadoSunat]}>{f.estadoSunat}</Badge> },
];

const filters: Filter<Factura>[] = [
  { key: "tipo", label: "Tipo", value: (f) => f.tipo },
  { key: "estadoSunat", label: "Estado", value: (f) => f.estadoSunat },
  { key: "cliente", label: "Cliente", value: (f) => f.cliente },
];

export default function FacturacionPage() {
  const { facturas, viajes, addFactura } = useData();
  const [open, setOpen] = useState(false);

  const validas = facturas.filter((f) => f.estadoSunat !== "Anulada");
  const total = validas.reduce((s, f) => s + f.monto + f.igv, 0);
  const porCobrar = facturas.filter((f) => f.estadoSunat === "Emitida" || f.estadoSunat === "Aceptada").reduce((s, f) => s + f.monto + f.igv, 0);

  const fields: Field[] = [
    { name: "serie", label: "Serie / número", type: "text", required: true, placeholder: "F001-01040" },
    { name: "tipo", label: "Tipo de comprobante", type: "select", options: ["Factura", "Boleta", "N. Crédito"] },
    { name: "cliente", label: "Cliente", type: "text", required: true, placeholder: "ULOG" },
    { name: "ruc", label: "RUC", type: "text", placeholder: "20512345671" },
    { name: "fecha", label: "Fecha de emisión", type: "date", required: true },
    { name: "viaje", label: "Contenedor / viaje", type: "select", options: ["-", ...viajes.map((v) => v.contenedor)] },
    { name: "monto", label: "Monto neto (S/)", type: "number", default: 0 },
    { name: "estadoSunat", label: "Estado SUNAT", type: "select", options: ["Emitida", "Aceptada", "Pagada", "Anulada"] },
  ];

  function guardar(v: FormValues) {
    const monto = Number(v.monto);
    addFactura({
      serie: String(v.serie), tipo: v.tipo as Factura["tipo"], cliente: String(v.cliente), ruc: String(v.ruc) || "-",
      fecha: String(v.fecha), viaje: String(v.viaje), monto, igv: Math.round(monto * 0.18 * 100) / 100, estadoSunat: v.estadoSunat as Factura["estadoSunat"],
    });
  }

  return (
    <div>
      <PageHeader modulo="09" title="Facturación electrónica — SUNAT" subtitle="Comprobantes emitidos ante la SUNAT (vía OSE/PSE), con seguimiento del estado de cada factura." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Comprobantes" value={facturas.length} icon={ReceiptText} tone="blue" />
        <StatCard label="Ventas facturadas" value={soles(total)} icon={ReceiptText} tone="green" />
        <StatCard label="Por cobrar" value={soles(porCobrar)} icon={ReceiptText} tone="amber" />
        <StatCard label="Anuladas" value={facturas.filter((f) => f.estadoSunat === "Anulada").length} icon={ReceiptText} tone="red" />
      </div>

      <DataTable
        title="Comprobantes SUNAT"
        exportName="facturacion-sunat"
        columns={columns}
        rows={facturas}
        filters={filters}
        minWidth="min-w-[980px]"
        searchPlaceholder="Buscar por serie, cliente, RUC…"
        toolbar={
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            <Plus size={16} /> Emitir comprobante
          </button>
        }
      />

      <FormModal open={open} title="Emitir comprobante" subtitle="El IGV (18%) se calcula automáticamente sobre el monto neto." fields={fields} onSubmit={guardar} onClose={() => setOpen(false)} />
    </div>
  );
}
