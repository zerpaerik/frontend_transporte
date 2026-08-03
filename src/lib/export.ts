// Exportación a Excel (CSV) y PDF sin dependencias externas.

export type Cell = string | number;

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportCSV(filename: string, headers: string[], rows: Cell[][]) {
  const esc = (v: Cell) => {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(";"), ...rows.map((r) => r.map(esc).join(";"))];
  // BOM para que Excel reconozca UTF-8 (tildes/ñ)
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  download(blob, filename.endsWith(".csv") ? filename : filename + ".csv");
}

export function exportPDF(title: string, headers: string[], rows: Cell[][], subtitle?: string) {
  const esc = (v: Cell) =>
    String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const head = headers.map((h) => `<th>${esc(h)}</th>`).join("");
  const body = rows
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
    .join("");

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #14202b; margin: 28px; }
  .head { display:flex; align-items:center; gap:12px; border-bottom:3px solid #E5641C; padding-bottom:12px; margin-bottom:16px; }
  .logo { width:34px; height:34px; border-radius:8px; background:#E5641C; color:#fff; font-weight:800; display:grid; place-items:center; }
  h1 { font-size:18px; margin:0; }
  .sub { color:#64748b; font-size:12px; margin-top:2px; }
  .meta { margin-left:auto; text-align:right; color:#94a3b8; font-size:11px; }
  table { width:100%; border-collapse:collapse; font-size:11px; }
  th { background:#f1f5f9; text-align:left; padding:7px 8px; border-bottom:2px solid #cbd5e1; text-transform:uppercase; font-size:10px; letter-spacing:.03em; color:#475569; }
  td { padding:6px 8px; border-bottom:1px solid #e2e8f0; }
  tr:nth-child(even) td { background:#f8fafc; }
  @media print { body { margin:12mm; } }
</style></head>
<body>
  <div class="head">
    <div class="logo">T</div>
    <div>
      <h1>${esc(title)}</h1>
      ${subtitle ? `<div class="sub">${esc(subtitle)}</div>` : ""}
    </div>
    <div class="meta">Transporte de Carga Pesada<br>${rows.length} registro(s)</div>
  </div>
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
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
