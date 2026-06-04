-- ════════════════════════════════════════════════════════════════════
--  TABLAS: Sistema de Exámenes (Comindustria)
--  examenes, examen_preguntas, examen_resultados
-- ════════════════════════════════════════════════════════════════════

-- 1. Exámenes (definición)
CREATE TABLE IF NOT EXISTS examenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  puntaje_minimo INT NOT NULL DEFAULT 7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_examenes_empresa ON examenes(empresa_id);

ALTER TABLE examenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "examenes_select" ON examenes FOR SELECT USING (empresa_id = get_my_empresa_id());
CREATE POLICY "examenes_insert" ON examenes FOR INSERT WITH CHECK (empresa_id = get_my_empresa_id());
CREATE POLICY "examenes_update" ON examenes FOR UPDATE USING (empresa_id = get_my_empresa_id());
CREATE POLICY "examenes_delete" ON examenes FOR DELETE USING (empresa_id = get_my_empresa_id());

-- 2. Preguntas de cada examen
CREATE TABLE IF NOT EXISTS examen_preguntas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  examen_id UUID NOT NULL REFERENCES examenes(id) ON DELETE CASCADE,
  orden INT NOT NULL DEFAULT 1,
  pregunta TEXT NOT NULL,
  opcion_a TEXT NOT NULL,
  opcion_b TEXT NOT NULL,
  opcion_c TEXT NOT NULL,
  opcion_d TEXT NOT NULL,
  correcta TEXT NOT NULL CHECK (correcta IN ('a','b','c','d')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_preguntas_examen ON examen_preguntas(examen_id);

ALTER TABLE examen_preguntas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "preguntas_select" ON examen_preguntas FOR SELECT USING (
  examen_id IN (SELECT id FROM examenes WHERE empresa_id = get_my_empresa_id())
);
CREATE POLICY "preguntas_insert" ON examen_preguntas FOR INSERT WITH CHECK (
  examen_id IN (SELECT id FROM examenes WHERE empresa_id = get_my_empresa_id())
);
CREATE POLICY "preguntas_update" ON examen_preguntas FOR UPDATE USING (
  examen_id IN (SELECT id FROM examenes WHERE empresa_id = get_my_empresa_id())
);
CREATE POLICY "preguntas_delete" ON examen_preguntas FOR DELETE USING (
  examen_id IN (SELECT id FROM examenes WHERE empresa_id = get_my_empresa_id())
);

-- 3. Resultados (respuestas del trabajador)
CREATE TABLE IF NOT EXISTS examen_resultados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  examen_id UUID NOT NULL REFERENCES examenes(id) ON DELETE CASCADE,
  dni TEXT NOT NULL,
  nombre TEXT,
  puntaje INT NOT NULL DEFAULT 0,
  total_preguntas INT NOT NULL DEFAULT 10,
  aprobado BOOLEAN NOT NULL DEFAULT false,
  respuestas JSONB NOT NULL DEFAULT '{}',  -- {pregunta_id: "a"|"b"|"c"|"d"}
  desbloqueado BOOLEAN NOT NULL DEFAULT false,  -- SUPERADMIN puede resetear
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (examen_id, dni)  -- una sola vez por DNI/examen (salvo desbloqueo)
);
CREATE INDEX IF NOT EXISTS idx_resultados_empresa ON examen_resultados(empresa_id);
CREATE INDEX IF NOT EXISTS idx_resultados_examen ON examen_resultados(examen_id);

ALTER TABLE examen_resultados ENABLE ROW LEVEL SECURITY;
-- Resultados: select/insert/update/delete con empresa_id
CREATE POLICY "resultados_select" ON examen_resultados FOR SELECT USING (empresa_id = get_my_empresa_id());
CREATE POLICY "resultados_insert" ON examen_resultados FOR INSERT WITH CHECK (empresa_id = get_my_empresa_id());
CREATE POLICY "resultados_update" ON examen_resultados FOR UPDATE USING (empresa_id = get_my_empresa_id());
CREATE POLICY "resultados_delete" ON examen_resultados FOR DELETE USING (empresa_id = get_my_empresa_id());

-- Acceso público anónimo para el form público (insertar resultados sin login)
-- Ejecutar también esto para que el form público funcione:
CREATE POLICY "resultados_public_insert" ON examen_resultados
  FOR INSERT TO anon WITH CHECK (true);

-- Acceso público para leer preguntas (el form público las necesita)
CREATE POLICY "preguntas_public_select" ON examen_preguntas
  FOR SELECT TO anon USING (true);

-- Acceso público para leer exámenes activos
CREATE POLICY "examenes_public_select" ON examenes
  FOR SELECT TO anon USING (activo = true);

-- Acceso público para verificar si un DNI ya rindió (evitar duplicados)
CREATE POLICY "resultados_public_check" ON examen_resultados
  FOR SELECT TO anon USING (true);
