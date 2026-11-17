## Calificaciones de lugares

Las personas registradas pueden dejar una calificación de una a cinco estrellas y un comentario opcional en el detalle de un punto seleccionado. Cada usuario puede mantener una opinión por lugar y actualizarla posteriormente; las opiniones publicadas son visibles para todas las personas.

Para habilitar la funcionalidad en Supabase, ejecuta [`sql/calificaciones_lugares.sql`](../sql/calificaciones_lugares.sql) en el SQL Editor del proyecto. El script crea la tabla `public.calificaciones_lugares`, configura sus políticas de seguridad RLS y permite consultar opiniones públicamente, restringiendo la creación y actualización a la persona autenticada propietaria de cada opinión.

## Diseño y accesibilidad

El rediseño responsive, sus decisiones visuales y el checklist de accesibilidad están documentados en la [bitácora de rediseño de UI](./rediseno-ui.md).

## Ubicación, lugares cercanos y rutas

El botón **Ubicación actual** solicita permiso del navegador y centra el mapa en una ubicación aproximada con un radio visual inicial de **1 km** (`DEFAULT_SEARCH_RADIUS_METERS = 1000` m), ajustable en el panel lateral entre **1 km**, **3 km** y **5 km** (`SEARCH_RADIUS_OPTIONS`) una vez hay una ubicación activa. Si se deniega el permiso, el dispositivo no puede determinar la posición o la consulta vence, el geoportal muestra un mensaje con la causa y habilita en el sidebar el acceso alternativo **Elegir mi punto en el mapa** (`getSidebarLocationControls`).

La geolocalización requiere un contexto seguro: abre el sitio con HTTPS (localhost también está permitido) y evita navegadores internos de aplicaciones, que pueden bloquear o limitar el permiso. Si el navegador pregunta, permite el acceso a la ubicación para este sitio.

La alternativa manual **Elegir mi punto en el mapa** está disponible de forma permanente en `MapControls.jsx` (botón de mira), desde el aviso de **"Cómo llegar"** y automáticamente en el sidebar cuando falla la geolocalización. Al hacer clic en el mapa en modo selección (`isPickingLocation`), `useClickMarker.js` convierte la coordenada a `EPSG:4326`, asigna `userLocation` (`locationSource = 'manual'`), desactiva el modo selección y habilita el cálculo de lugares cercanos y rutas peatonales sin seleccionar spots ni colocar marcador neutro.

El sidebar muestra hasta tres lugares calificados del radio seleccionado (`1 km`, `3 km` o `5 km`), ordenados por una media bayesiana que considera tanto el promedio como la cantidad de opiniones, aplicando los filtros de tipo e inteligentes activos y recargando automáticamente cuando las teselas MVT externas terminan de descargarse (`scanNearbyTileFeatures`). Los lugares sin calificaciones no entran en el ranking.

Para habilitar el ranking en Supabase, ejecuta [`sql/lugares_cercanos_mejor_calificados.sql`](../sql/lugares_cercanos_mejor_calificados.sql) después de crear `public.calificaciones_lugares` con el script anterior. El script agrega `training_spot_id`, intenta asociar opiniones históricas por nombre, tipo y cercanía de hasta 30 m y crea la RPC `listar_calificaciones_agregadas_lugares`. Solo se devuelven promedios y recuentos agregados; el filtrado geográfico y la distancia se calculan en el navegador, por lo que la ubicación del usuario no se envía a Supabase.

## Seguridad RLS, Migraciones y RPCs en Supabase

