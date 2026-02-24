import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: './',
  optimizeDeps: {
    include: ['soundtouchjs'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'soundtouchjs': path.resolve(__dirname, './node_modules/soundtouchjs/dist/soundtouch.js'),
      // soundtouchjs is in root node_modules, not in electron/ui/node_modules
      // 'soundtouchjs': path.resolve(__dirname, '../../node_modules/soundtouchjs/dist/soundtouch.js'),
    }
  },
  server: {
    port: 5174,
    fs: {
      allow: ['..', '../..']
    }
  }
});