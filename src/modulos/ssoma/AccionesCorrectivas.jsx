// ════════════════════════════════════════════════════════════════════
//  AccionesCorrectivas — Acciones Correctivas / No Conformidades (SST)
//  KPIs, filtros, lista (tabla escritorio + tarjetas móvil), CRUD,
//  exportación Excel. Tabla supabase: acciones_correctivas.
// ════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase, puedeEliminar } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Btn } from '../../components/ui/Btn.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import {
  Plus, Pencil, Trash2, FileDown, ExternalLink,
  AlertTriangle, Clock, CheckCircle,
} from 'lucide-react';

// ── Constantes / mapas estáticos de color (NO interpolación dinámica) ──
const ORIGENES = [
  'Auditoría', 'Inspección', 'Accidente/Incidente',
  'Observación', 'No conformidad', 'Otro',
];
const ESTADOS = ['Abierta', 'En proceso', 'Cerrada'];

// Badge usa su propio prop `color` (mapa estático interno)
const ESTADO_BADGE = {
  'Abierta':    'amber',
  'En proceso': 'blue',
  'Cerrada':    'emerald',
};
const ORIGEN_BADGE = {
  'Auditoría':           'blue',
  'Inspección':          'purple',
  'Accidente/Incidente': 'red',
  'Observación':         'amber',
  'No conformidad':      'orange',
  'Otro':                'gray',
};

const hoyISO = () => new Date().toISOString().split('T')[0];
const fmt = (f) => (f ? new Date(f + 'T00:00:00').toLocaleDateString('es-PE') : '—');

// Días hasta la fecha límite (negativo = vencida)
function diasLimite(f) {
  if (!f) return null;
  return Math.round((new Date(f + 'T00:00:00') - new Date(hoyISO() + 'T00:00:00')) / 86400000);
}
const esVencida = (a) => a.estado !== 'Cerrada' && a.fecha_limite && diasLimite(a.fecha_limite) < 0;
const porVencer = (a) => {
  if (a.estado === 'Cerrada' || !a.fecha_limite) return false;
  const d = diasLimite(a.fecha_limite);
  return d !== null && d >= 0 && d <= 7;
};

const initForm = {
  origen: 'No conformidad',
  descripcion: '',
  accion: '',
  responsable: '',
  fecha_deteccion: '',
  fecha_limite: '',
  estado: 'Abierta',
  evidencia_url: '',
};

