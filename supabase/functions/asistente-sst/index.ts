// ════════════════════════════════════════════════════════════════════
//  asistente-sst — Supabase Edge Function
//  Asistente IA SSOMA. Los PROMPTS viven aquí (ocultos, nunca en el
//  frontend). Recibe { promptId, params }, arma el prompt internamente,
//  llama a Groq (gratis, rápido) y devuelve solo el texto generado.
//  100 prompts en 10 categorías, adaptados a normativa peruana.
// ════════════════════════════════════════════════════════════════════
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const GROQ_KEY = Deno.env.get("GROQ_API_KEY") || "";
const MODEL = "llama-3.3-70b-versatile";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Base común: rol experto + marco normativo peruano + contexto del usuario
const BASE = (p: Record<string, string>) => `Actúa como un Especialista Senior en Seguridad, Salud Ocupacional y Medio Ambiente (SSOMA) con más de 15 años de experiencia en la industria peruana, con dominio de la Ley N° 29783 (Ley de SST), su Reglamento DS N° 005-2012-TR, la RM N° 050-2013-TR y la normativa ambiental peruana aplicable.

Contexto de la evaluación:
- Actividad / tema: ${p.actividad || "(no especificado)"}
- Área / proceso: ${p.area || "(no especificada)"}
- Entorno / contexto: ${p.entorno || "(no especificado)"}
- N° de trabajadores: ${p.n_trabajadores || "(no especificado)"}
- Detalles adicionales: ${p.detalle || "(ninguno)"}

Requisitos de salida:
- Redacta en español técnico, claro y accionable, listo para un expediente SSOMA en Perú.
- Cita la base legal peruana específica aplicable cuando corresponda.
- Aplica, cuando sea pertinente, la jerarquía de controles del Art. 21 de la Ley 29783 (eliminación, sustitución, controles de ingeniería, controles administrativos/señalización, EPP).
- Estructura la respuesta con encabezados y tablas en formato Markdown.`;

