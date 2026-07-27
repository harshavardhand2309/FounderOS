import GlobeNav from './GlobeNav.jsx'
import SectionNav from '../SectionNav.jsx'

// The section navigator. The Lens Globe is the finalized desktop design — the
// old Nav Lab switcher and its alternate variants (halo fan, classic rail) are
// retired. Below 900px the globe hides itself and SectionNav's floating button
// + sheet takes over, so both components stay mounted and the CSS decides which
// one is on screen.
export default function SiteNav() {
  return (
    <>
      <GlobeNav />
      <SectionNav />
    </>
  )
}
