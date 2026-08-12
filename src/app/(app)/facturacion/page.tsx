"use client";

import { useState } from "react";
import { Plus, ReceiptText, Search } from "lucide-react";
import { PageHeader, StatCard, Badge } from "@/components/ui";
import { DataTable, type Column, type Filter } from "@/components/DataTable";
import { FormModal, type Field, type FormValues } from "@/components/FormModal";
import { useData } from "@/lib/store";
import { apiViajePorCodigo } from "@/lib/api";
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
  { key: "viaje", header: "Viaje/Cont.", render: (f) => <span className="tabular text-slate-500">{f.viaje}</span> },
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

interface Prefill { cliente?: string; ruc?: string; viaje?: string; direccion?: string; }

export default function FacturacionPage() {
  const { facturas, viajes, addFactura } = useData();
  const [open, setOpen] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [lookMsg, setLookMsg] = useState("");
  const [prefill, setPrefill] = useState<Prefill>({});

  const validas = facturas.filter((f) => f.estadoSunat !== "Anulada");
  const total = validas.reduce((s, f) => s + f.monto + f.igv, 0);
  const porCobrar = facturas.filter((f) => f.estadoSunat === "Emitida" || f.estadoSunat === "Aceptada").reduce((s, f) => s + f.monto + f.igv, 0);

  const fields: Field[] = [
    { name: "serie", label: "Serie / número", type: "text", required: true, placeholder: "F001-01040" },
    { name: "tipo", label: "Tipo de comprobante", type: "select", options: ["Factura", "Boleta", "N. Crédito"] },
    { name: "cliente", label: "Cliente", type: "text", required: true, placeholder: "ULOG", default: prefill.cliente },
    { name: "ruc", label: "RUC", type: "text", placeholder: "20512345671", default: prefill.ruc },
    { name: "direccion", label: "Dirección", type: "text", full: true, placeholder: "Dirección fiscal del cliente", default: prefill.direccion },
    { name: "fecha", label: "Fecha de emisión", type: "date", required: true },
    { name: "viaje", label: "Contenedor / viaje", type: "select", options: ["-", ...viajes.map((v) => v.contenedor)], default: prefill.viaje },
    { name: "monto", label: "Monto neto (S/)", type: "number", default: 0 },
    { name: "estadoSunat", label: "Estado SUNAT", type: "select", options: ["Emitida", "Aceptada", "Pagada", "Anulada"] },
  ];

  function guardar(v: FormValues) {
    const monto = Number(v.monto);
    addFactura({
      serie: String(v.serie), tipo: v.tipo as Factura["tipo"], cliente: String(v.cliente), ruc: String(v.ruc) || "-", direccion: String(v.direccion || ""),
      fecha: String(v.fecha), viaje: String(v.viaje), monto, igv: Math.round(monto * 0.18 * 100) / 100, estadoSunat: v.estadoSunat as Factura["estadoSunat"],
    });
  }

  async function traerPorCodigo() {
    if (!codigo.trim()) return;
    setLookMsg("");
    try {
      const v = await apiViajePorCodigo(codigo.trim());
      setPrefill({ cliente: v.cliente, ruc: v.clienteRuc || "", viaje: v.contenedor, direccion: v.clienteDireccion || "" });
      setOpen(true);
      setCodigo("");
    } catch {
      setLookMsg("No se encontró un viaje con ese código.");
    }
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

      {lookMsg ? <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">{lookMsg}</div> : null}

      <DataTable
        title="Comprobantes SUNAT"
        exportName="facturacion-sunat"
        columns={columns}
        rows={facturas}
        filters={filters}
        minWidth="min-w-[1040px]"
        searchPlaceholder="Buscar por serie, cliente, RUC…"
        toolbar={
          <>
            <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-1.5 py-1">
              <Search size={14} className="text-slate-400" />
              <input value={codigo} onChange={(e) => setCodigo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") traerPorCodigo(); }}
                placeholder="Código de viaje (OP-0001)" className="w-40 text-sm outline-none" />
              <button onClick={traerPorCodigo} className="rounded-md bg-steel-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-steel-700">Traer</button>
            </div>
            <button onClick={() => { setPrefill({}); setOpen(true); }} className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
              <Plus size={16} /> Emitir comprobante
            </button>
          </>
        }
      />

      <FormModal
        open={open}
        title="Emitir comprobante"
        subtitle="El IGV (18%) se calcula automáticamente. Usa 'Traer' con el código del viaje para autocompletar cliente y RUC."
        fields={fields}
        onSubmit={guardar}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
