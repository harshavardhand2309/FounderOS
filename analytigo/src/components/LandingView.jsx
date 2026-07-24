import { Link } from 'react-router-dom'
import { css } from '../utils/css.js'

// Pickleball marketing view — a single hero screen (lower sections removed).

export default function LandingView({ navRef, videoRef, openDashboard }) {
  // Both the logo and the Home button return to the Pick Your Game section via this one
  // handler, so they can never diverge. Router <Link>/#sports preserves Back/Forward.
  const goHome = () => { try { sessionStorage.setItem('lvlup:goto', 'sports') } catch { /* ignore */ } }
  return (
    <div>
      {/* fixed, full-frame background video — one continuous backdrop */}
      <div className="lh-bg">
        <video className="lh-bg-fill" autoPlay muted loop playsInline preload="auto" poster="/assets/landing-bg-poster.jpg" aria-hidden="true">
          <source src="/assets/landing-bg-fill.mp4" type="video/mp4" />
        </video>
        <video ref={videoRef} className="lh-video" autoPlay muted loop playsInline preload="auto" poster="/assets/landing-bg-poster.jpg" aria-hidden="true">
          <source src="/assets/landing-bg.mp4" type="video/mp4" />
        </video>
      </div>
      {/* NAV — Home only, no brand block */}
      <nav ref={navRef} style={css('position:fixed;top:0;left:0;right:0;z-index:70;display:flex;align-items:center;justify-content:flex-end;padding:20px 48px;background:linear-gradient(180deg,rgba(8,9,11,.55) 0%,rgba(8,9,11,.32) 38%,rgba(8,9,11,.1) 70%,transparent 100%);border:none;transition:background .25s,padding .25s,backdrop-filter .25s')}>
        <Link to="/#sports" className="sp-home" aria-label="Return to Pick Your Game" onClick={goHome}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5M5.5 10v9h4v-5h5v5h4v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Home
        </Link>
      </nav>

      {/* HERO A — full-bleed video, content bottom-left */}
      <header style={css('position:relative;min-height:100vh;display:flex;align-items:flex-end;overflow:hidden')}>
        {/* video moved to the fixed full-page backdrop (.lh-bg) above */}
        {/* legibility scrims */}
        <div style={css('position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,9,11,.82) 0%,rgba(8,9,11,.42) 38%,rgba(8,9,11,.05) 68%,transparent 100%)')} />
        <div style={css('position:absolute;inset:0;background:linear-gradient(0deg,rgba(8,9,11,.96) 0%,rgba(8,9,11,.28) 40%,transparent 62%)')} />
        <div style={css('position:absolute;inset:0;background:radial-gradient(120% 120% at 48% 42%,transparent 55%,rgba(0,0,0,.42) 100%)')} />
        {/* cinematic framing + fade-from-black open */}
        <div className="lh-vignette" />
        <div className="lh-cinebars" />
        <div className="lh-curtain" />

        {/* hero content bottom-left */}
        <div className="ag-pad lh-rise" style={{ ...css('position:relative;z-index:4;max-width:600px;padding:0 48px 72px'), animationDelay: '.95s' }}>
          <h1 className="ag-h1" style={css("font:800 50px/1.06 'Sora';letter-spacing:-.025em;margin:0 0 16px;text-wrap:balance")}>
            Unlock <span style={css('color:#e8232e')}>Elite</span> Pickleball Analytics
          </h1>
          <p style={css("font:400 17px/1.6 'Sora';color:#cfd5db;max-width:440px;margin:0 0 30px")}>
            Transform every match into actionable insights with AI-powered pickleball analytics, paddle performance, shot placement, kitchen play analysis, rally analytics, and court positioning.
          </p>
          <div style={css('display:flex;align-items:center;gap:16px;flex-wrap:wrap')}>
            <button onClick={openDashboard} className="h-lift" style={css("display:inline-flex;align-items:center;gap:10px;font:700 16px/1 'Sora';color:#fff;background:#e8232e;border:none;padding:18px 30px;border-radius:13px;cursor:pointer;transition:transform .15s")}>View Analytics →</button>
            <button className="h-glass" style={css("display:inline-flex;align-items:center;gap:14px;font:600 15px/1 'Sora';color:#eef1f3;padding:11px 22px 11px 12px;border-radius:13px;background:rgba(255,255,255,.07);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.16);cursor:pointer;transition:background .15s")}>
              <span style={css('width:38px;height:38px;border-radius:50%;background:#e8232e;display:flex;align-items:center;justify-content:center;animation:glowPulse 2.4s infinite')}>
                <span style={css('width:0;height:0;border-style:solid;border-width:7px 0 7px 11px;border-color:transparent transparent transparent #fff;margin-left:3px')} />
              </span>
              Watch Trailer
            </button>
          </div>
        </div>
      </header>
    </div>
  )
}
