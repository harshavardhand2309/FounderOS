import { Link } from 'react-router-dom'
import { css } from '../utils/css.js'

// Tennis marketing view — a single hero screen (lower sections removed).
// Teal accent via var(--ta) / rgba(var(--tc), x) set on the page root.

export default function TennisView({ navRef, videoRef, openDashboard }) {
  // Both the logo and the Home button return to the Pick Your Game section via this one
  // handler, so they can never diverge. Router <Link>/#sports preserves Back/Forward.
  const goHome = () => { try { sessionStorage.setItem('lvlup:goto', 'sports') } catch { /* ignore */ } }
  return (
    <div>
      {/* fixed, full-frame Tennis background video — continuous backdrop */}
      <div className="lh-bg">
        <video className="lh-bg-fill" autoPlay muted loop playsInline preload="auto" poster="/assets/tennis-bg-poster.jpg" aria-hidden="true">
          <source src="/assets/tennis-bg-fill.mp4" type="video/mp4" />
        </video>
        <video ref={videoRef} className="lh-video" autoPlay muted loop playsInline preload="auto" poster="/assets/tennis-bg-poster.jpg" aria-hidden="true">
          <source src="/assets/tennis-bg.mp4" type="video/mp4" />
        </video>
      </div>

      {/* NAV */}
      <nav ref={navRef} style={css('position:fixed;top:0;left:0;right:0;z-index:70;display:flex;align-items:center;justify-content:space-between;padding:20px 48px;background:linear-gradient(180deg,rgba(8,9,11,.55) 0%,rgba(8,9,11,.32) 38%,rgba(8,9,11,.1) 70%,transparent 100%);border:none;transition:background .25s,padding .25s,backdrop-filter .25s')}>
        <Link to="/#sports" aria-label="Lvl-Up home — return to Pick Your Game" onClick={goHome} style={css('display:flex;align-items:center;gap:11px;cursor:pointer')}>
          <span style={css("width:30px;height:30px;border-radius:8px;background:var(--ta);display:flex;align-items:center;justify-content:center;color:#06201d;font:800 17px/1 'Sora'")}>L</span>
          <span style={css("font:700 20px/1 'Sora';letter-spacing:-.01em")}>Lvl-Up</span>
        </Link>
        <Link to="/#sports" className="sp-home" aria-label="Return to Pick Your Game" onClick={goHome}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5M5.5 10v9h4v-5h5v5h4v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Home
        </Link>
      </nav>

      {/* HERO */}
      <header style={css('position:relative;min-height:100vh;display:flex;align-items:flex-end;overflow:hidden')}>
        <div className="lh-heroscrim" />
        <div className="lh-vignette" />
        <div className="lh-cinebars" />
        <div className="lh-curtain" />

        {/* hero content bottom-left */}
        <div className="ag-pad lh-rise" style={{ ...css('position:relative;z-index:4;max-width:600px;padding:0 48px 72px'), animationDelay: '.95s' }}>
          <div style={css('display:inline-flex;align-items:center;gap:9px;padding:7px 14px;border-radius:999px;border:1px solid rgba(var(--tc),.4);background:rgba(var(--tc),.1);margin-bottom:26px')}>
            <span style={css('width:7px;height:7px;border-radius:50%;background:var(--ta);box-shadow:0 0 10px var(--ta)')} />
            <span style={css("font:500 12px/1 'JetBrains Mono',monospace;letter-spacing:.1em;color:var(--ta-bright)")}>AI-POWERED TENNIS ANALYTICS</span>
          </div>
          <h1 className="ag-h1" style={css("font:800 50px/1.06 'Sora';letter-spacing:-.025em;margin:0 0 16px;text-wrap:balance;text-shadow:0 2px 30px rgba(0,0,0,.6)")}>
            Elite <span style={css('color:var(--ta-bright);text-shadow:0 0 30px rgba(var(--tc),.6)')}>Tennis</span> Analytics
          </h1>
          <p style={css("font:400 17px/1.6 'Sora';color:#dfe5ea;max-width:460px;margin:0 0 30px;text-shadow:0 1px 14px rgba(0,0,0,.6)")}>
            Transform every match into actionable insights with AI-powered tennis analytics, serve intelligence, return analysis, rally performance, court coverage, and match intelligence.
          </p>
          <div style={css('display:flex;align-items:center;gap:16px;flex-wrap:wrap')}>
            <button onClick={openDashboard} className="h-lift" style={css("display:inline-flex;align-items:center;gap:10px;font:700 16px/1 'Sora';color:#06201d;background:var(--ta);border:none;padding:18px 30px;border-radius:13px;cursor:pointer;transition:transform .15s;box-shadow:0 14px 34px rgba(var(--tc),.4)")}>View Analytics →</button>
            <button className="h-glass" style={css("display:inline-flex;align-items:center;gap:14px;font:600 15px/1 'Sora';color:#eef1f3;padding:11px 22px 11px 12px;border-radius:13px;background:rgba(255,255,255,.07);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.16);cursor:pointer;transition:background .15s")}>
              <span style={css('width:38px;height:38px;border-radius:50%;background:var(--ta);display:flex;align-items:center;justify-content:center;animation:glowPulse 2.4s infinite')}>
                <span style={css('width:0;height:0;border-style:solid;border-width:7px 0 7px 11px;border-color:transparent transparent transparent #06201d;margin-left:3px')} />
              </span>
              Watch Trailer
            </button>
          </div>
        </div>
        <div className="lh-rise" style={{ ...css('position:absolute;left:50%;bottom:28px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:9px;z-index:4'), animationDelay: '1.45s' }}>
          <span style={css("font:500 10px/1 'JetBrains Mono',monospace;letter-spacing:.22em;color:rgba(255,255,255,.42)")}>SCROLL</span>
          <span style={css('width:1px;height:34px;background:linear-gradient(var(--ta),transparent)')} />
        </div>
      </header>
    </div>
  )
}
