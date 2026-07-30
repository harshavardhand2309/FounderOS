import { useEffect } from 'react'

// Release the reserved scrollbar gutter for the lifetime of a full-bleed page.
//
// loader.css sets `html { scrollbar-gutter: stable }` so the page width does not
// reflow when the boot loader unlocks scroll and the classic scrollbar returns.
// `stable` reserves that strip whether or not a scrollbar exists, and it is
// reserved inside the initial containing block — so on a page that does not
// scroll, every full-screen layer measures 11px narrower than the window and
// nothing paints in the gap.
//
// The Tennis and Pickleball pages are exactly that case: one 100vh hero, no
// scroll, so no scrollbar ever arrives to fill the strip. Sampled at 1200px
// wide, the rightmost 11 columns were flat rgb(10,11,13) page background down
// the whole height while the hero video and its gradients stopped short — full
// height, 11px short of full width.
//
// Neither page mounts the loader (it is Home-only), so there is no reflow to
// protect against here and the gutter is pure cost. Restored on unmount, so
// Home keeps it.
export default function useFullBleed() {
  useEffect(() => {
    const root = document.documentElement
    const prev = root.style.scrollbarGutter
    root.style.scrollbarGutter = 'auto'
    return () => { root.style.scrollbarGutter = prev }
  }, [])
}
