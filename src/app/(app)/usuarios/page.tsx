"use client";

import { useState } from "react";
import { Plus, UserCog, Pencil, Ban, Check } from "lucide-react";
import { PageHeader, StatCard, Badge } from "@/components/ui";
import { DataTable, type Column, type Filter } from "@/components/DataTable";
import { FormModal, type Field, type FormValues } from "@/components/FormModal";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import type { Rol, Usuario } from "@/lib/types";

const rolTone: Record<Rol, "orange" | "blue" | "gray" | "green" | "amber"> = {
  Administrador: "orange", Operador: "blue", Mecánico: "gray", Conductor: "green", Contable: "amber",
};

const ROLES = ["Administrador", "Operador", "Mecánico", "Conductor", "Contable"];

const crearFields: Field[] = [
  { name: "nombre", label: "Nombre completo", type: "text", required: true, placeholder: "Rosa Quispe", full: true },
  { name: "email", label: "Correo", type: "text", required: true, placeholder: "usuario@transporte.pe" },
  { name: "password", label: "Contraseña", type: "text", required: true, placeholder: "Mínimo 4 caracteres" },
  { name: "rol", label: "Rol", type: "select", options: ROLES },
  { name: "estado", label: "Estado", type: "select", options: ["Activo", "Inactivo"], full: true },
];

const editarFields = (u: Usuario): Field[] => [
  { name: "nombre", label: "Nombre completo", type: "text", required: true, full: true, default: u.nombre },
  { name: "email", label: "Correo", type: "text", required: true, default: u.email },
  { name: "password", label: "Nueva contraseña (opcional)", type: "text", placeholder: "Dejar en blanco para no cambiarla" },
  { name: "rol", label: "Rol", type: "select", options: ROLES, default: u.rol },
  { name: "estado", label: "Estado", type: "select", options: ["Activo", "Inactivo"], full: true, default: u.activo ? "Activo" : "Inactivo" },
];

const columns: Column<Usuario>[] = [
  { key: "nombre", header: "Nombre", sortable: true, render: (u) => <span className="font-semibold text-slate-900">{u.nombre}</span> },
  { key: "email", header: "Correo", sortable: true, render: (u) => <span className="text-slate-600">{u.email}</span> },
  { key: "rol", header: "Rol", sortable: true, render: (u) => <Badge tone={rolTone[u.rol]}>{u.rol}</Badge> },
  { key: "activo", header: "Estado", sortable: true, value: (u) => (u.activo ? "Activo" : "Inactivo"), render: (u) => <Badge tone={u.activo ? "green" : "gray"}>{u.activo ? "Activo" : "Inactivo"}</Badge> },
];

const filters: Filter<Usuario>[] = [
  { key: "rol", label: "Rol", value: (u) => u.rol },
];

export default function UsuariosPage() {
  const { usuarios, addUsuario, updateUsuario } = useData();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState<Usuario | null>(null);

  function guardar(v: FormValues) {
    addUsuario({
      nombre: String(v.nombre), email: String(v.email).toLowerCase(), password: String(v.password),
      rol: v.rol as Rol, activo: v.estado === "Activo",
    });
  }

  function guardarEdit(v: FormValues) {
    if (!editUser) return;
    const esYo = editUser.email === user?.email;
    const activo = v.estado === "Activo";
    if (esYo && !activo) { alert("No puedes desactivar tu propia cuenta."); return; }
    const body: Partial<Usuario> = {
      nombre: String(v.nombre), email: String(v.email).toLowerCase(), rol: v.rol as Rol, activo,
    };
    const pass = String(v.password || "").trim();
    if (pass) (body as Partial<Usuario>).password = pass;
    updateUsuario(editUser.id, body);
    setEditUser(null);
  }

  function toggleActivo(u: Usuario) {
    const msg = u.activo
      ? `¿Desactivar a ${u.nombre}? No podrá iniciar sesión, pero no se borra nada (sus operaciones quedan intactas). Podrás reactivarlo cuando quieras.`
      : `¿Activar a ${u.nombre}? Volverá a tener acceso al sistema.`;
    if (confirm(msg)) updateUsuario(u.id, { activo: !u.activo });
  }

  const acciones: Column<Usuario> = {
    key: "acciones", header: "",
    render: (u) => {
      const esYo = u.email === user?.email;
      return (
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={() => setEditUser(u)} title="Editar usuario"
            className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-brand-300 hover:text-brand-600">
            <Pencil size={14} />
          </button>
          {esYo ? (
            <span className="pl-1 text-xs text-slate-300">tu cuenta</span>
          ) : u.activo ? (
            <button onClick={() => toggleActivo(u)} title="Desactivar (no borra, solo bloquea el acceso)"
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700">
              <Ban size={13} /> Desactivar
            </button>
          ) : (
            <button onClick={() => toggleActivo(u)} title="Activar (vuelve a dar acceso)"
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700">
              <Check size={13} /> Activar
            </button>
          )}
        </div>
      );
    },
  };

  return (
    <div>
      <PageHeader modulo="08" title="Usuarios y roles" subtitle="Control de acceso por rol. Edita los datos o desactiva el acceso sin borrar nada." />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="Usuarios" value={usuarios.length} icon={UserCog} tone="blue" />
        <StatCard label="Administradores" value={usuarios.filter((u) => u.rol === "Administrador").length} icon={UserCog} tone="orange" />
        <StatCard label="Activos" value={usuarios.filter((u) => u.activo).length} icon={UserCog} tone="green" />
      </div>

      <DataTable
        title="Usuarios del sistema"
        exportName="usuarios"
        columns={[...columns, acciones]}
        rows={usuarios}
        filters={filters}
        minWidth="min-w-[640px]"
        searchPlaceholder="Buscar por nombre o correo…"
        toolbar={
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            <Plus size={16} /> Nuevo usuario
          </button>
        }
      />

      <FormModal open={open} title="Nuevo usuario" subtitle="Crea un usuario del sistema y asígnale un rol." fields={crearFields} onSubmit={guardar} onClose={() => setOpen(false)} />

      {editUser ? (
        <FormModal
          open
          title={`Editar usuario — ${editUser.nombre}`}
          subtitle="Actualiza sus datos, rol o estado. La contraseña solo cambia si escribes una nueva."
          fields={editarFields(editUser)}
          submitLabel="Guardar cambios"
          onSubmit={guardarEdit}
          onClose={() => setEditUser(null)}
        />
      ) : null}
    </div>
  );
}
