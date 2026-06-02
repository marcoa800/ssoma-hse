// ════════════════════════════════════════════════════════════════════
//  PLANTILLAS DE INSPECCIÓN — HYDRO GLOBAL PERÚ SAC
//  Central Hidroeléctrica San Gabán III
//
//  Motor template-driven: cada formato oficial (FR-0XX) se define una vez
//  aquí como objeto de configuración. El motor (InspeccionesHGP.jsx) lo
//  renderiza, guarda en Supabase y genera el PDF replicando el formato.
//
//  PATRONES:
//   - "activos"  → tabla de activos (filas) × puntos de verificación (cols)
//                  Ej: Extintores, Botiquines, Luces de emergencia
//   - "secciones"→ ítems agrupados por categoría con calificación + acción
//                  Ej: Vehículos, Herramientas, Oficinas
//   - "evento"   → un formulario por evento (RACS, Incidentes)
// ════════════════════════════════════════════════════════════════════

import { PLANTILLAS_LOTE2, CATALOGO_LOTE2 } from './inspecciones-lote2-hgp.js';

export const EMPRESA_HGP = {
  nombre: "HYDRO GLOBAL PERÚ SAC",
  proyecto: "CENTRAL HIDROELÉCTRICA SAN GABÁN III",
  logo: "/logo.jpg",
};

// Calificaciones estándar para celdas de verificación
export const CALIF = {
  C: { label: "C", desc: "Conforme", color: "green" },
  NC: { label: "NC", desc: "No Conforme", color: "red" },
  NA: { label: "NA", desc: "No aplica", color: "gray" },
  NT: { label: "N.T.", desc: "No tiene", color: "amber" },
};
export const CALIF_OPCIONES = ["C", "NC", "NA", "N.T."];

// Calificación para el patrón "secciones" (B/R/M) y estatus (P/S)
export const CALIF_SECCIONES = ["B", "R", "M"];
export const CALIF_SEC_INFO = {
  B: { desc: "Bueno", color: "green" },
  R: { desc: "Regular", color: "amber" },
  M: { desc: "Malo", color: "red" },
};
export const ESTATUS_SECCIONES = ["", "P", "S"];
export const ESTATUS_INFO = { P: { desc: "Pendiente", color: "amber" }, S: { desc: "Solucionado", color: "green" } };

// ── PLANTILLA: Check List Mensual de Extintores (Patrón A) ──
const EXTINTORES = {
  codigo: "HGP-SGIII-SIG-FR-006",
  codigoPdf: "HGP-SGIII-SST-FR-009", // tal cual aparece en el encabezado del Excel
  nombre: "Check List Mensual de Extintores",
  titulo: "INSPECCIÓN MENSUAL DE EXTINTORES",
  patron: "activos",
  rev: "00",
  // Campos de cabecera del formato
  cabecera: [
    { key: "fecha", label: "Fecha", type: "date", required: true },
    { key: "hora", label: "Hora", type: "time" },
    { key: "area", label: "Área", type: "text", default: "Proyecto CH SG III" },
    { key: "mes", label: "Mes", type: "text" },
    { key: "inspector", label: "Inspeccionado por", type: "text", required: true, full: true },
    { key: "supervisor", label: "Supervisor Resp.", type: "text", full: true },
  ],
  // Columnas que describen cada activo (fijas, editables como texto)
  columnasActivo: [
    { key: "codigo", label: "Código", width: 60, default: "" },
    { key: "ubicacion", label: "Ubicación / placa", width: 140 },
    { key: "tipo_peso", label: "Tipo / Peso", width: 70 },
    { key: "fecha_venc", label: "Fecha venc. (mes/año)", width: 80, type: "month" },
  ],
  // Puntos de verificación (cada uno se califica C/NC/NA/N.T.)
  puntos: [
    { key: "p1", short: "Cód. visible", label: "Código de identificación visible, legible" },
    { key: "p2", short: "Accesible", label: "Ubicado en lugar accesible libre de obstáculos" },
    { key: "p3", short: "Soporte", label: "Instalado en porta-extintor, colgador o gabinete" },
    { key: "p4", short: "Precinto", label: "Pasador y precinto de seguridad no roto" },
    { key: "p5", short: "Tarjeta", label: "Tarjeta de inspección vigente" },
    { key: "p6", short: "Venc. vig.", label: "Fecha de vencimiento vigente" },
    { key: "p7", short: "Manómetro", label: "Lectura de manómetro en franja verde" },
    { key: "p8", short: "Manija", label: "Manija de acarreo sin fisura y corrosión" },
    { key: "p9", short: "Manguera", label: "Manguera, tobera, pitón o pistola no doblado" },
    { key: "p10", short: "Cilindro", label: "Cilindro/Botella sin deformación y corrosión" },
    { key: "p11", short: "Etiquetas", label: "Etiquetas/Instrucciones de uso visible y legible" },
  ],
  observacionPorFila: { key: "obs", label: "Observaciones" },
  leyendaTipo: "Tipo — PQS: Polvo Químico Seco · CO2: Dióxido de Carbono · A: Agua · E: Espuma · K: Acetato de Potasio",
  leyendaCalif: "Calificación — C: Conforme · NC: No Conforme · NA: No aplica · N.T.: No tiene",
  recomendacion: "Cuando un extintor no cumpla con algún ítem, programar el reemplazo o mantenimiento correspondiente.",
  firmas: [
    { rol: "Residente / Ingeniero Supervisor" },
    { rol: "Encargado SST" },
  ],
  filasIniciales: 40, // cantidad de extintores por defecto a precargar
};

