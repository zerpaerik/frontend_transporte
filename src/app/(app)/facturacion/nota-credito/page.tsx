"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileMinus } from "lucide-react";
import { PageHeader, StatCard, Badge } from "@/components/ui";
import { DataTable, type Column, type Filter } from "@/components/DataTable";
import { useData } from "@/lib/store";
import { apiEmisor, type EmisorRespuesta } from "@/lib/api";
import { soles, fecha } from "@/lib/format";
import type { Factura } from "@/lib/types";
import { ComprobanteModal, estDoc } from "@/components/ComprobanteModal";

const filters: Filter<Factura>[] = [
  { key: "cliente", label: "Cliente", value: (f) => f.cliente },
  { key: "estado", label: "Estado", value: (f) => estDoc(f).label },
];

export default function NotasCreditoPage() {
  const router = useRouter();
  const { facturas, reload } = useData();
  const [emisor, setEmisor] = useState<EmisorRespuesta | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const sel = facturas.find((f) => f.id === selId) || null;

  useEffect(() => { apiEmisor.get().then(setEmisor).catch(() => setEmisor(null)); }, []);

  const notas = facturas.filter((f) => f.tipo === "N. Crédito");
  const aceptadas = notas.filter((f) => f.estadoDocumento === "102" || f.estadoDocumento === "103").length;
  const sinEmitir = notas.filter((f) => !f.estadoDocumento).length;

  const columns: Column<Factura>[] = [
    { key: "doc", header: "Nota de crédito", sortable: true, value: (f) => `${f.serie}-${f.correlativo}`, render: (f) => <span className="font-semibold text-slate-900">{f.serie}{f.correlativo ? `-${f.correlativo}` : ""}</span> },
    { key: "ref", header: "Afecta a", render: (f) => <span className="tabular text-slate-500">{f.docRefSerie ? `${f.docRefSerie}-${f.docRefCorrelativo}` : "—"}</span> },
    { key: "cliente", header: "Cliente", sortable: true },
    { key: "ruc", header: "RUC", render: (f) => <span className="tabular text-slate-500">{f.ruc}</span> },
    { key: "fecha", header: "Fecha", sortable: true, value: (f) => f.fecha, render: (f) => <span className="tabular whitespace-nowrap">{fecha(f.fecha)}</span> },
    { key: "total", header: "Total", align: "right", sortable: true, value: (f) => f.monto + f.igv, render: (f) => <span className="tabular font-semibold">{soles(f.total || f.monto + f.igv)}</span> },
    { key: "sunat", header: "Estado SUNAT", sortable: true, value: (f) => estDoc(f).label, render: (f) => <Badge tone={estDoc(f).tone}>{estDoc(f).label}</Badge> },
    { key: "acc", header: "", align: "right", render: (f) => <button onClick={() => setSelId(f.id)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600">Abrir</button> },
  ];

  return (
    <div>
      <PageHeader modulo="09" title="Notas de crédito — SUNAT" subtitle="Notas de crédito emitidas sobre facturas o boletas ya aceptadas por SUNAT (anulación, devolución, descuento)." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Notas de crédito" value={notas.length} icon={FileMinus} tone="blue" />
        <StatCard label="Aceptadas SUNAT" value={aceptadas} icon={FileMinus} tone="green" />
        <StatCard label="Sin emitir" value={sinEmitir} icon={FileMinus} tone="amber" />
      </div>

      <DataTable
        title="Notas de crédito"
        exportName="notas-credito"
        columns={columns}
        rows={notas}
        filters={filters}
        minWidth="min-w-[900px]"
        searchPlaceholder="Buscar por serie, cliente, RUC…"
        toolbar={
          <button onClick={() => router.push("/facturacion/nota-credito/nueva")} className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            <Plus size={16} /> Nueva nota de crédito
          </button>
        }
      />

      {sel ? <ComprobanteModal f={sel} listo={!!emisor?.integracionConfigurada && !!emisor?.config.activo} onClose={() => setSelId(null)} onChanged={reload} /> : null}
    </div>
  );
}
