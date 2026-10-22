## Calificaciones de lugares

Las personas registradas pueden dejar una calificación de una a cinco estrellas y un comentario opcional en el detalle de un punto seleccionado. Cada usuario puede mantener una opinión por lugar y actualizarla posteriormente; las opiniones publicadas son visibles para todas las personas.

Para habilitar la funcionalidad en Supabase, ejecuta [`sql/calificaciones_lugares.sql`](../sql/calificaciones_lugares.sql) en el SQL Editor del proyecto. El script crea la tabla `public.calificaciones_lugares`, configura sus políticas de seguridad RLS y permite consultar opiniones públicamente, restringiendo la creación y actualización a la persona autenticada propietaria de cada opinión.

## Diseño y accesibilidad

El rediseño responsive, sus decisiones visuales y el checklist de accesibilidad están documentados en la [bitácora de rediseño de UI](./rediseno-ui.md).

## Ubicación, lugares cercanos y rutas

El botón **Ubicación actual** solicita permiso del navegador y centra el mapa en una ubicación aproximada con un radio visual de 3 km. Si se deniega el permiso, el dispositivo no puede determinar la posición o la consulta vence, el geoportal muestra un mensaje con la causa y sugerencias para volver a intentarlo o habilitar el permiso en los ajustes del navegador y del dispositivo.

La geolocalización requiere un contexto seguro: abre el sitio con HTTPS (localhost también está permitido) y evita navegadores internos de aplicaciones, que pueden bloquear o limitar el permiso. Si el navegador pregunta, permite el acceso a la ubicación para este sitio.

La alternativa manual **Elegir ubicación en el mapa** se contempla para los casos en que no se conceda el permiso. Actualmente no está disponible como control de ubicación: hacer clic en el mapa permite capturar coordenadas o seleccionar un lugar, pero no establece la ubicación del usuario ni sustituye el botón **Ubicación actual**.

El sidebar muestra hasta tres lugares calificados del radio, ordenados por una media bayesiana que considera tanto el promedio como la cantidad de opiniones y respeta los filtros de tipo activos. Los lugares sin calificaciones no entran en el ranking.

Para habilitar el ranking en Supabase, ejecuta [`sql/lugares_cercanos_mejor_calificados.sql`](../sql/lugares_cercanos_mejor_calificados.sql) después de crear `public.calificaciones_lugares` con el script anterior. El script agrega `training_spot_id`, intenta asociar opiniones históricas por nombre, tipo y cercanía de hasta 30 m y crea la RPC `listar_calificaciones_agregadas_lugares`. Solo se devuelven promedios y recuentos agregados; el filtrado geográfico y la distancia se calculan en el navegador, por lo que la ubicación del usuario no se envía a Supabase.

El botón **Cómo llegar** dibuja una ruta peatonal morada usando el endpoint de mismo origen `/api/routes/foot` (o el valor de mismo origen indicado en `VITE_ROUTE_API_URL`). Agrega las variables de [`backend/.env.example`](../backend/.env.example) a tu `backend/.env` existente —sin reemplazar otras variables como `DATABASE_URL`— y configura `ROUTING_ENGINE_URL` únicamente con la URL base del servicio OSRM-compatible, sin paths; por ejemplo, `https://routing.openstreetmap.de`. Configura `ROUTING_USER_AGENT` con un identificador de la aplicación; por defecto se usa `Geoportal-Valle-de-Aburra/1.0`, que se envía como cabecera `User-Agent` al motor de rutas. Para el perfil `foot`, el backend agrega `/routed-foot/route/v1/foot/` y las coordenadas al URL base.

### Ejecución y Orquestación en Desarrollo
Para que la funcionalidad opere en el entorno local, deben estar en ejecución simultánea el frontend y el backend de rutas:
1. **Opción automática (PowerShell):** Ejecuta `./dev.ps1` desde la raíz del proyecto. El script abrirá el backend en una ventana secundaria de PowerShell y levantará Vite en la terminal actual.
2. **Opción manual (dos terminales):**
   - Terminal 1: `npm run start:routes --prefix backend` (escucha en `http://127.0.0.1:3001`).
   - Terminal 2: `npm run dev --prefix Geoportal-aburra` (escucha en `http://localhost:5173`).

