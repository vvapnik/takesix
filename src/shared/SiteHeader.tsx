import { useEffect, useRef } from 'react'
// Inlined so the logo takes the text colour (it draws with currentColor)
import logoSvg from '../logo.svg?raw'
import { ChevronDown } from './icons'
import './header.css'

const GITHUB = 'https://github.com/vvapnik'

interface MenuItem {
  href: string
  title: string
  note: string
}

const EXAMPLES: MenuItem[] = [
  { href: '/examples/architecture/', title: 'Architecture', note: 'A SaaS web app, part by part' },
  { href: '/examples/todo/', title: 'To-do list', note: 'Launch a website, with statuses' },
  { href: '/#demo', title: 'TakeSix itself', note: 'The diagram on the home page' },
]

const SOURCES: MenuItem[] = [
  { href: `${GITHUB}/takesix-core/blob/main/FORMAT.md`, title: 'Format', note: 'The JSON specification' },
  { href: `${GITHUB}/takesix-agent`, title: 'Agents', note: 'Agent Skill and MCP server' },
  { href: `${GITHUB}/takesix-react`, title: 'React', note: 'Viewer and editor component' },
  { href: `${GITHUB}/takesix`, title: 'This site', note: 'Landing page, examples, editor' },
]

/** The header of every page: brand, examples, the agent guide, the editor and the sources. */
export function SiteHeader() {
  return (
    <header className="bar">
      <a className="brand" href="/" aria-label="TakeSix home">
        <span className="logo" dangerouslySetInnerHTML={{ __html: logoSvg }} />
        <span className="brand-name">TakeSix</span>
      </a>
      <nav className="links" aria-label="Site">
        <Menu label="Examples" items={EXAMPLES} />
        <a href="/agents/">Guide</a>
        <a href="/editor/">Editor</a>
        <Menu label="Source" items={SOURCES} />
      </nav>
    </header>
  )
}

/** A dropdown of links; closes on Escape and on a click outside. */
function Menu({ label, items }: { label: string; items: MenuItem[] }) {
  const ref = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const menu = ref.current
    if (!menu) return
    const close = () => menu.removeAttribute('open')
    const onPointer = (e: PointerEvent) => {
      if (!menu.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menu.open) {
        close()
        menu.querySelector('summary')?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <details className="menu" ref={ref}>
      <summary>
        {label}
        <ChevronDown />
      </summary>
      <ul>
        {items.map(item => (
          <li key={item.title}>
            <a href={item.href}>
              <span>{item.title}</span>
              <small>{item.note}</small>
            </a>
          </li>
        ))}
      </ul>
    </details>
  )
}
