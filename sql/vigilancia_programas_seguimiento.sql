-- ============================================================
-- Vigilancia: programas personalizados + controles/actividades
-- Fase 1 (Fatiga como plantilla). Idempotente.
-- ============================================================
create extension if not exists pgcrypto;

-- Programas de vigilancia personalizados por empresa
create table if not exists public.vigilancia_programas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  nombre text not null,
  descripcion text,
  periodicidad_default text default 'Anual',
  actividades text[] default '{}',
  activo boolean default true,
  orden int default 0,
  created_at timestamptz default now()
);
alter table public.vigilancia_programas enable row level security;
drop policy if exists "vp all" on public.vigilancia_programas;
create policy "vp all" on public.vigilancia_programas for all to authenticated using (true) with check (true);

-- Controles + Actividades (cualquier programa, fijo o personalizado)
create table if not exists public.vigilancia_seguimiento (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  programa text not null,          -- slug del programa fijo ('fatiga'...) o 'custom:<uuid>'
  trabajador_id uuid references public.trabajadores(id) on delete set null,
  tipo text not null default 'Control' check (tipo in ('Control','Actividad')),
  categoria text,
  fecha date not null,
  periodicidad text default 'Único',
  proximo_control date,
  detalle text,
  created_at timestamptz default now()
);
alter table public.vigilancia_seguimiento enable row level security;
drop policy if exists "vs all" on public.vigilancia_seguimiento;
create policy "vs all" on public.vigilancia_seguimiento for all to authenticated using (true) with check (true);

-- Periodicidad/próximo control en la evaluación principal de Fatiga (plantilla)
alter table public.vigilancia_fatiga
  add column if not exists periodicidad   text,
  add column if not exists proximo_control date;

-- Estado de actividad (Programada / Realizada) para el cronograma
alter table public.vigilancia_seguimiento
  add column if not exists estado text default 'Programada';

-- Periodicidad/próximo control en los demás programas de vigilancia
do $$
declare t text;
begin
  foreach t in array array['vigilancia_auditiva','vigilancia_disergonomia','vigilancia_radiacion',
                           'vigilancia_respiratoria','vigilancia_psicosocial','vigilancia_estilos_vida','vigilancia_gestante']
  loop
    execute format('alter table public.%I add column if not exists periodicidad text, add column if not exists proximo_control date', t);
  end loop;
end $$;

-- Datos estructurados (mediciones) por control — configurable por programa
alter table public.vigilancia_seguimiento add column if not exists datos jsonb default '{}'::jsonb;
