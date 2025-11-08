import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { House, Package, Storefront as StorefrontIcon, UserCircle, WarningCircle, QrCode } from '@phosphor-icons/react'
import { useKV } from '@/hooks/useKV'
import { clearTokens, listMyShops, listPartnerItems, type MinimalUser, type PartnerShopItem, type ShopDto } from '@/lib/api'
import { kvDelete } from '@/lib/kvStore'
import { toast } from 'sonner'
import { PartnerHome } from './PartnerHome'
import { PartnerItems } from './PartnerItems'
import { PartnerShops } from './PartnerShops'
import { PartnerProfile } from './PartnerProfile'
import { PartnerScanModal } from './PartnerScanModal'

interface PartnerAppProps {
  route: 'home' | 'items' | 'shops' | 'profile'
  onNavigate: (route: string, replace?: boolean) => void
}

interface NavItem {
  key: 'home' | 'items' | 'shops' | 'profile'
  label: string
  icon: typeof House
}

export function PartnerApp({ route, onNavigate }: PartnerAppProps) {
  const [partner, setPartner] = useKV<MinimalUser | null>('partner-user', null)
  const [shops, setShops] = useState<ShopDto[]>([])
  const [items, setItems] = useState<PartnerShopItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanOpen, setScanOpen] = useState(false)

  const navItems: NavItem[] = useMemo(() => [
    { key: 'home', label: 'Overview', icon: House },
    { key: 'items', label: 'Items', icon: Package },
    { key: 'shops', label: 'Shops', icon: StorefrontIcon },
    { key: 'profile', label: 'Profile', icon: UserCircle },
  ], [])

  const fetchData = useCallback(async (showToast = false) => {
    if (!partner) return
    setLoading(true)
    setError(null)
    try {
      const [shopsResponse, itemsResponse] = await Promise.all([
        listMyShops(),
        listPartnerItems({ limit: 50, page: 1 }),
      ])
      setShops(Array.isArray(shopsResponse?.data) ? shopsResponse.data : [])
      setItems(itemsResponse?.data?.items ?? [])
      if (showToast) {
        toast.success('Partner data refreshed')
      }
    } catch (err: any) {
      console.error('Failed to load partner data', err)
      setError(err?.message || 'Unable to load partner data right now.')
    } finally {
      setLoading(false)
    }
  }, [partner])

  useEffect(() => {
    if (!partner) return
    fetchData()
  }, [partner, fetchData])

  const handleRefresh = useCallback(() => {
    fetchData(true)
  }, [fetchData])

  const handleSignOut = useCallback(async () => {
    try { await clearTokens() } catch {}
    try { await kvDelete('current-user') } catch {}
    setPartner(null)
    toast.success('Signed out')
    const base = (import.meta as any).env?.BASE_URL || '/'
    const baseNormalized = String(base || '/').replace(/\/$/, '')
    const target = `${baseNormalized}/home`.replace(/\/+/g, '/').replace(/\/$/, '')
    window.location.href = target
  }, [setPartner])

  const activeNav = navItems.find(item => item.key === route) ?? navItems[0]

  let content = null
  if (!partner) {
    content = (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Loading partner session...
      </div>
    )
  } else {
    if (route === 'home') {
      content = (
        <PartnerHome
          partner={partner}
          shops={shops}
          items={items}
          loading={loading}
          onRefresh={handleRefresh}
          onOpenScan={() => setScanOpen(true)}
        />
      )
    } else if (route === 'items') {
      content = (
        <PartnerItems
          items={items}
          loading={loading}
          onRefresh={handleRefresh}
          onOpenScan={() => setScanOpen(true)}
        />
      )
    } else if (route === 'shops') {
      content = (
        <PartnerShops
          shops={shops}
          loading={loading}
          onRefresh={handleRefresh}
        />
      )
    } else if (route === 'profile') {
      content = (
        <PartnerProfile
          partner={partner}
          shops={shops}
          items={items}
          onSignOut={handleSignOut}
        />
      )
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <QrCode size={20} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">TruCycle</p>
              <h1 className="text-lg font-semibold text-foreground">Partner Console</h1>
            </div>
            {partner?.firstName && (
              <Badge variant="outline" className="ml-2">{partner.firstName}</Badge>
            )}
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map(item => (
              <Button
                key={item.key}
                variant={item.key === activeNav.key ? 'secondary' : 'ghost'}
                className="gap-2"
                onClick={() => onNavigate(item.key)}
              >
                <item.icon size={18} />
                {item.label}
              </Button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <WarningCircle size={18} />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {content}
      </main>

      <PartnerScanModal open={scanOpen} onOpenChange={setScanOpen} shops={shops} />
    </div>
  )
}
