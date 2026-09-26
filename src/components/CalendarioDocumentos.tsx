"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui";
import { estadoDocumento, fechaISO, hoyPeru } from "@/lib/format";

// Calendario de documentos: cada documento aparece en su fecha de vencimiento.
// Lo usan Conductores y Flota; cada pantalla dice cómo se llama cada dueño en el chip.

export interface DocumentoCalendario { tipo: string; numero?: string; vencimiento: string }

const DIAS_SEM = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const isoDe = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const chipDoc = (est: string) =>
  est === "Vencido" ? "bg-rose-50 text-rose-700 ring-rose-200"
  : est === "Por vencer" ? "bg-amber-50 text-amber-700 ring-amber-200"
  : "bg-emerald-50 text-emerald-700 ring-emerald-200";

export function CalendarioDocumentos<T>({ items, documentosDe, etiqueta, nombre, onAbrir, ayuda }: {
  items: T[];
  documentosDe: (x: T) => DocumentoCalendario[] | undefined;
  etiqueta: (x: T) => string; // texto corto en negrita dentro del chip (p. ej. el primer nombre o la placa)
  nombre: (x: T) => string; // nombre completo para el texto emergente
  onAbrir: (x: T) => void; // clic en un documento: abrir la gestión de documentos de su dueño
  ayuda: string; // qué pasa al hacer clic, para la leyenda
}) {
  const [mesRef, setMesRef] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  const porDia = useMemo(() => {
    const m: Record<string, { c: T; d: DocumentoCalendario; est: string }[]> = {};
    for (const c of items) for (const d of documentosDe(c) || []) {
      if (!d.vencimiento) continue;
      (m[fechaISO(d.vencimiento)] ||= []).push({ c, d, est: estadoDocumento(d.vencimiento) });
    }
    return m;
    // documentosDe se pasa en línea desde cada pantalla: solo interesa recalcular cuando cambian los datos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const dias = useMemo(() => {
    const first = new Date(mesRef.getFullYear(), mesRef.getMonth(), 1);
    const dow = (first.getDay() + 6) % 7; // 0 = lunes
    const diasMes = new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 0).getDate();
    const semanas = Math.ceil((dow + diasMes) / 7);
    const start = new Date(first); start.setDate(first.getDate() - dow);
    return Array.from({ length: semanas * 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [mesRef]);

  const hoy = hoyPeru();
  const titulo = (() => { const s = mesRef.toLocaleDateString("es-PE", { month: "long", year: "numeric" }); return s.charAt(0).toUpperCase() + s.slice(1); })();
  const delMes = dias.filter((d) => d.getMonth() === mesRef.getMonth()).reduce((n, d) => n + (porDia[isoDe(d)]?.length || 0), 0);

  return (
    <div>
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-1">
            <button onClick={() => setMesRef(new Date(mesRef.getFullYear(), mesRef.getMonth() - 1, 1))} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><ChevronLeft size={18} /></button>
            <button onClick={() => setMesRef(new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 1))} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><ChevronRight size={18} /></button>
            <h2 className="ml-1 text-base font-bold text-slate-800">{titulo}</h2>
            <span className="ml-2 text-xs text-slate-400">{delMes} documento(s) vencen este mes</span>
          </div>
          <button onClick={() => { const d = new Date(); setMesRef(new Date(d.getFullYear(), d.getMonth(), 1)); }} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600">Hoy</button>
        </div>
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70">
          {DIAS_SEM.map((d) => <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {dias.map((d, i) => {
            const iso = isoDe(d);
            const inMonth = d.getMonth() === mesRef.getMonth();
            const docs = porDia[iso] ?? [];
            return (
              <div key={i} className={`min-h-[104px] border-b border-r border-slate-100 p-1.5 ${inMonth ? "bg-white" : "bg-slate-50/50"} ${i % 7 === 6 ? "border-r-0" : ""}`}>
                <div className="mb-1 px-0.5">
                  <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${iso === hoy ? "bg-brand-500 text-white" : inMonth ? "text-slate-600" : "text-slate-300"}`}>{d.getDate()}</span>
                </div>
                <div className="space-y-1">
                  {docs.slice(0, 3).map(({ c, d: doc, est }, j) => (
                    <button key={j} onClick={() => onAbrir(c)} title={`${nombre(c)} — ${doc.tipo}${doc.numero ? ` (N° ${doc.numero})` : ""} · ${est}`}
                      className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium ring-1 ring-inset ${chipDoc(est)}`}>
                      <span className="font-bold">{etiqueta(c)}</span> · {doc.tipo}
                    </button>
                  ))}
                  {docs.length > 3 ? (
                    <div className="px-1 text-[10px] font-medium text-slate-400" title={docs.slice(3).map(({ c, d: doc }) => `${nombre(c)} — ${doc.tipo}`).join("\n")}>+{docs.length - 3} más</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /> Vigente</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /> Por vencer (≤ 30 días)</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-300" /> Vencido</span>
        <span className="ml-auto">{`Cada documento aparece en su fecha de vencimiento · ${ayuda}`}</span>
      </div>
    </div>
  );
}
