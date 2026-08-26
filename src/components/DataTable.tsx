"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Search, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, ChevronsUpDown } from "lucide-react";
import { Card } from "./ui";
import { exportCSV, exportPDF, type Cell } from "@/lib/export";

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  render?: (row: T) => ReactNode;
  value?: (row: T) => Cell;
  sortable?: boolean;
  thClass?: string;
}

export interface Filter<T> {
  key: string;
  label: string;
  value: (row: T) => string;
  options?: string[];
}

const alignCls = { left: "text-left", right: "text-right", center: "text-center" } as const;

export function DataTable<T extends { id: string }>({
  title, columns, rows, filters = [], searchPlaceholder = "Buscar…",
  pageSize = 8, exportName = "export", minWidth = "min-w-[720px]", toolbar,
  dateField, dateLabel = "Fecha", recentDays, rowActions,
}: {
  title: string;
  columns: Column<T>[];
  rows: T[];
  filters?: Filter<T>[];
  searchPlaceholder?: string;
  pageSize?: number;
  exportName?: string;
  minWidth?: string;
  toolbar?: ReactNode;
  dateField?: (row: T) => string | null | undefined;
  dateLabel?: string;
  recentDays?: number; // si se pasa, por defecto muestra solo los últimos N días (con toggle "ver todo")
  rowActions?: (row: T) => ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(1);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [showAll, setShowAll] = useState(false);

  // "Últimos N días": solo aplica si no hay un rango de fechas manual ni se pidió ver todo.
  const recentCutoff = useMemo(() => (recentDays ? new Date(Date.now() - recentDays * 86_400_000).toISOString().slice(0, 10) : ""), [recentDays]);
  const recentActive = !!(dateField && recentDays && !showAll && !desde && !hasta);

  const cellValue = (row: T, c: Column<T>): Cell =>
    c.value ? c.value(row) : ((row as Record<string, unknown>)[c.key] as Cell) ?? "";

  const filterOptions = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const f of filters) {
      map[f.key] = f.options ?? Array.from(new Set(rows.map((r) => f.value(r)).filter(Boolean))).sort();
    }
    return map;
  }, [filters, rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      for (const f of filters) {
        const sel = active[f.key];
        if (sel && sel !== "__all__" && f.value(r) !== sel) return false;
      }
      if (dateField && (desde || hasta)) {
        const d = (dateField(r) || "").slice(0, 10);
        if (!d) return false;
        if (desde && d < desde) return false;
        if (hasta && d > hasta) return false;
      }
      if (recentActive && dateField) {
        const d = (dateField(r) || "").slice(0, 10);
        if (!d || d < recentCutoff) return false;
      }
      if (!q) return true;
      return columns.some((c) => String(cellValue(r, c)).toLowerCase().includes(q));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, active, filters, columns, desde, hasta, recentActive, recentCutoff]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtered;
    return [...filtered].sort((a, b) => {
      const av = cellValue(a, col), bv = cellValue(b, col);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * sort.dir;
      return String(av).localeCompare(String(bv), "es") * sort.dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * pageSize;
  const pageRows = sorted.slice(start, start + pageSize);

  function toggleSort(c: Column<T>) {
    if (!c.sortable) return;
    setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 }));
  }

  function doExport(kind: "csv" | "pdf") {
    const headers = columns.map((c) => c.header);
    const data = sorted.map((r) => columns.map((c) => cellValue(r, c)));
    if (kind === "csv") exportCSV(exportName, headers, data);
    else exportPDF(title, headers, data, `${sorted.length} registro(s) · exportado del sistema`);
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        {filters.map((f) => (
          <select
            key={f.key}
            value={active[f.key] ?? "__all__"}
            onChange={(e) => { setActive((s) => ({ ...s, [f.key]: e.target.value })); setPage(1); }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
          >
            <option value="__all__">{f.label}: todos</option>
            {filterOptions[f.key]?.map((op) => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
        ))}

        {dateField ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-600">
            <span className="text-xs text-slate-400">{dateLabel}:</span>
            <input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setPage(1); }} className="rounded border-0 text-sm outline-none" />
            <span className="text-slate-300">→</span>
            <input type="date" value={hasta} onChange={(e) => { setHasta(e.target.value); setPage(1); }} className="rounded border-0 text-sm outline-none" />
            {(desde || hasta) ? <button onClick={() => { setDesde(""); setHasta(""); }} className="text-xs text-slate-400 hover:text-rose-600">✕</button> : null}
          </div>
        ) : null}

        {recentDays ? (
          <button
            onClick={() => { if (recentActive) { setShowAll(true); } else { setShowAll(false); setDesde(""); setHasta(""); } setPage(1); }}
            title={recentActive ? "Mostrando solo lo reciente — clic para ver todo el historial" : `Ver solo los últimos ${recentDays} días`}
            className={recentActive
              ? "whitespace-nowrap rounded-lg border border-brand-500 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700"
              : "whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600"}
          >
            Últimos {recentDays} días
          </button>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => doExport("csv")} title="Exportar a Excel (CSV)"
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700">
            <FileSpreadsheet size={15} /> Excel
          </button>
          <button onClick={() => doExport("pdf")} title="Exportar a PDF"
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-700">
            <FileText size={15} /> PDF
          </button>
          {toolbar}
        </div>
      </div>

      {/* Tabla */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className={`w-full ${minWidth} text-left text-sm`}>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    onClick={() => toggleSort(c)}
                    className={`whitespace-nowrap border-b border-slate-200 bg-slate-50/80 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${alignCls[c.align ?? "left"]} ${c.sortable ? "cursor-pointer select-none hover:text-slate-800" : ""} ${c.thClass ?? ""}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.header}
                      {c.sortable ? <ChevronsUpDown size={12} className={sort?.key === c.key ? "text-brand-500" : "text-slate-300"} /> : null}
                    </span>
                  </th>
                ))}
                {rowActions ? <th className="whitespace-nowrap border-b border-slate-200 bg-slate-50/80 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr><td colSpan={columns.length + (rowActions ? 1 : 0)} className="px-4 py-12 text-center text-sm text-slate-400">Sin resultados para el filtro actual</td></tr>
              ) : null}
              {pageRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/60">
                  {columns.map((c) => (
                    <td key={c.key} className={`border-b border-slate-100 px-4 py-3 align-middle text-slate-700 ${alignCls[c.align ?? "left"]}`}>
                      {c.render ? c.render(row) : String(cellValue(row, c))}
                    </td>
                  ))}
                  {rowActions ? <td className="border-b border-slate-100 px-4 py-3 text-right align-middle">{rowActions(row)}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
          <span>
            {sorted.length === 0 ? "0" : `${start + 1}–${Math.min(start + pageSize, sorted.length)}`} de {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, current - 1))}
              disabled={current <= 1}
              className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={15} /> Anterior
            </button>
            <span className="px-2 tabular">Página {current} / {totalPages}</span>
            <button
              onClick={() => setPage(Math.min(totalPages, current + 1))}
              disabled={current >= totalPages}
              className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
