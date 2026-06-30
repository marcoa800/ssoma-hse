import { useState, useEffect, useRef } from 'react';
import { fmtFecha, calcularEdad } from '../../lib/helpers.js';
import { HumanBody } from 'react-body-medic';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { supabase, puedeEliminar } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { KpiCard } from '../../components/ui/KpiCard.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Btn } from '../../components/ui/Btn.jsx';
import { ExportBtn } from '../../components/ui/ExportBtn.jsx';
import { WideTableScroll } from '../../components/ui/WideTableScroll.jsx';
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
// Mapeo: nuestros IDs → IDs del paquete react-body-medic
const PKG_MAP = {
  craneo:  ["body-model-head", "body-model-head-back"],
  ojo:     ["body-model-eyes"],
  cara:    ["body-model-nose", "body-model-oral_cavity", "body-model-ears", "body-model-ears-back"],
  cuello:  ["body-model-neck_or_throat", "body-model-nape_of_neck"],
  torax:   ["body-model-chest"],
  abdomen: ["body-model-upper_abdomen", "body-model-mid_abdomen", "body-model-lower_abdomen"],
  espalda: ["body-model-back", "body-model-lower_back"],
  brazo:   ["body-model-upper_arm", "body-model-forearm", "body-model-upper_arm-back", "body-model-forearm-back", "body-model-elbow"],
  mano:    ["body-model-hand", "body-model-hand-back"],
  cadera:  ["body-model-sexual_organs", "body-model-buttocks"],
  pierna:  ["body-model-thigh", "body-model-knee", "body-model-lower_leg", "body-model-thigh-back", "body-model-lower_leg-back"],
  pie:     ["body-model-foot", "body-model-foot-back"],
};

// Mapa inverso: ID del paquete → nuestro ID
const PKG_REVERSE = Object.fromEntries(
  Object.entries(PKG_MAP).flatMap(([ourId, pkgIds]) => pkgIds.map(pid => [pid, ourId]))
);

