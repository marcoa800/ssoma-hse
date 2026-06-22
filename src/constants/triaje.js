export const TRIAJE_CATS = {
  accidente: { label: "Accidente Laboral", color: "orange", icon: "🦺",
    questions: [
      { key: "tipo_accidente",  label: "Tipo de suceso",                    type: "select", options: ["Caída a nivel (tropezón)", "Caída de altura", "Corte / Herida abierta", "Golpe por objeto", "Atrapamiento", "Quemadura Química/Térmica", "Contacto Eléctrico", "Otro"] },
      { key: "zona_lesion",     label: "Parte del cuerpo afectada",         type: "select", options: ["Cabeza / Cráneo", "Cara / Ojos", "Cuello", "Hombro / Brazo", "Codo / Antebrazo", "Muñeca / Mano / Dedos", "Tórax / Costillas", "Columna / Espalda", "Cadera / Pelvis", "Rodilla / Muslo", "Tobillo / Pie / Dedos", "Múltiples zonas"] },
      { key: "zona_accidente",  label: "Área donde ocurrió",                type: "select", options: ["Planta / Producción", "Almacén", "Oficina", "Patio / Exterior", "Escaleras / Pasillo", "Otro"] },
      { key: "uso_epp",         label: "¿Usaba EPP al momento del accidente?", type: "select", options: ["Sí, completo", "Parcialmente", "No usaba EPP", "No aplica EPP"] },
      { key: "dolor_actual",    label: "Intensidad del dolor actual (1-10)", type: "number" },
      { key: "puede_trabajar",  label: "¿Puede continuar trabajando?",      type: "select", options: ["Sí, sin limitaciones", "Sí, con restricciones", "No, requiere descanso", "Requiere traslado médico"] },
      { key: "hora_suceso",     label: "Hora exacta del accidente",         type: "time" },
      { key: "testigos",        label: "¿Hubo testigos?",                   type: "select", options: ["Sí", "No", "No sabe"] },
    ],
    actions: ["Asegurar la escena (detener máquinas, bloquear energía).", "NO mover al herido si se sospecha lesión en columna o fractura.", "Tomar fotos del lugar antes de limpiar.", "Notificar al Jefe Directo y RRHH.", "Registrar si usaba EPP: es dato clave para el informe MINTRA.", "Activar SCTR si el caso requiere traslado externo."] },

  respiratorio: { label: "Respiratorio (Gripe, Tos)", color: "blue", icon: "🌬️",
    questions: [
      { key: "tipo_tos",        label: "Tipo de tos",                       type: "select", options: ["Sin tos", "Seca", "Con flema transparente", "Con flema verde/amarilla"] },
      { key: "congestion",      label: "¿Congestión nasal?",                type: "select", options: ["No", "Leve", "Intensa (no puede respirar por nariz)"] },
      { key: "secrecion",       label: "Tipo de secreción nasal",           type: "select", options: ["Sin secreción", "Transparente / acuosa", "Amarilla / verdosa (posible infección)", "Con sangre"] },
      { key: "dolor_garganta",  label: "¿Dolor de garganta?",               type: "select", options: ["No", "Leve", "Intenso al pasar saliva"] },
      { key: "estornudos",      label: "¿Estornudos frecuentes?",           type: "select", options: ["No", "Sí, ocasionales", "Sí, continuos"] },
      { key: "fiebre_resp",     label: "¿Tiene fiebre o sensación de calor?", type: "select", options: ["No", "Sensación de calor (no medida)", "Sí, temperatura elevada"] },
      { key: "dias_evolucion",  label: "Días de evolución",                 type: "select", options: ["Hoy empezó", "1-2 días", "3-5 días", "Más de 5 días"] },
      { key: "contacto_enfermo",label: "¿Contacto reciente con persona enferma?", type: "select", options: ["No", "Sí", "No sabe"] },
      { key: "dificultad_resp", label: "¿Dificultad para respirar?",        type: "select", options: ["No", "Leve al caminar rápido", "Sí, incluso en reposo"] },
    ],
    actions: ["Colocar mascarilla al paciente inmediatamente.", "Aislar en zona ventilada.", "Ofrecer agua si hay tos seca intensa.", "Medir saturación de oxígeno obligatoriamente.", "Si secreción verde/amarilla con fiebre: evaluar tratamiento antibiótico."] },

  digestivo: { label: "Digestivo (Náuseas, Diarrea)", color: "green", icon: "🤢",
    questions: [
      { key: "dolor_abd",       label: "Ubicación del dolor abdominal",     type: "select", options: ["Sin dolor abdominal", "Boca del estómago", "Alrededor del ombligo", "Bajo vientre", "Lado derecho (puede ser apéndice)", "Difuso en todo el abdomen"] },
      { key: "sangre_digest",   label: "¿Sangre en vómito o deposición?",   type: "select", options: ["No", "Heces oscuras / negras", "Sangre roja en heces", "Sangre en vómito"] },
      { key: "puede_liquidos",  label: "¿Puede tomar líquidos sin vomitar?", type: "select", options: ["Sí, sin problema", "Sí, pero con dificultad", "No, vomita todo"] },
      { key: "episodios",       label: "Nro de vómitos / deposiciones hoy", type: "text" },
      { key: "fiebre_digest",   label: "¿Tiene fiebre?",                    type: "select", options: ["No", "No sabe", "Sí"] },
      { key: "ultima_comida",   label: "¿Qué comió en la última comida?",   type: "text" },
      { key: "dias_evol_dig",   label: "Días de evolución",                 type: "select", options: ["Hoy empezó", "1-2 días", "3+ días"] },
    ],
    actions: ["Reposo con piernas flexionadas.", "Tener recipiente cerca por si hay vómitos.", "Hidratación con sorbos pequeños de agua o suero oral.", "NO dar alimentos sólidos ni analgésicos sin indicación médica.", "Si hay sangre en heces o vómito: derivar a emergencia de inmediato."] },

  musculo: { label: "Musculoesquelético", color: "purple", icon: "💪",
    questions: [
      { key: "zona_musculo",    label: "Zona afectada",                     type: "select", options: ["Cuello / Cervical", "Hombro", "Codo", "Muñeca / Mano", "Columna dorsal (medio de espalda)", "Lumbar (parte baja de espalda)", "Cadera / Glúteo", "Rodilla", "Tobillo / Pie"] },
      { key: "origen",          label: "Origen del dolor",                  type: "select", options: ["Esfuerzo / Carga pesada", "Mala postura prolongada", "Movimiento repetitivo", "Despertó con el dolor", "Golpe directo", "No sabe"] },
      { key: "intensidad",      label: "Intensidad del dolor (1-10)",       type: "number" },
      { key: "inflamacion",     label: "¿Hay inflamación o hinchazón visible?", type: "select", options: ["No", "Leve", "Sí, notable"] },
      { key: "limitacion",      label: "¿Puede mover la zona?",             type: "select", options: ["Sí, normal", "Sí, pero con dolor", "No, está trabado o inflamado"] },
      { key: "recurrente",      label: "¿Es la primera vez o es recurrente?", type: "select", options: ["Primera vez", "Ya lo tuvo antes", "Dolor crónico que empeoró"] },
      { key: "tiempo_evol",     label: "Tiempo de evolución",               type: "select", options: ["Comenzó hoy", "Días", "Semanas o más"] },
    ],
    actions: ["Reposo en posición antálgica (la que duela menos).", "Si no hay inflamación visible: calor local.", "Si hay inflamación o golpe reciente: frío local (hielo con tela, 15 min).", "Evaluar ergonomía del puesto de trabajo.", "Si es recurrente: programar evaluación disergonómica formal."] },

  cefalea: { label: "Cefalea (Dolor de Cabeza)", color: "yellow", icon: "🤕",
    questions: [
      { key: "ubicacion_cab",   label: "Parte de la cabeza",                type: "select", options: ["Toda la cabeza", "Solo un lado", "Frente / Senos paranasales", "Nuca / Parte posterior"] },
      { key: "inicio_cefalea",  label: "¿Cómo empezó el dolor?",            type: "select", options: ["Gradual (fue aumentando)", "Súbito (de golpe, muy intenso)"] },
      { key: "tipo_dolor",      label: "Tipo de dolor",                     type: "select", options: ["Opresivo (como casco o presión)", "Punzante / Latido", "Eléctrico / Calambre"] },
      { key: "fotofobia",       label: "¿Le molesta la luz o el ruido?",    type: "select", options: ["No", "Sí, mucho"] },
      { key: "nauseas_cef",     label: "¿Tiene náuseas o vómitos?",         type: "select", options: ["No", "Náuseas", "Vómitos"] },
      { key: "fiebre_cef",      label: "¿Tiene fiebre?",                    type: "select", options: ["No", "No sabe", "Sí"] },
      { key: "tiempo_cef",      label: "Tiempo de evolución",               type: "select", options: ["Menos de 1 hora", "1-4 horas", "Más de 4 horas"] },
    ],
    actions: ["Llevar a zona oscura y silenciosa.", "Ofrecer agua (hidratación).", "Verificar Presión Arterial obligatoriamente.", "Si inicio fue súbito e intenso: considerar emergencia neurológica.", "Preguntar antecedente de migraña o hipertensión."] },

  heridas: { label: "Heridas / Curaciones", color: "red", icon: "🩹",
    questions: [
      { key: "objeto",          label: "¿Qué causó la lesión?",             type: "text" },
      { key: "localizacion_h",  label: "Localización de la herida",         type: "select", options: ["Cabeza / Cara", "Cuello", "Tórax / Abdomen", "Brazo / Codo / Antebrazo", "Muñeca / Mano / Dedos", "Pierna / Rodilla", "Tobillo / Pie / Dedos", "Múltiples zonas"] },
      { key: "sangrado",        label: "Estado del sangrado",               type: "select", options: ["Controlado / Mínimo", "Activo pero lento", "Activo y abundante"] },
      { key: "cuerpo_extranio", label: "¿Hay cuerpo extraño en la herida?", type: "select", options: ["No", "Sí (astilla, vidrio, metal, tierra)"] },
      { key: "aspecto",         label: "Aspecto de la herida",              type: "select", options: ["Superficial (solo piel)", "Profunda (tejido visible)", "Sucia / Infectada (pus o enrojecida)"] },
      { key: "tamano",          label: "Tamaño aproximado",                 type: "select", options: ["Pequeña (< 1 cm)", "Mediana (1-3 cm)", "Grande (> 3 cm o no se puede medir)"] },
      { key: "tetanos",         label: "¿Vacuna antitetánica vigente?",     type: "select", options: ["Sí", "No", "No sabe"] },
    ],
    actions: ["Lavar con abundante agua corriente y jabón.", "NO retirar cuerpo extraño si está profundo — fijar con gasa y derivar.", "Cubrir con gasa estéril y hacer presión si sangra.", "Si es profunda o > 3 cm: evaluar si requiere sutura urgente.", "Verificar estado vacunal antitetánico.", "Si sangrado abundante: activar protocolo de emergencia."] },

  menstrual: { label: "Cólicos Menstruales", color: "pink", icon: "🌸",
    questions: [
      { key: "intensidad_col",  label: "Intensidad del dolor (1-10)",       type: "number" },
      { key: "puede_pie",       label: "¿Puede mantenerse de pie y caminar?", type: "select", options: ["Sí, sin problema", "Con dificultad", "No, necesita reposo inmediato"] },
      { key: "sintomas_asoc",   label: "Síntomas acompañantes",             type: "select", options: ["Solo dolor", "Dolor + náuseas", "Dolor + mareo", "Dolor + vómitos", "Dolor intenso incapacitante"] },
      { key: "medicacion_col",  label: "¿Tiene medicación habitual para esto?", type: "select", options: ["Sí, ya la tomó", "Sí, pero no la trajo", "No tiene medicación"] },
      { key: "antecedente_col", label: "¿Antecedente de endometriosis o dismenorrea severa?", type: "select", options: ["No", "Sí", "No sabe"] },
      { key: "dia_ciclo",       label: "Día del ciclo menstrual",           type: "select", options: ["Día 1-2 (inicio)", "Día 3-4", "Día 5+", "No sabe"] },
    ],
    actions: ["Reposo en posición fetal (piernas flexionadas).", "Calor local en abdomen bajo si se dispone.", "Hidratación adecuada.", "Si tiene medicación habitual: facilitar su toma.", "Si dolor es incapacitante o fuera de lo habitual: evaluar causas ginecológicas."] },

  fiebre: { label: "Fiebre / Temperatura elevada", color: "orange", icon: "🌡️",
    questions: [
      { key: "temp_medida",     label: "Temperatura medida (°C)",           type: "number" },
      { key: "inicio_fiebre",   label: "¿Cuándo comenzó la fiebre?",        type: "select", options: ["Hoy, hace pocas horas", "Ayer", "Hace 2-3 días", "Hace más de 3 días"] },
      { key: "sintomas_fiebre", label: "Síntomas acompañantes",             type: "select", options: ["Solo fiebre", "Fiebre + escalofríos", "Fiebre + dolor de cabeza", "Fiebre + dolor corporal generalizado", "Fiebre + tos / síntomas respiratorios", "Fiebre + dolor abdominal", "Fiebre + erupción en piel"] },
      { key: "exposicion_calor",label: "¿Estuvo expuesto a calor intenso o sol prolongado?", type: "select", options: ["No", "Sí, calor ambiental", "Sí, sol directo por más de 1 hora"] },
      { key: "medicacion_fiebre",label: "¿Tomó algún medicamento?",         type: "select", options: ["No", "Sí, paracetamol / ibuprofeno", "Sí, otro"] },
    ],
    actions: ["Retirar al trabajador de ambiente caluroso o soleado.", "Hidratación abundante con agua o suero.", "Aplicar paños húmedos en frente y cuello.", "Medir temperatura con termómetro si no fue medida.", "Si temperatura ≥ 39°C o no cede: derivar a emergencia.", "Si hay sospecha de golpe de calor (sin sudoración + confusión): emergencia inmediata."] },

  ocular: { label: "Ocular (Ojo / Visión)", color: "blue", icon: "👁️",
    questions: [
      { key: "tipo_ocular",     label: "¿Qué ocurre con el ojo?",           type: "select", options: ["Irritación / Picazón", "Cuerpo extraño (partícula, polvo, metal)", "Salpicadura de producto químico", "Golpe directo en el ojo", "Visión borrosa súbita", "Ojo rojo con secreción"] },
      { key: "ojo_afectado",    label: "¿Qué ojo está afectado?",           type: "select", options: ["Ojo derecho", "Ojo izquierdo", "Ambos ojos"] },
      { key: "dolor_ocular",    label: "Nivel de dolor ocular (1-10)",      type: "number" },
      { key: "vision_afectada", label: "¿Tiene afectación de la visión?",   type: "select", options: ["No, ve bien", "Visión borrosa leve", "Visión muy borrosa o reducida", "No puede ver por ese ojo"] },
      { key: "froto_ojo",       label: "¿Se frotó el ojo?",                 type: "select", options: ["No", "Sí"] },
    ],
    actions: ["NO frotar el ojo bajo ninguna circunstancia.", "Si hay cuerpo extraño: lavado abundante con suero fisiológico o agua limpia por 15 min.", "Si fue salpicadura química: lavado inmediato y prolongado (20 min mínimo).", "Si fue golpe directo: cubrir con gasa SIN presión y derivar a oftalmología.", "Si hay pérdida de visión: emergencia inmediata."] },

  dermato: { label: "Dermatológico (Piel)", color: "green", icon: "🧴",
    questions: [
      { key: "tipo_dermato",    label: "¿Qué ocurre en la piel?",           type: "select", options: ["Erupción / Sarpullido", "Picadura de insecto", "Quemadura solar", "Quemadura por calor / vapor", "Dermatitis / Seca o irritada", "Ampolla", "Enrojecimiento localizado", "Urticaria (ronchas con picazón)"] },
      { key: "zona_piel",       label: "Zona afectada",                     type: "select", options: ["Cara", "Cuello", "Brazos / Manos", "Tronco (pecho / espalda)", "Piernas / Pies", "Múltiples zonas"] },
      { key: "contacto_quim",   label: "¿Hubo contacto con alguna sustancia?", type: "select", options: ["No", "Productos de limpieza", "Aceite / lubricante", "Cemento / cal", "Planta o vegetal", "Otro producto químico"] },
      { key: "picazon",         label: "¿Hay picazón intensa?",             type: "select", options: ["No", "Leve", "Intensa, no puede evitar rascarse"] },
      { key: "exten_piel",      label: "Extensión de la lesión",            type: "select", options: ["Pequeña (puntual)", "Moderada (una zona)", "Extensa (varias zonas del cuerpo)"] },
    ],
    actions: ["Retirar al trabajador de la fuente de exposición.", "Lavar la zona afectada con agua y jabón neutro.", "NO reventar ampollas.", "Si fue quemadura: enfriar con agua (no hielo) durante 10-20 min.", "Si hay urticaria extensa o dificultad para respirar: emergencia alérgica inmediata.", "Registrar el producto de contacto para el informe."] },

  estres: { label: "Estrés / Ansiedad", color: "purple", icon: "😰",
    questions: [
      { key: "sintomas_estres",  label: "Síntomas presentes",               type: "select", options: ["Nerviosismo / Inquietud", "Palpitaciones / Taquicardia", "Sensación de ahogo o falta de aire", "Temblor de manos", "Llanto o crisis emocional", "Mareo / sensación de desmayo", "Dolor de pecho con ansiedad"] },
      { key: "causa_estres",     label: "¿Identifica alguna causa?",        type: "select", options: ["Sobrecarga de trabajo", "Conflicto con compañero o jefe", "Problema personal o familiar", "Noticia impactante reciente", "No identifica causa", "Prefiere no decir"] },
      { key: "intensidad_estres",label: "Intensidad del malestar (1-10)",   type: "number" },
      { key: "episodio_previo",  label: "¿Ha tenido episodios similares antes?", type: "select", options: ["No, es la primera vez", "Sí, ocasionalmente", "Sí, con frecuencia"] },
      { key: "puede_trabajar_e", label: "¿Puede continuar con sus actividades?", type: "select", options: ["Sí", "No, necesita un momento", "No, requiere atención"] },
    ],
    actions: ["Llevar a zona tranquila, alejada del ruido y compañeros.", "Respiración guiada: inhalar 4s, sostener 4s, exhalar 6s.", "Hablar con calma y sin minimizar lo que siente.", "Medir signos vitales (PA, FC, saturación).", "Si hay dolor de pecho intenso: descartar causa cardiaca antes de atribuirlo a ansiedad.", "Evaluar necesidad de apoyo psicológico o psiquiátrico."] },

  quimico: { label: "Exposición Química / Intoxicación", color: "red", icon: "☠️",
    questions: [
      { key: "tipo_exposicion",  label: "Tipo de exposición",               type: "select", options: ["Inhalación de gases / vapores", "Contacto con piel", "Salpicadura en ojos", "Ingesta accidental", "Contacto con múltiples vías"] },
      { key: "sustancia",        label: "Sustancia involucrada (si se sabe)", type: "text" },
      { key: "tiempo_expo",      label: "Tiempo de exposición",             type: "select", options: ["Segundos (accidente puntual)", "Minutos", "Horas (exposición prolongada)"] },
      { key: "sint_quimico",     label: "Síntomas actuales",                type: "select", options: ["Sin síntomas aún", "Irritación nariz / garganta", "Náuseas o vómitos", "Mareo o dolor de cabeza", "Ardor en piel u ojos", "Dificultad para respirar", "Pérdida de conciencia momentánea"] },
      { key: "ficha_seguridad",  label: "¿Se dispone de ficha de seguridad (MSDS)?", type: "select", options: ["Sí, se obtuvo", "No, no se encuentra", "No se sabe"] },
    ],
    actions: ["Retirar INMEDIATAMENTE al trabajador de la zona de exposición.", "Si fue inhalación: llevar a área ventilada o aire libre.", "Si fue contacto en piel u ojos: lavado abundante con agua (15-20 min mínimo).", "NO inducir el vómito si hubo ingesta, salvo indicación médica.", "Obtener la ficha de seguridad del producto (MSDS) para el médico.", "Llamar a CENEPRED / toxicología si se desconoce el agente: 117 (SAMU).", "Monitorear signos vitales cada 10 minutos."] },
};

