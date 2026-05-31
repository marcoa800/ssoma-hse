export function KpiCard({ label, value, sub, accentColor = "blue" }) {
  const colors = { blue: "border-l-blue-500 text-blue-400", emerald: "border-l-emerald-500 text-emerald-400", green: "border-l-emerald-500 text-emerald-400", amber: "border-l-amber-500 text-amber-400", red: "border-l-red-500 text-red-400", purple: "border-l-purple-500 text-purple-400", gray: "border-l-gray-600 text-gray-500" };
  const c = (colors[accentColor] || colors.blue).split(" ");
  return (
    <div className={`bg-gray-900 border border-gray-800 border-l-4 ${c[0]} rounded-xl p-4`}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-3xl font-semibold tracking-tight ${c[1]}`}>{value}</div>
      <div className="text-xs text-gray-600 mt-1">{sub}</div>
    </div>
  );
}
