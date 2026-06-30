-- ════════════════════════════════════════════════════════════════════
--  Funciones públicas (anon) para el portal de exámenes:
--  - Devuelven SOLO el nombre (no exponen trabajadores/empresas completos).
--  - SECURITY DEFINER: corren con permisos del dueño, saltando RLS, pero
--    limitadas a devolver el nombre del trabajador / empresa indicados.
-- ════════════════════════════════════════════════════════════════════

-- Nombre de la empresa (para branding y lista de sedes del portal)
CREATE OR REPLACE FUNCTION examen_empresa_nombre(p_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nombre FROM empresas WHERE id = p_id;
$$;

-- Nombre del trabajador por empresa + documento (autocompletar al registrarse)
CREATE OR REPLACE FUNCTION examen_buscar_trabajador(p_empresa_id uuid, p_dni text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nombre FROM trabajadores
  WHERE empresa_id = p_empresa_id AND dni = p_dni
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION examen_empresa_nombre(uuid)        TO anon;
GRANT EXECUTE ON FUNCTION examen_buscar_trabajador(uuid, text) TO anon;
