import {
  LayoutDashboard, Users, BookOpen, FileText,
  BarChart2, FileDown, AlertTriangle, Stethoscope,
  Shield, Activity, ClipboardList, ShieldAlert, Building2, CheckCircle, HeartPulse, DollarSign, TrendingUp
} from "lucide-react";

export const THEMES = [
  { id: "blanco",   label: "Blanco",   dot: "#e2e8f0" },
  { id: "obsidian", label: "Obsidian", dot: "#374151" },
  { id: "slate",    label: "Slate",    dot: "#1e3a5f" },
  { id: "violet",   label: "Violeta",  dot: "#3b2d6e" },
  { id: "forest",   label: "Bosque",   dot: "#1a4d2b" },
  { id: "rose",     label: "Carmín",   dot: "#6b1f2e" },
];

export const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "directorio", label: "Directorio", icon: Users },
  { id: "capacitaciones", label: "Capacitaciones", icon: BookOpen },
  { id: "documentos", label: "Documentos", icon: FileText },
  { id: "kpis", label: "KPIs", icon: BarChart2 },
  { id: "topico", label: "Tópico", icon: HeartPulse },
  { id: "reportes", label: "Reportes PDF", icon: FileDown },
];

export const SSOMA_NAV = [
  { id: "ssoma_dashboard",  label: "Dashboard SSOMA", icon: LayoutDashboard },
  { id: "directorio",       label: "Directorio",      icon: Users },
  { id: "accidentes",       label: "Accidentes",      icon: ShieldAlert },
  { id: "racs",             label: "RACs",             icon: AlertTriangle },
  { id: "triaje",           label: "Triaje SSOMA",    icon: Stethoscope },
  { id: "iperc",            label: "IPERC / Riesgos", icon: FileText },
  { id: "inspecciones",     label: "Inspecciones",    icon: ClipboardList },
  { id: "ats",              label: "ATS / PETAR",     icon: CheckCircle },
  { id: "epps",             label: "Control de EPPs", icon: Shield },
  { id: "monitoreo",        label: "Monitoreo",       icon: Activity },
  { id: "contratistas",     label: "Contratistas",    icon: Building2 },
  { id: "inversion",        label: "Inversión SST",   icon: DollarSign },
  { id: "indicadores",      label: "Indicadores SST", icon: TrendingUp },
  { id: "examenes",         label: "Exámenes",        icon: BookOpen },
  { id: "reportes_ssoma",   label: "Reportes PDF",    icon: FileDown },
];
