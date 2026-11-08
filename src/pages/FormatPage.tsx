import { SiteHeader } from '../shared/SiteHeader'
import { SiteFooter } from '../shared/SiteFooter'
import { CodeBlock } from '../shared/CodeBlock'

// The format in plain words: what a TakeSix file holds and how it turns into
// screens. FORMAT.md in takesix-core stays the exact specification.

const CORE = 'https://github.com/vvapnik/takesix-core'
const SPEC = `${CORE}/blob/main/FORMAT.md`
const SCHEMA_URL = 'https://raw.githubusercontent.com/vvapnik/takesix-core/main/schema/takesix-1.0.schema.json'

const EXAMPLE = `{
  "$schema": "${SCHEMA_URL}",
  "takesix": "1.0",
  "title": "Online shop",
  "blocks": [
    { "id": "web", "at": "A1:C1", "icon": "🖥", "title": "Web app", "description": "React SPA" },
    {
      "id": "api",
      "at": "D1:F1",
      "title": "API",
      "description": "Public HTTP API",
      "children": [
        { "id": "auth", "at": "A1:B1", "title": "Auth" },
        { "id": "orders", "at": "C1:F1", "title": "Orders", "details": "Handles **checkout** and refunds." }
      ]
    },
    { "id": "db", "at": "A2:F2", "title": "Database" }
  ],
  "links": [
    { "id": "l1", "from": "web", "to": "api", "label": "REST" },
    { "id": "l2", "from": "api", "to": "db", "label": "SQL" }
  ]
}`

const SECTIONS = [
  { id: 'idea', title: 'The idea' },
  { id: 'example', title: 'A first diagram' },
  { id: 'blocks', title: 'Blocks' },
  { id: 'grid', title: 'The grid' },
  { id: 'links', title: 'Links' },
  { id: 'flowcharts', title: 'Flowcharts' },
  { id: 'checks', title: 'Checking a diagram' },
  { id: 'extend', title: 'Extensions and versions' },
]

