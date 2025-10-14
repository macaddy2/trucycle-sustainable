import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ArrowRight, EnvelopeSimple, Lock } from '@phosphor-icons/react'
import { login as apiLogin, type MinimalUser } from '@/lib/api'
import { useKV } from '@/hooks/useKV'
import { toast } from 'sonner'

interface PartnerLoginPageProps {
  onNavigate: (route: string, replace?: boolean) => void
}

export function PartnerLoginPage({ onNavigate }: PartnerLoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [, setPartner] = useKV<MinimalUser | null>('partner-user', null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email || !password) {
      toast.error('Enter your email and password to continue')
      return
    }

    setLoading(true)
    try {
      const response = await apiLogin({ email: email.trim().toLowerCase(), password })
      const user = response?.data?.user
      if (user) {
        setPartner(user)
        toast.success('Welcome back, partner!')
        onNavigate('home', true)
      } else {
        toast.error('Unable to sign in. Please try again.')
      }
    } catch (error: any) {
      console.error('Partner login failed', error)
      toast.error(error?.message || 'Partner login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-16">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-md space-y-4">
          <BadgeHero />
          <h1 className="text-h1 text-foreground">TruCycle Partner Console</h1>
          <p className="text-sm text-muted-foreground">
            Manage shops, scan drop-offs, and keep community donations flowing. Sign in with your partner credentials.
          </p>
        </div>

        <Card className="w-full max-w-md border-border">
          <CardHeader>
            <CardTitle className="text-xl">Partner sign in</CardTitle>
            <CardDescription>Access the partner dashboard using your TruCycle credentials.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="partner-email">Email</Label>
                <div className="relative">
                  <EnvelopeSimple size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="partner-email"
                    type="email"
                    autoComplete="email"
                    placeholder="partner@trucycle.com"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner-password">Password</Label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="partner-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                  Sign in
                </Button>
                <Button variant="link" type="button" className="px-0 text-sm text-primary" onClick={() => onNavigate('register')}>
                  Become a partner <ArrowRight size={16} className="ml-1" />
                </Button>
              </div>
              <Button
                variant="ghost"
                type="button"
                className="w-full justify-start text-sm text-primary"
                onClick={() => (window.location.href = '/auth/forgot-password')}
              >
                Forgot password?
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function BadgeHero() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs uppercase tracking-wide text-primary">
      <span className="font-semibold">Partner portal</span>
      <span className="text-muted-foreground">Drop-off ready</span>
    </div>
  )
}
