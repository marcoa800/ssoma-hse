// Firma manuscrita digital (firma electrónica simple) + trazabilidad.
// Funciona offline: el firmante dibuja con el dedo/mouse en un canvas, se guarda
// como PNG (dataURL) junto con nombre, DNI, fecha/hora, dispositivo y GPS opcional.
//
// Objeto de firma:
//   { img, nombre, dni, fecha, dispositivo, geo: {lat,lng,acc}|null }
//
// Uso:
//   <BloqueFirmas roles={plantilla.firmas} value={cabecera.firmas}
//                 onChange={f => setCabecera(c => ({ ...c, firmas: f }))} />

import { useRef, useEffect, useState } from "react";
import { Eraser, MapPin, PenLine, Check } from "lucide-react";

function nowISO() { return new Date().toISOString(); }
function dispositivoActual() {
  try { return (navigator.userAgent || "").slice(0, 140); } catch { return ""; }
}

// ── Un panel de firma individual ──
export function FirmaPad({ rol, value, onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);
  const dibujado = useRef(false);
  const [nombre, setNombre] = useState(value?.nombre || "");
  const [dni, setDni] = useState(value?.dni || "");
  const [geo, setGeo] = useState(value?.geo || null);
  const [geoBusy, setGeoBusy] = useState(false);

  // Inicializa el canvas (resolución nítida) y restaura una firma previa.
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ratio = window.devicePixelRatio || 1;
    const w = cv.clientWidth || 320, h = cv.clientHeight || 120;
    cv.width = w * ratio; cv.height = h * ratio;
    const ctx = cv.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#0f172a";
    if (value?.img) {
      const im = new Image();
      im.onload = () => { ctx.drawImage(im, 0, 0, w, h); dibujado.current = true; };
      im.src = value.img;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pos = (e) => {
    const cv = canvasRef.current; const r = cv.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  };
  const start = (e) => { e.preventDefault(); drawing.current = true; last.current = pos(e); };
  const move = (e) => {
    if (!drawing.current) return; e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const p = pos(e);
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last.current = p; dibujado.current = true;
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    emit();
  };

  const limpiar = () => {
    const cv = canvasRef.current; const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, cv.width, cv.height);
    dibujado.current = false;
    onChange?.(null);
  };

  const capturarGeo = () => {
    if (!navigator.geolocation) return;
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { const g = { lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6), acc: Math.round(p.coords.accuracy) }; setGeo(g); setGeoBusy(false); emit(g); },
      () => { setGeoBusy(false); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Construye y emite el objeto de firma actual.
  const emit = (geoOverride) => {
    if (!dibujado.current) { onChange?.(null); return; }
    const img = canvasRef.current.toDataURL("image/png");
    onChange?.({ img, nombre: nombre.trim(), dni: dni.trim(), fecha: nowISO(), dispositivo: dispositivoActual(), geo: geoOverride !== undefined ? geoOverride : geo });
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-2"><PenLine size={12} /> {rol}</div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <input value={nombre} onChange={e => { setNombre(e.target.value); }} onBlur={() => emit()} placeholder="Nombre y apellidos"
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500" />
        <input value={dni} onChange={e => { setDni(e.target.value); }} onBlur={() => emit()} placeholder="DNI"
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500" />
      </div>
      <canvas ref={canvasRef}
        className="w-full h-[120px] bg-white rounded-lg border border-gray-700 touch-none cursor-crosshair"
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
      <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
        <button type="button" onClick={limpiar} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-400"><Eraser size={12} /> Limpiar</button>
        <button type="button" onClick={capturarGeo} disabled={geoBusy}
          className={`flex items-center gap-1 text-[11px] ${geo ? "text-emerald-400" : "text-gray-400 hover:text-blue-400"}`}>
          {geo ? <Check size={12} /> : <MapPin size={12} />} {geoBusy ? "Ubicando…" : geo ? `Ubicación ✓` : "Capturar ubicación"}
        </button>
      </div>
      <p className="text-[10px] text-gray-600 mt-1">Firma con el dedo o el mouse. Se registra fecha, hora y dispositivo automáticamente.</p>
    </div>
  );
}

// ── Bloque con todas las firmas (una por rol) ──
export function BloqueFirmas({ roles = [], value = {}, onChange, titulo = "Firmas" }) {
  if (!roles.length) return null;
  const set = (i, firma) => {
    const next = { ...(value || {}) };
    if (firma) next[i] = firma; else delete next[i];
    onChange?.(next);
  };
  return (
    <div className="mb-4">
      <div className="text-xs text-gray-500 mb-2">{titulo}</div>
      <div className="grid sm:grid-cols-2 gap-3">
        {roles.map((r, i) => (
          <FirmaPad key={i} rol={typeof r === "string" ? r : r.rol} value={(value || {})[i]} onChange={(f) => set(i, f)} />
        ))}
      </div>
    </div>
  );
}
