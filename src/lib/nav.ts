import {
  LayoutDashboard, Truck, IdCard, Wrench, Package, CircleDot,
  Container, ReceiptText, Wallet, UserCog, type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  modulo: string;
}

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, modulo: "" },
  { href: "/vehiculos", label: "Flota", icon: Truck, modulo: "01" },
  { href: "/conductores", label: "Conductores", icon: IdCard, modulo: "02" },
  { href: "/mantenimiento", label: "Mantenimiento", icon: Wrench, modulo: "03" },
  { href: "/repuestos", label: "Repuestos", icon: Package, modulo: "04" },
  { href: "/neumaticos", label: "Neumáticos", icon: CircleDot, modulo: "05" },
  { href: "/operaciones", label: "Operaciones", icon: Container, modulo: "06" },
  { href: "/facturacion", label: "Facturación SUNAT", icon: ReceiptText, modulo: "09" },
  { href: "/planilla", label: "Planilla", icon: Wallet, modulo: "10" },
  { href: "/usuarios", label: "Usuarios", icon: UserCog, modulo: "08" },
];
