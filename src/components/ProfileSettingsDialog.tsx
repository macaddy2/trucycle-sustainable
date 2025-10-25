import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useKV } from '@/hooks/useKV'
import { updateMyProfile, me as apiMe } from '@/lib/api'
import { kvGet, kvSet } from '@/lib/kvStore'

interface ProfileSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface UserProfile {
  id: string
  name: string
  email: string
  userType: 'donor' | 'collector'
  postcode?: string
  onboardingCompleted?: boolean
  verificationLevel: {
    email: boolean
    identity: boolean
    address: boolean
  }
  rewardsBalance?: number
  partnerAccess?: boolean
}

interface UserPreferences {
  userId: string
  userType: 'donor' | 'collector'
  location?: {
    postcode?: string
    area?: string
    district?: string
  }
  notifications?: {
    newMatches: boolean
    messages: boolean
    recommendations: boolean
    communityNeeds: boolean
  }
  preferences?: {
    maxDistance: number
    categories: string[]
    urgencyLevels: Array<'high' | 'medium' | 'low'>
    autoNotifications: boolean
  }
  updatedAt?: string
}

const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\d?[A-Z]{2}$/

const normalizePostcode = (value: string) => value.replace(/\s+/g, '').toUpperCase()

const formatPostcode = (value: string) => {
  const normalized = normalizePostcode(value)
  if (!normalized) return ''
  if (normalized.length <= 3) return normalized
  return `${normalized.slice(0, normalized.length - 3)} ${normalized.slice(-3)}`
}

const defaultNotifications = {
  newMatches: true,
  messages: true,
  recommendations: true,
  communityNeeds: true,
}

const defaultPreferences = {
  maxDistance: 10,
  categories: [] as string[],
  urgencyLevels: ['high', 'medium', 'low'] as Array<'high' | 'medium' | 'low'>,
  autoNotifications: true,
}

