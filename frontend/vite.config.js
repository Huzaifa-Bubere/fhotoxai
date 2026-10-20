import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const generalApiTarget = env.VITE_PROXY_API_TARGET || 'http://127.0.0.1:3001'
  const aiApiTarget = env.VITE_PROXY_AI_API_TARGET || 'http://127.0.0.1:5001'

  return {
    plugins: [react()],
    base: '/',
    server: {
      proxy: {
        '/api': {
          target: generalApiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        '/ai-api': {
          target: aiApiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ai-api/, ''),
        },
      },
    },
  }
})
