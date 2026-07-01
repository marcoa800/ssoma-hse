import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase.js';
import {
  Building2, LogIn, AlertTriangle, ClipboardList, FileText, Plus, Camera,
  CheckCircle, Clock, Upload, X, ArrowLeft, ShieldCheck, LayoutDashboard, ListChecks
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RTooltip } from 'recharts';
import { BloqueFirmas } from '../../components/FirmaDigital.jsx';
import { ScoreBadge, scoringTareas, TAREA_COLOR } from '../../components/ScoreBadge.jsx';

const BUCKET = "contratistas-docs";
const TABS = [
  { id: "resumen",    label: "Resumen",      icon: LayoutDashboard },
  { id: "tareas",     label: "Tareas",       icon: ListChecks },
  { id: "hallazgo",   label: "Hallazgos",    icon: AlertTriangle },
  { id: "inspeccion", label: "Inspecciones", icon: ClipboardList },
  { id: "documento",  label: "Documentos",   icon: FileText },
];
const ESTADOS = ["Abierto", "En proceso", "Cerrado"];
const CATEGORIAS = {
  hallazgo: ["Acto inseguro", "Condición insegura", "Buena práctica", "Otro"],
  inspeccion: ["EPP", "Trabajo en altura", "Orden y limpieza", "Eléctrica", "Equipos/Herramientas", "Vehículos/Maquinaria", "Extintores", "Otro"],
  documento: ["Plan SST", "Certificado/Acreditación", "SCTR/Pólizas", "Procedimiento (PETS)", "IPERC", "Reporte mensual", "Capacitación/Inducción", "Otro"],
};
const ESTADO_COLOR = { Abierto: "text-red-400 bg-red-900/30 border-red-900/50", "En proceso": "text-amber-400 bg-amber-900/30 border-amber-900/50", Cerrado: "text-emerald-400 bg-emerald-900/30 border-emerald-900/50" };

