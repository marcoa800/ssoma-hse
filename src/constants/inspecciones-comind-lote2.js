// ════════════════════════════════════════════════════════════════════
//  INSPECCIONES COMINDUSTRIA — LOTE 2 (RE-26, RE-27, RE-51, RE-52, RE-58)
// ════════════════════════════════════════════════════════════════════

// ── RE-26: Inspección de Señaléticas de Seguridad (activos — preset) ──
const COMIND_SENALETICAS = {
  codigo: "SST-RE-26", codigoPdf: "SST-RE-26",
  nombre: "Inspección de Señaléticas de Seguridad",
  titulo: "INSPECCIÓN DE SEÑALÉTICAS DE SEGURIDAD",
  patron: "activos", rev: "00",
  cabecera: [
    { key: "fecha", label: "Fecha de inspección", type: "date", required: true },
    { key: "inspector", label: "Inspeccionado por", type: "text", required: true, full: true },
  ],
  columnasActivo: [
    { key: "tipo", label: "Tipo de señalética", width: 200 },
    { key: "cantidad", label: "Cantidad", width: 55 },
  ],
  puntos: [
    { key: "p1", short: "Visible",   label: "Ubicación visible" },
    { key: "p2", short: "Limpia",    label: "Señalética limpia" },
    { key: "p3", short: "Color",     label: "Color conservado" },
    { key: "p4", short: "Adherida",  label: "Adherido / pegado" },
  ],
  observacionPorFila: { key: "obs", label: "Observación" },
  leyendaCalif: "C: Conforme · NC: No Conforme · NA: No aplica",
  recomendacion: "Reponer o reparar toda señalética no conforme.",
  firmas: [{ rol: "Inspeccionado por" }],
  filasIniciales: 0,
  filasPreset: [
    // Señales de evacuación
    { item:1, tipo:"Salidas", cantidad:"8", p1:"",p2:"",p3:"",p4:"",obs:"" },
    { item:2, tipo:"Punto de reunión", cantidad:"2", p1:"",p2:"",p3:"",p4:"",obs:"" },
    { item:3, tipo:'Circulo amarillo "S"', cantidad:"3", p1:"",p2:"",p3:"",p4:"",obs:"" },
    // Advertencia de riesgos
    { item:4, tipo:"Riesgo en tableros eléctricos", cantidad:"17", p1:"",p2:"",p3:"",p4:"",obs:"" },
    { item:5, tipo:"Riesgo de tránsito de montacargas", cantidad:"8", p1:"",p2:"",p3:"",p4:"",obs:"" },
    { item:6, tipo:"Riesgo de lesión en las manos en máquinas", cantidad:"10", p1:"",p2:"",p3:"",p4:"",obs:"" },
    // Uso de EPPs
    { item:7, tipo:"Uso de protección respiratoria", cantidad:"4", p1:"",p2:"",p3:"",p4:"",obs:"" },
    { item:8, tipo:"Uso de protección auditiva", cantidad:"6", p1:"",p2:"",p3:"",p4:"",obs:"" },
    // Restricción
    { item:9,  tipo:"Prohibido el ingreso a la sub estación elec.", cantidad:"1", p1:"",p2:"",p3:"",p4:"",obs:"" },
    { item:10, tipo:"Prohibido fumar", cantidad:"4", p1:"",p2:"",p3:"",p4:"",obs:"" },
    // Otros
    { item:11, tipo:"Ubicación de pozos a tierra", cantidad:"9", p1:"",p2:"",p3:"",p4:"",obs:"" },
  ],
};

