"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Landmark, Users, Building2, CheckCircle2, X, Save, Trash2, TriangleAlert, FileDown, FileText } from "lucide-react";
import { PageHeader, StatCard, Badge } from "@/components/ui";
import { DataTable, type Column, type Filter } from "@/components/DataTable";
import { useData } from "@/lib/store";
import { apiCobranzas, apiDetracciones, downloadBase64, type DetraccionLote } from "@/lib/api";
import { dinero, fecha, fechaISO, hoyPeru, soles } from "@/lib/format";
import { totalDe, detraccionDe, aDepositarSoles, responsableDe, etiquetaResponsable, detraccionDepositada, notasCreditoPorFactura, notasDe, anuladaPorNc, docDe, type Responsable } from "@/lib/detraccion";
import type { Factura } from "@/lib/types";

const doc = (f: Factura) => `${f.serie}-${f.correlativo}`;
const sumaSoles = (xs: Factura[], monto: (f: Factura) => number | null) => xs.reduce((s, f) => s + (monto(f) || 0), 0);

function BadgeResponsable({ f }: { f: Factura }) {
  const r = responsableDe(f);
  return <Badge tone={r === "Empresa" ? "orange" : "blue"}>{etiquetaResponsable(r)}</Badge>;
}

export default function DetraccionesPage() {
  const { facturas, reload } = useData();
  const [vista, setVista] = useState<"pendientes" | "depositadas" | "lotes">("pendientes");
  const [selId, setSelId] = useState<string | null>(null);
  const [lotes, setLotes] = useState<DetraccionLote[]>([]);
  const [generar, setGenerar] = useState(false);
  const cargarLotes = () => apiDetracciones.lotes().then(setLotes).catch(() => setLotes([]));
  useEffect(() => { cargarLotes(); }, []);

  // Facturas y boletas aceptadas por SUNAT que llevan detracción (lo anulado no se deposita).
  const sujetas = useMemo(
    () => facturas.filter((f) => f.sujetoDetraccion && f.tipo !== "N. Crédito" && f.tipo !== "N. Débito" && (f.estadoDocumento === "102" || f.estadoDocumento === "103")),
    [facturas],
  );
  // Una factura anulada con nota de crédito ya no tiene detracción que depositar. Si ya se había
  // depositado, sigue en "Depositadas" (marcada) para gestionar la devolución.
  const notas = useMemo(() => notasCreditoPorFactura(facturas), [facturas]);
  const anulada = (f: Factura) => anuladaPorNc(f, notas);
  const pendientes = sujetas.filter((f) => !detraccionDepositada(f) && !anulada(f));
  const depositadas = sujetas.filter(detraccionDepositada);
  const anuladasSinDepositar = sujetas.filter((f) => !detraccionDepositada(f) && anulada(f));
  const delCliente = pendientes.filter((f) => responsableDe(f) === "Cliente");
  const nuestras = pendientes.filter((f) => responsableDe(f) === "Empresa");

  const sel = facturas.find((f) => f.id === selId) || null;
  const filas = vista === "depositadas" ? depositadas : pendientes;

  const colDoc: Column<Factura> = {
    key: "doc", header: "Comprobante", sortable: true, value: doc,
    render: (f) => (
      <span className="block whitespace-nowrap">
        <span className="font-semibold text-slate-900">{doc(f)}</span>
        {f.detraccionLote && !detraccionDepositada(f) ? <span className="block text-[11px] font-semibold text-steel-700">En archivo {f.detraccionLote}</span> : null}
        {anulada(f) ? <span className="block text-[11px] font-semibold text-rose-600">Anulada · NC {notasDe(f, notas).map(docDe).join(", ")}</span> : null}
      </span>
    ),
  };
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

  const tab = (v: "pendientes" | "depositadas" | "lotes", txt: string, n: number) => (
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
        <StatCard label="Total detracciones" value={soles(sumaSoles(sujetas.filter((f) => !anuladasSinDepositar.includes(f)), aDepositarSoles))} icon={Landmark} tone="gray" hint={`${sujetas.length - anuladasSinDepositar.length} factura(s)${anuladasSinDepositar.length ? ` · ${anuladasSinDepositar.length} anulada(s) con NC no se depositan` : ""}`} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tab("pendientes", "Por depositar", pendientes.length)}
        {tab("depositadas", "Depositadas", depositadas.length)}
        {tab("lotes", "Archivos de pago", lotes.length)}
        <button onClick={() => setGenerar(true)} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600">
          <FileText size={16} /> Generar archivo de pago (TXT)
        </button>
        <span className="ml-auto text-xs text-slate-400">
          Por norma la deposita el cliente; si el cliente pagó el total, nos toca a nosotros. Se define al registrar el cobro en{" "}
          <Link href="/cobranzas" className="font-semibold text-brand-600 hover:text-brand-700">Cobranzas</Link>.
        </span>
      </div>

      {vista === "lotes" ? (
        <LotesTabla lotes={lotes} onChanged={async () => { await cargarLotes(); await reload(); }} />
      ) : (
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
      )}

      {generar ? (
        <GenerarLoteModal
          candidatas={pendientes.filter((f) => !f.detraccionLote)}
          onClose={() => setGenerar(false)}
          onDone={async () => { setGenerar(false); setVista("lotes"); await cargarLotes(); await reload(); }}
        />
      ) : null}
      {sel ? <DetraccionModal f={sel} todas={sujetas} notasCredito={notasDe(sel, notas).map(docDe)} anulada={anulada(sel)} onClose={() => setSelId(null)} onChanged={reload} /> : null}
    </div>
  );
}

