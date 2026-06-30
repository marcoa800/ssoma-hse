-- ════════════════════════════════════════════════════════════════════
--  Módulo "Pendientes / Actividades" (estilo Notion) — solo Comindustria
--  Cada usuario gestiona sus propias tablas y actividades.
-- ════════════════════════════════════════════════════════════════════

-- Tablas (cada usuario puede tener varias, p.ej. "Proyecto X", "Personal")
CREATE TABLE IF NOT EXISTS actividad_tablas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL DEFAULT 'Mis pendientes',
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_actividad_tablas_user ON actividad_tablas(user_id);

-- Actividades (filas de cada tabla)
CREATE TABLE IF NOT EXISTS actividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla_id UUID NOT NULL REFERENCES actividad_tablas(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL DEFAULT '',
  responsable TEXT,
  estado TEXT NOT NULL DEFAULT 'Pendiente',     -- Pendiente | En progreso | En revisión | Hecho | Bloqueado
  prioridad TEXT NOT NULL DEFAULT 'Media',        -- Alta | Media | Baja
  fecha_limite DATE,
  notas TEXT,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_actividades_tabla ON actividades(tabla_id);
CREATE INDEX IF NOT EXISTS idx_actividades_user  ON actividades(user_id);

-- ── RLS: cada usuario solo ve y edita lo suyo ──
ALTER TABLE actividad_tablas ENABLE ROW LEVEL SECURITY;
ALTER TABLE actividades       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "act_tablas_all" ON actividad_tablas
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "actividades_all" ON actividades
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
