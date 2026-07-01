// ════════════════════════════════════════════════════════════════════
//  MonitoreoComind — Monitoreo de Agentes Ocupacionales (Comindustria)
//  Agentes específicos + puntos de medición múltiples + recomendaciones
//  generales + plazo de acción.
// ════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase, puedeEliminar } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { fmtFecha } from '../../lib/helpers.js';
import { Badge } from '../../components/ui/Badge.jsx';
import { KpiCard } from '../../components/ui/KpiCard.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Btn } from '../../components/ui/Btn.jsx';
import { ExportBtn } from '../../components/ui/ExportBtn.jsx';
import {
  Plus, Pencil, Trash2, Activity, Eye, FileDown,
  AlertTriangle, CheckCircle, Clock, ArrowLeft
} from 'lucide-react';

// ── Agentes de Comindustria ──────────────────────────────────────────
const AGENTES = [
  "Coliformes totales",
  "Disergonómico",
  "Dosimetría",
  "Estrés por calor",
  "Iluminación",
  "Mohos y levaduras",
  "Sonometría",
  "Partículas respirables",
  "Vibración de cuerpo completo",
  "Psicosocial",
];

const ESTADOS = ["Conforme", "No conforme", "Acción correctiva requerida", "Pendiente revisión"];
const estadoColor = {
  "Conforme": "green",
  "No conforme": "red",
  "Acción correctiva requerida": "amber",
  "Pendiente revisión": "gray",
};

const puntoVacio = () => ({
  nombre: "", resultado: "", unidad: "", limite: "", estado: "Conforme", observacion: ""
});

