"use client";

import { useState } from "react";
import { Plus, UserCog, Trash2 } from "lucide-react";
import { PageHeader, StatCard, Badge } from "@/components/ui";
import { DataTable, type Column, type Filter } from "@/components/DataTable";
import { FormModal, type Field, type FormValues } from "@/components/FormModal";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import type { Rol, Usuario } from "@/lib/types";

const rolTone: Record<Rol, "orange" | "blue" | "gray"> = {
  Administrador: "orange", Operador: "blue", Mecánico: "gray",
};

const fields: Field[] = [
  { name: "nombre", label: "Nombre completo", type: "text", required: true, placeholder: "Rosa Quispe", full: true },
  { name: "email", label: "Correo", type: "text", required: true, placeholder: "usuario@transporte.pe" },
  { name: "password", label: "Contraseña", type: "text", required: true, placeholder: "••••••••" },
  { name: "rol", label: "Rol", type: "select", options: ["Administrador", "Operador", "Mecánico"] },
  { name: "estado", label: "Estado", type: "select", options: ["Activo", "Inactivo"], full: true },
];

const columns: Column<Usuario>[] = [
  { key: "nombre", header: "Nombre", sortable: true, render: (u) => <span className="font-semibold text-slate-900">{u.nombre}</span> },
  { key: "email", header: "Correo", sortable: true, render: (u) => <span className="text-slate-600">{u.email}</span> },
  { key: "rol", header: "Rol", sortable: true, render: (u) => <Badge tone={rolTone[u.rol]}>{u.rol}</Badge> },
  { key: "password", header: "Contraseña (demo)", render: (u) => <span className="tabular text-slate-400">{u.password}</span> },
  { key: "activo", header: "Estado", sortable: true, value: (u) => (u.activo ? "Activo" : "Inactivo"), render: (u) => <Badge tone={u.activo ? "green" : "gray"}>{u.activo ? "Activo" : "Inactivo"}</Badge> },
];

const filters: Filter<Usuario>[] = [
  { key: "rol", label: "Rol", value: (u) => u.rol },
];

export default function UsuariosPage() {
  const { usuarios, addUsuario, removeUsuario } = useData();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  function guardar(v: FormValues) {
    addUsuario({
      nombre: String(v.nombre), email: String(v.email).toLowerCase(), password: String(v.password),
      rol: v.rol as Rol, activo: v.estado === "Activo",
    });
  }

  const accionesColumn: Column<Usuario> = {
    key: "acciones", header: "",
    render: (u) => (
      u.email === user?.email ? (
        <span className="text-xs text-slate-300">tu cuenta</span>
      ) : (
        <button onClick={() => { if (confirm(`¿Eliminar al usuario ${u.nombre} (${u.email})?`)) removeUsuario(u.id); }}
          title="Eliminar usuario" className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600">
          <Trash2 size={14} />
        </button>
      )
    ),
  };

  return (
    <div>
      <PageHeader modulo="08" title="Usuarios y roles" subtitle="Control de acceso por rol. El menú de cada usuario cambia según su rol." />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="Usuarios" value={usuarios.length} icon={UserCog} tone="blue" />
        <StatCard label="Administradores" value={usuarios.filter((u) => u.rol === "Administrador").length} icon={UserCog} tone="orange" />
        <StatCard label="Activos" value={usuarios.filter((u) => u.activo).length} icon={UserCog} tone="green" />
      </div>

      <DataTable
        title="Usuarios del sistema"
        exportName="usuarios"
        columns={[...columns, accionesColumn]}
        rows={usuarios}
        filters={filters}
        minWidth="min-w-[720px]"
        searchPlaceholder="Buscar por nombre o correo…"
        toolbar={
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            <Plus size={16} /> Nuevo usuario
          </button>
        }
      />

      <FormModal open={open} title="Nuevo usuario" subtitle="Crea un usuario del sistema y asígnale un rol." fields={fields} onSubmit={guardar} onClose={() => setOpen(false)} />
    </div>
  );
}
