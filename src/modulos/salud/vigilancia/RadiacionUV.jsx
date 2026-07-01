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

export default function RadiacionUVModulo({ workers, empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    trabajador_id: "", fecha_evaluacion: "", zona_area: "",
    horas_exposicion: "", indice_uv: "", epp_asignado: "",
    fotoprotector: "Sí", proxima_revision: "", observaciones: "", periodicidad: "Anual",
  });
  const [subtab, setSubtab] = useState("eval");
  const [showGuide, setShowGuide] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vigilancia_radiacion")
      .select("*, trabajadores(nombre)")
      .eq("empresa_id", empresaId)
      .order("fecha_evaluacion", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  function nivelUV(idx) {
    const v = Number(idx);
    if (v >= 11) return "Extremo";
    if (v >= 8) return "Muy Alto";
    if (v >= 6) return "Alto";
    if (v >= 3) return "Moderado";
    return "Bajo";
  }
  function nivelColor(n) {
    return n === "Extremo" ? "purple" : n === "Muy Alto" ? "red" : n === "Alto" ? "amber" : n === "Moderado" ? "blue" : "green";
  }

  const altoRiesgo = records.filter(r => ["Alto", "Muy Alto", "Extremo"].includes(nivelUV(r.indice_uv)));
  const now = new Date();
  const delMes = records.filter(r => { const f = new Date(r.fecha_evaluacion + "T00:00:00"); return f.getMonth() === now.getMonth() && f.getFullYear() === now.getFullYear(); });

  const [sort, setSort] = useState("fecha");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  const [editing, setEditing] = useState(null);
  const resetForm = () => setForm({ trabajador_id: "", fecha_evaluacion: "", zona_area: "", horas_exposicion: "", indice_uv: "", epp_asignado: "", fotoprotector: "Sí", proxima_revision: "", observaciones: "", periodicidad: "Anual" });
  const openEdit = (r) => { setForm({ trabajador_id: r.trabajador_id, fecha_evaluacion: r.fecha_evaluacion, zona_area: r.zona_area || "", horas_exposicion: r.horas_exposicion != null ? String(r.horas_exposicion) : "", indice_uv: r.indice_uv != null ? String(r.indice_uv) : "", epp_asignado: r.epp_asignado || "", fotoprotector: r.fotoprotector || "Sí", proxima_revision: r.proxima_revision || "", observaciones: r.observaciones || "", periodicidad: r.periodicidad || "Anual" }); setEditing(r.id); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); resetForm(); };

  const handleSave = async () => {
    if (!form.trabajador_id || !form.fecha_evaluacion) { showToast("Trabajador y fecha son obligatorios", "error"); return; }
    setSaving(true);
    const payload = { ...form, horas_exposicion: Number(form.horas_exposicion) || 0, indice_uv: Number(form.indice_uv) || 0, periodicidad: form.periodicidad, proximo_control: proximoControl(form.fecha_evaluacion, form.periodicidad) || form.proxima_revision || null, empresa_id: empresaId };
    const { error } = editing ? await supabase.from("vigilancia_radiacion").update(payload).eq("id", editing) : await supabase.from("vigilancia_radiacion").insert(payload);
    if (error) { showToast("Error: " + error.message, "error"); }
    else { showToast(editing ? "Registro actualizado" : "Registro guardado", "success"); closeModal(); load(); }
    setSaving(false);
  };
  const handleDelete = async (id) => { if (!confirm("¿Eliminar?")) return; await supabase.from("vigilancia_radiacion").delete().eq("id", id); showToast("Eliminado", "info"); load(); };

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
          <h3 className="text-white font-semibold text-sm mb-1">Radiación Ultravioleta</h3>
          <p className="text-gray-500 text-xs max-w-xl">Control de exposición a radiación UV solar en trabajadores de campo, campamentos y áreas exteriores. Basado en índice UV y horas de exposición diaria.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <Btn size="sm" onClick={() => setShowGuide(true)}><HelpCircle size={13} /> Guía</Btn>
          {subtab === "eval" && <>
            <ExportBtn data={records.map(r => ({ Trabajador: r.trabajadores?.nombre || "", Fecha: r.fecha_evaluacion, "Zona/Área": r.zona_area || "", "Hrs Exp/día": r.horas_exposicion ?? "", "Índice UV": r.indice_uv ?? "", Nivel: nivelUV(r.indice_uv), "EPP Asignado": r.epp_asignado || "", Fotoprotector: r.fotoprotector || "", "Próx. Revisión": r.proxima_revision || "" }))} filename="radiacion_uv" />
            <Btn size="sm" variant="primary" onClick={() => { setEditing(null); resetForm(); setShowModal(true); }}><Plus size={13} /> Nueva Evaluación</Btn>
          </>}
        </div>
      </div>

      {/* Pestañas internas */}
      <div className="flex gap-1.5 bg-gray-900/60 border border-gray-800 rounded-lg p-1 mb-5 w-fit flex-wrap">
        {[["eval", "Evaluaciones"], ["controles", "Controles"], ["cronograma", "Cronograma de Actividades"]].map(([k, l]) => (
          <button key={k} onClick={() => setSubtab(k)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${subtab === k ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-200"}`}>{l}</button>
        ))}
      </div>

      {showGuide && <VigGuideModal titulo={VIG_GUIAS.radiacion.titulo} campos={VIG_GUIAS.radiacion.campos} onClose={() => setShowGuide(false)} />}

      {subtab === "controles" && <SeguimientoPanel programa="radiacion" empresaId={empresaId} workers={workers} />}
      {subtab === "cronograma" && <CronogramaActividades programa="radiacion" empresaId={empresaId} workers={workers} />}

      {subtab === "eval" && <>
      <div className="grid grid-cols-3 gap-4 mb-5">
        <KpiCard label="Bajo vigilancia" value={records.length} sub={`${delMes.length} evaluados este mes`} accentColor="blue" />
        <KpiCard label="Riesgo Alto / Muy Alto / Extremo" value={altoRiesgo.length} sub="requieren EPP reforzado" accentColor="red" />
        <KpiCard label="Con fotoprotector" value={records.filter(r => r.fotoprotector === "Sí").length} sub="de un total de " accentColor="green" />
      </div>

      <FilterBar dateFrom={fFrom} dateTo={fTo} onDateFrom={setFFrom} onDateTo={setFTo} sort={sort} onSort={setSort} />

      {/* Móvil: tarjetas */}
      <div className="md:hidden space-y-2.5">
        {!loading && filtered.map(r => {
          const nivel = nivelUV(r.indice_uv);
          const ec = estadoControl(r.proximo_control);
          return (
            <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3.5">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <div className="font-semibold text-white text-sm leading-tight">{r.trabajadores?.nombre || "—"}</div>
                  <div className="text-xs text-gray-500 font-mono mt-0.5">{fmtFecha(r.fecha_evaluacion)}{r.zona_area ? ` · ${r.zona_area}` : ""}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400"><Pencil size={14} /></button>
                  {puedeEliminar() && (
                  <button onClick={() => handleDelete(r.id)} className="text-red-500/50 hover:text-red-400"><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <Badge color={nivelColor(nivel)}>UV {r.indice_uv ?? "—"} · {nivel}</Badge>
                <Badge color={r.fotoprotector === "Sí" ? "green" : "red"}>Fotoprotector: {r.fotoprotector || "No"}</Badge>
                {ec && <Badge color={ec.color}>Control {ec.label}</Badge>}
              </div>
              {r.horas_exposicion != null && <div className="text-xs text-gray-400">Horas exposición/día: {r.horas_exposicion}</div>}
              {r.epp_asignado && <div className="text-xs text-gray-400">EPP: {r.epp_asignado}</div>}
              {r.proximo_control && <div className="text-xs text-gray-400">Próximo control: <span className="font-mono">{fmtFecha(r.proximo_control)}</span></div>}
              {r.observaciones && <div className="text-xs text-gray-500 mt-1">{r.observaciones}</div>}
            </div>
          );
        })}
        {!loading && !filtered.length && <div className="text-center text-gray-600 text-sm py-8 bg-gray-900 border border-gray-800 rounded-xl">{records.length ? "Sin resultados para el filtro." : "Sin evaluaciones registradas."}</div>}
      </div>

      {/* Escritorio: tabla */}
      <div className="hidden md:block bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16 text-gray-500 text-sm">Cargando...</div> : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800">
              {["Trabajador", "Fecha", "Zona / Área", "Hrs Exp/día", "Índice UV", "Nivel", "EPP Asignado", "Fotoprotector", "Próximo Control", ""].map(h => (
                <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(r => {
                const nivel = nivelUV(r.indice_uv);
                const ec = estadoControl(r.proximo_control);
                return (
                  <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{r.trabajadores?.nombre || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">{fmtFecha(r.fecha_evaluacion)}</td>
                    <td className="px-4 py-3 text-gray-300 text-xs">{r.zona_area || "—"}</td>
                    <td className="px-4 py-3 text-center text-gray-300 font-mono text-xs">{r.horas_exposicion ?? "—"}</td>
                    <td className="px-4 py-3 text-center font-bold text-gray-200">{r.indice_uv ?? "—"}</td>
                    <td className="px-4 py-3"><Badge color={nivelColor(nivel)}>{nivel}</Badge></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{r.epp_asignado || "—"}</td>
                    <td className="px-4 py-3"><Badge color={r.fotoprotector === "Sí" ? "green" : "red"}>{r.fotoprotector || "No"}</Badge></td>
                    <td className="px-4 py-3 whitespace-nowrap">{r.proximo_control ? <span className="flex items-center gap-1.5 text-xs"><span className="font-mono text-gray-400">{fmtFecha(r.proximo_control)}</span>{ec && <Badge color={ec.color}>{ec.label}</Badge>}</span> : <span className="text-gray-600 text-xs">—</span>}</td>
                    <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button>{puedeEliminar() && (<button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>)}</div></td>
                  </tr>
                );
              })}
              {!records.length && <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-600 text-sm">Sin evaluaciones registradas</td></tr>}
            </tbody>
          </table>
          </div>
        )}
      </div>
      </>}

      {showModal && (
        <Modal title={editing ? "Editar — Radiación UV" : "Nueva Evaluación Radiación UV"} onClose={closeModal}>
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
              <FormField label="Zona / Área Trabajo"><Input value={form.zona_area} onChange={e => setForm(f => ({ ...f, zona_area: e.target.value }))} placeholder="Campamento norte, exterior..." /></FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Horas de Exposición / día"><Input type="number" min="0" max="24" step="0.5" value={form.horas_exposicion} onChange={e => setForm(f => ({ ...f, horas_exposicion: e.target.value }))} placeholder="Ej: 6" /></FormField>
              <FormField label="Índice UV (0–11+)">
                <Input type="number" min="0" max="20" step="0.1" value={form.indice_uv} onChange={e => setForm(f => ({ ...f, indice_uv: e.target.value }))} placeholder="Ej: 8" />
                {form.indice_uv && <p className="text-xs mt-1" style={{color: nivelColor(nivelUV(form.indice_uv)) === "red" ? "#f87171" : nivelColor(nivelUV(form.indice_uv)) === "amber" ? "#fbbf24" : nivelColor(nivelUV(form.indice_uv)) === "green" ? "#4ade80" : "#c084fc"}}>Nivel: {nivelUV(form.indice_uv)}</p>}
              </FormField>
            </div>
            <FormField label="EPP Asignado"><Input value={form.epp_asignado} onChange={e => setForm(f => ({ ...f, epp_asignado: e.target.value }))} placeholder="Lentes UV, sombrero ala ancha, camiseta manga larga..." /></FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Fotoprotector">
                <Select value={form.fotoprotector} onChange={e => setForm(f => ({ ...f, fotoprotector: e.target.value }))}>
                  {["Sí", "No", "Pendiente de entrega"].map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Próxima Revisión (manual)"><Input type="date" value={form.proxima_revision} onChange={e => setForm(f => ({ ...f, proxima_revision: e.target.value }))} /></FormField>
            </div>
            <FormField label="Periodicidad del control">
              <Select value={form.periodicidad} onChange={e => setForm(f => ({ ...f, periodicidad: e.target.value }))}>
                {PERIODICIDADES.map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
              {form.periodicidad !== "Único" && form.fecha_evaluacion && <p className="text-xs text-blue-400 mt-1">Próximo control: {fmtFecha(proximoControl(form.fecha_evaluacion, form.periodicidad))}</p>}
            </FormField>
            <FormField label="Observaciones"><Input value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} placeholder="Condiciones especiales, recomendaciones..." /></FormField>
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
