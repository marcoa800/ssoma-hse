import { Component } from "react";

// Evita que un error de render (p. ej. un chunk lazy que no cargó tras un deploy)
// tumbe toda la app y deje al usuario en pantalla en blanco / lo mande al login.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, msg: "" };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, msg: error?.message || "" };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
          <div className="max-w-sm w-full text-center bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <div className="text-3xl mb-3">⚠️</div>
            <h2 className="text-white font-semibold mb-2">Ocurrió un problema</h2>
            <p className="text-gray-400 text-sm mb-5">No se pudo cargar esta sección. Suele resolverse recargando la página (no cierra tu sesión).</p>
            <button
              onClick={() => { try { window.name = ""; } catch (e) { /* noop */ } window.location.reload(); }}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors">
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
