import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('node_modules/ol/') || id.includes('node_modules\\ol\\') || id.includes('rbush')) {
            return 'vendor-ol';
          }
          if (id.includes('@supabase')) {
            return 'vendor-supabase';
          }
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules\\react\\') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules\\react-dom\\') ||
            id.includes('scheduler')
          ) {
            return 'vendor-react';
          }
          return undefined;
        },
      },
    },
  },
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
