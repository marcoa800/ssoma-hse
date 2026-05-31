export function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={`bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="text-base font-semibold text-white mb-4">{title}</div>
        {children}
      </div>
    </div>
  );
}
