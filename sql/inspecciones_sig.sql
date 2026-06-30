-- Inspecciones SIG (Multisel): registros llenados desde plantillas en la app
CREATE TABLE IF NOT EXISTS inspecciones_sig (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  plantilla TEXT NOT NULL,          -- 'orden_limpieza'
  codigo TEXT, version TEXT,
  fecha DATE, responsable TEXT, area TEXT, hora_inicio TEXT, hora_final TEXT,
  datos JSONB NOT NULL DEFAULT '{}',  -- { itemId: { e:'si'|'no'|'na', obs, acc } }
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_insp_sig_emp ON inspecciones_sig(empresa_id);
ALTER TABLE inspecciones_sig ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insp_sig_all" ON inspecciones_sig;
CREATE POLICY "insp_sig_all" ON inspecciones_sig FOR ALL USING (empresa_id = get_my_empresa_id()) WITH CHECK (empresa_id = get_my_empresa_id());
