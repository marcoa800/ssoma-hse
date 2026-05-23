import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import {
  LayoutDashboard, Users, BookOpen, FileText,
  BarChart2, Stethoscope, AlertTriangle,
  CheckCircle, XCircle, Info, Plus, Upload,
  Download, ChevronRight, ChevronLeft, Lock,
  Trash2, LogOut, Filter, HelpCircle, Building2,
  Settings, UserPlus, Eye, EyeOff, Pencil, FileDown,
  ClipboardList, ShieldAlert
} from "lucide-react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import jsPDF from "jspdf";
import "jspdf-autotable";

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
  const hoy = new Date(); const nac = new Date(fechaNac);
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
    if (parts.length === 3) { const [d, m, y] = parts; return `${y.length === 2 ? "20" + y : y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`; }
  }
  if (typeof val === "number") { const date = new Date((val - 25569) * 86400 * 1000); return date.toISOString().split("T")[0]; }
  return null;
}

// ═══════════════════════════════════════════
// COMPONENTES BASE
// ═══════════════════════════════════════════
function Badge({ children, color = "gray" }) {
  const colors = { green: "bg-emerald-900/60 text-emerald-400 border border-emerald-700", amber: "bg-amber-900/60 text-amber-400 border border-amber-700", red: "bg-red-900/60 text-red-400 border border-red-700", blue: "bg-blue-900/60 text-blue-400 border border-blue-700", gray: "bg-gray-800 text-gray-400 border border-gray-700", purple: "bg-purple-900/60 text-purple-400 border border-purple-700", orange: "bg-orange-900/60 text-orange-400 border border-orange-700" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>{children}</span>;
}
function ProgressBar({ value, color = "blue", height = "h-1.5" }) {
  const colors = { blue: "bg-blue-500", emerald: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500", purple: "bg-purple-500" };
  return <div className={`w-full bg-gray-800 rounded-full ${height} overflow-hidden`}><div className={`${height} rounded-full transition-all duration-500 ${colors[color]}`} style={{ width: `${Math.min(value, 100)}%` }} /></div>;
}
function KpiCard({ label, value, sub, accentColor = "blue" }) {
  const colors = { blue: "border-l-blue-500 text-blue-400", emerald: "border-l-emerald-500 text-emerald-400", green: "border-l-emerald-500 text-emerald-400", amber: "border-l-amber-500 text-amber-400", red: "border-l-red-500 text-red-400", purple: "border-l-purple-500 text-purple-400" };
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
  const variants = { default: "bg-transparent border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white", primary: "bg-blue-600 text-white hover:bg-blue-500 border border-transparent", danger: "bg-red-900/40 text-red-400 border border-red-800 hover:bg-red-900", success: "bg-emerald-900/40 text-emerald-400 border border-emerald-800 hover:bg-emerald-900" };
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} disabled={disabled} onClick={onClick}>{children}</button>;
}

function ExportBtn({ data, filename, cols }) {
  const handle = () => {
    if (!data || !data.length) { showToast("Sin datos para exportar", "info"); return; }
    const rows = cols
      ? data.map(r => { const obj = {}; cols.forEach(([key, label]) => { obj[label] = r[key] ?? ""; }); return obj; })
      : data;
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Datos");
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast("Excel exportado correctamente", "success");
  };
  return <Btn size="sm" variant="default" onClick={handle}><Download size={13} /> Exportar Excel</Btn>;
}

function FilterBar({ dateFrom, dateTo, onDateFrom, onDateTo, area = "", onArea, areaOptions = [], areaLabel = "Área" }) {
  const hasFilter = dateFrom || dateTo || area;
  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap p-3 bg-gray-900/50 border border-gray-800 rounded-xl">
      <Filter size={12} className="text-gray-500 shrink-0" />
      <span className="text-xs text-gray-500 shrink-0">Período:</span>
      <input type="date" value={dateFrom} onChange={e => onDateFrom(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500" />
      <span className="text-xs text-gray-600">—</span>
      <input type="date" value={dateTo} onChange={e => onDateTo(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500" />
      {areaOptions.length > 0 && (
        <>
          <span className="text-xs text-gray-600 ml-2">{areaLabel}:</span>
          <select value={area} onChange={e => onArea(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500">
            <option value="">Todas</option>
            {areaOptions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </>
      )}
      {hasFilter && (
        <button onClick={() => { onDateFrom(""); onDateTo(""); if (onArea) onArea(""); }} className="text-xs text-blue-400 hover:text-blue-300 ml-1">✕ Limpiar</button>
      )}
    </div>
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
  const [showPass, setShowPass] = useState(false);
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
          <div><div className="font-semibold text-white text-lg">SSOMA HSE</div><div className="text-xs text-gray-600">Sistema de Gestión Integrada</div></div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="text-sm font-semibold text-white mb-4">Iniciar Sesión</div>
          {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-900/30 border border-red-900 text-red-400 text-xs">{error}</div>}
          <FormField label="Correo electrónico"><Input type="email" placeholder="usuario@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} /></FormField>
          <FormField label="Contraseña">
            <div className="relative">
              <Input type={showPass ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} style={{ paddingRight: "36px" }} />
              <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">{showPass ? <EyeOff size={14} /> : <Eye size={14} />}</button>
            </div>
          </FormField>
          <Btn variant="primary" className="w-full justify-center mt-2" disabled={loading} onClick={handleLogin}>{loading ? "Ingresando..." : "Ingresar"}</Btn>
        </div>
        <div className="text-center mt-4 text-xs text-gray-700">SSOMA HSE — Gestión de Seguridad y Salud Ocupacional</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// PANEL SUPERADMIN
// ═══════════════════════════════════════════
function SuperAdmin() {
  const [empresas, setEmpresas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [tab, setTab] = useState("empresas");
  const [modalEmpresa, setModalEmpresa] = useState(false);
  const [modalUsuario, setModalUsuario] = useState(false);
  const [formEmpresa, setFormEmpresa] = useState({ nombre: "", ruc: "", sector: "" });
  const [formUsuario, setFormUsuario] = useState({ email: "", password: "", nombre: "", rol: "SEGURIDAD", empresa_id: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);

  useEffect(() => {
    loadEmpresas();
    loadUsuarios();
  }, []);

  const loadEmpresas = async () => {
    const { data } = await supabase.from("empresas").select("*").order("nombre");
    setEmpresas(data || []);
  };

  const loadUsuarios = async () => {
    const { data } = await supabase.from("profiles").select("*, empresas(nombre)").order("nombre");
    setUsuarios(data || []);
  };

  const saveEmpresa = async () => {
    if (!formEmpresa.nombre) { showToast("El nombre es requerido", "error"); return; }
    setIsSaving(true);
    const { error } = await supabase.from("empresas").insert([{ nombre: formEmpresa.nombre, ruc: formEmpresa.ruc || null, sector: formEmpresa.sector || null }]);
    if (error) { showToast("Error: " + error.message, "error"); setIsSaving(false); return; }
    showToast("Empresa creada", "success");
    setIsSaving(false); setModalEmpresa(false);
    setFormEmpresa({ nombre: "", ruc: "", sector: "" });
    loadEmpresas();
  };

  const toggleEmpresa = async (id, activa) => {
    await supabase.from("empresas").update({ activa: !activa }).eq("id", id);
    loadEmpresas();
    showToast(activa ? "Empresa desactivada" : "Empresa activada", "info");
  };

  const deleteEmpresa = async (id) => {
    if (!confirm("¿Eliminar esta empresa? Se eliminarán todos sus datos.")) return;
    setIsDeleting(id);
    await supabase.from("empresas").delete().eq("id", id);
    showToast("Empresa eliminada", "success");
    setIsDeleting(null); loadEmpresas();
  };

  const saveUsuario = async () => {
    if (!formUsuario.email || !formUsuario.password || !formUsuario.empresa_id) { showToast("Email, contraseña y empresa son requeridos", "error"); return; }
    if (formUsuario.password.length < 8) { showToast("La contraseña debe tener al menos 8 caracteres", "error"); return; }
    setIsSaving(true);
    const { data, error } = await supabase.auth.signUp({
      email: formUsuario.email,
      password: formUsuario.password,
      options: { emailRedirectTo: "https://ssoma-hse.vercel.app" },
    });
    if (error) { showToast("Error: " + error.message, "error"); setIsSaving(false); return; }
    if (!data.user) { showToast("No se pudo obtener el usuario creado", "error"); setIsSaving(false); return; }
    const { error: profileError } = await supabase.from("profiles").insert([{
      id: data.user.id,
      nombre: formUsuario.nombre || formUsuario.email,
      rol: formUsuario.rol,
      empresa_id: formUsuario.empresa_id,
    }]);
    if (profileError) { showToast("Usuario creado pero error al asignar perfil: " + profileError.message, "error"); }
    else { showToast("✅ Usuario creado. Se envió un email de confirmación a " + formUsuario.email, "success"); }
    setIsSaving(false); setModalUsuario(false);
    setFormUsuario({ email: "", password: "", nombre: "", rol: "SEGURIDAD", empresa_id: "" });
    loadUsuarios();
  };

  const rolColor = { SUPERADMIN: "orange", ADMIN: "purple", MEDICO: "green", SEGURIDAD: "amber" };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="text-sm font-semibold text-white">Panel de Administración</div>
        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-orange-900/40 text-orange-400 border border-orange-800"><Settings size={11} /> SUPERADMIN</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <KpiCard label="Empresas activas" value={empresas.filter(e => e.activa).length} sub={`de ${empresas.length} registradas`} accentColor="blue" />
        <KpiCard label="Usuarios totales" value={usuarios.length} sub="en todas las empresas" accentColor="emerald" />
        <KpiCard label="Empresas inactivas" value={empresas.filter(e => !e.activa).length} sub="suspendidas" accentColor="amber" />
      </div>

      <div className="flex gap-1 border-b border-gray-800 mb-4">
        <button onClick={() => setTab("empresas")} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${tab === "empresas" ? "border-blue-500 text-blue-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}><Building2 size={14} /> Empresas ({empresas.length})</button>
        <button onClick={() => setTab("usuarios")} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${tab === "usuarios" ? "border-blue-500 text-blue-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}><Users size={14} /> Usuarios ({usuarios.length})</button>
      </div>

      {tab === "empresas" && (
        <div>
          <div className="flex justify-end mb-3">
            <Btn size="sm" variant="primary" onClick={() => setModalEmpresa(true)}><Plus size={13} /> Nueva Empresa</Btn>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800">{["Empresa", "RUC", "Sector", "Usuarios", "Estado", ""].map(h => <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide">{h}</th>)}</tr></thead>
              <tbody>
                {empresas.map(e => {
                  const uCount = usuarios.filter(u => u.empresa_id === e.id).length;
                  return (
                    <tr key={e.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3 font-medium text-white">{e.nombre}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.ruc || "—"}</td>
                      <td className="px-4 py-3 text-gray-400">{e.sector || "—"}</td>
                      <td className="px-4 py-3"><Badge color={uCount > 0 ? "blue" : "gray"}>{uCount} usuario{uCount !== 1 ? "s" : ""}</Badge></td>
                      <td className="px-4 py-3"><Badge color={e.activa ? "green" : "red"}>{e.activa ? "Activa" : "Inactiva"}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Btn size="sm" variant={e.activa ? "danger" : "success"} onClick={() => toggleEmpresa(e.id, e.activa)}>{e.activa ? "Suspender" : "Activar"}</Btn>
                          <Btn size="sm" variant="danger" disabled={isDeleting === e.id} onClick={() => deleteEmpresa(e.id)}><Trash2 size={12} /></Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {empresas.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-600 text-sm">No hay empresas registradas</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "usuarios" && (
        <div>
          <div className="flex justify-end mb-3">
            <Btn size="sm" variant="primary" onClick={() => setModalUsuario(true)}><UserPlus size={13} /> Nuevo Usuario</Btn>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800">{["Nombre", "Empresa", "Rol"].map(h => <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide">{h}</th>)}</tr></thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-medium text-white">{u.nombre}</td>
                    <td className="px-4 py-3 text-gray-400">{u.empresas?.nombre || <span className="text-gray-700">Sin empresa</span>}</td>
                    <td className="px-4 py-3"><Badge color={rolColor[u.rol] || "gray"}>{u.rol}</Badge></td>
                  </tr>
                ))}
                {usuarios.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-600 text-sm">No hay usuarios</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalEmpresa && (
        <Modal title="Nueva Empresa" onClose={() => setModalEmpresa(false)}>
          <FormField label="Nombre de la empresa"><Input value={formEmpresa.nombre} onChange={e => setFormEmpresa(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej. Hydro Global Perú SAC" /></FormField>
          <FormField label="RUC">
  <Input 
    value={formEmpresa.ruc || ""} 
    maxLength={11} 
    onChange={e => setFormEmpresa(f => ({ ...f, ruc: e.target.value.replace(/\D/g, "") }))} 
    placeholder="20123456789" 
  />
</FormField>
          <FormField label="Sector">
            <Select value={formEmpresa.sector} onChange={e => setFormEmpresa(f => ({ ...f, sector: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {["Reciclaje", "Hidroeléctrico", "Construcción", "Retail", "Manufactura", "Servicios", "Telecomunicaciones", "Minería", "Otro"].map(s => <option key={s}>{s}</option>)}
            </Select>
          </FormField>
          <div className="flex gap-2 justify-end mt-4">
            <Btn onClick={() => setModalEmpresa(false)}>Cancelar</Btn>
            <Btn variant="primary" disabled={isSaving} onClick={saveEmpresa}>{isSaving ? "Guardando..." : "Crear Empresa"}</Btn>
          </div>
        </Modal>
      )}

      {modalUsuario && (
        <Modal title="Nuevo Usuario" onClose={() => setModalUsuario(false)}>
          <div className="mb-3 px-3 py-2 rounded-lg bg-blue-900/20 border border-blue-900/40 text-xs text-blue-400">
            Se enviará un email de confirmación al usuario. Deberá hacer clic en el enlace antes de poder ingresar. La contraseña que ingreses aquí será su clave de acceso inicial.
          </div>
          <FormField label="Nombre completo"><Input value={formUsuario.nombre} onChange={e => setFormUsuario(f => ({ ...f, nombre: e.target.value }))} placeholder="Dr. Juan Pérez" /></FormField>
          <FormField label="Email"><Input type="email" value={formUsuario.email} onChange={e => setFormUsuario(f => ({ ...f, email: e.target.value }))} placeholder="usuario@empresa.com" /></FormField>
          <FormField label="Contraseña temporal"><Input type="password" value={formUsuario.password} onChange={e => setFormUsuario(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 8 caracteres" /></FormField>
          <FormField label="Empresa">
            <Select value={formUsuario.empresa_id} onChange={e => setFormUsuario(f => ({ ...f, empresa_id: e.target.value }))}>
              <option value="">Seleccionar empresa...</option>
              {empresas.filter(e => e.activa).map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </Select>
          </FormField>
          <FormField label="Rol">
            <Select value={formUsuario.rol} onChange={e => setFormUsuario(f => ({ ...f, rol: e.target.value }))}>
              <option value="SEGURIDAD">SEGURIDAD — Jefe de Seguridad</option>
              <option value="MEDICO">MEDICO — Médico Ocupacional</option>
              <option value="ADMIN">ADMIN — Administrador</option>
            </Select>
          </FormField>
          <div className="flex gap-2 justify-end mt-4">
            <Btn onClick={() => setModalUsuario(false)}>Cancelar</Btn>
            <Btn variant="primary" disabled={isSaving} onClick={saveUsuario}>{isSaving ? "Creando..." : "Crear Usuario"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// GUÍA DE IMPORTACIÓN
// ═══════════════════════════════════════════
function ImportGuideModal({ onClose }) {
  const cols = [
    { col: "APELLIDO Y NOMBRE", desc: "Nombre completo del trabajador", ejemplo: "García López Juan", req: true },
    { col: "FECHA DE NACIMIENTO", desc: "Formato DD/MM/AAAA", ejemplo: "15/03/1990", req: false },
    { col: "DOC. DE IDENTIDAD", desc: "DNI — solo números, 8 dígitos", ejemplo: "12345678", req: true },
    { col: "PUESTO", desc: "Cargo o puesto de trabajo", ejemplo: "Operador de Planta", req: false },
    { col: "ULTIMA EMO", desc: "Fecha del último examen médico DD/MM/AAAA", ejemplo: "10/01/2025", req: false },
    { col: "DURACION DE EMO", desc: "Anual o Bianual", ejemplo: "Anual", req: false },
    { col: "ESTADO", desc: "Activo, Vacaciones o Inactivo", ejemplo: "Activo", req: false },
    { col: "APTITUD", desc: "Apto / Apto con restricción / No apto / No evaluado", ejemplo: "Apto", req: false },
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
      <div className="mb-4 px-3 py-2.5 rounded-lg bg-blue-900/20 border border-blue-900/40 text-xs text-blue-400">El archivo Excel o CSV debe tener exactamente estos encabezados. Las columnas con <span className="text-red-400">*</span> son obligatorias.</div>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-gray-800"><th className="text-left text-gray-500 font-medium py-2 pr-4">Columna</th><th className="text-left text-gray-500 font-medium py-2 pr-4">Descripción</th><th className="text-left text-gray-500 font-medium py-2">Ejemplo</th></tr></thead>
          <tbody>{cols.map(c => (<tr key={c.col} className="border-b border-gray-800/50"><td className="py-2 pr-4 font-mono text-blue-400 whitespace-nowrap">{c.col}{c.req && <span className="text-red-400 ml-1">*</span>}</td><td className="py-2 pr-4 text-gray-400">{c.desc}</td><td className="py-2 text-gray-600 font-mono">{c.ejemplo}</td></tr>))}</tbody>
        </table>
      </div>
      <div className="mb-4 px-3 py-2.5 rounded-lg bg-amber-900/20 border border-amber-900/40 text-xs text-amber-400"><strong>Nota:</strong> VIGENTE HASTA se calcula automáticamente desde ULTIMA EMO + DURACION. No es necesario incluirlo.</div>
      <div className="flex gap-2 justify-end">
        <Btn onClick={onClose}>Cerrar</Btn>
        <Btn variant="primary" onClick={downloadTemplate}><Download size={13} /> Descargar Plantilla</Btn>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════
function Dashboard({ workers, trainings }) {
  const activos = workers.filter(w => w.estado === "Activo").length;
  const conRestriccion = workers.filter(w => w.aptitud === "Apto con restricción").length;
  const now = new Date(); const in30 = new Date(); in30.setDate(in30.getDate() + 30);
  const emoVencer = workers.filter(w => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); if (!v) return false; const d = new Date(v); return d >= now && d <= in30; }).length;
  const emoVencidos = workers.filter(w => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); return v && new Date(v) < now; });
  const pctEpp = workers.length ? Math.round((workers.filter(w => w.epp_recibido).length / workers.length) * 100) : 0;
  const pctAptitud = workers.length ? Math.round((workers.filter(w => ["Apto", "Apto con restricción"].includes(w.aptitud)).length / workers.length) * 100) : 0;
  const chartTip = { backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#f3f4f6', fontSize: '12px' };
  const emoChartData = [
    { name: "Vigentes", value: workers.filter(w => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); return v && new Date(v) > in30; }).length, color: "#10b981" },
    { name: "Por vencer (30d)", value: workers.filter(w => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); return v && new Date(v) >= now && new Date(v) <= in30; }).length, color: "#f59e0b" },
    { name: "Vencidos", value: workers.filter(w => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); return v && new Date(v) < now; }).length, color: "#ef4444" },
    { name: "Sin EMO", value: workers.filter(w => !w.ultima_emo).length, color: "#6b7280" },
  ].filter(d => d.value > 0);
  const aptitudChartData = [
    { name: "Apto", value: workers.filter(w => w.aptitud === "Apto").length, color: "#10b981" },
    { name: "Con restricción", value: workers.filter(w => w.aptitud === "Apto con restricción").length, color: "#f59e0b" },
    { name: "No evaluado", value: workers.filter(w => !w.aptitud || w.aptitud === "No evaluado").length, color: "#6b7280" },
    { name: "No apto", value: workers.filter(w => w.aptitud === "No apto").length, color: "#ef4444" },
  ].filter(d => d.value > 0);
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
            {[{ label: "% EPP entregado", value: pctEpp, color: "emerald" }, { label: "% Aptitud Médica Vigente", value: pctAptitud, color: "purple" }, { label: "% Capacitaciones realizadas", value: trainings.length ? Math.round((trainings.filter(t => (t.asistencia_count || 0) > 0).length / trainings.length) * 100) : 0, color: "blue" }].map(item => (
              <div key={item.label}><div className="flex justify-between text-xs text-gray-500 mb-1.5"><span>{item.label}</span><span className="text-white font-medium">{item.value}%</span></div><ProgressBar value={item.value} color={item.color} height="h-2" /></div>
            ))}
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-4">Últimas Capacitaciones</div>
          <div className="space-y-3">
            {trainings.slice(0, 4).map(t => { const pct = t.programados > 0 ? Math.round(((t.asistencia_count || 0) / t.programados) * 100) : 0; return (<div key={t.id} className="flex items-center gap-3"><div className="flex-1 min-w-0 text-sm text-gray-400 truncate">{t.nombre}</div><div className="w-20"><ProgressBar value={pct} color={pct >= 80 ? "emerald" : pct >= 40 ? "amber" : "red"} /></div><div className="text-xs text-gray-600 w-8 text-right">{pct}%</div></div>); })}
            {trainings.length === 0 && <div className="text-xs text-gray-600">No hay capacitaciones registradas</div>}
          </div>
        </div>
      </div>

      {/* ── Gráficos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-4">Estado de EMOs</div>
          {emoChartData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div style={{ width: 160, height: 160, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={emoChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" paddingAngle={2} startAngle={90} endAngle={-270}>
                      {emoChartData.map((e, i) => <Cell key={i} fill={e.color} strokeWidth={0} />)}
                    </Pie>
                    <ChartTooltip contentStyle={chartTip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 flex-1">
                {emoChartData.map(e => (
                  <div key={e.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                    <span className="text-xs text-gray-400 flex-1">{e.name}</span>
                    <span className="text-sm font-bold text-white">{e.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-xs text-gray-600">Sin trabajadores registrados</div>
          )}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-3">Aptitud Médica</div>
          {aptitudChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={155}>
              <BarChart data={aptitudChartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                <XAxis type="number" stroke="#374151" tick={{ fill: '#6b7280', fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke="#374151" tick={{ fill: '#9ca3af', fontSize: 10 }} width={95} />
                <ChartTooltip contentStyle={chartTip} cursor={{ fill: 'rgba(55,65,81,0.3)' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {aptitudChartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-32 text-xs text-gray-600">Sin datos de aptitud</div>
          )}
        </div>
      </div>

      {emoVencidos.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><AlertTriangle size={15} className="text-red-400" /> Alertas — EMO Vencido</div>
          <div className="space-y-2">
            {emoVencidos.map(w => (<div key={w.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-red-900/20 border border-red-900/40 text-sm"><AlertTriangle size={14} className="text-red-400 shrink-0" /><span className="text-white font-medium">{w.nombre}</span><span className="text-red-400">— Vigente hasta: {calcularVigencia(w.ultima_emo, w.duracion_emo)}</span><Badge color="amber">{w.cargo}</Badge></div>))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// DIRECTORIO
// ═══════════════════════════════════════════
function Directorio({ workers, setWorkers, role, empresaId }) {
  const [filter, setFilter] = useState({ text: "", estado: "", aptitud: "", cargo: "", epp: "" });
  const [modal, setModal] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [form, setForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const canSeeMedical = ["ADMIN", "MEDICO", "SUPERADMIN"].includes(role);
  const canEditEmo = role !== "SEGURIDAD";
  const cargos = [...new Set(workers.map(w => w.cargo).filter(Boolean))].sort();

  const filtered = workers.filter(w => {
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
    const payload = { nombre: form.nombre, dni: form.dni, cargo: form.cargo || "", celular: form.celular || null, sede: "Lima", estado: form.estado || "Activo", fecha_nacimiento: form.fecha_nacimiento || null, edad, ultima_emo: form.ultima_emo || null, duracion_emo: form.duracion_emo || "Anual", vencimiento_emo: vigencia, lectura_emo: form.lectura_emo || null, aptitud: form.aptitud || "No evaluado", restriccion_medica: form.restriccion_medica || "Ninguna", epp_recibido: form.epp_recibido || false, epp_detalle: form.epp_detalle || null, epp_fecha: form.epp_fecha || null, empresa_id: empresaId };
    if (modal === "edit") {
      const { error } = await supabase.from("trabajadores").update(payload).eq("id", form.id);
      if (error) { showToast("Error: " + error.message, "error"); setIsSaving(false); return; }
      setWorkers(prev => prev.map(w => w.id === form.id ? { ...form, ...payload } : w));
      showToast("Trabajador actualizado", "success");
    } else {
      const { data, error } = await supabase.from("trabajadores").insert([payload]).select().single();
      if (error) { showToast("Error: " + error.message, "error"); setIsSaving(false); return; }
      setWorkers(prev => [...prev, data]);
      showToast("Trabajador registrado", "success");
    }
    setIsSaving(false); setModal(null);
  };

  const deleteWorker = async (id) => {
    if (!confirm("¿Eliminar este trabajador?")) return;
    setIsDeleting(id);
    const { error } = await supabase.from("trabajadores").delete().eq("id", id);
    if (error) { showToast("Error: " + error.message, "error"); setIsDeleting(null); return; }
    setWorkers(prev => prev.filter(w => w.id !== id));
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
    const valid = rows.filter(r => r["APELLIDO Y NOMBRE"] && r["DOC. DE IDENTIDAD"]);
    if (valid.length === 0) { showToast("Archivo inválido. Verifica los encabezados.", "error"); return; }
    const inserts = valid.map(r => {
      const ultimaEmo = excelDateToISO(r["ULTIMA EMO"]);
      const duracion = r["DURACION DE EMO"] || "Anual";
      return { nombre: r["APELLIDO Y NOMBRE"], dni: String(r["DOC. DE IDENTIDAD"]).replace(/\D/g, "").slice(0, 8), cargo: r["PUESTO"] || "", celular: String(r["CELULAR"] || "").replace(/\D/g, "").slice(0, 12) || null, sede: "Lima", estado: r["ESTADO"] || "Activo", fecha_nacimiento: excelDateToISO(r["FECHA DE NACIMIENTO"]), edad: calcularEdad(excelDateToISO(r["FECHA DE NACIMIENTO"])), ultima_emo: ultimaEmo, duracion_emo: duracion, vencimiento_emo: calcularVigencia(ultimaEmo, duracion), lectura_emo: excelDateToISO(r["LECTURA 2026"]), aptitud: r["APTITUD"] || "No evaluado", restriccion_medica: r["RESTRICCION"] || "Ninguna", epp_recibido: String(r["EPP RECIBIDO"] || "").toUpperCase() === "SI", epp_detalle: r["EPP DETALLE"] || null, epp_fecha: excelDateToISO(r["EPP FECHA"]), empresa_id: empresaId };
    });
    const { data, error } = await supabase.from("trabajadores").insert(inserts).select();
    if (error) { showToast("Error al importar: " + error.message, "error"); return; }
    setWorkers(prev => [...prev, ...data]);
    showToast(`${data.length} trabajadores importados`, "success");
  };

  const exportExcel = () => {
    const headers = ["APELLIDO Y NOMBRE", "FECHA DE NACIMIENTO", "EDAD", "DOC. DE IDENTIDAD", "PUESTO", "CELULAR", "ULTIMA EMO", "DURACION DE EMO", "VIGENTE HASTA", "ESTADO", "APTITUD", ...(canSeeMedical ? ["RESTRICCION"] : []), "LECTURA 2026", "EPP RECIBIDO", "EPP DETALLE", "EPP FECHA"];
    const data = filtered.map(w => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); return [w.nombre, w.fecha_nacimiento || "", calcularEdad(w.fecha_nacimiento) || "", w.dni, w.cargo || "", w.celular || "", w.ultima_emo || "", w.duracion_emo || "", v || "", w.estado, w.aptitud, ...(canSeeMedical ? [w.restriccion_medica || ""] : []), w.lectura_emo || "", w.epp_recibido ? "SI" : "NO", w.epp_detalle || "", w.epp_fecha || ""]; });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Directorio");
    XLSX.writeFile(wb, "sabana_personal.xlsx");
    showToast("Excel descargado", "success");
  };

  const aptitudColor = { "Apto": "green", "Apto con restricción": "amber", "No apto": "red", "No evaluado": "gray" };

  return (
    <div>
      {showGuide && <ImportGuideModal onClose={() => setShowGuide(false)} />}
      <div className="flex items-center justify-between mb-4">
        <div><div className="text-sm font-semibold text-white">Sábana de Personal</div><div className="text-xs text-gray-600">{filtered.length} de {workers.length} trabajadores</div></div>
        <div className="flex gap-2 flex-wrap">
          <Btn size="sm" onClick={() => setShowGuide(true)}><HelpCircle size={13} /> Guía</Btn>
          <label className="cursor-pointer"><span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-all cursor-pointer"><Upload size={13} /> Importar Excel/CSV</span><input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={importCSV} /></label>
          <Btn size="sm" onClick={exportExcel}><Download size={13} /> Exportar</Btn>
          <Btn size="sm" variant="primary" onClick={() => openModal()}><Plus size={13} /> Registrar</Btn>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap mb-4">
        <Input placeholder="Buscar nombre o DNI..." value={filter.text} onChange={e => setFilter(f => ({ ...f, text: e.target.value }))} style={{ flex: 1, minWidth: 160 }} />
        <Select value={filter.cargo} onChange={e => setFilter(f => ({ ...f, cargo: e.target.value }))} style={{ width: 180 }}><option value="">Todos los puestos</option>{cargos.map(c => <option key={c}>{c}</option>)}</Select>
        <Select value={filter.estado} onChange={e => setFilter(f => ({ ...f, estado: e.target.value }))} style={{ width: 150 }}><option value="">Todos los estados</option>{["Activo", "Vacaciones", "Inactivo"].map(s => <option key={s}>{s}</option>)}</Select>
        <Select value={filter.aptitud} onChange={e => setFilter(f => ({ ...f, aptitud: e.target.value }))} style={{ width: 180 }}><option value="">Toda aptitud</option>{["Apto", "Apto con restricción", "No apto", "No evaluado"].map(a => <option key={a}>{a}</option>)}</Select>
        <Select value={filter.epp} onChange={e => setFilter(f => ({ ...f, epp: e.target.value }))} style={{ width: 140 }}><option value="">EPP: Todos</option><option value="si">Con EPP</option><option value="no">Sin EPP</option></Select>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-scroll overflow-y-auto max-h-[calc(100vh-200px)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {["Apellido y Nombre", "F. Nac / Edad", "DNI", "Puesto", "Celular", "Última EMO", "Duración", "Vigente Hasta", "Estado", "Aptitud", "EPP", "Lectura EMO", ...(canSeeMedical ? ["Restricción"] : []), ""].map(h => <th key={h} className="text-left text-xs text-gray-600 font-medium px-3 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(w => {
                const vigencia = calcularVigencia(w.ultima_emo, w.duracion_emo);
                const isVenc = vigencia && new Date(vigencia) < new Date();
                const in30 = new Date(); in30.setDate(in30.getDate() + 30);
                const soonVenc = !isVenc && vigencia && new Date(vigencia) <= in30;
                const edad = calcularEdad(w.fecha_nacimiento);
                return (
                  <tr key={w.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-3 py-3 font-medium text-white whitespace-nowrap">{w.nombre}</td>
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
            <div className="col-span-2"><FormField label="Apellido y Nombre"><Input value={form.nombre || ""} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="García López Juan Carlos" /></FormField></div>
            <FormField label="DNI (solo números)"><Input value={form.dni || ""} maxLength={8} onChange={e => { const val = e.target.value.replace(/\D/g, ""); setForm(f => ({ ...f, dni: val })); }} placeholder="12345678" /></FormField>
            <FormField label="Celular"><Input value={form.celular || ""} maxLength={12} onChange={e => { const val = e.target.value.replace(/\D/g, ""); setForm(f => ({ ...f, celular: val })); }} placeholder="999888777" /></FormField>
            <FormField label="Puesto / Cargo"><Input value={form.cargo || ""} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} /></FormField>
            <FormField label="Fecha de Nacimiento"><Input type="date" value={form.fecha_nacimiento || ""} onChange={e => setForm(f => ({ ...f, fecha_nacimiento: e.target.value }))} /></FormField>
            <FormField label="Estado"><Select value={form.estado || "Activo"} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}><option>Activo</option><option>Vacaciones</option><option>Inactivo</option></Select></FormField>
            <FormField label="Sede"><Input value="Lima" disabled className="opacity-50" /></FormField>
          </div>
          <div className="border border-gray-800 rounded-xl p-3 mb-3">
            <div className="text-xs font-semibold text-gray-300 mb-3">Examen Médico Ocupacional (EMO)</div>
            {canEditEmo ? (
              <div className="grid grid-cols-2 gap-x-4">
                <FormField label="Última EMO"><Input type="date" value={form.ultima_emo || ""} onChange={e => setForm(f => ({ ...f, ultima_emo: e.target.value }))} /></FormField>
                <FormField label="Duración EMO"><Select value={form.duracion_emo || "Anual"} onChange={e => setForm(f => ({ ...f, duracion_emo: e.target.value }))}><option>Anual</option><option>Bianual</option></Select></FormField>
                <FormField label="Vigente Hasta (automático)"><Input value={calcularVigencia(form.ultima_emo, form.duracion_emo) || "—"} disabled className="opacity-60 bg-gray-700" /></FormField>
                <FormField label="Lectura de Resultados EMO"><Input type="date" value={form.lectura_emo || ""} onChange={e => setForm(f => ({ ...f, lectura_emo: e.target.value }))} /></FormField>
                <FormField label="Aptitud Médica"><Select value={form.aptitud || "No evaluado"} onChange={e => setForm(f => ({ ...f, aptitud: e.target.value }))}><option>Apto</option><option>Apto con restricción</option><option>No apto</option><option>No evaluado</option></Select></FormField>
              </div>
            ) : (
              <div className="px-3 py-2.5 rounded-lg bg-amber-900/20 border border-amber-900/40 text-xs text-amber-400 flex items-center gap-2"><Lock size={12} /> Los campos de EMO solo pueden editarlos MEDICO o ADMIN</div>
            )}
          </div>
          <div className="border border-gray-800 rounded-xl p-3 mb-3">
            <div className="text-xs font-semibold text-gray-300 mb-3">Equipos de Protección Personal (EPP)</div>
            <div className="grid grid-cols-2 gap-x-4">
              <FormField label="¿Recibió EPP?"><Select value={form.epp_recibido ? "si" : "no"} onChange={e => setForm(f => ({ ...f, epp_recibido: e.target.value === "si" }))}><option value="no">No</option><option value="si">Sí</option></Select></FormField>
              <FormField label="Fecha de entrega EPP"><Input type="date" value={form.epp_fecha || ""} onChange={e => setForm(f => ({ ...f, epp_fecha: e.target.value }))} /></FormField>
              <div className="col-span-2"><FormField label="Detalle de EPP entregado"><Input value={form.epp_detalle || ""} onChange={e => setForm(f => ({ ...f, epp_detalle: e.target.value }))} placeholder="Ej. Casco, guantes, lentes, chaleco..." /></FormField></div>
            </div>
          </div>
          {canSeeMedical && <FormField label="Detalle Restricción Médica" confidential><Input value={form.restriccion_medica || ""} onChange={e => setForm(f => ({ ...f, restriccion_medica: e.target.value }))} /></FormField>}
          <div className="flex gap-2 justify-end mt-4"><Btn onClick={() => setModal(null)}>Cancelar</Btn><Btn variant="primary" disabled={isSaving} onClick={saveWorker}>{isSaving ? "Guardando..." : "Guardar"}</Btn></div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// CAPACITACIONES
// ═══════════════════════════════════════════
function Capacitaciones({ workers, trainings, setTrainings, empresaId }) {
  const [detail, setDetail] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [isDeleting, setIsDeleting] = useState(null);
  useEffect(() => { if (detail) loadAttendance(detail); }, [detail]);
  const loadAttendance = async (id) => {
    const { data } = await supabase.from("asistencias").select("trabajador_id, presente").eq("capacitacion_id", id);
    const map = {}; (data || []).forEach(a => { map[a.trabajador_id] = a.presente; }); setAttendance(map);
  };
  const toggleAttendance = async (tid, wid, checked) => {
    const { error } = await supabase.from("asistencias").upsert({ capacitacion_id: tid, trabajador_id: wid, presente: checked }, { onConflict: "capacitacion_id,trabajador_id" });
    if (error) { showToast("Error al guardar asistencia", "error"); return; }
    setAttendance(prev => ({ ...prev, [wid]: checked }));
    showToast(checked ? "Asistencia marcada" : "Ausencia registrada", checked ? "success" : "info");
  };
  const deleteTraining = async (id) => {
    if (!confirm("¿Eliminar esta capacitación?")) return;
    setIsDeleting(id);
    await supabase.from("capacitaciones").delete().eq("id", id);
    setTrainings(prev => prev.filter(t => t.id !== id));
    showToast("Capacitación eliminada", "success"); setIsDeleting(null);
  };
  const importAttendanceCSV = (e, tid) => {
    const file = e.target.files[0]; if (!file) return;
    Papa.parse(file, { header: true, complete: async (results) => {
      const dnis = results.data.map(r => String(r.DNI || r.dni || "").replace(/\D/g, "")).filter(Boolean);
      if (!dnis.length) { showToast("CSV inválido: columna DNI requerida", "error"); return; }
      const matched = workers.filter(w => dnis.includes(w.dni));
      for (const w of matched) await supabase.from("asistencias").upsert({ capacitacion_id: tid, trabajador_id: w.id, presente: true }, { onConflict: "capacitacion_id,trabajador_id" });
      await loadAttendance(tid);
      showToast(`${matched.length} asistencias marcadas`, "success");
    }});
    e.target.value = "";
  };
  const exportAttendance = (t) => {
    const active = workers.filter(w => w.estado === "Activo");
    const data = active.map(w => ({ Nombre: w.nombre, DNI: w.dni, Cargo: w.cargo, Asistencia: attendance[w.id] ? "Presente" : "Ausente" }));
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Asistencia"); XLSX.writeFile(wb, `asistencia_${t.nombre.replace(/\s+/g, "_")}.xlsx`);
    showToast("Excel descargado", "success");
  };
  if (detail) {
    const t = trainings.find(x => x.id === detail); if (!t) { setDetail(null); return null; }
    const active = workers.filter(w => w.estado === "Activo");
    const presentCount = Object.values(attendance).filter(Boolean).length;
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <Btn size="sm" onClick={() => setDetail(null)}><ChevronLeft size={13} /> Volver</Btn>
          <div><div className="text-sm font-semibold text-white">{t.nombre}</div><div className="text-xs text-gray-600">Fecha: {t.fecha} · {presentCount}/{active.length} presentes</div></div>
          <div className="ml-auto flex gap-2">
            <label className="cursor-pointer"><span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-all cursor-pointer"><Upload size={13} /> Importar CSV</span><input type="file" accept=".csv" className="hidden" onChange={e => importAttendanceCSV(e, detail)} /></label>
            <Btn size="sm" onClick={() => exportAttendance(t)}><Download size={13} /> Exportar</Btn>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800"><th className="px-4 py-3 w-10"><input type="checkbox" className="accent-blue-500" onChange={async e => { for (const w of active) await toggleAttendance(detail, w.id, e.target.checked); }} /></th>{["Nombre", "DNI", "Cargo", "Asistencia"].map(h => <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody>{active.map(w => { const present = !!attendance[w.id]; return (<tr key={w.id} className="border-b border-gray-800/50 hover:bg-gray-800/30"><td className="px-4 py-3"><input type="checkbox" className="accent-blue-500" checked={present} onChange={e => toggleAttendance(detail, w.id, e.target.checked)} /></td><td className="px-4 py-3 font-medium text-white">{w.nombre}</td><td className="px-4 py-3 font-mono text-xs text-gray-600">{w.dni}</td><td className="px-4 py-3 text-gray-400">{w.cargo}</td><td className="px-4 py-3"><Badge color={present ? "green" : "gray"}>{present ? "Presente" : "Ausente"}</Badge></td></tr>); })}</tbody>
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
          const { data, error } = await supabase.from("capacitaciones").insert([{ nombre, fecha, programados: workers.filter(w => w.estado === "Activo").length, empresa_id: empresaId }]).select().single();
          if (error) { showToast("Error: " + error.message, "error"); return; }
          setTrainings(prev => [...prev, { ...data, asistencia_count: 0 }]); showToast("Capacitación creada", "success");
        }}><Plus size={13} /> Nueva</Btn>
      </div>
      <div className="space-y-2">
        {trainings.map(t => { const pct = t.programados > 0 ? Math.round(((t.asistencia_count || 0) / t.programados) * 100) : 0; return (
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
function Documentos({ docs, setDocs, empresaId }) {
  const [catFilter, setCatFilter] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nombre: "", categoria: "Seguridad", version: "v1", url: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const cats = ["Seguridad", "Salud", "Ambiente"];
  const filtered = docs.filter(d => !catFilter || d.categoria === catFilter);
  const catColor = { Seguridad: "red", Salud: "blue", Ambiente: "green" };
  const saveDoc = async () => {
    if (!form.nombre) { showToast("El nombre es requerido", "error"); return; }
    setIsSaving(true);
    const { data, error } = await supabase.from("documentos").insert([{ nombre: form.nombre, categoria: form.categoria, version: form.version || "v1", url_externa: form.url || null, empresa_id: empresaId }]).select().single();
    if (error) { showToast("Error: " + error.message, "error"); setIsSaving(false); return; }
    setDocs(prev => [data, ...prev]); showToast("Documento registrado", "success"); setIsSaving(false); setModal(false);
  };
  const deleteDoc = async (id) => {
    if (!confirm("¿Eliminar este documento?")) return;
    setIsDeleting(id);
    await supabase.from("documentos").delete().eq("id", id);
    setDocs(prev => prev.filter(d => d.id !== id)); showToast("Eliminado", "success"); setIsDeleting(null);
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div><div className="text-sm font-semibold text-white">Centro Documental</div><div className="text-xs text-gray-600">Documentos SIG — ISO 45001</div></div>
        <Btn size="sm" variant="primary" onClick={() => setModal(true)}><Plus size={13} /> Agregar</Btn>
      </div>
      <div className="flex gap-1 border-b border-gray-800 mb-4">{[{ label: `Todos (${docs.length})`, val: "" }, ...cats.map(c => ({ label: `${c} (${docs.filter(d => d.categoria === c).length})`, val: c }))].map(tab => (<button key={tab.val} onClick={() => setCatFilter(tab.val)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${catFilter === tab.val ? "border-blue-500 text-blue-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>{tab.label}</button>))}</div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800">{["Documento", "Categoría", "Versión", "Fecha", ""].map(h => <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(d => (<tr key={d.id} className="border-b border-gray-800/50 hover:bg-gray-800/30"><td className="px-4 py-3 font-medium text-white">{d.nombre}</td><td className="px-4 py-3"><Badge color={catColor[d.categoria] || "gray"}>{d.categoria}</Badge></td><td className="px-4 py-3 font-mono text-xs text-gray-600">{d.version}</td><td className="px-4 py-3 text-xs text-gray-600">{d.fecha}</td><td className="px-4 py-3"><div className="flex gap-1">{d.url_externa && <Btn size="sm" onClick={() => window.open(d.url_externa, "_blank")}>↗ Ver</Btn>}<Btn size="sm" variant="danger" disabled={isDeleting === d.id} onClick={() => deleteDoc(d.id)}><Trash2 size={12} /></Btn></div></td></tr>))}
            {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600 text-sm">No hay documentos</td></tr>}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title="Agregar Documento" onClose={() => setModal(false)}>
          <FormField label="Nombre del Documento"><Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></FormField>
          <FormField label="Categoría"><Select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>{cats.map(c => <option key={c}>{c}</option>)}</Select></FormField>
          <FormField label="Versión"><Input value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} placeholder="v1" /></FormField>
          <FormField label="URL del documento"><Input placeholder="https://..." value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} /></FormField>
          <div className="flex gap-2 justify-end mt-4"><Btn onClick={() => setModal(false)}>Cancelar</Btn><Btn variant="primary" disabled={isSaving} onClick={saveDoc}>{isSaving ? "Guardando..." : "Guardar"}</Btn></div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// KPIs
// ═══════════════════════════════════════════
function KPIs({ kpis, setKpis, empresaId }) {
  const [modal, setModal] = useState(false);
  const [filterMes, setFilterMes] = useState("");
  const [filterNombre, setFilterNombre] = useState("");
  const [form, setForm] = useState({ nombre: "", mes: "", fecha: "", real: 0, meta: 100, unidad: "%" });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const meses = [...new Set(kpis.map(k => k.mes).filter(Boolean))];
  const filtered = kpis.filter(k => (!filterMes || k.mes === filterMes) && (!filterNombre || k.nombre.toLowerCase().includes(filterNombre.toLowerCase())));
  const isKpiMet = (k) => { const val = k.real ?? k.valor_real ?? 0; return k.meta === 0 ? val === 0 : (k.nombre.toLowerCase().includes("frecuencia") || k.nombre.toLowerCase().includes("accidente") ? val <= k.meta : val >= k.meta); };
  const saveKpi = async () => {
    if (!form.nombre) { showToast("El nombre es requerido", "error"); return; }
    setIsSaving(true);
    const { data, error } = await supabase.from("kpis").insert([{ nombre: form.nombre, mes: form.mes || "", fecha: form.fecha || null, valor_real: parseFloat(form.real) || 0, meta: parseFloat(form.meta) || 0, unidad: form.unidad || "", empresa_id: empresaId }]).select().single();
    if (error) { showToast("Error: " + error.message, "error"); setIsSaving(false); return; }
    setKpis(prev => [...prev, { ...data, real: data.valor_real }]); showToast("KPI registrado", "success"); setIsSaving(false); setModal(false);
  };
  const deleteKpi = async (id) => {
    if (!confirm("¿Eliminar este KPI?")) return;
    setIsDeleting(id);
    await supabase.from("kpis").delete().eq("id", id);
    setKpis(prev => prev.filter(k => k.id !== id)); showToast("KPI eliminado", "success"); setIsDeleting(null);
  };
  const exportKpis = () => {
    const data = filtered.map(k => { const val = k.real ?? k.valor_real ?? 0; return { Indicador: k.nombre, Mes: k.mes, Fecha: k.fecha || "", "Valor Real": val, Meta: k.meta, Unidad: k.unidad, Cumplido: isKpiMet(k) ? "Sí" : "No" }; });
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
        <Select value={filterMes} onChange={e => setFilterMes(e.target.value)} style={{ width: 160 }}><option value="">Todos los meses</option>{meses.map(m => <option key={m}>{m}</option>)}</Select>
        <Input placeholder="Buscar indicador..." value={filterNombre} onChange={e => setFilterNombre(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {filtered.map(k => { const val = k.real ?? k.valor_real ?? 0; const ok = isKpiMet(k); return (
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
          <FormField label="Nombre del Indicador"><Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej. Índice de Frecuencia" /></FormField>
          <FormField label="Mes"><Input value={form.mes} onChange={e => setForm(f => ({ ...f, mes: e.target.value }))} placeholder="Abril 2025" /></FormField>
          <FormField label="Fecha"><Input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} /></FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Valor Real"><Input type="number" value={form.real} onChange={e => setForm(f => ({ ...f, real: e.target.value }))} /></FormField>
            <FormField label="Meta"><Input type="number" value={form.meta} onChange={e => setForm(f => ({ ...f, meta: e.target.value }))} /></FormField>
          </div>
          <FormField label="Unidad (%, días, etc)"><Input value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))} placeholder="%" /></FormField>
          <div className="flex gap-2 justify-end mt-4"><Btn onClick={() => setModal(false)}>Cancelar</Btn><Btn variant="primary" disabled={isSaving} onClick={saveKpi}>{isSaving ? "Guardando..." : "Guardar"}</Btn></div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// VIGILANCIA MÉDICA
// ═══════════════════════════════════════════
function FatigaModulo({ workers, empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const initForm = { trabajador_id: "", fecha_evaluacion: new Date().toISOString().split("T")[0], turno: "Día", score_epworth: "", horas_sueno_promedio: "", nivel_actividad: "Moderado", observaciones: "", medico_responsable: "" };
  const [form, setForm] = useState(initForm);
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vigilancia_fatiga")
      .select("*, trabajadores(nombre)")
      .eq("empresa_id", empresaId)
      .order("fecha_evaluacion", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const getNivel = (score) => {
    const s = Number(score);
    if (s <= 5) return { label: "Sin somnolencia", color: "green" };
    if (s <= 10) return { label: "Leve", color: "blue" };
    if (s <= 16) return { label: "Moderado", color: "amber" };
    return { label: "Severo", color: "red" };
  };

  const openEdit = (r) => { setForm({ trabajador_id: r.trabajador_id, fecha_evaluacion: r.fecha_evaluacion, turno: r.turno || "Día", score_epworth: String(r.score_epworth ?? ""), horas_sueno_promedio: r.horas_sueno_promedio ? String(r.horas_sueno_promedio) : "", nivel_actividad: r.nivel_actividad || "Moderado", observaciones: r.observaciones || "", medico_responsable: r.medico_responsable || "" }); setEditing(r.id); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(initForm); };
  const handleDelete = async (id) => { if (!confirm("¿Eliminar este registro?")) return; await supabase.from("vigilancia_fatiga").delete().eq("id", id); showToast("Eliminado", "info"); load(); };

  const handleSave = async () => {
    if (!form.trabajador_id || form.score_epworth === "" || !form.fecha_evaluacion) {
      showToast("Completa los campos obligatorios", "error"); return;
    }
    setSaving(true);
    const payload = { empresa_id: empresaId, trabajador_id: form.trabajador_id, fecha_evaluacion: form.fecha_evaluacion, turno: form.turno, score_epworth: Number(form.score_epworth), horas_sueno_promedio: form.horas_sueno_promedio ? Number(form.horas_sueno_promedio) : null, nivel_actividad: form.nivel_actividad, nivel_riesgo: getNivel(form.score_epworth).label, observaciones: form.observaciones, medico_responsable: form.medico_responsable };
    const { error } = editing ? await supabase.from("vigilancia_fatiga").update(payload).eq("id", editing) : await supabase.from("vigilancia_fatiga").insert(payload);
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast(editing ? "Registro actualizado" : "Evaluación registrada", "success");
    closeModal(); load();
  };

  const now = new Date();
  const severos = records.filter(r => r.score_epworth >= 17);
  const moderados = records.filter(r => r.score_epworth >= 11 && r.score_epworth <= 16);
  const thisMes = records.filter(r => { const d = new Date(r.fecha_evaluacion); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const filtered = records.filter(r => (!fFrom || r.fecha_evaluacion >= fFrom) && (!fTo || r.fecha_evaluacion <= fTo));

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Fatiga y Somnolencia</h3>
          <p className="text-gray-500 text-xs max-w-xl">Monitoreo mediante la Escala de Epworth (0–24). Registro de horas de sueño y nivel de riesgo por turno.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <ExportBtn data={records.map(r => ({ Trabajador: r.trabajadores?.nombre || "", Fecha: r.fecha_evaluacion, Turno: r.turno, "Score Epworth": r.score_epworth, "Horas Sueño": r.horas_sueno_promedio || "", "Nivel Riesgo": r.nivel_riesgo || "", Observaciones: r.observaciones || "", Médico: r.medico_responsable || "" }))} filename="fatiga_somnolencia" />
          <Btn size="sm" variant="primary" onClick={() => { setEditing(null); setForm(initForm); setShowModal(true); }}><Plus size={13} /> Nueva Evaluación</Btn>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <KpiCard label="Evaluaciones este mes" value={thisMes.length} sub="Registros del mes actual" accentColor="blue" />
        <KpiCard label="Riesgo Moderado" value={moderados.length} sub="Score Epworth 11–16" accentColor="amber" />
        <KpiCard label="Riesgo Severo" value={severos.length} sub="Epworth ≥ 17 — Alerta" accentColor="red" />
      </div>

      {severos.length > 0 && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 text-xs font-semibold mb-1">{severos.length} trabajador(es) con somnolencia severa (Epworth ≥ 17)</p>
            <p className="text-red-600 text-xs">Restricción recomendada: no operar maquinaria ni conducir hasta reevaluación médica.</p>
          </div>
        </div>
      )}

      <FilterBar dateFrom={fFrom} dateTo={fTo} onDateFrom={setFFrom} onDateTo={setFTo} />
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {["Trabajador", "Fecha", "Turno", "Score Epworth", "Horas Sueño", "Nivel Riesgo", "Observaciones", ""].map(h => (
                <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
            {!loading && filtered.map(r => {
              const nivel = getNivel(r.score_epworth);
              return (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-white">{r.trabajadores?.nombre || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.fecha_evaluacion}</td>
                  <td className="px-4 py-3"><Badge color="gray">{r.turno}</Badge></td>
                  <td className="px-4 py-3">
                    <span className={`font-mono font-bold ${r.score_epworth >= 17 ? "text-red-400" : r.score_epworth >= 11 ? "text-amber-400" : r.score_epworth >= 6 ? "text-blue-400" : "text-emerald-400"}`}>
                      {r.score_epworth} / 24
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{r.horas_sueno_promedio ? `${r.horas_sueno_promedio}h` : "—"}</td>
                  <td className="px-4 py-3"><Badge color={nivel.color}>{nivel.label}</Badge></td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{r.observaciones || "—"}</td>
                  <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button><button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button></div></td>
                </tr>
              );
            })}
            {!loading && !filtered.length && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-600 text-sm">{records.length ? "Sin resultados para el filtro aplicado." : "Sin evaluaciones registradas. Usa \"Nueva Evaluación\" para comenzar."}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? "Editar — Fatiga y Somnolencia" : "Nueva Evaluación — Fatiga y Somnolencia"} onClose={closeModal} wide>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 mb-4 text-xs text-gray-400">
            <p className="font-semibold text-gray-300 mb-1">Escala de Epworth — Referencia</p>
            <div className="grid grid-cols-4 gap-2">
              <span className="text-emerald-400">0–5: Sin somnolencia</span>
              <span className="text-blue-400">6–10: Leve</span>
              <span className="text-amber-400">11–16: Moderado</span>
              <span className="text-red-400">17–24: Severo ⚠</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Trabajador *">
              <Select value={form.trabajador_id} onChange={e => setForm({ ...form, trabajador_id: e.target.value })}>
                <option value="">Seleccionar...</option>
                {workers.filter(w => w.estado === "Activo").map(w => <option key={w.id} value={w.id}>{w.nombre}</option>)}
              </Select>
            </FormField>
            <FormField label="Fecha de Evaluación *">
              <Input type="date" value={form.fecha_evaluacion} onChange={e => setForm({ ...form, fecha_evaluacion: e.target.value })} />
            </FormField>
            <FormField label="Turno">
              <Select value={form.turno} onChange={e => setForm({ ...form, turno: e.target.value })}>
                <option>Día</option><option>Noche</option><option>Rotativo</option>
              </Select>
            </FormField>
            <FormField label="Actividad Física">
              <Select value={form.nivel_actividad} onChange={e => setForm({ ...form, nivel_actividad: e.target.value })}>
                <option>Sedentario</option><option>Leve</option><option>Moderado</option><option>Intenso</option>
              </Select>
            </FormField>
            <FormField label="Score Epworth (0–24) *">
              <Input type="number" min="0" max="24" placeholder="0" value={form.score_epworth} onChange={e => setForm({ ...form, score_epworth: e.target.value })} />
              {form.score_epworth !== "" && (
                <p className={`text-xs mt-1 font-medium ${getNivel(form.score_epworth).color === "red" ? "text-red-400" : getNivel(form.score_epworth).color === "amber" ? "text-amber-400" : getNivel(form.score_epworth).color === "blue" ? "text-blue-400" : "text-emerald-400"}`}>
                  → {getNivel(form.score_epworth).label}
                </p>
              )}
            </FormField>
            <FormField label="Horas Sueño Promedio (últimos 7 días)">
              <Input type="number" min="0" max="24" step="0.5" placeholder="7.5" value={form.horas_sueno_promedio} onChange={e => setForm({ ...form, horas_sueno_promedio: e.target.value })} />
            </FormField>
            <FormField label="Médico Responsable">
              <Input placeholder="Nombre del médico" value={form.medico_responsable} onChange={e => setForm({ ...form, medico_responsable: e.target.value })} />
            </FormField>
            <FormField label="Observaciones / Restricciones">
              <Input placeholder="Restricciones, derivaciones, notas..." value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
            </FormField>
          </div>
          <div className="flex gap-2 mt-5 justify-end">
            <Btn variant="default" onClick={closeModal}>Cancelar</Btn>
            <Btn variant="primary" disabled={saving} onClick={handleSave}>{saving ? "Guardando..." : editing ? "Actualizar" : "Guardar Evaluación"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PsicosocialModulo({ workers, empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const initForm = { trabajador_id: "", fecha_evaluacion: new Date().toISOString().split("T")[0], instrumento: "ISTAS21", puntaje: "", nivel_riesgo: "Medio", dimension_principal: "", derivacion: "No aplica", fecha_derivacion: "", seguimiento: "", medico_responsable: "", observaciones: "" };
  const [form, setForm] = useState(initForm);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vigilancia_psicosocial")
      .select("*, trabajadores(nombre)")
      .eq("empresa_id", empresaId)
      .order("fecha_evaluacion", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const getNivelColor = (nivel) => {
    if (nivel === "Bajo") return "green";
    if (nivel === "Medio") return "amber";
    if (nivel === "Alto") return "orange";
    if (nivel === "Muy Alto") return "red";
    return "gray";
  };

  const getDerivacionColor = (d) => {
    if (!d || d === "No aplica") return "gray";
    if (d === "Psiquiatría") return "red";
    return "purple";
  };

  const openEdit = (r) => { setForm({ trabajador_id: r.trabajador_id, fecha_evaluacion: r.fecha_evaluacion, instrumento: r.instrumento || "ISTAS21", puntaje: r.puntaje != null ? String(r.puntaje) : "", nivel_riesgo: r.nivel_riesgo || "Medio", dimension_principal: r.dimension_principal || "", derivacion: r.derivacion || "No aplica", fecha_derivacion: r.fecha_derivacion || "", seguimiento: r.seguimiento || "", medico_responsable: r.medico_responsable || "", observaciones: r.observaciones || "" }); setEditing(r.id); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(initForm); };
  const handleDelete = async (id) => { if (!confirm("¿Eliminar este registro?")) return; await supabase.from("vigilancia_psicosocial").delete().eq("id", id); showToast("Eliminado", "info"); load(); };

  const handleSave = async () => {
    if (!form.trabajador_id || !form.fecha_evaluacion) {
      showToast("Selecciona trabajador y fecha", "error"); return;
    }
    setSaving(true);
    const payload = { empresa_id: empresaId, trabajador_id: form.trabajador_id, fecha_evaluacion: form.fecha_evaluacion, instrumento: form.instrumento, puntaje: form.puntaje ? parseFloat(form.puntaje) : null, nivel_riesgo: form.nivel_riesgo, dimension_principal: form.dimension_principal, derivacion: form.derivacion, fecha_derivacion: form.fecha_derivacion || null, seguimiento: form.seguimiento, medico_responsable: form.medico_responsable, observaciones: form.observaciones };
    const { error } = editing ? await supabase.from("vigilancia_psicosocial").update(payload).eq("id", editing) : await supabase.from("vigilancia_psicosocial").insert(payload);
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast(editing ? "Registro actualizado" : "Evaluación registrada", "success");
    closeModal(); load();
  };

  const now = new Date();
  const thisMes = records.filter(r => { const d = new Date(r.fecha_evaluacion); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const altoRiesgo = records.filter(r => r.nivel_riesgo === "Alto" || r.nivel_riesgo === "Muy Alto");
  const derivados = records.filter(r => r.derivacion && r.derivacion !== "No aplica");

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Riesgos Psicosociales y Salud Mental</h3>
          <p className="text-gray-500 text-xs max-w-xl">Evaluación de factores psicosociales laborales, estrés y bienestar mental. (RM 312-2011/MINSA)</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] px-2 py-1 rounded bg-red-900/40 text-red-400 border border-red-800 font-mono">CONFIDENCIAL</span>
          <ExportBtn data={records.map(r => ({ Trabajador: r.trabajadores?.nombre || "", Fecha: r.fecha_evaluacion, Instrumento: r.instrumento, Puntaje: r.puntaje ?? "", "Nivel Riesgo": r.nivel_riesgo, "Dimensión Principal": r.dimension_principal || "", Derivación: r.derivacion || "", Médico: r.medico_responsable || "" }))} filename="psicosocial" />
          <Btn size="sm" variant="primary" onClick={() => { setEditing(null); setForm(initForm); setShowModal(true); }}><Plus size={13} /> Nueva Evaluación</Btn>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <KpiCard label="Evaluaciones este mes" value={thisMes.length} sub="Registros del mes actual" accentColor="blue" />
        <KpiCard label="Riesgo Alto / Muy Alto" value={altoRiesgo.length} sub="Requieren intervención" accentColor="amber" />
        <KpiCard label="Derivaciones activas" value={derivados.length} sub="Psicólogo / Psiquiatría" accentColor="purple" />
      </div>

      {altoRiesgo.length > 0 && (
        <div className="bg-amber-900/20 border border-amber-800 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 text-xs font-semibold mb-1">{altoRiesgo.length} trabajador(es) con riesgo psicosocial Alto o Muy Alto</p>
            <p className="text-amber-600 text-xs">Verificar derivación a salud mental y activar plan de intervención organizacional.</p>
          </div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {["Trabajador", "Fecha", "Instrumento", "Puntaje", "Nivel Riesgo", "Dimensión Principal", "Derivación", ""].map(h => (
                <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
            {!loading && records.map(r => (
              <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3 font-medium text-white">{r.trabajadores?.nombre || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.fecha_evaluacion}</td>
                <td className="px-4 py-3"><Badge color="blue">{r.instrumento}</Badge></td>
                <td className="px-4 py-3 font-mono font-bold text-gray-200">{r.puntaje ?? "—"}</td>
                <td className="px-4 py-3"><Badge color={getNivelColor(r.nivel_riesgo)}>{r.nivel_riesgo}</Badge></td>
                <td className="px-4 py-3 text-gray-400 text-xs">{r.dimension_principal || "—"}</td>
                <td className="px-4 py-3"><Badge color={getDerivacionColor(r.derivacion)}>{r.derivacion || "No aplica"}</Badge></td>
                <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button><button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button></div></td>
              </tr>
            ))}
            {!loading && !records.length && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-600 text-sm">Sin evaluaciones. Usa "Nueva Evaluación" para comenzar.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? "Editar — Psicosocial / Salud Mental" : "Nueva Evaluación — Psicosocial / Salud Mental"} onClose={closeModal} wide>
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4 flex items-center gap-2">
            <span className="text-[10px] px-2 py-1 rounded bg-red-900/40 text-red-400 border border-red-800 font-mono shrink-0">CONFIDENCIAL</span>
            <p className="text-xs text-red-400">La información registrada es de carácter médico confidencial y de uso exclusivo del equipo de salud.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Trabajador *">
              <Select value={form.trabajador_id} onChange={e => setForm({ ...form, trabajador_id: e.target.value })}>
                <option value="">Seleccionar...</option>
                {workers.filter(w => w.estado === "Activo").map(w => <option key={w.id} value={w.id}>{w.nombre}</option>)}
              </Select>
            </FormField>
            <FormField label="Fecha de Evaluación *">
              <Input type="date" value={form.fecha_evaluacion} onChange={e => setForm({ ...form, fecha_evaluacion: e.target.value })} />
            </FormField>
            <FormField label="Instrumento de Evaluación">
              <Select value={form.instrumento} onChange={e => setForm({ ...form, instrumento: e.target.value })}>
                <option>ISTAS21</option>
                <option>SUSESO-ISTAS21</option>
                <option>Maslach Burnout Inventory</option>
                <option>DASS-21</option>
                <option>Escala de Estrés Percibido (PSS)</option>
                <option>GHQ-12</option>
                <option>Otro</option>
              </Select>
            </FormField>
            <FormField label="Puntaje Obtenido">
              <Input type="number" step="0.1" placeholder="—" value={form.puntaje} onChange={e => setForm({ ...form, puntaje: e.target.value })} />
            </FormField>
            <FormField label="Nivel de Riesgo">
              <Select value={form.nivel_riesgo} onChange={e => setForm({ ...form, nivel_riesgo: e.target.value })}>
                <option>Bajo</option>
                <option>Medio</option>
                <option>Alto</option>
                <option>Muy Alto</option>
              </Select>
            </FormField>
            <FormField label="Dimensión Principal Afectada">
              <Select value={form.dimension_principal} onChange={e => setForm({ ...form, dimension_principal: e.target.value })}>
                <option value="">Seleccionar...</option>
                <option>Demandas del trabajo</option>
                <option>Control sobre el trabajo</option>
                <option>Apoyo social</option>
                <option>Compensaciones</option>
                <option>Doble presencia</option>
                <option>Burnout / Agotamiento</option>
                <option>Ansiedad / Depresión</option>
              </Select>
            </FormField>
            <FormField label="Derivación">
              <Select value={form.derivacion} onChange={e => setForm({ ...form, derivacion: e.target.value })}>
                <option>No aplica</option>
                <option>Psicólogo interno</option>
                <option>Psicólogo externo</option>
                <option>Psiquiatría</option>
              </Select>
            </FormField>
            <FormField label="Fecha de Derivación">
              <Input type="date" value={form.fecha_derivacion} onChange={e => setForm({ ...form, fecha_derivacion: e.target.value })} disabled={form.derivacion === "No aplica"} />
            </FormField>
            <FormField label="Médico Responsable">
              <Input placeholder="Nombre del médico / psicólogo" value={form.medico_responsable} onChange={e => setForm({ ...form, medico_responsable: e.target.value })} />
            </FormField>
            <FormField label="Plan de Seguimiento">
              <Input placeholder="Ej: Sesión mensual, intervención grupal..." value={form.seguimiento} onChange={e => setForm({ ...form, seguimiento: e.target.value })} />
            </FormField>
            <FormField label="Observaciones" confidential>
              <Input placeholder="Notas clínicas confidenciales..." value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
            </FormField>
          </div>
          <div className="flex gap-2 mt-5 justify-end">
            <Btn variant="default" onClick={closeModal}>Cancelar</Btn>
            <Btn variant="primary" disabled={saving} onClick={handleSave}>{saving ? "Guardando..." : editing ? "Actualizar" : "Guardar Evaluación"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function DisergonomiaModulo({ workers, empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const initForm = { trabajador_id: "", fecha_evaluacion: new Date().toISOString().split("T")[0], area_puesto: "", tipo_riesgo: "Postural", metodo_evaluacion: "REBA", puntuacion: "", nivel_riesgo: "Medio", medidas_adoptadas: "", proximo_control: "", medico_responsable: "", observaciones: "" };
  const [form, setForm] = useState(initForm);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vigilancia_disergonomia")
      .select("*, trabajadores(nombre)")
      .eq("empresa_id", empresaId)
      .order("fecha_evaluacion", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const getNivelColor = (nivel) => {
    if (nivel === "Bajo") return "green";
    if (nivel === "Medio") return "amber";
    if (nivel === "Alto") return "orange";
    if (nivel === "Muy Alto") return "red";
    return "gray";
  };

  const openEdit = (r) => { setForm({ trabajador_id: r.trabajador_id, fecha_evaluacion: r.fecha_evaluacion, area_puesto: r.area_puesto || "", tipo_riesgo: r.tipo_riesgo || "Postural", metodo_evaluacion: r.metodo_evaluacion || "REBA", puntuacion: r.puntuacion != null ? String(r.puntuacion) : "", nivel_riesgo: r.nivel_riesgo || "Medio", medidas_adoptadas: r.medidas_adoptadas || "", proximo_control: r.proximo_control || "", medico_responsable: r.medico_responsable || "", observaciones: r.observaciones || "" }); setEditing(r.id); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(initForm); };
  const handleDelete = async (id) => { if (!confirm("¿Eliminar este registro?")) return; await supabase.from("vigilancia_disergonomia").delete().eq("id", id); showToast("Eliminado", "info"); load(); };

  const handleSave = async () => {
    if (!form.trabajador_id || !form.fecha_evaluacion) {
      showToast("Selecciona trabajador y fecha", "error"); return;
    }
    setSaving(true);
    const payload = { empresa_id: empresaId, trabajador_id: form.trabajador_id, fecha_evaluacion: form.fecha_evaluacion, area_puesto: form.area_puesto, tipo_riesgo: form.tipo_riesgo, metodo_evaluacion: form.metodo_evaluacion, puntuacion: form.puntuacion ? parseFloat(form.puntuacion) : null, nivel_riesgo: form.nivel_riesgo, medidas_adoptadas: form.medidas_adoptadas, proximo_control: form.proximo_control || null, medico_responsable: form.medico_responsable, observaciones: form.observaciones };
    const { error } = editing ? await supabase.from("vigilancia_disergonomia").update(payload).eq("id", editing) : await supabase.from("vigilancia_disergonomia").insert(payload);
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast(editing ? "Registro actualizado" : "Evaluación registrada", "success");
    closeModal(); load();
  };

  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [fArea, setFArea] = useState("");
  const now = new Date();
  const thisMes = records.filter(r => { const d = new Date(r.fecha_evaluacion); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const altoRiesgo = records.filter(r => r.nivel_riesgo === "Alto" || r.nivel_riesgo === "Muy Alto");
  const sinMedidas = records.filter(r => (r.nivel_riesgo === "Alto" || r.nivel_riesgo === "Muy Alto") && !r.medidas_adoptadas);
  const areaOptsD = [...new Set(records.map(r => r.area_puesto).filter(Boolean))].sort();
  const filtered = records.filter(r =>
    (!fFrom || r.fecha_evaluacion >= fFrom) && (!fTo || r.fecha_evaluacion <= fTo) && (!fArea || r.area_puesto === fArea));

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Riesgos Disergonómicos</h3>
          <p className="text-gray-500 text-xs max-w-xl">Evaluación de riesgos posturales, carga física y movimientos repetitivos. Métodos REBA, RULA, OWAS, NIOSH. (R.M. 375-2008-TR)</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <ExportBtn data={records.map(r => ({ Trabajador: r.trabajadores?.nombre || "", Fecha: r.fecha_evaluacion, "Área/Puesto": r.area_puesto || "", "Tipo Riesgo": r.tipo_riesgo, Método: r.metodo_evaluacion, Puntuación: r.puntuacion ?? "", "Nivel Riesgo": r.nivel_riesgo, "Medidas Adoptadas": r.medidas_adoptadas || "", "Próx. Control": r.proximo_control || "" }))} filename="disergonomia" />
          <Btn size="sm" variant="primary" onClick={() => { setEditing(null); setForm(initForm); setShowModal(true); }}><Plus size={13} /> Nueva Evaluación</Btn>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <KpiCard label="Evaluaciones este mes" value={thisMes.length} sub="Registros del mes actual" accentColor="blue" />
        <KpiCard label="Riesgo Alto / Muy Alto" value={altoRiesgo.length} sub="Requieren intervención" accentColor="amber" />
        <KpiCard label="Sin medidas adoptadas" value={sinMedidas.length} sub="Alto riesgo sin control" accentColor="red" />
      </div>

      {sinMedidas.length > 0 && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 text-xs font-semibold mb-1">{sinMedidas.length} trabajador(es) con riesgo alto sin medidas correctivas registradas</p>
            <p className="text-red-600 text-xs">Implementar controles de ingeniería o administrativos y actualizar el registro.</p>
          </div>
        </div>
      )}

      <FilterBar dateFrom={fFrom} dateTo={fTo} onDateFrom={setFFrom} onDateTo={setFTo} area={fArea} onArea={setFArea} areaOptions={areaOptsD} />
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {["Trabajador", "Área / Puesto", "Tipo Riesgo", "Método", "Puntuación", "Nivel Riesgo", "Medidas Adoptadas", ""].map(h => (
                <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
            {!loading && filtered.map(r => (
              <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3 font-medium text-white">{r.trabajadores?.nombre || "—"}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{r.area_puesto || "—"}</td>
                <td className="px-4 py-3"><Badge color="blue">{r.tipo_riesgo}</Badge></td>
                <td className="px-4 py-3 text-gray-400 text-xs font-mono">{r.metodo_evaluacion || "—"}</td>
                <td className="px-4 py-3 font-mono font-bold text-gray-200">{r.puntuacion ?? "—"}</td>
                <td className="px-4 py-3"><Badge color={getNivelColor(r.nivel_riesgo)}>{r.nivel_riesgo}</Badge></td>
                <td className="px-4 py-3 text-gray-400 text-xs max-w-[180px] truncate">
                  {r.medidas_adoptadas || <span className="text-red-500 text-xs">Sin registrar</span>}
                </td>
                <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button><button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button></div></td>
              </tr>
            ))}
            {!loading && !filtered.length && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-600 text-sm">{records.length ? "Sin resultados para el filtro aplicado." : "Sin evaluaciones. Usa \"Nueva Evaluación\" para comenzar."}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? "Editar — Disergonomía" : "Nueva Evaluación — Disergonomía"} onClose={closeModal} wide>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 mb-4 text-xs text-gray-400">
            <p className="font-semibold text-gray-300 mb-1">Niveles de riesgo</p>
            <div className="grid grid-cols-4 gap-2">
              <span className="text-emerald-400">Bajo: Aceptable</span>
              <span className="text-amber-400">Medio: Mejorar</span>
              <span className="text-orange-400">Alto: Pronto</span>
              <span className="text-red-400">Muy Alto: Inmediato ⚠</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Trabajador *">
              <Select value={form.trabajador_id} onChange={e => setForm({ ...form, trabajador_id: e.target.value })}>
                <option value="">Seleccionar...</option>
                {workers.filter(w => w.estado === "Activo").map(w => <option key={w.id} value={w.id}>{w.nombre}</option>)}
              </Select>
            </FormField>
            <FormField label="Fecha de Evaluación *">
              <Input type="date" value={form.fecha_evaluacion} onChange={e => setForm({ ...form, fecha_evaluacion: e.target.value })} />
            </FormField>
            <FormField label="Área / Puesto de Trabajo">
              <Input placeholder="Ej: Almacén / Estibador" value={form.area_puesto} onChange={e => setForm({ ...form, area_puesto: e.target.value })} />
            </FormField>
            <FormField label="Tipo de Riesgo">
              <Select value={form.tipo_riesgo} onChange={e => setForm({ ...form, tipo_riesgo: e.target.value })}>
                <option>Postural</option>
                <option>Carga física</option>
                <option>Movimientos repetitivos</option>
                <option>Vibración</option>
                <option>Pantalla de visualización</option>
              </Select>
            </FormField>
            <FormField label="Método de Evaluación">
              <Select value={form.metodo_evaluacion} onChange={e => setForm({ ...form, metodo_evaluacion: e.target.value })}>
                <option>REBA</option>
                <option>RULA</option>
                <option>OWAS</option>
                <option>NIOSH</option>
                <option>Check List OCRA</option>
                <option>Otro</option>
              </Select>
            </FormField>
            <FormField label="Puntuación obtenida">
              <Input type="number" step="0.1" placeholder="7" value={form.puntuacion} onChange={e => setForm({ ...form, puntuacion: e.target.value })} />
            </FormField>
            <FormField label="Nivel de Riesgo">
              <Select value={form.nivel_riesgo} onChange={e => setForm({ ...form, nivel_riesgo: e.target.value })}>
                <option>Bajo</option>
                <option>Medio</option>
                <option>Alto</option>
                <option>Muy Alto</option>
              </Select>
            </FormField>
            <FormField label="Próximo Control">
              <Input type="date" value={form.proximo_control} onChange={e => setForm({ ...form, proximo_control: e.target.value })} />
            </FormField>
            <FormField label="Medidas Adoptadas">
              <Input placeholder="Ej: Capacitación postural, faja lumbar, rediseño de puesto..." value={form.medidas_adoptadas} onChange={e => setForm({ ...form, medidas_adoptadas: e.target.value })} />
            </FormField>
            <FormField label="Médico / Ergónomo Responsable">
              <Input placeholder="Nombre del profesional" value={form.medico_responsable} onChange={e => setForm({ ...form, medico_responsable: e.target.value })} />
            </FormField>
            <FormField label="Observaciones">
              <Input placeholder="Notas adicionales..." value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
            </FormField>
          </div>
          <div className="flex gap-2 mt-5 justify-end">
            <Btn variant="default" onClick={closeModal}>Cancelar</Btn>
            <Btn variant="primary" disabled={saving} onClick={handleSave}>{saving ? "Guardando..." : editing ? "Actualizar" : "Guardar Evaluación"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AuditivaModulo({ workers, empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const initForm = { trabajador_id: "", fecha_evaluacion: new Date().toISOString().split("T")[0], area_puesto: "", db_exposicion: "", tipo_epp: "", fecha_audiometria: "", resultado_audiometria: "Normal", oido_derecho_db: "", oido_izquierdo_db: "", proximo_control: "", medico_responsable: "", observaciones: "" };
  const [form, setForm] = useState(initForm);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vigilancia_auditiva")
      .select("*, trabajadores(nombre)")
      .eq("empresa_id", empresaId)
      .order("fecha_evaluacion", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const getResultadoColor = (r) => {
    if (r === "Normal") return "green";
    if (r === "Hipoacusia Leve") return "amber";
    if (r === "Hipoacusia Moderada") return "orange";
    if (r === "Hipoacusia Severa") return "red";
    return "gray";
  };

  const getDbColor = (db) => {
    const v = parseFloat(db);
    if (!v) return "gray";
    if (v >= 95) return "text-red-400";
    if (v >= 85) return "text-amber-400";
    return "text-emerald-400";
  };

  const proximosControl = records.filter(r => {
    if (!r.proximo_control) return false;
    const diff = new Date(r.proximo_control) - new Date();
    return diff >= 0 && diff <= 30 * 24 * 60 * 60 * 1000;
  });

  const openEdit = (r) => { setForm({ trabajador_id: r.trabajador_id, fecha_evaluacion: r.fecha_evaluacion, area_puesto: r.area_puesto || "", db_exposicion: r.db_exposicion != null ? String(r.db_exposicion) : "", tipo_epp: r.tipo_epp || "", fecha_audiometria: r.fecha_audiometria || "", resultado_audiometria: r.resultado_audiometria || "Normal", oido_derecho_db: r.oido_derecho_db != null ? String(r.oido_derecho_db) : "", oido_izquierdo_db: r.oido_izquierdo_db != null ? String(r.oido_izquierdo_db) : "", proximo_control: r.proximo_control || "", medico_responsable: r.medico_responsable || "", observaciones: r.observaciones || "" }); setEditing(r.id); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(initForm); };
  const handleDelete = async (id) => { if (!confirm("¿Eliminar este registro?")) return; await supabase.from("vigilancia_auditiva").delete().eq("id", id); showToast("Eliminado", "info"); load(); };

  const handleSave = async () => {
    if (!form.trabajador_id || !form.fecha_evaluacion) {
      showToast("Selecciona trabajador y fecha", "error"); return;
    }
    setSaving(true);
    const payload = { empresa_id: empresaId, trabajador_id: form.trabajador_id, fecha_evaluacion: form.fecha_evaluacion, area_puesto: form.area_puesto, db_exposicion: form.db_exposicion ? parseFloat(form.db_exposicion) : null, tipo_epp: form.tipo_epp, fecha_audiometria: form.fecha_audiometria || null, resultado_audiometria: form.resultado_audiometria, oido_derecho_db: form.oido_derecho_db ? parseFloat(form.oido_derecho_db) : null, oido_izquierdo_db: form.oido_izquierdo_db ? parseFloat(form.oido_izquierdo_db) : null, proximo_control: form.proximo_control || null, medico_responsable: form.medico_responsable, observaciones: form.observaciones };
    const { error } = editing ? await supabase.from("vigilancia_auditiva").update(payload).eq("id", editing) : await supabase.from("vigilancia_auditiva").insert(payload);
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast(editing ? "Registro actualizado" : "Evaluación registrada", "success");
    closeModal(); load();
  };

  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [fArea, setFArea] = useState("");
  const now = new Date();
  const thisMes = records.filter(r => { const d = new Date(r.fecha_evaluacion); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const conHipoacusia = records.filter(r => r.resultado_audiometria && r.resultado_aviometria !== "Normal" && r.resultado_audiometria !== "Normal");
  const altoRiesgo = records.filter(r => r.db_exposicion >= 95);
  const areaOptsA = [...new Set(records.map(r => r.area_puesto).filter(Boolean))].sort();
  const filtered = records.filter(r =>
    (!fFrom || r.fecha_evaluacion >= fFrom) && (!fTo || r.fecha_evaluacion <= fTo) && (!fArea || r.area_puesto === fArea));

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Protección Auditiva</h3>
          <p className="text-gray-500 text-xs max-w-xl">Programa de conservación de la audición. Control de exposición al ruido (dB) y seguimiento audiométrico. (R.M. 375-2008-TR)</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <ExportBtn data={records.map(r => ({ Trabajador: r.trabajadores?.nombre || "", Fecha: r.fecha_evaluacion, "Área/Puesto": r.area_puesto || "", "dB Exposición": r.db_exposicion ?? "", "Tipo EPP": r.tipo_epp || "", "Resultado Audiometría": r.resultado_audiometria || "", "OD (dB)": r.oido_derecho_db ?? "", "OI (dB)": r.oido_izquierdo_db ?? "", "Próx. Control": r.proximo_control || "" }))} filename="proteccion_auditiva" />
          <Btn size="sm" variant="primary" onClick={() => { setEditing(null); setForm(initForm); setShowModal(true); }}><Plus size={13} /> Nueva Evaluación</Btn>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <KpiCard label="Evaluaciones este mes" value={thisMes.length} sub="Registros del mes actual" accentColor="blue" />
        <KpiCard label="Con hipoacusia" value={conHipoacusia.length} sub="Resultado anormal" accentColor="amber" />
        <KpiCard label="Exposición ≥ 95 dB" value={altoRiesgo.length} sub="Riesgo alto — control urgente" accentColor="red" />
      </div>

      {altoRiesgo.length > 0 && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 text-xs font-semibold mb-1">{altoRiesgo.length} trabajador(es) con exposición ≥ 95 dB</p>
            <p className="text-red-600 text-xs">Verificar uso de EPP auditivo y evaluar medidas de ingeniería para reducción de ruido en fuente.</p>
          </div>
        </div>
      )}

      <FilterBar dateFrom={fFrom} dateTo={fTo} onDateFrom={setFFrom} onDateTo={setFTo} area={fArea} onArea={setFArea} areaOptions={areaOptsA} />
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {["Trabajador", "Área / Puesto", "dB Exposición", "EPP Auditivo", "Audiometría", "Resultado", "Próx. Control", ""].map(h => (
                <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
            {!loading && filtered.map(r => (
              <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3 font-medium text-white">{r.trabajadores?.nombre || "—"}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{r.area_puesto || "—"}</td>
                <td className="px-4 py-3">
                  {r.db_exposicion ? (
                    <span className={`font-mono font-bold ${getDbColor(r.db_exposicion)}`}>{r.db_exposicion} dB</span>
                  ) : <span className="text-gray-600">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{r.tipo_epp || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.fecha_audiometria || "—"}</td>
                <td className="px-4 py-3"><Badge color={getResultadoColor(r.resultado_audiometria)}>{r.resultado_audiometria || "—"}</Badge></td>
                <td className={`px-4 py-3 font-mono text-xs ${proximosControl.find(p => p.id === r.id) ? "text-amber-400 font-semibold" : "text-gray-500"}`}>{r.proximo_control || "—"}</td>
                <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button><button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button></div></td>
              </tr>
            ))}
            {!loading && !filtered.length && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-600 text-sm">{records.length ? "Sin resultados para el filtro aplicado." : "Sin evaluaciones. Usa \"Nueva Evaluación\" para comenzar."}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? "Editar — Protección Auditiva" : "Nueva Evaluación — Protección Auditiva"} onClose={closeModal} wide>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 mb-4 text-xs text-gray-400">
            <p className="font-semibold text-gray-300 mb-1">Referencia de exposición al ruido</p>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-emerald-400">&lt; 85 dB: Sin riesgo</span>
              <span className="text-amber-400">85–94 dB: Riesgo — EPP obligatorio</span>
              <span className="text-red-400">≥ 95 dB: Riesgo alto ⚠</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Trabajador *">
              <Select value={form.trabajador_id} onChange={e => setForm({ ...form, trabajador_id: e.target.value })}>
                <option value="">Seleccionar...</option>
                {workers.filter(w => w.estado === "Activo").map(w => <option key={w.id} value={w.id}>{w.nombre}</option>)}
              </Select>
            </FormField>
            <FormField label="Fecha de Evaluación *">
              <Input type="date" value={form.fecha_evaluacion} onChange={e => setForm({ ...form, fecha_evaluacion: e.target.value })} />
            </FormField>
            <FormField label="Área / Puesto de Trabajo">
              <Input placeholder="Ej: Planta de producción / Operador" value={form.area_puesto} onChange={e => setForm({ ...form, area_puesto: e.target.value })} />
            </FormField>
            <FormField label="Nivel de Exposición (dB)">
              <Input type="number" step="0.1" placeholder="85" value={form.db_exposicion} onChange={e => setForm({ ...form, db_exposicion: e.target.value })} />
              {form.db_exposicion && (
                <p className={`text-xs mt-1 font-medium ${getDbColor(form.db_exposicion)}`}>
                  {parseFloat(form.db_exposicion) >= 95 ? "→ Riesgo alto" : parseFloat(form.db_exposicion) >= 85 ? "→ Riesgo — EPP obligatorio" : "→ Sin riesgo"}
                </p>
              )}
            </FormField>
            <FormField label="Tipo de EPP Auditivo Asignado">
              <Select value={form.tipo_epp} onChange={e => setForm({ ...form, tipo_epp: e.target.value })}>
                <option value="">Seleccionar...</option>
                <option>Tapones auditivos desechables</option>
                <option>Tapones auditivos reutilizables</option>
                <option>Orejeras / Protectores de copa</option>
                <option>Orejeras acopladas a casco</option>
                <option>No aplica</option>
              </Select>
            </FormField>
            <FormField label="Resultado Audiometría">
              <Select value={form.resultado_audiometria} onChange={e => setForm({ ...form, resultado_audiometria: e.target.value })}>
                <option>Normal</option>
                <option>Hipoacusia Leve</option>
                <option>Hipoacusia Moderada</option>
                <option>Hipoacusia Severa</option>
              </Select>
            </FormField>
            <FormField label="Fecha Audiometría">
              <Input type="date" value={form.fecha_audiometria} onChange={e => setForm({ ...form, fecha_audiometria: e.target.value })} />
            </FormField>
            <FormField label="Próximo Control">
              <Input type="date" value={form.proximo_control} onChange={e => setForm({ ...form, proximo_control: e.target.value })} />
            </FormField>
            <FormField label="Umbral auditivo OD (dBHL)">
              <Input type="number" placeholder="25" value={form.oido_derecho_db} onChange={e => setForm({ ...form, oido_derecho_db: e.target.value })} />
            </FormField>
            <FormField label="Umbral auditivo OI (dBHL)">
              <Input type="number" placeholder="25" value={form.oido_izquierdo_db} onChange={e => setForm({ ...form, oido_izquierdo_db: e.target.value })} />
            </FormField>
            <FormField label="Médico Responsable">
              <Input placeholder="Nombre del médico" value={form.medico_responsable} onChange={e => setForm({ ...form, medico_responsable: e.target.value })} />
            </FormField>
            <FormField label="Observaciones">
              <Input placeholder="Restricciones, seguimiento..." value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
            </FormField>
          </div>
          <div className="flex gap-2 mt-5 justify-end">
            <Btn variant="default" onClick={closeModal}>Cancelar</Btn>
            <Btn variant="primary" disabled={saving} onClick={handleSave}>{saving ? "Guardando..." : editing ? "Actualizar" : "Guardar Evaluación"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function GestanteModulo({ workers, empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const initForm = { trabajador_id: "", fecha_registro: new Date().toISOString().split("T")[0], semana_gestacional: "", fecha_probable_parto: "", estado: "Gestante", restricciones: "", proximo_control: "", medico_responsable: "", observaciones: "" };
  const [form, setForm] = useState(initForm);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vigilancia_gestante")
      .select("*, trabajadores(nombre)")
      .eq("empresa_id", empresaId)
      .order("fecha_registro", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const getEstadoBadge = (estado) => {
    if (estado === "Gestante") return "purple";
    if (estado === "Post-parto") return "blue";
    if (estado === "Lactancia") return "amber";
    return "gray";
  };

  const diasParaParto = (fecha) => {
    if (!fecha) return null;
    const diff = new Date(fecha) - new Date();
    const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return dias;
  };

  const openEdit = (r) => { setForm({ trabajador_id: r.trabajador_id, fecha_registro: r.fecha_registro, semana_gestacional: r.semana_gestacional != null ? String(r.semana_gestacional) : "", fecha_probable_parto: r.fecha_probable_parto || "", estado: r.estado || "Gestante", restricciones: r.restricciones || "", proximo_control: r.proximo_control || "", medico_responsable: r.medico_responsable || "", observaciones: r.observaciones || "" }); setEditing(r.id); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(initForm); };
  const handleDelete = async (id) => { if (!confirm("¿Eliminar este registro?")) return; await supabase.from("vigilancia_gestante").delete().eq("id", id); showToast("Eliminado", "info"); load(); };

  const handleSave = async () => {
    if (!form.trabajador_id || !form.fecha_registro) {
      showToast("Selecciona trabajadora y fecha", "error"); return;
    }
    setSaving(true);
    const payload = { empresa_id: empresaId, trabajador_id: form.trabajador_id, fecha_registro: form.fecha_registro, semana_gestacional: form.semana_gestacional ? parseInt(form.semana_gestacional) : null, fecha_probable_parto: form.fecha_probable_parto || null, estado: form.estado, restricciones: form.restricciones, proximo_control: form.proximo_control || null, medico_responsable: form.medico_responsable, observaciones: form.observaciones };
    const { error } = editing ? await supabase.from("vigilancia_gestante").update(payload).eq("id", editing) : await supabase.from("vigilancia_gestante").insert(payload);
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast(editing ? "Registro actualizado" : "Registro guardado", "success");
    closeModal(); load();
  };

  const activas = records.filter(r => r.estado === "Gestante");
  const proximasControl = records.filter(r => {
    if (!r.proximo_control) return false;
    const diff = new Date(r.proximo_control) - new Date();
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  });
  const proximasParto = records.filter(r => {
    const d = diasParaParto(r.fecha_probable_parto);
    return d !== null && d >= 0 && d <= 30;
  });

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Vigilancia de la Trabajadora Gestante</h3>
          <p className="text-gray-500 text-xs max-w-xl">Seguimiento médico en gestación, lactancia y post-parto. Restricciones laborales y controles prenatales. (Ley 29783)</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <ExportBtn data={records.map(r => ({ Trabajadora: r.trabajadores?.nombre || "", Fecha: r.fecha_registro, "Sem. Gestacional": r.semana_gestacional ?? "", "F. Probable Parto": r.fecha_probable_parto || "", Estado: r.estado, Restricciones: r.restricciones || "", "Próx. Control": r.proximo_control || "", Médico: r.medico_responsable || "" }))} filename="gestante" />
          <Btn size="sm" variant="primary" onClick={() => { setEditing(null); setForm(initForm); setShowModal(true); }}><Plus size={13} /> Nueva Ficha</Btn>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <KpiCard label="Gestantes activas" value={activas.length} sub="Estado: Gestante" accentColor="purple" />
        <KpiCard label="Control próx. 7 días" value={proximasControl.length} sub="Requieren atención" accentColor="amber" />
        <KpiCard label="Parto en 30 días" value={proximasParto.length} sub="Fecha probable próxima" accentColor="blue" />
      </div>

      {proximasParto.length > 0 && (
        <div className="bg-purple-900/20 border border-purple-800 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-purple-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-purple-400 text-xs font-semibold mb-1">{proximasParto.length} trabajadora(s) con fecha probable de parto en los próximos 30 días</p>
            <p className="text-purple-600 text-xs">Coordinar con RRHH y área médica para gestión de descanso pre-natal.</p>
          </div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {["Trabajadora", "Estado", "Semana Gest.", "F. Probable Parto", "Restricciones", "Próx. Control", "Médico", ""].map(h => (
                <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
            {!loading && records.map(r => {
              const dias = diasParaParto(r.fecha_probable_parto);
              return (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-white">{r.trabajadores?.nombre || "—"}</td>
                  <td className="px-4 py-3"><Badge color={getEstadoBadge(r.estado)}>{r.estado}</Badge></td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-300">{r.semana_gestacional ? `${r.semana_gestacional} sem.` : "—"}</td>
                  <td className="px-4 py-3">
                    {r.fecha_probable_parto ? (
                      <span className="flex flex-col">
                        <span className="font-mono text-xs text-gray-400">{r.fecha_probable_parto}</span>
                        {dias !== null && <span className={`text-[10px] font-medium ${dias <= 30 ? "text-amber-400" : "text-gray-600"}`}>{dias > 0 ? `en ${dias} días` : "Pasada"}</span>}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-[160px] truncate">{r.restricciones || <span className="text-gray-600">Ninguna</span>}</td>
                  <td className={`px-4 py-3 font-mono text-xs ${proximasControl.find(p => p.id === r.id) ? "text-amber-400 font-semibold" : "text-gray-500"}`}>{r.proximo_control || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.medico_responsable || "—"}</td>
                  <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button><button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button></div></td>
                </tr>
              );
            })}
            {!loading && !records.length && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-600 text-sm">Sin registros. Usa "Nueva Ficha" para comenzar.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? "Editar Ficha — Trabajadora Gestante" : "Nueva Ficha — Trabajadora Gestante"} onClose={closeModal} wide>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Trabajadora *">
              <Select value={form.trabajador_id} onChange={e => setForm({ ...form, trabajador_id: e.target.value })}>
                <option value="">Seleccionar...</option>
                {workers.filter(w => w.estado === "Activo").map(w => <option key={w.id} value={w.id}>{w.nombre}</option>)}
              </Select>
            </FormField>
            <FormField label="Fecha de Registro *">
              <Input type="date" value={form.fecha_registro} onChange={e => setForm({ ...form, fecha_registro: e.target.value })} />
            </FormField>
            <FormField label="Estado">
              <Select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                <option>Gestante</option><option>Post-parto</option><option>Lactancia</option>
              </Select>
            </FormField>
            <FormField label="Semana Gestacional">
              <Input type="number" min="1" max="42" placeholder="20" value={form.semana_gestacional} onChange={e => setForm({ ...form, semana_gestacional: e.target.value })} />
            </FormField>
            <FormField label="Fecha Probable de Parto">
              <Input type="date" value={form.fecha_probable_parto} onChange={e => setForm({ ...form, fecha_probable_parto: e.target.value })} />
            </FormField>
            <FormField label="Próximo Control Médico">
              <Input type="date" value={form.proximo_control} onChange={e => setForm({ ...form, proximo_control: e.target.value })} />
            </FormField>
            <FormField label="Restricciones Laborales">
              <Input placeholder="Ej: No carga de peso, no exposición a químicos..." value={form.restricciones} onChange={e => setForm({ ...form, restricciones: e.target.value })} />
            </FormField>
            <FormField label="Médico Responsable">
              <Input placeholder="Nombre del médico" value={form.medico_responsable} onChange={e => setForm({ ...form, medico_responsable: e.target.value })} />
            </FormField>
            <FormField label="Observaciones">
              <Input placeholder="Notas adicionales..." value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
            </FormField>
          </div>
          <div className="flex gap-2 mt-5 justify-end">
            <Btn variant="default" onClick={closeModal}>Cancelar</Btn>
            <Btn variant="primary" disabled={saving} onClick={handleSave}>{saving ? "Guardando..." : editing ? "Actualizar" : "Guardar Ficha"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function EstilosVidaModulo({ workers, empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const initForm = { trabajador_id: "", fecha_evaluacion: new Date().toISOString().split("T")[0], peso: "", talla: "", perimetro_abdominal: "", presion_sistolica: "", presion_diastolica: "", glucosa: "", fumador: false, consume_alcohol: false, sedentario: false, nivel_actividad: "Moderado", observaciones: "", medico_responsable: "" };
  const [form, setForm] = useState(initForm);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vigilancia_estilos_vida")
      .select("*, trabajadores(nombre)")
      .eq("empresa_id", empresaId)
      .order("fecha_evaluacion", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const calcIMC = (peso, talla) => {
    const p = parseFloat(peso); const t = parseFloat(talla);
    if (!p || !t || t <= 0) return null;
    return (p / (t * t)).toFixed(1);
  };

  const getIMCCategoria = (imc) => {
    const v = parseFloat(imc);
    if (!v) return { label: "—", color: "gray" };
    if (v < 18.5) return { label: "Bajo peso", color: "blue" };
    if (v < 25) return { label: "Normal", color: "green" };
    if (v < 30) return { label: "Sobrepeso", color: "amber" };
    return { label: "Obesidad", color: "red" };
  };

  const getPresionCategoria = (sis, dia) => {
    const s = parseInt(sis); const d = parseInt(dia);
    if (!s || !d) return { label: "—", color: "gray" };
    if (s >= 140 || d >= 90) return { label: "HTA Grado 2", color: "red" };
    if (s >= 130 || d >= 80) return { label: "HTA Grado 1", color: "amber" };
    return { label: "Normal", color: "green" };
  };

  const getGlucosaCategoria = (g) => {
    const v = parseFloat(g);
    if (!v) return { label: "—", color: "gray" };
    if (v >= 126) return { label: "Diabetes", color: "red" };
    if (v >= 100) return { label: "Prediabetes", color: "amber" };
    return { label: "Normal", color: "green" };
  };

  const imcPreview = calcIMC(form.peso, form.talla);

  const handleSave = async () => {
    if (!form.trabajador_id || !form.fecha_evaluacion) {
      showToast("Selecciona trabajador y fecha", "error"); return;
    }
    const imc = calcIMC(form.peso, form.talla);
    setSaving(true);
    const payload = { empresa_id: empresaId, trabajador_id: form.trabajador_id, fecha_evaluacion: form.fecha_evaluacion, peso: form.peso ? parseFloat(form.peso) : null, talla: form.talla ? parseFloat(form.talla) : null, imc: imc ? parseFloat(imc) : null, perimetro_abdominal: form.perimetro_abdominal ? parseFloat(form.perimetro_abdominal) : null, presion_sistolica: form.presion_sistolica ? parseInt(form.presion_sistolica) : null, presion_diastolica: form.presion_diastolica ? parseInt(form.presion_diastolica) : null, glucosa: form.glucosa ? parseFloat(form.glucosa) : null, fumador: form.fumador, consume_alcohol: form.consume_alcohol, sedentario: form.sedentario, nivel_actividad: form.nivel_actividad, observaciones: form.observaciones, medico_responsable: form.medico_responsable };
    const { error } = editing ? await supabase.from("vigilancia_estilos_vida").update(payload).eq("id", editing) : await supabase.from("vigilancia_estilos_vida").insert(payload);
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast(editing ? "Registro actualizado" : "Evaluación registrada", "success");
    closeModal(); load();
  };
  const openEdit = (r) => { setForm({ trabajador_id: r.trabajador_id, fecha_evaluacion: r.fecha_evaluacion, peso: r.peso != null ? String(r.peso) : "", talla: r.talla != null ? String(r.talla) : "", perimetro_abdominal: r.perimetro_abdominal != null ? String(r.perimetro_abdominal) : "", presion_sistolica: r.presion_sistolica != null ? String(r.presion_sistolica) : "", presion_diastolica: r.presion_diastolica != null ? String(r.presion_diastolica) : "", glucosa: r.glucosa != null ? String(r.glucosa) : "", fumador: r.fumador || false, consume_alcohol: r.consume_alcohol || false, sedentario: r.sedentario || false, nivel_actividad: r.nivel_actividad || "Moderado", observaciones: r.observaciones || "", medico_responsable: r.medico_responsable || "" }); setEditing(r.id); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(initForm); };
  const handleDelete = async (id) => { if (!confirm("¿Eliminar este registro?")) return; await supabase.from("vigilancia_estilos_vida").delete().eq("id", id); showToast("Eliminado", "info"); load(); };

  const now = new Date();
  const thisMes = records.filter(r => { const d = new Date(r.fecha_evaluacion); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const conSobrepeso = records.filter(r => r.imc && r.imc >= 25);
  const conHabitos = records.filter(r => r.fumador || r.consume_alcohol);

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Estilos de Vida Saludable</h3>
          <p className="text-gray-500 text-xs max-w-xl">IMC, presión arterial, glucosa y hábitos de riesgo. Cálculo automático de categorías según rangos clínicos.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <ExportBtn data={records.map(r => ({ Trabajador: r.trabajadores?.nombre || "", Fecha: r.fecha_evaluacion, Peso: r.peso ?? "", Talla: r.talla ?? "", IMC: r.imc ?? "", "Perímetro Abd.": r.perimetro_abdominal ?? "", "PA Sistólica": r.presion_sistolica ?? "", "PA Diastólica": r.presion_diastolica ?? "", Glucosa: r.glucosa ?? "", Fumador: r.fumador ? "Sí" : "No", Alcohol: r.consume_alcohol ? "Sí" : "No", Sedentario: r.sedentario ? "Sí" : "No" }))} filename="estilos_vida" />
          <Btn size="sm" variant="primary" onClick={() => { setEditing(null); setForm(initForm); setShowModal(true); }}><Plus size={13} /> Nueva Evaluación</Btn>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <KpiCard label="Evaluaciones este mes" value={thisMes.length} sub="Registros del mes actual" accentColor="blue" />
        <KpiCard label="Sobrepeso / Obesidad" value={conSobrepeso.length} sub="IMC ≥ 25" accentColor="amber" />
        <KpiCard label="Con hábitos de riesgo" value={conHabitos.length} sub="Fumador y/o alcohol" accentColor="red" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {["Trabajador", "Fecha", "IMC", "Categoría", "Presión Art.", "Glucosa", "Hábitos Riesgo", ""].map(h => (
                <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
            {!loading && records.map(r => {
              const imcCat = getIMCCategoria(r.imc);
              const presCat = getPresionCategoria(r.presion_sistolica, r.presion_diastolica);
              const glucCat = getGlucosaCategoria(r.glucosa);
              const habitos = [r.fumador && "Fumador", r.consume_alcohol && "Alcohol", r.sedentario && "Sedentario"].filter(Boolean);
              return (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-white">{r.trabajadores?.nombre || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.fecha_evaluacion}</td>
                  <td className="px-4 py-3 font-mono font-bold text-sm text-gray-200">{r.imc ?? "—"}</td>
                  <td className="px-4 py-3"><Badge color={imcCat.color}>{imcCat.label}</Badge></td>
                  <td className="px-4 py-3">
                    {r.presion_sistolica ? (
                      <span className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-gray-300">{r.presion_sistolica}/{r.presion_diastolica}</span>
                        <Badge color={presCat.color}>{presCat.label}</Badge>
                      </span>
                    ) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.glucosa ? (
                      <span className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-gray-300">{r.glucosa}</span>
                        <Badge color={glucCat.color}>{glucCat.label}</Badge>
                      </span>
                    ) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {habitos.length ? habitos.map(h => <Badge key={h} color="orange">{h}</Badge>) : <span className="text-gray-600 text-xs">Ninguno</span>}
                  </td>
                  <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button><button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button></div></td>
                </tr>
              );
            })}
            {!loading && !records.length && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-600 text-sm">Sin evaluaciones. Usa "Nueva Evaluación" para comenzar.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? "Editar — Estilos de Vida Saludable" : "Nueva Evaluación — Estilos de Vida Saludable"} onClose={closeModal} wide>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Trabajador *">
              <Select value={form.trabajador_id} onChange={e => setForm({ ...form, trabajador_id: e.target.value })}>
                <option value="">Seleccionar...</option>
                {workers.filter(w => w.estado === "Activo").map(w => <option key={w.id} value={w.id}>{w.nombre}</option>)}
              </Select>
            </FormField>
            <FormField label="Fecha de Evaluación *">
              <Input type="date" value={form.fecha_evaluacion} onChange={e => setForm({ ...form, fecha_evaluacion: e.target.value })} />
            </FormField>

            <div className="col-span-2">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Antropometría</p>
              <div className="grid grid-cols-3 gap-3">
                <FormField label="Peso (kg)">
                  <Input type="number" step="0.1" placeholder="70.5" value={form.peso} onChange={e => setForm({ ...form, peso: e.target.value })} />
                </FormField>
                <FormField label="Talla (m)">
                  <Input type="number" step="0.01" placeholder="1.70" value={form.talla} onChange={e => setForm({ ...form, talla: e.target.value })} />
                </FormField>
                <FormField label="IMC (calculado)">
                  <div className="flex items-center gap-2 h-9 px-3 bg-gray-800 border border-gray-700 rounded-lg">
                    <span className={`font-mono font-bold text-sm ${imcPreview ? getIMCCategoria(imcPreview).color === "red" ? "text-red-400" : getIMCCategoria(imcPreview).color === "amber" ? "text-amber-400" : getIMCCategoria(imcPreview).color === "green" ? "text-emerald-400" : "text-blue-400" : "text-gray-600"}`}>
                      {imcPreview ?? "—"}
                    </span>
                    {imcPreview && <Badge color={getIMCCategoria(imcPreview).color}>{getIMCCategoria(imcPreview).label}</Badge>}
                  </div>
                </FormField>
              </div>
              <FormField label="Perímetro Abdominal (cm)">
                <Input type="number" step="0.5" placeholder="90" value={form.perimetro_abdominal} onChange={e => setForm({ ...form, perimetro_abdominal: e.target.value })} />
              </FormField>
            </div>

            <div className="col-span-2">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Signos Vitales / Laboratorio</p>
              <div className="grid grid-cols-3 gap-3">
                <FormField label="Presión Sistólica (mmHg)">
                  <Input type="number" placeholder="120" value={form.presion_sistolica} onChange={e => setForm({ ...form, presion_sistolica: e.target.value })} />
                </FormField>
                <FormField label="Presión Diastólica (mmHg)">
                  <Input type="number" placeholder="80" value={form.presion_diastolica} onChange={e => setForm({ ...form, presion_diastolica: e.target.value })} />
                </FormField>
                <FormField label="Glucosa en Ayunas (mg/dL)">
                  <Input type="number" placeholder="90" value={form.glucosa} onChange={e => setForm({ ...form, glucosa: e.target.value })} />
                </FormField>
              </div>
            </div>

            <div className="col-span-2">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Hábitos y Estilo de Vida</p>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Nivel de Actividad Física">
                  <Select value={form.nivel_actividad} onChange={e => setForm({ ...form, nivel_actividad: e.target.value })}>
                    <option>Sedentario</option><option>Leve</option><option>Moderado</option><option>Intenso</option>
                  </Select>
                </FormField>
                <div className="flex flex-col justify-end gap-2 pb-1">
                  {[["fumador", "Fumador"], ["consume_alcohol", "Consume alcohol"], ["sedentario", "Sedentario"]].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form[key]} onChange={e => setForm({ ...form, [key]: e.target.checked })} className="w-3.5 h-3.5 rounded accent-blue-500" />
                      <span className="text-xs text-gray-400">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <FormField label="Médico Responsable">
              <Input placeholder="Nombre del médico" value={form.medico_responsable} onChange={e => setForm({ ...form, medico_responsable: e.target.value })} />
            </FormField>
            <FormField label="Observaciones / Recomendaciones">
              <Input placeholder="Dieta, ejercicio, derivaciones..." value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
            </FormField>
          </div>
          <div className="flex gap-2 mt-5 justify-end">
            <Btn variant="default" onClick={closeModal}>Cancelar</Btn>
            <Btn variant="primary" disabled={saving} onClick={handleSave}>{saving ? "Guardando..." : editing ? "Actualizar" : "Guardar Evaluación"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function DescansosMedicosModulo({ workers, empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    trabajador_id: "", fecha_inicio: "", fecha_fin: "",
    tipo_reposo: "Domiciliario", diagnostico: "", cie10: "",
    medico_responsable: "", centro_medico: "", observaciones: "",
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vigilancia_descansos")
      .select("*, trabajadores(nombre)")
      .eq("empresa_id", empresaId)
      .order("fecha_inicio", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  function estadoDescanso(r) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const fin = new Date(r.fecha_fin + "T00:00:00");
    const en7 = new Date(today); en7.setDate(en7.getDate() + 7);
    if (fin < today) return "Vencido";
    if (fin <= en7) return "Próximo a vencer";
    return "Activo";
  }

  function diasDescanso(r) {
    const ini = new Date(r.fecha_inicio + "T00:00:00");
    const fin = new Date(r.fecha_fin + "T00:00:00");
    return Math.max(1, Math.round((fin - ini) / 86400000) + 1);
  }

  const now = new Date();
  const activos = records.filter(r => estadoDescanso(r) === "Activo");
  const mesActual = records.filter(r => {
    const ini = new Date(r.fecha_inicio + "T00:00:00");
    return ini.getMonth() === now.getMonth() && ini.getFullYear() === now.getFullYear();
  });
  const diasMes = mesActual.reduce((acc, r) => acc + diasDescanso(r), 0);
  const proximos = records.filter(r => estadoDescanso(r) === "Próximo a vencer");

  const [editing, setEditing] = useState(null);
  const resetForm = () => setForm({ trabajador_id: "", fecha_inicio: "", fecha_fin: "", tipo_reposo: "Domiciliario", diagnostico: "", cie10: "", medico_responsable: "", centro_medico: "", observaciones: "" });
  const openEdit = (r) => { setForm({ trabajador_id: r.trabajador_id, fecha_inicio: r.fecha_inicio, fecha_fin: r.fecha_fin, tipo_reposo: r.tipo_reposo || "Domiciliario", diagnostico: r.diagnostico || "", cie10: r.cie10 || "", medico_responsable: r.medico_responsable || "", centro_medico: r.centro_medico || "", observaciones: r.observaciones || "" }); setEditing(r.id); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); resetForm(); };

  const handleSave = async () => {
    if (!form.trabajador_id || !form.fecha_inicio || !form.fecha_fin) {
      showToast("Trabajador, fecha inicio y fin son obligatorios", "error"); return;
    }
    setSaving(true);
    const { error } = editing
      ? await supabase.from("vigilancia_descansos").update({ ...form }).eq("id", editing)
      : await supabase.from("vigilancia_descansos").insert({ ...form, empresa_id: empresaId });
    if (error) { showToast("Error: " + error.message, "error"); }
    else { showToast(editing ? "Registro actualizado" : "Descanso registrado", "success"); closeModal(); load(); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este registro?")) return;
    await supabase.from("vigilancia_descansos").delete().eq("id", id);
    showToast("Registro eliminado", "info"); load();
  };

  const badgeColor = (e) => e === "Activo" ? "green" : e === "Vencido" ? "red" : "amber";

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Descansos Médicos</h3>
          <p className="text-gray-500 text-xs max-w-xl">Registro y seguimiento de reposos médicos del personal. Control de días activos y vencimientos.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <ExportBtn data={records.map(r => ({ Trabajador: r.trabajadores?.nombre || "", "Tipo Reposo": r.tipo_reposo, Inicio: r.fecha_inicio, Fin: r.fecha_fin, Días: diasDescanso(r), Diagnóstico: r.diagnostico || "", "CIE-10": r.cie10 || "", "Centro Médico": r.centro_medico || "", Estado: estadoDescanso(r), Médico: r.medico_responsable || "" }))} filename="descansos_medicos" />
          <Btn size="sm" variant="primary" onClick={() => { setEditing(null); resetForm(); setShowModal(true); }}><Plus size={13} /> Nuevo Descanso</Btn>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <KpiCard label="Activos hoy" value={activos.length} sub={`${activos.length === 1 ? "trabajador" : "trabajadores"} con reposo activo`} accentColor="red" />
        <KpiCard label="Días acumulados (mes)" value={diasMes} sub={`en ${mesActual.length} descanso${mesActual.length !== 1 ? "s" : ""} del mes`} accentColor="amber" />
        <KpiCard label="Próximos a vencer" value={proximos.length} sub="vencen en los próximos 7 días" accentColor="blue" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500 text-sm">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {["Trabajador", "Tipo Reposo", "Inicio", "Fin", "Días", "Diagnóstico / CIE-10", "Centro Médico", "Estado", "Médico", ""].map(h => (
                  <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map(r => {
                const estado = estadoDescanso(r);
                return (
                  <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-medium text-white">{r.trabajadores?.nombre || "—"}</td>
                    <td className="px-4 py-3 text-gray-300 text-xs">{r.tipo_reposo}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.fecha_inicio}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.fecha_fin}</td>
                    <td className="px-4 py-3 text-center text-gray-300 font-mono text-xs">{diasDescanso(r)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{r.diagnostico}{r.cie10 ? <span className="ml-1 text-gray-600">({r.cie10})</span> : ""}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{r.centro_medico || "—"}</td>
                    <td className="px-4 py-3"><Badge color={badgeColor(estado)}>{estado}</Badge></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{r.medico_responsable || "—"}</td>
                    <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button><button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button></div></td>
                  </tr>
                );
              })}
              {!records.length && (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-600 text-sm">No hay descansos médicos registrados</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? "Editar Descanso Médico" : "Nuevo Descanso Médico"} onClose={closeModal}>
          <div className="space-y-4">
            <FormField label="Trabajador *">
              <Select value={form.trabajador_id} onChange={e => setForm(f => ({ ...f, trabajador_id: e.target.value }))}>
                <option value="">Seleccionar trabajador...</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.nombre}</option>)}
              </Select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Tipo de Reposo">
                <Select value={form.tipo_reposo} onChange={e => setForm(f => ({ ...f, tipo_reposo: e.target.value }))}>
                  {["Domiciliario","Hospitalario","Post-operatorio","Accidente de trabajo","Enfermedad profesional","Pre-natal","Post-natal"].map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Código CIE-10">
                <Input value={form.cie10} onChange={e => setForm(f => ({ ...f, cie10: e.target.value }))} placeholder="Ej: J06.9" />
              </FormField>
            </div>
            <FormField label="Diagnóstico">
              <Input value={form.diagnostico} onChange={e => setForm(f => ({ ...f, diagnostico: e.target.value }))} placeholder="Descripción clínica del diagnóstico" />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Fecha Inicio *">
                <Input type="date" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} />
              </FormField>
              <FormField label="Fecha Fin *">
                <Input type="date" value={form.fecha_fin} onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Médico Responsable">
                <Input value={form.medico_responsable} onChange={e => setForm(f => ({ ...f, medico_responsable: e.target.value }))} placeholder="Dr. Apellidos" />
              </FormField>
              <FormField label="Centro Médico / EsSalud">
                <Input value={form.centro_medico} onChange={e => setForm(f => ({ ...f, centro_medico: e.target.value }))} placeholder="EsSalud, clínica, hospital..." />
              </FormField>
            </div>
            <FormField label="Observaciones">
              <Input value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} placeholder="Restricciones laborales, seguimiento requerido..." />
            </FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={closeModal}>Cancelar</Btn>
              <Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : editing ? "Actualizar" : "Guardar"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function MorbilidadModulo({ workers, empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    trabajador_id: "", fecha_consulta: "", diagnostico: "", cie10: "",
    tipo_atencion: "Consulta", tipo_morbilidad: "No laboral",
    dias_reposo: "0", medico_responsable: "", observaciones: "",
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vigilancia_morbilidad")
      .select("*, trabajadores(nombre, area)")
      .eq("empresa_id", empresaId)
      .order("fecha_consulta", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const now = new Date();
  const delMes = records.filter(r => {
    const f = new Date(r.fecha_consulta + "T00:00:00");
    return f.getMonth() === now.getMonth() && f.getFullYear() === now.getFullYear();
  });
  const diasPerdidosMes = delMes.reduce((acc, r) => acc + (Number(r.dias_reposo) || 0), 0);

  const dxFrecuente = (() => {
    if (!records.length) return "—";
    const freq = {};
    records.forEach(r => { if (r.diagnostico) freq[r.diagnostico] = (freq[r.diagnostico] || 0) + 1; });
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0].substring(0, 20) + (top[0].length > 20 ? "…" : "") : "—";
  })();

  const [editing, setEditing] = useState(null);
  const resetForm = () => setForm({ trabajador_id: "", fecha_consulta: "", diagnostico: "", cie10: "", tipo_atencion: "Consulta", tipo_morbilidad: "No laboral", dias_reposo: "0", medico_responsable: "", observaciones: "" });
  const openEdit = (r) => { setForm({ trabajador_id: r.trabajador_id, fecha_consulta: r.fecha_consulta, diagnostico: r.diagnostico || "", cie10: r.cie10 || "", tipo_atencion: r.tipo_atencion || "Consulta", tipo_morbilidad: r.tipo_morbilidad || "No laboral", dias_reposo: String(r.dias_reposo ?? 0), medico_responsable: r.medico_responsable || "", observaciones: r.observaciones || "" }); setEditing(r.id); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); resetForm(); };

  const handleSave = async () => {
    if (!form.trabajador_id || !form.fecha_consulta || !form.diagnostico) {
      showToast("Trabajador, fecha y diagnóstico son obligatorios", "error"); return;
    }
    setSaving(true);
    const payload = { ...form, dias_reposo: Number(form.dias_reposo) || 0, empresa_id: empresaId };
    const { error } = editing
      ? await supabase.from("vigilancia_morbilidad").update(payload).eq("id", editing)
      : await supabase.from("vigilancia_morbilidad").insert(payload);
    if (error) { showToast("Error: " + error.message, "error"); }
    else { showToast(editing ? "Registro actualizado" : "Registro guardado", "success"); closeModal(); load(); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este registro?")) return;
    await supabase.from("vigilancia_morbilidad").delete().eq("id", id);
    showToast("Registro eliminado", "info"); load();
  };

  const tipoColor = (t) => t === "Accidente de trabajo" ? "red" : t === "Laboral" ? "amber" : "blue";
  const atencionColor = (t) => t === "Hospitalización" ? "red" : t === "Emergencia" ? "amber" : "green";

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Morbilidad</h3>
          <p className="text-gray-500 text-xs max-w-xl">Registro de consultas médicas, diagnósticos y ausentismo laboral. Identifica las causas más frecuentes de morbilidad en el centro de trabajo.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <ExportBtn data={records.map(r => ({ Trabajador: r.trabajadores?.nombre || "", Fecha: r.fecha_consulta, Diagnóstico: r.diagnostico, "CIE-10": r.cie10 || "", "Tipo Atención": r.tipo_atencion, "Tipo Morbilidad": r.tipo_morbilidad, "Días Reposo": r.dias_reposo ?? 0, Médico: r.medico_responsable || "" }))} filename="morbilidad" />
          <Btn size="sm" variant="primary" onClick={() => { setEditing(null); resetForm(); setShowModal(true); }}><Plus size={13} /> Nueva Consulta</Btn>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <KpiCard label="Consultas este mes" value={delMes.length} sub={`${records.length} total registradas`} accentColor="blue" />
        <KpiCard label="Dx más frecuente" value={dxFrecuente} sub="diagnóstico con más recurrencias" accentColor="purple" />
        <KpiCard label="Días perdidos (mes)" value={diasPerdidosMes} sub="días de reposo acumulados" accentColor="red" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500 text-sm">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {["Trabajador", "Fecha", "Diagnóstico", "CIE-10", "Tipo Atención", "Tipo Morbilidad", "Días Reposo", "Médico", ""].map(h => (
                  <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-white">{r.trabajadores?.nombre || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.fecha_consulta}</td>
                  <td className="px-4 py-3 text-gray-300 text-xs max-w-[160px] truncate">{r.diagnostico}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.cie10 || "—"}</td>
                  <td className="px-4 py-3"><Badge color={atencionColor(r.tipo_atencion)}>{r.tipo_atencion}</Badge></td>
                  <td className="px-4 py-3"><Badge color={tipoColor(r.tipo_morbilidad)}>{r.tipo_morbilidad}</Badge></td>
                  <td className="px-4 py-3 text-center font-mono text-xs text-gray-300">{r.dias_reposo ?? 0}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.medico_responsable || "—"}</td>
                  <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button><button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button></div></td>
                </tr>
              ))}
              {!records.length && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-600 text-sm">Sin registros de morbilidad aún</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? "Editar Consulta de Morbilidad" : "Nueva Consulta / Registro de Morbilidad"} onClose={closeModal}>
          <div className="space-y-4">
            <FormField label="Trabajador *">
              <Select value={form.trabajador_id} onChange={e => setForm(f => ({ ...f, trabajador_id: e.target.value }))}>
                <option value="">Seleccionar trabajador...</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.nombre}</option>)}
              </Select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Fecha Consulta *">
                <Input type="date" value={form.fecha_consulta} onChange={e => setForm(f => ({ ...f, fecha_consulta: e.target.value }))} />
              </FormField>
              <FormField label="Código CIE-10">
                <Input value={form.cie10} onChange={e => setForm(f => ({ ...f, cie10: e.target.value }))} placeholder="Ej: J06.9, M54.5" />
              </FormField>
            </div>
            <FormField label="Diagnóstico *">
              <Input value={form.diagnostico} onChange={e => setForm(f => ({ ...f, diagnostico: e.target.value }))} placeholder="Descripción del diagnóstico médico" />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Tipo de Atención">
                <Select value={form.tipo_atencion} onChange={e => setForm(f => ({ ...f, tipo_atencion: e.target.value }))}>
                  {["Consulta", "Emergencia", "Hospitalización", "Tópico empresa"].map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Tipo de Morbilidad">
                <Select value={form.tipo_morbilidad} onChange={e => setForm(f => ({ ...f, tipo_morbilidad: e.target.value }))}>
                  {["No laboral", "Laboral", "Accidente de trabajo", "Enfermedad profesional"].map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Días de Reposo">
                <Input type="number" min="0" value={form.dias_reposo} onChange={e => setForm(f => ({ ...f, dias_reposo: e.target.value }))} placeholder="0" />
              </FormField>
              <FormField label="Médico Responsable">
                <Input value={form.medico_responsable} onChange={e => setForm(f => ({ ...f, medico_responsable: e.target.value }))} placeholder="Dr. Apellidos" />
              </FormField>
            </div>
            <FormField label="Observaciones">
              <Input value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} placeholder="Tratamiento indicado, seguimiento..." />
            </FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={closeModal}>Cancelar</Btn>
              <Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : editing ? "Actualizar" : "Guardar"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function RadiacionUVModulo({ workers, empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    trabajador_id: "", fecha_evaluacion: "", zona_area: "",
    horas_exposicion: "", indice_uv: "", epp_asignado: "",
    fotoprotector: "Sí", proxima_revision: "", observaciones: "",
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vigilancia_radiacion")
      .select("*, trabajadores(nombre)")
      .eq("empresa_id", empresaId)
      .order("fecha_evaluacion", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  function nivelUV(idx) {
    const v = Number(idx);
    if (v >= 11) return "Extremo";
    if (v >= 8) return "Muy Alto";
    if (v >= 6) return "Alto";
    if (v >= 3) return "Moderado";
    return "Bajo";
  }
  function nivelColor(n) {
    return n === "Extremo" ? "purple" : n === "Muy Alto" ? "red" : n === "Alto" ? "amber" : n === "Moderado" ? "blue" : "green";
  }

  const altoRiesgo = records.filter(r => ["Alto", "Muy Alto", "Extremo"].includes(nivelUV(r.indice_uv)));
  const now = new Date();
  const delMes = records.filter(r => { const f = new Date(r.fecha_evaluacion + "T00:00:00"); return f.getMonth() === now.getMonth() && f.getFullYear() === now.getFullYear(); });

  const [editing, setEditing] = useState(null);
  const resetForm = () => setForm({ trabajador_id: "", fecha_evaluacion: "", zona_area: "", horas_exposicion: "", indice_uv: "", epp_asignado: "", fotoprotector: "Sí", proxima_revision: "", observaciones: "" });
  const openEdit = (r) => { setForm({ trabajador_id: r.trabajador_id, fecha_evaluacion: r.fecha_evaluacion, zona_area: r.zona_area || "", horas_exposicion: r.horas_exposicion != null ? String(r.horas_exposicion) : "", indice_uv: r.indice_uv != null ? String(r.indice_uv) : "", epp_asignado: r.epp_asignado || "", fotoprotector: r.fotoprotector || "Sí", proxima_revision: r.proxima_revision || "", observaciones: r.observaciones || "" }); setEditing(r.id); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); resetForm(); };

  const handleSave = async () => {
    if (!form.trabajador_id || !form.fecha_evaluacion) { showToast("Trabajador y fecha son obligatorios", "error"); return; }
    setSaving(true);
    const payload = { ...form, horas_exposicion: Number(form.horas_exposicion) || 0, indice_uv: Number(form.indice_uv) || 0, empresa_id: empresaId };
    const { error } = editing ? await supabase.from("vigilancia_radiacion").update(payload).eq("id", editing) : await supabase.from("vigilancia_radiacion").insert(payload);
    if (error) { showToast("Error: " + error.message, "error"); }
    else { showToast(editing ? "Registro actualizado" : "Registro guardado", "success"); closeModal(); load(); }
    setSaving(false);
  };
  const handleDelete = async (id) => { if (!confirm("¿Eliminar?")) return; await supabase.from("vigilancia_radiacion").delete().eq("id", id); showToast("Eliminado", "info"); load(); };

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Radiación Ultravioleta</h3>
          <p className="text-gray-500 text-xs max-w-xl">Control de exposición a radiación UV solar en trabajadores de campo, campamentos y áreas exteriores. Basado en índice UV y horas de exposición diaria.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <ExportBtn data={records.map(r => ({ Trabajador: r.trabajadores?.nombre || "", Fecha: r.fecha_evaluacion, "Zona/Área": r.zona_area || "", "Hrs Exp/día": r.horas_exposicion ?? "", "Índice UV": r.indice_uv ?? "", Nivel: nivelUV(r.indice_uv), "EPP Asignado": r.epp_asignado || "", Fotoprotector: r.fotoprotector || "", "Próx. Revisión": r.proxima_revision || "" }))} filename="radiacion_uv" />
          <Btn size="sm" variant="primary" onClick={() => { setEditing(null); resetForm(); setShowModal(true); }}><Plus size={13} /> Nueva Evaluación</Btn>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <KpiCard label="Bajo vigilancia" value={records.length} sub={`${delMes.length} evaluados este mes`} accentColor="blue" />
        <KpiCard label="Riesgo Alto / Muy Alto / Extremo" value={altoRiesgo.length} sub="requieren EPP reforzado" accentColor="red" />
        <KpiCard label="Con fotoprotector" value={records.filter(r => r.fotoprotector === "Sí").length} sub="de un total de " accentColor="green" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16 text-gray-500 text-sm">Cargando...</div> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800">
              {["Trabajador", "Fecha", "Zona / Área", "Hrs Exp/día", "Índice UV", "Nivel", "EPP Asignado", "Fotoprotector", "Próx. Revisión", ""].map(h => (
                <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {records.map(r => {
                const nivel = nivelUV(r.indice_uv);
                return (
                  <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-medium text-white">{r.trabajadores?.nombre || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.fecha_evaluacion}</td>
                    <td className="px-4 py-3 text-gray-300 text-xs">{r.zona_area || "—"}</td>
                    <td className="px-4 py-3 text-center text-gray-300 font-mono text-xs">{r.horas_exposicion ?? "—"}</td>
                    <td className="px-4 py-3 text-center font-bold text-gray-200">{r.indice_uv ?? "—"}</td>
                    <td className="px-4 py-3"><Badge color={nivelColor(nivel)}>{nivel}</Badge></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{r.epp_asignado || "—"}</td>
                    <td className="px-4 py-3"><Badge color={r.fotoprotector === "Sí" ? "green" : "red"}>{r.fotoprotector || "No"}</Badge></td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.proxima_revision || "—"}</td>
                    <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button><button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button></div></td>
                  </tr>
                );
              })}
              {!records.length && <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-600 text-sm">Sin evaluaciones registradas</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? "Editar — Radiación UV" : "Nueva Evaluación Radiación UV"} onClose={closeModal}>
          <div className="space-y-4">
            <FormField label="Trabajador *">
              <Select value={form.trabajador_id} onChange={e => setForm(f => ({ ...f, trabajador_id: e.target.value }))}>
                <option value="">Seleccionar trabajador...</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.nombre}</option>)}
              </Select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Fecha Evaluación *"><Input type="date" value={form.fecha_evaluacion} onChange={e => setForm(f => ({ ...f, fecha_evaluacion: e.target.value }))} /></FormField>
              <FormField label="Zona / Área Trabajo"><Input value={form.zona_area} onChange={e => setForm(f => ({ ...f, zona_area: e.target.value }))} placeholder="Campamento norte, exterior..." /></FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Horas de Exposición / día"><Input type="number" min="0" max="24" step="0.5" value={form.horas_exposicion} onChange={e => setForm(f => ({ ...f, horas_exposicion: e.target.value }))} placeholder="Ej: 6" /></FormField>
              <FormField label="Índice UV (0–11+)">
                <Input type="number" min="0" max="20" step="0.1" value={form.indice_uv} onChange={e => setForm(f => ({ ...f, indice_uv: e.target.value }))} placeholder="Ej: 8" />
                {form.indice_uv && <p className="text-xs mt-1" style={{color: nivelColor(nivelUV(form.indice_uv)) === "red" ? "#f87171" : nivelColor(nivelUV(form.indice_uv)) === "amber" ? "#fbbf24" : nivelColor(nivelUV(form.indice_uv)) === "green" ? "#4ade80" : "#c084fc"}}>Nivel: {nivelUV(form.indice_uv)}</p>}
              </FormField>
            </div>
            <FormField label="EPP Asignado"><Input value={form.epp_asignado} onChange={e => setForm(f => ({ ...f, epp_asignado: e.target.value }))} placeholder="Lentes UV, sombrero ala ancha, camiseta manga larga..." /></FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Fotoprotector">
                <Select value={form.fotoprotector} onChange={e => setForm(f => ({ ...f, fotoprotector: e.target.value }))}>
                  {["Sí", "No", "Pendiente de entrega"].map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Próxima Revisión"><Input type="date" value={form.proxima_revision} onChange={e => setForm(f => ({ ...f, proxima_revision: e.target.value }))} /></FormField>
            </div>
            <FormField label="Observaciones"><Input value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} placeholder="Condiciones especiales, recomendaciones..." /></FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={closeModal}>Cancelar</Btn>
              <Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : editing ? "Actualizar" : "Guardar"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ProteccionRespiratoriaModulo({ workers, empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const initForm = {
    trabajador_id: "", fecha_evaluacion: "", agente_exposicion: "",
    tipo_respirador: "", prueba_ajuste: "Pendiente", fecha_prueba_ajuste: "",
    espirometria: "Pendiente", fecha_espirometria: "", proxima_revision: "", observaciones: "",
  };
  const [form, setForm] = useState(initForm);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vigilancia_respiratoria")
      .select("*, trabajadores(nombre)")
      .eq("empresa_id", empresaId)
      .order("fecha_evaluacion", { ascending: false });
    if (error) showToast("Error al cargar datos: " + error.message, "error");
    setRecords(data || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const ajusteAprobado = records.filter(r => r.prueba_ajuste === "Aprobado").length;
  const espiroPendiente = records.filter(r => r.espirometria === "Pendiente").length;
  const now = new Date();
  const delMes = records.filter(r => { const f = new Date(r.fecha_evaluacion + "T00:00:00"); return f.getMonth() === now.getMonth() && f.getFullYear() === now.getFullYear(); });

  const ajusteColor = (v) => v === "Aprobado" ? "green" : v === "Rechazado" ? "red" : "amber";
  const espiroColor = (v) => v === "Normal" ? "green" : v === "Pendiente" ? "amber" : "red";

  const resetForm = () => setForm(initForm);
  const openEdit = (r) => { setForm({ trabajador_id: r.trabajador_id, fecha_evaluacion: r.fecha_evaluacion, agente_exposicion: r.agente_exposicion || "", tipo_respirador: r.tipo_respirador || "", prueba_ajuste: r.prueba_ajuste || "Pendiente", fecha_prueba_ajuste: r.fecha_prueba_ajuste || "", espirometria: r.espirometria || "Pendiente", fecha_espirometria: r.fecha_espirometria || "", proxima_revision: r.proxima_revision || "", observaciones: r.observaciones || "" }); setEditing(r.id); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); resetForm(); };

  const handleSave = async () => {
    if (!form.trabajador_id || !form.fecha_evaluacion) { showToast("Trabajador y fecha son obligatorios", "error"); return; }
    setSaving(true);
    const payload = { ...form, empresa_id: empresaId };
    const { error } = editing ? await supabase.from("vigilancia_respiratoria").update(payload).eq("id", editing) : await supabase.from("vigilancia_respiratoria").insert(payload);
    if (error) { showToast("Error: " + error.message, "error"); }
    else { showToast(editing ? "Registro actualizado" : "Registro guardado", "success"); closeModal(); load(); }
    setSaving(false);
  };
  const handleDelete = async (id) => { if (!confirm("¿Eliminar?")) return; await supabase.from("vigilancia_respiratoria").delete().eq("id", id); showToast("Eliminado", "info"); load(); };

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Protección Respiratoria</h3>
          <p className="text-gray-500 text-xs max-w-xl">Programa de protección respiratoria para trabajadores expuestos a polvos, gases, vapores y agentes inhalables. Control de prueba de ajuste y espirometría.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <ExportBtn data={records.map(r => ({ Trabajador: r.trabajadores?.nombre || "", Fecha: r.fecha_evaluacion, "Agente Exposición": r.agente_exposicion || "", "Tipo Respirador": r.tipo_respirador || "", "Prueba Ajuste": r.prueba_ajuste, "F. Ajuste": r.fecha_prueba_ajuste || "", Espirometría: r.espirometria, "F. Espiro": r.fecha_espirometria || "", "Próx. Control": r.proxima_revision || "" }))} filename="proteccion_respiratoria" />
          <Btn size="sm" variant="primary" onClick={() => { setEditing(null); resetForm(); setShowModal(true); }}><Plus size={13} /> Nuevo Registro</Btn>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <KpiCard label="Bajo programa" value={records.length} sub={`${delMes.length} evaluados este mes`} accentColor="blue" />
        <KpiCard label="Prueba de ajuste aprobada" value={records.length ? `${Math.round(ajusteAprobado / records.length * 100)}%` : "—"} sub={`${ajusteAprobado} de ${records.length} trabajadores`} accentColor="green" />
        <KpiCard label="Espirometría pendiente" value={espiroPendiente} sub="requieren evaluación pulmonar" accentColor="amber" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16 text-gray-500 text-sm">Cargando...</div> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800">
              {["Trabajador", "Fecha", "Agente Exposición", "Tipo Respirador", "Prueba Ajuste", "F. Ajuste", "Espirometría", "F. Espiro", "Próx. Control", ""].map(h => (
                <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-white">{r.trabajadores?.nombre || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.fecha_evaluacion}</td>
                  <td className="px-4 py-3 text-gray-300 text-xs">{r.agente_exposicion || "—"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{r.tipo_respirador || "—"}</td>
                  <td className="px-4 py-3"><Badge color={ajusteColor(r.prueba_ajuste)}>{r.prueba_ajuste}</Badge></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.fecha_prueba_ajuste || "—"}</td>
                  <td className="px-4 py-3"><Badge color={espiroColor(r.espirometria)}>{r.espirometria}</Badge></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.fecha_espirometria || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.proxima_revision || "—"}</td>
                  <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button><button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button></div></td>
                </tr>
              ))}
              {!records.length && <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-600 text-sm">Sin registros de protección respiratoria</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? "Editar — Protección Respiratoria" : "Nuevo Registro — Protección Respiratoria"} onClose={closeModal}>
          <div className="space-y-4">
            <FormField label="Trabajador *">
              <Select value={form.trabajador_id} onChange={e => setForm(f => ({ ...f, trabajador_id: e.target.value }))}>
                <option value="">Seleccionar trabajador...</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.nombre}</option>)}
              </Select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Fecha Evaluación *"><Input type="date" value={form.fecha_evaluacion} onChange={e => setForm(f => ({ ...f, fecha_evaluacion: e.target.value }))} /></FormField>
              <FormField label="Agente de Exposición"><Input value={form.agente_exposicion} onChange={e => setForm(f => ({ ...f, agente_exposicion: e.target.value }))} placeholder="Sílice, polvo madera, gases..." /></FormField>
            </div>
            <FormField label="Tipo de Respirador">
              <Select value={form.tipo_respirador} onChange={e => setForm(f => ({ ...f, tipo_respirador: e.target.value }))}>
                <option value="">Seleccionar...</option>
                {["Semifacial filtrante N95","Semifacial filtrante FFP2","Semifacial con filtros intercambiables","Cara completa","Respirador de escape","Equipo autónomo (SCBA)","Línea de aire"].map(t => <option key={t}>{t}</option>)}
              </Select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Prueba de Ajuste">
                <Select value={form.prueba_ajuste} onChange={e => setForm(f => ({ ...f, prueba_ajuste: e.target.value }))}>
                  {["Pendiente","Aprobado","Rechazado"].map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Fecha Prueba Ajuste"><Input type="date" value={form.fecha_prueba_ajuste} onChange={e => setForm(f => ({ ...f, fecha_prueba_ajuste: e.target.value }))} /></FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Espirometría">
                <Select value={form.espirometria} onChange={e => setForm(f => ({ ...f, espirometria: e.target.value }))}>
                  {["Pendiente","Normal","Restricción leve","Restricción moderada","Obstrucción leve","Obstrucción moderada","Obstrucción severa"].map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Fecha Espirometría"><Input type="date" value={form.fecha_espirometria} onChange={e => setForm(f => ({ ...f, fecha_espirometria: e.target.value }))} /></FormField>
            </div>
            <FormField label="Próxima Revisión"><Input type="date" value={form.proxima_revision} onChange={e => setForm(f => ({ ...f, proxima_revision: e.target.value }))} /></FormField>
            <FormField label="Observaciones"><Input value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} placeholder="Restricciones, seguimiento, cambio de filtros..." /></FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={closeModal}>Cancelar</Btn>
              <Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : editing ? "Actualizar" : "Guardar"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// ACCIDENTES E INCIDENTES
// ═══════════════════════════════════════════
function AccidentesModulo({ workers, empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [fTipo, setFTipo] = useState("");
  const initForm = {
    trabajador_id: "", tipo: "Accidente Laboral",
    fecha_evento: new Date().toISOString().split("T")[0], hora_evento: "",
    lugar: "", area_puesto: "", descripcion: "", parte_cuerpo: "",
    agente_causante: "", tipo_lesion: "", gravedad: "Leve",
    dias_perdidos: "0", requirio_hospitalizacion: false,
    estado_investigacion: "Pendiente", medidas_correctivas: "",
    medico_responsable: "", supervisor: "", observaciones: ""
  };
  const [form, setForm] = useState(initForm);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("accidentes_incidentes")
      .select("*, trabajadores(nombre)").eq("empresa_id", empresaId)
      .order("fecha_evento", { ascending: false });
    if (error) showToast("Error al cargar: " + error.message, "error");
    setRecords(data || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const openEdit = (r) => {
    setForm({
      trabajador_id: r.trabajador_id || "", tipo: r.tipo, fecha_evento: r.fecha_evento,
      hora_evento: r.hora_evento || "", lugar: r.lugar || "", area_puesto: r.area_puesto || "",
      descripcion: r.descripcion || "", parte_cuerpo: r.parte_cuerpo || "",
      agente_causante: r.agente_causante || "", tipo_lesion: r.tipo_lesion || "",
      gravedad: r.gravedad || "Leve", dias_perdidos: r.dias_perdidos != null ? String(r.dias_perdidos) : "0",
      requirio_hospitalizacion: r.requirio_hospitalizacion || false,
      estado_investigacion: r.estado_investigacion || "Pendiente",
      medidas_correctivas: r.medidas_correctivas || "", medico_responsable: r.medico_responsable || "",
      supervisor: r.supervisor || "", observaciones: r.observaciones || ""
    });
    setEditing(r.id); setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(initForm); };
  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este registro?")) return;
    await supabase.from("accidentes_incidentes").delete().eq("id", id);
    showToast("Eliminado", "info"); load();
  };
  const handleSave = async () => {
    if (!form.fecha_evento || !form.descripcion) { showToast("Fecha y descripción son obligatorios", "error"); return; }
    setSaving(true);
    const payload = {
      empresa_id: empresaId, trabajador_id: form.trabajador_id || null,
      tipo: form.tipo, fecha_evento: form.fecha_evento, hora_evento: form.hora_evento || null,
      lugar: form.lugar, area_puesto: form.area_puesto, descripcion: form.descripcion,
      parte_cuerpo: form.parte_cuerpo, agente_causante: form.agente_causante,
      tipo_lesion: form.tipo_lesion, gravedad: form.gravedad,
      dias_perdidos: parseInt(form.dias_perdidos) || 0,
      requirio_hospitalizacion: form.requirio_hospitalizacion,
      estado_investigacion: form.estado_investigacion,
      medidas_correctivas: form.medidas_correctivas, medico_responsable: form.medico_responsable,
      supervisor: form.supervisor, observaciones: form.observaciones
    };
    const { error } = editing
      ? await supabase.from("accidentes_incidentes").update(payload).eq("id", editing)
      : await supabase.from("accidentes_incidentes").insert(payload);
    if (error) { showToast("Error: " + error.message, "error"); }
    else { showToast(editing ? "Actualizado" : "Registro guardado", "success"); closeModal(); load(); }
    setSaving(false);
  };

  const now = new Date();
  const delMes = records.filter(r => { const d = new Date(r.fecha_evento + "T00:00:00"); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const diasMes = delMes.reduce((s, r) => s + (r.dias_perdidos || 0), 0);
  const sinInvestigar = records.filter(r => r.estado_investigacion === "Pendiente").length;
  const graves = records.filter(r => ["Grave", "Fatal"].includes(r.gravedad)).length;
  const tipoOpts = [...new Set(records.map(r => r.tipo).filter(Boolean))].sort();
  const filtered = records.filter(r =>
    (!fFrom || r.fecha_evento >= fFrom) && (!fTo || r.fecha_evento <= fTo) && (!fTipo || r.tipo === fTipo));

  const gravColor = g => ({ Fatal: "red", Grave: "red", Moderado: "amber", Leve: "blue", "Sin lesión": "gray" }[g] || "gray");
  const investColor = e => ({ Completada: "green", "En proceso": "amber", Pendiente: "red" }[e] || "gray");

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Accidentes e Incidentes</h3>
          <p className="text-gray-500 text-xs max-w-xl">Registro y seguimiento de accidentes laborales, incidentes peligrosos y casi-accidentes. Cumplimiento Ley 29783 y R.M. 050-2013-TR.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <ExportBtn data={records.map(r => ({ Tipo: r.tipo, Trabajador: r.trabajadores?.nombre || "—", Fecha: r.fecha_evento, Hora: r.hora_evento || "", Lugar: r.lugar || "", Área: r.area_puesto || "", Descripción: r.descripcion, "Parte cuerpo": r.parte_cuerpo || "", "Agente causante": r.agente_causante || "", "Tipo lesión": r.tipo_lesion || "", Gravedad: r.gravedad, "Días perdidos": r.dias_perdidos || 0, Hospitalización: r.requirio_hospitalizacion ? "Sí" : "No", "Estado investigación": r.estado_investigacion, "Medidas correctivas": r.medidas_correctivas || "", Médico: r.medico_responsable || "", Supervisor: r.supervisor || "" }))} filename="accidentes_incidentes" />
          <Btn size="sm" variant="primary" onClick={() => { setEditing(null); setForm(initForm); setShowModal(true); }}><Plus size={13} /> Nuevo Registro</Btn>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-5">
        <KpiCard label="Eventos este mes" value={delMes.length} sub={`${records.length} total registrados`} accentColor="red" />
        <KpiCard label="Días perdidos (mes)" value={diasMes} sub="días de baja laboral" accentColor="amber" />
        <KpiCard label="Sin investigar" value={sinInvestigar} sub="investigación pendiente" accentColor="red" />
        <KpiCard label="Graves / Fatales" value={graves} sub="requieren reporte MINTRA" accentColor="red" />
      </div>

      {sinInvestigar > 0 && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-3 mb-4 flex items-start gap-3">
          <AlertTriangle size={15} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 text-xs font-semibold">{sinInvestigar} evento(s) con investigación pendiente — plazo legal: 20 días hábiles (Ley 29783)</p>
          </div>
        </div>
      )}

      <FilterBar dateFrom={fFrom} dateTo={fTo} onDateFrom={setFFrom} onDateTo={setFTo} area={fTipo} onArea={setFTipo} areaOptions={tipoOpts} areaLabel="Tipo" />

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800">
            {["Tipo", "Trabajador", "Fecha", "Hora", "Área / Lugar", "Gravedad", "Días perdidos", "Investigación", ""].map(h => (
              <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
            {!loading && filtered.map(r => (
              <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3"><Badge color={r.tipo === "Accidente Laboral" || r.tipo === "Accidente de Trayecto" ? "red" : r.tipo === "Incidente Peligroso" ? "amber" : "gray"}>{r.tipo}</Badge></td>
                <td className="px-4 py-3 font-medium text-white text-xs">{r.trabajadores?.nombre || <span className="text-gray-600">No especificado</span>}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.fecha_evento}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.hora_evento || "—"}</td>
                <td className="px-4 py-3 text-xs text-gray-400 max-w-[140px] truncate">{r.lugar || r.area_puesto || "—"}</td>
                <td className="px-4 py-3"><Badge color={gravColor(r.gravedad)}>{r.gravedad}</Badge></td>
                <td className="px-4 py-3 font-mono text-center text-xs font-bold text-white">{r.dias_perdidos ?? 0}</td>
                <td className="px-4 py-3"><Badge color={investColor(r.estado_investigacion)}>{r.estado_investigacion}</Badge></td>
                <td className="px-4 py-3"><div className="flex gap-1">
                  <button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button>
                  <button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                </div></td>
              </tr>
            ))}
            {!loading && !filtered.length && (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-600 text-sm">
                {records.length ? "Sin resultados para el filtro aplicado." : "Sin registros. Usa \"Nuevo Registro\" para comenzar."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? "Editar Registro" : "Nuevo Accidente / Incidente"} onClose={closeModal} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Tipo de evento *">
                <Select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  {["Accidente Laboral","Accidente de Trayecto","Incidente Peligroso","Casi-accidente","Enfermedad Ocupacional"].map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Trabajador involucrado">
                <Select value={form.trabajador_id} onChange={e => setForm(f => ({ ...f, trabajador_id: e.target.value }))}>
                  <option value="">No especificado / Colectivo</option>
                  {workers.map(w => <option key={w.id} value={w.id}>{w.nombre}</option>)}
                </Select>
              </FormField>
              <FormField label="Fecha del evento *"><Input type="date" value={form.fecha_evento} onChange={e => setForm(f => ({ ...f, fecha_evento: e.target.value }))} /></FormField>
              <FormField label="Hora del evento"><Input type="time" value={form.hora_evento} onChange={e => setForm(f => ({ ...f, hora_evento: e.target.value }))} /></FormField>
              <FormField label="Lugar específico"><Input value={form.lugar} onChange={e => setForm(f => ({ ...f, lugar: e.target.value }))} placeholder="Ej: Almacén 2, piso 3" /></FormField>
              <FormField label="Área / Puesto"><Input value={form.area_puesto} onChange={e => setForm(f => ({ ...f, area_puesto: e.target.value }))} placeholder="Ej: Producción, Operador" /></FormField>
            </div>
            <FormField label="Descripción del evento *">
              <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={3} placeholder="Describe detalladamente cómo ocurrió el evento..." className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500 resize-none" />
            </FormField>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Parte del cuerpo afectada">
                <Select value={form.parte_cuerpo} onChange={e => setForm(f => ({ ...f, parte_cuerpo: e.target.value }))}>
                  <option value="">Seleccionar...</option>
                  {["Cabeza","Cara","Ojos","Cuello","Hombro","Brazo","Codo","Antebrazo","Muñeca","Mano/Dedos","Tórax","Espalda superior","Lumbar","Abdomen","Cadera","Muslo","Rodilla","Pierna","Tobillo","Pie/Dedos","Múltiples","No aplica"].map(p => <option key={p}>{p}</option>)}
                </Select>
              </FormField>
              <FormField label="Agente causante">
                <Select value={form.agente_causante} onChange={e => setForm(f => ({ ...f, agente_causante: e.target.value }))}>
                  <option value="">Seleccionar...</option>
                  {["Máquina o equipo","Herramienta manual","Material / objeto","Caída mismo nivel","Caída diferente nivel","Esfuerzo físico","Electricidad","Sustancia química","Ruido / Vibración","Temperatura extrema","Agente biológico","Vehículo","Otro"].map(a => <option key={a}>{a}</option>)}
                </Select>
              </FormField>
              <FormField label="Tipo de lesión">
                <Select value={form.tipo_lesion} onChange={e => setForm(f => ({ ...f, tipo_lesion: e.target.value }))}>
                  <option value="">Seleccionar...</option>
                  {["Corte / Laceración","Contusión / Golpe","Fractura","Luxación","Esguince","Quemadura","Intoxicación","Cuerpo extraño","Aplastamiento","Amputación","Enfermedad","Sin lesión"].map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Gravedad">
                <Select value={form.gravedad} onChange={e => setForm(f => ({ ...f, gravedad: e.target.value }))}>
                  {["Sin lesión","Leve","Moderado","Grave","Fatal"].map(g => <option key={g}>{g}</option>)}
                </Select>
              </FormField>
              <FormField label="Días perdidos">
                <Input type="number" min="0" value={form.dias_perdidos} onChange={e => setForm(f => ({ ...f, dias_perdidos: e.target.value }))} />
              </FormField>
              <FormField label="Estado investigación">
                <Select value={form.estado_investigacion} onChange={e => setForm(f => ({ ...f, estado_investigacion: e.target.value }))}>
                  {["Pendiente","En proceso","Completada"].map(e => <option key={e}>{e}</option>)}
                </Select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Médico / Enfermero responsable"><Input value={form.medico_responsable} onChange={e => setForm(f => ({ ...f, medico_responsable: e.target.value }))} /></FormField>
              <FormField label="Supervisor del área"><Input value={form.supervisor} onChange={e => setForm(f => ({ ...f, supervisor: e.target.value }))} /></FormField>
            </div>
            <FormField label="Medidas correctivas implementadas">
              <textarea value={form.medidas_correctivas} onChange={e => setForm(f => ({ ...f, medidas_correctivas: e.target.value }))} rows={2} placeholder="Describe las acciones tomadas para evitar recurrencia..." className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500 resize-none" />
            </FormField>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="hosp" checked={form.requirio_hospitalizacion} onChange={e => setForm(f => ({ ...f, requirio_hospitalizacion: e.target.checked }))} className="w-4 h-4 accent-blue-500" />
              <label htmlFor="hosp" className="text-xs text-gray-400">Requirió hospitalización</label>
            </div>
            <FormField label="Observaciones adicionales"><Input value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} /></FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={closeModal}>Cancelar</Btn>
              <Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : editing ? "Actualizar" : "Guardar"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// SEGUIMIENTO MÉDICO A TRABAJADORES
// ═══════════════════════════════════════════
function SeguimientoModulo({ workers, empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [fEstado, setFEstado] = useState("");
  const [fPrioridad, setFPrioridad] = useState("");
  const [fTipo, setFTipo] = useState("");
  const initForm = {
    trabajador_id: "", tipo_caso: "Sospecha Enf. Ocupacional",
    fecha_inicio: new Date().toISOString().split("T")[0],
    descripcion: "", diagnostico_presuntivo: "",
    prioridad: "Media", estado: "Activo",
    proxima_evaluacion: "", medico_responsable: "", observaciones: ""
  };
  const [form, setForm] = useState(initForm);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("seguimiento_casos")
      .select("*, trabajadores(nombre, cargo)")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false });
    if (error) showToast("Error al cargar: " + error.message, "error");
    setRecords(data || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const openEdit = (r) => {
    setForm({
      trabajador_id: r.trabajador_id || "", tipo_caso: r.tipo_caso,
      fecha_inicio: r.fecha_inicio, descripcion: r.descripcion || "",
      diagnostico_presuntivo: r.diagnostico_presuntivo || "",
      prioridad: r.prioridad || "Media", estado: r.estado || "Activo",
      proxima_evaluacion: r.proxima_evaluacion || "",
      medico_responsable: r.medico_responsable || "", observaciones: r.observaciones || ""
    });
    setEditing(r.id); setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(initForm); };
  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este caso?")) return;
    await supabase.from("seguimiento_casos").delete().eq("id", id);
    showToast("Eliminado", "info"); load();
  };
  const handleSave = async () => {
    if (!form.trabajador_id || !form.tipo_caso || !form.fecha_inicio) {
      showToast("Trabajador, tipo de caso y fecha son obligatorios", "error"); return;
    }
    setSaving(true);
    const payload = {
      empresa_id: empresaId, trabajador_id: form.trabajador_id,
      tipo_caso: form.tipo_caso, fecha_inicio: form.fecha_inicio,
      descripcion: form.descripcion, diagnostico_presuntivo: form.diagnostico_presuntivo,
      prioridad: form.prioridad, estado: form.estado,
      proxima_evaluacion: form.proxima_evaluacion || null,
      medico_responsable: form.medico_responsable, observaciones: form.observaciones
    };
    const { error } = editing
      ? await supabase.from("seguimiento_casos").update(payload).eq("id", editing)
      : await supabase.from("seguimiento_casos").insert(payload);
    if (error) { showToast("Error: " + error.message, "error"); }
    else { showToast(editing ? "Caso actualizado" : "Caso registrado", "success"); closeModal(); load(); }
    setSaving(false);
  };

  const activos = records.filter(r => r.estado === "Activo" || r.estado === "En seguimiento");
  const altaPrioridad = records.filter(r => r.prioridad === "Alta" && r.estado !== "Cerrado");
  const now = new Date(); const in7 = new Date(); in7.setDate(in7.getDate() + 7);
  const proximasEval = records.filter(r => r.proxima_evaluacion && new Date(r.proxima_evaluacion + "T00:00:00") >= now && new Date(r.proxima_evaluacion + "T00:00:00") <= in7);

  const filtered = records.filter(r =>
    (!fEstado || r.estado === fEstado) &&
    (!fPrioridad || r.prioridad === fPrioridad) &&
    (!fTipo || r.tipo_caso === fTipo));

  const prioColor = p => ({ Alta: "red", Media: "amber", Baja: "blue" }[p] || "gray");
  const estadoColor = e => ({ Activo: "red", "En seguimiento": "amber", Resuelto: "green", Cerrado: "gray" }[e] || "gray");
  const tiposUniq = [...new Set(records.map(r => r.tipo_caso).filter(Boolean))].sort();

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Seguimiento Médico a Trabajadores</h3>
          <p className="text-gray-500 text-xs max-w-xl">Registro y seguimiento de casos médicos individuales: sospecha de enfermedad ocupacional, post-accidente, restricciones activas y otros.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <ExportBtn data={records.map(r => ({ Trabajador: r.trabajadores?.nombre || "—", Cargo: r.trabajadores?.cargo || "—", "Tipo de caso": r.tipo_caso, "Fecha inicio": r.fecha_inicio, "Diagnóstico presuntivo": r.diagnostico_presuntivo || "", Prioridad: r.prioridad, Estado: r.estado, "Próx. evaluación": r.proxima_evaluacion || "", Médico: r.medico_responsable || "", Observaciones: r.observaciones || "" }))} filename="seguimiento_medico" />
          <Btn size="sm" variant="primary" onClick={() => { setEditing(null); setForm(initForm); setShowModal(true); }}><Plus size={13} /> Nuevo Caso</Btn>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <KpiCard label="Casos activos" value={activos.length} sub={`${records.length} casos en total`} accentColor="red" />
        <KpiCard label="Prioridad alta" value={altaPrioridad.length} sub="requieren atención urgente" accentColor="amber" />
        <KpiCard label="Evaluaciones (7 días)" value={proximasEval.length} sub="próximas citas programadas" accentColor="blue" />
      </div>

      {altaPrioridad.length > 0 && (
        <div className="bg-amber-900/20 border border-amber-800 rounded-xl p-3 mb-4 flex items-start gap-3">
          <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 text-xs font-semibold">{altaPrioridad.length} caso(s) de prioridad alta activos — requieren atención prioritaria</p>
            <p className="text-amber-600 text-xs mt-0.5">{altaPrioridad.map(r => r.trabajadores?.nombre || "Trabajador").join(", ")}</p>
          </div>
        </div>
      )}

      {/* Filtros inline */}
      <div className="flex items-center gap-2 mb-4 flex-wrap p-3 bg-gray-900/50 border border-gray-800 rounded-xl">
        <Filter size={12} className="text-gray-500 shrink-0" />
        <span className="text-xs text-gray-500 shrink-0">Filtrar:</span>
        <select value={fTipo} onChange={e => setFTipo(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500">
          <option value="">Todos los tipos</option>
          {tiposUniq.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={fEstado} onChange={e => setFEstado(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500">
          <option value="">Todos los estados</option>
          {["Activo","En seguimiento","Resuelto","Cerrado"].map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={fPrioridad} onChange={e => setFPrioridad(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500">
          <option value="">Todas las prioridades</option>
          {["Alta","Media","Baja"].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {(fTipo || fEstado || fPrioridad) && (
          <button onClick={() => { setFTipo(""); setFEstado(""); setFPrioridad(""); }} className="text-xs text-blue-400 hover:text-blue-300 ml-1">✕ Limpiar</button>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800">
            {["Trabajador", "Tipo de caso", "F. Inicio", "Dx presuntivo", "Prioridad", "Estado", "Próx. Evaluación", "Médico", ""].map(h => (
              <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
            {!loading && filtered.map(r => {
              const isProx = r.proxima_evaluacion && new Date(r.proxima_evaluacion + "T00:00:00") <= in7 && new Date(r.proxima_evaluacion + "T00:00:00") >= now;
              return (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white text-xs">{r.trabajadores?.nombre || "—"}</div>
                    <div className="text-gray-600 text-[10px]">{r.trabajadores?.cargo || ""}</div>
                  </td>
                  <td className="px-4 py-3"><Badge color={r.tipo_caso.includes("Accidente") ? "red" : r.tipo_caso.includes("Enf") ? "amber" : "purple"}>{r.tipo_caso}</Badge></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.fecha_inicio}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-[140px] truncate">{r.diagnostico_presuntivo || "—"}</td>
                  <td className="px-4 py-3"><Badge color={prioColor(r.prioridad)}>{r.prioridad}</Badge></td>
                  <td className="px-4 py-3"><Badge color={estadoColor(r.estado)}>{r.estado}</Badge></td>
                  <td className={`px-4 py-3 font-mono text-xs ${isProx ? "text-amber-400 font-semibold" : "text-gray-500"}`}>{r.proxima_evaluacion || "—"}{isProx && " ⚠"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{r.medico_responsable || "—"}</td>
                  <td className="px-4 py-3"><div className="flex gap-1">
                    <button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button>
                    <button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                  </div></td>
                </tr>
              );
            })}
            {!loading && !filtered.length && (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-600 text-sm">
                {records.length ? "Sin resultados para los filtros aplicados." : "Sin casos registrados. Usa \"Nuevo Caso\" para comenzar."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? "Editar Caso" : "Nuevo Caso de Seguimiento"} onClose={closeModal} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Trabajador *">
                <Select value={form.trabajador_id} onChange={e => setForm(f => ({ ...f, trabajador_id: e.target.value }))}>
                  <option value="">Seleccionar trabajador...</option>
                  {workers.map(w => <option key={w.id} value={w.id}>{w.nombre}{w.cargo ? ` — ${w.cargo}` : ""}</option>)}
                </Select>
              </FormField>
              <FormField label="Tipo de caso *">
                <Select value={form.tipo_caso} onChange={e => setForm(f => ({ ...f, tipo_caso: e.target.value }))}>
                  {["Sospecha Enf. Ocupacional","Post-accidente","Restricción médica activa","Enfermedad crónica relacionada","Salud mental / Psicosocial","Exposición a agente de riesgo","Otro"].map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Fecha de inicio *"><Input type="date" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} /></FormField>
              <FormField label="Próxima evaluación"><Input type="date" value={form.proxima_evaluacion} onChange={e => setForm(f => ({ ...f, proxima_evaluacion: e.target.value }))} /></FormField>
              <FormField label="Prioridad">
                <Select value={form.prioridad} onChange={e => setForm(f => ({ ...f, prioridad: e.target.value }))}>
                  {["Alta","Media","Baja"].map(p => <option key={p}>{p}</option>)}
                </Select>
              </FormField>
              <FormField label="Estado">
                <Select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                  {["Activo","En seguimiento","Resuelto","Cerrado"].map(e => <option key={e}>{e}</option>)}
                </Select>
              </FormField>
            </div>
            <FormField label="Diagnóstico presuntivo"><Input value={form.diagnostico_presuntivo} onChange={e => setForm(f => ({ ...f, diagnostico_presuntivo: e.target.value }))} placeholder="Ej: Hipoacusia inducida por ruido, Lumbalgia ocupacional..." /></FormField>
            <FormField label="Descripción / Motivo del seguimiento">
              <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={3} placeholder="Describe el motivo de la apertura del caso y los hallazgos iniciales..." className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500 resize-none" />
            </FormField>
            <FormField label="Médico responsable"><Input value={form.medico_responsable} onChange={e => setForm(f => ({ ...f, medico_responsable: e.target.value }))} placeholder="Nombre del médico ocupacional" /></FormField>
            <FormField label="Observaciones / Plan de manejo" confidential>
              <textarea value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} rows={2} placeholder="Plan terapéutico, restricciones, derivaciones, etc." className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500 resize-none" />
            </FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={closeModal}>Cancelar</Btn>
              <Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : editing ? "Actualizar" : "Registrar caso"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// REPORTES PDF
// ═══════════════════════════════════════════
function ReportesModulo({ workers, trainings, empresaId, empresa }) {
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [generando, setGenerando] = useState(false);

  const mesLabel = (m = mes) => {
    const [y, mo] = m.split("-");
    const nombres = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    return `${nombres[parseInt(mo) - 1]} ${y}`;
  };

  const generarPDF = async () => {
    setGenerando(true);
    try {
      const inicio = `${mes}-01`;
      const finDate = new Date(mes + "-01"); finDate.setMonth(finDate.getMonth() + 1); finDate.setDate(finDate.getDate() - 1);
      const fin = finDate.toISOString().split("T")[0];
      const now = new Date(); const in30 = new Date(); in30.setDate(in30.getDate() + 30);

      const [fatiga, descansos, morbilidad, diserg, auditiva] = await Promise.all([
        supabase.from("vigilancia_fatiga").select("id, nivel_riesgo").eq("empresa_id", empresaId).gte("fecha_evaluacion", inicio).lte("fecha_evaluacion", fin),
        supabase.from("vigilancia_descansos").select("id, dias_descanso").eq("empresa_id", empresaId).gte("fecha_inicio", inicio).lte("fecha_inicio", fin),
        supabase.from("vigilancia_morbilidad").select("id, diagnostico").eq("empresa_id", empresaId).gte("fecha_consulta", inicio).lte("fecha_consulta", fin),
        supabase.from("vigilancia_disergonomia").select("id, nivel_riesgo").eq("empresa_id", empresaId).gte("fecha_evaluacion", inicio).lte("fecha_evaluacion", fin),
        supabase.from("vigilancia_auditiva").select("id, resultado_audiometria").eq("empresa_id", empresaId).gte("fecha_evaluacion", inicio).lte("fecha_evaluacion", fin),
      ]);

      const doc = new jsPDF();
      const pw = doc.internal.pageSize.getWidth();

      // ── HEADER ──
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pw, 38, "F");
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 36, pw, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16); doc.setFont("helvetica", "bold");
      doc.text("INFORME MENSUAL SSOMA", pw / 2, 15, { align: "center" });
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      doc.text(`${empresa?.nombre || "Empresa"} | ${mesLabel()} | Generado: ${new Date().toLocaleDateString("es-PE")}`, pw / 2, 26, { align: "center" });
      doc.setTextColor(0, 0, 0);

      // ── SECCIÓN 1: RESUMEN DE PERSONAL ──
      doc.setFontSize(11); doc.setFont("helvetica", "bold");
      doc.text("1. RESUMEN DE PERSONAL", 14, 50);
      doc.autoTable({
        startY: 55,
        head: [["Indicador", "Valor"]],
        body: [
          ["Total de trabajadores", workers.length],
          ["Trabajadores activos", workers.filter(w => w.estado === "Activo").length],
          ["EMOs vigentes (> 30 días)", workers.filter(w => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); return v && new Date(v) > in30; }).length],
          ["EMOs por vencer (≤ 30 días)", workers.filter(w => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); return v && new Date(v) >= now && new Date(v) <= in30; }).length],
          ["EMOs vencidos", workers.filter(w => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); return v && new Date(v) < now; }).length],
          ["Sin EMO registrado", workers.filter(w => !w.ultima_emo).length],
          ["Con EPP entregado", workers.filter(w => w.epp_recibido).length],
          ["Aptos (con o sin restricción)", workers.filter(w => ["Apto","Apto con restricción"].includes(w.aptitud)).length],
        ],
        theme: "grid",
        headStyles: { fillColor: [37, 99, 235], textColor: [255,255,255], fontStyle: "bold", fontSize: 9 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 140 }, 1: { halign: "center", fontStyle: "bold", cellWidth: 30 } },
      });

      // ── SECCIÓN 2: ESTADO DE EMOs ──
      const y2 = doc.lastAutoTable.finalY + 12;
      doc.setFontSize(11); doc.setFont("helvetica", "bold");
      doc.text("2. ESTADO DE EMOs POR TRABAJADOR ACTIVO", 14, y2);
      const emoRows = workers.filter(w => w.estado === "Activo").sort((a,b) => a.nombre.localeCompare(b.nombre)).map(w => {
        const v = calcularVigencia(w.ultima_emo, w.duracion_emo);
        const isV = v && new Date(v) < now; const porV = !isV && v && new Date(v) <= in30;
        return [w.nombre, w.cargo || "—", w.ultima_emo || "—", v || "Sin registro", isV ? "VENCIDO" : porV ? "Por vencer" : v ? "Vigente" : "Sin EMO"];
      });
      doc.autoTable({
        startY: y2 + 5,
        head: [["Trabajador", "Cargo", "Última EMO", "Vigente Hasta", "Estado"]],
        body: emoRows,
        theme: "striped",
        headStyles: { fillColor: [37, 99, 235], textColor: [255,255,255], fontStyle: "bold", fontSize: 8 },
        styles: { fontSize: 8 },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 4) {
            const t = data.cell.text[0];
            if (t === "VENCIDO") data.cell.styles.textColor = [220, 38, 38];
            else if (t === "Por vencer") data.cell.styles.textColor = [217, 119, 6];
            else if (t === "Vigente") data.cell.styles.textColor = [16, 185, 129];
          }
        },
      });

      // ── SECCIÓN 3: VIGILANCIA DEL MES ──
      if (doc.lastAutoTable.finalY > 220) doc.addPage();
      const y3 = doc.lastAutoTable.finalY > 220 ? 20 : doc.lastAutoTable.finalY + 12;
      doc.setFontSize(11); doc.setFont("helvetica", "bold");
      doc.text(`3. VIGILANCIA MÉDICA — ${mesLabel().toUpperCase()}`, 14, y3);
      doc.autoTable({
        startY: y3 + 5,
        head: [["Programa de Vigilancia", `Evaluaciones en ${mesLabel()}`, "Observación"]],
        body: [
          ["Fatiga y Somnolencia", fatiga.data?.length ?? 0, fatiga.data?.filter(r => r.nivel_riesgo === "Severo").length > 0 ? "⚠ Casos severos" : "—"],
          ["Descansos Médicos", descansos.data?.length ?? 0, descansos.data?.length ? `${descansos.data.reduce((s, r) => s + (r.dias_descanso || 0), 0)} días acum.` : "—"],
          ["Consultas / Morbilidad", morbilidad.data?.length ?? 0, "—"],
          ["Riesgos Disergonómicos", diserg.data?.length ?? 0, diserg.data?.filter(r => ["Alto","Muy Alto"].includes(r.nivel_riesgo)).length > 0 ? "⚠ Alto riesgo" : "—"],
          ["Protección Auditiva", auditiva.data?.length ?? 0, "—"],
        ],
        theme: "grid",
        headStyles: { fillColor: [124, 58, 237], textColor: [255,255,255], fontStyle: "bold", fontSize: 9 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 9 },
        columnStyles: { 1: { halign: "center", fontStyle: "bold" } },
      });

      // ── FOOTER ──
      const total = doc.internal.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setFontSize(7); doc.setTextColor(150);
        doc.text(`SSOMA-HSE Sistema de Gestión | ${empresa?.nombre || ""} | Pág. ${i} de ${total}`, pw / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
      }

      doc.save(`informe_ssoma_${mes}.pdf`);
      showToast("PDF generado y descargado", "success");
    } catch (e) {
      showToast("Error al generar PDF: " + e.message, "error");
    }
    setGenerando(false);
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Módulo de Reportes</h3>
          <p className="text-gray-500 text-xs max-w-xl">Genera informes PDF descargables con resumen de personal, estado de EMOs y vigilancia médica del período seleccionado.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileDown size={16} className="text-blue-400" />
            <span className="text-white font-semibold text-sm">Informe Mensual SSOMA</span>
          </div>
          <p className="text-gray-500 text-xs mb-4">Incluye resumen de personal, estado de EMOs de todos los trabajadores activos y evaluaciones de vigilancia del mes seleccionado.</p>
          <FormField label="Mes del informe">
            <input type="month" value={mes} onChange={e => setMes(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500" />
          </FormField>
          <div className="mt-4">
            <Btn variant="primary" onClick={generarPDF} disabled={generando} className="w-full justify-center">
              <Download size={14} />{generando ? "Generando PDF..." : `Descargar informe — ${mesLabel()}`}
            </Btn>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info size={16} className="text-gray-500" />
            <span className="text-white font-semibold text-sm">Contenido del informe</span>
          </div>
          <div className="space-y-2.5 mb-4">
            {[
              { icon: "📋", text: "Resumen de personal: activos, EMOs, aptitud, EPP" },
              { icon: "📊", text: "Estado EMOs por trabajador con semáforo de vigencia" },
              { icon: "🏥", text: "Evaluaciones de vigilancia médica del mes seleccionado" },
              { icon: "📄", text: "Paginación y pie de página con nombre de empresa" },
            ].map(item => (
              <div key={item.text} className="flex items-start gap-2 text-xs text-gray-400">
                <span className="shrink-0">{item.icon}</span><span>{item.text}</span>
              </div>
            ))}
          </div>
          <div className="p-3 bg-amber-900/20 border border-amber-800/40 rounded-lg">
            <p className="text-amber-400 text-xs">💡 El PDF se descarga directamente. No se almacena en servidores externos.</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="text-sm font-semibold text-white mb-3">Próximos reportes</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Reporte de Accidentabilidad", desc: "TFIA, TFGA, días perdidos y estadísticas" },
            { label: "Informe de Capacitaciones", desc: "Asistencia y horas por área y trabajador" },
            { label: "Estadísticas de Morbilidad", desc: "Diagnósticos frecuentes y días de reposo" },
            { label: "Matriz de Riesgos / IPERC", desc: "Resumen de peligros y controles por área" },
          ].map(r => (
            <div key={r.label} className="p-3 border border-gray-800 rounded-lg opacity-60">
              <p className="text-xs font-medium text-gray-400 mb-1">{r.label} <Badge color="amber">Próximo</Badge></p>
              <p className="text-xs text-gray-600">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Vigilancia({ workers, empresaId }) {
  const [tab, setTab] = useState("emos");
  const [records, setRecords] = useState([]);
  useEffect(() => { supabase.from("registros_medicos").select("*, trabajadores(nombre)").then(({ data }) => setRecords(data || [])); }, []);
  const now = new Date(); const in30 = new Date(); in30.setDate(in30.getDate() + 30);

  const grupos = [
    {
      label: "REGISTROS CLÍNICOS",
      items: [
        { id: "emos", label: "Programación EMOs" },
        { id: "descansos", label: "Descansos Médicos" },
        { id: "morbilidad", label: "Morbilidad" },
      ],
    },
    {
      label: "PROGRAMAS DE VIGILANCIA",
      items: [
        { id: "gestante", label: "Trabajadora Gestante" },
        { id: "auditiva", label: "Protección Auditiva" },
        { id: "disergonomia", label: "Disergonomía" },
        { id: "radiacion", label: "Radiación UV" },
        { id: "fatiga", label: "Fatiga y Somnolencia" },
        { id: "respiratoria", label: "Prot. Respiratoria" },
        { id: "psicosocial", label: "Psicosocial / Salud Mental" },
        { id: "estilos", label: "Estilos de Vida" },
      ],
    },
  ];


  function ProgramaPlaceholder({ config }) {
    return (
      <div>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-white font-semibold text-sm mb-1">{config.title}</h3>
            <p className="text-gray-500 text-xs max-w-xl">{config.desc}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <Badge color="amber">EN CONSTRUCCIÓN</Badge>
            <Btn size="sm" variant="primary" onClick={() => showToast("Función en desarrollo", "info")}><Plus size={13} /> Nuevo Registro</Btn>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-5">
          <KpiCard label="Bajo vigilancia" value="—" sub="Sin datos aún" accentColor="blue" />
          <KpiCard label="Evaluaciones este mes" value="—" sub="Sin datos aún" accentColor="amber" />
          <KpiCard label="Alertas activas" value="—" sub="Sin datos aún" accentColor="red" />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {config.columns.map(col => (
                  <th key={col} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={config.columns.length} className="px-4 py-12 text-center text-gray-600 text-sm">
                  Sin registros. Módulo en construcción.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Mini-sidebar de navegación interna */}
      <div className="w-52 shrink-0">
        {grupos.map(grupo => (
          <div key={grupo.label} className="mb-5">
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest px-2 mb-2">{grupo.label}</p>
            <div className="space-y-0.5">
              {grupo.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${tab === item.id ? "bg-blue-900/40 text-blue-400 font-medium" : "text-gray-500 hover:text-gray-200 hover:bg-gray-800"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Contenido principal */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-5">
          <div className="text-sm font-semibold text-white">Vigilancia Médica</div>
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-purple-900/40 text-purple-400 border border-purple-800"><Lock size={11} /> MEDICO / ADMIN</span>
        </div>

        {/* EMOs */}
        {tab === "emos" && (
          <div>
            <div className="mb-4">
              <h3 className="text-white font-semibold text-sm mb-1">Programación de EMOs</h3>
              <p className="text-gray-500 text-xs">Seguimiento de vigencia de Exámenes Médico Ocupacionales por trabajador activo.</p>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-5">
              <KpiCard label="EMOs Vigentes" value={workers.filter(w => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); return v && new Date(v) >= now && w.estado === "Activo"; }).length} sub="Trabajadores activos" accentColor="emerald" />
              <KpiCard label="Por Vencer (30 días)" value={workers.filter(w => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); return v && new Date(v) >= now && new Date(v) <= in30 && w.estado === "Activo"; }).length} sub="Requieren atención" accentColor="amber" />
              <KpiCard label="Vencidos" value={workers.filter(w => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); return v && new Date(v) < now && w.estado === "Activo"; }).length} sub="Trabajadores activos" accentColor="red" />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-800">{["Trabajador", "Última EMO", "Duración", "Vigente Hasta", "Lectura EMO", "Estado", "Aptitud"].map(h => <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody>{[...workers].filter(w => w.estado === "Activo").sort((a, b) => { const va = calcularVigencia(a.ultima_emo, a.duracion_emo) || ""; const vb = calcularVigencia(b.ultima_emo, b.duracion_emo) || ""; return va.localeCompare(vb); }).map(w => {
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
          </div>
        )}

        {/* Descansos Médicos */}
        {tab === "descansos" && <DescansosMedicosModulo workers={workers} empresaId={empresaId} />}

        {/* Morbilidad */}
        {tab === "morbilidad" && <MorbilidadModulo workers={workers} empresaId={empresaId} />}

        {/* Módulos completos */}
        {tab === "psicosocial" && <PsicosocialModulo workers={workers} empresaId={empresaId} />}
        {tab === "disergonomia" && <DisergonomiaModulo workers={workers} empresaId={empresaId} />}
        {tab === "auditiva" && <AuditivaModulo workers={workers} empresaId={empresaId} />}
        {tab === "gestante" && <GestanteModulo workers={workers} empresaId={empresaId} />}
        {tab === "fatiga" && <FatigaModulo workers={workers} empresaId={empresaId} />}
        {tab === "estilos" && <EstilosVidaModulo workers={workers} empresaId={empresaId} />}
        {tab === "radiacion" && <RadiacionUVModulo workers={workers} empresaId={empresaId} />}
        {tab === "respiratoria" && <ProteccionRespiratoriaModulo workers={workers} empresaId={empresaId} />}
      </div>
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
  { id: "reportes", label: "Reportes PDF", icon: FileDown },
];

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [page, setPage] = useState("dashboard");
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
    loadProfile();
  }, [session]);

  const loadProfile = async () => {
    const { data: prof } = await supabase.from("profiles").select("*, empresas(*)").eq("id", session.user.id).single();
    if (prof) {
      setProfile(prof);
      setEmpresa(prof.empresas);
      if (prof.empresa_id) {
        loadData(prof.empresa_id);
      }
    }
  };

  const loadData = async (empresaId) => {
    supabase.from("trabajadores").select("*").eq("empresa_id", empresaId).then(({ data }) => setWorkers(data || []));
    supabase.from("capacitaciones").select("*, asistencias(count)").eq("empresa_id", empresaId).then(({ data }) => setTrainings((data || []).map(t => ({ ...t, asistencia_count: t.asistencias?.[0]?.count || 0 }))));
    supabase.from("documentos").select("*").eq("empresa_id", empresaId).then(({ data }) => setDocs(data || []));
    supabase.from("kpis").select("*").eq("empresa_id", empresaId).then(({ data }) => setKpis((data || []).map(k => ({ ...k, real: k.valor_real }))));
  };

  const navigate = (p) => {
    if (p === "vigilancia" && profile?.rol === "SEGURIDAD") { showToast("Acceso denegado: módulo exclusivo para MEDICO/ADMIN", "error"); return; }
    setPage(p);
  };

  const logout = async () => { await supabase.auth.signOut(); setSession(null); setProfile(null); };

  const role = profile?.rol || "SEGURIDAD";
  const empresaId = profile?.empresa_id;
  const isSuperAdmin = role === "SUPERADMIN";

  const pageTitles = { dashboard: "Dashboard General", directorio: "Sábana de Personal", capacitaciones: "Capacitaciones", documentos: "Centro Documental", kpis: "Gestión de KPIs", reportes: "Reportes PDF", vigilancia: "Vigilancia Médica", accidentes: "Accidentes e Incidentes", seguimiento: "Seguimiento Médico", superadmin: "Panel de Administración" };
  const roleColors = { SUPERADMIN: "text-orange-400 bg-orange-900/40 border-orange-800", ADMIN: "text-purple-400 bg-purple-900/40 border-purple-800", MEDICO: "text-emerald-400 bg-emerald-900/40 border-emerald-800", SEGURIDAD: "text-amber-400 bg-amber-900/40 border-amber-800" };

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-600 text-sm">Cargando...</div>;
  if (!session) return <><Login /><ToastContainer /></>;

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <aside className="w-56 min-w-56 bg-gray-900 border-r border-gray-800 flex flex-col overflow-y-auto">
        <div className="px-4 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5"><div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-xs font-bold">S</div><span className="font-semibold text-sm">SSOMA <span className="text-gray-500 font-normal">HSE</span></span></div>
          <div className="text-xs text-gray-600 mt-1 truncate">{empresa?.nombre || "Sin empresa"}</div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {isSuperAdmin && (
            <>
              <div className="text-xs text-gray-700 font-medium uppercase tracking-wider px-2 mb-2">Administración</div>
              <button onClick={() => setPage("superadmin")} className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-left ${page === "superadmin" ? "bg-orange-900/40 text-orange-400" : "text-gray-500 hover:text-gray-200 hover:bg-gray-800"}`}><Building2 size={16} />Panel Admin</button>
            </>
          )}
          <div className="text-xs text-gray-700 font-medium uppercase tracking-wider px-2 mb-2 mt-2">Módulos</div>
          {NAV.map(({ id, label, icon: Icon }) => (<button key={id} onClick={() => navigate(id)} className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-left ${page === id ? "bg-blue-900/40 text-blue-400" : "text-gray-500 hover:text-gray-200 hover:bg-gray-800"}`}><Icon size={16} />{label}</button>))}
          <div className="text-xs text-gray-700 font-medium uppercase tracking-wider px-2 mt-4 mb-2">Salud Ocupacional</div>
          <button onClick={() => navigate("vigilancia")} className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-left ${page === "vigilancia" ? "bg-blue-900/40 text-blue-400" : "text-gray-500 hover:text-gray-200 hover:bg-gray-800"}`}><Stethoscope size={16} />Vigilancia Médica<span className="ml-auto flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-500 border border-purple-900"><Lock size={9} />MED</span></button>
          <div className="text-xs text-gray-700 font-medium uppercase tracking-wider px-2 mt-4 mb-2">Seguridad</div>
          <button onClick={() => setPage("accidentes")} className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-left ${page === "accidentes" ? "bg-blue-900/40 text-blue-400" : "text-gray-500 hover:text-gray-200 hover:bg-gray-800"}`}><ShieldAlert size={16} />Accidentes</button>
          <button onClick={() => setPage("seguimiento")} className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-left ${page === "seguimiento" ? "bg-blue-900/40 text-blue-400" : "text-gray-500 hover:text-gray-200 hover:bg-gray-800"}`}><ClipboardList size={16} />Seguimiento</button>
        </nav>
        <div className="p-3 border-t border-gray-800">
          <div className="text-xs font-medium text-white mb-0.5 truncate">{profile?.nombre || session.user.email}</div>
          <div className="text-xs text-gray-600 mb-2 truncate">{session.user.email}</div>
          <button onClick={logout} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-gray-600 hover:text-red-400 hover:bg-gray-800 transition-colors"><LogOut size={13} /> Cerrar sesión</button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between gap-4">
          <div><div className="text-sm font-semibold">{pageTitles[page] || page}</div><div className="text-xs text-gray-600">{empresa?.nombre || "SSOMA HSE"}</div></div>
          <span className={`text-xs px-2 py-1 rounded-lg border font-mono ${roleColors[role] || roleColors.SEGURIDAD}`}>{role}</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6 bg-gray-950">
          {page === "superadmin" && isSuperAdmin && <SuperAdmin />}
          {page === "dashboard" && <Dashboard workers={workers} trainings={trainings} />}
          {page === "directorio" && <Directorio workers={workers} setWorkers={setWorkers} role={role} empresaId={empresaId} />}
          {page === "capacitaciones" && <Capacitaciones workers={workers} trainings={trainings} setTrainings={setTrainings} empresaId={empresaId} />}
          {page === "documentos" && <Documentos docs={docs} setDocs={setDocs} empresaId={empresaId} />}
          {page === "kpis" && <KPIs kpis={kpis} setKpis={setKpis} empresaId={empresaId} />}
          {page === "reportes" && <ReportesModulo workers={workers} trainings={trainings} empresaId={empresaId} empresa={empresa} />}
          {page === "accidentes" && <AccidentesModulo workers={workers} empresaId={empresaId} />}
          {page === "seguimiento" && <SeguimientoModulo workers={workers} empresaId={empresaId} />}
          {page === "vigilancia" && <Vigilancia workers={workers} empresaId={empresaId} />}
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
