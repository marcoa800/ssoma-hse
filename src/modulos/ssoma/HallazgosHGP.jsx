import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { KpiCard } from '../../components/ui/KpiCard.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Btn } from '../../components/ui/Btn.jsx';
import { WideTableScroll } from '../../components/ui/WideTableScroll.jsx';
import {
  Plus, Trash2, Pencil, Eye, FileDown, Upload, Camera,
  AlertTriangle, CheckCircle, Clock, X, ArrowLeft, Search, Filter, FileText
} from 'lucide-react';

// ── Catálogos del formato FR-039 ──
const TIPOS_HALLAZGO = [
  "Buena práctica",
  "(NIVEL4) Clasificados en Riesgo Mayor de Seguridad",
  "(NIVEL 3) Riesgo Significativo de Seguridad",
  "(NIVEL2) Riesgo General de Seguridad",
  "(NIVEL1) Riesgo Bajo de Seguridad",
];
const CATEGORIAS_RIESGO = [
  "Proceso de producción",
  "Equipos e instalaciones",
  "Entorno laboral (incluidos desastres naturales)",
  "Comportamiento del personal (incluidos riesgos psicosociales)",
  "Sistema de gestión",
];
const CLASIFICACIONES = ["Acto", "Condición", "N.A."];
const ESTATUSES = ["Abierto", "En proceso", "Cerrado"];
const HALLAZGO_ASOCIADO = [
  "Sección 1: Procedimientos - Registros",
  "Sección 2: Equipos de protección personal",
  "Sección 3: Señalización",
  "Sección 4: Trabajo en altura",
  "Sección 5: Espacios Confinados",
  "Sección 6: Sistemas y Mecanismos de Izaje",
  "Sección 7: Unidades Móviles",
  "Sección 8: Herramientas, Equipos y Maquinaria",
  "Sección 9: Respuesta Emergencias",
  "Sección 10: Excavaciones",
  "Sección 11: Manejo de Residuos",
  "Sección 12: Afectación de Suelo",
  "Sección 13: Afectación de Vegetación",
  "Sección 14: Afectación de la Fauna",
  "Sección 15: Afectación del Paisaje y Relieve",
  "Sección 16: Afectación del nivel de ruido",
  "Sección 17: Afectación de la calidad del aire",
  "Sección 18: Orden y Limpieza",
  "Sección 19: Relacionamiento social",
  "Sección 20: Higiene y Salud Ocupacional",
  "Sección 21: Control de Estándares de Calidad",
];

const ESTATUS_COLOR = { Abierto: "red", "En proceso": "amber", Cerrado: "green" };
const TIPO_COLOR = {
  "Buena práctica": "green",
  "(NIVEL4) Clasificados en Riesgo Mayor de Seguridad": "red",
  "(NIVEL 3) Riesgo Significativo de Seguridad": "orange",
  "(NIVEL2) Riesgo General de Seguridad": "amber",
  "(NIVEL1) Riesgo Bajo de Seguridad": "blue",
};

const INIT_FORM = {
  proyecto: "CHSGIII", empresa_reportante: "HGP", empresa_inspeccionada: "",
  supervisor_reportante: "", fecha_hallazgo: new Date().toISOString().split("T")[0],
  fecha_apertura: new Date().toISOString().split("T")[0], fecha_limite: "",
  lugar: "", actividad: "", pt_asociado: "", lider_frente: "", hora_visita: "", asignado_area: "",
  tipo_hallazgo: "", categoria_riesgo: "", clasificacion: "Condición", hallazgo_asociado: "",
  descripcion: "", medida_correctiva: "", causas_fondo: "",
  estatus: "Abierto", descripcion_cierre: "", fecha_cierre: "",
};

