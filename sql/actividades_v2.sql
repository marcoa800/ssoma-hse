-- v2 del módulo Pendientes: checklist de subtareas + enlace/adjunto por actividad
ALTER TABLE actividades ADD COLUMN IF NOT EXISTS subtareas jsonb NOT NULL DEFAULT '[]';  -- [{t:texto, done:bool}]
ALTER TABLE actividades ADD COLUMN IF NOT EXISTS enlace text;                              -- URL de archivo/enlace
