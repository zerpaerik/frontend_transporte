"use client";

import { useEffect, useState } from "react";
import { Plus, Container, ArrowDownToLine, ArrowUpFromLine, Settings2, FileText, Trash2, Pencil } from "lucide-react";
import Link from "next/link";
import { PageHeader, StatCard, Badge } from "@/components/ui";
import { DataTable, type Column, type Filter } from "@/components/DataTable";
import { FormModal, type Field, type FormValues } from "@/components/FormModal";
import { TicketViaje } from "@/components/TicketViaje";
import { DetalleViaje } from "@/components/DetalleViaje";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { apiTipos, apiClientes, apiPuertos, apiComisiones } from "@/lib/api";
import { fecha, diasRestantes } from "@/lib/format";
import type { EstadoViaje, Viaje } from "@/lib/types";

// Opción del select de carreta para escribir una placa alquilada (fuera de la flota).
const ALQ_CARRETA = "Alquilada (otra placa)";

const estadoTone: Record<EstadoViaje, "gray" | "blue" | "green" | "orange" | "red"> = {
  Programado: "gray", "En curso": "orange", Culminado: "blue", Devuelto: "green", Cancelado: "red",
};

function Semaforo({ iso, estado }: { iso?: string; estado: EstadoViaje }) {
  if (estado === "Cancelado") return <span className="text-slate-300">—</span>;
  if (estado === "Culminado" || estado === "Devuelto") return <Badge tone="green">OK</Badge>;
  if (!iso) return <span className="text-slate-300">—</span>;
  const d = diasRestantes(iso);
  if (d < 0) return <Badge tone="red">Vencido</Badge>;
  if (d <= 1) return <Badge tone="red">Urgente · {d}d</Badge>;
  if (d <= 3) return <Badge tone="amber">{d} días</Badge>;
  return <Badge tone="green">{d} días</Badge>;
}