// ── PLANTILLA: Check List de Botiquines (Patrón A) ──
const BOTIQUINES = {
  codigo: "HGP-SGIII-SIG-FR-022",
  codigoPdf: "HGP-SGIII-SIG-FR-022C",
  nombre: "Check List de Botiquines",
  titulo: "CHECK LIST DE BOTIQUINES",
  patron: "activos",
  rev: "00",
  cabecera: [
    { key: "fecha", label: "Fecha", type: "date", required: true },
    { key: "hora", label: "Hora", type: "time" },
    { key: "area", label: "Área", type: "text" },
    { key: "mes", label: "Mes", type: "text" },
    { key: "inspector", label: "Inspeccionado por", type: "text", required: true, full: true },
    { key: "supervisor", label: "Supervisor Resp.", type: "text", full: true },
  ],
  columnasActivo: [
    { key: "codigo", label: "Código", width: 60 },
    { key: "ubicacion", label: "Ubicación / placa", width: 140 },
    { key: "tipo", label: "Tipo (F/V)", width: 50 },
  ],
  puntos: [
    { key: "p1", short: "Alcohol", label: "Alcohol yodado 70 o 120 ml (F-V)" },
    { key: "p2", short: "Agua ox.", label: "Agua oxigenada 120 ml (F-V)" },
    { key: "p3", short: "Gasas", label: "Gasas estériles 10 x 10 cm (F-V)" },
    { key: "p4", short: "Apósito", label: "Apósito esterilizado 10 x 10 cm (F-V)" },
    { key: "p5", short: "Esparad.", label: "Esparadrapo 2.5 cm x 5 cm (F-V)" },
    { key: "p6", short: "Venda", label: "Venda de 4x5 yardas (F-V)" },
    { key: "p7", short: "Curita", label: "Vendita autoadhesiva (curita) (F-V)" },
    { key: "p8", short: "Tijera", label: "Tijera tipo trauma (F-V)" },
    { key: "p9", short: "Guantes", label: "Guantes quirúrgicos (F-V)" },
    { key: "p10", short: "Algodón", label: "Algodón hidrófilo 50 gr. (F-V)" },
    { key: "p11", short: "Kit RCP", label: "Kit de RCP (F)" },
    { key: "p12", short: "Manta", label: "Manta térmica aluminizada (F)" },
    { key: "p13", short: "Torniq.", label: "Torniquete (F)" },
    { key: "p14", short: "V. triang.", label: "Vendaje triangular (F)" },
    { key: "p15", short: "Férula", label: "Férula moldeable (F)" },
    { key: "p16", short: "Jabón", label: "Jabón antiséptico (V)" },
    { key: "p17", short: "Guía PA", label: "Guía manual de primeros auxilios (V)" },
  ],
  observacionPorFila: { key: "obs", label: "Observaciones" },
  leyendaTipo: "Tipo — F: Botiquín Fijo · V: Botiquín Vehículo   ·   (F-V/F/V) indica en qué botiquín aplica cada ítem",
  leyendaCalif: "Calificación — C: Conforme · NC: No Conforme · NA: No aplica",
  recomendacion: "Reponer los insumos faltantes o vencidos del botiquín.",
  firmas: [
    { rol: "Inspector (Apellidos y Nombres)" },
    { rol: "Supervisor Responsable" },
  ],
  filasIniciales: 10,
};

