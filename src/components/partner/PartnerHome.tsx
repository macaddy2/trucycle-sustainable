import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowClockwise, QrCode, Package, Storefront, Leaf } from '@phosphor-icons/react'
import type { MinimalUser, PartnerShopItem, ShopDto } from '@/lib/api'

interface PartnerHomeProps {
  partner: MinimalUser | null
  shops: ShopDto[]
  items: PartnerShopItem[]
  loading: boolean
  onRefresh: () => void
  onOpenScan: () => void
}

function formatDate(date?: string) {
  if (!date) return '—'
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function PartnerHome({ partner, shops, items, loading, onRefresh, onOpenScan }: PartnerHomeProps) {
  const stats = useMemo(() => {
    const totalItems = items.length
    const activeItems = items.filter(item => item.status === 'active').length
    const dropoffs = items.filter(item => item.pickup_option !== 'exchange').length
    const pickups = totalItems - dropoffs
    const avgItemsPerShop = shops.length === 0 ? 0 : Math.round((totalItems / shops.length) * 10) / 10

    return {
      totalItems,
      activeItems,
      dropoffs,
      pickups,
      avgItemsPerShop,
    }
  }, [items, shops])

  const recentItems = useMemo(() => {
    return [...items]
      .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
      .slice(0, 5)
  }, [items])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-border bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Partner overview</p>
          <h2 className="text-h2 text-foreground">
            Welcome back{partner?.firstName ? `, ${partner.firstName}` : ''}!
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl">
            Track activity across your shops, scan drop-offs in moments, and keep sustainability metrics up to date.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={onRefresh} disabled={loading}>
            <ArrowClockwise size={18} className="mr-2" />
            Refresh data
          </Button>
          <Button onClick={onOpenScan}>
            <QrCode size={18} className="mr-2" />
            Launch scanner
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active listings</CardTitle>
            <Package size={22} className="text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{stats.activeItems}</p>
            <p className="text-xs text-muted-foreground">of {stats.totalItems} total items</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Drop-offs this week</CardTitle>
            <Storefront size={22} className="text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{stats.dropoffs}</p>
            <p className="text-xs text-muted-foreground">Partner shop check-ins</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pickups scheduled</CardTitle>
            <QrCode size={22} className="text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{stats.pickups}</p>
            <p className="text-xs text-muted-foreground">Awaiting collector collection</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. items per shop</CardTitle>
            <Leaf size={22} className="text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{stats.avgItemsPerShop}</p>
            <p className="text-xs text-muted-foreground">Across {shops.length} shops</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Recent activity</CardTitle>
            <p className="text-sm text-muted-foreground">Latest partner-managed listings across your network.</p>
          </div>
          <Badge variant="secondary">{recentItems.length} items</Badge>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : recentItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No partner items yet. Create a listing or register a new shop to get started.
            </div>
          ) : (
            <ScrollArea className="max-h-[320px] pr-4">
              <div className="space-y-4">
                {recentItems.map(item => (
                  <div key={item.id} className="rounded-2xl border border-border bg-muted/30 p-4 shadow-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.title ?? 'Untitled item'}</p>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {item.shop?.name ?? 'Unassigned shop'} · {item.pickup_option ?? 'donate'}
                        </p>
                      </div>
                      <Badge variant="outline" className="w-max capitalize">
                        {item.status ?? 'pending'}
                      </Badge>
                    </div>
                    <Separator className="my-3" />
                    <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
                      <span>Created: {formatDate(item.created_at)}</span>
                      <span>Category: {item.category ?? 'General goods'}</span>
                      <span>Last updated: {formatDate(item.updated_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
