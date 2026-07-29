import { lazy, Suspense, createElement } from 'react'
import type { ComponentType } from 'react'

type Loader<P> = () => Promise<{ default: ComponentType<P> }>
type Options = { ssr?: boolean; loading?: ComponentType }

/**
 * Stand-in for `next/dynamic`, so the ported dashboard files keep their
 * original import shape. `React.lazy` needs a Suspense ancestor while
 * next/dynamic did not, so the boundary is baked in here.
 *
 * `ssr: false` is accepted and ignored — this is a client-only SPA, which is
 * exactly what that flag was asking for.
 */
export default function dynamic<P extends object>(loader: Loader<P>, options: Options = {}) {
  const Lazy = lazy(loader)
  const Fallback = options.loading
  return function Dynamic(props: P) {
    return createElement(
      Suspense,
      { fallback: Fallback ? createElement(Fallback) : null },
      createElement(Lazy, props),
    )
  }
}
