"use client";

import { useState } from "react";
import { ArrowLeftRight, HandCoins, RotateCcw, Undo2 } from "lucide-react";
import { apiDevoluciones, type CruceCompensacion } from "@/lib/api";

export const saldada = (estado: string) => estado === "Compensada" || estado === "Pagada";

const btn = "inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 disabled:opacity-50";

// Botones de una compensación: saldarla (con otra devolución o pagando), reabrirla, o
// descartar el cruce cuando se anotó por error. Los usan el panel de Devoluciones y el
// índice de compensaciones, para que se comporten igual en los dos sitios.
export function AccionesCompensacion({ c, onChanged }: { c: CruceCompensacion; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);

  async function correr(fn: () => Promise<unknown>) {
    setBusy(true);
    try { await fn(); onChanged(); }
    catch (e) { alert((e as Error).message || "No se pudo actualizar la compensación."); }
    finally { setBusy(false); }
  }
  const marcar = (estado: string, monto?: number, nota?: string) =>
    correr(() => apiDevoluciones.compensar(c.id, { estado, monto, nota }));

  // Se devolvió el favor con otra devolución. Si cancela el diálogo, no se guarda nada.
  function compensada() {
    const nota = prompt("¿Con qué devolución se compensó? (opcional)");
    if (nota === null) return;
    marcar("Compensada", undefined, nota.trim());
  }
  // Se le pagó al que hizo la devolución. Exige un monto válido mayor a 0.
  function pagada() {
    const m = prompt("Monto pagado (S/):");
    if (m === null) return;
    const monto = Number(String(m).replace(",", ".").trim());
    if (!(monto > 0)) { alert("Ingresa un monto válido mayor a 0."); return; }
    marcar("Pagada", Math.round(monto * 100) / 100, "");
  }
  // El cruce se anotó por error: el contenedor lo devolvió su propio conductor. Esto sí
  // borra la compensación (reabrir la devolución no lo hace: el favor ya ocurrió).
  function descartar() {
    const quien = c.conductor || "su conductor";
    if (!confirm(`¿Quitar la devolución cruzada de ${c.contenedor || c.codigo}?\n\nQuedará como que la devolvió ${quien} y la compensación desaparece. Úsalo solo si se anotó por error.`)) return;
    correr(() => apiDevoluciones.update(c.id, { devueltoPor: c.conductor }));
  }

  return (
    <span className="flex items-center gap-1.5">
      {saldada(c.compensacionEstado) ? (
        <button disabled={busy} onClick={() => marcar("Pendiente")} title="Volver a dejarla pendiente" className={`${btn} hover:border-amber-300 hover:text-amber-700`}>
          <RotateCcw size={13} /> Reabrir
        </button>
      ) : (
        <>
          <button disabled={busy} onClick={compensada} className={`${btn} hover:border-emerald-300 hover:text-emerald-700`}>
            <ArrowLeftRight size={13} /> Compensada
          </button>
          <button disabled={busy} onClick={pagada} className={`${btn} hover:border-brand-300 hover:text-brand-600`}>
            <HandCoins size={13} /> Pagada
          </button>
        </>
      )}
      <button disabled={busy} onClick={descartar} title="Se anotó por error: lo devolvió su propio conductor" className={`${btn} hover:border-rose-300 hover:text-rose-600`}>
        <Undo2 size={13} /> Descartar
      </button>
    </span>
  );
}