// ── PLANTILLA: Inspección de Luces de Emergencia (Patrón A) ──
const LUCES_EMERGENCIA = {
  codigo: "HGP-SGIII-SIG-FR-013",
  codigoPdf: "HGP-SGIII-SST-FR-013",
  nombre: "Inspección de Luces de Emergencia",
  titulo: "INSPECCIÓN DE LUCES DE EMERGENCIA",
  patron: "activos",
  rev: "00",
  cabecera: [
    { key: "fecha", label: "Fecha de inspección", type: "date", required: true },
    { key: "inspector", label: "Nombre del inspector", type: "text", required: true },
    { key: "area", label: "Lugar / Área", type: "text" },
    { key: "tipo_inspeccion", label: "Tipo de inspección (Planificada / No planificada)", type: "text", full: true },
  ],
  columnasActivo: [
    { key: "codigo", label: "Código", width: 60 },
    { key: "instalacion", label: "Instalación", width: 110 },
    { key: "ubicacion", label: "Ubicación", width: 140 },
  ],
  puntos: [
    { key: "p1", short: "Luz izq.", label: "Luz izquierda operativa" },
    { key: "p2", short: "Luz der.", label: "Luz derecha operativa" },
    { key: "p3", short: "Test", label: "Test de funcionamiento" },
  ],
  observacionPorFila: { key: "obs", label: "Observaciones" },
  leyendaTipo: "Verificar el encendido de ambas luces y la prueba de autonomía (test).",
  leyendaCalif: "Calificación — C: Conforme · NC: No Conforme · NA: No aplica",
  recomendacion: "Reemplazar baterías o equipos defectuosos.",
  firmas: [
    { rol: "Inspector" },
    { rol: "Supervisor SST" },
  ],
  filasIniciales: 15,
};