export default function MonitoreoComind({ empresaId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState("lista"); // lista | form | detalle
  const [editando, setEditando] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [fAgente, setFAgente] = useState("");
  const [fEstado, setFEstado] = useState("");

  const initForm = () => ({
    tipo_agente: AGENTES[0], area_monitoreada: "", fecha_monitoreo: new Date().toISOString().split("T")[0],
    empresa_laboratorio: "", norma: "",
    puntos: [puntoVacio()],
    recomendaciones: "",
    estado_general: "Pendiente revisión",
    plazo_accion: "", responsable_accion: "",
    observaciones: "",
  });
  const [form, setForm] = useState(initForm());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("monitoreo_agentes")
      .select("*").eq("empresa_id", empresaId)
      .order("fecha_monitoreo", { ascending: false });
    if (error) showToast("Error: " + error.message, "error");
    setRecords(data || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const abrirNuevo = () => { setEditando(null); setForm(initForm()); setVista("form"); };
  const abrirEditar = (r) => {
    setForm({
      tipo_agente: r.tipo_agente || AGENTES[0],
      area_monitoreada: r.area_monitoreada || "",
      fecha_monitoreo: r.fecha_monitoreo || "",
      empresa_laboratorio: r.empresa_laboratorio || "",
      norma: r.norma || "",
      puntos: (Array.isArray(r.puntos) && r.puntos.length) ? r.puntos : [puntoVacio()],
      recomendaciones: r.recomendaciones || "",
      estado_general: r.estado_general || "Pendiente revisión",
      plazo_accion: r.plazo_accion || "",
      responsable_accion: r.responsable_accion || "",
      observaciones: r.observaciones || "",
    });
    setEditando(r.id); setVista("form");
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este monitoreo?")) return;
    await supabase.from("monitoreo_agentes").delete().eq("id", id);
    showToast("Eliminado", "info"); load();
  };

  const guardar = async () => {
    if (!form.area_monitoreada.trim()) { showToast("Indica el área monitoreada", "error"); return; }
    setSaving(true);
    const payload = {
      empresa_id: empresaId,
      tipo_agente: form.tipo_agente,
      area_monitoreada: form.area_monitoreada,
      fecha_monitoreo: form.fecha_monitoreo,
      empresa_laboratorio: form.empresa_laboratorio || null,
      norma: form.norma || null,
      puntos: form.puntos.filter(p => p.nombre || p.resultado),
      recomendaciones: form.recomendaciones || null,
      estado_general: form.estado_general,
      plazo_accion: form.plazo_accion || null,
      responsable_accion: form.responsable_accion || null,
      observaciones: form.observaciones || null,
      // Campos legacy del módulo original (rellenamos para compatibilidad)
      resultado_valor: null, unidad: null, limite_permisible: null, supera_limite: false,
      medidas_correctivas: form.recomendaciones || null,
      proxima_fecha: form.plazo_accion || null,
    };
    const { error } = editando
      ? await supabase.from("monitoreo_agentes").update(payload).eq("id", editando)
      : await supabase.from("monitoreo_agentes").insert(payload);
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast(editando ? "Actualizado" : "Monitoreo registrado", "success");
    setVista("lista"); load();
  };

  // ── Helpers puntos ──
  const setPunto = (i, k, v) => setForm(f => ({ ...f, puntos: f.puntos.map((p, j) => j === i ? { ...p, [k]: v } : p) }));
  const addPunto = () => setForm(f => ({ ...f, puntos: [...f.puntos, puntoVacio()] }));
  const delPunto = (i) => setForm(f => ({ ...f, puntos: f.puntos.filter((_, j) => j !== i) }));

  // ── KPIs ──
  const noConf = records.filter(r => r.estado_general === "No conforme" || r.estado_general === "Acción correctiva requerida").length;
  const conPlazo = records.filter(r => r.plazo_accion && new Date(r.plazo_accion) >= new Date()).length;
  const hoy = new Date().toISOString().split("T")[0];
  const vencidos = records.filter(r => r.plazo_accion && r.plazo_accion < hoy && r.estado_general !== "Conforme").length;

  // ── Filtros ──
  const filtered = records.filter(r =>
    (!fAgente || r.tipo_agente === fAgente) &&
    (!fEstado || r.estado_general === fEstado)
  );

  // ── PDF de un monitoreo ──
  const generarPDF = (r) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const M = 14; const W = doc.internal.pageSize.getWidth();
    doc.setFontSize(14).setFont(undefined, "bold").text("Registro de Monitoreo Ocupacional", M, 18);
    doc.setFontSize(8).setFont(undefined, "normal").setTextColor(120);
    doc.text(`Comindustria · Generado: ${hoy}`, M, 24);
    doc.setTextColor(0);

    const meta = [
      ["Agente", r.tipo_agente], ["Área", r.area_monitoreada],
      ["Fecha", fmtFecha(r.fecha_monitoreo)], ["Empresa ejecutora", r.empresa_laboratorio || "—"],
      ["Norma de referencia", r.norma || "—"], ["Estado general", r.estado_general || "—"],
      ["Plazo de acción", r.plazo_accion ? fmtFecha(r.plazo_accion) : "—"],
      ["Responsable de acción", r.responsable_accion || "—"],
    ];
    autoTable(doc, {
      startY: 28, body: meta, theme: "grid",
      styles: { fontSize: 8, cellPadding: 1.5 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 50, fillColor: [241, 245, 249] } },
      margin: { left: M, right: M },
    });

    const puntos = Array.isArray(r.puntos) ? r.puntos : [];
    if (puntos.length) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 5,
        head: [["Punto / Área", "Resultado", "Unidad", "Límite", "Estado", "Observación"]],
        body: puntos.map(p => [p.nombre || "—", p.resultado || "—", p.unidad || "—", p.limite || "—", p.estado || "—", p.observacion || "—"]),
        styles: { fontSize: 7.5, cellPadding: 1.5 },
        headStyles: { fillColor: [30, 64, 175], textColor: 255 },
        didParseCell: (d) => {
          if (d.section === "body" && d.column.index === 4) {
            if (d.cell.raw === "No conforme") { d.cell.styles.fillColor = [254, 226, 226]; d.cell.styles.textColor = [185, 28, 28]; }
            else if (d.cell.raw === "Conforme") { d.cell.styles.fillColor = [220, 252, 231]; d.cell.styles.textColor = [22, 101, 52]; }
          }
        },
        margin: { left: M, right: M },
      });
    }

    if (r.recomendaciones) {
      let y = doc.lastAutoTable.finalY + 6;
      doc.setFontSize(9).setFont(undefined, "bold").text("Recomendaciones", M, y);
      doc.setFont(undefined, "normal").setFontSize(8);
      const lines = doc.splitTextToSize(r.recomendaciones, W - 2 * M);
      doc.text(lines, M, y + 5);
    }

    doc.save(`monitoreo_${r.tipo_agente.replace(/\s+/g,"_")}_${r.fecha_monitoreo}.pdf`);
  };

  // ════════ VISTA: FORMULARIO ════════
  if (vista === "form") {
    return (
      <div className="max-w-4xl">
        <button onClick={() => setVista("lista")} className="mb-4 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
          <ArrowLeft size={13} /> Cancelar y volver
        </button>
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-white font-semibold text-sm">{editando ? "Editar monitoreo" : "Nuevo registro de monitoreo"}</h3>
            <p className="text-[11px] text-gray-600 mt-0.5">Comindustria — Higiene Ocupacional</p>
          </div>
          <div className="flex gap-2">
            <Btn size="sm" variant="ghost" onClick={() => setVista("lista")}>Cancelar</Btn>
            <Btn size="sm" variant="primary" onClick={guardar} disabled={saving}>{saving ? "Guardando..." : editando ? "Actualizar" : "Guardar"}</Btn>
          </div>
        </div>

        {/* Datos generales */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <FormField label="Agente de monitoreo *">
            <Select value={form.tipo_agente} onChange={e => setForm(f => ({ ...f, tipo_agente: e.target.value }))}>
              {AGENTES.map(a => <option key={a}>{a}</option>)}
            </Select>
          </FormField>
          <FormField label="Fecha *">
            <Input type="date" value={form.fecha_monitoreo} onChange={e => setForm(f => ({ ...f, fecha_monitoreo: e.target.value }))} />
          </FormField>
          <FormField label="Estado general *">
            <Select value={form.estado_general} onChange={e => setForm(f => ({ ...f, estado_general: e.target.value }))}>
              {ESTADOS.map(s => <option key={s}>{s}</option>)}
            </Select>
          </FormField>
          <FormField label="Área / Lugar monitoreado *" className="sm:col-span-2">
            <Input value={form.area_monitoreada} onChange={e => setForm(f => ({ ...f, area_monitoreada: e.target.value }))} placeholder="Ej: Área de producción, Almacén, Comedor..." />
          </FormField>
          <FormField label="Empresa ejecutora">
            <Input value={form.empresa_laboratorio} onChange={e => setForm(f => ({ ...f, empresa_laboratorio: e.target.value }))} placeholder="Laboratorio o empresa que realizó el monitoreo" />
          </FormField>
          <FormField label="Norma de referencia">
            <Input value={form.norma} onChange={e => setForm(f => ({ ...f, norma: e.target.value }))} placeholder="Ej: RM 375-2008-TR, D.S. 005-2012-TR..." />
          </FormField>
          <FormField label="Plazo de acción">
            <Input type="date" value={form.plazo_accion} onChange={e => setForm(f => ({ ...f, plazo_accion: e.target.value }))} />
          </FormField>
          <FormField label="Responsable de acción">
            <Input value={form.responsable_accion} onChange={e => setForm(f => ({ ...f, responsable_accion: e.target.value }))} placeholder="Nombre del responsable" />
          </FormField>
        </div>

        {/* Puntos de medición */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Puntos de medición ({form.puntos.length})</p>
            <Btn size="sm" variant="ghost" onClick={addPunto}><Plus size={12} /> Agregar punto</Btn>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-800 bg-gray-800/40">
                {["Punto / Área", "Resultado", "Unidad", "Límite", "Estado", "Observación", ""].map(h => (
                  <th key={h} className="px-3 py-2 text-gray-500 font-medium text-left whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {form.puntos.map((p, i) => (
                  <tr key={i} className="border-b border-gray-800/40">
                    <td className="px-2 py-1.5">
                      <input value={p.nombre} onChange={e => setPunto(i, "nombre", e.target.value)} placeholder="Nombre del punto"
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-blue-500" style={{ minWidth: 160 }} />
                    </td>
                    <td className="px-2 py-1.5">
                      <input value={p.resultado} onChange={e => setPunto(i, "resultado", e.target.value)} placeholder="Valor"
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-blue-500" style={{ minWidth: 70 }} />
                    </td>
                    <td className="px-2 py-1.5">
                      <input value={p.unidad} onChange={e => setPunto(i, "unidad", e.target.value)} placeholder="dB, lux…"
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-blue-500" style={{ minWidth: 70 }} />
                    </td>
                    <td className="px-2 py-1.5">
                      <input value={p.limite} onChange={e => setPunto(i, "limite", e.target.value)} placeholder="Límite"
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-blue-500" style={{ minWidth: 70 }} />
                    </td>
                    <td className="px-2 py-1.5">
                      <select value={p.estado} onChange={e => setPunto(i, "estado", e.target.value)}
                        className={`rounded px-1.5 py-1 text-[11px] font-medium focus:outline-none border ${
                          p.estado === "Conforme" ? "bg-emerald-900/40 border-emerald-700 text-emerald-300"
                          : p.estado === "No conforme" ? "bg-red-900/40 border-red-700 text-red-300"
                          : "bg-amber-900/30 border-amber-700 text-amber-300"}`}>
                        <option>Conforme</option>
                        <option>No conforme</option>
                        <option>Borderline</option>
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input value={p.observacion} onChange={e => setPunto(i, "observacion", e.target.value)} placeholder="Observación"
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-blue-500" style={{ minWidth: 140 }} />
                    </td>
                    <td className="px-2 py-1.5">
                      {form.puntos.length > 1 && (
                        <button onClick={() => delPunto(i)} className="text-red-500/40 hover:text-red-400"><Trash2 size={12} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recomendaciones generales */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4 space-y-3">
          <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Recomendaciones generales</p>
          <textarea rows={4} value={form.recomendaciones} onChange={e => setForm(f => ({ ...f, recomendaciones: e.target.value }))}
            placeholder="Escribe aquí las recomendaciones generales que aplican al monitoreo (se pueden compartir entre todos los puntos)..."
            className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500 resize-none" />
          <FormField label="Observaciones adicionales">
            <Input value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} placeholder="Observaciones del monitoreo" />
          </FormField>
        </div>

        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setVista("lista")}>Cancelar</Btn>
          <Btn variant="primary" onClick={guardar} disabled={saving}>{saving ? "Guardando..." : editando ? "Actualizar" : "Guardar monitoreo"}</Btn>
        </div>
      </div>
    );
  }

  // ════════ VISTA: DETALLE ════════
  if (detalle) {
    const puntos = Array.isArray(detalle.puntos) ? detalle.puntos : [];
    return (
      <div className="max-w-3xl">
        <button onClick={() => setDetalle(null)} className="mb-4 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
          <ArrowLeft size={13} /> Volver al listado
        </button>
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-white font-semibold text-base">{detalle.tipo_agente}</h3>
            <p className="text-gray-500 text-xs">{detalle.area_monitoreada} · {fmtFecha(detalle.fecha_monitoreo)}</p>
          </div>
          <div className="flex gap-2">
            <Btn size="sm" variant="ghost" onClick={() => generarPDF(detalle)}><FileDown size={13} /> PDF</Btn>
            <Btn size="sm" variant="primary" onClick={() => { setDetalle(null); abrirEditar(detalle); }}><Pencil size={13} /> Editar</Btn>
          </div>
        </div>

        {/* Meta */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4 grid sm:grid-cols-2 gap-3 text-xs">
          {[
            ["Estado general", <Badge color={estadoColor[detalle.estado_general] || "gray"}>{detalle.estado_general || "—"}</Badge>],
            ["Empresa ejecutora", detalle.empresa_laboratorio || "—"],
            ["Norma", detalle.norma || "—"],
            ["Plazo de acción", fmtFecha(detalle.plazo_accion)],
            ["Responsable", detalle.responsable_accion || "—"],
          ].map(([label, val], i) => (
            <div key={i}><span className="text-gray-600">{label}: </span><span className="text-gray-300">{val}</span></div>
          ))}
        </div>

        {/* Puntos */}
        {puntos.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-4">
            <div className="px-4 py-2.5 border-b border-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wide">Puntos de medición</div>
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-800 bg-gray-800/40">
                {["Punto", "Resultado", "Unidad", "Límite", "Estado", "Observación"].map(h => (
                  <th key={h} className="px-3 py-2 text-gray-500 font-medium text-left">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {puntos.map((p, i) => (
                  <tr key={i} className="border-b border-gray-800/40">
                    <td className="px-3 py-2 text-gray-300 font-medium">{p.nombre || "—"}</td>
                    <td className="px-3 py-2 font-mono text-gray-300">{p.resultado || "—"}</td>
                    <td className="px-3 py-2 text-gray-500">{p.unidad || "—"}</td>
                    <td className="px-3 py-2 font-mono text-gray-500">{p.limite || "—"}</td>
                    <td className="px-3 py-2">
                      <Badge color={p.estado === "Conforme" ? "green" : p.estado === "No conforme" ? "red" : "amber"}>{p.estado || "—"}</Badge>
                    </td>
                    <td className="px-3 py-2 text-gray-400">{p.observacion || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Recomendaciones */}
        {detalle.recomendaciones && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Recomendaciones generales</p>
            <p className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">{detalle.recomendaciones}</p>
          </div>
        )}
        {detalle.observaciones && (
          <div className="bg-gray-800/50 rounded-xl px-4 py-3 text-xs text-gray-400 border border-gray-700">{detalle.observaciones}</div>
        )}
      </div>
    );
  }

  // ════════ VISTA: LISTA ════════
  return (
    <div>
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
            <Activity size={15} className="text-cyan-400" /> Monitoreo de Agentes Ocupacionales
          </h3>
          <p className="text-gray-500 text-xs max-w-xl">Registro de monitoreos higiénicos con puntos de medición, resultados y recomendaciones.</p>
        </div>
        <div className="flex gap-2">
          <ExportBtn filename="monitoreo_agentes" data={records.map(r => ({
            Agente: r.tipo_agente, Área: r.area_monitoreada, Fecha: r.fecha_monitoreo,
            "Empresa ejecutora": r.empresa_laboratorio || "", Estado: r.estado_general || "",
            "Plazo acción": r.plazo_accion || "", Responsable: r.responsable_accion || "",
            Recomendaciones: r.recomendaciones || "",
          }))} />
          <Btn size="sm" variant="primary" onClick={abrirNuevo}><Plus size={13} /> Nuevo monitoreo</Btn>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Total monitoreos" value={records.length} sub="registros" accentColor="blue" />
        <KpiCard label="No conformes" value={noConf} sub="requieren acción" accentColor={noConf ? "red" : "emerald"} />
        <KpiCard label="Con plazo activo" value={conPlazo} sub="pendientes de cierre" accentColor="amber" />
        <KpiCard label="Plazos vencidos" value={vencidos} sub="sin cerrar" accentColor={vencidos ? "red" : "emerald"} />
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap mb-4 p-3 bg-gray-900/50 border border-gray-800 rounded-xl">
        <select value={fAgente} onChange={e => setFAgente(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-500">
          <option value="">Todos los agentes</option>
          {AGENTES.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={fEstado} onChange={e => setFEstado(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-500">
          <option value="">Todos los estados</option>
          {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(fAgente || fEstado) && <button onClick={() => { setFAgente(""); setFEstado(""); }} className="text-xs text-blue-400 hover:text-blue-300">✕ Limpiar</button>}
        <span className="text-xs text-gray-600 ml-auto self-center">{filtered.length} registros</span>
      </div>

      {/* Tabla */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800">
            {["Agente","Área","Fecha","Puntos","Estado","Plazo",""].map(h => (
              <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
            {!loading && filtered.map(r => {
              const puntos = Array.isArray(r.puntos) ? r.puntos : [];
              const ncPuntos = puntos.filter(p => p.estado === "No conforme").length;
              return (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer" onClick={() => setDetalle(r)}>
                  <td className="px-4 py-3 text-xs text-gray-300 font-medium">{r.tipo_agente}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-[160px] truncate">{r.area_monitoreada}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{fmtFecha(r.fecha_monitoreo)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono text-xs text-gray-400">{puntos.length}</span>
                    {ncPuntos > 0 && <span className="ml-1 text-[10px] text-red-400">({ncPuntos} NC)</span>}
                  </td>
                  <td className="px-4 py-3"><Badge color={estadoColor[r.estado_general] || "gray"}>{r.estado_general || "—"}</Badge></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                    {r.plazo_accion
                      ? <span className={r.plazo_accion < hoy && r.estado_general !== "Conforme" ? "text-red-400" : "text-gray-500"}>{fmtFecha(r.plazo_accion)}</span>
                      : "—"}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <button onClick={() => setDetalle(r)} className="text-gray-500 hover:text-emerald-400" title="Ver"><Eye size={13} /></button>
                      <button onClick={() => generarPDF(r)} className="text-gray-500 hover:text-blue-400" title="PDF"><FileDown size={13} /></button>
                      <button onClick={() => abrirEditar(r)} className="text-gray-500 hover:text-blue-400" title="Editar"><Pencil size={13} /></button>
                      {puedeEliminar() && (
                        <button onClick={() => handleDelete(r.id)} className="text-red-500/40 hover:text-red-400" title="Eliminar"><Trash2 size={13} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && !filtered.length && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-600 text-sm">Sin monitoreos. Usa "Nuevo monitoreo" para comenzar.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
