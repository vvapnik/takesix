# TakeSix site

The landing page and live demo of [TakeSix](https://takesix.vapnik.de/):
answers as diagrams, not walls of text.

- **Landing page** (`index.html`): two screens with snap scrolling. The pitch
  with install commands and a looping mini demo on top, a live TakeSix diagram
  about TakeSix below, rendered with
  [`@takesix/react`](https://github.com/vvapnik/takesix-react).
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
npm run dev        # http://localhost:5173/ and /editor/
npm run validate   # check the diagram in src/takesix.takesix.json
npm run build      # static site in dist/, landing page prerendered
```

The diagram on the second screen is `src/takesix.takesix.json`; edit it and
run `npm run validate`.

The build prerenders the landing page (`src/entry-server.tsx`,
`scripts/prerender.mjs`), so its text, including a text version of the whole
diagram, is in the HTML for search engines and AI crawlers that do not run
JavaScript. The browser then hydrates it. `public/robots.txt` welcomes AI
crawlers by name; `public/sitemap.xml` lists the pages.

Link previews: Open Graph and Twitter tags in both pages point to
`public/og.png` (1200×630). Its source is `og/og.html`; regenerate the image
with `npm run og` (headless Chrome). The landing page also carries JSON-LD
(`WebSite`, `SoftwareSourceCode`).

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
