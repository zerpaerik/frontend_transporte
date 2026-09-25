"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Plus, X, Save, Eye } from "lucide-react";
import { Card } from "@/components/ui";
import { useData } from "@/lib/store";
import { apiViajePorCodigo, apiTarifas, apiFacturasE, apiEmisor, apiCuentas, apiClientes, type TarifasMeta, type EmisorConfig, type CuentaBancaria, type Cliente } from "@/lib/api";
import { dinero, soles, hoyPeru, fecha } from "@/lib/format";
import type { Factura, ServicioVR } from "@/lib/types";
import { FacturaPreview, type PreviewData } from "@/components/FacturaPreview";
import { UbigeoSelect } from "@/components/UbigeoSelect";

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
const r2v = (n: number) => Math.round(n * 100) / 100;
// Ruta "ORIGEN - DESTINO" para los textos que van al comprobante.
const rutaDe = (origen?: string, destino?: string) => [origen, destino].filter(Boolean).join(" - ");
// Acumula un valor en una lista separada por comas, sin repetir (para juntar varias
// órdenes / guías cuando una factura reúne varios viajes).
const addCsv = (current: string, value?: string) => {
  const val = String(value || "").trim();
  if (!val) return current;
  const partes = current.split(/[,/]/).map((s) => s.trim()).filter(Boolean);
  return partes.includes(val) ? current : (current ? `${current}, ${val}` : val);
};

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
  const [catClientes, setCatClientes] = useState<Cliente[]>([]);
  // Busca un cliente del catálogo por nombre (para jalar su RUC y dirección).
  const datosCliente = (nombre: string) => {
    const n = String(nombre || "").trim().toLowerCase();
    return catClientes.find((c) => c.nombre.trim().toLowerCase() === n) || null;
  };
  const [fechaEmision, setFechaEmision] = useState(hoyPeru());
  const [viaje, setViaje] = useState("-");
  const [referenciaOrden, setReferenciaOrden] = useState("");
  const [guia, setGuia] = useState("");
  const [valorReferencial, setValorReferencial] = useState("");
  const [ubigeoOrigen, setUbigeoOrigen] = useState("");
  const [ubigeoDestino, setUbigeoDestino] = useState("");
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [detalleViaje, setDetalleViaje] = useState("");
  const [observaciones, setObservaciones] = useState(""); // sale en "Observaciones" del comprobante (p. ej. la DAM)
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
  // Valor referencial por servicio: cada viaje suma su VR al total de la factura.
  // Se guardan también los insumos del cálculo para poder recalcularlo al emitir.
  const [serviciosVR, setServiciosVR] = useState<ServicioVR[]>([]);
  const [plazo, setPlazo] = useState("Contado"); // Contado | Crédito 15 días | Crédito 30 días | Crédito (días)
  const [diasManual, setDiasManual] = useState("15"); // días de crédito cuando se ponen a mano
  const [moneda, setMoneda] = useState("PEN"); // PEN | USD
  const [tipoCambio, setTipoCambio] = useState(""); // solo cuando la moneda es dólares
  const [guiaTransportista, setGuiaTransportista] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([{ descripcion: "SERVICIO DE TRANSPORTE", cantidad: 1, valorUnitario: 0 }]);

  const [codigo, setCodigo] = useState("");
  const [viajes, setViajes] = useState<string[]>([]); // códigos de viaje incluidos en esta factura
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
  // El servicio que se está calculando ahora mismo (aún no agregado a la lista).
  const vrEnCurso = r2v(Number(valorReferencial) || 0);
  // Valor referencial del comprobante: los servicios ya agregados MÁS el que está en
  // curso. Así nunca se pierde un cálculo por no haber pulsado "Agregar otro servicio".
  const totalVR = r2v(serviciosVR.reduce((s, x) => s + x.valor, 0) + vrEnCurso);

  // Cómo se llama el servicio en la lista: el detalle del cálculo si lo hay; si no, el
  // del viaje (numerado desde el segundo, para no repetir el mismo nombre).
  function detalleServicioVR(orden: number) {
    if (vrDetalle.trim()) return vrDetalle.trim();
    if (detalleViaje.trim()) return orden > 1 ? `${detalleViaje.trim()} (servicio ${orden})` : detalleViaje.trim();
    return `Servicio ${orden}`;
  }

  // Foto del servicio en curso (valor + insumos del cálculo) para guardarla/agregarla.
  function servicioEnCurso(orden: number): ServicioVR {
    return {
      detalle: detalleServicioVR(orden),
      valor: vrEnCurso,
      ambito: vrAmbito, ruta: vrRuta, destino: vrDestino,
      puerto: vrPuerto, zona: vrZona, tipoCarga: vrTipoCarga,
      pesoTM: pesoTM ? Number(pesoTM) : 0,
    };
  }
  function limpiarCalculadorVR() {
    setVrAmbito(""); setVrRuta(""); setVrDestino(""); setVrPuerto(""); setVrZona(""); setVrTipoCarga(""); setPesoTM(""); setValorReferencial(""); setVrDetalle("");
  }
  function sumarServicioVR() {
    if (vrEnCurso <= 0) { setMsg("Calcula o ingresa el valor referencial del servicio antes de agregarlo."); return; }
    setServiciosVR((s) => [...s, servicioEnCurso(s.length + 1)]);
    limpiarCalculadorVR();
    setMsg("");
  }
  const quitarServicioVR = (i: number) => setServiciosVR((s) => s.filter((_, j) => j !== i));

  const setLinea = (i: number, patch: Partial<Linea>) => setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const agregar = () => setLineas((ls) => [...ls, { descripcion: "", cantidad: 1, valorUnitario: 0 }]);
  const quitar = (i: number) => setLineas((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : ls));

  // Arma la línea de servicio con el detalle del viaje (como en la factura real).
  // Sin flechas ni símbolos fuera del latín: MiFact imprime el PDF en Latin-1 y "→"
  // sale como basura en el comprobante que recibe el cliente.
  function lineaDeViaje(v: any): Linea {
    const ruta = rutaDe(v.origen, v.destino);
    const partes = [
      v.fechaViaje ? `(${fecha(String(v.fechaViaje))})` : "",
      v.greTransporte ? `G.R.: ${v.greTransporte}` : "",
      v.placaTracto ? `PLACA: ${v.placaTracto}` : "",
      v.contenedor ? `CONT.: ${v.contenedor}` : "",
      v.tipoCarga ? `CARGA: ${v.tipoCarga}` : "",
      ruta ? `ORIGEN: ${v.origen} - DESTINO: ${v.destino}` : "",
    ].filter(Boolean).join(" | ");
    return { descripcion: `SERVICIO DE TRANSPORTE${partes ? " " + partes : ""}`, cantidad: 1, valorUnitario: Number(v.tarifa || 0) };
  }

  // Trae un viaje de Operaciones. append=false carga (reemplaza) el primer viaje;
  // append=true suma el viaje como una línea más (varios viajes en una sola factura).
  async function traer(cod: string, append = false) {
    const c = cod.trim();
    if (!c) return;
    setMsg("");
    try {
      const v = await apiViajePorCodigo(c);
      const cli = String(v.clienteFactura || v.cliente || "");
      const linea = lineaDeViaje(v);
      const ruta = rutaDe(v.origen, v.destino);

      if (append && cliente.trim()) {
        // Agrega el viaje como una línea adicional; conserva el cliente ya cargado.
        setLineas((ls) => [...ls.filter((l) => l.descripcion.trim() || l.valorUnitario), linea]);
        if (v.nOrden) setReferenciaOrden((r) => addCsv(r, String(v.nOrden)));
        // Al reunir varios viajes se acumulan las guías de cada uno (remitente y transportista).
        if (v.greRemitente) setGuia((g) => addCsv(g, String(v.greRemitente)));
        if (v.greTransporte) setGuiaTransportista((g) => addCsv(g, String(v.greTransporte)));
        setViajes((vs) => (vs.includes(c.toUpperCase()) ? vs : [...vs, c.toUpperCase()]));
        if (cli && cliente.trim() && cli !== cliente.trim()) setMsg(`Ojo: el viaje ${c} es de otro cliente (${cli}). Se agregó igual.`);
        setCodigo("");
        return;
      }

      // Carga inicial (reemplaza): datos del cliente + primera línea.
      setCliente(cli);
      // El RUC/dirección salen del catálogo por el nombre del cliente a facturar; si no
      // está en el catálogo, se usa lo que traiga el viaje.
      const cat = datosCliente(cli);
      setRuc(cat?.ruc || String(v.clienteRuc || ""));
      setDireccion(cat?.direccion || String(v.clienteDireccion || ""));
      setViaje(String(v.contenedor || "-"));
      setReferenciaOrden(String(v.nOrden || ""));
      setGuia(String(v.greRemitente || ""));
      setGuiaTransportista(String(v.greTransporte || ""));
      setDetalleViaje(ruta ? `TRANSPORTE ${ruta}` : "");
      setOrigen(String(v.origen || ""));
      setDestino(String(v.destino || ""));
      setLineas([linea]);
      setViajes([c.toUpperCase()]);
      // El comprobante arranca de cero: también el valor referencial del anterior.
      setServiciosVR([]);
      limpiarCalculadorVR();
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
    setUbigeoOrigen(f.ubigeoOrigen || "");
    setUbigeoDestino(f.ubigeoDestino || "");
    setOrigen(f.origen || "");
    setDestino(f.destino || "");
    setDetalleViaje(f.detalleViaje || "");
    setObservaciones(f.observaciones || "");
    setGuiaTransportista(f.guiaTransportista || "");
    setMoneda(f.moneda === "USD" ? "USD" : "PEN");
    setTipoCambio(f.tipoCambio ? String(f.tipoCambio) : "");
    const pl = plazoDesde(f);
    setPlazo(pl.plazo);
    if (pl.plazo === "Crédito (días)") setDiasManual(String(pl.dias));
    // Valor referencial: si el comprobante trae el desglose por servicio se carga la
    // lista y el calculador queda en blanco para el siguiente (si se precargaran los
    // insumos, el cálculo automático volvería a sumar el último servicio dos veces).
    if (f.serviciosVR?.length) {
      setServiciosVR(f.serviciosVR.map((s) => ({ ...s, valor: s.valor || 0 })));
    } else {
      setValorReferencial(f.valorReferencial ? String(f.valorReferencial) : "");
      setVrAmbito(f.vrAmbito || "");
      setVrRuta(f.vrRuta || "");
      setVrDestino(f.vrDestino || "");
      setVrPuerto(f.vrPuerto || "");
      setVrZona(f.vrZona || "");
      setVrTipoCarga(f.vrTipoCarga || "");
      setPesoTM(f.pesoTM ? String(f.pesoTM) : "");
    }
    if (f.items?.length) setLineas(f.items.map((i) => ({ descripcion: i.descripcion, cantidad: i.cantidad ?? 1, valorUnitario: i.valorUnitario ?? 0 })));
    setPrefilled(true);
  }, [editId, prefilled, facturas]);

  // Catálogo de tarifas referenciales (rutas/puertos) del DS 022-2025-MTC.
  useEffect(() => { apiTarifas.meta().then(setMeta).catch(() => {}); }, []);
  // Catálogo de clientes (para jalar el RUC y la dirección por nombre).
  useEffect(() => { apiClientes.list().then(setCatClientes).catch(() => {}); }, []);
  // Si hay cliente pero el RUC quedó vacío (p. ej. el viaje se trajo antes de que
  // cargara el catálogo), se completa el RUC/dirección desde el catálogo por nombre.
  useEffect(() => {
    if (!cliente || ruc) return;
    const cat = datosCliente(cliente);
    if (cat?.ruc) setRuc(cat.ruc);
    if (cat?.direccion && !direccion) setDireccion(cat.direccion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catClientes, cliente]);

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
        valorReferencial: totalVR,
        // Desglose por servicio: los agregados más el que quedó en el calculador. Se
        // envían solo los campos del servicio (sin id/facturaId/orden que trae la BD al editar).
        serviciosVR: (vrEnCurso > 0 ? [...serviciosVR, servicioEnCurso(serviciosVR.length + 1)] : serviciosVR).map((s) => ({
          detalle: s.detalle, valor: s.valor, ambito: s.ambito, ruta: s.ruta, destino: s.destino,
          puerto: s.puerto, zona: s.zona, tipoCarga: s.tipoCarga, pesoTM: s.pesoTM,
        })),
        vrAmbito, vrRuta, vrDestino, vrPuerto, vrZona, vrTipoCarga, pesoTM: pesoTM ? Number(pesoTM) : 0,
        referenciaVR: referenciaOrden.trim(), guia: guia.trim(), guiaTransportista: guiaTransportista.trim(),
        ubigeoOrigen: ubigeoOrigen.trim(), ubigeoDestino: ubigeoDestino.trim(), origen: origen.trim(), destino: destino.trim(), detalleViaje: detalleViaje.trim(),
        observaciones: observaciones.trim(),
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
      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Search size={16} className="text-slate-400" />
          <input value={codigo} onChange={(e) => setCodigo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") traer(codigo, !!cliente.trim()); }}
            placeholder="Código de viaje (OP-0001)" className="w-52 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
          <button onClick={() => traer(codigo, false)} className="rounded-lg bg-steel-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-steel-700">Traer del viaje</button>
          <button onClick={() => traer(codigo, true)} disabled={!cliente.trim()} title={cliente.trim() ? "Suma este viaje como otra línea" : "Primero trae un viaje"} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600 disabled:opacity-50"><Plus size={14} /> Agregar viaje</button>
          {msg ? <span className="text-sm text-rose-600">{msg}</span> : null}
        </div>
        {viajes.length ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <span>Viajes en esta factura:</span>
            {viajes.map((v) => <span key={v} className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-semibold tabular text-slate-600">{v}</span>)}
          </div>
        ) : null}
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
          <label className="sm:col-span-2"><span className={lbl}>Cliente (razón social)</span>
            <input className={inp} list="clientes-cat" value={cliente} placeholder="Cliente a facturar (viene de Operaciones)"
              onChange={(e) => {
                const nombre = e.target.value;
                setCliente(nombre);
                const cat = datosCliente(nombre); // si coincide con el catálogo, jala RUC y dirección
                if (cat) { setRuc(cat.ruc || ""); setDireccion(cat.direccion || ""); }
              }} />
            <datalist id="clientes-cat">{catClientes.map((c) => <option key={c.id} value={c.nombre} />)}</datalist>
          </label>
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
          <label><span className={lbl}>Orden de compra (O/C) / referencia</span>
            <input className={inp} value={referenciaOrden} onChange={(e) => setReferenciaOrden(e.target.value)} placeholder="Ej. 2440 o OC-2440" />
            <span className="mt-1 block text-xs text-slate-400">Para que salga en la casilla O/C de SUNAT: solo letras y números, <b>sin espacios</b> (máx. 20). Si escribes otra cosa (DAM, ID, BK…), irá a Observaciones.</span>
          </label>
          <label><span className={lbl}>Guía remitente</span><input className={inp} value={guia} onChange={(e) => setGuia(e.target.value)} placeholder="T002-1668" /></label>
          <label><span className={lbl}>Guía transportista</span><input className={inp} value={guiaTransportista} onChange={(e) => setGuiaTransportista(e.target.value)} placeholder="V001-00000123" /></label>
          <label className="sm:col-span-2"><span className={lbl}>Dirección del cliente</span><input className={inp} value={direccion} onChange={(e) => setDireccion(e.target.value)} /></label>
          <label className="sm:col-span-2"><span className={lbl}>Observaciones (salen en el comprobante)</span>
            <textarea className={`${inp} min-h-[72px]`} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder={"Ej. DAM N° 118-2026-10-451784\nUna observación por línea"} />
            <span className="mt-1 block text-xs text-slate-400">Aquí va la DAM u otras referencias que el cliente pida ver en la factura. Cada línea sale como una observación en el PDF.</span>
          </label>
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

            {vrEnCurso > 0 ? (
              <div className="sm:col-span-2 -mt-1">
                <button type="button" onClick={sumarServicioVR} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600"><Plus size={14} /> Agregar otro servicio</button>
                <span className="ml-2 text-xs text-slate-400">Cuando la factura junta varios viajes: agrega uno y calcula el siguiente. El total es la suma.</span>
              </div>
            ) : null}
            {serviciosVR.length || vrEnCurso > 0 ? (
              <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Valor referencial por servicio</div>
                <ul className="space-y-1">
                  {serviciosVR.map((s, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate text-slate-600">{s.detalle || `Servicio ${i + 1}`}</span>
                      <span className="flex items-center gap-2"><span className="tabular font-medium text-slate-800">{soles(s.valor)}</span><button type="button" onClick={() => quitarServicioVR(i)} title="Quitar" className="rounded p-0.5 text-slate-400 hover:text-rose-600"><X size={14} /></button></span>
                    </li>
                  ))}
                  {vrEnCurso > 0 ? (
                    <li className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate text-slate-600">{detalleServicioVR(serviciosVR.length + 1)} <span className="text-xs text-slate-400">· en el calculador</span></span>
                      <span className="tabular font-medium text-slate-800">{soles(vrEnCurso)}</span>
                    </li>
                  ) : null}
                </ul>
                <div className="mt-1.5 flex justify-between border-t border-slate-200 pt-1.5 text-sm"><span className="font-semibold text-slate-700">Total valor referencial</span><span className="tabular font-bold">{soles(totalVR)}</span></div>
              </div>
            ) : null}

            <label className="sm:col-span-2"><span className={lbl}>Detalle del viaje</span><input className={inp} value={detalleViaje} onChange={(e) => setDetalleViaje(e.target.value)} placeholder="TRANSPORTE VENTANILLA - CALLAO" /></label>
            <label><span className={lbl}>Ubigeo origen (partida)</span><UbigeoSelect value={ubigeoOrigen} onChange={setUbigeoOrigen} placeholder="Distrito de partida…" /></label>
            <label><span className={lbl}>Ubigeo destino (llegada)</span><UbigeoSelect value={ubigeoDestino} onChange={setUbigeoDestino} placeholder="Distrito de llegada…" /></label>
            <label><span className={lbl}>Dirección de origen</span><input className={inp} value={origen} onChange={(e) => setOrigen(e.target.value)} placeholder="Ej. Ransa - Callao" /></label>
            <label><span className={lbl}>Dirección de destino</span><input className={inp} value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Ej. Ventanilla" /></label>
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
            guia, guiaTransportista, referencia: referenciaOrden, detalleViaje, observaciones,
            valorReferencial: totalVR, ubigeoOrigen, ubigeoDestino,
          } as PreviewData}
        />
      ) : null}
    </div>
  );
}
