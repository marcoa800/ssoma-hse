const XLSX = require('xlsx');
const files = process.argv.slice(2);
for (const f of files) {
  console.log("\n\n████████████████████████████████████████████████████████");
  console.log("FILE:", f.split('/').pop());
  console.log("████████████████████████████████████████████████████████");
  const wb = XLSX.readFile(f);
  for (const sn of wb.SheetNames) {
    const ws = wb.Sheets[sn];
    const ref = ws['!ref'] || 'EMPTY';
    console.log(`\n===== SHEET: "${sn}"  range=${ref} =====`);
    const rows = XLSX.utils.sheet_to_json(ws, {header:1, blankrows:false, defval:''});
    rows.forEach((r, i) => {
      const cells = r.map(c => String(c).replace(/\s+/g,' ').trim()).filter(c=>c!=='');
      if (cells.length) console.log(`R${i}: ${cells.map(c=>c.length>80?c.slice(0,80)+'…':c).join(' | ')}`);
    });
  }
}
