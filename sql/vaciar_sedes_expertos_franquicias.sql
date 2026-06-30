-- ════════════════════════════════════════════════════════════════════
--  Vaciar (poner NULL) la sede de trabajadores en EXPERTOS EN CAFÉ y
--  FRANQUICIAS UNIDAS cuyas sedes sean: San Pedrito, Lima, Arequipa 3 Real Plaza.
--  Los trabajadores NO se eliminan; solo se limpia su campo 'sede'.
-- ════════════════════════════════════════════════════════════════════

-- 1) VERIFICAR primero a cuántos afecta (no cambia nada):
SELECT t.sede, e.nombre AS empresa, count(*) AS trabajadores
FROM trabajadores t
JOIN empresas e ON e.id = t.empresa_id
WHERE (lower(e.nombre) LIKE '%expertos en caf%' OR lower(e.nombre) LIKE '%franquicias unidas%')
  AND lower(trim(t.sede)) IN ('san pedrito', 'lima', 'arequipa 3 real plaza')
GROUP BY t.sede, e.nombre
ORDER BY e.nombre, t.sede;

-- 2) APLICAR el cambio (vaciar la sede):
UPDATE trabajadores t
SET sede = NULL
FROM empresas e
WHERE e.id = t.empresa_id
  AND (lower(e.nombre) LIKE '%expertos en caf%' OR lower(e.nombre) LIKE '%franquicias unidas%')
  AND lower(trim(t.sede)) IN ('san pedrito', 'lima', 'arequipa 3 real plaza');
