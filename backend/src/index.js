import { EventoService } from "./application/services/eventoService.js";
import { getPool } from "./infrastructure/db/pool.js";
import { EventoRepository } from "./infrastructure/repositories/eventoRepository.js";
export function createSpatialServices(pool = getPool()) {
    return {
        eventoService: new EventoService(new EventoRepository(pool)),
    };
}
export { closePool, getPool } from "./infrastructure/db/pool.js";
export { EventoService } from "./application/services/eventoService.js";
export { EventoRepository } from "./infrastructure/repositories/eventoRepository.js";
