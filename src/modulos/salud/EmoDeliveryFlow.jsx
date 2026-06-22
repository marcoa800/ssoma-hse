import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase.js';
import {
  ShieldCheck, FileText, Headphones, PenLine, CheckCircle,
  Download, AlertTriangle, Lock, RotateCcw,
} from 'lucide-react';

// Flujo público de Entrega y Firma de EMO — acceso por token: /?entrega=<token>
export default function EmoDeliveryFlow({ token }) {
  // estados de pantalla: cargando | inexistente | dni | audio | firma | exito | error
  const [screen, setScreen] = useState('cargando');
  const [nombre, setNombre] = useState('');
  const [estadoReg, setEstadoReg] = useState('pendiente');
  const [dni, setDni] = useState('');
  const [err, setErr] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [pdfPath, setPdfPath] = useState('');
  const [audioEnded, setAudioEnded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pdfSignedUrl, setPdfSignedUrl] = useState('');
  const [validating, setValidating] = useState(false);

  // ── Carga inicial: metadatos por token ──
  useEffect(() => {
    if (!token) { setScreen('inexistente'); return; }
    (async () => {
      const { data, error } = await supabase.rpc('emo_get', { p_token: token });
      if (error || !data || data.length === 0) { setScreen('inexistente'); return; }
      setNombre(data[0].trabajador_nombre || '');
      setEstadoReg(data[0].estado || 'pendiente');
      setScreen('dni');
    })();
  }, [token]);

  // ── Etapa 1: validar DNI ──
  const validarDni = async () => {
    if (dni.trim().length < 7) { setErr('Ingresa un DNI válido.'); return; }
    setValidating(true); setErr('');
    const { data, error } = await supabase.rpc('emo_validar', { p_token: token, p_dni: dni.trim() });
    setValidating(false);
    if (error || !data || data.length === 0) { setErr('El DNI no coincide con este informe. Verifícalo.'); return; }
    const row = data[0];
    // generar Signed URL del audio
    if (row.audio_url) {
      const { data: sa } = await supabase.storage.from('emo-audios').createSignedUrl(row.audio_url, 1800);
      setAudioUrl(sa?.signedUrl || '');
    }
    if (row.estado === 'completado') {
      // ya firmado → ir directo a descarga
      setPdfPath(row.pdf_url || '');
      await generarPdfUrl(row.pdf_url);
      setScreen('exito');
    } else {
      setScreen('audio');
    }
  };

  const generarPdfUrl = async (path) => {
    if (!path) return;
    const { data } = await supabase.storage.from('emo-pdfs').createSignedUrl(path, 300);
    if (data?.signedUrl) setPdfSignedUrl(data.signedUrl);
  };

  // ── Canvas de firma ──
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasSig, setHasSig] = useState(false);

  useEffect(() => {
    if (screen !== 'firma') return;
    const c = canvasRef.current;
    if (!c) return;
    // resolución interna fija para nitidez
    c.width = c.offsetWidth;
    c.height = 180;
    const ctx = c.getContext('2d');
    ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0f172a';
  }, [screen]);

  const ptr = (e) => {
    const c = canvasRef.current; const r = c.getBoundingClientRect();
    const t = e.touches?.[0];
    return { x: (t ? t.clientX : e.clientX) - r.left, y: (t ? t.clientY : e.clientY) - r.top };
  };
  const startDraw = (e) => { e.preventDefault(); drawing.current = true; const ctx = canvasRef.current.getContext('2d'); const { x, y } = ptr(e); ctx.beginPath(); ctx.moveTo(x, y); };
  const moveDraw = (e) => { if (!drawing.current) return; e.preventDefault(); const ctx = canvasRef.current.getContext('2d'); const { x, y } = ptr(e); ctx.lineTo(x, y); ctx.stroke(); if (!hasSig) setHasSig(true); };
  const endDraw = () => { drawing.current = false; };
  const limpiarFirma = () => { const c = canvasRef.current; c.getContext('2d').clearRect(0, 0, c.width, c.height); setHasSig(false); };

  // ── Etapa 3 → 4: confirmar y firmar ──
  const confirmarFirma = async () => {
    if (!hasSig) { setErr('Por favor dibuja tu firma para continuar.'); return; }
    setSubmitting(true); setErr('');
    const firma = canvasRef.current.toDataURL('image/png');
    const { data, error } = await supabase.rpc('emo_firmar', { p_token: token, p_dni: dni.trim(), p_firma: firma });
    if (error || !data || !data[0]?.ok) {
      setSubmitting(false);
      setErr('No se pudo registrar la firma. Intenta nuevamente.');
      return;
    }
    await generarPdfUrl(data[0].pdf_url);
    setSubmitting(false);
    setScreen('exito');
  };

  // ── Shell ──
  const Shell = ({ children }) => (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div className="w-full max-w-md">{children}</div>
      <p className="text-center text-[11px] text-slate-400 mt-5">Medicloud Safety · Entrega Segura de EMO</p>
    </div>
  );
  const Header = ({ icon: Icon, title, sub }) => (
    <div className="text-center mb-5">
      <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/25"><Icon size={26} /></div>
      <h1 className="text-lg font-bold text-slate-800">{title}</h1>
      {sub && <p className="text-sm text-slate-500 mt-1">{sub}</p>}
    </div>
  );

  if (screen === 'cargando') return <Shell><div className="bg-white rounded-2xl shadow-xl p-8 text-center text-slate-400 text-sm">Cargando informe…</div></Shell>;

  if (screen === 'inexistente') return (
    <Shell>
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-3"><AlertTriangle size={26} /></div>
        <h1 className="text-lg font-bold text-slate-800 mb-1">Enlace no válido</h1>
        <p className="text-sm text-slate-500">Este enlace de entrega no existe o ha expirado. Solicita uno nuevo al área de Salud Ocupacional.</p>
      </div>
    </Shell>
  );

  return (
    <Shell>
      {/* Indicador de pasos */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {['dni', 'audio', 'firma', 'exito'].map((s, i) => {
          const order = ['dni', 'audio', 'firma', 'exito'];
          const cur = order.indexOf(screen);
          const done = i < cur, active = i === cur;
          return <div key={s} className={`h-1.5 rounded-full transition-all ${active ? 'w-8 bg-blue-600' : done ? 'w-5 bg-blue-400' : 'w-5 bg-slate-300'}`} />;
        })}
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6">
        {/* ── ETAPA 1: DNI ── */}
        {screen === 'dni' && (
          <>
            <Header icon={ShieldCheck} title="Validación de identidad" sub={nombre ? `Hola, ${nombre}` : 'Accede a tu informe médico'} />
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Ingresa tu número de DNI</label>
            <input type="tel" inputMode="numeric" value={dni}
              onChange={e => setDni(e.target.value.replace(/\D/g, '').slice(0, 12))}
              onKeyDown={e => e.key === 'Enter' && validarDni()}
              placeholder="Número de DNI" autoFocus
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" style={{ fontSize: 16 }} />
            {err && <p className="text-red-500 text-sm mt-2">{err}</p>}
            <button onClick={validarDni} disabled={validating}
              className="w-full mt-4 py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg disabled:opacity-50 active:opacity-80 touch-manipulation">
              {validating ? 'Validando…' : 'Acceder a mi informe'}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 mt-4"><Lock size={11} /> Acceso seguro y confidencial</p>
          </>
        )}

        {/* ── ETAPA 2: AUDIO OBLIGATORIO ── */}
        {screen === 'audio' && (
          <>
            <Header icon={Headphones} title="Lectura de tu EMO" sub="Escucha el audio completo con las recomendaciones médicas." />
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              {audioUrl
                ? <audio src={audioUrl} controls controlsList="nodownload noplaybackrate" onEnded={() => setAudioEnded(true)} className="w-full" />
                : <p className="text-sm text-slate-500 text-center py-3">No se pudo cargar el audio.</p>}
            </div>
            <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 mb-4 ${audioEnded ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
              {audioEnded ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
              {audioEnded ? 'Audio escuchado completamente.' : 'Debes escuchar el audio hasta el final para continuar.'}
            </div>
            <button onClick={() => { setErr(''); setScreen('firma'); }} disabled={!audioEnded}
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg disabled:opacity-40 disabled:cursor-not-allowed active:opacity-80 touch-manipulation">
              Continuar a la firma
            </button>
          </>
        )}

        {/* ── ETAPA 3: FIRMA ── */}
        {screen === 'firma' && (
          <>
            <Header icon={PenLine} title="Firma de conformidad" />
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 leading-relaxed mb-4">
              Declaro haber <strong>recibido y escuchado la lectura</strong> de mi Examen Médico Ocupacional (EMO) con las recomendaciones médicas correspondientes.
            </div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dibuja tu firma</label>
              <button onClick={limpiarFirma} className="flex items-center gap-1 text-xs text-blue-600 active:opacity-70"><RotateCcw size={12} /> Limpiar</button>
            </div>
            <canvas ref={canvasRef}
              onMouseDown={startDraw} onMouseMove={moveDraw} onMouseUp={endDraw} onMouseLeave={endDraw}
              onTouchStart={startDraw} onTouchMove={moveDraw} onTouchEnd={endDraw}
              className="w-full h-[180px] bg-white border-2 border-dashed border-slate-300 rounded-xl touch-none cursor-crosshair" />
            {err && <p className="text-red-500 text-sm mt-2">{err}</p>}
            <button onClick={confirmarFirma} disabled={submitting}
              className="w-full mt-4 py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg disabled:opacity-50 active:opacity-80 touch-manipulation">
              {submitting ? 'Registrando firma…' : 'Confirmar y enviar'}
            </button>
            <button onClick={() => setScreen('audio')} className="w-full mt-2 py-2 text-slate-500 text-sm">Atrás</button>
          </>
        )}

        {/* ── ETAPA 4: ÉXITO + DESCARGA ── */}
        {screen === 'exito' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4"><CheckCircle size={34} className="text-emerald-500" /></div>
            <h1 className="text-xl font-bold text-slate-800 mb-1">Trámite completado</h1>
            <p className="text-sm text-slate-500 mb-5">Tu firma fue registrada correctamente. Ya puedes descargar tu informe.</p>
            {pdfSignedUrl
              ? <a href={pdfSignedUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg active:opacity-80 touch-manipulation">
                  <Download size={18} /> Descargar mi EMO (PDF)
                </a>
              : <div className="flex items-center justify-center gap-2 w-full py-3.5 bg-slate-200 text-slate-500 rounded-xl font-medium text-sm"><FileText size={16} /> Preparando descarga…</div>}
            <p className="text-[11px] text-slate-400 mt-3">El enlace de descarga es temporal por seguridad. Si expira, vuelve a abrir esta página con tu DNI.</p>
          </div>
        )}
      </div>
    </Shell>
  );
}
