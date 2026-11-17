export type UUID = string;
export type TipoActividad = 'entrenamiento' | 'running' | 'ciclismo';
export type PerfilRuta = 'foot' | 'bike';

export interface GeoPointInput {
  latitude: number;
  longitude: number;
}

export type EventoRow = {
  id: UUID;
  training_spot_id: string | null;
  organizador_id: UUID;
  titulo: string;
  descripcion: string | null;
  fecha_hora_inicio: string;
  fecha_hora_fin: string | null;
  fecha_creacion: string;
  tipo_actividad: TipoActividad;
  perfil_ruta: PerfilRuta | null;
  origen_nombre: string | null;
  destino_nombre: string | null;
  origen_geom: unknown;
  destino_geom: unknown;
  ruta_geom: unknown;
  distancia_metros: number | null;
  duracion_segundos: number | null;
};

export type AsistenciaRow = {
  evento_id: UUID;
  usuario_id: UUID;
  fecha_registro: string;
};

export type CalificacionLugarRow = {
  id: UUID;
  lugar_key: string;
  training_spot_id: string | null;
  lugar_nombre: string;
  lugar_tipo: string;
  latitud: number;
  longitud: number;
  usuario_id: UUID;
  nombre_usuario: string;
  calificacion: number;
  comentario: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
};

export type QuedadaRow = EventoRow & {
  lugar_nombre: string;
  lugar_descripcion: string | null;
  lugar_tipo: string | null;
  ciudad: string | null;
  geom: unknown;
  asistentes_confirmados: number;
};

export interface EventoQuedada {
  id: UUID;
  trainingSpotId: string | null;
  organizadorId: UUID;
  titulo: string;
  descripcion: string | null;
  fechaHoraInicio: string;
  fechaHoraFin: string | null;
  fechaCreacion: string;
  lugarNombre: string;
  lugarDescripcion: string | null;
  lugarTipo: string | null;
  ciudad: string | null;
  geom: unknown;
  asistentesConfirmados: number;
  tipoActividad: TipoActividad;
  perfilRuta: PerfilRuta | null;
  origenNombre: string | null;
  destinoNombre: string | null;
  origenGeom: unknown;
  destinoGeom: unknown;
  rutaGeom: unknown;
  distanciaMetros: number | null;
  duracionSegundos: number | null;
}

export interface AsistenciaEvento {
  eventoId: UUID;
  usuarioId: UUID;
  fechaRegistro: string;
}

export type CrearEventoDTO = {
  trainingSpotId?: string | null;
  tipoActividad?: TipoActividad;
  perfilRuta?: PerfilRuta | null;
  titulo: string;
  descripcion?: string | null;
  fechaHoraInicio: string;
  fechaHoraFin?: string | null;
  origenNombre?: string | null;
  destinoNombre?: string | null;
  origen?: GeoPointInput | null;
  destino?: GeoPointInput | null;
  rutaCoordenadas?: Array<[number, number]> | null;
  distanciaMetros?: number | null;
  duracionSegundos?: number | null;
};

export type ActualizarEventoDTO = Partial<CrearEventoDTO>;

export type EventoInput = CrearEventoDTO;
export type Quedada = EventoQuedada;
export type EventoInsert = Omit<EventoRow, 'id' | 'fecha_creacion'>;
export type AsistenciaInsert = Omit<AsistenciaRow, 'fecha_registro'>;
export type CalificacionLugarInsert = Omit<
  CalificacionLugarRow,
  'id' | 'fecha_creacion' | 'fecha_actualizacion'
>;

export type TrainingSpotRow = {
  id: string;
  name: string | null;
  leisure: string | null;
  description: string | null;
  city: string | null;
  geom: unknown;
};

export type SpotEnlaceRow = {
  id: UUID;
  training_spot_id: string;
  website_url: string | null;
  instagram_url: string | null;
  fuente: 'osm' | 'oficial' | 'comunidad';
  actualizado_por: UUID | null;
  fecha_actualizacion: string;
};

export type SpotEnlaceInsert = Omit<SpotEnlaceRow, 'id' | 'fecha_actualizacion'>;

export type CalificacionComponenteRow = {
  id: UUID;
  calificacion_id: UUID;
  training_spot_id: string;
  componente: string;
  puntaje: number;
};

export type CalificacionComponenteInsert = Omit<CalificacionComponenteRow, 'id'>;

export type ResumenComponenteRow = {
  componente: string;
  promedio: number;
  cantidad: number;
};

export type Database = {
  public: {
    Tables: {
      training_spots: {
        Row: TrainingSpotRow;
        Insert: Partial<TrainingSpotRow>;
        Update: Partial<TrainingSpotRow>;
        Relationships: [];
      };
      eventos_quedadas: { Row: EventoRow; Insert: EventoInsert; Update: Partial<EventoInsert>; Relationships: [] };
      asistencias_evento: { Row: AsistenciaRow; Insert: AsistenciaInsert; Update: Partial<AsistenciaInsert>; Relationships: [] };
      calificaciones_lugares: {
        Row: CalificacionLugarRow;
        Insert: CalificacionLugarInsert;
        Update: Partial<CalificacionLugarInsert>;
        Relationships: [];
      };
      spot_enlaces: {
        Row: SpotEnlaceRow;
        Insert: SpotEnlaceInsert;
        Update: Partial<SpotEnlaceInsert>;
        Relationships: [];
      };
      calificaciones_componentes: {
        Row: CalificacionComponenteRow;
        Insert: CalificacionComponenteInsert;
        Update: Partial<CalificacionComponenteInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      listar_quedadas: {
        Args: Record<string, never>;
        Returns: QuedadaRow[];
      };
      listar_eventos_proximos: {
        Args: { training_spot_id_param?: string | null };
        Returns: QuedadaRow[];
      };
      listar_calificaciones_agregadas_lugares: {
        Args: Record<string, never>;
        Returns: {
          training_spot_id: string;
          average_rating: number;
          rating_count: number;
          ranking_rating: number;
        }[];
      };
      listar_resumen_componentes_spot: {
        Args: { training_spot_id_param: string };
        Returns: ResumenComponenteRow[];
      };
      confirmar_asistencia: {
        Args: { evento_id_param: UUID };
        Returns: undefined;
      };
      cancelar_asistencia: {
        Args: { evento_id_param: UUID };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};