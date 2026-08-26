"use client";

import { useMemo, useState } from "react";
import { Plus, Truck, Pencil, Search, FileSpreadsheet, FileText, ChevronLeft, ChevronRight, FolderOpen, AlertTriangle } from "lucide-react";
import { PageHeader, StatCard, Card, Badge } from "@/components/ui";
import { FormModal, type Field, type FormValues } from "@/components/FormModal";
import { DocumentosModal } from "@/components/DocumentosModal";
import { PhotoAvatar } from "@/components/PhotoAvatar";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { km, fecha, diasRestantes, estadoDocumento } from "@/lib/format";
import { exportCSV, exportPDF } from "@/lib/export";
import type { Vehiculo } from "@/lib/types";

function buildFields(v?: Vehiculo): Field[] {
  return [
    { name: "placa", label: "Placa", type: "text", required: true, placeholder: "AAT-843", default: v?.placa },
    { name: "tipo", label: "Tipo", type: "select", options: ["Tracto", "Carreta"], default: v?.tipo },
    { name: "marca", label: "Marca", type: "text", required: true, placeholder: "Volvo", default: v?.marca },
    { name: "modelo", label: "Modelo", type: "text", placeholder: "FH 460", default: v?.modelo },
    { name: "anio", label: "Año", type: "number", default: v?.anio ?? 2022 },
    { name: "kilometraje", label: "Kilometraje", type: "number", default: v?.kilometraje ?? 0 },
    { name: "estado", label: "Estado", type: "select", options: ["Operativo", "En taller", "Inactivo"], full: true, default: v?.estado },
  ];
}

const PAGE = 6;
const estadoTone = (e: string): "green" | "amber" | "gray" => (e === "Operativo" ? "green" : e === "En taller" ? "amber" : "gray");

