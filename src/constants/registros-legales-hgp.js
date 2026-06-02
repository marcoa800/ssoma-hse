// ════════════════════════════════════════════════════════════════════
//  REGISTROS LEGALES MINTRA — HYDRO GLOBAL PERÚ SAC
//  Motor "ficha" declarativo: cada registro oficial se define como
//  secciones de campos. El motor (RegistrosLegalesHGP.jsx) lo renderiza,
//  guarda en `registros_legales_hgp` y genera un PDF digital limpio.
//
//  Tipos de campo:
//   - text | date | time | number | textarea
//   - checkgroup → selección única entre `opciones` (string guardado)
//   - subtabla   → filas repetibles con `columnas`
//   - foto       → evidencia fotográfica (múltiple)
//   Modificadores: full (ocupa toda la fila), default, placeholder
// ════════════════════════════════════════════════════════════════════

export const EMPRESA_LEGAL_HGP = {
  nombre: "HYDRO GLOBAL PERÚ S.A.C.",
  ruc: "20600538251",
  domicilio: "Av. Juan de Arona Nro. 151 Int. 304 - San Isidro",
  representante: "DANIEL J. CAMAC GUTIERREZ",
  actividad: "Generación de Energía",
  telefono: "16131570",
  logo: "/logo.jpg",
};

// ── FR-026: Registro Preliminar de Accidente ──
const PRELIMINAR = {
  codigo: "HGP-SGIII-SIG-FR-026",
  nombre: "Registro Preliminar de Accidente",
  titulo: "REGISTRO PRELIMINAR DE ACCIDENTE",
  rev: "00",
  referenciaKey: "acc_nombres",   // campo que se usa como título en la lista
  secciones: [
    { num: "", titulo: "Identificación", campos: [
      { key: "num_registro", label: "N° de Registro", type: "text" },
      { key: "anio", label: "Año", type: "text" },
      { key: "tipo_evento", label: "Tipo", type: "checkgroup", opciones: ["Accidente", "Incidente"] },
    ]},
    { num: "1", titulo: "DE LA EMPRESA AUTORIZADA", campos: [
      { key: "razon_social", label: "Razón Social", type: "text", full: true, default: EMPRESA_LEGAL_HGP.nombre },
      { key: "domicilio_legal", label: "Domicilio Legal", type: "text", full: true, default: EMPRESA_LEGAL_HGP.domicilio },
    ]},
    { num: "2", titulo: "DEL ACCIDENTE", campos: [
      { key: "fecha", label: "Fecha", type: "date", required: true },
      { key: "hora", label: "Hora", type: "time" },
      { key: "lugar", label: "Lugar", type: "text" },
      { key: "distrito", label: "Distrito", type: "text" },
      { key: "provincia", label: "Provincia", type: "text" },
      { key: "departamento", label: "Departamento", type: "text" },
    ]},
    { num: "3", titulo: "TIPO DEL ACCIDENTE", campos: [
      { key: "tipo_accidente", label: "Tipo del accidente", type: "checkgroup", full: true,
        opciones: ["Daño a la persona", "Daños Materiales / Impacto al Medio Ambiente", "Ambos"] },
    ]},
    { num: "4", titulo: "DEL ACCIDENTADO", campos: [
      { key: "acc_personal", label: "Personal", type: "checkgroup", opciones: ["Propio", "Contratista", "Terceros"] },
      { key: "acc_tipo", label: "Tipo", type: "checkgroup", opciones: ["Leve", "Incapacitante", "Fatal"] },
      { key: "acc_nombres", label: "Nombres y Apellidos", type: "text", full: true },
      { key: "acc_edad", label: "Edad", type: "number" },
      { key: "acc_dni", label: "DNI", type: "text" },
      { key: "acc_ocupacion", label: "Ocupación / Puesto", type: "text" },
      { key: "acc_antiguedad", label: "Antigüedad en el cargo", type: "text" },
      { key: "acc_parte_cuerpo", label: "Parte del cuerpo afectada", type: "text" },
      { key: "acc_lesion", label: "Lesión", type: "text" },
      { key: "acc_empresa", label: "Razón Social de la empresa del accidentado", type: "text", full: true },
      { key: "acc_domicilio", label: "Domicilio legal de la empresa del accidentado", type: "text", full: true },
      { key: "acc_telefono", label: "Teléfono de la empresa", type: "text" },
    ]},
    { num: "5", titulo: "DAÑOS MATERIALES / IMPACTO AL MEDIO AMBIENTE", campos: [
      { key: "dano_producido", label: "Daño producido", type: "checkgroup", full: true,
        opciones: ["Leve", "Seria", "Grave", "Catastrófico"] },
      { key: "prop_edificacion", label: "Edificación", type: "text" },
      { key: "prop_herramientas", label: "Herramientas", type: "text" },
      { key: "prop_equipo_fijo", label: "Equipo fijo", type: "text" },
      { key: "prop_materiales", label: "Materiales", type: "text" },
      { key: "prop_otro", label: "Otro (detallar)", type: "text", full: true },
    ]},
    { num: "6", titulo: "DESCRIPCIÓN DEL ACCIDENTE / DAÑOS", campos: [
      { key: "descripcion", label: "Descripción", type: "textarea", full: true,
        placeholder: "Describa solo los hechos, no escriba información de causas ni responsables." },
    ]},
    { num: "7", titulo: "DEL REPORTE", campos: [
      { key: "fecha_emision", label: "Fecha de emisión", type: "date" },
      { key: "sup_nombres", label: "Supervisor responsable del registro", type: "text" },
      { key: "sup_dni", label: "D.N.I. / L.E.", type: "text" },
    ]},
    { num: "", titulo: "EVIDENCIA FOTOGRÁFICA (Lugar del evento / Primer auxilio)", campos: [
      { key: "fotos", label: "Fotografías", type: "foto" },
    ]},
  ],
  firmas: [{ rol: "Supervisor Responsable del Registro" }],
};

