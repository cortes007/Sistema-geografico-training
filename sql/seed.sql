-- Demo users are rows in public.usuarios only; they are not Supabase Auth identities.
-- Replace these UUIDs with auth.users IDs when RLS requires authenticated users.

INSERT INTO public.usuarios (
  id, nombre_usuario, email, hash_password, nombre_completo, nivel_experiencia
)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'demo_admin', 'seed-only', 'Demo Admin', 'avanzado'),
  ('10000000-0000-0000-0000-000000000002', 'demo_intermedio', 'seed-only', 'Demo Intermedio', 'intermedio'),
  ('10000000-0000-0000-0000-000000000003', 'demo_principiante', 'seed-only', 'Demo Principiante', 'principiante')
ON CONFLICT (id) DO UPDATE SET
  nombre_usuario = EXCLUDED.nombre_usuario,
  nombre_completo = EXCLUDED.nombre_completo,
  nivel_experiencia = EXCLUDED.nivel_experiencia;

INSERT INTO public.eventos_quedadas (
  id, training_spot_id, organizador_id, titulo, descripcion,
  fecha_hora_inicio, fecha_hora_fin
)
SELECT
  '40000000-0000-0000-0000-000000000001',
  spot.id,
  '10000000-0000-0000-0000-000000000001',
  'Quedada de entrenamiento',
  'Entrenamiento comunitario abierto.',
  now() + interval '2 days',
  now() + interval '2 days 2 hours'
FROM public.training_spots AS spot
WHERE spot.leisure = 'fitness_station'
ORDER BY spot.id
LIMIT 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.asistencias_evento (evento_id, usuario_id)
VALUES
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002')
ON CONFLICT (evento_id, usuario_id) DO NOTHING;