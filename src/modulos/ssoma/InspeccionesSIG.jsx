// ════════════════════════════════════════════════════════════════════
//  InspeccionesSIG — Inspecciones SST con plantillas SIG (Multisel)
//  Llenado en la app (Sí/No/NA por ítem + observaciones + acciones),
//  % de cumplimiento, historial y export PDF con código, versión y logo.
// ════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase, puedeEliminar } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { fmtFecha, brandingEmpresa } from '../../lib/helpers.js';
import { Modal } from '../../components/ui/Modal.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Btn } from '../../components/ui/Btn.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { PLANTILLAS_INSPECCION } from '../../constants/inspecciones-plantillas.js';
import {
  Plus, Pencil, Trash2, FileDown, ChevronLeft, ChevronDown, ChevronRight,
  ClipboardCheck, Search,
} from 'lucide-react';

// Carga un logo desde /public como dataURL para el PDF
function cargarLogo(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0); try { resolve({ data: c.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight }); } catch { resolve(null); } };
    img.onerror = () => resolve(null); img.src = src;
  });
}

const EST = { si: { label: "Sí", on: "bg-emerald-600 border-emerald-600 text-white" }, no: { label: "No", on: "bg-red-600 border-red-600 text-white" }, na: { label: "N.A.", on: "bg-gray-500 border-gray-500 text-white" } };
const OFF = "border-gray-700 text-gray-400 hover:border-gray-500";

