import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ArrowLeft, ArrowRight, MapPin, Phone, Storefront, User, Compass } from '@phosphor-icons/react'
import { register as apiRegister, type RegisterDto } from '@/lib/api'
import { toast } from 'sonner'

interface PartnerRegisterPageProps {
  onNavigate: (route: string, replace?: boolean) => void
}

export function PartnerRegisterPage({ onNavigate }: PartnerRegisterPageProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    shopName: '',
    phoneNumber: '',
    addressLine: '',
    postcode: '',
    latitude: '',
    longitude: '',
    openingDays: 'Mon,Tue,Wed,Thu,Fri',
    openTime: '09:00',
    closeTime: '17:00',
    categories: 'furniture, electronics',
    notes: '',
  })

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.firstName || !form.lastName || !form.email || !form.password || !form.confirmPassword) {
      toast.error('Please complete all required partner fields')
      return
    }

    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    const lat = Number.parseFloat(form.latitude)
    const lon = Number.parseFloat(form.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      toast.error('Provide a valid latitude and longitude for your shop')
      return
    }

    if (!form.addressLine || !form.postcode || !form.shopName) {
      toast.error('Shop name, address and postcode are required')
      return
    }

    const openingDays = form.openingDays
      .split(',')
      .map(day => day.trim())
      .filter(Boolean)

    const categories = form.categories
      .split(',')
      .map(category => category.trim())
      .filter(Boolean)

    const dto: RegisterDto = {
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      role: 'partner',
      shop: {
        name: form.shopName.trim(),
        phone_number: form.phoneNumber.trim() || undefined,
        address_line: form.addressLine.trim(),
        postcode: form.postcode.trim(),
        latitude: lat,
        longitude: lon,
        opening_hours:
          openingDays.length > 0 || form.openTime || form.closeTime
            ? {
                days: openingDays,
                open_time: form.openTime || undefined,
                close_time: form.closeTime || undefined,
              }
            : undefined,
        acceptable_categories: categories.length > 0 ? categories : undefined,
      },
    }

    setLoading(true)
    try {
      await apiRegister(dto)
      toast.success('Partner account created! Check your email to verify your access.')
      onNavigate('login', true)
    } catch (error: any) {
      console.error('Partner registration failed', error)
      toast.error(error?.message || 'Unable to complete partner registration right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-16">
      <div className="mb-6">
        <Button variant="ghost" className="px-0 text-sm text-primary" onClick={() => onNavigate('login')}>
          <ArrowLeft size={16} className="mr-2" />
          Back to partner login
        </Button>
      </div>
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-h2">Become a TruCycle Partner</CardTitle>
          <CardDescription>
            Register your organisation, create your first shop, and start receiving community donations within minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-8" onSubmit={handleSubmit}>
            <section className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="partner-firstName" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User size={16} className="text-primary" />
                  First name
                </Label>
                <Input id="partner-firstName" value={form.firstName} onChange={event => handleChange('firstName', event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner-lastName" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User size={16} className="text-primary" />
                  Last name
                </Label>
                <Input id="partner-lastName" value={form.lastName} onChange={event => handleChange('lastName', event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner-email" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User size={16} className="text-primary" />
                  Email
                </Label>
                <Input id="partner-email" type="email" value={form.email} onChange={event => handleChange('email', event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner-password" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <LockIcon />
                  Password
                </Label>
                <Input id="partner-password" type="password" value={form.password} onChange={event => handleChange('password', event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner-confirm" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <LockIcon />
                  Confirm password
                </Label>
                <Input id="partner-confirm" type="password" value={form.confirmPassword} onChange={event => handleChange('confirmPassword', event.target.value)} />
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">First shop details</h2>
                <p className="text-sm text-muted-foreground">Provide the location and categories for your first partner shop.</p>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="shop-name" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Storefront size={16} className="text-primary" />
                    Shop name
                  </Label>
                  <Input id="shop-name" value={form.shopName} onChange={event => handleChange('shopName', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shop-phone" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Phone size={16} className="text-primary" />
                    Phone number (optional)
                  </Label>
                  <Input id="shop-phone" value={form.phoneNumber} onChange={event => handleChange('phoneNumber', event.target.value)} />
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="shop-address" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <MapPin size={16} className="text-primary" />
                    Address line
                  </Label>
                  <Input id="shop-address" value={form.addressLine} onChange={event => handleChange('addressLine', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shop-postcode" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <MapPin size={16} className="text-primary" />
                    Postcode
                  </Label>
                  <Input id="shop-postcode" value={form.postcode} onChange={event => handleChange('postcode', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shop-lat" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Compass size={16} className="text-primary" />
                    Latitude
                  </Label>
                  <Input id="shop-lat" value={form.latitude} onChange={event => handleChange('latitude', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shop-lon" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Compass size={16} className="text-primary" />
                    Longitude
                  </Label>
                  <Input id="shop-lon" value={form.longitude} onChange={event => handleChange('longitude', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shop-days" className="text-sm font-medium text-muted-foreground">Opening days (comma separated)</Label>
                  <Input id="shop-days" value={form.openingDays} onChange={event => handleChange('openingDays', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shop-open" className="text-sm font-medium text-muted-foreground">Open time</Label>
                  <Input id="shop-open" value={form.openTime} onChange={event => handleChange('openTime', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shop-close" className="text-sm font-medium text-muted-foreground">Close time</Label>
                  <Input id="shop-close" value={form.closeTime} onChange={event => handleChange('closeTime', event.target.value)} />
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="shop-categories" className="text-sm font-medium text-muted-foreground">Accepted categories</Label>
                  <Textarea
                    id="shop-categories"
                    value={form.categories}
                    onChange={event => handleChange('categories', event.target.value)}
                    rows={3}
                    placeholder="furniture, electronics, clothing"
                  />
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="shop-notes" className="text-sm font-medium text-muted-foreground">Operational notes (optional)</Label>
                  <Textarea
                    id="shop-notes"
                    value={form.notes}
                    onChange={event => handleChange('notes', event.target.value)}
                    rows={3}
                    placeholder="Access instructions, loading bay notes, or sustainability commitments"
                  />
                </div>
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button type="button" variant="outline" onClick={() => onNavigate('login')}>
                Back to login
              </Button>
              <Button type="submit" disabled={loading}>
                Complete registration <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function LockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 text-primary"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 5a3 3 0 0 1 6 0v3H9V7Zm3 7a2 2 0 1 1-1.732 1H11v2a1 1 0 0 0 2 0v-2h.732A2 2 0 0 1 12 12Z" fill="currentColor" /></svg>
}
