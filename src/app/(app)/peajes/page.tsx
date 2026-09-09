"use client";

import { useEffect, useState } from "react";
import { Coins, Plus, Trash2, Save } from "lucide-react";
import { PageHeader, Card } from "@/components/ui";
import { apiPeajes, type Peaje } from "@/lib/api";
import { soles } from "@/lib/format";

export default function PeajesPage() {
  const [peajes, setPeajes] = useState<Peaje[]>([]);
  const [edits, setEdits] = useState<Record<string, { ejes: number; monto: number }>>({});
  const [nuevo, setNuevo] = useState({ destino: "", ejes: "", monto: "" });
  const [busy, setBusy] = useState(false);

  function cargar() {
    apiPeajes.list().then((ps) => {
      setPeajes(ps);
      setEdits(Object.fromEntries(ps.map((x) => [x.id, { ejes: x.ejes, monto: x.monto }])));
    }).catch(() => setPeajes([]));
  }
  useEffect(() => { cargar(); }, []);

  async function agregar(e: React.FormEvent) {
    e.preventDefault(); if (!nuevo.destino.trim()) return; setBusy(true);
    try {
      await apiPeajes.create({ destino: nuevo.destino.trim().toUpperCase(), ejes: Number(nuevo.ejes || 0), monto: Number(nuevo.monto || 0) });
      setNuevo({ destino: "", ejes: "", monto: "" }); cargar();
    } finally { setBusy(false); }
  }
  async function guardar(id: string) {
    setBusy(true);
    try { await apiPeajes.update(id, edits[id]); cargar(); } finally { setBusy(false); }
  }
  async function borrar(id: string, destino: string) {
    if (!confirm(`¿Eliminar el peaje de ${destino}?`)) return;
    setBusy(true);
    try { await apiPeajes.remove(id); cargar(); } finally { setBusy(false); }
  }

  const inp = "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500";
  const total = peajes.reduce((s, p) => s + p.monto, 0);

  return (
    <div>
      <PageHeader modulo="15" title="Peajes" subtitle="Costo del peaje por destino y número de ejes. Para editar, cambia el monto en la casilla y pulsa Guardar." />

      <Card className="flex flex-col p-5">
        <form onSubmit={agregar} className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3">
          <div className="flex-1 min-w-[200px]"><label className="mb-1 block text-xs font-medium text-slate-500">Destino</label><input value={nuevo.destino} onChange={(e) => setNuevo({ ...nuevo, destino: e.target.value })} placeholder="Ej. PISCO" className={`${inp} w-full`} /></div>
          <div><label className="mb-1 block text-xs font-medium text-slate-500">Ejes</label><input type="number" value={nuevo.ejes} onChange={(e) => setNuevo({ ...nuevo, ejes: e.target.value })} className={`${inp} w-24`} /></div>
          <div><label className="mb-1 block text-xs font-medium text-slate-500">Monto (S/)</label><input type="number" value={nuevo.monto} onChange={(e) => setNuevo({ ...nuevo, monto: e.target.value })} className={`${inp} w-28`} /></div>
          <button type="submit" disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"><Plus size={15} /> Agregar</button>
        </form>

        <div className="overflow-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="sticky top-0">
              <tr>
                {["Destino", "Ejes", "Monto", ""].map((h, i) => (
                  <th key={i} className={`whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 ${i > 0 && i < 3 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {peajes.length === 0 ? <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-400">Sin peajes. Agrega el primero.</td></tr> : null}
              {peajes.map((p) => {
                const e = edits[p.id] ?? { ejes: p.ejes, monto: p.monto };
                const changed = e.ejes !== p.ejes || e.monto !== p.monto;
                const setF = (k: "ejes" | "monto", v: string) => setEdits((s) => ({ ...s, [p.id]: { ...e, [k]: Number(v || 0) } }));
                return (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="px-3 py-2 font-medium text-slate-800">{p.destino}</td>
                    <td className="px-3 py-2 text-right"><input type="number" value={e.ejes} onChange={(ev) => setF("ejes", ev.target.value)} className={`w-16 rounded-md border px-2 py-1 text-right text-sm tabular outline-none focus:border-brand-500 ${changed ? "border-brand-400 bg-brand-50/40" : "border-slate-200"}`} /></td>
                    <td className="px-3 py-2 text-right"><input type="number" value={e.monto} onChange={(ev) => setF("monto", ev.target.value)} className={`w-24 rounded-md border px-2 py-1 text-right text-sm tabular outline-none focus:border-brand-500 ${changed ? "border-brand-400 bg-brand-50/40" : "border-slate-200"}`} /></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1.5">
                        {changed ? <button disabled={busy} onClick={() => guardar(p.id)} className="inline-flex items-center gap-1 rounded-md bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"><Save size={13} /> Guardar</button> : null}
                        <button disabled={busy} onClick={() => borrar(p.id, p.destino)} title="Eliminar" className="rounded-md p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400"><Coins size={12} /> {peajes.length} peaje(s) · monto acumulado {soles(total)}</div>
    </div>
  );
}
