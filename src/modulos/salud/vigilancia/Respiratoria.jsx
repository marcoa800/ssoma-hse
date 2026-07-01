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

export default function ProteccionRespiratoriaModulo({ workers, empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const initForm = {
    trabajador_id: "", fecha_evaluacion: "", agente_exposicion: "",
    tipo_respirador: "", prueba_ajuste: "Pendiente", fecha_prueba_ajuste: "",
    espirometria: "Pendiente", fecha_espirometria: "", proxima_revision: "", periodicidad: "Anual", observaciones: "",
  };
  const [form, setForm] = useState(initForm);
  const [subtab, setSubtab] = useState("eval");
  const [showGuide, setShowGuide] = useState(false);

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

  const [sort, setSort] = useState("fecha");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  const ajusteColor = (v) => v === "Aprobado" ? "green" : v === "Rechazado" ? "red" : "amber";
  const espiroColor = (v) => v === "Normal" ? "green" : v === "Pendiente" ? "amber" : "red";

  const resetForm = () => setForm(initForm);
  const openEdit = (r) => { setForm({ trabajador_id: r.trabajador_id, fecha_evaluacion: r.fecha_evaluacion, agente_exposicion: r.agente_exposicion || "", tipo_respirador: r.tipo_respirador || "", prueba_ajuste: r.prueba_ajuste || "Pendiente", fecha_prueba_ajuste: r.fecha_prueba_ajuste || "", espirometria: r.espirometria || "Pendiente", fecha_espirometria: r.fecha_espirometria || "", proxima_revision: r.proxima_revision || "", periodicidad: r.periodicidad || "Anual", observaciones: r.observaciones || "" }); setEditing(r.id); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); resetForm(); };

  const handleSave = async () => {
    if (!form.trabajador_id || !form.fecha_evaluacion) { showToast("Trabajador y fecha son obligatorios", "error"); return; }
    setSaving(true);
    const payload = { ...form, empresa_id: empresaId, periodicidad: form.periodicidad, proximo_control: proximoControl(form.fecha_evaluacion, form.periodicidad) };
    const { error } = editing ? await supabase.from("vigilancia_respiratoria").update(payload).eq("id", editing) : await supabase.from("vigilancia_respiratoria").insert(payload);
    if (error) { showToast("Error: " + error.message, "error"); }
    else { showToast(editing ? "Registro actualizado" : "Registro guardado", "success"); closeModal(); load(); }
    setSaving(false);
  };
  const handleDelete = async (id) => { if (!confirm("¿Eliminar?")) return; await supabase.from("vigilancia_respiratoria").delete().eq("id", id); showToast("Eliminado", "info"); load(); };

  const filtered = records.filter(r => (!fFrom || r.fecha_evaluacion >= fFrom) && (!fTo || r.fecha_evaluacion <= fTo)).sort((a, b) => {
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
          <h3 className="text-white font-semibold text-sm mb-1">Protección Respiratoria</h3>
          <p className="text-gray-500 text-xs max-w-xl">Programa de protección respiratoria para trabajadores expuestos a polvos, gases, vapores y agentes inhalables. Control de prueba de ajuste y espirometría.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <Btn size="sm" onClick={() => setShowGuide(true)}><HelpCircle size={13} /> Guía</Btn>
          {subtab === "eval" && <>
            <ExportBtn data={records.map(r => ({ Trabajador: r.trabajadores?.nombre || "", Fecha: r.fecha_evaluacion, "Agente Exposición": r.agente_exposicion || "", "Tipo Respirador": r.tipo_respirador || "", "Prueba Ajuste": r.prueba_ajuste, "F. Ajuste": r.fecha_prueba_ajuste || "", Espirometría: r.espirometria, "F. Espiro": r.fecha_espirometria || "", "Próximo control": r.proximo_control || "", "Próx. Revisión": r.proxima_revision || "" }))} filename="proteccion_respiratoria" />
            <Btn size="sm" variant="primary" onClick={() => { setEditing(null); resetForm(); setShowModal(true); }}><Plus size={13} /> Nuevo Registro</Btn>
          </>}
        </div>
      </div>

      {/* Pestañas internas */}
      <div className="flex gap-1.5 bg-gray-900/60 border border-gray-800 rounded-lg p-1 mb-5 w-fit flex-wrap">
        {[["eval", "Evaluaciones"], ["controles", "Controles"], ["cronograma", "Cronograma de Actividades"]].map(([k, l]) => (
          <button key={k} onClick={() => setSubtab(k)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${subtab === k ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-200"}`}>{l}</button>
        ))}
      </div>

      {showGuide && <VigGuideModal titulo={VIG_GUIAS.respiratoria.titulo} campos={VIG_GUIAS.respiratoria.campos} onClose={() => setShowGuide(false)} />}

      {subtab === "controles" && <SeguimientoPanel programa="respiratoria" empresaId={empresaId} workers={workers} />}
      {subtab === "cronograma" && <CronogramaActividades programa="respiratoria" empresaId={empresaId} workers={workers} />}

      {subtab === "eval" && <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <KpiCard label="Bajo programa" value={records.length} sub={`${delMes.length} evaluados este mes`} accentColor="blue" />
        <KpiCard label="Prueba de ajuste aprobada" value={records.length ? `${Math.round(ajusteAprobado / records.length * 100)}%` : "—"} sub={`${ajusteAprobado} de ${records.length} trabajadores`} accentColor="green" />
        <KpiCard label="Espirometría pendiente" value={espiroPendiente} sub="requieren evaluación pulmonar" accentColor="amber" />
      </div>

      <FilterBar dateFrom={fFrom} dateTo={fTo} onDateFrom={setFFrom} onDateTo={setFTo} sort={sort} onSort={setSort} />

      {/* Móvil: tarjetas */}
      <div className="md:hidden space-y-2.5">
        {!loading && filtered.map(r => {
          const ec = estadoControl(r.proximo_control);
          return (
            <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3.5">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <div className="font-semibold text-white text-sm leading-tight">{r.trabajadores?.nombre || "—"}</div>
                  <div className="text-xs text-gray-500 font-mono mt-0.5">{fmtFecha(r.fecha_evaluacion)}{r.agente_exposicion ? ` · ${r.agente_exposicion}` : ""}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400"><Pencil size={14} /></button>
                  {puedeEliminar() && (
                  <button onClick={() => handleDelete(r.id)} className="text-red-500/50 hover:text-red-400"><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <Badge color={ajusteColor(r.prueba_ajuste)}>Ajuste: {r.prueba_ajuste}</Badge>
                <Badge color={espiroColor(r.espirometria)}>Espiro: {r.espirometria}</Badge>
                {ec && <Badge color={ec.color}>Control {ec.label}</Badge>}
              </div>
              {r.tipo_respirador && <div className="text-xs text-gray-400">{r.tipo_respirador}</div>}
              {r.proximo_control && <div className="text-xs text-gray-400">Próximo control: <span className="font-mono">{fmtFecha(r.proximo_control)}</span></div>}
              {r.observaciones && <div className="text-xs text-gray-500 mt-1">{r.observaciones}</div>}
            </div>
          );
        })}
        {!loading && !filtered.length && <div className="text-center text-gray-600 text-sm py-8 bg-gray-900 border border-gray-800 rounded-xl">{records.length ? "Sin resultados para el filtro." : "Sin registros de protección respiratoria."}</div>}
      </div>

      {/* Escritorio: tabla */}
      <div className="hidden md:block bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800">
              {["Trabajador", "Fecha", "Agente Exposición", "Tipo Respirador", "Prueba Ajuste", "F. Ajuste", "Espirometría", "F. Espiro", "Próximo Control", ""].map(h => (
                <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
              {!loading && filtered.map(r => {
                const ec = estadoControl(r.proximo_control);
                return (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{r.trabajadores?.nombre || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">{fmtFecha(r.fecha_evaluacion)}</td>
                  <td className="px-4 py-3 text-gray-300 text-xs">{r.agente_exposicion || "—"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{r.tipo_respirador || "—"}</td>
                  <td className="px-4 py-3"><Badge color={ajusteColor(r.prueba_ajuste)}>{r.prueba_ajuste}</Badge></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.fecha_prueba_ajuste || "—"}</td>
                  <td className="px-4 py-3"><Badge color={espiroColor(r.espirometria)}>{r.espirometria}</Badge></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.fecha_espirometria || "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.proximo_control ? <span className="flex items-center gap-1.5 text-xs"><span className="font-mono text-gray-400">{fmtFecha(r.proximo_control)}</span>{ec && <Badge color={ec.color}>{ec.label}</Badge>}</span> : <span className="text-gray-600 text-xs">—</span>}</td>
                  <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button>{puedeEliminar() && (<button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>)}</div></td>
                </tr>
              );
              })}
              {!loading && !filtered.length && <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-600 text-sm">{records.length ? "Sin resultados para el filtro aplicado." : "Sin registros de protección respiratoria"}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      </>}

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Fecha Evaluación *"><Input type="date" value={form.fecha_evaluacion} onChange={e => setForm(f => ({ ...f, fecha_evaluacion: e.target.value }))} /></FormField>
              <FormField label="Agente de Exposición"><Input value={form.agente_exposicion} onChange={e => setForm(f => ({ ...f, agente_exposicion: e.target.value }))} placeholder="Sílice, polvo madera, gases..." /></FormField>
            </div>
            <FormField label="Tipo de Respirador">
              <Select value={form.tipo_respirador} onChange={e => setForm(f => ({ ...f, tipo_respirador: e.target.value }))}>
                <option value="">Seleccionar...</option>
                {["Semifacial filtrante N95","Semifacial filtrante FFP2","Semifacial con filtros intercambiables","Cara completa","Respirador de escape","Equipo autónomo (SCBA)","Línea de aire"].map(t => <option key={t}>{t}</option>)}
              </Select>
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Prueba de Ajuste">
                <Select value={form.prueba_ajuste} onChange={e => setForm(f => ({ ...f, prueba_ajuste: e.target.value }))}>
                  {["Pendiente","Aprobado","Rechazado"].map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Fecha Prueba Ajuste"><Input type="date" value={form.fecha_prueba_ajuste} onChange={e => setForm(f => ({ ...f, fecha_prueba_ajuste: e.target.value }))} /></FormField>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Espirometría">
                <Select value={form.espirometria} onChange={e => setForm(f => ({ ...f, espirometria: e.target.value }))}>
                  {["Pendiente","Normal","Restricción leve","Restricción moderada","Obstrucción leve","Obstrucción moderada","Obstrucción severa"].map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Fecha Espirometría"><Input type="date" value={form.fecha_espirometria} onChange={e => setForm(f => ({ ...f, fecha_espirometria: e.target.value }))} /></FormField>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Próxima Revisión"><Input type="date" value={form.proxima_revision} onChange={e => setForm(f => ({ ...f, proxima_revision: e.target.value }))} /></FormField>
              <FormField label="Periodicidad del control">
                <Select value={form.periodicidad} onChange={e => setForm(f => ({ ...f, periodicidad: e.target.value }))}>
                  {PERIODICIDADES.map(p => <option key={p} value={p}>{p}</option>)}
                </Select>
                {form.periodicidad !== "Único" && form.fecha_evaluacion && <p className="text-xs text-blue-400 mt-1">Próximo control: {fmtFecha(proximoControl(form.fecha_evaluacion, form.periodicidad))}</p>}
              </FormField>
            </div>
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