// Lista completa de campos del despacho. El código queda fijo a la izquierda y las
// acciones fijas a la derecha, para no tener que hacer scroll hasta el final.
const dash = <span className="text-slate-300">—</span>;
const columns: Column<Viaje>[] = [
  { key: "codigo", header: "Código", sortable: true, thClass: "sticky left-0 z-20", tdClass: "sticky left-0 z-10 bg-white", render: (v) => <span className="font-semibold text-brand-700">{(v as any).codigo || "—"}</span> },
  { key: "registro", header: "Registro", sortable: true, value: (v) => (v as any).createdAt || "", render: (v) => <span className="tabular whitespace-nowrap text-slate-500">{fecha((v as any).createdAt || "")}</span> },
  { key: "fechaViaje", header: "Fecha viaje", sortable: true, value: (v) => v.fechaViaje || "", render: (v) => v.fechaViaje ? <span className="tabular whitespace-nowrap">{fecha(v.fechaViaje)}</span> : dash },
  { key: "placaTracto", header: "Tracto", sortable: true, render: (v) => <span className="font-semibold text-slate-900">{v.placaTracto}</span> },
  { key: "carreta", header: "Carreta", render: (v) => v.carreta ? <span className="tabular whitespace-nowrap">{v.carreta}</span> : dash },
  { key: "conductor", header: "Conductor", sortable: true, render: (v) => <span className="block max-w-[150px] truncate" title={v.conductor}>{v.conductor || "—"}</span> },
  { key: "cliente", header: "Cliente", sortable: true, render: (v) => <span className="block max-w-[190px] truncate font-medium text-slate-700" title={v.cliente}>{v.cliente || "—"}</span> },
  { key: "nOrden", header: "N° Orden", sortable: true, value: (v) => v.nOrden, render: (v) => v.nOrden ? <span className="tabular whitespace-nowrap">{v.nOrden}</span> : dash },
  { key: "operacion", header: "Op.", render: (v) => <span className="whitespace-nowrap text-xs font-semibold text-slate-500">{v.operacion}</span> },
  { key: "tipoCarga", header: "Carga", sortable: true, render: (v) => <span className="whitespace-nowrap text-xs">{v.tipoCarga || "—"}</span> },
  { key: "contenedor", header: "Contenedor", sortable: true, render: (v) => <span className="tabular whitespace-nowrap">{v.contenedor || "—"}</span> },
  { key: "tamanio", header: "Tamaño", render: (v) => v.tamanio ? <span className="whitespace-nowrap">{v.tamanio}</span> : dash },
  { key: "origen", header: "Origen", render: (v) => v.origen ? <span className="block max-w-[150px] truncate" title={v.origen}>{v.origen}</span> : dash },
  { key: "destino", header: "Destino", render: (v) => v.destino ? <span className="block max-w-[150px] truncate" title={v.destino}>{v.destino}</span> : dash },
  { key: "horaCita", header: "Hora cita", render: (v) => v.horaCita ? <span className="whitespace-nowrap">{v.horaCita}</span> : dash },
  { key: "enCliente", header: "En cliente", value: (v) => `${v.fechaCliente || ""} ${v.horaCliente || ""}`.trim(), render: (v) => {
    const t = [v.fechaCliente ? fecha(v.fechaCliente) : "", v.horaCliente || ""].filter(Boolean).join(" · ");
    return t ? <span className="whitespace-nowrap">{t}</span> : dash;
  } },
  { key: "devolucion", header: "Devolución", render: (v) => v.devolucion ? <span className="block max-w-[150px] truncate" title={v.devolucion}>{v.devolucion}</span> : dash },
  { key: "ubicacion", header: "Ubicación", render: (v) => v.ubicacion ? <span className="block max-w-[170px] truncate" title={v.ubicacion}>{v.ubicacion}</span> : dash },
  { key: "fechaLimite", header: "F. límite", sortable: true, value: (v) => v.fechaLimite || "", render: (v) => v.fechaLimite ? <span className="tabular whitespace-nowrap">{fecha(v.fechaLimite)}</span> : dash },
  { key: "semaforo", header: "Devolver", align: "center", render: (v) => <Semaforo iso={v.fechaLimite || undefined} estado={v.estado} /> },
  { key: "greRemitente", header: "N° Guía", value: (v) => v.greRemitente, render: (v) => v.greRemitente ? <span className="tabular whitespace-nowrap">{v.greRemitente}</span> : dash },
  { key: "facturado", header: "Facturado", value: (v) => (v.factura ? "Sí" : "No"), render: (v) => v.factura ? <Badge tone="green">Facturado · {v.factura}</Badge> : <Badge tone="amber">No facturado</Badge> },
  { key: "estado", header: "Estado", sortable: true, render: (v) => <Badge tone={estadoTone[v.estado]}>{v.estado}</Badge> },
];

const filters: Filter<Viaje>[] = [
  { key: "operacion", label: "Operación", value: (v) => v.operacion },
  { key: "estado", label: "Estado", value: (v) => v.estado },
  { key: "cliente", label: "Cliente", value: (v) => v.cliente },
];

