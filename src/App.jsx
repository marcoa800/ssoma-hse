import { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "./lib/supabase.js";
import { ToastContainer, showToast } from "./lib/toast.jsx";
import { applyThemeCSS } from "./lib/helpers.js";
import { NAV, SSOMA_NAV, THEMES } from "./constants/nav.js";
import Login from "./auth/Login.jsx";
// Formularios públicos (QR sin login) — chunks ligeros, cargados solo cuando se necesitan
const PublicTriajeForm = lazy(() => import("./modulos/ssoma/PublicTriajeForm.jsx"));
const PublicExamenForm = lazy(() => import("./modulos/salud/PublicExamenForm.jsx"));
const PublicRacForm = lazy(() => import("./modulos/ssoma/PublicRacForm.jsx"));
// Módulos internos (post-login) — diferidos para aligerar la carga inicial
const SuperAdmin = lazy(() => import("./auth/SuperAdmin.jsx"));
const HomeModulo = lazy(() => import("./modulos/salud/Home.jsx"));
const Dashboard = lazy(() => import("./modulos/salud/Dashboard.jsx"));
const Directorio = lazy(() => import("./modulos/salud/Directorio.jsx"));
const Capacitaciones = lazy(() => import("./modulos/salud/Capacitaciones.jsx"));
const Documentos = lazy(() => import("./modulos/salud/Documentos.jsx"));
const KPIs = lazy(() => import("./modulos/salud/KPIs.jsx"));
const ReportesModulo = lazy(() => import("./modulos/salud/Reportes.jsx"));
const AccidentesModulo = lazy(() => import("./modulos/salud/Accidentes.jsx"));
const SeguimientoModulo = lazy(() => import("./modulos/salud/Seguimiento.jsx"));
const EppModulo = lazy(() => import("./modulos/salud/Epps.jsx"));
const EppInventario = lazy(() => import("./modulos/salud/EppInventario.jsx"));
const MonitoreoModulo = lazy(() => import("./modulos/salud/Monitoreo.jsx"));
const MonitoreoComind = lazy(() => import("./modulos/salud/MonitoreoComind.jsx"));
const Vigilancia = lazy(() => import("./modulos/salud/vigilancia/Vigilancia.jsx"));
const DescansosMedicosModulo = lazy(() => import("./modulos/salud/vigilancia/DescansosMedicos.jsx"));
const AdminDashboard = lazy(() => import("./modulos/admin/AdminDashboard.jsx"));
const EmoDeliveryFlow = lazy(() => import("./modulos/salud/EmoDeliveryFlow.jsx"));
const EmoEntregasModulo = lazy(() => import("./modulos/salud/EmoEntregasModulo.jsx"));
const CaracterizacionRiesgoModulo = lazy(() => import("./modulos/salud/Caracterizacion.jsx"));
const PlanSOModulo = lazy(() => import("./modulos/salud/PlanSO.jsx"));
const TopicoModulo = lazy(() => import("./modulos/salud/TopicoModulo.jsx"));
const SSOMADashboard = lazy(() => import("./modulos/ssoma/SSOMADashboard.jsx"));
const TriajeModulo = lazy(() => import("./modulos/ssoma/TriajeModulo.jsx"));
const ExamenModulo = lazy(() => import("./modulos/salud/ExamenModulo.jsx"));
const RacsModulo = lazy(() => import("./modulos/ssoma/RacsModulo.jsx"));
const IpercModulo = lazy(() => import("./modulos/ssoma/IpercModulo.jsx"));
const InspeccionesModulo = lazy(() => import("./modulos/ssoma/InspeccionesModulo.jsx"));
const InversionSST = lazy(() => import("./modulos/ssoma/InversionSST.jsx"));
const IndicadoresComind = lazy(() => import("./modulos/ssoma/IndicadoresComind.jsx"));
const ATSPetarModulo = lazy(() => import("./modulos/ssoma/AtsPetarModulo.jsx"));
const ReportesSSOMAModulo = lazy(() => import("./modulos/ssoma/ReportesSSOMA.jsx"));
const ContratistasModulo = lazy(() => import("./modulos/ssoma/ContratistasModulo.jsx"));
const HallazgosHGP = lazy(() => import("./modulos/ssoma/HallazgosHGP.jsx"));
const HomologacionModulo = lazy(() => import("./modulos/ssoma/HomologacionModulo.jsx"));
const SIGModulo = lazy(() => import("./modulos/ssoma/SIGModulo.jsx"));
import {
  LayoutDashboard, Users, BookOpen, FileText,
  BarChart2, Stethoscope, AlertTriangle,
  CheckCircle, XCircle, Info, Plus, Upload,
  Download, ChevronRight, ChevronLeft, Lock,
  Trash2, LogOut, Filter, HelpCircle, Building2,
  Settings, UserPlus, Eye, EyeOff, Pencil, FileDown,
  ClipboardList, ShieldAlert, Shield, Activity,
  Home, HeartPulse, Microscope, Menu, X, Search,
  Thermometer, Heart, Wind, Zap, Clipboard, Phone
} from "lucide-react";

// Aplica el tema guardado antes del primer render (evita flash)
applyThemeCSS(localStorage.getItem("ssoma-theme") || "obsidian");

function ProximamentePage({ titulo, subtitulo }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-900/20 border border-amber-800/40 flex items-center justify-center mb-4">
        <ShieldAlert size={28} className="text-amber-500" />
      </div>
      <div className="text-lg font-semibold text-white mb-2">{titulo}</div>
      <div className="text-sm text-gray-500 max-w-xs">{subtitulo || "Módulo en construcción. Disponible en la próxima actualización."}</div>
      <div className="mt-4 px-3 py-1.5 rounded-full bg-amber-900/30 border border-amber-800/40 text-xs text-amber-500 font-medium">En desarrollo</div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [empresa, setEmpresa] = useState(null);
  const [allEmpresas, setAllEmpresas] = useState([]);
  const [misEmpresas, setMisEmpresas] = useState([]); // empresas a las que el usuario tiene acceso
  const [switching, setSwitching] = useState(false);
  const [platform, setPlatform] = useState(() => localStorage.getItem("ssoma-platform") || "salud");
  const [theme, setTheme] = useState(() => localStorage.getItem("ssoma-theme") || "obsidian");
  useEffect(() => { applyThemeCSS(theme); localStorage.setItem("ssoma-theme", theme); }, [theme]);
  useEffect(() => { localStorage.setItem("ssoma-platform", platform); }, [platform]);
  const [page, setPage] = useState(() => localStorage.getItem("ssoma-page") || "home");
  useEffect(() => { localStorage.setItem("ssoma-page", page); }, [page]);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== "undefined" ? window.innerWidth >= 768 : true);
  const [workers, setWorkers] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [docs, setDocs] = useState([]);
  const [kpis, setKpis] = useState([]);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ data: { session } }) => { setSession(session); setLoading(false); window.history.replaceState(null, "", window.location.pathname); });
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false); });
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    loadProfile();
  }, [session]);

  const loadProfile = async () => {
    // empresas!empresa_id desambigua la relación (existe también el vínculo vía profile_empresas)
    let { data: prof, error } = await supabase.from("profiles").select("*, empresas!empresa_id(*)").eq("id", session.user.id).single();
    if (error) {
      // Fallback de seguridad: sin embed, y se carga la empresa por separado
      const r2 = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (!r2.error) {
        prof = r2.data;
        if (prof?.empresa_id && !prof.empresas) {
          const { data: emp } = await supabase.from("empresas").select("*").eq("id", prof.empresa_id).single();
          prof.empresas = emp || null;
        }
      }
    }
    if (prof) {
      setProfile(prof);
      setEmpresa(prof.empresas);
      // Hydro Global arranca en SSOMA si el usuario no tiene preferencia guardada
      if (prof.empresas?.nombre?.toLowerCase().includes("hydro") && !localStorage.getItem("ssoma-platform")) {
        setPlatform("ssoma");
      }
      if (prof.empresa_id) {
        loadData(prof.empresa_id);
      }
      if (prof.rol === "SUPERADMIN") {
        const { data } = await supabase.from("empresas").select("id, nombre").order("nombre");
        setAllEmpresas(data || []);
        setMisEmpresas(data || []);
      } else {
        // empresas asignadas al usuario (acceso multi-empresa)
        const { data: pe } = await supabase.from("profile_empresas").select("empresas(id, nombre)").eq("profile_id", session.user.id);
        let lista = (pe || []).map(x => x.empresas).filter(Boolean);
        if (prof.empresas && !lista.some(e => e.id === prof.empresas.id)) lista = [{ id: prof.empresas.id, nombre: prof.empresas.nombre }, ...lista];
        lista.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));
        setMisEmpresas(lista);
      }
    }
    setProfileLoaded(true);
  };

  const switchEmpresa = async (newId) => {
    if (!newId || newId === profile?.empresa_id || switching) return;
    setSwitching(true);
    const { data, error } = await supabase.rpc("cambiar_empresa_activa", { p_empresa_id: newId });
    if (error || data === false) { showToast("No tienes acceso a esa empresa", "error"); setSwitching(false); return; }
    const nueva = misEmpresas.find(e => e.id === newId) || allEmpresas.find(e => e.id === newId);
    setProfile(p => ({ ...p, empresa_id: newId, empresas: nueva }));
    setEmpresa(nueva);
    setWorkers([]); setTrainings([]); setDocs([]); setKpis([]);
    setPage("dashboard");
    loadData(newId);
    showToast(`Empresa cambiada: ${nueva?.nombre || "—"}`, "success");
    setSwitching(false);
  };

  const loadData = async (empresaId) => {
    supabase.from("trabajadores").select("*").eq("empresa_id", empresaId).then(({ data }) => setWorkers(data || []));
    supabase.from("capacitaciones").select("*, asistencias(count)").eq("empresa_id", empresaId).then(({ data }) => setTrainings((data || []).map(t => ({ ...t, asistencia_count: t.asistencias?.[0]?.count || 0 }))));
    supabase.from("documentos").select("*").eq("empresa_id", empresaId).then(({ data }) => setDocs(data || []));
    supabase.from("kpis").select("*").eq("empresa_id", empresaId).then(({ data }) => setKpis((data || []).map(k => ({ ...k, real: k.valor_real }))));
  };

  const switchPlatform = (p) => {
    setPlatform(p);
    setPage(p === "salud" ? "dashboard" : p === "sig" ? "sig" : p === "administrativo" ? "dashboard" : "ssoma_dashboard");
  };

  const go = (id) => { setPage(id); setSidebarOpen(false); };

  const navigate = (p) => {
    if (p === "vigilancia" && profile?.rol === "SEGURIDAD") { showToast("Acceso denegado: módulo exclusivo para MEDICO/ADMIN", "error"); return; }
    setPage(p);
    setSidebarOpen(false);
  };

  const logout = async () => { await supabase.auth.signOut(); setSession(null); setProfile(null); setProfileLoaded(false); };

  const role = profile?.rol || "SEGURIDAD";
  const empresaId = profile?.empresa_id;
  const isSuperAdmin = role === "SUPERADMIN";
  const isAdministrativo = role === "ADMINISTRATIVO";

  // Perfil ADMINISTRATIVO: queda confinado a la plataforma Administrativo (Salud y SSOMA bloqueados)
  useEffect(() => {
    if (isAdministrativo && platform !== "administrativo") setPlatform("administrativo");
  }, [isAdministrativo, platform]);
  useEffect(() => {
    const adminPages = ["home", "dashboard", "directorio", "admin_descansos"];
    if (isAdministrativo && !adminPages.includes(page)) setPage("dashboard");
  }, [isAdministrativo, page]);

  // Módulos de Salud permitidos para Hydro Global (el resto queda bloqueado)
  const HYDRO_SALUD_PERMITIDOS = new Set(["dashboard", "directorio", "capacitaciones", "documentos", "accidentes", "epps", "monitoreo", "reportes"]);
  const saludBloqueado = (id) => !isSuperAdmin && esHydroGlobal && platform === "salud" && !HYDRO_SALUD_PERMITIDOS.has(id);
  const esMultisel     = empresa?.nombre?.toLowerCase().includes("multisel")    || false;
  const esHydroGlobal  = empresa?.nombre?.toLowerCase().includes("hydro")       || false;
  const esComindustria = empresa?.nombre?.toLowerCase().includes("comindustria")|| false;
  const esOilGas       = empresa?.nombre?.toLowerCase().includes("oil")         || false;
  // Entrega y Firma de EMO — solo Expertos en Café y Franquicias Unidas (mismo dueño)
  const esEntregaEmo   = (() => { const n = empresa?.nombre?.toLowerCase() || ""; return n.includes("expertos en cafe") || n.includes("expertos en café") || n.includes("franquicias unidas"); })();
  // Módulos ocultos por empresa
  const moduloOculto = (id) => {
    if (esComindustria && ["ats"].includes(id)) return true;
    if (!esComindustria && ["indicadores","examenes"].includes(id)) return true; // solo Comindustria
    return false;
  };

  const pageTitles = {
    home: "Inicio",
    dashboard: "Dashboard General", directorio: "Sábana de Personal", capacitaciones: "Capacitaciones",
    documentos: "Centro Documental", kpis: "Gestión de KPIs", topico: "Tópico — Atenciones Médicas", reportes: "Reportes PDF",
    vigilancia: "Vigilancia Médica", caracterizacion: "Caracterización de Riesgo", accidentes: "Accidentes e Incidentes", seguimiento: "Seguimiento Médico",
    epps: "Control de EPPs", monitoreo: "Monitoreo de Agentes", superadmin: "Panel de Administración",
    plan_so: "Plan SO Anual 2026",
    ssoma_dashboard: "Dashboard SSOMA", racs: "RACs — Reportes de Actos y Condiciones", triaje: "Triaje SSOMA",
    iperc: "IPERC / Matriz de Riesgos", inspecciones: "Inspecciones de Seguridad",
    ats: "ATS / PETAR", reportes_ssoma: "Reportes PDF — SSOMA",
    contratistas: "Gestión de Contratistas", inversion: "Inversión en Costos de Seguridad",
    examenes: "Exámenes de Capacitación",
    hallazgos_hgp: "Reporte de Hallazgos — HGP",
    homologacion: "Homologación de Proveedores — SGS",
    sig: "SIG — Control Documental",
    admin_descansos: "Descansos Médicos — Administrativo",
    emo_entregas: "Entrega y Firma de EMO",
  };
  const roleColors = { SUPERADMIN: "text-orange-400 bg-orange-900/40 border-orange-800", ADMIN: "text-purple-400 bg-purple-900/40 border-purple-800", MEDICO: "text-emerald-400 bg-emerald-900/40 border-emerald-800", SEGURIDAD: "text-amber-400 bg-amber-900/40 border-amber-800", ADMINISTRATIVO: "text-emerald-400 bg-emerald-900/40 border-emerald-800" };

  // Formulario público RAC (accesible via QR sin login)
  const cargandoPublico = <div className="min-h-screen bg-slate-100 flex items-center justify-center text-gray-400 text-sm">Cargando...</div>;
  const publicTriajeId = new URLSearchParams(window.location.search).get("triaje");
  if (publicTriajeId) return <Suspense fallback={cargandoPublico}><PublicTriajeForm empresaId={publicTriajeId} /></Suspense>;
  const publicRacId = new URLSearchParams(window.location.search).get("rac");
  if (publicRacId) return <Suspense fallback={cargandoPublico}><PublicRacForm empresaId={publicRacId} /></Suspense>;
  const publicExamenId = new URLSearchParams(window.location.search).get("examen");
  if (publicExamenId) return <Suspense fallback={cargandoPublico}><PublicExamenForm empresaId={publicExamenId} /></Suspense>;
  const emoToken = new URLSearchParams(window.location.search).get("entrega");
  if (emoToken) return <Suspense fallback={cargandoPublico}><EmoDeliveryFlow token={emoToken} /></Suspense>;

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-600 text-sm">Cargando...</div>;
  if (!session) return <><Login /><ToastContainer /></>;
  if (!profileLoaded) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-600 text-sm">Cargando perfil...</div>;

  // Contenido del sidebar (compartido entre desktop y mobile)
  const SidebarContent = () => (
    <>
      {/* ── Logo header ── */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-xs font-bold shrink-0">S</div>
          <span className="font-semibold text-sm">Medicloud <span className="text-gray-500 font-normal">Safety</span></span>
        </div>
        <button onClick={() => setSidebarOpen(false)}
          className="p-1 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-gray-800 transition-colors">
          <X size={15} />
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {/* Inicio */}
        <button onClick={() => go("home")}
          className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-left mb-2 ${page === "home" ? "bg-blue-900/40 text-blue-400" : "text-gray-500 hover:text-gray-200 hover:bg-gray-800"}`}>
          <Home size={16} /> Inicio
        </button>

        {/* Plataforma toggle */}
        <div className="flex bg-gray-800/60 rounded-lg p-0.5 mb-3 border border-gray-700/50">
          {isAdministrativo ? (
            <button className="flex-1 flex items-center justify-center gap-1 text-[10px] py-1.5 rounded-md font-medium bg-emerald-600 text-white shadow cursor-default">
              <FileText size={10} /> Administrativo
            </button>
          ) : esOilGas ? (
            <>
              <button onClick={() => switchPlatform("salud")}
                className={`flex-1 flex items-center justify-center gap-1 text-[10px] py-1.5 rounded-md transition-all font-medium ${platform === "salud" ? "bg-blue-600 text-white shadow" : "text-gray-500 hover:text-gray-300"}`}>
                <Stethoscope size={10} /> Salud
              </button>
              <button onClick={() => switchPlatform("ssoma")}
                className={`flex-1 flex items-center justify-center gap-1 text-[10px] py-1.5 rounded-md transition-all font-medium ${platform === "ssoma" ? "bg-amber-600 text-white shadow" : "text-gray-500 hover:text-gray-300"}`}>
                <ShieldAlert size={10} /> SSOMA
              </button>
              <button onClick={() => switchPlatform("sig")}
                className={`flex-1 flex items-center justify-center gap-1 text-[10px] py-1.5 rounded-md transition-all font-medium ${platform === "sig" ? "bg-violet-600 text-white shadow" : "text-gray-500 hover:text-gray-300"}`}>
                <FileText size={10} /> SIG
              </button>
            </>
          ) : esHydroGlobal ? (
            <>
              <button onClick={() => switchPlatform("ssoma")}
                className={`flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-md transition-all font-medium ${platform === "ssoma" ? "bg-amber-600 text-white shadow" : "text-gray-500 hover:text-gray-300"}`}>
                <ShieldAlert size={11} /> SSOMA
              </button>
              <button onClick={() => switchPlatform("salud")}
                className={`flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-md transition-all font-medium ${platform === "salud" ? "bg-blue-600 text-white shadow" : "text-gray-500 hover:text-gray-300"}`}>
                <Stethoscope size={11} /> Salud
              </button>
            </>
          ) : esComindustria ? (
            <>
              <button onClick={() => switchPlatform("salud")}
                className={`flex-1 flex items-center justify-center gap-1 text-[10px] py-1.5 rounded-md transition-all font-medium ${platform === "salud" ? "bg-blue-600 text-white shadow" : "text-gray-500 hover:text-gray-300"}`}>
                <Stethoscope size={10} /> Salud
              </button>
              <button onClick={() => switchPlatform("ssoma")}
                className={`flex-1 flex items-center justify-center gap-1 text-[10px] py-1.5 rounded-md transition-all font-medium ${platform === "ssoma" ? "bg-amber-600 text-white shadow" : "text-gray-500 hover:text-gray-300"}`}>
                <ShieldAlert size={10} /> SSOMA
              </button>
              <button onClick={() => switchPlatform("administrativo")}
                className={`flex-1 flex items-center justify-center gap-1 text-[10px] py-1.5 rounded-md transition-all font-medium ${platform === "administrativo" ? "bg-emerald-600 text-white shadow" : "text-gray-500 hover:text-gray-300"}`}>
                <FileText size={10} /> Admin
              </button>
            </>
          ) : (
            <>
              <button onClick={() => switchPlatform("salud")}
                className={`flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-md transition-all font-medium ${platform === "salud" ? "bg-blue-600 text-white shadow" : "text-gray-500 hover:text-gray-300"}`}>
                <Stethoscope size={11} /> Salud
              </button>
              <button onClick={() => switchPlatform("ssoma")}
                className={`flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-md transition-all font-medium ${platform === "ssoma" ? "bg-amber-600 text-white shadow" : "text-gray-500 hover:text-gray-300"}`}>
                <ShieldAlert size={11} /> SSOMA
              </button>
            </>
          )}
        </div>

        {/* Admin */}
        {isSuperAdmin && (
          <>
            <div className="text-xs text-gray-700 font-medium uppercase tracking-wider px-2 mb-2">Administración</div>
            <button onClick={() => go("superadmin")} className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-left ${page === "superadmin" ? "bg-orange-900/40 text-orange-400" : "text-gray-500 hover:text-gray-200 hover:bg-gray-800"}`}>
              <Building2 size={16} />Panel Admin
            </button>
          </>
        )}

        {platform === "salud" ? (
          <>
            <div className="text-xs text-gray-700 font-medium uppercase tracking-wider px-2 mb-2 mt-2">Módulos</div>
            {NAV.map(({ id, label, icon: Icon }) => {
              const bloqueado = saludBloqueado(id);
              return (
                <button key={id} onClick={() => !bloqueado && navigate(id)} disabled={bloqueado}
                  className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-left ${bloqueado ? "opacity-40 cursor-not-allowed text-gray-600" : page === id ? "bg-blue-900/40 text-blue-400" : "text-gray-500 hover:text-gray-200 hover:bg-gray-800"}`}>
                  <Icon size={16} />{label}
                  {bloqueado && <Lock size={10} className="ml-auto text-gray-600" />}
                </button>
              );
            })}
            <div className="text-xs text-gray-700 font-medium uppercase tracking-wider px-2 mt-4 mb-2">Salud Ocupacional</div>
            {esMultisel && (
              <button onClick={() => go("plan_so")} className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-left ${page === "plan_so" ? "bg-blue-900/40 text-blue-400" : "text-gray-500 hover:text-gray-200 hover:bg-gray-800"}`}>
                <ClipboardList size={16} />Plan SO Anual
              </button>
            )}
            {[
              { id: "vigilancia", label: "Vigilancia Médica", icon: Stethoscope, medico: true },
              { id: "caracterizacion", label: "Caracterización Riesgo", icon: FileText },
            ].map(({ id, label, icon: Icon, medico }) => {
              const bloqueado = saludBloqueado(id);
              return (
                <button key={id} onClick={() => !bloqueado && navigate(id)} disabled={bloqueado}
                  className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-left ${bloqueado ? "opacity-40 cursor-not-allowed text-gray-600" : page === id ? "bg-blue-900/40 text-blue-400" : "text-gray-500 hover:text-gray-200 hover:bg-gray-800"}`}>
                  <Icon size={16} />{label}
                  {bloqueado
                    ? <Lock size={10} className="ml-auto text-gray-600" />
                    : medico && <span className="ml-auto flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-500 border border-purple-900"><Lock size={9} />MED</span>}
                </button>
              );
            })}
            {esEntregaEmo && (
              <button onClick={() => go("emo_entregas")} className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-left ${page === "emo_entregas" ? "bg-blue-900/40 text-blue-400" : "text-gray-500 hover:text-gray-200 hover:bg-gray-800"}`}>
                <FileText size={16} />Entrega de EMO
              </button>
            )}
            <div className="text-xs text-gray-700 font-medium uppercase tracking-wider px-2 mt-4 mb-2">Seguridad</div>
            {[
              { id: "accidentes", label: "Accidentes", icon: ShieldAlert },
              { id: "seguimiento", label: "Seguimiento", icon: ClipboardList },
              { id: "epps", label: "Control de EPPs", icon: Shield },
              { id: "monitoreo", label: "Monitoreo", icon: Activity },
            ].map(({ id, label, icon: Icon }) => {
              const bloqueado = saludBloqueado(id);
              return (
                <button key={id} onClick={() => !bloqueado && go(id)} disabled={bloqueado}
                  className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-left ${bloqueado ? "opacity-40 cursor-not-allowed text-gray-600" : page === id ? "bg-blue-900/40 text-blue-400" : "text-gray-500 hover:text-gray-200 hover:bg-gray-800"}`}>
                  <Icon size={16} />{label}
                  {bloqueado && <Lock size={10} className="ml-auto text-gray-600" />}
                </button>
              );
            })}
          </>
        ) : platform === "sig" && esOilGas ? (
          <>
            <div className="text-xs text-gray-700 font-medium uppercase tracking-wider px-2 mb-2 mt-2">Sistema Integrado de Gestión</div>
            <button onClick={() => go("sig")} className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-left ${page === "sig" ? "bg-violet-900/40 text-violet-400" : "text-gray-500 hover:text-gray-200 hover:bg-gray-800"}`}>
              <FileDown size={16} />SIG Documental
            </button>
            <button onClick={() => go("homologacion")} className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-left ${page === "homologacion" ? "bg-violet-900/40 text-violet-400" : "text-gray-500 hover:text-gray-200 hover:bg-gray-800"}`}>
              <CheckCircle size={16} />Homologación SGS
            </button>
          </>
        ) : platform === "administrativo" && (esComindustria || isAdministrativo) ? (
          <>
            <div className="text-xs text-gray-700 font-medium uppercase tracking-wider px-2 mb-2 mt-2">Administrativo</div>
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { id: "directorio", label: "Directorio", icon: Users },
              { id: "admin_descansos", label: "Descansos Médicos", icon: HeartPulse },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => go(id)} className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-left ${page === id ? "bg-emerald-900/40 text-emerald-400" : "text-gray-500 hover:text-gray-200 hover:bg-gray-800"}`}>
                <Icon size={16} />{label}
              </button>
            ))}
          </>
        ) : (
          <>
            <div className="text-xs text-gray-700 font-medium uppercase tracking-wider px-2 mb-2 mt-2">Seguridad y Medio Ambiente</div>
            {SSOMA_NAV.filter(({ id }) => !moduloOculto(id)).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => go(id)} className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-left ${page === id ? "bg-amber-900/40 text-amber-400" : "text-gray-500 hover:text-gray-200 hover:bg-gray-800"}`}>
                <Icon size={16} />{label}
              </button>
            ))}
            {esHydroGlobal && (
              <>
                <div className="text-xs text-gray-700 font-medium uppercase tracking-wider px-2 mt-4 mb-2">Hydro Global</div>
                <button onClick={() => go("hallazgos_hgp")} className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-left ${page === "hallazgos_hgp" ? "bg-amber-900/40 text-amber-400" : "text-gray-500 hover:text-gray-200 hover:bg-gray-800"}`}>
                  <AlertTriangle size={16} />Reporte de Hallazgos
                </button>
              </>
            )}
          </>
        )}
      </nav>

      {/* ── Footer ── */}
      <div className="p-3 border-t border-gray-800 shrink-0">
        <div className="text-xs font-medium text-white mb-0.5 truncate">{profile?.nombre || session.user.email}</div>
        <div className="text-xs text-gray-600 mb-2 truncate">{session.user.email}</div>
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-xs text-gray-700">Tema</span>
          <div className="flex gap-1 ml-1">
            {THEMES.map(t => (
              <button key={t.id} onClick={() => setTheme(t.id)} title={t.label}
                className="w-4 h-4 rounded-full transition-all hover:scale-125"
                style={{ backgroundColor: t.dot, outline: theme === t.id ? "2px solid white" : "2px solid transparent", outlineOffset: "1px", border: t.id === "blanco" ? "1px solid #64748b" : "none" }} />
            ))}
          </div>
        </div>
        <button onClick={logout} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-gray-600 hover:text-red-400 hover:bg-gray-800 transition-colors"><LogOut size={13} /> Cerrar sesión</button>
      </div>
    </>
  );

  return (
    <div className={`flex h-screen bg-gray-950 text-white overflow-hidden t-${theme}`}>

      {/* ── Backdrop móvil ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar desktop (push layout) ── */}
      <aside
        className="hidden md:flex flex-col bg-gray-900 border-r border-gray-800 shrink-0 overflow-hidden transition-all duration-300 ease-in-out"
        style={{ width: sidebarOpen ? "224px" : "0px" }}
      >
        <div style={{ width: "224px", minWidth: "224px" }} className="flex flex-col h-full">
          <SidebarContent />
        </div>
      </aside>

      {/* ── Sidebar móvil (overlay) ── */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-40 flex flex-col bg-gray-900 border-r border-gray-800 overflow-hidden transition-all duration-300 ease-in-out`}
        style={{ width: sidebarOpen ? "240px" : "0px" }}
      >
        <div style={{ width: "240px", minWidth: "240px" }} className="flex flex-col h-full">
          <SidebarContent />
        </div>
      </aside>

      {/* ── Área principal ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="bg-gray-900 border-b border-gray-800 px-3 md:px-4 py-2.5 flex items-center gap-2">

          {/* ── Izquierda: hamburger + título ── */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button onClick={() => setSidebarOpen(v => !v)}
              className={`p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors shrink-0 ${sidebarOpen ? "hidden" : ""}`}>
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="text-sm font-semibold truncate text-gray-300 hidden sm:block">{pageTitles[page] || page}</div>
          </div>

          {/* ── Centro: botón Home (oculto en móvil, ya está en el menú) ── */}
          <button
            onClick={() => setPage("home")}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border shrink-0 ${
              page === "home"
                ? "bg-blue-600 text-white border-blue-500 shadow shadow-blue-500/30"
                : "text-gray-400 border-gray-700 hover:border-gray-600 hover:text-gray-200 hover:bg-gray-800"
            }`}
          >
            <Home size={13} />
            <span>Inicio</span>
          </button>

          {/* ── Derecha: empresa + rol ── */}
          <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
            {/* Selector de empresa: superadmin (todas) o usuario con acceso a varias */}
            {misEmpresas.length > 1 && (
              <div className="flex items-center gap-1.5 min-w-0">
                <Building2 size={12} className="text-gray-600 shrink-0" />
                <select
                  value={profile?.empresa_id || ""}
                  onChange={e => switchEmpresa(e.target.value)}
                  disabled={switching}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50 max-w-[120px] sm:max-w-[140px] min-w-0"
                >
                  {misEmpresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
                {switching && <span className="text-xs text-blue-400 animate-pulse">...</span>}
              </div>
            )}
            {/* Nombre de empresa (solo lectura) cuando el usuario tiene una sola empresa */}
            {misEmpresas.length <= 1 && empresa?.nombre && (
              <div className="flex items-center gap-1.5 shrink-0 max-w-[140px]">
                <Building2 size={12} className="text-gray-600 shrink-0" />
                <span className="text-xs text-gray-500 truncate">{empresa.nombre}</span>
              </div>
            )}
            <span className={`text-xs px-2 py-1 rounded-lg border font-mono shrink-0 ${roleColors[role] || roleColors.SEGURIDAD}`}>{role}</span>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-950">
         <Suspense fallback={<div className="flex items-center justify-center h-96 text-gray-600 text-sm">Cargando módulo...</div>}>
          {page === "home" && <HomeModulo profile={profile} role={role} platform={platform} setPlatform={setPlatform} navigate={navigate} setPage={setPage} empresa={empresa} />}
          {page === "superadmin" && isSuperAdmin && <SuperAdmin />}
          {page === "dashboard" && (platform === "administrativo"
            ? <AdminDashboard workers={workers} empresaId={empresaId} />
            : <Dashboard workers={workers} trainings={trainings} />)}
          {page === "directorio" && <Directorio workers={workers} setWorkers={setWorkers} role={role} empresaId={empresaId} empresa={empresa} adminMode={platform === "administrativo"} />}
          {page === "admin_descansos" && (esComindustria || isAdministrativo) && <DescansosMedicosModulo workers={workers} empresaId={empresaId} />}
          {page === "emo_entregas" && esEntregaEmo && <EmoEntregasModulo workers={workers} empresaId={empresaId} />}
          {page === "capacitaciones" && !saludBloqueado("capacitaciones") && <Capacitaciones workers={workers} trainings={trainings} setTrainings={setTrainings} empresaId={empresaId} empresa={empresa} role={role} />}
          {page === "documentos"    && !saludBloqueado("documentos")    && <Documentos docs={docs} setDocs={setDocs} empresaId={empresaId} />}
          {page === "kpis"          && !saludBloqueado("kpis")          && <KPIs kpis={kpis} setKpis={setKpis} empresaId={empresaId} />}
          {page === "reportes"      && !saludBloqueado("reportes")      && <ReportesModulo workers={workers} trainings={trainings} empresaId={empresaId} empresa={empresa} />}
          {page === "accidentes"    && !saludBloqueado("accidentes")    && <AccidentesModulo workers={workers} empresaId={empresaId} empresa={empresa} />}
          {page === "seguimiento"   && !saludBloqueado("seguimiento")   && <SeguimientoModulo workers={workers} empresaId={empresaId} />}
          {page === "epps"          && !saludBloqueado("epps")          && (esComindustria
            ? <EppInventario empresaId={empresaId} />
            : <EppModulo workers={workers} empresaId={empresaId} />)}
          {page === "monitoreo"     && !saludBloqueado("monitoreo")     && (esComindustria
            ? <MonitoreoComind empresaId={empresaId} />
            : <MonitoreoModulo empresaId={empresaId} />)}
          {page === "vigilancia"    && !saludBloqueado("vigilancia")    && <Vigilancia workers={workers} empresaId={empresaId} />}
          {page === "caracterizacion" && !saludBloqueado("caracterizacion") && <CaracterizacionRiesgoModulo empresaId={empresaId} />}
          {page === "topico"        && !saludBloqueado("topico")        && <TopicoModulo empresaId={empresaId} />}
          {/* Pantalla bloqueada para Hydro Global */}
          {esHydroGlobal && saludBloqueado(page) && (
            <div className="flex flex-col items-center justify-center h-full text-center py-24">
              <Lock size={40} className="text-gray-700 mb-4" />
              <p className="text-gray-500 font-semibold text-sm">Módulo no disponible</p>
              <p className="text-gray-700 text-xs mt-1">Este módulo no está habilitado para tu empresa.</p>
            </div>
          )}
          {page === "ssoma_dashboard" && <SSOMADashboard empresaId={empresaId} workers={workers} onNavigate={go} esOilGas={esOilGas} />}
          {page === "racs"           && <RacsModulo empresaId={empresaId} empresa={empresa} />}
          {page === "triaje"         && <TriajeModulo empresaId={empresaId} empresa={empresa} />}
          {page === "iperc"          && <IpercModulo empresaId={empresaId} />}
          {page === "inspecciones"   && <InspeccionesModulo empresaId={empresaId} empresa={empresa} />}
          {page === "ats"            && !moduloOculto("ats") && <ATSPetarModulo empresaId={empresaId} workers={workers} />}
          {page === "reportes_ssoma" && <ReportesSSOMAModulo empresaId={empresaId} empresa={empresa} workers={workers} />}
          {page === "plan_so" && esMultisel && <PlanSOModulo empresaId={empresaId} />}
          {page === "contratistas" && <ContratistasModulo empresaId={empresaId} />}
          {page === "inversion" && <InversionSST empresaId={empresaId} />}
          {page === "indicadores" && esComindustria && <IndicadoresComind empresaId={empresaId} />}
          {page === "hallazgos_hgp" && esHydroGlobal && <HallazgosHGP empresaId={empresaId} />}
          {page === "homologacion"  && esOilGas      && <HomologacionModulo empresaId={empresaId} />}
          {page === "sig"          && esOilGas && <SIGModulo empresaId={empresaId} />}
         </Suspense>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
