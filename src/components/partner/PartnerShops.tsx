import { useMemo, useState, type FormEvent } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { ArrowClockwise, MapPin, Phone, Storefront, PlusCircle, Trash } from '@phosphor-icons/react'
import { createShop, deleteShop, type CreateShopDto, type ShopDto } from '@/lib/api'
import { CATEGORIES } from '@/lib/categories'
import { toast } from 'sonner'

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
  const [form, setForm] = useState({
    name: '',
    phone_number: '',
    address_line: '',
    postcode: '',
    openingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as string[],
    open_time: '09:00',
    close_time: '17:00',
    acceptable_categories: [] as string[],
    operational_notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [deactivateOpen, setDeleteOpen] = useState(false)
  const [deactivateTarget, setDeleteTarget] = useState<ShopDto | null>(null)
  const [deactivateConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  const activeShops = useMemo(() => shops.filter(shop => shop.active === true), [shops])

  const dayOptions = useMemo(() => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], [])

  const handleToggleDay = (day: string) => {
    setForm(prev => ({
      ...prev,
      openingDays: prev.openingDays.includes(day)
        ? prev.openingDays.filter(d => d !== day)
        : [...prev.openingDays, day],
    }))
  }

  const handleToggleCategory = (category: string) => {
    setForm(prev => ({
      ...prev,
      acceptable_categories: prev.acceptable_categories.includes(category)
        ? prev.acceptable_categories.filter(c => c !== category)
        : [...prev.acceptable_categories, category],
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = form.name.trim()
    const address = form.address_line.trim()
    const postcode = form.postcode.trim()
    if (!name || !address || !postcode) {
      toast.error('Name, address, and postcode are required')
      return
    }

    const opening_hours =
      form.openingDays.length > 0 || form.open_time || form.close_time
        ? {
            days: form.openingDays,
            open_time: form.open_time || undefined,
            close_time: form.close_time || undefined,
          }
        : undefined

    const payload: CreateShopDto = {
      name,
      phone_number: form.phone_number.trim() || undefined,
      address_line: address,
      postcode,
      opening_hours,
      acceptable_categories: form.acceptable_categories.length > 0 ? form.acceptable_categories : undefined,
      operational_notes: form.operational_notes.trim() || undefined,
    }

    setSubmitting(true)
    try {
      await createShop(payload)
      toast.success('Shop created successfully')
      setForm(prev => ({
        name: '',
        phone_number: '',
        address_line: '',
        postcode: '',
        openingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        open_time: '09:00',
        close_time: '17:00',
        acceptable_categories: [],
        operational_notes: '',
      }))
      setSheetOpen(false)
      onRefresh()
    } catch (error: any) {
      console.error('Create shop failed', error)
      toast.error(error?.message || 'Unable to create shop right now.')
    } finally {
      setSubmitting(false)
    }
  }

  const startDelete = (shop: ShopDto) => {
    setDeleteTarget(shop)
    setDeleteConfirm('')
    setDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!deactivateTarget) return
    const expected = (deactivateTarget.name || '').trim()
    if (!deactivateConfirm.trim() || deactivateConfirm.trim() !== expected) {
      toast.error('Enter the shop name to confirm deactivation.')
      return
    }
    setDeleting(true)
    try {
      await deleteShop(deactivateTarget.id)
      toast.success('Shop deactivated')
      setDeleteOpen(false)
      onRefresh()
    } catch (error: any) {
      console.error('Deactivate shop failed', error)
      toast.error(error?.message || 'Unable to deactivate shop right now.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-h3">Registered shops</CardTitle>
            <CardDescription>Manage your locations, opening hours, and accepted categories.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={onRefresh} disabled={loading}>
              <ArrowClockwise size={18} className="mr-2" />
              Refresh
            </Button>
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button className="gap-2">
                  <PlusCircle size={18} />
                  New shop
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="sm:max-w-3xl">
                <SheetHeader>
                  <SheetTitle>Add a new shop</SheetTitle>
                  <SheetDescription>Capture the same shop details used during partner sign-up.</SheetDescription>
                </SheetHeader>
                <form className="space-y-6 px-4 pb-6" onSubmit={handleSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="shop-name">Shop name</Label>
                      <Input id="shop-name" placeholder="Green House" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shop-phone">Phone number</Label>
                      <Input id="shop-phone" placeholder="+44 20 7946 0958" value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="shop-address">Address line</Label>
                      <Input id="shop-address" placeholder="5, Unity Street, London, UK" value={form.address_line} onChange={e => setForm({ ...form, address_line: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shop-postcode">Postcode</Label>
                      <Input id="shop-postcode" placeholder="IG11 7FR" value={form.postcode} onChange={e => setForm({ ...form, postcode: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Opening days</Label>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {dayOptions.map(day => (
                          <label key={day} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={form.openingDays.includes(day)}
                              onCheckedChange={_checked => handleToggleDay(day)}
                              id={`day-${day}`}
                            />
                            <span>{day}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="shop-open">Open time</Label>
                        <Input id="shop-open" type="time" value={form.open_time} onChange={e => setForm({ ...form, open_time: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shop-close">Close time</Label>
                        <Input id="shop-close" type="time" value={form.close_time} onChange={e => setForm({ ...form, close_time: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Acceptable categories</Label>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                      {CATEGORIES.map(category => (
                        <label key={category} className="flex items-center gap-2 text-sm capitalize">
                          <Checkbox
                            checked={form.acceptable_categories.includes(category)}
                            onCheckedChange={_checked => handleToggleCategory(category)}
                            id={`cat-${category}`}
                          />
                          <span>{category}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shop-notes">Operational notes</Label>
                    <Textarea
                      id="shop-notes"
                      placeholder="Back entrance on Church St. Ring bell."
                      value={form.operational_notes}
                      onChange={e => setForm({ ...form, operational_notes: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Creating...' : 'Create shop'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={onRefresh} disabled={loading}>
                      <ArrowClockwise size={16} className="mr-1" />
                      Refresh list
                    </Button>
                  </div>
                </form>
              </SheetContent>
            </Sheet>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : activeShops.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No partner shops yet. Complete your first partner registration to create a shop profile.
            </div>
          ) : (
            <ScrollArea className="max-h-[520px] pr-4">
              <div className="space-y-4">
                {activeShops.map(shop => {
                  const canDeactivate = activeShops.length > 1
                  return (
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
                          <Badge variant="outline">Postcode: {shop.postcode ?? '--'}</Badge>
                          <Badge variant="outline">{formatOpeningHours(shop)}</Badge>
                        </div>
                      </div>
                      {shop.phone_number && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone size={14} />
                          {shop.phone_number}
                        </div>
                      )}
                      {canDeactivate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-8 w-fit text-destructive"
                          onClick={() => startDelete(shop)}
                        >
                          <Trash size={16} className="mr-1" />
                          Deactivate
                        </Button>
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
                    {shop.operational_notes && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Notes: {shop.operational_notes}
                      </p>
                    )}
                  </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deactivateOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate shop</AlertDialogTitle>
            <AlertDialogDescription>
              Type the shop name <span className="font-semibold text-foreground">{deactivateTarget?.name}</span> to confirm deactivation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="deactivate-shop-name">Shop name</Label>
            <Input
              id="deactivate-shop-name"
              placeholder={deactivateTarget?.name ?? ''}
              value={deactivateConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
