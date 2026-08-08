// REVIEW BUILD ONLY — delete once a hero video is chosen, along with the
// HEROES list and the picker in TennisView.
//
// Same shape as the pointer/team pickers used earlier: ?hero= wins, otherwise
// localStorage, otherwise the fallback. Nothing here reads the network.

const KEY = 'lvlup:hero'
const EVT = 'lvlup:hero-change'

export const HEROES = [
  {
    id: 'current',
    name: 'Current',
    src: '/assets/tennis-bg.mp4',
    fill: '/assets/tennis-bg-fill.mp4',
    poster: '/assets/tennis-bg-poster.jpg',
    w: 1920, h: 1070,
    note: '1920x1070 master, re-encoded at CRF 18. The only one at screen resolution.',
  },
  {
    id: 'animated',
    name: 'Animated',
    src: '/assets/Animated_Tennis_Card.mp4',
    fill: '/assets/Animated_Tennis_Card-fill.mp4',
    poster: '/assets/Animated_Tennis_Card-poster.jpg',
    w: 832, h: 464,
    note: '832x464 — same 1.79 aspect as the current hero, so it fills the same way, but 2.3x upscaled to a 1920 screen.',
  },
  {
    id: 'realistic',
    name: 'Realistic',
    src: '/assets/Realistic_Tennis_Card.mp4',
    fill: '/assets/Realistic_Tennis_Card-fill.mp4',
    poster: '/assets/Realistic_Tennis_Card-poster.jpg',
    w: 624, h: 624,
    note: '624x624 square. Filling a landscape screen edge-to-edge would crop 51% of the height — the head and feet — so it fits to height with the blurred fill carrying the sides.',
  },
]

export function readHero() {
  if (typeof window === 'undefined') return HEROES[0]
  let id = null
  try {
    const q = new URLSearchParams(window.location.search).get('hero')
    if (q) { id = q; localStorage.setItem(KEY, q) }
    else id = localStorage.getItem(KEY)
  } catch { /* private mode — fall through to the default */ }
  return HEROES.find((h) => h.id === id) || HEROES[0]
}

export function writeHero(id) {
  try { localStorage.setItem(KEY, id) } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(EVT, { detail: id }))
}

export function onHero(fn) {
  const h = () => fn(readHero())
  window.addEventListener(EVT, h)
  return () => window.removeEventListener(EVT, h)
}
