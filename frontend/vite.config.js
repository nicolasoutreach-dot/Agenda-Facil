import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// Suporte a __dirname em módulos ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@design-system': path.resolve(__dirname, 'design-system'),
    },
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },

  server: {
    port: 3000,
    hmr: {
      overlay: false,
    },
  },

  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },

  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Evita dividir arquivos de config e dados em chunks separados
          if (id.includes('/src/data/') || id.endsWith('vite.config.js')) {
            return undefined;
          }
        },
      },
    },
  },
});
