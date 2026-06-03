import { useState, useEffect } from 'react';
import { fmtFecha } from '../../../lib/helpers.js';
import { supabase } from '../../../lib/supabase.js';
import { calcularVigencia } from '../../../lib/helpers.js';
import { Badge } from '../../../components/ui/Badge.jsx';
import { KpiCard } from '../../../components/ui/KpiCard.jsx';
import { Lock, Plus } from 'lucide-react';
import FatigaModulo from './Fatiga.jsx';
import PsicosocialModulo from './Psicosocial.jsx';
import DisergonomiaModulo from './Disergonomia.jsx';
import AuditivaModulo from './Auditiva.jsx';
import GestanteModulo from './Gestante.jsx';
import EstilosVidaModulo from './EstilosVida.jsx';
import RadiacionUVModulo from './RadiacionUV.jsx';
import ProteccionRespiratoriaModulo from './Respiratoria.jsx';
import DescansosMedicosModulo from './DescansosMedicos.jsx';
import MorbilidadModulo from './Morbilidad.jsx';

export default function Vigilancia({ workers, empresaId }) {
  const [tab, setTab] = useState("emos");
  const [records, setRecords] = useState([]);
  useEffect(() => { supabase.from("registros_medicos").select("*, trabajadores(nombre)").then(({ data }) => setRecords(data || [])); }, []);
  const now = new Date(); const in30 = new Date(); in30.setDate(in30.getDate() + 30);

  const grupos = [
    {
      label: "REGISTROS CLÍNICOS",
      items: [
        { id: "emos", label: "Programación EMOs" },
        { id: "descansos", label: "Descansos Médicos" },
        { id: "morbilidad", label: "Morbilidad" },
      ],
    },
    {
      label: "PROGRAMAS DE VIGILANCIA",
      items: [
        { id: "gestante", label: "Trabajadora Gestante" },
        { id: "auditiva", label: "Protección Auditiva" },
        { id: "disergonomia", label: "Disergonomía" },
        { id: "radiacion", label: "Radiación UV" },
        { id: "fatiga", label: "Fatiga y Somnolencia" },
        { id: "respiratoria", label: "Prot. Respiratoria" },
        { id: "psicosocial", label: "Psicosocial / Salud Mental" },
        { id: "estilos", label: "Estilos de Vida" },
      ],
    },
  ];


  function ProgramaPlaceholder({ config }) {
    return (
      <div>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-white font-semibold text-sm mb-1">{config.title}</h3>
            <p className="text-gray-500 text-xs max-w-xl">{config.desc}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <Badge color="amber">EN CONSTRUCCIÓN</Badge>
            <Btn size="sm" variant="primary" onClick={() => showToast("Función en desarrollo", "info")}><Plus size={13} /> Nuevo Registro</Btn>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-5">
          <KpiCard label="Bajo vigilancia" value="—" sub="Sin datos aún" accentColor="blue" />
          <KpiCard label="Evaluaciones este mes" value="—" sub="Sin datos aún" accentColor="amber" />
          <KpiCard label="Alertas activas" value="—" sub="Sin datos aún" accentColor="red" />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {config.columns.map(col => (
                  <th key={col} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={config.columns.length} className="px-4 py-12 text-center text-gray-600 text-sm">
                  Sin registros. Módulo en construcción.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Mini-sidebar de navegación interna */}
      <div className="w-52 shrink-0">
        {grupos.map(grupo => (
          <div key={grupo.label} className="mb-5">
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest px-2 mb-2">{grupo.label}</p>
            <div className="space-y-0.5">
              {grupo.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${tab === item.id ? "bg-blue-900/40 text-blue-400 font-medium" : "text-gray-500 hover:text-gray-200 hover:bg-gray-800"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Contenido principal */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-5">
          <div className="text-sm font-semibold text-white">Vigilancia Médica</div>
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-purple-900/40 text-purple-400 border border-purple-800"><Lock size={11} /> MEDICO / ADMIN</span>
        </div>

        {/* EMOs */}
        {tab === "emos" && (
          <div>
            <div className="mb-4">
              <h3 className="text-white font-semibold text-sm mb-1">Programación de EMOs</h3>
              <p className="text-gray-500 text-xs">Seguimiento de vigencia de Exámenes Médico Ocupacionales por trabajador activo.</p>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-5">
              <KpiCard label="EMOs Vigentes" value={workers.filter(w => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); return v && new Date(v) >= now && w.estado === "Activo"; }).length} sub="Trabajadores activos" accentColor="emerald" />
              <KpiCard label="Por Vencer (30 días)" value={workers.filter(w => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); return v && new Date(v) >= now && new Date(v) <= in30 && w.estado === "Activo"; }).length} sub="Requieren atención" accentColor="amber" />
              <KpiCard label="Vencidos" value={workers.filter(w => { const v = calcularVigencia(w.ultima_emo, w.duracion_emo); return v && new Date(v) < now && w.estado === "Activo"; }).length} sub="Trabajadores activos" accentColor="red" />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-800">{["Trabajador", "Última EMO", "Duración", "Vigente Hasta", "Lectura EMO", "Estado", "Aptitud"].map(h => <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody>{[...workers].filter(w => w.estado === "Activo").sort((a, b) => { const va = calcularVigencia(a.ultima_emo, a.duracion_emo) || ""; const vb = calcularVigencia(b.ultima_emo, b.duracion_emo) || ""; return va.localeCompare(vb); }).map(w => {
                  const vigencia = calcularVigencia(w.ultima_emo, w.duracion_emo);
                  const isVenc = vigencia && new Date(vigencia) < now;
                  const soonVenc = !isVenc && vigencia && new Date(vigencia) <= in30;
                  return (<tr key={w.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-medium text-white">{w.nombre}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{fmtFecha(w.ultima_emo)}</td>
                    <td className="px-4 py-3"><Badge color={w.duracion_emo === "Bianual" ? "purple" : "blue"}>{w.duracion_emo || "Anual"}</Badge></td>
                    <td className={`px-4 py-3 font-mono text-xs font-medium ${isVenc ? "text-red-400" : soonVenc ? "text-amber-400" : "text-gray-400"}`}>{vigencia || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{fmtFecha(w.lectura_emo)}</td>
                    <td className="px-4 py-3"><Badge color={isVenc ? "red" : soonVenc ? "amber" : "green"}>{isVenc ? "Vencido" : soonVenc ? "Por vencer" : "Vigente"}</Badge></td>
                    <td className="px-4 py-3"><Badge color={w.aptitud === "Apto" ? "green" : w.aptitud === "Apto con restricción" ? "amber" : "gray"}>{w.aptitud}</Badge></td>
                  </tr>);
                })}</tbody>
              </table>
            </div>
          </div>
        )}

        {/* Descansos Médicos */}
        {tab === "descansos" && <DescansosMedicosModulo workers={workers} empresaId={empresaId} />}

        {/* Morbilidad */}
        {tab === "morbilidad" && <MorbilidadModulo workers={workers} empresaId={empresaId} />}

        {/* Módulos completos */}
        {tab === "psicosocial" && <PsicosocialModulo workers={workers} empresaId={empresaId} />}
        {tab === "disergonomia" && <DisergonomiaModulo workers={workers} empresaId={empresaId} />}
        {tab === "auditiva" && <AuditivaModulo workers={workers} empresaId={empresaId} />}
        {tab === "gestante" && <GestanteModulo workers={workers} empresaId={empresaId} />}
        {tab === "fatiga" && <FatigaModulo workers={workers} empresaId={empresaId} />}
        {tab === "estilos" && <EstilosVidaModulo workers={workers} empresaId={empresaId} />}
        {tab === "radiacion" && <RadiacionUVModulo workers={workers} empresaId={empresaId} />}
        {tab === "respiratoria" && <ProteccionRespiratoriaModulo workers={workers} empresaId={empresaId} />}
      </div>
    </div>
  );
}
