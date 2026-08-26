"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, ShieldCheck, ChevronLeft, Building2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { homeFor } from "@/lib/nav";
import { USUARIOS, SEDES_DEMO } from "@/lib/mock-data";
import { apiGetSedes, type Sede } from "@/lib/api";

const LOGO: Record<string, string> = { mgr: "/sedes/mgr.jpg", mjg: "/sedes/mjg.jpg", mgrsi: "/sedes/mgr.jpg" };

export default function LoginPage() {
  const { user, ready, login } = useAuth();
  const router = useRouter();

  const [sedes, setSedes] = useState<Sede[]>([]);
  const [sede, setSede] = useState<Sede | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [expirado, setExpirado] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace(homeFor(user.rol));
  }, [ready, user, router]);

  useEffect(() => {
    try { setExpirado(new URLSearchParams(window.location.search).get("expirado") === "1"); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    apiGetSedes().then(setSedes).catch(() => setSedes(SEDES_DEMO));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!sede) return;
    setError("");
    setLoading(true);
    const res = await login(email, password, sede.id);
    setLoading(false);
    if (!res.ok) {
      setError(res.error || "No se pudo iniciar sesión.");
      return;
    }
    // La redirección al home del rol la hace el efecto de arriba cuando el usuario queda seteado.
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
        <div className="absolute inset-x-0 bottom-0 h-1.5" style={{ background: "repeating-linear-gradient(90deg,#E5641C 0 34px,transparent 34px 60px)" }} />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500 font-extrabold shadow-lg">T</div>
            <div>
              <div className="font-semibold">Transporte de Carga Pesada</div>
              <div className="text-xs text-steel-200">Sistema de gestión de flota y operaciones</div>
            </div>
          </div>
          <div>
            <h1 className="max-w-md text-4xl font-extrabold leading-tight tracking-tight">Tu flota, tus viajes y tu facturación en un solo lugar.</h1>
            <p className="mt-4 max-w-sm text-steel-200">Flota, conductores, mantenimiento, neumáticos, despachos, facturación electrónica SUNAT y planilla — con alertas automáticas.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-steel-300"><ShieldCheck size={14} /> Multi-empresa · datos aislados por sede</div>
        </div>
      </div>

      {/* Panel derecho */}
      <div className="flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm">
          {!sede ? (
            <>
              <div className="mb-6 flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500 font-extrabold text-white">T</span>
                <span className="font-semibold text-slate-800">Selecciona tu empresa</span>
              </div>
              <p className="mb-4 text-sm text-slate-500">Ingresa a la sede con la que vas a trabajar. Cada empresa ve solo su propia información.</p>
              <div className="grid gap-3">
                {sedes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setSede(s); setError(""); }}
                    className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md"
                  >
                    <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-100">
                      {LOGO[s.codigo]
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={LOGO[s.codigo]} alt={s.nombre} className="h-full w-full object-contain p-1" />
                        : <Building2 className="text-slate-400" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-800">{s.nombre}</span>
                      <span className="block text-xs text-slate-400">RUC {s.ruc}</span>
                    </span>
                  </button>
                ))}
                {sedes.length === 0 ? <p className="text-sm text-slate-400">Cargando empresas…</p> : null}
              </div>
            </>
          ) : (
            <>
              <button onClick={() => { setSede(null); setError(""); }} className="mb-5 flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600">
                <ChevronLeft size={16} /> Cambiar empresa
              </button>

              <div className="mb-6 flex items-center gap-3">
                <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
                  {LOGO[sede.codigo]
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={LOGO[sede.codigo]} alt={sede.nombre} className="h-full w-full object-contain p-1.5" />
                    : <Building2 className="text-slate-400" />}
                </span>
                <div className="min-w-0">
                  <div className="truncate font-bold text-slate-900">{sede.nombre}</div>
                  <div className="text-xs text-slate-400">RUC {sede.ruc}</div>
                </div>
              </div>

              <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Iniciar sesión</h2>
              <p className="mt-1 text-sm text-slate-500">Ingresa con uno de los usuarios de prueba.</p>

              <form onSubmit={submit} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Correo</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@transporte.pe" required
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Contraseña</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30" />
                </div>

                {expirado && !error ? <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 ring-1 ring-inset ring-amber-200">Tu sesión expiró. Vuelve a iniciar sesión para continuar.</div> : null}
                {error ? <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">{error}</div> : null}

                <button type="submit" disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-60">
                  <LogIn size={16} /> {loading ? "Ingresando…" : "Entrar"}
                </button>
              </form>

              <div className="mt-6">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Accesos rápidos</div>
                <div className="grid gap-2">
                  {USUARIOS.map((u) => (
                    <button key={u.id} onClick={() => quick(u)}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm transition hover:border-brand-300 hover:bg-brand-50/40">
                      <span><span className="font-medium text-slate-800">{u.nombre}</span><span className="ml-2 text-xs text-slate-400">{u.email}</span></span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{u.rol}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-400">Contraseñas: admin123 · gerente123 · operador123 · mecanico123</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
