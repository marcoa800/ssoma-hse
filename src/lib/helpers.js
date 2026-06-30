const THEME_CSS = {
  obsidian: "",
  slate:
    ".t-slate.bg-gray-950,.t-slate .bg-gray-950{background-color:#020c18!important}" +
    ".t-slate.bg-gray-900,.t-slate .bg-gray-900{background-color:#091627!important}" +
    ".t-slate.bg-gray-800,.t-slate .bg-gray-800{background-color:#12253e!important}" +
    ".t-slate.border-gray-800,.t-slate .border-gray-800{border-color:#193255!important}" +
    ".t-slate.border-gray-700,.t-slate .border-gray-700{border-color:#244070!important}",
  violet:
    ".t-violet.bg-gray-950,.t-violet .bg-gray-950{background-color:#06030f!important}" +
    ".t-violet.bg-gray-900,.t-violet .bg-gray-900{background-color:#0e091e!important}" +
    ".t-violet.bg-gray-800,.t-violet .bg-gray-800{background-color:#170f36!important}" +
    ".t-violet.border-gray-800,.t-violet .border-gray-800{border-color:#22154c!important}" +
    ".t-violet.border-gray-700,.t-violet .border-gray-700{border-color:#2f1e65!important}",
  forest:
    ".t-forest.bg-gray-950,.t-forest .bg-gray-950{background-color:#020e05!important}" +
    ".t-forest.bg-gray-900,.t-forest .bg-gray-900{background-color:#071a0d!important}" +
    ".t-forest.bg-gray-800,.t-forest .bg-gray-800{background-color:#0c2918!important}" +
    ".t-forest.border-gray-800,.t-forest .border-gray-800{border-color:#0e3218!important}" +
    ".t-forest.border-gray-700,.t-forest .border-gray-700{border-color:#164825!important}",
  rose:
    ".t-rose.bg-gray-950,.t-rose .bg-gray-950{background-color:#0f0306!important}" +
    ".t-rose.bg-gray-900,.t-rose .bg-gray-900{background-color:#1a060b!important}" +
    ".t-rose.bg-gray-800,.t-rose .bg-gray-800{background-color:#250910!important}" +
    ".t-rose.border-gray-800,.t-rose .border-gray-800{border-color:#330c16!important}" +
    ".t-rose.border-gray-700,.t-rose .border-gray-700{border-color:#45141f!important}",
  blanco:
    ".t-blanco{color:#0f172a!important}" +
    ".t-blanco.text-white{color:#0f172a!important}" +
    ".t-blanco.bg-gray-950,.t-blanco .bg-gray-950{background-color:#f8fafc!important}" +
    ".t-blanco.bg-gray-900,.t-blanco .bg-gray-900{background-color:#f1f5f9!important}" +
    ".t-blanco.bg-gray-800,.t-blanco .bg-gray-800{background-color:#e2e8f0!important}" +
    ".t-blanco [class*='bg-gray-950/']{background-color:rgba(248,250,252,0.95)!important}" +
    ".t-blanco [class*='bg-gray-900/']{background-color:rgba(241,245,249,0.85)!important}" +
    ".t-blanco [class*='bg-gray-800/']{background-color:rgba(226,232,240,0.75)!important}" +
    ".t-blanco [class*='bg-blue-900/']{background-color:rgba(219,234,254,0.9)!important}" +
    ".t-blanco [class*='bg-amber-900/']{background-color:rgba(254,243,199,0.9)!important}" +
    ".t-blanco [class*='bg-orange-900/']{background-color:rgba(255,237,213,0.9)!important}" +
    ".t-blanco [class*='bg-purple-900/']{background-color:rgba(237,233,254,0.9)!important}" +
    ".t-blanco [class*='bg-emerald-900/']{background-color:rgba(209,250,229,0.9)!important}" +
    ".t-blanco [class*='bg-red-900/']{background-color:rgba(254,226,226,0.9)!important}" +
    ".t-blanco [class*='bg-green-900/']{background-color:rgba(220,252,231,0.9)!important}" +
    ".t-blanco [class*='bg-rose-900/']{background-color:rgba(255,228,230,0.9)!important}" +
    ".t-blanco.border-gray-800,.t-blanco .border-gray-800{border-color:#cbd5e1!important}" +
    ".t-blanco.border-gray-700,.t-blanco .border-gray-700{border-color:#94a3b8!important}" +
    ".t-blanco .text-white{color:#0f172a!important}" +
    ".t-blanco .text-gray-50{color:#0f172a!important}" +
    ".t-blanco .text-gray-100{color:#1e293b!important}" +
    ".t-blanco .text-gray-200{color:#1e293b!important}" +
    ".t-blanco .text-gray-300{color:#334155!important}" +
    ".t-blanco .text-gray-400{color:#475569!important}" +
    ".t-blanco .text-gray-500{color:#64748b!important}" +
    ".t-blanco .text-gray-600{color:#64748b!important}" +
    ".t-blanco .text-gray-700{color:#475569!important}" +
    ".t-blanco .hover\\:text-white:hover{color:#0f172a!important}" +
    ".t-blanco .hover\\:text-gray-200:hover{color:#1e293b!important}" +
    ".t-blanco .hover\\:text-gray-300:hover{color:#334155!important}" +
    ".t-blanco .hover\\:text-red-400:hover{color:#dc2626!important}" +
    ".t-blanco .hover\\:text-blue-400:hover{color:#1d4ed8!important}" +
    ".t-blanco .text-blue-400{color:#1d4ed8!important}" +
    ".t-blanco .text-blue-500{color:#1d4ed8!important}" +
    ".t-blanco .text-blue-300{color:#1d4ed8!important}" +
    ".t-blanco .text-amber-300{color:#b45309!important}" +
    ".t-blanco .text-emerald-300{color:#047857!important}" +
    ".t-blanco .text-red-300{color:#b91c1c!important}" +
    ".t-blanco .text-orange-300{color:#c2410c!important}" +
    ".t-blanco .text-purple-300{color:#7e22ce!important}" +
    ".t-blanco .text-cyan-300{color:#0e7490!important}" +
    ".t-blanco .text-green-300{color:#15803d!important}" +
    ".t-blanco .text-amber-400{color:#b45309!important}" +
    ".t-blanco .text-amber-500{color:#92400e!important}" +
    ".t-blanco .text-orange-400{color:#c2410c!important}" +
    ".t-blanco .text-orange-500{color:#9a3412!important}" +
    ".t-blanco .text-emerald-400{color:#047857!important}" +
    ".t-blanco .text-emerald-500{color:#065f46!important}" +
    ".t-blanco .text-red-400{color:#dc2626!important}" +
    ".t-blanco .text-red-500{color:#b91c1c!important}" +
    ".t-blanco .text-rose-400{color:#e11d48!important}" +
    ".t-blanco .text-purple-400{color:#7c3aed!important}" +
    ".t-blanco .text-purple-500{color:#6d28d9!important}" +
    ".t-blanco .text-cyan-400{color:#0891b2!important}" +
    ".t-blanco .text-teal-400{color:#0d9488!important}" +
    ".t-blanco .text-green-400{color:#16a34a!important}" +
    ".t-blanco .text-yellow-400{color:#ca8a04!important}" +
    ".t-blanco ::placeholder,.t-blanco .placeholder-gray-600::placeholder{color:#94a3b8!important}" +
    ".t-blanco .bg-blue-600{color:#fff!important}" +
    ".t-blanco .bg-blue-500{color:#fff!important}" +
    ".t-blanco .bg-amber-600{color:#fff!important}" +
    ".t-blanco .bg-amber-500{color:#fff!important}" +
    ".t-blanco .bg-emerald-600{color:#fff!important}" +
    ".t-blanco .bg-emerald-500{color:#fff!important}" +
    ".t-blanco .bg-red-600{color:#fff!important}" +
    ".t-blanco .bg-red-500{color:#fff!important}" +
    ".t-blanco .bg-orange-600{color:#fff!important}" +
    ".t-blanco .bg-blue-600 .text-white,.t-blanco .bg-blue-600.text-white{color:#fff!important}" +
    ".t-blanco .bg-amber-600 .text-white,.t-blanco .bg-amber-600.text-white{color:#fff!important}" +
    ".t-blanco .bg-emerald-600 .text-white,.t-blanco .bg-emerald-600.text-white{color:#fff!important}" +
    ".t-blanco .bg-red-600 .text-white,.t-blanco .bg-red-600.text-white{color:#fff!important}" +
    ".t-blanco .hover\\:bg-gray-800:hover{background-color:#cbd5e1!important}" +
    ".t-blanco .hover\\:bg-gray-900:hover{background-color:#e2e8f0!important}" +
    ".t-blanco .hover\\:bg-gray-700:hover{background-color:#e2e8f0!important}" +
    ".t-blanco .hover\\:bg-red-900:hover{background-color:rgba(254,202,202,1)!important}",
};

