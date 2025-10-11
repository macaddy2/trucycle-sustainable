import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useKV } from '@/hooks/useKV'
import {
  QrCode,
  Clock,
  Storefront,
  ArrowsClockwise,
  HandHeart,
} from '@phosphor-icons/react'
import { listMyItems, type MyListedItem } from '@/lib/api'

interface QRCodeData {
  id: string
  type: 'donor' | 'collector'
  itemId: string
  itemTitle: string
  userId: string
  transactionId: string
  dropOffLocation?: string
  metadata: {
    category: string
    co2Impact: number
    createdAt: string
    expiresAt: string
    actionType?: string
  }
  status: 'active' | 'scanned' | 'expired' | 'completed'
}

interface UserProfile {
  id: string
  name: string
  userType: 'donor' | 'collector'
  postcode?: string
}

interface ShopScannerOverviewProps {
  onClose?: () => void
}

export function ShopScannerOverview({ onClose }: ShopScannerOverviewProps) {
  const [currentUser] = useKV<UserProfile | null>('current-user', null)
  const [userQRCodes] = useKV<QRCodeData[]>('user-qr-codes', [])
  const [serverItems, setServerItems] = useState<MyListedItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    async function fetchListed() {
      setLoading(true)
      setLoadError(null)
      try {
        const res = await listMyItems({ page: 1, limit: 50 })
        if (!isMounted) return
        setServerItems(res.data.items || [])
      } catch (err: any) {
        // Gracefully fall back to local data if API not configured or unauthorized
        const msg = typeof err?.message === 'string' ? err.message : 'Unable to load listed items'
        setLoadError(msg)
        setServerItems(null)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchListed()
    return () => { isMounted = false }
  }, [])

  // Map server listed items to the QR activity structure expected by the UI
  const serverCodes: QRCodeData[] = useMemo(() => {
    if (!currentUser || !serverItems) return []
    const now = Date.now()
    const addHours = (iso: string | undefined, hours: number) => {
      if (!iso) return new Date(now + hours * 3600_000).toISOString()
      const t = new Date(iso).getTime()
      return new Date(t + hours * 3600_000).toISOString()
    }
    const mapStatus = (s?: string): QRCodeData['status'] => {
      const v = String(s || '').toLowerCase()
      if (v.includes('complete') || v.includes('recycled')) return 'completed'
      if (v.includes('expired')) return 'expired'
      if (v.includes('claimed') || v.includes('awaiting_collection')) return 'scanned'
      return 'active'
    }
    return serverItems.map((item) => ({
      id: `qr-${item.id}`,
      type: 'donor',
      itemId: item.id,
      itemTitle: item.title,
      userId: currentUser.id,
      transactionId: item.id,
      dropOffLocation: item.location?.postcode,
      metadata: {
        category: String((item as any).category || (item.metadata as any)?.category || 'Item'),
        co2Impact: typeof item.estimated_co2_saved_kg === 'number' ? item.estimated_co2_saved_kg : 0,
        createdAt: item.created_at,
        expiresAt: addHours(item.created_at, 72),
        actionType: item.pickup_option,
      },
      status: mapStatus(item.status),
    }))
  }, [currentUser, serverItems])

  const codes = useMemo(() => {
    if (!currentUser) return [] as QRCodeData[]
    // Prefer server-sourced items mapped to codes when available
    if (serverCodes.length > 0) return serverCodes
    return userQRCodes.filter((code) => code.userId === currentUser.id)
  }, [currentUser, userQRCodes, serverCodes])

  const activeCodes = codes.filter((code) => code.status === 'active')
  const completedCodes = codes.filter((code) => code.status === 'completed')
  const expiredCodes = codes.filter((code) => code.status === 'expired')

  const totalImpact = codes.reduce((total, code) => total + (code.metadata?.co2Impact ?? 0), 0)

  const sortedRecent = [...codes]
    .sort((a, b) => new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime())
    .slice(0, 6)

  const roleLabel = currentUser?.userType === 'donor' ? 'donations and drop-offs' : 'collections and pickups'

  const handleBackToApp = () => {
    if (onClose) {
      onClose()
    } else {
      window.location.href = window.location.pathname
    }
  }

  const handleOpenAuth = (mode: 'signin' | 'signup') => {
    window.dispatchEvent(new CustomEvent('open-auth-dialog', { detail: { mode } }))
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
        <header className="space-y-3">
          <Badge variant="outline" className="uppercase tracking-widest text-xs">
            QR history overview
          </Badge>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Your TruCycle QR activity</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Track every QR code you&apos;ve generated, keep an eye on expiry times, and download details for your records.
                Partner shop features unlock when your account is upgraded, but you can still monitor {roleLabel} here.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {loading ? 'Loading your listed items…' : serverItems ? 'Showing data from your listed items.' : loadError ? 'Showing local QR history.' : null}
              </p>
            </div>
            <Button variant="outline" onClick={handleBackToApp} className="self-start md:self-auto">
              Close overview
            </Button>
          </div>
        </header>

        {!currentUser && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sign in to see your QR history</CardTitle>
              <CardDescription>
                You can explore the overview as a guest, but creating an account lets you save QR codes and track your
                exchanges.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button onClick={() => handleOpenAuth('signup')}>Create free account</Button>
              <Button variant="outline" onClick={() => handleOpenAuth('signin')}>
                Sign in
              </Button>
            </CardContent>
          </Card>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active QR codes</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-3xl font-semibold">{activeCodes.length}</span>
              <QrCode size={28} className="text-primary" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed handovers</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-3xl font-semibold">{completedCodes.length}</span>
              <HandHeart size={28} className="text-emerald-600" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Expired QR codes</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-3xl font-semibold">{expiredCodes.length}</span>
              <Clock size={28} className="text-amber-500" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Estimated CO₂ saved</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-3xl font-semibold">{totalImpact.toFixed(0)}kg</span>
              <ArrowsClockwise size={28} className="text-sky-600" />
            </CardContent>
          </Card>
        </section>

        <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <QrCode size={18} />
                Recent QR codes
              </CardTitle>
              <CardDescription>Newest first – active codes refresh automatically every 24 hours.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sortedRecent.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Generate a listing or pickup QR code to see activity here.
                </div>
              ) : (
                sortedRecent.map((code) => {
                  const expiresIn = new Date(code.metadata.expiresAt).getTime() - Date.now()
                  const hoursLeft = Math.max(0, Math.round(expiresIn / (1000 * 60 * 60)))
                  const isDropOff = code.type === 'donor'

                  return (
                    <div key={code.id} className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">{code.itemTitle}</p>
                          <p className="text-xs text-muted-foreground uppercase tracking-widest">
                            {code.metadata.category} • {code.transactionId}
                          </p>
                        </div>
                        <Badge variant={isDropOff ? 'secondary' : 'outline'}>
                          {isDropOff ? 'Drop-off QR' : 'Pickup QR'}
                        </Badge>
                      </div>

                      <Separator className="my-3" />

                      <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
                        <span className="flex items-center gap-2">
                          <Clock size={14} />
                          {hoursLeft > 0 ? `${hoursLeft}h until expiry` : 'Expired'}
                        </span>
                        {code.dropOffLocation && (
                          <span className="flex items-center gap-2">
                            <Storefront size={14} />
                            {code.dropOffLocation}
                          </span>
                        )}
                        <span>Impact: {code.metadata.co2Impact.toFixed(1)}kg CO₂e</span>
                        <span>Status: {code.status}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Storefront size={18} />
                Partner features
              </CardTitle>
              <CardDescription>
                Upgrade to a partner shop profile to access live scanning, attendant logs, and advanced analytics.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                Your account currently has access to QR history and downloadable records. To unlock live scanning, contact our
                partnerships team and we&apos;ll enable the full toolkit for your location.
              </p>
              <ul className="space-y-2">
                <li>• Live QR validation for collections and drop-offs</li>
                <li>• Attendant notes and accountability trail</li>
                <li>• Automated notifications for collectors and donors</li>
                <li>• Dedicated support for hardware and kiosk setup</li>
              </ul>
              <Button variant="secondary" onClick={() => window.dispatchEvent(new Event('open-profile-onboarding'))}>
                Request partner access
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

