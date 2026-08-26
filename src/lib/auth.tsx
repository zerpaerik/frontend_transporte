"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { USUARIOS, SEDES_DEMO } from "./mock-data";
import { apiLogin, apiCambiarSede, setToken, clearToken, ApiError, type Sede } from "./api";
import type { Usuario } from "./types";

type SafeUser = Omit<Usuario, "password"> & { sede?: Sede };

interface AuthCtx {
  user: SafeUser | null;
  ready: boolean;
  offline: boolean;
  login: (email: string, password: string, sedeId: string) => Promise<{ ok: boolean; error?: string }>;
  cambiarSede: (sedeId: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);
const USER_KEY = "ft_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  function persist(u: SafeUser) {
    setUser(u);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch {
      /* ignore */
    }
  }

  async function login(email: string, password: string, sedeId: string) {
    try {
      const res = await apiLogin(email, password, sedeId);
      setToken(res.access_token);
      setOffline(false);
      persist(res.user);
      return { ok: true };
    } catch (e) {
      const err = e as ApiError;
      // Si el backend no responde, permitir demo offline con usuarios mock.
      if (err.network) {
        const found = USUARIOS.find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
        );
        if (found) {
          setOffline(true);
          clearToken();
          const sede = SEDES_DEMO.find((s) => s.id === sedeId || s.codigo === sedeId) ?? SEDES_DEMO[0];
          const { password: _pw, ...safe } = found;
          persist({ ...safe, sede });
          return { ok: true };
        }
        return { ok: false, error: "No hay conexión con el servidor y las credenciales no coinciden con el modo demo." };
      }
      return { ok: false, error: err.message || "No se pudo iniciar sesión." };
    }
  }

  async function cambiarSede(sedeId: string) {
    try {
      const res = await apiCambiarSede(sedeId);
      setToken(res.access_token);
      setOffline(false);
      persist(res.user);
      return { ok: true };
    } catch (e) {
      const err = e as ApiError;
      // Sin backend (demo offline): cambiar la sede localmente.
      if (err.network) {
        const sede = SEDES_DEMO.find((s) => s.id === sedeId || s.codigo === sedeId);
        if (sede && user) { persist({ ...user, sede }); return { ok: true }; }
      }
      return { ok: false, error: err.message || "No se pudo cambiar de sede." };
    }
  }

  function logout() {
    setUser(null);
    clearToken();
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
  }

  return <Ctx.Provider value={{ user, ready, offline, login, cambiarSede, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
