import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' keeps the build portable: GitHub Pages project sites, any static host,
// or even opening dist/index.html locally. HashRouter keeps deep links refresh-safe
// on hosts without rewrite rules (see docs/architecture.md).
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    css: false,
  },
});
