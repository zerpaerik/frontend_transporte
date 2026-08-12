import type { EstadoDocumento } from "./types";

// Fecha de referencia = hoy (tiempo real), para que las alertas de vencimiento
// y devolución reflejen la situación actual.
export const HOY = new Date();

export function soles(n: number): string {
  return "S/ " + n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function km(n: number): string {
  return n.toLocaleString("es-PE") + " km";
}

export function fecha(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

export function diasRestantes(iso: string): number {
  const d = new Date(iso + "T12:00:00");
  return Math.round((d.getTime() - HOY.getTime()) / 86_400_000);
}

export function estadoDocumento(iso: string, umbral = 30): EstadoDocumento {
  const dias = diasRestantes(iso);
  if (dias < 0) return "Vencido";
  if (dias <= umbral) return "Por vencer";
  return "Vigente";
}
