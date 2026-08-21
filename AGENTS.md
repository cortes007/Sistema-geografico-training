# AI Agent Instructions - Geoportal Valle de Aburrá

## 1. Rol y Contexto del Proyecto
Estás trabajando en el "Geoportal del Valle de Aburrá para parques de calistenia, Gyms y Gyms al aire libre", un visor geográfico interactivo construido con:
- React (Vite)
- OpenLayers (Motor de mapas)
- Proj4js (Reproyección espacial y CRS)
- Tailwind CSS (Estilos)

## 2. Principio Core: SOLID y Responsabilidad Única (SRP)
La regla de oro de este proyecto es SOLID especificamente el **Single Responsibility Principle (SRP)**. Todo el código generado debe adherirse estrictamente a esto:

*   **Componentes de UI (`/components`):** Su ÚNICA responsabilidad es renderizar la interfaz y escuchar eventos del usuario. NO deben contener lógica de negocio, llamadas a APIs complejas, ni transformaciones matemáticas espaciales.
*   **Hooks Personalizados (`/hooks`):** Su ÚNICA responsabilidad es gestionar el ciclo de vida de React, conectar con el Contexto y coordinar la lógica entre la UI y las utilidades.
*   **Utilidades (`/utils`):** Su ÚNICA responsabilidad es ejecutar lógica pura e independiente. (Ej: Las funciones matemáticas de reproyección de `proj4` van aquí, no en los componentes).
*   **Contexto (`/context`):** Su ÚNICA responsabilidad es proveer estado global a la aplicación, sin incluir lógica pesada de renderizado.

## 3. Reglas de Desarrollo (GIS & React)
*   **Componentes Funcionales:** Usa siempre Functional Components y Hooks.
*   **Inmutabilidad:** No mutes el estado directamente. Usa funciones puras.
*   **Manejo de Mapas (OpenLayers):** 
    *   La instancia del mapa (`ol/Map`) se maneja a través de Referencias (`useRef`) o el Estado Global (`MapContext`). 
    *   Nunca re-renderices el mapa completo si solo cambia una capa. Usa los métodos de OpenLayers (`map.addLayer()`, `layer.getSource().clear()`, etc.) dentro de `useEffect` con dependencias estrictas.
*   **Sistemas de Referencia Espacial (CRS):**
    *   Por defecto, la web y GeoJSON usan `EPSG:4326` (WGS84).
    *   Las transformaciones locales para Colombia utilizan `EPSG:9377` (Origen Nacional) o `EPSG:3116` (Magna-Sirgas / Bogotá).
    *   Siempre documenta en el código en qué CRS está una coordenada antes y después de una transformación.

## 4. Estilo y Convenciones
*   Usa **Tailwind CSS** para todo el estilizado. No uses archivos `.css` externos a menos que sea estrictamente necesario para librerías de terceros (como `ol/ol.css`).
*   Los nombres de archivos de componentes usan `PascalCase` (ej. `MapContainer.jsx`).
*   Los archivos de utilidades y hooks usan `camelCase` (ej. `spatialUtils.js`, `useOpenMap.js`).
*   Usa siempre **Early Returns** para reducir la anidación del código (evitar el *Callback Hell* o *If Hell*).

## 5. Formato de Respuesta del Agente
*   Proporciona el código directamente sin explicaciones redundantes a menos que se te solicite.
*   Si notas que mi petición viola el principio de Responsabilidad Única (SRP), corrígeme amablemente y propón la estructura de archivos correcta antes de escribir el código.