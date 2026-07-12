import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/auth': 'http://localhost:8000',
      '/users': 'http://localhost:8000',
      '/vehicles': 'http://localhost:8000',
      '/vehicle-documents': 'http://localhost:8000',
      '/drivers': 'http://localhost:8000',
      '/trips': 'http://localhost:8000',
      '/fuel': 'http://localhost:8000',
      '/expenses': 'http://localhost:8000',
      '/maintenance': 'http://localhost:8000',
      '/notifications': 'http://localhost:8000',
      '/dashboard': 'http://localhost:8000',
      '/reports': 'http://localhost:8000',
      '/export': 'http://localhost:8000',
    },
  },
})