export const CATEGORIAS_RIESGO = [
  "Trabajos en altura","Riesgo eléctrico","Espacios confinados","Cargas suspendidas / Izaje",
  "Falta de EPPs","Maquinaria / Equipos en movimiento","Peligro de incendio / explosión",
  "Riesgo biológico / sanitario","Sustancias químicas","Otro",
];

export const DETALLES_ESPECIFICOS = {
  "SST-Acto": ["No usar EPP adecuado","Operar equipo sin autorización","Trabajar en posición insegura","No seguir procedimiento establecido","Uso inadecuado de herramientas","Desorden en área de trabajo","No aislar o bloquear energía","Broma o distracción en trabajo","Otro"],
  "SST-Condición": ["EPP en mal estado o sin EPP","Señalización inadecuada o ausente","Iluminación deficiente","Superficie irregular / resbaladiza","Herramientas o equipos defectuosos","Instalaciones eléctricas expuestas","Área de trabajo desordenada","Escalera o andamio inseguro","Otro"],
  "M. Ambiente-Acto": ["Manejo inadecuado de residuos","Derrame no reportado","Quema no autorizada","Disposición incorrecta de sustancias","Otro"],
  "M. Ambiente-Condición": ["Derrame de sustancias","Contaminación de agua o suelo","Residuos mal dispuestos","Ruido excesivo","Otro"],
};

