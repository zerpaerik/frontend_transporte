"use client";

import { useEffect, useState } from "react";
import { Building2, Save, ShieldCheck, TriangleAlert, CheckCircle2 } from "lucide-react";
import { PageHeader, Card, Badge } from "@/components/ui";
import { apiEmisor, type EmisorConfig, type EmisorRespuesta, type CorrelativoTipo } from "@/lib/api";
import { UbigeoSelect } from "@/components/UbigeoSelect";

type Form = Omit<EmisorConfig, "id" | "sedeId">;

const VACIO: Form = {
  ruc: "", razonSocial: "", nombreComercial: "", ubigeo: "", direccionFiscal: "", codAnexo: "0000",
  serieFactura: "FN01", serieBoleta: "BN01", serieNotaCredito: "FN01", serieNotaDebito: "FD01", serieGuiaTransportista: "V001", registroMtc: "", puntoVenta: "",
  ctaDetraccion: "", porcDetraccion: 4, codDetraccion: "027", umbralDetraccion: 400,
  formatoImpresion: "001",
  correoEnvio: "", activo: false,
};

function Campo({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  );
}

const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export default function EmisorPage() {
  const [meta, setMeta] = useState<{ ambiente: "demo" | "prod"; esProd: boolean; integracionConfigurada: boolean } | null>(null);
  const [correlativos, setCorrelativos] = useState<CorrelativoTipo[]>([]);
  const [f, setF] = useState<Form>(VACIO);
  const [cargando, setCargando] = useState(true);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  function aplicar(r: EmisorRespuesta) {
    // La API devuelve la fila completa; se quitan los campos que no se editan ni se deben
    // reenviar (id, sedeId, createdAt, updatedAt) para no chocar con la validación del backend.
    const { id: _id, sedeId: _sedeId, createdAt: _c, updatedAt: _u, ...rest } =
      r.config as EmisorConfig & { createdAt?: unknown; updatedAt?: unknown };
    void _id; void _sedeId; void _c; void _u;
    setF(rest);
    setMeta({ ambiente: r.ambiente, esProd: r.esProd, integracionConfigurada: r.integracionConfigurada });
    setCorrelativos(r.correlativos || []);
  }

  useEffect(() => {
    apiEmisor.get().then(aplicar).catch(() => {}).finally(() => setCargando(false));
  }, []);

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setF((p) => ({ ...p, [k]: v }));
    setOk(false);
  }

  async function guardar() {
    setBusy(true);
    try {
      aplicar(await apiEmisor.update(f));
      setOk(true);
    } catch (e) {
      alert((e as Error).message || "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  async function fijar(tipoDoc: string, desde: number) {
    try { aplicar(await apiEmisor.setCorrelativo(tipoDoc, desde)); }
    catch (e) { alert((e as Error).message || "No se pudo fijar el correlativo."); }
  }

  const esProd = meta?.esProd;

  return (
    <div>
      <PageHeader modulo="09" title="Datos del emisor — facturación electrónica"
        subtitle="Información de la empresa que emite los comprobantes ante SUNAT (vía MiFact). El token y el ambiente los configura el servidor, no se editan aquí." />

      {/* Banner de ambiente */}
      <div className={`mb-5 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${esProd ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}>
        {esProd ? <TriangleAlert className="text-rose-600" size={20} /> : <ShieldCheck className="text-emerald-600" size={20} />}
        <div className="text-sm">
          <span className={`font-bold ${esProd ? "text-rose-700" : "text-emerald-700"}`}>
            Ambiente: {cargando ? "…" : (esProd ? "PRODUCCIÓN — se envía real a SUNAT" : "DEMO — nada se envía a SUNAT")}
          </span>
          <span className="ml-2 text-slate-500">
            {meta?.integracionConfigurada ? "Integración configurada (URL + token presentes)." : "Falta cargar URL base o token en el servidor."}
          </span>
        </div>
        <span className="ml-auto"><Badge tone={esProd ? "red" : "green"}>{cargando ? "…" : (esProd ? "PROD" : "DEMO")}</Badge></span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Empresa */}
        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500"><Building2 size={16} /> Empresa emisora</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Campo label="Razón social"><input className={inputCls} value={f.razonSocial} onChange={(e) => set("razonSocial", e.target.value)} placeholder="MGR SERVICIOS INTEGRADOS S.A.C." /></Campo></div>
            <Campo label="Nombre comercial" hint="Opcional"><input className={inputCls} value={f.nombreComercial} onChange={(e) => set("nombreComercial", e.target.value)} /></Campo>
            <Campo label="RUC"><input className={inputCls} value={f.ruc} onChange={(e) => set("ruc", e.target.value)} placeholder="20616110340" /></Campo>
            <Campo label="Ubigeo" hint="Busca el distrito del domicilio fiscal (código INEI/SUNAT)"><UbigeoSelect value={f.ubigeo} onChange={(v) => set("ubigeo", v)} placeholder="Distrito del emisor…" /></Campo>
            <Campo label="Código de anexo" hint="Local anexo (0000 si es el principal)"><input className={inputCls} value={f.codAnexo} onChange={(e) => set("codAnexo", e.target.value)} placeholder="0000" /></Campo>
            <Campo label="Registro MTC" hint="N° de registro del transportista (para la GRE)"><input className={inputCls} value={f.registroMtc} onChange={(e) => set("registroMtc", e.target.value)} placeholder="15174917CNG" /></Campo>
            <div className="sm:col-span-2"><Campo label="Dirección fiscal"><input className={inputCls} value={f.direccionFiscal} onChange={(e) => set("direccionFiscal", e.target.value)} placeholder="Av. ... Lima" /></Campo></div>
          </div>
        </Card>

        {/* Series */}
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Series y punto de venta</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Serie de factura" hint="Distinta a la del portal MiFact"><input className={inputCls} value={f.serieFactura} onChange={(e) => set("serieFactura", e.target.value)} placeholder="FN01" /></Campo>
            <Campo label="Serie de boleta"><input className={inputCls} value={f.serieBoleta} onChange={(e) => set("serieBoleta", e.target.value)} placeholder="BN01" /></Campo>
            <Campo label="Serie de nota de crédito"><input className={inputCls} value={f.serieNotaCredito} onChange={(e) => set("serieNotaCredito", e.target.value)} placeholder="FN01" /></Campo>
            <Campo label="Serie de nota de débito"><input className={inputCls} value={f.serieNotaDebito} onChange={(e) => set("serieNotaDebito", e.target.value)} placeholder="FD01" /></Campo>
            <Campo label="Serie de GRE (transportista)" hint="Guía de remisión electrónica"><input className={inputCls} value={f.serieGuiaTransportista} onChange={(e) => set("serieGuiaTransportista", e.target.value)} placeholder="V001" /></Campo>
            <Campo label="Punto de venta" hint="COD_PTO_VENTA"><input className={inputCls} value={f.puntoVenta} onChange={(e) => set("puntoVenta", e.target.value)} /></Campo>
            <Campo label="Formato de impresión (PDF)" hint="Código del formato en MiFact: 001 = básico. Pide a MiFact el código de tu formato personalizado."><input className={inputCls} value={f.formatoImpresion} onChange={(e) => set("formatoImpresion", e.target.value)} placeholder="001" /></Campo>
            <div className="sm:col-span-2"><Campo label="Correo de envío" hint="Copia opcional al emitir"><input className={inputCls} value={f.correoEnvio} onChange={(e) => set("correoEnvio", e.target.value)} placeholder="facturacion@empresa.com" /></Campo></div>
          </div>
        </Card>

        {/* Detracción */}
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Detracción (transporte de carga)</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Campo label="Cuenta de detracción" hint="N° de cuenta del Banco de la Nación"><input className={inputCls} value={f.ctaDetraccion} onChange={(e) => set("ctaDetraccion", e.target.value)} placeholder="00-000-000000" /></Campo></div>
            <Campo label="Código de detracción" hint="027 = transporte de carga"><input className={inputCls} value={f.codDetraccion} onChange={(e) => set("codDetraccion", e.target.value)} placeholder="027" /></Campo>
            <Campo label="Porcentaje (%)"><input type="number" step="any" min="0" className={inputCls} value={f.porcDetraccion} onChange={(e) => set("porcDetraccion", Number(e.target.value))} /></Campo>
            <Campo label="Umbral (S/)" hint="Detracción solo si el total supera este monto"><input type="number" step="any" min="0" className={inputCls} value={f.umbralDetraccion} onChange={(e) => set("umbralDetraccion", Number(e.target.value))} /></Campo>
          </div>
        </Card>

        {/* Estado */}
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Emisión electrónica</h3>
          <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-500" checked={f.activo} onChange={(e) => set("activo", e.target.checked)} />
            <span className="text-sm">
              <span className="font-semibold text-slate-700">Habilitar emisión electrónica para esta sede</span>
              <span className="mt-0.5 block text-xs text-slate-500">Con esto activado y la integración configurada, la Facturación podrá emitir comprobantes a SUNAT (en el ambiente actual).</span>
            </span>
          </label>
          <p className="mt-3 text-xs text-slate-400">Recuerda: el <b>token</b> y el <b>ambiente</b> (demo/prod) los define el servidor por variables de entorno, no desde aquí.</p>
        </Card>
      </div>

      {correlativos.length ? <div className="mt-5"><Numeracion items={correlativos} onFijar={fijar} /></div> : null}

      <div className="mt-5 flex items-center gap-3">
        <button disabled={busy || cargando} onClick={guardar}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
          <Save size={16} /> {busy ? "Guardando…" : "Guardar datos del emisor"}
        </button>
        {ok ? <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600"><CheckCircle2 size={16} /> Guardado</span> : null}
      </div>
    </div>
  );
}

function Numeracion({ items, onFijar }: { items: CorrelativoTipo[]; onFijar: (tipoDoc: string, desde: number) => Promise<void> }) {
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [busyTipo, setBusyTipo] = useState("");
  async function fijar(t: CorrelativoTipo) {
    const val = Number(edit[t.tipoDoc]);
    if (!val || val < 1) { alert("Ingresa un número válido (1 o mayor)."); return; }
    setBusyTipo(t.tipoDoc);
    try { await onFijar(t.tipoDoc, val); setEdit((e) => ({ ...e, [t.tipoDoc]: "" })); }
    finally { setBusyTipo(""); }
  }
  return (
    <Card className="p-5">
      <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-500">Numeración (correlativo por tipo)</h3>
      <p className="mb-4 text-xs text-slate-400">Cada tipo de comprobante lleva su propio contador por serie. El correlativo solo puede avanzar (no bajar), para no repetir números ya emitidos. Fija el número inicial antes de emitir en producción.</p>
      <div className="space-y-2">
        {items.map((t) => (
          <div key={t.tipoDoc} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3">
            <div className="min-w-[130px]">
              <div className="text-sm font-semibold text-slate-700">{t.etiqueta}</div>
              <div className="text-xs text-slate-400">Serie {t.serie}</div>
            </div>
            <div className="text-sm text-slate-500">Próximo: <span className="tabular font-bold text-slate-800">{t.serie}-{t.siguiente}</span></div>
            <div className="ml-auto flex items-center gap-2">
              <input type="number" min="1" placeholder="Fijar desde…" value={edit[t.tipoDoc] ?? ""} onChange={(e) => setEdit((s) => ({ ...s, [t.tipoDoc]: e.target.value }))}
                className="w-32 rounded-lg border border-slate-300 px-3 py-1.5 text-right text-sm tabular outline-none focus:border-brand-500" />
              <button disabled={busyTipo === t.tipoDoc} onClick={() => fijar(t)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50">
                {busyTipo === t.tipoDoc ? "…" : "Fijar"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
