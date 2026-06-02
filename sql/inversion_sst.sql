-- ════════════════════════════════════════════════════════════════════
--  TABLA: inversion_sst
--  Registro de Inversión en Costos de Seguridad en la Producción
--  Libro de costos SST (no es una inspección). Ejecutar en Supabase.
-- ════════════════════════════════════════════════════════════════════

create table if not exists inversion_sst (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  fecha date not null default current_date,
  proyecto text,
  categoria text,
  descripcion text,
  monto_usd numeric(14,2) not null default 0,
  proveedor text,
  responsable text,
  observaciones text,
  created_at timestamptz not null default now()
);

create index if not exists idx_inversion_sst_empresa on inversion_sst(empresa_id);
create index if not exists idx_inversion_sst_fecha on inversion_sst(fecha);

-- ── RLS ──
alter table inversion_sst enable row level security;

create policy "inversion_sst_select" on inversion_sst
  for select using (empresa_id = get_my_empresa_id());
create policy "inversion_sst_insert" on inversion_sst
  for insert with check (empresa_id = get_my_empresa_id());
create policy "inversion_sst_update" on inversion_sst
  for update using (empresa_id = get_my_empresa_id());
create policy "inversion_sst_delete" on inversion_sst
  for delete using (empresa_id = get_my_empresa_id());
