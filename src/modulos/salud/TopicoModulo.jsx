import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { KpiCard } from '../../components/ui/KpiCard.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Btn } from '../../components/ui/Btn.jsx';
import { ExportBtn } from '../../components/ui/ExportBtn.jsx';
import {
  Upload, Download, Search, Filter, X, ChevronLeft, Info,
  AlertTriangle, Calendar, Activity, User, FileDown, HelpCircle
} from 'lucide-react';

// ─── Partes del cuerpo ───────────────────────────────────────────
export const PARTES_CUERPO = [
  { id: "craneo",  label: "Cráneo / Cabeza" },
  { id: "ojo",     label: "Ojo" },
  { id: "cara",    label: "Cara" },
  { id: "cuello",  label: "Cuello" },
  { id: "torax",   label: "Tórax / Pecho" },
  { id: "espalda", label: "Espalda" },
  { id: "abdomen", label: "Abdomen / Órganos" },
  { id: "brazo",   label: "Brazo" },
  { id: "mano",    label: "Mano / Muñeca" },
  { id: "cadera",  label: "Cadera / Pelvis" },
  { id: "pierna",  label: "Pierna" },
  { id: "pie",     label: "Pie / Tobillo" },
  { id: "otro",    label: "Otra zona" },
];

const GRUPOS_COLORS = {
  "Digestivo":         "#f59e0b",
  "Respiratorio":      "#3b82f6",
  "Dermatológico":     "#10b981",
  "Musculoesquelético":"#ef4444",
  "Neurológico":       "#8b5cf6",
  "Cardiovascular":    "#dc2626",
  "Genitourinario":    "#06b6d4",
  "Traumatológico":    "#f97316",
  "Oftalmológico":     "#84cc16",
  "Preventivo":        "#6b7280",
  "Otros":             "#9ca3af",
};