### Trazabilidad de migraciones (`supabase/migrations/`)
La base de datos de Supabase (`agxaidzgnbgnzihefbdf`) mantiene migraciones versionadas en Git bajo [`supabase/migrations/`](../supabase/migrations/) (manteniendo ignorados `supabase/.temp/` y `node_modules/` en [`.gitignore`](../.gitignore)):
1. `20261112220341_baseline_social_rls_snapshot.sql`: Snapshot base previo al endurecimiento de seguridad.
2. `20261112223104_rls_and_schema_hardening.sql`: Endurecimiento de esquema (`fecha_hora_fin` nullable en `eventos_quedadas`, `CHECK` de rango de fechas y longitud de `titulo`/`descripcion`), habilitación de RLS + `REVOKE ALL` en `public.schema_migrations`, revocación de privilegios excesivos en `public`, políticas RLS optimizadas con `(select auth.uid())` y `WITH CHECK` explícito, eliminación del índice duplicado `training_spots_geom_idx` e índice `idx_eventos_quedadas_training_spot_id`.
3. `20261112225647_functions_security_hardening.sql`: Creación del esquema `private` (no expuesto por PostgREST) y del helper `private.contar_asistentes_evento(uuid)`, fijación de `SET search_path = ''` en las funciones `public`, endurecimiento del trigger `public.crear_perfil_usuario()` con fallback seguro a `'principiante'` y revocación de `EXECUTE` para `PUBLIC`/`anon`/`authenticated`, y eliminación de la función obsoleta `public.buscar_eventos_proximos(double precision, double precision, double precision)`.
4. `20261116153000_spot_insights_and_component_quality.sql`: Creación de `public.spot_enlaces` y `public.calificaciones_componentes`, políticas RLS con `(select auth.uid())` y RPC `listar_resumen_componentes_spot` (con recarga del schema cache de PostgREST).
5. `20261116235551_multimodal_route_meetups.sql`: Evolución de `public.eventos_quedadas` (`training_spot_id` nullable, `tipo_actividad`, `perfil_ruta`, `origen_nombre`, `destino_nombre`, `origen_geom`, `destino_geom`, `ruta_geom`, `distancia_metros`, `duracion_segundos`, constraint `eventos_quedadas_actividad_consistencia` e índices) y actualización de `listar_quedadas()` / `listar_eventos_proximos(varchar)` con `LEFT JOIN public.training_spots`.

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

El botón **Cómo llegar** y el selector de perfil (`A pie` vs `Bicicleta`) dibujan rutas multimodales usando los endpoints de mismo origen `/api/routes/foot`, `/api/routes/bike` o `/api/routes` (o la ruta base configurada en `VITE_ROUTE_API_URL`, manteniendo las funciones serverless `api/routes/foot.js`, `api/routes/bike.js` y `api/routes/index.js` en Vercel). Agrega las variables de [`backend/.env.example`](../backend/.env.example) a tu `backend/.env` existente —sin reemplazar otras variables como `DATABASE_URL`— y configura `ROUTING_ENGINE_URL` únicamente con la URL base del servicio OSRM-compatible, sin paths; por ejemplo, `https://routing.openstreetmap.de`. Configura `ROUTING_USER_AGENT` con un identificador de la aplicación; por defecto se usa `Geoportal-Valle-de-Aburra/1.0`, que se envía como cabecera `User-Agent` al motor de rutas. El backend consulta `/routed-foot/route/v1/foot/` o `/routed-bike/route/v1/bike/` con `?overview=full&geometries=geojson&steps=true` y traduce las maniobras al español en `backend/src/application/routing/osrmSteps.js`.

### Ejecución y Orquestación en Desarrollo
Para que la funcionalidad opere en el entorno local, deben estar en ejecución simultánea el frontend y el backend de rutas:
1. **Opción automática (PowerShell):** Ejecuta `./dev.ps1` desde la raíz del proyecto. El script abrirá el backend en una ventana secundaria de PowerShell y levantará Vite en la terminal actual.
2. **Opción manual (dos terminales):**
   - Terminal 1: `npm run start:routes --prefix backend` (escucha en `http://127.0.0.1:3001`).
   - Terminal 2: `npm run dev --prefix Geoportal-aburra` (escucha en `http://localhost:5173`).

En desarrollo, Vite reenvía `/api` al servicio de rutas (`http://127.0.0.1:3001`). El archivo `vite.config.js` intercepta el evento `error` del proxy: si el backend no está en ejecución, Vite emite una advertencia descriptiva en la terminal y responde HTTP 503 con JSON estructurado (`{"error":"El servicio de rutas no está disponible. Asegúrate de ejecutar el backend con npm run start:routes."}`).

La API responde con `coordinates` como pares `[longitud, latitud]`, `distanceMeters`, `durationSeconds` y `steps` normalizados en español (con copia profunda por entrada en `routeCache`). El navegador rechaza endpoints de otro origen para no enviar la ubicación del usuario directamente a un tercero.

