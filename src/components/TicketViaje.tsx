"use client";

import { useState } from "react";
import { X, Copy, FileText, MessageCircle, MapPin, Check } from "lucide-react";
import { Badge } from "./ui";
import { fecha } from "@/lib/format";
import { fichaViajePDF } from "@/lib/ticket-pdf";

export function TicketViaje({ viaje, empresa, onClose }: { viaje: any; empresa?: { nombre?: string; ruc?: string; codigo?: string }; onClose: () => void }) {
  const v = viaje;
  const [copiadoUbic, setCopiadoUbic] = useState(false);
  const [copiadoTodo, setCopiadoTodo] = useState(false);
  if (!v) return null;

  const codigo = v.codigo || "—";
  // "En el cliente" = fecha + hora (suele ser otro día).
  const enCliente = [v.fechaCliente ? fecha(v.fechaCliente) : "", v.horaCliente].filter(Boolean).join(" · ");

  // Solo estos datos se muestran/comparten (los demás no van en la ficha del conductor).
  // Las primeras 4 van arriba, luego la ubicación, y el resto abajo.
  const filas: [string, string][] = [
    ["Punto de recojo", v.origen || "—"],
    ["Cita de retiro", v.horaCita || "—"],
    ["Punto de llegada", v.destino || "—"],
    ["En el cliente", enCliente || "—"],
    ["Punto de devolución", v.devolucion || "—"],
    ["Tamaño contenedor", v.tamanio || "—"],
    ["Tipo de mercadería a trasladar", v.tipoCarga || "—"],
  ];

  const texto = [
    `* Punto de recojo: ${v.origen || ""}`,
    `* Cita de retiro: ${v.horaCita || ""}`,
    `* Punto de llegada: ${v.destino || ""}`,
    `* En el cliente: ${enCliente}`,
    `* Ubicación de llegada:  ${v.ubicacion || ""}`,
    `* Punto de devolución: ${v.devolucion || ""}`,
    `* Tamaño contenedor: ${v.tamanio || ""}`,
    `* Tipo de mercadería a trasladar: ${v.tipoCarga || ""}`,
  ].join("\n");

  const mapsUrl = v.ubicacion ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.ubicacion)}` : "";

  function copiar(text: string, marcar: (b: boolean) => void) {
    navigator.clipboard?.writeText(text).then(() => { marcar(true); setTimeout(() => marcar(false), 1500); }).catch(() => {});
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-6">
      <div className="mt-8 w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Encabezado */}
        <div className="relative rounded-t-2xl bg-steel-700 px-6 py-5 text-white">
          <button onClick={onClose} className="absolute right-3 top-3 rounded-md p-1 text-white/70 hover:bg-white/10" aria-label="Cerrar"><X size={18} /></button>
          <div className="text-xs uppercase tracking-widest text-steel-200">Ficha de viaje · para el conductor</div>
          <div className="mt-1 flex items-center gap-3">
            <div className="text-2xl font-extrabold tracking-tight">{codigo}</div>
            <Badge tone="blue">{v.estado}</Badge>
          </div>
        </div>

        {/* Cuerpo — solo los datos del conductor */}
        <div className="px-6 py-3">
          <dl>
            {filas.slice(0, 4).map(([k, val]) => (
              <div key={k} className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5">
                <dt className="shrink-0 text-sm text-slate-500">{k}</dt>
                <dd className="select-text break-words text-right text-base font-bold text-slate-800">{val}</dd>
              </div>
            ))}
          </dl>

          <div className="py-3">
            <div className="mb-1.5 text-sm text-slate-500">Ubicación de llegada</div>
            {v.ubicacion ? (
              <>
                <div className="select-text break-words rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-brand-700 ring-1 ring-inset ring-slate-200">{v.ubicacion}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button onClick={() => copiar(v.ubicacion, setCopiadoUbic)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600">
                    {copiadoUbic ? <><Check size={14} /> ¡Copiado!</> : <><Copy size={14} /> Copiar ubicación</>}
                  </button>
                  {mapsUrl ? <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600"><MapPin size={14} /> Abrir en Maps</a> : null}
                </div>
              </>
            ) : <div className="text-sm text-slate-300">—</div>}
          </div>

          <dl>
            {filas.slice(4).map(([k, val]) => (
              <div key={k} className="flex items-start justify-between gap-4 border-t border-slate-100 py-2.5">
                <dt className="shrink-0 text-sm text-slate-500">{k}</dt>
                <dd className="select-text break-words text-right text-base font-bold text-slate-800">{val}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap gap-2 border-t border-slate-200 px-6 py-4">
          <button onClick={() => copiar(texto, setCopiadoTodo)} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            {copiadoTodo ? <><Check size={16} /> ¡Copiado!</> : <><Copy size={16} /> Copiar datos</>}
          </button>
          <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank")} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"><MessageCircle size={16} /> WhatsApp</button>
          <button onClick={() => fichaViajePDF(v, empresa)} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"><FileText size={16} /> Ver ficha</button>
        </div>
      </div>
    </div>
  );
}
