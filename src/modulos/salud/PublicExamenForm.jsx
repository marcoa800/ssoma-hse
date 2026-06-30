// ════════════════════════════════════════════════════════════════════
//  PublicExamenForm — Form público de exámenes (sin login)
//  URL: ?examen=empresaId
//  Flujo: DNI → elige examen → 10 preguntas → resultado
// ════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import { brandingEmpresa } from '../../lib/helpers.js';
import { sedesDeEmpresa } from '../../constants/sedes.js';
import { CheckCircle, XCircle, ClipboardList, Award } from 'lucide-react';

const LETRAS = ['a','b','c','d'];
const LETRA_LABEL = { a:'A', b:'B', c:'C', d:'D' };

// ── Botón sin retardo 300ms: touch-action:manipulation en CSS ─────────
// Elimina el tap delay en móvil sin interferir con eventos nativos.
function BtnInstant({ onClick, disabled, className, children, style }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', ...style }}
      className={className}>
      {children}
    </button>
  );
}

// Convierte un link de YouTube a su URL de embed
function ytEmbed(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  const id = m ? m[1] : (/^[\w-]{11}$/.test(url.trim()) ? url.trim() : null);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

// Convierte un link de Google (Drive, Docs, Sheets, Slides) a su URL embebible (solo lectura)
function driveEmbed(url) {
  if (!url) return null;
  // Documentos de Google: Docs / Sheets / Slides
  let m = url.match(/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([\w-]+)/);
  if (m) return `https://docs.google.com/${m[1]}/d/${m[2]}/preview`;
  // Drive: archivo /file/d/ID/
  m = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  // Drive: open?id= / uc?id= / ...&id=
  if (/drive\.google\.com|docs\.google\.com/.test(url)) {
    m = url.match(/[?&]id=([\w-]+)/);
    if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  }
  return null;
}

// Embed universal: YouTube o Drive (o null si no es embebible)
function videoEmbed(url) {
  return ytEmbed(url) || driveEmbed(url);
}

export default function PublicExamenForm({ empresaId }) {
  // Si viene con ?id=examenId, va directo a ese examen (sin elegir)
  const examenIdFijo = new URLSearchParams(window.location.search).get('id');
  const [paso, setPaso] = useState('dni');
  const [dni, setDni] = useState('');
  const [nombre, setNombre] = useState('');
  const [sede, setSede] = useState('');
  const [examenFijo, setExamenFijo] = useState(null);
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [examenes, setExamenes] = useState([]);
  const [examenSel, setExamenSel] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [correctasMap, setCorrectasMap] = useState({});
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Branding por empresa (Gelarti / Comindustria / genérico) ──
  const brand = brandingEmpresa(empresaNombre);
  const [sedesDisponibles, setSedesDisponibles] = useState([]);
  // Lista fija de sedes (Expertos / Franquicias). Si existe, manda sobre la del directorio.
  const sedesPortal = sedesDeEmpresa(empresaNombre) || sedesDisponibles;
  useEffect(() => {
    if (!empresaId) return;
    supabase.rpc('examen_empresa_nombre', { p_id: empresaId })
      .then(({ data }) => setEmpresaNombre(data || ''));
    // Sedes reales del directorio → para que el trabajador elija la ortografía exacta
    supabase.from('trabajadores').select('sede').eq('empresa_id', empresaId)
      .then(({ data }) => {
        const lista = [...new Set((data || []).map(r => (r.sede || '').trim()).filter(Boolean))]
          .sort((a, b) => a.localeCompare(b, 'es'));
        setSedesDisponibles(lista);
      });
  }, [empresaId]);

  // Continúa después de capturar la sede: va al examen fijo o a la lista
  const continuarTrasSede = () => {
    if (!sede.trim()) { setError('Indica tu sede para continuar'); return; }
    setError('');
    if (examenFijo) { elegirExamen(examenFijo); return; }
    setPaso('examen');
  };

  // ── Paso 1: buscar trabajador por DNI ──
  const buscarDNI = async () => {
    if (!/^\d{8,12}$/.test(dni)) { setError('Ingresa tu DNI (8 dígitos) o carnet de extranjería (9 a 12 dígitos)'); return; }
    setLoading(true); setError('');
    const { data: nombreRpc } = await supabase.rpc('examen_buscar_trabajador',
      { p_empresa_id: empresaId, p_dni: dni });
    const nombreDir = nombreRpc || '';
    setNombre(nombreDir);

    // Si viene con link directo a un examen específico
    if (examenIdFijo) {
      const { data: ex } = await supabase.from('examenes').select('id,nombre,descripcion,puntaje_minimo,video_url')
        .eq('id', examenIdFijo).eq('activo', true).single();
      setLoading(false);
      if (!ex) { setError('Este examen no está disponible.'); return; }
      setExamenFijo(ex);
      // Sin nombre en directorio → pedir nombre; con nombre → pedir sede (manual)
      setPaso(nombreDir ? 'sede' : 'nombre');
      return;
    }

    const { data: exs } = await supabase.from('examenes').select('id,nombre,descripcion,video_url')
      .eq('empresa_id', empresaId).eq('activo', true).order('created_at', { ascending: false });
    setExamenes(exs || []);
    setLoading(false);
    if (!exs?.length) { setError('No hay exámenes disponibles en este momento.'); return; }
    // Si no está en el directorio, pedir nombre manualmente; luego siempre la sede
    setPaso(nombreDir ? 'sede' : 'nombre');
  };

  // ── Paso 2: seleccionar examen ──
  const elegirExamen = async (ex, nombreOverride) => {
    setLoading(true); setError('');
    const nombreFinal = nombreOverride || nombre;
    const { data: ya } = await supabase.from('examen_resultados').select('id,desbloqueado')
      .eq('examen_id', ex.id).eq('dni', dni).single();
    if (ya && !ya.desbloqueado) {
      setLoading(false);
      setError(`Ya rendiste el examen "${ex.nombre}". Cada examen se puede rendir solo una vez.`);
      return;
    }
    const { data: ps } = await supabase.from('examen_preguntas')
      .select('id,orden,pregunta,opcion_a,opcion_b,opcion_c,opcion_d,correcta')
      .eq('examen_id', ex.id).order('orden');
    setExamenSel(ex);
    setPreguntas(ps || []);
    setCorrectasMap(Object.fromEntries((ps||[]).map(p => [p.id, p.correcta])));
    setRespuestas({});
    setLoading(false);
    setPaso(ex.video_url ? 'video' : 'preguntas');
  };

  // ── Paso 3: enviar respuestas ──
  const enviarRespuestas = () => {
    const sin = preguntas.filter(p => !respuestas[p.id]);
    if (sin.length) { setError(`Faltan ${sin.length} pregunta(s) por responder`); return; }
    setError('');
    let puntaje = 0;
    preguntas.forEach(p => { if (respuestas[p.id] === correctasMap[p.id]) puntaje++; });
    const aprobado = puntaje >= 7;
    setResultado({ puntaje, total: preguntas.length, aprobado, mapCorrectas: correctasMap });
    setPaso('resultado');
    // Guardar en BD en segundo plano
    supabase.from('examen_resultados').upsert({
      empresa_id: empresaId, examen_id: examenSel.id,
      dni, nombre: nombre || null, sede: sede || null, puntaje, total_preguntas: preguntas.length,
      aprobado, respuestas, fecha: new Date().toISOString(),
    }, { onConflict: 'examen_id,dni' }).then(({ error: err }) => {
      if (err) console.error('Error guardando resultado:', err.message);
    });
  };

  const progressPct = preguntas.length
    ? Math.round(Object.keys(respuestas).length / preguntas.length * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className={`w-full ${paso === 'sede' ? 'max-w-3xl' : 'max-w-lg'}`}>

        {/* Header */}
        <div className="text-center mb-6">
          {brand.logo && (
            <img src={brand.logo} alt={brand.marca} className="h-12 mx-auto mb-3 object-contain"
              onError={e => { e.currentTarget.style.display = 'none'; }} />
          )}
          <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold mb-3">
            <ClipboardList size={16}/> Examen de Capacitación
          </div>
          <p className="text-gray-500 text-xs">{brand.marca} — Sistema de Evaluación SST</p>
        </div>

        {/* ── PASO 1: DNI ── */}
        {paso === 'dni' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-white font-semibold text-lg text-center">Ingresa tu documento</h2>
            <p className="text-gray-500 text-sm text-center">DNI (8 dígitos) o carnet de extranjería (9 a 12 dígitos)</p>
            <input value={dni} onChange={e=>setDni(e.target.value.replace(/\D/g,'').slice(0,12))}
              onKeyDown={e=>e.key==='Enter'&&buscarDNI()}
              placeholder="N° de documento" maxLength={12}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-2xl text-white text-center tracking-widest font-mono focus:outline-none focus:border-blue-500"/>
            {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            <BtnInstant onClick={buscarDNI} disabled={loading || dni.length < 8}
              className={`w-full py-3 font-semibold rounded-xl transition-colors text-white ${loading || dni.length < 8 ? 'bg-blue-900/50 opacity-50' : 'bg-blue-600'}`}>
              {loading ? 'Buscando...' : 'Continuar →'}
            </BtnInstant>
          </div>
        )}

        {/* ── PASO 1b: nombre manual (DNI no encontrado en directorio) ── */}
        {paso === 'nombre' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-white font-semibold text-lg text-center">¿Cuál es tu nombre?</h2>
            <p className="text-gray-500 text-sm text-center">Tu DNI no está en el directorio. Escribe tu nombre completo para continuar.</p>
            <input value={nombre} onChange={e => setNombre(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && nombre.trim().length > 2 && setPaso('sede')}
              placeholder="Apellidos y Nombres"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"/>
            <BtnInstant onClick={() => { if (nombre.trim().length > 2) setPaso('sede'); }}
              disabled={nombre.trim().length < 3}
              className={`w-full py-3 font-semibold rounded-xl text-white transition-colors ${nombre.trim().length < 3 ? 'bg-blue-900/50 opacity-50' : 'bg-blue-600'}`}>
              Continuar →
            </BtnInstant>
            <BtnInstant onClick={() => { setPaso('dni'); setError(''); setNombre(''); }}
              className="w-full text-gray-600 text-xs text-center hover:text-gray-400 py-1">
              ← Cambiar DNI
            </BtnInstant>
          </div>
        )}

        {/* ── PASO 1c: sede (manual, obligatoria) ── */}
        {paso === 'sede' && (
          <div className="grid md:grid-cols-2 gap-4 items-start">
            {/* Columna: ingreso de sede */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
              <div className="text-center">
                <p className="text-white font-semibold text-lg">{nombre || `Doc: ${dni}`}</p>
                <p className="text-gray-500 text-sm mt-1">¿En qué sede trabajas?</p>
              </div>
              <input value={sede} onChange={e => setSede(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && continuarTrasSede()}
                placeholder="Selecciónala de la lista →"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"/>
              {error && <p className="text-red-400 text-xs text-center">{error}</p>}
              <BtnInstant onClick={continuarTrasSede} disabled={loading || !sede.trim()}
                className={`w-full py-3 font-semibold rounded-xl text-white transition-colors ${loading || !sede.trim() ? 'bg-blue-900/50 opacity-50' : 'bg-blue-600'}`}>
                {loading ? 'Cargando...' : 'Continuar →'}
              </BtnInstant>
              <BtnInstant onClick={() => { setPaso('dni'); setError(''); setSede(''); setExamenFijo(null); }}
                className="w-full text-gray-600 text-xs text-center hover:text-gray-400 py-1">
                ← Cambiar documento
              </BtnInstant>
            </div>
            {/* Columna: listado de sedes (clic para autocompletar exacto) */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <p className="text-gray-400 text-xs font-medium mb-1 px-1">Toca tu sede en la lista</p>
              <p className="text-gray-600 text-[11px] mb-3 px-1">Elígela aquí para que quede escrita exactamente igual.</p>
              {sedesPortal.length === 0
                ? <p className="text-gray-600 text-xs px-1 py-3">No hay sedes registradas. Escríbela en el campo de la izquierda.</p>
                : <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {sedesPortal.map(s => {
                      const on = sede.trim().toLowerCase() === s.toLowerCase();
                      return (
                        <BtnInstant key={s} onClick={() => { setSede(s); setError(''); }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${on ? 'bg-blue-900/40 border-blue-600 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-blue-700'}`}>
                          {on ? '✓ ' : ''}{s}
                        </BtnInstant>
                      );
                    })}
                  </div>}
            </div>
          </div>
        )}

        {/* ── PASO 2: elegir examen ── */}
        {paso === 'examen' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <div className="text-center">
              <p className="text-white font-semibold text-lg">{nombre || `DNI: ${dni}`}</p>
              <p className="text-gray-500 text-sm mt-1">Selecciona el examen a rendir</p>
            </div>
            {error && <p className="text-red-400 text-xs text-center bg-red-900/20 border border-red-900/40 rounded-lg p-2">{error}</p>}
            <div className="space-y-2">
              {examenes.map(ex=>(
                <BtnInstant key={ex.id} onClick={()=>elegirExamen(ex)} disabled={loading}
                  className="w-full text-left p-4 bg-gray-800 border border-gray-700 hover:border-blue-600 rounded-xl">
                  <p className="text-white font-medium">{ex.nombre}</p>
                  {ex.descripcion && <p className="text-gray-500 text-xs mt-1">{ex.descripcion}</p>}
                  <p className="text-blue-400 text-xs mt-2">10 preguntas · Mínimo 7 correctas →</p>
                </BtnInstant>
              ))}
            </div>
            <BtnInstant onClick={()=>{ setPaso('dni'); setError(''); }}
              className="w-full text-gray-600 text-xs text-center hover:text-gray-400 py-1">
              ← Cambiar DNI
            </BtnInstant>
          </div>
        )}

        {/* ── PASO 2b: video de capacitación (YouTube) ── */}
        {paso === 'video' && examenSel && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-white font-semibold text-lg">{examenSel.nombre}</h2>
              <p className="text-gray-500 text-sm mt-1">Revisa el material de capacitación antes de rendir el examen.</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              {videoEmbed(examenSel.video_url)
                ? <div className="relative w-full" style={{ paddingBottom: '70%' }}>
                    <iframe className="absolute inset-0 w-full h-full" src={videoEmbed(examenSel.video_url)} title="Material de capacitación" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                  </div>
                : <a href={examenSel.video_url} target="_blank" rel="noopener noreferrer" className="block p-6 text-center text-blue-400 underline">Abrir material de capacitación</a>}
            </div>
            <button onClick={() => setPaso('preguntas')} className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-base shadow-lg transition-colors">
              Ya revisé el material — Comenzar examen →
            </button>
          </div>
        )}

        {/* ── PASO 3: preguntas ── */}
        {paso === 'preguntas' && (
          <div className="space-y-4">
            {/* Progreso */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white font-medium text-sm">{examenSel?.nombre}</p>
                <span className="text-blue-400 text-xs font-mono">
                  {Object.keys(respuestas).length}/{preguntas.length}
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-blue-500 transition-all" style={{width:`${progressPct}%`}}/>
              </div>
            </div>

            {/* Preguntas */}
            {preguntas.map((p,i)=>(
              <div key={p.id}
                className={`bg-gray-900 border rounded-2xl p-4 transition-colors ${respuestas[p.id]?'border-blue-900/60':'border-gray-800'}`}>
                <p className="text-xs text-gray-500 mb-2 font-medium">Pregunta {i+1} de {preguntas.length}</p>
                <p className="text-white text-sm font-medium mb-3 leading-snug">{p.pregunta}</p>
                <div className="space-y-2">
                  {LETRAS.map(l=>{
                    const texto = p[`opcion_${l}`];
                    if (!texto || texto === '—') return null;
                    const sel = respuestas[p.id] === l;
                    return (
                      <BtnInstant key={l} onClick={()=>setRespuestas(r=>({...r,[p.id]:l}))}
                        className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all ${sel?'bg-blue-900/40 border-blue-600 text-white':'bg-gray-800 border-gray-700 text-gray-300'}`}>
                        <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border ${sel?'bg-blue-600 border-blue-500 text-white':'border-gray-600 text-gray-500'}`}>
                          {LETRA_LABEL[l]}
                        </span>
                        <span className="text-sm leading-snug">{texto}</span>
                      </BtnInstant>
                    );
                  })}
                </div>
              </div>
            ))}

            {error && <p className="text-red-400 text-xs text-center bg-red-900/20 border border-red-900/40 rounded-lg p-2">{error}</p>}

            <BtnInstant onClick={enviarRespuestas}
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl text-lg select-none">
              ✓ Enviar respuestas
            </BtnInstant>
          </div>
        )}

        {/* ── PASO 4: resultado ── */}
        {paso === 'resultado' && resultado && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center space-y-4">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${resultado.aprobado?'bg-emerald-900/40 border-4 border-emerald-500':'bg-red-900/40 border-4 border-red-500'}`}>
              {resultado.aprobado
                ? <Award size={40} className="text-emerald-400"/>
                : <XCircle size={40} className="text-red-400"/>}
            </div>
            <div>
              <p className={`text-4xl font-bold ${resultado.aprobado?'text-emerald-400':'text-red-400'}`}>
                {resultado.puntaje}/{resultado.total}
              </p>
              <p className="text-gray-500 text-sm mt-1">respuestas correctas</p>
            </div>
            <div className={`px-6 py-3 rounded-xl ${resultado.aprobado?'bg-emerald-900/30 border border-emerald-700':'bg-red-900/20 border border-red-800'}`}>
              <p className={`text-xl font-bold ${resultado.aprobado?'text-emerald-300':'text-red-400'}`}>
                {resultado.aprobado ? '🎉 ¡APROBADO!' : '✗ DESAPROBADO'}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                {resultado.aprobado
                  ? 'Felicitaciones, superaste el 70% de respuestas correctas.'
                  : 'No alcanzaste el puntaje mínimo de 7/10. Consulta con tu supervisor.'}
              </p>
            </div>

            {/* Resumen */}
            <div className="text-left space-y-2 mt-2">
              {preguntas.map((p,i)=>{
                const resp = respuestas[p.id];
                const corr = resultado.mapCorrectas[p.id];
                const ok = resp === corr;
                return (
                  <div key={p.id} className={`flex items-start gap-2 p-2.5 rounded-lg ${ok?'bg-emerald-900/15':'bg-red-900/15'}`}>
                    {ok ? <CheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5"/>
                        : <XCircle size={14} className="text-red-400 shrink-0 mt-0.5"/>}
                    <div className="min-w-0">
                      <p className="text-gray-300 text-xs leading-snug">{p.pregunta}</p>
                      {!ok && <p className="text-emerald-400 text-[11px] mt-0.5">
                        Correcta: {LETRA_LABEL[corr]}) {p[`opcion_${corr}`]}
                      </p>}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-gray-600 text-[11px] mb-1">Tus respuestas han sido registradas.</p>
            <div className="flex flex-col gap-2">
              <BtnInstant
                onClick={() => { setExamenSel(null); setRespuestas({}); setCorrectasMap({}); setResultado(null); setError(''); setPaso('examen'); }}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl select-none">
                📋 Rendir otro examen
              </BtnInstant>
              <BtnInstant
                onClick={() => { setDni(''); setNombre(''); setExamenes([]); setExamenSel(null); setRespuestas({}); setCorrectasMap({}); setResultado(null); setError(''); setPaso('dni'); }}
                className="w-full py-2.5 bg-gray-800 text-gray-400 text-sm rounded-xl border border-gray-700 select-none">
                🏠 Volver al inicio
              </BtnInstant>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
