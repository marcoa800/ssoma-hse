const XLSX = require('xlsx');
const fs = require('fs');
const FOLDER = '/Users/marco/Documents/formatosprincipalesdelagestinsst';

// ── Extractor de checklist con códigos decimales (FR-016) ──
function extraerGrupos(file, sheet, cc, ct) {
  const wb = XLSX.readFile(`${FOLDER}/${file}`);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, blankrows: false, defval: '' });
  const grupos = []; let g = null, gi = 0;
  for (const r of rows) {
    const code = String(r[cc] ?? '').trim();
    const text = String(r[ct] ?? '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    if (/^\d+$/.test(code)) { gi = 0; g = { titulo: `${code}. ${text}`, items: [] }; grupos.push(g); }
    else if (/^\d+\.\d+/.test(code) && g) { gi++; g.items.push({ c: `${code.split('.')[0]}.${gi}`, n: text }); }
  }
  return grupos;
}

const fr016 = extraerGrupos('HGP-SGIII-SST-FR-016 Inspección a comedor.xlsx', 'COMPLETO', 0, 1);

// helper para serializar grupos/items
const ser = (grupos) => grupos.map(gr =>
  `    { titulo: ${JSON.stringify(gr.titulo)}, items: [\n` +
  gr.items.map(it => `      { c: ${JSON.stringify(it.c)}, n: ${JSON.stringify(it.n)} },`).join('\n') +
  `\n    ]},`).join('\n');

// ── Datos hardcodeados (formatos cortos) ──
const fr017 = [
  { titulo: "INSTALACIONES EN GENERAL", items: [
    "Orden y Limpieza","Accesos Libres y Seguros","Conexiones eléctricas, puesta a tierra",
    "Cubierta o Techo en buenas condiciones","Iluminación adecuada","Avisos de Seguridad",
    "Extintores distribuidos y señalizados adecuadamente","Botiquín de primeros auxilios",
    "Depósitos de basura","Limpieza de servicios higiénicos","Otros",
  ].map((n,i)=>({c:`1.${i+1}`,n})) },
  { titulo: "ÁREA DE ALMACENAMIENTO DE BOTELLAS DE GAS COMPRIMIDO", items: [
    "Alrededores libre de objetos de aceites y grasas, material inflamable, etc.",
    "Botellas y válvulas libre de aceites y grasas","Cilindros llenos o vacíos en posición vertical",
    "Botellas claramente marcadas","Botellas vacías señalizadas como tal para su recojo",
    "Botellas protegidas de helada, nieve o luz solar directa","Extintor cercano",
  ].map((n,i)=>({c:`2.${i+1}`,n})) },
];
const fr019 = [
  { titulo: "INSTALACIONES EN GENERAL", items: [
    "Orden y Limpieza","Equipos eléctricos en correctas condiciones",
    "Tomas eléctricas en buen estado, completamente operativos",
    "Cableado y tomas de los aparatos eléctricos no están sobresaturados",
    "Área señalizada como zona de NO FUMAR","Recipientes de basura se vacía con frecuencia",
    "Iluminación suficiente","Ventilación suficiente",
    "Extintores señalizados en un lugar de fácil acceso sin obstrucciones",
    "Los materiales inflamables se encuentran alejados de fuentes de calor","Otros",
  ].map((n,i)=>({c:`1.${i+1}`,n})) },
];
const fr020 = [
  { titulo: "1. ESCALERA DE HOJA Y TELESCÓPICA", items: [
    "Largueros","Peldaños antideslizantes","Lazo o banda ajustable con soporte para poste",
    "Conjunto de soporte y zapata","Tapa riel de extremos de largueros","Mangas protectoras de largueros",
    "Polea","Cuerda y grapa de aluminio","Guía externa","Guía interna",
    "Sistema de sujeción de la escalera a peldaño","Otros",
  ].map((n,i)=>({c:`1.${i+1}`,n})) },
  { titulo: "2. ESCALERA EMBONABLE", items: [
    "Largueros","Peldaños","Separador de poste de aluminio","Zapata de seguridad con suela de goma",
    "Mangas protectoras de largueros","Sistema de embone","Otros",
  ].map((n,i)=>({c:`2.${i+1}`,n})) },
  { titulo: "3. ESCALERA DE TIJERA", items: [
    "Largueros","Peldaños","Bisagra superior de abertura","Seguro (antiabertura) intermedio",
    "Zapata de seguridad con suela de goma","Otros",
  ].map((n,i)=>({c:`3.${i+1}`,n})) },
];
const fr018kit = [
  ["Contenedor (cilindro 55 galones)","1 un."],["Traje impermeable TYVEK","4 un."],
  ["Guantes de nitrilo","4 par."],["Guantes de cuero","4 par."],["Trapo Industrial","14 un."],
  ["Paños absorbentes 3M HP 356","17 un."],["Almohadillas absorbentes T-240","3 un."],
  ["Cordones absorbentes 3M T-8","1 un."],["Guante tipo quirúrgico","4 un."],
  ["Bolsa de polietileno alta densidad c/rojo","8 un."],["Respirador N95 / KN95","4 un."],
  ["Lentes anti impacto","2 un."],["Cinta de señalización color amarillo","20 mts"],
  ["Cinta de señalización color rojo","20 mts"],["Pala (solo para exteriores)","1 un."],
  ["Pico (solo para exteriores)","1 un."],
].map(([n,cantidad],i)=>({c:`${i+1}`,n,cantidad}));

