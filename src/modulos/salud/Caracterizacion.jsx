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
import {
  Plus, Upload, Download, ChevronRight, ChevronLeft, Lock,
  Trash2, Filter, HelpCircle, Pencil, FileDown, AlertTriangle,
  CheckCircle, XCircle, Home, HeartPulse, Microscope, Search, Shield,
  ClipboardList, ShieldAlert, Activity, BarChart2, BookOpen,
  FileText, Users, LayoutDashboard, Stethoscope, Settings,
  Building2, Phone
} from 'lucide-react';

const CR_TABS = ["Datos", "Tareas", "Físico", "Ergo", "Controles", "Fotos", "Cierre"];

const CR_CONTROL_STYLES = {
  eliminacion: { label: "text-emerald-400", area: "bg-emerald-900/10 border-emerald-900/40 focus:border-emerald-600" },
  ingenieria:  { label: "text-blue-400",    area: "bg-blue-900/10 border-blue-900/40 focus:border-blue-600" },
  admin:       { label: "text-amber-400",   area: "bg-amber-900/10 border-amber-900/40 focus:border-amber-600" },
  epp:         { label: "text-red-400",     area: "bg-red-900/10 border-red-900/40 focus:border-red-600" },
};
const CR_RIESGO_BADGE = {
  Bajo:  "bg-emerald-900/40 text-emerald-400 border border-emerald-800",
  Medio: "bg-amber-900/40 text-amber-400 border border-amber-800",
  Alto:  "bg-red-900/40 text-red-400 border border-red-800",
};

const makeCrBlank = () => ({
  fecha: new Date().toISOString().split("T")[0],
  macroproceso: "", subproceso: "", puesto_trabajo: "", evaluador: "",
  num_varones: 0, num_mujeres: 0,
  trabajadores_sensibles: false, trabajadores_pcd: false, trabajadores_gestantes: false,
  tareas_principales: "", tareas_secundarias: "", tareas_no_rutinarias: "",
  dim_largo: "", dim_ancho: "", dim_alto: "", herramientas: "", equipos: "",
  // Físico - Ruido
  expuesto_ruido: false,
  ruido_tipo: "", ruido_dificulta_conversacion: "", ruido_tiempo_exposicion: "", ruido_decibeles: "",
  // Físico - Polvo
  expuesto_polvo: false,
  polvo_fuente: "", polvo_tipo_principal: "", polvo_nivel_visual: "",
  // Físico - Térmico
  expuesto_ambiente_termico: false,
  termico_fuente: "", termico_nivel_riesgo: "",
  // Físico - Otros
  iluminacion_tipo: "", iluminacion_nivel: "", ventilacion_tipo: "", ventilacion_calidad: "", radiacion: "",
  // Ergo
  ergo_posturas_incomodas: false,    ergo_posturas_detalle: [],
  ergo_levantamiento_cargas: false,  ergo_levantamiento_limite: "",
  ergo_esfuerzo_manos: false,        ergo_manos_detalle: [],
  ergo_movimientos_repetitivos: false, ergo_repetitivos_grupos: [],
  ergo_impacto_repetido: false,   ergo_impacto_detalle: [],
  ergo_vibracion_brazo: false,    ergo_vibracion_nivel: "",
  // Controles
  control_eliminacion: "", control_ingenieria: "", control_administrativo: "", control_epp: "",
  conclusiones: "", recomendaciones: "",
  estado: "Borrador",
  fotos_urls: [],
});

function crRiesgoLabel(r) {
  const ergo  = [r.ergo_posturas_incomodas, r.ergo_levantamiento_cargas, r.ergo_esfuerzo_manos,
                 r.ergo_movimientos_repetitivos, r.ergo_impacto_repetido, r.ergo_vibracion_brazo].filter(Boolean).length;
  const fisico = [r.expuesto_ruido, r.expuesto_polvo, r.expuesto_ambiente_termico].filter(Boolean).length;
  const t = ergo + fisico;
  if (t >= 4) return "Alto";
  if (t >= 2) return "Medio";
  return "Bajo";
}

