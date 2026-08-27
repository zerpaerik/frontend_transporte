"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Badge } from "./ui";
import { fecha } from "@/lib/format";
import type { EstadoViaje, Viaje } from "@/lib/types";

const estadoTone: Record<EstadoViaje, "gray" | "blue" | "green" | "orange" | "red"> = {
  Programado: "gray", "En curso": "orange", Culminado: "blue", Devuelto: "green", Cancelado: "red",
};

function Campo({ label, value }: { label: string; value?: ReactNode }) {
  const empty = value === undefined || value === null || value === "";
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 break-words text-sm text-slate-800">{empty ? <span className="text-slate-300">—</span> : value}</div>
    </div>
  );
}

function Grupo({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{title}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">{children}</div>
    </section>
  );
}

export function DetalleViaje({ viaje, onClose }: { viaje: Viaje; onClose: () => void }) {
  const v = viaje as any;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-6" onClick={onClose}>
      <div className="mt-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-brand-700">{v.codigo || "Viaje"}</h2>
              <Badge tone="blue">{v.operacion}</Badge>
              <Badge tone={estadoTone[viaje.estado]}>{viaje.estado}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">Registro {fecha(v.createdAt || "")}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="Cerrar"><X size={20} /></button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <Grupo title="Unidad y cliente">
            <Campo label="Tracto" value={viaje.placaTracto} />
            <Campo label="Carreta" value={viaje.carreta} />
            <Campo label="Conductor" value={viaje.conductor} />
            <Campo label="Cliente" value={viaje.cliente} />
            <Campo label="N° Orden" value={viaje.nOrden} />
          </Grupo>

          <Grupo title="Contenedor">
            <Campo label="Contenedor" value={viaje.contenedor} />
            <Campo label="Tamaño" value={viaje.tamanio} />
            <Campo label="Tipo de carga" value={viaje.tipoCarga} />
            <Campo label="Hora cita" value={viaje.horaCita} />
          </Grupo>

          <Grupo title="Ruta y devolución">
            <Campo label="Origen" value={viaje.origen} />
            <Campo label="Destino" value={viaje.destino} />
            <Campo label="Punto de devolución" value={viaje.devolucion} />
            <Campo label="Fecha límite" value={viaje.fechaLimite ? fecha(viaje.fechaLimite) : ""} />
          </Grupo>

          <Grupo title="Documentos">
            <Campo label="N° Guía (GRE remitente)" value={viaje.greRemitente} />
            <Campo label="GRE transporte" value={viaje.greTransporte} />
            <Campo label="Facturado" value={viaje.factura ? <Badge tone="green">{viaje.factura}</Badge> : <Badge tone="amber">No facturado</Badge>} />
          </Grupo>
        </div>

        <div className="flex justify-end border-t border-slate-200 px-6 py-3">
          <button onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
