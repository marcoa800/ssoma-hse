import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase, puedeEliminar } from '../../lib/supabase.js';
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

export default function Documentos({ docs, setDocs, empresaId }) {
  const [catFilter, setCatFilter] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nombre: "", categoria: "Seguridad", version: "v1", url: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const cats = ["Seguridad", "Salud", "Ambiente"];
  const filtered = docs.filter(d => !catFilter || d.categoria === catFilter);
  const catColor = { Seguridad: "red", Salud: "blue", Ambiente: "green" };
  const saveDoc = async () => {
    if (!form.nombre) { showToast("El nombre es requerido", "error"); return; }
    setIsSaving(true);
    const { data, error } = await supabase.from("documentos").insert([{ nombre: form.nombre, categoria: form.categoria, version: form.version || "v1", url_externa: form.url || null, empresa_id: empresaId }]).select().single();
    if (error) { showToast("Error: " + error.message, "error"); setIsSaving(false); return; }
    setDocs(prev => [data, ...prev]); showToast("Documento registrado", "success"); setIsSaving(false); setModal(false);
  };
  const deleteDoc = async (id) => {
    if (!confirm("¿Eliminar este documento?")) return;
    setIsDeleting(id);
    await supabase.from("documentos").delete().eq("id", id);
    setDocs(prev => prev.filter(d => d.id !== id)); showToast("Eliminado", "success"); setIsDeleting(null);
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div><div className="text-sm font-semibold text-white">Centro Documental</div><div className="text-xs text-gray-600">Documentos SIG — ISO 45001</div></div>
        <Btn size="sm" variant="primary" onClick={() => setModal(true)}><Plus size={13} /> Agregar</Btn>
      </div>
      <div className="flex gap-1 border-b border-gray-800 mb-4">{[{ label: `Todos (${docs.length})`, val: "" }, ...cats.map(c => ({ label: `${c} (${docs.filter(d => d.categoria === c).length})`, val: c }))].map(tab => (<button key={tab.val} onClick={() => setCatFilter(tab.val)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${catFilter === tab.val ? "border-blue-500 text-blue-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>{tab.label}</button>))}</div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800">{["Documento", "Categoría", "Versión", "Fecha", ""].map(h => <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(d => (<tr key={d.id} className="border-b border-gray-800/50 hover:bg-gray-800/30"><td className="px-4 py-3 font-medium text-white">{d.nombre}</td><td className="px-4 py-3"><Badge color={catColor[d.categoria] || "gray"}>{d.categoria}</Badge></td><td className="px-4 py-3 font-mono text-xs text-gray-600">{d.version}</td><td className="px-4 py-3 text-xs text-gray-600">{d.fecha}</td><td className="px-4 py-3"><div className="flex gap-1">{d.url_externa && <Btn size="sm" onClick={() => window.open(d.url_externa, "_blank")}>↗ Ver</Btn>}{puedeEliminar() && (<Btn size="sm" variant="danger" disabled={isDeleting === d.id} onClick={() => deleteDoc(d.id)}><Trash2 size={12} /></Btn>)}</div></td></tr>))}
            {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600 text-sm">No hay documentos</td></tr>}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title="Agregar Documento" onClose={() => setModal(false)}>
          <FormField label="Nombre del Documento"><Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></FormField>
          <FormField label="Categoría"><Select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>{cats.map(c => <option key={c}>{c}</option>)}</Select></FormField>
          <FormField label="Versión"><Input value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} placeholder="v1" /></FormField>
          <FormField label="URL del documento"><Input placeholder="https://..." value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} /></FormField>
          <div className="flex gap-2 justify-end mt-4"><Btn onClick={() => setModal(false)}>Cancelar</Btn><Btn variant="primary" disabled={isSaving} onClick={saveDoc}>{isSaving ? "Guardando..." : "Guardar"}</Btn></div>
        </Modal>
      )}
    </div>
  );
}
