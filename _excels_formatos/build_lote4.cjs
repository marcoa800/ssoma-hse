const XLSX = require('xlsx');
const fs = require('fs');
const FOLDER = '/Users/marco/Documents/formatosprincipalesdelagestinsst';
const rd = (file, sheet) => XLSX.utils.sheet_to_json(XLSX.readFile(`${FOLDER}/${file}`).Sheets[sheet], { header: 1, blankrows: true, defval: '' });
const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim();

// ── FR-043 Puente grúa: matriz, concepto col1 + desc col2 (con continuaciones) ──
const puente = []; let puenteDone = false;
rd('HGP-SGIII-SST-FR-043 Inspección de Puente grúa.xlsx', 'PUENTE GRÚA').forEach((r, i) => {
  if (i < 13 || puenteDone) return;
  const concepto = clean(r[1]), desc = clean(r[2]);
  if (/^(FIRMA|HALLAZGOS|FECHA|\*)/i.test(concepto)) { puenteDone = true; return; }  // pie del formato
  if (concepto) puente.push({ c: `${puente.length + 1}`, n: concepto.replace(/\*+$/, '').trim(), desc });
  else if (desc && puente.length) puente[puente.length - 1].desc += ' ' + desc;
});

// ── FR-045 Montacargas: matriz, num col0, nombre col1 ──
const monta = [];
rd('HGP-SGIII-SST-FR-045 Inspección de Montacargas.xlsx', 'Montacargas').forEach(r => {
  const c = clean(r[0]), n = clean(r[1]);
  if (/^\d+$/.test(c) && n) monta.push({ c, n });
});

// ── FR-044 Camión grúa: secciones, header col0 (texto), item col0=num col1=nombre ──
const camionGrupos = []; let cg = null, camionDone = false;
rd('HGP-SGIII-SST-FR-044 Inspección de camión grúa.xlsx', 'Camión grúa').forEach((r, i) => {
  if (i < 12 || camionDone) return;
  const c = clean(r[0]), n = clean(r[1]);
  if (/^\d+$/.test(c) && n) { if (cg) cg.items.push({ c: `${cg._n}.${cg.items.length + 1}`, n }); }
  else if (c && !/^B:\s/i.test(c) && c !== 'N°' && !/CALIFIQUE/i.test(c)) {
    if (/INSPECTOR|NOMBRE|FIRMA|HOR[OÓ]METRO/i.test(c)) { camionDone = true; return; }  // pie del formato
    cg = { titulo: `${camionGrupos.length + 1}. ${c}`, _n: camionGrupos.length + 1, items: [] };
    camionGrupos.push(cg);
  }
});

const serItems = (items, withDesc) => items.map(it =>
  `  { c: ${JSON.stringify(it.c)}, n: ${JSON.stringify(it.n)}${withDesc && it.desc ? `, desc: ${JSON.stringify(it.desc)}` : ''} },`).join('\n');
const serSec = (grupos) => grupos.map(g =>
  `    { titulo: ${JSON.stringify(g.titulo)}, items: [\n` +
  g.items.map(it => `      { c: ${JSON.stringify(it.c)}, n: ${JSON.stringify(it.n)} },`).join('\n') + `\n    ]},`).join('\n');

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DIAS_TURNO = DIAS.flatMap(d => [`${d} T1`, `${d} T2`]);

