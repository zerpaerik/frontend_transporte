"use client";

import { useEffect, useState } from "react";
import { FolderCog, Plus, Trash2, Pencil, Building2, Anchor, Tags } from "lucide-react";
import { PageHeader, Card } from "@/components/ui";
import { FormModal, type Field, type FormValues } from "@/components/FormModal";
import { apiClientes, apiPuertos, apiTipos, type Cliente, type Puerto, type TipoOperacion } from "@/lib/api";

export default function CatalogosPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [puertos, setPuertos] = useState<Puerto[]>([]);
  const [tipos, setTipos] = useState<TipoOperacion[]>([]);
  const [cNombre, setCNombre] = useState("");
  const [cRuc, setCRuc] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cTel, setCTel] = useState("");
  const [cContacto, setCContacto] = useState("");
  const [cDireccion, setCDireccion] = useState("");
  const [pNombre, setPNombre] = useState("");
  const [tNombre, setTNombre] = useState("");
  const [busy, setBusy] = useState(false);
  const [editC, setEditC] = useState<Cliente | null>(null);
  const [editP, setEditP] = useState<Puerto | null>(null);
  const [editT, setEditT] = useState<TipoOperacion | null>(null);

  const clienteFields = (c: Cliente): Field[] => [
    { name: "nombre", label: "Nombre del cliente", type: "text", required: true, full: true, default: c.nombre },
    { name: "ruc", label: "RUC", type: "text", default: c.ruc },
    { name: "email", label: "Correo", type: "text", default: c.email },
    { name: "telefono", label: "Teléfono", type: "text", default: c.telefono },
    { name: "contacto", label: "Persona de contacto", type: "text", default: c.contacto },
    { name: "direccion", label: "Dirección (para facturar)", type: "text", full: true, default: c.direccion },
  ];
  async function guardarCliente(v: FormValues) {
    if (!editC) return;
    await apiClientes.update(editC.id, { nombre: String(v.nombre), ruc: String(v.ruc), email: String(v.email), telefono: String(v.telefono), contacto: String(v.contacto), direccion: String(v.direccion) });
    cargar();
  }
  async function guardarPuerto(v: FormValues) {
    if (!editP) return;
    await apiPuertos.update(editP.id, String(v.nombre)); cargar();
  }
  async function guardarTipo(v: FormValues) {
    if (!editT) return;
    await apiTipos.update(editT.id, String(v.nombre)); cargar();
  }

  function cargar() {
    apiClientes.list().then(setClientes).catch(() => setClientes([]));
    apiPuertos.list().then(setPuertos).catch(() => setPuertos([]));
    apiTipos.list().then(setTipos).catch(() => setTipos([]));
  }
  useEffect(() => { cargar(); }, []);

  async function addCliente(e: React.FormEvent) {
    e.preventDefault(); if (!cNombre.trim()) return; setBusy(true);
    try {
      await apiClientes.create({ nombre: cNombre.trim(), ruc: cRuc.trim(), email: cEmail.trim(), telefono: cTel.trim(), contacto: cContacto.trim(), direccion: cDireccion.trim() });
      setCNombre(""); setCRuc(""); setCEmail(""); setCTel(""); setCContacto(""); setCDireccion(""); cargar();
    } finally { setBusy(false); }
  }
  async function addPuerto(e: React.FormEvent) {
    e.preventDefault(); if (!pNombre.trim()) return; setBusy(true);
    try { await apiPuertos.create({ nombre: pNombre.trim() }); setPNombre(""); cargar(); } finally { setBusy(false); }
  }
  async function addTipo(e: React.FormEvent) {
    e.preventDefault(); if (!tNombre.trim()) return; setBusy(true);
    try { await apiTipos.create(tNombre.trim()); setTNombre(""); cargar(); } finally { setBusy(false); }
  }

  const inp = "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500";
  const addBtn = "flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50";
  const delBtn = "rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600";
  const editBtn = "rounded-md p-1.5 text-slate-400 hover:bg-steel-50 hover:text-steel-600";

  return (
    <div>
      <PageHeader title="Catálogos" subtitle="Listas maestras que alimentan los formularios (clientes, puertos y tipos de operación)." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Clientes */}
        <Card className="flex flex-col p-5">
          <div className="mb-4 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-steel-50 text-steel-600"><Building2 size={16} /></span><h2 className="font-bold text-slate-800">Clientes</h2><span className="ml-auto text-xs text-slate-400">{clientes.length}</span></div>
          <form onSubmit={addCliente} className="mb-3 space-y-2">
            <input value={cNombre} onChange={(e) => setCNombre(e.target.value)} placeholder="Nombre del cliente" className={`${inp} w-full`} />
            <input value={cRuc} onChange={(e) => setCRuc(e.target.value)} placeholder="RUC" className={`${inp} w-full`} />
            <input value={cEmail} onChange={(e) => setCEmail(e.target.value)} placeholder="Correo" className={`${inp} w-full`} />
            <input value={cDireccion} onChange={(e) => setCDireccion(e.target.value)} placeholder="Dirección (para facturar)" className={`${inp} w-full`} />
            <div className="flex gap-2">
              <input value={cTel} onChange={(e) => setCTel(e.target.value)} placeholder="Teléfono" className={`${inp} w-28`} />
              <input value={cContacto} onChange={(e) => setCContacto(e.target.value)} placeholder="Persona de contacto" className={`${inp} flex-1`} />
              <button type="submit" disabled={busy} className={addBtn}><Plus size={15} /></button>
            </div>
          </form>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {clientes.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-2 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-800">{c.nombre}</div>
                  <div className="text-xs text-slate-400">RUC {c.ruc || "—"}{c.contacto ? ` · ${c.contacto}` : ""}</div>
                  {(c.telefono || c.email) ? <div className="truncate text-xs text-slate-400">{[c.telefono, c.email].filter(Boolean).join(" · ")}</div> : null}
                  {c.direccion ? <div className="truncate text-xs text-slate-400">📍 {c.direccion}</div> : null}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditC(c)} title="Editar" className={editBtn}><Pencil size={14} /></button>
                  <button onClick={() => { if (confirm(`¿Eliminar ${c.nombre}?`)) apiClientes.remove(c.id).then(cargar); }} className={delBtn}><Trash2 size={15} /></button>
                </div>
              </li>
            ))}
            {clientes.length === 0 ? <li className="py-4 text-center text-sm text-slate-400">Sin clientes</li> : null}
          </ul>
        </Card>

        {/* Puertos */}
        <Card className="flex flex-col p-5">
          <div className="mb-4 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600"><Anchor size={16} /></span><h2 className="font-bold text-slate-800">Puertos</h2><span className="ml-auto text-xs text-slate-400">{puertos.length}</span></div>
          <form onSubmit={addPuerto} className="mb-3 flex gap-2">
            <input value={pNombre} onChange={(e) => setPNombre(e.target.value)} placeholder="Nombre del puerto / depósito" className={`${inp} flex-1`} />
            <button type="submit" disabled={busy} className={addBtn}><Plus size={15} /></button>
          </form>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {puertos.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                <span className="truncate text-sm font-medium text-slate-800">{p.nombre}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditP(p)} title="Editar" className={editBtn}><Pencil size={14} /></button>
                  <button onClick={() => { if (confirm(`¿Eliminar ${p.nombre}?`)) apiPuertos.remove(p.id).then(cargar); }} className={delBtn}><Trash2 size={15} /></button>
                </div>
              </li>
            ))}
            {puertos.length === 0 ? <li className="py-4 text-center text-sm text-slate-400">Sin puertos</li> : null}
          </ul>
        </Card>

        {/* Tipos de operación */}
        <Card className="flex flex-col p-5">
          <div className="mb-4 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600"><Tags size={16} /></span><h2 className="font-bold text-slate-800">Tipos de operación</h2><span className="ml-auto text-xs text-slate-400">{tipos.length}</span></div>
          <form onSubmit={addTipo} className="mb-3 flex gap-2">
            <input value={tNombre} onChange={(e) => setTNombre(e.target.value)} placeholder="Ej. IMPO, EXPO, Carga suelta" className={`${inp} flex-1`} />
            <button type="submit" disabled={busy} className={addBtn}><Plus size={15} /></button>
          </form>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {tipos.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                <span className="truncate text-sm font-medium text-slate-800">{t.nombre}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditT(t)} title="Editar" className={editBtn}><Pencil size={14} /></button>
                  <button onClick={() => { if (confirm(`¿Eliminar ${t.nombre}?`)) apiTipos.remove(t.id).then(cargar); }} className={delBtn}><Trash2 size={15} /></button>
                </div>
              </li>
            ))}
            {tipos.length === 0 ? <li className="py-4 text-center text-sm text-slate-400">Sin tipos</li> : null}
          </ul>
        </Card>
      </div>

      <div className="mt-5 flex items-center gap-1.5 text-xs text-slate-400"><FolderCog size={12} /> Estos catálogos aparecen como opciones en el formulario de Operaciones.</div>

      {editC ? <FormModal open title={`Editar cliente — ${editC.nombre}`} subtitle="Modifica los datos del cliente." fields={clienteFields(editC)} submitLabel="Guardar cambios" onSubmit={guardarCliente} onClose={() => setEditC(null)} /> : null}
      {editP ? <FormModal open title="Editar puerto / depósito" fields={[{ name: "nombre", label: "Nombre del puerto / depósito", type: "text", required: true, full: true, default: editP.nombre }]} submitLabel="Guardar cambios" onSubmit={guardarPuerto} onClose={() => setEditP(null)} /> : null}
      {editT ? <FormModal open title="Editar tipo de operación" fields={[{ name: "nombre", label: "Nombre del tipo", type: "text", required: true, full: true, default: editT.nombre }]} submitLabel="Guardar cambios" onSubmit={guardarTipo} onClose={() => setEditT(null)} /> : null}
    </div>
  );
}
