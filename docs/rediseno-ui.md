# Bitácora del rediseño de interfaz

Este documento resume las decisiones del rediseño del geoportal y los puntos de verificación manual. Se conserva React + Vite, OpenLayers, Tailwind y Lucide; no se cambió el motor de mapa ni se agregaron librerías.

## Fases y decisiones

### 1. Layout del geoportal

- Se organizó el mapa como superficie principal con sidebar flotante y panel de sesión en escritorio.
- En móvil, el sidebar se presenta como bottom sheet y el resto de controles se acomoda alrededor de su altura mediante `--sheet-h`.
- Archivos principales: `Geoportal-aburra/src/App.jsx`, `Geoportal-aburra/src/components/map/MapContainer.jsx` y `Geoportal-aburra/src/components/auth/AuthPanel.jsx`.

### 2. Chips de categorías

- Los tipos de equipamiento se representan como filtros compactos y desplazables en móvil.
- Los filtros usan checkboxes nativos; el estado activo tiene una pista adicional al color mediante el grosor del borde. El foco del checkbox se refleja en el label.
- Archivos principales: `Geoportal-aburra/src/components/sidebar/EquipmentTypeFilters.jsx`, `Geoportal-aburra/src/components/sidebar/LayerPanel.jsx` y `Geoportal-aburra/src/App.jsx`.

### 3. Botón de capas

- El control de capas ofrece una entrada visual compacta para alternar calles y satélite, con el control ubicado junto al mapa y separado de los controles de navegación.
- Archivo principal: `Geoportal-aburra/src/components/map/MapControls.jsx`; capas base administradas desde `Geoportal-aburra/src/components/map/MapContainer.jsx`.

### 4. Radio y ruta

- El radio de búsqueda de 3 km y la ruta peatonal conservan el acento morado y usan doble trazo para mantener su visibilidad sobre los mapas claros y satelitales.
- Archivos principales: `Geoportal-aburra/src/hooks/useLocationOverlay.js`, `Geoportal-aburra/src/hooks/useRouteOverlay.js` y `Geoportal-aburra/src/constants/location.js`.

### 5. Diseño responsive

- En escritorio (`≥768px`), el sidebar es flotante, los chips se ubican en la parte superior, los controles del mapa abajo a la derecha y el control de capas abajo a la izquierda.
- En móvil (`<768px`), el sidebar actúa como bottom sheet y los chips mantienen desplazamiento horizontal. Los estados documentados son colapsado `148px`, medio `60dvh` y expandido `90dvh`; la altura se coordina con `--sheet-h`.
- En el código actual, el valor expandido de `--sheet-h` es `88dvh`; se registra aquí para distinguirlo del objetivo de diseño documentado de `90dvh`.
- Archivos principales: `Geoportal-aburra/src/App.jsx`, `Geoportal-aburra/src/components/map/MapControls.jsx` y `Geoportal-aburra/src/index.css`.

### 6. Centrado del mapa

- Se centralizó el centrado en `Geoportal-aburra/src/utils/gis/mapCentering.js`, reutilizado al seleccionar un punto y al obtener la ubicación actual.
- El padding se calcula según el layout; en móvil se considera la altura destino del sheet. El ajuste del radio encuadra su extent.
- El zoom de puntos se limita a un máximo objetivo de 14 y la transición dura 700 ms. Se cancela frente a otra acción o interacción manual y se respeta la preferencia de movimiento reducido.
- Archivos principales: `Geoportal-aburra/src/utils/gis/mapCentering.js`, `Geoportal-aburra/src/hooks/useClickMarker.js`, `Geoportal-aburra/src/hooks/useLocationOverlay.js` y `Geoportal-aburra/src/App.jsx`.

### 7. Accesibilidad

- Se añadieron nombres accesibles y tooltips nativos a controles de solo ícono, `aria-hidden` a íconos decorativos, foco visible y objetivos táctiles de al menos 44 px.
- Los chips mantienen checkboxes nativos operables con teclado y distinguen el estado activo también mediante el borde. El tipo del lugar permanece visible en los detalles.
- Las fotos usan texto alternativo según sean exactas o cercanas; los placeholders decorativos usan texto alternativo vacío.
- Se ajustaron clases para movimiento reducido y se revisaron los contrastes de los textos y controles principales sin cambiar la paleta.
- Archivos principales: `Geoportal-aburra/src/App.jsx`, `Geoportal-aburra/src/components/auth/AuthPanel.jsx`, `Geoportal-aburra/src/components/map/MapControls.jsx`, `Geoportal-aburra/src/components/map/PlaceRatingsPanel.jsx` y componentes de `Geoportal-aburra/src/components/sidebar/`.

### 8. Ubicación y alertas

- La geolocalización informa errores de contexto inseguro, permiso denegado, posición no disponible y consulta vencida. La aplicación muestra los errores en el mapa y en el panel.
- Los mensajes dinámicos de carga y estados vacíos se exponen como estado accesible; los errores usan alertas.
- La opción «Elegir ubicación en el mapa» se documenta como alternativa manual deseada, pero no está implementada actualmente como control de ubicación. El clic existente en el mapa sirve para capturar coordenadas o seleccionar un lugar; no sustituye la geolocalización del usuario.
- Archivos principales: `Geoportal-aburra/src/hooks/useUserLocation.js`, `Geoportal-aburra/src/components/map/MapContainer.jsx`, `Geoportal-aburra/src/components/sidebar/PlacesFilterPanel.jsx`, `Geoportal-aburra/src/components/map/PlaceRatingsPanel.jsx` y `Geoportal-aburra/src/components/meetups/MeetupsPanel.jsx`.

## Verificaciones ejecutadas

- `npm run lint` desde `Geoportal-aburra/`: correcto.
- `npm run build` desde `Geoportal-aburra/`: correcto. Vite reporta un aviso de chunk JavaScript minificado mayor a 500 kB, sin fallar la compilación.
- `git diff --check`: correcto.

## Checklist de pruebas manuales

- Navegar con Tab y Shift+Tab; comprobar que cada control tiene foco visible y que los botones de solo ícono anuncian su nombre.
- Activar y desactivar chips con Espacio y Enter; comprobar que el checkbox nativo recibe foco y el borde identifica el filtro activo.
- En móvil, probar estados del bottom sheet y confirmar que los controles del mapa no quedan tapados; en escritorio, colapsar y expandir el sidebar.
- Seleccionar un punto y revisar que el foco no salta inesperadamente y que el detalle siempre muestra el tipo del lugar.
- Probar imágenes exactas, cercanas y placeholder con un lector de pantalla.
- Solicitar ubicación, probar permiso denegado y revisar los mensajes para contexto inseguro, ubicación no disponible y timeout.
- Activar `prefers-reduced-motion` en el sistema operativo y comprobar sheet, chips, controles y encuadres OpenLayers.
- Revisar estados vacíos y errores de opiniones, quedadas, capas, ruta y ubicación con lector de pantalla.
