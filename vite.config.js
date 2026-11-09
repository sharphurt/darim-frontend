import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const darimServer = 'http://127.0.0.1:5080'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': darimServer,
      '/auth': darimServer,
    },
  },
})