export function FormatPage() {
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
          <p className="kicker">Format 1.0</p>
          <h1>The TakeSix format</h1>
          <p className="lead">
            A TakeSix diagram is one JSON file: a tree of blocks, never more than six side by side, and the arrows
            between them. This page explains it in plain words. The exact specification is{' '}
            <a href={SPEC}>FORMAT.md</a>, with a <a href={SCHEMA_URL}>JSON Schema</a> for editors and agents.
          </p>

          <h2 id="idea">The idea</h2>
          <p>
            A long explanation is hard to read because everything is on the page at once. TakeSix splits it into
            screens:
          </p>
          <ul>
            <li>
              <strong>One screen, at most six blocks.</strong> The top level is the whole answer in six blocks or fewer.
            </li>
            <li>
              <strong>Every block can open.</strong> Its children are the next screen, again at most six. Depth is not
              limited, so a big system still reads one small screen at a time.
            </li>
            <li>
              <strong>Arrows show how parts connect</strong>, between the blocks of one screen.
            </li>
            <li>
              <strong>Long text is a level of its own.</strong> A card shows a title and a short line; a block that
              needs explaining opens into its text in Markdown, the way other blocks open into blocks.
            </li>
          </ul>
          <p>
            The file is plain JSON, so people edit it by hand, agents write it, and any program can read it. One HTML
            file with the JSON and a viewer inside opens as a diagram in any browser.
          </p>

          <h2 id="example">A first diagram</h2>
          <p>
            An online shop in three blocks. The API opens into two more, and two arrows connect the parts:
          </p>
          <CodeBlock code={EXAMPLE} label="shop.takesix.json" />
          <p>The top screen of this file:</p>
          <GridFigure
            caption="The top level: Web app and API share the first row, Database fills the second."
            blocks={[
              { at: 'A1:C1', label: '🖥 Web app' },
              { at: 'D1:F1', label: 'API' },
              { at: 'A2:F2', label: 'Database' },
            ]}
          />
          <p>
            Open <strong>API</strong> and you see <strong>Auth</strong> and <strong>Orders</strong>. The arrows link
            blocks of the top screen: Web app to API, and API to Database.
          </p>

          <h2 id="blocks">Blocks</h2>
          <p>A document has a title and its top-level blocks:</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Field</th>
                  <th>What it is</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>takesix</code>
                  </td>
                  <td>
                    The format version, <code>"1.0"</code>. Required.
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>title</code>
                  </td>
                  <td>The name of the diagram. Required.</td>
                </tr>
                <tr>
                  <td>
                    <code>blocks</code>
                  </td>
                  <td>The top level, one to six blocks. Required.</td>
                </tr>
                <tr>
                  <td>
                    <code>links</code>
                  </td>
                  <td>All arrows of the document, on every level, in one list.</td>
                </tr>
                <tr>
                  <td>
                    <code>description</code>
                  </td>
                  <td>A line under the title on the top screen.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>Each block is a card on the screen:</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Field</th>
                  <th>What it is</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>id</code>
                  </td>
                  <td>A name that arrows use to point at the block, unique in the whole file. Required.</td>
                </tr>
                <tr>
                  <td>
                    <code>title</code>
                  </td>
                  <td>The heading of the card. Required.</td>
                </tr>
                <tr>
                  <td>
                    <code>at</code>
                  </td>
                  <td>
                    Where the card sits on its screen, like <code>"A1:C2"</code>; see <a href="#grid">the grid</a>.
                    Required.
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>description</code>
                  </td>
                  <td>A short line of plain text on the card.</td>
                </tr>
                <tr>
                  <td>
                    <code>details</code>
                  </td>
                  <td>
                    Long text in Markdown: lists, code, links. The block opens into it instead of child blocks, so a
                    block has <code>children</code> or <code>details</code>, never both.
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>icon</code>
                  </td>
                  <td>An emoji or one character before the title.</td>
                </tr>
                <tr>
                  <td>
                    <code>shape</code>
                  </td>
                  <td>
                    A flowchart symbol, such as <code>"decision"</code>; see <a href="#flowcharts">flowcharts</a>. A
                    plain card when left out.
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>children</code>
                  </td>
                  <td>The blocks inside, at most six. They make the screen that opens on a click. Never together with <code>details</code>.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            <strong>Ids never change.</strong> Arrows, comments and shared editing refer to blocks by id, so a tool
            renames the title, not the id. Short readable ids such as <code>"orders-db"</code> are the easiest to edit
            by hand.
          </p>

          <h2 id="grid">The grid</h2>
          <p>
            Every screen is a grid of <strong>6 columns and 6 rows</strong>, named like a spreadsheet: columns{' '}
            <code>A</code>–<code>F</code>, rows <code>1</code>–<code>6</code>. A block takes one cell, such as{' '}
            <code>"B3"</code>, or a rectangle from its top-left to its bottom-right cell, such as <code>"A1:C2"</code>{' '}
            (three columns wide, two rows tall).
          </p>
          <ul>
            <li>Blocks of one screen never overlap. Cells nobody takes stay empty.</li>
            <li>
              The width of a block is its share of the screen: all six columns are equally wide. Rows grow with the
              text.
            </li>
            <li>
              Only <code>at</code> places a block; the order in the file does not matter. Screen readers and text
              versions read a screen row by row, left to right, and editors keep the file in that order.
            </li>
          </ul>
          <p>Three shapes cover most diagrams:</p>
          <div className="grid-shapes">
            <GridFigure
              caption="A list: one block per full-width row."
              blocks={[
                { at: 'A1:F1', label: 'Step 1' },
                { at: 'A2:F2', label: 'Step 2' },
                { at: 'A3:F3', label: 'Step 3' },
              ]}
            />
            <GridFigure
              caption="Tiles: three blocks per row."
              blocks={[
                { at: 'A1:B1', label: 'One' },
                { at: 'C1:D1', label: 'Two' },
                { at: 'E1:F1', label: 'Three' },
                { at: 'A2:B2', label: 'Four' },
                { at: 'C2:D2', label: 'Five' },
                { at: 'E2:F2', label: 'Six' },
              ]}
            />
            <GridFigure
              caption="A main block with helpers beside it."
              blocks={[
                { at: 'A1:D3', label: 'Main' },
                { at: 'E1:F1', label: 'Helper' },
                { at: 'E2:F2', label: 'Helper' },
                { at: 'E3:F3', label: 'Helper' },
              ]}
            />
          </div>
          <p>
            Arrows run straight between blocks in one row or one column, so put connected blocks next to each other.
            Empty cells between small blocks leave room for arrows that branch and for their labels.
          </p>

          <h2 id="links">Links</h2>
          <p>
            Arrows live in one list, <code>links</code>, next to the blocks. Each one goes <code>from</code> a block{' '}
            <code>to</code> another, by id:
          </p>
          <ul>
            <li>
              <code>label</code>: a few words on the arrow, such as <code>"REST"</code>.
            </li>
            <li>
              <code>description</code>: a longer explanation of the connection.
            </li>
            <li>
              <code>direction</code>: <code>"forward"</code> (the default, from → to), <code>"both"</code> or{' '}
              <code>"none"</code> for a plain line.
            </li>
            <li>
              <code>style</code>: <code>"solid"</code> (the default), <code>"dashed"</code> or <code>"dotted"</code>.
            </li>
            <li>
              <code>id</code>: optional, editors set it so an arrow can be changed later.
            </li>
          </ul>
          <p>
            A link joins two blocks of one screen, children of the same block. To connect parts deeper inside,
            link the blocks that hold them, on the screen they share, as <strong>API → Database</strong> does.
          </p>
          <ul>
            <li>Several links between the same two blocks merge into one arrow; two opposite ones make a two-way arrow.</li>
            <li>
              A straight arrow with a block in its way goes around it, beside the column or below the row.
            </li>
            <li>
              A link between blocks of different screens is never drawn. Validators warn about it, and editors do not
              create it.
            </li>
          </ul>

          <h2 id="flowcharts">Flowcharts</h2>
          <p>
            An algorithm draws its steps with <code>shape</code>, in the symbols of ISO 5807 (ГОСТ 19.701-90, close to
            DIN 66001), only the common ones:
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>shape</th>
                  <th>Drawn as</th>
                  <th>For</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['process', 'a plain card (the default)', 'a step that does something'],
                  ['terminator', 'round ends', 'start and end'],
                  ['decision', 'a diamond', 'a condition: label each exit, like "yes" and "no"'],
                  ['io', 'a parallelogram', 'data in or out'],
                  ['subprocess', 'double sides', 'a step whose children are its own steps'],
                  ['loop-start, loop-end', 'cut corners, top or bottom', 'the two ends of a loop'],
                ].map(([shape, drawn, use]) => (
                  <tr key={shape}>
                    <td>
                      <code>{shape}</code>
                    </td>
                    <td>{drawn}</td>
                    <td>{use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Unlike the standard, every arrow has a head, and a long algorithm becomes subprocesses that open into
            their steps instead of pages joined by connectors: a screen still holds six blocks at most. Validators
            warn when a decision has no 2 or 3 labelled exits, or a screen has more than one start.
          </p>

          <h2 id="checks">Checking a diagram</h2>
          <p>A diagram that breaks these rules is rejected, with the place of each problem in the JSON:</p>
          <ul>
            <li>a required field is missing or empty, or has the wrong type;</li>
            <li>
              <code>at</code> is not a cell or a rectangle of the 6×6 grid, or two blocks of one screen take the same
              cell;
            </li>
            <li>a screen has more than six blocks;</li>
            <li>
              a block has both <code>children</code> and <code>details</code>: it opens into blocks or into text, not
              both;
            </li>
            <li>two blocks or two links share an id;</li>
            <li>a link points at an id that is not a block, or from a block to itself;</li>
            <li>
              <code>direction</code>, <code>style</code> or <code>shape</code> has an unknown value, or the version
              is not <code>1.x</code>.
            </li>
          </ul>
          <p>
            Unknown fields are only a warning: they are often typos. The JSON Schema is stricter and rejects them, which
            catches mistakes while an agent writes a diagram.
          </p>
          <p>Ways to check a file:</p>
          <ul>
            <li>
              Add <code>"$schema"</code> as in the example, and editors such as VS Code underline mistakes as you
              type.
            </li>
            <li>
              Agents call the <code>validate</code> tool of the MCP server; see <a href="/agents/">the guide</a>.
            </li>
            <li>
              In code, <code>validateDocument()</code> from <a href={CORE}>@takesix/core</a> checks everything,
              including what JSON Schema cannot: unique ids, link ends and overlapping blocks.{' '}
              <code>lintLayout()</code> also warns when an arrow runs through a third block or two arrows cross.
            </li>
          </ul>

          <h2 id="extend">Extensions and versions</h2>
          <p>
            Tools keep their own data in <code>meta</code> on the document, a block or a link, under keys with the
            tool’s name: <code>{'{ "meta": { "confluence.pageId": "123" } }'}</code>. Every tool keeps the{' '}
            <code>meta</code> it does not understand, so data survives a trip through another editor.
          </p>
          <p>
            The version is <code>"major.minor"</code>. A minor version only adds optional fields, so a 1.0 reader opens
            any 1.x file. A new major version is a breaking change, and readers refuse majors they do not know.
          </p>

          <p className="doc-next">
            Try it: open <a href="/editor/">the editor</a> and build a diagram by hand, or connect{' '}
            <a href="/agents/">your AI agent</a> and let it write one. The full specification is{' '}
            <a href={SPEC}>FORMAT.md</a>.
          </p>
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}

const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F']

interface FigureBlock {
  at: string
  label: string
}

/** A static picture of one screen's grid: column letters, row numbers and the blocks on it. */
function GridFigure({ blocks, caption }: { blocks: FigureBlock[]; caption: string }) {
  const placed = blocks.map(b => ({ ...b, ...parseAt(b.at) }))
  const rows = Math.max(...placed.map(b => b.row2))
  return (
    <figure className="grid-figure">
      <div className="grid-cells" style={{ gridTemplateRows: `auto repeat(${rows}, minmax(2.4rem, auto))` }}>
        {COLUMNS.map((c, i) => (
          <span key={c} className="grid-axis" style={{ gridColumn: i + 2, gridRow: 1 }}>
            {c}
          </span>
        ))}
        {Array.from({ length: rows }, (_, i) => (
          <span key={i} className="grid-axis" style={{ gridColumn: 1, gridRow: i + 2 }}>
            {i + 1}
          </span>
        ))}
        {placed.map(b => (
          <span
            key={b.at}
            className="grid-block"
            style={{ gridColumn: `${b.col1 + 2} / ${b.col2 + 3}`, gridRow: `${b.row1 + 1} / ${b.row2 + 2}` }}
          >
            {b.label}
            <code>{b.at}</code>
          </span>
        ))}
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  )
}

/** "B3" or "A1:C2" → zero-based columns and one-based rows of the corners. */
function parseAt(at: string) {
  const [a = '', b = a] = at.split(':')
  const cell = (s: string) => ({ col: COLUMNS.indexOf(s.charAt(0)), row: Number(s.slice(1)) })
  const p = cell(a)
  const q = cell(b)
  return { col1: p.col, row1: p.row, col2: q.col, row2: q.row }
}
