"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, LogIn, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { USUARIOS } from "@/lib/mock-data";

export default function LoginPage() {
  const { user, ready, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (ready && user) router.replace("/dashboard");
  }, [ready, user, router]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = login(email, password);
    if (!res.ok) {
      setError(res.error || "No se pudo iniciar sesión.");
      return;
    }
    router.replace("/dashboard");
  }

  function quick(u: (typeof USUARIOS)[number]) {
    setEmail(u.email);
    setPassword(u.password);
    setError("");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panel izquierdo — marca */}
      <div className="relative hidden overflow-hidden bg-steel-800 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-steel-700 to-steel-900" />
        <div
          className="absolute inset-x-0 bottom-0 h-1.5"
          style={{ background: "repeating-linear-gradient(90deg,#E5641C 0 34px,transparent 34px 60px)" }}
        />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500 font-extrabold shadow-lg">T</div>
            <div>
              <div className="font-semibold">Transporte de Carga Pesada</div>
              <div className="text-xs text-steel-200">Sistema de gestión de flota y operaciones</div>
            </div>
          </div>
          <div>
            <h1 className="max-w-md text-4xl font-extrabold leading-tight tracking-tight">
              Tu flota, tus viajes y tu facturación en un solo lugar.
            </h1>
            <p className="mt-4 max-w-sm text-steel-200">
              Flota, conductores, mantenimiento, neumáticos, despachos de contenedores,
              facturación electrónica SUNAT y planilla — con alertas automáticas.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-steel-300">
            <ShieldCheck size={14} /> Entorno de demostración · datos de ejemplo
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500 font-extrabold text-white">T</div>
            <span className="font-semibold text-slate-800">Transporte de Carga Pesada</span>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-slate-500">Ingresa con uno de los usuarios de prueba.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Correo</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@transporte.pe"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                required
              />
            </div>

            {error ? (
              <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            >
              <LogIn size={16} /> Entrar
            </button>
          </form>

          <div className="mt-8">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Accesos rápidos</div>
            <div className="grid gap-2">
              {USUARIOS.map((u) => (
                <button
                  key={u.id}
                  onClick={() => quick(u)}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm transition hover:border-brand-300 hover:bg-brand-50/40"
                >
                  <span>
                    <span className="font-medium text-slate-800">{u.nombre}</span>
                    <span className="ml-2 text-xs text-slate-400">{u.email}</span>
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{u.rol}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 flex items-center gap-1 text-xs text-slate-400">
              <Truck size={12} /> Contraseñas: admin123 · gerente123 · operador123 · mecanico123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
