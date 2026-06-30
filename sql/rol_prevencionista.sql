-- Nuevo rol PREVENCIONISTA (igual acceso que SEGURIDAD, pero sin eliminar)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_rol_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_rol_check
  CHECK (rol = ANY (ARRAY['ADMIN','MEDICO','SEGURIDAD','SUPERADMIN','ADMINISTRATIVO','PREVENCIONISTA']));
