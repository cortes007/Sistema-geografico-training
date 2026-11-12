CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.contar_asistentes_evento(evento_id_param uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT pg_catalog.count(*)::bigint
  FROM public.asistencias_evento
  WHERE evento_id = evento_id_param;
$$;

REVOKE ALL ON FUNCTION private.contar_asistentes_evento(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.contar_asistentes_evento(uuid) TO anon, authenticated;

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
  geom public.geometry,
  asistentes_confirmados bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
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
    private.contar_asistentes_evento(e.id) AS asistentes_confirmados
  FROM public.eventos_quedadas AS e
  INNER JOIN public.training_spots AS t
    ON t.id = e.training_spot_id
  ORDER BY e.fecha_hora_inicio;
$$;

CREATE OR REPLACE FUNCTION public.listar_eventos_proximos(
  training_spot_id_param varchar DEFAULT NULL
)
RETURNS TABLE (
  id uuid, training_spot_id varchar, organizador_id uuid, titulo text,
  descripcion text, fecha_hora_inicio timestamptz, fecha_hora_fin timestamptz,
  fecha_creacion timestamptz, lugar_nombre text, lugar_descripcion text,
  lugar_tipo text, ciudad text, geom public.geometry, asistentes_confirmados bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
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
    private.contar_asistentes_evento(e.id) AS asistentes_confirmados
  FROM public.eventos_quedadas AS e
  INNER JOIN public.training_spots AS t
    ON t.id = e.training_spot_id
  WHERE e.fecha_hora_inicio > pg_catalog.now()
    AND (training_spot_id_param IS NULL OR e.training_spot_id = training_spot_id_param)
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
SET search_path = ''
AS $$
  INSERT INTO public.asistencias_evento (evento_id, usuario_id)
  SELECT evento_id_param, (SELECT auth.uid())
  FROM public.eventos_quedadas
  WHERE id = evento_id_param
    AND fecha_hora_inicio > pg_catalog.now()
  ON CONFLICT (evento_id, usuario_id) DO NOTHING;
$$;

CREATE OR REPLACE FUNCTION public.cancelar_asistencia(
  evento_id_param uuid
)
RETURNS void
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
  DELETE FROM public.asistencias_evento
  WHERE evento_id = evento_id_param
    AND usuario_id = (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION public.listar_quedadas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_quedadas() TO anon, authenticated;

REVOKE ALL ON FUNCTION public.listar_eventos_proximos(varchar) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_eventos_proximos(varchar) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.confirmar_asistencia(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirmar_asistencia(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.cancelar_asistencia(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancelar_asistencia(uuid) TO authenticated;

-- Actualiza el schema cache de PostgREST para que las RPC estén disponibles
-- inmediatamente después de ejecutar este script en Supabase.
NOTIFY pgrst, 'reload schema';
