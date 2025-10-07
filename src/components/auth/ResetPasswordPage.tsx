import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { resetPassword as apiResetPassword } from '@/lib/api'

export function ResetPasswordPage() {
  const token = useMemo(() => new URLSearchParams(window.location.search).get('token') || '', [])
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      toast.error('Missing token')
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    setIsSubmitting(true)
    try {
      await apiResetPassword({ token, new_password: password })
      setDone(true)
      toast.success('Password has been reset')
    } catch (err: any) {
      console.error('Reset password failed', err)
      toast.error(err?.message || 'Unable to reset password')
    } finally {
      setIsSubmitting(false)
    }
  }

  const goToSignIn = () => {
    // Hint the app to open the auth dialog in signin mode
    const ev = new CustomEvent('open-auth-dialog', { detail: { mode: 'signin' as const } })
    window.dispatchEvent(ev)
    const base = (import.meta as any).env?.BASE_URL || '/'
    const target = String(base || '/').replace(/\/$/, '') + '/home'
    window.location.replace(target)
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>
            {token ? 'Choose a new password for your account.' : 'Invalid password reset link. Please request a new one.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {token && !done && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Resetting…' : 'Reset Password'}
              </Button>
            </form>
          )}

          {done && (
            <div className="space-y-3">
              <p className="text-sm">Your password has been updated. You can now sign in.</p>
              <Button className="w-full" onClick={goToSignIn}>Go to Sign In</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

