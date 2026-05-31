export function ProgressBar({ value, color = "blue", height = "h-1.5" }) {
  const colors = { blue: "bg-blue-500", emerald: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500", purple: "bg-purple-500" };
  return <div className={`w-full bg-gray-800 rounded-full ${height} overflow-hidden`}><div className={`${height} rounded-full transition-all duration-500 ${colors[color]}`} style={{ width: `${Math.min(value, 100)}%` }} /></div>;
}
