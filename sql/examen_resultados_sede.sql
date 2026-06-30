-- Sede del trabajador al rendir el examen (la coloca manualmente en el portal público)
alter table public.examen_resultados add column if not exists sede text;