export default function AccionesCorrectivas({ empresaId, empresa }) {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [fEstado, setFEstado] = useState('');
  const [fOrigen, setFOrigen] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initForm);

  // ── Carga ──
  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('acciones_correctivas')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('fecha_limite', { ascending: true, nullsFirst: false });
    if (error) showToast('Error al cargar: ' + error.message, 'error');
    setItems(data || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  // ── CRUD ──
  const abrirNueva = () => { setForm(initForm); setEditing(null); setShowModal(true); };
  const abrirEditar = (a) => {
    setForm({
      origen: a.origen || 'No conformidad',
      descripcion: a.descripcion || '',
      accion: a.accion || '',
      responsable: a.responsable || '',
      fecha_deteccion: a.fecha_deteccion || '',
      fecha_limite: a.fecha_limite || '',
      estado: a.estado || 'Abierta',
      evidencia_url: a.evidencia_url || '',
    });
    setEditing(a);
    setShowModal(true);
  };

  const guardar = async () => {
    if (!form.descripcion.trim()) { showToast('La descripción es obligatoria', 'error'); return; }
    setSaving(true);
    const payload = {
      empresa_id: empresaId,
      origen: form.origen,
      descripcion: form.descripcion.trim(),
      accion: form.accion.trim() || null,
      responsable: form.responsable.trim() || null,
      fecha_deteccion: form.fecha_deteccion || null,
      fecha_limite: form.fecha_limite || null,
      estado: form.estado,
      evidencia_url: form.evidencia_url.trim() || null,
    };
    const { error } = editing
      ? await supabase.from('acciones_correctivas').update(payload).eq('id', editing.id)
      : await supabase.from('acciones_correctivas').insert(payload);
    if (error) { showToast('Error: ' + error.message, 'error'); }
    else {
      showToast(editing ? 'Acción actualizada' : 'Acción registrada', 'success');
      setShowModal(false);
      load();
    }
    setSaving(false);
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar esta acción correctiva?')) return;
    const { error } = await supabase.from('acciones_correctivas').delete().eq('id', id);
    if (error) { showToast('Error: ' + error.message, 'error'); return; }
    showToast('Acción eliminada', 'info');
    load();
  };

  // ── Derivados ──
  const filtered = items.filter((a) => {
    if (fEstado && a.estado !== fEstado) return false;
    if (fOrigen && a.origen !== fOrigen) return false;
    if (search) {
      const t = search.toLowerCase();
      if (!(`${a.descripcion || ''} ${a.responsable || ''}`.toLowerCase().includes(t))) return false;
    }
    return true;
  });

  const kAbiertas  = items.filter((a) => a.estado === 'Abierta').length;
  const kProceso   = items.filter((a) => a.estado === 'En proceso').length;
  const kVencidas  = items.filter(esVencida).length;
  const kCerradas  = items.filter((a) => a.estado === 'Cerrada').length;

  // ── Exportar Excel ──
  const exportar = () => {
    if (!items.length) { showToast('Sin acciones para exportar', 'info'); return; }
    const rows = items.map((a) => ({
      'Origen': a.origen || '',
      'No conformidad / Hallazgo': a.descripcion || '',
      'Acción correctiva': a.accion || '',
      'Responsable': a.responsable || '',
      'Fecha detección': a.fecha_deteccion || '',
      'Fecha límite': a.fecha_limite || '',
      'Estado': a.estado || '',
      'Vencida': esVencida(a) ? 'Sí' : 'No',
      'Evidencia (URL)': a.evidencia_url || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 20 }, { wch: 45 }, { wch: 45 }, { wch: 22 },
      { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 9 }, { wch: 35 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Acciones Correctivas');
    XLSX.writeFile(wb, `acciones_correctivas_${hoyISO()}.xlsx`);
    showToast('Excel generado', 'success');
  };

  // ── Sub-componente: celda de fecha límite resaltada ──
  const FechaLimite = ({ a }) => {
    if (!a.fecha_limite) return <span className="text-gray-600">—</span>;
    const cls = esVencida(a) ? 'text-red-400 font-semibold'
      : porVencer(a) ? 'text-amber-400 font-medium'
      : 'text-gray-400';
    const d = diasLimite(a.fecha_limite);
    const nota = esVencida(a) ? `Vencida ${Math.abs(d)}d`
      : porVencer(a) ? (d === 0 ? 'Vence hoy' : `Vence en ${d}d`)
      : '';
    return (
      <span className={`font-mono text-xs ${cls}`}>
        {fmt(a.fecha_limite)}
        {nota && <span className="block text-[10px]">{nota}</span>}
      </span>
    );
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-600 text-sm">Cargando…</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-white font-bold text-base">Acciones Correctivas / No Conformidades</h3>
          <p className="text-xs text-gray-500 mt-0.5">{empresa?.nombre || ''} · {items.length} registro(s)</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Btn size="sm" variant="ghost" onClick={exportar}><FileDown size={13} /> Excel</Btn>
          <Btn size="sm" variant="primary" onClick={abrirNueva}><Plus size={13} /> Nueva acción</Btn>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5">
          <div className="text-xs text-gray-500 flex items-center gap-1"><AlertTriangle size={12} /> Abiertas</div>
          <div className="text-xl font-bold text-amber-400">{kAbiertas}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5">
          <div className="text-xs text-gray-500 flex items-center gap-1"><Clock size={12} /> En proceso</div>
          <div className="text-xl font-bold text-blue-400">{kProceso}</div>
        </div>
        <div className={`rounded-xl px-3 py-2.5 border ${kVencidas ? 'bg-red-900/20 border-red-900/50' : 'bg-gray-900 border-gray-800'}`}>
          <div className="text-xs text-gray-500 flex items-center gap-1"><AlertTriangle size={12} /> Vencidas</div>
          <div className={`text-xl font-bold ${kVencidas ? 'text-red-400' : 'text-white'}`}>{kVencidas}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5">
          <div className="text-xs text-gray-500 flex items-center gap-1"><CheckCircle size={12} /> Cerradas</div>
          <div className="text-xl font-bold text-emerald-400">{kCerradas}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar descripción o responsable…"
          className="flex-1 min-w-[160px] bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
        />
        <select value={fEstado} onChange={(e) => setFEstado(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500">
          <option value="">Estado: todos</option>
          {ESTADOS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={fOrigen} onChange={(e) => setFOrigen(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500">
          <option value="">Origen: todos</option>
          {ORIGENES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* ── Tabla escritorio ── */}
      <div className="hidden md:block bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {['Origen', 'No conformidad / Hallazgo', 'Responsable', 'Fecha límite', 'Estado', ''].map((h, i) => (
                <th key={i} className="text-left text-xs text-gray-600 font-medium px-3 py-2.5 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                <td className="px-3 py-2.5"><Badge color={ORIGEN_BADGE[a.origen] || 'gray'}>{a.origen || '—'}</Badge></td>
                <td className="px-3 py-2.5 max-w-[360px]">
                  <div className="text-gray-200 text-sm truncate" title={a.descripcion}>{a.descripcion}</div>
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">{a.responsable || '—'}</td>
                <td className="px-3 py-2.5 whitespace-nowrap"><FechaLimite a={a} /></td>
                <td className="px-3 py-2.5"><Badge color={ESTADO_BADGE[a.estado] || 'gray'}>{a.estado}</Badge></td>
                <td className="px-2 py-2.5 whitespace-nowrap">
                  <div className="flex gap-1 items-center">
                    {a.evidencia_url && (
                      <a href={a.evidencia_url} target="_blank" rel="noreferrer" title="Ver evidencia" className="text-gray-500 hover:text-blue-400 p-1"><ExternalLink size={14} /></a>
                    )}
                    <button onClick={() => abrirEditar(a)} title="Editar" className="text-gray-500 hover:text-blue-400 p-1"><Pencil size={14} /></button>
                    {puedeEliminar() && (
                      <button onClick={() => eliminar(a.id)} title="Eliminar" className="text-red-500/50 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-gray-600 text-sm">{items.length ? 'Ninguna acción coincide con los filtros.' : 'Sin acciones registradas. Usa "Nueva acción".'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Tarjetas móvil ── */}
      <div className="md:hidden space-y-2.5">
        {filtered.map((a) => (
          <div key={a.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3.5">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex flex-wrap gap-1.5">
                <Badge color={ORIGEN_BADGE[a.origen] || 'gray'}>{a.origen || '—'}</Badge>
                <Badge color={ESTADO_BADGE[a.estado] || 'gray'}>{a.estado}</Badge>
              </div>
              <div className="flex gap-1 shrink-0">
                {a.evidencia_url && (
                  <a href={a.evidencia_url} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-blue-400 p-1"><ExternalLink size={15} /></a>
                )}
                <button onClick={() => abrirEditar(a)} className="text-gray-500 hover:text-blue-400 p-1"><Pencil size={15} /></button>
                {puedeEliminar() && (
                  <button onClick={() => eliminar(a.id)} className="text-red-500/50 hover:text-red-400 p-1"><Trash2 size={15} /></button>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-200 mb-1.5">{a.descripcion}</p>
            {a.accion && <p className="text-xs text-gray-500 mb-2">→ {a.accion}</p>}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-t border-gray-800 pt-2">
              <span className="text-gray-500">{a.responsable || 'Sin responsable'}</span>
              <FechaLimite a={a} />
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-gray-600 text-sm py-8 bg-gray-900 border border-gray-800 rounded-xl">{items.length ? 'Ninguna acción coincide con los filtros.' : 'Sin acciones registradas. Usa "Nueva acción".'}</div>
        )}
      </div>

      {/* ── Modal alta / edición ── */}
      {showModal && (
        <Modal title={editing ? 'Editar acción correctiva' : 'Nueva acción correctiva'} onClose={() => setShowModal(false)} wide>
          <div className="space-y-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
              <FormField label="Origen">
                <select value={form.origen} onChange={(e) => setForm((f) => ({ ...f, origen: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                  {ORIGENES.map((o) => <option key={o}>{o}</option>)}
                </select>
              </FormField>
              <FormField label="Estado">
                <select value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                  {ESTADOS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </FormField>
            </div>

            <FormField label="No conformidad / Hallazgo *">
              <textarea value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} rows={3} placeholder="Describe la no conformidad o hallazgo detectado…" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-y" />
            </FormField>

            <FormField label="Acción correctiva propuesta">
              <textarea value={form.accion} onChange={(e) => setForm((f) => ({ ...f, accion: e.target.value }))} rows={3} placeholder="Describe la acción correctiva a implementar…" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-y" />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3">
              <FormField label="Responsable">
                <Input value={form.responsable} onChange={(e) => setForm((f) => ({ ...f, responsable: e.target.value }))} placeholder="Nombre del responsable" />
              </FormField>
              <FormField label="Fecha de detección">
                <Input type="date" value={form.fecha_deteccion} onChange={(e) => setForm((f) => ({ ...f, fecha_deteccion: e.target.value }))} />
              </FormField>
              <FormField label="Fecha límite">
                <Input type="date" value={form.fecha_limite} onChange={(e) => setForm((f) => ({ ...f, fecha_limite: e.target.value }))} />
              </FormField>
            </div>

            <FormField label="Evidencia de cierre (URL)">
              <Input value={form.evidencia_url} onChange={(e) => setForm((f) => ({ ...f, evidencia_url: e.target.value }))} placeholder="https://… (Drive, foto, documento)" />
            </FormField>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-800 mt-3">
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Btn>
            <Btn variant="primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
