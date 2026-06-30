alter table public.trabajadores
  add column if not exists tipo_documento text,
  add column if not exists genero text;

-- Ampliar DNI a texto (soporta Carné de Extranjería de 9+ dígitos)
alter table public.trabajadores alter column dni type text;
