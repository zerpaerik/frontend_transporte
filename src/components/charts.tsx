"use client";

import type { ReactNode } from "react";

export interface Slice {
  label: string;
  value: number;
  color: string;
}

export function BarChart({ data, format }: { data: Slice[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex flex-col gap-3">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-sm text-slate-600">{d.label}</span>
          <div className="h-6 flex-1 overflow-hidden rounded-md bg-slate-100">
            <div className="flex h-full items-center justify-end rounded-md px-2" style={{ width: `${Math.max(6, (d.value / max) * 100)}%`, background: d.color }}>
              <span className="text-[11px] font-semibold text-white tabular">{format ? format(d.value) : d.value}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Donut({ data, total, centerLabel }: { data: Slice[]; total?: number; centerLabel?: string }) {
  const sum = total ?? data.reduce((s, d) => s + d.value, 0);
  const r = 52, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-6">
      <svg width="140" height="140" viewBox="0 0 140 140" className="shrink-0">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#eef2f6" strokeWidth="16" />
        {data.map((d, i) => {
          const frac = sum > 0 ? d.value / sum : 0;
          const len = frac * c;
          const el = (
            <circle
              key={i}
              cx="70" cy="70" r={r} fill="none" stroke={d.color} strokeWidth="16"
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset}
              transform="rotate(-90 70 70)" strokeLinecap="butt"
            />
          );
          offset += len;
          return el;
        })}
        <text x="70" y="66" textAnchor="middle" className="fill-slate-900" style={{ fontSize: 22, fontWeight: 800 }}>{sum}</text>
        {centerLabel ? <text x="70" y="84" textAnchor="middle" className="fill-slate-400" style={{ fontSize: 11 }}>{centerLabel}</text> : null}
      </svg>
      <div className="flex flex-col gap-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-sm">
            <span className="h-3 w-3 rounded-full" style={{ background: d.color }} />
            <span className="text-slate-600">{d.label}</span>
            <span className="ml-auto font-semibold text-slate-800 tabular">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartCard({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h2 className="font-bold text-slate-800">{title}</h2>
          {subtitle ? <p className="text-xs text-slate-400">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
