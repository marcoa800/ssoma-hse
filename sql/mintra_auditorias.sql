-- Historial de auditorías MINTRA: "fotos" del cumplimiento por fecha para ver la evolución
CREATE TABLE IF NOT EXISTS mintra_auditorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  pct_global INT NOT NULL DEFAULT 0,
  cumplidos INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  detalle JSONB NOT NULL DEFAULT '{}',     -- { "I": 80, "II": 75, ... } % por lineamiento
  responsable TEXT,
  observacion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mintra_aud_empresa ON mintra_auditorias(empresa_id);
ALTER TABLE mintra_auditorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mintra_aud_select" ON mintra_auditorias FOR SELECT USING (empresa_id = get_my_empresa_id());
CREATE POLICY "mintra_aud_insert" ON mintra_auditorias FOR INSERT WITH CHECK (empresa_id = get_my_empresa_id());
CREATE POLICY "mintra_aud_delete" ON mintra_auditorias FOR DELETE USING (empresa_id = get_my_empresa_id());
