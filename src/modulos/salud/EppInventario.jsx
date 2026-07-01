// ════════════════════════════════════════════════════════════════════
//  EppInventario — Control de Ingreso/Salida de EPP
//  Módulo de stock/inventario (NO por persona).
//  Usado por Comindustria en lugar del módulo per-persona.
// ════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import { supabase, puedeEliminar } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { fmtFecha } from '../../lib/helpers.js';
import { Badge } from '../../components/ui/Badge.jsx';
import { KpiCard } from '../../components/ui/KpiCard.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Btn } from '../../components/ui/Btn.jsx';
import { ExportBtn } from '../../components/ui/ExportBtn.jsx';
import { Plus, Pencil, Trash2, Shield, TrendingUp, TrendingDown, RotateCcw, Package } from 'lucide-react';

// ── Catálogo de EPPs con tallas ──────────────────────────────────────
const CATEGORIAS = {
  "Calzado de Seguridad":   ["35","36","37","38","39","40","41","42","43","44","45","46"],
  "Guantes":                ["XS","S","M","L","XL","XXL"],
  "Casco de Seguridad":     ["Único"],
  "Lentes de Seguridad":    ["Único"],
  "Chaleco Reflectivo":     ["XS","S","M","L","XL","XXL"],
  "Protección Auditiva":    ["Único"],
  "Respirador / Mascarilla":["S","M","L","XL"],
  "Ropa de Trabajo":        ["XS","S","M","L","XL","XXL"],
  "Arnés de Seguridad":     ["Único","S/M","L/XL"],
  "Mameluco / Overall":     ["XS","S","M","L","XL","XXL"],
  "Botas de Jebe":          ["35","36","37","38","39","40","41","42","43","44","45","46"],
  "Otro":                   [],
};

const TIPOS = [
  { id: "Ingreso",    label: "Ingreso",    icon: TrendingUp,   color: "green",  desc: "Stock que llega al almacén" },
  { id: "Salida",     label: "Salida",     icon: TrendingDown, color: "red",    desc: "Stock entregado / consumido" },
  { id: "Devolución", label: "Devolución", icon: RotateCcw,    color: "blue",   desc: "Stock devuelto al almacén" },
];

const tipoColor = { Ingreso: "green", Salida: "red", "Devolución": "blue" };

