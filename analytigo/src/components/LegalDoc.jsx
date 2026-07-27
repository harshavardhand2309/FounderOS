import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PageShell, { LEGAL_LINKS } from './PageShell.jsx'

// Renderer for the three policy documents. Sections come in as structured data
// so all three share numbering, anchors, the sticky contents rail and the
// scrollspy. Each section may carry a plain-English summary ("short"), which is
// convenience only — the precedence note under the title says the legal text
// governs if the two ever disagree.

function Body({ blocks }) {
  return blocks.map((b, i) => {
    if (typeof b === 'string') return <p key={i} dangerouslySetInnerHTML={{ __html: b }} />
    if (b.h) return <h3 key={i}>{b.h}</h3>
    if (b.ul) return <ul key={i}>{b.ul.map((li, j) => <li key={j} dangerouslySetInnerHTML={{ __html: li }} />)}</ul>
    if (b.ol) return <ol key={i}>{b.ol.map((li, j) => <li key={j} dangerouslySetInnerHTML={{ __html: li }} />)}</ol>
    return null
  })
}

export default function LegalDoc({ doc }) {
  const [active, setActive] = useState(doc.sections[0]?.id)
  const proseRef = useRef(null)

  // scrollspy — highlight the contents entry for the section in view
  useEffect(() => {
    const els = doc.sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean)
    if (!els.length) return
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting)
        if (vis.length) setActive(vis[0].target.id)
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [doc])

  return (
    <PageShell title={doc.title}>
      <div className="pg-head">
        <div className="pg-head-in">
          <span className="pg-eyebrow">Legal</span>
          <h1 className="pg-h1">{doc.title}</h1>
          <p className="pg-lede">{doc.lede}</p>
          <div className="pg-badges">
            <span className="pg-badge">Effective {doc.effective}</span>
            <span className="pg-badge">Last updated {doc.updated}</span>
            <span className="pg-badge">Version {doc.version}</span>
            <span className="pg-badge">Governing law · India</span>
          </div>
          <nav className="pg-switch" aria-label="Policies">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className={l.to === doc.path ? 'on' : ''}>{l.label}</Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="pg-doc">
        <nav className="pg-toc" aria-label="Contents">
          <h2 className="pg-toc-h">Contents</h2>
          <ol className="pg-toc-list">
            {doc.sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className={s.id === active ? 'is-active' : ''}>
                  {String(i + 1).padStart(2, '0')} · {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="pg-prose" ref={proseRef}>
          <details className="pg-jump">
            <summary>Jump to a section</summary>
            <ul>
              {doc.sections.map((s, i) => (
                <li key={s.id}><a href={`#${s.id}`}>{i + 1}. {s.title}</a></li>
              ))}
            </ul>
          </details>

          <div className="pg-note">
            <strong>Draft for review.</strong> This document was prepared as a working draft and
            has not been reviewed by a lawyer. Anything in square brackets is a placeholder that
            must be completed, and the whole document should be checked by an Indian legal
            adviser before it is relied on. Where a plain-English summary appears alongside a
            clause, the summary is for convenience only — the full text governs.
          </div>

          {doc.sections.map((s, i) => (
            <section key={s.id} id={s.id}>
              <h2><span className="pg-num">{String(i + 1).padStart(2, '0')}</span>{s.title}</h2>
              {s.short && (
                <div className="pg-short" aria-label="Plain-English summary">
                  <b>In short</b>
                  <p>{s.short}</p>
                </div>
              )}
              <Body blocks={s.body} />
            </section>
          ))}

          <div className="pg-contact-card">
            <h3>Questions about this policy?</h3>
            <p><strong>[LEGAL ENTITY NAME]</strong> — [REGISTERED OFFICE ADDRESS], India</p>
            <p>CIN: [CIN] · GSTIN: [GSTIN]</p>
            <p>Grievance Officer: [NAME], [DESIGNATION] — <a href="mailto:contact@thelvlupsports.com">contact@thelvlupsports.com</a>, [PHONE]</p>
            <p>General enquiries: <Link to="/contact">Contact us</Link></p>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
