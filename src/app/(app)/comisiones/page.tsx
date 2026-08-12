"use client";

import { useEffect, useState } from "react";
import { Coins, Wallet, Users, Check, ChevronDown, ChevronRight, Plus, Trash2, Save, FileText } from "lucide-react";
import { PageHeader, StatCard, Card, Badge } from "@/components/ui";
import { apiComisiones, type Tarifa, type ResumenChofer } from "@/lib/api";
import { exportPDF } from "@/lib/export";
import { soles, fecha } from "@/lib/format";

export default function ComisionesPage() {
  const [resumen, setResumen] = useState<ResumenChofer[]>([]);
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [edits, setEdits] = useState<Record<string, { gral: number; imo: number; reefer: number }>>({});
  const [abierto, setAbierto] = useState<string | null>(null);
  const [tab, setTab] = useState<"pendientes" | "tarifario">("pendientes");
  const [nuevo, setNuevo] = useState({ destino: "", gral: "", imo: "", reefer: "" });
  const [busy, setBusy] = useState(false);

  function cargar() {
    apiComisiones.resumen().then(setResumen).catch(() => setResumen([]));
    apiComisiones.tarifario().then((t) => {
      setTarifas(t);
      setEdits(Object.fromEntries(t.map((x) => [x.id, { gral: x.gral, imo: x.imo, reefer: x.reefer }])));
    }).catch(() => setTarifas([]));
  }
  useEffect(() => { cargar(); }, []);

  const totalPendiente = resumen.reduce((s, r) => s + r.pendiente, 0);
  const totalPagado = resumen.reduce((s, r) => s + r.pagado, 0);

  function liquidacionPDF(r: ResumenChofer) {
    const headers = ["Fecha", "Viaje", "Origen", "Destino", "Tipo carga", "Monto", "Estado"];
    const rows: (string | number)[][] = r.viajes.map((v) => [
      fecha((v.createdAt || "").slice(0, 10)), v.codigo || "—", v.origen || "—", v.destino || "—", v.tipoCarga || "—", soles(v.comisionChofer), v.comisionPagada ? "Pagado" : "Pendiente",
    ]);
    rows.push(["", "", "", "", "TOTAL", soles(r.pendiente + r.pagado), ""]);
    exportPDF(`Liquidación de comisiones — ${r.conductor}`, headers, rows, `Pendiente ${soles(r.pendiente)} · Pagado ${soles(r.pagado)}`);
  }

  async function pagarChofer(conductor: string) {
    if (!confirm(`¿Marcar como pagadas todas las comisiones pendientes de ${conductor}?`)) return;
    setBusy(true);
    try { await apiComisiones.pagarConductor(conductor); cargar(); } finally { setBusy(false); }
  }
  async function pagarViaje(id: string) {
    setBusy(true);
    try { await apiComisiones.pagarViaje(id); cargar(); } finally { setBusy(false); }
  }
  async function guardarTarifa(id: string) {
    setBusy(true);
    try { await apiComisiones.actualizarTarifa(id, edits[id]); cargar(); } finally { setBusy(false); }
  }
  async function agregarTarifa(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevo.destino.trim()) return;
    setBusy(true);
    try {
      await apiComisiones.crearTarifa({ destino: nuevo.destino.trim().toUpperCase(), gral: Number(nuevo.gral || 0), imo: Number(nuevo.imo || 0), reefer: Number(nuevo.reefer || 0) });
      setNuevo({ destino: "", gral: "", imo: "", reefer: "" });
      cargar();
    } finally { setBusy(false); }
  }
  async function borrarTarifa(id: string, destino: string) {
    if (!confirm(`¿Eliminar la tarifa de ${destino}?`)) return;
    setBusy(true);
    try { await apiComisiones.borrarTarifa(id); cargar(); } finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader modulo="11" title="Comisiones / Bonos de choferes" subtitle="Bono automático por destino y tipo de carga al generar cada viaje. Separado de la planilla de sueldos." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Pendiente por pagar" value={soles(totalPendiente)} icon={Wallet} tone="amber" hint="todos los choferes" />
        <StatCard label="Pagado" value={soles(totalPagado)} icon={Check} tone="green" />
        <StatCard label="Choferes con comisiones" value={resumen.length} icon={Users} tone="blue" />
      </div>

      <div className="mb-4 flex gap-2">
        <button onClick={() => setTab("pendientes")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === "pendientes" ? "bg-brand-500 text-white" : "border border-slate-300 bg-white text-slate-600"}`}>Pendientes por chofer</button>
        <button onClick={() => setTab("tarifario")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === "tarifario" ? "bg-brand-500 text-white" : "border border-slate-300 bg-white text-slate-600"}`}>Tarifario (bonos)</button>
      </div>

      {tab === "pendientes" ? (
        <div className="space-y-3">
          {resumen.length === 0 ? <Card className="p-8 text-center text-sm text-slate-400">Aún no hay comisiones registradas.</Card> : null}
          {resumen.map((r) => (
            <Card key={r.conductor} className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <button onClick={() => setAbierto(abierto === r.conductor ? null : r.conductor)} className="flex items-center gap-2 text-left">
                  {abierto === r.conductor ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-steel-600 text-xs font-bold text-white">
                    {r.conductor.split(" ").slice(0, 2).map((s) => s[0]).join("")}
                  </span>
                  <span>
                    <span className="block font-semibold text-slate-800">{r.conductor}</span>
                    <span className="block text-xs text-slate-400">{r.viajes.length} viaje(s) con bono</span>
                  </span>
                </button>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Pendiente</div>
                    <div className="text-lg font-extrabold tabular text-amber-600">{soles(r.pendiente)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Pagado</div>
                    <div className="text-sm font-semibold tabular text-emerald-600">{soles(r.pagado)}</div>
                  </div>
                  <button onClick={() => liquidacionPDF(r)} title="Descargar liquidación (PDF)"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600">
                    <FileText size={14} /> PDF
                  </button>
                  <button disabled={busy || r.pendiente <= 0} onClick={() => pagarChofer(r.conductor)}
                    className="rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-40">
                    Pagar pendiente
                  </button>
                </div>
              </div>

              {abierto === r.conductor ? (
                <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wide text-slate-400">
                        <th className="py-1.5">Viaje</th><th>Destino</th><th>Carga</th><th className="text-right">Bono</th><th>Estado</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.viajes.map((v) => (
                        <tr key={v.id} className="border-t border-slate-100">
                          <td className="py-2 font-medium text-slate-700">{v.codigo || "—"}</td>
                          <td className="text-slate-600">{v.destino}</td>
                          <td>{v.tipoCarga}</td>
                          <td className="tabular text-right font-medium">{soles(v.comisionChofer)}</td>
                          <td>{v.comisionPagada ? <Badge tone="green">Pagado {v.comisionFechaPago ? `· ${fecha(v.comisionFechaPago)}` : ""}</Badge> : <Badge tone="amber">Pendiente</Badge>}</td>
                          <td className="text-right">{!v.comisionPagada ? <button disabled={busy} onClick={() => pagarViaje(v.id)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600">Pagar</button> : null}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      ) : (
        <div>
          <form onSubmit={agregarTarifa} className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
            <div><label className="mb-1 block text-xs font-medium text-slate-500">Distrito</label><input value={nuevo.destino} onChange={(e) => setNuevo({ ...nuevo, destino: e.target.value })} placeholder="Ej. SURCO" className="w-44 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" /></div>
            <div><label className="mb-1 block text-xs font-medium text-slate-500">GRAL</label><input type="number" value={nuevo.gral} onChange={(e) => setNuevo({ ...nuevo, gral: e.target.value })} className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" /></div>
            <div><label className="mb-1 block text-xs font-medium text-slate-500">IMO</label><input type="number" value={nuevo.imo} onChange={(e) => setNuevo({ ...nuevo, imo: e.target.value })} className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" /></div>
            <div><label className="mb-1 block text-xs font-medium text-slate-500">REEFER</label><input type="number" value={nuevo.reefer} onChange={(e) => setNuevo({ ...nuevo, reefer: e.target.value })} className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" /></div>
            <button type="submit" disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"><Plus size={15} /> Agregar</button>
          </form>

          <Card className="overflow-hidden">
            <div className="max-h-[560px] overflow-y-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="sticky top-0">
                  <tr>
                    {["Distrito", "GRAL", "IMO", "REEFER", ""].map((h, i) => (
                      <th key={i} className={`whitespace-nowrap border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${i > 0 && i < 4 ? "text-right" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tarifas.map((t) => {
                    const e = edits[t.id] ?? { gral: t.gral, imo: t.imo, reefer: t.reefer };
                    const changed = e.gral !== t.gral || e.imo !== t.imo || e.reefer !== t.reefer;
                    const setF = (k: "gral" | "imo" | "reefer", v: string) => setEdits((s) => ({ ...s, [t.id]: { ...e, [k]: Number(v || 0) } }));
                    return (
                      <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                        <td className="px-4 py-2 font-medium text-slate-800">{t.destino}</td>
                        {(["gral", "imo", "reefer"] as const).map((k) => (
                          <td key={k} className="px-4 py-2 text-right">
                            <input type="number" value={e[k]} onChange={(ev) => setF(k, ev.target.value)} className="w-20 rounded-md border border-slate-200 px-2 py-1 text-right text-sm tabular outline-none focus:border-brand-500" />
                          </td>
                        ))}
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end gap-1.5">
                            <button disabled={busy || !changed} onClick={() => guardarTarifa(t.id)} title="Guardar" className="rounded-md p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-30"><Save size={15} /></button>
                            <button disabled={busy} onClick={() => borrarTarifa(t.id, t.destino)} title="Eliminar" className="rounded-md p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400"><Coins size={12} /> Estos montos se aplican automáticamente como bono al chofer cuando el destino y tipo de carga del viaje coinciden.</p>
        </div>
      )}
    </div>
  );
}
