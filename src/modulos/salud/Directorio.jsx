import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase, puedeEliminar } from '../../lib/supabase.js';
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
import { MultiSelect } from '../../components/ui/MultiSelect.jsx';
import { ImportGuideModal } from './ImportGuideModal.jsx';
import {
  Plus, Upload, Download, ChevronRight, ChevronLeft, Lock,
  Trash2, Filter, HelpCircle, Pencil, FileDown, AlertTriangle,
  CheckCircle, Home, HeartPulse, Microscope, Search, Shield,
  ClipboardList, ShieldAlert, Activity, BarChart2, BookOpen,
  FileText, Users, LayoutDashboard, Stethoscope, Settings,
  Building2, Phone, Mail
} from 'lucide-react';

export default function Directorio({ workers, setWorkers, role, empresaId, empresa, adminMode = false }) {
  const esComindustria = empresa?.nombre?.toLowerCase().includes('comindustria') || false;
  const esMultisel = empresa?.nombre?.toLowerCase().includes('multisel') || false;
  // Expertos en Café + Franquicias Unidas — importador con formato RRHH (FUP)
  const esGrupoCafe = (() => { const n = empresa?.nombre?.toLowerCase() || ""; return n.includes('expertos en cafe') || n.includes('expertos en café') || n.includes('franquicias unidas'); })();
  const AREAS_MULTISEL = ["SEGREGACION","MOLINO","OPERARIO","PLANTA","MANTENIMIENTO","CONDUCTOR","CONDUCTOR POR OCASIONES","PLANTA (POR OCASIONES)","VIGILANTE","GERENTE G.","ADMINSTRATIVO","LIMPIEZA","DIRECTOR TECNICO","S. PATRIMONIAL","SUPERVISOR"];
  const [vistaDir, setVistaDir] = useState("activos"); // "activos" | "cesados"
  const [filter, setFilter] = useState({ text: "", estado: "", aptitud: [], cargo: [], sede: [], epp: "", emo: "", lectura: "", vinculacion: "" });
  const APTITUDES = ["Apto", "Apto con restricción", "Observado", "No apto", "No evaluado"];
  // Normaliza aptitud para comparar (sin tildes, minúsculas, espacios colapsados)
  const normApt = (s) => (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  // Mapea variantes ("APTO CON RESTRICCIONES", "INAPTO", etc.) a la categoría canónica
  const canonApt = (s) => {
    const n = normApt(s);
    if (!n) return "No evaluado";
    if (n.includes("restric")) return "Apto con restricción";   // apto con restriccion(es), restringido
    if (n.includes("no apto") || n === "inapto" || n.includes("inapto")) return "No apto";
    if (n.includes("observ")) return "Observado";
    if (n.includes("no evalu") || n.includes("pendiente") || n.includes("sin evalu")) return "No evaluado";
    if (n.includes("apto")) return "Apto";
    return s; // valor desconocido: respetar tal cual
  };
  const MOTIVOS_CESE = ["Renuncia voluntaria","Término de contrato","Despido","Fallecimiento","Jubilación","Mutuo acuerdo","Otro"];
  const toggleAptitud = (a) => setFilter(f => ({
    ...f, aptitud: f.aptitud.includes(a) ? f.aptitud.filter(x => x !== a) : [...f.aptitud, a]
  }));
  const [sortDir, setSortDir] = useState(null); // null | "az" | "za"
  const [page, setPage] = useState(1);
  const PER_PAGE = 50;
  const [tooltip, setTooltip] = useState(null);
  // Scroll horizontal sincronizado (barra superior + tabla)
  const tableScrollRef = useRef(null);
  const topScrollRef = useRef(null);
  const [tableW, setTableW] = useState(0);
  const syncFrom = (src, dst) => { if (src.current && dst.current) dst.current.scrollLeft = src.current.scrollLeft; };
  const [importPreview, setImportPreview] = useState(null); // { parsed, nuevos, existentes }
  const [isImporting, setIsImporting] = useState(false);
  const [emoPreview, setEmoPreview] = useState(null); // { matched, sinMatch }
  const [emoImporting, setEmoImporting] = useState(false);
  const [showGuideEmo, setShowGuideEmo] = useState(false);
  const [modal, setModal] = useState(null);
  const [showGuideCesados, setShowGuideCesados] = useState(false);
  const [importandoCesados, setImportandoCesados] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showGuideFUP, setShowGuideFUP] = useState(false);
  const [form, setForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  // En la plataforma Administrativo se ocultan los datos clínicos confidenciales (restricción médica)
  const canSeeMedical = !adminMode && ["ADMIN", "MEDICO", "SUPERADMIN", "SEGURIDAD"].includes(role);
  const canEditEmo = role !== "SEGURIDAD";
  const cargos = [...new Set(workers.map(w => w.cargo).filter(Boolean))].sort();
  const sedes = [...new Set(workers.map(w => w.sede).filter(Boolean))].sort();

  // Separar activos y cesados
  const workersActivos = workers.filter(w => w.estado !== "Cesado");
  const workersCesados = workers.filter(w => w.estado === "Cesado")
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const hoy0 = new Date(new Date().toISOString().split("T")[0] + "T00:00:00");
  const emoDias = (w) => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); return v ? Math.ceil((new Date(v + "T00:00:00") - hoy0) / 86400000) : null; };
  const filtered = workersActivos.filter(w => {
    const t = filter.text.toLowerCase();
    const d = emoDias(w);
    const emoOk = !filter.emo
      || (filter.emo === "porvencer" && d !== null && d >= 0 && d <= 30)
      || (filter.emo === "vencido" && d !== null && d < 0)
      || (filter.emo === "alerta" && d !== null && d <= 30);
    return (!t || w.nombre.toLowerCase().includes(t) || (w.dni || "").includes(t))
      && (!filter.estado || w.estado === filter.estado)
      && (filter.aptitud.length === 0 || filter.aptitud.some(a => canonApt(a) === canonApt(w.aptitud)))
      && (filter.cargo.length === 0 || filter.cargo.includes(w.cargo))
      && (filter.sede.length === 0 || filter.sede.includes(w.sede))
      && (!filter.epp || (filter.epp === "si" ? w.epp_recibido : !w.epp_recibido))
      && (!filter.lectura || (filter.lectura === "si" ? !!w.lectura_emo : !w.lectura_emo))
      && (!filter.vinculacion || (w.tipo_vinculacion || "").toLowerCase() === filter.vinculacion.toLowerCase())
      && emoOk;
  }).sort((a, b) => sortDir === "az" ? a.nombre.localeCompare(b.nombre, "es") : sortDir === "za" ? b.nombre.localeCompare(a.nombre, "es") : 0);

  // Paginación (escritorio y móvil) — evita recorrer cientos de filas de un tirón
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageSafe = Math.min(page, totalPages);
  const paged = filtered.slice((pageSafe - 1) * PER_PAGE, pageSafe * PER_PAGE);
  // Volver a la página 1 cuando cambian filtros, orden o vista
  useEffect(() => { setPage(1); }, [filter, sortDir, vistaDir]);
  // Medir el ancho real de la tabla para dimensionar la barra de scroll superior
  useEffect(() => {
    const measure = () => { if (tableScrollRef.current) setTableW(tableScrollRef.current.scrollWidth); };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [paged.length, esMultisel, canSeeMedical, vistaDir, pageSafe]);

  const openModal = (worker = null) => {
    setForm(worker || { nombre: "", dni: "", cargo: "", genero: "", celular: "", email: "", sede: "Lima", estado: "Activo", fecha_nacimiento: "", fecha_ingreso: "", ultima_emo: "", duracion_emo: "Anual", aptitud: "No evaluado", restriccion_medica: "Ninguna", lectura_emo: "", epp_recibido: false, epp_detalle: "", epp_fecha: "", fecha_cese: "", motivo_cese: "" });
    setModal(worker ? "edit" : "new");
  };

  const saveWorker = async () => {
    if (!form.nombre || !form.dni) { showToast("Nombre y DNI son requeridos", "error"); return; }
    setIsSaving(true);
    const vigencia = calcularVigencia(form.ultima_emo, form.duracion_emo);
    const edad = calcularEdad(form.fecha_nacimiento);
    const payload = { nombre: form.nombre, dni: form.dni, cargo: form.cargo || "", genero: form.genero || null, celular: form.celular || null, email: form.email || null, sede: esGrupoCafe ? (form.sede || "Lima") : "Lima", estado: form.estado || "Activo", fecha_nacimiento: form.fecha_nacimiento || null, fecha_ingreso: form.fecha_ingreso || null, edad, ultima_emo: form.ultima_emo || null, duracion_emo: form.duracion_emo || "Anual", vencimiento_emo: vigencia, lectura_emo: form.lectura_emo || null, aptitud: form.aptitud || "No evaluado", restriccion_medica: form.restriccion_medica || "Ninguna", epp_recibido: form.epp_recibido || false, epp_detalle: form.epp_detalle || null, epp_fecha: form.epp_fecha || null, fecha_cese: form.estado === "Cesado" ? (form.fecha_cese || null) : null, motivo_cese: form.estado === "Cesado" ? (form.motivo_cese || null) : null, empresa_id: empresaId };
    if (modal === "edit") {
      const { error } = await supabase.from("trabajadores").update(payload).eq("id", form.id);
      if (error) { showToast("Error: " + error.message, "error"); setIsSaving(false); return; }
      setWorkers(prev => prev.map(w => w.id === form.id ? { ...form, ...payload } : w));
      showToast("Trabajador actualizado", "success");
    } else {
      const { data, error } = await supabase.from("trabajadores").insert([payload]).select().single();
      if (error) { showToast("Error: " + error.message, "error"); setIsSaving(false); return; }
      setWorkers(prev => [...prev, data]);
      showToast("Trabajador registrado", "success");
    }
    setIsSaving(false); setModal(null);
  };

  const deleteWorker = async (id) => {
    if (!confirm("¿Eliminar este trabajador?")) return;
    setIsDeleting(id);
    const { error } = await supabase.from("trabajadores").delete().eq("id", id);
    if (error) { showToast("Error: " + error.message, "error"); setIsDeleting(null); return; }
    setWorkers(prev => prev.filter(w => w.id !== id));
    showToast("Trabajador eliminado", "success"); setIsDeleting(null);
  };

  // Normaliza texto para comparación flexible de encabezados
  const normCol = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

  const detectCol = (headers, ...aliases) => {
    const normH = headers.map(h => ({ orig: h, n: normCol(h) }));
    for (const alias of aliases) {
      const na = normCol(alias);
      const found = normH.find(h => h.n === na);
      if (found) return found.orig;
    }
    // coincidencia parcial
    for (const alias of aliases) {
      const na = normCol(alias);
      const found = normH.find(h => h.n.includes(na) || na.includes(h.n));
      if (found) return found.orig;
    }
    return null;
  };

  const parseImportRows = (rows) => {
    const valid = rows.filter(r => Object.values(r).some(v => String(v).trim()));
    if (!valid.length) return null;
    const headers = Object.keys(valid[0]);
    const dc = (...aliases) => detectCol(headers, ...aliases);

    const colNombre    = dc("APELLIDO Y NOMBRE","APELLIDOS Y NOMBRES","NOMBRE COMPLETO","NOMBRE Y APELLIDO","NOMBRES Y APELLIDOS");
    const colApellido  = dc("APELLIDO","APELLIDOS","PRIMER APELLIDO");
    const colNombreSolo= dc("NOMBRES","NOMBRE DE PILA","PRIMER NOMBRE");
    const colDni       = dc("DOC. DE IDENTIDAD","DNI","DOCUMENTO DE IDENTIDAD","DOCUMENTO","N° DNI","N° DE IDENTIDAD","DOC IDENTIDAD","NUMERO DOCUMENTO","N DE IDENTIDAD");
    const colCargo     = dc("PUESTO","CARGO","PUESTO DE TRABAJO","OCUPACION");
    const colCelular   = dc("CELULAR","TELEFONO","MOVIL","CEL");
    const colNac       = dc("FECHA DE NACIMIENTO","FECHA NAC","F. NACIMIENTO","NACIMIENTO","FECHA NACIMIENTO");
    const colIngreso   = dc("FECHA DE INGRESO","FECHA INGRESO","F. INGRESO","INGRESO");
    const colEmo       = dc("ULTIMA EMO","ULTIMO EMO","FECHA EMO","EMO");
    const colDuracion  = dc("DURACION DE EMO","DURACION EMO","TIPO EMO","DURACION");
    const colAptitud   = dc("APTITUD","APTITUD MEDICA");
    const colRestriccion = dc("RESTRICCION","RESTRICCION MEDICA","RESTRICCIONES");
    const colLectura   = dc("LECTURA 2026","LECTURA EMO","LECTURA","FECHA LECTURA");
    const colEpp       = dc("EPP RECIBIDO","EPP");
    const colEppDetalle= dc("EPP DETALLE","DETALLE EPP");
    const colEppFecha  = dc("EPP FECHA","FECHA EPP");
    const colVinculacion = dc("VINCULACION","TIPO VINCULACION","TIPO DE VINCULACION");
    const colArea      = dc("AREA");
    const colEstado    = dc("ESTADO");

    return valid.map(r => {
      let nombre = "";
      if (colApellido) {
        // Columnas separadas → formato "APELLIDOS, NOMBRES"
        const ap = String(r[colApellido] || "").trim().toUpperCase();
        const nm = colNombreSolo ? String(r[colNombreSolo] || "").trim().toUpperCase() : "";
        nombre = ap && nm ? `${ap}, ${nm}` : (ap || nm);
      } else if (colNombre) {
        // Columna combinada → solo mayúsculas, respetar lo que viene
        nombre = String(r[colNombre] || "").trim().toUpperCase();
      }
      const dni = (colDni ? String(r[colDni] || "") : "").replace(/\D/g, "").slice(0, 8);
      if (!nombre || !dni) return null;

      const ultimaEmo = excelDateToISO(colEmo ? r[colEmo] : "");
      const duracion  = colDuracion ? String(r[colDuracion] || "").trim() || "Anual" : "Anual";
      const fnac      = excelDateToISO(colNac ? r[colNac] : "");

      return {
        nombre, dni,
        cargo:            colCargo      ? String(r[colCargo] || "").trim() : "",
        celular:          colCelular    ? String(r[colCelular] || "").replace(/\D/g, "").slice(0, 12) || null : null,
        sede: "Lima",
        estado:           colEstado     ? String(r[colEstado] || "").trim() || "Activo" : "Activo",
        fecha_nacimiento: fnac,
        fecha_ingreso:    excelDateToISO(colIngreso ? r[colIngreso] : "") || null,
        edad:             calcularEdad(fnac),
        ultima_emo:       ultimaEmo,
        duracion_emo:     duracion,
        vencimiento_emo:  calcularVigencia(ultimaEmo, duracion),
        lectura_emo:      excelDateToISO(colLectura ? r[colLectura] : ""),
        aptitud:          colAptitud    ? canonApt(String(r[colAptitud] || "").trim() || "No evaluado") : "No evaluado",
        restriccion_medica: colRestriccion ? String(r[colRestriccion] || "").trim() || "Ninguna" : "Ninguna",
        epp_recibido:     colEpp        ? String(r[colEpp] || "").toUpperCase() === "SI" : false,
        epp_detalle:      colEppDetalle ? String(r[colEppDetalle] || "").trim() || null : null,
        epp_fecha:        excelDateToISO(colEppFecha ? r[colEppFecha] : ""),
        tipo_vinculacion: colVinculacion ? String(r[colVinculacion] || "").trim() || null : null,
        area:             colArea       ? String(r[colArea] || "").trim() || null : null,
        empresa_id:       empresaId,
      };
    }).filter(Boolean);
  };

  const importCSV = (e) => {
    const file = e.target.files[0]; if (!file) return;
    e.target.value = "";
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    const handleRows = (rows) => {
      const parsed = parseImportRows(rows);
      if (!parsed || !parsed.length) { showToast("Archivo inválido o sin datos reconocibles.", "error"); return; }
      const existingDnis = new Set(workers.map(w => w.dni));
      const nuevos     = parsed.filter(r => !existingDnis.has(r.dni));
      const existentes = parsed.filter(r =>  existingDnis.has(r.dni));
      setImportPreview({ parsed, nuevos, existentes });
    };
    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const wb = XLSX.read(evt.target.result, { type: "binary", cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        handleRows(XLSX.utils.sheet_to_json(ws, { defval: "" }));
      };
      reader.readAsBinaryString(file);
    } else {
      Papa.parse(file, { header: true, complete: (res) => handleRows(res.data) });
    }
  };

  // ── Importador formato RRHH (FUP) — solo Expertos / Franquicias ──
  const normF = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const parseFUPSheet = (ws, estado) => {
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    const h = rows.findIndex(r => r.some(c => normF(c) === "nombre completo") || r.some(c => normF(c).includes("numero documento")));
    if (h < 0) return [];
    const head = rows[h].map(normF);
    const ex = (n) => head.findIndex(c => c === n);
    const inc = (n) => head.findIndex(c => c.includes(n));
    const col = {
      nombre: ex("nombre completo") >= 0 ? ex("nombre completo") : inc("nombre completo"),
      tipo: inc("tipo documento"), dni: inc("numero documento"), sexo: ex("sexo"),
      cel: inc("celular"), email: inc("correo"), nac: inc("fecha nacimiento"), edad: ex("edad"),
      puesto: ex("puesto") >= 0 ? ex("puesto") : inc("puesto"),
      sede: ex("sede") >= 0 ? ex("sede") : head.findIndex(c => c.includes("sede") && !c.includes("codigo")),
    };
    const out = [];
    for (let i = h + 1; i < rows.length; i++) {
      const r = rows[i];
      const dni = (col.dni >= 0 ? String(r[col.dni] || "") : "").replace(/\D/g, "").slice(0, 12);
      const nombre = (col.nombre >= 0 ? String(r[col.nombre] || "") : "").trim().toUpperCase();
      if (!dni || !nombre) continue;
      const fnac = excelDateToISO(col.nac >= 0 ? r[col.nac] : "");
      const edadRaw = col.edad >= 0 ? parseInt(String(r[col.edad]).replace(/\D/g, ""), 10) : NaN;
      out.push({
        nombre, dni,
        tipo_documento: col.tipo >= 0 ? String(r[col.tipo] || "").trim() || null : null,
        genero: col.sexo >= 0 ? String(r[col.sexo] || "").trim() || null : null,
        celular: col.cel >= 0 ? String(r[col.cel] || "").replace(/\D/g, "").slice(0, 12) || null : null,
        email: col.email >= 0 ? String(r[col.email] || "").trim() || null : null,
        fecha_nacimiento: fnac,
        edad: Number.isFinite(edadRaw) ? edadRaw : calcularEdad(fnac),
        cargo: col.puesto >= 0 ? String(r[col.puesto] || "").trim() : "",
        sede: col.sede >= 0 ? String(r[col.sede] || "").trim() || "Lima" : "Lima",
        estado, duracion_emo: "Anual", empresa_id: empresaId,
      });
    }
    return out;
  };
  const importFUP = (e) => {
    const file = e.target.files[0]; if (!file) return; e.target.value = "";
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "binary", cellDates: false });
      const findSheet = (...keys) => wb.SheetNames.find(n => keys.some(k => normF(n).includes(k)));
      const act = wb.Sheets[findSheet("activo") || wb.SheetNames[0]];
      const ces = findSheet("cesado", "cese") ? wb.Sheets[findSheet("cesado", "cese")] : null;
      let parsed = [];
      if (act) parsed = parsed.concat(parseFUPSheet(act, "Activo"));
      if (ces) parsed = parsed.concat(parseFUPSheet(ces, "Cesado"));
      // dedup dentro del archivo por DNI
      const seen = new Set(); parsed = parsed.filter(r => seen.has(r.dni) ? false : (seen.add(r.dni), true));
      if (!parsed.length) { showToast("No se reconoció el formato del Excel de RRHH (FUP).", "error"); return; }
      const existingDnis = new Set(workers.map(w => w.dni));
      const nuevos = parsed.filter(r => !existingDnis.has(r.dni));
      const existentes = parsed.filter(r => existingDnis.has(r.dni));
      setImportPreview({ parsed, nuevos, existentes });
    };
    reader.readAsBinaryString(file);
  };

  // ── Importador 2: EMO + Aptitud (complementa por NOMBRE) ──
  const claveNombre = (s) => normF(s).replace(/,/g, " ").replace(/\s+/g, " ").trim();
  const importEMO = (e) => {
    const file = e.target.files[0]; if (!file) return; e.target.value = "";
    const handle = (rows) => {
      const valid = rows.filter(r => Object.values(r).some(v => String(v).trim()));
      if (!valid.length) { showToast("Archivo vacío.", "error"); return; }
      const headers = Object.keys(valid[0]);
      const dc = (...al) => detectCol(headers, ...al);
      const cNom = dc("NOMBRE COMPLETO", "NOMBRE", "APELLIDOS Y NOMBRES", "TRABAJADOR");
      const cEmo = dc("FECHA DE ULTIMO EMO", "ULTIMO EMO", "ULTIMA EMO", "FECHA EMO", "EMO");
      const cApt = dc("APTITUD", "APTITUD MEDICA");
      // Todas las columnas de restricción (RESTRICCION, RESTRICCION 1, 2, 3…) para unirlas en una sola
      const colsRes = headers.filter(h => normCol(h).includes("restriccion") || normCol(h).includes("restricciones"));
      if (!cNom) { showToast("No se encontró la columna de Nombre.", "error"); return; }
      // índice de trabajadores por nombre normalizado
      const idx = new Map(); workers.forEach(w => idx.set(claveNombre(w.nombre), w));
      const byWorker = new Map(); const sinMatch = [];
      for (const r of valid) {
        const nombre = String(r[cNom] || "").trim();
        if (!nombre) continue;
        const w = idx.get(claveNombre(nombre));
        const ultima_emo = excelDateToISO(cEmo ? r[cEmo] : "");
        let aptitud = cApt ? String(r[cApt] || "").trim() : "";
        if (aptitud) aptitud = canonApt(aptitud);
        // Une todas las columnas de restricción en una sola (sin vacíos ni duplicados)
        let restriccion = [...new Set(colsRes.map(c => String(r[c] || "").trim()).filter(v => v && !/^(ninguna|n\/a|na|-)$/i.test(v)))].join(" · ");
        if (aptitud === "Apto") restriccion = "Ninguna";
        if (!w) { sinMatch.push(nombre); continue; }
        const entry = { worker: w, nombre, ultima_emo, aptitud: aptitud || w.aptitud, restriccion: restriccion || w.restriccion_medica || "Ninguna" };
        // Si el trabajador se repite en el Excel, conservar la fila con la FECHA MÁS RECIENTE
        const prev = byWorker.get(w.id);
        if (!prev || (ultima_emo || "") > (prev.ultima_emo || "")) byWorker.set(w.id, entry);
      }
      // Solo actualizar si la fecha del Excel es MÁS RECIENTE que la ya guardada
      const matched = [], omitidos = [];
      for (const entry of byWorker.values()) {
        const existente = entry.worker.ultima_emo || "";
        if (entry.ultima_emo && existente && entry.ultima_emo <= existente) omitidos.push(entry.nombre);
        else matched.push(entry);
      }
      if (!matched.length && !sinMatch.length && !omitidos.length) { showToast("No se reconocieron datos.", "error"); return; }
      setEmoPreview({ matched, sinMatch, omitidos });
    };
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (evt) => { const wb = XLSX.read(evt.target.result, { type: "binary", cellDates: false }); handle(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" })); };
      reader.readAsBinaryString(file);
    } else { Papa.parse(file, { header: true, complete: (res) => handle(res.data) }); }
  };
  const executeEmoImport = async () => {
    setEmoImporting(true);
    let ok = 0;
    for (const m of emoPreview.matched) {
      const venc = calcularVigencia(m.ultima_emo || m.worker.ultima_emo, m.worker.duracion_emo || "Anual");
      const patch = { aptitud: m.aptitud, restriccion_medica: m.restriccion };
      if (m.ultima_emo) { patch.ultima_emo = m.ultima_emo; patch.vencimiento_emo = venc; }
      const { error } = await supabase.from("trabajadores").update(patch).eq("id", m.worker.id);
      if (!error) ok++;
    }
    // refrescar
    const { data } = await supabase.from("trabajadores").select("*").eq("empresa_id", empresaId);
    if (data) setWorkers(data);
    setEmoImporting(false); setEmoPreview(null);
    showToast(`${ok} trabajador(es) actualizado(s)`, "success");
  };

  const executeImport = async (mode) => {
    const { nuevos, existentes } = importPreview;
    setIsImporting(true);
    let importados = 0, actualizados = 0;

    if (nuevos.length) {
      const { data, error } = await supabase.from("trabajadores").insert(nuevos).select();
      if (error) { showToast("Error al importar: " + error.message, "error"); setIsImporting(false); return; }
      setWorkers(prev => [...prev, ...data]);
      importados = data.length;
    }

    if (mode === "actualizar" && existentes.length) {
      const estaVacio = v => v === null || v === undefined || String(v).trim() === "" || v === "No evaluado" || v === "Ninguna";
      const CAMPOS = ['cargo','celular','email','genero','tipo_documento','sede','fecha_nacimiento','fecha_ingreso','ultima_emo','duracion_emo','vencimiento_emo','lectura_emo','aptitud','restriccion_medica','epp_detalle','epp_fecha','tipo_vinculacion','area'];

      for (const nuevo of existentes) {
        const existing = workers.find(x => x.dni === nuevo.dni);
        if (!existing) continue;

        // Solo parchar campos que estén vacíos en el existente y con valor en el Excel
        const patch = {};
        for (const field of CAMPOS) {
          if (estaVacio(existing[field]) && !estaVacio(nuevo[field])) {
            patch[field] = nuevo[field];
          }
        }
        if (!existing.epp_recibido && nuevo.epp_recibido) patch.epp_recibido = true;

        if (!Object.keys(patch).length) continue; // nada nuevo que agregar
        const { error } = await supabase.from("trabajadores").update(patch).eq("id", existing.id);
        if (!error) actualizados++;
      }
      const { data } = await supabase.from("trabajadores").select("*").eq("empresa_id", empresaId);
      if (data) setWorkers(data);
    }

    setIsImporting(false);
    setImportPreview(null);
    const partes = [importados && `${importados} nuevos importados`, actualizados && `${actualizados} actualizados`].filter(Boolean);
    showToast(partes.length ? partes.join(", ") : "Sin cambios", "success");
  };

  // ── Importador dedicado: Fecha de Ingreso (Comindustria) — empareja por DNI o nombre ──
  const [ingImporting, setIngImporting] = useState(false);
  const importFechaIngreso = (e) => {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = "";
    const reader = new FileReader();
    reader.onload = async (ev) => {
      setIngImporting(true);
      try {
        const wb = XLSX.read(ev.target.result, { type: "binary", cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        let h = rows.findIndex(r => r.some(c => normF(c).includes("ingreso")));
        if (h < 0) h = 0;
        const head = (rows[h] || []).map(normF);
        const find = (...terms) => { for (const t of terms) { const i = head.findIndex(c => c.includes(t)); if (i >= 0) return i; } return -1; };
        const cDni = find("numero documento", "dni", "documento");
        const cNom = find("nombre completo", "apellidos y nombres", "nombre", "apellido");
        const cIng = find("fecha de ingreso", "fecha ingreso", "ingreso");
        if (cIng < 0) { showToast("No se encontró la columna de Fecha de Ingreso.", "error"); setIngImporting(false); return; }
        if (cDni < 0 && cNom < 0) { showToast("El Excel debe tener una columna de DNI o de Nombre.", "error"); setIngImporting(false); return; }
        const byDni = {}, byNom = {};
        workers.forEach(w => { if (w.dni) byDni[String(w.dni).replace(/\D/g, "")] = w; if (w.nombre) byNom[claveNombre(w.nombre)] = w; });
        const updates = []; let sin = 0;
        for (let i = h + 1; i < rows.length; i++) {
          const r = rows[i];
          const ing = excelDateToISO(r[cIng]); if (!ing) continue;
          let w = null;
          if (cDni >= 0) { const d = String(r[cDni] || "").replace(/\D/g, ""); if (d) w = byDni[d]; }
          if (!w && cNom >= 0) { const nm = claveNombre(String(r[cNom] || "")); if (nm) w = byNom[nm]; }
          if (!w) { if (String((cDni >= 0 ? r[cDni] : "") || (cNom >= 0 ? r[cNom] : "")).trim()) sin++; continue; }
          updates.push({ id: w.id, fecha_ingreso: ing });
        }
        if (!updates.length) { showToast("No se encontró ningún trabajador para actualizar.", "error"); setIngImporting(false); return; }
        for (const u of updates) await supabase.from("trabajadores").update({ fecha_ingreso: u.fecha_ingreso }).eq("id", u.id);
        const { data } = await supabase.from("trabajadores").select("*").eq("empresa_id", empresaId);
        if (data) setWorkers(data);
        showToast(`✅ ${updates.length} fechas de ingreso actualizadas${sin ? ` · ${sin} sin coincidencia` : ""}`, "success");
      } catch (err) { showToast("Error al leer el archivo: " + err.message, "error"); }
      setIngImporting(false);
    };
    reader.readAsBinaryString(file);
  };

  const exportExcel = () => {
    const headers = ["APELLIDO Y NOMBRE", "FECHA DE NACIMIENTO", "EDAD", "DOC. DE IDENTIDAD", "PUESTO", ...(esComindustria ? ["FECHA DE INGRESO"] : []), ...(esMultisel ? ["VINCULACION", "AREA"] : []), "CELULAR", "CORREO", "ULTIMA EMO", "DURACION DE EMO", "VIGENTE HASTA", "ESTADO", "APTITUD", ...(canSeeMedical ? ["RESTRICCION"] : []), "LECTURA 2026", ...(!esGrupoCafe ? ["EPP RECIBIDO", "EPP DETALLE", "EPP FECHA"] : [])];
    const data = filtered.map(w => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); return [w.nombre, w.fecha_nacimiento || "", calcularEdad(w.fecha_nacimiento) || "", w.dni, w.cargo || "", ...(esComindustria ? [w.fecha_ingreso || ""] : []), ...(esMultisel ? [w.tipo_vinculacion || "", w.area || ""] : []), w.celular || "", w.email || "", w.ultima_emo || "", w.duracion_emo || "", v || "", w.estado, w.aptitud, ...(canSeeMedical ? [w.restriccion_medica || ""] : []), w.lectura_emo || "", ...(!esGrupoCafe ? [w.epp_recibido ? "SI" : "NO", w.epp_detalle || "", w.epp_fecha || ""] : [])]; });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Directorio");
    XLSX.writeFile(wb, "sabana_personal.xlsx");
    showToast("Excel descargado", "success");
  };

  // ── Importar cesados desde Excel ──
  const importCesados = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = async (ev) => {
      setImportandoCesados(true);
      try {
        const wb = XLSX.read(ev.target.result, { type: "binary", cellDates: false });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
        const valid = rows.filter(r => r["APELLIDO Y NOMBRE"] && r["DOC. DE IDENTIDAD"]);
        if (!valid.length) { showToast("Archivo inválido. Verifica los encabezados.", "error"); setImportandoCesados(false); return; }
        const inserts = valid.map(r => ({
          nombre: String(r["APELLIDO Y NOMBRE"]).trim(),
          dni: String(r["DOC. DE IDENTIDAD"]).replace(/\D/g, "").slice(0, 8),
          cargo: String(r["CARGO"] || r["PUESTO"] || "").trim() || null,
          fecha_nacimiento: excelDateToISO(r["FECHA DE NACIMIENTO"]) || null,
          fecha_cese: excelDateToISO(r["FECHA DE CESE"]) || null,
          motivo_cese: String(r["MOTIVO DE CESE"] || "").trim() || null,
          aptitud: String(r["APTITUD"] || "No evaluado").trim(),
          estado: "Cesado",
          sede: "Lima",
          duracion_emo: "Anual",
          empresa_id: empresaId,
        }));
        const { error } = await supabase.from("trabajadores").insert(inserts);
        if (error) { showToast("Error al insertar: " + error.message, "error"); setImportandoCesados(false); return; }
        // Recargar workers desde App (actualizar state local)
        const { data } = await supabase.from("trabajadores").select("*").eq("empresa_id", empresaId);
        if (data) setWorkers(data);
        showToast(`✅ ${inserts.length} cesados importados`, "success");
      } catch (err) { showToast("Error al leer el archivo: " + err.message, "error"); }
      setImportandoCesados(false);
    };
    reader.readAsBinaryString(file);
  };

  const aptitudColor = { "Apto": "green", "Apto con restricción": "amber", "Observado": "blue", "No apto": "red", "No evaluado": "gray" };

  return (
    <div>
      {showGuide && <ImportGuideModal onClose={() => setShowGuide(false)} />}
      {showGuideFUP && (
        <Modal title="Importar personal — Formato RRHH (FUP)" onClose={() => setShowGuideFUP(false)} wide>
          <div className="space-y-4 text-sm text-gray-300">
            <p className="text-gray-400">Sube el reporte de empleados que te envía RRHH (FUP). El sistema lee <b>ambas hojas</b>: <b>ACTIVOS</b> y <b>CESADOS</b>, y registra a cada trabajador con su estado correspondiente.</p>
            <p className="text-gray-400">Del archivo solo se importan estas columnas (el resto se ignora):</p>
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-gray-800"><th className="text-left text-gray-500 font-medium px-3 py-2">Columna del Excel</th><th className="text-left text-gray-500 font-medium px-3 py-2">Se guarda como</th></tr></thead>
                <tbody>
                  {[
                    ["NOMBRE COMPLETO", "Nombre"],
                    ["TIPO DOCUMENTO IDENTIDAD", "Tipo de documento"],
                    ["NÚMERO DOCUMENTO IDENTIDAD", "DNI / CE"],
                    ["SEXO", "Género"],
                    ["TELEF. CELULAR", "Celular"],
                    ["CORREO PERSONAL", "Correo"],
                    ["FECHA NACIMIENTO", "Fecha de nacimiento"],
                    ["EDAD", "Edad"],
                    ["PUESTO", "Cargo"],
                    ["SEDE", "Sede"],
                    ["(Hoja ACTIVOS / CESADOS)", "Estado: Activo / Cesado"],
                  ].map(([a, b]) => (
                    <tr key={a} className="border-b border-gray-800/50"><td className="px-3 py-2 font-mono text-blue-400 whitespace-nowrap">{a}</td><td className="px-3 py-2 text-gray-400">{b}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2.5 rounded-lg bg-amber-900/20 border border-amber-800/40 text-xs text-amber-400">
              Se importan a la empresa <b>actualmente seleccionada</b> ({empresa?.nombre || "—"}). Los trabajadores con DNI ya existente no se duplican (puedes elegir actualizar sus datos en la vista previa).
            </div>

            <div className="border-t border-gray-800 pt-3">
              <p className="font-semibold text-emerald-300 mb-1.5">2. Importar EMO / Aptitud (complemento)</p>
              <p className="text-gray-400 text-xs mb-2">Después de cargar el personal, sube el segundo Excel para completar datos médicos. Empareja por <b>Nombre completo</b> con los trabajadores ya cargados. Debe contener estas columnas:</p>
              <div className="overflow-x-auto rounded-lg border border-gray-800">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-gray-800"><th className="text-left text-gray-500 font-medium px-3 py-2">Columna del Excel</th><th className="text-left text-gray-500 font-medium px-3 py-2">Se usa para</th></tr></thead>
                  <tbody>
                    {[
                      ["NOMBRE COMPLETO", "Emparejar con el trabajador (obligatorio)"],
                      ["FECHA DE ÚLTIMO EMO", "Última EMO (calcula el vencimiento)"],
                      ["APTITUD", "Aptitud médica"],
                      ["RESTRICCIÓN", "Restricción médica"],
                    ].map(([a, b]) => (
                      <tr key={a} className="border-b border-gray-800/50"><td className="px-3 py-2 font-mono text-emerald-400 whitespace-nowrap">{a}</td><td className="px-3 py-2 text-gray-400">{b}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5">Regla: si la <b>APTITUD</b> es <b>"Apto"</b>, la restricción se guarda como <b>"Ninguna"</b> automáticamente.</p>
              <p className="text-[11px] text-gray-600 mt-1">Los nombres que no coincidan con un trabajador del Directorio se listan aparte (no se actualizan).</p>
            </div>

            <div className="flex justify-end"><Btn variant="primary" onClick={() => setShowGuideFUP(false)}>Entendido</Btn></div>
          </div>
        </Modal>
      )}

      {/* Vista previa — Importar EMO / Aptitud */}
      {emoPreview && (
        <Modal title="Importar EMO / Aptitud" onClose={() => setEmoPreview(null)} wide>
          <div className="flex gap-3 mb-5">
            <div className="flex-1 text-center bg-emerald-900/30 border border-emerald-800/50 rounded-xl px-4 py-3"><div className="text-2xl font-bold text-emerald-400">{emoPreview.matched.length}</div><div className="text-xs text-emerald-600 mt-0.5">Trabajadores a actualizar</div></div>
            <div className="flex-1 text-center bg-amber-900/20 border border-amber-800/40 rounded-xl px-4 py-3"><div className="text-2xl font-bold text-amber-400">{emoPreview.omitidos?.length || 0}</div><div className="text-xs text-amber-600/80 mt-0.5">Ya tienen una EMO más reciente</div></div>
            <div className="flex-1 text-center bg-gray-800 border border-gray-700 rounded-xl px-4 py-3"><div className="text-2xl font-bold text-gray-300">{emoPreview.sinMatch.length}</div><div className="text-xs text-gray-500 mt-0.5">Fuera del directorio (se omiten)</div></div>
          </div>
          {(emoPreview.omitidos?.length || 0) > 0 && (
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-amber-900/15 border border-amber-900/40 text-xs text-amber-300/90">
              Se conserva la fecha ya guardada porque es <b>más reciente</b> que la del Excel (no se sobrescribe con una más antigua): <span className="text-amber-200">{emoPreview.omitidos.slice(0, 12).join(" · ")}{emoPreview.omitidos.length > 12 ? "…" : ""}</span>
            </div>
          )}
          {emoPreview.sinMatch.length > 0 && (
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-gray-800/60 border border-gray-700 text-xs text-gray-400">
              Estos nombres <b>no están en el directorio</b> (probablemente cesados) y se omiten — solo se actualiza al personal ya registrado: <span className="text-gray-300">{emoPreview.sinMatch.slice(0, 12).join(" · ")}{emoPreview.sinMatch.length > 12 ? "…" : ""}</span>
            </div>
          )}
          <div className="overflow-x-auto mb-5 rounded-lg border border-gray-800 max-h-72">
            <table className="w-full text-xs"><thead><tr className="border-b border-gray-800 bg-gray-900">{["Trabajador", "Última EMO", "Aptitud", "Restricción"].map(h => <th key={h} className="text-left text-gray-600 font-medium px-3 py-2">{h}</th>)}</tr></thead>
              <tbody>{emoPreview.matched.slice(0, 12).map((m, i) => (
                <tr key={i} className="border-b border-gray-800/50"><td className="px-3 py-2 text-white">{m.worker.nombre}</td><td className="px-3 py-2 font-mono text-gray-400">{m.ultima_emo || "—"}</td><td className="px-3 py-2 text-gray-400">{m.aptitud || "—"}</td><td className="px-3 py-2 text-gray-400">{m.restriccion || "—"}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2"><Btn onClick={() => setEmoPreview(null)}>Cancelar</Btn><Btn variant="primary" onClick={executeEmoImport} disabled={emoImporting || !emoPreview.matched.length}>{emoImporting ? "Actualizando..." : `Actualizar ${emoPreview.matched.length}`}</Btn></div>
        </Modal>
      )}

      {/* Pestañas Activos / Cesados */}
      {(
        <div className="flex gap-2 mb-4 bg-gray-900/50 border border-gray-800 rounded-xl p-1.5 w-fit">
          <button onClick={() => setVistaDir("activos")}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${vistaDir === "activos" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-200"}`}>
            Activos ({workersActivos.length})
          </button>
          <button onClick={() => setVistaDir("cesados")}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${vistaDir === "cesados" ? "bg-red-700 text-white" : "text-gray-500 hover:text-gray-200"}`}>
            Cesados ({workersCesados.length})
          </button>
        </div>
      )}

      {/* ── Vista Cesados ── */}
      {vistaDir === "cesados" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold text-white">Trabajadores Cesados</div>
              <div className="text-xs text-gray-600">{workersCesados.length} registro(s)</div>
            </div>
            <div className="flex gap-2">
              <Btn size="sm" onClick={() => setShowGuideCesados(true)}><HelpCircle size={13} /> Guía</Btn>
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-all cursor-pointer">
                  <Upload size={13} /> {importandoCesados ? "Importando..." : "Importar Excel"}
                </span>
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={importCesados} disabled={importandoCesados} />
              </label>
              <Btn size="sm" variant="primary" onClick={() => openModal()}><Plus size={13} /> Registrar cesado</Btn>
            </div>
          </div>
          {/* ── Cesados: tarjetas móvil ── */}
          <div className="md:hidden space-y-2.5">
            {workersCesados.map(w => (
              <div key={w.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3.5">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <div className="font-semibold text-white text-sm leading-tight">{w.nombre}</div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">DNI {w.dni}</div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => openModal(w)} className="text-gray-500 hover:text-blue-400 p-1"><Pencil size={15} /></button>
                    {puedeEliminar() && (
                      <button onClick={() => deleteWorker(w.id)} className="text-red-500/60 hover:text-red-400 p-1"><Trash2 size={15} /></button>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-400 mb-2">{w.cargo || "Sin cargo"}</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs border-t border-gray-800 pt-2">
                  <div><span className="text-gray-600">Cese:</span> <span className="text-gray-400 font-mono">{fmtFecha(w.fecha_cese)}</span></div>
                  <div className="truncate"><span className="text-gray-600">Motivo:</span> <span className="text-gray-400">{w.motivo_cese || "—"}</span></div>
                </div>
                <div className="mt-2"><Badge color={aptitudColor[canonApt(w.aptitud)] || "gray"}>{w.aptitud ? canonApt(w.aptitud) : "—"}</Badge></div>
              </div>
            ))}
            {!workersCesados.length && <div className="text-center text-gray-600 text-sm py-8 bg-gray-900 border border-gray-800 rounded-xl">Sin trabajadores cesados registrados.</div>}
          </div>

          {/* ── Cesados: tabla escritorio ── */}
          <div className="hidden md:block bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800">
                {["Apellido y Nombre","DNI","Cargo","Fecha de cese","Motivo","Aptitud",""].map(h => (
                  <th key={h} className="text-left text-xs text-gray-600 font-medium px-3 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {workersCesados.map(w => (
                  <tr key={w.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-3 py-3 font-medium text-white">{w.nombre}</td>
                    <td className="px-3 py-3 font-mono text-xs text-gray-500">{w.dni}</td>
                    <td className="px-3 py-3 text-gray-400">{w.cargo || "—"}</td>
                    <td className="px-3 py-3 font-mono text-xs text-gray-400">{fmtFecha(w.fecha_cese)}</td>
                    <td className="px-3 py-3 text-xs text-gray-400">{w.motivo_cese || "—"}</td>
                    <td className="px-3 py-3"><Badge color={aptitudColor[canonApt(w.aptitud)] || "gray"}>{w.aptitud ? canonApt(w.aptitud) : "—"}</Badge></td>
                    <td className="px-3 py-3"><div className="flex gap-1">
                      <button onClick={() => openModal(w)} className="text-gray-500 hover:text-blue-400"><Pencil size={13} /></button>
                      {puedeEliminar() && (
                        <button onClick={() => deleteWorker(w.id)} className="text-red-500/40 hover:text-red-400"><Trash2 size={13} /></button>
                      )}
                    </div></td>
                  </tr>
                ))}
                {!workersCesados.length && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-600 text-sm">Sin trabajadores cesados registrados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Vista Activos ── */}
      {vistaDir === "activos" && (
      <div>
      <div className="flex items-center justify-between mb-4">
        <div><div className="text-sm font-semibold text-white">Sábana de Personal</div><div className="text-xs text-gray-600">{filtered.length} de {workersActivos.length} trabajadores</div></div>
        <div className="flex gap-2 flex-wrap">
          {esGrupoCafe
            ? <>
                <Btn size="sm" onClick={() => setShowGuideFUP(true)}><HelpCircle size={13} /> Guía</Btn>
                <label className="cursor-pointer"><span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-700 text-blue-300 hover:bg-blue-900/30 transition-all cursor-pointer"><Upload size={13} /> 1. Importar RRHH (FUP)</span><input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={importFUP} /></label>
                <label className="cursor-pointer"><span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-700 text-emerald-300 hover:bg-emerald-900/30 transition-all cursor-pointer"><Upload size={13} /> 2. Importar EMO/Aptitud</span><input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={importEMO} /></label>
              </>
            : <>
                <Btn size="sm" onClick={() => setShowGuide(true)}><HelpCircle size={13} /> Guía</Btn>
                <label className="cursor-pointer"><span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-all cursor-pointer"><Upload size={13} /> Importar Excel/CSV</span><input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={importCSV} /></label>
              </>}
          {esComindustria && (
            <label className="cursor-pointer"><span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-700 text-emerald-300 hover:bg-emerald-900/30 transition-all cursor-pointer ${ingImporting ? "opacity-50 pointer-events-none" : ""}`}><Upload size={13} /> {ingImporting ? "Importando..." : "Importar F. Ingreso"}</span><input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={importFechaIngreso} disabled={ingImporting} /></label>
          )}
          <Btn size="sm" onClick={exportExcel}><Download size={13} /> Exportar</Btn>
          <Btn size="sm" variant="primary" onClick={() => openModal()}><Plus size={13} /> Registrar</Btn>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4 md:flex md:flex-wrap md:items-center">
        <Input placeholder="Buscar nombre o DNI..." value={filter.text} onChange={e => setFilter(f => ({ ...f, text: e.target.value }))} className="col-span-2 w-full md:w-auto md:flex-1 md:min-w-[160px]" />
        <MultiSelect value={filter.cargo} onChange={v => setFilter(f => ({ ...f, cargo: v }))} options={cargos} placeholder="Puestos" className="md:w-[180px]" />
        {esGrupoCafe && <MultiSelect value={filter.sede} onChange={v => setFilter(f => ({ ...f, sede: v }))} options={sedes} placeholder="Sedes" className="md:w-[160px]" />}
        <Select value={filter.estado} onChange={e => setFilter(f => ({ ...f, estado: e.target.value }))} className="md:w-[150px]"><option value="">Todos los estados</option>{["Activo", "Vacaciones", "Inactivo"].map(s => <option key={s}>{s}</option>)}</Select>
        <div className="flex flex-wrap gap-1 items-center col-span-2 md:col-span-1">
          {APTITUDES.map(a => {
            const on = filter.aptitud.includes(a);
            const col = { "Apto": "text-emerald-300 border-emerald-700 bg-emerald-900/40", "Apto con restricción": "text-amber-300 border-amber-700 bg-amber-900/30", "Observado": "text-blue-300 border-blue-700 bg-blue-900/30", "No apto": "text-red-300 border-red-700 bg-red-900/40", "No evaluado": "text-gray-400 border-gray-600 bg-gray-800" }[a];
            return (
              <button key={a} onClick={() => toggleAptitud(a)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all ${on ? col : "text-gray-600 border-gray-800 bg-gray-900 hover:border-gray-600 hover:text-gray-400"}`}>
                {a}
              </button>
            );
          })}
          {filter.aptitud.length > 0 && <button onClick={() => setFilter(f => ({ ...f, aptitud: [] }))} className="text-[11px] text-blue-400 hover:text-blue-300 ml-1">✕</button>}
        </div>
        {!esGrupoCafe && <Select value={filter.epp} onChange={e => setFilter(f => ({ ...f, epp: e.target.value }))} className="md:w-[140px]"><option value="">EPP: Todos</option><option value="si">Con EPP</option><option value="no">Sin EPP</option></Select>}
        {esMultisel && <Select value={filter.vinculacion} onChange={e => setFilter(f => ({ ...f, vinculacion: e.target.value }))} className="md:w-[160px]"><option value="">Vinculación: Todos</option><option value="Planilla">Planilla</option><option value="Servicio">Servicio</option></Select>}
        <Select value={filter.lectura} onChange={e => setFilter(f => ({ ...f, lectura: e.target.value }))} className="md:w-[170px]"><option value="">Lectura EMO: Todos</option><option value="si">Con lectura</option><option value="no">Sin lectura</option></Select>
        <Select value={filter.emo} onChange={e => setFilter(f => ({ ...f, emo: e.target.value }))} className="col-span-2 md:col-span-1 md:w-[190px]"><option value="">EMO: Todos</option><option value="alerta">⚠ En alerta (≤30d + vencidos)</option><option value="porvencer">Por vencer (≤30 días)</option><option value="vencido">Vencidos</option></Select>
      </div>
      {/* ── Vista móvil: tarjetas ── */}
      <div className="md:hidden space-y-2.5">
        {paged.map(w => {
          const vigencia = calcularVigencia(w.ultima_emo, w.duracion_emo);
          const isVenc = vigencia && new Date(vigencia) < new Date();
          const in30m = new Date(); in30m.setDate(in30m.getDate() + 30);
          const soonVenc = !isVenc && vigencia && new Date(vigencia) <= in30m;
          const edad = calcularEdad(w.fecha_nacimiento);
          return (
            <div key={w.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3.5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="font-semibold text-white text-sm leading-tight">{w.nombre}</div>
                  <div className="text-xs text-gray-500 font-mono mt-0.5">DNI {w.dni}{edad ? ` · ${edad} años` : ""}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Btn size="sm" onClick={() => openModal(w)}>Editar</Btn>
                  {puedeEliminar() && (
                    <Btn size="sm" variant="danger" disabled={isDeleting === w.id} onClick={() => deleteWorker(w.id)}><Trash2 size={12} /></Btn>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-400 mb-2">{w.cargo || "Sin puesto"}{esMultisel && w.area ? ` · ${w.area}` : ""}</div>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                <Badge color={w.estado === "Activo" ? "green" : "amber"}>{w.estado}</Badge>
                <Badge color={aptitudColor[canonApt(w.aptitud)] || "gray"}>{canonApt(w.aptitud)}</Badge>
                {esMultisel && w.tipo_vinculacion && <Badge color={w.tipo_vinculacion === "Planilla" ? "green" : "blue"}>{w.tipo_vinculacion}</Badge>}
                {!esGrupoCafe && <Badge color={w.epp_recibido ? "green" : "gray"}>{w.epp_recibido ? "EPP ✓" : "Sin EPP"}</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs border-t border-gray-800 pt-2.5">
                <div><span className="text-gray-600">Última EMO:</span> <span className="text-gray-400 font-mono">{fmtFecha(w.ultima_emo)}</span></div>
                <div><span className="text-gray-600">Vigente:</span> <span className={`font-mono font-medium ${isVenc ? "text-red-400" : soonVenc ? "text-amber-400" : "text-gray-400"}`}>{vigencia || "—"}</span></div>
                {w.celular && <div><span className="text-gray-600">Cel:</span> <span className="text-gray-400 font-mono">{w.celular}</span></div>}
                {w.email && <div className="truncate"><span className="text-gray-600">Correo:</span> <a href={`mailto:${w.email}`} className="text-blue-400">{w.email}</a></div>}
                {esGrupoCafe && w.sede && <div><span className="text-gray-600">Sede:</span> <span className="text-gray-400">{w.sede}</span></div>}
                {(esGrupoCafe || esComindustria) && w.genero && <div><span className="text-gray-600">Género:</span> <span className="text-gray-400">{w.genero}</span></div>}
                {esGrupoCafe && w.tipo_documento && <div><span className="text-gray-600">Tipo doc:</span> <span className="text-gray-400">{w.tipo_documento}</span></div>}
                {esComindustria && w.fecha_ingreso && <div><span className="text-gray-600">Ingreso:</span> <span className="text-gray-400 font-mono">{fmtFecha(w.fecha_ingreso)}</span></div>}
              </div>
              {canSeeMedical && w.restriccion_medica && w.restriccion_medica !== "Ninguna" && (
                <div className="flex items-start gap-1.5 mt-2.5 text-xs text-amber-400 bg-amber-900/20 border border-amber-900/40 rounded-lg px-2.5 py-1.5">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" /><span>{w.restriccion_medica}</span>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <div className="text-center text-gray-600 text-sm py-8 bg-gray-900 border border-gray-800 rounded-xl">No se encontraron trabajadores</div>}
      </div>

      {/* ── Vista escritorio: tabla ── */}
      <div className="hidden md:block">
        {/* Barra de scroll horizontal superior (sincronizada) */}
        <div ref={topScrollRef} onScroll={() => syncFrom(topScrollRef, tableScrollRef)}
          className="overflow-x-auto overflow-y-hidden mb-1.5" style={{ height: 12 }}>
          <div style={{ width: tableW, height: 1 }} />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div ref={tableScrollRef} onScroll={() => syncFrom(tableScrollRef, topScrollRef)}
            className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)]">
            <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {["Apellido y Nombre", "F. Nac / Edad", ...((esGrupoCafe || esComindustria) ? ["Género"] : []), "DNI", ...(esGrupoCafe ? ["Tipo Doc"] : []), "Puesto", ...(esComindustria ? ["F. Ingreso"] : []), ...(esGrupoCafe ? ["Sede"] : []), ...(esMultisel ? ["Vinculación", "Área"] : []), "Celular", "Correo", "Última EMO", "Duración", "Vigente Hasta", "Estado", "Aptitud", ...(!esGrupoCafe ? ["EPP"] : []), "Lectura EMO", ...(canSeeMedical ? ["Restricción"] : []), ""].map((h, i) => (
                  <th key={h} className={`text-left text-xs text-gray-600 font-medium px-3 py-3 uppercase tracking-wide whitespace-nowrap sticky top-0 bg-gray-900 ${i === 0 ? "left-0 z-30 shadow-[2px_0_6px_rgba(0,0,0,0.4)]" : "z-20"}`}>
                    {i === 0 ? (
                      <button type="button" onClick={() => setSortDir(d => d === "az" ? "za" : d === "za" ? null : "az")}
                        className="flex items-center gap-1 uppercase tracking-wide hover:text-gray-300 transition-colors" title="Ordenar por nombre">
                        {h} <span className={sortDir ? "text-blue-400" : "text-gray-700"}>{sortDir === "za" ? "▼" : sortDir === "az" ? "▲" : "↕"}</span>
                      </button>
                    ) : h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map(w => {
                const vigencia = calcularVigencia(w.ultima_emo, w.duracion_emo);
                const isVenc = vigencia && new Date(vigencia) < new Date();
                const in30 = new Date(); in30.setDate(in30.getDate() + 30);
                const soonVenc = !isVenc && vigencia && new Date(vigencia) <= in30;
                const edad = calcularEdad(w.fecha_nacimiento);
                return (
                  <tr key={w.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors group">
                    <td className="px-3 py-3 font-medium text-white whitespace-nowrap sticky left-0 z-10 bg-gray-900 group-hover:bg-gray-800/30 shadow-[2px_0_6px_rgba(0,0,0,0.4)]">{w.nombre}</td>
                    <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">{fmtFecha(w.fecha_nacimiento)}{edad ? <div className="text-gray-600">{edad} años</div> : null}</td>
                    {(esGrupoCafe || esComindustria) && <td className="px-3 py-3 text-gray-400 whitespace-nowrap">{w.genero || "—"}</td>}
                    <td className="px-3 py-3 font-mono text-xs text-gray-500">{w.dni}</td>
                    {esGrupoCafe && <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{w.tipo_documento || "—"}</td>}
                    <td className="px-3 py-3 text-gray-400 whitespace-nowrap">{w.cargo || "—"}</td>
                    {esComindustria && <td className="px-3 py-3 text-gray-400 whitespace-nowrap font-mono text-xs">{w.fecha_ingreso ? fmtFecha(w.fecha_ingreso) : "—"}</td>}
                    {esGrupoCafe && <td className="px-3 py-3 text-gray-400 whitespace-nowrap">{w.sede || "—"}</td>}
                    {esMultisel && <td className="px-3 py-3 whitespace-nowrap"><Badge color={w.tipo_vinculacion === "Planilla" ? "green" : w.tipo_vinculacion === "Servicio" ? "blue" : "gray"}>{w.tipo_vinculacion || "—"}</Badge></td>}
                    {esMultisel && <td className="px-3 py-3 text-xs text-gray-400 whitespace-nowrap">{w.area || "—"}</td>}
                    <td className="px-3 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">{w.celular || "—"}</td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      {w.email
                        ? <a href={`mailto:${w.email}`} className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors" title={w.email}>
                            <Mail size={11} /><span className="truncate max-w-[140px]">{w.email}</span>
                          </a>
                        : <span className="text-gray-700">—</span>}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{fmtFecha(w.ultima_emo)}</td>
                    <td className="px-3 py-3"><Badge color={w.duracion_emo === "Bianual" ? "purple" : "blue"}>{w.duracion_emo || "Anual"}</Badge></td>
                    <td className={`px-3 py-3 font-mono text-xs whitespace-nowrap font-medium ${isVenc ? "text-red-400" : soonVenc ? "text-amber-400" : "text-gray-400"}`}>{vigencia || "—"}</td>
                    <td className="px-3 py-3"><Badge color={w.estado === "Activo" ? "green" : "amber"}>{w.estado}</Badge></td>
                    <td className="px-3 py-3"><Badge color={aptitudColor[canonApt(w.aptitud)] || "gray"}>{canonApt(w.aptitud)}</Badge></td>
                    {!esGrupoCafe && <td className="px-3 py-3">{w.epp_recibido ? <div><Badge color="green">✓ Sí</Badge>{w.epp_detalle && <div className="text-xs text-gray-600 mt-0.5 max-w-32 truncate">{w.epp_detalle}</div>}</div> : <Badge color="gray">No</Badge>}</td>}
                    <td className="px-3 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{fmtFecha(w.lectura_emo)}</td>
                    {canSeeMedical && (
                      <td className="px-3 py-3 text-xs">
                        {w.restriccion_medica && w.restriccion_medica !== "Ninguna" ? (
                          <span
                            className="inline-flex items-center gap-1 max-w-[170px] bg-amber-500 border border-amber-600 text-gray-900 font-medium rounded-md px-1.5 py-0.5 cursor-default align-middle"
                            onMouseEnter={e => {
                              const r = e.currentTarget.getBoundingClientRect();
                              setTooltip({ text: w.restriccion_medica, x: r.left + r.width / 2, y: r.top });
                            }}
                            onMouseLeave={() => setTooltip(null)}
                          >
                            <AlertTriangle size={12} className="shrink-0" />
                            <span className="truncate">{w.restriccion_medica}</span>
                          </span>
                        ) : (
                          <span className="text-gray-700">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-3"><div className="flex gap-1"><Btn size="sm" onClick={() => openModal(w)}>Editar</Btn>{puedeEliminar() && (<Btn size="sm" variant="danger" disabled={isDeleting === w.id} onClick={() => deleteWorker(w.id)}><Trash2 size={12} /></Btn>)}</div></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={15} className="px-4 py-8 text-center text-gray-600 text-sm">No se encontraron trabajadores</td></tr>}
            </tbody>
          </table>
          </div>
        </div>
      </div>
      {filtered.length > PER_PAGE && (
        <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
          <div className="text-xs text-gray-500">
            Mostrando <span className="text-gray-300 font-medium">{(pageSafe - 1) * PER_PAGE + 1}–{Math.min(pageSafe * PER_PAGE, filtered.length)}</span> de <span className="text-gray-300 font-medium">{filtered.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pageSafe <= 1}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1">
              <ChevronLeft size={13} /> Anterior
            </button>
            <span className="text-xs text-gray-500 px-1.5">Pág. <span className="text-gray-300 font-medium">{pageSafe}</span> / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={pageSafe >= totalPages}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1">
              Siguiente <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
      {!canSeeMedical && <div className="flex items-center gap-2 mt-3 text-xs text-gray-600"><Lock size={12} className="text-red-500" /><span className="px-2 py-0.5 rounded bg-red-900/30 text-red-500 border border-red-900 font-mono text-xs">CONFIDENCIAL</span> Restricciones médicas visibles solo para MEDICO, ADMIN y SEGURIDAD</div>}
      </div>
      )}

      {showGuideCesados && <GuideCesadosModal onClose={() => setShowGuideCesados(false)} />}

      {importPreview && (
        <Modal title="Vista previa de importación" onClose={() => setImportPreview(null)} wide>
          <div className="flex gap-3 mb-5">
            <div className="flex-1 text-center bg-green-900/30 border border-green-800/50 rounded-xl px-4 py-3">
              <div className="text-2xl font-bold text-green-400">{importPreview.nuevos.length}</div>
              <div className="text-xs text-green-600 mt-0.5">Nuevos trabajadores</div>
            </div>
            <div className="flex-1 text-center bg-amber-900/20 border border-amber-800/40 rounded-xl px-4 py-3">
              <div className="text-2xl font-bold text-amber-400">{importPreview.existentes.length}</div>
              <div className="text-xs text-amber-600 mt-0.5">Ya registrados (mismo DNI)</div>
            </div>
            <div className="flex-1 text-center bg-gray-800 border border-gray-700 rounded-xl px-4 py-3">
              <div className="text-2xl font-bold text-white">{importPreview.parsed.length}</div>
              <div className="text-xs text-gray-500 mt-0.5">Total detectados</div>
            </div>
          </div>

          <div className="text-xs text-gray-500 mb-2">Primeros 5 registros detectados:</div>
          <div className="overflow-x-auto mb-5 rounded-lg border border-gray-800">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-800 bg-gray-900">
                {["Nombre","DNI","Cargo","Estado"].map(h => <th key={h} className="text-left text-gray-600 font-medium px-3 py-2">{h}</th>)}
              </tr></thead>
              <tbody>
                {importPreview.parsed.slice(0, 5).map((r, i) => {
                  const esExist = importPreview.existentes.some(x => x.dni === r.dni);
                  return (
                    <tr key={i} className="border-b border-gray-800/50">
                      <td className="px-3 py-2 text-white">{r.nombre}</td>
                      <td className="px-3 py-2 font-mono text-gray-400">{r.dni}</td>
                      <td className="px-3 py-2 text-gray-400">{r.cargo || "—"}</td>
                      <td className="px-3 py-2">
                        {esExist
                          ? <span className="px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-400 text-[11px]">Ya existe</span>
                          : <span className="px-2 py-0.5 rounded-full bg-green-900/40 text-green-400 text-[11px]">Nuevo</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {importPreview.existentes.length > 0 && (
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-amber-900/20 border border-amber-800/40 text-xs text-amber-400">
              <strong>{importPreview.existentes.length} trabajador(es)</strong> ya existen con ese DNI. Puedes importar solo los nuevos o actualizar también los existentes con los datos del archivo.
            </div>
          )}

          <div className="flex gap-2 justify-end flex-wrap">
            <Btn onClick={() => setImportPreview(null)}>Cancelar</Btn>
            {importPreview.existentes.length > 0 && (
              <Btn onClick={() => executeImport("solo_nuevos")} disabled={isImporting || importPreview.nuevos.length === 0}>
                Solo importar nuevos ({importPreview.nuevos.length})
              </Btn>
            )}
            <Btn variant="primary" onClick={() => executeImport(importPreview.existentes.length > 0 ? "actualizar" : "solo_nuevos")} disabled={isImporting}>
              {isImporting ? "Importando..." : importPreview.existentes.length > 0
                ? `Importar nuevos + completar campos vacíos en existentes`
                : `Confirmar importación (${importPreview.nuevos.length})`}
            </Btn>
          </div>
        </Modal>
      )}

      {tooltip && (
        <div
          className="fixed z-[9999] pointer-events-none max-w-xs bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-xs text-white shadow-2xl whitespace-pre-wrap"
          style={{ left: tooltip.x, top: tooltip.y - 8, transform: 'translate(-50%, -100%)' }}
        >
          {tooltip.text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </div>
      )}

      {modal && (
        <Modal title={modal === "edit" ? "Editar Trabajador" : "Registrar Trabajador"} onClose={() => setModal(null)} wide>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <div className="col-span-2"><FormField label="Apellido y Nombre"><Input value={form.nombre || ""} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="García López Juan Carlos" /></FormField></div>
            <FormField label="DNI (solo números)"><Input value={form.dni || ""} maxLength={8} onChange={e => { const val = e.target.value.replace(/\D/g, ""); setForm(f => ({ ...f, dni: val })); }} placeholder="12345678" /></FormField>
            <FormField label="Celular"><Input value={form.celular || ""} maxLength={12} onChange={e => { const val = e.target.value.replace(/\D/g, ""); setForm(f => ({ ...f, celular: val })); }} placeholder="999888777" /></FormField>
            <FormField label="Correo electrónico"><Input type="email" value={form.email || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="nombre@empresa.com" /></FormField>
            <FormField label="Puesto / Cargo"><Input value={form.cargo || ""} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} /></FormField>
            <FormField label="Género">
              <Select value={form.genero || ""} onChange={e => setForm(f => ({ ...f, genero: e.target.value }))}>
                <option value="">Sin especificar</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
              </Select>
            </FormField>
            {esMultisel && (
              <FormField label="Vinculación">
                <Select value={form.tipo_vinculacion || ""} onChange={e => setForm(f => ({ ...f, tipo_vinculacion: e.target.value }))}>
                  <option value="">Seleccionar...</option>
                  <option>Planilla</option>
                  <option>Servicio</option>
                </Select>
              </FormField>
            )}
            {esMultisel && (
              <FormField label="Área">
                <Select value={form.area || ""} onChange={e => setForm(f => ({ ...f, area: e.target.value }))}>
                  <option value="">Seleccionar...</option>
                  {AREAS_MULTISEL.map(a => <option key={a}>{a}</option>)}
                </Select>
              </FormField>
            )}
            <FormField label="Fecha de Nacimiento"><Input type="date" value={form.fecha_nacimiento || ""} onChange={e => setForm(f => ({ ...f, fecha_nacimiento: e.target.value }))} /></FormField>
            {esComindustria && <FormField label="Fecha de Ingreso"><Input type="date" value={form.fecha_ingreso || ""} onChange={e => setForm(f => ({ ...f, fecha_ingreso: e.target.value }))} /></FormField>}
            <FormField label="Estado">
              <Select value={form.estado || "Activo"} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                <option>Activo</option><option>Vacaciones</option><option>Inactivo</option>
                <option>Cesado</option>
              </Select>
            </FormField>
            {form.estado === "Cesado" && (<>
              <FormField label="Fecha de cese"><Input type="date" value={form.fecha_cese || ""} onChange={e => setForm(f => ({ ...f, fecha_cese: e.target.value }))} /></FormField>
              <FormField label="Motivo de cese">
                <Select value={form.motivo_cese || ""} onChange={e => setForm(f => ({ ...f, motivo_cese: e.target.value }))}>
                  <option value="">Seleccionar...</option>
                  {MOTIVOS_CESE.map(m => <option key={m}>{m}</option>)}
                </Select>
              </FormField>
            </>)}
            <FormField label="Sede">{esGrupoCafe
              ? <Input value={form.sede || ""} onChange={e => setForm(f => ({ ...f, sede: e.target.value }))} placeholder="Sede" />
              : <Input value="Lima" disabled className="opacity-50" />}</FormField>
          </div>
          <div className="border border-gray-800 rounded-xl p-3 mb-3">
            <div className="text-xs font-semibold text-gray-300 mb-3">Examen Médico Ocupacional (EMO)</div>
            {canEditEmo ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <FormField label="Última EMO"><Input type="date" value={form.ultima_emo || ""} onChange={e => setForm(f => ({ ...f, ultima_emo: e.target.value }))} /></FormField>
                <FormField label="Duración EMO"><Select value={form.duracion_emo || "Anual"} onChange={e => setForm(f => ({ ...f, duracion_emo: e.target.value }))}><option>Anual</option><option>Bianual</option></Select></FormField>
                <FormField label="Vigente Hasta (automático)"><Input value={calcularVigencia(form.ultima_emo, form.duracion_emo) || "—"} disabled className="opacity-60 bg-gray-700" /></FormField>
                <FormField label="Lectura de Resultados EMO"><Input type="date" value={form.lectura_emo || ""} onChange={e => setForm(f => ({ ...f, lectura_emo: e.target.value }))} /></FormField>
                <FormField label="Aptitud Médica"><Select value={form.aptitud || "No evaluado"} onChange={e => setForm(f => ({ ...f, aptitud: e.target.value }))}><option>Apto</option><option>Apto con restricción</option><option>Observado</option><option>No apto</option><option>No evaluado</option></Select></FormField>
              </div>
            ) : (
              <div className="px-3 py-2.5 rounded-lg bg-amber-900/20 border border-amber-900/40 text-xs text-amber-400 flex items-center gap-2"><Lock size={12} /> Los campos de EMO solo pueden editarlos MEDICO o ADMIN</div>
            )}
          </div>
          {!esGrupoCafe && (
          <div className="border border-gray-800 rounded-xl p-3 mb-3">
            <div className="text-xs font-semibold text-gray-300 mb-3">Equipos de Protección Personal (EPP)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <FormField label="¿Recibió EPP?"><Select value={form.epp_recibido ? "si" : "no"} onChange={e => setForm(f => ({ ...f, epp_recibido: e.target.value === "si" }))}><option value="no">No</option><option value="si">Sí</option></Select></FormField>
              <FormField label="Fecha de entrega EPP"><Input type="date" value={form.epp_fecha || ""} onChange={e => setForm(f => ({ ...f, epp_fecha: e.target.value }))} /></FormField>
              <div className="col-span-2"><FormField label="Detalle de EPP entregado"><Input value={form.epp_detalle || ""} onChange={e => setForm(f => ({ ...f, epp_detalle: e.target.value }))} placeholder="Ej. Casco, guantes, lentes, chaleco..." /></FormField></div>
            </div>
          </div>
          )}
          {canSeeMedical && (
            <FormField label="Detalle Restricción Médica">
              <Input value={form.restriccion_medica || ""} onChange={e => setForm(f => ({ ...f, restriccion_medica: e.target.value }))} disabled={role === "SEGURIDAD"} className={role === "SEGURIDAD" ? "opacity-60 bg-gray-700" : ""} />
              {role === "SEGURIDAD" && <div className="text-xs text-gray-600 mt-1">Solo lectura para rol Seguridad</div>}
            </FormField>
          )}
          <div className="flex gap-2 justify-end mt-4"><Btn onClick={() => setModal(null)}>Cancelar</Btn><Btn variant="primary" disabled={isSaving} onClick={saveWorker}>{isSaving ? "Guardando..." : "Guardar"}</Btn></div>
        </Modal>
      )}
    </div>
  );
}

// ── Modal Guía de Importación de Cesados ──
function GuideCesadosModal({ onClose }) {
  const cols = [
    { col: "APELLIDO Y NOMBRE",  desc: "Nombre completo del trabajador",            ejemplo: "Ramirez Torres Pedro",    req: true  },
    { col: "DOC. DE IDENTIDAD",  desc: "DNI — solo números, 8 dígitos",             ejemplo: "12345678",                 req: true  },
    { col: "CARGO",              desc: "Cargo o puesto que ocupaba",                 ejemplo: "Operador de Planta",       req: false },
    { col: "FECHA DE CESE",      desc: "Fecha de cese DD/MM/AAAA",                  ejemplo: "15/03/2025",               req: false },
    { col: "MOTIVO DE CESE",     desc: "Renuncia / Despido / Término de contrato…", ejemplo: "Término de contrato",      req: false },
    { col: "FECHA DE NACIMIENTO",desc: "Fecha de nacimiento DD/MM/AAAA",            ejemplo: "10/06/1985",               req: false },
    { col: "APTITUD",            desc: "Apto / Apto con restricción / No evaluado", ejemplo: "Apto",                     req: false },
  ];
  const downloadTemplate = () => {
    const headers = cols.map(c => c.col);
    const example = cols.map(c => c.ejemplo);
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws["!cols"] = headers.map(() => ({ wch: 24 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cesados");
    XLSX.writeFile(wb, "plantilla_cesados.xlsx");
    showToast("Plantilla descargada", "success");
  };
  return (
    <Modal title="Guía de Importación — Trabajadores Cesados" onClose={onClose} wide>
      <div className="mb-4 px-3 py-2.5 rounded-lg bg-blue-900/20 border border-blue-900/40 text-xs text-blue-400">
        El archivo Excel debe tener exactamente estos encabezados. Las columnas con <span className="text-red-400">*</span> son obligatorias.
        Todos los trabajadores importados quedarán con estado <strong>Cesado</strong> automáticamente.
      </div>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-gray-800">
            <th className="text-left text-gray-500 font-medium py-2 pr-4">Columna</th>
            <th className="text-left text-gray-500 font-medium py-2 pr-4">Descripción</th>
            <th className="text-left text-gray-500 font-medium py-2">Ejemplo</th>
          </tr></thead>
          <tbody>
            {cols.map(c => (
              <tr key={c.col} className="border-b border-gray-800/50">
                <td className="py-2 pr-4 font-mono text-blue-400 whitespace-nowrap">
                  {c.col}{c.req && <span className="text-red-400 ml-1">*</span>}
                </td>
                <td className="py-2 pr-4 text-gray-400">{c.desc}</td>
                <td className="py-2 text-gray-600 font-mono">{c.ejemplo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 justify-end">
        <Btn onClick={onClose}>Cerrar</Btn>
        <Btn variant="primary" onClick={downloadTemplate}><Download size={13} /> Descargar Plantilla</Btn>
      </div>
    </Modal>
  );
}
