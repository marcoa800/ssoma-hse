import { useState, useRef, useEffect } from "react";

// Dropdown de selección múltiple con checkboxes. `value` es un array; onChange recibe el nuevo array.
export function MultiSelect({ value = [], onChange, options = [], placeholder = "Todos", className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = (opt) => onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);
  const label = value.length === 0 ? placeholder : value.length === 1 ? value[0] : `${placeholder}: ${value.length}`;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-2 bg-gray-800 border rounded-lg px-3 py-2 text-sm transition-colors ${value.length ? "border-blue-600 text-white" : "border-gray-700 text-gray-400"} hover:border-gray-500`}>
        <span className="truncate text-left">{label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 min-w-full w-max max-w-[320px] max-h-64 overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1">
          {value.length > 0 && (
            <button type="button" onClick={() => onChange([])}
              className="w-full text-left px-3 py-1.5 text-[11px] text-blue-400 hover:text-blue-300 hover:bg-gray-800/60">✕ Limpiar selección</button>
          )}
          {options.length === 0 && <div className="px-3 py-2 text-xs text-gray-600">Sin opciones</div>}
          {options.map(opt => {
            const on = value.includes(opt);
            return (
              <button key={opt} type="button" onClick={() => toggle(opt)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-gray-800 transition-colors">
                <span className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center ${on ? "bg-blue-600 border-blue-600" : "border-gray-600"}`}>
                  {on && <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </span>
                <span className={`whitespace-normal break-words leading-snug ${on ? "text-white" : "text-gray-300"}`}>{opt}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
