import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { PRELOADER_HTML } from '@takesix/react/preloader'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import about from './src/about.json'

// Served from https://takesix.vapnik.de/ (vvapnik.github.io/takesix/ redirects
// there). Relative asset paths work at the domain root and under /takesix/ alike.
// Pages: the landing page, the editor, the examples, the agent guide, the format
// and the FAQ.

// FAQPage structured data for the FAQ page, from the same source as its text
const FAQ_JSONLD = `<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: about.faq.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
})}</script>`

// The JSON Schemas live at permanent addresses on this site: their `$id` is
// the URL, and `.takesix.json` files point their `$schema` there. Every format
// version keeps its schema (files written as 1.0 still point at 1.0). The
// files come from @takesix/core; `$id` is set to the served URL so the two
// never disagree.
const SCHEMAS: Record<string, string> = {
  'schema/takesix-1.1.schema.json': '@takesix/core/schema.json',
  'schema/takesix-1.0.schema.json': '@takesix/core/schema-1.0.json',
}
const schemaJson = (path: string) => {
  const file = createRequire(import.meta.url).resolve(SCHEMAS[path]!)
  const schema = JSON.parse(readFileSync(file, 'utf8'))
  return `${JSON.stringify({ ...schema, $id: `https://takesix.vapnik.de/${path}` }, null, 2)}\n`
}

export default defineConfig({
  base: './',
  plugins: [
    react(),
    // The editor is not prerendered: it shows the loading screen until its
    // script runs and React replaces the content of #root.
    {
      name: 'takesix-preloader',
      transformIndexHtml: (html, ctx) => ctx.path.startsWith('/editor/')
        ? html.replace('<div id="root"></div>', `<div id="root">${PRELOADER_HTML}</div>`)
        : html,
    },
    {
      name: 'takesix-faq-jsonld',
      transformIndexHtml: html => html.replace('<!-- faq-jsonld -->', FAQ_JSONLD),
    },
    {
      name: 'takesix-schema',
      configureServer: server => {
        for (const path of Object.keys(SCHEMAS)) {
          server.middlewares.use(`/${path}`, (_req, res) => {
            res.setHeader('Content-Type', 'application/schema+json')
            res.end(schemaJson(path))
          })
        }
      },
      generateBundle() {
        for (const path of Object.keys(SCHEMAS)) this.emitFile({ type: 'asset', fileName: path, source: schemaJson(path) })
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        editor: resolve(import.meta.dirname, 'editor/index.html'),
        architecture: resolve(import.meta.dirname, 'examples/architecture/index.html'),
        todo: resolve(import.meta.dirname, 'examples/todo/index.html'),
        'data-model': resolve(import.meta.dirname, 'examples/data-model/index.html'),
        presentation: resolve(import.meta.dirname, 'examples/presentation/index.html'),
        agents: resolve(import.meta.dirname, 'agents/index.html'),
        format: resolve(import.meta.dirname, 'format/index.html'),
        faq: resolve(import.meta.dirname, 'faq/index.html'),
      },
    },
  },
})
