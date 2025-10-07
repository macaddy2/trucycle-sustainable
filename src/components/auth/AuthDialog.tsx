import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
import { Eye, EyeSlash, GoogleLogo, FacebookLogo, EnvelopeSimple } from '@phosphor-icons/react'
import { kvGet, kvSet } from '@/lib/kvStore'
import { useKV } from '@/hooks/useKV'
import { toast } from 'sonner'

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialMode?: 'signin' | 'signup'
}

interface UserProfile {
  id: string
  email: string
  name: string
  userType: 'donor' | 'collector'
  postcode?: string
  createdAt: string
  onboardingCompleted?: boolean
  avatar?: string
  verified?: boolean
  rating?: number
  verificationLevel?: {
    email: boolean
    phone: boolean
    identity: boolean
    address: boolean
    payment: boolean
    community: boolean
  }
  rewardsBalance?: number
  partnerAccess?: boolean
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function AuthDialog({ open, onOpenChange, initialMode = 'signin' }: AuthDialogProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  })

  const [, setUser] = useKV('current-user', null)

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all required fields')
      return false
    }

    if (mode === 'signup') {
      if (!formData.name) {
        toast.error('Please enter your full name')
        return false
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match')
        return false
      }
      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters long')
        return false
      }
    }

    if (!EMAIL_REGEX.test(formData.email.trim())) {
      toast.error('Please enter a valid email address')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500))

      const normalizedEmail = formData.email.trim().toLowerCase()
      const credentials = await kvGet<Record<string, { userId: string; password: string }>>('user-credentials') || {}

      if (mode === 'signup') {
        if (credentials[normalizedEmail]) {
          toast.error('An account with this email already exists')
          return
        }

        // Create new user profile
        const newUser: UserProfile = {
          id: Date.now().toString(),
          email: normalizedEmail,
          name: formData.name.trim(),
          userType: 'donor', // Default type, will be set in onboarding
          createdAt: new Date().toISOString(),
          onboardingCompleted: false,
          verified: true,
          rating: 5.0,
          verificationLevel: {
            email: true,
            phone: false,
            identity: false,
            address: false,
            payment: false,
            community: false
          },
          rewardsBalance: 0,
          partnerAccess: false
        }

        // Store user profile
        const userProfiles = await kvGet<Record<string, UserProfile>>('user-profiles') || {}
        await kvSet('user-profiles', {
          ...userProfiles,
          [newUser.id]: newUser
        })

        await kvSet('user-credentials', {
          ...credentials,
          [normalizedEmail]: { userId: newUser.id, password: formData.password }
        })

        setUser(newUser)
        toast.success(`Welcome to TruCycle, ${newUser.name}!`)
      } else {
        const credentialRecord = credentials[normalizedEmail]
        if (!credentialRecord) {
          toast.error('No account found with that email address')
          return
        }

        if (credentialRecord.password !== formData.password) {
          toast.error('Incorrect password')
          return
        }

        const userProfiles = await kvGet<Record<string, UserProfile>>('user-profiles') || {}
        const existingUser = userProfiles[credentialRecord.userId]

        if (!existingUser) {
          toast.error('We could not load your profile. Please sign up again.')
          return
        }

        setUser(existingUser)
        toast.success(`Welcome back${existingUser.name ? `, ${existingUser.name.split(' ')[0]}` : ''}!`)
      }

      onOpenChange(false)
      // Reset form
      setFormData({ email: '', password: '', name: '', confirmPassword: '' })
    } catch (error) {
      console.error('Authentication flow failed', error)
      toast.error('Authentication failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialAuth = (provider: 'google' | 'facebook') => {
    setIsLoading(true)

    // Simulate social auth
    setTimeout(async () => {
      try {
        const mockUser: UserProfile = {
          id: `${provider}-user-${Date.now()}`,
          email: `user@${provider}.com`,
          name: `${provider === 'google' ? 'Google' : 'Facebook'} User`,
          userType: 'donor',
          createdAt: new Date().toISOString(),
          verified: true,
          rating: 4.8,
          verificationLevel: {
            email: true,
            phone: false,
            identity: false,
            address: false,
            payment: false,
            community: false
          },
          rewardsBalance: 60
        }

        const existingProfiles = await kvGet<Record<string, UserProfile>>('user-profiles') || {}
        await kvSet('user-profiles', {
          ...existingProfiles,
          [mockUser.id]: mockUser,
        })

        setUser(mockUser)
        toast.success(`Signed in with ${provider}`)
        onOpenChange(false)
      } catch (error) {
        console.error('Social auth failed', error)
        toast.error('Unable to complete social sign in. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }, 1000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-h2 text-center">
            {mode === 'signin' ? 'Welcome Back' : 'Join TruCycle'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {mode === 'signin' 
              ? 'Sign in to continue your sustainable journey'
              : 'Create an account to start exchanging items sustainably'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Social Authentication */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleSocialAuth('google')}
              disabled={isLoading}
            >
              <GoogleLogo size={18} className="mr-2" />
              Continue with Google
            </Button>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleSocialAuth('facebook')}
              disabled={isLoading}
            >
              <FacebookLogo size={18} className="mr-2" />
              Continue with Facebook
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <EnvelopeSimple size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="pr-10"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeSlash size={18} className="text-muted-foreground" />
                  ) : (
                    <Eye size={18} className="text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          {/* Mode Toggle */}
          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
            </span>
            <Button
              variant="link"
              className="p-0 h-auto text-sm font-medium"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              disabled={isLoading}
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </Button>
          </div>

          {mode === 'signup' && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground text-center">
                  By creating an account, you agree to our Terms of Service and Privacy Policy. 
                  We're GDPR compliant and your data is secure.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
