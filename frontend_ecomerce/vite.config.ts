import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendPort = Number(env.PORT_BACKEND || 3001);
  const frontendPort = Number(env.PORT_FRONTEND || 5173);

  return {
    plugins: [react()],
    envPrefix: ['VITE_', 'STRIPE_PUBLISHABLE_KEY', 'BACKEND_URL', 'USE_REMOTE_BACKEND'],
    resolve: {
      alias: {
        '@': rootDir,
      },
    },
    server: {
      host: '0.0.0.0',
      port: frontendPort,
      proxy: {
        '/api': `http://localhost:${backendPort}`,
      },
    },
  };
});
