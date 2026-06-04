// ════════════════════════════════════════════════════════════════════
//  PublicExamenForm — Form público de exámenes (sin login)
//  URL: ?examen=empresaId
//  Flujo: DNI → elige examen → 10 preguntas → resultado
// ════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase.js';
import { CheckCircle, XCircle, ClipboardList, Award, AlertTriangle } from 'lucide-react';

const LETRAS = ['a','b','c','d'];
const LETRA_LABEL = { a:'A', b:'B', c:'C', d:'D' };

export default function PublicExamenForm({ empresaId }) {
  const [paso, setPaso] = useState('dni');        // dni | examen | preguntas | resultado
  const [dni, setDni] = useState('');
  const [nombre, setNombre] = useState('');
  const [examenes, setExamenes] = useState([]);
  const [examenSel, setExamenSel] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  const [respuestas, setRespuestas] = useState({});   // { pregunta_id: 'a'|'b'|'c'|'d' }
  const [correctasMap, setCorrectasMap] = useState({}); // cargado al iniciar, no visible en UI
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const lastTouchTs = useRef(0); // persiste entre renders sin causar re-render
  const [error, setError] = useState('');

  // ── Paso 1: buscar trabajador por DNI ──
  const buscarDNI = async () => {
    if (!/^\d{8}$/.test(dni)) { setError('El DNI debe tener 8 dígitos numéricos'); return; }
    setLoading(true); setError('');
    const { data } = await supabase.from('trabajadores').select('nombre,estado')
      .eq('dni', dni).eq('empresa_id', empresaId).single();
    if (data) setNombre(data.nombre || '');
    // Cargar exámenes activos
    const { data: exs } = await supabase.from('examenes').select('id,nombre,descripcion')
      .eq('empresa_id', empresaId).eq('activo', true).order('created_at', { ascending: false });
    setExamenes(exs || []);
    setLoading(false);
    if (!exs?.length) { setError('No hay exámenes disponibles en este momento.'); return; }
    setPaso('examen');
  };

  // ── Paso 2: seleccionar examen ──
  const elegirExamen = async (ex) => {
    setLoading(true); setError('');
    // Verificar si ya lo rindió
    const { data: ya } = await supabase.from('examen_resultados').select('id,desbloqueado')
      .eq('examen_id', ex.id).eq('dni', dni).single();
    if (ya && !ya.desbloqueado) {
      setLoading(false);
      setError(`Ya rendiste el examen "${ex.nombre}". Cada examen se puede rendir solo una vez.`);
      return;
    }
    // Cargar preguntas CON correcta (se usa solo al calcular, no se muestra en UI)
    const { data: ps } = await supabase.from('examen_preguntas')
      .select('id,orden,pregunta,opcion_a,opcion_b,opcion_c,opcion_d,correcta')
      .eq('examen_id', ex.id).order('orden');
    setExamenSel(ex);
    setPreguntas(ps || []);
    // Guardar mapa de correctas en estado (oculto, no renderizado)
    setCorrectasMap(Object.fromEntries((ps||[]).map(p => [p.id, p.correcta])));
    setRespuestas({});
    setLoading(false);
    setPaso('preguntas');
  };

  // ── Paso 3: enviar respuestas ──
  const enviarRespuestas = (e) => {
    if (e?.type === 'touchend') {
      lastTouchTs.current = Date.now();
      e.preventDefault();
    } else if (e?.type === 'click' && Date.now() - lastTouchTs.current < 600) {
      return; // ignorar ghost click post-touch
    }
    const sin = preguntas.filter(p => !respuestas[p.id]);
    if (sin.length) { setError(`Faltan ${sin.length} pregunta(s) por responder`); return; }
    setError('');
    // Calcular resultado LOCALMENTE — sin esperar a la BD
    let puntaje = 0;
    preguntas.forEach(p => { if (respuestas[p.id] === correctasMap[p.id]) puntaje++; });
    const aprobado = puntaje >= 7;

    // Mostrar resultado INMEDIATAMENTE (UI optimista)
    setResultado({ puntaje, total: preguntas.length, aprobado, mapCorrectas: correctasMap });
    setPaso('resultado');

    // Guardar en BD en segundo plano (no bloquea la UI)
    supabase.from('examen_resultados').upsert({
      empresa_id: empresaId, examen_id: examenSel.id,
      dni, nombre: nombre || null, puntaje, total_preguntas: preguntas.length,
      aprobado, respuestas, fecha: new Date().toISOString(),
    }, { onConflict: 'examen_id,dni' }).then(({ error: err }) => {
      if (err) console.error('Error guardando resultado:', err.message);
    });
  };

  // ── UI ──
  const progressPct = preguntas.length ? Math.round(Object.keys(respuestas).length / preguntas.length * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold mb-3">
            <ClipboardList size={16}/> Examen de Capacitación
          </div>
          <p className="text-gray-500 text-xs">Comindustria — Sistema de Evaluación SST</p>
        </div>

        {/* ── PASO 1: DNI ── */}
        {paso === 'dni' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-white font-semibold text-lg text-center">Ingresa tu DNI</h2>
            <p className="text-gray-500 text-sm text-center">Para comenzar, escribe tu número de documento de identidad (8 dígitos)</p>
            <input value={dni} onChange={e=>setDni(e.target.value.replace(/\D/g,'').slice(0,8))}
              onKeyDown={e=>e.key==='Enter'&&buscarDNI()}
              placeholder="12345678" maxLength={8}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-2xl text-white text-center tracking-widest font-mono focus:outline-none focus:border-blue-500"/>
            {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            <button onClick={buscarDNI} onTouchEnd={e=>{e.preventDefault();buscarDNI();}}
              disabled={loading || dni.length !== 8}
              style={{ touchAction: 'manipulation' }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors select-none">
              {loading ? 'Buscando...' : 'Continuar →'}
            </button>
          </div>
        )}

        {/* ── PASO 2: elegir examen ── */}
        {paso === 'examen' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <div className="text-center">
              <p className="text-white font-semibold text-lg">{nombre || `DNI: ${dni}`}</p>
              <p className="text-gray-500 text-sm mt-1">Selecciona el examen que vas a rendir</p>
            </div>
            {error && <p className="text-red-400 text-xs text-center bg-red-900/20 border border-red-900/40 rounded-lg p-2">{error}</p>}
            <div className="space-y-2">
              {examenes.map(ex=>(
                <button key={ex.id} onClick={()=>elegirExamen(ex)}
                  onTouchEnd={e=>{e.preventDefault();elegirExamen(ex);}}
                  disabled={loading} style={{ touchAction: 'manipulation' }}
                  className="w-full text-left p-4 bg-gray-800 border border-gray-700 hover:border-blue-600 rounded-xl transition-all select-none">
                  <p className="text-white font-medium">{ex.nombre}</p>
                  {ex.descripcion && <p className="text-gray-500 text-xs mt-1">{ex.descripcion}</p>}
                  <p className="text-blue-400 text-xs mt-2">10 preguntas · Mínimo 7 correctas para aprobar →</p>
                </button>
              ))}
            </div>
            <button onClick={()=>{ setPaso('dni'); setError(''); }} className="w-full text-gray-600 text-xs text-center hover:text-gray-400 py-1">← Cambiar DNI</button>
          </div>
        )}

        {/* ── PASO 3: preguntas ── */}
        {paso === 'preguntas' && (
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white font-medium text-sm">{examenSel?.nombre}</p>
                <span className="text-blue-400 text-xs font-mono">{Object.keys(respuestas).length}/{preguntas.length}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-blue-500 transition-all" style={{width:`${progressPct}%`}}/>
              </div>
            </div>

            {preguntas.map((p,i)=>(
              <div key={p.id} className={`bg-gray-900 border rounded-2xl p-4 transition-colors ${respuestas[p.id]?'border-blue-900/60':'border-gray-800'}`}>
                <p className="text-xs text-gray-500 mb-2 font-medium">Pregunta {i+1} de {preguntas.length}</p>
                <p className="text-white text-sm font-medium mb-3 leading-snug">{p.pregunta}</p>
                <div className="space-y-2">
                  {LETRAS.map(l=>{
                    const texto = p[`opcion_${l}`];
                    if (!texto || texto === '—') return null;
                    const sel = respuestas[p.id] === l;
                    const seleccionar = (e) => {
                      if (e?.type === 'touchend') e.preventDefault();
                      setRespuestas(r=>({...r,[p.id]:l}));
                    };
                    return (
                      <button key={l}
                        onClick={seleccionar}
                        onTouchEnd={seleccionar}
                        style={{ touchAction: 'manipulation' }}
                        className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all ${sel?'bg-blue-900/40 border-blue-600 text-white':'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'}`}>
                        <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border ${sel?'bg-blue-600 border-blue-500 text-white':'border-gray-600 text-gray-500'}`}>{LETRA_LABEL[l]}</span>
                        <span className="text-sm leading-snug">{texto}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {error && <p className="text-red-400 text-xs text-center bg-red-900/20 border border-red-900/40 rounded-lg p-2">{error}</p>}
            <button
              onClick={enviarRespuestas}
              onTouchEnd={enviarRespuestas}
              style={{ touchAction: 'manipulation' }}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-2xl text-lg transition-colors select-none">
              ✓ Enviar respuestas
            </button>
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
            {/* Resumen de respuestas */}
            <div className="text-left space-y-2 mt-2">
              {preguntas.map((p,i)=>{
                const resp = respuestas[p.id];
                const corr = resultado.mapCorrectas[p.id];
                const ok = resp === corr;
                return (
                  <div key={p.id} className={`flex items-start gap-2 p-2.5 rounded-lg ${ok?'bg-emerald-900/15':'bg-red-900/15'}`}>
                    {ok ? <CheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5"/> : <XCircle size={14} className="text-red-400 shrink-0 mt-0.5"/>}
                    <div className="min-w-0">
                      <p className="text-gray-300 text-xs leading-snug">{p.pregunta}</p>
                      {!ok && <p className="text-emerald-400 text-[11px] mt-0.5">Correcta: {LETRA_LABEL[corr]}) {p[`opcion_${corr}`]}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-gray-600 text-[11px] mb-3">Tus respuestas han sido registradas.</p>
            {/* Botones de navegación */}
            <div className="flex flex-col gap-2" style={{ touchAction: 'manipulation' }}>
              <button
                onClick={(e) => { if (Date.now() - lastTouchTs.current < 600) return; setExamenSel(null); setRespuestas({}); setCorrectasMap({}); setResultado(null); setError(''); setPaso('examen'); }}
                style={{ touchAction: 'manipulation' }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors select-none">
                📋 Rendir otro examen
              </button>
              <button
                onClick={(e) => { if (Date.now() - lastTouchTs.current < 600) return; setDni(''); setNombre(''); setExamenes([]); setExamenSel(null); setRespuestas({}); setCorrectasMap({}); setResultado(null); setError(''); setPaso('dni'); }}
                style={{ touchAction: 'manipulation' }}
                className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm rounded-xl transition-colors border border-gray-700 select-none">
                🏠 Volver al inicio
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
