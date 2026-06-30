-- ════════════════════════════════════════════════════════════════════
--  Inventario / catálogo de medicamentos (base del futuro kárdex)
--  Por empresa. El tópico elige de aquí; el kárdex descontará por cantidad.
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS medicamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  presentacion TEXT,                 -- Tableta, Jarabe, Ampolla, Crema...
  concentracion TEXT,                -- 500mg, 250mg/5ml...
  unidad TEXT NOT NULL DEFAULT 'unidad',  -- unidad, caja, frasco, blíster...
  stock NUMERIC NOT NULL DEFAULT 0,
  stock_minimo NUMERIC NOT NULL DEFAULT 0,
  lote TEXT,
  fecha_vencimiento DATE,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_medicamentos_empresa ON medicamentos(empresa_id);

ALTER TABLE medicamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medicamentos_select" ON medicamentos FOR SELECT USING (empresa_id = get_my_empresa_id());
CREATE POLICY "medicamentos_insert" ON medicamentos FOR INSERT WITH CHECK (empresa_id = get_my_empresa_id());
CREATE POLICY "medicamentos_update" ON medicamentos FOR UPDATE USING (empresa_id = get_my_empresa_id());
CREATE POLICY "medicamentos_delete" ON medicamentos FOR DELETE USING (empresa_id = get_my_empresa_id());
