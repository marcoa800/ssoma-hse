-- ════════════════════════════════════════════════════════════════════
--  CONTRATISTAS (DEMO) — TODO EL SQL PENDIENTE, en orden.
--  Ejecutar en el SQL Editor de ssoma-hse (ref: gzzkpcowolsfdmzitatq).
--  Idempotente: seguro de correr aunque ya se hayan aplicado partes.
--  Requisito previo: portal_contratistas.sql (tabla contratista_registros).
-- ════════════════════════════════════════════════════════════════════

-- 1) Revisión del cliente + firmas digitales (sobre contratista_registros)
alter table public.contratista_registros add column if not exists revision     text default 'Pendiente';
alter table public.contratista_registros add column if not exists revision_obs  text;
alter table public.contratista_registros add column if not exists revisado_por  text;
alter table public.contratista_registros add column if not exists revisado_at   timestamptz;
update public.contratista_registros set revision = 'Pendiente' where revision is null;
alter table public.contratista_registros add column if not exists firmas jsonb default '[]'::jsonb;

-- 2) Aplicabilidad de documentos por contratista (check "se subirá / no aplica")
alter table public.contratistas add column if not exists sctr_aplica        boolean default true;
alter table public.contratistas add column if not exists poliza_rc_aplica    boolean default true;
alter table public.contratistas add column if not exists poliza_vida_aplica  boolean default true;
alter table public.contratistas add column if not exists plan_sst_aplica     boolean default true;
alter table public.contratistas add column if not exists iper_aplica         boolean default true;

-- 3) Login del contratista: devuelve sus datos + fechas + aplicabilidad (para el panorama)
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

-- 4) Sistema de tareas (puntuales / periódicas)
create table if not exists public.contratista_tareas (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references public.empresas(id) on delete cascade,
  contratista_id uuid not null references public.contratistas(id) on delete cascade,
  grupo_id       uuid,
  titulo         text not null,
  descripcion    text,
  tipo           text not null default 'puntual' check (tipo in ('puntual','periodica')),
  frecuencia     text,
  ocurrencia     int  default 1,
  total          int  default 1,
  fecha_limite   date,
  estado         text not null default 'Pendiente' check (estado in ('Pendiente','En revisión','Cerrada','Rechazada')),
  evidencia_urls text[] default '{}',
  evidencia_nota text,
  resuelto_at    timestamptz,
  revision_obs   text,
  revisado_por   text,
  revisado_at    timestamptz,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create index if not exists idx_ct_empresa     on public.contratista_tareas(empresa_id);
create index if not exists idx_ct_contratista on public.contratista_tareas(contratista_id);
create index if not exists idx_ct_estado      on public.contratista_tareas(estado);

alter table public.contratista_tareas enable row level security;
drop policy if exists ct_auth_all on public.contratista_tareas;
create policy ct_auth_all on public.contratista_tareas for all to authenticated using (true) with check (true);
drop policy if exists ct_anon_select on public.contratista_tareas;
create policy ct_anon_select on public.contratista_tareas for select to anon using (true);
drop policy if exists ct_anon_update on public.contratista_tareas;
create policy ct_anon_update on public.contratista_tareas for update to anon using (true) with check (true);

-- Controlador de recurrencia
create or replace function public.generar_tareas_contratista(
  p_empresa uuid, p_contratista uuid, p_titulo text, p_descripcion text,
  p_tipo text, p_frecuencia text, p_veces int, p_fecha_base date
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_grupo uuid := gen_random_uuid();
  v_n int := greatest(1, coalesce(p_veces, 1));
  v_i int;
  v_step interval := case p_frecuencia
    when 'semanal'   then interval '7 days'
    when 'quincenal' then interval '15 days'
    when 'mensual'   then interval '1 month'
    else interval '1 month' end;
begin
  if p_tipo = 'periodica' then
    for v_i in 1..v_n loop
      insert into public.contratista_tareas
        (empresa_id, contratista_id, grupo_id, titulo, descripcion, tipo, frecuencia, ocurrencia, total, fecha_limite)
      values
        (p_empresa, p_contratista, v_grupo, p_titulo, p_descripcion, 'periodica', p_frecuencia, v_i, v_n,
         (coalesce(p_fecha_base, current_date) + v_step * (v_i - 1))::date);
    end loop;
    return v_n;
  else
    insert into public.contratista_tareas
      (empresa_id, contratista_id, grupo_id, titulo, descripcion, tipo, ocurrencia, total, fecha_limite)
    values
      (p_empresa, p_contratista, v_grupo, p_titulo, p_descripcion, 'puntual', 1, 1, p_fecha_base);
    return 1;
  end if;
end $$;
grant execute on function public.generar_tareas_contratista(uuid,uuid,text,text,text,text,int,date) to authenticated;

-- Scoring al vuelo
create or replace function public.contratista_scoring(p_contratista uuid)
returns table(score int, total int, cerradas int, pendientes int, en_revision int, rechazadas int, vencidas int)
language sql security definer set search_path = public as $$
  with t as (select * from public.contratista_tareas where contratista_id = p_contratista),
  m as (
    select
      count(*) filter (where estado = 'Cerrada') as cerr,
      count(*) filter (where estado in ('Pendiente','Rechazada') and fecha_limite < current_date) as venc,
      count(*) as tot,
      count(*) filter (where estado = 'Pendiente') as pend,
      count(*) filter (where estado = 'En revisión') as enrev,
      count(*) filter (where estado = 'Rechazada') as rech
    from t
  )
  select
    case when (cerr + venc) = 0 then null else round(100.0 * cerr / (cerr + venc))::int end,
    tot::int, cerr::int, pend::int, enrev::int, rech::int, venc::int
  from m;
$$;
grant execute on function public.contratista_scoring(uuid) to anon, authenticated;
