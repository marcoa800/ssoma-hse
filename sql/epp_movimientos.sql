-- ════════════════════════════════════════════════════════════════════
--  TABLA: epp_movimientos
--  Control de inventario de EPP (Ingreso / Salida / Devolución)
--  No es por persona — gestión de stock del almacén.
-- ════════════════════════════════════════════════════════════════════

create table if not exists epp_movimientos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  fecha date not null default current_date,
  tipo text not null check (tipo in ('Ingreso','Salida','Devolución')),
  categoria text not null,
  nombre text not null,
  talla text,
  cantidad int not null check (cantidad > 0),
  proveedor text,
  responsable text,
  observaciones text,
  created_at timestamptz not null default now()
);

create index if not exists idx_epp_mov_empresa on epp_movimientos(empresa_id);
create index if not exists idx_epp_mov_fecha on epp_movimientos(fecha);

alter table epp_movimientos enable row level security;

create policy "epp_mov_select" on epp_movimientos
  for select using (empresa_id = get_my_empresa_id());
create policy "epp_mov_insert" on epp_movimientos
  for insert with check (empresa_id = get_my_empresa_id());
create policy "epp_mov_update" on epp_movimientos
  for update using (empresa_id = get_my_empresa_id());
create policy "epp_mov_delete" on epp_movimientos
  for delete using (empresa_id = get_my_empresa_id());
