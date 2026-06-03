import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { showToast } from '../../../lib/toast.jsx';
import { calcularEdad, calcularVigencia } from '../../../lib/helpers.js';
import { VIG_GUIAS } from '../../../constants/vig-guias.js';
import { VigGuideModal } from './VigGuideModal.jsx';
import { Badge } from '../../../components/ui/Badge.jsx';
import { KpiCard } from '../../../components/ui/KpiCard.jsx';
import { Modal } from '../../../components/ui/Modal.jsx';
import { FormField } from '../../../components/ui/FormField.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { Btn } from '../../../components/ui/Btn.jsx';
import { ExportBtn } from '../../../components/ui/ExportBtn.jsx';
import { FilterBar } from '../../../components/ui/FilterBar.jsx';
import { Plus, Pencil, Trash2, AlertTriangle, HelpCircle, Lock } from 'lucide-react';

export default function ProteccionRespiratoriaModulo({ workers, empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const initForm = {
    trabajador_id: "", fecha_evaluacion: "", agente_exposicion: "",
    tipo_respirador: "", prueba_ajuste: "Pendiente", fecha_prueba_ajuste: "",
    espirometria: "Pendiente", fecha_espirometria: "", proxima_revision: "", observaciones: "",
  };
  const [form, setForm] = useState(initForm);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vigilancia_respiratoria")
      .select("*, trabajadores(nombre)")
      .eq("empresa_id", empresaId)
      .order("fecha_evaluacion", { ascending: false });
    if (error) showToast("Error al cargar datos: " + error.message, "error");
    setRecords(data || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const ajusteAprobado = records.filter(r => r.prueba_ajuste === "Aprobado").length;
  const espiroPendiente = records.filter(r => r.espirometria === "Pendiente").length;
  const now = new Date();
  const delMes = records.filter(r => { const f = new Date(r.fecha_evaluacion + "T00:00:00"); return f.getMonth() === now.getMonth() && f.getFullYear() === now.getFullYear(); });

  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  const ajusteColor = (v) => v === "Aprobado" ? "green" : v === "Rechazado" ? "red" : "amber";
  const espiroColor = (v) => v === "Normal" ? "green" : v === "Pendiente" ? "amber" : "red";

  const resetForm = () => setForm(initForm);
  const openEdit = (r) => { setForm({ trabajador_id: r.trabajador_id, fecha_evaluacion: r.fecha_evaluacion, agente_exposicion: r.agente_exposicion || "", tipo_respirador: r.tipo_respirador || "", prueba_ajuste: r.prueba_ajuste || "Pendiente", fecha_prueba_ajuste: r.fecha_prueba_ajuste || "", espirometria: r.espirometria || "Pendiente", fecha_espirometria: r.fecha_espirometria || "", proxima_revision: r.proxima_revision || "", observaciones: r.observaciones || "" }); setEditing(r.id); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); resetForm(); };

  const handleSave = async () => {
    if (!form.trabajador_id || !form.fecha_evaluacion) { showToast("Trabajador y fecha son obligatorios", "error"); return; }
    setSaving(true);
    const payload = { ...form, empresa_id: empresaId };
    const { error } = editing ? await supabase.from("vigilancia_respiratoria").update(payload).eq("id", editing) : await supabase.from("vigilancia_respiratoria").insert(payload);
    if (error) { showToast("Error: " + error.message, "error"); }
    else { showToast(editing ? "Registro actualizado" : "Registro guardado", "success"); closeModal(); load(); }
    setSaving(false);
  };
  const handleDelete = async (id) => { if (!confirm("¿Eliminar?")) return; await supabase.from("vigilancia_respiratoria").delete().eq("id", id); showToast("Eliminado", "info"); load(); };

  const filtered = records.filter(r => (!fFrom || r.fecha_evaluacion >= fFrom) && (!fTo || r.fecha_evaluacion <= fTo));

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Protección Respiratoria</h3>
          <p className="text-gray-500 text-xs max-w-xl">Programa de protección respiratoria para trabajadores expuestos a polvos, gases, vapores y agentes inhalables. Control de prueba de ajuste y espirometría.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <ExportBtn data={records.map(r => ({ Trabajador: r.trabajadores?.nombre || "", Fecha: r.fecha_evaluacion, "Agente Exposición": r.agente_exposicion || "", "Tipo Respirador": r.tipo_respirador || "", "Prueba Ajuste": r.prueba_ajuste, "F. Ajuste": r.fecha_prueba_ajuste || "", Espirometría: r.espirometria, "F. Espiro": r.fecha_espirometria || "", "Próx. Control": r.proxima_revision || "" }))} filename="proteccion_respiratoria" />
          <Btn size="sm" variant="primary" onClick={() => { setEditing(null); resetForm(); setShowModal(true); }}><Plus size={13} /> Nuevo Registro</Btn>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <KpiCard label="Bajo programa" value={records.length} sub={`${delMes.length} evaluados este mes`} accentColor="blue" />
        <KpiCard label="Prueba de ajuste aprobada" value={records.length ? `${Math.round(ajusteAprobado / records.length * 100)}%` : "—"} sub={`${ajusteAprobado} de ${records.length} trabajadores`} accentColor="green" />
        <KpiCard label="Espirometría pendiente" value={espiroPendiente} sub="requieren evaluación pulmonar" accentColor="amber" />
      </div>

      <FilterBar dateFrom={fFrom} dateTo={fTo} onDateFrom={setFFrom} onDateTo={setFTo} />

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16 text-gray-500 text-sm">Cargando...</div> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800">
              {["Trabajador", "Fecha", "Agente Exposición", "Tipo Respirador", "Prueba Ajuste", "F. Ajuste", "Espirometría", "F. Espiro", "Próx. Control", ""].map(h => (
                <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-white">{r.trabajadores?.nombre || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.fecha_evaluacion}</td>
                  <td className="px-4 py-3 text-gray-300 text-xs">{r.agente_exposicion || "—"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{r.tipo_respirador || "—"}</td>
                  <td className="px-4 py-3"><Badge color={ajusteColor(r.prueba_ajuste)}>{r.prueba_ajuste}</Badge></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.fecha_prueba_ajuste || "—"}</td>
                  <td className="px-4 py-3"><Badge color={espiroColor(r.espirometria)}>{r.espirometria}</Badge></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.fecha_espirometria || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.proxima_revision || "—"}</td>
                  <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button><button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button></div></td>
                </tr>
              ))}
              {!records.length && <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-600 text-sm">Sin registros de protección respiratoria</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? "Editar — Protección Respiratoria" : "Nuevo Registro — Protección Respiratoria"} onClose={closeModal}>
          <div className="space-y-4">
            <FormField label="Trabajador *">
              <Select value={form.trabajador_id} onChange={e => setForm(f => ({ ...f, trabajador_id: e.target.value }))}>
                <option value="">Seleccionar trabajador...</option>
                {workers.filter(w => w.estado !== "Cesado").sort((a,b)=>a.nombre.localeCompare(b.nombre,"es")).map(w => <option key={w.id} value={w.id}>{w.nombre}</option>)}
                  {workers.some(w => w.estado === "Cesado") && <option disabled>── Cesados ──</option>}
                  {workers.filter(w => w.estado === "Cesado").sort((a,b)=>a.nombre.localeCompare(b.nombre,"es")).map(w => <option key={w.id} value={w.id}>{w.nombre} (Cesado)</option>)}
              </Select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Fecha Evaluación *"><Input type="date" value={form.fecha_evaluacion} onChange={e => setForm(f => ({ ...f, fecha_evaluacion: e.target.value }))} /></FormField>
              <FormField label="Agente de Exposición"><Input value={form.agente_exposicion} onChange={e => setForm(f => ({ ...f, agente_exposicion: e.target.value }))} placeholder="Sílice, polvo madera, gases..." /></FormField>
            </div>
            <FormField label="Tipo de Respirador">
              <Select value={form.tipo_respirador} onChange={e => setForm(f => ({ ...f, tipo_respirador: e.target.value }))}>
                <option value="">Seleccionar...</option>
                {["Semifacial filtrante N95","Semifacial filtrante FFP2","Semifacial con filtros intercambiables","Cara completa","Respirador de escape","Equipo autónomo (SCBA)","Línea de aire"].map(t => <option key={t}>{t}</option>)}
              </Select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Prueba de Ajuste">
                <Select value={form.prueba_ajuste} onChange={e => setForm(f => ({ ...f, prueba_ajuste: e.target.value }))}>
                  {["Pendiente","Aprobado","Rechazado"].map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Fecha Prueba Ajuste"><Input type="date" value={form.fecha_prueba_ajuste} onChange={e => setForm(f => ({ ...f, fecha_prueba_ajuste: e.target.value }))} /></FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Espirometría">
                <Select value={form.espirometria} onChange={e => setForm(f => ({ ...f, espirometria: e.target.value }))}>
                  {["Pendiente","Normal","Restricción leve","Restricción moderada","Obstrucción leve","Obstrucción moderada","Obstrucción severa"].map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Fecha Espirometría"><Input type="date" value={form.fecha_espirometria} onChange={e => setForm(f => ({ ...f, fecha_espirometria: e.target.value }))} /></FormField>
            </div>
            <FormField label="Próxima Revisión"><Input type="date" value={form.proxima_revision} onChange={e => setForm(f => ({ ...f, proxima_revision: e.target.value }))} /></FormField>
            <FormField label="Observaciones"><Input value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} placeholder="Restricciones, seguimiento, cambio de filtros..." /></FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={closeModal}>Cancelar</Btn>
              <Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : editing ? "Actualizar" : "Guardar"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
