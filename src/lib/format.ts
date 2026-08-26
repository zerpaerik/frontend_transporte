import type { EstadoDocumento } from "./types";

// Toda la app trabaja en hora de Perú (America/Lima · UTC-5, sin horario de verano),
// sin importar la zona horaria del navegador de quien la use.
export const TZ = "America/Lima";

export function soles(n: number): string {
  return "S/ " + n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function km(n: number): string {
  return n.toLocaleString("es-PE") + " km";
}

// "Hoy" en Perú como "YYYY-MM-DD" (no depende de la zona del navegador).
export function hoyPeru(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

// Día-calendario en Perú de cualquier fecha, como "YYYY-MM-DD" (para filtros y orden).
export function fechaISO(iso: string): string {
  if (!iso) return "";
  if (iso.length <= 10) return iso.slice(0, 10); // ya es fecha pura "YYYY-MM-DD"
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso.slice(0, 10) : d.toLocaleDateString("en-CA", { timeZone: TZ });
}

// Muestra una fecha en formato peruano (p. ej. "05 sep. 2026"), siempre en hora de
// Perú. Sirve para fechas puras ("2026-09-05") y para timestamps ISO (createdAt).
export function fecha(iso: string): string {
  if (!iso) return "—";
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const d = new Date(soloFecha ? iso + "T12:00:00-05:00" : iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", timeZone: TZ });
}

// Días entre hoy (Perú) y la fecha dada. Negativo = ya venció.
export function diasRestantes(iso: string): number {
  if (!iso) return 0;
  const a = new Date(fechaISO(iso) + "T00:00:00Z").getTime();
  const b = new Date(hoyPeru() + "T00:00:00Z").getTime();
  return Math.round((a - b) / 86_400_000);
}

export function estadoDocumento(iso: string, umbral = 30): EstadoDocumento {
  const dias = diasRestantes(iso);
  if (dias < 0) return "Vencido";
  if (dias <= umbral) return "Por vencer";
  return "Vigente";
}
