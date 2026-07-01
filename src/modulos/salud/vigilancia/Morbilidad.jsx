import { useState, useEffect } from 'react';
import { supabase, puedeEliminar } from '../../../lib/supabase.js';
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

export default function MorbilidadModulo({ workers, empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    trabajador_id: "", fecha_consulta: "", diagnostico: "", cie10: "",
    tipo_atencion: "Consulta", tipo_morbilidad: "No laboral",
    dias_reposo: "0", medico_responsable: "", observaciones: "",
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vigilancia_morbilidad")
      .select("*, trabajadores(nombre, area)")
      .eq("empresa_id", empresaId)
      .order("fecha_consulta", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const now = new Date();
  const delMes = records.filter(r => {
    const f = new Date(r.fecha_consulta + "T00:00:00");
    return f.getMonth() === now.getMonth() && f.getFullYear() === now.getFullYear();
  });
  const diasPerdidosMes = delMes.reduce((acc, r) => acc + (Number(r.dias_reposo) || 0), 0);

  const dxFrecuente = (() => {
    if (!records.length) return "—";
    const freq = {};
    records.forEach(r => { if (r.diagnostico) freq[r.diagnostico] = (freq[r.diagnostico] || 0) + 1; });
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0].substring(0, 20) + (top[0].length > 20 ? "…" : "") : "—";
  })();

  const [sort, setSort] = useState("fecha");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  const [editing, setEditing] = useState(null);
  const resetForm = () => setForm({ trabajador_id: "", fecha_consulta: "", diagnostico: "", cie10: "", tipo_atencion: "Consulta", tipo_morbilidad: "No laboral", dias_reposo: "0", medico_responsable: "", observaciones: "" });
  const openEdit = (r) => { setForm({ trabajador_id: r.trabajador_id, fecha_consulta: r.fecha_consulta, diagnostico: r.diagnostico || "", cie10: r.cie10 || "", tipo_atencion: r.tipo_atencion || "Consulta", tipo_morbilidad: r.tipo_morbilidad || "No laboral", dias_reposo: String(r.dias_reposo ?? 0), medico_responsable: r.medico_responsable || "", observaciones: r.observaciones || "" }); setEditing(r.id); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); resetForm(); };

  const handleSave = async () => {
    if (!form.trabajador_id || !form.fecha_consulta || !form.diagnostico) {
      showToast("Trabajador, fecha y diagnóstico son obligatorios", "error"); return;
    }
    setSaving(true);
    const payload = { ...form, dias_reposo: Number(form.dias_reposo) || 0, empresa_id: empresaId };
    const { error } = editing
      ? await supabase.from("vigilancia_morbilidad").update(payload).eq("id", editing)
      : await supabase.from("vigilancia_morbilidad").insert(payload);
    if (error) { showToast("Error: " + error.message, "error"); }
    else { showToast(editing ? "Registro actualizado" : "Registro guardado", "success"); closeModal(); load(); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este registro?")) return;
    await supabase.from("vigilancia_morbilidad").delete().eq("id", id);
    showToast("Registro eliminado", "info"); load();
  };

  const tipoColor = (t) => t === "Accidente de trabajo" ? "red" : t === "Laboral" ? "amber" : "blue";
  const atencionColor = (t) => t === "Hospitalización" ? "red" : t === "Emergencia" ? "amber" : "green";

  const filtered = records.filter(r => (!fFrom || r.fecha_consulta >= fFrom) && (!fTo || r.fecha_consulta <= fTo)).sort((a, b) => {
      if (sort === "az" || sort === "za") {
        const na = (a.trabajadores?.nombre || "").toLowerCase(), nb = (b.trabajadores?.nombre || "").toLowerCase();
        return sort === "az" ? na.localeCompare(nb, "es") : nb.localeCompare(na, "es");
      }
      return 0;
    });

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Morbilidad</h3>
          <p className="text-gray-500 text-xs max-w-xl">Registro de consultas médicas, diagnósticos y ausentismo laboral. Identifica las causas más frecuentes de morbilidad en el centro de trabajo.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <ExportBtn data={records.map(r => ({ Trabajador: r.trabajadores?.nombre || "", Fecha: r.fecha_consulta, Diagnóstico: r.diagnostico, "CIE-10": r.cie10 || "", "Tipo Atención": r.tipo_atencion, "Tipo Morbilidad": r.tipo_morbilidad, "Días Reposo": r.dias_reposo ?? 0, Médico: r.medico_responsable || "" }))} filename="morbilidad" />
          <Btn size="sm" variant="primary" onClick={() => { setEditing(null); resetForm(); setShowModal(true); }}><Plus size={13} /> Nueva Consulta</Btn>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <KpiCard label="Consultas este mes" value={delMes.length} sub={`${records.length} total registradas`} accentColor="blue" />
        <KpiCard label="Dx más frecuente" value={dxFrecuente} sub="diagnóstico con más recurrencias" accentColor="purple" />
        <KpiCard label="Días perdidos (mes)" value={diasPerdidosMes} sub="días de reposo acumulados" accentColor="red" />
      </div>

      <FilterBar dateFrom={fFrom} dateTo={fTo} onDateFrom={setFFrom} onDateTo={setFTo} sort={sort} onSort={setSort} />

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500 text-sm">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {["Trabajador", "Fecha", "Diagnóstico", "CIE-10", "Tipo Atención", "Tipo Morbilidad", "Días Reposo", "Médico", ""].map(h => (
                  <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-white">{r.trabajadores?.nombre || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.fecha_consulta}</td>
                  <td className="px-4 py-3 text-gray-300 text-xs max-w-[160px] truncate">{r.diagnostico}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.cie10 || "—"}</td>
                  <td className="px-4 py-3"><Badge color={atencionColor(r.tipo_atencion)}>{r.tipo_atencion}</Badge></td>
                  <td className="px-4 py-3"><Badge color={tipoColor(r.tipo_morbilidad)}>{r.tipo_morbilidad}</Badge></td>
                  <td className="px-4 py-3 text-center font-mono text-xs text-gray-300">{r.dias_reposo ?? 0}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.medico_responsable || "—"}</td>
                  <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button>{puedeEliminar() && (<button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>)}</div></td>
                </tr>
              ))}
              {!records.length && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-600 text-sm">Sin registros de morbilidad aún</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? "Editar Consulta de Morbilidad" : "Nueva Consulta / Registro de Morbilidad"} onClose={closeModal}>
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
              <FormField label="Fecha Consulta *">
                <Input type="date" value={form.fecha_consulta} onChange={e => setForm(f => ({ ...f, fecha_consulta: e.target.value }))} />
              </FormField>
              <FormField label="Código CIE-10">
                <Input value={form.cie10} onChange={e => setForm(f => ({ ...f, cie10: e.target.value }))} placeholder="Ej: J06.9, M54.5" />
              </FormField>
            </div>
            <FormField label="Diagnóstico *">
              <Input value={form.diagnostico} onChange={e => setForm(f => ({ ...f, diagnostico: e.target.value }))} placeholder="Descripción del diagnóstico médico" />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Tipo de Atención">
                <Select value={form.tipo_atencion} onChange={e => setForm(f => ({ ...f, tipo_atencion: e.target.value }))}>
                  {["Consulta", "Emergencia", "Hospitalización", "Tópico empresa"].map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Tipo de Morbilidad">
                <Select value={form.tipo_morbilidad} onChange={e => setForm(f => ({ ...f, tipo_morbilidad: e.target.value }))}>
                  {["No laboral", "Laboral", "Accidente de trabajo", "Enfermedad profesional"].map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Días de Reposo">
                <Input type="number" min="0" value={form.dias_reposo} onChange={e => setForm(f => ({ ...f, dias_reposo: e.target.value }))} placeholder="0" />
              </FormField>
              <FormField label="Médico Responsable">
                <Input value={form.medico_responsable} onChange={e => setForm(f => ({ ...f, medico_responsable: e.target.value }))} placeholder="Dr. Apellidos" />
              </FormField>
            </div>
            <FormField label="Observaciones">
              <Input value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} placeholder="Tratamiento indicado, seguimiento..." />
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
