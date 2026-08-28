// Ficha de viaje para el conductor: bonita, mobile-first, texto seleccionable
// (se puede copiar/pegar desde el celular) y SIN la tarifa. Reemplaza el PDF
// genérico de tabla. Se abre como página; el conductor la lee/guarda como PDF.

import { fecha } from "./format";

const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

interface Grupo { titulo: string; filas: [string, string][]; }

function iniciales(nombre: string) {
  return (nombre || "T").split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
}

export function fichaViajePDF(v: any, empresa?: { nombre?: string; ruc?: string }) {
  const codigo = v.codigo || "Viaje";
  const emp = empresa?.nombre || "Orden de viaje";
  const grupos: Grupo[] = [
    { titulo: "Cliente", filas: [["Cliente", v.cliente], ["RUC", v.clienteRuc || ""], ["Dirección", v.clienteDireccion || ""]] },
    { titulo: "Unidad y conductor", filas: [["Tracto", v.placaTracto], ["Carreta", v.carreta || ""], ["Conductor", v.conductor || ""]] },
    { titulo: "Carga", filas: [["Operación", v.operacion], ["Tipo de carga", v.tipoCarga || ""], ["Contenedor", v.contenedor], ["Tamaño", v.tamanio || ""]] },
    {
      titulo: "Ruta y entrega",
      filas: [
        ["Origen", v.origen || ""], ["Destino", v.destino || ""], ["Punto de devolución", v.devolucion || ""],
        ["Hora de cita", v.horaCita || ""], ["Fecha límite devolución", v.fechaLimite ? fecha(v.fechaLimite) : ""],
        ["N° Orden", v.nOrden || ""], ["Guía de remisión", v.greRemitente || ""],
      ],
    },
  ];

  const grupoHTML = (g: Grupo) => {
    const filas = g.filas
      .map(([k, val]) => `
        <div class="row">
          <div class="k">${esc(k)}</div>
          <div class="v">${val ? esc(val) : '<span class="dash">—</span>'}</div>
        </div>`)
      .join("");
    return `<section class="grupo"><div class="gt">${esc(g.titulo)}</div>${filas}</section>`;
  };

  const ubic = v.ubicacion
    ? `<section class="grupo ubic">
         <div class="gt">📍 Ubicación de entrega</div>
         <div class="ubtxt">${esc(v.ubicacion)}</div>
         <a class="maps" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.ubicacion)}" target="_blank" rel="noreferrer">Abrir en Google Maps</a>
       </section>`
    : "";

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Viaje ${esc(codigo)}</title>
<style>
  :root{--brand:#E5641C;--ink:#0f172a;--body:#334155;--muted:#64748b;--faint:#94a3b8;--line:#e6e9ee;--card:#fff;--bg:#eef2f7;}
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  body{font-family:"Segoe UI",-apple-system,Roboto,Arial,sans-serif;background:var(--bg);color:var(--body);
       font-size:15px;line-height:1.5;-webkit-text-size-adjust:100%;padding:16px;}
  .doc{max-width:520px;margin:0 auto;}
  .head{background:linear-gradient(135deg,#26374a,#16202b);color:#fff;border-radius:16px 16px 0 0;padding:18px 20px;}
  .head .emp{display:flex;align-items:center;gap:10px;}
  .mono{width:34px;height:34px;border-radius:9px;background:var(--brand);display:grid;place-items:center;font-weight:800;font-size:13px;flex:none;}
  .head .en{font-size:12.5px;color:#c7d2e0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .head .cod{margin-top:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
  .head .cod b{font-size:24px;font-weight:800;letter-spacing:-.01em;}
  .estado{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;background:rgba(255,255,255,.16);padding:4px 11px;border-radius:999px;}
  .body{background:var(--card);border:1px solid var(--line);border-top:none;border-radius:0 0 16px 16px;padding:6px 20px 18px;box-shadow:0 10px 30px -18px rgba(15,23,42,.4);}
  .grupo{padding:14px 0;border-bottom:1px solid var(--line);}
  .grupo:last-child{border-bottom:none;}
  .gt{font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--brand);margin-bottom:9px;}
  .row{display:flex;gap:12px;justify-content:space-between;align-items:baseline;padding:5px 0;}
  .k{color:var(--muted);font-size:13px;flex:none;}
  .v{color:var(--ink);font-weight:600;text-align:right;word-break:break-word;}
  .dash{color:#cbd5e1;font-weight:400;}
  .ubic .ubtxt{color:var(--ink);font-weight:600;word-break:break-word;background:#f8fafc;border:1px solid var(--line);border-radius:10px;padding:10px 12px;}
  .ubic .maps{display:inline-block;margin-top:9px;color:var(--brand);font-weight:700;text-decoration:none;font-size:14px;}
  .pie{text-align:center;color:var(--faint);font-size:11.5px;margin:14px 0 4px;}
  .print{position:fixed;right:16px;bottom:16px;background:var(--brand);color:#fff;border:none;border-radius:999px;
         padding:12px 18px;font-size:14px;font-weight:700;box-shadow:0 8px 20px -6px rgba(229,100,28,.6);cursor:pointer;}
  @media print{ body{background:#fff;padding:0;} .body{box-shadow:none;} .print{display:none;} .head{border-radius:0;} .body{border-radius:0;} }
  @page{size:A4;margin:12mm;}
</style></head>
<body>
  <div class="doc">
    <div class="head">
      <div class="emp"><div class="mono">${esc(iniciales(emp))}</div><div class="en">${esc(emp)}${empresa?.ruc ? " · RUC " + esc(empresa.ruc) : ""}</div></div>
      <div class="cod"><b>${esc(codigo)}</b><span class="estado">${esc(v.estado || "")}</span></div>
    </div>
    <div class="body">
      ${grupos.map(grupoHTML).join("")}
      ${ubic}
    </div>
    <div class="pie">${esc(emp)} · Documento para el conductor</div>
  </div>
  <button class="print" onclick="window.print()">Imprimir / Guardar PDF</button>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("Habilita las ventanas emergentes para ver la ficha."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
