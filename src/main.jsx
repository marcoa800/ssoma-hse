import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'

// Tras un deploy nuevo, los chunks viejos cacheados pueden 404ear al navegar a un
// módulo lazy. Vite emite 'vite:preloadError'. Recargamos UNA sola vez para tomar
// el index.html nuevo. El guard usa window.name (sobrevive la recarga en la misma
// pestaña SIN depender de localStorage/sessionStorage, que pueden estar bloqueados
// y provocar un bucle de recargas).
const RELOAD_FLAG = 'mc_reloaded'
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault?.()
  if (window.name === RELOAD_FLAG) return // ya reintentamos: que lo capture el ErrorBoundary
  window.name = RELOAD_FLAG
  window.location.reload()
})
// Si la app cargó bien, limpiamos la marca para permitir futuras recuperaciones.
window.addEventListener('load', () => {
  setTimeout(() => { if (window.name === RELOAD_FLAG) window.name = '' }, 4000)
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
