export function Btn({ children, variant = "default", size = "md", disabled, onClick, className = "" }) {
  const base = "inline-flex items-center gap-1.5 font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" };
  const variants = { default: "bg-transparent border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white", ghost: "bg-transparent border border-gray-700/50 text-gray-500 hover:bg-gray-800 hover:text-gray-300", primary: "bg-blue-600 text-white hover:bg-blue-500 border border-transparent", danger: "bg-red-900/40 text-red-400 border border-red-800 hover:bg-red-900", success: "bg-emerald-900/40 text-emerald-400 border border-emerald-800 hover:bg-emerald-900" };
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} disabled={disabled} onClick={onClick}>{children}</button>;
}
