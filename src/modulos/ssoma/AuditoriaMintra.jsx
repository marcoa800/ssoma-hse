// ════════════════════════════════════════════════════════════════════
//  AuditoriaMintra — Cumplimiento del checklist MINTRA (Anexo 3 RM 050-2013-TR)
//  Verificación automática en vivo con los registros de la app + override
//  manual con URL de evidencia. % por lineamiento/global. Export PDF/Excel.
//  Solo Comindustria.
// ════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { Btn } from '../../components/ui/Btn.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { MINTRA_LINEAMIENTOS } from '../../constants/mintra-checklist.js';
import {
  CheckCircle2, XCircle, MinusCircle, ChevronDown, ChevronRight, Link2,
  RefreshCw, FileDown, FileSpreadsheet, Zap, Hand, ExternalLink, ShieldCheck, HelpCircle,
  History, Save, Trash2,
} from 'lucide-react';

// Verificación automática SOLO para indicadores donde el dato de la app PRUEBA el cumplimiento.
// Mapeo EXPLÍCITO por ID (evita falsos positivos de la coincidencia por palabra clave).
const AUTO = {
  "3.4":  { key: "iperc", label: "IPERC / matriz de riesgos registrada en la app" },
  "3.12": { key: "prog",  label: "Programa Anual SST registrado en la app" },
  "4.1":  { key: "comite", label: "Comité SST constituido (miembros en la app)" },
  "4.15": { key: "caps",  label: "Capacitaciones registradas (año en curso)" },
  "5.3":  { key: "comiteAct", label: "Libro de actas del comité (reuniones en la app)" },
  "6.3":  { key: "monit", label: "Monitoreo de agentes registrado (año en curso)" },
  "6.5":  { key: "salud", label: "Exámenes médicos (EMO) registrados en la app" },
  "6.11": { key: "accCorr", label: "Acciones correctivas registradas en la app" },
  "6.13": { key: "inv",   label: "Investigaciones de accidentes registradas en la app" },
  "6.14": { key: "inv",   label: "Investigaciones de accidentes registradas en la app" },
  "7.9":  { key: "docs",  label: "Documentos en el centro documental de la app" },
  "7.10": { key: "accReg", label: "El sistema provee el registro de accidentes" },
};

const ESTADOS = { cumple: { label: "Cumple", Icon: CheckCircle2 }, parcial: { label: "Parcial", Icon: MinusCircle }, no_cumple: { label: "No cumple", Icon: XCircle } };
// Mapas de clases ESTÁTICAS (Tailwind no genera clases dinámicas por interpolación)
const SEM = {
  emerald: { txt: "text-emerald-400", bar: "bg-emerald-500", soft: "bg-emerald-900/15 border-emerald-900/40" },
  amber:   { txt: "text-amber-400",   bar: "bg-amber-500",   soft: "bg-amber-900/15 border-amber-900/40" },
  red:     { txt: "text-red-400",     bar: "bg-red-500",     soft: "bg-red-900/15 border-red-900/40" },
};
const EST_ICON = { cumple: "text-emerald-400", parcial: "text-amber-400", no_cumple: "text-red-400" };
const EST_BTN_ON = { cumple: "bg-emerald-600 border-emerald-600 text-white", parcial: "bg-amber-600 border-amber-600 text-white", no_cumple: "bg-red-600 border-red-600 text-white" };
const EST_BTN_OFF = { cumple: "border-gray-700 text-gray-400 hover:border-emerald-600", parcial: "border-gray-700 text-gray-400 hover:border-amber-600", no_cumple: "border-gray-700 text-gray-400 hover:border-red-600" };

const ALL_ITEMS = MINTRA_LINEAMIENTOS.flatMap(l => l.grupos.flatMap(g => g.items.map(it => ({ ...it, lineamiento: l, grupo: g.nombre }))));

