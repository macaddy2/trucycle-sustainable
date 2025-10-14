import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ArrowLeft, ArrowRight, MapPin, Phone, Storefront, User, Eye, EyeSlash, X } from '@phosphor-icons/react'
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
    openingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as string[],
    openTime: '09:00',
    closeTime: '17:00',
    categories: ['furniture', 'electronics'] as string[],
    notes: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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

    if (!form.addressLine || !form.postcode || !form.shopName) {
      toast.error('Shop name, address and postcode are required')
      return
    }

    const openingDays = form.openingDays.filter(Boolean)
    const categories = form.categories.map(c => c.trim()).filter(Boolean)

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
                <Input id="partner-firstName" placeholder="Enter your first name" value={form.firstName} onChange={event => handleChange('firstName', event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner-lastName" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User size={16} className="text-primary" />
                  Last name
                </Label>
                <Input id="partner-lastName" placeholder="Enter your last name" value={form.lastName} onChange={event => handleChange('lastName', event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner-email" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User size={16} className="text-primary" />
                  Email
                </Label>
                <Input id="partner-email" type="email" placeholder="Enter your email" value={form.email} onChange={event => handleChange('email', event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner-password" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <LockIcon />
                  Password
                </Label>
                <div className="relative">
                  <Input id="partner-password" type={showPassword ? 'text' : 'password'} placeholder="Create a strong password" value={form.password} onChange={event => handleChange('password', event.target.value)} className="pr-10" />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(v => !v)}>
                    {showPassword ? <EyeSlash size={18} className="text-muted-foreground" /> : <Eye size={18} className="text-muted-foreground" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner-confirm" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <LockIcon />
                  Confirm password
                </Label>
                <div className="relative">
                  <Input id="partner-confirm" type={showConfirmPassword ? 'text' : 'password'} placeholder="Re-enter your password" value={form.confirmPassword} onChange={event => handleChange('confirmPassword', event.target.value)} className="pr-10" />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowConfirmPassword(v => !v)}>
                    {showConfirmPassword ? <EyeSlash size={18} className="text-muted-foreground" /> : <Eye size={18} className="text-muted-foreground" />}
                  </Button>
                </div>
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
                  <Input id="shop-name" placeholder="e.g., Green Reuse Hub" value={form.shopName} onChange={event => handleChange('shopName', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shop-phone" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Phone size={16} className="text-primary" />
                    Phone number (optional)
                  </Label>
                  <Input id="shop-phone" placeholder="e.g., +44 20 7946 0958" value={form.phoneNumber} onChange={event => handleChange('phoneNumber', event.target.value)} />
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="shop-address" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <MapPin size={16} className="text-primary" />
                    Address line
                  </Label>
                  <Input id="shop-address" placeholder="e.g., 1 High St" value={form.addressLine} onChange={event => handleChange('addressLine', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shop-postcode" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <MapPin size={16} className="text-primary" />
                    Postcode
                  </Label>
                  <Input id="shop-postcode" placeholder="e.g., AB12 3CD" value={form.postcode} onChange={event => handleChange('postcode', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Opening days</Label>
                  <div className="flex flex-wrap gap-2">
                    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => {
                      const selected = form.openingDays.includes(day)
                      return (
                        <Button
                          key={day}
                          type="button"
                          variant={selected ? 'secondary' : 'outline'}
                          className={selected ? 'capitalize' : 'capitalize'}
                          onClick={() => {
                            setForm(prev => ({
                              ...prev,
                              openingDays: selected
                                ? prev.openingDays.filter(d => d !== day)
                                : [...prev.openingDays, day],
                            }))
                          }}
                        >
                          {day}
                        </Button>
                      )
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shop-open" className="text-sm font-medium text-muted-foreground">Open time</Label>
                  <Input id="shop-open" type="time" value={form.openTime} onChange={event => handleChange('openTime', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shop-close" className="text-sm font-medium text-muted-foreground">Close time</Label>
                  <Input id="shop-close" type="time" value={form.closeTime} onChange={event => handleChange('closeTime', event.target.value)} />
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <Label className="text-sm font-medium text-muted-foreground">Acceptable Items</Label>
                  <div className="flex flex-wrap gap-2">
                    {form.categories.map((cat, idx) => (
                      <span key={`${cat}-${idx}`} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm">
                        <span className="capitalize">{cat}</span>
                        <button type="button" aria-label={`Remove ${cat}`} onClick={() => setForm(prev => ({ ...prev, categories: prev.categories.filter((_, i) => i !== idx) }))} className="text-muted-foreground hover:text-foreground">
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <Input
                    id="shop-categories"
                    placeholder="Add acceptable items (press Enter)"
                    onKeyDown={(e) => {
                      const target = e.target as HTMLInputElement
                      const value = target.value.trim()
                      if (!value) return
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault()
                        if (!form.categories.includes(value)) {
                          setForm(prev => ({ ...prev, categories: [...prev.categories, value] }))
                        }
                        target.value = ''
                      }
                    }}
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
