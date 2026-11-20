# Geoportal Deportivo Valle de Aburrá

Geoportal web interactivo para descubrir, evaluar y planificar entrenamientos en parques de calistenia, gimnasios, zonas de entrenamiento al aire libre y centros deportivos en los **10 municipios del área metropolitana del Valle de Aburrá** (Barbosa, Bello, Caldas, Copacabana, Envigado, Girardota, Itagüí, La Estrella, Medellín y Sabaneta).

---

## ¿Qué puedes hacer en el geoportal?

### Mapa interactivo y zonas deportivas
- **Explora por categoría visual:** identifica fácilmente en el mapa los puntos de **Gimnasio**, **Training al aire libre** y **Centros deportivos**, con carga rápida mediante teselas vectoriales.
- **Vista de calles o satelital:** alterna el mapa base en cualquier momento desde el control de capas.
- **Unidades y complejos deportivos destacados:** visualiza los polígonos reales de OpenStreetMap para escenarios emblemáticos como la Unidad Deportiva Atanasio Girardot, Unidad Deportiva de Belén, Polideportivo Itagüí, Complejo Deportivo Ditaires, Unidades Deportivas Zona Norte y Zona Sur INDESA, y Polideportivo Sur de Envigado.

### Buscador y filtros inteligentes
- **Filtros rápidos superiores:** activa o desactiva categorías de equipamiento directamente sobre el mapa.
- **Búsqueda combinada en la pestaña *Explorar*:** filtra todo el catálogo del Valle de Aburrá por nombre, municipio, calificación mínima (`3.0+`, `4.0+` o `4.5+` estrellas), lugares **Con quedadas próximas** o espacios **Abierto ahora**. Los marcadores del mapa se sincronizan con los filtros activos.

### Lugares mejor valorados cerca de ti
- **Ubicación por GPS o manual:** utiliza tu ubicación actual o toca cualquier punto con la herramienta **Elegir mi punto en el mapa**.
- **Radio configurable:** consulta los escenarios mejor calificados dentro de un radio de **1 km**, **3 km** o **5 km**, ordenados mediante una media bayesiana que pondera la calificación promedio y la cantidad de opiniones.

### Ficha detallada de cada escenario
Al seleccionar cualquier lugar sobre el mapa o en los resultados de búsqueda puedes consultar:
- **Información general y fotografía:** nombre, categoría, municipio, horario reportado y foto cercana cuando está disponible (Mapillary / Wikimedia).
- **Enlaces comunitarios verificados:** acceso al sitio web o perfil de Instagram del lugar, con posibilidad de sugerir o actualizar enlaces cuando hayas iniciado sesión.
- **Gráfica de horas de mayor afluencia (horas pico):** estimación visual entre `04:00` y `22:00` (`America/Bogota`) con indicador en vivo **Ahora** (*Alto*, *Medio* o *Bajo*) para planificar en qué horario entrenar.
- **Calificaciones y reseñas por componentes:** consulta la nota general, lee comentarios de otros usuarios y, si estás autenticado, deja tu reseña de 1 a 5 estrellas junto con una evaluación opcional por criterios según el espacio:
  - *Parques y training al aire libre:* estado de barras, superficie del suelo e iluminación/seguridad.
  - *Gimnasios y centros deportivos:* calidad de máquinas, variedad de pesas y limpieza/vestier.

### Rutas multimodales paso a paso
- **Cómo llegar (*A pie* o *Bicicleta*):** calcula rutas desde tu ubicación (GPS o punto manual en el mapa) hasta el lugar elegido con perfil peatonal o cicloviario.
- **Indicaciones interactivas:** despliega los pasos en español, selecciona cualquier maniobra para centrar el mapa en ese punto o abre el recorrido directamente en **Google Maps**.
- **Control explícito de ruta activa:** mientras haya una ruta dibujada en el mapa aparece una píldora flotante con la distancia, el tiempo estimado, el botón **Ver pasos** (cuando aplica) y **Dejar de ver ruta**.

