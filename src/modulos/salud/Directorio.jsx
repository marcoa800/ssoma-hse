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
import { ImportGuideModal } from './ImportGuideModal.jsx';
import {
  Plus, Upload, Download, ChevronRight, ChevronLeft, Lock,
  Trash2, Filter, HelpCircle, Pencil, FileDown, AlertTriangle,
  CheckCircle, Home, HeartPulse, Microscope, Search, Shield,
  ClipboardList, ShieldAlert, Activity, BarChart2, BookOpen,
  FileText, Users, LayoutDashboard, Stethoscope, Settings,
  Building2, Phone
} from 'lucide-react';

export default function Directorio({ workers, setWorkers, role, empresaId, empresa }) {
  const esComindustria = empresa?.nombre?.toLowerCase().includes('comindustria') || false;
  const [vistaDir, setVistaDir] = useState("activos"); // "activos" | "cesados"
  const [filter, setFilter] = useState({ text: "", estado: "", aptitud: [], cargo: "", epp: "", emo: "", lectura: "" });
  const APTITUDES = ["Apto", "Apto con restricción", "Observado", "No apto", "No evaluado"];
  const MOTIVOS_CESE = ["Renuncia voluntaria","Término de contrato","Despido","Fallecimiento","Jubilación","Mutuo acuerdo","Otro"];
  const toggleAptitud = (a) => setFilter(f => ({
    ...f, aptitud: f.aptitud.includes(a) ? f.aptitud.filter(x => x !== a) : [...f.aptitud, a]
  }));
  const [sortAZ, setSortAZ] = useState(false);
  const [modal, setModal] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [form, setForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const canSeeMedical = ["ADMIN", "MEDICO", "SUPERADMIN"].includes(role);
  const canEditEmo = role !== "SEGURIDAD";
  const cargos = [...new Set(workers.map(w => w.cargo).filter(Boolean))].sort();

  // Separar activos y cesados
  const workersActivos = workers.filter(w => w.estado !== "Cesado");
  const workersCesados = workers.filter(w => w.estado === "Cesado")
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const hoy0 = new Date(new Date().toISOString().split("T")[0] + "T00:00:00");
  const emoDias = (w) => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); return v ? Math.ceil((new Date(v + "T00:00:00") - hoy0) / 86400000) : null; };
  const filtered = workersActivos.filter(w => {
    const t = filter.text.toLowerCase();
    const d = emoDias(w);
    const emoOk = !filter.emo
      || (filter.emo === "porvencer" && d !== null && d >= 0 && d <= 30)
      || (filter.emo === "vencido" && d !== null && d < 0)
      || (filter.emo === "alerta" && d !== null && d <= 30);
    return (!t || w.nombre.toLowerCase().includes(t) || (w.dni || "").includes(t))
      && (!filter.estado || w.estado === filter.estado)
      && (filter.aptitud.length === 0 || filter.aptitud.includes(w.aptitud))
      && (!filter.cargo || w.cargo === filter.cargo)
      && (!filter.epp || (filter.epp === "si" ? w.epp_recibido : !w.epp_recibido))
      && (!filter.lectura || (filter.lectura === "si" ? !!w.lectura_emo : !w.lectura_emo))
      && emoOk;
  }).sort((a, b) => sortAZ ? a.nombre.localeCompare(b.nombre, "es") : 0);

  const openModal = (worker = null) => {
    setForm(worker || { nombre: "", dni: "", cargo: "", celular: "", sede: "Lima", estado: "Activo", fecha_nacimiento: "", ultima_emo: "", duracion_emo: "Anual", aptitud: "No evaluado", restriccion_medica: "Ninguna", lectura_emo: "", epp_recibido: false, epp_detalle: "", epp_fecha: "", fecha_cese: "", motivo_cese: "" });
    setModal(worker ? "edit" : "new");
  };

  const saveWorker = async () => {
    if (!form.nombre || !form.dni) { showToast("Nombre y DNI son requeridos", "error"); return; }
    setIsSaving(true);
    const vigencia = calcularVigencia(form.ultima_emo, form.duracion_emo);
    const edad = calcularEdad(form.fecha_nacimiento);
    const payload = { nombre: form.nombre, dni: form.dni, cargo: form.cargo || "", celular: form.celular || null, sede: "Lima", estado: form.estado || "Activo", fecha_nacimiento: form.fecha_nacimiento || null, edad, ultima_emo: form.ultima_emo || null, duracion_emo: form.duracion_emo || "Anual", vencimiento_emo: vigencia, lectura_emo: form.lectura_emo || null, aptitud: form.aptitud || "No evaluado", restriccion_medica: form.restriccion_medica || "Ninguna", epp_recibido: form.epp_recibido || false, epp_detalle: form.epp_detalle || null, epp_fecha: form.epp_fecha || null, fecha_cese: form.estado === "Cesado" ? (form.fecha_cese || null) : null, motivo_cese: form.estado === "Cesado" ? (form.motivo_cese || null) : null, empresa_id: empresaId };
    if (modal === "edit") {
      const { error } = await supabase.from("trabajadores").update(payload).eq("id", form.id);
      if (error) { showToast("Error: " + error.message, "error"); setIsSaving(false); return; }
      setWorkers(prev => prev.map(w => w.id === form.id ? { ...form, ...payload } : w));
      showToast("Trabajador actualizado", "success");
    } else {
      const { data, error } = await supabase.from("trabajadores").insert([payload]).select().single();
      if (error) { showToast("Error: " + error.message, "error"); setIsSaving(false); return; }
      setWorkers(prev => [...prev, data]);
      showToast("Trabajador registrado", "success");
    }
    setIsSaving(false); setModal(null);
  };

  const deleteWorker = async (id) => {
    if (!confirm("¿Eliminar este trabajador?")) return;
    setIsDeleting(id);
    const { error } = await supabase.from("trabajadores").delete().eq("id", id);
    if (error) { showToast("Error: " + error.message, "error"); setIsDeleting(null); return; }
    setWorkers(prev => prev.filter(w => w.id !== id));
    showToast("Trabajador eliminado", "success"); setIsDeleting(null);
  };

  const importCSV = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    if (isExcel) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const wb = XLSX.read(evt.target.result, { type: "binary", cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        await processImportRows(rows);
      };
      reader.readAsBinaryString(file);
    } else {
      Papa.parse(file, { header: true, complete: async (results) => { await processImportRows(results.data); } });
    }
    e.target.value = "";
  };

  const processImportRows = async (rows) => {
    const valid = rows.filter(r => r["APELLIDO Y NOMBRE"] && r["DOC. DE IDENTIDAD"]);
    if (valid.length === 0) { showToast("Archivo inválido. Verifica los encabezados.", "error"); return; }
    const inserts = valid.map(r => {
      const ultimaEmo = excelDateToISO(r["ULTIMA EMO"]);
      const duracion = r["DURACION DE EMO"] || "Anual";
      return { nombre: r["APELLIDO Y NOMBRE"], dni: String(r["DOC. DE IDENTIDAD"]).replace(/\D/g, "").slice(0, 8), cargo: r["PUESTO"] || "", celular: String(r["CELULAR"] || "").replace(/\D/g, "").slice(0, 12) || null, sede: "Lima", estado: r["ESTADO"] || "Activo", fecha_nacimiento: excelDateToISO(r["FECHA DE NACIMIENTO"]), edad: calcularEdad(excelDateToISO(r["FECHA DE NACIMIENTO"])), ultima_emo: ultimaEmo, duracion_emo: duracion, vencimiento_emo: calcularVigencia(ultimaEmo, duracion), lectura_emo: excelDateToISO(r["LECTURA 2026"]), aptitud: r["APTITUD"] || "No evaluado", restriccion_medica: r["RESTRICCION"] || "Ninguna", epp_recibido: String(r["EPP RECIBIDO"] || "").toUpperCase() === "SI", epp_detalle: r["EPP DETALLE"] || null, epp_fecha: excelDateToISO(r["EPP FECHA"]), empresa_id: empresaId };
    });
    const { data, error } = await supabase.from("trabajadores").insert(inserts).select();
    if (error) { showToast("Error al importar: " + error.message, "error"); return; }
    setWorkers(prev => [...prev, ...data]);
    showToast(`${data.length} trabajadores importados`, "success");
  };

  const exportExcel = () => {
    const headers = ["APELLIDO Y NOMBRE", "FECHA DE NACIMIENTO", "EDAD", "DOC. DE IDENTIDAD", "PUESTO", "CELULAR", "ULTIMA EMO", "DURACION DE EMO", "VIGENTE HASTA", "ESTADO", "APTITUD", ...(canSeeMedical ? ["RESTRICCION"] : []), "LECTURA 2026", "EPP RECIBIDO", "EPP DETALLE", "EPP FECHA"];
    const data = filtered.map(w => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); return [w.nombre, w.fecha_nacimiento || "", calcularEdad(w.fecha_nacimiento) || "", w.dni, w.cargo || "", w.celular || "", w.ultima_emo || "", w.duracion_emo || "", v || "", w.estado, w.aptitud, ...(canSeeMedical ? [w.restriccion_medica || ""] : []), w.lectura_emo || "", w.epp_recibido ? "SI" : "NO", w.epp_detalle || "", w.epp_fecha || ""]; });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Directorio");
    XLSX.writeFile(wb, "sabana_personal.xlsx");
    showToast("Excel descargado", "success");
  };

  const aptitudColor = { "Apto": "green", "Apto con restricción": "amber", "Observado": "blue", "No apto": "red", "No evaluado": "gray" };

  return (
    <div>
      {showGuide && <ImportGuideModal onClose={() => setShowGuide(false)} />}

      {/* Pestañas Activos / Cesados — solo Comindustria */}
      {esComindustria && (
        <div className="flex gap-2 mb-4 bg-gray-900/50 border border-gray-800 rounded-xl p-1.5 w-fit">
          <button onClick={() => setVistaDir("activos")}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${vistaDir === "activos" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-200"}`}>
            Activos ({workersActivos.length})
          </button>
          <button onClick={() => setVistaDir("cesados")}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${vistaDir === "cesados" ? "bg-red-700 text-white" : "text-gray-500 hover:text-gray-200"}`}>
            Cesados ({workersCesados.length})
          </button>
        </div>
      )}

      {/* ── Vista Cesados (solo Comindustria) ── */}
      {esComindustria && vistaDir === "cesados" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold text-white">Trabajadores Cesados</div>
              <div className="text-xs text-gray-600">{workersCesados.length} registro(s)</div>
            </div>
            <Btn size="sm" variant="primary" onClick={() => openModal()}><Plus size={13} /> Registrar cesado</Btn>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800">
                {["Apellido y Nombre","DNI","Cargo","Fecha de cese","Motivo","Aptitud",""].map(h => (
                  <th key={h} className="text-left text-xs text-gray-600 font-medium px-3 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {workersCesados.map(w => (
                  <tr key={w.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-3 py-3 font-medium text-white">{w.nombre}</td>
                    <td className="px-3 py-3 font-mono text-xs text-gray-500">{w.dni}</td>
                    <td className="px-3 py-3 text-gray-400">{w.cargo || "—"}</td>
                    <td className="px-3 py-3 font-mono text-xs text-gray-400">{fmtFecha(w.fecha_cese)}</td>
                    <td className="px-3 py-3 text-xs text-gray-400">{w.motivo_cese || "—"}</td>
                    <td className="px-3 py-3"><Badge color={aptitudColor[w.aptitud] || "gray"}>{w.aptitud || "—"}</Badge></td>
                    <td className="px-3 py-3"><div className="flex gap-1">
                      <button onClick={() => openModal(w)} className="text-gray-500 hover:text-blue-400"><Pencil size={13} /></button>
                      <button onClick={() => deleteWorker(w.id)} className="text-red-500/40 hover:text-red-400"><Trash2 size={13} /></button>
                    </div></td>
                  </tr>
                ))}
                {!workersCesados.length && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-600 text-sm">Sin trabajadores cesados registrados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Vista Activos ── */}
      {(!esComindustria || vistaDir === "activos") && (
      <div>
      <div className="flex items-center justify-between mb-4">
        <div><div className="text-sm font-semibold text-white">Sábana de Personal</div><div className="text-xs text-gray-600">{filtered.length} de {workersActivos.length} trabajadores</div></div>
        <div className="flex gap-2 flex-wrap">
          <Btn size="sm" onClick={() => setShowGuide(true)}><HelpCircle size={13} /> Guía</Btn>
          <label className="cursor-pointer"><span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-all cursor-pointer"><Upload size={13} /> Importar Excel/CSV</span><input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={importCSV} /></label>
          <Btn size="sm" onClick={exportExcel}><Download size={13} /> Exportar</Btn>
          <Btn size="sm" variant={sortAZ ? "primary" : "default"} onClick={() => setSortAZ(v => !v)}>
            {sortAZ ? "A→Z ✓" : "A→Z"}
          </Btn>
          <Btn size="sm" variant="primary" onClick={() => openModal()}><Plus size={13} /> Registrar</Btn>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap mb-4">
        <Input placeholder="Buscar nombre o DNI..." value={filter.text} onChange={e => setFilter(f => ({ ...f, text: e.target.value }))} style={{ flex: 1, minWidth: 160 }} />
        <Select value={filter.cargo} onChange={e => setFilter(f => ({ ...f, cargo: e.target.value }))} style={{ width: 180 }}><option value="">Todos los puestos</option>{cargos.map(c => <option key={c}>{c}</option>)}</Select>
        <Select value={filter.estado} onChange={e => setFilter(f => ({ ...f, estado: e.target.value }))} style={{ width: 150 }}><option value="">Todos los estados</option>{["Activo", "Vacaciones", "Inactivo"].map(s => <option key={s}>{s}</option>)}</Select>
        <div className="flex flex-wrap gap-1 items-center">
          {APTITUDES.map(a => {
            const on = filter.aptitud.includes(a);
            const col = { "Apto": "text-emerald-300 border-emerald-700 bg-emerald-900/40", "Apto con restricción": "text-amber-300 border-amber-700 bg-amber-900/30", "Observado": "text-blue-300 border-blue-700 bg-blue-900/30", "No apto": "text-red-300 border-red-700 bg-red-900/40", "No evaluado": "text-gray-400 border-gray-600 bg-gray-800" }[a];
            return (
              <button key={a} onClick={() => toggleAptitud(a)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all ${on ? col : "text-gray-600 border-gray-800 bg-gray-900 hover:border-gray-600 hover:text-gray-400"}`}>
                {a}
              </button>
            );
          })}
          {filter.aptitud.length > 0 && <button onClick={() => setFilter(f => ({ ...f, aptitud: [] }))} className="text-[11px] text-blue-400 hover:text-blue-300 ml-1">✕</button>}
        </div>
        <Select value={filter.epp} onChange={e => setFilter(f => ({ ...f, epp: e.target.value }))} style={{ width: 140 }}><option value="">EPP: Todos</option><option value="si">Con EPP</option><option value="no">Sin EPP</option></Select>
        <Select value={filter.lectura} onChange={e => setFilter(f => ({ ...f, lectura: e.target.value }))} style={{ width: 170 }}><option value="">Lectura EMO: Todos</option><option value="si">Con lectura</option><option value="no">Sin lectura</option></Select>
        <Select value={filter.emo} onChange={e => setFilter(f => ({ ...f, emo: e.target.value }))} style={{ width: 190 }}><option value="">EMO: Todos</option><option value="alerta">⚠ En alerta (≤30d + vencidos)</option><option value="porvencer">Por vencer (≤30 días)</option><option value="vencido">Vencidos</option></Select>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-scroll overflow-y-auto max-h-[calc(100vh-200px)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {["Apellido y Nombre", "F. Nac / Edad", "DNI", "Puesto", "Celular", "Última EMO", "Duración", "Vigente Hasta", "Estado", "Aptitud", "EPP", "Lectura EMO", ...(canSeeMedical ? ["Restricción"] : []), ""].map(h => <th key={h} className="text-left text-xs text-gray-600 font-medium px-3 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(w => {
                const vigencia = calcularVigencia(w.ultima_emo, w.duracion_emo);
                const isVenc = vigencia && new Date(vigencia) < new Date();
                const in30 = new Date(); in30.setDate(in30.getDate() + 30);
                const soonVenc = !isVenc && vigencia && new Date(vigencia) <= in30;
                const edad = calcularEdad(w.fecha_nacimiento);
                return (
                  <tr key={w.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-3 py-3 font-medium text-white whitespace-nowrap">{w.nombre}</td>
                    <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">{fmtFecha(w.fecha_nacimiento)}{edad ? <div className="text-gray-600">{edad} años</div> : null}</td>
                    <td className="px-3 py-3 font-mono text-xs text-gray-500">{w.dni}</td>
                    <td className="px-3 py-3 text-gray-400 whitespace-nowrap">{w.cargo || "—"}</td>
                    <td className="px-3 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">{w.celular || "—"}</td>
                    <td className="px-3 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{fmtFecha(w.ultima_emo)}</td>
                    <td className="px-3 py-3"><Badge color={w.duracion_emo === "Bianual" ? "purple" : "blue"}>{w.duracion_emo || "Anual"}</Badge></td>
                    <td className={`px-3 py-3 font-mono text-xs whitespace-nowrap font-medium ${isVenc ? "text-red-400" : soonVenc ? "text-amber-400" : "text-gray-400"}`}>{vigencia || "—"}</td>
                    <td className="px-3 py-3"><Badge color={w.estado === "Activo" ? "green" : "amber"}>{w.estado}</Badge></td>
                    <td className="px-3 py-3"><Badge color={aptitudColor[w.aptitud] || "gray"}>{w.aptitud}</Badge></td>
                    <td className="px-3 py-3">{w.epp_recibido ? <div><Badge color="green">✓ Sí</Badge>{w.epp_detalle && <div className="text-xs text-gray-600 mt-0.5 max-w-32 truncate">{w.epp_detalle}</div>}</div> : <Badge color="gray">No</Badge>}</td>
                    <td className="px-3 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{fmtFecha(w.lectura_emo)}</td>
                    {canSeeMedical && <td className="px-3 py-3 text-xs max-w-32">{w.restriccion_medica && w.restriccion_medica !== "Ninguna" ? <span className="text-amber-400">{w.restriccion_medica}</span> : <span className="text-gray-700">—</span>}</td>}
                    <td className="px-3 py-3"><div className="flex gap-1"><Btn size="sm" onClick={() => openModal(w)}>Editar</Btn><Btn size="sm" variant="danger" disabled={isDeleting === w.id} onClick={() => deleteWorker(w.id)}><Trash2 size={12} /></Btn></div></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={15} className="px-4 py-8 text-center text-gray-600 text-sm">No se encontraron trabajadores</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {!canSeeMedical && <div className="flex items-center gap-2 mt-3 text-xs text-gray-600"><Lock size={12} className="text-red-500" /><span className="px-2 py-0.5 rounded bg-red-900/30 text-red-500 border border-red-900 font-mono text-xs">CONFIDENCIAL</span> Restricciones médicas visibles solo para MEDICO y ADMIN</div>}
      </div>
      )}

      {modal && (
        <Modal title={modal === "edit" ? "Editar Trabajador" : "Registrar Trabajador"} onClose={() => setModal(null)} wide>
          <div className="grid grid-cols-2 gap-x-4">
            <div className="col-span-2"><FormField label="Apellido y Nombre"><Input value={form.nombre || ""} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="García López Juan Carlos" /></FormField></div>
            <FormField label="DNI (solo números)"><Input value={form.dni || ""} maxLength={8} onChange={e => { const val = e.target.value.replace(/\D/g, ""); setForm(f => ({ ...f, dni: val })); }} placeholder="12345678" /></FormField>
            <FormField label="Celular"><Input value={form.celular || ""} maxLength={12} onChange={e => { const val = e.target.value.replace(/\D/g, ""); setForm(f => ({ ...f, celular: val })); }} placeholder="999888777" /></FormField>
            <FormField label="Puesto / Cargo"><Input value={form.cargo || ""} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} /></FormField>
            <FormField label="Fecha de Nacimiento"><Input type="date" value={form.fecha_nacimiento || ""} onChange={e => setForm(f => ({ ...f, fecha_nacimiento: e.target.value }))} /></FormField>
            <FormField label="Estado">
              <Select value={form.estado || "Activo"} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                <option>Activo</option><option>Vacaciones</option><option>Inactivo</option>
                {esComindustria && <option>Cesado</option>}
              </Select>
            </FormField>
            {esComindustria && form.estado === "Cesado" && (<>
              <FormField label="Fecha de cese"><Input type="date" value={form.fecha_cese || ""} onChange={e => setForm(f => ({ ...f, fecha_cese: e.target.value }))} /></FormField>
              <FormField label="Motivo de cese">
                <Select value={form.motivo_cese || ""} onChange={e => setForm(f => ({ ...f, motivo_cese: e.target.value }))}>
                  <option value="">Seleccionar...</option>
                  {MOTIVOS_CESE.map(m => <option key={m}>{m}</option>)}
                </Select>
              </FormField>
            </>)}
            <FormField label="Sede"><Input value="Lima" disabled className="opacity-50" /></FormField>
          </div>
          <div className="border border-gray-800 rounded-xl p-3 mb-3">
            <div className="text-xs font-semibold text-gray-300 mb-3">Examen Médico Ocupacional (EMO)</div>
            {canEditEmo ? (
              <div className="grid grid-cols-2 gap-x-4">
                <FormField label="Última EMO"><Input type="date" value={form.ultima_emo || ""} onChange={e => setForm(f => ({ ...f, ultima_emo: e.target.value }))} /></FormField>
                <FormField label="Duración EMO"><Select value={form.duracion_emo || "Anual"} onChange={e => setForm(f => ({ ...f, duracion_emo: e.target.value }))}><option>Anual</option><option>Bianual</option></Select></FormField>
                <FormField label="Vigente Hasta (automático)"><Input value={calcularVigencia(form.ultima_emo, form.duracion_emo) || "—"} disabled className="opacity-60 bg-gray-700" /></FormField>
                <FormField label="Lectura de Resultados EMO"><Input type="date" value={form.lectura_emo || ""} onChange={e => setForm(f => ({ ...f, lectura_emo: e.target.value }))} /></FormField>
                <FormField label="Aptitud Médica"><Select value={form.aptitud || "No evaluado"} onChange={e => setForm(f => ({ ...f, aptitud: e.target.value }))}><option>Apto</option><option>Apto con restricción</option><option>Observado</option><option>No apto</option><option>No evaluado</option></Select></FormField>
              </div>
            ) : (
              <div className="px-3 py-2.5 rounded-lg bg-amber-900/20 border border-amber-900/40 text-xs text-amber-400 flex items-center gap-2"><Lock size={12} /> Los campos de EMO solo pueden editarlos MEDICO o ADMIN</div>
            )}
          </div>
          <div className="border border-gray-800 rounded-xl p-3 mb-3">
            <div className="text-xs font-semibold text-gray-300 mb-3">Equipos de Protección Personal (EPP)</div>
            <div className="grid grid-cols-2 gap-x-4">
              <FormField label="¿Recibió EPP?"><Select value={form.epp_recibido ? "si" : "no"} onChange={e => setForm(f => ({ ...f, epp_recibido: e.target.value === "si" }))}><option value="no">No</option><option value="si">Sí</option></Select></FormField>
              <FormField label="Fecha de entrega EPP"><Input type="date" value={form.epp_fecha || ""} onChange={e => setForm(f => ({ ...f, epp_fecha: e.target.value }))} /></FormField>
              <div className="col-span-2"><FormField label="Detalle de EPP entregado"><Input value={form.epp_detalle || ""} onChange={e => setForm(f => ({ ...f, epp_detalle: e.target.value }))} placeholder="Ej. Casco, guantes, lentes, chaleco..." /></FormField></div>
            </div>
          </div>
          {canSeeMedical && <FormField label="Detalle Restricción Médica" confidential><Input value={form.restriccion_medica || ""} onChange={e => setForm(f => ({ ...f, restriccion_medica: e.target.value }))} /></FormField>}
          <div className="flex gap-2 justify-end mt-4"><Btn onClick={() => setModal(null)}>Cancelar</Btn><Btn variant="primary" disabled={isSaving} onClick={saveWorker}>{isSaving ? "Guardando..." : "Guardar"}</Btn></div>
        </Modal>
      )}
    </div>
  );
}