export function applyThemeCSS(id) {
  let el = document.getElementById("ssoma-theme-css");
  if (!el) { el = document.createElement("style"); el.id = "ssoma-theme-css"; document.head.appendChild(el); }
  el.textContent = THEME_CSS[id] || "";
}

export function calcularEdad(fechaNac) {
  if (!fechaNac) return null;
  const hoy = new Date(); const nac = new Date(fechaNac);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

export function calcularVigencia(ultimaEmo, duracion) {
  if (!ultimaEmo || !duracion) return null;
  const fecha = new Date(ultimaEmo);
  if (duracion === "Anual") fecha.setFullYear(fecha.getFullYear() + 1);
  else if (duracion === "Bianual") fecha.setFullYear(fecha.getFullYear() + 2);
  return fecha.toISOString().split("T")[0];
}

// Formatea una fecha ISO (YYYY-MM-DD) a DD/MM/AA para mostrar en la UI.
// Acepta null/undefined → retorna "—".
export function fmtFecha(val) {
  if (!val) return "—";
  const s = String(val).trim();
  // YYYY-MM-DD
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1].slice(2)}`;
  return s; // si ya está en otro formato, lo devuelve tal cual
}

// Meses en texto (es/en abreviados) → número
const MESES_TXT = { ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12 };

// Convierte una celda de fecha a ISO (YYYY-MM-DD) detectando el formato:
// año/mes/día en cualquier posición, serial de Excel, objeto Date y mes en texto.
export function excelDateToISO(val) {
  if (val === null || val === undefined || val === "") return null;

  // 1) Objeto Date (cuando se lee con cellDates:true)
  if (val instanceof Date) {
    if (isNaN(val)) return null;
    return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, "0")}-${String(val.getDate()).padStart(2, "0")}`;
  }

  // 2) Serial de Excel (número o cadena puramente numérica, rango ~1927–2064)
  const sRaw = String(val).trim();
  if (/^\d+(\.\d+)?$/.test(sRaw)) {
    const n = Number(sRaw);
    if (n >= 10000 && n <= 60000) {
      const date = new Date(Math.round((n - 25569) * 86400 * 1000));
      if (!isNaN(date)) return date.toISOString().split("T")[0];
    }
  }

  // 3) Cadena con separadores. Quitar solo la hora si viene (no los espacios separadores).
  let s = sRaw.replace(/[T ]+\d{1,2}:\d{2}(:\d{2})?.*$/, "").trim();

  // 3a) Mes en texto: "01-ene-2026", "1 ENE 2026", etc.
  const lower = s.toLowerCase();
  for (const [txt, mnum] of Object.entries(MESES_TXT)) {
    if (lower.includes(txt)) {
      const nums = s.match(/\d+/g) || [];
      let y = nums.find(p => p.length === 4), d = nums.find(p => p.length <= 2);
      if (y) return `${y}-${String(mnum).padStart(2, "0")}-${String(parseInt(d || "1", 10)).padStart(2, "0")}`;
    }
  }

  // 3b) Numérico con / - . o espacio
  const parts = s.split(/[\/.\- ]/).map(p => p.trim()).filter(Boolean);
  if (parts.length !== 3) return null;
  const nums = parts.map(p => parseInt(p, 10));
  if (nums.some(isNaN)) return null;

  // Detectar el AÑO: parte de 4 dígitos, o un valor >31 (año 2 dígitos al inicio/fin)
  let yi = parts.findIndex(p => p.length === 4);
  if (yi < 0) yi = nums.findIndex(n => n > 31);
  if (yi < 0) yi = 2; // ninguno claro → asumir año al final (formato D/M/A de Perú)

  const [i1, i2] = [0, 1, 2].filter(i => i !== yi);
  let dia, mes;
  if (yi === 0) { mes = nums[i1]; dia = nums[i2]; }   // Año primero → A/M/D
  else          { dia = nums[i1]; mes = nums[i2]; }   // Año al final/medio → D/M/A
  // Desambiguar con la regla "valor > 12 es el día"
  if (mes > 12 && dia <= 12) { const t = mes; mes = dia; dia = t; }

  let year = nums[yi];
  if (String(year).length <= 2) year = 2000 + year;
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return `${year}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

// ── Periodicidad de controles de vigilancia ──
export const PERIODICIDADES = ["Único", "Semanal", "Quincenal", "Mensual", "Trimestral", "Semestral", "Anual"];

// Calcula la fecha del próximo control según la periodicidad
export function proximoControl(fechaISO, periodicidad) {
  if (!fechaISO || !periodicidad || periodicidad === "Único") return null;
  const d = new Date(fechaISO + "T00:00:00");
  if (isNaN(d)) return null;
  const map = { Semanal: [0, 7], Quincenal: [0, 15], Mensual: [1, 0], Trimestral: [3, 0], Semestral: [6, 0], Anual: [12, 0] };
  const add = map[periodicidad];
  if (!add) return null;
  d.setMonth(d.getMonth() + add[0]);
  d.setDate(d.getDate() + add[1]);
  return d.toISOString().split("T")[0];
}

// Estado de un control según su próxima fecha
export function estadoControl(proximoISO) {
  if (!proximoISO) return null;
  const hoy = new Date(new Date().toISOString().split("T")[0] + "T00:00:00");
  const prox = new Date(proximoISO + "T00:00:00");
  const dias = Math.round((prox - hoy) / 86400000);
  if (dias < 0) return { label: "Vencido", color: "red", dias };
  if (dias <= 15) return { label: "Por vencer", color: "amber", dias };
  return { label: "Vigente", color: "green", dias };
}

// ── Branding por empresa (logo + marca) para portales/PDF ──
export function brandingEmpresa(nombre) {
  const n = (nombre || "").toLowerCase();
  // Franquicias Unidas opera bajo la marca "Gelarti"
  if (n.includes("franquicias unidas"))
    return { marca: "Gelarti", logo: "/logo-gelarti.png", footer: "Gelarti  ·  Sistema Medicloud Safety" };
  // Expertos en Café — logo propio (pendiente: cae a texto hasta colocar /logo-expertos.png)
  if (n.includes("expertos en cafe") || n.includes("expertos en café"))
    return { marca: "Expertos en Café", logo: "/logo-expertos.png", footer: "Expertos en Café  ·  Sistema Medicloud Safety" };
  if (n.includes("comindustria"))
    return { marca: "Comindustria", logo: "/logo-comind.png", footer: "Inversiones Comindustria  ·  Sistema Medicloud Safety" };
  if (n.includes("multisel"))
    return { marca: "Multisel", logo: "/logo-multisel.png", footer: "Multisel  ·  Sistema Medicloud Safety" };
  const m = nombre || "Medicloud Safety";
  return { marca: m, logo: null, footer: `${m}  ·  Sistema Medicloud Safety` };
}
