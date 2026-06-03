import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { calcularEdad, calcularVigencia, excelDateToISO, fmtFecha} from '../../lib/helpers.js';
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
import RegistrosLegalesHGP from './RegistrosLegalesHGP.jsx';
import {
  Plus, Upload, Download, ChevronRight, ChevronLeft, Lock,
  Trash2, Filter, HelpCircle, Pencil, FileDown, AlertTriangle,
  CheckCircle, Home, HeartPulse, Microscope, Search, Shield,
  ClipboardList, ShieldAlert, Activity, BarChart2, BookOpen,
  FileText, Users, LayoutDashboard, Stethoscope, Settings,
  Building2, Phone, Scale
} from 'lucide-react';

export default function AccidentesModulo({ workers, empresaId, empresa }) {
  const esHydroGlobal = empresa?.nombre?.toLowerCase().includes("hydro") || false;
  const [vistaLegal, setVistaLegal] = useState(false);
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

  // Vista de Registros Legales MINTRA (solo Hydro Global)
  if (vistaLegal && esHydroGlobal) {
    return <RegistrosLegalesHGP empresaId={empresaId} onBack={() => setVistaLegal(false)} />;
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Accidentes e Incidentes</h3>
          <p className="text-gray-500 text-xs max-w-xl">Registro y seguimiento de accidentes laborales, incidentes peligrosos y casi-accidentes. Cumplimiento Ley 29783 y R.M. 050-2013-TR.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          {esHydroGlobal && (
            <Btn size="sm" variant="ghost" onClick={() => setVistaLegal(true)}><Scale size={13} /> Registros Legales MINTRA</Btn>
          )}
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
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{fmtFecha(r.fecha_evento)}</td>
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
                  {workers.filter(w => w.estado !== "Cesado").sort((a,b) => a.nombre.localeCompare(b.nombre,"es")).map(w => <option key={w.id} value={w.id}>{w.nombre}</option>)}
                  {workers.some(w => w.estado === "Cesado") && <option disabled>── Cesados ──</option>}
                  {workers.filter(w => w.estado === "Cesado").sort((a,b) => a.nombre.localeCompare(b.nombre,"es")).map(w => <option key={w.id} value={w.id}>{w.nombre} (Cesado)</option>)}
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
