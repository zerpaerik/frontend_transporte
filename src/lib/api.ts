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

// --- Tipos de operación ---
export interface TipoOperacion { id: string; nombre: string; activo: boolean; }
export const apiTipos = {
  list: () => api.get<TipoOperacion[]>("/tipos-operacion"),
  create: (nombre: string) => api.post<TipoOperacion>("/tipos-operacion", { nombre }),
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
