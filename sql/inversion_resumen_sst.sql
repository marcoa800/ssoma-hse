-- ════════════════════════════════════════════════════════════════════
--  TABLA: inversion_resumen_sst
--  Cuadro de Inversión SST — resumen mensual Plan vs Real (línea energía)
--  Valores almacenados en USD; el equivalente 万元/CNY se calcula con tc.
--  Ejecutar en Supabase SQL Editor.
-- ════════════════════════════════════════════════════════════════════

create table if not exists inversion_resumen_sst (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  anio int not null,
  mes int not null check (mes between 1 and 12),
  mes_actual_usd numeric(16,2) not null default 0,
  acumulado_usd numeric(16,2) not null default 0,
  plan_anual_usd numeric(16,2) not null default 0,
  tc_usd_cny numeric(8,4) not null default 6.95,
  observaciones text,
  created_at timestamptz not null default now(),
  unique (empresa_id, anio, mes)
);

create index if not exists idx_inv_resumen_empresa on inversion_resumen_sst(empresa_id);

-- ── RLS ──
alter table inversion_resumen_sst enable row level security;

create policy "inv_resumen_select" on inversion_resumen_sst
  for select using (empresa_id = get_my_empresa_id());
create policy "inv_resumen_insert" on inversion_resumen_sst
  for insert with check (empresa_id = get_my_empresa_id());
create policy "inv_resumen_update" on inversion_resumen_sst
  for update using (empresa_id = get_my_empresa_id());
create policy "inv_resumen_delete" on inversion_resumen_sst
  for delete using (empresa_id = get_my_empresa_id());