// ── FR-025: Registro de Incidente o Incidente Peligroso ──
const INCIDENTE = {
  codigo: "HGP-SGIII-SIG-FR-025",
  nombre: "Registro de Incidente o Incidente Peligroso",
  titulo: "REGISTRO DE INCIDENTE O INCIDENTE PELIGROSO",
  rev: "00",
  referenciaKey: "trab_nombres",
  secciones: [
    { num: "", titulo: "Identificación", campos: [
      { key: "num_incidente", label: "N° de Incidente", type: "text" },
      { key: "anio", label: "Año", type: "text" },
    ]},
    { num: "1", titulo: "DE LA EMPRESA AUTORIZADA", campos: [
      { key: "razon_social", label: "Razón Social", type: "text", default: EMPRESA_LEGAL_HGP.nombre },
      { key: "telefono", label: "Teléfono", type: "text", default: EMPRESA_LEGAL_HGP.telefono },
      { key: "representante", label: "Representante Legal", type: "text", default: EMPRESA_LEGAL_HGP.representante },
      { key: "domicilio", label: "Domicilio Legal", type: "text", default: EMPRESA_LEGAL_HGP.domicilio },
      { key: "actividad", label: "Actividad económica", type: "text", default: EMPRESA_LEGAL_HGP.actividad },
      { key: "ruc", label: "RUC", type: "text", default: EMPRESA_LEGAL_HGP.ruc },
    ]},
    { num: "2", titulo: "DE LA EMPRESA EMPLEADORA", campos: [
      { key: "emp_relacion", label: "Relación", type: "checkgroup", opciones: ["Propio", "Contratista", "Terceros"] },
      { key: "emp_razon_social", label: "Razón Social", type: "text", full: true },
      { key: "emp_ruc", label: "RUC", type: "text" },
      { key: "emp_telefono", label: "Teléfono", type: "text" },
      { key: "emp_domicilio", label: "Domicilio Legal", type: "text", full: true },
      { key: "emp_actividad", label: "Actividad económica", type: "text" },
      { key: "emp_num_trab", label: "N° de Trabajadores", type: "number" },
    ]},
    { num: "3", titulo: "DEL TRABAJADOR (sólo si el incidente lo afectó)", campos: [
      { key: "trab_nombres", label: "Nombres y Apellidos", type: "text", full: true },
      { key: "trab_dni", label: "DNI / LE / C.E.", type: "text" },
      { key: "trab_edad", label: "Edad", type: "number" },
      { key: "trab_ocupacion", label: "Ocupación / Puesto", type: "text" },
      { key: "trab_experiencia", label: "Experiencia en el puesto", type: "text" },
      { key: "trab_antiguedad", label: "Antigüedad en el cargo", type: "text" },
      { key: "trab_contrato", label: "Tipo de contrato", type: "text" },
      { key: "trab_area", label: "Área", type: "text" },
      { key: "trab_horas", label: "N° horas trabajadas en la jornada", type: "text" },
      { key: "trab_sexo", label: "Sexo", type: "checkgroup", opciones: ["M", "F"] },
      { key: "trab_turno", label: "Turno", type: "checkgroup", opciones: ["Día (D)", "Tarde (T)", "Noche (N)"] },
    ]},
    { num: "4", titulo: "INVESTIGACIÓN DEL INCIDENTE", campos: [
      { key: "clasificacion", label: "Clasificación", type: "checkgroup", opciones: ["Incidente Peligroso", "Incidente"] },
      { key: "primeros_auxilios", label: "Tipo de atención en primeros auxilios", type: "text", full: true },
      { key: "num_trab_afectados", label: "N° trabajadores potencialmente afectados", type: "number" },
      { key: "num_pobladores_afectados", label: "N° pobladores potencialmente afectados", type: "number" },
      { key: "fecha_hecho", label: "Fecha del hecho", type: "date" },
      { key: "hora_hecho", label: "Hora del hecho", type: "time" },
      { key: "fecha_investigacion", label: "Fecha de inicio de investigación", type: "date" },
      { key: "lugar_hecho", label: "Lugar exacto donde ocurrió el hecho", type: "text", full: true },
    ]},
    { num: "5", titulo: "DESCRIPCIÓN DEL INCIDENTE", campos: [
      { key: "descripcion", label: "Descripción", type: "textarea", full: true,
        placeholder: "Describa solo los hechos, no escriba información subjetiva." },
    ]},
    { num: "6", titulo: "CAUSAS DEL INCIDENTE", campos: [
      { key: "medidas_existentes", label: "Medidas de seguridad existentes en el área", type: "textarea", full: true },
      { key: "cuenta_pets", label: "¿Cuenta con Procedimientos de Trabajo (PETS)?", type: "checkgroup", opciones: ["Sí", "No"] },
    ]},
    { num: "7", titulo: "MEDIDAS CORRECTIVAS", campos: [
      { key: "medidas_correctivas", label: "Medidas correctivas", type: "subtabla",
        columnas: [
          { key: "descripcion", label: "Descripción de la medida correctiva" },
          { key: "responsable", label: "Responsable" },
          { key: "fecha", label: "Fecha de ejecución", type: "date" },
          { key: "estado", label: "Estado" },
        ]},
    ]},
    { num: "8", titulo: "RESPONSABLES DEL REGISTRO Y DE LA INVESTIGACIÓN", campos: [
      { key: "resp_registro", label: "Responsable del registro", type: "subtabla",
        columnas: [
          { key: "nombres", label: "Nombre y Apellidos" },
          { key: "cargo", label: "Cargo" },
          { key: "fecha", label: "Fecha", type: "date" },
        ]},
    ]},
    { num: "", titulo: "EVIDENCIA FOTOGRÁFICA", campos: [
      { key: "fotos", label: "Fotografías", type: "foto" },
    ]},
  ],
  firmas: [{ rol: "Responsable del Registro" }, { rol: "VB° SSOMA Hydro Global Perú" }],
};

