import { useState, useEffect } from 'react';
import { supabase, puedeEliminar } from '../../../lib/supabase.js';
import { showToast } from '../../../lib/toast.jsx';
import { calcularEdad, calcularVigencia, fmtFecha, PERIODICIDADES, proximoControl, estadoControl } from '../../../lib/helpers.js';
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

export default function DisergonomiaModulo({ workers, empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const initForm = { trabajador_id: "", fecha_evaluacion: new Date().toISOString().split("T")[0], area_puesto: "", tipo_riesgo: "Postural", metodo_evaluacion: "REBA", puntuacion: "", nivel_riesgo: "Medio", medidas_adoptadas: "", proximo_control: "", medico_responsable: "", observaciones: "", periodicidad: "Anual" };
  const [form, setForm] = useState(initForm);
  const [subtab, setSubtab] = useState("eval");
  const [showGuide, setShowGuide] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vigilancia_disergonomia")
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

  const openEdit = (r) => { setForm({ trabajador_id: r.trabajador_id, fecha_evaluacion: r.fecha_evaluacion, area_puesto: r.area_puesto || "", tipo_riesgo: r.tipo_riesgo || "Postural", metodo_evaluacion: r.metodo_evaluacion || "REBA", puntuacion: r.puntuacion != null ? String(r.puntuacion) : "", nivel_riesgo: r.nivel_riesgo || "Medio", medidas_adoptadas: r.medidas_adoptadas || "", proximo_control: r.proximo_control || "", medico_responsable: r.medico_responsable || "", observaciones: r.observaciones || "", periodicidad: r.periodicidad || "Anual" }); setEditing(r.id); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(initForm); };
  const handleDelete = async (id) => { if (!confirm("¿Eliminar este registro?")) return; await supabase.from("vigilancia_disergonomia").delete().eq("id", id); showToast("Eliminado", "info"); load(); };

  const handleSave = async () => {
    if (!form.trabajador_id || !form.fecha_evaluacion) {
      showToast("Selecciona trabajador y fecha", "error"); return;
    }
    setSaving(true);
    const payload = { empresa_id: empresaId, trabajador_id: form.trabajador_id, fecha_evaluacion: form.fecha_evaluacion, area_puesto: form.area_puesto, tipo_riesgo: form.tipo_riesgo, metodo_evaluacion: form.metodo_evaluacion, puntuacion: form.puntuacion ? parseFloat(form.puntuacion) : null, nivel_riesgo: form.nivel_riesgo, medidas_adoptadas: form.medidas_adoptadas, periodicidad: form.periodicidad, proximo_control: proximoControl(form.fecha_evaluacion, form.periodicidad) || form.proximo_control || null, medico_responsable: form.medico_responsable, observaciones: form.observaciones };
    const { error } = editing ? await supabase.from("vigilancia_disergonomia").update(payload).eq("id", editing) : await supabase.from("vigilancia_disergonomia").insert(payload);
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast(editing ? "Registro actualizado" : "Evaluación registrada", "success");
    closeModal(); load();
  };

  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [fArea, setFArea] = useState("");
  const now = new Date();
  const thisMes = records.filter(r => { const d = new Date(r.fecha_evaluacion); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const altoRiesgo = records.filter(r => r.nivel_riesgo === "Alto" || r.nivel_riesgo === "Muy Alto");
  const sinMedidas = records.filter(r => (r.nivel_riesgo === "Alto" || r.nivel_riesgo === "Muy Alto") && !r.medidas_adoptadas);
  const areaOptsD = [...new Set(records.map(r => r.area_puesto).filter(Boolean))].sort();
  const filtered = records.filter(r =>
    (!fFrom || r.fecha_evaluacion >= fFrom) && (!fTo || r.fecha_evaluacion <= fTo) && (!fArea || r.area_puesto === fArea));

  return (
    <div>
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Riesgos Disergonómicos</h3>
          <p className="text-gray-500 text-xs max-w-xl">Evaluación de riesgos posturales, carga física y movimientos repetitivos. Métodos REBA, RULA, OWAS, NIOSH. (R.M. 375-2008-TR)</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <Btn size="sm" onClick={() => setShowGuide(true)}><HelpCircle size={13} /> Guía</Btn>
          {subtab === "eval" && <>
            <ExportBtn data={records.map(r => ({ Trabajador: r.trabajadores?.nombre || "", Fecha: r.fecha_evaluacion, "Área/Puesto": r.area_puesto || "", "Tipo Riesgo": r.tipo_riesgo, Método: r.metodo_evaluacion, Puntuación: r.puntuacion ?? "", "Nivel Riesgo": r.nivel_riesgo, "Medidas Adoptadas": r.medidas_adoptadas || "", "Próx. Control": r.proximo_control || "" }))} filename="disergonomia" />
            <Btn size="sm" variant="primary" onClick={() => { setEditing(null); setForm(initForm); setShowModal(true); }}><Plus size={13} /> Nueva Evaluación</Btn>
          </>}
        </div>
      </div>

      {/* Pestañas internas */}
      <div className="flex gap-1.5 bg-gray-900/60 border border-gray-800 rounded-lg p-1 mb-5 w-fit flex-wrap">
        {[["eval", "Evaluaciones"], ["controles", "Controles"], ["cronograma", "Cronograma de Actividades"]].map(([k, l]) => (
          <button key={k} onClick={() => setSubtab(k)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${subtab === k ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-200"}`}>{l}</button>
        ))}
      </div>

      {showGuide && <VigGuideModal titulo={VIG_GUIAS.disergonomia.titulo} campos={VIG_GUIAS.disergonomia.campos} onClose={() => setShowGuide(false)} />}

      {subtab === "controles" && <SeguimientoPanel programa="disergonomia" empresaId={empresaId} workers={workers} />}
      {subtab === "cronograma" && <CronogramaActividades programa="disergonomia" empresaId={empresaId} workers={workers} />}

      {subtab === "eval" && <>
      <div className="grid grid-cols-3 gap-4 mb-5">
        <KpiCard label="Evaluaciones este mes" value={thisMes.length} sub="Registros del mes actual" accentColor="blue" />
        <KpiCard label="Riesgo Alto / Muy Alto" value={altoRiesgo.length} sub="Requieren intervención" accentColor="amber" />
        <KpiCard label="Sin medidas adoptadas" value={sinMedidas.length} sub="Alto riesgo sin control" accentColor="red" />
      </div>

      {sinMedidas.length > 0 && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 text-xs font-semibold mb-1">{sinMedidas.length} trabajador(es) con riesgo alto sin medidas correctivas registradas</p>
            <p className="text-red-600 text-xs">Implementar controles de ingeniería o administrativos y actualizar el registro.</p>
          </div>
        </div>
      )}

      <FilterBar dateFrom={fFrom} dateTo={fTo} onDateFrom={setFFrom} onDateTo={setFTo} area={fArea} onArea={setFArea} areaOptions={areaOptsD} />

      {/* Móvil: tarjetas */}
      <div className="md:hidden space-y-2.5">
        {!loading && filtered.map(r => {
          const ec = estadoControl(r.proximo_control);
          return (
            <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3.5">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <div className="font-semibold text-white text-sm leading-tight">{r.trabajadores?.nombre || "—"}</div>
                  <div className="text-xs text-gray-500 font-mono mt-0.5">{fmtFecha(r.fecha_evaluacion)}{r.area_puesto ? ` · ${r.area_puesto}` : ""}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400"><Pencil size={14} /></button>
                  {puedeEliminar() && (
                  <button onClick={() => handleDelete(r.id)} className="text-red-500/50 hover:text-red-400"><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <Badge color="blue">{r.tipo_riesgo}</Badge>
                <Badge color={getNivelColor(r.nivel_riesgo)}>{r.nivel_riesgo}{r.puntuacion != null ? ` (${r.puntuacion})` : ""}</Badge>
                {r.metodo_evaluacion && <Badge color="gray">{r.metodo_evaluacion}</Badge>}
                {ec && <Badge color={ec.color}>Control {ec.label}</Badge>}
              </div>
              <div className="text-xs text-gray-400">Medidas: {r.medidas_adoptadas || <span className="text-red-500">Sin registrar</span>}</div>
              {r.proximo_control && <div className="text-xs text-gray-400">Próximo control: <span className="font-mono">{fmtFecha(r.proximo_control)}</span></div>}
              {r.observaciones && <div className="text-xs text-gray-500 mt-1">{r.observaciones}</div>}
            </div>
          );
        })}
        {!loading && !filtered.length && <div className="text-center text-gray-600 text-sm py-8 bg-gray-900 border border-gray-800 rounded-xl">{records.length ? "Sin resultados para el filtro." : "Sin evaluaciones registradas."}</div>}
      </div>

      {/* Escritorio: tabla */}
      <div className="hidden md:block bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {["Trabajador", "Área / Puesto", "Tipo Riesgo", "Método", "Puntuación", "Nivel Riesgo", "Medidas Adoptadas", "Próximo Control", ""].map(h => (
                <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
            {!loading && filtered.map(r => {
              const ec = estadoControl(r.proximo_control);
              return (
              <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{r.trabajadores?.nombre || "—"}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{r.area_puesto || "—"}</td>
                <td className="px-4 py-3"><Badge color="blue">{r.tipo_riesgo}</Badge></td>
                <td className="px-4 py-3 text-gray-400 text-xs font-mono">{r.metodo_evaluacion || "—"}</td>
                <td className="px-4 py-3 font-mono font-bold text-gray-200">{r.puntuacion ?? "—"}</td>
                <td className="px-4 py-3"><Badge color={getNivelColor(r.nivel_riesgo)}>{r.nivel_riesgo}</Badge></td>
                <td className="px-4 py-3 text-gray-400 text-xs max-w-[180px] truncate">
                  {r.medidas_adoptadas || <span className="text-red-500 text-xs">Sin registrar</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{r.proximo_control ? <span className="flex items-center gap-1.5 text-xs"><span className="font-mono text-gray-400">{fmtFecha(r.proximo_control)}</span>{ec && <Badge color={ec.color}>{ec.label}</Badge>}</span> : <span className="text-gray-600 text-xs">—</span>}</td>
                <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button>{puedeEliminar() && (<button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>)}</div></td>
              </tr>
              );
            })}
            {!loading && !filtered.length && (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-600 text-sm">{records.length ? "Sin resultados para el filtro aplicado." : "Sin evaluaciones. Usa \"Nueva Evaluación\" para comenzar."}</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
      </>}

      {showModal && (
        <Modal title={editing ? "Editar — Disergonomía" : "Nueva Evaluación — Disergonomía"} onClose={closeModal} wide>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 mb-4 text-xs text-gray-400">
            <p className="font-semibold text-gray-300 mb-1">Niveles de riesgo</p>
            <div className="grid grid-cols-4 gap-2">
              <span className="text-emerald-400">Bajo: Aceptable</span>
              <span className="text-amber-400">Medio: Mejorar</span>
              <span className="text-orange-400">Alto: Pronto</span>
              <span className="text-red-400">Muy Alto: Inmediato ⚠</span>
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
            <FormField label="Área / Puesto de Trabajo">
              <Input placeholder="Ej: Almacén / Estibador" value={form.area_puesto} onChange={e => setForm({ ...form, area_puesto: e.target.value })} />
            </FormField>
            <FormField label="Tipo de Riesgo">
              <Select value={form.tipo_riesgo} onChange={e => setForm({ ...form, tipo_riesgo: e.target.value })}>
                <option>Postural</option>
                <option>Carga física</option>
                <option>Movimientos repetitivos</option>
                <option>Vibración</option>
                <option>Pantalla de visualización</option>
              </Select>
            </FormField>
            <FormField label="Método de Evaluación">
              <Select value={form.metodo_evaluacion} onChange={e => setForm({ ...form, metodo_evaluacion: e.target.value })}>
                <option>REBA</option>
                <option>RULA</option>
                <option>OWAS</option>
                <option>NIOSH</option>
                <option>Check List OCRA</option>
                <option>Otro</option>
              </Select>
            </FormField>
            <FormField label="Puntuación obtenida">
              <Input type="number" step="0.1" placeholder="7" value={form.puntuacion} onChange={e => setForm({ ...form, puntuacion: e.target.value })} />
            </FormField>
            <FormField label="Nivel de Riesgo">
              <Select value={form.nivel_riesgo} onChange={e => setForm({ ...form, nivel_riesgo: e.target.value })}>
                <option>Bajo</option>
                <option>Medio</option>
                <option>Alto</option>
                <option>Muy Alto</option>
              </Select>
            </FormField>
            <FormField label="Periodicidad del control">
              <Select value={form.periodicidad} onChange={e => setForm({ ...form, periodicidad: e.target.value })}>
                {PERIODICIDADES.map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
              {form.periodicidad !== "Único" && form.fecha_evaluacion && <p className="text-xs text-blue-400 mt-1">Próximo control: {fmtFecha(proximoControl(form.fecha_evaluacion, form.periodicidad))}</p>}
            </FormField>
            <FormField label="Próximo Control (manual)">
              <Input type="date" value={form.proximo_control} onChange={e => setForm({ ...form, proximo_control: e.target.value })} />
            </FormField>
            <FormField label="Medidas Adoptadas">
              <Input placeholder="Ej: Capacitación postural, faja lumbar, rediseño de puesto..." value={form.medidas_adoptadas} onChange={e => setForm({ ...form, medidas_adoptadas: e.target.value })} />
            </FormField>
            <FormField label="Médico / Ergónomo Responsable">
              <Input placeholder="Nombre del profesional" value={form.medico_responsable} onChange={e => setForm({ ...form, medico_responsable: e.target.value })} />
            </FormField>
            <FormField label="Observaciones">
              <Input placeholder="Notas adicionales..." value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
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
