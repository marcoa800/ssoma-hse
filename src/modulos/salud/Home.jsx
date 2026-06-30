import { useState } from 'react';
import { showToast } from '../../lib/toast.jsx';
import {
  LayoutDashboard, Users, BookOpen, FileText, BarChart2, Stethoscope,
  AlertTriangle, CheckCircle, Plus, Download, ChevronRight, Lock, FileDown,
  ClipboardList, ShieldAlert, Shield, Activity, Home, HeartPulse,
  Microscope, Settings, Building2, DollarSign, TrendingUp, Sparkles,
  Leaf, Droplets, Wind, Trash2, Cloud, Scale, Target, GitBranch, ClipboardCheck,
  Award, Gauge, Ruler, MessageSquare, Megaphone, HeartHandshake
} from 'lucide-react';

export default function HomeModulo({ profile, role, platform, setPlatform, navigate, setPage, empresa }) {
  const isSuperAdmin = role === "SUPERADMIN";
  const isAdministrativo = role === "ADMINISTRATIVO";
  const canMedico = ["SUPERADMIN", "ADMIN", "MEDICO"].includes(role);
  const today = new Date().toLocaleDateString("es-PE", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const esMultisel     = empresa?.nombre?.toLowerCase().includes("multisel")     || false;
  const esHydroGlobal  = empresa?.nombre?.toLowerCase().includes("hydro")        || false;
  const esComindustria = empresa?.nombre?.toLowerCase().includes("comindustria") || false;
  const esDemo         = empresa?.nombre?.toLowerCase().includes("demo")         || false;
  const esEntregaEmo   = (() => { const n = empresa?.nombre?.toLowerCase() || ""; return n.includes("expertos en cafe") || n.includes("expertos en café") || n.includes("franquicias unidas"); })();
  const esOilGas       = empresa?.nombre?.toLowerCase().includes("oil")          || false;
  const HYDRO_SALUD_PERMITIDOS = new Set(["dashboard", "directorio", "capacitaciones", "documentos", "accidentes", "epps", "monitoreo", "reportes"]);
  const hydroBloqueado = (id) => esHydroGlobal && platform === "salud" && !HYDRO_SALUD_PERMITIDOS.has(id);
  const moduloOcultoHome = (id) => {
    if (esComindustria && ["ats"].includes(id)) return true;
    if (!esComindustria && !esDemo && ["indicadores"].includes(id)) return true; // indicadores: Comindustria + DEMO
    return false;
  };

  const SALUD_CARDS = [
    { id: "dashboard",       label: "Dashboard General",         desc: "Métricas y KPIs en tiempo real",          Icon: LayoutDashboard, color: "blue" },
    { id: "directorio",      label: "Directorio de Personal",    desc: "Sábana completa de trabajadores",         Icon: Users,           color: "emerald" },
    { id: "capacitaciones",  label: "Capacitaciones",            desc: "Registro y seguimiento de cursos",        Icon: BookOpen,        color: "purple" },
    { id: "vigilancia",      label: "Vigilancia Médica",         desc: "Programas de vigilancia activos",         Icon: HeartPulse,      color: "red",    locked: !canMedico, requiredRole: "MEDICO" },
    { id: "caracterizacion", label: "Caracterización de Riesgo", desc: "Evaluación ergonómica RM-375",            Icon: Microscope,      color: "orange" },
    { id: "seguimiento",     label: "Seguimiento Médico",        desc: "Control y seguimiento de casos",          Icon: ClipboardList,   color: "blue" },
    { id: "documentos",      label: "Documentos",                desc: "Centro documental y normativa",           Icon: FileText,        color: "gray" },
    { id: "kpis",            label: "KPIs",                      desc: "Indicadores de gestión y desempeño",      Icon: BarChart2,       color: "yellow" },
    { id: "topico",          label: "Tópico",                    desc: "Atenciones médicas del tópico",           Icon: HeartPulse,      color: "rose" },
    { id: "reportes",        label: "Reportes PDF",              desc: "Generación de informes y reportes",       Icon: FileDown,        color: "gray" },
    ...(esMultisel ? [{ id: "plan_so", label: "Plan SO Anual", desc: "Programa Anual de Salud Ocupacional 2026", Icon: ClipboardList, color: "blue" }] : []),
    ...(esEntregaEmo ? [{ id: "emo_entregas", label: "Entrega de EMO", desc: "Entrega y firma digital de exámenes médicos", Icon: FileText, color: "blue" }] : []),
    ...(esComindustria ? [{ id: "pendientes", label: "Pendientes / Actividades", desc: "Tablero de tareas: responsables, estado y alertas", Icon: ClipboardList, color: "violet" }] : []),
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
    { id: "indicadores",      label: "Indicadores SST",     desc: "IF, IG, IA — estadística de accidentabilidad", Icon: TrendingUp, color: "blue" },
    { id: "reportes_ssoma",   label: "Reportes PDF",        desc: "Generación de informes SSOMA",        Icon: FileDown,        color: "gray" },
    ...((esComindustria || esMultisel || esDemo) ? [
      { id: "mintra", label: "Cumplimiento MINTRA", desc: "Checklist SST (RM 050-2013-TR) en tiempo real", Icon: Shield, color: "green" },
    ] : []),
    ...((esComindustria || esDemo) ? [
      { id: "comite", label: "Comité de SST", desc: "Miembros y libro de actas del comité", Icon: Users, color: "blue" },
    ] : []),
    ...(esComindustria ? [
      { id: "investigaciones", label: "Investigación Accidentes", desc: "Causas y medidas correctivas", Icon: AlertTriangle, color: "red" },
      { id: "acciones", label: "Acciones Correctivas", desc: "No conformidades y su seguimiento", Icon: CheckCircle, color: "amber" },
    ] : []),
    ...((esComindustria || esDemo) ? [
      { id: "programa_sst", label: "Programa Anual SST", desc: "PASST — link del documento del año", Icon: ClipboardList, color: "violet" },
    ] : []),
    ...(esHydroGlobal ? [{ id: "hallazgos_hgp", label: "Reporte de Hallazgos",  desc: "Seguimiento de hallazgos FR-039", Icon: AlertTriangle, color: "orange" }] : []),
    ...(esDemo ? [{ id: "asistente_ia", label: "Asistente IA SSOMA", desc: "Genera análisis SST con IA (IPERC) — normativa peruana", Icon: Sparkles, color: "blue" }] : []),
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
    violet:  { border: "border-l-violet-500", text: "text-violet-400",  glow: "hover:border-violet-600 hover:shadow-violet-500/20",  bg: "bg-violet-500/10" },
  };

  const SIG_CARDS = [
    { id: "sig",          label: "SIG Documental",   desc: "Control de documentos del sistema de gestión", Icon: FileDown,    color: "violet" },
    { id: "homologacion", label: "Homologación SGS",  desc: "Cuestionario UNNA Energía — 129 ítems",        Icon: CheckCircle, color: "amber"  },
  ];

  // ── DEMO: Gestión Ambiental (módulos de ejemplo, aún no funcionales) ──
  const AMBIENTAL_CARDS = [
    { id: "aspectos_impactos", label: "Aspectos e Impactos",     desc: "Matriz IAAS de aspectos e impactos ambientales", Icon: Leaf,          color: "green",   placeholder: true },
    { id: "residuos",          label: "Gestión de Residuos",     desc: "Residuos sólidos (DL 1278) y peligrosos",        Icon: Trash2,        color: "emerald", placeholder: true },
    { id: "monitoreo_amb",     label: "Monitoreo Ambiental",     desc: "Agua, aire, ruido y suelo",                      Icon: Activity,      color: "cyan",    placeholder: true },
    { id: "efluentes",         label: "Efluentes / Vertimientos",desc: "Control de efluentes (ECA Agua, ANA)",           Icon: Droplets,      color: "blue",    placeholder: true },
    { id: "emisiones",         label: "Emisiones Atmosféricas",  desc: "Control de emisiones (ECA Aire)",                Icon: Wind,          color: "teal",    placeholder: true },
    { id: "huella_carbono",    label: "Huella de Carbono",       desc: "Inventario de GEI (alcances 1, 2 y 3)",          Icon: Cloud,         color: "gray",    placeholder: true },
    { id: "legal_amb",         label: "Cumplimiento Legal",      desc: "Requisitos legales ambientales (Ley 28611)",     Icon: Scale,         color: "amber",   placeholder: true },
    { id: "pma",               label: "Plan de Manejo Ambiental",desc: "PMA y compromisos del instrumento de gestión",   Icon: FileText,      color: "green",   placeholder: true },
    { id: "emergencias_amb",   label: "Emergencias Ambientales", desc: "Plan de contingencia ante derrames",             Icon: AlertTriangle, color: "red",     placeholder: true },
    { id: "indicadores_amb",   label: "Indicadores Ambientales", desc: "Consumo de agua, energía y generación de residuos", Icon: BarChart2,  color: "blue",    placeholder: true },
    { id: "capacitacion_amb",  label: "Capacitación Ambiental",  desc: "Sensibilización y formación ambiental",          Icon: BookOpen,      color: "purple",  placeholder: true },
    { id: "hallazgos_amb",     label: "Hallazgos Ambientales",   desc: "No conformidades y acciones correctivas",        Icon: ClipboardCheck,color: "orange",  placeholder: true },
  ];

  // ── DEMO: Sistema Integrado de Gestión (ISO 9001/14001/45001) — ejemplo ──
  const SIG_DEMO_CARDS = [
    { id: "sig_politica",    label: "Política Integrada",       desc: "Política del SIG (Calidad, SST y Ambiente)",  Icon: FileText,      color: "violet", placeholder: true },
    { id: "sig_documentos",  label: "Control de Documentos",    desc: "Documentación y registros del SIG",           Icon: FileDown,      color: "blue",   placeholder: true },
    { id: "sig_legal",       label: "Requisitos Legales",       desc: "Matriz de requisitos legales aplicables",     Icon: Scale,         color: "amber",  placeholder: true },
    { id: "sig_objetivos",   label: "Objetivos y Metas",        desc: "Objetivos del sistema y su seguimiento",      Icon: Target,        color: "emerald",placeholder: true },
    { id: "sig_riesgos",     label: "Riesgos y Oportunidades",  desc: "Gestión de riesgos y oportunidades",          Icon: Shield,        color: "red",    placeholder: true },
    { id: "sig_auditorias",  label: "Auditorías Internas",      desc: "ISO 9001 / 14001 / 45001",                    Icon: ClipboardCheck,color: "cyan",   placeholder: true },
    { id: "sig_nc",          label: "No Conformidades",         desc: "NC y acciones correctivas (PHVA)",            Icon: AlertTriangle, color: "orange", placeholder: true },
    { id: "sig_cambio",      label: "Gestión del Cambio",       desc: "Control de cambios del sistema",              Icon: GitBranch,     color: "purple", placeholder: true },
    { id: "sig_partes",      label: "Partes Interesadas",       desc: "Necesidades y expectativas",                  Icon: Users,         color: "teal",   placeholder: true },
    { id: "sig_revision",    label: "Revisión por la Dirección",desc: "Entradas, salidas y acuerdos",                Icon: CheckCircle,   color: "blue",   placeholder: true },
    { id: "sig_indicadores", label: "Indicadores SIG",          desc: "KPIs del sistema integrado de gestión",       Icon: BarChart2,     color: "yellow", placeholder: true },
    { id: "sig_mejora",      label: "Mejora Continua",          desc: "Ciclo PHVA y oportunidades de mejora",        Icon: TrendingUp,    color: "green",  placeholder: true },
  ];

  // ── DEMO: Gestión de Calidad (ISO 9001) — módulos de ejemplo ──
  const CALIDAD_CARDS = [
    { id: "cal_politica",     label: "Política de Calidad",     desc: "Política y objetivos de calidad",            Icon: FileText,      color: "blue",    placeholder: true },
    { id: "cal_procesos",     label: "Gestión de Procesos",     desc: "Mapa de procesos y caracterización",         Icon: GitBranch,     color: "purple",  placeholder: true },
    { id: "cal_control",      label: "Control de Calidad",      desc: "Inspección y ensayos del producto/servicio", Icon: ClipboardCheck,color: "cyan",    placeholder: true },
    { id: "cal_pnc",          label: "Producto No Conforme",    desc: "Tratamiento de salidas no conformes",        Icon: AlertTriangle, color: "red",     placeholder: true },
    { id: "cal_satisfaccion", label: "Satisfacción del Cliente",desc: "Encuestas y voz del cliente",                Icon: Award,         color: "amber",   placeholder: true },
    { id: "cal_metrologia",   label: "Calibración / Metrología",desc: "Control de equipos de medición",             Icon: Ruler,         color: "teal",    placeholder: true },
    { id: "cal_capa",         label: "Acciones Correctivas",    desc: "No conformidades y acciones (PHVA)",         Icon: CheckCircle,   color: "emerald", placeholder: true },
    { id: "cal_auditorias",   label: "Auditorías de Calidad",   desc: "Auditorías internas ISO 9001",               Icon: ClipboardList, color: "blue",    placeholder: true },
    { id: "cal_proveedores",  label: "Evaluación de Proveedores",desc: "Homologación y desempeño de proveedores",   Icon: Building2,     color: "orange",  placeholder: true },
    { id: "cal_indicadores",  label: "Indicadores de Calidad",  desc: "KPIs de calidad y desempeño",                Icon: Gauge,         color: "yellow",  placeholder: true },
    { id: "cal_mejora",       label: "Mejora Continua",         desc: "Kaizen y oportunidades de mejora",           Icon: TrendingUp,    color: "green",   placeholder: true },
    { id: "cal_riesgos",      label: "Riesgos de Procesos",     desc: "Riesgos y oportunidades por proceso",        Icon: Shield,        color: "red",     placeholder: true },
  ];

  // ── DEMO: Responsabilidad Social / Relaciones Comunitarias — ejemplo ──
  const RSE_CARDS = [
    { id: "rse_grupos",        label: "Grupos de Interés",       desc: "Mapeo de actores y stakeholders",            Icon: Users,         color: "blue",    placeholder: true },
    { id: "rse_quejas",        label: "Quejas y Reclamos",       desc: "Gestión de quejas de comunidades",           Icon: MessageSquare, color: "red",     placeholder: true },
    { id: "rse_inversion",     label: "Inversión Social",        desc: "Proyectos e inversión en comunidades",       Icon: DollarSign,    color: "emerald", placeholder: true },
    { id: "rse_monitoreo",     label: "Monitoreo Participativo", desc: "Monitoreo ambiental participativo",          Icon: Activity,      color: "cyan",    placeholder: true },
    { id: "rse_convenios",     label: "Convenios y Compromisos", desc: "Acuerdos y compromisos sociales",            Icon: FileText,      color: "amber",   placeholder: true },
    { id: "rse_empleo",        label: "Empleo Local",            desc: "Contratación de mano de obra local",         Icon: Users,         color: "teal",    placeholder: true },
    { id: "rse_dialogo",       label: "Comunicación y Diálogo",  desc: "Mesas de diálogo y comunicación",            Icon: Megaphone,     color: "purple",  placeholder: true },
    { id: "rse_conflictos",    label: "Gestión de Conflictos",   desc: "Prevención de conflictos sociales",          Icon: AlertTriangle, color: "orange",  placeholder: true },
    { id: "rse_desarrollo",    label: "Desarrollo Comunitario",  desc: "Programas de desarrollo local",              Icon: HeartHandshake,color: "rose",    placeholder: true },
    { id: "rse_etica",         label: "Línea Ética",             desc: "Canal de denuncias y ética",                 Icon: Shield,        color: "gray",    placeholder: true },
    { id: "rse_indicadores",   label: "Indicadores Sociales",    desc: "KPIs de gestión social",                     Icon: BarChart2,     color: "blue",    placeholder: true },
    { id: "rse_sostenibilidad",label: "Reporte de Sostenibilidad",desc: "Memoria de sostenibilidad (GRI)",           Icon: Leaf,          color: "green",   placeholder: true },
  ];

  const ADMIN_CARDS = [
    { id: "dashboard",       label: "Dashboard",         desc: "Métricas y resumen general",            Icon: LayoutDashboard, color: "emerald" },
    { id: "directorio",      label: "Directorio",        desc: "Sábana de personal",                    Icon: Users,           color: "emerald" },
    { id: "admin_descansos", label: "Descansos Médicos", desc: "Registro e importación de descansos",   Icon: HeartPulse,      color: "rose" },
  ];

  const cards = (
    platform === "administrativo" ? ADMIN_CARDS :
    platform === "salud" ? SALUD_CARDS :
    platform === "ambiental" ? AMBIENTAL_CARDS :
    platform === "calidad" ? CALIDAD_CARDS :
    platform === "rse" ? RSE_CARDS :
    platform === "sig" ? (esOilGas ? SIG_CARDS : SIG_DEMO_CARDS) :
    SSOMA_CARDS
  ).filter(c => !moduloOcultoHome(c.id));

  const handleCard = (card) => {
    if (card.placeholder) {
      showToast("Módulo en construcción — disponible próximamente", "info");
      return;
    }
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
          <div className={`flex gap-3 shrink-0 flex-wrap ${isAdministrativo ? "hidden" : ""}`}>
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
              <ShieldAlert size={16} /> {esDemo ? "Seguridad" : "SSOMA"}
            </button>
            {esDemo && (
              <button onClick={() => setPlatform("ambiental")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-base font-medium transition-all border ${
                  platform === "ambiental"
                    ? "bg-green-600 text-white border-green-500 shadow-lg shadow-green-500/25"
                    : "bg-gray-800/80 text-gray-400 border-gray-700 hover:border-gray-500 hover:text-gray-200"
                }`}>
                <Leaf size={16} /> Ambiental
              </button>
            )}
            {esDemo && (
              <button onClick={() => setPlatform("calidad")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-base font-medium transition-all border ${
                  platform === "calidad"
                    ? "bg-cyan-600 text-white border-cyan-500 shadow-lg shadow-cyan-500/25"
                    : "bg-gray-800/80 text-gray-400 border-gray-700 hover:border-gray-500 hover:text-gray-200"
                }`}>
                <Award size={16} /> Calidad
              </button>
            )}
            {esDemo && (
              <button onClick={() => setPlatform("rse")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-base font-medium transition-all border ${
                  platform === "rse"
                    ? "bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-500/25"
                    : "bg-gray-800/80 text-gray-400 border-gray-700 hover:border-gray-500 hover:text-gray-200"
                }`}>
                <HeartHandshake size={16} /> Responsabilidad Social
              </button>
            )}
            {(esOilGas || esDemo) && (
              <button onClick={() => setPlatform("sig")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-base font-medium transition-all border ${
                  platform === "sig"
                    ? "bg-violet-600 text-white border-violet-500 shadow-lg shadow-violet-500/25"
                    : "bg-gray-800/80 text-gray-400 border-gray-700 hover:border-gray-500 hover:text-gray-200"
                }`}>
                <FileDown size={16} /> SIG
              </button>
            )}
            {esComindustria && (
              <button onClick={() => setPlatform("administrativo")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-base font-medium transition-all border ${
                  platform === "administrativo"
                    ? "bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/25"
                    : "bg-gray-800/80 text-gray-400 border-gray-700 hover:border-gray-500 hover:text-gray-200"
                }`}>
                <FileText size={16} /> Administrativo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Section ── */}
      <div>
        <div className={`flex items-center gap-3 pl-3 border-l-2 mb-5 ${platform === "salud" ? "border-blue-500" : platform === "ambiental" ? "border-green-500" : platform === "calidad" ? "border-cyan-500" : platform === "rse" ? "border-rose-500" : platform === "sig" ? "border-violet-500" : platform === "administrativo" ? "border-emerald-500" : "border-amber-500"}`}>
          <div>
            <div className={`text-sm font-bold uppercase tracking-widest ${platform === "salud" ? "text-blue-400" : platform === "ambiental" ? "text-green-400" : platform === "calidad" ? "text-cyan-400" : platform === "rse" ? "text-rose-400" : platform === "sig" ? "text-violet-400" : platform === "administrativo" ? "text-emerald-400" : "text-amber-400"}`}>
              {platform === "salud" ? "Salud Ocupacional" : platform === "ambiental" ? "Gestión Ambiental" : platform === "calidad" ? "Gestión de Calidad" : platform === "rse" ? "Responsabilidad Social" : platform === "sig" ? "Sistema Integrado de Gestión" : platform === "administrativo" ? "Administrativo" : (esDemo ? "Seguridad" : "Seguridad y Medio Ambiente")}
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
                {card.placeholder && (
                  <span className="absolute top-3 right-3 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-gray-800 text-gray-400 border border-gray-700">Pronto</span>
                )}
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
