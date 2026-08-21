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

## Instalación

El código de la aplicación se encuentra en la carpeta `Geoportal-aburra`.

1. Abrir una terminal en la raíz del proyecto.
2. Entrar en la carpeta de la aplicación:

   ```bash
   cd Geoportal-aburra
   ```

3. Instalar las dependencias:

   ```bash
   npm install
   ```

Las principales librerías GIS se instalan con el proyecto mediante npm:

```bash
npm install ol proj4 shpjs
```

Tailwind CSS, su integración con Vite y los iconos también forman parte de las dependencias del proyecto:

```bash
npm install tailwindcss @tailwindcss/vite lucide-react
```

> Si ya se ejecutó `npm install`, no es necesario repetir los comandos individuales. El archivo `package.json` contiene las dependencias necesarias.

## Ejecución

Iniciar el servidor de desarrollo con recarga automática:

```bash
npm run dev
```

Vite mostrará en la terminal la dirección local de la aplicación, normalmente `http://localhost:5173`.

Comandos disponibles:

```bash
npm run dev       # Inicia el servidor de desarrollo
npm run build     # Genera la compilación de producción
npm run lint      # Ejecuta ESLint
npm run preview   # Sirve localmente la compilación generada
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
