import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { calcularEdad, calcularVigencia } from '../../lib/helpers.js';
import { TRIAJE_CATS, CATEGORIAS_RIESGO, DETALLES_ESPECIFICOS, NIVEL_RIESGO_DESC } from '../../constants/triaje.js';
import { Badge } from '../../components/ui/Badge.jsx';
import { KpiCard } from '../../components/ui/KpiCard.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Btn } from '../../components/ui/Btn.jsx';
import { ExportBtn } from '../../components/ui/ExportBtn.jsx';
import { FilterBar } from '../../components/ui/FilterBar.jsx';
import {
  Plus, Upload, Download, Trash2, Pencil, AlertTriangle, CheckCircle,
  Filter, HelpCircle, Lock, Shield, ClipboardList, ShieldAlert,
  Activity, FileText, Users, LayoutDashboard, Stethoscope, Search,
  ChevronRight, ChevronLeft, Phone, Eye, EyeOff, X, Copy, FileDown,
  Building2, Settings
} from 'lucide-react';

export default function ReportesSSOMAModulo({ empresaId, empresa, workers }) {
  const [mes,       setMes]       = useState(new Date().toISOString().slice(0, 7));
  const [generando, setGenerando] = useState(false);

  const mesLabel = (m = mes) => {
    const [y, mo] = m.split("-");
    const nombres = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    return `${nombres[parseInt(mo) - 1]} ${y}`;
  };

  const generarPDF = async () => {
    setGenerando(true);
    try {
      const inicio  = `${mes}-01`;
      const finDate = new Date(mes + "-01"); finDate.setMonth(finDate.getMonth() + 1); finDate.setDate(finDate.getDate() - 1);
      const fin     = finDate.toISOString().split("T")[0];

      // Cargar datos SSOMA del período
      const [racsRes, accRes, inspRes, hallRes, atsRes] = await Promise.all([
        supabase.from("racs").select("id, nivel_riesgo, tipo_reporte, estado, created_at").eq("empresa_id", empresaId).gte("created_at", inicio).lte("created_at", fin + "T23:59:59"),
        supabase.from("accidentes").select("id, tipo, gravedad, created_at").eq("empresa_id", empresaId).gte("created_at", inicio).lte("created_at", fin + "T23:59:59"),
        supabase.from("inspecciones").select("id, tipo, resultado, fecha").eq("empresa_id", empresaId).gte("fecha", inicio).lte("fecha", fin),
        supabase.from("hallazgos_inspeccion").select("id, estado, inspeccion_id").eq("empresa_id", empresaId),
        supabase.from("ats_petar").select("id, tipo, tipo_trabajo, estado, fecha").eq("empresa_id", empresaId).gte("fecha", inicio).lte("fecha", fin),
      ]);

      const racs       = racsRes.data   || [];
      const accidentes = accRes.data    || [];
      const inspecs    = inspRes.data   || [];
      const hallazgos  = hallRes.data   || [];
      const atsDocs    = atsRes.data    || [];

      const doc = new jsPDF();
      const pw  = doc.internal.pageSize.getWidth();

      // ── CABECERA ──
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pw, 38, "F");
      doc.setFillColor(217, 119, 6); // amber-600
      doc.rect(0, 36, pw, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16); doc.setFont("helvetica", "bold");
      doc.text("INFORME MENSUAL SSOMA", pw / 2, 14, { align: "center" });
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      doc.text("Seguridad, Salud Ocupacional y Medio Ambiente", pw / 2, 22, { align: "center" });
      doc.text(`${empresa?.nombre || "Empresa"} | ${mesLabel()} | Generado: ${new Date().toLocaleDateString("es-PE")}`, pw / 2, 30, { align: "center" });
      doc.setTextColor(0, 0, 0);

      // ── 1. RESUMEN EJECUTIVO ──
      doc.setFontSize(11); doc.setFont("helvetica", "bold");
      doc.text("1. RESUMEN EJECUTIVO DEL PERÍODO", 14, 50);
      autoTable(doc, {
        startY: 55,
        head: [["Indicador", "Valor"]],
        body: [
          ["Total trabajadores", workers.length],
          ["RACs recibidas en el período", racs.length],
          ["RACs nivel ALTO", racs.filter(r => r.nivel_riesgo === "Alto").length],
          ["Accidentes / Incidentes reportados", accidentes.length],
          ["Inspecciones realizadas", inspecs.length],
          ["Inspecciones insatisfactorias", inspecs.filter(i => i.resultado === "Insatisfactorio").length],
          ["Hallazgos abiertos (acumulado)", hallazgos.filter(h => h.estado === "Abierto").length],
          ["ATS / PETAR emitidos", atsDocs.length],
        ],
        theme: "grid",
        headStyles: { fillColor: [217, 119, 6], textColor: [255,255,255], fontStyle: "bold", fontSize: 9 },
        alternateRowStyles: { fillColor: [255, 251, 235] },
        styles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 140 }, 1: { halign: "center", fontStyle: "bold", cellWidth: 30 } },
      });

      // ── 2. RACs ──
      const y2 = doc.lastAutoTable.finalY + 12;
      doc.setFontSize(11); doc.setFont("helvetica", "bold");
      doc.text(`2. REPORTES DE ACTOS Y CONDICIONES (RACs) — ${mesLabel().toUpperCase()}`, 14, y2);
      autoTable(doc, {
        startY: y2 + 5,
        head: [["Nivel de Riesgo", "Tipo", "Cantidad", "% del total"]],
        body: [
          ["Alto",  "Acto / Condición", racs.filter(r => r.nivel_riesgo === "Alto").length,  racs.length ? Math.round(racs.filter(r => r.nivel_riesgo === "Alto").length  / racs.length * 100) + "%" : "—"],
          ["Medio", "Acto / Condición", racs.filter(r => r.nivel_riesgo === "Medio").length, racs.length ? Math.round(racs.filter(r => r.nivel_riesgo === "Medio").length / racs.length * 100) + "%" : "—"],
          ["Bajo",  "Acto / Condición", racs.filter(r => r.nivel_riesgo === "Bajo").length,  racs.length ? Math.round(racs.filter(r => r.nivel_riesgo === "Bajo").length  / racs.length * 100) + "%" : "—"],
          ["TOTAL", "",                 racs.length,                                          "100%"],
        ],
        theme: "grid",
        headStyles: { fillColor: [217, 119, 6], textColor: [255,255,255], fontStyle: "bold", fontSize: 9 },
        styles: { fontSize: 9 },
        columnStyles: { 2: { halign: "center", fontStyle: "bold" }, 3: { halign: "center" } },
        didParseCell: (data) => {
          if (data.section === "body" && data.row.index === 3) data.cell.styles.fontStyle = "bold";
          if (data.section === "body" && data.row.index === 0 && data.column.index === 0) data.cell.styles.textColor = [220, 38, 38];
        },
      });

      // ── 3. INSPECCIONES ──
      if (doc.lastAutoTable.finalY > 210) doc.addPage();
      const y3 = doc.lastAutoTable.finalY > 210 ? 20 : doc.lastAutoTable.finalY + 12;
      doc.setFontSize(11); doc.setFont("helvetica", "bold");
      doc.text(`3. INSPECCIONES DE SEGURIDAD — ${mesLabel().toUpperCase()}`, 14, y3);
      const inspRows = inspecs.length
        ? inspecs.map(i => [i.fecha || "—", i.tipo || "—", i.resultado || "—"])
        : [["Sin inspecciones en el período", "", ""]];
      autoTable(doc, {
        startY: y3 + 5,
        head: [["Fecha", "Tipo de inspección", "Resultado"]],
        body: inspRows,
        theme: "striped",
        headStyles: { fillColor: [217, 119, 6], textColor: [255,255,255], fontStyle: "bold", fontSize: 9 },
        styles: { fontSize: 9 },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 2) {
            if (data.cell.text[0] === "Insatisfactorio") data.cell.styles.textColor = [220, 38, 38];
            if (data.cell.text[0] === "Satisfactorio") data.cell.styles.textColor = [16, 185, 129];
          }
        },
      });

      // ── 4. ATS / PETAR ──
      if (doc.lastAutoTable.finalY > 210) doc.addPage();
      const y4 = doc.lastAutoTable.finalY > 210 ? 20 : doc.lastAutoTable.finalY + 12;
      doc.setFontSize(11); doc.setFont("helvetica", "bold");
      doc.text(`4. ATS / PETAR EMITIDOS — ${mesLabel().toUpperCase()}`, 14, y4);
      const atsRows = atsDocs.length
        ? atsDocs.map(d => [d.fecha || "—", d.tipo || "—", d.tipo_trabajo || "—", d.estado || "—"])
        : [["Sin documentos en el período", "", "", ""]];
      autoTable(doc, {
        startY: y4 + 5,
        head: [["Fecha", "Tipo", "Trabajo", "Estado"]],
        body: atsRows,
        theme: "striped",
        headStyles: { fillColor: [217, 119, 6], textColor: [255,255,255], fontStyle: "bold", fontSize: 9 },
        styles: { fontSize: 9 },
      });

      // ── 5. HALLAZGOS PENDIENTES ──
      if (doc.lastAutoTable.finalY > 210) doc.addPage();
      const y5 = doc.lastAutoTable.finalY > 210 ? 20 : doc.lastAutoTable.finalY + 12;
      doc.setFontSize(11); doc.setFont("helvetica", "bold");
      doc.text("5. ESTADO DE HALLAZGOS (ACUMULADO)", 14, y5);
      autoTable(doc, {
        startY: y5 + 5,
        head: [["Estado", "Cantidad"]],
        body: [
          ["Abiertos",    hallazgos.filter(h => h.estado === "Abierto").length],
          ["En proceso",  hallazgos.filter(h => h.estado === "En proceso").length],
          ["Cerrados",    hallazgos.filter(h => h.estado === "Cerrado").length],
          ["TOTAL",       hallazgos.length],
        ],
        theme: "grid",
        headStyles: { fillColor: [217, 119, 6], textColor: [255,255,255], fontStyle: "bold", fontSize: 9 },
        styles: { fontSize: 9 },
        columnStyles: { 1: { halign: "center", fontStyle: "bold" } },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 0 && data.cell.text[0] === "Abiertos") data.cell.styles.textColor = [220, 38, 38];
          if (data.section === "body" && data.row.index === 3) data.cell.styles.fontStyle = "bold";
        },
      });

      // ── FOOTER en todas las páginas ──
      const total = doc.internal.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setFontSize(7); doc.setTextColor(150);
        doc.text(`SSOMA-HSE Sistema de Gestión | ${empresa?.nombre || ""} | Pág. ${i} de ${total}`, pw / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
        doc.setTextColor(0, 0, 0);
      }

      doc.save(`informe_ssoma_seguridad_${mes}.pdf`);
      showToast("PDF generado y descargado", "success");
    } catch (e) {
      showToast("Error al generar PDF: " + e.message, "error");
    }
    setGenerando(false);
  };

  const reportSections = [
    { icon: "🟠", label: "RACs del período",          desc: "Cantidad por nivel de riesgo (Alto / Medio / Bajo)" },
    { icon: "🔴", label: "Accidentes / Incidentes",   desc: "Registros del mes seleccionado" },
    { icon: "📋", label: "Inspecciones de seguridad", desc: "Lista con resultado (Satisfactorio / Insatisfactorio)" },
    { icon: "📄", label: "ATS / PETAR emitidos",      desc: "Documentos de trabajo de alto riesgo" },
    { icon: "🔍", label: "Estado de hallazgos",       desc: "Abiertos, en proceso y cerrados (acumulado)" },
  ];

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-white">Reportes PDF — SSOMA</h2>
        <p className="text-gray-500 text-xs mt-0.5">Genera informes descargables de seguridad para el período seleccionado.</p>
      </div>

      {/* Selector de mes */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="text-sm font-medium text-white mb-3">Período del informe</div>
        <div className="flex items-center gap-3">
          <input type="month" value={mes} onChange={e => setMes(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" />
          <span className="text-gray-400 text-sm">{mesLabel()}</span>
        </div>
      </div>

      {/* Qué incluye */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="text-sm font-medium text-white mb-3">El informe incluye</div>
        <div className="space-y-2.5">
          {reportSections.map(s => (
            <div key={s.label} className="flex items-start gap-3">
              <span className="text-base leading-none mt-0.5">{s.icon}</span>
              <div>
                <div className="text-xs font-medium text-gray-300">{s.label}</div>
                <div className="text-xs text-gray-600">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botón */}
      <button onClick={generarPDF} disabled={generando}
        className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 rounded-xl transition-colors">
        <FileDown size={16} />
        {generando ? "Generando PDF..." : `Descargar informe SSOMA — ${mesLabel()}`}
      </button>

      <p className="text-xs text-gray-600 text-center">El PDF se descarga directamente. No se almacena en servidores externos.</p>
    </div>
  );
}
