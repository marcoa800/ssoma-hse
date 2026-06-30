-- ════════════════════════════════════════════════════════════════════
--  Copiar exámenes (y sus preguntas) de FRANQUICIAS UNIDAS → EXPERTOS EN CAFÉ
--  - Copia nombre, descripción, estado, puntaje, video y todas las preguntas.
--  - NO copia resultados (esos son por trabajador).
--  - Idempotente: si un examen con el mismo nombre ya existe en Expertos, lo omite.
--  Ejecutar en el SQL Editor de Supabase.
-- ════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  src_emp uuid;   -- Franquicias Unidas (origen)
  dst_emp uuid;   -- Expertos en Café (destino)
  ex RECORD;
  new_id uuid;
  copiados int := 0;
BEGIN
  SELECT id INTO src_emp FROM empresas WHERE lower(nombre) LIKE '%franquicias unidas%' LIMIT 1;
  SELECT id INTO dst_emp FROM empresas WHERE lower(nombre) LIKE '%expertos en caf%'    LIMIT 1;

  IF src_emp IS NULL THEN RAISE EXCEPTION 'No se encontró la empresa origen (Franquicias Unidas)'; END IF;
  IF dst_emp IS NULL THEN RAISE EXCEPTION 'No se encontró la empresa destino (Expertos en Café)'; END IF;

  FOR ex IN SELECT * FROM examenes WHERE empresa_id = src_emp LOOP
    -- Evitar duplicar si ya existe un examen con ese nombre en Expertos
    IF EXISTS (SELECT 1 FROM examenes WHERE empresa_id = dst_emp AND nombre = ex.nombre) THEN
      CONTINUE;
    END IF;

    INSERT INTO examenes (empresa_id, nombre, descripcion, activo, puntaje_minimo, video_url)
    VALUES (dst_emp, ex.nombre, ex.descripcion, ex.activo, ex.puntaje_minimo, ex.video_url)
    RETURNING id INTO new_id;

    INSERT INTO examen_preguntas (examen_id, orden, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, correcta)
    SELECT new_id, orden, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, correcta
    FROM examen_preguntas WHERE examen_id = ex.id;

    copiados := copiados + 1;
  END LOOP;

  RAISE NOTICE 'Exámenes copiados a Expertos en Café: %', copiados;
END $$;
