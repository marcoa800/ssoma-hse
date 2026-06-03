// ════════════════════════════════════════════════════════════════════
//  INSPECCIONES COMINDUSTRIA — LOTE 1 (RE-14, RE-15, RE-16, RE-17, RE-23)
//  Generado por _excels_formatos/build_comind_lote1.cjs
// ════════════════════════════════════════════════════════════════════

// ── RE-14: Inspección del Uso de EPPs (activos — puestos fijos × EPPs) ──
const COMIND_EPP_USO = {
  codigo: "SST-RE-14", codigoPdf: "SST-RE-14",
  nombre: "Inspección del Uso de EPPs", titulo: "INSPECCIÓN DEL USO DE EPPs",
  patron: "activos", rev: "04",
  cabecera: [
    { key: "fecha", label: "Fecha de inspección", type: "date", required: true },
    { key: "hora", label: "Hora", type: "time" },
    { key: "inspector", label: "Inspeccionado por SSOMA", type: "text", required: true, full: true },
    { key: "supervisor", label: "Supervisor del Área", type: "text" },
  ],
  columnasActivo: [
    { key: "area", label: "Área", width: 130 },
    { key: "puesto", label: "Puesto de trabajo", width: 120 },
  ],
  puntos: [
    { key: "p1",  short: "Uniforme", label: "Uniforme de trabajo" },
    { key: "p2",  short: "Calzado",  label: "Calzado de seguridad" },
    { key: "p3",  short: "P. auditivo", label: "Protector auditivo" },
    { key: "p4",  short: "G. multiflex", label: "Guantes multiflex" },
    { key: "p5",  short: "G. badana", label: "Guantes de badana" },
    { key: "p6",  short: "G. soldar", label: "Guantes de soldar carnaza" },
    { key: "p7",  short: "Lentes", label: "Lentes / googles" },
    { key: "p8",  short: "Casco", label: "Casco de seguridad" },
    { key: "p9",  short: "Mandil", label: "Mandil Cuero / PVC" },
    { key: "p10", short: "Respirador", label: "Respirador con filtro" },
    { key: "p11", short: "G. nitrilo", label: "Guantes de Nitrilo / Jebe" },
    { key: "p12", short: "Careta", label: "Careta de Soldador / Esmerilar" },
  ],
  observacionPorFila: { key: "trabajador", label: "Trabajador observado" },
  leyendaCalif: "C: Usando correctamente · NC: No usa o uso incorrecto · NA: No aplica",
  recomendacion: "Al observador que no usa el EPP, hacérselo presente de inmediato.",
  firmas: [{ rol: "Inspeccionado por SSOMA" }, { rol: "Supervisor del Área" }, { rol: "CSST" }],
  filasIniciales: 20,
};

