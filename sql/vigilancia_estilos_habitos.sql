-- ============================================================
--  Vigilancia Estilos de Vida — hábitos detallados + FC
--  Ejecutar en el SQL Editor de ssoma-hse (ref: gzzkpcowolsfdmzitatq).
--  Idempotente.
-- ============================================================
alter table public.vigilancia_estilos_vida add column if not exists frecuencia_cardiaca   int;
alter table public.vigilancia_estilos_vida add column if not exists tabaco_frecuencia     text;  -- Diario / Ocasional / Social / Ex-fumador
alter table public.vigilancia_estilos_vida add column if not exists tabaco_cantidad       text;  -- cigarrillos por día
alter table public.vigilancia_estilos_vida add column if not exists alcohol_tipo          text;  -- Cerveza / Vino / Licores / Mixto
alter table public.vigilancia_estilos_vida add column if not exists alcohol_frecuencia    text;  -- Diario / Semanal / Quincenal / Ocasional / Social
alter table public.vigilancia_estilos_vida add column if not exists actividad_frecuencia  text;  -- veces por semana
