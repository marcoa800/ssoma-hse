import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { calcularEdad, calcularVigencia } from '../../lib/helpers.js';
import { TRIAJE_CATS, CATEGORIAS_RIESGO, DETALLES_ESPECIFICOS, NIVEL_RIESGO_DESC } from '../../constants/triaje.js';
import { Badge } from '../../components/ui/Badge.jsx';
import { KpiCard } from '../../components/ui/KpiCard.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Btn } from '../../components/ui/Btn.jsx';
import { ExportBtn } from '../../components/ui/ExportBtn.jsx';
import { FilterBar } from '../../components/ui/FilterBar.jsx';
import {
  Plus, Upload, Download, Trash2, Pencil, AlertTriangle, CheckCircle,
  Filter, HelpCircle, Lock, Shield, ClipboardList, ShieldAlert,
  Activity, FileText, Users, LayoutDashboard, Stethoscope, Search,
  ChevronRight, ChevronLeft, Phone, Eye, EyeOff, X, Copy, FileDown,
  Building2, Settings
} from 'lucide-react';

const TIPOS_TRABAJO_ATS = ["Trabajo en altura","Espacio confinado","Trabajo eléctrico","Trabajo en caliente","Excavación / Zanjas","Izaje de cargas","Sustancias peligrosas","Maquinaria / Equipos","Otro"];
const EPPS_COMUNES = ["Casco","Lentes de seguridad","Guantes","Zapatos de seguridad","Arnés / línea de vida","Respirador","Tapones auditivos","Traje Tyvek","Careta facial","Guantes dieléctricos"];
const ATS_ESTADO_COLOR = { Vigente: "green", Cerrado: "gray", Cancelado: "red" };
const makeAtsBlank = () => ({
  tipo: "ATS", tipo_trabajo: "", area: "", ubicacion: "", descripcion: "",
  fecha: new Date().toISOString().split("T")[0], hora_inicio: "", hora_fin: "",
  supervisor: "", responsable_ssoma: "", participantes: "",
  epps_requeridos: [], estado: "Vigente", observaciones: "",
});