// ─── Diagrama cuerpo humano ───────────────────────────────────────
function BodyDiagram({ partesCounts = {}, onSelectParte, selectedParte }) {
  const maxCount = Math.max(...Object.values(partesCounts), 1);

  const getColor = (id) => {
    const count = partesCounts[id] || 0;
    if (selectedParte === id) return "rgba(245,158,11,0.85)";
    if (count === 0) return "#1f2937";
    const intensity = count / maxCount;
    return `rgba(220,38,38,${0.25 + intensity * 0.75})`;
  };

  const getStroke = (id) => selectedParte === id ? "#f59e0b" : "#374151";
  const sW = (id) => selectedParte === id ? 2.5 : 1;

  const p = (id) => ({
    fill: getColor(id), stroke: getStroke(id), strokeWidth: sW(id),
    onClick: () => onSelectParte(selectedParte === id ? null : id),
    className: "cursor-pointer transition-all",
    style: { transition: "fill 0.2s" },
  });

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 340" className="w-full max-w-[180px]">
        {/* Cráneo */}
        <ellipse cx="100" cy="30" rx="24" ry="26" {...p("craneo")} />
        {/* Cara / orejas */}
        <ellipse cx="77" cy="30" rx="6" ry="9" {...p("cara")} />
        <ellipse cx="123" cy="30" rx="6" ry="9" {...p("cara")} />
        {/* Ojos */}
        <ellipse cx="91" cy="27" rx="5" ry="4" {...p("ojo")} />
        <ellipse cx="109" cy="27" rx="5" ry="4" {...p("ojo")} />
        {/* Cuello */}
        <rect x="91" y="54" width="18" height="14" rx="3" {...p("cuello")} />
        {/* Tórax */}
        <rect x="62" y="67" width="76" height="64" rx="7" {...p("torax")} />
        {/* Abdomen */}
        <rect x="65" y="129" width="70" height="36" rx="5" {...p("abdomen")} />
        {/* Brazo izquierdo */}
        <rect x="22" y="68" width="36" height="66" rx="12" {...p("brazo")} />
        {/* Brazo derecho */}
        <rect x="142" y="68" width="36" height="66" rx="12" {...p("brazo")} />
        {/* Mano izquierda */}
        <ellipse cx="40" cy="146" rx="16" ry="11" {...p("mano")} />
        {/* Mano derecha */}
        <ellipse cx="160" cy="146" rx="16" ry="11" {...p("mano")} />
        {/* Cadera */}
        <rect x="60" y="163" width="80" height="24" rx="7" {...p("cadera")} />
        {/* Pierna izquierda */}
        <rect x="62" y="185" width="34" height="100" rx="10" {...p("pierna")} />
        {/* Pierna derecha */}
        <rect x="104" y="185" width="34" height="100" rx="10" {...p("pierna")} />
        {/* Pie izquierdo */}
        <ellipse cx="79" cy="291" rx="22" ry="10" {...p("pie")} />
        {/* Pie derecho */}
        <ellipse cx="121" cy="291" rx="22" ry="10" {...p("pie")} />
        {/* Espalda label (superposición) */}
        <rect x="62" y="67" width="76" height="64" rx="7" fill="transparent" stroke="transparent"
          onClick={() => {}} />
      </svg>

      {/* Leyenda de color */}
      <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-500">
        <div className="w-3 h-3 rounded bg-gray-800 border border-gray-700" />
        <span>Sin casos</span>
        <div className="w-3 h-3 rounded" style={{ background: "rgba(220,38,38,0.4)" }} />
        <span>Pocos</span>
        <div className="w-3 h-3 rounded" style={{ background: "rgba(220,38,38,0.9)" }} />
        <span>Muchos</span>
        <div className="w-3 h-3 rounded" style={{ background: "rgba(245,158,11,0.85)" }} />
        <span>Filtrado</span>
      </div>

      {/* Lista de partes clicables */}
      <div className="mt-3 w-full flex flex-wrap gap-1 justify-center">
        {PARTES_CUERPO.map(parte => {
          const count = partesCounts[parte.id] || 0;
          return (
            <button key={parte.id}
              onClick={() => onSelectParte(selectedParte === parte.id ? null : parte.id)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                selectedParte === parte.id
                  ? "bg-amber-900/50 border-amber-600 text-amber-300"
                  : count > 0
                  ? "bg-red-900/20 border-red-900/40 text-red-400"
                  : "bg-gray-800 border-gray-700 text-gray-600"
              }`}>
              {parte.label} {count > 0 ? `(${count})` : ""}
            </button>
          );
        })}
        {/* Espalda (no en SVG front view) */}
        <button
          onClick={() => onSelectParte(selectedParte === "espalda" ? null : "espalda")}
          className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
            selectedParte === "espalda"
              ? "bg-amber-900/50 border-amber-600 text-amber-300"
              : partesCounts["espalda"] > 0
              ? "bg-red-900/20 border-red-900/40 text-red-400"
              : "bg-gray-800 border-gray-700 text-gray-600"
          }`}>
          Espalda {partesCounts["espalda"] > 0 ? `(${partesCounts["espalda"]})` : ""}
        </button>
      </div>
    </div>
  );
}

// ─── Parser de Excel ─────────────────────────────────────────────
function parseExcelAtenciones(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });

  // Buscar fila de encabezado (contiene 'NOMBRE' y 'DNI')
  let headerIdx = 0;
  for (let i = 0; i < Math.min(5, allRows.length); i++) {
    const row = allRows[i].map(c => String(c).toUpperCase());
    if (row.some(c => c.includes("NOMBRE")) && row.some(c => c.includes("DNI"))) {
      headerIdx = i; break;
    }
  }

  const headers = allRows[headerIdx].map(h => String(h || "").toLowerCase().trim().normalize("NFD").replace(/[̀-ͯ]/g, ""));
  const dataRows = allRows.slice(headerIdx + 1);

  // Buscar índice de columna por texto
  const col = (...terms) => {
    for (const term of terms) {
      const idx = headers.findIndex(h => h.includes(term));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const cols = {
    nombre:    col("nombre"),
    dni:       col("dni"),
    fecha:     col("fecha"),
    hora:      col("hora"),
    edad:      col("edad"),
    sexo:      col("sexo"),
    cargo:     col("cargo"),
    empresa:   col("empresa"),
    area:      col("area"),
    diag1:     col("diagnostico", "diagnostico"),
    cie1:      col("cie"),
    caract:    col("caracterist"),
    prescr:    col("prescri"),
    grupo:     col("grupo"),
    respons:   col("responsable"),
    descanso:  headers.findIndex(h => h.includes("descanso") && (h.includes("medico") || h.includes("medic"))),
    restringido: col("restringido"),
    seguimiento: col("seguimi"),
    referencia:  col("referencia"),
    lugar_ref:   col("lugar"),
    observacion: col("observaci"),
    parte_cuerpo: col("parte", "parte del cuerpo", "zona"),
  };

  // N / C / R columns (tipo de atención)
  const nCol = headers.findIndex(h => h === "n");
  const cCol = headers.findIndex(h => h === "c");
  const rCol = headers.findIndex(h => h === "r");

  // Segunda ocurrencia de diagnostico y cie para el segundo diagnóstico
  const diag2Col = headers.findIndex((h, i) => i > cols.diag1 && (h.includes("diagnostico") || h.includes("diagnostico")));
  const cie2Col  = headers.findIndex((h, i) => i > cols.cie1  && h.includes("cie"));

  const get     = (row, idx) => idx >= 0 ? String(row[idx] || "").trim() : "";
  const getBool = (row, idx) => ["si","sí","yes","x","1","true"].includes(String(row[idx] || "").toLowerCase().trim());

  const parseFecha = (v) => {
    if (!v) return null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    const s = String(v);
    if (s.includes("-") || s.includes("/")) {
      const d = new Date(s);
      if (!isNaN(d)) return d.toISOString().slice(0, 10);
    }
    return s.slice(0, 10) || null;
  };

  return dataRows
    .filter(row => get(row, cols.nombre) || get(row, cols.dni))
    .map(row => {
      const nombre = get(row, cols.nombre);
      if (!nombre || nombre === "0") return null;

      let tipo_atencion = "Nueva";
      if (cCol >= 0 && get(row, cCol).toUpperCase() === "X") tipo_atencion = "Control";
      if (rCol >= 0 && get(row, rCol).toUpperCase() === "X") tipo_atencion = "Referencia";

      let parte_cuerpo = [];
      const pcRaw = get(row, cols.parte_cuerpo);
      if (pcRaw) {
        parte_cuerpo = pcRaw.split(/[,;]+/).map(p => p.trim().toLowerCase()).filter(Boolean);
      }

      const diasDescanso = cols.descanso >= 0 && cols.descanso + 1 < row.length
        ? get(row, cols.descanso + 1) : null;

      return {
        nombre_paciente:   nombre,
        dni:               get(row, cols.dni),
        fecha:             parseFecha(get(row, cols.fecha)),
        hora:              get(row, cols.hora),
        edad:              parseInt(get(row, cols.edad)) || null,
        sexo:              get(row, cols.sexo).toUpperCase().slice(0, 1) || null,
        cargo:             get(row, cols.cargo) || null,
        empresa_paciente:  get(row, cols.empresa) || null,
        area:              get(row, cols.area) || null,
        tipo_atencion,
        diagnostico1:      get(row, cols.diag1) || null,
        cie10_1:           get(row, cols.cie1) || null,
        diagnostico2:      get(row, diag2Col) || null,
        cie10_2:           get(row, cie2Col) || null,
        caracteristica:    get(row, cols.caract) || null,
        prescripcion:      get(row, cols.prescr) || null,
        grupo_enfermedad:  get(row, cols.grupo) || null,
        responsable:       get(row, cols.respons) || null,
        descanso_medico:   getBool(row, cols.descanso),
        dias_descanso:     diasDescanso || null,
        trabajo_restringido: getBool(row, cols.restringido),
        requiere_seguimiento: getBool(row, cols.seguimiento),
        referencia:        getBool(row, cols.referencia),
        lugar_referencia:  get(row, cols.lugar_ref) || null,
        observacion:       get(row, cols.observacion) || null,
        parte_cuerpo,
      };
    })
    .filter(Boolean);
}

// ─── Módulo principal ─────────────────────────────────────────────
export default function TopicoModulo({ empresaId }) {
  const [records, setRecords]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [importing, setImporting]       = useState(false);
  const [selected, setSelected]         = useState(null);
  const [selectedParte, setSelectedParte] = useState(null);
  const [showGuide, setShowGuide]       = useState(false);
  const [search, setSearch]             = useState("");
  const [fTipo, setFTipo]               = useState("");
  const [fCaract, setFCaract]           = useState("");
  const [fGrupo, setFGrupo]             = useState("");
  const [fMes, setFMes]                 = useState("");
  const [view, setView]                 = useState("dashboard"); // dashboard | tabla

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("topico_atenciones")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("fecha", { ascending: false })
      .order("hora", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  // ── Import ──────────────────────────────────────────────────────
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = async (ev) => {
      setImporting(true);
      try {
        const rows = parseExcelAtenciones(ev.target.result);
        if (!rows.length) { showToast("No se encontraron datos en el archivo", "error"); setImporting(false); return; }

        const inserts = rows.map(r => ({ ...r, empresa_id: empresaId }));
        const BATCH = 200;
        let inserted = 0;
        for (let i = 0; i < inserts.length; i += BATCH) {
          const { error } = await supabase.from("topico_atenciones").insert(inserts.slice(i, i + BATCH));
          if (error) { showToast("Error al insertar: " + error.message, "error"); setImporting(false); return; }
          inserted += Math.min(BATCH, inserts.length - i);
        }
        showToast(`✅ ${inserted} atenciones importadas`, "success");
        load();
      } catch (err) {
        showToast("Error al leer el archivo: " + err.message, "error");
      }
      setImporting(false);
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Filtros ─────────────────────────────────────────────────────
  const filtered = records.filter(r => {
    if (search && !r.nombre_paciente?.toLowerCase().includes(search.toLowerCase()) && !r.dni?.includes(search)) return false;
    if (fTipo  && r.tipo_atencion   !== fTipo)  return false;
    if (fCaract && r.caracteristica !== fCaract) return false;
    if (fGrupo  && r.grupo_enfermedad !== fGrupo) return false;
    if (fMes    && !r.fecha?.startsWith(fMes)) return false;
    if (selectedParte && !(r.parte_cuerpo || []).includes(selectedParte)) return false;
    return true;
  });

  // ── KPIs ────────────────────────────────────────────────────────
  const total       = records.length;
  const nuevas      = records.filter(r => r.tipo_atencion === "Nueva").length;
  const accidentes  = records.filter(r => r.caracteristica === "ACCIDENTE LABORAL").length;
  const conDescanso = records.filter(r => r.descanso_medico).length;
  const preventivos = records.filter(r => r.caracteristica === "PREVENTIVO").length;

  // ── Grupos para gráfico ──────────────────────────────────────────
  const grupoData = Object.entries(
    records.reduce((acc, r) => {
      const g = r.grupo_enfermedad || "Sin clasificar";
      acc[g] = (acc[g] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));

  // ── Tendencia por fecha ──────────────────────────────────────────
  const fechaData = Object.entries(
    records.reduce((acc, r) => {
      if (!r.fecha) return acc;
      const d = r.fecha.slice(0, 10);
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, {})
  ).sort(([a], [b]) => a.localeCompare(b)).slice(-30).map(([date, count]) => ({
    date: date.slice(5), // MM-DD
    count,
  }));

  // ── Partes del cuerpo ───────────────────────────────────────────
  const partesCounts = records.reduce((acc, r) => {
    (r.parte_cuerpo || []).forEach(p => { acc[p] = (acc[p] || 0) + 1; });
    return acc;
  }, {});

  // ── Meses disponibles ───────────────────────────────────────────
  const mesesDisp = [...new Set(records.map(r => r.fecha?.slice(0, 7)).filter(Boolean))].sort().reverse();

  // ── Opciones de filtro ──────────────────────────────────────────
  const tiposDisp   = [...new Set(records.map(r => r.tipo_atencion).filter(Boolean))];
  const caractDisp  = [...new Set(records.map(r => r.caracteristica).filter(Boolean))];
  const gruposDisp  = [...new Set(records.map(r => r.grupo_enfermedad).filter(Boolean))];

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-600 text-sm">Cargando...</div>;

  return (
    <div>
      {/* ── Guía de importación ─────────────────────── */}
      {showGuide && (
        <Modal title="Guía de importación — Tópico" onClose={() => setShowGuide(false)} wide>
          <div className="space-y-4 text-sm text-gray-300">
            <div className="bg-blue-900/20 border border-blue-900/40 rounded-xl p-4 text-xs text-blue-400">
              El módulo detecta automáticamente las columnas del Excel buscando palabras clave en los encabezados. Compatible con la plantilla de Hydro Global Perú.
            </div>
            <p className="font-semibold text-white">Columnas que detecta automáticamente:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ["Nombre del paciente","NOMBRE DEL PACIENTE"],
                ["DNI","N° DNI"],
                ["Fecha","FECHA"],
                ["Hora","HORA"],
                ["Edad","EDAD"],
                ["Sexo","SEXO"],
                ["Cargo","CARGO"],
                ["Empresa","EMPRESA"],
                ["Área","AREA DE TRABAJO"],
                ["Tipo (N/C/R)","N | C | R (columnas con X)"],
                ["Diagnóstico 1","DIAGNÓSTICO"],
                ["CIE-10","CIE - 10"],
                ["Característica","CARACTERISTICA"],
                ["Prescripción","PRESCRIPCIÓN MEDICA"],
                ["Grupo de enfermedad","GRUPO DE ENFERMEDAD"],
                ["Médico responsable","RESPONSABLE"],
                ["Descanso médico","DESCANSO MEDICO"],
                ["Trabajo restringido","TRABAJO RESTRINGIDO"],
                ["Requiere seguimiento","REQUIERE SEGUIMIENTO"],
              ].map(([campo, columna]) => (
                <div key={campo} className="flex gap-2">
                  <span className="text-gray-400 font-medium w-36 shrink-0">{campo}:</span>
                  <span className="text-gray-600 font-mono">{columna}</span>
                </div>
              ))}
            </div>
            <div className="bg-amber-900/20 border border-amber-900/40 rounded-xl p-3 text-xs text-amber-400">
              <strong>Parte del cuerpo (opcional):</strong> Si quieres registrar la zona afectada, agrega una columna llamada <span className="font-mono">PARTE DEL CUERPO</span> o <span className="font-mono">ZONA</span> con valores como: <span className="font-mono">craneo, torax, brazo, mano, pierna, pie, abdomen, cuello, cadera</span> (separados por coma si son varios).
            </div>
            <div className="flex justify-end">
              <Btn onClick={() => setShowGuide(false)}>Entendido</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal detalle ────────────────────────────── */}
      {selected && (
        <Modal title={`Atención — ${selected.nombre_paciente}`} onClose={() => setSelected(null)} wide>
          <div className="space-y-4">
            {/* Fila de chips de estado */}
            <div className="flex flex-wrap gap-2">
              <Badge color={selected.tipo_atencion === "Nueva" ? "blue" : selected.tipo_atencion === "Control" ? "amber" : "purple"}>
                {selected.tipo_atencion}
              </Badge>
              {selected.caracteristica && (
                <Badge color={selected.caracteristica === "ACCIDENTE LABORAL" ? "red" : selected.caracteristica === "PREVENTIVO" ? "gray" : "green"}>
                  {selected.caracteristica}
                </Badge>
              )}
              {selected.descanso_medico && <Badge color="red">🛌 Descanso médico</Badge>}
              {selected.trabajo_restringido && <Badge color="amber">⚠ Trabajo restringido</Badge>}
              {selected.requiere_seguimiento && <Badge color="purple">🔁 Requiere seguimiento</Badge>}
            </div>
            {/* Info del paciente */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-800/40 rounded-xl p-3 text-xs">
              <div><p className="text-gray-600 mb-0.5">Fecha</p><p className="text-gray-200 font-mono">{selected.fecha || "—"} {selected.hora || ""}</p></div>
              <div><p className="text-gray-600 mb-0.5">DNI</p><p className="text-gray-200 font-mono">{selected.dni || "—"}</p></div>
              <div><p className="text-gray-600 mb-0.5">Edad / Sexo</p><p className="text-gray-200">{selected.edad || "—"} años · {selected.sexo || "—"}</p></div>
              <div><p className="text-gray-600 mb-0.5">Cargo</p><p className="text-gray-200">{selected.cargo || "—"}</p></div>
              <div><p className="text-gray-600 mb-0.5">Empresa</p><p className="text-gray-200">{selected.empresa_paciente || "—"}</p></div>
              <div><p className="text-gray-600 mb-0.5">Área</p><p className="text-gray-200">{selected.area || "—"}</p></div>
              <div><p className="text-gray-600 mb-0.5">Grupo enfermedad</p><p className="text-gray-200">{selected.grupo_enfermedad || "—"}</p></div>
              <div><p className="text-gray-600 mb-0.5">Médico</p><p className="text-gray-200 text-[10px]">{selected.responsable || "—"}</p></div>
            </div>
            {/* Diagnósticos */}
            <div className="space-y-2">
              {selected.diagnostico1 && (
                <div className="bg-gray-800 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-600 mb-1">Diagnóstico 1</p>
                  <p className="text-sm text-white font-medium">{selected.diagnostico1}</p>
                  {selected.cie10_1 && <p className="text-xs text-blue-400 font-mono mt-0.5">CIE-10: {selected.cie10_1}</p>}
                </div>
              )}
              {selected.diagnostico2 && (
                <div className="bg-gray-800 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-600 mb-1">Diagnóstico 2</p>
                  <p className="text-sm text-white font-medium">{selected.diagnostico2}</p>
                  {selected.cie10_2 && <p className="text-xs text-blue-400 font-mono mt-0.5">CIE-10: {selected.cie10_2}</p>}
                </div>
              )}
            </div>
            {/* Prescripción */}
            {selected.prescripcion && (
              <div className="bg-gray-800 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-600 mb-1">Prescripción médica</p>
                <p className="text-sm text-gray-300 leading-relaxed">{selected.prescripcion}</p>
              </div>
            )}
            {/* Parte del cuerpo */}
            {(selected.parte_cuerpo || []).length > 0 && (
              <div className="bg-gray-800 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-600 mb-2">Zona(s) afectada(s)</p>
                <div className="flex flex-wrap gap-1">
                  {selected.parte_cuerpo.map(p => (
                    <Badge key={p} color="red">{PARTES_CUERPO.find(x => x.id === p)?.label || p}</Badge>
                  ))}
                </div>
              </div>
            )}
            {/* Descanso */}
            {selected.descanso_medico && selected.dias_descanso && (
              <div className="bg-red-900/20 border border-red-800 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-600 mb-1">Fechas de descanso médico</p>
                <p className="text-sm text-red-300">{selected.dias_descanso}</p>
              </div>
            )}
            {/* Observaciones */}
            {selected.observacion && (
              <div><p className="text-xs text-gray-600 mb-1">Observaciones</p><p className="text-sm text-gray-400">{selected.observacion}</p></div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Tópico — Atenciones Médicas</h3>
          <p className="text-gray-500 text-xs max-w-xl">Registro e importación de atenciones del tópico. Sube el Excel mensual para generar el dashboard automáticamente.</p>
        </div>
        <div className="flex gap-2 flex-wrap shrink-0">
          <Btn size="sm" variant="ghost" onClick={() => setShowGuide(true)}><HelpCircle size={13} /> Guía</Btn>
          <ExportBtn filename="topico_atenciones" data={records.map(r => ({
            Nombre: r.nombre_paciente, DNI: r.dni, Fecha: r.fecha, Hora: r.hora,
            Edad: r.edad, Sexo: r.sexo, Cargo: r.cargo, Empresa: r.empresa_paciente, Área: r.area,
            Tipo: r.tipo_atencion, Diagnóstico: r.diagnostico1, "CIE-10": r.cie10_1,
            Característica: r.caracteristica, Grupo: r.grupo_enfermedad,
            "Descanso médico": r.descanso_medico ? "Sí" : "No",
            "Fechas descanso": r.dias_descanso || "",
            "Trabajo restringido": r.trabajo_restringido ? "Sí" : "No",
            Responsable: r.responsable, Observación: r.observacion || "",
            "Parte cuerpo": (r.parte_cuerpo || []).join(", "),
          }))} />
          <label className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors cursor-pointer ${importing ? "opacity-50 pointer-events-none" : ""}`}>
            <Upload size={13} /> {importing ? "Importando..." : "Importar Excel"}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
          {records.length > 0 && (
            <button onClick={async () => {
              if (!confirm(`¿Eliminar todos los ${records.length} registros? Esto no se puede deshacer.`)) return;
              await supabase.from("topico_atenciones").delete().eq("empresa_id", empresaId);
              showToast("Registros eliminados", "info"); load();
            }} className="text-xs text-red-500/50 hover:text-red-400 border border-red-900/30 hover:border-red-800 px-2.5 py-1.5 rounded-lg transition-colors">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-900 border border-gray-800 rounded-2xl">
          <div className="w-16 h-16 bg-blue-900/20 border border-blue-900/40 rounded-2xl flex items-center justify-center mb-4">
            <Activity size={28} className="text-blue-400" />
          </div>
          <p className="text-white font-semibold mb-2">Sin atenciones registradas</p>
          <p className="text-gray-500 text-sm max-w-xs mb-5">Sube el Excel mensual del tópico para generar el dashboard automáticamente.</p>
          <label className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium cursor-pointer transition-colors">
            <Upload size={15} /> Importar Excel
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          </label>
        </div>
      ) : (
        <>
          {/* ── Tabs view ────────────────────────── */}
          <div className="flex gap-1 mb-5 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
            <button onClick={() => setView("dashboard")}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${view === "dashboard" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-200"}`}>
              📊 Dashboard
            </button>
            <button onClick={() => setView("tabla")}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${view === "tabla" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-200"}`}>
              📋 Registros ({records.length})
            </button>
          </div>

          {/* ── Filtros comunes ────────────────────── */}
          <div className="flex flex-wrap gap-2 mb-4">
            <select value={fMes} onChange={e => setFMes(e.target.value)}
              className="bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none">
              <option value="">Todo el período</option>
              {mesesDisp.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={fCaract} onChange={e => setFCaract(e.target.value)}
              className="bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none">
              <option value="">Toda característica</option>
              {caractDisp.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={fGrupo} onChange={e => setFGrupo(e.target.value)}
              className="bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none">
              <option value="">Todo grupo</option>
              {gruposDisp.map(g => <option key={g}>{g}</option>)}
            </select>
            {(fMes || fCaract || fGrupo || selectedParte) && (
              <button onClick={() => { setFMes(""); setFCaract(""); setFGrupo(""); setSelectedParte(null); }}
                className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5 border border-gray-800 rounded-lg hover:bg-gray-800 transition-colors">
                ✕ Limpiar
              </button>
            )}
            {(fMes || fCaract || fGrupo || selectedParte) && (
              <span className="text-xs text-gray-600 self-center">{filtered.length} de {records.length} registros</span>
            )}
          </div>

          {/* ════════════════════════════════════════
              VISTA DASHBOARD
              ════════════════════════════════════════ */}
          {view === "dashboard" && (
            <div>
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                <KpiCard label="Total atenciones" value={total} sub="registros" accentColor="blue" />
                <KpiCard label="Consultas nuevas" value={nuevas} sub={`${total ? Math.round(nuevas/total*100) : 0}% del total`} accentColor="blue" />
                <KpiCard label="Accidentes laborales" value={accidentes} sub="reportados" accentColor={accidentes > 0 ? "red" : "emerald"} />
                <KpiCard label="Con descanso médico" value={conDescanso} sub="días de reposo" accentColor={conDescanso > 0 ? "amber" : "emerald"} />
                <KpiCard label="Preventivos" value={preventivos} sub="atenciones prev." accentColor="gray" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
                {/* Cuerpo humano */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-3">Localización de zona afectada</p>
                  {Object.keys(partesCounts).length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-xs text-gray-600">Sin datos de zona afectada.</p>
                      <p className="text-[10px] text-gray-700 mt-1">Agrega columna "PARTE DEL CUERPO" al Excel.</p>
                    </div>
                  ) : (
                    <BodyDiagram
                      partesCounts={partesCounts}
                      onSelectParte={setSelectedParte}
                      selectedParte={selectedParte}
                    />
                  )}
                </div>

                {/* Distribución por grupo */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 lg:col-span-2">
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-4">Distribución por grupo de enfermedad</p>
                  {grupoData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={grupoData} layout="vertical" margin={{ left: 80, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                        <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} width={80} />
                        <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                          labelStyle={{ color: "#fff" }} itemStyle={{ color: "#9ca3af" }} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {grupoData.map((entry, i) => (
                            <Cell key={i} fill={GRUPOS_COLORS[entry.name] || "#6b7280"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-40 text-gray-600 text-xs">Sin datos de grupo de enfermedad</div>
                  )}
                </div>
              </div>

              {/* Tendencia por día */}
              {fechaData.length > 1 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-4">Atenciones por día (últimos 30 días)</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={fechaData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                        labelStyle={{ color: "#fff" }} itemStyle={{ color: "#60a5fa" }} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Atenciones" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Resumen rápido de los últimos 5 registros */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800 flex justify-between items-center">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Últimas atenciones</p>
                  <button onClick={() => setView("tabla")} className="text-xs text-blue-400 hover:text-blue-300">Ver todas →</button>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {records.slice(0, 5).map(r => (
                      <tr key={r.id} onClick={() => setSelected(r)}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-200 text-sm">{r.nombre_paciente}</div>
                          <div className="text-xs text-gray-600">{r.cargo || "—"} · {r.empresa_paciente || "—"}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono whitespace-nowrap">{r.fecha}</td>
                        <td className="px-4 py-3"><Badge color={r.tipo_atencion === "Nueva" ? "blue" : "amber"}>{r.tipo_atencion}</Badge></td>
                        <td className="px-4 py-3 text-xs text-gray-400 max-w-[180px] truncate">{r.diagnostico1 || "—"}</td>
                        <td className="px-4 py-3">
                          {r.caracteristica === "ACCIDENTE LABORAL" && <Badge color="red">Accidente</Badge>}
                          {r.descanso_medico && <Badge color="amber">Descanso</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════
              VISTA TABLA
              ════════════════════════════════════════ */}
          {view === "tabla" && (
            <div>
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por nombre o DNI..."
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500 placeholder-gray-600" />
                </div>
                <select value={fTipo} onChange={e => setFTipo(e.target.value)}
                  className="bg-gray-900 border border-gray-800 rounded-xl px-2 py-2 text-xs text-gray-300 focus:outline-none">
                  <option value="">Todo tipo</option>
                  {tiposDisp.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: "900px" }}>
                  <thead>
                    <tr className="border-b border-gray-800">
                      {["Fecha","Paciente","Tipo","Característica","Diagnóstico","Grupo","Zona","Descanso",""].map(h => (
                        <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 200).map(r => (
                      <tr key={r.id} onClick={() => setSelected(r)}
                        className={`border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer transition-colors ${r.caracteristica === "ACCIDENTE LABORAL" ? "border-l-2 border-red-600" : ""}`}>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{r.fecha}<br/><span className="text-gray-700">{r.hora}</span></td>
                        <td className="px-4 py-3">
                          <div className="text-gray-200 font-medium text-sm">{r.nombre_paciente}</div>
                          <div className="text-xs text-gray-600">{r.dni} · {r.sexo}{r.edad ? ` · ${r.edad}a` : ""}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge color={r.tipo_atencion === "Nueva" ? "blue" : r.tipo_atencion === "Control" ? "amber" : "purple"}>{r.tipo_atencion}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{r.caracteristica || "—"}</td>
                        <td className="px-4 py-3 max-w-[180px]">
                          <div className="text-xs text-gray-300 truncate">{r.diagnostico1 || "—"}</div>
                          {r.cie10_1 && <div className="text-[10px] text-blue-500 font-mono">{r.cie10_1}</div>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{r.grupo_enfermedad || "—"}</td>
                        <td className="px-4 py-3">
                          {(r.parte_cuerpo || []).length > 0 ? (
                            <div className="flex flex-wrap gap-0.5">
                              {r.parte_cuerpo.slice(0, 2).map(p => (
                                <span key={p} className="text-[10px] px-1.5 py-0.5 bg-red-900/20 border border-red-900/40 text-red-400 rounded">{PARTES_CUERPO.find(x => x.id === p)?.label || p}</span>
                              ))}
                            </div>
                          ) : <span className="text-gray-700 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {r.descanso_medico && <Badge color="red">Sí</Badge>}
                          {!r.descanso_medico && <span className="text-gray-700 text-xs">No</span>}
                        </td>
                        <td className="px-4 py-3">
                          <button className="text-xs text-blue-400 hover:text-blue-300 border border-blue-900 hover:border-blue-700 px-2 py-1 rounded-lg transition-colors" onClick={e => { e.stopPropagation(); setSelected(r); }}>Ver</button>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-600 text-sm">Sin resultados para los filtros aplicados.</td></tr>
                    )}
                    {filtered.length > 200 && (
                      <tr><td colSpan={9} className="px-4 py-3 text-center text-gray-600 text-xs">Mostrando 200 de {filtered.length}. Usa los filtros para refinar.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
