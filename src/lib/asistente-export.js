// ════════════════════════════════════════════════════════════════════
//  Exportador del Asistente IA SSOMA.
//  La IA devuelve Markdown (encabezados, párrafos, tablas). Aquí lo
//  convertimos a Word (.doc HTML compatible) o Excel (.xlsx con xlsx).
// ════════════════════════════════════════════════════════════════════
import * as XLSX from "xlsx";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s) => esc(s)
  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>")
  .replace(/`(.+?)`/g, "<code>$1</code>");

const esSepTabla = (l) => /^\s*\|?\s*:?-{2,}/.test(l || "");
const esFilaTabla = (l) => /^\s*\|/.test(l || "");
const celdas = (r) => r.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

// ── Markdown → HTML (para Word) ──
function mdToHtml(md) {
  const lines = (md || "").split(/\r?\n/);
  let html = "", i = 0, inUl = false;
  const closeUl = () => { if (inUl) { html += "</ul>"; inUl = false; } };
  while (i < lines.length) {
    const line = lines[i];
    if (esFilaTabla(line) && esSepTabla(lines[i + 1])) {
      closeUl();
      const rows = [];
      while (i < lines.length && esFilaTabla(lines[i])) { rows.push(lines[i]); i++; }
      const head = celdas(rows[0]);
      html += "<table><thead><tr>" + head.map((h) => `<th>${inline(h)}</th>`).join("") + "</tr></thead><tbody>";
      for (let r = 2; r < rows.length; r++) {
        const c = celdas(rows[r]);
        html += "<tr>" + c.map((x) => `<td>${inline(x)}</td>`).join("") + "</tr>";
      }
      html += "</tbody></table>";
      continue;
    }
    const t = line.trim();
    if (!t) { closeUl(); i++; continue; }
    let m;
    if ((m = t.match(/^(#{1,6})\s+(.*)/))) { closeUl(); const lvl = Math.min(m[1].length, 4); html += `<h${lvl}>${inline(m[2])}</h${lvl}>`; i++; continue; }
    if ((m = t.match(/^[-*+]\s+(.*)/)) || (m = t.match(/^\d+[.)]\s+(.*)/))) {
      if (!inUl) { html += "<ul>"; inUl = true; } html += `<li>${inline(m[1])}</li>`; i++; continue;
    }
    closeUl(); html += `<p>${inline(t)}</p>`; i++;
  }
  closeUl();
  return html;
}

function saveBlob(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Word (.doc HTML compatible con Microsoft Word) ──
export function descargarWord(md, filename, titulo) {
  const body = mdToHtml(md);
  const doc =
    `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>` +
    `<head><meta charset='utf-8'><title>${esc(titulo || "Informe")}</title><style>` +
    `body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#1a1a1a;}` +
    `h1{font-size:18pt;color:#1f3864;} h2{font-size:14pt;color:#1f3864;} h3{font-size:12pt;color:#2e5496;} h4{font-size:11pt;color:#2e5496;}` +
    `table{border-collapse:collapse;width:100%;margin:8pt 0;} th,td{border:1px solid #888;padding:4pt 6pt;font-size:10pt;text-align:left;vertical-align:top;} th{background:#1f3864;color:#fff;}` +
    `p{margin:4pt 0;} li{margin:2pt 0;}` +
    `</style></head><body>${titulo ? `<h1>${esc(titulo)}</h1>` : ""}${body}` +
    `<p style='margin-top:14pt;font-size:8pt;color:#888;'>Generado con el Asistente IA SSOMA · Adaptado a normativa peruana</p>` +
    `</body></html>`;
  saveBlob(new Blob(["﻿", doc], { type: "application/msword" }), `${filename}.doc`);
}

// ── Excel (.xlsx): hoja "Informe" + una hoja por cada tabla detectada ──
export function descargarExcel(md, filename, titulo) {
  const lines = (md || "").split(/\r?\n/);
  const tablas = [];
  const narrativa = [];
  let i = 0;
  while (i < lines.length) {
    if (esFilaTabla(lines[i]) && esSepTabla(lines[i + 1])) {
      const rows = [];
      while (i < lines.length && esFilaTabla(lines[i])) { rows.push(lines[i]); i++; }
      const limpia = (r) => celdas(r).map((c) => c.replace(/\*\*/g, "").replace(/`/g, ""));
      tablas.push([limpia(rows[0]), ...rows.slice(2).map(limpia)]);
    } else {
      const t = lines[i].replace(/[#*`>]/g, "").trim();
      if (t) narrativa.push([t]);
      i++;
    }
  }
  const wb = XLSX.utils.book_new();
  const infoAoa = [[titulo || "Informe SSOMA"], [""], ...narrativa];
  const ws0 = XLSX.utils.aoa_to_sheet(infoAoa);
  ws0["!cols"] = [{ wch: 110 }];
  XLSX.utils.book_append_sheet(wb, ws0, "Informe");
  tablas.forEach((aoa, idx) => {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = (aoa[0] || []).map(() => ({ wch: 26 }));
    XLSX.utils.book_append_sheet(wb, ws, `Tabla ${idx + 1}`);
  });
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function descargarTexto(md, filename) {
  saveBlob(new Blob([md], { type: "text/markdown;charset=utf-8" }), `${filename}.md`);
}
