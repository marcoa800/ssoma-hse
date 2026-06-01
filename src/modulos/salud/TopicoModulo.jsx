import { useState, useEffect, useRef } from 'react';
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
  const [bodyView, setBodyView] = useState("front"); // "front" | "back"
  const total = Object.values(partesCounts).reduce((a, b) => a + b, 0);
  const maxCount = Math.max(...Object.values(partesCounts), 1);

  // 5-level color scale
  const levelColor = (id) => {
    if (selectedParte === id) return "rgba(245,158,11,0.9)";
    const count = partesCounts[id] || 0;
    if (count === 0) return "#1f2937";
    const r = count / maxCount;
    if (r <= 0.20) return "rgba(254,202,202,0.75)";   // muy pocos
    if (r <= 0.40) return "rgba(252,165,165,0.80)";   // pocos
    if (r <= 0.65) return "rgba(239,68,68,0.75)";     // moderados
    if (r <= 0.85) return "rgba(220,38,38,0.85)";     // muchos
    return "rgba(153,27,27,0.95)";                     // crítico
  };

  const strokeColor = (id) => selectedParte === id ? "#f59e0b" : (partesCounts[id] ? "#4b5563" : "#374151");
  const strokeW     = (id) => selectedParte === id ? 2.5 : 1;

  const region = (id, title) => ({
    fill: levelColor(id),
    stroke: strokeColor(id),
    strokeWidth: strokeW(id),
    onClick: () => onSelectParte(selectedParte === id ? null : id),
    className: "cursor-pointer",
    style: { transition: "fill 0.25s, stroke 0.25s" },
    ...(title ? { role: "button", "aria-label": title } : {}),
  });

  // Badge de conteo sobre la zona
  const Badge = ({ id, cx, cy }) => {
    const n = partesCounts[id] || 0;
    if (!n) return null;
    return (
      <g style={{ pointerEvents: "none" }}>
        <circle cx={cx} cy={cy} r={9} fill="#111827" stroke={selectedParte === id ? "#f59e0b" : "#6b7280"} strokeWidth={1.5} />
        <text x={cx} y={cy + 4} textAnchor="middle" fill="white" fontSize={8} fontWeight="bold">{n}</text>
      </g>
    );
  };

  const FrontBody = () => (
    <>
      {/* ── Cráneo ── */}
      <ellipse cx="100" cy="28" rx="26" ry="28" {...region("craneo","Cráneo")} />
      <Badge id="craneo" cx={100} cy={28} />

      {/* ── Cara (orejas + rasgos) ── */}
      <ellipse cx="75"  cy="28" rx="7" ry="10" {...region("cara","Cara")} />
      <ellipse cx="125" cy="28" rx="7" ry="10" {...region("cara","Cara")} />

      {/* ── Ojos ── */}
      <ellipse cx="89"  cy="23" rx="7" ry="5"  {...region("ojo","Ojo")} />
      <ellipse cx="111" cy="23" rx="7" ry="5"  {...region("ojo","Ojo")} />

      {/* ── Cuello ── */}
      <path d="M90,55 L93,70 L107,70 L110,55 Z" {...region("cuello","Cuello")} />
      <Badge id="cuello" cx={100} cy={63} />

      {/* ── Tórax ── */}
      <path d="M58,70 Q50,72 46,95 L48,135 Q50,142 62,143 L138,143 Q150,142 152,135 L154,95 Q150,72 142,70 Z"
        {...region("torax","Tórax")} />
      <Badge id="torax" cx={100} cy={107} />

      {/* ── Abdomen ── */}
      <path d="M62,143 L138,143 Q142,158 140,172 Q130,180 100,180 Q70,180 60,172 Q58,158 62,143 Z"
        {...region("abdomen","Abdomen")} />
      <Badge id="abdomen" cx={100} cy={161} />

      {/* ── Brazo izq ── */}
      <path d="M24,72 Q14,76 10,105 L12,135 Q14,145 26,148 L46,145 L48,95 L38,72 Z"
        {...region("brazo","Brazo")} />
      {/* ── Brazo der ── */}
      <path d="M176,72 Q186,76 190,105 L188,135 Q186,145 174,148 L154,145 L152,95 L162,72 Z"
        {...region("brazo","Brazo")} />
      <Badge id="brazo" cx={18} cy={110} />

      {/* ── Mano izq ── */}
      <ellipse cx="18"  cy="160" rx="14" ry="12" {...region("mano","Mano")} />
      {/* ── Mano der ── */}
      <ellipse cx="182" cy="160" rx="14" ry="12" {...region("mano","Mano")} />
      <Badge id="mano" cx={18} cy={160} />

      {/* ── Cadera ── */}
      <path d="M58,180 Q52,192 55,202 L145,202 Q148,192 142,180 Z"
        {...region("cadera","Cadera")} />
      <Badge id="cadera" cx={100} cy={192} />

      {/* ── Pierna izq ── */}
      <path d="M55,202 L76,202 L80,298 L52,298 Z" {...region("pierna","Pierna")} />
      {/* ── Pierna der ── */}
      <path d="M124,202 L145,202 L148,298 L120,298 Z" {...region("pierna","Pierna")} />
      <Badge id="pierna" cx={66} cy={250} />

      {/* ── Pie izq ── */}
      <ellipse cx="66"  cy="307" rx="20" ry="10" {...region("pie","Pie")} />
      {/* ── Pie der ── */}
      <ellipse cx="134" cy="307" rx="20" ry="10" {...region("pie","Pie")} />
      <Badge id="pie" cx={66} cy={307} />
    </>
  );

  const BackBody = () => (
    <>
      {/* ── Occipucio ── */}
      <ellipse cx="100" cy="28" rx="26" ry="28" {...region("craneo","Cráneo posterior")} />
      <Badge id="craneo" cx={100} cy={28} />

      {/* ── Nuca ── */}
      <path d="M90,55 L93,70 L107,70 L110,55 Z" {...region("cuello","Cuello posterior")} />

      {/* ── Espalda alta + zona lumbar ── */}
      <path d="M58,70 Q50,72 46,95 L48,180 Q55,186 100,186 Q145,186 152,180 L154,95 Q150,72 142,70 Z"
        {...region("espalda","Espalda")} />
      <Badge id="espalda" cx={100} cy={125} />

      {/* ── Brazo posterior izq ── */}
      <path d="M24,72 Q14,76 10,105 L12,135 Q14,145 26,148 L46,145 L48,95 L38,72 Z"
        {...region("brazo","Brazo")} />
      {/* ── Brazo posterior der ── */}
      <path d="M176,72 Q186,76 190,105 L188,135 Q186,145 174,148 L154,145 L152,95 L162,72 Z"
        {...region("brazo","Brazo")} />
      <Badge id="brazo" cx={18} cy={110} />

      {/* ── Mano posterior ── */}
      <ellipse cx="18"  cy="160" rx="14" ry="12" {...region("mano","Mano")} />
      <ellipse cx="182" cy="160" rx="14" ry="12" {...region("mano","Mano")} />

      {/* ── Glúteos / cadera posterior ── */}
      <path d="M55,186 Q52,200 56,208 L144,208 Q148,200 145,186 Z"
        {...region("cadera","Cadera")} />

      {/* ── Pierna posterior ── */}
      <path d="M56,208 L76,208 L80,298 L52,298 Z" {...region("pierna","Pierna")} />
      <path d="M124,208 L144,208 L148,298 L120,298 Z" {...region("pierna","Pierna")} />
      <Badge id="pierna" cx={66} cy={253} />

      {/* ── Pie posterior ── */}
      <ellipse cx="66"  cy="307" rx="20" ry="10" {...region("pie","Pie")} />
      <ellipse cx="134" cy="307" rx="20" ry="10" {...region("pie","Pie")} />
      <Badge id="pie" cx={66} cy={307} />
    </>
  );

  // Ranking de zonas más afectadas
  const ranking = PARTES_CUERPO
    .filter(p => (partesCounts[p.id] || 0) > 0)
    .sort((a, b) => (partesCounts[b.id] || 0) - (partesCounts[a.id] || 0));

  return (
    <div className="flex gap-4">
      {/* ── Columna izquierda: diagrama ── */}
      <div className="flex flex-col items-center shrink-0" style={{ width: 170 }}>
        {/* Toggle front/back */}
        <div className="flex bg-gray-800 rounded-lg p-0.5 mb-3 w-full">
          <button onClick={() => setBodyView("front")}
            className={`flex-1 py-1 rounded-md text-[10px] font-semibold transition-all ${bodyView === "front" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-300"}`}>
            ▶ Frontal
          </button>
          <button onClick={() => setBodyView("back")}
            className={`flex-1 py-1 rounded-md text-[10px] font-semibold transition-all ${bodyView === "back" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-300"}`}>
            ◀ Posterior
          </button>
        </div>

        {/* SVG cuerpo */}
        <svg viewBox="0 0 200 320" className="w-full" style={{ maxHeight: 280 }}>
          {bodyView === "front" ? <FrontBody /> : <BackBody />}
        </svg>

        {/* Leyenda escala */}
        <div className="mt-2 w-full">
          <div className="flex items-center gap-1 justify-center">
            {[
              { bg: "#1f2937", label: "0" },
              { bg: "rgba(254,202,202,0.75)", label: "" },
              { bg: "rgba(252,165,165,0.8)",  label: "" },
              { bg: "rgba(239,68,68,0.75)",   label: "" },
              { bg: "rgba(220,38,38,0.85)",   label: "" },
              { bg: "rgba(153,27,27,0.95)",   label: "+" },
            ].map((l, i) => (
              <div key={i} className="w-5 h-3 rounded-sm border border-gray-700" style={{ background: l.bg }} />
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-gray-600 mt-0.5 px-0.5">
            <span>Sin casos</span><span>Crítico</span>
          </div>
        </div>
      </div>

      {/* ── Columna derecha: ranking ── */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wide mb-2">
          Zonas afectadas · {total} casos totales
        </p>

        {ranking.length === 0 ? (
          <div className="text-xs text-gray-600 py-4 text-center">
            Sin datos de zona afectada.<br />
            <span className="text-[10px]">Agrega columna "PARTE DEL CUERPO" al Excel.</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {ranking.map((parte, i) => {
              const count = partesCounts[parte.id] || 0;
              const pct   = total > 0 ? Math.round(count / total * 100) : 0;
              const isSelected = selectedParte === parte.id;
              return (
                <button key={parte.id}
                  onClick={() => onSelectParte(isSelected ? null : parte.id)}
                  className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-all text-left ${
                    isSelected
                      ? "bg-amber-900/30 border border-amber-700"
                      : "hover:bg-gray-800 border border-transparent"
                  }`}>
                  {/* Ranking # */}
                  <span className="text-gray-600 font-mono w-4 shrink-0">{i + 1}</span>
                  {/* Nombre zona */}
                  <span className={`w-24 truncate shrink-0 ${isSelected ? "text-amber-300" : "text-gray-300"}`}>
                    {parte.label}
                  </span>
                  {/* Barra */}
                  <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: isSelected ? "#f59e0b" : "rgba(220,38,38,0.8)"
                      }} />
                  </div>
                  {/* Conteo */}
                  <span className="text-gray-400 font-mono w-5 text-right shrink-0">{count}</span>
                  {/* % */}
                  <span className="text-gray-600 w-8 text-right shrink-0">{pct}%</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Hint */}
        {ranking.length > 0 && (
          <p className="text-[10px] text-gray-700 mt-3">
            {selectedParte
              ? `Filtrando por "${PARTES_CUERPO.find(p => p.id === selectedParte)?.label}". Haz clic de nuevo para quitar el filtro.`
              : "Haz clic en una zona del cuerpo o del ranking para filtrar los registros."}
          </p>
        )}
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

              {/* Cuerpo humano — ancho completo */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5">
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-4">
                  Localización de zona afectada
                  {selectedParte && <span className="ml-2 text-amber-400 normal-case">· filtrando por {PARTES_CUERPO.find(p => p.id === selectedParte)?.label}</span>}
                </p>
                <BodyDiagram
                  partesCounts={partesCounts}
                  onSelectParte={setSelectedParte}
                  selectedParte={selectedParte}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
                {/* placeholder para mantener estructura grid */}
                <div className="hidden" />

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
