"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Plus, X, Save, Eye } from "lucide-react";
import { Card } from "@/components/ui";
import { useData } from "@/lib/store";
import { apiViajePorCodigo, apiTarifas, apiFacturasE, apiEmisor, apiCuentas, type TarifasMeta, type EmisorConfig, type CuentaBancaria } from "@/lib/api";
import { dinero, hoyPeru, fecha } from "@/lib/format";
import type { Factura } from "@/lib/types";
import { FacturaPreview, type PreviewData } from "@/components/FacturaPreview";

// Traduce la forma de pago guardada (Contado/Credito + vencimiento) al selector y sus días.
function plazoDesde(f: Partial<Factura>): { plazo: string; dias: number } {
  if ((f.formaPago || "Contado") !== "Credito" || !f.fechaVencimiento) return { plazo: "Contado", dias: 0 };
  const dias = Math.max(0, Math.round((new Date(f.fechaVencimiento).getTime() - new Date(String(f.fecha)).getTime()) / 86_400_000));
  if (dias === 15) return { plazo: "Crédito 15 días", dias };
  if (dias === 30) return { plazo: "Crédito 30 días", dias };
  return { plazo: "Crédito (días)", dias };
}

type Linea = { descripcion: string; cantidad: number; valorUnitario: number };

const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const lbl = "mb-1 block text-sm font-medium text-slate-700";
const num = (v: string) => Number(String(v).replace(",", ".") || 0);

