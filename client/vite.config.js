import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // server: {
  //   allowedHosts: ["sequence-discretion-humor-salt.trycloudflare.com"],
  // },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "icon-180.png", "og-image.png"],
      workbox: {
        navigateFallbackDenylist: [
          /\/sitemap\.xml$/,
          /\/robots\.txt$/,
          /\/favicon\.ico$/,
          /\/[^/?]+\.[^/]+$/, // any path with file extension
        ],
      },
      manifest: {
        name: "Ghost Tunnel",
        short_name: "GhostTunnel",
        description: "Military-grade encrypted stealth chatroom",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone", // <--- This removes browser bars
        orientation: "portrait",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }

            if (id.includes('/react/')) {
              return 'react-vendor';
            }

            if (id.includes('socket.io-client')) {
              return 'socket-vendor';
            }

            if (id.includes('framer-motion') || id.includes('gsap') || id.includes('lenis')) {
              return 'motion-vendor';
            }

            if (id.includes('react-icons')) {
              return 'icons-vendor';
            }

            if (id.includes('date-fns') || id.includes('crypto-js') || id.includes('uuid') || id.includes('react-toastify')) {
              return 'utility-vendor';
            }

            return 'vendor';
          }
        },
      },
    },
  },
});
