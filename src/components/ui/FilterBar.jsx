import { Filter } from "lucide-react";

export function FilterBar({ dateFrom, dateTo, onDateFrom, onDateTo, area = "", onArea, areaOptions = [], areaLabel = "Área", sort, onSort }) {
  const hasFilter = dateFrom || dateTo || area;
  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap p-3 bg-gray-900/50 border border-gray-800 rounded-xl">
      <Filter size={12} className="text-gray-500 shrink-0" />
      <span className="text-xs text-gray-500 shrink-0">Período:</span>
      <input type="date" value={dateFrom} onChange={e => onDateFrom(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500" />
      <span className="text-xs text-gray-600">—</span>
      <input type="date" value={dateTo} onChange={e => onDateTo(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500" />
      {onSort && (
        <>
          <span className="text-xs text-gray-600 ml-2">Orden:</span>
          <select value={sort} onChange={e => onSort(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500">
            <option value="fecha">Fecha reciente</option>
            <option value="az">Nombre A-Z</option>
            <option value="za">Nombre Z-A</option>
          </select>
        </>
      )}
      {areaOptions.length > 0 && (
        <>
          <span className="text-xs text-gray-600 ml-2">{areaLabel}:</span>
          <select value={area} onChange={e => onArea(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500">
            <option value="">Todas</option>
            {areaOptions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </>
      )}
      {hasFilter && (
        <button onClick={() => { onDateFrom(""); onDateTo(""); if (onArea) onArea(""); }} className="text-xs text-blue-400 hover:text-blue-300 ml-1">✕ Limpiar</button>
      )}
    </div>
  );
}