// ── PLANTILLA: Inspección de Vehículos Livianos (Patrón B — secciones) ──
const VEHICULOS = {
  codigo: "HGP-SGIII-SST-FR-029",
  codigoPdf: "HGP-SGIII-SST-FR-029",
  nombre: "Inspección de Vehículos Livianos",
  titulo: "INSPECCIÓN DE VEHÍCULOS LIVIANOS",
  patron: "secciones",
  rev: "00",
  cabecera: [
    { key: "inspector", label: "Realizado por", type: "text", required: true },
    { key: "fecha", label: "Fecha", type: "date", required: true },
    { key: "placa", label: "Placa de camioneta", type: "text" },
    { key: "empresa", label: "Empresa", type: "text" },
    { key: "kilometraje", label: "Kilometraje", type: "text" },
    { key: "nivel_combustible", label: "Nivel de combustible (Gasolina / Diésel)", type: "text" },
  ],
  secciones: [
    { titulo: "1.0 Elementos críticos", items: [
      { c: "1.1", n: "Jaula antivuelco" }, { c: "1.2", n: "Estado mecánico de frenos" },
      { c: "1.3", n: "Luz de freno" }, { c: "1.4", n: "Nivel líquido para frenos" },
      { c: "1.5", n: "Nivel aceite de motor" }, { c: "1.6", n: "Placas traseras y delanteras" },
      { c: "1.7", n: "Tarjeta de propiedad" }, { c: "1.8", n: "Interior de camioneta" },
      { c: "1.9", n: "SOAT (Seguro Obligatorio de Accidentes)" }, { c: "1.10", n: "Cinturones de seguridad" },
      { c: "1.11", n: "Inspección Técnica Vehicular" }, { c: "1.12", n: "Estado de neumáticos" },
    ]},
    { titulo: "2.0 Mantenimiento", items: [
      { c: "2.1", n: "Limpieza del vehículo" }, { c: "2.2", n: "Cambio líquido para frenos" },
      { c: "2.3", n: "Cambio aceite de motor" }, { c: "2.4", n: "Cambio filtro de aceite" },
      { c: "2.5", n: "Cambio filtros de combustible" }, { c: "2.6", n: "Cambio filtro de aire" },
      { c: "2.7", n: "Cambio aceite de cajas y transmisiones" }, { c: "2.8", n: "Cambio aceite de caja de dirección" },
    ]},
    { titulo: "3.0 Sistema eléctrico", items: [
      { c: "3.1", n: "Batería" }, { c: "3.2", n: "Luces delanteras (altas y bajas) y traseras" },
      { c: "3.3", n: "Luces direccionales (intermitentes)" }, { c: "3.4", n: "Limpiaparabrisas" },
      { c: "3.5", n: "Bocina / Cláxon" }, { c: "3.6", n: "Alternador y motor de arranque" },
      { c: "3.7", n: "Alarma de retroceso" },
    ]},
    { titulo: "4.0 Exterior de camioneta", items: [
      { c: "4.1", n: "Parabrisas - luneta (delantero, trasero)" }, { c: "4.2", n: "Limpiaparabrisas" },
      { c: "4.3", n: "Estado de la carrocería" }, { c: "4.4", n: "Micas y luces (delanteras y traseras)" },
      { c: "4.5", n: "Parachoques" }, { c: "4.6", n: "Espejos retrovisores" },
      { c: "4.8", n: "Neumático de repuesto" }, { c: "4.9", n: "Conos de seguridad" },
      { c: "4.10", n: "Cuñas de seguridad / Tacos" }, { c: "4.11", n: "Tubo de escape" },
      { c: "4.12", n: "Extintor" }, { c: "4.13", n: "Circulina" },
      { c: "4.14", n: "Pico y pala" }, { c: "4.15", n: "Faro pirata" },
      { c: "4.16", n: "Kit antiderrame" },
    ]},
    { titulo: "5.0 Interior de camioneta", items: [
      { c: "5.1", n: "Asientos" }, { c: "5.2", n: "Calefacción - Aire acondicionado" },
      { c: "5.3", n: "Tablero" }, { c: "5.4", n: "Botiquín" },
      { c: "5.5", n: "Doble Airbag" }, { c: "5.6", n: "Cinturones de seguridad delanteros - funcionamiento" },
    ]},
  ],
  leyendaCalif: "Clasificación — B: Bueno · R: Regular · M: Malo     Estatus — P: Pendiente · S: Solucionado",
  recomendacion: "Registrar la medida correctiva, responsable y plazo para cada ítem observado.",
  firmas: [
    { rol: "Firma del conductor" },
    { rol: "V°B° de supervisión" },
  ],
};

// ── PLANTILLA: Inspección de Herramientas Manuales y de Poder (Patrón A — activos) ──
const HERRAMIENTAS = {
  codigo: "HGP-SGIII-SST-FR-012",
  codigoPdf: "HGP-SGIII-SST-FR-012",
  nombre: "Inspección de Herramientas Manuales y de Poder",
  titulo: "INSPECCIÓN DE HERRAMIENTAS MANUALES Y DE PODER",
  patron: "activos",
  rev: "00",
  cabecera: [
    { key: "fecha", label: "Fecha de inspección", type: "date", required: true },
    { key: "mes", label: "Mes", type: "text" },
    { key: "color_cinta", label: "Color de cinta", type: "text" },
    { key: "area", label: "Área responsable", type: "text" },
    { key: "inspector", label: "Responsable de la inspección", type: "text", required: true, full: true },
    { key: "supervisor", label: "Supervisor Responsable", type: "text", full: true },
  ],
  columnasActivo: [
    { key: "herramienta", label: "Herramienta Manual y de Poder", width: 160 },
    { key: "cantidad", label: "Cantidad", width: 50 },
    { key: "marca", label: "Marca", width: 80 },
    { key: "codigo", label: "Código / N° Serie", width: 90 },
  ],
  puntos: [
    { key: "condicion", short: "Condición", label: "Condición de la herramienta" },
  ],
  observacionPorFila: { key: "obs", label: "Observaciones" },
  leyendaCalif: "Condición — C: Conforme (Operativa) · NC: No Conforme · NA: No aplica · N.T.: No tiene",
  recomendacion: "Indicar el motivo de retiro o baja de la herramienta que no cumpla.",
  firmas: [
    { rol: "Responsable de la inspección" },
    { rol: "Supervisor Responsable" },
  ],
  filasIniciales: 30,
};

