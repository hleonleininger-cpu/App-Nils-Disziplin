import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { target: 'es2020', sourcemap: false, chunkSizeWarningLimit: 700 },
  test: { environment: 'node', include: ['tests/**/*.test.js'] },
});
