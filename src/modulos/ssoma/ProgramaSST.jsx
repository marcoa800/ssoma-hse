// ════════════════════════════════════════════════════════════════════
//  ProgramaSST — Programa Anual de Seguridad y Salud (PASST)
//  v1: el responsable registra el link al documento por año.
//  (Más adelante: editor completo + export con logo y código SIG.)
// ════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import { supabase, puedeEliminar } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Btn } from '../../components/ui/Btn.jsx';
import { Plus, Pencil, Trash2, ExternalLink, ClipboardList, Calendar } from 'lucide-react';

export default function ProgramaSST({ empresaId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("programa_sst").select("*").eq("empresa_id", empresaId).order("anio", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const nuevo = () => setForm({ anio: new Date().getFullYear(), nombre: "Programa Anual de SST", url: "", observacion: "" });
  const editar = (r) => setForm({ ...r });
  const guardar = async () => {
    if (!form.url?.trim()) { showToast("Coloca el link del documento", "error"); return; }
    setSaving(true);
    const payload = { empresa_id: empresaId, anio: parseInt(form.anio) || new Date().getFullYear(), nombre: form.nombre || "Programa Anual de SST", url: form.url.trim(), observacion: form.observacion || null };
    const { error } = form.id
      ? await supabase.from("programa_sst").update(payload).eq("id", form.id)
      : await supabase.from("programa_sst").insert(payload);
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast("Guardado", "success"); setForm(null); load();
  };
  const eliminar = async (id) => {
    if (!confirm("¿Eliminar este programa?")) return;
    await supabase.from("programa_sst").delete().eq("id", id); load();
  };

  if (loading) return <div className="text-gray-600 text-sm py-10 text-center">Cargando…</div>;

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2"><ClipboardList size={16} className="text-blue-400" /> Programa Anual de SST (PASST)</h3>
          <p className="text-gray-500 text-xs max-w-xl">Registra el link del Programa Anual de cada año. Más adelante podrás editarlo y exportarlo con el logo y código SIG de la empresa.</p>
        </div>
        <Btn size="sm" variant="primary" onClick={nuevo}><Plus size={13} /> Agregar año</Btn>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-gray-900 border border-gray-800 rounded-2xl">
          <ClipboardList size={28} className="text-blue-400 mb-3" />
          <p className="text-white font-semibold mb-1">Sin programas registrados</p>
          <p className="text-gray-500 text-sm mb-4">Agrega el link del Programa Anual de SST.</p>
          <Btn variant="primary" onClick={nuevo}><Plus size={14} /> Agregar año</Btn>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map(r => (
            <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3.5 flex items-center gap-3 flex-wrap">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-900/30 border border-blue-900/40 text-blue-300 font-bold shrink-0">
                <span className="text-sm">{r.anio}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">{r.nombre}</div>
                {r.observacion && <div className="text-xs text-gray-500 mt-0.5">{r.observacion}</div>}
                {r.url && <a href={r.url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 mt-0.5"><ExternalLink size={11} /> Abrir documento</a>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => editar(r)} className="text-gray-500 hover:text-blue-400 p-1.5"><Pencil size={14} /></button>
                {puedeEliminar() && <button onClick={() => eliminar(r.id)} className="text-gray-700 hover:text-red-400 p-1.5"><Trash2 size={14} /></button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <Modal title={form.id ? "Editar programa" : "Agregar Programa Anual"} onClose={() => setForm(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Año"><Input type="number" value={form.anio} onChange={e => setForm(f => ({ ...f, anio: e.target.value }))} /></FormField>
              <FormField label="Nombre"><Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></FormField>
            </div>
            <FormField label="Link del documento (Drive, nube…)"><Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://…" /></FormField>
            <FormField label="Observación"><Input value={form.observacion || ""} onChange={e => setForm(f => ({ ...f, observacion: e.target.value }))} /></FormField>
            <div className="flex justify-end gap-2 pt-1">
              <Btn variant="ghost" onClick={() => setForm(null)}>Cancelar</Btn>
              <Btn variant="primary" disabled={saving} onClick={guardar}>{saving ? "Guardando…" : "Guardar"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