### Manejo de Errores y Feedback en Frontend
`routingService.js` captura excepciones de conexión (`TypeError: Failed to fetch`) y códigos de estado HTTP de indisponibilidad temporal (502, 503, 504), devolviendo mensajes claros y localizados en español. En la interfaz (`App.jsx`), si el usuario pulsa **Cómo llegar** sin ubicación establecida y la geolocalización no se concede o falla, la tarjeta de detalle muestra la alerta: *"Debes conceder acceso a tu ubicación actual para calcular la ruta."*, evitando botones inertes.

### Pruebas Automatizadas
- **Frontend:** Ejecuta `npm test --prefix Geoportal-aburra` para correr la suite con Vitest (`102` pruebas unitarias en `25` archivos cubriendo `routingService`, `trainingSpotsService`, `eventosService`, `calificacionesService`, `spotInsightsService`, `placeDetails`, `spotLinks`, `componentQuality`, `googleMapsLinks`, `RouteStepsPanel`, `RouteMeetupForm`, `GlobalMeetupsPanel`, `PlaceRatingsPanel`, `layerStyles`, `spotGeometryParser`, `openingHours`, `spotFilters`, `locationPanelState`, `useUserLocation`, `useNearbyPlaces`, `useSpotSearch`, `useDirections`, `useGlobalMeetups`, `useSpotInsights` y `getPlacePhoto`).
- **Backend:** Ejecuta `npm test --prefix backend` para correr la suite con el test runner nativo de Node.js (`24` pruebas en `routeServer.test.js` y `osrmSteps.test.js` cubriendo perfiles `foot`/`bike`, `steps=true`, traducción de maniobras, timeout 504, 502, 404 NoRoute, rate limiting y caché LRU en memoria).

El backend aplica un rate limit por IP con ventana fija: `RATE_LIMIT_MAX` define el máximo de solicitudes por IP (por defecto `30`) y `RATE_LIMIT_WINDOW_MS` la duración de la ventana (por defecto `60000` ms). Al excederlo responde HTTP 429 con `Retry-After`. La IP se toma de la conexión (`req.socket.remoteAddress`); solo se usa el primer valor de `X-Forwarded-For` cuando `TRUST_PROXY=true`. Las entradas expiradas se limpian periódicamente.

Las rutas exitosas se guardan en una caché **LRU (Least Recently Used)** en memoria (`O(1)`): `ROUTE_CACHE_TTL_MS` define su duración (por defecto `600000` ms) y `ROUTE_CACHE_MAX_ENTRIES` el máximo de entradas (por defecto `500`); en cada acierto válido se promueve la clave al final del `Map` (`delete` + `set`) y con capacidad llena se descarta la menos recientemente usada. Solo se guardan respuestas 200, las coordenadas se redondean a cuatro decimales únicamente para la clave de caché y una consulta fallida al caché se envía al motor con las coordenadas originales. Un valor `0` en TTL o cantidad máxima desactiva la caché. Las respuestas se copian al guardar y devolver para evitar mutaciones compartidas.

### Optimizaciones de Rendimiento y Bundle (2026-11-12)
1. **Aislamiento de módulos GIS inactivos y Code-Splitting (`vite.config.js`, `useTrainingSpotsLayer.js`, `layerStyles.js`):**
   - La carga activa de teselas MVT (`training_spots`) se extrajo a `Geoportal-aburra/src/hooks/useTrainingSpotsLayer.js` y `Geoportal-aburra/src/utils/gis/layerStyles.js`.
   - Los módulos de carga de archivos locales y reproyección (`useLayerLoader.js`, `useLayerManager.js`, `LayerPanel.jsx`, `CRSPanel.jsx`, `useCoordinateCapture.js`) se conservan intactos en el repositorio para futura reactivación, pero fuera del grafo de arranque activo (con `import('jszip')` e `import('shpjs')` dinámicos).
   - `useCoordinateCapture()` se trasladó de `MapContainer.jsx` a `CRSPanel.jsx` para evitar re-renders globales en cada clic del mapa mientras `CRSPanel` está inactivo.
   - `vite.config.js` particiona el bundle en `vendor-ol`, `vendor-supabase`, `vendor-react` e `index` (todos `< 350 kB`).
2. **Caché $O(1)$ de estilos OpenLayers y pre-cálculo MVT (`layerStyles.js`):**
   - `prepareTrainingSpotFeature(feature)` pre-calcula `equipmentType` y `representativePoint` una sola vez al decodificar cada tesela MVT.
   - `createMarkerStyle(color, useRepresentativePoint)` reutiliza instancias inmutables de `Style` desde un `Map` en memoria.
