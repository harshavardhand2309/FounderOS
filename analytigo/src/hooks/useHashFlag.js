import { useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

// Drives a full-screen overlay from the URL hash (e.g. "#trailer") so the
// browser's Back button and gesture close it, rather than leaving the page.
// Without a history entry, Back would exit the site entirely while the overlay
// was open — the single most common way a full-screen video traps someone.
//
// Deep links work too: arriving at /#trailer opens it, and closing then falls
// back to replacing the URL instead of navigating out of the site.
export default function useHashFlag(flag) {
  const location = useLocation()
  const navigate = useNavigate()
  const pushed = useRef(false)

  const open = location.hash === '#' + flag

  const show = useCallback(() => {
    pushed.current = true
    navigate({ hash: flag })
  }, [navigate, flag])

  const hide = useCallback(() => {
    if (pushed.current) {
      // we added the entry, so unwind it — keeps Back and Esc consistent
      pushed.current = false
      navigate(-1)
    } else {
      // arrived here directly; drop the hash without adding history
      navigate(location.pathname + location.search, { replace: true })
    }
  }, [navigate, location.pathname, location.search])

  return [open, show, hide]
}
