import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Served from https://takesix.vapnik.de/ (vvapnik.github.io/takesix/ redirects
// there). Relative asset paths work at the domain root and under /takesix/ alike.
// Pages: the landing page, the editor, the examples and the agent guide.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        editor: resolve(import.meta.dirname, 'editor/index.html'),
        architecture: resolve(import.meta.dirname, 'examples/architecture/index.html'),
        todo: resolve(import.meta.dirname, 'examples/todo/index.html'),
        agents: resolve(import.meta.dirname, 'agents/index.html'),
      },
    },
  },
})