3. **Escaneo MVT acotado y batching por frame (`useNearbyPlaces.js`):**
   - `getNearbyScanZoom(tileGrid, viewResolution)` acota el nivel de zoom de escaneo espacial de 3 km a `NEARBY_TILE_SCAN_MAX_ZOOM = 14`.
   - `createBatchedTileUpdater` agrupa múltiples eventos `tileloadend` / `tileloaderror` en una única actualización por `requestAnimationFrame`.
4. **Consultas en lote de inscripciones y alcance por spot (`eventosService.ts`, `MeetupsPanel.jsx`):**
   - `listarInscripcionesUsuario(eventoIds)` resuelve las asistencias del usuario autenticado en una sola consulta `.in('evento_id', uniqueIds)`, eliminando el patrón `N+1` en `EventCard`.
   - `crearEvento` recupera el detalle recién creado mediante `listarEventosPorSpot(trainingSpotId)` en lugar de `listarEventosProximos()`.
5. **Estabilidad de `MapContext`, caché de fotos por ID estable y LRU en backend (`MapContext.jsx`, `getPlacePhoto.js`, `routeServer.js`):**
   - `addLayer` y `removeLayer` mantienen referencias estables en `MapContext.jsx` apoyándose en `useRef`.
   - `getPlacePhoto.js` indexa `photoCache` por clave estable (`getFeatureCacheKey`) con timeout externo de `1800 ms`.
   - `routeServer.js` promueve las entradas consultadas en `routeCache` para garantizar expulsión LRU real en $O(1)$.

### Ubicación Manual, Buscador/Filtros Inteligentes y Agenda Global (2026-11-13)
1. **Ubicación manual y selector de radio (`useUserLocation.js`, `useClickMarker.js`, `useLocationOverlay.js`, `useNearbyPlaces.js`, `locationPanelState.js`):**
   - `MapContext.jsx` gestiona `locationSource` (`'gps' | 'manual'`), `isPickingLocation` y `searchRadiusMeters` (iniciando en `1000` m con opciones `1000`, `3000`, `5000`).
   - `PlacesFilterPanel.jsx` muestra el botón manual en el sidebar solo ante fallo de geolocalización y el selector de radio `1 km / 3 km / 5 km` únicamente cuando la ubicación está lista (`locationStatus === 'ready'`).
   - `scanNearbyTileFeatures` detecta teselas MVT externas pendientes y se suscribe directamente a su evento `'change'` para recalcular lugares al cambiar el radio sin requerir nuevo clic en el mapa.
2. **Buscador global y filtros inteligentes sincronizados con capa MVT (`trainingSpotsService.ts`, `spotFilters.js`, `openingHours.js`, `useSpotSearch.js`, `SpotSearchPanel.jsx`, `layerStyles.js`, `useTrainingSpotsLayer.js`):**
   - `listarTrainingSpots()` cachea el catálogo de `public.training_spots` decodificando GeoJSON/EWKB (`spotGeometryParser.js`) a `EPSG:4326`.
   - `matchesSpotFilters()` aplica búsqueda normalizada sin tildes/mayúsculas, municipio (`ABURRA_MUNICIPALITIES`), calificación mínima (`≥ 3.0 / 4.0 / 4.5`), `"Con quedadas próximas"` y `"Abierto ahora"` (tratando parques al aire libre sin `opening_hours` como 24/7).
   - `createTrainingSpotStylePredicate` y `getFeatureStyle` ocultan en el mapa los marcadores que no cumplen los filtros activos manteniendo las referencias cacheadas de `Style` ($O(1)$).
3. **Agenda global de "Quedadas próximas" (`useGlobalMeetups.js`, `GlobalMeetupsPanel.jsx`, `App.jsx`):**
   - El panel lateral expone las pestañas `Explorar` y `Quedadas próximas`.
   - `useGlobalMeetups` consulta `listarEventosProximos()` y `listarInscripcionesUsuario()` en lote cuando hay sesión activa, ordena cronológicamente y permite centrar el mapa, sincronizar el pin de selección y abrir `PlaceDetailsCard` decodificando `event.geom`.