export function ProfileSettingsDialog({ open, onOpenChange }: ProfileSettingsDialogProps) {
  const [user, setUser] = useKV<UserProfile | null>('current-user', null)
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'partner'>('account')

  const [formState, setFormState] = useState({
    name: '',
    postcode: '',
    partnerAccess: false,
    notifications: { ...defaultNotifications },
    maxDistance: defaultPreferences.maxDistance,
    autoNotifications: defaultPreferences.autoNotifications,
  })

  useEffect(() => {
    if (!open) {
      setActiveTab('account')
      return
    }

    if (!user) {
      return
    }

    const loadPreferences = async () => {
      const existingPreferences = await kvGet<UserPreferences>(`user-preferences-${user.id}`)
      if (existingPreferences) {
        setPreferences(existingPreferences)
        setFormState({
          name: user.name,
          postcode: user.postcode ?? '',
          partnerAccess: Boolean(user.partnerAccess),
          notifications: {
            ...defaultNotifications,
            ...existingPreferences.notifications,
          },
          maxDistance: existingPreferences.preferences?.maxDistance ?? defaultPreferences.maxDistance,
          autoNotifications: existingPreferences.preferences?.autoNotifications ?? defaultPreferences.autoNotifications,
        })
      } else {
        setPreferences(null)
        setFormState({
          name: user.name,
          postcode: user.postcode ?? '',
          partnerAccess: Boolean(user.partnerAccess),
          notifications: { ...defaultNotifications },
          maxDistance: defaultPreferences.maxDistance,
          autoNotifications: defaultPreferences.autoNotifications,
        })
      }
    }

    void loadPreferences()
  }, [open, user])

  const postcodeError = useMemo(() => {
    if (!formState.postcode.trim()) return ''
    return UK_POSTCODE_REGEX.test(normalizePostcode(formState.postcode)) ? '' : 'Enter a valid UK postcode'
  }, [formState.postcode])

  const kmToMi = (km: number) => km * 0.621371
  const miToKm = (mi: number) => mi / 0.621371

  const handleSave = async () => {
    if (!user) {
      toast.error('Sign in to update your settings')
      return
    }

    if (!formState.name.trim()) {
      toast.error('Please add your full name')
      return
    }

    if (!formState.postcode.trim() || postcodeError) {
      toast.error(postcodeError || 'Enter your postcode')
      return
    }

    const formattedPostcode = formatPostcode(formState.postcode)

    // Update backend profile
    const [firstName, ...rest] = formState.name.trim().split(' ')
    try {
      await updateMyProfile({ first_name: firstName || '', last_name: rest.join(' ') || firstName || '', postcode: formattedPostcode })
    } catch (err: any) {
      console.error('Failed to update profile via API', err)
      // continue to update local state to keep UX fluid
    }

    const updatedUser: UserProfile = {
      ...user,
      name: formState.name.trim(),
      postcode: formattedPostcode,
      partnerAccess: user.partnerAccess,
      verificationLevel: {
        ...user.verificationLevel,
        address: user.verificationLevel.address || Boolean(formattedPostcode),
      },
    }

    const userProfiles = await kvGet<Record<string, UserProfile>>('user-profiles') || {}
    await kvSet('user-profiles', {
      ...userProfiles,
      [updatedUser.id]: updatedUser,
    })

    const fallbackArea = formattedPostcode ? formattedPostcode.split(' ')[0] : undefined

    const updatedPreferences: UserPreferences = {
      userId: updatedUser.id,
      userType: updatedUser.userType,
      location: {
        postcode: formattedPostcode,
        area: preferences?.location?.area ?? fallbackArea,
        district: preferences?.location?.district ?? 'United Kingdom',
      },
      notifications: {
        ...defaultNotifications,
        ...formState.notifications,
      },
      preferences: {
        ...defaultPreferences,
        ...preferences?.preferences,
        maxDistance: Number.isFinite(formState.maxDistance) ? Math.max(1, Math.min(50, formState.maxDistance)) : defaultPreferences.maxDistance,
        autoNotifications: formState.autoNotifications,
      },
      updatedAt: new Date().toISOString(),
    }

    await kvSet(`user-preferences-${updatedUser.id}`, updatedPreferences)

    setPreferences(updatedPreferences)
    // Refresh partner role, postcode, verifications from auth/me
    try {
      const meRes = await apiMe()
      const meUser = meRes?.data?.user
      if (meUser) {
        setUser({
          ...updatedUser,
          name: [meUser.firstName, meUser.lastName].filter(Boolean).join(' ') || updatedUser.name,
          postcode: meUser.postcode ?? updatedUser.postcode,
          partnerAccess: Array.isArray(meUser.roles) ? meUser.roles.includes('partner') : (meUser.role === 'partner'),
          verificationLevel: {
            email: Boolean(meUser.verifications?.email_verified),
            identity: Boolean(meUser.verifications?.identity_verified),
            address: Boolean(meUser.verifications?.address_verified) || Boolean(formattedPostcode),
          },
        })
      } else {
        setUser(updatedUser)
      }
    } catch {
      setUser(updatedUser)
    }
    toast.success('Profile settings updated')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-h3">Account settings</DialogTitle>
          <DialogDescription>
            Manage your core profile details and notification preferences.
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>You need to be signed in to update your settings.</p>
            <div className="flex gap-2">
              <Button onClick={() => window.dispatchEvent(new CustomEvent('open-auth-dialog', { detail: { mode: 'signup' } }))}>
                Create account
              </Button>
              <Button
                variant="outline"
                onClick={() => window.dispatchEvent(new CustomEvent('open-auth-dialog', { detail: { mode: 'signin' } }))}
              >
                Sign in
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="partner">Partner</TabsTrigger>
              </TabsList>

              <TabsContent value="account" className="space-y-4 pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="settings-name">Full name</Label>
                    <Input
                      id="settings-name"
                      value={formState.name}
                      onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="e.g. Amina Khan"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-email">Email address</Label>
                    <Input id="settings-email" value={user.email} disabled className="bg-muted" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="settings-postcode">Primary postcode</Label>
                    <Input
                      id="settings-postcode"
                      value={formState.postcode}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, postcode: event.target.value.toUpperCase() }))
                      }
                      onBlur={(event) =>
                        setFormState((prev) => ({ ...prev, postcode: formatPostcode(event.target.value) }))
                      }
                      placeholder="e.g. N1 8QH"
                    />
                    {postcodeError && <p className="text-xs text-destructive">{postcodeError}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-distance">Preferred search radius (mi)</Label>
                    <Input
                      id="settings-distance"
                      type="number"
                      min={1}
                      max={31}
                      value={Number.isFinite(formState.maxDistance) ? Math.round(kmToMi(formState.maxDistance)) : 0}
                      onChange={(event) => {
                        const miles = Number(event.target.value)
                        if (!Number.isFinite(miles)) return
                        const km = miToKm(miles)
                        setFormState((prev) => ({ ...prev, maxDistance: km }))
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Stored in km internally for search; displayed here in miles.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="partner" className="space-y-4 pt-4">
                <div className="rounded-lg border border-border p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">Partner shop</p>
                    <p className="text-sm text-muted-foreground">
                      Access partner tools for QR check-in and collection logs.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      const base = (import.meta as any).env?.BASE_URL || '/'
                      if (user?.partnerAccess) {
                        window.location.assign(String(base || '/').replace(/\/$/, '') + '/partner')
                      } else {
                        window.location.assign(String(base || '/').replace(/\/$/, '') + '/partner/register')
                      }
                    }}
                  >
                    {user?.partnerAccess ? 'Go to Shop' : 'Become a Partner'}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save changes</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
