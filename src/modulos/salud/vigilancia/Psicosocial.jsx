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

export default function PsicosocialModulo({ workers, empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const initForm = { trabajador_id: "", fecha_evaluacion: new Date().toISOString().split("T")[0], instrumento: "ISTAS21", puntaje: "", nivel_riesgo: "Medio", dimension_principal: "", derivacion: "No aplica", fecha_derivacion: "", seguimiento: "", medico_responsable: "", observaciones: "" };
  const [form, setForm] = useState(initForm);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vigilancia_psicosocial")
      .select("*, trabajadores(nombre)")
      .eq("empresa_id", empresaId)
      .order("fecha_evaluacion", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const getNivelColor = (nivel) => {
    if (nivel === "Bajo") return "green";
    if (nivel === "Medio") return "amber";
    if (nivel === "Alto") return "orange";
    if (nivel === "Muy Alto") return "red";
    return "gray";
  };

  const getDerivacionColor = (d) => {
    if (!d || d === "No aplica") return "gray";
    if (d === "Psiquiatría") return "red";
    return "purple";
  };

  const openEdit = (r) => { setForm({ trabajador_id: r.trabajador_id, fecha_evaluacion: r.fecha_evaluacion, instrumento: r.instrumento || "ISTAS21", puntaje: r.puntaje != null ? String(r.puntaje) : "", nivel_riesgo: r.nivel_riesgo || "Medio", dimension_principal: r.dimension_principal || "", derivacion: r.derivacion || "No aplica", fecha_derivacion: r.fecha_derivacion || "", seguimiento: r.seguimiento || "", medico_responsable: r.medico_responsable || "", observaciones: r.observaciones || "" }); setEditing(r.id); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(initForm); };
  const handleDelete = async (id) => { if (!confirm("¿Eliminar este registro?")) return; await supabase.from("vigilancia_psicosocial").delete().eq("id", id); showToast("Eliminado", "info"); load(); };

  const handleSave = async () => {
    if (!form.trabajador_id || !form.fecha_evaluacion) {
      showToast("Selecciona trabajador y fecha", "error"); return;
    }
    setSaving(true);
    const payload = { empresa_id: empresaId, trabajador_id: form.trabajador_id, fecha_evaluacion: form.fecha_evaluacion, instrumento: form.instrumento, puntaje: form.puntaje ? parseFloat(form.puntaje) : null, nivel_riesgo: form.nivel_riesgo, dimension_principal: form.dimension_principal, derivacion: form.derivacion, fecha_derivacion: form.fecha_derivacion || null, seguimiento: form.seguimiento, medico_responsable: form.medico_responsable, observaciones: form.observaciones };
    const { error } = editing ? await supabase.from("vigilancia_psicosocial").update(payload).eq("id", editing) : await supabase.from("vigilancia_psicosocial").insert(payload);
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast(editing ? "Registro actualizado" : "Evaluación registrada", "success");
    closeModal(); load();
  };

  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  const now = new Date();
  const thisMes = records.filter(r => { const d = new Date(r.fecha_evaluacion); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const altoRiesgo = records.filter(r => r.nivel_riesgo === "Alto" || r.nivel_riesgo === "Muy Alto");
  const derivados = records.filter(r => r.derivacion && r.derivacion !== "No aplica");

  const filtered = records.filter(r => (!fFrom || r.fecha_evaluacion >= fFrom) && (!fTo || r.fecha_evaluacion <= fTo));

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Riesgos Psicosociales y Salud Mental</h3>
          <p className="text-gray-500 text-xs max-w-xl">Evaluación de factores psicosociales laborales, estrés y bienestar mental. (RM 312-2011/MINSA)</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] px-2 py-1 rounded bg-red-900/40 text-red-400 border border-red-800 font-mono">CONFIDENCIAL</span>
          <ExportBtn data={records.map(r => ({ Trabajador: r.trabajadores?.nombre || "", Fecha: r.fecha_evaluacion, Instrumento: r.instrumento, Puntaje: r.puntaje ?? "", "Nivel Riesgo": r.nivel_riesgo, "Dimensión Principal": r.dimension_principal || "", Derivación: r.derivacion || "", Médico: r.medico_responsable || "" }))} filename="psicosocial" />
          <Btn size="sm" variant="primary" onClick={() => { setEditing(null); setForm(initForm); setShowModal(true); }}><Plus size={13} /> Nueva Evaluación</Btn>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <KpiCard label="Evaluaciones este mes" value={thisMes.length} sub="Registros del mes actual" accentColor="blue" />
        <KpiCard label="Riesgo Alto / Muy Alto" value={altoRiesgo.length} sub="Requieren intervención" accentColor="amber" />
        <KpiCard label="Derivaciones activas" value={derivados.length} sub="Psicólogo / Psiquiatría" accentColor="purple" />
      </div>

      {altoRiesgo.length > 0 && (
        <div className="bg-amber-900/20 border border-amber-800 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 text-xs font-semibold mb-1">{altoRiesgo.length} trabajador(es) con riesgo psicosocial Alto o Muy Alto</p>
            <p className="text-amber-600 text-xs">Verificar derivación a salud mental y activar plan de intervención organizacional.</p>
          </div>
        </div>
      )}

      <FilterBar dateFrom={fFrom} dateTo={fTo} onDateFrom={setFFrom} onDateTo={setFTo} />

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {["Trabajador", "Fecha", "Instrumento", "Puntaje", "Nivel Riesgo", "Dimensión Principal", "Derivación", ""].map(h => (
                <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
            {!loading && filtered.map(r => (
              <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3 font-medium text-white">{r.trabajadores?.nombre || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.fecha_evaluacion}</td>
                <td className="px-4 py-3"><Badge color="blue">{r.instrumento}</Badge></td>
                <td className="px-4 py-3 font-mono font-bold text-gray-200">{r.puntaje ?? "—"}</td>
                <td className="px-4 py-3"><Badge color={getNivelColor(r.nivel_riesgo)}>{r.nivel_riesgo}</Badge></td>
                <td className="px-4 py-3 text-gray-400 text-xs">{r.dimension_principal || "—"}</td>
                <td className="px-4 py-3"><Badge color={getDerivacionColor(r.derivacion)}>{r.derivacion || "No aplica"}</Badge></td>
                <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button><button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button></div></td>
              </tr>
            ))}
            {!loading && !records.length && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-600 text-sm">Sin evaluaciones. Usa "Nueva Evaluación" para comenzar.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? "Editar — Psicosocial / Salud Mental" : "Nueva Evaluación — Psicosocial / Salud Mental"} onClose={closeModal} wide>
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4 flex items-center gap-2">
            <span className="text-[10px] px-2 py-1 rounded bg-red-900/40 text-red-400 border border-red-800 font-mono shrink-0">CONFIDENCIAL</span>
            <p className="text-xs text-red-400">La información registrada es de carácter médico confidencial y de uso exclusivo del equipo de salud.</p>
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
            <FormField label="Instrumento de Evaluación">
              <Select value={form.instrumento} onChange={e => setForm({ ...form, instrumento: e.target.value })}>
                <option>ISTAS21</option>
                <option>SUSESO-ISTAS21</option>
                <option>Maslach Burnout Inventory</option>
                <option>DASS-21</option>
                <option>Escala de Estrés Percibido (PSS)</option>
                <option>GHQ-12</option>
                <option>Otro</option>
              </Select>
            </FormField>
            <FormField label="Puntaje Obtenido">
              <Input type="number" step="0.1" placeholder="—" value={form.puntaje} onChange={e => setForm({ ...form, puntaje: e.target.value })} />
            </FormField>
            <FormField label="Nivel de Riesgo">
              <Select value={form.nivel_riesgo} onChange={e => setForm({ ...form, nivel_riesgo: e.target.value })}>
                <option>Bajo</option>
                <option>Medio</option>
                <option>Alto</option>
                <option>Muy Alto</option>
              </Select>
            </FormField>
            <FormField label="Dimensión Principal Afectada">
              <Select value={form.dimension_principal} onChange={e => setForm({ ...form, dimension_principal: e.target.value })}>
                <option value="">Seleccionar...</option>
                <option>Demandas del trabajo</option>
                <option>Control sobre el trabajo</option>
                <option>Apoyo social</option>
                <option>Compensaciones</option>
                <option>Doble presencia</option>
                <option>Burnout / Agotamiento</option>
                <option>Ansiedad / Depresión</option>
              </Select>
            </FormField>
            <FormField label="Derivación">
              <Select value={form.derivacion} onChange={e => setForm({ ...form, derivacion: e.target.value })}>
                <option>No aplica</option>
                <option>Psicólogo interno</option>
                <option>Psicólogo externo</option>
                <option>Psiquiatría</option>
              </Select>
            </FormField>
            <FormField label="Fecha de Derivación">
              <Input type="date" value={form.fecha_derivacion} onChange={e => setForm({ ...form, fecha_derivacion: e.target.value })} disabled={form.derivacion === "No aplica"} />
            </FormField>
            <FormField label="Médico Responsable">
              <Input placeholder="Nombre del médico / psicólogo" value={form.medico_responsable} onChange={e => setForm({ ...form, medico_responsable: e.target.value })} />
            </FormField>
            <FormField label="Plan de Seguimiento">
              <Input placeholder="Ej: Sesión mensual, intervención grupal..." value={form.seguimiento} onChange={e => setForm({ ...form, seguimiento: e.target.value })} />
            </FormField>
            <FormField label="Observaciones" confidential>
              <Input placeholder="Notas clínicas confidenciales..." value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
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
