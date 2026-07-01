import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { calcularEdad, calcularVigencia } from '../../lib/helpers.js';
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
  Filter, HelpCircle, Lock, Shield, ClipboardList, ShieldAlert, Info,
  Activity, FileText, Users, LayoutDashboard, Stethoscope, Search,
  ChevronRight, ChevronLeft, Phone, Eye, EyeOff, X, Copy, FileDown,
  Building2, Settings
} from 'lucide-react';
import { WideTableScroll } from '../../components/ui/WideTableScroll.jsx';

export default function RacsModulo({ empresaId, empresa }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [fSistema, setFSistema] = useState("");
  const [fNivel, setFNivel] = useState("");
  const [fEstado, setFEstado] = useState("");
  const [mgmt, setMgmt] = useState({ estado:"Abierto", responsable:"", fecha_limite:"", medida_correctiva:"" });
  const [rfOtroCategoria, setRfOtroCategoria] = useState("");
  const [rfDetalleOtroTexto, setRfDetalleOtroTexto] = useState("");
  const racBlank = { sistema:"SST", naturaleza:"Acto", ubicacion:"", nombre_reportante:"", detalle_especifico:"", categorizacion:[], nivel_riesgo:"Medio", descripcion:"", accion_inmediata:"" };
  const [racForm, setRacForm] = useState(racBlank);
  const rfToggleCat = (c) => setRacForm(p => ({ ...p, categorizacion: p.categorizacion.includes(c) ? p.categorizacion.filter(x=>x!==c) : [...p.categorizacion, c] }));
  const esComindustria = empresa?.nombre?.toLowerCase().includes("comindustria") || false;

  const racUrl = `${window.location.origin}${window.location.pathname}?rac=${empresaId}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(racUrl)}&size=220x220&margin=10`;

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("racs").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false });
    setRecords(data || []); setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const openMgmt = (r) => {
    setSelected(r);
    setMgmt({ estado: r.estado||"Abierto", responsable: r.responsable||"", fecha_limite: r.fecha_limite||"", medida_correctiva: r.medida_correctiva||"" });
    setShowModal(true);
  };

  const saveMgmt = async () => {
    setSaving(true);
    const { error } = await supabase.from("racs").update({ estado: mgmt.estado, responsable: mgmt.responsable, fecha_limite: mgmt.fecha_limite||null, medida_correctiva: mgmt.medida_correctiva, fecha_cierre: mgmt.estado==="Cerrado" ? new Date().toISOString().split("T")[0] : null }).eq("id", selected.id);
    if (error) { showToast("Error al actualizar: " + error.message, "error"); } else { showToast("RAC actualizado", "success"); setShowModal(false); load(); }
    setSaving(false);
  };

  const saveNewRac = async () => {
    if (!racForm.ubicacion.trim() || !racForm.descripcion.trim()) { showToast("Ubicación y descripción son obligatorios", "error"); return; }
    setCreating(true);
    const { error } = await supabase.from("racs").insert({
      empresa_id: empresaId,
      sistema: racForm.sistema,
      naturaleza: racForm.naturaleza,
      ubicacion: racForm.ubicacion,
      nombre_reportante: racForm.nombre_reportante || null,
      detalle_especifico: racForm.detalle_especifico || null,
      categorizacion: racForm.categorizacion,
      nivel_riesgo: racForm.nivel_riesgo,
      tipo_reporte: `${racForm.sistema} - ${racForm.naturaleza}`,
      descripcion: racForm.descripcion,
      accion_inmediata: racForm.accion_inmediata || null,
      estado: "Abierto",
    });
    if (error) { showToast("Error al crear RAC: " + error.message, "error"); }
    else { showToast("RAC creado correctamente", "success"); setShowCreate(false); setRacForm(racBlank); load(); }
    setCreating(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este RAC? Esta acción no se puede deshacer.")) return;
    const { error, count } = await supabase.from("racs").delete({ count: "exact" }).eq("id", id).eq("empresa_id", empresaId);
    if (error) { showToast("Error al eliminar: " + error.message, "error"); return; }
    if (count === 0) { showToast("No se pudo eliminar. Verifica permisos en Supabase (política DELETE)", "error"); return; }
    showToast("RAC eliminado", "info");
    setShowModal(false);
    setSelected(null);
    load();
  };

  const anio = new Date().getFullYear(); const mes = new Date().getMonth();
  const delMes = records.filter(r => { const d=new Date(r.created_at); return d.getFullYear()===anio&&d.getMonth()===mes; });
  const abiertos = records.filter(r => r.estado==="Abierto");
  const cerrados = records.filter(r => r.estado==="Cerrado");
  const pct = records.length ? Math.round(cerrados.length/records.length*100) : 0;

  const filtered = records.filter(r => (!fSistema||r.sistema===fSistema)&&(!fNivel||r.nivel_riesgo===fNivel)&&(!fEstado||r.estado===fEstado));
  const nivelColor = n => ({Alto:"red",Medio:"amber",Bajo:"green"}[n]||"gray");
  const estadoColor = e => ({Abierto:"red","En proceso":"amber",Cerrado:"green"}[e]||"gray");

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">RACs — Reportes de Actos y Condiciones</h3>
          <p className="text-gray-500 text-xs max-w-xl">Gestión de reportes enviados por trabajadores vía código QR. Sin login requerido para reportar.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <Btn size="sm" variant="ghost" onClick={() => setShowQR(true)}><Info size={13} /> Código QR</Btn>
          <ExportBtn data={records.map(r=>({ Fecha:r.created_at?.split("T")[0], Sistema:r.sistema, Naturaleza:r.naturaleza, Ubicación:r.ubicacion, Reportante:r.nombre_reportante||"—", Detalle:r.detalle_especifico||"—", Categorías:(r.categorizacion||[]).join(", "), "Nivel riesgo":r.nivel_riesgo, Descripción:r.descripcion, "Acción inmediata":r.accion_inmediata||"—", Estado:r.estado, Responsable:r.responsable||"—", "Fecha límite":r.fecha_limite||"—", "Medida correctiva":r.medida_correctiva||"—", "Fecha cierre":r.fecha_cierre||"—" }))} filename="racs" />
          <Btn size="sm" variant="primary" onClick={() => { setRacForm(racBlank); setShowCreate(true); }}><Plus size={13} /> Nuevo RAC</Btn>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label="RACs del mes" value={delMes.length} sub="reportes recibidos" accentColor="blue" />
        <KpiCard label="Abiertos" value={abiertos.length} sub="sin cierre" accentColor={abiertos.length>0?"red":"emerald"} />
        <KpiCard label="Cerrados" value={cerrados.length} sub="resueltos" accentColor="emerald" />
        <KpiCard label="% Cierre" value={`${pct}%`} sub="tasa de resolución" accentColor={pct>=80?"emerald":pct>=50?"amber":"red"} />
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap p-3 bg-gray-900/50 border border-gray-800 rounded-xl">
        <Filter size={12} className="text-gray-500 shrink-0" />
        <select value={fSistema} onChange={e=>setFSistema(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500"><option value="">Todo sistema</option><option>SST</option><option>M. Ambiente</option></select>
        <select value={fNivel} onChange={e=>setFNivel(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500"><option value="">Todo nivel</option><option>Alto</option><option>Medio</option><option>Bajo</option></select>
        <select value={fEstado} onChange={e=>setFEstado(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500"><option value="">Todo estado</option><option>Abierto</option><option>En proceso</option><option>Cerrado</option></select>
        {(fSistema||fNivel||fEstado) && <button onClick={()=>{setFSistema("");setFNivel("");setFEstado("");}} className="text-xs text-blue-400 hover:text-blue-300 ml-1">✕ Limpiar</button>}
      </div>

      {/* ── Vista móvil: tarjetas ── */}
      <div className="md:hidden space-y-2.5">
        {loading && <div className="text-center text-gray-600 text-sm py-8 bg-gray-900 border border-gray-800 rounded-xl">Cargando...</div>}
        {!loading && filtered.map(r=>(
          <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3.5" onClick={()=>openMgmt(r)}>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="min-w-0">
                <div className="font-semibold text-white text-sm leading-tight">{r.sistema} — {r.naturaleza}</div>
                <div className="text-xs text-gray-500 font-mono mt-0.5">{r.created_at?.split("T")[0]}</div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={e=>{e.stopPropagation();openMgmt(r);}} className="text-gray-500 hover:text-blue-400 p-1"><Pencil size={15} /></button>
                <button onClick={e=>{e.stopPropagation();handleDelete(r.id);}} className="text-red-500/60 hover:text-red-400 p-1"><Trash2 size={15} /></button>
              </div>
            </div>
            <div className="text-xs text-gray-400 mb-2">{r.ubicacion||"Sin ubicación"}</div>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              <Badge color={nivelColor(r.nivel_riesgo)}>{r.nivel_riesgo}</Badge>
              <Badge color={estadoColor(r.estado)}>{r.estado}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 text-xs border-t border-gray-800 pt-2.5">
              <div className="truncate"><span className="text-gray-600">Reportante:</span> <span className="text-gray-400">{r.nombre_reportante||"Anónimo"}</span></div>
            </div>
          </div>
        ))}
        {!loading && !filtered.length && (
          <div className="text-center text-gray-600 text-sm py-8 bg-gray-900 border border-gray-800 rounded-xl">{records.length?"Sin resultados para el filtro.":"Aún no hay RACs. Comparte el código QR con tus trabajadores para que reporten."}</div>
        )}
      </div>

      {/* ── Vista escritorio: tabla ── */}
      <div className="hidden md:block">
        <WideTableScroll maxH="max-h-[calc(100vh-200px)]">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800">
            {["Fecha","Sistema","Naturaleza","Ubicación","Reportante","Nivel","Estado",""].map(h=>(
              <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
            {!loading && filtered.map(r=>(
              <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer" onClick={()=>openMgmt(r)}>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.created_at?.split("T")[0]}</td>
                <td className="px-4 py-3 text-xs text-gray-300">{r.sistema}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{r.naturaleza}</td>
                <td className="px-4 py-3 text-xs text-gray-400 max-w-[8rem] truncate">{r.ubicacion||"—"}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{r.nombre_reportante||"Anónimo"}</td>
                <td className="px-4 py-3"><Badge color={nivelColor(r.nivel_riesgo)}>{r.nivel_riesgo}</Badge></td>
                <td className="px-4 py-3"><Badge color={estadoColor(r.estado)}>{r.estado}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Pencil size={13} className="text-gray-500 hover:text-blue-400" />
                    <button onClick={e => { e.stopPropagation(); handleDelete(r.id); }} className="text-red-500/40 hover:text-red-400 transition-colors" title="Eliminar"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && !filtered.length && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-600 text-sm">{records.length?"Sin resultados para el filtro.":"Aún no hay RACs. Comparte el código QR con tus trabajadores para que reporten."}</td></tr>
            )}
          </tbody>
        </table>
        </WideTableScroll>
      </div>

      {/* Modal crear RAC */}
      {showCreate && (
        <Modal title="Nuevo RAC" onClose={()=>setShowCreate(false)} wide>
          <div className="space-y-4">
            {/* Sistema + Naturaleza */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Sistema">
                <Select value={racForm.sistema} onChange={e=>setRacForm(p=>({...p,sistema:e.target.value,detalle_especifico:""}))}>
                  <option>SST</option><option>M. Ambiente</option>
                </Select>
              </FormField>
              <FormField label="Naturaleza">
                <Select value={racForm.naturaleza} onChange={e=>setRacForm(p=>({...p,naturaleza:e.target.value,detalle_especifico:""}))}>
                  <option>Acto</option><option>Condición</option>
                </Select>
              </FormField>
            </div>
            <FormField label="Ubicación *">
              <Input value={racForm.ubicacion} onChange={e=>setRacForm(p=>({...p,ubicacion:e.target.value}))} placeholder="¿Dónde ocurrió el acto o condición?" />
            </FormField>
            <FormField label="Nombre del reportante (opcional)">
              <Input value={racForm.nombre_reportante} onChange={e=>setRacForm(p=>({...p,nombre_reportante:e.target.value}))} placeholder="Nombre completo" />
            </FormField>
            {(DETALLES_ESPECIFICOS[`${racForm.sistema}-${racForm.naturaleza}`]||[]).length > 0 && (
              <FormField label="Detalle específico">
                <Select value={racForm.detalle_especifico} onChange={e=>setRacForm(p=>({...p,detalle_especifico:e.target.value}))}>
                  <option value="">Seleccionar...</option>
                  {(DETALLES_ESPECIFICOS[`${racForm.sistema}-${racForm.naturaleza}`]||[]).map(d=><option key={d}>{d}</option>)}
                </Select>
              </FormField>
            )}
            <FormField label="Nivel de riesgo">
              <Select value={racForm.nivel_riesgo} onChange={e=>setRacForm(p=>({...p,nivel_riesgo:e.target.value}))}>
                <option>Alto</option><option>Medio</option><option>Bajo</option>
              </Select>
            </FormField>
            <FormField label="Categorización del riesgo">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
                {CATEGORIAS_RIESGO.map(cat=>(
                  <button key={cat} type="button" onClick={()=>rfToggleCat(cat)}
                    className={`text-left px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${racForm.categorizacion.includes(cat) ? "bg-blue-900/40 border-blue-600 text-blue-300" : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </FormField>
            <FormField label="Descripción del hallazgo *">
              <textarea value={racForm.descripcion} onChange={e=>setRacForm(p=>({...p,descripcion:e.target.value}))}
                rows={3} placeholder="Describe el acto o condición observada..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none" />
            </FormField>
            <FormField label="Acción inmediata tomada (opcional)">
              <Input value={racForm.accion_inmediata} onChange={e=>setRacForm(p=>({...p,accion_inmediata:e.target.value}))} placeholder="Medida correctiva inmediata" />
            </FormField>
            <div className="flex gap-2 pt-2">
              <Btn variant="ghost" onClick={()=>setShowCreate(false)} className="flex-1 justify-center">Cancelar</Btn>
              <Btn variant="primary" onClick={saveNewRac} disabled={creating} className="flex-1 justify-center">
                {creating ? "Guardando..." : "Crear RAC"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal QR */}
      {showQR && (
        <Modal title="Código QR — Formulario público RAC" onClose={()=>setShowQR(false)}>
          <div className="flex flex-col items-center gap-4 py-2">
            <p className="text-xs text-gray-500 text-center">Imprime o muestra este QR en campo. Al escanearlo, el trabajador puede enviar un RAC sin necesidad de login.</p>
            <div className="p-3 bg-white rounded-2xl shadow-lg">
              <img src={qrSrc} alt="QR RAC" className="w-52 h-52" />
            </div>
            <div className="w-full bg-gray-800 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-600 mb-1.5">URL directa:</p>
              <p className="text-xs text-blue-400 break-all font-mono leading-relaxed">{racUrl}</p>
            </div>
            <Btn variant="ghost" onClick={()=>navigator.clipboard?.writeText(racUrl).then(()=>showToast("URL copiada","success"))}>Copiar URL</Btn>
          </div>
        </Modal>
      )}

      {/* Modal gestión */}
      {showModal && selected && (
        <Modal title={`RAC — ${selected.naturaleza} ${selected.sistema}`} onClose={()=>setShowModal(false)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
              <div><p className="text-xs text-gray-600 mb-1">Sistema / Naturaleza</p><p className="text-sm text-white">{selected.sistema} — {selected.naturaleza}</p></div>
              <div><p className="text-xs text-gray-600 mb-1">Nivel de riesgo</p><Badge color={nivelColor(selected.nivel_riesgo)}>{selected.nivel_riesgo}</Badge></div>
              <div><p className="text-xs text-gray-600 mb-1">Ubicación</p><p className="text-sm text-gray-300">{selected.ubicacion||"—"}</p></div>
              <div><p className="text-xs text-gray-600 mb-1">Reportante</p><p className="text-sm text-gray-300">{selected.nombre_reportante||"Anónimo"}</p></div>
              {selected.detalle_especifico && <div><p className="text-xs text-gray-600 mb-1">Detalle</p><p className="text-sm text-gray-300">{selected.detalle_especifico}</p></div>}
              <div className="col-span-2"><p className="text-xs text-gray-600 mb-1">Descripción</p><p className="text-sm text-gray-300 leading-relaxed">{selected.descripcion}</p></div>
              {selected.accion_inmediata && <div className="col-span-2"><p className="text-xs text-gray-600 mb-1">Acción inmediata</p><p className="text-sm text-gray-300">{selected.accion_inmediata}</p></div>}
              {selected.categorizacion?.length>0 && <div className="col-span-2"><p className="text-xs text-gray-600 mb-2">Categorías de riesgo</p><div className="flex flex-wrap gap-1">{selected.categorizacion.map(c=><Badge key={c} color="blue">{c}</Badge>)}</div></div>}
              {(selected.foto_url_1||selected.foto_url_2) && <div className="col-span-2"><p className="text-xs text-gray-600 mb-2">Evidencia fotográfica</p><div className="flex gap-2">{[selected.foto_url_1,selected.foto_url_2].filter(Boolean).map((url,i)=><a key={i} href={url} target="_blank" rel="noreferrer"><img src={url} alt="" className="w-24 h-24 object-cover rounded-xl border border-gray-700 hover:border-blue-500 transition-colors" /></a>)}</div></div>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Estado">
                <Select value={mgmt.estado} onChange={e=>setMgmt(m=>({...m,estado:e.target.value}))}>
                  {["Abierto","En proceso","Cerrado"].map(e=><option key={e}>{e}</option>)}
                </Select>
              </FormField>
              <FormField label="Responsable de cierre">
                <Input value={mgmt.responsable} onChange={e=>setMgmt(m=>({...m,responsable:e.target.value}))} placeholder="Nombre del responsable" />
              </FormField>
              <FormField label="Fecha límite">
                <Input type="date" value={mgmt.fecha_limite} onChange={e=>setMgmt(m=>({...m,fecha_limite:e.target.value}))} />
              </FormField>
            </div>
            <FormField label="Medida correctiva implementada">
              <Input value={mgmt.medida_correctiva} onChange={e=>setMgmt(m=>({...m,medida_correctiva:e.target.value}))} placeholder="Descripción de la acción correctiva tomada..." />
            </FormField>
            <div className="flex justify-between gap-2 pt-2">
              <button onClick={() => handleDelete(selected.id)}
                className="py-2 px-3 bg-red-900/30 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5">
                <Trash2 size={13} /> Eliminar
              </button>
              <div className="flex gap-2">
                <Btn variant="ghost" onClick={()=>setShowModal(false)}>Cancelar</Btn>
                <Btn variant="primary" onClick={saveMgmt} disabled={saving}>{saving?"Guardando...":"Actualizar RAC"}</Btn>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
