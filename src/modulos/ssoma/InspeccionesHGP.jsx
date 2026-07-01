import { useState, useEffect, Fragment } from 'react';
import { fmtFecha } from '../../lib/helpers.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../../lib/supabase.js';
import { showToast } from '../../lib/toast.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { KpiCard } from '../../components/ui/KpiCard.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Btn } from '../../components/ui/Btn.jsx';
import {
  Plus, Trash2, Pencil, FileDown, Eye, ClipboardList, ChevronRight,
  CheckCircle, AlertTriangle, FileText, Layers, ArrowLeft, Search, ExternalLink, QrCode
} from 'lucide-react';
import {
  EMPRESA_HGP, CALIF, CALIF_OPCIONES, CALIF_SECCIONES, CALIF_SEC_INFO,
  ESTATUS_SECCIONES, ESTATUS_INFO, PLANTILLAS_HGP, CATALOGO_HGP,
  SECCIONES_CALIF_DEFAULT, SECCIONES_COLUMNAS_DEFAULT,
  getPlantilla, filaVacia, itemsVaciosSecciones, itemsVaciosMatriz, equiposIniciales
} from '../../constants/inspecciones-hgp.js';

const calColor = (v) => CALIF[v === "N.T." ? "NT" : v]?.color || "gray";

// Veredicto unificado de una calificación (secciones y matriz) → color/estado.
// Cubre las escalas usadas por los formatos: B/R/M, SI/NO, C/NC, APRUEBA/FALLÓ, NA.
function calVerdict(v) {
  const s = String(v || "").trim().toUpperCase();
  if (["B", "SI", "SÍ", "C", "OK", "APRUEBA", "BUENO", "CONFORME"].includes(s)) return "ok";
  if (["M", "NO", "NC", "FALLO", "FALLÓ", "MALO"].includes(s)) return "bad";
  if (["R", "REGULAR"].includes(s)) return "warn";
  return "na";
}
const VERDICT_COLOR = { ok: "green", bad: "red", warn: "amber", na: "gray" };
const VERDICT_CLASS = {
  ok: "bg-emerald-900/40 border-emerald-700 text-emerald-300",
  bad: "bg-red-900/40 border-red-700 text-red-300",
  warn: "bg-amber-900/30 border-amber-700 text-amber-300",
  na: "bg-gray-800 border-gray-700 text-gray-400",
};
// Color RGB para celdas de PDF según veredicto (o null si no aplica)
function verdictPdfFill(v) {
  const verd = calVerdict(v);
  if (!v) return null;
  if (verd === "bad") return { fill: [254, 226, 226], text: [185, 28, 28] };
  if (verd === "ok") return { fill: [220, 252, 231], text: [22, 101, 52] };
  if (verd === "warn") return { fill: [254, 243, 199], text: [146, 64, 14] };
  return null;
}