### Comunidad: Quedadas próximas, Running y Ciclismo
En la pestaña **Quedadas próximas** puedes sumarte a entrenamientos y salidas grupales en el Valle de Aburrá:
- **Filtro por modalidad:** consulta todas las quedadas o filtra por **Entrenamiento**, **Running** o **Ciclismo**.
- **Crea rutas de *Running* o *Ciclismo*:** marca origen y destino en el mapa, previsualiza el trazado, la distancia y la duración estimada, y publica la quedada para la comunidad.
- **Participa y navega:** confirma o cancela tu asistencia, ubica entrenamientos en el mapa, visualiza recorridos guardados con **Ver ruta** / **Dejar de ver ruta**, edita o elimina tus propias quedadas y ábrelas en **Google Maps**.

### Experiencia adaptada a dispositivos móviles
- En pantallas pequeñas (`< 768 px`), el panel se convierte en una barra inferior desplegable (*bottom sheet*), los filtros superiores muestran etiquetas compactas desplazables sin recortes y al pulsar **Ver ruta** o **Cómo llegar** el panel desciende automáticamente para que visualices el recorrido completo en el mapa.

---

## Datos geográficos y atribución

- **Cobertura:** Área Metropolitana del Valle de Aburrá (10 municipios).
- **Fuentes cartográficas:** los datos base de equipamientos y polígonos de unidades deportivas (`Geoportal-aburra/public/data/parques_aburra.geojson` y `Geoportal-aburra/public/data/zonas_deportiva.geojson`) provienen de [OpenStreetMap](https://www.openstreetmap.org/) mediante consultas de [Overpass Turbo](https://overpass-turbo.eu/).
- **Licencia de datos:** la información geográfica procedente de OpenStreetMap se distribuye bajo la licencia [ODbL](https://opendatacommons.org/licenses/odbl/), conservando la atribución correspondiente en el visor.

---

## Información para desarrolladores

### Tecnologías utilizadas

| Herramienta | Uso en el proyecto |
| --- | --- |
| [React 19](https://react.dev/) | Construcción de la interfaz y gestión de componentes funcionales y hooks. |
| [Vite 8](https://vite.dev/) | Servidor de desarrollo, proxy `/api` y empaquetado modular con división de *chunks*. |
| [OpenLayers 10](https://openlayers.org/) | Motor cartográfico: mapa base, teselas MVT, capas vectoriales, rutas y eventos espaciales. |
| [Tailwind CSS 4](https://tailwindcss.com/) | Estilizado utilitario y diseño responsive. |
| [Lucide React](https://lucide.dev/) | Iconografía accesible de la interfaz. |
| [proj4](https://proj4js.org/) | Definición y transformación entre sistemas de referencia espacial. |
| [shpjs](https://github.com/calvinmetcalf/shapefile-js) + [JSZip](https://stuk.github.io/jszip/) | Lectura de archivos Shapefile y ZIP en el navegador (módulos GIS aislados con carga dinámica). |
| [Supabase](https://supabase.com/) | PostgreSQL + PostGIS, autenticación, políticas RLS, RPCs y función Edge para teselas MVT. |
| [Node.js](https://nodejs.org/) | Backend HTTP ligero para cálculo de rutas OSRM, traducción de maniobras, caché LRU y *rate limiting*. |
| [Vitest](https://vitest.dev/) + `node --test` | Suites de pruebas unitarias para frontend y backend. |

### Estructura del proyecto

```text
Gestor geografico gym and calistenic/
├── Geoportal-aburra/              # Aplicación frontend React + Vite + OpenLayers
│   ├── public/data/               # Capas GeoJSON base (parques y zonas deportivas)
│   └── src/
│       ├── components/            # UI desacoplada (auth, map, meetups, sidebar, ui)
│       ├── config/                # CRS y parámetros de horas pico y zonas deportivas
│       ├── constants/             # Tipos de equipamiento, radios y municipios
│       ├── context/               # Estado global del visor (MapContext)
│       ├── hooks/                 # Ciclo de vida, capas OpenLayers, rutas y quedadas
│       ├── lib/                   # Cliente Supabase
│       ├── services/              # Integración con Supabase y API de rutas
│       └── utils/                 # Lógica pura, filtros, geometrías y estado móvil
├── backend/                       # Servicio HTTP de rutas multimodales (puerto 3001)
│   ├── migrations/                # Migraciones SQL locales
│   ├── src/                       # Capas config, application e infrastructure
│   └── test/                      # Pruebas unitarias del servidor de rutas y OSRM
├── api/                           # Endpoints /api/routes, /api/routes/foot y /api/routes/bike
├── sql/                           # Scripts SQL de referencia (funciones y calificaciones)
├── supabase/                      # Migraciones versionadas, Edge Function MVT y tests RLS
├── docs/                          # Bitácora técnica (MEMORY.md y rediseno-ui.md)
├── dev.ps1                        # Arranque simultáneo de backend y frontend en PowerShell
└── package.json                   # Scripts raíz para instalar, desarrollar, compilar y probar
```

Para detalles profundos de arquitectura, contratos de RPCs, políticas RLS y decisiones técnicas, consulta [`docs/MEMORY.md`](./docs/MEMORY.md) y [`docs/rediseno-ui.md`](./docs/rediseno-ui.md).

### Sistemas de referencia espacial (CRS)

Las definiciones personalizadas se encuentran en `Geoportal-aburra/src/config/crsDefinitions.js`:

- `EPSG:4326` — WGS 84 (coordenadas geográficas en grados decimales, usado en GeoJSON y PostGIS).
- `EPSG:3857` — Web Mercator (proyección del visor cartográfico web).
- `EPSG:32618` — UTM zona 18N (WGS 84, en metros).
- `EPSG:9377` — MAGNA-SIRGAS / Origen Nacional (en metros).
- `EPSG:3116` — MAGNA-SIRGAS / Colombia Bogotá zone (en metros).

### Requisitos previos

- [Node.js](https://nodejs.org/) **18 o superior**.
- `npm` (incluido con Node.js).
- Un proyecto de **Supabase** (PostgreSQL + PostGIS) si deseas ejecutar las funciones sociales, calificaciones y teselas MVT con tus propias credenciales.

### Instalación y configuración local

1. **Instalar dependencias** (raíz, `backend/` y `Geoportal-aburra/`):

```powershell
npm run install:all
```

2. **Configurar variables de entorno del backend** en `backend/.env`:

```env
ROUTING_ENGINE_URL=https://routing.openstreetmap.de
ROUTING_API_PORT=3001
ROUTING_API_HOST=127.0.0.1
ROUTING_USER_AGENT=Geoportal-Valle-de-Aburra/1.0
RATE_LIMIT_MAX=30
RATE_LIMIT_WINDOW_MS=60000
ROUTE_CACHE_TTL_MS=600000
ROUTE_CACHE_MAX_ENTRIES=500
TRUST_PROXY=false
# Opcional: requerido únicamente para ejecutar migraciones con npm --prefix backend run migrate
# DATABASE_URL=postgresql://usuario:password@host:5432/postgres
```

> `ROUTING_ENGINE_URL` debe contener solo la URL base del servicio OSRM-compatible (sin rutas adicionales).

3. **Configurar variables de entorno del frontend** en `Geoportal-aburra/.env`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_publica
# Opcionales:
# VITE_ROUTE_API_URL=
# VITE_MAPILLARY_CLIENT_TOKEN=
```

> Las variables `VITE_*` se incrustan en el cliente durante la compilación; nunca coloques llaves privadas ni `service_role` en `Geoportal-aburra/.env`.

### Ejecución y comandos disponibles

- **Desarrollo concurrente (backend + frontend en una terminal):**

```powershell
npm run dev
```

En Windows PowerShell también puedes ejecutar `./dev.ps1` para abrir el servicio de rutas en una ventana independiente y Vite en la terminal actual. Por defecto, Vite escucha en `http://localhost:5173` y reenvía `/api` al backend en `http://127.0.0.1:3001`.

- **Ejecutar únicamente el backend de rutas:**

```powershell
npm run start:routes --prefix backend
```

- **Compilar y previsualizar versión de producción en local:**

```powershell
npm run build
npm start
```

El frontend compilado queda disponible normalmente en `http://localhost:4173` junto con el servicio de rutas.

- **Pruebas, linting y verificación de tipos:**

```powershell
npm test --prefix Geoportal-aburra
npm test --prefix backend
npm run lint --prefix Geoportal-aburra
npm run typecheck --prefix Geoportal-aburra
```

Desde la raíz también puedes ejecutar `npm test` para correr las pruebas de backend y frontend en secuencia, y `npm run lint` para validar ESLint en el frontend.
