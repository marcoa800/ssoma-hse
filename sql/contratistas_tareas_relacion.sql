-- ============================================================
--  Contratistas — Tareas vinculadas a un entregable (opcional)
--  Una tarea puede relacionarse con un hallazgo/inspección/documento;
--  al resolverla, el contratista selecciona el registro correspondiente.
--  Ejecutar en el SQL Editor de ssoma-hse (ref: gzzkpcowolsfdmzitatq).
-- ============================================================
alter table public.contratista_tareas add column if not exists tipo_relacion text
  check (tipo_relacion in ('hallazgo','inspeccion','documento'));
alter table public.contratista_tareas add column if not exists registro_id uuid
  references public.contratista_registros(id) on delete set null;

-- RPC de recurrencia: ahora acepta el tipo de relación (opcional)
drop function if exists public.generar_tareas_contratista(uuid,uuid,text,text,text,text,int,date);
create function public.generar_tareas_contratista(
  p_empresa uuid, p_contratista uuid, p_titulo text, p_descripcion text,
  p_tipo text, p_frecuencia text, p_veces int, p_fecha_base date, p_tipo_relacion text default null
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_grupo uuid := gen_random_uuid();
  v_n int := greatest(1, coalesce(p_veces, 1));
  v_i int;
  v_rel text := nullif(p_tipo_relacion, '');
  v_step interval := case p_frecuencia
    when 'semanal'   then interval '7 days'
    when 'quincenal' then interval '15 days'
    when 'mensual'   then interval '1 month'
    else interval '1 month' end;
begin
  if p_tipo = 'periodica' then
    for v_i in 1..v_n loop
      insert into public.contratista_tareas
        (empresa_id, contratista_id, grupo_id, titulo, descripcion, tipo, frecuencia, ocurrencia, total, fecha_limite, tipo_relacion)
      values
        (p_empresa, p_contratista, v_grupo, p_titulo, p_descripcion, 'periodica', p_frecuencia, v_i, v_n,
         (coalesce(p_fecha_base, current_date) + v_step * (v_i - 1))::date, v_rel);
    end loop;
    return v_n;
  else
    insert into public.contratista_tareas
      (empresa_id, contratista_id, grupo_id, titulo, descripcion, tipo, ocurrencia, total, fecha_limite, tipo_relacion)
    values
      (p_empresa, p_contratista, v_grupo, p_titulo, p_descripcion, 'puntual', 1, 1, p_fecha_base, v_rel);
    return 1;
  end if;
end $$;
grant execute on function public.generar_tareas_contratista(uuid,uuid,text,text,text,text,int,date,text) to authenticated;
