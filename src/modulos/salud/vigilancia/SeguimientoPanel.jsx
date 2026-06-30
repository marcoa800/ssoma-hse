import { useState, useEffect } from 'react';
import { supabase, puedeEliminar } from '../../../lib/supabase.js';
import { showToast } from '../../../lib/toast.jsx';
import { fmtFecha, PERIODICIDADES, proximoControl, estadoControl } from '../../../lib/helpers.js';
import { Badge } from '../../../components/ui/Badge.jsx';
import { KpiCard } from '../../../components/ui/KpiCard.jsx';
import { Modal } from '../../../components/ui/Modal.jsx';
import { FormField } from '../../../components/ui/FormField.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { Btn } from '../../../components/ui/Btn.jsx';
import { Plus, Pencil, Trash2 } from 'lucide-react';

// Clasificación de IMC
const imcCategoria = (imc) => imc < 18.5 ? "Bajo peso" : imc < 25 ? "Normal" : imc < 30 ? "Sobrepeso" : "Obesidad";

// Controles / seguimientos de un programa (tipo = 'Control'). Responsive.
// props: campos? = [{ key, label, type:'number'|'text'|'select', options?, step?, suffix?, placeholder? }]
//        autoImc? = calcula IMC + Categoría a partir de datos.peso y datos.talla
export default function SeguimientoPanel({ programa, empresaId, workers = [], campos = [], autoImc = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const initForm = { trabajador_id: "", fecha: new Date().toISOString().split("T")[0], periodicidad: "Único", detalle: "", datos: {} };
  const [form, setForm] = useState(initForm);
  const setDato = (k, v) => setForm(f => ({ ...f, datos: { ...f.datos, [k]: v } }));

  // IMC calculado (si aplica)
  const imcCalc = (() => {
    if (!autoImc) return null;
    const peso = parseFloat(form.datos?.peso), talla = parseFloat(form.datos?.talla);
    if (!peso || !talla) return null;
    const imc = peso / (talla * talla);
    return { imc: imc.toFixed(1), categoria: imcCategoria(imc) };
  })();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("vigilancia_seguimiento").select("*, trabajadores(nombre)")
      .eq("empresa_id", empresaId).eq("programa", programa).eq("tipo", "Control").order("fecha", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId, programa]);

  const openNew = () => { setEditing(null); setForm(initForm); setShowModal(true); };
  const openEdit = (r) => { setEditing(r.id); setForm({ trabajador_id: r.trabajador_id || "", fecha: r.fecha, periodicidad: r.periodicidad || "Único", detalle: r.detalle || "", datos: r.datos || {} }); setShowModal(true); };
  const close = () => { setShowModal(false); setEditing(null); setForm(initForm); };

  const save = async () => {
    if (!form.fecha || !form.trabajador_id) { showToast("Trabajador y fecha son obligatorios", "error"); return; }
    setSaving(true);
    const datos = { ...form.datos, ...(imcCalc ? { imc: imcCalc.imc, categoria: imcCalc.categoria } : {}) };
    const payload = { empresa_id: empresaId, programa, tipo: "Control", trabajador_id: form.trabajador_id, fecha: form.fecha, periodicidad: form.periodicidad, proximo_control: proximoControl(form.fecha, form.periodicidad), detalle: form.detalle || null, datos };
    const { error } = editing ? await supabase.from("vigilancia_seguimiento").update(payload).eq("id", editing) : await supabase.from("vigilancia_seguimiento").insert(payload);
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast(editing ? "Actualizado" : "Control registrado", "success"); close(); load();
  };
  const del = async (id) => { if (!confirm("¿Eliminar este control?")) return; await supabase.from("vigilancia_seguimiento").delete().eq("id", id); showToast("Eliminado", "info"); load(); };

  const vencidos = items.filter(r => estadoControl(r.proximo_control)?.label === "Vencido").length;
  const porVencer = items.filter(r => estadoControl(r.proximo_control)?.label === "Por vencer").length;

  const Estado = ({ r }) => {
    if (!r.proximo_control) return <span className="text-gray-600 text-xs">—</span>;
    const e = estadoControl(r.proximo_control);
    return <Badge color={e.color}>{e.label}</Badge>;
  };

  // Resumen de mediciones (datos) según los campos del programa
  const campoLabel = (k) => campos.find(c => c.key === k)?.label || k;
  const resumenDatos = (r) => {
    const d = r.datos || {};
    const partes = [];
    campos.forEach(c => { if (d[c.key] !== undefined && d[c.key] !== "") partes.push(`${c.label}: ${d[c.key]}${c.suffix || ""}`); });
    if (autoImc && d.imc) partes.push(`IMC: ${d.imc}${d.categoria ? ` (${d.categoria})` : ""}`);
    return partes;
  };
  const tieneCampos = campos.length > 0 || autoImc;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className="text-gray-500 text-xs max-w-md">Seguimiento periódico por trabajador. Define la periodicidad y se calcula el próximo control con alertas.</p>
        <Btn size="sm" variant="primary" onClick={openNew}><Plus size={13} /> Nuevo control</Btn>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <KpiCard label="Controles" value={items.length} sub="registrados" accentColor="blue" />
        <KpiCard label="Por vencer" value={porVencer} sub="próximo ≤ 15 días" accentColor="amber" />
        <KpiCard label="Vencidos" value={vencidos} sub="control pendiente" accentColor="red" />
      </div>

      {/* Móvil */}
      <div className="md:hidden space-y-2.5">
        {items.map(r => (
          <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3.5">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="min-w-0">
                <div className="font-semibold text-white text-sm leading-tight">{r.trabajadores?.nombre || "—"}</div>
                <div className="text-xs text-gray-500 font-mono mt-0.5">{fmtFecha(r.fecha)}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400"><Pencil size={14} /></button>
                {puedeEliminar() && (
                <button onClick={() => del(r.id)} className="text-red-500/50 hover:text-red-400"><Trash2 size={14} /></button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-1"><Badge color="gray">{r.periodicidad}</Badge><Estado r={r} /></div>
            {r.proximo_control && <div className="text-xs text-gray-400">Próximo: <span className="font-mono">{fmtFecha(r.proximo_control)}</span></div>}
            {tieneCampos && resumenDatos(r).length > 0 && <div className="text-xs text-gray-400 mt-1">{resumenDatos(r).join(" · ")}</div>}
            {r.detalle && <div className="text-xs text-gray-500 mt-1">{r.detalle}</div>}
          </div>
        ))}
        {!loading && !items.length && <div className="text-center text-gray-600 text-sm py-8 bg-gray-900 border border-gray-800 rounded-xl">Sin controles registrados.</div>}
      </div>

      {/* Escritorio */}
      <div className="hidden md:block bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800">
              {["Trabajador", "Fecha", "Periodicidad", "Próximo control", "Estado", ...(tieneCampos ? ["Mediciones"] : []), "Comentarios", ""].map(h => <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={tieneCampos ? 8 : 7} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
              {!loading && items.map(r => (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{r.trabajadores?.nombre || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">{fmtFecha(r.fecha)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{r.periodicidad || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">{r.proximo_control ? fmtFecha(r.proximo_control) : "—"}</td>
                  <td className="px-4 py-3"><Estado r={r} /></td>
                  {tieneCampos && <td className="px-4 py-3 text-gray-400 text-xs">{resumenDatos(r).join(" · ") || "—"}</td>}
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{r.detalle || "—"}</td>
                  <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400"><Pencil size={13} /></button>{puedeEliminar() && (<button onClick={() => del(r.id)} className="text-red-500/40 hover:text-red-400"><Trash2 size={13} /></button>)}</div></td>
                </tr>
              ))}
              {!loading && !items.length && <tr><td colSpan={tieneCampos ? 8 : 7} className="px-4 py-12 text-center text-gray-600 text-sm">Sin controles registrados.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal title={editing ? "Editar control" : "Nuevo control"} onClose={close}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Trabajador *">
              <Select value={form.trabajador_id} onChange={e => setForm({ ...form, trabajador_id: e.target.value })}>
                <option value="">Seleccionar...</option>
                {[...workers].filter(w => w.estado !== "Cesado").sort((a, b) => a.nombre.localeCompare(b.nombre, "es")).map(w => <option key={w.id} value={w.id}>{w.nombre}</option>)}
              </Select>
            </FormField>
            <FormField label="Fecha *"><Input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></FormField>
            <FormField label="Periodicidad">
              <Select value={form.periodicidad} onChange={e => setForm({ ...form, periodicidad: e.target.value })}>
                {PERIODICIDADES.map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
              {form.periodicidad !== "Único" && form.fecha && <p className="text-xs text-blue-400 mt-1">Próximo control: {fmtFecha(proximoControl(form.fecha, form.periodicidad))}</p>}
            </FormField>

            {/* Campos de medición configurables por programa */}
            {campos.map(c => (
              <FormField key={c.key} label={c.label}>
                {c.type === "select"
                  ? <Select value={form.datos?.[c.key] || ""} onChange={e => setDato(c.key, e.target.value)}><option value="">—</option>{(c.options || []).map(o => <option key={o} value={o}>{o}</option>)}</Select>
                  : <Input type={c.type === "number" ? "number" : "text"} step={c.step} value={form.datos?.[c.key] || ""} onChange={e => setDato(c.key, e.target.value)} placeholder={c.placeholder || ""} />}
              </FormField>
            ))}
            {imcCalc && (
              <FormField label="IMC (automático)">
                <Input value={`${imcCalc.imc} — ${imcCalc.categoria}`} disabled className="opacity-70" />
              </FormField>
            )}

            <div className="sm:col-span-2"><FormField label="Qué se registró / Comentarios"><Input value={form.detalle} onChange={e => setForm({ ...form, detalle: e.target.value })} placeholder="Hallazgos, medidas, comentarios..." /></FormField></div>
          </div>
          <div className="flex justify-end gap-2 mt-4"><Btn onClick={close}>Cancelar</Btn><Btn variant="primary" disabled={saving} onClick={save}>{saving ? "Guardando..." : "Guardar"}</Btn></div>
        </Modal>
      )}
    </div>
  );
}
