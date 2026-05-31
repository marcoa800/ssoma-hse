export function Input({ className, ...props }) {
  return <input className={`${className || "w-full"} bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors`} {...props} />;
}