export default function InspeccionesHGP({ empresaId, empresaInfo = EMPRESA_HGP, catalogo = CATALOGO_HGP }) {
  const [vista, setVista] = useState("dashboard"); // dashboard | catalogo | form
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);   // registro en edición (form)
  const [plantillaActiva, setPlantillaActiva] = useState(null);
  const [detalle, setDetalle] = useState(null);      // registro a visualizar
  const [fCodigo, setFCodigo] = useState("");
  const [enlaceExterno, setEnlaceExterno] = useState(null); // tarjeta con app externa (RACS)

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("inspecciones_hgp").select("*")
      .eq("empresa_id", empresaId).order("fecha", { ascending: false });
    setRegistros(data || []);
    setLoading(false);
  };
  useEffect(() => { if (empresaId) load(); }, [empresaId]);

  // ── KPIs ──
  const anio = new Date().getFullYear();
  const delAnio = registros.filter(r => new Date(r.fecha).getFullYear() === anio);
  const conNoConforme = registros.filter(r => contarNC(r) > 0);
  const totalNC = registros.reduce((s, r) => s + contarNC(r), 0);

  const filtrados = fCodigo ? registros.filter(r => r.plantilla_codigo === fCodigo) : registros;

  // ── Acciones ──
  const nuevaInspeccion = (codigo) => {
    const p = getPlantilla(codigo);
    if (!p) { showToast("Plantilla no disponible aún", "info"); return; }
    setPlantillaActiva(p);
    setEditando(null);
    setVista("form");
  };
  const editarRegistro = (r) => {
    const p = getPlantilla(r.plantilla_codigo);
    if (!p) { showToast("Plantilla no encontrada", "error"); return; }
    setPlantillaActiva(p);
    setEditando(r);
    setVista("form");
  };
  const eliminar = async (id) => {
    if (!confirm("¿Eliminar esta inspección?")) return;
    await supabase.from("inspecciones_hgp").delete().eq("id", id);
    showToast("Eliminado", "info"); load();
  };

  // ════════ VISTA: FORMULARIO ════════
  if (vista === "form" && plantillaActiva) {
    const cerrar = () => { setVista("dashboard"); setPlantillaActiva(null); setEditando(null); };
    const props = {
      empresaId, plantilla: plantillaActiva, registro: editando, empresaInfo,
      onCancel: cerrar,
      onSaved: () => { cerrar(); load(); },
    };
    if (plantillaActiva.patron === "secciones") return <FormularioSecciones {...props} />;
    if (plantillaActiva.patron === "matriz") return <FormularioMatriz {...props} />;
    if (plantillaActiva.patron === "evento") return <FormularioEvento {...props} />;
    return <FormularioActivos {...props} />;
  }

  // ════════ VISTA: CATÁLOGO ════════
  if (vista === "catalogo") {
    const grupos = [...new Set(catalogo.map(c => c.grupo))];
    return (
      <div>
        <button onClick={() => setVista("dashboard")} className="mb-4 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
          <ArrowLeft size={13} /> Volver al dashboard
        </button>
        <h3 className="text-white font-semibold text-sm mb-1">Catálogo de Formatos de Inspección</h3>
        <p className="text-gray-500 text-xs mb-5">Selecciona un formato para iniciar una nueva inspección. {empresaInfo.proyecto || ""}</p>
        {grupos.map(g => (
          <div key={g} className="mb-5">
            <p className="text-[11px] uppercase tracking-wide text-gray-600 font-semibold mb-2">{g}</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {catalogo.filter(c => c.grupo === g).map(c => (
                <button key={c.codigo} disabled={!c.disponible}
                  onClick={() => c.enlaceExterno ? setEnlaceExterno(c) : nuevaInspeccion(c.codigo)}
                  className={`text-left p-4 rounded-xl border transition-all ${c.disponible
                    ? "bg-gray-900 border-gray-800 hover:border-blue-600 hover:bg-gray-800/60 cursor-pointer"
                    : "bg-gray-900/40 border-gray-800/60 opacity-50 cursor-not-allowed"}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    {c.enlaceExterno
                      ? <ExternalLink size={16} className="text-violet-400" />
                      : <ClipboardList size={16} className={c.disponible ? "text-blue-400" : "text-gray-600"} />}
                    {c.enlaceExterno
                      ? <Badge color="purple">App externa</Badge>
                      : c.disponible
                        ? <Badge color="green">Disponible</Badge>
                        : <Badge color="gray">Próximamente</Badge>}
                  </div>
                  <p className="text-sm text-gray-200 font-medium leading-snug">{c.nombre}</p>
                  <p className="text-[11px] text-gray-600 font-mono mt-1">{codFmt(c.codigo, empresaInfo)}</p>
                </button>
              ))}
            </div>
          </div>
        ))}
        {enlaceExterno && <EnlaceModal item={enlaceExterno} onClose={() => setEnlaceExterno(null)} />}
      </div>
    );
  }

  // ════════ VISTA: DASHBOARD ════════
  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
            <Layers size={15} className="text-blue-400" /> Inspecciones — {empresaInfo.nombre}
          </h3>
          <p className="text-gray-500 text-xs max-w-xl">{(empresaInfo.proyecto || empresaInfo.nombre)}. Sistema de registro de inspecciones con formatos oficiales y reporte PDF.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <Btn size="sm" variant="primary" onClick={() => setVista("catalogo")}><Plus size={13} /> Nueva inspección</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label={`Inspecciones ${anio}`} value={delAnio.length} sub="realizadas este año" accentColor="blue" />
        <KpiCard label="Total registros" value={registros.length} sub="histórico" accentColor="purple" />
        <KpiCard label="Con no conformidades" value={conNoConforme.length} sub="requieren atención" accentColor={conNoConforme.length ? "amber" : "emerald"} />
        <KpiCard label="Ítems No Conforme" value={totalNC} sub="puntos en rojo" accentColor={totalNC ? "red" : "emerald"} />
      </div>

      {/* Filtro por formato */}
      <div className="flex items-center gap-2 mb-4 flex-wrap p-3 bg-gray-900/50 border border-gray-800 rounded-xl">
        <Search size={12} className="text-gray-500 shrink-0" />
        <select value={fCodigo} onChange={e => setFCodigo(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500">
          <option value="">Todos los formatos</option>
          {catalogo.filter(c => c.disponible).map(c => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
        </select>
        {fCodigo && <button onClick={() => setFCodigo("")} className="text-xs text-blue-400 hover:text-blue-300 ml-1">✕ Limpiar</button>}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800">
            {["Fecha", "Formato", "Área", "Inspector", "Resultado", ""].map(h => (
              <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-600 text-sm">Cargando...</td></tr>}
            {!loading && filtrados.map(r => {
              const nc = contarNC(r);
              return (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{fmtFecha(r.fecha)}</td>
                  <td className="px-4 py-3 text-xs text-gray-300 font-medium">{r.plantilla_nombre}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{r.area || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.inspector || "—"}</td>
                  <td className="px-4 py-3">
                    {nc > 0
                      ? <Badge color="red">{nc} No Conforme</Badge>
                      : <Badge color="green">Conforme</Badge>}
                  </td>
                  <td className="px-4 py-3"><div className="flex gap-1.5">
                    <button onClick={() => setDetalle(r)} className="text-gray-500 hover:text-emerald-400" title="Ver"><Eye size={13} /></button>
                    <button onClick={() => generarPDF(r, getPlantilla(r.plantilla_codigo), empresaInfo)} className="text-gray-500 hover:text-blue-400" title="Descargar PDF"><FileDown size={13} /></button>
                    <button onClick={() => editarRegistro(r)} className="text-gray-500 hover:text-blue-400" title="Editar"><Pencil size={13} /></button>
                    <button onClick={() => eliminar(r.id)} className="text-red-500/40 hover:text-red-400" title="Eliminar"><Trash2 size={13} /></button>
                  </div></td>
                </tr>
              );
            })}
            {!loading && !filtrados.length && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-600 text-sm">
                {registros.length ? "Sin resultados para el filtro." : "Sin inspecciones aún. Usa \"Nueva inspección\" para comenzar."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal detalle */}
      {detalle && (
        <DetalleModal registro={detalle} plantilla={getPlantilla(detalle.plantilla_codigo)} empresaInfo={empresaInfo} onClose={() => setDetalle(null)} />
      )}
    </div>
  );
}

// Modal para formatos enlazados a una app externa (RACS → app Firebase con QR)
function EnlaceModal({ item, onClose }) {
  const url = item.enlaceExterno;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=240x240&margin=10`;
  const copiar = () => { navigator.clipboard?.writeText(url); showToast("Enlace copiado", "success"); };
  return (
    <Modal title={item.nombre} onClose={onClose}>
      <div className="space-y-4 text-center">
        <p className="text-xs text-gray-500">
          Este reporte se gestiona en la aplicación oficial de Hydro Global. Escanea el QR o abre el enlace para reportar.
        </p>
        <div className="bg-white rounded-xl p-3 inline-block mx-auto">
          <img src={qrSrc} alt="QR RACS" className="w-52 h-52" />
        </div>
        <p className="text-[11px] text-gray-600 font-mono break-all bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700">{url}</p>
        <div className="flex gap-2 justify-center">
          <Btn variant="ghost" onClick={copiar}>Copiar enlace</Btn>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <Btn variant="primary"><ExternalLink size={13} /> Abrir app RACS</Btn>
          </a>
        </div>
      </div>
    </Modal>
  );
}

// Cuenta los ítems no conformes en un registro (NC en activos, M en secciones)
function contarNC(r) {
  const filas = Array.isArray(r.filas) ? r.filas : [];
  let n = 0;
  if (r.cabecera?.nivel) return r.cabecera.nivel === "alto" ? 1 : 0;          // evento (RACS)
  filas.forEach(f => {
    if (f.vals !== undefined) { Object.values(f.vals).forEach(v => { if (calVerdict(v) === "bad") n++; }); } // matriz
    else if (f.calificacion !== undefined) { if (calVerdict(f.calificacion) === "bad") n++; } // secciones
    else Object.values(f).forEach(v => { if (v === "NC") n++; });             // activos
  });
  return n;
}

// ════════════════════════════════════════════════════════════════════
//  FORMULARIO — Patrón "activos"
// ════════════════════════════════════════════════════════════════════
function FormularioActivos({ empresaId, plantilla, registro, empresaInfo, onCancel, onSaved }) {
  const hoy = new Date().toISOString().split("T")[0];
  const initCab = () => {
    const c = {};
    plantilla.cabecera.forEach(f => { c[f.key] = f.default ?? (f.key === "fecha" ? hoy : ""); });
    return c;
  };
  const initFilas = () => {
    if (plantilla.filasPreset?.length) return plantilla.filasPreset;
    const n = plantilla.filasIniciales || 10;
    return Array.from({ length: n }, (_, i) => filaVacia(plantilla, i + 1));
  };

  const [cabecera, setCabecera] = useState(registro?.cabecera || initCab());
  const [filas, setFilas] = useState(registro?.filas?.length ? registro.filas : initFilas());
  const [observaciones, setObservaciones] = useState(registro?.observaciones || "");
  const [saving, setSaving] = useState(false);

  const setCel = (idx, key, val) => setFilas(fs => fs.map((f, i) => i === idx ? { ...f, [key]: val } : f));
  const addFila = () => setFilas(fs => [...fs, filaVacia(plantilla, fs.length + 1)]);
  const delFila = (idx) => setFilas(fs => fs.filter((_, i) => i !== idx).map((f, i) => ({ ...f, item: i + 1 })));
  // Rellenar hacia abajo (como arrastrar en Excel): copia el valor de esta celda
  // a todas las filas siguientes en la misma columna.
  const fillDown = (idx, key) => setFilas(fs => { const v = fs[idx]?.[key] ?? ""; return fs.map((f, i) => i >= idx ? { ...f, [key]: v } : f); });
  // Marcar toda la columna con un valor (ej. todo "C").
  const fillAll = (key, val) => setFilas(fs => fs.map(f => ({ ...f, [key]: val })));

  const guardar = async () => {
    if (!cabecera.inspector?.trim()) { showToast("Indica quién realizó la inspección", "error"); return; }
    setSaving(true);
    // Solo guardamos filas con algún dato (código o alguna calificación)
    const filasUtiles = filas.filter(f =>
      f.codigo?.trim() || f.ubicacion?.trim() || plantilla.puntos.some(p => f[p.key])
    );
    const payload = {
      empresa_id: empresaId,
      plantilla_codigo: plantilla.codigo,
      plantilla_nombre: plantilla.nombre,
      fecha: cabecera.fecha || hoy,
      area: cabecera.area || null,
      inspector: cabecera.inspector || null,
      cabecera,
      filas: filasUtiles,
      observaciones: observaciones || null,
      estado: "Completado",
    };
    const { error } = registro
      ? await supabase.from("inspecciones_hgp").update(payload).eq("id", registro.id)
      : await supabase.from("inspecciones_hgp").insert(payload);
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast(registro ? "Inspección actualizada" : "Inspección registrada", "success");
    onSaved();
  };

  return (
    <div>
      <button onClick={onCancel} className="mb-4 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
        <ArrowLeft size={13} /> Cancelar y volver
      </button>

      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-white font-semibold text-sm">{plantilla.titulo}</h3>
          <p className="text-[11px] text-gray-600 font-mono mt-0.5">{codFmt(plantilla.codigo, empresaInfo)}</p>
        </div>
        <div className="flex gap-2">
          <Btn size="sm" variant="ghost" onClick={onCancel}>Cancelar</Btn>
          <Btn size="sm" variant="primary" onClick={guardar} disabled={saving}>{saving ? "Guardando..." : registro ? "Actualizar" : "Guardar inspección"}</Btn>
        </div>
      </div>

      {/* Cabecera */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {plantilla.cabecera.map(f => (
          <FormField key={f.key} label={f.label + (f.required ? " *" : "")} className={f.full ? "sm:col-span-2 lg:col-span-3" : ""}>
            <Input type={f.type === "date" ? "date" : f.type === "time" ? "time" : "text"}
              value={cabecera[f.key] || ""}
              onChange={e => setCabecera(c => ({ ...c, [f.key]: e.target.value }))} />
          </FormField>
        ))}
      </div>

      {/* Tabla de activos */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto mb-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="px-2 py-2 text-gray-600 font-medium text-left">#</th>
              {plantilla.columnasActivo.map(c => (
                <th key={c.key} className="px-2 py-2 text-gray-600 font-medium text-left whitespace-nowrap">{c.label}</th>
              ))}
              {plantilla.puntos.map(p => (
                <th key={p.key} className="px-1 py-2 text-gray-600 font-medium text-center" title={p.label}>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px]">{p.short}</span>
                    <select value="" title="Marcar todos los ítems"
                      onChange={e => { if (e.target.value) { fillAll(p.key, e.target.value); e.target.value = ""; } }}
                      className="bg-gray-800 border border-gray-700 rounded text-[9px] text-gray-400 px-0.5 py-0.5 focus:outline-none focus:border-blue-500">
                      <option value="">todo…</option>
                      {CALIF_OPCIONES.map(o => <option key={o} value={o === "N.T." ? "N.T." : o}>{o}</option>)}
                    </select>
                  </div>
                </th>
              ))}
              <th className="px-2 py-2 text-gray-600 font-medium text-left">{plantilla.observacionPorFila.label}</th>
              <th className="px-1 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, idx) => (
              <tr key={idx} className="border-b border-gray-800/40 hover:bg-gray-800/20">
                <td className="px-2 py-1.5 text-gray-500 text-center">{f.item}</td>
                {plantilla.columnasActivo.map(c => (
                  <td key={c.key} className="px-1 py-1">
                    <input type={c.type === "month" ? "month" : "text"}
                      value={f[c.key] || ""}
                      onChange={e => setCel(idx, c.key, e.target.value)}
                      style={{ minWidth: c.width }}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-1.5 py-1 text-xs text-gray-200 focus:outline-none focus:border-blue-500" />
                  </td>
                ))}
                {plantilla.puntos.map(p => (
                  <td key={p.key} className="px-0.5 py-1">
                    <div className="flex items-center gap-0.5">
                      <select value={f[p.key] || ""} onChange={e => setCel(idx, p.key, e.target.value)}
                        className={`w-full rounded px-0.5 py-1 text-[11px] text-center font-bold focus:outline-none border ${califClass(f[p.key])}`}>
                        <option value=""></option>
                        {CALIF_OPCIONES.map(o => <option key={o} value={o === "N.T." ? "N.T." : o}>{o}</option>)}
                      </select>
                      {f[p.key] && idx < filas.length - 1 && (
                        <button type="button" title="Rellenar este valor hacia abajo"
                          onClick={() => fillDown(idx, p.key)}
                          className="shrink-0 text-gray-500 hover:text-blue-400 text-[11px] leading-none px-0.5">↓</button>
                      )}
                    </div>
                  </td>
                ))}
                <td className="px-1 py-1">
                  <input value={f[plantilla.observacionPorFila.key] || ""}
                    onChange={e => setCel(idx, plantilla.observacionPorFila.key, e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-1.5 py-1 text-xs text-gray-200 focus:outline-none focus:border-blue-500" style={{ minWidth: 100 }} />
                </td>
                <td className="px-1 py-1">
                  <button onClick={() => delFila(idx)} className="text-red-500/40 hover:text-red-400"><Trash2 size={12} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mb-4">
        <Btn size="sm" variant="ghost" onClick={addFila}><Plus size={12} /> Agregar fila</Btn>
        <p className="text-[11px] text-gray-600">{plantilla.leyendaCalif}</p>
      </div>

      <FormField label="Observaciones generales">
        <Input value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder={plantilla.recomendacion} />
      </FormField>

      <div className="flex justify-end gap-2 pt-4">
        <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
        <Btn variant="primary" onClick={guardar} disabled={saving}>{saving ? "Guardando..." : registro ? "Actualizar" : "Guardar inspección"}</Btn>
      </div>
    </div>
  );
}

const califClass = (v) =>
  v === "C" ? "bg-emerald-900/40 border-emerald-700 text-emerald-300"
  : v === "NC" ? "bg-red-900/40 border-red-700 text-red-300"
  : v === "NA" ? "bg-gray-800 border-gray-700 text-gray-400"
  : v === "N.T." ? "bg-amber-900/30 border-amber-700 text-amber-300"
  : "bg-gray-800 border-gray-700 text-gray-400";

// ════════════════════════════════════════════════════════════════════
//  FORMULARIO — Patrón "secciones"
// ════════════════════════════════════════════════════════════════════
const secCalifClass = (v) => VERDICT_CLASS[calVerdict(v)];
// Color de badge para una calificación de secciones (vista detalle)
const secCalColor = (v) => VERDICT_COLOR[calVerdict(v)];

function FormularioSecciones({ empresaId, plantilla, registro, empresaInfo, onCancel, onSaved }) {
  const hoy = new Date().toISOString().split("T")[0];
  const initCab = () => {
    const c = {};
    plantilla.cabecera.forEach(f => { c[f.key] = f.default ?? (f.key === "fecha" ? hoy : ""); });
    return c;
  };
  const [cabecera, setCabecera] = useState(registro?.cabecera || initCab());
  const [items, setItems] = useState(registro?.filas?.length ? registro.filas : itemsVaciosSecciones(plantilla));
  const [observaciones, setObservaciones] = useState(registro?.observaciones || "");
  const [saving, setSaving] = useState(false);

  // Configuración (con defaults para Vehículos FR-029)
  const cals = plantilla.calificaciones || CALIF_SECCIONES;
  const cols = plantilla.columnas || SECCIONES_COLUMNAS_DEFAULT;
  const calLabel = plantilla.calLabel || "Clasif.";

  const setItem = (idx, key, val) => setItems(its => its.map((it, i) => i === idx ? { ...it, [key]: val } : it));
  // Rellenar hacia abajo (como Excel): copia el valor a todos los ítems siguientes.
  const fillDown = (idx, key) => setItems(its => { const v = its[idx]?.[key] ?? ""; return its.map((it, i) => i >= idx ? { ...it, [key]: v } : it); });
  // Marcar todos los ítems con un valor (ej. todo "B"/"C").
  const fillAll = (key, val) => setItems(its => its.map(it => ({ ...it, [key]: val })));

  const guardar = async () => {
    if (!cabecera.inspector?.trim()) { showToast("Indica quién realizó la inspección", "error"); return; }
    setSaving(true);
    const payload = {
      empresa_id: empresaId,
      plantilla_codigo: plantilla.codigo,
      plantilla_nombre: plantilla.nombre,
      fecha: cabecera.fecha || hoy,
      area: cabecera.placa || cabecera.area || null,
      inspector: cabecera.inspector || null,
      cabecera,
      filas: items,
      observaciones: observaciones || null,
      estado: "Completado",
    };
    const { error } = registro
      ? await supabase.from("inspecciones_hgp").update(payload).eq("id", registro.id)
      : await supabase.from("inspecciones_hgp").insert(payload);
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast(registro ? "Inspección actualizada" : "Inspección registrada", "success");
    onSaved();
  };

  // Agrupar índices por sección para renderizar
  let idx = -1;
  return (
    <div>
      <button onClick={onCancel} className="mb-4 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
        <ArrowLeft size={13} /> Cancelar y volver
      </button>
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-white font-semibold text-sm">{plantilla.titulo}</h3>
          <p className="text-[11px] text-gray-600 font-mono mt-0.5">{codFmt(plantilla.codigo, empresaInfo)}</p>
        </div>
        <div className="flex gap-2">
          <Btn size="sm" variant="ghost" onClick={onCancel}>Cancelar</Btn>
          <Btn size="sm" variant="primary" onClick={guardar} disabled={saving}>{saving ? "Guardando..." : registro ? "Actualizar" : "Guardar inspección"}</Btn>
        </div>
      </div>

      {/* Cabecera */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {plantilla.cabecera.map(f => (
          <FormField key={f.key} label={f.label + (f.required ? " *" : "")} className={f.full ? "sm:col-span-2 lg:col-span-3" : ""}>
            <Input type={f.type === "date" ? "date" : "text"}
              value={cabecera[f.key] || ""}
              onChange={e => setCabecera(c => ({ ...c, [f.key]: e.target.value }))} />
          </FormField>
        ))}
      </div>

      {/* Secciones */}
      <div className="space-y-5 mb-4">
        {plantilla.secciones.map(sec => (
          <div key={sec.titulo} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="bg-gray-800/60 px-4 py-2 text-xs font-semibold text-blue-300 uppercase tracking-wide">{sec.titulo}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-gray-800">
                  <th className="px-2 py-2 text-gray-600 font-medium text-left w-12">Cód.</th>
                  <th className="px-2 py-2 text-gray-600 font-medium text-left">Elemento inspeccionado</th>
                  <th className="px-2 py-2 text-gray-600 font-medium text-center w-20">{calLabel}</th>
                  {cols.map(c => (
                    <th key={c.key} className="px-2 py-2 text-gray-600 font-medium text-left" style={c.width ? { width: c.width } : undefined}>{c.label}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {sec.items.map(it => {
                    idx++; const i = idx; const row = items[i] || {};
                    return (
                      <tr key={it.c} className="border-b border-gray-800/40 hover:bg-gray-800/20">
                        <td className="px-2 py-1.5 text-gray-500">{it.c}</td>
                        <td className="px-2 py-1.5 text-gray-300">{it.n}</td>
                        <td className="px-1 py-1">
                          <select value={row.calificacion || ""} onChange={e => setItem(i, "calificacion", e.target.value)}
                            className={`w-full rounded px-1 py-1 text-[11px] text-center font-bold focus:outline-none border ${secCalifClass(row.calificacion)}`}>
                            <option value=""></option>
                            {cals.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </td>
                        {cols.map(c => (
                          <td key={c.key} className="px-1 py-1">
                            {c.type === "select" ? (
                              <select value={row[c.key] || ""} onChange={e => setItem(i, c.key, e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded px-1 py-1 text-[11px] text-center text-gray-200 focus:outline-none focus:border-blue-500">
                                {c.opciones.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            ) : (
                              <input type={c.type === "date" ? "date" : "text"} value={row[c.key] || ""} onChange={e => setItem(i, c.key, e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded px-1.5 py-1 text-xs text-gray-200 focus:outline-none focus:border-blue-500" style={{ minWidth: c.width || 120 }} />
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-gray-600 mb-3">{plantilla.leyendaCalif}</p>
      <FormField label="Observaciones generales / Nota">
        <Input value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder={plantilla.recomendacion} />
      </FormField>
      <div className="flex justify-end gap-2 pt-4">
        <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
        <Btn variant="primary" onClick={guardar} disabled={saving}>{saving ? "Guardando..." : registro ? "Actualizar" : "Guardar inspección"}</Btn>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  FORMULARIO — Patrón "matriz" (equipos en columnas, ítems en filas)
// ════════════════════════════════════════════════════════════════════
const matCalifClass = (v) => VERDICT_CLASS[calVerdict(v)];
const matCalColor = (v) => VERDICT_COLOR[calVerdict(v)];

function FormularioMatriz({ empresaId, plantilla, registro, empresaInfo, onCancel, onSaved }) {
  const hoy = new Date().toISOString().split("T")[0];
  const initCab = () => {
    const c = {};
    plantilla.cabecera.forEach(f => { c[f.key] = f.default ?? (f.key === "fecha" ? hoy : ""); });
    return c;
  };
  // Columnas fijas (ej. meses) vs equipos editables (ej. arneses)
  const fijas = plantilla.columnasFijas || null;
  const extra = plantilla.itemExtra || null;          // columna descriptiva extra (ej. cantidad)
  const ek = plantilla.equipoCampo?.key || "codigo";
  const grupos = plantilla.grupos || [{ titulo: null, items: plantilla.items || [] }];

  const [cabecera, setCabecera] = useState(registro?.cabecera || initCab());
  const [equipos, setEquipos] = useState(
    fijas ? [] : (registro?.cabecera?.equipos?.length ? registro.cabecera.equipos : equiposIniciales(plantilla))
  );
  const [items, setItems] = useState(registro?.filas?.length ? registro.filas : itemsVaciosMatriz(plantilla));
  const [observaciones, setObservaciones] = useState(registro?.observaciones || "");
  const [saving, setSaving] = useState(false);

  const nCols = fijas ? fijas.length : equipos.length;
  const baseCols = 2 + (extra ? 1 : 0);

  const setVal = (idx, eq, val) =>
    setItems(its => its.map((it, i) => i === idx ? { ...it, vals: { ...it.vals, [eq]: val } } : it));
  // Rellenar la columna (mismo equipo) hacia abajo: copia el valor a los ítems siguientes.
  const fillDownCol = (idx, eq) => setItems(its => {
    const v = its[idx]?.vals?.[eq] ?? "";
    return its.map((it, i) => i >= idx ? { ...it, vals: { ...it.vals, [eq]: v } } : it);
  });
  const setEquipo = (eq, val) => setEquipos(es => es.map((e, i) => i === eq ? { ...e, [ek]: val } : e));
  const addEquipo = () => {
    if (equipos.length >= (plantilla.equiposMax || 12)) { showToast(`Máximo ${plantilla.equiposMax} equipos`, "info"); return; }
    setEquipos(es => [...es, { [ek]: "" }]);
  };
  const delEquipo = (eq) => {
    setEquipos(es => es.filter((_, i) => i !== eq));
    // Recolocar las calificaciones de columnas posteriores
    setItems(its => its.map(it => {
      const vals = {};
      Object.entries(it.vals || {}).forEach(([k, v]) => {
        const ki = Number(k);
        if (ki < eq) vals[ki] = v;
        else if (ki > eq) vals[ki - 1] = v;
      });
      return { ...it, vals };
    }));
  };

  const guardar = async () => {
    if (!cabecera.inspector?.trim()) { showToast("Indica quién realizó la inspección", "error"); return; }
    setSaving(true);
    const payload = {
      empresa_id: empresaId,
      plantilla_codigo: plantilla.codigo,
      plantilla_nombre: plantilla.nombre,
      fecha: cabecera.fecha || hoy,
      area: cabecera.area || cabecera.unidad || null,
      inspector: cabecera.inspector || null,
      cabecera: fijas ? cabecera : { ...cabecera, equipos },
      filas: items,
      observaciones: observaciones || null,
      estado: "Completado",
    };
    const { error } = registro
      ? await supabase.from("inspecciones_hgp").update(payload).eq("id", registro.id)
      : await supabase.from("inspecciones_hgp").insert(payload);
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast(registro ? "Inspección actualizada" : "Inspección registrada", "success");
    onSaved();
  };

  const totalCols = baseCols + nCols;
  let idx = -1;
  return (
    <div>
      <button onClick={onCancel} className="mb-4 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
        <ArrowLeft size={13} /> Cancelar y volver
      </button>
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-white font-semibold text-sm">{plantilla.titulo}</h3>
          <p className="text-[11px] text-gray-600 font-mono mt-0.5">{codFmt(plantilla.codigoPdf || plantilla.codigo, empresaInfo)}</p>
        </div>
        <div className="flex gap-2">
          <Btn size="sm" variant="ghost" onClick={onCancel}>Cancelar</Btn>
          <Btn size="sm" variant="primary" onClick={guardar} disabled={saving}>{saving ? "Guardando..." : registro ? "Actualizar" : "Guardar inspección"}</Btn>
        </div>
      </div>

      {/* Cabecera */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {plantilla.cabecera.map(f => (
          <FormField key={f.key} label={f.label + (f.required ? " *" : "")} className={f.full ? "sm:col-span-2 lg:col-span-3" : ""}>
            <Input type={f.type === "date" ? "date" : f.type === "time" ? "time" : "text"}
              value={cabecera[f.key] || ""}
              onChange={e => setCabecera(c => ({ ...c, [f.key]: e.target.value }))} />
          </FormField>
        ))}
      </div>

      {/* Matriz */}
      {!fijas && (
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] text-gray-500">{equipos.length} {plantilla.equipoLabel.toLowerCase()}(s). Edita el código de cada uno en el encabezado.</p>
          <Btn size="sm" variant="ghost" onClick={addEquipo}><Plus size={12} /> Agregar {plantilla.equipoLabel.toLowerCase()}</Btn>
        </div>
      )}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto mb-4">
        <table className="text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="px-2 py-2 text-gray-600 font-medium text-left sticky left-0 bg-gray-900 z-10 w-10">Cód.</th>
              <th className="px-2 py-2 text-gray-600 font-medium text-left sticky left-10 bg-gray-900 z-10" style={{ minWidth: extra ? 180 : 220 }}>Ítem</th>
              {extra && <th className="px-2 py-2 text-gray-600 font-medium text-center" style={{ minWidth: 50 }}>{extra.label}</th>}
              {fijas
                ? fijas.map((lbl, i) => (
                  <th key={i} className="px-1 py-2 text-gray-600 font-medium text-center border-l border-gray-800" style={{ minWidth: 42 }}>
                    <span className="text-[10px] text-blue-300">{lbl}</span>
                  </th>
                ))
                : equipos.map((eq, i) => (
                  <th key={i} className="px-1.5 py-1.5 text-gray-600 font-medium text-center border-l border-gray-800" style={{ minWidth: 84 }}>
                    <div className="text-[10px] text-blue-300 mb-1">{plantilla.equipoLabel} N°{i + 1}</div>
                    <div className="flex items-center gap-1">
                      <input value={eq[ek] || ""} onChange={e => setEquipo(i, e.target.value)} placeholder={plantilla.equipoCampo?.label || "Código"}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-[10px] text-gray-200 text-center focus:outline-none focus:border-blue-500" />
                      {equipos.length > 1 && (
                        <button onClick={() => delEquipo(i)} className="text-red-500/40 hover:text-red-400 shrink-0" title="Quitar"><Trash2 size={11} /></button>
                      )}
                    </div>
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {grupos.map((g, gi) => (
              <Fragment key={g.titulo || `g${gi}`}>
                {g.titulo && (
                  <tr>
                    <td colSpan={totalCols} className="bg-gray-800/60 px-3 py-1.5 text-[11px] font-semibold text-blue-300 uppercase tracking-wide sticky left-0">{g.titulo}</td>
                  </tr>
                )}
                {g.items.map(it => {
                  idx++; const i = idx; const row = items[i] || { vals: {} };
                  return (
                    <tr key={it.c} className="border-b border-gray-800/40 hover:bg-gray-800/20">
                      <td className="px-2 py-1.5 text-gray-500 sticky left-0 bg-gray-900">{it.c}</td>
                      <td className="px-2 py-1.5 text-gray-300 sticky left-10 bg-gray-900">
                        {it.n}
                        {it.desc && <div className="text-[10px] text-gray-500 font-normal mt-0.5 leading-tight" style={{ maxWidth: 240 }}>{it.desc}</div>}
                      </td>
                      {extra && <td className="px-2 py-1.5 text-gray-500 text-center">{row.cantidad ?? it.cantidad ?? ""}</td>}
                      {Array.from({ length: nCols }).map((_, eq) => (
                        <td key={eq} className="px-1 py-1 border-l border-gray-800/40">
                          <div className="flex items-center gap-0.5">
                            <select value={row.vals?.[eq] || ""} onChange={e => setVal(i, eq, e.target.value)}
                              className={`w-full rounded px-0.5 py-1 text-[11px] text-center font-bold focus:outline-none border ${matCalifClass(row.vals?.[eq])}`}>
                              <option value=""></option>
                              {plantilla.calificaciones.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                            {row.vals?.[eq] && i < items.length - 1 && (
                              <button type="button" title="Rellenar esta columna hacia abajo"
                                onClick={() => fillDownCol(i, eq)}
                                className="shrink-0 text-gray-500 hover:text-blue-400 text-[11px] leading-none px-0.5">↓</button>
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-gray-600 mb-3">{plantilla.leyendaCalif}</p>
      <FormField label="Observaciones generales / Nota">
        <Input value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder={plantilla.recomendacion} />
      </FormField>
      <div className="flex justify-end gap-2 pt-4">
        <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
        <Btn variant="primary" onClick={guardar} disabled={saving}>{saving ? "Guardando..." : registro ? "Actualizar" : "Guardar inspección"}</Btn>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  FORMULARIO — Patrón "evento" (RACS)
// ════════════════════════════════════════════════════════════════════
function FormularioEvento({ empresaId, plantilla, registro, empresaInfo, onCancel, onSaved }) {
  const hoy = new Date().toISOString().split("T")[0];
  const cab0 = registro?.cabecera || {};
  const [categoria, setCategoria] = useState(cab0.categoria || "SST");   // SST | MA
  const [naturaleza, setNaturaleza] = useState(cab0.naturaleza || "acto"); // acto | condicion
  const [nivel, setNivel] = useState(cab0.nivel || "medio");             // bajo | medio | alto
  const [fecha, setFecha] = useState(registro?.fecha || hoy);
  const [ubicacion, setUbicacion] = useState(cab0.ubicacion || "");
  const [reportante, setReportante] = useState(cab0.reportante || registro?.inspector || "");
  const [descripcion, setDescripcion] = useState(cab0.descripcion || "");
  const [accion, setAccion] = useState(cab0.accion || "");
  const [fotoUrl, setFotoUrl] = useState((registro?.foto_urls || [])[0] || "");
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [saving, setSaving] = useState(false);

  const nivelInfo = plantilla.niveles[nivel];
  const nivelColorBtn = (l) => l === "bajo" ? "emerald" : l === "medio" ? "amber" : "red";

  const subirFoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoFoto(true);
    const path = `${empresaId}/racs/${Date.now()}_${Math.random().toString(36).slice(2)}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("inspecciones-fotos").upload(path, file, { contentType: file.type });
    if (error) { showToast("Error subiendo foto: " + error.message, "error"); setSubiendoFoto(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("inspecciones-fotos").getPublicUrl(path);
    setFotoUrl(publicUrl);
    setSubiendoFoto(false);
    e.target.value = "";
  };

  const guardar = async () => {
    if (!ubicacion.trim() || !descripcion.trim()) { showToast("Completa Ubicación y Descripción", "error"); return; }
    setSaving(true);
    const cabecera = { categoria, naturaleza, nivel, ubicacion, reportante, descripcion, accion };
    const payload = {
      empresa_id: empresaId,
      plantilla_codigo: plantilla.codigo,
      plantilla_nombre: plantilla.nombre,
      fecha,
      area: ubicacion || null,
      inspector: reportante || null,
      cabecera,
      filas: [],
      observaciones: null,
      foto_urls: fotoUrl ? [fotoUrl] : [],
      estado: "Completado",
    };
    const { error } = registro
      ? await supabase.from("inspecciones_hgp").update(payload).eq("id", registro.id)
      : await supabase.from("inspecciones_hgp").insert(payload);
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast(registro ? "RACS actualizado" : "RACS registrado", "success");
    onSaved();
  };

  const TOG_ON = {
    blue: "bg-blue-600 border-blue-500 text-white",
    emerald: "bg-emerald-600 border-emerald-500 text-white",
    amber: "bg-amber-500 border-amber-400 text-white",
    red: "bg-red-600 border-red-500 text-white",
  };
  const Tog = ({ active, onClick, children, color = "blue" }) => (
    <button type="button" onClick={onClick}
      className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all border ${active
        ? TOG_ON[color]
        : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200"}`}>{children}</button>
  );

  return (
    <div className="max-w-2xl">
      <button onClick={onCancel} className="mb-4 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
        <ArrowLeft size={13} /> Cancelar y volver
      </button>
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-white font-semibold text-sm">{plantilla.titulo}</h3>
          <p className="text-[11px] text-gray-600 font-mono mt-0.5">{codFmt(plantilla.codigo, empresaInfo)}</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Sistema</p>
            <div className="flex gap-2">
              <Tog active={categoria === "SST"} onClick={() => setCategoria("SST")}>SST</Tog>
              <Tog active={categoria === "MA"} onClick={() => setCategoria("MA")} color="emerald">M. Ambiente</Tog>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Naturaleza</p>
            <div className="flex gap-2">
              <Tog active={naturaleza === "acto"} onClick={() => setNaturaleza("acto")}>Acto</Tog>
              <Tog active={naturaleza === "condicion"} onClick={() => setNaturaleza("condicion")}>Condición</Tog>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <FormField label="Fecha"><Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></FormField>
          <FormField label="Ubicación *"><Input value={ubicacion} onChange={e => setUbicacion(e.target.value)} placeholder="Ej: Casa de máquinas, Pabellón A..." /></FormField>
          <FormField label="Reportante" className="sm:col-span-2"><Input value={reportante} onChange={e => setReportante(e.target.value)} placeholder="Nombre completo" /></FormField>
        </div>

        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nivel de riesgo</p>
          <div className="grid grid-cols-3 gap-2">
            {["bajo", "medio", "alto"].map(l => (
              <Tog key={l} active={nivel === l} onClick={() => setNivel(l)} color={nivelColorBtn(l)}>
                {plantilla.niveles[l].label}
              </Tog>
            ))}
          </div>
          <div className="mt-2 p-3 bg-blue-900/15 border border-blue-900/40 rounded-lg">
            <p className="text-[11px] text-blue-200 leading-snug italic">{categoria === "MA" ? nivelInfo.ma : nivelInfo.sst}</p>
          </div>
        </div>

        <FormField label="Descripción del evento / hallazgo *">
          <textarea rows={3} value={descripcion} onChange={e => setDescripcion(e.target.value)}
            className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500 resize-none"
            placeholder="Detalle el acto o condición observado..." />
        </FormField>
        <FormField label="Acción inmediata / correctiva">
          <textarea rows={2} value={accion} onChange={e => setAccion(e.target.value)}
            className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500 resize-none"
            placeholder="Describa la acción correctiva realizada..." />
        </FormField>

        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Evidencia fotográfica</p>
          {fotoUrl ? (
            <div className="relative inline-block">
              <img src={fotoUrl} alt="Evidencia" className="h-40 rounded-lg border border-gray-700" />
              <button onClick={() => setFotoUrl("")} className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full"><Trash2 size={13} /></button>
            </div>
          ) : (
            <label className="block border-2 border-dashed border-gray-700 rounded-lg p-5 text-center cursor-pointer hover:bg-gray-800/40 transition-colors">
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={subirFoto} disabled={subiendoFoto} />
              <p className="text-xs text-gray-500">{subiendoFoto ? "Subiendo..." : "Click para tomar foto o subir evidencia"}</p>
            </label>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
        <Btn variant="primary" onClick={guardar} disabled={saving || subiendoFoto}>{saving ? "Guardando..." : registro ? "Actualizar" : "Guardar RACS"}</Btn>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  MODAL DETALLE (vista rápida)
// ════════════════════════════════════════════════════════════════════
function DetalleModal({ registro, plantilla, empresaInfo, onClose }) {
  const filas = Array.isArray(registro.filas) ? registro.filas : [];
  return (
    <Modal title={`${registro.plantilla_nombre} — ${fmtFecha(registro.fecha)}`} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-gray-400">
            <span className="text-gray-600">Inspector:</span> {registro.inspector || "—"}
            <span className="text-gray-600 ml-3">Área:</span> {registro.area || "—"}
          </div>
          <Btn size="sm" variant="primary" onClick={() => generarPDF(registro, plantilla, empresaInfo)}><FileDown size={13} /> Descargar PDF</Btn>
        </div>
        {!plantilla ? (
          <p className="text-gray-500 text-sm">Plantilla no disponible para visualizar el detalle.</p>
        ) : plantilla.patron === "evento" ? (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge color="blue">{registro.cabecera?.categoria === "MA" ? "M. Ambiente" : "SST"}</Badge>
              <Badge color="gray">{registro.cabecera?.naturaleza === "condicion" ? "Condición" : "Acto"}</Badge>
              <Badge color={registro.cabecera?.nivel === "alto" ? "red" : registro.cabecera?.nivel === "medio" ? "amber" : "green"}>
                Riesgo {plantilla.niveles[registro.cabecera?.nivel]?.label || "—"}
              </Badge>
            </div>
            <p className="text-gray-300"><span className="text-gray-600">Descripción:</span> {registro.cabecera?.descripcion || "—"}</p>
            <p className="text-gray-300"><span className="text-gray-600">Acción inmediata:</span> {registro.cabecera?.accion || "—"}</p>
            {(registro.foto_urls || [])[0] && <img src={registro.foto_urls[0]} alt="Evidencia" className="h-48 rounded-lg border border-gray-700" />}
          </div>
        ) : plantilla.patron === "matriz" ? (
          (() => {
            const fijas = plantilla.columnasFijas || null;
            const extra = plantilla.itemExtra || null;
            const equipos = registro.cabecera?.equipos || [];
            const ek = plantilla.equipoCampo?.key || "codigo";
            const grupos = plantilla.grupos || [{ titulo: null, items: plantilla.items || [] }];
            const nCols = fijas ? fijas.length : equipos.length;
            const totalCols = 2 + (extra ? 1 : 0) + nCols;
            let mi = -1;
            return (
              <div className="overflow-x-auto border border-gray-800 rounded-lg">
                <table className="text-xs border-collapse">
                  <thead><tr className="border-b border-gray-800 bg-gray-900/50">
                    <th className="px-2 py-2 text-gray-600 text-left">Cód.</th>
                    <th className="px-2 py-2 text-gray-600 text-left" style={{ minWidth: extra ? 160 : 200 }}>Ítem</th>
                    {extra && <th className="px-2 py-2 text-gray-600 text-center">{extra.label}</th>}
                    {fijas
                      ? fijas.map((lbl, i) => <th key={i} className="px-1.5 py-2 text-gray-600 text-center border-l border-gray-800">{lbl}</th>)
                      : equipos.map((eq, i) => (
                        <th key={i} className="px-2 py-2 text-gray-600 text-center border-l border-gray-800">
                          {plantilla.equipoLabel} {i + 1}<br /><span className="text-gray-500 font-mono">{eq[ek] || "—"}</span>
                        </th>
                      ))}
                  </tr></thead>
                  <tbody>
                    {grupos.map((g, gi) => (
                      <Fragment key={g.titulo || `g${gi}`}>
                        {g.titulo && <tr><td colSpan={totalCols} className="bg-gray-800/40 px-2 py-1 text-[11px] font-semibold text-blue-300">{g.titulo}</td></tr>}
                        {g.items.map(it => {
                          mi++; const row = (registro.filas || [])[mi] || { vals: {} };
                          return (
                            <tr key={it.c} className="border-b border-gray-800/40">
                              <td className="px-2 py-1.5 text-gray-500">{it.c}</td>
                              <td className="px-2 py-1.5 text-gray-300">{it.n}{it.desc && <span className="block text-[10px] text-gray-500">{it.desc}</span>}</td>
                              {extra && <td className="px-2 py-1.5 text-gray-500 text-center">{row.cantidad ?? it.cantidad ?? ""}</td>}
                              {Array.from({ length: nCols }).map((_, eq) => (
                                <td key={eq} className="px-2 py-1.5 text-center border-l border-gray-800/40">
                                  {row.vals?.[eq]
                                    ? <Badge color={matCalColor(row.vals[eq])}>{row.vals[eq]}</Badge>
                                    : <span className="text-gray-700">—</span>}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()
        ) : plantilla.patron === "secciones" ? (
          (() => {
            const cols = plantilla.columnas || SECCIONES_COLUMNAS_DEFAULT;
            return (
              <div className="overflow-x-auto border border-gray-800 rounded-lg">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-gray-800 bg-gray-900/50">
                    {["Cód.", "Elemento", plantilla.calLabel || "Clasif.", ...cols.map(c => c.label)].map((h, hi) =>
                      <th key={hi} className="px-2 py-2 text-gray-600 text-left">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {filas.map((it, i) => (
                      <tr key={i} className="border-b border-gray-800/40">
                        <td className="px-2 py-1.5 text-gray-500">{it.codigo}</td>
                        <td className="px-2 py-1.5 text-gray-300">{it.nombre}</td>
                        <td className="px-2 py-1.5 text-center">
                          {it.calificacion ? <Badge color={secCalColor(it.calificacion)}>{it.calificacion}</Badge> : <span className="text-gray-700">—</span>}
                        </td>
                        {cols.map(c => (
                          <td key={c.key} className="px-2 py-1.5 text-gray-400">
                            {c.key === "estatus" && it[c.key]
                              ? <Badge color={ESTATUS_INFO[it[c.key]]?.color || "gray"}>{it[c.key]}</Badge>
                              : (it[c.key] || "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()
        ) : (
          <div className="overflow-x-auto border border-gray-800 rounded-lg">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="px-2 py-2 text-gray-600 text-left">#</th>
                {plantilla.columnasActivo.map(c => <th key={c.key} className="px-2 py-2 text-gray-600 text-left whitespace-nowrap">{c.label}</th>)}
                {plantilla.puntos.map(p => <th key={p.key} className="px-1 py-2 text-gray-600 text-center" title={p.label}>{p.short}</th>)}
                <th className="px-2 py-2 text-gray-600 text-left">Obs.</th>
              </tr></thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={i} className="border-b border-gray-800/40">
                    <td className="px-2 py-1.5 text-gray-500 text-center">{f.item}</td>
                    {plantilla.columnasActivo.map(c => <td key={c.key} className="px-2 py-1.5 text-gray-300">{f[c.key] || "—"}</td>)}
                    {plantilla.puntos.map(p => (
                      <td key={p.key} className="px-1 py-1.5 text-center">
                        {f[p.key] ? <Badge color={calColor(f[p.key])}>{f[p.key]}</Badge> : <span className="text-gray-700">—</span>}
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-gray-400">{f[plantilla.observacionPorFila.key] || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {registro.observaciones && (
          <p className="text-xs text-gray-400 bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700">{registro.observaciones}</p>
        )}
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════
//  GENERADOR DE PDF — replica el formato oficial
// ════════════════════════════════════════════════════════════════════
// Carga una imagen del /public como dataURL para incrustarla en el PDF
function cargarLogo(src) {
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

// Dibuja el encabezado oficial (3 celdas con logo) + datos de cabecera.
// Devuelve la coordenada Y donde continúa el contenido.
function dibujarEncabezado(doc, plantilla, registro, W, M, logo, empresa = EMPRESA_HGP) {
  const hY = 8, hH = 16;
  const c1 = 32, c3 = 70, c2 = W - 2 * M - c1 - c3;
  doc.setLineWidth(0.3);
  doc.rect(M, hY, c1, hH);
  doc.rect(M + c1, hY, c2, hH);
  doc.rect(M + c1 + c2, hY, c3, hH);

  if (logo) {
    const maxW = c1 - 4, maxH = hH - 4;
    const ratio = Math.min(maxW / logo.w, maxH / logo.h);
    const lw = logo.w * ratio, lh = logo.h * ratio;
    doc.addImage(logo.data, "PNG", M + (c1 - lw) / 2, hY + (hH - lh) / 2, lw, lh);
  } else {
    doc.setFontSize(7).setFont(undefined, "bold");
    doc.text(empresa.nombre, M + c1 / 2, hY + 7, { align: "center" });
    doc.setFontSize(5).setFont(undefined, "normal");
    doc.text(empresa.nombre.split(" ")[0], M + c1 / 2, hY + 11, { align: "center" });
  }

  doc.setFontSize(7).setFont(undefined, "bold");
  doc.text("FORMATO", M + c1 + c2 / 2, hY + 4, { align: "center" });
  doc.setFontSize(6).setFont(undefined, "normal");
  doc.text("ÁREA DE SEGURIDAD Y SALUD EN EL TRABAJO", M + c1 + c2 / 2, hY + 8, { align: "center" });
  doc.setFontSize(8).setFont(undefined, "bold");
  doc.text(plantilla.titulo, M + c1 + c2 / 2, hY + 13, { align: "center" });

  doc.setFontSize(6).setFont(undefined, "normal");
  const cx = M + c1 + c2 + 2;
  doc.text(`Código: ${codFmt(plantilla.codigoPdf || plantilla.codigo, empresa)}`, cx, hY + 5);
  doc.text(`Fecha: ${registro.fecha || ""}`, cx, hY + 9);
  doc.text(`Rev. ${plantilla.rev || "00"}   Página 01 de 01`, cx, hY + 13);

  // ── Datos de cabecera (genérico, según plantilla.cabecera) ──
  let y = hY + hH + 5;
  const cab = registro.cabecera || {};
  doc.setFontSize(7).setFont(undefined, "bold");
  const partes = plantilla.cabecera.map(f => `${f.label}: ${cab[f.key] || ""}`);
  // Envolver en líneas de ~3 campos
  for (let i = 0; i < partes.length; i += 3) {
    doc.text(partes.slice(i, i + 3).join("      "), M, y);
    y += 5;
  }
  return y + 1;
}

// Dibuja las firmas al pie. Devuelve la Y final.
function dibujarFirmas(doc, plantilla, W, M, fy) {
  fy += 6;
  if (fy > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); fy = 20; }
  const fw = (W - 2 * M) / plantilla.firmas.length;
  plantilla.firmas.forEach((s, i) => {
    const x = M + fw * i + fw / 2;
    doc.line(x - 30, fy, x + 30, fy);
    doc.setFontSize(6).setFont(undefined, "bold");
    doc.text(s.rol, x, fy + 4, { align: "center" });
  });
  return fy;
}

// Reemplaza el prefijo del código del formato (DEMO usa uno genérico, sin "HGP-SGIII")
function codFmt(codigo, empresa) {
  if (!codigo || !empresa?.codigoPrefix) return codigo;
  return codigo.replace(/^HGP-SGIII/i, empresa.codigoPrefix).replace(/^HGP/i, empresa.codigoPrefix);
}

function guardarPDF(doc, plantilla, registro, empresa) {
  const cod = codFmt(plantilla.codigo, empresa);
  const nombre = `${cod}_${registro.fecha || "inspeccion"}.pdf`.replace(/[^\w.-]/g, "_");
  doc.save(nombre);
}

export async function generarPDF(registro, plantilla, empresa = EMPRESA_HGP) {
  if (!plantilla) { showToast("Plantilla no encontrada para el PDF", "error"); return; }
  // logo === null ⇒ sin logo (DEMO); falsy "normal" ⇒ usa el de HGP por defecto
  const logo = empresa.logo === null ? null : await cargarLogo(empresa.logo || EMPRESA_HGP.logo);

  // El RACS (evento) usa formato vertical propio
  if (plantilla.patron === "evento") {
    await pdfEvento(registro, plantilla, logo);
    return;
  }

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 8;
  const y = dibujarEncabezado(doc, plantilla, registro, W, M, logo, empresa);
  if (plantilla.patron === "secciones") pdfSecciones(doc, plantilla, registro, W, M, y);
  else if (plantilla.patron === "matriz") pdfMatriz(doc, plantilla, registro, W, M, y);
  else pdfActivos(doc, plantilla, registro, W, M, y);
  guardarPDF(doc, plantilla, registro, empresa);
}

// ── PDF para patrón "evento" (RACS FR-018) — formato vertical oficial ──
async function pdfEvento(registro, plantilla, logo) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 12;
  const innerW = W - 2 * M;
  const cab = registro.cabecera || {};

  // ── Encabezado (3 celdas) ──
  let hY = M, hH = 18;
  const c1 = 32, c3 = 52, c2 = innerW - c1 - c3;
  doc.setLineWidth(0.3);
  doc.rect(M, hY, c1, hH); doc.rect(M + c1, hY, c2, hH); doc.rect(M + c1 + c2, hY, c3, hH);
  if (logo) {
    const ratio = Math.min((c1 - 4) / logo.w, (hH - 4) / logo.h);
    doc.addImage(logo.data, "PNG", M + (c1 - logo.w * ratio) / 2, hY + (hH - logo.h * ratio) / 2, logo.w * ratio, logo.h * ratio);
  } else {
    doc.setFontSize(7).setFont(undefined, "bold").text("HYDRO GLOBAL", M + c1 / 2, hY + hH / 2, { align: "center" });
  }
  doc.setFontSize(7).setFont(undefined, "bold").text("DOCUMENTO DE GESTIÓN", M + c1 + c2 / 2, hY + 5, { align: "center" });
  doc.setFontSize(7.5).text(plantilla.titulo, M + c1 + c2 / 2, hY + 10, { align: "center", maxWidth: c2 - 4 });
  doc.setFontSize(5.5).setFont(undefined, "normal").text(plantilla.subtitulo, M + c1 + c2 / 2, hY + 15, { align: "center" });
  doc.setFontSize(6);
  const cx = M + c1 + c2 + 2;
  doc.text(`Código: ${plantilla.codigoPdf}`, cx, hY + 5);
  doc.text(`Fecha: ${registro.fecha || ""}`, cx, hY + 10);
  doc.text(`Rev. ${plantilla.rev}  Pág. 1/1`, cx, hY + 15);

  let y = hY + hH;
  const box = (h) => { doc.setLineWidth(0.3); doc.rect(M, y, innerW, h); };
  const titulo = (t) => { doc.setFontSize(7).setFont(undefined, "bold").text(t, M + 2, y + 4); };
  const check = (x, yy, on) => { doc.rect(x, yy - 3, 3, 3); if (on) { doc.setFontSize(7).text("X", x + 0.6, yy - 0.4); } };

  // ── Datos del reportante + clasificación (dos columnas) ──
  const halfW = innerW / 2, h1 = 26;
  doc.rect(M, y, halfW, h1); doc.rect(M + halfW, y, halfW, h1);
  doc.setFontSize(7).setFont(undefined, "bold").text("Datos del Reportante", M + 2, y + 4);
  doc.setFont(undefined, "normal").setFontSize(7);
  doc.text(`Nombre: ${cab.reportante || ""}`, M + 2, y + 10);
  doc.text(`Ubicación: ${cab.ubicacion || ""}`, M + 2, y + 16);
  doc.text(`Fecha: ${registro.fecha || ""}`, M + 2, y + 22);

  doc.setFont(undefined, "bold").text("Clasificación", M + halfW + 2, y + 4);
  doc.setFont(undefined, "normal");
  check(M + halfW + 3, y + 10, cab.categoria === "SST"); doc.text("Seguridad SST", M + halfW + 8, y + 10);
  check(M + halfW + 3, y + 15, cab.categoria === "MA"); doc.text("Medio Ambiente", M + halfW + 8, y + 15);
  check(M + halfW + 40, y + 10, cab.naturaleza === "acto"); doc.text("Acto", M + halfW + 45, y + 10);
  check(M + halfW + 40, y + 15, cab.naturaleza === "condicion"); doc.text("Condición", M + halfW + 45, y + 15);
  y += h1;

  // ── Nivel de riesgo + leyenda ──
  const nivelInfo = plantilla.niveles[cab.nivel] || plantilla.niveles.medio;
  const legText = cab.categoria === "MA" ? nivelInfo.ma : nivelInfo.sst;
  const legLines = doc.setFontSize(7).splitTextToSize(legText, innerW - 4);
  const h2 = 10 + legLines.length * 3.2;
  box(h2);
  doc.setFont(undefined, "bold").setFontSize(7);
  doc.text(`Nivel de Riesgo: ${nivelInfo.label}`, M + 2, y + 5);
  doc.setFont(undefined, "italic").setFontSize(7).text(legLines, M + 2, y + 9);
  y += h2;

  // ── Descripción ──
  const descLines = doc.setFontSize(8).splitTextToSize(cab.descripcion || "", innerW - 4);
  const h3 = Math.max(22, 8 + descLines.length * 3.6);
  box(h3); titulo("Descripción del Evento / Hallazgo");
  doc.setFont(undefined, "normal").setFontSize(8).text(descLines, M + 2, y + 9);
  y += h3;

  // ── Acción inmediata ──
  const accLines = doc.setFontSize(8).splitTextToSize(cab.accion || "---", innerW - 4);
  const h4 = Math.max(18, 8 + accLines.length * 3.6);
  box(h4); titulo("Acción Inmediata Implementada / Correctiva");
  doc.setFont(undefined, "normal").setFontSize(8).text(accLines, M + 2, y + 9);
  y += h4;

  // ── Evidencia fotográfica ──
  const h5 = 60;
  box(h5); titulo("Evidencia Fotográfica");
  const fotoUrl = (registro.foto_urls || [])[0];
  if (fotoUrl) {
    const foto = await cargarLogo(fotoUrl);
    if (foto) {
      const maxW = innerW - 6, maxH = h5 - 10;
      const ratio = Math.min(maxW / foto.w, maxH / foto.h);
      const fw = foto.w * ratio, fh = foto.h * ratio;
      doc.addImage(foto.data, "PNG", M + (innerW - fw) / 2, y + 7, fw, fh);
    }
  } else {
    doc.setFont(undefined, "italic").setFontSize(7).setTextColor(150).text("Sin evidencia adjunta", M + innerW / 2, y + h5 / 2, { align: "center" });
    doc.setTextColor(0);
  }
  y += h5 + 10;

  // ── Firmas ──
  const fw = innerW / 2;
  plantilla.firmas.forEach((s, i) => {
    const x = M + fw * i + fw / 2;
    doc.line(x - 28, y, x + 28, y);
    doc.setFontSize(7).setFont(undefined, "bold").text(s.rol, x, y + 4, { align: "center" });
  });

  guardarPDF(doc, plantilla, registro);
}

// ── PDF para patrón "activos" (Extintores, Botiquines, Luces) ──
function pdfActivos(doc, plantilla, registro, W, M, y) {
  const filas = Array.isArray(registro.filas) ? registro.filas : [];
  const head = [[
    "Ítem",
    ...plantilla.columnasActivo.map(c => c.label),
    ...plantilla.puntos.map((p, i) => `${i + 1}`),
    "Obs.",
  ]];
  const body = filas.map(f => [
    f.item,
    ...plantilla.columnasActivo.map(c => f[c.key] || ""),
    ...plantilla.puntos.map(p => f[p.key] || ""),
    f[plantilla.observacionPorFila.key] || "",
  ]);

  autoTable(doc, {
    startY: y, head, body, theme: "grid",
    styles: { fontSize: 5.5, cellPadding: 0.8, halign: "center", lineWidth: 0.1, lineColor: [0, 0, 0] },
    headStyles: { fillColor: [0, 51, 102], textColor: 255, fontSize: 5.5, fontStyle: "bold" },
    columnStyles: {
      1: { halign: "left" }, 2: { halign: "left" },
      [plantilla.columnasActivo.length + plantilla.puntos.length + 1]: { halign: "left" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.cell.raw === "NC") {
        data.cell.styles.fillColor = [254, 226, 226];
        data.cell.styles.textColor = [185, 28, 28];
        data.cell.styles.fontStyle = "bold";
      }
    },
    margin: { left: M, right: M },
  });

  let fy = doc.lastAutoTable.finalY + 4;
  doc.setFontSize(6).setFont(undefined, "normal");
  if (plantilla.leyendaTipo) { doc.text(plantilla.leyendaTipo, M, fy); fy += 3.5; }
  doc.text(plantilla.leyendaCalif, M, fy); fy += 3.5;
  if (registro.observaciones) { doc.text(`Observaciones: ${registro.observaciones}`, M, fy); fy += 5; }

  fy += 1;
  doc.setFontSize(5).setFont(undefined, "italic");
  plantilla.puntos.forEach((p, i) => {
    if (fy > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); fy = 15; }
    doc.text(`${i + 1}. ${p.label}`, M, fy); fy += 3;
  });

  dibujarFirmas(doc, plantilla, W, M, fy);
}

// ── PDF para patrón "matriz" (equipos en columnas, ítems en filas) — Anti-Caídas ──
function pdfMatriz(doc, plantilla, registro, W, M, y) {
  const items = Array.isArray(registro.filas) ? registro.filas : [];
  const fijas = plantilla.columnasFijas || null;
  const extra = plantilla.itemExtra || null;
  const equipos = registro.cabecera?.equipos || [];
  const ek = plantilla.equipoCampo?.key || "codigo";
  const grupos = plantilla.grupos || [{ titulo: null, items: plantilla.items || [] }];
  const byCodigo = Object.fromEntries(items.map(it => [it.codigo, it]));
  const nCols = fijas ? fijas.length : equipos.length;
  const dataCol0 = 2 + (extra ? 1 : 0);   // índice de la primera columna de datos

  const head = [[
    "Cód.", "Ítem",
    ...(extra ? [extra.label] : []),
    ...(fijas ? fijas : equipos.map((eq, i) => `${plantilla.equipoLabel} ${i + 1}\n${eq[ek] || ""}`)),
  ]];
  const body = [];
  const ncol = dataCol0 + nCols;
  grupos.forEach(g => {
    if (g.titulo) body.push([{ content: g.titulo, colSpan: ncol, styles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: "bold", halign: "left" } }]);
    g.items.forEach(it => {
      const r = byCodigo[it.c] || { vals: {} };
      body.push([
        it.c, it.desc ? `${it.n}\n${it.desc}` : it.n,
        ...(extra ? [r.cantidad ?? it.cantidad ?? ""] : []),
        ...Array.from({ length: nCols }, (_, eq) => (r.vals?.[eq] || "")),
      ]);
    });
  });

  const dataColStyles = {};
  const cellW = Math.min(fijas ? 12 : 22, (W - 2 * M - 90 - (extra ? 14 : 0)) / Math.max(nCols, 1));
  for (let i = 0; i < nCols; i++) dataColStyles[dataCol0 + i] = { cellWidth: cellW, halign: "center", fontStyle: "bold" };

  autoTable(doc, {
    startY: y, head, body, theme: "grid",
    styles: { fontSize: 5.5, cellPadding: 0.8, valign: "middle", lineWidth: 0.1, lineColor: [0, 0, 0] },
    headStyles: { fillColor: [0, 51, 102], textColor: 255, fontSize: 5.5, fontStyle: "bold", halign: "center" },
    columnStyles: { 0: { cellWidth: 10, halign: "center" }, 1: { cellWidth: extra ? 62 : 78, halign: "left" }, ...(extra ? { 2: { cellWidth: 14, halign: "center" } } : {}), ...dataColStyles },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index >= dataCol0) {
        const c = verdictPdfFill(data.cell.raw);
        if (c) { data.cell.styles.fillColor = c.fill; data.cell.styles.textColor = c.text; }
      }
    },
    margin: { left: M, right: M },
  });

  let fy = doc.lastAutoTable.finalY + 4;
  doc.setFontSize(6).setFont(undefined, "normal");
  doc.text(plantilla.leyendaCalif, M, fy); fy += 4;
  if (registro.observaciones) { doc.text(`Nota: ${registro.observaciones}`, M, fy); fy += 4; }

  dibujarFirmas(doc, plantilla, W, M, fy);
}

// ── PDF para patrón "secciones" (Vehículos, Herramientas) ──
function pdfSecciones(doc, plantilla, registro, W, M, y) {
  const items = Array.isArray(registro.filas) ? registro.filas : [];
  const byCodigo = Object.fromEntries(items.map(it => [it.codigo, it]));
  const cols = plantilla.columnas || SECCIONES_COLUMNAS_DEFAULT;
  const calLabel = plantilla.calLabel || "Clasif.";
  const ncol = 3 + cols.length;

  const head = [["Cód.", "Elemento inspeccionado", calLabel, ...cols.map(c => c.label)]];
  const body = [];
  plantilla.secciones.forEach(sec => {
    body.push([{ content: sec.titulo, colSpan: ncol, styles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: "bold", halign: "left" } }]);
    sec.items.forEach(it => {
      const r = byCodigo[it.c] || {};
      body.push([it.c, it.n, r.calificacion || "", ...cols.map(c => r[c.key] || "")]);
    });
  });

  autoTable(doc, {
    startY: y, head, body, theme: "grid",
    styles: { fontSize: 6, cellPadding: 1, valign: "middle", lineWidth: 0.1, lineColor: [0, 0, 0] },
    headStyles: { fillColor: [0, 51, 102], textColor: 255, fontSize: 6, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 64 },
      2: { cellWidth: 14, halign: "center", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 2) {
        const c = verdictPdfFill(data.cell.raw);
        if (c) { data.cell.styles.fillColor = c.fill; data.cell.styles.textColor = c.text; }
      }
    },
    margin: { left: M, right: M },
  });

  let fy = doc.lastAutoTable.finalY + 4;
  doc.setFontSize(6).setFont(undefined, "normal");
  doc.text(plantilla.leyendaCalif, M, fy); fy += 4;
  if (registro.observaciones) { doc.text(`Nota: ${registro.observaciones}`, M, fy); fy += 4; }

  dibujarFirmas(doc, plantilla, W, M, fy);
}
