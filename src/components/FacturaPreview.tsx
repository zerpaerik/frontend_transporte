"use client";

import { X, Printer } from "lucide-react";
import { dinero, simboloMoneda, soles, fecha } from "@/lib/format";
import type { EmisorConfig } from "@/lib/api";

// Datos que necesita la vista previa. Se arma tanto desde el formulario de "Nuevo
// comprobante" (antes de guardar) como desde un comprobante ya registrado.
export interface PreviewData {
  tipo: string; // Factura | Boleta | N. Crédito
  serie?: string;
  correlativo?: string;
  fecha: string; // YYYY-MM-DD
  moneda?: string; // PEN | USD
  tipoCambio?: number;
  cliente: string;
  ruc?: string;
  direccion?: string;
  lineas: { descripcion: string; cantidad: number; valorUnitario: number }[];
  formaPago?: string; // Contado | Credito
  fechaVencimiento?: string | null;
  guia?: string;
  guiaTransportista?: string;
  referencia?: string;
  detalleViaje?: string;
  valorReferencial?: number;
  ubigeoOrigen?: string;
  ubigeoDestino?: string;
  docRef?: string; // "FN01-123" cuando es nota de crédito/débito
  // Detracción ya calculada por el backend (comprobante registrado). Si no viene, se estima.
  montoDetraccion?: number;
  sujetoDetraccion?: boolean;
  ctaDetraccion?: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

// Cuentas bancarias que salen como observación para el pago (opcional).
export interface CuentaLite { banco: string; moneda: string; numero: string; cci?: string }

export function FacturaPreview({
  data,
  emisor,
  cuentas = [],
  onClose,
}: {
  data: PreviewData;
  emisor: EmisorConfig | null;
  cuentas?: CuentaLite[];
  onClose: () => void;
}) {
  const mon = data.moneda === "USD" ? "USD" : "PEN";
  const sim = simboloMoneda(mon);
  const tc = data.tipoCambio || 0;

  const gravado = r2(data.lineas.reduce((s, l) => s + (l.valorUnitario || 0) * (l.cantidad || 1), 0));
  const igv = r2(gravado * 0.18);
  const total = r2(gravado + igv);

  // Detracción del transporte de carga. Siempre en soles. Si el backend ya la calculó
  // se usa ese monto; si no, se estima con la config del emisor (se confirma al emitir).
  const porc = emisor?.porcDetraccion || 4;
  const umbral = emisor?.umbralDetraccion ?? 400;
  // El umbral (S/) se compara en soles; la detracción se expresa en la MONEDA del comprobante
  // (igual que el backend/MiFact): el valor referencial (soles) se lleva a la moneda con el T.C.
  const totalSoles = mon === "USD" && tc > 0 ? r2(total * tc) : total;
  const vrEnMoneda = mon === "USD" && tc > 0 ? r2((data.valorReferencial || 0) / tc) : (data.valorReferencial || 0);
  const baseDetr = Math.max(total, vrEnMoneda);
  const aplicaEstimada = !!emisor?.ctaDetraccion && totalSoles > umbral && data.tipo !== "N. Crédito";
  const detraccion =
    data.montoDetraccion !== undefined && data.montoDetraccion > 0
      ? data.montoDetraccion
      : aplicaEstimada
        ? (mon === "PEN" ? Math.round(baseDetr * (porc / 100)) : r2(baseDetr * (porc / 100))) // soles enteros (regla SUNAT)
        : 0;
  const hayDetr = (data.sujetoDetraccion ?? aplicaEstimada) && detraccion > 0;
  const estimada = data.montoDetraccion === undefined;
  // Neto a pagar: total − detracción, ambos ya en la moneda del comprobante.
  const neto = r2(total - detraccion);
  const cta = data.ctaDetraccion || emisor?.ctaDetraccion || "";

  const doc = `${data.serie || ""}${data.correlativo ? "-" + data.correlativo : ""}`.trim();
  const th = "px-2 py-1.5 text-left font-semibold text-slate-500";
  const td = "px-2 py-1.5 align-top";

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 sm:p-6" onClick={onClose}>
      <div className="my-6 w-full max-w-3xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Barra */}
        <div className="no-print flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-700">Vista previa</span>
            Así se verá el comprobante
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600"><Printer size={15} /> Imprimir / PDF</button>
            <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
          </div>
        </div>

        {/* Documento */}
        <div id="doc-imprimible" className="px-5 py-5 sm:px-8 sm:py-7">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
            <div>
              <div className="text-base font-extrabold uppercase tracking-tight text-slate-900">{emisor?.razonSocial || "Emisor no configurado"}</div>
              {emisor?.nombreComercial ? <div className="text-sm text-slate-500">{emisor.nombreComercial}</div> : null}
              <div className="mt-1 text-xs text-slate-500">{emisor?.direccionFiscal || ""}</div>
            </div>
            <div className="rounded-xl border-2 border-slate-300 px-4 py-3 text-center">
              <div className="text-[11px] font-semibold text-slate-500">RUC {emisor?.ruc || "—"}</div>
              <div className="mt-0.5 text-sm font-extrabold uppercase text-brand-600">{data.tipo === "N. Crédito" ? "Nota de crédito" : data.tipo === "N. Débito" ? "Nota de débito" : data.tipo} electrónica</div>
              <div className="mt-0.5 text-sm font-bold tabular text-slate-800">{doc || "Serie por asignar"}</div>
            </div>
          </div>

          {/* Cliente + condiciones */}
          <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-1 rounded-xl bg-slate-50 px-4 py-3 text-sm sm:grid-cols-2">
            <Row k="Cliente" v={data.cliente || "—"} />
            <Row k="Fecha de emisión" v={fecha(data.fecha)} />
            <Row k="RUC / DNI" v={data.ruc || "—"} />
            <Row k="Moneda" v={mon === "USD" ? `Dólares (US$)${tc ? ` · T.C. ${tc.toFixed(3)}` : ""}` : "Soles (S/)"} />
            {data.direccion ? <Row k="Dirección" v={data.direccion} /> : <span className="hidden sm:block" />}
            <Row k="Forma de pago" v={condicion(data)} />
            {data.docRef ? <Row k="Documento que modifica" v={data.docRef} /> : null}
            {data.referencia ? <Row k="Orden / referencia" v={data.referencia} /> : null}
            {data.guia ? <Row k="Guía remitente" v={data.guia} /> : null}
            {data.guiaTransportista ? <Row k="Guía transportista" v={data.guiaTransportista} /> : null}
          </div>

          {/* Líneas: detalle de precio unitario e IGV por línea */}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-y border-slate-200 bg-slate-50 text-xs">
                  <th className={`${th} w-10`}>Cant.</th>
                  <th className={th}>Descripción</th>
                  <th className={`${th} text-right`}>P. unitario</th>
                  <th className={`${th} text-right`}>IGV 18%</th>
                  <th className={`${th} text-right`}>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.lineas.filter((l) => l.descripcion.trim() || l.valorUnitario).map((l, i) => {
                  const cant = l.cantidad || 1;
                  const base = r2((l.valorUnitario || 0) * cant);
                  const igvItem = r2(base * 0.18);
                  const totalItem = r2(base + igvItem); // total con IGV por ítem (p. ej. 100 + 18 = 118)
                  const money = (n: number) => n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  return (
                    <tr key={i} className="border-b border-slate-100 align-top">
                      <td className={`${td} tabular`}>{cant}</td>
                      <td className={`${td} whitespace-pre-wrap break-words text-slate-700`}>{l.descripcion || "—"}</td>
                      <td className={`${td} whitespace-nowrap text-right tabular`}>{sim} {money(l.valorUnitario || 0)}</td>
                      <td className={`${td} whitespace-nowrap text-right tabular text-slate-500`}>{sim} {money(igvItem)}</td>
                      <td className={`${td} whitespace-nowrap text-right tabular font-semibold`}>{sim} {money(totalItem)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totales + detracción */}
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:justify-between">
            <div className="flex-1 space-y-2 text-xs text-slate-500">
              {data.detalleViaje ? <p><span className="font-semibold text-slate-600">Detalle:</span> {data.detalleViaje}</p> : null}
              {hayDetr ? (
                <p><span className="font-semibold text-slate-600">Detracción (transporte {emisor?.codDetraccion || "027"}):</span> {porc}% · cuenta {cta || "—"} (Banco de la Nación){estimada ? " · estimada, se confirma al emitir" : ""}</p>
              ) : null}
              {cuentas.length ? (
                <div>
                  <span className="font-semibold text-slate-600">Pago a las cuentas:</span>
                  <ul className="mt-0.5 space-y-0.5">
                    {cuentas.map((c, i) => <li key={i}>{c.banco} {c.moneda} — Cta {c.numero}{c.cci ? ` / CCI ${c.cci}` : ""}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>
            <div className="w-full shrink-0 space-y-1.5 text-sm sm:w-72">
              <Tot k="Op. gravada" v={dinero(gravado, mon)} />
              <Tot k="IGV (18%)" v={dinero(igv, mon)} />
              <div className="flex justify-between border-t border-slate-200 pt-1.5"><span className="font-bold text-slate-800">Importe total</span><span className="tabular font-extrabold text-slate-900">{dinero(total, mon)}</span></div>
              {hayDetr ? (
                <>
                  <Tot k={`Detracción (${porc}%)`} v={<span className="text-rose-500">− {dinero(detraccion, mon)}</span>} />
                  <div className="flex justify-between rounded-lg bg-emerald-50 px-2 py-1.5"><span className="font-bold text-emerald-800">Neto a pagar</span><span className="tabular font-extrabold text-emerald-700">{dinero(neto, mon)}</span></div>
                </>
              ) : null}
            </div>
          </div>

          <p className="mt-5 border-t border-slate-100 pt-3 text-center text-[11px] text-slate-400">
            Vista previa referencial — no es un documento válido. El diseño final (logo/membrete) lo genera MiFact al emitir a SUNAT.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex gap-2 py-0.5"><span className="shrink-0 text-slate-400">{k}:</span><span className="break-words font-medium text-slate-700">{v}</span></div>;
}
function Tot({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between"><span className="text-slate-500">{k}</span><span className="tabular font-medium text-slate-700">{v}</span></div>;
}
function condicion(d: PreviewData): string {
  if ((d.formaPago || "Contado") !== "Credito" || !d.fechaVencimiento) return "Contado";
  const dias = Math.max(0, Math.round((new Date(d.fechaVencimiento).getTime() - new Date(d.fecha).getTime()) / 86_400_000));
  return `Crédito ${dias} días · vence ${fecha(d.fechaVencimiento)}`;
}
