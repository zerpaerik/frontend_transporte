"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Landmark, Users, Building2, CheckCircle2, X, Save, Trash2, TriangleAlert } from "lucide-react";
import { PageHeader, StatCard, Badge } from "@/components/ui";
import { DataTable, type Column, type Filter } from "@/components/DataTable";
import { useData } from "@/lib/store";
import { apiCobranzas } from "@/lib/api";
import { dinero, fecha, fechaISO, hoyPeru, soles } from "@/lib/format";
import { totalDe, detraccionDe, aDepositarSoles, responsableDe, etiquetaResponsable, detraccionDepositada, type Responsable } from "@/lib/detraccion";
import type { Factura } from "@/lib/types";

const doc = (f: Factura) => `${f.serie}-${f.correlativo}`;
const sumaSoles = (xs: Factura[], monto: (f: Factura) => number | null) => xs.reduce((s, f) => s + (monto(f) || 0), 0);

function BadgeResponsable({ f }: { f: Factura }) {
  const r = responsableDe(f);
  return <Badge tone={r === "Empresa" ? "orange" : "blue"}>{etiquetaResponsable(r)}</Badge>;
}

export default function DetraccionesPage() {
  const { facturas, reload } = useData();
  const [vista, setVista] = useState<"pendientes" | "depositadas">("pendientes");
  const [selId, setSelId] = useState<string | null>(null);

  // Facturas y boletas aceptadas por SUNAT que llevan detracción (lo anulado no se deposita).
  const sujetas = useMemo(
    () => facturas.filter((f) => f.sujetoDetraccion && f.tipo !== "N. Crédito" && f.tipo !== "N. Débito" && (f.estadoDocumento === "102" || f.estadoDocumento === "103")),
    [facturas],
  );
  const pendientes = sujetas.filter((f) => !detraccionDepositada(f));
  const depositadas = sujetas.filter(detraccionDepositada);
  const delCliente = pendientes.filter((f) => responsableDe(f) === "Cliente");
  const nuestras = pendientes.filter((f) => responsableDe(f) === "Empresa");

  const sel = facturas.find((f) => f.id === selId) || null;
  const filas = vista === "pendientes" ? pendientes : depositadas;

  const colDoc: Column<Factura> = { key: "doc", header: "Comprobante", sortable: true, value: doc, render: (f) => <span className="font-semibold text-slate-900">{doc(f)}</span> };
  const colCliente: Column<Factura> = { key: "cliente", header: "Cliente", sortable: true, render: (f) => <span className="block max-w-[220px] truncate" title={f.cliente}>{f.cliente}</span> };
  const colEmision: Column<Factura> = { key: "fecha", header: "Emisión", sortable: true, value: (f) => fechaISO(String(f.fecha)), render: (f) => <span className="tabular whitespace-nowrap">{fecha(f.fecha)}</span> };
  const colResponsable: Column<Factura> = { key: "responsable", header: "Le corresponde", sortable: true, value: (f) => etiquetaResponsable(responsableDe(f)), render: (f) => <BadgeResponsable f={f} /> };

  // Por depositar: lo necesario para saber qué falta y de quién es.
  const columnasPendientes: Column<Factura>[] = [
    colDoc, colCliente, colEmision,
    {
      key: "cobro", header: "Cobro", sortable: true, value: (f) => (f.pagada ? "Cobrada" : "Por cobrar"),
      render: (f) => (f.pagada ? <span className="whitespace-nowrap text-xs text-emerald-700">Cobrada {f.fechaPago ? fecha(f.fechaPago) : ""}</span> : <span className="text-xs text-slate-400">Por cobrar</span>),
    },
    {
      key: "aDepositar", header: "A depositar", align: "right", sortable: true, value: (f) => aDepositarSoles(f) ?? 0,
      render: (f) => {
        const s = aDepositarSoles(f);
        return (
          <span className="block whitespace-nowrap">
            <span className="tabular font-semibold">{s === null ? "—" : soles(s)}</span>
            {f.moneda === "USD" ? <span className="tabular block text-[11px] text-slate-400">{dinero(detraccionDe(f), "USD")}{f.tipoCambio ? ` · T.C. ${f.tipoCambio}` : " · sin T.C."}</span> : null}
          </span>
        );
      },
    },
    colResponsable,
  ];

  // Depositadas: fecha, número y monto del depósito a la vista, sin desplazarse.
  const columnasDepositadas: Column<Factura>[] = [
    colDoc, colCliente, colResponsable,
    { key: "detraccionFecha", header: "Fecha depósito", sortable: true, value: (f) => fechaISO(String(f.detraccionFecha || "")), render: (f) => <span className="tabular whitespace-nowrap">{f.detraccionFecha ? fecha(String(f.detraccionFecha)) : "—"}</span> },
    { key: "detraccionNumero", header: "N° detracción", sortable: true, value: (f) => f.detraccionNumero || "", render: (f) => <span className="tabular font-medium text-slate-800">{f.detraccionNumero}</span> },
    {
      key: "detraccionMonto", header: "Depositado", align: "right", sortable: true, value: (f) => f.detraccionMonto || 0,
      render: (f) => {
        const calc = aDepositarSoles(f);
        const distinto = calc !== null && calc > 0 && Math.abs((f.detraccionMonto || 0) - calc) >= 1;
        return (
          <span className="block whitespace-nowrap">
            <span className="tabular font-semibold text-emerald-700">{soles(f.detraccionMonto || 0)}</span>
            {distinto ? <span className="tabular block text-[11px] text-amber-600">calculado {soles(calc!)}</span> : null}
          </span>
        );
      },
    },
  ];
  const columns = vista === "pendientes" ? columnasPendientes : columnasDepositadas;
  const filters: Filter<Factura>[] = [
    { key: "responsable", label: "Le corresponde", value: (f) => etiquetaResponsable(responsableDe(f)) },
    { key: "cliente", label: "Cliente", value: (f) => f.cliente },
  ];

  const tab = (v: "pendientes" | "depositadas", txt: string, n: number) => (
    <button onClick={() => setVista(v)} className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${vista === v ? "bg-brand-500 text-white" : "border border-slate-300 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-600"}`}>
      {txt} <span className={`ml-1 rounded-full px-1.5 text-xs ${vista === v ? "bg-white/25" : "bg-slate-100"}`}>{n}</span>
    </button>
  );

  return (
    <div>
      <PageHeader
        modulo="09"
        title="Detracciones"
        subtitle="Control de las detracciones (SPOT) de las facturas: a quién le corresponde depositarlas en el Banco de la Nación y los datos de cada depósito."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Por depositar · cliente" value={delCliente.length} icon={Users} tone="blue" hint={delCliente.length ? soles(sumaSoles(delCliente, aDepositarSoles)) : "al día"} />
        <StatCard label="Por depositar · nosotros" value={nuestras.length} icon={Building2} tone="red" hint={nuestras.length ? `${soles(sumaSoles(nuestras, aDepositarSoles))} · nos toca` : "al día"} />
        <StatCard label="Depositadas" value={depositadas.length} icon={CheckCircle2} tone="green" hint={depositadas.length ? soles(sumaSoles(depositadas, (f) => f.detraccionMonto || 0)) : undefined} />
        <StatCard label="Total detracciones" value={soles(sumaSoles(sujetas, aDepositarSoles))} icon={Landmark} tone="gray" hint={`${sujetas.length} factura(s)`} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tab("pendientes", "Por depositar", pendientes.length)}
        {tab("depositadas", "Depositadas", depositadas.length)}
        <span className="ml-auto text-xs text-slate-400">
          Por norma la deposita el cliente; si el cliente pagó el total, nos toca a nosotros. Se define al registrar el cobro en{" "}
          <Link href="/cobranzas" className="font-semibold text-brand-600 hover:text-brand-700">Cobranzas</Link>.
        </span>
      </div>

      <DataTable
        title={vista === "pendientes" ? "Detracciones por depositar" : "Detracciones depositadas"}
        exportName={vista === "pendientes" ? "detracciones-por-depositar" : "detracciones-depositadas"}
        columns={columns}
        rows={filas}
        filters={filters}
        dateField={(f) => (vista === "depositadas" ? String(f.detraccionFecha || "") : String(f.fecha))}
        dateLabel={vista === "depositadas" ? "Depósito" : "Emisión"}
        minWidth="min-w-[900px]"
        searchPlaceholder="Buscar por comprobante, cliente o N° de detracción…"
        onRowClick={(f) => setSelId(f.id)}
        rowActions={(f) => (
          <button onClick={() => setSelId(f.id)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600">
            {detraccionDepositada(f) ? "Ver" : "Registrar"}
          </button>
        )}
      />

      {sel ? <DetraccionModal f={sel} todas={sujetas} onClose={() => setSelId(null)} onChanged={reload} /> : null}
    </div>
  );
}

function Dato({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm"><span className="text-slate-500">{k}</span><span className="text-right font-medium text-slate-800">{v}</span></div>;
}

function DetraccionModal({ f, todas, onClose, onChanged }: { f: Factura; todas: Factura[]; onClose: () => void; onChanged: () => Promise<void> | void }) {
  const depositada = detraccionDepositada(f);
  const aDepositar = aDepositarSoles(f);
  const [responsable, setResponsable] = useState<Responsable>(responsableDe(f));
  const [fechaDep, setFechaDep] = useState(f.detraccionFecha ? fechaISO(String(f.detraccionFecha)) : hoyPeru());
  const [numero, setNumero] = useState(f.detraccionNumero || "");
  const [monto, setMonto] = useState(depositada ? String(f.detraccionMonto || "") : aDepositar ? String(aDepositar) : "");
  const [busy, setBusy] = useState(false);

  const montoNum = Math.round((Number(String(monto).replace(",", ".")) || 0) * 100) / 100;
  const numeroLimpio = numero.trim();
  // Avisos (no bloquean): monto distinto al calculado y número de constancia ya usado.
  const montoDistinto = !!numeroLimpio && aDepositar !== null && aDepositar > 0 && montoNum > 0 && Math.abs(montoNum - aDepositar) >= 1;
  const repetida = numeroLimpio ? todas.find((o) => o.id !== f.id && (o.detraccionNumero || "").trim() === numeroLimpio) : undefined;

  async function guardar() {
    const body: { responsable: Responsable; numero?: string; fecha?: string | null; monto?: number } = { responsable };
    if (numeroLimpio) {
      if (!fechaDep) { alert("Indica la fecha del depósito."); return; }
      if (!(montoNum > 0)) { alert("Indica el monto depositado (mayor a 0)."); return; }
      Object.assign(body, { numero: numeroLimpio, fecha: fechaDep, monto: montoNum });
    } else if (depositada) {
      // Vaciaron el número de una que ya estaba depositada: es quitar el depósito.
      if (!confirm("¿Quitar el depósito registrado de esta detracción?")) return;
      Object.assign(body, { numero: "", fecha: null, monto: 0 });
    }
    setBusy(true);
    try { await apiCobranzas.detraccion(f.id, body); await onChanged(); onClose(); }
    catch (e) { alert((e as Error).message || "No se pudo guardar la detracción."); }
    finally { setBusy(false); }
  }
  async function quitar() {
    if (!confirm("¿Quitar el depósito registrado de esta detracción? Volverá a quedar por depositar.")) return;
    setBusy(true);
    try { await apiCobranzas.detraccion(f.id, { numero: "", fecha: null, monto: 0 }); await onChanged(); onClose(); }
    catch (e) { alert((e as Error).message || "No se pudo quitar el depósito."); }
    finally { setBusy(false); }
  }

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
  const btn = "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-6" onClick={onClose}>
      <div className="mt-8 w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{doc(f)}</h2>
              {depositada ? <Badge tone="green">Depositada</Badge> : <Badge tone="amber">Por depositar</Badge>}
            </div>
            <p className="mt-0.5 text-sm text-slate-500">{f.cliente} · RUC {f.ruc}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="px-6 py-3">
          <Dato k="Emisión" v={fecha(f.fecha)} />
          <Dato k="Total del comprobante" v={dinero(totalDe(f), f.moneda)} />
          <Dato k={`Detracción (${f.porcDetraccion || 4}%)`} v={dinero(detraccionDe(f), f.moneda)} />
          <Dato k="A depositar en el Banco de la Nación" v={aDepositar === null ? <span className="text-amber-600">sin tipo de cambio</span> : <b>{soles(aDepositar)}</b>} />
          <Dato k="Cobro" v={f.pagada ? <span className="text-emerald-700">Cobrada {f.fechaPago ? fecha(f.fechaPago) : ""}{f.montoCobrado ? ` · ${dinero(f.montoCobrado, f.moneda)}` : ""}</span> : <span className="text-slate-400">Aún no se cobra</span>} />

          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-medium text-slate-700">¿A quién le corresponde depositarla?</span>
            <select className={inp} value={responsable} onChange={(e) => setResponsable(e.target.value as Responsable)}>
              <option value="Cliente">El cliente (lo normal: descuenta la detracción y paga el neto)</option>
              <option value="Empresa">Nosotros (el cliente nos pagó el total)</option>
            </select>
          </label>

          <div className="mt-4 rounded-xl border border-slate-200 p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Depósito</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Fecha</span><input type="date" className={inp} value={fechaDep} onChange={(e) => setFechaDep(e.target.value)} /></label>
              <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Monto (S/)</span><input type="number" step="0.01" min="0" className={`${inp} tabular`} value={monto} onChange={(e) => setMonto(e.target.value)} /></label>
              <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium text-slate-700">N° de detracción (constancia de depósito)</span><input className={`${inp} tabular`} value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ej. 123456789" /></label>
            </div>
            {!numeroLimpio && !depositada ? <p className="mt-2 text-xs text-slate-400">Déjalo en blanco si todavía no se deposita: se guarda solo a quién le corresponde.</p> : null}
            {montoDistinto ? (
              <p className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700 ring-1 ring-inset ring-amber-200">
                <TriangleAlert size={13} className="mt-0.5 shrink-0" /> El monto no coincide con la detracción calculada ({soles(aDepositar!)}).
              </p>
            ) : null}
            {repetida ? (
              <p className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700 ring-1 ring-inset ring-amber-200">
                <TriangleAlert size={13} className="mt-0.5 shrink-0" /> Ese N° de detracción ya está registrado en {doc(repetida)}.
              </p>
            ) : null}
          </div>

          <div className="mt-4 mb-2 flex flex-wrap items-center gap-2">
            {depositada ? (
              <button disabled={busy} onClick={quitar} className={`${btn} border border-slate-300 bg-white text-slate-600 hover:border-rose-300 hover:text-rose-600`}><Trash2 size={15} /> Quitar depósito</button>
            ) : null}
            <button disabled={busy} onClick={guardar} className={`${btn} ml-auto bg-brand-500 text-white hover:bg-brand-600`}><Save size={15} /> {busy ? "Guardando…" : "Guardar"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
