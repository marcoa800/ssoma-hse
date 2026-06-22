const XLSX = require('xlsx');
const [file, sheet, r0, r1] = [process.argv[2], process.argv[3], +process.argv[4], +process.argv[5]];
const wb = XLSX.readFile(file);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, blankrows: true, defval: '' });
for (let i = r0; i <= r1 && i < rows.length; i++) {
  const cells = (rows[i]||[]).map((c, j) => c !== '' ? `[${j}]${String(c).replace(/\s+/g,' ').slice(0,40)}` : null).filter(Boolean);
  console.log(`R${i}: ${cells.join('  ')}`);
}
