import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  
  // List of potential keys in order of priority
  const potentialKeys = [
    env.USER_GEMINI_KEY,
    process.env.USER_GEMINI_KEY,
    env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY,
    env.API_KEY,
    process.env.API_KEY
  ];

  // Find the first key that isn't empty or a placeholder
  const GEMINI_API_KEY = potentialKeys.find(k => 
    k && 
    k !== '' && 
    k !== 'undefined' && 
    !k.includes('MY_GEMINI_API_KEY') && 
    !k.includes('YOUR_API_KEY')
  ) || '';
  
  return {
    base: '/',
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: 'auto',
        devOptions: {
          enabled: true
        },
        workbox: {
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 15 * 1024 * 1024 // 15MB limit
        },
        manifest: {
          name: '𝙱𝙹𝙴 ~ Tools',
          short_name: 'BJE Tools',
          description: 'A comprehensive suite of web tools',
          theme_color: '#4f46e5',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/favicon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/favicon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(GEMINI_API_KEY),
      'process.env.API_KEY': JSON.stringify(GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
      // HMR is disabled in via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    optimizeDeps: {
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util', '@imgly/background-removal']
    }
  };
});
