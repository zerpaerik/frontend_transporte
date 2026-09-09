"use client";

import { useEffect, useState } from "react";
import { FolderCog, Plus, Trash2, Pencil, Building2, Anchor, Tags, MapPin, Save, Store, Search } from "lucide-react";
import { PageHeader, Card } from "@/components/ui";
import { FormModal, type Field, type FormValues } from "@/components/FormModal";
import { apiClientes, apiPuertos, apiTipos, apiComisiones, apiProveedores, type Cliente, type Puerto, type TipoOperacion, type Tarifa, type Proveedor } from "@/lib/api";

export default function CatalogosPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [puertos, setPuertos] = useState<Puerto[]>([]);
  const [tipos, setTipos] = useState<TipoOperacion[]>([]);
  const [qCli, setQCli] = useState("");
  const [cNombre, setCNombre] = useState("");
  const [cRuc, setCRuc] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cTel, setCTel] = useState("");
  const [cContacto, setCContacto] = useState("");
  const [cDireccion, setCDireccion] = useState("");
  const [pNombre, setPNombre] = useState("");
  const [tNombre, setTNombre] = useState("");
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [editsT, setEditsT] = useState<Record<string, { gral: number; imo: number; reefer: number }>>({});
  const [nuevoT, setNuevoT] = useState({ destino: "", gral: "", imo: "", reefer: "" });
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [nuevoProv, setNuevoProv] = useState({ razonSocial: "", ruc: "", direccion: "", contacto: "", telefono: "" });
  const [busy, setBusy] = useState(false);
  const [editC, setEditC] = useState<Cliente | null>(null);
  const [editP, setEditP] = useState<Puerto | null>(null);
  const [editT, setEditT] = useState<TipoOperacion | null>(null);
  const [editProv, setEditProv] = useState<Proveedor | null>(null);

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
    apiComisiones.tarifario().then((t) => {
      setTarifas(t);
      setEditsT(Object.fromEntries(t.map((x) => [x.id, { gral: x.gral, imo: x.imo, reefer: x.reefer }])));
    }).catch(() => setTarifas([]));
    apiProveedores.list().then(setProveedores).catch(() => setProveedores([]));
  }
  useEffect(() => { cargar(); }, []);

  async function addProveedor(e: React.FormEvent) {
    e.preventDefault(); if (!nuevoProv.razonSocial.trim()) return; setBusy(true);
    try {
      await apiProveedores.create({ razonSocial: nuevoProv.razonSocial.trim(), ruc: nuevoProv.ruc.trim(), direccion: nuevoProv.direccion.trim(), contacto: nuevoProv.contacto.trim(), telefono: nuevoProv.telefono.trim() });
      setNuevoProv({ razonSocial: "", ruc: "", direccion: "", contacto: "", telefono: "" }); cargar();
    } finally { setBusy(false); }
  }
  const proveedorFields = (p: Proveedor): Field[] => [
    { name: "razonSocial", label: "Razón social", type: "text", required: true, full: true, default: p.razonSocial },
    { name: "ruc", label: "RUC", type: "text", default: p.ruc },
    { name: "telefono", label: "Teléfono", type: "text", default: p.telefono },
    { name: "contacto", label: "Contacto", type: "text", default: p.contacto },
    { name: "direccion", label: "Dirección", type: "text", full: true, default: p.direccion },
  ];
  async function guardarProveedor(v: FormValues) {
    if (!editProv) return;
    await apiProveedores.update(editProv.id, { razonSocial: String(v.razonSocial), ruc: String(v.ruc), telefono: String(v.telefono), contacto: String(v.contacto), direccion: String(v.direccion) });
    cargar();
  }

  async function addTarifa(e: React.FormEvent) {
    e.preventDefault(); if (!nuevoT.destino.trim()) return; setBusy(true);
    try {
      await apiComisiones.crearTarifa({ destino: nuevoT.destino.trim().toUpperCase(), gral: Number(nuevoT.gral || 0), imo: Number(nuevoT.imo || 0), reefer: Number(nuevoT.reefer || 0) });
      setNuevoT({ destino: "", gral: "", imo: "", reefer: "" }); cargar();
    } finally { setBusy(false); }
  }
  async function guardarTarifa(id: string) {
    setBusy(true);
    try { await apiComisiones.actualizarTarifa(id, editsT[id]); cargar(); } finally { setBusy(false); }
  }
  async function borrarTarifa(id: string, destino: string) {
    if (!confirm(`¿Eliminar el destino ${destino} y su bono?`)) return;
    setBusy(true);
    try { await apiComisiones.borrarTarifa(id); cargar(); } finally { setBusy(false); }
  }

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
          <div className="relative mb-2">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={qCli} onChange={(e) => setQCli(e.target.value)} placeholder="Buscar cliente, RUC, correo…" className={`${inp} w-full pl-9`} />
          </div>
          {(() => {
            const q = qCli.trim().toLowerCase();
            const lista = q ? clientes.filter((c) => `${c.nombre} ${c.ruc} ${c.email} ${c.contacto} ${c.telefono}`.toLowerCase().includes(q)) : clientes;
            return (
              <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                {lista.map((c) => (
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
                {lista.length === 0 ? <li className="py-4 text-center text-sm text-slate-400">{clientes.length === 0 ? "Sin clientes" : "Sin resultados"}</li> : null}
              </ul>
            );
          })()}
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

      {/* Destinos y bonos (tarifario) */}
      <Card className="mt-6 flex flex-col p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600"><MapPin size={16} /></span>
          <h2 className="font-bold text-slate-800">Destinos y bonos</h2>
          <span className="ml-auto text-xs text-slate-400">{tarifas.length}</span>
        </div>
        <p className="mb-3 text-xs text-slate-400">El bono se asigna automáticamente al chofer según el destino del viaje y el tipo de carga (GRAL, IMO o REEFER). <span className="font-medium text-slate-500">Para editar, cambia el monto en la casilla y pulsa el botón <span className="text-brand-600">Guardar</span> que aparece.</span></p>

        <form onSubmit={addTarifa} className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3">
          <div className="flex-1 min-w-[180px]"><label className="mb-1 block text-xs font-medium text-slate-500">Destino (distrito)</label><input value={nuevoT.destino} onChange={(e) => setNuevoT({ ...nuevoT, destino: e.target.value })} placeholder="Ej. LA MOLINA" className={`${inp} w-full`} /></div>
          <div><label className="mb-1 block text-xs font-medium text-slate-500">GRAL</label><input type="number" value={nuevoT.gral} onChange={(e) => setNuevoT({ ...nuevoT, gral: e.target.value })} className={`${inp} w-24`} /></div>
          <div><label className="mb-1 block text-xs font-medium text-slate-500">IMO</label><input type="number" value={nuevoT.imo} onChange={(e) => setNuevoT({ ...nuevoT, imo: e.target.value })} className={`${inp} w-24`} /></div>
          <div><label className="mb-1 block text-xs font-medium text-slate-500">REEFER</label><input type="number" value={nuevoT.reefer} onChange={(e) => setNuevoT({ ...nuevoT, reefer: e.target.value })} className={`${inp} w-24`} /></div>
          <button type="submit" disabled={busy} className={addBtn}><Plus size={15} /> Agregar</button>
        </form>

        <div className="max-h-[420px] overflow-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="sticky top-0">
              <tr>
                {["Destino", "GRAL", "IMO", "REEFER", ""].map((h, i) => (
                  <th key={i} className={`whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 ${i > 0 && i < 4 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tarifas.length === 0 ? <tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-400">Sin destinos. Agrega el primero.</td></tr> : null}
              {tarifas.map((t) => {
                const e = editsT[t.id] ?? { gral: t.gral, imo: t.imo, reefer: t.reefer };
                const changed = e.gral !== t.gral || e.imo !== t.imo || e.reefer !== t.reefer;
                const setF = (k: "gral" | "imo" | "reefer", v: string) => setEditsT((s) => ({ ...s, [t.id]: { ...e, [k]: Number(v || 0) } }));
                return (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="px-3 py-2 font-medium text-slate-800">{t.destino}</td>
                    {(["gral", "imo", "reefer"] as const).map((k) => (
                      <td key={k} className="px-3 py-2 text-right"><input type="number" value={e[k]} onChange={(ev) => setF(k, ev.target.value)} className={`w-20 rounded-md border px-2 py-1 text-right text-sm tabular outline-none focus:border-brand-500 ${changed ? "border-brand-400 bg-brand-50/40" : "border-slate-200"}`} /></td>
                    ))}
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1.5">
                        {changed ? <button disabled={busy} onClick={() => guardarTarifa(t.id)} className="inline-flex items-center gap-1 rounded-md bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"><Save size={13} /> Guardar</button> : null}
                        <button disabled={busy} onClick={() => borrarTarifa(t.id, t.destino)} title="Eliminar" className="rounded-md p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Proveedores */}
      <Card className="mt-6 flex flex-col p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-steel-50 text-steel-600"><Store size={16} /></span>
          <h2 className="font-bold text-slate-800">Proveedores</h2>
          <span className="ml-auto text-xs text-slate-400">{proveedores.length}</span>
        </div>
        <p className="mb-3 text-xs text-slate-400">Aparecen para seleccionar en Mantenimiento (responsable / taller) y Repuestos (proveedor).</p>

        <form onSubmit={addProveedor} className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3">
          <div className="flex-1 min-w-[200px]"><label className="mb-1 block text-xs font-medium text-slate-500">Razón social</label><input value={nuevoProv.razonSocial} onChange={(e) => setNuevoProv({ ...nuevoProv, razonSocial: e.target.value })} placeholder="Taller Diesel Pro S.A.C." className={`${inp} w-full`} /></div>
          <div><label className="mb-1 block text-xs font-medium text-slate-500">RUC</label><input value={nuevoProv.ruc} onChange={(e) => setNuevoProv({ ...nuevoProv, ruc: e.target.value })} className={`${inp} w-36`} /></div>
          <div><label className="mb-1 block text-xs font-medium text-slate-500">Teléfono</label><input value={nuevoProv.telefono} onChange={(e) => setNuevoProv({ ...nuevoProv, telefono: e.target.value })} className={`${inp} w-32`} /></div>
          <div className="flex-1 min-w-[160px]"><label className="mb-1 block text-xs font-medium text-slate-500">Contacto</label><input value={nuevoProv.contacto} onChange={(e) => setNuevoProv({ ...nuevoProv, contacto: e.target.value })} className={`${inp} w-full`} /></div>
          <div className="flex-1 min-w-[200px]"><label className="mb-1 block text-xs font-medium text-slate-500">Dirección</label><input value={nuevoProv.direccion} onChange={(e) => setNuevoProv({ ...nuevoProv, direccion: e.target.value })} className={`${inp} w-full`} /></div>
          <button type="submit" disabled={busy} className={addBtn}><Plus size={15} /> Agregar</button>
        </form>

        <div className="max-h-[420px] overflow-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="sticky top-0">
              <tr>
                {["Razón social", "RUC", "Contacto", "Teléfono", "Dirección", ""].map((h, i) => (
                  <th key={i} className="whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proveedores.length === 0 ? <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-400">Sin proveedores. Agrega el primero.</td></tr> : null}
              {proveedores.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                  <td className="px-3 py-2 font-medium text-slate-800">{p.razonSocial}</td>
                  <td className="px-3 py-2 text-slate-600">{p.ruc || "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{p.contacto || "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{p.telefono || "—"}</td>
                  <td className="px-3 py-2 text-slate-600"><span className="block max-w-[220px] truncate" title={p.direccion}>{p.direccion || "—"}</span></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => setEditProv(p)} title="Editar" className={editBtn}><Pencil size={14} /></button>
                      <button disabled={busy} onClick={() => { if (confirm(`¿Eliminar el proveedor ${p.razonSocial}?`)) apiProveedores.remove(p.id).then(cargar); }} className={delBtn}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-5 flex items-center gap-1.5 text-xs text-slate-400"><FolderCog size={12} /> Estos catálogos aparecen como opciones en el formulario de Operaciones.</div>

      {editC ? <FormModal open title={`Editar cliente — ${editC.nombre}`} subtitle="Modifica los datos del cliente." fields={clienteFields(editC)} submitLabel="Guardar cambios" onSubmit={guardarCliente} onClose={() => setEditC(null)} /> : null}
      {editP ? <FormModal open title="Editar puerto / depósito" fields={[{ name: "nombre", label: "Nombre del puerto / depósito", type: "text", required: true, full: true, default: editP.nombre }]} submitLabel="Guardar cambios" onSubmit={guardarPuerto} onClose={() => setEditP(null)} /> : null}
      {editT ? <FormModal open title="Editar tipo de operación" fields={[{ name: "nombre", label: "Nombre del tipo", type: "text", required: true, full: true, default: editT.nombre }]} submitLabel="Guardar cambios" onSubmit={guardarTipo} onClose={() => setEditT(null)} /> : null}
      {editProv ? <FormModal open title={`Editar proveedor — ${editProv.razonSocial}`} subtitle="Modifica los datos del proveedor." fields={proveedorFields(editProv)} submitLabel="Guardar cambios" onSubmit={guardarProveedor} onClose={() => setEditProv(null)} /> : null}
    </div>
  );
}
