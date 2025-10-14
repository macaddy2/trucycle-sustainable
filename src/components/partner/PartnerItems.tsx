import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { ArrowClockwise, QrCode, Package, Clock } from '@phosphor-icons/react'
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
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
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
            <CardTitle className="text-h3">Partner items</CardTitle>
            <CardDescription>Monitor drop-offs, pickups, and recycling status across all partner shops.</CardDescription>
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
        <CardHeader>
          <CardTitle className="text-lg">Inventory overview</CardTitle>
          <CardDescription>All items managed by your partner organisation.</CardDescription>
        </CardHeader>
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
                    <TableHead className="w-[220px]">Item</TableHead>
                    <TableHead className="w-[160px]">Shop</TableHead>
                    <TableHead className="w-[120px]">Pickup option</TableHead>
                    <TableHead className="w-[160px]">Status</TableHead>
                    <TableHead className="w-[200px]">Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => (
                    <TableRow key={item.id} className="align-top">
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-foreground">{item.title ?? 'Untitled item'}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Package size={14} />
                            {item.category ?? 'General goods'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-foreground">{item.shop?.name ?? 'Unassigned'}</span>
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
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
