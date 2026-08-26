"use client";

import { useState } from "react";
import { X, Copy, Download, MessageCircle, MapPin, Check } from "lucide-react";
import { Badge } from "./ui";
import { exportPDF } from "@/lib/export";
import { fecha, soles } from "@/lib/format";

export function TicketViaje({ viaje, onClose }: { viaje: any; onClose: () => void }) {
  const v = viaje;
  const [copiado, setCopiado] = useState(false);
  if (!v) return null;

  const codigo = v.codigo || "—";
  const registro = fecha(v.createdAt || "");

  const filas: [string, string][] = [
    ["Código", codigo],
    ["Fecha de registro", registro],
    ["Estado", v.estado],
    ["Tracto", v.placaTracto],
    ["Carreta", v.carreta || "—"],
    ["Conductor", v.conductor || "—"],
    ["Cliente", v.cliente],
    ["RUC", v.clienteRuc || "—"],
    ["Dirección", v.clienteDireccion || "—"],
    ["Tipo de operación", v.operacion],
    ["Tipo de carga", v.tipoCarga || "—"],
    ["Contenedor", v.contenedor],
    ["Tamaño", v.tamanio || "—"],
    ["Origen", v.origen || "—"],
    ["Destino", v.destino || "—"],
    ["Punto de devolución", v.devolucion || "—"],
    ["Ubicación", v.ubicacion || "—"],
    ["Hora de cita", v.horaCita || "—"],
    ["Fecha límite devolución", v.fechaLimite ? fecha(v.fechaLimite) : "—"],
    ["N° Orden", v.nOrden || "—"],
    ["Guía de remisión", v.greRemitente || "—"],
    ["Tarifa", soles(v.tarifa || 0)],
  ];

  const texto = [
    `🚛 VIAJE ${codigo}`,
    `Cliente: ${v.cliente}${v.clienteRuc ? ` (RUC ${v.clienteRuc})` : ""}`,
    `Tracto: ${v.placaTracto}  ·  Conductor: ${v.conductor || "—"}`,
    `Operación: ${v.operacion}  ·  Carga: ${v.tipoCarga || "—"}`,
    `Contenedor: ${v.contenedor} ${v.tamanio || ""}`.trim(),
    `Origen: ${v.origen || "—"}  →  Destino: ${v.destino || "—"}`,
    `Devolución: ${v.devolucion || "—"}${v.fechaLimite ? `  (límite ${fecha(v.fechaLimite)})` : ""}`,
    v.ubicacion ? `📍 Ubicación: ${v.ubicacion}` : "",
    v.horaCita ? `Hora de cita: ${v.horaCita}` : "",
    v.nOrden ? `N° Orden: ${v.nOrden}` : "",
  ].filter(Boolean).join("\n");

  const mapsUrl = v.ubicacion ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.ubicacion)}` : "";

  function copiarUbicacion() {
    const t = v.ubicacion || "";
    navigator.clipboard?.writeText(t).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1500); }).catch(() => {});
  }
  function descargarPDF() {
    exportPDF(`Ticket de viaje ${codigo}`, ["Campo", "Valor"], filas, `${v.cliente} · ${v.contenedor}`);
  }
  function compartirWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-6">
      <div className="mt-8 w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Encabezado tipo ticket */}
        <div className="relative rounded-t-2xl bg-steel-700 px-6 py-5 text-white">
          <button onClick={onClose} className="absolute right-3 top-3 rounded-md p-1 text-white/70 hover:bg-white/10" aria-label="Cerrar"><X size={18} /></button>
          <div className="text-xs uppercase tracking-widest text-steel-200">Ticket de viaje</div>
          <div className="mt-1 flex items-center gap-3">
            <div className="text-2xl font-extrabold tracking-tight">{codigo}</div>
            <Badge tone="blue">{v.estado}</Badge>
          </div>
          <div className="mt-1 text-sm text-steel-100">{v.cliente} · {v.contenedor}</div>
        </div>

        {/* Cuerpo */}
        <div className="px-6 py-4">
          <dl className="divide-y divide-slate-100">
            {filas.map(([k, val]) => (
              <div key={k} className="flex items-start justify-between gap-4 py-1.5">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{k}</dt>
                <dd className="max-w-[62%] text-right text-sm font-medium text-slate-800">{val}</dd>
              </div>
            ))}
          </dl>

          {v.ubicacion ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={copiarUbicacion} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600">
                {copiado ? <><Check size={14} /> ¡Copiado!</> : <><Copy size={14} /> Copiar ubicación</>}
              </button>
              {mapsUrl ? <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600"><MapPin size={14} /> Abrir en Maps</a> : null}
            </div>
          ) : null}
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap gap-2 border-t border-slate-200 px-6 py-4">
          <button onClick={compartirWhatsApp} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"><MessageCircle size={16} /> WhatsApp</button>
          <button onClick={descargarPDF} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"><Download size={16} /> Descargar PDF</button>
        </div>
      </div>
    </div>
  );
}
