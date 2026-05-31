import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import { showToast } from '../../lib/toast.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Btn } from '../../components/ui/Btn.jsx';

export function ImportGuideModal({ onClose }) {
  const cols = [
    { col: "APELLIDO Y NOMBRE", desc: "Nombre completo del trabajador", ejemplo: "García López Juan", req: true },
    { col: "FECHA DE NACIMIENTO", desc: "Formato DD/MM/AAAA", ejemplo: "15/03/1990", req: false },
    { col: "DOC. DE IDENTIDAD", desc: "DNI — solo números, 8 dígitos", ejemplo: "12345678", req: true },
    { col: "PUESTO", desc: "Cargo o puesto de trabajo", ejemplo: "Operador de Planta", req: false },
    { col: "ULTIMA EMO", desc: "Fecha del último examen médico DD/MM/AAAA", ejemplo: "10/01/2025", req: false },
    { col: "DURACION DE EMO", desc: "Anual o Bianual", ejemplo: "Anual", req: false },
    { col: "ESTADO", desc: "Activo, Vacaciones o Inactivo", ejemplo: "Activo", req: false },
    { col: "APTITUD", desc: "Apto / Apto con restricción / No apto / No evaluado", ejemplo: "Apto", req: false },
    { col: "RESTRICCION", desc: "Detalle de restricción médica si aplica", ejemplo: "Restringir trabajo nocturno", req: false },
    { col: "LECTURA 2026", desc: "Fecha de lectura de resultados EMO DD/MM/AAAA", ejemplo: "20/01/2025", req: false },
    { col: "CELULAR", desc: "Número de celular (9 dígitos)", ejemplo: "999888777", req: false },
    { col: "EPP RECIBIDO", desc: "SI o NO", ejemplo: "SI", req: false },
    { col: "EPP DETALLE", desc: "Lista de EPP entregados", ejemplo: "Casco, guantes, lentes", req: false },
    { col: "EPP FECHA", desc: "Fecha de entrega de EPP DD/MM/AAAA", ejemplo: "05/01/2025", req: false },
  ];
  const downloadTemplate = () => {
    const headers = cols.map(c => c.col);
    const example = cols.map(c => c.ejemplo);
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws["!cols"] = headers.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "plantilla_sabana_personal.xlsx");
    showToast("Plantilla descargada", "success");
  };
  return (
    <Modal title="Guía de Importación — Sábana de Personal" onClose={onClose} wide>
      <div className="mb-4 px-3 py-2.5 rounded-lg bg-blue-900/20 border border-blue-900/40 text-xs text-blue-400">El archivo Excel o CSV debe tener exactamente estos encabezados. Las columnas con <span className="text-red-400">*</span> son obligatorias.</div>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-gray-800"><th className="text-left text-gray-500 font-medium py-2 pr-4">Columna</th><th className="text-left text-gray-500 font-medium py-2 pr-4">Descripción</th><th className="text-left text-gray-500 font-medium py-2">Ejemplo</th></tr></thead>
          <tbody>{cols.map(c => (<tr key={c.col} className="border-b border-gray-800/50"><td className="py-2 pr-4 font-mono text-blue-400 whitespace-nowrap">{c.col}{c.req && <span className="text-red-400 ml-1">*</span>}</td><td className="py-2 pr-4 text-gray-400">{c.desc}</td><td className="py-2 text-gray-600 font-mono">{c.ejemplo}</td></tr>))}</tbody>
        </table>
      </div>
      <div className="mb-4 px-3 py-2.5 rounded-lg bg-amber-900/20 border border-amber-900/40 text-xs text-amber-400"><strong>Nota:</strong> VIGENTE HASTA se calcula automáticamente desde ULTIMA EMO + DURACION. No es necesario incluirlo.</div>
      <div className="flex gap-2 justify-end">
        <Btn onClick={onClose}>Cerrar</Btn>
        <Btn variant="primary" onClick={downloadTemplate}><Download size={13} /> Descargar Plantilla</Btn>
      </div>
    </Modal>
  );
}
