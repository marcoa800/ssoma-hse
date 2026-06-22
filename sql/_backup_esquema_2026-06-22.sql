-- ============================================================================
-- PUNTO DE RESTAURACIÓN — ESQUEMA (cambios de esta sesión)  ·  22 jun 2026
-- App: SSOMA HSE (Medicloud Safety)
-- Idempotente: se puede correr varias veces sin error.
-- NOTA: NO recrea las tablas base preexistentes (empresas, profiles, trabajadores,
--       capacitaciones, documentos, kpis, racs, accidentes, etc.). Solo cubre lo
--       agregado/modificado en esta sesión. Para un respaldo TOTAL usa pg_dump
--       (ver instrucciones al final del archivo).
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1) ROLES — el CHECK de profiles.rol debe incluir ADMINISTRATIVO
-- ----------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_rol_check;
alter table public.profiles add constraint profiles_rol_check
  check (rol in ('SEGURIDAD','MEDICO','ADMINISTRATIVO','ADMIN','SUPERADMIN'));

-- ----------------------------------------------------------------------------
-- 2) DESCANSOS MÉDICOS — columnas nuevas
-- ----------------------------------------------------------------------------
alter table public.vigilancia_descansos
  add column if not exists dni       text,
  add column if not exists atencion  text,
  add column if not exists control_1 date,
  add column if not exists control_2 date;

-- ----------------------------------------------------------------------------
-- 3) USUARIOS EN VARIAS EMPRESAS
-- ----------------------------------------------------------------------------
create table if not exists public.profile_empresas (
  profile_id uuid references public.profiles(id) on delete cascade,
  empresa_id uuid references public.empresas(id) on delete cascade,
  primary key (profile_id, empresa_id)
);
alter table public.profile_empresas enable row level security;

drop policy if exists "pe own read" on public.profile_empresas;
create policy "pe own read" on public.profile_empresas
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists "pe superadmin all" on public.profile_empresas;
create policy "pe superadmin all" on public.profile_empresas
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'SUPERADMIN'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'SUPERADMIN'));

create or replace function public.cambiar_empresa_activa(p_empresa_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.profile_empresas where profile_id = auth.uid() and empresa_id = p_empresa_id)
     or exists (select 1 from public.profiles where id = auth.uid() and rol = 'SUPERADMIN') then
    update public.profiles set empresa_id = p_empresa_id where id = auth.uid();
    return true;
  end if;
  return false;
end;
$$;
grant execute on function public.cambiar_empresa_activa(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 4) ENTREGA Y FIRMA DE EMO (+ programación RRHH)
-- ----------------------------------------------------------------------------
create table if not exists public.emo_entregas (
  id                        uuid primary key default gen_random_uuid(),
  empresa_id                uuid references public.empresas(id) on delete set null,
  trabajador_dni            text not null,
  trabajador_nombre         text,
  token_acceso              uuid not null unique default gen_random_uuid(),
  audio_url                 text,
  pdf_url                   text,
  estado                    text not null default 'pendiente' check (estado in ('pendiente','completado')),
  firma_base64              text,
  firma_responsable_base64  text,
  fecha_firma               timestamptz,
  fecha_firma_responsable   timestamptz,
  created_at                timestamptz default now(),
  -- columnas de programación (Excel de RRHH)
  fecha_examen  date,
  sede          text,
  tipo_examen   text,
  perfil        text,
  area          text,
  observaciones text,
  razon_social  text
);
-- por si la tabla ya existía sin las columnas de programación:
alter table public.emo_entregas
  add column if not exists fecha_examen  date,
  add column if not exists sede          text,
  add column if not exists tipo_examen   text,
  add column if not exists perfil        text,
  add column if not exists area          text,
  add column if not exists observaciones text,
  add column if not exists razon_social  text;

alter table public.emo_entregas enable row level security;

drop policy if exists "emo internos all" on public.emo_entregas;
create policy "emo internos all" on public.emo_entregas
  for all to authenticated using (true) with check (true);

create or replace function public.emo_get(p_token uuid)
returns table (trabajador_nombre text, estado text)
language sql security definer set search_path = public as $$
  select trabajador_nombre, estado from public.emo_entregas where token_acceso = p_token;
$$;

create or replace function public.emo_validar(p_token uuid, p_dni text)
returns table (ok boolean, audio_url text, pdf_url text, estado text, trabajador_nombre text)
language sql security definer set search_path = public as $$
  select true, e.audio_url,
         case when e.estado = 'completado' then e.pdf_url else null end,
         e.estado, e.trabajador_nombre
  from public.emo_entregas e
  where e.token_acceso = p_token and e.trabajador_dni = p_dni;
$$;

create or replace function public.emo_firmar(p_token uuid, p_dni text, p_firma text)
returns table (ok boolean, pdf_url text)
language plpgsql security definer set search_path = public as $$
declare v_pdf text;
begin
  update public.emo_entregas
     set firma_base64 = p_firma, fecha_firma = now(), estado = 'completado'
   where token_acceso = p_token and trabajador_dni = p_dni and estado = 'pendiente'
   returning pdf_url into v_pdf;
  if not found then return query select false, null::text;
  else return query select true, v_pdf; end if;
end;
$$;

grant execute on function public.emo_get(uuid)                to anon;
grant execute on function public.emo_validar(uuid, text)      to anon;
grant execute on function public.emo_firmar(uuid, text, text) to anon;

-- ----------------------------------------------------------------------------
-- 5) STORAGE para EMO  (crear ANTES los buckets privados: emo-audios, emo-pdfs)
-- ----------------------------------------------------------------------------
drop policy if exists "anon signed emo-audios" on storage.objects;
create policy "anon signed emo-audios" on storage.objects for select to anon using (bucket_id = 'emo-audios');

drop policy if exists "anon signed emo-pdfs" on storage.objects;
create policy "anon signed emo-pdfs" on storage.objects for select to anon using (bucket_id = 'emo-pdfs');

drop policy if exists "auth manage emo-audios" on storage.objects;
create policy "auth manage emo-audios" on storage.objects for all to authenticated using (bucket_id = 'emo-audios') with check (bucket_id = 'emo-audios');

drop policy if exists "auth manage emo-pdfs" on storage.objects;
create policy "auth manage emo-pdfs" on storage.objects for all to authenticated using (bucket_id = 'emo-pdfs') with check (bucket_id = 'emo-pdfs');

-- ============================================================================
-- RESPALDO TOTAL DEL ESQUEMA (recomendado) — correr en tu terminal, NO aquí:
--
--   pg_dump --schema-only --no-owner --no-privileges \
--     "postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres" \
--     > backup_esquema_completo.sql
--
--   pg_dump --data-only --no-owner \
--     "postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres" \
--     > backup_datos.sql
--
-- (La cadena de conexión está en Supabase → Settings → Database → Connection string)
-- O usa Supabase → Database → Backups para respaldos automáticos.
-- ============================================================================
