// Writes dist/llms.txt and dist/llms-full.txt (https://llmstxt.org/): a short
// text about TakeSix for language models, and the same with the full format
// specification and the agent skill. Built from the sources on every build,
// so they never go stale: the definition and the FAQ from src/about.json, the
// specification from @takesix/core, the skill from @takesix/mcp.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const SITE = 'https://takesix.vapnik.de'
const GITHUB = 'https://github.com/vvapnik'

const about = JSON.parse(readFileSync(resolve('src/about.json'), 'utf8'))
const pkg = name => JSON.parse(readFileSync(resolve('node_modules', name, 'package.json'), 'utf8'))
const fromPackage = (name, file) => readFileSync(resolve('node_modules', name, file), 'utf8').trim()

const core = pkg('@takesix/core')
const mcp = pkg('@takesix/mcp')

const faq = about.faq.map(({ q, a }) => `### ${q}\n\n${a}`).join('\n\n')

const short = `# TakeSix

> ${about.definition}

An agent writes the diagram as a JSON document (\`.takesix.json\`): a tree of
blocks, each level laid out on a 6×6 grid, with arrows between the blocks of
one screen. A validator checks it, and a renderer turns it into one
self-contained HTML file. Everything is open source under the MIT license and
runs locally.

Connect it to an agent with the MCP server (\`npx -y @takesix/mcp\`) or the
Agent Skill. In Claude Code:

\`\`\`
claude mcp add --scope user takesix -- npx -y @takesix/mcp
\`\`\`

## Docs

- [Guide: connect TakeSix to your agent](${SITE}/agents/): Claude Code, Claude Desktop, Codex, Cursor, VS Code and other MCP clients
- [The format in plain words](${SITE}/format/): blocks, the 6×6 grid, links, checks
- [FAQ](${SITE}/faq/): what TakeSix is and how it differs from Mermaid, C4 and draw.io
- [Format specification](${GITHUB}/takesix-core/blob/main/FORMAT.md): the exact rules of the JSON format
- [JSON Schema](https://takesix.vapnik.de/schema/takesix-1.0.schema.json)

## Packages

- [@takesix/mcp](${GITHUB}/takesix-agent): MCP server with the tools \`guide\`, \`validate\` and \`show\`, and the Agent Skill
- [@takesix/core](${GITHUB}/takesix-core): the format, validation and layout, for TypeScript
- [@takesix/react](${GITHUB}/takesix-react): viewer and editor component for React

## Examples

- [Architecture of a SaaS web app](${SITE}/examples/architecture/)
- [To-do list with statuses](${SITE}/examples/todo/)

## Optional

- [Full text for models](${SITE}/llms-full.txt): this file, the FAQ, the format specification and the rules of the agent skill
- [Editor](${SITE}/editor/): open, edit and save a \`.takesix.json\` file in the browser
`

// The skill's references: the blueprints for kinds of diagrams
const blueprintDir = resolve('node_modules/@takesix/mcp/skill/takesix/references/blueprints')
const blueprints = readdirSync(blueprintDir)
  .filter(f => f.endsWith('.md'))
  .sort()
  .map(f => `### Blueprint: ${f.replace(/\.md$/, '')}\n\n${readFileSync(join(blueprintDir, f), 'utf8').trim()}`)

const full = `${short}
## FAQ

${faq}

## Format specification (@takesix/core ${core.version}, FORMAT.md)

${fromPackage('@takesix/core', 'FORMAT.md')}

## Agent skill (@takesix/mcp ${mcp.version}, SKILL.md)

The rules an agent follows to make a readable TakeSix diagram. The MCP tool
\`guide\` returns the same text.

${fromPackage('@takesix/mcp', 'skill/takesix/SKILL.md')}

${blueprints.join('\n\n')}
`

writeFileSync(resolve('dist/llms.txt'), short)
writeFileSync(resolve('dist/llms-full.txt'), full)
console.log(`wrote dist/llms.txt (${short.length} chars), dist/llms-full.txt (${full.length} chars)`)
