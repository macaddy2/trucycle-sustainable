import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Eye, EyeSlash, EnvelopeSimple } from '@phosphor-icons/react'
import { login as apiLogin, register as apiRegister } from '@/lib/api'
import type { RegisterDto } from '@/lib/api'
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
    identity: boolean
    address: boolean
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
      const normalizedEmail = formData.email.trim().toLowerCase()

      if (mode === 'signup') {
        const [first, ...rest] = formData.name.trim().split(' ')
        const dto: RegisterDto = {
          first_name: first || '',
          last_name: rest.join(' ') || first || '',
          email: normalizedEmail,
          password: formData.password,
          role: 'customer',
        }
        const res = await apiRegister(dto)
        const displayName = `${res?.data?.user?.firstName ?? ''} ${res?.data?.user?.lastName ?? ''}`.trim()
        toast.success(
          displayName
            ? `Welcome, ${displayName}. Please verify your email to activate your account.`
            : 'Please verify your email to activate your account.'
        )
        onOpenChange(false)
      } else {
        const res = await apiLogin({ email: normalizedEmail, password: formData.password })
        const user = res?.data?.user as { id: string; email: string; firstName?: string; lastName?: string; status?: string; roles?: string[]; role?: string } | undefined
        if (user) {
          const profile: UserProfile = {
            id: user.id,
            email: user.email,
            name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
            userType: 'donor',
            createdAt: new Date().toISOString(),
            verified: user.status === 'active',
            partnerAccess: Array.isArray(user.roles) ? user.roles.includes('partner') : (user.role === 'partner'),
          }
          setUser(profile)
          toast.success(`Welcome back${profile.name ? `, ${profile.name.split(' ')[0]}` : ''}!`)
          onOpenChange(false)
        } else {
          toast.error('Login failed. Please try again.')
        }
      }

      setFormData({ email: '', password: '', name: '', confirmPassword: '' })
    } catch (error: any) {
      console.error('Authentication flow failed', error)
      toast.error(error?.message || 'Authentication failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const openForgotPassword = () => {
    const base = (import.meta as any).env?.BASE_URL || '/'
    const target = String(base || '/').replace(/\/$/, '') + '/auth/forgot-password'
    onOpenChange(false)
    window.location.assign(target)
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

            {mode === 'signin' && (
              <div className="text-right -mt-2">
                <Button type="button" variant="link" className="px-0 h-auto text-sm" onClick={openForgotPassword}>
                  Forgot password?
                </Button>
              </div>
            )}

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
