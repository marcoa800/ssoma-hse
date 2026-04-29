import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import {
  LayoutDashboard, Users, BookOpen, FileText,
  BarChart2, Stethoscope, AlertTriangle,
  CheckCircle, XCircle, Info, Plus, Upload,
  Download, ChevronRight, ChevronLeft, Lock,
  Trash2, LogOut, Filter
} from "lucide-react";
import * as XLSX from "xlsx";
import Papa from "papaparse";

// ═══════════════════════════════════════════
// TOAST SYSTEM
// ═══════════════════════════════════════════
let toastQueue = [];
let toastSetter = null;

export function showToast(msg, type = "info") {
  const id = Date.now();
  toastQueue = [...toastQueue, { id, msg, type }];
  if (toastSetter) toastSetter([...toastQueue]);
  setTimeout(() => {
    toastQueue = toastQueue.filter((t) => t.id !== id);
    if (toastSetter) toastSetter([...toastQueue]);
  }, 3500);
}

function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => { toastSetter = setToasts; }, []);
  const icons = { success: <CheckCircle size={15} />, error: <XCircle size={15} />, info: <Info size={15} /> };
  const colors = { success: "bg-emerald-900 border-emerald-500 text-emerald-300", error: "bg-red-900 border-red-500 text-red-300", info: "bg-blue-900 border-blue-500 text-blue-300" };
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium pointer-events-auto ${colors[t.type]}`}>
          {icons[t.type]} {t.msg}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// COMPONENTES BASE
// ═══════════════════════════════════════════
function Badge({ children, color = "gray" }) {
  const colors = { green: "bg-emerald-900/60 text-emerald-400 border border-emerald-700", amber: "bg-amber-900/60 text-amber-400 border border-amber-700", red: "bg-red-900/60 text-red-400 border border-red-700", blue: "bg-blue-900/60 text-blue-400 border border-blue-700", gray: "bg-gray-800 text-gray-400 border border-gray-700", purple: "bg-purple-900/60 text-purple-400 border border-purple-700" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>{children}</span>;
}

function ProgressBar({ value, color = "blue", height = "h-1.5" }) {
  const colors = { blue: "bg-blue-500", emerald: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500", purple: "bg-purple-500" };
  return (
    <div className={`w-full bg-gray-800 rounded-full ${height} overflow-hidden`}>
      <div className={`${height} rounded-full transition-all duration-500 ${colors[color]}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

