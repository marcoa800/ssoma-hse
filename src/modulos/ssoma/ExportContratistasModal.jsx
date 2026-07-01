// Modal de descarga de reportes del portal de contratistas.
// Permite elegir: período (mes/rango), contratista(s), tipo (hallazgo/inspección/documento)
// y formato: Resumen (Excel o PDF) o los Archivos en sí (ZIP).

import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, Calendar, CalendarRange, FileSpreadsheet, FileText, FileArchive } from 'lucide-react';
import { Modal } from '../../components/ui/Modal.jsx';
import { Btn } from '../../components/ui/Btn.jsx';
import { showToast } from '../../lib/toast.jsx';

const TIPO_LBL = { hallazgo: "Hallazgo", inspeccion: "Inspección", documento: "Documento" };
const TIPOS = ["hallazgo", "inspeccion", "documento"];
const slug = (s) => (s || "").replace(/[^\w]+/g, "_").slice(0, 40);

export function ExportContratistasModal({ registros = [], contratistas = [], lockContratistaId = null, onClose }) {
  const [modo, setModo] = useState("mes");
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [selCts, setSelCts] = useState(() => lockContratistaId ? { [lockContratistaId]: true } : Object.fromEntries(contratistas.map(c => [c.id, true])));
  const [selTipos, setSelTipos] = useState({ hallazgo: true, inspeccion: true, documento: true });
  const [selSubcats, setSelSubcats] = useState({}); // por defecto todas incluidas; key=false excluye
  const [busy, setBusy] = useState("");

  const nombreDe = (id) => contratistas.find(c => c.id === id)?.nombre || "—";
  const ctsLista = lockContratistaId ? contratistas.filter(c => c.id === lockContratistaId) : contratistas;

  // Pasa los filtros de período + contratista + tipo (sin subcategoría).
  const pasaBase = (r) => {
    const f = (r.fecha || "").slice(0, 10);
    if (!f) return false;
    if (modo === "mes") { if (!mes || !f.startsWith(mes)) return false; } else { if (!(desde || hasta)) return false; if (desde && f < desde) return false; if (hasta && f > hasta) return false; }
    if (!selCts[r.contratista_id]) return false;
    if (!selTipos[r.tipo]) return false;
    return true;
  };

  // Subcategorías disponibles según la selección base (clasificación / tipo de
  // inspección / categoría de documento). Dinámico: solo las que existen.
  const subcatsDisp = useMemo(() => {
    const s = new Set();
    registros.forEach(r => { if (pasaBase(r)) { const c = (r.categoria || "").trim(); if (c) s.add(c); } });
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [registros, modo, mes, desde, hasta, selCts, selTipos]);

  const filtrados = useMemo(() => registros.filter(r => {
    if (!pasaBase(r)) return false;
    const c = (r.categoria || "").trim();
    if (c && selSubcats[c] === false) return false; // excluida explícitamente
    return true;
  }), [registros, modo, mes, desde, hasta, selCts, selTipos, selSubcats]);

  const nArchivos = filtrados.reduce((n, r) => n + (r.foto_urls?.length || 0) + (r.archivo_url ? 1 : 0), 0);
  const sufijo = () => modo === "mes" ? mes : `${desde || "inicio"}_a_${hasta || "hoy"}`;
  const baseName = lockContratistaId ? `Reportes_${slug(nombreDe(lockContratistaId))}` : "Reportes_Contratistas";

  const toggle = (set, key) => set(s => ({ ...s, [key]: !s[key] }));
  const setAllCts = (v) => setSelCts(Object.fromEntries(ctsLista.map(c => [c.id, v])));
  const setAllSubcats = (v) => setSelSubcats(Object.fromEntries(subcatsDisp.map(s => [s, v])));

  // ── Resumen Excel ──
  const excel = () => {
    if (!filtrados.length) return showToast("No hay registros con esos filtros", "error");
    const rows = filtrados.map(r => ({
      "Fecha": r.fecha || "", "Tipo": TIPO_LBL[r.tipo] || r.tipo, "Contratista": nombreDe(r.contratista_id),
      "Título / Descripción": r.titulo || r.descripcion || "", "Lugar / Categoría": r.lugar || r.categoria || "",
      "Estado": r.tipo === "documento" ? "" : (r.estado || ""), "Medida correctiva": r.medida_correctiva || "",
      "Foto / Archivo": (r.foto_urls && r.foto_urls[0]) || r.archivo_url || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 28 }, { wch: 45 }, { wch: 18 }, { wch: 12 }, { wch: 40 }, { wch: 45 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Reportes");
    XLSX.writeFile(wb, `${baseName}_${sufijo()}.xlsx`);
    showToast(`Exportados ${filtrados.length} registro(s)`, "success"); onClose?.();
  };

  // ── Resumen PDF ──
  const pdf = () => {
    if (!filtrados.length) return showToast("No hay registros con esos filtros", "error");
    const doc = new jsPDF(); const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(15, 23, 42); doc.rect(0, 0, pw, 30, "F"); doc.setFillColor(124, 58, 237); doc.rect(0, 28, pw, 2, "F");
    doc.setTextColor(255, 255, 255).setFontSize(14).setFont("helvetica", "bold"); doc.text("REPORTE DE CONTRATISTAS", pw / 2, 13, { align: "center" });
    doc.setFontSize(9).setFont("helvetica", "normal"); doc.text(`${lockContratistaId ? nombreDe(lockContratistaId) : "Todos los contratistas"} · ${sufijo()}`, pw / 2, 22, { align: "center" }); doc.setTextColor(0, 0, 0);
    autoTable(doc, { startY: 36, head: [["Fecha", "Tipo", "Contratista", "Descripción", "Estado"]],
      body: filtrados.map(r => [r.fecha || "—", TIPO_LBL[r.tipo] || r.tipo, nombreDe(r.contratista_id), (r.titulo || r.descripcion || "").slice(0, 70), r.tipo === "documento" ? "—" : (r.estado || "—")]),
      headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 }, styles: { fontSize: 8 }, alternateRowStyles: { fillColor: [248, 248, 252] },
      didParseCell: (d) => { if (d.section === "body" && d.column.index === 4) { if (d.cell.text[0] === "Abierto") d.cell.styles.textColor = [220, 38, 38]; if (d.cell.text[0] === "Cerrado") d.cell.styles.textColor = [16, 185, 129]; } } });
    const tot = doc.internal.getNumberOfPages();
    for (let i = 1; i <= tot; i++) { doc.setPage(i); doc.setFontSize(7).setTextColor(150); doc.text(`CTG Latam | Pág. ${i} de ${tot}`, pw / 2, ph - 8, { align: "center" }); doc.setTextColor(0, 0, 0); }
    doc.save(`${baseName}_${sufijo()}.pdf`); showToast(`Exportados ${filtrados.length} registro(s)`, "success"); onClose?.();
  };

  // ── Archivos en sí (ZIP) ──
  const zip = async () => {
    if (!nArchivos) return showToast("No hay archivos/fotos en esos registros", "error");
    setBusy("zip");
    try {
      const z = new JSZip();
      let ok = 0;
      for (const r of filtrados) {
        const carpeta = slug(nombreDe(r.contratista_id));
        const urls = [...(r.foto_urls || []), ...(r.archivo_url ? [r.archivo_url] : [])];
        for (let i = 0; i < urls.length; i++) {
          try {
            const resp = await fetch(urls[i]); if (!resp.ok) continue;
            const blob = await resp.blob();
            const ext = (urls[i].split(".").pop() || "dat").split("?")[0].slice(0, 5);
            z.file(`${carpeta}/${r.tipo}_${r.fecha || "sf"}_${ok + 1}.${ext}`, blob);
            ok++;
          } catch { /* ignora un archivo que falle */ }
        }
      }
      if (!ok) { showToast("No se pudo descargar ningún archivo", "error"); setBusy(""); return; }
      const out = await z.generateAsync({ type: "blob" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(out); a.download = `${baseName}_archivos_${sufijo()}.zip`; a.click();
      URL.revokeObjectURL(a.href);
      showToast(`ZIP con ${ok} archivo(s)`, "success"); onClose?.();
    } catch (e) { showToast("Error al armar el ZIP: " + (e?.message || e), "error"); }
    setBusy("");
  };

  const inp = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500";

  return (
    <Modal title="Descargar reportes de contratistas" onClose={onClose} wide>
      <div className="space-y-4">
        {/* Período */}
        <div>
          <div className="text-xs text-gray-500 mb-1.5">Período</div>
          <div className="flex gap-2 mb-2">
            <button onClick={() => setModo("mes")} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm ${modo === "mes" ? "bg-purple-600 text-white border-purple-500" : "border-gray-700 text-gray-400 hover:bg-gray-800"}`}><Calendar size={14} /> Por mes</button>
            <button onClick={() => setModo("rango")} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm ${modo === "rango" ? "bg-purple-600 text-white border-purple-500" : "border-gray-700 text-gray-400 hover:bg-gray-800"}`}><CalendarRange size={14} /> Por rango</button>
          </div>
          {modo === "mes"
            ? <input type="month" value={mes} onChange={e => setMes(e.target.value)} className={inp} />
            : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><input type="date" value={desde} onChange={e => setDesde(e.target.value)} className={inp} /><input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className={inp} /></div>}
        </div>

        {/* Contratistas */}
        {!lockContratistaId && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-xs text-gray-500">Contratistas</div>
              <div className="flex gap-2 text-xs"><button onClick={() => setAllCts(true)} className="text-purple-400">Todos</button><span className="text-gray-700">·</span><button onClick={() => setAllCts(false)} className="text-gray-500">Ninguno</button></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
              {ctsLista.map(c => (
                <label key={c.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-gray-800 bg-gray-800/30 cursor-pointer text-sm text-gray-300">
                  <input type="checkbox" checked={!!selCts[c.id]} onChange={() => toggle(setSelCts, c.id)} className="accent-purple-500 w-4 h-4" />
                  <span className="truncate">{c.nombre}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        {lockContratistaId && <div className="text-xs text-gray-400">Contratista: <span className="text-purple-300 font-medium">{nombreDe(lockContratistaId)}</span></div>}

        {/* Tipo */}
        <div>
          <div className="text-xs text-gray-500 mb-1.5">Tipo de documentación</div>
          <div className="flex gap-2 flex-wrap">
            {TIPOS.map(tp => (
              <label key={tp} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-800 bg-gray-800/30 cursor-pointer text-sm text-gray-300">
                <input type="checkbox" checked={!!selTipos[tp]} onChange={() => toggle(setSelTipos, tp)} className="accent-purple-500 w-4 h-4" />
                {TIPO_LBL[tp]}
              </label>
            ))}
          </div>
        </div>

        {/* Subcategoría (dinámica: clasificación / tipo de inspección / categoría de documento) */}
        {subcatsDisp.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-xs text-gray-500">Subcategoría</div>
              <div className="flex gap-2 text-xs"><button onClick={() => setAllSubcats(true)} className="text-purple-400">Todas</button><span className="text-gray-700">·</span><button onClick={() => setAllSubcats(false)} className="text-gray-500">Ninguna</button></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
              {subcatsDisp.map(sc => (
                <label key={sc} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-gray-800 bg-gray-800/30 cursor-pointer text-sm text-gray-300">
                  <input type="checkbox" checked={selSubcats[sc] !== false} onChange={() => setSelSubcats(s => ({ ...s, [sc]: s[sc] === false ? true : false }))} className="accent-purple-500 w-4 h-4" />
                  <span className="truncate">{sc}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Resumen */}
        <div className="px-3 py-2.5 rounded-lg bg-gray-800/50 border border-gray-700 text-xs text-gray-400">
          <b className="text-gray-200">{filtrados.length}</b> registro(s) · <b className="text-gray-200">{nArchivos}</b> archivo(s)/foto(s) en la selección
        </div>

        {/* Acciones */}
        <div>
          <div className="text-xs text-gray-500 mb-2">¿Qué descargar?</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Btn variant="default" onClick={excel} disabled={!filtrados.length || busy}><FileSpreadsheet size={13} /> Resumen Excel</Btn>
            <Btn variant="default" onClick={pdf} disabled={!filtrados.length || busy}><FileText size={13} /> Resumen PDF</Btn>
            <Btn variant="primary" onClick={zip} disabled={!nArchivos || busy}><FileArchive size={13} /> {busy === "zip" ? "Armando ZIP…" : "Archivos (ZIP)"}</Btn>
          </div>
          <p className="text-[11px] text-gray-600 mt-2">“Resumen” = la lista (Excel/PDF). “Archivos (ZIP)” = las fotos y documentos que subió el contratista.</p>
        </div>

        <div className="flex justify-end pt-1"><Btn variant="ghost" onClick={onClose}>Cerrar</Btn></div>
      </div>
    </Modal>
  );
}
