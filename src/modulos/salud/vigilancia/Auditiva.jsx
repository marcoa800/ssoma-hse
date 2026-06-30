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

export default function AuditivaModulo({ workers, empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const initForm = { trabajador_id: "", fecha_evaluacion: new Date().toISOString().split("T")[0], area_puesto: "", db_exposicion: "", tipo_epp: "", fecha_audiometria: "", resultado_audiometria: "Normal", oido_derecho_db: "", oido_izquierdo_db: "", proximo_control: "", medico_responsable: "", observaciones: "", periodicidad: "Anual" };
  const [form, setForm] = useState(initForm);
  const [subtab, setSubtab] = useState("eval");
  const [showGuide, setShowGuide] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vigilancia_auditiva")
      .select("*, trabajadores(nombre)")
      .eq("empresa_id", empresaId)
      .order("fecha_evaluacion", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const getResultadoColor = (r) => {
    if (r === "Normal") return "green";
    if (r === "Hipoacusia Leve") return "amber";
    if (r === "Hipoacusia Moderada") return "orange";
    if (r === "Hipoacusia Severa") return "red";
    return "gray";
  };

  const getDbColor = (db) => {
    const v = parseFloat(db);
    if (!v) return "gray";
    if (v >= 95) return "text-red-400";
    if (v >= 85) return "text-amber-400";
    return "text-emerald-400";
  };

  const proximosControl = records.filter(r => {
    if (!r.proximo_control) return false;
    const diff = new Date(r.proximo_control) - new Date();
    return diff >= 0 && diff <= 30 * 24 * 60 * 60 * 1000;
  });

  const openEdit = (r) => { setForm({ trabajador_id: r.trabajador_id, fecha_evaluacion: r.fecha_evaluacion, area_puesto: r.area_puesto || "", db_exposicion: r.db_exposicion != null ? String(r.db_exposicion) : "", tipo_epp: r.tipo_epp || "", fecha_audiometria: r.fecha_audiometria || "", resultado_audiometria: r.resultado_audiometria || "Normal", oido_derecho_db: r.oido_derecho_db != null ? String(r.oido_derecho_db) : "", oido_izquierdo_db: r.oido_izquierdo_db != null ? String(r.oido_izquierdo_db) : "", proximo_control: r.proximo_control || "", medico_responsable: r.medico_responsable || "", observaciones: r.observaciones || "", periodicidad: r.periodicidad || "Anual" }); setEditing(r.id); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(initForm); };
  const handleDelete = async (id) => { if (!confirm("¿Eliminar este registro?")) return; await supabase.from("vigilancia_auditiva").delete().eq("id", id); showToast("Eliminado", "info"); load(); };

  const handleSave = async () => {
    if (!form.trabajador_id || !form.fecha_evaluacion) {
      showToast("Selecciona trabajador y fecha", "error"); return;
    }
    setSaving(true);
    const payload = { empresa_id: empresaId, trabajador_id: form.trabajador_id, fecha_evaluacion: form.fecha_evaluacion, area_puesto: form.area_puesto, db_exposicion: form.db_exposicion ? parseFloat(form.db_exposicion) : null, tipo_epp: form.tipo_epp, fecha_audiometria: form.fecha_audiometria || null, resultado_audiometria: form.resultado_audiometria, oido_derecho_db: form.oido_derecho_db ? parseFloat(form.oido_derecho_db) : null, oido_izquierdo_db: form.oido_izquierdo_db ? parseFloat(form.oido_izquierdo_db) : null, periodicidad: form.periodicidad, proximo_control: proximoControl(form.fecha_evaluacion, form.periodicidad) || form.proximo_control || null, medico_responsable: form.medico_responsable, observaciones: form.observaciones };
    const { error } = editing ? await supabase.from("vigilancia_auditiva").update(payload).eq("id", editing) : await supabase.from("vigilancia_auditiva").insert(payload);
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
  const conHipoacusia = records.filter(r => r.resultado_audiometria && r.resultado_aviometria !== "Normal" && r.resultado_audiometria !== "Normal");
  const altoRiesgo = records.filter(r => r.db_exposicion >= 95);
  const areaOptsA = [...new Set(records.map(r => r.area_puesto).filter(Boolean))].sort();
  const filtered = records.filter(r =>
    (!fFrom || r.fecha_evaluacion >= fFrom) && (!fTo || r.fecha_evaluacion <= fTo) && (!fArea || r.area_puesto === fArea));

  return (
    <div>
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Protección Auditiva</h3>
          <p className="text-gray-500 text-xs max-w-xl">Programa de conservación de la audición. Control de exposición al ruido (dB) y seguimiento audiométrico. (R.M. 375-2008-TR)</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <Btn size="sm" onClick={() => setShowGuide(true)}><HelpCircle size={13} /> Guía</Btn>
          {subtab === "eval" && <>
            <ExportBtn data={records.map(r => ({ Trabajador: r.trabajadores?.nombre || "", Fecha: r.fecha_evaluacion, "Área/Puesto": r.area_puesto || "", "dB Exposición": r.db_exposicion ?? "", "Tipo EPP": r.tipo_epp || "", "Resultado Audiometría": r.resultado_audiometria || "", "OD (dB)": r.oido_derecho_db ?? "", "OI (dB)": r.oido_izquierdo_db ?? "", "Próx. Control": r.proximo_control || "" }))} filename="proteccion_auditiva" />
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

      {showGuide && <VigGuideModal titulo={VIG_GUIAS.auditiva.titulo} campos={VIG_GUIAS.auditiva.campos} onClose={() => setShowGuide(false)} />}

      {subtab === "controles" && <SeguimientoPanel programa="auditiva" empresaId={empresaId} workers={workers} />}
      {subtab === "cronograma" && <CronogramaActividades programa="auditiva" empresaId={empresaId} workers={workers} />}

      {subtab === "eval" && <>
      <div className="grid grid-cols-3 gap-4 mb-5">
        <KpiCard label="Evaluaciones este mes" value={thisMes.length} sub="Registros del mes actual" accentColor="blue" />
        <KpiCard label="Con hipoacusia" value={conHipoacusia.length} sub="Resultado anormal" accentColor="amber" />
        <KpiCard label="Exposición ≥ 95 dB" value={altoRiesgo.length} sub="Riesgo alto — control urgente" accentColor="red" />
      </div>

      {altoRiesgo.length > 0 && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 text-xs font-semibold mb-1">{altoRiesgo.length} trabajador(es) con exposición ≥ 95 dB</p>
            <p className="text-red-600 text-xs">Verificar uso de EPP auditivo y evaluar medidas de ingeniería para reducción de ruido en fuente.</p>
          </div>
        </div>
      )}

      <FilterBar dateFrom={fFrom} dateTo={fTo} onDateFrom={setFFrom} onDateTo={setFTo} area={fArea} onArea={setFArea} areaOptions={areaOptsA} />

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
                <Badge color={getResultadoColor(r.resultado_audiometria)}>{r.resultado_audiometria || "—"}</Badge>
                {r.db_exposicion ? <Badge color={parseFloat(r.db_exposicion) >= 95 ? "red" : parseFloat(r.db_exposicion) >= 85 ? "amber" : "green"}>{r.db_exposicion} dB</Badge> : null}
                {ec && <Badge color={ec.color}>Control {ec.label}</Badge>}
              </div>
              {r.tipo_epp && <div className="text-xs text-gray-400">EPP: {r.tipo_epp}</div>}
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
              {["Trabajador", "Área / Puesto", "dB Exposición", "EPP Auditivo", "Audiometría", "Resultado", "Próximo Control", ""].map(h => (
                <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
            {!loading && filtered.map(r => {
              const ec = estadoControl(r.proximo_control);
              return (
              <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{r.trabajadores?.nombre || "—"}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{r.area_puesto || "—"}</td>
                <td className="px-4 py-3">
                  {r.db_exposicion ? (
                    <span className={`font-mono font-bold ${getDbColor(r.db_exposicion)}`}>{r.db_exposicion} dB</span>
                  ) : <span className="text-gray-600">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{r.tipo_epp || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{r.fecha_audiometria ? fmtFecha(r.fecha_audiometria) : "—"}</td>
                <td className="px-4 py-3"><Badge color={getResultadoColor(r.resultado_audiometria)}>{r.resultado_audiometria || "—"}</Badge></td>
                <td className="px-4 py-3 whitespace-nowrap">{r.proximo_control ? <span className="flex items-center gap-1.5 text-xs"><span className="font-mono text-gray-400">{fmtFecha(r.proximo_control)}</span>{ec && <Badge color={ec.color}>{ec.label}</Badge>}</span> : <span className="text-gray-600 text-xs">—</span>}</td>
                <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button>{puedeEliminar() && (<button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>)}</div></td>
              </tr>
              );
            })}
            {!loading && !filtered.length && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-600 text-sm">{records.length ? "Sin resultados para el filtro aplicado." : "Sin evaluaciones. Usa \"Nueva Evaluación\" para comenzar."}</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
      </>}

      {showModal && (
        <Modal title={editing ? "Editar — Protección Auditiva" : "Nueva Evaluación — Protección Auditiva"} onClose={closeModal} wide>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 mb-4 text-xs text-gray-400">
            <p className="font-semibold text-gray-300 mb-1">Referencia de exposición al ruido</p>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-emerald-400">&lt; 85 dB: Sin riesgo</span>
              <span className="text-amber-400">85–94 dB: Riesgo — EPP obligatorio</span>
              <span className="text-red-400">≥ 95 dB: Riesgo alto ⚠</span>
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
              <Input placeholder="Ej: Planta de producción / Operador" value={form.area_puesto} onChange={e => setForm({ ...form, area_puesto: e.target.value })} />
            </FormField>
            <FormField label="Nivel de Exposición (dB)">
              <Input type="number" step="0.1" placeholder="85" value={form.db_exposicion} onChange={e => setForm({ ...form, db_exposicion: e.target.value })} />
              {form.db_exposicion && (
                <p className={`text-xs mt-1 font-medium ${getDbColor(form.db_exposicion)}`}>
                  {parseFloat(form.db_exposicion) >= 95 ? "→ Riesgo alto" : parseFloat(form.db_exposicion) >= 85 ? "→ Riesgo — EPP obligatorio" : "→ Sin riesgo"}
                </p>
              )}
            </FormField>
            <FormField label="Tipo de EPP Auditivo Asignado">
              <Select value={form.tipo_epp} onChange={e => setForm({ ...form, tipo_epp: e.target.value })}>
                <option value="">Seleccionar...</option>
                <option>Tapones auditivos desechables</option>
                <option>Tapones auditivos reutilizables</option>
                <option>Orejeras / Protectores de copa</option>
                <option>Orejeras acopladas a casco</option>
                <option>No aplica</option>
              </Select>
            </FormField>
            <FormField label="Resultado Audiometría">
              <Select value={form.resultado_audiometria} onChange={e => setForm({ ...form, resultado_audiometria: e.target.value })}>
                <option>Normal</option>
                <option>Hipoacusia Leve</option>
                <option>Hipoacusia Moderada</option>
                <option>Hipoacusia Severa</option>
              </Select>
            </FormField>
            <FormField label="Fecha Audiometría">
              <Input type="date" value={form.fecha_audiometria} onChange={e => setForm({ ...form, fecha_audiometria: e.target.value })} />
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
            <FormField label="Umbral auditivo OD (dBHL)">
              <Input type="number" placeholder="25" value={form.oido_derecho_db} onChange={e => setForm({ ...form, oido_derecho_db: e.target.value })} />
            </FormField>
            <FormField label="Umbral auditivo OI (dBHL)">
              <Input type="number" placeholder="25" value={form.oido_izquierdo_db} onChange={e => setForm({ ...form, oido_izquierdo_db: e.target.value })} />
            </FormField>
            <FormField label="Médico Responsable">
              <Input placeholder="Nombre del médico" value={form.medico_responsable} onChange={e => setForm({ ...form, medico_responsable: e.target.value })} />
            </FormField>
            <FormField label="Observaciones">
              <Input placeholder="Restricciones, seguimiento..." value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
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
