import { StrictMode, type ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { App } from './App'
import { ArchitecturePage } from './pages/ArchitecturePage'
import { TodoPage } from './pages/TodoPage'
import { GuidePage } from './pages/GuidePage'
import { FormatPage } from './pages/FormatPage'

// Used at build time only (scripts/prerender.mjs): every page as HTML, so
// search engines and AI crawlers that do not run JavaScript see the text.
// The editor is left out: it is a tool, not content.
const PAGES: Record<string, () => ReactNode> = {
  'index.html': () => <App />,
  'examples/architecture/index.html': () => <ArchitecturePage />,
  'examples/todo/index.html': () => <TodoPage />,
  'agents/index.html': () => <GuidePage />,
  'format/index.html': () => <FormatPage />,
}

export const pages = Object.keys(PAGES)

export function render(page: string): string {
  const Page = PAGES[page]
  if (!Page) throw new Error(`No server render for ${page}`)
  return renderToString(<StrictMode>{Page()}</StrictMode>)
}
