import { useState, useEffect, useMemo } from "react";
import { supabase, puedeEliminar } from "../../lib/supabase.js";
import { showToast } from "../../lib/toast.jsx";
import { Modal } from "../../components/ui/Modal.jsx";
import { FormField } from "../../components/ui/FormField.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { Select } from "../../components/ui/Select.jsx";
import { Btn } from "../../components/ui/Btn.jsx";
import { WideTableScroll } from "../../components/ui/WideTableScroll.jsx";
import {
  Plus, Search, ExternalLink, Pencil, Trash2,
  AlertTriangle, CheckCircle, Clock, FileText,
  X, ClipboardCheck, FolderOpen, RefreshCw,
} from "lucide-react";

const ESTADOS = ["Pendiente", "En Revisión", "Falta Firma", "Completado"];

const CATEGORIAS = [
  "Gestión de la Calidad",
  "SSOMA",
  "Gestión Ambiental",
  "Responsabilidad Social",
];

const CAT_COLOR = {
  "Gestión de la Calidad": "bg-purple-600 text-white border-purple-600",
  "SSOMA":                 "bg-amber-500 text-white border-amber-500",
  "Gestión Ambiental":     "bg-emerald-600 text-white border-emerald-600",
  "Responsabilidad Social":"bg-pink-600 text-white border-pink-600",
};

const CAT_BAR = {
  "Gestión de la Calidad": "bg-purple-500",
  "SSOMA":                 "bg-amber-500",
  "Gestión Ambiental":     "bg-emerald-500",
  "Responsabilidad Social":"bg-pink-500",
};

const ESTADO_COLOR = {
  "Pendiente":   "bg-gray-800 text-gray-400 border-gray-700",
  "En Revisión": "bg-blue-900/50 text-blue-300 border-blue-800",
  "Falta Firma": "bg-amber-900/50 text-amber-100 border-amber-700",
  "Completado":  "bg-green-600 text-white border-green-600",
};

const FORM_EMPTY = {
  numero: "", categoria: CATEGORIAS[0], descripcion: "",
  estado: "Pendiente", aplica: true, responsable: "",
  drive_link: "", drive_nombre: "", notas: "",
};

