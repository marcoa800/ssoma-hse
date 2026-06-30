// ════════════════════════════════════════════════════════════════════
//  IndicadoresComind — Estadística de SST mensual (Comindustria)
//  Importa Excel de Horas Hombre → KPIs grandes por área.
//  Tabla mensual editable (ADMIN + PROD) con IF/IG/IA calculados.
// ════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase, puedeEliminar } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Btn } from '../../components/ui/Btn.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import {
  Upload, Pencil, Trash2, BarChart2, Users, Clock,
  TrendingUp, AlertTriangle, Download, HelpCircle, CheckCircle, Info
} from 'lucide-react';

const MESES = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio",
               "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const AREAS = ["ADMINISTRATIVO", "PRODUCCION"];

// ── Fórmulas de accidentabilidad ──
const calcIF = (acc, hh) => hh > 0 ? ((acc * 1_000_000) / hh) : 0;
const calcIG = (dp, hh)  => hh > 0 ? ((dp  * 1_000_000) / hh) : 0;
const calcIA = (IF, IG)  => IF > 0 && IG > 0 ? (IF * IG / 1_000) : 0;
// Horas de capacitación del mes = (N° trabajadores × 10 × 26) / 60
const calcCap = (trab) => +(((Number(trab) || 0) * 10 * 26) / 60).toFixed(2);
const fmt2 = (n) => Number(n || 0).toFixed(2);
const fmtN = (n) => Number(n || 0).toLocaleString("es-PE");

// ── Fila vacía de indicadores ──
const filaVacia = (anio, mes, area, empresaId) => ({
  empresa_id: empresaId, anio, mes, area,
  trabajadores: 0, hh_trabajadas: 0, hh_capacitacion: 0,
  acc_leve: 0, acc_incapacitante: 0, acc_fatal: 0,
  dias_perdidos: 0, dias_cargados: 0,
  inc_peligrosos: 0, inc_leve: 0, enf_ocupacional: 0,
});

