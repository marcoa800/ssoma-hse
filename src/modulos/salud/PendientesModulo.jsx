// ════════════════════════════════════════════════════════════════════
//  PendientesModulo — Actividades / Pendientes estilo Notion (Comindustria)
//  v2: búsqueda + filtros, orden + reordenar (drag), responsable desde
//  directorio, vista Kanban, exportar Excel/PDF, subtareas y enlace,
//  duplicar / mover entre tablas.
// ════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase, puedeEliminar } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import {
  Plus, Trash2, ListTodo, AlertTriangle, Clock, Pencil, X, Check, Search,
  LayoutGrid, Table as TableIcon, FileSpreadsheet, FileDown, Link2, Copy,
  GripVertical, MoreHorizontal, ExternalLink, Lock, Users,
} from 'lucide-react';

const ESTADOS = ['Pendiente', 'En progreso', 'En revisión', 'Hecho', 'Bloqueado'];
const EST_COLOR = {
  'Pendiente':   'bg-gray-500 text-white border-gray-500',
  'En progreso': 'bg-blue-600 text-white border-blue-600',
  'En revisión': 'bg-amber-500 text-gray-900 border-amber-500',
  'Hecho':       'bg-emerald-600 text-white border-emerald-600',
  'Bloqueado':   'bg-red-600 text-white border-red-600',
};
const EST_ORD = { 'Bloqueado': 0, 'En progreso': 1, 'En revisión': 2, 'Pendiente': 3, 'Hecho': 4 };
const PRIORIDADES = ['Alta', 'Media', 'Baja'];
const PRI_COLOR = {
  'Alta':  'bg-red-600 text-white border-red-600',
  'Media': 'bg-amber-500 text-gray-900 border-amber-500',
  'Baja':  'bg-gray-500 text-white border-gray-500',
};
const PRI_ORD = { 'Alta': 0, 'Media': 1, 'Baja': 2 };

const hoyISO = () => new Date().toISOString().split('T')[0];
function venc(row) {
  if (!row.fecha_limite || row.estado === 'Hecho') return null;
  const dias = Math.round((new Date(row.fecha_limite + 'T00:00:00') - new Date(hoyISO() + 'T00:00:00')) / 86400000);
  if (dias < 0) return { label: `Vencida (${Math.abs(dias)}d)`, cls: 'text-red-400', tipo: 'vencida' };
  if (dias <= 3) return { label: dias === 0 ? 'Vence hoy' : `Vence en ${dias}d`, cls: 'text-amber-400', tipo: 'porvencer' };
  return { label: '', cls: 'text-gray-500', tipo: 'ok' };
}

