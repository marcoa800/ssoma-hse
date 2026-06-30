import { useState, useEffect } from 'react';
import { fmtFecha } from '../../lib/helpers.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase, puedeEliminar } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Btn } from '../../components/ui/Btn.jsx';
import {
  Plus, Trash2, Pencil, FileDown, Eye, ArrowLeft, FileText, Scale
} from 'lucide-react';
import {
  EMPRESA_LEGAL_HGP, CATALOGO_LEGAL_HGP, getRegistroLegal, datosIniciales
} from '../../constants/registros-legales-hgp.js';

// ════════════════════════════════════════════════════════════════════
//  REGISTROS LEGALES MINTRA — Hydro Global Perú (motor "ficha")
//  Se monta dentro del módulo Accidentes solo para Hydro Global.
// ════════════════════════════════════════════════════════════════════
export default function RegistrosLegalesHGP({ empresaId, onBack }) {
  const [vista, setVista] = useState("lista");   // lista | form
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [plantillaActiva, setPlantillaActiva] = useState(null);
  const [editando, setEditando] = useState(null);
  const [detalle, setDetalle] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("registros_legales_hgp").select("*")
      .eq("empresa_id", empresaId).order("fecha", { ascending: false });
    setRegistros(data || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  const nuevo = (codigo) => {
    const p = getRegistroLegal(codigo);
    if (!p) { showToast("Formato no disponible", "info"); return; }
    setPlantillaActiva(p); setEditando(null); setVista("form");
  };
  const editar = (r) => {
    const p = getRegistroLegal(r.plantilla_codigo);
    if (!p) { showToast("Formato no encontrado", "error"); return; }
    setPlantillaActiva(p); setEditando(r); setVista("form");
  };
  const eliminar = async (id) => {
    if (!confirm("¿Eliminar este registro legal?")) return;
    await supabase.from("registros_legales_hgp").delete().eq("id", id);
    showToast("Eliminado", "info"); load();
  };

  if (vista === "form" && plantillaActiva) {
    return <FichaForm
      empresaId={empresaId} plantilla={plantillaActiva} registro={editando}
      onCancel={() => { setVista("lista"); setPlantillaActiva(null); setEditando(null); }}
      onSaved={() => { setVista("lista"); setPlantillaActiva(null); setEditando(null); load(); }}
    />;
  }

  return (
    <div>
      <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
        <ArrowLeft size={13} /> Volver a Accidentes
      </button>
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
            <Scale size={15} className="text-amber-400" /> Registros Legales MINTRA — {EMPRESA_LEGAL_HGP.nombre}
          </h3>
          <p className="text-gray-500 text-xs max-w-2xl">Formatos oficiales de registro de accidentes e incidentes. Captura los datos y genera el PDF.</p>
        </div>
      </div>

      {/* Catálogo de formatos */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {CATALOGO_LEGAL_HGP.map(c => (
          <button key={c.codigo} onClick={() => nuevo(c.codigo)}
            className="text-left p-4 rounded-xl border bg-gray-900 border-gray-800 hover:border-amber-600 hover:bg-gray-800/60 transition-all">
            <div className="flex items-start justify-between gap-2 mb-2">
              <FileText size={16} className="text-amber-400" />
              <Badge color="amber">Nuevo</Badge>
            </div>
            <p className="text-sm text-gray-200 font-medium leading-snug">{c.nombre}</p>
            <p className="text-[11px] text-gray-600 mt-1 leading-snug">{c.desc}</p>
            <p className="text-[10px] text-gray-700 font-mono mt-1.5">{c.codigo}</p>
          </button>
        ))}
      </div>

      {/* Registros guardados */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800">
            {["Fecha", "Formato", "Referencia", ""].map(h => (
              <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
            {!loading && registros.map(r => (
              <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{fmtFecha(r.fecha)}</td>
                <td className="px-4 py-3 text-xs text-gray-300 font-medium">{r.plantilla_nombre}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{r.referencia || "—"}</td>
                <td className="px-4 py-3"><div className="flex gap-1.5">
                  <button onClick={() => setDetalle(r)} className="text-gray-500 hover:text-emerald-400" title="Ver"><Eye size={13} /></button>
                  <button onClick={() => generarPDFLegal(r, getRegistroLegal(r.plantilla_codigo))} className="text-gray-500 hover:text-blue-400" title="Descargar PDF"><FileDown size={13} /></button>
                  <button onClick={() => editar(r)} className="text-gray-500 hover:text-blue-400" title="Editar"><Pencil size={13} /></button>
                  {puedeEliminar() && (
                    <button onClick={() => eliminar(r.id)} className="text-red-500/40 hover:text-red-400" title="Eliminar"><Trash2 size={13} /></button>
                  )}
                </div></td>
              </tr>
            ))}
            {!loading && !registros.length && (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-600 text-sm">Sin registros aún. Selecciona un formato para comenzar.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {detalle && <DetalleLegal registro={detalle} plantilla={getRegistroLegal(detalle.plantilla_codigo)} onClose={() => setDetalle(null)} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  FORMULARIO — motor ficha
// ════════════════════════════════════════════════════════════════════
function FichaForm({ empresaId, plantilla, registro, onCancel, onSaved }) {
  const hoy = new Date().toISOString().split("T")[0];
  const [datos, setDatos] = useState(registro?.datos || datosIniciales(plantilla));
  const [saving, setSaving] = useState(false);
  const [subiendo, setSubiendo] = useState(false);

  const set = (key, val) => setDatos(d => ({ ...d, [key]: val }));
  const setFila = (key, idx, ck, val) =>
    setDatos(d => ({ ...d, [key]: (d[key] || []).map((f, i) => i === idx ? { ...f, [ck]: val } : f) }));
  const addFila = (key, columnas) =>
    setDatos(d => ({ ...d, [key]: [...(d[key] || []), Object.fromEntries(columnas.map(c => [c.key, ""]))] }));
  const delFila = (key, idx) =>
    setDatos(d => ({ ...d, [key]: (d[key] || []).filter((_, i) => i !== idx) }));

  const subirFoto = async (key, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true);
    const path = `${empresaId}/legal/${Date.now()}_${Math.random().toString(36).slice(2)}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("inspecciones-fotos").upload(path, file, { contentType: file.type });
    if (error) { showToast("Error subiendo foto: " + error.message, "error"); setSubiendo(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("inspecciones-fotos").getPublicUrl(path);
    setDatos(d => ({ ...d, [key]: [...(d[key] || []), publicUrl] }));
    setSubiendo(false);
    e.target.value = "";
  };

  const guardar = async () => {
    setSaving(true);
    const referencia = datos[plantilla.referenciaKey] || datos.num_registro || datos.num_accidente || datos.num_incidente || "";
    const payload = {
      empresa_id: empresaId,
      plantilla_codigo: plantilla.codigo,
      plantilla_nombre: plantilla.nombre,
      fecha: datos.fecha || hoy,
      referencia: referencia || null,
      datos,
      foto_urls: datos.fotos || [],
      estado: "Completado",
    };
    const { error } = registro
      ? await supabase.from("registros_legales_hgp").update(payload).eq("id", registro.id)
      : await supabase.from("registros_legales_hgp").insert(payload);
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast(registro ? "Registro actualizado" : "Registro guardado", "success");
    onSaved();
  };

  const TogBtn = ({ active, onClick, children }) => (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${active
        ? "bg-amber-600 border-amber-500 text-white"
        : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200"}`}>{children}</button>
  );

  const renderCampo = (c) => {
    if (c.type === "checkgroup") {
      return (
        <FormField key={c.key} label={c.label + (c.required ? " *" : "")} className={c.full ? "sm:col-span-2 lg:col-span-3" : ""}>
          <div className="flex flex-wrap gap-2 pt-0.5">
            {c.opciones.map(o => (
              <TogBtn key={o} active={datos[c.key] === o} onClick={() => set(c.key, datos[c.key] === o ? "" : o)}>{o}</TogBtn>
            ))}
          </div>
        </FormField>
      );
    }
    if (c.type === "textarea") {
      return (
        <FormField key={c.key} label={c.label + (c.required ? " *" : "")} className="sm:col-span-2 lg:col-span-3">
          <textarea rows={3} value={datos[c.key] || ""} onChange={e => set(c.key, e.target.value)} placeholder={c.placeholder || ""}
            className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-amber-500 resize-none" />
        </FormField>
      );
    }
    if (c.type === "subtabla") {
      const filas = datos[c.key] || [];
      return (
        <div key={c.key} className="sm:col-span-2 lg:col-span-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] text-gray-500 font-medium">{c.label}</p>
            <Btn size="sm" variant="ghost" onClick={() => addFila(c.key, c.columnas)}><Plus size={12} /> Agregar fila</Btn>
          </div>
          <div className="overflow-x-auto border border-gray-800 rounded-lg">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-800 bg-gray-900/50">
                {c.columnas.map(col => <th key={col.key} className="px-2 py-1.5 text-gray-600 text-left">{col.label}</th>)}
                <th className="px-1"></th>
              </tr></thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={i} className="border-b border-gray-800/40">
                    {c.columnas.map(col => (
                      <td key={col.key} className="px-1 py-1">
                        <input type={col.type === "date" ? "date" : "text"} value={f[col.key] || ""}
                          onChange={e => setFila(c.key, i, col.key, e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-1.5 py-1 text-xs text-gray-200 focus:outline-none focus:border-amber-500" style={{ minWidth: 110 }} />
                      </td>
                    ))}
                    <td className="px-1"><button onClick={() => delFila(c.key, i)} className="text-red-500/40 hover:text-red-400"><Trash2 size={12} /></button></td>
                  </tr>
                ))}
                {!filas.length && <tr><td colSpan={c.columnas.length + 1} className="px-2 py-3 text-center text-gray-600 text-[11px]">Sin filas. Usa "Agregar fila".</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    if (c.type === "foto") {
      const fotos = datos[c.key] || [];
      return (
        <div key={c.key} className="sm:col-span-2 lg:col-span-3">
          <p className="text-[11px] text-gray-500 font-medium mb-1.5">{c.label}</p>
          <div className="flex flex-wrap gap-2 items-center">
            {fotos.map((url, i) => (
              <div key={i} className="relative">
                <img src={url} alt="Evidencia" className="h-24 rounded-lg border border-gray-700" />
                <button onClick={() => set(c.key, fotos.filter((_, j) => j !== i))} className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full"><Trash2 size={11} /></button>
              </div>
            ))}
            <label className="h-24 w-24 flex items-center justify-center border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:bg-gray-800/40 text-center">
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => subirFoto(c.key, e)} disabled={subiendo} />
              <span className="text-[10px] text-gray-500 px-1">{subiendo ? "Subiendo..." : "+ Foto"}</span>
            </label>
          </div>
        </div>
      );
    }
    // text | date | time | number
    return (
      <FormField key={c.key} label={c.label + (c.required ? " *" : "")} className={c.full ? "sm:col-span-2 lg:col-span-3" : ""}>
        <Input type={c.type === "date" ? "date" : c.type === "time" ? "time" : c.type === "number" ? "number" : "text"}
          value={datos[c.key] || ""} onChange={e => set(c.key, e.target.value)} placeholder={c.placeholder || ""} />
      </FormField>
    );
  };

  return (
    <div>
      <button onClick={onCancel} className="mb-4 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
        <ArrowLeft size={13} /> Cancelar y volver
      </button>
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-white font-semibold text-sm">{plantilla.titulo}</h3>
          <p className="text-[11px] text-gray-600 font-mono mt-0.5">{plantilla.codigo}</p>
        </div>
        <div className="flex gap-2">
          <Btn size="sm" variant="ghost" onClick={onCancel}>Cancelar</Btn>
          <Btn size="sm" variant="primary" onClick={guardar} disabled={saving || subiendo}>{saving ? "Guardando..." : registro ? "Actualizar" : "Guardar registro"}</Btn>
        </div>
      </div>

      <div className="space-y-4">
        {plantilla.secciones.map((sec, si) => (
          <div key={si} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="bg-gray-800/60 px-4 py-2 text-xs font-semibold text-amber-300 uppercase tracking-wide">
              {sec.num ? `${sec.num}. ` : ""}{sec.titulo}
            </div>
            <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sec.campos.map(renderCampo)}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
        <Btn variant="primary" onClick={guardar} disabled={saving || subiendo}>{saving ? "Guardando..." : registro ? "Actualizar" : "Guardar registro"}</Btn>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  MODAL DETALLE (vista rápida)
// ════════════════════════════════════════════════════════════════════
function DetalleLegal({ registro, plantilla, onClose }) {
  const d = registro.datos || {};
  return (
    <Modal title={`${registro.plantilla_nombre} — ${fmtFecha(registro.fecha)}`} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Btn size="sm" variant="primary" onClick={() => generarPDFLegal(registro, plantilla)}><FileDown size={13} /> Descargar PDF</Btn>
        </div>
        {!plantilla ? <p className="text-gray-500 text-sm">Formato no disponible.</p> : plantilla.secciones.map((sec, si) => (
          <div key={si}>
            <p className="text-[11px] font-semibold text-amber-300 uppercase tracking-wide mb-1.5">{sec.num ? `${sec.num}. ` : ""}{sec.titulo}</p>
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {sec.campos.map(c => {
                if (c.type === "foto") {
                  const fotos = d[c.key] || [];
                  return fotos.length ? (
                    <div key={c.key} className="sm:col-span-2 flex flex-wrap gap-2 my-1">
                      {fotos.map((u, i) => <img key={i} src={u} alt="" className="h-28 rounded border border-gray-700" />)}
                    </div>
                  ) : null;
                }
                if (c.type === "subtabla") {
                  const filas = d[c.key] || [];
                  if (!filas.length) return null;
                  return (
                    <div key={c.key} className="sm:col-span-2 my-1">
                      <p className="text-gray-500 mb-1">{c.label}:</p>
                      {filas.map((f, i) => (
                        <p key={i} className="text-gray-300 pl-2">• {c.columnas.map(col => f[col.key]).filter(Boolean).join(" / ") || "—"}</p>
                      ))}
                    </div>
                  );
                }
                const v = d[c.key];
                if (!v) return null;
                return <p key={c.key} className="text-gray-300"><span className="text-gray-600">{c.label}:</span> {v}</p>;
              })}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════
//  PDF — versión digital limpia
// ════════════════════════════════════════════════════════════════════
function cargarImg(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      try { resolve({ data: canvas.toDataURL("image/png"), w: img.naturalWidth, h: img.naturalHeight }); }
      catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function generarPDFLegal(registro, plantilla) {
  if (!plantilla) { showToast("Formato no encontrado para el PDF", "error"); return; }
  const d = registro.datos || {};
  const logo = await cargarImg(EMPRESA_LEGAL_HGP.logo);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 12;
  const innerW = W - 2 * M;

  // ── Encabezado ──
  let hY = M, hH = 18;
  const c1 = 30, c3 = 48, c2 = innerW - c1 - c3;
  doc.setLineWidth(0.3);
  doc.rect(M, hY, c1, hH); doc.rect(M + c1, hY, c2, hH); doc.rect(M + c1 + c2, hY, c3, hH);
  if (logo) {
    const ratio = Math.min((c1 - 4) / logo.w, (hH - 4) / logo.h);
    doc.addImage(logo.data, "PNG", M + (c1 - logo.w * ratio) / 2, hY + (hH - logo.h * ratio) / 2, logo.w * ratio, logo.h * ratio);
  } else {
    doc.setFontSize(7).setFont(undefined, "bold").text("HYDRO GLOBAL", M + c1 / 2, hY + hH / 2, { align: "center" });
  }
  doc.setFontSize(6).setFont(undefined, "bold").text("ÁREA DE SEGURIDAD Y SALUD EN EL TRABAJO", M + c1 + c2 / 2, hY + 6, { align: "center", maxWidth: c2 - 4 });
  doc.setFontSize(8.5).text(plantilla.titulo, M + c1 + c2 / 2, hY + 12, { align: "center", maxWidth: c2 - 4 });
  doc.setFontSize(6).setFont(undefined, "normal");
  const cx = M + c1 + c2 + 2;
  doc.text(`Código: ${plantilla.codigo}`, cx, hY + 5);
  doc.text(`Fecha: ${registro.fecha || ""}`, cx, hY + 10);
  doc.text(`Rev. ${plantilla.rev}  Pág. 1/1`, cx, hY + 15);
  let y = hY + hH + 4;

  const nextPage = (need) => { if (y + need > H - 22) { doc.addPage(); y = M; } };

  for (const sec of plantilla.secciones) {
    // Recolectar campos con valor
    const visibles = sec.campos.filter(c => {
      if (c.type === "foto" || c.type === "subtabla") return (d[c.key] || []).length > 0;
      return d[c.key];
    });
    if (!visibles.length) continue;

    nextPage(12);
    // Barra de sección
    doc.setFillColor(0, 51, 102);
    doc.rect(M, y, innerW, 5.5, "F");
    doc.setTextColor(255).setFontSize(7.5).setFont(undefined, "bold");
    doc.text(`${sec.num ? sec.num + ". " : ""}${sec.titulo}`, M + 2, y + 3.8);
    doc.setTextColor(0);
    y += 7;

    for (const c of visibles) {
      if (c.type === "subtabla") {
        const filas = d[c.key] || [];
        const head = [c.columnas.map(col => col.label)];
        const body = filas.map(f => c.columnas.map(col => f[col.key] || ""));
        autoTable(doc, {
          startY: y, head, body, theme: "grid",
          styles: { fontSize: 6.5, cellPadding: 1, lineWidth: 0.1, lineColor: [120, 120, 120] },
          headStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontSize: 6.5, fontStyle: "bold" },
          margin: { left: M, right: M },
        });
        y = doc.lastAutoTable.finalY + 3;
        continue;
      }
      if (c.type === "foto") {
        const fotos = d[c.key] || [];
        for (const url of fotos) {
          const img = await cargarImg(url);
          if (!img) continue;
          const maxW = innerW, maxH = 60;
          const ratio = Math.min(maxW / img.w, maxH / img.h);
          const fw = img.w * ratio, fh = img.h * ratio;
          nextPage(fh + 4);
          doc.addImage(img.data, "PNG", M, y, fw, fh);
          y += fh + 3;
        }
        continue;
      }
      // Campo simple: "label: value"
      const val = String(d[c.key] || "");
      doc.setFontSize(7.5).setFont(undefined, "bold");
      const labelTxt = `${c.label}: `;
      const labelW = doc.getTextWidth(labelTxt);
      doc.setFont(undefined, "normal");
      const lines = doc.splitTextToSize(val, innerW - labelW - 2);
      const blockH = Math.max(4.2, lines.length * 3.6);
      nextPage(blockH);
      doc.setFont(undefined, "bold").text(labelTxt, M + 1, y + 3);
      doc.setFont(undefined, "normal").text(lines, M + 1 + labelW, y + 3);
      y += blockH + 0.8;
    }
    y += 2;
  }

  // ── Firmas ──
  nextPage(22);
  y += 8;
  const fw = innerW / plantilla.firmas.length;
  plantilla.firmas.forEach((s, i) => {
    const x = M + fw * i + fw / 2;
    doc.setLineWidth(0.3); doc.line(x - 28, y, x + 28, y);
    doc.setFontSize(7).setFont(undefined, "bold").text(s.rol, x, y + 4, { align: "center", maxWidth: fw - 6 });
  });

  const nombre = `${plantilla.codigo}_${registro.fecha || "registro"}.pdf`.replace(/[^\w.-]/g, "_");
  doc.save(nombre);
}
