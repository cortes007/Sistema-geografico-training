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
  geom jsonb,
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
    t.descripcion AS lugar_descripcion,
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

CREATE OR REPLACE FUNCTION public.confirmar_asistencia(
  evento_id_param uuid,
  usuario_id_param uuid
)
RETURNS void
LANGUAGE sql
VOLATILE
SECURITY INVOKER
AS $$
  INSERT INTO public.asistencias_evento (evento_id, usuario_id)
  VALUES (evento_id_param, usuario_id_param)
  ON CONFLICT (evento_id, usuario_id) DO NOTHING;
$$;

CREATE OR REPLACE FUNCTION public.cancelar_asistencia(
  evento_id_param uuid,
  usuario_id_param uuid
)
RETURNS void
LANGUAGE sql
VOLATILE
SECURITY INVOKER
AS $$
  DELETE FROM public.asistencias_evento
  WHERE evento_id = evento_id_param
    AND usuario_id = usuario_id_param;
$$;

GRANT EXECUTE ON FUNCTION public.listar_quedadas() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_asistencia(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_asistencia(uuid, uuid) TO authenticated;
