// ════════════════════════════════════════════════════════════════════
//  ExamenModulo — Sistema de Exámenes de Capacitación (Comindustria)
//  Admin: crear exámenes + preguntas, ver resultados, desbloquear.
//  Público: DNI → elegir examen → 10 preguntas → resultado.
// ════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase, puedeEliminar } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { fmtFecha, brandingEmpresa } from '../../lib/helpers.js';
import { Badge } from '../../components/ui/Badge.jsx';
import { KpiCard } from '../../components/ui/KpiCard.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Btn } from '../../components/ui/Btn.jsx';
import {
  Plus, Pencil, Trash2, Eye, ClipboardList, CheckCircle,
  XCircle, Users, Award, QrCode, Copy, Lock, Unlock, ArrowLeft, FileDown
} from 'lucide-react';

const LETRAS = ['a','b','c','d'];
const LETRA_LABEL = { a:'A', b:'B', c:'C', d:'D' };

// ── Carga logo desde /public como dataURL ──
function cargarLogo(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      try { resolve({ data: c.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight }); }
      catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export default function ExamenModulo({ empresaId, role, empresaNombre = '' }) {
  const isSuperAdmin = role === 'SUPERADMIN';
  const brand = brandingEmpresa(empresaNombre);
  const [vista, setVista] = useState('dashboard'); // dashboard | examen | resultados | editor
  const [examenes, setExamenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [filtroSede, setFiltroSede] = useState('');
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('examenes').select('*')
      .eq('empresa_id', empresaId).order('created_at', { ascending: false });
    setExamenes(data || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const loadResultados = async (examenId) => {
    const { data } = await supabase.from('examen_resultados').select('*')
      .eq('examen_id', examenId).order('fecha', { ascending: false });
    setResultados(data || []);
  };

  const toggleActivo = async (ex) => {
    await supabase.from('examenes').update({ activo: !ex.activo }).eq('id', ex.id);
    load();
  };

  const eliminarExamen = async (id) => {
    if (!confirm('¿Eliminar este examen y todas sus respuestas?')) return;
    await supabase.from('examenes').delete().eq('id', id);
    showToast('Eliminado', 'info'); load();
  };

  // ── Generar PDF de resultados por examen (opcionalmente filtrado por sede) ──
  const generarPDF = async (examen, lista, sedeSel = '') => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const M = 14;
    const hoy = new Date().toISOString().split('T')[0];

    // Logo dinámico por empresa (Gelarti / Comindustria)
    const logo = brand.logo ? await cargarLogo(brand.logo) : null;
    let y = M;
    if (logo) {
      const maxH = 16, maxW = 50;
      const ratio = Math.min(maxW / logo.w, maxH / logo.h);
      const lw = logo.w * ratio, lh = logo.h * ratio;
      doc.addImage(logo.data, 'PNG', M, y, lw, lh);
      y += lh + 4;
    } else {
      doc.setFontSize(11).setFont(undefined, 'bold').text(brand.marca.toUpperCase(), M, y + 8);
      y += 14;
    }

    // Título
    doc.setFontSize(14).setFont(undefined, 'bold').setTextColor(30, 64, 175);
    doc.text('Resultados de Examen', M, y);
    doc.setFontSize(11).setFont(undefined, 'normal').setTextColor(0);
    doc.text(examen.nombre, M, y + 7);
    doc.setFontSize(8).setTextColor(120);
    doc.text(`Generado: ${hoy}  ·  Mínimo aprobatorio: ${examen.puntaje_minimo || 7}/10${sedeSel ? `  ·  Sede: ${sedeSel}` : ''}`, M, y + 13);
    doc.setTextColor(0);
    y += 20;

    // KPIs
    const aprobados = lista.filter(r => r.aprobado).length;
    const reprobados = lista.length - aprobados;
    const prom = lista.length ? (lista.reduce((s, r) => s + r.puntaje, 0) / lista.length).toFixed(1) : '—';
    const kpis = [
      ['Total participantes', lista.length],
      ['Aprobados', `${aprobados} (${lista.length ? Math.round(aprobados / lista.length * 100) : 0}%)`],
      ['Desaprobados', reprobados],
      ['Promedio', `${prom}/10`],
    ];
    kpis.forEach((k, i) => {
      const x = M + i * ((W - 2 * M) / 4);
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(x, y, (W - 2 * M) / 4 - 3, 14, 2, 2, 'F');
      doc.setFontSize(7).setTextColor(100).text(String(k[0]), x + 3, y + 5);
      doc.setFontSize(10).setFont(undefined, 'bold').setTextColor(30, 64, 175).text(String(k[1]), x + 3, y + 11);
      doc.setFont(undefined, 'normal').setTextColor(0);
    });
    y += 20;

    // Tabla de resultados
    autoTable(doc, {
      startY: y,
      head: [['N°', 'DNI', 'Apellidos y Nombres', 'Sede', 'Puntaje', 'Resultado', 'Fecha']],
      body: lista.map((r, i) => [
        i + 1, r.dni, r.nombre || '—', r.sede || '—',
        `${r.puntaje}/${r.total_preguntas}`,
        r.aprobado ? 'APROBADO' : 'DESAPROBADO',
        fmtFecha(r.fecha?.split('T')[0]),
      ]),
      styles: { fontSize: 8, cellPadding: 1.8, lineWidth: 0.1, lineColor: [200, 200, 200] },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 24 },
        4: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
        5: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
        6: { cellWidth: 20, halign: 'center' },
      },
      didParseCell: (d) => {
        if (d.section === 'body' && d.column.index === 5) {
          if (d.cell.raw === 'APROBADO') { d.cell.styles.textColor = [22, 101, 52]; d.cell.styles.fillColor = [220, 252, 231]; }
          else { d.cell.styles.textColor = [185, 28, 28]; d.cell.styles.fillColor = [254, 226, 226]; }
        }
      },
      margin: { left: M, right: M },
    });

    // Pie de página
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(7).setTextColor(160);
    doc.text(`${brand.footer}  ·  ${hoy}`, W / 2, pageH - 8, { align: 'center' });

    const sufijoSede = sedeSel ? `_${sedeSel.replace(/\s+/g, '_')}` : '';
    doc.save(`resultados_${examen.nombre.replace(/\s+/g,'_')}${sufijoSede}_${hoy}.pdf`);
  };

  const desbloquearDNI = async (resultadoId) => {
    if (!isSuperAdmin) { showToast('Solo SUPERADMIN puede desbloquear', 'error'); return; }
    if (!confirm('¿Permitir que este trabajador vuelva a rendir el examen?')) return;
    await supabase.from('examen_resultados').delete().eq('id', resultadoId);
    showToast('Desbloqueado — puede rendir nuevamente', 'success');
    loadResultados(selected.id);
  };

  const publicUrl = `${window.location.origin}${window.location.pathname}?examen=${empresaId}`;
  const publicUrlExamen = (exId) => `${window.location.origin}${window.location.pathname}?examen=${empresaId}&id=${exId}`;
  const copiarLink = () => {
    navigator.clipboard?.writeText(publicUrl).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(publicUrl)}&size=220x220&margin=8`;

  // ── Vista: resultados de un examen ──
  if (vista === 'resultados' && selected) {
    const sedesResultados = [...new Set(resultados.map(r => r.sede).filter(Boolean))].sort();
    const lista = filtroSede ? resultados.filter(r => (r.sede || '') === filtroSede) : resultados;
    const aprobados = lista.filter(r => r.aprobado).length;
    const prom = lista.length ? (lista.reduce((s,r)=>s+r.puntaje,0)/lista.length).toFixed(1) : '—';
    return (
      <div>
        <button onClick={() => { setVista('dashboard'); setSelected(null); setFiltroSede(''); }}
          className="mb-4 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
          <ArrowLeft size={13}/> Volver
        </button>
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-white font-semibold text-sm mb-1">{selected.nombre}</h3>
            <p className="text-gray-500 text-xs">Resultados de los trabajadores</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={filtroSede} onChange={e => setFiltroSede(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
              <option value="">Todas las sedes</option>
              {sedesResultados.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <Btn size="sm" variant="primary" onClick={() => generarPDF(selected, lista, filtroSede)}>
              <FileDown size={13}/> Descargar PDF{filtroSede ? ` · ${filtroSede}` : ''}
            </Btn>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <KpiCard label="Rindieron" value={lista.length} sub={filtroSede ? `sede ${filtroSede}` : 'trabajadores'} accentColor="blue"/>
          <KpiCard label="Aprobados" value={aprobados} sub={`${lista.length ? Math.round(aprobados/lista.length*100) : 0}% tasa`} accentColor="emerald"/>
          <KpiCard label="Promedio" value={prom} sub="de 10 preguntas" accentColor="amber"/>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800">
              {["DNI","Nombre","Sede","Puntaje","Resultado","Fecha",""].map(h=>(
                <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {lista.map(r=>(
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.dni}</td>
                  <td className="px-4 py-3 text-xs text-gray-300 font-medium">{r.nombre || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{r.sede || '—'}</td>
                  <td className="px-4 py-3 text-center font-bold text-lg">
                    <span className={r.aprobado ? 'text-emerald-400':'text-red-400'}>{r.puntaje}/{r.total_preguntas}</span>
                  </td>
                  <td className="px-4 py-3">
                    {r.aprobado
                      ? <Badge color="green"><CheckCircle size={10} className="inline mr-1"/>Aprobado</Badge>
                      : <Badge color="red"><XCircle size={10} className="inline mr-1"/>Desaprobado</Badge>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{fmtFecha(r.fecha?.split('T')[0])}</td>
                  <td className="px-4 py-3">
                    {isSuperAdmin && (
                      <button onClick={() => desbloquearDNI(r.id)} title="Desbloquear para repetir"
                        className="text-amber-500/50 hover:text-amber-400 flex items-center gap-1 text-[10px]">
                        <Unlock size={12}/> Reset
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!lista.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-600 text-sm">{resultados.length ? 'Sin resultados para esa sede.' : 'Nadie ha rendido este examen aún.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Vista: editor de examen ──
  if (vista === 'editor') return (
    <EditorExamen empresaId={empresaId} examen={selected}
      onBack={() => { setVista('dashboard'); setSelected(null); load(); }} />
  );

  // ── Vista: dashboard ──
  const totalRendidos = examenes.reduce((s,e)=>s+(e.total_rendidos||0),0);
  return (
    <div>
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
            <ClipboardList size={15} className="text-blue-400"/> Exámenes de Capacitación
          </h3>
          <p className="text-gray-500 text-xs max-w-xl">Crea exámenes con 10 preguntas. Los trabajadores los rinden desde su celular con su DNI.</p>
        </div>
        <Btn size="sm" variant="primary" onClick={() => { setSelected(null); setVista('editor'); }}>
          <Plus size={13}/> Nuevo examen
        </Btn>
      </div>

      {/* QR + Link público */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-5 flex gap-5 flex-wrap items-start">
        <div className="flex flex-col items-center gap-2">
          <div className="bg-white rounded-xl p-2">
            <img src={qrSrc} alt="QR Examen" className="w-[140px] h-[140px]"/>
          </div>
          <span className="text-[10px] text-gray-600">Escanear para rendir</span>
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Link público — sin login</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-xs text-blue-300 truncate">{publicUrl}</code>
            <button onClick={copiarLink} className={`px-3 py-2 rounded-lg text-xs font-medium shrink-0 transition-colors ${copied ? 'bg-green-600 text-white':'bg-blue-600 hover:bg-blue-500 text-white'}`}>
              {copied ? '✓':'Copiar'}
            </button>
          </div>
          <p className="text-xs text-gray-600">El trabajador ingresa su DNI, elige el examen y responde. Solo puede rendir cada examen una vez.</p>
        </div>
      </div>

      {/* Lista de exámenes */}
      {loading ? <div className="text-center py-8 text-gray-600 text-sm">Cargando...</div> : (
        <div className="space-y-3">
          {examenes.map(ex => (
            <div key={ex.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white font-medium text-sm">{ex.nombre}</p>
                  <Badge color={ex.activo ? 'green':'gray'}>{ex.activo ? 'Activo':'Inactivo'}</Badge>
                </div>
                {ex.descripcion && <p className="text-gray-500 text-xs truncate">{ex.descripcion}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0flex-wrap">
                <button onClick={async () => { setSelected(ex); setFiltroSede(''); await loadResultados(ex.id); setVista('resultados'); }}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-400">
                  <Users size={13}/> Ver resultados
                </button>
                {/* Link directo a este examen */}
                <button
                  onClick={() => {
                    const url = publicUrlExamen(ex.id);
                    navigator.clipboard?.writeText(url).catch(()=>{});
                    showToast('Link directo copiado ✓', 'success');
                  }}
                  className="flex items-center gap-1 text-xs text-violet-400/70 hover:text-violet-300"
                  title="Copiar link directo a este examen">
                  <QrCode size={13}/> Link directo
                </button>
                <button onClick={() => { setSelected(ex); setVista('editor'); }}
                  className="text-gray-500 hover:text-blue-400"><Pencil size={13}/></button>
                <button onClick={() => toggleActivo(ex)}
                  className={`text-xs ${ex.activo ? 'text-amber-500/60 hover:text-amber-400':'text-gray-600 hover:text-emerald-400'}`}
                  title={ex.activo ? 'Desactivar':'Activar'}>
                  {ex.activo ? <Lock size={13}/> : <Unlock size={13}/>}
                </button>
                {puedeEliminar() && (
                  <button onClick={() => eliminarExamen(ex.id)} className="text-red-500/40 hover:text-red-400"><Trash2 size={13}/></button>
                )}
              </div>
            </div>
          ))}
          {!examenes.length && (
            <div className="text-center py-12 text-gray-600 text-sm">
              No hay exámenes. Crea el primero con "+ Nuevo examen".
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  EDITOR DE EXAMEN (nombre + 10 preguntas)
// ════════════════════════════════════════════════════════════════════
function EditorExamen({ empresaId, examen, onBack }) {
  const [nombre, setNombre] = useState(examen?.nombre || '');
  const [desc, setDesc] = useState(examen?.descripcion || '');
  const [videoUrl, setVideoUrl] = useState(examen?.video_url || '');
  const [preguntas, setPreguntas] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (examen?.id) {
      supabase.from('examen_preguntas').select('*').eq('examen_id', examen.id)
        .order('orden').then(({ data }) => {
          if (data?.length) setPreguntas(data);
          else setPreguntas(preguntasVacias());
        });
    } else {
      setPreguntas(preguntasVacias());
    }
  }, [examen]);

  const preguntasVacias = () => Array.from({ length: 10 }, (_, i) => ({
    orden: i+1, pregunta:'', opcion_a:'', opcion_b:'', opcion_c:'', opcion_d:'', correcta:'a'
  }));

  const setP = (idx, k, v) => setPreguntas(ps => ps.map((p,i) => i===idx ? {...p,[k]:v} : p));

  const guardar = async () => {
    if (!nombre.trim()) { showToast('Pon un nombre al examen', 'error'); return; }
    const vacias = preguntas.filter(p => !p.pregunta.trim() || !p.opcion_a.trim() || !p.opcion_b.trim());
    if (vacias.length) { showToast('Completa todas las preguntas y opciones A y B como mínimo', 'error'); return; }
    setSaving(true);
    let examenId = examen?.id;
    if (!examenId) {
      const { data, error } = await supabase.from('examenes').insert({ empresa_id: empresaId, nombre: nombre.trim(), descripcion: desc || null, video_url: videoUrl.trim() || null }).select().single();
      if (error) { showToast('Error: '+error.message, 'error'); setSaving(false); return; }
      examenId = data.id;
    } else {
      await supabase.from('examenes').update({ nombre: nombre.trim(), descripcion: desc||null, video_url: videoUrl.trim() || null }).eq('id', examenId);
    }
    // Borrar preguntas anteriores y reinsertar
    await supabase.from('examen_preguntas').delete().eq('examen_id', examenId);
    const rows = preguntas.map((p,i) => ({ examen_id: examenId, orden: i+1, pregunta: p.pregunta.trim(), opcion_a: p.opcion_a.trim()||'—', opcion_b: p.opcion_b.trim()||'—', opcion_c: p.opcion_c.trim()||'—', opcion_d: p.opcion_d.trim()||'—', correcta: p.correcta }));
    const { error: err2 } = await supabase.from('examen_preguntas').insert(rows);
    setSaving(false);
    if (err2) { showToast('Error guardando preguntas: '+err2.message, 'error'); return; }
    showToast('Examen guardado ✅', 'success');
    onBack();
  };

  return (
    <div className="max-w-3xl">
      <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
        <ArrowLeft size={13}/> Cancelar
      </button>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="text-white font-semibold text-sm">{examen ? 'Editar examen':'Nuevo examen'}</h3>
        <Btn size="sm" variant="primary" onClick={guardar} disabled={saving}>{saving?'Guardando...':'Guardar examen'}</Btn>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-5 grid sm:grid-cols-2 gap-3">
        <FormField label="Nombre del examen *" className="sm:col-span-2">
          <Input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej: Examen de Seguridad en Alturas"/>
        </FormField>
        <FormField label="Descripción / Tema" className="sm:col-span-2">
          <Input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Ej: Capacitación uso de arnés — Enero 2026"/>
        </FormField>
        <FormField label="Material de capacitación (YouTube, Drive, Sheets o Docs)" className="sm:col-span-2">
          <Input value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} placeholder="Video YouTube, o link de Drive/Sheets/Docs (compartido: cualquiera con el enlace)"/>
          <p className="text-[11px] text-gray-600 mt-1">Opcional. El trabajador verá este video antes de rendir el examen.</p>
        </FormField>
      </div>

      <div className="space-y-4">
        {preguntas.map((p,i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-400 mb-3 uppercase tracking-wide">Pregunta {i+1}</p>
            <FormField label="Enunciado *">
              <textarea rows={2} value={p.pregunta} onChange={e=>setP(i,'pregunta',e.target.value)}
                placeholder="Escribe la pregunta aquí..."
                className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500 resize-none"/>
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {LETRAS.map(l=>(
                <div key={l} className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-all ${p.correcta===l?'bg-emerald-900/30 border-emerald-700':'bg-gray-800 border-gray-700'}`}
                  onClick={()=>setP(i,'correcta',l)}>
                  <span className={`text-xs font-bold w-5 shrink-0 ${p.correcta===l?'text-emerald-400':'text-gray-500'}`}>{LETRA_LABEL[l]}</span>
                  <input value={p[`opcion_${l}`]} onChange={e=>setP(i,`opcion_${l}`,e.target.value)}
                    onClick={e=>e.stopPropagation()}
                    placeholder={`Opción ${LETRA_LABEL[l]}${l==='a'||l==='b'?' *':''}`}
                    className="flex-1 bg-transparent text-xs text-gray-200 focus:outline-none placeholder-gray-600"/>
                  {p.correcta===l && <CheckCircle size={12} className="text-emerald-400 shrink-0"/>}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-600 mt-1.5">Click en una opción para marcarla como correcta (verde)</p>
          </div>
        ))}
      </div>
      <div className="flex justify-end pt-4">
        <Btn variant="primary" onClick={guardar} disabled={saving}>{saving?'Guardando...':'Guardar examen'}</Btn>
      </div>
    </div>
  );
}
