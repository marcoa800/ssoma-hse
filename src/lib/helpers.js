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

export function excelDateToISO(val) {
  if (!val) return null;
  if (typeof val === "string" && val.includes("-")) return val;
  if (typeof val === "string" && val.includes("/")) {
    const parts = val.split("/");
    if (parts.length === 3) { const [d, m, y] = parts; return `${y.length === 2 ? "20" + y : y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`; }
  }
  if (typeof val === "number") { const date = new Date((val - 25569) * 86400 * 1000); return date.toISOString().split("T")[0]; }
  return null;
}
