import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { calcularEdad, calcularVigencia, excelDateToISO } from '../../lib/helpers.js';
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

export default function Capacitaciones({ workers, trainings, setTrainings, empresaId }) {
  const [detail, setDetail] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [isDeleting, setIsDeleting] = useState(null);
  useEffect(() => { if (detail) loadAttendance(detail); }, [detail]);
  const loadAttendance = async (id) => {
    const { data } = await supabase.from("asistencias").select("trabajador_id, presente").eq("capacitacion_id", id);
    const map = {}; (data || []).forEach(a => { map[a.trabajador_id] = a.presente; }); setAttendance(map);
  };
  const toggleAttendance = async (tid, wid, checked) => {
    const { error } = await supabase.from("asistencias").upsert({ capacitacion_id: tid, trabajador_id: wid, presente: checked }, { onConflict: "capacitacion_id,trabajador_id" });
    if (error) { showToast("Error al guardar asistencia", "error"); return; }
    setAttendance(prev => ({ ...prev, [wid]: checked }));
    showToast(checked ? "Asistencia marcada" : "Ausencia registrada", checked ? "success" : "info");
  };
  const deleteTraining = async (id) => {
    if (!confirm("¿Eliminar esta capacitación?")) return;
    setIsDeleting(id);
    await supabase.from("capacitaciones").delete().eq("id", id);
    setTrainings(prev => prev.filter(t => t.id !== id));
    showToast("Capacitación eliminada", "success"); setIsDeleting(null);
  };
  const importAttendanceCSV = (e, tid) => {
    const file = e.target.files[0]; if (!file) return;
    Papa.parse(file, { header: true, complete: async (results) => {
      const dnis = results.data.map(r => String(r.DNI || r.dni || "").replace(/\D/g, "")).filter(Boolean);
      if (!dnis.length) { showToast("CSV inválido: columna DNI requerida", "error"); return; }
      const matched = workers.filter(w => dnis.includes(w.dni));
      for (const w of matched) await supabase.from("asistencias").upsert({ capacitacion_id: tid, trabajador_id: w.id, presente: true }, { onConflict: "capacitacion_id,trabajador_id" });
      await loadAttendance(tid);
      showToast(`${matched.length} asistencias marcadas`, "success");
    }});
    e.target.value = "";
  };
  const exportAttendance = (t) => {
    const active = workers.filter(w => w.estado === "Activo");
    const data = active.map(w => ({ Nombre: w.nombre, DNI: w.dni, Cargo: w.cargo, Asistencia: attendance[w.id] ? "Presente" : "Ausente" }));
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Asistencia"); XLSX.writeFile(wb, `asistencia_${t.nombre.replace(/\s+/g, "_")}.xlsx`);
    showToast("Excel descargado", "success");
  };
  if (detail) {
    const t = trainings.find(x => x.id === detail); if (!t) { setDetail(null); return null; }
    const active = workers.filter(w => w.estado === "Activo");
    const presentCount = Object.values(attendance).filter(Boolean).length;
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <Btn size="sm" onClick={() => setDetail(null)}><ChevronLeft size={13} /> Volver</Btn>
          <div><div className="text-sm font-semibold text-white">{t.nombre}</div><div className="text-xs text-gray-600">Fecha: {t.fecha} · {presentCount}/{active.length} presentes</div></div>
          <div className="ml-auto flex gap-2">
            <label className="cursor-pointer"><span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-all cursor-pointer"><Upload size={13} /> Importar CSV</span><input type="file" accept=".csv" className="hidden" onChange={e => importAttendanceCSV(e, detail)} /></label>
            <Btn size="sm" onClick={() => exportAttendance(t)}><Download size={13} /> Exportar</Btn>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800"><th className="px-4 py-3 w-10"><input type="checkbox" className="accent-blue-500" onChange={async e => { for (const w of active) await toggleAttendance(detail, w.id, e.target.checked); }} /></th>{["Nombre", "DNI", "Cargo", "Asistencia"].map(h => <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody>{active.map(w => { const present = !!attendance[w.id]; return (<tr key={w.id} className="border-b border-gray-800/50 hover:bg-gray-800/30"><td className="px-4 py-3"><input type="checkbox" className="accent-blue-500" checked={present} onChange={e => toggleAttendance(detail, w.id, e.target.checked)} /></td><td className="px-4 py-3 font-medium text-white">{w.nombre}</td><td className="px-4 py-3 font-mono text-xs text-gray-600">{w.dni}</td><td className="px-4 py-3 text-gray-400">{w.cargo}</td><td className="px-4 py-3"><Badge color={present ? "green" : "gray"}>{present ? "Presente" : "Ausente"}</Badge></td></tr>); })}</tbody>
          </table>
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div><div className="text-sm font-semibold text-white">Plan de Capacitaciones</div><div className="text-xs text-gray-600">{trainings.length} capacitaciones</div></div>
        <Btn size="sm" variant="primary" onClick={async () => {
          const nombre = prompt("Nombre de la capacitación:"); if (!nombre) return;
          const fecha = prompt("Fecha (YYYY-MM-DD):"); if (!fecha) return;
          const { data, error } = await supabase.from("capacitaciones").insert([{ nombre, fecha, programados: workers.filter(w => w.estado === "Activo").length, empresa_id: empresaId }]).select().single();
          if (error) { showToast("Error: " + error.message, "error"); return; }
          setTrainings(prev => [...prev, { ...data, asistencia_count: 0 }]); showToast("Capacitación creada", "success");
        }}><Plus size={13} /> Nueva</Btn>
      </div>
      <div className="space-y-2">
        {trainings.map(t => { const pct = t.programados > 0 ? Math.round(((t.asistencia_count || 0) / t.programados) * 100) : 0; return (
          <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-4">
            <div className="flex-1 min-w-0"><div className="font-medium text-white text-sm">{t.nombre}</div><div className="text-xs text-gray-600 mt-0.5">{t.fecha}</div></div>
            <div className="flex items-center gap-3 w-48"><div className="flex-1"><ProgressBar value={pct} color={pct >= 80 ? "emerald" : pct >= 40 ? "amber" : "red"} /></div><span className="text-xs text-gray-500 whitespace-nowrap">{t.asistencia_count || 0}/{t.programados} ({pct}%)</span></div>
            <Btn size="sm" onClick={() => setDetail(t.id)}>Ver detalle <ChevronRight size={12} /></Btn>
            <Btn size="sm" variant="danger" disabled={isDeleting === t.id} onClick={() => deleteTraining(t.id)}><Trash2 size={12} /></Btn>
          </div>
        ); })}
        {trainings.length === 0 && <div className="text-center py-12 text-gray-600 text-sm">No hay capacitaciones registradas</div>}
      </div>
    </div>
  );
}
