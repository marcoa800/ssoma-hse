import { useState, useEffect } from 'react';
import { supabase, puedeEliminar } from '../../../lib/supabase.js';
import { showToast } from '../../../lib/toast.jsx';
import { fmtFecha, PERIODICIDADES, proximoControl, estadoControl } from '../../../lib/helpers.js';
import { VIG_GUIAS } from '../../../constants/vig-guias.js';
import { VigGuideModal } from './VigGuideModal.jsx';
import SeguimientoPanel from './SeguimientoPanel.jsx';
import CronogramaActividades from './CronogramaActividades.jsx';
import { Badge } from '../../../components/ui/Badge.jsx';
import { KpiCard } from '../../../components/ui/KpiCard.jsx';
import { Modal } from '../../../components/ui/Modal.jsx';
import { FormField } from '../../../components/ui/FormField.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { Btn } from '../../../components/ui/Btn.jsx';
import { ExportBtn } from '../../../components/ui/ExportBtn.jsx';
import { FilterBar } from '../../../components/ui/FilterBar.jsx';
import { Plus, Pencil, Trash2, AlertTriangle, HelpCircle, Lock } from 'lucide-react';

export default function EstilosVidaModulo({ workers, empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const initForm = { trabajador_id: "", fecha_evaluacion: new Date().toISOString().split("T")[0], peso: "", talla: "", perimetro_abdominal: "", presion_sistolica: "", presion_diastolica: "", frecuencia_cardiaca: "", glucosa: "", fumador: false, tabaco_frecuencia: "", tabaco_cantidad: "", consume_alcohol: false, alcohol_tipo: "", alcohol_frecuencia: "", sedentario: false, nivel_actividad: "Moderado", actividad_frecuencia: "", periodicidad: "Anual", observaciones: "", medico_responsable: "" };
  const TABACO_FREC = ["Diario", "Ocasional", "Social", "Ex-fumador"];
  const ALCOHOL_TIPO = ["Cerveza", "Vino", "Licores / Destilados", "Mixto"];
  const ALCOHOL_FREC = ["Diario", "Semanal", "Quincenal", "Ocasional", "Social"];
  const ACT_FREC = ["No realiza", "1-2 veces/semana", "3-4 veces/semana", "5+ veces/semana"];
  const [form, setForm] = useState(initForm);
  const [subtab, setSubtab] = useState("eval");
  const [showGuide, setShowGuide] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vigilancia_estilos_vida")
      .select("*, trabajadores(nombre, genero)")
      .eq("empresa_id", empresaId)
      .order("fecha_evaluacion", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const calcIMC = (peso, talla) => {
    const p = parseFloat(peso); const t = parseFloat(talla);
    if (!p || !t || t <= 0) return null;
    return (p / (t * t)).toFixed(1);
  };

  const getIMCCategoria = (imc) => {
    const v = parseFloat(imc);
    if (!v) return { label: "—", color: "gray" };
    if (v < 18.5) return { label: "Bajo peso", color: "blue" };
    if (v < 25) return { label: "Normal", color: "green" };
    if (v < 30) return { label: "Sobrepeso", color: "amber" };
    if (v < 35) return { label: "Obesidad grado I", color: "orange" };
    if (v < 40) return { label: "Obesidad grado II", color: "red" };
    return { label: "Obesidad grado III", color: "red" };
  };

  // Riesgo metabólico por circunferencia abdominal (OMS), según género
  const esFemenino = (g) => { const s = (g || "").trim().toLowerCase(); return s === "f" || s.startsWith("fem") || s.startsWith("muj"); };
  const getCinturaRiesgo = (cm, genero) => {
    const v = parseFloat(cm);
    if (!v) return { label: "—", color: "gray" };
    if (!genero) return { label: "Registrar género", color: "gray" };
    const f = esFemenino(genero);
    if (v >= (f ? 88 : 102)) return { label: "Riesgo muy aumentado", color: "red" };
    if (v >= (f ? 80 : 94))  return { label: "Riesgo aumentado", color: "amber" };
    return { label: "Bajo riesgo", color: "green" };
  };

  const getFCCategoria = (fc) => {
    const v = parseInt(fc);
    if (!v) return { label: "—", color: "gray" };
    if (v < 60) return { label: "Bradicardia", color: "amber" };
    if (v > 100) return { label: "Taquicardia", color: "amber" };
    return { label: "Normal", color: "green" };
  };

  const getPresionCategoria = (sis, dia) => {
    const s = parseInt(sis); const d = parseInt(dia);
    if (!s || !d) return { label: "—", color: "gray" };
    if (s >= 140 || d >= 90) return { label: "HTA Grado 2", color: "red" };
    if (s >= 130 || d >= 80) return { label: "HTA Grado 1", color: "amber" };
    return { label: "Normal", color: "green" };
  };

  const getGlucosaCategoria = (g) => {
    const v = parseFloat(g);
    if (!v) return { label: "—", color: "gray" };
    if (v >= 126) return { label: "Diabetes", color: "red" };
    if (v >= 100) return { label: "Prediabetes", color: "amber" };
    return { label: "Normal", color: "green" };
  };

  const imcPreview = calcIMC(form.peso, form.talla);
  const selWorker = workers.find(w => w.id === form.trabajador_id);
  const cinturaPreview = getCinturaRiesgo(form.perimetro_abdominal, selWorker?.genero);
  // Género vigente del directorio (no la copia del join), para que se refleje al instante
  const generoDe = (r) => workers.find(w => w.id === r.trabajador_id)?.genero || r.trabajadores?.genero;

  const handleSave = async () => {
    if (!form.trabajador_id || !form.fecha_evaluacion) {
      showToast("Selecciona trabajador y fecha", "error"); return;
    }
    const imc = calcIMC(form.peso, form.talla);
    setSaving(true);
    const payload = { empresa_id: empresaId, trabajador_id: form.trabajador_id, fecha_evaluacion: form.fecha_evaluacion, peso: form.peso ? parseFloat(form.peso) : null, talla: form.talla ? parseFloat(form.talla) : null, imc: imc ? parseFloat(imc) : null, perimetro_abdominal: form.perimetro_abdominal ? parseFloat(form.perimetro_abdominal) : null, presion_sistolica: form.presion_sistolica ? parseInt(form.presion_sistolica) : null, presion_diastolica: form.presion_diastolica ? parseInt(form.presion_diastolica) : null, frecuencia_cardiaca: form.frecuencia_cardiaca ? parseInt(form.frecuencia_cardiaca) : null, glucosa: form.glucosa ? parseFloat(form.glucosa) : null, fumador: form.fumador, tabaco_frecuencia: form.fumador ? (form.tabaco_frecuencia || null) : null, tabaco_cantidad: form.fumador ? (form.tabaco_cantidad || null) : null, consume_alcohol: form.consume_alcohol, alcohol_tipo: form.consume_alcohol ? (form.alcohol_tipo || null) : null, alcohol_frecuencia: form.consume_alcohol ? (form.alcohol_frecuencia || null) : null, sedentario: form.sedentario, nivel_actividad: form.nivel_actividad, actividad_frecuencia: form.actividad_frecuencia || null, periodicidad: form.periodicidad, proximo_control: proximoControl(form.fecha_evaluacion, form.periodicidad), observaciones: form.observaciones, medico_responsable: form.medico_responsable };
    const { error } = editing ? await supabase.from("vigilancia_estilos_vida").update(payload).eq("id", editing) : await supabase.from("vigilancia_estilos_vida").insert(payload);
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast(editing ? "Registro actualizado" : "Evaluación registrada", "success");
    closeModal(); load();
  };
  const openEdit = (r) => { setForm({ trabajador_id: r.trabajador_id, fecha_evaluacion: r.fecha_evaluacion, peso: r.peso != null ? String(r.peso) : "", talla: r.talla != null ? String(r.talla) : "", perimetro_abdominal: r.perimetro_abdominal != null ? String(r.perimetro_abdominal) : "", presion_sistolica: r.presion_sistolica != null ? String(r.presion_sistolica) : "", presion_diastolica: r.presion_diastolica != null ? String(r.presion_diastolica) : "", frecuencia_cardiaca: r.frecuencia_cardiaca != null ? String(r.frecuencia_cardiaca) : "", glucosa: r.glucosa != null ? String(r.glucosa) : "", fumador: r.fumador || false, tabaco_frecuencia: r.tabaco_frecuencia || "", tabaco_cantidad: r.tabaco_cantidad || "", consume_alcohol: r.consume_alcohol || false, alcohol_tipo: r.alcohol_tipo || "", alcohol_frecuencia: r.alcohol_frecuencia || "", sedentario: r.sedentario || false, nivel_actividad: r.nivel_actividad || "Moderado", actividad_frecuencia: r.actividad_frecuencia || "", periodicidad: r.periodicidad || "Anual", observaciones: r.observaciones || "", medico_responsable: r.medico_responsable || "" }); setEditing(r.id); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(initForm); };
  const handleDelete = async (id) => { if (!confirm("¿Eliminar este registro?")) return; await supabase.from("vigilancia_estilos_vida").delete().eq("id", id); showToast("Eliminado", "info"); load(); };

  const [sort, setSort] = useState("fecha");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  const now = new Date();
  const thisMes = records.filter(r => { const d = new Date(r.fecha_evaluacion); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const conSobrepeso = records.filter(r => r.imc && r.imc >= 25);
  const conHabitos = records.filter(r => r.fumador || r.consume_alcohol);

  const filtered = records.filter(r => (!fFrom || r.fecha_evaluacion >= fFrom) && (!fTo || r.fecha_evaluacion <= fTo))
    .sort((a, b) => {
      if (sort === "az" || sort === "za") {
        const na = (a.trabajadores?.nombre || "").toLowerCase(), nb = (b.trabajadores?.nombre || "").toLowerCase();
        return sort === "az" ? na.localeCompare(nb, "es") : nb.localeCompare(na, "es");
      }
      return 0;
    });

  return (
    <div>
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Estilos de Vida Saludable</h3>
          <p className="text-gray-500 text-xs max-w-xl">IMC, presión arterial, glucosa y hábitos de riesgo. Cálculo automático de categorías según rangos clínicos.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <Btn size="sm" onClick={() => setShowGuide(true)}><HelpCircle size={13} /> Guía</Btn>
          {subtab === "eval" && <>
            <ExportBtn data={records.map(r => ({ Trabajador: r.trabajadores?.nombre || "", Fecha: r.fecha_evaluacion, Peso: r.peso ?? "", Talla: r.talla ?? "", IMC: r.imc ?? "", "Categoría IMC": getIMCCategoria(r.imc).label, "Perímetro Abd.": r.perimetro_abdominal ?? "", "Riesgo Cintura (OMS)": getCinturaRiesgo(r.perimetro_abdominal, generoDe(r)).label, "PA Sistólica": r.presion_sistolica ?? "", "PA Diastólica": r.presion_diastolica ?? "", "Frec. Cardíaca": r.frecuencia_cardiaca ?? "", Glucosa: r.glucosa ?? "", Fumador: r.fumador ? "Sí" : "No", "Tabaco frec.": r.tabaco_frecuencia || "", "Cigarrillos/día": r.tabaco_cantidad || "", Alcohol: r.consume_alcohol ? "Sí" : "No", "Alcohol tipo": r.alcohol_tipo || "", "Alcohol frec.": r.alcohol_frecuencia || "", "Actividad física": r.nivel_actividad || "", "Frec. actividad": r.actividad_frecuencia || "", Sedentario: r.sedentario ? "Sí" : "No" }))} filename="estilos_vida" />
            <Btn size="sm" variant="primary" onClick={() => { setEditing(null); setForm(initForm); setShowModal(true); }}><Plus size={13} /> Nueva Evaluación</Btn>
          </>}
        </div>
      </div>

      {/* Pestañas internas */}
      <div className="flex gap-1.5 bg-gray-900/60 border border-gray-800 rounded-lg p-1 mb-5 w-fit flex-wrap">
        {[["eval", "Evaluaciones"], ["controles", "Controles"], ["cronograma", "Cronograma de Actividades"]].map(([k, l]) => (
          <button key={k} onClick={() => setSubtab(k)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${subtab === k ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-200"}`}>{l}</button>
        ))}
      </div>

      {showGuide && <VigGuideModal titulo={VIG_GUIAS.estilos.titulo} campos={VIG_GUIAS.estilos.campos} onClose={() => setShowGuide(false)} />}

      {subtab === "controles" && <SeguimientoPanel programa="estilos" empresaId={empresaId} workers={workers} autoImc campos={[
        { key: "peso", label: "Peso (kg)", type: "number", step: "0.1", suffix: " kg" },
        { key: "talla", label: "Talla (m)", type: "number", step: "0.01", suffix: " m" },
        { key: "presion", label: "Presión arterial", type: "text", placeholder: "120/80" },
        { key: "glucosa", label: "Glucosa (mg/dL)", type: "number", suffix: " mg/dL" },
        { key: "perimetro", label: "Perímetro abdominal (cm)", type: "number", suffix: " cm" },
      ]} />}
      {subtab === "cronograma" && <CronogramaActividades programa="estilos" empresaId={empresaId} workers={workers} />}

      {subtab === "eval" && <>
      <div className="grid grid-cols-3 gap-4 mb-5">
        <KpiCard label="Evaluaciones este mes" value={thisMes.length} sub="Registros del mes actual" accentColor="blue" />
        <KpiCard label="Sobrepeso / Obesidad" value={conSobrepeso.length} sub="IMC ≥ 25" accentColor="amber" />
        <KpiCard label="Con hábitos de riesgo" value={conHabitos.length} sub="Fumador y/o alcohol" accentColor="red" />
      </div>

      <FilterBar dateFrom={fFrom} dateTo={fTo} onDateFrom={setFFrom} onDateTo={setFTo} sort={sort} onSort={setSort} />

      {/* Móvil: tarjetas */}
      <div className="md:hidden space-y-2.5">
        {!loading && filtered.map(r => {
          const imcCat = getIMCCategoria(r.imc);
          const presCat = getPresionCategoria(r.presion_sistolica, r.presion_diastolica);
          const glucCat = getGlucosaCategoria(r.glucosa);
          const cintCat = getCinturaRiesgo(r.perimetro_abdominal, generoDe(r));
          const fcCat = getFCCategoria(r.frecuencia_cardiaca);
          const habitos = [
            r.fumador && ("Fumador" + (r.tabaco_frecuencia || r.tabaco_cantidad ? ` (${[r.tabaco_frecuencia, r.tabaco_cantidad && `${r.tabaco_cantidad}/día`].filter(Boolean).join(", ")})` : "")),
            r.consume_alcohol && ("Alcohol" + (r.alcohol_tipo || r.alcohol_frecuencia ? ` (${[r.alcohol_tipo, r.alcohol_frecuencia].filter(Boolean).join(", ")})` : "")),
            r.sedentario && "Sedentario",
          ].filter(Boolean);
          const ec = estadoControl(r.proximo_control);
          return (
            <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3.5">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <div className="font-semibold text-white text-sm leading-tight">{r.trabajadores?.nombre || "—"}</div>
                  <div className="text-xs text-gray-500 font-mono mt-0.5">{fmtFecha(r.fecha_evaluacion)}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400"><Pencil size={14} /></button>
                  {puedeEliminar() && (
                  <button onClick={() => handleDelete(r.id)} className="text-red-500/50 hover:text-red-400"><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {r.imc != null && <Badge color={imcCat.color}>IMC {r.imc} · {imcCat.label}</Badge>}
                {r.perimetro_abdominal != null && <Badge color={cintCat.color}>Cintura {r.perimetro_abdominal} · {cintCat.label}</Badge>}
                {r.presion_sistolica && <Badge color={presCat.color}>{r.presion_sistolica}/{r.presion_diastolica} {presCat.label}</Badge>}
                {r.frecuencia_cardiaca && <Badge color={fcCat.color}>FC {r.frecuencia_cardiaca} {fcCat.label}</Badge>}
                {r.glucosa && <Badge color={glucCat.color}>Glu {r.glucosa} {glucCat.label}</Badge>}
                {ec && <Badge color={ec.color}>Control {ec.label}</Badge>}
              </div>
              {habitos.length > 0 && <div className="flex flex-wrap gap-1.5 mb-1">{habitos.map(h => <Badge key={h} color="orange">{h}</Badge>)}</div>}
              {r.proximo_control && <div className="text-xs text-gray-400">Próximo control: <span className="font-mono">{fmtFecha(r.proximo_control)}</span></div>}
              {r.observaciones && <div className="text-xs text-gray-500 mt-1">{r.observaciones}</div>}
            </div>
          );
        })}
        {!loading && !filtered.length && <div className="text-center text-gray-600 text-sm py-8 bg-gray-900 border border-gray-800 rounded-xl">{records.length ? "Sin resultados para el filtro." : "Sin evaluaciones registradas."}</div>}
      </div>

      {/* Escritorio: tabla */}
      <div className="hidden md:block bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {["Trabajador", "Fecha", "IMC", "Categoría", "Cintura", "Presión Art.", "FC", "Glucosa", "Hábitos Riesgo", "Próximo Control", ""].map(h => (
                <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
            {!loading && filtered.map(r => {
              const imcCat = getIMCCategoria(r.imc);
              const presCat = getPresionCategoria(r.presion_sistolica, r.presion_diastolica);
              const glucCat = getGlucosaCategoria(r.glucosa);
              const cintCat = getCinturaRiesgo(r.perimetro_abdominal, generoDe(r));
              const fcCat = getFCCategoria(r.frecuencia_cardiaca);
              const habitos = [
            r.fumador && ("Fumador" + (r.tabaco_frecuencia || r.tabaco_cantidad ? ` (${[r.tabaco_frecuencia, r.tabaco_cantidad && `${r.tabaco_cantidad}/día`].filter(Boolean).join(", ")})` : "")),
            r.consume_alcohol && ("Alcohol" + (r.alcohol_tipo || r.alcohol_frecuencia ? ` (${[r.alcohol_tipo, r.alcohol_frecuencia].filter(Boolean).join(", ")})` : "")),
            r.sedentario && "Sedentario",
          ].filter(Boolean);
              const ec = estadoControl(r.proximo_control);
              return (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{r.trabajadores?.nombre || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{fmtFecha(r.fecha_evaluacion)}</td>
                  <td className="px-4 py-3 font-mono font-bold text-sm text-gray-200">{r.imc ?? "—"}</td>
                  <td className="px-4 py-3"><Badge color={imcCat.color}>{imcCat.label}</Badge></td>
                  <td className="px-4 py-3">
                    {r.perimetro_abdominal != null ? (
                      <span className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-gray-300">{r.perimetro_abdominal}</span>
                        <Badge color={cintCat.color}>{cintCat.label}</Badge>
                      </span>
                    ) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.presion_sistolica ? (
                      <span className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-gray-300">{r.presion_sistolica}/{r.presion_diastolica}</span>
                        <Badge color={presCat.color}>{presCat.label}</Badge>
                      </span>
                    ) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.frecuencia_cardiaca ? (
                      <span className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-gray-300">{r.frecuencia_cardiaca}</span>
                        <Badge color={fcCat.color}>{fcCat.label}</Badge>
                      </span>
                    ) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.glucosa ? (
                      <span className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-gray-300">{r.glucosa}</span>
                        <Badge color={glucCat.color}>{glucCat.label}</Badge>
                      </span>
                    ) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {habitos.length ? habitos.map(h => <Badge key={h} color="orange">{h}</Badge>) : <span className="text-gray-600 text-xs">Ninguno</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.proximo_control ? <span className="flex items-center gap-1.5 text-xs"><span className="font-mono text-gray-400">{fmtFecha(r.proximo_control)}</span>{ec && <Badge color={ec.color}>{ec.label}</Badge>}</span> : <span className="text-gray-600 text-xs">—</span>}</td>
                  <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button>{puedeEliminar() && (<button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>)}</div></td>
                </tr>
              );
            })}
            {!loading && !filtered.length && (
              <tr><td colSpan={11} className="px-4 py-12 text-center text-gray-600 text-sm">{records.length ? "Sin resultados para el filtro aplicado." : "Sin evaluaciones. Usa \"Nueva Evaluación\" para comenzar."}</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
      </>}

      {showModal && (
        <Modal title={editing ? "Editar — Estilos de Vida Saludable" : "Nueva Evaluación — Estilos de Vida Saludable"} onClose={closeModal} wide>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Trabajador *">
              <Select value={form.trabajador_id} onChange={e => setForm({ ...form, trabajador_id: e.target.value })}>
                <option value="">Seleccionar...</option>
                {workers.filter(w => w.estado !== "Cesado").sort((a,b)=>a.nombre.localeCompare(b.nombre,"es")).map(w => <option key={w.id} value={w.id}>{w.nombre}</option>)}
                  {workers.some(w => w.estado === "Cesado") && <option disabled>── Cesados ──</option>}
                  {workers.filter(w => w.estado === "Cesado").sort((a,b)=>a.nombre.localeCompare(b.nombre,"es")).map(w => <option key={w.id} value={w.id}>{w.nombre} (Cesado)</option>)}
              </Select>
            </FormField>
            <FormField label="Fecha de Evaluación *">
              <Input type="date" value={form.fecha_evaluacion} onChange={e => setForm({ ...form, fecha_evaluacion: e.target.value })} />
            </FormField>

            <div className="col-span-2">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Antropometría</p>
              <div className="grid grid-cols-3 gap-3">
                <FormField label="Peso (kg)">
                  <Input type="number" step="0.1" placeholder="70.5" value={form.peso} onChange={e => setForm({ ...form, peso: e.target.value })} />
                </FormField>
                <FormField label="Talla (m)">
                  <Input type="number" step="0.01" placeholder="1.70" value={form.talla} onChange={e => setForm({ ...form, talla: e.target.value })} />
                </FormField>
                <FormField label="IMC (calculado)">
                  <div className="flex items-center gap-2 h-9 px-3 bg-gray-800 border border-gray-700 rounded-lg">
                    <span className={`font-mono font-bold text-sm ${imcPreview ? getIMCCategoria(imcPreview).color === "red" ? "text-red-400" : getIMCCategoria(imcPreview).color === "amber" ? "text-amber-400" : getIMCCategoria(imcPreview).color === "green" ? "text-emerald-400" : "text-blue-400" : "text-gray-600"}`}>
                      {imcPreview ?? "—"}
                    </span>
                    {imcPreview && <Badge color={getIMCCategoria(imcPreview).color}>{getIMCCategoria(imcPreview).label}</Badge>}
                  </div>
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <FormField label="Perímetro Abdominal (cm)">
                  <Input type="number" step="0.5" placeholder="90" value={form.perimetro_abdominal} onChange={e => setForm({ ...form, perimetro_abdominal: e.target.value })} />
                </FormField>
                <FormField label="Riesgo metabólico (OMS · según género)">
                  <div className="flex items-center gap-2 h-9 px-3 bg-gray-800 border border-gray-700 rounded-lg">
                    {form.perimetro_abdominal ? <Badge color={cinturaPreview.color}>{cinturaPreview.label}</Badge> : <span className="text-gray-600 text-sm">—</span>}
                    {selWorker?.genero && <span className="text-[11px] text-gray-500">{esFemenino(selWorker.genero) ? "♀ mujer" : "♂ hombre"}</span>}
                  </div>
                </FormField>
              </div>
            </div>

            <div className="col-span-2">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Signos Vitales / Laboratorio</p>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Presión Sistólica (mmHg)">
                  <Input type="number" placeholder="120" value={form.presion_sistolica} onChange={e => setForm({ ...form, presion_sistolica: e.target.value })} />
                </FormField>
                <FormField label="Presión Diastólica (mmHg)">
                  <Input type="number" placeholder="80" value={form.presion_diastolica} onChange={e => setForm({ ...form, presion_diastolica: e.target.value })} />
                </FormField>
                <FormField label="Frecuencia Cardíaca (lpm)">
                  <div className="flex items-center gap-2">
                    <Input type="number" placeholder="72" value={form.frecuencia_cardiaca} onChange={e => setForm({ ...form, frecuencia_cardiaca: e.target.value })} />
                    {form.frecuencia_cardiaca && <Badge color={getFCCategoria(form.frecuencia_cardiaca).color}>{getFCCategoria(form.frecuencia_cardiaca).label}</Badge>}
                  </div>
                </FormField>
                <FormField label="Glucosa en Ayunas (mg/dL)">
                  <Input type="number" placeholder="90" value={form.glucosa} onChange={e => setForm({ ...form, glucosa: e.target.value })} />
                </FormField>
              </div>
            </div>

            <div className="col-span-2">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Hábitos y Estilo de Vida</p>

              {/* Actividad física */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <FormField label="Nivel de Actividad Física">
                  <Select value={form.nivel_actividad} onChange={e => setForm({ ...form, nivel_actividad: e.target.value })}>
                    <option>Sedentario</option><option>Leve</option><option>Moderado</option><option>Intenso</option>
                  </Select>
                </FormField>
                <FormField label="Frecuencia de actividad">
                  <Select value={form.actividad_frecuencia} onChange={e => setForm({ ...form, actividad_frecuencia: e.target.value })}>
                    <option value="">Sin especificar</option>
                    {ACT_FREC.map(o => <option key={o} value={o}>{o}</option>)}
                  </Select>
                </FormField>
              </div>

              {/* Tabaco */}
              <div className="bg-gray-800/40 border border-gray-800 rounded-lg p-3 mb-3">
                <label className="flex items-center gap-2 cursor-pointer mb-1">
                  <input type="checkbox" checked={form.fumador} onChange={e => setForm({ ...form, fumador: e.target.checked })} className="w-3.5 h-3.5 rounded accent-blue-500" />
                  <span className="text-sm text-gray-300 font-medium">Tabaco / Fumador</span>
                </label>
                {form.fumador && (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <FormField label="Frecuencia">
                      <Select value={form.tabaco_frecuencia} onChange={e => setForm({ ...form, tabaco_frecuencia: e.target.value })}>
                        <option value="">Seleccionar...</option>
                        {TABACO_FREC.map(o => <option key={o} value={o}>{o}</option>)}
                      </Select>
                    </FormField>
                    <FormField label="Cigarrillos por día">
                      <Input type="number" min="0" placeholder="Ej. 5" value={form.tabaco_cantidad} onChange={e => setForm({ ...form, tabaco_cantidad: e.target.value })} />
                    </FormField>
                  </div>
                )}
              </div>

              {/* Alcohol */}
              <div className="bg-gray-800/40 border border-gray-800 rounded-lg p-3 mb-3">
                <label className="flex items-center gap-2 cursor-pointer mb-1">
                  <input type="checkbox" checked={form.consume_alcohol} onChange={e => setForm({ ...form, consume_alcohol: e.target.checked })} className="w-3.5 h-3.5 rounded accent-blue-500" />
                  <span className="text-sm text-gray-300 font-medium">Consume alcohol</span>
                </label>
                {form.consume_alcohol && (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <FormField label="Tipo de bebida">
                      <Select value={form.alcohol_tipo} onChange={e => setForm({ ...form, alcohol_tipo: e.target.value })}>
                        <option value="">Seleccionar...</option>
                        {ALCOHOL_TIPO.map(o => <option key={o} value={o}>{o}</option>)}
                      </Select>
                    </FormField>
                    <FormField label="Frecuencia">
                      <Select value={form.alcohol_frecuencia} onChange={e => setForm({ ...form, alcohol_frecuencia: e.target.value })}>
                        <option value="">Seleccionar...</option>
                        {ALCOHOL_FREC.map(o => <option key={o} value={o}>{o}</option>)}
                      </Select>
                    </FormField>
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.sedentario} onChange={e => setForm({ ...form, sedentario: e.target.checked })} className="w-3.5 h-3.5 rounded accent-blue-500" />
                <span className="text-xs text-gray-400">Sedentario</span>
              </label>
            </div>

            <FormField label="Médico Responsable">
              <Input placeholder="Nombre del médico" value={form.medico_responsable} onChange={e => setForm({ ...form, medico_responsable: e.target.value })} />
            </FormField>
            <FormField label="Periodicidad del control">
              <Select value={form.periodicidad} onChange={e => setForm({ ...form, periodicidad: e.target.value })}>
                {PERIODICIDADES.map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
              {form.periodicidad !== "Único" && form.fecha_evaluacion && <p className="text-xs text-blue-400 mt-1">Próximo control: {fmtFecha(proximoControl(form.fecha_evaluacion, form.periodicidad))}</p>}
            </FormField>
            <FormField label="Observaciones / Recomendaciones">
              <Input placeholder="Dieta, ejercicio, derivaciones..." value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
            </FormField>
          </div>
          <div className="flex gap-2 mt-5 justify-end">
            <Btn variant="default" onClick={closeModal}>Cancelar</Btn>
            <Btn variant="primary" disabled={saving} onClick={handleSave}>{saving ? "Guardando..." : editing ? "Actualizar" : "Guardar Evaluación"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
