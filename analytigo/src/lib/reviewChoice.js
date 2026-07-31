// Review-time switching for design variants.
//
// Same idea that worked for the ten nav rails: build the options into the real
// page so they can be judged in context rather than in a mockup, remember the
// pick per device, and allow a URL override so a specific one can be shared.
// Once a variant is chosen, its block stays and the rest — plus this file and
// the picker — are deleted.
//
//   ?cursor=reticle   ?team=roster      pick one, and it sticks
//
// Changes broadcast on an event so the page re-skins without a reload.

const EVENT = 'lvlup:choice'
const store = (key) => `lvlup:${key}`

export function readChoice(key, fallback) {
  try {
    const q = new URLSearchParams(window.location.search).get(key)
    if (q) { localStorage.setItem(store(key), q); return q }
    return localStorage.getItem(store(key)) || fallback
  } catch {
    return fallback
  }
}

export function writeChoice(key, value) {
  try { localStorage.setItem(store(key), value) } catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { key, value } }))
}

export function onChoice(key, fn) {
  const h = (e) => { if (e.detail?.key === key) fn(e.detail.value) }
  window.addEventListener(EVENT, h)
  return () => window.removeEventListener(EVENT, h)
}
