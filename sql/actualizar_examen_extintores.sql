-- ════════════════════════════════════════════════════════════════════
--  Actualiza preguntas del examen "Uso de extintores" (Franquicias + Expertos)
--  Preguntas alineadas a la transcripción del video (Módulo 4 - Uso de extintores).
--  Cambios: P2, P6 (solo alternativa), P7, P9, P10.
-- ════════════════════════════════════════════════════════════════════
WITH ex AS (
  SELECT unnest(ARRAY[
    'cc6b6d00-2c57-4088-ad47-1ac0e3448421',
    '29baecb7-459b-47c0-ad22-98d37a3df90b'
  ]::uuid[]) AS id
)
SELECT 1;  -- (el WITH no persiste entre statements; cada UPDATE define sus ids)

-- P2 → tipos de extintor (CO2 / PQS)
UPDATE examen_preguntas SET
  pregunta='Según el video, ¿qué dos tipos de extintores están disponibles en las instalaciones?',
  opcion_a='Extintor de agua y extintor de espuma.',
  opcion_b='Extintor de CO2 (dióxido de carbono) y extintor de PQS (polvo químico seco).',
  opcion_c='Extintor de arena y extintor de gas casero.',
  opcion_d='Solo existe un tipo de extintor para todo.',
  correcta='b'
WHERE examen_id IN ('cc6b6d00-2c57-4088-ad47-1ac0e3448421','29baecb7-459b-47c0-ad22-98d37a3df90b') AND orden=2;

-- P6 → distancia recomendada = 1.5 m (correcta sigue siendo b)
UPDATE examen_preguntas SET
  opcion_b='A una distancia segura de aproximadamente 1.5 metros.',
  correcta='b'
WHERE examen_id IN ('cc6b6d00-2c57-4088-ad47-1ac0e3448421','29baecb7-459b-47c0-ad22-98d37a3df90b') AND orden=6;

-- P7 → usar el extintor disponible más cercano
UPDATE examen_preguntas SET
  pregunta='Aunque cada tipo de incendio tiene un extintor recomendado, ¿qué debes hacer en una emergencia?',
  opcion_a='Buscar el extintor exacto para ese tipo de fuego aunque esté lejos.',
  opcion_b='Utilizar el extintor disponible más cercano para iniciar una respuesta inmediata y segura.',
  opcion_c='Esperar a que llegue personal especializado con el extintor correcto.',
  opcion_d='No usar ningún extintor si no es el recomendado.',
  correcta='b'
WHERE examen_id IN ('cc6b6d00-2c57-4088-ad47-1ac0e3448421','29baecb7-459b-47c0-ad22-98d37a3df90b') AND orden=7;

-- P9 → el extintor debe estar instalado, señalizado y libre de obstrucciones
UPDATE examen_preguntas SET
  pregunta='Según el video, al identificar el extintor más cercano, ¿cómo debe encontrarse?',
  opcion_a='Escondido para que no lo usen por error.',
  opcion_b='Correctamente instalado, señalizado y libre de obstrucciones.',
  opcion_c='Sin el seguro puesto, para usarlo más rápido.',
  opcion_d='En cualquier lugar, no importa la señalización.',
  correcta='b'
WHERE examen_id IN ('cc6b6d00-2c57-4088-ad47-1ac0e3448421','29baecb7-459b-47c0-ad22-98d37a3df90b') AND orden=9;

-- P10 → después de controlar la emergencia, dejar el área limpia y libre de riesgos
UPDATE examen_preguntas SET
  pregunta='Una vez controlada la emergencia, ¿qué debes hacer según el video?',
  opcion_a='Retirarte rápidamente sin revisar nada.',
  opcion_b='Verificar que el área quede limpia, ordenada y libre de riesgos que puedan generar una nueva incidencia.',
  opcion_c='Volver a colocar el extintor usado en su lugar como si estuviera lleno.',
  opcion_d='Apagar las luces y cerrar la puerta del ambiente.',
  correcta='b'
WHERE examen_id IN ('cc6b6d00-2c57-4088-ad47-1ac0e3448421','29baecb7-459b-47c0-ad22-98d37a3df90b') AND orden=10;
