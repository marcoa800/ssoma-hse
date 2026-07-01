import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../../lib/supabase.js';
import { showToast } from '../../../lib/toast.jsx';
import { excelDateToISO, PERIODICIDADES } from '../../../lib/helpers.js';
import { Modal } from '../../../components/ui/Modal.jsx';
import { FormField } from '../../../components/ui/FormField.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { Btn } from '../../../components/ui/Btn.jsx';
import { Download, Upload, FileText } from 'lucide-react';

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const CATS = ["Entrega de Flyer/Material", "Entrega de EPP", "Capacitación", "Taller / Charla", "Charla 5 min", "Campaña", "Otro"];
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

export default function ProgramaCreatorModal({ empresaId, onClose, onCreated }) {
  const [modo, setModo] = useState("manual"); // manual | importar
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre: "", descripcion: "", periodicidad_default: "Anual", actividades: [] });
  const [impFile, setImpFile] = useState(null);
  const [impRows, setImpRows] = useState(null);
  const anio = new Date().getFullYear();

  const toggleCat = (c) => setForm(f => ({ ...f, actividades: f.actividades.includes(c) ? f.actividades.filter(x => x !== c) : [...f.actividades, c] }));

  const crearManual = async () => {
    if (!form.nombre.trim()) { showToast("Ponle un nombre al programa", "error"); return; }
    setSaving(true);
    const { data, error } = await supabase.from("vigilancia_programas").insert({
      empresa_id: empresaId, nombre: form.nombre.trim(), descripcion: form.descripcion || null,
      periodicidad_default: form.periodicidad_default, actividades: form.actividades,
    }).select("id").single();
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast("Programa creado", "success"); onCreated(data.id);
  };

  // ── Importar: programa + cronograma de actividades ──
  const onFile = (e) => {
    const file = e.target.files[0]; if (!file) return; e.target.value = "";
    setImpFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: "binary", cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
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
          const mraw = norm(r[cMes]); let mi = MESES.findIndex(m => norm(m) === mraw || mraw.startsWith(norm(m).slice(0, 3)));
          if (mi < 0 && /^\d+$/.test(mraw)) mi = parseInt(mraw, 10) - 1;
          if (mi >= 0 && mi < 12) fecha = `${anio}-${String(mi + 1).padStart(2, "0")}-01`;
        }
        if (!fecha) continue;
        out.push({ categoria, fecha, estado: cEst >= 0 && norm(r[cEst]).includes("realiz") ? "Realizada" : "Programada", detalle: cDet >= 0 ? String(r[cDet] || "").trim() : "" });
      }
      if (!out.length) { showToast("No se detectaron actividades.", "error"); return; }
      setImpRows(out);
    };
    reader.readAsBinaryString(file);
  };

  const crearImportando = async () => {
    if (!form.nombre.trim()) { showToast("Ponle un nombre al programa", "error"); return; }
    if (!impRows || !impRows.length) { showToast("Sube un Excel de actividades válido", "error"); return; }
    setSaving(true);
    const cats = [...new Set(impRows.map(r => r.categoria))];
    const { data, error } = await supabase.from("vigilancia_programas").insert({
      empresa_id: empresaId, nombre: form.nombre.trim(), descripcion: form.descripcion || null,
      periodicidad_default: form.periodicidad_default, actividades: cats,
    }).select("id").single();
    if (error) { setSaving(false); showToast("Error: " + error.message, "error"); return; }
    const slug = `custom:${data.id}`;
    const acts = impRows.map(r => ({ empresa_id: empresaId, programa: slug, tipo: "Actividad", categoria: r.categoria, fecha: r.fecha, estado: r.estado, detalle: r.detalle || null }));
    const { error: e2 } = await supabase.from("vigilancia_seguimiento").insert(acts);
    setSaving(false);
    if (e2) { showToast("Programa creado, pero error al importar actividades: " + e2.message, "error"); onCreated(data.id); return; }
    showToast(`Programa creado con ${acts.length} actividad(es)`, "success"); onCreated(data.id);
  };

  const descargarPlantilla = () => {
    const aoa = [["ACTIVIDAD", "MES", "DETALLE", "ESTADO"], ["Capacitación", "Marzo", "Inducción del programa", "Programada"], ["Entrega de Flyer/Material", "Abril", "Material informativo", "Programada"]];
    const ws = XLSX.utils.aoa_to_sheet(aoa); ws["!cols"] = [{ wch: 26 }, { wch: 12 }, { wch: 30 }, { wch: 14 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Programa");
    XLSX.writeFile(wb, "plantilla_programa_vigilancia.xlsx"); showToast("Plantilla descargada", "success");
  };

  return (
    <Modal title="Nuevo programa de vigilancia" onClose={onClose} wide>
      <div className="flex gap-1.5 bg-gray-900/60 border border-gray-800 rounded-lg p-1 mb-4 w-fit">
        {[["manual", "Crear manual"], ["importar", "Importar Excel"]].map(([k, l]) => (
          <button key={k} onClick={() => setModo(k)} className={`px-3 py-1.5 text-xs font-medium rounded-md ${modo === k ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-200"}`}>{l}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Nombre del programa *"><Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Vigilancia de manipuladores de alimentos" /></FormField>
        <FormField label="Periodicidad por defecto">
          <Select value={form.periodicidad_default} onChange={e => setForm({ ...form, periodicidad_default: e.target.value })}>{PERIODICIDADES.map(p => <option key={p}>{p}</option>)}</Select>
        </FormField>
        <div className="sm:col-span-2"><FormField label="Descripción"><Input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Objetivo / alcance del programa" /></FormField></div>
      </div>

      {modo === "manual" ? (
        <div className="mt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Actividades de este programa</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-4">
            {CATS.map(c => (
              <label key={c} className="flex items-center gap-2 text-sm text-gray-300 px-2 py-1.5 rounded-lg hover:bg-gray-800 cursor-pointer">
                <input type="checkbox" checked={form.actividades.includes(c)} onChange={() => toggleCat(c)} className="w-4 h-4 accent-blue-600" />{c}
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2"><Btn onClick={onClose}>Cancelar</Btn><Btn variant="primary" disabled={saving} onClick={crearManual}>{saving ? "Creando..." : "Crear programa"}</Btn></div>
        </div>
      ) : (
        <div className="mt-2">
          <div className="mb-3 px-3 py-2.5 rounded-lg bg-blue-900/20 border border-blue-900/40 text-xs text-blue-400">
            Sube un Excel con el cronograma de actividades del programa (columnas <b>ACTIVIDAD</b>, <b>MES</b> o <b>FECHA</b>, <b>DETALLE</b>, <b>ESTADO</b>). Se crea el programa y se carga su cronograma.
          </div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Btn size="sm" onClick={descargarPlantilla}><Download size={13} /> Plantilla</Btn>
            <label className="cursor-pointer"><span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white cursor-pointer"><Upload size={13} /> Elegir Excel</span><input type="file" accept=".xlsx,.xls" className="hidden" onChange={onFile} /></label>
            {impFile && <span className="text-xs text-gray-500 flex items-center gap-1"><FileText size={11} /> {impFile.name}</span>}
          </div>
          {impRows && <p className="text-xs text-emerald-400 mb-3">{impRows.length} actividad(es) detectada(s) · {[...new Set(impRows.map(r => r.categoria))].length} categoría(s)</p>}
          <div className="flex justify-end gap-2"><Btn onClick={onClose}>Cancelar</Btn><Btn variant="primary" disabled={saving} onClick={crearImportando}>{saving ? "Importando..." : "Crear e importar"}</Btn></div>
        </div>
      )}
    </Modal>
  );
}
