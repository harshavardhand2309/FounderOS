import { useEffect, useState } from 'react'
import SectionNav from '../SectionNav.jsx'
import GlobeNav from './GlobeNav.jsx'
import FanNav from './FanNav.jsx'
import '../../styles/navlab.css'

// Nav Lab — lets us A/B the section-navigator designs live. The variant comes
// from ?nav=<id> in the URL, else the last choice saved in localStorage, else
// the lens globe. A small switcher pill (bottom-left) flips between designs
// at runtime; remove it once a design is finalized.
//
// The classic <SectionNav /> is always mounted: below 900px every variant
// hides itself and SectionNav's mobile FAB + sheet takes over. On desktop its
// rail is hidden via html[data-nav] (see navlab.css) unless "classic" is the
// chosen variant.

const VARIANTS = [
  { id: 'globe', name: 'Lens Globe' },
  { id: 'fan', name: 'Halo Fan' },
  { id: 'classic', name: 'Classic Rail' },
]
const STORE_KEY = 'ag-nav-variant'

const initialVariant = () => {
  const fromUrl = new URLSearchParams(window.location.search).get('nav')
  if (VARIANTS.some((v) => v.id === fromUrl)) return fromUrl
  const saved = localStorage.getItem(STORE_KEY)
  if (VARIANTS.some((v) => v.id === saved)) return saved
  return 'globe'
}

export default function NavLab() {
  const [variant, setVariant] = useState(initialVariant)
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORE_KEY, variant)
    document.documentElement.dataset.nav = variant
    return () => { delete document.documentElement.dataset.nav }
  }, [variant])

  return (
    <>
      {variant === 'globe' && <GlobeNav />}
      {variant === 'fan' && <FanNav />}
      <SectionNav />

      <div className={picking ? 'nl-switch open' : 'nl-switch'}>
        <button
          type="button"
          className="nl-toggle"
          aria-expanded={picking}
          onClick={() => setPicking((p) => !p)}
        >
          <span className="nl-toggle-dot" aria-hidden="true" />
          Nav: {VARIANTS.find((v) => v.id === variant)?.name}
        </button>
        <div className="nl-menu" role="menu" aria-hidden={!picking}>
          {VARIANTS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="menuitem"
              className={v.id === variant ? 'nl-opt active' : 'nl-opt'}
              tabIndex={picking ? 0 : -1}
              onClick={() => { setVariant(v.id); setPicking(false) }}
            >
              {v.name}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
