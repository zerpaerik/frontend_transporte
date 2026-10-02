"use client";

import type { CotizacionInput } from "@/lib/api";
import { fechaISO } from "@/lib/format";

// Datos que muestra el documento: lo que se digita más lo que asigna el sistema.
export type CotizacionDocData = CotizacionInput & {
  codigo?: string;
  empresaRazon: string;
  empresaRuc: string;
  empresaDireccion: string;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

// Mismo cálculo que el backend: Σ cant × precio × (1 − desc%), descuento global, impuesto.
export function totalesCotizacion(c: Pick<CotizacionInput, "items" | "descuentoGlobal" | "igvPorc">) {
  const subtotal = r2(c.items.reduce((s, i) => s + (i.cantidad || 0) * (i.precio || 0) * (1 - (i.descuento || 0) / 100), 0));
  const descuento = r2(subtotal * (c.descuentoGlobal || 0) / 100);
  const igv = r2((subtotal - descuento) * (c.igvPorc ?? 18) / 100);
  return { subtotal, descuento, igv, total: r2(subtotal - descuento + igv) };
}

// Fecha como en el formato de la empresa: 29/09/2026.
const fecha = (iso: string) => { const d = fechaISO(iso); return d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "—"; };
const num = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 2, useGrouping: false });
const money = (n: number, moneda: string) =>
  `${moneda === "USD" ? "US$" : "S/"} ${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Cotización en el formato que usa la empresa: logo, barra de color, cuadros Empresa /
// Cliente, tabla de ítems, notas/condiciones y cuadro de totales.
export function CotizacionDoc({ c, logo, color }: { c: CotizacionDocData; logo: string; color: string }) {
  const t = totalesCotizacion(c);
  const lineas = c.items.filter((i) => i.descripcion.trim() || i.precio);
  const lineasTexto = (s: string) => s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const label = "text-[13px] font-extrabold uppercase tracking-[0.12em]";

  return (
    <div id="doc-imprimible" className="bg-white px-6 py-7 text-slate-700 sm:px-10 sm:py-9">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-6">
        {logo ? <img src={logo} alt={c.empresaRazon} className="h-20 w-auto max-w-[180px] object-contain" /> : <div className="text-lg font-extrabold text-slate-800">{c.empresaRazon}</div>}
        <div className="text-right">
          <div className="text-2xl font-extrabold tracking-tight" style={{ color }}>COTIZACIÓN</div>
          <dl className="mt-1 grid grid-cols-[auto_auto] justify-end gap-x-3 text-[12px] leading-5">
            <dt className="font-semibold text-slate-500">Nº</dt><dd className="font-bold tabular text-slate-800">{c.codigo || "Por asignar"}</dd>
            <dt className="font-semibold text-slate-500">Fecha</dt><dd className="font-bold tabular text-slate-800">{fecha(c.fecha)}</dd>
            <dt className="font-semibold text-slate-500">Válida hasta</dt><dd className="font-bold tabular text-slate-800">{fecha(c.validaHasta)}</dd>
          </dl>
        </div>
      </div>
      <div className="mt-6 h-1.5 w-full" style={{ background: color }} />

      {/* Empresa / Cliente */}
      <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 px-5 py-4">
          <div className={label} style={{ color }}>Empresa</div>
          <div className="mt-3 text-[15px] font-bold text-slate-800">{c.empresaRazon || "—"}</div>
          <div className="mt-1 space-y-0.5 text-sm">
            {c.empresaRuc ? <div className="tabular">{c.empresaRuc}</div> : null}
            {c.empresaDireccion ? <div>{c.empresaDireccion}</div> : null}
          </div>
          {c.contactoNombre || c.contactoEmail || c.contactoTelefono ? (
            <div className="mt-3 space-y-0.5 text-sm">
              {c.contactoNombre ? <div>{c.contactoNombre}</div> : null}
              {c.contactoEmail ? <div>{c.contactoEmail}</div> : null}
              {c.contactoTelefono ? <div className="tabular">{c.contactoTelefono}</div> : null}
            </div>
          ) : null}
        </div>
        <div className="rounded-2xl border border-slate-200 px-5 py-4">
          <div className={label} style={{ color }}>Cliente</div>
          <div className="mt-3 text-[15px] font-bold text-slate-800">{c.cliente || "—"}</div>
          <div className="mt-1 space-y-0.5 text-sm">
            {c.clienteRuc ? <div className="tabular">{c.clienteRuc}</div> : null}
            {c.clienteDireccion ? <div>{c.clienteDireccion}</div> : null}
          </div>
        </div>
      </div>

      {/* Ítems */}
      <div className="mt-7 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="text-white" style={{ background: color }}>
              <th className="px-3 py-2.5 text-left font-bold">Descripción</th>
              <th className="w-16 border-l border-white/20 px-3 py-2.5 text-right font-bold">Cant.</th>
              <th className="w-28 border-l border-white/20 px-3 py-2.5 text-right font-bold">Precio</th>
              <th className="w-20 border-l border-white/20 px-3 py-2.5 text-right font-bold">Desc.</th>
              <th className="w-32 border-l border-white/20 px-3 py-2.5 text-right font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((i, k) => (
              <tr key={k} className="border-b border-slate-200 align-middle">
                <td className="whitespace-pre-wrap break-words px-3 py-3">{i.descripcion}</td>
                <td className="px-3 py-3 text-right tabular">{num(i.cantidad || 0)}</td>
                <td className="px-3 py-3 text-right tabular">{num(i.precio || 0)}</td>
                <td className="px-3 py-3 text-right tabular">{i.descuento ? `${num(i.descuento)}%` : 0}</td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-bold tabular text-slate-900">
                  {money(r2((i.cantidad || 0) * (i.precio || 0) * (1 - (i.descuento || 0) / 100)), c.moneda)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notas / condiciones + totales */}
      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-6">
          <div>
            <div className={label} style={{ color }}>Notas</div>
            <div className="mt-2 space-y-0.5 text-sm">{lineasTexto(c.notas).map((l, k) => <p key={k}>{l}</p>)}</div>
          </div>
          <div>
            <div className={label} style={{ color }}>Condiciones</div>
            <div className="mt-2 space-y-0.5 text-sm">{lineasTexto(c.condiciones).map((l, k) => <p key={k}>{l}</p>)}</div>
          </div>
          {c.moneda === "USD" && c.tipoCambio ? <p className="text-xs text-slate-500">Montos en dólares americanos · T.C. referencial {c.tipoCambio.toFixed(3)}</p> : null}
        </div>
        <div className="w-full shrink-0 overflow-hidden rounded-2xl border border-slate-200 text-sm sm:w-80">
          <TotRow k="Subtotal" v={money(t.subtotal, c.moneda)} bold />
          <TotRow k="Descuento global %" v={num(c.descuentoGlobal || 0)} />
          <TotRow k="Desc. global" v={money(t.descuento, c.moneda)} bold />
          <TotRow k="Impuesto %" v={num(c.igvPorc ?? 18)} />
          <TotRow k="Impuesto" v={money(t.igv, c.moneda)} bold />
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-lg font-extrabold text-slate-800">Total</span>
            <span className="text-lg font-extrabold tabular" style={{ color }}>{money(t.total, c.moneda)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TotRow({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
      <span className="text-slate-600">{k}</span>
      <span className={`tabular ${bold ? "font-bold text-slate-900" : "text-slate-600"}`}>{v}</span>
    </div>
  );
}
