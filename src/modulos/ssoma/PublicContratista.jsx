import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase.js';
import {
  Building2, LogIn, AlertTriangle, ClipboardList, FileText, Plus, Camera,
  CheckCircle, Clock, Upload, X, ArrowLeft, ShieldCheck
} from 'lucide-react';
import { BloqueFirmas } from '../../components/FirmaDigital.jsx';

const BUCKET = "contratistas-docs";
const TABS = [
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

  const [tab, setTab] = useState("hallazgo");
  const [registros, setRegistros] = useState([]);
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
    if (!contratista) return;
    setLoading(true);
    const { data } = await supabase.from("contratista_registros").select("*")
      .eq("contratista_id", contratista.id).eq("tipo", tab).order("created_at", { ascending: false });
    setRegistros(data || []);
    setLoading(false);
  }, [contratista, tab]);
  useEffect(() => { cargar(); }, [cargar]);

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
        <button onClick={() => { setContratista(null); setRuc(""); setCodigo(""); }} className="text-xs text-gray-500 hover:text-gray-300">Salir</button>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-4">
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setShowForm(false); }}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg transition-all font-medium ${tab === t.id ? "bg-purple-600 text-white" : "text-gray-500 hover:text-gray-300"}`}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm font-medium py-2.5 rounded-xl mb-4 transition-colors">
            <Plus size={15} /> {tab === "documento" ? "Subir documento" : tab === "inspeccion" ? "Nueva inspección" : "Nuevo hallazgo"}
          </button>
        )}

        {showForm && (
          <NuevoRegistro tipo={tab} empresaId={empresaId} contratista={contratista}
            onCancel={() => setShowForm(false)} onSaved={() => { setShowForm(false); cargar(); }} />
        )}

        {/* Lista */}
        {loading ? (
          <p className="text-gray-600 text-sm text-center py-8">Cargando…</p>
        ) : registros.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-8">Aún no has registrado {TABS.find(t => t.id === tab).label.toLowerCase()}.</p>
        ) : (
          <div className="space-y-3">
            {registros.map(r => <RegistroCard key={r.id} r={r} onUpdated={cargar} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Formulario de nuevo registro ──
function NuevoRegistro({ tipo, empresaId, contratista, onCancel, onSaved }) {
  const [form, setForm] = useState({ titulo: "", descripcion: "", lugar: "", categoria: "", fecha: new Date().toISOString().split("T")[0], reportante: "" });
  const [files, setFiles] = useState([]);
  const [firmas, setFirmas] = useState({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const esDoc = tipo === "documento";

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
      const { error } = await supabase.from("contratista_registros").insert(payload);
      if (error) throw error;
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
function RegistroCard({ r, onUpdated }) {
  const [editEstado, setEditEstado] = useState(false);
  const [estado, setEstado] = useState(r.estado || "Abierto");
  const [medida, setMedida] = useState(r.medida_correctiva || "");
  const [cierreFile, setCierreFile] = useState(null);
  const [saving, setSaving] = useState(false);

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
        {r.tipo !== "documento" && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${ESTADO_COLOR[r.estado] || ESTADO_COLOR.Abierto}`}>{r.estado}</span>
        )}
      </div>

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
