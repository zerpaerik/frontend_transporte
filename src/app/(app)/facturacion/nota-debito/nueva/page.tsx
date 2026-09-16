"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X, Send } from "lucide-react";
import { Card, Badge } from "@/components/ui";
import { useData } from "@/lib/store";
import { api, apiFacturasE } from "@/lib/api";
import { soles, hoyPeru } from "@/lib/format";
import type { Factura } from "@/lib/types";

const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const lbl = "mb-1 block text-sm font-medium text-slate-700";
const num = (v: string) => Number(String(v).replace(",", ".") || 0);

type Linea = { descripcion: string; cantidad: number; valorUnitario: number };

// Catálogo 10 SUNAT — motivos de nota de débito.
const MOTIVOS_ND: { code: string; label: string; texto: string }[] = [
  { code: "01", label: "01 — Intereses por mora", texto: "INTERES POR MORA" },
  { code: "02", label: "02 — Aumento en el valor", texto: "AUMENTO EN EL VALOR" },
  { code: "03", label: "03 — Penalidades / otros conceptos", texto: "PENALIDAD" },
  { code: "11", label: "11 — Ajustes de operaciones de exportación", texto: "AJUSTE DE EXPORTACION" },
  { code: "12", label: "12 — Ajustes afectos al IVAP", texto: "AJUSTE IVAP" },
];