// ── PLANTILLA: Inspección de Equipos Anti-Caídas (Patrón D — matriz) ──
//   Equipos (arneses) en COLUMNAS, ítems de verificación en FILAS, celdas B/M/NA.
const ANTICAIDAS = {
  codigo: "HGP-SGIII-SST-FR-015",
  codigoPdf: "HGP-SGIII-SST-FR-015",
  nombre: "Inspección de Equipos Anti-Caídas",
  titulo: "INSPECCIÓN DE EQUIPOS ANTICAÍDAS",
  patron: "matriz",
  rev: "00",
  cabecera: [
    { key: "unidad", label: "Unidad operativa", type: "text" },
    { key: "fecha", label: "Fecha", type: "date", required: true },
    { key: "hora", label: "Hora", type: "time" },
    { key: "area", label: "Lugar", type: "text" },
    { key: "actividad", label: "Actividad", type: "text", full: true },
    { key: "inspector", label: "Nombre de Inspector", type: "text", required: true, full: true },
    { key: "supervisor", label: "Nombre de Supervisor O&M", type: "text", full: true },
  ],
  // Cada equipo es una columna; el inspector ingresa su código
  equipoLabel: "Arnés",
  equipoCampo: { key: "codigo", label: "Código" },
  equiposIniciales: 4,
  equiposMax: 7,
  // Opciones de calificación por celda
  calificaciones: ["B", "M", "NA"],
  // Ítems agrupados por componente del sistema anticaídas
  grupos: [
    { titulo: "1. ARNÉS DE CUERPO ENTERO", items: [
      { c: "1.1", n: "Reata (cortada, desgastada, decolorada)" },
      { c: "1.2", n: "Costura de seguridad en buen estado (puntadas)" },
      { c: "1.3", n: "Partes metálicas (anillos, hebillas) sin corrosión" },
      { c: "1.4", n: "Partes plásticas (rotura, desgaste)" },
      { c: "1.5", n: "Etiqueta legible" },
    ]},
    { titulo: "2. LÍNEA DE ANCLAJE", items: [
      { c: "2.1", n: "Reata (cortada, desgastada, decolorada)" },
      { c: "2.2", n: "Costura de seguridad en buen estado (puntadas)" },
      { c: "2.3", n: "Absorbedor de energía sin impactar" },
      { c: "2.4", n: "Partes metálicas (ganchos, hebillas) sin corrosión" },
      { c: "2.5", n: "Etiqueta legible" },
    ]},
    { titulo: "3. LÍNEA DE POSICIONAMIENTO", items: [
      { c: "3.1", n: "Reata (cortada, desgastada, decolorada)" },
      { c: "3.2", n: "Costura de seguridad en buen estado (puntadas)" },
      { c: "3.3", n: "Partes metálicas (ganchos, hebillas) sin corrosión" },
      { c: "3.4", n: "Etiqueta legible" },
    ]},
    { titulo: "4. CONECTOR DE ANCLAJE", items: [
      { c: "4.1", n: "Reata (cortada, desgastada, decolorada)" },
      { c: "4.2", n: "Costura de seguridad en buen estado (puntadas)" },
      { c: "4.3", n: "Partes metálicas (ganchos, hebillas) sin corrosión" },
      { c: "4.4", n: "Etiqueta legible" },
    ]},
    { titulo: "5. MOSQUETONES DE SEGURIDAD", items: [
      { c: "5.1", n: "Desgaste excesivo o deformación" },
      { c: "5.2", n: "Picaduras, grietas" },
      { c: "5.3", n: "Tambor de seguridad" },
      { c: "5.4", n: "Corrosión" },
      { c: "5.5", n: "Otros" },
    ]},
    { titulo: "6. ARRESTADOR DE CAÍDAS", items: [
      { c: "6.1", n: "Desgaste excesivo o deformación" },
      { c: "6.2", n: "Picaduras, grietas" },
      { c: "6.3", n: "Seguros y partes móviles" },
      { c: "6.4", n: "Corrosión" },
      { c: "6.5", n: "Otros" },
    ]},
    { titulo: "7. SISTEMA RETRÁCTIL", items: [
      { c: "7.1", n: "Desgaste excesivo o deformación" },
      { c: "7.2", n: "Picaduras, grietas" },
      { c: "7.3", n: "Seguros y partes móviles" },
      { c: "7.4", n: "Corrosión" },
      { c: "7.5", n: "Otros" },
    ]},
  ],
  leyendaCalif: "Calificación — B: Bueno · M: Malo · NA: No aplica",
  recomendacion: "Retirar de servicio todo equipo con calificación 'M' (Malo) hasta su reemplazo.",
  firmas: [
    { rol: "Firma del Inspector" },
    { rol: "Firma del Supervisor O&M" },
  ],
};

