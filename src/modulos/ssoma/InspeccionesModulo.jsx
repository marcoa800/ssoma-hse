import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { calcularEdad, calcularVigencia, fmtFecha} from '../../lib/helpers.js';
import { TRIAJE_CATS, CATEGORIAS_RIESGO, DETALLES_ESPECIFICOS, NIVEL_RIESGO_DESC } from '../../constants/triaje.js';
import { Badge } from '../../components/ui/Badge.jsx';
import { KpiCard } from '../../components/ui/KpiCard.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Btn } from '../../components/ui/Btn.jsx';
import { ExportBtn } from '../../components/ui/ExportBtn.jsx';
import { FilterBar } from '../../components/ui/FilterBar.jsx';
import {
  Plus, Upload, Download, Trash2, Pencil, AlertTriangle, CheckCircle,
  Filter, HelpCircle, Lock, Shield, ClipboardList, ShieldAlert,
  Activity, FileText, Users, LayoutDashboard, Stethoscope, Search,
  ChevronRight, ChevronLeft, Phone, Eye, EyeOff, X, Copy, FileDown,
  Building2, Settings
} from 'lucide-react';

import InspeccionesHGP from './InspeccionesHGP.jsx';
import InspeccionesComind from './InspeccionesComind.jsx';

const TIPOS_INSPECCION = ["Planeada","No planeada","Gerencial","Orden y limpieza","Equipos y herramientas","Instalaciones eléctricas","EPPs","Otro"];
const RESULTADO_COLOR = { Satisfactorio:"green", "Con observaciones":"amber", Insatisfactorio:"red" };

export default function InspeccionesModulo({ empresaId, empresa }) {
  // Hydro Global usa el motor de inspecciones basado en formatos oficiales (FR-0XX)
  const esHydroGlobal = empresa?.nombre?.toLowerCase().includes("hydro") || false;
  const esComindustria = empresa?.nombre?.toLowerCase().includes("comindustria") || false;
  if (esHydroGlobal) return <InspeccionesHGP empresaId={empresaId} />;
  if (esComindustria) return <InspeccionesComind empresaId={empresaId} />;

  return <InspeccionesGenerico empresaId={empresaId} />;
}

