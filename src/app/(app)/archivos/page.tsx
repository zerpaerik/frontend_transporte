"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FolderArchive, Folder, FolderPlus, Upload, Download, Trash2, Pencil, ChevronRight, Home,
  CalendarPlus, FileText, FileSpreadsheet, Image as ImageIcon, File as FileIcon, Eye, X, GripVertical, FolderInput,
} from "lucide-react";
import { PageHeader, Card } from "@/components/ui";
import { FormModal, type FormValues } from "@/components/FormModal";
import { apiArchivos, fileToBase64, downloadBase64, ApiError, type ListarArchivos, type ArchivoMeta } from "@/lib/api";
import { fecha } from "@/lib/format";

const fmtSize = (b: number) => (b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);
const MAX_BYTES = 20 * 1024 * 1024;

// Misma regla que el backend: dos archivos se llaman igual sin importar mayúsculas,
// espacios de sobra ni cómo venga codificada la tilde ("Factura.pdf" = "factura.pdf").
const claveNombre = (nombre: string) => nombre.normalize("NFC").trim().toLocaleLowerCase("es");

// Tipo propio del arrastre: así las carpetas solo reaccionan a archivos arrastrados desde
// esta misma pantalla (no a textos ni a archivos soltados desde el escritorio).
const TIPO_DRAG = "application/x-ft-archivos";
const esArrastreInterno = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes(TIPO_DRAG);

