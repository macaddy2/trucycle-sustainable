import { useCallback, useEffect, useMemo, useState } from 'react'
import { PartnerApp, PartnerLoginPage, PartnerRegisterPage } from '@/components/partner'
import { Toaster } from '@/components/ui/sonner'
import { useKV } from '@/hooks/useKV'
import type { MinimalUser } from '@/lib/api'
import { tokens } from '@/lib/api'

type PartnerRoute = 'home' | 'items' | 'shops' | 'profile' | 'login' | 'register'

interface PartnerRouterProps {
  basePath: string
  initialPath: string
}

const MAIN_ROUTES = new Set<PartnerRoute>(['home', 'items', 'shops', 'profile'])
const AUTH_ROUTES = new Set<PartnerRoute>(['login', 'register'])

export function PartnerRouter({ basePath, initialPath }: PartnerRouterProps) {
  const [partner] = useKV<MinimalUser | null>('partner-user', null)
  const [hasAuthToken, setHasAuthToken] = useState<boolean>(false)
  const baseNormalized = useMemo(() => (basePath || '/').replace(/\/$/, ''), [basePath])

  const parseRoute = useCallback((pathname: string): PartnerRoute => {
    let path = pathname
    if (baseNormalized && path.startsWith(baseNormalized)) {
      path = path.slice(baseNormalized.length)
    }
    path = path.replace(/^\/+|\/+$/g, '')
    if (!path) return 'home'
    const segments = path.split('/')
    if (segments[0]?.toLowerCase() !== 'partner') return 'home'
    const route = (segments[1] || 'home').toLowerCase()
    if (MAIN_ROUTES.has(route as PartnerRoute)) return route as PartnerRoute
    if (AUTH_ROUTES.has(route as PartnerRoute)) return route as PartnerRoute
    return 'home'
  }, [baseNormalized])

  const [route, setRoute] = useState<PartnerRoute>(() => parseRoute(initialPath))

  const navigate = useCallback((next: PartnerRoute, replace = false) => {
    setRoute(next)
    const segment = next || 'home'
    const pathSegment = `partner/${segment}`
    const rawPath = `${baseNormalized}/${pathSegment}`
    let targetPath = rawPath.replace(/\/+/g, '/').replace(/\/+$/, '')
    if (!targetPath.startsWith('/')) {
      targetPath = `/${targetPath}`
    }
    const method = replace ? 'replaceState' : 'pushState'
    const withQuery = `${targetPath}${window.location.search}${window.location.hash}`
    window.history[method]({ partnerRoute: next }, '', withQuery)
  }, [baseNormalized])

  useEffect(() => {
    let mounted = true
    tokens.get().then(t => {
      if (!mounted) return
      setHasAuthToken(Boolean(t?.accessToken))
    }).catch(() => {
      if (!mounted) return
      setHasAuthToken(false)
    })

    // React to token changes across app/tabs to keep auth state fresh
    const handleTokenChange = () => {
      tokens.get().then(t => {
        if (!mounted) return
        setHasAuthToken(Boolean(t?.accessToken))
      }).catch(() => {
        if (!mounted) return
        setHasAuthToken(false)
      })
    }
    window.addEventListener('storage', handleTokenChange)
    window.addEventListener('kv-change' as any, handleTokenChange as any)

    const handlePop = () => {
      setRoute(parseRoute(window.location.pathname))
    }
    window.addEventListener('popstate', handlePop)
    return () => {
      window.removeEventListener('popstate', handlePop)
      window.removeEventListener('storage', handleTokenChange)
      window.removeEventListener('kv-change' as any, handleTokenChange as any)
      mounted = false
    }
  }, [parseRoute])

  useEffect(() => {
    // Only force to login when not authenticated at all.
    if (!partner && !AUTH_ROUTES.has(route) && !hasAuthToken) {
      navigate('login', true)
    }
  }, [partner, route, navigate, hasAuthToken])

  useEffect(() => {
    if (partner && AUTH_ROUTES.has(route)) {
      navigate('home', true)
    }
  }, [partner, route, navigate])

  if (route === 'login') {
    return (
      <>
        <PartnerLoginPage onNavigate={navigate} />
        <Toaster position="top-right" richColors closeButton />
      </>
    )
  }

  if (route === 'register') {
    return (
      <>
        <PartnerRegisterPage onNavigate={navigate} />
        <Toaster position="top-right" richColors closeButton />
      </>
    )
  }

  return (
    <>
      <PartnerApp route={route as 'home' | 'items' | 'shops' | 'profile'} onNavigate={navigate} />
      <Toaster position="top-right" richColors closeButton />
    </>
  )
}