// Suma N días a una fecha "YYYY-MM-DD".
function masDias(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const PLAZOS: Record<string, number> = { "Crédito 15 días": 15, "Crédito 30 días": 30 };

export default function NuevoComprobantePage() {
  const router = useRouter();
  const { addFactura, facturas, reload } = useData();
  const [editId, setEditId] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  const [tipo, setTipo] = useState<Factura["tipo"]>("Factura");
  const [cliente, setCliente] = useState("");
  const [ruc, setRuc] = useState("");
  const [direccion, setDireccion] = useState("");
  const [fechaEmision, setFechaEmision] = useState(hoyPeru());
  const [viaje, setViaje] = useState("-");
  const [referenciaOrden, setReferenciaOrden] = useState("");
  const [guia, setGuia] = useState("");
  const [valorReferencial, setValorReferencial] = useState("");
  const [ubigeoOrigen, setUbigeoOrigen] = useState("");
  const [ubigeoDestino, setUbigeoDestino] = useState("");
  const [detalleViaje, setDetalleViaje] = useState("");
  // Calculador del valor referencial (tablas DS 022-2025-MTC)
  const [meta, setMeta] = useState<TarifasMeta | null>(null);
  const [vrAmbito, setVrAmbito] = useState(""); // "" manual | local | nacional
  const [vrRuta, setVrRuta] = useState("");
  const [vrDestino, setVrDestino] = useState("");
  const [vrPuerto, setVrPuerto] = useState("");
  const [vrZona, setVrZona] = useState("");
  const [vrTipoCarga, setVrTipoCarga] = useState("");
  const [pesoTM, setPesoTM] = useState("");
  const [vrDetalle, setVrDetalle] = useState("");
  const [plazo, setPlazo] = useState("Contado"); // Contado | Crédito 15 días | Crédito 30 días | Crédito (días)
  const [diasManual, setDiasManual] = useState("15"); // días de crédito cuando se ponen a mano
  const [moneda, setMoneda] = useState("PEN"); // PEN | USD
  const [tipoCambio, setTipoCambio] = useState(""); // solo cuando la moneda es dólares
  const [guiaTransportista, setGuiaTransportista] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([{ descripcion: "SERVICIO DE TRANSPORTE", cantidad: 1, valorUnitario: 0 }]);

  const [codigo, setCodigo] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [emisor, setEmisor] = useState<EmisorConfig | null>(null);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);

  const gravado = Math.round(lineas.reduce((s, l) => s + (l.valorUnitario || 0) * (l.cantidad || 1), 0) * 100) / 100;
  const igv = Math.round(gravado * 0.18 * 100) / 100;
  const total = Math.round((gravado + igv) * 100) / 100;
  const esCredito = plazo !== "Contado";
  const diasCredito = plazo === "Crédito (días)" ? Math.max(0, Math.round(Number(diasManual) || 0)) : PLAZOS[plazo] || 0;
  const vencimiento = esCredito && diasCredito > 0 ? masDias(fechaEmision, diasCredito) : "";

  const setLinea = (i: number, patch: Partial<Linea>) => setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const agregar = () => setLineas((ls) => [...ls, { descripcion: "", cantidad: 1, valorUnitario: 0 }]);
  const quitar = (i: number) => setLineas((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : ls));

  async function traer(cod: string) {
    const c = cod.trim();
    if (!c) return;
    setMsg("");
    try {
      const v = await apiViajePorCodigo(c);
      setCliente(String(v.clienteFactura || v.cliente || "")); // el cliente A FACTURAR de Operaciones
      setRuc(String(v.clienteRuc || ""));
      setDireccion(String(v.clienteDireccion || ""));
      setViaje(String(v.contenedor || "-"));
      setReferenciaOrden(String(v.nOrden || ""));
      setGuia(String(v.greRemitente || ""));
      setGuiaTransportista(String(v.greTransporte || ""));
      const ruta = [v.origen, v.destino].filter(Boolean).join(" → ");
      setDetalleViaje(ruta ? `TRANSPORTE ${ruta}` : "");
      // Línea de servicio con el detalle del viaje (como en la factura real).
      const partes = [
        v.fechaViaje ? `(${fecha(v.fechaViaje)})` : "",
        v.greTransporte ? `G.R.: ${v.greTransporte}` : "",
        v.placaTracto ? `PLACA: ${v.placaTracto}` : "",
        v.contenedor ? `CONT.: ${v.contenedor}` : "",
        ruta ? `ORIGEN: ${v.origen} → DESTINO: ${v.destino}` : "",
      ].filter(Boolean).join(" | ");
      setLineas([{ descripcion: `SERVICIO DE TRANSPORTE${partes ? " " + partes : ""}`, cantidad: 1, valorUnitario: Number(v.tarifa || 0) }]);
      setCodigo("");
    } catch {
      setMsg(`No se encontró un viaje con el código "${c}".`);
    }
  }

  // Si llega ?codigo=OP-xxxx (desde Operaciones) autocompleta; si llega ?id=xxx edita.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const id = p.get("id");
    if (id) { setEditId(id); return; }
    const c = p.get("codigo");
    if (c) traer(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Modo edición: precarga TODOS los campos del comprobante a corregir (una sola vez).
  useEffect(() => {
    if (!editId || prefilled) return;
    const f = facturas.find((x) => x.id === editId);
    if (!f) return; // aún no cargan las facturas del store
    setTipo(f.tipo);
    setCliente(f.cliente || "");
    setRuc(f.ruc && f.ruc !== "-" ? f.ruc : "");
    setDireccion(f.direccion || "");
    setFechaEmision(String(f.fecha).slice(0, 10));
    setViaje(f.viaje || "-");
    setReferenciaOrden(f.referenciaVR || "");
    setGuia(f.guia || "");
    setValorReferencial(f.valorReferencial ? String(f.valorReferencial) : "");
    setUbigeoOrigen(f.ubigeoOrigen || "");
    setUbigeoDestino(f.ubigeoDestino || "");
    setDetalleViaje(f.detalleViaje || "");
    setGuiaTransportista(f.guiaTransportista || "");
    setMoneda(f.moneda === "USD" ? "USD" : "PEN");
    setTipoCambio(f.tipoCambio ? String(f.tipoCambio) : "");
    const pl = plazoDesde(f);
    setPlazo(pl.plazo);
    if (pl.plazo === "Crédito (días)") setDiasManual(String(pl.dias));
    setVrAmbito(f.vrAmbito || "");
    setVrRuta(f.vrRuta || "");
    setVrDestino(f.vrDestino || "");
    setVrPuerto(f.vrPuerto || "");
    setVrZona(f.vrZona || "");
    setVrTipoCarga(f.vrTipoCarga || "");
    setPesoTM(f.pesoTM ? String(f.pesoTM) : "");
    if (f.items?.length) setLineas(f.items.map((i) => ({ descripcion: i.descripcion, cantidad: i.cantidad ?? 1, valorUnitario: i.valorUnitario ?? 0 })));
    setPrefilled(true);
  }, [editId, prefilled, facturas]);

  // Catálogo de tarifas referenciales (rutas/puertos) del DS 022-2025-MTC.
  useEffect(() => { apiTarifas.meta().then(setMeta).catch(() => {}); }, []);

  // Emisor y cuentas de la sede para armar la vista previa del comprobante.
  useEffect(() => {
    apiEmisor.get().then((r) => setEmisor(r.config)).catch(() => {});
    apiCuentas.list().then((cs) => setCuentas(cs.filter((c) => c.activo))).catch(() => {});
  }, []);

  const tipoCargaPorViaje = meta?.tiposCarga.find((t) => t.key === vrTipoCarga)?.porViaje ?? false;

  // Recalcula el valor referencial desde las tablas cuando cambian los insumos.
  useEffect(() => {
    if (!vrAmbito) return; // modo manual: no toca el campo
    const listo = vrAmbito === "nacional"
      ? !!(vrRuta && vrDestino && Number(pesoTM) > 0)
      : !!(vrPuerto && vrZona && vrTipoCarga && (tipoCargaPorViaje || Number(pesoTM) > 0));
    if (!listo) { setVrDetalle(""); return; }
    let cancel = false;
    apiTarifas.calcular({
      ambito: vrAmbito as "local" | "nacional", pesoTM: Number(pesoTM) || 0,
      ruta: vrRuta, destino: vrDestino, puerto: vrPuerto, zona: vrZona, tipoCarga: vrTipoCarga,
    }).then((r) => {
      if (cancel) return;
      setValorReferencial(String(r.valorReferencial));
      setVrDetalle(r.detalle);
    }).catch(() => { if (!cancel) setVrDetalle(""); });
    return () => { cancel = true; };
  }, [vrAmbito, vrRuta, vrDestino, vrPuerto, vrZona, vrTipoCarga, pesoTM, tipoCargaPorViaje]);

  async function guardar() {
    if (!cliente.trim()) { setMsg("Falta el cliente."); return; }
    setBusy(true);
    try {
      const items = lineas.filter((l) => l.descripcion.trim() || l.valorUnitario).map((l) => ({ descripcion: l.descripcion, cantidad: l.cantidad || 1, valorUnitario: l.valorUnitario || 0 }));
      const body: Omit<Factura, "id"> = {
        serie: "", tipo, cliente: cliente.trim(), ruc: ruc.trim() || "-", direccion: direccion.trim(),
        fecha: fechaEmision, viaje: viaje || "-", monto: gravado, igv, estadoSunat: "Emitida",
        items,
        moneda, tipoCambio: moneda === "USD" && tipoCambio ? Number(tipoCambio) : 0,
        valorReferencial: valorReferencial ? Number(valorReferencial) : 0,
        vrAmbito, vrRuta, vrDestino, vrPuerto, vrZona, vrTipoCarga, pesoTM: pesoTM ? Number(pesoTM) : 0,
        referenciaVR: referenciaOrden.trim(), guia: guia.trim(), guiaTransportista: guiaTransportista.trim(),
        ubigeoOrigen: ubigeoOrigen.trim(), ubigeoDestino: ubigeoDestino.trim(), detalleViaje: detalleViaje.trim(),
        formaPago: esCredito ? "Credito" : "Contado",
        fechaVencimiento: esCredito && vencimiento ? vencimiento : null,
      };
      if (editId) {
        await apiFacturasE.actualizar(editId, body as Record<string, unknown>);
        await reload();
      } else {
        await addFactura(body);
      }
      router.push("/facturacion");
    } catch (e) {
      setMsg((e as Error).message || "No se pudo guardar el comprobante.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <button onClick={() => router.push("/facturacion")} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600">
        <ArrowLeft size={16} /> Volver a facturación
      </button>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{editId ? "Editar comprobante" : "Nuevo comprobante"}</h1>
      <p className="mt-1 text-sm text-slate-500">{editId ? "Corrige los datos del comprobante antes de emitirlo a SUNAT (por ejemplo, los ubigeos de la detracción)." : "Trae los datos desde el código del viaje (Operaciones): cliente, tarifa, ruta y detalle. El IGV (18%) y la detracción (4%) se calculan al emitir."}</p>

      {/* Traer desde Operaciones */}
      <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
        <Search size={16} className="text-slate-400" />
        <input value={codigo} onChange={(e) => setCodigo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") traer(codigo); }}
          placeholder="Código de viaje (OP-0001)" className="w-52 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
        <button onClick={() => traer(codigo)} className="rounded-lg bg-steel-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-steel-700">Traer del viaje</button>
        {msg ? <span className="text-sm text-rose-600">{msg}</span> : null}
      </div>

      {/* Datos del comprobante */}
      <Card className="mt-4 p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Datos del comprobante</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label><span className={lbl}>Tipo de comprobante</span>
            <select className={inp} value={tipo} onChange={(e) => setTipo(e.target.value as Factura["tipo"])}>
              <option>Factura</option><option>Boleta</option><option>N. Crédito</option>
            </select>
          </label>
          <label><span className={lbl}>Fecha de emisión</span><input type="date" className={inp} value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} /></label>
          <label className="sm:col-span-2"><span className={lbl}>Cliente (razón social)</span><input className={inp} value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Cliente a facturar (viene de Operaciones)" /></label>
          <label><span className={lbl}>RUC / DNI</span><input className={inp} value={ruc} onChange={(e) => setRuc(e.target.value)} placeholder="20601847834" /></label>
          <label><span className={lbl}>Moneda</span>
            <select className={inp} value={moneda} onChange={(e) => setMoneda(e.target.value)}>
              <option value="PEN">Soles (S/)</option>
              <option value="USD">Dólares (US$)</option>
            </select>
          </label>
          {moneda === "USD" ? (
            <label><span className={lbl}>Tipo de cambio (S/ por US$)</span><input type="number" step="any" min="0" className={inp} value={tipoCambio} onChange={(e) => setTipoCambio(e.target.value)} placeholder="3.750" /></label>
          ) : null}
          <label><span className={lbl}>Referencia / N° de orden</span><input className={inp} value={referenciaOrden} onChange={(e) => setReferenciaOrden(e.target.value)} placeholder="ORDEN 2440" /></label>
          <label><span className={lbl}>Guía remitente</span><input className={inp} value={guia} onChange={(e) => setGuia(e.target.value)} placeholder="T002-1668" /></label>
          <label><span className={lbl}>Guía transportista</span><input className={inp} value={guiaTransportista} onChange={(e) => setGuiaTransportista(e.target.value)} placeholder="V001-00000123" /></label>
          <label className="sm:col-span-2"><span className={lbl}>Dirección del cliente</span><input className={inp} value={direccion} onChange={(e) => setDireccion(e.target.value)} /></label>
        </div>
      </Card>

      {/* Líneas del comprobante */}
      <Card className="mt-4 p-5">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-500">Líneas del comprobante</h2>
        <p className="mb-3 text-xs text-slate-400">La primera línea trae el detalle del servicio. Agrega adicionales (combustible, tiempo de espera, etc.).</p>
        <div className="space-y-2">
          {lineas.map((l, i) => (
            <div key={i} className="flex items-start gap-2">
              <textarea value={l.descripcion} onChange={(e) => setLinea(i, { descripcion: e.target.value })} placeholder="Descripción (se ve completa, en varias líneas)" rows={2} className="min-w-0 flex-1 resize-y rounded-md border border-slate-200 px-2 py-1.5 text-sm leading-snug outline-none focus:border-brand-500" />
              <input type="number" step="any" min="0" value={l.cantidad} onChange={(e) => setLinea(i, { cantidad: num(e.target.value) })} title="Cantidad" className="w-16 rounded-md border border-slate-200 px-2 py-1.5 text-right text-sm tabular outline-none focus:border-brand-500" />
              <input type="number" step="any" min="0" value={l.valorUnitario || ""} onChange={(e) => setLinea(i, { valorUnitario: num(e.target.value) })} placeholder="0.00" title="Valor unitario (sin IGV)" className="w-28 rounded-md border border-slate-200 px-2 py-1.5 text-right text-sm tabular outline-none focus:border-brand-500" />
              <button onClick={() => quitar(i)} title="Quitar" className="mt-1 rounded p-1 text-slate-400 hover:text-rose-600"><X size={16} /></button>
            </div>
          ))}
        </div>
        <button onClick={agregar} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600"><Plus size={14} /> Agregar línea</button>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Detracción / transporte */}
        <Card className="p-5">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-500">Detracción (transporte)</h2>
          <p className="mb-3 text-xs text-slate-400">El valor referencial se calcula con las tablas del MTC ({meta?.vigencia || "DS 022-2025-MTC"}). La detracción (4%) se aplica sobre el mayor entre el total y el valor referencial.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2"><span className={lbl}>Base del valor referencial</span>
              <select className={inp} value={vrAmbito} onChange={(e) => { setVrAmbito(e.target.value); setVrDetalle(""); }}>
                <option value="">Manual (lo ingreso yo)</option>
                <option value="nacional">Provincia / nacional (S/ x TM × peso)</option>
                <option value="local">Local / puerto (por viaje o por tonelada)</option>
              </select>
            </label>

            {vrAmbito === "nacional" ? (
              <>
                <label className="sm:col-span-2"><span className={lbl}>Ruta (desde Lima)</span>
                  <select className={inp} value={vrRuta} onChange={(e) => { setVrRuta(e.target.value); setVrDestino(""); }}>
                    <option value="">Elige la ruta…</option>
                    {meta?.rutas.map((r) => <option key={r.ruta} value={r.ruta}>{r.ruta}</option>)}
                  </select>
                </label>
                <label><span className={lbl}>Destino</span>
                  <select className={inp} value={vrDestino} onChange={(e) => setVrDestino(e.target.value)} disabled={!vrRuta}>
                    <option value="">Elige el destino…</option>
                    {meta?.rutas.find((r) => r.ruta === vrRuta)?.destinos.map((d) => (
                      <option key={d.destino} value={d.destino}>{d.destino} — S/ {d.sxTM.toFixed(2)}/TM</option>
                    ))}
                  </select>
                </label>
                <label><span className={lbl}>Peso transportado (TM)</span><input type="number" step="any" min="0" className={inp} value={pesoTM} onChange={(e) => setPesoTM(e.target.value)} placeholder="Ej. 20" /></label>
              </>
            ) : vrAmbito === "local" ? (
              <>
                <label><span className={lbl}>Puerto</span>
                  <select className={inp} value={vrPuerto} onChange={(e) => { setVrPuerto(e.target.value); setVrZona(""); }}>
                    <option value="">Elige el puerto…</option>
                    {meta?.puertos.map((p) => <option key={p.puerto} value={p.puerto}>{p.puerto}</option>)}
                  </select>
                </label>
                <label><span className={lbl}>Zona</span>
                  <select className={inp} value={vrZona} onChange={(e) => setVrZona(e.target.value)} disabled={!vrPuerto}>
                    <option value="">Elige la zona…</option>
                    {meta?.puertos.find((p) => p.puerto === vrPuerto)?.zonas.map((z) => <option key={z} value={z}>{z}</option>)}
                  </select>
                </label>
                <label><span className={lbl}>Tipo de carga</span>
                  <select className={inp} value={vrTipoCarga} onChange={(e) => setVrTipoCarga(e.target.value)}>
                    <option value="">Elige el tipo…</option>
                    {meta?.tiposCarga.map((t) => <option key={t.key} value={t.key}>{t.etiqueta}</option>)}
                  </select>
                </label>
                <label><span className={lbl}>Peso (TM){tipoCargaPorViaje ? " — no aplica" : ""}</span><input type="number" step="any" min="0" className={inp} value={pesoTM} onChange={(e) => setPesoTM(e.target.value)} placeholder={tipoCargaPorViaje ? "Por viaje" : "Ej. 20"} disabled={tipoCargaPorViaje} /></label>
              </>
            ) : null}

            <label className="sm:col-span-2"><span className={lbl}>Valor referencial (S/){vrAmbito ? " — calculado" : ""}</span>
              <input type="number" step="any" min="0" className={inp} value={valorReferencial} onChange={(e) => setValorReferencial(e.target.value)} placeholder="Tablas del MTC" readOnly={!!vrAmbito} />
            </label>
            {vrDetalle ? <p className="sm:col-span-2 -mt-2 text-xs text-slate-500">{vrDetalle}</p> : null}

            <label className="sm:col-span-2"><span className={lbl}>Detalle del viaje</span><input className={inp} value={detalleViaje} onChange={(e) => setDetalleViaje(e.target.value)} placeholder="TRANSPORTE VENTANILLA → CALLAO" /></label>
            <label><span className={lbl}>Ubigeo origen</span><input className={inp} value={ubigeoOrigen} onChange={(e) => setUbigeoOrigen(e.target.value)} placeholder="070101" /></label>
            <label><span className={lbl}>Ubigeo destino</span><input className={inp} value={ubigeoDestino} onChange={(e) => setUbigeoDestino(e.target.value)} placeholder="150101" /></label>
          </div>
        </Card>

        {/* Pago + totales */}
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Pago y totales</h2>
          <label className="block"><span className={lbl}>Forma de pago</span>
            <select className={inp} value={plazo} onChange={(e) => setPlazo(e.target.value)}>
              <option>Contado</option><option>Crédito 15 días</option><option>Crédito 30 días</option><option>Crédito (días)</option>
            </select>
          </label>
          {plazo === "Crédito (días)" ? (
            <label className="mt-3 block"><span className={lbl}>Días de crédito</span>
              <input type="number" min="1" step="1" className={inp} value={diasManual} onChange={(e) => setDiasManual(e.target.value)} placeholder="Ej. 45" />
            </label>
          ) : null}
          {vencimiento ? <p className="mt-2 text-sm text-slate-500">Vence el <b className="text-slate-800">{fecha(vencimiento)}</b> ({diasCredito} días).</p> : null}
          <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Monto gravado</span><span className="tabular font-medium">{dinero(gravado, moneda)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">IGV (18%)</span><span className="tabular font-medium">{dinero(igv, moneda)}</span></div>
            <div className="flex justify-between border-t border-slate-100 pt-1.5"><span className="font-semibold text-slate-700">Total</span><span className="tabular font-bold">{dinero(total, moneda)}</span></div>
          </div>
        </Card>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button disabled={busy} onClick={guardar} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
          <Save size={16} /> {busy ? "Guardando…" : editId ? "Guardar cambios" : "Guardar comprobante"}
        </button>
        <button onClick={() => setPreview(true)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600">
          <Eye size={16} /> Vista previa
        </button>
        <button onClick={() => router.push("/facturacion")} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
      </div>

      {preview ? (
        <FacturaPreview
          emisor={emisor}
          cuentas={cuentas.map((c) => ({ banco: c.banco, moneda: c.moneda, numero: c.numero, cci: c.cci }))}
          onClose={() => setPreview(false)}
          data={{
            tipo, fecha: fechaEmision, moneda, tipoCambio: tipoCambio ? Number(tipoCambio) : 0,
            cliente, ruc, direccion,
            lineas: lineas.map((l) => ({ descripcion: l.descripcion, cantidad: l.cantidad || 1, valorUnitario: l.valorUnitario || 0 })),
            formaPago: esCredito ? "Credito" : "Contado", fechaVencimiento: esCredito && vencimiento ? vencimiento : null,
            guia, guiaTransportista, referencia: referenciaOrden, detalleViaje,
            valorReferencial: valorReferencial ? Number(valorReferencial) : 0, ubigeoOrigen, ubigeoDestino,
          } as PreviewData}
        />
      ) : null}
    </div>
  );
}
