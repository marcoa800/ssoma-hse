-- ============================================================
--  Contratistas — Aplicabilidad de documentos de empresa
--  Cada contratista puede indicar si un documento aplica (se subirá) o no.
--  Ejecutar en el SQL Editor de ssoma-hse (ref: gzzkpcowolsfdmzitatq).
-- ============================================================
alter table public.contratistas add column if not exists sctr_aplica        boolean default true;
alter table public.contratistas add column if not exists poliza_rc_aplica    boolean default true;
alter table public.contratistas add column if not exists poliza_vida_aplica  boolean default true;
alter table public.contratistas add column if not exists plan_sst_aplica     boolean default true;
alter table public.contratistas add column if not exists iper_aplica         boolean default true;

-- Login del contratista: incluir también los flags de aplicabilidad (para el panorama)
drop function if exists public.login_contratista(uuid, text, text);
create function public.login_contratista(p_empresa uuid, p_ruc text, p_codigo text)
returns table(
  id uuid, nombre text, ruc text, rubro text, representante text, telefono text, email text, estado text,
  sctr_empresa_venc date, poliza_rc_venc date, poliza_vida_venc date, plan_sst_venc date, iper_venc date,
  sctr_aplica boolean, poliza_rc_aplica boolean, poliza_vida_aplica boolean, plan_sst_aplica boolean, iper_aplica boolean
)
language sql security definer set search_path = public as $$
  select c.id, c.nombre, c.ruc, c.rubro, c.representante, c.telefono, c.email, c.estado,
         c.sctr_empresa_venc, c.poliza_rc_venc, c.poliza_vida_venc, c.plan_sst_venc, c.iper_venc,
         coalesce(c.sctr_aplica,true), coalesce(c.poliza_rc_aplica,true), coalesce(c.poliza_vida_aplica,true),
         coalesce(c.plan_sst_aplica,true), coalesce(c.iper_aplica,true)
  from public.contratistas c
  where c.empresa_id = p_empresa
    and replace(trim(c.ruc), ' ', '') = replace(trim(p_ruc), ' ', '')
    and coalesce(c.codigo_acceso,'') = trim(p_codigo)
  limit 1;
$$;
grant execute on function public.login_contratista(uuid, text, text) to anon;
