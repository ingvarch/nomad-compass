import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Read .dev.vars file (same as wrangler uses)
function loadDevVars(): Record<string, string> {
  const devVarsPath = path.resolve(__dirname, '.dev.vars')
  if (!fs.existsSync(devVarsPath)) return {}

  const content = fs.readFileSync(devVarsPath, 'utf-8')
  const vars: Record<string, string> = {}

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const [key, ...valueParts] = trimmed.split('=')
    if (key) vars[key] = valueParts.join('=')
  }

  return vars
}

export default defineConfig(() => {
  const devVars = loadDevVars()

  return {
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
      proxy: {
        '/api': {
          target: 'http://localhost:8787',
          changeOrigin: true,
          // If wrangler is not running, return mock config
          configure: (proxy) => {
            proxy.on('error', (err, req, res) => {
              if (req.url === '/api/config') {
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({
                  nomadAddr: devVars.NOMAD_ADDR || process.env.NOMAD_ADDR || 'http://localhost:4646'
                }))
              } else {
                res.writeHead(502, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: 'Backend not running. Start with: pnpm run dev:worker' }))
              }
            })
          },
        },
      },
    },
  }
})
