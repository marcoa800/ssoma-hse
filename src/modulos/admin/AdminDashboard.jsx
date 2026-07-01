import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ChartTooltip } from 'recharts';
import { supabase } from '../../lib/supabase.js';
import { fmtFecha } from '../../lib/helpers.js';
import { Badge } from '../../components/ui/Badge.jsx';
import { KpiCard } from '../../components/ui/KpiCard.jsx';
import { Users, HeartPulse, CalendarClock, CheckCircle } from 'lucide-react';

// Dashboard del perfil Administrativo — enfocado en Personal y Descansos Médicos
export default function AdminDashboard({ workers = [], empresaId }) {
  const [descansos, setDescansos] = useState([]);

  useEffect(() => {
    if (!empresaId) return;
    supabase.from("vigilancia_descansos")
      .select("*, trabajadores(nombre)")
      .eq("empresa_id", empresaId)
      .order("fecha_inicio", { ascending: false })
      .then(({ data }) => setDescansos(data || []));
  }, [empresaId]);

  // ── Personal ──
  const total = workers.length;
  const activos = workers.filter(w => w.estado === "Activo").length;
  const cesados = workers.filter(w => w.estado === "Cesado").length;
  const estadoCount = (e) => workers.filter(w => (w.estado || "Activo") === e).length;
  const estadoData = [
    { name: "Activo", value: estadoCount("Activo"), color: "#10b981" },
    { name: "Vacaciones", value: estadoCount("Vacaciones"), color: "#3b82f6" },
    { name: "Inactivo", value: estadoCount("Inactivo"), color: "#6b7280" },
    { name: "Cesado", value: cesados, color: "#ef4444" },
  ].filter(d => d.value > 0);

  // ── Descansos médicos ──
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const estadoDescanso = (r) => {
    const fin = new Date(r.fecha_fin + "T00:00:00");
    const en7 = new Date(today); en7.setDate(en7.getDate() + 7);
    if (fin < today) return "Vencido";
    if (fin <= en7) return "Próximo a vencer";
    return "Activo";
  };
  const diasDescanso = (r) => {
    const ini = new Date(r.fecha_inicio + "T00:00:00");
    const fin = new Date(r.fecha_fin + "T00:00:00");
    return Math.max(1, Math.round((fin - ini) / 86400000) + 1);
  };
  const now = new Date();
  const activosDesc = descansos.filter(r => estadoDescanso(r) === "Activo");
  const proximosDesc = descansos.filter(r => estadoDescanso(r) === "Próximo a vencer");
  const mesDesc = descansos.filter(r => { const i = new Date(r.fecha_inicio + "T00:00:00"); return i.getMonth() === now.getMonth() && i.getFullYear() === now.getFullYear(); });
  const diasMes = mesDesc.reduce((a, r) => a + diasDescanso(r), 0);

  const atencionData = [
    { name: "EsSalud", value: descansos.filter(r => r.atencion === "EsSalud").length, color: "#3b82f6" },
    { name: "Particular", value: descansos.filter(r => r.atencion === "Particular").length, color: "#a855f7" },
    { name: "Sin especificar", value: descansos.filter(r => !r.atencion).length, color: "#6b7280" },
  ].filter(d => d.value > 0);

  const badgeEstado = (e) => e === "Activo" ? "green" : e === "Vencido" ? "red" : "amber";
  const chartTip = { backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#f3f4f6', fontSize: '12px' };

  const Donut = ({ data, size = 150 }) => (
    <div className="flex items-center gap-4">
      <div style={{ width: size, height: size, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={size * 0.28} outerRadius={size * 0.46} dataKey="value" paddingAngle={2} startAngle={90} endAngle={-270}>
              {data.map((e, i) => <Cell key={i} fill={e.color} strokeWidth={0} />)}
            </Pie>
            <ChartTooltip contentStyle={chartTip} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2.5 flex-1">
        {data.map(e => (
          <div key={e.name} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
            <span className="text-xs text-gray-400 flex-1">{e.name}</span>
            <span className="text-sm font-bold text-white">{e.value}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Personal Activo" value={activos} sub={`de ${total} registrados`} accentColor="blue" />
        <KpiCard label="Cesados" value={cesados} sub="dados de baja" accentColor="gray" />
        <KpiCard label="Descansos Activos" value={activosDesc.length} sub="con reposo vigente hoy" accentColor="red" />
        <KpiCard label="Días de Descanso (mes)" value={diasMes} sub={`en ${mesDesc.length} descanso${mesDesc.length !== 1 ? "s" : ""} del mes`} accentColor="amber" />
      </div>

      {/* ── Gráficos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-4">Personal por Estado</div>
          {estadoData.length > 0 ? <Donut data={estadoData} /> : <div className="flex items-center justify-center h-32 text-xs text-gray-600">Sin personal registrado</div>}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-4">Descansos por Tipo de Atención</div>
          {atencionData.length > 0 ? <Donut data={atencionData} /> : <div className="flex items-center justify-center h-32 text-xs text-gray-600">Sin descansos registrados</div>}
        </div>
      </div>

      {/* ── Próximos a vencer ── */}
      {proximosDesc.length > 0 && (
        <div className="bg-gray-900 border border-amber-900/50 rounded-xl p-4 mb-4">
          <div className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            <CalendarClock size={15} className="text-amber-400" /> Descansos próximos a vencer
            <span className="text-[11px] font-normal text-gray-500">— vencen en ≤7 días</span>
          </div>
          <div className="space-y-2">
            {proximosDesc.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-amber-900/15 border border-amber-900/40 text-sm flex-wrap">
                <span className="text-white font-medium flex-1 min-w-0 truncate">{r.trabajadores?.nombre || "—"} <span className="text-gray-500 font-mono text-xs">({r.dni || "s/DNI"})</span></span>
                <span className="text-gray-400 text-xs whitespace-nowrap">{fmtFecha(r.fecha_inicio)} → {fmtFecha(r.fecha_fin)}</span>
                <Badge color="amber">Vence {fmtFecha(r.fecha_fin)}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Últimos descansos ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><HeartPulse size={15} className="text-rose-400" /> Últimos descansos médicos</div>
        {descansos.length > 0 ? (
          <div className="space-y-2">
            {descansos.slice(0, 8).map(r => {
              const est = estadoDescanso(r);
              return (
                <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-800/40 border border-gray-800 text-sm flex-wrap">
                  <span className="text-white font-medium flex-1 min-w-0 truncate">{r.trabajadores?.nombre || "—"}</span>
                  <span className="text-gray-500 font-mono text-xs whitespace-nowrap">{fmtFecha(r.fecha_inicio)} → {fmtFecha(r.fecha_fin)}</span>
                  <Badge color="gray">{diasDescanso(r)} día{diasDescanso(r) === 1 ? "" : "s"}</Badge>
                  {r.atencion && <Badge color={r.atencion === "Particular" ? "purple" : "blue"}>{r.atencion}</Badge>}
                  <Badge color={badgeEstado(est)}>{est}</Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 text-sm text-gray-500 py-2"><CheckCircle size={15} className="text-emerald-400" /> No hay descansos médicos registrados.</div>
        )}
      </div>
    </div>
  );
}
