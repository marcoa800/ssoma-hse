// ════════════════════════════════════════════════════════════════════
//  Sedes válidas por empresa (lista fija para el portal de exámenes).
//  Origen: reportes RRHH (ECP / FUP) al 31.05.2026, excluyendo sedes
//  erróneas (San Pedrito, Lima, Arequipa 3 Real Plaza).
//  El trabajador elige su sede de esta lista al registrarse (ortografía exacta).
// ════════════════════════════════════════════════════════════════════

const SEDES_EXPERTOS = [
  "JV 7 MEGAPLAZA",
  "JV AREQUIPA 1 (CC AREQUIPA CENTER)",
  "JV AREQUIPA 2 (CC MALL AVENTURA PLAZA)",
  "JV AREQUIPA 3 (CC MALL PLAZA CAYMA)",
  "JV CALLAO 1 (CC MALL PLAZA BELLAVISTA)",
  "JV CHICLAYO 1 (REAL PLAZA)",
  "JV CUSCO 1 (REAL PLAZA CUSCO)",
  "JV ICA 1 (MEGA PLAZA)",
  "JV LIMA 2 (LARCOMAR)",
  "JV LIMA 3 (CC REAL PLAZA CENTRO CIVICO)",
  "JV LIMA 4 (CC JOCKEY PLAZA)",
  "JV LIMA 8 (CC REAL PLAZA SALAVERRY)",
  "JV LIMA 11 (UNIVERSIDAD CATÓLICA DEL PERÚ)",
  "JV LIMA 12 (HOTEL ESTELAR)",
  "JV LIMA 13 (CC CENCO LA MOLINA)",
  "JV LIMA 14 (UNIVERSIDAD CATOLICA DEL PERU)",
  "JV LIMA 15 (KENNEDY MIRAFLORES)",
  "JV LIMA 16 (AV. EJERCITO)",
  "JV LIMA 17 (PARDO 200)",
  "JV LIMA 18 (PARDO 200-ISLA)",
  "JV LIMA 19 (RICARDO PALMA)",
  "JV LIMA 20 (PURUCHUCO)",
  "JV PIURA 2 (REAL PLAZA)",
  "JV TRUJILLO 1 ( CC MALLPLAZA TRUJILLO)",
  "LA MAR",
  "MEGA CENTRO",
];

const SEDES_FRANQUICIAS = [
  "AREQUIPA 1 (CC AREQUIPA CENTER)",
  "AREQUIPA 2 (CC MALL AVENTURA PLAZA)",
  "AREQUIPA 4 (CC MALLPLAZA AREQUIPA)",
  "AREQUIPA 5 (CC REAL PLAZA)",
  "CALLAO 1 (CC AV PLAZA BELLAVISTA)",
  "CALLAO 2 (CC MINKA)",
  "CHICLAYO 1 (CC REAL PLAZA CHICLAYO)",
  "CHICLAYO 2 (CC MALL AVENTURA)",
  "CHIMBOTE 1 (CC MEGA PLAZA CHIMBOTE)",
  "CUSCO 1 (REAL PLAZA CUSCO)",
  "ICA 1 (CC MEGAPLAZA ICA)",
  "LA MAR",
  "LIMA 1 (CC AV PLAZA SANTA ANITA)",
  "LIMA 3 (CC REAL PLAZA CENTRO CIVICO)",
  "LIMA 7 (CC MEGA PLAZA)",
  "LIMA 8 (CC REAL PLAZA SALAVERRY)",
  "LIMA 10 (CC PLAZA NORTE 2)",
  "LIMA 12 (CC MALL DEL SUR)",
  "LIMA 13 (CC MEGA PLAZA 2)",
  "LIMA 14 (CC SANTA CLARA)",
  "LIMA 15 (CC REAL PLAZA PURUCHUCO)",
  "LIMA 16 (CC MALL PLAZA COMAS)",
  "LIMA 17 (PUCP)",
  "LIMA 18 (MALL AVENTURA SJL)",
  "LIMA 19 (PARQUE KENNEDY)",
  "MEGACENTRO",
  "TRUJILLO 1 (MALLPLAZA TRUJILLO)",
];

// Devuelve la lista fija de sedes para una empresa, o null si no aplica.
export function sedesDeEmpresa(nombre) {
  const n = (nombre || "").toLowerCase();
  if (n.includes("expertos en cafe") || n.includes("expertos en café")) return SEDES_EXPERTOS;
  if (n.includes("franquicias unidas")) return SEDES_FRANQUICIAS;
  return null;
}
