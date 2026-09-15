"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, ChevronDown } from "lucide-react";
import { navGroupsFor, type NavItem } from "@/lib/nav";
import { useAuth } from "@/lib/auth";

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const nodes = navGroupsFor(user?.rol ?? "Operador");

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
          {nodes.map((node) =>
            node.kind === "item" ? (
              <ItemLink key={node.item.href} item={node.item} active={pathname === node.item.href} onClose={onClose} />
            ) : (
              <Grupo key={node.nombre} nombre={node.nombre} Icon={node.icon} items={node.items} pathname={pathname} onClose={onClose} />
            ),
          )}
        </nav>
      </aside>
    </>
  );
}

function ItemLink({ item, active, onClose, sub }: { item: NavItem; active: boolean; onClose: () => void; sub?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={`flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition ${sub ? "pl-9 pr-3" : "px-3"} ${
        active ? "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {!sub ? <Icon size={18} strokeWidth={active ? 2.4 : 2} className={active ? "text-brand-600" : "text-slate-400"} /> : null}
      {sub ? <Icon size={15} strokeWidth={active ? 2.4 : 2} className={active ? "text-brand-600" : "text-slate-400"} /> : null}
      <span className="flex-1">{item.label}</span>
      {item.modulo && !sub ? <span className="text-[10px] font-semibold tabular text-slate-300">{item.modulo}</span> : null}
    </Link>
  );
}

function Grupo({ nombre, Icon, items, pathname, onClose }: { nombre: string; Icon: NavItem["icon"]; items: NavItem[]; pathname: string; onClose: () => void }) {
  const contieneActiva = items.some((i) => pathname === i.href || pathname.startsWith(i.href + "/"));
  const [abierto, setAbierto] = useState(contieneActiva);
  const open = abierto || contieneActiva;
  return (
    <div>
      <button
        onClick={() => setAbierto((v) => !v)}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
          contieneActiva ? "text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`}
      >
        <Icon size={18} strokeWidth={contieneActiva ? 2.4 : 2} className={contieneActiva ? "text-brand-600" : "text-slate-400"} />
        <span className="flex-1 text-left">{nombre}</span>
        <ChevronDown size={15} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="mt-0.5 flex flex-col gap-0.5">
          {items.map((i) => (
            <ItemLink key={i.href} item={i} active={pathname === i.href} onClose={onClose} sub />
          ))}
        </div>
      ) : null}
    </div>
  );
}
