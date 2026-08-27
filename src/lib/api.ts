// Cliente HTTP hacia el backend NestJS.
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3001/api";

const TOKEN_KEY = "ft_token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(t: string) {
  try {
    localStorage.setItem(TOKEN_KEY, t);
  } catch {
    /* ignore */
  }
}
export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

const USER_KEY = "ft_user";

// Sesión inválida o expirada (401): limpia la sesión y manda al login,
// en vez de dejar al usuario en una pantalla vacía con un error suelto.
function handleUnauthorized() {
  clearToken();
  try { localStorage.removeItem(USER_KEY); } catch { /* ignore */ }
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.replace("/login?expirado=1");
  }
}

export class ApiError extends Error {
  status: number;
  network: boolean;
  constructor(message: string, status = 0, network = false) {
    super(message);
    this.status = status;
    this.network = network;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor.", 0, true);
  }

  if (!res.ok) {
    // Token vencido/ inválido en cualquier llamada (menos el propio login): cerrar sesión.
    if (res.status === 401 && path !== "/auth/login") handleUnauthorized();
    let msg = `Error ${res.status}`;
    try {
      const data = await res.json();
      msg = Array.isArray(data.message) ? data.message.join(", ") : data.message || msg;
    } catch {
      /* ignore */
    }
    throw new ApiError(msg, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};

export interface Sede {
  id: string;
  codigo: string;
  nombre: string;
  ruc: string;
}

export async function apiGetSedes() {
  return request<Sede[]>("GET", "/sedes");
}

export async function apiLogin(email: string, password: string, sedeId: string) {
  return request<{ access_token: string; user: any }>("POST", "/auth/login", { email, password, sedeId });
}

export async function apiCambiarSede(sedeId: string) {
  return request<{ access_token: string; user: any }>("POST", "/auth/cambiar-sede", { sedeId });
}

// --- Catálogos (menú Archivo) ---
export interface TipoOperacion { id: string; nombre: string; activo: boolean; }
export const apiTipos = {
  list: () => api.get<TipoOperacion[]>("/tipos-operacion"),
  create: (nombre: string) => api.post<TipoOperacion>("/tipos-operacion", { nombre }),
  update: (id: string, nombre: string) => api.patch<TipoOperacion>(`/tipos-operacion/${id}`, { nombre }),
  remove: (id: string) => api.del<void>(`/tipos-operacion/${id}`),
};

export interface Cliente { id: string; nombre: string; ruc: string; email?: string; telefono?: string; contacto?: string; direccion?: string; }
export const apiClientes = {
  list: () => api.get<Cliente[]>("/clientes"),
  create: (b: { nombre: string; ruc?: string; email?: string; telefono?: string; contacto?: string; direccion?: string }) => api.post<Cliente>("/clientes", b),
  update: (id: string, b: Partial<{ nombre: string; ruc: string; email: string; telefono: string; contacto: string; direccion: string }>) => api.patch<Cliente>(`/clientes/${id}`, b),
  remove: (id: string) => api.del<void>(`/clientes/${id}`),
};

export interface Puerto { id: string; nombre: string; }
export const apiPuertos = {
  list: () => api.get<Puerto[]>("/puertos"),
  create: (b: { nombre: string }) => api.post<Puerto>("/puertos", b),
  update: (id: string, nombre: string) => api.patch<Puerto>(`/puertos/${id}`, { nombre }),
  remove: (id: string) => api.del<void>(`/puertos/${id}`),
};

export const apiViajePorCodigo = (codigo: string) => api.get<any>(`/viajes/codigo/${encodeURIComponent(codigo)}`);

// --- Comisiones / Bonos ---
export interface Tarifa { id: string; destino: string; gral: number; imo: number; reefer: number; }
export interface ResumenViaje { id: string; codigo: string; origen: string; destino: string; tipoCarga: string; comisionChofer: number; comisionPagada: boolean; comisionFechaPago: string | null; createdAt: string; }
export interface ResumenChofer { conductor: string; pendiente: number; pagado: number; viajes: ResumenViaje[]; }
export const apiComisiones = {
  tarifario: () => api.get<Tarifa[]>("/comisiones"),
  crearTarifa: (b: { destino: string; gral?: number; imo?: number; reefer?: number }) => api.post<Tarifa>("/comisiones", b),
  actualizarTarifa: (id: string, b: Partial<Tarifa>) => api.patch<Tarifa>(`/comisiones/${id}`, b),
  borrarTarifa: (id: string) => api.del<void>(`/comisiones/${id}`),
  resumen: () => api.get<ResumenChofer[]>("/comisiones/resumen"),
  pagarViaje: (viajeId: string) => api.post<any>(`/comisiones/pagar/${viajeId}`, {}),
  pagarConductor: (conductor: string) => api.post<{ pagados: number }>("/comisiones/pagar-conductor", { conductor }),
};

// --- Planilla semanal por conductor ---
export interface PlanillaLinea {
  id?: string;
  fecha: string;
  cliente: string;
  origen: string;
  destino: string;
  sueldoDia: number;
  comision: number;
  viaticos: number;
  concepto: string;
  viajeId: string;
  orden: number;
}
export interface Planilla {
  id: string;
  conductor: string;
  semanaDesde: string;
  semanaHasta: string;
  sueldoDia: number;
  descuentoPlanilla: number;
  estado: "Borrador" | "Generada" | "Pagada";
  lineas: PlanillaLinea[];
  totalSueldo: number;
  totalComision: number;
  totalViaticos: number;
  totalPagar: number;
  aDepositar: number;
}
export const apiPlanillas = {
  config: () => api.get<{ sueldoDia: number }>("/planillas/config"),
  setConfig: (sueldoDia: number) => api.patch<{ sueldoDia: number }>("/planillas/config", { sueldoDia }),
  list: () => api.get<Planilla[]>("/planillas"),
  get: (id: string) => api.get<Planilla>(`/planillas/${id}`),
  generar: (b: { conductor: string; semanaDesde: string; semanaHasta: string }) => api.post<Planilla>("/planillas/generar", b),
  update: (id: string, b: Partial<{ sueldoDia: number; descuentoPlanilla: number; estado: string; lineas: PlanillaLinea[] }>) => api.patch<Planilla>(`/planillas/${id}`, b),
  pagar: (id: string) => api.post<Planilla>(`/planillas/${id}/pagar`, {}),
  reversar: (id: string) => api.post<Planilla>(`/planillas/${id}/reversar`, {}),
  remove: (id: string) => api.del<void>(`/planillas/${id}`),
};

// --- Devolución de contenedores (importación) ---
export interface Devolucion {
  id: string;
  codigo: string;
  placaTracto: string;
  carreta: string;
  conductor: string;
  cliente: string;
  contenedor: string;
  tamanio: string;
  destino: string;
  devolucion: string;
  operacion: string;
  createdAt: string;
  citaFecha: string | null;
  citaHora: string;
  lugarGuardado: string;
  estadoDevolucion: string;
  devueltoEn: string | null;
  citaArchivos: { id: string; nombre: string; mime: string }[];
}
export interface LugarGuardado { id: string; nombre: string; }
export const apiDevoluciones = {
  list: () => api.get<Devolucion[]>("/devoluciones"),
  update: (viajeId: string, b: Partial<{ citaFecha: string | null; citaHora: string; lugarGuardado: string; estadoDevolucion: string }>) => api.patch<Devolucion>(`/devoluciones/${viajeId}`, b),
  agregarArchivo: (viajeId: string, archivoBase64: string, nombre: string, mime: string) => api.post<Devolucion>(`/devoluciones/${viajeId}/archivos`, { archivoBase64, nombre, mime }),
  quitarArchivo: (viajeId: string, archivoId: string) => api.del<Devolucion>(`/devoluciones/${viajeId}/archivos/${archivoId}`),
  archivo: (viajeId: string, archivoId: string) => api.get<{ nombre: string; mime: string; base64: string }>(`/devoluciones/${viajeId}/archivos/${archivoId}`),
};
export const apiLugares = {
  list: () => api.get<LugarGuardado[]>("/lugares-guardado"),
  create: (nombre: string) => api.post<LugarGuardado>("/lugares-guardado", { nombre }),
  remove: (id: string) => api.del<void>(`/lugares-guardado/${id}`),
};

// --- Documentos (conductores / vehículos) ---
export interface DocumentoInput {
  tipo: string; numero?: string; vencimiento: string;
  archivoBase64?: string; archivoNombre?: string; archivoMime?: string;
}
export const apiDocs = {
  add: (base: string, id: string, body: DocumentoInput) => api.post<any>(`/${base}/${id}/documentos`, body),
  renovar: (base: string, id: string, docId: string, body: Partial<DocumentoInput>) => api.patch<any>(`/${base}/${id}/documentos/${docId}`, body),
  remove: (base: string, id: string, docId: string) => api.del<any>(`/${base}/${id}/documentos/${docId}`),
  archivo: (base: string, id: string, docId: string) => api.get<{ nombre: string; mime: string; base64: string }>(`/${base}/${id}/documentos/${docId}/archivo`),
};

// Foto de conductor / vehículo (se guarda como binario en la BD).
export const apiFoto = {
  set: (base: "conductores" | "vehiculos", id: string, fotoBase64: string, fotoMime: string) => api.patch<any>(`/${base}/${id}/foto`, { fotoBase64, fotoMime }),
  remove: (base: "conductores" | "vehiculos", id: string) => api.del<any>(`/${base}/${id}/foto`),
};

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function downloadBase64(nombre: string, mime: string, base64: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
