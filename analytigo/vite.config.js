import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// Deploy base. '/' locally, on Firebase Hosting and on Vercel; the GitHub Pages
// workflow builds with ANALYTIGO_BASE=/FounderOS/ so the site works from a subpath.
const base = process.env.ANALYTIGO_BASE || '/'

// The design's inline styles / JSX reference public files by absolute path
// ("/assets/foo.png", url(/assets/bar.mp4)…) which Vite's `base` does not
// rewrite. This rebases exactly those string literals — a quote or '(' before
// "/assets/" — so relative imports like '../assets/hover.jpg' are untouched.
const rebasePublicAssets = {
  name: 'rebase-public-assets',
  enforce: 'pre',
  transform(code, id) {
    if (base === '/' || id.includes('node_modules')) return null
    if (!/\.(jsx|js|css)(\?|$)/.test(id)) return null
    if (!code.includes('/assets/')) return null
    return { code: code.replace(/(["'`(])\/assets\//g, `$1${base}assets/`), map: null }
  },
}

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [rebasePublicAssets, tailwindcss(), react()],
  resolve: {
    // The analytics dashboard is ported from the Sportsanalytics repo, which
    // resolves its own modules through "@/…". Pointing the alias at src/dash
    // reproduces that layout exactly, so those files stay byte-for-byte close
    // to upstream and can be re-synced without rewriting every import.
    alias: {
      '@': fileURLToPath(new URL('./src/dash', import.meta.url)),
    },
  },
  // Pin the browser ESM build. The CJS entry does `require('fs')`, which Vite
  // would externalise with a warning.
  optimizeDeps: { include: ['xlsx'] },
  build: {
    // Deliberately NO manualChunks. Forcing three/@react-three into a vendor
    // chunk separates them from React, which they touch at module-evaluation
    // time — the chunks then load in the wrong order and the app dies on boot
    // with "Cannot read properties of undefined". Rollup's default chunking
    // follows the dynamic-import boundaries correctly, and the lazy() around
    // TennisAnalyticsApp already keeps the dashboard, recharts and xlsx out of
    // the initial payload.
    chunkSizeWarningLimit: 1200,
  },
})
