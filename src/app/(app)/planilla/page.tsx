"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus, Users, Settings2, ArrowLeft, Trash2, Save, FileText, Check, CalendarDays, Coins, RefreshCw, FileCheck2, Undo2,
} from "lucide-react";
import { PageHeader, StatCard, Card, Badge } from "@/components/ui";
import { FormModal, type Field, type FormValues } from "@/components/FormModal";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { apiPlanillas, type Planilla, type PlanillaLinea } from "@/lib/api";
import { soles, fecha, hoyPeru } from "@/lib/format";
import { planillaPDF } from "@/lib/planilla-pdf";

// Lunes y sábado de la semana actual (la semana cierra el sábado).
function isoAdd(iso: string, days: number) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function semanaActual() {
  const hoy = hoyPeru(); // "YYYY-MM-DD" en Perú
  const day = new Date(hoy + "T12:00:00Z").getUTCDay(); // 0 dom … 6 sáb
  const lunes = isoAdd(hoy, day === 0 ? -6 : 1 - day);
  return { desde: lunes, hasta: isoAdd(lunes, 5) };
}

type Draft = { lineas: PlanillaLinea[]; descuentoPlanilla: number };

const num = (v: string) => Number(v.replace(",", ".") || 0);
// Muestra vacío cuando el valor es 0, para que no aparezca el "0" antes del número.
const dv = (n: number) => (n ? String(n) : "");
// Color del estado: Borrador (ámbar) · Generada (azul) · Pagada (verde).
const toneEstado = (e: string): "green" | "blue" | "amber" => (e === "Pagada" ? "green" : e === "Generada" ? "blue" : "amber");