En desarrollo, Vite reenvía `/api` al servicio de rutas (`http://127.0.0.1:3001`). El archivo `vite.config.js` intercepta el evento `error` del proxy: si el backend no está en ejecución, Vite emite una advertencia descriptiva en la terminal y responde HTTP 503 con JSON estructurado (`{"error":"El servicio de rutas no está disponible. Asegúrate de ejecutar el backend con npm run start:routes."}`).

La API responde con `coordinates` como pares `[longitud, latitud]`, `distanceMeters` y `durationSeconds`. El navegador rechaza endpoints de otro origen para no enviar la ubicación del usuario directamente a un tercero.

### Manejo de Errores y Feedback en Frontend
`routingService.js` captura excepciones de conexión (`TypeError: Failed to fetch`) y códigos de estado HTTP de indisponibilidad temporal (502, 503, 504), devolviendo mensajes claros y localizados en español. En la interfaz (`App.jsx`), si el usuario pulsa **Cómo llegar** sin ubicación establecida y la geolocalización no se concede o falla, la tarjeta de detalle muestra la alerta: *"Debes conceder acceso a tu ubicación actual para calcular la ruta peatonal."*, evitando botones inertes.

### Pruebas Automatizadas
- **Frontend:** Ejecuta `npm test --prefix Geoportal-aburra` para correr la suite con Vitest (incluye pruebas unitarias mockeadas para `routingService` y utilidades de lugares).
- **Backend:** Ejecuta `npm test --prefix backend` para correr la suite con el test runner nativo de Node.js (17 pruebas cubriendo timeout 504, 502, 404 NoRoute, rate limiting y caché en memoria).

El backend aplica un rate limit por IP con ventana fija: `RATE_LIMIT_MAX` define el máximo de solicitudes por IP (por defecto `30`) y `RATE_LIMIT_WINDOW_MS` la duración de la ventana (por defecto `60000` ms). Al excederlo responde HTTP 429 con `Retry-After`. La IP se toma de la conexión (`req.socket.remoteAddress`); solo se usa el primer valor de `X-Forwarded-For` cuando `TRUST_PROXY=true`. Las entradas expiradas se limpian periódicamente.

Las rutas exitosas se guardan en una caché en memoria. `ROUTE_CACHE_TTL_MS` define su duración (por defecto `600000` ms) y `ROUTE_CACHE_MAX_ENTRIES` el máximo de entradas (por defecto `500`); con capacidad llena se descarta la más antigua. Solo se guardan respuestas 200, las coordenadas se redondean a cuatro decimales únicamente para la clave de caché y una consulta fallida al caché se envía al motor con las coordenadas originales. Un valor `0` en TTL o cantidad máxima desactiva la caché. Las respuestas se copian al guardar y devolver para evitar mutaciones compartidas.

## Estructura del proyecto

```text
Gestor geografico gym and calistenic/
├── .gitignore
├── docs/
│   └── overpass.md
├── README.md
└── Geoportal-aburra/
    ├── public/
    │   └── data/
    ├── src/
    │   ├── assets/
    │   ├── components/
    │   │   ├── map/
    │   │   ├── sidebar/
    │   │   └── ui/
    │   ├── config/
    │   ├── constants/
    │   ├── context/
    │   ├── hooks/
    │   └── utils/gis/
    ├── package.json
    ├── vite.config.js
    └── index.html
```

## Estado del desarrollo

La estructura inicial del geoportal y el registro de sistemas de referencia están preparados. La implementación completa del visor, la carga de capas, la lectura de archivos `.prj`, la reproyección y la captura de coordenadas se desarrollará sobre los componentes, hooks y utilidades ubicados en `src/`.

## Licencia

El código de este proyecto se desarrolla con fines académicos. Los datos procedentes de OpenStreetMap mantienen sus condiciones de uso y licencia ODbL.
