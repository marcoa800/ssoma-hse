import { useState, useEffect, Fragment } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { fmtFecha, excelDateToISO } from '../../../lib/helpers.js';
import { supabase, puedeEliminar } from '../../../lib/supabase.js';
import { showToast } from '../../../lib/toast.jsx';
import { calcularEdad, calcularVigencia } from '../../../lib/helpers.js';
import { VIG_GUIAS } from '../../../constants/vig-guias.js';
import { VigGuideModal } from './VigGuideModal.jsx';
import { Badge } from '../../../components/ui/Badge.jsx';
import { KpiCard } from '../../../components/ui/KpiCard.jsx';
import { Modal } from '../../../components/ui/Modal.jsx';
import { FormField } from '../../../components/ui/FormField.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { Btn } from '../../../components/ui/Btn.jsx';
import { ExportBtn } from '../../../components/ui/ExportBtn.jsx';
import { FilterBar } from '../../../components/ui/FilterBar.jsx';
import { Plus, Pencil, Trash2, AlertTriangle, HelpCircle, Lock, Upload, Download } from 'lucide-react';

export default function DescansosMedicosModulo({ workers, empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    trabajador_id: "", dni: "", fecha_inicio: "", fecha_fin: "",
    tipo_reposo: "Domiciliario", atencion: "EsSalud", diagnostico: "", cie10: "",
    medico_responsable: "", centro_medico: "", control_1: "", control_2: "", observaciones: "",
  });

  // Total de días del descanso (automático según fechas del formulario)
  const totalDiasForm = (form.fecha_inicio && form.fecha_fin)
    ? Math.max(1, Math.round((new Date(form.fecha_fin + "T00:00:00") - new Date(form.fecha_inicio + "T00:00:00")) / 86400000) + 1)
    : "";

  // Auto-completa el DNI al seleccionar un trabajador
  const onSelectTrabajador = (id) => {
    const w = workers.find(x => x.id === id);
    setForm(f => ({ ...f, trabajador_id: id, dni: w?.dni || "" }));
  };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vigilancia_descansos")
      .select("*, trabajadores(nombre)")
      .eq("empresa_id", empresaId)
      .order("fecha_inicio", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  function estadoDescanso(r) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const fin = new Date(r.fecha_fin + "T00:00:00");
    const en7 = new Date(today); en7.setDate(en7.getDate() + 7);
    if (fin < today) return "Vencido";
    if (fin <= en7) return "Próximo a vencer";
    return "Activo";
  }

  function diasDescanso(r) {
    const ini = new Date(r.fecha_inicio + "T00:00:00");
    const fin = new Date(r.fecha_fin + "T00:00:00");
    return Math.max(1, Math.round((fin - ini) / 86400000) + 1);
  }

  const now = new Date();
  const activos = records.filter(r => estadoDescanso(r) === "Activo");
  const mesActual = records.filter(r => {
    const ini = new Date(r.fecha_inicio + "T00:00:00");
    return ini.getMonth() === now.getMonth() && ini.getFullYear() === now.getFullYear();
  });
  const diasMes = mesActual.reduce((acc, r) => acc + diasDescanso(r), 0);
  const proximos = records.filter(r => estadoDescanso(r) === "Próximo a vencer");

  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  const [editing, setEditing] = useState(null);
  const resetForm = () => setForm({ trabajador_id: "", dni: "", fecha_inicio: "", fecha_fin: "", tipo_reposo: "Domiciliario", atencion: "EsSalud", diagnostico: "", cie10: "", medico_responsable: "", centro_medico: "", control_1: "", control_2: "", observaciones: "" });
  const openEdit = (r) => { setForm({ trabajador_id: r.trabajador_id, dni: r.dni || "", fecha_inicio: r.fecha_inicio, fecha_fin: r.fecha_fin, tipo_reposo: r.tipo_reposo || "Domiciliario", atencion: r.atencion || "EsSalud", diagnostico: r.diagnostico || "", cie10: r.cie10 || "", medico_responsable: r.medico_responsable || "", centro_medico: r.centro_medico || "", control_1: r.control_1 || "", control_2: r.control_2 || "", observaciones: r.observaciones || "" }); setEditing(r.id); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); resetForm(); };

  const handleSave = async () => {
    if (!form.trabajador_id || !form.fecha_inicio || !form.fecha_fin) {
      showToast("Trabajador, fecha inicio y fin son obligatorios", "error"); return;
    }
    setSaving(true);
    const payload = { ...form, control_1: form.control_1 || null, control_2: form.control_2 || null };
    const { error } = editing
      ? await supabase.from("vigilancia_descansos").update(payload).eq("id", editing)
      : await supabase.from("vigilancia_descansos").insert({ ...payload, empresa_id: empresaId });
    if (error) { showToast("Error: " + error.message, "error"); }
    else { showToast(editing ? "Registro actualizado" : "Descanso registrado", "success"); closeModal(); load(); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este registro?")) return;
    await supabase.from("vigilancia_descansos").delete().eq("id", id);
    showToast("Registro eliminado", "info"); load();
  };

  // ── Importación de descansos desde Excel/CSV ──
  const [showGuide, setShowGuide] = useState(false);
  const [importPreview, setImportPreview] = useState(null); // { validos, sinDni }
  const [isImporting, setIsImporting] = useState(false);

  const normCol = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
  const detectCol = (headers, ...aliases) => {
    const normH = headers.map(h => ({ orig: h, n: normCol(h) }));
    for (const a of aliases) { const na = normCol(a); const f = normH.find(h => h.n === na); if (f) return f.orig; }
    for (const a of aliases) { const na = normCol(a); const f = normH.find(h => h.n.includes(na) || na.includes(h.n)); if (f) return f.orig; }
    return null;
  };

  const parseRows = (rows) => {
    const valid = rows.filter(r => Object.values(r).some(v => String(v).trim()));
    if (!valid.length) return null;
    const headers = Object.keys(valid[0]);
    const dc = (...a) => detectCol(headers, ...a);
    const cDni   = dc("DNI", "DOC. DE IDENTIDAD", "DOCUMENTO", "N° DNI");
    const cIni   = dc("FECHA INICIO", "INICIO", "FECHA DE INICIO", "DESDE");
    const cFin   = dc("FECHA FIN", "FIN", "FECHA DE FIN", "HASTA");
    const cTipo  = dc("TIPO REPOSO", "TIPO DE REPOSO", "TIPO");
    const cAten  = dc("ATENCION", "ATENCIÓN");
    const cDiag  = dc("DIAGNOSTICO", "DIAGNÓSTICO");
    const cCie   = dc("CIE-10", "CIE10", "CIE");
    const cCentro= dc("CENTRO MEDICO", "CENTRO MÉDICO", "CENTRO");
    const cCtrl1 = dc("CONTROL 1", "CONTROL1", "CONTROL UNO");
    const cCtrl2 = dc("CONTROL 2", "CONTROL2", "CONTROL DOS");
    const cMed   = dc("MEDICO", "MÉDICO", "MEDICO RESPONSABLE");
    const cObs   = dc("OBSERVACIONES", "OBSERVACION", "OBS");

    const sinDni = [];
    const validos = [];
    for (const r of valid) {
      const dni = (cDni ? String(r[cDni] || "") : "").replace(/\D/g, "").slice(0, 8);
      const ini = excelDateToISO(cIni ? r[cIni] : "");
      const fin = excelDateToISO(cFin ? r[cFin] : "");
      if (!dni || !ini || !fin) continue; // sin datos obligatorios → se ignora
      const w = workers.find(x => x.dni === dni);
      if (!w) { sinDni.push({ dni, nombre: "(no encontrado)" }); continue; }
      validos.push({
        empresa_id: empresaId,
        trabajador_id: w.id,
        dni,
        _nombre: w.nombre,
        fecha_inicio: ini,
        fecha_fin: fin,
        tipo_reposo: cTipo ? (String(r[cTipo] || "").trim() || "Domiciliario") : "Domiciliario",
        atencion: cAten ? (String(r[cAten] || "").trim() || "EsSalud") : "EsSalud",
        diagnostico: cDiag ? String(r[cDiag] || "").trim() : "",
        cie10: cCie ? String(r[cCie] || "").trim() : "",
        centro_medico: cCentro ? String(r[cCentro] || "").trim() : "",
        control_1: excelDateToISO(cCtrl1 ? r[cCtrl1] : "") || null,
        control_2: excelDateToISO(cCtrl2 ? r[cCtrl2] : "") || null,
        medico_responsable: cMed ? String(r[cMed] || "").trim() : "",
        observaciones: cObs ? String(r[cObs] || "").trim() : "",
      });
    }
    return { validos, sinDni };
  };

  const importFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    e.target.value = "";
    const handleRows = (rows) => {
      const parsed = parseRows(rows);
      if (!parsed || !parsed.validos.length) {
        showToast(parsed?.sinDni.length ? "Ningún DNI coincide con un trabajador registrado." : "Archivo inválido o sin datos reconocibles.", "error");
        return;
      }
      setImportPreview(parsed);
    };
    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const wb = XLSX.read(evt.target.result, { type: "binary", cellDates: false });
        handleRows(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" }));
      };
      reader.readAsBinaryString(file);
    } else {
      Papa.parse(file, { header: true, complete: (res) => handleRows(res.data) });
    }
  };

  const executeImport = async () => {
    setIsImporting(true);
    const rows = importPreview.validos.map(({ _nombre, ...rest }) => rest);
    const { error } = await supabase.from("vigilancia_descansos").insert(rows);
    setIsImporting(false);
    if (error) { showToast("Error al importar: " + error.message, "error"); return; }
    showToast(`${rows.length} descanso(s) importado(s)`, "success");
    setImportPreview(null);
    load();
  };

  const badgeColor = (e) => e === "Activo" ? "green" : e === "Vencido" ? "red" : "amber";

  const filtered = records.filter(r => (!fFrom || r.fecha_inicio >= fFrom) && (!fTo || r.fecha_inicio <= fTo));

  // ── Agrupación por mes (según fecha de inicio) ──
  const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const gruposPorMes = (() => {
    const map = new Map();
    for (const r of filtered) {
      const d = new Date((r.fecha_inicio || "") + "T00:00:00");
      if (isNaN(d)) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, { key, year: d.getFullYear(), month: d.getMonth(), items: [] });
      map.get(key).items.push(r);
    }
    return [...map.values()]
      .sort((a, b) => b.key.localeCompare(a.key)) // meses: más reciente primero
      .map(g => ({
        ...g,
        // dentro del mes: por fecha de inicio, del más reciente al más antiguo
        items: [...g.items].sort((a, b) => (b.fecha_inicio || "").localeCompare(a.fecha_inicio || "")),
        label: `${MESES[g.month]} ${g.year}`,
        totalDias: g.items.reduce((s, r) => s + diasDescanso(r), 0),
      }));
  })();

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Descansos Médicos</h3>
          <p className="text-gray-500 text-xs max-w-xl">Registro y seguimiento de reposos médicos del personal. Control de días activos y vencimientos.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4 flex-wrap justify-end">
          <Btn size="sm" onClick={() => setShowGuide(true)}><HelpCircle size={13} /> Guía</Btn>
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-all cursor-pointer"><Upload size={13} /> Importar Excel/CSV</span>
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={importFile} />
          </label>
          <ExportBtn data={records.map(r => ({ Trabajador: r.trabajadores?.nombre || "", DNI: r.dni || "", "Tipo Reposo": r.tipo_reposo, Atención: r.atencion || "", Inicio: r.fecha_inicio, Fin: r.fecha_fin, Días: diasDescanso(r), Diagnóstico: r.diagnostico || "", "CIE-10": r.cie10 || "", "Centro Médico": r.centro_medico || "", "Control 1": r.control_1 || "", "Control 2": r.control_2 || "", Estado: estadoDescanso(r), Médico: r.medico_responsable || "" }))} filename="descansos_medicos" />
          <Btn size="sm" variant="primary" onClick={() => { setEditing(null); resetForm(); setShowModal(true); }}><Plus size={13} /> Nuevo Descanso</Btn>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <KpiCard label="Activos hoy" value={activos.length} sub={`${activos.length === 1 ? "trabajador" : "trabajadores"} con reposo activo`} accentColor="red" />
        <KpiCard label="Días acumulados (mes)" value={diasMes} sub={`en ${mesActual.length} descanso${mesActual.length !== 1 ? "s" : ""} del mes`} accentColor="amber" />
        <KpiCard label="Próximos a vencer" value={proximos.length} sub="vencen en los próximos 7 días" accentColor="blue" />
      </div>

      <FilterBar dateFrom={fFrom} dateTo={fTo} onDateFrom={setFFrom} onDateTo={setFTo} />

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500 text-sm">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {["Trabajador", "DNI", "Tipo Reposo", "Atención", "Inicio", "Fin", "Días", "Diagnóstico / CIE-10", "Centro Médico", "Controles", "Estado", "Médico", ""].map(h => (
                  <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gruposPorMes.map(g => (
                <Fragment key={g.key}>
                  <tr className="bg-gray-800/40 border-y border-gray-800">
                    <td colSpan={13} className="px-4 py-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-300">{g.label}</span>
                        <span className="text-[11px] text-gray-500">— {g.items.length} descanso{g.items.length !== 1 ? "s" : ""} · {g.totalDias} día{g.totalDias !== 1 ? "s" : ""}</span>
                      </div>
                    </td>
                  </tr>
                  {g.items.map(r => {
                    const estado = estadoDescanso(r);
                    return (
                      <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{r.trabajadores?.nombre || "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.dni || "—"}</td>
                        <td className="px-4 py-3 text-gray-300 text-xs">{r.tipo_reposo}</td>
                        <td className="px-4 py-3"><Badge color={r.atencion === "Particular" ? "purple" : "blue"}>{r.atencion || "—"}</Badge></td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">{fmtFecha(r.fecha_inicio)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">{fmtFecha(r.fecha_fin)}</td>
                        <td className="px-4 py-3 text-center text-gray-300 font-mono text-xs">{diasDescanso(r)}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{r.diagnostico}{r.cie10 ? <span className="ml-1 text-gray-600">({r.cie10})</span> : ""}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{r.centro_medico || "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">{(r.control_1 || r.control_2) ? <>{r.control_1 ? fmtFecha(r.control_1) : "—"}<span className="text-gray-700 mx-1">/</span>{r.control_2 ? fmtFecha(r.control_2) : "—"}</> : "—"}</td>
                        <td className="px-4 py-3"><Badge color={badgeColor(estado)}>{estado}</Badge></td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{r.medico_responsable || "—"}</td>
                        <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button>{puedeEliminar() && (<button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>)}</div></td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
              {!filtered.length && (
                <tr><td colSpan={13} className="px-4 py-12 text-center text-gray-600 text-sm">No hay descansos médicos registrados</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? "Editar Descanso Médico" : "Nuevo Descanso Médico"} onClose={closeModal}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <FormField label="Trabajador *">
                  <Select value={form.trabajador_id} onChange={e => onSelectTrabajador(e.target.value)}>
                    <option value="">Seleccionar trabajador...</option>
                    {workers.filter(w => w.estado !== "Cesado").sort((a,b)=>a.nombre.localeCompare(b.nombre,"es")).map(w => <option key={w.id} value={w.id}>{w.nombre}</option>)}
                      {workers.some(w => w.estado === "Cesado") && <option disabled>── Cesados ──</option>}
                      {workers.filter(w => w.estado === "Cesado").sort((a,b)=>a.nombre.localeCompare(b.nombre,"es")).map(w => <option key={w.id} value={w.id}>{w.nombre} (Cesado)</option>)}
                  </Select>
                </FormField>
              </div>
              <FormField label="DNI">
                <Input value={form.dni} disabled placeholder="Automático" className="opacity-70" />
              </FormField>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Tipo de Reposo">
                <Select value={form.tipo_reposo} onChange={e => setForm(f => ({ ...f, tipo_reposo: e.target.value }))}>
                  {["Domiciliario","Hospitalario","Post-operatorio","Accidente de trabajo","Enfermedad profesional","Pre-natal","Post-natal"].map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Atención">
                <Select value={form.atencion} onChange={e => setForm(f => ({ ...f, atencion: e.target.value }))}>
                  {["EsSalud","Particular"].map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
            </div>
            <FormField label="Código CIE-10">
              <Input value={form.cie10} onChange={e => setForm(f => ({ ...f, cie10: e.target.value }))} placeholder="Ej: J06.9" />
            </FormField>
            <FormField label="Diagnóstico">
              <Input value={form.diagnostico} onChange={e => setForm(f => ({ ...f, diagnostico: e.target.value }))} placeholder="Descripción clínica del diagnóstico" />
            </FormField>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <FormField label="Fecha Inicio *">
                <Input type="date" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} />
              </FormField>
              <FormField label="Fecha Fin *">
                <Input type="date" value={form.fecha_fin} onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))} />
              </FormField>
              <FormField label="Total de días">
                <Input value={totalDiasForm === "" ? "" : `${totalDiasForm} día${totalDiasForm === 1 ? "" : "s"}`} disabled placeholder="Automático" className="opacity-70" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Control 1 (seguimiento)">
                <Input type="date" value={form.control_1} onChange={e => setForm(f => ({ ...f, control_1: e.target.value }))} />
              </FormField>
              <FormField label="Control 2 (seguimiento)">
                <Input type="date" value={form.control_2} onChange={e => setForm(f => ({ ...f, control_2: e.target.value }))} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Médico Responsable">
                <Input value={form.medico_responsable} onChange={e => setForm(f => ({ ...f, medico_responsable: e.target.value }))} placeholder="Dr. Apellidos" />
              </FormField>
              <FormField label="Centro Médico / EsSalud">
                <Input value={form.centro_medico} onChange={e => setForm(f => ({ ...f, centro_medico: e.target.value }))} placeholder="EsSalud, clínica, hospital..." />
              </FormField>
            </div>
            <FormField label="Observaciones">
              <Input value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} placeholder="Restricciones laborales, seguimiento requerido..." />
            </FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={closeModal}>Cancelar</Btn>
              <Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : editing ? "Actualizar" : "Guardar"}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Guía de importación ── */}
      {showGuide && <GuiaImportDescansos onClose={() => setShowGuide(false)} />}

      {/* ── Vista previa de importación ── */}
      {importPreview && (
        <Modal title="Vista previa de importación" onClose={() => setImportPreview(null)} wide>
          <div className="flex gap-3 mb-5">
            <div className="flex-1 text-center bg-green-900/30 border border-green-800/50 rounded-xl px-4 py-3">
              <div className="text-2xl font-bold text-green-400">{importPreview.validos.length}</div>
              <div className="text-xs text-green-600 mt-0.5">Descansos a importar</div>
            </div>
            <div className="flex-1 text-center bg-amber-900/20 border border-amber-800/40 rounded-xl px-4 py-3">
              <div className="text-2xl font-bold text-amber-400">{importPreview.sinDni.length}</div>
              <div className="text-xs text-amber-600 mt-0.5">DNI no encontrados (se omiten)</div>
            </div>
          </div>

          {importPreview.sinDni.length > 0 && (
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-amber-900/20 border border-amber-800/40 text-xs text-amber-400">
              Estos DNI no coinciden con ningún trabajador registrado y serán omitidos: <span className="font-mono text-amber-300">{importPreview.sinDni.map(s => s.dni).slice(0, 15).join(", ")}{importPreview.sinDni.length > 15 ? "…" : ""}</span>
            </div>
          )}

          <div className="text-xs text-gray-500 mb-2">Primeros registros detectados:</div>
          <div className="overflow-x-auto mb-5 rounded-lg border border-gray-800">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-800 bg-gray-900">
                {["Trabajador", "DNI", "Inicio", "Fin", "Tipo", "Atención"].map(h => <th key={h} className="text-left text-gray-600 font-medium px-3 py-2 whitespace-nowrap">{h}</th>)}
              </tr></thead>
              <tbody>
                {importPreview.validos.slice(0, 6).map((r, i) => (
                  <tr key={i} className="border-b border-gray-800/50">
                    <td className="px-3 py-2 text-white whitespace-nowrap">{r._nombre}</td>
                    <td className="px-3 py-2 font-mono text-gray-400">{r.dni}</td>
                    <td className="px-3 py-2 font-mono text-gray-400">{r.fecha_inicio}</td>
                    <td className="px-3 py-2 font-mono text-gray-400">{r.fecha_fin}</td>
                    <td className="px-3 py-2 text-gray-400">{r.tipo_reposo}</td>
                    <td className="px-3 py-2 text-gray-400">{r.atencion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2 justify-end">
            <Btn onClick={() => setImportPreview(null)}>Cancelar</Btn>
            <Btn variant="primary" onClick={executeImport} disabled={isImporting || importPreview.validos.length === 0}>
              {isImporting ? "Importando..." : `Importar ${importPreview.validos.length} descanso(s)`}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Modal Guía de Importación de Descansos Médicos ──
function GuiaImportDescansos({ onClose }) {
  const cols = [
    { col: "DNI",            desc: "DNI del trabajador — debe existir en el Directorio", ejemplo: "12345678",            req: true  },
    { col: "FECHA INICIO",   desc: "Inicio del descanso (DD/MM/AAAA)",                   ejemplo: "01/06/2026",          req: true  },
    { col: "FECHA FIN",      desc: "Fin del descanso (DD/MM/AAAA)",                      ejemplo: "08/06/2026",          req: true  },
    { col: "TIPO REPOSO",    desc: "Domiciliario / Hospitalario / etc.",                ejemplo: "Domiciliario",        req: false },
    { col: "ATENCION",       desc: "EsSalud o Particular",                              ejemplo: "EsSalud",             req: false },
    { col: "DIAGNOSTICO",    desc: "Descripción clínica",                               ejemplo: "Faringitis aguda",    req: false },
    { col: "CIE-10",         desc: "Código CIE-10",                                     ejemplo: "J02.9",               req: false },
    { col: "CENTRO MEDICO",  desc: "Centro de atención",                                ejemplo: "EsSalud Angamos",     req: false },
    { col: "CONTROL 1",      desc: "Fecha de 1.er control (DD/MM/AAAA)",                ejemplo: "10/06/2026",          req: false },
    { col: "CONTROL 2",      desc: "Fecha de 2.º control (DD/MM/AAAA)",                 ejemplo: "20/06/2026",          req: false },
    { col: "MEDICO",         desc: "Médico responsable",                                ejemplo: "Dr. Pérez",           req: false },
    { col: "OBSERVACIONES",  desc: "Notas / restricciones",                             ejemplo: "Reposo absoluto",     req: false },
  ];
  const downloadTemplate = () => {
    const headers = cols.map(c => c.col);
    const example = cols.map(c => c.ejemplo);
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Descansos");
    XLSX.writeFile(wb, "plantilla_descansos_medicos.xlsx");
    showToast("Plantilla descargada", "success");
  };
  return (
    <Modal title="Guía de Importación — Descansos Médicos" onClose={onClose} wide>
      <div className="mb-4 px-3 py-2.5 rounded-lg bg-blue-900/20 border border-blue-900/40 text-xs text-blue-400">
        El archivo (Excel o CSV) debe tener estos encabezados. Las columnas con <span className="text-red-400">*</span> son obligatorias.
        El <strong>DNI</strong> se usa para vincular cada descanso con el trabajador ya registrado en el Directorio; si el DNI no existe, esa fila se omite.
      </div>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-gray-800">
            <th className="text-left text-gray-500 font-medium py-2 pr-4">Columna</th>
            <th className="text-left text-gray-500 font-medium py-2 pr-4">Descripción</th>
            <th className="text-left text-gray-500 font-medium py-2">Ejemplo</th>
          </tr></thead>
          <tbody>
            {cols.map(c => (
              <tr key={c.col} className="border-b border-gray-800/50">
                <td className="py-2 pr-4 font-mono text-blue-400 whitespace-nowrap">{c.col}{c.req && <span className="text-red-400 ml-1">*</span>}</td>
                <td className="py-2 pr-4 text-gray-400">{c.desc}</td>
                <td className="py-2 text-gray-600 font-mono">{c.ejemplo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 justify-end">
        <Btn onClick={onClose}>Cerrar</Btn>
        <Btn variant="primary" onClick={downloadTemplate}><Download size={13} /> Descargar Plantilla</Btn>
      </div>
    </Modal>
  );
}
