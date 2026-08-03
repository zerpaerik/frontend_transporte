"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  VEHICULOS, CONDUCTORES, ORDENES, REPUESTOS, NEUMATICOS, VIAJES, FACTURAS, EMPLEADOS, USUARIOS,
} from "./mock-data";
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
  ready: boolean;
  addVehiculo: (v: Omit<Vehiculo, "id">) => void;
  addConductor: (c: Omit<Conductor, "id">) => void;
  addOrden: (o: Omit<OrdenTrabajo, "id">) => void;
  addRepuesto: (r: Omit<Repuesto, "id">) => void;
  addNeumatico: (n: Omit<Neumatico, "id">) => void;
  addViaje: (v: Omit<Viaje, "id">) => void;
  addFactura: (f: Omit<Factura, "id">) => void;
  addEmpleado: (e: Omit<Empleado, "id">) => void;
  addUsuario: (u: Omit<Usuario, "id">) => void;
  reset: () => void;
}

const STORAGE_KEY = "ft_data_v2";

function seed(): DataState {
  return {
    vehiculos: VEHICULOS,
    conductores: CONDUCTORES,
    ordenes: ORDENES,
    repuestos: REPUESTOS,
    neumaticos: NEUMATICOS,
    viajes: VIAJES,
    facturas: FACTURAS,
    empleados: EMPLEADOS,
    usuarios: USUARIOS,
  };
}

function newId() {
  try {
    return crypto.randomUUID();
  } catch {
    return "id-" + Math.round(performance.now()).toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  }
}

const Ctx = createContext<DataCtx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>(seed);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, ready]);

  function prepend<K extends keyof DataState>(key: K, item: DataState[K][number]) {
    setState((s) => ({ ...s, [key]: [item, ...(s[key] as unknown[])] } as DataState));
  }

  const value: DataCtx = {
    ...state,
    ready,
    addVehiculo: (v) => prepend("vehiculos", { ...v, id: newId() }),
    addConductor: (c) => prepend("conductores", { ...c, id: newId() }),
    addOrden: (o) => prepend("ordenes", { ...o, id: newId() }),
    addRepuesto: (r) => prepend("repuestos", { ...r, id: newId() }),
    addNeumatico: (n) => prepend("neumaticos", { ...n, id: newId() }),
    addViaje: (v) => prepend("viajes", { ...v, id: newId() }),
    addFactura: (f) => prepend("facturas", { ...f, id: newId() }),
    addEmpleado: (e) => prepend("empleados", { ...e, id: newId() }),
    addUsuario: (u) => prepend("usuarios", { ...u, id: newId() }),
    reset: () => {
      setState(seed());
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useData debe usarse dentro de DataProvider");
  return ctx;
}
