# Instrucciones permanentes del Geoportal

## Stack y límites

- El stack del proyecto es React + Vite, OpenLayers (`ol`), Tailwind CSS y Lucide.
- No cambies el motor de mapa ni agregues librerías de mapas, UI o estilos.
- Los cambios de diseño se hacen solo con JSX y clases de Tailwind. No cambies lógica, estado, hooks, handlers, props ni IDs sin aprobación explícita.
- Antes de editar, presenta un plan enumerando los archivos y cambios previstos y espera aprobación. Después trabaja un punto a la vez, presenta el diff de ese punto y espera confirmación antes de continuar.

## Paleta y cartografía

- Verde de marca: `#14301F` para paneles, `#16A34A` para acciones y `#7FE0A8` para texto claro.
- Morado de acento `#7C3AED`: radio, ruta y acción «Cómo llegar».
- Colores de categorías: azul `#2563EB` para Gimnasio, ámbar `#F59E0B` para Training al aire libre y magenta `#DB2777` para Centros deportivos. Cada color tiene un solo rol.
- Dibuja radio y ruta con doble trazo: contorno blanco debajo y morado encima. Conserva estilos adecuados tanto para mapa claro como satélite.

## Layout responsive

- Escritorio (`≥768px`): sidebar flotante, chips centrados arriba, controles abajo a la derecha y capas abajo a la izquierda.
- Móvil (`<768px`): sidebar como bottom sheet con estados colapsado de `148px`, medio de `60dvh` y expandido de `90dvh`; coordina la altura mediante `--sheet-h`. Los chips van arriba con scroll y el botón de sesión fijo arriba a la derecha.
- Orden de capas: mapa `0`, controles `10`, chips `20`, sheet `30`, alertas `50` y modales `60`.

## Movimiento y accesibilidad

- Centra puntos con `view.fit` y padding calculado según el layout, sin cambiar la proyección ni transformar coordenadas manualmente si ya existe un helper del proyecto.
- Respeta `prefers-reduced-motion`: las animaciones OpenLayers usan duración `0` y las transiciones CSS se desactivan cuando la preferencia está activa.
- Los botones de solo ícono requieren `aria-label` en español; los íconos decorativos llevan `aria-hidden="true"`.
- Mantén foco visible con `focus-visible`, contraste mínimo de `4.5:1` para texto normal y objetivos táctiles de al menos `44px`.
- No dependas únicamente del color para expresar estados activos, errores o categorías.
