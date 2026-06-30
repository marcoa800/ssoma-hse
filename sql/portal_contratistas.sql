-- ============================================================
--  Portal público de Contratistas (importado de CTG Latam)
--  Ejecutar UNA vez en el SQL Editor del proyecto ssoma-hse
--  (Supabase ref: gzzkpcowolsfdmzitatq). Solo se usa en la empresa DEMO.
--
--  Permite que cada contratista (pre-registrado por el ing. SSOMA) entre a un
--  link público con su RUC + código de acceso y levante hallazgos, inspecciones
--  y documentos con fotos, y actualice sus estados. El cliente lo ve en su panel.
-- ============================================================

-- 1) Código de acceso por contratista (lo asigna el ing. SSOMA)
alter table public.contratistas add column if not exists codigo_acceso text;

-- 2) Tabla unificada de registros subidos por contratistas
create table if not exists public.contratista_registros (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references public.empresas(id) on delete cascade,
  contratista_id  uuid not null references public.contratistas(id) on delete cascade,
  tipo            text not null check (tipo in ('hallazgo','inspeccion','documento')),
  titulo          text,
  descripcion     text,
  fecha           date default current_date,
  lugar           text,
  categoria       text,
  reportante      text,
  foto_urls       text[] default '{}',
  archivo_url     text,
  estado          text default 'Abierto',
  medida_correctiva text,
  fecha_cierre    date,
  foto_cierre_url text,
  observaciones   text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists idx_cr_empresa on public.contratista_registros(empresa_id);
create index if not exists idx_cr_contratista on public.contratista_registros(contratista_id);
create index if not exists idx_cr_tipo on public.contratista_registros(tipo);

-- 3) RLS
alter table public.contratista_registros enable row level security;

-- El cliente (usuarios autenticados) ve y gestiona todo lo de su empresa.
drop policy if exists cr_auth_all on public.contratista_registros;
create policy cr_auth_all on public.contratista_registros
  for all to authenticated using (true) with check (true);

-- El portal público (anon) puede insertar, leer y actualizar.
-- La lista de un contratista se consulta por su contratista_id (uuid no adivinable).
drop policy if exists cr_anon_insert on public.contratista_registros;
create policy cr_anon_insert on public.contratista_registros
  for insert to anon with check (true);
drop policy if exists cr_anon_select on public.contratista_registros;
create policy cr_anon_select on public.contratista_registros
  for select to anon using (true);
drop policy if exists cr_anon_update on public.contratista_registros;
create policy cr_anon_update on public.contratista_registros
  for update to anon using (true) with check (true);

-- 4) Login del contratista (RUC + código) sin exponer la tabla de contratistas.
--    Devuelve id y nombre solo si RUC + código coinciden para esa empresa.
create or replace function public.login_contratista(p_empresa uuid, p_ruc text, p_codigo text)
returns table(id uuid, nombre text)
language sql security definer set search_path = public as $$
  select c.id, c.nombre
  from public.contratistas c
  where c.empresa_id = p_empresa
    and replace(trim(c.ruc), ' ', '') = replace(trim(p_ruc), ' ', '')
    and coalesce(c.codigo_acceso,'') = trim(p_codigo)
  limit 1;
$$;
grant execute on function public.login_contratista(uuid, text, text) to anon;

-- 5) Bucket de archivos/fotos del portal (anon puede subir; lectura pública)
insert into storage.buckets (id, name, public)
values ('contratistas-docs', 'contratistas-docs', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists cd_select on storage.objects;
create policy cd_select on storage.objects
  for select using (bucket_id = 'contratistas-docs');
drop policy if exists cd_anon_insert on storage.objects;
create policy cd_anon_insert on storage.objects
  for insert to anon with check (bucket_id = 'contratistas-docs');
drop policy if exists cd_auth_insert on storage.objects;
create policy cd_auth_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'contratistas-docs');
