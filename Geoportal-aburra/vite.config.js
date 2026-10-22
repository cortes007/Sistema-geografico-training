import { defineConfig, loadEnv } from 'vite'
import { cwd, env as nodeEnv } from 'node:process'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, cwd(), '')
  const backendUrl = nodeEnv.VITE_BACKEND_URL || env.VITE_BACKEND_URL || 'http://127.0.0.1:3001'

  return {
    plugins: [
      react(),
      tailwindcss()
    ],
    server: {
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (err, req, res) => {
              console.warn(
                `\n[Vite Proxy] No se pudo conectar con el backend de rutas en ${backendUrl}. Asegúrate de ejecutar 'npm run start:routes'. Detalle: ${err.message}\n`
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
  }
})