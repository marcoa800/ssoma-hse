import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { fmtFecha, estadoControl } from '../../../lib/helpers.js';
import { Badge } from '../../../components/ui/Badge.jsx';
import { KpiCard } from '../../../components/ui/KpiCard.jsx';
import { AlertTriangle, CheckCircle } from 'lucide-react';

// Programas fijos con su tabla y etiqueta (su evaluación principal lleva proximo_control)
const PROGRAMAS = [
  { slug: "fatiga", table: "vigilancia_fatiga", label: "Fatiga y Somnolencia" },
  { slug: "auditiva", table: "vigilancia_auditiva", label: "Protección Auditiva" },
  { slug: "disergonomia", table: "vigilancia_disergonomia", label: "Disergonomía" },
  { slug: "radiacion", table: "vigilancia_radiacion", label: "Radiación UV" },
  { slug: "respiratoria", table: "vigilancia_respiratoria", label: "Prot. Respiratoria" },
  { slug: "psicosocial", table: "vigilancia_psicosocial", label: "Psicosocial / Salud Mental" },
  { slug: "estilos", table: "vigilancia_estilos_vida", label: "Estilos de Vida" },
  { slug: "gestante", table: "vigilancia_gestante", label: "Trabajadora Gestante" },
];

export default function PendientesPanel({ empresaId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!empresaId) return;
    (async () => {
      setLoading(true);
      const out = [];
      // Evaluaciones principales de cada programa
      await Promise.all(PROGRAMAS.map(async (p) => {
        const { data } = await supabase.from(p.table).select("id, trabajador_id, proximo_control, trabajadores(nombre)")
          .eq("empresa_id", empresaId).not("proximo_control", "is", null);
        (data || []).forEach(r => out.push({ id: `${p.slug}-${r.id}`, programa: p.label, nombre: r.trabajadores?.nombre || "—", proximo_control: r.proximo_control, origen: "Evaluación" }));
      }));
      // Controles de seguimiento (todos los programas, fijos y personalizados)
      const { data: seg } = await supabase.from("vigilancia_seguimiento").select("id, programa, proximo_control, trabajadores(nombre)")
        .eq("empresa_id", empresaId).eq("tipo", "Control").not("proximo_control", "is", null);
      const labelOf = (slug) => PROGRAMAS.find(p => p.slug === slug)?.label || (slug?.startsWith("custom:") ? "Programa personalizado" : slug);
      (seg || []).forEach(r => out.push({ id: `seg-${r.id}`, programa: labelOf(r.programa), nombre: r.trabajadores?.nombre || "—", proximo_control: r.proximo_control, origen: "Control" }));
      // Solo por vencer + vencidos, ordenados por fecha
      const pend = out.map(r => ({ ...r, est: estadoControl(r.proximo_control) }))
        .filter(r => r.est && r.est.label !== "Vigente")
        .sort((a, b) => (a.proximo_control || "").localeCompare(b.proximo_control || ""));
      setRows(pend);
      setLoading(false);
    })();
  }, [empresaId]);

  const vencidos = rows.filter(r => r.est.label === "Vencido");
  const porVencer = rows.filter(r => r.est.label === "Por vencer");

  return (
    <div>
      <div className="mb-5">
        <h3 className="text-white font-semibold text-sm mb-1">Pendientes de Control</h3>
        <p className="text-gray-500 text-xs max-w-xl">Controles y evaluaciones de todos los programas de vigilancia que están por vencer o ya vencidos.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <KpiCard label="Vencidos" value={vencidos.length} sub="requieren acción" accentColor="red" />
        <KpiCard label="Por vencer (≤15 días)" value={porVencer.length} sub="programar pronto" accentColor="amber" />
      </div>

      {loading ? (
        <div className="text-center text-gray-600 text-sm py-10">Cargando...</div>
      ) : !rows.length ? (
        <div className="bg-emerald-900/15 border border-emerald-900/40 rounded-xl p-4 flex items-center gap-2.5">
          <CheckCircle size={16} className="text-emerald-400 shrink-0" />
          <span className="text-sm text-emerald-200">Sin controles vencidos ni por vencer. Todo al día. ✔</span>
        </div>
      ) : (
        <>
          {/* Móvil */}
          <div className="md:hidden space-y-2.5">
            {rows.map(r => (
              <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3.5">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="font-semibold text-white text-sm">{r.nombre}</div>
                  <Badge color={r.est.color}>{r.est.label}</Badge>
                </div>
                <div className="text-xs text-gray-400">{r.programa} <span className="text-gray-600">· {r.origen}</span></div>
                <div className="text-xs text-gray-500 mt-0.5">Vence: <span className="font-mono">{fmtFecha(r.proximo_control)}</span> ({Math.abs(r.est.dias)} día{Math.abs(r.est.dias) === 1 ? "" : "s"} {r.est.dias < 0 ? "vencido" : "restantes"})</div>
              </div>
            ))}
          </div>
          {/* Escritorio */}
          <div className="hidden md:block bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-800">{["Trabajador", "Programa", "Origen", "Próximo control", "Estado", "Días"].map(h => <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{r.nombre}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{r.programa}</td>
                      <td className="px-4 py-3"><Badge color={r.origen === "Control" ? "blue" : "gray"}>{r.origen}</Badge></td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">{fmtFecha(r.proximo_control)}</td>
                      <td className="px-4 py-3"><Badge color={r.est.color}>{r.est.label}</Badge></td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{r.est.dias < 0 ? `${Math.abs(r.est.dias)} vencido` : `${r.est.dias} restantes`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
