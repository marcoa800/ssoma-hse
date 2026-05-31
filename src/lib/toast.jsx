import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Info } from "lucide-react";

let toastQueue = [];
let toastSetter = null;

export function showToast(msg, type = "info") {
  const id = Date.now();
  toastQueue = [...toastQueue, { id, msg, type }];
  if (toastSetter) toastSetter([...toastQueue]);
  setTimeout(() => {
    toastQueue = toastQueue.filter((t) => t.id !== id);
    if (toastSetter) toastSetter([...toastQueue]);
  }, 3500);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => { toastSetter = setToasts; }, []);
  const icons = { success: <CheckCircle size={15} />, error: <XCircle size={15} />, info: <Info size={15} /> };
  const colors = { success: "bg-emerald-900 border-emerald-500 text-emerald-300", error: "bg-red-900 border-red-500 text-red-300", info: "bg-blue-900 border-blue-500 text-blue-300" };
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium pointer-events-auto ${colors[t.type]}`}>
          {icons[t.type]} {t.msg}
        </div>
      ))}
    </div>
  );
}
