"use client";

import { useMemo, useState } from "react";
import { Plus, IdCard, Phone, AlertTriangle, Search, FileSpreadsheet, FileText, ChevronLeft, ChevronRight, FolderOpen, Pencil } from "lucide-react";
import { PageHeader, StatCard, Card, Badge } from "@/components/ui";
import { FormModal, type Field, type FormValues } from "@/components/FormModal";
import { DocumentosModal } from "@/components/DocumentosModal";
import { PhotoAvatar } from "@/components/PhotoAvatar";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { fecha, diasRestantes, estadoDocumento } from "@/lib/format";
import { exportCSV, exportPDF } from "@/lib/export";

const fields: Field[] = [
  { name: "nombre", label: "Nombre completo", type: "text", required: true, placeholder: "Julio Grimaldo", full: true },
  { name: "licencia", label: "N° de licencia", type: "text", required: true, placeholder: "Q40128761" },
  { name: "categoria", label: "Categoría", type: "select", options: ["A-IIIC", "A-IIIB", "A-IIIA", "A-IIB"] },
  { name: "telefono", label: "Teléfono", type: "text", placeholder: "987 654 321" },
  { name: "descuentoMensual", label: "Descuento de planilla mensual (S/)", type: "number", default: 0 },
  { name: "docTipo", label: "Documento inicial", type: "select", options: ["Licencia de conducir", "Certificado MTC", "Examen médico", "SCTR"] },
  { name: "docVencimiento", label: "Vence el", type: "date", required: true },
];

const PAGE = 6;

