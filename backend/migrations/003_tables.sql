CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre_usuario TEXT NOT NULL,
  email TEXT NOT NULL,
  hash_password TEXT NOT NULL,
  nombre_completo TEXT NOT NULL,
  nivel_experiencia nivel_experiencia NOT NULL,
  foto_perfil_url TEXT,
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now(),
  activo BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT usuarios_nombre_usuario_key UNIQUE (nombre_usuario),
  CONSTRAINT usuarios_email_key UNIQUE (email)
);

CREATE TABLE eventos_quedadas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  training_spot_id VARCHAR NOT NULL REFERENCES public.training_spots (id) ON DELETE CASCADE,
  organizador_id UUID NOT NULL REFERENCES usuarios (id),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  fecha_hora_inicio TIMESTAMPTZ NOT NULL,
  fecha_hora_fin TIMESTAMPTZ,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT eventos_quedadas_rango_fechas CHECK (
    fecha_hora_fin IS NULL OR fecha_hora_fin > fecha_hora_inicio
  )
);

CREATE TABLE asistencias_evento (
  evento_id UUID NOT NULL REFERENCES eventos_quedadas (id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (evento_id, usuario_id)
);