export default function PlanillaPage() {
  const { conductores } = useData();
  const { user } = useAuth();
  const [planillas, setPlanillas] = useState<Planilla[]>([]);
  const [sueldoDia, setSueldoDia] = useState(0);
  const [sel, setSel] = useState<Planilla | null>(null);
  const [draft, setDraft] = useState<Draft>({ lineas: [], descuentoPlanilla: 0 });
  const [openGen, setOpenGen] = useState(false);
  const [openCfg, setOpenCfg] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"pendientes" | "pagadas">("pendientes");

  function cargar() {
    apiPlanillas.list().then(setPlanillas).catch(() => setPlanillas([]));
    apiPlanillas.config().then((c) => setSueldoDia(c.sueldoDia)).catch(() => setSueldoDia(0));
  }
  useEffect(() => { cargar(); }, []);

  function abrir(p: Planilla) {
    setSel(p);
    setDraft({ lineas: p.lineas.map((l) => ({ ...l })), descuentoPlanilla: p.descuentoPlanilla });
  }

  const esBorrador = sel?.estado === "Borrador";
  const esGenerada = sel?.estado === "Generada";
  // Solo se editan líneas en Borrador; Generada y Pagada quedan bloqueadas.
  const bloqueada = !esBorrador;

  const totales = useMemo(() => {
    const totalSueldo = draft.lineas.reduce((s, l) => s + (l.sueldoDia || 0), 0);
    const totalComision = draft.lineas.reduce((s, l) => s + (l.comision || 0), 0);
    const totalViaticos = draft.lineas.reduce((s, l) => s + (l.viaticos || 0), 0);
    const totalPagar = totalSueldo + totalComision + totalViaticos;
    return { totalSueldo, totalComision, totalViaticos, totalPagar, aDepositar: totalPagar - draft.descuentoPlanilla };
  }, [draft]);

  // --- Acciones de lista ---
  const genFields: Field[] = [
    { name: "conductor", label: "Conductor", type: "select", options: conductores.map((c) => c.nombre), full: true },
    { name: "semanaDesde", label: "Semana desde (lunes)", type: "date", default: semanaActual().desde, required: true },
    { name: "semanaHasta", label: "Semana hasta (sábado)", type: "date", default: semanaActual().hasta, required: true },
  ];
  async function generar(v: FormValues) {
    if (!String(v.conductor)) return;
    setBusy(true);
    try {
      const p = await apiPlanillas.generar({ conductor: String(v.conductor), semanaDesde: String(v.semanaDesde), semanaHasta: String(v.semanaHasta) });
      // Puede devolver un borrador existente (mismo id): actualizarlo en la lista, no duplicar.
      setPlanillas((s) => (s.some((x) => x.id === p.id) ? s.map((x) => (x.id === p.id ? p : x)) : [p, ...s]));
      abrir(p);
    } catch (e) { alert((e as Error).message || "No se pudo generar la planilla."); }
    finally { setBusy(false); }
  }

  async function guardarConfig(v: FormValues) {
    const val = Number(v.sueldoDia);
    setBusy(true);
    try { const r = await apiPlanillas.setConfig(val); setSueldoDia(r.sueldoDia); }
    finally { setBusy(false); }
  }

  // --- Acciones de editor ---
  function setLinea(i: number, patch: Partial<PlanillaLinea>) {
    setDraft((d) => ({ ...d, lineas: d.lineas.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));
  }
  function agregarLinea() {
    setDraft((d) => ({
      ...d,
      lineas: [...d.lineas, { fecha: sel!.semanaDesde, cliente: "", origen: "", destino: "", sueldoDia: 0, comision: 0, viaticos: 0, concepto: "", viajeId: "", orden: d.lineas.length }],
    }));
  }
  function quitarLinea(i: number) {
    setDraft((d) => ({ ...d, lineas: d.lineas.filter((_, j) => j !== i) }));
  }

  async function guardar() {
    if (!sel) return;
    setBusy(true);
    try {
      const lineas = draft.lineas.map((l, i) => ({
        fecha: l.fecha, cliente: l.cliente, origen: l.origen, destino: l.destino,
        sueldoDia: l.sueldoDia, comision: l.comision, viaticos: l.viaticos,
        concepto: l.concepto, viajeId: l.viajeId, orden: i,
      }));
      const p = await apiPlanillas.update(sel.id, { descuentoPlanilla: draft.descuentoPlanilla, lineas });
      setPlanillas((s) => s.map((x) => (x.id === p.id ? p : x)));
      setSel(p);
      setDraft({ lineas: p.lineas.map((l) => ({ ...l })), descuentoPlanilla: p.descuentoPlanilla });
    } catch (e) { alert((e as Error).message || "No se pudo guardar."); }
    finally { setBusy(false); }
  }
  async function pagar() {
    if (!sel || !confirm(`¿Marcar como PAGADA la planilla de ${sel.conductor}? Ya no podrá editarse.`)) return;
    setBusy(true);
    try { const p = await apiPlanillas.pagar(sel.id); setPlanillas((s) => s.map((x) => (x.id === p.id ? p : x))); setSel(p); }
    finally { setBusy(false); }
  }

  // Líneas del draft en el formato que espera el backend.
  function lineasPayload() {
    return draft.lineas.map((l, i) => ({
      fecha: l.fecha, cliente: l.cliente, origen: l.origen, destino: l.destino,
      sueldoDia: l.sueldoDia, comision: l.comision, viaticos: l.viaticos,
      concepto: l.concepto, viajeId: l.viajeId, orden: i,
    }));
  }
  function aplicar(p: Planilla) {
    setPlanillas((s) => s.map((x) => (x.id === p.id ? p : x)));
    setSel(p);
    setDraft({ lineas: p.lineas.map((l) => ({ ...l })), descuentoPlanilla: p.descuentoPlanilla });
  }

  // Viernes: finaliza la semana (guarda + pasa a "Generada"). Queda lista para imprimir y pagar.
  async function finalizar() {
    if (!sel || !confirm(`¿Finalizar la planilla de ${sel.conductor}? Quedará lista para imprimir y pagar; para editarla de nuevo tendrás que reabrirla.`)) return;
    setBusy(true);
    try { aplicar(await apiPlanillas.update(sel.id, { descuentoPlanilla: draft.descuentoPlanilla, lineas: lineasPayload(), estado: "Generada" })); }
    catch (e) { alert((e as Error).message || "No se pudo finalizar."); }
    finally { setBusy(false); }
  }
  // Vuelve una planilla finalizada a Borrador para poder editarla otra vez.
  async function reabrir() {
    if (!sel) return;
    setBusy(true);
    try { aplicar(await apiPlanillas.update(sel.id, { estado: "Borrador" })); }
    catch (e) { alert((e as Error).message || "No se pudo reabrir."); }
    finally { setBusy(false); }
  }
  // Guarda lo actual y agrega al borrador los viajes nuevos de la semana (sin borrar lo editado).
  async function traerViajes() {
    if (!sel) return;
    setBusy(true);
    try {
      await apiPlanillas.update(sel.id, { descuentoPlanilla: draft.descuentoPlanilla, lineas: lineasPayload() });
      aplicar(await apiPlanillas.generar({ conductor: sel.conductor, semanaDesde: sel.semanaDesde, semanaHasta: sel.semanaHasta }));
    } catch (e) { alert((e as Error).message || "No se pudieron traer los viajes."); }
    finally { setBusy(false); }
  }
  async function eliminar() {
    if (!sel || !confirm(`¿Eliminar la planilla de ${sel.conductor}?`)) return;
    setBusy(true);
    try { await apiPlanillas.remove(sel.id); setPlanillas((s) => s.filter((x) => x.id !== sel.id)); setSel(null); }
    finally { setBusy(false); }
  }
  // Corrige un error: una planilla pagada vuelve a Borrador y libera sus comisiones.
  async function reversar() {
    if (!sel || !confirm(`¿Reversar el pago de la planilla de ${sel.conductor}? Volverá a Borrador y sus comisiones quedarán otra vez pendientes.`)) return;
    setBusy(true);
    try { aplicar(await apiPlanillas.reversar(sel.id)); }
    catch (e) { alert((e as Error).message || "No se pudo reversar."); }
    finally { setBusy(false); }
  }

  function descargarPDF() {
    if (!sel) return;
    planillaPDF({
      conductor: sel.conductor,
      folio: "PL-" + sel.id.replace(/-/g, "").slice(-6).toUpperCase(),
      semanaDesde: sel.semanaDesde,
      semanaHasta: sel.semanaHasta,
      estado: sel.estado,
      lineas: draft.lineas.map((l) => ({
        fecha: l.fecha, cliente: l.cliente, origen: l.origen, destino: l.destino,
        concepto: l.concepto, sueldoDia: l.sueldoDia, comision: l.comision, viaticos: l.viaticos,
      })),
      totalSueldo: totales.totalSueldo,
      totalComision: totales.totalComision,
      totalViaticos: totales.totalViaticos,
      totalPagar: totales.totalPagar,
      descuentoPlanilla: draft.descuentoPlanilla,
      aDepositar: totales.aDepositar,
      empresa: user?.sede ? { nombre: user.sede.nombre, ruc: user.sede.ruc, codigo: user.sede.codigo } : undefined,
    });
  }

  // ============ EDITOR ============
  if (sel) {
    return (
      <div>
        <button onClick={() => setSel(null)} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600">
          <ArrowLeft size={16} /> Volver a planillas
        </button>

        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{sel.conductor}</h1>
              <Badge tone={toneEstado(sel.estado)}>{sel.estado}</Badge>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
              <CalendarDays size={15} /> Semana del {fecha(sel.semanaDesde)} al {fecha(sel.semanaHasta)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={descargarPDF} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600">
              <FileText size={15} /> PDF
            </button>
            {esBorrador ? (
              <>
                <button disabled={busy} onClick={traerViajes} title="Guardar y traer los viajes nuevos de la semana" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600 disabled:opacity-50">
                  <RefreshCw size={15} /> Traer viajes
                </button>
                <button disabled={busy} onClick={guardar} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50">
                  <Save size={15} /> Guardar
                </button>
                <button disabled={busy} onClick={finalizar} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
                  <FileCheck2 size={15} /> Finalizar
                </button>
                <button disabled={busy} onClick={eliminar} title="Eliminar planilla" className="rounded-lg border border-slate-300 bg-white p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50">
                  <Trash2 size={15} />
                </button>
              </>
            ) : esGenerada ? (
              <>
                <button disabled={busy} onClick={reabrir} title="Volver a borrador para editar" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600 disabled:opacity-50">
                  <Undo2 size={15} /> Reabrir
                </button>
                <button disabled={busy} onClick={pagar} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
                  <Check size={15} /> Marcar pagada
                </button>
              </>
            ) : (
              <button disabled={busy} onClick={reversar} title="Corregir un error: vuelve a borrador y libera las comisiones" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50">
                <Undo2 size={15} /> Reversar
              </button>
            )}
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="border-b border-slate-200 bg-slate-50/80 px-3 py-3">Fecha</th>
                  <th className="border-b border-slate-200 bg-slate-50/80 px-3 py-3">Cliente</th>
                  <th className="border-b border-slate-200 bg-slate-50/80 px-3 py-3">Origen</th>
                  <th className="border-b border-slate-200 bg-slate-50/80 px-3 py-3">Destino</th>
                  <th className="border-b border-slate-200 bg-slate-50/80 px-3 py-3">Concepto</th>
                  <th className="border-b border-slate-200 bg-slate-50/80 px-3 py-3 text-right">Sueldo/día</th>
                  <th className="border-b border-slate-200 bg-slate-50/80 px-3 py-3 text-right">Comisión</th>
                  <th className="border-b border-slate-200 bg-slate-50/80 px-3 py-3 text-right">Viáticos</th>
                  <th className="border-b border-slate-200 bg-slate-50/80 px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {draft.lineas.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">Sin líneas. Agrega una línea manual o genera desde otra semana.</td></tr>
                ) : null}
                {draft.lineas.map((l, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="px-3 py-2">
                      <input type="date" disabled={bloqueada} value={l.fecha} onChange={(e) => setLinea(i, { fecha: e.target.value })}
                        className="w-36 rounded-md border border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand-500 disabled:bg-slate-50" />
                    </td>
                    <td className="px-3 py-2"><input disabled={bloqueada} value={l.cliente} onChange={(e) => setLinea(i, { cliente: e.target.value })} className="w-32 rounded-md border border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand-500 disabled:bg-slate-50" /></td>
                    <td className="px-3 py-2"><input disabled={bloqueada} value={l.origen} onChange={(e) => setLinea(i, { origen: e.target.value })} className="w-28 rounded-md border border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand-500 disabled:bg-slate-50" /></td>
                    <td className="px-3 py-2"><input disabled={bloqueada} value={l.destino} onChange={(e) => setLinea(i, { destino: e.target.value })} className="w-32 rounded-md border border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand-500 disabled:bg-slate-50" /></td>
                    <td className="px-3 py-2"><input disabled={bloqueada} value={l.concepto} placeholder="Mantenimiento…" onChange={(e) => setLinea(i, { concepto: e.target.value })} className="w-32 rounded-md border border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand-500 disabled:bg-slate-50" /></td>
                    <td className="px-3 py-2 text-right"><input type="number" step="any" min="0" disabled={bloqueada} value={dv(l.sueldoDia)} onChange={(e) => setLinea(i, { sueldoDia: num(e.target.value) })} className="w-24 rounded-md border border-slate-200 px-2 py-1 text-right text-sm tabular outline-none focus:border-brand-500 disabled:bg-slate-50" /></td>
                    <td className="px-3 py-2 text-right"><input type="number" step="any" min="0" disabled={bloqueada} value={dv(l.comision)} onChange={(e) => setLinea(i, { comision: num(e.target.value) })} className="w-24 rounded-md border border-slate-200 px-2 py-1 text-right text-sm tabular outline-none focus:border-brand-500 disabled:bg-slate-50" /></td>
                    <td className="px-3 py-2 text-right"><input type="number" step="any" min="0" disabled={bloqueada} value={dv(l.viaticos)} onChange={(e) => setLinea(i, { viaticos: num(e.target.value) })} className="w-24 rounded-md border border-slate-200 px-2 py-1 text-right text-sm tabular outline-none focus:border-brand-500 disabled:bg-slate-50" /></td>
                    <td className="px-3 py-2 text-right">{!bloqueada ? <button onClick={() => quitarLinea(i)} title="Quitar línea" className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button> : null}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50/80 font-semibold text-slate-800">
                  <td className="px-3 py-2.5" colSpan={5}>Totales</td>
                  <td className="px-3 py-2.5 text-right tabular">{soles(totales.totalSueldo)}</td>
                  <td className="px-3 py-2.5 text-right tabular">{soles(totales.totalComision)}</td>
                  <td className="px-3 py-2.5 text-right tabular">{soles(totales.totalViaticos)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          {!bloqueada ? (
            <div className="border-t border-slate-100 p-3">
              <button onClick={agregarLinea} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600">
                <Plus size={15} /> Agregar línea manual
              </button>
            </div>
          ) : null}
        </Card>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Resumen de la semana</div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Sueldo (días trabajados)</span><span className="tabular font-medium">{soles(totales.totalSueldo)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Comisiones / bonos</span><span className="tabular font-medium text-emerald-600">{soles(totales.totalComision)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Viáticos</span><span className="tabular font-medium">{soles(totales.totalViaticos)}</span></div>
              <div className="flex justify-between border-t border-slate-100 pt-2"><span className="font-semibold text-slate-700">Total a pagar</span><span className="tabular font-bold">{soles(totales.totalPagar)}</span></div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Descuento de planilla (cuota semanal)</span>
                <span className="flex items-center gap-1 text-rose-500">−
                  <input type="number" step="any" min="0" disabled={bloqueada} value={dv(draft.descuentoPlanilla)}
                    onChange={(e) => setDraft((d) => ({ ...d, descuentoPlanilla: num(e.target.value) }))}
                    className="w-28 rounded-md border border-slate-200 px-2 py-1 text-right text-sm tabular outline-none focus:border-brand-500 disabled:bg-slate-50" />
                </span>
              </div>
            </div>
          </Card>
          <Card className="flex flex-col justify-center bg-brand-50/40 p-5 ring-1 ring-brand-100">
            <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">A depositar</div>
            <div className="mt-1 text-3xl font-extrabold tabular text-slate-900">{soles(totales.aDepositar)}</div>
            <div className="mt-1 text-xs text-slate-500">Total a pagar − descuento de planilla</div>
          </Card>
        </div>

        {openCfg ? (
          <FormModal open title="Configurar sueldo por día" subtitle="Valor único aplicado a todos los conductores por cada día trabajado."
            fields={[{ name: "sueldoDia", label: "Sueldo por día (S/)", type: "number", default: sueldoDia, full: true }]}
            submitLabel="Guardar" onSubmit={guardarConfig} onClose={() => setOpenCfg(false)} />
        ) : null}
      </div>
    );
  }

  // ============ LISTA ============
  const borradores = planillas.filter((p) => p.estado === "Borrador").length;
  const generadas = planillas.filter((p) => p.estado === "Generada").length;
  const pagadas = planillas.filter((p) => p.estado === "Pagada").length;
  // Pestañas: Pendientes (borrador + finalizadas, aún no pagadas) vs Pagadas.
  const pendientesCount = planillas.filter((p) => p.estado !== "Pagada").length;
  const visibles = planillas.filter((p) => (tab === "pagadas" ? p.estado === "Pagada" : p.estado !== "Pagada"));

  return (
    <div>
      <PageHeader modulo="10" title="Planilla semanal" subtitle="Planilla por conductor armada línea a línea desde sus viajes de la semana. Sueldo por día trabajado, comisiones automáticas y viáticos manuales." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Sueldo por día" value={soles(sueldoDia)} icon={Coins} tone="orange" hint="igual para todos" />
        <StatCard label="En borrador" value={borradores} icon={Users} tone="amber" />
        <StatCard label="Finalizadas" value={generadas} icon={FileCheck2} tone="blue" />
        <StatCard label="Pagadas" value={pagadas} icon={Check} tone="green" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button onClick={() => setOpenCfg(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600">
          <Settings2 size={16} /> Configurar sueldo/día
        </button>
        <button onClick={() => setOpenGen(true)} className="ml-auto inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
          <Plus size={16} /> Generar planilla
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["pendientes", "pagadas"] as const).map((t) => {
          const on = tab === t;
          const n = t === "pendientes" ? pendientesCount : pagadas;
          return (
            <button key={t} onClick={() => setTab(t)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${on ? "bg-brand-500 text-white" : "border border-slate-300 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-600"}`}>
              {t === "pendientes" ? "Pendientes" : "Pagadas"}
              <span className={`rounded-full px-1.5 text-xs ${on ? "bg-white/25" : "bg-slate-100 text-slate-500"}`}>{n}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {visibles.length === 0 ? (
          <Card className="p-10 text-center text-sm text-slate-400">{tab === "pagadas" ? "Aún no hay planillas pagadas." : "No hay planillas pendientes. Genera una con “Generar planilla”."}</Card>
        ) : null}
        {visibles.map((p) => (
          <Card key={p.id} className="flex flex-wrap items-center justify-between gap-4 p-4 transition hover:shadow-md">
            <button onClick={() => abrir(p)} className="flex items-center gap-3 text-left">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-steel-600 text-xs font-bold text-white">
                {p.conductor.split(" ").slice(0, 2).map((s) => s[0]).join("")}
              </span>
              <span>
                <span className="block font-semibold text-slate-800">{p.conductor}</span>
                <span className="block text-xs text-slate-400">Semana del {fecha(p.semanaDesde)} al {fecha(p.semanaHasta)} · {p.lineas.length} línea(s)</span>
              </span>
            </button>
            <div className="flex items-center gap-5">
              <div className="text-right">
                <div className="text-xs text-slate-400">A depositar</div>
                <div className="text-lg font-extrabold tabular text-slate-900">{soles(p.aDepositar)}</div>
              </div>
              <Badge tone={toneEstado(p.estado)}>{p.estado}</Badge>
              <button onClick={() => abrir(p)} className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600">Abrir</button>
            </div>
          </Card>
        ))}
      </div>

      <FormModal open={openGen} title="Generar planilla semanal" subtitle="Selecciona el conductor y la semana. Si ya hay un borrador de esa semana, se le agregan los viajes nuevos sin borrar lo editado."
        fields={genFields} submitLabel="Generar" onSubmit={generar} onClose={() => setOpenGen(false)} />

      {openCfg ? (
        <FormModal open title="Configurar sueldo por día" subtitle="Valor único aplicado a todos los conductores por cada día trabajado."
          fields={[{ name: "sueldoDia", label: "Sueldo por día (S/)", type: "number", default: sueldoDia, full: true }]}
          submitLabel="Guardar" onSubmit={guardarConfig} onClose={() => setOpenCfg(false)} />
      ) : null}
    </div>
  );
}