export default function VehiculosPage() {
  const { vehiculos, addVehiculo, updateVehiculo, reload } = useData();
  const { user } = useAuth();
  const readOnly = user?.rol === "Conductor";
  const [open, setOpen] = useState(false);
  const [editVeh, setEditVeh] = useState<Vehiculo | null>(null);
  const [docVeh, setDocVeh] = useState<Vehiculo | null>(null);
  const [query, setQuery] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<"Todos" | "Tracto" | "Carreta">("Todos");
  const [page, setPage] = useState(1);

  const docsEstados = vehiculos.flatMap((v) => ((v as any).documentos ?? []).map((d: any) => estadoDocumento(d.vencimiento)));
  const porVencer = docsEstados.filter((e) => e === "Por vencer").length;
  const vencidos = docsEstados.filter((e) => e === "Vencido").length;
  const tractos = vehiculos.filter((v) => v.tipo === "Tracto").length;
  const carretas = vehiculos.filter((v) => v.tipo === "Carreta").length;

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vehiculos.filter((v) => {
      if (tipoFiltro !== "Todos" && v.tipo !== tipoFiltro) return false;
      if (!q) return true;
      return `${v.placa} ${v.marca} ${v.modelo}`.toLowerCase().includes(q);
    });
  }, [vehiculos, query, tipoFiltro]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE));
  const current = Math.min(page, totalPages);
  const visibles = filtrados.slice((current - 1) * PAGE, current * PAGE);

  function toDto(v: FormValues) {
    return {
      placa: String(v.placa).toUpperCase(), tipo: v.tipo as Vehiculo["tipo"], marca: String(v.marca),
      modelo: String(v.modelo), anio: Number(v.anio), kilometraje: Number(v.kilometraje), estado: v.estado as Vehiculo["estado"],
    };
  }
  function guardar(v: FormValues) { addVehiculo(toDto(v)); }
  function guardarEdit(v: FormValues) { if (editVeh) updateVehiculo(editVeh.id, toDto(v)); }

  function exportar(kind: "csv" | "pdf") {
    const headers = ["Placa", "Tipo", "Marca", "Modelo", "Año", "Documento", "N°", "Vence", "Estado doc."];
    const rows = vehiculos.flatMap((v) => {
      const docs = (v as any).documentos ?? [];
      if (docs.length === 0) return [[v.placa, v.tipo, v.marca, v.modelo, v.anio, "—", "—", "—", "—"]];
      return docs.map((d: any) => [v.placa, v.tipo, v.marca, v.modelo, v.anio, d.tipo, d.numero || "—", fecha(d.vencimiento), estadoDocumento(d.vencimiento)]);
    });
    if (kind === "csv") exportCSV("flota-vehiculos", headers, rows);
    else exportPDF("Flota y documentos", headers, rows, `${vehiculos.length} unidades`);
  }

  return (
    <div>
      <PageHeader modulo="01" title="Flota — Vehículos" subtitle="Tractos, carretas y camiones con sus documentos. El sistema alerta 15–20 días antes de cada vencimiento." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tractos" value={tractos} icon={Truck} tone="blue" />
        <StatCard label="Carretas" value={carretas} icon={Truck} tone="orange" />
        <StatCard label="Docs. por vencer" value={porVencer} icon={AlertTriangle} tone="amber" />
        <StatCard label="Docs. vencidos" value={vencidos} icon={AlertTriangle} tone="red" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Buscar por placa, marca, modelo…"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30" />
        </div>
        {(["Todos", "Tracto", "Carreta"] as const).map((t) => (
          <button key={t} onClick={() => { setTipoFiltro(t); setPage(1); }}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${tipoFiltro === t ? "bg-brand-500 text-white" : "border border-slate-300 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-600"}`}>
            {t}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => exportar("csv")} className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700">
            <FileSpreadsheet size={15} /> Excel
          </button>
          <button onClick={() => exportar("pdf")} className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-700">
            <FileText size={15} /> PDF
          </button>
          {!readOnly ? (
            <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
              <Plus size={16} /> Nuevo vehículo
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {visibles.map((v) => {
          const docs: any[] = (v as any).documentos ?? [];
          return (
            <Card key={v.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <PhotoAvatar
                    base="vehiculos"
                    entityId={v.id}
                    foto={v.foto}
                    readOnly={readOnly}
                    onUploaded={reload}
                    fallback={<Truck size={20} />}
                  />
                  <div>
                    <div className="font-bold text-slate-900">{v.placa}</div>
                    <div className="text-xs text-slate-500">{v.tipo} · {v.marca} {v.modelo} · {v.anio}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {v.tipo !== "Carreta" ? <span className="hidden text-xs text-slate-400 sm:inline">{km(v.kilometraje)}</span> : null}
                  <Badge tone={estadoTone(v.estado)}>{v.estado}</Badge>
                  {!readOnly ? (
                    <button onClick={() => setEditVeh(v)} title="Editar vehículo" className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-brand-300 hover:text-brand-600">
                      <Pencil size={13} />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Documentos</div>
                {docs.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 px-3 py-3 text-center text-xs text-slate-400">Sin documentos registrados</p>
                ) : docs.map((d, i) => {
                  const est = estadoDocumento(d.vencimiento);
                  const dias = diasRestantes(d.vencimiento);
                  return (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-700">{d.tipo}</div>
                        <div className="truncate text-xs text-slate-400">{d.numero ? `N° ${d.numero} · ` : ""}vence {fecha(d.vencimiento)}</div>
                      </div>
                      {est === "Vigente" ? <Badge tone="green">Vigente</Badge>
                        : est === "Por vencer" ? <Badge tone="amber">Vence en {dias} d</Badge>
                        : <Badge tone="red">Vencido</Badge>}
                    </div>
                  );
                })}
              </div>

              <button onClick={() => setDocVeh(v)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600">
                <FolderOpen size={15} /> Gestionar documentos ({docs.length})
              </button>
            </Card>
          );
        })}
      </div>

      {filtrados.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-400">No hay vehículos para el filtro actual.</Card>
      ) : (
        <div className="mt-5 flex items-center justify-between text-sm text-slate-500">
          <span>{filtrados.length} unidad(es)</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(Math.max(1, current - 1))} disabled={current <= 1}
              className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1.5 hover:bg-slate-100 disabled:opacity-40">
              <ChevronLeft size={15} /> Anterior
            </button>
            <span className="px-2 tabular">Página {current} / {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages, current + 1))} disabled={current >= totalPages}
              className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1.5 hover:bg-slate-100 disabled:opacity-40">
              Siguiente <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      <FormModal open={open} title="Nuevo vehículo" subtitle="Registra un tracto o carreta en la flota." fields={buildFields()} onSubmit={guardar} onClose={() => setOpen(false)} />

      {editVeh ? (
        <FormModal open title={`Editar vehículo — ${editVeh.placa}`} subtitle="Modifica los datos de la unidad." fields={buildFields(editVeh)} submitLabel="Guardar cambios" onSubmit={guardarEdit} onClose={() => setEditVeh(null)} />
      ) : null}

      {docVeh ? (
        <DocumentosModal
          open
          base="vehiculos"
          entityId={docVeh.id}
          title={`Documentos — ${docVeh.placa}`}
          subtitle={`${docVeh.marca} ${docVeh.modelo}`}
          documentos={(docVeh as any).documentos ?? []}
          readOnly={readOnly}
          onChanged={(u) => setDocVeh(u)}
          onClose={() => { setDocVeh(null); reload(); }}
        />
      ) : null}
    </div>
  );
}
