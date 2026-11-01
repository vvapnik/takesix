import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { App } from './App'

// Used at build time only (scripts/prerender.mjs): the landing page as HTML,
// so search engines and AI crawlers that do not run JavaScript see the text.
export function render(): string {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
