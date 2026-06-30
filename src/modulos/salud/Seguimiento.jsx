import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase, puedeEliminar } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { calcularEdad, calcularVigencia, excelDateToISO, fmtFecha} from '../../lib/helpers.js';
import { Badge } from '../../components/ui/Badge.jsx';
import { ProgressBar } from '../../components/ui/ProgressBar.jsx';
import { KpiCard } from '../../components/ui/KpiCard.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Btn } from '../../components/ui/Btn.jsx';
import { ExportBtn } from '../../components/ui/ExportBtn.jsx';
import { FilterBar } from '../../components/ui/FilterBar.jsx';
import { WideTableScroll } from '../../components/ui/WideTableScroll.jsx';
import {
  Plus, Upload, Download, ChevronRight, ChevronLeft, Lock,
  Trash2, Filter, HelpCircle, Pencil, FileDown, AlertTriangle,
  CheckCircle, Home, HeartPulse, Microscope, Search, Shield,
  ClipboardList, ShieldAlert, Activity, BarChart2, BookOpen,
  FileText, Users, LayoutDashboard, Stethoscope, Settings,
  Building2, Phone
} from 'lucide-react';

export default function SeguimientoModulo({ workers, empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [fEstado, setFEstado] = useState("");
  const [fPrioridad, setFPrioridad] = useState("");
  const [fTipo, setFTipo] = useState("");
  const initForm = {
    trabajador_id: "", tipo_caso: "Sospecha Enf. Ocupacional",
    fecha_inicio: new Date().toISOString().split("T")[0],
    descripcion: "", diagnostico_presuntivo: "",
    prioridad: "Media", estado: "Activo",
    proxima_evaluacion: "", medico_responsable: "", observaciones: ""
  };
  const [form, setForm] = useState(initForm);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("seguimiento_casos")
      .select("*, trabajadores(nombre, cargo)")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false });
    if (error) showToast("Error al cargar: " + error.message, "error");
    setRecords(data || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const openEdit = (r) => {
    setForm({
      trabajador_id: r.trabajador_id || "", tipo_caso: r.tipo_caso,
      fecha_inicio: r.fecha_inicio, descripcion: r.descripcion || "",
      diagnostico_presuntivo: r.diagnostico_presuntivo || "",
      prioridad: r.prioridad || "Media", estado: r.estado || "Activo",
      proxima_evaluacion: r.proxima_evaluacion || "",
      medico_responsable: r.medico_responsable || "", observaciones: r.observaciones || ""
    });
    setEditing(r.id); setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(initForm); };
  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este caso?")) return;
    await supabase.from("seguimiento_casos").delete().eq("id", id);
    showToast("Eliminado", "info"); load();
  };
  const handleSave = async () => {
    if (!form.trabajador_id || !form.tipo_caso || !form.fecha_inicio) {
      showToast("Trabajador, tipo de caso y fecha son obligatorios", "error"); return;
    }
    setSaving(true);
    const payload = {
      empresa_id: empresaId, trabajador_id: form.trabajador_id,
      tipo_caso: form.tipo_caso, fecha_inicio: form.fecha_inicio,
      descripcion: form.descripcion, diagnostico_presuntivo: form.diagnostico_presuntivo,
      prioridad: form.prioridad, estado: form.estado,
      proxima_evaluacion: form.proxima_evaluacion || null,
      medico_responsable: form.medico_responsable, observaciones: form.observaciones
    };
    const { error } = editing
      ? await supabase.from("seguimiento_casos").update(payload).eq("id", editing)
      : await supabase.from("seguimiento_casos").insert(payload);
    if (error) { showToast("Error: " + error.message, "error"); }
    else { showToast(editing ? "Caso actualizado" : "Caso registrado", "success"); closeModal(); load(); }
    setSaving(false);
  };

  const activos = records.filter(r => r.estado === "Activo" || r.estado === "En seguimiento");
  const altaPrioridad = records.filter(r => r.prioridad === "Alta" && r.estado !== "Cerrado");
  const now = new Date(); const in7 = new Date(); in7.setDate(in7.getDate() + 7);
  const proximasEval = records.filter(r => r.proxima_evaluacion && new Date(r.proxima_evaluacion + "T00:00:00") >= now && new Date(r.proxima_evaluacion + "T00:00:00") <= in7);

  const filtered = records.filter(r =>
    (!fEstado || r.estado === fEstado) &&
    (!fPrioridad || r.prioridad === fPrioridad) &&
    (!fTipo || r.tipo_caso === fTipo));

  const prioColor = p => ({ Alta: "red", Media: "amber", Baja: "blue" }[p] || "gray");
  const estadoColor = e => ({ Activo: "red", "En seguimiento": "amber", Resuelto: "green", Cerrado: "gray" }[e] || "gray");
  const tiposUniq = [...new Set(records.map(r => r.tipo_caso).filter(Boolean))].sort();

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Seguimiento Médico a Trabajadores</h3>
          <p className="text-gray-500 text-xs max-w-xl">Registro y seguimiento de casos médicos individuales: sospecha de enfermedad ocupacional, post-accidente, restricciones activas y otros.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <ExportBtn data={records.map(r => ({ Trabajador: r.trabajadores?.nombre || "—", Cargo: r.trabajadores?.cargo || "—", "Tipo de caso": r.tipo_caso, "Fecha inicio": r.fecha_inicio, "Diagnóstico presuntivo": r.diagnostico_presuntivo || "", Prioridad: r.prioridad, Estado: r.estado, "Próx. evaluación": r.proxima_evaluacion || "", Médico: r.medico_responsable || "", Observaciones: r.observaciones || "" }))} filename="seguimiento_medico" />
          <Btn size="sm" variant="primary" onClick={() => { setEditing(null); setForm(initForm); setShowModal(true); }}><Plus size={13} /> Nuevo Caso</Btn>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <KpiCard label="Casos activos" value={activos.length} sub={`${records.length} casos en total`} accentColor="red" />
        <KpiCard label="Prioridad alta" value={altaPrioridad.length} sub="requieren atención urgente" accentColor="amber" />
        <KpiCard label="Evaluaciones (7 días)" value={proximasEval.length} sub="próximas citas programadas" accentColor="blue" />
      </div>

      {altaPrioridad.length > 0 && (
        <div className="bg-amber-900/20 border border-amber-800 rounded-xl p-3 mb-4 flex items-start gap-3">
          <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 text-xs font-semibold">{altaPrioridad.length} caso(s) de prioridad alta activos — requieren atención prioritaria</p>
            <p className="text-amber-600 text-xs mt-0.5">{altaPrioridad.map(r => r.trabajadores?.nombre || "Trabajador").join(", ")}</p>
          </div>
        </div>
      )}

      {/* Filtros inline */}
      <div className="flex items-center gap-2 mb-4 flex-wrap p-3 bg-gray-900/50 border border-gray-800 rounded-xl">
        <Filter size={12} className="text-gray-500 shrink-0" />
        <span className="text-xs text-gray-500 shrink-0">Filtrar:</span>
        <select value={fTipo} onChange={e => setFTipo(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500">
          <option value="">Todos los tipos</option>
          {tiposUniq.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={fEstado} onChange={e => setFEstado(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500">
          <option value="">Todos los estados</option>
          {["Activo","En seguimiento","Resuelto","Cerrado"].map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={fPrioridad} onChange={e => setFPrioridad(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500">
          <option value="">Todas las prioridades</option>
          {["Alta","Media","Baja"].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {(fTipo || fEstado || fPrioridad) && (
          <button onClick={() => { setFTipo(""); setFEstado(""); setFPrioridad(""); }} className="text-xs text-blue-400 hover:text-blue-300 ml-1">✕ Limpiar</button>
        )}
      </div>

      {/* ── Vista móvil: tarjetas ── */}
      <div className="md:hidden space-y-2.5">
        {loading && <div className="text-center text-gray-600 text-sm py-8 bg-gray-900 border border-gray-800 rounded-xl">Cargando...</div>}
        {!loading && filtered.map(r => {
          const isProx = r.proxima_evaluacion && new Date(r.proxima_evaluacion + "T00:00:00") <= in7 && new Date(r.proxima_evaluacion + "T00:00:00") >= now;
          return (
            <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3.5">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <div className="font-semibold text-white text-sm leading-tight">{r.trabajadores?.nombre || "—"}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{r.trabajadores?.cargo || ""}{r.trabajadores?.cargo ? " · " : ""}{fmtFecha(r.fecha_inicio)}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 p-1 transition-colors"><Pencil size={15} /></button>
                  {puedeEliminar() && (
                    <button onClick={() => handleDelete(r.id)} className="text-red-500/60 hover:text-red-400 p-1 transition-colors"><Trash2 size={15} /></button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                <Badge color={r.tipo_caso.includes("Accidente") ? "red" : r.tipo_caso.includes("Enf") ? "amber" : "purple"}>{r.tipo_caso}</Badge>
                <Badge color={prioColor(r.prioridad)}>{r.prioridad}</Badge>
                <Badge color={estadoColor(r.estado)}>{r.estado}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs border-t border-gray-800 pt-2.5">
                <div className="truncate"><span className="text-gray-600">Dx presuntivo:</span> <span className="text-gray-400">{r.diagnostico_presuntivo || "—"}</span></div>
                <div><span className="text-gray-600">Próx. eval:</span> <span className={`font-mono ${isProx ? "text-amber-400 font-semibold" : "text-gray-400"}`}>{r.proxima_evaluacion || "—"}{isProx && " ⚠"}</span></div>
                <div className="truncate"><span className="text-gray-600">Médico:</span> <span className="text-gray-400">{r.medico_responsable || "—"}</span></div>
              </div>
            </div>
          );
        })}
        {!loading && !filtered.length && (
          <div className="text-center text-gray-600 text-sm py-8 bg-gray-900 border border-gray-800 rounded-xl">
            {records.length ? "Sin resultados para los filtros aplicados." : "Sin casos registrados. Usa \"Nuevo Caso\" para comenzar."}
          </div>
        )}
      </div>

      {/* ── Vista escritorio: tabla ── */}
      <div className="hidden md:block">
        <WideTableScroll>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800">
            {["Trabajador", "Tipo de caso", "F. Inicio", "Dx presuntivo", "Prioridad", "Estado", "Próx. Evaluación", "Médico", ""].map(h => (
              <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
            {!loading && filtered.map(r => {
              const isProx = r.proxima_evaluacion && new Date(r.proxima_evaluacion + "T00:00:00") <= in7 && new Date(r.proxima_evaluacion + "T00:00:00") >= now;
              return (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white text-xs">{r.trabajadores?.nombre || "—"}</div>
                    <div className="text-gray-600 text-[10px]">{r.trabajadores?.cargo || ""}</div>
                  </td>
                  <td className="px-4 py-3"><Badge color={r.tipo_caso.includes("Accidente") ? "red" : r.tipo_caso.includes("Enf") ? "amber" : "purple"}>{r.tipo_caso}</Badge></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{fmtFecha(r.fecha_inicio)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-[140px] truncate">{r.diagnostico_presuntivo || "—"}</td>
                  <td className="px-4 py-3"><Badge color={prioColor(r.prioridad)}>{r.prioridad}</Badge></td>
                  <td className="px-4 py-3"><Badge color={estadoColor(r.estado)}>{r.estado}</Badge></td>
                  <td className={`px-4 py-3 font-mono text-xs ${isProx ? "text-amber-400 font-semibold" : "text-gray-500"}`}>{r.proxima_evaluacion || "—"}{isProx && " ⚠"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{r.medico_responsable || "—"}</td>
                  <td className="px-4 py-3"><div className="flex gap-1">
                    <button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button>
                    {puedeEliminar() && (
                      <button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                    )}
                  </div></td>
                </tr>
              );
            })}
            {!loading && !filtered.length && (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-600 text-sm">
                {records.length ? "Sin resultados para los filtros aplicados." : "Sin casos registrados. Usa \"Nuevo Caso\" para comenzar."}
              </td></tr>
            )}
          </tbody>
        </table>
        </WideTableScroll>
      </div>

      {showModal && (
        <Modal title={editing ? "Editar Caso" : "Nuevo Caso de Seguimiento"} onClose={closeModal} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Trabajador *">
                <Select value={form.trabajador_id} onChange={e => setForm(f => ({ ...f, trabajador_id: e.target.value }))}>
                  <option value="">Seleccionar trabajador...</option>
                  {workers.filter(w => w.estado !== "Cesado").sort((a,b) => a.nombre.localeCompare(b.nombre,"es")).map(w => <option key={w.id} value={w.id}>{w.nombre}{w.cargo ? ` — ${w.cargo}` : ""}</option>)}
                  {workers.some(w => w.estado === "Cesado") && <option disabled>── Cesados ──</option>}
                  {workers.filter(w => w.estado === "Cesado").sort((a,b) => a.nombre.localeCompare(b.nombre,"es")).map(w => <option key={w.id} value={w.id}>{w.nombre} (Cesado){w.cargo ? ` — ${w.cargo}` : ""}</option>)}
                </Select>
              </FormField>
              <FormField label="Tipo de caso *">
                <Select value={form.tipo_caso} onChange={e => setForm(f => ({ ...f, tipo_caso: e.target.value }))}>
                  {["Sospecha Enf. Ocupacional","Post-accidente","Restricción médica activa","Enfermedad crónica relacionada","Salud mental / Psicosocial","Exposición a agente de riesgo","Otro"].map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Fecha de inicio *"><Input type="date" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} /></FormField>
              <FormField label="Próxima evaluación"><Input type="date" value={form.proxima_evaluacion} onChange={e => setForm(f => ({ ...f, proxima_evaluacion: e.target.value }))} /></FormField>
              <FormField label="Prioridad">
                <Select value={form.prioridad} onChange={e => setForm(f => ({ ...f, prioridad: e.target.value }))}>
                  {["Alta","Media","Baja"].map(p => <option key={p}>{p}</option>)}
                </Select>
              </FormField>
              <FormField label="Estado">
                <Select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                  {["Activo","En seguimiento","Resuelto","Cerrado"].map(e => <option key={e}>{e}</option>)}
                </Select>
              </FormField>
            </div>
            <FormField label="Diagnóstico presuntivo"><Input value={form.diagnostico_presuntivo} onChange={e => setForm(f => ({ ...f, diagnostico_presuntivo: e.target.value }))} placeholder="Ej: Hipoacusia inducida por ruido, Lumbalgia ocupacional..." /></FormField>
            <FormField label="Descripción / Motivo del seguimiento">
              <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={3} placeholder="Describe el motivo de la apertura del caso y los hallazgos iniciales..." className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500 resize-none" />
            </FormField>
            <FormField label="Médico responsable"><Input value={form.medico_responsable} onChange={e => setForm(f => ({ ...f, medico_responsable: e.target.value }))} placeholder="Nombre del médico ocupacional" /></FormField>
            <FormField label="Observaciones / Plan de manejo" confidential>
              <textarea value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} rows={2} placeholder="Plan terapéutico, restricciones, derivaciones, etc." className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500 resize-none" />
            </FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={closeModal}>Cancelar</Btn>
              <Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : editing ? "Actualizar" : "Registrar caso"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
