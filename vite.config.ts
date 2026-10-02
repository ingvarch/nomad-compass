import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Backend target: 'cf' for Cloudflare Workers (wrangler), 'bun' for Bun server
// Set via VITE_BACKEND env var or defaults to 'cf'
const backend = process.env.VITE_BACKEND || 'cf'

const backendPorts = {
  cf: 8787,    // wrangler dev
  bun: 3000,   // bun server
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src/client'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('xterm') || id.includes('@xterm')) {
              return 'vendor-xterm';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('react/')) {
              return 'vendor-react';
            }
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${backendPorts[backend] || backendPorts.cf}`,
        changeOrigin: true,
        ws: true, // Enable WebSocket proxy
      },
    },
  },
})