// ── RE-15: Inspección de Extintores Portátiles (activos — lista precargada) ──
const COMIND_EXTINTORES = {
  codigo: "SST-RE-15", codigoPdf: "SST-RE-15",
  nombre: "Inspección de Extintores Portátiles", titulo: "INSPECCIÓN DE LOS EXTINTORES PORTÁTILES",
  patron: "activos", rev: "03",
  cabecera: [
    { key: "fecha", label: "Fecha de inspección", type: "date", required: true },
    { key: "inspector", label: "Inspeccionado por", type: "text", required: true, full: true },
  ],
  columnasActivo: [
    { key: "ubicacion", label: "Ubicación", width: 160 },
    { key: "tipo", label: "Tipo", width: 50 },
    { key: "capacidad", label: "Capacidad", width: 60 },
    { key: "fecha_recarga", label: "F. próx. recarga", width: 80, type: "month" },
  ],
  puntos: [
    { key: "p1", short: "Precinto", label: "Precinto de seguridad" },
    { key: "p2", short: "Manómetro", label: "Manómetro / presión" },
    { key: "p3", short: "Manguera", label: "Manguera" },
    { key: "p4", short: "Cilindro", label: "Cilindro" },
    { key: "p5", short: "Pictograma", label: "Pictogramas / Tarjeta" },
    { key: "p6", short: "Soporte", label: "Soporte / colgador" },
    { key: "p7", short: "Señaliz.", label: "Señalización" },
    { key: "p8", short: "Acceso", label: "Acceso libre" },
    { key: "p9", short: "Operativo", label: "Operatividad (SI/NO)" },
  ],
  observacionPorFila: { key: "obs", label: "Observación" },
  leyendaCalif: "C: Conforme · NC: No Conforme · NA: No aplica · N.T.: No tiene",
  recomendacion: "Programar recarga o mantenimiento de todo extintor con NC.",
  firmas: [{ rol: "Inspeccionado por" }],
  filasIniciales: 0,
  filasPreset: [
    { item:1,  ubicacion:"Ingreso SS.HH.", tipo:"PQS", capacidad:"10 Lb", fecha_recarga:"" },
    { item:2,  ubicacion:"Comedor 3er nivel", tipo:"PQS", capacidad:"20 Lb", fecha_recarga:"" },
    { item:3,  ubicacion:"Open Office 1er piso", tipo:"PQS", capacidad:"10 Lb", fecha_recarga:"" },
    { item:4,  ubicacion:"Almacén MP. Salida de emerg. 1", tipo:"PQS", capacidad:"20 Lb", fecha_recarga:"" },
    { item:5,  ubicacion:"Almacén MP. Salida de emerg. 2", tipo:"PQS", capacidad:"20 Lb", fecha_recarga:"" },
    { item:6,  ubicacion:"Ingreso almacén MP.", tipo:"PQS", capacidad:"20 Lb", fecha_recarga:"" },
    { item:7,  ubicacion:"Ingreso almacén PT.", tipo:"PQS", capacidad:"20 Lb", fecha_recarga:"" },
    { item:8,  ubicacion:"Almacén PT. Puerta de emerg. 1", tipo:"PQS", capacidad:"20 Lb", fecha_recarga:"" },
    { item:9,  ubicacion:"Almacén PT. Puerta enrollable", tipo:"PQS", capacidad:"20 Lb", fecha_recarga:"" },
    { item:10, ubicacion:"Almacén PT. Puerta de emerg. 2", tipo:"PQS", capacidad:"20 Lb", fecha_recarga:"" },
    { item:11, ubicacion:"Barmag", tipo:"PQS", capacidad:"20 Lb", fecha_recarga:"" },
    { item:12, ubicacion:"Cuarto de tableros", tipo:"PQS", capacidad:"20 Lb", fecha_recarga:"" },
    { item:13, ubicacion:"Sub Estación eléctrica", tipo:"Co2", capacidad:"20 Lb", fecha_recarga:"" },
    { item:14, ubicacion:"Horno SM", tipo:"PQS", capacidad:"20 Lb", fecha_recarga:"" },
    { item:15, ubicacion:"Horno Hunter", tipo:"PQS", capacidad:"20 Lb", fecha_recarga:"" },
    { item:16, ubicacion:"Horno Novoflor", tipo:"PQS", capacidad:"20 Lb", fecha_recarga:"" },
    { item:17, ubicacion:"Línea Dilo", tipo:"PQS", capacidad:"20 Lb", fecha_recarga:"" },
    { item:18, ubicacion:"Tableros Línea Dilo", tipo:"Co2", capacidad:"20 Lb", fecha_recarga:"" },
    { item:19, ubicacion:"Carda Línea Dilo", tipo:"PQS", capacidad:"20 Lb", fecha_recarga:"" },
    { item:20, ubicacion:"Box Línea Dilo", tipo:"PQS", capacidad:"20 Lb", fecha_recarga:"" },
    { item:21, ubicacion:"Bombi 4.5", tipo:"Co2", capacidad:"20 Lb", fecha_recarga:"" },
    { item:22, ubicacion:"Salida Línea Blanca", tipo:"PQS", capacidad:"20 Lb", fecha_recarga:"" },
    { item:23, ubicacion:"Entrada Línea Blanca", tipo:"PQS", capacidad:"20 Lb", fecha_recarga:"" },
    { item:24, ubicacion:"Taller de mantenimiento", tipo:"PQS", capacidad:"20 Lb", fecha_recarga:"" },
    { item:25, ubicacion:"Servidor 2do piso", tipo:"Co2", capacidad:"10 Lb", fecha_recarga:"" },
    { item:26, ubicacion:"Zona administrativa 2do piso", tipo:"PQS", capacidad:"10 Lb", fecha_recarga:"" },
    { item:27, ubicacion:"Almacén de repuestos", tipo:"Co2", capacidad:"10 Lb", fecha_recarga:"" },
    { item:28, ubicacion:"Ingreso almacén de repuestos", tipo:"PQS", capacidad:"20 Lb", fecha_recarga:"" },
    { item:29, ubicacion:"2do piso Oficina de Producción/Isla", tipo:"PQS", capacidad:"10 Lb", fecha_recarga:"" },
    { item:30, ubicacion:"Tableros 2nivel Sub eléctrica", tipo:"Co2", capacidad:"10 Lb", fecha_recarga:"" },
    { item:31, ubicacion:"Zona admin. 3er nivel Tablero 1", tipo:"Co2", capacidad:"10 Lb", fecha_recarga:"" },
    { item:32, ubicacion:"Zona admin. 3er nivel Tablero 2", tipo:"Co2", capacidad:"10 Lb", fecha_recarga:"" },
    { item:33, ubicacion:"Tableros elec. 3er nivel prod.", tipo:"Co2", capacidad:"10 Lb", fecha_recarga:"" },
    { item:34, ubicacion:"Cuarto de bombas / Sótano", tipo:"PQS", capacidad:"25 Lb", fecha_recarga:"" },
    { item:35, ubicacion:"Comedor 1er piso entrada", tipo:"PQS", capacidad:"10 Lb", fecha_recarga:"" },
    { item:36, ubicacion:"Comedor 1er nivel", tipo:"K", capacidad:"2.5 GL", fecha_recarga:"" },
    { item:37, ubicacion:"Comedor 2do nivel", tipo:"PQS", capacidad:"10 Lb", fecha_recarga:"" },
    { item:38, ubicacion:"Extintor de repuesto", tipo:"PQS", capacidad:"20 Lb", fecha_recarga:"" },
    { item:39, ubicacion:"Sub estación de Gas", tipo:"PQS", capacidad:"12 kg", fecha_recarga:"" },
    { item:40, ubicacion:"Montacarga Hyundai", tipo:"PQS", capacidad:"2 kg", fecha_recarga:"" },
  ].map(f => ({ ...f, p1:"",p2:"",p3:"",p4:"",p5:"",p6:"",p7:"",p8:"",p9:"",obs:"" })),
};

