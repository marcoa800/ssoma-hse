import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { calcularEdad, calcularVigencia } from '../../lib/helpers.js';
import { TRIAJE_CATS, CATEGORIAS_RIESGO, DETALLES_ESPECIFICOS, NIVEL_RIESGO_DESC } from '../../constants/triaje.js';
import { Badge } from '../../components/ui/Badge.jsx';
import { KpiCard } from '../../components/ui/KpiCard.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Btn } from '../../components/ui/Btn.jsx';
import { ExportBtn } from '../../components/ui/ExportBtn.jsx';
import { FilterBar } from '../../components/ui/FilterBar.jsx';
import {
  Plus, Upload, Download, Trash2, Pencil, AlertTriangle, CheckCircle,
  Filter, HelpCircle, Lock, Shield, ClipboardList, ShieldAlert,
  Activity, FileText, Users, LayoutDashboard, Stethoscope, Search,
  ChevronRight, ChevronLeft, Phone, Eye, EyeOff, X, Copy, FileDown,
  Building2, Settings
} from 'lucide-react';

export default function PublicRacForm({ empresaId }) {
  const [sistema, setSistema] = useState("SST");
  const [naturaleza, setNaturaleza] = useState("Acto");
  const [ubicacion, setUbicacion] = useState("");
  const [nombre, setNombre] = useState("");
  const [detalle, setDetalle] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [nivel, setNivel] = useState("Medio");
  const [descripcion, setDescripcion] = useState("");
  const [accion, setAccion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState("");

  const detalles = DETALLES_ESPECIFICOS[`${sistema}-${naturaleza}`] || [];

  const toggleCat = (c) => setCategorias(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);

  const addFoto = (e) => {
    const files = Array.from(e.target.files).slice(0, 2 - fotos.length);
    setFotos(p => [...p, ...files]);
    files.forEach(f => { const r = new FileReader(); r.onload = ev => setPreviews(p => [...p, ev.target.result]); r.readAsDataURL(f); });
    e.target.value = "";
  };
  const removeFoto = (i) => { setFotos(p => p.filter((_, j) => j !== i)); setPreviews(p => p.filter((_, j) => j !== i)); };

  const handleSubmit = async () => {
    if (!ubicacion.trim() || !descripcion.trim()) { setErr("Completa los campos obligatorios: Ubicación y Descripción."); return; }
    setSubmitting(true); setErr("");
    // Subir fotos (si las hay)
    const urls = [];
    for (const f of fotos) {
      const path = `${empresaId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${f.name.split(".").pop()}`;
      const { error: upErr } = await supabase.storage.from("racs-fotos").upload(path, f, { contentType: f.type });
      if (upErr) { console.warn("⚠ Error subiendo foto:", upErr.message); }
      else { const { data: { publicUrl } } = supabase.storage.from("racs-fotos").getPublicUrl(path); urls.push(publicUrl); }
    }
    // Insertar RAC
    const payload = {
      empresa_id: empresaId, sistema, naturaleza, ubicacion,
      nombre_reportante: nombre || null,
      detalle_especifico: detalle || null,
      categorizacion: categorias,
      nivel_riesgo: nivel,
      tipo_reporte: `${sistema} - ${naturaleza}`,
      descripcion,
      accion_inmediata: accion || null,
      foto_url_1: urls[0] || null,
      foto_url_2: urls[1] || null,
      estado: "Abierto",
    };
    console.log("📤 Enviando RAC:", payload);
    const { error: insErr } = await supabase.from("racs").insert(payload);
    setSubmitting(false);
    if (insErr) {
      console.error("❌ Error RAC insert:", insErr);
      // Mensaje amigable según el código de error
      const msgs = {
        "42501": "Permiso denegado (RLS). Contacta al administrador del sistema.",
        "23502": "Falta un campo obligatorio en la base de datos.",
        "23503": "ID de empresa no encontrado. Verifica el enlace QR.",
        "23505": "Ya existe un registro duplicado.",
      };
      const detalle_err = msgs[insErr.code] || insErr.message || "Error desconocido";
      setErr(`Error al enviar (${insErr.code || "?"}): ${detalle_err}`);
      return;
    }
    setSubmitted(true);
  };

  const resetForm = () => { setSistema("SST"); setNaturaleza("Acto"); setUbicacion(""); setNombre(""); setDetalle(""); setCategorias([]); setFotos([]); setPreviews([]); setNivel("Medio"); setDescripcion(""); setAccion(""); setSubmitted(false); };

  if (submitted) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-full bg-emerald-900/40 border border-emerald-700 flex items-center justify-center mb-4">
        <CheckCircle size={32} className="text-emerald-400" />
      </div>
      <h2 className="text-white text-xl font-bold mb-2">¡Reporte enviado!</h2>
      <p className="text-gray-400 text-sm mb-6 max-w-xs">Tu RAC fue registrado exitosamente. El equipo SSOMA lo revisará pronto.</p>
      <button onClick={resetForm} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-semibold text-sm transition-colors">Enviar otro reporte</button>
    </div>
  );

  const btnToggle = (active) => `flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${active ? "" : "text-gray-400 hover:text-white"}`;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-5 text-center">
        <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center text-sm font-bold mx-auto mb-2">S</div>
        <h1 className="text-lg font-bold">REPORTE RAC</h1>
        <p className="text-xs text-gray-500 mt-0.5">Reporte de Acto / Condición Subestándar</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Sistema */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Sistema</p>
          <div className="flex bg-gray-800 rounded-xl p-1 gap-1">
            <button onClick={() => { setSistema("SST"); setDetalle(""); }} className={btnToggle(sistema==="SST") + (sistema==="SST" ? " bg-blue-600 text-white" : "")} >SST</button>
            <button onClick={() => { setSistema("M. Ambiente"); setDetalle(""); }} className={btnToggle(sistema==="M. Ambiente") + (sistema==="M. Ambiente" ? " bg-blue-600 text-white" : "")}>M. Ambiente</button>
          </div>
        </div>

        {/* Naturaleza */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Naturaleza</p>
          <div className="flex bg-gray-800 rounded-xl p-1 gap-1">
            <button onClick={() => { setNaturaleza("Acto"); setDetalle(""); }} className={btnToggle(naturaleza==="Acto") + (naturaleza==="Acto" ? " bg-amber-600 text-white" : "")}>Acto</button>
            <button onClick={() => { setNaturaleza("Condición"); setDetalle(""); }} className={btnToggle(naturaleza==="Condición") + (naturaleza==="Condición" ? " bg-amber-600 text-white" : "")}>Condición</button>
          </div>
        </div>

        {/* Ubicación + Nombre */}
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Ubicación *</p>
            <input value={ubicacion} onChange={e => setUbicacion(e.target.value)} placeholder="¿Dónde ocurrió el acto o condición?" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Tu nombre <span className="normal-case text-gray-600">(opcional)</span></p>
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Su nombre completo" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500" />
          </div>
        </div>

        {/* Detalle específico */}
        {detalles.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Detalle específico</p>
            <select value={detalle} onChange={e => setDetalle(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500">
              <option value="">Seleccione el detalle...</option>
              {detalles.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        )}

        {/* Categorización */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Categorización del riesgo</p>
          <p className="text-xs text-gray-600 mb-3">Identifica el peligro potencial asociado (puedes marcar varios)</p>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIAS_RIESGO.map(cat => (
              <button key={cat} onClick={() => toggleCat(cat)} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs text-left transition-all ${categorias.includes(cat) ? "bg-blue-900/50 border-blue-600 text-blue-300" : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"}`}>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${categorias.includes(cat) ? "bg-blue-600 border-blue-600" : "border-gray-600"}`}>
                  {categorias.includes(cat) && <CheckCircle size={9} className="text-white" />}
                </div>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Fotos */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Evidencia fotográfica</p>
          <p className="text-xs text-gray-600 mb-3">Máximo 2 fotos</p>
          {previews.length > 0 && (
            <div className="flex gap-2 mb-3">
              {previews.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} alt="" className="w-28 h-28 object-cover rounded-xl border border-gray-700" />
                  <button onClick={() => removeFoto(i)} className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center shadow-lg"><XCircle size={13} className="text-white" /></button>
                </div>
              ))}
            </div>
          )}
          {fotos.length < 2 && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col items-center justify-center gap-2 py-5 bg-gray-800 border border-gray-700 border-dashed rounded-xl cursor-pointer hover:border-blue-600 hover:bg-gray-800/60 transition-all">
                <span className="text-2xl">📷</span>
                <span className="text-xs text-gray-400 font-medium">Tomar Foto</span>
                <input type="file" accept="image/*" capture="environment" onChange={addFoto} className="hidden" />
              </label>
              <label className="flex flex-col items-center justify-center gap-2 py-5 bg-gray-800 border border-gray-700 border-dashed rounded-xl cursor-pointer hover:border-blue-600 hover:bg-gray-800/60 transition-all">
                <span className="text-2xl">🖼️</span>
                <span className="text-xs text-gray-400 font-medium">Subir Galería</span>
                <input type="file" accept="image/*" multiple onChange={addFoto} className="hidden" />
              </label>
            </div>
          )}
        </div>

        {/* Nivel de riesgo */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Nivel de riesgo del hallazgo</p>
          <div className="flex bg-gray-800 rounded-xl p-1 gap-1 mb-3">
            {["Bajo","Medio","Alto"].map(n => (
              <button key={n} onClick={() => setNivel(n)} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${nivel===n ? n==="Alto" ? "bg-red-600 text-white shadow" : n==="Medio" ? "bg-amber-500 text-white shadow" : "bg-green-600 text-white shadow" : "text-gray-400 hover:text-white"}`}>{n.toUpperCase()}</button>
            ))}
          </div>
          <div className={`rounded-xl p-4 border text-xs leading-relaxed ${nivel==="Alto" ? "bg-red-900/20 border-red-800 text-red-300" : nivel==="Medio" ? "bg-amber-900/20 border-amber-800 text-amber-300" : "bg-green-900/20 border-green-800 text-green-300"}`}>
            <p className="font-bold mb-1">NIVEL DE RIESGO {nivel.toUpperCase()}</p>
            <p>{NIVEL_RIESGO_DESC[nivel]}</p>
          </div>
        </div>

        {/* Descripción */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Descripción del evento *</p>
          <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={4} placeholder="Detalle adicional del acto o condición observado..." className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none" />
        </div>

        {/* Acción inmediata */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Acción inmediata implementada</p>
          <p className="text-xs text-gray-600 mb-2">Opcional</p>
          <textarea value={accion} onChange={e => setAccion(e.target.value)} rows={3} placeholder="¿Qué medida se tomó al momento del hallazgo?" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none" />
        </div>

        {err && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-red-400">
              <XCircle size={15} /> Error al enviar el reporte
            </div>
            <p className="text-xs text-red-300 leading-relaxed">{err}</p>
            <p className="text-xs text-gray-600 mt-1">
              Captura esta pantalla y envíala al administrador del sistema.
            </p>
          </div>
        )}

        <button onClick={handleSubmit} disabled={submitting} className="w-full py-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-bold text-sm transition-colors shadow-lg">
          {submitting ? "Enviando reporte..." : "GENERAR REPORTE Y CONTINUAR"}
        </button>
        <div className="h-8" />
      </div>
    </div>
  );
}
