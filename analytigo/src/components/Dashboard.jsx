import { css } from '../utils/css.js'

// The dashboard "peek" — a self-contained app view the marketing screen swaps to.
// `onBack` returns to the landing screen. Counters animate via the parent's
// useCountUp (this subtree mounts inside the shared root ref).

const SIDE_ITEMS = ['Matches', 'Shot Analysis', 'Heat Maps', 'Benchmarks', 'AI Coach']

const DASH_KPI = [
  { label: 'WIN RATE', count: '68', suffix: '%', display: '68%', color: '#e8232e', delta: '▲ 4.2%', deltaColor: '#46d18a' },
  { label: 'SERVE ACCURACY', count: '82', suffix: '%', display: '82%', color: '', delta: '▲ 2.1%', deltaColor: '#46d18a' },
  { label: 'RALLY SUCCESS', count: '74', suffix: '%', display: '74%', color: '', delta: '▲ 1.4%', deltaColor: '#46d18a' },
  { label: 'MATCH EFFICIENCY', count: '76', suffix: '%', display: '76%', color: '', delta: '▼ 1.1%', deltaColor: '#e0573a' },
]

const SKILL_LABELS = ['SERVE', '· RETURN', '· NET', '· BASELINE', '· SPEED', '· STAMINA']

const MATCHES = [
  { opp: 'M. Chen', score: '6-3 6-4', win: '71%', serve: '84%', result: 'WIN', color: '#46d18a' },
  { opp: 'S. Patel', score: '7-5 6-2', win: '66%', serve: '80%', result: 'WIN', color: '#46d18a' },
  { opp: 'L. Romano', score: '4-6 6-7', win: '48%', serve: '73%', result: 'LOSS', color: '#e0573a' },
  { opp: 'K. Novak', score: '6-2 6-1', win: '78%', serve: '88%', result: 'WIN', color: '#46d18a' },
]

const ROW_COLS = 'display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr .8fr;gap:12px'