const out = `// ════════════════════════════════════════════════════════════════════
//  INSPECCIONES HGP — LOTE 4 (grúas y montacargas)
//  Generado por _excels_formatos/build_lote4.cjs
// ════════════════════════════════════════════════════════════════════

// ── FR-043: Check List Pre-uso Puente Grúa (matriz semanal · B/M/NA) ──
const PUENTE_GRUA = {
  codigo: "HGP-SGIII-SST-FR-043", codigoPdf: "HGP-SGIII-SST-FR-043",
  nombre: "Check List Pre-uso Puente Grúa", titulo: "CHECK LIST PRE-USO PUENTE GRÚA",
  patron: "matriz", rev: "00",
  cabecera: [
    { key: "empresa", label: "Empresa", type: "text", full: true },
    { key: "semana", label: "Semana del / al", type: "text" },
    { key: "tipo_equipo", label: "Tipo de equipo", type: "text" },
    { key: "capacidad", label: "Capacidad", type: "text" },
    { key: "modelo", label: "Modelo", type: "text" },
    { key: "operador", label: "Operador", type: "text" },
    { key: "area", label: "Área", type: "text" },
    { key: "ubicacion", label: "Ubicación", type: "text" },
    { key: "inspector", label: "Inspeccionado por", type: "text", required: true, full: true },
  ],
  columnasFijas: ${JSON.stringify(DIAS)},
  calificaciones: ["B", "M", "NA"],
  items: [
${serItems(puente, true)}
  ],
  leyendaCalif: "B: Bueno · M: Malo · N.A.: No aplica. Todos los ítems (*) son puntos críticos: si alguno es M, el equipo queda inhabilitado para operar.",
  recomendacion: "Inhabilitar el equipo si cualquier punto crítico resulta Malo.",
  firmas: [{ rol: "Firma Operador" }, { rol: "Firma Supervisor" }],
};

// ── FR-044: Inspección de Camión Grúa (secciones · B/M/NA) ──
const CAMION_GRUA = {
  codigo: "HGP-SGIII-SST-FR-044", codigoPdf: "HGP-SGIII-SST-FR-044",
  nombre: "Inspección de Camión Grúa", titulo: "INSPECCIÓN DE CAMIÓN GRÚA",
  patron: "secciones", rev: "00",
  cabecera: [
    { key: "empresa", label: "Empresa", type: "text" },
    { key: "operador", label: "Operador", type: "text" },
    { key: "marca", label: "Marca", type: "text" },
    { key: "modelo", label: "Modelo", type: "text" },
    { key: "anio", label: "Año", type: "text" },
    { key: "capacidad_pluma", label: "Capacidad de la pluma", type: "text" },
    { key: "capacidad_gancho", label: "Capacidad de gancho", type: "text" },
    { key: "inspector", label: "Inspeccionado por", type: "text", required: true, full: true },
  ],
  calificaciones: ["B", "M", "NA"], calLabel: "B / M / NA",
  columnas: [{ key: "observacion", label: "Observaciones" }],
  secciones: [
${serSec(camionGrupos)}
  ],
  leyendaCalif: "B: Bueno · M: Malo · N/A: No aplica. Cuando califique M, registrar la observación.",
  recomendacion: "Registrar la observación de cada parte en estado 'M'.",
  firmas: [{ rol: "Firma Operador" }, { rol: "Firma Supervisor" }],
};

// ── FR-045: Inspección de Montacargas (matriz semanal · 2 turnos · B/M/NA) ──
const MONTACARGAS = {
  codigo: "HGP-SGIII-SST-FR-045", codigoPdf: "HGP-SGIII-SST-FR-045",
  nombre: "Inspección de Montacargas", titulo: "INSPECCIÓN DE MONTACARGAS / MANIPULADOR NEUMÁTICO",
  patron: "matriz", rev: "00",
  cabecera: [
    { key: "tipo", label: "Tipo de montacarga", type: "text" },
    { key: "inspector", label: "Inspeccionado por", type: "text", required: true, full: true },
    { key: "semana", label: "Semana", type: "text" },
    { key: "equipo", label: "Equipo (Marca / Modelo)", type: "text" },
    { key: "anio", label: "Año de fabricación", type: "text" },
    { key: "ubicacion", label: "Ubicación", type: "text" },
    { key: "horometro_ini", label: "Horómetro inicial", type: "text" },
    { key: "horometro_fin", label: "Horómetro final", type: "text" },
  ],
  columnasFijas: ${JSON.stringify(DIAS_TURNO)},
  calificaciones: ["B", "M", "NA"],
  items: [
${serItems(monta, false)}
  ],
  leyendaCalif: "B: Bueno · M: Malo · N.A.: No aplica. (*) ítems críticos. Dos turnos por día (T1 / T2).",
  recomendacion: "Reportar de inmediato cualquier ítem crítico en estado Malo.",
  firmas: [{ rol: "Firma Operador" }, { rol: "Firma Supervisor" }],
};

export const PLANTILLAS_LOTE4 = {
  [PUENTE_GRUA.codigo]: PUENTE_GRUA,
  [CAMION_GRUA.codigo]: CAMION_GRUA,
  [MONTACARGAS.codigo]: MONTACARGAS,
};

export const CATALOGO_LOTE4 = [
  { codigo: PUENTE_GRUA.codigo, nombre: PUENTE_GRUA.nombre, patron: "matriz", grupo: "Equipos", disponible: true },
  { codigo: CAMION_GRUA.codigo, nombre: CAMION_GRUA.nombre, patron: "secciones", grupo: "Vehículos", disponible: true },
  { codigo: MONTACARGAS.codigo, nombre: MONTACARGAS.nombre, patron: "matriz", grupo: "Vehículos", disponible: true },
];
`;
fs.writeFileSync('src/constants/inspecciones-lote4-hgp.js', out);
console.log(`Puente: ${puente.length} items | Montacargas: ${monta.length} items | Camión: ${camionGrupos.length} grupos ${camionGrupos.reduce((s,g)=>s+g.items.length,0)} items`);
