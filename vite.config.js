import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // 엔진 불러오기

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // 엔진 가동
  ],
  server: {
    proxy: {
      '/api/dart': {
        target: 'https://opendart.fss.or.kr/api/list.json',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/dart/, '')
      }
    }
  }
})