export default function ConductoresPage() {
  const { conductores, addConductor, updateConductor, reload } = useData();
  const { user } = useAuth();
  const readOnly = user?.rol === "Conductor";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [docCond, setDocCond] = useState<any | null>(null);
  const [editCond, setEditCond] = useState<any | null>(null);

  const editFields = (c: any): Field[] => [
    { name: "nombre", label: "Nombre completo", type: "text", required: true, full: true, default: c?.nombre },
    { name: "licencia", label: "N° de licencia", type: "text", required: true, default: c?.licencia },
    { name: "categoria", label: "Categoría", type: "select", options: ["A-IIIC", "A-IIIB", "A-IIIA", "A-IIB"], default: c?.categoria },
    { name: "telefono", label: "Teléfono", type: "text", default: c?.telefono },
    { name: "descuentoMensual", label: "Descuento de planilla mensual (S/)", type: "number", default: c?.descuentoMensual ?? 0 },
  ];
  function guardarEdit(v: FormValues) {
    if (editCond) updateConductor(editCond.id, { nombre: String(v.nombre), licencia: String(v.licencia), categoria: String(v.categoria), telefono: String(v.telefono), descuentoMensual: Number(v.descuentoMensual) });
  }

  const docsEstados = conductores.flatMap((c) => c.documentos.map((d) => estadoDocumento(d.vencimiento)));
  const porVencer = docsEstados.filter((e) => e === "Por vencer").length;
  const vencidos = docsEstados.filter((e) => e === "Vencido").length;

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conductores;
    return conductores.filter((c) => `${c.nombre} ${c.licencia} ${c.categoria}`.toLowerCase().includes(q));
  }, [conductores, query]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE));
  const current = Math.min(page, totalPages);
  const visibles = filtrados.slice((current - 1) * PAGE, current * PAGE);

  function guardar(v: FormValues) {
    addConductor({
      nombre: String(v.nombre), licencia: String(v.licencia), categoria: String(v.categoria), telefono: String(v.telefono), descuentoMensual: Number(v.descuentoMensual),
      documentos: [{ tipo: String(v.docTipo), numero: String(v.licencia), vencimiento: String(v.docVencimiento) }],
    });
  }

  function exportar(kind: "csv" | "pdf") {
    const headers = ["Conductor", "Licencia", "Categoría", "Teléfono", "Documento", "N° documento", "Vence", "Estado"];
    const rows = conductores.flatMap((c) =>
      c.documentos.map((d) => [c.nombre, c.licencia, c.categoria, c.telefono, d.tipo, d.numero, fecha(d.vencimiento), estadoDocumento(d.vencimiento)]),
    );
    if (kind === "csv") exportCSV("conductores-documentos", headers, rows);
    else exportPDF("Conductores y documentos", headers, rows, `${conductores.length} conductores`);
  }

  return (
    <div>
      <PageHeader modulo="02" title="Conductores" subtitle="Datos del conductor y sus documentos. El sistema alerta 15–20 días antes de cada vencimiento." />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="Conductores" value={conductores.length} icon={IdCard} tone="blue" />
        <StatCard label="Docs. por vencer" value={porVencer} icon={AlertTriangle} tone="amber" />
        <StatCard label="Docs. vencidos" value={vencidos} icon={AlertTriangle} tone="red" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Buscar conductor…"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => exportar("csv")} className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700">
            <FileSpreadsheet size={15} /> Excel
          </button>
          <button onClick={() => exportar("pdf")} className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-700">
            <FileText size={15} /> PDF
          </button>
          {!readOnly ? (
            <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
              <Plus size={16} /> Nuevo conductor
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {visibles.map((c) => (
          <Card key={c.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <PhotoAvatar
                  base="conductores"
                  entityId={c.id}
                  foto={c.foto}
                  readOnly={readOnly}
                  onUploaded={reload}
                  fallback={<span className="text-sm font-bold">{c.nombre.split(" ").slice(0, 2).map((s) => s[0]).join("")}</span>}
                />
                <div>
                  <div className="font-bold text-slate-900">{c.nombre}</div>
                  <div className="text-xs text-slate-500">Licencia {c.licencia} · Cat. {c.categoria}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={`tel:${c.telefono.replace(/\s/g, "")}`} className="flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600">
                  <Phone size={13} /> {c.telefono}
                </a>
                {!readOnly ? (
                  <button onClick={() => setEditCond(c)} title="Editar conductor" className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-brand-300 hover:text-brand-600">
                    <Pencil size={13} />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Documentos</div>
              {c.documentos.map((d, i) => {
                const est = estadoDocumento(d.vencimiento);
                const dias = diasRestantes(d.vencimiento);
                return (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-700">{d.tipo}</div>
                      <div className="truncate text-xs text-slate-400">N° {d.numero} · vence {fecha(d.vencimiento)}</div>
                    </div>
                    {est === "Vigente" ? <Badge tone="green">Vigente</Badge>
                      : est === "Por vencer" ? <Badge tone="amber">Vence en {dias} d</Badge>
                      : <Badge tone="red">Vencido</Badge>}
                  </div>
                );
              })}
            </div>

            <button onClick={() => setDocCond(c)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600">
              <FolderOpen size={15} /> Gestionar documentos ({c.documentos.length})
            </button>
          </Card>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between text-sm text-slate-500">
        <span>{filtrados.length} conductor(es)</span>
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

      <FormModal open={open} title="Nuevo conductor" subtitle="Registra al conductor con su primer documento y fecha de vencimiento." fields={fields} onSubmit={guardar} onClose={() => setOpen(false)} />

      {editCond ? (
        <FormModal open title={`Editar conductor — ${editCond.nombre}`} subtitle="Modifica los datos del conductor." fields={editFields(editCond)} submitLabel="Guardar cambios" onSubmit={guardarEdit} onClose={() => setEditCond(null)} />
      ) : null}

      {docCond ? (
        <DocumentosModal
          open
          base="conductores"
          entityId={docCond.id}
          title={`Documentos — ${docCond.nombre}`}
          subtitle={`Licencia ${docCond.licencia}`}
          documentos={docCond.documentos ?? []}
          readOnly={readOnly}
          onChanged={(u) => setDocCond(u)}
          onClose={() => { setDocCond(null); reload(); }}
        />
      ) : null}
    </div>
  );
}
