-- ============================================================
--  Portal de Contratistas — Flujo de revisión/aprobación + firmas + panorama
--  Ejecutar en el SQL Editor de ssoma-hse (ref: gzzkpcowolsfdmzitatq).
-- ============================================================

-- 1) Campos de revisión del cliente (Aprobado / Observado / Rechazado)
alter table public.contratista_registros add column if not exists revision      text default 'Pendiente';
alter table public.contratista_registros add column if not exists revision_obs   text;
alter table public.contratista_registros add column if not exists revisado_por   text;
alter table public.contratista_registros add column if not exists revisado_at    timestamptz;
update public.contratista_registros set revision = 'Pendiente' where revision is null;

-- 2) Firmas digitales que recoge el portal al registrar (arregla el error "firmas column not found")
alter table public.contratista_registros add column if not exists firmas jsonb default '[]'::jsonb;

-- 3) Login del contratista: devolver también sus datos para el panorama del portal
--    (se elimina primero porque cambia el tipo de retorno)
drop function if exists public.login_contratista(uuid, text, text);
create or replace function public.login_contratista(p_empresa uuid, p_ruc text, p_codigo text)
returns table(
  id uuid, nombre text, ruc text, rubro text, representante text, telefono text, email text, estado text,
  sctr_empresa_venc date, poliza_rc_venc date, poliza_vida_venc date, plan_sst_venc date, iper_venc date
)
language sql security definer set search_path = public as $$
  select c.id, c.nombre, c.ruc, c.rubro, c.representante, c.telefono, c.email, c.estado,
         c.sctr_empresa_venc, c.poliza_rc_venc, c.poliza_vida_venc, c.plan_sst_venc, c.iper_venc
  from public.contratistas c
  where c.empresa_id = p_empresa
    and replace(trim(c.ruc), ' ', '') = replace(trim(p_ruc), ' ', '')
    and coalesce(c.codigo_acceso,'') = trim(p_codigo)
  limit 1;
$$;
grant execute on function public.login_contratista(uuid, text, text) to anon;
