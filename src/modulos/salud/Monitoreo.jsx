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

const TIPOS_AGENTE = ["Ruido ocupacional","Material particulado respirable","Material particulado total","Polvo de sílice libre cristalizada","Iluminación","Estrés térmico (WBGT)","Vibración mano-brazo","Vibración cuerpo entero","Agente químico","Agente biológico","Radiación UV","Radiación ionizante","Ventilación","Otro"];
const UNIDADES_AGENTE = { "Ruido ocupacional": "dB(A)", "Material particulado respirable": "mg/m³", "Material particulado total": "mg/m³", "Polvo de sílice libre cristalizada": "mg/m³", "Iluminación": "lux", "Estrés térmico (WBGT)": "°C WBGT", "Vibración mano-brazo": "m/s²", "Vibración cuerpo entero": "m/s²", "Radiación UV": "mW/cm²" };
const LIMITES_AGENTE = { "Ruido ocupacional": 85, "Material particulado respirable": 5, "Material particulado total": 10, "Polvo de sílice libre cristalizada": 0.025, "Vibración mano-brazo": 5, "Vibración cuerpo entero": 0.5 };

export default function MonitoreoModulo({ empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [fTipo, setFTipo] = useState("");
  const [fSupera, setFSupera] = useState("");
  const initForm = {
    tipo_agente: "", area_monitoreada: "", fecha_monitoreo: new Date().toISOString().split("T")[0],
    empresa_laboratorio: "", resultado_valor: "", unidad: "", limite_permisible: "",
    supera_limite: false, observaciones: "", medidas_correctivas: "", proxima_fecha: ""
  };
  const [form, setForm] = useState(initForm);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("monitoreo_agentes")
      .select("*").eq("empresa_id", empresaId)
      .order("fecha_monitoreo", { ascending: false });
    if (error) showToast("Error: " + error.message, "error");
    setRecords(data || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const openEdit = (r) => {
    setForm({ tipo_agente: r.tipo_agente, area_monitoreada: r.area_monitoreada, fecha_monitoreo: r.fecha_monitoreo, empresa_laboratorio: r.empresa_laboratorio || "", resultado_valor: r.resultado_valor != null ? String(r.resultado_valor) : "", unidad: r.unidad || "", limite_permisible: r.limite_permisible != null ? String(r.limite_permisible) : "", supera_limite: r.supera_limite || false, observaciones: r.observaciones || "", medidas_correctivas: r.medidas_correctivas || "", proxima_fecha: r.proxima_fecha || "" });
    setEditing(r.id); setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(initForm); };
  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este registro?")) return;
    await supabase.from("monitoreo_agentes").delete().eq("id", id);
    showToast("Eliminado", "info"); load();
  };
  const handleSave = async () => {
    if (!form.tipo_agente || !form.area_monitoreada || !form.fecha_monitoreo) { showToast("Tipo, área y fecha son obligatorios", "error"); return; }
    setSaving(true);
    const resultado = form.resultado_valor ? parseFloat(form.resultado_valor) : null;
    const limite = form.limite_permisible ? parseFloat(form.limite_permisible) : null;
    const supera = resultado != null && limite != null ? resultado > limite : form.supera_limite;
    const payload = { empresa_id: empresaId, tipo_agente: form.tipo_agente, area_monitoreada: form.area_monitoreada, fecha_monitoreo: form.fecha_monitoreo, empresa_laboratorio: form.empresa_laboratorio, resultado_valor: resultado, unidad: form.unidad, limite_permisible: limite, supera_limite: supera, observaciones: form.observaciones, medidas_correctivas: form.medidas_correctivas, proxima_fecha: form.proxima_fecha || null };
    const { error } = editing ? await supabase.from("monitoreo_agentes").update(payload).eq("id", editing) : await supabase.from("monitoreo_agentes").insert(payload);
    if (error) { showToast("Error: " + error.message, "error"); } else { showToast(editing ? "Actualizado" : "Monitoreo registrado", "success"); closeModal(); load(); }
    setSaving(false);
  };

  const superanLimite = records.filter(r => r.supera_limite);
  const anioActual = new Date().getFullYear();
  const delAnio = records.filter(r => new Date(r.fecha_monitoreo).getFullYear() === anioActual);
  const areasMonit = new Set(records.map(r => r.area_monitoreada)).size;
  const tipoOpts = [...new Set(records.map(r => r.tipo_agente).filter(Boolean))].sort();
  const filtered = records.filter(r => (!fTipo || r.tipo_agente === fTipo) && (!fSupera || (fSupera === "si" ? r.supera_limite : !r.supera_limite)));

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Monitoreo de Agentes Ocupacionales</h3>
          <p className="text-gray-500 text-xs max-w-xl">Registro de resultados de monitoreos anuales de agentes físicos, químicos y biológicos por área. (D.S. 015-2005-SA / R.M. 375-2008-TR)</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <ExportBtn data={records.map(r => ({ "Tipo de agente": r.tipo_agente, Área: r.area_monitoreada, Fecha: r.fecha_monitoreo, Laboratorio: r.empresa_laboratorio || "", Resultado: r.resultado_valor ?? "", Unidad: r.unidad || "", "Límite permisible": r.limite_permisible ?? "", "¿Supera límite?": r.supera_limite ? "SÍ" : "No", Observaciones: r.observaciones || "", "Medidas correctivas": r.medidas_correctivas || "", "Próx. monitoreo": r.proxima_fecha || "" }))} filename="monitoreo_agentes" />
          <Btn size="sm" variant="primary" onClick={() => { setEditing(null); setForm(initForm); setShowModal(true); }}><Plus size={13} /> Nuevo monitoreo</Btn>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <KpiCard label={`Monitoreos ${anioActual}`} value={delAnio.length} sub={`${records.length} registros en total`} accentColor="blue" />
        <KpiCard label="Superan límite permisible" value={superanLimite.length} sub="requieren medidas correctivas" accentColor="red" />
        <KpiCard label="Áreas monitoreadas" value={areasMonit} sub="áreas únicas registradas" accentColor="emerald" />
      </div>

      {superanLimite.length > 0 && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-3 mb-4 flex items-start gap-3">
          <AlertTriangle size={15} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 text-xs font-semibold mb-1">{superanLimite.length} monitoreo(s) superan el límite permisible — se requieren medidas de control inmediatas</p>
            <p className="text-red-600 text-xs">{superanLimite.map(r => `${r.tipo_agente} en ${r.area_monitoreada}`).join(" · ")}</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4 flex-wrap p-3 bg-gray-900/50 border border-gray-800 rounded-xl">
        <Filter size={12} className="text-gray-500 shrink-0" />
        <span className="text-xs text-gray-500 shrink-0">Filtrar:</span>
        <select value={fTipo} onChange={e => setFTipo(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500">
          <option value="">Todos los agentes</option>
          {tipoOpts.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={fSupera} onChange={e => setFSupera(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500">
          <option value="">Todos</option>
          <option value="si">⚠ Superan límite</option>
          <option value="no">✓ Dentro del límite</option>
        </select>
        {(fTipo || fSupera) && <button onClick={() => { setFTipo(""); setFSupera(""); }} className="text-xs text-blue-400 hover:text-blue-300 ml-1">✕ Limpiar</button>}
      </div>

      {/* ── Vista móvil: tarjetas ── */}
      <div className="md:hidden space-y-2.5">
        {loading && <div className="text-center text-gray-600 text-sm py-8 bg-gray-900 border border-gray-800 rounded-xl">Cargando...</div>}
        {!loading && filtered.map(r => (
          <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3.5">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="min-w-0">
                <div className="font-semibold text-white text-sm leading-tight">{r.tipo_agente}</div>
                <div className="text-xs text-gray-500 mt-0.5">{r.area_monitoreada}</div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 p-1"><Pencil size={15} /></button>
                {puedeEliminar() && (
                  <button onClick={() => handleDelete(r.id)} className="text-red-500/60 hover:text-red-400 p-1"><Trash2 size={15} /></button>
                )}
              </div>
            </div>
            <div className="mb-2.5">{r.supera_limite ? <Badge color="red">⚠ Supera límite</Badge> : <Badge color="green">✓ Dentro del límite</Badge>}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 text-xs border-t border-gray-800 pt-2.5">
              <div><span className="text-gray-600">Fecha:</span> <span className="text-gray-400 font-mono">{r.fecha_monitoreo}</span></div>
              <div className="truncate"><span className="text-gray-600">Laboratorio:</span> <span className="text-gray-400">{r.empresa_laboratorio || "—"}</span></div>
              <div><span className="text-gray-600">Resultado:</span> {r.resultado_valor != null ? <span className={`font-mono font-bold ${r.supera_limite ? "text-red-400" : "text-emerald-400"}`}>{r.resultado_valor} {r.unidad}</span> : <span className="text-gray-500">—</span>}</div>
              <div><span className="text-gray-600">Límite:</span> <span className="text-gray-400 font-mono">{r.limite_permisible != null ? `${r.limite_permisible} ${r.unidad || ""}` : "—"}</span></div>
              <div><span className="text-gray-600">Próx. monitoreo:</span> <span className="text-gray-400 font-mono">{r.proxima_fecha || "—"}</span></div>
            </div>
          </div>
        ))}
        {!loading && !filtered.length && (
          <div className="text-center text-gray-600 text-sm py-8 bg-gray-900 border border-gray-800 rounded-xl">{records.length ? "Sin resultados para el filtro." : "Sin monitoreos registrados. Usa \"Nuevo monitoreo\" para comenzar."}</div>
        )}
      </div>

      {/* ── Vista escritorio: tabla ── */}
      <div className="hidden md:block">
        <WideTableScroll>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800">
            {["Agente", "Área monitoreada", "Fecha", "Laboratorio", "Resultado", "Límite", "¿Supera?", "Próx. Monitoreo", ""].map(h => (
              <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
            {!loading && filtered.map(r => (
              <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3 text-gray-300 text-xs font-medium">{r.tipo_agente}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{r.area_monitoreada}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.fecha_monitoreo}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{r.empresa_laboratorio || "—"}</td>
                <td className="px-4 py-3">
                  {r.resultado_valor != null ? (
                    <span className={`font-mono font-bold text-xs ${r.supera_limite ? "text-red-400" : "text-emerald-400"}`}>{r.resultado_valor} <span className="font-normal text-gray-600">{r.unidad}</span></span>
                  ) : <span className="text-gray-600">—</span>}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.limite_permisible != null ? `${r.limite_permisible} ${r.unidad || ""}` : "—"}</td>
                <td className="px-4 py-3">{r.supera_limite ? <Badge color="red">⚠ SÍ</Badge> : <Badge color="green">✓ No</Badge>}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.proxima_fecha || "—"}</td>
                <td className="px-4 py-3"><div className="flex gap-1">
                  <button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button>
                  {puedeEliminar() && (
                    <button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                  )}
                </div></td>
              </tr>
            ))}
            {!loading && !filtered.length && (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-600 text-sm">{records.length ? "Sin resultados para el filtro." : "Sin monitoreos registrados. Usa \"Nuevo monitoreo\" para comenzar."}</td></tr>
            )}
          </tbody>
        </table>
        </WideTableScroll>
      </div>

      {showModal && (
        <Modal title={editing ? "Editar monitoreo" : "Registrar monitoreo"} onClose={closeModal} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Tipo de agente *">
                <Select value={form.tipo_agente} onChange={e => {
                  const t = e.target.value;
                  setForm(f => ({ ...f, tipo_agente: t, unidad: UNIDADES_AGENTE[t] || f.unidad, limite_permisible: LIMITES_AGENTE[t] != null ? String(LIMITES_AGENTE[t]) : f.limite_permisible }));
                }}>
                  <option value="">Seleccionar agente...</option>
                  {TIPOS_AGENTE.map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Área monitoreada *"><Input value={form.area_monitoreada} onChange={e => setForm(f => ({ ...f, area_monitoreada: e.target.value }))} placeholder="Ej: Planta de chancado, Almacén 2, Sala de compresores..." /></FormField>
              <FormField label="Fecha de monitoreo *"><Input type="date" value={form.fecha_monitoreo} onChange={e => setForm(f => ({ ...f, fecha_monitoreo: e.target.value }))} /></FormField>
              <FormField label="Empresa / Laboratorio"><Input value={form.empresa_laboratorio} onChange={e => setForm(f => ({ ...f, empresa_laboratorio: e.target.value }))} placeholder="Nombre del laboratorio acreditado..." /></FormField>
              <FormField label="Resultado medido">
                <div className="flex gap-2">
                  <Input type="number" step="0.001" value={form.resultado_valor} onChange={e => setForm(f => ({ ...f, resultado_valor: e.target.value }))} placeholder="Valor numérico" className="flex-1" />
                  <Input value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))} placeholder="Unidad" className="w-24" />
                </div>
              </FormField>
              <FormField label="Límite permisible"><Input type="number" step="0.001" value={form.limite_permisible} onChange={e => setForm(f => ({ ...f, limite_permisible: e.target.value }))} placeholder="Según normativa" /></FormField>
              <FormField label="Próximo monitoreo"><Input type="date" value={form.proxima_fecha} onChange={e => setForm(f => ({ ...f, proxima_fecha: e.target.value }))} /></FormField>
              <FormField label="¿Supera límite permisible?">
                <div className="flex items-center gap-3 py-2">
                  {form.resultado_valor && form.limite_permisible ? (
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${parseFloat(form.resultado_valor) > parseFloat(form.limite_permisible) ? "bg-red-900/40 text-red-400" : "bg-emerald-900/40 text-emerald-400"}`}>
                      {parseFloat(form.resultado_valor) > parseFloat(form.limite_permisible) ? "⚠ SÍ supera el límite" : "✓ Dentro del límite"}
                    </span>
                  ) : (
                    <label className="flex items-center gap-2 text-xs text-gray-400">
                      <input type="checkbox" checked={form.supera_limite} onChange={e => setForm(f => ({ ...f, supera_limite: e.target.checked }))} className="w-4 h-4 accent-red-500" />
                      Marcar manualmente
                    </label>
                  )}
                </div>
              </FormField>
            </div>
            <FormField label="Observaciones / Hallazgos"><Input value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} placeholder="Descripción de condiciones, puntos de medición, método utilizado..." /></FormField>
            <FormField label="Medidas correctivas / Control implementado"><Input value={form.medidas_correctivas} onChange={e => setForm(f => ({ ...f, medidas_correctivas: e.target.value }))} placeholder="Ej: Se instaló silenciador, uso obligatorio de protector auditivo..." /></FormField>
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
