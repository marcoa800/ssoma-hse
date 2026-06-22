const XLSX = require('xlsx');
const fs = require('fs');
const FOLDER = '/Users/marco/Documents/formatosprincipalesdelagestinsst';
const rd = (file, sheet) => XLSX.utils.sheet_to_json(XLSX.readFile(`${FOLDER}/${file}`).Sheets[sheet], { header: 1, blankrows: true, defval: '' });
const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const isHeader = t => t && t.length > 4 && t === t.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(t) && !/[a-záéíóúñ]/.test(t) && !t.includes(' - ');

// ── FR-031 EPP: items (num, nombre, criterios) col 0,1,2 ──
const epp = [];
rd('HGP-SGIII-SST-FR-031 Inspección de Pre-uso de EPPs e implementos de seguridad.xlsx', 'HGP-SGIII-SST-FR-031').forEach(r => {
  const c = clean(r[0]), n = clean(r[1]), d = clean(r[2]);
  if (/^\d+$/.test(c) && n) epp.push({ c, n, desc: d.replace(/•/g, '·') });
});

// ── FR-033 DEA: secciones, col 0, items "N.N Texto" ──
const deaGrupos = []; let dg = null;
rd('HGP-SGIII-SST-FR-033 Inspeccion de DEA.xlsx', 'DEA').forEach(r => {
  const t = clean(r[0]); if (!t || t === 'DESCRIPCIÓN') return;
  const m = t.match(/^(\d+\.\d+)\s+(.*)/);
  if (m) { if (dg) dg.items.push({ c: m[1], n: m[2] }); }
  else if (isHeader(t) && !/OBSERVAC/.test(t)) {
    const titulo = t.replace(/^ISPECCI/, 'INSPECCI');
    dg = { titulo: `${deaGrupos.length + 1}. ${titulo.charAt(0) + titulo.slice(1).toLowerCase()}`, items: [] };
    deaGrupos.push(dg);
  }
});

// ── FR-040 Fatiga: matriz items planos, col 0 "N. Texto" ──
const fatiga = [];
rd('HGP-SGIII-SST-FR-040 Check list Fatiga y Somnolencia.xls', 'F-SSTMA-SST-09').forEach(r => {
  const m = clean(r[0]).match(/^(\d+)\.\s*(.*)/);
  if (m && m[2]) fatiga.push({ c: m[1], n: m[2] });
});

// ── FR-034 Ambulancia: secciones, dos columnas (1 izq, 13 der), B/M/NA ──
const ambExtrae = (col) => {
  const grupos = []; let g = null;
  rd('HGP-SGIII-SST-FR-034 Inspección de Ambulancia.xlsx', 'Ambulancia').forEach((r, i) => {
    if (i < 9) return;
    let t = clean(r[col]); if (!t || /^ASPECTOS A REVISAR/.test(t) || t.length <= 2) return;
    if (isHeader(t)) { g = { titulo: t, items: [] }; grupos.push(g); }
    else if (g) g.items.push(t.replace(/^\*\s*/, ''));
  });
  return grupos;
};
const ambGrupos = [...ambExtrae(1), ...ambExtrae(13)]
  .filter(g => g.items.length)
  .map((g, gi) => ({ titulo: `${gi + 1}. ${g.titulo}`, items: g.items.map((n, i) => ({ c: `${gi + 1}.${i + 1}`, n })) }));

// ── Serializadores ──
const serSec = (grupos) => grupos.map(g =>
  `    { titulo: ${JSON.stringify(g.titulo)}, items: [\n` +
  g.items.map(it => `      { c: ${JSON.stringify(it.c)}, n: ${JSON.stringify(it.n)} },`).join('\n') + `\n    ]},`).join('\n');
const serItems = (items, withDesc) => items.map(it =>
  `  { c: ${JSON.stringify(it.c)}, n: ${JSON.stringify(it.n)}${withDesc && it.desc ? `, desc: ${JSON.stringify(it.desc)}` : ''} },`).join('\n');

