-- ============================================================
--  DATOS FICTICIOS para la empresa DEMO (Medicloud Safety)
--  Ejecutar en el SQL Editor de ssoma-hse (ref: gzzkpcowolsfdmzitatq).
--  Detecta automáticamente la empresa cuyo nombre contiene "demo".
--  Idempotente: si lo corres dos veces NO duplica.
-- ============================================================
do $$
declare
  v_emp uuid;
  v_i1 uuid; v_i2 uuid; v_i3 uuid; v_i4 uuid;
  v_c1 uuid; v_c2 uuid; v_c3 uuid; v_c4 uuid;
begin
  select id into v_emp from public.empresas where lower(nombre) like '%demo%' order by created_at limit 1;
  if v_emp is null then raise exception 'No existe ninguna empresa con "demo" en el nombre'; end if;

  -- ───────────── 1) DIRECTORIO: 20 trabajadores (idempotente por DNI) ─────────────
  insert into public.trabajadores
    (empresa_id, nombre, dni, cargo, sede, estado, celular, email, fecha_nacimiento, fecha_ingreso,
     edad, ultima_emo, duracion_emo, vencimiento_emo, aptitud, restriccion_medica, epp_recibido)
  select v_emp, t.nombre, t.dni, t.cargo, 'Lima', 'Activo', t.celular,
         lower(replace(t.nombre,' ','.'))||'@demo.pe',
         t.fnac, t.fing,
         extract(year from age(current_date, t.fnac))::int,
         t.emo, 'Anual', (t.emo + interval '1 year')::date,
         t.aptitud, t.restriccion, true
  from (values
    ('Juan Pérez Quispe','40011001','Operario de producción','987100001',date '1988-03-12',date '2019-05-02',date '2025-09-10','Apto','Ninguna'),
    ('María Flores Huamán','40011002','Analista de calidad','987100002',date '1992-07-22',date '2020-01-15',date '2025-10-05','Apto','Ninguna'),
    ('Carlos Mamani Choque','40011003','Supervisor de planta','987100003',date '1985-11-03',date '2017-03-20',date '2025-08-18','Apto con restricción','Uso permanente de lentes correctores'),
    ('Rosa Quispe Apaza','40011004','Asistente administrativo','987100004',date '1990-02-28',date '2021-06-10',date '2026-01-12','Apto','Ninguna'),
    ('Luis Gutiérrez Rojas','40011005','Técnico electricista','987100005',date '1979-09-15',date '2015-08-01',date '2025-07-22','Apto con restricción','No exposición a ruido mayor a 85 dB'),
    ('Ana Torres Vega','40011006','Practicante SSOMA','987100006',date '1995-12-05',date '2023-02-01',date '2026-02-20','Apto','Ninguna'),
    ('Pedro Sánchez Díaz','40011007','Almacenero','987100007',date '1983-04-19',date '2018-09-12',date '2025-11-03','Apto','Ninguna'),
    ('Carmen Ramírez Lloc','40011008','Enfermera ocupacional','987100008',date '1987-06-30',date '2019-11-25',date '2025-12-01','Apto','Ninguna'),
    ('Jorge Castillo Núñez','40011009','Conductor','987100009',date '1991-01-08',date '2020-07-19',date '2025-09-28','Apto con restricción','No conducir más de 8 horas continuas'),
    ('Lucía Espinoza Ríos','40011010','Operario de empaque','987100010',date '1993-10-14',date '2022-03-08',date '2026-03-15','Apto','Ninguna'),
    ('Miguel Vargas León','40011011','Jefe de mantenimiento','987100011',date '1980-08-25',date '2014-05-05',date '2025-06-30','Apto','Ninguna'),
    ('Sandra Paredes Ortiz','40011012','Contadora','987100012',date '1989-05-17',date '2018-01-22',date '2025-10-19','Apto','Ninguna'),
    ('Raúl Chávez Medina','40011013','Soldador','987100013',date '1986-03-09',date '2016-10-10',date '2025-08-05','Apto con restricción','No trabajos en altura mayor a 1.8 m'),
    ('Gloria Salazar Ponce','40011014','Recepcionista','987100014',date '1994-09-21',date '2022-11-14',date '2026-04-02','No evaluado','Ninguna'),
    ('Fernando Ríos Aguilar','40011015','Mecánico','987100015',date '1982-12-11',date '2017-07-07',date '2025-07-15','Apto','Ninguna'),
    ('Patricia Mendoza Cruz','40011016','Analista de RRHH','987100016',date '1990-11-29',date '2019-04-18',date '2025-11-20','Apto','Ninguna'),
    ('Diego Herrera Campos','40011017','Operario de producción','987100017',date '1996-02-03',date '2023-08-01',date '2026-05-10','Apto','Ninguna'),
    ('Verónica Cárdenas Soto','40011018','Supervisora de calidad','987100018',date '1984-07-08',date '2016-02-29',date '2025-09-01','Apto con restricción','Control de hipertensión arterial'),
    ('Andrés Romero Vilca','40011019','Electricista','987100019',date '1981-06-16',date '2015-12-03',date '2025-12-18','Apto','Ninguna'),
    ('Elena Núñez Bautista','40011020','Asistente de logística','987100020',date '1992-04-27',date '2021-09-09',date '2026-01-30','Apto','Ninguna')
  ) as t(nombre, dni, cargo, celular, fnac, fing, emo, aptitud, restriccion)
  where not exists (select 1 from public.trabajadores w where w.empresa_id = v_emp and w.dni = t.dni);

  -- ───────────── 2) TÓPICO: atenciones médicas ─────────────
  if not exists (select 1 from public.topico_atenciones where empresa_id = v_emp) then
    insert into public.topico_atenciones
      (empresa_id, nombre_paciente, dni, fecha, hora, edad, sexo, cargo, area, tipo_atencion, caracteristica,
       diagnostico1, cie10_1, grupo_enfermedad, prescripcion, responsable, descanso_medico, dias_descanso,
       trabajo_restringido, requiere_seguimiento, parte_cuerpo, medicamentos, observacion)
    values
      (v_emp,'Juan Pérez Quispe','40011001',date '2026-06-02','09:15',38,'M','Operario de producción','Producción','Nueva','Enfermedad común','Cefalea tensional','R51','No ocupacional','Paracetamol 500mg c/8h','Carmen Ramírez Lloc',false,null,false,false,'{"Cabeza"}','[{"nombre":"Paracetamol","cantidad":"6","dosis":"500mg c/8h"}]','Refiere estrés por carga laboral'),
      (v_emp,'Lucía Espinoza Ríos','40011010','2026-06-05','11:40',32,'F','Operario de empaque','Empaque','Nueva','Accidente de trabajo','Herida cortante superficial en mano','S610','Ocupacional','Curación y vendaje','Carmen Ramírez Lloc',false,null,true,true,'{"Mano derecha"}','[{"nombre":"Gasas estériles","cantidad":"3","dosis":"-"},{"nombre":"Alcohol yodado","cantidad":"1","dosis":"tópico"}]','Corte con cúter, sin compromiso tendinoso'),
      (v_emp,'Raúl Chávez Medina','40011013','2026-06-08','14:20',40,'M','Soldador','Mantenimiento','Nueva','Enfermedad común','Conjuntivitis por exposición','H101','No ocupacional','Lágrimas artificiales','Carmen Ramírez Lloc',false,null,false,true,'{"Ojos"}','[{"nombre":"Lágrimas artificiales","cantidad":"1","dosis":"1 gota c/6h"}]','Recomendado uso correcto de careta'),
      (v_emp,'Rosa Quispe Apaza','40011004','2026-06-10','10:05',36,'F','Asistente administrativo','Administración','Nueva','Enfermedad común','Lumbalgia mecánica','M545','No ocupacional','Ibuprofeno 400mg c/8h','Carmen Ramírez Lloc',true,2,false,true,'{"Espalda baja"}','[{"nombre":"Ibuprofeno","cantidad":"10","dosis":"400mg c/8h"}]','Pausas activas recomendadas'),
      (v_emp,'Pedro Sánchez Díaz','40011007','2026-06-12','08:50',43,'M','Almacenero','Almacén','Nueva','Enfermedad común','Faringitis aguda','J029','No ocupacional','Amoxicilina 500mg c/8h','Carmen Ramírez Lloc',true,1,false,false,'{"Garganta"}','[{"nombre":"Amoxicilina","cantidad":"21","dosis":"500mg c/8h"}]','Reposo relativo 24h'),
      (v_emp,'Carlos Mamani Choque','40011003','2026-06-15','16:10',40,'M','Supervisor de planta','Producción','Continuadora','Control','Hipertensión arterial controlada','I10','No ocupacional','Continúa tratamiento','Carmen Ramírez Lloc',false,null,false,true,'{}','[]','PA 130/85, seguimiento mensual'),
      (v_emp,'Ana Torres Vega','40011006','2026-06-18','12:30',30,'F','Practicante SSOMA','SSOMA','Nueva','Enfermedad común','Migraña','G43','No ocupacional','Naproxeno 550mg','Carmen Ramírez Lloc',false,null,false,false,'{"Cabeza"}','[{"nombre":"Naproxeno","cantidad":"4","dosis":"550mg c/12h"}]','Hidratación y descanso visual'),
      (v_emp,'Jorge Castillo Núñez','40011009','2026-06-20','15:00',35,'M','Conductor','Logística','Nueva','Enfermedad común','Gastritis','K297','No ocupacional','Omeprazol 20mg','Carmen Ramírez Lloc',false,null,false,true,'{"Abdomen"}','[{"nombre":"Omeprazol","cantidad":"14","dosis":"20mg c/24h"}]','Evitar comidas irritantes'),
      (v_emp,'Fernando Ríos Aguilar','40011015','2026-06-23','09:40',43,'M','Mecánico','Mantenimiento','Nueva','Accidente de trabajo','Contusión en rodilla','S800','Ocupacional','Hielo local y reposo','Carmen Ramírez Lloc',true,3,true,true,'{"Rodilla izquierda"}','[{"nombre":"Diclofenaco gel","cantidad":"1","dosis":"tópico c/12h"}]','Golpe contra estructura, sin fractura'),
      (v_emp,'Elena Núñez Bautista','40011020','2026-06-26','13:15',34,'F','Asistente de logística','Logística','Nueva','Enfermedad común','Resfrío común','J00','No ocupacional','Sintomático','Carmen Ramírez Lloc',false,null,false,false,'{"Vías respiratorias"}','[{"nombre":"Clorfenamina","cantidad":"6","dosis":"4mg c/8h"}]','Cuadro leve');
  end if;

  -- ───────────── 3) DESCANSOS MÉDICOS ─────────────
  if not exists (select 1 from public.vigilancia_descansos where empresa_id = v_emp) then
    insert into public.vigilancia_descansos
      (empresa_id, trabajador_id, dni, fecha_inicio, fecha_fin, tipo_reposo, atencion, diagnostico, cie10,
       medico_responsable, centro_medico, observaciones)
    values
      (v_emp,(select id from public.trabajadores where empresa_id=v_emp and dni='40011004'),'40011004',date '2026-06-10',date '2026-06-11','Domiciliario','EsSalud','Lumbalgia mecánica','M545','Dr. Quiroz','Policlínico EsSalud Jesús María','Descanso por dolor lumbar'),
      (v_emp,(select id from public.trabajadores where empresa_id=v_emp and dni='40011007'),'40011007',date '2026-06-12',date '2026-06-12','Domiciliario','EsSalud','Faringitis aguda','J029','Dr. Quiroz','Policlínico EsSalud Jesús María','1 día de reposo'),
      (v_emp,(select id from public.trabajadores where empresa_id=v_emp and dni='40011015'),'40011015',date '2026-06-23',date '2026-06-25','Domiciliario','Particular','Contusión en rodilla','S800','Dra. Salas','Clínica Internacional','Accidente de trabajo, control en 72h'),
      (v_emp,(select id from public.trabajadores where empresa_id=v_emp and dni='40011010'),'40011010',date '2026-05-18',date '2026-05-20','Domiciliario','EsSalud','Síndrome diarreico agudo','A09','Dr. Quiroz','EsSalud','Reposo e hidratación'),
      (v_emp,(select id from public.trabajadores where empresa_id=v_emp and dni='40011018'),'40011018',date '2026-04-02',date '2026-04-08','Domiciliario','EsSalud','COVID-19','U071','Dra. Salas','EsSalud','Aislamiento 7 días'),
      (v_emp,(select id from public.trabajadores where empresa_id=v_emp and dni='40011013'),'40011013',date '2026-03-09',date '2026-03-11','Domiciliario','Particular','Conjuntivitis','H101','Dr. Vera','Óptica Visión','Reposo visual 3 días');
  end if;

  -- ───────────── 4) ACCIDENTES / INCIDENTES ─────────────
  if not exists (select 1 from public.accidentes_incidentes where empresa_id = v_emp) then
    insert into public.accidentes_incidentes
      (empresa_id, trabajador_id, tipo, fecha_evento, hora_evento, lugar, area_puesto, descripcion,
       parte_cuerpo, agente_causante, tipo_lesion, gravedad, dias_perdidos, requirio_hospitalizacion,
       estado_investigacion, medidas_correctivas, estado_medidas, medico_responsable, supervisor, observaciones)
    values
      (v_emp,(select id from public.trabajadores where empresa_id=v_emp and dni='40011010'),'Accidente Laboral',date '2026-06-05','11:30','Línea de empaque','Empaque','Corte superficial en mano al manipular cúter sin guante de protección','Mano/Dedos','Herramienta manual','Corte / Laceración','Leve',0,false,'Completada','Dotación de guantes anticorte y charla de uso de herramientas','Completada','Carmen Ramírez Lloc','Carlos Mamani Choque','Sin tiempo perdido'),
      (v_emp,(select id from public.trabajadores where empresa_id=v_emp and dni='40011015'),'Accidente Laboral',date '2026-06-23','09:30','Taller de mantenimiento','Mantenimiento','Golpe en rodilla contra estructura metálica sin señalización','Rodilla','Material / objeto','Contusión / Golpe','Moderado',3,false,'En proceso','Señalización de estructuras y delimitación de zona','En proceso','Carmen Ramírez Lloc','Miguel Vargas León','Genera 3 días de descanso'),
      (v_emp,null,'Incidente Peligroso',date '2026-05-28','15:45','Almacén de químicos','Almacén','Derrame menor de solvente por envase mal sellado, sin personas afectadas','No aplica','Sustancia química','Sin lesión','Leve',0,false,'Completada','Reemplazo de envases y kit antiderrame disponible','Completada','-','Pedro Sánchez Díaz','Casi accidente, sin lesionados'),
      (v_emp,null,'Casi-accidente',date '2026-06-14','10:20','Pasillo de producción','Producción','Trabajador resbala sin caída por piso mojado no señalizado','No aplica','Caída mismo nivel','Sin lesión','Leve',0,false,'Completada','Colocación de señales de piso mojado','Completada','-','Carlos Mamani Choque','Reporte de acto/condición'),
      (v_emp,(select id from public.trabajadores where empresa_id=v_emp and dni='40011005'),'Accidente Laboral',date '2026-04-19','13:10','Tablero eléctrico zona B','Mantenimiento eléctrico','Pequeña descarga estática al manipular tablero sin guantes dieléctricos','Mano/Dedos','Electricidad','Quemadura','Leve',0,false,'Completada','Refuerzo en uso de EPP dieléctrico y bloqueo LOTO','Completada','Carmen Ramírez Lloc','Miguel Vargas León','Sin descanso médico');
  end if;

  -- ───────────── 5) INSPECCIONES + HALLAZGOS ─────────────
  if not exists (select 1 from public.inspecciones where empresa_id = v_emp) then
    insert into public.inspecciones (empresa_id, tipo, area, inspector, fecha, resultado, observaciones)
      values (v_emp,'Planeada','Almacén general','Ana Torres Vega',date '2026-06-03','Con observaciones','Inspección mensual de orden y limpieza') returning id into v_i1;
    insert into public.hallazgos_inspeccion (empresa_id, inspeccion_id, descripcion, tipo, nivel_riesgo, accion_correctiva, responsable, fecha_limite, estado) values
      (v_emp,v_i1,'Pasillo de evacuación obstruido con pallets','Condición subestándar','Alto','Liberar pasillo y demarcar zona','Pedro Sánchez Díaz',date '2026-06-10','Cerrado'),
      (v_emp,v_i1,'Extintor sin tarjeta de inspección vigente','Condición subestándar','Medio','Actualizar tarjeta y recarga','Pedro Sánchez Díaz',date '2026-06-15','Abierto');

    insert into public.inspecciones (empresa_id, tipo, area, inspector, fecha, resultado, observaciones)
      values (v_emp,'No planeada','Taller de mantenimiento','Ana Torres Vega',date '2026-06-09','Insatisfactorio','Hallazgos en uso de EPP y herramientas') returning id into v_i2;
    insert into public.hallazgos_inspeccion (empresa_id, inspeccion_id, descripcion, tipo, nivel_riesgo, accion_correctiva, responsable, fecha_limite, estado) values
      (v_emp,v_i2,'Esmeril angular sin guarda de protección','Condición subestándar','Alto','Retirar de uso e instalar guarda','Miguel Vargas León',date '2026-06-12','Cerrado'),
      (v_emp,v_i2,'Soldador sin careta con filtro adecuado','Acto subestándar','Alto','Dotar careta y reinducción','Miguel Vargas León',date '2026-06-14','Abierto'),
      (v_emp,v_i2,'Cables eléctricos expuestos en piso','Condición subestándar','Medio','Canalizar cableado','Andrés Romero Vilca',date '2026-06-20','Abierto');

    insert into public.inspecciones (empresa_id, tipo, area, inspector, fecha, resultado, observaciones)
      values (v_emp,'Planeada','Línea de producción','Ana Torres Vega',date '2026-06-16','Satisfactorio','Sin hallazgos relevantes') returning id into v_i3;

    insert into public.inspecciones (empresa_id, tipo, area, inspector, fecha, resultado, observaciones)
      values (v_emp,'Planeada','Oficinas administrativas','Ana Torres Vega',date '2026-06-22','Con observaciones','Revisión ergonómica de puestos') returning id into v_i4;
    insert into public.hallazgos_inspeccion (empresa_id, inspeccion_id, descripcion, tipo, nivel_riesgo, accion_correctiva, responsable, fecha_limite, estado) values
      (v_emp,v_i4,'Sillas sin soporte lumbar en 3 puestos','Condición subestándar','Bajo','Reemplazo progresivo de sillas','Patricia Mendoza Cruz',date '2026-07-05','Abierto');
  end if;

  -- ───────────── 6) PORTAL DE CONTRATISTAS ─────────────
  -- Requiere haber corrido antes portal_contratistas.sql (crea contratista_registros y codigo_acceso).
  -- Si no existe, se salta sin abortar el resto del seed.
  if to_regclass('public.contratista_registros') is not null
     and not exists (select 1 from public.contratistas where empresa_id = v_emp) then
    insert into public.contratistas (empresa_id, nombre, ruc, rubro, representante, telefono, email, estado, codigo_acceso,
        sctr_empresa_venc, poliza_rc_venc, plan_sst_venc, iper_venc, observaciones)
      values (v_emp,'Servicios Industriales del Sur SAC','20512345671','Mantenimiento mecánico','Roberto Díaz','987200001','contacto@sisur.pe','Activo','SIS-7421',
        date '2026-12-31',date '2026-10-15',date '2026-09-30',date '2026-11-20','Contratista de mantenimiento de equipos') returning id into v_c1;
    insert into public.contratistas (empresa_id, nombre, ruc, rubro, representante, telefono, email, estado, codigo_acceso,
        sctr_empresa_venc, poliza_rc_venc, plan_sst_venc, iper_venc, observaciones)
      values (v_emp,'ElectroAndes Contratistas EIRL','20498765432','Instalaciones eléctricas','Sandra Vega','987200002','ssoma@electroandes.pe','Activo','ELA-3380',
        date '2026-08-31',date '2026-07-31',date '2026-12-15',date '2026-10-01','Trabajos eléctricos especializados') returning id into v_c2;
    insert into public.contratistas (empresa_id, nombre, ruc, rubro, representante, telefono, email, estado, codigo_acceso,
        sctr_empresa_venc, poliza_rc_venc, plan_sst_venc, iper_venc, observaciones)
      values (v_emp,'Limpieza Total Perú SAC','20587654321','Limpieza industrial','Marco Ruiz','987200003','operaciones@limpiezatotal.pe','Activo','LTP-9012',
        date '2026-05-31',date '2026-06-30',date '2026-08-31',date '2026-09-15','SCTR próximo a vencer') returning id into v_c3;
    insert into public.contratistas (empresa_id, nombre, ruc, rubro, representante, telefono, email, estado, codigo_acceso,
        sctr_empresa_venc, poliza_rc_venc, plan_sst_venc, iper_venc, observaciones)
      values (v_emp,'Construcciones y Montajes Lima SRL','20471122334','Obras civiles','Elena Paredes','987200004','sst@cmlima.pe','Inactivo','CML-5567',
        date '2025-12-31',date '2025-11-30',date '2026-01-31',date '2026-02-28','Contrato finalizado') returning id into v_c4;

    insert into public.contratista_registros
      (empresa_id, contratista_id, tipo, titulo, descripcion, fecha, lugar, categoria, reportante, estado, medida_correctiva, observaciones)
    values
      (v_emp,v_c1,'hallazgo','Fuga de aceite en compresor','Se detecta fuga de aceite hidráulico en compresor de la línea 2',date '2026-06-04','Sala de máquinas','Mecánico','Roberto Díaz','Abierto',null,'Requiere repuesto'),
      (v_emp,v_c1,'inspeccion','Inspección preuso de herramientas','Checklist de herramientas manuales del personal en sitio',date '2026-06-06','Taller','Herramientas','Roberto Díaz','Cerrado','Todas conformes','Sin observaciones'),
      (v_emp,v_c1,'documento','SCTR pensión junio 2026','Constancia de SCTR pensión del personal',date '2026-06-01','-','Documento','Roberto Díaz','Cerrado',null,'Vigente'),
      (v_emp,v_c2,'hallazgo','Tablero sin señalización de riesgo eléctrico','Tablero de distribución sin rótulo de peligro',date '2026-06-09','Zona B','Eléctrico','Sandra Vega','Abierto','Colocar señalética','Pendiente de cierre'),
      (v_emp,v_c2,'inspeccion','Inspección de EPP dieléctrico','Verificación de guantes y herramientas aisladas',date '2026-06-11','Subestación','EPP','Sandra Vega','Cerrado','EPP vigente','Conforme'),
      (v_emp,v_c2,'documento','Plan SST ElectroAndes','Plan de seguridad del contratista para el servicio',date '2026-06-02','-','Documento','Sandra Vega','Cerrado',null,'Aprobado'),
      (v_emp,v_c3,'hallazgo','Personal sin mascarilla en zona de polvo','Operario de limpieza sin protección respiratoria',date '2026-06-13','Almacén','Salud','Marco Ruiz','Abierto','Dotar respiradores','Reinducción programada'),
      (v_emp,v_c3,'documento','SCTR próximo a vencer','Recordatorio de renovación de SCTR',date '2026-06-10','-','Documento','Marco Ruiz','Abierto',null,'Vence 31/05 - renovar');
  end if;

  -- ───────────── 7) PROGRAMAS DE VIGILANCIA MÉDICA ─────────────
  -- 7a) Vigilancia Auditiva (audiometría)
  if not exists (select 1 from public.vigilancia_auditiva where empresa_id = v_emp) then
    insert into public.vigilancia_auditiva
      (empresa_id, trabajador_id, fecha_evaluacion, area_puesto, db_exposicion, tipo_epp, fecha_audiometria,
       resultado_audiometria, oido_derecho_db, oido_izquierdo_db, periodicidad, proximo_control, medico_responsable, observaciones)
    values
      (v_emp,(select id from public.trabajadores where empresa_id=v_emp and dni='40011013'),date '2026-05-10','Mantenimiento',88.5,'Tapones auditivos reutilizables',date '2026-05-10','Hipoacusia Leve',28,30,'Semestral',date '2026-11-10','Dr. Quiroz','Vigilancia reforzada por exposición a soldadura'),
      (v_emp,(select id from public.trabajadores where empresa_id=v_emp and dni='40011015'),date '2026-05-10','Mantenimiento',90.0,'Orejeras / Protectores de copa',date '2026-05-10','Hipoacusia Leve',26,29,'Semestral',date '2026-11-10','Dr. Quiroz','Control semestral'),
      (v_emp,(select id from public.trabajadores where empresa_id=v_emp and dni='40011001'),date '2026-05-12','Producción',84.0,'Tapones auditivos desechables',date '2026-05-12','Normal',12,14,'Anual',date '2027-05-12','Dr. Quiroz','Dentro de límites'),
      (v_emp,(select id from public.trabajadores where empresa_id=v_emp and dni='40011010'),date '2026-05-12','Empaque',82.0,'Tapones auditivos desechables',date '2026-05-12','Normal',10,12,'Anual',date '2027-05-12','Dr. Quiroz','Sin alteraciones'),
      (v_emp,(select id from public.trabajadores where empresa_id=v_emp and dni='40011019'),date '2026-05-14','Mantenimiento eléctrico',86.0,'Tapones auditivos reutilizables',date '2026-05-14','Normal',16,18,'Anual',date '2027-05-14','Dr. Quiroz','Control anual');
  end if;

  -- 7b) Vigilancia Disergonómica
  if not exists (select 1 from public.vigilancia_disergonomia where empresa_id = v_emp) then
    insert into public.vigilancia_disergonomia
      (empresa_id, trabajador_id, fecha_evaluacion, area_puesto, tipo_riesgo, metodo_evaluacion, puntuacion,
       nivel_riesgo, medidas_adoptadas, periodicidad, proximo_control, medico_responsable, observaciones)
    values
      (v_emp,(select id from public.trabajadores where empresa_id=v_emp and dni='40011004'),date '2026-05-20','Administración','Pantalla de visualización','RULA',5,'Medio','Pausas activas y ajuste de silla ergonómica','Anual',date '2027-05-20','Dr. Quiroz','Trabajo prolongado con PVD'),
      (v_emp,(select id from public.trabajadores where empresa_id=v_emp and dni='40011012'),date '2026-05-20','Administración','Movimientos repetitivos','Check List OCRA',4,'Bajo','Reposamuñecas y descansos visuales','Anual',date '2027-05-20','Dr. Quiroz','Digitación frecuente'),
      (v_emp,(select id from public.trabajadores where empresa_id=v_emp and dni='40011016'),date '2026-05-21','Recursos Humanos','Postural','REBA',6,'Alto','Rediseño de puesto de trabajo','Semestral',date '2026-11-21','Dr. Quiroz','Requiere intervención ergonómica'),
      (v_emp,(select id from public.trabajadores where empresa_id=v_emp and dni='40011007'),date '2026-05-22','Almacén','Carga física','NIOSH',2.1,'Medio','Capacitación en levantamiento y ayudas mecánicas','Anual',date '2027-05-22','Dr. Quiroz','Estiba de sacos de 50 kg');
  end if;

  -- 7c) Estilos de Vida (riesgo cardiovascular/metabólico)
  if not exists (select 1 from public.vigilancia_estilos_vida where empresa_id = v_emp) then
    insert into public.vigilancia_estilos_vida
      (empresa_id, trabajador_id, fecha_evaluacion, peso, talla, imc, perimetro_abdominal, presion_sistolica,
       presion_diastolica, glucosa, fumador, consume_alcohol, sedentario, nivel_actividad, periodicidad,
       proximo_control, observaciones, medico_responsable)
    values
      (v_emp,(select id from public.trabajadores where empresa_id=v_emp and dni='40011003'),date '2026-04-15',88,1.72,29.7,98,130,85,105,false,false,true,'Sedentario','Semestral',date '2026-10-15','Sobrepeso e hipertensión controlada','Dr. Quiroz'),
      (v_emp,(select id from public.trabajadores where empresa_id=v_emp and dni='40011011'),date '2026-04-15',95,1.78,30.0,104,138,88,110,true,true,true,'Sedentario','Semestral',date '2026-10-15','Obesidad grado I, fumador, derivar a nutrición','Dr. Quiroz'),
      (v_emp,(select id from public.trabajadores where empresa_id=v_emp and dni='40011009'),date '2026-04-16',80,1.70,27.7,95,128,82,98,true,false,true,'Leve','Anual',date '2027-04-16','Sobrepeso, consejería antitabaco','Dr. Quiroz'),
      (v_emp,(select id from public.trabajadores where empresa_id=v_emp and dni='40011017'),date '2026-04-16',70,1.75,22.9,82,118,76,90,false,false,false,'Moderado','Anual',date '2027-04-16','Parámetros saludables','Dr. Quiroz'),
      (v_emp,(select id from public.trabajadores where empresa_id=v_emp and dni='40011018'),date '2026-04-17',78,1.62,29.7,96,140,90,112,false,true,true,'Sedentario','Semestral',date '2026-10-17','HTA en tratamiento, control estricto','Dr. Quiroz');
  end if;

  -- ───────────── 8) INDICADORES DE ACCIDENTABILIDAD SST (2025, 12 meses × 2 áreas) ─────────────
  if not exists (select 1 from public.indicadores_sst_comind where empresa_id = v_emp) then
    insert into public.indicadores_sst_comind
      (empresa_id, anio, mes, area, trabajadores, hh_trabajadas, hh_capacitacion,
       acc_leve, acc_incapacitante, acc_fatal, dias_perdidos, dias_cargados,
       inc_peligrosos, inc_leve, enf_ocupacional)
    select v_emp, 2025, m, a.area, a.trab,
           a.trab * 200,                                          -- horas-hombre trabajadas (~200 h/mes)
           a.trab * 2,                                            -- horas de capacitación
           (case when m in (3,7,10) then 1 else 0 end),           -- acc. leves
           (case when m = 6 then 1 else 0 end),                   -- acc. incapacitantes
           0,                                                     -- acc. fatales
           (case when m = 6 then 6 else 0 end),                   -- días perdidos
           0,                                                     -- días cargados
           (case when m in (4,9) then 1 else 0 end),              -- incidentes peligrosos
           (case when m in (2,5,8,11) then 1 else 0 end),         -- incidentes leves
           (case when m = 8 then 1 else 0 end)                    -- enf. ocupacional
    from generate_series(1,12) as m
    cross join (values ('PRODUCCION',45),('ADMINISTRATIVO',15)) as a(area, trab);
  end if;

  -- ───────────── 9) PROGRAMA ANUAL DE SST ─────────────
  if not exists (select 1 from public.programa_sst where empresa_id = v_emp) then
    insert into public.programa_sst (empresa_id, anio, nombre, url, observacion) values
      (v_emp, 2026, 'Programa Anual de SST 2026', 'https://docs.google.com/document/d/DEMO-PASST-2026/edit', 'Aprobado por el Comité de SST en enero 2026'),
      (v_emp, 2025, 'Programa Anual de SST 2025', 'https://docs.google.com/document/d/DEMO-PASST-2025/edit', 'Ejecutado al 100% — cierre conforme');
  end if;

  raise notice 'Datos de demostración cargados para la empresa %', v_emp;
end $$;
