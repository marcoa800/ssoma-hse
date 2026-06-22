// Extrae grupos+items de un checklist tipo FR-016 (colCode, colText).
// Uso: node extract_checklist.cjs <archivo> <sheet> <colCode> <colText>
const XLSX = require('xlsx');
const [file, sheet, cc, ct] = [process.argv[2], process.argv[3], +process.argv[4], +process.argv[5]];
const wb = XLSX.readFile(file);
const ws = wb.Sheets[sheet];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
const grupos = [];
let g = null, gi = 0;
for (const r of rows) {
  const code = String(r[cc] ?? '').trim();
  const text = String(r[ct] ?? '').replace(/\s+/g, ' ').trim();
  if (!text) continue;
  if (/^\d+$/.test(code)) {            // grupo (código entero)
    gi = 0; g = { titulo: `${code}. ${text}`, items: [] }; grupos.push(g);
  } else if (/^\d+\.\d+/.test(code) && g) {  // item (código decimal)
    gi++; g.items.push({ c: `${g.titulo.split('.')[0]}.${gi}`, n: text });
  }
}
// Emitir JS
const out = grupos.map(gr =>
  `    { titulo: ${JSON.stringify(gr.titulo)}, items: [\n` +
  gr.items.map(it => `      { c: "${it.c}", n: ${JSON.stringify(it.n)} },`).join('\n') +
  `\n    ]},`
).join('\n');
console.log(out);
console.error(`\n>> ${grupos.length} grupos, ${grupos.reduce((s,x)=>s+x.items.length,0)} items`);