export default function EppInventario({ empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState("movimientos"); // movimientos | stock
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [fTipo, setFTipo] = useState("");
  const [fCat, setFCat] = useState("");

  const initForm = {
    fecha: new Date().toISOString().split("T")[0],
    tipo: "Ingreso", categoria: "Calzado de Seguridad",
    nombre: "", talla: "", cantidad: "1",
    proveedor: "", responsable: "", observaciones: "",
  };
  const [form, setForm] = useState(initForm);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("epp_movimientos")
      .select("*").eq("empresa_id", empresaId)
      .order("fecha", { ascending: false }).order("created_at", { ascending: false });
    if (error) showToast("Error al cargar: " + error.message, "error");
    setRecords(data || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const openEdit = (r) => {
    setForm({
      fecha: r.fecha, tipo: r.tipo, categoria: r.categoria,
      nombre: r.nombre || "", talla: r.talla || "",
      cantidad: String(r.cantidad), proveedor: r.proveedor || "",
      responsable: r.responsable || "", observaciones: r.observaciones || "",
    });
    setEditing(r.id); setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(initForm); };

  const handleSave = async () => {
    if (!form.nombre.trim()) { showToast("Indica el nombre del EPP", "error"); return; }
    if (!form.cantidad || parseInt(form.cantidad) < 1) { showToast("La cantidad debe ser mayor a 0", "error"); return; }
    setSaving(true);
    const payload = {
      empresa_id: empresaId, fecha: form.fecha, tipo: form.tipo,
      categoria: form.categoria, nombre: form.nombre.trim(),
      talla: form.talla || null, cantidad: parseInt(form.cantidad),
      proveedor: form.proveedor || null, responsable: form.responsable || null,
      observaciones: form.observaciones || null,
    };
    const { error } = editing
      ? await supabase.from("epp_movimientos").update(payload).eq("id", editing)
      : await supabase.from("epp_movimientos").insert(payload);
    if (error) showToast("Error: " + error.message, "error");
    else { showToast(editing ? "Actualizado" : "Movimiento registrado", "success"); closeModal(); load(); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este movimiento?")) return;
    await supabase.from("epp_movimientos").delete().eq("id", id);
    showToast("Eliminado", "info"); load();
  };

  // ── KPIs ──
  const now = new Date();
  const mes = now.toISOString().slice(0, 7);
  const delMes = records.filter(r => r.fecha?.startsWith(mes));
  const ingresosMes = delMes.filter(r => r.tipo === "Ingreso").reduce((s, r) => s + (r.cantidad || 0), 0);
  const salidasMes = delMes.filter(r => r.tipo === "Salida").reduce((s, r) => s + (r.cantidad || 0), 0);
  const devolucionesMes = delMes.filter(r => r.tipo === "Devolución").reduce((s, r) => s + (r.cantidad || 0), 0);
  const stockTotal = records.reduce((s, r) => {
    if (r.tipo === "Ingreso" || r.tipo === "Devolución") return s + (r.cantidad || 0);
    if (r.tipo === "Salida") return s - (r.cantidad || 0);
    return s;
  }, 0);

  // ── Stock actual agrupado por categoria+nombre+talla ──
  const stockMap = {};
  records.forEach(r => {
    const key = `${r.categoria}||${r.nombre}||${r.talla || "—"}`;
    if (!stockMap[key]) stockMap[key] = { categoria: r.categoria, nombre: r.nombre, talla: r.talla || "—", stock: 0, entregados: 0, devueltos: 0 };
    if (r.tipo === "Ingreso") stockMap[key].stock += r.cantidad || 0;
    else if (r.tipo === "Salida") { stockMap[key].stock -= r.cantidad || 0; stockMap[key].entregados += r.cantidad || 0; }
    else if (r.tipo === "Devolución") { stockMap[key].stock += r.cantidad || 0; stockMap[key].devueltos += r.cantidad || 0; }
  });
  const stockList = Object.values(stockMap).sort((a, b) =>
    a.categoria.localeCompare(b.categoria, "es") || a.nombre.localeCompare(b.nombre, "es")
  );

  // ── Filtros ──
  const filtered = records.filter(r =>
    (!fTipo || r.tipo === fTipo) && (!fCat || r.categoria === fCat)
  );
  const catOpts = [...new Set(records.map(r => r.categoria).filter(Boolean))].sort();

  const tallasParaCategoria = CATEGORIAS[form.categoria] || [];

  return (
    <div>
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
            <Shield size={15} className="text-emerald-400" /> Control de EPP — Inventario
          </h3>
          <p className="text-gray-500 text-xs max-w-xl">Registro de ingresos, salidas y devoluciones de EPP al almacén. Stock actualizado en tiempo real.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <ExportBtn filename="epp_movimientos" data={filtered.map(r => ({
            Fecha: r.fecha, Tipo: r.tipo, Categoría: r.categoria,
            "EPP": r.nombre, Talla: r.talla || "—", Cantidad: r.cantidad,
            Proveedor: r.proveedor || "", Responsable: r.responsable || "",
            Observaciones: r.observaciones || "",
          }))} />
          <Btn size="sm" variant="primary" onClick={() => { setEditing(null); setForm(initForm); setShowModal(true); }}>
            <Plus size={13} /> Registrar movimiento
          </Btn>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Stock total" value={stockTotal} sub="unidades en almacén" accentColor={stockTotal < 10 ? "red" : "emerald"} />
        <KpiCard label="Ingresos (mes)" value={ingresosMes} sub="unidades recibidas" accentColor="blue" />
        <KpiCard label="Salidas (mes)" value={salidasMes} sub="unidades entregadas" accentColor="amber" />
        <KpiCard label="Devoluciones (mes)" value={devolucionesMes} sub="unidades devueltas" accentColor="violet" />
      </div>

      {/* Pestañas */}
      <div className="flex gap-2 mb-4 bg-gray-900/50 border border-gray-800 rounded-xl p-1.5 w-fit">
        <button onClick={() => setVista("movimientos")}
          className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${vista === "movimientos" ? "bg-emerald-700 text-white" : "text-gray-500 hover:text-gray-200"}`}>
          Movimientos
        </button>
        <button onClick={() => setVista("stock")}
          className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${vista === "stock" ? "bg-blue-700 text-white" : "text-gray-500 hover:text-gray-200"}`}>
          Stock Actual
        </button>
      </div>

      {/* ── VISTA: Movimientos ── */}
      {vista === "movimientos" && (
        <>
          {/* Filtros */}
          <div className="flex gap-2 flex-wrap mb-4 p-3 bg-gray-900/50 border border-gray-800 rounded-xl">
            <select value={fTipo} onChange={e => setFTipo(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-emerald-500">
              <option value="">Todos los tipos</option>
              {TIPOS.map(t => <option key={t.id} value={t.id}>{t.id}</option>)}
            </select>
            <select value={fCat} onChange={e => setFCat(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-emerald-500">
              <option value="">Todas las categorías</option>
              {catOpts.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {(fTipo || fCat) && <button onClick={() => { setFTipo(""); setFCat(""); }} className="text-xs text-blue-400 hover:text-blue-300">✕ Limpiar</button>}
            <span className="text-xs text-gray-600 ml-auto self-center">{filtered.length} registros</span>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800">
                {["Fecha","Tipo","Categoría","EPP","Talla","Cantidad","Proveedor","Responsable",""].map(h => (
                  <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {loading && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
                {!loading && filtered.map(r => (
                  <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">{fmtFecha(r.fecha)}</td>
                    <td className="px-4 py-3"><Badge color={tipoColor[r.tipo] || "gray"}>{r.tipo}</Badge></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{r.categoria}</td>
                    <td className="px-4 py-3 text-xs text-gray-300 font-medium">{r.nombre}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 text-center">{r.talla || "—"}</td>
                    <td className="px-4 py-3 text-center font-mono text-sm font-bold text-white">{r.cantidad}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{r.proveedor || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{r.responsable || "—"}</td>
                    <td className="px-4 py-3"><div className="flex gap-1">
                      <button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400"><Pencil size={13} /></button>
                      {puedeEliminar() && (
                        <button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400"><Trash2 size={13} /></button>
                      )}
                    </div></td>
                  </tr>
                ))}
                {!loading && !filtered.length && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-600 text-sm">
                    Sin movimientos. Usa "Registrar movimiento" para comenzar.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── VISTA: Stock Actual ── */}
      {vista === "stock" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800">
              {["Categoría","EPP","Talla","Stock actual","Entregados (total)","Devueltos (total)"].map(h => (
                <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {stockList.map((s, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-xs text-gray-400">{s.categoria}</td>
                  <td className="px-4 py-3 text-xs text-gray-300 font-medium">{s.nombre}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 text-center">{s.talla}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-mono text-sm font-bold ${s.stock <= 0 ? "text-red-400" : s.stock <= 5 ? "text-amber-400" : "text-emerald-400"}`}>
                      {s.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 text-center">{s.entregados}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 text-center">{s.devueltos}</td>
                </tr>
              ))}
              {!stockList.length && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-600 text-sm">Sin datos de stock.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL ── */}
      {showModal && (
        <Modal title={editing ? "Editar movimiento" : "Registrar movimiento de EPP"} onClose={closeModal}>
          {/* Tipo de movimiento */}
          <div className="mb-4">
            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide mb-2">Tipo de movimiento</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {TIPOS.map(t => (
                <button key={t.id} type="button" onClick={() => setForm(f => ({ ...f, tipo: t.id }))}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium transition-all ${form.tipo === t.id
                    ? t.id === "Ingreso" ? "bg-emerald-900/40 border-emerald-700 text-emerald-300"
                    : t.id === "Salida" ? "bg-red-900/40 border-red-700 text-red-300"
                    : "bg-blue-900/40 border-blue-700 text-blue-300"
                    : "bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-500"}`}>
                  <t.icon size={16} />
                  {t.label}
                  <span className="text-[10px] font-normal opacity-70">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <FormField label="Fecha *">
              <Input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
            </FormField>
            <FormField label="Categoría *">
              <Select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value, talla: "" }))}>
                {Object.keys(CATEGORIAS).map(c => <option key={c}>{c}</option>)}
              </Select>
            </FormField>
            <FormField label="Nombre del EPP *" className="sm:col-span-2">
              <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Zapato dieléctrico punta acero, Guante de nitrilo..." />
            </FormField>
            <FormField label="Talla">
              {tallasParaCategoria.length > 0 ? (
                <Select value={form.talla} onChange={e => setForm(f => ({ ...f, talla: e.target.value }))}>
                  <option value="">Sin talla / Único</option>
                  {tallasParaCategoria.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              ) : (
                <Input value={form.talla} onChange={e => setForm(f => ({ ...f, talla: e.target.value }))} placeholder="Talla (opcional)" />
              )}
            </FormField>
            <FormField label="Cantidad *">
              <Input type="number" min="1" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} />
            </FormField>
            <FormField label="Proveedor">
              <Input value={form.proveedor} onChange={e => setForm(f => ({ ...f, proveedor: e.target.value }))} placeholder="Nombre del proveedor" />
            </FormField>
            <FormField label="Responsable">
              <Input value={form.responsable} onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))} placeholder="Nombre del responsable" />
            </FormField>
            <FormField label="Observaciones" className="sm:col-span-2">
              <Input value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} />
            </FormField>
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