// ── RE-27: Pre-uso Montacargas (matriz turno Mañana/Noche · B/M) ──
const COMIND_MONTACARGAS = {
  codigo: "SST-RE-27", codigoPdf: "SST-RE-27",
  nombre: "Pre-uso de Montacargas", titulo: "FORMATO PARA REVISIÓN DE PRE-USO DE MONTACARGAS",
  patron: "matriz", rev: "02",
  cabecera: [
    { key: "fecha",    label: "Fecha",              type: "date",  required: true },
    { key: "montacarga", label: "Montacarga",        type: "text",  default: "Toyota / Hyundai" },
    { key: "operador_m", label: "Operador Mañana",   type: "text" },
    { key: "operador_n", label: "Operador Noche",    type: "text" },
    { key: "horometro_ini_m", label: "Horómetro inicial M", type: "text" },
    { key: "horometro_fin_m", label: "Horómetro final M",   type: "text" },
    { key: "horometro_ini_n", label: "Horómetro inicial N", type: "text" },
    { key: "horometro_fin_n", label: "Horómetro final N",   type: "text" },
    { key: "inspector", label: "Encargado / Supervisor VB°", type: "text", required: true, full: true },
  ],
  columnasFijas: ["Mañana", "Noche"],
  calificaciones: ["B", "M"],
  grupos: [
    { titulo: "MOTOR — Niveles", items: [
      { c:"M1", n:"Nivel de Aceite motor" },
      { c:"M2", n:"Nivel de refrigerante" },
      { c:"M3", n:"Aceite Hidráulico" },
      { c:"M4", n:"Aceite de Caja" },
      { c:"M5", n:"Líquido de Frenos" },
      { c:"M6", n:"Aceite de Corona" },
    ]},
    { titulo: "SEGURIDAD", items: [
      { c:"S1", n:"Claxón" },
      { c:"S2", n:"Alarma de Retroceso" },
      { c:"S3", n:"Luces delanteras" },
      { c:"S4", n:"Luces traseras (retroceso)" },
      { c:"S5", n:"Luces traseras (stop)" },
      { c:"S6", n:"Extintor" },
      { c:"S7", n:"Circulina" },
      { c:"S8", n:"Cinturón de seguridad" },
    ]},
    { titulo: "SISTEMA DE TRANSMISIÓN", items: [
      { c:"T1", n:"Mangueras" },
      { c:"T2", n:"Mecanismo de Elevación" },
      { c:"T3", n:"Mecanismo de Inclinación" },
    ]},
    { titulo: "SISTEMAS DE FRENOS", items: [
      { c:"F1", n:"Freno de Mano" },
      { c:"F2", n:"Freno de Servicio" },
    ]},
    { titulo: "SISTEMA ELÉCTRICO", items: [
      { c:"E1", n:"Tablero de Control" },
    ]},
    { titulo: "OTROS", items: [
      { c:"O1", n:"Dirección (Crítico)" },
      { c:"O2", n:"Carrocería (estado y limpieza)" },
      { c:"O3", n:"Llantas (estado)" },
      { c:"O4", n:"Espejos" },
      { c:"O5", n:"Accesorios" },
    ]},
  ],
  leyendaCalif: "B: Buen estado / Operativo · M: Mal estado / Inoperativo",
  recomendacion: "Todo ítem con M debe notificarse inmediatamente a mantenimiento.",
  firmas: [{ rol: "Encargado/Supervisor VB° Mañana" }, { rol: "Coordinador SSOMA" }],
};

// ── RE-51: Registro de Inspección de Casilleros (activos — filas libres) ──
const COMIND_CASILLEROS = {
  codigo: "SST-RE-51", codigoPdf: "SST-RE-51",
  nombre: "Registro de Inspección de Casilleros",
  titulo: "REGISTRO DE INSPECCIÓN DE CASILLEROS",
  patron: "activos", rev: "00",
  cabecera: [
    { key: "fecha", label: "Fecha de inspección", type: "date", required: true },
    { key: "inspector", label: "Inspeccionado por", type: "text", required: true, full: true },
  ],
  columnasActivo: [
    { key: "trabajador", label: "Apellidos y Nombres del Trabajador", width: 200 },
    { key: "hora_inicio", label: "Hora de inicio", width: 80, type: "time" },
    { key: "hora_fin", label: "Hora de término", width: 80, type: "time" },
  ],
  puntos: [
    { key: "estado", short: "Estado", label: "Estado del casillero" },
  ],
  observacionPorFila: { key: "obs", label: "Observaciones" },
  leyendaCalif: "C: Conforme · NC: No Conforme · NA: No aplica",
  recomendacion: "Registrar toda observación encontrada durante la inspección.",
  firmas: [{ rol: "Inspeccionado por" }],
  filasIniciales: 20,
};

