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

export default function FatigaModulo({ workers, empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const initForm = { trabajador_id: "", fecha_evaluacion: new Date().toISOString().split("T")[0], turno: "Día", score_epworth: "", horas_sueno_promedio: "", nivel_actividad: "Moderado", observaciones: "", medico_responsable: "" };
  const [form, setForm] = useState(initForm);
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vigilancia_fatiga")
      .select("*, trabajadores(nombre)")
      .eq("empresa_id", empresaId)
      .order("fecha_evaluacion", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const getNivel = (score) => {
    const s = Number(score);
    if (s <= 5) return { label: "Sin somnolencia", color: "green" };
    if (s <= 10) return { label: "Leve", color: "blue" };
    if (s <= 16) return { label: "Moderado", color: "amber" };
    return { label: "Severo", color: "red" };
  };

  const openEdit = (r) => { setForm({ trabajador_id: r.trabajador_id, fecha_evaluacion: r.fecha_evaluacion, turno: r.turno || "Día", score_epworth: String(r.score_epworth ?? ""), horas_sueno_promedio: r.horas_sueno_promedio ? String(r.horas_sueno_promedio) : "", nivel_actividad: r.nivel_actividad || "Moderado", observaciones: r.observaciones || "", medico_responsable: r.medico_responsable || "" }); setEditing(r.id); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(initForm); };
  const handleDelete = async (id) => { if (!confirm("¿Eliminar este registro?")) return; await supabase.from("vigilancia_fatiga").delete().eq("id", id); showToast("Eliminado", "info"); load(); };

  const handleSave = async () => {
    if (!form.trabajador_id || form.score_epworth === "" || !form.fecha_evaluacion) {
      showToast("Completa los campos obligatorios", "error"); return;
    }
    setSaving(true);
    const payload = { empresa_id: empresaId, trabajador_id: form.trabajador_id, fecha_evaluacion: form.fecha_evaluacion, turno: form.turno, score_epworth: Number(form.score_epworth), horas_sueno_promedio: form.horas_sueno_promedio ? Number(form.horas_sueno_promedio) : null, nivel_actividad: form.nivel_actividad, nivel_riesgo: getNivel(form.score_epworth).label, observaciones: form.observaciones, medico_responsable: form.medico_responsable };
    const { error } = editing ? await supabase.from("vigilancia_fatiga").update(payload).eq("id", editing) : await supabase.from("vigilancia_fatiga").insert(payload);
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast(editing ? "Registro actualizado" : "Evaluación registrada", "success");
    closeModal(); load();
  };

  const now = new Date();
  const severos = records.filter(r => r.score_epworth >= 17);
  const moderados = records.filter(r => r.score_epworth >= 11 && r.score_epworth <= 16);
  const thisMes = records.filter(r => { const d = new Date(r.fecha_evaluacion); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const filtered = records.filter(r => (!fFrom || r.fecha_evaluacion >= fFrom) && (!fTo || r.fecha_evaluacion <= fTo));

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Fatiga y Somnolencia</h3>
          <p className="text-gray-500 text-xs max-w-xl">Monitoreo mediante la Escala de Epworth (0–24). Registro de horas de sueño y nivel de riesgo por turno.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <ExportBtn data={records.map(r => ({ Trabajador: r.trabajadores?.nombre || "", Fecha: r.fecha_evaluacion, Turno: r.turno, "Score Epworth": r.score_epworth, "Horas Sueño": r.horas_sueno_promedio || "", "Nivel Riesgo": r.nivel_riesgo || "", Observaciones: r.observaciones || "", Médico: r.medico_responsable || "" }))} filename="fatiga_somnolencia" />
          <Btn size="sm" variant="primary" onClick={() => { setEditing(null); setForm(initForm); setShowModal(true); }}><Plus size={13} /> Nueva Evaluación</Btn>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <KpiCard label="Evaluaciones este mes" value={thisMes.length} sub="Registros del mes actual" accentColor="blue" />
        <KpiCard label="Riesgo Moderado" value={moderados.length} sub="Score Epworth 11–16" accentColor="amber" />
        <KpiCard label="Riesgo Severo" value={severos.length} sub="Epworth ≥ 17 — Alerta" accentColor="red" />
      </div>

      {severos.length > 0 && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 text-xs font-semibold mb-1">{severos.length} trabajador(es) con somnolencia severa (Epworth ≥ 17)</p>
            <p className="text-red-600 text-xs">Restricción recomendada: no operar maquinaria ni conducir hasta reevaluación médica.</p>
          </div>
        </div>
      )}

      <FilterBar dateFrom={fFrom} dateTo={fTo} onDateFrom={setFFrom} onDateTo={setFTo} />
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {["Trabajador", "Fecha", "Turno", "Score Epworth", "Horas Sueño", "Nivel Riesgo", "Observaciones", ""].map(h => (
                <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
            {!loading && filtered.map(r => {
              const nivel = getNivel(r.score_epworth);
              return (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-white">{r.trabajadores?.nombre || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.fecha_evaluacion}</td>
                  <td className="px-4 py-3"><Badge color="gray">{r.turno}</Badge></td>
                  <td className="px-4 py-3">
                    <span className={`font-mono font-bold ${r.score_epworth >= 17 ? "text-red-400" : r.score_epworth >= 11 ? "text-amber-400" : r.score_epworth >= 6 ? "text-blue-400" : "text-emerald-400"}`}>
                      {r.score_epworth} / 24
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{r.horas_sueno_promedio ? `${r.horas_sueno_promedio}h` : "—"}</td>
                  <td className="px-4 py-3"><Badge color={nivel.color}>{nivel.label}</Badge></td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{r.observaciones || "—"}</td>
                  <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button><button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button></div></td>
                </tr>
              );
            })}
            {!loading && !filtered.length && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-600 text-sm">{records.length ? "Sin resultados para el filtro aplicado." : "Sin evaluaciones registradas. Usa \"Nueva Evaluación\" para comenzar."}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? "Editar — Fatiga y Somnolencia" : "Nueva Evaluación — Fatiga y Somnolencia"} onClose={closeModal} wide>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 mb-4 text-xs text-gray-400">
            <p className="font-semibold text-gray-300 mb-1">Escala de Epworth — Referencia</p>
            <div className="grid grid-cols-4 gap-2">
              <span className="text-emerald-400">0–5: Sin somnolencia</span>
              <span className="text-blue-400">6–10: Leve</span>
              <span className="text-amber-400">11–16: Moderado</span>
              <span className="text-red-400">17–24: Severo ⚠</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Trabajador *">
              <Select value={form.trabajador_id} onChange={e => setForm({ ...form, trabajador_id: e.target.value })}>
                <option value="">Seleccionar...</option>
                {workers.filter(w => w.estado !== "Cesado").sort((a,b)=>a.nombre.localeCompare(b.nombre,"es")).map(w => <option key={w.id} value={w.id}>{w.nombre}</option>)}
                  {workers.some(w => w.estado === "Cesado") && <option disabled>── Cesados ──</option>}
                  {workers.filter(w => w.estado === "Cesado").sort((a,b)=>a.nombre.localeCompare(b.nombre,"es")).map(w => <option key={w.id} value={w.id}>{w.nombre} (Cesado)</option>)}
              </Select>
            </FormField>
            <FormField label="Fecha de Evaluación *">
              <Input type="date" value={form.fecha_evaluacion} onChange={e => setForm({ ...form, fecha_evaluacion: e.target.value })} />
            </FormField>
            <FormField label="Turno">
              <Select value={form.turno} onChange={e => setForm({ ...form, turno: e.target.value })}>
                <option>Día</option><option>Noche</option><option>Rotativo</option>
              </Select>
            </FormField>
            <FormField label="Actividad Física">
              <Select value={form.nivel_actividad} onChange={e => setForm({ ...form, nivel_actividad: e.target.value })}>
                <option>Sedentario</option><option>Leve</option><option>Moderado</option><option>Intenso</option>
              </Select>
            </FormField>
            <FormField label="Score Epworth (0–24) *">
              <Input type="number" min="0" max="24" placeholder="0" value={form.score_epworth} onChange={e => setForm({ ...form, score_epworth: e.target.value })} />
              {form.score_epworth !== "" && (
                <p className={`text-xs mt-1 font-medium ${getNivel(form.score_epworth).color === "red" ? "text-red-400" : getNivel(form.score_epworth).color === "amber" ? "text-amber-400" : getNivel(form.score_epworth).color === "blue" ? "text-blue-400" : "text-emerald-400"}`}>
                  → {getNivel(form.score_epworth).label}
                </p>
              )}
            </FormField>
            <FormField label="Horas Sueño Promedio (últimos 7 días)">
              <Input type="number" min="0" max="24" step="0.5" placeholder="7.5" value={form.horas_sueno_promedio} onChange={e => setForm({ ...form, horas_sueno_promedio: e.target.value })} />
            </FormField>
            <FormField label="Médico Responsable">
              <Input placeholder="Nombre del médico" value={form.medico_responsable} onChange={e => setForm({ ...form, medico_responsable: e.target.value })} />
            </FormField>
            <FormField label="Observaciones / Restricciones">
              <Input placeholder="Restricciones, derivaciones, notas..." value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
            </FormField>
          </div>
          <div className="flex gap-2 mt-5 justify-end">
            <Btn variant="default" onClick={closeModal}>Cancelar</Btn>
            <Btn variant="primary" disabled={saving} onClick={handleSave}>{saving ? "Guardando..." : editing ? "Actualizar" : "Guardar Evaluación"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
