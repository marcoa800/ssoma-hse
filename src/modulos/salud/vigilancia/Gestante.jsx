import { useState, useEffect } from 'react';
import { supabase, puedeEliminar } from '../../../lib/supabase.js';
import { showToast } from '../../../lib/toast.jsx';
import { fmtFecha, PERIODICIDADES, proximoControl, estadoControl } from '../../../lib/helpers.js';
import { VIG_GUIAS } from '../../../constants/vig-guias.js';
import { VigGuideModal } from './VigGuideModal.jsx';
import SeguimientoPanel from './SeguimientoPanel.jsx';
import CronogramaActividades from './CronogramaActividades.jsx';
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

export default function GestanteModulo({ workers, empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const initForm = { trabajador_id: "", fecha_registro: new Date().toISOString().split("T")[0], semana_gestacional: "", fecha_probable_parto: "", estado: "Gestante", restricciones: "", periodicidad: "Anual", medico_responsable: "", observaciones: "" };
  const [form, setForm] = useState(initForm);
  const [subtab, setSubtab] = useState("eval");
  const [showGuide, setShowGuide] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vigilancia_gestante")
      .select("*, trabajadores(nombre)")
      .eq("empresa_id", empresaId)
      .order("fecha_registro", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const getEstadoBadge = (estado) => {
    if (estado === "Gestante") return "purple";
    if (estado === "Post-parto") return "blue";
    if (estado === "Lactancia") return "amber";
    return "gray";
  };

  const diasParaParto = (fecha) => {
    if (!fecha) return null;
    const diff = new Date(fecha) - new Date();
    const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return dias;
  };

  const openEdit = (r) => { setForm({ trabajador_id: r.trabajador_id, fecha_registro: r.fecha_registro, semana_gestacional: r.semana_gestacional != null ? String(r.semana_gestacional) : "", fecha_probable_parto: r.fecha_probable_parto || "", estado: r.estado || "Gestante", restricciones: r.restricciones || "", periodicidad: r.periodicidad || "Anual", medico_responsable: r.medico_responsable || "", observaciones: r.observaciones || "" }); setEditing(r.id); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(initForm); };
  const handleDelete = async (id) => { if (!confirm("¿Eliminar este registro?")) return; await supabase.from("vigilancia_gestante").delete().eq("id", id); showToast("Eliminado", "info"); load(); };

  const handleSave = async () => {
    if (!form.trabajador_id || !form.fecha_registro) {
      showToast("Selecciona trabajadora y fecha", "error"); return;
    }
    setSaving(true);
    const payload = { empresa_id: empresaId, trabajador_id: form.trabajador_id, fecha_registro: form.fecha_registro, semana_gestacional: form.semana_gestacional ? parseInt(form.semana_gestacional) : null, fecha_probable_parto: form.fecha_probable_parto || null, estado: form.estado, restricciones: form.restricciones, periodicidad: form.periodicidad, proximo_control: proximoControl(form.fecha_registro, form.periodicidad), medico_responsable: form.medico_responsable, observaciones: form.observaciones };
    const { error } = editing ? await supabase.from("vigilancia_gestante").update(payload).eq("id", editing) : await supabase.from("vigilancia_gestante").insert(payload);
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast(editing ? "Registro actualizado" : "Registro guardado", "success");
    closeModal(); load();
  };

  const [sort, setSort] = useState("fecha");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  const activas = records.filter(r => r.estado === "Gestante");
  const proximasControl = records.filter(r => {
    if (!r.proximo_control) return false;
    const diff = new Date(r.proximo_control) - new Date();
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  });
  const proximasParto = records.filter(r => {
    const d = diasParaParto(r.fecha_probable_parto);
    return d !== null && d >= 0 && d <= 30;
  });

  const filtered = records.filter(r => (!fFrom || r.fecha_registro >= fFrom) && (!fTo || r.fecha_registro <= fTo)).sort((a, b) => {
      if (sort === "az" || sort === "za") {
        const na = (a.trabajadores?.nombre || "").toLowerCase(), nb = (b.trabajadores?.nombre || "").toLowerCase();
        return sort === "az" ? na.localeCompare(nb, "es") : nb.localeCompare(na, "es");
      }
      return 0;
    });

  return (
    <div>
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Vigilancia de la Trabajadora Gestante</h3>
          <p className="text-gray-500 text-xs max-w-xl">Seguimiento médico en gestación, lactancia y post-parto. Restricciones laborales y controles prenatales. (Ley 29783)</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <Btn size="sm" onClick={() => setShowGuide(true)}><HelpCircle size={13} /> Guía</Btn>
          {subtab === "eval" && <>
            <ExportBtn data={records.map(r => ({ Trabajadora: r.trabajadores?.nombre || "", Fecha: r.fecha_registro, "Sem. Gestacional": r.semana_gestacional ?? "", "F. Probable Parto": r.fecha_probable_parto || "", Estado: r.estado, Restricciones: r.restricciones || "", "Próx. Control": r.proximo_control || "", Médico: r.medico_responsable || "" }))} filename="gestante" />
            <Btn size="sm" variant="primary" onClick={() => { setEditing(null); setForm(initForm); setShowModal(true); }}><Plus size={13} /> Nueva Ficha</Btn>
          </>}
        </div>
      </div>

      {/* Pestañas internas */}
      <div className="flex gap-1.5 bg-gray-900/60 border border-gray-800 rounded-lg p-1 mb-5 w-fit flex-wrap">
        {[["eval", "Evaluaciones"], ["controles", "Controles"], ["cronograma", "Cronograma de Actividades"]].map(([k, l]) => (
          <button key={k} onClick={() => setSubtab(k)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${subtab === k ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-200"}`}>{l}</button>
        ))}
      </div>

      {showGuide && <VigGuideModal titulo={VIG_GUIAS.gestante.titulo} campos={VIG_GUIAS.gestante.campos} onClose={() => setShowGuide(false)} />}

      {subtab === "controles" && <SeguimientoPanel programa="gestante" empresaId={empresaId} workers={workers} />}
      {subtab === "cronograma" && <CronogramaActividades programa="gestante" empresaId={empresaId} workers={workers} />}

      {subtab === "eval" && <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <KpiCard label="Gestantes activas" value={activas.length} sub="Estado: Gestante" accentColor="purple" />
        <KpiCard label="Control próx. 7 días" value={proximasControl.length} sub="Requieren atención" accentColor="amber" />
        <KpiCard label="Parto en 30 días" value={proximasParto.length} sub="Fecha probable próxima" accentColor="blue" />
      </div>

      {proximasParto.length > 0 && (
        <div className="bg-purple-900/20 border border-purple-800 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-purple-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-purple-400 text-xs font-semibold mb-1">{proximasParto.length} trabajadora(s) con fecha probable de parto en los próximos 30 días</p>
            <p className="text-purple-600 text-xs">Coordinar con RRHH y área médica para gestión de descanso pre-natal.</p>
          </div>
        </div>
      )}

      <FilterBar dateFrom={fFrom} dateTo={fTo} onDateFrom={setFFrom} onDateTo={setFTo} sort={sort} onSort={setSort} />

      {/* Móvil: tarjetas */}
      <div className="md:hidden space-y-2.5">
        {!loading && filtered.map(r => {
          const dias = diasParaParto(r.fecha_probable_parto);
          const ec = estadoControl(r.proximo_control);
          return (
            <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3.5">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <div className="font-semibold text-white text-sm leading-tight">{r.trabajadores?.nombre || "—"}</div>
                  <div className="text-xs text-gray-500 font-mono mt-0.5">{fmtFecha(r.fecha_registro)}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400"><Pencil size={14} /></button>
                  {puedeEliminar() && (
                  <button onClick={() => handleDelete(r.id)} className="text-red-500/50 hover:text-red-400"><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <Badge color={getEstadoBadge(r.estado)}>{r.estado}</Badge>
                {r.semana_gestacional && <Badge color="gray">{r.semana_gestacional} sem.</Badge>}
                {ec && <Badge color={ec.color}>Control {ec.label}</Badge>}
              </div>
              {r.fecha_probable_parto && <div className="text-xs text-gray-400">F. probable parto: <span className="font-mono">{fmtFecha(r.fecha_probable_parto)}</span>{dias !== null && <span className={`ml-1 ${dias <= 30 ? "text-amber-400" : "text-gray-600"}`}>{dias > 0 ? `(en ${dias} días)` : "(pasada)"}</span>}</div>}
              {r.proximo_control && <div className="text-xs text-gray-400">Próximo control: <span className="font-mono">{fmtFecha(r.proximo_control)}</span></div>}
              {r.restricciones && <div className="text-xs text-gray-500 mt-1">Restricciones: {r.restricciones}</div>}
            </div>
          );
        })}
        {!loading && !filtered.length && <div className="text-center text-gray-600 text-sm py-8 bg-gray-900 border border-gray-800 rounded-xl">{records.length ? "Sin resultados para el filtro." : "Sin registros."}</div>}
      </div>

      {/* Escritorio: tabla */}
      <div className="hidden md:block bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {["Trabajadora", "Estado", "Semana Gest.", "F. Probable Parto", "Restricciones", "Próximo Control", "Médico", ""].map(h => (
                <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
            {!loading && filtered.map(r => {
              const dias = diasParaParto(r.fecha_probable_parto);
              const ec = estadoControl(r.proximo_control);
              return (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{r.trabajadores?.nombre || "—"}</td>
                  <td className="px-4 py-3"><Badge color={getEstadoBadge(r.estado)}>{r.estado}</Badge></td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-300">{r.semana_gestacional ? `${r.semana_gestacional} sem.` : "—"}</td>
                  <td className="px-4 py-3">
                    {r.fecha_probable_parto ? (
                      <span className="flex flex-col">
                        <span className="font-mono text-xs text-gray-400">{fmtFecha(r.fecha_probable_parto)}</span>
                        {dias !== null && <span className={`text-[10px] font-medium ${dias <= 30 ? "text-amber-400" : "text-gray-600"}`}>{dias > 0 ? `en ${dias} días` : "Pasada"}</span>}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-[160px] truncate">{r.restricciones || <span className="text-gray-600">Ninguna</span>}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.proximo_control ? <span className="flex items-center gap-1.5 text-xs"><span className="font-mono text-gray-400">{fmtFecha(r.proximo_control)}</span>{ec && <Badge color={ec.color}>{ec.label}</Badge>}</span> : <span className="text-gray-600 text-xs">—</span>}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.medico_responsable || "—"}</td>
                  <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button>{puedeEliminar() && (<button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>)}</div></td>
                </tr>
              );
            })}
            {!loading && !filtered.length && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-600 text-sm">{records.length ? "Sin resultados para el filtro aplicado." : "Sin registros. Usa \"Nueva Ficha\" para comenzar."}</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
      </>}

      {showModal && (
        <Modal title={editing ? "Editar Ficha — Trabajadora Gestante" : "Nueva Ficha — Trabajadora Gestante"} onClose={closeModal} wide>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Trabajadora *">
              <Select value={form.trabajador_id} onChange={e => setForm({ ...form, trabajador_id: e.target.value })}>
                <option value="">Seleccionar...</option>
                {workers.filter(w => w.estado !== "Cesado").sort((a,b)=>a.nombre.localeCompare(b.nombre,"es")).map(w => <option key={w.id} value={w.id}>{w.nombre}</option>)}
                  {workers.some(w => w.estado === "Cesado") && <option disabled>── Cesados ──</option>}
                  {workers.filter(w => w.estado === "Cesado").sort((a,b)=>a.nombre.localeCompare(b.nombre,"es")).map(w => <option key={w.id} value={w.id}>{w.nombre} (Cesado)</option>)}
              </Select>
            </FormField>
            <FormField label="Fecha de Registro *">
              <Input type="date" value={form.fecha_registro} onChange={e => setForm({ ...form, fecha_registro: e.target.value })} />
            </FormField>
            <FormField label="Estado">
              <Select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                <option>Gestante</option><option>Post-parto</option><option>Lactancia</option>
              </Select>
            </FormField>
            <FormField label="Semana Gestacional">
              <Input type="number" min="1" max="42" placeholder="20" value={form.semana_gestacional} onChange={e => setForm({ ...form, semana_gestacional: e.target.value })} />
            </FormField>
            <FormField label="Fecha Probable de Parto">
              <Input type="date" value={form.fecha_probable_parto} onChange={e => setForm({ ...form, fecha_probable_parto: e.target.value })} />
            </FormField>
            <FormField label="Periodicidad del control">
              <Select value={form.periodicidad} onChange={e => setForm({ ...form, periodicidad: e.target.value })}>
                {PERIODICIDADES.map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
              {form.periodicidad !== "Único" && form.fecha_registro && <p className="text-xs text-blue-400 mt-1">Próximo control: {fmtFecha(proximoControl(form.fecha_registro, form.periodicidad))}</p>}
            </FormField>
            <FormField label="Restricciones Laborales">
              <Input placeholder="Ej: No carga de peso, no exposición a químicos..." value={form.restricciones} onChange={e => setForm({ ...form, restricciones: e.target.value })} />
            </FormField>
            <FormField label="Médico Responsable">
              <Input placeholder="Nombre del médico" value={form.medico_responsable} onChange={e => setForm({ ...form, medico_responsable: e.target.value })} />
            </FormField>
            <FormField label="Observaciones">
              <Input placeholder="Notas adicionales..." value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
            </FormField>
          </div>
          <div className="flex gap-2 mt-5 justify-end">
            <Btn variant="default" onClick={closeModal}>Cancelar</Btn>
            <Btn variant="primary" disabled={saving} onClick={handleSave}>{saving ? "Guardando..." : editing ? "Actualizar" : "Guardar Ficha"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
