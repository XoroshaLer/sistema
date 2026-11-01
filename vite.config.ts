import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Relative base so the same build works on GitHub Pages under /<repo>/ and locally.
export default defineConfig({
  base: './',
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered by src/sw-register.ts, which also checks for updates when the app is reopened.
      injectRegister: false,
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Система',
        short_name: 'Система',
        description: 'Личная система прокачки: тренировки, прогресс, журнал',
        lang: 'ru',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0E1319',
        theme_color: '#0E1319',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webp,woff2}'],
        // A new version takes over right away instead of waiting for every window to close,
        // which on iPhone may never happen for an app kept in memory.
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
});