export default function Dashboard({ onBack }) {
  return (
    <div className="ag-dash" style={css('display:grid;grid-template-columns:230px 1fr;min-height:100vh;background:#0a0b0d')}>
      {/* sidebar */}
      <aside style={css('border-right:1px solid rgba(255,255,255,.07);padding:24px 18px;display:flex;flex-direction:column;gap:6px;background:#0c0e10')}>
        <div style={css('display:flex;align-items:center;gap:10px;padding:6px 8px 22px')}>
          <span style={css("width:28px;height:28px;border-radius:7px;background:#e8232e;display:flex;align-items:center;justify-content:center;color:#fff;font:800 15px/1 'Sora'")}>L</span>
          <span style={css("font:700 17px/1 'Sora'")}>Lvl-Up</span>
        </div>
        <div style={css("display:flex;align-items:center;gap:11px;padding:11px 12px;border-radius:10px;background:rgba(232,35,46,.12);color:#e8232e;font:600 14px/1 'Sora'")}>
          <span style={css('width:7px;height:7px;border-radius:2px;background:#e8232e')} />Overview
        </div>
        {SIDE_ITEMS.map((item) => (
          <div key={item} className="h-side" style={css("display:flex;align-items:center;gap:11px;padding:11px 12px;border-radius:10px;color:#9aa3ad;font:500 14px/1 'Sora';cursor:pointer")}>
            <span style={css('width:7px;height:7px;border-radius:2px;background:#3a4049')} />{item}
          </div>
        ))}
        <div style={css('margin-top:auto;padding:14px;border-radius:13px;background:#141820;border:1px solid rgba(255,255,255,.07)')}>
          <div style={css("font:600 13px/1.3 'Sora';margin-bottom:6px")}>Upgrade to Pro</div>
          <div style={css("font:400 12px/1.4 'Sora';color:#9aa3ad;margin-bottom:12px")}>Unlock AI coaching &amp; unlimited reports.</div>
          <button style={css("width:100%;font:600 13px/1 'Sora';color:#fff;background:#e8232e;border:none;padding:10px;border-radius:9px;cursor:pointer")}>Upgrade</button>
        </div>
      </aside>

      {/* main */}
      <main style={css('display:flex;flex-direction:column;min-width:0')}>
        <div style={css('display:flex;align-items:center;justify-content:space-between;padding:20px 32px;border-bottom:1px solid rgba(255,255,255,.07)')}>
          <div>
            <div style={css("font:700 22px/1 'Sora'")}>Performance Overview</div>
            <div style={css("font:500 12px/1 'JetBrains Mono',monospace;color:#9aa3ad;margin-top:8px")}>JORDAN AVERY · SINGLES · LAST 30 DAYS</div>
          </div>
          <div style={css('display:flex;align-items:center;gap:14px')}>
            <span style={css("font:500 12px/1 'JetBrains Mono',monospace;color:#9aa3ad;padding:9px 14px;border-radius:9px;border:1px solid rgba(255,255,255,.1)")}>30D ▾</span>
            <button onClick={onBack} className="h-glass" style={css("font:600 13px/1 'Sora';color:#eef1f3;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);padding:10px 18px;border-radius:10px;cursor:pointer")}>← Back to site</button>
          </div>
        </div>

        <div style={css('padding:28px 32px;display:flex;flex-direction:column;gap:18px')}>
          {/* KPI row */}
          <div className="ag-kpi-grid" style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:16px')}>
            {DASH_KPI.map((k) => (
              <div key={k.label} style={css('padding:20px;border-radius:15px;background:#141820;border:1px solid rgba(255,255,255,.07)')}>
                <div style={css("font:500 11px/1 'JetBrains Mono',monospace;color:#9aa3ad;margin-bottom:14px")}>{k.label}</div>
                <div data-count={k.count} data-suffix={k.suffix} style={css(`font:700 32px/1 'Sora'${k.color ? ';color:' + k.color : ''}`)}>{k.display}</div>
                <div style={css(`font:500 11px/1 'JetBrains Mono',monospace;color:${k.deltaColor};margin-top:9px`)}>{k.delta}</div>
              </div>
            ))}
          </div>

          <div className="ag-split" style={css('display:grid;grid-template-columns:1.7fr 1fr;gap:18px')}>
            {/* match progression */}
            <div style={css('padding:24px;border-radius:16px;background:#141820;border:1px solid rgba(255,255,255,.07)')}>
              <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:20px')}>
                <span style={css("font:600 15px/1 'Sora'")}>Match Progression</span>
                <span style={css("font:500 11px/1 'JetBrains Mono',monospace;color:#9aa3ad")}>PERFORMANCE INDEX</span>
              </div>
              <svg viewBox="0 0 620 180" width="100%" height="180" preserveAspectRatio="none">
                <line x1="0" y1="45" x2="620" y2="45" stroke="rgba(255,255,255,.05)" />
                <line x1="0" y1="90" x2="620" y2="90" stroke="rgba(255,255,255,.05)" />
                <line x1="0" y1="135" x2="620" y2="135" stroke="rgba(255,255,255,.05)" />
                <polyline points="0,180 0,140 62,150 124,120 186,128 248,96 310,104 372,72 434,80 496,50 558,58 620,34 620,180" fill="url(#gradD)" stroke="none" />
                <polyline points="0,140 62,150 124,120 186,128 248,96 310,104 372,72 434,80 496,50 558,58 620,34" fill="none" stroke="#e8232e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" pathLength="1" style={css('stroke-dasharray:1;stroke-dashoffset:1;animation:drawLine 1.8s ease-out forwards')} />
                <defs>
                  <linearGradient id="gradD" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#e8232e" stopOpacity=".28" />
                    <stop offset="1" stopColor="#e8232e" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            {/* radar / skill */}
            <div style={css('padding:24px;border-radius:16px;background:#141820;border:1px solid rgba(255,255,255,.07)')}>
              <div style={css("font:600 15px/1 'Sora';margin-bottom:18px")}>Skill Profile</div>
              <div style={css('display:flex;justify-content:center;align-items:center;padding:6px')}>
                <svg viewBox="0 0 200 200" width="100%" height="180" style={css('max-width:200px')}>
                  <polygon points="100,20 168,60 168,140 100,180 32,140 32,60" fill="none" stroke="rgba(255,255,255,.08)" />
                  <polygon points="100,50 142,72 142,128 100,150 58,128 58,72" fill="none" stroke="rgba(255,255,255,.08)" />
                  <polygon points="100,84 113,90 113,116 100,124 87,116 87,90" fill="none" stroke="rgba(255,255,255,.06)" />
                  <polygon points="100,32 158,66 150,134 100,168 44,128 50,70" fill="rgba(232,35,46,.18)" stroke="#e8232e" strokeWidth="2" strokeLinejoin="round" />
                  <circle cx="100" cy="32" r="3" fill="#e8232e" />
                  <circle cx="158" cy="66" r="3" fill="#e8232e" />
                  <circle cx="150" cy="134" r="3" fill="#e8232e" />
                  <circle cx="100" cy="168" r="3" fill="#e8232e" />
                  <circle cx="44" cy="128" r="3" fill="#e8232e" />
                  <circle cx="50" cy="70" r="3" fill="#e8232e" />
                </svg>
              </div>
              <div style={css('display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;justify-content:center')}>
                {SKILL_LABELS.map((s) => (
                  <span key={s} style={css("font:500 10px/1 'JetBrains Mono',monospace;color:#9aa3ad")}>{s}</span>
                ))}
              </div>
            </div>
          </div>

          {/* recent matches table */}
          <div style={css('padding:24px;border-radius:16px;background:#141820;border:1px solid rgba(255,255,255,.07)')}>
            <div style={css("font:600 15px/1 'Sora';margin-bottom:18px")}>Recent Matches</div>
            <div style={css(`${ROW_COLS};padding:0 4px 14px;border-bottom:1px solid rgba(255,255,255,.07);font:500 11px/1 'JetBrains Mono',monospace;color:#6b7480;letter-spacing:.06em`)}>
              <span>OPPONENT</span><span>SCORE</span><span>WIN %</span><span>SERVE</span><span>RESULT</span>
            </div>
            {MATCHES.map((m, i) => (
              <div key={m.opp} style={css(`${ROW_COLS};padding:15px 4px;${i < MATCHES.length - 1 ? 'border-bottom:1px solid rgba(255,255,255,.05);' : ''}align-items:center;font:500 14px/1 'Sora'`)}>
                <span>{m.opp}</span>
                <span style={css('color:#9aa3ad')}>{m.score}</span>
                <span>{m.win}</span>
                <span>{m.serve}</span>
                <span style={css(`font:600 11px/1 'JetBrains Mono',monospace;color:${m.color}`)}>{m.result}</span>
              </div>
            ))}
          </div>

          {/* AI recommendation */}
          <div style={css('padding:22px 24px;border-radius:16px;background:linear-gradient(120deg,rgba(232,35,46,.1),rgba(232,35,46,.02));border:1px solid rgba(232,35,46,.25);display:flex;gap:18px;align-items:flex-start')}>
            <span style={css('width:40px;height:40px;border-radius:11px;background:#e8232e;flex-shrink:0;display:flex;align-items:center;justify-content:center')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 4l1.8 4.4 4.7.4-3.6 3 1.1 4.6L12 14.6 7.9 16.4 9 11.8 5.5 8.8l4.7-.4z" fill="#fff" />
              </svg>
            </span>
            <div>
              <div style={css("font:600 15px/1.3 'Sora';margin-bottom:7px")}>AI Coaching Insight</div>
              <div style={css("font:400 14px/1.6 'Sora';color:#b3bcc5")}>Your second-serve win rate drops 14% under pressure. Adding 8% more topspin and targeting the backhand corner could raise rally success by an estimated 6 points.</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
