import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Served from https://vvapnik.github.io/takesix/, so assets live under /takesix/.
// Two pages: the landing page and the editor at /takesix/editor/.
export default defineConfig({
  base: '/takesix/',
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
