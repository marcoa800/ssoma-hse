-- Tratamiento estructurado por atención (base para el futuro kárdex de medicamentos)
-- Cada item: { nombre, cantidad, dosis, frecuencia, duracion }
ALTER TABLE topico_atenciones ADD COLUMN IF NOT EXISTS medicamentos jsonb NOT NULL DEFAULT '[]';
