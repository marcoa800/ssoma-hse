import { useState } from 'react';
import { showToast } from '../../lib/toast.jsx';
import {
  LayoutDashboard, Users, BookOpen, FileText, BarChart2, Stethoscope,
  AlertTriangle, CheckCircle, Plus, Download, ChevronRight, Lock, FileDown,
  ClipboardList, ShieldAlert, Shield, Activity, Home, HeartPulse,
  Microscope, Settings, Building2, DollarSign
} from 'lucide-react';

export default function HomeModulo({ profile, role, platform, setPlatform, navigate, setPage, empresa }) {
  const isSuperAdmin = role === "SUPERADMIN";
  const canMedico = ["SUPERADMIN", "ADMIN", "MEDICO"].includes(role);
  const today = new Date().toLocaleDateString("es-PE", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const esMultisel = empresa?.nombre?.toLowerCase().includes("multisel") || false;
  const esHydroGlobal = empresa?.nombre?.toLowerCase().includes("hydro") || false;
  const esComindustria = empresa?.nombre?.toLowerCase().includes("comindustria") || false;
  const HYDRO_SALUD_PERMITIDOS = new Set(["dashboard", "directorio", "capacitaciones", "documentos", "accidentes", "epps", "monitoreo", "reportes"]);
  const hydroBloqueado = (id) => esHydroGlobal && platform === "salud" && !HYDRO_SALUD_PERMITIDOS.has(id);
  const moduloOcultoHome = (id) => esComindustria && ["ats"].includes(id);

  const SALUD_CARDS = [
    { id: "dashboard",       label: "Dashboard General",         desc: "Métricas y KPIs en tiempo real",          Icon: LayoutDashboard, color: "blue" },
    { id: "directorio",      label: "Directorio de Personal",    desc: "Sábana completa de trabajadores",         Icon: Users,           color: "emerald" },
    { id: "capacitaciones",  label: "Capacitaciones",            desc: "Registro y seguimiento de cursos",        Icon: BookOpen,        color: "purple" },
    { id: "vigilancia",      label: "Vigilancia Médica",         desc: "Programas de vigilancia activos",         Icon: HeartPulse,      color: "red",    locked: !canMedico, requiredRole: "MEDICO" },
    { id: "caracterizacion", label: "Caracterización de Riesgo", desc: "Evaluación ergonómica RM-375",            Icon: Microscope,      color: "orange" },
    { id: "accidentes",      label: "Accidentes",                desc: "Registro de incidentes y accidentes",     Icon: ShieldAlert,     color: "rose" },
    { id: "seguimiento",     label: "Seguimiento Médico",        desc: "Control y seguimiento de casos",          Icon: ClipboardList,   color: "blue" },
    { id: "epps",            label: "Control de EPPs",           desc: "Equipos de protección personal",          Icon: Shield,          color: "green" },
    { id: "monitoreo",       label: "Monitoreo",                 desc: "Monitoreo de agentes ocupacionales",      Icon: Activity,        color: "cyan" },
    { id: "documentos",      label: "Documentos",                desc: "Centro documental y normativa",           Icon: FileText,        color: "gray" },
    { id: "kpis",            label: "KPIs",                      desc: "Indicadores de gestión y desempeño",      Icon: BarChart2,       color: "yellow" },
    { id: "topico",          label: "Tópico",                    desc: "Atenciones médicas del tópico",           Icon: HeartPulse,      color: "rose" },
    { id: "reportes",        label: "Reportes PDF",              desc: "Generación de informes y reportes",       Icon: FileDown,        color: "gray" },
    ...(esMultisel ? [{ id: "plan_so", label: "Plan SO Anual", desc: "Programa Anual de Salud Ocupacional 2026", Icon: ClipboardList, color: "blue" }] : []),
  ];

  const SSOMA_CARDS = [
    { id: "ssoma_dashboard",  label: "Dashboard SSOMA",     desc: "Panel de seguridad operacional",      Icon: LayoutDashboard, color: "amber" },
    { id: "directorio",       label: "Directorio",          desc: "Personal y organización",             Icon: Users,           color: "emerald" },
    { id: "accidentes",       label: "Accidentes",          desc: "Registro de accidentes e incidentes", Icon: ShieldAlert,     color: "red" },
    { id: "racs",             label: "RACs",                desc: "Reportes de actos y condiciones",     Icon: AlertTriangle,   color: "orange" },
    { id: "triaje",           label: "Triaje SSOMA",        desc: "Asistente de triaje médico en campo",  Icon: Stethoscope,     color: "blue" },
    { id: "iperc",            label: "IPERC / Riesgos",     desc: "Matriz de identificación de riesgos", Icon: Shield,          color: "red" },
    { id: "inspecciones",     label: "Inspecciones",        desc: "Inspecciones de seguridad",           Icon: ClipboardList,   color: "blue" },
    { id: "ats",              label: "ATS / PETAR",         desc: "Análisis de trabajo seguro",          Icon: CheckCircle,     color: "green" },
    { id: "epps",             label: "Control de EPPs",     desc: "Equipos de protección personal",      Icon: Shield,          color: "teal" },
    { id: "monitoreo",        label: "Monitoreo",           desc: "Monitoreo de agentes físicos",        Icon: Activity,        color: "cyan" },
    { id: "contratistas",     label: "Contratistas",        desc: "Gestión de empresas contratistas",    Icon: Building2,       color: "amber" },
    { id: "inversion",        label: "Inversión SST",       desc: "Costos de seguridad y plan vs real",  Icon: DollarSign,      color: "emerald" },
    { id: "reportes_ssoma",   label: "Reportes PDF",        desc: "Generación de informes SSOMA",        Icon: FileDown,        color: "gray" },
    ...(esHydroGlobal ? [{ id: "hallazgos_hgp", label: "Reporte de Hallazgos", desc: "Seguimiento de hallazgos FR-039", Icon: AlertTriangle, color: "orange" }] : []),
  ];

  const CM = {
    blue:    { border: "border-l-blue-500",    text: "text-blue-400",    glow: "hover:border-blue-600 hover:shadow-blue-500/20",    bg: "bg-blue-500/10" },
    emerald: { border: "border-l-emerald-500", text: "text-emerald-400", glow: "hover:border-emerald-600 hover:shadow-emerald-500/20", bg: "bg-emerald-500/10" },
    purple:  { border: "border-l-purple-500",  text: "text-purple-400",  glow: "hover:border-purple-600 hover:shadow-purple-500/20",  bg: "bg-purple-500/10" },
    red:     { border: "border-l-red-500",     text: "text-red-400",     glow: "hover:border-red-600 hover:shadow-red-500/20",        bg: "bg-red-500/10" },
    orange:  { border: "border-l-orange-500",  text: "text-orange-400",  glow: "hover:border-orange-600 hover:shadow-orange-500/20",  bg: "bg-orange-500/10" },
    amber:   { border: "border-l-amber-500",   text: "text-amber-400",   glow: "hover:border-amber-600 hover:shadow-amber-500/20",   bg: "bg-amber-500/10" },
    yellow:  { border: "border-l-yellow-500",  text: "text-yellow-400",  glow: "hover:border-yellow-600 hover:shadow-yellow-500/20",  bg: "bg-yellow-500/10" },
    gray:    { border: "border-l-gray-600",    text: "text-gray-400",    glow: "hover:border-gray-500 hover:shadow-gray-500/10",      bg: "bg-gray-500/10" },
    rose:    { border: "border-l-rose-500",    text: "text-rose-400",    glow: "hover:border-rose-600 hover:shadow-rose-500/20",      bg: "bg-rose-500/10" },
    green:   { border: "border-l-green-500",   text: "text-green-400",   glow: "hover:border-green-600 hover:shadow-green-500/20",   bg: "bg-green-500/10" },
    cyan:    { border: "border-l-cyan-500",    text: "text-cyan-400",    glow: "hover:border-cyan-600 hover:shadow-cyan-500/20",      bg: "bg-cyan-500/10" },
    teal:    { border: "border-l-teal-500",    text: "text-teal-400",    glow: "hover:border-teal-600 hover:shadow-teal-500/20",      bg: "bg-teal-500/10" },
  };

  const cards = (platform === "salud" ? SALUD_CARDS : SSOMA_CARDS).filter(c => !moduloOcultoHome(c.id));

  const handleCard = (card) => {
    if (hydroBloqueado(card.id)) {
      showToast("Módulo no disponible para tu empresa", "error");
      return;
    }
    if (card.locked) {
      showToast(`Acceso denegado — requiere rol ${card.requiredRole || "ADMIN"} o superior`, "error");
      return;
    }
    navigate(card.id);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">

      {/* ── Hero ── */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-800 p-6 md:p-8"
        style={{
          background: "linear-gradient(135deg, #0c1220 0%, #030712 60%, #0a0e18 100%)",
          backgroundImage: `radial-gradient(circle at 15% 55%, rgba(59,130,246,0.10) 0%, transparent 45%),
                            radial-gradient(circle at 85% 20%, rgba(245,158,11,0.08) 0%, transparent 45%)`,
        }}>
        <div className="absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-sm text-gray-500 mb-1 font-mono uppercase tracking-widest">{empresa?.nombre || "Medicloud Safety"}</div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Bienvenido, {profile?.nombre || "Usuario"}</h1>
            <p className="text-gray-400 text-base mt-1">¿A dónde quieres ir hoy?</p>
            <div className="text-sm text-gray-600 mt-2 capitalize">{today}</div>
          </div>
          <div className="flex gap-3 shrink-0 flex-wrap">
            <button onClick={() => setPlatform("salud")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-base font-medium transition-all border ${
                platform === "salud"
                  ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/25"
                  : "bg-gray-800/80 text-gray-400 border-gray-700 hover:border-gray-500 hover:text-gray-200"
              }`}>
              <Stethoscope size={16} /> Salud Ocupacional
            </button>
            <button onClick={() => setPlatform("ssoma")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-base font-medium transition-all border ${
                platform === "ssoma"
                  ? "bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-500/25"
                  : "bg-gray-800/80 text-gray-400 border-gray-700 hover:border-gray-500 hover:text-gray-200"
              }`}>
              <ShieldAlert size={16} /> SSOMA
            </button>
          </div>
        </div>
      </div>

      {/* ── Section ── */}
      <div>
        <div className={`flex items-center gap-3 pl-3 border-l-2 mb-5 ${platform === "salud" ? "border-blue-500" : "border-amber-500"}`}>
          <div>
            <div className={`text-sm font-bold uppercase tracking-widest ${platform === "salud" ? "text-blue-400" : "text-amber-400"}`}>
              {platform === "salud" ? "Salud Ocupacional" : "Seguridad y Medio Ambiente"}
            </div>
            <div className="text-sm text-gray-500 mt-0.5">Selecciona un módulo para comenzar</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {cards.map(card => {
            const cc = CM[card.color] || CM.gray;
            const isHydroLocked = hydroBloqueado(card.id);
            const isLocked = card.locked || isHydroLocked;
            return (
              <div key={`${platform}-${card.id}`} onClick={() => handleCard(card)}
                className={`relative group bg-gray-900 border border-l-4 rounded-xl p-5 cursor-pointer transition-all duration-200 overflow-hidden select-none
                  ${cc.border} border-gray-800
                  ${isLocked ? "opacity-60" : `${cc.glow} hover:shadow-lg hover:-translate-y-0.5`}`}>
                <div className={`mb-3 ${cc.bg} w-11 h-11 rounded-lg flex items-center justify-center`}>
                  <card.Icon size={22} className={isLocked ? "text-gray-600" : cc.text} />
                </div>
                <div className="text-base font-semibold text-white leading-tight mb-1.5">{card.label}</div>
                <div className="text-sm text-gray-500 leading-relaxed">{card.desc}</div>
                {!isLocked && (
                  <div className={`absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity ${cc.text}`}>
                    <ChevronRight size={16} />
                  </div>
                )}
                {isHydroLocked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl gap-1"
                    style={{ backdropFilter: "blur(4px)", backgroundColor: "rgba(3,7,18,0.68)" }}>
                    <div className="w-9 h-9 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
                      <Lock size={17} className="text-gray-500" />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">No disponible</div>
                  </div>
                )}
                {card.locked && !isHydroLocked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl gap-1"
                    style={{ backdropFilter: "blur(4px)", backgroundColor: "rgba(3,7,18,0.68)" }}>
                    <div className="w-9 h-9 rounded-full bg-red-900/60 border border-red-700/80 flex items-center justify-center">
                      <Lock size={17} className="text-red-400" />
                    </div>
                    <div className="text-sm font-semibold text-red-300 mt-0.5">Sin acceso</div>
                    <div className="text-sm text-gray-500">Requiere: {card.requiredRole || "ADMIN"}+</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Admin section ── */}
      {isSuperAdmin && (
        <div>
          <div className="pl-3 border-l-2 border-orange-800 mb-3">
            <div className="text-sm font-bold uppercase tracking-widest text-orange-600">Administración</div>
          </div>
          <div onClick={() => setPage("superadmin")}
            className="group inline-flex items-center gap-4 bg-gray-900/50 border border-l-4 border-gray-800 border-l-orange-700 rounded-xl p-5 cursor-pointer hover:border-orange-600 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-200 hover:-translate-y-0.5">
            <div className="w-11 h-11 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Settings size={22} className="text-orange-400" />
            </div>
            <div>
              <div className="text-base font-semibold text-gray-300">Panel de Administración</div>
              <div className="text-sm text-gray-500">Gestión de empresas y usuarios del sistema</div>
            </div>
            <ChevronRight size={16} className="text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
          </div>
        </div>
      )}
    </div>
  );
}
