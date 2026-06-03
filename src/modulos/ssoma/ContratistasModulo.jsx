import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { calcularEdad, calcularVigencia, fmtFecha} from '../../lib/helpers.js';
import { TRIAJE_CATS, CATEGORIAS_RIESGO, DETALLES_ESPECIFICOS } from '../../constants/triaje.js';
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
  ChevronRight, ChevronLeft, Phone, QrCode, Eye, EyeOff, X, Copy, FileDown,
  Building2, Settings
} from 'lucide-react';

export default function ContratistasModulo({ empresaId }) {
  const [contratistas, setContratistas] = useState([]);
  const [personal, setPersonal]         = useState([]);
  const [trabajos, setTrabajos]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState(null);
  const [activeTab, setActiveTab]       = useState("docs");
  const [search, setSearch]             = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [showModalC, setShowModalC]     = useState(false);
  const [editingC, setEditingC]         = useState(null);
  const [showModalP, setShowModalP]     = useState(false);
  const [editingP, setEditingP]         = useState(null);
  const [showModalT, setShowModalT]     = useState(false);
  const [editingT, setEditingT]         = useState(null);
  const [saving, setSaving]             = useState(false);

  const initC = { nombre:"", ruc:"", rubro:"", representante:"", telefono:"", email:"", estado:"Activo", sctr_empresa_venc:"", poliza_rc_venc:"", poliza_vida_venc:"", plan_sst_venc:"", iper_venc:"", observaciones:"" };
  const initP = {
    // Datos personales
    nombre:"", dni:"", fecha_nacimiento:"", genero:"M",
    cargo:"", empresa_subcontratista:"",
    fecha_ingreso_proyecto:"", frente_trabajo:"",
    perfil:"Operativo que no maneja",
    estado:"Activo",
    // Evaluación médica
    tipo_emo:"Preocupacional", fecha_emo:"", clinica_ocupacional:"",
    aptitud_medica:"Apto", restriccion_medica:"",
    fecha_constancia_lectura:"",
    sctr_venc:"", emo_venc:"",
    // Aptitudes y roles
    apto_altura:"No aplica", apto_espacio_confinado:"No aplica",
    conduce_vehiculos:false, es_brigadista:false, grupo_riesgo_covid:false,
    // Inducción y EPP
    induccion_fecha:"", epp_entregado:false, epp_fecha:"", epp_detalle:"",
  };
  const initT = { descripcion:"", area:"", fecha_inicio:"", fecha_fin:"", estado:"Programado", nivel_riesgo:"Medio", responsable_obra:"", personal_asignado:[], observaciones:"" };
  const [formC, setFormC] = useState(initC);
  const [formP, setFormP] = useState(initP);
  const [formT, setFormT] = useState(initT);

  const load = async () => {
    setLoading(true);
    const [{ data: cs }, { data: ps }, { data: ts }] = await Promise.all([
      supabase.from("contratistas").select("*").eq("empresa_id", empresaId).order("nombre"),
      supabase.from("contratista_personal").select("*").eq("empresa_id", empresaId).order("nombre"),
      supabase.from("contratista_trabajos").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false }),
    ]);
    setContratistas(cs || []); setPersonal(ps || []); setTrabajos(ts || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  // ── Helpers de cumplimiento ──
  const docDays = (f) => !f ? null : Math.floor((new Date(f) - new Date()) / 86400000);
  const docStatus = (f) => {
    const d = docDays(f);
    if (d === null) return "sin_fecha";
    if (d < 0) return "vencido";
    if (d <= 30) return "por_vencer";
    return "vigente";
  };
  const statusCls = { vencido:"bg-red-900/30 border-red-800 text-red-400", por_vencer:"bg-amber-900/30 border-amber-800 text-amber-400", vigente:"bg-green-900/30 border-green-800 text-green-400", sin_fecha:"bg-gray-800 border-gray-700 text-gray-600" };
  const dotCls = { vencido:"bg-red-500", por_vencer:"bg-amber-400", vigente:"bg-green-500", sin_fecha:"bg-gray-600" };

  const compliance = (docs) => {
    const withDate = docs.filter(Boolean);
    if (!withDate.length) return "sin_fecha";
    const sts = withDate.map(docStatus);
    if (sts.includes("vencido")) return "vencido";
    if (sts.includes("por_vencer")) return "por_vencer";
    return "vigente";
  };
  const contratistaComp = (c) => compliance([c.sctr_empresa_venc, c.poliza_rc_venc, c.poliza_vida_venc, c.plan_sst_venc, c.iper_venc]);
  const personalComp = (p) => {
    if (p.aptitud_medica === "No apto") return "vencido";
    const docComp = compliance([p.sctr_venc, p.emo_venc]);
    if (docComp === "vencido") return "vencido";
    if (!p.induccion_fecha || !p.epp_entregado || !p.fecha_emo) return "por_vencer";
    if (docComp === "por_vencer" || p.aptitud_medica === "Apto con restricciones") return "por_vencer";
    return "vigente";
  };
  const calcEdad = (fn) => fn ? Math.floor((new Date() - new Date(fn)) / (365.25 * 86400000)) : null;

  // ── CRUD ──
  const cleanDates = (obj, keys) => { keys.forEach(k => { if (!obj[k]) obj[k] = null; }); return obj; };

  const saveContratista = async () => {
    if (!formC.nombre.trim()) { showToast("El nombre es obligatorio", "error"); return; }
    setSaving(true);
    const payload = cleanDates({ ...formC, empresa_id: empresaId }, ["sctr_empresa_venc","poliza_rc_venc","poliza_vida_venc","plan_sst_venc","iper_venc"]);
    const { error } = editingC
      ? await supabase.from("contratistas").update(payload).eq("id", editingC.id)
      : await supabase.from("contratistas").insert(payload);
    if (error) { showToast("Error: " + error.message, "error"); }
    else {
      showToast(editingC ? "Contratista actualizado" : "Contratista registrado", "success");
      setShowModalC(false);
      if (editingC && selected?.id === editingC.id) {
        const { data } = await supabase.from("contratistas").select("*").eq("id", editingC.id).single();
        if (data) setSelected(data);
      }
      load();
    }
    setSaving(false);
  };

  const deleteContratista = async (id) => {
    if (!confirm("¿Eliminar este contratista y todo su personal y trabajos asociados?")) return;
    await supabase.from("contratistas").delete().eq("id", id);
    showToast("Contratista eliminado", "info"); setSelected(null); load();
  };

  const savePersonal = async () => {
    if (!formP.nombre.trim()) { showToast("El nombre es obligatorio", "error"); return; }
    setSaving(true);
    const payload = cleanDates({ ...formP, empresa_id: empresaId, contratista_id: selected.id }, ["sctr_venc","emo_venc","induccion_fecha","epp_fecha","fecha_nacimiento","fecha_ingreso_proyecto","fecha_emo","fecha_constancia_lectura"]);
    const { error } = editingP
      ? await supabase.from("contratista_personal").update(payload).eq("id", editingP.id)
      : await supabase.from("contratista_personal").insert(payload);
    if (error) { showToast("Error: " + error.message, "error"); } else { showToast("Guardado", "success"); setShowModalP(false); load(); }
    setSaving(false);
  };

  const saveTrabajo = async () => {
    if (!formT.descripcion.trim()) { showToast("La descripción es obligatoria", "error"); return; }
    setSaving(true);
    const payload = cleanDates({ ...formT, empresa_id: empresaId, contratista_id: selected.id }, ["fecha_inicio","fecha_fin"]);
    const { error } = editingT
      ? await supabase.from("contratista_trabajos").update(payload).eq("id", editingT.id)
      : await supabase.from("contratista_trabajos").insert(payload);
    if (error) { showToast("Error: " + error.message, "error"); } else { showToast("Guardado", "success"); setShowModalT(false); load(); }
    setSaving(false);
  };

  const nivelColor = { Alto:"red", Medio:"amber", Bajo:"green" };
  const travEstColor = { Programado:"blue","En ejecución":"amber",Completado:"green",Suspendido:"red" };
  const selPersonal = selected ? personal.filter(p => p.contratista_id === selected.id) : [];
  const selTrabajos = selected ? trabajos.filter(t => t.contratista_id === selected.id) : [];

  // ── Sub-componente: chip de fecha ──
  const DateChip = ({ fecha }) => {
    const st = docStatus(fecha);
    const d  = docDays(fecha);
    const txt = st === "vencido" ? `Vencido ${Math.abs(d)}d` : st === "por_vencer" ? `${d}d` : st === "vigente" ? "Vigente" : "—";
    return <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${statusCls[st]}`}>{txt}</span>;
  };

  // ── Sub-componente: fila de documento ──
  const DocRow = ({ label, fecha }) => {
    const st = docStatus(fecha);
    const d  = docDays(fecha);
    return (
      <div className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
        <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full shrink-0 ${dotCls[st]}`} /><span className="text-sm text-gray-300">{label}</span></div>
        <div className="flex items-center gap-3">
          {fecha && <span className="text-xs text-gray-600 font-mono">{fecha}</span>}
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusCls[st]}`}>
            {st === "vencido" ? `Vencido hace ${Math.abs(d)}d` : st === "por_vencer" ? `Vence en ${d}d` : st === "vigente" ? "Vigente" : "Sin fecha"}
          </span>
        </div>
      </div>
    );
  };

  // ── Exportar ──
  const exportar = () => {
    const rows = contratistas.map(c => {
      const ps = personal.filter(p => p.contratista_id === c.id);
      const ts = trabajos.filter(t => t.contratista_id === c.id);
      return { Nombre:c.nombre, RUC:c.ruc||"", Rubro:c.rubro||"", Representante:c.representante||"", Teléfono:c.telefono||"", Email:c.email||"", Estado:c.estado, "SCTR empresa venc.":c.sctr_empresa_venc||"", "Póliza RC venc.":c.poliza_rc_venc||"", "Póliza Vida venc.":c.poliza_vida_venc||"", "Plan SST venc.":c.plan_sst_venc||"", "IPERC venc.":c.iper_venc||"", "N° personal":ps.length, "N° trabajos":ts.length, Observaciones:c.observaciones||"" };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Contratistas");
    XLSX.writeFile(wb, "contratistas.xlsx"); showToast("Exportado", "success");
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-600 text-sm">Cargando...</div>;

  // ════════════════════════════════════════
  // VISTA DETALLE — CONTRATISTA SELECCIONADO
  // ════════════════════════════════════════
  if (selected) {
    const comp = contratistaComp(selected);
    const borderComp = { vencido:"border-red-600", por_vencer:"border-amber-500", vigente:"border-green-600", sin_fecha:"border-gray-700" }[comp];
    const activos = selPersonal.filter(p => p.estado === "Activo");
    const trabActivos = selTrabajos.filter(t => t.estado === "En ejecución");

    return (
      <div>
        {/* Header */}
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-200 flex items-center gap-1 text-sm shrink-0"><ChevronLeft size={16} /> Volver</button>
            <div className={`border-l-4 pl-3 min-w-0 ${borderComp}`}>
              <h3 className="text-white font-bold text-base truncate">{selected.nombre}</h3>
              <div className="flex items-center flex-wrap gap-2 mt-0.5">
                {selected.ruc && <span className="text-xs text-gray-500 font-mono">RUC {selected.ruc}</span>}
                {selected.rubro && <span className="text-xs text-gray-600">{selected.rubro}</span>}
                <Badge color={selected.estado === "Activo" ? "green" : selected.estado === "Suspendido" ? "amber" : "red"}>{selected.estado}</Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Btn size="sm" variant="ghost" onClick={() => { const d={...initC,...selected}; ["sctr_empresa_venc","poliza_rc_venc","poliza_vida_venc","plan_sst_venc","iper_venc"].forEach(k=>{ d[k]=selected[k]||""; }); setFormC(d); setEditingC(selected); setShowModalC(true); }}><Pencil size={13}/> Editar</Btn>
            <button onClick={() => deleteContratista(selected.id)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-500/60 hover:text-red-400 border border-red-900/40 hover:border-red-800 rounded-lg transition-colors"><Trash2 size={13}/></button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <KpiCard label="Personal activo" value={activos.length} sub={`${selPersonal.length} registrados`} accentColor="blue" />
          <KpiCard label="Trabajos en ejecución" value={trabActivos.length} sub={`${selTrabajos.length} total`} accentColor="amber" />
          <KpiCard label="Docs empresa"
            value={comp === "vigente" ? "✓ Al día" : comp === "por_vencer" ? "⚠ Por vencer" : comp === "vencido" ? "✗ Vencido" : "Sin datos"}
            sub="Cumplimiento documental"
            accentColor={comp === "vigente" ? "emerald" : comp === "por_vencer" ? "amber" : comp === "vencido" ? "red" : "gray"} />
        </div>

        {/* Info de contacto */}
        {(selected.representante || selected.telefono || selected.email) && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 mb-4 flex flex-wrap gap-4 text-xs text-gray-500">
            {selected.representante && <span>👤 <span className="text-gray-300">{selected.representante}</span></span>}
            {selected.telefono && <span>📞 <span className="text-gray-300">{selected.telefono}</span></span>}
            {selected.email && <span>✉ <span className="text-gray-300">{selected.email}</span></span>}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-gray-900 border border-gray-800 rounded-xl p-1">
          {[["docs","📋 Documentación empresa"],["personal","👷 Personal"],["trabajos","🔧 Trabajos"]].map(([tab,label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${activeTab===tab ? "bg-amber-600 text-white shadow":"text-gray-500 hover:text-gray-200"}`}>{label}</button>
          ))}
        </div>

        {/* ── Tab: Documentación ── */}
        {activeTab === "docs" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Documentos de empresa contratista</p>
              <Btn size="sm" variant="ghost" onClick={() => { const d={...initC,...selected}; ["sctr_empresa_venc","poliza_rc_venc","poliza_vida_venc","plan_sst_venc","iper_venc"].forEach(k=>{ d[k]=selected[k]||""; }); setFormC(d); setEditingC(selected); setShowModalC(true); }}><Pencil size={13}/> Actualizar</Btn>
            </div>
            <DocRow label="SCTR Pensión + Salud" fecha={selected.sctr_empresa_venc} />
            <DocRow label="Póliza de Responsabilidad Civil Extracontractual" fecha={selected.poliza_rc_venc} />
            <DocRow label="Póliza de Seguro de Vida / Vida Ley" fecha={selected.poliza_vida_venc} />
            <DocRow label="IPERC específico para las actividades" fecha={selected.iper_venc} />
            <DocRow label="Plan de SST aprobado" fecha={selected.plan_sst_venc} />
            {selected.observaciones && <div className="mt-4 pt-3 border-t border-gray-800"><p className="text-xs text-gray-600 mb-1">Observaciones</p><p className="text-sm text-gray-400">{selected.observaciones}</p></div>}
          </div>
        )}

        {/* ── Tab: Personal ── */}
        {activeTab === "personal" && (
          <div>
            <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
              <p className="text-xs text-gray-500">{selPersonal.length} trabajador(es) registrado(s)</p>
              <div className="flex gap-2 flex-wrap">
                {/* Reporte Excel */}
                <Btn size="sm" variant="ghost" onClick={() => {
                  if (!selPersonal.length) { showToast("Sin personal para exportar", "info"); return; }
                  const rows = selPersonal.map(p => ({
                    "Apellidos y Nombre": p.nombre,
                    "DNI": p.dni || "",
                    "Edad": calcEdad(p.fecha_nacimiento) || "",
                    "Género (M-F)": p.genero || "",
                    "Puesto de trabajo": p.cargo || "",
                    "Empresa contratista": selected.nombre,
                    "Empresa subcontratista": p.empresa_subcontratista || "",
                    "Fecha de ingreso al proyecto": p.fecha_ingreso_proyecto || "",
                    "Frente de trabajo": p.frente_trabajo || "",
                    "Perfil": p.perfil || "",
                    "Tipo de EMO": p.tipo_emo || "",
                    "Fecha de EMO": p.fecha_emo || "",
                    "Clínica Ocupacional": p.clinica_ocupacional || "",
                    "Aptitud médica": p.aptitud_medica || "",
                    "Restricción médica": p.restriccion_medica || "",
                    "Fecha de constancia de lectura": p.fecha_constancia_lectura || "",
                    "Aptitud Altura estructural": p.apto_altura || "",
                    "Aptitud Espacios confinados": p.apto_espacio_confinado || "",
                    "Realiza conducción vehicular": p.conduce_vehiculos ? "Sí" : "No",
                    "Personal brigadista": p.es_brigadista ? "Sí" : "No",
                    "Grupo de riesgo Covid-19": p.grupo_riesgo_covid ? "Sí" : "No",
                    "SCTR Vencimiento": p.sctr_venc || "",
                    "EMO Vencimiento": p.emo_venc || "",
                    "Inducción SST - Fecha": p.induccion_fecha || "",
                    "EPP Entregado": p.epp_entregado ? "Sí" : "No",
                    "Fecha entrega EPP": p.epp_fecha || "",
                    "Detalle EPP": p.epp_detalle || "",
                  }));
                  const ws = XLSX.utils.json_to_sheet(rows);
                  ws["!cols"] = [
                    {wch:35},{wch:12},{wch:7},{wch:8},{wch:22},{wch:30},{wch:25},
                    {wch:18},{wch:18},{wch:28},{wch:18},{wch:14},{wch:22},{wch:22},
                    {wch:25},{wch:18},{wch:18},{wch:18},{wch:12},{wch:12},{wch:12},
                    {wch:15},{wch:15},{wch:15},{wch:12},{wch:15},{wch:30},
                  ];
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Personal Contratista");
                  XLSX.writeFile(wb, `personal_${selected.nombre.replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}.xlsx`);
                  showToast("Excel generado", "success");
                }}><Download size={13}/> Excel</Btn>

                {/* Reporte PDF */}
                <Btn size="sm" variant="ghost" onClick={() => {
                  if (!selPersonal.length) { showToast("Sin personal para exportar", "info"); return; }
                  const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" });
                  const fecha = new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"2-digit",year:"numeric"});
                  doc.setFont("helvetica","bold"); doc.setFontSize(13);
                  doc.text("REGISTRO DE PERSONAL CONTRATISTA", 14, 14);
                  doc.setFont("helvetica","normal"); doc.setFontSize(9);
                  doc.text(`Empresa contratista: ${selected.nombre}`, 14, 21);
                  doc.text(`RUC: ${selected.ruc||"—"}  ·  Rubro: ${selected.rubro||"—"}`, 14, 26);
                  doc.text(`Generado: ${fecha}  ·  Total trabajadores: ${selPersonal.length}`, 200, 21, {align:"right"});
                  autoTable(doc, {
                    startY: 31,
                    styles:{ fontSize:6.5, cellPadding:1.5, overflow:"ellipsize" },
                    headStyles:{ fillColor:[17,24,39], textColor:[255,255,255], fontStyle:"bold", fontSize:6 },
                    alternateRowStyles:{ fillColor:[243,244,246] },
                    head:[[
                      "Apellidos y Nombre","DNI","Edad","G","Puesto","Frente",
                      "Perfil","T. EMO","Fecha EMO","Clínica","Aptitud médica",
                      "Restricción","SCTR venc.","Inducción","EPP",
                      "Altura","Conf.","Conduc.","Brigada","Covid"
                    ]],
                    body: selPersonal.map(p => [
                      p.nombre, p.dni||"", calcEdad(p.fecha_nacimiento)||"", p.genero||"",
                      p.cargo||"", p.frente_trabajo||"",
                      p.perfil==="Operativo que maneja"?"Maneja":"No maneja",
                      p.tipo_emo||"", p.fecha_emo||"", p.clinica_ocupacional||"",
                      p.aptitud_medica||"", p.restriccion_medica||"",
                      p.sctr_venc||"", p.induccion_fecha||"",
                      p.epp_entregado?"Sí":"Pend.",
                      p.apto_altura||"", p.apto_espacio_confinado||"",
                      p.conduce_vehiculos?"Sí":"No",
                      p.es_brigadista?"Sí":"No",
                      p.grupo_riesgo_covid?"Sí":"No",
                    ]),
                    columnStyles:{
                      0:{cellWidth:38}, 1:{cellWidth:16}, 2:{cellWidth:10},
                      3:{cellWidth:7},  4:{cellWidth:22}, 5:{cellWidth:18},
                      6:{cellWidth:16}, 7:{cellWidth:18}, 8:{cellWidth:16},
                      9:{cellWidth:20}, 10:{cellWidth:20},11:{cellWidth:18},
                      12:{cellWidth:16},13:{cellWidth:16},14:{cellWidth:12},
                      15:{cellWidth:13},16:{cellWidth:11},17:{cellWidth:12},
                      18:{cellWidth:12},19:{cellWidth:10},
                    },
                    didDrawCell:(data) => {
                      if (data.section==="body" && data.column.index===10) {
                        const v = data.cell.raw;
                        if (v==="Apto") data.cell.styles.textColor=[22,163,74];
                        else if (v==="Apto con restricciones") data.cell.styles.textColor=[217,119,6];
                        else if (v==="No apto") data.cell.styles.textColor=[220,38,38];
                      }
                    },
                  });
                  const pageCount = doc.getNumberOfPages();
                  for(let i=1;i<=pageCount;i++){
                    doc.setPage(i);
                    doc.setFontSize(7); doc.setFont("helvetica","normal");
                    doc.text(`Pág. ${i} / ${pageCount}  —  Medicloud Safety`, 148, doc.internal.pageSize.height-5, {align:"center"});
                  }
                  doc.save(`personal_${selected.nombre.replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}.pdf`);
                  showToast("PDF generado", "success");
                }}><FileDown size={13}/> PDF</Btn>

                <Btn size="sm" variant="primary" onClick={() => { setFormP(initP); setEditingP(null); setShowModalP(true); }}><Plus size={13}/> Agregar trabajador</Btn>
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden overflow-x-auto">
              <table className="text-sm" style={{minWidth:"1100px"}}>
                <thead><tr className="border-b border-gray-800">
                  {["","Apellidos y Nombre","DNI","Edad","G","Perfil","Frente","Aptitud médica","SCTR venc.","EMO (Tipo/Fecha)","Inducción SO","EPP","Altura","Conf.","Cond.","Brig.","Estado",""].map(h=>(
                    <th key={h} className="text-left text-[10px] text-gray-600 font-medium px-2 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {selPersonal.map(p => {
                    const pc = personalComp(p);
                    const edad = calcEdad(p.fecha_nacimiento);
                    const aptColor = p.aptitud_medica==="Apto" ? "green" : p.aptitud_medica==="Apto con restricciones" ? "amber" : p.aptitud_medica==="No apto" ? "red" : "gray";
                    const aptIcon = { Apto:"✓", "Apto con restricciones":"⚠", "No apto":"✗" }[p.aptitud_medica] || "—";
                    const aptCls  = { Apto:"text-green-400", "Apto con restricciones":"text-amber-400", "No apto":"text-red-400" }[p.aptitud_medica] || "text-gray-600";
                    const optCls = (v) => v==="Sí" ? "text-green-400" : v==="No" ? "text-red-400" : "text-gray-600";
                    return (
                      <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                        <td className="px-2 py-2.5"><div className={`w-2 h-2 rounded-full ${dotCls[pc]}`} title={pc==="vigente"?"Cumple":pc==="por_vencer"?"Pendiente/Por vencer":"Vencido/No apto"}/></td>
                        <td className="px-2 py-2.5 text-gray-200 font-medium text-xs whitespace-nowrap">{p.nombre}</td>
                        <td className="px-2 py-2.5 text-xs text-gray-500 font-mono">{p.dni||"—"}</td>
                        <td className="px-2 py-2.5 text-xs text-gray-500 text-center">{edad||"—"}</td>
                        <td className="px-2 py-2.5 text-xs text-gray-500 text-center font-bold">{p.genero||"—"}</td>
                        <td className="px-2 py-2.5 text-[10px] text-gray-400 max-w-[100px]">
                          <div className="truncate">{p.perfil==="Operativo que maneja" ? "🚗 Maneja" : "🦺 No maneja"}</div>
                          {p.cargo && <div className="text-gray-600 truncate">{p.cargo}</div>}
                        </td>
                        <td className="px-2 py-2.5 text-xs text-gray-500 max-w-[80px] truncate">{p.frente_trabajo||"—"}</td>
                        <td className="px-2 py-2.5">
                          <div className={`text-[10px] font-bold ${aptCls}`}>{aptIcon} {p.aptitud_medica||"—"}</div>
                          {p.restriccion_medica && <div className="text-[10px] text-gray-600 truncate max-w-[100px]">{p.restriccion_medica}</div>}
                        </td>
                        <td className="px-2 py-2.5">{p.sctr_venc ? <DateChip fecha={p.sctr_venc}/> : <span className="text-[10px] text-red-600">Sin fecha</span>}</td>
                        <td className="px-2 py-2.5">
                          {p.fecha_emo ? (
                            <div>
                              <div className="text-[10px] text-gray-500">{p.tipo_emo||"—"}</div>
                              <div className="text-[10px] font-mono text-gray-400">{fmtFecha(p.fecha_emo)}</div>
                              {p.clinica_ocupacional && <div className="text-[10px] text-gray-600 truncate max-w-[90px]">{p.clinica_ocupacional}</div>}
                            </div>
                          ) : <span className="text-[10px] text-red-600">Pendiente</span>}
                        </td>
                        <td className="px-2 py-2.5">
                          {p.induccion_fecha
                            ? <span className="text-[10px] text-green-400 font-mono">✓ {p.induccion_fecha}</span>
                            : <span className="text-[10px] text-red-500">Pendiente</span>}
                        </td>
                        <td className="px-2 py-2.5">
                          {p.epp_entregado
                            ? <div><span className="text-[10px] text-green-400">✓ OK</span>
                                {p.epp_detalle && <div className="text-[10px] text-gray-600 truncate max-w-[80px]">{p.epp_detalle}</div>}
                              </div>
                            : <span className="text-[10px] text-red-500">Pendiente</span>}
                        </td>
                        <td className="px-2 py-2.5 text-[10px] text-center"><span className={optCls(p.apto_altura)}>{p.apto_altura==="Sí"?"✓":p.apto_altura==="No"?"✗":"—"}</span></td>
                        <td className="px-2 py-2.5 text-[10px] text-center"><span className={optCls(p.apto_espacio_confinado)}>{p.apto_espacio_confinado==="Sí"?"✓":p.apto_espacio_confinado==="No"?"✗":"—"}</span></td>
                        <td className="px-2 py-2.5 text-[10px] text-center">{p.conduce_vehiculos ? <span className="text-amber-400">🚗</span> : <span className="text-gray-700">—</span>}</td>
                        <td className="px-2 py-2.5 text-[10px] text-center">{p.es_brigadista ? <span className="text-blue-400">🛡</span> : <span className="text-gray-700">—</span>}</td>
                        <td className="px-2 py-2.5"><Badge color={p.estado==="Activo"?"green":"gray"}>{p.estado}</Badge></td>
                        <td className="px-2 py-2.5">
                          <div className="flex gap-1">
                            <button onClick={() => {
                              const d={...initP,...p};
                              ["sctr_venc","emo_venc","induccion_fecha","epp_fecha","fecha_nacimiento","fecha_ingreso_proyecto","fecha_emo","fecha_constancia_lectura"].forEach(k=>{d[k]=p[k]||"";});
                              d.epp_entregado=p.epp_entregado||false; d.conduce_vehiculos=p.conduce_vehiculos||false;
                              d.es_brigadista=p.es_brigadista||false; d.grupo_riesgo_covid=p.grupo_riesgo_covid||false;
                              setFormP(d); setEditingP(p); setShowModalP(true);
                            }} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13}/></button>
                            <button onClick={async()=>{ if(!confirm("¿Eliminar?"))return; await supabase.from("contratista_personal").delete().eq("id",p.id); showToast("Eliminado","info"); load(); }} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13}/></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!selPersonal.length && <tr><td colSpan={18} className="px-4 py-10 text-center text-gray-600 text-sm">Sin personal registrado. Usa "Agregar trabajador".</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab: Trabajos ── */}
        {activeTab === "trabajos" && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs text-gray-500">{selTrabajos.length} trabajo(s) registrado(s)</p>
              <Btn size="sm" variant="primary" onClick={() => { setFormT(initT); setEditingT(null); setShowModalT(true); }}><Plus size={13}/> Nuevo trabajo</Btn>
            </div>
            <div className="space-y-3">
              {selTrabajos.map(t => {
                const asignados = (t.personal_asignado||[]).map(pid=>personal.find(p=>p.id===pid)?.nombre).filter(Boolean);
                return (
                  <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1.5">
                          <Badge color={travEstColor[t.estado]||"gray"}>{t.estado}</Badge>
                          <Badge color={nivelColor[t.nivel_riesgo]||"gray"}>{t.nivel_riesgo} riesgo</Badge>
                          {t.area && <span className="text-xs text-gray-600">📍 {t.area}</span>}
                        </div>
                        <p className="text-sm text-white font-medium mb-1.5">{t.descripcion}</p>
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          {t.fecha_inicio && <span>🗓 Inicio: <span className="font-mono text-gray-400">{fmtFecha(t.fecha_inicio)}</span></span>}
                          {t.fecha_fin && <span>🏁 Fin: <span className="font-mono text-gray-400">{fmtFecha(t.fecha_fin)}</span></span>}
                          {t.responsable_obra && <span>👤 <span className="text-gray-400">{t.responsable_obra}</span></span>}
                        </div>
                        {asignados.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            <span className="text-[10px] text-gray-600 self-center">👷 Personal:</span>
                            {asignados.map(n => <span key={n} className="text-[10px] px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-400">{n}</span>)}
                          </div>
                        )}
                        {t.observaciones && <p className="text-xs text-gray-600 mt-1.5 italic">{t.observaciones}</p>}
                      </div>
                      <div className="flex gap-1 ml-3 shrink-0">
                        <button onClick={() => { const d={...initT,...t,fecha_inicio:t.fecha_inicio||"",fecha_fin:t.fecha_fin||"",personal_asignado:t.personal_asignado||[]}; setFormT(d); setEditingT(t); setShowModalT(true); }} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13}/></button>
                        <button onClick={async()=>{ if(!confirm("¿Eliminar?"))return; await supabase.from("contratista_trabajos").delete().eq("id",t.id); showToast("Eliminado","info"); load(); }} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13}/></button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!selTrabajos.length && <div className="py-10 text-center text-gray-600 text-sm bg-gray-900 border border-gray-800 rounded-xl">Sin trabajos registrados. Usa "Nuevo trabajo".</div>}
            </div>
          </div>
        )}

        {/* Modal Personal */}
        {showModalP && (
          <Modal title={editingP?"Editar trabajador":"Agregar trabajador contratista"} onClose={()=>setShowModalP(false)} wide>
            <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">

              {/* ── 1. Datos personales ── */}
              <div>
                <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-3">1 — Datos personales</p>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <FormField label="Apellidos y Nombre *" className="col-span-2">
                    <Input value={formP.nombre} onChange={e=>setFormP(p=>({...p,nombre:e.target.value}))} placeholder="Apellidos y nombres completos" />
                  </FormField>
                  <FormField label="DNI">
                    <Input value={formP.dni} onChange={e=>setFormP(p=>({...p,dni:e.target.value}))} placeholder="12345678" maxLength={8} />
                  </FormField>
                </div>
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <FormField label="Fecha de nacimiento">
                    <Input type="date" value={formP.fecha_nacimiento} onChange={e=>setFormP(p=>({...p,fecha_nacimiento:e.target.value}))} />
                  </FormField>
                  <FormField label="Edad">
                    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400">
                      {calcEdad(formP.fecha_nacimiento) ? `${calcEdad(formP.fecha_nacimiento)} años` : "—"}
                    </div>
                  </FormField>
                  <FormField label="Género">
                    <Select value={formP.genero} onChange={e=>setFormP(p=>({...p,genero:e.target.value}))}>
                      <option value="M">M — Masculino</option>
                      <option value="F">F — Femenino</option>
                    </Select>
                  </FormField>
                  <FormField label="Estado">
                    <Select value={formP.estado} onChange={e=>setFormP(p=>({...p,estado:e.target.value}))}>
                      <option>Activo</option><option>Inactivo</option>
                    </Select>
                  </FormField>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <FormField label="Puesto de trabajo">
                    <Input value={formP.cargo} onChange={e=>setFormP(p=>({...p,cargo:e.target.value}))} placeholder="Operario, Técnico, Electricista..." />
                  </FormField>
                  <FormField label="Empresa subcontratista">
                    <Input value={formP.empresa_subcontratista} onChange={e=>setFormP(p=>({...p,empresa_subcontratista:e.target.value}))} placeholder="Si aplica" />
                  </FormField>
                  <FormField label="Fecha de ingreso al proyecto">
                    <Input type="date" value={formP.fecha_ingreso_proyecto} onChange={e=>setFormP(p=>({...p,fecha_ingreso_proyecto:e.target.value}))} />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Frente de trabajo">
                    <Input value={formP.frente_trabajo} onChange={e=>setFormP(p=>({...p,frente_trabajo:e.target.value}))} placeholder="Frente A, Planta, Almacén Central..." />
                  </FormField>
                  <FormField label="Perfil">
                    <Select value={formP.perfil} onChange={e=>setFormP(p=>({...p,perfil:e.target.value}))}>
                      <option>Operativo que no maneja</option>
                      <option>Operativo que maneja</option>
                    </Select>
                  </FormField>
                </div>
              </div>

              {/* ── 2. Evaluación médica (EMO) ── */}
              <div className="border-t border-gray-800 pt-4">
                <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-3">2 — Evaluación médica ocupacional (EMO)</p>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <FormField label="Tipo de EMO">
                    <Select value={formP.tipo_emo} onChange={e=>setFormP(p=>({...p,tipo_emo:e.target.value}))}>
                      <option>Preocupacional</option>
                      <option>Periódico</option>
                      <option>Retiro</option>
                    </Select>
                  </FormField>
                  <FormField label="Fecha de EMO">
                    <Input type="date" value={formP.fecha_emo} onChange={e=>setFormP(p=>({...p,fecha_emo:e.target.value}))} />
                  </FormField>
                  <FormField label="Clínica Ocupacional">
                    <Input value={formP.clinica_ocupacional} onChange={e=>setFormP(p=>({...p,clinica_ocupacional:e.target.value}))} placeholder="Nombre de la clínica" />
                  </FormField>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <FormField label="Aptitud médica">
                    <Select value={formP.aptitud_medica} onChange={e=>setFormP(p=>({...p,aptitud_medica:e.target.value}))}>
                      <option>Apto</option>
                      <option>Apto con restricciones</option>
                      <option>No apto</option>
                    </Select>
                  </FormField>
                  <FormField label="Restricción médica" className="col-span-2">
                    <Input value={formP.restriccion_medica} onChange={e=>setFormP(p=>({...p,restriccion_medica:e.target.value}))} placeholder="Descripción de la restricción (si aplica)" />
                  </FormField>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <FormField label="Fecha constancia de lectura">
                    <Input type="date" value={formP.fecha_constancia_lectura} onChange={e=>setFormP(p=>({...p,fecha_constancia_lectura:e.target.value}))} />
                  </FormField>
                  <FormField label="SCTR — Vencimiento">
                    <Input type="date" value={formP.sctr_venc} onChange={e=>setFormP(p=>({...p,sctr_venc:e.target.value}))} />
                  </FormField>
                  <FormField label="EMO — Vencimiento">
                    <Input type="date" value={formP.emo_venc} onChange={e=>setFormP(p=>({...p,emo_venc:e.target.value}))} />
                  </FormField>
                </div>
              </div>

              {/* ── 3. Aptitudes especiales y roles ── */}
              <div className="border-t border-gray-800 pt-4">
                <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-3">3 — Aptitudes especiales y roles</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <FormField label="Aptitud — Trabajos en Altura Estructural">
                    <Select value={formP.apto_altura} onChange={e=>setFormP(p=>({...p,apto_altura:e.target.value}))}>
                      <option>No aplica</option><option>Sí</option><option>No</option>
                    </Select>
                  </FormField>
                  <FormField label="Aptitud — Espacios Confinados">
                    <Select value={formP.apto_espacio_confinado} onChange={e=>setFormP(p=>({...p,apto_espacio_confinado:e.target.value}))}>
                      <option>No aplica</option><option>Sí</option><option>No</option>
                    </Select>
                  </FormField>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <FormField label="Realiza conducción vehicular">
                    <Select value={formP.conduce_vehiculos?"si":"no"} onChange={e=>setFormP(p=>({...p,conduce_vehiculos:e.target.value==="si"}))}>
                      <option value="no">No</option><option value="si">Sí</option>
                    </Select>
                  </FormField>
                  <FormField label="Personal brigadista">
                    <Select value={formP.es_brigadista?"si":"no"} onChange={e=>setFormP(p=>({...p,es_brigadista:e.target.value==="si"}))}>
                      <option value="no">No</option><option value="si">Sí</option>
                    </Select>
                  </FormField>
                  <FormField label="Grupo de riesgo Covid-19">
                    <Select value={formP.grupo_riesgo_covid?"si":"no"} onChange={e=>setFormP(p=>({...p,grupo_riesgo_covid:e.target.value==="si"}))}>
                      <option value="no">No</option><option value="si">Sí</option>
                    </Select>
                  </FormField>
                </div>
              </div>

              {/* ── 4. Inducción y EPP ── */}
              <div className="border-t border-gray-800 pt-4">
                <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-3">4 — Inducción SST y EPP</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <FormField label="Inducción SST — Fecha de realización">
                    <Input type="date" value={formP.induccion_fecha} onChange={e=>setFormP(p=>({...p,induccion_fecha:e.target.value}))} />
                  </FormField>
                  <FormField label="¿EPP entregado?">
                    <Select value={formP.epp_entregado?"si":"no"} onChange={e=>setFormP(p=>({...p,epp_entregado:e.target.value==="si"}))}>
                      <option value="no">No — Pendiente</option>
                      <option value="si">Sí — Entregado</option>
                    </Select>
                  </FormField>
                </div>
                {formP.epp_entregado && (
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Fecha de entrega EPP">
                      <Input type="date" value={formP.epp_fecha} onChange={e=>setFormP(p=>({...p,epp_fecha:e.target.value}))} />
                    </FormField>
                    <FormField label="EPP entregados (detalle)">
                      <Input value={formP.epp_detalle} onChange={e=>setFormP(p=>({...p,epp_detalle:e.target.value}))} placeholder="Casco, chaleco, guantes, botas, lentes UV..." />
                    </FormField>
                  </div>
                )}
              </div>

            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-800 mt-2">
              <Btn variant="ghost" onClick={()=>setShowModalP(false)}>Cancelar</Btn>
              <Btn variant="primary" onClick={savePersonal} disabled={saving}>{saving?"Guardando...":"Guardar trabajador"}</Btn>
            </div>
          </Modal>
        )}

        {/* Modal Trabajo */}
        {showModalT && (
          <Modal title={editingT?"Editar trabajo":"Nuevo trabajo / contrato"} onClose={()=>setShowModalT(false)} wide>
            <div className="space-y-3">
              <FormField label="Descripción del trabajo *">
                <Input value={formT.descripcion} onChange={e=>setFormT(p=>({...p,descripcion:e.target.value}))} placeholder="Ej: Instalación de sistema contra incendios en almacén principal" />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Área / Ubicación"><Input value={formT.area} onChange={e=>setFormT(p=>({...p,area:e.target.value}))} placeholder="Planta, Almacén, Oficinas..." /></FormField>
                <FormField label="Nivel de riesgo">
                  <Select value={formT.nivel_riesgo} onChange={e=>setFormT(p=>({...p,nivel_riesgo:e.target.value}))}>
                    <option>Alto</option><option>Medio</option><option>Bajo</option>
                  </Select>
                </FormField>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <FormField label="Fecha inicio"><Input type="date" value={formT.fecha_inicio} onChange={e=>setFormT(p=>({...p,fecha_inicio:e.target.value}))} /></FormField>
                <FormField label="Fecha fin estimada"><Input type="date" value={formT.fecha_fin} onChange={e=>setFormT(p=>({...p,fecha_fin:e.target.value}))} /></FormField>
                <FormField label="Estado">
                  <Select value={formT.estado} onChange={e=>setFormT(p=>({...p,estado:e.target.value}))}>
                    <option>Programado</option><option>En ejecución</option><option>Completado</option><option>Suspendido</option>
                  </Select>
                </FormField>
              </div>
              <FormField label="Responsable de obra / supervisor">
                <Input value={formT.responsable_obra} onChange={e=>setFormT(p=>({...p,responsable_obra:e.target.value}))} placeholder="Nombre del jefe de obra o supervisor SST" />
              </FormField>
              {selPersonal.filter(p=>p.estado==="Activo").length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Personal asignado a este trabajo</p>
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                    {selPersonal.filter(p=>p.estado==="Activo").map(p=>(
                      <label key={p.id} className="flex items-center gap-2 p-2.5 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer hover:border-gray-600 transition-colors">
                        <input type="checkbox" checked={(formT.personal_asignado||[]).includes(p.id)}
                          onChange={e=>setFormT(ft=>({...ft,personal_asignado:e.target.checked?[...(ft.personal_asignado||[]),p.id]:(ft.personal_asignado||[]).filter(id=>id!==p.id)}))}
                          className="accent-amber-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs text-gray-200 truncate">{p.nombre}</div>
                          {p.cargo && <div className="text-[10px] text-gray-600">{p.cargo}</div>}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <FormField label="Observaciones">
                <Input value={formT.observaciones} onChange={e=>setFormT(p=>({...p,observaciones:e.target.value}))} placeholder="Condiciones especiales, permisos requeridos, etc." />
              </FormField>
              <div className="flex justify-end gap-2 pt-2">
                <Btn variant="ghost" onClick={()=>setShowModalT(false)}>Cancelar</Btn>
                <Btn variant="primary" onClick={saveTrabajo} disabled={saving}>{saving?"Guardando...":"Guardar"}</Btn>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════
  // VISTA PRINCIPAL — LISTA DE CONTRATISTAS
  // ════════════════════════════════════════
  const filtered = contratistas.filter(c => {
    if (search && !c.nombre.toLowerCase().includes(search.toLowerCase()) && !(c.ruc||"").includes(search) && !(c.rubro||"").toLowerCase().includes(search.toLowerCase())) return false;
    if (filtroEstado && c.estado !== filtroEstado) return false;
    return true;
  });

  const totalActivos   = contratistas.filter(c => c.estado === "Activo").length;
  const conVencidos    = contratistas.filter(c => contratistaComp(c) === "vencido").length;
  const conPorVencer   = contratistas.filter(c => contratistaComp(c) === "por_vencer").length;
  const trabActTotal   = trabajos.filter(t => t.estado === "En ejecución").length;

  // Alertas globales: docs de empresa y personal vencidos/por vencer
  const alertas = [];
  contratistas.forEach(c => {
    const comp = contratistaComp(c);
    if (comp === "vencido") alertas.push({ tipo:"error", texto:`${c.nombre} — documentos de empresa VENCIDOS` });
    else if (comp === "por_vencer") alertas.push({ tipo:"warn", texto:`${c.nombre} — documentos próximos a vencer (≤30 días)` });
  });
  personal.filter(p=>p.estado==="Activo").forEach(p => {
    const comp = personalComp(p);
    const cname = contratistas.find(c=>c.id===p.contratista_id)?.nombre||"";
    if (comp === "vencido") alertas.push({ tipo:"error", texto:`${p.nombre} (${cname}) — SCTR/EMO vencido` });
    else if (comp === "por_vencer") alertas.push({ tipo:"warn", texto:`${p.nombre} (${cname}) — SCTR/EMO por vencer` });
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Gestión de Contratistas</h3>
          <p className="text-gray-500 text-xs">Control de empresas contratistas, documentación, personal y trabajos en ejecución.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <ExportBtn data={contratistas.map(c=>({ Nombre:c.nombre, RUC:c.ruc||"", Rubro:c.rubro||"", Estado:c.estado, "SCTR venc.":c.sctr_empresa_venc||"", "Póliza RC":c.poliza_rc_venc||"", "Póliza Vida":c.poliza_vida_venc||"", "IPERC venc.":c.iper_venc||"", "Personal":personal.filter(p=>p.contratista_id===c.id).length, "Trabajos":trabajos.filter(t=>t.contratista_id===c.id).length }))} filename="contratistas" />
          <Btn size="sm" variant="primary" onClick={() => { setFormC(initC); setEditingC(null); setShowModalC(true); }}><Plus size={13}/> Nuevo contratista</Btn>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Total contratistas" value={contratistas.length} sub={`${totalActivos} activos`} accentColor="blue" />
        <KpiCard label="Trabajos activos" value={trabActTotal} sub="en ejecución ahora" accentColor="amber" />
        <KpiCard label="Docs vencidos" value={conVencidos} sub="contratistas con alerta roja" accentColor={conVencidos>0?"red":"emerald"} />
        <KpiCard label="Por vencer" value={conPorVencer} sub="documentos ≤30 días" accentColor={conPorVencer>0?"amber":"emerald"} />
      </div>

      {/* Panel de alertas */}
      {alertas.length > 0 && (
        <div className="mb-5 space-y-1.5">
          {alertas.slice(0,5).map((a,i) => (
            <div key={i} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs ${a.tipo==="error" ? "bg-red-900/20 border-red-800 text-red-400" : "bg-amber-900/20 border-amber-800 text-amber-400"}`}>
              <AlertTriangle size={13} className="shrink-0" />
              {a.texto}
            </div>
          ))}
          {alertas.length > 5 && <p className="text-xs text-gray-600 pl-2">+{alertas.length-5} alertas más — revisa el detalle de cada contratista.</p>}
        </div>
      )}

      {/* Búsqueda y filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre, RUC o rubro..."
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-amber-600 placeholder-gray-600" />
        </div>
        <select value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)} className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none">
          <option value="">Todos los estados</option><option>Activo</option><option>Suspendido</option><option>Inactivo</option>
        </select>
        {(search||filtroEstado) && <button onClick={()=>{setSearch("");setFiltroEstado("");}} className="text-xs text-gray-500 hover:text-gray-300 px-3 py-2 border border-gray-800 rounded-xl hover:bg-gray-800 transition-colors">✕ Limpiar</button>}
      </div>

      {/* Tabla de contratistas */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-gray-600 bg-gray-900 border border-gray-800 rounded-xl">
          {contratistas.length === 0 ? "Aún no hay contratistas registrados. Usa \"Nuevo contratista\"." : "Sin resultados para los filtros aplicados."}
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800">{["","Contratista","Rubro","Personal","Trabajos activos","Docs empresa","Estado",""].map(h=>(
              <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}</tr></thead>
            <tbody>
              {filtered.map(c => {
                const comp = contratistaComp(c);
                const ps = personal.filter(p=>p.contratista_id===c.id);
                const ts = trabajos.filter(t=>t.contratista_id===c.id&&t.estado==="En ejecución");
                const compLabel = { vencido:"✗ Vencido", por_vencer:"⚠ Por vencer", vigente:"✓ Al día", sin_fecha:"Sin datos" }[comp];
                const compBadge = { vencido:"red", por_vencer:"amber", vigente:"green", sin_fecha:"gray" }[comp];
                return (
                  <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer transition-colors" onClick={()=>{setSelected(c);setActiveTab("docs");}}>
                    <td className="px-4 py-3"><div className={`w-2.5 h-2.5 rounded-full ${dotCls[comp]}`} /></td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-200">{c.nombre}</div>
                      {c.ruc && <div className="text-xs text-gray-600 font-mono">RUC {c.ruc}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{c.rubro||"—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-bold ${ps.length>0?"text-blue-400":"text-gray-600"}`}>{ps.length}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-bold ${ts.length>0?"text-amber-400":"text-gray-600"}`}>{ts.length}</span>
                    </td>
                    <td className="px-4 py-3"><Badge color={compBadge}>{compLabel}</Badge></td>
                    <td className="px-4 py-3"><Badge color={c.estado==="Activo"?"green":c.estado==="Suspendido"?"amber":"red"}>{c.estado}</Badge></td>
                    <td className="px-4 py-3"><ChevronRight size={14} className="text-gray-700" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Contratista */}
      {showModalC && (
        <Modal title={editingC?"Editar contratista":"Nuevo contratista"} onClose={()=>setShowModalC(false)} wide>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Nombre de empresa *"><Input value={formC.nombre} onChange={e=>setFormC(p=>({...p,nombre:e.target.value}))} placeholder="Razón social" /></FormField>
              <FormField label="RUC"><Input value={formC.ruc} onChange={e=>setFormC(p=>({...p,ruc:e.target.value}))} placeholder="20XXXXXXXXX" maxLength={11} /></FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Rubro / Actividad"><Input value={formC.rubro} onChange={e=>setFormC(p=>({...p,rubro:e.target.value}))} placeholder="Construcción, Mantenimiento, Limpieza..." /></FormField>
              <FormField label="Estado"><Select value={formC.estado} onChange={e=>setFormC(p=>({...p,estado:e.target.value}))}><option>Activo</option><option>Suspendido</option><option>Inactivo</option></Select></FormField>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Representante legal"><Input value={formC.representante} onChange={e=>setFormC(p=>({...p,representante:e.target.value}))} placeholder="Nombre completo" /></FormField>
              <FormField label="Teléfono"><Input value={formC.telefono} onChange={e=>setFormC(p=>({...p,telefono:e.target.value}))} placeholder="+51 999 000 000" /></FormField>
              <FormField label="Email"><Input value={formC.email} onChange={e=>setFormC(p=>({...p,email:e.target.value}))} placeholder="correo@empresa.com" /></FormField>
            </div>
            <div className="pt-2 border-t border-gray-800">
              <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-3">Vencimientos de documentos de empresa</p>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="SCTR Pensión + Salud — Venc."><Input type="date" value={formC.sctr_empresa_venc} onChange={e=>setFormC(p=>({...p,sctr_empresa_venc:e.target.value}))} /></FormField>
                <FormField label="Póliza Responsabilidad Civil — Venc."><Input type="date" value={formC.poliza_rc_venc} onChange={e=>setFormC(p=>({...p,poliza_rc_venc:e.target.value}))} /></FormField>
                <FormField label="Póliza Seguro de Vida — Venc."><Input type="date" value={formC.poliza_vida_venc} onChange={e=>setFormC(p=>({...p,poliza_vida_venc:e.target.value}))} /></FormField>
                <FormField label="IPERC de actividades — Venc."><Input type="date" value={formC.iper_venc} onChange={e=>setFormC(p=>({...p,iper_venc:e.target.value}))} /></FormField>
                <FormField label="Plan de SST — Venc." className="col-span-2"><Input type="date" value={formC.plan_sst_venc} onChange={e=>setFormC(p=>({...p,plan_sst_venc:e.target.value}))} /></FormField>
              </div>
            </div>
            <FormField label="Observaciones"><Input value={formC.observaciones} onChange={e=>setFormC(p=>({...p,observaciones:e.target.value}))} placeholder="Notas, condiciones especiales, restricciones..." /></FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={()=>setShowModalC(false)}>Cancelar</Btn>
              <Btn variant="primary" onClick={saveContratista} disabled={saving}>{saving?"Guardando...":"Guardar"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

