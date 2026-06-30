// ════════════════════════════════════════════════════════════════════
//  AsistenteSST — Asistente IA SSOMA (solo DEMO)
//  El usuario llena datos → se envían a la Edge Function 'asistente-sst'
//  (los prompts viven OCULTOS en el backend) → devuelve el informe.
//  100 herramientas en 10 categorías. Adaptado a normativa peruana.
// ════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Btn } from '../../components/ui/Btn.jsx';
import { GUIAS } from '../../constants/asistente-guias.js';
import { descargarWord, descargarExcel, descargarTexto } from '../../lib/asistente-export.js';
import { Sparkles, ChevronLeft, ChevronRight, Copy, Download, Loader2, FileText,
  ClipboardList, Search, ShieldCheck, GraduationCap, ClipboardCheck, Wind,
  Flame, BarChart3, Leaf, HelpCircle, FileSpreadsheet } from 'lucide-react';

// Formato recomendado por categoría (prefijo del id)
const FORMATO_RECOMENDADO = { insp: "excel", kpi: "excel" }; // el resto → word

const CAMPOS = [
  { key: "actividad", label: "Actividad / tema *", tipo: "input", ph: "Ej. Mantenimiento de faja transportadora" },
  { key: "area", label: "Área / proceso", tipo: "input", ph: "Ej. Planta de producción" },
  { key: "entorno", label: "Entorno / contexto", tipo: "textarea", ph: "Describe el lugar, condiciones, accesos…" },
  { key: "n_trabajadores", label: "N° de trabajadores", tipo: "number", ph: "Ej. 4" },
  { key: "detalle", label: "Detalles (equipos, sustancias, condiciones)", tipo: "textarea", ph: "Maquinaria, productos químicos, alturas, etc." },
];

