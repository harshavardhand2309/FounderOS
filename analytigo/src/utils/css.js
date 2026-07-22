// Tiny helper that turns a CSS declaration string into a React style object,
// so the design's inline styles can be carried over 1:1 (e.g. css("display:flex;gap:8px")).
// Mirrors the dc-runtime's cssToObj. Results are cached per string, so an identical
// style string always returns the same object reference (cheap, render-stable).
const cache = new Map()

const kebabToCamel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase())

export function css(str) {
  const hit = cache.get(str)
  if (hit) return hit
  const o = {}
  for (const decl of str.split(';')) {
    const i = decl.indexOf(':')
    if (i < 0) continue
    const prop = decl.slice(0, i).trim()
    if (!prop) continue
    const val = decl.slice(i + 1).trim()
    o[prop.startsWith('--') ? prop : kebabToCamel(prop)] = val
  }
  cache.set(str, o)
  return o
}
