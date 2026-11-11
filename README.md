# TakeSix site

> TakeSix is an open format and libraries that let an AI agent answer with a diagram you can click into instead of a wall of text: at most six blocks per screen, and any block opens into up to six more.
> **[takesix.vapnik.de](https://takesix.vapnik.de/)** · [FAQ](https://takesix.vapnik.de/faq/)

[![A TakeSix diagram of a web app architecture: a click zooms into a block, into one of its parts, into its text, and back to the top.](https://takesix.vapnik.de/demo.gif)](https://takesix.vapnik.de/examples/architecture/)

The landing page and live demo of [TakeSix](https://takesix.vapnik.de/):
answers as diagrams, not walls of text.

- **Landing page** (`index.html`): two screens with snap scrolling. The pitch
  with install commands and a looping mini demo on top, a live TakeSix diagram
  about TakeSix below, rendered with
  [`@takesix/react`](https://github.com/vvapnik/takesix-react).
- **Examples** (`examples/architecture/`, `data-model/`, `presentation/`,
  `todo/`): a live diagram
  with a text version, a link to open it in the editor and the prompt to get
  one like it from an agent. The diagrams are in `src/examples/`.
- **Guide** (`agents/`): how to connect TakeSix to Claude Code, Claude
  Desktop, Codex, Cursor, VS Code and other MCP clients.
- **Format** (`format/`): the JSON format in plain words, with grid pictures
  drawn in CSS. `FORMAT.md` in takesix-core stays the exact specification.
- **FAQ** (`faq/`): what TakeSix is and how it differs from Mermaid, C4 and
  draw.io, with `FAQPage` structured data.
- **Editor** (`editor/index.html`, served at `/editor/`): open a
  `.takesix.json` file (button or drag and drop), edit it, save it back. No
  backend: nothing leaves the browser.

The project lives in several repositories:

- [takesix-core](https://github.com/vvapnik/takesix-core): the format and the core library
- [takesix-react](https://github.com/vvapnik/takesix-react): viewer and editor for React
- [takesix-agent](https://github.com/vvapnik/takesix-agent): Agent Skill and MCP server

The original prototype app is kept on the `legacy` branch.

## Development

Node 24 LTS (`.nvmrc`).

```bash
npm install
npm run dev        # http://localhost:5173/, /examples/…, /agents/, /format/, /editor/
npm run validate   # check the site's diagrams
npm run build      # static site in dist/, landing page prerendered
```

The diagram on the home page is `src/takesix.takesix.json`, the examples are
in `src/examples/`; edit them and run `npm run validate`. The editor opens any
of them with `/editor/?example=<name>`.

Each page is an HTML file with its own entry in `src/entries/`; a new page
also needs a line in `vite.config.ts`, `src/entry-server.tsx` and
`public/sitemap.xml`.

The build prerenders every page except the editor (`src/entry-server.tsx`,
`scripts/prerender.mjs`), so its text, including a text version of the whole
diagram, is in the HTML for search engines and AI crawlers that do not run
JavaScript. The browser then hydrates it. `public/robots.txt` welcomes AI
crawlers by name; `public/sitemap.xml` lists the pages.

Link previews: Open Graph and Twitter tags in both pages point to
`public/og.png` (1200×630). Its source is `og/og.html`; regenerate the image
with `npm run og` (headless Chrome). The landing page also carries JSON-LD
(`WebSite`, `SoftwareSourceCode`).

The READMEs of all repositories show `public/demo.gif`: the architecture
example zooming in level by level and back. `npm run demo-gif` records it again
(headless Chrome over the DevTools protocol, then ffmpeg); run it after a
change to the viewer's look, then deploy the site before the READMEs change.

For language models the build writes `dist/llms.txt` and `dist/llms-full.txt`
([llms.txt](https://llmstxt.org/)) with `scripts/llms.mjs`: the definition and
the FAQ from `src/about.json`, the format specification from `@takesix/core`
and the skill from `@takesix/mcp` (a dev dependency only for this). The FAQ
page shows the same `src/about.json`. The definition is repeated word for word
in the READMEs and `package.json` descriptions of the other repositories.

After each deploy the workflow pings IndexNow with the URLs from the sitemap,
so Bing, Yandex and others pick up changes right away. The key is served from
`public/<key>.txt`.

Every push to `main` builds the site and deploys it to GitHub Pages
(`.github/workflows/pages.yml`). Pages must use "GitHub Actions" as its source
in the repository settings. The site is served at https://takesix.vapnik.de/
(a CNAME to `vvapnik.github.io` in Cloudflare, DNS only, plus the custom
domain in the Pages settings). Asset paths are relative (`base: './'`), so the
build also works under `vvapnik.github.io/takesix/`.

## AI-assisted development

This project is developed with the help of [Claude Code](https://claude.com/claude-code)
(Anthropic). Commits are authored and reviewed by the maintainer.

## License

[MIT](LICENSE)
