import * as XLSX from "xlsx";
import { Download } from "lucide-react";
import { showToast } from "../../lib/toast.jsx";
import { Btn } from "./Btn.jsx";

export function ExportBtn({ data, filename, cols }) {
  const handle = () => {
    if (!data || !data.length) { showToast("Sin datos para exportar", "info"); return; }
    const rows = cols
      ? data.map(r => { const obj = {}; cols.forEach(([key, label]) => { obj[label] = r[key] ?? ""; }); return obj; })
      : data;
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Datos");
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast("Excel exportado correctamente", "success");
  };
  return <Btn size="sm" variant="default" onClick={handle}><Download size={13} /> Exportar Excel</Btn>;
}
