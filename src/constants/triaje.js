export const TRIAJE_CATS = {
  accidente:   { label: "Accidente Laboral",           color: "orange", icon: "🦺",
    questions: [
      { key: "tipo_accidente", label: "Tipo de suceso", type: "select", options: ["Caída a nivel (tropezón)", "Caída de altura", "Corte / Herida abierta", "Golpe por objeto", "Atrapamiento", "Quemadura Química/Térmica", "Contacto Eléctrico"] },
      { key: "zona_lesion",    label: "Parte del cuerpo afectada", type: "text" },
      { key: "hora_suceso",    label: "Hora exacta del accidente", type: "time" },
      { key: "testigos",       label: "¿Hubo testigos?", type: "select", options: ["Sí", "No", "No sabe"] },
    ],
    actions: ["Asegurar la escena (detener máquinas, bloquear energía).", "NO mover al herido si se sospecha lesión en columna o fractura.", "Tomar fotos del lugar antes de limpiar.", "Notificar al Jefe Directo y RRHH.", "Activar SCTR si el caso requiere traslado externo."] },
  respiratorio:{ label: "Respiratorio (Gripe, Tos)",   color: "blue",   icon: "🌬️",
    questions: [
      { key: "tipo_tos",         label: "Tipo de tos", type: "select", options: ["Sin tos", "Seca", "Con flema transparente", "Con flema verde/amarilla"] },
      { key: "dolor_garganta",   label: "¿Dolor de garganta?", type: "select", options: ["No", "Leve", "Intenso al pasar saliva"] },
      { key: "dificultad_resp",  label: "¿Dificultad para respirar?", type: "select", options: ["No", "Leve al caminar rápido", "Sí, incluso en reposo"] },
    ],
    actions: ["Colocar mascarilla al paciente inmediatamente.", "Aislar en zona ventilada.", "Ofrecer agua si hay tos seca intensa.", "Medir saturación de oxígeno obligatoriamente."] },
  digestivo:   { label: "Digestivo (Náuseas, Diarrea)", color: "green",  icon: "🤢",
    questions: [
      { key: "dolor_abd",     label: "Ubicación del dolor", type: "select", options: ["Sin dolor abdominal", "Boca del estómago", "Alrededor del ombligo", "Bajo vientre"] },
      { key: "ultima_comida", label: "¿Qué comió en la última comida?", type: "text" },
      { key: "episodios",     label: "Nro de vómitos/deposiciones hoy", type: "text" },
    ],
    actions: ["Reposo con piernas flexionadas.", "Tener recipiente cerca por si hay vómitos.", "NO dar alimentos ni analgésicos sin indicación médica."] },
  musculo:     { label: "Musculoesquelético",           color: "purple", icon: "💪",
    questions: [
      { key: "origen",      label: "Origen del dolor", type: "select", options: ["Esfuerzo / Carga pesada", "Mala postura", "Despertó con el dolor", "Movimiento repetitivo", "Golpe directo"] },
      { key: "intensidad",  label: "Intensidad del dolor (1-10)", type: "number" },
      { key: "limitacion",  label: "¿Puede mover la zona?", type: "select", options: ["Sí, normal", "Sí, pero con dolor", "No, está trabado o inflamado"] },
    ],
    actions: ["Reposo en posición antálgica (la que duela menos).", "Si no hay inflamación: calor local.", "Si hay inflamación o golpe: frío local.", "Evaluar ergonomía del puesto de trabajo."] },
  cefalea:     { label: "Cefalea (Dolor de Cabeza)",    color: "yellow", icon: "🤕",
    questions: [
      { key: "ubicacion_cab", label: "Parte de la cabeza", type: "select", options: ["Toda la cabeza", "Solo un lado", "Frente / Senos", "Nuca"] },
      { key: "fotofobia",     label: "¿Le molesta la luz o el ruido?", type: "select", options: ["No", "Sí, mucho"] },
      { key: "tipo_dolor",    label: "Tipo de dolor", type: "select", options: ["Opresivo (como casco)", "Punzante / Latido", "Eléctrico / Calambre"] },
    ],
    actions: ["Llevar a zona oscura y silenciosa.", "Ofrecer agua (hidratación).", "Verificar Presión Arterial nuevamente.", "Preguntar si tiene antecedente de migraña."] },
  heridas:     { label: "Heridas / Curaciones",         color: "red",    icon: "🩹",
    questions: [
      { key: "objeto",   label: "¿Qué causó la lesión?", type: "text" },
      { key: "tetanos",  label: "¿Vacuna antitetánica vigente?", type: "select", options: ["Sí", "No", "No sabe"] },
      { key: "aspecto",  label: "Aspecto de la herida", type: "select", options: ["Superficial (solo piel)", "Profunda (tejido visible)", "Sucia / Infectada (pus o enrojecida)"] },
    ],
    actions: ["Lavar con abundante agua corriente y jabón.", "Cubrir con gasa estéril.", "Si es profunda: no usar algodón, evaluar si requiere sutura.", "Verificar estado vacunal antitetánico."] },
  menstrual:   { label: "Cólicos Menstruales",          color: "pink",   icon: "🌸",
    questions: [
      { key: "intensidad_col", label: "Intensidad del dolor (1-10)", type: "number" },
      { key: "sintomas_asoc",  label: "Síntomas acompañantes", type: "select", options: ["Solo dolor", "Dolor + náuseas", "Dolor + mareo", "Dolor + vómitos", "Dolor intenso incapacitante"] },
      { key: "dia_ciclo",      label: "Día del ciclo menstrual", type: "select", options: ["Día 1-2 (inicio)", "Día 3-4", "Día 5+", "No sabe"] },
    ],
    actions: ["Reposo en posición fetal (piernas flexionadas).", "Calor local en abdomen bajo si se dispone.", "Hidratación adecuada.", "Preguntar si tiene medicación habitual para cólicos."] },
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