// ── RE-52: Inspección de Herramientas (activos — filas libres B/R/M) ──
const COMIND_HERRAMIENTAS = {
  codigo: "SST-RE-52", codigoPdf: "SST-RE-52",
  nombre: "Inspección de Herramientas", titulo: "INSPECCIÓN DE HERRAMIENTAS",
  patron: "secciones", rev: "00",
  cabecera: [
    { key: "lugar", label: "Lugar de inspección", type: "text" },
    { key: "area", label: "Área", type: "text" },
    { key: "fecha", label: "Fecha", type: "date", required: true },
    { key: "inspector", label: "Inspeccionado por", type: "text", required: true, full: true },
  ],
  calificaciones: ["B", "R", "M"],
  calLabel: "Estado",
  columnas: [
    { key: "cantidad", label: "Cantidad" },
    { key: "observacion", label: "Observaciones" },
  ],
  secciones: [
    { titulo: "Herramientas", items: Array.from({length:20},(_,i)=>({ c: String(i+1), n: "" })) },
  ],
  leyendaCalif: "B: Buen estado · R: Regular · M: Mal estado (retirar de servicio)",
  recomendacion: "Retirar inmediatamente toda herramienta en estado M.",
  firmas: [{ rol: "Inspeccionado por" }, { rol: "Supervisor Responsable" }],
};