export default function HomologacionModulo({ empresaId }) {
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [fCat, setFCat]           = useState("");
  const [fEstado, setFEstado]     = useState("");
  const [fResp, setFResp]         = useState("");
  const [fAplica, setFAplica]     = useState("");
  const [editando, setEditando]   = useState(null); // null | "new" | item
  const [form, setForm]           = useState(FORM_EMPTY);
  const [saving, setSaving]       = useState(false);
  const [updId, setUpdId]         = useState(null);

  useEffect(() => { load(); }, [empresaId]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("homologacion_items")
      .select("*")
      .eq("empresa_id", empresaId);
    const sorted = (data || []).sort((a, b) => {
      const n = s => parseFloat(String(s || "0").replace(/[^\d.]/g, "")) || 0;
      return n(a.numero) - n(b.numero);
    });
    setItems(sorted);
    setLoading(false);
  };

  /* ── Quick updates ── */
  const quickUpdate = async (id, patch) => {
    setUpdId(id);
    const { error } = await supabase.from("homologacion_items")
      .update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    if (!error) setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
    else showToast("Error al actualizar", "error");
    setUpdId(null);
  };

  /* ── Save (new / edit) ── */
  const save = async () => {
    if (!form.descripcion.trim()) { showToast("La descripción es obligatoria", "error"); return; }
    setSaving(true);
    const payload = {
      empresa_id: empresaId,
      numero: form.numero || null,
      categoria: form.categoria,
      descripcion: form.descripcion,
      estado: form.estado,
      aplica: form.aplica,
      responsable: form.responsable || null,
      drive_link: form.drive_link || null,
      drive_nombre: form.drive_nombre || null,
      notas: form.notas || null,
      updated_at: new Date().toISOString(),
    };
    if (editando === "new") {
      const maxOrden = items.reduce((m, i) => Math.max(m, i.orden || 0), 0);
      const { error } = await supabase.from("homologacion_items")
        .insert({ ...payload, orden: maxOrden + 1 });
      if (error) { showToast("Error: " + error.message, "error"); setSaving(false); return; }
      showToast("✅ Ítem agregado", "success");
    } else {
      const { error } = await supabase.from("homologacion_items")
        .update(payload).eq("id", editando.id);
      if (error) { showToast("Error: " + error.message, "error"); setSaving(false); return; }
      showToast("Guardado", "success");
    }
    setSaving(false);
    setEditando(null);
    load();
  };

  const del = async (item) => {
    if (!confirm(`¿Eliminar "${item.descripcion.slice(0, 60)}..."?`)) return;
    await supabase.from("homologacion_items").delete().eq("id", item.id);
    setItems(prev => prev.filter(i => i.id !== item.id));
    showToast("Eliminado", "info");
  };

  const openEdit = (item) => {
    setForm({
      numero: item.numero || "", categoria: item.categoria, descripcion: item.descripcion,
      estado: item.estado, aplica: item.aplica, responsable: item.responsable || "",
      drive_link: item.drive_link || "", drive_nombre: item.drive_nombre || "", notas: item.notas || "",
    });
    setEditando(item);
  };

  /* ── KPIs ── */
  const aplicables  = items.filter(i => i.aplica);
  const completados = aplicables.filter(i => i.estado === "Completado").length;
  const faltaFirma  = items.filter(i => i.estado === "Falta Firma").length;
  const pendientes  = aplicables.filter(i => i.estado === "Pendiente").length;
  const enRevision  = aplicables.filter(i => i.estado === "En Revisión").length;
  const noAplica    = items.filter(i => !i.aplica).length;
  const pct = aplicables.length ? Math.round((completados / aplicables.length) * 100) : 0;

  /* ── Category progress ── */
  const catProgress = CATEGORIAS.map(cat => {
    const ci = items.filter(i => i.categoria === cat && i.aplica);
    const cd = ci.filter(i => i.estado === "Completado").length;
    return { cat, total: ci.length, done: cd, pct: ci.length ? Math.round((cd / ci.length) * 100) : 0 };
  }).filter(c => c.total > 0);

  /* ── Filter ── */
  const responsables = [...new Set(items.map(i => i.responsable).filter(Boolean))];

  const filtered = useMemo(() => items.filter(i => {
    if (!i.aplica) return false;
    const q = search.toLowerCase();
    if (q && !i.descripcion?.toLowerCase().includes(q) && !(i.numero || "").toLowerCase().includes(q) && !(i.responsable || "").toLowerCase().includes(q)) return false;
    if (fCat    && i.categoria   !== fCat)    return false;
    if (fEstado && i.estado      !== fEstado) return false;
    if (fResp   && i.responsable !== fResp)   return false;
    return true;
  }), [items, search, fCat, fEstado, fResp]);

  const hasFilter = search || fCat || fEstado || fResp || fAplica;

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ClipboardCheck size={20} className="text-blue-400" />
            Homologación de Proveedores
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">Seguimiento del cuestionario SGS — estado de cumplimiento por categoría</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-200 transition-all">
            <RefreshCw size={13} /> Actualizar
          </button>
          <button onClick={() => { setForm(FORM_EMPTY); setEditando("new"); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-all">
            <Plus size={14} /> Nuevo ítem
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Completados",  value: completados, color: "text-green-400",  sub: `de ${aplicables.length} que aplican` },
          { label: "Pendientes",   value: pendientes,  color: "text-gray-400",   sub: "sin iniciar" },
          { label: "En Revisión",  value: enRevision,  color: "text-blue-400",   sub: "en proceso" },
          { label: "⚠ Falta Firma",value: faltaFirma,  color: faltaFirma > 0 ? "text-amber-400" : "text-gray-600", sub: "requieren firma" },
          { label: "No Aplica",    value: noAplica,    color: "text-gray-600",   sub: "excluidos" },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-gray-400 text-xs font-medium mt-0.5">{label}</div>
            <div className="text-gray-600 text-xs">{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Progreso general ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Progreso General de Homologación</p>
          <span className={`text-2xl font-black ${pct >= 80 ? "text-green-400" : pct >= 50 ? "text-blue-400" : "text-amber-400"}`}>{pct}%</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-3 mb-5">
          <div className="h-3 rounded-full bg-gradient-to-r from-blue-600 to-green-500 transition-all duration-500"
            style={{ width: `${pct}%` }} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
          {catProgress.map(({ cat, total, done, pct: cp }) => (
            <div key={cat} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-44 truncate flex-shrink-0">{cat}</span>
              <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full transition-all ${CAT_BAR[cat] || "bg-blue-500"}`}
                  style={{ width: `${cp}%` }} />
              </div>
              <span className="text-xs text-gray-600 font-mono w-14 text-right flex-shrink-0">{done}/{total}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Alerta Falta Firma ── */}
      {faltaFirma > 0 && (
        <div className="bg-amber-900/20 border border-amber-800/50 rounded-xl p-3 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-amber-300 font-semibold">
              {faltaFirma} documento{faltaFirma > 1 ? "s" : ""} con estado "Falta Firma"
            </p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              Estos documentos están listos pero pendientes de firma gerencial. Filtra por estado para verlos.
            </p>
          </div>
          <button onClick={() => setFEstado("Falta Firma")} className="ml-auto shrink-0 text-xs text-amber-400 hover:text-amber-200 border border-amber-800 hover:border-amber-600 px-2 py-1 rounded-lg transition-colors">
            Ver
          </button>
        </div>
      )}

      {/* ── Filtros ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por descripción, número o responsable..."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500 placeholder-gray-600" />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={fCat} onChange={e => setFCat(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none">
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={fEstado} onChange={e => setFEstado(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none">
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e}>{e}</option>)}
          </select>
          <select value={fResp} onChange={e => setFResp(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none">
            <option value="">Todos los responsables</option>
            {responsables.map(r => <option key={r}>{r}</option>)}
          </select>
          <select value={fAplica} onChange={e => setFAplica(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none">
            <option value="">Aplica y N/A</option>
            <option value="aplica">Solo aplica</option>
            <option value="na">Solo N/A</option>
          </select>
          {hasFilter && (
            <button onClick={() => { setSearch(""); setFCat(""); setFEstado(""); setFResp(""); setFAplica(""); }}
              className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1">
              <X size={12} /> Limpiar
            </button>
          )}
        </div>
        <p className="text-xs text-gray-600">{filtered.length} de {items.length} ítems</p>
      </div>

      {/* ── Tabla ── */}
      {loading ? (
        <div className="text-center py-16 text-gray-600 text-sm">Cargando homologación...</div>
      ) : items.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <ClipboardCheck size={32} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No hay ítems cargados</p>
          <p className="text-gray-700 text-xs mt-1 mb-4">Carga los ítems ejecutando el SQL provisto, o agrégalos uno a uno.</p>
          <button onClick={() => { setForm(FORM_EMPTY); setEditando("new"); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors">
            <Plus size={15} /> Agregar primer ítem
          </button>
        </div>
      ) : (
        <>
        {/* Vista móvil: tarjetas */}
        <div className="md:hidden space-y-2.5">
          {filtered.map(item => (
            <div key={item.id} className={`bg-gray-900 border border-gray-800 rounded-xl p-3.5 ${item.estado === "Falta Firma" ? "border-l-2 border-l-amber-600" : ""}`}>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <div className="font-semibold text-white text-sm leading-snug">{item.descripcion}</div>
                  <div className="text-xs text-gray-500 font-mono mt-0.5">{item.numero ? `N° ${item.numero}` : "Sin número"}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(item)} className="text-gray-500 hover:text-gray-200 p-1"><Pencil size={15} /></button>
                  {puedeEliminar() && (
                    <button onClick={() => del(item)} className="text-red-500/60 hover:text-red-400 p-1"><Trash2 size={15} /></button>
                  )}
                </div>
              </div>
              {item.notas && <div className="text-xs text-gray-600 italic mb-2">{item.notas}</div>}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${CAT_COLOR[item.categoria] || "bg-gray-800 text-gray-400 border-gray-700"}`}>
                  {item.categoria?.replace(" (ISO 9001)", "").replace(" (ISO 14001)", "")}
                </span>
                <select
                  value={item.estado}
                  disabled={updId === item.id || !item.aplica}
                  onChange={e => quickUpdate(item.id, { estado: e.target.value })}
                  className={`text-xs rounded-lg px-2 py-1 border focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${ESTADO_COLOR[item.estado] || "bg-gray-800 text-gray-400 border-gray-700"}`}>
                  {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <button
                  onClick={() => quickUpdate(item.id, { aplica: !item.aplica })}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                    item.aplica
                      ? "bg-green-900/30 text-green-400 border-green-800 hover:bg-green-900/50"
                      : "bg-gray-800 text-gray-600 border-gray-700 hover:bg-gray-700"}`}>
                  {item.aplica ? "✓ Aplica" : "N/A"}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 text-xs border-t border-gray-800 pt-2.5">
                <div className="truncate"><span className="text-gray-600">Responsable:</span> <span className="text-gray-400">{item.responsable || "—"}</span></div>
                <div className="truncate">
                  <span className="text-gray-600">Evidencia:</span>{" "}
                  {item.drive_link
                    ? <a href={item.drive_link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"><FolderOpen size={11} />{item.drive_nombre || "Abrir"}</a>
                    : <span className="text-gray-500">Sin enlace</span>}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center text-gray-600 text-sm py-8 bg-gray-900 border border-gray-800 rounded-xl">No hay ítems con los filtros aplicados</div>}
        </div>

        <div className="hidden md:block">
          <WideTableScroll maxH="max-h-[calc(100vh-200px)]">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-800">
                <tr>
                  {["#", "Categoría", "Descripción del Requisito", "Responsable", "Evidencia", "Estado", "Aplica", ""].map(h => (
                    <th key={h} className="text-left text-xs text-gray-600 font-medium px-3 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {filtered.map(item => (
                  <tr key={item.id}
                    className={`transition-colors hover:bg-gray-800/30 ${!item.aplica ? "opacity-40" : ""} ${item.estado === "Falta Firma" ? "border-l-2 border-amber-600" : ""}`}>

                    {/* Número */}
                    <td className="px-3 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{item.numero || "—"}</td>

                    {/* Categoría */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${CAT_COLOR[item.categoria] || "bg-gray-800 text-gray-400 border-gray-700"}`}>
                        {item.categoria?.replace(" (ISO 9001)", "").replace(" (ISO 14001)", "")}
                      </span>
                    </td>

                    {/* Descripción */}
                    <td className="px-3 py-3 max-w-xs">
                      <p className="text-gray-200 text-sm leading-snug line-clamp-2" title={item.descripcion}>{item.descripcion}</p>
                      {item.notas && <p className="text-gray-600 text-xs mt-0.5 italic truncate">{item.notas}</p>}
                    </td>

                    {/* Responsable */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      {item.responsable
                        ? <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">{item.responsable}</span>
                        : <span className="text-gray-700 text-xs">—</span>}
                    </td>

                    {/* Evidencia / Drive */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      {item.drive_link ? (
                        <a href={item.drive_link} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 border border-blue-900 hover:border-blue-700 px-2 py-1 rounded-lg transition-colors max-w-[120px] truncate">
                          <FolderOpen size={11} />
                          <span className="truncate">{item.drive_nombre || "Abrir"}</span>
                          <ExternalLink size={9} className="shrink-0" />
                        </a>
                      ) : (
                        <span className="text-gray-700 text-xs">Sin enlace</span>
                      )}
                    </td>

                    {/* Estado — dropdown rápido */}
                    <td className="px-3 py-3">
                      <select
                        value={item.estado}
                        disabled={updId === item.id || !item.aplica}
                        onChange={e => quickUpdate(item.id, { estado: e.target.value })}
                        className={`text-xs rounded-lg px-2 py-1 border focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${ESTADO_COLOR[item.estado] || "bg-gray-800 text-gray-400 border-gray-700"}`}>
                        {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </td>

                    {/* Aplica toggle */}
                    <td className="px-3 py-3">
                      <button
                        onClick={() => quickUpdate(item.id, { aplica: !item.aplica })}
                        className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                          item.aplica
                            ? "bg-green-900/30 text-green-400 border-green-800 hover:bg-green-900/50"
                            : "bg-gray-800 text-gray-600 border-gray-700 hover:bg-gray-700"}`}>
                        {item.aplica ? "✓ Aplica" : "N/A"}
                      </button>
                    </td>

                    {/* Acciones */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(item)}
                          className="p-1.5 text-gray-600 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors">
                          <Pencil size={13} />
                        </button>
                        {puedeEliminar() && (
                          <button onClick={() => del(item)}
                            className="p-1.5 text-gray-700 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-600 text-sm">
                    No hay ítems con los filtros aplicados
                  </td></tr>
                )}
              </tbody>
            </table>
          </WideTableScroll>
        </div>
        </>
      )}

      {/* ── Modal editar / nuevo ── */}
      {editando && (
        <Modal title={editando === "new" ? "Nuevo Ítem" : "Editar Ítem"} onClose={() => setEditando(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="N° de pregunta (opcional)">
                <Input value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} placeholder="35, 52, 1.1…" />
              </FormField>
              <FormField label="Categoría">
                <Select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                  {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                </Select>
              </FormField>
            </div>

            <FormField label="Descripción del requisito *">
              <textarea
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                rows={3}
                placeholder="Describe el requisito o documento solicitado..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500 placeholder-gray-600 resize-none"
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Estado">
                <Select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                  {ESTADOS.map(e => <option key={e}>{e}</option>)}
                </Select>
              </FormField>
              <FormField label="Responsable">
                <Input value={form.responsable} onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))} placeholder="Nombre del responsable" />
              </FormField>
            </div>

            <div className="flex items-center gap-3 px-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setForm(f => ({ ...f, aplica: !f.aplica }))}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${form.aplica ? "bg-green-600" : "bg-gray-700"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.aplica ? "left-5" : "left-0.5"}`} />
                </div>
                <span className="text-sm text-gray-400">{form.aplica ? "Aplica" : "No aplica (N/A)"}</span>
              </label>
            </div>

            <div className="border-t border-gray-800 pt-3 space-y-3">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Evidencia / Google Drive</p>
              <FormField label="Nombre de la carpeta o archivo">
                <Input value={form.drive_nombre} onChange={e => setForm(f => ({ ...f, drive_nombre: e.target.value }))} placeholder="Ej: SERCONSAC CUESTIONARIO 2026" />
              </FormField>
              <FormField label="Enlace de Google Drive">
                <Input value={form.drive_link} onChange={e => setForm(f => ({ ...f, drive_link: e.target.value }))} placeholder="https://drive.google.com/..." />
              </FormField>
            </div>

            <FormField label="Notas internas">
              <Input value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Observaciones, pendientes, comentarios..." />
            </FormField>

            <div className="flex gap-2 justify-end pt-2">
              <Btn onClick={() => setEditando(null)}>Cancelar</Btn>
              <Btn variant="primary" disabled={saving} onClick={save}>
                {saving ? "Guardando..." : editando === "new" ? "Agregar" : "Guardar cambios"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
