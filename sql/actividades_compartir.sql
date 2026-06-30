-- ════════════════════════════════════════════════════════════════════
--  Pendientes v3: tablas privadas o compartidas con la empresa (opción C)
--  - compartida=false → solo el dueño (privada).
--  - compartida=true  → la ven y editan los usuarios de la misma empresa.
--  - Renombrar/eliminar/cambiar privacidad de una tabla: solo el dueño.
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE actividad_tablas ADD COLUMN IF NOT EXISTS compartida boolean NOT NULL DEFAULT false;

-- Reemplazar políticas anteriores
DROP POLICY IF EXISTS "act_tablas_all" ON actividad_tablas;
DROP POLICY IF EXISTS "actividades_all" ON actividades;

-- ── Tablas ──
CREATE POLICY "act_tablas_select" ON actividad_tablas FOR SELECT
  USING (user_id = auth.uid() OR (compartida AND empresa_id = get_my_empresa_id()));
CREATE POLICY "act_tablas_insert" ON actividad_tablas FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "act_tablas_update" ON actividad_tablas FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "act_tablas_delete" ON actividad_tablas FOR DELETE
  USING (user_id = auth.uid());

-- ── Actividades: acceso según la tabla padre (propia o compartida de mi empresa) ──
CREATE POLICY "actividades_rw" ON actividades FOR ALL
  USING (tabla_id IN (
    SELECT id FROM actividad_tablas t
    WHERE t.user_id = auth.uid() OR (t.compartida AND t.empresa_id = get_my_empresa_id())
  ))
  WITH CHECK (tabla_id IN (
    SELECT id FROM actividad_tablas t
    WHERE t.user_id = auth.uid() OR (t.compartida AND t.empresa_id = get_my_empresa_id())
  ));
