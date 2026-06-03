// ════════════════════════════════════════════════════════════════════
//  InspeccionesComind — Wrapper de InspeccionesHGP para Comindustria
//  Reutiliza el motor completo con constantes y catálogo de Comindustria.
// ════════════════════════════════════════════════════════════════════
import InspeccionesHGP from './InspeccionesHGP.jsx';
import { EMPRESA_COMIND, CATALOGO_COMIND } from '../../constants/inspecciones-comind.js';

// Las filasPreset del RE-15 (extintores) y RE-16 (emergencias) necesitan
// inicializarse correctamente en el motor. El motor usa filaVacia() para
// filasIniciales > 0, pero para preset usamos filasPreset directamente.
// Se inyectan en las constantes via el campo "filasPreset" que el motor
// ya soporta (ver lógica de initFilas en FormularioActivos).

export default function InspeccionesComind({ empresaId }) {
  return (
    <InspeccionesHGP
      empresaId={empresaId}
      empresaInfo={EMPRESA_COMIND}
      catalogo={CATALOGO_COMIND}
    />
  );
}
