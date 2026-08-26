// PDF dedicado de la planilla semanal (liquidación de pago del conductor).
// A diferencia del exportPDF genérico de tablas, arma una boleta con cabecera
// de empresa (logo + RUC), folio, ruta por línea, resumen, "a depositar"
// destacado y zona de firmas.

import { soles, fecha } from "./format";

export interface PlanillaPdfLinea {
  fecha: string;
  cliente: string;
  origen: string;
  destino: string;
  concepto: string;
  sueldoDia: number;
  comision: number;
  viaticos: number;
}

export interface PlanillaPdfData {
  conductor: string;
  folio?: string;
  semanaDesde: string;
  semanaHasta: string;
  estado: string;
  lineas: PlanillaPdfLinea[];
  totalSueldo: number;
  totalComision: number;
  totalViaticos: number;
  totalPagar: number;
  descuentoPlanilla: number;
  aDepositar: number;
  empresa?: { nombre?: string; ruc?: string; codigo?: string };
}

const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const DASH = '<span class="dash">—</span>';
// Celda de dinero: guion largo cuando es 0 para no llenar de "S/ 0.00".
const money = (n: number) => (n ? esc(soles(n)) : DASH);

function ruta(origen: string, destino: string) {
  const o = (origen || "").trim();
  const d = (destino || "").trim();
  if (o && d) return `${esc(o)} <span class="arrow">→</span> ${esc(d)}`;
  return esc(o || d) || DASH;
}

function iniciales(nombre: string) {
  return nombre.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
}

