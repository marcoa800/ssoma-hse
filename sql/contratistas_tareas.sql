-- ============================================================
--  Contratistas — Sistema de tareas (puntuales y periódicas) + scoring
--  Ejecutar en el SQL Editor de ssoma-hse (ref: gzzkpcowolsfdmzitatq).
--
--  Diseño: se PRE-GENERAN las filas de cada ocurrencia (una fila por
--  iteración con su propia fecha límite/estado/evidencia). Un grupo_id
--  enlaza las iteraciones de una misma tarea periódica. No requiere cron.
-- ============================================================

-- 1) Tabla de tareas
create table if not exists public.contratista_tareas (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references public.empresas(id) on delete cascade,
  contratista_id uuid not null references public.contratistas(id) on delete cascade,
  grupo_id       uuid,                                   -- enlaza iteraciones de una tarea periódica
  titulo         text not null,
  descripcion    text,
  tipo           text not null default 'puntual' check (tipo in ('puntual','periodica')),
  frecuencia     text,                                    -- 'semanal' | 'quincenal' | 'mensual' | null
  ocurrencia     int  default 1,                          -- 1..total
  total          int  default 1,
  fecha_limite   date,
  estado         text not null default 'Pendiente' check (estado in ('Pendiente','En revisión','Cerrada','Rechazada')),
  evidencia_urls text[] default '{}',
  evidencia_nota text,
  resuelto_at    timestamptz,                             -- cuando el contratista marca "Resolver"
  revision_obs   text,                                    -- comentario de SSOMA al rechazar
  revisado_por   text,
  revisado_at    timestamptz,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create index if not exists idx_ct_empresa     on public.contratista_tareas(empresa_id);
create index if not exists idx_ct_contratista on public.contratista_tareas(contratista_id);
create index if not exists idx_ct_estado      on public.contratista_tareas(estado);

-- 2) RLS
alter table public.contratista_tareas enable row level security;

-- SSOMA (usuarios autenticados): gestión total dentro de su empresa
drop policy if exists ct_auth_all on public.contratista_tareas;
create policy ct_auth_all on public.contratista_tareas
  for all to authenticated using (true) with check (true);

-- Portal público (anon): solo ver y actualizar (subir evidencia / marcar en revisión). No crea ni borra.
drop policy if exists ct_anon_select on public.contratista_tareas;
create policy ct_anon_select on public.contratista_tareas for select to anon using (true);
drop policy if exists ct_anon_update on public.contratista_tareas;
create policy ct_anon_update on public.contratista_tareas for update to anon using (true) with check (true);

-- 3) Controlador de recurrencia: genera 1 fila (puntual) o N iteraciones (periódica)
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

-- 4) Scoring al vuelo (0-100): % de cumplimiento sobre lo exigible
--    exigible = cerradas + (pendientes/rechazadas ya vencidas). Lo aún no vencido no penaliza.
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
