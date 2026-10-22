import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            console.warn(
              `\n[Vite Proxy] No se pudo conectar con el backend de rutas en http://127.0.0.1:3001. Asegúrate de ejecutar 'npm run start:routes'. Detalle: ${err.message}\n`
            );
            if (res && !res.headersSent && typeof res.writeHead === 'function') {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: 'El servicio de rutas no está disponible. Asegúrate de ejecutar el backend con npm run start:routes.'
              }));
            }
          });
        },
      },
    },
  },
})