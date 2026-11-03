// Puts the server-rendered pages into dist/. Runs after the client build and
// the SSR build of src/entry-server.tsx (see package.json).
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const ssrEntry = resolve('dist-ssr/entry-server.js')
const { pages, render } = await import(pathToFileURL(ssrEntry).href)

const empty = '<div id="root"></div>'
for (const page of pages) {
  const file = resolve('dist', page)
  const html = readFileSync(file, 'utf8')
  if (!html.includes(empty)) throw new Error(`${file}: no ${empty} to fill`)
  writeFileSync(file, html.replace(empty, `<div id="root">${render(page)}</div>`))
  console.log(`prerendered dist/${page}`)
}
rmSync(resolve('dist-ssr'), { recursive: true, force: true })
