// ════════════════════════════════════════════════════════════════════
//  AsistenteSST — Asistente IA SSOMA (solo DEMO)
//  El usuario llena datos → se envían a la Edge Function 'asistente-sst'
//  (los prompts viven OCULTOS en el backend) → devuelve el informe.
//  Categoría inicial: Matriz IPERC Continua. Adaptado a normativa peruana.
// ════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Btn } from '../../components/ui/Btn.jsx';
import { Sparkles, ChevronLeft, Copy, Download, Loader2, FileText } from 'lucide-react';

const CAMPOS = [
  { key: "actividad", label: "Actividad / tarea *", tipo: "input", ph: "Ej. Mantenimiento de faja transportadora" },
  { key: "area", label: "Área / proceso", tipo: "input", ph: "Ej. Planta de producción" },
  { key: "entorno", label: "Entorno de trabajo", tipo: "textarea", ph: "Describe el lugar, condiciones, accesos…" },
  { key: "n_trabajadores", label: "N° de trabajadores expuestos", tipo: "number", ph: "Ej. 4" },
  { key: "detalle", label: "Detalles (equipos, sustancias, condiciones)", tipo: "textarea", ph: "Maquinaria, productos químicos, alturas, etc." },
];

const TAREAS = [
  { id: "tareas_criticas", titulo: "Análisis de tareas críticas", desc: "Descompone la tarea y evalúa riesgos con IPERC 5x5." },
  { id: "peligros_psicosociales", titulo: "Peligros psicosociales", desc: "Clasifica factores psicosociales y propone controles." },
  { id: "probabilidad_incidentes", titulo: "Probabilidad de incidentes", desc: "Estima probabilidad y nivel de riesgo." },
  { id: "riesgos_ergonomicos", titulo: "Riesgos ergonómicos", desc: "Evalúa factores disergonómicos (RM 375-2008-TR)." },
  { id: "peligros_mecanicos", titulo: "Peligros mecánicos", desc: "Equipos y máquinas: atrapamiento, corte, golpes…" },
  { id: "peligros_biologicos", titulo: "Peligros biológicos", desc: "Inventario de agentes biológicos y controles." },
  { id: "controles_quimicos", titulo: "Controles químicos", desc: "Jerarquía de controles para sustancias químicas." },
  { id: "control_electrico", titulo: "Control eléctrico", desc: "Medidas de control para riesgo eléctrico." },
  { id: "riesgos_residuales", titulo: "Riesgos residuales", desc: "Reevalúa el riesgo tras aplicar controles." },
  { id: "severidad_locativa", titulo: "Severidad locativa", desc: "Peligros locativos del área de trabajo." },
];

export default function AsistenteSST({ empresa }) {
  const [sel, setSel] = useState(null);        // tarea seleccionada
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const abrir = (t) => { setSel(t); setForm({}); setResult(""); setError(""); };
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const generar = async () => {
    if (!form.actividad?.trim()) { showToast("Indica la actividad / tarea", "error"); return; }
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
  const descargar = () => {
    const blob = new Blob([result], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${sel.id}_${new Date().toISOString().slice(0, 10)}.md`; a.click(); URL.revokeObjectURL(a.href);
  };

  // ── Vista detalle (formulario + resultado) ──
  if (sel) {
    return (
      <div>
        <button onClick={() => setSel(null)} className="mb-4 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"><ChevronLeft size={13} /> Volver</button>
        <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2"><Sparkles size={16} className="text-blue-400" /> {sel.titulo}</h3>
        <p className="text-gray-500 text-xs mb-4">{sel.desc} · Adaptado a normativa peruana (Ley 29783, DS 005-2012-TR).</p>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Formulario */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            {CAMPOS.map(c => (
              <FormField key={c.key} label={c.label}>
                {c.tipo === "textarea"
                  ? <textarea rows={2} value={form[c.key] || ""} onChange={e => setF(c.key, e.target.value)} placeholder={c.ph} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none" />
                  : <Input type={c.tipo === "number" ? "number" : "text"} value={form[c.key] || ""} onChange={e => setF(c.key, e.target.value)} placeholder={c.ph} />}
              </FormField>
            ))}
            <Btn variant="primary" disabled={loading} onClick={generar} className="w-full">
              {loading ? <><Loader2 size={14} className="animate-spin" /> Generando…</> : <><Sparkles size={14} /> Generar informe con IA</>}
            </Btn>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>

          {/* Resultado */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 min-h-[300px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Informe generado</span>
              {result && <div className="flex gap-1">
                <button onClick={copiar} className="text-gray-500 hover:text-blue-300 p-1" title="Copiar"><Copy size={14} /></button>
                <button onClick={descargar} className="text-gray-500 hover:text-emerald-300 p-1" title="Descargar .md"><Download size={14} /></button>
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

  // ── Vista lista de tareas ──
  return (
    <div>
      <div className="mb-4">
        <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2"><Sparkles size={16} className="text-blue-400" /> Asistente IA SSOMA</h3>
        <p className="text-gray-500 text-xs max-w-2xl">Genera análisis técnicos de SST con IA, adaptados a la normativa peruana. Elige una herramienta, completa los datos y obtén el informe. <span className="text-gray-600">(Categoría: Matriz IPERC Continua)</span></p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TAREAS.map(t => (
          <button key={t.id} onClick={() => abrir(t)} className="text-left bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-blue-700 hover:bg-gray-800/40 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-blue-900/30 border border-blue-900/40 flex items-center justify-center mb-2"><Sparkles size={16} className="text-blue-400" /></div>
            <div className="text-sm font-medium text-white">{t.titulo}</div>
            <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
