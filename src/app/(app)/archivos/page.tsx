"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FolderArchive, Folder, FolderPlus, Upload, Download, Trash2, Pencil, ChevronRight, Home,
  CalendarPlus, FileText, FileSpreadsheet, Image as ImageIcon, File as FileIcon,
} from "lucide-react";
import { PageHeader, Card } from "@/components/ui";
import { FormModal, type FormValues } from "@/components/FormModal";
import { apiArchivos, fileToBase64, downloadBase64, type ListarArchivos, type ArchivoMeta } from "@/lib/api";
import { fecha } from "@/lib/format";

const fmtSize = (b: number) => (b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

function iconoArchivo(nombre: string, mime: string) {
  const ext = nombre.split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return { Icon: ImageIcon, cls: "text-violet-500" };
  if (["xls", "xlsx", "csv"].includes(ext)) return { Icon: FileSpreadsheet, cls: "text-emerald-600" };
  if (ext === "pdf") return { Icon: FileText, cls: "text-rose-500" };
  return { Icon: FileIcon, cls: "text-slate-400" };
}

export default function ArchivosPage() {
  const [carpetaId, setCarpetaId] = useState<string | null>(null);
  const [data, setData] = useState<ListarArchivos | null>(null);
  const [busy, setBusy] = useState(false);
  const [nuevaOpen, setNuevaOpen] = useState(false);
  const [renOpen, setRenOpen] = useState<{ id: string; nombre: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const seedTried = useRef(false);

  const cargar = useCallback(async (id: string | null) => {
    try {
      let r = await apiArchivos.listar(id ?? undefined);
      // Primera vez en la raíz vacía → crear la estructura base automáticamente.
      if (!id && r.subcarpetas.length === 0 && !seedTried.current) {
        seedTried.current = true;
        await apiArchivos.sembrar();
        r = await apiArchivos.listar(undefined);
      }
      setData(r);
    } catch { setData({ carpeta: null, ruta: [], subcarpetas: [], archivos: [] }); }
  }, []);

  useEffect(() => { cargar(carpetaId); }, [carpetaId, cargar]);

  const dentro = carpetaId !== null;

  async function crearCarpeta(v: FormValues) {
    setBusy(true);
    try { await apiArchivos.crearCarpeta(String(v.nombre).trim(), carpetaId ?? undefined); await cargar(carpetaId); }
    finally { setBusy(false); }
  }
  async function renombrar(v: FormValues) {
    if (!renOpen) return;
    setBusy(true);
    try { await apiArchivos.renombrar(renOpen.id, String(v.nombre).trim()); await cargar(carpetaId); }
    finally { setBusy(false); }
  }
  async function borrarCarpeta(id: string, nombre: string, esActual = false) {
    if (!confirm(`¿Eliminar la carpeta "${nombre}" y TODO su contenido? Esta acción no se puede deshacer.`)) return;
    setBusy(true);
    try {
      await apiArchivos.borrarCarpeta(id);
      if (esActual) setCarpetaId(data?.carpeta?.parentId ?? null);
      else await cargar(carpetaId);
    } finally { setBusy(false); }
  }
  async function crearMeses() {
    if (!carpetaId) return;
    if (!confirm("¿Crear las 12 carpetas de meses (Enero…Diciembre) aquí dentro?")) return;
    setBusy(true);
    try { await apiArchivos.crearMeses(carpetaId); await cargar(carpetaId); }
    finally { setBusy(false); }
  }
  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length || !carpetaId) return;
    setBusy(true);
    try {
      for (const f of files) {
        if (f.size > 20 * 1024 * 1024) { alert(`"${f.name}" supera los 20 MB y no se subió.`); continue; }
        const base64 = await fileToBase64(f);
        await apiArchivos.subir({ carpetaId, nombre: f.name, mime: f.type, base64 });
      }
      await cargar(carpetaId);
    } catch (err) { alert((err as Error).message || "No se pudo subir el archivo."); }
    finally { setBusy(false); }
  }
  async function descargar(a: ArchivoMeta) {
    setBusy(true);
    try { const r = await apiArchivos.descargar(a.id); downloadBase64(r.nombre, r.mime, r.base64); }
    finally { setBusy(false); }
  }
  async function borrarArchivo(a: ArchivoMeta) {
    if (!confirm(`¿Eliminar el archivo "${a.nombre}"?`)) return;
    setBusy(true);
    try { await apiArchivos.borrarArchivo(a.id); await cargar(carpetaId); }
    finally { setBusy(false); }
  }

  const sub = data?.subcarpetas ?? [];
  const archivos = data?.archivos ?? [];
  const vacio = sub.length === 0 && archivos.length === 0;

  return (
    <div>
      <PageHeader modulo="13" title="Archivos" subtitle="Gestor documental por empresa: contabilidad, planilla, bancos, tributos y más. Carpetas anidadas (por mes) y archivos hasta 20 MB." />

      {/* Migas de pan */}
      <div className="mb-4 flex flex-wrap items-center gap-1 text-sm">
        <button onClick={() => setCarpetaId(null)} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium ${!dentro ? "text-brand-700" : "text-slate-500 hover:bg-slate-100 hover:text-brand-600"}`}>
          <Home size={15} /> Inicio
        </button>
        {(data?.ruta ?? []).map((r, i, arr) => (
          <span key={r.id} className="flex items-center gap-1">
            <ChevronRight size={14} className="text-slate-300" />
            <button onClick={() => setCarpetaId(r.id)} className={`rounded-md px-2 py-1 font-medium ${i === arr.length - 1 ? "text-brand-700" : "text-slate-500 hover:bg-slate-100 hover:text-brand-600"}`}>{r.nombre}</button>
          </span>
        ))}
      </div>

      {/* Barra de acciones */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button onClick={() => setNuevaOpen(true)} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
          <FolderPlus size={16} /> Nueva carpeta
        </button>
        {dentro ? (
          <>
            <button onClick={() => fileRef.current?.click()} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600 disabled:opacity-50">
              <Upload size={16} /> Subir archivo
            </button>
            <button onClick={crearMeses} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600 disabled:opacity-50">
              <CalendarPlus size={16} /> Crear 12 meses
            </button>
            {data?.carpeta ? (
              <button onClick={() => borrarCarpeta(data.carpeta!.id, data.carpeta!.nombre, true)} disabled={busy} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50">
                <Trash2 size={15} /> Eliminar esta carpeta
              </button>
            ) : null}
          </>
        ) : null}
        <input ref={fileRef} type="file" multiple hidden onChange={onFiles} />
      </div>

      {busy ? <div className="mb-3 text-xs text-slate-400">Procesando…</div> : null}

      {/* Carpetas */}
      {sub.length > 0 ? (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sub.map((c) => (
            <Card key={c.id} className="group flex items-center gap-3 p-4 transition hover:shadow-md">
              <button onClick={() => setCarpetaId(c.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600"><Folder size={20} /></span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-800">{c.nombre}</span>
                  <span className="block text-xs text-slate-400">{c.items} elemento{c.items === 1 ? "" : "s"}</span>
                </span>
              </button>
              <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                <button onClick={() => setRenOpen({ id: c.id, nombre: c.nombre })} title="Renombrar" className="rounded-md p-1.5 text-slate-400 hover:bg-steel-50 hover:text-steel-600"><Pencil size={15} /></button>
                <button onClick={() => borrarCarpeta(c.id, c.nombre)} title="Eliminar" className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {/* Archivos */}
      {archivos.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="divide-y divide-slate-100">
            {archivos.map((a) => {
              const { Icon, cls } = iconoArchivo(a.nombre, a.mime);
              return (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60">
                  <Icon size={20} className={`shrink-0 ${cls}`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-800">{a.nombre}</div>
                    <div className="text-xs text-slate-400">{fmtSize(a.size)} · {fecha((a.createdAt || "").slice(0, 10))}</div>
                  </div>
                  <button onClick={() => descargar(a)} disabled={busy} title="Descargar" className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-brand-300 hover:text-brand-600 disabled:opacity-50"><Download size={15} /></button>
                  <button onClick={() => borrarArchivo(a)} disabled={busy} title="Eliminar" className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"><Trash2 size={15} /></button>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {vacio ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <FolderArchive size={32} className="text-slate-300" />
          <p className="text-sm text-slate-400">{dentro ? "Esta carpeta está vacía. Crea subcarpetas o sube archivos." : "No hay carpetas todavía."}</p>
        </Card>
      ) : null}

      <FormModal
        open={nuevaOpen}
        title="Nueva carpeta"
        subtitle={dentro ? `Se creará dentro de "${data?.carpeta?.nombre}".` : "Se creará en la raíz."}
        fields={[{ name: "nombre", label: "Nombre de la carpeta", type: "text", required: true, full: true, placeholder: "Ej. Facturas Enero" }]}
        submitLabel="Crear"
        onSubmit={crearCarpeta}
        onClose={() => setNuevaOpen(false)}
      />
      {renOpen ? (
        <FormModal
          open
          title="Renombrar carpeta"
          fields={[{ name: "nombre", label: "Nuevo nombre", type: "text", required: true, full: true, default: renOpen.nombre }]}
          submitLabel="Guardar"
          onSubmit={renombrar}
          onClose={() => setRenOpen(null)}
        />
      ) : null}
    </div>
  );
}
