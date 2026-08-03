import { Plus, ReceiptText } from "lucide-react";
import { PageHeader, StatCard, TableWrap, Th, Td, Badge } from "@/components/ui";
import { FACTURAS } from "@/lib/mock-data";
import { soles, fecha } from "@/lib/format";
import type { EstadoFactura } from "@/lib/types";

const estadoTone: Record<EstadoFactura, "amber" | "blue" | "green" | "red"> = {
  Emitida: "amber",
  Aceptada: "blue",
  Pagada: "green",
  Anulada: "red",
};

export default function FacturacionPage() {
  const validas = FACTURAS.filter((f) => f.estadoSunat !== "Anulada");
  const total = validas.reduce((s, f) => s + f.monto + f.igv, 0);
  const porCobrar = FACTURAS
    .filter((f) => f.estadoSunat === "Emitida" || f.estadoSunat === "Aceptada")
    .reduce((s, f) => s + f.monto + f.igv, 0);

  return (
    <div>
      <PageHeader
        modulo="09"
        title="Facturación electrónica — SUNAT"
        subtitle="Comprobantes emitidos ante la SUNAT (vía OSE/PSE), con seguimiento del estado de cada factura."
        action={
          <button className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            <Plus size={16} /> Emitir comprobante
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Comprobantes" value={FACTURAS.length} icon={ReceiptText} tone="blue" />
        <StatCard label="Ventas facturadas" value={soles(total)} icon={ReceiptText} tone="green" />
        <StatCard label="Por cobrar" value={soles(porCobrar)} icon={ReceiptText} tone="amber" />
        <StatCard label="Anuladas" value={FACTURAS.filter((f) => f.estadoSunat === "Anulada").length} icon={ReceiptText} tone="red" />
      </div>

      <TableWrap>
        <thead>
          <tr>
            <Th>Serie</Th><Th>Tipo</Th><Th>Cliente</Th><Th>RUC</Th><Th>Fecha</Th><Th>Viaje</Th>
            <Th className="text-right">Monto</Th><Th className="text-right">IGV</Th><Th className="text-right">Total</Th><Th>Estado SUNAT</Th>
          </tr>
        </thead>
        <tbody>
          {FACTURAS.map((f) => (
            <tr key={f.id} className="hover:bg-slate-50/60">
              <Td className="font-semibold text-slate-900">{f.serie}</Td>
              <Td><Badge tone={f.tipo === "N. Crédito" ? "red" : "gray"}>{f.tipo}</Badge></Td>
              <Td>{f.cliente}</Td>
              <Td className="tabular text-slate-500">{f.ruc}</Td>
              <Td className="tabular whitespace-nowrap">{fecha(f.fecha)}</Td>
              <Td className="tabular text-slate-500">{f.viaje}</Td>
              <Td className="tabular text-right">{soles(f.monto)}</Td>
              <Td className="tabular text-right text-slate-500">{soles(f.igv)}</Td>
              <Td className="tabular text-right font-semibold">{soles(f.monto + f.igv)}</Td>
              <Td><Badge tone={estadoTone[f.estadoSunat]}>{f.estadoSunat}</Badge></Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </div>
  );
}