export default function ATSPetarModulo({ empresaId }) {
  const [docs,       setDocs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [loadErr,    setLoadErr]    = useState(null);
  const [showForm,   setShowForm]   = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [selected,   setSelected]   = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [fTipo,      setFTipo]      = useState("");
  const [fEstado,    setFEstado]    = useState("");
  const [tab,        setTab]        = useState("ATS");
  const [form,       setForm]       = useState(makeAtsBlank);

  const load = async () => {
    if (!empresaId) return;
    setLoading(true);
    setLoadErr(null);
    try {
      const { data, error } = await supabase.from("ats_petar").select("*").eq("empresa_id", empresaId).order("fecha", { ascending: false });
      if (error) { setLoadErr(error.message); setDocs([]); }
      else { setDocs(data || []); }
    } catch(e) {
      setLoadErr(e.message);
      setDocs([]);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [empresaId]);

  const openNew   = () => { setEditing(null); setForm({ ...makeAtsBlank(), tipo: tab }); setShowForm(true); };
  const openEdit  = (d) => { setEditing(d.id); setForm({ ...makeAtsBlank(), ...d, epps_requeridos: Array.isArray(d.epps_requeridos) ? d.epps_requeridos : [] }); setShowForm(true); };
  const openDetail= (d) => { setSelected(d); setShowDetail(true); };

  const save = async () => {
    if (!form.tipo_trabajo || !form.area || !form.fecha) { showToast("Completa tipo de trabajo, área y fecha", "error"); return; }
    setSaving(true);
    const payload = { tipo:form.tipo, tipo_trabajo:form.tipo_trabajo, area:form.area, ubicacion:form.ubicacion||null, descripcion:form.descripcion||null, fecha:form.fecha, hora_inicio:form.hora_inicio||null, hora_fin:form.hora_fin||null, supervisor:form.supervisor||null, responsable_ssoma:form.responsable_ssoma||null, participantes:form.participantes||null, epps_requeridos:form.epps_requeridos||[], estado:form.estado, observaciones:form.observaciones||null, empresa_id:empresaId };
    const { error } = editing
      ? await supabase.from("ats_petar").update(payload).eq("id", editing)
      : await supabase.from("ats_petar").insert(payload);
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast(editing ? "Actualizado" : "Documento creado", "success");
    setShowForm(false); load();
  };

  const del = async (id) => {
    if (!confirm("¿Eliminar este documento?")) return;
    await supabase.from("ats_petar").delete().eq("id", id);
    showToast("Eliminado", "success"); load();
  };

  const toggleEpp = (epp) => setForm(f => {
    const arr = Array.isArray(f.epps_requeridos) ? f.epps_requeridos : [];
    return { ...f, epps_requeridos: arr.includes(epp) ? arr.filter(e => e !== epp) : [...arr, epp] };
  });

  const anio     = new Date().getFullYear();
  const docAnio  = docs.filter(d => d.fecha && new Date(d.fecha).getFullYear() === anio);
  const vigentes = docs.filter(d => d.estado === "Vigente");
  const atsDocs  = docs.filter(d => d.tipo === "ATS");
  const petarDocs= docs.filter(d => d.tipo === "PETAR");
  const byTab    = docs.filter(d => d.tipo === tab);
  const filtered = byTab.filter(d => (!fTipo || d.tipo_trabajo === fTipo) && (!fEstado || d.estado === fEstado));

  return (
    <div className="space-y-4">
      {loadErr && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg px-4 py-3 text-xs text-red-400">
          ⚠ Error al cargar ATS/PETAR: {loadErr}. Asegúrate de haber creado la tabla <code className="font-mono bg-red-900/30 px-1 rounded">ats_petar</code> en Supabase.
        </div>
      )}
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">ATS / PETAR</h2>
          <p className="text-gray-500 text-xs max-w-xl">Análisis de Trabajo Seguro y Permiso Escrito de Trabajo de Alto Riesgo. (D.S. 005-2012-TR / Ley 29783)</p>
        </div>
        <div className="flex gap-2">
          <ExportBtn
            data={docs.map(d => ({
              Tipo: d.tipo, "Tipo trabajo": d.tipo_trabajo, Área: d.area,
              Ubicación: d.ubicacion || "—", Descripción: d.descripcion || "—",
              Fecha: d.fecha, "Hora inicio": d.hora_inicio || "—", "Hora fin": d.hora_fin || "—",
              Supervisor: d.supervisor || "—", "Resp. SSOMA": d.responsable_ssoma || "—",
              Participantes: d.participantes || "—", "EPPs": (d.epps_requeridos||[]).join(", "),
              Estado: d.estado, Observaciones: d.observaciones || "—",
            }))}
            filename="ats_petar"
          />
          <Btn variant="primary" onClick={openNew}><Plus size={14} />Nuevo {tab}</Btn>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total este año" value={docAnio.length} sub="ATS + PETAR emitidos" accentColor="amber" />
        <KpiCard label="Vigentes" value={vigentes.length} sub="permisos activos" accentColor={vigentes.length > 0 ? "emerald" : "gray"} />
        <KpiCard label="ATS emitidos" value={atsDocs.length} sub="análisis de trabajo" accentColor="blue" />
        <KpiCard label="PETAR emitidos" value={petarDocs.length} sub="permisos alto riesgo" accentColor="purple" />
      </div>

      {/* Tabs ATS / PETAR */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {["ATS","PETAR"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-amber-600 text-white shadow" : "text-gray-500 hover:text-gray-300"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <select value={fTipo} onChange={e => setFTipo(e.target.value)}
          className="bg-gray-900 border border-gray-800 text-gray-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500">
          <option value="">Todos los trabajos</option>
          {TIPOS_TRABAJO_ATS.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={fEstado} onChange={e => setFEstado(e.target.value)}
          className="bg-gray-900 border border-gray-800 text-gray-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500">
          <option value="">Todos los estados</option>
          {["Vigente","Cerrado","Cancelado"].map(s => <option key={s}>{s}</option>)}
        </select>
        {(fTipo || fEstado) && (
          <button onClick={() => { setFTipo(""); setFEstado(""); }} className="text-xs text-gray-500 hover:text-gray-300 px-2">✕ Limpiar</button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-600 text-sm">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {["Tipo trabajo","Área","Supervisor","Resp. SSOMA","Fecha","Estado",""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-600 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {filtered.length > 0 ? filtered.map(d => (
                <tr key={d.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-gray-300 font-medium text-xs">{d.tipo_trabajo}</div>
                    {d.descripcion && <div className="text-gray-600 text-xs truncate max-w-[180px]">{d.descripcion}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{d.area}{d.ubicacion ? <span className="text-gray-600"> · {d.ubicacion}</span> : ""}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{d.supervisor || "—"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{d.responsable_ssoma || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{d.fecha}{d.hora_inicio ? <div className="text-gray-600">{d.hora_inicio}{d.hora_fin ? ` → ${d.hora_fin}` : ""}</div> : null}</td>
                  <td className="px-4 py-3"><Badge color={ATS_ESTADO_COLOR[d.estado] || "gray"}>{d.estado}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openDetail(d)} className="text-gray-500 hover:text-blue-400 transition-colors" title="Ver detalle"><Eye size={13} /></button>
                      <button onClick={() => openEdit(d)} className="text-gray-500 hover:text-amber-400 transition-colors" title="Editar"><Pencil size={13} /></button>
                      <button onClick={() => del(d.id)} className="text-gray-500 hover:text-red-400 transition-colors" title="Eliminar"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-600 text-sm">
                  {byTab.length ? "Sin resultados para el filtro." : `Sin documentos ${tab}. Usa "Nuevo ${tab}" para comenzar.`}
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal — Formulario */}
      {showForm && (
        <Modal title={`${editing ? "Editar" : "Nuevo"} ${form.tipo}`} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Tipo de documento">
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500">
                  <option>ATS</option><option>PETAR</option>
                </select>
              </FormField>
              <FormField label="Tipo de trabajo *">
                <select value={form.tipo_trabajo} onChange={e => setForm(f => ({ ...f, tipo_trabajo: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500">
                  <option value="">Seleccionar...</option>
                  {TIPOS_TRABAJO_ATS.map(t => <option key={t}>{t}</option>)}
                </select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Área *"><Input value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} placeholder="Ej: Planta / Piso 2" /></FormField>
              <FormField label="Ubicación / Punto exacto"><Input value={form.ubicacion} onChange={e => setForm(f => ({ ...f, ubicacion: e.target.value }))} placeholder="Ej: Tablero eléctrico TG-01" /></FormField>
            </div>
            <FormField label="Descripción de la tarea">
              <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={2}
                placeholder="Describe brevemente la tarea a realizar..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 resize-none" />
            </FormField>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Fecha *"><Input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} /></FormField>
              <FormField label="Hora inicio"><Input type="time" value={form.hora_inicio} onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))} /></FormField>
              <FormField label="Hora fin"><Input type="time" value={form.hora_fin} onChange={e => setForm(f => ({ ...f, hora_fin: e.target.value }))} /></FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Supervisor / Jefe de área"><Input value={form.supervisor} onChange={e => setForm(f => ({ ...f, supervisor: e.target.value }))} placeholder="Nombre del supervisor" /></FormField>
              <FormField label="Responsable SSOMA"><Input value={form.responsable_ssoma} onChange={e => setForm(f => ({ ...f, responsable_ssoma: e.target.value }))} placeholder="Nombre del prevencionista" /></FormField>
            </div>
            <FormField label="Participantes / Trabajadores autorizados">
              <textarea value={form.participantes} onChange={e => setForm(f => ({ ...f, participantes: e.target.value }))} rows={3}
                placeholder="Un trabajador por línea o separados por coma:&#10;Juan Pérez - Operario&#10;María López - Técnico"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 resize-none" />
            </FormField>
            <FormField label="EPPs requeridos">
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                {EPPS_COMUNES.map(epp => (
                  <label key={epp} className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={form.epps_requeridos.includes(epp)} onChange={() => toggleEpp(epp)}
                      className="accent-amber-500 w-3.5 h-3.5" />
                    <span className="text-xs text-gray-400 group-hover:text-gray-200">{epp}</span>
                  </label>
                ))}
              </div>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Estado">
                <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500">
                  <option>Vigente</option><option>Cerrado</option><option>Cancelado</option>
                </select>
              </FormField>
              <FormField label="Observaciones"><Input value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} placeholder="Condiciones especiales..." /></FormField>
            </div>
            <div className="flex gap-2 pt-1">
              <Btn variant="ghost" onClick={() => setShowForm(false)} className="flex-1 justify-center">Cancelar</Btn>
              <Btn variant="primary" onClick={save} disabled={saving} className="flex-1 justify-center">
                {saving ? "Guardando..." : editing ? "Guardar cambios" : `Crear ${form.tipo}`}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal — Detalle */}
      {showDetail && selected && (
        <Modal title={`${selected.tipo} — ${selected.tipo_trabajo}`} onClose={() => setShowDetail(false)}>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800/50 rounded-lg p-3"><div className="text-xs text-gray-500 mb-1">Área / Ubicación</div><div className="text-gray-300 font-medium">{selected.area}</div>{selected.ubicacion && <div className="text-gray-500 text-xs">{selected.ubicacion}</div>}</div>
              <div className="bg-gray-800/50 rounded-lg p-3"><div className="text-xs text-gray-500 mb-1">Estado</div><Badge color={ATS_ESTADO_COLOR[selected.estado] || "gray"}>{selected.estado}</Badge></div>
              <div className="bg-gray-800/50 rounded-lg p-3"><div className="text-xs text-gray-500 mb-1">Fecha y horario</div><div className="text-gray-300">{selected.fecha}</div>{selected.hora_inicio && <div className="text-gray-500 text-xs">{selected.hora_inicio}{selected.hora_fin ? ` → ${selected.hora_fin}` : ""}</div>}</div>
              <div className="bg-gray-800/50 rounded-lg p-3"><div className="text-xs text-gray-500 mb-1">Supervisor</div><div className="text-gray-300">{selected.supervisor || "—"}</div><div className="text-gray-500 text-xs">SSOMA: {selected.responsable_ssoma || "—"}</div></div>
            </div>
            {selected.descripcion && (
              <div className="bg-gray-800/50 rounded-lg p-3"><div className="text-xs text-gray-500 mb-1">Descripción de la tarea</div><div className="text-gray-300">{selected.descripcion}</div></div>
            )}
            {selected.participantes && (
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-2">Participantes autorizados</div>
                <div className="space-y-1">
                  {selected.participantes.split(/\n|,/).map((p, i) => p.trim() && (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-400"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />{p.trim()}</div>
                  ))}
                </div>
              </div>
            )}
            {selected.epps_requeridos?.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-2">EPPs requeridos</div>
                <div className="flex flex-wrap gap-1.5">
                  {selected.epps_requeridos.map(epp => (
                    <span key={epp} className="px-2 py-0.5 rounded-full bg-amber-900/30 border border-amber-800/40 text-xs text-amber-400">{epp}</span>
                  ))}
                </div>
              </div>
            )}
            {selected.observaciones && (
              <div className="bg-gray-800/50 rounded-lg p-3"><div className="text-xs text-gray-500 mb-1">Observaciones</div><div className="text-gray-400 text-xs">{selected.observaciones}</div></div>
            )}
            <div className="flex gap-2 pt-1">
              <Btn variant="ghost" onClick={() => { setShowDetail(false); openEdit(selected); }} className="flex-1 justify-center"><Pencil size={13} />Editar</Btn>
              <Btn variant="ghost" onClick={() => setShowDetail(false)} className="flex-1 justify-center">Cerrar</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
