import { useState } from 'react'
import { Link } from 'react-router-dom'
import { css } from '../utils/css.js'
import '../styles/auth.css'

// Sign In / Sign Up — one white-and-lime auth screen matching the hero.
// A split layout: a bright brand panel on the left, the form card on the right.
// `mode` picks copy + fields; both live on the same component so the two pages
// stay perfectly consistent. Form submit is stubbed (no backend yet).

const ROLES = ['Player', 'Coach', 'Venue', 'Organiser']

export default function Auth({ mode = 'signin' }) {
  const isSignup = mode === 'signup'
  const [role, setRole] = useState('Player')
  const [show, setShow] = useState(false)

  return (
    <div className="au-root">
      {/* left brand rail */}
      <aside className="au-brand">
        <Link to="/" className="au-logo" aria-label="Lvl-Up Sports home">
          <span className="au-logo-mark">L</span>
          <span className="au-logo-word">Lvl-Up</span>
        </Link>
        <div className="au-brand-mid">
          <h1 className="au-brand-h1">
            {isSignup ? <>Level up your <span className="au-hl">game</span>.</> : <>Welcome <span className="au-hl">back</span>.</>}
          </h1>
          <p className="au-brand-sub">
            {isSignup
              ? 'Create your account and turn every match into measurable progress.'
              : 'Sign in to pick up your analytics, rankings, and progress where you left off.'}
          </p>
          <ul className="au-brand-list">
            <li>AI-powered performance analytics</li>
            <li>Head-to-head player comparisons</li>
            <li>Local benchmarks and rankings</li>
          </ul>
        </div>
        <span className="au-brand-foot">Your AI-powered Coaching Assistant</span>
      </aside>

      {/* right form panel */}
      <main className="au-panel">
        <div className="au-card">
          <div className="au-switch" role="tablist" aria-label="Auth mode">
            <Link to="/signin" role="tab" aria-selected={!isSignup} className={!isSignup ? 'au-tab on' : 'au-tab'}>Sign In</Link>
            <Link to="/signup" role="tab" aria-selected={isSignup} className={isSignup ? 'au-tab on' : 'au-tab'}>Sign Up</Link>
          </div>

          <h2 className="au-title">{isSignup ? 'Create your account' : 'Sign in to your account'}</h2>
          <p className="au-lead">
            {isSignup ? 'It takes less than a minute.' : 'Enter your details to continue.'}
          </p>

          <form className="au-form" onSubmit={(e) => e.preventDefault()}>
            {isSignup && (
              <label className="au-field">
                <span className="au-label">Full name</span>
                <input className="au-input" type="text" name="name" autoComplete="name" placeholder="Aadhitya Kumar" required />
              </label>
            )}
            <label className="au-field">
              <span className="au-label">Email</span>
              <input className="au-input" type="email" name="email" autoComplete="email" placeholder="you@example.com" required />
            </label>
            <label className="au-field">
              <span className="au-label">Password</span>
              <span className="au-pass">
                <input className="au-input" type={show ? 'text' : 'password'} name="password" autoComplete={isSignup ? 'new-password' : 'current-password'} placeholder="••••••••" required />
                <button type="button" className="au-eye" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? 'Hide' : 'Show'}</button>
              </span>
            </label>

            {isSignup && (
              <div className="au-field">
                <span className="au-label">I am a…</span>
                <div className="au-roles">
                  {ROLES.map((r) => (
                    <button type="button" key={r} className={r === role ? 'au-role on' : 'au-role'} onClick={() => setRole(r)}>{r}</button>
                  ))}
                </div>
              </div>
            )}

            {!isSignup && (
              <div className="au-row">
                <label className="au-check"><input type="checkbox" /> Remember me</label>
                <a className="au-link" href="#">Forgot password?</a>
              </div>
            )}

            <button type="submit" className="au-submit">{isSignup ? 'Create account' : 'Sign in'}</button>

            <div className="au-or"><span>or continue with</span></div>
            <div className="au-oauth">
              <button type="button" className="au-oauth-btn">Google</button>
              <button type="button" className="au-oauth-btn">Apple</button>
            </div>
          </form>

          <p className="au-foot">
            {isSignup ? (
              <>Already have an account? <Link to="/signin" className="au-link strong">Sign in</Link></>
            ) : (
              <>New to Lvl-Up? <Link to="/signup" className="au-link strong">Create an account</Link></>
            )}
          </p>
          {isSignup && (
            <p className="au-terms">By creating an account you agree to our <a className="au-link" href="#">Terms</a> and <a className="au-link" href="#">Privacy Policy</a>.</p>
          )}
        </div>
      </main>
    </div>
  )
}
