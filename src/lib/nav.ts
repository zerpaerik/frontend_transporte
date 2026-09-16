import {
  LayoutDashboard, Truck, IdCard, Wrench, Package, CircleDot,
  Container, PackageCheck, ReceiptText, Wallet, UserCog, Coins, FolderCog, Fuel, FolderArchive, CalendarClock, Building2, ScrollText, FileMinus, Landmark, type LucideIcon,
} from "lucide-react";
import type { Rol } from "./types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  modulo: string;
  roles: Rol[]; // roles que pueden ver este módulo
  grupo?: string; // agrupa el ítem bajo un submenú (p. ej. "SUNAT")
}

const TODOS: Rol[] = ["Administrador", "Operador", "Mecánico"];

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, modulo: "", roles: TODOS },
  { href: "/vehiculos", label: "Flota", icon: Truck, modulo: "01", roles: [...TODOS, "Conductor"] },
  { href: "/conductores", label: "Conductores", icon: IdCard, modulo: "02", roles: ["Administrador", "Operador", "Conductor"] },
  { href: "/mantenimiento", label: "Mantenimiento", icon: Wrench, modulo: "03", roles: ["Administrador", "Mecánico"] },
  { href: "/repuestos", label: "Repuestos", icon: Package, modulo: "04", roles: ["Administrador", "Mecánico"] },
  { href: "/neumaticos", label: "Neumáticos", icon: CircleDot, modulo: "05", roles: ["Administrador", "Mecánico"] },
  { href: "/combustible", label: "Combustible", icon: Fuel, modulo: "12", roles: ["Administrador", "Operador", "Mecánico"] },
  { href: "/peajes", label: "Peajes", icon: Coins, modulo: "15", roles: ["Administrador", "Operador"] },
  { href: "/agenda", label: "Agenda", icon: CalendarClock, modulo: "14", roles: ["Administrador", "Operador"] },
  { href: "/operaciones", label: "Operaciones", icon: Container, modulo: "06", roles: ["Administrador", "Operador"] },
  { href: "/devoluciones", label: "Devoluciones", icon: PackageCheck, modulo: "07", roles: ["Administrador", "Operador"] },
  { href: "/facturacion", label: "Facturación", icon: ReceiptText, modulo: "09", roles: ["Administrador", "Operador"], grupo: "SUNAT" },
  { href: "/facturacion/nota-credito", label: "Notas de crédito", icon: FileMinus, modulo: "09", roles: ["Administrador", "Operador"], grupo: "SUNAT" },
  { href: "/gre", label: "GRE Transportista", icon: ScrollText, modulo: "09", roles: ["Administrador", "Operador"], grupo: "SUNAT" },
  { href: "/facturacion-emisor", label: "Datos del emisor", icon: Building2, modulo: "09", roles: ["Administrador"], grupo: "SUNAT" },
  { href: "/cuentas-bancarias", label: "Cuentas bancarias", icon: Landmark, modulo: "09", roles: ["Administrador"], grupo: "SUNAT" },
  { href: "/planilla", label: "Planilla", icon: Wallet, modulo: "10", roles: ["Administrador"] },
  { href: "/archivos", label: "Archivos", icon: FolderArchive, modulo: "13", roles: ["Administrador", "Contable"] },
  // Comisiones se maneja ahora dentro de la planilla. Se oculta del menú y se
  // bloquea la ruta (roles: []); el backend del tarifario/bono sigue en uso.
  { href: "/comisiones", label: "Comisiones", icon: Coins, modulo: "11", roles: [] },
  { href: "/usuarios", label: "Usuarios", icon: UserCog, modulo: "08", roles: ["Administrador"] },
  { href: "/catalogos", label: "Catálogos", icon: FolderCog, modulo: "", roles: ["Administrador"] },
];

export function navFor(rol: Rol): NavItem[] {
  return NAV.filter((n) => n.roles.includes(rol));
}

// Nodo de navegación: ítem suelto o grupo con submenú.
export type NavNode =
  | { kind: "item"; item: NavItem }
  | { kind: "group"; nombre: string; icon: LucideIcon; items: NavItem[] };

// Arma la navegación agrupando por `grupo` (el submenú aparece donde va su primer ítem).
export function navGroupsFor(rol: Rol): NavNode[] {
  const out: NavNode[] = [];
  const idxByGrupo: Record<string, number> = {};
  for (const item of navFor(rol)) {
    if (!item.grupo) { out.push({ kind: "item", item }); continue; }
    let idx = idxByGrupo[item.grupo];
    if (idx === undefined) {
      idx = out.length;
      idxByGrupo[item.grupo] = idx;
      out.push({ kind: "group", nombre: item.grupo, icon: item.icon, items: [] });
    }
    (out[idx] as { kind: "group"; items: NavItem[] }).items.push(item);
  }
  return out;
}

// Primera pantalla a la que puede entrar el rol (para redirigir tras login o acceso denegado).
export function homeFor(rol: Rol): string {
  return navFor(rol)[0]?.href ?? "/dashboard";
}

export function canAccess(rol: Rol, href: string): boolean {
  const item = NAV.find((n) => href === n.href || href.startsWith(n.href + "/"));
  if (!item) return true; // rutas no listadas (p.ej. /dashboard base) permitidas
  return item.roles.includes(rol);
}
