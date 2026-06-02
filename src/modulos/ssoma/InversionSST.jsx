import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { excelDateToISO } from '../../lib/helpers.js';
import { Badge } from '../../components/ui/Badge.jsx';
import { KpiCard } from '../../components/ui/KpiCard.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Btn } from '../../components/ui/Btn.jsx';
import { ExportBtn } from '../../components/ui/ExportBtn.jsx';
import { FilterBar } from '../../components/ui/FilterBar.jsx';
import { Plus, Upload, Pencil, Trash2, DollarSign, TrendingUp } from 'lucide-react';

const fmtUSD = (n) => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const BAR_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6"];

export default function InversionSST({ empresaId }) {
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
                <td className="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">{r.fecha}</td>
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
