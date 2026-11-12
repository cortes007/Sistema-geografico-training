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

## Seguridad RLS, Migraciones y RPCs en Supabase

### Trazabilidad de migraciones (`supabase/migrations/`)
La base de datos de Supabase (`agxaidzgnbgnzihefbdf`) mantiene migraciones versionadas en Git bajo [`supabase/migrations/`](../supabase/migrations/) (manteniendo ignorados `supabase/.temp/` y `node_modules/` en [`.gitignore`](../.gitignore)):
1. `20261112220341_baseline_social_rls_snapshot.sql`: Snapshot base previo al endurecimiento de seguridad.
2. `20261112223104_rls_and_schema_hardening.sql`: Endurecimiento de esquema (`fecha_hora_fin` nullable en `eventos_quedadas`, `CHECK` de rango de fechas y longitud de `titulo`/`descripcion`), habilitación de RLS + `REVOKE ALL` en `public.schema_migrations`, revocación de privilegios excesivos en `public`, políticas RLS optimizadas con `(select auth.uid())` y `WITH CHECK` explícito, eliminación del índice duplicado `training_spots_geom_idx` e índice `idx_eventos_quedadas_training_spot_id`.
3. `20261112225647_functions_security_hardening.sql`: Creación del esquema `private` (no expuesto por PostgREST) y del helper `private.contar_asistentes_evento(uuid)`, fijación de `SET search_path = ''` en las funciones `public`, endurecimiento del trigger `public.crear_perfil_usuario()` con fallback seguro a `'principiante'` y revocación de `EXECUTE` para `PUBLIC`/`anon`/`authenticated`, y eliminación de la función obsoleta `public.buscar_eventos_proximos(double precision, double precision, double precision)`.

Los scripts de referencia en [`sql/functions.sql`](../sql/functions.sql), [`sql/calificaciones_lugares.sql`](../sql/calificaciones_lugares.sql), [`sql/lugares_cercanos_mejor_calificados.sql`](../sql/lugares_cercanos_mejor_calificados.sql) y [`backend/migrations/003_tables.sql`](../backend/migrations/003_tables.sql) se mantienen sincronizados con estas definiciones.

### Modelo RLS vigente y conteo privado de asistencias
- **`public.schema_migrations`:** RLS habilitado y cero privilegios para `PUBLIC`, `anon` y `authenticated`.
- **`public.usuarios`:** Acceso `SELECT`, `INSERT` y `UPDATE` exclusivamente para `authenticated` cuando `(select auth.uid()) = id` (sin lectura entre usuarios ni acceso de `anon`).
- **`public.eventos_quedadas`:** Lectura pública (`anon, authenticated`); `INSERT` restringido a `authenticated` con `(select auth.uid()) = organizador_id AND fecha_hora_inicio > now()`; `UPDATE` y `DELETE` restringidos al organizador (`USING` y `WITH CHECK`).
- **`public.asistencias_evento`:** Lectura y escritura privadas (`authenticated`, `(select auth.uid()) = usuario_id`) para evitar filtrar `usuario_id` entre asistentes o hacia `anon`.
- **Conteo agregado seguro (`private.contar_asistentes_evento(uuid)`):** Las RPC `listar_quedadas()` y `listar_eventos_proximos(varchar)` operan con `SECURITY INVOKER` y `SET search_path = ''`, delegando únicamente el conteo agregado en `private.contar_asistentes_evento(uuid)` (`SECURITY DEFINER`, `SET search_path = ''`), de modo que visitantes `anon` y usuarios autenticados reciben `asistentes_confirmados` real sin exponer filas de `asistencias_evento`.
- **`public.calificaciones_lugares`:** Lectura pública (`anon, authenticated`); `INSERT` y `UPDATE` restringidos a `authenticated` con `(select auth.uid()) = usuario_id`.
- **`public.training_spots`:** Lectura pública (`anon, authenticated`) sin inserción directa desde cliente tras eliminar la política `"Crear spots"`.

### Verificación SQL automatizada
- La suite transaccional (`BEGIN; ... ROLLBACK;`) ubicada en [`supabase/tests/rls_security_checks.sql`](../supabase/tests/rls_security_checks.sql) verifica aislamiento de `anon`, lectura privada por usuario, integridad de `organizador_id`/`usuario_id`, restricciones temporales y `fecha_hora_fin = NULL` en `eventos_quedadas`, bloqueo de escritura en `training_spots`, conteo agregado en `listar_eventos_proximos()` y fallback seguro de `crear_perfil_usuario()`.

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