export default function PendientesModulo({ empresaId, userId }) {
  const [tablas, setTablas] = useState([]);
  const [tablaSel, setTablaSel] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTabla, setEditTabla] = useState(null);
  const [nombreTmp, setNombreTmp] = useState('');
  const initRef = useRef(false);

  const [vista, setVista] = useState('tabla');           // tabla | kanban
  const [search, setSearch] = useState('');
  const [fEstado, setFEstado] = useState('');
  const [fPrioridad, setFPrioridad] = useState('');
  const [fVenc, setFVenc] = useState('');                 // '' | vencida | porvencer
  const [sortBy, setSortBy] = useState('manual');         // manual | prioridad | fecha | estado
  const [detalle, setDetalle] = useState(null);           // actividad en modal
  const [responsables, setResponsables] = useState([]);   // nombres del directorio
  const dragId = useRef(null);

  // ── Cargar tablas ──
  const loadTablas = async () => {
    setLoading(true);
    let { data } = await supabase.from('actividad_tablas').select('*')
      .eq('empresa_id', empresaId).order('orden').order('created_at');
    data = data || [];
    // Crear tabla por defecto solo si el usuario no tiene NINGUNA propia
    if (!data.some(t => t.user_id === userId)) {
      const { data: nueva } = await supabase.from('actividad_tablas')
        .insert({ empresa_id: empresaId, user_id: userId, nombre: 'Mis pendientes' }).select().single();
      if (nueva) data = [nueva, ...data];
    }
    setTablas(data);
    setTablaSel(prev => prev && data.some(t => t.id === prev) ? prev : (data[0]?.id || null));
    setLoading(false);
  };
  // Dueño de la tabla seleccionada (para permitir editar nombre/privacidad/borrar)
  const esDueno = (t) => t && t.user_id === userId;
  const toggleCompartida = async (t) => {
    const nv = !t.compartida;
    await supabase.from('actividad_tablas').update({ compartida: nv }).eq('id', t.id);
    setTablas(ts => ts.map(x => x.id === t.id ? { ...x, compartida: nv } : x));
    showToast(nv ? 'Tabla compartida con tu empresa' : 'Tabla ahora privada', 'success');
  };
  useEffect(() => {
    if (!empresaId || !userId || initRef.current) return;
    initRef.current = true;
    loadTablas();
    // nombres del directorio para sugerir responsables
    supabase.from('trabajadores').select('nombre').eq('empresa_id', empresaId).order('nombre')
      .then(({ data }) => setResponsables([...new Set((data || []).map(w => w.nombre).filter(Boolean))]));
  }, [empresaId, userId]);

  const loadRows = async (tablaId) => {
    if (!tablaId) { setRows([]); return; }
    const { data } = await supabase.from('actividades').select('*')
      .eq('tabla_id', tablaId).order('orden').order('created_at');
    setRows(data || []);
  };
  useEffect(() => { loadRows(tablaSel); }, [tablaSel]);

  // ── Tablas ──
  const addTabla = async () => {
    const { data } = await supabase.from('actividad_tablas')
      .insert({ empresa_id: empresaId, user_id: userId, nombre: 'Nueva tabla', orden: tablas.length }).select().single();
    if (data) { setTablas(t => [...t, data]); setTablaSel(data.id); setEditTabla(data.id); setNombreTmp(data.nombre); }
  };
  const guardarNombre = async (id) => {
    const nombre = nombreTmp.trim() || 'Sin nombre';
    await supabase.from('actividad_tablas').update({ nombre }).eq('id', id);
    setTablas(t => t.map(x => x.id === id ? { ...x, nombre } : x));
    setEditTabla(null);
  };
  const deleteTabla = async (id) => {
    if (tablas.filter(t => t.user_id === userId).length <= 1) { showToast('Debe quedarte al menos una tabla propia.', 'error'); return; }
    if (!confirm('¿Eliminar esta tabla y todas sus actividades?')) return;
    await supabase.from('actividad_tablas').delete().eq('id', id);
    const rest = tablas.filter(t => t.id !== id);
    setTablas(rest);
    if (tablaSel === id) setTablaSel(rest[0]?.id || null);
  };

  // ── Filas ──
  const addRow = async () => {
    const { data } = await supabase.from('actividades')
      .insert({ tabla_id: tablaSel, empresa_id: empresaId, user_id: userId, orden: rows.length }).select().single();
    if (data) setRows(r => [...r, data]);
  };
  const updateRow = async (id, patch) => {
    setRows(r => r.map(x => x.id === id ? { ...x, ...patch } : x));
    if (detalle?.id === id) setDetalle(d => ({ ...d, ...patch }));
    await supabase.from('actividades').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
  };
  const deleteRow = async (id) => {
    setRows(r => r.filter(x => x.id !== id));
    if (detalle?.id === id) setDetalle(null);
    await supabase.from('actividades').delete().eq('id', id);
  };
  const duplicarRow = async (r) => {
    const { id, created_at, updated_at, ...copia } = r;
    const { data } = await supabase.from('actividades')
      .insert({ ...copia, titulo: (r.titulo || '') + ' (copia)', orden: rows.length }).select().single();
    if (data) { setRows(prev => [...prev, data]); showToast('Actividad duplicada', 'success'); }
  };
  const moverRow = async (r, nuevaTabla) => {
    if (nuevaTabla === r.tabla_id) return;
    await supabase.from('actividades').update({ tabla_id: nuevaTabla }).eq('id', r.id);
    setRows(prev => prev.filter(x => x.id !== r.id));
    setDetalle(null);
    showToast('Actividad movida', 'success');
  };

  // ── Reordenar (drag) — solo en orden manual sin filtros ──
  const puedeReordenar = sortBy === 'manual' && !search && !fEstado && !fPrioridad && !fVenc;
  const onDrop = async (targetId) => {
    const from = rows.findIndex(r => r.id === dragId.current);
    const to = rows.findIndex(r => r.id === targetId);
    if (from < 0 || to < 0 || from === to) return;
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setRows(next);
    dragId.current = null;
    await Promise.all(next.map((r, i) => supabase.from('actividades').update({ orden: i }).eq('id', r.id)));
  };

  // ── Derivados: filtrar + ordenar ──
  const filtered = rows.filter(r => {
    const t = search.toLowerCase();
    if (t && !(`${r.titulo} ${r.responsable || ''} ${r.notas || ''}`.toLowerCase().includes(t))) return false;
    if (fEstado && r.estado !== fEstado) return false;
    if (fPrioridad && r.prioridad !== fPrioridad) return false;
    if (fVenc && venc(r)?.tipo !== fVenc) return false;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'prioridad') return (PRI_ORD[a.prioridad] ?? 9) - (PRI_ORD[b.prioridad] ?? 9);
    if (sortBy === 'estado') return (EST_ORD[a.estado] ?? 9) - (EST_ORD[b.estado] ?? 9);
    if (sortBy === 'fecha') return (a.fecha_limite || '9999').localeCompare(b.fecha_limite || '9999');
    return (a.orden - b.orden) || a.created_at.localeCompare(b.created_at);
  });

  const vencidas = rows.filter(r => venc(r)?.tipo === 'vencida').length;
  const porVencer = rows.filter(r => venc(r)?.tipo === 'porvencer').length;
  const pendientes = rows.filter(r => r.estado !== 'Hecho').length;
  const tablaActual = tablas.find(t => t.id === tablaSel);

  // ── Exportar ──
  const exportRows = () => sorted.map((r, i) => ({
    '#': i + 1, Actividad: r.titulo || '', Responsable: r.responsable || '',
    Estado: r.estado, Prioridad: r.prioridad, 'Fecha límite': r.fecha_limite || '',
    Subtareas: `${(r.subtareas || []).filter(s => s.done).length}/${(r.subtareas || []).length}`,
    Notas: r.notas || '', Enlace: r.enlace || '',
  }));
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pendientes');
    XLSX.writeFile(wb, `pendientes_${(tablaActual?.nombre || 'tabla').replace(/\s+/g, '_')}_${hoyISO()}.xlsx`);
  };
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(13).setFont(undefined, 'bold').setTextColor(30, 64, 175);
    doc.text(`Pendientes — ${tablaActual?.nombre || ''}`, 14, 14);
    doc.setFontSize(8).setFont(undefined, 'normal').setTextColor(120);
    doc.text(`Generado: ${hoyISO()}  ·  ${sorted.length} actividades`, 14, 19);
    autoTable(doc, {
      startY: 24,
      head: [['#', 'Actividad', 'Responsable', 'Estado', 'Prioridad', 'Fecha límite', 'Subtareas', 'Notas']],
      body: sorted.map((r, i) => [
        i + 1, r.titulo || '', r.responsable || '', r.estado, r.prioridad,
        r.fecha_limite || '', `${(r.subtareas || []).filter(s => s.done).length}/${(r.subtareas || []).length}`, r.notas || '',
      ]),
      styles: { fontSize: 8, cellPadding: 1.6 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontSize: 8 },
      margin: { left: 14, right: 14 },
    });
    doc.save(`pendientes_${(tablaActual?.nombre || 'tabla').replace(/\s+/g, '_')}_${hoyISO()}.pdf`);
  };

  if (loading) return <div className="text-gray-600 text-sm py-10 text-center">Cargando pendientes…</div>;

  const subDone = (r) => (r.subtareas || []).filter(s => s.done).length;
  const subTot = (r) => (r.subtareas || []).length;

  return (
    <div>
      {/* Pestañas de tablas */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {tablas.map(t => (
          <div key={t.id} className={`group flex items-center rounded-lg border ${tablaSel === t.id ? 'bg-blue-900/30 border-blue-700' : 'bg-gray-900 border-gray-800'}`}>
            {editTabla === t.id ? (
              <span className="flex items-center px-1">
                <input autoFocus value={nombreTmp} onChange={e => setNombreTmp(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && guardarNombre(t.id)}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white w-36 focus:outline-none focus:border-blue-500" />
                <button onClick={() => guardarNombre(t.id)} className="p-1 text-emerald-400 hover:text-emerald-300"><Check size={14} /></button>
                <button onClick={() => setEditTabla(null)} className="p-1 text-gray-500 hover:text-gray-300"><X size={14} /></button>
              </span>
            ) : (
              <>
                <button onClick={() => setTablaSel(t.id)} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${tablaSel === t.id ? 'text-blue-300 font-medium' : 'text-gray-400 hover:text-gray-200'}`}>
                  {t.compartida ? <Users size={12} className="text-emerald-400" title="Compartida" /> : <Lock size={11} className="text-gray-600" title="Privada" />}
                  {t.nombre}
                  {!esDueno(t) && <span className="text-[10px] text-gray-500">(equipo)</span>}
                </button>
                {tablaSel === t.id && esDueno(t) && (
                  <span className="flex items-center pr-1.5">
                    <button onClick={() => toggleCompartida(t)} title={t.compartida ? 'Hacer privada' : 'Compartir con la empresa'} className={`p-0.5 ${t.compartida ? 'text-emerald-400 hover:text-gray-300' : 'text-gray-500 hover:text-emerald-300'}`}>{t.compartida ? <Lock size={12} /> : <Users size={12} />}</button>
                    <button onClick={() => { setEditTabla(t.id); setNombreTmp(t.nombre); }} title="Renombrar" className="p-0.5 text-gray-500 hover:text-blue-300"><Pencil size={12} /></button>
                    {puedeEliminar() && (
                      <button onClick={() => deleteTabla(t.id)} title="Eliminar tabla" className="p-0.5 text-gray-500 hover:text-red-400"><Trash2 size={12} /></button>
                    )}
                  </span>
                )}
              </>
            )}
          </div>
        ))}
        <button onClick={addTabla} className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-gray-500 hover:text-blue-300 rounded-lg border border-dashed border-gray-800 hover:border-blue-700">
          <Plus size={14} /> Tabla
        </button>
      </div>

      {/* Resumen / alertas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5">
          <div className="text-xs text-gray-500 flex items-center gap-1"><ListTodo size={12} /> Pendientes</div>
          <div className="text-xl font-bold text-white">{pendientes}</div>
        </div>
        <button onClick={() => setFVenc(fVenc === 'porvencer' ? '' : 'porvencer')} className={`text-left rounded-xl px-3 py-2.5 border transition-colors ${fVenc === 'porvencer' ? 'ring-1 ring-amber-500 ' : ''}${porVencer ? 'bg-amber-900/20 border-amber-900/50' : 'bg-gray-900 border-gray-800'}`}>
          <div className="text-xs text-gray-500 flex items-center gap-1"><Clock size={12} /> Por vencer (≤3d)</div>
          <div className={`text-xl font-bold ${porVencer ? 'text-amber-400' : 'text-white'}`}>{porVencer}</div>
        </button>
        <button onClick={() => setFVenc(fVenc === 'vencida' ? '' : 'vencida')} className={`text-left rounded-xl px-3 py-2.5 border transition-colors ${fVenc === 'vencida' ? 'ring-1 ring-red-500 ' : ''}${vencidas ? 'bg-red-900/20 border-red-900/50' : 'bg-gray-900 border-gray-800'}`}>
          <div className="text-xs text-gray-500 flex items-center gap-1"><AlertTriangle size={12} /> Vencidas</div>
          <div className={`text-xl font-bold ${vencidas ? 'text-red-400' : 'text-white'}`}>{vencidas}</div>
        </button>
      </div>

      {/* Toolbar: buscar / filtros / orden / vista / exportar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar actividad, responsable…"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500" />
        </div>
        <select value={fEstado} onChange={e => setFEstado(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500">
          <option value="">Estado: todos</option>{ESTADOS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={fPrioridad} onChange={e => setFPrioridad(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500">
          <option value="">Prioridad: todas</option>{PRIORIDADES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500">
          <option value="manual">Orden: manual</option>
          <option value="prioridad">Orden: prioridad</option>
          <option value="fecha">Orden: fecha límite</option>
          <option value="estado">Orden: estado</option>
        </select>
        <div className="flex rounded-lg border border-gray-700 overflow-hidden">
          <button onClick={() => setVista('tabla')} title="Tabla" className={`px-2.5 py-2 ${vista === 'tabla' ? 'bg-blue-900/40 text-blue-300' : 'text-gray-500 hover:text-gray-300'}`}><TableIcon size={15} /></button>
          <button onClick={() => setVista('kanban')} title="Kanban" className={`px-2.5 py-2 border-l border-gray-700 ${vista === 'kanban' ? 'bg-blue-900/40 text-blue-300' : 'text-gray-500 hover:text-gray-300'}`}><LayoutGrid size={15} /></button>
        </div>
        <button onClick={exportExcel} title="Exportar Excel" className="px-2.5 py-2 rounded-lg border border-gray-700 text-emerald-400 hover:bg-gray-800"><FileSpreadsheet size={15} /></button>
        <button onClick={exportPDF} title="Exportar PDF" className="px-2.5 py-2 rounded-lg border border-gray-700 text-red-400 hover:bg-gray-800"><FileDown size={15} /></button>
      </div>

      {/* ── VISTA TABLA ── */}
      {vista === 'tabla' && (
        <>
          <div className="hidden md:block bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['', 'Actividad', 'Responsable', 'Estado', 'Prioridad', 'Fecha límite', 'Notas', ''].map((h, i) => (
                    <th key={i} className="text-left text-xs text-gray-600 font-medium px-3 py-2.5 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => {
                  const v = venc(r);
                  return (
                    <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 group"
                      draggable={puedeReordenar}
                      onDragStart={() => { dragId.current = r.id; }}
                      onDragOver={e => puedeReordenar && e.preventDefault()}
                      onDrop={() => puedeReordenar && onDrop(r.id)}>
                      <td className="pl-2 text-gray-700">{puedeReordenar && <GripVertical size={14} className="cursor-grab opacity-0 group-hover:opacity-100" />}</td>
                      <td className="px-3 py-2 min-w-[220px]">
                        <div className="flex items-center gap-1.5">
                          <input defaultValue={r.titulo} key={`t-${r.id}-${r.titulo}`} onBlur={e => e.target.value !== r.titulo && updateRow(r.id, { titulo: e.target.value })}
                            placeholder="Escribe una actividad…"
                            className={`w-full bg-transparent placeholder-gray-600 focus:outline-none rounded px-1.5 py-1 ${r.estado === 'Hecho' ? 'line-through text-gray-500' : 'text-white'}`} />
                          {subTot(r) > 0 && <span className="shrink-0 text-[10px] text-gray-500 bg-gray-800 rounded px-1.5 py-0.5">{subDone(r)}/{subTot(r)}</span>}
                          {r.enlace && <a href={r.enlace} target="_blank" rel="noreferrer" className="shrink-0 text-blue-400" title="Abrir enlace"><Link2 size={13} /></a>}
                        </div>
                      </td>
                      <td className="px-3 py-2 min-w-[140px]">
                        <input list="resp-list" defaultValue={r.responsable || ''} key={`r-${r.id}-${r.responsable}`} onBlur={e => e.target.value !== (r.responsable || '') && updateRow(r.id, { responsable: e.target.value || null })}
                          placeholder="—" className="w-full bg-transparent text-gray-300 placeholder-gray-600 focus:outline-none rounded px-1.5 py-1" />
                      </td>
                      <td className="px-3 py-2">
                        <select value={r.estado} onChange={e => updateRow(r.id, { estado: e.target.value })}
                          className={`text-xs font-medium rounded-lg border px-2 py-1 focus:outline-none cursor-pointer ${EST_COLOR[r.estado] || EST_COLOR['Pendiente']}`}>
                          {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select value={r.prioridad} onChange={e => updateRow(r.id, { prioridad: e.target.value })}
                          className={`text-xs font-medium rounded-lg border px-2 py-1 focus:outline-none cursor-pointer ${PRI_COLOR[r.prioridad] || PRI_COLOR['Media']}`}>
                          {PRIORIDADES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <input type="date" value={r.fecha_limite || ''} onChange={e => updateRow(r.id, { fecha_limite: e.target.value || null })}
                          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500" />
                        {v?.label && <div className={`text-[11px] mt-0.5 ${v.cls}`}>{v.label}</div>}
                      </td>
                      <td className="px-3 py-2 min-w-[160px]">
                        <input defaultValue={r.notas || ''} key={`n-${r.id}-${r.notas}`} onBlur={e => e.target.value !== (r.notas || '') && updateRow(r.id, { notas: e.target.value || null })}
                          placeholder="—" className="w-full bg-transparent text-gray-400 placeholder-gray-600 focus:outline-none rounded px-1.5 py-1" />
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <button onClick={() => setDetalle(r)} title="Detalle / subtareas" className="text-gray-600 hover:text-blue-300 p-1"><MoreHorizontal size={15} /></button>
                        {puedeEliminar() && (
                          <button onClick={() => deleteRow(r.id)} title="Eliminar" className="text-gray-700 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {sorted.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-600 text-sm">{rows.length ? 'Ninguna actividad coincide con los filtros.' : 'Aún no hay actividades. Agrega la primera ↓'}</td></tr>
                )}
              </tbody>
            </table>
            <button onClick={addRow} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-500 hover:text-blue-300 hover:bg-gray-800/40 transition-colors border-t border-gray-800">
              <Plus size={15} /> Nueva actividad
            </button>
          </div>

          {/* Tarjetas (móvil) */}
          <div className="md:hidden space-y-2.5">
            {sorted.map(r => {
              const v = venc(r);
              return (
                <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <input defaultValue={r.titulo} key={`mt-${r.id}-${r.titulo}`} onBlur={e => e.target.value !== r.titulo && updateRow(r.id, { titulo: e.target.value })}
                      placeholder="Actividad…" className={`flex-1 bg-transparent text-sm font-medium placeholder-gray-600 focus:outline-none ${r.estado === 'Hecho' ? 'line-through text-gray-500' : 'text-white'}`} />
                    <button onClick={() => setDetalle(r)} className="text-gray-600 hover:text-blue-300 shrink-0"><MoreHorizontal size={15} /></button>
                    {puedeEliminar() && (
                      <button onClick={() => deleteRow(r.id)} className="text-gray-700 hover:text-red-400 shrink-0"><Trash2 size={14} /></button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <select value={r.estado} onChange={e => updateRow(r.id, { estado: e.target.value })} className={`text-xs font-medium rounded-lg border px-2 py-1 ${EST_COLOR[r.estado]}`}>
                      {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={r.prioridad} onChange={e => updateRow(r.id, { prioridad: e.target.value })} className={`text-xs font-medium rounded-lg border px-2 py-1 ${PRI_COLOR[r.prioridad]}`}>
                      {PRIORIDADES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {subTot(r) > 0 && <span className="text-[11px] text-gray-400 bg-gray-800 rounded px-2 py-1">{subDone(r)}/{subTot(r)} subt.</span>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <input list="resp-list" defaultValue={r.responsable || ''} key={`mr-${r.id}-${r.responsable}`} onBlur={e => updateRow(r.id, { responsable: e.target.value || null })}
                      placeholder="Responsable" className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-gray-300 placeholder-gray-600 focus:outline-none" />
                    <input type="date" value={r.fecha_limite || ''} onChange={e => updateRow(r.id, { fecha_limite: e.target.value || null })}
                      className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-gray-300 focus:outline-none" />
                  </div>
                  {v?.label && <div className={`text-[11px] ${v.cls}`}>{v.label}</div>}
                </div>
              );
            })}
            <button onClick={addRow} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-gray-400 bg-gray-900 border border-dashed border-gray-700 rounded-xl hover:text-blue-300 hover:border-blue-700">
              <Plus size={15} /> Nueva actividad
            </button>
          </div>
        </>
      )}

      {/* ── VISTA KANBAN ── */}
      {vista === 'kanban' && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {ESTADOS.map(col => {
            const cards = sorted.filter(r => r.estado === col);
            return (
              <div key={col} className="shrink-0 w-64 bg-gray-900/60 border border-gray-800 rounded-xl"
                onDragOver={e => e.preventDefault()}
                onDrop={() => { const id = dragId.current; if (id) updateRow(id, { estado: col }); dragId.current = null; }}>
                <div className={`px-3 py-2 rounded-t-xl text-xs font-semibold border-b border-gray-800 flex items-center justify-between ${EST_COLOR[col]}`}>
                  <span>{col}</span><span className="opacity-70">{cards.length}</span>
                </div>
                <div className="p-2 space-y-2 min-h-[60px]">
                  {cards.map(r => {
                    const v = venc(r);
                    return (
                      <div key={r.id} draggable onDragStart={() => { dragId.current = r.id; }}
                        onClick={() => setDetalle(r)}
                        className="bg-gray-900 border border-gray-800 rounded-lg p-2.5 cursor-grab hover:border-gray-600">
                        <div className={`text-sm ${r.estado === 'Hecho' ? 'line-through text-gray-500' : 'text-white'}`}>{r.titulo || <span className="text-gray-600">(sin título)</span>}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className={`text-[10px] font-medium rounded border px-1.5 py-0.5 ${PRI_COLOR[r.prioridad]}`}>{r.prioridad}</span>
                          {r.responsable && <span className="text-[10px] text-gray-400 truncate max-w-[90px]">{r.responsable}</span>}
                          {subTot(r) > 0 && <span className="text-[10px] text-gray-500">{subDone(r)}/{subTot(r)}</span>}
                        </div>
                        {v?.label && <div className={`text-[10px] mt-1 ${v.cls}`}>{v.label}</div>}
                      </div>
                    );
                  })}
                  {col === 'Pendiente' && (
                    <button onClick={addRow} className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-gray-500 hover:text-blue-300 rounded border border-dashed border-gray-800 hover:border-blue-700"><Plus size={12} /> Agregar</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* datalist responsables del directorio */}
      <datalist id="resp-list">{responsables.map(n => <option key={n} value={n} />)}</datalist>

      {/* ── MODAL DETALLE: subtareas, enlace, duplicar, mover ── */}
      {detalle && (
        <Modal title="Detalle de la actividad" onClose={() => setDetalle(null)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500">Actividad</label>
              <input defaultValue={detalle.titulo} onBlur={e => updateRow(detalle.id, { titulo: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 mt-1" />
            </div>

            {/* Enlace / adjunto */}
            <div>
              <label className="text-xs text-gray-500 flex items-center gap-1"><Link2 size={12} /> Enlace o archivo (URL)</label>
              <input defaultValue={detalle.enlace || ''} onBlur={e => updateRow(detalle.id, { enlace: e.target.value || null })}
                placeholder="https://… (Drive, PDF, etc.)"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 mt-1" />
              {detalle.enlace && <a href={detalle.enlace} target="_blank" rel="noreferrer" className="text-xs text-blue-400 inline-flex items-center gap-1 mt-1"><ExternalLink size={11} /> Abrir</a>}
            </div>

            {/* Subtareas / checklist */}
            <div>
              <label className="text-xs text-gray-500 flex items-center justify-between">
                <span>Subtareas</span>
                <span>{subDone(detalle)}/{subTot(detalle)}</span>
              </label>
              {subTot(detalle) > 0 && (
                <div className="w-full h-1.5 bg-gray-800 rounded-full mt-1.5 mb-2">
                  <div className="h-1.5 bg-emerald-500 rounded-full" style={{ width: `${subTot(detalle) ? Math.round(subDone(detalle) / subTot(detalle) * 100) : 0}%` }} />
                </div>
              )}
              <div className="space-y-1.5">
                {(detalle.subtareas || []).map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button onClick={() => { const next = detalle.subtareas.map((x, j) => j === i ? { ...x, done: !x.done } : x); updateRow(detalle.id, { subtareas: next }); }}
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${s.done ? 'bg-emerald-600 border-emerald-600' : 'border-gray-600'}`}>
                      {s.done && <Check size={11} className="text-white" />}
                    </button>
                    <input defaultValue={s.t} onBlur={e => { const next = detalle.subtareas.map((x, j) => j === i ? { ...x, t: e.target.value } : x); updateRow(detalle.id, { subtareas: next }); }}
                      className={`flex-1 bg-transparent text-sm focus:outline-none ${s.done ? 'line-through text-gray-500' : 'text-gray-200'}`} />
                    <button onClick={() => updateRow(detalle.id, { subtareas: detalle.subtareas.filter((_, j) => j !== i) })} className="text-gray-700 hover:text-red-400"><X size={13} /></button>
                  </div>
                ))}
              </div>
              <button onClick={() => updateRow(detalle.id, { subtareas: [...(detalle.subtareas || []), { t: '', done: false }] })}
                className="mt-2 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"><Plus size={12} /> Agregar subtarea</button>
            </div>

            {/* Acciones: duplicar / mover */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-800">
              <button onClick={() => duplicarRow(detalle)} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800"><Copy size={13} /> Duplicar</button>
              {tablas.length > 1 && (
                <span className="flex items-center gap-1.5 text-xs text-gray-400">
                  Mover a:
                  <select defaultValue="" onChange={e => e.target.value && moverRow(detalle, e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none">
                    <option value="" disabled>elige tabla…</option>
                    {tablas.filter(t => t.id !== detalle.tabla_id).map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </span>
              )}
              <span className="ml-auto text-[11px] text-gray-600">Editado: {detalle.updated_at ? new Date(detalle.updated_at).toLocaleString('es-PE') : '—'}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