// ── PLANTILLA: RACS — Reporte de Actos y Condiciones Subestándares (Patrón C — evento) ──
const RACS = {
  codigo: "HGP-SGIII-SST-FR-018",
  codigoPdf: "HGP-SGIII-SST-FR-018",
  nombre: "Reporte de Actos y Condiciones Subestándares (RACS)",
  titulo: "REPORTE DE ACTOS Y CONDICIONES SUBESTANDARES - RACS",
  subtitulo: "ÁREA DE SEGURIDAD Y SALUD EN EL TRABAJO",
  patron: "evento",
  rev: "00",
  emails: ["fransvargas@hydroglobal.hk", "saludocupacional@hydroglobal.hk"],
  // Leyendas de nivel de riesgo (texto oficial del formato FR-018)
  niveles: {
    alto: {
      label: "ALTO",
      sst: "Condición o acto subestándar que de no implementarse controles podría generar lesión con incapacidad permanente, tales como amputaciones, fracturas mayores e inclusive la muerte. Con relación a la salud podría generar daños irreversibles tales como intoxicaciones, lesiones múltiples, lesiones letales, pérdida auditiva, etc.",
      ma: "Daños irreversibles al ambiente. No es posible aplicar una remediación al 100% con los controles actuales.",
    },
    medio: {
      label: "MEDIO",
      sst: "Condición o acto subestándar que de no implementarse controles podría generar lesiones con incapacidad temporal tales como fracturas menores, entre otros. Con relación a la salud podría generar daños reversibles tales como dermatitis, asmas, trastornos musculoesqueléticos, etc.",
      ma: "Daños reversibles al ambiente aplicando controles. Es posible aplicar controles y restablecer las condiciones iniciales del ambiente.",
    },
    bajo: {
      label: "BAJO",
      sst: "Condición o acto subestándar que de no implementarse controles podría generar lesiones sin discapacidad tales como pequeños cortes o magulladuras. Con relación a la salud podría generar daños reversibles tales como molestias, dolor de cabeza, etc.",
      ma: "Daños potenciales o reales reversibles al ambiente en forma inmediata.",
    },
  },
  firmas: [
    { rol: "Firma del Reportante" },
    { rol: "VB° SSOMA Hydroglobal Perú" },
  ],
};

// Registro de todas las plantillas disponibles
export const PLANTILLAS_HGP = {
  [EXTINTORES.codigo]: EXTINTORES,
  [BOTIQUINES.codigo]: BOTIQUINES,
  [LUCES_EMERGENCIA.codigo]: LUCES_EMERGENCIA,
  [VEHICULOS.codigo]: VEHICULOS,
  [HERRAMIENTAS.codigo]: HERRAMIENTAS,
  [ANTICAIDAS.codigo]: ANTICAIDAS,
  [RACS.codigo]: RACS,
  ...PLANTILLAS_LOTE2,
};

