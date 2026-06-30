-- ════════════════════════════════════════════════════════════════════
--  Cumplimiento del checklist MINTRA (Anexo 3, RM 050-2013-TR) por empresa
--  Solo se guardan las marcas MANUALES (override). Lo automático se calcula
--  en vivo con los registros de la app.
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS mintra_cumplimiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,                       -- p.ej. "3.5"
  estado TEXT NOT NULL DEFAULT 'cumple',       -- cumple | parcial | no_cumple
  evidencia_url TEXT,
  observacion TEXT,
  responsable TEXT,
  actualizado TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_mintra_empresa ON mintra_cumplimiento(empresa_id);

ALTER TABLE mintra_cumplimiento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mintra_select" ON mintra_cumplimiento FOR SELECT USING (empresa_id = get_my_empresa_id());
CREATE POLICY "mintra_insert" ON mintra_cumplimiento FOR INSERT WITH CHECK (empresa_id = get_my_empresa_id());
CREATE POLICY "mintra_update" ON mintra_cumplimiento FOR UPDATE USING (empresa_id = get_my_empresa_id());
CREATE POLICY "mintra_delete" ON mintra_cumplimiento FOR DELETE USING (empresa_id = get_my_empresa_id());
