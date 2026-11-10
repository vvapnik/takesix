import { SiteHeader } from '../shared/SiteHeader'
import { SiteFooter } from '../shared/SiteFooter'
import about from '../about.json'

// Short answers that a person, a search engine or a language model can quote
// as they are. The questions and answers live in src/about.json, shared with
// llms.txt and the FAQPage data in faq/index.html.

export function FaqPage() {
  return (
    <div className="page">
      <SiteHeader />
      <main className="doc-layout">
        <nav className="toc" aria-label="On this page">
          <p>On this page</p>
          <ol>
            {about.faq.map((item, i) => (
              <li key={item.q}>
                <a href={`#q${i + 1}`}>{item.q}</a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="doc">
          <p className="kicker">FAQ</p>
          <h1>Questions about TakeSix</h1>
          <p className="lead">{about.definition}</p>

          {about.faq.map((item, i) => (
            <section key={item.q}>
              <h2 id={`q${i + 1}`}>{item.q}</h2>
              <p>{item.a}</p>
            </section>
          ))}

          <p className="doc-next">
            Ready to try? <a href="/agents/">Connect TakeSix to your agent</a> or read{' '}
            <a href="/format/">the format</a>.
          </p>
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}
