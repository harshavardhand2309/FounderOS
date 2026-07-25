import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { css } from '../utils/css.js'
import '../styles/auth.css'

// Sign In / Sign Up — one white-and-lime auth screen matching the hero.
// Sign In accepts email OR phone. Sign Up collects name, email, phone, and a
// role, then advances to a verification step (phone OTP + email code). The
// send/verify and social sign-in calls are routed through auth stubs in
// utils — swap those for a real provider (Firebase, Supabase, custom API)
// without touching this component.

const ROLES = ['Player', 'Coach', 'Venue', 'Organiser']

// --- auth stubs: replace the bodies with a real provider (see AUTH note) ---
async function sendVerification() { /* provider: send phone OTP + email code */ return true }
async function confirmVerification() { /* provider: verify the entered codes */ return true }
async function socialSignIn(provider) {
  // provider: Firebase signInWithPopup(googleProvider) / (appleProvider), etc.
  return { ok: false, message: `${provider} sign-in connects once the auth backend is wired.` }
}

function CodeInput({ label, value, onChange }) {
  const refs = useRef([])
  const set = (i, v) => {
    const d = v.replace(/\D/g, '').slice(-1)
    const next = value.split('')
    next[i] = d
    onChange(next.join('').slice(0, 6))
    if (d && refs.current[i + 1]) refs.current[i + 1].focus()
  }
  const onKey = (i, e) => { if (e.key === 'Backspace' && !value[i] && refs.current[i - 1]) refs.current[i - 1].focus() }
  return (
    <div className="au-field">
      <span className="au-label">{label}</span>
      <div className="au-otp">
        {Array.from({ length: 6 }, (_, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el }}
            className="au-otp-box"
            inputMode="numeric"
            maxLength={1}
            value={value[i] || ''}
            onChange={(e) => set(i, e.target.value)}
            onKeyDown={(e) => onKey(i, e)}
            aria-label={`${label} digit ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

export default function Auth({ mode = 'signin' }) {
  const isSignup = mode === 'signup'
  const [role, setRole] = useState('Player')
  const [show, setShow] = useState(false)
  const [step, setStep] = useState('form') // 'form' | 'verify' | 'done'
  const [notice, setNotice] = useState('')
  const [contact, setContact] = useState({ email: '', phone: '' })
  const [phoneCode, setPhoneCode] = useState('')
  const [emailCode, setEmailCode] = useState('')

  const onSignup = async (e) => {
    e.preventDefault()
    const f = e.target
    setContact({ email: f.email.value, phone: f.phone.value })
    await sendVerification()
    setStep('verify')
    setNotice('')
  }
  const onVerify = async (e) => {
    e.preventDefault()
    if (phoneCode.length < 6 || emailCode.length < 6) { setNotice('Enter both 6-digit codes to continue.'); return }
    await confirmVerification()
    setStep('done')
  }
  const onSocial = async (provider) => {
    const r = await socialSignIn(provider)
    if (!r.ok) setNotice(r.message)
  }

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

          {/* -------- verification step (sign up) -------- */}
          {step === 'verify' && (
            <>
              <h2 className="au-title">Verify it's you</h2>
              <p className="au-lead">We sent a 6-digit code to <strong>{contact.phone || 'your phone'}</strong> and a link/code to <strong>{contact.email || 'your email'}</strong>.</p>
              <form className="au-form" onSubmit={onVerify}>
                <CodeInput label="Phone OTP" value={phoneCode} onChange={setPhoneCode} />
                <CodeInput label="Email code" value={emailCode} onChange={setEmailCode} />
                {notice && <p className="au-notice">{notice}</p>}
                <button type="submit" className="au-submit">Verify &amp; continue</button>
                <button type="button" className="au-resend" onClick={() => sendVerification()}>Resend codes</button>
                <button type="button" className="au-resend" onClick={() => { setStep('form'); setNotice('') }}>← Back</button>
              </form>
            </>
          )}

          {/* -------- success -------- */}
          {step === 'done' && (
            <div className="au-success">
              <span className="au-success-tick" aria-hidden="true">✓</span>
              <h2 className="au-title">You're verified</h2>
              <p className="au-lead">Your account is ready. Welcome to Lvl-Up Sports.</p>
              <Link to="/" className="au-submit au-submit-link">Go to dashboard</Link>
            </div>
          )}

          {/* -------- form step -------- */}
          {step === 'form' && (
            <>
              <h2 className="au-title">{isSignup ? 'Create your account' : 'Sign in to your account'}</h2>
              <p className="au-lead">{isSignup ? 'It takes less than a minute.' : 'Enter your details to continue.'}</p>

              <form className="au-form" onSubmit={isSignup ? onSignup : (e) => e.preventDefault()}>
                {isSignup && (
                  <label className="au-field">
                    <span className="au-label">Full name</span>
                    <input className="au-input" type="text" name="name" autoComplete="name" placeholder="Aadhitya Kumar" required />
                  </label>
                )}

                {isSignup ? (
                  <>
                    <label className="au-field">
                      <span className="au-label">Email</span>
                      <input className="au-input" type="email" name="email" autoComplete="email" placeholder="you@example.com" required />
                    </label>
                    <label className="au-field">
                      <span className="au-label">Phone number</span>
                      <input className="au-input" type="tel" name="phone" autoComplete="tel" placeholder="+91 90000 00000" pattern="[0-9+\s\-]{7,}" required />
                    </label>
                  </>
                ) : (
                  <label className="au-field">
                    <span className="au-label">Email or phone number</span>
                    <input className="au-input" type="text" name="identifier" autoComplete="username" placeholder="you@example.com or +91 90000 00000" required />
                  </label>
                )}

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

                {notice && <p className="au-notice">{notice}</p>}

                <button type="submit" className="au-submit">{isSignup ? 'Create account' : 'Sign in'}</button>

                <div className="au-or"><span>or continue with</span></div>
                <div className="au-oauth">
                  <button type="button" className="au-oauth-btn" onClick={() => onSocial('Google')}>Google</button>
                  <button type="button" className="au-oauth-btn" onClick={() => onSocial('Apple')}>Apple</button>
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
            </>
          )}
        </div>
      </main>
    </div>
  )
}
