export function Select({ children, ...props }) {
  return <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" {...props}>{children}</select>;
}
