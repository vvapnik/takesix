// Puts the server-rendered landing page into dist/index.html. Runs after the
// client build and the SSR build of src/entry-server.tsx (see package.json).
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const ssrEntry = resolve('dist-ssr/entry-server.js')
const page = resolve('dist/index.html')

const { render } = await import(pathToFileURL(ssrEntry).href)
const html = readFileSync(page, 'utf8')
const empty = '<div id="root"></div>'
if (!html.includes(empty)) throw new Error(`${page}: no ${empty} to fill`)
writeFileSync(page, html.replace(empty, `<div id="root">${render()}</div>`))
rmSync(resolve('dist-ssr'), { recursive: true, force: true })
console.log('prerendered dist/index.html')