export const PROGRAMAS_SO = [
  { key: "1. Documentación SST",       color: "blue",   icon: "📋" },
  { key: "2. Capacitaciones",           color: "purple", icon: "🎓" },
  { key: "3. Vigilancia de Salud",      color: "emerald",icon: "🩺" },
  { key: "4. Evaluación de Puestos",    color: "orange", icon: "🔬" },
  { key: "5. Estilos de Vida Saludable",color: "green",  icon: "💚" },
  { key: "6. Riesgos Disergonómicos",   color: "red",    icon: "⚠️" },
  { key: "7. Salud Mental",             color: "violet", icon: "🧠" },
];

export const NIVEL_RIESGO_DESC = {
  Bajo: "Condición o acto subestándar que de no controlarse podría causar lesiones menores o daños leves al ambiente. No requiere paro de operaciones.",
  Medio: "Condición o acto subestándar que de no implementarse controles podría generar lesiones con incapacidad temporal tales como fracturas menores. Podría generar daños reversibles a la salud como dermatitis, trastornos musculoesqueléticos, etc.",
  Alto: "Condición o acto subestándar que de no controlarse podría causar una lesión grave, incapacitante permanente o fatal. Requiere paro inmediato de operaciones.",
};

export const RED_FLAGS_TRIAJE = [
  { flag: "Caída de altura (> 1.8m)",           desc: "Alto riesgo de trauma craneal o lesión vertebral. INMOVILIZAR al paciente y NO moverlo hasta llegada de emergencias." },
  { flag: "Electrocución / Descarga eléctrica",  desc: "Riesgo de paro cardíaco diferido y quemaduras internas. Requiere evaluación médica urgente aunque el paciente 'se vea bien'." },
  { flag: "Dolor de pecho opresivo + sudor frío",desc: "Señal clásica de infarto de miocardio. Tiempo crítico: máx. 10 min para activar cadena de emergencias. No administrar nada sin indicación." },
  { flag: "Dificultad respiratoria severa",      desc: "Saturación probablemente < 90%. El paciente no puede hablar frases completas. Riesgo vital inminente, activar emergencias de inmediato." },
  { flag: "Pérdida de fuerza en un lado del cuerpo", desc: "Posible ACV (derrame cerebral). Cada minuto sin atención daña neuronas. Actuar en la primera hora es crítico para reducir secuelas." },
  { flag: "Pérdida de conciencia / Desmayo",     desc: "Puede indicar arritmia, hipoglucemia severa, trauma craneal u otras causas graves. No dejar solo al paciente. Posición de seguridad." },
  { flag: "Sangrado profuso que no se detiene",  desc: "Riesgo de shock hipovolémico. Aplicar presión directa firme y constante sobre la herida y activar traslado urgente de inmediato." },
  { flag: "Golpe directo en el ojo",             desc: "Riesgo de desprendimiento de retina o hemorragia intraocular. NO frotar el ojo. Cubrir con gasa SIN presión y trasladar a oftalmología." },
];

export const MESES_SO = ["MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
export const ESTADO_SO_COLOR = { Programado:"gray","En proceso":"amber",Completado:"green",Cancelado:"red" };
export const MES_ACTUAL = new Date().toLocaleString("es-PE",{month:"short"}).toUpperCase().replace(".","").slice(0,3);
