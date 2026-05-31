export function Badge({ children, color = "gray" }) {
  const colors = { green: "bg-emerald-900/60 text-emerald-400 border border-emerald-700", amber: "bg-amber-900/60 text-amber-400 border border-amber-700", red: "bg-red-900/60 text-red-400 border border-red-700", blue: "bg-blue-900/60 text-blue-400 border border-blue-700", gray: "bg-gray-800 text-gray-400 border border-gray-700", purple: "bg-purple-900/60 text-purple-400 border border-purple-700", orange: "bg-orange-900/60 text-orange-400 border border-orange-700" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>{children}</span>;
}