// ── FR-028: Registro Ampliatorio de Accidente ──
const AMPLIATORIO = {
  codigo: "HGP-SGIII-SIG-FR-028",
  nombre: "Registro Ampliatorio de Accidente",
  titulo: "REGISTRO AMPLIATORIO DE ACCIDENTE",
  rev: "00",
  referenciaKey: "acc_nombres",
  secciones: [
    { num: "", titulo: "Identificación", campos: [
      { key: "num_accidente", label: "N° de Accidente", type: "text" },
      { key: "anio", label: "Año", type: "text" },
    ]},
    { num: "1", titulo: "DE LA EMPRESA AUTORIZADA", campos: [
      { key: "razon_social", label: "Razón Social", type: "text", default: EMPRESA_LEGAL_HGP.nombre },
      { key: "telefono", label: "Teléfono", type: "text", default: EMPRESA_LEGAL_HGP.telefono },
      { key: "representante", label: "Representante Legal", type: "text", default: EMPRESA_LEGAL_HGP.representante },
      { key: "domicilio", label: "Domicilio Legal", type: "text", default: EMPRESA_LEGAL_HGP.domicilio },
      { key: "actividad", label: "Actividad económica", type: "text", default: EMPRESA_LEGAL_HGP.actividad },
      { key: "ruc", label: "RUC", type: "text", default: EMPRESA_LEGAL_HGP.ruc },
    ]},
    { num: "2", titulo: "DEL ACCIDENTADO", campos: [
      { key: "acc_relacion", label: "Relación con la empresa", type: "checkgroup", opciones: ["Propio", "Contratista", "Terceros"] },
      { key: "acc_contratista", label: "Nombre de la contratista", type: "text", full: true },
      { key: "acc_domicilio_contr", label: "Domicilio de la contratista", type: "text", full: true },
      { key: "acc_fecha_nac", label: "Fecha de nacimiento", type: "date" },
      { key: "acc_telefono", label: "Teléfono", type: "text" },
      { key: "acc_nombres", label: "Nombres y Apellidos", type: "text", full: true },
      { key: "acc_dni", label: "DNI / C.E.", type: "text" },
      { key: "acc_ocupacion", label: "Ocupación / Puesto", type: "text" },
      { key: "acc_experiencia", label: "Experiencia en la tarea", type: "text" },
      { key: "acc_antiguedad", label: "Antigüedad en el cargo", type: "text" },
      { key: "acc_tipo_trabajo", label: "Del trabajo", type: "checkgroup", opciones: ["Rutinario", "Especial", "Otro"] },
      { key: "acc_jornada", label: "Jornada", type: "checkgroup", opciones: ["Diurnista", "Turnista", "Noche"] },
      { key: "acc_horas_continuas", label: "Horas continuas antes del accidente", type: "text" },
      { key: "acc_dias_descanso", label: "Días de descanso antes del accidente", type: "text" },
      { key: "acc_seguro", label: "¿Cuenta con seguro contra accidentes?", type: "checkgroup", opciones: ["Sí", "No"] },
      { key: "acc_aseguradora", label: "Empresa aseguradora", type: "text" },
      { key: "acc_poliza", label: "Número de póliza", type: "text" },
    ]},
    { num: "3", titulo: "DEL SUPERVISOR INMEDIATO", campos: [
      { key: "sup_relacion", label: "Relación con la empresa", type: "checkgroup", opciones: ["Propio", "Contratista", "Terceros"] },
      { key: "sup_nombres", label: "Nombres y Apellidos", type: "text", full: true },
      { key: "sup_dni", label: "DNI / LE / C.E.", type: "text" },
      { key: "sup_ocupacion", label: "Ocupación / Puesto", type: "text" },
      { key: "sup_experiencia", label: "Experiencia en la tarea", type: "text" },
      { key: "sup_actividad", label: "Actividad que realizaba al momento del accidente", type: "textarea", full: true },
      { key: "sup_lugar", label: "Lugar donde se encontraba al momento del accidente", type: "text", full: true },
    ]},
    { num: "4", titulo: "DEL ACCIDENTE", campos: [
      { key: "clasificacion", label: "Clasificación del accidente", type: "checkgroup", full: true,
        opciones: ["Trivial o leve", "Grave o incapacitante", "Fatal"] },
      { key: "fecha", label: "Fecha del accidente", type: "date", required: true },
      { key: "hora", label: "Hora del accidente", type: "time" },
      { key: "lugar", label: "Lugar del accidente", type: "text" },
      { key: "distrito", label: "Distrito", type: "text" },
      { key: "provincia", label: "Provincia", type: "text" },
      { key: "departamento", label: "Departamento", type: "text" },
      { key: "naturaleza_lesion", label: "Naturaleza de la lesión", type: "text", full: true },
      { key: "parte_cuerpo", label: "Parte del cuerpo afectada", type: "text" },
      { key: "ambiente_trabajo", label: "Medio ambiente de trabajo", type: "text" },
      { key: "descripcion", label: "Descripción del evento", type: "textarea", full: true },
      { key: "acciones_inmediatas", label: "Acciones inmediatas (correctivas y preventivas)", type: "textarea", full: true },
      { key: "epp_utilizado", label: "EPP utilizado por el trabajador", type: "textarea", full: true },
      { key: "medidas_existentes", label: "Medidas de seguridad existentes en el área", type: "textarea", full: true },
      { key: "cuenta_pets", label: "¿Cuenta con Procedimientos de Trabajo (PETS)?", type: "checkgroup", opciones: ["Sí", "No"] },
      { key: "plan_accion", label: "Plan de acción para evitar su repetición", type: "subtabla",
        columnas: [
          { key: "descripcion", label: "Descripción" },
          { key: "responsable", label: "Responsable" },
          { key: "fecha", label: "Fecha de ejecución", type: "date" },
          { key: "registro", label: "Registro generado" },
        ]},
    ]},
    { num: "5", titulo: "DE LOS EQUIPOS O HERRAMIENTAS", campos: [
      { key: "equipo_uso", label: "Uso", type: "checkgroup", opciones: ["Adecuado", "Inadecuado"] },
      { key: "equipo_uso_detalle", label: "Detalle uso", type: "text" },
      { key: "equipo_estado", label: "Estado", type: "checkgroup", opciones: ["Adecuado", "Inadecuado"] },
      { key: "equipo_estado_detalle", label: "Detalle estado", type: "text" },
      { key: "equipo_resguardo", label: "Resguardo (protector)", type: "checkgroup", opciones: ["Adecuado", "Inadecuado"] },
      { key: "equipo_resguardo_detalle", label: "Detalle resguardo", type: "text" },
    ]},
    { num: "6", titulo: "DEL LUGAR DE TRABAJO", campos: [
      { key: "orden_limpieza", label: "Orden y limpieza", type: "checkgroup", opciones: ["Adecuado", "Inadecuado"] },
      { key: "orden_detalle", label: "Detalle orden y limpieza", type: "text" },
      { key: "dispositivos_seguridad", label: "Dispositivos de seguridad", type: "checkgroup", opciones: ["Adecuado", "Inadecuado"] },
      { key: "dispositivos_detalle", label: "Detalle dispositivos", type: "text" },
    ]},
    { num: "7", titulo: "DE LOS TESTIGOS DEL ACCIDENTE", campos: [
      { key: "testigos", label: "Testigos", type: "subtabla",
        columnas: [
          { key: "nombres", label: "Nombres y Apellidos" },
          { key: "dni", label: "DNI" },
          { key: "edad", label: "Edad" },
          { key: "ocupacion", label: "Ocupación" },
        ]},
    ]},
    { num: "8", titulo: "CERTIFICACIÓN MÉDICA", campos: [
      { key: "med_fecha_atencion", label: "Fecha y hora de atención médica", type: "text" },
      { key: "med_lugar", label: "Lugar(es) de atención", type: "text" },
      { key: "med_diagnostico", label: "Lesiones sufridas / Diagnóstico médico", type: "textarea", full: true },
      { key: "med_hospitalizacion", label: "Con hospitalización", type: "checkgroup", opciones: ["No", "Sí"] },
      { key: "med_dias_hosp", label: "N° de días de hospitalización", type: "text" },
      { key: "med_descanso", label: "Con descanso", type: "checkgroup", opciones: ["No", "Sí"] },
      { key: "med_dias_descanso", label: "N° de días de descanso", type: "text" },
      { key: "med_fecha_parte", label: "Fecha del parte", type: "date" },
      { key: "med_medico", label: "Nombre del médico tratante", type: "text" },
    ]},
    { num: "9", titulo: "DEL REPORTE", campos: [
      { key: "fecha_emision", label: "Fecha de emisión", type: "date" },
      { key: "rep_comite_nombres", label: "Representante del Comité de Seguridad", type: "text" },
      { key: "rep_comite_dni", label: "D.N.I. / L.E.", type: "text" },
      { key: "rep_gerencia_nombres", label: "Representante de la Gerencia General", type: "text" },
      { key: "rep_gerencia_dni", label: "D.N.I. / L.E.", type: "text" },
    ]},
    { num: "", titulo: "EVIDENCIA FOTOGRÁFICA", campos: [
      { key: "fotos", label: "Fotografías", type: "foto" },
    ]},
  ],
  firmas: [{ rol: "Representante del Comité de Seguridad" }, { rol: "Representante de la Gerencia General" }],
};

