"use client";

import { useEffect, useState } from "react";
import { Plus, Landmark, Pencil, Trash2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { PageHeader, Card, Badge } from "@/components/ui";
import { FormModal, type Field, type FormValues } from "@/components/FormModal";
import { apiCuentas, type CuentaBancaria } from "@/lib/api";

export default function CuentasBancariasPage() {
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<CuentaBancaria | null>(null);
  const [busy, setBusy] = useState(false);

  function cargar() {
    apiCuentas.list().then(setCuentas).catch(() => setCuentas([])).finally(() => setCargando(false));
  }
  useEffect(() => { cargar(); }, []);

  const fields = (c?: CuentaBancaria): Field[] => [
    { name: "banco", label: "Banco", type: "text", required: true, placeholder: "Banco de Crédito del Perú", default: c?.banco, full: true },
    { name: "moneda", label: "Moneda", type: "select", options: ["Soles", "Dólares"], default: c?.moneda ?? "Soles" },
    { name: "tipo", label: "Tipo de cuenta", type: "select", options: ["Corriente", "Ahorros"], default: c?.tipo ?? "Corriente" },
    { name: "numero", label: "N° de cuenta", type: "text", required: true, placeholder: "1917384797006", default: c?.numero },
    { name: "cci", label: "CCI", type: "text", placeholder: "00219100738479700655", default: c?.cci },
  ];

  async function guardar(v: FormValues) {
    setBusy(true);
    const body = {
      banco: String(v.banco || "").trim(), moneda: String(v.moneda || "Soles"), tipo: String(v.tipo || "Corriente"),
      numero: String(v.numero || "").trim(), cci: String(v.cci || "").trim(),
    };
    try {
      if (edit) await apiCuentas.update(edit.id, body);
      else await apiCuentas.create({ ...body, orden: cuentas.length });
      setOpen(false); setEdit(null); cargar();
    } catch (e) { alert((e as Error).message || "No se pudo guardar la cuenta."); }
    finally { setBusy(false); }
  }

  async function toggle(c: CuentaBancaria) {
    try { await apiCuentas.update(c.id, { activo: !c.activo }); cargar(); }
    catch (e) { alert((e as Error).message || "No se pudo actualizar."); }
  }
  async function eliminar(c: CuentaBancaria) {
    if (!confirm(`¿Eliminar la cuenta ${c.banco} ${c.moneda} (${c.numero})?`)) return;
    try { await apiCuentas.remove(c.id); cargar(); }
    catch (e) { alert((e as Error).message || "No se pudo eliminar."); }
  }

  return (
    <div>
      <PageHeader modulo="09" title="Cuentas bancarias" subtitle="Cuentas de la empresa para el pago de los clientes. Las cuentas activas se envían en cada comprobante que se emite a SUNAT." />

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">La cuenta de detracción se configura aparte, en <b>Datos del emisor</b>.</p>
        <button onClick={() => { setEdit(null); setOpen(true); }} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
          <Plus size={16} /> Agregar cuenta
        </button>
      </div>

      {cargando ? (
        <Card className="p-10 text-center text-sm text-slate-400">Cargando…</Card>
      ) : cuentas.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-400">Aún no hay cuentas. Agrega la primera con “Agregar cuenta”.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {cuentas.map((c) => (
            <Card key={c.id} className={`p-4 ${c.activo ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-steel-600 text-white"><Landmark size={18} /></span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-800">{c.banco}</span>
                      <Badge tone={c.moneda === "Dólares" ? "blue" : "green"}>{c.moneda}</Badge>
                      <span className="text-xs text-slate-400">{c.tipo}</span>
                      {!c.activo ? <Badge tone="gray">Inactiva</Badge> : null}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">N° <span className="tabular font-medium text-slate-800">{c.numero}</span></div>
                    {c.cci ? <div className="text-xs text-slate-400">CCI <span className="tabular">{c.cci}</span></div> : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={() => toggle(c)} title={c.activo ? "Desactivar" : "Activar"} className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-brand-300 hover:text-brand-600">{c.activo ? <Eye size={15} /> : <EyeOff size={15} />}</button>
                  <button onClick={() => { setEdit(c); setOpen(true); }} title="Editar" className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-brand-300 hover:text-brand-600"><Pencil size={15} /></button>
                  <button onClick={() => eliminar(c)} title="Eliminar" className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {cuentas.some((c) => c.activo) ? (
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
          <span>Estas cuentas activas se incluirán en cada comprobante emitido, para que el cliente pueda hacer el pago.</span>
        </div>
      ) : null}

      <FormModal
        open={open}
        title={edit ? "Editar cuenta bancaria" : "Nueva cuenta bancaria"}
        subtitle="Se muestra en los comprobantes para el pago del cliente."
        fields={fields(edit ?? undefined)}
        submitLabel={busy ? "Guardando…" : "Guardar"}
        onSubmit={guardar}
        onClose={() => { setOpen(false); setEdit(null); }}
      />
    </div>
  );
}
