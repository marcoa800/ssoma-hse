import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../../lib/supabase.js';
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
import {
  Plus, Upload, Download, ChevronRight, ChevronLeft, Lock,
  Trash2, Filter, HelpCircle, Pencil, FileDown, AlertTriangle,
  CheckCircle, Home, HeartPulse, Microscope, Search, Shield,
  ClipboardList, ShieldAlert, Activity, BarChart2, BookOpen,
  FileText, Users, LayoutDashboard, Stethoscope, Settings,
  Building2, Phone
} from 'lucide-react';

export default function KPIs({ kpis, setKpis, empresaId }) {
  const [modal, setModal] = useState(false);
  const [filterMes, setFilterMes] = useState("");
  const [filterNombre, setFilterNombre] = useState("");
  const [form, setForm] = useState({ nombre: "", mes: "", fecha: "", real: 0, meta: 100, unidad: "%" });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const meses = [...new Set(kpis.map(k => k.mes).filter(Boolean))];
  const filtered = kpis.filter(k => (!filterMes || k.mes === filterMes) && (!filterNombre || k.nombre.toLowerCase().includes(filterNombre.toLowerCase())));
  const isKpiMet = (k) => { const val = k.real ?? k.valor_real ?? 0; return k.meta === 0 ? val === 0 : (k.nombre.toLowerCase().includes("frecuencia") || k.nombre.toLowerCase().includes("accidente") ? val <= k.meta : val >= k.meta); };
  const saveKpi = async () => {
    if (!form.nombre) { showToast("El nombre es requerido", "error"); return; }
    setIsSaving(true);
    const { data, error } = await supabase.from("kpis").insert([{ nombre: form.nombre, mes: form.mes || "", fecha: form.fecha || null, valor_real: parseFloat(form.real) || 0, meta: parseFloat(form.meta) || 0, unidad: form.unidad || "", empresa_id: empresaId }]).select().single();
    if (error) { showToast("Error: " + error.message, "error"); setIsSaving(false); return; }
    setKpis(prev => [...prev, { ...data, real: data.valor_real }]); showToast("KPI registrado", "success"); setIsSaving(false); setModal(false);
  };
  const deleteKpi = async (id) => {
    if (!confirm("¿Eliminar este KPI?")) return;
    setIsDeleting(id);
    await supabase.from("kpis").delete().eq("id", id);
    setKpis(prev => prev.filter(k => k.id !== id)); showToast("KPI eliminado", "success"); setIsDeleting(null);
  };
  const exportKpis = () => {
    const data = filtered.map(k => { const val = k.real ?? k.valor_real ?? 0; return { Indicador: k.nombre, Mes: k.mes, Fecha: k.fecha || "", "Valor Real": val, Meta: k.meta, Unidad: k.unidad, Cumplido: isKpiMet(k) ? "Sí" : "No" }; });
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "KPIs"); XLSX.writeFile(wb, "kpis_ssoma.xlsx"); showToast("Excel descargado", "success");
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div><div className="text-sm font-semibold text-white">Gestión de KPIs</div><div className="text-xs text-gray-600">{filtered.length} indicadores</div></div>
        <div className="flex gap-2"><Btn size="sm" onClick={exportKpis}><Download size={13} /> Exportar</Btn><Btn size="sm" variant="primary" onClick={() => setModal(true)}><Plus size={13} /> Registrar Métrica</Btn></div>
      </div>
      <div className="flex gap-2 flex-wrap mb-4">
        <Filter size={13} className="text-gray-600 shrink-0 self-center" />
        <Select value={filterMes} onChange={e => setFilterMes(e.target.value)} style={{ width: 160 }}><option value="">Todos los meses</option>{meses.map(m => <option key={m}>{m}</option>)}</Select>
        <Input placeholder="Buscar indicador..." value={filterNombre} onChange={e => setFilterNombre(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {filtered.map(k => { const val = k.real ?? k.valor_real ?? 0; const ok = isKpiMet(k); return (
          <div key={k.id} className={`bg-gray-900 border border-gray-800 border-l-4 rounded-xl p-4 relative ${ok ? "border-l-emerald-500" : "border-l-red-500"}`}>
            <button onClick={() => deleteKpi(k.id)} disabled={isDeleting === k.id} className="absolute top-2 right-2 text-gray-700 hover:text-red-400"><Trash2 size={12} /></button>
            <div className="text-xs text-gray-500 mb-1 pr-4">{k.nombre}</div>
            <div className={`text-2xl font-semibold ${ok ? "text-emerald-400" : "text-red-400"}`}>{val}{k.unidad}</div>
            <div className="text-xs text-gray-600 mt-0.5">Meta: {k.meta}{k.unidad}</div>
            {k.mes && <div className="text-xs text-gray-700 mt-0.5">{k.mes}{k.fecha ? ` · ${fmtFecha(k.fecha)}` : ""}</div>}
            <div className="mt-2"><ProgressBar value={k.meta > 0 ? Math.min(Math.round((val / k.meta) * 100), 100) : 100} color={ok ? "emerald" : "red"} /></div>
            <div className={`text-xs mt-1.5 font-medium ${ok ? "text-emerald-500" : "text-red-500"}`}>{ok ? "✓ Cumplido" : "✕ No cumplido"}</div>
          </div>
        ); })}
      </div>
      {filtered.length === 0 && <div className="text-center py-12 text-gray-600 text-sm">No hay KPIs. Haz clic en "Registrar Métrica".</div>}
      {modal && (
        <Modal title="Registrar Métrica" onClose={() => setModal(false)}>
          <FormField label="Nombre del Indicador"><Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej. Índice de Frecuencia" /></FormField>
          <FormField label="Mes"><Input value={form.mes} onChange={e => setForm(f => ({ ...f, mes: e.target.value }))} placeholder="Abril 2025" /></FormField>
          <FormField label="Fecha"><Input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} /></FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Valor Real"><Input type="number" value={form.real} onChange={e => setForm(f => ({ ...f, real: e.target.value }))} /></FormField>
            <FormField label="Meta"><Input type="number" value={form.meta} onChange={e => setForm(f => ({ ...f, meta: e.target.value }))} /></FormField>
          </div>
          <FormField label="Unidad (%, días, etc)"><Input value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))} placeholder="%" /></FormField>
          <div className="flex gap-2 justify-end mt-4"><Btn onClick={() => setModal(false)}>Cancelar</Btn><Btn variant="primary" disabled={isSaving} onClick={saveKpi}>{isSaving ? "Guardando..." : "Guardar"}</Btn></div>
        </Modal>
      )}
    </div>
  );
}
