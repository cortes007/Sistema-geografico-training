CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre_usuario TEXT NOT NULL,
  nombre_completo TEXT NOT NULL,
  nivel_experiencia nivel_experiencia NOT NULL,
  foto_perfil_url TEXT,
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now(),
  activo BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT usuarios_nombre_usuario_key UNIQUE (nombre_usuario)
);

CREATE TABLE eventos_quedadas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  training_spot_id VARCHAR REFERENCES public.training_spots (id) ON DELETE CASCADE,
  organizador_id UUID NOT NULL REFERENCES usuarios (id),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  fecha_hora_inicio TIMESTAMPTZ NOT NULL,
  fecha_hora_fin TIMESTAMPTZ,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  tipo_actividad TEXT NOT NULL DEFAULT 'entrenamiento' CHECK (tipo_actividad IN ('entrenamiento', 'running', 'ciclismo')),
  perfil_ruta TEXT CHECK (perfil_ruta IS NULL OR perfil_ruta IN ('foot', 'bike')),
  origen_nombre TEXT CHECK (origen_nombre IS NULL OR char_length(btrim(origen_nombre)) BETWEEN 1 AND 150),
  destino_nombre TEXT CHECK (destino_nombre IS NULL OR char_length(btrim(destino_nombre)) BETWEEN 1 AND 150),
  origen_geom public.geometry(Point, 4326),
  destino_geom public.geometry(Point, 4326),
  ruta_geom public.geometry(LineString, 4326),
  distancia_metros DOUBLE PRECISION CHECK (distancia_metros IS NULL OR distancia_metros >= 0),
  duracion_segundos DOUBLE PRECISION CHECK (duracion_segundos IS NULL OR duracion_segundos >= 0),
  CONSTRAINT eventos_quedadas_rango_fechas CHECK (
    fecha_hora_fin IS NULL OR fecha_hora_fin > fecha_hora_inicio
  ),
  CONSTRAINT eventos_quedadas_actividad_consistencia CHECK (
    (
      tipo_actividad = 'entrenamiento'
      AND training_spot_id IS NOT NULL
    )
    OR (
      tipo_actividad IN ('running', 'ciclismo')
      AND origen_geom IS NOT NULL
      AND destino_geom IS NOT NULL
      AND ruta_geom IS NOT NULL
      AND perfil_ruta = (CASE WHEN tipo_actividad = 'running' THEN 'foot' ELSE 'bike' END)
    )
  )
);

CREATE TABLE asistencias_evento (
  evento_id UUID NOT NULL REFERENCES eventos_quedadas (id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (evento_id, usuario_id)
);