// PROMPTS OCULTOS — 100 herramientas en 10 categorías
const PROMPTS: Record<string, (p: Record<string, string>) => string> = {

  // ───────────── 1. Matriz IPERC Continua ─────────────
  tareas_criticas: (p) => `${BASE(p)}

OBJETIVO: Realiza el análisis de la TAREA CRÍTICA indicada.
1. Descomposición secuencial detallada de la actividad (pasos preparatorios, ejecución, cierre, orden y limpieza).
2. Por cada paso: peligros, energías peligrosas (cinética, eléctrica, neumática, gravitacional, química, térmica), riesgos asociados y posibles fallas del sistema.
3. Valoración del riesgo con matriz IPERC 5x5 (probabilidad y severidad justificadas).
4. Medidas de control siguiendo la jerarquía de controles, priorizando eliminación/sustitución.
5. Tabla IPERC resumen y recomendaciones finales.`,

  peligros_psicosociales: (p) => `${BASE(p)}

OBJETIVO: CLASIFICACIÓN de PELIGROS PSICOSOCIALES de la actividad/área (marco de la RM 375-2008-TR y enfoque de factores psicosociales).
1. Identifica factores psicosociales (carga mental, demandas, control, jornada, relaciones, violencia/hostigamiento, etc.).
2. Clasifícalos y describe sus posibles efectos en la salud.
3. Valora con matriz 5x5 y propone controles (organizacionales y administrativos) según jerarquía de controles.
4. Tabla resumen.`,

  probabilidad_incidentes: (p) => `${BASE(p)}

OBJETIVO: ESTIMACIÓN DE LA PROBABILIDAD de incidentes para la actividad.
1. Define los criterios de probabilidad (exposición, controles existentes, capacitación, frecuencia) según matriz IPERC 5x5.
2. Estima la probabilidad para los principales peligros, justificando cada nivel.
3. Cruza con severidad estimada para obtener el nivel de riesgo.
4. Tabla con peligro, probabilidad (1-5), severidad (1-5), nivel de riesgo y prioridad.`,

  riesgos_ergonomicos: (p) => `${BASE(p)}

OBJETIVO: EVALUACIÓN DE RIESGOS ERGONÓMICOS (marco RM 375-2008-TR — Norma Básica de Ergonomía).
1. Identifica factores de riesgo disergonómico (posturas, manipulación manual de cargas, movimientos repetitivos, esfuerzo, ambiente).
2. Recomienda el método de evaluación pertinente (RULA, REBA, NIOSH, OWAS según el caso) y explica por qué.
3. Valora el riesgo y propone controles según jerarquía.
4. Tabla resumen.`,

  peligros_mecanicos: (p) => `${BASE(p)}

OBJETIVO: IDENTIFICACIÓN DE PELIGROS MECÁNICOS (equipos, máquinas, herramientas).
1. Identifica peligros mecánicos (atrapamiento, corte, proyección, aplastamiento, golpes) por equipo/máquina.
2. Evalúa el riesgo con matriz 5x5.
3. Propone controles: resguardos, dispositivos de seguridad, bloqueo y etiquetado (LOTO), procedimientos.
4. Tabla IPERC.`,

  peligros_biologicos: (p) => `${BASE(p)}

OBJETIVO: INVENTARIO DE PELIGROS BIOLÓGICOS.
1. Identifica agentes biológicos potenciales (virus, bacterias, hongos, parásitos) según la actividad y entorno.
2. Clasifica por grupo de riesgo y vía de exposición.
3. Valora y propone controles (bioseguridad, EPP, vigilancia médica) según jerarquía.
4. Tabla resumen.`,

  controles_quimicos: (p) => `${BASE(p)}

OBJETIVO: JERARQUÍA DE CONTROLES para PELIGROS QUÍMICOS.
1. Identifica las sustancias químicas involucradas y sus peligros (usar referencia a Hojas de Datos de Seguridad / SDS).
2. Evalúa exposición y riesgo.
3. Desarrolla controles aplicando ESTRICTAMENTE la jerarquía (eliminación, sustitución, ingeniería, administrativos, EPP), con ejemplos concretos.
4. Tabla con sustancia, peligro, control por nivel jerárquico.`,

  control_electrico: (p) => `${BASE(p)}

OBJETIVO: MEDIDAS DE CONTROL para RIESGO ELÉCTRICO (marco RM 111-2013-MEM/DM — Reglamento de Seguridad y Salud en el Trabajo con Electricidad, cuando aplique).
1. Identifica peligros eléctricos (contacto directo/indirecto, arco eléctrico, cortocircuito).
2. Evalúa el riesgo.
3. Propón controles: diseño, puesta a tierra, bloqueo y etiquetado, distancias de seguridad, EPP dieléctrico, procedimientos de trabajos eléctricos.
4. Tabla resumen.`,

  riesgos_residuales: (p) => `${BASE(p)}

OBJETIVO: REEVALUACIÓN DE RIESGOS RESIDUALES (tras aplicar controles).
1. Para los principales peligros, indica el riesgo inicial (5x5) y el riesgo residual luego de los controles propuestos.
2. Verifica si el riesgo residual es tolerable; si no, propón controles adicionales.
3. Define responsables y periodicidad de seguimiento.
4. Tabla: peligro, riesgo inicial, control, riesgo residual, ¿tolerable?, acción.`,

  severidad_locativa: (p) => `${BASE(p)}

OBJETIVO: VALORACIÓN DE SEVERIDAD de PELIGROS LOCATIVOS (instalaciones, pisos, escaleras, orden y limpieza, almacenamiento, señalización).
1. Identifica peligros locativos del área.
2. Valora la severidad y probabilidad (matriz 5x5), justificando.
3. Propón controles según jerarquía.
4. Tabla IPERC resumen.`,

  // ───────────── 2. Análisis e Investigación de Accidentes ─────────────
  inv_fallas_sistemicas: (p) => `${BASE(p)}

OBJETIVO: Identificar las fallas del Sistema de Gestión de SST que actuaron como causas de origen del accidente, diferenciándolas de las causas inmediatas, conforme a la obligación de investigar de la Ley 29783 Art. 42 y el DS 005-2012-TR.
1. Mapea los elementos del SG-SST involucrados: IPERC, capacitación, supervisión, mantenimiento, procedimientos de trabajo seguro (PETS) y control de contratistas.
2. Evalúa por cada elemento si existía el control, si estaba implementado y si era eficaz al momento del evento, citando el requisito legal vulnerado.
3. Determina las fallas de gestión recurrentes (controles ausentes, débiles o no verificados) que permitieron la materialización del riesgo.
4. Vincula cada falla sistémica con la causa básica y la causa inmediata correspondiente mediante una tabla de trazabilidad.
5. Prioriza las fallas según su criticidad y potencial de repetición en otras áreas o procesos.
6. Recomienda mejoras al SG-SST que ataquen la falla de origen y no solo el síntoma.`,

  inv_cronologia: (p) => `${BASE(p)}

OBJETIVO: Reconstruir la secuencia cronológica detallada de los eventos críticos previos, durante y posteriores al accidente, para establecer una línea de tiempo objetiva que sustente la investigación exigida por el DS 005-2012-TR.
1. Recopila las fuentes de información temporal: declaraciones, registros de ingreso, bitácoras, permisos de trabajo, alarmas y evidencia fotográfica.
2. Ordena los eventos en una línea de tiempo con marca horaria, desde las condiciones previas hasta la atención de la emergencia.
3. Identifica los puntos de decisión y desviaciones donde un acto o condición distinta habría evitado el evento.
4. Marca el instante exacto del contacto o liberación de energía que generó la lesión o daño.
5. Presenta la cronología en una tabla con columnas de hora, evento, actor involucrado y fuente de verificación.
6. Señala los vacíos de información temporal que requieren ser cubiertos en la fase de entrevistas.`,

  inv_factores_personales: (p) => `${BASE(p)}

OBJETIVO: Determinar los factores personales del trabajador que contribuyeron al accidente (capacidad, conocimiento, condición física o motivacional), como parte de las causas básicas según la metodología de causas inmediatas y básicas.
1. Analiza la competencia y formación del trabajador frente a la tarea: certificaciones, inducción, capacitación específica y experiencia.
2. Evalúa la condición física y mental al momento del evento: fatiga, salud ocupacional vigente, aptitud médica y posible estrés.
3. Revisa factores de comportamiento: percepción del riesgo, presión por producción, hábitos inseguros o normalización de la desviación.
4. Distingue entre factor personal y falla de gestión (p. ej. falta de capacitación es responsabilidad del empleador, no del trabajador).
5. Documenta cada factor personal con su evidencia objetiva, evitando juicios de culpabilidad.
6. Relaciona los factores personales hallados con las acciones correctivas formativas o de supervisión correspondientes.`,

  inv_ishikawa: (p) => `${BASE(p)}

OBJETIVO: Construir un diagrama de Ishikawa (causa-efecto) bajo el enfoque de las 6M para organizar y visualizar las causas potenciales del accidente como herramienta de la investigación.
1. Define el efecto o problema central (la lesión, daño o evento) en la cabeza del diagrama.
2. Desarrolla las seis ramas: Mano de obra, Maquinaria, Método, Material, Medio ambiente y Medición.
3. Para cada M, enumera las causas potenciales identificadas mediante lluvia de ideas con el equipo investigador.
4. Profundiza cada causa potencial preguntando el porqué hasta alcanzar la causa de fondo.
5. Resalta las causas con mayor evidencia y probabilidad de haber contribuido al evento.
6. Presenta el resultado en una tabla por cada M con sus causas y nivel de contribución estimado.`,

  inv_entrevista_testigos: (p) => `${BASE(p)}

OBJETIVO: Elaborar una guía estructurada de entrevista a testigos presenciales del accidente para obtener información veraz y objetiva que alimente el registro de investigación del RM 050-2013-TR.
1. Establece las condiciones de la entrevista: prontitud tras el evento, ambiente neutral, confidencialidad y enfoque en hechos no en culpas.
2. Diseña preguntas abiertas para la narración libre del testigo sobre lo que vio, oyó e hizo antes, durante y después del evento.
3. Incluye preguntas de profundización sobre condiciones del entorno, acciones de las personas y estado de equipos.
4. Incorpora preguntas de verificación cruzada para contrastar declaraciones entre distintos testigos.
5. Define el registro de la entrevista con datos del testigo, fecha, hora y firma de conformidad.
6. Añade recomendaciones para evitar inducir respuestas o contaminar el testimonio.`,

  inv_causas_basicas: (p) => `${BASE(p)}

OBJETIVO: Identificar las causas básicas del accidente (factores personales y factores del trabajo) que subyacen a las causas inmediatas, aplicando la metodología de causalidad establecida en la práctica de investigación de la Ley 29783.
1. Parte de las causas inmediatas ya identificadas: actos subestándar y condiciones subestándar.
2. Por cada causa inmediata, pregunta el porqué para descubrir el factor personal o factor del trabajo que la originó.
3. Clasifica las causas básicas en factores personales (capacidad, conocimiento, motivación) y factores del trabajo (liderazgo, ingeniería, mantenimiento, estándares).
4. Verifica que cada causa básica sea controlable por la organización a través de su sistema de gestión.
5. Construye una tabla que enlace condición/acto inmediato con su causa básica y el control de gestión faltante.
6. Prioriza las causas básicas cuya corrección elimine también otros riesgos similares.`,

  inv_causa_raiz: (p) => `${BASE(p)}

OBJETIVO: Aplicar el método de Análisis de Causa Raíz (ACR) combinando los 5 porqués y el árbol de causas para llegar al origen real del accidente y no quedarse en causas superficiales.
1. Enuncia con precisión el evento no deseado y sus consecuencias reales y potenciales.
2. Aplica los 5 porqués de forma encadenada hasta que la respuesta apunte a una falla de gestión controlable.
3. Construye el árbol de causas conectando hechos comprobados mediante relaciones lógicas de necesidad y suficiencia.
4. Distingue las causas raíz de las causas contribuyentes y de los factores que solo agravaron el daño.
5. Valida cada causa raíz comprobando que su eliminación habría impedido el accidente.
6. Resume las causas raíz en una tabla vinculada a las acciones correctivas que las eliminan de forma definitiva.`,

  inv_acciones_correctivas: (p) => `${BASE(p)}

OBJETIVO: Proponer acciones correctivas y preventivas eficaces que eliminen las causas raíz del accidente, aplicando la jerarquía de controles y asegurando su seguimiento conforme al RM 050-2013-TR.
1. Asocia cada acción a una causa raíz o causa básica específica identificada en la investigación.
2. Formula las acciones siguiendo la jerarquía de controles: eliminación, sustitución, controles de ingeniería, administrativos y EPP.
3. Define para cada acción el responsable, el plazo, los recursos y el indicador de cumplimiento (criterio SMART).
4. Establece la verificación de eficacia posterior a la implementación, no solo la verificación de ejecución.
5. Identifica acciones extensibles a otras áreas o procesos con riesgos similares (control horizontal).
6. Consolida el plan en una tabla compatible con el registro de medidas correctivas del RM 050-2013-TR.`,

  inv_informe_preliminar: (p) => `${BASE(p)}

OBJETIVO: Redactar el informe preliminar del accidente con la información esencial recopilada en las primeras horas, atendiendo los plazos de notificación del DS 012-2014-TR y como base del registro de investigación del RM 050-2013-TR.
1. Consigna los datos generales: identificación del trabajador, fecha, hora, lugar exacto y tipo de evento (accidente, incidente peligroso o mortal).
2. Describe los hechos conocidos de forma objetiva, sin atribuir causas ni responsabilidades definitivas en esta etapa.
3. Detalla las lesiones o daños, la atención inmediata brindada y las acciones de contención adoptadas.
4. Indica si el evento es notificable y el plazo aplicable según el DS 012-2014-TR (mortal e incidente peligroso, dentro de 24 horas).
5. Lista las evidencias preservadas y las acciones inmediatas para evitar la recurrencia.
6. Señala los pasos siguientes de la investigación y la fecha estimada del informe final.`,

  inv_lecciones_aprendidas: (p) => `${BASE(p)}

OBJETIVO: Elaborar un reporte de lecciones aprendidas a partir del accidente investigado para difundir el conocimiento, prevenir la repetición y fortalecer la cultura preventiva de la organización.
1. Sintetiza de forma clara qué ocurrió, por qué ocurrió (causa raíz) y cuál fue el impacto real y potencial.
2. Extrae las lecciones clave en lenguaje sencillo, accionable y sin datos sensibles del trabajador afectado.
3. Traduce cada lección en una recomendación práctica replicable en tareas, áreas o sedes similares.
4. Define el plan de difusión: charlas de 5 minutos, capacitaciones, carteles y actualización de PETS e IPERC.
5. Establece cómo se verificará que la lección fue comprendida y aplicada por el personal.
6. Registra el reporte como evidencia de mejora continua del Sistema de Gestión de SST.`,

  // ───────────── 3. Gestión de Permisos de Trabajo (PETAR) ─────────────
  pt_soldadura_oxicorte: (p) => `${BASE(p)}

OBJETIVO: Elaborar el permiso de trabajo en caliente (soldadura y oxicorte) que controle los riesgos de incendio, explosión y exposición a humos metálicos en el área indicada, conforme a la RM 050-2013-TR (trabajos de alto riesgo - PETAR).
1. Verifica la vigencia del PETAR (turno/jornada), identifica la tarea y delimita un radio de seguridad mínimo de 11 metros, retirando o cubriendo material combustible con mantas ignífugas.
2. Inspecciona el equipo: estado de mangueras, válvulas antirretroceso (arrestallamas) en soplete y manómetros de los cilindros de oxígeno y combustible (acetileno/GLP), confirmando su almacenamiento y traslado en posición vertical y asegurada.
3. Realiza medición de gases inflamables (LEL menor a 10%) cuando exista riesgo de atmósfera explosiva y confirma la disponibilidad de extintores PQS o agua presurizada operativos y al alcance.
4. Designa por escrito al vigía de fuego (fire watch), define EPP específico (careta de soldar con filtro adecuado, mandil y escarpines de cuero, respirador para humos), y verifica la conexión a tierra del equipo de soldadura eléctrica.
5. Establece la ventilación o extracción localizada de humos y prohíbe la tarea en presencia de lluvia, vientos fuertes o cerca de sustancias inflamables sin control.
6. Registra firmas del ejecutante, supervisor y responsable del área, y programa la vigilancia posterior (mínimo 30 minutos) tras finalizar para descartar brasas o focos de ignición latentes.`,

  pt_bloqueo_energias: (p) => `${BASE(p)}

OBJETIVO: Definir el procedimiento de bloqueo y etiquetado de energías peligrosas (LOTO - Lock Out / Tag Out) para aislar fuentes de energía durante intervenciones de mantenimiento, alineado a la RM 050-2013-TR y a la RM 111-2013-MEM/DM (RESESATE) para riesgo eléctrico.
1. Identifica todas las fuentes de energía peligrosa asociadas al equipo (eléctrica, mecánica, hidráulica, neumática, térmica, gravitatoria y energía residual almacenada) y elabora el inventario de puntos de bloqueo.
2. Notifica a los trabajadores afectados, ejecuta el apagado ordenado del equipo y aísla cada fuente operando los dispositivos de corte (seccionadores, válvulas, interruptores).
3. Coloca candados y tarjetas de bloqueo personales e intransferibles en cada punto de aislamiento, aplicando bloqueo múltiple (hasp/pinza) cuando intervenga más de un trabajador.
4. Disipa o confina la energía residual (descarga de capacitores, alivio de presión, calzado/trabado de partes móviles) y verifica la condición de energía cero antes de iniciar la tarea.
5. Comprueba el aislamiento eléctrico con el método de los cinco pasos (corte, bloqueo, verificación de ausencia de tensión con detector probado, puesta a tierra y delimitación) según RM 111-2013-MEM/DM.
6. Restablece el sistema solo tras retirar cada trabajador su propio candado y tarjeta, confirmando el retiro de herramientas y la presencia segura del personal.`,

  pt_espacios_confinados: (p) => `${BASE(p)}

OBJETIVO: Elaborar el checklist de ingreso a espacios confinados que garantice condiciones atmosféricas seguras y control de acceso durante la tarea, conforme a la RM 050-2013-TR (PETAR) y buenas prácticas internacionales de atmósferas peligrosas.
1. Identifica y clasifica el espacio confinado, verifica la emisión del PETAR específico y confirma el aislamiento previo de líneas y energías (bloqueo LOTO, cegado/blindado de tuberías).
2. Realiza la medición secuencial de la atmósfera con equipo calibrado: oxígeno (rango seguro 19.5% a 23.5%), gases inflamables (LEL menor a 10%) y gases tóxicos (H2S, CO), registrando lecturas antes y durante el ingreso (monitoreo continuo).
3. Asegura ventilación forzada permanente y prohíbe el ingreso si las lecturas están fuera de rango o si no se restablecen condiciones seguras.
4. Define los roles obligatorios: entrante(s), vigía permanente en el exterior y supervisor de ingreso, con sistema de comunicación efectiva y control de entradas/salidas.
5. Verifica el equipo de rescate (trípode, arnés, línea de vida, equipo de respiración autónoma) y el plan de respuesta a emergencias con rescate sin ingreso como primera opción.
6. Registra EPP, lecturas, tiempos de permanencia y firmas; cierra el permiso al finalizar y deja constancia del egreso de todo el personal.`,

  pt_trabajos_electricos: (p) => `${BASE(p)}

OBJETIVO: Establecer el control de trabajos eléctricos para prevenir contacto directo/indirecto, arco eléctrico y electrocución durante intervenciones en instalaciones energizadas o desenergizadas, conforme a la RM 111-2013-MEM/DM (RESESATE) y la RM 050-2013-TR.
1. Clasifica la tarea (trabajo sin tensión, con tensión o en proximidad) y exige que sea ejecutada por personal calificado y autorizado, con PETAR cuando corresponda a alto riesgo.
2. Para trabajo sin tensión, aplica las cinco reglas de oro: corte efectivo, bloqueo y señalización (LOTO), verificación de ausencia de tensión, puesta a tierra y en cortocircuito, y delimitación/señalización de la zona de trabajo.
3. Determina las distancias mínimas de seguridad según el nivel de tensión y evalúa el riesgo de arco eléctrico (arc flash) para definir la categoría de EPP dieléctrico requerido.
4. Verifica EPP y herramientas certificadas: guantes dieléctricos vigentes, calzado dieléctrico, pértigas, banquetas/alfombras aislantes y vestimenta resistente al arco (FR).
5. Para trabajos con tensión, confirma procedimiento específico autorizado, personal con doble formación y supervisión permanente, prohibiendo improvisaciones.
6. Documenta la liberación de la instalación, pruebas de operatividad y retiro ordenado de puestas a tierra y bloqueos antes de reenergizar.`,

  pt_izaje_cargas: (p) => `${BASE(p)}

OBJETIVO: Definir el estándar para izaje de cargas con grúas y aparejos que controle el riesgo de caída de carga, volcadura del equipo y atrapamiento del personal, conforme a la RM 050-2013-TR (maniobras de alto riesgo) y la Norma G.050.
1. Elabora el plan de izaje (lifting plan) con peso real de la carga, centro de gravedad, radio de operación, configuración de la grúa y tabla de capacidades, definiendo si es maniobra crítica.
2. Verifica la certificación vigente del equipo, la habilitación del operador y del rigger (aparejador), y la inspección preuso de la grúa y de los accesorios de izaje (eslingas, grilletes, ganchos con seguro).
3. Evalúa el terreno y la estabilidad: nivelación, capacidad portante del suelo, uso de estabilizadores (outriggers) sobre durmientes y verificación de líneas eléctricas aéreas cercanas con sus distancias de seguridad.
4. Calcula el factor de seguridad y los ángulos de las eslingas, descartando accesorios deformados, con cortes o fuera de su carga de trabajo segura (WLL).
5. Delimita y restringe el área de maniobra (radio de giro y zona bajo la carga), prohibiendo el tránsito y permanencia de personal bajo cargas suspendidas, con vientos dentro del límite operativo.
6. Designa un único señalero (rigger) con código de señales estandarizado y comunicación por radio, deteniendo la maniobra ante cualquier condición insegura.`,

  pt_excavaciones: (p) => `${BASE(p)}

OBJETIVO: Elaborar el procedimiento para excavaciones y zanjas profundas que prevenga derrumbes, sepultamiento, caídas y contacto con instalaciones enterradas, conforme a la Norma G.050 Seguridad durante la Construcción y la RM 050-2013-TR.
1. Tramita el PETAR y verifica la identificación previa de interferencias enterradas (líneas eléctricas, gas, agua, fibra) mediante planos y detección antes de excavar.
2. Clasifica el tipo de suelo y define el sistema de protección según la profundidad: talud (ángulo de reposo), entibado o escudos (cajas de zanja), obligatorio en excavaciones de profundidad mayor a 1.50 m.
3. Establece accesos seguros (escaleras o rampas) a una distancia máxima de 7.5 m del trabajador y ubica el material excavado a más de 0.60 m del borde de la excavación.
4. Realiza monitoreo de atmósfera cuando la profundidad genere riesgo de espacio confinado (déficit de oxígeno o acumulación de gases) y controla la presencia de agua con sistemas de bombeo.
5. Coloca barreras, señalización perimetral y pasarelas con barandas para el cruce de peatones y vehículos, protegiendo los bordes contra caídas.
6. Inspecciona la excavación al inicio de cada jornada y después de lluvias, vibraciones o cualquier evento que altere la estabilidad, suspendiendo el trabajo si se detecta riesgo.`,

  pt_trabajos_altura: (p) => `${BASE(p)}

OBJETIVO: Establecer el protocolo de trabajos en altura para prevenir caídas a distinto nivel en tareas realizadas a 1.80 m o más sobre el nivel de referencia, conforme a la RM 050-2013-TR y la Norma G.050 Seguridad durante la Construcción.
1. Emite el PETAR de trabajo en altura, verifica el certificado de aptitud médica del trabajador y exige acreditación de capacitación específica para tareas en altura.
2. Prioriza medidas de protección colectiva (barandas, plataformas, líneas de vida horizontales, redes) antes de recurrir a la protección personal contra caídas.
3. Inspecciona el sistema personal de detención de caídas: arnés de cuerpo completo, línea de anclaje con absorbedor de energía y conectores, descartando equipo dañado o vencido.
4. Verifica puntos de anclaje certificados con resistencia mínima de 22.2 kN (5000 lbf) por trabajador y calcula la distancia de caída libre y el claro/espacio libre requerido para evitar impacto contra niveles inferiores.
5. Para andamios o escaleras, confirma su armado por personal competente, etiqueta de habilitación (tarjeta verde), nivelación, arriostramiento y barandas completas.
6. Delimita y señaliza la zona inferior contra caída de objetos, establece el plan de rescate en altura y suspende la tarea ante vientos fuertes, lluvia o tormenta eléctrica.`,

  pt_sustancias: (p) => `${BASE(p)}

OBJETIVO: Establecer las medidas de seguridad para el manejo, almacenamiento y trasvase de sustancias químicas peligrosas, controlando los riesgos de intoxicación, quemaduras, incendio y reacciones peligrosas, conforme a la RM 050-2013-TR y al sistema de comunicación de peligros SGA (GHS).
1. Identifica las sustancias involucradas y verifica la disponibilidad y vigencia de las Hojas de Datos de Seguridad (SDS/MSDS) en español, junto al etiquetado SGA (GHS) de los envases.
2. Define el EPP específico según la SDS (respirador con filtro adecuado, guantes y traje químico compatibles, protección facial/ocular) y confirma la operatividad de duchas y lavaojos de emergencia.
3. Verifica la compatibilidad química para el almacenamiento, segregando incompatibles (ácidos/bases, oxidantes/inflamables) y usando sistemas de contención secundaria (bandejas/cubetos) ante derrames.
4. Asegura ventilación o extracción localizada en las operaciones de trasvase, manteniendo conexión equipotencial y a tierra para líquidos inflamables que generen electricidad estática.
5. Dispone del kit antiderrames (kit SPCC), material absorbente y procedimiento de respuesta a derrames y exposición, definiendo el manejo y la disposición de residuos peligrosos.
6. Capacita al personal en peligros, primeros auxilios específicos y respuesta a emergencias, y restringe el acceso de personal no autorizado a la zona de manejo.`,

  pt_atmosferas_explosivas: (p) => `${BASE(p)}

OBJETIVO: Establecer la verificación de atmósferas explosivas o peligrosas previa y durante tareas en zonas con riesgo de inflamabilidad, deficiencia de oxígeno o presencia de gases tóxicos, conforme a la RM 050-2013-TR y buenas prácticas de medición de atmósferas.
1. Identifica las fuentes potenciales de atmósfera peligrosa (vapores inflamables, gases tóxicos, polvos combustibles, déficit/enriquecimiento de oxígeno) y clasifica el área según su riesgo.
2. Utiliza un detector multigás calibrado y con bump test vigente, respetando la secuencia de medición: oxígeno primero, luego gases inflamables (LEL) y por último gases tóxicos (H2S, CO).
3. Define los criterios de aceptación: oxígeno entre 19.5% y 23.5%, LEL menor a 10% y gases tóxicos por debajo de sus límites de exposición permisibles (TLV/LMP).
4. Establece el monitoreo continuo de la atmósfera durante toda la tarea y la regla de evacuación inmediata si las lecturas superan los umbrales o suena la alarma del equipo.
5. Verifica el uso de equipos y herramientas a prueba de explosión (intrínsecamente seguros) y antichispas, y elimina fuentes de ignición en zonas clasificadas.
6. Registra las lecturas con hora, ubicación y responsable, y documenta las acciones correctivas (ventilación, purga, inertización) aplicadas antes de autorizar el ingreso o la tarea.`,

  pt_vigia_fuego: (p) => `${BASE(p)}

OBJETIVO: Definir las responsabilidades, competencias y medios del vigía de fuego (fire watch) asignado a tareas de trabajo en caliente, para detectar y controlar oportunamente focos de ignición, conforme a la RM 050-2013-TR (trabajos de alto riesgo).
1. Designa por escrito en el PETAR a un vigía de fuego capacitado y exclusivo, sin otras tareas asignadas que lo distraigan, durante toda la ejecución del trabajo en caliente.
2. Verifica que cuente con los medios de extinción adecuados y operativos (extintor PQS, manguera o agua presurizada) y con medios de alarma/comunicación para activar la respuesta a emergencias.
3. Inspecciona el área antes de iniciar (radio de 11 m), confirmando el retiro o cubierta de combustibles y la vigilancia de niveles inferiores y adyacentes donde puedan caer chispas o escorias.
4. Mantiene observación permanente durante la tarea, conoce la ruta de evacuación y los puntos de reunión, y está facultado para detener el trabajo ante cualquier condición insegura.
5. Realiza la vigilancia posterior obligatoria por un mínimo de 30 minutos tras finalizar la tarea, verificando la ausencia de brasas, puntos calientes o focos de ignición latentes.
6. Registra el cierre de la vigilancia con firma en el permiso y reporta cualquier incidente, conato de incendio o desviación detectada durante la actividad.`,

  // ───────────── 4. Auditoría de Sistemas de Gestión ─────────────
  aud_documentacion: (p) => `${BASE(p)}

OBJETIVO: Auditar la documentación del Sistema de Gestión de Seguridad y Salud en el Trabajo (SGSST) para verificar su existencia, vigencia, control y trazabilidad conforme a la Ley 29783 Art. 43, RM 050-2013-TR e ISO 45001:2018 cláusula 7.5, aplicando las directrices de ISO 19011.
1. Inventariar la documentación obligatoria del SGSST (política, RISST, plan anual, programa anual, IPERC, mapa de riesgos, reglamento interno) y verificar su existencia frente a los requisitos de la Ley 29783 Art. 32 y RM 050-2013-TR.
2. Verificar el control de documentos según ISO 45001:2018 cláusula 7.5.2 y 7.5.3: codificación, versión vigente, fecha de aprobación, firmas de responsables y revisión periódica.
3. Confirmar la disponibilidad y accesibilidad de los documentos en los puntos de uso, así como el retiro o identificación de versiones obsoletas para evitar uso no intencionado.
4. Contrastar la coherencia entre documentos relacionados (política vs. objetivos, IPERC vs. mapa de riesgos, programa anual vs. plan anual) detectando contradicciones o vacíos.
5. Registrar hallazgos clasificándolos como no conformidad mayor, menor u observación, indicando la cláusula o artículo incumplido y la evidencia objetiva.
6. Elaborar una tabla resumen de hallazgos con acciones correctivas recomendadas, responsables sugeridos y plazos, priorizando los incumplimientos legales obligatorios.`,

  aud_matriz_requisitos: (p) => `${BASE(p)}

OBJETIVO: Auditar la conformidad de la matriz de identificación y evaluación de requisitos legales aplicables, verificando su completitud, vigencia y evaluación de cumplimiento conforme a la Ley 29783 Art. 43 e ISO 45001:2018 cláusulas 6.1.3 y 9.1.2, bajo las directrices de ISO 19011.
1. Verificar que la matriz incluya la totalidad de requisitos legales aplicables a la actividad (Ley 29783, DS 005-2012-TR, normas sectoriales y municipales) y otros requisitos suscritos por la organización.
2. Comprobar la vigencia de cada norma listada, identificando dispositivos derogados, modificados o nuevos no incorporados a la matriz.
3. Evaluar que cada requisito tenga asociada su evaluación de cumplimiento (cumple / no cumple / parcial), la evidencia que lo sustenta y el responsable designado.
4. Verificar la periodicidad de actualización de la matriz y la existencia de un procedimiento documentado de identificación y actualización de requisitos legales.
5. Detectar requisitos no cumplidos o sin evidencia, clasificándolos por nivel de riesgo legal y operativo.
6. Consolidar los hallazgos en una tabla con la base legal específica, el estado de cumplimiento, las acciones correctivas y los plazos recomendados.`,

  aud_registros: (p) => `${BASE(p)}

OBJETIVO: Auditar el control de los registros operativos obligatorios del SGSST para verificar su existencia, llenado, conservación y trazabilidad conforme a la RM 050-2013-TR (formatos referenciales), la Ley 29783 Art. 28 y los plazos de conservación del DS 005-2012-TR Art. 35, aplicando ISO 45001:2018 cláusula 7.5.3.
1. Verificar la existencia de los registros obligatorios (accidentes, enfermedades ocupacionales, exámenes médicos, monitoreos de agentes, inspecciones, estadísticas, capacitaciones, equipos de seguridad) según la RM 050-2013-TR.
2. Comprobar que cada registro use los formatos referenciales o equivalentes con los campos mínimos exigidos y se encuentre correctamente llenado y firmado.
3. Verificar el cumplimiento de los plazos de conservación establecidos en el DS 005-2012-TR Art. 35 (cinco, diez o veinte años según el tipo de registro).
4. Evaluar el control de acceso, respaldo y protección de los registros físicos y digitales contra pérdida, alteración o deterioro.
5. Verificar la trazabilidad y consistencia entre registros relacionados (investigación de accidentes vs. estadísticas, capacitaciones vs. programa anual).
6. Documentar los hallazgos en una tabla con el registro auditado, la deficiencia detectada, la base legal y la acción correctiva con plazo recomendado.`,

  aud_iso45001: (p) => `${BASE(p)}

OBJETIVO: Evaluar el grado de cumplimiento del SGSST frente a los requisitos de la norma ISO 45001:2018, identificando brechas de conformidad por cláusula y su articulación con la Ley 29783, aplicando las directrices de ISO 19011 para auditoría de sistemas de gestión.
1. Estructurar la evaluación por cláusulas de ISO 45001:2018 (4 Contexto, 5 Liderazgo, 6 Planificación, 7 Apoyo, 8 Operación, 9 Evaluación del desempeño, 10 Mejora).
2. Verificar para cada cláusula la evidencia objetiva del cumplimiento de requisitos, recopilando documentos, registros y entrevistas según ISO 19011.
3. Evaluar la integración del enfoque PHVA y la gestión de riesgos y oportunidades (cláusula 6.1) con el IPERC exigido por la normativa peruana.
4. Determinar el nivel de cumplimiento por cláusula (conforme, parcial, no conforme) y calcular un porcentaje global de madurez del sistema.
5. Clasificar las brechas como no conformidades mayores, menores u oportunidades de mejora, citando la cláusula específica incumplida.
6. Presentar una tabla de resultados por cláusula con el porcentaje de cumplimiento, los hallazgos y un plan de cierre de brechas priorizado.`,

  aud_proveedores: (p) => `${BASE(p)}

OBJETIVO: Auditar la evaluación del desempeño en SST de proveedores y contratistas para verificar su selección, control y cumplimiento de obligaciones, conforme a la Ley 29783 Art. 68 (coordinación con contratistas), el DS 005-2012-TR Art. 77 e ISO 45001:2018 cláusulas 8.1.4.2 y 8.1.4.3.
1. Verificar la existencia de criterios documentados de homologación y selección de contratistas en materia de SST y su aplicación efectiva.
2. Comprobar que los contratistas cuenten con su propio SGSST, IPERC, exámenes médicos ocupacionales, SCTR vigente y personal capacitado antes del inicio de labores.
3. Evaluar el cumplimiento del deber de coordinación y vigilancia del empleador principal sobre contratistas y subcontratistas según la Ley 29783 Art. 68 y el DS 005-2012-TR Art. 77.
4. Revisar los registros de evaluación de desempeño SST de proveedores (inspecciones, incidentes, observaciones) y su retroalimentación documentada.
5. Detectar incumplimientos de contratistas que generen responsabilidad solidaria del empleador principal, clasificándolos por nivel de riesgo.
6. Consolidar los hallazgos en una tabla con el proveedor evaluado, la brecha detectada, la base legal y la acción correctiva o de mejora recomendada.`,

  aud_gestion_cambio: (p) => `${BASE(p)}

OBJETIVO: Auditar el proceso de gestión del cambio organizacional en materia de SST para verificar que los cambios planificados sean evaluados y controlados antes de su implementación, conforme a ISO 45001:2018 cláusula 8.1.3 y al deber de prevención de la Ley 29783 Art. 21.
1. Identificar los cambios significativos ocurridos en el periodo auditado (nuevos procesos, equipos, sustancias, infraestructura, cambios organizativos o normativos) y verificar su registro.
2. Comprobar que cada cambio haya sido sometido a una evaluación de riesgos previa (actualización del IPERC) antes de su implementación, según ISO 45001:2018 cláusula 8.1.3.
3. Verificar la existencia de un procedimiento documentado de gestión del cambio que defina responsables, etapas de aprobación y controles asociados.
4. Evaluar la implementación de controles, capacitaciones y comunicaciones derivadas de los cambios, y la actualización de la documentación afectada.
5. Detectar cambios implementados sin evaluación de riesgos o sin controles adecuados, clasificándolos por criticidad.
6. Resumir los hallazgos en una tabla con el cambio auditado, la deficiencia, la cláusula o artículo incumplido y la acción correctiva con plazo recomendado.`,

  aud_mejora_continua: (p) => `${BASE(p)}

OBJETIVO: Auditar el proceso de mejora continua del SGSST verificando la aplicación efectiva del ciclo PHVA y el tratamiento de no conformidades, conforme a ISO 45001:2018 cláusula 10 y al principio de mejora continua de la Ley 29783 Art. 18 inciso d.
1. Verificar la existencia y operatividad del procedimiento de no conformidades y acciones correctivas según ISO 45001:2018 cláusula 10.2.
2. Evaluar la calidad del análisis de causa raíz aplicado a no conformidades, incidentes y hallazgos de auditorías previas, evitando soluciones superficiales.
3. Comprobar el seguimiento y cierre efectivo de las acciones correctivas, verificando la verificación de su eficacia y la ausencia de recurrencia.
4. Evaluar la articulación del ciclo PHVA (Planificar-Hacer-Verificar-Actuar) en los procesos del sistema y el cumplimiento del programa anual de SST.
5. Identificar oportunidades de mejora no aprovechadas y acciones correctivas vencidas o ineficaces, clasificándolas por impacto.
6. Consolidar los hallazgos en una tabla con la fuente de mejora, el estado de la acción, la eficacia verificada y las recomendaciones priorizadas.`,

  aud_revision_direccion: (p) => `${BASE(p)}

OBJETIVO: Auditar el proceso de revisión por la dirección del SGSST para verificar que se realice con la periodicidad, las entradas y las salidas exigidas, conforme a ISO 45001:2018 cláusula 9.3 y a la responsabilidad del empleador establecida en la Ley 29783 Art. 26.
1. Verificar la realización de la revisión por la dirección con la periodicidad definida y la participación de la alta dirección, documentada mediante actas.
2. Comprobar que las entradas de la revisión incluyan todos los elementos de ISO 45001:2018 cláusula 9.3 (estado de acciones previas, cambios, desempeño SST, resultados de auditorías, participación de trabajadores, comunicaciones de partes interesadas).
3. Verificar que las salidas comprendan conclusiones sobre la conveniencia, adecuación y eficacia del sistema, así como decisiones sobre mejoras, recursos y cambios.
4. Evaluar la coherencia entre los resultados de la revisión y las acciones efectivamente implementadas en el periodo siguiente.
5. Detectar ausencias de entradas o salidas obligatorias y la falta de seguimiento a los acuerdos, clasificando los hallazgos.
6. Elaborar una tabla resumen con el elemento auditado, la brecha frente a la cláusula 9.3, la evidencia y la acción correctiva recomendada.`,

  aud_politica_sst: (p) => `${BASE(p)}

OBJETIVO: Auditar el seguimiento y la implementación de la política de Seguridad y Salud en el Trabajo, verificando su adecuación, comunicación y coherencia con los objetivos, conforme a la Ley 29783 Art. 22 y Art. 23, RM 050-2013-TR e ISO 45001:2018 cláusula 5.2.
1. Verificar que la política SST cumpla el contenido mínimo de la Ley 29783 Art. 22 (compromisos de prevención, cumplimiento legal, participación de trabajadores y mejora continua) y esté firmada por el máximo representante.
2. Comprobar la comunicación y difusión efectiva de la política a todos los trabajadores, contratistas y visitantes, y la evidencia de su comprensión.
3. Evaluar la coherencia entre la política, los objetivos y el programa anual de SST, verificando que los compromisos se traduzcan en metas medibles.
4. Verificar la revisión periódica de la política para asegurar su vigencia frente a cambios normativos, organizativos o de riesgos.
5. Detectar brechas entre lo declarado en la política y la práctica real observada, clasificándolas como no conformidad u observación.
6. Resumir los hallazgos en una tabla con el aspecto auditado, la base legal o cláusula, la evidencia y la acción correctiva con plazo recomendado.`,

  aud_requisitos_legales: (p) => `${BASE(p)}

OBJETIVO: Verificar el cumplimiento efectivo de los requisitos legales aplicables en SST mediante una evaluación de campo y documental, conforme a la Ley 29783 Art. 43 (auditoría obligatoria del SGSST), el DS 014-2013-TR (registro de auditores autorizados) e ISO 45001:2018 cláusula 9.1.2.
1. Confirmar que la auditoría sea conducida por auditores registrados y autorizados conforme al DS 014-2013-TR, cuando se trate de la auditoría obligatoria del SGSST.
2. Tomar como base la matriz de requisitos legales y verificar en campo y documentalmente el cumplimiento real de cada obligación (comité o supervisor SST, RISST, exámenes médicos, capacitaciones, IPERC, SCTR, señalización).
3. Evaluar el cumplimiento de las obligaciones nucleares de la Ley 29783 y el DS 005-2012-TR (constitución del CSST, entrega de RISST, registros obligatorios, mapa de riesgos, plan anual).
4. Contrastar la evidencia objetiva recogida con el estado declarado en la matriz, identificando incumplimientos reales no detectados internamente.
5. Clasificar los hallazgos por gravedad y exposición a sanciones de SUNAFIL, priorizando las infracciones muy graves.
6. Consolidar los resultados en una tabla con el requisito legal, la base normativa específica, el estado de cumplimiento, la evidencia y la acción correctiva con plazo.`,

  // ───────────── 5. Entrenamiento, Capacitación y Sensibilización ─────────────
  cap_charla5min: (p) => `${BASE(p)}

OBJETIVO: Elaborar el guion de una charla de seguridad de cinco minutos (charla diaria preorden de trabajo) sobre un peligro crítico del área, alineada con la obligación de capacitación continua de la Ley 29783 Art. 27.
1. Selecciona un tema puntual y relevante para la jornada (peligro/riesgo prioritario del área según la IPERC vigente) y enúncialo como mensaje único.
2. Redacta una apertura de impacto (30 segundos): un dato, caso real o pregunta detonante que conecte con la tarea del día.
3. Desarrolla 3 puntos clave de control (acto/condición segura, EPP requerido y comportamiento esperado), en lenguaje sencillo y sin tecnicismos innecesarios.
4. Incluye 2 preguntas de verificación rápida para confirmar la comprensión de los asistentes antes de iniciar labores.
5. Cierra con un compromiso colectivo accionable y la frase guía del día.
6. Adjunta el campo de registro (tema, fecha, responsable, firmas de asistentes) conforme al registro de capacitación de la RM 050-2013-TR.`,

  cap_dinamicas: (p) => `${BASE(p)}

OBJETIVO: Diseñar dinámicas grupales preventivas y participativas para reforzar la cultura de seguridad y la identificación de peligros en el área, como complemento a las capacitaciones formales exigidas por la Ley 29783 Art. 27.
1. Define el objetivo de aprendizaje conductual de cada dinámica (p. ej. reporte de actos inseguros, uso de EPP, orden y limpieza) vinculado a un riesgo real del puesto.
2. Propón 3 dinámicas concretas con instrucciones paso a paso, materiales necesarios, número de participantes y duración estimada.
3. Detalla el momento de reflexión guiada (debriefing) con preguntas orientadoras que conecten la actividad con situaciones laborales reales.
4. Establece indicadores de participación y comprensión para medir la eficacia de cada dinámica.
5. Incluye recomendaciones de facilitación segura (evitar riesgos durante la actividad misma) y de adaptación al número de trabajadores.
6. Define el registro de la actividad como capacitación según la RM 050-2013-TR.`,

  cap_primeros_auxilios: (p) => `${BASE(p)}

OBJETIVO: Estructurar un programa de entrenamiento en primeros auxilios adaptado a los riesgos del área, que habilite a los trabajadores a brindar respuesta inicial ante emergencias médicas, en cumplimiento de la obligación de capacitación de la Ley 29783 Art. 27.
1. Identifica los escenarios de emergencia médica más probables según la actividad y los riesgos del área (heridas, fracturas, quemaduras, electrocución, intoxicación, paro cardiorrespiratorio).
2. Define los objetivos de aprendizaje y el contenido teórico-práctico por módulo (evaluación primaria, RCP, control de hemorragias, manejo de quemaduras, inmovilización, botiquín).
3. Establece la metodología práctica con simulacros y uso de maniquíes o material de entrenamiento, así como el ratio instructor-participante.
4. Determina la duración, frecuencia de reentrenamiento y perfil del instructor certificado.
5. Diseña una evaluación teórica y práctica con criterio de aprobación para certificar la competencia.
6. Define el registro de capacitación y la lista de trabajadores habilitados conforme a la RM 050-2013-TR.`,

  cap_evaluacion_conocimientos: (p) => `${BASE(p)}

OBJETIVO: Construir un instrumento de evaluación de conocimientos técnicos en SST (examen) para medir la eficacia de la capacitación impartida y evidenciar competencias, según la buena práctica de evaluación de eficacia y la Ley 29783 Art. 27.
1. Define los objetivos de aprendizaje a evaluar y la matriz de especificaciones (tema, nivel cognitivo y peso de cada ítem).
2. Redacta entre 10 y 15 preguntas claras y sin ambigüedad (opción múltiple, verdadero/falso y caso práctico) alineadas a los riesgos del área.
3. Elabora la clave de respuestas, el puntaje por pregunta y la nota mínima de aprobación.
4. Establece el procedimiento de aplicación, tiempo límite y acciones ante desaprobación (reinducción o refuerzo).
5. Define los indicadores de eficacia de la capacitación (porcentaje de aprobados, brechas detectadas) y el plan de mejora.
6. Adjunta el formato de registro del examen y resultados conforme a la RM 050-2013-TR.`,

  cap_brigadas_rescate: (p) => `${BASE(p)}

OBJETIVO: Diseñar el programa de formación de brigadas de rescate (y emergencia) del área, definiendo perfiles, competencias y entrenamiento, en línea con las obligaciones de respuesta a emergencias y capacitación de la Ley 29783 Art. 27.
1. Define la estructura de la brigada (jefe, subjefe e integrantes) y los perfiles según los escenarios de emergencia del área (rescate en altura, espacios confinados, contraincendios, materiales peligrosos).
2. Establece las competencias técnicas y físicas requeridas y el proceso de selección de brigadistas voluntarios.
3. Detalla el plan de entrenamiento teórico-práctico por especialidad, incluyendo equipos de rescate, técnicas y simulacros.
4. Define la frecuencia de entrenamientos, reentrenamientos y simulacros periódicos para mantener la operatividad.
5. Establece los criterios de evaluación de desempeño y la certificación de competencias de cada brigadista.
6. Define el registro de capacitación, conformación de la brigada y entrenamientos conforme a la RM 050-2013-TR.`,

  cap_induccion: (p) => `${BASE(p)}

OBJETIVO: Elaborar el guion de inducción en SST para nuevos trabajadores del área, garantizando que reciban la inducción general y específica antes de iniciar labores, conforme a la obligación de capacitación al ingreso de la Ley 29783 Art. 35 inciso b.
1. Estructura el bloque de inducción general (política SST, derechos y obligaciones, organización de la SST, reglamento interno, IPERC general, emergencias).
2. Desarrolla el bloque de inducción específica del puesto (peligros y riesgos del puesto según la IPERC, medidas de control, EPP, procedimientos seguros, ATS).
3. Define la duración, el responsable de impartirla y el momento (previo al inicio de labores efectivas).
4. Incluye la presentación de mapa de riesgos, zonas seguras, rutas de evacuación y puntos de reunión del área.
5. Diseña una evaluación breve de comprensión y la declaración de conformidad del trabajador.
6. Adjunta el registro de inducción con datos del trabajador, contenidos, duración y firmas conforme a la RM 050-2013-TR.`,

  cap_material_senaletica: (p) => `${BASE(p)}

OBJETIVO: Desarrollar material didáctico sobre señalización de seguridad para capacitar a los trabajadores en la interpretación correcta de señales del área, como apoyo a la capacitación exigida por la Ley 29783 Art. 27 y bajo los criterios de la NTP 399.010-1.
1. Clasifica los tipos de señales aplicables al área (prohibición, obligación, advertencia, salvamento o socorro, equipos contra incendios) explicando forma, color y significado según la NTP 399.010-1.
2. Asocia cada grupo de señales a peligros y situaciones reales del área para dar contexto práctico.
3. Diseña recursos visuales claros (fichas, infografías o presentación) con ejemplos correctos e incorrectos de uso.
4. Incluye un ejercicio de identificación e interpretación de señales presentes en el área de trabajo.
5. Define los objetivos de aprendizaje y una breve evaluación de comprensión del material.
6. Establece el registro de la capacitación realizada con este material conforme a la RM 050-2013-TR.`,

  cap_plan_anual: (p) => `${BASE(p)}

OBJETIVO: Elaborar el Plan Anual de Capacitación en SST del área, asegurando como mínimo cuatro capacitaciones al año y la cobertura de los riesgos relevantes, conforme a la Ley 29783 Art. 27 y al Programa Anual de SST.
1. Realiza un diagnóstico de necesidades de capacitación (DNC) a partir de la IPERC, los riesgos del puesto, la accidentalidad y los requisitos legales aplicables.
2. Define los temas, objetivos de aprendizaje, público objetivo y modalidad de cada capacitación (asegurando el mínimo de cuatro al año).
3. Establece el cronograma mensual, la duración, los responsables y los recursos necesarios por actividad.
4. Define los indicadores de cumplimiento (porcentaje de ejecución y cobertura) y de eficacia (evaluación de aprendizaje y transferencia al puesto).
5. Incluye el presupuesto estimado y los mecanismos de seguimiento y reprogramación.
6. Presenta el plan en una tabla resumen (tema, mes, horas, responsable, indicador) y define su registro conforme a la RM 050-2013-TR.`,

  cap_sensibilizacion: (p) => `${BASE(p)}

OBJETIVO: Diseñar una campaña de sensibilización sobre los riesgos laborales del área para fortalecer la percepción del riesgo y el compromiso preventivo de los trabajadores, complementando la capacitación formal de la Ley 29783 Art. 27.
1. Identifica los riesgos prioritarios y los comportamientos a fortalecer según la IPERC y el historial de incidentes del área.
2. Define el mensaje central, el público objetivo y los objetivos conductuales medibles de la campaña.
3. Propón acciones y piezas de comunicación (afiches, charlas testimoniales, videos, paneles, concursos) con su cronograma de difusión.
4. Establece canales y momentos de mayor impacto para asegurar el alcance a todos los trabajadores.
5. Define indicadores de percepción y comportamiento (encuestas antes/después, reportes de actos inseguros) para medir la eficacia.
6. Establece el registro de las actividades de sensibilización conforme a la RM 050-2013-TR.`,

  cap_talleres_epp: (p) => `${BASE(p)}

OBJETIVO: Estructurar talleres prácticos sobre el uso correcto de equipos de protección personal (EPP) del área, garantizando selección, colocación, mantenimiento y reposición adecuados, conforme a la obligación de capacitación de la Ley 29783 Art. 27 y la entrega de EPP con instrucción del DS 005-2012-TR.
1. Identifica los EPP requeridos por puesto según la IPERC y la matriz de EPP, asociando cada equipo al riesgo que controla.
2. Define los objetivos de aprendizaje y demuestra el uso correcto (colocación, ajuste, verificación, retiro y límites de protección) de cada EPP.
3. Incorpora práctica guiada donde cada trabajador ejecute la colocación e inspección de su EPP bajo supervisión.
4. Enseña los criterios de inspección, mantenimiento, almacenamiento y reposición ante deterioro o vencimiento.
5. Aplica una evaluación práctica con lista de verificación para certificar el uso correcto.
6. Adjunta el registro de capacitación y el cargo de entrega de EPP conforme a la RM 050-2013-TR y al DS 005-2012-TR.`,

  // ───────────── 6. Inspecciones de Seguridad de Campo ─────────────
  insp_residuos_peligrosos: (p) => `${BASE(p)}

OBJETIVO: Generar un checklist de inspección de campo para el almacenamiento temporal de residuos sólidos peligrosos, verificando segregación, rotulado y contención conforme al DS 057-2004-PCM y el DL 1278.
1. Verifica que el almacén cuente con techo, piso impermeable, ventilación y señalización de acceso restringido, registrando criterio de conformidad por ítem.
2. Inspecciona la segregación por tipo de residuo (inflamable, corrosivo, tóxico) y la incompatibilidad química entre contenedores adyacentes.
3. Comprueba el rotulado de cada recipiente (tipo de residuo, fecha de ingreso, simbología NTP 399.015) y la existencia de sistema de contención secundaria contra derrames.
4. Revisa la disponibilidad de kit antiderrame, EPP específico y extintor cercano, según la naturaleza del residuo almacenado.
5. Valida la vigencia del registro de generación, manifiestos de manejo y contrato con EO-RS autorizada ante MINAM.
6. Consolida los hallazgos en tabla (ítem, criterio de conformidad, estado C/NC, evidencia, acción correctiva y plazo).`,

  insp_botiquines: (p) => `${BASE(p)}

OBJETIVO: Elaborar un checklist de auditoría de botiquines de primeros auxilios, verificando contenido mínimo, vigencia de insumos y accesibilidad conforme a la Ley 29783 y la RM 050-2013-TR.
1. Verifica la ubicación visible, señalizada y de libre acceso del botiquín, así como la existencia de un responsable designado.
2. Inspecciona el contenido mínimo (gasas, vendas, antisépticos, guantes, tijera punta roma) confrontándolo con la lista oficial del tipo de centro de trabajo.
3. Comprueba las fechas de vencimiento de insumos y medicamentos, y la ausencia de medicamentos no autorizados sin prescripción.
4. Revisa la limpieza, el orden interno y la existencia de un inventario actualizado con control de reposición.
5. Consolida los hallazgos en tabla (insumo, cantidad requerida vs. existente, vencimiento, estado C/NC y acción correctiva).`,

  insp_vehiculos_pesados: (p) => `${BASE(p)}

OBJETIVO: Generar un checklist preoperacional de inspección de vehículos pesados y maquinaria móvil, verificando condiciones mecánicas y de seguridad antes de su operación conforme a la Ley 29783 y al DS 005-2012-TR.
1. Verifica la documentación vigente (SOAT, revisión técnica, licencia del operador y check list de mantenimiento preventivo).
2. Inspecciona sistemas críticos de seguridad: frenos, dirección, luces, neumáticos, alarma de retroceso, espejos y cinturones.
3. Comprueba la operatividad de dispositivos de emergencia: extintor vigente, conos, tacos, kit antiderrame y botiquín.
4. Revisa fugas de fluidos, niveles de aceite y refrigerante, y el estado estructural de la cabina y elementos de izaje si aplica.
5. Valida la presencia de circulina, pértiga, cinturón de seguridad y demás requisitos exigidos según el entorno de operación (mina, obra, vía pública).
6. Consolida los hallazgos en tabla (componente, criterio de conformidad, estado C/NC, criticidad y acción correctiva con plazo).`,

  insp_escaleras: (p) => `${BASE(p)}

OBJETIVO: Elaborar un checklist de control de escaleras portátiles, verificando su estado estructural, condiciones de uso seguro y almacenamiento conforme a la Norma G.050 y al DS 005-2012-TR.
1. Verifica la integridad estructural de largueros, peldaños, zapatas antideslizantes y dispositivos de seguridad (seguros, cadenas, topes).
2. Inspecciona la ausencia de fisuras, deformaciones, corrosión, peldaños flojos o reparaciones improvisadas que invaliden su uso.
3. Comprueba que la escalera sea adecuada al trabajo (altura, material aislante para riesgo eléctrico) y que cuente con identificación o código de inventario.
4. Revisa las condiciones de uso en campo: ángulo de apoyo correcto, sobresalir del punto de apoyo, amarre y superficie firme.
5. Consolida los hallazgos en tabla (ítem, criterio de conformidad, estado C/NC, apto/no apto para uso y acción correctiva).`,

  insp_equipos_proteccion: (p) => `${BASE(p)}

OBJETIVO: Generar un checklist de inspección del estado y uso de equipos de protección personal (EPP), verificando vigencia, conservación y adecuación al riesgo conforme a la Ley 29783, al DS 005-2012-TR y a la RM 050-2013-TR.
1. Verifica que cada trabajador cuente con el EPP correspondiente a los riesgos de su puesto, según la matriz IPERC del área.
2. Inspecciona el estado de conservación de cada EPP (casco, lentes, guantes, calzado, protección auditiva y respiratoria) descartando daños o desgaste que anulen su función.
3. Comprueba el uso correcto y permanente del EPP durante la tarea, así como el ajuste y la talla adecuada.
4. Revisa la existencia de registro de entrega de EPP firmado y la vigencia de elementos críticos (filtros, líneas de vida, arneses).
5. Consolida los hallazgos en tabla (EPP, criterio de conformidad, estado C/NC, uso correcto S/N y acción correctiva).`,

  insp_senaletica: (p) => `${BASE(p)}

OBJETIVO: Elaborar un checklist de inspección del estado de la señalética de seguridad, verificando presencia, visibilidad y cumplimiento del código de colores conforme a la NTP 399.010-1 y al DS 005-2012-TR.
1. Verifica la presencia de señales obligatorias por tipo (prohibición, obligación, advertencia, salvamento y contra incendios) según los riesgos del área.
2. Inspecciona el cumplimiento del color, forma y pictograma normalizado de cada señal conforme a la NTP 399.010-1.
3. Comprueba la visibilidad, altura de instalación, limpieza, iluminación y ausencia de obstrucciones de las señales.
4. Revisa el estado de conservación (decoloración, deterioro, fotoluminiscencia en rutas de evacuación) y la coherencia con el plano de señalización.
5. Consolida los hallazgos en tabla (señal, ubicación, criterio de conformidad, estado C/NC y acción correctiva).`,

  insp_orden_limpieza: (p) => `${BASE(p)}

OBJETIVO: Generar un checklist de inspección de orden y limpieza bajo la metodología 5S, verificando condiciones de housekeeping que prevengan riesgos conforme a la Ley 29783 y al DS 005-2012-TR.
1. Verifica Clasificación (Seiri): ausencia de materiales innecesarios, chatarra u obstáculos en áreas de trabajo y vías de circulación.
2. Inspecciona Orden (Seiton): ubicación definida y señalizada de herramientas, materiales y EPP, con accesos y salidas de emergencia libres.
3. Comprueba Limpieza (Seiso): pisos sin derrames, ausencia de residuos acumulados y contenedores de residuos segregados y operativos.
4. Revisa Estandarización (Seiketsu) y Disciplina (Shitsuke): existencia de estándares visuales, programación de limpieza y cumplimiento sostenido por el personal.
5. Consolida los hallazgos en tabla (S evaluada, ítem, criterio de conformidad, estado C/NC, puntaje y acción correctiva).`,

  insp_andamios: (p) => `${BASE(p)}

OBJETIVO: Elaborar un checklist de monitoreo de andamios tubulares, verificando montaje seguro, estabilidad y protección contra caídas conforme a la Norma G.050 y al DS 005-2012-TR.
1. Verifica la cimentación y nivelación (bases, husillos, durmientes) sobre superficie firme y la verticalidad de la estructura.
2. Inspecciona el arriostramiento, los acoples, las crucetas y el anclaje a estructura fija que garanticen estabilidad lateral.
3. Comprueba la plataforma de trabajo completa, barandas, rodapiés, escalera de acceso interno y ausencia de tablones sueltos.
4. Revisa la existencia y vigencia de la tarjeta de control de andamio (verde/roja) firmada por persona competente.
5. Valida el uso de arnés con línea de vida en montaje/desmontaje y la distancia segura respecto a líneas eléctricas.
6. Consolida los hallazgos en tabla (componente, criterio de conformidad, estado C/NC, condición de tarjeta y acción correctiva).`,

  insp_extintores: (p) => `${BASE(p)}

OBJETIVO: Generar un checklist de revisión de extintores portátiles, verificando operatividad, vigencia y ubicación conforme a la NTP 350.043-1 y al DS 005-2012-TR.
1. Verifica que el tipo y la capacidad del extintor sean adecuados a la clase de fuego del área (A, B, C, D, K) y a la carga de fuego.
2. Inspecciona el manómetro en rango operativo, el precinto de seguridad, la manguera, la boquilla y la ausencia de corrosión o abolladuras.
3. Comprueba la vigencia de la recarga, la prueba hidrostática y la tarjeta de control de inspección mensual.
4. Revisa la ubicación señalizada, accesible, libre de obstrucciones y a la altura normada, con distancia de recorrido adecuada.
5. Consolida los hallazgos en tabla (extintor/código, tipo, criterio de conformidad, estado C/NC, vencimiento y acción correctiva).`,

  insp_herramientas: (p) => `${BASE(p)}

OBJETIVO: Elaborar un checklist de verificación de herramientas manuales y de poder, verificando su estado, codificación y uso seguro conforme a la Ley 29783 y al DS 005-2012-TR.
1. Verifica el estado físico de mangos, filos, cabezas y aislamientos, descartando fisuras, deformaciones o reparaciones improvisadas.
2. Inspecciona el sistema de codificación por colores (color del mes) o etiqueta de inspección vigente que habilite su uso.
3. Comprueba que las herramientas de poder cuenten con guardas, interruptores operativos, cables sin empalmes y conexión a tierra cuando aplique.
4. Revisa que la herramienta sea la adecuada para la tarea y que el trabajador use el EPP específico requerido para su operación.
5. Consolida los hallazgos en tabla (herramienta, criterio de conformidad, estado C/NC, apto/no apto y acción correctiva).`,

  // ───────────── 7. Higiene Ocupacional y Control de Riesgos ─────────────
  hig_polvo: (p) => `${BASE(p)}

OBJETIVO: Diseñar un programa de control de polvo respirable (sílice cristalina y partículas inhalables) acorde a los Valores Límite Permisibles del DS 015-2005-SA, aplicando la jerarquía de controles del Art. 21 de la Ley 29783.
1. Identificar fuentes generadoras de polvo y clasificar la fracción (inhalable/respirable) según la actividad y el área evaluada.
2. Establecer el plan de monitoreo de concentración de partículas conforme a la RM 050-2013-TR, comparando resultados con los VLP del DS 015-2005-SA (sílice respirable 0,05 mg/m3).
3. Definir controles en orden jerárquico: eliminación/sustitución, controles de ingeniería (humectación, ventilación por extracción localizada, confinamiento), controles administrativos y por último EPP respiratorio (factor de protección asignado).
4. Especificar el programa de protección respiratoria: selección de respiradores N95/P100, pruebas de ajuste (fit test) y mantenimiento.
5. Programar vigilancia médica ocupacional con espirometría y radiografía de tórax según el nivel de exposición.
6. Presentar tabla resumen con fuente, fracción, VLP aplicable, control propuesto y responsable.`,

  hig_estres_termico: (p) => `${BASE(p)}

OBJETIVO: Evaluar la exposición a estrés térmico por calor mediante el índice WBGT (TGBH) y definir controles para prevenir patologías por calor en el área y entorno indicados.
1. Caracterizar la carga térmica del puesto: fuentes de calor, humedad, radiación y carga metabólica de la tarea (liviana, moderada, pesada).
2. Medir el índice WBGT (TGBH) diferenciando ambientes con y sin carga solar, y compararlo con los valores límite según régimen trabajo-descanso y tasa metabólica.
3. Aplicar la jerarquía de controles del Art. 21 de la Ley 29783: controles de ingeniería (ventilación, apantallamiento de fuentes radiantes, climatización), administrativos (ciclos trabajo-descanso, aclimatación, hidratación) y EPP cuando corresponda.
4. Establecer un protocolo de hidratación y un plan de respuesta ante golpe de calor y signos de alarma (calambres, agotamiento).
5. Definir vigilancia médica para trabajadores expuestos y criterios de aclimatación progresiva.
6. Presentar tabla con puesto, WBGT medido, valor límite, régimen trabajo-descanso recomendado y medidas de control.`,

  hig_vibraciones: (p) => `${BASE(p)}

OBJETIVO: Evaluar y controlar la exposición a vibraciones mecánicas mano-brazo (HAV) y cuerpo entero (WBV) generadas por herramientas y equipos en el área indicada.
1. Inventariar herramientas y equipos vibrantes, clasificando la exposición en mano-brazo (esmeriles, martillos neumáticos) o cuerpo entero (operación de vehículos y maquinaria).
2. Estimar la exposición diaria normalizada A(8) y compararla con los valores de acción y límite de referencia para HAV y WBV.
3. Aplicar la jerarquía de controles del Art. 21 de la Ley 29783: sustitución por equipos de baja vibración, mantenimiento, asientos y mangos antivibración, y reducción del tiempo de exposición.
4. Definir controles administrativos: rotación de personal, pausas activas y límites de tiempo de uso continuo de herramientas.
5. Programar vigilancia médica para detección precoz del síndrome de vibración mano-brazo (síndrome de dedo blanco) y trastornos lumbares.
6. Presentar tabla con equipo, tipo de vibración, A(8) estimado, valor de referencia y control propuesto.`,

  hig_ergonomia_admin: (p) => `${BASE(p)}

OBJETIVO: Gestionar los riesgos ergonómicos en puestos de trabajo administrativo (oficina y trabajo con PVD) conforme a la RM 375-2008-TR, Norma Básica de Ergonomía.
1. Evaluar el puesto de trabajo con pantalla de visualización de datos: silla, mesa, ubicación del monitor, teclado y apoyos, según los parámetros de la RM 375-2008-TR.
2. Aplicar un método de evaluación ergonómica apropiado (RULA/ROSA) para identificar posturas forzadas y movimientos repetitivos.
3. Verificar condiciones del entorno: iluminación, reflejos en pantalla y disposición del espacio de trabajo.
4. Recomendar ajustes de mobiliario, organización del puesto y un programa de pausas activas y ejercicios compensatorios.
5. Establecer un plan de capacitación en higiene postural y autoajuste del puesto.
6. Presentar tabla con factor de riesgo, nivel evaluado, criterio RM 375-2008-TR y medida correctiva.`,

  hig_solventes: (p) => `${BASE(p)}

OBJETIVO: Establecer medidas de manejo seguro y control de exposición a solventes químicos orgánicos, aplicando los Valores Límite Permisibles del DS 015-2005-SA.
1. Inventariar los solventes en uso y recopilar sus Hojas de Datos de Seguridad (SDS), identificando peligros, VLP y vías de ingreso.
2. Establecer el monitoreo de concentración ambiental conforme a la RM 050-2013-TR y comparar con los VLP del DS 015-2005-SA (TWA, STEL).
3. Aplicar la jerarquía de controles del Art. 21 de la Ley 29783: sustitución por productos menos tóxicos, controles de ingeniería (extracción localizada, ventilación), procedimientos de trasvase y EPP químico compatible.
4. Definir condiciones de almacenamiento, compatibilidad, ventilación y control de incompatibilidades químicas.
5. Programar vigilancia médica con indicadores biológicos de exposición cuando aplique.
6. Presentar tabla con solvente, VLP, vía de exposición, control de ingeniería y EPP requerido.`,

  hig_iluminacion: (p) => `${BASE(p)}

OBJETIVO: Medir y evaluar los niveles de iluminación en los puestos de trabajo conforme a la RM 375-2008-TR, garantizando confort visual y prevención de fatiga ocular.
1. Identificar los puestos y tareas visuales, clasificando su exigencia visual (gruesa, media, fina, muy fina).
2. Medir la iluminancia (lux) con luxómetro calibrado por puesto y compararla con los niveles mínimos exigidos por la RM 375-2008-TR según la tarea.
3. Evaluar uniformidad, deslumbramiento, contraste y la presencia de reflejos en superficies y pantallas.
4. Recomendar mejoras: rediseño luminotécnico, reubicación de luminarias, aprovechamiento de luz natural y mantenimiento de niveles.
5. Definir un programa de medición periódica y limpieza de luminarias.
6. Presentar tabla con puesto, tarea visual, lux medido, lux mínimo RM 375-2008-TR y acción correctiva.`,

  hig_ruido: (p) => `${BASE(p)}

OBJETIVO: Diseñar el monitoreo y control del ruido ocupacional para prevenir hipoacusia inducida por ruido, respetando el límite de 85 dBA para jornada de 8 horas.
1. Realizar un sonometraje de las áreas y una dosimetría personal para estimar el nivel de exposición normalizado (LAeq,8h) según la RM 050-2013-TR.
2. Comparar los resultados con el valor límite de 85 dBA / 8 h y aplicar el factor de corrección por tiempo de exposición (tasa de cambio).
3. Aplicar la jerarquía de controles del Art. 21 de la Ley 29783: controles de ingeniería (encerramiento, silenciadores, mantenimiento), administrativos (rotación, reducción de tiempo) y protección auditiva con NRR adecuado.
4. Delimitar y señalizar zonas con niveles superiores a 85 dBA como áreas de uso obligatorio de protección auditiva.
5. Implementar un programa de conservación auditiva con audiometrías de base y periódicas.
6. Presentar tabla con área/puesto, LAeq,8h, límite, control de ingeniería y EPP auditivo recomendado.`,

  hig_fatiga: (p) => `${BASE(p)}

OBJETIVO: Establecer un programa de prevención de la fatiga laboral (física y mental) asociada a jornadas, turnos y carga de trabajo, conforme a la Ley 29783 y su reglamento DS 005-2012-TR.
1. Identificar los factores de fatiga: duración y rotación de turnos, trabajo nocturno, carga física, demandas cognitivas y pausas disponibles.
2. Evaluar el nivel de fatiga y somnolencia mediante instrumentos validados y análisis de la organización del trabajo.
3. Aplicar controles administrativos: diseño de turnos y rotaciones, límites de horas extras, pausas programadas y gestión del trabajo nocturno.
4. Definir medidas para la gestión de la fatiga en tareas críticas y conducción (control de jornadas, descanso obligatorio).
5. Establecer capacitación en higiene del sueño y autoreporte de fatiga, integrado al SGSST según el DS 005-2012-TR.
6. Presentar tabla con factor de fatiga, nivel de riesgo, control administrativo y responsable de seguimiento.`,

  hig_radiacion_solar: (p) => `${BASE(p)}

OBJETIVO: Definir medidas de protección contra la radiación ultravioleta solar para trabajadores expuestos a la intemperie, aplicando la jerarquía de controles del Art. 21 de la Ley 29783.
1. Identificar las tareas a la intemperie y los periodos de mayor exposición, considerando el índice UV de la zona y los horarios críticos (10:00 a 16:00).
2. Estimar el nivel de exposición acumulada según el tiempo de trabajo expuesto y las condiciones del entorno.
3. Aplicar controles de ingeniería y administrativos: provisión de sombra y techado, reprogramación de tareas en horas de menor índice UV y rotación de personal.
4. Definir el EPP y vestimenta de protección UV: ropa de manga larga, sombrero de ala ancha, lentes con filtro UV y protector solar de amplio espectro.
5. Establecer un programa de vigilancia dermatológica y capacitación en autoexamen de piel y prevención de cáncer cutáneo.
6. Presentar tabla con tarea, horario de exposición, índice UV, control administrativo y EPP requerido.`,

  hig_vigilancia_epidemiologica: (p) => `${BASE(p)}

OBJETIVO: Diseñar un programa de vigilancia epidemiológica ocupacional que articule el monitoreo de agentes y la salud de los trabajadores, conforme a la Ley 29783 y al DS 005-2012-TR.
1. Identificar los agentes y factores de riesgo presentes (físicos, químicos, biológicos, ergonómicos y psicosociales) a partir del mapa de riesgos del área.
2. Vincular el monitoreo de agentes ocupacionales realizado según la RM 050-2013-TR con los programas de vigilancia médica específicos por exposición.
3. Definir los exámenes médicos ocupacionales (ingreso, periódicos y retiro) y los indicadores de salud a vigilar por grupo de exposición.
4. Establecer indicadores epidemiológicos (prevalencia, incidencia) y un sistema de registro y análisis de tendencias de enfermedades ocupacionales.
5. Definir criterios de seguimiento de casos, restricciones laborales y retroalimentación al SGSST según el DS 005-2012-TR.
6. Presentar tabla con agente de riesgo, grupo expuesto, examen médico aplicable, indicador vigilado y frecuencia.`,

  // ───────────── 8. Respuesta a Emergencias y Contingencias ─────────────
  eme_alerta_incendios: (p) => `${BASE(p)}

OBJETIVO: Diseñar un sistema de alerta temprana de incendios adaptado al entorno operativo, que permita la detección oportuna y la activación inmediata del protocolo de respuesta, en cumplimiento de la Ley 28551 (planes de contingencia) y el DS 005-2012-TR (preparación ante emergencias).
1. Identificar las áreas de mayor carga combustible y riesgo de ignición, definiendo la cobertura requerida de detección (humo, temperatura, llama) según el layout y el número de trabajadores.
2. Especificar los dispositivos de detección y notificación (detectores, pulsadores manuales, sirenas y luces estroboscópicas) y sus criterios de ubicación, alineados con la NFPA 72 como buena práctica.
3. Definir los niveles de alerta (incipiente, declarado, generalizado) con sus disparadores y la cadena de activación hacia la brigada y el jefe de emergencias.
4. Establecer el protocolo de comunicación de la alerta (alarma sonora codificada, megafonía y mensajes pre-grabados) diferenciando aviso de evacuación parcial y total.
5. Programar las rutinas de prueba, inspección y mantenimiento del sistema, con registros y responsables asignados.
6. Elaborar una tabla resumen con zona, tipo de detector, dispositivo de alarma, nivel de alerta asociado y frecuencia de prueba.`,

  eme_comunicacion_crisis: (p) => `${BASE(p)}

OBJETIVO: Estructurar un plan de comunicación de crisis externa que gestione el flujo de información hacia autoridades, medios, familias y comunidad durante una emergencia, articulado con la Ley 29664 (SINAGERD) e INDECI y la Ley 28551.
1. Mapear a los grupos de interés externos (INDECI, bomberos, PNP, MINSA/EsSalud, municipalidad, familiares, prensa y comunidad) y el tipo de información que requiere cada uno.
2. Designar al vocero oficial y sus suplentes, definiendo niveles de autorización y la prohibición de declaraciones no autorizadas.
3. Redactar mensajes clave y plantillas pre-aprobadas (comunicado inicial, actualización y cierre) que prioricen la veracidad, la oportunidad y la protección de datos de las víctimas.
4. Establecer canales y tiempos de comunicación (línea de emergencia, correo, redes sociales y reporte formal a la autoridad competente) con plazos máximos de respuesta.
5. Definir el protocolo de notificación a familiares y de coordinación con la autoridad ante lesionados o fallecidos.
6. Presentar una matriz de comunicación con grupo de interés, mensaje, canal, responsable y tiempo objetivo.`,

  eme_brigada_incendios: (p) => `${BASE(p)}

OBJETIVO: Determinar el equipamiento y la dotación de la brigada contra incendios acorde al nivel de riesgo del entorno, garantizando capacidad de respuesta efectiva conforme al DS 005-2012-TR (organización de brigadas) y la NTP 350.043 sobre selección y mantenimiento de extintores.
1. Definir la estructura y el número de brigadistas según el número de trabajadores y los turnos, asegurando cobertura permanente.
2. Seleccionar los extintores por tipo de fuego (A, B, C, D, K), capacidad y distribución conforme a la NTP 350.043, indicando distancias máximas de recorrido.
3. Especificar el equipo de protección personal del brigadista y los equipos complementarios (mangueras, hidrantes, mantas ignífugas, EPR según riesgo).
4. Establecer el programa de capacitación y entrenamiento práctico (uso de extintores, ataque a fuego incipiente) con frecuencia y registros.
5. Definir las rutinas de inspección y mantenimiento de equipos, incluyendo recarga y prueba hidrostática de extintores según NTP 350.043.
6. Consolidar una tabla con tipo de equipo, cantidad, ubicación, responsable de inspección y frecuencia de mantenimiento.`,

  eme_danos_post: (p) => `${BASE(p)}

OBJETIVO: Establecer una metodología de evaluación de daños y análisis de necesidades (EDAN) posterior a una emergencia, que oriente la recuperación operativa y el reporte a la autoridad, en línea con la Ley 29664 (SINAGERD), las guías EDAN de INDECI y la Ley 28551.
1. Conformar el equipo evaluador y definir los criterios de seguridad previos al ingreso a las áreas afectadas (estabilidad estructural, fugas, energía).
2. Clasificar los daños por categoría (estructurales, equipos, materiales, ambientales y a personas) con una escala de severidad.
3. Aplicar un formato EDAN para registrar el inventario de afectaciones, las necesidades inmediatas y la estimación de tiempos de recuperación.
4. Priorizar las acciones de control, aseguramiento y restablecimiento según criticidad para la continuidad operativa.
5. Documentar evidencias (fotografías, croquis, registros) y elaborar el reporte formal a la autoridad competente y a la alta dirección.
6. Presentar una tabla EDAN con área, tipo de daño, severidad, necesidad y acción priorizada.`,

  eme_simulacro_sismos: (p) => `${BASE(p)}

OBJETIVO: Elaborar el guion de un simulacro de sismo realista y medible para el entorno de trabajo, que evalúe la capacidad de respuesta y evacuación del personal, alineado con la Ley 29664 (SINAGERD), los simulacros nacionales de INDECI y el DS 005-2012-TR.
1. Definir el escenario sísmico (magnitud, hora, daños supuestos, zonas bloqueadas) y los objetivos medibles del ejercicio.
2. Detallar la secuencia cronometrada: alerta, autoprotección (agáchate, cúbrete, agárrate), evacuación, conteo en puntos de reunión y cierre.
3. Asignar roles a brigadas, evaluadores y observadores, con guiones de actuación para cada uno.
4. Establecer los indicadores de desempeño (tiempo de evacuación, personal contabilizado, incidentes durante el ejercicio) y los formatos de evaluación.
5. Programar la sesión de retroalimentación posterior para identificar hallazgos y acciones de mejora.
6. Consolidar el guion en una tabla con fase, hora estimada, acción esperada, responsable e indicador.`,

  eme_comando_incidentes: (p) => `${BASE(p)}

OBJETIVO: Diseñar el organigrama de un Sistema de Comando de Incidentes (SCI) adaptado a la organización, que defina roles, responsabilidades y cadena de mando durante una emergencia, conforme al DS 005-2012-TR y al SCI promovido por INDECI bajo la Ley 29664 (SINAGERD).
1. Definir la estructura básica del SCI: Comandante de Incidentes y las funciones de Operaciones, Planificación, Logística y Administración/Finanzas.
2. Asignar el perfil y los titulares y suplentes de cada función, asegurando continuidad por turnos.
3. Establecer la cadena de mando, los tramos de control y el protocolo de transferencia de mando.
4. Definir los mecanismos de coordinación con entidades externas (bomberos, INDECI, PNP, salud) y el punto de comando.
5. Determinar los flujos de información, los reportes de situación y la documentación del incidente.
6. Presentar el organigrama descrito y una tabla con función, responsable, suplente y responsabilidades clave.`,

  eme_derrames: (p) => `${BASE(p)}

OBJETIVO: Desarrollar un plan de contingencia ante derrames de sustancias peligrosas en el entorno operativo, que minimice impactos a las personas y al ambiente, en cumplimiento de la Ley 28551 (planes de contingencia) y el DS 005-2012-TR.
1. Identificar las sustancias presentes, sus volúmenes y los puntos críticos de derrame, apoyándose en las hojas de seguridad (SDS).
2. Clasificar los escenarios de derrame por magnitud (menor, mayor, incontrolable) y definir los disparadores de cada nivel de respuesta.
3. Establecer el procedimiento de respuesta: alerta, aislamiento de la zona, control de la fuente, contención y recolección con kits antiderrame.
4. Especificar el EPP requerido y el kit antiderrame por tipo de sustancia, con su ubicación y dotación.
5. Definir la disposición de residuos contaminados y la notificación a la autoridad ambiental competente cuando corresponda.
6. Resumir en una tabla escenario, sustancia, acción de control, EPP/kit y responsable.`,

  eme_evacuacion: (p) => `${BASE(p)}

OBJETIVO: Establecer un protocolo de evacuación rápida y ordenada del personal ante una emergencia, que asegure la salida segura hacia los puntos de reunión, conforme al DS 005-2012-TR y como parte del plan de contingencia exigido por la Ley 28551.
1. Definir los criterios y tipos de evacuación (parcial o total) y la señal de activación inequívoca.
2. Establecer la secuencia de actuación: alarma, suspensión de actividades, corte de energía si aplica, desplazamiento por rutas y verificación de áreas.
3. Asignar funciones a los líderes de evacuación, responsables de barrido de áreas y apoyo a personas con movilidad reducida.
4. Determinar las reglas de comportamiento durante la evacuación (no correr, no retroceder, no usar ascensores) y la comunicación con el personal.
5. Definir el conteo de personal en el punto de reunión y el reporte de personas faltantes al comando de incidentes.
6. Consolidar el protocolo en una tabla con fase, acción, responsable y tiempo objetivo.`,

  eme_puntos_reunion: (p) => `${BASE(p)}

OBJETIVO: Definir los puntos de reunión seguros para la concentración del personal tras una evacuación, garantizando capacidad, accesibilidad y seguridad, en el marco del DS 005-2012-TR y del plan de contingencia de la Ley 28551.
1. Establecer los criterios de selección (distancia segura, áreas despejadas, alejadas de riesgos como caída de objetos, líneas eléctricas o sustancias peligrosas).
2. Determinar la capacidad requerida según el número de trabajadores y visitantes, definiendo puntos primarios y alternos.
3. Definir la señalización y la identificación visual de cada punto de reunión conforme a la NTP 399.010.
4. Establecer el procedimiento de conteo y verificación de personal en el punto, con responsables designados.
5. Definir la coordinación desde el punto de reunión hacia el comando de incidentes y los servicios de emergencia.
6. Presentar una tabla con punto de reunión, ubicación, capacidad, tipo (primario/alterno) y responsable de conteo.`,

  eme_rutas_escape: (p) => `${BASE(p)}

OBJETIVO: Definir las rutas de escape señalizadas para una evacuación segura y eficiente, asegurando recorridos libres, iluminados e identificables, conforme a la NTP 399.010 (señales de seguridad) y al DS 005-2012-TR, dentro del plan de contingencia de la Ley 28551.
1. Identificar los recorridos de evacuación desde cada área hacia las salidas y puntos de reunión, definiendo rutas principales y alternas.
2. Verificar los anchos, las distancias de recorrido y la ausencia de obstrucciones, así como el sentido de apertura de las puertas de salida.
3. Definir la señalización de evacuación (direccionales, salidas, salida de emergencia) conforme a la NTP 399.010, con ubicación y altura de instalación.
4. Establecer los requisitos de iluminación de emergencia y señalización fotoluminiscente para condiciones de baja visibilidad.
5. Definir el programa de inspección para mantener las rutas despejadas y operativas, con responsables y frecuencia.
6. Consolidar en una tabla área de origen, ruta asignada, salida, señalización requerida y punto de reunión destino.`,

  // ───────────── 9. Indicadores y KPI Predictivos ─────────────
  kpi_tendencias: (p) => `${BASE(p)}

OBJETIVO: Analizar la tendencia histórica de incidentes y accidentes para anticipar variaciones del riesgo y orientar decisiones preventivas, diferenciando indicadores reactivos (accidentes ocurridos) de indicadores proactivos (precursores).
1. Consolidar la serie temporal mensual de los últimos 12 a 36 meses con incidentes, accidentes incapacitantes, días perdidos y horas-hombre trabajadas (HHT), según el registro de estadísticas exigido por la RM 050-2013-TR.
2. Calcular para cada periodo el Índice de Frecuencia IF = (N° accidentes incapacitantes x 1 000 000) / HHT y representarlo en una tabla de tendencia mes a mes.
3. Aplicar medias móviles de 3 meses y variación porcentual interanual para suavizar estacionalidad e identificar pendiente ascendente o descendente.
4. Cruzar la tendencia reactiva con precursores proactivos (reportes de actos y condiciones subestándar, inspecciones, casi-accidentes) para detectar correlaciones tempranas.
5. Clasificar el comportamiento en estable, en mejora o en deterioro, y proyectar el rango esperado para los próximos 3 meses.
6. Recomendar controles priorizados según la jerarquía de la Ley 29783 para revertir o sostener la tendencia observada.`,

  kpi_indice_accidentabilidad: (p) => `${BASE(p)}

OBJETIVO: Calcular e interpretar el Índice de Accidentabilidad como indicador integral de desempeño, combinando frecuencia y gravedad conforme al Glosario del DS 005-2012-TR.
1. Recopilar del periodo evaluado: N° de accidentes incapacitantes, total de días perdidos por descanso médico y HHT efectivas, según los registros obligatorios de la RM 050-2013-TR.
2. Calcular el Índice de Frecuencia IF = (N° accidentes incapacitantes x 1 000 000) / HHT.
3. Calcular el Índice de Gravedad IG = (N° días perdidos x 1 000 000) / HHT.
4. Calcular el Índice de Accidentabilidad IA = (IF x IG) / 1000 y presentar los tres resultados en una tabla comparativa con el periodo anterior.
5. Interpretar el resultado frente a metas internas y referencias sectoriales, indicando si el desempeño mejora o se deteriora.
6. Proponer medidas correctivas y predictivas priorizadas para reducir el IA en el siguiente periodo.`,

  kpi_costos_ocultos: (p) => `${BASE(p)}

OBJETIVO: Estimar los costos ocultos (indirectos) de los accidentes para dimensionar su impacto económico real y justificar la inversión preventiva ante la alta dirección.
1. Cuantificar los costos directos conocidos: atención médica, prestaciones del SCTR, indemnizaciones y multas potenciales según la Ley 29783 y su régimen sancionador.
2. Identificar los costos ocultos asociados: tiempo perdido del accidentado y testigos, paralización de procesos, reemplazo y recapacitación, daño a equipos, reprocesos y pérdida de productividad.
3. Aplicar la relación de la pirámide de costos (modelo iceberg de Bird/Heinrich) usando un ratio costo indirecto/directo razonado para la actividad evaluada.
4. Construir una tabla con costos directos, costos ocultos estimados y costo total por evento y acumulado del periodo.
5. Expresar el costo total como porcentaje de la facturación o de la masa salarial para visibilizar su peso financiero.
6. Recomendar la reasignación de recursos hacia controles predictivos cuyo retorno supere el costo evitado estimado.`,

  kpi_cumplimiento_programa: (p) => `${BASE(p)}

OBJETIVO: Medir el porcentaje de cumplimiento del Programa Anual de Seguridad y Salud en el Trabajo como indicador proactivo de gestión, conforme a la Ley 29783 y la RM 050-2013-TR.
1. Listar todas las actividades planificadas del Programa Anual (capacitaciones, inspecciones, simulacros, monitoreos, mantenimientos) con su fecha meta.
2. Registrar el estado real de cada actividad: ejecutada, en proceso, reprogramada o no ejecutada, con su respectivo medio de verificación.
3. Calcular el Índice de Cumplimiento = (Actividades ejecutadas / Actividades programadas a la fecha) x 100, global y por tipo de actividad.
4. Presentar en una tabla el avance por mes y por componente, destacando brechas y actividades vencidas.
5. Analizar las causas de incumplimiento y su correlación con la ocurrencia de incidentes en las áreas afectadas.
6. Proponer un plan de recuperación con responsables y plazos para cerrar las brechas críticas del programa.`,

  kpi_eficacia_capacitaciones: (p) => `${BASE(p)}

OBJETIVO: Evaluar la eficacia de las capacitaciones en SST como indicador predictivo, midiendo no solo la cobertura sino el cambio real en conocimiento y conducta, en cumplimiento de las 4 capacitaciones anuales exigidas por la Ley 29783.
1. Calcular la cobertura de capacitación = (N° trabajadores capacitados / N° total de trabajadores) x 100 y el promedio de horas-hombre de capacitación por trabajador.
2. Medir la eficacia de aprendizaje comparando puntajes de evaluaciones pre y post capacitación (ganancia de conocimiento).
3. Verificar la transferencia al puesto mediante observaciones de comportamiento seguro y cumplimiento de procedimientos en campo.
4. Correlacionar la eficacia de la capacitación con la reducción de actos subestándar y de incidentes en las áreas capacitadas.
5. Consolidar los resultados en una tabla con cobertura, ganancia de conocimiento, conducta observada e impacto en incidentes.
6. Recomendar ajustes de contenido, metodología y frecuencia para las capacitaciones de menor eficacia.`,

  kpi_severidad: (p) => `${BASE(p)}

OBJETIVO: Medir la severidad de los accidentes mediante el Índice de Gravedad y el análisis de días perdidos para priorizar los riesgos de mayor potencial de daño, según el Glosario del DS 005-2012-TR.
1. Recopilar por cada accidente del periodo los días de descanso médico perdidos y, de existir, los días cargados por incapacidad permanente o muerte según la tabla de conversión aplicable.
2. Calcular el Índice de Gravedad IG = (N° días perdidos x 1 000 000) / HHT del periodo.
3. Determinar la severidad media por accidente = Total de días perdidos / N° de accidentes incapacitantes.
4. Clasificar los eventos por nivel de severidad (leve, grave, mortal/incapacitante) y elaborar una tabla de distribución.
5. Identificar las partes del cuerpo, tareas y agentes causantes asociados a la mayor severidad acumulada.
6. Recomendar controles enfocados en los riesgos de alto potencial de gravedad, priorizando eliminación y sustitución según la Ley 29783.`,

  kpi_panel_gerencial: (p) => `${BASE(p)}

OBJETIVO: Diseñar un panel de control (dashboard) gerencial de SST que integre indicadores reactivos y proactivos para la toma de decisiones de la alta dirección, en línea con la revisión por la dirección de la Ley 29783.
1. Definir los indicadores clave a incluir: reactivos (IF, IG, IA, N° de accidentes) y proactivos (cumplimiento del programa, inspecciones, reportes de actos y condiciones, capacitaciones).
2. Establecer para cada indicador su fórmula, fuente de dato, frecuencia de actualización, meta y responsable.
3. Definir un semáforo de desempeño (verde/ámbar/rojo) con umbrales objetivos para cada indicador.
4. Estructurar el layout del panel en bloques: resultados, gestión preventiva, tendencias y alertas predictivas.
5. Especificar las visualizaciones recomendadas (tendencias, comparativos por área, distribución de causas) y presentar una tabla con la ficha de cada indicador.
6. Recomendar la cadencia de revisión y los criterios de escalamiento de alertas a la gerencia.`,

  kpi_actos_inseguros: (p) => `${BASE(p)}

OBJETIVO: Establecer el reporte y análisis de actos inseguros (subestándar) como indicador proactivo predictivo, aprovechando que el comportamiento es precursor de la mayoría de los accidentes.
1. Definir la taxonomía de actos inseguros relevantes para la actividad (no uso de EPP, posiciones inseguras, bloqueo omitido, exceso de velocidad, etc.).
2. Registrar los reportes del periodo por área, tipo de acto y nivel de riesgo, garantizando un canal de reporte sin culpa.
3. Calcular el Índice de Reporte = N° de actos reportados / (HHT / 1 000 000) o por trabajador, y el ratio de cierre de acciones derivadas.
4. Elaborar una tabla de frecuencia por tipo de acto y un análisis de Pareto para identificar los pocos vitales.
5. Correlacionar la tendencia de actos inseguros con la ocurrencia posterior de incidentes para validar su valor predictivo.
6. Recomendar intervenciones conductuales y controles priorizados sobre los actos de mayor frecuencia y potencial de daño.`,

  kpi_condiciones_subestandar: (p) => `${BASE(p)}

OBJETIVO: Dar seguimiento a las condiciones subestándar detectadas como indicador proactivo del estado físico del entorno de trabajo, anticipando accidentes por fallas materiales.
1. Consolidar las condiciones subestándar identificadas en inspecciones, observaciones y reportes (resguardos, orden y limpieza, instalaciones eléctricas, superficies, iluminación, etc.).
2. Clasificar cada condición por área, tipo de peligro y nivel de riesgo, e indicar su origen (inspección programada, reporte espontáneo, auditoría).
3. Calcular el Índice de Cierre = (Condiciones corregidas / Condiciones detectadas) x 100 y el tiempo promedio de cierre por nivel de riesgo.
4. Identificar condiciones reincidentes o vencidas y elaborar una tabla de estado (abiertas, en proceso, cerradas, vencidas).
5. Correlacionar las condiciones de mayor riesgo no cerradas con la probabilidad de incidentes en esas áreas.
6. Recomendar la priorización de correcciones según riesgo y la mejora de los controles de ingeniería conforme a la jerarquía de la Ley 29783.`,

  kpi_tasa_frecuencia: (p) => `${BASE(p)}

OBJETIVO: Calcular e interpretar la tasa (índice) de frecuencia de lesiones como indicador reactivo central del desempeño en seguridad, conforme al Glosario del DS 005-2012-TR.
1. Determinar las horas-hombre trabajadas (HHT) reales del periodo, considerando dotación, jornadas y horas extra del total de trabajadores.
2. Contabilizar el N° de accidentes incapacitantes ocurridos en el mismo periodo, según el registro de la RM 050-2013-TR.
3. Calcular el Índice de Frecuencia IF = (N° accidentes incapacitantes x 1 000 000) / HHT.
4. Calcular variantes complementarias si se requiere (frecuencia total con accidentes leves, y frecuencia de casi-accidentes como métrica proactiva).
5. Comparar el IF con periodos anteriores y con la meta establecida en una tabla de evolución, indicando la tendencia.
6. Recomendar medidas de control priorizadas para reducir la frecuencia, enfocadas en las causas raíz más recurrentes.`,

  // ───────────── 10. Sostenibilidad e Impacto Ambiental ─────────────
  amb_iso14001: (p) => `${BASE(p)}

OBJETIVO: Realizar una auditoría interna de cumplimiento del Sistema de Gestión Ambiental bajo ISO 14001:2015 para la actividad descrita, verificando la conformidad de sus requisitos y la integración con la normativa ambiental peruana.
1. Define el alcance y los criterios de auditoría, mapeando los requisitos de ISO 14001:2015 (cláusulas 4 a 10) frente a las obligaciones de la Ley 28611 (Ley General del Ambiente) aplicables al rubro.
2. Evalúa el contexto de la organización, las partes interesadas y la política ambiental, verificando la coherencia con los aspectos ambientales significativos de la operación.
3. Audita la matriz de identificación de aspectos e impactos ambientales (IAAS), el registro de requisitos legales ambientales y la evaluación de su cumplimiento.
4. Revisa controles operacionales, objetivos y metas ambientales, competencias del personal y preparación ante emergencias ambientales.
5. Genera una tabla de hallazgos clasificados (no conformidad mayor, menor, observación, oportunidad de mejora) con la cláusula incumplida, la evidencia y la base legal vinculada.
6. Propón un plan de acción correctiva con responsables, plazos y criterios de cierre verificables.`,

  amb_economia_circular: (p) => `${BASE(p)}

OBJETIVO: Diseñar una estrategia de economía circular aplicada a los procesos de la actividad descrita, orientada a reducir la generación de residuos en origen y revalorizar materiales, en línea con el DL 1278 y su reglamento DS 014-2017-MINAM.
1. Levanta el balance de materiales y energía del proceso, identificando entradas, salidas, mermas y flujos de residuos por etapa.
2. Aplica la jerarquía de gestión de residuos del DL 1278 (minimización, reaprovechamiento, valorización material y energética, disposición final) priorizando las oportunidades de mayor impacto.
3. Identifica posibilidades de simbiosis industrial, reúso interno, retorno a proveedores y valorización con Empresas Operadoras de Residuos Sólidos (EO-RS) autorizadas.
4. Define indicadores circulares (tasa de valorización, % de residuo desviado de relleno, intensidad de material) con líneas base y metas.
5. Elabora una tabla de iniciativas con inversión estimada, ahorro proyectado, residuo evitado y responsable.
6. Establece un cronograma de implementación por fases con hitos de seguimiento.`,

  amb_eficiencia_energetica: (p) => `${BASE(p)}

OBJETIVO: Evaluar el desempeño energético de la operación descrita y proponer medidas de eficiencia en el consumo de energía que reduzcan costos y emisiones asociadas, considerando el aspecto ambiental de uso de recursos según la Ley 28611.
1. Construye la línea base de consumo energético por fuente (electricidad, combustibles) y por proceso o equipo, identificando los principales consumidores.
2. Calcula indicadores de desempeño energético (consumo específico por unidad producida, factor de carga) y compara contra referencias del sector.
3. Identifica oportunidades de eficiencia: optimización de equipos, iluminación eficiente, gestión de la demanda, recuperación de calor y reemplazo por fuentes renovables.
4. Vincula cada medida con la reducción de emisiones de gases de efecto invernadero y de contaminantes asociados a la combustión.
5. Presenta una tabla de medidas con ahorro energético estimado, inversión, periodo de retorno y emisiones evitadas.
6. Propón un esquema de monitoreo y mejora continua del desempeño energético.`,

  amb_emisiones: (p) => `${BASE(p)}

OBJETIVO: Establecer un programa de control de emisiones atmosféricas de fuentes fijas de la operación descrita, asegurando el cumplimiento de los Estándares de Calidad Ambiental para Aire (DS 003-2017-MINAM) y los Límites Máximos Permisibles sectoriales aplicables.
1. Inventaria las fuentes fijas de emisión (chimeneas, calderas, hornos, generadores) y caracteriza los contaminantes emitidos por cada una.
2. Contrasta los parámetros emitidos contra el ECA Aire (DS 003-2017-MINAM) y los LMP sectoriales correspondientes, identificando brechas de cumplimiento.
3. Define el plan de monitoreo de emisiones y de calidad del aire (puntos, parámetros, frecuencia, métodos) ejecutado por laboratorio acreditado ante INACAL.
4. Propón controles de ingeniería para mitigar emisiones (sistemas de abatimiento, filtros, mantenimiento de combustión, dispersión).
5. Elabora una tabla de fuentes, contaminantes, valor medido, valor límite y medida de control asociada.
6. Establece registros, reportes a la autoridad competente y acciones ante excedencias.`,

  amb_residuos_especiales: (p) => `${BASE(p)}

OBJETIVO: Diseñar el procedimiento de gestión integral de residuos peligrosos y especiales generados por la actividad descrita, conforme al DL 1278 y su reglamento DS 014-2017-MINAM, garantizando su manejo seguro desde la generación hasta la disposición final.
1. Identifica y clasifica los residuos peligrosos generados según sus características de peligrosidad (CRETIB) y los segrega de los residuos no peligrosos.
2. Define los requisitos de almacenamiento central de residuos peligrosos (señalización, impermeabilización, contención secundaria, compatibilidad, tiempo máximo de almacenamiento).
3. Establece el rotulado, etiquetado y la documentación de control, incluyendo el manifiesto de manejo de residuos sólidos peligrosos.
4. Define la contratación de Empresas Operadoras de Residuos Sólidos (EO-RS) autorizadas para transporte y disposición final en infraestructura habilitada.
5. Presenta una tabla por tipo de residuo con característica de peligrosidad, código, condición de almacenamiento, EO-RS y destino final.
6. Determina las obligaciones de declaración en el SIGERSOL y los registros que conserva el generador.`,

  amb_huella_carbono: (p) => `${BASE(p)}

OBJETIVO: Calcular la huella de carbono de las operaciones descritas para cuantificar las emisiones de gases de efecto invernadero y definir una ruta de reducción, alineando el ejercicio con la herramienta Huella de Carbono Perú del MINAM y la Ley 28611.
1. Define el año base, los límites organizacionales y operativos, y los alcances a inventariar (Alcance 1 emisiones directas, Alcance 2 energía adquirida, Alcance 3 cuando aplique).
2. Recopila los datos de actividad por fuente (consumo de combustibles, electricidad, procesos, residuos) y selecciona los factores de emisión oficiales aplicables.
3. Calcula las emisiones por fuente y alcance expresadas en toneladas de CO2 equivalente, consolidando el inventario total.
4. Identifica los focos de emisión más relevantes y define medidas de reducción priorizadas por costo-efectividad.
5. Presenta una tabla con fuente, alcance, dato de actividad, factor de emisión y tCO2e resultante.
6. Propón metas de reducción, indicadores de seguimiento y opciones de compensación verificables.`,

  amb_impacto_vecinal: (p) => `${BASE(p)}

OBJETIVO: Formular un plan de mitigación de impactos ambientales sobre la comunidad vecina (ruido, polvo y afectaciones sociales) derivados de la operación descrita, asegurando el cumplimiento del ECA Ruido (DS 085-2003-PCM) y la gestión social conforme a la Ley 28611.
1. Identifica los impactos hacia el entorno vecino mediante la matriz IAAS, caracterizando emisiones de ruido, material particulado y demás afectaciones por etapa.
2. Contrasta los niveles de ruido y de material particulado contra el ECA Ruido (DS 085-2003-PCM) y el ECA Aire (DS 003-2017-MINAM) según la zonificación aplicable.
3. Define medidas de mitigación en la fuente (barreras acústicas, horarios, humectación de vías, encapsulamiento) y de control en el receptor.
4. Diseña un mecanismo de relacionamiento comunitario y atención de quejas con registro y plazos de respuesta.
5. Presenta una tabla de impacto, parámetro, valor de referencia normativo, medida de mitigación y responsable.
6. Establece el monitoreo participativo y los indicadores de eficacia de las medidas.`,

  amb_plan_residuos: (p) => `${BASE(p)}

OBJETIVO: Elaborar el Plan de Manejo de Residuos Sólidos de la actividad descrita conforme al DL 1278 y su reglamento DS 014-2017-MINAM, estructurando la gestión desde la minimización hasta la disposición final con sus registros obligatorios.
1. Caracteriza y cuantifica los residuos sólidos generados por etapa del proceso, clasificándolos en peligrosos y no peligrosos.
2. Aplica la jerarquía del DL 1278 definiendo acciones de minimización, segregación en la fuente y reaprovechamiento.
3. Establece las condiciones de almacenamiento, recolección interna, transporte y disposición final a través de EO-RS autorizadas e infraestructura habilitada.
4. Define el código de colores de segregación, la señalización y la capacitación del personal.
5. Presenta una tabla por tipo de residuo con cantidad estimada, clasificación, manejo y destino final.
6. Determina los registros, la declaración en el SIGERSOL y los indicadores de seguimiento del plan.`,

  amb_biodiversidad: (p) => `${BASE(p)}

OBJETIVO: Diseñar un programa de protección de la biodiversidad y los ecosistemas en el área de influencia de la operación descrita, aplicando la jerarquía de mitigación y la conservación de recursos naturales conforme a la Ley 28611.
1. Caracteriza el entorno biológico del área de influencia (flora, fauna, hábitats, presencia de especies sensibles o áreas naturales protegidas).
2. Identifica mediante la matriz IAAS los impactos de la operación sobre la biodiversidad y los servicios ecosistémicos por etapa.
3. Aplica la jerarquía de mitigación (evitar, minimizar, restaurar, compensar) priorizando la prevención del impacto.
4. Define medidas específicas de protección (delimitación de áreas, control de especies invasoras, manejo de fauna, revegetación con especies nativas).
5. Presenta una tabla de impacto, componente afectado, medida de mitigación, jerarquía aplicada y responsable.
6. Establece indicadores de monitoreo biológico y la verificación de eficacia de las medidas.`,

  amb_vertimientos: (p) => `${BASE(p)}

OBJETIVO: Establecer el control de los vertimientos de aguas residuales industriales de la operación descrita, asegurando el cumplimiento de los Límites Máximos Permisibles de efluentes y la protección del cuerpo receptor según el ECA Agua (DS 004-2017-MINAM).
1. Identifica y caracteriza los efluentes industriales generados por proceso (caudal, parámetros físico-químicos, puntos de generación y de vertimiento).
2. Contrasta los parámetros del efluente contra los LMP sectoriales aplicables y evalúa el cuerpo receptor frente al ECA Agua (DS 004-2017-MINAM) según su categoría.
3. Define el sistema de tratamiento de efluentes requerido para alcanzar el cumplimiento (pretratamiento, tratamiento primario y secundario según corresponda).
4. Establece el plan de monitoreo de efluentes y del cuerpo receptor (puntos, parámetros, frecuencia) con laboratorio acreditado ante INACAL.
5. Presenta una tabla por parámetro con valor medido, LMP, valor del ECA Agua y medida de control asociada.
6. Determina la autorización de vertimiento ante la ANA, los registros y las acciones ante excedencias.`,

};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!GROQ_KEY) return json({ error: "Falta configurar GROQ_API_KEY en el servidor." }, 500);
    const { promptId, params } = await req.json();
    const build = PROMPTS[promptId];
    if (!build) return json({ error: "Tarea no válida." }, 400);
    const prompt = build(params || {});

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 4096,
      }),
    });
    const data = await r.json();
    if (!r.ok) return json({ error: data?.error?.message || "Error de la IA" }, 500);
    const texto = (data?.choices?.[0]?.message?.content || "").trim();
    if (!texto) return json({ error: "La IA no devolvió contenido. Intenta de nuevo." }, 500);
    return json({ texto });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
