import { useState, useEffect } from 'react';
import { fmtFecha } from '../../../lib/helpers.js';
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

export default function DescansosMedicosModulo({ workers, empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    trabajador_id: "", fecha_inicio: "", fecha_fin: "",
    tipo_reposo: "Domiciliario", diagnostico: "", cie10: "",
    medico_responsable: "", centro_medico: "", observaciones: "",
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vigilancia_descansos")
      .select("*, trabajadores(nombre)")
      .eq("empresa_id", empresaId)
      .order("fecha_inicio", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  function estadoDescanso(r) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const fin = new Date(r.fecha_fin + "T00:00:00");
    const en7 = new Date(today); en7.setDate(en7.getDate() + 7);
    if (fin < today) return "Vencido";
    if (fin <= en7) return "Próximo a vencer";
    return "Activo";
  }

  function diasDescanso(r) {
    const ini = new Date(r.fecha_inicio + "T00:00:00");
    const fin = new Date(r.fecha_fin + "T00:00:00");
    return Math.max(1, Math.round((fin - ini) / 86400000) + 1);
  }

  const now = new Date();
  const activos = records.filter(r => estadoDescanso(r) === "Activo");
  const mesActual = records.filter(r => {
    const ini = new Date(r.fecha_inicio + "T00:00:00");
    return ini.getMonth() === now.getMonth() && ini.getFullYear() === now.getFullYear();
  });
  const diasMes = mesActual.reduce((acc, r) => acc + diasDescanso(r), 0);
  const proximos = records.filter(r => estadoDescanso(r) === "Próximo a vencer");

  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  const [editing, setEditing] = useState(null);
  const resetForm = () => setForm({ trabajador_id: "", fecha_inicio: "", fecha_fin: "", tipo_reposo: "Domiciliario", diagnostico: "", cie10: "", medico_responsable: "", centro_medico: "", observaciones: "" });
  const openEdit = (r) => { setForm({ trabajador_id: r.trabajador_id, fecha_inicio: r.fecha_inicio, fecha_fin: r.fecha_fin, tipo_reposo: r.tipo_reposo || "Domiciliario", diagnostico: r.diagnostico || "", cie10: r.cie10 || "", medico_responsable: r.medico_responsable || "", centro_medico: r.centro_medico || "", observaciones: r.observaciones || "" }); setEditing(r.id); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); resetForm(); };

  const handleSave = async () => {
    if (!form.trabajador_id || !form.fecha_inicio || !form.fecha_fin) {
      showToast("Trabajador, fecha inicio y fin son obligatorios", "error"); return;
    }
    setSaving(true);
    const { error } = editing
      ? await supabase.from("vigilancia_descansos").update({ ...form }).eq("id", editing)
      : await supabase.from("vigilancia_descansos").insert({ ...form, empresa_id: empresaId });
    if (error) { showToast("Error: " + error.message, "error"); }
    else { showToast(editing ? "Registro actualizado" : "Descanso registrado", "success"); closeModal(); load(); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este registro?")) return;
    await supabase.from("vigilancia_descansos").delete().eq("id", id);
    showToast("Registro eliminado", "info"); load();
  };

  const badgeColor = (e) => e === "Activo" ? "green" : e === "Vencido" ? "red" : "amber";

  const filtered = records.filter(r => (!fFrom || r.fecha_inicio >= fFrom) && (!fTo || r.fecha_inicio <= fTo));

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Descansos Médicos</h3>
          <p className="text-gray-500 text-xs max-w-xl">Registro y seguimiento de reposos médicos del personal. Control de días activos y vencimientos.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <ExportBtn data={records.map(r => ({ Trabajador: r.trabajadores?.nombre || "", "Tipo Reposo": r.tipo_reposo, Inicio: r.fecha_inicio, Fin: r.fecha_fin, Días: diasDescanso(r), Diagnóstico: r.diagnostico || "", "CIE-10": r.cie10 || "", "Centro Médico": r.centro_medico || "", Estado: estadoDescanso(r), Médico: r.medico_responsable || "" }))} filename="descansos_medicos" />
          <Btn size="sm" variant="primary" onClick={() => { setEditing(null); resetForm(); setShowModal(true); }}><Plus size={13} /> Nuevo Descanso</Btn>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <KpiCard label="Activos hoy" value={activos.length} sub={`${activos.length === 1 ? "trabajador" : "trabajadores"} con reposo activo`} accentColor="red" />
        <KpiCard label="Días acumulados (mes)" value={diasMes} sub={`en ${mesActual.length} descanso${mesActual.length !== 1 ? "s" : ""} del mes`} accentColor="amber" />
        <KpiCard label="Próximos a vencer" value={proximos.length} sub="vencen en los próximos 7 días" accentColor="blue" />
      </div>

      <FilterBar dateFrom={fFrom} dateTo={fTo} onDateFrom={setFFrom} onDateTo={setFTo} />

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500 text-sm">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {["Trabajador", "Tipo Reposo", "Inicio", "Fin", "Días", "Diagnóstico / CIE-10", "Centro Médico", "Estado", "Médico", ""].map(h => (
                  <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const estado = estadoDescanso(r);
                return (
                  <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-medium text-white">{r.trabajadores?.nombre || "—"}</td>
                    <td className="px-4 py-3 text-gray-300 text-xs">{r.tipo_reposo}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{fmtFecha(r.fecha_inicio)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{fmtFecha(r.fecha_fin)}</td>
                    <td className="px-4 py-3 text-center text-gray-300 font-mono text-xs">{diasDescanso(r)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{r.diagnostico}{r.cie10 ? <span className="ml-1 text-gray-600">({r.cie10})</span> : ""}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{r.centro_medico || "—"}</td>
                    <td className="px-4 py-3"><Badge color={badgeColor(estado)}>{estado}</Badge></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{r.medico_responsable || "—"}</td>
                    <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button><button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button></div></td>
                  </tr>
                );
              })}
              {!records.length && (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-600 text-sm">No hay descansos médicos registrados</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? "Editar Descanso Médico" : "Nuevo Descanso Médico"} onClose={closeModal}>
          <div className="space-y-4">
            <FormField label="Trabajador *">
              <Select value={form.trabajador_id} onChange={e => setForm(f => ({ ...f, trabajador_id: e.target.value }))}>
                <option value="">Seleccionar trabajador...</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.nombre}</option>)}
              </Select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Tipo de Reposo">
                <Select value={form.tipo_reposo} onChange={e => setForm(f => ({ ...f, tipo_reposo: e.target.value }))}>
                  {["Domiciliario","Hospitalario","Post-operatorio","Accidente de trabajo","Enfermedad profesional","Pre-natal","Post-natal"].map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Código CIE-10">
                <Input value={form.cie10} onChange={e => setForm(f => ({ ...f, cie10: e.target.value }))} placeholder="Ej: J06.9" />
              </FormField>
            </div>
            <FormField label="Diagnóstico">
              <Input value={form.diagnostico} onChange={e => setForm(f => ({ ...f, diagnostico: e.target.value }))} placeholder="Descripción clínica del diagnóstico" />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Fecha Inicio *">
                <Input type="date" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} />
              </FormField>
              <FormField label="Fecha Fin *">
                <Input type="date" value={form.fecha_fin} onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Médico Responsable">
                <Input value={form.medico_responsable} onChange={e => setForm(f => ({ ...f, medico_responsable: e.target.value }))} placeholder="Dr. Apellidos" />
              </FormField>
              <FormField label="Centro Médico / EsSalud">
                <Input value={form.centro_medico} onChange={e => setForm(f => ({ ...f, centro_medico: e.target.value }))} placeholder="EsSalud, clínica, hospital..." />
              </FormField>
            </div>
            <FormField label="Observaciones">
              <Input value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} placeholder="Restricciones laborales, seguimiento requerido..." />
            </FormField>
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
