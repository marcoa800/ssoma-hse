-- ============================================================
-- MÓDULO: Entrega y Firma de EMO (Examen Médico Ocupacional)
-- Acceso público worker-facing vía token (?entrega=<token>)
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

create extension if not exists pgcrypto;

-- 1) TABLA --------------------------------------------------------------
create table if not exists public.emo_entregas (
  id                        uuid primary key default gen_random_uuid(),
  empresa_id                uuid references public.empresas(id) on delete set null,
  trabajador_dni            text not null,
  trabajador_nombre         text,
  token_acceso              uuid not null unique default gen_random_uuid(),
  audio_url                 text,            -- object key dentro del bucket emo-audios
  pdf_url                   text,            -- object key dentro del bucket emo-pdfs
  estado                    text not null default 'pendiente' check (estado in ('pendiente','completado')),
  firma_base64              text,            -- firma del trabajador
  firma_responsable_base64  text,            -- mi firma (responsable), añadida después
  fecha_firma               timestamptz,
  fecha_firma_responsable   timestamptz,
  created_at                timestamptz default now()
);

alter table public.emo_entregas enable row level security;

-- Personal interno (autenticado) — gestión completa
create policy "emo internos all" on public.emo_entregas
  for all to authenticated using (true) with check (true);

-- NOTA: NO se crea policy de SELECT para 'anon'. El acceso público pasa
-- únicamente por las funciones RPC de abajo (security definer), que filtran
-- por token (y DNI). Así anon nunca puede leer toda la tabla.

-- 2) RPCs PÚBLICAS (security definer) ----------------------------------

-- 2.1) Metadatos mínimos para la pantalla inicial (saludo)
create or replace function public.emo_get(p_token uuid)
returns table (trabajador_nombre text, estado text)
language sql security definer set search_path = public as $$
  select trabajador_nombre, estado
  from public.emo_entregas
  where token_acceso = p_token;
$$;

-- 2.2) Validar DNI → devuelve recursos (audio siempre; pdf solo si completado)
create or replace function public.emo_validar(p_token uuid, p_dni text)
returns table (ok boolean, audio_url text, pdf_url text, estado text, trabajador_nombre text)
language sql security definer set search_path = public as $$
  select true,
         e.audio_url,
         case when e.estado = 'completado' then e.pdf_url else null end,
         e.estado,
         e.trabajador_nombre
  from public.emo_entregas e
  where e.token_acceso = p_token and e.trabajador_dni = p_dni;
$$;

-- 2.3) Firmar → guarda firma, marca completado, devuelve el path del PDF
create or replace function public.emo_firmar(p_token uuid, p_dni text, p_firma text)
returns table (ok boolean, pdf_url text)
language plpgsql security definer set search_path = public as $$
declare v_pdf text;
begin
  update public.emo_entregas
     set firma_base64 = p_firma, fecha_firma = now(), estado = 'completado'
   where token_acceso = p_token and trabajador_dni = p_dni and estado = 'pendiente'
   returning pdf_url into v_pdf;
  if not found then
    return query select false, null::text;
  else
    return query select true, v_pdf;
  end if;
end;
$$;

grant execute on function public.emo_get(uuid)            to anon;
grant execute on function public.emo_validar(uuid, text)  to anon;
grant execute on function public.emo_firmar(uuid, text, text) to anon;

-- 3) STORAGE ----------------------------------------------------------
-- Crea PRIMERO estos 2 buckets PRIVADOS en Supabase → Storage:
--    emo-audios   (Private)
--    emo-pdfs     (Private)
-- Luego corre estas políticas:

-- anon: solo puede generar Signed URLs (SELECT) — no puede listar ni subir
create policy "anon signed emo-audios" on storage.objects
  for select to anon using (bucket_id = 'emo-audios');
create policy "anon signed emo-pdfs" on storage.objects
  for select to anon using (bucket_id = 'emo-pdfs');

-- personal interno (autenticado): subir/gestionar
create policy "auth manage emo-audios" on storage.objects
  for all to authenticated using (bucket_id = 'emo-audios') with check (bucket_id = 'emo-audios');
create policy "auth manage emo-pdfs" on storage.objects
  for all to authenticated using (bucket_id = 'emo-pdfs')   with check (bucket_id = 'emo-pdfs');

-- 4) REGISTRO DE PRUEBA (opcional) ------------------------------------
-- Sube un audio y un pdf a los buckets, y usa sus rutas (object key) aquí.
-- El SELECT devuelve el token → úsalo en  /?entrega=<token>
--
-- insert into public.emo_entregas (trabajador_dni, trabajador_nombre, audio_url, pdf_url, empresa_id)
-- values ('12345678', 'Juan Pérez Demo', 'demo/audio.mp3', 'demo/informe.pdf',
--         (select id from empresas where nombre ilike '%expertos en cafe%' limit 1))
-- returning token_acceso;
