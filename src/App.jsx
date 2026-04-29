import { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import {
  LayoutDashboard, Users, BookOpen, FileText,
  BarChart2, Stethoscope, LogOut, AlertTriangle,
  CheckCircle, XCircle, Info, Plus, Upload,
  Download, ChevronRight, ChevronLeft, Lock
} from "lucide-react";

// ═══════════════════════════════════════════
// TOAST SYSTEM
// ═══════════════════════════════════════════
let toastQueue = [];
let toastSetter = null;

export function showToast(msg, type = "info") {
  const id = Date.now();
  const toast = { id, msg, type };
  toastQueue = [...toastQueue, toast];
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
  const colors = {
    success: "bg-emerald-900 border-emerald-500 text-emerald-300",
    error: "bg-red-900 border-red-500 text-red-300",
    info: "bg-blue-900 border-blue-500 text-blue-300",
  };
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium pointer-events-auto animate-pulse ${colors[t.type]}`}>
          {icons[t.type]} {t.msg}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// DATOS DEMO (se reemplazarán con Supabase)
// ═══════════════════════════════════════════
const DEMO_WORKERS = [
  { id: 1, nombre: "Carlos Mamani Quispe", dni: "40123456", cargo: "Operador Eléctrico", sede: "San Gabán III", estado: "Activo", tipo_emo: "Periódico", vencimiento_emo: "2025-08-15", aptitud: "Apto", restriccion_medica: "Hipoglucemia leve — restringir trabajo nocturno", completedTrainings: 4, totalTrainings: 5 },
  { id: 2, nombre: "Rosa Tito Flores", dni: "43567891", cargo: "Técnica SSO", sede: "Lima", estado: "Activo", tipo_emo: "Inicial", vencimiento_emo: "2025-07-30", aptitud: "Apto con restricción", restriccion_medica: "Ninguna", completedTrainings: 5, totalTrainings: 5 },
  { id: 3, nombre: "Jorge Huanca Pérez", dni: "47890123", cargo: "Soldador", sede: "San Gabán III", estado: "Activo", tipo_emo: "Periódico", vencimiento_emo: "2024-12-01", aptitud: "Apto", restriccion_medica: "Ninguna", completedTrainings: 2, totalTrainings: 5 },
  { id: 4, nombre: "Luz Marina Condori", dni: "41234567", cargo: "Administradora", sede: "Lima", estado: "Vacaciones", tipo_emo: "Retiro", vencimiento_emo: "2025-09-20", aptitud: "No evaluado", restriccion_medica: "Ninguna", completedTrainings: 3, totalTrainings: 5 },
  { id: 5, nombre: "Pedro Apaza Lazo", dni: "44567890", cargo: "Técnico Mecánico", sede: "San Gabán III", estado: "Activo", tipo_emo: "Periódico", vencimiento_emo: "2025-06-10", aptitud: "Apto", restriccion_medica: "Ninguna", completedTrainings: 1, totalTrainings: 5 },
];
const DEMO_TRAININGS = [
  { id: 1, nombre: "Inducción General SSOMA", fecha: "2025-04-15", asistencia: [1, 2, 4, 5], programados: 5 },
  { id: 2, nombre: "Trabajo en Altura", fecha: "2025-04-22", asistencia: [1, 3], programados: 4 },
  { id: 3, nombre: "Uso y Mantenimiento de EPP", fecha: "2025-05-05", asistencia: [], programados: 5 },
  { id: 4, nombre: "Respuesta a Emergencias", fecha: "2025-05-12", asistencia: [1, 2, 5], programados: 5 },
  { id: 5, nombre: "Ergonomía Laboral", fecha: "2025-05-20", asistencia: [2], programados: 3 },
];
const DEMO_DOCS = [
  { id: 1, nombre: "RISST Reglamento Interno SSO", categoria: "Seguridad", version: "v3", fecha: "2025-03-01" },
  { id: 2, nombre: "Procedimiento Trabajo en Altura", categoria: "Seguridad", version: "v2", fecha: "2025-02-14" },
  { id: 3, nombre: "Protocolo Vigilancia Médica", categoria: "Salud", version: "v1", fecha: "2025-03-20" },
  { id: 4, nombre: "Plan de Manejo Ambiental", categoria: "Ambiente", version: "v1", fecha: "2025-01-05" },
];
const DEMO_KPIS = [
  { id: 1, nombre: "Índice de Frecuencia", mes: "Abril 2025", real: 1.2, meta: 2.0, unidad: "" },
  { id: 2, nombre: "% Capacitaciones Ejecutadas", mes: "Abril 2025", real: 80, meta: 90, unidad: "%" },
  { id: 3, nombre: "% EPP Entregado", mes: "Abril 2025", real: 95, meta: 100, unidad: "%" },
  { id: 4, nombre: "Accidentes con Tiempo Perdido", mes: "Abril 2025", real: 0, meta: 0, unidad: "" },
];

// ═══════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════
function Badge({ children, color = "gray" }) {
  const colors = {
    green: "bg-emerald-900/60 text-emerald-400 border border-emerald-700",
    amber: "bg-amber-900/60 text-amber-400 border border-amber-700",
    red: "bg-red-900/60 text-red-400 border border-red-700",
    blue: "bg-blue-900/60 text-blue-400 border border-blue-700",
    gray: "bg-gray-800 text-gray-400 border border-gray-700",
    purple: "bg-purple-900/60 text-purple-400 border border-purple-700",
  };
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
  const variants = {
    default: "bg-transparent border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white",
    primary: "bg-blue-600 text-white hover:bg-blue-500 border border-transparent",
    danger: "bg-red-900/40 text-red-400 border border-red-800 hover:bg-red-900",
  };
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} disabled={disabled} onClick={onClick}>{children}</button>;
}

// ═══════════════════════════════════════════
// MÓDULO: DASHBOARD
// ═══════════════════════════════════════════
function Dashboard({ workers, trainings }) {
  const activos = workers.filter((w) => w.estado === "Activo").length;
  const conRestriccion = workers.filter((w) => w.aptitud === "Apto con restricción").length;
  const now = new Date();
  const in30 = new Date(); in30.setDate(in30.getDate() + 30);
  const emoVencer = workers.filter((w) => { const d = new Date(w.vencimiento_emo); return d >= now && d <= in30; }).length;
  const emoVencidos = workers.filter((w) => new Date(w.vencimiento_emo) < now);
  const pctInduccion = Math.round((workers.filter((w) => w.completedTrainings >= 1).length / workers.length) * 100) || 0;
  const pctAptitud = Math.round((workers.filter((w) => ["Apto", "Apto con restricción"].includes(w.aptitud)).length / workers.length) * 100) || 0;

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Personal Activo" value={activos} sub={`de ${workers.length} registrados`} accentColor="blue" />
        <KpiCard label="Aptos con Restricción" value={conRestriccion} sub="requieren seguimiento" accentColor="amber" />
        <KpiCard label="EMOs por Vencer" value={emoVencer} sub="próximos 30 días" accentColor="red" />
        <KpiCard label="Capacitaciones" value={trainings.length} sub="programadas este mes" accentColor="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-4">Indicadores de Cumplimiento</div>
          <div className="space-y-3">
            {[
              { label: "% Inducciones completadas", value: pctInduccion, color: "blue" },
              { label: "% EPP entregado", value: 95, color: "emerald" },
              { label: "% Aptitud Médica Vigente", value: pctAptitud, color: "purple" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>{item.label}</span>
                  <span className="text-white font-medium">{item.value}%</span>
                </div>
                <ProgressBar value={item.value} color={item.color} height="h-2" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-4">Últimas Capacitaciones</div>
          <div className="space-y-3">
            {trainings.slice(0, 4).map((t) => {
              const pct = t.programados > 0 ? Math.round((t.asistencia.length / t.programados) * 100) : 0;
              return (
                <div key={t.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0 text-sm text-gray-400 truncate">{t.nombre}</div>
                  <div className="w-20"><ProgressBar value={pct} color={pct >= 80 ? "emerald" : pct >= 40 ? "amber" : "red"} /></div>
                  <div className="text-xs text-gray-600 w-8 text-right">{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {emoVencidos.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-400" /> Alertas Activas
          </div>
          <div className="space-y-2">
            {emoVencidos.map((w) => (
              <div key={w.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-red-900/20 border border-red-900/40 text-sm">
                <AlertTriangle size={14} className="text-red-400 shrink-0" />
                <span className="text-white font-medium">{w.nombre}</span>
                <span className="text-gray-500">—</span>
                <span className="text-red-400">EMO vencido: {w.vencimiento_emo}</span>
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
// MÓDULO: DIRECTORIO
// ═══════════════════════════════════════════
function Directorio({ workers, setWorkers, role }) {
  const [filter, setFilter] = useState({ text: "", estado: "", aptitud: "", sede: "" });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const canSeeMedical = ["ADMIN", "MEDICO"].includes(role);
  const canEditEmo = role !== "SEGURIDAD";

  const sedes = [...new Set(workers.map((w) => w.sede))];
  const filtered = workers.filter((w) => {
    const t = filter.text.toLowerCase();
    return (!t || w.nombre.toLowerCase().includes(t) || w.dni.includes(t))
      && (!filter.estado || w.estado === filter.estado)
      && (!filter.aptitud || w.aptitud === filter.aptitud)
      && (!filter.sede || w.sede === filter.sede);
  });

  const openModal = (worker = null) => {
    setForm(worker || { nombre: "", dni: "", cargo: "", sede: "San Gabán III", estado: "Activo", tipo_emo: "Periódico", vencimiento_emo: "", aptitud: "No evaluado", restriccion_medica: "Ninguna" });
    setModal(worker ? "edit" : "new");
  };

  const saveWorker = async () => {
    if (!form.nombre || !form.dni) { showToast("Nombre y DNI son requeridos", "error"); return; }
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    if (modal === "edit") {
      setWorkers((prev) => prev.map((w) => (w.id === form.id ? { ...form } : w)));
      showToast("Trabajador actualizado", "success");
    } else {
      setWorkers((prev) => [...prev, { ...form, id: Date.now(), completedTrainings: 0, totalTrainings: 5 }]);
      showToast("Trabajador registrado", "success");
    }
    setIsSaving(false);
    setModal(null);
  };

  const aptitudColor = { "Apto": "green", "Apto con restricción": "amber", "No apto": "red", "No evaluado": "gray" };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-semibold text-white">Personal Registrado</div>
          <div className="text-xs text-gray-600">{filtered.length} de {workers.length} trabajadores</div>
        </div>
        <div className="flex gap-2">
          <Btn size="sm" onClick={() => showToast("Sube CSV con columnas 'Nombre' y 'DNI'", "info")}><Upload size={13} /> Importar CSV</Btn>
          <Btn size="sm" onClick={() => showToast("Exportando a Excel...", "info")}><Download size={13} /> Exportar</Btn>
          <Btn size="sm" variant="primary" onClick={() => openModal()}><Plus size={13} /> Registrar</Btn>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        <Input placeholder="Buscar nombre o DNI..." value={filter.text} onChange={(e) => setFilter((f) => ({ ...f, text: e.target.value }))} style={{ flex: 1, minWidth: 160 }} />
        <Select value={filter.estado} onChange={(e) => setFilter((f) => ({ ...f, estado: e.target.value }))} style={{ width: 160 }}>
          <option value="">Todos los estados</option>
          {["Activo", "Vacaciones", "Inactivo"].map((s) => <option key={s}>{s}</option>)}
        </Select>
        <Select value={filter.aptitud} onChange={(e) => setFilter((f) => ({ ...f, aptitud: e.target.value }))} style={{ width: 170 }}>
          <option value="">Toda aptitud</option>
          {["Apto", "Apto con restricción", "No evaluado"].map((a) => <option key={a}>{a}</option>)}
        </Select>
        <Select value={filter.sede} onChange={(e) => setFilter((f) => ({ ...f, sede: e.target.value }))} style={{ width: 150 }}>
          <option value="">Todas las sedes</option>
          {sedes.map((s) => <option key={s}>{s}</option>)}
        </Select>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {["Nombre / DNI", "Cargo", "Sede", "Estado", "Aptitud", "Vence EMO", "Formaciones", ...(canSeeMedical ? ["Restricción"] : []), ""].map((h) => (
                  <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => {
                const pct = Math.round((w.completedTrainings / w.totalTrainings) * 100);
                const isVenc = new Date(w.vencimiento_emo) < new Date();
                return (
                  <tr key={w.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{w.nombre}</div>
                      <div className="text-xs font-mono text-gray-600">{w.dni}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{w.cargo}</td>
                    <td className="px-4 py-3 text-gray-400">{w.sede}</td>
                    <td className="px-4 py-3"><Badge color={w.estado === "Activo" ? "green" : "amber"}>{w.estado}</Badge></td>
                    <td className="px-4 py-3"><Badge color={aptitudColor[w.aptitud] || "gray"}>{w.aptitud}</Badge></td>
                    <td className={`px-4 py-3 font-mono text-xs ${isVenc ? "text-red-400" : "text-gray-500"}`}>{w.vencimiento_emo}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16"><ProgressBar value={pct} color="blue" /></div>
                        <span className="text-xs text-gray-600">{w.completedTrainings}/{w.totalTrainings}</span>
                      </div>
                    </td>
                    {canSeeMedical && (
                      <td className="px-4 py-3 text-xs">
                        {w.restriccion_medica !== "Ninguna" ? <span className="text-amber-400">{w.restriccion_medica}</span> : <span className="text-gray-700">—</span>}
                      </td>
                    )}
                    <td className="px-4 py-3"><Btn size="sm" onClick={() => openModal(w)}>Editar</Btn></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {!canSeeMedical && (
        <div className="flex items-center gap-2 mt-3 text-xs text-gray-600">
          <Lock size={12} className="text-red-500" />
          <span className="px-2 py-0.5 rounded bg-red-900/30 text-red-500 border border-red-900 font-mono text-xs">CONFIDENCIAL</span>
          Restricciones médicas visibles solo para MEDICO y ADMIN
        </div>
      )}

      {modal && (
        <Modal title={modal === "edit" ? "Editar Trabajador" : "Registrar Trabajador"} onClose={() => setModal(null)}>
          <FormField label="Nombre Completo"><Input value={form.nombre || ""} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} /></FormField>
          <FormField label="DNI"><Input value={form.dni || ""} onChange={(e) => setForm((f) => ({ ...f, dni: e.target.value }))} className="font-mono" /></FormField>
          <FormField label="Cargo"><Input value={form.cargo || ""} onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))} /></FormField>
          <FormField label="Sede">
            <Select value={form.sede || ""} onChange={(e) => setForm((f) => ({ ...f, sede: e.target.value }))}>
              <option>San Gabán III</option><option>Lima</option>
            </Select>
          </FormField>
          <FormField label="Estado">
            <Select value={form.estado || ""} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}>
              <option>Activo</option><option>Vacaciones</option><option>Inactivo</option>
            </Select>
          </FormField>
          {canEditEmo ? (
            <>
              <FormField label="Tipo EMO">
                <Select value={form.tipo_emo || ""} onChange={(e) => setForm((f) => ({ ...f, tipo_emo: e.target.value }))}>
                  <option>Inicial</option><option>Periódico</option><option>Retiro</option>
                </Select>
              </FormField>
              <FormField label="Vencimiento EMO"><Input type="date" value={form.vencimiento_emo || ""} onChange={(e) => setForm((f) => ({ ...f, vencimiento_emo: e.target.value }))} /></FormField>
              <FormField label="Aptitud Médica">
                <Select value={form.aptitud || ""} onChange={(e) => setForm((f) => ({ ...f, aptitud: e.target.value }))}>
                  <option>Apto</option><option>Apto con restricción</option><option>No apto</option><option>No evaluado</option>
                </Select>
              </FormField>
            </>
          ) : (
            <div className="mb-3 px-3 py-2.5 rounded-lg bg-amber-900/20 border border-amber-900/40 text-xs text-amber-400 flex items-center gap-2">
              <Lock size={12} /> Los campos de EMO solo pueden editarlos MEDICO o ADMIN
            </div>
          )}
          {canSeeMedical && (
            <FormField label="Detalle Restricción Médica" confidential>
              <Input value={form.restriccion_medica || ""} onChange={(e) => setForm((f) => ({ ...f, restriccion_medica: e.target.value }))} />
            </FormField>
          )}
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
// MÓDULO: CAPACITACIONES
// ═══════════════════════════════════════════
function Capacitaciones({ workers, trainings, setTrainings }) {
  const [detail, setDetail] = useState(null);

  const toggleAttendance = (trainingId, workerId, checked) => {
    setTrainings((prev) => prev.map((t) => {
      if (t.id !== trainingId) return t;
      const asistencia = checked ? [...t.asistencia, workerId] : t.asistencia.filter((id) => id !== workerId);
      return { ...t, asistencia };
    }));
    showToast(checked ? "Asistencia marcada" : "Ausencia registrada", checked ? "success" : "info");
  };

  if (detail) {
    const t = trainings.find((x) => x.id === detail);
    const active = workers.filter((w) => w.estado === "Activo");
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <Btn size="sm" onClick={() => setDetail(null)}><ChevronLeft size={13} /> Volver</Btn>
          <div>
            <div className="text-sm font-semibold text-white">{t.nombre}</div>
            <div className="text-xs text-gray-600">Fecha: {t.fecha}</div>
          </div>
          <div className="ml-auto flex gap-2">
            <Btn size="sm" onClick={() => showToast("Sube CSV con columna 'DNI' para marcar asistencia", "info")}><Upload size={13} /> Importar CSV</Btn>
            <Btn size="sm" onClick={() => showToast("Exportando asistencias...", "info")}><Download size={13} /> Exportar</Btn>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs text-gray-600 font-medium px-4 py-3 w-10">
                  <input type="checkbox" className="accent-blue-500" onChange={(e) => {
                    active.forEach((w) => toggleAttendance(t.id, w.id, e.target.checked));
                  }} />
                </th>
                {["Nombre", "DNI", "Cargo", "Asistencia"].map((h) => (
                  <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {active.map((w) => {
                const present = t.asistencia.includes(w.id);
                return (
                  <tr key={w.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3"><input type="checkbox" className="accent-blue-500" checked={present} onChange={(e) => toggleAttendance(t.id, w.id, e.target.checked)} /></td>
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
          <div className="text-xs text-gray-600">Abril – Mayo 2025</div>
        </div>
        <div className="flex gap-2">
          <Btn size="sm" onClick={() => showToast("Exportando plan...", "info")}><Download size={13} /> Exportar Plan</Btn>
          <Btn size="sm" variant="primary" onClick={() => showToast("Modal nueva capacitación", "info")}><Plus size={13} /> Nueva</Btn>
        </div>
      </div>
      <div className="space-y-2">
        {trainings.map((t) => {
          const pct = t.programados > 0 ? Math.round((t.asistencia.length / t.programados) * 100) : 0;
          return (
            <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white text-sm">{t.nombre}</div>
                <div className="text-xs text-gray-600 mt-0.5">{t.fecha}</div>
              </div>
              <div className="flex items-center gap-3 w-48">
                <div className="flex-1"><ProgressBar value={pct} color={pct >= 80 ? "emerald" : pct >= 40 ? "amber" : "red"} height="h-1.5" /></div>
                <span className="text-xs text-gray-500 whitespace-nowrap">{t.asistencia.length}/{t.programados} ({pct}%)</span>
              </div>
              <Btn size="sm" onClick={() => setDetail(t.id)}>Ver detalle <ChevronRight size={12} /></Btn>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// MÓDULO: DOCUMENTOS
// ═══════════════════════════════════════════
function Documentos({ docs, setDocs }) {
  const [catFilter, setCatFilter] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nombre: "", categoria: "Seguridad", version: "v1", sourceType: "upload" });
  const [isSaving, setIsSaving] = useState(false);
  const cats = ["Seguridad", "Salud", "Ambiente"];
  const filtered = docs.filter((d) => !catFilter || d.categoria === catFilter);
  const catColor = { Seguridad: "red", Salud: "blue", Ambiente: "green" };

  const saveDoc = async () => {
    if (!form.nombre) { showToast("El nombre es requerido", "error"); return; }
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setDocs((prev) => [{ ...form, id: Date.now(), fecha: new Date().toISOString().split("T")[0] }, ...prev]);
    showToast("Documento registrado", "success");
    setIsSaving(false);
    setModal(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-semibold text-white">Centro Documental</div>
          <div className="text-xs text-gray-600">Documentos del SIG — ISO 45001</div>
        </div>
        <Btn size="sm" variant="primary" onClick={() => setModal(true)}><Plus size={13} /> Agregar</Btn>
      </div>
      <div className="flex gap-1 border-b border-gray-800 mb-4">
        {[{ label: `Todos (${docs.length})`, val: "" }, ...cats.map((c) => ({ label: `${c} (${docs.filter((d) => d.categoria === c).length})`, val: c }))].map((tab) => (
          <button key={tab.val} onClick={() => setCatFilter(tab.val)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${catFilter === tab.val ? "border-blue-500 text-blue-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {["Documento", "Categoría", "Versión", "Fecha", ""].map((h) => (
                <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3 font-medium text-white">{d.nombre}</td>
                <td className="px-4 py-3"><Badge color={catColor[d.categoria] || "gray"}>{d.categoria}</Badge></td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{d.version}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{d.fecha}</td>
                <td className="px-4 py-3"><Btn size="sm" onClick={() => showToast("Abriendo documento...", "info")}>↗ Ver</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title="Agregar Documento" onClose={() => setModal(false)}>
          <FormField label="Nombre del Documento"><Input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej. Procedimiento de Trabajo Seguro" /></FormField>
          <FormField label="Categoría"><Select value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}>{cats.map((c) => <option key={c}>{c}</option>)}</Select></FormField>
          <FormField label="Versión"><Input value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} placeholder="v1" className="font-mono" /></FormField>
          <div className="mb-3 bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-2 font-medium">Fuente del Documento</div>
            <div className="flex gap-2 mb-3">
              {[{ val: "upload", label: "⬆ Subir Archivo" }, { val: "url", label: "🔗 URL Externa" }].map((opt) => (
                <button key={opt.val} onClick={() => setForm((f) => ({ ...f, sourceType: opt.val }))} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.sourceType === opt.val ? "border-blue-500 text-blue-400 bg-blue-900/20" : "border-gray-700 text-gray-500"}`}>{opt.label}</button>
              ))}
            </div>
            {form.sourceType === "upload" ? (
              <><input type="file" accept=".pdf,.xlsx,.docx" className="w-full text-xs text-gray-400" /><div className="text-xs text-gray-600 mt-1.5">Se subirá a Supabase Storage. Formatos: PDF, Excel, Word.</div></>
            ) : (
              <Input placeholder="https://..." value={form.url || ""} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
            )}
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
// MÓDULO: KPIs
// ═══════════════════════════════════════════
function KPIs({ kpis, setKpis }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nombre: "", mes: "Mayo 2025", real: 0, meta: 100, unidad: "%" });
  const [isSaving, setIsSaving] = useState(false);

  const isKpiMet = (k) => k.meta === 0 ? k.real === 0 : (k.nombre.toLowerCase().includes("frecuencia") || k.nombre.toLowerCase().includes("accidente") ? k.real <= k.meta : k.real >= k.meta);

  const saveKpi = async () => {
    if (!form.nombre) { showToast("El nombre es requerido", "error"); return; }
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setKpis((prev) => [...prev, { ...form, id: Date.now(), real: parseFloat(form.real) || 0, meta: parseFloat(form.meta) || 0 }]);
    showToast("KPI registrado", "success");
    setIsSaving(false);
    setModal(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-semibold text-white">Gestión de KPIs</div>
          <div className="text-xs text-gray-600">Indicadores SSOMA — Abril 2025</div>
        </div>
        <Btn size="sm" variant="primary" onClick={() => setModal(true)}><Plus size={13} /> Registrar Métrica</Btn>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {kpis.map((k) => {
          const ok = isKpiMet(k);
          return (
            <div key={k.id} className={`bg-gray-900 border rounded-xl p-4 border-l-4 ${ok ? "border-gray-800 border-l-emerald-500" : "border-gray-800 border-l-red-500"}`}>
              <div className="text-xs text-gray-500 mb-1">{k.nombre}</div>
              <div className={`text-2xl font-semibold tracking-tight ${ok ? "text-emerald-400" : "text-red-400"}`}>{k.real}{k.unidad}</div>
              <div className="text-xs text-gray-600 mt-0.5">Meta: {k.meta}{k.unidad}</div>
              <div className="mt-2"><ProgressBar value={k.meta > 0 ? Math.min(Math.round((k.real / k.meta) * 100), 100) : 100} color={ok ? "emerald" : "red"} /></div>
              <div className={`text-xs mt-1.5 font-medium ${ok ? "text-emerald-500" : "text-red-500"}`}>{ok ? "✓ Cumplido" : "✕ No cumplido"}</div>
            </div>
          );
        })}
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="text-sm font-semibold text-white mb-3">Resumen de Cumplimiento</div>
        <div className="space-y-3">
          {kpis.map((k) => {
            const ok = isKpiMet(k);
            const pct = k.meta > 0 ? Math.min(Math.round((k.real / k.meta) * 100), 100) : 100;
            return (
              <div key={k.id}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-400">{k.nombre}</span>
                  <span className={ok ? "text-emerald-400" : "text-red-400"}>{k.real}{k.unidad} / {k.meta}{k.unidad} {ok ? "✓" : "✕"}</span>
                </div>
                <ProgressBar value={pct} color={ok ? "emerald" : "red"} height="h-1.5" />
              </div>
            );
          })}
        </div>
      </div>
      {modal && (
        <Modal title="Registrar Métrica" onClose={() => setModal(false)}>
          <FormField label="Nombre del Indicador"><Input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} /></FormField>
          <FormField label="Mes"><Input value={form.mes} onChange={(e) => setForm((f) => ({ ...f, mes: e.target.value }))} /></FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Valor Real"><Input type="number" value={form.real} onChange={(e) => setForm((f) => ({ ...f, real: e.target.value }))} /></FormField>
            <FormField label="Meta"><Input type="number" value={form.meta} onChange={(e) => setForm((f) => ({ ...f, meta: e.target.value }))} /></FormField>
          </div>
          <FormField label="Unidad (ej: %, días)"><Input value={form.unidad} onChange={(e) => setForm((f) => ({ ...f, unidad: e.target.value }))} placeholder="%" /></FormField>
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
// MÓDULO: VIGILANCIA MÉDICA
// ═══════════════════════════════════════════
const DEMO_MEDICOS = [
  { id: 1, trabajador: "Carlos Mamani", tipo: "Descanso Médico", inicio: "2025-04-10", fin: "2025-04-15", diagnostico: "Lumbalgia aguda", medico: "Dr. Torres" },
  { id: 2, trabajador: "Jorge Huanca", tipo: "EMO Programado", inicio: "2025-05-02", fin: "2025-05-02", diagnostico: "—", medico: "Dr. Torres" },
];

function Vigilancia({ workers }) {
  const [tab, setTab] = useState("descansos");
  const tabs = [{ id: "descansos", label: "Descansos Médicos" }, { id: "emos", label: "Programación EMOs" }, { id: "morbilidad", label: "Morbilidad" }];

  const EMOsTable = () => {
    const active = [...workers].filter((w) => w.estado === "Activo").sort((a, b) => new Date(a.vencimiento_emo) - new Date(b.vencimiento_emo));
    const now = new Date(); const in30 = new Date(); in30.setDate(in30.getDate() + 30);
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800">{["Trabajador", "Tipo EMO", "Vencimiento", "Estado", "Aptitud"].map((h) => <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody>
            {active.map((w) => {
              const isVenc = new Date(w.vencimiento_emo) < now;
              const soonVenc = !isVenc && new Date(w.vencimiento_emo) <= in30;
              return (
                <tr key={w.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-white">{w.nombre}</td>
                  <td className="px-4 py-3"><Badge color="blue">{w.tipo_emo}</Badge></td>
                  <td className={`px-4 py-3 font-mono text-xs ${isVenc ? "text-red-400" : soonVenc ? "text-amber-400" : "text-gray-500"}`}>{w.vencimiento_emo}</td>
                  <td className="px-4 py-3"><Badge color={isVenc ? "red" : soonVenc ? "amber" : "green"}>{isVenc ? "Vencido" : soonVenc ? "Por vencer" : "Vigente"}</Badge></td>
                  <td className="px-4 py-3"><Badge color={w.aptitud === "Apto" ? "green" : w.aptitud === "Apto con restricción" ? "amber" : "gray"}>{w.aptitud}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="text-sm font-semibold text-white">Vigilancia Médica</div>
        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-purple-900/40 text-purple-400 border border-purple-800"><Lock size={11} /> MEDICO / ADMIN</span>
        <Btn size="sm" variant="primary" className="ml-auto" onClick={() => showToast("Modal nuevo registro médico", "info")}><Plus size={13} /> Nuevo Registro</Btn>
      </div>
      <div className="flex gap-1 border-b border-gray-800 mb-4">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t.id ? "border-blue-500 text-blue-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>{t.label}</button>
        ))}
      </div>
      {tab === "descansos" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800">{["Trabajador", "Tipo", "Inicio", "Fin", "Diagnóstico", "Médico"].map((h) => <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody>
              {DEMO_MEDICOS.map((m) => (
                <tr key={m.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-white">{m.trabajador}</td>
                  <td className="px-4 py-3"><Badge color={m.tipo === "Descanso Médico" ? "red" : "blue"}>{m.tipo}</Badge></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{m.inicio}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{m.fin}</td>
                  <td className="px-4 py-3 text-gray-400">{m.diagnostico}</td>
                  <td className="px-4 py-3 text-gray-600">{m.medico}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === "emos" && <EMOsTable />}
      {tab === "morbilidad" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-sm font-semibold text-white mb-3">Casos por Área</div>
            <div className="space-y-2">
              {[...new Set(workers.map((w) => w.cargo))].map((c, i) => {
                const n = [2, 0, 1, 0, 1][i] || 0;
                return <div key={c}><div className="flex justify-between text-xs text-gray-500 mb-1"><span>{c}</span><span>{n} caso(s)</span></div><ProgressBar value={n * 33} color="amber" /></div>;
              })}
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-sm font-semibold text-white mb-3">Estadísticas del Mes</div>
            <div className="space-y-2 text-sm">
              {[["Descansos médicos", "2"], ["Total días perdidos", "5"], ["EMOs programados", "1"], ["Diagnóstico frecuente", "Lumbalgia"]].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-medium text-white">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
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
  const [page, setPage] = useState("dashboard");
  const [role, setRole] = useState("ADMIN");
  const [workers, setWorkers] = useState(DEMO_WORKERS);
  const [trainings, setTrainings] = useState(DEMO_TRAININGS);
  const [docs, setDocs] = useState(DEMO_DOCS);
  const [kpis, setKpis] = useState(DEMO_KPIS);

  const navigate = (p) => {
    if (p === "vigilancia" && role === "SEGURIDAD") { showToast("Acceso denegado: módulo exclusivo para MEDICO/ADMIN", "error"); return; }
    setPage(p);
  };

  const roleInfo = { ADMIN: { label: "Admin Marco", initials: "AM", color: "text-purple-400 bg-purple-900/40 border-purple-800" }, MEDICO: { label: "Dr. Torres", initials: "MT", color: "text-emerald-400 bg-emerald-900/40 border-emerald-800" }, SEGURIDAD: { label: "Rosa Tito", initials: "RS", color: "text-amber-400 bg-amber-900/40 border-amber-800" } };
  const ri = roleInfo[role];
  const pageTitles = { dashboard: "Dashboard General", directorio: "Directorio Maestro", capacitaciones: "Capacitaciones", documentos: "Centro Documental", kpis: "Gestión de KPIs", vigilancia: "Vigilancia Médica" };

  return (
    <div className="flex h-screen bg-gray-950 text-white font-sans overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-56 min-w-56 bg-gray-900 border-r border-gray-800 flex flex-col overflow-y-auto">
        <div className="px-4 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-xs font-bold">S</div>
            <span className="font-semibold text-sm">SSOMA <span className="text-gray-500 font-normal">HSE</span></span>
          </div>
          <div className="text-xs text-gray-600 mt-1 pl-0.5">Sistema Integrado de Gestión</div>
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
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border ${ri.color}`}>{ri.initials}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white truncate">{ri.label}</div>
              <div className="text-xs text-gray-600">{role}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">{pageTitles[page]}</div>
            <div className="text-xs text-gray-600">Hydro Global Perú S.A.C. — San Gabán III</div>
          </div>
          <div className="flex items-center gap-2">
            <select value={role} onChange={(e) => { setRole(e.target.value); showToast(`Rol cambiado a ${e.target.value}`, "info"); }} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500">
              <option value="ADMIN">Rol: ADMIN</option>
              <option value="MEDICO">Rol: MEDICO</option>
              <option value="SEGURIDAD">Rol: SEGURIDAD</option>
            </select>
            <span className={`text-xs px-2 py-1 rounded-lg border font-mono ${ri.color}`}>{role}</span>
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