async function subirArchivo(contratistaId, file) {
  const ext = (file.name.split(".").pop() || "dat").toLowerCase();
  const path = `${contratistaId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export default function PublicContratista({ empresaId }) {
  const [contratista, setContratista] = useState(null);
  const [ruc, setRuc] = useState("");
  const [codigo, setCodigo] = useState("");
  const [err, setErr] = useState("");
  const [entrando, setEntrando] = useState(false);

  const [tab, setTab] = useState("resumen");
  const [registros, setRegistros] = useState([]);
  const [resumen, setResumen] = useState([]); // todos los registros (para el dashboard)
  const [tareas, setTareas] = useState([]);   // tareas asignadas por SSOMA
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const login = async () => {
    if (!ruc.trim() || !codigo.trim()) { setErr("Ingresa tu RUC y tu código de acceso."); return; }
    setEntrando(true); setErr("");
    const { data, error } = await supabase.rpc("login_contratista", { p_empresa: empresaId, p_ruc: ruc.trim(), p_codigo: codigo.trim() });
    setEntrando(false);
    if (error) { setErr("Error de conexión. Intenta de nuevo."); return; }
    if (!data || !data.length) { setErr("RUC o código incorrecto. Verifica con el área SSOMA."); return; }
    setContratista(data[0]);
  };

  const cargar = useCallback(async () => {
    if (!contratista || tab === "resumen") { setRegistros([]); return; }
    setLoading(true);
    const { data } = await supabase.from("contratista_registros").select("*")
      .eq("contratista_id", contratista.id).eq("tipo", tab).order("created_at", { ascending: false });
    setRegistros(data || []);
    setLoading(false);
  }, [contratista, tab]);
  useEffect(() => { cargar(); }, [cargar]);

  // Resumen global (todos los tipos) para el dashboard del contratista
  const cargarResumen = useCallback(async () => {
    if (!contratista) return;
    const { data } = await supabase.from("contratista_registros")
      .select("id,tipo,titulo,descripcion,foto_urls,archivo_url,fecha,revision")
      .eq("contratista_id", contratista.id).order("created_at", { ascending: false });
    setResumen(data || []);
  }, [contratista]);
  useEffect(() => { cargarResumen(); }, [cargarResumen]);

  const cargarTareas = useCallback(async () => {
    if (!contratista) return;
    const { data } = await supabase.from("contratista_tareas").select("*")
      .eq("contratista_id", contratista.id).order("fecha_limite", { ascending: true });
    setTareas(data || []);
  }, [contratista]);
  useEffect(() => { cargarTareas(); }, [cargarTareas]);

  const recargar = () => { cargar(); cargarResumen(); cargarTareas(); };
  const tareasPend = tareas.filter(t => t.estado === "Pendiente" || t.estado === "Rechazada").length;

  // Conteos para el dashboard
  const rev = (s) => resumen.filter(r => (r.revision || "Pendiente") === s).length;
  const stats = { total: resumen.length, pendiente: rev("Pendiente"), aprobado: rev("Aprobado"), corregir: rev("Observado") + rev("Rechazado") };

  // ── Pantalla de acceso ──
  if (!contratista) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center mb-3"><Building2 size={22} /></div>
            <h1 className="font-semibold text-lg">Portal de Contratistas</h1>
            <p className="text-gray-500 text-xs mt-1">Ingresa con el RUC de tu empresa y el código que te entregó el área SSOMA.</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            {err && <div className="px-3 py-2 rounded-lg bg-red-900/30 border border-red-900 text-red-400 text-xs">{err}</div>}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">RUC</label>
              <input value={ruc} onChange={e => setRuc(e.target.value)} inputMode="numeric" placeholder="20XXXXXXXXX"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Código de acceso</label>
              <input value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="••••••" onKeyDown={e => e.key === "Enter" && login()}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
            </div>
            <button onClick={login} disabled={entrando}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors">
              <LogIn size={15} /> {entrando ? "Verificando…" : "Ingresar"}
            </button>
          </div>
          <p className="text-center text-gray-700 text-xs mt-4 flex items-center justify-center gap-1.5"><ShieldCheck size={12} /> CTG Latam · Medicloud Safety</p>
        </div>
      </div>
    );
  }

  // ── Portal ──
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center shrink-0"><Building2 size={16} /></div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{contratista.nombre}</div>
          <div className="text-[11px] text-gray-600">Portal de contratistas</div>
        </div>
        <ScoreBadge tareas={tareas} />
        <button onClick={() => { setContratista(null); setRuc(""); setCodigo(""); }} className="text-xs text-gray-500 hover:text-gray-300">Salir</button>
      </header>

      <div className="max-w-4xl mx-auto p-4">
        {stats.corregir > 0 && tab !== "resumen" && (
          <div className="mb-4 bg-amber-900/20 border border-amber-900/50 rounded-xl px-3 py-2 text-xs text-amber-300 flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" /> Tienes {stats.corregir} {stats.corregir === 1 ? "ítem observado/rechazado" : "ítems observados/rechazados"} que debes corregir y volver a enviar.
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-4">
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setShowForm(false); }}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg transition-all font-medium ${tab === t.id ? "bg-purple-600 text-white" : "text-gray-500 hover:text-gray-300"}`}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {tab === "resumen" ? (
          <ResumenContratista contratista={contratista} resumen={resumen} stats={stats} tareas={tareas} />
        ) : tab === "tareas" ? (
          <TareasContratista tareas={tareas} onUpdated={recargar} />
        ) : (
          <>
            {!showForm && (
              <button onClick={() => setShowForm(true)}
                className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm font-medium py-2.5 rounded-xl mb-4 transition-colors">
                <Plus size={15} /> {tab === "documento" ? "Subir documento" : tab === "inspeccion" ? "Nueva inspección" : "Nuevo hallazgo"}
              </button>
            )}

            {showForm && (
              <NuevoRegistro tipo={tab} empresaId={empresaId} contratista={contratista} tareas={tareas}
                onCancel={() => setShowForm(false)} onSaved={() => { setShowForm(false); recargar(); }} />
            )}

            {loading ? (
              <p className="text-gray-600 text-sm text-center py-8">Cargando…</p>
            ) : registros.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-8">Aún no has registrado {TABS.find(t => t.id === tab).label.toLowerCase()}.</p>
            ) : (
              <div className="space-y-3">
                {registros.map(r => <RegistroCard key={r.id} r={r} onUpdated={recargar} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Panorama del contratista: datos (izq) + gráficos (der) + números ──
const DOC_LABELS = [
  ["sctr_empresa_venc", "SCTR Pensión + Salud", "sctr_aplica"],
  ["poliza_rc_venc", "Póliza Resp. Civil", "poliza_rc_aplica"],
  ["poliza_vida_venc", "Póliza de Vida", "poliza_vida_aplica"],
  ["plan_sst_venc", "Plan de SST", "plan_sst_aplica"],
  ["iper_venc", "IPERC", "iper_aplica"],
];
function docEstado(f) {
  if (!f) return { txt: "Sin fecha", cls: "text-gray-500", dot: "bg-gray-600" };
  const d = Math.floor((new Date(f) - new Date()) / 86400000);
  if (d < 0) return { txt: "Vencido", cls: "text-red-400", dot: "bg-red-500" };
  if (d <= 30) return { txt: `Vence en ${d}d`, cls: "text-amber-400", dot: "bg-amber-400" };
  return { txt: "Vigente", cls: "text-green-400", dot: "bg-green-500" };
}
function ResumenContratista({ contratista: c, resumen, stats }) {
  const REV_ORDER = ["Pendiente", "Aprobado", "Observado", "Rechazado"];
  const REV_COL = { Pendiente: "#9ca3af", Aprobado: "#22c55e", Observado: "#f59e0b", Rechazado: "#ef4444" };
  const revData = REV_ORDER.map(k => ({ name: k, value: resumen.filter(r => (r.revision || "Pendiente") === k).length })).filter(d => d.value > 0);
  const TIPO_LBL = { hallazgo: "Hallazgos", inspeccion: "Inspecciones", documento: "Documentos" };
  const tipoData = ["hallazgo", "inspeccion", "documento"].map(t => ({ name: TIPO_LBL[t], value: resumen.filter(r => r.tipo === t).length }));
  const statCards = [
    { lbl: "Subidos", val: stats.total, cls: "text-gray-100" },
    { lbl: "Pendientes", val: stats.pendiente, cls: "text-gray-300" },
    { lbl: "Aprobados", val: stats.aprobado, cls: "text-green-400" },
    { lbl: "Por corregir", val: stats.corregir, cls: "text-amber-400" },
  ];
  return (
    <div className="space-y-4">
      {/* Números juntos (panorama) */}
      <div className="grid grid-cols-4 gap-2">
        {statCards.map(s => (
          <div key={s.lbl} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <div className={`text-2xl font-bold leading-none ${s.cls}`}>{s.val}</div>
            <div className="text-[10px] text-gray-500 mt-1">{s.lbl}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Izquierda: datos del contratista */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-lg bg-purple-600 flex items-center justify-center shrink-0"><Building2 size={16} /></div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">{c.nombre}</div>
              {c.ruc && <div className="text-[11px] text-gray-500 font-mono">RUC {c.ruc}</div>}
            </div>
          </div>
          <div className="space-y-1.5 text-xs">
            {c.rubro && <Dato lbl="Rubro" val={c.rubro} />}
            {c.representante && <Dato lbl="Representante" val={c.representante} />}
            {c.telefono && <Dato lbl="Teléfono" val={c.telefono} />}
            {c.email && <Dato lbl="Email" val={c.email} />}
            {c.estado && <Dato lbl="Estado" val={c.estado} />}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-800">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Documentos de empresa</div>
            <div className="space-y-1.5">
              {DOC_LABELS.map(([k, lbl, ak]) => {
                const noAplica = c[ak] === false;
                const e = noAplica ? { txt: "No aplica", cls: "text-gray-600", dot: "bg-gray-700" } : docEstado(c[k]);
                return (
                  <div key={k} className={`flex items-center gap-2 text-xs ${noAplica ? "opacity-60" : ""}`}>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${e.dot}`} />
                    <span className="text-gray-400 flex-1 min-w-0 truncate">{lbl}</span>
                    <span className={`shrink-0 ${e.cls}`}>{e.txt}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Derecha: gráficos */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
          <div>
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Estado de revisión</div>
            {revData.length === 0 ? (
              <p className="text-gray-600 text-xs py-6 text-center">Aún no has subido registros.</p>
            ) : (
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={revData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2}>
                    {revData.map((d, i) => <Cell key={i} fill={REV_COL[d.name]} />)}
                  </Pie>
                  <RTooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1">
              {REV_ORDER.map(k => <span key={k} className="flex items-center gap-1 text-[10px] text-gray-400"><span className="w-2 h-2 rounded-full" style={{ background: REV_COL[k] }} />{k}</span>)}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Registros por tipo</div>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={tipoData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={{ stroke: "#374151" }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={{ stroke: "#374151" }} tickLine={false} />
                <RTooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "rgba(139,92,246,0.1)" }} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
function Dato({ lbl, val }) {
  return <div className="flex gap-2"><span className="text-gray-600 shrink-0">{lbl}:</span><span className="text-gray-300 min-w-0 break-words">{val}</span></div>;
}

// ── Buzón de tareas del contratista ──
const REL_LBL_PUB = { hallazgo: "Hallazgo", inspeccion: "Inspección", documento: "Documento" };
function TareasContratista({ tareas, onUpdated }) {
  if (!tareas.length) return <p className="text-gray-600 text-sm text-center py-10">SSOMA aún no te ha asignado tareas.</p>;
  const grupos = [
    ["Por hacer", tareas.filter(t => t.estado === "Pendiente" || t.estado === "Rechazada")],
    ["En revisión", tareas.filter(t => t.estado === "En revisión")],
    ["Cerradas", tareas.filter(t => t.estado === "Cerrada")],
  ];
  return (
    <div className="space-y-5">
      {grupos.filter(([, items]) => items.length).map(([titulo, items]) => (
        <div key={titulo}>
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">{titulo} ({items.length})</div>
          <div className="space-y-3">{items.map(t => <TareaCard key={t.id} t={t} onUpdated={onUpdated} />)}</div>
        </div>
      ))}
    </div>
  );
}
function TareaCard({ t, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [nota, setNota] = useState("");
  const [saving, setSaving] = useState(false);
  const accionable = t.estado === "Pendiente" || t.estado === "Rechazada";
  const hoy = new Date().toISOString().slice(0, 10);
  const vencida = t.fecha_limite && accionable && t.fecha_limite < hoy;
  const resolver = async () => {
    if (!file && !(t.evidencia_urls || []).length) { alert("Adjunta una evidencia (foto o documento)."); return; }
    setSaving(true);
    try {
      let urls = t.evidencia_urls || [];
      if (file) { const url = await subirArchivo(t.contratista_id, file); urls = [...urls, url]; }
      const { error } = await supabase.from("contratista_tareas").update({
        estado: "En revisión", evidencia_urls: urls, evidencia_nota: nota || t.evidencia_nota || null,
        resuelto_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq("id", t.id);
      if (error) throw error;
      setOpen(false); setFile(null); onUpdated();
    } catch (e) { alert("Error: " + (e?.message || e)); }
    setSaving(false);
  };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-gray-200">{t.titulo}</div>
          {t.descripcion && <div className="text-xs text-gray-500 mt-0.5">{t.descripcion}</div>}
          <div className="text-[11px] mt-1 flex items-center gap-2 flex-wrap">
            <span className={`font-mono ${vencida ? "text-red-400" : "text-gray-600"}`}>{t.fecha_limite ? "Límite: " + t.fecha_limite : "Sin fecha"}{vencida ? " · vencida" : ""}</span>
            {t.tipo === "periodica" && <span className="text-gray-600">· {t.ocurrencia}/{t.total} ({t.frecuencia})</span>}
            {t.tipo_relacion && <span className="px-1.5 py-0.5 rounded bg-purple-900/30 border border-purple-900/50 text-purple-300">🔗 {REL_LBL_PUB[t.tipo_relacion]}</span>}
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${TAREA_COLOR[t.estado]}`}>{t.estado}</span>
      </div>
      {(t.evidencia_urls || []).length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {t.evidencia_urls.map((u, i) => <a key={i} href={u} target="_blank" rel="noreferrer" className="text-xs text-purple-400 underline flex items-center gap-1"><FileText size={12} /> Evidencia {i + 1}</a>)}
        </div>
      )}
      {t.estado === "Rechazada" && t.revision_obs && (
        <div className="mt-2 bg-red-900/15 border border-red-900/40 rounded-lg p-2.5 text-xs text-red-300"><AlertTriangle size={12} className="inline mr-1" /> Rechazada{t.revisado_por ? ` por ${t.revisado_por}` : ""}: {t.revision_obs}</div>
      )}
      {t.estado === "En revisión" && <p className="text-[11px] text-blue-400 mt-2">Enviada a SSOMA. Esperando revisión.</p>}
      {t.estado === "Cerrada" && <p className="text-[11px] text-green-400 mt-2">Aprobada por SSOMA.{t.revisado_por ? ` (${t.revisado_por})` : ""}</p>}
      {accionable && t.tipo_relacion && (
        <div className="mt-2 text-[11px] text-purple-300 bg-purple-900/15 border border-purple-900/40 rounded-lg p-2.5 flex items-start gap-1.5">
          <Upload size={12} className="shrink-0 mt-0.5" /> Opcional: crea el/la {REL_LBL_PUB[t.tipo_relacion].toLowerCase()} en la pestaña <b className="text-purple-200">{REL_LBL_PUB[t.tipo_relacion]}s</b> y selecciona esta tarea. O sube la evidencia directamente aquí abajo.
        </div>
      )}
      {accionable && !open && (
        <button onClick={() => setOpen(true)} className="mt-2 text-xs text-purple-300 hover:text-purple-200 flex items-center gap-1"><Upload size={12} /> {t.estado === "Rechazada" ? "Corregir y reenviar" : "Subir evidencia y resolver"}</button>
      )}
      {accionable && open && (
        <div className="mt-3 space-y-2 border-t border-gray-800 pt-3">
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-700 text-gray-300 text-xs cursor-pointer hover:border-purple-500">
            <Camera size={13} /> {file ? "1 archivo seleccionado" : "Adjuntar foto o documento"}
            <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
          </label>
          <textarea rows={2} value={nota} onChange={e => setNota(e.target.value)} placeholder="Nota (opcional)" className={inp + " resize-none"} />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setOpen(false); setFile(null); }} className="px-3 py-1.5 text-xs text-gray-400">Cancelar</button>
            <button onClick={resolver} disabled={saving} className="flex items-center gap-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"><CheckCircle size={12} /> {saving ? "Enviando…" : "Marcar como resuelto"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Formulario de nuevo registro ──
function NuevoRegistro({ tipo, empresaId, contratista, tareas = [], onCancel, onSaved }) {
  const [form, setForm] = useState({ titulo: "", descripcion: "", lugar: "", categoria: "", fecha: new Date().toISOString().split("T")[0], reportante: "" });
  const [files, setFiles] = useState([]);
  const [firmas, setFirmas] = useState({});
  const [tareaSel, setTareaSel] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const esDoc = tipo === "documento";
  // Tareas asignadas de este tipo que este registro puede resolver
  const tareasRel = (tareas || []).filter(t => t.tipo_relacion === tipo && (t.estado === "Pendiente" || t.estado === "Rechazada"));

  const guardar = async () => {
    if (esDoc && (!form.titulo.trim() || !files.length)) { setErr("Indica un nombre y adjunta el archivo."); return; }
    if (!esDoc && !form.descripcion.trim()) { setErr("La descripción es obligatoria."); return; }
    setSaving(true); setErr("");
    try {
      let foto_urls = [], archivo_url = null;
      for (const f of files) {
        const url = await subirArchivo(contratista.id, f);
        if (esDoc) { archivo_url = url; break; } else foto_urls.push(url);
      }
      const payload = {
        empresa_id: empresaId, contratista_id: contratista.id, tipo,
        titulo: form.titulo || null, descripcion: form.descripcion || null,
        lugar: form.lugar || null, categoria: form.categoria || null, fecha: form.fecha || null,
        reportante: form.reportante || null, foto_urls, archivo_url, estado: esDoc ? "Cerrado" : "Abierto",
        firmas,
      };
      const { data: nuevo, error } = await supabase.from("contratista_registros").insert(payload).select("id").single();
      if (error) throw error;
      // Si este registro resuelve una tarea asignada, vincularla y pasarla a revisión
      if (tareaSel && nuevo?.id) {
        const evid = esDoc ? (archivo_url ? [archivo_url] : []) : foto_urls;
        await supabase.from("contratista_tareas").update({
          estado: "En revisión", registro_id: nuevo.id, evidencia_urls: evid,
          evidencia_nota: form.titulo || form.descripcion || null,
          resuelto_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }).eq("id", tareaSel);
      }
      onSaved();
    } catch (e) { setErr("Error al guardar: " + (e?.message || e)); }
    setSaving(false);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{esDoc ? "Subir documento" : tipo === "inspeccion" ? "Nueva inspección" : "Nuevo hallazgo"}</span>
        <button onClick={onCancel} className="text-gray-600 hover:text-gray-300"><X size={16} /></button>
      </div>
      {err && <div className="px-3 py-2 rounded-lg bg-red-900/30 border border-red-900 text-red-400 text-xs">{err}</div>}

      {tareasRel.length > 0 && (
        <Field label="¿Corresponde a una tarea asignada? (opcional)">
          <select value={tareaSel} onChange={e => setTareaSel(e.target.value)} className={inp}>
            <option value="">No / ninguna</option>
            {tareasRel.map(t => <option key={t.id} value={t.id}>{t.titulo}{t.fecha_limite ? ` · vence ${t.fecha_limite}` : ""}{t.tipo === "periodica" ? ` (${t.ocurrencia}/${t.total})` : ""}</option>)}
          </select>
        </Field>
      )}

      {esDoc ? (
        <Field label="Nombre del documento *"><input value={form.titulo} onChange={e => set("titulo", e.target.value)} className={inp} placeholder="Ej: Plan SST 2026" /></Field>
      ) : (
        <>
          <Field label={tipo === "inspeccion" ? "Área / título" : "Lugar"}><input value={tipo === "inspeccion" ? form.titulo : form.lugar} onChange={e => set(tipo === "inspeccion" ? "titulo" : "lugar", e.target.value)} className={inp} /></Field>
          <Field label="Descripción *"><textarea rows={3} value={form.descripcion} onChange={e => set("descripcion", e.target.value)} className={inp + " resize-none"} /></Field>
        </>
      )}
      <Field label={tipo === "documento" ? "Categoría del documento" : tipo === "inspeccion" ? "Tipo de inspección" : "Clasificación"}>
        <select value={form.categoria} onChange={e => set("categoria", e.target.value)} className={inp}>
          <option value="">— Seleccionar —</option>
          {(CATEGORIAS[tipo] || []).map(c => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha"><input type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)} className={inp} /></Field>
        <Field label="Tu nombre"><input value={form.reportante} onChange={e => set("reportante", e.target.value)} className={inp} /></Field>
      </div>

      <Field label={esDoc ? "Archivo *" : "Fotos (evidencia)"}>
        <label className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-gray-700 text-gray-400 text-sm cursor-pointer hover:border-purple-500">
          {esDoc ? <Upload size={15} /> : <Camera size={15} />} {files.length ? `${files.length} archivo(s)` : (esDoc ? "Elegir archivo" : "Tomar/elegir foto")}
          <input type="file" className="hidden" accept={esDoc ? undefined : "image/*"} capture={esDoc ? undefined : "environment"} multiple={!esDoc}
            onChange={e => setFiles([...e.target.files])} />
        </label>
      </Field>

      <BloqueFirmas roles={[{ rol: "Firma del responsable (contratista)" }]} value={firmas} onChange={setFirmas} titulo="Firma" />

      <div className="flex gap-2 justify-end pt-1">
        <button onClick={onCancel} className="px-3 py-2 text-sm text-gray-400 hover:text-white">Cancelar</button>
        <button onClick={guardar} disabled={saving} className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg">
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

// ── Tarjeta de registro + actualización de estado ──
const REV_BADGE = { Pendiente: "bg-gray-800 border-gray-700 text-gray-400", Aprobado: "bg-green-900/30 border-green-800 text-green-400", Observado: "bg-amber-900/30 border-amber-800 text-amber-400", Rechazado: "bg-red-900/30 border-red-800 text-red-400" };
function RegistroCard({ r, onUpdated }) {
  const [editEstado, setEditEstado] = useState(false);
  const [estado, setEstado] = useState(r.estado || "Abierto");
  const [medida, setMedida] = useState(r.medida_correctiva || "");
  const [cierreFile, setCierreFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [reenv, setReenv] = useState(false);          // modo "corregir y volver a enviar"
  const [nuevoFile, setNuevoFile] = useState(null);
  const revis = r.revision || "Pendiente";

  const reenviar = async () => {
    setSaving(true);
    try {
      let archivo_url = r.archivo_url || null;
      let foto_urls = r.foto_urls || [];
      if (nuevoFile) {
        const url = await subirArchivo(r.contratista_id, nuevoFile);
        if (r.tipo === "documento") archivo_url = url; else foto_urls = [...foto_urls, url];
      }
      const { error } = await supabase.from("contratista_registros").update({
        archivo_url, foto_urls, revision: "Pendiente", updated_at: new Date().toISOString(),
      }).eq("id", r.id);
      if (error) throw error;
      setReenv(false); setNuevoFile(null); onUpdated();
    } catch (e) { alert("Error: " + (e?.message || e)); }
    setSaving(false);
  };

  const guardar = async () => {
    setSaving(true);
    try {
      let foto_cierre_url = r.foto_cierre_url || null;
      if (cierreFile) foto_cierre_url = await subirArchivo(r.contratista_id, cierreFile);
      const { error } = await supabase.from("contratista_registros").update({
        estado, medida_correctiva: medida || null, foto_cierre_url,
        fecha_cierre: estado === "Cerrado" ? new Date().toISOString().split("T")[0] : null,
        updated_at: new Date().toISOString(),
      }).eq("id", r.id);
      if (error) throw error;
      setEditEstado(false); onUpdated();
    } catch (e) { alert("Error: " + (e?.message || e)); }
    setSaving(false);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3.5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-gray-200 truncate">{r.titulo || r.descripcion || "—"}</div>
          {r.descripcion && r.titulo && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.descripcion}</div>}
          <div className="text-[11px] text-gray-600 mt-1 font-mono">{r.fecha || ""}{r.lugar ? " · " + r.lugar : ""}{r.categoria ? " · " + r.categoria : ""}</div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${REV_BADGE[revis]}`} title="Revisión del cliente">{revis}</span>
          {r.tipo !== "documento" && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${ESTADO_COLOR[r.estado] || ESTADO_COLOR.Abierto}`}>{r.estado}</span>
          )}
        </div>
      </div>

      {/* Observación del cliente cuando está observado/rechazado */}
      {(revis === "Observado" || revis === "Rechazado") && (
        <div className="mt-2 bg-amber-900/15 border border-amber-900/40 rounded-lg p-2.5">
          <div className="text-[11px] font-semibold text-amber-300 flex items-center gap-1"><AlertTriangle size={12} /> {revis === "Rechazado" ? "Rechazado por el cliente" : "Observado por el cliente"}{r.revisado_por ? ` · ${r.revisado_por}` : ""}</div>
          {r.revision_obs && <p className="text-xs text-amber-200/90 mt-1">{r.revision_obs}</p>}
          {!reenv && (
            <button onClick={() => setReenv(true)} className="mt-2 text-xs text-purple-300 hover:text-purple-200 flex items-center gap-1"><Plus size={12} /> Corregir y volver a enviar</button>
          )}
          {reenv && (
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-600 text-gray-300 text-xs cursor-pointer hover:border-purple-500">
                <Camera size={13} /> {nuevoFile ? "1 archivo seleccionado" : (r.tipo === "documento" ? "Subir documento corregido" : "Subir nueva foto/evidencia")}
                <input type="file" className="hidden" accept={r.tipo === "documento" ? "*/*" : "image/*"} onChange={e => setNuevoFile(e.target.files?.[0] || null)} />
              </label>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setReenv(false); setNuevoFile(null); }} className="px-3 py-1.5 text-xs text-gray-400">Cancelar</button>
                <button onClick={reenviar} disabled={saving} className="flex items-center gap-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">{saving ? "Enviando…" : "Reenviar a revisión"}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* miniaturas / archivo */}
      <div className="flex flex-wrap gap-2 mt-2">
        {(r.foto_urls || []).map((u, i) => <a key={i} href={u} target="_blank" rel="noreferrer"><img src={u} className="w-14 h-14 object-cover rounded-lg border border-gray-700" /></a>)}
        {r.archivo_url && <a href={r.archivo_url} target="_blank" rel="noreferrer" className="text-xs text-purple-400 underline flex items-center gap-1"><FileText size={12} /> Ver archivo</a>}
        {r.foto_cierre_url && <a href={r.foto_cierre_url} target="_blank" rel="noreferrer"><img src={r.foto_cierre_url} className="w-14 h-14 object-cover rounded-lg border border-emerald-800" title="Evidencia de cierre" /></a>}
      </div>

      {r.tipo !== "documento" && !editEstado && (
        <button onClick={() => setEditEstado(true)} className="mt-2 text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"><Clock size={12} /> Actualizar estado</button>
      )}
      {editEstado && (
        <div className="mt-3 space-y-2 border-t border-gray-800 pt-3">
          <div className="flex gap-2">
            {ESTADOS.map(s => (
              <button key={s} onClick={() => setEstado(s)} className={`flex-1 text-xs py-1.5 rounded-lg border ${estado === s ? "bg-purple-600 text-white border-purple-500" : "border-gray-700 text-gray-400"}`}>{s}</button>
            ))}
          </div>
          <textarea rows={2} value={medida} onChange={e => setMedida(e.target.value)} placeholder="Medida correctiva / avance" className={inp + " resize-none"} />
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-700 text-gray-400 text-xs cursor-pointer hover:border-emerald-500">
            <Camera size={13} /> {cierreFile ? "1 foto" : "Foto de cierre (opcional)"}
            <input type="file" className="hidden" accept="image/*" capture="environment" onChange={e => setCierreFile(e.target.files?.[0] || null)} />
          </label>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditEstado(false)} className="px-3 py-1.5 text-xs text-gray-400">Cancelar</button>
            <button onClick={guardar} disabled={saving} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"><CheckCircle size={12} /> {saving ? "Guardando…" : "Guardar"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

const inp = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500";
function Field({ label, children }) {
  return <div><label className="block text-xs text-gray-500 mb-1">{label}</label>{children}</div>;
}
