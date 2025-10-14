import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { verify as apiVerify, resendVerification as apiResendVerification } from '@/lib/api'
import { useKV } from '@/hooks/useKV'

type UserProfile = {
  id: string
  email: string
  name: string
  userType: 'donor' | 'collector'
  createdAt: string
  verified?: boolean
  partnerAccess?: boolean
}

export function VerifyEmailPage() {
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [emailForResend, setEmailForResend] = useState('')
  const [, setUser] = useKV<UserProfile | null>('current-user', null)

  const token = useMemo(() => new URLSearchParams(window.location.search).get('token') || '', [])

  useEffect(() => {
    async function run() {
      if (!token) return
      try {
        setStatus('verifying')
        const res = await apiVerify({ token })
        const user = res?.data?.user as { id: string; email: string; firstName?: string; lastName?: string; status?: string; roles?: string[] } | undefined
        if (user) {
          const profile: UserProfile = {
            id: user.id,
            email: user.email,
            name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
            userType: 'donor',
            createdAt: new Date().toISOString(),
            verified: user.status === 'active',
            // Derive partner access from roles after verification
            // If roles are missing, default to false
            // (user can later upgrade via Partner portal)
            partnerAccess: Array.isArray(user.roles) ? user.roles.includes('partner') : false,
          }
          setUser(profile)
        }
        setStatus('success')
        toast.success('Email verified successfully')
      } catch (err: any) {
        console.error('Verification failed', err)
        setErrorMessage(err?.message || 'Verification failed. Token may be invalid or expired.')
        setStatus('error')
      }
    }
    run()
  }, [setUser, token])

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailForResend.trim()) {
      toast.error('Please enter your email')
      return
    }
    try {
      await apiResendVerification({ email: emailForResend.trim().toLowerCase() })
      toast.success('Verification email sent. Please check your inbox.')
    } catch (err: any) {
      console.error('Resend verification failed', err)
      toast.error(err?.message || 'Unable to resend verification email')
    }
  }

  const goHome = () => {
    const base = (import.meta as any).env?.BASE_URL || '/'
    const target = String(base || '/').replace(/\/$/, '') + '/home'
    window.location.replace(target)
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>
            {token ? 'Completing your sign up by verifying your email.' : 'Provide your email to receive a new verification link.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {token && status === 'verifying' && (
            <p className="text-sm text-muted-foreground">Verifying your email, please wait…</p>
          )}

          {token && status === 'success' && (
            <div className="space-y-3">
              <p className="text-sm">Your email has been verified and you are now signed in.</p>
              <Button className="w-full" onClick={goHome}>Go to App</Button>
            </div>
          )}

          {(!token || status === 'error') && (
            <div className="space-y-4">
              {status === 'error' && (
                <p className="text-sm text-destructive">{errorMessage}</p>
              )}
              <form onSubmit={handleResend} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={emailForResend}
                    onChange={(e) => setEmailForResend(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full">Resend Verification Email</Button>
              </form>
              <Button variant="outline" className="w-full" onClick={goHome}>Back to App</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
