CREATE OR REPLACE FUNCTION public.listar_quedadas()
RETURNS TABLE (
  id uuid,
  training_spot_id varchar,
  organizador_id uuid,
  titulo text,
  descripcion text,
  fecha_hora_inicio timestamptz,
  fecha_hora_fin timestamptz,
  fecha_creacion timestamptz,
  lugar_nombre text,
  lugar_descripcion text,
  lugar_tipo text,
  ciudad text,
  geom geometry,
  asistentes_confirmados bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    e.id,
    e.training_spot_id,
    e.organizador_id,
    e.titulo,
    e.descripcion,
    e.fecha_hora_inicio,
    e.fecha_hora_fin,
    e.fecha_creacion,
    t.name AS lugar_nombre,
    t.description AS lugar_descripcion,
    t.leisure AS lugar_tipo,
    t.city AS ciudad,
    t.geom,
    COUNT(a.usuario_id) AS asistentes_confirmados
  FROM public.eventos_quedadas AS e
  INNER JOIN public.training_spots AS t
    ON t.id = e.training_spot_id
  LEFT JOIN public.asistencias_evento AS a
    ON a.evento_id = e.id
  GROUP BY e.id, t.id
  ORDER BY e.fecha_hora_inicio;
$$;

CREATE OR REPLACE FUNCTION public.listar_eventos_proximos(
  training_spot_id_param varchar DEFAULT NULL
)
RETURNS TABLE (
  id uuid, training_spot_id varchar, organizador_id uuid, titulo text,
  descripcion text, fecha_hora_inicio timestamptz, fecha_hora_fin timestamptz,
  fecha_creacion timestamptz, lugar_nombre text, lugar_descripcion text,
  lugar_tipo text, ciudad text, geom geometry, asistentes_confirmados bigint
)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT e.id, e.training_spot_id, e.organizador_id, e.titulo, e.descripcion,
    e.fecha_hora_inicio, e.fecha_hora_fin, e.fecha_creacion, t.name,
    t.description, t.leisure, t.city, t.geom, COUNT(a.usuario_id)
  FROM public.eventos_quedadas e
  INNER JOIN public.training_spots t ON t.id = e.training_spot_id
  LEFT JOIN public.asistencias_evento a ON a.evento_id = e.id
  WHERE e.fecha_hora_inicio > now()
    AND (training_spot_id_param IS NULL OR e.training_spot_id = training_spot_id_param)
  GROUP BY e.id, t.id
  ORDER BY e.fecha_hora_inicio;
$$;

DROP FUNCTION IF EXISTS public.confirmar_asistencia(uuid, uuid);
DROP FUNCTION IF EXISTS public.cancelar_asistencia(uuid, uuid);

CREATE OR REPLACE FUNCTION public.confirmar_asistencia(
  evento_id_param uuid
)
RETURNS void
LANGUAGE sql
VOLATILE
SECURITY INVOKER
AS $$
  INSERT INTO public.asistencias_evento (evento_id, usuario_id)
  SELECT evento_id_param, auth.uid()
  FROM public.eventos_quedadas
  WHERE id = evento_id_param
    AND fecha_hora_inicio > now()
  ON CONFLICT (evento_id, usuario_id) DO NOTHING;
$$;

CREATE OR REPLACE FUNCTION public.cancelar_asistencia(
  evento_id_param uuid
)
RETURNS void
LANGUAGE sql
VOLATILE
SECURITY INVOKER
AS $$
  DELETE FROM public.asistencias_evento
  WHERE evento_id = evento_id_param
    AND usuario_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.listar_quedadas() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.listar_eventos_proximos(varchar) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_asistencia(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_asistencia(uuid) TO authenticated;

-- Actualiza el schema cache de PostgREST para que las RPC estén disponibles
-- inmediatamente después de ejecutar este script en Supabase.
NOTIFY pgrst, 'reload schema';
