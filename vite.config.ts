import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  build: {
    target: 'es2020',
    cssMinify: 'lightningcss',
    rollupOptions: {
      output: {
        manualChunks: {
          // Split audio library from core bundle — only loaded in Vita view
          'howler': ['howler'],
        },
      },
    },
  },
  css: {
    devSourcemap: true,
  },
  assetsInclude: ['**/*.webm'],
});
