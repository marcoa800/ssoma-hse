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
import { WideTableScroll } from '../../components/ui/WideTableScroll.jsx';
import {
  Plus, Upload, Download, Trash2, Pencil, AlertTriangle, CheckCircle,
  Filter, HelpCircle, Lock, Shield, ClipboardList, ShieldAlert,
  Activity, FileText, Users, LayoutDashboard, Stethoscope, Search,
  ChevronRight, ChevronLeft, Phone, Eye, EyeOff, X, Copy, FileDown,
  Building2, Settings
} from 'lucide-react';

export default function IpercModulo({ empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const initForm = { area_proceso: "", proceso_actividad: "", version: "v1.0", fecha_elaboracion: new Date().toISOString().split("T")[0], fecha_revision: "", responsable: "", url_documento: "", observaciones: "" };
  const [form, setForm] = useState(initForm);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("iperc_documentos").select("*").eq("empresa_id", empresaId).order("area_proceso");
    setRecords(data || []); setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const now = new Date(); const in30 = new Date(); in30.setDate(in30.getDate() + 30);

  const getEstado = (r) => {
    if (!r.fecha_revision) return "Sin fecha";
    const d = new Date(r.fecha_revision);
    if (d < now) return "Vencido";
    if (d <= in30) return "Por actualizar";
    return "Vigente";
  };
  const estadoColor = e => ({ Vigente:"green", "Por actualizar":"amber", Vencido:"red", "Sin fecha":"gray" }[e] || "gray");

  const openNew = () => { setEditing(null); setForm(initForm); setShowModal(true); };
  const openEdit = (r) => { setEditing(r.id); setForm({ area_proceso:r.area_proceso, proceso_actividad:r.proceso_actividad||"", version:r.version||"v1.0", fecha_elaboracion:r.fecha_elaboracion||"", fecha_revision:r.fecha_revision||"", responsable:r.responsable||"", url_documento:r.url_documento||"", observaciones:r.observaciones||"" }); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(initForm); };

  const handleSave = async () => {
    if (!form.area_proceso.trim()) { showToast("El área/proceso es obligatorio", "error"); return; }
    setSaving(true);
    const payload = { empresa_id: empresaId, area_proceso: form.area_proceso, proceso_actividad: form.proceso_actividad||null, version: form.version, fecha_elaboracion: form.fecha_elaboracion||null, fecha_revision: form.fecha_revision||null, responsable: form.responsable||null, url_documento: form.url_documento||null, observaciones: form.observaciones||null };
    const { error } = editing ? await supabase.from("iperc_documentos").update(payload).eq("id", editing) : await supabase.from("iperc_documentos").insert(payload);
    if (error) showToast("Error: " + error.message, "error");
    else { showToast(editing ? "IPERC actualizado" : "IPERC registrado", "success"); closeModal(); load(); }
    setSaving(false);
  };
  const handleDelete = async (id) => { if (!confirm("¿Eliminar este registro?")) return; await supabase.from("iperc_documentos").delete().eq("id", id); showToast("Eliminado", "info"); load(); };

  const vigentes = records.filter(r => getEstado(r) === "Vigente");
  const porVencer = records.filter(r => getEstado(r) === "Por actualizar");
  const vencidos = records.filter(r => getEstado(r) === "Vencido");

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">IPERC — Registro de Documentos</h3>
          <p className="text-gray-500 text-xs max-w-xl">Control de vigencia de matrices IPERC por área. Los documentos se elaboran en Excel/Word y se registra aquí el link y la fecha de revisión. (R.M. 050-2013-TR)</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <ExportBtn data={records.map(r => ({ "Área/Proceso":r.area_proceso, "Actividad":r.proceso_actividad||"—", Versión:r.version, "Fecha elaboración":r.fecha_elaboracion||"—", "Próx. revisión":r.fecha_revision||"—", Responsable:r.responsable||"—", Estado:getEstado(r), "URL Documento":r.url_documento||"—", Observaciones:r.observaciones||"—" }))} filename="iperc_documentos" />
          <Btn size="sm" variant="primary" onClick={openNew}><Plus size={13} /> Nuevo IPERC</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label="IPERCs registrados" value={records.length} sub="total documentos" accentColor="blue" />
        <KpiCard label="Vigentes" value={vigentes.length} sub="dentro del plazo" accentColor="emerald" />
        <KpiCard label="Por actualizar" value={porVencer.length} sub="próximos 30 días" accentColor="amber" />
        <KpiCard label="Vencidos" value={vencidos.length} sub="requieren actualización" accentColor={vencidos.length > 0 ? "red" : "emerald"} />
      </div>

      {vencidos.length > 0 && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-3 mb-4 flex items-start gap-3">
          <AlertTriangle size={15} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 text-xs font-semibold mb-1">{vencidos.length} IPERC(s) vencidos — requieren actualización inmediata</p>
            <p className="text-red-600 text-xs">{vencidos.map(r => r.area_proceso).join(" · ")}</p>
          </div>
        </div>
      )}

      {/* Vista móvil: tarjetas */}
      <div className="md:hidden space-y-2.5">
        {loading && <div className="text-center text-gray-600 text-sm py-8 bg-gray-900 border border-gray-800 rounded-xl">Cargando...</div>}
        {!loading && records.map(r => {
          const estado = getEstado(r);
          return (
            <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3.5">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <div className="font-semibold text-white text-sm leading-tight">{r.area_proceso}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{r.proceso_actividad || "—"} · <span className="font-mono">{r.version}</span></div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 p-1"><Pencil size={15} /></button>
                  <button onClick={() => handleDelete(r.id)} className="text-red-500/60 hover:text-red-400 p-1"><Trash2 size={15} /></button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge color={estadoColor(estado)}>{estado}</Badge>
                {r.url_documento
                  ? <a href={r.url_documento} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"><Download size={12} />Abrir documento</a>
                  : <span className="text-gray-700 text-xs">Sin link</span>}
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs border-t border-gray-800 pt-2.5">
                <div><span className="text-gray-600">Elaboración:</span> <span className="text-gray-400 font-mono">{r.fecha_elaboracion || "—"}</span></div>
                <div><span className="text-gray-600">Próx. revisión:</span> <span className="text-gray-400 font-mono">{r.fecha_revision || "—"}</span></div>
                <div className="truncate"><span className="text-gray-600">Responsable:</span> <span className="text-gray-400">{r.responsable || "—"}</span></div>
              </div>
            </div>
          );
        })}
        {!loading && !records.length && <div className="text-center text-gray-600 text-sm py-8 bg-gray-900 border border-gray-800 rounded-xl">Sin IPERCs registrados. Usa "Nuevo IPERC" para comenzar.</div>}
      </div>

      <div className="hidden md:block">
        <WideTableScroll maxH="max-h-[calc(100vh-200px)]">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800">
            {["Área / Proceso","Actividad","Versión","Elaboración","Próx. Revisión","Responsable","Estado","Documento",""].map(h => (
              <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
            {!loading && records.map(r => {
              const estado = getEstado(r);
              return (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-gray-200 text-xs font-medium">{r.area_proceso}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.proceso_actividad || "—"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono">{r.version}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{r.fecha_elaboracion || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{r.fecha_revision || "—"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{r.responsable || "—"}</td>
                  <td className="px-4 py-3"><Badge color={estadoColor(estado)}>{estado}</Badge></td>
                  <td className="px-4 py-3">
                    {r.url_documento
                      ? <a href={r.url_documento} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"><Download size={12} />Abrir</a>
                      : <span className="text-gray-700 text-xs">Sin link</span>}
                  </td>
                  <td className="px-4 py-3"><div className="flex gap-1">
                    <button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button>
                    <button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                  </div></td>
                </tr>
              );
            })}
            {!loading && !records.length && (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-600 text-sm">Sin IPERCs registrados. Usa "Nuevo IPERC" para comenzar.</td></tr>
            )}
          </tbody>
        </table>
        </WideTableScroll>
      </div>

      {showModal && (
        <Modal title={editing ? "Editar IPERC" : "Registrar IPERC"} onClose={closeModal} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Área / Proceso *"><Input value={form.area_proceso} onChange={e => setForm(f=>({...f,area_proceso:e.target.value}))} placeholder="Ej: Almacén, Taller, Operaciones..." /></FormField>
              <FormField label="Actividad / Sub-proceso"><Input value={form.proceso_actividad} onChange={e => setForm(f=>({...f,proceso_actividad:e.target.value}))} placeholder="Ej: Descarga de materiales..." /></FormField>
              <FormField label="Versión"><Input value={form.version} onChange={e => setForm(f=>({...f,version:e.target.value}))} placeholder="v1.0" /></FormField>
              <FormField label="Responsable / Elaborado por"><Input value={form.responsable} onChange={e => setForm(f=>({...f,responsable:e.target.value}))} placeholder="Nombre del responsable" /></FormField>
              <FormField label="Fecha de elaboración"><Input type="date" value={form.fecha_elaboracion} onChange={e => setForm(f=>({...f,fecha_elaboracion:e.target.value}))} /></FormField>
              <FormField label="Próxima revisión"><Input type="date" value={form.fecha_revision} onChange={e => setForm(f=>({...f,fecha_revision:e.target.value}))} /></FormField>
            </div>
            <FormField label="URL del documento (Google Drive, SharePoint, etc.)">
              <Input value={form.url_documento} onChange={e => setForm(f=>({...f,url_documento:e.target.value}))} placeholder="https://drive.google.com/..." />
            </FormField>
            <FormField label="Observaciones"><Input value={form.observaciones} onChange={e => setForm(f=>({...f,observaciones:e.target.value}))} placeholder="Ej: Pendiente aprobación gerencia, incluye actividades de alto riesgo..." /></FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={closeModal}>Cancelar</Btn>
              <Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : editing ? "Actualizar" : "Registrar"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
