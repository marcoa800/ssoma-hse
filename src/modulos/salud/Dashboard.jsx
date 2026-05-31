import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { calcularEdad, calcularVigencia, excelDateToISO } from '../../lib/helpers.js';
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
  const pctEpp = workers.length ? Math.round((workers.filter(w => w.epp_recibido).length / workers.length) * 100) : 0;
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Personal Activo" value={activos} sub={`de ${workers.length} registrados`} accentColor="blue" />
        <KpiCard label="Aptos con Restricción" value={conRestriccion} sub="requieren seguimiento" accentColor="amber" />
        <KpiCard label="EMOs por Vencer" value={emoVencer} sub="próximos 30 días" accentColor="red" />
        <KpiCard label="EPP Entregado" value={`${pctEpp}%`} sub={`${workers.filter(w => w.epp_recibido).length} de ${workers.length}`} accentColor="emerald" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-4">Indicadores de Cumplimiento</div>
          <div className="space-y-3">
            {[{ label: "% EPP entregado", value: pctEpp, color: "emerald" }, { label: "% Aptitud Médica Vigente", value: pctAptitud, color: "purple" }, { label: "% Capacitaciones realizadas", value: trainings.length ? Math.round((trainings.filter(t => (t.asistencia_count || 0) > 0).length / trainings.length) * 100) : 0, color: "blue" }].map(item => (
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

      {emoVencidos.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><AlertTriangle size={15} className="text-red-400" /> Alertas — EMO Vencido</div>
          <div className="space-y-2">
            {emoVencidos.map(w => (<div key={w.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-red-900/20 border border-red-900/40 text-sm"><AlertTriangle size={14} className="text-red-400 shrink-0" /><span className="text-white font-medium">{w.nombre}</span><span className="text-red-400">— Vigente hasta: {calcularVigencia(w.ultima_emo, w.duracion_emo)}</span><Badge color="amber">{w.cargo}</Badge></div>))}
          </div>
        </div>
      )}
    </div>
  );
}