function base64ToUrl(base64: string, mime: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}
const previsualizable = (nombre: string, mime: string) => {
  const ext = nombre.split(".").pop()?.toLowerCase() ?? "";
  return mime.startsWith("image/") || mime === "application/pdf" || ext === "pdf" || ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
};

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
  const [renArchivo, setRenArchivo] = useState<{ id: string; nombre: string } | null>(null);
  const [preview, setPreview] = useState<{ url: string; mime: string; nombre: string } | null>(null);
  // Selección y arrastre de archivos para moverlos a otra carpeta.
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [ultimo, setUltimo] = useState<number | null>(null); // para seleccionar un rango con Shift
  const [arrastrando, setArrastrando] = useState<string[] | null>(null);
  const [destinoHover, setDestinoHover] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
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
  // Al cambiar de carpeta la selección anterior deja de tener sentido.
  useEffect(() => { setSel(new Set()); setUltimo(null); }, [carpetaId]);
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(""), 4000);
    return () => clearTimeout(t);
  }, [aviso]);

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
    // Nombres ya presentes en la carpeta (y los que se van subiendo en este mismo lote).
    const ocupados = new Set((data?.archivos ?? []).map((a) => claveNombre(a.nombre)));
    const rechazados: { nombre: string; motivo: string }[] = [];
    let subidos = 0;
    try {
      for (const f of files) {
        const clave = claveNombre(f.name);
        if (ocupados.has(clave)) { rechazados.push({ nombre: f.name, motivo: "ya existe un archivo con ese nombre" }); continue; }
        if (f.size > MAX_BYTES) { rechazados.push({ nombre: f.name, motivo: "supera los 20 MB" }); continue; }
        try {
          const base64 = await fileToBase64(f);
          await apiArchivos.subir({ carpetaId, nombre: f.name, mime: f.type, base64 });
          ocupados.add(clave);
          subidos++;
        } catch (err) {
          // El backend también lo valida (p. ej. si otra persona lo subió hace un momento).
          const motivo = err instanceof ApiError && err.status === 409 ? "ya existe un archivo con ese nombre" : (err as Error).message || "no se pudo subir";
          rechazados.push({ nombre: f.name, motivo });
        }
      }
      await cargar(carpetaId);
    } finally { setBusy(false); }

    if (rechazados.length === 1 && files.length === 1) {
      const r = rechazados[0];
      alert(r.motivo === "ya existe un archivo con ese nombre"
        ? `No se puede subir "${r.nombre}" porque ya existe un archivo con ese nombre en esta carpeta.`
        : `No se pudo subir "${r.nombre}": ${r.motivo}.`);
    } else if (rechazados.length) {
      const ok = subidos === 0 ? "" : subidos === 1 ? "Se subió 1 archivo. " : `Se subieron ${subidos} archivos. `;
      alert(`${ok}No se subieron:\n\n${rechazados.map((r) => `• ${r.nombre} — ${r.motivo}`).join("\n")}`);
    }
  }
  async function descargar(a: ArchivoMeta) {
    setBusy(true);
    try { const r = await apiArchivos.descargar(a.id); downloadBase64(r.nombre, r.mime, r.base64); }
    finally { setBusy(false); }
  }
  async function vistaPrevia(a: ArchivoMeta) {
    setBusy(true);
    try {
      const r = await apiArchivos.descargar(a.id);
      setPreview({ url: base64ToUrl(r.base64, r.mime), mime: r.mime, nombre: r.nombre });
    } catch { alert("No se pudo abrir la vista previa."); }
    finally { setBusy(false); }
  }
  function cerrarPreview() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }
  async function renombrarArchivo(v: FormValues) {
    if (!renArchivo) return;
    const nuevo = String(v.nombre).trim();
    // Misma regla que al subir. El backend lo vuelve a validar.
    if ((data?.archivos ?? []).some((a) => a.id !== renArchivo.id && claveNombre(a.nombre) === claveNombre(nuevo))) {
      alert(`Ya existe un archivo llamado "${nuevo}" en esta carpeta.`);
      return;
    }
    setBusy(true);
    try { await apiArchivos.renombrarArchivo(renArchivo.id, nuevo); await cargar(carpetaId); }
    catch (err) { alert((err as Error).message || "No se pudo renombrar el archivo."); }
    finally { setBusy(false); }
  }

  // ---- Selección ----
  function alternar(idx: number, shift: boolean) {
    const lista = data?.archivos ?? [];
    const id = lista[idx]?.id;
    if (!id) return;
    setSel((s) => {
      const n = new Set(s);
      if (shift && ultimo !== null) {
        // Shift: marca todo el rango entre el último tocado y este.
        const [a, b] = ultimo < idx ? [ultimo, idx] : [idx, ultimo];
        for (let i = a; i <= b; i++) n.add(lista[i].id);
      } else if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
    setUltimo(idx);
  }
  function alternarTodos() {
    const lista = data?.archivos ?? [];
    setSel((s) => (s.size === lista.length ? new Set() : new Set(lista.map((a) => a.id))));
  }

  // ---- Arrastrar y soltar ----
  function empezarArrastre(e: React.DragEvent, a: ArchivoMeta) {
    // Si arrastra uno que está seleccionado, se lleva toda la selección; si no, solo ese.
    const ids = sel.has(a.id) ? [...sel] : [a.id];
    if (!sel.has(a.id)) setSel(new Set([a.id]));
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(TIPO_DRAG, JSON.stringify(ids));
    // Etiqueta que acompaña al cursor mientras se arrastra.
    const ghost = document.createElement("div");
    ghost.textContent = ids.length === 1 ? a.nombre : `${ids.length} archivos`;
    ghost.style.cssText = "position:fixed;top:-100px;left:-100px;padding:6px 12px;border-radius:8px;background:#E5641C;color:#fff;font:600 13px system-ui,sans-serif;white-space:nowrap;max-width:280px;overflow:hidden;text-overflow:ellipsis;";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 14, 14);
    setTimeout(() => ghost.remove(), 0);
    setArrastrando(ids);
  }
  function terminarArrastre() { setArrastrando(null); setDestinoHover(null); }

  // Props para que una carpeta (tarjeta o miga de pan) reciba archivos soltados.
  function destinoDrop(id: string, nombre: string) {
    return {
      onDragOver: (e: React.DragEvent) => {
        if (!esArrastreInterno(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (destinoHover !== id) setDestinoHover(id);
      },
      onDragLeave: (e: React.DragEvent) => {
        // Pasar por encima de un hijo (ícono, texto) no cuenta como salir.
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setDestinoHover((h) => (h === id ? null : h));
      },
      onDrop: (e: React.DragEvent) => {
        if (!esArrastreInterno(e)) return;
        e.preventDefault();
        let ids: string[] = [];
        try { ids = JSON.parse(e.dataTransfer.getData(TIPO_DRAG) || "[]"); } catch { /* arrastre inválido */ }
        terminarArrastre();
        if (ids.length) moverA(ids, id, nombre);
      },
    };
  }

  async function moverA(ids: string[], destinoId: string, destinoNombre: string) {
    setBusy(true);
    try {
      const r = await apiArchivos.mover(ids, destinoId);
      setSel(new Set());
      setUltimo(null);
      await cargar(carpetaId);
      if (r.movidos) setAviso(`${r.movidos === 1 ? "Se movió 1 archivo" : `Se movieron ${r.movidos} archivos`} a "${r.destino.nombre}".`);
      if (r.conflictos.length) {
        const destino = r.destino.nombre;
        const lista = r.conflictos.map((n) => `• ${n}`).join("\n");
        if (r.movidos === 0 && r.conflictos.length === 1) {
          alert(`No se puede mover "${r.conflictos[0]}" porque en "${destino}" ya existe un archivo con ese nombre.`);
        } else if (r.movidos === 0) {
          alert(`No se movió ningún archivo porque en "${destino}" ya existen archivos con estos nombres:\n\n${lista}`);
        } else {
          const hechos = r.movidos === 1 ? `Se movió 1 archivo a "${destino}".` : `Se movieron ${r.movidos} archivos a "${destino}".`;
          const cuales = r.conflictos.length === 1 ? "Este no se movió" : "Estos no se movieron";
          alert(`${hechos} ${cuales} porque en "${destino}" ya existe un archivo con el mismo nombre:\n\n${lista}`);
        }
      }
    } catch (err) { alert((err as Error).message || `No se pudieron mover los archivos a "${destinoNombre}".`); }
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
        {(data?.ruta ?? []).map((r, i, arr) => {
          const actual = i === arr.length - 1;
          // Las carpetas de arriba en la ruta aceptan archivos: así se puede "subir" un nivel.
          const soltable = !actual && !!arrastrando;
          return (
            <span key={r.id} className="flex items-center gap-1">
              <ChevronRight size={14} className="text-slate-300" />
              <button
                onClick={() => setCarpetaId(r.id)}
                {...(actual ? {} : destinoDrop(r.id, r.nombre))}
                className={`rounded-md px-2 py-1 font-medium transition ${
                  actual ? "text-brand-700"
                    : destinoHover === r.id ? "bg-brand-100 text-brand-700 ring-2 ring-brand-400"
                    : soltable ? "text-slate-600 outline-dashed outline-1 outline-brand-300"
                    : "text-slate-500 hover:bg-slate-100 hover:text-brand-600"
                }`}
              >
                {r.nombre}
              </button>
            </span>
          );
        })}
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
      {aviso && !busy ? (
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
          <FolderInput size={15} /> {aviso}
        </div>
      ) : null}

      {/* Carpetas */}
      {sub.length > 0 ? (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sub.map((c) => (
            <div key={c.id} {...destinoDrop(c.id, c.nombre)} className="rounded-2xl">
            <Card className={`group flex items-center gap-3 p-4 transition hover:shadow-md ${
              destinoHover === c.id ? "bg-brand-50 ring-2 ring-brand-400"
                : arrastrando ? "outline-dashed outline-2 outline-offset-2 outline-brand-300" : ""
            }`}>
              <button onClick={() => setCarpetaId(c.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${destinoHover === c.id ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-600"}`}>
                  {destinoHover === c.id ? <FolderInput size={20} /> : <Folder size={20} />}
                </span>
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
            </div>
          ))}
        </div>
      ) : null}

      {/* Archivos */}
      {archivos.length > 0 ? (
        <Card className="overflow-hidden">
          {/* Cabecera: seleccionar todo y ayuda para mover */}
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-xs">
            <input
              type="checkbox"
              aria-label="Seleccionar todos los archivos"
              checked={sel.size > 0 && sel.size === archivos.length}
              ref={(el) => { if (el) el.indeterminate = sel.size > 0 && sel.size < archivos.length; }}
              onChange={alternarTodos}
              className="h-4 w-4 cursor-pointer accent-brand-500"
            />
            {sel.size ? (
              <>
                <span className="font-semibold text-slate-700">{sel.size} seleccionado{sel.size === 1 ? "" : "s"}</span>
                <span className="text-slate-500">· arrástralos a una carpeta para moverlos</span>
                <button onClick={() => { setSel(new Set()); setUltimo(null); }} className="ml-auto font-semibold text-slate-400 hover:text-brand-600">Quitar selección</button>
              </>
            ) : (
              <span className="text-slate-400">{archivos.length} archivo{archivos.length === 1 ? "" : "s"} · marca varios (Shift para un rango) y arrástralos a una carpeta</span>
            )}
          </div>
          <div className="divide-y divide-slate-100">
            {archivos.map((a, idx) => {
              const { Icon, cls } = iconoArchivo(a.nombre, a.mime);
              const marcado = sel.has(a.id);
              const enArrastre = !!arrastrando?.includes(a.id);
              return (
                <div
                  key={a.id}
                  draggable={!busy}
                  onDragStart={(e) => empezarArrastre(e, a)}
                  onDragEnd={terminarArrastre}
                  // Clic en la fila (fuera de los botones) marca o desmarca el archivo.
                  onClick={(e) => { if ((e.target as HTMLElement).closest("button, input, a")) return; alternar(idx, e.shiftKey); }}
                  className={`group flex cursor-pointer select-none items-center gap-3 px-4 py-3 transition ${enArrastre ? "opacity-40" : ""} ${marcado ? "bg-brand-50/70" : "hover:bg-slate-50/60"}`}
                >
                  <GripVertical size={15} className="-mx-1.5 shrink-0 cursor-grab text-slate-300 opacity-0 transition group-hover:opacity-100" />
                  <input
                    type="checkbox"
                    aria-label={`Seleccionar ${a.nombre}`}
                    checked={marcado}
                    onChange={() => { /* lo maneja onClick para poder leer Shift */ }}
                    onClick={(e) => alternar(idx, e.shiftKey)}
                    className="h-4 w-4 shrink-0 cursor-pointer accent-brand-500"
                  />
                  <Icon size={20} className={`shrink-0 ${cls}`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-800">{a.nombre}</div>
                    <div className="text-xs text-slate-400">{fmtSize(a.size)} · {fecha((a.createdAt || "").slice(0, 10))}</div>
                  </div>
                  {previsualizable(a.nombre, a.mime) ? (
                    <button onClick={() => vistaPrevia(a)} disabled={busy} title="Vista previa" className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-brand-300 hover:text-brand-600 disabled:opacity-50"><Eye size={15} /></button>
                  ) : null}
                  <button onClick={() => setRenArchivo({ id: a.id, nombre: a.nombre })} disabled={busy} title="Renombrar" className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-steel-300 hover:text-steel-600 disabled:opacity-50"><Pencil size={15} /></button>
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
      {renArchivo ? (
        <FormModal
          open
          title="Renombrar archivo"
          subtitle="Puedes cambiar el nombre manteniendo la extensión (p. ej. .pdf, .xlsx)."
          fields={[{ name: "nombre", label: "Nuevo nombre", type: "text", required: true, full: true, default: renArchivo.nombre }]}
          submitLabel="Guardar"
          onSubmit={renombrarArchivo}
          onClose={() => setRenArchivo(null)}
        />
      ) : null}

      {preview ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/70 p-4 sm:p-8" onClick={cerrarPreview}>
          <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
              <div className="min-w-0 truncate text-sm font-semibold text-slate-800">{preview.nombre}</div>
              <div className="flex shrink-0 items-center gap-2">
                <a href={preview.url} download={preview.nombre} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600"><Download size={14} /> Descargar</a>
                <button onClick={cerrarPreview} className="rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="Cerrar"><X size={20} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-slate-50">
              {preview.mime.startsWith("image/") ? (
                <div className="grid h-full place-items-center p-4"><img src={preview.url} alt={preview.nombre} className="max-h-full max-w-full object-contain" /></div>
              ) : (
                <iframe src={preview.url} title={preview.nombre} className="h-full w-full" />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
