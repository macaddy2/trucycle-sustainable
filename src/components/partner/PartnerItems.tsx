import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowClockwise, QrCode, Package, Clock, ImageSquare } from '@phosphor-icons/react'
import type { PartnerShopItem } from '@/lib/api'

interface PartnerItemsProps {
  items: PartnerShopItem[]
  loading: boolean
  onRefresh: () => void
  onOpenScan: () => void
}

function formatStatus(status?: string | null) {
  if (!status) return 'pending'
  return status.replace(/_/g, ' ')
}

function formatTime(value?: string) {
  if (!value) return '--'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '--'
  return parsed.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatCategory(value?: string | null) {
  if (!value) return '--'
  return value.replace(/_/g, ' ')
}

export function PartnerItems({ items, loading, onRefresh, onOpenScan }: PartnerItemsProps) {
  const breakdown = useMemo(() => {
    const active = items.filter(item => item.status === 'active').length
    const pendingDropoff = items.filter(item => item.status === 'pending_dropoff').length
    const awaitingPickup = items.filter(item => item.status === 'awaiting_collection').length
    const recycled = items.filter(item => item.status === 'recycled').length

    return { active, pendingDropoff, awaitingPickup, recycled }
  }, [items])

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-h3">Inventory overview</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={onRefresh} disabled={loading}>
              <ArrowClockwise size={18} className="mr-2" />
              Refresh
            </Button>
            <Button onClick={onOpenScan}>
              <QrCode size={18} className="mr-2" />
              Scan item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-xs uppercase text-muted-foreground">Active</p>
              <p className="text-2xl font-semibold text-foreground">{breakdown.active}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-xs uppercase text-muted-foreground">Pending drop-off</p>
              <p className="text-2xl font-semibold text-foreground">{breakdown.pendingDropoff}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-xs uppercase text-muted-foreground">Awaiting pickup</p>
              <p className="text-2xl font-semibold text-foreground">{breakdown.awaitingPickup}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-xs uppercase text-muted-foreground">Recycled</p>
              <p className="text-2xl font-semibold text-foreground">{breakdown.recycled}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No partner items yet. Use the QR scanner or create a listing to add your first item.
            </div>
          ) : (
            <ScrollArea className="max-h-[480px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[260px]">Item</TableHead>
                    <TableHead className="w-[200px]">Shop</TableHead>
                    <TableHead className="w-[120px]">Pickup option</TableHead>
                    <TableHead className="w-[160px]">Status</TableHead>
                    <TableHead className="w-[200px]">Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => {
                    const imageUrl = item.images?.[0]?.url
                    const locationName = item.dropoff_location?.name ?? item.shop?.name ?? 'Unassigned'
                    return (
                      <TableRow key={item.id} className="align-top">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 overflow-hidden rounded-lg border border-border bg-muted/60 flex items-center justify-center">
                              {imageUrl ? (
                                <img src={imageUrl} alt={item.title ?? 'Item image'} className="h-full w-full object-cover" />
                              ) : (
                                <ImageSquare size={20} className="text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-foreground">{item.title ?? 'Untitled item'}</span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Package size={14} />
                                {formatCategory(item.category)}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm text-foreground">{locationName}</span>
                            {item.dropoff_location?.postcode && (
                              <span className="text-xs text-muted-foreground">{item.dropoff_location.postcode}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {item.pickup_option ?? 'donate'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {formatStatus(item.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock size={14} />
                            {formatTime(item.updated_at ?? item.created_at)}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