function generarPDFCaracterizacion(r, empresaNombre = "SSOMA HSE") {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 15;

  const addSection = (title, color = [37, 99, 235]) => {
    if (y > 250) { doc.addPage(); y = 15; }
    doc.setFillColor(...color);
    doc.rect(10, y, W - 20, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), 14, y + 5);
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "normal");
    y += 10;
  };

  const addRow = (label, value, indent = 14) => {
    if (y > 270) { doc.addPage(); y = 15; }
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text(label + ":", indent, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    const val = String(value || "—");
    const lines = doc.splitTextToSize(val, W - indent - 60);
    doc.text(lines, indent + 55, y);
    y += Math.max(5, lines.length * 4.5);
  };

  const addCheck = (label, checked, indent = 18) => {
    if (y > 270) { doc.addPage(); y = 15; }
    doc.setFontSize(8);
    doc.setTextColor(checked ? 30 : 120, 30, 30);
    doc.text((checked ? "☑ " : "☐ ") + label, indent, y);
    y += 5;
  };

  // ── HEADER ──
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, W, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("CARACTERIZACIÓN DE RIESGO", W / 2, 11, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Evaluación Ergonómica y de Factores Físicos (RM-375)", W / 2, 18, { align: "center" });
  doc.setFontSize(8);
  doc.text(empresaNombre, 14, 24);
  doc.text("Estado: " + (r.estado || "Borrador"), W - 14, 24, { align: "right" });
  y = 35;

  // ── DATOS DEL PROCESO ──
  addSection("1. Identificación del Proceso", [30, 64, 175]);
  addRow("Puesto de Trabajo", r.puesto_trabajo);
  addRow("Fecha de Evaluación", r.fecha);
  addRow("Evaluador Responsable", r.evaluador);
  addRow("Macroproceso", r.macroproceso);
  addRow("Subproceso", r.subproceso);
  addRow("N° Varones", r.num_varones || 0);
  addRow("N° Mujeres", r.num_mujeres || 0);
  const especiales = [r.trabajadores_sensibles && "Sensibles", r.trabajadores_pcd && "PCD", r.trabajadores_gestantes && "Gestantes"].filter(Boolean);
  addRow("Grupos especiales", especiales.length ? especiales.join(", ") : "Ninguno");
  y += 2;

  // ── TAREAS ──
  addSection("2. Descripción de Tareas", [30, 64, 175]);
  addRow("Tareas principales (80%)", r.tareas_principales);
  addRow("Tareas secundarias", r.tareas_secundarias);
  addRow("Tareas no rutinarias", r.tareas_no_rutinarias);
  if (r.dim_largo || r.dim_ancho || r.dim_alto) {
    addRow("Dimensiones (m)", `L:${r.dim_largo||0} × A:${r.dim_ancho||0} × H:${r.dim_alto||0}`);
  }
  addRow("Herramientas", r.herramientas);
  addRow("Equipos", r.equipos);
  y += 2;

  // ── FACTORES FÍSICOS ──
  addSection("3. Factores Físicos", [30, 64, 175]);
  addCheck("Ruido" + (r.ruido_decibeles ? ` (${r.ruido_decibeles} dB(A))` : ""), r.expuesto_ruido);
  if (r.expuesto_ruido && r.ruido_tipo) { doc.setFontSize(7.5); doc.setTextColor(80,80,80); doc.text(`   Tipo: ${r.ruido_tipo} | Tiempo: ${r.ruido_tiempo_exposicion||"—"} | ¿Dificulta conversación?: ${r.ruido_dificulta_conversacion||"—"}`, 22, y); y += 4.5; }
  addCheck("Polvo / Material Particulado" + (r.polvo_tipo_principal ? ` — ${r.polvo_tipo_principal}` : ""), r.expuesto_polvo);
  if (r.expuesto_polvo && r.polvo_fuente) { doc.setFontSize(7.5); doc.setTextColor(80,80,80); doc.text(`   Fuente: ${r.polvo_fuente} | Nivel visual: ${r.polvo_nivel_visual||"—"}`, 22, y); y += 4.5; }
  addCheck("Ambiente Térmico (Calor)" + (r.termico_nivel_riesgo ? ` — ${r.termico_nivel_riesgo}` : ""), r.expuesto_ambiente_termico);
  if (r.expuesto_ambiente_termico && r.termico_fuente) { doc.setFontSize(7.5); doc.setTextColor(80,80,80); doc.text(`   Fuente: ${r.termico_fuente}`, 22, y); y += 4.5; }
  doc.setTextColor(30,30,30);
  if (r.iluminacion_tipo) addRow("Iluminación", `${r.iluminacion_tipo} — ${r.iluminacion_nivel||"—"}`);
  if (r.ventilacion_tipo) addRow("Ventilación", `${r.ventilacion_tipo} — ${r.ventilacion_calidad||"—"}`);
  if (r.radiacion)        addRow("Radiación", r.radiacion);
  y += 2;

  // ── ERGONOMÍA ──
  addSection("4. Checklist Ergonómico (RM-375)", [30, 64, 175]);
  addCheck("Posturas Incómodas o Forzadas", r.ergo_posturas_incomodas);
  if (r.ergo_posturas_incomodas && (r.ergo_posturas_detalle||[]).length) { doc.setFontSize(7.5); doc.setTextColor(80,80,80); doc.text(`   ${(r.ergo_posturas_detalle||[]).join(", ")}`, 22, y); y += 4.5; }
  addCheck("Levantamiento de Cargas", r.ergo_levantamiento_cargas);
  if (r.ergo_levantamiento_cargas && r.ergo_levantamiento_limite) { doc.setFontSize(7.5); doc.setTextColor(80,80,80); doc.text(`   Límite: ${r.ergo_levantamiento_limite}`, 22, y); y += 4.5; }
  addCheck("Esfuerzo de Manos y Muñecas", r.ergo_esfuerzo_manos);
  if (r.ergo_esfuerzo_manos && (r.ergo_manos_detalle||[]).length) { doc.setFontSize(7.5); doc.setTextColor(80,80,80); doc.text(`   ${(r.ergo_manos_detalle||[]).join(", ")}`, 22, y); y += 4.5; }
  addCheck("Movimientos Repetitivos", r.ergo_movimientos_repetitivos);
  if (r.ergo_movimientos_repetitivos && (r.ergo_repetitivos_grupos||[]).length) { doc.setFontSize(7.5); doc.setTextColor(80,80,80); doc.text(`   Grupos: ${(r.ergo_repetitivos_grupos||[]).join(", ")}`, 22, y); y += 4.5; }
  addCheck("Impacto Repetido", r.ergo_impacto_repetido);
  if (r.ergo_impacto_repetido && (r.ergo_impacto_detalle||[]).length) { doc.setFontSize(7.5); doc.setTextColor(80,80,80); doc.text(`   Zona: ${(r.ergo_impacto_detalle||[]).join(", ")}`, 22, y); y += 4.5; }
  addCheck("Vibración Brazo-Mano", r.ergo_vibracion_brazo);
  if (r.ergo_vibracion_brazo && r.ergo_vibracion_nivel) { doc.setFontSize(7.5); doc.setTextColor(80,80,80); doc.text(`   Nivel: ${r.ergo_vibracion_nivel}`, 22, y); y += 4.5; }
  doc.setTextColor(30,30,30);
  y += 2;

  // ── CONTROLES ──
  addSection("5. Jerarquía de Controles", [30, 64, 175]);
  if (r.control_eliminacion) addRow("1. Eliminación/Sustitución", r.control_eliminacion);
  if (r.control_ingenieria)  addRow("2. Controles de Ingeniería", r.control_ingenieria);
  if (r.control_administrativo) addRow("3. Controles Administrativos", r.control_administrativo);
  if (r.control_epp)         addRow("4. EPP", r.control_epp);
  y += 2;

  // ── CIERRE ──
  addSection("6. Conclusiones y Recomendaciones", [30, 64, 175]);
  const ergoC = [r.ergo_posturas_incomodas, r.ergo_levantamiento_cargas, r.ergo_esfuerzo_manos, r.ergo_movimientos_repetitivos, r.ergo_impacto_repetido, r.ergo_vibracion_brazo].filter(Boolean).length;
  const fisC  = [r.expuesto_ruido, r.expuesto_polvo, r.expuesto_ambiente_termico].filter(Boolean).length;
  const nivel = (ergoC + fisC) >= 4 ? "ALTO" : (ergoC + fisC) >= 2 ? "MEDIO" : "BAJO";
  addRow("Nivel de Riesgo Global", nivel + ` (${fisC} físico(s) + ${ergoC} ergonómico(s))`);
  addRow("Conclusiones", r.conclusiones);
  addRow("Recomendaciones", r.recomendaciones);

  // ── FOOTER ──
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generado: ${new Date().toLocaleDateString("es-PE")} | Pág. ${i}/${pages}`, W / 2, 290, { align: "center" });
  }

  doc.save(`Caracterizacion_${(r.puesto_trabajo || "evaluacion").replace(/\s+/g, "_")}_${r.fecha || "sin_fecha"}.pdf`);
}

export default function CaracterizacionRiesgoModulo({ empresaId }) {
  const [records, setRecords]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState("list"); // "list" | "form"
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(makeCrBlank());
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]   = useState("");
  const [fEstado, setFEstado] = useState("");
  const [fNivel, setFNivel]   = useState("");

  const load = async () => {
    if (!empresaId) return;
    setLoading(true);
    const { data } = await supabase
      .from("caracterizacion_riesgo")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [empresaId]);

  const openNew = () => { setEditing(null); setForm(makeCrBlank()); setActiveTab(0); setView("form"); };
  const openEdit = (r) => { setEditing(r.id); setForm({ ...makeCrBlank(), ...r }); setActiveTab(0); setView("form"); };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta caracterización?")) return;
    await supabase.from("caracterizacion_riesgo").delete().eq("id", id);
    showToast("Eliminado", "info"); load();
  };

  const save = async (estadoFinal) => {
    if (!form.puesto_trabajo.trim()) { showToast("El puesto de trabajo es obligatorio", "error"); return; }
    setSaving(true);
    const payload = {
      ...form, empresa_id: empresaId, estado: estadoFinal || form.estado,
      num_varones: Number(form.num_varones) || 0,
      num_mujeres: Number(form.num_mujeres) || 0,
      dim_largo: form.dim_largo ? Number(form.dim_largo) : null,
      dim_ancho: form.dim_ancho ? Number(form.dim_ancho) : null,
      dim_alto:  form.dim_alto  ? Number(form.dim_alto)  : null,
      fotos_urls: form.fotos_urls || [],
    };
    delete payload.id; delete payload.created_at;
    const { error } = editing
      ? await supabase.from("caracterizacion_riesgo").update(payload).eq("id", editing)
      : await supabase.from("caracterizacion_riesgo").insert([payload]);
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast(editing ? "Evaluación actualizada" : "Evaluación creada", "success");
    setView("list"); load();
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleArr = (k, val) => setForm(p => ({
    ...p,
    [k]: (p[k] || []).includes(val) ? (p[k] || []).filter(x => x !== val) : [...(p[k] || []), val],
  }));

  const ergoCount  = [form.ergo_posturas_incomodas, form.ergo_levantamiento_cargas, form.ergo_esfuerzo_manos,
                      form.ergo_movimientos_repetitivos, form.ergo_impacto_repetido, form.ergo_vibracion_brazo].filter(Boolean).length;
  const fisicoCount = [form.expuesto_ruido, form.expuesto_polvo, form.expuesto_ambiente_termico].filter(Boolean).length;
  const totalRiesgo = ergoCount + fisicoCount;
  const nivelActual = totalRiesgo >= 4 ? "Alto" : totalRiesgo >= 2 ? "Medio" : "Bajo";

  // ── FORM VIEW ──
  if (view === "form") {
    return (
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView("list")} className="text-gray-500 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-white font-semibold">{editing ? "Editar" : "Nueva"} Caracterización de Riesgo</h2>
            <p className="text-xs text-gray-500">{form.puesto_trabajo || "Sin puesto asignado"}</p>
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={() => save("Borrador")} disabled={saving} className="px-3 py-1.5 rounded-lg text-xs border border-gray-700 text-gray-400 hover:text-white transition-colors">
              Guardar borrador
            </button>
            <button onClick={() => save("Completado")} disabled={saving} className="px-3 py-1.5 rounded-lg text-xs bg-blue-600 hover:bg-blue-500 text-white transition-colors">
              {saving ? "Guardando…" : "Completar"}
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 bg-gray-900 rounded-xl p-1 border border-gray-800 overflow-x-auto">
          {CR_TABS.map((t, i) => (
            <button key={i} onClick={() => setActiveTab(i)}
              className={`flex-1 min-w-max px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === i ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-300"}`}>
              {t}
            </button>
          ))}
        </div>

        {/* ── Tab 0: Datos ── */}
        {activeTab === 0 && (
          <div className="space-y-5">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2"><FileText size={16} className="text-blue-400" />Identificación del Proceso</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Fecha *</label>
                  <input type="date" value={form.fecha} onChange={e => f("fecha", e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Evaluador Responsable</label>
                  <input value={form.evaluador} onChange={e => f("evaluador", e.target.value)} placeholder="Nombre del evaluador" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Macroproceso</label>
                  <input value={form.macroproceso} onChange={e => f("macroproceso", e.target.value)} placeholder="Ej. Producción, Mantenimiento…" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Subproceso</label>
                  <input value={form.subproceso} onChange={e => f("subproceso", e.target.value)} placeholder="Ej. Soldadura, Ensamble…" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Puesto de Trabajo *</label>
                  <input value={form.puesto_trabajo} onChange={e => f("puesto_trabajo", e.target.value)} placeholder="Ej. Operador de maquinaria pesada" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600" />
                </div>
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2"><Users size={16} className="text-blue-400" />Trabajadores Asignados</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nº Varones</label>
                  <input type="number" min="0" value={form.num_varones} onChange={e => f("num_varones", e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nº Mujeres</label>
                  <input type="number" min="0" value={form.num_mujeres} onChange={e => f("num_mujeres", e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
              </div>
              <div className="flex flex-wrap gap-5">
                {[["trabajadores_sensibles","Sensibles"],["trabajadores_pcd","Discapacitados (PCD)"],["trabajadores_gestantes","Gestantes"]].map(([k, lbl]) => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form[k]} onChange={e => f(k, e.target.checked)} className="accent-blue-500 w-4 h-4" />
                    <span className="text-sm text-gray-300">{lbl}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 1: Tareas ── */}
        {activeTab === 1 && (
          <div className="space-y-5">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2"><ClipboardList size={16} className="text-blue-400" />Descripción de Tareas</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tareas Principales (80% de la jornada)</label>
                  <textarea rows={3} value={form.tareas_principales} onChange={e => f("tareas_principales", e.target.value)} placeholder="Describe las tareas más frecuentes y de mayor exposición…" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tareas Secundarias</label>
                  <textarea rows={2} value={form.tareas_secundarias} onChange={e => f("tareas_secundarias", e.target.value)} placeholder="Actividades ocasionales…" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tareas No Rutinarias</label>
                  <textarea rows={2} value={form.tareas_no_rutinarias} onChange={e => f("tareas_no_rutinarias", e.target.value)} placeholder="Actividades esporádicas o de emergencia…" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none" />
                </div>
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold text-sm mb-4">Dimensiones y Recursos del Puesto</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {[["dim_largo","Largo (m)"],["dim_ancho","Ancho (m)"],["dim_alto","Alto (m)"]].map(([k,lbl]) => (
                  <div key={k}>
                    <label className="text-xs text-gray-500 mb-1 block">{lbl}</label>
                    <input type="number" step="0.1" min="0" value={form[k]} onChange={e => f(k, e.target.value)} placeholder="0.0" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Herramientas</label>
                  <input value={form.herramientas} onChange={e => f("herramientas", e.target.value)} placeholder="Ej. Taladro, esmeril, martillo…" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Equipos</label>
                  <input value={form.equipos} onChange={e => f("equipos", e.target.value)} placeholder="Ej. Montacargas, compresora…" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 2: Físico ── */}
        {activeTab === 2 && (
          <div className="space-y-4">
            {/* RUIDO */}
            <div className={`bg-gray-900 border rounded-xl overflow-hidden transition-colors ${form.expuesto_ruido ? "border-blue-700" : "border-gray-800"}`}>
              <div onClick={() => f("expuesto_ruido", !form.expuesto_ruido)} className="flex items-center justify-between px-5 py-4 cursor-pointer select-none">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔊</span>
                  <div>
                    <div className="text-sm font-semibold text-white">Ruido</div>
                    <div className="text-xs text-gray-500">Exposición a ruido continuo, intermitente o de impacto</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${form.expuesto_ruido ? "text-blue-400" : "text-gray-600"}`}>Expuesto</span>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${form.expuesto_ruido ? "bg-blue-600 border-blue-600" : "border-gray-600"}`}>
                    {form.expuesto_ruido && <CheckCircle size={12} className="text-white" />}
                  </div>
                </div>
              </div>
              {form.expuesto_ruido && (
                <div className="px-5 pb-4 border-t border-blue-900/40 bg-blue-900/10 space-y-3">
                  <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Tipo de Ruido</label>
                      <select value={form.ruido_tipo} onChange={e => f("ruido_tipo", e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                        <option value="">- Tipo de Ruido -</option>
                        {["Continuo","Intermitente","De impacto"].map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">¿Dificulta conversación a 1 m?</label>
                      <select value={form.ruido_dificulta_conversacion} onChange={e => f("ruido_dificulta_conversacion", e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                        <option value="">- Seleccionar -</option>
                        {["Sí","No"].map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Tiempo de Exposición</label>
                      <select value={form.ruido_tiempo_exposicion} onChange={e => f("ruido_tiempo_exposicion", e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                        <option value="">- Límite Normativo -</option>
                        {["> 8 hrs/día","4–8 hrs/día","1–4 hrs/día","< 1 hr/día"].map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Decibeles medidos/estimados</label>
                      <div className="flex">
                        <input type="number" step="0.1" value={form.ruido_decibeles} onChange={e => f("ruido_decibeles", e.target.value)} placeholder="Ej. 85" className="flex-1 bg-gray-800 border border-gray-700 rounded-l-lg px-3 py-2 text-sm text-white placeholder-gray-600" />
                        <span className="bg-gray-700 border border-gray-600 border-l-0 rounded-r-lg px-3 py-2 text-xs text-gray-400 flex items-center">dB(A)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* POLVO */}
            <div className={`bg-gray-900 border rounded-xl overflow-hidden transition-colors ${form.expuesto_polvo ? "border-blue-700" : "border-gray-800"}`}>
              <div onClick={() => f("expuesto_polvo", !form.expuesto_polvo)} className="flex items-center justify-between px-5 py-4 cursor-pointer select-none">
                <div className="flex items-center gap-3">
                  <span className="text-xl">💨</span>
                  <div>
                    <div className="text-sm font-semibold text-white">Polvo / Material Particulado</div>
                    <div className="text-xs text-gray-500">Polvo, humo, neblina u otro material en suspensión</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${form.expuesto_polvo ? "text-blue-400" : "text-gray-600"}`}>Expuesto</span>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${form.expuesto_polvo ? "bg-blue-600 border-blue-600" : "border-gray-600"}`}>
                    {form.expuesto_polvo && <CheckCircle size={12} className="text-white" />}
                  </div>
                </div>
              </div>
              {form.expuesto_polvo && (
                <div className="px-5 pb-4 border-t border-blue-900/40 bg-blue-900/10 space-y-3">
                  <div className="pt-3">
                    <label className="text-xs text-gray-500 mb-1 block">Fuente generadora</label>
                    <input value={form.polvo_fuente} onChange={e => f("polvo_fuente", e.target.value)} placeholder="Ej. Chancadora, Viento, Faja transportadora…" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Tipo Principal</label>
                      <select value={form.polvo_tipo_principal} onChange={e => f("polvo_tipo_principal", e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                        <option value="">- Tipo Principal -</option>
                        {["Sílice libre cristalina","Carbón","Madera","Metálico","Orgánico","Otro"].map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Nivel Visual</label>
                      <select value={form.polvo_nivel_visual} onChange={e => f("polvo_nivel_visual", e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                        <option value="">- Nivel Visual -</option>
                        {["Bajo (no visible)","Moderado (visible)","Alto (muy visible)"].map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* AMBIENTE TÉRMICO */}
            <div className={`bg-gray-900 border rounded-xl overflow-hidden transition-colors ${form.expuesto_ambiente_termico ? "border-orange-700" : "border-gray-800"}`}>
              <div onClick={() => f("expuesto_ambiente_termico", !form.expuesto_ambiente_termico)} className="flex items-center justify-between px-5 py-4 cursor-pointer select-none">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🌡️</span>
                  <div>
                    <div className="text-sm font-semibold text-white">Ambiente Térmico (Calor)</div>
                    <div className="text-xs text-gray-500">Calor extremo, frío intenso o variaciones significativas</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${form.expuesto_ambiente_termico ? "text-orange-400" : "text-gray-600"}`}>Expuesto</span>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${form.expuesto_ambiente_termico ? "bg-orange-500 border-orange-500" : "border-gray-600"}`}>
                    {form.expuesto_ambiente_termico && <CheckCircle size={12} className="text-white" />}
                  </div>
                </div>
              </div>
              {form.expuesto_ambiente_termico && (
                <div className="px-5 pb-4 border-t border-orange-900/40 bg-orange-900/10 space-y-3">
                  <div className="pt-3">
                    <label className="text-xs text-gray-500 mb-1 block">Fuente de calor</label>
                    <input value={form.termico_fuente} onChange={e => f("termico_fuente", e.target.value)} placeholder="Ej. Horno, Clima exterior, Motor, Fundición…" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Nivel de Riesgo Térmico</label>
                    <select value={form.termico_nivel_riesgo} onChange={e => f("termico_nivel_riesgo", e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                      <option value="">- Nivel de Riesgo Térmico -</option>
                      {["Leve","Moderado","Severo"].map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* OTROS FACTORES */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold text-sm mb-4">Otros Factores del Entorno</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Iluminación — Tipo</label>
                  <select value={form.iluminacion_tipo} onChange={e => f("iluminacion_tipo", e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="">Seleccionar…</option>
                    {["Natural","Artificial","Mixta"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Iluminación — Nivel</label>
                  <select value={form.iluminacion_nivel} onChange={e => f("iluminacion_nivel", e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="">Seleccionar…</option>
                    {["Deficiente","Adecuado","Excesivo"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Ventilación — Tipo</label>
                  <select value={form.ventilacion_tipo} onChange={e => f("ventilacion_tipo", e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="">Seleccionar…</option>
                    {["Natural","Forzada","Local exhaustora","Sin ventilación"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Ventilación — Calidad</label>
                  <select value={form.ventilacion_calidad} onChange={e => f("ventilacion_calidad", e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="">Seleccionar…</option>
                    {["Buena","Regular","Deficiente"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Radiación</label>
                  <select value={form.radiacion} onChange={e => f("radiacion", e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="">Sin exposición a radiación</option>
                    {["Radiación UV solar","Radiación ionizante","Radiación infrarroja","Radiación electromagnética"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 3: Ergo ── */}
        {activeTab === 3 && (
          <div className="space-y-3">
            <div className="text-xs text-blue-300 bg-blue-900/20 border border-blue-900/40 rounded-lg px-3 py-2 flex items-center gap-2">
              <BarChart2 size={14} className="shrink-0" />
              Active la categoría si se supera el límite de tiempo/exposición. Luego seleccione los detalles específicos observados.
            </div>

            {/* 1 — Posturas Incómodas */}
            <div className={`bg-gray-900 border rounded-xl overflow-hidden ${form.ergo_posturas_incomodas ? "border-amber-600" : "border-gray-800"}`}>
              <div onClick={() => f("ergo_posturas_incomodas", !form.ergo_posturas_incomodas)} className="flex items-center justify-between px-5 py-4 cursor-pointer select-none">
                <div>
                  <div className="text-sm font-semibold text-white">Posturas Incómodas o Forzadas</div>
                  <div className="text-xs text-gray-500">Posturas anómalas por más de 2 hrs/día.</div>
                </div>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${form.ergo_posturas_incomodas ? "bg-amber-500 border-amber-500" : "border-gray-600"}`}>
                  {form.ergo_posturas_incomodas && <CheckCircle size={12} className="text-white" />}
                </div>
              </div>
              {form.ergo_posturas_incomodas && (
                <div className="px-5 pb-4 pt-2 border-t border-amber-900/40 bg-amber-900/10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                    {["Manos > cabeza","Codos > hombro","Espalda inclinada > 30°","Espalda extendida > 30°","Cuello doblado/girado > 30°","Sentado con espalda girada > 30°","De cuclillas o rodillas"].map(op => (
                      <label key={op} className="flex items-center gap-2 cursor-pointer py-0.5">
                        <input type="checkbox" checked={(form.ergo_posturas_detalle||[]).includes(op)} onChange={() => toggleArr("ergo_posturas_detalle", op)} className="accent-amber-500 w-3.5 h-3.5" />
                        <span className="text-xs text-gray-300">{op}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2 — Levantamiento de Cargas */}
            <div className={`bg-gray-900 border rounded-xl overflow-hidden ${form.ergo_levantamiento_cargas ? "border-amber-600" : "border-gray-800"}`}>
              <div onClick={() => f("ergo_levantamiento_cargas", !form.ergo_levantamiento_cargas)} className="flex items-center justify-between px-5 py-4 cursor-pointer select-none">
                <div>
                  <div className="text-sm font-semibold text-white">Levantamiento de Cargas</div>
                  <div className="text-xs text-gray-500">Supera límites de peso y/o frecuencia.</div>
                </div>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${form.ergo_levantamiento_cargas ? "bg-amber-500 border-amber-500" : "border-gray-600"}`}>
                  {form.ergo_levantamiento_cargas && <CheckCircle size={12} className="text-white" />}
                </div>
              </div>
              {form.ergo_levantamiento_cargas && (
                <div className="px-5 pb-4 pt-3 border-t border-amber-900/40 bg-amber-900/10">
                  <label className="text-xs text-gray-500 mb-1 block">Seleccione el límite superado</label>
                  <select value={form.ergo_levantamiento_limite} onChange={e => f("ergo_levantamiento_limite", e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="">- Seleccione el límite superado -</option>
                    {["> 25 kg (hombre ocasional)","25 kg frecuente o > 15 kg (mujer)","Cargas en postura forzada","Frecuencia > 12 veces/hora","Distancia horizontal > 50 cm"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* 3 — Esfuerzo de Manos y Muñecas */}
            <div className={`bg-gray-900 border rounded-xl overflow-hidden ${form.ergo_esfuerzo_manos ? "border-amber-600" : "border-gray-800"}`}>
              <div onClick={() => f("ergo_esfuerzo_manos", !form.ergo_esfuerzo_manos)} className="flex items-center justify-between px-5 py-4 cursor-pointer select-none">
                <div>
                  <div className="text-sm font-semibold text-white">Esfuerzo de Manos y Muñecas</div>
                  <div className="text-xs text-gray-500">Manipulación forzada por más de 2 hrs/día.</div>
                </div>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${form.ergo_esfuerzo_manos ? "bg-amber-500 border-amber-500" : "border-gray-600"}`}>
                  {form.ergo_esfuerzo_manos && <CheckCircle size={12} className="text-white" />}
                </div>
              </div>
              {form.ergo_esfuerzo_manos && (
                <div className="px-5 pb-4 pt-2 border-t border-amber-900/40 bg-amber-900/10">
                  <div className="space-y-1.5">
                    {["Pinza de objeto > 1 Kg","Fuerza con muñeca flexionada/extendida","Fuerza con muñeca lateralizada/girada","Atornillado de forma intensa"].map(op => (
                      <label key={op} className="flex items-center gap-2 cursor-pointer py-0.5">
                        <input type="checkbox" checked={(form.ergo_manos_detalle||[]).includes(op)} onChange={() => toggleArr("ergo_manos_detalle", op)} className="accent-amber-500 w-3.5 h-3.5" />
                        <span className="text-xs text-gray-300">{op}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 4 — Movimientos Repetitivos */}
            <div className={`bg-gray-900 border rounded-xl overflow-hidden ${form.ergo_movimientos_repetitivos ? "border-amber-600" : "border-gray-800"}`}>
              <div onClick={() => f("ergo_movimientos_repetitivos", !form.ergo_movimientos_repetitivos)} className="flex items-center justify-between px-5 py-4 cursor-pointer select-none">
                <div>
                  <div className="text-sm font-semibold text-white">Movimientos Repetitivos</div>
                  <div className="text-xs text-gray-500">Mismo movimiento &gt;4 veces/min por &gt;2 hrs.</div>
                </div>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${form.ergo_movimientos_repetitivos ? "bg-amber-500 border-amber-500" : "border-gray-600"}`}>
                  {form.ergo_movimientos_repetitivos && <CheckCircle size={12} className="text-white" />}
                </div>
              </div>
              {form.ergo_movimientos_repetitivos && (
                <div className="px-5 pb-4 pt-3 border-t border-amber-900/40 bg-amber-900/10">
                  <p className="text-xs text-gray-400 mb-2 font-medium">Grupos musculares afectados:</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                    {["Cuello","Hombros","Codos","Muñecas/Manos"].map(op => (
                      <label key={op} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={(form.ergo_repetitivos_grupos||[]).includes(op)} onChange={() => toggleArr("ergo_repetitivos_grupos", op)} className="accent-amber-500 w-3.5 h-3.5" />
                        <span className="text-xs text-gray-300">{op}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 5 — Impacto Repetido */}
            <div className={`bg-gray-900 border rounded-xl overflow-hidden ${form.ergo_impacto_repetido ? "border-amber-600" : "border-gray-800"}`}>
              <div onClick={() => f("ergo_impacto_repetido", !form.ergo_impacto_repetido)} className="flex items-center justify-between px-5 py-4 cursor-pointer select-none">
                <div>
                  <div className="text-sm font-semibold text-white">Impacto Repetido</div>
                  <div className="text-xs text-gray-500">Manos/rodillas como martillo (&gt;10/hr).</div>
                </div>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${form.ergo_impacto_repetido ? "bg-amber-500 border-amber-500" : "border-gray-600"}`}>
                  {form.ergo_impacto_repetido && <CheckCircle size={12} className="text-white" />}
                </div>
              </div>
              {form.ergo_impacto_repetido && (
                <div className="px-5 pb-4 pt-2 border-t border-amber-900/40 bg-amber-900/10">
                  <p className="text-xs text-gray-400 mb-2 font-medium">Zona de impacto:</p>
                  <div className="flex gap-5">
                    {["Manos", "Rodillas"].map(op => (
                      <label key={op} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={(form.ergo_impacto_detalle||[]).includes(op)} onChange={() => toggleArr("ergo_impacto_detalle", op)} className="accent-amber-500 w-3.5 h-3.5" />
                        <span className="text-xs text-gray-300">{op}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 6 — Vibración */}
            <div className={`bg-gray-900 border rounded-xl overflow-hidden ${form.ergo_vibracion_brazo ? "border-amber-600" : "border-gray-800"}`}>
              <div onClick={() => f("ergo_vibracion_brazo", !form.ergo_vibracion_brazo)} className="flex items-center justify-between px-5 py-4 cursor-pointer select-none">
                <div>
                  <div className="text-sm font-semibold text-white">Vibración Brazo-Mano</div>
                  <div className="text-xs text-gray-500">Moderada (&gt;30 m/día) o Alta.</div>
                </div>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${form.ergo_vibracion_brazo ? "bg-amber-500 border-amber-500" : "border-gray-600"}`}>
                  {form.ergo_vibracion_brazo && <CheckCircle size={12} className="text-white" />}
                </div>
              </div>
              {form.ergo_vibracion_brazo && (
                <div className="px-5 pb-4 pt-3 border-t border-amber-900/40 bg-amber-900/10">
                  <label className="text-xs text-gray-500 mb-1 block">Nivel de vibración</label>
                  <select value={form.ergo_vibracion_nivel} onChange={e => f("ergo_vibracion_nivel", e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="">- Nivel -</option>
                    {["Moderada (>30 m/día)","Alta (>100 m/día)"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              )}
            </div>

            {ergoCount > 0 && (
              <div className="text-xs text-amber-300 bg-amber-900/20 border border-amber-900/40 rounded-lg px-3 py-2">
                ⚠ {ergoCount} factor{ergoCount > 1 ? "es" : ""} ergonómico{ergoCount > 1 ? "s" : ""} identificado{ergoCount > 1 ? "s" : ""}
              </div>
            )}
          </div>
        )}

        {/* ── Tab 4: Controles ── */}
        {activeTab === 4 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold text-sm mb-2 flex items-center gap-2"><Shield size={16} className="text-blue-400" />Jerarquía de Controles Actuales</h3>
            <p className="text-xs text-gray-500 mb-5">¿Qué controles existen actualmente en el puesto de trabajo?</p>
            <div className="space-y-5">
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider mb-1.5 block ${CR_CONTROL_STYLES.eliminacion.label}`}>1. Eliminación / Sustitución</label>
                <textarea rows={3} value={form.control_eliminacion} onChange={e => f("control_eliminacion", e.target.value)} placeholder="Ej. Se eliminó el uso de plomo, se automatizó el proceso…" className={`w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none border outline-none ${CR_CONTROL_STYLES.eliminacion.area}`} />
              </div>
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider mb-1.5 block ${CR_CONTROL_STYLES.ingenieria.label}`}>2. Controles de Ingeniería</label>
                <textarea rows={3} value={form.control_ingenieria} onChange={e => f("control_ingenieria", e.target.value)} placeholder="Ej. Guardas, aislamiento acústico, extracción localizada…" className={`w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none border outline-none ${CR_CONTROL_STYLES.ingenieria.area}`} />
              </div>
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider mb-1.5 block ${CR_CONTROL_STYLES.admin.label}`}>3. Controles Administrativos</label>
                <textarea rows={3} value={form.control_administrativo} onChange={e => f("control_administrativo", e.target.value)} placeholder="Ej. Rotación de personal, pausas activas, PETS, señalización…" className={`w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none border outline-none ${CR_CONTROL_STYLES.admin.area}`} />
              </div>
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider mb-1.5 block ${CR_CONTROL_STYLES.epp.label}`}>4. EPP — Equipos de Protección Personal</label>
                <textarea rows={3} value={form.control_epp} onChange={e => f("control_epp", e.target.value)} placeholder="Ej. Tapones auditivos NRR 25, Respirador N95, Guantes anticorte…" className={`w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none border outline-none ${CR_CONTROL_STYLES.epp.area}`} />
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 5: Fotos ── */}
        {activeTab === 5 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
              <Upload size={16} className="text-blue-400" />
              Registro Fotográfico
            </h3>
            <p className="text-xs text-gray-500 mb-4">Adjunte fotos del entorno, postura o herramientas del puesto de trabajo.</p>
            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 flex flex-col items-center gap-3 hover:border-blue-600 transition-colors">
                <Upload size={28} className="text-gray-600" />
                <p className="text-sm text-blue-400 font-medium">Tocar para subir fotos</p>
                <p className="text-xs text-gray-600">(Puede seleccionar varias — JPG, PNG, WebP)</p>
              </div>
              <input type="file" accept="image/*" multiple className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files);
                  if (!files.length) return;
                  const urls = [];
                  for (const file of files) {
                    const ext = file.name.split(".").pop();
                    const path = `caracterizacion/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
                    const { data, error } = await supabase.storage.from("cr-fotos").upload(path, file, { upsert: true });
                    if (!error) {
                      const { data: urlData } = supabase.storage.from("cr-fotos").getPublicUrl(path);
                      urls.push(urlData.publicUrl);
                    }
                  }
                  if (urls.length) {
                    f("fotos_urls", [...(form.fotos_urls || []), ...urls]);
                    showToast(`${urls.length} foto(s) subida(s)`, "success");
                  }
                }}
              />
            </label>
            {(form.fotos_urls || []).length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2">{form.fotos_urls.length} foto(s) adjunta(s)</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {form.fotos_urls.map((url, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-800 aspect-square">
                      <img src={url} alt={`Foto ${i+1}`} className="w-full h-full object-cover" />
                      <button onClick={() => f("fotos_urls", form.fotos_urls.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 bg-red-600 rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <XCircle size={12} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab 6: Cierre ── */}
        {activeTab === 6 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2"><CheckCircle size={16} className="text-blue-400" />Conclusiones y Recomendaciones</h3>
            {/* Resumen de riesgo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <div className={`rounded-xl border p-3 text-center ${fisicoCount > 0 ? "border-orange-800 bg-orange-900/20" : "border-gray-800 bg-gray-800/30"}`}>
                <div className="text-2xl font-bold text-white">{fisicoCount}</div>
                <div className="text-xs text-gray-500 mt-0.5">Riesgos físicos</div>
              </div>
              <div className={`rounded-xl border p-3 text-center ${ergoCount > 0 ? "border-amber-800 bg-amber-900/20" : "border-gray-800 bg-gray-800/30"}`}>
                <div className="text-2xl font-bold text-white">{ergoCount}</div>
                <div className="text-xs text-gray-500 mt-0.5">Riesgos ergonómicos</div>
              </div>
              <div className={`rounded-xl border p-3 text-center ${nivelActual === "Alto" ? "border-red-800 bg-red-900/20" : nivelActual === "Medio" ? "border-amber-800 bg-amber-900/20" : "border-emerald-800 bg-emerald-900/20"}`}>
                <div className={`text-sm font-bold ${nivelActual === "Alto" ? "text-red-400" : nivelActual === "Medio" ? "text-amber-400" : "text-emerald-400"}`}>{nivelActual.toUpperCase()}</div>
                <div className="text-xs text-gray-500 mt-0.5">Nivel de riesgo</div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Conclusiones de la Evaluación</label>
                <textarea rows={4} value={form.conclusiones} onChange={e => f("conclusiones", e.target.value)} placeholder="Resumen de los hallazgos más críticos encontrados en el puesto…" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 resize-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Recomendaciones Propuestas</label>
                <textarea rows={4} value={form.recomendaciones} onChange={e => f("recomendaciones", e.target.value)} placeholder="¿Qué acciones correctivas o preventivas inmediatas se sugieren?" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 resize-none" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => save("Borrador")} disabled={saving} className="px-4 py-2 rounded-lg text-sm border border-gray-700 text-gray-400 hover:text-white transition-colors">Guardar borrador</button>
              {editing && <button onClick={() => { const r = records.find(x => x.id === editing); if (r) generarPDFCaracterizacion({...r, ...form}); }} className="px-4 py-2 rounded-lg text-sm bg-gray-700 hover:bg-gray-600 text-white transition-colors flex items-center gap-2"><FileDown size={14} /> Ver PDF</button>}
              <button onClick={() => save("Completado")} disabled={saving} className="px-4 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors">
                {saving ? "Guardando…" : "✓ Completar evaluación"}
              </button>
            </div>
          </div>
        )}

        {/* Prev / Next */}
        <div className="flex justify-between mt-6">
          <button onClick={() => setActiveTab(t => Math.max(0, t - 1))} disabled={activeTab === 0} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
            <ChevronLeft size={16} /> Anterior
          </button>
          {activeTab < CR_TABS.length - 1 && (
            <button onClick={() => setActiveTab(t => t + 1)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors">
              Siguiente <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

  const crFiltered = records.filter(r => {
    const nombre = (r.puesto_trabajo || "").toLowerCase();
    const matchSearch = !search || nombre.includes(search.toLowerCase());
    const matchEstado = !fEstado || r.estado === fEstado;
    const matchNivel  = !fNivel  || crRiesgoLabel(r) === fNivel;
    return matchSearch && matchEstado && matchNivel;
  });

  // ── LIST VIEW ──
  const completados = records.filter(r => r.estado === "Completado").length;
  const borradores  = records.filter(r => r.estado === "Borrador").length;
  const altoRiesgo  = records.filter(r => crRiesgoLabel(r) === "Alto").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white font-semibold text-lg">Caracterización de Riesgo</h2>
          <p className="text-xs text-gray-500">Evaluación ergonómica y de factores físicos por puesto de trabajo (RM-375)</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
          <Plus size={16} /> Nueva Evaluación
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total evaluaciones"  value={records.length} sub="Puestos caracterizados"    accentColor="blue"    />
        <KpiCard label="Completadas"         value={completados}    sub="Evaluaciones finalizadas"   accentColor="emerald" />
        <KpiCard label="Borradores"          value={borradores}     sub="Pendientes de completar"    accentColor="amber"   />
        <KpiCard label="Riesgo alto"         value={altoRiesgo}     sub="Requieren acción inmediata" accentColor="red"     />
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-48 relative">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por puesto de trabajo…" className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-600 pl-9" />
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
        </div>
        <select value={fEstado} onChange={e => setFEstado(e.target.value)} className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white min-w-36">
          <option value="">Todos los estados</option>
          <option>Borrador</option>
          <option>Completado</option>
        </select>
        <select value={fNivel} onChange={e => setFNivel(e.target.value)} className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white min-w-36">
          <option value="">Todos los riesgos</option>
          <option>Bajo</option>
          <option>Medio</option>
          <option>Alto</option>
        </select>
        <ExportBtn
          data={crFiltered.map(r => ({
            "Puesto de Trabajo": r.puesto_trabajo,
            Macroproceso: r.macroproceso || "",
            Subproceso: r.subproceso || "",
            Fecha: r.fecha,
            Evaluador: r.evaluador || "",
            "N° Trabajadores": (r.num_varones||0) + (r.num_mujeres||0),
            "Riesgo Físico": [r.expuesto_ruido && "Ruido", r.expuesto_polvo && "Polvo", r.expuesto_ambiente_termico && "Térmico"].filter(Boolean).join(", ") || "Ninguno",
            "Riesgo Ergonómico": [r.ergo_posturas_incomodas && "Posturas", r.ergo_levantamiento_cargas && "Cargas", r.ergo_esfuerzo_manos && "Manos", r.ergo_movimientos_repetitivos && "Repetitivos", r.ergo_impacto_repetido && "Impacto", r.ergo_vibracion_brazo && "Vibración"].filter(Boolean).join(", ") || "Ninguno",
            "Nivel de Riesgo": crRiesgoLabel(r),
            Estado: r.estado,
            Conclusiones: r.conclusiones || "",
            Recomendaciones: r.recomendaciones || "",
          }))}
          filename="caracterizacion_riesgo"
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-600 text-sm">Cargando evaluaciones…</div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-900/20 border border-blue-800/40 flex items-center justify-center mb-4">
            <FileText size={28} className="text-blue-500" />
          </div>
          <p className="text-gray-400 font-medium mb-1">Sin evaluaciones registradas</p>
          <p className="text-gray-600 text-sm mb-4">Crea la primera caracterización de riesgo para un puesto de trabajo.</p>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors">
            <Plus size={15} /> Nueva Evaluación
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {crFiltered.map(r => {
            const nivel = crRiesgoLabel(r);
            const eC = [r.ergo_posturas_incomodas, r.ergo_levantamiento_cargas, r.ergo_esfuerzo_manos, r.ergo_movimientos_repetitivos, r.ergo_impacto_repetido, r.ergo_vibracion_brazo].filter(Boolean).length;
            const fC = [r.expuesto_ruido, r.expuesto_polvo, r.expuesto_ambiente_termico].filter(Boolean).length;
            return (
              <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-white font-medium text-sm">{r.puesto_trabajo}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.estado === "Completado" ? "bg-emerald-900/40 text-emerald-400 border border-emerald-800" : "bg-amber-900/40 text-amber-400 border border-amber-800"}`}>{r.estado}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CR_RIESGO_BADGE[nivel]}`}>Riesgo {nivel}</span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2 truncate">
                      {r.macroproceso && <span>{r.macroproceso}{r.subproceso ? ` › ${r.subproceso}` : ""} · </span>}
                      {fmtFecha(r.fecha)} {r.evaluador && `· ${r.evaluador}`}
                    </div>
                    <div className="flex gap-4 text-xs text-gray-600">
                      <span>👥 {(r.num_varones || 0) + (r.num_mujeres || 0)} trabajadores</span>
                      {fC > 0 && <span className="text-orange-400">⚠ {fC} físico{fC > 1 ? "s" : ""}</span>}
                      {eC > 0 && <span className="text-amber-400">⚠ {eC} ergonómico{eC > 1 ? "s" : ""}</span>}
                      {fC === 0 && eC === 0 && <span className="text-emerald-500">✓ Sin factores de riesgo</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => generarPDFCaracterizacion(r)} title="Descargar PDF" className="p-2 rounded-lg hover:bg-blue-900/20 text-gray-500 hover:text-blue-400 transition-colors"><FileDown size={14} /></button>
                    <button onClick={() => openEdit(r)} className="p-2 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"><Pencil size={14} /></button>
                    {puedeEliminar() && (
                      <button onClick={() => handleDelete(r.id)} className="p-2 rounded-lg hover:bg-red-900/20 text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
