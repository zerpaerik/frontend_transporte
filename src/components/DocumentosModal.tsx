"use client";

import { useEffect, useRef, useState } from "react";
import { X, Download, Pencil, Trash2, Paperclip, Plus, FileText } from "lucide-react";
import { Badge } from "./ui";
import { apiDocs, fileToBase64, downloadBase64, type DocumentoInput } from "@/lib/api";
import { fecha, diasRestantes, estadoDocumento } from "@/lib/format";

interface Doc {
  id: string; tipo: string; numero: string; vencimiento: string;
  archivoNombre?: string | null; archivoMime?: string | null;
}

export function DocumentosModal({
  open, onClose, title, subtitle, base, entityId, documentos, onChanged,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  base: "conductores" | "vehiculos";
  entityId: string;
  documentos: Doc[];
  onChanged?: (updated: any) => void;
}) {
  const [docs, setDocs] = useState<Doc[]>(documentos);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // alta
  const [tipo, setTipo] = useState("");
  const [numero, setNumero] = useState("");
  const [venc, setVenc] = useState("");
  const addFileRef = useRef<HTMLInputElement>(null);
  // edición
  const [editId, setEditId] = useState<string | null>(null);
  const [eTipo, setETipo] = useState("");
  const [eNumero, setENumero] = useState("");
  const [eVenc, setEVenc] = useState("");
  const editFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setDocs(documentos); setError(""); setEditId(null); setTipo(""); setNumero(""); setVenc(""); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function abrirEdicion(d: Doc) {
    if (editId === d.id) { setEditId(null); return; }
    setEditId(d.id);
    setETipo(d.tipo || "");
    setENumero(d.numero || "");
    setEVenc((d.vencimiento || "").slice(0, 10));
    setError("");
    if (editFileRef.current) editFileRef.current.value = "";
  }

  if (!open) return null;

  function refresh(updated: any) {
    setDocs(updated?.documentos ?? []);
    onChanged?.(updated);
  }

  async function fileField(ref: React.RefObject<HTMLInputElement | null>): Promise<Partial<DocumentoInput>> {
    const f = ref.current?.files?.[0];
    if (!f) return {};
    if (f.type && f.type !== "application/pdf") throw new Error("El archivo debe ser un PDF.");
    return { archivoBase64: await fileToBase64(f), archivoNombre: f.name, archivoMime: f.type || "application/pdf" };
  }

  async function doAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!tipo.trim() || !venc) { setError("Tipo y fecha de vencimiento son obligatorios."); return; }
    setBusy(true); setError("");
    try {
      const arch = await fileField(addFileRef);
      const updated = await apiDocs.add(base, entityId, { tipo, numero, vencimiento: venc, ...arch });
      refresh(updated);
      setTipo(""); setNumero(""); setVenc("");
      if (addFileRef.current) addFileRef.current.value = "";
    } catch (err: any) { setError(err.message || "No se pudo agregar el documento."); }
    finally { setBusy(false); }
  }

  async function doEditar(docId: string) {
    if (!eTipo.trim()) { setError("El tipo de documento es obligatorio."); return; }
    if (!eVenc) { setError("Indica la fecha de vencimiento."); return; }
    setBusy(true); setError("");
    try {
      const arch = await fileField(editFileRef);
      const updated = await apiDocs.renovar(base, entityId, docId, {
        tipo: eTipo.trim(), numero: eNumero.trim(), vencimiento: eVenc, ...arch,
      });
      refresh(updated);
      setEditId(null);
      if (editFileRef.current) editFileRef.current.value = "";
    } catch (err: any) { setError(err.message || "No se pudo guardar el documento."); }
    finally { setBusy(false); }
  }

  async function doDelete(docId: string) {
    if (!confirm("¿Eliminar este documento?")) return;
    setBusy(true); setError("");
    try { refresh(await apiDocs.remove(base, entityId, docId)); }
    catch (err: any) { setError(err.message || "No se pudo eliminar."); }
    finally { setBusy(false); }
  }

  async function doDownload(docId: string) {
    setError("");
    try { const a = await apiDocs.archivo(base, entityId, docId); downloadBase64(a.nombre, a.mime, a.base64); }
    catch (err: any) { setError(err.message || "No se pudo descargar."); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-6">
      <div className="mt-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="Cerrar"><X size={20} /></button>
        </div>

        <div className="px-6 py-5">
          {error ? <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">{error}</div> : null}

          {/* Lista de documentos */}
          <div className="space-y-2">
            {docs.length === 0 ? <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">Sin documentos registrados</p> : null}
            {docs.map((d) => {
              const est = estadoDocumento(d.vencimiento);
              const dias = diasRestantes(d.vencimiento);
              return (
                <div key={d.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-800">{d.tipo}</span>
                        {d.archivoNombre ? <FileText size={14} className="shrink-0 text-brand-500" /> : null}
                      </div>
                      <div className="truncate text-xs text-slate-400">{d.numero ? `N° ${d.numero} · ` : ""}vence {fecha(d.vencimiento)}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {est === "Vigente" ? <Badge tone="green">Vigente</Badge> : est === "Por vencer" ? <Badge tone="amber">En {dias} d</Badge> : <Badge tone="red">Vencido</Badge>}
                      {d.archivoNombre ? (
                        <button onClick={() => doDownload(d.id)} title="Descargar PDF" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-600"><Download size={16} /></button>
                      ) : null}
                      <button onClick={() => abrirEdicion(d)} title="Editar" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"><Pencil size={16} /></button>
                      <button onClick={() => doDelete(d.id)} title="Eliminar" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-rose-600"><Trash2 size={16} /></button>
                    </div>
                  </div>

                  {editId === d.id ? (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-500">Tipo *</label>
                          <input value={eTipo} onChange={(e) => setETipo(e.target.value)} placeholder="Ej. Curso seguridad portuaria" className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-500">N° documento</label>
                          <input value={eNumero} onChange={(e) => setENumero(e.target.value)} placeholder="Ej. 022-2018-APN/OCP/PS" className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-500">Fecha de vencimiento *</label>
                          <input type="date" value={eVenc} onChange={(e) => setEVenc(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-500">Reemplazar PDF (opcional)</label>
                          <input ref={editFileRef} type="file" accept="application/pdf" className="block w-full text-xs text-slate-500 file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs" />
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <button onClick={() => setEditId(null)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
                        <button disabled={busy} onClick={() => doEditar(d.id)} className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">{busy ? "Guardando…" : "Guardar cambios"}</button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Alta de documento */}
          <form onSubmit={doAdd} className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><Plus size={15} /> Agregar documento</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Tipo *</label>
                <input value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Ej. Licencia, SOAT, Tarjeta de propiedad" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">N° documento</label>
                <input value={numero} onChange={(e) => setNumero(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Vence *</label>
                <input type="date" value={venc} onChange={(e) => setVenc(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500"><Paperclip size={11} className="mr-1 inline" />Archivo PDF</label>
                <input ref={addFileRef} type="file" accept="application/pdf" className="block w-full text-xs text-slate-500 file:mr-2 file:rounded file:border-0 file:bg-slate-200 file:px-2 file:py-1.5 file:text-xs" />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button type="submit" disabled={busy} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">{busy ? "Guardando…" : "Agregar documento"}</button>
            </div>
          </form>
        </div>

        <div className="flex justify-end border-t border-slate-200 px-6 py-3">
          <button onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
