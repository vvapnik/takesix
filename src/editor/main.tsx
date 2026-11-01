import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@takesix/react/style.css'
import '../base.css'
import './editor.css'
import { Editor } from './Editor'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Editor />
  </StrictMode>,
)