// ── RE-16: Inspección de Equipos de Emergencias (activos — items fijos) ──
const COMIND_EMERGENCIAS = {
  codigo: "SST-RE-16", codigoPdf: "SST-RE-16",
  nombre: "Inspección de Equipos de Emergencias", titulo: "INSPECCIÓN DE EQUIPOS DE EMERGENCIAS",
  patron: "activos", rev: "00",
  cabecera: [
    { key: "equipo", label: "Nombre del Equipo", type: "text" },
    { key: "fecha", label: "Fecha de inspección", type: "date", required: true },
    { key: "inspector", label: "Inspeccionado por", type: "text", required: true, full: true },
  ],
  columnasActivo: [
    { key: "equipo", label: "Ubicación del equipo de emergencia", width: 220 },
  ],
  puntos: [
    { key: "p1", short: "Señaliz.", label: "Señalización" },
    { key: "p2", short: "Acceso", label: "Acceso libre" },
    { key: "p3", short: "Pictograma", label: "Pictograma" },
    { key: "p4", short: "Operativo", label: "Operatividad" },
  ],
  observacionPorFila: { key: "obs", label: "Observaciones" },
  leyendaCalif: "C: Conforme · NC: No Conforme · NA: No aplica",
  recomendacion: "Corregir toda no conformidad antes de la próxima inspección.",
  firmas: [{ rol: "Inspeccionado por" }],
  filasIniciales: 0,
  filasPreset: [
    "Extintores Portátiles","Sala de bombas de agua contra incendio",
    "Gabinetes de agua contra incendio","Pulsadores de Alarma / estación manual",
    "Detector de humo, de temperatura y Fotobeam","Luces de emergencia",
    "Camilla de emergencias","Botiquín","Pozos a tierra","Salidas"
  ].map((e, i) => ({ item: i+1, equipo: e, p1:"",p2:"",p3:"",p4:"",obs:"" })),
};

