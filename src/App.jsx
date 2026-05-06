import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import {
  LayoutDashboard, Users, BookOpen, FileText,
  BarChart2, Stethoscope, AlertTriangle,
  CheckCircle, XCircle, Info, Plus, Upload,
  Download, ChevronRight, ChevronLeft, Lock,
  Trash2, LogOut, Filter, HelpCircle
} from "lucide-react";
import * as XLSX from "xlsx";
import Papa from "papaparse";

// ═══════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════
let toastQueue = [];
let toastSetter = null;
export function showToast(msg, type = "info") {
  const id = Date.now();
  toastQueue = [...toastQueue, { id, msg, type }];
  if (toastSetter) toastSetter([...toastQueue]);
  setTimeout(() => { toastQueue = toastQueue.filter((t) => t.id !== id); if (toastSetter) toastSetter([...toastQueue]); }, 3500);
}
function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => { toastSetter = setToasts; }, []);
  const icons = { success: <CheckCircle size={15} />, error: <XCircle size={15} />, info: <Info size={15} /> };
  const colors = { success: "bg-emerald-900 border-emerald-500 text-emerald-300", error: "bg-red-900 border-red-500 text-red-300", info: "bg-blue-900 border-blue-500 text-blue-300" };
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => <div key={t.id} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium pointer-events-auto ${colors[t.type]}`}>{icons[t.type]} {t.msg}</div>)}
    </div>
  );
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
function calcularEdad(fechaNac) {
  if (!fechaNac) return null;
  const hoy = new Date();
  const nac = new Date(fechaNac);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

function calcularVigencia(ultimaEmo, duracion) {
  if (!ultimaEmo || !duracion) return null;
  const fecha = new Date(ultimaEmo);
  if (duracion === "Anual") fecha.setFullYear(fecha.getFullYear() + 1);
  else if (duracion === "Bianual") fecha.setFullYear(fecha.getFullYear() + 2);
  return fecha.toISOString().split("T")[0];
}

function excelDateToISO(val) {
  if (!val) return null;
  if (typeof val === "string" && val.includes("-")) return val;
  if (typeof val === "string" && val.includes("/")) {
    const parts = val.split("/");
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return `${y.length === 2 ? "20" + y : y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
    }
  }
  if (typeof val === "number") {
    const date = new Date((val - 25569) * 86400 * 1000);
    return date.toISOString().split("T")[0];
  }
  return null;
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
  return <div className={`w-full bg-gray-800 rounded-full ${height} overflow-hidden`}><div className={`${height} rounded-full transition-all duration-500 ${colors[color]}`} style={{ width: `${Math.min(value, 100)}%` }} /></div>;
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
function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={`bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="text-base font-semibold text-white mb-4">{title}</div>
        {children}
      </div>
    </div>
  );
}
function FormField({ label, children, confidential = false }) {
  return (
    <div className="mb-3">
      <label className="flex items-center gap-2 text-xs text-gray-400 mb-1.5">{label}{confidential && <span className="text-xs px-1.5 py-0.5 rounded bg-red-900/40 text-red-400 border border-red-800 font-mono">CONFIDENCIAL</span>}</label>
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
// MODAL GUÍA DE IMPORTACIÓN
// ═══════════════════════════════════════════
function ImportGuideModal({ onClose }) {
  const cols = [
    { col: "APELLIDO Y NOMBRE", desc: "Nombre completo del trabajador", ejemplo: "García López Juan", req: true },
    { col: "FECHA DE NACIMIENTO", desc: "Formato DD/MM/AAAA", ejemplo: "15/03/1990", req: false },
    { col: "DOC. DE IDENTIDAD", desc: "DNI (solo números, 8 dígitos)", ejemplo: "12345678", req: true },
    { col: "PUESTO", desc: "Cargo o puesto de trabajo", ejemplo: "Operador de Planta", req: false },
    { col: "ULTIMA EMO", desc: "Fecha del último examen médico DD/MM/AAAA", ejemplo: "10/01/2025", req: false },
    { col: "DURACION DE EMO", desc: "Anual o Bianual", ejemplo: "Anual", req: false },
    { col: "ESTADO", desc: "Activo, Vacaciones o Inactivo", ejemplo: "Activo", req: false },
    { col: "APTITUD", desc: "Apto, Apto con restricción, No apto, No evaluado", ejemplo: "Apto", req: false },
    { col: "RESTRICCION", desc: "Detalle de restricción médica si aplica", ejemplo: "Restringir trabajo nocturno", req: false },
    { col: "LECTURA 2026", desc: "Fecha de lectura de resultados EMO DD/MM/AAAA", ejemplo: "20/01/2025", req: false },
    { col: "CELULAR", desc: "Número de celular (9 dígitos)", ejemplo: "999888777", req: false },
    { col: "EPP RECIBIDO", desc: "SI o NO", ejemplo: "SI", req: false },
    { col: "EPP DETALLE", desc: "Lista de EPP entregados", ejemplo: "Casco, guantes, lentes", req: false },
    { col: "EPP FECHA", desc: "Fecha de entrega de EPP DD/MM/AAAA", ejemplo: "05/01/2025", req: false },
  ];

  const downloadTemplate = () => {
    const headers = cols.map(c => c.col);
    const example = cols.map(c => c.ejemplo);
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws["!cols"] = headers.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "plantilla_sabana_personal.xlsx");
    showToast("Plantilla descargada", "success");
  };

  return (
    <Modal title="Guía de Importación — Sábana de Personal" onClose={onClose} wide>
      <div className="mb-4 px-3 py-2.5 rounded-lg bg-blue-900/20 border border-blue-900/40 text-xs text-blue-400">
        El archivo Excel o CSV debe tener exactamente estos encabezados en la primera fila. Las columnas marcadas con <span className="text-red-400">*</span> son obligatorias.
      </div>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-gray-800"><th className="text-left text-gray-500 font-medium py-2 pr-4">Columna</th><th className="text-left text-gray-500 font-medium py-2 pr-4">Descripción</th><th className="text-left text-gray-500 font-medium py-2">Ejemplo</th></tr></thead>
          <tbody>
            {cols.map((c) => (
              <tr key={c.col} className="border-b border-gray-800/50">
                <td className="py-2 pr-4 font-mono text-blue-400 whitespace-nowrap">{c.col}{c.req && <span className="text-red-400 ml-1">*</span>}</td>
                <td className="py-2 pr-4 text-gray-400">{c.desc}</td>
                <td className="py-2 text-gray-600 font-mono">{c.ejemplo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mb-4 px-3 py-2.5 rounded-lg bg-amber-900/20 border border-amber-900/40 text-xs text-amber-400">
        <strong>Nota:</strong> VIGENTE HASTA se calcula automáticamente sumando 1 año (Anual) o 2 años (Bianual) a la ULTIMA EMO. No es necesario incluirlo en el Excel.
      </div>
      <div className="flex gap-2 justify-end">
        <Btn onClick={onClose}>Cerrar</Btn>
        <Btn variant="primary" onClick={downloadTemplate}><Download size={13} /> Descargar Plantilla Excel</Btn>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════
function Login() {
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
          <div><div className="font-semibold text-white text-lg">SSOMA HSE</div><div className="text-xs text-gray-600">MP Recicla SAC</div></div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="text-sm font-semibold text-white mb-4">Iniciar Sesión</div>
          {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-900/30 border border-red-900 text-red-400 text-xs">{error}</div>}
          <FormField label="Correo electrónico"><Input type="email" placeholder="usuario@mprecicla.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} /></FormField>
          <FormField label="Contraseña"><Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} /></FormField>
          <Btn variant="primary" className="w-full justify-center mt-2" disabled={loading} onClick={handleLogin}>{loading ? "Ingresando..." : "Ingresar"}</Btn>
        </div>
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
  const now = new Date(); const in30 = new Date(); in30.setDate(in30.getDate() + 30);
  const emoVencer = workers.filter((w) => { const vig = calcularVigencia(w.ultima_emo, w.duracion_emo); if (!vig) return false; const d = new Date(vig); return d >= now && d <= in30; }).length;
  const emoVencidos = workers.filter((w) => { const vig = calcularVigencia(w.ultima_emo, w.duracion_emo); return vig && new Date(vig) < now; });
  const pctEpp = workers.length ? Math.round((workers.filter((w) => w.epp_recibido).length / workers.length) * 100) : 0;
  const pctAptitud = workers.length ? Math.round((workers.filter((w) => ["Apto", "Apto con restricción"].includes(w.aptitud)).length / workers.length) * 100) : 0;
  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Personal Activo" value={activos} sub={`de ${workers.length} registrados`} accentColor="blue" />
        <KpiCard label="Aptos con Restricción" value={conRestriccion} sub="requieren seguimiento" accentColor="amber" />
        <KpiCard label="EMOs por Vencer" value={emoVencer} sub="próximos 30 días" accentColor="red" />
        <KpiCard label="EPP Entregado" value={`${pctEpp}%`} sub={`${workers.filter(w => w.epp_recibido).length} de ${workers.length}`} accentColor="emerald" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-4">Indicadores de Cumplimiento</div>
          <div className="space-y-3">
            {[{ label: "% EPP entregado", value: pctEpp, color: "emerald" }, { label: "% Aptitud Médica Vigente", value: pctAptitud, color: "purple" }, { label: "% Capacitaciones realizadas", value: trainings.length ? Math.round((trainings.filter(t => (t.asistencia_count || 0) > 0).length / trainings.length) * 100) : 0, color: "blue" }].map((item) => (
              <div key={item.label}><div className="flex justify-between text-xs text-gray-500 mb-1.5"><span>{item.label}</span><span className="text-white font-medium">{item.value}%</span></div><ProgressBar value={item.value} color={item.color} height="h-2" /></div>
            ))}
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-4">Últimas Capacitaciones</div>
          <div className="space-y-3">
            {trainings.slice(0, 4).map((t) => { const pct = t.programados > 0 ? Math.round(((t.asistencia_count || 0) / t.programados) * 100) : 0; return (<div key={t.id} className="flex items-center gap-3"><div className="flex-1 min-w-0 text-sm text-gray-400 truncate">{t.nombre}</div><div className="w-20"><ProgressBar value={pct} color={pct >= 80 ? "emerald" : pct >= 40 ? "amber" : "red"} /></div><div className="text-xs text-gray-600 w-8 text-right">{pct}%</div></div>); })}
            {trainings.length === 0 && <div className="text-xs text-gray-600">No hay capacitaciones registradas</div>}
          </div>
        </div>
      </div>
      {emoVencidos.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><AlertTriangle size={15} className="text-red-400" /> Alertas — EMO Vencido</div>
          <div className="space-y-2">
            {emoVencidos.map((w) => (<div key={w.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-red-900/20 border border-red-900/40 text-sm"><AlertTriangle size={14} className="text-red-400 shrink-0" /><span className="text-white font-medium">{w.nombre}</span><span className="text-red-400">— Vigente hasta: {calcularVigencia(w.ultima_emo, w.duracion_emo)}</span><Badge color="amber">{w.cargo}</Badge></div>))}
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
  const [filter, setFilter] = useState({ text: "", estado: "", aptitud: "", cargo: "", epp: "" });
  const [modal, setModal] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [form, setForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const canSeeMedical = ["ADMIN", "MEDICO"].includes(role);
  const canEditEmo = role !== "SEGURIDAD";
  const cargos = [...new Set(workers.map((w) => w.cargo).filter(Boolean))].sort();

  const filtered = workers.filter((w) => {
    const t = filter.text.toLowerCase();
    return (!t || w.nombre.toLowerCase().includes(t) || (w.dni || "").includes(t))
      && (!filter.estado || w.estado === filter.estado)
      && (!filter.aptitud || w.aptitud === filter.aptitud)
      && (!filter.cargo || w.cargo === filter.cargo)
      && (!filter.epp || (filter.epp === "si" ? w.epp_recibido : !w.epp_recibido));
  });

  const openModal = (worker = null) => {
    setForm(worker || { nombre: "", dni: "", cargo: "", celular: "", sede: "Lima", estado: "Activo", fecha_nacimiento: "", ultima_emo: "", duracion_emo: "Anual", aptitud: "No evaluado", restriccion_medica: "Ninguna", lectura_emo: "", epp_recibido: false, epp_detalle: "", epp_fecha: "" });
    setModal(worker ? "edit" : "new");
  };

  const saveWorker = async () => {
    if (!form.nombre || !form.dni) { showToast("Nombre y DNI son requeridos", "error"); return; }
    setIsSaving(true);
    const vigencia = calcularVigencia(form.ultima_emo, form.duracion_emo);
    const edad = calcularEdad(form.fecha_nacimiento);
    const payload = {
      nombre: form.nombre, dni: form.dni, cargo: form.cargo || "", celular: form.celular || null,
      sede: "Lima", estado: form.estado || "Activo",
      fecha_nacimiento: form.fecha_nacimiento || null, edad,
      ultima_emo: form.ultima_emo || null, duracion_emo: form.duracion_emo || "Anual",
      vencimiento_emo: vigencia, lectura_emo: form.lectura_emo || null,
      aptitud: form.aptitud || "No evaluado", restriccion_medica: form.restriccion_medica || "Ninguna",
      epp_recibido: form.epp_recibido || false, epp_detalle: form.epp_detalle || null, epp_fecha: form.epp_fecha || null,
    };
    if (modal === "edit") {
      const { error } = await supabase.from("trabajadores").update(payload).eq("id", form.id);
      if (error) { showToast("Error: " + error.message, "error"); setIsSaving(false); return; }
      setWorkers((prev) => prev.map((w) => w.id === form.id ? { ...form, ...payload } : w));
      showToast("Trabajador actualizado", "success");
    } else {
      const { data, error } = await supabase.from("trabajadores").insert([payload]).select().single();
      if (error) { showToast("Error: " + error.message, "error"); setIsSaving(false); return; }
      setWorkers((prev) => [...prev, data]);
      showToast("Trabajador registrado", "success");
    }
    setIsSaving(false); setModal(null);
  };

  const deleteWorker = async (id) => {
    if (!confirm("¿Eliminar este trabajador?")) return;
    setIsDeleting(id);
    const { error } = await supabase.from("trabajadores").delete().eq("id", id);
    if (error) { showToast("Error: " + error.message, "error"); setIsDeleting(null); return; }
    setWorkers((prev) => prev.filter((w) => w.id !== id));
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
    const valid = rows.filter((r) => r["APELLIDO Y NOMBRE"] && r["DOC. DE IDENTIDAD"]);
    if (valid.length === 0) { showToast("Archivo inválido. Verifica los encabezados.", "error"); return; }
    const inserts = valid.map((r) => {
      const ultimaEmo = excelDateToISO(r["ULTIMA EMO"]);
      const duracion = r["DURACION DE EMO"] || "Anual";
      return {
        nombre: r["APELLIDO Y NOMBRE"],
        dni: String(r["DOC. DE IDENTIDAD"]).replace(/\D/g, "").slice(0, 8),
        cargo: r["PUESTO"] || "",
        celular: String(r["CELULAR"] || "").replace(/\D/g, "").slice(0, 12) || null,
        sede: "Lima", estado: r["ESTADO"] || "Activo",
        fecha_nacimiento: excelDateToISO(r["FECHA DE NACIMIENTO"]),
        edad: calcularEdad(excelDateToISO(r["FECHA DE NACIMIENTO"])),
        ultima_emo: ultimaEmo, duracion_emo: duracion,
        vencimiento_emo: calcularVigencia(ultimaEmo, duracion),
        lectura_emo: excelDateToISO(r["LECTURA 2026"]),
        aptitud: r["APTITUD"] || "No evaluado",
        restriccion_medica: r["RESTRICCION"] || "Ninguna",
        epp_recibido: String(r["EPP RECIBIDO"] || "").toUpperCase() === "SI",
        epp_detalle: r["EPP DETALLE"] || null,
        epp_fecha: excelDateToISO(r["EPP FECHA"]),
      };
    });
    const { data, error } = await supabase.from("trabajadores").insert(inserts).select();
    if (error) { showToast("Error al importar: " + error.message, "error"); return; }
    setWorkers((prev) => [...prev, ...data]);
    showToast(`${data.length} trabajadores importados correctamente`, "success");
  };

  const exportExcel = () => {
    const headers = ["APELLIDO Y NOMBRE", "FECHA DE NACIMIENTO", "EDAD", "DOC. DE IDENTIDAD", "PUESTO", "CELULAR", "ULTIMA EMO", "DURACION DE EMO", "VIGENTE HASTA", "ESTADO", "APTITUD", ...(canSeeMedical ? ["RESTRICCION"] : []), "LECTURA 2026", "EPP RECIBIDO", "EPP DETALLE", "EPP FECHA"];
    const data = filtered.map((w) => {
      const vigencia = calcularVigencia(w.ultima_emo, w.duracion_emo);
      return [w.nombre, w.fecha_nacimiento || "", calcularEdad(w.fecha_nacimiento) || "", w.dni, w.cargo || "", w.celular || "", w.ultima_emo || "", w.duracion_emo || "", vigencia || "", w.estado, w.aptitud, ...(canSeeMedical ? [w.restriccion_medica || ""] : []), w.lectura_emo || "", w.epp_recibido ? "SI" : "NO", w.epp_detalle || "", w.epp_fecha || ""];
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Directorio");
    XLSX.writeFile(wb, "sabana_personal_mprecicla.xlsx");
    showToast("Excel descargado", "success");
  };

  const aptitudColor = { "Apto": "green", "Apto con restricción": "amber", "No apto": "red", "No evaluado": "gray" };

  return (
    <div>
      {showGuide && <ImportGuideModal onClose={() => setShowGuide(false)} />}

      <div className="flex items-center justify-between mb-4">
        <div><div className="text-sm font-semibold text-white">Sábana de Personal</div><div className="text-xs text-gray-600">{filtered.length} de {workers.length} trabajadores · Lima</div></div>
        <div className="flex gap-2 flex-wrap">
          <Btn size="sm" onClick={() => setShowGuide(true)}><HelpCircle size={13} /> Guía de Importación</Btn>
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-all cursor-pointer"><Upload size={13} /> Importar Excel/CSV</span>
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={importCSV} />
          </label>
          <Btn size="sm" onClick={exportExcel}><Download size={13} /> Exportar Sábana</Btn>
          <Btn size="sm" variant="primary" onClick={() => openModal()}><Plus size={13} /> Registrar</Btn>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex gap-2 flex-wrap mb-4">
        <Input placeholder="Buscar nombre o DNI..." value={filter.text} onChange={(e) => setFilter((f) => ({ ...f, text: e.target.value }))} style={{ flex: 1, minWidth: 160 }} />
        <Select value={filter.cargo} onChange={(e) => setFilter((f) => ({ ...f, cargo: e.target.value }))} style={{ width: 180 }}>
          <option value="">Todos los puestos</option>
          {cargos.map((c) => <option key={c}>{c}</option>)}
        </Select>
        <Select value={filter.estado} onChange={(e) => setFilter((f) => ({ ...f, estado: e.target.value }))} style={{ width: 150 }}>
          <option value="">Todos los estados</option>
          {["Activo", "Vacaciones", "Inactivo"].map((s) => <option key={s}>{s}</option>)}
        </Select>
        <Select value={filter.aptitud} onChange={(e) => setFilter((f) => ({ ...f, aptitud: e.target.value }))} style={{ width: 180 }}>
          <option value="">Toda aptitud</option>
          {["Apto", "Apto con restricción", "No apto", "No evaluado"].map((a) => <option key={a}>{a}</option>)}
        </Select>
        <Select value={filter.epp} onChange={(e) => setFilter((f) => ({ ...f, epp: e.target.value }))} style={{ width: 140 }}>
          <option value="">EPP: Todos</option>
          <option value="si">Con EPP</option>
          <option value="no">Sin EPP</option>
        </Select>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {["Apellido y Nombre", "F. Nacimiento / Edad", "DNI", "Puesto", "Celular", "Última EMO", "Duración", "Vigente Hasta", "Estado", "Aptitud", "EPP", "Lectura EMO", ...(canSeeMedical ? ["Restricción"] : []), ""].map((h) => (
                  <th key={h} className="text-left text-xs text-gray-600 font-medium px-3 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => {
                const vigencia = calcularVigencia(w.ultima_emo, w.duracion_emo);
                const isVenc = vigencia && new Date(vigencia) < new Date();
                const in30 = new Date(); in30.setDate(in30.getDate() + 30);
                const soonVenc = !isVenc && vigencia && new Date(vigencia) <= in30;
                const edad = calcularEdad(w.fecha_nacimiento);
                return (
                  <tr key={w.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-3 py-3"><div className="font-medium text-white whitespace-nowrap">{w.nombre}</div></td>
                    <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">{w.fecha_nacimiento || "—"}{edad ? <div className="text-gray-600">{edad} años</div> : null}</td>
                    <td className="px-3 py-3 font-mono text-xs text-gray-500">{w.dni}</td>
                    <td className="px-3 py-3 text-gray-400 whitespace-nowrap">{w.cargo || "—"}</td>
                    <td className="px-3 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">{w.celular || "—"}</td>
                    <td className="px-3 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{w.ultima_emo || "—"}</td>
                    <td className="px-3 py-3"><Badge color={w.duracion_emo === "Bianual" ? "purple" : "blue"}>{w.duracion_emo || "Anual"}</Badge></td>
                    <td className={`px-3 py-3 font-mono text-xs whitespace-nowrap font-medium ${isVenc ? "text-red-400" : soonVenc ? "text-amber-400" : "text-gray-400"}`}>{vigencia || "—"}</td>
                    <td className="px-3 py-3"><Badge color={w.estado === "Activo" ? "green" : "amber"}>{w.estado}</Badge></td>
                    <td className="px-3 py-3"><Badge color={aptitudColor[w.aptitud] || "gray"}>{w.aptitud}</Badge></td>
                    <td className="px-3 py-3">{w.epp_recibido ? <div><Badge color="green">✓ Sí</Badge>{w.epp_detalle && <div className="text-xs text-gray-600 mt-0.5 max-w-32 truncate">{w.epp_detalle}</div>}</div> : <Badge color="gray">No</Badge>}</td>
                    <td className="px-3 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{w.lectura_emo || "—"}</td>
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

      {modal && (
        <Modal title={modal === "edit" ? "Editar Trabajador" : "Registrar Trabajador"} onClose={() => setModal(null)} wide>
          <div className="grid grid-cols-2 gap-x-4">
            <div className="col-span-2"><FormField label="Apellido y Nombre"><Input value={form.nombre || ""} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="García López Juan Carlos" /></FormField></div>
            <FormField label="DNI (solo números)"><Input value={form.dni || ""} maxLength={8} onChange={(e) => { const val = e.target.value.replace(/\D/g, ""); setForm((f) => ({ ...f, dni: val })); }} placeholder="12345678" /></FormField>
            <FormField label="Celular"><Input value={form.celular || ""} maxLength={12} onChange={(e) => { const val = e.target.value.replace(/\D/g, ""); setForm((f) => ({ ...f, celular: val })); }} placeholder="999888777" /></FormField>
            <FormField label="Puesto / Cargo"><Input value={form.cargo || ""} onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))} /></FormField>
            <FormField label="Fecha de Nacimiento"><Input type="date" value={form.fecha_nacimiento || ""} onChange={(e) => setForm((f) => ({ ...f, fecha_nacimiento: e.target.value }))} /></FormField>
            <FormField label="Estado"><Select value={form.estado || "Activo"} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}><option>Activo</option><option>Vacaciones</option><option>Inactivo</option></Select></FormField>
            <FormField label="Sede"><Input value="Lima" disabled className="opacity-50" /></FormField>
          </div>

          {/* EMO */}
          <div className="border border-gray-800 rounded-xl p-3 mb-3">
            <div className="text-xs font-semibold text-gray-300 mb-3">Examen Médico Ocupacional (EMO)</div>
            {canEditEmo ? (
              <div className="grid grid-cols-2 gap-x-4">
                <FormField label="Última EMO"><Input type="date" value={form.ultima_emo || ""} onChange={(e) => setForm((f) => ({ ...f, ultima_emo: e.target.value }))} /></FormField>
                <FormField label="Duración EMO"><Select value={form.duracion_emo || "Anual"} onChange={(e) => setForm((f) => ({ ...f, duracion_emo: e.target.value }))}><option>Anual</option><option>Bianual</option></Select></FormField>
                <FormField label="Vigente Hasta (calculado automático)">
                  <Input value={calcularVigencia(form.ultima_emo, form.duracion_emo) || "—"} disabled className="opacity-60 bg-gray-700" />
                </FormField>
                <FormField label="Lectura de Resultados EMO"><Input type="date" value={form.lectura_emo || ""} onChange={(e) => setForm((f) => ({ ...f, lectura_emo: e.target.value }))} /></FormField>
                <FormField label="Aptitud Médica"><Select value={form.aptitud || "No evaluado"} onChange={(e) => setForm((f) => ({ ...f, aptitud: e.target.value }))}><option>Apto</option><option>Apto con restricción</option><option>No apto</option><option>No evaluado</option></Select></FormField>
              </div>
            ) : (
              <div className="px-3 py-2.5 rounded-lg bg-amber-900/20 border border-amber-900/40 text-xs text-amber-400 flex items-center gap-2"><Lock size={12} /> Los campos de EMO solo pueden editarlos MEDICO o ADMIN</div>
            )}
          </div>

          {/* EPP */}
          <div className="border border-gray-800 rounded-xl p-3 mb-3">
            <div className="text-xs font-semibold text-gray-300 mb-3">Equipos de Protección Personal (EPP)</div>
            <div className="grid grid-cols-2 gap-x-4">
              <FormField label="¿Recibió EPP?"><Select value={form.epp_recibido ? "si" : "no"} onChange={(e) => setForm((f) => ({ ...f, epp_recibido: e.target.value === "si" }))}><option value="no">No</option><option value="si">Sí</option></Select></FormField>
              <FormField label="Fecha de entrega EPP"><Input type="date" value={form.epp_fecha || ""} onChange={(e) => setForm((f) => ({ ...f, epp_fecha: e.target.value }))} /></FormField>
              <div className="col-span-2"><FormField label="Detalle de EPP entregado"><Input value={form.epp_detalle || ""} onChange={(e) => setForm((f) => ({ ...f, epp_detalle: e.target.value }))} placeholder="Ej. Casco, guantes, lentes, chaleco..." /></FormField></div>
            </div>
          </div>

          {canSeeMedical && <FormField label="Detalle Restricción Médica" confidential><Input value={form.restriccion_medica || ""} onChange={(e) => setForm((f) => ({ ...f, restriccion_medica: e.target.value }))} /></FormField>}
          <div className="flex gap-2 justify-end mt-4"><Btn onClick={() => setModal(null)}>Cancelar</Btn><Btn variant="primary" disabled={isSaving} onClick={saveWorker}>{isSaving ? "Guardando..." : "Guardar"}</Btn></div>
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
  useEffect(() => { if (detail) loadAttendance(detail); }, [detail]);
  const loadAttendance = async (id) => {
    const { data } = await supabase.from("asistencias").select("trabajador_id, presente").eq("capacitacion_id", id);
    const map = {}; (data || []).forEach((a) => { map[a.trabajador_id] = a.presente; }); setAttendance(map);
  };
  const toggleAttendance = async (tid, wid, checked) => {
    const { error } = await supabase.from("asistencias").upsert({ capacitacion_id: tid, trabajador_id: wid, presente: checked }, { onConflict: "capacitacion_id,trabajador_id" });
    if (error) { showToast("Error al guardar asistencia", "error"); return; }
    setAttendance((prev) => ({ ...prev, [wid]: checked }));
    showToast(checked ? "Asistencia marcada" : "Ausencia registrada", checked ? "success" : "info");
  };
  const deleteTraining = async (id) => {
    if (!confirm("¿Eliminar esta capacitación?")) return;
    setIsDeleting(id);
    const { error } = await supabase.from("capacitaciones").delete().eq("id", id);
    if (error) { showToast("Error al eliminar", "error"); setIsDeleting(null); return; }
    setTrainings((prev) => prev.filter((t) => t.id !== id)); showToast("Capacitación eliminada", "success"); setIsDeleting(null);
  };
  const importAttendanceCSV = (e, tid) => {
    const file = e.target.files[0]; if (!file) return;
    Papa.parse(file, { header: true, complete: async (results) => {
      const dnis = results.data.map((r) => String(r.DNI || r.dni || "").replace(/\D/g, "")).filter(Boolean);
      if (!dnis.length) { showToast("CSV inválido: columna 'DNI' requerida", "error"); return; }
      const matched = workers.filter((w) => dnis.includes(w.dni));
      for (const w of matched) await supabase.from("asistencias").upsert({ capacitacion_id: tid, trabajador_id: w.id, presente: true }, { onConflict: "capacitacion_id,trabajador_id" });
      await loadAttendance(tid);
      showToast(`${matched.length} asistencias marcadas`, "success");
    }});
    e.target.value = "";
  };
  const exportAttendance = (t) => {
    const active = workers.filter((w) => w.estado === "Activo");
    const data = active.map((w) => ({ Nombre: w.nombre, DNI: w.dni, Cargo: w.cargo, Asistencia: attendance[w.id] ? "Presente" : "Ausente" }));
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Asistencia"); XLSX.writeFile(wb, `asistencia_${t.nombre.replace(/\s+/g, "_")}.xlsx`);
    showToast("Excel descargado", "success");
  };
  if (detail) {
    const t = trainings.find((x) => x.id === detail); if (!t) { setDetail(null); return null; }
    const active = workers.filter((w) => w.estado === "Activo");
    const presentCount = Object.values(attendance).filter(Boolean).length;
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <Btn size="sm" onClick={() => setDetail(null)}><ChevronLeft size={13} /> Volver</Btn>
          <div><div className="text-sm font-semibold text-white">{t.nombre}</div><div className="text-xs text-gray-600">Fecha: {t.fecha} · {presentCount}/{active.length} presentes</div></div>
          <div className="ml-auto flex gap-2">
            <label className="cursor-pointer"><span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-all cursor-pointer"><Upload size={13} /> Importar CSV</span><input type="file" accept=".csv" className="hidden" onChange={(e) => importAttendanceCSV(e, detail)} /></label>
            <Btn size="sm" onClick={() => exportAttendance(t)}><Download size={13} /> Exportar</Btn>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800"><th className="px-4 py-3 w-10"><input type="checkbox" className="accent-blue-500" onChange={async (e) => { for (const w of active) await toggleAttendance(detail, w.id, e.target.checked); }} /></th>{["Nombre", "DNI", "Cargo", "Asistencia"].map((h) => <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody>{active.map((w) => { const present = !!attendance[w.id]; return (<tr key={w.id} className="border-b border-gray-800/50 hover:bg-gray-800/30"><td className="px-4 py-3"><input type="checkbox" className="accent-blue-500" checked={present} onChange={(e) => toggleAttendance(detail, w.id, e.target.checked)} /></td><td className="px-4 py-3 font-medium text-white">{w.nombre}</td><td className="px-4 py-3 font-mono text-xs text-gray-600">{w.dni}</td><td className="px-4 py-3 text-gray-400">{w.cargo}</td><td className="px-4 py-3"><Badge color={present ? "green" : "gray"}>{present ? "Presente" : "Ausente"}</Badge></td></tr>); })}</tbody>
          </table>
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div><div className="text-sm font-semibold text-white">Plan de Capacitaciones</div><div className="text-xs text-gray-600">{trainings.length} capacitaciones</div></div>
        <Btn size="sm" variant="primary" onClick={async () => {
          const nombre = prompt("Nombre de la capacitación:"); if (!nombre) return;
          const fecha = prompt("Fecha (YYYY-MM-DD):"); if (!fecha) return;
          const { data, error } = await supabase.from("capacitaciones").insert([{ nombre, fecha, programados: workers.filter((w) => w.estado === "Activo").length }]).select().single();
          if (error) { showToast("Error: " + error.message, "error"); return; }
          setTrainings((prev) => [...prev, { ...data, asistencia_count: 0 }]); showToast("Capacitación creada", "success");
        }}><Plus size={13} /> Nueva</Btn>
      </div>
      <div className="space-y-2">
        {trainings.map((t) => { const pct = t.programados > 0 ? Math.round(((t.asistencia_count || 0) / t.programados) * 100) : 0; return (
          <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-4">
            <div className="flex-1 min-w-0"><div className="font-medium text-white text-sm">{t.nombre}</div><div className="text-xs text-gray-600 mt-0.5">{t.fecha}</div></div>
            <div className="flex items-center gap-3 w-48"><div className="flex-1"><ProgressBar value={pct} color={pct >= 80 ? "emerald" : pct >= 40 ? "amber" : "red"} /></div><span className="text-xs text-gray-500 whitespace-nowrap">{t.asistencia_count || 0}/{t.programados} ({pct}%)</span></div>
            <Btn size="sm" onClick={() => setDetail(t.id)}>Ver detalle <ChevronRight size={12} /></Btn>
            <Btn size="sm" variant="danger" disabled={isDeleting === t.id} onClick={() => deleteTraining(t.id)}><Trash2 size={12} /></Btn>
          </div>
        ); })}
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
  const [form, setForm] = useState({ nombre: "", categoria: "Seguridad", version: "v1", sourceType: "url" });
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
    setDocs((prev) => [data, ...prev]); showToast("Documento registrado", "success"); setIsSaving(false); setModal(false);
  };
  const deleteDoc = async (id) => {
    if (!confirm("¿Eliminar este documento?")) return;
    setIsDeleting(id);
    const { error } = await supabase.from("documentos").delete().eq("id", id);
    if (error) { showToast("Error", "error"); setIsDeleting(null); return; }
    setDocs((prev) => prev.filter((d) => d.id !== id)); showToast("Eliminado", "success"); setIsDeleting(null);
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div><div className="text-sm font-semibold text-white">Centro Documental</div><div className="text-xs text-gray-600">Documentos SIG — ISO 45001</div></div>
        <Btn size="sm" variant="primary" onClick={() => setModal(true)}><Plus size={13} /> Agregar</Btn>
      </div>
      <div className="flex gap-1 border-b border-gray-800 mb-4">{[{ label: `Todos (${docs.length})`, val: "" }, ...cats.map((c) => ({ label: `${c} (${docs.filter((d) => d.categoria === c).length})`, val: c }))].map((tab) => (<button key={tab.val} onClick={() => setCatFilter(tab.val)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${catFilter === tab.val ? "border-blue-500 text-blue-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>{tab.label}</button>))}</div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800">{["Documento", "Categoría", "Versión", "Fecha", ""].map((h) => <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((d) => (<tr key={d.id} className="border-b border-gray-800/50 hover:bg-gray-800/30"><td className="px-4 py-3 font-medium text-white">{d.nombre}</td><td className="px-4 py-3"><Badge color={catColor[d.categoria] || "gray"}>{d.categoria}</Badge></td><td className="px-4 py-3 font-mono text-xs text-gray-600">{d.version}</td><td className="px-4 py-3 text-xs text-gray-600">{d.fecha}</td><td className="px-4 py-3"><div className="flex gap-1">{d.url_externa && <Btn size="sm" onClick={() => window.open(d.url_externa, "_blank")}>↗ Ver</Btn>}<Btn size="sm" variant="danger" disabled={isDeleting === d.id} onClick={() => deleteDoc(d.id)}><Trash2 size={12} /></Btn></div></td></tr>))}
            {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600 text-sm">No hay documentos</td></tr>}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title="Agregar Documento" onClose={() => setModal(false)}>
          <FormField label="Nombre del Documento"><Input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} /></FormField>
          <FormField label="Categoría"><Select value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}>{cats.map((c) => <option key={c}>{c}</option>)}</Select></FormField>
          <FormField label="Versión"><Input value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} placeholder="v1" /></FormField>
          <FormField label="URL del documento"><Input placeholder="https://..." value={form.url || ""} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} /></FormField>
          <div className="flex gap-2 justify-end mt-4"><Btn onClick={() => setModal(false)}>Cancelar</Btn><Btn variant="primary" disabled={isSaving} onClick={saveDoc}>{isSaving ? "Guardando..." : "Guardar"}</Btn></div>
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
  const [filterNombre, setFilterNombre] = useState("");
  const [form, setForm] = useState({ nombre: "", mes: "", fecha: "", real: 0, meta: 100, unidad: "%" });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const meses = [...new Set(kpis.map((k) => k.mes).filter(Boolean))];
  const filtered = kpis.filter((k) => (!filterMes || k.mes === filterMes) && (!filterNombre || k.nombre.toLowerCase().includes(filterNombre.toLowerCase())));
  const isKpiMet = (k) => { const val = k.real ?? k.valor_real ?? 0; return k.meta === 0 ? val === 0 : (k.nombre.toLowerCase().includes("frecuencia") || k.nombre.toLowerCase().includes("accidente") ? val <= k.meta : val >= k.meta); };
  const saveKpi = async () => {
    if (!form.nombre) { showToast("El nombre es requerido", "error"); return; }
    setIsSaving(true);
    const { data, error } = await supabase.from("kpis").insert([{ nombre: form.nombre, mes: form.mes || "", fecha: form.fecha || null, valor_real: parseFloat(form.real) || 0, meta: parseFloat(form.meta) || 0, unidad: form.unidad || "" }]).select().single();
    if (error) { showToast("Error: " + error.message, "error"); setIsSaving(false); return; }
    setKpis((prev) => [...prev, { ...data, real: data.valor_real }]); showToast("KPI registrado", "success"); setIsSaving(false); setModal(false);
  };
  const deleteKpi = async (id) => {
    if (!confirm("¿Eliminar este KPI?")) return;
    setIsDeleting(id);
    const { error } = await supabase.from("kpis").delete().eq("id", id);
    if (error) { showToast("Error", "error"); setIsDeleting(null); return; }
    setKpis((prev) => prev.filter((k) => k.id !== id)); showToast("KPI eliminado", "success"); setIsDeleting(null);
  };
  const exportKpis = () => {
    const data = filtered.map((k) => { const val = k.real ?? k.valor_real ?? 0; return { Indicador: k.nombre, Mes: k.mes, Fecha: k.fecha || "", "Valor Real": val, Meta: k.meta, Unidad: k.unidad, Cumplido: isKpiMet(k) ? "Sí" : "No" }; });
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "KPIs"); XLSX.writeFile(wb, "kpis_ssoma.xlsx"); showToast("Excel descargado", "success");
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div><div className="text-sm font-semibold text-white">Gestión de KPIs</div><div className="text-xs text-gray-600">{filtered.length} indicadores</div></div>
        <div className="flex gap-2"><Btn size="sm" onClick={exportKpis}><Download size={13} /> Exportar</Btn><Btn size="sm" variant="primary" onClick={() => setModal(true)}><Plus size={13} /> Registrar Métrica</Btn></div>
      </div>
      <div className="flex gap-2 flex-wrap mb-4">
        <Filter size={13} className="text-gray-600 shrink-0 self-center" />
        <Select value={filterMes} onChange={(e) => setFilterMes(e.target.value)} style={{ width: 160 }}><option value="">Todos los meses</option>{meses.map((m) => <option key={m}>{m}</option>)}</Select>
        <Input placeholder="Buscar indicador..." value={filterNombre} onChange={(e) => setFilterNombre(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {filtered.map((k) => { const val = k.real ?? k.valor_real ?? 0; const ok = isKpiMet(k); return (
          <div key={k.id} className={`bg-gray-900 border border-gray-800 border-l-4 rounded-xl p-4 relative ${ok ? "border-l-emerald-500" : "border-l-red-500"}`}>
            <button onClick={() => deleteKpi(k.id)} disabled={isDeleting === k.id} className="absolute top-2 right-2 text-gray-700 hover:text-red-400"><Trash2 size={12} /></button>
            <div className="text-xs text-gray-500 mb-1 pr-4">{k.nombre}</div>
            <div className={`text-2xl font-semibold ${ok ? "text-emerald-400" : "text-red-400"}`}>{val}{k.unidad}</div>
            <div className="text-xs text-gray-600 mt-0.5">Meta: {k.meta}{k.unidad}</div>
            {k.mes && <div className="text-xs text-gray-700 mt-0.5">{k.mes}{k.fecha ? ` · ${k.fecha}` : ""}</div>}
            <div className="mt-2"><ProgressBar value={k.meta > 0 ? Math.min(Math.round((val / k.meta) * 100), 100) : 100} color={ok ? "emerald" : "red"} /></div>
            <div className={`text-xs mt-1.5 font-medium ${ok ? "text-emerald-500" : "text-red-500"}`}>{ok ? "✓ Cumplido" : "✕ No cumplido"}</div>
          </div>
        ); })}
      </div>
      {filtered.length === 0 && <div className="text-center py-12 text-gray-600 text-sm">No hay KPIs. Haz clic en "Registrar Métrica".</div>}
      {modal && (
        <Modal title="Registrar Métrica" onClose={() => setModal(false)}>
          <FormField label="Nombre del Indicador"><Input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej. Índice de Frecuencia" /></FormField>
          <FormField label="Mes"><Input value={form.mes} onChange={(e) => setForm((f) => ({ ...f, mes: e.target.value }))} placeholder="Abril 2025" /></FormField>
          <FormField label="Fecha"><Input type="date" value={form.fecha} onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))} /></FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Valor Real"><Input type="number" value={form.real} onChange={(e) => setForm((f) => ({ ...f, real: e.target.value }))} /></FormField>
            <FormField label="Meta"><Input type="number" value={form.meta} onChange={(e) => setForm((f) => ({ ...f, meta: e.target.value }))} /></FormField>
          </div>
          <FormField label="Unidad (%, días, etc)"><Input value={form.unidad} onChange={(e) => setForm((f) => ({ ...f, unidad: e.target.value }))} placeholder="%" /></FormField>
          <div className="flex gap-2 justify-end mt-4"><Btn onClick={() => setModal(false)}>Cancelar</Btn><Btn variant="primary" disabled={isSaving} onClick={saveKpi}>{isSaving ? "Guardando..." : "Guardar"}</Btn></div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// VIGILANCIA MÉDICA
// ═══════════════════════════════════════════
function Vigilancia({ workers }) {
  const [tab, setTab] = useState("emos");
  const [records, setRecords] = useState([]);
  useEffect(() => { supabase.from("registros_medicos").select("*, trabajadores(nombre)").then(({ data }) => setRecords(data || [])); }, []);
  const tabs = [{ id: "emos", label: "Programación EMOs" }, { id: "descansos", label: "Descansos Médicos" }, { id: "morbilidad", label: "Morbilidad" }];
  const now = new Date(); const in30 = new Date(); in30.setDate(in30.getDate() + 30);
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="text-sm font-semibold text-white">Vigilancia Médica</div>
        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-purple-900/40 text-purple-400 border border-purple-800"><Lock size={11} /> MEDICO / ADMIN</span>
        <Btn size="sm" variant="primary" className="ml-auto" onClick={() => showToast("Función en desarrollo", "info")}><Plus size={13} /> Nuevo Registro</Btn>
      </div>
      <div className="flex gap-1 border-b border-gray-800 mb-4">{tabs.map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t.id ? "border-blue-500 text-blue-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>{t.label}</button>)}</div>
      {tab === "emos" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800">{["Trabajador", "Última EMO", "Duración", "Vigente Hasta", "Lectura EMO", "Estado", "Aptitud"].map((h) => <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>{[...workers].filter((w) => w.estado === "Activo").sort((a, b) => { const va = calcularVigencia(a.ultima_emo, a.duracion_emo) || ""; const vb = calcularVigencia(b.ultima_emo, b.duracion_emo) || ""; return va.localeCompare(vb); }).map((w) => {
              const vigencia = calcularVigencia(w.ultima_emo, w.duracion_emo);
              const isVenc = vigencia && new Date(vigencia) < now;
              const soonVenc = !isVenc && vigencia && new Date(vigencia) <= in30;
              return (<tr key={w.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3 font-medium text-white">{w.nombre}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{w.ultima_emo || "—"}</td>
                <td className="px-4 py-3"><Badge color={w.duracion_emo === "Bianual" ? "purple" : "blue"}>{w.duracion_emo || "Anual"}</Badge></td>
                <td className={`px-4 py-3 font-mono text-xs font-medium ${isVenc ? "text-red-400" : soonVenc ? "text-amber-400" : "text-gray-400"}`}>{vigencia || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{w.lectura_emo || "—"}</td>
                <td className="px-4 py-3"><Badge color={isVenc ? "red" : soonVenc ? "amber" : "green"}>{isVenc ? "Vencido" : soonVenc ? "Por vencer" : "Vigente"}</Badge></td>
                <td className="px-4 py-3"><Badge color={w.aptitud === "Apto" ? "green" : w.aptitud === "Apto con restricción" ? "amber" : "gray"}>{w.aptitud}</Badge></td>
              </tr>);
            })}</tbody>
          </table>
        </div>
      )}
      {tab === "descansos" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800">{["Trabajador", "Tipo", "Inicio", "Fin", "Diagnóstico", "Médico"].map((h) => <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody>{records.filter((r) => r.tipo === "Descanso Médico").map((m) => (<tr key={m.id} className="border-b border-gray-800/50"><td className="px-4 py-3 font-medium text-white">{m.trabajadores?.nombre || "—"}</td><td className="px-4 py-3"><Badge color="red">{m.tipo}</Badge></td><td className="px-4 py-3 font-mono text-xs text-gray-600">{m.fecha_inicio}</td><td className="px-4 py-3 font-mono text-xs text-gray-600">{m.fecha_fin}</td><td className="px-4 py-3 text-gray-400">{m.diagnostico}</td><td className="px-4 py-3 text-gray-600">{m.medico_responsable}</td></tr>))}{!records.filter(r => r.tipo === "Descanso Médico").length && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-600 text-sm">No hay descansos médicos registrados</td></tr>}</tbody>
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
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ data: { session } }) => { setSession(session); setLoading(false); window.history.replaceState(null, "", window.location.pathname); });
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false); });
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase.from("trabajadores").select("*").then(({ data }) => setWorkers(data || []));
    supabase.from("capacitaciones").select("*, asistencias(count)").then(({ data }) => setTrainings((data || []).map((t) => ({ ...t, asistencia_count: t.asistencias?.[0]?.count || 0 }))));
    supabase.from("documentos").select("*").then(({ data }) => setDocs(data || []));
    supabase.from("kpis").select("*").then(({ data }) => setKpis((data || []).map((k) => ({ ...k, real: k.valor_real }))));
  }, [session]);

  const navigate = (p) => {
    if (p === "vigilancia" && role === "SEGURIDAD") { showToast("Acceso denegado: módulo exclusivo para MEDICO/ADMIN", "error"); return; }
    setPage(p);
  };
  const logout = async () => { await supabase.auth.signOut(); };
  const pageTitles = { dashboard: "Dashboard General", directorio: "Sábana de Personal", capacitaciones: "Capacitaciones", documentos: "Centro Documental", kpis: "Gestión de KPIs", vigilancia: "Vigilancia Médica" };
  const roleColors = { ADMIN: "text-purple-400 bg-purple-900/40 border-purple-800", MEDICO: "text-emerald-400 bg-emerald-900/40 border-emerald-800", SEGURIDAD: "text-amber-400 bg-amber-900/40 border-amber-800" };

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-600 text-sm">Cargando...</div>;
  if (!session) return <><Login /><ToastContainer /></>;

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <aside className="w-56 min-w-56 bg-gray-900 border-r border-gray-800 flex flex-col overflow-y-auto">
        <div className="px-4 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5"><div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-xs font-bold">S</div><span className="font-semibold text-sm">SSOMA <span className="text-gray-500 font-normal">HSE</span></span></div>
          <div className="text-xs text-gray-600 mt-1">MP Recicla SAC</div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          <div className="text-xs text-gray-700 font-medium uppercase tracking-wider px-2 mb-2">Principal</div>
          {NAV.map(({ id, label, icon: Icon }) => (<button key={id} onClick={() => navigate(id)} className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-left ${page === id ? "bg-blue-900/40 text-blue-400" : "text-gray-500 hover:text-gray-200 hover:bg-gray-800"}`}><Icon size={16} />{label}</button>))}
          <div className="text-xs text-gray-700 font-medium uppercase tracking-wider px-2 mt-4 mb-2">Salud Ocupacional</div>
          <button onClick={() => navigate("vigilancia")} className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-left ${page === "vigilancia" ? "bg-blue-900/40 text-blue-400" : "text-gray-500 hover:text-gray-200 hover:bg-gray-800"}`}><Stethoscope size={16} />Vigilancia Médica<span className="ml-auto flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-500 border border-purple-900"><Lock size={9} />MED</span></button>
        </nav>
        <div className="p-3 border-t border-gray-800">
          <div className="text-xs text-gray-600 mb-2 px-1 truncate">{session.user.email}</div>
          <button onClick={logout} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-gray-600 hover:text-red-400 hover:bg-gray-800 transition-colors"><LogOut size={13} /> Cerrar sesión</button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between gap-4">
          <div><div className="text-sm font-semibold">{pageTitles[page]}</div><div className="text-xs text-gray-600">MP Recicla SAC · Lima</div></div>
          <div className="flex items-center gap-2">
            <select value={role} onChange={(e) => { setRole(e.target.value); showToast(`Rol: ${e.target.value}`, "info"); }} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500">
              <option value="ADMIN">ADMIN</option><option value="MEDICO">MEDICO</option><option value="SEGURIDAD">SEGURIDAD</option>
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
