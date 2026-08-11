"use client";

import { useEffect, useState } from "react";
import { Plus, Container, ArrowDownToLine, ArrowUpFromLine, Settings2, FileText, Trash2 } from "lucide-react";
import Link from "next/link";
import { PageHeader, StatCard, Badge } from "@/components/ui";
import { DataTable, type Column, type Filter } from "@/components/DataTable";
import { FormModal, type Field, type FormValues } from "@/components/FormModal";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { apiTipos, apiClientes, apiPuertos, apiComisiones } from "@/lib/api";
import { exportPDF } from "@/lib/export";
import { fecha, diasRestantes, soles } from "@/lib/format";
import type { EstadoViaje, Viaje } from "@/lib/types";

const estadoTone: Record<EstadoViaje, "gray" | "blue" | "green" | "orange"> = {
  Programado: "gray", "En curso": "orange", Culminado: "blue", Devuelto: "green",
};

function Semaforo({ iso, estado }: { iso?: string; estado: EstadoViaje }) {
  if (estado === "Culminado" || estado === "Devuelto") return <Badge tone="green">OK</Badge>;
  if (!iso) return <span className="text-slate-300">—</span>;
  const d = diasRestantes(iso);
  if (d < 0) return <Badge tone="red">Vencido</Badge>;
  if (d <= 1) return <Badge tone="red">Urgente · {d}d</Badge>;
  if (d <= 3) return <Badge tone="amber">{d} días</Badge>;
  return <Badge tone="green">{d} días</Badge>;
}

const columns: Column<Viaje>[] = [
  { key: "codigo", header: "Código", sortable: true, render: (v) => <span className="font-semibold text-brand-700">{(v as any).codigo || "—"}</span> },
  { key: "registro", header: "Registro", sortable: true, value: (v) => (v as any).createdAt || "", render: (v) => <span className="tabular whitespace-nowrap text-slate-500">{fecha(((v as any).createdAt || "").slice(0, 10))}</span> },
  { key: "placaTracto", header: "Tracto", sortable: true, render: (v) => <span className="font-semibold text-slate-900">{v.placaTracto}</span> },
  { key: "conductor", header: "Conductor", sortable: true, render: (v) => <span className="whitespace-nowrap">{v.conductor || "—"}</span> },
  { key: "cliente", header: "Cliente", sortable: true, render: (v) => <Badge tone="blue">{v.cliente}</Badge> },
  { key: "nOrden", header: "N° Orden", sortable: true, value: (v) => v.nOrden, render: (v) => v.nOrden ? <span className="tabular whitespace-nowrap">{v.nOrden}</span> : <span className="text-slate-300">—</span> },
  { key: "operacion", header: "Op.", render: (v) => <span className="text-xs font-semibold text-slate-500">{v.operacion}</span> },
  { key: "tipoCarga", header: "Carga", sortable: true, render: (v) => <span className="text-xs">{v.tipoCarga || "—"}</span> },
  { key: "contenedor", header: "Contenedor", sortable: true, render: (v) => <span className="tabular">{v.contenedor}</span> },
  { key: "origen", header: "Origen", render: (v) => v.origen || <span className="text-slate-300">—</span> },
  { key: "destino", header: "Destino", render: (v) => v.destino || <span className="text-slate-300">—</span> },
  { key: "horaCita", header: "Hora cita", render: (v) => v.horaCita || <span className="text-slate-300">—</span> },
  { key: "devolucion", header: "Devolución", render: (v) => v.devolucion || <span className="text-slate-300">—</span> },
  { key: "fechaLimite", header: "F. límite", sortable: true, value: (v) => v.fechaLimite || "", render: (v) => v.fechaLimite ? <span className="tabular whitespace-nowrap">{fecha(v.fechaLimite)}</span> : <span className="text-slate-300">—</span> },
  { key: "semaforo", header: "Devolver", render: (v) => <Semaforo iso={v.fechaLimite || undefined} estado={v.estado} /> },
  { key: "greRemitente", header: "N° Guía", value: (v) => v.greRemitente, render: (v) => v.greRemitente ? <span className="tabular whitespace-nowrap">{v.greRemitente}</span> : <span className="text-slate-300">—</span> },
  { key: "facturado", header: "Facturado", value: (v) => (v.factura ? "Sí" : "No"), render: (v) => v.factura ? <Badge tone="green">Facturado · {v.factura}</Badge> : <Badge tone="amber">No facturado</Badge> },
  { key: "estado", header: "Estado", sortable: true, render: (v) => <Badge tone={estadoTone[v.estado]}>{v.estado}</Badge> },
];

