export class EventoService {
    eventos;
    constructor(eventos) {
        this.eventos = eventos;
    }
    async getQuedadas() {
        return this.eventos.getQuedadas();
    }
}
