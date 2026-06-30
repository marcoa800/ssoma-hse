import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase, puedeEliminar } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { calcularEdad, calcularVigencia, excelDateToISO } from '../../lib/helpers.js';
import { Badge } from '../../components/ui/Badge.jsx';
import { ProgressBar } from '../../components/ui/ProgressBar.jsx';
import { KpiCard } from '../../components/ui/KpiCard.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Btn } from '../../components/ui/Btn.jsx';
import { ExportBtn } from '../../components/ui/ExportBtn.jsx';
import { FilterBar } from '../../components/ui/FilterBar.jsx';
import { WideTableScroll } from '../../components/ui/WideTableScroll.jsx';
import {
  Plus, Upload, Download, ChevronRight, ChevronLeft, Lock,
  Trash2, Filter, HelpCircle, Pencil, FileDown, AlertTriangle,
  CheckCircle, Home, HeartPulse, Microscope, Search, Shield,
  ClipboardList, ShieldAlert, Activity, BarChart2, BookOpen,
  FileText, Users, LayoutDashboard, Stethoscope, Settings,
  Building2, Phone
} from 'lucide-react';

const TIPOS_EPP = ["Casco de seguridad","Guantes de cuero / badana","Guantes de nitrilo","Guantes de neoprene","Calzado de seguridad (punta acero)","Botas de jebe","Lentes de seguridad","Careta facial","Tapones auditivos","Orejeras","Respirador N95","Respirador con filtros intercambiables","Arnés de cuerpo completo","Overol de trabajo","Chaleco reflectivo","Protector solar FPS 50+","Traje Tyvek / HAZMAT","Mandil / delantal","Otro"];

