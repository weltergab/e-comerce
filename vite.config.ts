import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'STRIPE_PUBLISHABLE_KEY'],
  resolve: {
    alias: {
      '@': rootDir,
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
