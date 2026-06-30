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
  CheckCircle, Home, HeartPulse, Microscope, Search, Shield,
  ClipboardList, ShieldAlert, Activity, BarChart2, BookOpen,
  FileText, Users, LayoutDashboard, Stethoscope, Settings,
  Building2, Phone
} from 'lucide-react';
import ExamenModulo from './ExamenModulo.jsx';

export default function Capacitaciones({ workers, trainings, setTrainings, empresaId, empresa, role }) {
  const esComindustria = empresa?.nombre?.toLowerCase().includes('comindustria') || false;
  // Empresas que usan el portal de Exámenes/Capacitaciones: Comindustria + Expertos en Café + Franquicias Unidas + Multisel + DEMO
  const usaExamenes = esComindustria || (() => { const n = empresa?.nombre?.toLowerCase() || ""; return n.includes('expertos en cafe') || n.includes('expertos en café') || n.includes('franquicias unidas') || n.includes('multisel') || n.includes('demo'); })();
  const [vistaCAP, setVistaCAP] = useState('capacitaciones'); // capacitaciones | examenes
  const [detail, setDetail] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [isDeleting, setIsDeleting] = useState(null);
  const [attSearch, setAttSearch] = useState("");
  const [attAlpha, setAttAlpha]   = useState(false);
  const [attGrupo, setAttGrupo]   = useState("");
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
  const exportAttendance = (t, lista) => {
    const data = (lista || workers.filter(w => w.estado === "Activo")).map(w => ({
      Nombre: w.nombre, DNI: w.dni, Cargo: w.cargo,
      Area: w.area || "", Asistencia: attendance[w.id] ? "Presente" : "Ausente"
    }));
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Asistencia"); XLSX.writeFile(wb, `asistencia_${t.nombre.replace(/\s+/g, "_")}.xlsx`);
    showToast("Excel descargado", "success");
  };
  if (detail) {
    const t = trainings.find(x => x.id === detail); if (!t) { setDetail(null); return null; }
    const active = workers.filter(w => w.estado === "Activo");
    const presentCount = Object.values(attendance).filter(Boolean).length;

    // Opciones de grupo: usa "area" si los workers tienen área, si no usa "cargo"
    const tieneAreas = active.some(w => w.area);
    const grupoKey = tieneAreas ? "area" : "cargo";
    const grupoLabel = tieneAreas ? "Área" : "Cargo";
    const grupoOpciones = [...new Set(active.map(w => w[grupoKey]).filter(Boolean))].sort();

    const q = attSearch.toLowerCase();
    let displayed = active.filter(w => {
      if (attGrupo && (w[grupoKey] || "") !== attGrupo) return false;
      if (q && !w.nombre?.toLowerCase().includes(q) && !w.dni?.includes(q) && !w.cargo?.toLowerCase().includes(q)) return false;
      return true;
    });
    if (attAlpha) displayed = [...displayed].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));

    return (
      <div>
        {/* ── Header ── */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <Btn size="sm" onClick={() => { setDetail(null); setAttSearch(""); setAttAlpha(false); setAttGrupo(""); }}>
            <ChevronLeft size={13} /> Volver
          </Btn>
          <div>
            <div className="text-sm font-semibold text-white">{t.nombre}</div>
            <div className="text-xs text-gray-600">
              Fecha: {fmtFecha(t.fecha)} · {presentCount}/{active.length} presentes
              {attGrupo && <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-900/40 border border-blue-800 text-blue-300">{attGrupo} ({displayed.length})</span>}
            </div>
          </div>
          <div className="ml-auto flex gap-2 flex-wrap">
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-all cursor-pointer">
                <Upload size={13} /> Importar CSV
              </span>
              <input type="file" accept=".csv" className="hidden" onChange={e => importAttendanceCSV(e, detail)} />
            </label>
            <Btn size="sm" onClick={() => exportAttendance(t, displayed)}><Download size={13} /> Exportar{attGrupo ? ` (${attGrupo})` : ""}</Btn>
          </div>
        </div>

        {/* ── Filtros de asistencia ── */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {/* Grupo / Área */}
          {grupoOpciones.length > 0 && (
            <select
              value={attGrupo}
              onChange={e => setAttGrupo(e.target.value)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors focus:outline-none ${
                attGrupo
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-gray-800 border-gray-700 text-gray-400"
              }`}
            >
              <option value="">Todos ({active.length})</option>
              {grupoOpciones.map(g => (
                <option key={g} value={g}>
                  {grupoLabel}: {g} ({active.filter(w => (w[grupoKey] || "") === g).length})
                </option>
              ))}
            </select>
          )}

          {/* Buscador */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              value={attSearch}
              onChange={e => setAttSearch(e.target.value)}
              placeholder="Buscar nombre, DNI o cargo..."
              className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* A→Z */}
          <button
            onClick={() => setAttAlpha(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              attAlpha
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
            }`}
          >
            A→Z
          </button>

          {(attSearch || attAlpha || attGrupo) && (
            <span className="text-xs text-gray-500">{displayed.length} de {active.length}</span>
          )}
        </div>

        {/* ── Tabla ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" className="accent-blue-500"
                    onChange={async e => { for (const w of displayed) await toggleAttendance(detail, w.id, e.target.checked); }} />
                </th>
                {["Nombre", "DNI", "Cargo", "Asistencia"].map(h => (
                  <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map(w => {
                const present = !!attendance[w.id];
                return (
                  <tr key={w.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="accent-blue-500" checked={present}
                        onChange={e => toggleAttendance(detail, w.id, e.target.checked)} />
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{w.nombre}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{w.dni}</td>
                    <td className="px-4 py-3 text-gray-400">{w.cargo}</td>
                    <td className="px-4 py-3">
                      <Badge color={present ? "green" : "gray"}>{present ? "Presente" : "Ausente"}</Badge>
                    </td>
                  </tr>
                );
              })}
              {displayed.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-gray-600">Sin resultados para "{attSearch}"</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  // Si es Comindustria y está en pestaña Exámenes, delegar al módulo
  if (usaExamenes && vistaCAP === 'examenes') {
    return (
      <div>
        <div className="flex gap-2 mb-5 bg-gray-900/50 border border-gray-800 rounded-xl p-1.5 w-fit">
          <button onClick={() => setVistaCAP('capacitaciones')}
            className="px-4 py-1.5 text-xs font-medium rounded-lg transition-colors text-gray-500 hover:text-gray-200">
            📚 Capacitaciones
          </button>
          <button onClick={() => setVistaCAP('examenes')}
            className="px-4 py-1.5 text-xs font-medium rounded-lg transition-colors bg-blue-600 text-white">
            📝 Exámenes
          </button>
        </div>
        <ExamenModulo empresaId={empresaId} role={role} empresaNombre={empresa?.nombre || ''} />
      </div>
    );
  }

  return (
    <div>
      {/* Pestañas — empresas con portal de exámenes */}
      {usaExamenes && (
        <div className="flex gap-2 mb-5 bg-gray-900/50 border border-gray-800 rounded-xl p-1.5 w-fit">
          <button onClick={() => setVistaCAP('capacitaciones')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${vistaCAP === 'capacitaciones' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-200'}`}>
            📚 Capacitaciones
          </button>
          <button onClick={() => setVistaCAP('examenes')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${vistaCAP === 'examenes' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-200'}`}>
            📝 Exámenes
          </button>
        </div>
      )}
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
            <div className="flex-1 min-w-0"><div className="font-medium text-white text-sm">{t.nombre}</div><div className="text-xs text-gray-600 mt-0.5">{fmtFecha(t.fecha)}</div></div>
            <div className="flex items-center gap-3 w-48"><div className="flex-1"><ProgressBar value={pct} color={pct >= 80 ? "emerald" : pct >= 40 ? "amber" : "red"} /></div><span className="text-xs text-gray-500 whitespace-nowrap">{t.asistencia_count || 0}/{t.programados} ({pct}%)</span></div>
            <Btn size="sm" onClick={() => setDetail(t.id)}>Ver detalle <ChevronRight size={12} /></Btn>
            {puedeEliminar() && (
              <Btn size="sm" variant="danger" disabled={isDeleting === t.id} onClick={() => deleteTraining(t.id)}><Trash2 size={12} /></Btn>
            )}
          </div>
        ); })}
        {trainings.length === 0 && <div className="text-center py-12 text-gray-600 text-sm">No hay capacitaciones registradas</div>}
      </div>
    </div>
  );
}
