import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon-180.png', 'og-image.png'],
      manifest: {
        name: 'Secure HUD Chatroom',
        short_name: 'SecureChat',
        description: 'Military-grade encrypted stealth chatroom',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone', // <--- This removes browser bars
        orientation: 'portrait',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for large libraries
          'socket-io': ['socket.io-client'],
          'framer-motion': ['framer-motion'],
          'react-vendor': ['react', 'react-dom'],
          'crypto-utils': ['crypto-js', 'uuid'],
          'ui-components': ['react-icons', 'react-toastify', 'qrcode.react'],
          'date-utils': ['date-fns']
        }
      }
    },
    // Increase chunk size warning limit to 600kb since we're splitting chunks
    chunkSizeWarningLimit: 600
  }
});