import { useState } from 'react';
import SeguimientoPanel from './SeguimientoPanel.jsx';
import CronogramaActividades from './CronogramaActividades.jsx';

// Vista de un programa de vigilancia personalizado (creado por la empresa).
export default function CustomProgramaView({ programa, empresaId, workers = [] }) {
  const [subtab, setSubtab] = useState("controles");
  if (!programa) return <div className="text-gray-600 text-sm py-10 text-center">Programa no encontrado.</div>;
  const slug = `custom:${programa.id}`;
  const cats = (programa.actividades && programa.actividades.length) ? programa.actividades : undefined;

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-white font-semibold text-sm mb-1">{programa.nombre}</h3>
        {programa.descripcion && <p className="text-gray-500 text-xs max-w-xl">{programa.descripcion}</p>}
      </div>
      <div className="flex gap-1.5 bg-gray-900/60 border border-gray-800 rounded-lg p-1 mb-5 w-fit flex-wrap">
        {[["controles", "Controles"], ["cronograma", "Cronograma de Actividades"]].map(([k, l]) => (
          <button key={k} onClick={() => setSubtab(k)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${subtab === k ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-200"}`}>{l}</button>
        ))}
      </div>
      {subtab === "controles" && <SeguimientoPanel programa={slug} empresaId={empresaId} workers={workers} />}
      {subtab === "cronograma" && <CronogramaActividades programa={slug} empresaId={empresaId} workers={workers} categorias={cats} />}
    </div>
  );
}
