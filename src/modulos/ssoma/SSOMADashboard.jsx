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

export default function SSOMADashboard({ empresaId, workers }) {
  const [accidentes, setAccidentes] = useState([]);
  const [loadingAcc, setLoadingAcc] = useState(true);

  useEffect(() => {
    if (!empresaId) return;
    supabase.from("accidentes_incidentes").select("*").eq("empresa_id", empresaId)
      .order("fecha_evento", { ascending: false })
      .then(({ data }) => { setAccidentes(data || []); setLoadingAcc(false); });
  }, [empresaId]);

  const anio = new Date().getFullYear();
  const mesActual = new Date().getMonth();
  const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

  const accLaborales = accidentes.filter(a => a.tipo === "Accidente Laboral");
  const incPeligrosos = accidentes.filter(a => a.tipo === "Incidente Peligroso");
  const delAnio = accidentes.filter(a => new Date(a.fecha_evento).getFullYear() === anio);
  const delMes  = delAnio.filter(a => new Date(a.fecha_evento).getMonth() === mesActual);
  const diasPerdidos = delAnio.reduce((s, a) => s + (a.dias_perdidos || 0), 0);
  const abiertos = accidentes.filter(a => ["Pendiente","En proceso"].includes(a.estado_investigacion));

  const trendData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const m = d.getMonth(); const y = d.getFullYear();
    return {
      mes: MESES[m],
      Accidentes: accidentes.filter(a => { const ad = new Date(a.fecha_evento); return ad.getMonth()===m && ad.getFullYear()===y && a.tipo==="Accidente Laboral"; }).length,
      Incidentes: accidentes.filter(a => { const ad = new Date(a.fecha_evento); return ad.getMonth()===m && ad.getFullYear()===y && a.tipo!=="Accidente Laboral"; }).length,
    };
  });

  const chartTip = { backgroundColor:'#111827', border:'1px solid #374151', borderRadius:'8px', color:'#f3f4f6', fontSize:'12px' };
  const pctEpp = workers.length ? Math.round(workers.filter(w => w.epp_recibido).length / workers.length * 100) : 0;

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-white font-semibold">Dashboard SSOMA</h2>
        <p className="text-gray-600 text-xs mt-0.5">Seguridad, Salud Ocupacional y Medio Ambiente — {anio}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label={`Accidentes ${anio}`} value={accLaborales.filter(a=>new Date(a.fecha_evento).getFullYear()===anio).length} sub={`${delMes.filter(a=>a.tipo==="Accidente Laboral").length} este mes`} accentColor="red" />
        <KpiCard label="Días perdidos" value={diasPerdidos} sub={`año ${anio}`} accentColor="amber" />
        <KpiCard label="Incidentes peligrosos" value={incPeligrosos.filter(a=>new Date(a.fecha_evento).getFullYear()===anio).length} sub={`año ${anio}`} accentColor="purple" />
        <KpiCard label="Investigaciones abiertas" value={abiertos.length} sub="pendientes de cierre" accentColor={abiertos.length > 0 ? "red" : "emerald"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-4">Tendencia — últimos 6 meses</div>
          {loadingAcc ? <div className="flex items-center justify-center h-44 text-xs text-gray-600">Cargando...</div> : (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={trendData} margin={{ top:0, right:8, left:-22, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="mes" stroke="#374151" tick={{ fill:'#6b7280', fontSize:11 }} />
                  <YAxis stroke="#374151" tick={{ fill:'#6b7280', fontSize:10 }} allowDecimals={false} />
                  <ChartTooltip contentStyle={chartTip} />
                  <Bar dataKey="Accidentes" fill="#ef4444" radius={[3,3,0,0]} maxBarSize={20} />
                  <Bar dataKey="Incidentes" fill="#f59e0b" radius={[3,3,0,0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-1 justify-center">
                <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-2.5 h-2.5 rounded-sm bg-red-500" />Accidentes</div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />Incidentes</div>
              </div>
            </>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-4">Indicadores del personal</div>
          <div className="space-y-0">
            {[
              { label:"Trabajadores activos", value: workers.filter(w=>w.estado==="Activo").length, color:"text-blue-400" },
              { label:"Con restricción médica", value: workers.filter(w=>(w.aptitud||"").toLowerCase().includes("restricc")).length, color:"text-amber-400" },
              { label:"EPP entregado", value: `${pctEpp}%`, color:"text-emerald-400" },
              { label:"Sin EMO vigente", value: workers.filter(w=>{ const v=calcularVigencia(w.ultima_emo,w.duracion_emo); return v && new Date(v)<new Date(); }).length, color:"text-red-400" },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-gray-800/60">
                <span className="text-xs text-gray-500">{item.label}</span>
                <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {abiertos.length > 0 && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-400" />Investigaciones pendientes de cierre
          </div>
          <div className="space-y-2">
            {abiertos.slice(0, 5).map(a => (
              <div key={a.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-red-900/10 border border-red-900/30 text-xs">
                <Badge color={a.gravedad==="Fatal"||a.gravedad==="Grave" ? "red" : "amber"}>{a.gravedad}</Badge>
                <span className="text-gray-300 flex-1 truncate">{a.tipo} — {a.descripcion?.substring(0,70)}</span>
                <span className="text-gray-600 shrink-0 font-mono">{a.fecha_evento}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
