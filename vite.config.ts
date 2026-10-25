import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite'
import { marketResponse } from './server/market.ts'

function marketApi(): Plugin {
  let key = ''
  const attach = (middlewares: Connect.Server) => {
    middlewares.use((req, res, next) => {
      const url = req.url ?? ''
      if (!url.startsWith('/api/market')) {
        next()
        return
      }
      void marketResponse(req, res, key)
    })
  }
  return {
    name: 'live-lot',
    configResolved(config) {
      key = loadEnv(config.mode, config.root, '').SERPAPI_KEY ?? ''
    },
    configureServer(server) {
      attach(server.middlewares)
    },
    configurePreviewServer(server) {
      attach(server.middlewares)
    },
  }
}

export default defineConfig({
  plugins: [react(), marketApi()],
  server: {
    host: '0.0.0.0',
    port: 47331,
    strictPort: true,
  },
})
