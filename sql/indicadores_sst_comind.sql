-- ════════════════════════════════════════════════════════════════════
--  TABLA: indicadores_sst_comind
--  Estadística de SST mensual — Comindustria
--  Ejecutar en Supabase SQL Editor.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS indicadores_sst_comind (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  anio INT NOT NULL,
  mes INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  area TEXT NOT NULL CHECK (area IN ('ADMINISTRATIVO','PRODUCCION')),
  trabajadores INT NOT NULL DEFAULT 0,
  hh_trabajadas NUMERIC(14,2) NOT NULL DEFAULT 0,
  hh_capacitacion NUMERIC(14,2) NOT NULL DEFAULT 0,
  acc_leve INT NOT NULL DEFAULT 0,
  acc_incapacitante INT NOT NULL DEFAULT 0,
  acc_fatal INT NOT NULL DEFAULT 0,
  dias_perdidos NUMERIC(10,2) NOT NULL DEFAULT 0,
  dias_cargados NUMERIC(10,2) NOT NULL DEFAULT 0,
  inc_peligrosos INT NOT NULL DEFAULT 0,
  inc_leve INT NOT NULL DEFAULT 0,
  enf_ocupacional INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, anio, mes, area)
);

CREATE INDEX IF NOT EXISTS idx_ind_sst_empresa ON indicadores_sst_comind(empresa_id);

ALTER TABLE indicadores_sst_comind ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ind_sst_select" ON indicadores_sst_comind FOR SELECT USING (empresa_id = get_my_empresa_id());
CREATE POLICY "ind_sst_insert" ON indicadores_sst_comind FOR INSERT WITH CHECK (empresa_id = get_my_empresa_id());
CREATE POLICY "ind_sst_update" ON indicadores_sst_comind FOR UPDATE USING (empresa_id = get_my_empresa_id());
CREATE POLICY "ind_sst_delete" ON indicadores_sst_comind FOR DELETE USING (empresa_id = get_my_empresa_id());
