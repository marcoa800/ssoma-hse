// ════════════════════════════════════════════════════════════════════
//  Investigaciones — Investigación de accidentes / incidentes (SST)
//  Tabla `investigaciones`. CRUD + KPIs + medidas correctivas + export.
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
  Plus, Pencil, Trash2, Search, FileDown, ExternalLink, AlertTriangle, X,
} from 'lucide-react';

// ── Constantes ──
const TIPOS = ['Accidente de trabajo', 'Incidente peligroso', 'Enfermedad ocupacional', 'Incidente'];
const ESTADOS = ['Abierta', 'En proceso', 'Cerrada'];
const ESTADO_MEDIDA = ['Pendiente', 'En proceso', 'Hecha'];

// Mapa ESTÁTICO de color de Badge por estado (sin interpolación dinámica de Tailwind)
const ESTADO_BADGE = {
  'Abierta': 'amber',
  'En proceso': 'blue',
  'Cerrada': 'emerald',
};

const hoyISO = () => new Date().toISOString().split('T')[0];
const fmtFecha = (f) => (f ? new Date(f + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');

const initForm = {
  fecha_evento: hoyISO(),
  afectado: '',
  tipo: 'Accidente de trabajo',
  estado: 'Abierta',
  responsable: '',
  descripcion: '',
  causas_inmediatas: '',
  causas_basicas: '',
  evidencia_url: '',
  medidas: [],
};

// estilo común de <select> nativo (igual a los demás módulos)
const selCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors';

export default function Investigaciones({ empresaId, empresa }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [fEstado, setFEstado] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initForm);

  // ── Cargar ──
  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('investigaciones')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('fecha_evento', { ascending: false });
    if (error) showToast('Error al cargar: ' + error.message, 'error');
    setItems(data || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  // ── KPIs ──
  const total = items.length;
  const abiertas = items.filter(i => i.estado === 'Abierta').length;
  const enProceso = items.filter(i => i.estado === 'En proceso').length;
  const cerradas = items.filter(i => i.estado === 'Cerrada').length;

  // ── Filtrado ──
  const filtered = items.filter(i => {
    if (fEstado && i.estado !== fEstado) return false;
    const t = search.trim().toLowerCase();
    if (t && !(`${i.afectado || ''} ${i.tipo || ''} ${i.responsable || ''} ${i.descripcion || ''}`.toLowerCase().includes(t))) return false;
    return true;
  });

  // ── Helpers de medidas ──
  const resumenMedidas = (medidas) => {
    const arr = Array.isArray(medidas) ? medidas : [];
    if (!arr.length) return '—';
    const hechas = arr.filter(m => m.estado === 'Hecha').length;
    return `${hechas}/${arr.length} hechas`;
  };

  // ── Abrir modal ──
  const abrirNuevo = () => {
    setForm({ ...initForm });
    setEditing(null);
    setShowModal(true);
  };
  const abrirEditar = (it) => {
    setForm({
      ...initForm,
      ...it,
      fecha_evento: it.fecha_evento || '',
      afectado: it.afectado || '',
      tipo: it.tipo || TIPOS[0],
      estado: it.estado || ESTADOS[0],
      responsable: it.responsable || '',
      descripcion: it.descripcion || '',
      causas_inmediatas: it.causas_inmediatas || '',
      causas_basicas: it.causas_basicas || '',
      evidencia_url: it.evidencia_url || '',
      medidas: Array.isArray(it.medidas) ? it.medidas : [],
    });
    setEditing(it);
    setShowModal(true);
  };

  // ── Repetidor de medidas ──
  const addMedida = () => setForm(f => ({
    ...f,
    medidas: [...(f.medidas || []), { accion: '', responsable: '', fecha_limite: '', estado: 'Pendiente' }],
  }));
  const updateMedida = (idx, patch) => setForm(f => ({
    ...f,
    medidas: (f.medidas || []).map((m, i) => (i === idx ? { ...m, ...patch } : m)),
  }));
  const removeMedida = (idx) => setForm(f => ({
    ...f,
    medidas: (f.medidas || []).filter((_, i) => i !== idx),
  }));

  // ── Guardar ──
  const guardar = async () => {
    if (!form.afectado.trim()) { showToast('Indica el trabajador/área afectada', 'error'); return; }
    if (!form.fecha_evento) { showToast('Indica la fecha del evento', 'error'); return; }
    setSaving(true);
    const medidasLimpias = (form.medidas || [])
      .filter(m => (m.accion || '').trim() || (m.responsable || '').trim())
      .map(m => ({
        accion: m.accion || '',
        responsable: m.responsable || '',
        fecha_limite: m.fecha_limite || '',
        estado: m.estado || 'Pendiente',
      }));
    const payload = {
      empresa_id: empresaId,
      fecha_evento: form.fecha_evento || null,
      afectado: form.afectado.trim(),
      tipo: form.tipo,
      descripcion: form.descripcion || null,
      causas_inmediatas: form.causas_inmediatas || null,
      causas_basicas: form.causas_basicas || null,
      medidas: medidasLimpias,
      evidencia_url: form.evidencia_url || null,
      estado: form.estado,
      responsable: form.responsable || null,
    };
    const { error } = editing
      ? await supabase.from('investigaciones').update(payload).eq('id', editing.id)
      : await supabase.from('investigaciones').insert(payload);
    if (error) {
      showToast('Error: ' + error.message, 'error');
    } else {
      showToast(editing ? 'Investigación actualizada' : 'Investigación registrada', 'success');
      setShowModal(false);
      load();
    }
    setSaving(false);
  };

  // ── Eliminar ──
  const eliminar = async (id) => {
    if (!confirm('¿Eliminar esta investigación?')) return;
    const { error } = await supabase.from('investigaciones').delete().eq('id', id);
    if (error) { showToast('Error: ' + error.message, 'error'); return; }
    showToast('Investigación eliminada', 'info');
    load();
  };

  // ── Exportar Excel ──
  const exportar = () => {
    if (!items.length) { showToast('Sin investigaciones para exportar', 'info'); return; }
    const rows = items.map(i => ({
      'Fecha evento': i.fecha_evento || '',
      'Afectado': i.afectado || '',
      'Tipo': i.tipo || '',
      'Estado': i.estado || '',
      'Responsable': i.responsable || '',
      'Descripción': i.descripcion || '',
      'Causas inmediatas': i.causas_inmediatas || '',
      'Causas básicas': i.causas_basicas || '',
      'Medidas (avance)': resumenMedidas(i.medidas),
      'Medidas (detalle)': (Array.isArray(i.medidas) ? i.medidas : [])
        .map(m => `${m.accion || ''} [${m.estado || ''}${m.responsable ? ' · ' + m.responsable : ''}${m.fecha_limite ? ' · ' + m.fecha_limite : ''}]`)
        .join(' | '),
      'Evidencia (URL)': i.evidencia_url || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 13 }, { wch: 28 }, { wch: 24 }, { wch: 12 }, { wch: 22 },
      { wch: 40 }, { wch: 30 }, { wch: 30 }, { wch: 14 }, { wch: 50 }, { wch: 30 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Investigaciones');
    XLSX.writeFile(wb, `investigaciones_${hoyISO()}.xlsx`);
    showToast('Exportado', 'success');
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-600 text-sm">Cargando investigaciones…</div>;

  return (
    <div>
      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-2xl font-bold text-white">{total}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
          <div className="text-xs text-gray-500">Abiertas</div>
          <div className="text-2xl font-bold text-amber-400">{abiertas}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
          <div className="text-xs text-gray-500">En proceso</div>
          <div className="text-2xl font-bold text-blue-400">{enProceso}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
          <div className="text-xs text-gray-500">Cerradas</div>
          <div className="text-2xl font-bold text-emerald-400">{cerradas}</div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar afectado, tipo, responsable…"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select value={fEstado} onChange={e => setFEstado(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500">
          <option value="">Estado: todos</option>
          {ESTADOS.map(s => <option key={s}>{s}</option>)}
        </select>
        <Btn size="sm" variant="ghost" onClick={exportar}><FileDown size={14} /> Excel</Btn>
        <Btn size="sm" variant="primary" onClick={abrirNuevo}><Plus size={14} /> Nueva investigación</Btn>
      </div>

      {/* ── Tabla (escritorio) ── */}
      <div className="hidden md:block bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {['Fecha', 'Afectado', 'Tipo', 'Estado', 'Responsable', 'Medidas', ''].map((h, i) => (
                <th key={i} className="text-left text-xs text-gray-600 font-medium px-3 py-2.5 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(i => (
              <tr key={i.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                <td className="px-3 py-2.5 text-xs text-gray-400 font-mono whitespace-nowrap">{fmtFecha(i.fecha_evento)}</td>
                <td className="px-3 py-2.5 text-gray-200 font-medium">{i.afectado || '—'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-400">{i.tipo || '—'}</td>
                <td className="px-3 py-2.5"><Badge color={ESTADO_BADGE[i.estado] || 'gray'}>{i.estado || '—'}</Badge></td>
                <td className="px-3 py-2.5 text-xs text-gray-400">{i.responsable || '—'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{resumenMedidas(i.medidas)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <div className="flex gap-1 justify-end">
                    {i.evidencia_url && (
                      <a href={i.evidencia_url} target="_blank" rel="noreferrer" title="Abrir evidencia" className="text-gray-500 hover:text-blue-400 p-1"><ExternalLink size={14} /></a>
                    )}
                    <button onClick={() => abrirEditar(i)} title="Ver / Editar" className="text-gray-500 hover:text-blue-400 p-1"><Pencil size={14} /></button>
                    {puedeEliminar() && (
                      <button onClick={() => eliminar(i.id)} title="Eliminar" className="text-red-500/50 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-gray-600 text-sm">{items.length ? 'Ninguna investigación coincide con los filtros.' : 'Aún no hay investigaciones. Usa "Nueva investigación".'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Tarjetas (móvil) ── */}
      <div className="md:hidden space-y-2.5">
        {filtered.map(i => (
          <div key={i.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3.5">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="min-w-0">
                <div className="font-semibold text-white text-sm leading-tight">{i.afectado || '—'}</div>
                <div className="text-xs text-gray-500 font-mono mt-0.5">{fmtFecha(i.fecha_evento)}</div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                {i.evidencia_url && (
                  <a href={i.evidencia_url} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-blue-400 p-1"><ExternalLink size={15} /></a>
                )}
                <button onClick={() => abrirEditar(i)} className="text-gray-500 hover:text-blue-400 p-1"><Pencil size={15} /></button>
                {puedeEliminar() && (
                  <button onClick={() => eliminar(i.id)} className="text-red-500/50 hover:text-red-400 p-1"><Trash2 size={15} /></button>
                )}
              </div>
            </div>
            <div className="text-xs text-gray-400 mb-2">{i.tipo || '—'}{i.responsable ? ` · ${i.responsable}` : ''}</div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge color={ESTADO_BADGE[i.estado] || 'gray'}>{i.estado || '—'}</Badge>
              <span className="text-xs text-gray-500">{resumenMedidas(i.medidas)}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-gray-600 text-sm py-8 bg-gray-900 border border-gray-800 rounded-xl">{items.length ? 'Ninguna investigación coincide con los filtros.' : 'Aún no hay investigaciones. Usa "Nueva investigación".'}</div>
        )}
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <Modal title={editing ? 'Investigación de accidente / incidente' : 'Nueva investigación'} onClose={() => setShowModal(false)} wide>
          <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
            {/* Datos generales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Fecha del evento *">
                <Input type="date" value={form.fecha_evento} onChange={e => setForm(f => ({ ...f, fecha_evento: e.target.value }))} />
              </FormField>
              <FormField label="Trabajador / área afectada *">
                <Input value={form.afectado} onChange={e => setForm(f => ({ ...f, afectado: e.target.value }))} placeholder="Nombre del trabajador o área" />
              </FormField>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Tipo">
                <select className={selCls} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  {TIPOS.map(t => <option key={t}>{t}</option>)}
                </select>
              </FormField>
              <FormField label="Estado">
                <select className={selCls} value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                  {ESTADOS.map(s => <option key={s}>{s}</option>)}
                </select>
              </FormField>
              <FormField label="Responsable">
                <Input value={form.responsable} onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))} placeholder="Responsable de la investigación" />
              </FormField>
            </div>

            {/* Descripción y causas */}
            <FormField label="Descripción del evento">
              <textarea
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                rows={3}
                placeholder="¿Qué ocurrió? Secuencia de los hechos…"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors resize-y"
              />
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Causas inmediatas">
                <textarea
                  value={form.causas_inmediatas}
                  onChange={e => setForm(f => ({ ...f, causas_inmediatas: e.target.value }))}
                  rows={3}
                  placeholder="Actos y condiciones subestándar…"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors resize-y"
                />
              </FormField>
              <FormField label="Causas básicas">
                <textarea
                  value={form.causas_basicas}
                  onChange={e => setForm(f => ({ ...f, causas_basicas: e.target.value }))}
                  rows={3}
                  placeholder="Factores personales y del trabajo…"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors resize-y"
                />
              </FormField>
            </div>

            <FormField label="Evidencia / informe (URL)">
              <Input value={form.evidencia_url} onChange={e => setForm(f => ({ ...f, evidencia_url: e.target.value }))} placeholder="https://… (Drive, PDF del informe, fotos)" />
            </FormField>

            {/* ── Medidas correctivas ── */}
            <div className="border-t border-gray-800 pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <AlertTriangle size={12} /> Medidas correctivas
                </p>
                <Btn size="sm" variant="ghost" onClick={addMedida}><Plus size={13} /> Agregar medida</Btn>
              </div>
              <div className="space-y-2">
                {(form.medidas || []).map((m, idx) => (
                  <div key={idx} className="bg-gray-800/40 border border-gray-800 rounded-lg p-2.5">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <input
                          value={m.accion || ''}
                          onChange={e => updateMedida(idx, { accion: e.target.value })}
                          placeholder="Acción correctiva"
                          className="sm:col-span-5 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                        />
                        <input
                          value={m.responsable || ''}
                          onChange={e => updateMedida(idx, { responsable: e.target.value })}
                          placeholder="Responsable"
                          className="sm:col-span-3 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                        />
                        <input
                          type="date"
                          value={m.fecha_limite || ''}
                          onChange={e => updateMedida(idx, { fecha_limite: e.target.value })}
                          className="sm:col-span-2 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
                        />
                        <select
                          value={m.estado || 'Pendiente'}
                          onChange={e => updateMedida(idx, { estado: e.target.value })}
                          className="sm:col-span-2 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
                        >
                          {ESTADO_MEDIDA.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                      <button onClick={() => removeMedida(idx)} title="Quitar medida" className="text-gray-600 hover:text-red-400 p-1 shrink-0"><X size={15} /></button>
                    </div>
                  </div>
                ))}
                {(!form.medidas || form.medidas.length === 0) && (
                  <p className="text-xs text-gray-600 text-center py-3">Sin medidas correctivas. Usa "Agregar medida".</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-800 mt-3">
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Btn>
            <Btn variant="primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando…' : 'Guardar investigación'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