function KpiCard({ label, value, sub, accentColor = "blue" }) {
  const colors = { blue: "border-l-blue-500 text-blue-400", emerald: "border-l-emerald-500 text-emerald-400", amber: "border-l-amber-500 text-amber-400", red: "border-l-red-500 text-red-400", purple: "border-l-purple-500 text-purple-400" };
  return (
    <div className={`bg-gray-900 border border-gray-800 border-l-4 ${colors[accentColor].split(" ")[0]} rounded-xl p-4`}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-3xl font-semibold tracking-tight ${colors[accentColor].split(" ")[1]}`}>{value}</div>
      <div className="text-xs text-gray-600 mt-1">{sub}</div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="text-base font-semibold text-white mb-4">{title}</div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children, confidential = false }) {
  return (
    <div className="mb-3">
      <label className="flex items-center gap-2 text-xs text-gray-400 mb-1.5">
        {label}
        {confidential && <span className="text-xs px-1.5 py-0.5 rounded bg-red-900/40 text-red-400 border border-red-800 font-mono">CONFIDENCIAL</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ ...props }) {
  return <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors" {...props} />;
}

function Select({ children, ...props }) {
  return <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" {...props}>{children}</select>;
}

function Btn({ children, variant = "default", size = "md", disabled, onClick, className = "" }) {
  const base = "inline-flex items-center gap-1.5 font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" };
  const variants = { default: "bg-transparent border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white", primary: "bg-blue-600 text-white hover:bg-blue-500 border border-transparent", danger: "bg-red-900/40 text-red-400 border border-red-800 hover:bg-red-900" };
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} disabled={disabled} onClick={onClick}>{children}</button>;
}

// ═══════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) { setError("Ingresa email y contraseña"); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError("Credenciales incorrectas"); setLoading(false); return; }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-lg font-bold text-white">S</div>
          <div>
            <div className="font-semibold text-white text-lg">SSOMA HSE</div>
            <div className="text-xs text-gray-600">MP Recicla SAC</div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="text-sm font-semibold text-white mb-4">Iniciar Sesión</div>
          {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-900/30 border border-red-900 text-red-400 text-xs">{error}</div>}
          <FormField label="Correo electrónico">
            <Input type="email" placeholder="usuario@mprecicla.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          </FormField>
          <FormField label="Contraseña">
            <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          </FormField>
          <Btn variant="primary" className="w-full justify-center mt-2" disabled={loading} onClick={handleLogin}>
            {loading ? "Ingresando..." : "Ingresar"}
          </Btn>
        </div>
        <div className="text-center mt-4 text-xs text-gray-700">Sistema Integrado de Gestión SSOMA</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════
function Dashboard({ workers, trainings }) {
  const activos = workers.filter((w) => w.estado === "Activo").length;
  const conRestriccion = workers.filter((w) => w.aptitud === "Apto con restricción").length;
  const now = new Date();
  const in30 = new Date(); in30.setDate(in30.getDate() + 30);
  const emoVencer = workers.filter((w) => { const d = new Date(w.vencimiento_emo); return d >= now && d <= in30; }).length;
  const emoVencidos = workers.filter((w) => w.vencimiento_emo && new Date(w.vencimiento_emo) < now);
  const pctInduccion = workers.length ? Math.round((workers.filter((w) => (w.completed_trainings || 0) >= 1).length / workers.length) * 100) : 0;
  const pctAptitud = workers.length ? Math.round((workers.filter((w) => ["Apto", "Apto con restricción"].includes(w.aptitud)).length / workers.length) * 100) : 0;

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Personal Activo" value={activos} sub={`de ${workers.length} registrados`} accentColor="blue" />
        <KpiCard label="Aptos con Restricción" value={conRestriccion} sub="requieren seguimiento" accentColor="amber" />
        <KpiCard label="EMOs por Vencer" value={emoVencer} sub="próximos 30 días" accentColor="red" />
        <KpiCard label="Capacitaciones" value={trainings.length} sub="programadas" accentColor="emerald" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-4">Indicadores de Cumplimiento</div>
          <div className="space-y-3">
            {[{ label: "% Inducciones completadas", value: pctInduccion, color: "blue" }, { label: "% EPP entregado", value: 95, color: "emerald" }, { label: "% Aptitud Médica Vigente", value: pctAptitud, color: "purple" }].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs text-gray-500 mb-1.5"><span>{item.label}</span><span className="text-white font-medium">{item.value}%</span></div>
                <ProgressBar value={item.value} color={item.color} height="h-2" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-4">Últimas Capacitaciones</div>
          <div className="space-y-3">
            {trainings.slice(0, 4).map((t) => {
              const pct = t.programados > 0 ? Math.round(((t.asistencia_count || 0) / t.programados) * 100) : 0;
              return (
                <div key={t.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0 text-sm text-gray-400 truncate">{t.nombre}</div>
                  <div className="w-20"><ProgressBar value={pct} color={pct >= 80 ? "emerald" : pct >= 40 ? "amber" : "red"} /></div>
                  <div className="text-xs text-gray-600 w-8 text-right">{pct}%</div>
                </div>
              );
            })}
            {trainings.length === 0 && <div className="text-xs text-gray-600">No hay capacitaciones registradas</div>}
          </div>
        </div>
      </div>
      {emoVencidos.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><AlertTriangle size={15} className="text-red-400" /> Alertas Activas</div>
          <div className="space-y-2">
            {emoVencidos.map((w) => (
              <div key={w.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-red-900/20 border border-red-900/40 text-sm">
                <AlertTriangle size={14} className="text-red-400 shrink-0" />
                <span className="text-white font-medium">{w.nombre}</span>
                <span className="text-red-400">— EMO vencido: {w.vencimiento_emo}</span>
                <Badge color="amber">{w.cargo}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// DIRECTORIO
// ═══════════════════════════════════════════
function Directorio({ workers, setWorkers, role }) {
  const [filter, setFilter] = useState({ text: "", estado: "", aptitud: "" });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const canSeeMedical = ["ADMIN", "MEDICO"].includes(role);
  const canEditEmo = role !== "SEGURIDAD";

  const filtered = workers.filter((w) => {
    const t = filter.text.toLowerCase();
    return (!t || w.nombre.toLowerCase().includes(t) || w.dni.includes(t))
      && (!filter.estado || w.estado === filter.estado)
      && (!filter.aptitud || w.aptitud === filter.aptitud);
  });

  const openModal = (worker = null) => {
    setForm(worker || { nombre: "", dni: "", cargo: "", sede: "Lima", estado: "Activo", tipo_emo: "Periódico", vencimiento_emo: "", aptitud: "No evaluado", restriccion_medica: "Ninguna" });
    setModal(worker ? "edit" : "new");
  };

  const saveWorker = async () => {
    if (!form.nombre || !form.dni) { showToast("Nombre y DNI son requeridos", "error"); return; }
    setIsSaving(true);
    if (modal === "edit") {
      const { error } = await supabase.from("trabajadores").update({ nombre: form.nombre, dni: form.dni, cargo: form.cargo, sede: "Lima", estado: form.estado, tipo_emo: form.tipo_emo, vencimiento_emo: form.vencimiento_emo || null, aptitud: form.aptitud, restriccion_medica: form.restriccion_medica }).eq("id", form.id);
      if (error) { showToast("Error al actualizar: " + error.message, "error"); setIsSaving(false); return; }
      setWorkers((prev) => prev.map((w) => w.id === form.id ? { ...form, sede: "Lima" } : w));
      showToast("Trabajador actualizado", "success");
    } else {
      const { data, error } = await supabase.from("trabajadores").insert([{ nombre: form.nombre, dni: form.dni, cargo: form.cargo, sede: "Lima", estado: form.estado, tipo_emo: form.tipo_emo, vencimiento_emo: form.vencimiento_emo || null, aptitud: form.aptitud, restriccion_medica: form.restriccion_medica || "Ninguna" }]).select().single();
      if (error) { showToast("Error al registrar: " + error.message, "error"); setIsSaving(false); return; }
      setWorkers((prev) => [...prev, data]);
      showToast("Trabajador registrado", "success");
    }
    setIsSaving(false);
    setModal(null);
  };

  const deleteWorker = async (id) => {
    if (!confirm("¿Eliminar este trabajador? Esta acción no se puede deshacer.")) return;
    setIsDeleting(id);
    const { error } = await supabase.from("trabajadores").delete().eq("id", id);
    if (error) { showToast("Error al eliminar: " + error.message, "error"); setIsDeleting(null); return; }
    setWorkers((prev) => prev.filter((w) => w.id !== id));
    showToast("Trabajador eliminado", "success");
    setIsDeleting(null);
  };

  const importCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const rows = results.data.filter((r) => r.Nombre && r.DNI);
        if (rows.length === 0) { showToast("CSV inválido: se requieren columnas 'Nombre' y 'DNI'", "error"); return; }
        const inserts = rows.map((r) => ({ nombre: r.Nombre, dni: String(r.DNI).replace(/\D/g, ""), cargo: r.Cargo || "", sede: "Lima", estado: r.Estado || "Activo", tipo_emo: r.TipoEMO || "Periódico", vencimiento_emo: r.VencimientoEMO || null, aptitud: r.Aptitud || "No evaluado", restriccion_medica: "Ninguna" }));
        const { data, error } = await supabase.from("trabajadores").insert(inserts).select();
        if (error) { showToast("Error al importar: " + error.message, "error"); return; }
        setWorkers((prev) => [...prev, ...data]);
        showToast(`${data.length} trabajadores importados`, "success");
      },
      error: () => showToast("Error al leer el archivo CSV", "error"),
    });
    e.target.value = "";
  };

  const exportExcel = () => {
    const data = filtered.map((w) => ({ Nombre: w.nombre, DNI: w.dni, Cargo: w.cargo, Sede: w.sede, Estado: w.estado, "Tipo EMO": w.tipo_emo, "Vencimiento EMO": w.vencimiento_emo, Aptitud: w.aptitud, ...(canSeeMedical ? { "Restricción Médica": w.restriccion_medica } : {}) }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Directorio");
    XLSX.writeFile(wb, "directorio_trabajadores.xlsx");
    showToast("Excel descargado", "success");
  };

  const aptitudColor = { "Apto": "green", "Apto con restricción": "amber", "No apto": "red", "No evaluado": "gray" };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-semibold text-white">Personal Registrado</div>
          <div className="text-xs text-gray-600">{filtered.length} de {workers.length} trabajadores · Lima</div>
        </div>
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-all cursor-pointer"><Upload size={13} /> Importar CSV</span>
            <input type="file" accept=".csv" className="hidden" onChange={importCSV} />
          </label>
          <Btn size="sm" onClick={exportExcel}><Download size={13} /> Exportar Excel</Btn>
          <Btn size="sm" variant="primary" onClick={() => openModal()}><Plus size={13} /> Registrar</Btn>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap mb-4">
        <Input placeholder="Buscar nombre o DNI..." value={filter.text} onChange={(e) => setFilter((f) => ({ ...f, text: e.target.value }))} style={{ flex: 1, minWidth: 160 }} />
        <Select value={filter.estado} onChange={(e) => setFilter((f) => ({ ...f, estado: e.target.value }))} style={{ width: 160 }}>
          <option value="">Todos los estados</option>
          {["Activo", "Vacaciones", "Inactivo"].map((s) => <option key={s}>{s}</option>)}
        </Select>
        <Select value={filter.aptitud} onChange={(e) => setFilter((f) => ({ ...f, aptitud: e.target.value }))} style={{ width: 180 }}>
          <option value="">Toda aptitud</option>
          {["Apto", "Apto con restricción", "No evaluado"].map((a) => <option key={a}>{a}</option>)}
        </Select>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {["Nombre / DNI", "Cargo", "Estado", "Aptitud", "Vence EMO", ...(canSeeMedical ? ["Restricción"] : []), ""].map((h) => (
                  <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => {
                const isVenc = w.vencimiento_emo && new Date(w.vencimiento_emo) < new Date();
                return (
                  <tr key={w.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{w.nombre}</div>
                      <div className="text-xs font-mono text-gray-600">{w.dni}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{w.cargo}</td>
                    <td className="px-4 py-3"><Badge color={w.estado === "Activo" ? "green" : "amber"}>{w.estado}</Badge></td>
                    <td className="px-4 py-3"><Badge color={aptitudColor[w.aptitud] || "gray"}>{w.aptitud}</Badge></td>
                    <td className={`px-4 py-3 font-mono text-xs ${isVenc ? "text-red-400" : "text-gray-500"}`}>{w.vencimiento_emo || "—"}</td>
                    {canSeeMedical && <td className="px-4 py-3 text-xs">{w.restriccion_medica !== "Ninguna" ? <span className="text-amber-400">{w.restriccion_medica}</span> : <span className="text-gray-700">—</span>}</td>}
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Btn size="sm" onClick={() => openModal(w)}>Editar</Btn>
                        <Btn size="sm" variant="danger" disabled={isDeleting === w.id} onClick={() => deleteWorker(w.id)}><Trash2 size={12} /></Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-600 text-sm">No se encontraron trabajadores</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {!canSeeMedical && <div className="flex items-center gap-2 mt-3 text-xs text-gray-600"><Lock size={12} className="text-red-500" /><span className="px-2 py-0.5 rounded bg-red-900/30 text-red-500 border border-red-900 font-mono text-xs">CONFIDENCIAL</span> Restricciones médicas visibles solo para MEDICO y ADMIN</div>}

      {modal && (
        <Modal title={modal === "edit" ? "Editar Trabajador" : "Registrar Trabajador"} onClose={() => setModal(null)}>
          <FormField label="Nombre Completo"><Input value={form.nombre || ""} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} /></FormField>
          <FormField label="DNI (solo números)">
            <Input value={form.dni || ""} inputMode="numeric" maxLength={8}
              onChange={(e) => { const val = e.target.value.replace(/\D/g, ""); setForm((f) => ({ ...f, dni: val })); }}
              placeholder="12345678" className="font-mono" />
          </FormField>
          <FormField label="Cargo"><Input value={form.cargo || ""} onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))} /></FormField>
          <FormField label="Sede"><Input value="Lima" disabled className="opacity-50 cursor-not-allowed" /></FormField>
          <FormField label="Estado">
            <Select value={form.estado || "Activo"} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}>
              <option>Activo</option><option>Vacaciones</option><option>Inactivo</option>
            </Select>
          </FormField>
          {canEditEmo ? (
            <>
              <FormField label="Tipo EMO">
                <Select value={form.tipo_emo || "Periódico"} onChange={(e) => setForm((f) => ({ ...f, tipo_emo: e.target.value }))}>
                  <option>Inicial</option><option>Periódico</option><option>Retiro</option>
                </Select>
              </FormField>
              <FormField label="Vencimiento EMO"><Input type="date" value={form.vencimiento_emo || ""} onChange={(e) => setForm((f) => ({ ...f, vencimiento_emo: e.target.value }))} /></FormField>
              <FormField label="Aptitud Médica">
                <Select value={form.aptitud || "No evaluado"} onChange={(e) => setForm((f) => ({ ...f, aptitud: e.target.value }))}>
                  <option>Apto</option><option>Apto con restricción</option><option>No apto</option><option>No evaluado</option>
                </Select>
              </FormField>
            </>
          ) : (
            <div className="mb-3 px-3 py-2.5 rounded-lg bg-amber-900/20 border border-amber-900/40 text-xs text-amber-400 flex items-center gap-2"><Lock size={12} /> Los campos de EMO solo pueden editarlos MEDICO o ADMIN</div>
          )}
          {canSeeMedical && <FormField label="Detalle Restricción Médica" confidential><Input value={form.restriccion_medica || ""} onChange={(e) => setForm((f) => ({ ...f, restriccion_medica: e.target.value }))} /></FormField>}
          <div className="flex gap-2 justify-end mt-4">
            <Btn onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn variant="primary" disabled={isSaving} onClick={saveWorker}>{isSaving ? "Guardando..." : "Guardar"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// CAPACITACIONES
// ═══════════════════════════════════════════
function Capacitaciones({ workers, trainings, setTrainings }) {
  const [detail, setDetail] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [isDeleting, setIsDeleting] = useState(null);

  useEffect(() => {
    if (detail) loadAttendance(detail);
  }, [detail]);

  const loadAttendance = async (trainingId) => {
    const { data } = await supabase.from("asistencias").select("trabajador_id, presente").eq("capacitacion_id", trainingId);
    const map = {};
    (data || []).forEach((a) => { map[a.trabajador_id] = a.presente; });
    setAttendance(map);
  };

  const toggleAttendance = async (trainingId, workerId, checked) => {
    const { error } = await supabase.from("asistencias").upsert({ capacitacion_id: trainingId, trabajador_id: workerId, presente: checked }, { onConflict: "capacitacion_id,trabajador_id" });
    if (error) { showToast("Error al guardar asistencia", "error"); return; }
    setAttendance((prev) => ({ ...prev, [workerId]: checked }));
    showToast(checked ? "Asistencia marcada" : "Ausencia registrada", checked ? "success" : "info");
  };

  const deleteTraining = async (id) => {
    if (!confirm("¿Eliminar esta capacitación?")) return;
    setIsDeleting(id);
    const { error } = await supabase.from("capacitaciones").delete().eq("id", id);
    if (error) { showToast("Error al eliminar", "error"); setIsDeleting(null); return; }
    setTrainings((prev) => prev.filter((t) => t.id !== id));
    showToast("Capacitación eliminada", "success");
    setIsDeleting(null);
  };

  const importAttendanceCSV = (e, trainingId) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const dnis = results.data.map((r) => String(r.DNI || r.dni || "").replace(/\D/g, "")).filter(Boolean);
        if (dnis.length === 0) { showToast("CSV inválido: se requiere columna 'DNI'", "error"); return; }
        const matched = workers.filter((w) => dnis.includes(w.dni));
        for (const w of matched) {
          await supabase.from("asistencias").upsert({ capacitacion_id: trainingId, trabajador_id: w.id, presente: true }, { onConflict: "capacitacion_id,trabajador_id" });
        }
        await loadAttendance(trainingId);
        showToast(`${matched.length} asistencias marcadas desde CSV`, "success");
      },
    });
    e.target.value = "";
  };

  const exportAttendance = (t) => {
    const active = workers.filter((w) => w.estado === "Activo");
    const data = active.map((w) => ({ Nombre: w.nombre, DNI: w.dni, Cargo: w.cargo, Asistencia: attendance[w.id] ? "Presente" : "Ausente" }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
    XLSX.writeFile(wb, `asistencia_${t.nombre.replace(/\s+/g, "_")}.xlsx`);
    showToast("Excel descargado", "success");
  };

  if (detail) {
    const t = trainings.find((x) => x.id === detail);
    if (!t) { setDetail(null); return null; }
    const active = workers.filter((w) => w.estado === "Activo");
    const presentCount = Object.values(attendance).filter(Boolean).length;
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <Btn size="sm" onClick={() => setDetail(null)}><ChevronLeft size={13} /> Volver</Btn>
          <div>
            <div className="text-sm font-semibold text-white">{t.nombre}</div>
            <div className="text-xs text-gray-600">Fecha: {t.fecha} · {presentCount}/{active.length} presentes</div>
          </div>
          <div className="ml-auto flex gap-2">
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-all cursor-pointer"><Upload size={13} /> Importar CSV</span>
              <input type="file" accept=".csv" className="hidden" onChange={(e) => importAttendanceCSV(e, detail)} />
            </label>
            <Btn size="sm" onClick={() => exportAttendance(t)}><Download size={13} /> Exportar</Btn>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs text-gray-600 font-medium px-4 py-3 w-10">
                  <input type="checkbox" className="accent-blue-500" onChange={async (e) => {
                    for (const w of active) await toggleAttendance(detail, w.id, e.target.checked);
                  }} />
                </th>
                {["Nombre", "DNI", "Cargo", "Asistencia"].map((h) => <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {active.map((w) => {
                const present = !!attendance[w.id];
                return (
                  <tr key={w.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3"><input type="checkbox" className="accent-blue-500" checked={present} onChange={(e) => toggleAttendance(detail, w.id, e.target.checked)} /></td>
                    <td className="px-4 py-3 font-medium text-white">{w.nombre}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{w.dni}</td>
                    <td className="px-4 py-3 text-gray-400">{w.cargo}</td>
                    <td className="px-4 py-3"><Badge color={present ? "green" : "gray"}>{present ? "Presente" : "Ausente"}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-semibold text-white">Plan de Capacitaciones</div>
          <div className="text-xs text-gray-600">{trainings.length} capacitaciones registradas</div>
        </div>
        <Btn size="sm" variant="primary" onClick={async () => {
          const nombre = prompt("Nombre de la capacitación:");
          if (!nombre) return;
          const fecha = prompt("Fecha (YYYY-MM-DD):");
          if (!fecha) return;
          const { data, error } = await supabase.from("capacitaciones").insert([{ nombre, fecha, programados: workers.filter((w) => w.estado === "Activo").length }]).select().single();
          if (error) { showToast("Error: " + error.message, "error"); return; }
          setTrainings((prev) => [...prev, { ...data, asistencia_count: 0 }]);
          showToast("Capacitación creada", "success");
        }}><Plus size={13} /> Nueva</Btn>
      </div>
      <div className="space-y-2">
        {trainings.map((t) => {
          const pct = t.programados > 0 ? Math.round(((t.asistencia_count || 0) / t.programados) * 100) : 0;
          return (
            <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white text-sm">{t.nombre}</div>
                <div className="text-xs text-gray-600 mt-0.5">{t.fecha}</div>
              </div>
              <div className="flex items-center gap-3 w-48">
                <div className="flex-1"><ProgressBar value={pct} color={pct >= 80 ? "emerald" : pct >= 40 ? "amber" : "red"} /></div>
                <span className="text-xs text-gray-500 whitespace-nowrap">{t.asistencia_count || 0}/{t.programados} ({pct}%)</span>
              </div>
              <Btn size="sm" onClick={() => setDetail(t.id)}>Ver detalle <ChevronRight size={12} /></Btn>
              <Btn size="sm" variant="danger" disabled={isDeleting === t.id} onClick={() => deleteTraining(t.id)}><Trash2 size={12} /></Btn>
            </div>
          );
        })}
        {trainings.length === 0 && <div className="text-center py-12 text-gray-600 text-sm">No hay capacitaciones registradas</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// DOCUMENTOS
// ═══════════════════════════════════════════
function Documentos({ docs, setDocs }) {
  const [catFilter, setCatFilter] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nombre: "", categoria: "Seguridad", version: "v1", sourceType: "upload" });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const cats = ["Seguridad", "Salud", "Ambiente"];
  const filtered = docs.filter((d) => !catFilter || d.categoria === catFilter);
  const catColor = { Seguridad: "red", Salud: "blue", Ambiente: "green" };

  const saveDoc = async () => {
    if (!form.nombre) { showToast("El nombre es requerido", "error"); return; }
    setIsSaving(true);
    const { data, error } = await supabase.from("documentos").insert([{ nombre: form.nombre, categoria: form.categoria, version: form.version || "v1", url_externa: form.url || null }]).select().single();
    if (error) { showToast("Error: " + error.message, "error"); setIsSaving(false); return; }
    setDocs((prev) => [data, ...prev]);
    showToast("Documento registrado", "success");
    setIsSaving(false);
    setModal(false);
  };

  const deleteDoc = async (id) => {
    if (!confirm("¿Eliminar este documento?")) return;
    setIsDeleting(id);
    const { error } = await supabase.from("documentos").delete().eq("id", id);
    if (error) { showToast("Error al eliminar", "error"); setIsDeleting(null); return; }
    setDocs((prev) => prev.filter((d) => d.id !== id));
    showToast("Documento eliminado", "success");
    setIsDeleting(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div><div className="text-sm font-semibold text-white">Centro Documental</div><div className="text-xs text-gray-600">Documentos del SIG — ISO 45001</div></div>
        <Btn size="sm" variant="primary" onClick={() => setModal(true)}><Plus size={13} /> Agregar</Btn>
      </div>
      <div className="flex gap-1 border-b border-gray-800 mb-4">
        {[{ label: `Todos (${docs.length})`, val: "" }, ...cats.map((c) => ({ label: `${c} (${docs.filter((d) => d.categoria === c).length})`, val: c }))].map((tab) => (
          <button key={tab.val} onClick={() => setCatFilter(tab.val)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${catFilter === tab.val ? "border-blue-500 text-blue-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>{tab.label}</button>
        ))}
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800">{["Documento", "Categoría", "Versión", "Fecha", ""].map((h) => <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3 font-medium text-white">{d.nombre}</td>
                <td className="px-4 py-3"><Badge color={catColor[d.categoria] || "gray"}>{d.categoria}</Badge></td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{d.version}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{d.fecha}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {d.url_externa && <Btn size="sm" onClick={() => window.open(d.url_externa, "_blank")}>↗ Ver</Btn>}
                    <Btn size="sm" variant="danger" disabled={isDeleting === d.id} onClick={() => deleteDoc(d.id)}><Trash2 size={12} /></Btn>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600 text-sm">No hay documentos</td></tr>}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title="Agregar Documento" onClose={() => setModal(false)}>
          <FormField label="Nombre del Documento"><Input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} /></FormField>
          <FormField label="Categoría"><Select value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}>{cats.map((c) => <option key={c}>{c}</option>)}</Select></FormField>
          <FormField label="Versión"><Input value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} placeholder="v1" className="font-mono" /></FormField>
          <div className="mb-3 bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-2 font-medium">Fuente</div>
            <div className="flex gap-2 mb-3">
              {[{ val: "upload", label: "⬆ Subir Archivo" }, { val: "url", label: "🔗 URL Externa" }].map((opt) => (
                <button key={opt.val} onClick={() => setForm((f) => ({ ...f, sourceType: opt.val }))} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.sourceType === opt.val ? "border-blue-500 text-blue-400 bg-blue-900/20" : "border-gray-700 text-gray-500"}`}>{opt.label}</button>
              ))}
            </div>
            {form.sourceType === "upload" ? <><input type="file" accept=".pdf,.xlsx,.docx" className="w-full text-xs text-gray-400" /><div className="text-xs text-gray-600 mt-1.5">Se subirá a Supabase Storage.</div></> : <Input placeholder="https://..." value={form.url || ""} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />}
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Btn onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn variant="primary" disabled={isSaving} onClick={saveDoc}>{isSaving ? "Guardando..." : "Guardar"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// KPIs
// ═══════════════════════════════════════════
function KPIs({ kpis, setKpis }) {
  const [modal, setModal] = useState(false);
  const [filterMes, setFilterMes] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [form, setForm] = useState({ nombre: "", mes: "", fecha: "", real: 0, meta: 100, unidad: "%" });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);

  const meses = [...new Set(kpis.map((k) => k.mes).filter(Boolean))];
  const filtered = kpis.filter((k) => (!filterMes || k.mes === filterMes) && (!filterCat || k.nombre.toLowerCase().includes(filterCat.toLowerCase())));
  const isKpiMet = (k) => k.meta === 0 ? k.real === 0 : (k.nombre.toLowerCase().includes("frecuencia") || k.nombre.toLowerCase().includes("accidente") ? k.real <= k.meta : k.real >= k.meta);

  const saveKpi = async () => {
    if (!form.nombre) { showToast("El nombre es requerido", "error"); return; }
    setIsSaving(true);
    const { data, error } = await supabase.from("kpis").insert([{ nombre: form.nombre, mes: form.mes, fecha: form.fecha || null, valor_real: parseFloat(form.real) || 0, meta: parseFloat(form.meta) || 0, unidad: form.unidad }]).select().single();
    if (error) { showToast("Error: " + error.message, "error"); setIsSaving(false); return; }
    setKpis((prev) => [...prev, { ...data, real: data.valor_real }]);
    showToast("KPI registrado", "success");
    setIsSaving(false);
    setModal(false);
  };

  const deleteKpi = async (id) => {
    if (!confirm("¿Eliminar este KPI?")) return;
    setIsDeleting(id);
    const { error } = await supabase.from("kpis").delete().eq("id", id);
    if (error) { showToast("Error al eliminar", "error"); setIsDeleting(null); return; }
    setKpis((prev) => prev.filter((k) => k.id !== id));
    showToast("KPI eliminado", "success");
    setIsDeleting(null);
  };

  const exportKpis = () => {
    const data = filtered.map((k) => ({ Indicador: k.nombre, Mes: k.mes, Fecha: k.fecha || "", "Valor Real": k.real ?? k.valor_real, Meta: k.meta, Unidad: k.unidad, Cumplido: isKpiMet(k) ? "Sí" : "No" }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "KPIs");
    XLSX.writeFile(wb, "kpis_ssoma.xlsx");
    showToast("Excel descargado", "success");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div><div className="text-sm font-semibold text-white">Gestión de KPIs</div><div className="text-xs text-gray-600">{filtered.length} indicadores</div></div>
        <div className="flex gap-2">
          <Btn size="sm" onClick={exportKpis}><Download size={13} /> Exportar</Btn>
          <Btn size="sm" variant="primary" onClick={() => setModal(true)}><Plus size={13} /> Registrar Métrica</Btn>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-48">
          <Filter size={13} className="text-gray-600 shrink-0" />
          <Select value={filterMes} onChange={(e) => setFilterMes(e.target.value)}>
            <option value="">Todos los meses</option>
            {meses.map((m) => <option key={m}>{m}</option>)}
          </Select>
        </div>
        <Input placeholder="Buscar indicador..." value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {filtered.map((k) => {
          const val = k.real ?? k.valor_real ?? 0;
          const ok = isKpiMet({ ...k, real: val });
          return (
            <div key={k.id} className={`bg-gray-900 border border-gray-800 border-l-4 rounded-xl p-4 relative ${ok ? "border-l-emerald-500" : "border-l-red-500"}`}>
              <button onClick={() => deleteKpi(k.id)} disabled={isDeleting === k.id} className="absolute top-2 right-2 text-gray-700 hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
              <div className="text-xs text-gray-500 mb-1 pr-4">{k.nombre}</div>
              <div className={`text-2xl font-semibold tracking-tight ${ok ? "text-emerald-400" : "text-red-400"}`}>{val}{k.unidad}</div>
              <div className="text-xs text-gray-600 mt-0.5">Meta: {k.meta}{k.unidad}</div>
              {k.mes && <div className="text-xs text-gray-700 mt-0.5">{k.mes}{k.fecha ? ` · ${k.fecha}` : ""}</div>}
              <div className="mt-2"><ProgressBar value={k.meta > 0 ? Math.min(Math.round((val / k.meta) * 100), 100) : 100} color={ok ? "emerald" : "red"} /></div>
              <div className={`text-xs mt-1.5 font-medium ${ok ? "text-emerald-500" : "text-red-500"}`}>{ok ? "✓ Cumplido" : "✕ No cumplido"}</div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && <div className="text-center py-12 text-gray-600 text-sm">No hay KPIs registrados. Haz clic en "Registrar Métrica" para agregar.</div>}

      {modal && (
        <Modal title="Registrar Métrica" onClose={() => setModal(false)}>
          <FormField label="Nombre del Indicador"><Input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej. Índice de Frecuencia" /></FormField>
          <FormField label="Mes (Ej: Abril 2025)"><Input value={form.mes} onChange={(e) => setForm((f) => ({ ...f, mes: e.target.value }))} placeholder="Abril 2025" /></FormField>
          <FormField label="Fecha"><Input type="date" value={form.fecha} onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))} /></FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Valor Real"><Input type="number" value={form.real} onChange={(e) => setForm((f) => ({ ...f, real: e.target.value }))} /></FormField>
            <FormField label="Meta"><Input type="number" value={form.meta} onChange={(e) => setForm((f) => ({ ...f, meta: e.target.value }))} /></FormField>
          </div>
          <FormField label="Unidad (%, días, etc)"><Input value={form.unidad} onChange={(e) => setForm((f) => ({ ...f, unidad: e.target.value }))} placeholder="%" /></FormField>
          <div className="flex gap-2 justify-end mt-4">
            <Btn onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn variant="primary" disabled={isSaving} onClick={saveKpi}>{isSaving ? "Guardando..." : "Guardar"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// VIGILANCIA MÉDICA
// ═══════════════════════════════════════════
function Vigilancia({ workers }) {
  const [tab, setTab] = useState("descansos");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("registros_medicos").select("*, trabajadores(nombre)").then(({ data }) => { setRecords(data || []); setLoading(false); });
  }, []);

  const tabs = [{ id: "descansos", label: "Descansos Médicos" }, { id: "emos", label: "Programación EMOs" }, { id: "morbilidad", label: "Morbilidad" }];
  const now = new Date(); const in30 = new Date(); in30.setDate(in30.getDate() + 30);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="text-sm font-semibold text-white">Vigilancia Médica</div>
        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-purple-900/40 text-purple-400 border border-purple-800"><Lock size={11} /> MEDICO / ADMIN</span>
        <Btn size="sm" variant="primary" className="ml-auto" onClick={() => showToast("Función en desarrollo", "info")}><Plus size={13} /> Nuevo Registro</Btn>
      </div>
      <div className="flex gap-1 border-b border-gray-800 mb-4">
        {tabs.map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t.id ? "border-blue-500 text-blue-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>{t.label}</button>)}
      </div>
      {tab === "emos" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800">{["Trabajador", "Tipo EMO", "Vencimiento", "Estado", "Aptitud"].map((h) => <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody>
              {[...workers].filter((w) => w.estado === "Activo").sort((a, b) => new Date(a.vencimiento_emo) - new Date(b.vencimiento_emo)).map((w) => {
                const isVenc = w.vencimiento_emo && new Date(w.vencimiento_emo) < now;
                const soonVenc = !isVenc && w.vencimiento_emo && new Date(w.vencimiento_emo) <= in30;
                return (
                  <tr key={w.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-medium text-white">{w.nombre}</td>
                    <td className="px-4 py-3"><Badge color="blue">{w.tipo_emo}</Badge></td>
                    <td className={`px-4 py-3 font-mono text-xs ${isVenc ? "text-red-400" : soonVenc ? "text-amber-400" : "text-gray-500"}`}>{w.vencimiento_emo || "—"}</td>
                    <td className="px-4 py-3"><Badge color={isVenc ? "red" : soonVenc ? "amber" : "green"}>{isVenc ? "Vencido" : soonVenc ? "Por vencer" : "Vigente"}</Badge></td>
                    <td className="px-4 py-3"><Badge color={w.aptitud === "Apto" ? "green" : w.aptitud === "Apto con restricción" ? "amber" : "gray"}>{w.aptitud}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {tab === "descansos" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800">{["Trabajador", "Tipo", "Inicio", "Fin", "Diagnóstico", "Médico"].map((h) => <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody>
              {records.filter((r) => r.tipo === "Descanso Médico").map((m) => (
                <tr key={m.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-white">{m.trabajadores?.nombre || "—"}</td>
                  <td className="px-4 py-3"><Badge color="red">{m.tipo}</Badge></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{m.fecha_inicio}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{m.fecha_fin}</td>
                  <td className="px-4 py-3 text-gray-400">{m.diagnostico}</td>
                  <td className="px-4 py-3 text-gray-600">{m.medico_responsable}</td>
                </tr>
              ))}
              {records.filter((r) => r.tipo === "Descanso Médico").length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-600 text-sm">No hay descansos médicos registrados</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {tab === "morbilidad" && <div className="text-center py-12 text-gray-600 text-sm">Módulo de morbilidad en desarrollo</div>}
    </div>
  );
}

// ═══════════════════════════════════════════
// APP PRINCIPAL
// ═══════════════════════════════════════════
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "directorio", label: "Directorio", icon: Users },
  { id: "capacitaciones", label: "Capacitaciones", icon: BookOpen },
  { id: "documentos", label: "Documentos", icon: FileText },
  { id: "kpis", label: "KPIs", icon: BarChart2 },
];

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [role, setRole] = useState("ADMIN");
  const [workers, setWorkers] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [docs, setDocs] = useState([]);
  const [kpis, setKpis] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase.from("trabajadores").select("*").then(({ data }) => setWorkers(data || []));
    supabase.from("capacitaciones").select("*, asistencias(count)").then(({ data }) => {
      setTrainings((data || []).map((t) => ({ ...t, asistencia_count: t.asistencias?.[0]?.count || 0 })));
    });
    supabase.from("documentos").select("*").then(({ data }) => setDocs(data || []));
    supabase.from("kpis").select("*").then(({ data }) => setKpis((data || []).map((k) => ({ ...k, real: k.valor_real }))));
  }, [session]);

  const navigate = (p) => {
    if (p === "vigilancia" && role === "SEGURIDAD") { showToast("Acceso denegado: módulo exclusivo para MEDICO/ADMIN", "error"); return; }
    setPage(p);
  };

  const logout = async () => { await supabase.auth.signOut(); };

  const pageTitles = { dashboard: "Dashboard General", directorio: "Directorio Maestro", capacitaciones: "Capacitaciones", documentos: "Centro Documental", kpis: "Gestión de KPIs", vigilancia: "Vigilancia Médica" };
  const roleColors = { ADMIN: "text-purple-400 bg-purple-900/40 border-purple-800", MEDICO: "text-emerald-400 bg-emerald-900/40 border-emerald-800", SEGURIDAD: "text-amber-400 bg-amber-900/40 border-amber-800" };

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-600 text-sm">Cargando...</div>;
  if (!session) return <><Login /><ToastContainer /></>;

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <aside className="w-56 min-w-56 bg-gray-900 border-r border-gray-800 flex flex-col overflow-y-auto">
        <div className="px-4 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-xs font-bold">S</div>
            <span className="font-semibold text-sm">SSOMA <span className="text-gray-500 font-normal">HSE</span></span>
          </div>
          <div className="text-xs text-gray-600 mt-1">MP Recicla SAC</div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          <div className="text-xs text-gray-700 font-medium uppercase tracking-wider px-2 mb-2">Principal</div>
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => navigate(id)} className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-left ${page === id ? "bg-blue-900/40 text-blue-400" : "text-gray-500 hover:text-gray-200 hover:bg-gray-800"}`}>
              <Icon size={16} />{label}
            </button>
          ))}
          <div className="text-xs text-gray-700 font-medium uppercase tracking-wider px-2 mt-4 mb-2">Salud Ocupacional</div>
          <button onClick={() => navigate("vigilancia")} className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-left ${page === "vigilancia" ? "bg-blue-900/40 text-blue-400" : "text-gray-500 hover:text-gray-200 hover:bg-gray-800"}`}>
            <Stethoscope size={16} />Vigilancia Médica
            <span className="ml-auto flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-500 border border-purple-900"><Lock size={9} />MED</span>
          </button>
        </nav>
        <div className="p-3 border-t border-gray-800">
          <div className="text-xs text-gray-600 mb-2 px-1">{session.user.email}</div>
          <button onClick={logout} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-gray-600 hover:text-red-400 hover:bg-gray-800 transition-colors">
            <LogOut size={13} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">{pageTitles[page]}</div>
            <div className="text-xs text-gray-600">MP Recicla SAC · Lima</div>
          </div>
          <div className="flex items-center gap-2">
            <select value={role} onChange={(e) => { setRole(e.target.value); showToast(`Rol: ${e.target.value}`, "info"); }} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500">
              <option value="ADMIN">ADMIN</option>
              <option value="MEDICO">MEDICO</option>
              <option value="SEGURIDAD">SEGURIDAD</option>
            </select>
            <span className={`text-xs px-2 py-1 rounded-lg border font-mono ${roleColors[role]}`}>{role}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 bg-gray-950">
          {page === "dashboard" && <Dashboard workers={workers} trainings={trainings} />}
          {page === "directorio" && <Directorio workers={workers} setWorkers={setWorkers} role={role} />}
          {page === "capacitaciones" && <Capacitaciones workers={workers} trainings={trainings} setTrainings={setTrainings} />}
          {page === "documentos" && <Documentos docs={docs} setDocs={setDocs} />}
          {page === "kpis" && <KPIs kpis={kpis} setKpis={setKpis} />}
          {page === "vigilancia" && <Vigilancia workers={workers} />}
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}