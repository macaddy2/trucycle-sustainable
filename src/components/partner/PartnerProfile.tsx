import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Envelope, IdentificationBadge, SignOut } from '@phosphor-icons/react'
import type { MinimalUser, PartnerShopItem, ShopDto } from '@/lib/api'

interface PartnerProfileProps {
  partner: MinimalUser | null
  shops: ShopDto[]
  items: PartnerShopItem[]
  onSignOut: () => void
}

export function PartnerProfile({ partner, shops, items, onSignOut }: PartnerProfileProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-h3">Account details</CardTitle>
            <CardDescription>Control your partner access, contact details, and sustainability stats.</CardDescription>
          </div>
          <Button variant="outline" onClick={onSignOut}>
            <SignOut size={18} className="mr-2" />
            Sign out
          </Button>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        <Card className="h-full">
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase text-muted-foreground">Full name</label>
                <Input value={`${partner?.firstName ?? ''} ${partner?.lastName ?? ''}`.trim() || '—'} readOnly />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase text-muted-foreground">Email</label>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  <Envelope size={16} className="text-primary" />
                  {partner?.email ?? '—'}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase text-muted-foreground">Partner ID</label>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  <IdentificationBadge size={16} className="text-primary" />
                  {partner?.id ?? '—'}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase text-muted-foreground">Status</label>
                <Badge variant="secondary" className="capitalize">
                  {partner?.status ?? 'pending'}
                </Badge>
              </div>
            </div>
            <Separator />
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Network summary</p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                  <p className="text-xs uppercase text-muted-foreground">Registered shops</p>
                  <p className="text-lg font-semibold text-foreground">{shops.length}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                  <p className="text-xs uppercase text-muted-foreground">Managed items</p>
                  <p className="text-lg font-semibold text-foreground">{items.length}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                  <p className="text-xs uppercase text-muted-foreground">Active listings</p>
                  <p className="text-lg font-semibold text-foreground">{items.filter(item => item.status === 'active').length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        
      </div>
    </div>
  )
}
