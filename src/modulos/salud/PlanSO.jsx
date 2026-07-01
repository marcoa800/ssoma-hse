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

const PROGRAMAS_SO = [
  { key: "1. Documentación SST",       color: "blue",   icon: "📋" },
  { key: "2. Capacitaciones",           color: "purple", icon: "🎓" },
  { key: "3. Vigilancia de Salud",      color: "emerald",icon: "🩺" },
  { key: "4. Evaluación de Puestos",    color: "orange", icon: "🔬" },
  { key: "5. Estilos de Vida Saludable",color: "green",  icon: "💚" },
  { key: "6. Riesgos Disergonómicos",   color: "red",    icon: "⚠️" },
  { key: "7. Salud Mental",             color: "violet", icon: "🧠" },
];
const MESES_SO = ["MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
const ESTADO_SO_COLOR = { Programado:"gray","En proceso":"amber",Completado:"green",Cancelado:"red" };
const MES_ACTUAL = new Date().toLocaleString("es-PE",{month:"short"}).toUpperCase().replace(".","").slice(0,3);

export default function PlanSOModulo({ empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [programa, setPrograma] = useState(null);
  const [saving, setSaving] = useState(null);
  const [editingNota, setEditingNota] = useState(null);
  const [notaTemp, setNotaTemp] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [importing, setImporting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("plan_so_actividades").select("*").eq("empresa_id", empresaId).order("numero");
    setRecords(data || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const updateEstado = async (id, estado) => {
    setSaving(id);
    await supabase.from("plan_so_actividades").update({ estado, updated_at: new Date().toISOString() }).eq("id", id);
    setRecords(prev => prev.map(r => r.id === id ? { ...r, estado } : r));
    setSaving(null);
  };

  const saveNota = async (id) => {
    await supabase.from("plan_so_actividades").update({ notas: notaTemp, updated_at: new Date().toISOString() }).eq("id", id);
    setRecords(prev => prev.map(r => r.id === id ? { ...r, notas: notaTemp } : r));
    setEditingNota(null);
  };

  // ── Descarga plantilla Excel ──
  const downloadTemplate = () => {
    const rows = records.map(r => ({
      año: r.año,
      programa: r.programa,
      numero: r.numero,
      actividad: r.actividad,
      objetivo: r.objetivo || "",
      responsable: r.responsable || "",
      participantes: r.participantes || "",
      entregable: r.entregable || "",
      meses: (r.meses || []).join(","),
      observaciones: r.observaciones || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    // Ancho de columnas
    ws["!cols"] = [
      {wch:6},{wch:30},{wch:5},{wch:55},{wch:55},{wch:25},{wch:25},{wch:40},{wch:30},{wch:30}
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plan SO");
    // Hoja de referencia
    const ref = [
      { Campo:"año", Descripción:"Año del plan (ej. 2027)", Requerido:"Sí" },
      { Campo:"programa", Descripción:"Exactamente uno de: 1. Documentación SST | 2. Capacitaciones | 3. Vigilancia de Salud | 4. Evaluación de Puestos | 5. Estilos de Vida Saludable | 6. Riesgos Disergonómicos | 7. Salud Mental", Requerido:"Sí" },
      { Campo:"numero", Descripción:"Número correlativo dentro del programa (1, 2, 3...)", Requerido:"Sí" },
      { Campo:"actividad", Descripción:"Nombre de la actividad / descripción", Requerido:"Sí" },
      { Campo:"objetivo", Descripción:"Para qué sirve esta actividad", Requerido:"No" },
      { Campo:"responsable", Descripción:"Quién la ejecuta", Requerido:"No" },
      { Campo:"participantes", Descripción:"A quién va dirigida", Requerido:"No" },
      { Campo:"entregable", Descripción:"Documento o producto que se genera", Requerido:"No" },
      { Campo:"meses", Descripción:"Meses planificados separados por coma. Valores: MAY,JUN,JUL,AGO,SEP,OCT,NOV,DIC", Requerido:"No" },
      { Campo:"observaciones", Descripción:"Notas adicionales", Requerido:"No" },
    ];
    const wsRef = XLSX.utils.json_to_sheet(ref);
    wsRef["!cols"] = [{wch:15},{wch:90},{wch:10}];
    XLSX.utils.book_append_sheet(wb, wsRef, "Referencia de campos");
    XLSX.writeFile(wb, `Plan_SO_${records[0]?.año || "2026"}_plantilla.xlsx`);
    showToast("Plantilla descargada", "success");
  };

  // ── Importar desde Excel ──
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        setImporting(true);
        const wb = XLSX.read(ev.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        if (!rows.length) { showToast("El archivo está vacío", "error"); setImporting(false); return; }

        // Validar columnas mínimas
        const req = ["año","programa","numero","actividad"];
        const cols = Object.keys(rows[0]);
        const missing = req.filter(c => !cols.includes(c));
        if (missing.length) { showToast(`Faltan columnas: ${missing.join(", ")}`, "error"); setImporting(false); return; }

        const año = Number(rows[0].año);
        if (!año || año < 2025) { showToast("El campo 'año' debe ser un número válido (ej. 2027)", "error"); setImporting(false); return; }

        // Verificar si ya existe data para ese año
        const { count } = await supabase.from("plan_so_actividades").select("*", { count:"exact", head:true }).eq("empresa_id", empresaId).eq("año", año);
        if (count > 0) {
          if (!confirm(`Ya existe un plan para ${año} con ${count} actividades. ¿Reemplazarlo completo?`)) { setImporting(false); return; }
          await supabase.from("plan_so_actividades").delete().eq("empresa_id", empresaId).eq("año", año);
        }

        const inserts = rows.map(r => ({
          empresa_id: empresaId,
          año: Number(r.año),
          programa: String(r.programa || "").trim(),
          numero: Number(r.numero) || 0,
          actividad: String(r.actividad || "").trim(),
          objetivo: r.objetivo ? String(r.objetivo).trim() : null,
          responsable: r.responsable ? String(r.responsable).trim() : null,
          participantes: r.participantes ? String(r.participantes).trim() : null,
          entregable: r.entregable ? String(r.entregable).trim() : null,
          meses: r.meses ? String(r.meses).split(",").map(m => m.trim().toUpperCase()).filter(m => MESES_SO.includes(m)) : [],
          observaciones: r.observaciones ? String(r.observaciones).trim() : null,
          estado: "Programado",
        })).filter(r => r.actividad && r.programa);

        const { error } = await supabase.from("plan_so_actividades").insert(inserts);
        if (error) { showToast("Error al importar: " + error.message, "error"); }
        else { showToast(`✅ ${inserts.length} actividades importadas para ${año}`, "success"); load(); }
      } catch (err) {
        showToast("Error al leer el archivo: " + err.message, "error");
      }
      setImporting(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const accentCls = { blue:"border-blue-600 text-blue-400", purple:"border-purple-600 text-purple-400", emerald:"border-emerald-600 text-emerald-400", orange:"border-orange-600 text-orange-400", green:"border-green-600 text-green-400", red:"border-red-600 text-red-400", violet:"border-violet-600 text-violet-400" };
  const barCls = { blue:"bg-blue-600", purple:"bg-purple-600", emerald:"bg-emerald-600", orange:"bg-orange-600", green:"bg-green-600", red:"bg-red-600", violet:"bg-violet-600" };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-600 text-sm">Cargando plan...</div>;

  // ── Vista de detalle de programa ──
  if (programa !== null) {
    const prog = PROGRAMAS_SO[programa];
    const actividades = records.filter(r => r.programa === prog.key).sort((a,b) => a.numero - b.numero);
    const completadas = actividades.filter(r => r.estado === "Completado").length;
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setPrograma(null)} className="text-gray-500 hover:text-gray-200 transition-colors flex items-center gap-1 text-sm"><ChevronLeft size={16} /> Volver</button>
          <div className={`h-5 w-1 rounded-full ${barCls[prog.color]}`} />
          <h3 className="text-white font-semibold text-sm">{prog.icon} {prog.key.replace(/^\d+\. /, "")}</h3>
          <span className="ml-auto text-xs text-gray-500">{completadas} / {actividades.length} completadas</span>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {["N°","Actividad","Meses","Estado","Entregable",""].map(h => (
                  <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {actividades.map(r => {
                const ec = ESTADO_SO_COLOR[r.estado] || "gray";
                return (
                  <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                    <td className="px-4 py-3 text-xs text-gray-600 font-mono">{r.numero}</td>
                    <td className="px-4 py-3 min-w-[220px]">
                      <div className="text-sm text-gray-200 leading-tight mb-0.5">{r.actividad}</div>
                      {r.objetivo && <div className="text-xs text-gray-600 leading-snug">{r.objetivo}</div>}
                      {r.observaciones && <div className="text-xs text-amber-700 mt-0.5 italic">{r.observaciones}</div>}
                      {editingNota === r.id ? (
                        <div className="mt-2 flex gap-1">
                          <input autoFocus value={notaTemp} onChange={e => setNotaTemp(e.target.value)} placeholder="Agregar nota..." className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500" onKeyDown={e => e.key === "Enter" && saveNota(r.id)} />
                          <button onClick={() => saveNota(r.id)} className="text-xs px-2 py-1 bg-blue-600 rounded-lg text-white hover:bg-blue-500">✓</button>
                          <button onClick={() => setEditingNota(null)} className="text-xs px-2 py-1 bg-gray-700 rounded-lg text-gray-400 hover:text-white">✕</button>
                        </div>
                      ) : (
                        <div className="mt-1">
                          {r.notas && <div className="text-xs text-blue-400 italic">📝 {r.notas}</div>}
                          <button onClick={() => { setEditingNota(r.id); setNotaTemp(r.notas || ""); }} className="text-xs text-gray-700 hover:text-gray-400 transition-colors mt-0.5">{r.notas ? "✏️ Editar nota" : "+ Nota"}</button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(r.meses || []).map(m => (
                          <span key={m} className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border ${m === MES_ACTUAL ? `${accentCls[prog.color]} bg-opacity-20` : "border-gray-700 text-gray-600"}`}>{m}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select value={r.estado} onChange={e => updateEstado(r.id, e.target.value)} disabled={saving === r.id}
                        className={`text-xs rounded-lg px-2 py-1 border focus:outline-none cursor-pointer disabled:opacity-50 ${ec === "green" ? "bg-green-900/30 border-green-800 text-green-400" : ec === "amber" ? "bg-amber-900/30 border-amber-800 text-amber-400" : ec === "red" ? "bg-red-900/30 border-red-800 text-red-400" : "bg-gray-800 border-gray-700 text-gray-400"}`}>
                        <option value="Programado">⏳ Programado</option>
                        <option value="En proceso">🔵 En proceso</option>
                        <option value="Completado">✅ Completado</option>
                        <option value="Cancelado">❌ Cancelado</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[180px]">{r.entregable || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{r.responsable || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Vista general: cards de programas ──
  const totalActs = records.length;
  const totalComp = records.filter(r => r.estado === "Completado").length;
  const totalProc = records.filter(r => r.estado === "En proceso").length;
  const pctGlobal = totalActs ? Math.round(totalComp / totalActs * 100) : 0;

  return (
    <div>
      {/* Guía */}
      {showGuide && (
        <Modal title="Guía — Plan SO Anual" onClose={() => setShowGuide(false)} wide>
          <div className="space-y-4 text-sm text-gray-300">
            <div className="bg-blue-900/20 border border-blue-900/40 rounded-xl p-4 text-xs text-blue-400">
              Este módulo te permite hacer seguimiento del Programa Anual de Salud Ocupacional. Cada actividad tiene un estado que puedes actualizar en tiempo real.
            </div>
            <div>
              <p className="text-white font-semibold mb-2">Estados disponibles</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[["⏳ Programado","Actividad prevista, aún no iniciada","gray"],["🔵 En proceso","Actividad en ejecución","blue"],["✅ Completado","Actividad finalizada y entregable listo","green"],["❌ Cancelado","Actividad descartada o postergada","red"]].map(([e,d,c])=>(
                  <div key={e} className="bg-gray-800 rounded-lg p-3">
                    <span className={`text-xs font-bold text-${c}-400`}>{e}</span>
                    <p className="text-xs text-gray-500 mt-1">{d}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-white font-semibold mb-2">Cómo preparar el plan para el próximo año</p>
              <ol className="space-y-2 text-xs text-gray-400 list-decimal list-inside">
                <li>Haz clic en <span className="text-white font-medium">⬇ Descargar plantilla</span> — se genera un Excel con todas las actividades del plan actual.</li>
                <li>Abre el archivo, cambia la columna <span className="font-mono text-blue-400">año</span> al nuevo año (ej. <span className="font-mono">2027</span>) y modifica las actividades que necesites.</li>
                <li>La columna <span className="font-mono text-blue-400">meses</span> acepta los valores separados por coma: <span className="font-mono">MAY,JUN,JUL,AGO,SEP,OCT,NOV,DIC</span></li>
                <li>La columna <span className="font-mono text-blue-400">programa</span> debe coincidir exactamente con uno de los 7 programas (ver hoja "Referencia de campos" del Excel).</li>
                <li>Guarda el archivo y haz clic en <span className="text-white font-medium">⬆ Importar plan</span> para cargarlo.</li>
                <li>Si ya existe un plan para ese año, la app te pedirá confirmación antes de reemplazarlo.</li>
              </ol>
            </div>
            <div className="bg-amber-900/20 border border-amber-900/40 rounded-xl p-3 text-xs text-amber-400">
              <strong>Nota:</strong> El campo <span className="font-mono">estado</span> no se importa — todas las actividades importadas arrancan como "Programado" automáticamente.
            </div>
            <div className="flex justify-end">
              <Btn onClick={() => setShowGuide(false)}>Entendido</Btn>
            </div>
          </div>
        </Modal>
      )}

      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Plan SO Anual 2026 — MULTISEL SAC</h3>
          <p className="text-gray-500 text-xs">Seguimiento del Programa de Salud Ocupacional. Elaborado por Dr. Marco Melgarejo.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <Btn size="sm" variant="ghost" onClick={() => setShowGuide(true)}><HelpCircle size={13} /> Guía</Btn>
          <Btn size="sm" variant="ghost" onClick={downloadTemplate}><Download size={13} /> Descargar plantilla</Btn>
          <label className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors cursor-pointer ${importing ? "opacity-50 pointer-events-none" : ""}`}>
            <Upload size={13} /> {importing ? "Importando..." : "Importar plan"}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
          <button onClick={load} className="text-xs text-gray-500 hover:text-gray-300 border border-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">↻</button>
        </div>
      </div>

      {/* KPIs globales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-400">{totalActs}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total actividades</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-400">{totalComp}</div>
          <div className="text-xs text-gray-500 mt-0.5">Completadas</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-amber-400">{totalProc}</div>
          <div className="text-xs text-gray-500 mt-0.5">En proceso</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{pctGlobal}%</div>
          <div className="text-xs text-gray-500 mt-0.5">Cumplimiento</div>
          <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-green-600 rounded-full transition-all" style={{ width: `${pctGlobal}%` }} />
          </div>
        </div>
      </div>

      {/* Cards por programa */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {PROGRAMAS_SO.map((prog, i) => {
          const acts = records.filter(r => r.programa === prog.key);
          const comp = acts.filter(r => r.estado === "Completado").length;
          const proc = acts.filter(r => r.estado === "En proceso").length;
          const pct = acts.length ? Math.round(comp / acts.length * 100) : 0;
          return (
            <button key={prog.key} onClick={() => setPrograma(i)}
              className={`bg-gray-900 border rounded-xl p-5 text-left hover:bg-gray-800/60 transition-all group border-l-4 ${accentCls[prog.color]?.split(" ")[0]} border-gray-800 hover:border-gray-700`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{prog.icon}</span>
                  <div>
                    <div className="text-white font-semibold text-xs leading-tight">{prog.key.replace(/^\d+\. /, "")}</div>
                    <div className="text-gray-600 text-[10px] mt-0.5">{acts.length} actividades</div>
                  </div>
                </div>
                <ChevronRight size={14} className="text-gray-700 group-hover:text-gray-400 transition-colors mt-0.5 shrink-0" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full ${barCls[prog.color]} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-gray-500 font-mono w-8 text-right">{pct}%</span>
              </div>
              <div className="flex gap-3 text-[10px]">
                <span className="text-green-500">✅ {comp} completadas</span>
                {proc > 0 && <span className="text-amber-500">🔵 {proc} en proceso</span>}
                <span className="text-gray-700">{acts.length - comp - proc} pendientes</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
