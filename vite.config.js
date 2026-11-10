import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // En GitHub Pages la app vive en /<repositorio>/ (lo define el flujo «Publicar app»).
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  server: { host: true },
});
