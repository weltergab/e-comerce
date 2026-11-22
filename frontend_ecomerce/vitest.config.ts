import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(viteConfig, defineConfig({
  // Impede carregar .env.local durante os testes, mantendo aliases e plugins Vite.
  envDir: false,
  test: { allowOnly: false, passWithNoTests: false },
}));
