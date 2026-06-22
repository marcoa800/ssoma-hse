import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../../lib/supabase.js";
import { showToast } from "../../lib/toast.jsx";
import { Modal } from "../../components/ui/Modal.jsx";
import { FormField } from "../../components/ui/FormField.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { Select } from "../../components/ui/Select.jsx";
import { Btn } from "../../components/ui/Btn.jsx";
import { WideTableScroll } from "../../components/ui/WideTableScroll.jsx";
import {
  Plus, Search, ExternalLink, Pencil, Trash2,
  FileText, AlertTriangle, CheckCircle, Clock,
  X, Download, RefreshCw, FileDown, Filter,
} from "lucide-react";

// ──────────────────────────────────────────────
// Constantes del SIG
// ──────────────────────────────────────────────
const TIPOS = [
  "Política", "Manual", "Procedimiento", "Instructivo",
  "Formato", "Registro", "Plan", "Programa",
  "Especificación", "Protocolo", "Reglamento", "Otro",
];

const NORMAS = [
  "ISO 9001:2015", "ISO 14001:2015", "ISO 45001:2018",
  "ISO 9001 + 14001 + 45001", "Legal / Normativo",
  "Interno", "SGS / UNNA", "Otro",
];

const ESTADOS = ["Vigente", "En Revisión", "Pendiente de Aprobación", "Obsoleto"];

const AREAS = [
  "Gerencia / Dirección", "SSOMA / HSE", "Calidad",
  "Operaciones", "Mantenimiento", "Logística / Almacén",
  "Recursos Humanos", "Finanzas / Contabilidad",
  "Medio Ambiente", "Seguridad Industrial",
  "Salud Ocupacional", "Informática / TI", "Otro",
];

const TIPO_COLOR = {
  "Política":                "bg-blue-900/40 text-blue-300 border-blue-800",
  "Manual":                  "bg-purple-900/40 text-purple-300 border-purple-800",
  "Procedimiento":           "bg-amber-900/40 text-amber-300 border-amber-800",
  "Instructivo":             "bg-cyan-900/40 text-cyan-300 border-cyan-800",
  "Formato":                 "bg-green-900/40 text-green-300 border-green-800",
  "Registro":                "bg-teal-900/40 text-teal-300 border-teal-800",
  "Plan":                    "bg-indigo-900/40 text-indigo-300 border-indigo-800",
  "Programa":                "bg-violet-900/40 text-violet-300 border-violet-800",
  "Especificación":          "bg-orange-900/40 text-orange-300 border-orange-800",
  "Protocolo":               "bg-rose-900/40 text-rose-300 border-rose-800",
  "Reglamento":              "bg-red-900/40 text-red-300 border-red-800",
  "Otro":                    "bg-gray-800/60 text-gray-400 border-gray-700",
};

const ESTADO_COLOR = {
  "Vigente":                 "bg-emerald-900/40 text-emerald-300 border-emerald-800",
  "En Revisión":             "bg-blue-900/40 text-blue-300 border-blue-800",
  "Pendiente de Aprobación": "bg-amber-900/40 text-amber-300 border-amber-800",
  "Obsoleto":                "bg-red-900/40 text-red-400 border-red-900",
};

