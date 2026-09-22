export type UUID = string;
export type EventoRow = {
  id: UUID;
  training_spot_id: string;
  organizador_id: UUID;
  titulo: string;
  descripcion: string | null;
  fecha_hora_inicio: string;
  fecha_hora_fin: string | null;
  fecha_creacion: string;
};

export type AsistenciaRow = {
  evento_id: UUID;
  usuario_id: UUID;
  fecha_registro: string;
};

export type QuedadaRow = EventoRow & {
  lugar_nombre: string;
  lugar_descripcion: string | null;
  lugar_tipo: string | null;
  ciudad: string | null;
  geom: unknown;
  asistentes_confirmados: number;
};

export type EventoInput = {
  trainingSpotId: string;
  organizadorId: UUID;
  titulo: string;
  descripcion?: string | null;
  fechaHoraInicio: string;
  fechaHoraFin?: string | null;
};

export type Quedada = {
  id: UUID;
  trainingSpotId: string;
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
};

export type EventoInsert = Omit<EventoRow, 'id' | 'fecha_creacion'>;
export type AsistenciaInsert = Omit<AsistenciaRow, 'fecha_registro'>;

export type Database = {
  public: {
    Tables: {
      eventos_quedadas: { Row: EventoRow; Insert: EventoInsert; Update: Partial<EventoInsert>; Relationships: [] };
      asistencias_evento: { Row: AsistenciaRow; Insert: AsistenciaInsert; Update: Partial<AsistenciaInsert>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      listar_quedadas: {
        Args: Record<string, never>;
        Returns: QuedadaRow[];
      };
      confirmar_asistencia: {
        Args: { evento_id_param: UUID; usuario_id_param: UUID };
        Returns: undefined;
      };
      cancelar_asistencia: {
        Args: { evento_id_param: UUID; usuario_id_param: UUID };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};