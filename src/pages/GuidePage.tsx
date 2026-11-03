import { SiteHeader } from '../shared/SiteHeader'
import { SiteFooter } from '../shared/SiteFooter'
import { CodeBlock } from '../shared/CodeBlock'

// The long guide: how to connect TakeSix to each agent, how to ask for a
// diagram, and what to do when it does not work.

const SERVER_JSON = `{
  "mcpServers": {
    "takesix": {
      "command": "npx",
      "args": ["-y", "@takesix/mcp"]
    }
  }
}`

const SECTIONS = [
  { id: 'how', title: 'How it works' },
  { id: 'claude-code', title: 'Claude Code' },
  { id: 'claude-desktop', title: 'Claude Desktop' },
  { id: 'codex', title: 'Codex' },
  { id: 'cursor', title: 'Cursor' },
  { id: 'vscode', title: 'VS Code' },
  { id: 'other', title: 'Other MCP clients' },
  { id: 'web', title: 'claude.ai and ChatGPT' },
  { id: 'ask', title: 'How to ask' },
  { id: 'trouble', title: 'Troubleshooting' },
]

export function GuidePage() {
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
          <p className="kicker">Guide</p>
          <h1>Connect TakeSix to your AI agent</h1>
          <p className="lead">
            Once connected, your agent can answer with a diagram you click into instead of pages of text. It takes one
            command or a few lines of configuration, and works with Claude Code, Claude Desktop, Codex, Cursor, VS Code
            and other agents that support MCP.
          </p>

          <h2 id="how">How it works</h2>
          <p>There are two ways to connect. Both teach the agent the same rules and check its diagrams.</p>
          <ul>
            <li>
              <strong>MCP server</strong> <code>@takesix/mcp</code> works with any agent that supports the Model
              Context Protocol. It runs on your computer through <code>npx</code>; nothing is sent anywhere. Needs
              Node.js 22 or newer.
            </li>
            <li>
              <strong>Agent Skill</strong> is a folder of instructions and a script for Claude. Needs only Node.js.
            </li>
          </ul>
          <p>The MCP server gives the agent three tools:</p>
          <ul>
            <li>
              <code>guide</code>: the format and the rules that make a diagram readable. The agent reads it first.
            </li>
            <li>
              <code>validate</code>: checks a diagram and lists each problem with its place in the JSON, so the agent
              fixes its own answer.
            </li>
            <li>
              <code>show</code>: writes the diagram as one HTML file that opens in any browser, without internet. In
              apps that support MCP Apps, such as Claude Desktop, the diagram also opens right in the chat.
            </li>
          </ul>

          <h2 id="claude-code">Claude Code</h2>
          <p>Add the MCP server for all your projects:</p>
          <CodeBlock code="claude mcp add --scope user takesix -- npx -y @takesix/mcp" label="Terminal" />
          <p>
            Without <code>--scope user</code> it is added to the current project only. Check that it is there with{' '}
            <code>claude mcp list</code>, or type <code>/mcp</code> inside Claude Code.
          </p>
          <p>
            Claude Code shows the answer as text, so the agent gives you the path of the HTML file; open it in your
            browser.
          </p>
          <p>
            <strong>Or install the skill</strong> instead of the server:
          </p>
          <CodeBlock
            code={`git clone https://github.com/vvapnik/takesix-agent
cp -R takesix-agent/skill/takesix ~/.claude/skills/takesix`}
            label="Terminal"
          />
          <p>
            Claude picks the skill up when you ask for an overview of something structured, or for a TakeSix diagram
            by name.
          </p>

          <h2 id="claude-desktop">Claude Desktop</h2>
          <ol>
            <li>
              Open <strong>Settings → Developer → Edit Config</strong>. This opens{' '}
              <code>claude_desktop_config.json</code>.
            </li>
            <li>
              Add <code>takesix</code> to <code>mcpServers</code> (keep the servers that are already there):
            </li>
          </ol>
          <CodeBlock code={SERVER_JSON} label="claude_desktop_config.json" />
          <ol start={3}>
            <li>Quit Claude Desktop completely and start it again.</li>
          </ol>
          <p>
            Claude Desktop supports MCP Apps, so the diagram appears in the conversation, with a button to open it full
            screen.
          </p>

          <h2 id="codex">Codex</h2>
          <CodeBlock code="codex mcp add takesix -- npx -y @takesix/mcp" label="Terminal" />
          <p>
            Or add it by hand to <code>~/.codex/config.toml</code>. The longer start-up timeout gives{' '}
            <code>npx</code> time to download the package the first time:
          </p>
          <CodeBlock
            code={`[mcp_servers.takesix]
command = "npx"
args = ["-y", "@takesix/mcp"]
startup_timeout_sec = 30`}
            label="~/.codex/config.toml"
          />
          <p>
            Check with <code>codex mcp list</code>.
          </p>

          <h2 id="cursor">Cursor</h2>
          <p>
            Add the server to <code>~/.cursor/mcp.json</code> for all projects, or to <code>.cursor/mcp.json</code> in
            one project:
          </p>
          <CodeBlock code={SERVER_JSON} label="mcp.json" />
          <p>
            Then check that <code>takesix</code> is enabled in <strong>Cursor Settings → MCP</strong>.
          </p>

          <h2 id="vscode">VS Code</h2>
          <p>
            GitHub Copilot uses MCP servers in agent mode. Add <code>.vscode/mcp.json</code> to your project. Note
            that VS Code calls the list <code>servers</code>:
          </p>
          <CodeBlock
            code={`{
  "servers": {
    "takesix": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@takesix/mcp"]
    }
  }
}`}
            label=".vscode/mcp.json"
          />
          <p>Open Copilot Chat in agent mode; the TakeSix tools appear in its tool list.</p>

          <h2 id="other">Other MCP clients</h2>
          <p>
            Most clients take the same <code>mcpServers</code> block as Claude Desktop, only in their own file:
          </p>
          <ul>
            <li>
              Windsurf: <code>~/.codeium/windsurf/mcp_config.json</code>
            </li>
            <li>
              Gemini CLI: <code>~/.gemini/settings.json</code>
            </li>
            <li>Others: look for “MCP servers” in the settings and add a stdio server with the command below.</li>
          </ul>
          <CodeBlock code="npx -y @takesix/mcp" label="Command" />

          <h2 id="web">claude.ai and ChatGPT in the browser</h2>
          <p>
            Agents in the browser can only reach MCP servers on the internet, and TakeSix runs on your computer for
            now. A hosted server is planned. Until then, use Claude Desktop or one of the coding agents above.
          </p>

          <h2 id="ask">How to ask</h2>
          <p>Ask in plain words and mention TakeSix, at least the first few times:</p>
          <ul>
            <li>“Explain the architecture of this repository as a TakeSix diagram.”</li>
            <li>“Summarize this spec as a TakeSix diagram I can click into.”</li>
            <li>“Show our plan for the quarter as a TakeSix diagram, with ✅ ⏳ ○ for the status of each task.”</li>
            <li>“Compare these three libraries as a TakeSix diagram.”</li>
          </ul>
          <p>
            To get diagrams without asking every time, add a line to your project’s <code>CLAUDE.md</code> or{' '}
            <code>AGENTS.md</code>:
          </p>
          <CodeBlock
            code="When an answer has structure (architecture, a plan, a comparison, an overview of code or a document), answer with a TakeSix diagram using the takesix MCP server, and keep the text reply short."
            label="CLAUDE.md or AGENTS.md"
            wrap
          />
          <p>
            See what such answers look like: <a href="/examples/architecture/">architecture</a> and{' '}
            <a href="/examples/todo/">to-do list</a>.
          </p>

          <h2 id="trouble">Troubleshooting</h2>
          <dl>
            <dt>The server does not start</dt>
            <dd>
              Check <code>node -v</code>: the server needs Node.js 22 or newer. The first start downloads the package,
              which can take a while on a slow connection; run <code>npx -y @takesix/mcp</code> once in a terminal to
              warm the cache.
            </dd>
            <dt>The client gives up while starting the server</dt>
            <dd>
              Raise its start-up timeout (Codex: <code>startup_timeout_sec</code>), or install the server once with{' '}
              <code>npm install -g @takesix/mcp</code> and use <code>takesix-mcp</code> as the command, without{' '}
              <code>npx</code>.
            </dd>
            <dt>Windows: “npx is not recognized” or the server never connects</dt>
            <dd>
              Some clients cannot run <code>npx</code> directly on Windows. Use <code>"command": "cmd"</code> with{' '}
              <code>"args": ["/c", "npx", "-y", "@takesix/mcp"]</code>.
            </dd>
            <dt>The diagram does not appear in the chat</dt>
            <dd>
              Your client does not show MCP Apps. The agent still gives you the path of the HTML file; open it in a
              browser.
            </dd>
            <dt>The agent answers with text anyway</dt>
            <dd>
              Ask for a TakeSix diagram by name, or add the line above to <code>CLAUDE.md</code> /{' '}
              <code>AGENTS.md</code>. To check that the tools are connected, ask: “Which TakeSix tools do you have?”
            </dd>
          </dl>

          <p className="doc-next">
            Building your own app? <a href="https://github.com/vvapnik/takesix-react">@takesix/react</a> shows and
            edits TakeSix diagrams in React; <a href="/editor/">the editor</a> on this site is built with it.
          </p>
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}
