import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { excelDateToISO, fmtFecha} from '../../lib/helpers.js';
import { Badge } from '../../components/ui/Badge.jsx';
import { KpiCard } from '../../components/ui/KpiCard.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Btn } from '../../components/ui/Btn.jsx';
import { ExportBtn } from '../../components/ui/ExportBtn.jsx';
import { FilterBar } from '../../components/ui/FilterBar.jsx';
import { ProgressBar } from '../../components/ui/ProgressBar.jsx';
import { Plus, Upload, Pencil, Trash2, DollarSign, TrendingUp, FileText, BarChart3 } from 'lucide-react';

const fmtUSD = (n) => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtWan = (usd, tc = 6.95) => `${(Number(usd || 0) * tc / 10000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 万元`;
const MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const MES_NUM = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
const BAR_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6"];

// ════════════════════════════════════════════════════════════════════
//  Wrapper con pestañas: Detalle de gastos (USD) · Plan vs Real (resumen mensual)
// ════════════════════════════════════════════════════════════════════
export default function InversionSST({ empresaId }) {
  const [vista, setVista] = useState("detalle");
  const Tab = ({ id, icon: Icon, children }) => (
    <button onClick={() => setVista(id)}
      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${vista === id
        ? "bg-emerald-900/40 text-emerald-300 border border-emerald-800"
        : "text-gray-500 hover:text-gray-200 border border-transparent"}`}>
      <Icon size={13} /> {children}
    </button>
  );
  return (
    <div>
      <div className="flex items-center gap-2 mb-5 bg-gray-900/50 border border-gray-800 rounded-xl p-1.5 w-fit">
        <Tab id="detalle" icon={FileText}>Detalle de gastos (USD)</Tab>
        <Tab id="resumen" icon={BarChart3}>Plan vs Real (mensual)</Tab>
      </div>
      {vista === "detalle" ? <DetalleGastos empresaId={empresaId} /> : <ResumenMensual empresaId={empresaId} />}
    </div>
  );
}

function DetalleGastos({ empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [fCat, setFCat] = useState("");
  const initForm = {
    fecha: new Date().toISOString().split("T")[0], proyecto: "", categoria: "",
    descripcion: "", monto_usd: "", proveedor: "", responsable: "", observaciones: "",
  };
  const [form, setForm] = useState(initForm);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("inversion_sst")
      .select("*").eq("empresa_id", empresaId).order("fecha", { ascending: false });
    if (error) showToast("Error al cargar: " + error.message, "error");
    setRecords(data || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const openEdit = (r) => {
    setForm({
      fecha: r.fecha, proyecto: r.proyecto || "", categoria: r.categoria || "",
      descripcion: r.descripcion || "", monto_usd: r.monto_usd != null ? String(r.monto_usd) : "",
      proveedor: r.proveedor || "", responsable: r.responsable || "", observaciones: r.observaciones || "",
    });
    setEditing(r.id); setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(initForm); };

  const handleSave = async () => {
    if (!form.fecha || !form.categoria) { showToast("Fecha y categoría son obligatorios", "error"); return; }
    setSaving(true);
    const payload = {
      empresa_id: empresaId, fecha: form.fecha, proyecto: form.proyecto || null,
      categoria: form.categoria, descripcion: form.descripcion || null,
      monto_usd: parseFloat(form.monto_usd) || 0, proveedor: form.proveedor || null,
      responsable: form.responsable || null, observaciones: form.observaciones || null,
    };
    const { error } = editing
      ? await supabase.from("inversion_sst").update(payload).eq("id", editing)
      : await supabase.from("inversion_sst").insert(payload);
    if (error) showToast("Error: " + error.message, "error");
    else { showToast(editing ? "Actualizado" : "Registro guardado", "success"); closeModal(); load(); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este registro de inversión?")) return;
    await supabase.from("inversion_sst").delete().eq("id", id);
    showToast("Eliminado", "info"); load();
  };

  // ── Importar Excel (encabezados bilingües chino/español, por índice de columna) ──
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = async (ev) => {
      setImporting(true);
      try {
        const wb = XLSX.read(ev.target.result, { type: "array", cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
        // Columnas: 0=Nº, 1=Fecha, 2=Proyecto, 3=Categoría, 4=Descripción, 5=Monto USD, 6=Proveedor, 7=Responsable, 8=Observaciones
        const inserts = [];
        rows.forEach((r) => {
          const n = r[0];
          if (!(typeof n === "number" || /^\d+$/.test(String(n).trim()))) return; // solo filas con Nº
          const fecha = excelDateToISO(r[1]);
          const categoria = String(r[3] || "").trim();
          const monto = parseFloat(r[5]) || 0;
          if (!fecha && !categoria && !monto) return;
          inserts.push({
            empresa_id: empresaId, fecha: fecha || new Date().toISOString().split("T")[0],
            proyecto: String(r[2] || "").trim() || null, categoria: categoria || null,
            descripcion: String(r[4] || "").trim() || null, monto_usd: monto,
            proveedor: String(r[6] || "").trim() || null, responsable: String(r[7] || "").trim() || null,
            observaciones: String(r[8] || "").trim() || null,
          });
        });
        if (!inserts.length) { showToast("No se encontraron filas válidas", "error"); setImporting(false); return; }
        const { error } = await supabase.from("inversion_sst").insert(inserts);
        if (error) { showToast("Error al insertar: " + error.message, "error"); setImporting(false); return; }
        showToast(`✅ ${inserts.length} registros importados`, "success");
        load();
      } catch (err) {
        showToast("Error al leer el archivo: " + err.message, "error");
      }
      setImporting(false);
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Filtros ──
  const catOpts = [...new Set(records.map(r => r.categoria).filter(Boolean))].sort();
  const filtered = records.filter(r =>
    (!fFrom || r.fecha >= fFrom) && (!fTo || r.fecha <= fTo) && (!fCat || r.categoria === fCat));

  // ── KPIs ──
  const now = new Date();
  const totalFiltrado = filtered.reduce((s, r) => s + Number(r.monto_usd || 0), 0);
  const totalGeneral = records.reduce((s, r) => s + Number(r.monto_usd || 0), 0);
  const delAnio = records.filter(r => new Date(r.fecha + "T00:00:00").getFullYear() === now.getFullYear());
  const gastoAnio = delAnio.reduce((s, r) => s + Number(r.monto_usd || 0), 0);

  // ── Gasto por categoría (para el gráfico) ──
  const porCategoria = Object.entries(
    filtered.reduce((acc, r) => { const k = r.categoria || "Sin categoría"; acc[k] = (acc[k] || 0) + Number(r.monto_usd || 0); return acc; }, {})
  ).map(([categoria, monto]) => ({ categoria, monto })).sort((a, b) => b.monto - a.monto).slice(0, 10);

  return (
    <div>
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
            <DollarSign size={15} className="text-emerald-400" /> Inversión en Costos de Seguridad
          </h3>
          <p className="text-gray-500 text-xs max-w-xl">Registro de la inversión SST en la producción: servicios, equipos, EPP, certificaciones y más.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4 flex-wrap">
          <label className="cursor-pointer">
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} disabled={importing} />
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors">
              <Upload size={13} /> {importing ? "Importando..." : "Importar Excel"}
            </span>
          </label>
          <ExportBtn filename="inversion_sst" data={filtered.map(r => ({
            Fecha: r.fecha, Proyecto: r.proyecto || "", Categoría: r.categoria || "", Descripción: r.descripcion || "",
            "Monto (USD)": Number(r.monto_usd || 0), Proveedor: r.proveedor || "", Responsable: r.responsable || "", Observaciones: r.observaciones || "",
          }))} />
          <Btn size="sm" variant="primary" onClick={() => { setEditing(null); setForm(initForm); setShowModal(true); }}><Plus size={13} /> Nuevo Registro</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Inversión total" value={fmtUSD(totalGeneral)} sub={`${records.length} registros`} accentColor="emerald" />
        <KpiCard label={`Inversión ${now.getFullYear()}`} value={fmtUSD(gastoAnio)} sub="este año" accentColor="blue" />
        <KpiCard label="Filtrado" value={fmtUSD(totalFiltrado)} sub={`${filtered.length} registros`} accentColor="violet" />
        <KpiCard label="Categorías" value={catOpts.length} sub="tipos de costo" accentColor="amber" />
      </div>

      {porCategoria.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-5">
          <p className="text-xs text-gray-400 font-medium mb-3 flex items-center gap-1.5"><TrendingUp size={13} className="text-emerald-400" /> Inversión por categoría (top 10)</p>
          <ResponsiveContainer width="100%" height={Math.max(180, porCategoria.length * 30)}>
            <BarChart data={porCategoria} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="categoria" tick={{ fill: "#9ca3af", fontSize: 10 }} width={150} />
              <ChartTooltip formatter={(v) => fmtUSD(v)} contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="monto" radius={[0, 4, 4, 0]}>
                {porCategoria.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <FilterBar dateFrom={fFrom} dateTo={fTo} onDateFrom={setFFrom} onDateTo={setFTo} area={fCat} onArea={setFCat} areaOptions={catOpts} areaLabel="Categoría" />

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800">
            {["Fecha", "Proyecto", "Categoría", "Descripción", "Monto (USD)", "Proveedor", "Responsable", ""].map(h => (
              <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
            {!loading && filtered.map(r => (
              <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">{fmtFecha(r.fecha)}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{r.proyecto || "—"}</td>
                <td className="px-4 py-3"><Badge color="blue">{r.categoria || "—"}</Badge></td>
                <td className="px-4 py-3 text-xs text-gray-300 max-w-[260px]">{r.descripcion || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs font-bold text-emerald-400 whitespace-nowrap">{fmtUSD(r.monto_usd)}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{r.proveedor || "—"}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{r.responsable || "—"}</td>
                <td className="px-4 py-3"><div className="flex gap-1">
                  <button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400"><Pencil size={13} /></button>
                  <button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400"><Trash2 size={13} /></button>
                </div></td>
              </tr>
            ))}
            {!loading && filtered.length > 0 && (
              <tr className="bg-gray-800/40 font-semibold">
                <td colSpan={4} className="px-4 py-2.5 text-xs text-gray-400 text-right uppercase tracking-wide">Total filtrado</td>
                <td className="px-4 py-2.5 font-mono text-xs font-bold text-emerald-300">{fmtUSD(totalFiltrado)}</td>
                <td colSpan={3}></td>
              </tr>
            )}
            {!loading && !filtered.length && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-600 text-sm">
                {records.length ? "Sin resultados para el filtro." : "Sin registros. Usa \"Importar Excel\" o \"Nuevo Registro\"."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? "Editar registro de inversión" : "Nuevo registro de inversión"} onClose={closeModal}>
          <div className="grid sm:grid-cols-2 gap-3">
            <FormField label="Fecha *"><Input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} /></FormField>
            <FormField label="Proyecto"><Input value={form.proyecto} onChange={e => setForm(f => ({ ...f, proyecto: e.target.value }))} placeholder="Ej: SGIII" /></FormField>
            <FormField label="Categoría de costo *" className="sm:col-span-2"><Input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} placeholder="Ej: Servicio de Salud, EPP, Certificación de Grúas..." /></FormField>
            <FormField label="Descripción del uso del fondo" className="sm:col-span-2">
              <textarea rows={2} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-emerald-500 resize-none" />
            </FormField>
            <FormField label="Monto (USD)"><Input type="number" step="0.01" value={form.monto_usd} onChange={e => setForm(f => ({ ...f, monto_usd: e.target.value }))} placeholder="0.00" /></FormField>
            <FormField label="Proveedor"><Input value={form.proveedor} onChange={e => setForm(f => ({ ...f, proveedor: e.target.value }))} /></FormField>
            <FormField label="Responsable"><Input value={form.responsable} onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))} placeholder="Ej: HSE" /></FormField>
            <FormField label="Observaciones" className="sm:col-span-2"><Input value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} /></FormField>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Btn variant="ghost" onClick={closeModal}>Cancelar</Btn>
            <Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : editing ? "Actualizar" : "Guardar"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  VISTA: Plan vs Real (resumen mensual del Cuadro de Inversión SST)
//  Valores en USD; equivalente 万元/CNY con tipo de cambio (default 6.95).
// ════════════════════════════════════════════════════════════════════
function ResumenMensual({ empresaId }) {
  const anioActual = new Date().getFullYear();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [fAnio, setFAnio] = useState(anioActual);
  const initForm = { anio: anioActual, mes: 1, mes_actual_usd: "", acumulado_usd: "", plan_anual_usd: "", tc_usd_cny: "6.95", observaciones: "" };
  const [form, setForm] = useState(initForm);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("inversion_resumen_sst")
      .select("*").eq("empresa_id", empresaId).order("anio", { ascending: false }).order("mes", { ascending: true });
    if (error) showToast("Error al cargar: " + error.message, "error");
    setRecords(data || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const openEdit = (r) => {
    setForm({ anio: r.anio, mes: r.mes, mes_actual_usd: String(r.mes_actual_usd ?? ""), acumulado_usd: String(r.acumulado_usd ?? ""), plan_anual_usd: String(r.plan_anual_usd ?? ""), tc_usd_cny: String(r.tc_usd_cny ?? "6.95"), observaciones: r.observaciones || "" });
    setEditing(r.id); setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(initForm); };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      empresa_id: empresaId, anio: parseInt(form.anio), mes: parseInt(form.mes),
      mes_actual_usd: parseFloat(form.mes_actual_usd) || 0, acumulado_usd: parseFloat(form.acumulado_usd) || 0,
      plan_anual_usd: parseFloat(form.plan_anual_usd) || 0, tc_usd_cny: parseFloat(form.tc_usd_cny) || 6.95,
      observaciones: form.observaciones || null,
    };
    const { error } = editing
      ? await supabase.from("inversion_resumen_sst").update(payload).eq("id", editing)
      : await supabase.from("inversion_resumen_sst").upsert(payload, { onConflict: "empresa_id,anio,mes" });
    if (error) showToast("Error: " + error.message, "error");
    else { showToast(editing ? "Actualizado" : "Guardado", "success"); closeModal(); load(); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este mes?")) return;
    await supabase.from("inversion_resumen_sst").delete().eq("id", id);
    showToast("Eliminado", "info"); load();
  };

  // ── Importar el Cuadro de Inversión (una hoja por mes; línea energía) ──
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = async (ev) => {
      setImporting(true);
      try {
        const wb = XLSX.read(ev.target.result, { type: "array", raw: true });
        const upserts = [];
        wb.SheetNames.forEach((sn) => {
          const mes = MES_NUM[sn.toLowerCase().trim()];
          if (!mes) return;
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: "" });
          // Año: buscar un 20XX en cualquier celda; fallback año actual
          let anio = anioActual;
          for (const r of rows) for (const c of r) { const m = String(c).match(/\b(20\d\d)\b/); if (m) { anio = parseInt(m[1]); break; } }
          // Fila de datos: la que tiene unidad (col1) y un número en col2
          const dataRow = rows.find(r => String(r[1] || "").trim() && typeof r[2] === "number");
          if (!dataRow) return;
          upserts.push({
            empresa_id: empresaId, anio, mes,
            mes_actual_usd: Number(dataRow[2]) || 0, acumulado_usd: Number(dataRow[3]) || 0,
            plan_anual_usd: Number(dataRow[4]) || 0, tc_usd_cny: 6.95,
          });
        });
        if (!upserts.length) { showToast("No se encontraron hojas de meses válidas", "error"); setImporting(false); return; }
        const { error } = await supabase.from("inversion_resumen_sst").upsert(upserts, { onConflict: "empresa_id,anio,mes" });
        if (error) { showToast("Error al insertar: " + error.message, "error"); setImporting(false); return; }
        showToast(`✅ ${upserts.length} meses importados`, "success");
        load();
      } catch (err) {
        showToast("Error al leer el archivo: " + err.message, "error");
      }
      setImporting(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const anios = [...new Set(records.map(r => r.anio))].sort((a, b) => b - a);
  const delAnio = records.filter(r => r.anio === fAnio);
  const tc = delAnio[0]?.tc_usd_cny || 6.95;
  const planAnual = Math.max(0, ...delAnio.map(r => Number(r.plan_anual_usd || 0)));
  const acumulado = delAnio.length ? Number(delAnio[delAnio.length - 1].acumulado_usd || 0) : 0;
  const pctEjec = planAnual ? (acumulado / planAnual * 100) : 0;
  const chartData = delAnio.map(r => ({ mes: MESES[r.mes].slice(0, 3), monto: Number(r.mes_actual_usd || 0) }));

  return (
    <div>
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
            <BarChart3 size={15} className="text-emerald-400" /> Cuadro de Inversión — Plan vs Real
          </h3>
          <p className="text-gray-500 text-xs max-w-xl">Resumen mensual de la inversión SST (línea de energía eléctrica) frente al plan anual. Valores en USD con equivalente en 万元.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4 flex-wrap">
          {anios.length > 1 && (
            <select value={fAnio} onChange={e => setFAnio(parseInt(e.target.value))} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-emerald-500">
              {anios.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
          <label className="cursor-pointer">
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} disabled={importing} />
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors">
              <Upload size={13} /> {importing ? "Importando..." : "Importar Cuadro"}
            </span>
          </label>
          <Btn size="sm" variant="primary" onClick={() => { setEditing(null); setForm({ ...initForm, anio: fAnio }); setShowModal(true); }}><Plus size={13} /> Mes manual</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Plan anual" value={fmtUSD(planAnual)} sub={fmtWan(planAnual, tc)} accentColor="blue" />
        <KpiCard label="Acumulado" value={fmtUSD(acumulado)} sub={fmtWan(acumulado, tc)} accentColor="emerald" />
        <KpiCard label="% ejecutado" value={`${pctEjec.toFixed(1)}%`} sub={`del plan ${fAnio}`} accentColor={pctEjec > 90 ? "red" : pctEjec > 60 ? "amber" : "emerald"} />
        <KpiCard label="Meses cargados" value={delAnio.length} sub={`tipo cambio ${tc} CNY/USD`} accentColor="violet" />
      </div>

      {planAnual > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-5">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>Ejecución del plan anual {fAnio}</span>
            <span className="font-mono text-emerald-300">{fmtUSD(acumulado)} / {fmtUSD(planAnual)}</span>
          </div>
          <ProgressBar value={Math.min(100, pctEjec)} />
        </div>
      )}

      {chartData.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-5">
          <p className="text-xs text-gray-400 font-medium mb-3 flex items-center gap-1.5"><TrendingUp size={13} className="text-emerald-400" /> Inversión por mes ({fAnio})</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <ChartTooltip formatter={(v) => fmtUSD(v)} contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="monto" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800">
            {["Mes", "Inversión del mes", "Acumulado", "% del plan", ""].map(h => (
              <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
            {!loading && delAnio.map(r => {
              const pct = r.plan_anual_usd ? (Number(r.acumulado_usd) / Number(r.plan_anual_usd) * 100) : 0;
              return (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-xs text-gray-300 font-medium">{MESES[r.mes]}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-mono text-xs font-bold text-emerald-400">{fmtUSD(r.mes_actual_usd)}</div>
                    <div className="font-mono text-[10px] text-gray-500">{fmtWan(r.mes_actual_usd, r.tc_usd_cny)}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-mono text-xs text-gray-300">{fmtUSD(r.acumulado_usd)}</div>
                    <div className="font-mono text-[10px] text-gray-500">{fmtWan(r.acumulado_usd, r.tc_usd_cny)}</div>
                  </td>
                  <td className="px-4 py-3"><Badge color={pct > 90 ? "red" : pct > 60 ? "amber" : "green"}>{pct.toFixed(1)}%</Badge></td>
                  <td className="px-4 py-3"><div className="flex gap-1">
                    <button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400"><Pencil size={13} /></button>
                    <button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400"><Trash2 size={13} /></button>
                  </div></td>
                </tr>
              );
            })}
            {!loading && !delAnio.length && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-600 text-sm">Sin datos para {fAnio}. Usa "Importar Cuadro" o "Mes manual".</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? "Editar mes" : "Registrar mes"} onClose={closeModal}>
          <div className="grid sm:grid-cols-2 gap-3">
            <FormField label="Año *"><Input type="number" value={form.anio} onChange={e => setForm(f => ({ ...f, anio: e.target.value }))} /></FormField>
            <FormField label="Mes *">
              <select value={form.mes} onChange={e => setForm(f => ({ ...f, mes: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald-500">
                {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </FormField>
            <FormField label="Inversión del mes (USD)"><Input type="number" step="0.01" value={form.mes_actual_usd} onChange={e => setForm(f => ({ ...f, mes_actual_usd: e.target.value }))} /></FormField>
            <FormField label="Acumulado anual (USD)"><Input type="number" step="0.01" value={form.acumulado_usd} onChange={e => setForm(f => ({ ...f, acumulado_usd: e.target.value }))} /></FormField>
            <FormField label="Plan anual (USD)"><Input type="number" step="0.01" value={form.plan_anual_usd} onChange={e => setForm(f => ({ ...f, plan_anual_usd: e.target.value }))} /></FormField>
            <FormField label="Tipo de cambio (CNY/USD)"><Input type="number" step="0.0001" value={form.tc_usd_cny} onChange={e => setForm(f => ({ ...f, tc_usd_cny: e.target.value }))} /></FormField>
            <FormField label="Observaciones" className="sm:col-span-2"><Input value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} /></FormField>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Btn variant="ghost" onClick={closeModal}>Cancelar</Btn>
            <Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : editing ? "Actualizar" : "Guardar"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
