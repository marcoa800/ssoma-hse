// ════════════════════════════════════════════════════════════════════
//  INSPECCIONES COMINDUSTRIA — Registro central
//  Reutiliza el motor InspeccionesHGP con constantes propias.
// ════════════════════════════════════════════════════════════════════

import { PLANTILLAS_COMIND_LOTE1, CATALOGO_COMIND_LOTE1 } from './inspecciones-comind-lote1.js';

export const EMPRESA_COMIND = {
  nombre: "COMINDUSTRIA",
  proyecto: "",
  logo: "/logo.jpg",   // cambiar cuando haya logo propio de Comindustria
};

export const PLANTILLAS_COMIND = {
  ...PLANTILLAS_COMIND_LOTE1,
};

export const CATALOGO_COMIND = [
  ...CATALOGO_COMIND_LOTE1,
];

export function getPlantillaComind(codigo) {
  return PLANTILLAS_COMIND[codigo] || null;
}
