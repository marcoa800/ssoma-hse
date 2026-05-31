export const VIG_GUIAS = {
  fatiga: {
    titulo: "Fatiga y Somnolencia",
    campos: [
      { campo: "Trabajador", desc: "Selecciona el trabajador de la lista", ejemplo: "García López, Juan", req: true },
      { campo: "Fecha evaluación", desc: "Fecha en que se aplicó la escala", ejemplo: "2026-05-10", req: true },
      { campo: "Turno", desc: "Turno de trabajo al momento de la evaluación", ejemplo: "Día / Tarde / Noche", req: true },
      { campo: "Score Epworth", desc: "Puntaje total de la Escala de Somnolencia de Epworth (0–24)", ejemplo: "8", req: true },
      { campo: "Horas sueño promedio", desc: "Promedio de horas dormidas por noche", ejemplo: "6.5", req: false },
      { campo: "Nivel de actividad", desc: "Intensidad física del trabajo", ejemplo: "Sedentaria / Moderada / Activa / Muy activa", req: false },
      { campo: "Observaciones", desc: "Notas clínicas relevantes", ejemplo: "Refiere dificultad para dormir", req: false },
      { campo: "Médico responsable", desc: "Nombre del profesional que evaluó", ejemplo: "Dr. Marco Melgarejo", req: false },
    ]
  },
  psicosocial: {
    titulo: "Riesgos Psicosociales",
    campos: [
      { campo: "Trabajador", desc: "Selecciona el trabajador de la lista", ejemplo: "García López, Juan", req: true },
      { campo: "Fecha evaluación", desc: "Fecha de aplicación del instrumento", ejemplo: "2026-05-10", req: true },
      { campo: "Instrumento", desc: "Herramienta de evaluación psicosocial utilizada", ejemplo: "ISTAS21 / GHQ-12 / PHQ-9 / Otro", req: true },
      { campo: "Puntaje", desc: "Puntaje obtenido según el instrumento", ejemplo: "32", req: false },
      { campo: "Nivel de riesgo", desc: "Clasificación de riesgo resultante", ejemplo: "Bajo / Medio / Alto / Muy Alto", req: true },
      { campo: "Dimensión principal", desc: "Dimensión psicosocial más afectada", ejemplo: "Carga de trabajo / Relaciones interpersonales", req: false },
      { campo: "Derivación", desc: "Indica si el trabajador fue derivado a atención especializada", ejemplo: "No aplica / Psicología / Psiquiatría", req: false },
      { campo: "Médico responsable", desc: "Nombre del profesional evaluador", ejemplo: "Dr. Marco Melgarejo", req: false },
    ]
  },
  disergonomia: {
    titulo: "Riesgos Disergonómicos",
    campos: [
      { campo: "Trabajador", desc: "Selecciona el trabajador de la lista", ejemplo: "García López, Juan", req: true },
      { campo: "Fecha evaluación", desc: "Fecha de la evaluación ergonómica", ejemplo: "2026-05-10", req: true },
      { campo: "Área / Puesto", desc: "Área de trabajo o puesto evaluado", ejemplo: "Línea de producción / Almacén", req: false },
      { campo: "Tipo de riesgo", desc: "Tipo de riesgo ergonómico identificado", ejemplo: "Postural / Carga física / Movimientos repetitivos / Vibración", req: true },
      { campo: "Método de evaluación", desc: "Metodología aplicada para la evaluación", ejemplo: "REBA / RULA / OWAS / NIOSH", req: true },
      { campo: "Puntuación", desc: "Puntaje obtenido según el método", ejemplo: "9", req: false },
      { campo: "Nivel de riesgo", desc: "Clasificación del nivel de riesgo ergonómico", ejemplo: "Bajo / Medio / Alto / Muy Alto", req: true },
      { campo: "Medidas adoptadas", desc: "Controles implementados o recomendados", ejemplo: "Rediseño de puesto, rotación de tareas", req: false },
      { campo: "Próximo control", desc: "Fecha programada para re-evaluación", ejemplo: "2026-08-10", req: false },
      { campo: "Médico responsable", desc: "Profesional a cargo de la evaluación", ejemplo: "Dr. Marco Melgarejo", req: false },
    ]
  },
  auditiva: {
    titulo: "Protección Auditiva",
    campos: [
      { campo: "Trabajador", desc: "Selecciona el trabajador de la lista", ejemplo: "García López, Juan", req: true },
      { campo: "Fecha evaluación", desc: "Fecha del control auditivo", ejemplo: "2026-05-10", req: true },
      { campo: "Área / Puesto", desc: "Área de exposición a ruido", ejemplo: "Planta de producción", req: false },
      { campo: "dB de exposición", desc: "Nivel de ruido al que está expuesto en su puesto (dB)", ejemplo: "88", req: false },
      { campo: "Tipo EPP auditivo", desc: "Protección auditiva asignada", ejemplo: "Tapones auditivos / Orejeras", req: false },
      { campo: "Fecha audiometría", desc: "Fecha en que se realizó la audiometría", ejemplo: "2026-03-10", req: false },
      { campo: "Resultado audiometría", desc: "Resultado clínico de la audiometría", ejemplo: "Normal / Hipoacusia leve / Hipoacusia moderada / Hipoacusia severa", req: false },
      { campo: "OD (dB)", desc: "Umbral auditivo oído derecho en dB", ejemplo: "20", req: false },
      { campo: "OI (dB)", desc: "Umbral auditivo oído izquierdo en dB", ejemplo: "25", req: false },
      { campo: "Próximo control", desc: "Fecha del próximo control auditivo", ejemplo: "2027-03-10", req: false },
      { campo: "Médico responsable", desc: "Profesional a cargo", ejemplo: "Dr. Marco Melgarejo", req: false },
    ]
  },
  gestante: {
    titulo: "Vigilancia de la Trabajadora Gestante",
    campos: [
      { campo: "Trabajadora", desc: "Selecciona la trabajadora de la lista", ejemplo: "García López, María", req: true },
      { campo: "Fecha registro", desc: "Fecha en que se registra el caso", ejemplo: "2026-05-01", req: true },
      { campo: "Semana gestacional", desc: "Semanas de embarazo al momento del registro", ejemplo: "18", req: false },
      { campo: "Fecha probable de parto", desc: "Fecha estimada de parto (FPP)", ejemplo: "2026-10-15", req: false },
      { campo: "Estado", desc: "Estado actual del embarazo/caso", ejemplo: "Gestante / Post-parto / Lactancia / Cerrado", req: true },
      { campo: "Restricciones", desc: "Restricciones laborales por el embarazo", ejemplo: "No levantar >3kg. No exposición a químicos.", req: false },
      { campo: "Próximo control", desc: "Fecha del próximo control médico", ejemplo: "2026-06-01", req: false },
      { campo: "Médico responsable", desc: "Profesional a cargo del seguimiento", ejemplo: "Dr. Marco Melgarejo", req: false },
    ]
  },
  estilosVida: {
    titulo: "Estilos de Vida Saludable",
    campos: [
      { campo: "Trabajador", desc: "Selecciona el trabajador de la lista", ejemplo: "García López, Juan", req: true },
      { campo: "Fecha evaluación", desc: "Fecha de la evaluación de hábitos", ejemplo: "2026-05-10", req: true },
      { campo: "Peso (kg)", desc: "Peso corporal en kilogramos", ejemplo: "78", req: false },
      { campo: "Talla (m)", desc: "Estatura en metros", ejemplo: "1.72", req: false },
      { campo: "Perímetro abdominal (cm)", desc: "Medida de cintura en centímetros", ejemplo: "88", req: false },
      { campo: "PA Sistólica", desc: "Presión arterial sistólica (mmHg)", ejemplo: "120", req: false },
      { campo: "PA Diastólica", desc: "Presión arterial diastólica (mmHg)", ejemplo: "80", req: false },
      { campo: "Glucosa (mg/dL)", desc: "Nivel de glucosa en sangre", ejemplo: "95", req: false },
      { campo: "Fumador", desc: "Indica si el trabajador fuma", ejemplo: "Sí / No", req: false },
      { campo: "Consume alcohol", desc: "Indica consumo de alcohol", ejemplo: "Sí / No", req: false },
      { campo: "Sedentario", desc: "Indica si lleva un estilo de vida sedentario", ejemplo: "Sí / No", req: false },
      { campo: "Nivel de actividad", desc: "Nivel de actividad física habitual", ejemplo: "Sedentaria / Leve / Moderada / Activa", req: false },
      { campo: "Médico responsable", desc: "Profesional a cargo", ejemplo: "Dr. Marco Melgarejo", req: false },
    ]
  },
  radiacionUV: {
    titulo: "Radiación Ultravioleta",
    campos: [
      { campo: "Trabajador", desc: "Selecciona el trabajador de la lista", ejemplo: "García López, Juan", req: true },
      { campo: "Fecha evaluación", desc: "Fecha del control de exposición UV", ejemplo: "2026-05-10", req: true },
      { campo: "Zona / Área", desc: "Lugar de exposición solar", ejemplo: "Patio de carga / Obra exterior", req: false },
      { campo: "Horas de exposición / día", desc: "Horas diarias de exposición directa al sol", ejemplo: "4", req: false },
      { campo: "Índice UV", desc: "Índice UV registrado en el área de trabajo", ejemplo: "8", req: false },
      { campo: "EPP asignado", desc: "Protección solar asignada", ejemplo: "Sombrero, manga larga, lentes UV", req: false },
      { campo: "Fotoprotector", desc: "FPS del fotoprotector asignado", ejemplo: "FPS 50+", req: false },
      { campo: "Próxima revisión", desc: "Fecha del próximo control de exposición", ejemplo: "2026-08-10", req: false },
      { campo: "Médico responsable", desc: "Profesional a cargo", ejemplo: "Dr. Marco Melgarejo", req: false },
    ]
  },
  respiratoria: {
    titulo: "Protección Respiratoria",
    campos: [
      { campo: "Trabajador", desc: "Selecciona el trabajador de la lista", ejemplo: "García López, Juan", req: true },
      { campo: "Fecha evaluación", desc: "Fecha del control de protección respiratoria", ejemplo: "2026-05-10", req: true },
      { campo: "Agente de exposición", desc: "Contaminante al que está expuesto el trabajador", ejemplo: "Polvo de sílice / Gases / Material particulado", req: false },
      { campo: "Tipo de respirador", desc: "Respirador asignado según el riesgo", ejemplo: "N95 / Respirador con filtros / Mascarilla quirúrgica", req: false },
      { campo: "Prueba de ajuste", desc: "¿Se realizó prueba de ajuste del respirador?", ejemplo: "Aprobada / Reprobada / Pendiente", req: false },
      { campo: "Fecha prueba de ajuste", desc: "Fecha en que se realizó la prueba de ajuste", ejemplo: "2026-03-10", req: false },
      { campo: "Espirometría", desc: "Resultado de la prueba espirométrica", ejemplo: "Normal / Patrón obstructivo / Patrón restrictivo / Pendiente", req: false },
      { campo: "Fecha espirometría", desc: "Fecha en que se realizó la espirometría", ejemplo: "2026-03-10", req: false },
      { campo: "Próximo control", desc: "Fecha del próximo control respiratorio", ejemplo: "2026-11-10", req: false },
      { campo: "Médico responsable", desc: "Profesional a cargo", ejemplo: "Dr. Marco Melgarejo", req: false },
    ]
  },
};
