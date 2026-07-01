-- ============================================================
--  Vigilancia Estilos de Vida — frecuencia cardíaca en signos vitales
--  Ejecutar en el SQL Editor de ssoma-hse (ref: gzzkpcowolsfdmzitatq).
-- ============================================================
alter table public.vigilancia_estilos_vida add column if not exists frecuencia_cardiaca int;
