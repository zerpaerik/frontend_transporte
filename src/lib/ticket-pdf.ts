// Ficha de viaje para el conductor, en A4, letras grandes y legible.
// Cabecera con logo + nombre + RUC de la empresa que despacha, y SOLO los datos
// operativos que el conductor necesita. La ubicación de llegada es tocable
// (copiar / abrir en Maps). Se abre como página; se guarda como PDF con el botón.

const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function iniciales(nombre: string) {
  return (nombre || "T").split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
}

export function fichaViajePDF(v: any, empresa?: { nombre?: string; ruc?: string; codigo?: string }) {
  const codigo = v.codigo || "Viaje";
  const emp = empresa?.nombre || "Orden de viaje";
  const ruc = empresa?.ruc || "";
  const logo = empresa?.codigo ? `/sedes/${encodeURIComponent(empresa.codigo)}.jpg` : "";

  // Los únicos datos que se muestran en la ficha.
  const datos: [string, string][] = [
    ["Punto de recojo", v.origen || ""],
    ["Cita de retiro", v.horaCita || ""],
    ["Punto de llegada", v.destino || ""],
    ["Tamaño contenedor", v.tamanio || ""],
    ["Tipo de mercadería a trasladar", v.tipoCarga || ""],
  ];
  const row = (k: string, val: string) => `
    <div class="row"><div class="k">${esc(k)}</div><div class="val">${val ? esc(val) : '<span class="dash">—</span>'}</div></div>`;

  const mapsUrl = v.ubicacion ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.ubicacion)}` : "";
  const ubic = `
    <div class="ublabel">Ubicación de llegada</div>
    ${v.ubicacion
      ? `<a id="ub" class="ublink" href="${esc(mapsUrl)}" target="_blank" rel="noreferrer">${esc(v.ubicacion)}</a>
         <div class="ubacts">
           <button class="btn" type="button" onclick="copiarUbic(this)">Copiar ubicación</button>
           <a class="btn br" href="${esc(mapsUrl)}" target="_blank" rel="noreferrer">Abrir en Maps</a>
         </div>`
      : `<div class="ublink dash">—</div>`}`;

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

  .head{display:flex;align-items:center;gap:18px;padding:24px 30px 18px;border-bottom:4px solid var(--brand);}
  .logo{width:74px;height:74px;flex:none;border-radius:14px;background:#fff;border:1px solid var(--line);display:grid;place-items:center;padding:8px;}
  .logo img{max-width:100%;max-height:100%;object-fit:contain;display:block;}
  .logo.mono{background:var(--brand);border:none;color:#fff;font-weight:800;font-size:26px;padding:0;}
  .emp .nom{font-size:25px;font-weight:800;color:var(--ink);letter-spacing:-.01em;line-height:1.15;}
  .emp .ruc{font-size:16px;color:var(--muted);margin-top:3px;}
  .emp .tag{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--brand);margin-top:6px;}

  .cod{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:20px 30px 6px;}
  .cod .num{font-size:40px;font-weight:800;letter-spacing:-.02em;color:var(--ink);line-height:1;}
  .estado{font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#fff;background:var(--brand);padding:8px 16px;border-radius:999px;}

  .body{padding:12px 30px 26px;}
  .row{display:flex;gap:18px;justify-content:space-between;align-items:baseline;padding:14px 0;border-bottom:1px solid var(--line);}
  .k{font-size:17px;color:var(--muted);flex:none;}
  .val{font-size:22px;font-weight:800;color:var(--ink);text-align:right;word-break:break-word;}
  .dash{color:#cbd5e1;font-weight:400;}

  .ublabel{font-size:17px;color:var(--muted);margin:16px 0 8px;}
  .ublink{display:block;font-size:20px;font-weight:700;color:var(--brand);text-decoration:none;word-break:break-word;
          background:var(--soft);border:1px solid var(--line);border-radius:12px;padding:15px 16px;}
  .ublink.dash{color:#cbd5e1;font-weight:400;}
  .ubacts{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;}
  .btn{font-size:16px;font-weight:700;border:1px solid var(--line);background:#fff;color:var(--body);border-radius:10px;padding:11px 20px;cursor:pointer;text-decoration:none;}
  .btn.br{background:var(--brand);border:none;color:#fff;}

  .pie{padding:16px 30px;border-top:1px solid var(--line);color:var(--faint);font-size:14px;text-align:center;}
  .print{position:fixed;right:20px;bottom:20px;background:var(--brand);color:#fff;border:none;border-radius:999px;
         padding:14px 22px;font-size:16px;font-weight:700;box-shadow:0 10px 24px -6px rgba(229,100,28,.6);cursor:pointer;}

  @page{size:A4;margin:12mm;}
  @media print{ body{background:#fff;padding:0;font-size:14pt;} .doc{box-shadow:none;border:none;border-radius:0;max-width:none;} .print{display:none;} }
  @media (max-width:640px){ .head,.cod,.body,.pie{padding-left:18px;padding-right:18px;} }
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

    <div class="body">
      ${row(datos[0][0], datos[0][1])}
      ${row(datos[1][0], datos[1][1])}
      ${row(datos[2][0], datos[2][1])}
      ${ubic}
      ${row(datos[3][0], datos[3][1])}
      ${row(datos[4][0], datos[4][1])}
    </div>

    <div class="pie">${esc(emp)}${ruc ? " · RUC " + esc(ruc) : ""}</div>
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
