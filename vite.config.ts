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
  server: {
    watch: {
      // Windows: chokidar throws a fatal EBUSY 'error' (crashing the dev
      // server) when it tries to watch an image binary that is still being
      // written or locked — e.g. while you drop/download a card image into
      // public/. These are static assets that don't need HMR, so exclude the
      // image binaries from the watcher. Code changes still hot-reload.
      ignored: [
        '**/public/assets/**/*.{png,jpg,jpeg,webp,avif,gif,tiff,bmp}',
        '**/assets/**/*.{png,jpg,jpeg,webp,avif,gif,tiff,bmp}',
      ],
    },
  },
  assetsInclude: ['**/*.webm'],
});