function Dato({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm"><span className="text-slate-500">{k}</span><span className="text-right font-medium text-slate-800">{v}</span></div>;
}

function DetraccionModal({ f, todas, notasCredito, anulada, onClose, onChanged }: { f: Factura; todas: Factura[]; notasCredito: string[]; anulada: boolean; onClose: () => void; onChanged: () => Promise<void> | void }) {
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
          {anulada ? (
            <div className="mb-2 mt-1 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Factura anulada con la nota de crédito <b>{notasCredito.join(", ")}</b>.{" "}
              {depositada ? "La detracción ya se había depositado: corresponde solicitar su devolución o aplicarla a otra factura." : "No se deposita su detracción."}
            </div>
          ) : null}
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

// Archivos planos de pago masivo ya generados (como el historial de lotes de la otra herramienta).
function LotesTabla({ lotes, onChanged }: { lotes: DetraccionLote[]; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState("");
  async function bajar(l: DetraccionLote) {
    setBusy(l.id);
    try { const a = await apiDetracciones.archivo(l.id); downloadBase64(a.nombre, a.mime, a.base64); }
    catch (e) { alert((e as Error).message || "No se pudo descargar el archivo."); }
    finally { setBusy(""); }
  }
  async function eliminar(l: DetraccionLote) {
    if (!confirm(`¿Eliminar el archivo ${l.numero}? Sus ${l.cantidad} factura(s) vuelven a quedar disponibles para otro archivo. Hazlo solo si NO lo subiste a SUNAT.`)) return;
    setBusy(l.id);
    try { await apiDetracciones.eliminar(l.id); await onChanged(); }
    catch (e) { alert((e as Error).message || "No se pudo eliminar el archivo."); }
    finally { setBusy(""); }
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[620px] text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr><th className="px-4 py-3 text-left font-semibold">N° de lote</th><th className="px-4 py-3 text-left font-semibold">Generado</th><th className="px-4 py-3 text-right font-semibold">Facturas</th><th className="px-4 py-3 text-right font-semibold">Total</th><th className="px-4 py-3 text-right font-semibold">Opciones</th></tr>
        </thead>
        <tbody>
          {lotes.length ? lotes.map((l) => (
            <tr key={l.id} className="border-t border-slate-100">
              <td className="px-4 py-3 font-semibold tabular text-slate-900">{l.numero}</td>
              <td className="px-4 py-3 tabular">{fecha(l.createdAt)}</td>
              <td className="px-4 py-3 text-right tabular">{l.cantidad}</td>
              <td className="px-4 py-3 text-right font-semibold tabular">{soles(l.total)}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-1.5">
                  <button disabled={!!busy} onClick={() => bajar(l)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600 disabled:opacity-50"><FileDown size={14} /> Descargar</button>
                  <button disabled={!!busy} onClick={() => eliminar(l)} title="Eliminar (solo si no se subió a SUNAT)" className="rounded-lg border border-slate-300 p-1.5 text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          )) : (
            <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Aún no se generaron archivos de pago.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// Arma el archivo plano de SUNAT con las detracciones elegidas. Por defecto se marcan las que
// nos toca depositar a nosotros (el cliente nos pagó el total).
function GenerarLoteModal({ candidatas, onClose, onDone }: { candidatas: Factura[]; onClose: () => void; onDone: () => Promise<void> }) {
  const [numero, setNumero] = useState("");
  const [sel, setSel] = useState<Set<string>>(() => new Set(candidatas.filter((f) => responsableDe(f) === "Empresa").map((f) => f.id)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { apiDetracciones.siguiente().then((r) => setNumero(r.numero)).catch(() => {}); }, []);

  const elegidas = candidatas.filter((f) => sel.has(f.id));
  const sinTc = elegidas.filter((f) => aDepositarSoles(f) === null);
  const total = sumaSoles(elegidas, aDepositarSoles);
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  async function generarArchivo() {
    setError("");
    if (!/^\d{6}$/.test(numero)) { setError("El número de lote son 6 dígitos: año + correlativo (p. ej. 202623)."); return; }
    if (!elegidas.length) { setError("Elige al menos una factura."); return; }
    setBusy(true);
    try {
      const r = await apiDetracciones.generar(numero, elegidas.map((f) => f.id));
      downloadBase64(r.nombre, r.mime, r.base64);
      await onDone();
    } catch (e) {
      setError((e as Error).message || "No se pudo generar el archivo.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-6" onClick={onClose}>
      <div className="mt-8 w-full max-w-3xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Archivo de pago masivo de detracciones</h2>
            <p className="mt-0.5 text-sm text-slate-500">Genera el TXT con el formato de SUNAT para pagar varias detracciones de una vez (SUNAT Operaciones en Línea → pago masivo de detracciones).</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="space-y-4 px-6 py-4 text-sm">
          <label className="block max-w-xs">
            <span className="mb-1 block font-medium text-slate-700">N° de lote</span>
            <input value={numero} onChange={(e) => setNumero(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="202623" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular outline-none focus:border-brand-500" />
            <span className="mt-1 block text-xs text-slate-400">Año + correlativo de 2 dígitos. Debe seguir al último que subieron a SUNAT.</span>
          </label>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[600px]">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr><th className="w-10 px-3 py-2 text-center"><input type="checkbox" title="Marcar todas" checked={candidatas.length > 0 && elegidas.length === candidatas.length} onChange={(e) => setSel(new Set(e.target.checked ? candidatas.map((f) => f.id) : []))} /></th><th className="px-3 py-2 text-left font-semibold">Comprobante</th><th className="px-3 py-2 text-left font-semibold">Cliente</th><th className="px-3 py-2 text-left font-semibold">Le corresponde</th><th className="px-3 py-2 text-right font-semibold">A depositar</th></tr>
              </thead>
              <tbody>
                {candidatas.length ? candidatas.map((f) => (
                  <tr key={f.id} onClick={() => toggle(f.id)} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-center"><input type="checkbox" checked={sel.has(f.id)} onChange={() => toggle(f.id)} onClick={(e) => e.stopPropagation()} /></td>
                    <td className="px-3 py-2 font-semibold tabular">{doc(f)}</td>
                    <td className="px-3 py-2"><span className="block max-w-[220px] truncate" title={f.cliente}>{f.cliente}</span><span className="text-xs tabular text-slate-400">{f.ruc}</span></td>
                    <td className="px-3 py-2"><BadgeResponsable f={f} /></td>
                    <td className="px-3 py-2 text-right font-semibold tabular">{aDepositarSoles(f) === null ? <span className="text-amber-600">sin T.C.</span> : soles(aDepositarSoles(f)!)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">No hay detracciones por depositar que no estén ya en un archivo.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-slate-600">{elegidas.length} factura(s) elegida(s)</span>
            <span className="font-bold tabular text-slate-900">Total a depositar: {soles(total)}</span>
          </div>
          {sinTc.length ? <p className="text-xs text-amber-700">Hay facturas en dólares sin tipo de cambio ({sinTc.map(doc).join(", ")}): no se pueden incluir.</p> : null}
          <p className="text-xs text-slate-400">Al generarlo, las facturas quedan marcadas &quot;En archivo&quot; para no pagarlas dos veces. Cuando SUNAT confirme el pago, registra en cada una el N° de constancia (botón Registrar).</p>
          {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">{error}</div> : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={generarArchivo} disabled={busy || !elegidas.length || sinTc.length > 0} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"><FileDown size={15} /> {busy ? "Generando…" : "Generar y descargar TXT"}</button>
        </div>
      </div>
    </div>
  );
}
