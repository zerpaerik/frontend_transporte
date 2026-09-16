"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { UBIGEOS_BUSCA, ubigeoPorCodigo, type Ubigeo } from "@/lib/ubigeos";

// Buscador de ubigeo (distrito / provincia / departamento) que devuelve el código
// INEI de 6 dígitos. Reemplaza al input libre en los campos de ubigeo de SUNAT.
export function UbigeoSelect({
  value,
  onChange,
  placeholder = "Busca distrito, provincia…",
}: {
  value: string;
  onChange: (codigo: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const actual = ubigeoPorCodigo(value);

  const resultados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    const palabras = t.split(/\s+/);
    const out: Ubigeo[] = [];
    for (const u of UBIGEOS_BUSCA) {
      const heno = `${u.etiqueta.toLowerCase()} ${u.codigo}`;
      if (palabras.every((w) => heno.includes(w))) {
        out.push(u);
        if (out.length >= 40) break;
      }
    }
    return out;
  }, [q]);

  function pick(u: Ubigeo) {
    onChange(u.codigo);
    setQ("");
    setOpen(false);
  }

  const texto = open ? q : actual ? `${actual.etiqueta} (${actual.codigo})` : value || "";

  return (
    <div className="relative">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={texto}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); setQ(""); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 pl-8 pr-8 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        {value && !open ? (
          <button type="button" onMouseDown={(e) => { e.preventDefault(); onChange(""); }} title="Quitar" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-rose-600">
            <X size={15} />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
          {q.trim().length < 2 ? (
            <div className="px-3 py-2 text-xs text-slate-400">Escribe al menos 2 letras (distrito, provincia o código)…</div>
          ) : resultados.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400">Sin resultados para “{q.trim()}”.</div>
          ) : (
            resultados.map((u) => (
              <button
                key={u.codigo}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pick(u); }}
                className="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm hover:bg-brand-50"
              >
                <span className="truncate text-slate-700">{u.distrito}<span className="text-slate-400">, {u.provincia}, {u.departamento}</span></span>
                <span className="shrink-0 tabular text-xs text-slate-400">{u.codigo}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
