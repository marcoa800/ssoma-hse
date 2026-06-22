import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import { TRIAJE_CATS, RED_FLAGS_TRIAJE } from '../../constants/triaje.js';
import {
  AlertTriangle, CheckCircle, ClipboardList, Activity, Stethoscope,
  Search, ChevronRight, Phone, Building2,
} from 'lucide-react';

export default function PublicTriajeForm({ empresaId }) {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [dniInput, setDniInput] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [dniFound, setDniFound] = useState(null); // null | true | false
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [form, setForm] = useState({
    nombre: "", puesto: "",
    temperatura: "", presionArterial: "", saturacion: "", frecuenciaCardiaca: "",
    alergias: "No", alergiasDetalle: "",
    categorias: [], detallesCategoria: {}, banderasRojas: [],
  });
  const fi = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const fd = (k, v) => setForm(f => ({ ...f, detallesCategoria: { ...f.detallesCategoria, [k]: v } }));
  const toggleCat = (k) => setForm(f => ({ ...f, categorias: f.categorias.includes(k) ? f.categorias.filter(c => c !== k) : [...f.categorias, k] }));
  const toggleFlag = (b) => setForm(f => ({ ...f, banderasRojas: f.banderasRojas.includes(b) ? f.banderasRojas.filter(x => x !== b) : [...f.banderasRojas, b] }));

  useEffect(() => {
    if (!empresaId) return;
    supabase.from("empresas").select("nombre").eq("id", empresaId).single()
      .then(({ data }) => { if (data) setEmpresaNombre(data.nombre); });
  }, [empresaId]);

  const goToStep = (n) => {
    setStep(n);
    window.scrollTo(0, 0);
  };

  const lookupDni = async () => {
    if (dniInput.length < 7) return;
    setLookingUp(true); setDniFound(null);
    try {
      const { data } = await supabase.rpc("buscar_trabajador_por_dni", { p_dni: dniInput.trim(), p_empresa_id: empresaId });
      if (data && data.length > 0) {
        fi("nombre", data[0].nombre); fi("puesto", data[0].cargo || "");
        setDniFound(true);
      } else { setDniFound(false); }
    } catch { setDniFound(false); }
    setLookingUp(false);
  };

  const generateReport = () => {
    const vitals = `T:${form.temperatura || "-"}°C | PA:${form.presionArterial || "-"} | Sat:${form.saturacion || "-"}% | FC:${form.frecuenciaCardiaca || "-"}lpm`;
    const catsText = form.categorias.map(k => {
      const cat = TRIAJE_CATS[k];
      const detalles = cat.questions.map(q => form.detallesCategoria[q.key] ? `  - ${q.label}: ${form.detallesCategoria[q.key]}` : "").filter(Boolean).join("\n");
      return `[${cat.label}]\n${detalles || "  (sin detalles adicionales)"}`;
    }).join("\n\n");
    const flags = form.banderasRojas.length > 0 ? `🚨 BANDERAS ROJAS: ${form.banderasRojas.join(" | ")}` : "✅ Sin banderas rojas";
    return `*TRIAJE SSOMA*\n👤 ${form.nombre} — ${form.puesto}\n📊 ${vitals}\n💊 Alergias: ${form.alergias === "Si" ? form.alergiasDetalle : "No"}\n\n📋 CATEGORÍAS:\n${catsText}\n\n${flags}\n\n_Esperando indicaciones médicas._`;
  };

  const handleSubmit = async () => {
    if (!form.nombre.trim()) { setErr("Ingresa el nombre del trabajador."); return; }
    if (form.categorias.length === 0) { setErr("Selecciona al menos una categoría."); return; }
    setSubmitting(true); setErr("");
    const reporte = generateReport();
    const { error } = await supabase.from("triajes").insert({
      empresa_id: empresaId, nombre: form.nombre, puesto: form.puesto,
      dni: dniInput.trim() || null,
      temperatura: form.temperatura ? parseFloat(form.temperatura) : null,
      presion_arterial: form.presionArterial || null,
      saturacion: form.saturacion ? parseFloat(form.saturacion) : null,
      frecuencia_cardiaca: form.frecuenciaCardiaca ? parseFloat(form.frecuenciaCardiaca) : null,
      alergias: form.alergias === "Si" ? form.alergiasDetalle : "No",
      categorias: form.categorias,
      detalles_categoria: form.detallesCategoria,
      banderas_rojas: form.banderasRojas,
      reporte_texto: reporte,
      tiene_emergencia: form.banderasRojas.length > 0,
    });
    setSubmitting(false);
    if (error) { setErr("Error al enviar: " + error.message); return; }
    setSubmitted(true);
  };

  const colorMap = { orange:"bg-orange-100 border-orange-300 text-orange-800", blue:"bg-blue-100 border-blue-300 text-blue-800", green:"bg-green-100 border-green-300 text-green-800", purple:"bg-purple-100 border-purple-300 text-purple-800", yellow:"bg-yellow-100 border-yellow-300 text-yellow-800", red:"bg-red-100 border-red-300 text-red-800", pink:"bg-pink-100 border-pink-300 text-pink-800" };

  const resetForm = () => {
    setSubmitted(false); setStep(1);
    setForm({ nombre:"", puesto:"", temperatura:"", presionArterial:"", saturacion:"", frecuenciaCardiaca:"", alergias:"No", alergiasDetalle:"", categorias:[], detallesCategoria:{}, banderasRojas:[] });
    setDniInput(""); setDniFound(null);
  };

  if (submitted) {
    const reporteWsp = generateReport();
    const wspUrl = `https://wa.me/51982762455?text=${encodeURIComponent(reporteWsp)}`;
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} className="text-green-500" /></div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Reporte enviado</h2>
          {empresaNombre && <p className="text-blue-600 text-xs font-semibold mb-1 flex items-center justify-center gap-1"><Building2 size={12}/>{empresaNombre}</p>}
          <p className="text-gray-500 text-sm mb-4">Triaje de <strong>{form.nombre}</strong> registrado correctamente.</p>
          {form.banderasRojas.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <p className="text-red-700 font-bold text-sm">⚠ EMERGENCIA — Activa los protocolos inmediatamente</p>
            </div>
          )}
          <a href={wspUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-base mb-3 transition-colors shadow-md">
            <Phone size={20} />
            Enviar al médico por WhatsApp
          </a>
          <p className="text-gray-400 text-xs mb-5">Toca el botón para enviar el reporte directamente al Dr. Marco Melgarejo</p>
          <button onClick={resetForm}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors">
            Nuevo Caso
          </button>
        </div>
      </div>
    );
  }

  const steps = ["Paciente", "Categorías", "Detalles", "Resumen"];
  const hasEmergency = form.banderasRojas.length > 0;

  return (
    <div className="min-h-screen bg-slate-100" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", touchAction: 'manipulation' }}>
      {/* Header */}
      <div className="bg-blue-800 text-white px-5 py-4 sticky top-0 z-10 shadow-lg">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-lg font-bold leading-tight">Asistente SSOMA</h1>
            {empresaNombre
              ? <p className="text-blue-200 text-xs flex items-center gap-1"><Building2 size={11}/>{empresaNombre}</p>
              : <p className="text-blue-200 text-xs">Triaje y Reporte Médico</p>}
          </div>
          <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center"><Stethoscope size={20} /></div>
        </div>
        <div className="flex gap-1.5">
          {steps.map((s, i) => (<div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < step ? "bg-green-400" : i === step - 1 ? "bg-white" : "bg-blue-700"}`} />))}
        </div>
        <p className="text-blue-200 text-xs mt-1.5">Paso {step} de {steps.length}: <span className="text-white font-medium">{steps[step-1]}</span></p>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto space-y-4">

        {/* PASO 1 — Paciente + Vitales */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><Search size={16} className="text-blue-500" /> Buscar por DNI</h3>
              <div className="flex gap-2">
                <input type="number" value={dniInput} onChange={e => setDniInput(e.target.value)} onKeyDown={e => e.key === "Enter" && lookupDni()} placeholder="Número de DNI" className="flex-1 border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:border-blue-400" style={{fontSize:"16px"}} />
                <button onClick={lookupDni} disabled={lookingUp || dniInput.length < 7} className="px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-40 text-sm">{lookingUp ? "..." : "Buscar"}</button>
              </div>
              {dniFound === true && <p className="text-green-600 text-xs mt-1.5 font-medium">✓ Trabajador encontrado</p>}
              {dniFound === false && <p className="text-amber-600 text-xs mt-1.5">No encontrado — completa manualmente</p>}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
              <h3 className="font-bold text-gray-700 flex items-center gap-2"><ClipboardList size={16} className="text-blue-500" /> Datos del Paciente</h3>
              <input type="text" value={form.nombre} onChange={e => fi("nombre", e.target.value)} placeholder="Apellidos y Nombres *" className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:border-blue-400" style={{fontSize:"16px"}} />
              <input type="text" value={form.puesto} onChange={e => fi("puesto", e.target.value)} placeholder="Puesto de trabajo" className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:border-blue-400" style={{fontSize:"16px"}} />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><Activity size={16} className="text-blue-500" /> Signos Vitales</h3>
              <div className="grid grid-cols-2 gap-3">
                {[["temperatura","Temp (°C)","number"],["presionArterial","P. Arterial","text"],["saturacion","Sat O₂ (%)","number"],["frecuenciaCardiaca","FC (lpm)","number"]].map(([k,p,t]) => (
                  <input key={k} type={t} value={form[k]} onChange={e => fi(k, e.target.value)} placeholder={p} className="border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:border-blue-400 w-full" style={{fontSize:"16px"}} />
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-bold text-gray-700 mb-2">¿Alergias a medicamentos?</h3>
              <div className="flex gap-4 mb-2">
                {["No","Si"].map(v => <label key={v} className="flex items-center gap-2 text-base cursor-pointer"><input type="radio" name="alergias" checked={form.alergias === v} onChange={() => fi("alergias", v)} className="w-5 h-5" />{v}</label>)}
              </div>
              {form.alergias === "Si" && <input type="text" value={form.alergiasDetalle} onChange={e => fi("alergiasDetalle", e.target.value)} placeholder="¿A qué medicamento?" className="w-full border border-red-300 bg-red-50 rounded-xl px-3 py-3 text-base focus:outline-none" style={{fontSize:"16px"}} />}
            </div>

            <button type="button" onPointerDown={() => { if (!form.nombre.trim()) { setErr("Ingresa el nombre."); return; } setErr(""); goToStep(2); }} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-base shadow-lg flex items-center justify-center gap-2 active:opacity-80 select-none touch-manipulation">Siguiente <ChevronRight size={20} /></button>
            {err && <p className="text-red-500 text-sm text-center">{err}</p>}
          </div>
        )}

        {/* PASO 2 — Categorías (múltiple) */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="flex justify-between items-center"><h3 className="font-bold text-gray-800 text-lg">¿Qué le ocurre?</h3><button type="button" onPointerDown={() => goToStep(1)} className="text-blue-500 text-sm font-medium touch-manipulation">Atrás</button></div>
            <p className="text-gray-500 text-sm">Puedes seleccionar <strong>más de una opción</strong>.</p>
            {Object.entries(TRIAJE_CATS).map(([k, cat]) => {
              const sel = form.categorias.includes(k);
              return (
                <button key={k} onClick={() => toggleCat(k)} className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${sel ? `${colorMap[cat.color]} border-current shadow-md` : "bg-white border-gray-100 hover:border-gray-300"}`}>
                  <span className="text-2xl">{cat.icon}</span>
                  <span className={`font-bold text-base ${sel ? "" : "text-gray-700"}`}>{cat.label}</span>
                  {sel && <span className="ml-auto text-lg">✓</span>}
                </button>
              );
            })}
            <button type="button" onPointerDown={() => { if (form.categorias.length === 0) { setErr("Selecciona al menos una categoría."); return; } setErr(""); goToStep(3); }} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-base shadow-lg flex items-center justify-center gap-2 mt-2 active:opacity-75 select-none touch-manipulation">Siguiente <ChevronRight size={20} /></button>
            {err && <p className="text-red-500 text-sm text-center">{err}</p>}
          </div>
        )}

        {/* PASO 3 — Detalles + Banderas rojas */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center"><h3 className="font-bold text-gray-800 text-lg">Detalles del Caso</h3><button type="button" onPointerDown={() => goToStep(2)} className="text-blue-500 text-sm font-medium touch-manipulation">Atrás</button></div>
            {form.categorias.map(k => {
              const cat = TRIAJE_CATS[k];
              return (
                <div key={k} className={`bg-white rounded-2xl shadow-sm border-2 p-4 space-y-3 ${colorMap[cat.color].split(" ").find(c => c.startsWith("border")) || "border-gray-200"}`}>
                  <h4 className="font-bold text-gray-700">{cat.icon} {cat.label}</h4>
                  {cat.questions.map(q => (
                    <div key={q.key}>
                      <label className="block text-sm font-semibold text-gray-600 mb-1">{q.label}</label>
                      {q.type === "select" ? (
                        <select value={form.detallesCategoria[q.key] || ""} onChange={e => fd(q.key, e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base bg-gray-50 focus:outline-none focus:border-blue-400" style={{fontSize:"16px"}}>
                          <option value="">— Seleccionar —</option>
                          {q.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input type={q.type} value={form.detallesCategoria[q.key] || ""} onChange={e => fd(q.key, e.target.value)} placeholder="..." className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base bg-gray-50 focus:outline-none focus:border-blue-400" style={{fontSize:"16px"}} />
                      )}
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Banderas rojas */}
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
              <h4 className="font-bold text-red-800 mb-1 flex items-center gap-2"><AlertTriangle size={18} /> Banderas Rojas</h4>
              <p className="text-red-600 text-xs mb-3">Marca si alguno de estos signos está presente. Activan protocolo de emergencia.</p>
              <div className="space-y-2">
                {RED_FLAGS_TRIAJE.map(({ flag, desc }) => (
                  <label key={flag} className={`flex gap-3 p-3 rounded-xl cursor-pointer transition-all ${form.banderasRojas.includes(flag) ? "bg-red-100 border border-red-300" : "bg-white border border-gray-200"}`}>
                    <input type="checkbox" checked={form.banderasRojas.includes(flag)} onChange={() => toggleFlag(flag)} className="w-5 h-5 mt-0.5 accent-red-600 shrink-0" />
                    <div>
                      <p className={`text-sm font-bold ${form.banderasRojas.includes(flag) ? "text-red-700" : "text-gray-700"}`}>{flag}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {err && <p className="text-red-500 text-sm text-center">{err}</p>}
            <button type="button" onPointerDown={() => { setErr(""); goToStep(4); }} className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold text-base shadow-lg flex items-center justify-center gap-2 active:opacity-75 select-none touch-manipulation">Ver Resumen <ChevronRight size={20} /></button>
          </div>
        )}

        {/* PASO 4 — Resumen + Envío */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center"><h3 className="font-bold text-gray-800 text-lg">Resumen del Triaje</h3><button type="button" onPointerDown={() => goToStep(3)} className="text-blue-500 text-sm font-medium touch-manipulation">Atrás</button></div>

            {hasEmergency && (
              <div className="bg-red-600 text-white rounded-2xl p-5 shadow-xl">
                <h2 className="text-xl font-black flex items-center gap-2 mb-3"><AlertTriangle size={22} /> ¡EMERGENCIA DETECTADA!</h2>
                <div className="bg-white text-red-700 rounded-xl p-3 font-bold text-center text-sm">1. LLAMAR AMBULANCIA · 2. AVISAR AL MÉDICO · 3. NO DAR MEDICACIÓN</div>
                <ul className="mt-3 space-y-1">{form.banderasRojas.map(f => <li key={f} className="text-sm text-red-100">⚠ {f}</li>)}</ul>
              </div>
            )}

            {form.categorias.map(k => {
              const cat = TRIAJE_CATS[k];
              return (
                <div key={k} className={`border rounded-2xl p-4 ${colorMap[cat.color]}`}>
                  <h4 className="font-bold mb-2">{cat.icon} Acciones — {cat.label}</h4>
                  <ul className="space-y-2">{cat.actions.map((a, i) => <li key={i} className="flex gap-2 text-sm"><span className="font-bold bg-white/70 w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0">{i+1}</span>{a}</li>)}</ul>
                </div>
              );
            })}

            <div className="bg-gray-900 rounded-2xl p-4">
              <p className="text-gray-400 text-xs font-semibold mb-2 flex items-center gap-1.5"><Phone size={12} /> Vista previa del reporte</p>
              <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap bg-black/30 rounded-xl p-3 leading-relaxed">{generateReport()}</pre>
            </div>

            {err && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">{err}</div>}
            <button onClick={handleSubmit} disabled={submitting} className={`w-full py-4 rounded-2xl font-bold text-base shadow-lg flex items-center justify-center gap-2 active:opacity-75 select-none touch-manipulation ${hasEmergency ? "bg-red-600 text-white" : "bg-green-600 text-white"} disabled:opacity-50`}>
              {submitting ? "Enviando..." : hasEmergency ? "🚨 Enviar Emergencia" : "✓ Enviar Reporte"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