const filters: Filter<Viaje>[] = [
  { key: "operacion", label: "Operación", value: (v) => v.operacion },
  { key: "estado", label: "Estado", value: (v) => v.estado },
  { key: "cliente", label: "Cliente", value: (v) => v.cliente },
];

// Genera un PDF con la ficha completa del viaje (todos los campos registrados).
function fichaViajePDF(v: Viaje) {
  const a = v as any;
  const rows: [string, string][] = [
    ["Código", a.codigo || "—"],
    ["Fecha de registro", fecha((a.createdAt || "").slice(0, 10))],
    ["Estado", v.estado],
    ["Tracto", v.placaTracto],
    ["Carreta", v.carreta || "—"],
    ["Conductor", v.conductor || "—"],
    ["Cliente", v.cliente],
    ["RUC", a.clienteRuc || "—"],
    ["Tipo de operación", v.operacion],
    ["Tipo de carga", v.tipoCarga || "—"],
    ["Contenedor", v.contenedor],
    ["Tamaño", v.tamanio || "—"],
    ["Origen", v.origen || "—"],
    ["Destino", v.destino || "—"],
    ["Punto de devolución", v.devolucion || "—"],
    ["Ubicación", a.ubicacion || "—"],
    ["Hora de cita", v.horaCita || "—"],
    ["Fecha límite devolución", v.fechaLimite ? fecha(v.fechaLimite) : "—"],
    ["N° Orden", v.nOrden || "—"],
    ["Guía de remisión", v.greRemitente || "—"],
    ["Factura", v.factura || "—"],
    ["Comisión del chofer", soles(a.comisionChofer || 0)],
  ];
  exportPDF(`Registro de viaje ${a.codigo || ""}`.trim(), ["Campo", "Valor"], rows, `${v.cliente} · ${v.contenedor}`);
}

function accionesColumn(onDelete: (v: Viaje) => void): Column<Viaje> {
  return {
    key: "acciones", header: "",
    render: (v) => (
      <div className="flex items-center gap-1.5">
        <button onClick={() => fichaViajePDF(v)} title="Ver / descargar PDF del viaje"
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600">
          <FileText size={13} /> PDF
        </button>
        <button onClick={() => onDelete(v)} title="Eliminar viaje"
          className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600">
          <Trash2 size={13} />
        </button>
      </div>
    ),
  };
}

