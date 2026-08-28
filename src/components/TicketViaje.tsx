"use client";

import { useState } from "react";
import { X, Copy, FileText, MessageCircle, MapPin, Check } from "lucide-react";
import { Badge } from "./ui";
import { fecha } from "@/lib/format";
import { fichaViajePDF } from "@/lib/ticket-pdf";

export function TicketViaje({ viaje, empresa, onClose }: { viaje: any; empresa?: { nombre?: string; ruc?: string }; onClose: () => void }) {
  const v = viaje;
  const [copiadoUbic, setCopiadoUbic] = useState(false);
  const [copiadoTodo, setCopiadoTodo] = useState(false);
  if (!v) return null;

  const codigo = v.codigo || "—";
  const registro = fecha(v.createdAt || "");

  // Ficha por secciones (sin tarifa: el conductor no debe ver cuánto se cobra).
  const grupos: { titulo: string; filas: [string, string][] }[] = [
    { titulo: "Cliente", filas: [["Cliente", v.cliente], ["RUC", v.clienteRuc || "—"], ["Dirección", v.clienteDireccion || "—"]] },
    { titulo: "Unidad y conductor", filas: [["Tracto", v.placaTracto], ["Carreta", v.carreta || "—"], ["Conductor", v.conductor || "—"]] },
    { titulo: "Carga", filas: [["Operación", v.operacion], ["Tipo de carga", v.tipoCarga || "—"], ["Contenedor", v.contenedor], ["Tamaño", v.tamanio || "—"]] },
    {
      titulo: "Ruta y entrega",
      filas: [
        ["Origen", v.origen || "—"], ["Destino", v.destino || "—"], ["Punto de devolución", v.devolucion || "—"],
        ["Hora de cita", v.horaCita || "—"], ["Fecha límite devolución", v.fechaLimite ? fecha(v.fechaLimite) : "—"],
        ["N° Orden", v.nOrden || "—"], ["Guía de remisión", v.greRemitente || "—"],
      ],
    },
  ];

  const seccion = (titulo: string, lineas: string[]) => {
    const body = lineas.filter(Boolean);
    return body.length ? [titulo, ...body].join("\n") : "";
  };
  const texto = [
    `🚛 VIAJE ${codigo}  ·  ${v.estado || ""}`.trim(),
    seccion("👤 CLIENTE", [`${v.cliente}${v.clienteRuc ? `  (RUC ${v.clienteRuc})` : ""}`, v.clienteDireccion ? `Dirección: ${v.clienteDireccion}` : ""]),
    seccion("🚚 UNIDAD", [`Tracto: ${v.placaTracto}`, v.carreta ? `Carreta: ${v.carreta}` : "", v.conductor ? `Conductor: ${v.conductor}` : ""]),
    seccion("📦 CARGA", [`Operación: ${v.operacion}`, `Contenedor: ${v.contenedor}${v.tamanio ? ` (${v.tamanio})` : ""}`, v.tipoCarga ? `Tipo de carga: ${v.tipoCarga}` : ""]),
    seccion("🧭 RUTA", [
      v.origen ? `Origen: ${v.origen}` : "", v.destino ? `Destino: ${v.destino}` : "",
      v.devolucion ? `Devolución: ${v.devolucion}${v.fechaLimite ? ` (límite ${fecha(v.fechaLimite)})` : ""}` : "",
      v.horaCita ? `Hora de cita: ${v.horaCita}` : "", v.nOrden ? `N° Orden: ${v.nOrden}` : "", v.greRemitente ? `Guía: ${v.greRemitente}` : "",
    ]),
    v.ubicacion ? seccion("📍 ENTREGA", [v.ubicacion]) : "",
  ].filter(Boolean).join("\n\n");

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
          <div className="mt-1 text-sm text-steel-100">{v.cliente} · {registro}</div>
        </div>

        {/* Cuerpo por secciones */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-3">
          {grupos.map((g) => (
            <section key={g.titulo} className="border-b border-slate-100 py-3 last:border-b-0">
              <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-brand-600">{g.titulo}</div>
              <dl className="space-y-1">
                {g.filas.map(([k, val]) => (
                  <div key={k} className="flex items-start justify-between gap-4">
                    <dt className="shrink-0 text-sm text-slate-500">{k}</dt>
                    <dd className="select-text break-words text-right text-sm font-semibold text-slate-800">{val}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}

          {v.ubicacion ? (
            <section className="py-3">
              <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-brand-600">📍 Ubicación de entrega</div>
              <div className="select-text break-words rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 ring-1 ring-inset ring-slate-200">{v.ubicacion}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button onClick={() => copiar(v.ubicacion, setCopiadoUbic)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600">
                  {copiadoUbic ? <><Check size={14} /> ¡Copiado!</> : <><Copy size={14} /> Copiar ubicación</>}
                </button>
                {mapsUrl ? <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600"><MapPin size={14} /> Abrir en Maps</a> : null}
              </div>
            </section>
          ) : null}
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