export default function EppModulo({ workers, empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [fTipo, setFTipo] = useState("");
  const [fEstado, setFEstado] = useState("");
  const [fWorker, setFWorker] = useState("");
  const initForm = {
    trabajador_id: "", tipo_epp: "", descripcion: "", talla: "",
    cantidad: "1", fecha_entrega: new Date().toISOString().split("T")[0],
    proxima_reposicion: "", estado: "Activo", observaciones: ""
  };
  const [form, setForm] = useState(initForm);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("control_epps")
      .select("*, trabajadores(nombre, cargo)")
      .eq("empresa_id", empresaId)
      .order("fecha_entrega", { ascending: false });
    if (error) showToast("Error: " + error.message, "error");
    setRecords(data || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const openEdit = (r) => {
    setForm({ trabajador_id: r.trabajador_id || "", tipo_epp: r.tipo_epp, descripcion: r.descripcion || "", talla: r.talla || "", cantidad: String(r.cantidad || 1), fecha_entrega: r.fecha_entrega, proxima_reposicion: r.proxima_reposicion || "", estado: r.estado || "Activo", observaciones: r.observaciones || "" });
    setEditing(r.id); setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(initForm); };
  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este registro?")) return;
    await supabase.from("control_epps").delete().eq("id", id);
    showToast("Eliminado", "info"); load();
  };
  const handleSave = async () => {
    if (!form.trabajador_id || !form.tipo_epp || !form.fecha_entrega) { showToast("Trabajador, tipo de EPP y fecha son obligatorios", "error"); return; }
    setSaving(true);
    const payload = { empresa_id: empresaId, trabajador_id: form.trabajador_id, tipo_epp: form.tipo_epp, descripcion: form.descripcion, talla: form.talla, cantidad: parseInt(form.cantidad) || 1, fecha_entrega: form.fecha_entrega, proxima_reposicion: form.proxima_reposicion || null, estado: form.estado, observaciones: form.observaciones };
    const { error } = editing ? await supabase.from("control_epps").update(payload).eq("id", editing) : await supabase.from("control_epps").insert(payload);
    if (error) { showToast("Error: " + error.message, "error"); } else { showToast(editing ? "Actualizado" : "EPP registrado", "success"); closeModal(); load(); }
    setSaving(false);
  };

  const now = new Date(); const in30 = new Date(); in30.setDate(in30.getDate() + 30);
  const vencidos = records.filter(r => r.proxima_reposicion && new Date(r.proxima_reposicion + "T00:00:00") < now);
  const porVencer = records.filter(r => r.proxima_reposicion && new Date(r.proxima_reposicion + "T00:00:00") >= now && new Date(r.proxima_reposicion + "T00:00:00") <= in30);
  const workersConEpp = new Set(records.map(r => r.trabajador_id)).size;
  const tipoOpts = [...new Set(records.map(r => r.tipo_epp).filter(Boolean))].sort();
  const workerOpts = workers.filter(w => records.some(r => r.trabajador_id === w.id));

  const filtered = records.filter(r =>
    (!fTipo || r.tipo_epp === fTipo) &&
    (!fEstado || r.estado === fEstado) &&
    (!fWorker || r.trabajador_id === fWorker));

  const estadoColor = e => ({ Activo: "green", Vencido: "red", "Por vencer": "amber", Extraviado: "orange", Deteriorado: "gray" }[e] || "gray");

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Control de EPPs</h3>
          <p className="text-gray-500 text-xs max-w-xl">Registro de entrega de equipos de protección personal por trabajador. Control de tallas, fechas de reposición y estado.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <ExportBtn data={records.map(r => ({ Trabajador: r.trabajadores?.nombre || "—", Cargo: r.trabajadores?.cargo || "—", "Tipo EPP": r.tipo_epp, Descripción: r.descripcion || "", Talla: r.talla || "", Cantidad: r.cantidad, "F. Entrega": r.fecha_entrega, "Próx. Reposición": r.proxima_reposicion || "", Estado: r.estado, Observaciones: r.observaciones || "" }))} filename="control_epps" />
          <Btn size="sm" variant="primary" onClick={() => { setEditing(null); setForm(initForm); setShowModal(true); }}><Plus size={13} /> Registrar entrega</Btn>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-5">
        <KpiCard label="Registros totales" value={records.length} sub={`${workersConEpp} trabajadores con EPP`} accentColor="blue" />
        <KpiCard label="EPPs vencidos" value={vencidos.length} sub="requieren reposición inmediata" accentColor="red" />
        <KpiCard label="Por vencer (30 días)" value={porVencer.length} sub="próxima reposición" accentColor="amber" />
        <KpiCard label="Sin EPP registrado" value={workers.filter(w => w.estado === "Activo" && !records.some(r => r.trabajador_id === w.id)).length} sub="trabajadores activos" accentColor="purple" />
      </div>

      {(vencidos.length > 0 || porVencer.length > 0) && (
        <div className="bg-amber-900/20 border border-amber-800 rounded-xl p-3 mb-4 flex items-start gap-3">
          <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-amber-400 text-xs font-medium">{vencidos.length > 0 ? `${vencidos.length} EPP(s) con fecha de reposición vencida. ` : ""}{porVencer.length > 0 ? `${porVencer.length} EPP(s) por vencer en los próximos 30 días.` : ""}</p>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4 flex-wrap p-3 bg-gray-900/50 border border-gray-800 rounded-xl">
        <Filter size={12} className="text-gray-500 shrink-0" />
        <span className="text-xs text-gray-500 shrink-0">Filtrar:</span>
        <select value={fWorker} onChange={e => setFWorker(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500">
          <option value="">Todos los trabajadores</option>
          {workerOpts.map(w => <option key={w.id} value={w.id}>{w.nombre}</option>)}
        </select>
        <select value={fTipo} onChange={e => setFTipo(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500">
          <option value="">Todos los EPPs</option>
          {tipoOpts.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={fEstado} onChange={e => setFEstado(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500">
          <option value="">Todos los estados</option>
          {["Activo","Por vencer","Vencido","Extraviado","Deteriorado"].map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        {(fWorker || fTipo || fEstado) && <button onClick={() => { setFWorker(""); setFTipo(""); setFEstado(""); }} className="text-xs text-blue-400 hover:text-blue-300 ml-1">✕ Limpiar</button>}
      </div>

      {/* ── Vista móvil: tarjetas ── */}
      <div className="md:hidden space-y-2.5">
        {loading && <div className="text-center text-gray-600 text-sm py-8 bg-gray-900 border border-gray-800 rounded-xl">Cargando...</div>}
        {!loading && filtered.map(r => {
          const isVenc = r.proxima_reposicion && new Date(r.proxima_reposicion + "T00:00:00") < now;
          const isPorV = !isVenc && r.proxima_reposicion && new Date(r.proxima_reposicion + "T00:00:00") <= in30;
          const estadoReal = isVenc ? "Vencido" : isPorV ? "Por vencer" : r.estado;
          return (
            <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3.5">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <div className="font-semibold text-white text-sm leading-tight">{r.trabajadores?.nombre || "—"}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{r.trabajadores?.cargo || "Sin cargo"}</div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 p-1"><Pencil size={15} /></button>
                  {puedeEliminar() && (
                    <button onClick={() => handleDelete(r.id)} className="text-red-500/60 hover:text-red-400 p-1"><Trash2 size={15} /></button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                <span className="text-xs text-gray-300 font-medium">{r.tipo_epp}</span>
                <Badge color={estadoColor(estadoReal)}>{estadoReal}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs border-t border-gray-800 pt-2.5">
                {r.descripcion && <div className="col-span-2"><span className="text-gray-600">Descripción:</span> <span className="text-gray-400">{r.descripcion}</span></div>}
                <div><span className="text-gray-600">Talla:</span> <span className="text-gray-400 font-mono">{r.talla || "—"}</span></div>
                <div><span className="text-gray-600">Cantidad:</span> <span className="text-gray-400 font-mono">{r.cantidad}</span></div>
                <div><span className="text-gray-600">Entrega:</span> <span className="text-gray-400 font-mono">{r.fecha_entrega}</span></div>
                <div><span className="text-gray-600">Próx. rep.:</span> <span className={`font-mono ${isVenc ? "text-red-400 font-semibold" : isPorV ? "text-amber-400 font-semibold" : "text-gray-400"}`}>{r.proxima_reposicion || "—"}</span></div>
              </div>
            </div>
          );
        })}
        {!loading && !filtered.length && (
          <div className="text-center text-gray-600 text-sm py-8 bg-gray-900 border border-gray-800 rounded-xl">{records.length ? "Sin resultados para el filtro aplicado." : "Sin registros. Usa \"Registrar entrega\" para comenzar."}</div>
        )}
      </div>

      {/* ── Vista escritorio: tabla ── */}
      <div className="hidden md:block">
        <WideTableScroll>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800">
            {["Trabajador", "Tipo EPP", "Descripción / Marca", "Talla", "Cant.", "F. Entrega", "Próx. Reposición", "Estado", ""].map(h => (
              <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
            {!loading && filtered.map(r => {
              const isVenc = r.proxima_reposicion && new Date(r.proxima_reposicion + "T00:00:00") < now;
              const isPorV = !isVenc && r.proxima_reposicion && new Date(r.proxima_reposicion + "T00:00:00") <= in30;
              const estadoReal = isVenc ? "Vencido" : isPorV ? "Por vencer" : r.estado;
              return (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white text-xs">{r.trabajadores?.nombre || "—"}</div>
                    <div className="text-gray-600 text-[10px]">{r.trabajadores?.cargo || ""}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs">{r.tipo_epp}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.descripcion || "—"}</td>
                  <td className="px-4 py-3 text-center text-gray-400 text-xs font-mono">{r.talla || "—"}</td>
                  <td className="px-4 py-3 text-center text-white font-bold text-xs">{r.cantidad}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.fecha_entrega}</td>
                  <td className={`px-4 py-3 font-mono text-xs ${isVenc ? "text-red-400 font-semibold" : isPorV ? "text-amber-400 font-semibold" : "text-gray-500"}`}>{r.proxima_reposicion || "—"}</td>
                  <td className="px-4 py-3"><Badge color={estadoColor(estadoReal)}>{estadoReal}</Badge></td>
                  <td className="px-4 py-3"><div className="flex gap-1">
                    <button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button>
                    {puedeEliminar() && (
                      <button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                    )}
                  </div></td>
                </tr>
              );
            })}
            {!loading && !filtered.length && (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-600 text-sm">{records.length ? "Sin resultados para el filtro aplicado." : "Sin registros. Usa \"Registrar entrega\" para comenzar."}</td></tr>
            )}
          </tbody>
        </table>
        </WideTableScroll>
      </div>

      {showModal && (
        <Modal title={editing ? "Editar registro EPP" : "Registrar entrega de EPP"} onClose={closeModal} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Trabajador *">
                <Select value={form.trabajador_id} onChange={e => setForm(f => ({ ...f, trabajador_id: e.target.value }))}>
                  <option value="">Seleccionar trabajador...</option>
                  {workers.filter(w => w.estado !== "Cesado").sort((a,b) => a.nombre.localeCompare(b.nombre,"es")).map(w => <option key={w.id} value={w.id}>{w.nombre}{w.cargo ? ` — ${w.cargo}` : ""}</option>)}
                  {workers.some(w => w.estado === "Cesado") && <option disabled>── Cesados ──</option>}
                  {workers.filter(w => w.estado === "Cesado").sort((a,b) => a.nombre.localeCompare(b.nombre,"es")).map(w => <option key={w.id} value={w.id}>{w.nombre} (Cesado){w.cargo ? ` — ${w.cargo}` : ""}</option>)}
                </Select>
              </FormField>
              <FormField label="Tipo de EPP *">
                <Select value={form.tipo_epp} onChange={e => setForm(f => ({ ...f, tipo_epp: e.target.value }))}>
                  <option value="">Seleccionar...</option>
                  {TIPOS_EPP.map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Descripción / Marca"><Input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Ej: 3M, MSA, Jyrsa..." /></FormField>
              <FormField label="Talla / Medida"><Input value={form.talla} onChange={e => setForm(f => ({ ...f, talla: e.target.value }))} placeholder="S, M, L, XL / 40, 42..." /></FormField>
              <FormField label="Cantidad"><Input type="number" min="1" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} /></FormField>
              <FormField label="Estado">
                <Select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                  {["Activo","Extraviado","Deteriorado"].map(e => <option key={e}>{e}</option>)}
                </Select>
              </FormField>
              <FormField label="Fecha de entrega *"><Input type="date" value={form.fecha_entrega} onChange={e => setForm(f => ({ ...f, fecha_entrega: e.target.value }))} /></FormField>
              <FormField label="Fecha de próxima reposición"><Input type="date" value={form.proxima_reposicion} onChange={e => setForm(f => ({ ...f, proxima_reposicion: e.target.value }))} /></FormField>
            </div>
            <FormField label="Observaciones"><Input value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} placeholder="Ej: Entregado con firma de recepción, reemplaza EPP dañado..." /></FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={closeModal}>Cancelar</Btn>
              <Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : editing ? "Actualizar" : "Registrar"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