export default function NotaDebitoPage() {
  const router = useRouter();
  const { facturas, reload } = useData();

  // Solo se puede debitar un comprobante ACEPTADO por SUNAT (factura o boleta), no una nota.
  const debitables = useMemo(
    () => facturas.filter((f) => (f.estadoDocumento === "102" || f.estadoDocumento === "103") && f.tipo !== "N. Crédito" && f.tipo !== "N. Débito"),
    [facturas],
  );

  const [facturaId, setFacturaId] = useState("");
  const base = facturas.find((f) => f.id === facturaId) || null;
  const [codTipNd, setCodTipNd] = useState("01");
  const [motivo, setMotivo] = useState("");
  const [fechaEmision, setFechaEmision] = useState(hoyPeru());
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // A diferencia de la NC, la nota de débito AGREGA un cargo (interés, penalidad,
  // aumento de valor); no copia las líneas de la factura. Arranca con una línea vacía.
  useEffect(() => {
    if (!base) { setLineas([]); return; }
    setLineas((ls) => (ls.length ? ls : [{ descripcion: "", cantidad: 1, valorUnitario: 0 }]));
    setMotivo((m) => m || "INTERES POR MORA");
  }, [facturaId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Al cambiar el tipo, sugiere el texto del motivo (sin pisar lo que el usuario ya escribió).
  function cambiarTipo(code: string) {
    setCodTipNd(code);
    const t = MOTIVOS_ND.find((m) => m.code === code)?.texto || "";
    setMotivo((prev) => (!prev || MOTIVOS_ND.some((m) => m.texto === prev) ? t : prev));
  }

  const setLinea = (i: number, patch: Partial<Linea>) => setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const agregar = () => setLineas((ls) => [...ls, { descripcion: "", cantidad: 1, valorUnitario: 0 }]);
  const quitar = (i: number) => setLineas((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : ls));
  const gravado = Math.round(lineas.reduce((s, l) => s + (l.valorUnitario || 0) * (l.cantidad || 1), 0) * 100) / 100;
  const igv = Math.round(gravado * 0.18 * 100) / 100;
  const total = Math.round((gravado + igv) * 100) / 100;

  async function crearYEmitir() {
    if (!base) { setMsg("Elige la factura a la que se le hará la nota de débito."); return; }
    if (!base.correlativo) { setMsg("La factura seleccionada no tiene número; no se puede referenciar."); return; }
    const items = lineas.filter((l) => l.descripcion.trim() || l.valorUnitario).map((l) => ({ descripcion: l.descripcion, cantidad: l.cantidad || 1, valorUnitario: l.valorUnitario || 0 }));
    if (!items.length || items.some((l) => l.valorUnitario <= 0)) { setMsg("Cada línea debe tener descripción y un valor mayor a 0."); return; }
    setBusy(true); setMsg("");
    try {
      const body = {
        tipo: "N. Débito",
        cliente: base.cliente, ruc: base.ruc || "-", direccion: base.direccion || "",
        fecha: fechaEmision, viaje: base.viaje || "-",
        monto: gravado, igv, estadoSunat: "Emitida",
        moneda: base.moneda || "PEN", tipoCambio: base.tipoCambio || 0,
        items,
        // Referencia al comprobante que se debita
        docRefTipo: base.tipo === "Boleta" ? "03" : "01",
        docRefSerie: base.serie,
        docRefCorrelativo: base.correlativo,
        codTipNc: codTipNd,
        motivo: motivo.trim() || "INTERES POR MORA",
      };
      const creada = await api.post<Factura>("/facturas", body);
      const r = await apiFacturasE.emitir(creada.id);
      const e = r.respuesta;
      await reload();
      alert(e.estado_documento === "102" ? `✅ Nota de débito aceptada por SUNAT: ${e.sunat_description}` : `Estado ${e.estado_documento || "?"}: ${e.errors || e.sunat_description || "sin detalle"}`);
      router.push("/facturacion/nota-debito");
    } catch (e) {
      setMsg((e as Error).message || "No se pudo emitir la nota de débito.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={() => router.push("/facturacion/nota-debito")} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600"><ArrowLeft size={16} /> Volver a notas de débito</button>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Nueva nota de débito</h1>
      <p className="mt-1 text-sm text-slate-500">Se emite sobre una factura (o boleta) ya aceptada por SUNAT para <b>agregar un cargo</b> (intereses por mora, penalidad, aumento de valor). Elige el comprobante, el motivo y confirma.</p>

      <Card className="mt-5 p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Comprobante a debitar</h2>
        <label className="block"><span className={lbl}>Factura / boleta (aceptada)</span>
          <select className={inp} value={facturaId} onChange={(e) => setFacturaId(e.target.value)}>
            <option value="">Elige el comprobante…</option>
            {debitables.map((f) => (
              <option key={f.id} value={f.id}>{f.serie}-{f.correlativo} · {f.cliente} · {soles(f.total || f.monto + f.igv)}</option>
            ))}
          </select>
        </label>
        {debitables.length === 0 ? <p className="mt-2 text-xs text-amber-600">No hay comprobantes aceptados por SUNAT para debitar.</p> : null}
        {base ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <Badge tone="gray">{base.tipo}</Badge>
            <span className="font-semibold text-slate-800">{base.serie}-{base.correlativo}</span>
            <span className="text-slate-500">{base.cliente} · {base.ruc}</span>
            <span className="ml-auto tabular font-semibold">{soles(base.total || base.monto + base.igv)}</span>
          </div>
        ) : null}
      </Card>

      {base ? (
        <>
          <Card className="mt-4 p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Motivo</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label><span className={lbl}>Tipo (catálogo SUNAT)</span>
                <select className={inp} value={codTipNd} onChange={(e) => cambiarTipo(e.target.value)}>
                  {MOTIVOS_ND.map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}
                </select>
              </label>
              <label><span className={lbl}>Fecha de emisión</span><input type="date" className={inp} value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} /></label>
              <label className="sm:col-span-2"><span className={lbl}>Descripción / sustento</span><input className={inp} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="INTERES POR MORA" /></label>
            </div>
          </Card>

          <Card className="mt-4 p-5">
            <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-500">Líneas de la nota de débito</h2>
            <p className="mb-3 text-xs text-slate-400">El cargo que se agrega al cliente (interés, penalidad, diferencia de valor). El IGV (18%) se calcula sobre el monto.</p>
            <div className="space-y-2">
              {lineas.map((l, i) => (
                <div key={i} className="flex items-start gap-2">
                  <textarea value={l.descripcion} onChange={(e) => setLinea(i, { descripcion: e.target.value })} placeholder="Descripción del cargo" rows={2} className="min-w-0 flex-1 resize-y rounded-md border border-slate-200 px-2 py-1.5 text-sm leading-snug outline-none focus:border-brand-500" />
                  <input type="number" step="any" min="0" value={l.cantidad} onChange={(e) => setLinea(i, { cantidad: num(e.target.value) })} title="Cantidad" className="w-16 rounded-md border border-slate-200 px-2 py-1.5 text-right text-sm tabular outline-none focus:border-brand-500" />
                  <input type="number" step="any" min="0" value={l.valorUnitario || ""} onChange={(e) => setLinea(i, { valorUnitario: num(e.target.value) })} placeholder="0.00" title="Valor unitario (sin IGV)" className="w-28 rounded-md border border-slate-200 px-2 py-1.5 text-right text-sm tabular outline-none focus:border-brand-500" />
                  <button onClick={() => quitar(i)} title="Quitar" className="mt-1 rounded p-1 text-slate-400 hover:text-rose-600"><X size={16} /></button>
                </div>
              ))}
            </div>
            <button onClick={agregar} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600"><Plus size={14} /> Agregar línea</button>
            <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Monto gravado</span><span className="tabular font-medium">{soles(gravado)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">IGV (18%)</span><span className="tabular font-medium">{soles(igv)}</span></div>
              <div className="flex justify-between border-t border-slate-100 pt-1.5"><span className="font-semibold text-slate-700">Total ND</span><span className="tabular font-bold">{soles(total)}</span></div>
            </div>
          </Card>

          <div className="mt-5 flex items-center gap-3">
            <button disabled={busy} onClick={crearYEmitir} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
              <Send size={16} /> {busy ? "Emitiendo…" : "Crear y emitir nota de débito"}
            </button>
            <button onClick={() => router.push("/facturacion/nota-debito")} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
          </div>
        </>
      ) : null}

      {msg ? <p className="mt-3 text-sm text-rose-600">{msg}</p> : null}
    </div>
  );
}
