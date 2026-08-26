import {
  LayoutDashboard, Truck, IdCard, Wrench, Package, CircleDot,
  Container, ReceiptText, Wallet, UserCog, Coins, FolderCog, type LucideIcon,
} from "lucide-react";
import type { Rol } from "./types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  modulo: string;
  roles: Rol[]; // roles que pueden ver este módulo
}

const TODOS: Rol[] = ["Administrador", "Operador", "Mecánico"];

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, modulo: "", roles: TODOS },
  { href: "/vehiculos", label: "Flota", icon: Truck, modulo: "01", roles: [...TODOS, "Conductor"] },
  { href: "/conductores", label: "Conductores", icon: IdCard, modulo: "02", roles: ["Administrador", "Operador", "Conductor"] },
  { href: "/mantenimiento", label: "Mantenimiento", icon: Wrench, modulo: "03", roles: ["Administrador", "Mecánico"] },
  { href: "/repuestos", label: "Repuestos", icon: Package, modulo: "04", roles: ["Administrador", "Mecánico"] },
  { href: "/neumaticos", label: "Neumáticos", icon: CircleDot, modulo: "05", roles: ["Administrador", "Mecánico"] },
  { href: "/operaciones", label: "Operaciones", icon: Container, modulo: "06", roles: ["Administrador", "Operador"] },
  { href: "/facturacion", label: "Facturación SUNAT", icon: ReceiptText, modulo: "09", roles: ["Administrador", "Operador"] },
  { href: "/planilla", label: "Planilla", icon: Wallet, modulo: "10", roles: ["Administrador"] },
  // Comisiones se maneja ahora dentro de la planilla. Se oculta del menú y se
  // bloquea la ruta (roles: []); el backend del tarifario/bono sigue en uso.
  { href: "/comisiones", label: "Comisiones", icon: Coins, modulo: "11", roles: [] },
  { href: "/usuarios", label: "Usuarios", icon: UserCog, modulo: "08", roles: ["Administrador"] },
  { href: "/catalogos", label: "Catálogos", icon: FolderCog, modulo: "", roles: ["Administrador"] },
];

export function navFor(rol: Rol): NavItem[] {
  return NAV.filter((n) => n.roles.includes(rol));
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
