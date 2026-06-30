// ════════════════════════════════════════════════════════════════════
//  asistente-sst — Supabase Edge Function
//  Asistente IA SSOMA. Los PROMPTS viven aquí (ocultos, nunca en el
//  frontend). Recibe { promptId, params }, arma el prompt internamente,
//  llama a Groq (gratis, rápido) y devuelve solo el texto generado.
//  Adaptado a normativa peruana: Ley 29783, DS 005-2012-TR, RM 050-2013-TR.
// ════════════════════════════════════════════════════════════════════
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const GROQ_KEY = Deno.env.get("GROQ_API_KEY") || "";
const MODEL = "llama-3.3-70b-versatile";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Base común: rol experto + marco normativo peruano + metodología IPERC 5x5
const BASE = (p: Record<string, string>) => `Actúa como un Especialista Senior en Seguridad y Salud en el Trabajo (SSOMA) con más de 15 años de experiencia en industria peruana, dominio de la Ley N° 29783 (Ley de SST), su Reglamento DS N° 005-2012-TR, la RM N° 050-2013-TR y la metodología IPERC con matriz de 5x5 (Probabilidad x Severidad).

Contexto de la evaluación:
- Actividad / tarea: ${p.actividad || "(no especificada)"}
- Área / proceso: ${p.area || "(no especificada)"}
- Entorno de trabajo: ${p.entorno || "(no especificado)"}
- N° de trabajadores expuestos: ${p.n_trabajadores || "(no especificado)"}
- Detalles adicionales (equipos, sustancias, condiciones): ${p.detalle || "(ninguno)"}

Requisitos de salida:
- Redacta en español técnico, claro y accionable, listo para un expediente SST en Perú.
- Cita la base legal peruana aplicable cuando corresponda.
- Usa la matriz IPERC 5x5 y la jerarquía de controles del Art. 21 de la Ley 29783 (eliminación, sustitución, controles de ingeniería, controles administrativos/señalización, EPP).
- Estructura con encabezados y tablas en formato Markdown.`;

// PROMPTS OCULTOS (Matriz IPERC Continua) — cada uno enfoca un objetivo
const PROMPTS: Record<string, (p: Record<string, string>) => string> = {
  tareas_criticas: (p) => `${BASE(p)}

OBJETIVO: Realiza el análisis de la TAREA CRÍTICA indicada.
1. Descomposición secuencial detallada de la actividad (pasos preparatorios, ejecución, cierre, orden y limpieza).
2. Por cada paso: peligros, energías peligrosas (cinética, eléctrica, neumática, gravitacional, química, térmica), riesgos asociados y posibles fallas del sistema.
3. Valoración del riesgo con matriz 5x5 (probabilidad y severidad justificadas).
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
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
