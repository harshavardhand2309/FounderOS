import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import '../styles/page.css'

// Shared chrome for every stand-alone page (legal + Explore). White/lime theme,
// matching the site footer and the auth screens rather than the cinematic home.

export const EXPLORE_LINKS = [
  { label: 'Cams', to: '/cams' },
  { label: 'Analytics', to: '/analytics' },
  { label: 'Tools', to: '/tools' },
  { label: 'Careers', to: '/careers' },
  { label: 'Contact Us', to: '/contact' },
]
export const POLICY_LINKS = [
  { label: 'Terms of Service', to: '/terms' },
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Return & Refund Policy', to: '/refunds' },
]
export const LEGAL_LINKS = [...POLICY_LINKS, { label: 'Delete Account', to: '/delete-account' }]

export default function PageShell({ title, children }) {
  // stand-alone pages always open at the top
  useEffect(() => {
    window.scrollTo(0, 0)
    if (title) document.title = `${title} · Lvl-Up Sports`
    return () => { document.title = 'Lvl-Up Sports' }
  }, [title])

  return (
    <div className="pg-root">
      <a className="pg-skip" href="#pg-main">Skip to content</a>

      <header className="pg-top">
        <Link to="/" className="pg-brand" aria-label="Lvl-Up Sports home">
          <span className="pg-brand-mark">L</span>
          <span className="pg-brand-word">Lvl-Up<span className="pg-brand-chip">Sports</span></span>
        </Link>
        <nav className="pg-topnav" aria-label="Site sections">
          {EXPLORE_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="pg-topnav-link">{l.label}</Link>
          ))}
          <Link to="/signin" className="pg-top-cta">Sign In</Link>
        </nav>
      </header>

      <main id="pg-main">{children}</main>

      <footer className="pg-foot">
        <div className="pg-foot-inner">
          <div className="pg-foot-brand">
            <h2 className="pg-foot-word">Lvl-Up <span className="pg-foot-chip">Sports</span></h2>
            <p className="pg-foot-anthem">Your AI-powered Coaching Assistant</p>
          </div>
          <div className="pg-foot-cols">
            <div>
              <h4 className="pg-foot-h4">Explore</h4>
              {EXPLORE_LINKS.map((l) => <Link key={l.to} className="pg-foot-link" to={l.to}>{l.label}</Link>)}
            </div>
            <div>
              <h4 className="pg-foot-h4">Legal</h4>
              {LEGAL_LINKS.map((l) => <Link key={l.to} className="pg-foot-link" to={l.to}>{l.label}</Link>)}
            </div>
            <div>
              <h4 className="pg-foot-h4">Reach Us</h4>
              <a className="pg-foot-link" href="mailto:contact@thelvlupsports.com">contact@thelvlupsports.com</a>
              <a className="pg-foot-link" href="tel:+919025867882">+91 90258 67882 · Call &amp; WhatsApp</a>
              <Link className="pg-foot-link" to="/">Back to home</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
