// Ficha de viaje para el conductor, en A4, letras grandes y legible.
// Cabecera con logo + nombre + RUC de la empresa que despacha, datos clave en
// grande (fecha, contenedor, cliente), ubicación tocable (copiar / abrir en Maps)
// y SIN la tarifa. Se abre como página; se guarda como PDF con el botón.

import { fecha } from "./format";

const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface Grupo { titulo: string; filas: [string, string][]; }

function iniciales(nombre: string) {
  return (nombre || "T").split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
}

export function fichaViajePDF(v: any, empresa?: { nombre?: string; ruc?: string; codigo?: string }) {
  const codigo = v.codigo || "Viaje";
  const emp = empresa?.nombre || "Orden de viaje";
  const ruc = empresa?.ruc || "";
  const logo = empresa?.codigo ? `/sedes/${encodeURIComponent(empresa.codigo)}.jpg` : "";
  const registro = fecha(v.createdAt || "");

  const grupos: Grupo[] = [
    { titulo: "Cliente", filas: [["Cliente", v.cliente], ["RUC", v.clienteRuc || ""], ["Dirección", v.clienteDireccion || ""]] },
    { titulo: "Unidad y conductor", filas: [["Tracto", v.placaTracto], ["Carreta", v.carreta || ""], ["Conductor", v.conductor || ""]] },
    { titulo: "Carga", filas: [["Operación", v.operacion], ["Tipo de carga", v.tipoCarga || ""], ["Tamaño", v.tamanio || ""], ["Hora de cita", v.horaCita || ""]] },
    {
      titulo: "Ruta y devolución",
      filas: [
        ["Origen", v.origen || ""], ["Destino", v.destino || ""], ["Punto de devolución", v.devolucion || ""],
        ["Fecha límite devolución", v.fechaLimite ? fecha(v.fechaLimite) : ""], ["N° Orden", v.nOrden || ""], ["Guía de remisión", v.greRemitente || ""],
      ],
    },
  ];

  const grupoHTML = (g: Grupo) => {
    const filas = g.filas
      .map(([k, val]) => `
        <div class="row">
          <div class="k">${esc(k)}</div>
          <div class="val">${val ? esc(val) : '<span class="dash">—</span>'}</div>
        </div>`)
      .join("");
    return `<section class="grupo"><h2>${esc(g.titulo)}</h2>${filas}</section>`;
  };

  const mapsUrl = v.ubicacion ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.ubicacion)}` : "";
  const ubic = v.ubicacion
    ? `<section class="grupo">
         <h2>📍 Ubicación de entrega</h2>
         <a id="ub" class="ublink" href="${esc(mapsUrl)}" target="_blank" rel="noreferrer">${esc(v.ubicacion)}</a>
         <div class="ubacts">
           <button class="btn" type="button" onclick="copiarUbic(this)">Copiar ubicación</button>
           <a class="btn br" href="${esc(mapsUrl)}" target="_blank" rel="noreferrer">Abrir en Maps</a>
         </div>
       </section>`
    : "";

  const logoBox = logo
    ? `<div class="logo"><img src="${esc(logo)}" alt="" onerror="var b=this.parentNode;b.className='logo mono';b.textContent='${esc(iniciales(emp))}';"></div>`
    : `<div class="logo mono">${esc(iniciales(emp))}</div>`;

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Viaje ${esc(codigo)} — ${esc(emp)}</title>
<style>
  :root{--brand:#E5641C;--ink:#0f172a;--body:#26333f;--muted:#5b6b7c;--faint:#93a1b2;--line:#dde3ea;--card:#fff;--bg:#eef2f7;--soft:#f6f8fb;}
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  body{font-family:"Segoe UI",-apple-system,Roboto,Arial,sans-serif;background:var(--bg);color:var(--body);
       font-size:17px;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact;padding:20px;}
  .doc{max-width:820px;margin:0 auto;background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden;
       box-shadow:0 16px 40px -20px rgba(15,23,42,.4);}

  /* Cabecera empresa */
  .head{display:flex;align-items:center;gap:18px;padding:24px 30px 18px;border-bottom:4px solid var(--brand);}
  .logo{width:74px;height:74px;flex:none;border-radius:14px;background:#fff;border:1px solid var(--line);display:grid;place-items:center;padding:8px;}
  .logo img{max-width:100%;max-height:100%;object-fit:contain;display:block;}
  .logo.mono{background:var(--brand);border:none;color:#fff;font-weight:800;font-size:26px;padding:0;}
  .emp .nom{font-size:25px;font-weight:800;color:var(--ink);letter-spacing:-.01em;line-height:1.15;}
  .emp .ruc{font-size:16px;color:var(--muted);margin-top:3px;}
  .emp .tag{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--brand);margin-top:6px;}

  /* Código + estado */
  .cod{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:18px 30px 4px;}
  .cod .num{font-size:40px;font-weight:800;letter-spacing:-.02em;color:var(--ink);line-height:1;}
  .estado{font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#fff;background:var(--brand);padding:8px 16px;border-radius:999px;}

  /* Datos clave grandes */
  .hero{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:14px 30px 22px;}
  .tile{background:var(--soft);border:1px solid var(--line);border-radius:14px;padding:14px 16px;}
  .tile .t{font-size:12.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);}
  .tile .b{font-size:23px;font-weight:800;color:var(--ink);margin-top:5px;word-break:break-word;line-height:1.15;}

  /* Secciones */
  .body{padding:6px 30px 24px;}
  .grupo{padding:16px 0;border-bottom:1px solid var(--line);}
  .grupo:last-child{border-bottom:none;}
  .grupo h2{margin:0 0 10px;font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--brand);}
  .row{display:flex;gap:18px;justify-content:space-between;align-items:baseline;padding:7px 0;border-bottom:1px dashed #eef2f6;}
  .row:last-child{border-bottom:none;}
  .k{font-size:16px;color:var(--muted);flex:none;}
  .val{font-size:19px;font-weight:700;color:var(--ink);text-align:right;word-break:break-word;}
  .dash{color:#cbd5e1;font-weight:400;}

  /* Ubicación */
  .ublink{display:block;font-size:19px;font-weight:700;color:var(--brand);text-decoration:none;word-break:break-word;
          background:var(--soft);border:1px solid var(--line);border-radius:12px;padding:14px 16px;}
  .ubacts{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;}
  .btn{font-size:16px;font-weight:700;border:1px solid var(--line);background:#fff;color:var(--body);border-radius:10px;padding:10px 18px;cursor:pointer;text-decoration:none;}
  .btn.br{background:var(--brand);border:none;color:#fff;}

  .pie{padding:16px 30px;border-top:1px solid var(--line);color:var(--faint);font-size:14px;text-align:center;}
  .print{position:fixed;right:20px;bottom:20px;background:var(--brand);color:#fff;border:none;border-radius:999px;
         padding:14px 22px;font-size:16px;font-weight:700;box-shadow:0 10px 24px -6px rgba(229,100,28,.6);cursor:pointer;}

  @page{size:A4;margin:12mm;}
  @media print{
    body{background:#fff;padding:0;font-size:14pt;}
    .doc{box-shadow:none;border:none;border-radius:0;max-width:none;}
    .print{display:none;}
    .grupo{break-inside:avoid;}
  }
  @media (max-width:640px){ .hero{grid-template-columns:1fr;} .head,.cod,.hero,.body,.pie{padding-left:18px;padding-right:18px;} }
</style></head>
<body>
  <div class="doc">
    <div class="head">
      ${logoBox}
      <div class="emp">
        <div class="nom">${esc(emp)}</div>
        ${ruc ? `<div class="ruc">RUC ${esc(ruc)}</div>` : ""}
        <div class="tag">Ficha de viaje · para el conductor</div>
      </div>
    </div>

    <div class="cod">
      <div class="num">${esc(codigo)}</div>
      <div class="estado">${esc(v.estado || "")}</div>
    </div>

    <div class="hero">
      <div class="tile"><div class="t">Fecha de registro</div><div class="b">${esc(registro)}</div></div>
      <div class="tile"><div class="t">Contenedor</div><div class="b">${esc(v.contenedor || "—")}${v.tamanio ? ` <span style="font-size:16px;color:#5b6b7c">· ${esc(v.tamanio)}</span>` : ""}</div></div>
      <div class="tile"><div class="t">Cliente</div><div class="b">${esc(v.cliente || "—")}</div></div>
    </div>

    <div class="body">
      ${grupos.map(grupoHTML).join("")}
      ${ubic}
    </div>

    <div class="pie">${esc(emp)}${ruc ? " · RUC " + esc(ruc) : ""} · Documento para el conductor</div>
  </div>

  <button class="print" type="button" onclick="window.print()">Imprimir / Guardar PDF</button>
  <script>
    function copiarUbic(btn){
      var t=document.getElementById('ub');
      if(!t) return;
      navigator.clipboard.writeText(t.textContent||'').then(function(){
        var o=btn.textContent; btn.textContent='¡Copiado!'; setTimeout(function(){ btn.textContent=o; },1500);
      });
    }
  </script>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("Habilita las ventanas emergentes para ver la ficha."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