### Enlaces Web y Calidad de Componentes (2026-11-16)
1. **Enlaces web seguros (`spotLinks.js`, `placeDetails.js`, `spotInsightsService.ts`, `SpotLinksBar.jsx`):**
   - `extractPlaceData` captura tags OSM (`website`, `contact:website`, `url`, `contact:instagram`) y `resolveSpotLinks` combina fuentes priorizando `public.spot_enlaces`.
   - `sanitizeExternalUrl` y `normalizeInstagramUrl` bloquean esquemas inseguros (`javascript:`, `data:`, etc.) antes de renderizar `<a target="_blank" rel="noopener noreferrer">`.
   - Usuarios autenticados pueden sugerir o actualizar enlaces comunitarios validados por constraint `^https?://`.
2. **Calidad de componentes (`componentQuality.js`, `calificacionesService.ts`, `PlaceRatingsPanel.jsx`):**
   - `getComponentCriteriaForPlace` diferencia criterios entre parques/calistenia al aire libre (`estado_barras`, `superficie_suelo`, `iluminacion_seguridad`) y gimnasios/centros deportivos (`calidad_maquinas`, `variedad_pesas`, `limpieza_vestier`).
   - `guardarCalificacionLugar` sincroniza puntajes opcionales (`1..5`) en `public.calificaciones_componentes`, y `listar_resumen_componentes_spot` retorna promedios agregados por componente.
   - En el formulario de `PlaceRatingsPanel.jsx`, la sección `Calidad de instalaciones (opcional)` se presenta como un desplegable colapsado por defecto (`aria-expanded="false"`) para no mostrarse directamente al calificar.
   - La funcionalidad de horarios pico (`PeakHoursPanel.jsx`, `peakHours.js` y sus llamadas en `useSpotInsights.js` / `spotInsightsService.ts`) fue retirada de la interfaz y lógica activa del frontend.

### Rutas Multimodales, Deep Linking y Quedadas de Running/Ciclismo (2026-11-16)
1. **Rutas multimodales y pasos interactivos (`RouteStepsPanel.jsx`, `useDirections.js`, `useRouteOverlay.js`, `osrmSteps.js`):**
   - `MapContext.jsx` gestiona `routeProfile` (`'foot' | 'bike'`) y `highlightedStep` (`{ location, index }`).
   - `useRouteOverlay.js` diferencia el trazo en OpenLayers (`foot` morado, `bike` verde/esmeralda), dibuja marcadores `A`/`B` cuando `route.showEndpoints` está activo y mantiene la capa independiente `routeStepLayer` para resaltar la maniobra seleccionada sin reencuadrar toda la ruta.
   - `RouteStepsPanel.jsx` ofrece el selector `A pie` / `Bicicleta` y el acordeón colapsable *"Indicaciones paso a paso"* con centrado interactivo al hacer clic en cada paso.
2. **Deep Linking a Google Maps (`googleMapsLinks.js`):**
   - `buildGoogleMapsDirectionsUrl` genera enlaces hacia `https://www.google.com/maps/dir/?api=1` con `destination` en `EPSG:4326`, `travelmode=walking|bicycling` e incluye `origin` cuando existe ubicación del usuario o punto de partida de la quedada.
3. **Quedadas de Running y Ciclismo con ruta (`RouteMeetupForm.jsx`, `routeMeetups.js`, `useGlobalMeetups.js`, `GlobalMeetupsPanel.jsx`, `eventosService.ts`):**
   - `useClickMarker.js` y `MapContainer.jsx` admiten `pickingPointTarget` (`'meetup-origin' | 'meetup-destination'`) para capturar origen/destino en el mapa sin sobreescribir `userLocation`.
   - Al crear o editar desde `"Quedadas próximas"`, `RouteMeetupForm.jsx` previsualiza la ruta OSRM y persiste `origen_geom`, `destino_geom`, `ruta_geom` (`LineString`, `EPSG:4326`), `distancia_metros` y `duracion_segundos` en `public.eventos_quedadas` mediante EWKT (`SRID=4326`).
   - `GlobalMeetupsPanel.jsx` incluye un botón permanente para crear rutas de running/ciclismo, filtro por modalidad (`Todas`, `Entrenamiento`, `Running`, `Ciclismo`), renderizado directo de la ruta guardada (`parseLineGeometryToLonLat`) y carga automática de pasos desde **"Ver ruta"**, asistencia, edición/eliminación por organizador y enlace profundo a Google Maps.

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