export default function IndicadoresComind({ empresaId }) {
  const anioActual = new Date().getFullYear();
  const [anio, setAnio] = useState(anioActual);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [editModal, setEditModal] = useState(null); // { anio, mes, area }
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  // KPIs del último import
  const [lastImport, setLastImport] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("indicadores_sst_comind")
      .select("*").eq("empresa_id", empresaId).eq("anio", anio)
      .order("mes").order("area");
    setRecords(data || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId, anio]);

  // ── Importar Excel de Horas Hombre ──
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    // Detectar mes desde nombre del archivo (ej. "HORAS HOMBRE -ENERO 2026.xlsx")
    const nombre = file.name.toUpperCase();
    let mesDetectado = new Date().getMonth() + 1;
    let anioDetectado = new Date().getFullYear();
    MESES.slice(1).forEach((m, i) => {
      if (nombre.includes(m.toUpperCase())) mesDetectado = i + 1;
    });
    const matchAnio = nombre.match(/20\d\d/);
    if (matchAnio) anioDetectado = parseInt(matchAnio[0]);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      setImporting(true);
      try {
        const wb = XLSX.read(ev.target.result, { type: "array", raw: true });

        const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
        const extraer = (sheetName) => {
          const ws = wb.Sheets[sheetName];
          if (!ws) return { trabajadores: 0, hh: 0 };
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
          if (!rows.length) return { trabajadores: 0, hh: 0 };
          const header = (rows[0] || []).map(norm);
          // Columna de horas: priorizar "Total horas acumuladas"; si no existe, "Total horas lab."; fallback col 7
          let colHoras = header.findIndex(h => h.includes("total horas acumulad"));
          if (colHoras < 0) colHoras = header.findIndex(h => h.includes("horas") && h.includes("acumulad"));
          if (colHoras < 0) colHoras = header.findIndex(h => h.includes("total horas") && h.includes("lab"));
          if (colHoras < 0) colHoras = 7;
          // Columna de nombre: "apellidos y nombres"; fallback col 1
          let colNom = header.findIndex(h => h.includes("apellidos") || h.includes("nombre"));
          if (colNom < 0) colNom = 1;
          let trab = 0, hh = 0;
          rows.forEach((r, i) => {
            if (i === 0) return; // header
            const nombre = String(r[colNom] || "").trim();
            if (!nombre || /total/i.test(nombre)) return; // ignora filas vacías y la de TOTAL
            const horas = parseFloat(String(r[colHoras]).replace(/,/g, "")) || 0;
            trab++; hh += horas;
          });
          return { trabajadores: trab, hh: parseFloat(hh.toFixed(2)) };
        };

        const emp  = extraer("EMP");   // Administrativos
        const obj  = extraer("OBJ");   // Producción

        // Guardar en BD (upsert)
        const upserts = [
          { ...filaVacia(anioDetectado, mesDetectado, "ADMINISTRATIVO", empresaId),
            trabajadores: emp.trabajadores, hh_trabajadas: emp.hh, hh_capacitacion: calcCap(emp.trabajadores) },
          { ...filaVacia(anioDetectado, mesDetectado, "PRODUCCION", empresaId),
            trabajadores: obj.trabajadores, hh_trabajadas: obj.hh, hh_capacitacion: calcCap(obj.trabajadores) },
        ];

        for (const u of upserts) {
          const { data: existing } = await supabase.from("indicadores_sst_comind")
            .select("id").eq("empresa_id", empresaId).eq("anio", u.anio)
            .eq("mes", u.mes).eq("area", u.area).single();
          if (existing) {
            // Solo actualiza trabajadores y hh_trabajadas, no sobreescribe los demás
            await supabase.from("indicadores_sst_comind")
              .update({ trabajadores: u.trabajadores, hh_trabajadas: u.hh_trabajadas, hh_capacitacion: u.hh_capacitacion })
              .eq("id", existing.id);
          } else {
            await supabase.from("indicadores_sst_comind").insert(u);
          }
        }

        setLastImport({ mes: mesDetectado, anio: anioDetectado, emp, obj });
        if (anioDetectado === anio) load();
        else { setAnio(anioDetectado); }
        showToast(`✅ Horas Hombre ${MESES[mesDetectado]} ${anioDetectado} importadas`, "success");
      } catch (err) {
        showToast("Error al leer el archivo: " + err.message, "error");
      }
      setImporting(false);
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Editar una fila ──
  const abrirEditar = (rec) => {
    setEditForm({ ...rec });
    setEditModal({ anio: rec.anio, mes: rec.mes, area: rec.area });
  };
  const crearFila = (mes, area) => {
    setEditForm(filaVacia(anio, mes, area, empresaId));
    setEditModal({ anio, mes, area, nuevo: true });
  };

  const guardarEdicion = async () => {
    setSaving(true);
    const f = editForm;
    const payload = {
      empresa_id: empresaId, anio: f.anio, mes: f.mes, area: f.area,
      trabajadores: parseInt(f.trabajadores) || 0,
      hh_trabajadas: parseFloat(f.hh_trabajadas) || 0,
      hh_capacitacion: parseFloat(f.hh_capacitacion) || 0,
      acc_leve: parseInt(f.acc_leve) || 0,
      acc_incapacitante: parseInt(f.acc_incapacitante) || 0,
      acc_fatal: parseInt(f.acc_fatal) || 0,
      dias_perdidos: parseFloat(f.dias_perdidos) || 0,
      dias_cargados: parseFloat(f.dias_cargados) || 0,
      inc_peligrosos: parseInt(f.inc_peligrosos) || 0,
      inc_leve: parseInt(f.inc_leve) || 0,
      enf_ocupacional: parseInt(f.enf_ocupacional) || 0,
    };
    const { error } = editModal.nuevo
      ? await supabase.from("indicadores_sst_comind").insert(payload)
      : await supabase.from("indicadores_sst_comind").update(payload).eq("id", f.id);
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast("Guardado", "success");
    setEditModal(null);
    load();
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar este registro?")) return;
    await supabase.from("indicadores_sst_comind").delete().eq("id", id);
    showToast("Eliminado", "info"); load();
  };

  // ── Totales anuales ──
  const total = (field) => records.reduce((s, r) => s + (Number(r[field]) || 0), 0);
  const totalHH    = total("hh_trabajadas");
  const totalTrab  = records.filter(r => r.mes === Math.max(...records.map(r => r.mes), 0))
                            .reduce((s,r)=>s+(r.trabajadores||0),0);
  const totalAccI  = total("acc_incapacitante") + total("acc_fatal");
  const totalDP    = total("dias_perdidos");
  const annualIF   = calcIF(totalAccI, totalHH);
  const annualIG   = calcIG(totalDP, totalHH);
  const annualIA   = calcIA(annualIF, annualIG);

  // ── Tabla organizada por mes ──
  const mesesConDatos = [...new Set(records.map(r => r.mes))].sort((a,b)=>a-b);
  const byKey = {};
  records.forEach(r => { byKey[`${r.mes}-${r.area}`] = r; });

  // Datos mensuales (combinando Admin + Producción) para los gráficos
  const chartData = MESES.slice(1).map((nombre, idx) => {
    const mes = idx + 1;
    const datos = AREAS.map(a => byKey[`${mes}-${a}`]).filter(Boolean);
    const trab = datos.reduce((s, r) => s + (Number(r.trabajadores) || 0), 0);
    const hh   = datos.reduce((s, r) => s + (parseFloat(r.hh_trabajadas) || 0), 0);
    const accI = datos.reduce((s, r) => s + ((r.acc_incapacitante || 0) + (r.acc_fatal || 0)), 0);
    const dp   = datos.reduce((s, r) => s + (parseFloat(r.dias_perdidos) || 0), 0);
    const IF = +calcIF(accI, hh).toFixed(2);
    const IG = +calcIG(dp, hh).toFixed(2);
    const IA = +calcIA(IF, IG).toFixed(2);
    return { mes: nombre.slice(0, 3).toUpperCase(), trabajadores: trab, IF, IG, IA };
  });

  const setEF = (k, v) => setEditForm(f => ({ ...f, [k]: v }));
  const efHH   = parseFloat(editForm.hh_trabajadas) || 0;
  const efAccI = (parseInt(editForm.acc_incapacitante)||0) + (parseInt(editForm.acc_fatal)||0);
  const efDP   = parseFloat(editForm.dias_perdidos) || 0;
  const preIF  = calcIF(efAccI, efHH);
  const preIG  = calcIG(efDP, efHH);
  const preIA  = calcIA(preIF, preIG);

  // ── Exportar a Excel ──
  const exportar = () => {
    const rows = [
      ["Mes","Área","Trabajadores","HH Trabajadas","HH Capacitación",
       "Acc. Leve","Acc. Incap.","Acc. Fatal","Días Perdidos","Días Cargados",
       "Inc. Peligrosos","Inc. Leve","Enf. Ocup.","IF","IG","IA"],
    ];
    mesesConDatos.forEach(mes => {
      AREAS.forEach(area => {
        const r = byKey[`${mes}-${area}`];
        if (!r) return;
        const hh = parseFloat(r.hh_trabajadas) || 0;
        const accI = (r.acc_incapacitante||0) + (r.acc_fatal||0);
        const IF = calcIF(accI, hh), IG = calcIG(r.dias_perdidos||0, hh);
        rows.push([MESES[mes], area, r.trabajadores, r.hh_trabajadas, r.hh_capacitacion,
          r.acc_leve, r.acc_incapacitante, r.acc_fatal, r.dias_perdidos, r.dias_cargados,
          r.inc_peligrosos, r.inc_leve, r.enf_ocupacional,
          fmt2(IF), fmt2(IG), fmt2(calcIA(IF,IG))]);
      });
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = rows[0].map((_,i) => ({ wch: i < 2 ? 16 : 10 }));
    const wb2 = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb2, ws, "Indicadores");
    XLSX.writeFile(wb2, `indicadores_sst_${anio}.xlsx`);
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
            <BarChart2 size={15} className="text-blue-400" /> Indicadores de Accidentabilidad SST
          </h3>
          <p className="text-gray-500 text-xs max-w-xl">
            Estadística mensual de seguridad. Importa el Excel de Horas Hombre para cargar trabajadores y horas automáticamente.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={anio} onChange={e => setAnio(parseInt(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none">
            {[anioActual-1, anioActual, anioActual+1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Btn size="sm" variant="ghost" onClick={() => setShowGuide(true)}><HelpCircle size={13} /> Guía</Btn>
          <label className="cursor-pointer">
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} disabled={importing} />
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-700 bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 transition-colors cursor-pointer">
              <Upload size={13} /> {importing ? "Importando..." : "Importar Horas Hombre"}
            </span>
          </label>
          <Btn size="sm" variant="ghost" onClick={exportar}><Download size={13} /> Exportar</Btn>
        </div>
      </div>

      {/* ── KPIs grandes del último import ── */}
      {lastImport && (
        <div className="bg-blue-900/15 border border-blue-900/40 rounded-xl p-4 mb-5">
          <p className="text-xs text-blue-400 font-semibold uppercase tracking-wide mb-3">
            ✅ Importado: {MESES[lastImport.mes]} {lastImport.anio}
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Trabajadores Admin.", value: lastImport.emp.trabajadores, icon: Users, color: "text-emerald-400" },
              { label: "HH Admin.", value: fmtN(lastImport.emp.hh), icon: Clock, color: "text-emerald-300" },
              { label: "Trabajadores Prod.", value: lastImport.obj.trabajadores, icon: Users, color: "text-blue-400" },
              { label: "HH Producción", value: fmtN(lastImport.obj.hh), icon: Clock, color: "text-blue-300" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <Icon size={20} className={`${color} mx-auto mb-2`} />
                <div className={`text-3xl font-bold ${color} leading-none`}>{value}</div>
                <div className="text-gray-500 text-xs mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Totales anuales ── */}
      {records.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Índice de Frecuencia (IF)</div>
            <div className="text-2xl font-bold text-amber-400">{fmt2(annualIF)}</div>
            <div className="text-[10px] text-gray-600">Acc × 1,000,000 / HH</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Índice de Gravedad (IG)</div>
            <div className="text-2xl font-bold text-orange-400">{fmt2(annualIG)}</div>
            <div className="text-[10px] text-gray-600">Días × 1,000,000 / HH</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Índice de Accidentabilidad (IA)</div>
            <div className="text-2xl font-bold text-red-400">{fmt2(annualIA)}</div>
            <div className="text-[10px] text-gray-600">IF × IG / 1,000</div>
          </div>
        </div>
      )}

      {/* ── Gráficos mensuales (doble eje: Trabajadores + Índice) ── */}
      {records.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mb-5">
          {[
            { key: "IF", titulo: "Índice de Frecuencia Mensual", color: "#ef4444", label: "Frecuencia" },
            { key: "IG", titulo: "Índice de Gravedad Mensual", color: "#f97316", label: "Gravedad" },
            { key: "IA", titulo: "Índice de Accidentabilidad Mensual", color: "#dc2626", label: "Accidentabilidad" },
          ].map(cfg => (
            <div key={cfg.key} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
              <p className="text-center text-xs font-semibold text-white mb-2">{cfg.titulo} {anio}</p>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={chartData} margin={{ top: 5, right: 6, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="mes" tick={{ fill: "#9ca3af", fontSize: 9 }} interval={0} angle={-45} textAnchor="end" height={42} />
                  <YAxis yAxisId="left" domain={[0, 500]} ticks={[0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500]} allowDecimals={false} tick={{ fill: "#60a5fa", fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: cfg.color, fontSize: 10 }} />
                  <ChartTooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line yAxisId="left" type="linear" dataKey="trabajadores" name="Trabajadores" stroke="#2563eb" strokeWidth={2} dot={{ r: 2.5 }} />
                  <Line yAxisId="right" type="linear" dataKey={cfg.key} name={cfg.label} stroke={cfg.color} strokeWidth={2} dot={{ r: 2.5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabla mensual ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
        <table className="text-xs border-collapse w-full">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-800/60">
              <th className="px-3 py-2 text-gray-500 font-medium text-left whitespace-nowrap sticky left-0 bg-gray-800/60">Mes</th>
              <th className="px-3 py-2 text-gray-500 font-medium text-left whitespace-nowrap">Área</th>
              <th className="px-3 py-2 text-gray-500 font-medium text-center">Trab.</th>
              <th className="px-3 py-2 text-gray-500 font-medium text-center">HH Trab.</th>
              <th className="px-3 py-2 text-gray-500 font-medium text-center">HH Cap.</th>
              <th className="px-3 py-2 text-gray-500 font-medium text-center text-amber-500">Acc.L</th>
              <th className="px-3 py-2 text-gray-500 font-medium text-center text-red-500">Acc.I</th>
              <th className="px-3 py-2 text-gray-500 font-medium text-center text-red-700">Acc.F</th>
              <th className="px-3 py-2 text-gray-500 font-medium text-center">D.Perd.</th>
              <th className="px-3 py-2 text-gray-500 font-medium text-center">D.Carg.</th>
              <th className="px-3 py-2 text-gray-500 font-medium text-center">Inc.P</th>
              <th className="px-3 py-2 text-gray-500 font-medium text-center">Inc.L</th>
              <th className="px-3 py-2 text-gray-500 font-medium text-center">Enf.</th>
              <th className="px-3 py-2 text-blue-500 font-medium text-center">IF</th>
              <th className="px-3 py-2 text-orange-500 font-medium text-center">IG</th>
              <th className="px-3 py-2 text-red-500 font-medium text-center">IA</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={17} className="px-4 py-8 text-center text-gray-600">Cargando...</td></tr>}
            {!loading && MESES.slice(1).map((nombreMes, idx) => {
              const mes = idx + 1;
              if (mesesConDatos.length > 0 && !mesesConDatos.includes(mes)) return null;
              const mesTieneDatos = AREAS.some(a => byKey[`${mes}-${a}`]);
              const monthSpan = mesTieneDatos ? 3 : 2;
              const filas = AREAS.map((area, ai) => {
                const r = byKey[`${mes}-${area}`];
                const hh   = r ? (parseFloat(r.hh_trabajadas) || 0) : 0;
                const accI = r ? ((r.acc_incapacitante||0) + (r.acc_fatal||0)) : 0;
                const dp   = r ? (parseFloat(r.dias_perdidos) || 0) : 0;
                const IF   = calcIF(accI, hh);
                const IG   = calcIG(dp, hh);
                const IA   = calcIA(IF, IG);
                return (
                  <tr key={`${mes}-${area}`}
                    className={`border-b border-gray-800/40 hover:bg-gray-800/20 ${!r ? "opacity-40" : ""}`}>
                    {ai === 0 && (
                      <td className="px-3 py-2 font-medium text-gray-300 sticky left-0 bg-gray-900 whitespace-nowrap"
                        rowSpan={monthSpan}>{nombreMes}</td>
                    )}
                    <td className="px-3 py-2">
                      <Badge color={area === "ADMINISTRATIVO" ? "blue" : "emerald"}>
                        {area === "ADMINISTRATIVO" ? "Admin." : "Prod."}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-300">{r?.trabajadores ?? "—"}</td>
                    <td className="px-3 py-2 text-center font-mono text-gray-300">{r ? fmtN(r.hh_trabajadas) : "—"}</td>
                    <td className="px-3 py-2 text-center font-mono text-gray-500">{r ? fmtN(r.hh_capacitacion) : "—"}</td>
                    <td className="px-3 py-2 text-center text-amber-400">{r?.acc_leve ?? "—"}</td>
                    <td className="px-3 py-2 text-center text-red-400 font-bold">{r?.acc_incapacitante ?? "—"}</td>
                    <td className="px-3 py-2 text-center text-red-700">{r?.acc_fatal ?? "—"}</td>
                    <td className="px-3 py-2 text-center text-gray-400">{r?.dias_perdidos ?? "—"}</td>
                    <td className="px-3 py-2 text-center text-gray-500">{r?.dias_cargados ?? "—"}</td>
                    <td className="px-3 py-2 text-center text-gray-400">{r?.inc_peligrosos ?? "—"}</td>
                    <td className="px-3 py-2 text-center text-gray-500">{r?.inc_leve ?? "—"}</td>
                    <td className="px-3 py-2 text-center text-gray-500">{r?.enf_ocupacional ?? "—"}</td>
                    <td className="px-3 py-2 text-center font-mono text-blue-400">{r ? fmt2(IF) : "—"}</td>
                    <td className="px-3 py-2 text-center font-mono text-orange-400">{r ? fmt2(IG) : "—"}</td>
                    <td className="px-3 py-2 text-center font-mono text-red-400">{r ? fmt2(IA) : "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {r
                          ? <><button onClick={() => abrirEditar(r)} className="text-gray-500 hover:text-blue-400"><Pencil size={12} /></button>
                              {puedeEliminar() && (
                                <button onClick={() => eliminar(r.id)} className="text-red-500/40 hover:text-red-400"><Trash2 size={12} /></button>
                              )}</>
                          : <button onClick={() => crearFila(mes, area)} className="text-gray-700 hover:text-emerald-400 text-[10px]">+ Agregar</button>
                        }
                      </div>
                    </td>
                  </tr>
                );
              });
              if (mesTieneDatos) {
                const datos = AREAS.map(a => byKey[`${mes}-${a}`]).filter(Boolean);
                const tTrab = datos.reduce((s, r) => s + (Number(r.trabajadores) || 0), 0);
                const tHH   = datos.reduce((s, r) => s + (parseFloat(r.hh_trabajadas) || 0), 0);
                const tCap  = datos.reduce((s, r) => s + (parseFloat(r.hh_capacitacion) || 0), 0);
                filas.push(
                  <tr key={`${mes}-total`} className="border-b border-gray-700/60 bg-gray-800/30">
                    <td className="px-3 py-1.5 text-[11px] text-gray-400 font-semibold">Total mes</td>
                    <td className="px-3 py-1.5 text-center text-gray-100 font-bold">{fmtN(tTrab)}</td>
                    <td className="px-3 py-1.5 text-center font-mono text-gray-100 font-bold">{fmtN(tHH)}</td>
                    <td className="px-3 py-1.5 text-center font-mono text-gray-300">{fmtN(tCap)}</td>
                    <td colSpan={12}></td>
                  </tr>
                );
              }
              return filas;
            })}
            {!loading && records.length === 0 && (
              <tr><td colSpan={17} className="px-4 py-12 text-center text-gray-600">
                Sin datos para {anio}. Importa el Excel de Horas Hombre o agrega un mes manualmente.
              </td></tr>
            )}
            {/* Fila de totales */}
            {records.length > 0 && (
              <tr className="bg-gray-800/60 font-semibold border-t-2 border-gray-700">
                <td className="px-3 py-2 text-gray-300 sticky left-0 bg-gray-800/60">TOTAL {anio}</td>
                <td className="px-3 py-2 text-gray-500 text-[10px]">Ambas áreas</td>
                <td className="px-3 py-2 text-center text-gray-300">{fmtN(totalTrab)}</td>
                <td className="px-3 py-2 text-center font-mono text-gray-300">{fmtN(totalHH)}</td>
                <td className="px-3 py-2 text-center font-mono text-gray-500">{fmtN(total("hh_capacitacion"))}</td>
                <td className="px-3 py-2 text-center text-amber-400">{total("acc_leve")}</td>
                <td className="px-3 py-2 text-center text-red-400">{total("acc_incapacitante")}</td>
                <td className="px-3 py-2 text-center text-red-700">{total("acc_fatal")}</td>
                <td className="px-3 py-2 text-center text-gray-400">{fmt2(total("dias_perdidos"))}</td>
                <td className="px-3 py-2 text-center text-gray-500">{fmt2(total("dias_cargados"))}</td>
                <td className="px-3 py-2 text-center text-gray-400">{total("inc_peligrosos")}</td>
                <td className="px-3 py-2 text-center text-gray-500">{total("inc_leve")}</td>
                <td className="px-3 py-2 text-center text-gray-500">{total("enf_ocupacional")}</td>
                <td className="px-3 py-2 text-center font-mono text-blue-300 font-bold">{fmt2(annualIF)}</td>
                <td className="px-3 py-2 text-center font-mono text-orange-300 font-bold">{fmt2(annualIG)}</td>
                <td className="px-3 py-2 text-center font-mono text-red-300 font-bold">{fmt2(annualIA)}</td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal de Guía ── */}
      {showGuide && (
        <Modal title="Guía — Indicadores de Accidentabilidad SST" onClose={() => setShowGuide(false)} wide>
          <div className="space-y-5 text-sm">

            {/* Paso 1 */}
            <div className="bg-blue-900/20 border border-blue-900/40 rounded-xl p-4">
              <p className="text-blue-300 font-semibold mb-2 flex items-center gap-2"><Upload size={14} /> Paso 1 — Importar el Excel de Horas Hombre</p>
              <p className="text-gray-400 text-xs mb-3">Cada mes el ingeniero recibe un Excel con las horas trabajadas. Súbelo con el botón <strong className="text-white">"Importar Horas Hombre"</strong> y el sistema extrae automáticamente:</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { hoja: "Hoja OBJ", area: "PRODUCCIÓN", col: "Columna 8 (Horas Lab.)", color: "emerald" },
                  { hoja: "Hoja EMP", area: "ADMINISTRATIVO", col: "Columna 8 (Total Horas lab.)", color: "blue" },
                ].map(h => (
                  <div key={h.area} className={`bg-gray-900 border border-gray-700 rounded-lg p-3`}>
                    <p className={`text-${h.color}-400 font-medium text-xs`}>{h.area}</p>
                    <p className="text-gray-500 text-[11px] mt-1">📄 {h.hoja}</p>
                    <p className="text-gray-500 text-[11px]">📊 {h.col}</p>
                    <p className="text-gray-500 text-[11px]">👥 Cuenta las filas con nombre</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 bg-amber-900/20 border border-amber-800/40 rounded-lg px-3 py-2 text-xs text-amber-300">
                💡 El sistema detecta el mes automáticamente desde el nombre del archivo (ej. <span className="font-mono">HORAS HOMBRE -ENERO 2026.xlsx</span>). Si no lo detecta, podrás editarlo en la tabla.
              </div>
            </div>

            {/* Paso 2 */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-white font-semibold mb-2 flex items-center gap-2"><Pencil size={14} className="text-gray-400" /> Paso 2 — Completar los datos del mes</p>
              <p className="text-gray-400 text-xs mb-3">Haz click en el ✏️ de cada fila (Admin / Producción) para ingresar los datos manualmente:</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead><tr className="border-b border-gray-700">
                    <th className="text-left text-gray-500 py-1.5 pr-4">Campo</th>
                    <th className="text-left text-gray-500 py-1.5 pr-4">Descripción</th>
                    <th className="text-left text-gray-500 py-1.5">Fuente</th>
                  </tr></thead>
                  <tbody>
                    {[
                      ["Trabajadores",     "N° de trabajadores del área",             "Auto — del Excel HH"],
                      ["HH Trabajadas",    "Total horas hombre trabajadas",            "Auto — del Excel HH"],
                      ["HH Capacitación",  "Horas de capacitación: (trab × 10 × 26) ÷ 60", "Auto — fórmula"],
                      ["Acc. Leve",        "Accidentes sin incapacidad",               "Manual"],
                      ["Acc. Incap.",      "Accidentes con incapacidad temporal",      "Manual"],
                      ["Acc. Fatal",       "Accidentes fatales",                       "Manual"],
                      ["Días Perdidos",    "Días de incapacidad por accidentes",       "Manual"],
                      ["Días Cargados",    "Días cargados por accidentes fatales",     "Manual"],
                      ["Inc. Peligrosos",  "Incidentes peligrosos del mes",            "Manual"],
                      ["Inc. Leve",        "Incidentes leves del mes",                 "Manual"],
                      ["Enf. Ocupacional", "Enfermedades ocupacionales registradas",   "Manual"],
                    ].map(([c, d, f]) => (
                      <tr key={c} className="border-b border-gray-800/50">
                        <td className="py-1.5 pr-4 font-medium text-gray-300 whitespace-nowrap">{c}</td>
                        <td className="py-1.5 pr-4 text-gray-500">{d}</td>
                        <td className="py-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${f.includes("Auto") ? "bg-blue-900/40 text-blue-300" : "bg-gray-800 text-gray-500"}`}>{f}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Paso 3 — Fórmulas */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-white font-semibold mb-3 flex items-center gap-2"><BarChart2 size={14} className="text-blue-400" /> Paso 3 — Indicadores (se calculan solos)</p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { sigla: "IF", nombre: "Índice de Frecuencia", formula: "(Acc. Incap. + Fatal) × 1,000,000 ÷ HH Trabajadas", color: "blue", desc: "¿Con qué frecuencia ocurren accidentes?" },
                  { sigla: "IG", nombre: "Índice de Gravedad",   formula: "Días Perdidos × 1,000,000 ÷ HH Trabajadas",          color: "orange", desc: "¿Qué tan graves son los accidentes?" },
                  { sigla: "IA", nombre: "Índice de Accidentabilidad", formula: "IF × IG ÷ 1,000",                              color: "red", desc: "Indicador combinado de frecuencia y gravedad." },
                ].map(i => (
                  <div key={i.sigla} className={`flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700`}>
                    <div className={`text-${i.color}-400 font-bold text-lg w-8 shrink-0`}>{i.sigla}</div>
                    <div>
                      <p className="text-white text-xs font-medium">{i.nombre}</p>
                      <p className="text-gray-500 text-[11px] font-mono mt-0.5">{i.formula}</p>
                      <p className="text-gray-600 text-[11px] mt-0.5 italic">{i.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-gray-600 text-[11px] mt-3 flex items-center gap-1">
                <Info size={11} /> El modal de edición muestra una vista previa de IF, IG e IA en tiempo real mientras ingresas los datos.
              </p>
            </div>

            <div className="flex justify-end">
              <Btn variant="primary" onClick={() => setShowGuide(false)}><CheckCircle size={13} /> Entendido</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal de edición ── */}
      {editModal && (
        <Modal title={`${editModal.nuevo ? "Agregar" : "Editar"} — ${MESES[editModal.mes]} ${editModal.anio} · ${editModal.area}`}
          onClose={() => setEditModal(null)}>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div className="col-span-2 grid grid-cols-2 gap-3">
              <FormField label="Trabajadores"><Input type="number" min="0" value={editForm.trabajadores || ""} onChange={e => setEditForm(f => ({ ...f, trabajadores: e.target.value, hh_capacitacion: calcCap(e.target.value) }))} /></FormField>
              <FormField label="HH Trabajadas"><Input type="number" step="0.01" min="0" value={editForm.hh_trabajadas || ""} onChange={e => setEF("hh_trabajadas", e.target.value)} /></FormField>
            </div>
            <FormField label="HH Capacitación">
              <Input type="number" step="0.01" min="0" value={editForm.hh_capacitacion || ""} onChange={e => setEF("hh_capacitacion", e.target.value)} />
              <p className="text-[10px] text-gray-500 mt-1">Auto: (trab × 10 × 26) ÷ 60 = <span className="text-gray-300 font-mono">{calcCap(editForm.trabajadores)}</span>. Editable.</p>
            </FormField>
            <div className="col-span-2 border-t border-gray-700 pt-2">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">Accidentes</p>
              <div className="grid grid-cols-3 gap-2">
                <FormField label="Leve"><Input type="number" min="0" value={editForm.acc_leve || ""} onChange={e => setEF("acc_leve", e.target.value)} /></FormField>
                <FormField label="Incapacitante"><Input type="number" min="0" value={editForm.acc_incapacitante || ""} onChange={e => setEF("acc_incapacitante", e.target.value)} /></FormField>
                <FormField label="Fatal"><Input type="number" min="0" value={editForm.acc_fatal || ""} onChange={e => setEF("acc_fatal", e.target.value)} /></FormField>
              </div>
            </div>
            <FormField label="Días perdidos"><Input type="number" step="0.01" min="0" value={editForm.dias_perdidos || ""} onChange={e => setEF("dias_perdidos", e.target.value)} /></FormField>
            <FormField label="Días cargados"><Input type="number" step="0.01" min="0" value={editForm.dias_cargados || ""} onChange={e => setEF("dias_cargados", e.target.value)} /></FormField>
            <div className="col-span-2 border-t border-gray-700 pt-2">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">Incidentes y Enf. Ocupacional</p>
              <div className="grid grid-cols-3 gap-2">
                <FormField label="Inc. Peligrosos"><Input type="number" min="0" value={editForm.inc_peligrosos || ""} onChange={e => setEF("inc_peligrosos", e.target.value)} /></FormField>
                <FormField label="Inc. Leve"><Input type="number" min="0" value={editForm.inc_leve || ""} onChange={e => setEF("inc_leve", e.target.value)} /></FormField>
                <FormField label="Enf. Ocupacional"><Input type="number" min="0" value={editForm.enf_ocupacional || ""} onChange={e => setEF("enf_ocupacional", e.target.value)} /></FormField>
              </div>
            </div>
            {/* Preview IF/IG/IA en tiempo real */}
            {efHH > 0 && (
              <div className="col-span-2 bg-blue-900/15 border border-blue-900/30 rounded-lg p-3 grid grid-cols-3 gap-2 text-center">
                <div><div className="text-[10px] text-gray-500">IF</div><div className="text-lg font-bold text-blue-400">{fmt2(preIF)}</div></div>
                <div><div className="text-[10px] text-gray-500">IG</div><div className="text-lg font-bold text-orange-400">{fmt2(preIG)}</div></div>
                <div><div className="text-[10px] text-gray-500">IA</div><div className="text-lg font-bold text-red-400">{fmt2(preIA)}</div></div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={() => setEditModal(null)}>Cancelar</Btn>
            <Btn variant="primary" onClick={guardarEdicion} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
