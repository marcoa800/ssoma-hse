// ════════════════════════════════════════════════════════════════════
//  Scoring de cumplimiento del contratista (a partir de sus tareas).
//  Fuente única de verdad en el frontend; refleja la RPC contratista_scoring.
// ════════════════════════════════════════════════════════════════════
export const TAREA_ESTADOS = ["Pendiente", "En revisión", "Cerrada", "Rechazada"];
export const TAREA_COLOR = {
  "Pendiente":   "bg-gray-800 border-gray-700 text-gray-300",
  "En revisión": "bg-blue-900/30 border-blue-800 text-blue-400",
  "Cerrada":     "bg-green-900/30 border-green-800 text-green-400",
  "Rechazada":   "bg-red-900/30 border-red-800 text-red-400",
};

const hoyISO = () => new Date().toISOString().slice(0, 10);

// exigible = cerradas + (pendientes/rechazadas ya vencidas). Lo no vencido no penaliza.
export function scoringTareas(tareas = []) {
  const hoy = hoyISO();
  const cerradas   = tareas.filter(t => t.estado === "Cerrada").length;
  const vencidas   = tareas.filter(t => ["Pendiente", "Rechazada"].includes(t.estado) && t.fecha_limite && t.fecha_limite < hoy).length;
  const base = cerradas + vencidas;
  return {
    score: base === 0 ? null : Math.round((100 * cerradas) / base),
    total: tareas.length,
    cerradas, vencidas,
    pendientes: tareas.filter(t => t.estado === "Pendiente").length,
    enRevision: tareas.filter(t => t.estado === "En revisión").length,
    rechazadas: tareas.filter(t => t.estado === "Rechazada").length,
  };
}

export function scoreColor(score) {
  if (score == null) return { txt: "text-gray-500", box: "border-gray-700 bg-gray-800/50" };
  if (score >= 90)   return { txt: "text-green-400", box: "border-green-800 bg-green-900/20" };
  if (score >= 70)   return { txt: "text-amber-400", box: "border-amber-800 bg-amber-900/20" };
  return { txt: "text-red-400", box: "border-red-800 bg-red-900/20" };
}

// Badge minimalista para la cabecera del contratista
export function ScoreBadge({ tareas, s: sIn, className = "" }) {
  const s = sIn || scoringTareas(tareas || []);
  const c = scoreColor(s.score);
  const title = `Cumplimiento de tareas · ${s.cerradas} cerradas, ${s.vencidas} vencidas, ${s.pendientes} pendientes, ${s.enRevision} en revisión`;
  return (
    <span title={title} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-semibold ${c.box} ${c.txt} ${className}`}>
      ★ {s.score == null ? "s/d" : `${s.score}%`}
    </span>
  );
}