// ── RE-17: Inspección de Botiquines (activos — insumos con stock) ──
const COMIND_BOTIQUINES = {
  codigo: "SST-RE-17", codigoPdf: "SST-RE-17",
  nombre: "Inspección de Botiquines", titulo: "INSPECCIÓN DE BOTIQUINES",
  patron: "activos", rev: "00",
  cabecera: [
    { key: "area", label: "Botiquín / Área", type: "text", required: true,
      placeholder: "Ej: Administrativo-Bot 1, Producción-Bot 2, Garita-Bot 3, Maletín" },
    { key: "fecha", label: "Fecha", type: "date", required: true },
    { key: "inspector", label: "Responsable de verificación", type: "text", required: true, full: true },
  ],
  columnasActivo: [
    { key: "descripcion", label: "Descripción del elemento", width: 200 },
    { key: "fecha_venc", label: "F. Caducidad", width: 80, type: "month" },
    { key: "stock", label: "Stock actual", width: 70 },
    { key: "por_reponer", label: "Por reponer", width: 70 },
    { key: "cant_min", label: "Cant. mín.", width: 60 },
  ],
  puntos: [
    { key: "estado", short: "Estado", label: "Estado (✓ Tiene / × No tiene / NA)" },
  ],
  observacionPorFila: { key: "obs", label: "Obs." },
  leyendaCalif: "C (✓): Tiene / Conforme · NC (×): No tiene / No conforme · NA: No aplica",
  recomendacion: "Reponer los insumos faltantes o vencidos.",
  firmas: [{ rol: "Responsable de verificación" }],
  filasIniciales: 0,
  filasPreset: [
  {
    "item": 1,
    "descripcion": "Agua oxigenada fco x 120 ml",
    "fecha_venc": "",
    "stock": "",
    "por_reponer": "",
    "cant_min": "1",
    "estado": "",
    "obs": ""
  },
  {
    "item": 2,
    "descripcion": "Alcohol medicinal 70° fco x 120 ml",
    "fecha_venc": "",
    "stock": "",
    "por_reponer": "",
    "cant_min": "1",
    "estado": "",
    "obs": ""
  },
  {
    "item": 3,
    "descripcion": "Alcohol yodado 120 ml",
    "fecha_venc": "",
    "stock": "",
    "por_reponer": "",
    "cant_min": "1",
    "estado": "",
    "obs": ""
  },
  {
    "item": 4,
    "descripcion": "Apósito mediano esterilizado 10 x 20 cm",
    "fecha_venc": "",
    "stock": "",
    "por_reponer": "",
    "cant_min": "1",
    "estado": "",
    "obs": ""
  },
  {
    "item": 5,
    "descripcion": "Bandas adhesivas (curitas)",
    "fecha_venc": "",
    "stock": "",
    "por_reponer": "",
    "cant_min": "1",
    "estado": "",
    "obs": ""
  },
  {
    "item": 6,
    "descripcion": "Colirio Eyemo 0.05% Solucion oftálmica",
    "fecha_venc": "",
    "stock": "",
    "por_reponer": "",
    "cant_min": "1",
    "estado": "",
    "obs": ""
  },
  {
    "item": 7,
    "descripcion": "Guantes quirurgicos esterilizados talla 7 1/2 (par)",
    "fecha_venc": "",
    "stock": "",
    "por_reponer": "",
    "cant_min": "1",
    "estado": "",
    "obs": ""
  },
  {
    "item": 8,
    "descripcion": "Cloruro de sodio 0.9% x 100 ml",
    "fecha_venc": "",
    "stock": "",
    "por_reponer": "",
    "cant_min": "1",
    "estado": "",
    "obs": ""
  },
  {
    "item": 9,
    "descripcion": "Paletas baja lengua (para entablillado de dedos)",
    "fecha_venc": "",
    "stock": "",
    "por_reponer": "",
    "cant_min": "1",
    "estado": "",
    "obs": ""
  },
  {
    "item": 10,
    "descripcion": "Paquete de algodón x 25 gr",
    "fecha_venc": "",
    "stock": "",
    "por_reponer": "",
    "cant_min": "1",
    "estado": "",
    "obs": ""
  },
  {
    "item": 11,
    "descripcion": "Paquetes de gasas esterilizadas de 7.5 cm x 7.5 cm",
    "fecha_venc": "",
    "stock": "",
    "por_reponer": "",
    "cant_min": "1",
    "estado": "",
    "obs": ""
  },
  {
    "item": 12,
    "descripcion": "Paquetes de gasas tipo jelonet (para quemaduras)",
    "fecha_venc": "",
    "stock": "",
    "por_reponer": "",
    "cant_min": "1",
    "estado": "",
    "obs": ""
  },
  {
    "item": 13,
    "descripcion": "Rollo de esparadrapo 5cm x 4.5 mt",
    "fecha_venc": "",
    "stock": "",
    "por_reponer": "",
    "cant_min": "1",
    "estado": "",
    "obs": ""
  },
  {
    "item": 14,
    "descripcion": "Venda elástica 2pulg. X 5 yardas",
    "fecha_venc": "",
    "stock": "",
    "por_reponer": "",
    "cant_min": "1",
    "estado": "",
    "obs": ""
  },
  {
    "item": 15,
    "descripcion": "Venda elástica 8pulg. X 5 yardas",
    "fecha_venc": "",
    "stock": "",
    "por_reponer": "",
    "cant_min": "1",
    "estado": "",
    "obs": ""
  },
  {
    "item": 16,
    "descripcion": "Venda elástica 5pulg. X 5 yardas",
    "fecha_venc": "",
    "stock": "",
    "por_reponer": "",
    "cant_min": "1",
    "estado": "",
    "obs": ""
  },
  {
    "item": 17,
    "descripcion": "Yodo povidona 10% (solución) fco x 60 ml",
    "fecha_venc": "",
    "stock": "",
    "por_reponer": "",
    "cant_min": "1",
    "estado": "",
    "obs": ""
  },
  {
    "item": 18,
    "descripcion": "Steri - Strip 6mm x 100 mm",
    "fecha_venc": "",
    "stock": "",
    "por_reponer": "",
    "cant_min": "1",
    "estado": "",
    "obs": ""
  }
],
};

