-- ============================================================
-- Programación EMO — columnas extra en emo_entregas
-- (datos que vienen del Excel de RRHH)
-- ============================================================
alter table public.emo_entregas
  add column if not exists fecha_examen  date,
  add column if not exists sede          text,
  add column if not exists tipo_examen   text,
  add column if not exists perfil        text,
  add column if not exists area          text,
  add column if not exists observaciones text,
  add column if not exists razon_social  text;
