-- ════════════════════════════════════════════════════════════════════
--  TABLA: hallazgos_hgp — Reporte de Hallazgos FR-039 (Hydro Global)
-- ════════════════════════════════════════════════════════════════════
create table if not exists hallazgos_hgp (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,

  -- Cabecera
  proyecto text default 'CHSGIII',
  empresa_reportante text,
  empresa_inspeccionada text,
  supervisor_reportante text,
  fecha_hallazgo date not null default current_date,
  fecha_apertura date default current_date,
  fecha_limite date,

  -- Localización
  lugar text,
  actividad text,
  pt_asociado text,
  lider_frente text,
  hora_visita text,
  asignado_area text,

  -- Clasificación
  tipo_hallazgo text,          -- Buena práctica / Nivel 1-4
  categoria_riesgo text,       -- Proceso de producción / Equipos / etc.
  clasificacion text,          -- Acto / Condición / N.A.
  hallazgo_asociado text,      -- Sección 1-24

  -- Contenido
  descripcion text not null,
  medida_correctiva text,
  causas_fondo text,

  -- Evidencia
  foto_inicial_url text,
  foto_final_url text,

  -- Seguimiento
  estatus text not null default 'Abierto',  -- Abierto / En proceso / Cerrado
  descripcion_cierre text,
  fecha_cierre date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hall_hgp_empresa on hallazgos_hgp(empresa_id);
create index if not exists idx_hall_hgp_estatus on hallazgos_hgp(estatus);
create index if not exists idx_hall_hgp_fecha on hallazgos_hgp(fecha_hallazgo);

-- RLS
alter table hallazgos_hgp enable row level security;
create policy "hall_hgp_select" on hallazgos_hgp for select using (empresa_id = get_my_empresa_id());
create policy "hall_hgp_insert" on hallazgos_hgp for insert with check (empresa_id = get_my_empresa_id());
create policy "hall_hgp_update" on hallazgos_hgp for update using (empresa_id = get_my_empresa_id());
create policy "hall_hgp_delete" on hallazgos_hgp for delete using (empresa_id = get_my_empresa_id());
