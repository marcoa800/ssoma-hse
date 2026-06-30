import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ── Permiso de borrado por perfil ──
// El perfil PREVENCIONISTA puede crear/editar pero NO eliminar. Se usa SOLO en la
// UI para ocultar los botones de eliminar. Las ediciones que internamente usan
// delete+insert (p. ej. guardar un examen) NO se ven afectadas.
let _puedeEliminar = true
export function setPuedeEliminar(v) { _puedeEliminar = v }
export function puedeEliminar() { return _puedeEliminar }
