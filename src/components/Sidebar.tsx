"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { navFor } from "@/lib/nav";
import { useAuth } from "@/lib/auth";

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const items = navFor(user?.rol ?? "Operador");

  return (
    <>
      {/* overlay móvil */}
      {open ? (
        <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={onClose} aria-hidden />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-slate-200 px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500 font-extrabold text-white">T</div>
            <div className="leading-tight">
              <div className="text-sm font-bold text-slate-800">Transporte</div>
              <div className="text-[11px] text-slate-400">Carga Pesada</div>
            </div>
          </Link>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 lg:hidden" aria-label="Cerrar menú">
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-col gap-0.5 overflow-y-auto p-3" style={{ height: "calc(100% - 4rem)" }}>
          {items.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.4 : 2} className={active ? "text-brand-600" : "text-slate-400"} />
                <span className="flex-1">{item.label}</span>
                {item.modulo ? (
                  <span className="text-[10px] font-semibold tabular text-slate-300">{item.modulo}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
