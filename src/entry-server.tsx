import { StrictMode, type ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { App } from './App'
import { ArchitecturePage } from './pages/ArchitecturePage'
import { TodoPage } from './pages/TodoPage'
import { DataModelPage } from './pages/DataModelPage'
import { PresentationPage } from './pages/PresentationPage'
import { GuidePage } from './pages/GuidePage'
import { FormatPage } from './pages/FormatPage'
import { FaqPage } from './pages/FaqPage'

// Used at build time only (scripts/prerender.mjs): every page as HTML, so
// search engines and AI crawlers that do not run JavaScript see the text.
// The editor is left out: it is a tool, not content.
const PAGES: Record<string, () => ReactNode> = {
  'index.html': () => <App />,
  'examples/architecture/index.html': () => <ArchitecturePage />,
  'examples/todo/index.html': () => <TodoPage />,
  'examples/data-model/index.html': () => <DataModelPage />,
  'examples/presentation/index.html': () => <PresentationPage />,
  'agents/index.html': () => <GuidePage />,
  'format/index.html': () => <FormatPage />,
  'faq/index.html': () => <FaqPage />,
}

export const pages = Object.keys(PAGES)

export function render(page: string): string {
  const Page = PAGES[page]
  if (!Page) throw new Error(`No server render for ${page}`)
  return renderToString(<StrictMode>{Page()}</StrictMode>)
}
