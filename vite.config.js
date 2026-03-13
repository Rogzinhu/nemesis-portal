import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // Isso força o site a procurar os arquivos na pasta certa
  build: {
    outDir: 'dist',
  }
})
