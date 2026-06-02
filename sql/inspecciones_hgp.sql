-- ════════════════════════════════════════════════════════════════════
--  TABLA: inspecciones_hgp
--  Motor de inspecciones por formatos oficiales — Hydro Global Perú SAC
--  Ejecutar en Supabase SQL Editor.
-- ════════════════════════════════════════════════════════════════════

create table if not exists inspecciones_hgp (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  plantilla_codigo text not null,            -- ej: HGP-SGIII-SIG-FR-006
  plantilla_nombre text,                     -- ej: Check List Mensual de Extintores
  fecha date not null default current_date,
  area text,
  inspector text,
  cabecera jsonb not null default '{}'::jsonb, -- campos de cabecera del formato
  filas jsonb not null default '[]'::jsonb,    -- filas de activos / ítems
  observaciones text,
  foto_urls jsonb not null default '[]'::jsonb,
  estado text not null default 'Completado',
  created_at timestamptz not null default now()
);

create index if not exists idx_insp_hgp_empresa on inspecciones_hgp(empresa_id);
create index if not exists idx_insp_hgp_codigo on inspecciones_hgp(plantilla_codigo);

-- ── RLS ──
alter table inspecciones_hgp enable row level security;

create policy "insp_hgp_select" on inspecciones_hgp
  for select using (empresa_id = get_my_empresa_id());

create policy "insp_hgp_insert" on inspecciones_hgp
  for insert with check (empresa_id = get_my_empresa_id());

create policy "insp_hgp_update" on inspecciones_hgp
  for update using (empresa_id = get_my_empresa_id());

create policy "insp_hgp_delete" on inspecciones_hgp
  for delete using (empresa_id = get_my_empresa_id());

-- ── Storage para evidencia fotográfica (RACS y futuras inspecciones con foto) ──
insert into storage.buckets (id, name, public)
values ('inspecciones-fotos', 'inspecciones-fotos', true)
on conflict (id) do nothing;

create policy "insp_fotos_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'inspecciones-fotos');
create policy "insp_fotos_select" on storage.objects
  for select using (bucket_id = 'inspecciones-fotos');
create policy "insp_fotos_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'inspecciones-fotos');
