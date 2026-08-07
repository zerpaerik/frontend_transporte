"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { USUARIOS } from "./mock-data";
import { apiLogin, setToken, clearToken, ApiError } from "./api";
import type { Usuario } from "./types";

type SafeUser = Omit<Usuario, "password">;

interface AuthCtx {
  user: SafeUser | null;
  ready: boolean;
  offline: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
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

  async function login(email: string, password: string) {
    try {
      const res = await apiLogin(email, password);
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
          const { password: _pw, ...safe } = found;
          persist(safe);
          return { ok: true };
        }
        return { ok: false, error: "No hay conexión con el servidor y las credenciales no coinciden con el modo demo." };
      }
      return { ok: false, error: err.message || "No se pudo iniciar sesión." };
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

  return <Ctx.Provider value={{ user, ready, offline, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