function AccionesViaje({ v, onTicket, onEdit, onDelete }: { v: Viaje; onTicket: (v: Viaje) => void; onEdit: (v: Viaje) => void; onDelete: (v: Viaje) => void }) {
  return (
    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => onTicket(v)} title="Ver ticket / PDF / WhatsApp"
        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600">
        <FileText size={13} /> Ticket
      </button>
      <button onClick={() => onEdit(v)} title="Editar viaje"
        className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-brand-300 hover:text-brand-600">
        <Pencil size={13} />
      </button>
      <button onClick={() => onDelete(v)} title="Eliminar viaje"
        className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

export default function OperacionesPage() {
  const { viajes, vehiculos, conductores, addViaje, updateViaje, removeViaje } = useData();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tipoOpen, setTipoOpen] = useState(false);
  const [editViaje, setEditViaje] = useState<Viaje | null>(null);
  const [ticketViaje, setTicketViaje] = useState<Viaje | null>(null);
  const [detalle, setDetalle] = useState<Viaje | null>(null);
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

  const puertoOpts = ["", ...puertos];
  const distritoOpts = distritos.length ? ["", ...distritos] : [""];

  // Campos del viaje. En "carga suelta", origen y punto de devolución pasan a texto libre.
  const buildFields = (vals: Record<string, string>, v?: any): Field[] => {
    const suelta = String(vals.operacion || "").toLowerCase().includes("suelta");
    const expo = String(vals.operacion || "").toLowerCase().includes("expo");
    const g = (k: string, fallback = "") => (v ? (v[k] ?? fallback) : fallback);
    const hoyISO = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
    // Carreta: la de flota o una alquilada (placa libre para este viaje).
    const carretasFlota = vehiculos.filter((x) => x.tipo === "Carreta").map((x) => x.placa);
    const carretaGuardada = g("carreta");
    const alquiladaGuardada = !!carretaGuardada && !carretasFlota.includes(carretaGuardada);
    return [
      { name: "placaTracto", label: "Placa tracto", type: "select", options: vehiculos.filter((x) => x.tipo === "Tracto").map((x) => x.placa), required: true, default: g("placaTracto") },
      { name: "carreta", label: "Carreta", type: "select", options: ["", ...carretasFlota, ALQ_CARRETA], default: alquiladaGuardada ? ALQ_CARRETA : carretaGuardada },
      ...(vals.carreta === ALQ_CARRETA
        ? [{ name: "carretaPlaca", label: "Placa de la carreta alquilada", type: "text" as const, required: true, placeholder: "Ej. B7A-845", full: true, default: alquiladaGuardada ? carretaGuardada : "" }]
        : []),
      { name: "conductor", label: "Conductor", type: "select", options: ["", ...conductores.map((c) => c.nombre)], default: g("conductor") },
      { name: "cliente", label: "Cliente", type: "select", options: clientes, required: true, default: g("cliente") },
      { name: "fechaViaje", label: "Fecha del viaje", type: "date", default: g("fechaViaje", hoyISO) },
      { name: "nOrden", label: "Orden", type: "text", placeholder: "26/03000251", default: g("nOrden") },
      { name: "greRemitente", label: "Guía de remisión", type: "text", placeholder: "T001-26916", default: g("greRemitente") },
      { name: "tarifa", label: "Tarifa (S/) — se jala en la factura", type: "number", default: g("tarifa", "0") },
      { name: "operacion", label: "Tipo de operación", type: "select", options: tipos, default: g("operacion", tipos[0]) },
      { name: "contenedor", label: "Contenedor", type: "text", placeholder: "Opcional — se puede registrar luego al editar", default: g("contenedor") },
      { name: "tipoCarga", label: "Tipo de carga", type: "select", options: ["GENERAL", "IMO", "REEFER"], default: g("tipoCarga", "GENERAL") },
      { name: "tamanio", label: "Tamaño", type: "select", options: ["", "20'", "40'", "40' HC"], default: g("tamanio") },
      { name: "horaCita", label: "Hora de cita (retiro en puerto)", type: "text", placeholder: "08:00", default: g("horaCita") },
      // "En el cliente" (fecha + hora) — suele ser otro día; solo en importación/exportación.
      ...(!suelta
        ? [
            { name: "fechaCliente", label: "Fecha en el cliente", type: "date" as const, default: g("fechaCliente") },
            { name: "horaCliente", label: "Hora en el cliente", type: "text" as const, placeholder: "Ej. 09:00", default: g("horaCliente") },
          ]
        : []),
      suelta
        ? { name: "origen", label: "Origen (texto libre)", type: "text", placeholder: "Escribe el origen", default: g("origen") }
        : { name: "origen", label: expo ? "Puerto de recojo" : "Origen (puerto)", type: "select", options: puertoOpts, default: g("origen") },
      { name: "destino", label: "Destino (distrito)", type: "select", options: distritoOpts, default: g("destino") },
      suelta
        ? { name: "devolucion", label: "Punto de devolución (texto libre)", type: "text", placeholder: "Escribe el punto de devolución", default: g("devolucion") }
        : { name: "devolucion", label: expo ? "Puerto de ingreso" : "Punto de devolución", type: "select", options: puertoOpts, default: g("devolucion") },
      { name: "ubicacion", label: "Ubicación", type: "text", full: true, placeholder: "Dirección / link de Maps de la entrega", default: g("ubicacion") },
      { name: "observacion", label: "Observación", type: "text", full: true, placeholder: "Notas del viaje (opcional)", default: g("observacion") },
      { name: "fechaLimite", label: "Fecha límite devolución (opcional)", type: "date", default: g("fechaLimite") },
      { name: "estado", label: "Estado", type: "select", options: ["Programado", "En curso", "Culminado", "Devuelto", "Cancelado"], default: g("estado", "Programado") },
    ];
  };

  function toBody(v: FormValues) {
    const body: any = {
      placaTracto: String(v.placaTracto),
      carreta: v.carreta === ALQ_CARRETA ? String(v.carretaPlaca || "").toUpperCase() : String(v.carreta || ""),
      conductor: String(v.conductor || ""), cliente: String(v.cliente),
      operacion: String(v.operacion), contenedor: String(v.contenedor).toUpperCase(), tamanio: String(v.tamanio || ""),
      tipoCarga: String(v.tipoCarga || "GENERAL"), horaCita: String(v.horaCita || ""), horaCliente: String(v.horaCliente || ""), origen: String(v.origen || ""),
      destino: String(v.destino || ""), devolucion: String(v.devolucion || ""), ubicacion: String(v.ubicacion || ""),
      observacion: String(v.observacion || ""),
      estado: String(v.estado || "Programado"), nOrden: String(v.nOrden || ""), greRemitente: String(v.greRemitente || ""),
      tarifa: Number(v.tarifa || 0),
      fechaLimite: v.fechaLimite ? String(v.fechaLimite) : undefined,
      fechaCliente: v.fechaCliente ? String(v.fechaCliente) : undefined,
      fechaViaje: v.fechaViaje ? String(v.fechaViaje) : undefined,
    };
    return body;
  }
  function guardar(v: FormValues) { addViaje({ ...toBody(v), greTransporte: "", factura: "" }); }
  function guardarEdit(v: FormValues) { if (editViaje) updateViaje(editViaje.id, toBody(v)); }

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

      {vehiculos.filter((x) => x.tipo === "Tracto").length === 0 ? (
        <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-inset ring-amber-200">
          No hay tractos en la flota de esta sede. Agrégalos en <Link href="/vehiculos" className="font-semibold underline">Flota</Link> para poder registrar viajes.
        </div>
      ) : null}

      {clientes.length === 0 ? (
        <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-inset ring-amber-200">
          No hay clientes en el catálogo. Agrégalos en <Link href="/catalogos" className="font-semibold underline">Catálogos</Link> para poder seleccionarlos aquí.
        </div>
      ) : null}

      <DataTable
        title="Operaciones y despachos"
        exportName="operaciones-despachos"
        columns={columns}
        rows={viajes}
        filters={filters}
        dateField={(v) => (v as any).createdAt}
        dateLabel="Registro"
        recentDays={3}
        minWidth="min-w-[1500px]"
        pageSize={9}
        onRowClick={setDetalle}
        rowActions={(v) => <AccionesViaje v={v} onTicket={setTicketViaje} onEdit={setEditViaje} onDelete={eliminarViaje} />}
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

      <FormModal open={open} title="Nuevo viaje / despacho" subtitle="En carga suelta, origen y punto de devolución se escriben libremente." fields={(vals) => buildFields(vals)} onSubmit={guardar} onClose={() => setOpen(false)} />

      {editViaje ? (
        <FormModal
          open
          title={`Editar viaje — ${(editViaje as any).codigo || editViaje.contenedor}`}
          subtitle="Actualiza los datos del viaje (p. ej. la fecha de devolución cuando ya se conozca)."
          fields={(vals) => buildFields(vals, editViaje)}
          submitLabel="Guardar cambios"
          onSubmit={guardarEdit}
          onClose={() => setEditViaje(null)}
        />
      ) : null}

      <FormModal
        open={tipoOpen}
        title="Nuevo tipo de operación"
        subtitle="Crea un tipo de operación para tu empresa (ej. IMPO, EXPO, Carga suelta)."
        fields={[{ name: "nombre", label: "Nombre del tipo", type: "text", required: true, placeholder: "Carga suelta", full: true }]}
        submitLabel="Crear tipo"
        onSubmit={guardarTipo}
        onClose={() => setTipoOpen(false)}
      />

      {ticketViaje ? <TicketViaje viaje={ticketViaje} empresa={user?.sede ? { nombre: user.sede.nombre, ruc: user.sede.ruc, codigo: user.sede.codigo } : undefined} onClose={() => setTicketViaje(null)} /> : null}
      {detalle ? <DetalleViaje viaje={detalle} onClose={() => setDetalle(null)} /> : null}
    </div>
  );
}
