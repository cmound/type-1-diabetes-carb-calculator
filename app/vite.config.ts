import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Type 1 Diabetes Carb Calculator',
        short_name: 'T1D Carb Calc',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
          {
            src: '/icons/T1D-Icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/T1D-Icon-256.png',
            sizes: '256x256',
            type: 'image/png',
          },
          {
            src: '/icons/T1D-Icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/T1D-Icon-1024.png',
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})
