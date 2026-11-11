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

// The JSON Schema lives at a permanent address on this site: its `$id` is this
// URL, and `.takesix.json` files point their `$schema` here. The file comes from
// @takesix/core; `$id` is set to the served URL so the two never disagree.
const SCHEMA_PATH = 'schema/takesix-1.0.schema.json'
const SCHEMA_ID = `https://takesix.vapnik.de/${SCHEMA_PATH}`
const schemaJson = () => {
  const file = createRequire(import.meta.url).resolve('@takesix/core/schema.json')
  const schema = JSON.parse(readFileSync(file, 'utf8'))
  return `${JSON.stringify({ ...schema, $id: SCHEMA_ID }, null, 2)}\n`
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
        server.middlewares.use(`/${SCHEMA_PATH}`, (_req, res) => {
          res.setHeader('Content-Type', 'application/schema+json')
          res.end(schemaJson())
        })
      },
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: SCHEMA_PATH, source: schemaJson() })
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
        agents: resolve(import.meta.dirname, 'agents/index.html'),
        format: resolve(import.meta.dirname, 'format/index.html'),
        faq: resolve(import.meta.dirname, 'faq/index.html'),
      },
    },
  },
})
