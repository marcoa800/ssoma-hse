import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../../lib/supabase.js';
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
import {
  Plus, Upload, Download, ChevronRight, ChevronLeft, Lock,
  Trash2, Filter, HelpCircle, Pencil, FileDown, AlertTriangle,
  CheckCircle, Home, HeartPulse, Microscope, Search, Shield,
  ClipboardList, ShieldAlert, Activity, BarChart2, BookOpen,
  FileText, Users, LayoutDashboard, Stethoscope, Settings,
  Building2, Phone
} from 'lucide-react';

export default function Dashboard({ workers, trainings }) {
  const activos = workers.filter(w => w.estado === "Activo").length;
  const now = new Date(); const in30 = new Date(); in30.setDate(in30.getDate() + 30);
  const emoVencer = workers.filter(w => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); if (!v) return false; const d = new Date(v); return d >= now && d <= in30; }).length;
  const emoVencidos = workers.filter(w => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); return v && new Date(v) < now; });
  // ── Alertas de vencimiento de EMO (control preventivo 30 días) ──
  const diasHasta = (v) => Math.ceil((new Date(v + "T00:00:00") - new Date(now.toISOString().split("T")[0] + "T00:00:00")) / 86400000);
  const emoAlertList = workers
    .map(w => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); return v ? { w, vence: v, dias: diasHasta(v) } : null; })
    .filter(x => x && x.dias <= 30)
    .sort((a, b) => a.dias - b.dias);
  const porVencer30 = emoAlertList.filter(x => x.dias >= 0);
  const vencidosList = emoAlertList.filter(x => x.dias < 0);
  const alertExport = emoAlertList.map(x => ({
    Trabajador: x.w.nombre, DNI: x.w.dni, Cargo: x.w.cargo || "", "Última EMO": x.w.ultima_emo || "",
    "Vence el": x.vence, "Días restantes": x.dias, Estado: x.dias < 0 ? "VENCIDO" : "Por vencer (≤30d)",
  }));
  const generarPDFAlertas = () => {
    const doc = new jsPDF();
    doc.setFontSize(13).text("Alerta de Vencimiento de EMO", 14, 16);
    doc.setFontSize(9).setTextColor(110);
    doc.text(`Control preventivo de 30 días de anticipación · Generado: ${new Date().toISOString().split("T")[0]}`, 14, 22);
    doc.text(`Por vencer (≤30d): ${porVencer30.length}   ·   Vencidos: ${vencidosList.length}`, 14, 27);
    doc.setTextColor(0);
    autoTable(doc, {
      startY: 32,
      head: [["Trabajador", "DNI", "Cargo", "Última EMO", "Vence el", "Días", "Estado"]],
      body: emoAlertList.map(x => [x.w.nombre, x.w.dni, x.w.cargo || "", x.w.ultima_emo || "", x.vence, x.dias, x.dias < 0 ? "VENCIDO" : "Por vencer"]),
      styles: { fontSize: 8, cellPadding: 1.5 }, headStyles: { fillColor: [180, 30, 30] },
      didParseCell: (d) => { if (d.section === "body" && d.column.index === 6 && d.cell.raw === "VENCIDO") { d.cell.styles.textColor = [185, 28, 28]; d.cell.styles.fontStyle = "bold"; } },
    });
    doc.save(`alerta_emo_${new Date().toISOString().split("T")[0]}.pdf`);
  };
  const pctEpp = workers.length ? Math.round((workers.filter(w => w.epp_recibido).length / workers.length) * 100) : 0;
  // ── Lecturas EMO ──
  // "Necesita lectura" = tiene EMO pero: (1) no tiene lectura, o (2) la lectura es anterior al EMO
  const necesitaLectura = (w) => {
    if (!w.ultima_emo) return false;                           // sin EMO → no aplica
    if (!w.lectura_emo) return true;                          // tiene EMO pero sin lectura
    return w.lectura_emo < w.ultima_emo;                      // lectura es de un EMO anterior
  };
  const lecturaAlertList = workers.filter(necesitaLectura)
    .sort((a, b) => (a.ultima_emo || "").localeCompare(b.ultima_emo || ""));
  const conLectura = workers.filter(w => w.ultima_emo && w.lectura_emo && w.lectura_emo >= w.ultima_emo).length;
  const sinLectura = lecturaAlertList.length;
  const pctLectura = workers.filter(w => w.ultima_emo).length
    ? Math.round((conLectura / workers.filter(w => w.ultima_emo).length) * 100) : 0;
  // aptNorm se define más abajo, duplicamos aquí para pctAptitud y conRestriccion
  const _aptN = (v) => (v || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const conRestriccion = workers.filter(w => _aptN(w.aptitud).includes("restricc")).length;
  const pctAptitud = workers.length ? Math.round((workers.filter(w => { const n = _aptN(w.aptitud); return n.startsWith("apto") && n !== "apto no"; }).length / workers.length) * 100) : 0;
  const chartTip = { backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#f3f4f6', fontSize: '12px' };
  const emoChartData = [
    { name: "Vigentes", value: workers.filter(w => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); return v && new Date(v) > in30; }).length, color: "#10b981" },
    { name: "Por vencer (30d)", value: workers.filter(w => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); return v && new Date(v) >= now && new Date(v) <= in30; }).length, color: "#f59e0b" },
    { name: "Vencidos", value: workers.filter(w => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); return v && new Date(v) < now; }).length, color: "#ef4444" },
    { name: "Sin EMO", value: workers.filter(w => !w.ultima_emo).length, color: "#6b7280" },
  ].filter(d => d.value > 0);
  const aptNorm      = (v) => (v || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const nRestriccion = workers.filter(w => aptNorm(w.aptitud).includes("restricc")).length;
  const nNoApto      = workers.filter(w => aptNorm(w.aptitud) === "no apto").length;
  const nApto        = workers.filter(w => { const n = aptNorm(w.aptitud); return n === "apto" || (n.startsWith("apto") && !n.includes("restricc") && n !== "apto no"); }).length;
  const nNoEvaluado  = workers.length - nApto - nRestriccion - nNoApto;
  const aptitudChartData = [
    { name: "Apto",             value: nApto,        color: "#10b981" },
    { name: "Con restricción",  value: nRestriccion, color: "#f59e0b" },
    { name: "No evaluado",      value: nNoEvaluado,  color: "#6b7280" },
    { name: "No apto",          value: nNoApto,      color: "#ef4444" },
  ].filter(d => d.value > 0);
  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <KpiCard label="Personal Activo" value={activos} sub={`de ${workers.length} registrados`} accentColor="blue" />
        <KpiCard label="Aptos con Restricción" value={conRestriccion} sub="requieren seguimiento" accentColor="amber" />
        <KpiCard label="EMOs por Vencer" value={emoVencer} sub="próximos 30 días" accentColor="red" />
        <KpiCard label="EPP Entregado" value={`${pctEpp}%`} sub={`${workers.filter(w => w.epp_recibido).length} de ${workers.length}`} accentColor="emerald" />
        <KpiCard label="Sin Lectura EMO" value={sinLectura} sub={`${conLectura} con lectura registrada`} accentColor={sinLectura > 0 ? "amber" : "emerald"} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-4">Indicadores de Cumplimiento</div>
          <div className="space-y-3">
            {[{ label: "% EPP entregado", value: pctEpp, color: "emerald" }, { label: "% Aptitud Médica Vigente", value: pctAptitud, color: "purple" }, { label: "% Lectura EMO entregada", value: pctLectura, color: "amber" }, { label: "% Capacitaciones realizadas", value: trainings.length ? Math.round((trainings.filter(t => (t.asistencia_count || 0) > 0).length / trainings.length) * 100) : 0, color: "blue" }].map(item => (
              <div key={item.label}><div className="flex justify-between text-xs text-gray-500 mb-1.5"><span>{item.label}</span><span className="text-white font-medium">{item.value}%</span></div><ProgressBar value={item.value} color={item.color} height="h-2" /></div>
            ))}
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-4">Últimas Capacitaciones</div>
          <div className="space-y-3">
            {trainings.slice(0, 4).map(t => { const pct = t.programados > 0 ? Math.round(((t.asistencia_count || 0) / t.programados) * 100) : 0; return (<div key={t.id} className="flex items-center gap-3"><div className="flex-1 min-w-0 text-sm text-gray-400 truncate">{t.nombre}</div><div className="w-20"><ProgressBar value={pct} color={pct >= 80 ? "emerald" : pct >= 40 ? "amber" : "red"} /></div><div className="text-xs text-gray-600 w-8 text-right">{pct}%</div></div>); })}
            {trainings.length === 0 && <div className="text-xs text-gray-600">No hay capacitaciones registradas</div>}
          </div>
        </div>
      </div>

      {/* ── Gráficos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-4">Estado de EMOs</div>
          {emoChartData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div style={{ width: 160, height: 160, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={emoChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" paddingAngle={2} startAngle={90} endAngle={-270}>
                      {emoChartData.map((e, i) => <Cell key={i} fill={e.color} strokeWidth={0} />)}
                    </Pie>
                    <ChartTooltip contentStyle={chartTip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 flex-1">
                {emoChartData.map(e => (
                  <div key={e.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                    <span className="text-xs text-gray-400 flex-1">{e.name}</span>
                    <span className="text-sm font-bold text-white">{e.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-xs text-gray-600">Sin trabajadores registrados</div>
          )}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-4">Aptitud Médica del Personal</div>
          {workers.length > 0 ? (
            <div className="flex items-center gap-4">
              <div style={{ width: 148, height: 148, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={aptitudChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={66} dataKey="value" paddingAngle={2} startAngle={90} endAngle={-270}>
                      {aptitudChartData.map((e, i) => <Cell key={i} fill={e.color} strokeWidth={0} />)}
                    </Pie>
                    <ChartTooltip contentStyle={chartTip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 flex-1">
                {[
                  { label: "Apto",           value: nApto,        color: "#10b981", bg: "bg-emerald-900/20 border-emerald-900/40" },
                  { label: "Con restricción",value: nRestriccion, color: "#f59e0b", bg: "bg-amber-900/20 border-amber-900/40"   },
                  { label: "No evaluado",    value: nNoEvaluado,  color: "#6b7280", bg: "bg-gray-800 border-gray-700"            },
                  { label: "No apto",        value: nNoApto,      color: "#ef4444", bg: "bg-red-900/20 border-red-900/40"       },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} border rounded-lg p-2.5`}>
                    <div className="text-2xl font-bold leading-none" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-xs text-gray-500 mt-1 leading-tight">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-36 text-xs text-gray-600">Sin datos de aptitud registrados</div>
          )}
        </div>
      </div>

      {/* ── Panel de alerta: Lecturas pendientes ── */}
      {lecturaAlertList.length > 0 && (
        <div className="bg-gray-900 border border-amber-900/50 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-400" /> Lectura de Resultados Pendiente
              <span className="text-[11px] font-normal text-gray-500">— {lecturaAlertList.length} trabajador(es)</span>
            </div>
            <Btn size="sm" variant="default" onClick={() => {
              const doc = new jsPDF();
              doc.setFontSize(13).text("Lecturas de Resultados EMO Pendientes", 14, 16);
              doc.setFontSize(9).setTextColor(110).text(`Generado: ${new Date().toISOString().split("T")[0]}`, 14, 22);
              doc.setTextColor(0);
              autoTable(doc, {
                startY: 28,
                head: [["Trabajador", "DNI", "Cargo", "Fecha EMO", "Última lectura", "Motivo"]],
                body: lecturaAlertList.map(w => [
                  w.nombre, w.dni, w.cargo || "", w.ultima_emo || "",
                  w.lectura_emo || "Sin lectura",
                  w.lectura_emo ? "Lectura anterior al nuevo EMO" : "Sin lectura registrada"
                ]),
                styles: { fontSize: 8, cellPadding: 1.5 },
                headStyles: { fillColor: [146, 64, 14] },
              });
              doc.save(`lecturas_pendientes_${new Date().toISOString().split("T")[0]}.pdf`);
            }}><FileDown size={13} /> PDF</Btn>
          </div>
          <div className="space-y-2">
            {lecturaAlertList.map(w => (
              <div key={w.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-amber-900/15 border border-amber-900/40 text-sm flex-wrap">
                <span className="text-white font-medium flex-1 min-w-0 truncate">
                  {w.nombre} <span className="text-gray-500 font-mono text-xs">({w.dni})</span>
                </span>
                <Badge color="gray">{w.cargo || "—"}</Badge>
                <span className="text-gray-300 text-xs whitespace-nowrap">EMO: {fmtFecha(w.ultima_emo)}</span>
                {w.lectura_emo
                  ? <Badge color="amber">Lectura anterior: {fmtFecha(w.lectura_emo)}</Badge>
                  : <Badge color="red">Sin lectura</Badge>
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {emoAlertList.length > 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-400" /> Alerta de Vencimiento de EMO
              <span className="text-[11px] font-normal text-gray-500">— control preventivo 30 días</span>
            </div>
            <div className="flex gap-2">
              <ExportBtn filename="alerta_emo" data={alertExport} />
              <Btn size="sm" variant="default" onClick={generarPDFAlertas}><FileDown size={13} /> PDF</Btn>
            </div>
          </div>

          {porVencer30.length > 0 && (
            <>
              <p className="text-[11px] uppercase tracking-wide text-amber-400/80 font-semibold mb-1.5">Por vencer (≤30 días) — {porVencer30.length}</p>
              <div className="space-y-2 mb-4">
                {porVencer30.map(x => (
                  <div key={x.w.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-amber-900/15 border border-amber-900/40 text-sm">
                    <span className="text-white font-medium flex-1 min-w-0 truncate">{x.w.nombre} <span className="text-gray-500 font-mono text-xs">({x.w.dni})</span></span>
                    <Badge color="gray">{x.w.cargo || "—"}</Badge>
                    <span className="text-amber-300 text-xs whitespace-nowrap hidden sm:inline">Vence {fmtFecha(x.vence)}</span>
                    <Badge color={x.dias <= 7 ? "red" : "amber"}>{x.dias} día{x.dias === 1 ? "" : "s"}</Badge>
                  </div>
                ))}
              </div>
            </>
          )}

          {vencidosList.length > 0 && (
            <>
              <p className="text-[11px] uppercase tracking-wide text-red-400/80 font-semibold mb-1.5">Vencidos — {vencidosList.length}</p>
              <div className="space-y-2">
                {vencidosList.map(x => (
                  <div key={x.w.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-red-900/20 border border-red-900/40 text-sm">
                    <AlertTriangle size={14} className="text-red-400 shrink-0" />
                    <span className="text-white font-medium flex-1 min-w-0 truncate">{x.w.nombre} <span className="text-gray-500 font-mono text-xs">({x.w.dni})</span></span>
                    <Badge color="gray">{x.w.cargo || "—"}</Badge>
                    <span className="text-red-400 text-xs whitespace-nowrap hidden sm:inline">Venció {fmtFecha(x.vence)}</span>
                    <Badge color="red">{Math.abs(x.dias)} día{Math.abs(x.dias) === 1 ? "" : "s"}</Badge>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="bg-emerald-900/15 border border-emerald-900/40 rounded-xl p-4 flex items-center gap-2.5">
          <CheckCircle size={16} className="text-emerald-400 shrink-0" />
          <span className="text-sm text-emerald-200">Sin EMOs vencidos ni por vencer en los próximos 30 días. ✔</span>
        </div>
      )}
    </div>
  );
}