function BodyDiagram({ partesCounts = {}, onSelectParte, selectedParte }) {
  const total = Object.values(partesCounts).reduce((a, b) => a + b, 0);
  const maxCount = Math.max(...Object.values(partesCounts), 1);

  // Color por zona según conteo
  const heatColor = (ourId) => {
    if (selectedParte === ourId) return "rgba(245,158,11,0.88)";
    const n = partesCounts[ourId] || 0;
    if (!n) return "transparent";
    const r = n / maxCount;
    if (r <= 0.20) return "rgba(254,202,202,0.80)";
    if (r <= 0.40) return "rgba(252,165,165,0.88)";
    if (r <= 0.65) return "rgba(239,68,68,0.80)";
    if (r <= 0.85) return "rgba(220,38,38,0.88)";
    return "rgba(185,28,28,0.96)";
  };

  // Inyectar CSS de heatmap en los paths del SVG del paquete
  useEffect(() => {
    const styleId = "topico-body-heatmap";
    let el = document.getElementById(styleId);
    if (!el) { el = document.createElement("style"); el.id = styleId; document.head.appendChild(el); }

    // CSS variables para colores base del paquete (tema oscuro)
    const base = `
      .sc-body-model-svg { filter: drop-shadow(0 0 8px rgba(59,130,246,0.15)); }
      .sc-body-model-svg__stroke { fill: #374151 !important; }
      .sc-body-model-svg__path { fill: rgba(30,41,59,0.7) !important; cursor: pointer; }
      .sc-body-model-svg__path:hover { fill: rgba(100,116,139,0.5) !important; }
    `;

    // CSS por zona según intensidad
    const zoneRules = Object.entries(PKG_MAP).map(([ourId, pkgIds]) => {
      const color = heatColor(ourId);
      if (color === "transparent") return "";
      const selectors = pkgIds.map(id => `#${id}.sc-body-model-svg__path`).join(", ");
      const hoverSelectors = pkgIds.map(id => `#${id}.sc-body-model-svg__path:hover`).join(", ");
      return `${selectors} { fill: ${color} !important; }
              ${hoverSelectors} { opacity: 0.85; }`;
    }).join("\n");

    el.textContent = base + zoneRules;
    return () => { if (el?.parentNode) el.parentNode.removeChild(el); };
  }, [partesCounts, selectedParte]);

  // Referencia al contenedor del SVG para añadir listeners directos
  const containerRef = useRef(null);
  // Ref para el handler actual (evita stale closures sin re-añadir listeners)
  const clickHandlerRef = useRef(null);
  clickHandlerRef.current = (ourId) => {
    onSelectParte(selectedParte === ourId ? null : ourId);
  };

  // Añadir click listeners directamente a los paths del SVG del paquete
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onClick = (e) => {
      e.stopPropagation();
      const pathId = e.currentTarget.id || e.target.id;
      const ourId = PKG_REVERSE[pathId];
      if (ourId && clickHandlerRef.current) clickHandlerRef.current(ourId);
    };

    // El SVG puede tardar un frame en renderizarse — intentamos varias veces
    let attempts = 0;
    const attach = () => {
      const paths = container.querySelectorAll('.sc-body-model-svg__path');
      if (paths.length === 0 && attempts < 10) {
        attempts++;
        setTimeout(attach, 150);
        return;
      }
      paths.forEach(path => {
        path.style.cursor = 'pointer';
        path.addEventListener('click', onClick);
      });
    };
    attach();

    return () => {
      const paths = container.querySelectorAll('.sc-body-model-svg__path');
      paths.forEach(path => path.removeEventListener('click', onClick));
    };
  }, []); // Solo al montar

  const ranking = PARTES_CUERPO.filter(p => (partesCounts[p.id]||0)>0).sort((a,b)=>(partesCounts[b.id]||0)-(partesCounts[a.id]||0));

  return (
    <div className="flex gap-5">
      {/* ── Cuerpo humano — paquete react-body-medic ── */}
      <div className="shrink-0" style={{ width: 220 }}>
        <p className="text-[10px] text-gray-600 mb-2 text-center">Haz clic en una zona para filtrar</p>
        <div ref={containerRef} style={{ maxWidth: 200, margin: "0 auto" }}>
          <HumanBody />
        </div>
        {/* Escala de color */}
        <div className="mt-3 px-2">
          <div className="flex gap-0.5">
            {["rgba(30,41,59,0.7)","rgba(254,202,202,0.80)","rgba(252,165,165,0.88)","rgba(239,68,68,0.80)","rgba(220,38,38,0.88)","rgba(185,28,28,0.96)"].map((bg,i)=>(
              <div key={i} className="flex-1 h-2 rounded-sm border border-gray-800" style={{background:bg}} />
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-gray-600 mt-1">
            <span>0 casos</span><span>Crítico</span>
          </div>
        </div>
      </div>

      {/* ── Ranking lateral ── */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wide mb-3">
          Zonas afectadas · {total} caso{total!==1?"s":""} totales
        </p>
        {ranking.length === 0 ? (
          <div className="text-xs text-gray-600 py-6 text-center">
            Sin datos de zona afectada.<br />
            <span className="text-[10px] text-gray-700 mt-1 block">Agrega la columna <span className="font-mono bg-gray-800 px-1 rounded">PARTE DEL CUERPO</span> al Excel.</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {ranking.map((parte, i) => {
              const count = partesCounts[parte.id]||0;
              const pct = total>0 ? Math.round(count/total*100) : 0;
              const isSel = selectedParte === parte.id;
              return (
                <button key={parte.id} onClick={() => onSelectParte(isSel?null:parte.id)}
                  className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all text-left ${isSel?"bg-amber-900/30 border border-amber-700":"hover:bg-gray-800 border border-transparent"}`}>
                  <span className="text-gray-600 font-mono w-4 text-center shrink-0">{i+1}</span>
                  <span className={`w-28 truncate shrink-0 font-medium ${isSel?"text-amber-300":"text-gray-300"}`}>{parte.label}</span>
                  <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{width:`${pct}%`,background:isSel?"#f59e0b":"rgba(220,38,38,0.8)"}} />
                  </div>
                  <span className="text-gray-300 font-mono font-bold w-5 text-right shrink-0">{count}</span>
                  <span className="text-gray-600 w-9 text-right shrink-0">{pct}%</span>
                </button>
              );
            })}
          </div>
        )}
        {ranking.length > 0 && (
          <p className="text-[10px] text-gray-700 mt-4 leading-relaxed">
            {selectedParte
              ? <>Filtrando por <span className="text-amber-500">"{PARTES_CUERPO.find(p=>p.id===selectedParte)?.label}"</span>. Clic de nuevo para quitar.</>
              : "Haz clic en el cuerpo o en el ranking para filtrar los registros."}
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
const CARACTERISTICAS = ["ENFERMEDAD COMÚN", "ACCIDENTE LABORAL", "ACCIDENTE COMÚN", "ENFERMEDAD OCUPACIONAL", "PREVENTIVO", "CONTROL"];
const GRUPOS_ENF = ["Digestivo", "Respiratorio", "Dermatológico", "Musculoesquelético", "Neurológico", "Cardiovascular", "Genitourinario", "Traumatológico", "Oftalmológico", "Preventivo", "Otros"];

export default function TopicoModulo({ empresaId, empresa }) {
  const esComindustria = (empresa?.nombre || "").toLowerCase().includes("comindustria");
  const [records, setRecords]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [importing, setImporting]       = useState(false);
  const [selected, setSelected]         = useState(null);
  const [formRec, setFormRec]           = useState(null);  // registro en edición/creación
  const [savingRec, setSavingRec]       = useState(false);
  const [historia, setHistoria]         = useState(null);  // { dni, nombre, list }
  const [catalogo, setCatalogo]         = useState([]);    // inventario de medicamentos
  const [catOpen, setCatOpen]           = useState(false);
  const [catForm, setCatForm]           = useState(null);  // medicamento en edición
  const [catSaving, setCatSaving]       = useState(false);
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

  // ── Inventario de medicamentos (catálogo para el selector + futuro kárdex) ──
  const loadCatalogo = async () => {
    const { data } = await supabase.from("medicamentos").select("*")
      .eq("empresa_id", empresaId).eq("activo", true).order("nombre");
    setCatalogo(data || []);
  };
  useEffect(() => { if (empresaId && esComindustria) loadCatalogo(); }, [empresaId]);

  // Trabajadores del directorio (para autocompletar el nombre del paciente)
  const [trabajadores, setTrabajadores] = useState([]);
  useEffect(() => {
    if (!empresaId || !esComindustria) return;
    supabase.from("trabajadores").select("nombre,dni,cargo,area,fecha_nacimiento,genero").eq("empresa_id", empresaId).order("nombre")
      .then(({ data }) => setTrabajadores(data || []));
  }, [empresaId]);
  // Al escribir/elegir el nombre, si coincide con un trabajador, autocompleta sus datos
  const setNombrePaciente = (v) => setFormRec(f => {
    const w = trabajadores.find(t => (t.nombre || "").toLowerCase() === v.toLowerCase());
    if (!w) return { ...f, nombre_paciente: v };
    return { ...f, nombre_paciente: v, dni: w.dni || f.dni, cargo: w.cargo || f.cargo, area: w.area || f.area,
      edad: calcularEdad(w.fecha_nacimiento) || f.edad, sexo: (w.genero || "").toUpperCase().slice(0, 1) || f.sexo };
  });

  const setCF = (k, v) => setCatForm(f => ({ ...f, [k]: v }));
  const guardarMed = async () => {
    if (!catForm.nombre?.trim()) { showToast("El nombre del medicamento es obligatorio", "error"); return; }
    setCatSaving(true);
    const payload = {
      empresa_id: empresaId, nombre: catForm.nombre.trim(), presentacion: catForm.presentacion || null,
      concentracion: catForm.concentracion || null, unidad: catForm.unidad || "unidad",
      stock: parseFloat(catForm.stock) || 0, stock_minimo: parseFloat(catForm.stock_minimo) || 0,
      lote: catForm.lote || null, fecha_vencimiento: catForm.fecha_vencimiento || null,
    };
    const { error } = catForm.id
      ? await supabase.from("medicamentos").update(payload).eq("id", catForm.id)
      : await supabase.from("medicamentos").insert(payload);
    setCatSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast(catForm.id ? "Medicamento actualizado" : "Medicamento agregado", "success");
    setCatForm(null); loadCatalogo();
  };
  const eliminarMed = async (id) => {
    if (!confirm("¿Eliminar este medicamento del inventario?")) return;
    await supabase.from("medicamentos").delete().eq("id", id);
    showToast("Eliminado", "info"); loadCatalogo();
  };
  const nuevoMed = () => setCatForm({ nombre: "", presentacion: "", concentracion: "", unidad: "unidad", stock: "", stock_minimo: "", lote: "", fecha_vencimiento: "" });
  const [impMeds, setImpMeds] = useState(false);
  // Descarga plantilla de inventario
  const plantillaMeds = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["NOMBRE", "CONCENTRACION", "PRESENTACION", "UNIDAD", "STOCK", "STOCK MINIMO", "LOTE", "FECHA VENCIMIENTO"],
      ["Paracetamol", "500mg", "Tableta", "unidad", 100, 20, "L-2026", "2027-05-01"],
      ["Ibuprofeno", "400mg", "Tableta", "unidad", 60, 15, "L-2025", "2026-12-31"],
    ]);
    ws["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 18 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Medicamentos");
    XLSX.writeFile(wb, "plantilla_inventario_medicamentos.xlsx");
  };
  // Importa inventario desde Excel (actualiza por nombre+concentración, o inserta)
  const importarMeds = (e) => {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = "";
    const reader = new FileReader();
    reader.onload = async (ev) => {
      setImpMeds(true);
      try {
        const wb = XLSX.read(ev.target.result, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });
        const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
        let hIdx = 0;
        for (let i = 0; i < Math.min(5, rows.length); i++) {
          if (rows[i].some(c => norm(c).includes("nombre") || norm(c).includes("medicament"))) { hIdx = i; break; }
        }
        const header = (rows[hIdx] || []).map(norm);
        const col = (...terms) => { for (const t of terms) { const idx = header.findIndex(h => h.includes(t)); if (idx >= 0) return idx; } return -1; };
        const cN = col("nombre", "medicament", "producto", "descripcion");
        const cConc = col("concentr"), cPres = col("presentac", "forma"), cUni = col("unidad", "medida");
        const cStock = col("stock", "cantidad", "saldo", "existencia"), cMin = col("minimo", "stock min");
        const cLote = col("lote"), cVenc = col("vencim", "caducidad", "expira");
        if (cN < 0) { showToast("No se encontró la columna de Nombre/Medicamento", "error"); setImpMeds(false); return; }
        const get = (r, i) => i >= 0 ? String(r[i] || "").trim() : "";
        const num = v => parseFloat(String(v).replace(/,/g, "")) || 0;
        const fecha = v => { if (!v) return null; if (v instanceof Date) return v.toISOString().slice(0, 10); const d = new Date(v); return isNaN(d) ? null : d.toISOString().slice(0, 10); };
        const parsed = rows.slice(hIdx + 1).map(r => {
          const nombre = get(r, cN); if (!nombre) return null;
          return { empresa_id: empresaId, nombre, concentracion: get(r, cConc) || null, presentacion: get(r, cPres) || null,
            unidad: get(r, cUni) || "unidad", stock: num(get(r, cStock)), stock_minimo: num(get(r, cMin)),
            lote: get(r, cLote) || null, fecha_vencimiento: fecha(cVenc >= 0 ? r[cVenc] : "") };
        }).filter(Boolean);
        if (!parsed.length) { showToast("No se reconocieron medicamentos en el Excel", "error"); setImpMeds(false); return; }
        const idxBy = {};
        catalogo.forEach(c => { idxBy[`${(c.nombre || "").toLowerCase()}|${(c.concentracion || "").toLowerCase()}`] = c.id; });
        let nuevos = 0, act = 0;
        for (const p of parsed) {
          const existingId = idxBy[`${p.nombre.toLowerCase()}|${(p.concentracion || "").toLowerCase()}`];
          if (existingId) { const { error } = await supabase.from("medicamentos").update(p).eq("id", existingId); if (!error) act++; }
          else { const { error } = await supabase.from("medicamentos").insert(p); if (!error) nuevos++; }
        }
        showToast(`✅ Inventario: ${nuevos} nuevos · ${act} actualizados`, "success");
        loadCatalogo();
      } catch (err) { showToast("Error al leer el archivo: " + err.message, "error"); }
      setImpMeds(false);
    };
    reader.readAsArrayBuffer(file);
  };

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

  // ── Registro manual (Comindustria) ──────────────────────────────
  const abrirNuevo = () => setFormRec({
    nombre_paciente: "", dni: "", fecha: new Date().toISOString().slice(0, 10), hora: "", edad: "", sexo: "",
    cargo: "", area: "", empresa_paciente: empresa?.nombre || "", tipo_atencion: "Nueva", caracteristica: "",
    diagnostico1: "", cie10_1: "", diagnostico2: "", cie10_2: "", grupo_enfermedad: "", prescripcion: "",
    responsable: "", descanso_medico: false, dias_descanso: "", trabajo_restringido: false,
    requiere_seguimiento: false, parte_cuerpo: [], medicamentos: [], observacion: "",
  });
  const abrirEditar = (r) => { setSelected(null); setHistoria(null); setFormRec({ ...r, edad: r.edad ?? "", parte_cuerpo: r.parte_cuerpo || [], medicamentos: r.medicamentos || [] }); };
  const setFR = (k, v) => setFormRec(f => ({ ...f, [k]: v }));
  // Medicamentos (tratamiento estructurado) — base para el futuro kárdex
  const addMed = () => setFormRec(f => ({ ...f, medicamentos: [...(f.medicamentos || []), { nombre: "", cantidad: "", dosis: "", frecuencia: "", duracion: "" }] }));
  const setMed = (i, k, v) => setFormRec(f => ({ ...f, medicamentos: (f.medicamentos || []).map((m, j) => j === i ? { ...m, [k]: v } : m) }));
  // Al elegir/escribir el nombre, vincula el id del catálogo (para que el kárdex descuente exacto)
  const setMedNombre = (i, v) => setFormRec(f => {
    const hit = catalogo.find(c => (c.nombre || "").toLowerCase() === v.toLowerCase());
    return { ...f, medicamentos: (f.medicamentos || []).map((m, j) => j === i ? { ...m, nombre: v, medicamento_id: hit ? hit.id : null } : m) };
  });
  const delMed = (i) => setFormRec(f => ({ ...f, medicamentos: (f.medicamentos || []).filter((_, j) => j !== i) }));
  // Historia clínica acumulada del paciente (por DNI; si no hay DNI, por nombre)
  const verHistoria = (dni, nombre) => {
    const list = records
      .filter(r => (dni && r.dni) ? r.dni === dni : r.nombre_paciente === nombre)
      .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "") || (b.hora || "").localeCompare(a.hora || ""));
    setHistoria({ dni, nombre, list });
  };
  const toggleParte = (id) => setFormRec(f => {
    const arr = f.parte_cuerpo || [];
    return { ...f, parte_cuerpo: arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id] };
  });
  const guardarManual = async () => {
    if (!formRec.nombre_paciente?.trim()) { showToast("El nombre del paciente es obligatorio", "error"); return; }
    setSavingRec(true);
    const payload = {
      empresa_id: empresaId,
      nombre_paciente: formRec.nombre_paciente.trim(), dni: formRec.dni || null,
      fecha: formRec.fecha || null, hora: formRec.hora || null,
      edad: parseInt(formRec.edad) || null, sexo: (formRec.sexo || "").toUpperCase().slice(0, 1) || null,
      cargo: formRec.cargo || null, empresa_paciente: formRec.empresa_paciente || null, area: formRec.area || null,
      tipo_atencion: formRec.tipo_atencion || "Nueva", caracteristica: formRec.caracteristica || null,
      diagnostico1: formRec.diagnostico1 || null, cie10_1: formRec.cie10_1 || null,
      diagnostico2: formRec.diagnostico2 || null, cie10_2: formRec.cie10_2 || null,
      grupo_enfermedad: formRec.grupo_enfermedad || null, prescripcion: formRec.prescripcion || null,
      responsable: formRec.responsable || null, descanso_medico: !!formRec.descanso_medico,
      dias_descanso: formRec.dias_descanso || null, trabajo_restringido: !!formRec.trabajo_restringido,
      requiere_seguimiento: !!formRec.requiere_seguimiento, parte_cuerpo: formRec.parte_cuerpo || [],
      medicamentos: (formRec.medicamentos || []).filter(m => (m.nombre || "").trim()),
      observacion: formRec.observacion || null,
    };
    const { error } = formRec.id
      ? await supabase.from("topico_atenciones").update(payload).eq("id", formRec.id)
      : await supabase.from("topico_atenciones").insert(payload);
    setSavingRec(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast(formRec.id ? "Atención actualizada" : "Atención registrada", "success");
    setFormRec(null); load();
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
              El módulo detecta automáticamente las columnas del Excel buscando palabras clave en los encabezados. Compatible con la mayoría de plantillas de registro de atenciones médicas.
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
              <div><p className="text-gray-600 mb-0.5">Fecha</p><p className="text-gray-200 font-mono">{fmtFecha(selected.fecha)} {selected.hora || ""}</p></div>
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
            {/* Tratamiento (medicamentos) */}
            {(selected.medicamentos || []).length > 0 && (
              <div className="bg-gray-800 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-600 mb-2">💊 Tratamiento</p>
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-600 text-left">
                    <th className="font-medium pb-1">Medicamento</th><th className="font-medium pb-1 text-center">Cant.</th><th className="font-medium pb-1">Dosis</th><th className="font-medium pb-1">Frec.</th><th className="font-medium pb-1">Días</th>
                  </tr></thead>
                  <tbody>
                    {selected.medicamentos.map((m, i) => (
                      <tr key={i} className="border-t border-gray-700/50">
                        <td className="py-1 text-gray-200">{m.nombre}</td>
                        <td className="py-1 text-center text-gray-300 font-mono">{m.cantidad || "—"}</td>
                        <td className="py-1 text-gray-400">{m.dosis || "—"}</td>
                        <td className="py-1 text-gray-400">{m.frecuencia || "—"}</td>
                        <td className="py-1 text-gray-400">{m.duracion || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Indicaciones */}
            {selected.prescripcion && (
              <div className="bg-gray-800 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-600 mb-1">Indicaciones generales</p>
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
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
              <Btn variant="ghost" onClick={() => verHistoria(selected.dni, selected.nombre_paciente)}>📋 Historia clínica</Btn>
              {esComindustria && <Btn variant="primary" onClick={() => abrirEditar(selected)}>✏️ Editar atención</Btn>}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal historia clínica del paciente ───────── */}
      {historia && (
        <Modal title={`Historia clínica — ${historia.nombre || historia.dni || "Paciente"}`} onClose={() => setHistoria(null)} wide>
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              {historia.dni ? `DNI ${historia.dni} · ` : ""}{historia.list.length} atención(es) registrada(s) · ordenadas de la más reciente
            </p>
            {historia.list.length === 0 && <p className="text-sm text-gray-600 py-6 text-center">Sin atenciones para este paciente.</p>}
            <div className="space-y-2.5">
              {historia.list.map(a => (
                <div key={a.id} className="bg-gray-800/40 border border-gray-800 rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                    <span className="text-sm font-mono text-gray-300">{fmtFecha(a.fecha)} {a.hora || ""}</span>
                    <div className="flex gap-1.5 flex-wrap">
                      <Badge color={a.tipo_atencion === "Nueva" ? "blue" : a.tipo_atencion === "Control" ? "amber" : "purple"}>{a.tipo_atencion}</Badge>
                      {a.caracteristica === "ACCIDENTE LABORAL" && <Badge color="red">Accidente</Badge>}
                      {a.descanso_medico && <Badge color="amber">Descanso</Badge>}
                    </div>
                  </div>
                  {a.diagnostico1 && <p className="text-sm text-gray-200">{a.diagnostico1}{a.cie10_1 && <span className="text-[10px] text-blue-400 font-mono ml-1">{a.cie10_1}</span>}</p>}
                  {(a.medicamentos || []).length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">💊 {a.medicamentos.map(m => `${m.nombre}${m.cantidad ? ` x${m.cantidad}` : ""}`).join(" · ")}</p>
                  )}
                  {a.prescripcion && <p className="text-xs text-gray-500 mt-1">{a.prescripcion}</p>}
                  <button onClick={() => { setHistoria(null); setSelected(a); }} className="text-[11px] text-blue-400 hover:text-blue-300 mt-1.5">Ver detalle completo →</button>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal registro/edición manual ───────────── */}
      {formRec && (
        <Modal title={formRec.id ? "Editar atención" : "Registrar atención"} onClose={() => setFormRec(null)} wide>
          <div className="space-y-4">
            {/* Datos del paciente */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2"><FormField label="Nombre del paciente *">
                <Input value={formRec.nombre_paciente} list="topico-trab-list" onChange={e => setNombrePaciente(e.target.value)} placeholder="Escribe o elige un trabajador…" />
                <datalist id="topico-trab-list">{trabajadores.map(t => <option key={t.dni || t.nombre} value={t.nombre} />)}</datalist>
              </FormField></div>
              <FormField label="DNI"><Input value={formRec.dni} onChange={e => setFR("dni", e.target.value)} /></FormField>
              <FormField label="Edad"><Input type="number" min="0" value={formRec.edad} onChange={e => setFR("edad", e.target.value)} /></FormField>
              <FormField label="Sexo">
                <select value={formRec.sexo || ""} onChange={e => setFR("sexo", e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                  <option value="">—</option><option value="M">M</option><option value="F">F</option>
                </select>
              </FormField>
              <FormField label="Cargo"><Input value={formRec.cargo} onChange={e => setFR("cargo", e.target.value)} /></FormField>
              <FormField label="Área"><Input value={formRec.area} onChange={e => setFR("area", e.target.value)} /></FormField>
              <FormField label="Fecha"><Input type="date" value={formRec.fecha || ""} onChange={e => setFR("fecha", e.target.value)} /></FormField>
              <FormField label="Hora"><Input type="time" value={formRec.hora || ""} onChange={e => setFR("hora", e.target.value)} /></FormField>
            </div>

            {/* Aviso de historia previa */}
            {(() => {
              const prev = formRec.dni ? records.filter(r => r.dni === formRec.dni && r.id !== formRec.id) : [];
              if (!prev.length) return null;
              return (
                <button type="button" onClick={() => verHistoria(formRec.dni, formRec.nombre_paciente)}
                  className="w-full flex items-center justify-between gap-2 bg-blue-900/20 border border-blue-900/40 rounded-lg px-3 py-2 text-xs text-blue-300 hover:bg-blue-900/30 transition-colors">
                  <span>📋 Este paciente ya tiene <b>{prev.length}</b> atención(es) previa(s).</span>
                  <span className="underline shrink-0">Ver historia →</span>
                </button>
              );
            })()}

            {/* Tipo / característica / grupo */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <FormField label="Tipo de atención">
                <select value={formRec.tipo_atencion} onChange={e => setFR("tipo_atencion", e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                  {["Nueva", "Control", "Referencia"].map(t => <option key={t}>{t}</option>)}
                </select>
              </FormField>
              <FormField label="Característica">
                <select value={formRec.caracteristica || ""} onChange={e => setFR("caracteristica", e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                  <option value="">—</option>{CARACTERISTICAS.map(c => <option key={c}>{c}</option>)}
                </select>
              </FormField>
              <FormField label="Grupo de enfermedad">
                <select value={formRec.grupo_enfermedad || ""} onChange={e => setFR("grupo_enfermedad", e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                  <option value="">—</option>{GRUPOS_ENF.map(g => <option key={g}>{g}</option>)}
                </select>
              </FormField>
            </div>

            {/* Diagnósticos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField label="Diagnóstico 1"><Input value={formRec.diagnostico1} onChange={e => setFR("diagnostico1", e.target.value)} /></FormField>
              <FormField label="CIE-10 (1)"><Input value={formRec.cie10_1} onChange={e => setFR("cie10_1", e.target.value)} /></FormField>
              <FormField label="Diagnóstico 2"><Input value={formRec.diagnostico2} onChange={e => setFR("diagnostico2", e.target.value)} /></FormField>
              <FormField label="CIE-10 (2)"><Input value={formRec.cie10_2} onChange={e => setFR("cie10_2", e.target.value)} /></FormField>
            </div>

            {/* Tratamiento estructurado (medicamentos) */}
            <div className="border border-gray-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-300">💊 Tratamiento / Medicamentos</p>
                <button type="button" onClick={addMed} className="text-xs text-blue-400 hover:text-blue-300 font-medium">+ Agregar medicamento</button>
              </div>
              {(formRec.medicamentos || []).length === 0 && (
                <p className="text-[11px] text-gray-600 py-1">Sin medicamentos. Agrega los del tratamiento (nombre, cantidad, dosis…).</p>
              )}
              {(formRec.medicamentos || []).length > 0 && (
                <div className="hidden md:grid grid-cols-12 gap-1.5 px-1 mb-1 text-[10px] text-gray-600 uppercase tracking-wide">
                  <span className="col-span-4">Medicamento</span><span className="col-span-2">Cantidad</span><span className="col-span-2">Dosis</span><span className="col-span-2">Frecuencia</span><span className="col-span-1">Días</span><span className="col-span-1"></span>
                </div>
              )}
              <div className="space-y-1.5">
                {(formRec.medicamentos || []).map((m, i) => (
                  <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
                    <input value={m.nombre} list="med-catalogo" onChange={e => setMedNombre(i, e.target.value)} placeholder="Elige o escribe…" className={`col-span-12 md:col-span-4 bg-gray-800 border rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 ${m.medicamento_id ? "border-emerald-700" : "border-gray-700"}`} />
                    <input type="number" min="0" value={m.cantidad} onChange={e => setMed(i, "cantidad", e.target.value)} placeholder="Cant." className="col-span-3 md:col-span-2 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                    <input value={m.dosis} onChange={e => setMed(i, "dosis", e.target.value)} placeholder="1 tab" className="col-span-3 md:col-span-2 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                    <input value={m.frecuencia} onChange={e => setMed(i, "frecuencia", e.target.value)} placeholder="c/8h" className="col-span-3 md:col-span-2 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                    <input value={m.duracion} onChange={e => setMed(i, "duracion", e.target.value)} placeholder="5" className="col-span-2 md:col-span-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                    <button type="button" onClick={() => delMed(i)} className="col-span-1 text-gray-600 hover:text-red-400 flex justify-center"><X size={15} /></button>
                  </div>
                ))}
              </div>
            </div>

            <datalist id="med-catalogo">{catalogo.map(c => <option key={c.id} value={c.nombre}>{[c.concentracion, c.presentacion].filter(Boolean).join(" · ")}</option>)}</datalist>
            <p className="text-[10px] text-gray-600 -mt-2">
              Los medicamentos del inventario aparecen en la lista (borde verde = enlazado al stock).{" "}
              <button type="button" onClick={() => { setCatForm(null); setCatOpen(true); }} className="text-blue-400 hover:text-blue-300 underline">Gestionar inventario</button>
            </p>

            {/* Indicaciones generales */}
            <FormField label="Indicaciones generales / observaciones del tratamiento">
              <textarea rows={2} value={formRec.prescripcion || ""} onChange={e => setFR("prescripcion", e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none" />
            </FormField>

            {/* Médico responsable */}
            <FormField label="Médico responsable"><Input value={formRec.responsable} onChange={e => setFR("responsable", e.target.value)} /></FormField>

            {/* Zona del cuerpo */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Zona(s) afectada(s)</p>
              <div className="flex flex-wrap gap-1.5">
                {PARTES_CUERPO.map(p => {
                  const on = (formRec.parte_cuerpo || []).includes(p.id);
                  return (
                    <button key={p.id} type="button" onClick={() => toggleParte(p.id)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${on ? "bg-red-900/40 border-red-700 text-red-300" : "bg-gray-800 border-gray-700 text-gray-400 hover:border-red-700"}`}>
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Flags */}
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2 text-gray-300"><input type="checkbox" checked={!!formRec.descanso_medico} onChange={e => setFR("descanso_medico", e.target.checked)} className="w-4 h-4 accent-red-600" /> Descanso médico</label>
              <label className="flex items-center gap-2 text-gray-300"><input type="checkbox" checked={!!formRec.trabajo_restringido} onChange={e => setFR("trabajo_restringido", e.target.checked)} className="w-4 h-4 accent-amber-600" /> Trabajo restringido</label>
              <label className="flex items-center gap-2 text-gray-300"><input type="checkbox" checked={!!formRec.requiere_seguimiento} onChange={e => setFR("requiere_seguimiento", e.target.checked)} className="w-4 h-4 accent-purple-600" /> Requiere seguimiento</label>
            </div>
            {formRec.descanso_medico && (
              <FormField label="Fechas / días de descanso"><Input value={formRec.dias_descanso || ""} onChange={e => setFR("dias_descanso", e.target.value)} placeholder="Ej: 3 días (01–03 ene)" /></FormField>
            )}

            {/* Observación */}
            <FormField label="Observaciones">
              <textarea rows={2} value={formRec.observacion || ""} onChange={e => setFR("observacion", e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none" />
            </FormField>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
              <Btn variant="ghost" onClick={() => setFormRec(null)}>Cancelar</Btn>
              <Btn variant="primary" disabled={savingRec} onClick={guardarManual}>{savingRec ? "Guardando..." : (formRec.id ? "Actualizar" : "Registrar")}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal inventario de medicamentos ─────────── */}
      {catOpen && (
        <Modal title="Inventario de Medicamentos" onClose={() => { setCatOpen(false); setCatForm(null); }} wide>
          <div className="space-y-4">
            {/* Form alta/edición */}
            <div className="border border-gray-800 rounded-xl p-3">
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <p className="text-xs font-semibold text-gray-300">{catForm?.id ? "Editar medicamento" : "Agregar medicamento"}</p>
                {!catForm && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={plantillaMeds} className="text-xs text-gray-400 hover:text-gray-200 underline">Descargar plantilla</button>
                    <label className={`text-xs px-2.5 py-1.5 rounded-lg border border-blue-700 bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 cursor-pointer ${impMeds ? "opacity-50 pointer-events-none" : ""}`}>
                      {impMeds ? "Importando..." : "⬆ Importar Excel"}
                      <input type="file" accept=".xlsx,.xls" className="hidden" onChange={importarMeds} disabled={impMeds} />
                    </label>
                    <button onClick={nuevoMed} className="text-xs text-blue-400 hover:text-blue-300 font-medium">+ Nuevo medicamento</button>
                  </div>
                )}
              </div>
              {catForm && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="col-span-2"><FormField label="Nombre *"><Input value={catForm.nombre} onChange={e => setCF("nombre", e.target.value)} placeholder="Paracetamol" /></FormField></div>
                    <FormField label="Concentración"><Input value={catForm.concentracion} onChange={e => setCF("concentracion", e.target.value)} placeholder="500mg" /></FormField>
                    <FormField label="Presentación"><Input value={catForm.presentacion} onChange={e => setCF("presentacion", e.target.value)} placeholder="Tableta" /></FormField>
                    <FormField label="Unidad"><Input value={catForm.unidad} onChange={e => setCF("unidad", e.target.value)} placeholder="unidad" /></FormField>
                    <FormField label="Stock"><Input type="number" min="0" value={catForm.stock} onChange={e => setCF("stock", e.target.value)} /></FormField>
                    <FormField label="Stock mínimo"><Input type="number" min="0" value={catForm.stock_minimo} onChange={e => setCF("stock_minimo", e.target.value)} /></FormField>
                    <FormField label="Lote"><Input value={catForm.lote} onChange={e => setCF("lote", e.target.value)} /></FormField>
                    <FormField label="Vencimiento"><Input type="date" value={catForm.fecha_vencimiento || ""} onChange={e => setCF("fecha_vencimiento", e.target.value)} /></FormField>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Btn size="sm" variant="ghost" onClick={() => setCatForm(null)}>Cancelar</Btn>
                    <Btn size="sm" variant="primary" disabled={catSaving} onClick={guardarMed}>{catSaving ? "Guardando..." : (catForm.id ? "Actualizar" : "Agregar")}</Btn>
                  </div>
                </div>
              )}
            </div>

            {/* Lista de inventario */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-gray-800 text-gray-600 text-left">
                  {["Medicamento", "Presentación", "Stock", "Mín.", "Lote", "Vence", ""].map(h => <th key={h} className="px-3 py-2 font-medium uppercase tracking-wide whitespace-nowrap">{h}</th>)}
                </tr></thead>
                <tbody>
                  {catalogo.map(c => {
                    const bajo = Number(c.stock) <= Number(c.stock_minimo);
                    const venceDias = c.fecha_vencimiento ? Math.round((new Date(c.fecha_vencimiento) - new Date()) / 86400000) : null;
                    const vencido = venceDias !== null && venceDias < 0;
                    const porVencer = venceDias !== null && venceDias >= 0 && venceDias <= 60;
                    return (
                      <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="px-3 py-2 text-gray-200 font-medium">{c.nombre} <span className="text-gray-500">{c.concentracion || ""}</span></td>
                        <td className="px-3 py-2 text-gray-500">{c.presentacion || "—"} / {c.unidad}</td>
                        <td className={`px-3 py-2 text-center font-mono font-bold ${bajo ? "text-red-400" : "text-gray-300"}`}>{c.stock}</td>
                        <td className="px-3 py-2 text-center text-gray-500">{c.stock_minimo}</td>
                        <td className="px-3 py-2 text-gray-500">{c.lote || "—"}</td>
                        <td className={`px-3 py-2 whitespace-nowrap ${vencido ? "text-red-400 font-semibold" : porVencer ? "text-amber-400" : "text-gray-500"}`}>{c.fecha_vencimiento ? fmtFecha(c.fecha_vencimiento) : "—"}{vencido ? " ⚠" : porVencer ? " •" : ""}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <button onClick={() => setCatForm({ ...c, stock: c.stock ?? "", stock_minimo: c.stock_minimo ?? "" })} className="text-gray-500 hover:text-blue-400 mr-2">Editar</button>
                          {puedeEliminar() && <button onClick={() => eliminarMed(c.id)} className="text-red-500/50 hover:text-red-400">Eliminar</button>}
                        </td>
                      </tr>
                    );
                  })}
                  {catalogo.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-600">Sin medicamentos. Agrega el primero arriba.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-gray-600">Rojo = stock en o bajo el mínimo · ⚠ vencido · • vence en ≤60 días. El futuro kárdex descontará el stock automáticamente con cada atención registrada.</p>
          </div>
        </Modal>
      )}

      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Tópico — Atenciones Médicas</h3>
          <p className="text-gray-500 text-xs max-w-xl">{esComindustria
            ? "Registra cada atención del tópico directamente en la app."
            : "Registro e importación de atenciones del tópico. Sube el Excel mensual para generar el dashboard automáticamente."}</p>
        </div>
        <div className="flex gap-2 flex-wrap shrink-0">
          {esComindustria && (
            <>
              <Btn size="sm" variant="primary" onClick={abrirNuevo}><Activity size={13} /> Registrar atención</Btn>
              <Btn size="sm" variant="ghost" onClick={() => { setCatForm(null); setCatOpen(true); }}>💊 Inventario</Btn>
            </>
          )}
          {!esComindustria && <Btn size="sm" variant="ghost" onClick={() => setShowGuide(true)}><HelpCircle size={13} /> Guía</Btn>}
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
          {!esComindustria && (
            <label className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors cursor-pointer ${importing ? "opacity-50 pointer-events-none" : ""}`}>
              <Upload size={13} /> {importing ? "Importando..." : "Importar Excel"}
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} disabled={importing} />
            </label>
          )}
          {records.length > 0 && puedeEliminar() && (
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
          {esComindustria ? (
            <>
              <p className="text-gray-500 text-sm max-w-xs mb-5">Registra la primera atención del tópico directamente en la app.</p>
              <button onClick={abrirNuevo} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium cursor-pointer transition-colors">
                <Activity size={15} /> Registrar atención
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-500 text-sm max-w-xs mb-5">Sube el Excel mensual del tópico para generar el dashboard automáticamente.</p>
              <label className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium cursor-pointer transition-colors">
                <Upload size={15} /> Importar Excel
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
              </label>
            </>
          )}
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
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono whitespace-nowrap">{fmtFecha(r.fecha)}</td>
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

              {/* ── Vista móvil: tarjetas ── */}
              <div className="md:hidden space-y-2.5">
                {filtered.slice(0, 200).map(r => (
                  <div key={r.id} onClick={() => setSelected(r)}
                    className={`bg-gray-900 border border-gray-800 rounded-xl p-3.5 cursor-pointer ${r.caracteristica === "ACCIDENTE LABORAL" ? "border-l-2 border-l-red-600" : ""}`}>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0">
                        <div className="font-semibold text-white text-sm leading-tight">{r.nombre_paciente}</div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">{r.dni} · {r.sexo}{r.edad ? ` · ${r.edad}a` : ""}</div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setSelected(r); }} className="text-xs text-blue-400 hover:text-blue-300 border border-blue-900 hover:border-blue-700 px-2 py-1 rounded-lg transition-colors shrink-0">Ver</button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                      <Badge color={r.tipo_atencion === "Nueva" ? "blue" : r.tipo_atencion === "Control" ? "amber" : "purple"}>{r.tipo_atencion}</Badge>
                      {r.descanso_medico && <Badge color="red">Descanso</Badge>}
                      {(r.parte_cuerpo || []).slice(0, 2).map(p => (
                        <span key={p} className="text-[10px] px-1.5 py-0.5 bg-red-900/20 border border-red-900/40 text-red-400 rounded">{PARTES_CUERPO.find(x => x.id === p)?.label || p}</span>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs border-t border-gray-800 pt-2.5">
                      <div><span className="text-gray-600">Fecha:</span> <span className="text-gray-400 font-mono">{fmtFecha(r.fecha)}</span></div>
                      <div><span className="text-gray-600">Característica:</span> <span className="text-gray-400">{r.caracteristica || "—"}</span></div>
                      <div className="col-span-2"><span className="text-gray-600">Diagnóstico:</span> <span className="text-gray-300">{r.diagnostico1 || "—"}</span>{r.cie10_1 && <span className="text-[10px] text-blue-500 font-mono ml-1">{r.cie10_1}</span>}</div>
                      {r.grupo_enfermedad && <div className="col-span-2"><span className="text-gray-600">Grupo:</span> <span className="text-gray-400">{r.grupo_enfermedad}</span></div>}
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="text-center text-gray-600 text-sm py-8 bg-gray-900 border border-gray-800 rounded-xl">Sin resultados para los filtros aplicados.</div>
                )}
                {filtered.length > 200 && (
                  <div className="text-center text-gray-600 text-xs py-2">Mostrando 200 de {filtered.length}. Usa los filtros para refinar.</div>
                )}
              </div>

              {/* ── Vista escritorio: tabla ── */}
              <div className="hidden md:block">
                <WideTableScroll>
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
                        <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{fmtFecha(r.fecha)}<br/><span className="text-gray-700">{r.hora}</span></td>
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
                </WideTableScroll>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
