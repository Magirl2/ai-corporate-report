import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api/dart': {
        // ✅ 수정: target은 origin만, rewrite로 경로를 /api/list.json으로 변환
        target: 'https://opendart.fss.or.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/dart/, '/api/list.json')
      }
    }
  }
})