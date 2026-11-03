import { StrictMode, type ReactNode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'

/** Hydrates a prerendered page (scripts/prerender.mjs); the dev server sends it empty, so it renders instead. */
export function mount(page: ReactNode) {
  const root = document.getElementById('root')!
  const app = <StrictMode>{page}</StrictMode>
  if (root.hasChildNodes()) hydrateRoot(root, app)
  else createRoot(root).render(app)
}
