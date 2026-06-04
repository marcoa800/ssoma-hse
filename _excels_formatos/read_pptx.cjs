const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

async function extractPptx(filePath) {
  const data = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(data);
  const slides = [];
  const slideFiles = Object.keys(zip.files)
    .filter(f => f.match(/^ppt\/slides\/slide\d+\.xml$/))
    .sort((a,b) => {
      const na = parseInt(a.match(/\d+/)[0]);
      const nb = parseInt(b.match(/\d+/)[0]);
      return na - nb;
    });
  for (const sf of slideFiles) {
    const xml = await zip.files[sf].async('string');
    const texts = [];
    const matches = xml.matchAll(/<a:t[^>]*>([^<]+)<\/a:t>/g);
    for (const m of matches) {
      const t = m[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').trim();
      if (t) texts.push(t);
    }
    if (texts.length) slides.push(`[${path.basename(sf)}]\n${texts.join(' | ')}`);
  }
  return slides.join('\n\n');
}

const files = [
  '/Users/marco/Documents/COMINDUSTRIA/Capacitacion/ERGONOMIA OFICINA.pptx',
  '/Users/marco/Documents/COMINDUSTRIA/Capacitacion/RIESGOS PSICOSOCIALES Y SALUD MENTAL.pptx'
];

(async () => {
  for (const f of files) {
    console.log('\n\n========== ' + require('path').basename(f) + ' ==========');
    console.log(await extractPptx(f));
  }
})();