// Lista para el catálogo (orden de aparición)
export const CATALOGO_HGP = [
  { codigo: EXTINTORES.codigo, nombre: EXTINTORES.nombre, patron: "activos", grupo: "Emergencias", disponible: true },
  // Próximamente:
  { codigo: "HGP-SGIII-SIG-FR-022", nombre: "Check List de Botiquines", patron: "activos", grupo: "Emergencias", disponible: true },
  { codigo: "HGP-SGIII-SIG-FR-013", nombre: "Inspección de Luces de Emergencia", patron: "activos", grupo: "Emergencias", disponible: true },
  { codigo: "HGP-SGIII-SST-FR-029", nombre: "Inspección de Vehículos Livianos", patron: "secciones", grupo: "Vehículos", disponible: true },
  { codigo: "HGP-SGIII-SST-FR-015", nombre: "Inspección de Equipos Anti-Caídas", patron: "matriz", grupo: "Equipos", disponible: true },
  { codigo: "HGP-SGIII-SST-FR-012", nombre: "Inspección de Herramientas Manuales y de Poder", patron: "activos", grupo: "Equipos", disponible: true },
  ...CATALOGO_LOTE2,
  { codigo: "HGP-SGIII-SST-FR-018", nombre: "Reporte de Actos y Condiciones Subestándares (RACS)", patron: "evento", grupo: "Reportes", disponible: true, enlaceExterno: "https://reporte-racs-hydroglobal.web.app/" },
];

export function getPlantilla(codigo) {
  return PLANTILLAS_HGP[codigo] || null;
}

// Fila vacía según la plantilla de activos
export function filaVacia(plantilla, item) {
  const fila = { item };
  plantilla.columnasActivo.forEach((c) => { fila[c.key] = c.default ?? ""; });
  plantilla.puntos.forEach((p) => { fila[p.key] = ""; });
  fila[plantilla.observacionPorFila.key] = "";
  return fila;
}

// Calificación y columnas por defecto del patrón "secciones" (Vehículos FR-029)
export const SECCIONES_CALIF_DEFAULT = ["B", "R", "M"];
export const SECCIONES_COLUMNAS_DEFAULT = [
  { key: "observacion", label: "Medida correctiva / Observación" },
  { key: "responsable", label: "Responsable", width: 130 },
  { key: "plazo", label: "Plazo", type: "date", width: 110 },
  { key: "estatus", label: "Estatus", type: "select", opciones: ["", "P", "S"], width: 70 },
];

// Genera la lista plana de ítems (con calificación vacía) para el patrón "secciones"
// Soporta columnas correctivas configurables (plantilla.columnas).
export function itemsVaciosSecciones(plantilla) {
  const cols = plantilla.columnas || SECCIONES_COLUMNAS_DEFAULT;
  const items = [];
  (plantilla.secciones || []).forEach((sec) => {
    sec.items.forEach((it) => {
      const row = { seccion: sec.titulo, codigo: it.c, nombre: it.n, calificacion: "" };
      cols.forEach((c) => { row[c.key] = ""; });
      items.push(row);
    });
  });
  return items;
}

// ── Helpers patrón "matriz" (equipos/columnas × ítems en filas) ──
// Genera la lista plana de ítems; cada uno con un objeto `vals` indexado por columna.
// Soporta grupos (plantilla.grupos) o lista plana (plantilla.items), y columna extra (it.cantidad).
export function itemsVaciosMatriz(plantilla) {
  const items = [];
  const push = (grupo, it) => {
    const row = { grupo, codigo: it.c, nombre: it.n, vals: {} };
    if (it.cantidad !== undefined) row.cantidad = it.cantidad;
    items.push(row);
  };
  if (plantilla.grupos) plantilla.grupos.forEach((g) => g.items.forEach((it) => push(g.titulo, it)));
  else if (plantilla.items) plantilla.items.forEach((it) => push("", it));
  return items;
}

// Lista inicial de equipos (columnas) vacíos
export function equiposIniciales(plantilla) {
  const n = plantilla.equiposIniciales || 3;
  return Array.from({ length: n }, () => ({ [plantilla.equipoCampo.key]: "" }));
}