const out = `// ════════════════════════════════════════════════════════════════════
//  INSPECCIONES HGP — LOTE 3 (activos, checklists, matrices)
//  Generado desde los Excel oficiales por _excels_formatos/build_lote3.cjs
// ════════════════════════════════════════════════════════════════════

// ── FR-028: Inspección de Mangueras Contra Incendio (activos) ──
const MANGUERAS = {
  codigo: "HGP-SGIII-SST-FR-028", codigoPdf: "HGP-SGIII-SST-FR-028",
  nombre: "Inspección de Mangueras Contra Incendio", titulo: "INSPECCIÓN DE MANGUERA CONTRA INCENDIO",
  patron: "activos", rev: "00",
  cabecera: [
    { key: "fecha", label: "Fecha de inspección", type: "date", required: true },
    { key: "area", label: "Área / Sede", type: "text", default: "Central Hidroeléctrica San Gabán III" },
    { key: "inspector", label: "Inspeccionado por", type: "text", required: true, full: true },
    { key: "supervisor", label: "Supervisor Responsable", type: "text", full: true },
  ],
  columnasActivo: [
    { key: "codigo", label: "Código (MCI)", width: 70 },
    { key: "instalacion", label: "Instalación", width: 140 },
    { key: "codigo_instalacion", label: "Cód. Instalación", width: 80 },
    { key: "ubicacion", label: "Ubicación", width: 150 },
    { key: "capacidad", label: "Capacidad", width: 60 },
  ],
  puntos: [
    { key: "p1", short: "Tejido", label: "Estado del tejido" },
    { key: "p2", short: "Acoples", label: "Acoplamientos" },
    { key: "p3", short: "Liner", label: "Revestimiento interior (liner)" },
    { key: "p4", short: "Rotulado", label: "Rotulado y certificación" },
    { key: "p5", short: "Pitón", label: "Pitón" },
    { key: "p6", short: "Prueba", label: "Prueba de servicio" },
  ],
  observacionPorFila: { key: "obs", label: "Observaciones" },
  leyendaCalif: "Calificación — C: Conforme · NC: No Conforme · NA: No aplica · N.T.: No tiene",
  recomendacion: "Programar el reemplazo o mantenimiento de toda manguera no conforme.",
  firmas: [{ rol: "Inspeccionado por" }, { rol: "Supervisor Responsable" }],
  filasIniciales: 30,
};

// ── FR-033: Inspección de DEA (secciones · APRUEBA/FALLÓ) ──
const DEA = {
  codigo: "HGP-SGIII-SST-FR-033", codigoPdf: "HGP-SGIII-SST-FR-033",
  nombre: "Inspección de Desfibrilador (DEA)", titulo: "INSPECCIÓN DE DESFIBRILADOR EXTERNO AUTOMÁTICO - DEA",
  patron: "secciones", rev: "00",
  cabecera: [
    { key: "area", label: "Ubicación del DEA", type: "text", full: true },
    { key: "fecha", label: "Fecha de inspección", type: "date", required: true },
    { key: "modelo", label: "Modelo", type: "text" },
    { key: "marca", label: "Marca", type: "text" },
    { key: "n_serie", label: "N° de Serie", type: "text" },
    { key: "inspector", label: "Responsable de la inspección", type: "text", required: true, full: true },
  ],
  calificaciones: ["APRUEBA", "FALLÓ"], calLabel: "Aprueba / Falló",
  columnas: [{ key: "observacion", label: "Comentarios" }],
  secciones: [
${serSec(deaGrupos)}
  ],
  leyendaCalif: "APRUEBA: Cumple el criterio · FALLÓ: No cumple",
  recomendacion: "Registrar el comentario de cada componente que falló y gestionar su corrección.",
  firmas: [{ rol: "Responsable de la inspección" }],
};

// ── FR-034: Inspección de Ambulancia (secciones · B/M/NA) ──
const AMBULANCIA = {
  codigo: "HGP-SGIII-SST-FR-034", codigoPdf: "HGP-SGIII-SST-FR-034",
  nombre: "Inspección de Ambulancia", titulo: "INSPECCIÓN DE AMBULANCIA",
  patron: "secciones", rev: "00",
  cabecera: [
    { key: "unidad", label: "Unidad operativa", type: "text" },
    { key: "fecha", label: "Fecha", type: "date", required: true },
    { key: "placa", label: "N° de Placa", type: "text" },
    { key: "vehiculo", label: "Tipo / Marca / Modelo", type: "text" },
    { key: "actividad", label: "Actividad", type: "text", full: true },
    { key: "inspector", label: "Inspeccionado por", type: "text", required: true, full: true },
  ],
  calificaciones: ["B", "M", "NA"], calLabel: "B / M / NA",
  columnas: [{ key: "observacion", label: "Observación" }],
  secciones: [
${serSec(ambGrupos)}
  ],
  leyendaCalif: "Estado — B: Bueno · M: Malo · NA: No aplica",
  recomendacion: "Registrar la observación de cada aspecto en estado 'M'.",
  firmas: [{ rol: "Inspeccionado por" }, { rol: "V°B° Supervisión" }],
};

// ── FR-031: Inspección Pre-uso de EPP (matriz · Trabajadores × EPP) ──
const PREUSO_EPP = {
  codigo: "HGP-SGIII-SST-FR-031", codigoPdf: "HGP-SGIII-SST-FR-031",
  nombre: "Inspección Pre-uso de EPP e Implementos", titulo: "INSPECCIÓN PRE-USO DE EPP E IMPLEMENTOS DE SEGURIDAD",
  patron: "matriz", rev: "00",
  cabecera: [
    { key: "fecha", label: "Fecha", type: "date", required: true },
    { key: "hora", label: "Hora", type: "time" },
    { key: "area", label: "Lugar", type: "text" },
    { key: "actividad", label: "Actividad", type: "text" },
    { key: "empresa", label: "Empresa (contrata / sub-contrata)", type: "text", full: true },
    { key: "inspector", label: "Inspeccionado por", type: "text", required: true, full: true },
  ],
  equipoLabel: "Trabajador", equipoCampo: { key: "nombre", label: "Trabajador" },
  equiposIniciales: 5, equiposMax: 10,
  calificaciones: ["B", "M", "NA"],
  items: [
${serItems(epp, true)}
  ],
  leyendaCalif: "Estado del EPP — B: Bueno (operativo) · M: Malo (retirar) · NA: No aplica",
  recomendacion: "Retirar de uso todo EPP en estado 'M'.",
  firmas: [{ rol: "Inspeccionado por" }, { rol: "Supervisor Responsable" }],
};

// ── FR-040: Check list Fatiga y Somnolencia (matriz semanal · SI/NO) ──
const FATIGA = {
  codigo: "HGP-SGIII-SST-FR-040", codigoPdf: "HGP-SGIII-SST-FR-040",
  nombre: "Check List Fatiga y Somnolencia", titulo: "CHECK LIST FATIGA Y SOMNOLENCIA",
  patron: "matriz", rev: "00",
  cabecera: [
    { key: "inspector", label: "Nombre", type: "text", required: true, full: true },
    { key: "cargo", label: "Cargo", type: "text" },
    { key: "frente", label: "Frente de trabajo", type: "text" },
    { key: "placa", label: "Placa del vehículo", type: "text" },
    { key: "turno", label: "Turno de trabajo", type: "text" },
    { key: "semana", label: "Semana del / al", type: "text" },
  ],
  columnasFijas: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
  calificaciones: ["SI", "NO"],
  items: [
${serItems(fatiga, false)}
  ],
  leyendaCalif: "Declaración jurada — marcar SI/NO cada día. Este formulario debe completarse al inicio del turno.",
  recomendacion: "Toda respuesta SI en preguntas de fatiga requiere evaluación de la supervisión.",
  firmas: [{ rol: "Supervisor de Área / Personal trasladado" }, { rol: "Supervisor de Seguridad" }],
};

export const PLANTILLAS_LOTE3 = {
  [MANGUERAS.codigo]: MANGUERAS,
  [DEA.codigo]: DEA,
  [AMBULANCIA.codigo]: AMBULANCIA,
  [PREUSO_EPP.codigo]: PREUSO_EPP,
  [FATIGA.codigo]: FATIGA,
};

export const CATALOGO_LOTE3 = [
  { codigo: MANGUERAS.codigo, nombre: MANGUERAS.nombre, patron: "activos", grupo: "Emergencias", disponible: true },
  { codigo: DEA.codigo, nombre: DEA.nombre, patron: "secciones", grupo: "Emergencias", disponible: true },
  { codigo: AMBULANCIA.codigo, nombre: AMBULANCIA.nombre, patron: "secciones", grupo: "Vehículos", disponible: true },
  { codigo: PREUSO_EPP.codigo, nombre: PREUSO_EPP.nombre, patron: "matriz", grupo: "EPP", disponible: true },
  { codigo: FATIGA.codigo, nombre: FATIGA.nombre, patron: "matriz", grupo: "Salud Ocupacional", disponible: true },
];
`;
fs.writeFileSync('src/constants/inspecciones-lote3-hgp.js', out);
console.log('Escrito inspecciones-lote3-hgp.js');
console.log(`EPP: ${epp.length} ítems | DEA: ${deaGrupos.length} grupos ${deaGrupos.reduce((s,g)=>s+g.items.length,0)} items | Fatiga: ${fatiga.length} | Ambulancia: ${ambGrupos.length} grupos ${ambGrupos.reduce((s,g)=>s+g.items.length,0)} items`);
