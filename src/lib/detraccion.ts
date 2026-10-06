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

// ── Notas de crédito aplicadas a una factura ──
// Una NC aceptada por SUNAT con motivo de anulación (01 anulación de la operación, 02 error en
// el RUC, 06 devolución total) o que cubre todo el importe deja la factura sin nada que cobrar
// ni detracción que depositar. Una NC parcial (descuentos, devolución por ítem) baja el saldo.
const MOTIVOS_ANULAN = ["01", "02", "06"];
const aceptada = (f: Factura) => f.estadoDocumento === "102" || f.estadoDocumento === "103";
const clave = (tipoDoc: string, serie: string, correlativo: string) =>
  `${tipoDoc}|${serie.trim().toUpperCase()}|${parseInt(correlativo, 10) || correlativo.trim()}`;

export type NotasPorFactura = Map<string, Factura[]>;

export function notasCreditoPorFactura(facturas: Factura[]): NotasPorFactura {
  const m: NotasPorFactura = new Map();
  for (const n of facturas) {
    if (n.tipo !== "N. Crédito" || !aceptada(n) || !n.docRefSerie || !n.docRefCorrelativo) continue;
    const k = clave(n.docRefTipo || "01", n.docRefSerie, n.docRefCorrelativo);
    m.set(k, [...(m.get(k) || []), n]);
  }
  return m;
}

export function notasDe(f: Factura, notas: NotasPorFactura): Factura[] {
  if (!f.correlativo) return [];
  return notas.get(clave(f.tipoDocCodigo || (f.tipo === "Boleta" ? "03" : "01"), f.serie, f.correlativo)) || [];
}
export const creditoDe = (f: Factura, notas: NotasPorFactura) => r2(notasDe(f, notas).reduce((s, n) => s + totalDe(n), 0));
export function anuladaPorNc(f: Factura, notas: NotasPorFactura): boolean {
  const ns = notasDe(f, notas);
  return ns.some((n) => MOTIVOS_ANULAN.includes(n.codTipNc || "")) || (ns.length > 0 && creditoDe(f, notas) >= totalDe(f) - 0.01);
}
// Lo que queda por cobrar al cliente: neto (total − detracción) menos las NC parciales.
export const saldoDe = (f: Factura, notas: NotasPorFactura) => (anuladaPorNc(f, notas) ? 0 : Math.max(0, r2(netoDe(f) - creditoDe(f, notas))));
export const docDe = (f: Factura) => `${f.serie}-${f.correlativo}`;
