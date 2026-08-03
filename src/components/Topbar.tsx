"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { NAV } from "@/lib/nav";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const current = NAV.find((n) => n.href === pathname);
  const iniciales = (user?.nombre || "?")
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("");

  function salir() {
    logout();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-8">
      <div className="flex items-center gap-3">
        <button onClick={onMenu} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Abrir menú">
          <Menu size={20} />
        </button>
        <div className="text-sm font-semibold text-slate-700">{current?.label ?? "Panel"}</div>
      </div>

      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2 transition hover:bg-slate-100"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-steel-600 text-xs font-bold text-white">
            {iniciales}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium leading-4 text-slate-800">{user?.nombre}</span>
            <span className="block text-[11px] text-slate-400">{user?.rol}</span>
          </span>
          <ChevronDown size={16} className="text-slate-400" />
        </button>

        {menuOpen ? (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
            <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <div className="border-b border-slate-100 px-4 py-3">
                <div className="text-sm font-semibold text-slate-800">{user?.nombre}</div>
                <div className="text-xs text-slate-400">{user?.email}</div>
              </div>
              <button
                onClick={salir}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50"
              >
                <LogOut size={16} /> Cerrar sesión
              </button>
            </div>
          </>
        ) : null}
      </div>
    </header>
  );
}
