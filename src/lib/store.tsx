"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import {
  VEHICULOS, CONDUCTORES, ORDENES, REPUESTOS, NEUMATICOS, VIAJES, FACTURAS, EMPLEADOS, USUARIOS,
} from "./mock-data";
import { api, getToken, ApiError } from "./api";
import { useAuth } from "./auth";
import type {
  Vehiculo, Conductor, OrdenTrabajo, Repuesto, Neumatico, Viaje, Factura, Empleado, Usuario,
} from "./types";

interface DataState {
  vehiculos: Vehiculo[];
  conductores: Conductor[];
  ordenes: OrdenTrabajo[];
  repuestos: Repuesto[];
  neumaticos: Neumatico[];
  viajes: Viaje[];
  facturas: Factura[];
  empleados: Empleado[];
  usuarios: Usuario[];
}

interface DataCtx extends DataState {
  loading: boolean;
  offline: boolean;
  addVehiculo: (v: Omit<Vehiculo, "id">) => Promise<void>;
  addConductor: (c: Omit<Conductor, "id">) => Promise<void>;
  addOrden: (o: Omit<OrdenTrabajo, "id">) => Promise<void>;
  addRepuesto: (r: Omit<Repuesto, "id">) => Promise<void>;
  addNeumatico: (n: Omit<Neumatico, "id">) => Promise<void>;
  addViaje: (v: Omit<Viaje, "id">) => Promise<void>;
  addFactura: (f: Omit<Factura, "id">) => Promise<void>;
  addEmpleado: (e: Omit<Empleado, "id">) => Promise<void>;
  addUsuario: (u: Omit<Usuario, "id">) => Promise<void>;
  updateVehiculo: (id: string, body: Partial<Vehiculo>) => Promise<void>;
  updateConductor: (id: string, body: Partial<Conductor>) => Promise<void>;
  updateViaje: (id: string, body: Partial<Viaje>) => Promise<void>;
  removeViaje: (id: string) => Promise<void>;
  reload: () => void;
}

const KEYS: { key: keyof DataState; path: string }[] = [
  { key: "vehiculos", path: "/vehiculos" },
  { key: "conductores", path: "/conductores" },
  { key: "ordenes", path: "/ordenes" },
  { key: "repuestos", path: "/repuestos" },
  { key: "neumaticos", path: "/neumaticos" },
  { key: "viajes", path: "/viajes" },
  { key: "facturas", path: "/facturas" },
  { key: "empleados", path: "/empleados" },
  { key: "usuarios", path: "/usuarios" },
];

const EMPTY: DataState = {
  vehiculos: [], conductores: [], ordenes: [], repuestos: [],
  neumaticos: [], viajes: [], facturas: [], empleados: [], usuarios: [],
};

function mockState(): DataState {
  return {
    vehiculos: VEHICULOS, conductores: CONDUCTORES, ordenes: ORDENES, repuestos: REPUESTOS,
    neumaticos: NEUMATICOS, viajes: VIAJES, facturas: FACTURAS, empleados: EMPLEADOS, usuarios: USUARIOS,
  };
}

function newId() {
  try { return crypto.randomUUID(); } catch { return "id-" + Math.floor(Math.random() * 1e9).toString(36); }
}

const Ctx = createContext<DataCtx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const [state, setState] = useState<DataState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);

  const loadAll = useCallback(async () => {
    // Sin token → modo demo con datos mock (login offline).
    if (!getToken()) {
      setState(mockState());
      setOffline(true);
      return;
    }
    setLoading(true);
    const results = await Promise.allSettled(KEYS.map((k) => api.get<any[]>(k.path)));
    const networkDown = results.some((r) => r.status === "rejected" && (r.reason as ApiError)?.network);
    if (networkDown) {
      setState(mockState());
      setOffline(true);
      setLoading(false);
      return;
    }
    const next = { ...EMPTY } as DataState;
    results.forEach((r, i) => {
      (next as any)[KEYS[i].key] = r.status === "fulfilled" ? r.value : [];
    });
    setState(next);
    setOffline(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (user) loadAll();
    else setState(EMPTY);
  }, [ready, user, loadAll]);

  const prepend = useCallback((key: keyof DataState, item: any) => {
    setState((s) => ({ ...s, [key]: [item, ...(s[key] as any[])] }));
  }, []);

  const add = useCallback(
    async (key: keyof DataState, path: string, body: any) => {
      if (!getToken() || offline) {
        prepend(key, { ...body, id: newId() });
        return;
      }
      try {
        const created = await api.post<any>(path, body);
        prepend(key, created);
      } catch {
        // Si falla el POST, refleja localmente para no perder la acción en demo.
        prepend(key, { ...body, id: newId() });
      }
    },
    [offline, prepend],
  );

  const patchLocal = useCallback((key: keyof DataState, id: string, body: any) => {
    setState((s) => ({ ...s, [key]: (s[key] as any[]).map((it) => (it.id === id ? { ...it, ...body } : it)) }));
  }, []);

  const updateItem = useCallback(
    async (key: keyof DataState, path: string, id: string, body: any) => {
      if (!getToken() || offline) { patchLocal(key, id, body); return; }
      try {
        const updated = await api.patch<any>(`${path}/${id}`, body);
        setState((s) => ({ ...s, [key]: (s[key] as any[]).map((it) => (it.id === id ? updated : it)) }));
      } catch { patchLocal(key, id, body); }
    },
    [offline, patchLocal],
  );

  const removeItem = useCallback(
    async (key: keyof DataState, path: string, id: string) => {
      const del = () => setState((s) => ({ ...s, [key]: (s[key] as any[]).filter((it) => it.id !== id) }));
      if (!getToken() || offline) { del(); return; }
      try { await api.del(`${path}/${id}`); del(); } catch { del(); }
    },
    [offline],
  );

  const value: DataCtx = {
    ...state,
    loading,
    offline,
    updateVehiculo: (id, body) => updateItem("vehiculos", "/vehiculos", id, body),
    updateConductor: (id, body) => updateItem("conductores", "/conductores", id, body),
    updateViaje: (id, body) => updateItem("viajes", "/viajes", id, body),
    removeViaje: (id) => removeItem("viajes", "/viajes", id),
    addVehiculo: (v) => add("vehiculos", "/vehiculos", v),
    addConductor: (c) => add("conductores", "/conductores", c),
    addOrden: (o) => add("ordenes", "/ordenes", o),
    addRepuesto: (r) => add("repuestos", "/repuestos", r),
    addNeumatico: (n) => add("neumaticos", "/neumaticos", n),
    addViaje: (v) => add("viajes", "/viajes", v),
    addFactura: (f) => add("facturas", "/facturas", f),
    addEmpleado: (e) => add("empleados", "/empleados", e),
    addUsuario: (u) => add("usuarios", "/usuarios", u),
    reload: loadAll,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useData debe usarse dentro de DataProvider");
  return ctx;
}
