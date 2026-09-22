function toNumber(value) {
    return typeof value === 'number' ? value : Number(value);
}
function mapEventoProximoCercano(row) {
    return {
        id: row.id,
    trainingSpotId: row.training_spot_id,
        organizadorId: row.organizador_id,
        titulo: row.titulo,
        descripcion: row.descripcion,
        fechaHoraInicio: row.fecha_hora_inicio,
        fechaHoraFin: row.fecha_hora_fin,
        fechaCreacion: row.fecha_creacion,
    lugarNombre: row.lugar_nombre,
    lugarDescripcion: row.lugar_descripcion,
    lugarTipo: row.lugar_tipo,
    ciudad: row.ciudad,
    geom: row.geom,
        asistentesConfirmados: toNumber(row.asistentes_confirmados),
    };
}
export class EventoRepository {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    /** Quedadas asociadas a lugares reales de training_spots. */
    async getQuedadas() {
        const result = await this.pool.query(`
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
        COUNT(a.usuario_id)::int AS asistentes_confirmados
      FROM eventos_quedadas e
      INNER JOIN training_spots t ON t.id = e.training_spot_id
      LEFT JOIN asistencias_evento a ON a.evento_id = e.id
      GROUP BY e.id, t.id
      ORDER BY e.fecha_hora_inicio ASC
      `);
        return result.rows.map(mapEventoProximoCercano);
    }
}
