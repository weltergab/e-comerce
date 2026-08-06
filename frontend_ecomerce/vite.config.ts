import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'STRIPE_PUBLISHABLE_KEY', 'BACKEND_URL', 'BACKEND_LOCAL_URL'],
  resolve: {
    alias: {
      '@': rootDir,
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
});
