import { TruCycleGlyph } from '@/components/icons/TruCycleGlyph'
import { useEffect } from 'react'
import { setInitializing, useGlobalLoading } from '@/lib/loadingStore'

export function AppBootReady() {
  useEffect(() => {
    // Defer a tick to let first paint settle before removing initial state
    const id = requestAnimationFrame(() => setInitializing(false))
    return () => cancelAnimationFrame(id)
  }, [])
  return null
}

export default function GlobalLoading() {
  const { activeRequests, initializing } = useGlobalLoading()

  return (
    <>
      {/* Top progress bar for in-app network activity */}
      <div
        className={
          'fixed left-0 right-0 top-0 z-[9999] h-0.5 transition-opacity duration-300 ' +
          (activeRequests > 0 ? 'opacity-100' : 'opacity-0')
        }
      >
        <div className="h-full w-full bg-gradient-to-r from-primary/20 via-emerald-300/50 to-primary/20 animate-pulse" />
      </div>

      {/* Full-screen initial splash while the app bootstraps */}
      {initializing && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-background/95 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full border-4 border-primary/15" />
              <div className="h-20 w-20 rounded-full border-4 border-primary/70 border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <TruCycleGlyph className="h-7 w-7 text-primary" />
              </div>
            </div>
            <div className="text-sm text-muted-foreground">Loading TruCycle…</div>
          </div>
        </div>
      )}
    </>
  )
}