export const REGISTROS_LEGALES_HGP = {
  [PRELIMINAR.codigo]: PRELIMINAR,
  [INCIDENTE.codigo]: INCIDENTE,
  [AMPLIATORIO.codigo]: AMPLIATORIO,
};

export const CATALOGO_LEGAL_HGP = [
  { codigo: PRELIMINAR.codigo, nombre: PRELIMINAR.nombre, desc: "Reporte inicial dentro de las primeras horas del accidente." },
  { codigo: INCIDENTE.codigo, nombre: INCIDENTE.nombre, desc: "Registro de incidente o incidente peligroso (sin lesión incapacitante)." },
  { codigo: AMPLIATORIO.codigo, nombre: AMPLIATORIO.nombre, desc: "Investigación ampliatoria y completa del accidente." },
];

export function getRegistroLegal(codigo) {
  return REGISTROS_LEGALES_HGP[codigo] || null;
}

// Estado inicial de datos según defaults del esquema
export function datosIniciales(plantilla) {
  const d = {};
  plantilla.secciones.forEach((sec) => {
    sec.campos.forEach((c) => {
      if (c.type === "subtabla") d[c.key] = [];
      else if (c.type === "foto") d[c.key] = [];
      else d[c.key] = c.default ?? "";
    });
  });
  return d;
}
