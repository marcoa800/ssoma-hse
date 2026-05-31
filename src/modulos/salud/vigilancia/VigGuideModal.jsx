import { Modal } from '../../../components/ui/Modal.jsx';
import { Btn } from '../../../components/ui/Btn.jsx';

export function VigGuideModal({ titulo, campos, onClose }) {
  return (
    <Modal title={`Guía de campos — ${titulo}`} onClose={onClose} wide>
      <div className="mb-4 px-3 py-2.5 rounded-lg bg-blue-900/20 border border-blue-900/40 text-xs text-blue-400">
        Referencia de todos los campos disponibles en este programa. Los marcados con <span className="text-red-400">*</span> son obligatorios para guardar el registro.
      </div>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-500 font-medium py-2 pr-4">Campo</th>
              <th className="text-left text-gray-500 font-medium py-2 pr-4">Descripción</th>
              <th className="text-left text-gray-500 font-medium py-2">Ejemplo / Valores</th>
            </tr>
          </thead>
          <tbody>
            {campos.map(c => (
              <tr key={c.campo} className="border-b border-gray-800/50">
                <td className="py-2 pr-4 font-mono text-blue-400 whitespace-nowrap">
                  {c.campo}{c.req && <span className="text-red-400 ml-1">*</span>}
                </td>
                <td className="py-2 pr-4 text-gray-400">{c.desc}</td>
                <td className="py-2 text-gray-600 font-mono text-xs">{c.ejemplo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <Btn onClick={onClose}>Cerrar</Btn>
      </div>
    </Modal>
  );
}
