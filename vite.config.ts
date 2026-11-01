import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Served from https://takesix.vapnik.de/ (vvapnik.github.io/takesix/ redirects
// there). Relative asset paths work at the domain root and under /takesix/ alike.
// Two pages: the landing page and the editor at editor/.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        editor: resolve(import.meta.dirname, 'editor/index.html'),
      },
    },
  },
})