const serItems = (items) => items.map(it =>
  `  { c: ${JSON.stringify(it.c)}, n: ${JSON.stringify(it.n)}${it.cantidad?`, cantidad: ${JSON.stringify(it.cantidad)}`:''} },`).join('\n');

const file = `// ════════════════════════════════════════════════════════════════════
//  INSPECCIONES HGP — LOTE 2 (checklists y matrices)
//  Generado desde los Excel oficiales por _excels_formatos/build_lote2.cjs
//  Se importa y fusiona en inspecciones-hgp.js (PLANTILLAS_HGP, CATALOGO_HGP).
// ════════════════════════════════════════════════════════════════════

// ── FR-016: Inspección a Comedores (secciones · checklist SI/NO/NA) ──
const COMEDOR = {
  codigo: "HGP-SGIII-SST-FR-016", codigoPdf: "HGP-SGIII-SST-FR-016",
  nombre: "Inspección a Comedores", titulo: "INSPECCIÓN A COMEDORES",
  patron: "secciones", rev: "00",
  cabecera: [
    { key: "sede", label: "Nombre de la Sede", type: "text", full: true, default: "Central Hidroeléctrica San Gabán III" },
    { key: "contratista", label: "Contratista", type: "text" },
    { key: "fecha", label: "Fecha", type: "date", required: true },
    { key: "inspector", label: "Inspectores", type: "text", required: true, full: true },
  ],
  calificaciones: ["SI", "NO", "NA"],
  calLabel: "SI/NO/NA",
  columnas: [{ key: "observacion", label: "Observación" }],
  secciones: [
${ser(fr016)}
  ],
  leyendaCalif: "SI: Cumple · NO: No cumple · NA: No aplica",
  recomendacion: "Registrar la observación de cada ítem no conforme.",
  firmas: [{ rol: "Inspector" }, { rol: "Responsable del Comedor" }],
};

// Columnas correctivas compartidas por FR-017 y FR-019 (clasificación A/B/C)
const COLS_ABC = [
  { key: "clasificacion", label: "Clasif.", type: "select", opciones: ["", "A", "B", "C"], width: 60 },
  { key: "accion", label: "Acción Correctiva" },
  { key: "responsable", label: "Responsable", width: 110 },
  { key: "fecha", label: "Fecha de cumplimiento", type: "date", width: 110 },
  { key: "seguimiento", label: "Seguimiento", width: 90 },
];
const CABECERA_INSP = [
  { key: "tipo_inspeccion", label: "Tipo de Inspección (Informal / Planificada)", type: "text" },
  { key: "sede", label: "Sede / Proyecto", type: "text" },
  { key: "area", label: "Lugar de Inspección", type: "text" },
  { key: "fecha", label: "Fecha", type: "date", required: true },
  { key: "inspector", label: "Inspeccionado por", type: "text", required: true, full: true },
  { key: "responsable_area", label: "Responsable del área", type: "text", full: true },
];
const LEYENDA_ABC = "Clasificación — A: Mayor (acción inmediata, máx 24h) · B: Serio (máx 72h) · C: Menor (máx 2 semanas)";

// ── FR-017: Inspección de Almacenes (secciones · SI/NO + A/B/C) ──
const ALMACENES = {
  codigo: "HGP-SGIII-SST-FR-017", codigoPdf: "HGP-SGIII-SST-FR-017",
  nombre: "Inspección de Almacenes", titulo: "INSPECCIÓN DE ALMACENES",
  patron: "secciones", rev: "00",
  cabecera: CABECERA_INSP,
  calificaciones: ["SI", "NO"], calLabel: "SI/NO", columnas: COLS_ABC,
  secciones: [
${ser(fr017)}
  ],
  leyendaCalif: LEYENDA_ABC,
  recomendacion: "En caso de disconformidad, registrar acción correctiva, responsable y plazo.",
  firmas: [{ rol: "Inspeccionado por" }, { rol: "Responsable del área" }],
};

// ── FR-019: Inspección de Oficinas (secciones · SI/NO + A/B/C) ──
const OFICINAS = {
  codigo: "HGP-SGIII-SST-FR-019", codigoPdf: "HGP-SGIII-SST-FR-019",
  nombre: "Inspección de Oficinas", titulo: "INSPECCIÓN DE OFICINAS",
  patron: "secciones", rev: "00",
  cabecera: CABECERA_INSP,
  calificaciones: ["SI", "NO"], calLabel: "SI/NO", columnas: COLS_ABC,
  secciones: [
${ser(fr019)}
  ],
  leyendaCalif: LEYENDA_ABC,
  recomendacion: "En caso de disconformidad, registrar acción correctiva, responsable y plazo.",
  firmas: [{ rol: "Inspeccionado por" }, { rol: "Responsable del área" }],
};

// ── FR-020: Verificación de Escaleras Portátiles (matriz · B/M) ──
const ESCALERAS = {
  codigo: "HGP-SGIII-SST-FR-020", codigoPdf: "HGP-SGIII-SST-FR-020",
  nombre: "Verificación de Escaleras Portátiles", titulo: "LISTA DE VERIFICACIÓN DE ESCALERAS PORTÁTILES",
  patron: "matriz", rev: "00",
  cabecera: [
    { key: "unidad", label: "Unidad Operativa", type: "text" },
    { key: "superintendencia", label: "Superintendencia", type: "text" },
    { key: "fecha", label: "Fecha de inspección", type: "date", required: true },
    { key: "inspector", label: "Inspeccionado por", type: "text", required: true, full: true },
    { key: "supervisor", label: "Revisado por", type: "text", full: true },
  ],
  equipoLabel: "Escalera", equipoCampo: { key: "codigo", label: "Cód." },
  equiposIniciales: 4, equiposMax: 4,
  calificaciones: ["B", "M"],
  grupos: [
${ser(fr020)}
  ],
  leyendaCalif: "Estado — B: Bueno · M: Malo",
  recomendacion: "Retirar de servicio toda escalera con componentes en estado 'M'.",
  firmas: [{ rol: "Inspeccionado por" }, { rol: "Revisado por" }],
};

// ── FR-018: Inspección de Kit Antiderrame (matriz mensual · SI/NO) ──
//  codigo interno con sufijo -KIT para no colisionar con RACS (FR-018).
const KIT_ANTIDERRAME = {
  codigo: "HGP-SGIII-SST-FR-018-KIT", codigoPdf: "HGP-SGIII-SST-FR-018",
  nombre: "Inspección de Kit Antiderrame", titulo: "INSPECCIÓN DE KIT ANTIDERRAME",
  patron: "matriz", rev: "00",
  cabecera: [
    { key: "area", label: "Ubicación", type: "text", required: true, full: true },
    { key: "anio", label: "Año", type: "text" },
    { key: "fecha", label: "Fecha", type: "date", required: true },
    { key: "inspector", label: "Inspector", type: "text", required: true, full: true },
  ],
  // Columnas fijas = meses del año (no se agregan/quitan)
  columnasFijas: ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"],
  // Columna extra descriptiva en cada ítem (solo lectura)
  itemExtra: { key: "cantidad", label: "Cant." },
  calificaciones: ["SI", "NO"],
  items: [
${serItems(fr018kit)}
  ],
  leyendaCalif: "Marcar SI/NO la presencia de cada ítem en el mes correspondiente.",
  recomendacion: "Reponer los ítems faltantes del kit antiderrame.",
  firmas: [{ rol: "Firma del Inspector" }],
};

export const PLANTILLAS_LOTE2 = {
  [COMEDOR.codigo]: COMEDOR,
  [ALMACENES.codigo]: ALMACENES,
  [OFICINAS.codigo]: OFICINAS,
  [ESCALERAS.codigo]: ESCALERAS,
  [KIT_ANTIDERRAME.codigo]: KIT_ANTIDERRAME,
};

export const CATALOGO_LOTE2 = [
  { codigo: COMEDOR.codigo, nombre: COMEDOR.nombre, patron: "secciones", grupo: "Instalaciones", disponible: true },
  { codigo: ALMACENES.codigo, nombre: ALMACENES.nombre, patron: "secciones", grupo: "Instalaciones", disponible: true },
  { codigo: OFICINAS.codigo, nombre: OFICINAS.nombre, patron: "secciones", grupo: "Instalaciones", disponible: true },
  { codigo: ESCALERAS.codigo, nombre: ESCALERAS.nombre, patron: "matriz", grupo: "Equipos", disponible: true },
  { codigo: KIT_ANTIDERRAME.codigo, nombre: KIT_ANTIDERRAME.nombre, patron: "matriz", grupo: "Emergencias", disponible: true },
];
`;

fs.writeFileSync('src/constants/inspecciones-lote2-hgp.js', file);
console.log('Escrito src/constants/inspecciones-lote2-hgp.js');
console.log(`FR-016: ${fr016.length} grupos, ${fr016.reduce((s,x)=>s+x.items.length,0)} items`);