// 10 categorías × ~10 herramientas. Los IDs coinciden con la Edge Function.
const CATEGORIAS = [
  { id: "iperc", titulo: "Matriz IPERC Continua", Icon: ClipboardList, color: "blue",
    desc: "Identificación de peligros y evaluación de riesgos (5x5).",
    tareas: [
      { id: "tareas_criticas", titulo: "Análisis de tareas críticas" },
      { id: "peligros_psicosociales", titulo: "Clasificación peligros psicosociales" },
      { id: "probabilidad_incidentes", titulo: "Estimación probabilidad de incidentes" },
      { id: "riesgos_ergonomicos", titulo: "Evaluación de riesgos ergonómicos" },
      { id: "peligros_mecanicos", titulo: "Identificación de peligros mecánicos" },
      { id: "peligros_biologicos", titulo: "Inventario de peligros biológicos" },
      { id: "controles_quimicos", titulo: "Jerarquía de controles químicos" },
      { id: "control_electrico", titulo: "Medidas de control eléctrico" },
      { id: "riesgos_residuales", titulo: "Reevaluación de riesgos residuales" },
      { id: "severidad_locativa", titulo: "Valoración de severidad locativa" },
    ] },
  { id: "inv", titulo: "Investigación de Accidentes", Icon: Search, color: "red",
    desc: "Análisis de causas y medidas correctivas.",
    tareas: [
      { id: "inv_fallas_sistemicas", titulo: "Análisis de fallas sistémicas" },
      { id: "inv_cronologia", titulo: "Cronología de eventos críticos" },
      { id: "inv_factores_personales", titulo: "Determinación de factores personales" },
      { id: "inv_ishikawa", titulo: "Diagrama de Ishikawa (6M)" },
      { id: "inv_entrevista_testigos", titulo: "Entrevista a testigos" },
      { id: "inv_causas_basicas", titulo: "Identificación de causas básicas" },
      { id: "inv_causa_raiz", titulo: "Método de Causa Raíz (ACR)" },
      { id: "inv_acciones_correctivas", titulo: "Propuesta de acciones correctivas" },
      { id: "inv_informe_preliminar", titulo: "Informe preliminar de accidente" },
      { id: "inv_lecciones_aprendidas", titulo: "Reporte de lecciones aprendidas" },
    ] },
  { id: "pt", titulo: "Permisos de Trabajo (PETAR)", Icon: ShieldCheck, color: "orange",
    desc: "Trabajos de alto riesgo: altura, confinados, caliente…",
    tareas: [
      { id: "pt_soldadura_oxicorte", titulo: "Trabajos en caliente (soldadura/oxicorte)" },
      { id: "pt_bloqueo_energias", titulo: "Bloqueo de energías (LOTO)" },
      { id: "pt_espacios_confinados", titulo: "Ingreso a espacios confinados" },
      { id: "pt_trabajos_electricos", titulo: "Control de trabajos eléctricos" },
      { id: "pt_izaje_cargas", titulo: "Estándar de izaje de cargas" },
      { id: "pt_excavaciones", titulo: "Excavaciones profundas" },
      { id: "pt_trabajos_altura", titulo: "Protocolo de trabajos en altura" },
      { id: "pt_sustancias", titulo: "Manejo de sustancias peligrosas" },
      { id: "pt_atmosferas_explosivas", titulo: "Verificación de atmósferas explosivas" },
      { id: "pt_vigia_fuego", titulo: "Responsabilidades del vigía de fuego" },
    ] },
  { id: "aud", titulo: "Auditoría de Sistemas de Gestión", Icon: ClipboardCheck, color: "purple",
    desc: "ISO 45001, requisitos legales, mejora continua.",
    tareas: [
      { id: "aud_documentacion", titulo: "Auditoría de documentación SGSST" },
      { id: "aud_matriz_requisitos", titulo: "Conformidad matriz de requisitos" },
      { id: "aud_registros", titulo: "Control de registros operativos" },
      { id: "aud_iso45001", titulo: "Cumplimiento ISO 45001" },
      { id: "aud_proveedores", titulo: "Desempeño de proveedores/contratistas" },
      { id: "aud_gestion_cambio", titulo: "Gestión del cambio organizacional" },
      { id: "aud_mejora_continua", titulo: "Mejora continua de procesos (PHVA)" },
      { id: "aud_revision_direccion", titulo: "Revisión por la dirección" },
      { id: "aud_politica_sst", titulo: "Seguimiento de la política SST" },
      { id: "aud_requisitos_legales", titulo: "Verificación de requisitos legales" },
    ] },
  { id: "cap", titulo: "Capacitación y Entrenamiento", Icon: GraduationCap, color: "cyan",
    desc: "Charlas, inducción, brigadas, evaluación.",
    tareas: [
      { id: "cap_charla5min", titulo: "Charla de cinco minutos" },
      { id: "cap_dinamicas", titulo: "Dinámicas grupales preventivas" },
      { id: "cap_primeros_auxilios", titulo: "Entrenamiento en primeros auxilios" },
      { id: "cap_evaluacion_conocimientos", titulo: "Evaluación de conocimientos (examen)" },
      { id: "cap_brigadas_rescate", titulo: "Formación de brigadas de rescate" },
      { id: "cap_induccion", titulo: "Guion de inducción para nuevos" },
      { id: "cap_material_senaletica", titulo: "Material didáctico de señalización" },
      { id: "cap_plan_anual", titulo: "Plan anual de capacitación" },
      { id: "cap_sensibilizacion", titulo: "Campaña de sensibilización" },
      { id: "cap_talleres_epp", titulo: "Talleres de uso de EPP" },
    ] },
  { id: "insp", titulo: "Inspecciones de Campo", Icon: ClipboardList, color: "emerald",
    desc: "Checklists de inspección de seguridad.",
    tareas: [
      { id: "insp_residuos_peligrosos", titulo: "Almacenamiento de residuos peligrosos" },
      { id: "insp_botiquines", titulo: "Auditoría de botiquines" },
      { id: "insp_vehiculos_pesados", titulo: "Checklist de vehículos pesados" },
      { id: "insp_escaleras", titulo: "Control de escaleras portátiles" },
      { id: "insp_equipos_proteccion", titulo: "Estado de EPP" },
      { id: "insp_senaletica", titulo: "Estado de señalética" },
      { id: "insp_orden_limpieza", titulo: "Orden y limpieza (5S)" },
      { id: "insp_andamios", titulo: "Andamios tubulares" },
      { id: "insp_extintores", titulo: "Revisión de extintores" },
      { id: "insp_herramientas", titulo: "Herramientas manuales y de poder" },
    ] },
  { id: "hig", titulo: "Higiene Ocupacional", Icon: Wind, color: "teal",
    desc: "Agentes físicos y químicos, ergonomía, fatiga.",
    tareas: [
      { id: "hig_polvo", titulo: "Control de polvo respirable" },
      { id: "hig_estres_termico", titulo: "Evaluación de estrés térmico" },
      { id: "hig_vibraciones", titulo: "Exposición a vibraciones" },
      { id: "hig_ergonomia_admin", titulo: "Ergonomía en oficina (PVD)" },
      { id: "hig_solventes", titulo: "Manejo de solventes químicos" },
      { id: "hig_iluminacion", titulo: "Medición de iluminación" },
      { id: "hig_ruido", titulo: "Monitoreo de ruido ocupacional" },
      { id: "hig_fatiga", titulo: "Prevención de fatiga laboral" },
      { id: "hig_radiacion_solar", titulo: "Protección contra radiación solar" },
      { id: "hig_vigilancia_epidemiologica", titulo: "Vigilancia epidemiológica" },
    ] },
  { id: "eme", titulo: "Emergencias y Contingencias", Icon: Flame, color: "red",
    desc: "Planes, brigadas, simulacros, evacuación.",
    tareas: [
      { id: "eme_alerta_incendios", titulo: "Alerta temprana de incendios" },
      { id: "eme_comunicacion_crisis", titulo: "Comunicación de crisis externa" },
      { id: "eme_brigada_incendios", titulo: "Equipamiento de brigada contra incendios" },
      { id: "eme_danos_post", titulo: "Evaluación de daños (EDAN)" },
      { id: "eme_simulacro_sismos", titulo: "Guion de simulacro de sismos" },
      { id: "eme_comando_incidentes", titulo: "Comando de incidentes (SCI)" },
      { id: "eme_derrames", titulo: "Plan de contingencia ante derrames" },
      { id: "eme_evacuacion", titulo: "Protocolo de evacuación" },
      { id: "eme_puntos_reunion", titulo: "Puntos de reunión seguros" },
      { id: "eme_rutas_escape", titulo: "Rutas de escape señalizadas" },
    ] },
  { id: "kpi", titulo: "Indicadores / KPI", Icon: BarChart3, color: "amber",
    desc: "Índices IF, IG, IA e indicadores predictivos.",
    tareas: [
      { id: "kpi_tendencias", titulo: "Análisis de tendencias de incidentes" },
      { id: "kpi_indice_accidentabilidad", titulo: "Índice de accidentabilidad" },
      { id: "kpi_costos_ocultos", titulo: "Costos ocultos de accidentes" },
      { id: "kpi_cumplimiento_programa", titulo: "Cumplimiento del programa anual" },
      { id: "kpi_eficacia_capacitaciones", titulo: "Eficacia de capacitaciones" },
      { id: "kpi_severidad", titulo: "Medición de severidad (IG)" },
      { id: "kpi_panel_gerencial", titulo: "Panel de control gerencial" },
      { id: "kpi_actos_inseguros", titulo: "Reporte de actos inseguros" },
      { id: "kpi_condiciones_subestandar", titulo: "Condiciones subestándar" },
      { id: "kpi_tasa_frecuencia", titulo: "Tasa de frecuencia de lesiones" },
    ] },
  { id: "amb", titulo: "Sostenibilidad y Ambiente", Icon: Leaf, color: "green",
    desc: "ISO 14001, residuos, emisiones, huella de carbono.",
    tareas: [
      { id: "amb_iso14001", titulo: "Auditoría ISO 14001" },
      { id: "amb_economia_circular", titulo: "Economía circular en procesos" },
      { id: "amb_eficiencia_energetica", titulo: "Eficiencia energética" },
      { id: "amb_emisiones", titulo: "Control de emisiones (fuentes fijas)" },
      { id: "amb_residuos_especiales", titulo: "Gestión de residuos peligrosos" },
      { id: "amb_huella_carbono", titulo: "Huella de carbono" },
      { id: "amb_impacto_vecinal", titulo: "Mitigación de impacto vecinal" },
      { id: "amb_plan_residuos", titulo: "Plan de manejo de residuos" },
      { id: "amb_biodiversidad", titulo: "Protección de biodiversidad" },
      { id: "amb_vertimientos", titulo: "Control de vertimientos de agua" },
    ] },
];

