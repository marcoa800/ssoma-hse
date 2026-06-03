-- ════════════════════════════════════════════════════════════════════
--  Extensión tabla monitoreo_agentes para Comindustria
--  Agrega columnas para puntos de medición, recomendaciones y plazo.
--  Ejecutar en Supabase SQL Editor.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE monitoreo_agentes
  ADD COLUMN IF NOT EXISTS puntos             JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS recomendaciones    TEXT,
  ADD COLUMN IF NOT EXISTS estado_general     TEXT    DEFAULT 'Pendiente revisión',
  ADD COLUMN IF NOT EXISTS plazo_accion       DATE,
  ADD COLUMN IF NOT EXISTS responsable_accion TEXT;
