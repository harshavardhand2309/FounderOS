import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deploy base. '/' locally and on Vercel; the GitHub Pages workflow builds
// with ANALYTIGO_BASE=/FounderOS/ so the site works from a subpath.
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
  plugins: [rebasePublicAssets, react()],
})
