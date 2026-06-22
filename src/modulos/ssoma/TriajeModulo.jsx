import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { TRIAJE_CATS } from '../../constants/triaje.js';
import {
  Trash2, ClipboardList, Search, Phone, QrCode, FileDown, X,
} from 'lucide-react';

export default function TriajeModulo({ empresaId, empresa }) {
  const [triajes, setTriajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroCat, setFiltroCat] = useState("todas");
  const [filtroPeriodo, setFiltroPeriodo] = useState("todo");
  const [updatingEstado, setUpdatingEstado] = useState(null);

  useEffect(() => { load(); }, [empresaId]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("triajes").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false }).limit(1000);
    setTriajes(data || []);
    setLoading(false);
  };

  const updateEstadoAtencion = async (id, nuevoEstado) => {
    setUpdatingEstado(id);
    const { error } = await supabase.from("triajes").update({ estado_atencion: nuevoEstado }).eq("id", id);
    if (!error) setTriajes(prev => prev.map(t => t.id === id ? { ...t, estado_atencion: nuevoEstado } : t));
    else showToast("Error al actualizar estado", "error");
    setUpdatingEstado(null);
    if (selected?.id === id) setSelected(s => ({ ...s, estado_atencion: nuevoEstado }));
  };

  const triajUrl = `${window.location.origin}${window.location.pathname}?triaje=${empresaId}`;
  const copyUrl = () => {
    navigator.clipboard.writeText(triajUrl).catch(() => { const el = document.createElement("textarea"); el.value = triajUrl; document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el); });
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  const shareWhatsApp = (t) => {
    const msg = encodeURIComponent(t.reporte_texto || `Triaje SSOMA — ${t.nombre}`);
    window.open(`https://wa.me/51982762455?text=${msg}`, "_blank");
  };

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar el triaje de "${nombre}"? Esta acción no se puede deshacer.`)) return;
    const { error, count } = await supabase.from("triajes").delete({ count: "exact" }).eq("id", id).eq("empresa_id", empresaId);
    if (error) { showToast("Error al eliminar: " + error.message, "error"); return; }
    if (count === 0) { showToast("No se pudo eliminar. Verifica permisos en Supabase (política DELETE)", "error"); return; }
    showToast("Triaje eliminado", "info");
    setSelected(null);
    load();
  };

  const hoy = new Date().toISOString().slice(0, 10);
  const semana = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const mes = new Date().toISOString().slice(0, 7);

  const filtered = triajes.filter(t => {
    if (search && !t.nombre?.toLowerCase().includes(search.toLowerCase()) && !t.puesto?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filtroEstado === "emergencia" && !t.tiene_emergencia) return false;
    if (filtroEstado === "normal" && t.tiene_emergencia) return false;
    if (filtroEstado === "pendiente" && t.estado_atencion !== "Pendiente" && t.estado_atencion !== null && t.estado_atencion !== undefined) return false;
    if (filtroEstado === "atendido" && t.estado_atencion !== "Atendido") return false;
    if (filtroCat !== "todas" && !(t.categorias || []).includes(filtroCat)) return false;
    if (filtroPeriodo === "hoy" && !t.created_at?.startsWith(hoy)) return false;
    if (filtroPeriodo === "semana" && t.created_at < semana) return false;
    if (filtroPeriodo === "mes" && !t.created_at?.startsWith(mes)) return false;
    return true;
  });

  const emergencias = triajes.filter(t => t.tiene_emergencia).length;
  const hoyCount = triajes.filter(t => t.created_at?.startsWith(hoy)).length;
  const pendientes = triajes.filter(t => !t.estado_atencion || t.estado_atencion === "Pendiente").length;

  // Distribución por categoría
  const catCount = Object.keys(TRIAJE_CATS).map(k => ({
    key: k, label: TRIAJE_CATS[k]?.label?.split(" ")[0] ?? k, icon: TRIAJE_CATS[k]?.icon ?? "❓",
    count: triajes.filter(t => (t.categorias || []).includes(k)).length,
  })).filter(c => c.count > 0).sort((a, b) => b.count - a.count);

  const catColors = { accidente:"bg-orange-900/40 text-orange-300 border-orange-800", respiratorio:"bg-blue-900/40 text-blue-300 border-blue-800", digestivo:"bg-green-900/40 text-green-300 border-green-800", musculo:"bg-purple-900/40 text-purple-300 border-purple-800", cefalea:"bg-yellow-900/40 text-yellow-300 border-yellow-800", heridas:"bg-red-900/40 text-red-300 border-red-800", menstrual:"bg-pink-900/40 text-pink-300 border-pink-800" };
  const estadoStyle = { Pendiente:"bg-amber-900/40 text-amber-300 border-amber-800", "En atención":"bg-blue-900/40 text-blue-300 border-blue-800", Atendido:"bg-green-900/40 text-green-300 border-green-800" };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Triaje SSOMA</h2>
          <p className="text-gray-500 text-sm">Historial y gestión de reportes de salud del personal</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={copyUrl} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${copied ? "bg-green-600 text-white border-green-500" : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"}`}>
            <Phone size={13} /> {copied ? "¡Copiado!" : "Copiar link"}
          </button>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-200 transition-all">
            ↻ Actualizar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total triajes", value: triajes.length, color: "text-blue-400", sub: "registros" },
          { label: "Hoy", value: hoyCount, color: "text-emerald-400", sub: "nuevos" },
          { label: "🚨 Emergencias", value: emergencias, color: "text-red-400", sub: "casos críticos" },
          { label: "⏳ Pendientes", value: pendientes, color: "text-amber-400", sub: "sin atender" },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-gray-400 text-xs font-medium mt-0.5">{label}</div>
            <div className="text-gray-600 text-xs">{sub}</div>
          </div>
        ))}
      </div>

      {/* Distribución por categoría */}
      {catCount.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">Distribución por categoría</p>
          <div className="space-y-2">
            {catCount.map(({ key, label, icon, count }) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-sm w-5 text-center">{icon}</span>
                <span className="text-xs text-gray-400 w-28 truncate">{label}</span>
                <div className="flex-1 bg-gray-800 rounded-full h-2">
                  <div className="h-2 rounded-full bg-blue-600 transition-all" style={{ width: `${(count / triajes.length) * 100}%` }} />
                </div>
                <span className="text-xs text-gray-500 w-8 text-right font-mono">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Link público + QR */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <QrCode size={13} /> Acceso público — sin login requerido
        </p>
        <div className="flex gap-5 flex-wrap items-start">
          {/* QR code */}
          <div className="flex flex-col items-center gap-2">
            <div className="bg-white rounded-xl p-2">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(triajUrl)}&size=180x180&margin=6`}
                alt="QR Triaje"
                className="w-[140px] h-[140px]"
              />
            </div>
            <a
              href={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(triajUrl)}&size=400x400&margin=10`}
              download="qr_triaje.png"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300"
            >
              <FileDown size={11} /> Descargar QR
            </a>
          </div>
          {/* Link + instrucciones */}
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Link directo</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-xs text-blue-300 truncate">{triajUrl}</code>
                <button onClick={copyUrl} className={`px-3 py-2 rounded-lg text-xs font-medium shrink-0 transition-colors ${copied ? "bg-green-600 text-white" : "bg-blue-600 hover:bg-blue-500 text-white"}`}>
                  {copied ? "✓ Copiado" : "Copiar"}
                </button>
              </div>
            </div>
            <div className="bg-gray-800/60 rounded-lg px-3 py-2.5 text-xs text-gray-400 space-y-1">
              <p className="font-medium text-gray-300">Cómo usar:</p>
              <p>📱 <strong>Celular:</strong> escanea el QR con la cámara → abre el formulario directamente, sin contraseña.</p>
              <p>🖥️ <strong>PC:</strong> comparte el link con el personal para que reporten desde cualquier navegador.</p>
              <p>🖨️ <strong>Impreso:</strong> descarga el QR y colócalo en el tópico o mural de la empresa.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o puesto..." className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500 placeholder-gray-600" />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none">
            <option value="todo">Todo el tiempo</option>
            <option value="hoy">Hoy</option>
            <option value="semana">Últimos 7 días</option>
            <option value="mes">Este mes</option>
          </select>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none">
            <option value="todos">Todos los estados</option>
            <option value="emergencia">🚨 Solo emergencias</option>
            <option value="normal">✓ Solo normales</option>
            <option value="pendiente">⏳ Pendientes</option>
            <option value="atendido">✓ Atendidos</option>
          </select>
          <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none">
            <option value="todas">Todas las categorías</option>
            {Object.entries(TRIAJE_CATS).map(([k, c]) => <option key={k} value={k}>{c.icon} {c.label}</option>)}
          </select>
          {(search || filtroEstado !== "todos" || filtroCat !== "todas" || filtroPeriodo !== "todo") && (
            <button onClick={() => { setSearch(""); setFiltroEstado("todos"); setFiltroCat("todas"); setFiltroPeriodo("todo"); }} className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">✕ Limpiar</button>
          )}
        </div>
        <p className="text-xs text-gray-600">{filtered.length} de {triajes.length} registros</p>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-12 text-gray-600">Cargando triajes...</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-800 bg-gray-900/80">
                <tr>{["Fecha / Hora", "Trabajador", "DNI", "Categorías", "Signos Vitales", "Atención", "Urgencia", ""].map(h => (
                  <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {filtered.map(t => {
                  const ea = t.estado_atencion || "Pendiente";
                  return (
                    <tr key={t.id} className={`hover:bg-gray-800/30 transition-colors ${t.tiene_emergencia ? "border-l-2 border-red-600" : ""}`}>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">
                        {t.created_at ? new Date(t.created_at).toLocaleDateString("es-PE",{day:"2-digit",month:"2-digit"}) : "—"}<br/>
                        <span className="text-gray-700">{t.created_at ? new Date(t.created_at).toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"}) : ""}</span>
                      </td>
                      <td className="px-4 py-3 min-w-[140px]">
                        <div className="text-sm font-medium text-gray-200 leading-tight">{t.nombre}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{t.puesto || "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">{t.dni || "—"}</td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <div className="flex flex-wrap gap-1">
                          {(t.categorias || []).map(k => (
                            <span key={k} className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap ${catColors[k] || "bg-gray-800 text-gray-400 border-gray-700"}`}>
                              {TRIAJE_CATS[k]?.icon} {TRIAJE_CATS[k]?.label?.split(" ")[0] ?? k}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono whitespace-nowrap">
                        <div className="space-y-0.5">
                          {t.temperatura && <div className="text-gray-400">🌡 {t.temperatura}°C</div>}
                          {t.saturacion && <div className="text-blue-400">💧 {t.saturacion}%</div>}
                          {t.presion_arterial && <div className="text-gray-500">PA {t.presion_arterial}</div>}
                          {!t.temperatura && !t.saturacion && !t.presion_arterial && <span className="text-gray-700">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select value={ea} onChange={e => updateEstadoAtencion(t.id, e.target.value)} disabled={updatingEstado === t.id}
                          className={`text-xs rounded-lg px-2 py-1 border focus:outline-none cursor-pointer disabled:opacity-50 ${estadoStyle[ea] || "bg-gray-800 text-gray-400 border-gray-700"}`}>
                          <option value="Pendiente">⏳ Pendiente</option>
                          <option value="En atención">🔵 En atención</option>
                          <option value="Atendido">✓ Atendido</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {t.tiene_emergencia
                          ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/50 text-red-300 border border-red-800 font-bold whitespace-nowrap">🚨 Emergencia</span>
                          : <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/30 text-green-500 border border-green-900 whitespace-nowrap">✓ Normal</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setSelected(t)} className="text-xs text-blue-400 hover:text-blue-300 border border-blue-900 hover:border-blue-700 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap">Ver detalle</button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(t.id, t.nombre); }} className="text-red-500/40 hover:text-red-400 transition-colors p-1" title="Eliminar"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-600 text-sm">
                    {triajes.length === 0 ? "Aún no hay triajes registrados" : "No hay registros con los filtros aplicados"}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal detalle mejorado */}
      {selected && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header modal */}
            <div className={`px-6 py-4 border-b border-gray-800 flex justify-between items-start ${selected.tiene_emergencia ? "bg-red-950/40" : ""}`}>
              <div>
                {selected.tiene_emergencia && <div className="text-red-400 text-xs font-bold mb-1">🚨 EMERGENCIA DETECTADA</div>}
                <h3 className="font-bold text-white text-base">{selected.nombre}</h3>
                <p className="text-gray-500 text-sm">
                  {selected.puesto || "Sin puesto"}
                  {selected.dni && <span className="ml-2 font-mono text-gray-600">DNI {selected.dni}</span>}
                  {" · "}{new Date(selected.created_at).toLocaleString("es-PE", { dateStyle:"medium", timeStyle:"short" })}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-600 hover:text-gray-300 p-1"><X size={18} /></button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Banderas rojas */}
              {selected.tiene_emergencia && (selected.banderas_rojas || []).length > 0 && (
                <div className="bg-red-900/30 border border-red-800 rounded-xl p-3 space-y-1">
                  <p className="text-xs text-red-400 font-bold uppercase tracking-wide mb-2">Banderas rojas activadas</p>
                  {selected.banderas_rojas.map(f => <p key={f} className="text-sm text-red-200">⚠ {f}</p>)}
                </div>
              )}

              {/* Estado de atención */}
              <div className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                <span className="text-sm text-gray-400">Estado de atención</span>
                <select value={selected.estado_atencion || "Pendiente"} onChange={e => updateEstadoAtencion(selected.id, e.target.value)}
                  className={`text-sm rounded-lg px-3 py-1.5 border focus:outline-none cursor-pointer font-medium ${estadoStyle[selected.estado_atencion || "Pendiente"] || "bg-gray-700 text-gray-300 border-gray-600"}`}>
                  <option value="Pendiente">⏳ Pendiente</option>
                  <option value="En atención">🔵 En atención</option>
                  <option value="Atendido">✓ Atendido</option>
                </select>
              </div>

              {/* Signos vitales */}
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Signos Vitales</p>
                <div className="grid grid-cols-2 gap-2">
                  {[["🌡 Temperatura", selected.temperatura ? `${selected.temperatura} °C` : null],
                    ["💉 P. Arterial", selected.presion_arterial],
                    ["💧 Saturación O₂", selected.saturacion ? `${selected.saturacion} %` : null],
                    ["❤️ Frec. Cardíaca", selected.frecuencia_cardiaca ? `${selected.frecuencia_cardiaca} lpm` : null],
                    ["💊 Alergias", selected.alergias && selected.alergias !== "No" ? selected.alergias : null],
                  ].filter(([, v]) => v).map(([l, v]) => (
                    <div key={l} className="bg-gray-800 rounded-xl p-3">
                      <p className="text-xs text-gray-600">{l}</p>
                      <p className="text-sm text-gray-200 font-medium mt-0.5">{v}</p>
                    </div>
                  ))}
                  {!selected.temperatura && !selected.presion_arterial && !selected.saturacion && !selected.frecuencia_cardiaca && (
                    <div className="col-span-2 text-xs text-gray-600 py-2">No se registraron signos vitales</div>
                  )}
                </div>
              </div>

              {/* Categorías y detalles */}
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Categorías y detalles</p>
                <div className="space-y-3">
                  {(selected.categorias || []).map(k => {
                    const cat = TRIAJE_CATS[k];
                    const detalles = cat?.questions?.map(q => ({ label: q.label, val: selected.detalles_categoria?.[q.key] })).filter(d => d.val) || [];
                    return (
                      <div key={k} className={`rounded-xl p-3 border ${catColors[k] || "bg-gray-800 border-gray-700"}`}>
                        <p className="font-bold text-sm mb-2">{cat?.icon} {cat?.label}</p>
                        {detalles.length > 0
                          ? detalles.map(({ label, val }) => <p key={label} className="text-xs opacity-80">• <span className="font-medium">{label}:</span> {val}</p>)
                          : <p className="text-xs opacity-60">Sin detalles registrados</p>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reporte copiable */}
              {selected.reporte_texto && (
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Reporte generado</p>
                  <div className="bg-gray-950 border border-gray-800 rounded-xl p-3">
                    <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap leading-relaxed select-text">{selected.reporte_texto}</pre>
                  </div>
                </div>
              )}
            </div>

            {/* Footer acciones */}
            <div className="px-6 py-4 border-t border-gray-800 flex gap-2 flex-wrap">
              <button onClick={() => { navigator.clipboard?.writeText(selected.reporte_texto || ""); showToast("Reporte copiado", "success"); }}
                className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                <ClipboardList size={14} /> Copiar texto
              </button>
              <button onClick={() => shareWhatsApp(selected)}
                className="flex-1 py-2.5 bg-green-700 hover:bg-green-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                <Phone size={14} /> Enviar WhatsApp
              </button>
              <button onClick={() => handleDelete(selected.id, selected.nombre)}
                className="py-2.5 px-4 bg-red-900/40 hover:bg-red-900/70 text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
