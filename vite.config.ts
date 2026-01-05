import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Backend target: 'cf' for Cloudflare Workers (wrangler), 'node' for Node.js
// Set via VITE_BACKEND env var or defaults to 'cf'
const backend = process.env.VITE_BACKEND || 'cf'

const backendPorts = {
  cf: 8787,    // wrangler dev
  node: 3000,  // node.js server
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/client'),
    },
  },
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${backendPorts[backend] || backendPorts.cf}`,
        changeOrigin: true,
      },
    },
  },
})