export default function InspeccionesSIG({ empresaId, empresa }) {
  const brand = brandingEmpresa(empresa?.nombre);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);       // inspección en edición/creación
  const [saving, setSaving] = useState(false);
  const [openSec, setOpenSec] = useState({});    // secciones colapsadas en el form
  const [busca, setBusca] = useState("");

  const plantillaDe = (key) => PLANTILLAS_INSPECCION[key];

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("inspecciones_sig").select("*").eq("empresa_id", empresaId).order("fecha", { ascending: false }).order("created_at", { ascending: false });
    setRegistros(data || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  // ── % de cumplimiento ──
  const pct = (datos, p) => {
    if (p?.tipo === "filas") {
      const filas = (datos?.filas) || [];
      const ok = filas.filter(r => (r[p.okKey] || "") === "Sí").length;
      return filas.length ? Math.round(ok / filas.length * 100) : 0;
    }
    if (p?.tipo === "botiquines") {
      const bots = datos?.botiquines || []; let ok = 0, tot = 0;
      bots.forEach(b => p.implementos.forEach(im => { const it = b.items?.[im.id]; const nec = Number(it?.nec) || 0; if (nec > 0) { tot++; if ((Number(it?.act) || 0) >= nec) ok++; } }));
      return tot ? Math.round(ok / tot * 100) : 0;
    }
    const vals = Object.values(datos || {});
    const si = vals.filter(v => v.e === "si").length, no = vals.filter(v => v.e === "no").length;
    return (si + no) ? Math.round(si / (si + no) * 100) : 0;
  };

  // ── Nuevo / editar ──
  const nuevo = (key) => {
    const p = plantillaDe(key);
    setForm({ plantilla: key, codigo: p.codigo, version: p.version, fecha: new Date().toISOString().slice(0, 10), responsable: "", area: "", hora_inicio: "", hora_final: "", datos: p.tipo === "filas" ? { filas: [] } : p.tipo === "botiquines" ? { botiquines: [] } : {}, observaciones: "" });
    setOpenSec({ 0: true });
  };
  const editar = (r) => { setForm({ ...r, datos: r.datos || {} }); setOpenSec({ 0: true }); };
  const setItem = (itemId, patch) => setForm(f => ({ ...f, datos: { ...f.datos, [itemId]: { ...(f.datos[itemId] || {}), ...patch } } }));
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));
  // Filas (extintores, luces de emergencia)
  const addFila = () => setForm(f => ({ ...f, datos: { ...f.datos, filas: [...(f.datos.filas || []), {}] } }));
  const setFila = (i, key, val) => setForm(f => ({ ...f, datos: { ...f.datos, filas: (f.datos.filas || []).map((r, j) => j === i ? { ...r, [key]: val } : r) } }));
  const delFila = (i) => setForm(f => ({ ...f, datos: { ...f.datos, filas: (f.datos.filas || []).filter((_, j) => j !== i) } }));
  // Botiquines (matriz)
  const addBotiquin = () => setForm(f => ({ ...f, datos: { ...f.datos, botiquines: [...(f.datos.botiquines || []), { ubicacion: "", estado: {}, items: {} }] } }));
  const setBot = (i, patch) => setForm(f => ({ ...f, datos: { ...f.datos, botiquines: (f.datos.botiquines || []).map((b, j) => j === i ? { ...b, ...patch } : b) } }));
  const setBotEstado = (i, key, val) => setForm(f => ({ ...f, datos: { ...f.datos, botiquines: (f.datos.botiquines || []).map((b, j) => j === i ? { ...b, estado: { ...b.estado, [key]: val } } : b) } }));
  const setBotItem = (i, mId, key, val) => setForm(f => ({ ...f, datos: { ...f.datos, botiquines: (f.datos.botiquines || []).map((b, j) => j === i ? { ...b, items: { ...b.items, [mId]: { ...(b.items?.[mId] || {}), [key]: val } } } : b) } }));
  const delBotiquin = (i) => setForm(f => ({ ...f, datos: { ...f.datos, botiquines: (f.datos.botiquines || []).filter((_, j) => j !== i) } }));

  const guardar = async () => {
    if (!form.responsable?.trim()) { showToast("Indica el responsable de la inspección", "error"); return; }
    setSaving(true);
    const payload = { empresa_id: empresaId, plantilla: form.plantilla, codigo: form.codigo, version: form.version,
      fecha: form.fecha || null, responsable: form.responsable, area: form.area || null, hora_inicio: form.hora_inicio || null,
      hora_final: form.hora_final || null, datos: form.datos || {}, observaciones: form.observaciones || null };
    const { error } = form.id
      ? await supabase.from("inspecciones_sig").update(payload).eq("id", form.id)
      : await supabase.from("inspecciones_sig").insert(payload);
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast("Inspección guardada", "success"); setForm(null); load();
  };
  const eliminar = async (id) => {
    if (!confirm("¿Eliminar esta inspección?")) return;
    await supabase.from("inspecciones_sig").delete().eq("id", id); load();
  };

  // ── Exportar PDF (formato SIG con logo) ──
  const exportPDF = async (r) => {
    const p = plantillaDe(r.plantilla); if (!p) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth(); const M = 12;
    const logo = brand.logo ? await cargarLogo(brand.logo) : null;
    // Cabecera tipo registro
    doc.setDrawColor(150); doc.rect(M, M, W - 2 * M, 20);
    if (logo) { const h = 14, w = Math.min(38, logo.w * (h / logo.h)); doc.addImage(logo.data, "PNG", M + 2, M + 3, w, h); }
    doc.setFontSize(11).setFont(undefined, "bold").text(p.titulo, W / 2, M + 9, { align: "center" });
    doc.setFontSize(8).setFont(undefined, "normal");
    doc.text(`Código: ${r.codigo || p.codigo}`, W - M - 2, M + 5, { align: "right" });
    doc.text(`Versión: ${r.version || p.version}`, W - M - 2, M + 10, { align: "right" });
    doc.text(`Razón social: ${empresa?.nombre || "MULTISEL S.A.C."}`, W / 2, M + 15, { align: "center" });
    let y = M + 24;
    doc.setFontSize(8);
    doc.text(`Responsable: ${r.responsable || "—"}    Área: ${r.area || "—"}    Fecha: ${fmtFecha(r.fecha)}    Hora: ${r.hora_inicio || ""}–${r.hora_final || ""}    Cumplimiento: ${pct(r.datos, p)}%`, M, y);
    y += 4;
    if (p.tipo === "filas") {
      // Tabla por filas (extintores, luces)
      const filas = (r.datos?.filas) || [];
      autoTable(doc, {
        startY: y,
        head: [["N°", ...p.columnas.map(c => c.label)]],
        body: filas.map((row, i) => [i + 1, ...p.columnas.map(c => row[c.key] || "")]),
        styles: { fontSize: 6, cellPadding: 1, valign: "top" },
        headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 6 },
        margin: { left: M, right: M },
      });
      y = doc.lastAutoTable.finalY + 2;
      if (p.nota) { doc.setFontSize(6).setTextColor(110).text(doc.splitTextToSize(p.nota, W - 2 * M), M, y + 2); y += 10; doc.setTextColor(0); }
    } else if (p.tipo === "botiquines") {
      const bots = r.datos?.botiquines || [];
      bots.forEach((b, bi) => {
        const estadoTxt = p.estados.map(es => `${es.label}: ${b.estado?.[es.key] || "—"}`).join("   ");
        autoTable(doc, {
          startY: y,
          head: [[{ content: `BOTIQUÍN ${bi + 1}   ${b.ubicacion || ""}   ·   ${estadoTxt}`, colSpan: 5, styles: { halign: "left", fillColor: [30, 64, 175], textColor: 255 } }], ["Implemento", "Vencimiento", "Necesaria", "Actual", "Faltante"]],
          body: p.implementos.map(im => { const it = b.items?.[im.id] || {}; const falt = Math.max(0, (Number(it.nec) || 0) - (Number(it.act) || 0)); return [im.texto, it.venc || "", it.nec ?? "", it.act ?? "", falt]; }),
          styles: { fontSize: 6, cellPadding: 0.8, valign: "top" }, headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 6 },
          columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 24, halign: "center" }, 2: { cellWidth: 18, halign: "center" }, 3: { cellWidth: 18, halign: "center" }, 4: { cellWidth: 18, halign: "center" } },
          margin: { left: M, right: M },
        });
        y = doc.lastAutoTable.finalY + 2;
      });
    } else {
      for (const sec of p.secciones) {
        const body = sec.items.map(it => {
          const d = r.datos?.[it.id] || {};
          return [it.n, it.texto, d.e === "si" ? "Sí" : d.e === "no" ? "No" : d.e === "na" ? "N.A." : "—", d.obs || "", d.acc || ""];
        });
        autoTable(doc, {
          startY: y,
          head: [[{ content: sec.nombre.toUpperCase(), colSpan: 5, styles: { halign: "left", fillColor: [30, 64, 175], textColor: 255 } }], ["N°", "Verificación", "Cumpl.", "Observaciones", "Acciones correctivas"]],
          body, styles: { fontSize: 6.5, cellPadding: 1, valign: "top" },
          headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 6.5 },
          columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 86 }, 2: { cellWidth: 14, halign: "center" }, 3: { cellWidth: 40 }, 4: { cellWidth: 38 } },
          didParseCell: (dd) => { if (dd.section === "body" && dd.column.index === 2) { const t = dd.cell.raw; if (t === "Sí") { dd.cell.styles.textColor = [22, 101, 52]; } else if (t === "No") { dd.cell.styles.textColor = [153, 27, 27]; } } },
          margin: { left: M, right: M },
        });
        y = doc.lastAutoTable.finalY + 1;
      }
    }
    if (r.observaciones) { doc.setFontSize(8).text(`Observaciones generales: ${r.observaciones}`, M, y + 4, { maxWidth: W - 2 * M }); }
    doc.save(`${(r.codigo || p.codigo).replace(/[\/.]/g, "-")}_${fmtFecha(r.fecha)}.pdf`);
  };

  if (loading) return <div className="text-gray-600 text-sm py-10 text-center">Cargando…</div>;

  // ── VISTA FORMULARIO ──
  if (form) {
    const p = plantillaDe(form.plantilla);
    const q = busca.toLowerCase();
    return (
      <div>
        <button onClick={() => { setForm(null); setBusca(""); }} className="mb-4 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"><ChevronLeft size={13} /> Volver</button>
        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h3 className="text-white font-semibold text-sm">{p.titulo}</h3>
            <p className="text-gray-500 text-xs">{p.codigo} · v{p.version} · Cumplimiento {pct(form.datos, p)}%</p>
          </div>
          <Btn size="sm" variant="primary" disabled={saving} onClick={guardar}>{saving ? "Guardando…" : "Guardar inspección"}</Btn>
        </div>

        {/* Cabecera */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 mb-3 grid grid-cols-2 md:grid-cols-5 gap-3">
          <FormField label="Fecha"><Input type="date" value={form.fecha || ""} onChange={e => setF("fecha", e.target.value)} /></FormField>
          <FormField label="Responsable *"><Input value={form.responsable} onChange={e => setF("responsable", e.target.value)} /></FormField>
          <FormField label="Área"><Input value={form.area} onChange={e => setF("area", e.target.value)} /></FormField>
          <FormField label="Hora inicio"><Input type="time" value={form.hora_inicio || ""} onChange={e => setF("hora_inicio", e.target.value)} /></FormField>
          <FormField label="Hora final"><Input type="time" value={form.hora_final || ""} onChange={e => setF("hora_final", e.target.value)} /></FormField>
        </div>

        {/* ── Editor de FILAS (extintores, luces) ── */}
        {p.tipo === "filas" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 mb-3">
            {p.nota && <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">{p.nota}</p>}
            <div className="overflow-x-auto">
              <table className="text-xs" style={{ minWidth: 720 }}>
                <thead><tr className="border-b border-gray-800">
                  <th className="text-left text-gray-600 font-medium px-2 py-1.5">N°</th>
                  {p.columnas.map(c => <th key={c.key} className="text-left text-gray-600 font-medium px-2 py-1.5 whitespace-nowrap">{c.label}</th>)}
                  <th></th>
                </tr></thead>
                <tbody>
                  {(form.datos.filas || []).map((row, i) => (
                    <tr key={i} className="border-b border-gray-800/40">
                      <td className="px-2 py-1 text-gray-500">{i + 1}</td>
                      {p.columnas.map(c => (
                        <td key={c.key} className="px-1 py-1">
                          {c.tipo === "select"
                            ? <select value={row[c.key] || ""} onChange={e => setFila(i, c.key, e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-1.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500">
                                <option value=""></option>{c.opciones.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            : <input defaultValue={row[c.key] || ""} onBlur={e => e.target.value !== (row[c.key] || "") && setFila(i, c.key, e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-1.5 py-1 text-xs text-white w-full min-w-[90px] focus:outline-none focus:border-blue-500" />}
                        </td>
                      ))}
                      <td className="px-1"><button onClick={() => delFila(i)} className="text-gray-600 hover:text-red-400"><Trash2 size={13} /></button></td>
                    </tr>
                  ))}
                  {(form.datos.filas || []).length === 0 && <tr><td colSpan={p.columnas.length + 2} className="px-2 py-4 text-center text-gray-600">Sin filas. Agrega la primera ↓</td></tr>}
                </tbody>
              </table>
            </div>
            <button onClick={addFila} className="mt-2 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"><Plus size={13} /> Agregar fila</button>
          </div>
        )}

        {/* ── Editor de BOTIQUINES (matriz) ── */}
        {p.tipo === "botiquines" && (
          <div className="space-y-3">
            {(form.datos.botiquines || []).map((b, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs font-semibold text-white">Botiquín {i + 1}</span>
                  <input value={b.ubicacion || ""} onChange={e => setBot(i, { ubicacion: e.target.value })} placeholder="Ubicación del botiquín" className="flex-1 min-w-[160px] bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500" />
                  {p.estados.map(es => (
                    <span key={es.key} className="flex items-center gap-1 text-[11px] text-gray-400">{es.label}:
                      <select value={b.estado?.[es.key] || ""} onChange={e => setBotEstado(i, es.key, e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-xs text-white focus:outline-none"><option value=""></option><option value="B">B</option><option value="M">M</option></select>
                    </span>
                  ))}
                  <button onClick={() => delBotiquin(i)} className="ml-auto text-gray-600 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
                <div className="overflow-x-auto">
                  <table className="text-[11px] w-full" style={{ minWidth: 560 }}>
                    <thead><tr className="border-b border-gray-800 text-gray-600">
                      <th className="text-left px-1 py-1">Implemento</th><th className="px-1 py-1">Vencimiento</th><th className="px-1 py-1">Necesaria</th><th className="px-1 py-1">Actual</th><th className="px-1 py-1">Faltante</th>
                    </tr></thead>
                    <tbody>
                      {p.implementos.map(im => {
                        const it = b.items?.[im.id] || {}; const falt = Math.max(0, (Number(it.nec) || 0) - (Number(it.act) || 0));
                        return (
                          <tr key={im.id} className="border-b border-gray-800/30">
                            <td className="px-1 py-0.5 text-gray-300">{im.texto}</td>
                            <td className="px-1 py-0.5"><input type="date" value={it.venc || ""} onChange={e => setBotItem(i, im.id, "venc", e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-[11px] text-white focus:outline-none" /></td>
                            <td className="px-1 py-0.5"><input type="number" min="0" value={it.nec ?? ""} onChange={e => setBotItem(i, im.id, "nec", e.target.value)} className="w-14 bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-[11px] text-white text-center focus:outline-none" /></td>
                            <td className="px-1 py-0.5"><input type="number" min="0" value={it.act ?? ""} onChange={e => setBotItem(i, im.id, "act", e.target.value)} className="w-14 bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-[11px] text-white text-center focus:outline-none" /></td>
                            <td className={`px-1 py-0.5 text-center font-mono ${falt > 0 ? "text-red-400" : "text-gray-500"}`}>{falt}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            <button onClick={addBotiquin} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"><Plus size={13} /> Agregar botiquín</button>
          </div>
        )}

        {p.tipo === "checklist" && (<>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar ítem…" className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500" />
        </div>

        {/* Secciones e ítems */}
        <div className="space-y-2">
          {p.secciones.map((sec, si) => {
            const items = q ? sec.items.filter(it => it.texto.toLowerCase().includes(q)) : sec.items;
            if (!items.length) return null;
            const abierto = q ? true : openSec[si];
            return (
              <div key={si} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <button onClick={() => setOpenSec(o => ({ ...o, [si]: !o[si] }))} className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-800/40 text-left">
                  {abierto ? <ChevronDown size={15} className="text-gray-500" /> : <ChevronRight size={15} className="text-gray-500" />}
                  <span className="text-sm font-semibold text-white flex-1">{sec.nombre}</span>
                  <span className="text-[11px] text-gray-600">{items.length} ítems</span>
                </button>
                {abierto && (
                  <div className="border-t border-gray-800">
                    {items.map(it => {
                      const d = form.datos[it.id] || {};
                      return (
                        <div key={it.id} className="border-t border-gray-800/40 px-3 py-2">
                          <div className="flex items-start gap-2">
                            <span className="text-[10px] text-gray-600 font-mono w-6 shrink-0 mt-1">{it.n}</span>
                            <p className="text-xs text-gray-300 flex-1 leading-snug">{it.texto}</p>
                            <div className="flex gap-1 shrink-0">
                              {Object.entries(EST).map(([k, v]) => (
                                <button key={k} onClick={() => setItem(it.id, { e: d.e === k ? null : k })}
                                  className={`text-[11px] px-2 py-1 rounded-lg border transition-colors ${d.e === k ? v.on : OFF}`}>{v.label}</button>
                              ))}
                            </div>
                          </div>
                          {(d.e === "no" || d.obs || d.acc) && (
                            <div className="grid md:grid-cols-2 gap-1.5 mt-1.5 pl-8">
                              <input defaultValue={d.obs || ""} onBlur={e => e.target.value !== (d.obs || "") && setItem(it.id, { obs: e.target.value })} placeholder="Observación" className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500" />
                              <input defaultValue={d.acc || ""} onBlur={e => e.target.value !== (d.acc || "") && setItem(it.id, { acc: e.target.value })} placeholder="Acción correctiva" className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </>)}

        <div className="mt-3">
          <FormField label="Observaciones generales / recomendaciones">
            <textarea rows={2} value={form.observaciones || ""} onChange={e => setF("observaciones", e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none" />
          </FormField>
        </div>
      </div>
    );
  }

  // ── VISTA LISTA ──
  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2"><ClipboardCheck size={16} className="text-blue-400" /> Inspecciones SIG</h3>
          <p className="text-gray-500 text-xs max-w-xl">Llena las inspecciones en la app y expórtalas en PDF con su código, versión y logo.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(PLANTILLAS_INSPECCION).map(([key, p]) => (
            <Btn key={key} size="sm" variant="primary" onClick={() => nuevo(key)}><Plus size={13} /> {p.titulo.length > 26 ? p.titulo.slice(0, 24) + "…" : p.titulo}</Btn>
          ))}
        </div>
      </div>

      {registros.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-gray-900 border border-gray-800 rounded-2xl">
          <ClipboardCheck size={28} className="text-blue-400 mb-3" />
          <p className="text-white font-semibold mb-1">Sin inspecciones registradas</p>
          <p className="text-gray-500 text-sm">Usa el botón de arriba para iniciar una inspección.</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800">
              {["Fecha", "Inspección", "Responsable", "Área", "Cumpl.", ""].map(h => <th key={h} className="text-left text-xs text-gray-600 font-medium px-3 py-2.5 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {registros.map(r => {
                const p = plantillaDe(r.plantilla); const c = pct(r.datos, p);
                return (
                  <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-400 whitespace-nowrap">{fmtFecha(r.fecha)}</td>
                    <td className="px-3 py-2.5 text-gray-200">{p?.titulo || r.plantilla}<div className="text-[10px] text-gray-600">{r.codigo} · v{r.version}</div></td>
                    <td className="px-3 py-2.5 text-gray-400 text-xs">{r.responsable || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{r.area || "—"}</td>
                    <td className="px-3 py-2.5"><Badge color={c >= 80 ? "green" : c >= 50 ? "amber" : "red"}>{c}%</Badge></td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex gap-1">
                        <button onClick={() => exportPDF(r)} title="PDF" className="text-gray-500 hover:text-red-400 p-1.5"><FileDown size={14} /></button>
                        <button onClick={() => editar(r)} title="Editar" className="text-gray-500 hover:text-blue-400 p-1.5"><Pencil size={14} /></button>
                        {puedeEliminar() && <button onClick={() => eliminar(r.id)} title="Eliminar" className="text-gray-700 hover:text-red-400 p-1.5"><Trash2 size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
