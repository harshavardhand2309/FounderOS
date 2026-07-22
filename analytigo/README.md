# AnalytiGo

A multi-sport analytics marketing site, implemented in **React + Vite** from a
[Claude Design](https://claude.ai/design) handoff bundle (`../analytigo/`).

It reproduces three connected screens:

| Route       | Screen                | Source design                    |
| ----------- | --------------------- | -------------------------------- |
| `/`         | Sport selector (home) | `AnalytiGo Home.dc.html`         |
| `/landing`  | Marketing landing     | `AnalytiGo Landing.dc.html`      |
| `/landing`* | Dashboard peek        | `AnalytiGo Landing.dc.html` (in-page screen) |

\* The dashboard is an in-page screen toggled from the landing page (the
"View Analytics", "Explore Visualizations", "View My Stats" buttons and the
"Analytics" nav link), exactly as in the prototype. "← Back to site" returns.

The two **LIVE** sport cards on the home page (Pickleball, Tennis) link to
`/landing`; Basketball and Volleyball are "coming soon" and inert.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

```bash
npm run build    # production build to dist/
npm run preview  # serve the production build locally
```

Requires Node.js 18+ (any current LTS).

## How the design was translated

These were the notable decisions turning the prototype into real code:

- **Inline styles, carried 1:1.** The prototype styles every element inline.
  Those strings are preserved verbatim and converted to React style objects by a
  tiny [`css()`](src/utils/css.js) helper, so the implementation stays visually
  faithful and easy to diff against the source.
- **Hover states.** The prototype's `style-hover="…"` attributes become `:hover`
  rules in [`index.css`](src/styles/index.css). Because the base styles are
  inline (which win the cascade), those rules use `!important` to take over, and
  animate through the `transition` declared inline on each element.
- **Counters & reveals.** The animated stat numbers (`data-count`) and
  scroll-reveal blocks (`data-reveal`) are driven by hooks
  ([`useCountUp`](src/hooks/useCountUp.js), [`useReveal`](src/hooks/useReveal.js))
  ported directly from the prototype's `initCounters`/`tween`/`initReveals`
  logic — the markup keeps the same `data-*` attributes.
- **Sticky nav.** The scroll-driven nav treatment is ported to
  [`useStickyNav`](src/hooks/useStickyNav.js).
- **Routing.** `react-router-dom` provides `/` and `/landing`. The Vite dev
  server and `vite preview` handle SPA fallback automatically; a plain static
  host would need a catch-all rewrite to `index.html`.
- **Responsiveness.** The prototype is desktop-first (max 1240px). A small set of
  `@media` rules collapses the multi-column grids and hides the floating hero
  stats on narrow viewports.

## Project layout

```
app/
├─ public/assets/        hero.mp4, hero.png, features.png (from the bundle)
├─ src/
│  ├─ pages/Home.jsx        sport selector
│  ├─ pages/Landing.jsx     screen state + shared scroll hooks
│  ├─ components/LandingView.jsx   nav, hero, features, metrics, CTA, footer
│  ├─ components/Dashboard.jsx     dashboard peek
│  ├─ hooks/                useCountUp, useReveal, useStickyNav
│  ├─ utils/css.js          CSS-string → style-object helper
│  └─ styles/index.css      reset, fonts, keyframes, hover + responsive rules
└─ index.html               Google Fonts (Sora, JetBrains Mono)
```
