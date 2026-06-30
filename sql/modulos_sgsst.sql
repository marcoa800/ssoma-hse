-- ════════════════════════════════════════════════════════════════════
--  Módulos SGSST (Comindustria): Comité SST, Investigación de accidentes,
--  Acciones correctivas / No conformidades, Programa Anual SST.
-- ════════════════════════════════════════════════════════════════════

-- 1) Comité SST — miembros
CREATE TABLE IF NOT EXISTS comite_miembros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL, cargo TEXT, representa TEXT, periodo TEXT,
  activo BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- 1b) Comité SST — reuniones (libro de actas)
CREATE TABLE IF NOT EXISTS comite_reuniones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  fecha DATE, tipo TEXT, temas TEXT, acuerdos TEXT, asistentes TEXT, acta_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Investigación de accidentes/incidentes
CREATE TABLE IF NOT EXISTS investigaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  fecha_evento DATE, afectado TEXT, tipo TEXT, descripcion TEXT,
  causas_inmediatas TEXT, causas_basicas TEXT,
  medidas JSONB NOT NULL DEFAULT '[]',     -- [{accion, responsable, fecha_limite, estado}]
  evidencia_url TEXT, estado TEXT NOT NULL DEFAULT 'Abierta', responsable TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3) Acciones correctivas / No conformidades
CREATE TABLE IF NOT EXISTS acciones_correctivas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  origen TEXT, descripcion TEXT, accion TEXT, responsable TEXT,
  fecha_deteccion DATE, fecha_limite DATE, estado TEXT NOT NULL DEFAULT 'Abierta',
  evidencia_url TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4) Programa Anual SST (por ahora: link al documento)
CREATE TABLE IF NOT EXISTS programa_sst (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  anio INT, nombre TEXT, url TEXT, observacion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS por empresa para todas
DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['comite_miembros','comite_reuniones','investigaciones','acciones_correctivas','programa_sst'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_all" ON %I;', t, t);
    EXECUTE format('CREATE POLICY "%s_all" ON %I FOR ALL USING (empresa_id = get_my_empresa_id()) WITH CHECK (empresa_id = get_my_empresa_id());', t, t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_emp ON %I(empresa_id);', t, t);
  END LOOP;
END $$;
