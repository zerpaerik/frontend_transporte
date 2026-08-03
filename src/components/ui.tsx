import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type Tone = "gray" | "green" | "amber" | "red" | "blue" | "orange";

const TONE: Record<Tone, string> = {
  gray: "bg-slate-100 text-slate-600 ring-slate-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-rose-50 text-rose-700 ring-rose-200",
  blue: "bg-steel-50 text-steel-700 ring-steel-200",
  orange: "bg-brand-50 text-brand-700 ring-brand-200",
};

export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONE[tone]}`}>
      {children}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-card ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({
  modulo, title, subtitle, action,
}: { modulo?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        {modulo ? (
          <div className="text-xs font-bold uppercase tracking-widest text-brand-600">Módulo {modulo}</div>
        ) : null}
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  label, value, icon: Icon, tone = "orange", hint,
}: { label: string; value: ReactNode; icon: LucideIcon; tone?: Tone; hint?: string }) {
  const iconTone: Record<Tone, string> = {
    gray: "bg-slate-100 text-slate-500",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-rose-50 text-rose-600",
    blue: "bg-steel-50 text-steel-600",
    orange: "bg-brand-50 text-brand-600",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
          <div className="mt-2 text-2xl font-extrabold tabular text-slate-900">{value}</div>
          {hint ? <div className="mt-1 text-xs text-slate-400">{hint}</div> : null}
        </div>
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${iconTone[tone]}`}>
          <Icon size={20} strokeWidth={2} />
        </div>
      </div>
    </Card>
  );
}

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
      </div>
    </Card>
  );
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <th className={`whitespace-nowrap border-b border-slate-200 bg-slate-50/80 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`border-b border-slate-100 px-4 py-3 align-middle text-slate-700 ${className}`}>{children}</td>;
}

export function EmptyRow({ colSpan, text = "Sin registros" }: { colSpan: number; text?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-slate-400">{text}</td>
    </tr>
  );
}
