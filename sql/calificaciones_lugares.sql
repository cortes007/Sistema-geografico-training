CREATE TABLE IF NOT EXISTS public.calificaciones_lugares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lugar_key TEXT NOT NULL CHECK (char_length(lugar_key) BETWEEN 1 AND 500),
  lugar_nombre TEXT NOT NULL CHECK (char_length(btrim(lugar_nombre)) > 0),
  lugar_tipo TEXT NOT NULL DEFAULT 'Lugar deportivo',
  latitud DOUBLE PRECISION NOT NULL CHECK (latitud BETWEEN -90 AND 90),
  longitud DOUBLE PRECISION NOT NULL CHECK (longitud BETWEEN -180 AND 180),
  usuario_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  nombre_usuario TEXT NOT NULL CHECK (char_length(btrim(nombre_usuario)) > 0),
  calificacion SMALLINT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
  comentario TEXT CHECK (comentario IS NULL OR char_length(comentario) <= 1000),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT calificaciones_lugares_usuario_lugar_key UNIQUE (lugar_key, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_calificaciones_lugares_lugar_fecha
  ON public.calificaciones_lugares (lugar_key, fecha_creacion DESC);

CREATE OR REPLACE FUNCTION public.actualizar_fecha_calificacion_lugar()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.fecha_actualizacion = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calificaciones_lugares_fecha_actualizacion
  ON public.calificaciones_lugares;
CREATE TRIGGER trg_calificaciones_lugares_fecha_actualizacion
  BEFORE UPDATE ON public.calificaciones_lugares
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_fecha_calificacion_lugar();

ALTER TABLE public.calificaciones_lugares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Las calificaciones son visibles para todos"
  ON public.calificaciones_lugares;
CREATE POLICY "Las calificaciones son visibles para todos"
  ON public.calificaciones_lugares
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Cada usuario crea su propia calificacion"
  ON public.calificaciones_lugares;
CREATE POLICY "Cada usuario crea su propia calificacion"
  ON public.calificaciones_lugares
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Cada usuario actualiza su propia calificacion"
  ON public.calificaciones_lugares;
CREATE POLICY "Cada usuario actualiza su propia calificacion"
  ON public.calificaciones_lugares
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

GRANT SELECT ON public.calificaciones_lugares TO anon, authenticated;
GRANT INSERT, UPDATE ON public.calificaciones_lugares TO authenticated;

NOTIFY pgrst, 'reload schema';
