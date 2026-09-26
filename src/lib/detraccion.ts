import type { Factura } from "./types";

// Cuentas de cobranza y detracción de una factura. Las usan Cobranzas y Detracciones para
// que las dos pantallas digan exactamente lo mismo.

export type Responsable = "Cliente" | "Empresa";

export const r2 = (n: number) => Math.round(n * 100) / 100;
export const totalDe = (f: Factura) => f.total || f.monto + f.igv;
// Detracción en la moneda del comprobante (así la calcula MiFact).
export const detraccionDe = (f: Factura) => (f.sujetoDetraccion ? f.montoDetraccion || 0 : 0);
// Lo que el cliente paga a la empresa: total menos la detracción (que va al Banco de la Nación).
export const netoDe = (f: Factura) => r2(totalDe(f) - detraccionDe(f));

// Lo que se deposita en el Banco de la Nación: SIEMPRE en soles y en enteros. En una factura en
// dólares se convierte con el tipo de cambio del comprobante; sin T.C. no se puede saber (null).
export function aDepositarSoles(f: Factura): number | null {
  const d = detraccionDe(f);
  if (!d) return 0;
  if (f.moneda !== "USD") return d;
  return f.tipoCambio ? Math.round(d * f.tipoCambio) : null;
}

// Misma regla que el backend: si se cobró el neto, el cliente descontó la detracción y le toca
// depositarla a él; si se cobró el total, la empresa recibió ese dinero y le toca a ella.
export function responsableSegunCobro(cobrado: number, neto: number, detraccion: number): Responsable {
  return cobrado >= neto + detraccion / 2 ? "Empresa" : "Cliente";
}

// Mientras no se defina, la obligación es del cliente (así lo manda la norma del SPOT).
export const responsableDe = (f: Factura): Responsable => (f.detraccionResponsable === "Empresa" ? "Empresa" : "Cliente");
export const etiquetaResponsable = (r: Responsable) => (r === "Empresa" ? "Nosotros" : "El cliente");
export const detraccionDepositada = (f: Factura) => !!(f.detraccionNumero || "").trim();
