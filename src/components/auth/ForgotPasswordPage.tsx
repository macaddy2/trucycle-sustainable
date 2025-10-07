import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { forgetPassword as apiForgetPassword } from '@/lib/api'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Please enter your email')
      return
    }
    setIsSubmitting(true)
    try {
      await apiForgetPassword({ email: email.trim().toLowerCase() })
      setSent(true)
      toast.success('Password reset email sent')
    } catch (err: any) {
      console.error('Forgot password failed', err)
      toast.error(err?.message || 'Unable to send reset email')
    } finally {
      setIsSubmitting(false)
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
          <CardTitle>Forgot Password</CardTitle>
          <CardDescription>Enter your email to receive a reset link.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Sending…' : 'Send Reset Link'}
              </Button>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                If an account exists for that email, you will receive a password reset link shortly.
              </p>
              <Button className="w-full" onClick={goHome}>Back to App</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

