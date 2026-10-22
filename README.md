# Geoportal de parques de calistenia y gimnasios

Geoportal web para consultar y gestionar información geográfica de parques de calistenia, gimnasios y gimnasios al aire libre. El proyecto está orientado al área metropolitana del Valle de Aburrá y utiliza un visor cartográfico para visualizar, cargar, consultar y transformar capas geográficas.

## Objetivos

El geoportal permitira:

- Visualizar parques de calistenia, gimnasios y gimnasios al aire libre sobre un mapa interactivo.
- Cargar capas geográficas en formatos compatibles, especialmente GeoJSON y Shapefile.
- Administrar la visibilidad y el orden de las capas.
- Consultar los atributos de cada parque o equipamiento mediante ventanas emergentes.
- Filtrar los lugares por tipo de equipamiento y otras propiedades disponibles.
- Identificar el sistema de referencia espacial (CRS/SRS) declarado en el archivo `.prj` de una capa.
- Reproyectar una capa entre diferentes sistemas de referencia espacial.
- Capturar las coordenadas de una posición seleccionada en el mapa.
- Mostrar las coordenadas en el sistema de referencia seleccionado.

## Tecnologías utilizadas

| Herramienta | Uso en el proyecto |
| --- | --- |
| [React](https://react.dev/) | Construcción de la interfaz y sus componentes. |
| [Vite](https://vite.dev/) | Servidor de desarrollo y compilación para producción. |
| [OpenLayers](https://openlayers.org/) | Visor cartográfico, mapas base, capas, eventos y elementos geográficos. |
| [proj4](https://proj4js.org/) | Definición y transformación entre sistemas de referencia espacial. |
| [shpjs](https://github.com/mbostock/shapefile) | Lectura de archivos Shapefile en el navegador. |
| [Tailwind CSS](https://tailwindcss.com/) | Estilos y diseño de la interfaz. |
| [Lucide React](https://lucide.dev/) | Iconos de la interfaz. |

## Requisitos

- [Node.js](https://nodejs.org/) 18 o superior.
- npm, incluido con Node.js.
- Un navegador web moderno.

## Instalación y ejecución local

Los comandos se ejecutan desde la raíz y administran las dependencias del proyecto, el backend y el frontend:

```bash
npm run install:all
Copy-Item backend\.env.example backend\.env
Copy-Item Geoportal-aburra\.env.example Geoportal-aburra\.env
```

Configura `backend/.env` con el motor de rutas que usarás y `Geoportal-aburra/.env` con las credenciales de Supabase y Mapillary que correspondan. Las variables `VITE_*` se incorporan al frontend durante la compilación; no pongas secretos en ellas.

Iniciar backend y frontend en desarrollo en una sola terminal:

```bash
npm run dev
```

El frontend se sirve normalmente en `http://localhost:5173` y el proxy de Vite reenvía `/api` al backend en `http://127.0.0.1:3001`. Si cambias `ROUTING_API_PORT` en `backend/.env`, actualiza también `VITE_BACKEND_URL` en `Geoportal-aburra/.env` para que el proxy apunte al mismo puerto.

Para compilar y probar localmente la versión de producción:

```bash
npm run build
npm start
```

El frontend compilado se sirve normalmente en `http://localhost:4173`. `npm run start:routes` sigue disponible desde `backend/` si se necesita ejecutar el backend por separado.

Comandos adicionales del frontend:

```bash
npm --prefix Geoportal-aburra run lint
npm --prefix Geoportal-aburra run test
npm --prefix backend test
```

## Despliegue en Vercel

Importa el repositorio en Vercel como un solo proyecto y conserva la configuración de `vercel.json`: la compilación usa Vite y publica `Geoportal-aburra/dist`; las peticiones `/api/*` se dirigen a la función `api/routes/foot.js`.

Configura en Vercel las variables `ROUTING_ENGINE_URL` y, si aplica, `ROUTING_USER_AGENT`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`, `ROUTE_CACHE_TTL_MS` y `ROUTE_CACHE_MAX_ENTRIES`. Configura también `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_MAPILLARY_CLIENT_TOKEN` para que estén disponibles durante la compilación del frontend. No es necesario configurar `ROUTING_API_PORT` en Vercel.

El backend actual no usa WebSockets, cron ni procesos persistentes. La caché y el límite de solicitudes se mantienen en memoria por instancia serverless; Vercel puede crear varias instancias, por lo que no son compartidos ni un límite global estricto. Si se requiere ese comportamiento, se necesita un almacenamiento compartido para la caché y el rate limit.

Para desplegar con la CLI de Vercel desde la raíz:

```bash
vercel
vercel --prod
```

## Sistemas de referencia espacial

Las definiciones de CRS se encuentran en `Geoportal-aburra/src/config/crsDefinitions.js`. Actualmente se contemplan:

- EPSG:4326, WGS 84 en grados decimales.
- EPSG:3857, Web Mercator para mapas web.
- EPSG:3116, MAGNA-SIRGAS / Colombia Bogotá zone.
- EPSG:9377, MAGNA-SIRGAS / Origen Nacional.

Para una capa proveniente de un Shapefile, el archivo `.prj` contiene la definición del sistema de referencia espacial. El flujo previsto es leer esa definición, informar al usuario cuál es el CRS asignado y permitir seleccionar un CRS de destino para reproyectar la capa antes de mostrarla o exportarla.

## Datos geográficos

Los datos geográficos del proyecto se almacenan en `Geoportal-aburra/public/data/`. Esta carpeta es servida por Vite como contenido público y puede contener archivos GeoJSON, Shapefile y otros recursos geográficos.

Los datos de parques del Valle de Aburrá se obtienen de [OpenStreetMap](https://www.openstreetmap.org/) mediante consultas de [Overpass Turbo](https://overpass-turbo.eu/). La consulta y los detalles de procedencia se encuentran en `docs/overpass.md`.

Los datos de OpenStreetMap se distribuyen bajo la licencia [ODbL](https://opendatacommons.org/licenses/odbl/). Las visualizaciones deben conservar la atribución correspondiente a OpenStreetMap.