export default function HallazgosHGP({ empresaId }) {
  const [hallazgos, setHallazgos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState("lista"); // lista | form | detalle
  const [editando, setEditando] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [form, setForm] = useState(INIT_FORM);
  const [fotoInicial, setFotoInicial] = useState(null);
  const [fotoFinal, setFotoFinal] = useState(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fEstatus, setFEstatus] = useState("");
  const [fTipo, setFTipo] = useState("");
  const [fBuscar, setFBuscar] = useState("");
  const importRef = useRef();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("hallazgos_hgp").select("*")
      .eq("empresa_id", empresaId).order("fecha_hallazgo", { ascending: false });
    setHallazgos(data || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Subida de foto ──
  const subirFoto = async (file, tipo) => {
    if (!file) return null;
    setSubiendoFoto(true);
    const ext = file.name.split(".").pop();
    const path = `${empresaId}/hallazgos/${Date.now()}_${tipo}.${ext}`;
    const { error } = await supabase.storage.from("inspecciones-fotos").upload(path, file, { contentType: file.type });
    if (error) { showToast("Error subiendo foto", "error"); setSubiendoFoto(false); return null; }
    const { data: { publicUrl } } = supabase.storage.from("inspecciones-fotos").getPublicUrl(path);
    setSubiendoFoto(false);
    return publicUrl;
  };

  // ── Guardar ──
  const guardar = async () => {
    if (!form.descripcion.trim()) { showToast("La descripción es obligatoria", "error"); return; }
    setSaving(true);
    let foto_inicial_url = editando?.foto_inicial_url || null;
    let foto_final_url = editando?.foto_final_url || null;
    if (fotoInicial) foto_inicial_url = await subirFoto(fotoInicial, "inicial");
    if (fotoFinal) foto_final_url = await subirFoto(fotoFinal, "final");
    const payload = {
      empresa_id: empresaId,
      ...form,
      fecha_hallazgo: form.fecha_hallazgo || null,
      fecha_apertura: form.fecha_apertura || null,
      fecha_limite: form.fecha_limite || null,
      fecha_cierre: form.fecha_cierre || null,
      foto_inicial_url, foto_final_url,
      updated_at: new Date().toISOString(),
    };
    const { error } = editando
      ? await supabase.from("hallazgos_hgp").update(payload).eq("id", editando.id)
      : await supabase.from("hallazgos_hgp").insert(payload);
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast(editando ? "Hallazgo actualizado" : "Hallazgo registrado", "success");
    setVista("lista"); setEditando(null); setFotoInicial(null); setFotoFinal(null);
    load();
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar este hallazgo?")) return;
    await supabase.from("hallazgos_hgp").delete().eq("id", id);
    showToast("Eliminado", "info"); load();
  };

  const abrirEditar = (h) => {
    setEditando(h);
    setForm({
      proyecto: h.proyecto || "CHSGIII", empresa_reportante: h.empresa_reportante || "",
      empresa_inspeccionada: h.empresa_inspeccionada || "",
      supervisor_reportante: h.supervisor_reportante || "",
      fecha_hallazgo: h.fecha_hallazgo || "", fecha_apertura: h.fecha_apertura || "",
      fecha_limite: h.fecha_limite || "", lugar: h.lugar || "",
      actividad: h.actividad || "", pt_asociado: h.pt_asociado || "",
      lider_frente: h.lider_frente || "", hora_visita: h.hora_visita || "",
      asignado_area: h.asignado_area || "", tipo_hallazgo: h.tipo_hallazgo || "",
      categoria_riesgo: h.categoria_riesgo || "", clasificacion: h.clasificacion || "",
      hallazgo_asociado: h.hallazgo_asociado || "", descripcion: h.descripcion || "",
      medida_correctiva: h.medida_correctiva || "", causas_fondo: h.causas_fondo || "",
      estatus: h.estatus || "Abierto", descripcion_cierre: h.descripcion_cierre || "",
      fecha_cierre: h.fecha_cierre || "",
    });
    setFotoInicial(null); setFotoFinal(null);
    setVista("form");
  };

  // ── Exportar Excel ──
  const exportar = () => {
    const filas = filtrados.map((h, i) => ({
      "N°": i + 1,
      "Proyecto": h.proyecto || "",
      "Empresa Reportante": h.empresa_reportante || "",
      "Empresa Inspeccionada": h.empresa_inspeccionada || "",
      "Lugar del Hallazgo": h.lugar || "",
      "Supervisor SST Reportante": h.supervisor_reportante || "",
      "Fecha del Hallazgo": h.fecha_hallazgo || "",
      "Asignado a Área": h.asignado_area || "",
      "PT Asociado N°": h.pt_asociado || "",
      "Líder del Frente": h.lider_frente || "",
      "Hora de Visita": h.hora_visita || "",
      "Actividad": h.actividad || "",
      "Tipo de Hallazgo": h.tipo_hallazgo || "",
      "Categoría del Riesgo": h.categoria_riesgo || "",
      "Clasificación Acto/Condición": h.clasificacion || "",
      "Descripción": h.descripcion || "",
      "Evidencia Inicial (URL)": h.foto_inicial_url || "",
      "Descripción Medida Correctiva": h.medida_correctiva || "",
      "Fecha Límite": h.fecha_limite || "",
      "Evidencia Final (URL)": h.foto_final_url || "",
      "Estatus": h.estatus || "",
      "Descripción Cierre": h.descripcion_cierre || "",
      "Causas de Fondo": h.causas_fondo || "",
      "Hallazgo Asociado a": h.hallazgo_asociado || "",
      "Fecha Cierre": h.fecha_cierre || "",
    }));
    const ws = XLSX.utils.json_to_sheet(filas);
    ws["!cols"] = [{ wch: 5 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 25 },
      { wch: 25 }, { wch: 14 }, { wch: 20 }, { wch: 12 }, { wch: 20 },
      { wch: 12 }, { wch: 25 }, { wch: 30 }, { wch: 30 }, { wch: 15 },
      { wch: 50 }, { wch: 40 }, { wch: 50 }, { wch: 14 }, { wch: 40 },
      { wch: 12 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hallazgos");
    XLSX.writeFile(wb, `Reporte_Hallazgos_HGP_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ── Importar Excel ──
  const importar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const wb = XLSX.read(ev.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (!rows.length) { showToast("No se encontraron filas", "error"); return; }
      let ok = 0, err = 0;
      for (const r of rows) {
        const desc = r["Descripción"] || r["Descripcion"] || "";
        if (!desc.trim()) continue;
        const payload = {
          empresa_id: empresaId,
          proyecto: r["Proyecto"] || "CHSGIII",
          empresa_reportante: r["Empresa Reportante"] || "",
          empresa_inspeccionada: r["Empresa Inspeccionada"] || "",
          supervisor_reportante: r["Supervisor SST Reportante"] || "",
          fecha_hallazgo: r["Fecha del Hallazgo"] || new Date().toISOString().split("T")[0],
          fecha_apertura: r["Fecha del Hallazgo"] || new Date().toISOString().split("T")[0],
          fecha_limite: r["Fecha Límite"] || r["Fecha Limite"] || null,
          lugar: r["Lugar del Hallazgo"] || "",
          actividad: r["Actividad"] || "",
          pt_asociado: r["PT Asociado N°"] || "",
          lider_frente: r["Líder del Frente"] || "",
          hora_visita: r["Hora de Visita"] || "",
          asignado_area: r["Asignado a Área"] || "",
          tipo_hallazgo: r["Tipo de Hallazgo"] || "",
          categoria_riesgo: r["Categoría del Riesgo"] || "",
          clasificacion: r["Clasificación Acto/Condición"] || "",
          hallazgo_asociado: r["Hallazgo Asociado a"] || "",
          descripcion: desc,
          medida_correctiva: r["Descripción Medida Correctiva"] || "",
          causas_fondo: r["Causas de Fondo"] || "",
          estatus: r["Estatus"] || "Abierto",
          descripcion_cierre: r["Descripción Cierre"] || "",
          fecha_cierre: r["Fecha Cierre"] || null,
        };
        const { error } = await supabase.from("hallazgos_hgp").insert(payload);
        if (error) err++; else ok++;
      }
      showToast(`Importados: ${ok} hallazgos${err ? ` · ${err} errores` : ""}`, ok ? "success" : "error");
      load();
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  // ── Filtros y KPIs ──
  const filtrados = hallazgos.filter(h =>
    (!fEstatus || h.estatus === fEstatus) &&
    (!fTipo || h.tipo_hallazgo === fTipo) &&
    (!fBuscar || h.descripcion?.toLowerCase().includes(fBuscar.toLowerCase()) ||
      h.lugar?.toLowerCase().includes(fBuscar.toLowerCase()) ||
      h.supervisor_reportante?.toLowerCase().includes(fBuscar.toLowerCase()))
  );

  const kAbiertos = hallazgos.filter(h => h.estatus === "Abierto").length;
  const kEnProceso = hallazgos.filter(h => h.estatus === "En proceso").length;
  const kCerrados = hallazgos.filter(h => h.estatus === "Cerrado").length;
  const hoy = new Date().toISOString().split("T")[0];
  const kVencidos = hallazgos.filter(h => h.estatus !== "Cerrado" && h.fecha_limite && h.fecha_limite < hoy).length;

  // ════════ VISTA: FORMULARIO ════════
  if (vista === "form") return (
    <div className="max-w-3xl">
      <button onClick={() => { setVista("lista"); setEditando(null); }}
        className="mb-4 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
        <ArrowLeft size={13} /> Volver
      </button>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold text-sm">{editando ? "Editar hallazgo" : "Nuevo hallazgo"}</h3>
          <p className="text-[11px] text-gray-600 font-mono mt-0.5">HGP-SGIII-SST-FR-039</p>
        </div>
        <div className="flex gap-2">
          <Btn size="sm" variant="ghost" onClick={() => { setVista("lista"); setEditando(null); }}>Cancelar</Btn>
          <Btn size="sm" variant="primary" onClick={guardar} disabled={saving || subiendoFoto}>
            {saving ? "Guardando..." : editando ? "Actualizar" : "Guardar"}
          </Btn>
        </div>
      </div>

      <div className="space-y-4">
        {/* Cabecera */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-[11px] text-gray-500 uppercase font-semibold tracking-wide mb-3">Datos generales</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <FormField label="Proyecto"><Input value={form.proyecto} onChange={e => set("proyecto", e.target.value)} /></FormField>
            <FormField label="Empresa reportante"><Input value={form.empresa_reportante} onChange={e => set("empresa_reportante", e.target.value)} /></FormField>
            <FormField label="Empresa inspeccionada"><Input value={form.empresa_inspeccionada} onChange={e => set("empresa_inspeccionada", e.target.value)} /></FormField>
            <FormField label="Supervisor SST *"><Input value={form.supervisor_reportante} onChange={e => set("supervisor_reportante", e.target.value)} /></FormField>
            <FormField label="Fecha del hallazgo"><Input type="date" value={form.fecha_hallazgo} onChange={e => set("fecha_hallazgo", e.target.value)} /></FormField>
            <FormField label="Fecha límite"><Input type="date" value={form.fecha_limite} onChange={e => set("fecha_limite", e.target.value)} /></FormField>
            <FormField label="Lugar / Área"><Input value={form.lugar} onChange={e => set("lugar", e.target.value)} placeholder="Ej: Casa de máquinas" /></FormField>
            <FormField label="Actividad"><Input value={form.actividad} onChange={e => set("actividad", e.target.value)} /></FormField>
            <FormField label="Asignado a área"><Input value={form.asignado_area} onChange={e => set("asignado_area", e.target.value)} /></FormField>
            <FormField label="PT Asociado N°"><Input value={form.pt_asociado} onChange={e => set("pt_asociado", e.target.value)} /></FormField>
            <FormField label="Líder del frente"><Input value={form.lider_frente} onChange={e => set("lider_frente", e.target.value)} /></FormField>
            <FormField label="Hora de visita"><Input value={form.hora_visita} onChange={e => set("hora_visita", e.target.value)} placeholder="Ej: 09:30" /></FormField>
          </div>
        </div>

        {/* Clasificación */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-[11px] text-gray-500 uppercase font-semibold tracking-wide mb-3">Clasificación</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <FormField label="Tipo de hallazgo">
              <select value={form.tipo_hallazgo} onChange={e => set("tipo_hallazgo", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500">
                <option value="">— Seleccionar —</option>
                {TIPOS_HALLAZGO.map(t => <option key={t}>{t}</option>)}
              </select>
            </FormField>
            <FormField label="Categoría del riesgo">
              <select value={form.categoria_riesgo} onChange={e => set("categoria_riesgo", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500">
                <option value="">— Seleccionar —</option>
                {CATEGORIAS_RIESGO.map(t => <option key={t}>{t}</option>)}
              </select>
            </FormField>
            <FormField label="Clasificación">
              <select value={form.clasificacion} onChange={e => set("clasificacion", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500">
                {CLASIFICACIONES.map(t => <option key={t}>{t}</option>)}
              </select>
            </FormField>
            <FormField label="Hallazgo asociado a">
              <select value={form.hallazgo_asociado} onChange={e => set("hallazgo_asociado", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500">
                <option value="">— Seleccionar —</option>
                {HALLAZGO_ASOCIADO.map(t => <option key={t}>{t}</option>)}
              </select>
            </FormField>
          </div>
        </div>

        {/* Descripción */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <p className="text-[11px] text-gray-500 uppercase font-semibold tracking-wide">Descripción y medidas</p>
          <FormField label="Descripción del hallazgo *">
            <textarea rows={3} value={form.descripcion} onChange={e => set("descripcion", e.target.value)}
              className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500 resize-none"
              placeholder="Describe el acto o condición observada..." />
          </FormField>
          <FormField label="Medida correctiva">
            <textarea rows={2} value={form.medida_correctiva} onChange={e => set("medida_correctiva", e.target.value)}
              className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500 resize-none"
              placeholder="Describe la medida correctiva a aplicar..." />
          </FormField>
          <FormField label="Causas de fondo">
            <textarea rows={2} value={form.causas_fondo} onChange={e => set("causas_fondo", e.target.value)}
              className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500 resize-none"
              placeholder="Causas raíz identificadas..." />
          </FormField>
        </div>

        {/* Fotos */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-[11px] text-gray-500 uppercase font-semibold tracking-wide mb-3">Evidencia fotográfica</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <FotoUpload label="Foto situación inicial" urlActual={editando?.foto_inicial_url}
              onFile={setFotoInicial} file={fotoInicial} />
            <FotoUpload label="Foto situación final (cierre)" urlActual={editando?.foto_final_url}
              onFile={setFotoFinal} file={fotoFinal} />
          </div>
        </div>

        {/* Seguimiento */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-[11px] text-gray-500 uppercase font-semibold tracking-wide mb-3">Seguimiento</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <FormField label="Estatus">
              <select value={form.estatus} onChange={e => set("estatus", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500">
                {ESTATUSES.map(t => <option key={t}>{t}</option>)}
              </select>
            </FormField>
            {form.estatus === "Cerrado" && (
              <FormField label="Fecha de cierre">
                <Input type="date" value={form.fecha_cierre} onChange={e => set("fecha_cierre", e.target.value)} />
              </FormField>
            )}
            {form.estatus === "Cerrado" && (
              <FormField label="Descripción del cierre" className="sm:col-span-2">
                <textarea rows={2} value={form.descripcion_cierre} onChange={e => set("descripcion_cierre", e.target.value)}
                  className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Describe cómo se solucionó el hallazgo..." />
              </FormField>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Btn variant="ghost" onClick={() => { setVista("lista"); setEditando(null); }}>Cancelar</Btn>
        <Btn variant="primary" onClick={guardar} disabled={saving || subiendoFoto}>
          {saving ? "Guardando..." : editando ? "Actualizar" : "Guardar hallazgo"}
        </Btn>
      </div>
    </div>
  );

  // ════════ VISTA: DETALLE ════════
  if (vista === "detalle" && detalle) return (
    <DetalleHallazgo hallazgo={detalle} onClose={() => setVista("lista")} onEditar={() => { abrirEditar(detalle); }} />
  );

  // ════════ VISTA: LISTA ════════
  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-400" /> Reporte de Hallazgos — HGP
          </h3>
          <p className="text-gray-500 text-xs max-w-xl">Registro y seguimiento de hallazgos de seguridad. Formato FR-039 — Central Hidroeléctrica San Gabán III.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4 flex-wrap justify-end">
          <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={importar} />
          <Btn size="sm" variant="ghost" onClick={() => importRef.current?.click()}><Upload size={13} /> Importar</Btn>
          <Btn size="sm" variant="ghost" onClick={exportar}><FileDown size={13} /> Exportar</Btn>
          <Btn size="sm" variant="primary" onClick={() => { setForm(INIT_FORM); setEditando(null); setFotoInicial(null); setFotoFinal(null); setVista("form"); }}>
            <Plus size={13} /> Nuevo hallazgo
          </Btn>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Abiertos" value={kAbiertos} sub="requieren acción" accentColor={kAbiertos ? "red" : "emerald"} />
        <KpiCard label="En proceso" value={kEnProceso} sub="en seguimiento" accentColor={kEnProceso ? "amber" : "emerald"} />
        <KpiCard label="Cerrados" value={kCerrados} sub="levantados" accentColor="green" />
        <KpiCard label="Vencidos" value={kVencidos} sub="plazo superado" accentColor={kVencidos ? "red" : "emerald"} />
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-4 flex-wrap p-3 bg-gray-900/50 border border-gray-800 rounded-xl">
        <Search size={12} className="text-gray-500 shrink-0" />
        <input value={fBuscar} onChange={e => setFBuscar(e.target.value)} placeholder="Buscar por descripción, lugar, supervisor..."
          className="bg-transparent text-xs text-gray-300 focus:outline-none flex-1 min-w-32" />
        <select value={fEstatus} onChange={e => setFEstatus(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500">
          <option value="">Todo estatus</option>
          {ESTATUSES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={fTipo} onChange={e => setFTipo(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500 max-w-[200px]">
          <option value="">Todo tipo</option>
          {TIPOS_HALLAZGO.map(t => <option key={t}>{t}</option>)}
        </select>
        {(fEstatus || fTipo || fBuscar) && (
          <button onClick={() => { setFEstatus(""); setFTipo(""); setFBuscar(""); }}
            className="text-xs text-blue-400 hover:text-blue-300">✕ Limpiar</button>
        )}
        <span className="text-xs text-gray-600 ml-auto">{filtrados.length} hallazgo{filtrados.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Vista móvil: tarjetas */}
      <div className="md:hidden space-y-2.5">
        {loading && <div className="text-center text-gray-600 text-sm py-8 bg-gray-900 border border-gray-800 rounded-xl">Cargando...</div>}
        {!loading && filtrados.map(h => {
          const vencido = h.estatus !== "Cerrado" && h.fecha_limite && h.fecha_limite < hoy;
          return (
            <div key={h.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3.5">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <div className="font-semibold text-white text-sm leading-snug">{h.descripcion}</div>
                  <div className="text-xs text-gray-500 font-mono mt-0.5">{h.fecha_hallazgo}{h.lugar ? ` · ${h.lugar}` : ""}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setDetalle(h); setVista("detalle"); }} className="text-gray-500 hover:text-emerald-400 p-1" title="Ver"><Eye size={15} /></button>
                  <button onClick={() => generarPDFHallazgo(h)} className="text-gray-500 hover:text-blue-400 p-1" title="PDF"><FileDown size={15} /></button>
                  <button onClick={() => abrirEditar(h)} className="text-gray-500 hover:text-blue-400 p-1" title="Editar"><Pencil size={15} /></button>
                  <button onClick={() => eliminar(h.id)} className="text-red-500/60 hover:text-red-400 p-1" title="Eliminar"><Trash2 size={15} /></button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge color={ESTATUS_COLOR[h.estatus] || "gray"}>{h.estatus}</Badge>
                {h.tipo_hallazgo && <Badge color={TIPO_COLOR[h.tipo_hallazgo] || "gray"}>{h.tipo_hallazgo.replace("Clasificados en Riesgo ", "").replace("Riesgo ", "").substring(0, 20)}</Badge>}
                {h.foto_inicial_url && <span className="text-[10px] text-blue-500">📷 con foto</span>}
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs border-t border-gray-800 pt-2.5">
                <div className="truncate"><span className="text-gray-600">Supervisor:</span> <span className="text-gray-400">{h.supervisor_reportante || "—"}</span></div>
                <div>
                  <span className="text-gray-600">F. Límite:</span>{" "}
                  <span className={`font-mono ${vencido ? "text-red-400 font-bold" : "text-gray-400"}`}>{h.fecha_limite || "—"}</span>
                  {vencido && <span className="ml-1 text-[10px] text-red-500">⚠</span>}
                </div>
              </div>
            </div>
          );
        })}
        {!loading && !filtrados.length && (
          <div className="text-center text-gray-600 text-sm py-8 bg-gray-900 border border-gray-800 rounded-xl">
            {hallazgos.length ? "Sin resultados para los filtros." : "Sin hallazgos. Usa \"Nuevo hallazgo\" o importa un Excel."}
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="hidden md:block">
        <WideTableScroll>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800">
            {["Fecha", "Lugar", "Tipo", "Descripción", "Supervisor", "F. Límite", "Estatus", ""].map(h => (
              <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
            {!loading && filtrados.map(h => {
              const vencido = h.estatus !== "Cerrado" && h.fecha_limite && h.fecha_limite < hoy;
              return (
                <tr key={h.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{h.fecha_hallazgo}</td>
                  <td className="px-4 py-3 text-xs text-gray-300">{h.lugar || "—"}</td>
                  <td className="px-4 py-3">
                    {h.tipo_hallazgo
                      ? <Badge color={TIPO_COLOR[h.tipo_hallazgo] || "gray"}>{h.tipo_hallazgo.replace("Clasificados en Riesgo ", "").replace("Riesgo ", "").substring(0, 20)}</Badge>
                      : <span className="text-gray-700 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-200 max-w-xs">
                    <p className="truncate">{h.descripcion}</p>
                    {h.foto_inicial_url && <span className="text-[10px] text-blue-500">📷 con foto</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{h.supervisor_reportante || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                    <span className={vencido ? "text-red-400 font-bold" : "text-gray-500"}>{h.fecha_limite || "—"}</span>
                    {vencido && <span className="ml-1 text-[10px] text-red-500">⚠ vencido</span>}
                  </td>
                  <td className="px-4 py-3"><Badge color={ESTATUS_COLOR[h.estatus] || "gray"}>{h.estatus}</Badge></td>
                  <td className="px-4 py-3"><div className="flex gap-1.5">
                    <button onClick={() => { setDetalle(h); setVista("detalle"); }} className="text-gray-500 hover:text-emerald-400" title="Ver"><Eye size={13} /></button>
                    <button onClick={() => generarPDFHallazgo(h)} className="text-gray-500 hover:text-blue-400" title="Descargar PDF"><FileDown size={13} /></button>
                    <button onClick={() => abrirEditar(h)} className="text-gray-500 hover:text-blue-400" title="Editar"><Pencil size={13} /></button>
                    <button onClick={() => eliminar(h.id)} className="text-red-500/40 hover:text-red-400" title="Eliminar"><Trash2 size={13} /></button>
                  </div></td>
                </tr>
              );
            })}
            {!loading && !filtrados.length && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-600 text-sm">
                {hallazgos.length ? "Sin resultados para los filtros." : "Sin hallazgos. Usa \"Nuevo hallazgo\" o importa un Excel."}
              </td></tr>
            )}
          </tbody>
        </table>
        </WideTableScroll>
      </div>
    </div>
  );
}

// ── Generador PDF individual por hallazgo ──
function cargarImg(src) {
  return new Promise(resolve => {
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext("2d").drawImage(img, 0, 0);
      try { resolve({ data: c.toDataURL("image/png"), w: img.naturalWidth, h: img.naturalHeight }); }
      catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function generarPDFHallazgo(h) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 12, innerW = W - 2 * M;
  const logo = await cargarImg("/logo.jpg");

  // ── Encabezado oficial ──
  const hY = M, hH = 18;
  const c1 = 32, c3 = 52, c2 = innerW - c1 - c3;
  doc.setLineWidth(0.3);
  doc.rect(M, hY, c1, hH); doc.rect(M + c1, hY, c2, hH); doc.rect(M + c1 + c2, hY, c3, hH);
  if (logo) {
    const ratio = Math.min((c1 - 4) / logo.w, (hH - 4) / logo.h);
    const lw = logo.w * ratio, lh = logo.h * ratio;
    doc.addImage(logo.data, "PNG", M + (c1 - lw) / 2, hY + (hH - lh) / 2, lw, lh);
  } else {
    doc.setFontSize(7).setFont(undefined, "bold").text("HYDRO GLOBAL", M + c1 / 2, hY + 9, { align: "center" });
  }
  doc.setFontSize(7).setFont(undefined, "bold").text("DOCUMENTO DE GESTIÓN", M + c1 + c2 / 2, hY + 5, { align: "center" });
  doc.setFontSize(8).setFont(undefined, "bold").text("REPORTE DE HALLAZGOS", M + c1 + c2 / 2, hY + 10, { align: "center" });
  doc.setFontSize(5.5).setFont(undefined, "normal").text("ÁREA DE SEGURIDAD Y SALUD EN EL TRABAJO", M + c1 + c2 / 2, hY + 15, { align: "center" });
  doc.setFontSize(6);
  const cx = M + c1 + c2 + 2;
  doc.text("Código: HGP-SGIII-SST-FR-039", cx, hY + 5);
  doc.text(`Fecha: ${h.fecha_hallazgo || ""}`, cx, hY + 10);
  doc.text("Rev. 00  Pág. 1/1", cx, hY + 15);

  let y = hY + hH + 6;

  // ── Datos del hallazgo ──
  autoTable(doc, {
    startY: y,
    body: [
      ["Proyecto", h.proyecto || "CHSGIII", "Empresa Reportante", h.empresa_reportante || ""],
      ["Empresa Inspeccionada", h.empresa_inspeccionada || "", "Supervisor SST", h.supervisor_reportante || ""],
      ["Lugar / Área", h.lugar || "", "Actividad", h.actividad || ""],
      ["Asignado a Área", h.asignado_area || "", "Fecha Límite", h.fecha_limite || ""],
      ["Tipo de Hallazgo", { content: h.tipo_hallazgo || "", colSpan: 3 }],
      ["Categoría del Riesgo", h.categoria_riesgo || "", "Clasificación", h.clasificacion || ""],
      ["Hallazgo Asociado a", { content: h.hallazgo_asociado || "", colSpan: 3 }],
    ],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.5, lineWidth: 0.1, lineColor: [0, 0, 0] },
    columnStyles: {
      0: { fontStyle: "bold", fillColor: [226, 232, 240], cellWidth: 38 },
      2: { fontStyle: "bold", fillColor: [226, 232, 240], cellWidth: 38 },
    },
    margin: { left: M, right: M },
  });
  y = doc.lastAutoTable.finalY + 4;

  // ── Descripción ──
  const box = (titulo, texto, alto) => {
    doc.setLineWidth(0.3); doc.rect(M, y, innerW, alto);
    doc.setFontSize(7).setFont(undefined, "bold").text(titulo, M + 2, y + 4);
    const lines = doc.setFontSize(8).setFont(undefined, "normal").splitTextToSize(texto || "—", innerW - 4);
    doc.text(lines, M + 2, y + 9);
    y += alto + 3;
  };

  const descLines = doc.splitTextToSize(h.descripcion || "", innerW - 4);
  box("Descripción del Hallazgo", h.descripcion, Math.max(18, 8 + descLines.length * 3.8));
  if (h.medida_correctiva) {
    const l = doc.splitTextToSize(h.medida_correctiva, innerW - 4);
    box("Medida Correctiva", h.medida_correctiva, Math.max(15, 8 + l.length * 3.8));
  }
  if (h.causas_fondo) {
    const l = doc.splitTextToSize(h.causas_fondo, innerW - 4);
    box("Causas de Fondo", h.causas_fondo, Math.max(15, 8 + l.length * 3.8));
  }

  // ── Estatus ──
  doc.setLineWidth(0.3); doc.rect(M, y, innerW, 10);
  doc.setFontSize(7).setFont(undefined, "bold").text("Estatus:", M + 2, y + 6);
  const col = h.estatus === "Cerrado" ? [22, 101, 52] : h.estatus === "En proceso" ? [146, 64, 14] : [185, 28, 28];
  doc.setTextColor(...col).setFontSize(8).setFont(undefined, "bold").text(h.estatus || "Abierto", M + 22, y + 6);
  doc.setTextColor(0);
  if (h.fecha_cierre) { doc.setFontSize(7).setFont(undefined, "normal").text(`Fecha cierre: ${h.fecha_cierre}`, M + 60, y + 6); }
  y += 13;

  // ── Fotos ──
  const fotoH = 65;
  if (h.foto_inicial_url || h.foto_final_url) {
    if (y + fotoH > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 15; }
    doc.setLineWidth(0.3);
    const fw = (innerW - 4) / 2;
    // Foto inicial
    doc.rect(M, y, fw, fotoH);
    doc.setFontSize(7).setFont(undefined, "bold").text("Evidencia — Situación Inicial", M + fw / 2, y + 5, { align: "center" });
    if (h.foto_inicial_url) {
      const fi = await cargarImg(h.foto_inicial_url);
      if (fi) {
        const r = Math.min((fw - 6) / fi.w, (fotoH - 12) / fi.h);
        const iw = fi.w * r, ih = fi.h * r;
        doc.addImage(fi.data, "PNG", M + (fw - iw) / 2, y + 8, iw, ih);
      }
    } else {
      doc.setFontSize(6).setFont(undefined, "italic").setTextColor(150).text("Sin foto", M + fw / 2, y + fotoH / 2, { align: "center" }); doc.setTextColor(0);
    }
    // Foto final
    const fx = M + fw + 4;
    doc.rect(fx, y, fw, fotoH);
    doc.setFontSize(7).setFont(undefined, "bold").text("Evidencia — Situación Final", fx + fw / 2, y + 5, { align: "center" });
    if (h.foto_final_url) {
      const ff = await cargarImg(h.foto_final_url);
      if (ff) {
        const r = Math.min((fw - 6) / ff.w, (fotoH - 12) / ff.h);
        const iw = ff.w * r, ih = ff.h * r;
        doc.addImage(ff.data, "PNG", fx + (fw - iw) / 2, y + 8, iw, ih);
      }
    } else {
      doc.setFontSize(6).setFont(undefined, "italic").setTextColor(150).text("Sin foto", fx + fw / 2, y + fotoH / 2, { align: "center" }); doc.setTextColor(0);
    }
    y += fotoH + 8;
  }

  // ── Firmas ──
  y += 18; // espacio antes de las firmas
  if (y > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 25; }
  const fw2 = innerW / 2;
  [["Supervisor SST Reportante", h.supervisor_reportante], ["VB° Responsable de Área", ""]].forEach(([rol], i) => {
    const x = M + fw2 * i + fw2 / 2;
    doc.line(x - 35, y, x + 35, y);
    doc.setFontSize(7).setFont(undefined, "bold").text(rol, x, y + 4, { align: "center" });
  });

  doc.save(`Hallazgo_HGP_${h.fecha_hallazgo || "sin-fecha"}_${(h.lugar || "").replace(/\s+/g, "_")}.pdf`);
}

// ── Componente subida de foto ──
function FotoUpload({ label, urlActual, onFile, file }) {
  const [preview, setPreview] = useState(null);
  const inputRef = useRef();
  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    onFile(f);
    const r = new FileReader();
    r.onload = ev => setPreview(ev.target.result);
    r.readAsDataURL(f);
    e.target.value = "";
  };
  const img = preview || urlActual;
  return (
    <div>
      <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mb-1.5">{label}</p>
      {img ? (
        <div className="relative">
          <img src={img} alt={label} className="w-full h-40 object-cover rounded-lg border border-gray-700" />
          <button onClick={() => { onFile(null); setPreview(null); }}
            className="absolute top-1.5 right-1.5 bg-red-600 text-white p-1 rounded-full"><X size={11} /></button>
        </div>
      ) : (
        <label className="block border-2 border-dashed border-gray-700 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-800/40 transition-colors">
          <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
          <Camera size={22} className="mx-auto text-gray-600 mb-1" />
          <p className="text-xs text-gray-600">Tomar foto o subir imagen</p>
        </label>
      )}
    </div>
  );
}

// ── Vista detalle de un hallazgo ──
function DetalleHallazgo({ hallazgo: h, onClose, onEditar }) {
  return (
    <div className="max-w-2xl">
      <button onClick={onClose} className="mb-4 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
        <ArrowLeft size={13} /> Volver a la lista
      </button>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold text-sm">Detalle del Hallazgo</h3>
          <p className="text-[11px] text-gray-600 font-mono">{h.fecha_hallazgo} · {h.lugar || "Sin ubicación"}</p>
        </div>
        <div className="flex gap-2">
          <Btn size="sm" variant="ghost" onClick={() => generarPDFHallazgo(h)}><FileDown size={12} /> PDF</Btn>
          <Btn size="sm" variant="ghost" onClick={onEditar}><Pencil size={12} /> Editar</Btn>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge color={ESTATUS_COLOR[h.estatus] || "gray"}>{h.estatus}</Badge>
          {h.tipo_hallazgo && <Badge color={TIPO_COLOR[h.tipo_hallazgo] || "gray"}>{h.tipo_hallazgo.substring(0, 30)}</Badge>}
          {h.clasificacion && <Badge color="gray">{h.clasificacion}</Badge>}
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          {[
            ["Proyecto", h.proyecto], ["Empresa Reportante", h.empresa_reportante],
            ["Empresa Inspeccionada", h.empresa_inspeccionada], ["Supervisor SST", h.supervisor_reportante],
            ["Lugar / Área", h.lugar], ["Actividad", h.actividad],
            ["Asignado a área", h.asignado_area], ["Fecha límite", h.fecha_limite],
            ["Categoría del riesgo", h.categoria_riesgo], ["Hallazgo asociado a", h.hallazgo_asociado],
          ].filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
              <p className="text-gray-600 text-[10px] uppercase font-semibold mb-0.5">{k}</p>
              <p className="text-gray-200">{v}</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <div>
            <p className="text-[10px] text-gray-600 uppercase font-semibold mb-1">Descripción</p>
            <p className="text-gray-200 text-sm leading-relaxed">{h.descripcion}</p>
          </div>
          {h.medida_correctiva && <div>
            <p className="text-[10px] text-gray-600 uppercase font-semibold mb-1">Medida correctiva</p>
            <p className="text-gray-300 text-sm">{h.medida_correctiva}</p>
          </div>}
          {h.causas_fondo && <div>
            <p className="text-[10px] text-gray-600 uppercase font-semibold mb-1">Causas de fondo</p>
            <p className="text-gray-300 text-sm">{h.causas_fondo}</p>
          </div>}
          {h.descripcion_cierre && <div>
            <p className="text-[10px] text-gray-600 uppercase font-semibold mb-1">Descripción del cierre</p>
            <p className="text-gray-300 text-sm">{h.descripcion_cierre}</p>
          </div>}
        </div>

        {(h.foto_inicial_url || h.foto_final_url) && (
          <div className="grid sm:grid-cols-2 gap-4">
            {h.foto_inicial_url && (
              <div>
                <p className="text-[10px] text-gray-600 uppercase font-semibold mb-1.5">Foto situación inicial</p>
                <img src={h.foto_inicial_url} alt="Inicial" className="w-full rounded-lg border border-gray-700" />
              </div>
            )}
            {h.foto_final_url && (
              <div>
                <p className="text-[10px] text-gray-600 uppercase font-semibold mb-1.5">Foto situación final</p>
                <img src={h.foto_final_url} alt="Final" className="w-full rounded-lg border border-gray-700" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