// ── RE-23: Inspección del Arnés de Seguridad (matriz — semanas fijas) ──
const COMIND_ARNES = {
  codigo: "SST-RE-23", codigoPdf: "SST-RE-23",
  nombre: "Inspección del Arnés de Seguridad y Línea de Vida",
  titulo: "INSPECCIÓN DEL ARNÉS DE SEGURIDAD Y LÍNEA DE VIDA",
  patron: "matriz", rev: "03",
  cabecera: [
    { key: "trabajo_altura", label: "Trabajo en altura de", type: "text" },
    { key: "num_pet", label: "N° PET", type: "text" },
    { key: "usuario", label: "Nombre del usuario del arnés", type: "text", required: true, full: true },
    { key: "fecha", label: "Fecha", type: "date", required: true },
    { key: "num_arnes", label: "N° del Arnés", type: "text" },
    { key: "num_eslinga", label: "N° de Eslinga", type: "text" },
    { key: "inspector", label: "Inspeccionado por", type: "text", required: true, full: true },
  ],
  columnasFijas: ["Semana 1", "Semana 2", "Semana 3", "Semana 4"],
  calificaciones: ["✓", "X"],
  grupos: [
    { titulo: "1. ARNÉS DE SEGURIDAD", items: [
      { c: "1.1", n: "Anillo en D (ubicado en la espalda)" },
      { c: "1.2", n: "Correas para el tronco - hombro" },
      { c: "1.3", n: "Correas para las piernas" },
      { c: "1.4", n: "Costuras" },
      { c: "1.5", n: "Hebillas de ajustes" },
    ]},
    { titulo: "2. ESLINGA O COLA DE SEGURIDAD", items: [
      { c: "2.1", n: "Gancho principal de anclaje al arnés" },
      { c: "2.2", n: "Gancho derecho de cierre y bloqueo automático" },
      { c: "2.3", n: "Gancho izquierdo de cierre y bloqueo automático" },
      { c: "2.4", n: "Amortiguador de impacto" },
      { c: "2.5", n: "Cola o eslinga (doble)" },
      { c: "2.6", n: "Costuras" },
    ]},
  ],
  leyendaCalif: "✓: Bien · X: Mal. Si el arnés o línea de vida está en mal estado, NO debe usarse.",
  recomendacion: "Arnés con X en cualquier ítem: retirar de servicio inmediatamente.",
  firmas: [{ rol: "Firma SSOMA" }],
};

export const PLANTILLAS_COMIND_LOTE1 = {
  [COMIND_EPP_USO.codigo]:    COMIND_EPP_USO,
  [COMIND_EXTINTORES.codigo]: COMIND_EXTINTORES,
  [COMIND_EMERGENCIAS.codigo]:COMIND_EMERGENCIAS,
  [COMIND_BOTIQUINES.codigo]: COMIND_BOTIQUINES,
  [COMIND_ARNES.codigo]:      COMIND_ARNES,
};

export const CATALOGO_COMIND_LOTE1 = [
  { codigo: COMIND_EXTINTORES.codigo, nombre: COMIND_EXTINTORES.nombre, patron: "activos",   grupo: "Emergencias",   disponible: true },
  { codigo: COMIND_EMERGENCIAS.codigo,nombre: COMIND_EMERGENCIAS.nombre,patron: "activos",   grupo: "Emergencias",   disponible: true },
  { codigo: COMIND_BOTIQUINES.codigo, nombre: COMIND_BOTIQUINES.nombre, patron: "activos",   grupo: "Emergencias",   disponible: true },
  { codigo: COMIND_EPP_USO.codigo,    nombre: COMIND_EPP_USO.nombre,   patron: "activos",   grupo: "EPP",           disponible: true },
  { codigo: COMIND_ARNES.codigo,      nombre: COMIND_ARNES.nombre,     patron: "matriz",    grupo: "EPP",           disponible: true },
];