// Mapas estáticos de color (Tailwind no purga clases dinámicas)
const ICON_BG = {
  blue: "bg-blue-900/30 border-blue-900/40 text-blue-400",
  red: "bg-red-900/30 border-red-900/40 text-red-400",
  orange: "bg-orange-900/30 border-orange-900/40 text-orange-400",
  purple: "bg-purple-900/30 border-purple-900/40 text-purple-400",
  cyan: "bg-cyan-900/30 border-cyan-900/40 text-cyan-400",
  emerald: "bg-emerald-900/30 border-emerald-900/40 text-emerald-400",
  teal: "bg-teal-900/30 border-teal-900/40 text-teal-400",
  amber: "bg-amber-900/30 border-amber-900/40 text-amber-400",
  green: "bg-green-900/30 border-green-900/40 text-green-400",
};

export default function AsistenteSST({ empresa }) {
  const [cat, setCat] = useState(null);        // categoría abierta
  const [sel, setSel] = useState(null);        // tarea seleccionada {id, titulo}
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const abrirTarea = (t) => { setSel(t); setForm({}); setResult(""); setError(""); };
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const generar = async () => {
    if (!form.actividad?.trim()) { showToast("Indica la actividad / tema", "error"); return; }
    setLoading(true); setError(""); setResult("");
    try {
      const { data, error } = await supabase.functions.invoke("asistente-sst", { body: { promptId: sel.id, params: form } });
      if (error) throw new Error(error.message || "Error de conexión");
      if (data?.error) throw new Error(data.error);
      setResult(data?.texto || "");
    } catch (e) {
      setError(String(e.message || e));
    }
    setLoading(false);
  };

  const copiar = () => { navigator.clipboard?.writeText(result).catch(() => {}); showToast("Copiado", "success"); };
  const nombreArchivo = () => `${sel.id}_${new Date().toISOString().slice(0, 10)}`;
  const aWord = () => { descargarWord(result, nombreArchivo(), sel.titulo); showToast("Descargado en Word", "success"); };
  const aExcel = () => { descargarExcel(result, nombreArchivo(), sel.titulo); showToast("Descargado en Excel", "success"); };
  const aTexto = () => { descargarTexto(result, nombreArchivo()); showToast("Descargado en texto", "success"); };

  // ── Vista detalle (formulario + resultado) ──
  if (sel) {
    const guia = GUIAS[sel.id];
    const ph = (k) => guia?.ej?.[k] || CAMPOS.find(c => c.key === k)?.ph;
    const recomendado = FORMATO_RECOMENDADO[cat?.id] || "word";
    return (
      <div>
        <button onClick={() => setSel(null)} className="mb-4 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"><ChevronLeft size={13} /> Volver a {cat?.titulo}</button>
        <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2"><Sparkles size={16} className="text-blue-400" /> {sel.titulo}</h3>
        <p className="text-gray-500 text-xs mb-4">Adaptado a normativa peruana (Ley 29783, DS 005-2012-TR y normas específicas).</p>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Formulario */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            {guia && (
              <div className="bg-blue-900/30 border border-blue-900/50 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-xs"><HelpCircle size={14} /> Guía de uso</div>
                {guia.que && <p className="text-xs text-gray-300 leading-relaxed"><span className="font-semibold text-gray-200">Qué genera:</span> {guia.que}</p>}
                {guia.guia && <p className="text-xs text-gray-300 leading-relaxed"><span className="font-semibold text-gray-200">Qué colocar:</span> {guia.guia}</p>}
                {guia.tip && <p className="text-xs text-gray-400 leading-relaxed"><span className="font-semibold text-gray-300">💡 Tip:</span> {guia.tip}</p>}
                <p className="text-[11px] text-gray-500">Los campos muestran ejemplos en gris como referencia.</p>
              </div>
            )}
            {CAMPOS.map(c => (
              <FormField key={c.key} label={c.label}>
                {c.tipo === "textarea"
                  ? <textarea rows={2} value={form[c.key] || ""} onChange={e => setF(c.key, e.target.value)} placeholder={ph(c.key)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none" />
                  : <Input type={c.tipo === "number" ? "number" : "text"} value={form[c.key] || ""} onChange={e => setF(c.key, e.target.value)} placeholder={ph(c.key)} />}
              </FormField>
            ))}
            <Btn variant="primary" disabled={loading} onClick={generar} className="w-full">
              {loading ? <><Loader2 size={14} className="animate-spin" /> Generando…</> : <><Sparkles size={14} /> Generar informe con IA</>}
            </Btn>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>

          {/* Resultado */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 min-h-[300px]">
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Informe generado</span>
              {result && <div className="flex items-center gap-1.5">
                <button onClick={aWord} title="Descargar en Word"
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${recomendado === "word" ? "bg-blue-900/40 border-blue-700 text-blue-300" : "border-gray-700 text-gray-400 hover:text-blue-300"}`}>
                  <FileText size={13} /> Word{recomendado === "word" && <span className="text-[9px] opacity-70">★</span>}
                </button>
                <button onClick={aExcel} title="Descargar en Excel"
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${recomendado === "excel" ? "bg-emerald-900/40 border-emerald-700 text-emerald-300" : "border-gray-700 text-gray-400 hover:text-emerald-300"}`}>
                  <FileSpreadsheet size={13} /> Excel{recomendado === "excel" && <span className="text-[9px] opacity-70">★</span>}
                </button>
                <button onClick={aTexto} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-gray-700 text-gray-400 hover:text-gray-200" title="Descargar texto (.md)"><Download size={13} /> Texto</button>
                <button onClick={copiar} className="p-1.5 rounded-md border border-gray-700 text-gray-400 hover:text-blue-300" title="Copiar"><Copy size={13} /></button>
              </div>}
            </div>
            {loading && <div className="flex flex-col items-center justify-center py-16 text-gray-600 text-sm"><Loader2 size={24} className="animate-spin mb-2" /> Generando informe…</div>}
            {!loading && !result && <div className="flex flex-col items-center justify-center py-16 text-gray-700 text-sm text-center"><FileText size={26} className="mb-2" /> Completa los datos y pulsa "Generar".</div>}
            {!loading && result && <div className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed max-h-[60vh] overflow-y-auto">{result}</div>}
          </div>
        </div>
      </div>
    );
  }

  // ── Vista herramientas de una categoría ──
  if (cat) {
    return (
      <div>
        <button onClick={() => setCat(null)} className="mb-4 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"><ChevronLeft size={13} /> Todas las categorías</button>
        <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2"><cat.Icon size={16} className="text-blue-400" /> {cat.titulo}</h3>
        <p className="text-gray-500 text-xs mb-4">{cat.desc} · Elige una herramienta.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {cat.tareas.map(t => (
            <button key={t.id} onClick={() => abrirTarea(t)} className="text-left flex items-center justify-between gap-2 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 hover:border-blue-700 hover:bg-gray-800/40 transition-colors">
              <span className="text-sm text-gray-200">{t.titulo}</span>
              <ChevronRight size={14} className="text-gray-600 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Vista lista de categorías ──
  return (
    <div>
      <div className="mb-4">
        <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2"><Sparkles size={16} className="text-blue-400" /> Asistente IA SSOMA</h3>
        <p className="text-gray-500 text-xs max-w-2xl">Genera análisis técnicos de SSOMA con IA, adaptados a la normativa peruana. <span className="text-gray-600">100 herramientas en 10 categorías.</span> Elige una categoría para empezar.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CATEGORIAS.map(c => (
          <button key={c.id} onClick={() => setCat(c)} className="text-left bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-blue-700 hover:bg-gray-800/40 transition-colors">
            <div className={`w-9 h-9 rounded-lg border flex items-center justify-center mb-2 ${ICON_BG[c.color] || ICON_BG.blue}`}><c.Icon size={16} /></div>
            <div className="text-sm font-medium text-white">{c.titulo}</div>
            <div className="text-xs text-gray-500 mt-0.5">{c.desc}</div>
            <div className="text-[11px] text-gray-600 mt-1.5">{c.tareas.length} herramientas</div>
          </button>
        ))}
      </div>
    </div>
  );
}
