"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, Plus, Printer, Save, Trash2, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiClientes, apiCotizaciones, apiPuertos, apiTipos, apiComisiones, type Cliente, type Cotizacion, type CotizacionInput, type CotizacionItem } from "@/lib/api";
import { dinero, hoyPeru } from "@/lib/format";
import { marcaSede } from "@/lib/sedes";
import { CotizacionDoc, totalesCotizacion, type CotizacionDocData } from "@/components/CotizacionDoc";

const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const lbl = "mb-1 block text-sm font-medium text-slate-700";

const CONDICIONES_BASE = "Tiempo libre para descarga: 4 horas.\nEl servicio no incluye descarga ni estiba.";
const DIAS_VALIDEZ = 15;

// En el formulario cada ítem lleva una clave local y si su descripción la editó el usuario
// (mientras no la toque, se arma sola con los datos del servicio).
type ItemForm = CotizacionItem & { _k: number; _manual: boolean };
let seq = 0;
const nuevoItem = (): ItemForm => ({ _k: ++seq, _manual: false, descripcion: "", cantidad: 1, precio: 0, descuento: 0, operacion: "", origen: "", destino: "", devolucion: "", tamanio: "", tipoCarga: "GENERAL" });

const sumarDias = (iso: string, dias: number) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

// "Servicio de transporte de contenedor 40' de Importación. Origen Callao, destino Marcona, devolución en Callao"
function descripcionAuto(i: CotizacionItem): string {
  const op = (i.operacion || "").toUpperCase();
  const suelta = op.includes("SUELTA");
  const tipo = op.includes("IMPO") ? "Importación" : op.includes("EXPO") ? "Exportación" : "";
  const base = suelta
    ? "Servicio de transporte de carga suelta"
    : `Servicio de transporte de contenedor${i.tamanio ? ` ${i.tamanio}` : ""}${tipo ? ` de ${tipo}` : ""}`;
  const ruta = [i.origen && `origen ${i.origen}`, i.destino && `destino ${i.destino}`, i.devolucion && `devolución en ${i.devolucion}`].filter(Boolean).join(", ");
  return ruta ? `${base}. ${ruta.charAt(0).toUpperCase()}${ruta.slice(1)}` : base;
}