export default function OperacionesPage() {
  const { viajes, vehiculos, conductores, addViaje, removeViaje } = useData();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tipoOpen, setTipoOpen] = useState(false);
  const [tipos, setTipos] = useState<string[]>(["IMPO", "EXPO"]);
  const [clientes, setClientes] = useState<string[]>([]);
  const [puertos, setPuertos] = useState<string[]>([]);
  const [distritos, setDistritos] = useState<string[]>([]);

  function cargarCatalogos() {
    apiTipos.list().then((ts) => { if (ts.length) setTipos(ts.map((t) => t.nombre)); }).catch(() => {});
    apiClientes.list().then((cs) => setClientes(cs.map((c) => c.nombre))).catch(() => {});
    apiPuertos.list().then((ps) => setPuertos(ps.map((p) => p.nombre))).catch(() => {});
    apiComisiones.tarifario().then((ts) => setDistritos(ts.map((t) => t.destino))).catch(() => {});
  }
  useEffect(() => { cargarCatalogos(); }, []);

  function eliminarViaje(v: Viaje) {
    const cod = (v as any).codigo || v.contenedor;
    if (confirm(`¿Eliminar el viaje ${cod}? Esta acción no se puede deshacer.`)) removeViaje(v.id);
  }

  const enCurso = viajes.filter((v) => v.estado === "En curso").length;
  const impo = viajes.filter((v) => v.operacion === "IMPO").length;
  const expo = viajes.filter((v) => v.operacion === "EXPO").length;

  const clienteOpts = clientes;
  const puertoOpts = ["", ...puertos];

  const fields: Field[] = [
    { name: "placaTracto", label: "Placa tracto", type: "select", options: vehiculos.filter((v) => v.tipo === "Tracto").map((v) => v.placa) },
    { name: "carreta", label: "Carreta", type: "select", options: ["", ...vehiculos.filter((v) => v.tipo === "Carreta").map((v) => v.placa)] },
    { name: "conductor", label: "Conductor", type: "select", options: ["", ...conductores.map((c) => c.nombre)] },
    { name: "cliente", label: "Cliente", type: "select", options: clienteOpts, required: true },
    { name: "nOrden", label: "Orden", type: "text", placeholder: "26/03000251" },
    { name: "greRemitente", label: "Guía de remisión", type: "text", placeholder: "T001-26916" },
    { name: "operacion", label: "Tipo de operación", type: "select", options: tipos },
    { name: "contenedor", label: "Contenedor", type: "text", required: true, placeholder: "PCIU6111486 (o S/N en carga suelta)" },
    { name: "tipoCarga", label: "Tipo de carga", type: "select", options: ["GENERAL", "IMO", "REEFER"] },
    { name: "tamanio", label: "Tamaño", type: "select", options: ["", "20'", "40'", "40' HC"] },
    { name: "horaCita", label: "Hora de cita", type: "text", placeholder: "08:00" },
    { name: "origen", label: "Origen (puerto)", type: "select", options: puertoOpts },
    { name: "destino", label: "Destino (distrito)", type: "select", options: distritos.length ? ["", ...distritos] : [""] },
    { name: "devolucion", label: "Punto de devolución", type: "select", options: puertoOpts },
    { name: "ubicacion", label: "Ubicación", type: "text", full: true, placeholder: "Referencia / dirección de entrega" },
    { name: "fechaLimite", label: "Fecha límite devolución (opcional)", type: "date" },
    { name: "estado", label: "Estado", type: "select", options: ["Programado", "En curso", "Culminado", "Devuelto"] },
  ];

  function guardar(v: FormValues) {
    const body: any = {
      placaTracto: String(v.placaTracto), carreta: String(v.carreta || ""), conductor: String(v.conductor || ""), cliente: String(v.cliente),
      operacion: String(v.operacion), contenedor: String(v.contenedor).toUpperCase(), tamanio: String(v.tamanio || ""),
      tipoCarga: String(v.tipoCarga || "GENERAL"), horaCita: String(v.horaCita || ""), origen: String(v.origen || ""),
      destino: String(v.destino || ""), devolucion: String(v.devolucion || ""), ubicacion: String(v.ubicacion || ""),
      estado: String(v.estado || "Programado"), nOrden: String(v.nOrden || ""), greRemitente: String(v.greRemitente || ""),
      greTransporte: "", factura: "",
    };
    if (v.fechaLimite) body.fechaLimite = String(v.fechaLimite);
    addViaje(body);
  }

  async function guardarTipo(v: FormValues) {
    try { await apiTipos.create(String(v.nombre)); cargarCatalogos(); } catch { /* offline demo */ }
  }

  return (
    <div>
      <PageHeader modulo="06" title="Operaciones — Despachos" subtitle="Viajes de contenedores impo/expo con documentos (GRE, factura) y control de devolución." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Viajes en curso" value={enCurso} icon={Container} tone="orange" />
        <StatCard label="Importación" value={impo} icon={ArrowDownToLine} tone="blue" />
        <StatCard label="Exportación" value={expo} icon={ArrowUpFromLine} tone="green" />
        <StatCard label="Total viajes" value={viajes.length} icon={Container} tone="gray" />
      </div>

      {clientes.length === 0 ? (
        <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-inset ring-amber-200">
          No hay clientes en el catálogo. Agrégalos en <Link href="/catalogos" className="font-semibold underline">Catálogos</Link> para poder seleccionarlos aquí.
        </div>
      ) : null}

      <DataTable
        title="Operaciones y despachos"
        exportName="operaciones-despachos"
        columns={[...columns, accionesColumn(eliminarViaje)]}
        rows={viajes}
        filters={filters}
        dateField={(v) => (v as any).createdAt}
        dateLabel="Registro"
        minWidth="min-w-[1700px]"
        pageSize={9}
        searchPlaceholder="Buscar por código, contenedor, cliente…"
        toolbar={
          <>
            {user?.rol === "Administrador" ? (
              <button onClick={() => setTipoOpen(true)} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600">
                <Settings2 size={15} /> Tipos
              </button>
            ) : null}
            <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
              <Plus size={16} /> Nuevo viaje
            </button>
          </>
        }
      />

      <FormModal open={open} title="Nuevo viaje / despacho" subtitle="En carga suelta, origen y punto de devolución pueden quedar en blanco." fields={fields} onSubmit={guardar} onClose={() => setOpen(false)} />

      <FormModal
        open={tipoOpen}
        title="Nuevo tipo de operación"
        subtitle="Crea un tipo de operación para tu empresa (ej. IMPO, EXPO, Carga suelta)."
        fields={[{ name: "nombre", label: "Nombre del tipo", type: "text", required: true, placeholder: "Carga suelta", full: true }]}
        submitLabel="Crear tipo"
        onSubmit={guardarTipo}
        onClose={() => setTipoOpen(false)}
      />
    </div>
  );
}
