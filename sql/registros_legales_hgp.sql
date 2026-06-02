-- ════════════════════════════════════════════════════════════════════
--  TABLA: registros_legales_hgp
--  Registros legales MINTRA — Hydro Global Perú SAC
--  Formatos: FR-025 (Incidente), FR-026 (Preliminar Accidente),
--            FR-028 (Ampliatorio Accidente)
--  Motor "ficha" declarativo. Ejecutar en Supabase SQL Editor.
-- ════════════════════════════════════════════════════════════════════

create table if not exists registros_legales_hgp (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  plantilla_codigo text not null,            -- ej: HGP-SGIII-SIG-FR-026
  plantilla_nombre text,                     -- ej: Registro Preliminar de Accidente
  fecha date not null default current_date,
  referencia text,                           -- nombre del accidentado / N° de registro (para listar)
  datos jsonb not null default '{}'::jsonb,  -- todos los campos del formato, indexados por key
  foto_urls jsonb not null default '[]'::jsonb,
  estado text not null default 'Completado',
  created_at timestamptz not null default now()
);

create index if not exists idx_reg_legal_empresa on registros_legales_hgp(empresa_id);
create index if not exists idx_reg_legal_codigo on registros_legales_hgp(plantilla_codigo);

-- ── RLS ──
alter table registros_legales_hgp enable row level security;

create policy "reg_legal_select" on registros_legales_hgp
  for select using (empresa_id = get_my_empresa_id());

create policy "reg_legal_insert" on registros_legales_hgp
  for insert with check (empresa_id = get_my_empresa_id());

create policy "reg_legal_update" on registros_legales_hgp
  for update using (empresa_id = get_my_empresa_id());

create policy "reg_legal_delete" on registros_legales_hgp
  for delete using (empresa_id = get_my_empresa_id());

-- ── Storage (reutiliza el bucket 'inspecciones-fotos' ya creado por inspecciones_hgp.sql) ──
-- Si no existe, descomentar:
-- insert into storage.buckets (id, name, public)
-- values ('inspecciones-fotos', 'inspecciones-fotos', true)
-- on conflict (id) do nothing;
