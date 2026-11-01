import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import '@takesix/react/style.css'
import './base.css'
import './site.css'
import { App } from './App'

const root = document.getElementById('root')!
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)
// The built page arrives prerendered (scripts/prerender.mjs); the dev server sends it empty.
if (root.hasChildNodes()) hydrateRoot(root, app)
else createRoot(root).render(app)
