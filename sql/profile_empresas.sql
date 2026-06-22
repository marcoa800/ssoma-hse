-- ============================================================
-- Usuarios con acceso a VARIAS empresas
-- Ejecutar en Supabase → SQL Editor
-- ============================================================
create table if not exists public.profile_empresas (
  profile_id uuid references public.profiles(id) on delete cascade,
  empresa_id uuid references public.empresas(id) on delete cascade,
  primary key (profile_id, empresa_id)
);
alter table public.profile_empresas enable row level security;

-- cada usuario lee sus propias asignaciones
create policy "pe own read" on public.profile_empresas
  for select to authenticated using (profile_id = auth.uid());

-- el SUPERADMIN gestiona todas las asignaciones
create policy "pe superadmin all" on public.profile_empresas
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'SUPERADMIN'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'SUPERADMIN'));

-- cambiar la empresa activa (solo entre las asignadas; el superadmin puede a cualquiera)
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
