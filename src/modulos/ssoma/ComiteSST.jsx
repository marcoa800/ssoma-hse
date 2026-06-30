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
  Plus, Pencil, Trash2, Users, Calendar, FileDown, ExternalLink, ClipboardList,
} from 'lucide-react';

// ── Catálogos estáticos (evitar clases Tailwind dinámicas) ──
const CARGOS = ['Presidente', 'Secretario', 'Miembro titular', 'Miembro suplente'];
const REPRESENTA = ['Empleador', 'Trabajadores'];
const REP_COLOR = { Empleador: 'blue', Trabajadores: 'green' }; // Badge: green = emerald
const TIPOS_REUNION = ['Ordinaria', 'Extraordinaria'];

const hoyISO = () => new Date().toISOString().split('T')[0];
const fmtFecha = (f) => {
  if (!f) return '—';
  const d = new Date(f + 'T00:00:00');
  return isNaN(d) ? f : d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function ComiteSST({ empresaId, empresa }) {
  const [vista, setVista] = useState('miembros'); // miembros | reuniones
  const [miembros, setMiembros] = useState([]);
  const [reuniones, setReuniones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Modales ──
  const initM = { nombre: '', cargo: 'Miembro titular', representa: 'Trabajadores', periodo: '', activo: true };
  const initR = { fecha: hoyISO(), tipo: 'Ordinaria', temas: '', acuerdos: '', asistentes: '', acta_url: '' };
  const [showModalM, setShowModalM] = useState(false);
  const [editingM, setEditingM] = useState(null);
  const [formM, setFormM] = useState(initM);
  const [showModalR, setShowModalR] = useState(false);
  const [editingR, setEditingR] = useState(null);
  const [formR, setFormR] = useState(initR);

  // ── Carga ──
  const load = async () => {
    setLoading(true);
    const [{ data: ms }, { data: rs }] = await Promise.all([
      supabase.from('comite_miembros').select('*').eq('empresa_id', empresaId).order('created_at'),
      supabase.from('comite_reuniones').select('*').eq('empresa_id', empresaId).order('fecha', { ascending: false }),
    ]);
    setMiembros(ms || []);
    setReuniones(rs || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  // ── CRUD miembros ──
  const openNuevoMiembro = () => { setFormM(initM); setEditingM(null); setShowModalM(true); };
  const openEditarMiembro = (m) => {
    setFormM({ nombre: m.nombre || '', cargo: m.cargo || 'Miembro titular', representa: m.representa || 'Trabajadores', periodo: m.periodo || '', activo: m.activo !== false });
    setEditingM(m); setShowModalM(true);
  };
  const saveMiembro = async () => {
    if (!formM.nombre.trim()) { showToast('El nombre es obligatorio', 'error'); return; }
    setSaving(true);
    const payload = { ...formM, nombre: formM.nombre.trim(), empresa_id: empresaId };
    const { error } = editingM
      ? await supabase.from('comite_miembros').update(payload).eq('id', editingM.id)
      : await supabase.from('comite_miembros').insert(payload);
    if (error) { showToast('Error: ' + error.message, 'error'); }
    else { showToast(editingM ? 'Miembro actualizado' : 'Miembro agregado', 'success'); setShowModalM(false); load(); }
    setSaving(false);
  };
  const deleteMiembro = async (id) => {
    if (!confirm('¿Eliminar este miembro del comité?')) return;
    const { error } = await supabase.from('comite_miembros').delete().eq('id', id);
    if (error) { showToast('Error: ' + error.message, 'error'); }
    else { showToast('Miembro eliminado', 'info'); load(); }
  };

  // ── CRUD reuniones ──
  const openNuevaReunion = () => { setFormR(initR); setEditingR(null); setShowModalR(true); };
  const openEditarReunion = (r) => {
    setFormR({ fecha: r.fecha || hoyISO(), tipo: r.tipo || 'Ordinaria', temas: r.temas || '', acuerdos: r.acuerdos || '', asistentes: r.asistentes || '', acta_url: r.acta_url || '' });
    setEditingR(r); setShowModalR(true);
  };
  const saveReunion = async () => {
    if (!formR.fecha) { showToast('La fecha es obligatoria', 'error'); return; }
    setSaving(true);
    const payload = { ...formR, empresa_id: empresaId, acta_url: formR.acta_url.trim() || null };
    const { error } = editingR
      ? await supabase.from('comite_reuniones').update(payload).eq('id', editingR.id)
      : await supabase.from('comite_reuniones').insert(payload);
    if (error) { showToast('Error: ' + error.message, 'error'); }
    else { showToast(editingR ? 'Reunión actualizada' : 'Reunión registrada', 'success'); setShowModalR(false); load(); }
    setSaving(false);
  };
  const deleteReunion = async (id) => {
    if (!confirm('¿Eliminar esta reunión del libro de actas?')) return;
    const { error } = await supabase.from('comite_reuniones').delete().eq('id', id);
    if (error) { showToast('Error: ' + error.message, 'error'); }
    else { showToast('Reunión eliminada', 'info'); load(); }
  };

  // ── Exportar ──
  const exportar = () => {
    let rows = [];
    if (vista === 'miembros') {
      if (!miembros.length) { showToast('Sin miembros para exportar', 'info'); return; }
      rows = miembros.map(m => ({
        Nombre: m.nombre || '',
        Cargo: m.cargo || '',
        Representa: m.representa || '',
        Periodo: m.periodo || '',
        Estado: m.activo === false ? 'Inactivo' : 'Activo',
      }));
    } else {
      if (!reuniones.length) { showToast('Sin reuniones para exportar', 'info'); return; }
      rows = reuniones.map(r => ({
        Fecha: r.fecha || '',
        Tipo: r.tipo || '',
        Temas: r.temas || '',
        Acuerdos: r.acuerdos || '',
        Asistentes: r.asistentes || '',
        'Acta (URL)': r.acta_url || '',
      }));
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, vista === 'miembros' ? 'Miembros' : 'Reuniones');
    XLSX.writeFile(wb, `comite_${vista}_${hoyISO()}.xlsx`);
    showToast('Exportado', 'success');
  };

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors';

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-600 text-sm">Cargando…</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div className="min-w-0">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <Users size={18} className="text-blue-400 shrink-0" />
            Comité de Seguridad y Salud en el Trabajo
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Conformación del comité y libro de actas de reuniones{empresa?.nombre ? ` · ${empresa.nombre}` : ''}
          </p>
        </div>
        <Btn size="sm" variant="success" onClick={exportar}><FileDown size={14} /> Exportar Excel</Btn>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-900 border border-gray-800 rounded-xl p-1 max-w-md">
        {[['miembros', 'Miembros', Users], ['reuniones', 'Reuniones (actas)', ClipboardList]].map(([tab, label, Icon]) => (
          <button
            key={tab}
            onClick={() => setVista(tab)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${vista === tab ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-200'}`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* ════════ PESTAÑA MIEMBROS ════════ */}
      {vista === 'miembros' && (
        <div>
          <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
            <p className="text-xs text-gray-500">{miembros.length} miembro(s) registrado(s)</p>
            <Btn size="sm" variant="primary" onClick={openNuevoMiembro}><Plus size={13} /> Agregar miembro</Btn>
          </div>

          {/* Tarjetas (móvil) */}
          <div className="md:hidden space-y-2.5">
            {miembros.map(m => (
              <div key={m.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-white text-sm leading-tight">{m.nombre}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{m.cargo || '—'}{m.periodo ? ` · ${m.periodo}` : ''}</div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => openEditarMiembro(m)} className="text-gray-500 hover:text-blue-400 p-1"><Pencil size={15} /></button>
                    {puedeEliminar() && (
                      <button onClick={() => deleteMiembro(m.id)} className="text-red-500/60 hover:text-red-400 p-1"><Trash2 size={15} /></button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge color={REP_COLOR[m.representa] || 'gray'}>{m.representa || '—'}</Badge>
                  <Badge color={m.activo === false ? 'gray' : 'green'}>{m.activo === false ? 'Inactivo' : 'Activo'}</Badge>
                </div>
              </div>
            ))}
            {!miembros.length && <div className="text-center text-gray-600 text-sm py-8 bg-gray-900 border border-gray-800 rounded-xl">Sin miembros registrados. Usa "Agregar miembro".</div>}
          </div>

          {/* Tabla (escritorio) */}
          <div className="hidden md:block bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Nombre', 'Cargo', 'Representa', 'Periodo', 'Estado', ''].map((h, i) => (
                    <th key={i} className="text-left text-xs text-gray-600 font-medium px-3 py-2.5 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {miembros.map(m => (
                  <tr key={m.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 group">
                    <td className="px-3 py-2.5 text-gray-200 font-medium whitespace-nowrap">{m.nombre}</td>
                    <td className="px-3 py-2.5 text-gray-400">{m.cargo || '—'}</td>
                    <td className="px-3 py-2.5"><Badge color={REP_COLOR[m.representa] || 'gray'}>{m.representa || '—'}</Badge></td>
                    <td className="px-3 py-2.5 text-gray-500 font-mono text-xs">{m.periodo || '—'}</td>
                    <td className="px-3 py-2.5"><Badge color={m.activo === false ? 'gray' : 'green'}>{m.activo === false ? 'Inactivo' : 'Activo'}</Badge></td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex gap-1">
                        <button onClick={() => openEditarMiembro(m)} className="text-gray-500 hover:text-blue-400 transition-colors p-1"><Pencil size={13} /></button>
                        {puedeEliminar() && (
                          <button onClick={() => deleteMiembro(m.id)} className="text-red-500/40 hover:text-red-400 transition-colors p-1"><Trash2 size={13} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!miembros.length && (
                  <tr><td colSpan={6} className="px-3 py-10 text-center text-gray-600 text-sm">Sin miembros registrados. Usa "Agregar miembro".</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════ PESTAÑA REUNIONES ════════ */}
      {vista === 'reuniones' && (
        <div>
          <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
            <p className="text-xs text-gray-500">{reuniones.length} reunión(es) registrada(s)</p>
            <Btn size="sm" variant="primary" onClick={openNuevaReunion}><Plus size={13} /> Nueva reunión</Btn>
          </div>

          <div className="space-y-3">
            {reuniones.map(r => (
              <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-1.5">
                      <span className="flex items-center gap-1.5 text-sm text-white font-semibold">
                        <Calendar size={14} className="text-blue-400" /> {fmtFecha(r.fecha)}
                      </span>
                      <Badge color={r.tipo === 'Extraordinaria' ? 'amber' : 'blue'}>{r.tipo || '—'}</Badge>
                      {r.asistentes && <span className="text-xs text-gray-500">👥 {r.asistentes}</span>}
                    </div>
                    {r.temas && (
                      <div className="mb-1.5">
                        <span className="text-[10px] text-gray-600 uppercase tracking-wide">Temas tratados</span>
                        <p className="text-sm text-gray-300 whitespace-pre-line">{r.temas}</p>
                      </div>
                    )}
                    {r.acuerdos && (
                      <div className="mb-1.5">
                        <span className="text-[10px] text-gray-600 uppercase tracking-wide">Acuerdos</span>
                        <p className="text-sm text-gray-400 whitespace-pre-line">{r.acuerdos}</p>
                      </div>
                    )}
                    {r.acta_url && (
                      <a href={r.acta_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-1">
                        <ExternalLink size={12} /> Ver acta
                      </a>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEditarReunion(r)} className="text-gray-500 hover:text-blue-400 transition-colors p-1"><Pencil size={13} /></button>
                    {puedeEliminar() && (
                      <button onClick={() => deleteReunion(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors p-1"><Trash2 size={13} /></button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {!reuniones.length && <div className="py-10 text-center text-gray-600 text-sm bg-gray-900 border border-gray-800 rounded-xl">Sin reuniones registradas. Usa "Nueva reunión".</div>}
          </div>
        </div>
      )}

      {/* ── Modal Miembro ── */}
      {showModalM && (
        <Modal title={editingM ? 'Editar miembro' : 'Agregar miembro del comité'} onClose={() => setShowModalM(false)}>
          <div className="space-y-1">
            <FormField label="Nombre completo *">
              <Input value={formM.nombre} onChange={e => setFormM(p => ({ ...p, nombre: e.target.value }))} placeholder="Apellidos y nombres" />
            </FormField>
            <FormField label="Cargo">
              <select value={formM.cargo} onChange={e => setFormM(p => ({ ...p, cargo: e.target.value }))} className={inputCls}>
                {CARGOS.map(c => <option key={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="Representa a">
              <select value={formM.representa} onChange={e => setFormM(p => ({ ...p, representa: e.target.value }))} className={inputCls}>
                {REPRESENTA.map(c => <option key={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="Periodo">
              <Input value={formM.periodo} onChange={e => setFormM(p => ({ ...p, periodo: e.target.value }))} placeholder="Ej. 2026-2027" />
            </FormField>
            <FormField label="Estado">
              <select value={formM.activo ? 'si' : 'no'} onChange={e => setFormM(p => ({ ...p, activo: e.target.value === 'si' }))} className={inputCls}>
                <option value="si">Activo</option>
                <option value="no">Inactivo</option>
              </select>
            </FormField>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-800 mt-2">
            <Btn variant="ghost" onClick={() => setShowModalM(false)}>Cancelar</Btn>
            <Btn variant="primary" onClick={saveMiembro} disabled={saving}>{saving ? 'Guardando…' : 'Guardar miembro'}</Btn>
          </div>
        </Modal>
      )}

      {/* ── Modal Reunión ── */}
      {showModalR && (
        <Modal title={editingR ? 'Editar reunión' : 'Nueva reunión del comité'} onClose={() => setShowModalR(false)} wide>
          <div className="space-y-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Fecha *">
                <Input type="date" value={formR.fecha} onChange={e => setFormR(p => ({ ...p, fecha: e.target.value }))} />
              </FormField>
              <FormField label="Tipo de reunión">
                <select value={formR.tipo} onChange={e => setFormR(p => ({ ...p, tipo: e.target.value }))} className={inputCls}>
                  {TIPOS_REUNION.map(t => <option key={t}>{t}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label="Temas tratados">
              <textarea value={formR.temas} onChange={e => setFormR(p => ({ ...p, temas: e.target.value }))} rows={3}
                placeholder="Puntos de agenda tratados en la reunión…" className={inputCls} />
            </FormField>
            <FormField label="Acuerdos">
              <textarea value={formR.acuerdos} onChange={e => setFormR(p => ({ ...p, acuerdos: e.target.value }))} rows={3}
                placeholder="Acuerdos y compromisos adoptados…" className={inputCls} />
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Asistentes">
                <Input value={formR.asistentes} onChange={e => setFormR(p => ({ ...p, asistentes: e.target.value }))} placeholder="Ej. 5 de 6" />
              </FormField>
              <FormField label="URL del acta">
                <Input value={formR.acta_url} onChange={e => setFormR(p => ({ ...p, acta_url: e.target.value }))} placeholder="https://… (Drive, PDF, etc.)" />
              </FormField>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-800 mt-2">
            <Btn variant="ghost" onClick={() => setShowModalR(false)}>Cancelar</Btn>
            <Btn variant="primary" onClick={saveReunion} disabled={saving}>{saving ? 'Guardando…' : 'Guardar reunión'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
