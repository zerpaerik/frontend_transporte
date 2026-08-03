"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export type Field =
  | { name: string; label: string; type: "text" | "date"; required?: boolean; placeholder?: string; full?: boolean; default?: string }
  | { name: string; label: string; type: "number"; required?: boolean; placeholder?: string; step?: number; full?: boolean; default?: number }
  | { name: string; label: string; type: "select"; options: string[]; required?: boolean; full?: boolean; default?: string };

export type FormValues = Record<string, string | number>;

function initial(fields: Field[]): Record<string, string> {
  const o: Record<string, string> = {};
  for (const f of fields) {
    if (f.type === "select") o[f.name] = f.default ?? f.options[0] ?? "";
    else o[f.name] = f.default != null ? String(f.default) : "";
  }
  return o;
}

export function FormModal({
  open, title, subtitle, fields, submitLabel = "Guardar", onSubmit, onClose,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  fields: Field[];
  submitLabel?: string;
  onSubmit: (values: FormValues) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => initial(fields));
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setValues(initial(fields));
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  function set(name: string, v: string) {
    setValues((s) => ({ ...s, [name]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    for (const f of fields) {
      if (f.required && !String(values[f.name] ?? "").trim()) {
        setError(`El campo "${f.label}" es obligatorio.`);
        return;
      }
    }
    const out: FormValues = {};
    for (const f of fields) {
      const raw = values[f.name] ?? "";
      out[f.name] = f.type === "number" ? Number(raw || 0) : raw;
    }
    onSubmit(out);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-6">
      <div className="mt-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.name} className={f.full ? "sm:col-span-2" : ""}>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {f.label} {f.required ? <span className="text-brand-600">*</span> : null}
                </label>
                {f.type === "select" ? (
                  <select
                    value={values[f.name]}
                    onChange={(e) => set(f.name, e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                  >
                    {f.options.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type}
                    inputMode={f.type === "number" ? "decimal" : undefined}
                    step={f.type === "number" ? f.step ?? "any" : undefined}
                    value={values[f.name]}
                    placeholder={f.type !== "date" ? f.placeholder : undefined}
                    onChange={(e) => set(f.name, e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                  />
                )}
              </div>
            ))}
          </div>

          {error ? (
            <div className="mx-6 mb-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
