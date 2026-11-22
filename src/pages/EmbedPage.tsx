import { useEffect, type DetailedHTMLProps, type HTMLAttributes } from 'react'
import { SiteHeader } from '../shared/SiteHeader'
import { SiteFooter } from '../shared/SiteFooter'
import { CodeBlock } from '../shared/CodeBlock'
import { EXAMPLES } from '../examples'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'take-six': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & { src?: string; theme?: string; view?: string; menu?: boolean }
    }
  }
}

// How to put a diagram on another page without React: an <iframe> with a
// self-contained HTML file, or the <take-six> web component from a CDN.

const REACT = 'https://github.com/vvapnik/takesix-react'
const ELEMENT_URL = 'https://cdn.jsdelivr.net/npm/@takesix/react@1/dist/element.js'

// The live example below is the real element from the CDN, as a reader's page would load it
const DEMO_JSON = JSON.stringify(EXAMPLES.architecture).replace(/</g, '\\u003c')

function useElementScript() {
  useEffect(() => {
    if (customElements.get('take-six') || document.querySelector(`script[src="${ELEMENT_URL}"]`)) return
    const script = document.createElement('script')
    script.src = ELEMENT_URL
    script.defer = true
    document.head.append(script)
  }, [])
}

const BUILD = `npx @takesix/react build architecture.takesix.json   # writes architecture.html`

const IFRAME = `<iframe
  src="/diagrams/architecture.html"
  title="Architecture of the shop"
  style="width: 100%; height: 480px; border: 0"
></iframe>`

const ELEMENT = `<script src="${ELEMENT_URL}" defer></script>

<take-six src="/diagrams/architecture.takesix.json"></take-six>`

const INLINE = `<take-six theme="dark" view="in=api" style="height: 600px">
  <script type="application/json">
    { "takesix": "1.2", "title": "Online shop", "blocks": [ … ] }
  </script>
</take-six>`

const STYLE = `take-six {
  height: 70vh;
  border: 1px solid #d9dee5;
  border-radius: 12px;
}`

const SECTIONS = [
  { id: 'choose', title: 'Which one' },
  { id: 'iframe', title: 'An iframe' },
  { id: 'element', title: 'The <take-six> element' },
  { id: 'attributes', title: 'Attributes' },
  { id: 'size', title: 'Size and style' },
  { id: 'react', title: 'In a React app' },
]

export function EmbedPage() {
  useElementScript()
  return (
    <div className="page">
      <SiteHeader />
      <main className="doc-layout">
        <nav className="toc" aria-label="On this page">
          <p>On this page</p>
          <ol>
            {SECTIONS.map(s => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="doc">
          <p className="kicker">Embed</p>
          <h1>Put a diagram on your page</h1>
          <p className="lead">
            A TakeSix diagram works on any web page: documentation, a blog, a wiki, an internal portal. The page does
            not need React or a build step. Readers click into blocks right there, without leaving the page.
          </p>

          <h2 id="choose">Which one</h2>
          <ul>
            <li>
              <strong>An iframe</strong> with a self-contained HTML file: nothing to load from elsewhere, works even
              where scripts on the page are not allowed. One file per diagram.
            </li>
            <li>
              <strong>The <code>{'<take-six>'}</code> element</strong>: one script, then a tag per diagram that reads
              the <code>.takesix.json</code> file directly. Best when you keep the JSON next to your docs and update it
              often.
            </li>
          </ul>

          <h2 id="iframe">An iframe</h2>
          <p>
            Turn the JSON into one HTML file with the viewer inside. It opens without a server or network, so any
            static host serves it:
          </p>
          <CodeBlock code={BUILD} />
          <p>
            The editor makes the same file: <strong>Save as HTML</strong> in the menu of{' '}
            <a href="/editor/">the editor</a>. Put the file next to your page and embed it:
          </p>
          <CodeBlock code={IFRAME} label="HTML" />
          <p>
            To open the diagram at one block, add its address to the link: <code>architecture.html#in=api</code>.
            “Copy link to this screen” in the diagram’s menu gives such a link.
          </p>

          <h2 id="element">The {'<take-six>'} element</h2>
          <p>
            Load the script once, from npm through the jsDelivr CDN (or unpkg). <code>@1</code> keeps you on version 1
            with its fixes; pin an exact version such as <code>@1.3.0</code> if you prefer. Then each{' '}
            <code>{'<take-six>'}</code> tag shows a diagram:
          </p>
          <CodeBlock code={ELEMENT} label="HTML" />
          <p>This is such an element, with the architecture example inside it. Click a block:</p>
          <figure className="embed-demo">
            <take-six menu>
              <script type="application/json" dangerouslySetInnerHTML={{ __html: DEMO_JSON }} />
            </take-six>
          </figure>
          <p>
            The file in <code>src</code> is fetched by the browser, so it must be on the same site or served with CORS
            (GitHub raw files are). The document can also sit inside the tag, which needs no extra request:
          </p>
          <CodeBlock code={INLINE} label="HTML" />
          <p>
            The diagram lives in a shadow root: your page’s CSS does not change the diagram, and the diagram’s CSS
            does not touch your page. Several diagrams on one page work independently. A diagram that cannot be shown
            says why in its own box.
          </p>

          <h2 id="attributes">Attributes</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Attribute</th>
                  <th>What it does</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>src</code></td>
                  <td>URL of the <code>.takesix.json</code> file. Without it, the element reads the <code>{'<script type="application/json">'}</code> inside it.</td>
                </tr>
                <tr>
                  <td><code>theme</code></td>
                  <td><code>auto</code> (the reader’s system setting, default), <code>light</code> or <code>dark</code>.</td>
                </tr>
                <tr>
                  <td><code>view</code></td>
                  <td>
                    The screen to open: <code>in=api</code> opens the block <code>api</code>, <code>at=api</code>{' '}
                    shows its level with the block highlighted. Without it, a link like{' '}
                    <code>page.html#in=api</code> opens the diagram that has that block.
                  </td>
                </tr>
                <tr>
                  <td><code>menu</code></td>
                  <td>Shows the diagram’s menu: open in the editor, copy a link, save as JSON.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>Change an attribute from a script and the diagram follows: a new <code>src</code> loads a new file.</p>

          <h2 id="size">Size and style</h2>
          <p>
            The element is a block 30rem tall. Set its height, border or margins like any other element; the diagram
            fits its blocks into whatever room it gets:
          </p>
          <CodeBlock code={STYLE} label="CSS" />

          <h2 id="react">In a React app</h2>
          <p>
            Use the component itself from <a href={REACT}>@takesix/react</a>: it shares React with your app and lets
            you control the screen on display, the theme and editing from code.
          </p>

          <p className="doc-next">
            No diagram yet? Ask <a href="/agents/">your AI agent</a> for one, or build it in{' '}
            <a href="/editor/">the editor</a>. The format is explained in <a href="/format/">plain words</a>.
          </p>
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}
