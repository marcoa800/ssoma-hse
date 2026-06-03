-- ════════════════════════════════════════════════════════════════════
--  CRON: Alertas EMO Comindustria — disparo diario automático
--  Ejecutar en Supabase SQL Editor DESPUÉS de desplegar la Edge Function.
--  Hora: 9:00 AM Lima (UTC-5) = 14:00 UTC
-- ════════════════════════════════════════════════════════════════════

-- Habilitar extensiones (ya vienen activadas en Supabase por defecto)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Programar la alerta diaria a las 9:00 AM hora Lima
-- Para cambiar la hora: modificar '0 14 * * *'
--   formato: 'minuto hora * * *'  (hora en UTC)
--   Ejemplos: 9am Lima = '0 14' | 8am Lima = '0 13' | 7am Lima = '0 12'
select cron.schedule(
  'alertas-emo-comindustria',          -- nombre del job (único)
  '0 14 * * *',                        -- 14:00 UTC = 9:00 AM Lima (UTC-5)
  $$
  select
    net.http_post(
      url     := 'https://gzzkpcowolsfdmzitatq.supabase.co/functions/v1/alertas-emo',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6emtwY293b2xzZmRteml0YXRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MzAwMjQsImV4cCI6MjA5MzAwNjAyNH0.dnvsbQ6i--55Gr8knvxMmqfW9s6rN5iRR13JEOVxoNY'
      ),
      body    := '{}'::jsonb
    ) as request_id;
  $$
);

-- Para verificar que el cron quedó registrado:
-- select * from cron.job;

-- Para eliminar el cron si necesitas rehacerlo:
-- select cron.unschedule('alertas-emo-comindustria');

-- Para dispararlo manualmente y probar ahora mismo:
-- select net.http_post(
--   url     := 'https://gzzkpcowolsfdmzitatq.supabase.co/functions/v1/alertas-emo',
--   headers := jsonb_build_object(
--     'Content-Type',  'application/json',
--     'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6emtwY293b2xzZmRteml0YXRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MzAwMjQsImV4cCI6MjA5MzAwNjAyNH0.dnvsbQ6i--55Gr8knvxMmqfW9s6rN5iRR13JEOVxoNY'
--   ),
--   body    := '{}'::jsonb
-- );
