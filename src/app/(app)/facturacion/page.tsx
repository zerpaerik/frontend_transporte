"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ReceiptText, Search, ShieldCheck, TriangleAlert, FileMinus, FilePlus, ListChecks, X } from "lucide-react";
import { PageHeader, StatCard, Badge } from "@/components/ui";
import { DataTable, type Column, type Filter } from "@/components/DataTable";
import { useData } from "@/lib/store";
import { apiEmisor, apiCuentas, apiFacturasE, type EmisorRespuesta, type CuentaBancaria, type RevisionNumeracion } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { soles, dinero, fecha, ordenComprobantes } from "@/lib/format";
import type { Factura } from "@/lib/types";
import { ComprobanteModal, estDoc } from "@/components/ComprobanteModal";

const filters: Filter<Factura>[] = [
  { key: "tipo", label: "Tipo", value: (f) => f.tipo },
  { key: "cliente", label: "Cliente", value: (f) => f.cliente },
];

export default function FacturacionPage() {
  const router = useRouter();
  const { facturas, reload } = useData();
  const [codigo, setCodigo] = useState("");
  const [emisor, setEmisor] = useState<EmisorRespuesta | null>(null);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [revision, setRevision] = useState(false);
  const { user } = useAuth();
  const sel = facturas.find((f) => f.id === selId) || null;

  useEffect(() => {
    apiEmisor.get().then(setEmisor).catch(() => setEmisor(null));
    apiCuentas.list().then((cs) => setCuentas(cs.filter((c) => c.activo))).catch(() => {});
  }, []);

  // Facturación lista solo facturas/boletas; las notas de crédito y débito tienen su propia pantalla.
  const comprobantes = ordenComprobantes(facturas.filter((f) => f.tipo !== "N. Crédito" && f.tipo !== "N. Débito"));
  const total = comprobantes.filter((f) => f.estadoSunat !== "Anulada").reduce((s, f) => s + f.monto + f.igv, 0);
  const aceptadas = comprobantes.filter((f) => f.estadoDocumento === "102" || f.estadoDocumento === "103").length;
  const sinEmitir = comprobantes.filter((f) => !f.estadoDocumento).length;

  const columns: Column<Factura>[] = [
    { key: "doc", header: "Comprobante", sortable: true, value: (f) => `${f.serie}${f.correlativo ? "-" + f.correlativo : ""}`, render: (f) => <span className="font-semibold text-slate-900">{f.serie}{f.correlativo ? `-${f.correlativo}` : ""}</span> },
    { key: "tipo", header: "Tipo", render: (f) => <Badge tone={f.tipo === "N. Crédito" ? "red" : f.tipo === "N. Débito" ? "amber" : "gray"}>{f.tipo}</Badge> },
    { key: "cliente", header: "Cliente", sortable: true },
    { key: "ruc", header: "RUC", render: (f) => <span className="tabular text-slate-500">{f.ruc}</span> },
    { key: "fecha", header: "Fecha", sortable: true, value: (f) => f.fecha, render: (f) => <span className="tabular whitespace-nowrap">{fecha(f.fecha)}</span> },
    { key: "total", header: "Total", align: "right", sortable: true, value: (f) => f.monto + f.igv, render: (f) => <span className="tabular font-semibold">{dinero(f.total || f.monto + f.igv, f.moneda)}</span> },
    { key: "detr", header: "Detracción", align: "right", render: (f) => (f.sujetoDetraccion && f.montoDetraccion ? <span className="tabular text-rose-500">−{soles(f.montoDetraccion)}</span> : <span className="text-slate-300">—</span>) },
    { key: "sunat", header: "Estado SUNAT", sortable: true, value: (f) => estDoc(f).label, render: (f) => <Badge tone={estDoc(f).tone}>{estDoc(f).label}</Badge> },
    { key: "acc", header: "", align: "right", render: (f) => <button onClick={() => setSelId(f.id)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600">Abrir</button> },
  ];

  function irNuevo() { router.push("/facturacion/nueva"); }
  function traer() {
    const c = codigo.trim();
    router.push(c ? `/facturacion/nueva?codigo=${encodeURIComponent(c)}` : "/facturacion/nueva");
  }

  const prod = emisor?.esProd;

  return (
    <div>
      <PageHeader modulo="09" title="Facturación electrónica — SUNAT" subtitle="Comprobantes emitidos ante SUNAT vía MiFact, con detracción de transporte, estado, PDF/XML/CDR y anulación." />

      {emisor ? (
        <div className={`mb-5 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm ${prod ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}>
          {prod ? <TriangleAlert className="text-rose-600" size={18} /> : <ShieldCheck className="text-emerald-600" size={18} />}
          <span className={`font-semibold ${prod ? "text-rose-700" : "text-emerald-700"}`}>{prod ? "PRODUCCIÓN — se envía real a SUNAT" : "DEMO — nada se envía a SUNAT"}</span>
          <span className="text-slate-500">
            {!emisor.integracionConfigurada ? "Falta URL/token en el servidor." : !emisor.config.activo ? "Emisión electrónica deshabilitada (actívala en Datos del emisor)." : "Listo para emitir."}
          </span>
          <Badge tone={prod ? "red" : "green"}>{prod ? "PROD" : "DEMO"}</Badge>
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Comprobantes" value={comprobantes.length} icon={ReceiptText} tone="blue" />
        <StatCard label="Aceptados SUNAT" value={aceptadas} icon={ReceiptText} tone="green" />
        <StatCard label="Sin emitir" value={sinEmitir} icon={ReceiptText} tone="amber" />
        <StatCard label="Ventas facturadas" value={soles(total)} icon={ReceiptText} tone="green" />
      </div>

      <DataTable
        title="Comprobantes SUNAT"
        exportName="facturacion-sunat"
        columns={columns}
        rows={comprobantes}
        filters={filters}
        minWidth="min-w-[1040px]"
        searchPlaceholder="Buscar por serie, cliente, RUC…"
        toolbar={
          <>
            <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-1.5 py-1">
              <Search size={14} className="text-slate-400" />
              <input value={codigo} onChange={(e) => setCodigo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") traer(); }}
                placeholder="Código de viaje (OP-0001)" className="w-40 text-sm outline-none" />
              <button onClick={traer} className="rounded-md bg-steel-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-steel-700">Traer</button>
            </div>
            {user?.rol === "Administrador" && emisor?.integracionConfigurada ? (
              <button onClick={() => setRevision(true)} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600">
                <ListChecks size={16} /> Revisar numeración
              </button>
            ) : null}
            <button onClick={() => router.push("/facturacion/nota-credito")} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600">
              <FileMinus size={16} /> Nota de crédito
            </button>
            <button onClick={() => router.push("/facturacion/nota-debito")} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600">
              <FilePlus size={16} /> Nota de débito
            </button>
            <button onClick={irNuevo} className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
              <Plus size={16} /> Nuevo comprobante
            </button>
          </>
        }
      />

      {revision ? <RevisionModal onClose={() => setRevision(false)} /> : null}
      {sel ? <ComprobanteModal f={sel} listo={!!emisor?.integracionConfigurada && !!emisor?.config.activo} emisor={emisor?.config ?? null} cuentas={cuentas} onClose={() => setSelId(null)} onChanged={reload} onEdit={() => router.push(`/facturacion/nueva?id=${sel.id}`)} /> : null}
    </div>
  );
}

// Lista los comprobantes que están en SUNAT (vía MiFact) pero no en el sistema: duplicados que
// dejó el reintento anterior. Hay que anularlos para que el cliente no tenga dos facturas.
function RevisionModal({ onClose }: { onClose: () => void }) {
  const [r, setR] = useState<RevisionNumeracion | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    apiFacturasE.revisarNumeracion().then(setR).catch((e) => setError((e as Error).message || "No se pudo revisar la numeración."));
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-6" onClick={onClose}>
      <div className="mt-8 w-full max-w-3xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Revisar numeración</h2>
            <p className="mt-0.5 text-sm text-slate-500">Busca números que faltan en el sistema y los consulta en MiFact: si existen, son comprobantes emitidos en SUNAT que el sistema no tiene.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="space-y-4 px-6 py-4 text-sm">
          {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">{error}</div> : null}
          {!r && !error ? <p className="py-8 text-center text-slate-400">Consultando a MiFact… puede tardar un poco.</p> : null}
          {r ? (
            r.hallazgos.length ? (
              <>
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800">
                  <b>{r.hallazgos.length} comprobante(s) en SUNAT que no están en el sistema.</b> Normalmente son duplicados del comprobante con el número siguiente: anúlalos en el portal de MiFact (comunicación de baja) o, si ya venció el plazo de baja, con una nota de crédito.
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[620px]">
                    <thead className="bg-slate-50 text-xs text-slate-500">
                      <tr><th className="px-3 py-2 text-left font-semibold">En SUNAT, no en el sistema</th><th className="px-3 py-2 text-left font-semibold">Fecha</th><th className="px-3 py-2 text-left font-semibold">Probable duplicado de</th><th className="px-3 py-2 text-right font-semibold">Total</th></tr>
                    </thead>
                    <tbody>
                      {r.hallazgos.map((h) => (
                        <tr key={h.documento} className="border-t border-slate-100 align-top">
                          <td className="px-3 py-2"><span className="font-semibold tabular text-rose-700">{h.documento}</span><span className="block text-[11px] text-slate-400">{h.descripcion || `Estado ${h.estado}`}</span></td>
                          <td className="px-3 py-2 tabular whitespace-nowrap">{fecha(h.fecha)}</td>
                          <td className="px-3 py-2"><span className="font-semibold tabular">{h.probableDuplicadoDe.documento}</span><span className="block text-xs text-slate-500">{h.probableDuplicadoDe.cliente} · {h.probableDuplicadoDe.ruc}</span></td>
                          <td className="px-3 py-2 text-right tabular whitespace-nowrap">{dinero(h.probableDuplicadoDe.total, h.probableDuplicadoDe.moneda)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-400">Antes de anular, abre el PDF del comprobante en el portal de MiFact y confirma que sus datos coinciden con el &quot;probable duplicado&quot;.</p>
              </>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">No se encontraron comprobantes en SUNAT fuera del sistema.</div>
            )
          ) : null}
          {r?.libres.length ? <p className="text-xs text-slate-500">Números que faltan pero no existen en MiFact (no se usaron; no hay que hacer nada): {r.libres.join(", ")}.</p> : null}
          {r?.truncado ? <p className="text-xs text-amber-700">Se alcanzó el máximo de consultas por revisión; vuelve a ejecutarla más tarde para revisar el resto.</p> : null}
        </div>
      </div>
    </div>
  );
}