// ── RE-58: Inspección de Comedor / Cocina (secciones · B/R/M/NA) ──
const COMIND_COMEDOR = {
  codigo: "SST-RE-58", codigoPdf: "SST-RE-58",
  nombre: "Inspección de Comedor y Cocina", titulo: "INSPECCIÓN DE COMEDOR / COCINA",
  patron: "secciones", rev: "00",
  cabecera: [
    { key: "num_ins", label: "N° de inspección", type: "text" },
    { key: "sede", label: "Sede", type: "text" },
    { key: "fecha", label: "Fecha", type: "date", required: true },
    { key: "hora", label: "Hora", type: "time" },
    { key: "inspector", label: "Inspeccionado por", type: "text", required: true, full: true },
  ],
  calificaciones: ["B", "R", "M", "NA"],
  calLabel: "B/R/M",
  columnas: [{ key: "observacion", label: "Observaciones" }],
  secciones: [
    { titulo: "1. CONDICIONES GENERALES", items: [
      { c:"1.1", n:"Mesas y sillas en buen estado" },
      { c:"1.2", n:"Limpieza de paredes, piso y ventanas" },
      { c:"1.3", n:"Las mesas de trabajo son de acero inoxidable o material semejante" },
      { c:"1.4", n:"El menaje e utensilios se encuentran en buen estado" },
      { c:"1.5", n:"Iluminación y ventilación adecuada" },
    ]},
    { titulo: "2. CONDICIONES DE ORDEN Y LIMPIEZA", items: [
      { c:"2.1", n:"El área de atención al cliente" },
      { c:"2.2", n:"El área de almacenamiento de insumos" },
      { c:"2.3", n:"El área de manipulación de alimento" },
      { c:"2.4", n:"Contenedores de residuo con tapa y bolsa" },
      { c:"2.5", n:"Interior de refrigerador / conservadora" },
      { c:"2.6", n:"Interior y exterior de campana extractora" },
      { c:"2.7", n:"Cocina y electrodomésticos" },
    ]},
    { titulo: "3. INSUMOS", items: [
      { c:"3.1", n:"Los insumos no se encuentran en contacto con el suelo" },
      { c:"3.2", n:"Los insumos en buen estado, con fecha de vencimiento vigente" },
      { c:"3.3", n:"Los insumos de las alacenas se encuentran envasados y/o sellados" },
      { c:"3.4", n:"Los insumos en el refrigerador/conservadora se encuentran envasados y/o sellados" },
    ]},
    { titulo: "4. EQUIPOS DE PROTECCIÓN PERSONAL / PRESENTACIÓN", items: [
      { c:"4.1", n:"Se utiliza toca o gorro de cabello" },
      { c:"4.2", n:"Se utiliza guantes de látex" },
      { c:"4.3", n:"Se utiliza delantal" },
      { c:"4.4", n:"Se utiliza mascarilla" },
      { c:"4.5", n:"Se utiliza calzado antideslizante" },
      { c:"4.6", n:"Manos limpias y uñas cortas, ausencia de joyas y relojes" },
      { c:"4.7", n:"Ausencia de heridas en mano y brazo" },
    ]},
    { titulo: "5. RESPUESTA ANTE EMERGENCIA", items: [
      { c:"5.1", n:"Presencia y ubicación de extintores" },
      { c:"5.2", n:"Inspección de extintor PQS y Acetato de K" },
      { c:"5.3", n:"El personal ha identificado sus salidas de emergencia más cercanas" },
      { c:"5.4", n:"Se cuenta con señalizaciones en los ambientes de cocina/comedor" },
      { c:"5.5", n:"Las instalaciones eléctricas se encuentran en buen estado" },
      { c:"5.6", n:"Los productos y sustancias para limpieza se encuentran almacenados correctamente" },
    ]},
    { titulo: "6. DOCUMENTACIÓN", items: [
      { c:"6.1", n:"El personal cuenta con carnet de sanidad vigente" },
      { c:"6.2", n:"Informe sobre reporte de saneamiento ambiental" },
    ]},
  ],
  leyendaCalif: "B: Bueno · R: Regular · M: Malo · NA: No aplica",
  recomendacion: "Registrar medidas correctivas para cada ítem observado en R o M.",
  firmas: [{ rol: "Inspeccionado por" }, { rol: "Supervisión" }],
};

export const PLANTILLAS_COMIND_LOTE2 = {
  [COMIND_SENALETICAS.codigo]:  COMIND_SENALETICAS,
  [COMIND_MONTACARGAS.codigo]:  COMIND_MONTACARGAS,
  [COMIND_CASILLEROS.codigo]:   COMIND_CASILLEROS,
  [COMIND_HERRAMIENTAS.codigo]: COMIND_HERRAMIENTAS,
  [COMIND_COMEDOR.codigo]:      COMIND_COMEDOR,
};

export const CATALOGO_COMIND_LOTE2 = [
  { codigo: COMIND_SENALETICAS.codigo,  nombre: COMIND_SENALETICAS.nombre,  patron: "activos",   grupo: "Instalaciones", disponible: true },
  { codigo: COMIND_COMEDOR.codigo,      nombre: COMIND_COMEDOR.nombre,      patron: "secciones", grupo: "Instalaciones", disponible: true },
  { codigo: COMIND_MONTACARGAS.codigo,  nombre: COMIND_MONTACARGAS.nombre,  patron: "matriz",    grupo: "Vehículos",     disponible: true },
  { codigo: COMIND_CASILLEROS.codigo,   nombre: COMIND_CASILLEROS.nombre,   patron: "activos",   grupo: "Instalaciones", disponible: true },
  { codigo: COMIND_HERRAMIENTAS.codigo, nombre: COMIND_HERRAMIENTAS.nombre, patron: "secciones", grupo: "Equipos",       disponible: true },
];
