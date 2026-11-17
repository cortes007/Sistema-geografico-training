CREATE INDEX idx_eventos_quedadas_training_spot_id ON eventos_quedadas (training_spot_id);

CREATE INDEX idx_eventos_quedadas_organizador_id ON eventos_quedadas (organizador_id);

CREATE INDEX idx_eventos_quedadas_fecha_hora_inicio ON eventos_quedadas (fecha_hora_inicio);

CREATE INDEX idx_eventos_quedadas_tipo_actividad ON eventos_quedadas (tipo_actividad, fecha_hora_inicio);

CREATE INDEX idx_eventos_quedadas_origen_geom_gist ON eventos_quedadas USING GIST (origen_geom) WHERE origen_geom IS NOT NULL;

CREATE INDEX idx_asistencias_evento_usuario_id ON asistencias_evento (usuario_id);
