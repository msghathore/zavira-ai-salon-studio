import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  server: {
    port: 3000,
    host: true,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        exports: 'named'
      }
    }
  }
});
