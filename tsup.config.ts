import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/entry.node.ts'],
  format: ['esm'],
  outDir: 'dist-node',
  target: 'node20',
  clean: true,
  external: ['hono', '@hono/node-server'],
})