export default function NuevaCotizacionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const marca = marcaSede(user?.sede?.codigo);

  const [editId, setEditId] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [empresa, setEmpresa] = useState({ empresaRazon: "", empresaRuc: "", empresaDireccion: "" });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);

  const [fecha, setFecha] = useState(hoyPeru());
  const [validaHasta, setValidaHasta] = useState(sumarDias(hoyPeru(), DIAS_VALIDEZ));
  const [cliente, setCliente] = useState("");
  const [clienteRuc, setClienteRuc] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("");
  const [contactoNombre, setContactoNombre] = useState("");
  const [contactoEmail, setContactoEmail] = useState("");
  const [contactoTelefono, setContactoTelefono] = useState("");
  const [moneda, setMoneda] = useState<"PEN" | "USD">("PEN");
  const [tipoCambio, setTipoCambio] = useState(0);
  const [descuentoGlobal, setDescuentoGlobal] = useState(0);
  const [igvPorc, setIgvPorc] = useState(18);
  const [notas, setNotas] = useState("");
  const [condiciones, setCondiciones] = useState(CONDICIONES_BASE);
  const [items, setItems] = useState<ItemForm[]>([nuevoItem()]);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tipos, setTipos] = useState<string[]>(["IMPO", "EXPO"]);
  const [puertos, setPuertos] = useState<string[]>([]);
  const [distritos, setDistritos] = useState<string[]>([]);

  // Carga una cotización existente en el formulario (editar o duplicar).
  function cargar(c: Cotizacion, duplicar: boolean) {
    if (!duplicar) {
      setFecha(c.fecha.slice(0, 10));
      setValidaHasta(c.validaHasta.slice(0, 10));
      setCodigo(c.codigo);
      setEmpresa({ empresaRazon: c.empresaRazon, empresaRuc: c.empresaRuc, empresaDireccion: c.empresaDireccion });
    }
    setCliente(c.cliente); setClienteRuc(c.clienteRuc); setClienteDireccion(c.clienteDireccion);
    setContactoNombre(c.contactoNombre); setContactoEmail(c.contactoEmail); setContactoTelefono(c.contactoTelefono);
    setMoneda(c.moneda); setTipoCambio(c.tipoCambio); setDescuentoGlobal(c.descuentoGlobal); setIgvPorc(c.igvPorc);
    setNotas(c.notas); setCondiciones(c.condiciones);
    setItems(c.items.map((i) => ({ ...i, _k: ++seq, _manual: true })));
  }

  useEffect(() => {
    apiClientes.list().then(setClientes).catch(() => {});
    apiTipos.list().then((ts) => { if (ts.length) setTipos(ts.map((t) => t.nombre)); }).catch(() => {});
    apiPuertos.list().then((ps) => setPuertos(ps.map((p) => p.nombre))).catch(() => {});
    apiComisiones.tarifario().then((ts) => setDistritos(ts.map((t) => t.destino))).catch(() => {});

    const p = new URLSearchParams(window.location.search);
    const id = p.get("id");
    const copia = p.get("copia");
    (async () => {
      try {
        if (id) {
          const c = await apiCotizaciones.get(id);
          if (c.estado === "Convertida") { router.replace("/cotizaciones"); return; }
          setEditId(id);
          cargar(c, false);
        } else {
          const sig = await apiCotizaciones.siguiente();
          setCodigo(sig.codigo);
          setEmpresa({ empresaRazon: sig.empresaRazon, empresaRuc: sig.empresaRuc, empresaDireccion: sig.empresaDireccion });
          if (copia) {
            cargar(await apiCotizaciones.get(copia), true);
          } else {
            // Contacto y condiciones: los de la última cotización del usuario (o de la sede).
            const todas = await apiCotizaciones.list();
            const mia = todas.find((c) => c.creadoPor === user?.email);
            const ultima = todas[0];
            setContactoNombre(mia?.contactoNombre || user?.nombre || "");
            setContactoEmail(mia?.contactoEmail || user?.email || "");
            setContactoTelefono(mia?.contactoTelefono || "");
            if (ultima?.condiciones) setCondiciones(ultima.condiciones);
          }
        }
      } catch (e) {
        setError((e as Error).message || "No se pudo cargar la cotización.");
      } finally {
        setCargando(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al elegir un cliente del catálogo se jalan su RUC y dirección.
  function elegirCliente(nombre: string) {
    setCliente(nombre);
    const c = clientes.find((x) => x.nombre.trim().toLowerCase() === nombre.trim().toLowerCase());
    if (c) { setClienteRuc(c.ruc || ""); setClienteDireccion(c.direccion || ""); }
  }

  function setItem(k: number, cambios: Partial<ItemForm>) {
    setItems((xs) => xs.map((i) => {
      if (i._k !== k) return i;
      const n = { ...i, ...cambios };
      if (!n._manual && !("descripcion" in cambios)) n.descripcion = descripcionAuto(n);
      return n;
    }));
  }

  const t = totalesCotizacion({ items, descuentoGlobal, igvPorc });

  const body: CotizacionInput = useMemo(() => ({
    fecha, validaHasta, cliente: cliente.trim(), clienteRuc: clienteRuc.trim(), clienteDireccion: clienteDireccion.trim(),
    contactoNombre, contactoEmail: contactoEmail.trim(), contactoTelefono,
    moneda, tipoCambio: moneda === "USD" ? tipoCambio : 0, descuentoGlobal, igvPorc, notas, condiciones,
    items: items
      .filter((i) => i.descripcion.trim() || i.precio)
      .map(({ _k, _manual, id, ...i }) => ({ ...i, cantidad: Number(i.cantidad) || 0, precio: Number(i.precio) || 0, descuento: Number(i.descuento) || 0 })),
  }), [fecha, validaHasta, cliente, clienteRuc, clienteDireccion, contactoNombre, contactoEmail, contactoTelefono, moneda, tipoCambio, descuentoGlobal, igvPorc, notas, condiciones, items]);

  const docData: CotizacionDocData = { ...body, ...empresa, codigo };

  async function guardar() {
    setError("");
    if (!body.cliente) return setError("Indica el cliente.");
    if (!body.items.length) return setError("Agrega al menos un ítem con descripción y precio.");
    if (body.items.some((i) => !i.descripcion.trim())) return setError("Cada ítem necesita una descripción.");
    if (validaHasta < fecha) return setError('"Válida hasta" no puede ser anterior a la fecha.');
    if (moneda === "USD" && !(tipoCambio > 0)) return setError("Indica el tipo de cambio para cotizar en dólares.");
    setGuardando(true);
    try {
      const c = editId ? await apiCotizaciones.update(editId, body) : await apiCotizaciones.create(body);
      router.push(`/cotizaciones?abrir=${c.id}`);
    } catch (e) {
      setError((e as Error).message || "No se pudo guardar.");
      setGuardando(false);
    }
  }

  if (cargando) return <div className="py-20 text-center text-sm text-slate-400">Cargando…</div>;

  return (
    <div>
      <button onClick={() => router.push("/cotizaciones")} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600"><ArrowLeft size={15} /> Cotizaciones</button>
      <h1 className="text-2xl font-bold text-slate-900">{editId ? `Editar ${codigo}` : "Nueva cotización"}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {editId ? "Los cambios se guardan sobre la misma cotización." : <>Se registrará como <span className="font-semibold text-slate-700">{codigo}</span>. Los datos del servicio de cada ítem se usan luego para crear los viajes en Operaciones.</>}
      </p>

      <datalist id="cot-clientes">{clientes.map((c) => <option key={c.id} value={c.nombre} />)}</datalist>
      <datalist id="cot-puertos">{puertos.map((p) => <option key={p} value={p} />)}</datalist>
      <datalist id="cot-distritos">{distritos.map((d) => <option key={d} value={d} />)}</datalist>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          {/* Cliente y datos generales */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Cliente y vigencia</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="sm:col-span-2"><span className={lbl}>Cliente *</span>
                <input list="cot-clientes" value={cliente} onChange={(e) => elegirCliente(e.target.value)} placeholder="Buscar en el catálogo o escribir" className={inp} />
              </label>
              <label><span className={lbl}>RUC</span><input value={clienteRuc} onChange={(e) => setClienteRuc(e.target.value)} className={`${inp} tabular`} /></label>
              <label><span className={lbl}>Moneda</span>
                <select value={moneda} onChange={(e) => setMoneda(e.target.value as "PEN" | "USD")} className={inp}><option value="PEN">Soles (S/)</option><option value="USD">Dólares (US$)</option></select>
              </label>
              <label className="sm:col-span-2"><span className={lbl}>Dirección</span><input value={clienteDireccion} onChange={(e) => setClienteDireccion(e.target.value)} className={inp} /></label>
              <label><span className={lbl}>Fecha</span>
                <input type="date" value={fecha} onChange={(e) => { const f = e.target.value; setFecha(f); if (!editId && f) setValidaHasta(sumarDias(f, DIAS_VALIDEZ)); }} className={inp} />
              </label>
              <label><span className={lbl}>Válida hasta</span><input type="date" value={validaHasta} onChange={(e) => setValidaHasta(e.target.value)} className={inp} /></label>
              {moneda === "USD" ? (
                <label><span className={lbl}>Tipo de cambio *</span>
                  <input type="number" step="0.001" min={0} value={tipoCambio || ""} onChange={(e) => setTipoCambio(Number(e.target.value))} placeholder="3.750" className={`${inp} tabular`} />
                  <span className="mt-1 block text-xs text-slate-400">Para pasar la tarifa a soles al crear los viajes.</span>
                </label>
              ) : null}
            </div>
          </section>

          {/* Ítems */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Servicios cotizados</h2>
              <button onClick={() => setItems((xs) => [...xs, nuevoItem()])} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600"><Plus size={15} /> Agregar ítem</button>
            </div>
            <div className="space-y-4">
              {items.map((i, idx) => {
                const totalItem = (Number(i.cantidad) || 0) * (Number(i.precio) || 0) * (1 - (Number(i.descuento) || 0) / 100);
                const suelta = (i.operacion || "").toLowerCase().includes("suelta");
                return (
                  <div key={i._k} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Ítem {idx + 1}</span>
                      {items.length > 1 ? <button onClick={() => setItems((xs) => xs.filter((x) => x._k !== i._k))} title="Quitar ítem" className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button> : null}
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <label><span className={lbl}>Tipo de operación</span>
                        <select value={i.operacion} onChange={(e) => setItem(i._k, { operacion: e.target.value })} className={inp}>
                          <option value="">—</option>
                          {[...(i.operacion && !tipos.includes(i.operacion) ? [i.operacion] : []), ...tipos].map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </label>
                      <label><span className={lbl}>Tamaño</span>
                        <select value={i.tamanio} onChange={(e) => setItem(i._k, { tamanio: e.target.value })} className={inp} disabled={suelta}>
                          {["", "20'", "40'", "40' HC"].map((t) => <option key={t} value={t}>{t || "—"}</option>)}
                        </select>
                      </label>
                      <label><span className={lbl}>Tipo de carga</span>
                        <select value={i.tipoCarga} onChange={(e) => setItem(i._k, { tipoCarga: e.target.value })} className={inp}>
                          {["GENERAL", "IMO", "REEFER"].map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </label>
                      <label><span className={lbl}>Origen</span><input list={suelta ? undefined : "cot-puertos"} value={i.origen} onChange={(e) => setItem(i._k, { origen: e.target.value })} placeholder={suelta ? "Escribe el origen" : "Puerto"} className={inp} /></label>
                      <label><span className={lbl}>Destino</span><input list="cot-distritos" value={i.destino} onChange={(e) => setItem(i._k, { destino: e.target.value })} placeholder="Distrito / ciudad" className={inp} /></label>
                      <label><span className={lbl}>Devolución</span><input list={suelta ? undefined : "cot-puertos"} value={i.devolucion} onChange={(e) => setItem(i._k, { devolucion: e.target.value })} placeholder={suelta ? "Opcional" : "Puerto / depósito"} className={inp} /></label>
                    </div>
                    <label className="mt-3 block">
                      <span className={lbl}>Descripción {!i._manual ? <span className="font-normal text-slate-400">· se arma con los datos de arriba, puedes editarla</span> : null}</span>
                      <textarea rows={2} value={i.descripcion} onChange={(e) => setItem(i._k, { descripcion: e.target.value, _manual: true })} className={inp} />
                    </label>
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <label><span className={lbl}>Cantidad</span><input type="number" min={0} value={i.cantidad || ""} onChange={(e) => setItem(i._k, { cantidad: Number(e.target.value) })} className={`${inp} tabular`} /></label>
                      <label><span className={lbl}>Precio unit. (sin IGV)</span><input type="number" min={0} step="0.01" value={i.precio || ""} onChange={(e) => setItem(i._k, { precio: Number(e.target.value) })} className={`${inp} tabular`} /></label>
                      <label><span className={lbl}>Desc. %</span><input type="number" min={0} max={100} value={i.descuento || ""} onChange={(e) => setItem(i._k, { descuento: Number(e.target.value) })} placeholder="0" className={`${inp} tabular`} /></label>
                      <div><span className={lbl}>Total</span><div className="rounded-lg bg-white px-3 py-2 text-right text-sm font-bold tabular text-slate-800 ring-1 ring-slate-200">{dinero(totalItem, moneda)}</div></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Contacto, notas y condiciones */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Contacto, notas y condiciones</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label><span className={lbl}>Contacto</span><input value={contactoNombre} onChange={(e) => setContactoNombre(e.target.value)} className={inp} /></label>
              <label><span className={lbl}>Correo</span><input type="email" value={contactoEmail} onChange={(e) => setContactoEmail(e.target.value)} className={inp} /></label>
              <label><span className={lbl}>Teléfono</span><input value={contactoTelefono} onChange={(e) => setContactoTelefono(e.target.value)} placeholder="+51 9…" className={`${inp} tabular`} /></label>
              <label className="sm:col-span-3"><span className={lbl}>Notas</span><textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Opcional" className={inp} /></label>
              <label className="sm:col-span-3"><span className={lbl}>Condiciones <span className="font-normal text-slate-400">· una por línea</span></span><textarea rows={3} value={condiciones} onChange={(e) => setCondiciones(e.target.value)} className={inp} /></label>
            </div>
          </section>
        </div>

        {/* Resumen */}
        <aside className="h-fit space-y-4 xl:sticky xl:top-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Resumen</h2>
            <div className="space-y-2 text-sm">
              <Fila k="Subtotal" v={dinero(t.subtotal, moneda)} />
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Descuento global %</span>
                <input type="number" min={0} max={100} value={descuentoGlobal || ""} onChange={(e) => setDescuentoGlobal(Number(e.target.value))} placeholder="0" className="w-20 rounded-md border border-slate-300 px-2 py-1 text-right text-sm tabular outline-none focus:border-brand-500" />
              </div>
              <Fila k="Desc. global" v={`− ${dinero(t.descuento, moneda)}`} />
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Impuesto %</span>
                <input type="number" min={0} max={100} value={igvPorc} onChange={(e) => setIgvPorc(Number(e.target.value))} className="w-20 rounded-md border border-slate-300 px-2 py-1 text-right text-sm tabular outline-none focus:border-brand-500" />
              </div>
              <Fila k="Impuesto" v={dinero(t.igv, moneda)} />
              <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                <span className="font-bold text-slate-800">Total</span>
                <span className="text-lg font-extrabold tabular text-slate-900">{dinero(t.total, moneda)}</span>
              </div>
            </div>
          </div>
          {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
          <div className="flex gap-2">
            <button onClick={() => setPreview(true)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600"><Eye size={16} /> Vista previa</button>
            <button onClick={guardar} disabled={guardando} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"><Save size={16} /> {guardando ? "Guardando…" : "Guardar"}</button>
          </div>
        </aside>
      </div>

      {preview ? (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 sm:p-6" onClick={() => setPreview(false)}>
          <div className="my-6 w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="no-print flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-3">
              <span className="text-sm font-semibold text-slate-500">Vista previa{editId ? "" : " · aún no se guarda"}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600"><Printer size={15} /> Imprimir / PDF</button>
                <button onClick={() => setPreview(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
              </div>
            </div>
            <CotizacionDoc c={docData} logo={marca.logo} color={marca.color} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Fila({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><span className="text-slate-500">{k}</span><span className="tabular font-medium text-slate-700">{v}</span></div>;
}
