import { Plus, UserCog } from "lucide-react";
import { PageHeader, StatCard, TableWrap, Th, Td, Badge } from "@/components/ui";
import { USUARIOS } from "@/lib/mock-data";
import type { Rol } from "@/lib/types";

const rolTone: Record<Rol, "orange" | "blue" | "gray"> = {
  Administrador: "orange",
  Operador: "blue",
  Mecánico: "gray",
};

export default function UsuariosPage() {
  return (
    <div>
      <PageHeader
        modulo="08"
        title="Usuarios y roles"
        subtitle="Control de acceso por rol. Estos son los usuarios de prueba del entorno de demostración."
        action={
          <button className="flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            <Plus size={16} /> Nuevo usuario
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="Usuarios" value={USUARIOS.length} icon={UserCog} tone="blue" />
        <StatCard label="Administradores" value={USUARIOS.filter((u) => u.rol === "Administrador").length} icon={UserCog} tone="orange" />
        <StatCard label="Activos" value={USUARIOS.filter((u) => u.activo).length} icon={UserCog} tone="green" />
      </div>

      <TableWrap>
        <thead>
          <tr>
            <Th>Nombre</Th><Th>Correo</Th><Th>Rol</Th><Th>Contraseña (demo)</Th><Th>Estado</Th>
          </tr>
        </thead>
        <tbody>
          {USUARIOS.map((u) => (
            <tr key={u.id} className="hover:bg-slate-50/60">
              <Td className="font-semibold text-slate-900">{u.nombre}</Td>
              <Td className="text-slate-600">{u.email}</Td>
              <Td><Badge tone={rolTone[u.rol]}>{u.rol}</Badge></Td>
              <Td className="tabular text-slate-400">{u.password}</Td>
              <Td><Badge tone={u.activo ? "green" : "gray"}>{u.activo ? "Activo" : "Inactivo"}</Badge></Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </div>
  );
}
