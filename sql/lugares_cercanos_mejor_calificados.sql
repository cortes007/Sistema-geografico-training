ALTER TABLE public.calificaciones_lugares
  ADD COLUMN IF NOT EXISTS training_spot_id TEXT;

CREATE INDEX IF NOT EXISTS idx_calificaciones_lugares_training_spot_id
  ON public.calificaciones_lugares (training_spot_id);

WITH legacy_matches AS (
  SELECT
    r.id AS rating_id,
    t.id::TEXT AS spot_id,
    ROW_NUMBER() OVER (
      PARTITION BY r.id
      ORDER BY ST_Distance(
        spot.location::geography,
        ST_SetSRID(ST_MakePoint(r.longitud, r.latitud), 4326)::geography
      ), t.id::TEXT
    ) AS match_rank
  FROM public.calificaciones_lugares AS r
  JOIN public.training_spots AS t
    ON t.geom IS NOT NULL
  CROSS JOIN LATERAL (SELECT to_jsonb(t) AS properties) AS row_data
  CROSS JOIN LATERAL (
    SELECT ST_Transform(ST_PointOnSurface(t.geom), 4326) AS location
  ) AS spot
  WHERE r.training_spot_id IS NULL
    AND LOWER(BTRIM(r.lugar_nombre)) = LOWER(BTRIM(COALESCE(
      NULLIF(row_data.properties ->> 'name', ''),
      NULLIF(row_data.properties ->> 'addr:city', ''),
      'Punto de entrenamiento'
    )))
    AND LOWER(BTRIM(r.lugar_tipo)) = LOWER(BTRIM(COALESCE(
      NULLIF(row_data.properties ->> 'category', ''),
      NULLIF(row_data.properties ->> 'leisure', ''),
      NULLIF(row_data.properties ->> 'sport', ''),
      NULLIF(row_data.properties ->> 'amenity', ''),
      'calistenia'
    )))
    AND ST_DWithin(
      spot.location::geography,
      ST_SetSRID(ST_MakePoint(r.longitud, r.latitud), 4326)::geography,
      30
    )
),
best_legacy_matches AS (
  SELECT rating_id, spot_id
  FROM legacy_matches
  WHERE match_rank = 1
)
UPDATE public.calificaciones_lugares AS r
SET training_spot_id = matches.spot_id
FROM best_legacy_matches AS matches
WHERE r.id = matches.rating_id;

CREATE OR REPLACE FUNCTION public.listar_calificaciones_agregadas_lugares()
RETURNS TABLE (
  training_spot_id TEXT,
  average_rating DOUBLE PRECISION,
  rating_count BIGINT,
  ranking_rating DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  WITH global_rating AS (
    SELECT AVG(calificacion)::DOUBLE PRECISION AS average
    FROM public.calificaciones_lugares
  ),
  ratings_by_spot AS (
    SELECT
      training_spot_id,
      AVG(calificacion)::DOUBLE PRECISION AS average_rating,
      COUNT(*)::BIGINT AS rating_count
    FROM public.calificaciones_lugares
    WHERE training_spot_id IS NOT NULL
    GROUP BY training_spot_id
  )
  SELECT
    ratings_by_spot.training_spot_id,
    ratings_by_spot.average_rating,
    ratings_by_spot.rating_count,
    (
      ratings_by_spot.rating_count::DOUBLE PRECISION
      / (ratings_by_spot.rating_count + 3)
    ) * ratings_by_spot.average_rating
    + (
      3::DOUBLE PRECISION / (ratings_by_spot.rating_count + 3)
    ) * COALESCE(global_rating.average, 0)
  FROM ratings_by_spot
  CROSS JOIN global_rating;
$$;

GRANT EXECUTE ON FUNCTION public.listar_calificaciones_agregadas_lugares()
  TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