export function planillaPDF(p: PlanillaPdfData) {
  const empresa = p.empresa?.nombre || "Transporte de Carga Pesada";
  const rucNum = p.empresa?.ruc;
  const codigo = p.empresa?.codigo;
  const logo = codigo ? `/sedes/${encodeURIComponent(codigo)}.jpg` : "";
  const emitido = new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Lima" });
  const pagada = p.estado === "Pagada";
  const folio = p.folio ? esc(p.folio) : "—";

  const filas = p.lineas
    .map(
      (l) => `
      <tr>
        <td class="nowrap">${esc(fecha(l.fecha))}</td>
        <td class="strong">${esc(l.cliente) || DASH}</td>
        <td>${ruta(l.origen, l.destino)}</td>
        <td class="muted">${esc(l.concepto) || DASH}</td>
        <td class="num">${money(l.sueldoDia)}</td>
        <td class="num">${money(l.comision)}</td>
        <td class="num">${money(l.viaticos)}</td>
      </tr>`,
    )
    .join("");

  const sinLineas = p.lineas.length === 0
    ? `<tr><td colspan="7" class="empty">Sin líneas registradas para esta semana.</td></tr>`
    : "";

  // La cabecera con logo cae de vuelta al monograma si la imagen no carga.
  const logoBox = logo
    ? `<div class="logo"><img src="${logo}" alt="" onerror="var b=this.parentNode;b.className='logo mono';b.textContent='${esc(iniciales(empresa))}';"></div>`
    : `<div class="logo mono">${esc(iniciales(empresa))}</div>`;

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>Planilla ${esc(p.conductor)} — ${esc(fecha(p.semanaDesde))}</title>
<style>
  :root{
    --brand:#E5641C; --ink:#0f172a; --body:#334155; --muted:#64748b; --faint:#94a3b8;
    --line:#e2e8f0; --bg-soft:#f8fafc; --bg-head:#f1f5f9; --green:#16a34a; --red:#e11d48;
  }
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  body{font-family:"Segoe UI",-apple-system,Roboto,Arial,sans-serif;color:var(--body);font-size:12px;line-height:1.45;
       padding:30px 34px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .doc{max-width:780px;margin:0 auto;}

  .lh{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;}
  .lh-left{display:flex;align-items:center;gap:14px;min-width:0;}
  .logo{height:56px;min-width:56px;max-width:150px;background:#fff;border:1px solid var(--line);border-radius:10px;
        padding:6px 10px;display:grid;place-items:center;}
  .logo img{max-height:100%;max-width:100%;object-fit:contain;display:block;}
  .logo.mono{background:var(--brand);border:none;color:#fff;font-weight:800;font-size:19px;letter-spacing:.02em;width:56px;padding:0;}
  .co h1{margin:0;font-size:16.5px;font-weight:800;color:var(--ink);letter-spacing:-.01em;line-height:1.2;}
  .co .ruc{color:var(--muted);font-size:11px;margin-top:3px;}
  .lh-right{text-align:right;flex:none;}
  .lh-right .title{color:var(--brand);font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;}
  .metatab{margin-top:8px;border-collapse:collapse;font-size:10.5px;margin-left:auto;}
  .metatab td{padding:2px 0 2px 14px;text-align:right;white-space:nowrap;}
  .metatab .k{color:var(--faint);text-transform:uppercase;letter-spacing:.04em;font-size:9px;padding-right:8px;}
  .metatab .v{color:var(--body);font-weight:600;font-variant-numeric:tabular-nums;}
  .rule{height:3px;background:var(--brand);border-radius:2px;margin:14px 0 0;}

  .who{display:flex;align-items:center;gap:13px;margin:18px 0 15px;}
  .avatar{width:42px;height:42px;flex:none;border-radius:999px;background:var(--ink);color:#fff;font-weight:700;
          font-size:14px;display:grid;place-items:center;}
  .who .nombre{font-size:18px;font-weight:800;color:var(--ink);line-height:1.15;}
  .who .role{color:var(--muted);font-size:11px;margin-top:1px;}
  .who .right{margin-left:auto;display:flex;align-items:center;gap:16px;}
  .chip{text-align:right;}
  .chip .k{display:block;color:var(--faint);font-size:8.5px;text-transform:uppercase;letter-spacing:.05em;}
  .chip .v{font-weight:700;color:var(--ink);font-size:12px;}
  .estado{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:5px 13px;border-radius:999px;}
  .estado.ok{background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;}
  .estado.pend{background:#fef3c7;color:#b45309;border:1px solid #fde68a;}

  table{width:100%;border-collapse:collapse;}
  thead th{background:var(--bg-head);color:#475569;text-transform:uppercase;font-size:9.5px;letter-spacing:.05em;
           text-align:left;padding:9px;border-top:1px solid var(--line);border-bottom:1px solid #cbd5e1;font-weight:700;}
  thead th.num{text-align:right;}
  tbody td{padding:8px 9px;border-bottom:1px solid #eef2f7;vertical-align:top;}
  tbody tr:nth-child(even) td{background:var(--bg-soft);}
  td.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;}
  td.nowrap{white-space:nowrap;}
  td.strong{font-weight:600;color:var(--ink);}
  td.muted{color:var(--muted);}
  .arrow{color:var(--faint);padding:0 3px;}
  .dash{color:#cbd5e1;}
  .empty{text-align:center;color:var(--faint);padding:24px;}
  tfoot td{padding:10px 9px;font-weight:800;color:var(--ink);border-top:2px solid #cbd5e1;background:var(--bg-soft);
           font-variant-numeric:tabular-nums;}
  tfoot td.num{text-align:right;}
  tfoot td.lbl{text-transform:uppercase;letter-spacing:.04em;font-size:10.5px;color:var(--muted);}

  .cols{display:flex;gap:18px;margin-top:20px;align-items:stretch;}
  .resumen{flex:1;padding-top:2px;}
  .resumen .r{display:flex;justify-content:space-between;align-items:baseline;padding:6px 0;font-size:12px;border-bottom:1px dashed #eef2f7;}
  .resumen .r:last-child{border-bottom:none;}
  .resumen .r .lbl{color:var(--muted);}
  .resumen .r .amt{font-variant-numeric:tabular-nums;font-weight:600;color:var(--ink);}
  .resumen .r.total{border-top:2px solid var(--line);border-bottom:none;margin-top:4px;padding-top:9px;}
  .resumen .r.total .lbl{color:var(--ink);font-weight:800;}
  .resumen .r.total .amt{font-weight:800;font-size:13px;}
  .amt.verde{color:var(--green);}
  .amt.rojo{color:var(--red);}
  .deposito{width:238px;flex:none;border:1.5px solid #f4c19a;background:linear-gradient(180deg,#fff8f2,#fff);
            border-radius:14px;padding:18px 20px;display:flex;flex-direction:column;justify-content:center;}
  .deposito .lbl{color:var(--brand);font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;}
  .deposito .val{font-size:30px;font-weight:800;color:var(--ink);margin-top:5px;line-height:1;font-variant-numeric:tabular-nums;letter-spacing:-.01em;}
  .deposito .hint{color:var(--faint);font-size:10px;margin-top:6px;}

  .firmas{display:flex;gap:64px;margin-top:64px;}
  .firma{flex:1;text-align:center;}
  .firma .ln{border-top:1.2px solid #94a3b8;padding-top:7px;color:var(--body);font-size:11.5px;font-weight:600;}
  .firma .sub{color:var(--faint);font-size:9.5px;margin-top:2px;}

  .pie{margin-top:30px;padding-top:12px;border-top:1px solid #eef2f7;display:flex;justify-content:space-between;
       color:#b6c2d1;font-size:9px;}

  @page{size:A4;margin:12mm;}
  @media print{
    body{padding:0;} .doc{max-width:none;}
    thead{display:table-header-group;} tr{break-inside:avoid;}
  }
</style></head>
<body>
  <div class="doc">

    <div class="lh">
      <div class="lh-left">
        ${logoBox}
        <div class="co">
          <h1>${esc(empresa)}</h1>
          ${rucNum ? `<div class="ruc">RUC ${esc(rucNum)}</div>` : ""}
        </div>
      </div>
      <div class="lh-right">
        <div class="title">Liquidación de planilla</div>
        <table class="metatab">
          <tr><td class="k">Folio</td><td class="v">${folio}</td></tr>
          <tr><td class="k">Periodo</td><td class="v">${esc(fecha(p.semanaDesde))} – ${esc(fecha(p.semanaHasta))}</td></tr>
          <tr><td class="k">Emitido</td><td class="v">${esc(emitido)}</td></tr>
        </table>
      </div>
    </div>
    <div class="rule"></div>

    <div class="who">
      <div class="avatar">${esc(iniciales(p.conductor))}</div>
      <div>
        <div class="nombre">${esc(p.conductor)}</div>
        <div class="role">Conductor · Planilla semanal</div>
      </div>
      <div class="right">
        <div class="chip"><span class="k">Líneas</span><span class="v">${p.lineas.length}</span></div>
        <div class="estado ${pagada ? "ok" : "pend"}">${esc(p.estado)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:74px">Fecha</th><th>Cliente</th><th>Ruta</th><th>Concepto</th>
          <th class="num">Sueldo/día</th><th class="num">Comisión</th><th class="num">Viáticos</th>
        </tr>
      </thead>
      <tbody>${filas}${sinLineas}</tbody>
      <tfoot>
        <tr>
          <td class="lbl" colspan="4">Totales de la semana</td>
          <td class="num">${esc(soles(p.totalSueldo))}</td>
          <td class="num">${esc(soles(p.totalComision))}</td>
          <td class="num">${esc(soles(p.totalViaticos))}</td>
        </tr>
      </tfoot>
    </table>

    <div class="cols">
      <div class="resumen">
        <div class="r"><span class="lbl">Sueldo (días trabajados)</span><span class="amt">${esc(soles(p.totalSueldo))}</span></div>
        <div class="r"><span class="lbl">Comisiones / bonos</span><span class="amt verde">${esc(soles(p.totalComision))}</span></div>
        <div class="r"><span class="lbl">Viáticos</span><span class="amt">${esc(soles(p.totalViaticos))}</span></div>
        <div class="r total"><span class="lbl">Total a pagar</span><span class="amt">${esc(soles(p.totalPagar))}</span></div>
        <div class="r"><span class="lbl">Descuento de planilla (cuota semanal)</span><span class="amt rojo">− ${esc(soles(p.descuentoPlanilla))}</span></div>
      </div>
      <div class="deposito">
        <div class="lbl">A depositar</div>
        <div class="val">${esc(soles(p.aDepositar))}</div>
        <div class="hint">Total a pagar − descuento de planilla</div>
      </div>
    </div>

    <div class="firmas">
      <div class="firma"><div class="ln">${esc(p.conductor)}</div><div class="sub">Recibí conforme · Conductor · DNI ____________</div></div>
      <div class="firma"><div class="ln">&nbsp;</div><div class="sub">Administración</div></div>
    </div>

    <div class="pie">
      <span>${esc(empresa)}${rucNum ? " · RUC " + esc(rucNum) : ""}</span>
      <span>Documento generado por el sistema · ${esc(emitido)}</span>
    </div>
  </div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 300); };</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) {
    alert("Habilita las ventanas emergentes para exportar a PDF.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
