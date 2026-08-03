import { Plus, IdCard, Phone, AlertTriangle } from "lucide-react";
import { PageHeader, StatCard, Card, Badge } from "@/components/ui";
import { CONDUCTORES } from "@/lib/mock-data";
import { fecha, diasRestantes, estadoDocumento } from "@/lib/format";

export default function ConductoresPage() {
  const docs = CONDUCTORES.flatMap((c) => c.documentos.map((d) => estadoDocumento(d.vencimiento)));
  const porVencer = docs.filter((e) => e === "Por vencer").length;
  const vencidos = docs.filter((e) => e === "Vencido").length;

  return (
    <div>
      <PageHeader
        modulo="02"
        title="Conductores"
        subtitle="Datos del conductor y sus documentos. El sistema alerta 15–20 días antes de cada vencimiento."
        action={
          <button className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            <Plus size={16} /> Nuevo conductor
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="Conductores" value={CONDUCTORES.length} icon={IdCard} tone="blue" />
        <StatCard label="Docs. por vencer" value={porVencer} icon={AlertTriangle} tone="amber" />
        <StatCard label="Docs. vencidos" value={vencidos} icon={AlertTriangle} tone="red" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {CONDUCTORES.map((c) => (
          <Card key={c.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-steel-600 text-sm font-bold text-white">
                  {c.nombre.split(" ").slice(0, 2).map((s) => s[0]).join("")}
                </span>
                <div>
                  <div className="font-bold text-slate-900">{c.nombre}</div>
                  <div className="text-xs text-slate-500">Licencia {c.licencia} · Cat. {c.categoria}</div>
                </div>
              </div>
              <a href={`tel:${c.telefono.replace(/\s/g, "")}`} className="flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600">
                <Phone size={13} /> {c.telefono}
              </a>
            </div>

            <div className="mt-4 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Documentos</div>
              {c.documentos.map((d, i) => {
                const est = estadoDocumento(d.vencimiento);
                const dias = diasRestantes(d.vencimiento);
                return (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-700">{d.tipo}</div>
                      <div className="truncate text-xs text-slate-400">N° {d.numero} · vence {fecha(d.vencimiento)}</div>
                    </div>
                    {est === "Vigente" ? (
                      <Badge tone="green">Vigente</Badge>
                    ) : est === "Por vencer" ? (
                      <Badge tone="amber">Vence en {dias} d</Badge>
                    ) : (
                      <Badge tone="red">Vencido</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
