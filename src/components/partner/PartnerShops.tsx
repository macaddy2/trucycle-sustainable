import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowClockwise, MapPin, Phone, Storefront } from '@phosphor-icons/react'
import type { ShopDto } from '@/lib/api'

interface PartnerShopsProps {
  shops: ShopDto[]
  loading: boolean
  onRefresh: () => void
}

function formatOpeningHours(shop: ShopDto) {
  const hours = shop.opening_hours
  if (!hours) return 'Hours not available'
  const days = Array.isArray(hours.days) && hours.days.length > 0 ? hours.days.join(', ') : 'Daily'
  if (!hours.open_time && !hours.close_time) return days
  return `${days} ${hours.open_time ?? ''}${hours.open_time ? ' - ' : ''}${hours.close_time ?? ''}`.trim()
}

export function PartnerShops({ shops, loading, onRefresh }: PartnerShopsProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-h3">Partner shops</CardTitle>
            <CardDescription>Manage your locations, opening hours, and accepted categories.</CardDescription>
          </div>
          <Button variant="outline" onClick={onRefresh} disabled={loading}>
            <ArrowClockwise size={18} className="mr-2" />
            Refresh
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Registered shops</CardTitle>
          <CardDescription>Your TruCycle partner network.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : shops.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No partner shops yet. Complete your first partner registration to create a shop profile.
            </div>
          ) : (
            <ScrollArea className="max-h-[520px] pr-4">
              <div className="space-y-4">
                {shops.map(shop => (
                  <div key={shop.id} className="rounded-3xl border border-border bg-muted/30 p-5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <Storefront size={20} className="text-primary" />
                          {shop.name}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin size={14} />
                          <span>{shop.address_line ?? 'Address coming soon'}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline">Postcode: {shop.postcode ?? '—'}</Badge>
                          <Badge variant="outline">{formatOpeningHours(shop)}</Badge>
                        </div>
                      </div>
                      {shop.phone_number && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone size={14} />
                          {shop.phone_number}
                        </div>
                      )}
                    </div>

                    {Array.isArray(shop.acceptable_categories) && shop.acceptable_categories.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {shop.acceptable_categories.map(category => (
                          <Badge key={category} variant="secondary" className="capitalize">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    )}
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
