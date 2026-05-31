export function FormField({ label, children, confidential = false }) {
  return (
    <div className="mb-3">
      <label className="flex items-center gap-2 text-xs text-gray-400 mb-1.5">{label}{confidential && <span className="text-xs px-1.5 py-0.5 rounded bg-red-900/40 text-red-400 border border-red-800 font-mono">CONFIDENCIAL</span>}</label>
      {children}
    </div>
  );
}