export default function AuditoriaMintra({ empresaId, empresa }) {
  const [overrides, setOverrides] = useState({}); // item_id -> { estado, evidencia_url, observacion }
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState({ I: true });
  const [expandItem, setExpandItem] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [soloGaps, setSoloGaps] = useState(false); // mostrar solo lo que falta (no cumple/parcial/pendiente)
  const [historial, setHistorial] = useState([]);
  const [showHist, setShowHist] = useState(false);
  const [savingAud, setSavingAud] = useState(false);

  const cnt = async (tabla, extra) => {
    try {
      let q = supabase.from(tabla).select("id", { count: "exact", head: true }).eq("empresa_id", empresaId);
      if (extra) q = extra(q);
      const { count } = await q;
      return count || 0;
    } catch (e) { return 0; }
  };
  const verificar = async () => {
    const year = new Date().getFullYear();
    const ini = `${year}-01-01`;
    const [caps, monit, iperc, salud, docs, comite, comiteAct, inv, accCorr, prog] = await Promise.all([
      cnt("capacitaciones", q => q.gte("fecha", ini)),               // del año en curso
      cnt("monitoreo_agentes", q => q.gte("fecha_monitoreo", ini)),  // del año en curso
      cnt("iperc_documentos"),                                        // presencia (doc vivo)
      cnt("trabajadores", q => q.not("ultima_emo", "is", null)),      // EMO registradas
      cnt("documentos"),                                              // centro documental
      cnt("comite_miembros"), cnt("comite_reuniones"),               // Comité SST
      cnt("investigaciones"), cnt("acciones_correctivas"),           // investigación / acciones
      cnt("programa_sst"),                                            // Programa Anual SST
    ]);
    setCounts({ caps, monit, iperc, salud, docs, comite, comiteAct, inv, accCorr, prog, accReg: 1 });
  };
  const loadOverrides = async () => {
    const { data } = await supabase.from("mintra_cumplimiento").select("*").eq("empresa_id", empresaId);
    const map = {}; (data || []).forEach(r => { map[r.item_id] = r; });
    setOverrides(map);
  };
  const cargar = async () => { setLoading(true); await Promise.all([verificar(), loadOverrides(), loadHist()]); setLoading(false); };
  useEffect(() => { if (empresaId) cargar(); }, [empresaId]);

  // Estado efectivo de un item (override manual o verificación automática)
  const estadoItem = (item) => {
    const ov = overrides[item.id];
    if (ov) return { estado: ov.estado, modo: "manual", evidencia: ov.evidencia_url, obs: ov.observacion, responsable: ov.responsable, fecha: ov.actualizado };
    const a = AUTO[item.id];
    if (a) return { estado: counts[a.key] > 0 ? "cumple" : "no_cumple", modo: "auto", auto: a };
    return { estado: "no_cumple", modo: "pendiente", auto: null };
  };
  const valor = (e) => e === "cumple" ? 1 : e === "parcial" ? 0.5 : 0;

  const pctLineamiento = (l) => {
    const items = l.grupos.flatMap(g => g.items);
    if (!items.length) return 0;
    return Math.round(items.reduce((a, it) => a + valor(estadoItem(it).estado), 0) / items.length * 100);
  };
  const pctGlobal = Math.round(ALL_ITEMS.reduce((a, it) => a + valor(estadoItem(it).estado), 0) / ALL_ITEMS.length * 100);
  const sem = (p) => p >= 80 ? "emerald" : p >= 50 ? "amber" : "red";

  // ── Guardar override manual ──
  const setOverride = async (itemId, patch) => {
    const prev = overrides[itemId] || { estado: "cumple" };
    const row = { empresa_id: empresaId, item_id: itemId, estado: patch.estado ?? prev.estado, evidencia_url: patch.evidencia_url ?? prev.evidencia_url ?? null, observacion: patch.observacion ?? prev.observacion ?? null, responsable: patch.responsable ?? prev.responsable ?? null, actualizado: new Date().toISOString() };
    setOverrides(o => ({ ...o, [itemId]: row }));
    await supabase.from("mintra_cumplimiento").upsert(row, { onConflict: "empresa_id,item_id" });
  };
  const volverAuto = async (itemId) => {
    setOverrides(o => { const n = { ...o }; delete n[itemId]; return n; });
    await supabase.from("mintra_cumplimiento").delete().eq("empresa_id", empresaId).eq("item_id", itemId);
  };

  // ── Historial de auditorías (snapshots por fecha) ──
  const loadHist = async () => {
    const { data } = await supabase.from("mintra_auditorias").select("*").eq("empresa_id", empresaId).order("fecha", { ascending: false }).order("created_at", { ascending: false });
    setHistorial(data || []);
  };
  const guardarAuditoria = async () => {
    setSavingAud(true);
    const detalle = {}; MINTRA_LINEAMIENTOS.forEach(l => { detalle[l.id] = pctLineamiento(l); });
    const row = { empresa_id: empresaId, fecha: new Date().toISOString().slice(0, 10), pct_global: pctGlobal,
      cumplidos: ALL_ITEMS.filter(it => estadoItem(it).estado === "cumple").length, total: ALL_ITEMS.length, detalle };
    const { error } = await supabase.from("mintra_auditorias").insert(row);
    setSavingAud(false);
    if (error) { showToast("Error al guardar: " + error.message, "error"); return; }
    showToast("Auditoría guardada en el historial", "success"); loadHist();
  };
  const eliminarAuditoria = async (id) => {
    if (!confirm("¿Eliminar esta auditoría del historial?")) return;
    await supabase.from("mintra_auditorias").delete().eq("id", id); loadHist();
  };

  // ── Exportar ──
  const exportExcel = () => {
    const rows = ALL_ITEMS.map(it => {
      const e = estadoItem(it);
      return { Lineamiento: `${it.lineamiento.id}. ${it.lineamiento.titulo}`, Grupo: it.grupo, "N°": it.id, Indicador: it.texto, Cumplimiento: ESTADOS[e.estado].label, Modo: e.modo, Evidencia: e.evidencia || (e.auto ? `AUTO: ${e.auto.label}` : ""), Observación: e.obs || "" };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 28 }, { wch: 20 }, { wch: 6 }, { wch: 60 }, { wch: 12 }, { wch: 10 }, { wch: 40 }, { wch: 30 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Checklist MINTRA");
    XLSX.writeFile(wb, `cumplimiento_mintra_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFontSize(13).setFont(undefined, "bold").setTextColor(30, 64, 175);
    doc.text("LISTA DE VERIFICACIÓN DE LINEAMIENTOS DEL SGSST", 14, 14);
    doc.setFontSize(9).setFont(undefined, "normal").setTextColor(80);
    doc.text(`Anexo 3 — RM 050-2013-TR  ·  ${empresa?.nombre || ""}  ·  ${new Date().toLocaleDateString("es-PE")}  ·  Cumplimiento global: ${pctGlobal}%`, 14, 20);
    let startY = 25;
    for (const l of MINTRA_LINEAMIENTOS) {
      const body = l.grupos.flatMap(g => g.items.map(it => {
        const e = estadoItem(it);
        return [it.id, it.texto, ESTADOS[e.estado].label, e.evidencia || (e.auto ? "Auto (registros app)" : ""), e.obs || ""];
      }));
      autoTable(doc, {
        startY,
        head: [[{ content: `${l.id}. ${l.titulo.toUpperCase()}  —  ${pctLineamiento(l)}%`, colSpan: 5, styles: { halign: "left", fillColor: [30, 64, 175], textColor: 255 } }],
          ["N°", "INDICADOR", "CUMPLIMIENTO", "EVIDENCIA / FUENTE", "OBSERVACIÓN"]],
        body, styles: { fontSize: 7, cellPadding: 1.4, valign: "top" },
        headStyles: { fillColor: [55, 65, 81], textColor: 255, fontSize: 7 },
        columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 120 }, 2: { cellWidth: 24, halign: "center" }, 3: { cellWidth: 60 }, 4: { cellWidth: 50 } },
        didParseCell: (d) => { if (d.section === "body" && d.column.index === 2) { const t = d.cell.raw; if (t === "Cumple") { d.cell.styles.fillColor = [220, 252, 231]; d.cell.styles.textColor = [22, 101, 52]; } else if (t === "Parcial") { d.cell.styles.fillColor = [254, 243, 199]; d.cell.styles.textColor = [146, 64, 14]; } else { d.cell.styles.fillColor = [254, 226, 226]; d.cell.styles.textColor = [153, 27, 27]; } } },
        margin: { left: 14, right: 14 },
      });
      startY = doc.lastAutoTable.finalY + 3;
    }
    doc.save(`cumplimiento_mintra_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (loading) return <div className="text-gray-600 text-sm py-12 text-center">Verificando cumplimiento…</div>;

  const gc = sem(pctGlobal);
  return (
    <div>
      {showGuide && (
        <Modal title="Guía — Cumplimiento SST (Checklist MINTRA)" onClose={() => setShowGuide(false)} wide>
          <div className="space-y-4 text-sm">
            <div className="bg-blue-900/20 border border-blue-900/40 rounded-xl p-4 text-xs text-blue-300">
              Este módulo mide el cumplimiento de la <b>Lista de Verificación de Lineamientos del SGSST</b> (Anexo 3, RM 050-2013-TR) — la que usa SUNAFIL/MINTRA. Son <b>115 indicadores</b> agrupados en <b>8 lineamientos</b>.
            </div>

            <div>
              <p className="font-semibold text-white mb-2">¿Cómo se evalúa cada indicador?</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2 bg-gray-900 border border-gray-800 rounded-lg p-2.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-1 bg-emerald-900/30 text-emerald-300 shrink-0 mt-0.5"><Zap size={9} /> Automático</span>
                  <p className="text-gray-400 text-xs">El sistema lo verifica <b>en vivo</b> con tus registros de la app. Si ya hay evidencia (capacitaciones, IPERC, exámenes/EMO y tópico, accidentes, inspecciones, monitoreo, documentos), lo marca <span className="text-emerald-400">Cumple</span> solo.</p>
                </div>
                <div className="flex items-start gap-2 bg-gray-900 border border-gray-800 rounded-lg p-2.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-1 bg-blue-900/40 text-blue-300 shrink-0 mt-0.5"><Hand size={9} /> Manual</span>
                  <p className="text-gray-400 text-xs">Lo evalúas tú. Útil cuando la evidencia está <b>fuera de la app</b> (en tu nube). Pulsa <b>"evaluar"</b> en el indicador, elige Cumple / Parcial / No cumple, pega la <b>URL de evidencia</b> y una observación. Puedes <b>"Volver a automático"</b> cuando quieras.</p>
                </div>
                <div className="flex items-start gap-2 bg-gray-900 border border-gray-800 rounded-lg p-2.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-1 bg-gray-800 text-gray-500 shrink-0 mt-0.5">Pendiente</span>
                  <p className="text-gray-400 text-xs">Indicador que la app no puede comprobar sola y aún no has evaluado. Cuenta como <span className="text-red-400">No cumple</span> hasta que lo marques manual con su evidencia.</p>
                </div>
              </div>
            </div>

            <div>
              <p className="font-semibold text-white mb-2">Pasos recomendados</p>
              <ol className="list-decimal list-inside text-xs text-gray-400 space-y-1">
                <li>Pulsa <b>Actualizar</b> para que el sistema verifique automáticamente con tus registros.</li>
                <li>Abre cada lineamiento y revisa los <b>Pendientes</b>.</li>
                <li>En los que sí cumples pero la evidencia está en tu nube, pulsa <b>"evaluar"</b> → marca <b>Cumple</b> y pega la <b>URL</b>.</li>
                <li>Exporta el resultado en <b>PDF (formato MINTRA)</b> o <b>Excel</b> para tu expediente/auditoría.</li>
              </ol>
            </div>

            <div>
              <p className="font-semibold text-white mb-2">Semáforo de cumplimiento</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-emerald-900/15 border border-emerald-900/40 rounded-lg p-2 text-center"><span className="text-emerald-400 font-bold">≥ 80%</span><div className="text-gray-500">Conforme</div></div>
                <div className="bg-amber-900/15 border border-amber-900/40 rounded-lg p-2 text-center"><span className="text-amber-400 font-bold">50 – 79%</span><div className="text-gray-500">Por mejorar</div></div>
                <div className="bg-red-900/15 border border-red-900/40 rounded-lg p-2 text-center"><span className="text-red-400 font-bold">&lt; 50%</span><div className="text-gray-500">Crítico</div></div>
              </div>
              <p className="text-[11px] text-gray-600 mt-2">El % se calcula así: <b>Cumple = 1</b>, <b>Parcial = 0.5</b>, <b>No cumple/Pendiente = 0</b>, sobre el total de indicadores. Se muestra por lineamiento y global, y se actualiza en tiempo real.</p>
            </div>

            <div className="bg-amber-900/15 border border-amber-900/40 rounded-lg p-3 text-xs text-amber-300/90">
              <b>Nota:</b> la verificación automática es una <b>ayuda</b>, no reemplaza el criterio del responsable de SSOMA. Siempre puedes ajustar manualmente cualquier indicador y respaldarlo con su evidencia.
            </div>

            <div className="flex justify-end"><Btn variant="primary" onClick={() => setShowGuide(false)}>Entendido</Btn></div>
          </div>
        </Modal>
      )}

      {showHist && (
        <Modal title="Historial de auditorías MINTRA" onClose={() => setShowHist(false)} wide>
          <div className="space-y-3">
            <p className="text-xs text-gray-500">Cada vez que pulsas <b>"Guardar auditoría"</b> se registra una foto del cumplimiento. Aquí ves la evolución en el tiempo.</p>
            {historial.length === 0 && <p className="text-sm text-gray-600 py-8 text-center">Aún no hay auditorías guardadas. Pulsa "Guardar auditoría" para registrar la primera.</p>}
            {historial.map((a, i) => {
              const prev = historial[i + 1]; // el siguiente en la lista es el anterior en el tiempo
              const delta = prev ? a.pct_global - prev.pct_global : null;
              const c = sem(a.pct_global);
              return (
                <div key={a.id} className="bg-gray-800/40 border border-gray-800 rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <span className="text-sm font-mono text-gray-300">{new Date(a.fecha + "T00:00:00").toLocaleDateString("es-PE")}</span>
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${SEM[c].txt}`}>{a.pct_global}%</span>
                      {delta !== null && <span className={`text-[11px] ${delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-400" : "text-gray-500"}`}>{delta > 0 ? "▲" : delta < 0 ? "▼" : "="} {Math.abs(delta)}% vs anterior</span>}
                      <span className="text-[11px] text-gray-600">{a.cumplidos}/{a.total} ítems</span>
                      <button onClick={() => eliminarAuditoria(a.id)} title="Eliminar" className="text-gray-700 hover:text-red-400"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 sm:grid-cols-8 gap-1.5">
                    {MINTRA_LINEAMIENTOS.map(l => { const p = a.detalle?.[l.id] ?? 0; return (
                      <div key={l.id} className="text-center" title={`${l.id}. ${l.titulo}: ${p}%`}>
                        <div className="h-10 bg-gray-900 rounded relative overflow-hidden flex items-end">
                          <div className={`w-full ${SEM[sem(p)].bar}`} style={{ height: `${p}%` }} />
                        </div>
                        <div className="text-[9px] text-gray-600 mt-0.5">{l.id}</div>
                        <div className="text-[9px] text-gray-500">{p}%</div>
                      </div>
                    ); })}
                  </div>
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2"><ShieldCheck size={16} className="text-blue-400" /> Cumplimiento SST — Checklist MINTRA</h3>
          <p className="text-gray-500 text-xs max-w-2xl">Anexo 3, RM 050-2013-TR. El sistema verifica en vivo con tus registros; lo que no detecta, márcalo manual con su evidencia (URL).</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Btn size="sm" variant="ghost" onClick={() => setShowGuide(true)}><HelpCircle size={13} /> Guía</Btn>
          <Btn size="sm" variant="ghost" onClick={cargar}><RefreshCw size={13} /> Actualizar</Btn>
          <Btn size="sm" variant="ghost" onClick={() => setShowHist(true)}><History size={13} /> Historial</Btn>
          <Btn size="sm" variant="primary" disabled={savingAud} onClick={guardarAuditoria}><Save size={13} /> {savingAud ? "Guardando…" : "Guardar auditoría"}</Btn>
          <Btn size="sm" variant="ghost" onClick={exportExcel}><FileSpreadsheet size={13} className="text-emerald-400" /> Excel</Btn>
          <Btn size="sm" variant="ghost" onClick={exportPDF}><FileDown size={13} className="text-red-400" /> PDF MINTRA</Btn>
        </div>
      </div>

      <div className={`rounded-xl border p-4 mb-5 ${SEM[gc].soft}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Cumplimiento global</span>
          <span className={`text-2xl font-bold ${SEM[gc].txt}`}>{pctGlobal}%</span>
        </div>
        <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${SEM[gc].bar} transition-all`} style={{ width: `${pctGlobal}%` }} />
        </div>
        <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
          <p className="text-[11px] text-gray-600">{ALL_ITEMS.length} indicadores · {ALL_ITEMS.filter(it => estadoItem(it).estado === "cumple").length} cumplidos · semáforo: ≥80% verde · 50-79% ámbar · &lt;50% rojo</p>
          <button onClick={() => setSoloGaps(v => !v)} className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${soloGaps ? "bg-red-900/30 border-red-800 text-red-300" : "border-gray-700 text-gray-400 hover:text-gray-200"}`}>
            {soloGaps ? "✓ Mostrando solo brechas" : "Ver solo brechas (lo que falta)"}
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {MINTRA_LINEAMIENTOS.map(l => {
          const p = pctLineamiento(l);
          const c = sem(p);
          const abierto = open[l.id];
          const items = l.grupos.flatMap(g => g.items);
          const cumplidos = items.filter(it => estadoItem(it).estado === "cumple").length;
          return (
            <div key={l.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <button onClick={() => setOpen(o => ({ ...o, [l.id]: !o[l.id] }))} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800/40 transition-colors text-left">
                {abierto ? <ChevronDown size={16} className="text-gray-500 shrink-0" /> : <ChevronRight size={16} className="text-gray-500 shrink-0" />}
                <span className="text-sm font-semibold text-white flex-1">{l.id}. {l.titulo}</span>
                <span className="text-xs text-gray-500">{cumplidos}/{items.length}</span>
                <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden hidden sm:block"><div className={`h-full ${SEM[c].bar}`} style={{ width: `${p}%` }} /></div>
                <span className={`text-sm font-bold w-12 text-right ${SEM[c].txt}`}>{p}%</span>
              </button>
              {abierto && (
                <div className="border-t border-gray-800">
                  {l.grupos.map(g => {
                    const gitems = soloGaps ? g.items.filter(it => estadoItem(it).estado !== "cumple") : g.items;
                    if (!gitems.length) return null;
                    return (
                    <div key={g.nombre}>
                      <div className="px-4 py-1.5 bg-gray-800/30 text-[11px] uppercase tracking-wide text-gray-500 font-medium">{g.nombre}</div>
                      {gitems.map(it => {
                        const e = estadoItem(it);
                        const St = ESTADOS[e.estado];
                        const exp = expandItem === it.id;
                        return (
                          <div key={it.id} className="border-t border-gray-800/40">
                            <div className="flex items-start gap-2.5 px-4 py-2.5">
                              <St.Icon size={16} className={`${EST_ICON[e.estado]} shrink-0 mt-0.5`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-300 leading-snug"><span className="text-gray-600 font-mono mr-1.5">{it.id}</span>{it.texto}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${e.modo === "manual" ? "bg-blue-900/40 text-blue-300" : e.modo === "auto" ? "bg-emerald-900/30 text-emerald-300" : "bg-gray-800 text-gray-500"}`}>
                                    {e.modo === "manual" ? <Hand size={9} /> : e.modo === "auto" ? <Zap size={9} /> : null}
                                    {e.modo === "manual" ? "Manual" : e.modo === "auto" ? "Automático" : "Pendiente"}
                                  </span>
                                  {e.modo === "auto" && e.auto && <span className="text-[10px] text-gray-600">{e.auto.label}</span>}
                                  {e.evidencia && <a href={e.evidencia} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 inline-flex items-center gap-0.5"><ExternalLink size={9} /> evidencia</a>}
                                  <button onClick={() => setExpandItem(exp ? null : it.id)} className="text-[10px] text-gray-500 hover:text-gray-300 underline">{exp ? "cerrar" : "evaluar"}</button>
                                </div>
                              </div>
                            </div>
                            {exp && (
                              <div className="px-4 pb-3 pl-11 space-y-2">
                                <div className="flex gap-1.5 flex-wrap">
                                  {Object.entries(ESTADOS).map(([k, v]) => {
                                    const activo = e.estado === k && e.modo === "manual";
                                    return (
                                      <button key={k} onClick={() => setOverride(it.id, { estado: k })}
                                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${activo ? EST_BTN_ON[k] : EST_BTN_OFF[k]}`}>
                                        {v.label}
                                      </button>
                                    );
                                  })}
                                  {e.modo === "manual" && <button onClick={() => volverAuto(it.id)} className="text-xs px-2.5 py-1 rounded-lg border border-gray-700 text-gray-500 hover:text-gray-300 inline-flex items-center gap-1"><Zap size={11} /> Volver a automático</button>}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Link2 size={13} className="text-gray-600 shrink-0" />
                                  <input defaultValue={e.evidencia || ""} onBlur={ev => ev.target.value !== (e.evidencia || "") && setOverride(it.id, { evidencia_url: ev.target.value || null, estado: e.estado })}
                                    placeholder="URL de evidencia (Drive, nube externa…)" className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500" />
                                </div>
                                <input defaultValue={e.obs || ""} onBlur={ev => ev.target.value !== (e.obs || "") && setOverride(it.id, { observacion: ev.target.value || null, estado: e.estado })}
                                  placeholder="Observación / dónde está la evidencia" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500" />
                                <div className="flex items-center gap-2 flex-wrap">
                                  <input defaultValue={e.responsable || ""} onBlur={ev => ev.target.value !== (e.responsable || "") && setOverride(it.id, { responsable: ev.target.value || null, estado: e.estado })}
                                    placeholder="Responsable" className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500 md:w-52" />
                                  {e.fecha && <span className="text-[10px] text-gray-600">Última edición: {new Date(e.fecha).toLocaleString("es-PE")}{e.responsable ? ` · ${e.responsable}` : ""}</span>}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