const EMPTY = {
  codigo: "", nombre: "", tipo: "Procedimiento", version: "01",
  area: "", proceso: "", responsable: "", aprobado_por: "",
  norma: "ISO 45001:2018", fecha_aprobacion: "", fecha_revision: "",
  estado: "Vigente", drive_link: "", observaciones: "",
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function diasParaRevision(fecha) {
  if (!fecha) return null;
  const diff = (new Date(fecha) - new Date()) / (1000 * 60 * 60 * 24);
  return Math.round(diff);
}

function BadgeTipo({ tipo }) {
  const cls = TIPO_COLOR[tipo] || TIPO_COLOR["Otro"];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>{tipo}</span>;
}

function BadgeEstado({ estado }) {
  const cls = ESTADO_COLOR[estado] || ESTADO_COLOR["Vigente"];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>{estado}</span>;
}

// ──────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────
export default function SIGModulo({ empresaId }) {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState(EMPTY);
  const [editId, setEditId]     = useState(null);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(null);

  // Filtros
  const [search,   setSearch]   = useState("");
  const [fTipo,    setFTipo]    = useState("");
  const [fArea,    setFArea]    = useState("");
  const [fEstado,  setFEstado]  = useState("");
  const [fNorma,   setFNorma]   = useState("");

  // ── Load ──
  const load = async () => {
    if (!empresaId) return;
    setLoading(true);
    const { data } = await supabase
      .from("sig_documentos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("codigo", { ascending: true });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [empresaId]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const vigentes = items.filter(i => i.estado === "Vigente").length;
    const revision = items.filter(i => i.estado === "En Revisión").length;
    const obsoletos = items.filter(i => i.estado === "Obsoleto").length;
    const porVencer = items.filter(i => {
      const d = diasParaRevision(i.fecha_revision);
      return d !== null && d >= 0 && d <= 30 && i.estado === "Vigente";
    }).length;
    return { total: items.length, vigentes, revision, obsoletos, porVencer };
  }, [items]);

  // ── Filtrado ──
  const filtrados = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(i => {
      if (q && !`${i.codigo} ${i.nombre} ${i.area} ${i.responsable} ${i.proceso}`.toLowerCase().includes(q)) return false;
      if (fTipo   && i.tipo   !== fTipo)   return false;
      if (fArea   && i.area   !== fArea)   return false;
      if (fEstado && i.estado !== fEstado) return false;
      if (fNorma  && i.norma  !== fNorma)  return false;
      return true;
    });
  }, [items, search, fTipo, fArea, fEstado, fNorma]);

  const hayFiltros = search || fTipo || fArea || fEstado || fNorma;
  const clearFilters = () => { setSearch(""); setFTipo(""); setFArea(""); setFEstado(""); setFNorma(""); };

  // ── Save ──
  const save = async () => {
    if (!form.nombre.trim()) { showToast("El nombre es obligatorio", "error"); return; }
    setSaving(true);
    const payload = {
      ...form,
      empresa_id: empresaId,
      fecha_aprobacion: form.fecha_aprobacion || null,
      fecha_revision:   form.fecha_revision   || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = editId
      ? await supabase.from("sig_documentos").update(payload).eq("id", editId)
      : await supabase.from("sig_documentos").insert(payload);
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast(editId ? "✅ Documento actualizado" : "✅ Documento agregado", "success");
    setModal(false);
    load();
  };

  // ── Quick Estado ──
  const quickEstado = async (id, estado) => {
    await supabase.from("sig_documentos").update({ estado, updated_at: new Date().toISOString() }).eq("id", id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, estado } : i));
  };

  // ── Delete ──
  const del = async (id) => {
    if (!window.confirm("¿Eliminar este documento del SIG?")) return;
    setDeleting(id);
    await supabase.from("sig_documentos").delete().eq("id", id);
    setDeleting(null);
    showToast("Documento eliminado", "success");
    load();
  };

  // ── Open Edit ──
  const openEdit = (item) => {
    setForm({
      codigo:           item.codigo           || "",
      nombre:           item.nombre           || "",
      tipo:             item.tipo             || "Procedimiento",
      version:          item.version          || "01",
      area:             item.area             || "",
      proceso:          item.proceso          || "",
      responsable:      item.responsable      || "",
      aprobado_por:     item.aprobado_por     || "",
      norma:            item.norma            || "ISO 45001:2018",
      fecha_aprobacion: item.fecha_aprobacion || "",
      fecha_revision:   item.fecha_revision   || "",
      estado:           item.estado           || "Vigente",
      drive_link:       item.drive_link       || "",
      observaciones:    item.observaciones    || "",
    });
    setEditId(item.id);
    setModal(true);
  };

  // ── Export Excel ──
  const exportExcel = () => {
    const rows = filtrados.map(i => ({
      "Código":                  i.codigo            || "",
      "Nombre del Documento":    i.nombre            || "",
      "Tipo":                    i.tipo              || "",
      "Versión":                 i.version           || "",
      "Área / Proceso":          i.area              || "",
      "Proceso Específico":      i.proceso           || "",
      "Norma":                   i.norma             || "",
      "Responsable":             i.responsable       || "",
      "Aprobado por":            i.aprobado_por      || "",
      "Fecha Aprobación":        i.fecha_aprobacion  || "",
      "Fecha Próxima Revisión":  i.fecha_revision    || "",
      "Estado":                  i.estado            || "",
      "Link Drive":              i.drive_link        || "",
      "Observaciones":           i.observaciones     || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    // Anchos de columna
    ws["!cols"] = [
      {wch:14},{wch:45},{wch:16},{wch:8},{wch:22},{wch:20},{wch:22},
      {wch:20},{wch:20},{wch:14},{wch:18},{wch:22},{wch:40},{wch:35},
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SIG - Documentos");
    XLSX.writeFile(wb, `SIG_Documentos_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast("✅ Excel exportado", "success");
  };

  // ── Formulario field helper ──
  const f = (key, val) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-white font-semibold">SIG — Control Documental</h2>
          <p className="text-gray-600 text-xs mt-0.5">Sistema Integrado de Gestión · documentos, versiones y estados</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-900/30 border border-emerald-800 text-emerald-300 text-xs hover:bg-emerald-900/50 transition-colors">
            <Download size={13} /> Exportar Excel
          </button>
          <button onClick={() => { setForm(EMPTY); setEditId(null); setModal(true); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors">
            <Plus size={13} /> Nuevo Documento
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        {[
          { label: "Total documentos",      value: kpis.total,     color: "text-blue-400",    bg: "border-blue-900/40" },
          { label: "Vigentes",              value: kpis.vigentes,  color: "text-emerald-400", bg: "border-emerald-900/40" },
          { label: "En Revisión",           value: kpis.revision,  color: "text-blue-300",    bg: "border-blue-900/40" },
          { label: "Por vencer (≤30 días)", value: kpis.porVencer, color: kpis.porVencer > 0 ? "text-amber-400" : "text-gray-500", bg: kpis.porVencer > 0 ? "border-amber-800" : "border-gray-800" },
          { label: "Obsoletos",             value: kpis.obsoletos, color: kpis.obsoletos > 0 ? "text-red-400" : "text-gray-500", bg: kpis.obsoletos > 0 ? "border-red-900/40" : "border-gray-800" },
        ].map(k => (
          <div key={k.label} className={`bg-gray-900 border ${k.bg} rounded-xl p-3`}>
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Alerta por vencer ── */}
      {kpis.porVencer > 0 && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-amber-900/20 border border-amber-800 rounded-xl text-sm">
          <AlertTriangle size={15} className="text-amber-400 shrink-0" />
          <span className="text-amber-200 font-medium">{kpis.porVencer} documento{kpis.porVencer > 1 ? "s" : ""} con revisión pendiente en los próximos 30 días</span>
          <button onClick={() => { setFEstado("Vigente"); }}
            className="ml-auto text-xs text-amber-400 hover:text-amber-200 underline shrink-0">Ver</button>
        </div>
      )}

      {/* ── Filtros ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <div className="relative col-span-2 md:col-span-1 lg:col-span-2">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar código, nombre, área..."
              className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500" />
          </div>
          <select value={fTipo} onChange={e => setFTipo(e.target.value)}
            className="px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-white focus:outline-none focus:border-blue-500">
            <option value="">Tipo</option>
            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={fArea} onChange={e => setFArea(e.target.value)}
            className="px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-white focus:outline-none focus:border-blue-500">
            <option value="">Área</option>
            {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={fEstado} onChange={e => setFEstado(e.target.value)}
            className="px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-white focus:outline-none focus:border-blue-500">
            <option value="">Estado</option>
            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={fNorma} onChange={e => setFNorma(e.target.value)}
            className="px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-white focus:outline-none focus:border-blue-500">
            <option value="">Norma</option>
            {NORMAS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        {hayFiltros && (
          <button onClick={clearFilters} className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            <X size={11} /> Limpiar filtros
          </button>
        )}
      </div>

      {/* ── Tabla ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <span className="text-xs text-gray-500">{filtrados.length} documento{filtrados.length !== 1 ? "s" : ""}{hayFiltros ? " (filtrado)" : ""}</span>
          <button onClick={load} className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-gray-800 transition-colors">
            <RefreshCw size={12} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-xs text-gray-600">Cargando documentos...</div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={32} className="text-gray-700 mb-3" />
            <p className="text-sm text-gray-600 font-medium">
              {hayFiltros ? "Sin resultados para los filtros aplicados" : "No hay documentos cargados"}
            </p>
            {!hayFiltros && (
              <div className="mt-3 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-500 max-w-sm">
                Primero ejecuta el SQL de creación de tabla en Supabase,<br/>luego agrega documentos con el botón <strong className="text-white">+ Nuevo Documento</strong>
              </div>
            )}
          </div>
        ) : (
          <>
          {/* Vista móvil: tarjetas */}
          <div className="md:hidden space-y-2.5 p-3">
            {filtrados.map(item => {
              const dias = diasParaRevision(item.fecha_revision);
              const proxColor = dias === null ? "text-gray-400" : dias < 0 ? "text-red-400" : dias <= 30 ? "text-amber-400" : "text-gray-400";
              return (
                <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3.5">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <div className="font-semibold text-white text-sm leading-snug">{item.nombre}</div>
                      <div className="text-xs text-gray-500 font-mono mt-0.5">{item.codigo || "Sin código"}{item.version ? ` · v${item.version}` : ""}</div>
                      {item.proceso && <div className="text-xs text-gray-600 mt-0.5">{item.proceso}</div>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {item.drive_link && (
                        <a href={item.drive_link} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 p-1"><ExternalLink size={15} /></a>
                      )}
                      <button onClick={() => openEdit(item)} className="text-gray-500 hover:text-blue-400 p-1"><Pencil size={15} /></button>
                      <button onClick={() => del(item.id)} disabled={deleting === item.id} className="text-red-500/60 hover:text-red-400 p-1"><Trash2 size={15} /></button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <BadgeTipo tipo={item.tipo || "Otro"} />
                    <select
                      value={item.estado || "Vigente"}
                      onChange={e => quickEstado(item.id, e.target.value)}
                      className="px-1.5 py-1 rounded bg-transparent border border-gray-700 text-xs text-gray-300 focus:outline-none focus:border-blue-500 cursor-pointer">
                      {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs border-t border-gray-800 pt-2.5">
                    <div className="truncate"><span className="text-gray-600">Área:</span> <span className="text-gray-400">{item.area || "—"}</span></div>
                    <div className="truncate"><span className="text-gray-600">Norma:</span> <span className="text-gray-400">{item.norma || "—"}</span></div>
                    <div className="truncate"><span className="text-gray-600">Responsable:</span> <span className="text-gray-400">{item.responsable || "—"}</span></div>
                    <div>
                      <span className="text-gray-600">Próx. revisión:</span>{" "}
                      <span className={`font-mono ${proxColor}`}>
                        {item.fecha_revision
                          ? <>{item.fecha_revision}{dias !== null && dias <= 30 && ` (${dias < 0 ? "vencido" : `${dias}d`})`}</>
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block">
            <WideTableScroll maxH="max-h-[calc(100vh-200px)]">
            <table className="w-full text-xs min-w-[960px]">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-left">
                  <th className="px-3 py-2.5 font-medium w-[100px]">Código</th>
                  <th className="px-3 py-2.5 font-medium">Nombre del Documento</th>
                  <th className="px-3 py-2.5 font-medium w-[120px]">Tipo</th>
                  <th className="px-3 py-2.5 font-medium w-[44px] text-center">Ver.</th>
                  <th className="px-3 py-2.5 font-medium w-[140px]">Área</th>
                  <th className="px-3 py-2.5 font-medium w-[140px]">Norma</th>
                  <th className="px-3 py-2.5 font-medium w-[110px]">Responsable</th>
                  <th className="px-3 py-2.5 font-medium w-[100px]">Próx. Revisión</th>
                  <th className="px-3 py-2.5 font-medium w-[175px]">Estado</th>
                  <th className="px-3 py-2.5 font-medium w-[70px] text-center">Drive</th>
                  <th className="px-3 py-2.5 font-medium w-[60px] text-center">Acc.</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(item => {
                  const dias = diasParaRevision(item.fecha_revision);
                  const proxColor = dias === null ? "" : dias < 0 ? "text-red-400" : dias <= 30 ? "text-amber-400" : "text-gray-400";
                  return (
                    <tr key={item.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-gray-400 whitespace-nowrap">{item.codigo || "—"}</td>
                      <td className="px-3 py-2.5 text-white font-medium max-w-[260px]">
                        <div className="truncate" title={item.nombre}>{item.nombre}</div>
                        {item.proceso && <div className="text-gray-600 text-xs truncate">{item.proceso}</div>}
                      </td>
                      <td className="px-3 py-2.5"><BadgeTipo tipo={item.tipo || "Otro"} /></td>
                      <td className="px-3 py-2.5 text-center text-gray-400 font-mono">{item.version || "—"}</td>
                      <td className="px-3 py-2.5 text-gray-400 truncate max-w-[140px]" title={item.area}>{item.area || "—"}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs truncate" title={item.norma}>{item.norma || "—"}</td>
                      <td className="px-3 py-2.5 text-gray-400 truncate" title={item.responsable}>{item.responsable || "—"}</td>
                      <td className={`px-3 py-2.5 font-mono whitespace-nowrap ${proxColor}`}>
                        {item.fecha_revision
                          ? <>{item.fecha_revision}{dias !== null && dias <= 30 && <span className="ml-1 text-xs">({dias < 0 ? "vencido" : `${dias}d`})</span>}</>
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={item.estado || "Vigente"}
                          onChange={e => quickEstado(item.id, e.target.value)}
                          className="w-full px-1.5 py-1 rounded bg-transparent border border-gray-700 text-xs text-gray-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                          style={{ fontSize: "11px" }}
                        >
                          {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {item.drive_link
                          ? <a href={item.drive_link} target="_blank" rel="noreferrer"
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-900/30 border border-blue-800 text-blue-400 hover:bg-blue-900/60 transition-colors">
                              <ExternalLink size={12} />
                            </a>
                          : <span className="text-gray-700">—</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1 justify-center">
                          <button onClick={() => openEdit(item)}
                            className="p-1.5 rounded-lg text-gray-600 hover:text-blue-400 hover:bg-blue-900/20 transition-colors">
                            <Pencil size={12} />
                          </button>
                          <button onClick={() => del(item.id)} disabled={deleting === item.id}
                            className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </WideTableScroll>
          </div>
          </>
        )}
      </div>

      {/* ── Modal Add/Edit ── */}
      {modal && (
        <Modal title={editId ? "Editar Documento SIG" : "Nuevo Documento SIG"} onClose={() => setModal(false)} size="lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Columna izquierda */}
            <div className="space-y-3">
              <FormField label="Código del documento">
                <Input value={form.codigo} onChange={e => f("codigo", e.target.value)}
                  placeholder="Ej: PG-HSE-001, IT-CAL-003..." />
              </FormField>
              <FormField label="Nombre del documento *">
                <Input value={form.nombre} onChange={e => f("nombre", e.target.value)}
                  placeholder="Nombre completo del documento" />
              </FormField>
              <FormField label="Tipo de documento">
                <Select value={form.tipo} onChange={e => f("tipo", e.target.value)}>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Versión">
                <Input value={form.version} onChange={e => f("version", e.target.value)}
                  placeholder="Ej: 01, 02, 1.0..." />
              </FormField>
              <FormField label="Área">
                <Select value={form.area} onChange={e => f("area", e.target.value)}>
                  <option value="">Seleccionar área...</option>
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </Select>
              </FormField>
              <FormField label="Proceso específico">
                <Input value={form.proceso} onChange={e => f("proceso", e.target.value)}
                  placeholder="Ej: Gestión de EPPs, Control de documentos..." />
              </FormField>
              <FormField label="Norma de referencia">
                <Select value={form.norma} onChange={e => f("norma", e.target.value)}>
                  {NORMAS.map(n => <option key={n} value={n}>{n}</option>)}
                </Select>
              </FormField>
            </div>

            {/* Columna derecha */}
            <div className="space-y-3">
              <FormField label="Responsable de elaboración">
                <Input value={form.responsable} onChange={e => f("responsable", e.target.value)}
                  placeholder="Nombre del responsable" />
              </FormField>
              <FormField label="Aprobado por">
                <Input value={form.aprobado_por} onChange={e => f("aprobado_por", e.target.value)}
                  placeholder="Cargo o nombre del aprobador" />
              </FormField>
              <FormField label="Fecha de aprobación">
                <Input type="date" value={form.fecha_aprobacion} onChange={e => f("fecha_aprobacion", e.target.value)} />
              </FormField>
              <FormField label="Fecha próxima revisión">
                <Input type="date" value={form.fecha_revision} onChange={e => f("fecha_revision", e.target.value)} />
              </FormField>
              <FormField label="Estado">
                <Select value={form.estado} onChange={e => f("estado", e.target.value)}>
                  {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                </Select>
              </FormField>
              <FormField label="Link Google Drive / SharePoint">
                <Input value={form.drive_link} onChange={e => f("drive_link", e.target.value)}
                  placeholder="https://drive.google.com/..." />
              </FormField>
              <FormField label="Observaciones / Notas">
                <textarea
                  value={form.observaciones}
                  onChange={e => f("observaciones", e.target.value)}
                  placeholder="Notas adicionales, cambios en la versión, etc."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
                />
              </FormField>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-800">
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={save} loading={saving}>
              {editId ? "Guardar cambios" : "Agregar documento"}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