function InspeccionesGenerico({ empresaId }) {
  const [inspecciones, setInspecciones] = useState([]);
  const [hallazgos, setHallazgos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingInsp, setEditingInsp] = useState(null);
  const [selectedInsp, setSelectedInsp] = useState(null);
  const [editingHall, setEditingHall] = useState(null);
  const [showHallModal, setShowHallModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fTipo, setFTipo] = useState("");
  const [fResult, setFResult] = useState("");

  const initInsp = { tipo:"Planeada", area:"", inspector:"", fecha:new Date().toISOString().split("T")[0], resultado:"Con observaciones", observaciones:"" };
  const initHall = { descripcion:"", tipo:"Condición subestándar", nivel_riesgo:"Medio", accion_correctiva:"", responsable:"", fecha_limite:"", estado:"Abierto" };
  const [formInsp, setFormInsp] = useState(initInsp);
  const [formHall, setFormHall] = useState(initHall);

  const load = async () => {
    setLoading(true);
    const [{ data: insp }, { data: hall }] = await Promise.all([
      supabase.from("inspecciones").select("*").eq("empresa_id", empresaId).order("fecha", { ascending: false }),
      supabase.from("hallazgos_inspeccion").select("*").eq("empresa_id", empresaId),
    ]);
    setInspecciones(insp || []); setHallazgos(hall || []); setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  // ── Inspección CRUD ──
  const openNewInsp = () => { setEditingInsp(null); setFormInsp(initInsp); setShowFormModal(true); };
  const openEditInsp = (i) => { setEditingInsp(i.id); setFormInsp({ tipo:i.tipo, area:i.area, inspector:i.inspector||"", fecha:i.fecha, resultado:i.resultado, observaciones:i.observaciones||"" }); setShowFormModal(true); };
  const saveInsp = async () => {
    if (!formInsp.area.trim()) { showToast("El área es obligatoria", "error"); return; }
    setSaving(true);
    const payload = { empresa_id:empresaId, tipo:formInsp.tipo, area:formInsp.area, inspector:formInsp.inspector||null, fecha:formInsp.fecha, resultado:formInsp.resultado, observaciones:formInsp.observaciones||null };
    const { error } = editingInsp ? await supabase.from("inspecciones").update(payload).eq("id", editingInsp) : await supabase.from("inspecciones").insert(payload);
    if (error) showToast("Error: " + error.message, "error");
    else { showToast(editingInsp ? "Actualizado" : "Inspección registrada", "success"); setShowFormModal(false); load(); }
    setSaving(false);
  };
  const deleteInsp = async (id) => {
    if (!confirm("¿Eliminar esta inspección y todos sus hallazgos?")) return;
    await supabase.from("inspecciones").delete().eq("id", id);
    showToast("Eliminado", "info"); load();
  };

  // ── Hallazgos CRUD ──
  const openDetail = (insp) => { setSelectedInsp(insp); setShowDetailModal(true); };
  const openNewHall = () => { setEditingHall(null); setFormHall(initHall); setShowHallModal(true); };
  const openEditHall = (h) => { setEditingHall(h.id); setFormHall({ descripcion:h.descripcion, tipo:h.tipo, nivel_riesgo:h.nivel_riesgo, accion_correctiva:h.accion_correctiva||"", responsable:h.responsable||"", fecha_limite:h.fecha_limite||"", estado:h.estado }); setShowHallModal(true); };
  const saveHall = async () => {
    if (!formHall.descripcion.trim()) { showToast("La descripción es obligatoria", "error"); return; }
    setSaving(true);
    const payload = { empresa_id:empresaId, inspeccion_id:selectedInsp.id, descripcion:formHall.descripcion, tipo:formHall.tipo, nivel_riesgo:formHall.nivel_riesgo, accion_correctiva:formHall.accion_correctiva||null, responsable:formHall.responsable||null, fecha_limite:formHall.fecha_limite||null, estado:formHall.estado };
    const { error } = editingHall ? await supabase.from("hallazgos_inspeccion").update(payload).eq("id", editingHall) : await supabase.from("hallazgos_inspeccion").insert(payload);
    if (error) showToast("Error: " + error.message, "error");
    else { showToast(editingHall ? "Hallazgo actualizado" : "Hallazgo registrado", "success"); setShowHallModal(false); load(); }
    setSaving(false);
  };
  const deleteHall = async (id) => { if (!confirm("¿Eliminar este hallazgo?")) return; await supabase.from("hallazgos_inspeccion").delete().eq("id", id); load(); };

  // ── KPIs ──
  const anio = new Date().getFullYear();
  const delAnio = inspecciones.filter(i => new Date(i.fecha).getFullYear() === anio);
  const insatisfactorias = inspecciones.filter(i => i.resultado === "Insatisfactorio");
  const hallazgosAbiertos = hallazgos.filter(h => h.estado === "Abierto");
  const filtered = inspecciones.filter(i => (!fTipo || i.tipo === fTipo) && (!fResult || i.resultado === fResult));

  const hallazgosDe = (insp) => hallazgos.filter(h => h.inspeccion_id === insp.id);
  const nivelColor = n => ({ Alto:"red", Medio:"amber", Bajo:"green" }[n] || "gray");
  const estadoColor = e => ({ Abierto:"red", "En proceso":"amber", Cerrado:"green" }[e] || "gray");

  const selectedHallazgos = selectedInsp ? hallazgosDe(selectedInsp) : [];

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Inspecciones de Seguridad</h3>
          <p className="text-gray-500 text-xs max-w-xl">Registro de inspecciones planeadas y no planeadas. Gestión de hallazgos con seguimiento de cierre. (Ley 29783)</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <ExportBtn data={inspecciones.map(i => { const hs = hallazgosDe(i); return { Tipo:i.tipo, Área:i.area, Inspector:i.inspector||"—", Fecha:i.fecha, Resultado:i.resultado, "Total hallazgos":hs.length, "Hallazgos cerrados":hs.filter(h=>h.estado==="Cerrado").length, Observaciones:i.observaciones||"—" }; })} filename="inspecciones" />
          <Btn size="sm" variant="primary" onClick={openNewInsp}><Plus size={13} /> Nueva inspección</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label={`Inspecciones ${anio}`} value={delAnio.length} sub="realizadas este año" accentColor="blue" />
        <KpiCard label="Insatisfactorias" value={insatisfactorias.length} sub="requieren atención" accentColor={insatisfactorias.length > 0 ? "red" : "emerald"} />
        <KpiCard label="Hallazgos abiertos" value={hallazgosAbiertos.length} sub="pendientes de cierre" accentColor={hallazgosAbiertos.length > 0 ? "amber" : "emerald"} />
        <KpiCard label="Total hallazgos" value={hallazgos.length} sub={`${hallazgos.filter(h=>h.estado==="Cerrado").length} cerrados`} accentColor="purple" />
      </div>

      {insatisfactorias.length > 0 && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-3 mb-4 flex items-start gap-3">
          <AlertTriangle size={15} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-400 text-xs font-semibold">{insatisfactorias.length} inspección(es) con resultado Insatisfactorio: {insatisfactorias.map(i => i.area).join(" · ")}</p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-4 flex-wrap p-3 bg-gray-900/50 border border-gray-800 rounded-xl">
        <Filter size={12} className="text-gray-500 shrink-0" />
        <select value={fTipo} onChange={e=>setFTipo(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500">
          <option value="">Todo tipo</option>{TIPOS_INSPECCION.map(t=><option key={t}>{t}</option>)}
        </select>
        <select value={fResult} onChange={e=>setFResult(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500">
          <option value="">Todo resultado</option><option>Satisfactorio</option><option>Con observaciones</option><option>Insatisfactorio</option>
        </select>
        {(fTipo||fResult) && <button onClick={()=>{setFTipo("");setFResult("");}} className="text-xs text-blue-400 hover:text-blue-300 ml-1">✕ Limpiar</button>}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800">
            {["Fecha","Tipo","Área","Inspector","Resultado","Hallazgos",""].map(h=>(
              <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
            {!loading && filtered.map(i => {
              const hs = hallazgosDe(i); const abiertos = hs.filter(h=>h.estado!=="Cerrado").length;
              return (
                <tr key={i.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{fmtFecha(i.fecha)}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{i.tipo}</td>
                  <td className="px-4 py-3 text-xs text-gray-200 font-medium">{i.area}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{i.inspector||"—"}</td>
                  <td className="px-4 py-3"><Badge color={RESULTADO_COLOR[i.resultado]||"gray"}>{i.resultado}</Badge></td>
                  <td className="px-4 py-3">
                    <button onClick={()=>openDetail(i)} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                      <span className={`font-bold ${abiertos>0?"text-amber-400":"text-gray-500"}`}>{hs.length}</span>
                      <span className="text-gray-600">hallazgos</span>
                      {abiertos>0 && <span className="text-amber-500">({abiertos} abiertos)</span>}
                    </button>
                  </td>
                  <td className="px-4 py-3"><div className="flex gap-1">
                    <button onClick={()=>openDetail(i)} className="text-gray-500 hover:text-emerald-400 transition-colors" title="Ver hallazgos"><Eye size={13} /></button>
                    <button onClick={()=>openEditInsp(i)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button>
                    <button onClick={()=>deleteInsp(i.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                  </div></td>
                </tr>
              );
            })}
            {!loading && !filtered.length && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-600 text-sm">{inspecciones.length?"Sin resultados para el filtro.":"Sin inspecciones. Usa \"Nueva inspección\" para comenzar."}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal — Formulario inspección */}
      {showFormModal && (
        <Modal title={editingInsp ? "Editar inspección" : "Nueva inspección"} onClose={()=>setShowFormModal(false)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Tipo de inspección">
                <Select value={formInsp.tipo} onChange={e=>setFormInsp(f=>({...f,tipo:e.target.value}))}>
                  {TIPOS_INSPECCION.map(t=><option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Área / Zona inspeccionada *"><Input value={formInsp.area} onChange={e=>setFormInsp(f=>({...f,area:e.target.value}))} placeholder="Ej: Almacén, Taller mecánico, Sala de compresores..." /></FormField>
              <FormField label="Inspector / Responsable"><Input value={formInsp.inspector} onChange={e=>setFormInsp(f=>({...f,inspector:e.target.value}))} placeholder="Nombre del inspector" /></FormField>
              <FormField label="Fecha de inspección"><Input type="date" value={formInsp.fecha} onChange={e=>setFormInsp(f=>({...f,fecha:e.target.value}))} /></FormField>
              <FormField label="Resultado general" className="col-span-2">
                <Select value={formInsp.resultado} onChange={e=>setFormInsp(f=>({...f,resultado:e.target.value}))}>
                  <option>Satisfactorio</option><option>Con observaciones</option><option>Insatisfactorio</option>
                </Select>
              </FormField>
            </div>
            <FormField label="Observaciones generales"><Input value={formInsp.observaciones} onChange={e=>setFormInsp(f=>({...f,observaciones:e.target.value}))} placeholder="Resumen de la inspección, condiciones generales observadas..." /></FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={()=>setShowFormModal(false)}>Cancelar</Btn>
              <Btn variant="primary" onClick={saveInsp} disabled={saving}>{saving?"Guardando...":editingInsp?"Actualizar":"Registrar inspección"}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal — Detalle + hallazgos */}
      {showDetailModal && selectedInsp && (
        <Modal title={`Hallazgos — ${selectedInsp.area} (${fmtFecha(selectedInsp.fecha)})`} onClose={()=>setShowDetailModal(false)} wide>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge color={RESULTADO_COLOR[selectedInsp.resultado]||"gray"}>{selectedInsp.resultado}</Badge>
                <span className="text-xs text-gray-500">{selectedInsp.tipo} · {selectedInsp.inspector||"Sin inspector"}</span>
              </div>
              <Btn size="sm" variant="primary" onClick={openNewHall}><Plus size={13} /> Añadir hallazgo</Btn>
            </div>
            {selectedInsp.observaciones && <p className="text-xs text-gray-500 bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700">{selectedInsp.observaciones}</p>}

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {selectedHallazgos.length === 0 && <p className="text-center text-gray-600 text-sm py-8">Sin hallazgos registrados. Usa "Añadir hallazgo".</p>}
              {selectedHallazgos.map(h => (
                <div key={h.id} className={`p-3 rounded-xl border ${h.estado==="Cerrado" ? "bg-gray-800/30 border-gray-800" : h.nivel_riesgo==="Alto" ? "bg-red-900/10 border-red-900/30" : "bg-gray-800/50 border-gray-700"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge color={nivelColor(h.nivel_riesgo)}>{h.nivel_riesgo}</Badge>
                        <Badge color={estadoColor(h.estado)}>{h.estado}</Badge>
                        <span className="text-xs text-gray-600">{h.tipo}</span>
                      </div>
                      <p className="text-sm text-gray-300 leading-snug">{h.descripcion}</p>
                      {h.accion_correctiva && <p className="text-xs text-gray-500 mt-1">→ {h.accion_correctiva}</p>}
                      {(h.responsable || h.fecha_limite) && (
                        <p className="text-xs text-gray-600 mt-1">{h.responsable && `Responsable: ${h.responsable}`}{h.responsable && h.fecha_limite && " · "}{h.fecha_limite && `Límite: ${h.fecha_limite}`}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={()=>openEditHall(h)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={12} /></button>
                      <button onClick={()=>deleteHall(h.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal — Formulario hallazgo */}
      {showHallModal && (
        <Modal title={editingHall ? "Editar hallazgo" : "Nuevo hallazgo"} onClose={()=>setShowHallModal(false)}>
          <div className="space-y-3">
            <FormField label="Descripción del hallazgo *"><Input value={formHall.descripcion} onChange={e=>setFormHall(f=>({...f,descripcion:e.target.value}))} placeholder="Describe el acto o condición observada..." /></FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Tipo">
                <Select value={formHall.tipo} onChange={e=>setFormHall(f=>({...f,tipo:e.target.value}))}>
                  <option>Condición subestándar</option><option>Acto subestándar</option><option>Observación positiva</option>
                </Select>
              </FormField>
              <FormField label="Nivel de riesgo">
                <Select value={formHall.nivel_riesgo} onChange={e=>setFormHall(f=>({...f,nivel_riesgo:e.target.value}))}>
                  <option>Alto</option><option>Medio</option><option>Bajo</option>
                </Select>
              </FormField>
              <FormField label="Estado">
                <Select value={formHall.estado} onChange={e=>setFormHall(f=>({...f,estado:e.target.value}))}>
                  <option>Abierto</option><option>En proceso</option><option>Cerrado</option>
                </Select>
              </FormField>
              <FormField label="Fecha límite de cierre"><Input type="date" value={formHall.fecha_limite} onChange={e=>setFormHall(f=>({...f,fecha_limite:e.target.value}))} /></FormField>
            </div>
            <FormField label="Acción correctiva"><Input value={formHall.accion_correctiva} onChange={e=>setFormHall(f=>({...f,accion_correctiva:e.target.value}))} placeholder="¿Qué se debe hacer para corregirlo?" /></FormField>
            <FormField label="Responsable de cierre"><Input value={formHall.responsable} onChange={e=>setFormHall(f=>({...f,responsable:e.target.value}))} placeholder="Nombre del responsable" /></FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={()=>setShowHallModal(false)}>Cancelar</Btn>
              <Btn variant="primary" onClick={saveHall} disabled={saving}>{saving?"Guardando...":editingHall?"Actualizar":"Añadir hallazgo"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
