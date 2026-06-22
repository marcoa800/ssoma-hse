import { useState, useEffect, useRef, Fragment } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { fmtFecha, excelDateToISO } from '../../lib/helpers.js';
import { Badge } from '../../components/ui/Badge.jsx';
import { KpiCard } from '../../components/ui/KpiCard.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Btn } from '../../components/ui/Btn.jsx';
import { WideTableScroll } from '../../components/ui/WideTableScroll.jsx';
import {
  Plus, Trash2, Link2, Copy, PenLine, Download, FileText, Upload,
  Headphones, CheckCircle, RotateCcw, Eye, UploadCloud,
} from 'lucide-react';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

export default function EmoEntregasModulo({ workers = [], empresaId }) {
  const [grupoEmpresas, setGrupoEmpresas] = useState([]); // {id,nombre,ruc}
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ trabajador_id: '', dni: '', nombre: '', pdf: null, audio: null });
  const [nuevoLink, setNuevoLink] = useState('');
  const [verFirmas, setVerFirmas] = useState(null);
  const [firmaTarget, setFirmaTarget] = useState(null);
  const [archivosTarget, setArchivosTarget] = useState(null); // entrega a la que subo archivos
  const [archForm, setArchForm] = useState({ pdf: null, audio: null });
  const [importPrev, setImportPrev] = useState(null);
  const [importing, setImporting] = useState(false);

  // ── Carga ──
  const load = async () => {
    setLoading(true);
    // empresas del grupo (Expertos en Café + Franquicias Unidas)
    const { data: emps } = await supabase.from('empresas').select('id, nombre, ruc');
    const grupo = (emps || []).filter(e => { const n = norm(e.nombre); return n.includes('expertos en cafe') || n.includes('franquicias unidas'); });
    setGrupoEmpresas(grupo);
    const ids = grupo.map(e => e.id);
    const idList = ids.length ? ids : [empresaId];
    const { data } = await supabase.from('emo_entregas').select('*').in('empresa_id', idList).order('fecha_examen', { ascending: true });
    setItems(data || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const empNombre = (id) => grupoEmpresas.find(e => e.id === id)?.nombre || '';
  const linkDe = (t) => `${window.location.origin}/?entrega=${t}`;
  const copiar = (txt) => { navigator.clipboard?.writeText(txt); showToast('Enlace copiado', 'success'); };

  // ── Crear entrega manual ──
  const onSelectTrabajador = (id) => { const w = workers.find(x => x.id === id); setForm(f => ({ ...f, trabajador_id: id, dni: w?.dni || '', nombre: w?.nombre || '' })); };
  const subir = async (bucket, file) => {
    const path = `${empresaId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
    if (error) throw error;
    return path;
  };
  const crearEntrega = async () => {
    if (!form.dni) { showToast('Selecciona un trabajador', 'error'); return; }
    if (!form.pdf || !form.audio) { showToast('Sube el PDF y el audio', 'error'); return; }
    setSaving(true);
    try {
      const pdfPath = await subir('emo-pdfs', form.pdf);
      const audioPath = await subir('emo-audios', form.audio);
      const { data, error } = await supabase.from('emo_entregas').insert({
        empresa_id: empresaId, trabajador_dni: form.dni, trabajador_nombre: form.nombre,
        audio_url: audioPath, pdf_url: pdfPath,
      }).select('token_acceso').single();
      if (error) throw error;
      setShowNew(false); setForm({ trabajador_id: '', dni: '', nombre: '', pdf: null, audio: null });
      setNuevoLink(linkDe(data.token_acceso)); load();
    } catch (e) { showToast('Error: ' + (e.message || 'no se pudo crear'), 'error'); }
    setSaving(false);
  };

  // ── Subir archivos a una entrega ya creada (de la programación) ──
  const guardarArchivos = async () => {
    if (!archForm.pdf || !archForm.audio) { showToast('Sube el PDF y el audio', 'error'); return; }
    setSaving(true);
    try {
      const pdfPath = await subir('emo-pdfs', archForm.pdf);
      const audioPath = await subir('emo-audios', archForm.audio);
      const { error } = await supabase.from('emo_entregas').update({ audio_url: audioPath, pdf_url: pdfPath }).eq('id', archivosTarget.id);
      if (error) throw error;
      showToast('Archivos cargados — el enlace ya está listo', 'success');
      setArchivosTarget(null); setArchForm({ pdf: null, audio: null }); load();
    } catch (e) { showToast('Error: ' + (e.message || 'no se pudo subir'), 'error'); }
    setSaving(false);
  };

  const descargarPdf = async (r) => {
    if (!r.pdf_url) { showToast('Aún no hay PDF cargado', 'error'); return; }
    const { data, error } = await supabase.storage.from('emo-pdfs').createSignedUrl(r.pdf_url, 300);
    if (error || !data?.signedUrl) { showToast('No se pudo generar el enlace', 'error'); return; }
    window.open(data.signedUrl, '_blank');
  };
  const eliminar = async (r) => {
    if (!confirm('¿Eliminar esta entrega?')) return;
    if (r.pdf_url) await supabase.storage.from('emo-pdfs').remove([r.pdf_url]).catch(() => {});
    if (r.audio_url) await supabase.storage.from('emo-audios').remove([r.audio_url]).catch(() => {});
    await supabase.from('emo_entregas').delete().eq('id', r.id);
    showToast('Entrega eliminada', 'info'); load();
  };

  // ── Importar programación (Excel de RRHH) ──
  const parseProgramacion = (rows) => {
    // localizar fila de encabezado (contiene "FECHA DEL EXAMEN")
    let h = -1;
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      if (rows[i].some(c => norm(c).includes('fecha del examen'))) { h = i; break; }
    }
    if (h < 0) return null;
    const head = rows[h].map(norm);
    const find = (...keys) => head.findIndex(c => keys.some(k => c === k || c.includes(k)));
    const col = {
      fecha: find('fecha del examen'),
      ap: find('apellido paterno'), am: find('apellido materno'),
      nombres: head.findIndex(c => c === 'nombres'),
      dni: find('dni'), nac: find('fecha de nacimiento'), cel: find('contacto'),
      puesto: find('puesto'), area: find('area de trabajo'), sede: find('sede'),
      tipo: find('tipo de examen'), perfil: find('nombre del perfil'),
      obs: find('observaciones'),
      razon: head.findIndex(c => c.includes('emisi') || c.includes('certificado')),
    };
    const ruc = col.razon >= 0 ? col.razon + 1 : -1;
    const rucToEmp = {}; const nomToEmp = {};
    grupoEmpresas.forEach(e => { if (e.ruc) rucToEmp[String(e.ruc).replace(/\D/g, '')] = e.id; nomToEmp[norm(e.nombre)] = e.id; });

    const out = [];
    for (let i = h + 1; i < rows.length; i++) {
      const r = rows[i];
      const dni = String(r[col.dni] ?? '').replace(/\D/g, '').slice(0, 12);
      const nombres = String(r[col.nombres] ?? '').trim();
      if (!dni || !nombres) continue;
      const nombre = `${String(r[col.ap] ?? '').trim()} ${String(r[col.am] ?? '').trim()}, ${nombres}`.toUpperCase().replace(/\s+/g, ' ').trim();
      const rucRow = ruc >= 0 ? String(r[ruc] ?? '').replace(/\D/g, '') : '';
      const razon = col.razon >= 0 ? String(r[col.razon] ?? '').trim() : '';
      const emp = rucToEmp[rucRow] || nomToEmp[norm(razon)] || empresaId;
      out.push({
        empresa_id: emp, dni, nombre,
        cargo: col.puesto >= 0 ? String(r[col.puesto] ?? '').trim() : '',
        area: col.area >= 0 ? String(r[col.area] ?? '').trim() : '',
        celular: col.cel >= 0 ? String(r[col.cel] ?? '').replace(/\D/g, '').slice(0, 12) : '',
        fecha_nacimiento: excelDateToISO(col.nac >= 0 ? r[col.nac] : ''),
        fecha_examen: excelDateToISO(col.fecha >= 0 ? r[col.fecha] : ''),
        sede: col.sede >= 0 ? String(r[col.sede] ?? '').trim() : '',
        tipo_examen: col.tipo >= 0 ? String(r[col.tipo] ?? '').trim() : '',
        perfil: col.perfil >= 0 ? String(r[col.perfil] ?? '').trim() : '',
        observaciones: col.obs >= 0 ? String(r[col.obs] ?? '').trim() : '',
        razon_social: razon,
      });
    }
    return out;
  };

  const onImportFile = (e) => {
    const file = e.target.files[0]; if (!file) return; e.target.value = '';
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const wb = XLSX.read(ev.target.result, { type: 'binary', cellDates: false });
      const ws = wb.Sheets[wb.SheetNames.find(n => norm(n).includes('program')) || wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      const parsed = parseProgramacion(rows);
      if (!parsed || !parsed.length) { showToast('No se reconoció el formato de programación.', 'error'); return; }
      // trabajadores existentes y entregas existentes (para deduplicar)
      const ids = grupoEmpresas.map(x => x.id);
      const { data: trab } = await supabase.from('trabajadores').select('dni, empresa_id').in('empresa_id', ids.length ? ids : [empresaId]);
      const setTrab = new Set((trab || []).map(t => `${t.empresa_id}|${t.dni}`));
      const setEnt = new Set(items.map(r => `${r.empresa_id}|${r.trabajador_dni}|${r.fecha_examen || ''}`));
      const nuevosTrab = parsed.filter(p => !setTrab.has(`${p.empresa_id}|${p.dni}`));
      // entregas nuevas (sin duplicar dni+fecha)
      const seen = new Set();
      const nuevasEnt = parsed.filter(p => {
        const k = `${p.empresa_id}|${p.dni}|${p.fecha_examen || ''}`;
        if (setEnt.has(k) || seen.has(k)) return false; seen.add(k); return true;
      });
      setImportPrev({ parsed, nuevosTrab, nuevasEnt });
    };
    reader.readAsBinaryString(file);
  };

  const ejecutarImport = async () => {
    setImporting(true);
    try {
      // 1) trabajadores nuevos (dedupe por empresa|dni)
      const seenT = new Set();
      const insTrab = [];
      for (const p of importPrev.nuevosTrab) {
        const k = `${p.empresa_id}|${p.dni}`; if (seenT.has(k)) continue; seenT.add(k);
        insTrab.push({ empresa_id: p.empresa_id, dni: p.dni, nombre: p.nombre, cargo: p.cargo || '', area: p.area || null, celular: p.celular || null, fecha_nacimiento: p.fecha_nacimiento || null, sede: p.sede || 'Lima', estado: 'Activo', duracion_emo: 'Anual' });
      }
      if (insTrab.length) { const { error } = await supabase.from('trabajadores').insert(insTrab); if (error) throw error; }
      // 2) entregas EMO pendientes
      const insEnt = importPrev.nuevasEnt.map(p => ({
        empresa_id: p.empresa_id, trabajador_dni: p.dni, trabajador_nombre: p.nombre,
        fecha_examen: p.fecha_examen || null, sede: p.sede || null, tipo_examen: p.tipo_examen || null,
        perfil: p.perfil || null, area: p.area || null, observaciones: p.observaciones || null, razon_social: p.razon_social || null,
      }));
      if (insEnt.length) { const { error } = await supabase.from('emo_entregas').insert(insEnt); if (error) throw error; }
      showToast(`Importado: ${insTrab.length} trabajador(es) nuevo(s) · ${insEnt.length} entrega(s) creada(s)`, 'success');
      setImportPrev(null); load();
    } catch (e) { showToast('Error al importar: ' + (e.message || ''), 'error'); }
    setImporting(false);
  };

  // ── Mi firma ──
  const canvasRef = useRef(null); const drawing = useRef(false);
  const [hasSig, setHasSig] = useState(false); const [savingFirma, setSavingFirma] = useState(false);
  useEffect(() => {
    if (!firmaTarget) return; const c = canvasRef.current; if (!c) return;
    c.width = c.offsetWidth; c.height = 170; const ctx = c.getContext('2d');
    ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0f172a'; setHasSig(false);
  }, [firmaTarget]);
  const ptr = (e) => { const c = canvasRef.current; const r = c.getBoundingClientRect(); const t = e.touches?.[0]; return { x: (t ? t.clientX : e.clientX) - r.left, y: (t ? t.clientY : e.clientY) - r.top }; };
  const sd = (e) => { e.preventDefault(); drawing.current = true; const ctx = canvasRef.current.getContext('2d'); const { x, y } = ptr(e); ctx.beginPath(); ctx.moveTo(x, y); };
  const md = (e) => { if (!drawing.current) return; e.preventDefault(); const ctx = canvasRef.current.getContext('2d'); const { x, y } = ptr(e); ctx.lineTo(x, y); ctx.stroke(); if (!hasSig) setHasSig(true); };
  const ed = () => { drawing.current = false; };
  const limpiar = () => { const c = canvasRef.current; c.getContext('2d').clearRect(0, 0, c.width, c.height); setHasSig(false); };
  const guardarMiFirma = async () => {
    if (!hasSig) { showToast('Dibuja tu firma', 'error'); return; }
    setSavingFirma(true);
    const firma = canvasRef.current.toDataURL('image/png');
    const { error } = await supabase.from('emo_entregas').update({ firma_responsable_base64: firma, fecha_firma_responsable: new Date().toISOString() }).eq('id', firmaTarget.id);
    setSavingFirma(false);
    if (error) { showToast('Error: ' + error.message, 'error'); return; }
    showToast('Tu firma fue registrada', 'success'); setFirmaTarget(null); load();
  };

  // ── Estado / KPIs ──
  const faltanArchivos = (r) => !r.audio_url || !r.pdf_url;
  const estadoBadge = (r) => {
    if (faltanArchivos(r)) return <Badge color="gray">Falta subir archivos</Badge>;
    if (r.estado !== 'completado') return <Badge color="amber">Pendiente de firma</Badge>;
    if (!r.firma_responsable_base64) return <Badge color="blue">Firmado · falta mi firma</Badge>;
    return <Badge color="green">Completo</Badge>;
  };
  const programadas = items.length;
  const sinArchivos = items.filter(faltanArchivos).length;
  const pendientesFirma = items.filter(r => !faltanArchivos(r) && r.estado !== 'completado').length;
  const completas = items.filter(r => r.estado === 'completado' && r.firma_responsable_base64).length;

  // ── Agrupación: SEDE → FECHA ──
  const grupos = (() => {
    const map = new Map();
    for (const r of items) {
      const sede = (r.sede || 'Sin sede').toUpperCase();
      if (!map.has(sede)) map.set(sede, new Map());
      const f = map.get(sede);
      const fk = r.fecha_examen || 'sin-fecha';
      if (!f.has(fk)) f.set(fk, []);
      f.get(fk).push(r);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([sede, fechas]) => ({
      sede,
      total: [...fechas.values()].reduce((s, arr) => s + arr.length, 0),
      fechas: [...fechas.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([fecha, arr]) => ({ fecha, arr })),
    }));
  })();

  const Acciones = ({ r }) => (
    <div className="flex gap-1.5 flex-wrap">
      {faltanArchivos(r)
        ? <button title="Subir PDF y audio" onClick={() => { setArchivosTarget(r); setArchForm({ pdf: null, audio: null }); }} className="text-amber-400 hover:text-amber-300"><UploadCloud size={15} /></button>
        : <button title="Copiar enlace" onClick={() => copiar(linkDe(r.token_acceso))} className="text-gray-400 hover:text-blue-400"><Link2 size={15} /></button>}
      {r.estado === 'completado' && <button title="Ver firmas" onClick={() => setVerFirmas(r)} className="text-gray-400 hover:text-emerald-400"><Eye size={15} /></button>}
      {r.estado === 'completado' && !r.firma_responsable_base64 && <button title="Añadir mi firma" onClick={() => setFirmaTarget(r)} className="text-gray-400 hover:text-blue-400"><PenLine size={15} /></button>}
      {r.pdf_url && <button title="Descargar PDF" onClick={() => descargarPdf(r)} className="text-gray-400 hover:text-white"><Download size={15} /></button>}
      <button title="Eliminar" onClick={() => eliminar(r)} className="text-red-500/40 hover:text-red-400"><Trash2 size={15} /></button>
    </div>
  );

  return (
    <div>
      <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Entrega y Firma de EMO</h3>
          <p className="text-gray-500 text-xs max-w-xl">Importa la programación de RRHH (Excel), sube el PDF + audio de cada examen y comparte el enlace para que el trabajador valide, escuche y firme. Luego añade tu firma.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-all cursor-pointer"><Upload size={13} /> Importar programación</span>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={onImportFile} />
          </label>
          <Btn size="sm" variant="primary" onClick={() => setShowNew(true)}><Plus size={13} /> Entrega manual</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Programados" value={programadas} sub="entregas registradas" accentColor="blue" />
        <KpiCard label="Falta subir archivos" value={sinArchivos} sub="PDF / audio pendiente" accentColor="amber" />
        <KpiCard label="Pendientes de firma" value={pendientesFirma} sub="esperan al trabajador" accentColor="red" />
        <KpiCard label="Completas" value={completas} sub="con ambas firmas" accentColor="emerald" />
      </div>

      {/* ── Móvil: agrupado por sede → fecha ── */}
      <div className="md:hidden space-y-4">
        {grupos.map(g => (
          <div key={g.sede}>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-2">{g.sede} <span className="text-gray-500 font-normal">· {g.total}</span></div>
            {g.fechas.map(({ fecha, arr }) => (
              <div key={fecha} className="mb-3">
                <div className="text-[11px] text-blue-300 font-semibold mb-1.5">{fecha === 'sin-fecha' ? 'Sin fecha' : fmtFecha(fecha)} · {arr.length}</div>
                <div className="space-y-2.5">
                  {arr.map(r => (
                    <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3.5">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0">
                          <div className="font-semibold text-white text-sm leading-tight">{r.trabajador_nombre || '—'}</div>
                          <div className="text-xs text-gray-500 font-mono mt-0.5">DNI {r.trabajador_dni}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mb-2">{r.tipo_examen || '—'}{r.perfil ? ` · ${r.perfil}` : ''}</div>
                      <div className="mb-2.5">{estadoBadge(r)}</div>
                      <Acciones r={r} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
        {!loading && !items.length && <div className="text-center text-gray-600 text-sm py-8 bg-gray-900 border border-gray-800 rounded-xl">Sin entregas. Importa la programación de RRHH.</div>}
      </div>

      {/* ── Escritorio: tabla agrupada ── */}
      <div className="hidden md:block">
        <WideTableScroll maxH="max-h-[calc(100vh-280px)]">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800">
              {['Trabajador', 'DNI', 'Empresa', 'Tipo / Perfil', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {grupos.map(g => (
                <Fragment key={g.sede}>
                  <tr className="bg-emerald-900/20 border-y border-gray-800"><td colSpan={6} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-emerald-300">{g.sede} <span className="text-gray-500 font-normal">· {g.total} programado{g.total !== 1 ? 's' : ''}</span></td></tr>
                  {g.fechas.map(({ fecha, arr }) => (
                    <Fragment key={fecha}>
                      <tr className="bg-gray-800/40"><td colSpan={6} className="px-4 py-1.5 text-[11px] font-semibold text-blue-300">{fecha === 'sin-fecha' ? 'Sin fecha' : fmtFecha(fecha)} · {arr.length}</td></tr>
                      {arr.map(r => (
                        <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                          <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{r.trabajador_nombre || '—'}</td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.trabajador_dni}</td>
                          <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{empNombre(r.empresa_id) || r.razon_social || '—'}</td>
                          <td className="px-4 py-3 text-xs text-gray-400">{r.tipo_examen || '—'}{r.perfil ? <span className="text-gray-600"> · {r.perfil}</span> : ''}</td>
                          <td className="px-4 py-3">{estadoBadge(r)}</td>
                          <td className="px-4 py-3"><Acciones r={r} /></td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </Fragment>
              ))}
              {!loading && !items.length && <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-600 text-sm">Sin entregas. Importa la programación de RRHH.</td></tr>}
            </tbody>
          </table>
        </WideTableScroll>
      </div>

      {/* ── Modal: preview de importación ── */}
      {importPrev && (
        <Modal title="Vista previa de importación" onClose={() => setImportPrev(null)} wide>
          <div className="flex gap-3 mb-5">
            <div className="flex-1 text-center bg-gray-800 border border-gray-700 rounded-xl px-4 py-3"><div className="text-2xl font-bold text-white">{importPrev.parsed.length}</div><div className="text-xs text-gray-500 mt-0.5">Programados detectados</div></div>
            <div className="flex-1 text-center bg-emerald-900/30 border border-emerald-800/50 rounded-xl px-4 py-3"><div className="text-2xl font-bold text-emerald-400">{importPrev.nuevosTrab.length}</div><div className="text-xs text-emerald-600 mt-0.5">Trabajadores nuevos</div></div>
            <div className="flex-1 text-center bg-blue-900/30 border border-blue-800/50 rounded-xl px-4 py-3"><div className="text-2xl font-bold text-blue-400">{importPrev.nuevasEnt.length}</div><div className="text-xs text-blue-600 mt-0.5">Entregas a crear</div></div>
          </div>
          <p className="text-xs text-gray-500 mb-2">Primeros registros:</p>
          <div className="overflow-x-auto mb-5 rounded-lg border border-gray-800">
            <table className="w-full text-xs"><thead><tr className="border-b border-gray-800 bg-gray-900">{['Trabajador', 'DNI', 'Empresa', 'Sede', 'Fecha', 'Tipo'].map(h => <th key={h} className="text-left text-gray-600 font-medium px-3 py-2 whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>{importPrev.parsed.slice(0, 6).map((p, i) => (
                <tr key={i} className="border-b border-gray-800/50">
                  <td className="px-3 py-2 text-white">{p.nombre}</td>
                  <td className="px-3 py-2 font-mono text-gray-400">{p.dni}</td>
                  <td className="px-3 py-2 text-gray-400">{empNombre(p.empresa_id) || p.razon_social}</td>
                  <td className="px-3 py-2 text-gray-400">{p.sede}</td>
                  <td className="px-3 py-2 font-mono text-gray-400">{p.fecha_examen || '—'}</td>
                  <td className="px-3 py-2 text-gray-400">{p.tipo_examen}</td>
                </tr>))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 justify-end">
            <Btn onClick={() => setImportPrev(null)}>Cancelar</Btn>
            <Btn variant="primary" onClick={ejecutarImport} disabled={importing}>{importing ? 'Importando…' : `Importar ${importPrev.nuevasEnt.length} entrega(s)`}</Btn>
          </div>
        </Modal>
      )}

      {/* ── Modal: subir archivos a una entrega ── */}
      {archivosTarget && (
        <Modal title="Subir PDF y audio" onClose={() => setArchivosTarget(null)}>
          <div className="space-y-4">
            <p className="text-xs text-gray-400">Trabajador: <span className="text-white">{archivosTarget.trabajador_nombre}</span> · DNI {archivosTarget.trabajador_dni}</p>
            <FormField label="PDF del EMO *">
              <input type="file" accept="application/pdf" onChange={e => setArchForm(f => ({ ...f, pdf: e.target.files[0] || null }))} className="block w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:text-xs file:font-medium file:cursor-pointer" />
              {archForm.pdf && <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><FileText size={11} /> {archForm.pdf.name}</p>}
            </FormField>
            <FormField label="Audio de la lectura *">
              <input type="file" accept="audio/*" onChange={e => setArchForm(f => ({ ...f, audio: e.target.files[0] || null }))} className="block w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:text-xs file:font-medium file:cursor-pointer" />
              {archForm.audio && <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Headphones size={11} /> {archForm.audio.name}</p>}
            </FormField>
            <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={() => setArchivosTarget(null)}>Cancelar</Btn><Btn variant="primary" onClick={guardarArchivos} disabled={saving}>{saving ? 'Subiendo…' : 'Subir archivos'}</Btn></div>
          </div>
        </Modal>
      )}

      {/* ── Modal: entrega manual ── */}
      {showNew && (
        <Modal title="Nueva entrega manual" onClose={() => setShowNew(false)}>
          <div className="space-y-4">
            <FormField label="Trabajador *">
              <Select value={form.trabajador_id} onChange={e => onSelectTrabajador(e.target.value)}>
                <option value="">Seleccionar trabajador...</option>
                {[...workers].filter(w => w.estado !== 'Cesado').sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map(w => <option key={w.id} value={w.id}>{w.nombre}</option>)}
              </Select>
            </FormField>
            <FormField label="DNI"><Input value={form.dni} disabled placeholder="Automático" className="opacity-70" /></FormField>
            <FormField label="PDF del EMO *"><input type="file" accept="application/pdf" onChange={e => setForm(f => ({ ...f, pdf: e.target.files[0] || null }))} className="block w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:text-xs file:font-medium file:cursor-pointer" />{form.pdf && <p className="text-xs text-gray-500 mt-1">{form.pdf.name}</p>}</FormField>
            <FormField label="Audio de la lectura *"><input type="file" accept="audio/*" onChange={e => setForm(f => ({ ...f, audio: e.target.files[0] || null }))} className="block w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:text-xs file:font-medium file:cursor-pointer" />{form.audio && <p className="text-xs text-gray-500 mt-1">{form.audio.name}</p>}</FormField>
            <div className="flex justify-end gap-2 pt-1"><Btn variant="ghost" onClick={() => setShowNew(false)}>Cancelar</Btn><Btn variant="primary" onClick={crearEntrega} disabled={saving}>{saving ? 'Subiendo…' : 'Crear y generar enlace'}</Btn></div>
          </div>
        </Modal>
      )}

      {/* ── Modal: enlace generado ── */}
      {nuevoLink && (
        <Modal title="Enlace generado" onClose={() => setNuevoLink('')}>
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-full bg-emerald-900/40 border border-emerald-700 flex items-center justify-center mx-auto mb-3"><CheckCircle size={28} className="text-emerald-400" /></div>
            <p className="text-sm text-gray-300 mb-4">Comparte este enlace con el trabajador:</p>
            <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 mb-4"><Link2 size={14} className="text-blue-400 shrink-0" /><span className="text-xs text-gray-300 font-mono truncate flex-1 text-left">{nuevoLink}</span></div>
            <Btn variant="primary" className="w-full justify-center" onClick={() => copiar(nuevoLink)}><Copy size={14} /> Copiar enlace</Btn>
          </div>
        </Modal>
      )}

      {/* ── Modal: ver firmas ── */}
      {verFirmas && (
        <Modal title="Firmas registradas" onClose={() => setVerFirmas(null)}>
          <div className="space-y-4">
            <div><div className="text-xs text-gray-500 mb-1.5">Firma del trabajador · {verFirmas.fecha_firma ? fmtFecha(verFirmas.fecha_firma) : '—'}</div>{verFirmas.firma_base64 ? <img src={verFirmas.firma_base64} alt="Firma trabajador" className="w-full bg-white rounded-lg border border-gray-700" /> : <div className="text-xs text-gray-600 py-4 text-center bg-gray-800 rounded-lg">Sin firma</div>}</div>
            <div><div className="text-xs text-gray-500 mb-1.5">Mi firma (responsable) · {verFirmas.fecha_firma_responsable ? fmtFecha(verFirmas.fecha_firma_responsable) : '—'}</div>{verFirmas.firma_responsable_base64 ? <img src={verFirmas.firma_responsable_base64} alt="Firma responsable" className="w-full bg-white rounded-lg border border-gray-700" /> : <div className="text-xs text-gray-600 py-4 text-center bg-gray-800 rounded-lg">Aún no has firmado</div>}</div>
          </div>
        </Modal>
      )}

      {/* ── Modal: añadir mi firma ── */}
      {firmaTarget && (
        <Modal title="Añadir mi firma (responsable)" onClose={() => setFirmaTarget(null)}>
          <div className="space-y-3">
            <p className="text-xs text-gray-400">Trabajador: <span className="text-white">{firmaTarget.trabajador_nombre}</span> — firmó el {fmtFecha(firmaTarget.fecha_firma)}.</p>
            <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Dibuja tu firma</span><button onClick={limpiar} className="flex items-center gap-1 text-xs text-blue-400"><RotateCcw size={12} /> Limpiar</button></div>
            <canvas ref={canvasRef} onMouseDown={sd} onMouseMove={md} onMouseUp={ed} onMouseLeave={ed} onTouchStart={sd} onTouchMove={md} onTouchEnd={ed} className="w-full h-[170px] bg-white border-2 border-dashed border-gray-600 rounded-xl touch-none cursor-crosshair" />
            <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={() => setFirmaTarget(null)}>Cancelar</Btn><Btn variant="primary" onClick={guardarMiFirma} disabled={savingFirma}>{savingFirma ? 'Guardando…' : 'Guardar firma'}</Btn></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
