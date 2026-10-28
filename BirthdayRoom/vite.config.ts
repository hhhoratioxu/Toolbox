import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          'three-core': ['three'],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    watch: { ignored: ['**/playwright-report/**', '**/test-results/**', '**/artifacts/**'] },
  },
});
