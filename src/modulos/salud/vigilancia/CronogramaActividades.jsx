import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase, puedeEliminar } from '../../../lib/supabase.js';
import { showToast } from '../../../lib/toast.jsx';
import { fmtFecha, excelDateToISO } from '../../../lib/helpers.js';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Modal } from '../../../components/ui/Modal.jsx';
import { FormField } from '../../../components/ui/FormField.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { Btn } from '../../../components/ui/Btn.jsx';
import { Plus, Pencil, Trash2, Upload, Download, CheckCircle, Calendar, LayoutGrid, HelpCircle } from 'lucide-react';

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const MES_ABBR = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const CATEGORIAS_DEFAULT = ["Entrega de Flyer/Material", "Entrega de EPP", "Capacitación", "Taller / Charla", "Charla 5 min", "Campaña", "Otro"];
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

// Cronograma anual de actividades (tipo='Actividad') de un programa. Lista por mes + grilla + importación.
export default function CronogramaActividades({ programa, empresaId, workers = [], categorias = CATEGORIAS_DEFAULT }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [vista, setVista] = useState("lista"); // lista | grilla
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importPrev, setImportPrev] = useState(null);
  const [importing, setImporting] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const initForm = { categoria: "", trabajador_id: "", fecha: `${new Date().getFullYear()}-01-01`, estado: "Programada", detalle: "" };
  const [form, setForm] = useState(initForm);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("vigilancia_seguimiento").select("*, trabajadores(nombre)")
      .eq("empresa_id", empresaId).eq("programa", programa).eq("tipo", "Actividad").order("fecha", { ascending: true });
    setItems(data || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId, programa]);

  const delAnio = items.filter(r => r.fecha && new Date(r.fecha + "T00:00:00").getFullYear() === anio);
  const anios = [...new Set([anio, new Date().getFullYear(), ...items.map(r => r.fecha ? new Date(r.fecha + "T00:00:00").getFullYear() : null).filter(Boolean)])].sort((a, b) => b - a);

  const openNew = () => { setEditing(null); setForm({ ...initForm, fecha: `${anio}-01-01` }); setShowModal(true); };
  const openEdit = (r) => { setEditing(r.id); setForm({ categoria: r.categoria || "", trabajador_id: r.trabajador_id || "", fecha: r.fecha, estado: r.estado || "Programada", detalle: r.detalle || "" }); setShowModal(true); };
  const close = () => { setShowModal(false); setEditing(null); setForm(initForm); };

  const save = async () => {
    if (!form.categoria || !form.fecha) { showToast("Categoría y fecha son obligatorias", "error"); return; }
    setSaving(true);
    const payload = { empresa_id: empresaId, programa, tipo: "Actividad", categoria: form.categoria, trabajador_id: form.trabajador_id || null, fecha: form.fecha, estado: form.estado, detalle: form.detalle || null };
    const { error } = editing ? await supabase.from("vigilancia_seguimiento").update(payload).eq("id", editing) : await supabase.from("vigilancia_seguimiento").insert(payload);
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast(editing ? "Actualizado" : "Actividad agregada", "success"); close(); load();
  };
  const del = async (id) => { if (!confirm("¿Eliminar esta actividad?")) return; await supabase.from("vigilancia_seguimiento").delete().eq("id", id); showToast("Eliminado", "info"); load(); };
  const toggleEstado = async (r) => { await supabase.from("vigilancia_seguimiento").update({ estado: r.estado === "Realizada" ? "Programada" : "Realizada" }).eq("id", r.id); load(); };

  // ── Importación ──
  const onImport = (e) => {
    const file = e.target.files[0]; if (!file) return; e.target.value = "";
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: "binary", cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      // localizar encabezado
      let h = -1;
      for (let i = 0; i < Math.min(rows.length, 12); i++) { if (rows[i].some(c => /actividad|categor|mes|fecha/.test(norm(c)))) { h = i; break; } }
      if (h < 0) { showToast("No se reconoció el formato.", "error"); return; }
      const head = rows[h].map(norm);
      const find = (...k) => head.findIndex(c => k.some(x => c.includes(x)));
      const cCat = find("actividad", "categor"), cMes = find("mes"), cFecha = find("fecha"), cDet = find("detalle", "descrip"), cEst = find("estado");
      const out = [];
      for (let i = h + 1; i < rows.length; i++) {
        const r = rows[i];
        const categoria = cCat >= 0 ? String(r[cCat] || "").trim() : "";
        if (!categoria) continue;
        let fecha = cFecha >= 0 ? excelDateToISO(r[cFecha]) : null;
        if (!fecha && cMes >= 0) {
          const mraw = norm(r[cMes]);
          let mi = MESES.findIndex(m => norm(m) === mraw || mraw.startsWith(norm(m).slice(0, 3)));
          if (mi < 0 && /^\d+$/.test(mraw)) mi = parseInt(mraw, 10) - 1;
          if (mi >= 0 && mi < 12) fecha = `${anio}-${String(mi + 1).padStart(2, "0")}-01`;
        }
        if (!fecha) continue;
        out.push({ categoria, fecha, estado: cEst >= 0 && norm(r[cEst]).includes("realiz") ? "Realizada" : "Programada", detalle: cDet >= 0 ? String(r[cDet] || "").trim() : "" });
      }
      if (!out.length) { showToast("No se detectaron actividades válidas.", "error"); return; }
      setImportPrev(out);
    };
    reader.readAsBinaryString(file);
  };
  const ejecutarImport = async () => {
    setImporting(true);
    const rows = importPrev.map(p => ({ empresa_id: empresaId, programa, tipo: "Actividad", categoria: p.categoria, fecha: p.fecha, estado: p.estado, detalle: p.detalle || null }));
    const { error } = await supabase.from("vigilancia_seguimiento").insert(rows);
    setImporting(false);
    if (error) { showToast("Error al importar: " + error.message, "error"); return; }
    showToast(`${rows.length} actividad(es) importada(s)`, "success"); setImportPrev(null); load();
  };
  const descargarPlantilla = () => {
    const aoa = [["ACTIVIDAD", "MES", "DETALLE", "ESTADO"], ["Capacitación", "Marzo", "Charla manejo de fatiga", "Programada"], ["Entrega de Flyer/Material", "Abril", "Tríptico de pausas activas", "Programada"]];
    const ws = XLSX.utils.aoa_to_sheet(aoa); ws["!cols"] = [{ wch: 26 }, { wch: 12 }, { wch: 30 }, { wch: 14 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Cronograma");
    XLSX.writeFile(wb, "plantilla_cronograma_actividades.xlsx"); showToast("Plantilla descargada", "success");
  };

  const estadoBadge = (e) => <Badge color={e === "Realizada" ? "green" : "amber"}>{e || "Programada"}</Badge>;
  const porMes = (m) => delAnio.filter(r => new Date(r.fecha + "T00:00:00").getMonth() === m);
  const cats = [...new Set(delAnio.map(r => r.categoria).filter(Boolean))];
  const realizadas = delAnio.filter(r => r.estado === "Realizada").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={anio} onChange={e => setAnio(Number(e.target.value))} className="!w-auto"><>{anios.map(a => <option key={a} value={a}>{a}</option>)}</></Select>
          <div className="flex gap-1 bg-gray-900/60 border border-gray-800 rounded-lg p-1">
            <button onClick={() => setVista("lista")} className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md ${vista === "lista" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-200"}`}><Calendar size={12} /> Lista</button>
            <button onClick={() => setVista("grilla")} className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md ${vista === "grilla" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-200"}`}><LayoutGrid size={12} /> Grilla</button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Btn size="sm" onClick={() => setShowGuide(true)}><HelpCircle size={13} /> Guía</Btn>
          <Btn size="sm" onClick={descargarPlantilla}><Download size={13} /> Plantilla</Btn>
          <label className="cursor-pointer"><span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white cursor-pointer"><Upload size={13} /> Importar</span><input type="file" accept=".xlsx,.xls" className="hidden" onChange={onImport} /></label>
          <Btn size="sm" variant="primary" onClick={openNew}><Plus size={13} /> Actividad</Btn>
        </div>
      </div>

      <div className="text-xs text-gray-500 mb-3">{delAnio.length} actividad(es) en {anio} · <span className="text-emerald-400">{realizadas} realizadas</span></div>

      {/* ── Vista LISTA por mes ── */}
      {vista === "lista" && (
        <div className="space-y-3">
          {MESES.map((mes, m) => {
            const acts = porMes(m);
            if (!acts.length) return null;
            return (
              <div key={mes}>
                <div className="text-xs font-bold uppercase tracking-wider text-blue-300 mb-1.5">{mes} <span className="text-gray-500 font-normal">· {acts.length}</span></div>
                <div className="space-y-2">
                  {acts.map(r => (
                    <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                          <span className="text-sm font-medium text-white">{r.categoria}</span>
                          {estadoBadge(r.estado)}
                        </div>
                        <div className="text-xs text-gray-500">{fmtFecha(r.fecha)}{r.trabajadores?.nombre ? ` · ${r.trabajadores.nombre}` : ""}{r.detalle ? ` · ${r.detalle}` : ""}</div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button title="Marcar realizada/programada" onClick={() => toggleEstado(r)} className={`${r.estado === "Realizada" ? "text-emerald-400" : "text-gray-500 hover:text-emerald-400"}`}><CheckCircle size={15} /></button>
                        <button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400"><Pencil size={14} /></button>
                        {puedeEliminar() && (
                        <button onClick={() => del(r.id)} className="text-red-500/50 hover:text-red-400"><Trash2 size={14} /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {!loading && !delAnio.length && <div className="text-center text-gray-600 text-sm py-8 bg-gray-900 border border-gray-800 rounded-xl">Sin actividades en {anio}. Agrega una o importa tu cronograma.</div>}
        </div>
      )}

      {/* ── Vista GRILLA actividad × meses ── */}
      {vista === "grilla" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-800">
                <th className="text-left text-gray-600 font-medium px-3 py-2 sticky left-0 bg-gray-900 z-10">Actividad</th>
                {MES_ABBR.map(m => <th key={m} className="text-center text-gray-600 font-medium px-2 py-2 w-10">{m}</th>)}
              </tr></thead>
              <tbody>
                {cats.map(cat => (
                  <tr key={cat} className="border-b border-gray-800/50">
                    <td className="px-3 py-2 text-white whitespace-nowrap sticky left-0 bg-gray-900 z-10">{cat}</td>
                    {MESES.map((_, m) => {
                      const acts = porMes(m).filter(r => r.categoria === cat);
                      const real = acts.some(a => a.estado === "Realizada");
                      return <td key={m} className="text-center px-2 py-2">{acts.length ? <span className={`inline-block w-2.5 h-2.5 rounded-full ${real ? "bg-emerald-500" : "bg-amber-500"}`} title={`${acts.length} · ${real ? "Realizada" : "Programada"}`} /> : <span className="text-gray-700">·</span>}</td>;
                    })}
                  </tr>
                ))}
                {!cats.length && <tr><td colSpan={13} className="px-3 py-10 text-center text-gray-600">Sin actividades en {anio}.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 px-3 py-2 border-t border-gray-800 text-[11px] text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Programada</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Realizada</span>
          </div>
        </div>
      )}

      {/* Modal crear/editar */}
      {showModal && (
        <Modal title={editing ? "Editar actividad" : "Nueva actividad"} onClose={close}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Actividad / Categoría *">
              <Select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                <option value="">Seleccionar...</option>
                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </FormField>
            <FormField label="Fecha *"><Input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></FormField>
            <FormField label="Estado">
              <Select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}><option>Programada</option><option>Realizada</option></Select>
            </FormField>
            <FormField label="Trabajador (opcional)">
              <Select value={form.trabajador_id} onChange={e => setForm({ ...form, trabajador_id: e.target.value })}>
                <option value="">Actividad grupal</option>
                {[...workers].filter(w => w.estado !== "Cesado").sort((a, b) => a.nombre.localeCompare(b.nombre, "es")).map(w => <option key={w.id} value={w.id}>{w.nombre}</option>)}
              </Select>
            </FormField>
            <div className="sm:col-span-2"><FormField label="Detalle"><Input value={form.detalle} onChange={e => setForm({ ...form, detalle: e.target.value })} placeholder="Tema, material, asistentes..." /></FormField></div>
          </div>
          <div className="flex justify-end gap-2 mt-4"><Btn onClick={close}>Cancelar</Btn><Btn variant="primary" disabled={saving} onClick={save}>{saving ? "Guardando..." : "Guardar"}</Btn></div>
        </Modal>
      )}

      {/* Modal preview importación */}
      {importPrev && (
        <Modal title="Importar cronograma de actividades" onClose={() => setImportPrev(null)} wide>
          <p className="text-sm text-gray-300 mb-3">Se detectaron <span className="text-white font-bold">{importPrev.length}</span> actividad(es). Vista previa:</p>
          <div className="overflow-x-auto mb-4 rounded-lg border border-gray-800 max-h-72">
            <table className="w-full text-xs"><thead><tr className="border-b border-gray-800 bg-gray-900">{["Actividad", "Fecha", "Estado", "Detalle"].map(h => <th key={h} className="text-left text-gray-600 font-medium px-3 py-2">{h}</th>)}</tr></thead>
              <tbody>{importPrev.slice(0, 12).map((p, i) => (
                <tr key={i} className="border-b border-gray-800/50"><td className="px-3 py-2 text-white">{p.categoria}</td><td className="px-3 py-2 font-mono text-gray-400">{p.fecha}</td><td className="px-3 py-2">{estadoBadge(p.estado)}</td><td className="px-3 py-2 text-gray-500">{p.detalle || "—"}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2"><Btn onClick={() => setImportPrev(null)}>Cancelar</Btn><Btn variant="primary" onClick={ejecutarImport} disabled={importing}>{importing ? "Importando..." : `Importar ${importPrev.length}`}</Btn></div>
        </Modal>
      )}

      {/* Guía del cronograma */}
      {showGuide && (
        <Modal title="Guía — Cronograma de Actividades" onClose={() => setShowGuide(false)} wide>
          <div className="space-y-4 text-sm text-gray-300">
            <p className="text-gray-400">Planifica las actividades del programa a lo largo del año (enero–diciembre) según tus visitas, y dales seguimiento.</p>

            <div>
              <p className="font-semibold text-white mb-1.5">Dos vistas</p>
              <ul className="space-y-1 text-xs text-gray-400 list-disc pl-4">
                <li><b className="text-gray-300">Lista</b> — actividades agrupadas por mes, con su fecha exacta, categoría, detalle y estado.</li>
                <li><b className="text-gray-300">Grilla</b> — matriz actividad × meses para ver el plan anual de un vistazo.</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-white mb-1.5">Estados</p>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5"><Badge color="amber">Programada</Badge> planificada, aún no realizada</span>
                <span className="flex items-center gap-1.5"><Badge color="green">Realizada</Badge> ya ejecutada</span>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">Usa el botón ✓ en cada actividad para alternar entre Programada y Realizada.</p>
            </div>

            <div>
              <p className="font-semibold text-white mb-1.5">Dos formas de cargar el cronograma</p>
              <ul className="space-y-1 text-xs text-gray-400 list-disc pl-4">
                <li><b className="text-gray-300">Manual</b> — botón <b>“+ Actividad”</b>: eliges categoría, fecha, estado y detalle.</li>
                <li><b className="text-gray-300">Importar Excel</b> — botón <b>“Importar”</b>: sube tu propio cronograma. Descarga primero la <b>Plantilla</b> con el formato.</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-white mb-1.5">Columnas del Excel a importar</p>
              <div className="overflow-x-auto rounded-lg border border-gray-800">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-gray-800"><th className="text-left text-gray-500 font-medium px-3 py-2">Columna</th><th className="text-left text-gray-500 font-medium px-3 py-2">Descripción</th><th className="text-left text-gray-500 font-medium px-3 py-2">Ejemplo</th></tr></thead>
                  <tbody>
                    {[
                      ["ACTIVIDAD", "Categoría / nombre de la actividad *", "Capacitación"],
                      ["MES", "Mes (Enero…Diciembre o 1–12). Usa el año seleccionado", "Marzo"],
                      ["FECHA", "Alternativa a MES: fecha exacta (DD/MM/AAAA)", "15/03/2026"],
                      ["DETALLE", "Tema, material, asistentes…", "Charla manejo de fatiga"],
                      ["ESTADO", "Programada / Realizada (por defecto Programada)", "Programada"],
                    ].map(([c, d, e]) => (
                      <tr key={c} className="border-b border-gray-800/50"><td className="px-3 py-2 font-mono text-blue-400 whitespace-nowrap">{c}</td><td className="px-3 py-2 text-gray-400">{d}</td><td className="px-3 py-2 font-mono text-gray-600">{e}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">Puedes usar <b>MES</b> o <b>FECHA</b> (al menos una). Las filas sin actividad o sin mes/fecha se omiten.</p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Btn onClick={descargarPlantilla}><Download size={13} /> Descargar plantilla</Btn>
              <Btn variant="primary" onClick={() => setShowGuide(false)}>Entendido</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
