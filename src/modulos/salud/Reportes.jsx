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
  Plus, Upload, Download, ChevronRight, ChevronLeft, Lock, Info,
  Trash2, Filter, HelpCircle, Pencil, FileDown, AlertTriangle,
  CheckCircle, Home, HeartPulse, Microscope, Search, Shield,
  ClipboardList, ShieldAlert, Activity, BarChart2, BookOpen,
  FileText, Users, LayoutDashboard, Stethoscope, Settings,
  Building2, Phone
} from 'lucide-react';

export default function ReportesModulo({ workers, trainings, empresaId, empresa }) {
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [generando, setGenerando] = useState(false);

  const mesLabel = (m = mes) => {
    const [y, mo] = m.split("-");
    const nombres = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    return `${nombres[parseInt(mo) - 1]} ${y}`;
  };

  const generarPDF = async () => {
    setGenerando(true);
    try {
      const inicio = `${mes}-01`;
      const finDate = new Date(mes + "-01"); finDate.setMonth(finDate.getMonth() + 1); finDate.setDate(finDate.getDate() - 1);
      const fin = finDate.toISOString().split("T")[0];
      const now = new Date(); const in30 = new Date(); in30.setDate(in30.getDate() + 30);

      const [fatiga, descansos, morbilidad, diserg, auditiva] = await Promise.all([
        supabase.from("vigilancia_fatiga").select("id, nivel_riesgo").eq("empresa_id", empresaId).gte("fecha_evaluacion", inicio).lte("fecha_evaluacion", fin),
        supabase.from("vigilancia_descansos").select("id, dias_descanso").eq("empresa_id", empresaId).gte("fecha_inicio", inicio).lte("fecha_inicio", fin),
        supabase.from("vigilancia_morbilidad").select("id, diagnostico").eq("empresa_id", empresaId).gte("fecha_consulta", inicio).lte("fecha_consulta", fin),
        supabase.from("vigilancia_disergonomia").select("id, nivel_riesgo").eq("empresa_id", empresaId).gte("fecha_evaluacion", inicio).lte("fecha_evaluacion", fin),
        supabase.from("vigilancia_auditiva").select("id, resultado_audiometria").eq("empresa_id", empresaId).gte("fecha_evaluacion", inicio).lte("fecha_evaluacion", fin),
      ]);

      const doc = new jsPDF();
      const pw = doc.internal.pageSize.getWidth();

      // ── HEADER ──
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pw, 38, "F");
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 36, pw, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16); doc.setFont("helvetica", "bold");
      doc.text("INFORME MENSUAL SSOMA", pw / 2, 15, { align: "center" });
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      doc.text(`${empresa?.nombre || "Empresa"} | ${mesLabel()} | Generado: ${new Date().toLocaleDateString("es-PE")}`, pw / 2, 26, { align: "center" });
      doc.setTextColor(0, 0, 0);

      // ── SECCIÓN 1: RESUMEN DE PERSONAL ──
      doc.setFontSize(11); doc.setFont("helvetica", "bold");
      doc.text("1. RESUMEN DE PERSONAL", 14, 50);
      autoTable(doc, {
        startY: 55,
        head: [["Indicador", "Valor"]],
        body: [
          ["Total de trabajadores", workers.length],
          ["Trabajadores activos", workers.filter(w => w.estado === "Activo").length],
          ["EMOs vigentes (> 30 días)", workers.filter(w => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); return v && new Date(v) > in30; }).length],
          ["EMOs por vencer (≤ 30 días)", workers.filter(w => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); return v && new Date(v) >= now && new Date(v) <= in30; }).length],
          ["EMOs vencidos", workers.filter(w => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); return v && new Date(v) < now; }).length],
          ["Sin EMO registrado", workers.filter(w => !w.ultima_emo).length],
          ["Con EPP entregado", workers.filter(w => w.epp_recibido).length],
          ["Aptos (con o sin restricción)", workers.filter(w => ["Apto","Apto con restricción"].includes(w.aptitud)).length],
        ],
        theme: "grid",
        headStyles: { fillColor: [37, 99, 235], textColor: [255,255,255], fontStyle: "bold", fontSize: 9 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 140 }, 1: { halign: "center", fontStyle: "bold", cellWidth: 30 } },
      });

      // ── SECCIÓN 2: ESTADO DE EMOs ──
      const y2 = doc.lastAutoTable.finalY + 12;
      doc.setFontSize(11); doc.setFont("helvetica", "bold");
      doc.text("2. ESTADO DE EMOs POR TRABAJADOR ACTIVO", 14, y2);
      const emoRows = workers.filter(w => w.estado === "Activo").sort((a,b) => a.nombre.localeCompare(b.nombre)).map(w => {
        const v = calcularVigencia(w.ultima_emo, w.duracion_emo);
        const isV = v && new Date(v) < now; const porV = !isV && v && new Date(v) <= in30;
        return [w.nombre, w.cargo || "—", w.ultima_emo || "—", v || "Sin registro", isV ? "VENCIDO" : porV ? "Por vencer" : v ? "Vigente" : "Sin EMO"];
      });
      autoTable(doc, {
        startY: y2 + 5,
        head: [["Trabajador", "Cargo", "Última EMO", "Vigente Hasta", "Estado"]],
        body: emoRows,
        theme: "striped",
        headStyles: { fillColor: [37, 99, 235], textColor: [255,255,255], fontStyle: "bold", fontSize: 8 },
        styles: { fontSize: 8 },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 4) {
            const t = data.cell.text[0];
            if (t === "VENCIDO") data.cell.styles.textColor = [220, 38, 38];
            else if (t === "Por vencer") data.cell.styles.textColor = [217, 119, 6];
            else if (t === "Vigente") data.cell.styles.textColor = [16, 185, 129];
          }
        },
      });

      // ── SECCIÓN 3: VIGILANCIA DEL MES ──
      if (doc.lastAutoTable.finalY > 220) doc.addPage();
      const y3 = doc.lastAutoTable.finalY > 220 ? 20 : doc.lastAutoTable.finalY + 12;
      doc.setFontSize(11); doc.setFont("helvetica", "bold");
      doc.text(`3. VIGILANCIA MÉDICA — ${mesLabel().toUpperCase()}`, 14, y3);
      autoTable(doc, {
        startY: y3 + 5,
        head: [["Programa de Vigilancia", `Evaluaciones en ${mesLabel()}`, "Observación"]],
        body: [
          ["Fatiga y Somnolencia", fatiga.data?.length ?? 0, fatiga.data?.filter(r => r.nivel_riesgo === "Severo").length > 0 ? "⚠ Casos severos" : "—"],
          ["Descansos Médicos", descansos.data?.length ?? 0, descansos.data?.length ? `${descansos.data.reduce((s, r) => s + (r.dias_descanso || 0), 0)} días acum.` : "—"],
          ["Consultas / Morbilidad", morbilidad.data?.length ?? 0, "—"],
          ["Riesgos Disergonómicos", diserg.data?.length ?? 0, diserg.data?.filter(r => ["Alto","Muy Alto"].includes(r.nivel_riesgo)).length > 0 ? "⚠ Alto riesgo" : "—"],
          ["Protección Auditiva", auditiva.data?.length ?? 0, "—"],
        ],
        theme: "grid",
        headStyles: { fillColor: [124, 58, 237], textColor: [255,255,255], fontStyle: "bold", fontSize: 9 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 9 },
        columnStyles: { 1: { halign: "center", fontStyle: "bold" } },
      });

      // ── FOOTER ──
      const total = doc.internal.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setFontSize(7); doc.setTextColor(150);
        doc.text(`SSOMA-HSE Sistema de Gestión | ${empresa?.nombre || ""} | Pág. ${i} de ${total}`, pw / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
      }

      doc.save(`informe_ssoma_${mes}.pdf`);
      showToast("PDF generado y descargado", "success");
    } catch (e) {
      showToast("Error al generar PDF: " + e.message, "error");
    }
    setGenerando(false);
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Módulo de Reportes</h3>
          <p className="text-gray-500 text-xs max-w-xl">Genera informes PDF descargables con resumen de personal, estado de EMOs y vigilancia médica del período seleccionado.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileDown size={16} className="text-blue-400" />
            <span className="text-white font-semibold text-sm">Informe Mensual SSOMA</span>
          </div>
          <p className="text-gray-500 text-xs mb-4">Incluye resumen de personal, estado de EMOs de todos los trabajadores activos y evaluaciones de vigilancia del mes seleccionado.</p>
          <FormField label="Mes del informe">
            <input type="month" value={mes} onChange={e => setMes(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500" />
          </FormField>
          <div className="mt-4">
            <Btn variant="primary" onClick={generarPDF} disabled={generando} className="w-full justify-center">
              <Download size={14} />{generando ? "Generando PDF..." : `Descargar informe — ${mesLabel()}`}
            </Btn>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info size={16} className="text-gray-500" />
            <span className="text-white font-semibold text-sm">Contenido del informe</span>
          </div>
          <div className="space-y-2.5 mb-4">
            {[
              { icon: "📋", text: "Resumen de personal: activos, EMOs, aptitud, EPP" },
              { icon: "📊", text: "Estado EMOs por trabajador con semáforo de vigencia" },
              { icon: "🏥", text: "Evaluaciones de vigilancia médica del mes seleccionado" },
              { icon: "📄", text: "Paginación y pie de página con nombre de empresa" },
            ].map(item => (
              <div key={item.text} className="flex items-start gap-2 text-xs text-gray-400">
                <span className="shrink-0">{item.icon}</span><span>{item.text}</span>
              </div>
            ))}
          </div>
          <div className="p-3 bg-amber-900/20 border border-amber-800/40 rounded-lg">
            <p className="text-amber-400 text-xs">💡 El PDF se descarga directamente. No se almacena en servidores externos.</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="text-sm font-semibold text-white mb-3">Próximos reportes</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "Reporte de Accidentabilidad", desc: "TFIA, TFGA, días perdidos y estadísticas" },
            { label: "Informe de Capacitaciones", desc: "Asistencia y horas por área y trabajador" },
            { label: "Estadísticas de Morbilidad", desc: "Diagnósticos frecuentes y días de reposo" },
            { label: "Matriz de Riesgos / IPERC", desc: "Resumen de peligros y controles por área" },
          ].map(r => (
            <div key={r.label} className="p-3 border border-gray-800 rounded-lg opacity-60">
              <p className="text-xs font-medium text-gray-400 mb-1">{r.label} <Badge color="amber">Próximo</Badge></p>
              <p className="text-xs text-gray-600">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
